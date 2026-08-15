---
name: Seeder Master Alignment
overview: Align the catalog seeder pipeline with the app's master/user clone architecture — stamp ownership fields, add sources_ array, and filter diff to master-only docs.
todos: []
isProject: false
---

# Plan 271 — Seeder Master Alignment

## Context

The catalog seeder (`tools/catalog-seeder/`) fetches ~800 real Israeli supermarket products,
enriches them via Gemini, and writes them to MongoDB. However it writes documents without the
ownership and structural fields that the app's data management layer requires.

The app uses a **master/user clone architecture**:
- All sharable data lives as `userId: '__master__'` docs in MongoDB
- At signup, `clone-master.js` copies every master doc to the user's namespace
- A sync cycle (`syncMasterToUser`) keeps unmodified clones up-to-date when master changes
- `diff.py` currently compares against ALL docs in `PRODUCT_LIST` — should be master-only

Without fixing these gaps, seeded products are never cloned to new users at signup, are
invisible to the sync cycle, and the diff check is polluted by user-owned documents.

## Critical Files

| File | Change |
|------|--------|
| `tools/catalog-seeder/db_write.py` | Ownership fields + `sources_` + `name_hebrew_normalized` |
| `tools/catalog-seeder/diff.py` | Filter DB query to `userId: '__master__'` only |

## Atomic Sub-tasks

- [ ] Step 1: `tools/catalog-seeder/db_write.py` — Add `userId: '__master__'`, `_masterId: None`, `_userModified: False` to `_prepare_doc()`
- [ ] Step 2: `tools/catalog-seeder/db_write.py` — Add `_normalize_name()` helper; stamp `name_hebrew_normalized` on each product doc
- [ ] Step 3: `tools/catalog-seeder/db_write.py` — Build and write `sources_` array `[{supplierId, price, addedAt}]` alongside legacy fields
- [ ] Step 4: `tools/catalog-seeder/db_write.py` — Add `userId: '__master__'`, `_masterId: None`, `_userModified: False` to `_upsert_suppliers()`
- [ ] Step 5: `tools/catalog-seeder/diff.py` — Add `userId: '__master__'` filter to MongoDB query in `diff_against_db()`

## Implementation Detail

### Step 1 — Ownership fields on products (`_prepare_doc`)

```python
"userId":        "__master__",
"_masterId":     None,
"_userModified": False,
```

### Step 2 — `name_hebrew_normalized`

```python
import re

def _normalize_name(name: str) -> str:
    return re.sub(r'\s+', ' ', name.strip()).lower()

# In _prepare_doc():
"name_hebrew_normalized": _normalize_name(doc["name_hebrew"]),
```

### Step 3 — `sources_` array (canonical pricing)

When a supplier is linked, build a `ProductSource`-compatible entry.
Keep `buy_price_global_` and `supplierIds_` alongside it (backward compat).

```python
"sources_": [
    {
        "supplierId": supplier_id,
        "price":      doc["buy_price_global_"],
        "addedAt":    now_ms,
    }
] if supplier_id else [],
```

### Step 4 — Ownership fields on suppliers (`_upsert_suppliers`)

```python
"$setOnInsert": {
    ...,
    "userId":        "__master__",
    "_masterId":     None,
    "_userModified": False,
}
```

### Step 5 — `diff.py` master-only filter

```python
# Before:
col.find({}, {"_id": 1, "barcode": 1, "name_hebrew": 1})

# After:
col.find({"userId": "__master__"}, {"_id": 1, "barcode": 1, "name_hebrew": 1})
```

## What Does NOT Change

- Pipeline flow (FETCH → NORMALIZE → DIFF → ENRICH → REVIEW → WRITE) — unchanged
- `enrich.py`, `normalize.py`, `config.py`, `fetch.py`, `review.py`, `main.py` — unchanged
- `_INTERNAL_KEYS` strip list — unchanged

## Verification

1. **Dry run**: `python main.py --dry-run` — completes without errors
2. **Ownership check** after full run:
   ```python
   python -c "
   import pymongo, os; from dotenv import load_dotenv; load_dotenv()
   c = pymongo.MongoClient(os.getenv('MONGO_URI'))
   p = c.get_default_database()['PRODUCT_LIST'].find_one({'seeded_': True})
   print(p['userId'], p['_masterId'], p['_userModified'])
   print('sources_:', p.get('sources_'))
   print('name_hebrew_normalized:', p.get('name_hebrew_normalized'))
   "
   ```
   Expected: `__master__ None False`, `sources_` array present, `name_hebrew_normalized` set.
3. **Supplier check**:
   ```python
   python -c "
   import pymongo, os; from dotenv import load_dotenv; load_dotenv()
   c = pymongo.MongoClient(os.getenv('MONGO_URI'))
   s = c.get_default_database()['KITCHEN_SUPPLIERS'].find_one({'seeded_': True})
   print(s['userId'], s['_masterId'], s['_userModified'])
   "
   ```
   Expected: `__master__ None False`.
4. **Clone test**: Register a new user → confirm seeded products appear in their inventory with correct `_masterId`.
5. **Diff idempotency**: Run `python main.py --dry-run` a second time → `pending-review.json` empty.
