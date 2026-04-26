"""
patch_nutrition.py — One-off backfill script.

Finds all __master__ products in PRODUCT_LIST that have a barcode but no
nutrition_per_100g, looks them up in the OFF bulk cache, and $set-updates
the nutrition field in both Atlas and Local MongoDB.

Usage:
  python patch_nutrition.py           # dry run (logs what would change)
  python patch_nutrition.py --write   # actually updates the DB
"""

import argparse
import csv
import gzip
import json
import logging
import sys
import io
from pathlib import Path

import pymongo

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def _safe_float(val: str | None) -> float | None:
    try:
        return float(val) if val else None
    except (TypeError, ValueError):
        return None


def load_off_lookup(gz_path: str, target_barcodes: set[str]) -> dict[str, dict]:
    """
    Stream the OFF bulk CSV and return nutrition for barcodes we care about.
    Only loads rows whose barcode is in target_barcodes — memory efficient.
    """
    csv.field_size_limit(10 * 1024 * 1024)
    data: dict[str, dict] = {}
    total = 0

    logger.info(f"[off] Reading OFF bulk cache — targeting {len(target_barcodes)} barcodes...")

    with gzip.open(gz_path, "rt", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            total += 1
            if total % 1_000_000 == 0:
                logger.info(f"[off] {total // 1_000}K rows scanned, {len(data)} hits so far...")

            code = (row.get("code") or "").strip()
            if code not in target_barcodes:
                continue

            nutrition = {
                "energy_kcal": _safe_float(row.get("energy_100g")),
                "protein_g":   _safe_float(row.get("proteins_100g")),
                "carbs_g":     _safe_float(row.get("carbohydrates_100g")),
                "sugars_g":    _safe_float(row.get("sugars_100g")),
                "fat_g":       _safe_float(row.get("fat_100g")),
                "fiber_g":     _safe_float(row.get("fiber_100g")),
                "sodium_g":    _safe_float(row.get("sodium_100g")),
            }

            if any(v is not None for v in nutrition.values()):
                data[code] = nutrition

    logger.info(f"[off] Done. {total} rows scanned, {len(data)} barcodes with nutrition found.")
    return data


def load_catalog_review_nutrition() -> dict[str, dict]:
    """
    Build a name_hebrew → nutrition_per_100g map from catalog-review.json.
    Barcodes are stripped from DB docs, so we match by name instead.
    """
    review_path = Path(__file__).parent / "output" / "catalog-review.json"
    if not review_path.exists():
        return {}
    with open(review_path, encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("items", data) if isinstance(data, dict) else data
    result = {}
    for p in items:
        name = (p.get("name_hebrew") or "").strip()
        nutr = p.get("nutrition_per_100g")
        if name and nutr and any(v is not None for v in nutr.values()):
            result[name] = nutr
    logger.info(f"[review] {len(result)} products with nutrition in catalog-review.json")
    return result


def patch(write: bool) -> None:
    from config import COLLECTION, MONGO_ATLAS_URI, MONGO_LOCAL_URI

    targets = []
    if MONGO_ATLAS_URI:
        targets.append(("Atlas", MONGO_ATLAS_URI))
    if MONGO_LOCAL_URI:
        targets.append(("Local", MONGO_LOCAL_URI))

    if not targets:
        logger.error("No MongoDB URIs configured.")
        sys.exit(1)

    # Build name → nutrition from catalog-review.json (barcodes stripped from DB)
    name_to_nutrition = load_catalog_review_nutrition()
    if not name_to_nutrition:
        logger.warning("[patch] catalog-review.json has no nutrition data. Run main.py first.")
        return

    for label, uri in targets:
        updated = 0
        skipped = 0
        not_found = 0
        try:
            client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client.get_default_database()
            col = db[COLLECTION]

            # Find all __master__ products missing nutrition
            candidates = list(col.find(
                {
                    "userId": "__master__",
                    "$or": [
                        {"nutrition_per_100g": None},
                        {"nutrition_per_100g": {"$exists": False}},
                    ],
                },
                {"_id": 1, "name_hebrew": 1},
            ))

            logger.info(f"[db] [{label}] {len(candidates)} products missing nutrition")

            for p in candidates:
                name = (p.get("name_hebrew") or "").strip()
                nutr = name_to_nutrition.get(name)
                if not nutr:
                    skipped += 1
                    continue
                if write:
                    col.update_one({"_id": p["_id"]}, {"$set": {"nutrition_per_100g": nutr}})
                    updated += 1
                else:
                    updated += 1  # count as would-update in dry run

            client.close()
            action = "Updated" if write else "Would update"
            logger.info(f"[db] [{label}] {action}: {updated}, no match in catalog: {skipped}")
        except Exception as exc:
            logger.error(f"[db] [{label}] Connection failed: {exc}")

    if not write:
        logger.info("[patch] DRY RUN — pass --write to apply.")
    else:
        logger.info("[patch] Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill nutrition_per_100g from OFF bulk cache")
    parser.add_argument("--write", action="store_true", help="Apply updates (default is dry run)")
    args = parser.parse_args()
    patch(write=args.write)
