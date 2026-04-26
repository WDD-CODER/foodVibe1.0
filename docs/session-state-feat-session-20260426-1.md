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

### 3. Plan 288 — User Management Card (Tasks 1–10 DONE, BUILD PASSES)
- `server/constants/all-user-entity-types.js` — 22 entity type strings (mirrors BACKUP_ENTITY_TYPES)
- `server/routes/admin.js` — GET /users + DELETE /users/:userId with cascade delete across all 22 collections
- `server/index.js` — adminRouter mounted at /api/v1/admin
- `src/app/core/models/admin-user.model.ts` — AdminUser interface
- `src/app/core/services/user-admin.service.ts` — getUsers() + deleteUser(), no manual auth header (interceptor)
- `src/app/pages/metadata-manager/components/user-management/user-management.component.ts` — standalone, OnPush
- `src/app/pages/metadata-manager/components/user-management/user-management.component.html`
- `metadata-manager.page.component.html` — app-user-management inserted after app-section-category-manager
- `metadata-manager.page.component.ts` — UserManagementComponent added to imports array
- `ng build` passes ✅ (0 errors)

**Key implementation notes:**
- `isAdmin` computed from `userService.user_()?.role === 'admin'` (UserService has no `isAdmin_`)
- `currentUserId` from `userService.user_()?._id` (private `_user_` not accessible)
- `req.user.userId` confirmed correct — JWT signed with `{ userId: _id }` in auth.js:138
- `__master__` filtered server-side via `{ _id: { $ne: '__master__' } }`
- Self-delete returns 403 server-side AND button disabled client-side

## Open / Next session

### Plan 288 — Task 11 only remaining
Edit `.claude/commands/plan-implementation.md` Step 0 item 1 to add gate:
> "**If invoked from brief-detection (option b):** ARGUMENTS already contain the full brief text. Skip the comprehensive-brief confirmation gate — treat as option A, write ARGUMENTS verbatim to `brief.md`, proceed directly to Step 1."

### /ship was interrupted at preamble (PENDING)
- Prior session: User ran /ship, context hit 86% before ship could proceed
- Now: Plan 288 Tasks 1–10 also uncommitted
- Resume /ship in new session on branch `feat/session-20260426`

### MongoDB sync broken for existing Atlas users (INVESTIGATION COMPLETE, FIX PENDING)
**Root cause confirmed:**
- Atlas `__master__`: 165 docs, all with nutrition ✅
- `dev-guest` (94 docs) + `h2yQv` (83 docs): ALL `_masterId` orphaned — 0 of 94/83 link to current master
- Atlas `__master__` was re-seeded with new random IDs → broke all `_masterId` links
- `sync-master.js` Rule 2 finds 0 matches → no updates ever propagate

**Fix options (awaiting user choice):**
- **Option A (recommended)**: Re-link `_masterId` by `name_hebrew` — Python script, fixes sync permanently
- **Option B**: Direct `$set nutrition_per_100g` patch by name — quick but doesn't fix Rule 2
- **Option C**: Delete orphaned user docs, let sync re-clone on next login

## Files changed this session
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`
- `public/assets/data/dictionary.json`
- `src/app/app.config.ts`
- `server/constants/all-user-entity-types.js` (new)
- `server/routes/admin.js` (new)
- `server/index.js`
- `src/app/core/models/admin-user.model.ts` (new)
- `src/app/core/services/user-admin.service.ts` (new)
- `src/app/pages/metadata-manager/components/user-management/user-management.component.ts` (new)
- `src/app/pages/metadata-manager/components/user-management/user-management.component.html` (new)
- `src/app/pages/metadata-manager/metadata-manager.page.component.html`
- `src/app/pages/metadata-manager/metadata-manager.page.component.ts`
- `plans/288-user-management-card.plan.md` (new)
- `.claude/todo.md`
- `.claude/sessions/2026-04-26-user-management-card/brief.md` (new)

## Git status
- Branch: `feat/session-20260426`
- All changes uncommitted (ship not yet run)
- `ng build` passes ✅
