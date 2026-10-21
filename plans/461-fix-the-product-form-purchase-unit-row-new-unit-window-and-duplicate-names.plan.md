# Plan 461 — Fix the product form: purchase-unit row, new-unit window and duplicate names

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
The Human walked the product form (`/inventory/add`, `/inventory/edit/:id`) on branch `mvp` and found four problems
(handoff `docs/mvp/review-handoff-2026-10-21.md`, items B1–B4):
1. **B1 row layout** — on desktop the middle «כמות נטו» box is only 70px wide so its placeholder is cut; on a phone the
   unit / quantity / compare-to fields have different widths and indents and the `=` and `:` are squeezed.
2. **B2 empty row** — a new purchase-unit row shows quantity and compare-to fields before any unit is chosen.
3. **B3 new-unit window** — Tab acts like confirming the unit; the question «כמה שוקלת … אחת של …?» assumes weight; the
   quantity starts at `0`.
4. **B4 duplicate product name** — saving a product named like an existing one gives only a generic message, with no
   field marked and nothing about the duplicate; nothing suggests the existing product while typing.

Verified in code on `b7d21fb` (the handoff's "Cause" lines were suspected; this is what reading shows):
- Desktop row: `product-form.component.scss:245-250` grid `minmax(90px,9rem) auto minmax(90px,1fr) minmax(auto,12rem) min-content`, and
  `:263-269` `input { width: 70px }`. Column 2 is `auto` and the quantity input is 70px, so «כמות נטו» (dictionary `quantity`) is cut. Confirmed.
- Phone row: the quantity and compare-to fields sit inside `<label class="label-row">` with a `=` / `:` span
  (`product-form.component.html:131-172`), the unit field does not (`:116-128`), so the three controls have different widths. Confirmed.
- Grid areas use `> :nth-child(1|2|3)` (`product-form.component.scss:482-496`). Hiding children with `@if` (B2) shifts those indexes, so the sub-tasks replace them with class names.
- The quantity control is already required with a minimum of 0.0001 (`addPurchaseOption` in `product-form.component.ts`: `conversionRate: [conv, [Validators.required, Validators.min(0.0001)]]`), so the D2 assumption "quantity required once a unit is chosen" is already how the form validates; today it is just invisible when empty.
- Unit window Tab: `unit-creator.component.html:17` `(keydown.tab)="onNameLeave($event)"` and `:41` `(keydown.tab)="$event.preventDefault(); focusBasisUnitSelect()"`. `onNameLeave` (`unit-creator.component.ts`) calls `keyResolution.ensureKeyForContext`, which can open the name-key window, so Tab does more than move focus. Save is only the button (`save()`), so the Human's "Tab acts like confirming" matches the name-key step; the Worker re-checks in the browser first.
- Question text: dictionary `unit_amount_for_product` = «כמה שוקלת {{unit}} אחת של {{name}}?», used by `amountLabel_` in `unit-creator.component.ts`; `newUnitValue_` starts at `1`, is set to `0` in product mode (constructor effect) and reset to `1` in `resetFields`.
- Duplicate name: a validator already exists — `duplicateNameValidator` on the `productName` control (`initForm` in `product-form.component.ts`) and an error block at `product-form.component.html:36-42` using class `form-error`, which has **no style** in `product-form.component.scss` (only supplier-form and venue-form define it). The red input mark and the field message come only from `validationErrors_()` (`validateForm_`, which checks "empty name" and "no base unit" only). On a failed save, `saveAndWait` shows `form_has_errors` («יש לתקן את השדות המסומנים») without naming a field, and `isSubmitted` is set only after a successful save, so purchase rows are not marked either. The validator also compares only trim + lower-case, while `normalizeProductName` (`src/app/core/utils/product-name.util.ts`) calls itself "the one rule" and also collapses inner spaces. Whether the validator itself fails to fire for the Human's case is **not verified** — the first sub-task reproduces it.
- Server: `POST /api/v1/data/products` (`server/routes/generic.js:470-497`) refuses only a repeated `_id` (Mongo error 11000 → 409 «Entity already exists»); there is no name check and no unique name index (`server/db.js` only indexes `userId`+`nameHebrew` for search). `server/routes/product-import.js` and `server/utils/price-list-import.js` do match by `normalizeProductName`; `server/services/sync-master.js` (~line 222) removes master clones whose name collides. So a second product with the same name is **accepted by the server today**; only the browser refuses.

## Goals & Success Criteria
- Primary: the purchase-unit row is readable on desktop and phone and shows only what is needed; the new-unit window is
  predictable with the keyboard and asks the right question; a duplicate product name is stopped with a clear message on the name field and the existing products are suggested while typing.
- Success:
  - [ ] [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/product-form/**/*.spec.ts' --include='src/app/pages/inventory/components/product-name-suggestions/**/*.spec.ts' --include='src/app/shared/unit-creator/**/*.spec.ts' --include='src/app/core/validators/**/*.spec.ts' --include='src/app/core/utils/product-form-errors.util.spec.ts'` passes, including new specs: duplicate name with extra inner spaces is refused; failed save names the invalid fields; unit window Tab does not save or open the name-key window; question text shows the base unit; quantity starts empty.
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `git diff --numstat origin/mvp -- src/app/pages/inventory/components/product-form/product-form.component.ts` → added lines ≤ removed lines (growth-frozen file).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Replay B2: open `/inventory/add`, press «הוסף יחידת רכש». The new row shows only «בחר יחידה» (and the trash button). Choose «ק"ג»: the quantity box and the compare-to unit box appear.
  - [ ] [human] Replay B1 desktop (window at least 1280px wide): in that row the quantity box shows the whole placeholder «כמות נטו»; box widths and gaps look even.
  - [ ] [human] Replay B1 phone (375px wide): the unit, quantity and compare-to boxes have the same width and start at the same edge; `=` and `:` have room and are not squeezed.
  - [ ] [human] Replay B3: in a purchase row choose «הוסף יחידה חדשה», type a name, press Tab — focus moves to the quantity box, nothing is saved and no extra window opens. The quantity box is empty. The question reads «כמה {base} יש ב{unit} אחת של {product}?» with the real base unit, unit name and product name. Fill the quantity and press the save button: the unit is added to the row.
  - [ ] [human] Replay B4: with a product «עגבניה» in the list, open `/inventory/add` and type «עגב». Existing similar products are listed under the box. Type «עגבניה» fully: the name box turns red and says «כבר קיים חומר גלם בשם זה». Press save: the page stays, the message at the top names the box (for example «יש לתקן: שם הפריט») and the name box is marked. Click the suggestion: the existing product opens for editing.

## Execution Mode
- Parallel: no — writes the product form files and the unit window, which plans 459 (dropdowns) and 460 (shared inputs / modal) also reach.
- Concurrent plans: 460 (number-input behaviour on the quantity boxes and the modal shell used by the unit window; shares `product-form.component.html` and `unit-creator.component.html`) and 459 (`custom-select`, used in the row). Run 461 after 459 and 460 are merged into `mvp`, or rebase onto them; where the two templates overlap, keep both sets of changes.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/461.md`.
- Depends on: none hard. Soft: 460 (owns the shared number-input behaviour, so this plan changes only the quantity's starting value) — run after 460.
- Growth-frozen file: `product-form.component.ts` must end with net lines ≤ 0 (`git diff --numstat origin/mvp -- <file>`). The design keeps new logic out of it: suggestions are a new component, the field-name message is a new pure helper, and the two repeated "form has errors" blocks in `saveAndWait` collapse into one call.
- B5 (a price per supplier) is not in this plan — see Out of Scope.
- If the Worker finds the duplicate validator already fires correctly, mark the "reproduce" part done with evidence and continue with the visible-error work.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-name-suggestions/**
src/app/shared/unit-creator/**
src/app/core/validators/item.validators.ts
src/app/core/validators/item.validators.spec.ts
src/app/core/utils/product-form-errors.util.ts
src/app/core/utils/product-form-errors.util.spec.ts
docs/mvp/runs/461.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no file in scope matches its Touches globs (`server/**`, `permission.service.ts`, `*-data.service.ts`); no ownership rule changes.
- INV-2: preserves — no tenancy, master-sync or scoping file is touched.
- INV-3: preserves — no cascade; the unit window still adds one unit through the existing registry call.
- INV-4: preserves — no schema change; the server is not changed (see Critical Questions for a later server guard).
- INV-5: preserves — units still live in `taxonomyTerms` through `UnitRegistryService`, which is not edited here.
- INV-6: preserves — no AI call is added or changed.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no — verified that the server accepts duplicate product names today; a server refusal is a Critical Question, not part of this plan.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find on `origin/mvp`: `duplicateNameValidator` (`src/app/core/validators/item.validators.ts`), `validateForm_` / `saveAndWait` / `addPurchaseOption` / `isSubmitted` in `product-form.component.ts`, the `.scaling-row` rules in `product-form.component.scss`, `onNameLeave` / `amountLabel_` / `newUnitValue_` in `unit-creator.component.ts`, the key `unit_amount_for_product` in `dictionary.json`. Print `ok` or `conflict: <what>` per symbol. Also check whether plans 459/460 already merged and changed the same templates; if so, build on them.

## User Stories
- As a chef, I want a new purchase-unit row to show only the unit until I pick one so that the form is not full of empty boxes.
- As a chef on my phone, I want the unit, quantity and compare-to boxes lined up so that I can read and type in them.
- As a chef, I want Tab in the new-unit window to just move me to the next box so that I do not save a unit by accident, and I want the question to name the unit I am measuring in.
- As a chef, I want to see existing products while I type a name, and a clear message if the name is taken, so that I do not create the same product twice.

## Functional Requirements

### Must Have (P0)
- [ ] A purchase-unit row with no unit shows only the unit box (and delete); after a unit is chosen — from the list or saved in the new-unit window — the quantity and compare-to boxes (and the special-price toggle) appear. Opening an existing product with rows shows them as today.
- [ ] Desktop: the quantity box is wide enough for its whole placeholder. Phone: unit, quantity and compare-to boxes share one width and one start edge; the `=` and `:` sit in their own narrow column.
- [ ] New-unit window: Tab never saves and never opens another window; only the save button, or Enter in the quantity box when the form is complete, saves. The quantity starts empty. The question names the base unit (D3 wording).
- [ ] Duplicate product name (same rule as the import page: trim, single spaces, lower-case) marks the name box red with the message «כבר קיים חומר גלם בשם זה» and blocks saving; editing a product never clashes with itself.
- [ ] While typing a name of 2+ letters, up to 5 existing products whose name contains the text are listed under the box; clicking one opens that product.
- [ ] A failed save names the invalid fields in the top message and marks invalid purchase rows.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- RTL; logical CSS properties only. The suggestion list is part of the page flow under the name box (no floating layer), so it cannot hide behind another panel.
- Add-option rule check (`docs/agent/standards-domain.md` → Add-option rule): the name box stays a plain text box, not a picker. Typing a new name IS the add, so there is no "הוסף" row (rules 1, 2, 7 do not apply). Rule F applies: list every product whose name contains the typed text, those starting with it first (`filterOptionsByLabel`). Rule X applies: an exact (normalised) match is listed and the duplicate error appears. Suggestion rows are real buttons reachable with Tab; Enter or click opens the product; Escape hides the list.
- The unit boxes in the row are still `app-custom-select` with the add-option rule already wired; this plan does not change them.
- New dictionary keys (append at the end of `dictionary.json`, Hebrew values): `unit_amount_in_base_for_product` «כמה {{base}} יש ב{{unit}} אחת של {{name}}?», `form_has_errors_fields` «יש לתקן: {{fields}}», `purchase_units_section` «יחידות רכש», `product_name_similar` «מוצרים דומים שכבר קיימים». Existing keys reused: `product_name`, `base_unit`, `duplicate_product_name_error`, `field_name_required`.
- The old key `unit_amount_for_product` is left in place (changing or removing an existing entry needs an escalation); it becomes unused.

## Atomic Sub-tasks
- [ ] A1: Reproduce the duplicate-name failure first — in the browser add a product named like an existing one and record what shows (field mark, message, top message); confirm the products list is filled on the add page — `docs/mvp/runs/461.md`
- [ ] A2: Hide quantity and compare-to boxes until a unit is chosen — wrap the quantity, compare-to and special-price blocks of each row in an `@if` on the row's unit value, and give the grid children class names so the layout no longer depends on child order (the `nth-child` rules in the 900px query change to those class names) — `product-form.component.html`, `product-form.component.scss`
- [ ] A3: Widen the quantity box on desktop — change the second grid column from `auto` to a range of about 7rem to 9rem and let the quantity input fill its column instead of the fixed 70px; check at 1280px that «כמות נטו» is not cut — `product-form.component.scss`
- [ ] A4: Line up the three row boxes on phone and tablet — give the unit, quantity and compare-to boxes the same two-column layout (a narrow fixed column for `=` / `:`, empty for the unit, then the box filling the rest) with a gap of at least `var(--space-3)`; check at 375px and 768px — `product-form.component.scss`, `product-form.component.html`
- [ ] A5: Make Tab in the new-unit window only move focus — remove the Tab handlers on the name and quantity boxes; Enter on the name box keeps today's behaviour; Enter on the quantity box saves when name, quantity and base unit are filled, otherwise moves to the base-unit box; add specs — `unit-creator.component.html`, `unit-creator.component.ts`, `unit-creator.component.spec.ts`
- [ ] A6: Make the new-unit question name the base unit — add the new dictionary key with a `{{base}}` placeholder, fill it from the chosen base unit (translated) and use it in product mode; update the spec text — `unit-creator.component.ts`, `unit-creator.component.spec.ts`, `public/assets/data/dictionary.json`
- [ ] A7: Start the new-unit quantity empty — make the quantity signal hold no value at first (null), reset it to null on close and in product mode, keep the save guard and the cost preview working with null; do not touch the shared number-input behaviour (plan 460) — `unit-creator.component.ts`, `unit-creator.component.html`, `unit-creator.component.spec.ts`
- [ ] A8: Make the duplicate-name check use the one name rule — compare with `normalizeProductName` (collapses inner spaces) in `duplicateNameValidator`, keep the self-exclusion for the product being edited; spec cases for extra spaces, other case and own name — `item.validators.ts`, `item.validators.spec.ts`
- [ ] A9: Show the duplicate error on the name box — in `validateForm_` copy the duplicate error into the field errors so the box turns red and its message is `duplicate_product_name_error`; show whichever field message applies instead of always `field_name_required`; delete the old unstyled `form-error` block — `product-form.component.ts`, `product-form.component.html`
- [ ] A10: Name the invalid fields in the failed-save message and mark purchase rows — add a small pure helper that lists the invalid fields' labels, add the `form_has_errors_fields` and `purchase_units_section` keys, replace the two repeated error blocks in `saveAndWait` with one call, set `isSubmitted` when a save fails so invalid rows and boxes are marked; spec — `product-form-errors.util.ts`, `product-form-errors.util.spec.ts`, `product-form.component.ts`, `product-form.component.html`, `public/assets/data/dictionary.json`
- [ ] A11: Suggest existing products while typing a name — new small component under the name box: takes the typed text and the current product id, lists up to 5 matches from the products list (contains, starting-with first, own product excluded, 2+ letters, Escape hides); click or Enter navigates to `/inventory/edit/:id` (the existing leave-page guard asks about unsaved changes); spec — `product-name-suggestions.component.ts`, `product-name-suggestions.component.html`, `product-name-suggestions.component.scss`, `product-name-suggestions.component.spec.ts`, `product-form.component.html`, `public/assets/data/dictionary.json`
- [ ] A12: Prove the frozen file did not grow, build, run the specs and write the run file with the validation cards — `docs/mvp/runs/461.md`

## Technical Considerations
- Dependencies: `filterOptionsByLabel` (`src/app/core/utils/option-filter.util.ts`), `normalizeProductName` (`src/app/core/utils/product-name.util.ts`), `KitchenStateService.products_()`, `pendingChangesGuard` (already on the product form routes in `app.routes.ts`, so navigating from a suggestion with unsaved typing asks first).
- New files: `src/app/pages/inventory/components/product-name-suggestions/product-name-suggestions.component.{ts,html,scss,spec.ts}`, `src/app/core/utils/product-form-errors.util.{ts,spec.ts}`. Standalone, OnPush, `inject()`, `input()` / `output()`, `@if` / `@for`, `@layer` in the new scss, no new `.c-*` classes outside `src/styles.scss`.
- Growth-frozen `product-form.component.ts`: net ≤ 0. Expected: remove about 8 lines (two repeated error blocks), add about 6 (field copy in `validateForm_`, helper call, `isSubmitted` on failure). The Worker checks `git diff --numstat` after every sub-task that edits it.
- The row hide in A2 must not break `hasRealChanges` or the row value subscriptions: the controls stay in the form group, only the template hides them.
- The unit control is set to `''` while the new-unit window is open (`pickNewUnit_`), so the row correctly collapses and re-expands when the unit is saved or the previous unit is restored on cancel.
- Hebrew canonical values: the new-unit window still goes through `UnitRegistryService.registerUnit` and the key-resolution flow at save time (unchanged).
- Project checks: log-query [auto]; stories from the chef's side; new keys named above; no server change.

## Out of Scope
- B5, a price per supplier (needs decision D5 — which price a recipe cost uses); it is a later plan and touches the source-building part of `saveAndWait`, so it must also stay net ≤ 0.
- The shared number-input behaviour (select-all on focus, empty instead of `0`) — plan 460 (A5).
- The shared modal shell and backdrop used by the unit window (A8) and floating-panel placement (A4) — plan 460.
- Dropdown click, stacking and Space-key bugs in `custom-select` — plan 459.
- A server-side refusal of duplicate product names (see Critical Questions).
- Changing the other forms' duplicate checks (`duplicateEntityNameValidator`, recipe-builder).
- Editing or removing the old dictionary key `unit_amount_for_product`.

## Critical Questions
1. **D2 — quantity required once a unit is chosen?** Recommended: **yes**. Without it the unit cannot be priced. This plan assumes yes (it is how the form already validates); the only change is that the box is hidden until a unit exists. Alternative: allow an empty quantity and ignore that row on save.
2. **D3 — wording of the new-unit question.** Recommended: the handoff proposal «כמה {{base}} יש ב{{unit}} אחת של {{name}}?» (for example «כמה גרם יש בצנצנת אחת של פטרוזיליה?»), where the base follows the base-unit box in the window. Alternative: keep «כמה שוקלת …» only when the base is a weight unit.
3. **Should the server also refuse a duplicate product name?** Recommended: **not in this plan** — add it later as its own server plan. Today only the browser refuses; a second browser tab or the AI / quick-add paths can still create a twin, and master sync removes stale same-name clones. A server guard must use the same rule as the import (`normalizeProductName`), apply per business (INV-1 and INV-2 file `server/routes/generic.js`) and decide what happens to existing duplicates and master clones. Alternative: yes now, answering 409 with a message key; that needs `server/routes/generic.js` and server tests added to this plan's scope.
4. **Enter in the new-unit quantity box saves when everything is filled?** Recommended: **yes** (matches "save only by the button or Enter"). Alternative: Enter only moves to the base-unit box and only the button saves.
5. **Special-price toggle hidden until a unit is chosen?** Recommended: **yes**, it prices a unit, so it has no meaning before one exists. Alternative: keep it visible in the empty row.
6. **Suggestion click opens the existing product** (in the same page, after the unsaved-changes prompt). Recommended: yes. Alternative: show suggestions as plain information with no click.
