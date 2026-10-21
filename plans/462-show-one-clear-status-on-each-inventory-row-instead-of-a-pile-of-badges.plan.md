# Plan 462 — Show one clear status on each inventory row instead of a pile of badges

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
On `/inventory/list` (branch `mvp`) one product row can show four marks at once next to its name: the amber
«לא סגור סופית» chip, the red circle (missing name or unit), the amber triangle (missing supplier or category) and
the «מלאי נמוך» badge. The Human (validation card 9) liked the amber chip and the filters but wants one compact
status per row: when the chip shows, no triangle; and a tooltip that lists everything missing, price included.
Handoff item C1 (`docs/mvp/review-handoff-2026-10-21.md`), decision D4.

Verified in code on `b7d21fb0`:
- `inventory-product-list.component.html:171-206` has three independent blocks in `.col-name`: low stock (`isLowStock`),
  the red-circle / triangle `validation-badge` (an `@if / @else if` on `row.validationStatus`) and the `row.unpriced`
  chip. Nothing links them, so they stack.
- `displayRows_` (`inventory-product-list.component.ts:371-383`) already gives each row `validationStatus`,
  `unpriced` and `missingFields`; a missing price is deliberately NOT in `missingFields`
  (`getProductMissingFields`, `src/app/core/utils/product-validation.util.ts:40-47` returns only name, unit,
  category, supplier). So the tooltip today never mentions the price.
- The tooltip is CSS-only: `.validation-badge:hover .validation-tooltip { display: flex }` in the component scss.
  On a phone there is no hover, so the tooltip is never reachable (the badge is a `span`, a tap on the row opens the
  edit page: `onRowClick` returns early only for `button`, `a`, `.allergen-btn-wrapper`, `app-list-row-checkbox`,
  lines 551-565).
- The scss defines `.validation-badge`, `.validation-tooltip` and `.tooltip-chip` twice (first block ~line 191-250,
  second ~280-340) and the second uses physical `left: 50%` (breaks the logical-properties rule and clips at the
  screen edge in RTL).
- `missing_price` («מחיר») already exists in `public/assets/data/dictionary.json:218`; `missing_name`, `missing_unit`,
  `missing_category`, `missing_supplier` too. `VALIDATION_FIELD_ICONS` (`product-validation.util.ts:7-12`) has no
  entry for the price.
- Not verified (needs the running app): how the tooltip looks at the list's right edge on a 375 px phone.

## Goals & Success Criteria
- Primary: each inventory row shows at most one status mark next to the name (plus the stock badge, see D4 notes);
  its tooltip lists everything missing, price first; on a phone a tap on the mark shows the same list.
- Success:
  - [ ] [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/inventory-product-list/**/*.spec.ts' --include='src/app/core/utils/product-validation.util.spec.ts'` passes, including new specs: a product with no price, no supplier and no category renders exactly one status mark (no `.validation-badge--incomplete`) whose tooltip has three chips (price, category, supplier); a priced product with no supplier renders one triangle mark with one chip; a product with a price, supplier and category renders no mark; an unnamed-unit product renders the red circle only, with a price chip when also unpriced; the filters «לא סגור סופית», invalid and incomplete still return the same products as before.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `git diff --numstat origin/mvp -- src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss` shows more lines removed than added (the duplicated tooltip block is merged).
  - [ ] [human] Open `/inventory/list`; find (or create with a name, unit `kg` and nothing else) a product with no price, no supplier and no category → its row shows ONE amber mark with the text «לא סגור סופית» and no triangle; hover the mark → one small box lists «מחיר», «קטגוריה», «ספק». The «לא סגור סופית» filter and the other filters still work.
  - [ ] [human] On a phone (or browser device mode, width 375): tap the same mark → the box opens and the edit page does NOT open; tap anywhere else → the box closes; tap the row name → the edit page opens.

## Execution Mode
- Parallel: yes — writes only the inventory list component folder and `product-validation.util`.
- Concurrent plans: none in this batch writes these files (461 writes the product form folder). Plan 460 may change the shared floating-panel helper but this plan does not use it.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed per `docs/mvp/run-mode.md` — [human] items become validation cards in `docs/mvp/runs/462.md`.
- Depends on: none.
- Decision D4 is still owed by the Human. This plan builds the recommended answer (see Critical Questions) and the run file logs it under `## Decisions`.
- Drafted by the Planner from handoff C1 (2026-10-21).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/inventory-product-list/**
src/app/core/utils/product-validation.util.ts
src/app/core/utils/product-validation.util.spec.ts
docs/mvp/runs/462.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — scope is one inventory list component and a pure client helper; no server, schema, taxonomy, permission or AI file is reached.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. In `inventory-product-list.component.html` find the
`validation-badge`, `unpriced-badge` and `low-stock-badge` blocks; in `inventory-product-list.component.ts` find
`displayRows_` and `onRowClick`; in `product-validation.util.ts` find `VALIDATION_FIELD_ICONS`,
`isProductUnpriced`, `getProductValidationStatus`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef scanning my product list, I want one clear mark per product so that I can see at a glance which products need attention without decoding several icons.
- As a chef, I want to learn exactly what is missing (price, supplier, category) from one small box so that I know what to fix when I open the product.
- As a chef on my phone, I want to tap that mark and read the same list so that I do not need a mouse to see it.

## Functional Requirements

### Must Have (P0)
- [ ] One status mark per row, chosen in this order: red circle when the name or unit is missing; else the amber «לא סגור סופית» chip when no price exists; else the amber triangle when supplier or category is missing; else nothing. Never two of them on one row.
- [ ] The tooltip of whichever mark shows lists every gap of the product, price first: «מחיר» (only when unpriced), then name / unit / category / supplier as today. Each gap is a chip with its icon (price uses the `coins` icon).
- [ ] Filters stay exactly as they are (invalid, incomplete, «לא סגור סופית», low stock); the amber chip keeps its look and text.
- [ ] Phone / touch: the mark is a real button; a tap toggles its tooltip and does not open the edit page; a tap outside closes it; Escape closes it. Desktop keeps open-on-hover (and on keyboard focus).
- [ ] The tooltip is placed with logical properties and never runs off the screen edge (anchored to the mark's start edge, capped to the viewport width).

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- The «מלאי נמוך» badge stays as a separate small badge: it is a stock fact, not a data gap, and has its own filter. If the Human wants it folded into the same tooltip, that is a follow-up (Critical Question 2).
- Phone behaviour follows the pattern already used by the «חלקי» badge (`partial-cost-badge.component.ts`: hover opens it on devices that can hover, click toggles and pins it; `clickOutside` and Escape close it) — one button, no long-press, nothing new for the user to learn. Proposal, flagged in Critical Questions.
- RTL: tooltip anchored with `inset-inline-start: 0`; no `left` / `right`.
- Add-option rule: not applicable (no dropdown touched).

## Atomic Sub-tasks
- [ ] S1: Add the price to the list of gaps shown in a row's tooltip — new pure helper `getProductStatusFields(product)` returns `['missing_price']` first when unpriced, then `getProductMissingFields(product)`; add the `coins` icon for `missing_price` to `VALIDATION_FIELD_ICONS`; spec for all four combinations — `src/app/core/utils/product-validation.util.ts`, `src/app/core/utils/product-validation.util.spec.ts`
- [ ] S2: Work out one status per row so a row can never show two marks — in `displayRows_` replace `missingFields` with `statusFields` (from S1) and add `statusKind`: `'invalid'` when `validationStatus` is invalid, else `'unpriced'` when `unpriced`, else `'incomplete'` when incomplete, else `null`; keep `validationStatus` and `unpriced` on the row (filters and the existing spec read them); add `openStatusId_` signal plus `toggleStatus(id)` and `closeStatus()` for the phone tap — `inventory-product-list.component.ts`
- [ ] S3: Replace the three stacked marks with one status button in the name cell — one `@if (row.statusKind)` block: a `button.row-status` carrying the old look per kind (red circle icon `alert-circle`, amber chip with `coins` and «לא סגור סופית» via `product_unpriced`, amber triangle `alert-triangle`) and ONE `.validation-tooltip` listing `statusFields` as chips; `aria-haspopup`, `aria-expanded`, `(click)` toggles via `toggleStatus` (button, so `onRowClick` already ignores it), `(clickOutside)` and `(keydown.escape)` close; low-stock badge block stays as is — `inventory-product-list.component.html`
- [ ] S4: Merge the duplicated tooltip styles and make them work for taps and RTL — keep one `.validation-badge` / `.validation-tooltip` / `.tooltip-chip` set; show the tooltip on `:hover` and `:focus-visible` only under `@media (hover: hover)`, and when `aria-expanded="true"` on any device; anchor with `inset-inline-start: 0`, `max-inline-size: min(20rem, calc(100vw - 2rem))`, `flex-wrap: wrap`; remove the `left: 50%` / `translateX(-50%)`; chip colours per kind (danger, warning); `pointer-events: none` removed so a tap on the box does not fall through; component `@layer` preserved; no new `.c-*` — `inventory-product-list.component.scss`
- [ ] S5: Prove the one-mark rule and the filters with component specs — the five cases from the Done-when (three gaps → one mark and three chips; priced + no supplier → one triangle; complete → none; no unit + unpriced → red circle with a price chip; the three filters unchanged); tap on the mark does not call the router; second tap closes — `inventory-product-list.component.spec.ts`
- [ ] S6: Build, run the specs, write the run file with the two validation cards and the D4 decision line — `docs/mvp/runs/462.md`

## Technical Considerations
- Dependencies: `isProductUnpriced`, `getProductValidationStatus`, `getProductMissingFields`, `VALIDATION_FIELD_ICONS` (`product-validation.util.ts`); `ClickOutSideDirective` already imported by the list component; `lucide-angular` icons `coins`, `alert-circle`, `alert-triangle` are already registered (used in the current template).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Frozen files: `inventory-product-list.component.*` is not on the growth-frozen list (`_shared/tech-stack.md`). Net scss change must be negative (merge of the duplicate block); ts and html growth is small.
- `getProductMissingFields` keeps returning four keys only (other code and its spec depend on it); the price is added by the new helper.
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys (`missing_price`, `product_unpriced`, `missing_*` exist).

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Folding the «מלאי נמוך» badge into the status mark.
- Changing which products count as invalid / incomplete / unpriced, or the filter panel.
- The product form's own warnings (plan 461) and the «חלקי» badge in recipes and menus (plan 466).
- A shared tooltip / floating-panel component (plan 460 covers viewport placement for popovers).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. **D4 (decision owed)** — recommended: price and unit gaps look the same as supplier / category gaps (one mark, one tooltip, price listed first); only the colour changes with severity: red when name or unit is missing (the app cannot calculate with it), amber otherwise. Alternative: keep price visually separate from the other gaps. This plan builds the recommended answer.
2. Recommended: keep the «מלאי נמוך» badge as its own small badge next to the name. Alternative: add «מלאי נמוך» as one more line in the tooltip. Your call.
3. Phone behaviour — recommended: the mark is a button; tap opens the box, tap outside closes it (same as the «חלקי» badge). Alternative: show the missing list inline under the product name on narrow screens. Tell me if you prefer the inline version.
4. When a product is both unnamed-unit (red) and unpriced: recommended one red circle whose box also lists «מחיר». Alternative: show the amber chip because the Human liked it. Say if you want that.
