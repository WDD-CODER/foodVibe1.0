"""
db_write.py — Step 6 of the catalog seeder pipeline.

Writes approved products directly to the PRODUCT_LIST MongoDB collection.
Uses pymongo with the same MONGO_URI as the Node.js backend.
"""

import logging
import random
import re
import string
import time
from typing import Any

import pymongo

from config import COLLECTION, MONGO_ATLAS_URI, MONGO_LOCAL_URI, SUPPLIERS_COLLECTION

logger = logging.getLogger(__name__)

# Internal keys used during the pipeline — stripped before writing to DB
_INTERNAL_KEYS = {
    "barcode", "_category_group", "_enrichment_failed",
    "_chain_count", "_brand", "_pack_size", "_pack_unit",
}


def _normalize_name(name: str) -> str:
    return re.sub(r'\s+', ' ', name.strip()).lower()


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

    total_inserted = 0

    targets = []
    if MONGO_ATLAS_URI:
        targets.append(("Atlas", MONGO_ATLAS_URI))
    if MONGO_LOCAL_URI:
        targets.append(("Local", MONGO_LOCAL_URI))

    for label, uri in targets:
        inserted = 0
        skipped = 0
        try:
            client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client.get_default_database()

            brand_names = list({p.get("_brand") for p in approved if p.get("_brand")})
            supplier_map = _upsert_suppliers(brand_names, db)

            col = db[COLLECTION]
            for product in approved:
                doc = _prepare_doc(product, now_ms, supplier_map)
                try:
                    col.insert_one(doc)
                    inserted += 1
                except pymongo.errors.DuplicateKeyError:
                    logger.debug(f"[db_write] [{label}] Skipped duplicate _id: {doc['_id']}")
                    skipped += 1
                except Exception as exc:
                    logger.error(f"[db_write] [{label}] Failed to insert {doc.get('_id')}: {exc}")

            client.close()
            logger.info(f"[db_write] [{label}] Inserted: {inserted}, skipped (duplicate): {skipped}")
            total_inserted = max(total_inserted, inserted)
        except Exception as exc:
            logger.error(f"[db_write] [{label}] MongoDB connection failed: {exc}")

    return total_inserted


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
                "userId":          "__master__",
                "_masterId":       None,
                "_userModified":   False,
            })
            result[brand] = supplier_id
            logger.info(f"[db_write] Created supplier: {brand} ({supplier_id})")
    return result


def _prepare_doc(product: dict[str, Any], now_ms: int, supplier_map: dict[str, str]) -> dict[str, Any]:
    """Strip internal keys, set timestamps, and link supplier before DB insert."""
    doc = {k: v for k, v in product.items() if k not in _INTERNAL_KEYS}
    doc["addedAt_"] = now_ms
    doc["seeded_"] = True
    # Ownership — master/user clone architecture
    doc["userId"] = "__master__"
    doc["_masterId"] = None
    doc["_userModified"] = False
    # Normalized Hebrew name for dedup / search
    doc["name_hebrew_normalized"] = _normalize_name(doc.get("name_hebrew", ""))
    # Ensure null-enriched fields get safe defaults if admin skipped them
    if doc.get("yield_factor_") is None:
        doc["yield_factor_"] = 1.0
    if doc.get("expiry_days_default_") is None:
        doc["expiry_days_default_"] = 0
    # Link brand supplier
    brand = product.get("_brand")
    supplier_id = supplier_map.get(brand) if brand else None
    if supplier_id:
        doc["supplierIds_"] = [supplier_id]  # backward compat
        doc["sources_"] = [
            {
                "supplierId": supplier_id,
                "price":      doc.get("buy_price_global_"),
                "addedAt":    now_ms,
            }
        ]
    else:
        doc["sources_"] = []
    return doc
