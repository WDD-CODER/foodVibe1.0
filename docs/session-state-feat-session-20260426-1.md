# Session State — feat/session-20260426

## What shipped this session

### 1. Nutrition filter in inventory sidebar (DONE, BUILD PASSES)
- Added `nutritionFilter_` signal (`'all' | 'has' | 'missing'`) to `InventoryProductListComponent`
- Two sidebar checkboxes: "עם ערכים תזונתיים" (Has) / "חסרי ערכים תזונתיים" (Missing)
- Mutually exclusive toggle, synced to URL param `?nutrition=`
- Translation keys added to `dictionary.json`
- SCSS added for `.nutrition-filter-option` in inventory SCSS

### 2. Fixed `leaf-off` icon crash (DONE, BUILD PASSES)
- `leaf-off` does not exist in this lucide-angular version (only `leaf`, `leafy-green` exist)
- Replaced with `circle-slash` in HTML (`inventory-product-list.component.html`)
- Added `CircleSlash` import + `.pick()` registration in `app.config.ts`
- `ng build` passes ✅

## Open / Next session

### /ship was interrupted at preamble (PENDING)
- User ran /ship, context hit 86% before ship could proceed
- Resume /ship in new session on branch `feat/session-20260426`
- Upgrade available: gstack 1.6.1.0 → 1.14.0.0 (can handle inline during ship)

### MongoDB sync broken for existing Atlas users (INVESTIGATION COMPLETE, FIX PENDING)

**Root cause confirmed:**
- Atlas `__master__`: 165 docs, all with nutrition ✅
- `dev-guest` (94 docs) + `h2yQv` (83 docs): ALL `_masterId` orphaned — 0 of 94/83 link to current master
- Atlas `__master__` was re-seeded with new random IDs → broke all `_masterId` links
- `sync-master.js` Rule 2 finds 0 matches → no updates ever propagate
- `sync-master.js` Rule 1 blocked by name collisions → no new clones added
- Users permanently frozen in stale state

**Why new signups also miss nutrition:**
- If signup happened before Atlas master was patched → clone was stale snapshot
- If signup via LOCAL server → user only exists in local MongoDB, not Atlas

**Fix options presented to user (awaiting choice):**
- **Option A (recommended)**: Re-link `_masterId` by `name_hebrew` — Python script, fixes sync permanently
- **Option B**: Direct `$set nutrition_per_100g` patch by name — quick but doesn't fix Rule 2 for future
- **Option C**: Delete orphaned user docs (all `_userModified: false`), let sync re-clone on next login

## Files changed this session
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`
- `public/assets/data/dictionary.json`
- `src/app/app.config.ts`

## Git status
- Branch: `feat/session-20260426`
- Changes uncommitted (ship was interrupted before committing)
- `ng build` passes
