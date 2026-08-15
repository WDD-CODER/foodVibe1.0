---
name: Catalog Seeder Data Quality + Supplier Model
overview: Re-seed 800 products with clean names, correct per-base-unit pricing, and brand→supplier entity linking.
todos: []
isProject: false
---

# Goal
Re-seed the 800 products with clean, structured data:
- `name_hebrew` = ingredient only (no brand, no quantity)
- Brand → supplier entity created/linked in `KITCHEN_SUPPLIERS`
- `purchase_options_` = correct pack size with real conversion rate
- `buy_price_global_` = price normalized to per-base-unit (per kg / per liter)

# Atomic Sub-tasks

- [ ] Step 0: Clear bad seed — delete all `{seeded_: true}` from `PRODUCT_LIST`; delete `output/pending-review.json` and `output/enriched.json`
- [ ] Step 1: Add `_safe_float` helper to `enrich.py` (prerequisite — undefined in brief)
- [ ] Step 2: Expand `_PROMPT_TEMPLATE` in `enrich.py` to return 8 fields
- [ ] Step 3: Update `_validate_response` in `enrich.py` to validate and return new fields
- [ ] Step 4: Update `_attach_enrichment` in `enrich.py` — name override + internal fields + call `_recalc_pricing`
- [ ] Step 5: Add `_recalc_pricing` and `_pack_to_base_conversion` to `enrich.py`
- [ ] Step 6: Add `SUPPLIERS_COLLECTION = "KITCHEN_SUPPLIERS"` to `config.py`
- [ ] Step 7: Add `import random, string` + `_make_id` helper to `db_write.py` (prerequisite — gap found during verification)
- [ ] Step 8: Add `_upsert_suppliers` function to `db_write.py`
- [ ] Step 9: Update `write_approved` to call `_upsert_suppliers` and pass `supplier_map` to `_prepare_doc`
- [ ] Step 10: Update `_prepare_doc` to accept `supplier_map` and link `supplierIds_`
- [ ] Step 11: Update `_INTERNAL_KEYS` to include `_brand`, `_pack_size`, `_pack_unit`
- [ ] Step 12: Update `db_write.py` imports to include `SUPPLIERS_COLLECTION`
- [ ] Step 13: Create branch `feat/seeder-data-quality` and re-seed with `python main.py --approve-all`

# Constraints
- Never commit to `main` — branch off `feat/seeder-data-quality`
- Do NOT re-run the seeder without first deleting existing seeded products (Step 0)
- `pending-review.json` doubles as a "already queued" blocklist — always delete it when re-seeding from scratch
- The `google.generativeai` package is deprecated — future migration to `google.genai` (out of scope here)

# Verification
1. `python -c "from config import *; import pymongo; c=pymongo.MongoClient(MONGO_URI); col=c.get_default_database()['PRODUCT_LIST']; p=col.find_one({'seeded_':True}); print(p['name_hebrew'], p['buy_price_global_'], p['purchase_options_'], p['supplierIds_']); c.close()"` — confirm clean name + correct pricing
2. Open the app → inventory → check a seeded product shows correct Hebrew name (no brand/qty in name)
3. Open the app → suppliers → confirm brand suppliers were created
4. Check one product's purchase option: `conversion_rate_` should reflect the actual pack size (e.g. 0.55 for 550g with base_unit=kg)
5. Verify cost calculation: a recipe using 100g of a kg-based product should cost `buy_price_global_ * 0.1`

## Backend Impact
- Collections affected: `PRODUCT_LIST`, `KITCHEN_SUPPLIERS`
- New collections: no — `KITCHEN_SUPPLIERS` already registered in `standards-backend.md §1`
- Server changes needed: no — seeder writes directly via pymongo
