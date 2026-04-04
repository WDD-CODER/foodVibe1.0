"""
db_write.py — Step 6 of the catalog seeder pipeline.

Writes approved products directly to the PRODUCT_LIST MongoDB collection.
Uses pymongo with the same MONGO_URI as the Node.js backend.
"""

import logging
import random
import string
import time
from typing import Any

import pymongo

from config import COLLECTION, MONGO_URI, SUPPLIERS_COLLECTION

logger = logging.getLogger(__name__)

# Internal keys used during the pipeline — stripped before writing to DB
_INTERNAL_KEYS = {
    "barcode", "_category_group", "_enrichment_failed",
    "_chain_count", "_brand", "_pack_size", "_pack_unit",
}


def _make_id(length: int = 5) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


def write_approved(approved: list[dict[str, Any]], dry_run: bool = False) -> int:
    """
    Insert approved products into PRODUCT_LIST collection.

    - Upserts brand suppliers into KITCHEN_SUPPLIERS before inserting products.
    - Strips internal pipeline keys before writing.
    - Sets addedAt_ to epoch ms now.
    - Skips products that already exist (duplicate _id — soft conflict, not a crash).

    Returns the number of products successfully inserted.
    """
    if not approved:
        logger.info("[db_write] No products to write.")
        return 0

    now_ms = int(time.time() * 1000)

    if dry_run:
        docs = [_prepare_doc(p, now_ms, {}) for p in approved]
        logger.info(f"[db_write] DRY RUN — would insert {len(docs)} products into {COLLECTION}")
        for doc in docs[:5]:
            logger.info(f"  Sample: {doc.get('name_hebrew')} ({doc.get('_id')})")
        if len(docs) > 5:
            logger.info(f"  ... and {len(docs) - 5} more")
        return len(docs)

    inserted = 0
    skipped = 0

    try:
        client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.get_default_database()

        # Upsert suppliers first so we have IDs to link
        brand_names = list({p.get("_brand") for p in approved if p.get("_brand")})
        supplier_map = _upsert_suppliers(brand_names, db)

        col = db[COLLECTION]
        for product in approved:
            doc = _prepare_doc(product, now_ms, supplier_map)
            try:
                col.insert_one(doc)
                inserted += 1
            except pymongo.errors.DuplicateKeyError:
                logger.debug(f"[db_write] Skipped duplicate _id: {doc['_id']}")
                skipped += 1
            except Exception as exc:
                logger.error(f"[db_write] Failed to insert {doc.get('_id')}: {exc}")

        client.close()
        logger.info(
            f"[db_write] Inserted: {inserted}, skipped (duplicate): {skipped}"
        )
    except Exception as exc:
        logger.error(f"[db_write] MongoDB connection failed: {exc}")
        raise

    return inserted


def _upsert_suppliers(brand_names: list[str], db: Any) -> dict[str, str]:
    """
    For each brand name, find or create a Supplier in KITCHEN_SUPPLIERS.
    Returns a dict: { brand_name → supplier_id }
    """
    col = db[SUPPLIERS_COLLECTION]
    result: dict[str, str] = {}
    for brand in brand_names:
        if not brand:
            continue
        existing = col.find_one({"name_hebrew": brand})
        if existing:
            result[brand] = str(existing["_id"])
        else:
            supplier_id = _make_id()
            col.insert_one({
                "_id":             supplier_id,
                "name_hebrew":     brand,
                "delivery_days_":  [],
                "min_order_mov_":  0,
                "lead_time_days_": 1,
                "seeded_":         True,
            })
            result[brand] = supplier_id
            logger.info(f"[db_write] Created supplier: {brand} ({supplier_id})")
    return result


def _prepare_doc(product: dict[str, Any], now_ms: int, supplier_map: dict[str, str]) -> dict[str, Any]:
    """Strip internal keys, set timestamps, and link supplier before DB insert."""
    doc = {k: v for k, v in product.items() if k not in _INTERNAL_KEYS}
    doc["addedAt_"] = now_ms
    doc["seeded_"] = True
    # Ensure null-enriched fields get safe defaults if admin skipped them
    if doc.get("yield_factor_") is None:
        doc["yield_factor_"] = 1.0
    if doc.get("expiry_days_default_") is None:
        doc["expiry_days_default_"] = 0
    # Link brand supplier
    brand = product.get("_brand")
    if brand and brand in supplier_map:
        doc["supplierIds_"] = [supplier_map[brand]]
    return doc
