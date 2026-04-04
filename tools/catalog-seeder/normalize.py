"""
normalize.py — Step 2 of the catalog seeder pipeline.

Maps raw supermarket + OFF data into the Product model skeleton.
"""

import logging
import random
import string
from collections import defaultdict
from typing import Any

from config import ALLOWED_ALLERGENS, CATEGORY_GROUPS, CATEGORY_UNIT_MAP, MAX_PRODUCTS, NON_FOOD_KEYWORDS

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ID generation — matches server/routes/generic.js makeId(5)
# ---------------------------------------------------------------------------

def _make_id(length: int = 5) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=length))


# ---------------------------------------------------------------------------
# Category normalizer
# ---------------------------------------------------------------------------

_HEBREW_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "proteins": (
        "עוף", "בשר", "דג", "סלמון", "טונה", "פורל", "מוסר", "בורי", "קרפיון",
        "נקניק", "שניצל", "קציצ", "המבורגר", "כבד", "פרגית", "ירך", "חזה עוף",
        "כנפיים", "שוק", "אנטריקוט", "פילה", "קבב", "מרינד", "חזיר",
        "בקר", "כבש", "אוזן", "לשון", "טחון",
    ),
    "dairy": (
        "חלב", "גבינ", "יוגורט", "לבן", "קוטג'", "חמאה", "שמנת", "קפיר",
        "ריקוטה", "פרמזן", "מוצרלה", "בולגרית", "עמק", "מעדן", "פרה",
        "ממרח גבינ", "גבינה צהובה", "גבינה מלוחה", "גבינה לבנה",
        "אשל", "שוקו", "קפה חלב", "דנונה", "דניה",
    ),
    "produce": (
        "עגבנ", "מלפפ", "בצל", "גזר", "תפוח", "שום", "לימון", "אבוקד",
        "פלפל", "חסה", "רוקט", "תרד", "כרוב", "ברוקול", "כרובית",
        "מנגו", "בננ", "ענב", "תות", "אפרסק", "אגס", "משמש", "שזיף",
        "קישוא", "דלעת", "סלרי", "כרשה", "שמיר", "פטרוזיליה",
        "אפונ", "שעועית ירוקה", "תירס טרי",
    ),
    "grains": (
        "קמח", "לחם", "פסטה", "אורז", "שיבולת שועל",
        "קינואה", "קוסקוס", "עדש", "חומוס", "פול", "סולת",
        "שיפון", "שעורה", "גרנולה", "כוסמין", "דגנ",
        "בורגול", "שקדי מרק", "קרקרים", "מצות",
        "לחמניה", "פיתה", "לאפה", "בגט",
    ),
    "frozen": (
        "קפוא", "מוקפא",
    ),
}


def _resolve_category_group(raw_category: str, name_hebrew: str = "") -> str:
    """
    Map a product to one of the canonical category group slugs.

    Checks the Hebrew product name first (more reliable than the XML UnitQty field),
    then falls back to the raw_category field, then defaults to "pantry".
    """
    name_lower = name_hebrew.lower()

    # Frozen wins over everything else — check it first
    if any(kw in name_lower for kw in _HEBREW_CATEGORY_KEYWORDS["frozen"]):
        return "frozen"

    # Hebrew name keywords for the remaining categories
    for group, keywords in _HEBREW_CATEGORY_KEYWORDS.items():
        if group == "frozen":
            continue  # already handled above
        if any(kw in name_lower for kw in keywords):
            return group

    # Fallback: CATEGORY_GROUPS English keywords from config (catches XML categories like "meat", "dairy")
    raw_lower = raw_category.lower()
    for group, keywords in CATEGORY_GROUPS.items():
        if any(kw in raw_lower for kw in keywords):
            return group

    return "pantry"  # safe default


def _resolve_base_unit(category_group: str, raw_category: str, name_hebrew: str) -> str:
    """Infer base_unit_ from category group and product name hints."""
    lower_name = name_hebrew.lower()
    lower_cat = raw_category.lower()

    # Dairy split
    if category_group == "dairy":
        if any(kw in lower_name or kw in lower_cat for kw in ["חלב", "שמנת", "milk", "cream", "liter"]):
            return CATEGORY_UNIT_MAP["dairy_liquid"]
        return CATEGORY_UNIT_MAP["dairy_solid"]

    # Pantry split
    if category_group == "pantry":
        if any(kw in lower_name or kw in lower_cat for kw in ["שמן", "רוטב", "oil", "sauce", "vinegar"]):
            return CATEGORY_UNIT_MAP["pantry_liquid"]
        return CATEGORY_UNIT_MAP["pantry_solid"]

    # Produce split
    if category_group == "produce":
        if any(kw in lower_name or kw in lower_cat for kw in ["שקית", "bag", "packag"]):
            return CATEGORY_UNIT_MAP["produce_packaged"]
        return CATEGORY_UNIT_MAP["produce_loose"]

    return CATEGORY_UNIT_MAP.get(category_group, "unit")


# ---------------------------------------------------------------------------
# Main normalization
# ---------------------------------------------------------------------------

def normalize_products(
    raw_list: list[dict[str, Any]],
    off_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Normalize raw supermarket products into Product model skeletons.

    - Deduplicates by barcode, averaging price across chains.
    - Attaches allergens from Open Food Facts where barcode matches.
    - Returns list of normalized product dicts ready for the diff step.
    """

    # Group by barcode to average prices
    by_barcode: dict[str, list[dict[str, Any]]] = defaultdict(list)
    no_barcode: list[dict[str, Any]] = []

    for item in raw_list:
        bc = item.get("barcode", "").strip()
        if bc:
            by_barcode[bc].append(item)
        else:
            no_barcode.append(item)

    normalized: list[dict[str, Any]] = []

    # Process barcoded products — track how many chains carry each one
    for barcode, items in by_barcode.items():
        product = _normalize_one(barcode, items, off_lookup)
        product["_chain_count"] = len(set(i["chain"] for i in items))
        normalized.append(product)

    # Process no-barcode products (no cross-chain dedup possible)
    for item in no_barcode:
        product = _normalize_one("", [item], off_lookup)
        product["_chain_count"] = 1
        normalized.append(product)

    # Drop non-food products
    before = len(normalized)
    normalized = [p for p in normalized if not _is_non_food(p["name_hebrew"])]
    logger.info(
        f"[normalize] {len(normalized)} unique products after dedup "
        f"({before - len(normalized)} non-food dropped)"
    )

    # Keep only the most popular products (highest cross-chain count)
    normalized.sort(key=lambda p: p["_chain_count"], reverse=True)
    if len(normalized) > MAX_PRODUCTS:
        logger.info(
            f"[normalize] Capping to top {MAX_PRODUCTS} products by chain popularity "
            f"(min chain count: {normalized[MAX_PRODUCTS - 1]['_chain_count']})"
        )
        normalized = normalized[:MAX_PRODUCTS]

    return normalized


def _is_non_food(name: str) -> bool:
    """Return True if the product name matches any non-food keyword."""
    return any(kw in name for kw in NON_FOOD_KEYWORDS)


def _normalize_one(
    barcode: str,
    items: list[dict[str, Any]],
    off_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Normalize a group of same-barcode items into one Product skeleton."""
    representative = items[0]
    name_hebrew = representative["name_hebrew"]
    raw_category = representative.get("category_raw", "")

    # Average price across chains
    prices = [i["price"] for i in items if i.get("price", 0) > 0]
    avg_price = round(sum(prices) / len(prices), 2) if prices else 0.0

    # Category resolution
    category_group = _resolve_category_group(raw_category, name_hebrew)
    base_unit = _resolve_base_unit(category_group, raw_category, name_hebrew)

    # Open Food Facts enrichment
    off_data = off_lookup.get(barcode, {}) if barcode else {}
    name_english = off_data.get("product_name_en") or None
    raw_allergens = off_data.get("allergens_tags", [])
    allergens = [a for a in raw_allergens if a in ALLOWED_ALLERGENS]
    allergen_source = "off" if allergens else "llm"

    return {
        "_id":                 _make_id(),
        "barcode":             barcode,  # internal use only — not in Product model
        "name_hebrew":         name_hebrew,
        "name_english":        name_english,
        "base_unit_":          base_unit,
        "buy_price_global_":   avg_price,
        "purchase_options_":   [
            {
                "unit_symbol_":    base_unit,
                "conversion_rate_": 1,
                "price_override_": avg_price,
            }
        ],
        "categories_":         [category_group],
        "supplierIds_":        [],
        "yield_factor_":       None,   # filled by enrich step
        "allergens_":          allergens,
        "allergen_source_":    allergen_source,
        "min_stock_level_":    0,
        "expiry_days_default_": None,  # filled by enrich step
        "addedAt_":            None,   # set on DB write
        "seeded_":             True,
        # LLM enrichment fields (populated in enrich.py)
        "_category_group":     category_group,  # internal routing key, stripped before DB write
        "_enrichment_failed":  False,
    }
