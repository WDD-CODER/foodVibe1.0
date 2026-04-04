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
from typing import Any

import requests

from config import FOOD_CHAINS

logger = logging.getLogger(__name__)

# Open Food Facts Israel compressed CSV
_OFF_BULK_URL = "https://il.openfoodfacts.org/data/il.openfoodfacts.org.products.csv.gz"

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

def fetch_off_bulk() -> dict[str, dict[str, Any]]:
    """
    Download the Open Food Facts Israel compressed CSV once.
    Returns a dict keyed by barcode (string):
      {
        "allergens_tags": [...],
        "product_name_en": "...",
        "categories_tags": [...]
      }

    Uses exponential backoff on 429. Skips on persistent failure (non-blocking).
    """
    logger.info("[fetch] Downloading Open Food Facts Israel bulk data...")
    data: dict[str, dict[str, Any]] = {}

    try:
        response = _get_with_backoff(_OFF_BULK_URL)
        if response is None:
            logger.warning("[fetch] OFF bulk download failed — allergen/English name data will be LLM-only")
            return data

        with gzip.open(io.BytesIO(response.content), "rt", encoding="utf-8", errors="replace") as f:
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

                data[barcode] = {
                    "allergens_tags":  allergens,
                    "product_name_en": (row.get("product_name_en") or row.get("product_name") or "").strip(),
                    "categories_tags": [
                        c.strip()
                        for c in (row.get("categories_tags") or "").split(",")
                        if c.strip()
                    ],
                }

        logger.info(f"[fetch] OFF bulk loaded: {len(data)} barcodes")
    except Exception as exc:
        logger.warning(f"[fetch] OFF bulk parse error: {exc} — continuing without OFF data")

    return data


def _get_with_backoff(url: str, max_attempts: int = 4) -> requests.Response | None:
    """GET with exponential backoff on 429 / transient errors."""
    delay = 2.0
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.get(url, timeout=120, stream=True)
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
