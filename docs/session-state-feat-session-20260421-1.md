# Session State — 2026-04-21 — ALL PLANS SHIPPED ✓ + retrospective improvements applied

---

## SESSION COMPLETE — Nothing pending

All plans 276–283 shipped across PRs #132 and #133.
Retrospective action items implemented (commits 903ed54, d381686, + current uncommitted).
Uncommitted: `CLAUDE.md` + `evaluate-me.md` (plugin cache tracking + vocabulary fix).

---

## INTERRUPT TASK: fix/product-edit-name-taken — DONE ✓

**Bug:** Editing a product shows "name is taken" error; saving in edit mode creates a new item.
**Root cause:** `server/services/sync-master.js` — `PRODUCT_LIST` had no name-collision guard. When master has product "X" and user already has product "X", sync cloned it → two products with same name, different `_id`s. The validator in `product-form.component.ts:292` then found the clone and flagged it as "duplicate."

**Fix applied:** `server/services/sync-master.js`
- **Cleanup block** (after `userByMasterId` build, before `toInsert`): on each sync, deletes any master-cloned products whose `name_hebrew` matches a user-created product.
- **Rule 1 guard** (inside `!existing` block): skips cloning a master product if the user already has any product with the same name.
- `ng build` passes (warnings only, no errors).

**Next step:** commit + PR. No frontend changes needed.

---

## RESUME HERE (next session)

**Brief 1 DONE** — TRIAGE.md written at `.claude/reports/mobile-audit/TRIAGE.md`
**Brief 2 DONE** — Plans 276–283 written, todo.md updated, agent cleanup committed (`903ed54`)

**Commit `903ed54`** — 7 files: execute-it.md, failure-log.tsv, context-management SKILL.md, end-session SKILL.md, recipe.resolver.ts, product-form.component.ts, 2026-04-21-15-00-multi-agent.md retrospective

Next action: **Execute plans 276–283** (mobile audit fixes). Start with Plan 276 (FAB RTL) — smallest change, highest affected flows.

---

## Plan Numbers

- Next plan number: **276**
- Highest existing: `275-design-bundle-3-hebrew-rtl.plan.md`

---

## Plans to Write (Brief 2)

### Plan 276 — `mobile-audit-rtl-fab`
**File:** `src/app/core/components/hero-fab/hero-fab.component.scss`
**Fix (2 lines):**
- Line 4: `left: 0.75rem;` → `inset-inline-end: 0.75rem;` (remove comment "intentionally physical")
- Line 110 (inside `@media (max-width: 768px)`): `left: 0.5rem;` → `inset-inline-end: 0.5rem;`
- The `@media (max-width: 620px)` block already uses `inset-block-end` correctly — no change needed there
**Affected flows:** 10 (every page with FAB)

---

### Plan 277 — `mobile-audit-ingredient-grid-mobile`
**File:** `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`
**Fix:** Inside `@media (max-width: 640px)` block (starts line 471):
- Current grid template (line 479): `grid-template-columns: 1fr 5rem 4rem 3.5rem;` (name, unit, qty, cost)
- Change to: `grid-template-columns: 1fr 5rem 4rem 3.5rem 2.5rem;` (add 5th col for actions)
- Line ~492: `.col-drag { display: none; }` — KEEP (no CDK drag on touch)
- Lines ~521-523: `.col-percent, .col-actions { display: none; }` — CHANGE to:
  ```scss
  .col-percent { display: none; }
  .col-actions {
    grid-column: 5;
    grid-row: 1;
    min-height: auto;
    justify-content: center;
    .c-icon-btn { opacity: 1; width: 2.75rem; height: 2.75rem; }
  }
  ```
- Container query at line 418 (`@container ingredients (max-width: 520px)`) already has `.col-actions { grid-column: 1/-1; justify-content: flex-end; }` — this is fine, keep as-is
**Affected flows:** recipe-builder-new-prep, recipe-builder-new-dish, recipe-builder-edit

---

### Plan 278 — `mobile-audit-bottom-nav-occlusion`  
**Key finding:** Bottom nav = `height: 3.5rem = 56px`, `z-index: 200` (header.component.scss line 364)
**Financial bar:** `position: fixed; bottom: 0; z-index: 100` — bottom nav (z-index 200) fully covers it
**Fix approach:**
1. `src/app/pages/menu-intelligence/_toolbar.scss` — `.financial-bar`: add `z-index: 201` AND `@media (max-width: 620px) { bottom: 3.5rem; padding-bottom: env(safe-area-inset-bottom, 0); }`
2. Page scroll containers missing `padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px))`:
   - `src/app/pages/venues/` SCSS — check venue-add component
   - `src/app/pages/inventory/` SCSS — check inventory-add/edit component
   - `src/app/pages/equipment/` SCSS — check equipment-add component
   - `src/app/pages/metadata-manager/` (or dashboard.page.scss tab) — check
3. Alternative: add global rule in `styles.scss` for all page content hosts
**Affected flows:** menu-intelligence-event (C1, C2), venues-add (M1), inventory-add (M2,M3), inventory-edit (DEF-IE-07), equipment-add (MAJ-1), metadata-manager (N2)

---

### Plan 279 — `mobile-audit-sticky-header-safe-zone`
**Header height:** `3.875rem = 62px` (`header.component.scss` line 9: `height: 3.875rem`)
**Fix (2 files):**
1. `src/app/pages/dashboard/dashboard.page.scss` — `.dashboard-content`: add `@media (max-width: 620px) { padding-block-start: 3.875rem; }`
2. `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — identify `.list-container` (or page host) and add same padding
**Affected flows:** dashboard (MAJOR-02), recipe-book-list (MAJOR-02)

---

### Plan 280 — `mobile-audit-rtl-layout`
**Focus:** Non-FAB RTL positioning bugs in recipe-book-list and suppliers
**Suspect files:**
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — filter close button (MAJOR-03), search icon (MAJOR-04)
- `src/app/pages/suppliers/` SCSS — page title zero right-padding (MAJOR M2)
**NOTE:** `auth-modal.component.scss` line 118 already uses `inset-inline-end: 0.5rem` for `.password-toggle` — this IS the correct logical property. The audit complaint (login DEF-L01, signup M2) is a UX convention debate, NOT a CSS bug. **Do NOT change auth-modal.**
**Action for next session:** Read recipe-book-list SCSS lines 120+ and suppliers SCSS to confirm selectors before writing this plan

---

### Plan 281 — `mobile-audit-input-overflow`
**Focus:** Input fields clipping/collapsing content in RTL
**Suspect files:**
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` — ingredient search `<input placeholder="חפש מוצר או מתכון">` in col-name — check overflow rules in mobile grid
- `src/app/pages/recipe-builder/recipe-builder.page.scss` or main template — recipe name `input[placeholder="שם המתכון..."]` `overflow: clip` + yield vessel search `input[placeholder="חפש כלי..."]` 30px width
**Action for next session:** Read recipe-builder.page.scss to find name input and yield vessel input rules

---

### Plan 282 — `mobile-audit-dropdown-z-index`
**Critical defect included:** DEF-IE-01 (inventory-edit category dropdown stays open + dual-select)
**Also included (single-flow-bug critical):** DEF-IE-02 (stale duplicate-name validation on edit load)
**Suspect files:**
- Inventory edit component (TS + template) — look for `onCategorySelect` / category change handler
- `src/styles.scss` — global ng-select / `.ng-dropdown-panel` Escape dismiss
**Action for next session:** Find inventory-edit-product component TS file, read category selection logic

---

### Plan 283 — `mobile-audit-touch-target-size`
**Files confirmed:**
1. `src/app/pages/trash/trash.page.scss`:
   - `.btn-item { padding: 0.3rem 0.6rem; }` — no min-height → renders at ~30px. Fix: add `min-block-size: 2.75rem;` (44px) to both `.btn-item` and `.btn-action`
   - `.btn-action { padding: 0.4rem 0.75rem; }` — same issue
2. `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — row action buttons 24px wide (need to read more of this file to find the selector)
**Action for next session:** Read recipe-book-list SCSS lines 120+ for row action button width rules

---

## Clusters to DEFER (update TRIAGE.md)

| Cluster | Reason |
|---|---|
| approve-stamp-overflow | Code shows `right: 0.5rem` (correct). recipe-builder-edit confirms "not clipping (8px margin)". recipe-builder-new-prep finding likely misread. Defer pending `/mobile-flow-audit --only recipe-builder-new-prep` re-run |
| floating-avatar | Root cause unclear — may be resolved by sticky-header-safe-zone fix (plan 279). Defer until plan 279 ships |
| modal-viewport-fit | auth-modal SCSS already uses correct logical properties. Need browser re-verification. Defer pending re-audit |
| single-flow-bug minors (15 items) | Spread across >10 files; all minor severity → defer low ROI |
| single-flow-bug majors: Gemini panel (mie/M2), metadata redirect (mm/M1,M2), form-state-lost (rbnd/Dm2) | Likely Angular routing/lifecycle bugs requiring larger scope investigation → defer |
| single-flow-bug major: rbe/M-02 (excess rows) | Needs manual verification — may be test automation artifact |
| cook-view malformed | Re-run `/mobile-flow-audit --only cook-view` before planning |

---

## Code Facts (do NOT re-derive)

- Header nav height: `3.875rem = 62px` (header.component.scss line 9)
- Bottom nav height: `3.5rem = 56px` (header.component.scss line 364 — `height: 3.5rem`)
- Bottom nav z-index: `200` (header.component.scss ~line 360)
- FAB z-index at ≤620px: `210` (hero-fab.component.scss line 132)
- Approve-stamp z-index at ≤620px: `210` (approve-stamp.component.scss line 122)
- Financial bar z-index: `100`, position fixed bottom:0 (_toolbar.scss line 7,19)
- Password toggle in auth-modal: `inset-inline-end: 0.5rem` (ALREADY CORRECT — do not touch)
- Ingredient grid mobile (≤640px): `.col-actions { display: none }` confirmed at line 521-522
- Trash `.btn-item` padding: `0.3rem 0.6rem` — no min-height, renders ~30px
- Trash `.btn-action` padding: `0.4rem 0.75rem` — no min-height, renders ~30px

---

## TRIAGE.md Updates Needed

Before writing plans, update `.claude/reports/mobile-audit/TRIAGE.md` "Deferred / Won't-fix" section with the clusters listed above.

---

## Branch
`feat/session-20260421` (confirmed at session start)

## Todo.md
Plans sub-tasks should be appended after the existing Plan 262 section in `.claude/todo.md`
