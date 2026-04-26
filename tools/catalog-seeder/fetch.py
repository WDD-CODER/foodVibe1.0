"""
fetch.py — Step 1 of the catalog seeder pipeline.

Fetches:
  1. Israeli supermarket product feeds via il-supermarket-scraper
     (downloads XML files to a temp folder, then parses them)
  2. Open Food Facts Israel bulk data (downloaded once, joined locally by barcode)
"""

import csv
import gzip
import io
import logging
import os
import tempfile
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import requests

from config import FOOD_CHAINS, OUTPUT_DIR

logger = logging.getLogger(__name__)

# Open Food Facts global compressed CSV (Israel-specific export no longer available)
_OFF_BULK_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
_OFF_CACHE_TTL_DAYS = 7

# Retry config
_MAX_CHAIN_RETRIES = 3
_RETRY_BACKOFF_S = 5


# ---------------------------------------------------------------------------
# Supermarket feeds
# ---------------------------------------------------------------------------

def fetch_supermarket_products() -> list[dict[str, Any]]:
    """
    Fetch raw product data from Israeli supermarket price-transparency feeds.

    Downloads one PRICE_FULL_FILE per chain to a temp folder, parses the XML,
    and returns a flat list of dicts:
      { barcode, name_hebrew, price, category_raw, chain }

    Raises RuntimeError if zero products are returned across all chains.
    """
    try:
        from il_supermarket_scarper import ScarpingTask, FileTypesFilters  # type: ignore
    except ImportError:
        raise RuntimeError(
            "il-supermarket-scraper is not installed.\n"
            "Run: pip install 'il-supermarket-scraper>=0.6.0'"
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        logger.info("[fetch] Downloading supermarket price files (limit=1 per chain)...")
        task = ScarpingTask(
            files_types=["PRICE_FULL_FILE"],
            dump_folder_name=tmpdir,
            limit=1,
            suppress_exception=True,
            multiprocessing=3,
        )
        task.start()

        all_products: list[dict[str, Any]] = []
        for chain_dir in os.listdir(tmpdir):
            if chain_dir not in FOOD_CHAINS:
                logger.debug(f"[fetch] Skipping non-food chain: {chain_dir}")
                continue
            chain_path = os.path.join(tmpdir, chain_dir)
            if not os.path.isdir(chain_path):
                continue
            for filename in os.listdir(chain_path):
                filepath = os.path.join(chain_path, filename)
                products = _parse_xml_file(filepath, chain_dir)
                if products:
                    all_products.extend(products)
                    logger.info(f"[fetch] {chain_dir}: {len(products)} products from {filename}")

    if len(all_products) < 100:
        raise RuntimeError(
            f"[fetch] Only {len(all_products)} products returned across all chains "
            f"(minimum: 100). Supermarket feeds may have changed format."
        )

    logger.info(f"[fetch] Total raw products fetched: {len(all_products)}")
    return all_products


def _parse_xml_file(filepath: str, chain_name: str) -> list[dict[str, Any]]:
    """Parse one Israeli price XML file and return a list of product dicts."""
    products = []
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()

        # Handle both <Root><Items><Item> and <Prices><Products><Product> structures
        items = root.findall(".//Item") or root.findall(".//Product")
        for item in items:
            barcode = (item.findtext("ItemCode") or item.findtext("Barcode") or "").strip()
            name = (item.findtext("ItemName") or item.findtext("ProductName") or "").strip()
            price_raw = item.findtext("ItemPrice") or item.findtext("Price") or "0"
            unit_qty = (item.findtext("UnitQty") or item.findtext("UnitOfMeasure") or "").strip()

            try:
                price = float(price_raw)
            except (TypeError, ValueError):
                price = 0.0

            if not name:
                continue

            products.append({
                "barcode":      barcode,
                "name_hebrew":  name,
                "price":        price,
                "category_raw": unit_qty,
                "chain":        chain_name,
            })
    except Exception as exc:
        logger.warning(f"[fetch] Failed to parse {filepath}: {exc}")
    return products


# ---------------------------------------------------------------------------
# Open Food Facts Israel — bulk download
# ---------------------------------------------------------------------------

def _safe_float(val: str | None) -> float | None:
    try:
        return float(val) if val else None
    except (TypeError, ValueError):
        return None


_OFF_CACHE_PATH = Path(OUTPUT_DIR) / "off-bulk-cache.csv.gz"


def fetch_off_bulk() -> dict[str, dict[str, Any]]:
    """
    Load Open Food Facts global bulk CSV, cached locally for _OFF_CACHE_TTL_DAYS days.

    Downloads ~1.2 GB on first run; subsequent runs within the TTL read from disk.
    Returns a dict keyed by barcode: { allergens_tags, product_name_en, nutrition_per_100g }

    Non-blocking — returns empty dict on any failure.
    """
    data: dict[str, dict[str, Any]] = {}

    gz_path = _OFF_CACHE_PATH
    gz_path.parent.mkdir(parents=True, exist_ok=True)

    # Use cache if fresh enough
    if gz_path.exists():
        age_days = (time.time() - gz_path.stat().st_mtime) / 86400
        if age_days < _OFF_CACHE_TTL_DAYS:
            logger.info(f"[fetch] OFF cache hit ({age_days:.1f}d old) — loading from {gz_path}")
        else:
            logger.info(f"[fetch] OFF cache stale ({age_days:.1f}d old) — re-downloading...")
            gz_path.unlink()

    if not gz_path.exists():
        logger.info(f"[fetch] Downloading OFF global bulk CSV (~1.2 GB) → {gz_path} ...")
        response = _get_with_backoff(_OFF_BULK_URL)
        if response is None:
            logger.warning("[fetch] OFF bulk download failed — allergen/nutrition data will be LLM-only")
            return data
        with open(gz_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
        logger.info(f"[fetch] OFF bulk saved to cache ({gz_path.stat().st_size / 1e6:.0f} MB)")

    try:
        csv.field_size_limit(10 * 1024 * 1024)  # OFF has rows with fields > default 131 KB limit
        with gzip.open(gz_path, "rt", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                barcode = (row.get("code") or "").strip()
                if not barcode:
                    continue

                allergens_raw = row.get("allergens_tags") or ""
                allergens = [
                    a.replace("en:", "").replace("-", "_")
                    for a in allergens_raw.split(",")
                    if a.strip()
                ]

                nutrition = {
                    "energy_kcal": _safe_float(row.get("energy_100g")),
                    "protein_g":   _safe_float(row.get("proteins_100g")),
                    "carbs_g":     _safe_float(row.get("carbohydrates_100g")),
                    "sugars_g":    _safe_float(row.get("sugars_100g")),
                    "fat_g":       _safe_float(row.get("fat_100g")),
                    "fiber_g":     _safe_float(row.get("fiber_100g")),
                    "sodium_g":    _safe_float(row.get("sodium_100g")),
                }

                data[barcode] = {
                    "allergens_tags":  allergens,
                    "product_name_en": (row.get("product_name_en") or row.get("product_name") or "").strip(),
                    "categories_tags": [
                        c.strip()
                        for c in (row.get("categories_tags") or "").split(",")
                        if c.strip()
                    ],
                    "nutrition_per_100g": (
                        nutrition if any(v is not None for v in nutrition.values()) else None
                    ),
                }

        logger.info(f"[fetch] OFF bulk loaded: {len(data)} barcodes")
    except Exception as exc:
        logger.warning(f"[fetch] OFF bulk parse error: {exc} — continuing without OFF data")

    return data


_HEADERS = {
    "User-Agent": "foodVibe-catalog-seeder/1.0 (https://github.com/WDD-CODER/foodVibe1.0; contact via GitHub)"
}


def _get_with_backoff(url: str, max_attempts: int = 4) -> requests.Response | None:
    """GET with exponential backoff on 429 / transient errors."""
    delay = 2.0
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.get(url, timeout=120, stream=True, headers=_HEADERS)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429:
                logger.warning(f"[fetch] 429 on attempt {attempt}, waiting {delay:.0f}s...")
                time.sleep(delay)
                delay *= 2
            else:
                logger.warning(f"[fetch] HTTP {resp.status_code} from {url}")
                return None
        except requests.RequestException as exc:
            logger.warning(f"[fetch] Request error attempt {attempt}: {exc}")
            time.sleep(delay)
            delay *= 2
    return None
