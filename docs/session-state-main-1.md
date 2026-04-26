# Session State — 2026-04-26 Produce Seeder Nutrition Fix

## Branch
`feat/ai-menu-phase1`

## Seeder Work (this session)

### Root Cause Found & Fixed
- `fetch.py` crashed at row ~1.5M of OFF bulk CSV due to default `csv.field_size_limit` (131KB)
- Israeli barcodes (729...) only appear in rows 3M–4.4M — crash = 0 nutrition
- **Fix:** `csv.field_size_limit(10 * 1024 * 1024)` added to `fetch.py:178`

### Pipeline Re-run
- `catalog-review.json` regenerated: 191 products, 51/191 (26.7%) now have nutrition
- 8 mislabels/duplicates fixed in `catalog-review.json`
- Ready: user sets `approved: true` → `python main.py --from-review`

### New Script
- `tools/catalog-seeder/patch_nutrition.py` — backfills nutrition via OFF for barcode-bearing products
- 83 demo products have NO barcodes → can't use OFF → need Gemini

### Gemini nutrition — DONE
- User ran prompt manually in Gemini UI, got JSON back for 81 products (demo_162 and demo_185 returned all nulls — skipped)
- `patch_nutrition_manual.py` written with all 81 nutrition entries embedded
- Dry run: Local=81 found, Atlas=0 found (Atlas has catalog products, not demo products)

### Atlas situation — CLARIFIED
- Atlas has 165 `__master__` products (catalog products from previous seeder runs, names like "פסטה קרניים בינוניות")
- 48 have nutrition, 117 don't
- Barcodes were STRIPPED from DB docs by `db_write.py` `_INTERNAL_KEYS` — so `patch_nutrition.py` (barcode-based) found nothing
- Fix: rewrote `patch_nutrition.py` to match by `name_hebrew` using `catalog-review.json` as the nutrition source

### READY TO RUN — needs dry run first
```bash
cd tools/catalog-seeder
python patch_nutrition.py          # dry run — check counts
python patch_nutrition.py --write  # apply to Atlas + Local
python patch_nutrition_manual.py   # dry run for demo products (Local only)
python patch_nutrition_manual.py --write
```

---

# Previous State — 2026-04-26 AI-Everywhere Phase 2 Planning

## Branch
`main` (no code written yet this session — planning only)

## Session
`.claude/sessions/2026-04-25-ai-phase2-products/`

## What happened this session

### Phase 1 (Menus) — Status audit
- Verified all 4 Phase 1 sub-briefs are complete against live code
- Sub-brief 1.1 (backend): ✅ `/generate-menu` + `/patch-menu` + `/save-menu-shot` all live
- Sub-brief 1.2 (client layer): ✅ `ai-menu-draft.model.ts`, `recipe-match.util.ts`, `MenuAiFlowService` all exist
- Sub-brief 1.3 (modal): ✅ `AiMenuModalComponent` + service fully implemented
- Sub-brief 1.4 (integration): ✅ Both entry points wired (menu-intelligence via HeroFab, menu-library via HeroFab)
- One gap fixed: added `@HostListener('document:keydown.escape')` to `ai-menu-modal.component.ts`
- Create-while-dirty confirm: accepted auto-switch behavior as better UX (no code needed)
- `ng build` passes clean ✅

### Phase 2 (Products) — Planned, NOT yet executed
- Full 4-sub-brief plan written and saved as **Plan 287** (`plans/287-ai-phase2-products.plan.md`)
- Session brief: `.claude/sessions/2026-04-25-ai-phase2-products/brief.md`
- Adversarial review run — 3 real issues fixed, plan is clean
- todo.md updated with all 18 tasks
- **NO code has been written for Phase 2 yet**

## Next session: Execute Plan 287

Start with Task 1 — say `execute-it` to begin.

Task sequence:
1. Tasks 1–5: `server/routes/ai.js` — backend endpoints
2. Tasks 6–8: client models + GeminiService + flow service
3. Tasks 9–14: AiProductModal + dictionary
4. Tasks 15–18: integration (inventory list, product form, quick-add modal)

## Key context for executor

**Product model fields** (`src/app/core/models/product.model.ts`):
`name_hebrew`, `base_unit_`, `sources_[]`, `purchase_options_[]`, `categories_[]`, `yield_factor_`, `allergens_[]`, `min_stock_level_`, `expiry_days_default_`

**productForm_ controls** (in `product-form.component.ts` line 294+):
`name_hebrew`, `base_unit_` (required), `categories_` (FormControl holding string[]), `allergens_` (FormControl holding string[]), `yield_factor_`, `min_stock_level_`, `expiry_days_default_`

**MetadataRegistryService**:
- `registerCategory(name): Promise<string|null>` — returns key or null
- `registerAllergen(name): Promise<void>` — returns void, push string directly after

**HeroFab** already wired in `inventory-product-list.component.ts` line 140 — just add to existing array.

**QuickAddProductModal** uses signals (not FormGroup) — AI fill sets signals directly, do NOT break `advanceFocus()` keyboard chain.

**`addProduct(Omit<Product,'_id'>): Promise<Product>`** — must include `sources_: []` and `purchase_options_: draft.purchase_options_ ?? []` in payload.

**`product-form.component.ts`** has NO `providers` array currently — create it.

**GeminiService import pattern**: `import type { AiProductDraft, AiProductPatch } from '@models/ai-product-draft.model'`

## Phase 1 Escape key fix (this session)
- File changed: `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts`
- Added `HostListener` import + `@HostListener('document:keydown.escape') onEscapeKey()`
- Build passes ✅
- **Uncommitted** — needs commit before or alongside Phase 2 commit
