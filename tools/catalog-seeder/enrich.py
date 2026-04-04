"""
enrich.py — Step 4 of the catalog seeder pipeline.

Uses the same Gemini API as the Node.js backend.
Increments the shared MongoDB GEMINI_USAGE counter so the Python seeder
and all app users share the same 1,000 calls/day limit.
"""

import json
import logging
import time
from typing import Any

import google.generativeai as genai
import pymongo

from config import (
    ALLOWED_ALLERGENS,
    BATCH_SIZE,
    CATEGORY_GROUPS,
    COLLECTION,
    DAILY_LIMIT,
    GEMINI_API_KEY,
    LLM_MODEL,
    MONGO_URI,
    PENDING_MANUAL_FILE,
    USAGE_COLLECTION,
)

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)

_PROMPT_TEMPLATE = """\
You are a professional chef and food scientist with deep knowledge of Israeli cuisine.

For each product below, return exactly these fields:
- name_clean: Hebrew ingredient name ONLY — strip brand, producer, and any quantity/weight text.
  Examples: "תירס מתוק יכין 550 ג" → "תירס מתוק" | "שמן זית יד מרדכי 750 מ\"ל" → "שמן זית"
- brand: producer/manufacturer name in Hebrew exactly as written in the original name, or null if unknown/generic.
  Examples: "יכין", "תנובה", "אסם"
- pack_size: numeric quantity of the pack (e.g. 550 for 550g, 750 for 750ml, 1 for 1kg), or null if unclear.
- pack_unit: one of "g" | "ml" | "kg" | "l" | "unit" — unit of pack_size, or null if unclear.
- yield_factor: float 0.1–1.0 (usable portion after typical prep, e.g. raw chicken breast after trimming ≈ 0.92, whole chicken after butchering ≈ 0.67)
- expiry_days_default: non-negative integer — refrigerated shelf life in days. Use 0 for frozen or dry-pantry products (e.g. frozen fish → 0, olive oil → 0).
- allergens: array using ONLY these values: ["gluten","dairy","eggs","fish","shellfish","tree_nuts","peanuts","soy","sesame"]. Empty array if none.
- name_english: English translation of name_clean (not the full raw name).

Respond ONLY with a JSON array in the SAME ORDER as input. No prose, no markdown.

Products:
{products_json}
"""

_MAX_BATCH_FAILURES = 2


def _safe_float(v: object) -> float | None:
    """Return float(v) or None if v is not a valid number."""
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# MongoDB usage counter (shared with Node.js backend)
# ---------------------------------------------------------------------------

def _today_key() -> str:
    from datetime import date
    return date.today().isoformat()


def _get_mongo_col():
    client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()
    return client, db[USAGE_COLLECTION]


def check_daily_limit() -> tuple[int, bool]:
    """Returns (current_count, limit_exceeded)."""
    try:
        client, col = _get_mongo_col()
        doc = col.find_one({"_id": _today_key()})
        client.close()
        count = doc["count"] if doc else 0
        return count, count >= DAILY_LIMIT
    except Exception as exc:
        logger.warning(f"[enrich] Could not check daily limit: {exc} — proceeding anyway")
        return 0, False


def _increment_usage() -> int:
    """Atomically increment today's counter. Returns new count."""
    try:
        client, col = _get_mongo_col()
        result = col.find_one_and_update(
            {"_id": _today_key()},
            {"$inc": {"count": 1}},
            upsert=True,
            return_document=pymongo.ReturnDocument.AFTER,
        )
        client.close()
        return result["count"] if result else 1
    except Exception as exc:
        logger.warning(f"[enrich] Could not increment usage counter: {exc}")
        return 0


# ---------------------------------------------------------------------------
# Main enrichment
# ---------------------------------------------------------------------------

def enrich_all(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Enrich all pending products via batched Gemini calls grouped by category.
    Checks the shared daily limit before each call.
    """
    current_count, exceeded = check_daily_limit()
    if exceeded:
        logger.error(
            f"[enrich] Daily Gemini limit reached ({current_count}/{DAILY_LIMIT}). "
            "Cannot enrich products today. Try again tomorrow."
        )
        for p in products:
            p["_enrichment_failed"] = True
        _write_pending_manual(products)
        return products

    logger.info(f"[enrich] Daily usage before run: {current_count}/{DAILY_LIMIT}")

    model = genai.GenerativeModel(LLM_MODEL)
    groups = _group_by_category(products)

    enriched: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []

    for group_name, group_products in groups.items():
        logger.info(f"[enrich] Group '{group_name}': {len(group_products)} products")
        batches = _chunk(group_products, BATCH_SIZE)

        for batch in batches:
            # Re-check limit before each batch call
            current, exceeded = check_daily_limit()
            if exceeded:
                logger.warning(
                    f"[enrich] Daily limit reached mid-run ({current}/{DAILY_LIMIT}). "
                    "Remaining products marked as failed."
                )
                for p in batch:
                    p["_enrichment_failed"] = True
                failed.extend(batch)
                continue

            result = _enrich_batch_with_retry(batch, model)
            for product in result:
                if product.get("_enrichment_failed"):
                    failed.append(product)
                else:
                    enriched.append(product)

    if failed:
        _write_pending_manual(failed)
        logger.warning(f"[enrich] {len(failed)} products written to pending-manual.json")

    logger.info(f"[enrich] Enriched: {len(enriched)}, failed: {len(failed)}")
    return enriched + failed


# ---------------------------------------------------------------------------
# Grouping
# ---------------------------------------------------------------------------

def _group_by_category(products: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {g: [] for g in CATEGORY_GROUPS}
    groups["other"] = []
    for product in products:
        group = product.get("_category_group", "")
        if group in groups:
            groups[group].append(product)
        else:
            groups["other"].append(product)
    return {k: v for k, v in groups.items() if v}


def _chunk(lst: list, size: int) -> list[list]:
    return [lst[i: i + size] for i in range(0, len(lst), size)]


# ---------------------------------------------------------------------------
# LLM call + validation
# ---------------------------------------------------------------------------

def _enrich_batch_with_retry(
    batch: list[dict[str, Any]],
    model: genai.GenerativeModel,
) -> list[dict[str, Any]]:
    for attempt in range(1, _MAX_BATCH_FAILURES + 1):
        try:
            response_items = _call_gemini(batch, model)
            validated = _validate_response(batch, response_items)
            if validated is not None:
                _increment_usage()
                return _attach_enrichment(batch, validated)
            logger.warning(f"[enrich] Validation failed (attempt {attempt}/{_MAX_BATCH_FAILURES})")
        except Exception as exc:
            logger.warning(f"[enrich] Gemini call failed attempt {attempt}: {exc}")
        if attempt < _MAX_BATCH_FAILURES:
            time.sleep(3)

    for product in batch:
        product["_enrichment_failed"] = True
    return batch


def _call_gemini(
    batch: list[dict[str, Any]],
    model: genai.GenerativeModel,
) -> list[dict[str, Any]]:
    products_for_prompt = [
        {
            "id": p["_id"],
            "name_hebrew": p["name_hebrew"],
            "category": p.get("_category_group", ""),
        }
        for p in batch
    ]
    prompt = _PROMPT_TEMPLATE.format(
        products_json=json.dumps(products_for_prompt, ensure_ascii=False, indent=2)
    )
    response = model.generate_content(prompt)
    raw_text = response.text.strip()
    # Strip markdown code fences if Gemini wraps the JSON
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    return json.loads(raw_text.strip())


def _validate_response(
    batch: list[dict[str, Any]],
    response_items: list[dict[str, Any]],
) -> list[dict[str, Any]] | None:
    if not isinstance(response_items, list):
        return None
    if len(response_items) != len(batch):
        logger.warning(
            f"[enrich] Length mismatch: expected {len(batch)}, got {len(response_items)}"
        )
        return None
    validated = []
    for i, item in enumerate(response_items):
        if not isinstance(item, dict):
            return None
        yf = item.get("yield_factor")
        try:
            yf = float(yf)
            if not (0.1 <= yf <= 1.0):
                logger.warning(f"[enrich] yield_factor={yf} out of range")
                return None
        except (TypeError, ValueError):
            return None
        ed = item.get("expiry_days_default")
        try:
            ed = int(ed)
            if ed < 0:
                return None
        except (TypeError, ValueError):
            return None
        allergens = [a for a in (item.get("allergens") or []) if isinstance(a, str) and a in ALLOWED_ALLERGENS]
        pack_unit_raw = item.get("pack_unit")
        validated.append({
            "yield_factor":        yf,
            "expiry_days_default": ed,
            "allergens":           allergens,
            "name_english":        str(item.get("name_english") or "").strip() or None,
            "name_clean":          str(item.get("name_clean") or "").strip() or None,
            "brand":               str(item.get("brand") or "").strip() or None,
            "pack_size":           _safe_float(item.get("pack_size")),
            "pack_unit":           pack_unit_raw if pack_unit_raw in ("g", "ml", "kg", "l", "unit") else None,
        })
    return validated


def _attach_enrichment(
    batch: list[dict[str, Any]],
    validated: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    for product, enrichment in zip(batch, validated):
        product["yield_factor_"] = enrichment["yield_factor"]
        product["expiry_days_default_"] = enrichment["expiry_days_default"]
        if product.get("allergen_source_") == "llm":
            product["allergens_"] = enrichment["allergens"]
        if enrichment.get("name_clean"):
            product["name_hebrew"] = enrichment["name_clean"]
        if not product.get("name_english") and enrichment.get("name_english"):
            product["name_english"] = enrichment["name_english"]
        product["_brand"] = enrichment.get("brand")
        product["_pack_size"] = enrichment.get("pack_size")
        product["_pack_unit"] = enrichment.get("pack_unit")
        _recalc_pricing(product)
    return batch


def _recalc_pricing(product: dict[str, Any]) -> None:
    """
    Recalculate buy_price_global_ (price per base unit) and purchase_options_
    using the pack size extracted from the name.

    base_unit=kg, pack=550g  → conversion=0.55, buy_price = price/0.55
    base_unit=liter, pack=750ml → conversion=0.75, buy_price = price/0.75
    base_unit=unit → leave unchanged (no meaningful per-unit conversion)
    """
    base = product.get("base_unit_", "unit")
    market_price = product.get("buy_price_global_", 0)
    pack_size = product.get("_pack_size")
    pack_unit = product.get("_pack_unit")

    if not pack_size or base == "unit":
        return

    conversion = _pack_to_base_conversion(pack_size, pack_unit, base)
    if conversion is None or conversion <= 0:
        return

    product["buy_price_global_"] = round(market_price / conversion, 4)
    product["purchase_options_"] = [{
        "unit_symbol_":     "unit",
        "conversion_rate_": conversion,
        "price_override_":  market_price,
    }]


def _pack_to_base_conversion(pack_size: float, pack_unit: str | None, base_unit: str) -> float | None:
    """Convert pack quantity to base unit quantity. Returns None if combination is unknown."""
    if pack_unit is None:
        return None
    table: dict[tuple[str, str], float] = {
        ("g",  "kg"):    pack_size / 1000,
        ("kg", "kg"):    pack_size,
        ("ml", "liter"): pack_size / 1000,
        ("l",  "liter"): pack_size,
        ("g",  "gram"):  pack_size,
        ("kg", "gram"):  pack_size * 1000,
        ("ml", "ml"):    pack_size,
        ("l",  "ml"):    pack_size * 1000,
    }
    return table.get((pack_unit, base_unit))


def _write_pending_manual(failed: list[dict[str, Any]]) -> None:
    from pathlib import Path
    Path(PENDING_MANUAL_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(PENDING_MANUAL_FILE, "w", encoding="utf-8") as f:
        json.dump(failed, f, ensure_ascii=False, indent=2)
