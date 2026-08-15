---
name: Seeder Curation Pipeline
overview: Two-layer curation system — food-signal filter (filter.py) + local catalog-review.json for human+AI review with nutrition data from Open Food Facts. Zero DB writes until --from-review.
todos: []
isProject: false
---

# Plan 272 — Seeder Curation Pipeline (Filter + Review JSON + Nutrition)

## Context

The catalog seeder pulls every item from Israeli supermarket price feeds — food and non-food
alike — and currently only blocks non-food via a weak Hebrew keyword list. Everything
unrecognized defaults to "pantry", meaning zipper bags, cling wrap, tobacco, and medicines
land in the product catalog alongside real kitchen ingredients.

This plan builds a two-layer curation system:
- **Layer 1** (`filter.py`): strong food-signal filter drops non-kitchen items before they
  waste Gemini quota or reach MongoDB.
- **Layer 2** (`catalog-review.json`): all filtered products written to a local JSON file
  where the user reviews with Claude Code, assigns correct kitchen categories, and marks
  items `approved: true` before anything is sent for enrichment or DB write.

Nutrition data is extracted "for free" from the Open Food Facts bulk CSV already being
downloaded — just not currently parsed.

## New Pipeline Flow

```
python main.py              → FETCH → FILTER → NORMALIZE → catalog-review.json (STOP)
python main.py --from-review → load catalog-review.json (approved:true only)
                               → ENRICH → DIFF → DB_WRITE
```

Zero MongoDB writes happen until `--from-review` is explicitly passed.

## Critical Files

| File | Change |
|------|--------|
| `tools/catalog-seeder/config.py` | Add CATALOG_REVIEW_FILE, KITCHEN_CATEGORIES, expand NON_FOOD_KEYWORDS |
| `tools/catalog-seeder/fetch.py` | Extend fetch_off_bulk() for 7 nutrition fields |
| `tools/catalog-seeder/normalize.py` | Remove _is_non_food(); add nutrition_per_100g + review fields |
| `tools/catalog-seeder/filter.py` | NEW — apply_food_filter() with category-pass + pantry food-signal |
| `tools/catalog-seeder/main.py` | Restructure flow: add --from-review, write catalog-review.json |

## Atomic Sub-tasks

- [ ] Task 1: `tools/catalog-seeder/config.py` — Add constants and expand blocklist
- [ ] Task 2: `tools/catalog-seeder/fetch.py` — Extract nutrition fields from OFF bulk CSV
- [ ] Task 3: `tools/catalog-seeder/normalize.py` — Remove filter; add nutrition + review fields
- [ ] Task 4: `tools/catalog-seeder/filter.py` (new) — Food-signal filter module
- [ ] Task 5: `tools/catalog-seeder/main.py` — Restructure pipeline flow

---

## Task 1 Detail — `config.py`

Add after `SEED_OUTPUT_FILE`:
```python
CATALOG_REVIEW_FILE = OUTPUT_DIR / "catalog-review.json"
```

Add after `CATEGORY_GROUPS`:
```python
# App's canonical product categories (must match metadata-registry.service.ts DEFAULT_CATEGORIES)
KITCHEN_CATEGORIES: tuple[str, ...] = (
    "vegetables", "dairy", "meat", "dry", "fish", "spices",
)
```

Expand `NON_FOOD_KEYWORDS` tuple with three new groups:
```python
# Household / kitchen supplies (not food ingredients)
"שקיות זיפר", "שקיות ניילון", "ניילון נצמד", "נייר כסף", "נייר אלומיניום",
"נרות", "שקיות אשפה", "כפפות", "קיסמים",
# Tobacco
"סיגריות", "סיגר", "טבק", "נרגילה",
# Medicines / supplements
"ויטמין", "תרופ", "כדורים", "תוסף תזונה", "פרוביוטיקה",
```

---

## Task 2 Detail — `fetch.py`

Add `_safe_float` helper before `fetch_off_bulk()`:
```python
def _safe_float(val: str | None) -> float | None:
    try:
        return float(val) if val else None
    except (TypeError, ValueError):
        return None
```

Inside `fetch_off_bulk()`, after building the existing `data[barcode]` dict, add:
```python
nutrition = {
    "energy_kcal": _safe_float(row.get("energy_100g")),
    "protein_g":   _safe_float(row.get("proteins_100g")),
    "carbs_g":     _safe_float(row.get("carbohydrates_100g")),
    "sugars_g":    _safe_float(row.get("sugars_100g")),
    "fat_g":       _safe_float(row.get("fat_100g")),
    "fiber_g":     _safe_float(row.get("fiber_100g")),
    "sodium_g":    _safe_float(row.get("sodium_100g")),
}
data[barcode]["nutrition_per_100g"] = (
    nutrition if any(v is not None for v in nutrition.values()) else None
)
```

---

## Task 3 Detail — `normalize.py`

**Remove** (lines 161-166 and 180-182):
- The non-food filter block calling `_is_non_food()`
- The `_is_non_food()` function itself

**Add** to `_normalize_one()` return dict (after `_enrichment_failed`):
```python
# Nutrition from Open Food Facts (None if barcode not in OFF)
"nutrition_per_100g": off_data.get("nutrition_per_100g"),

# Review fields — human edits these in catalog-review.json
"suggested_category":  category_group,   # seeder's best guess
"kitchen_category":    "",               # human assigns one of KITCHEN_CATEGORIES
"approved":            False,
"drop":                False,
"notes":               "",
```

Note: `category_group` is set at line ~201 via `_resolve_category_group()` — confirmed existing.

---

## Task 4 Detail — `filter.py` (new file)

```python
"""
filter.py — Step 2.5 of the catalog seeder pipeline.

Two-signal food filter on normalized products:
  - Products already resolved to non-pantry categories pass automatically
    (normalize.py matched them against food keywords)
  - Pantry products require a positive food signal:
    food weight unit in name (e.g. "439 גרם") OR a pantry food keyword
  - Any product matching the NON_FOOD_KEYWORDS blocklist is dropped regardless

Note: יחידה (unit) is NOT a drop signal — eggs, lemons, bottles are sold by unit.
"""

import re
import logging
from typing import Any
from config import NON_FOOD_KEYWORDS

logger = logging.getLogger(__name__)

# Numeric + Hebrew weight/volume unit in name (e.g. "439 גרם", "1 ליטר", "200 מ"ל")
_FOOD_WEIGHT_RE = re.compile(r'\d+\s*(גרם|ק"ג|קג|ליטר|מ"ל|מיליליטר|ל\')')

# Additional food keywords for pantry-category products that lack a category keyword
_PANTRY_FOOD_KEYWORDS: tuple[str, ...] = (
    "שמן", "רוטב", "תבלין", "מלח", "סוכר", "קמח", "שוקולד",
    "דבש", "רסק", "ממרח", "מרק", "אבקה", "שמרים", "חומץ",
    "קטשופ", "מיונז", "חרדל", "סויה", "קפה", "תה", "קקאו",
    "וניל", "קינמון", "פפריקה", "כמון", "כורכום", "זעתר", "סומק",
    "חריף", "ג'ינג'ר", "כוסברה", "בזיליקום", "אורגנו",
    "עדשים", "חומוס", "טחינה", "פסטו", "קרם", "לציון",
)


def apply_food_filter(normalized: list[dict[str, Any]]) -> list[dict[str, Any]]:
    before = len(normalized)
    results = []

    for p in normalized:
        name_he = p.get("name_hebrew", "")
        name_en = p.get("name_english") or ""
        category = p.get("_category_group", "")

        if _is_blocked(name_he) or _is_blocked(name_en):
            continue

        if category != "pantry":
            results.append(p)
            continue

        if _has_pantry_food_signal(name_he):
            results.append(p)

    dropped = before - len(results)
    logger.info(f"[filter] {len(results)}/{before} products passed ({dropped} dropped)")
    return results


def _is_blocked(name: str) -> bool:
    return any(kw in name for kw in NON_FOOD_KEYWORDS)


def _has_pantry_food_signal(name: str) -> bool:
    if _FOOD_WEIGHT_RE.search(name):
        return True
    return any(kw in name for kw in _PANTRY_FOOD_KEYWORDS)
```

---

## Task 5 Detail — `main.py`

### New / changed CLI args
- Add `--from-review` (new): skip fetch/filter/normalize, load catalog-review.json approved items → enrich → diff → write
- Keep `--skip-fetch` as deprecated alias: prints warning, treated as `--from-review`

### Default path (no --from-review)
Replace Steps 1-3 block:
```
fetch_supermarket_products() → fetch_off_bulk() → normalize_products() → apply_food_filter()
  → if --dry-run: log stats, return 0
  → else: write catalog-review.json with {"generated_at", "total", "items": filtered}, return 0
```

### --from-review path
```
load catalog-review.json → filter approved:true AND drop:false
  → strip _REVIEW_FIELDS = {approved, drop, kitchen_category, suggested_category, notes}
  → if kitchen_category set: categories_ = [kitchen_category]
  → nutrition_per_100g preserved
  → proceed to existing enrich → diff → write steps with pending list
```

### --dry-run + --from-review
Load approved items, pass to enrich, skip DB write (existing dry_run guard handles it).

---

## Verification

1. `python main.py --dry-run` → log shows `[filter] NNN/MMMM passed (KKK dropped)`
2. `python main.py` → `output/catalog-review.json` written; items have `approved: false`, `kitchen_category: ""`, `nutrition_per_100g` non-null for barcoded OFF items
3. Grep catalog-review.json for `שקיות זיפר`, `ניילון נצמד`, `סיגריות` → no results
4. Set 3 items `approved: true, kitchen_category: "vegetables"` → `python main.py --from-review --dry-run` → `3 approved items loaded`
5. At least one item has `nutrition_per_100g: {energy_kcal: ..., protein_g: ...}`

## Backend Impact — None
No MongoDB writes in this plan. All changes are Python pipeline only.
`catalog-review.json` is local disk only.
