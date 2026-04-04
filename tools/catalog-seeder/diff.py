"""
diff.py — Step 3 of the catalog seeder pipeline.

Deduplicates normalized products against:
  1. Existing PRODUCT_LIST collection in MongoDB
  2. output/pending-review.json from a previous run (prevents double-queueing)

Returns only genuinely new products.
"""

import json
import logging
from pathlib import Path
from typing import Any

import pymongo

from config import COLLECTION, MONGO_URI, PENDING_REVIEW_FILE

logger = logging.getLogger(__name__)


def diff_against_db(
    normalized: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Return only products that don't already exist in PRODUCT_LIST or pending-review.json.

    Dedup key:
      - barcode (primary): if barcode matches any existing product, skip.
      - name_hebrew (fallback): only when barcode is absent — if Hebrew name matches, skip.
    """
    existing_barcodes, existing_names = _load_existing_from_db()
    queued_barcodes, queued_names = _load_pending_queue()

    known_barcodes = existing_barcodes | queued_barcodes
    known_names = existing_names | queued_names

    new_products: list[dict[str, Any]] = []
    skipped = 0

    for product in normalized:
        barcode = product.get("barcode", "").strip()
        name = product.get("name_hebrew", "").strip()

        if barcode and barcode in known_barcodes:
            skipped += 1
            continue
        if not barcode and name and name in known_names:
            skipped += 1
            continue

        new_products.append(product)

    logger.info(
        f"[diff] {len(normalized)} normalized → {len(new_products)} new, {skipped} skipped"
    )
    return new_products


def _load_existing_from_db() -> tuple[set[str], set[str]]:
    """Fetch all barcodes and Hebrew names from the live PRODUCT_LIST collection."""
    barcodes: set[str] = set()
    names: set[str] = set()

    try:
        client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.get_default_database()
        col = db[COLLECTION]
        for doc in col.find({}, {"barcode": 1, "name_hebrew": 1, "_id": 0}):
            if doc.get("barcode"):
                barcodes.add(str(doc["barcode"]).strip())
            if doc.get("name_hebrew"):
                names.add(str(doc["name_hebrew"]).strip())
        client.close()
        logger.info(f"[diff] DB: {len(barcodes)} barcodes, {len(names)} names loaded")
    except Exception as exc:
        logger.warning(f"[diff] Could not reach MongoDB: {exc} — diff will only check pending queue")

    return barcodes, names


def _load_pending_queue() -> tuple[set[str], set[str]]:
    """Load barcodes and names from a previous pending-review.json run."""
    barcodes: set[str] = set()
    names: set[str] = set()

    if not Path(PENDING_REVIEW_FILE).exists():
        return barcodes, names

    try:
        with open(PENDING_REVIEW_FILE, "r", encoding="utf-8") as f:
            pending: list[dict[str, Any]] = json.load(f)
        for item in pending:
            if item.get("barcode"):
                barcodes.add(str(item["barcode"]).strip())
            if item.get("name_hebrew"):
                names.add(str(item["name_hebrew"]).strip())
        logger.info(f"[diff] Pending queue: {len(barcodes)} barcodes, {len(names)} names")
    except Exception as exc:
        logger.warning(f"[diff] Could not read pending-review.json: {exc}")

    return barcodes, names
