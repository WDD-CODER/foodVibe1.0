# Plan 496 — At most one empty dish search row per menu category

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), item 20, Dandan's words: "Menu Editor dish/prep
categories: several empty "Search dish or prep..." rows can be opened in one category. At most one empty row per
category; no new empty row while one is open and unfilled. Empty rows are never saved or printed."

As a chef, I want one empty dish search box per course at most, so that my menu does not fill up with blank lines I
cannot remove and that end up on the printed menu.

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- The empty row is a dish row whose `recipeId` is `''`: `menu-dish-row.component.html:48-69` shows the search box
  (`placeholder="menu_search_dish"` = «חפש מנה או הכנה...», `dictionary.json:616`) inside `.dish-search-wrap`. That
  branch has no delete button (the trash button at :45-47 exists only once a dish is picked), so a chef cannot remove
  extra empty rows.
- **Root cause:** `menu-intelligence.page.ts:529-546` `addItem(sectionIndex)` always pushes a new blank form group
  (`recipeId: ['', Validators.required]`, :533) and never looks for one that is already blank. It runs from two places:
  the «הוסף מנה» button (`menu-intelligence.page.html:232-239`, `(click)="addItem(sectionIndex)"`) and after every
  dish pick (`selectRecipe`, `page.ts:672`). So each click on «הוסף מנה» adds another empty row, even while one is
  open and unfilled.
- Rename uses the same blank state: `startEditDishName` (`page.ts:676-686`) sets `recipeId: ''` on a filled row and
  remembers it in `editingDishAt_` (`page.ts:155-159`); `clearDishSearch` (:697-706) restores it. A row being renamed
  is therefore NOT an empty row and must not count.
- Saving already drops empty rows: `save()` runs `pruneBlankMenuItems` (`page.ts:797`, `menu-form.util.ts:5-12`) and
  `buildEventFromForm` skips items with no `recipeId` (`page.ts:946`, `if (!item.recipeId) return []`), which also
  covers `saveAndWait` (`persist_`, :811-824) and every export / preview / supplier order (`getCurrentMenuForExport`,
  :977-980). Nothing more is needed for "never saved".
- Printing is only half covered: `printMenu()` (`page.ts:843-845`, from the export sheet «הדפסה») calls
  `window.print()` on the live page. The search box itself is already hidden in print (`src/styles.scss:1990-1994`,
  `.dish-search-wrap { display: none !important }`, commit `80f1c9ce`), so the «חפש מנה או הכנה...» text does not
  print. But the row around it still prints: `<app-menu-dish-row>` (`page.html:208`, host `display: contents`,
  `menu-dish-row.component.scss:1-3`) keeps its `.dish-name-cell` (`min-height: 2.25rem` + padding,
  `menu-dish-row.component.scss:13-19`), so every empty row prints as a blank line-high gap in the course. Neither the
  host nor the row carries `no-print`. (Reviewer correction: the first draft said the placeholder text prints; it does
  not — the visible defect is the blank gap.)
- `menu-intelligence.page.ts` is growth-frozen (`.claude/commands/design-port.md:250`, plan 477 run file
  `docs/mvp/runs/477.md:40`): its net line count must not grow.
- History: plan 452 (`f4462c08`) moved the dish search to `app-search-combobox`; plans 459/470 touched the row; none
  limited blank rows. `plan-name-similarity` found no similar plan.

## Goals & Success Criteria
- Primary: a course (category) never holds more than one empty dish search row from the chef's actions; an empty row
  is never saved and never printed.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/pages/menu-intelligence/menu-form.util.spec.ts` passes. New
    cases for `blankMenuItemIndex`: no blank row → `-1`; one blank row at index 1 → `1`; blank row at the skipped
    (renamed) index only → `-1`; blank rows at 0 and 2 with skip 0 → `2`; `pruneBlankMenuItems` still removes every
    blank row.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts --include=src/app/pages/menu-intelligence/services/menu-picker-search.service.spec.ts`
    passes (unchanged neighbours still green).
  - [ ] [auto] `git diff --numstat origin/mvp-qa-fixes -- src/app/pages/menu-intelligence/menu-intelligence.page.ts`
    → added ≤ removed (growth-frozen file).
  - [ ] [auto] `grep -c "class.no-print" src/app/pages/menu-intelligence/menu-intelligence.page.html` → at least `1`,
    and the match is on the `<app-menu-dish-row` element.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Replay of the bug, desktop 1440 px, owner: open `/menu-intelligence` (new menu). Click «לחץ לבחור
    קטגוריה» and pick any category. Click «הוסף מנה» three times. SEE ✓ exactly one row with «חפש מנה או הכנה...»
    under that category, and the cursor is in it. FAIL ✗ two or more empty search rows.
  - [ ] [human] Pick-then-add, desktop 1440 px, owner, same menu: type two letters of a dish in the empty row and pick
    it from the list. SEE ✓ the dish appears and ONE new empty search row opens under it. Now click «הוסף מנה». SEE ✓
    still one empty row (no second one). FAIL ✗ a second empty row appears.
  - [ ] [human] Rename still works, desktop 1440 px, owner, same menu with one picked dish: click the dish name, then
    click «הוסף מנה». SEE ✓ the dish name comes back (rename cancelled) and there is exactly one empty search row in the
    course. FAIL ✗ the dish disappears, or two empty rows show.
  - [ ] [human] Two courses keep their own empty row, phone 375 px, owner: on the same menu click «הוסף קורס», pick a
    second category, click its «הוסף מנה». SEE ✓ each course shows one empty search row of its own. FAIL ✗ the second
    course has no empty row, or the first course's row moved.
  - [ ] [human] Not printed, desktop 1440 px, owner: SETUP on the same menu, type «בדיקה 496» in the menu name box at
    the top («שם האירוע...»), and make sure the first course has one picked dish with its one empty row under it and
    the second course (card above) has a category title. DO open «צ׳קליסט והדפסות» → «הדפסה». SEE ✓ in the print
    preview the first course's dish name is followed straight by the second course's title, with no empty line-high
    gap between them, and no «חפש מנה או הכנה...» text anywhere. Close the preview, click «שמור תפריט»; the app moves
    to `/menu-library` by itself — open the card «בדיקה 496». SEE ✓ only the picked dish is listed in the first
    course, no empty search row. FAIL ✗ a blank gap where the empty row was, the placeholder text prints, or an empty
    row comes back after reopening. (Adds one test menu to the owner's account; deletes nothing.)
  - [ ] [auto] UI validator, print-media emulation on the same menu: every `app-menu-dish-row` whose row has no picked
    dish has computed `display: none`, and every row with a picked dish does not. Evidence: the computed values in the
    run file plus a print-emulated screenshot.

## Execution Mode
- Parallel: yes — writes only `menu-intelligence.page.ts`, `menu-intelligence.page.html` (one binding on
  `<app-menu-dish-row>`), `menu-form.util.ts` and a new spec. No other plan in 486–495 owns those files (487/495 own
  `menu-dish-row.component.*`; 494 owns the page `.scss`; 482, not built, lists `src/app/**/*.html` only for
  select-on-focus attributes on number boxes — a different line of `page.html`).
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Planner decision: «הוסף מנה» while an empty row is open **focuses that row** (no new row, no message, button stays
  enabled) — the friendliest reading of "no new empty row while one is open". A disabled button was rejected: the
  chef would not see where the open row is.
- Planner decision: print hiding goes on the `<app-menu-dish-row>` host in the page template
  (`[class.no-print]="!item.get('recipeId')?.value"`), not inside the dish row component, so this plan does not
  collide with plans 487/495 on `menu-dish-row.component.*`. The global unlayered `.no-print` print rule
  (`src/styles.scss:1893`, `display: none !important`) and the page's own `.no-print` rule (`_toolbar.scss:62-65`)
  both hit a host element in the page template; `display: none !important` beats the host's `:host { display:
  contents }` and removes the whole row box (the leftover `.dish-name-cell` gap) — no CSS change and no layer trap.
  The existing `.dish-search-wrap` print rule (`styles.scss:1990-1994`) stays as is.
- Reviewer note: an AI-built menu's unmatched placeholder rows (`menu-ai-flow.service.ts:92-105`, `recipeId: ''`)
  look exactly like an empty row and count as "the open empty row" for `blankMenuItemIndex`, so «הוסף מנה» in such a
  course focuses the first placeholder instead of adding one more. That is the intended reading of "no new empty row
  while one is open and unfilled"; P3 also keeps them off the printed menu. The placeholders themselves are not
  collapsed (see Out of Scope).
- `blankMenuItemIndex` reads "blank" exactly as `pruneBlankMenuItems` does (`!items.at(i).get('recipeId')?.value`),
  so the editor, save and print agree on which rows are empty.
- Why the rename skip is needed: the «הוסף מנה» button's `(click)` runs before the row's `appClickOutside`
  (`core/directives/click-out-side.ts`, `document:click`, bubble phase) restores the renamed dish, so inside `addItem`
  the renamed row still has `recipeId: ''` and must be skipped.
- Growth freeze: pay for the added lines in `addItem` by removing the private `dishKey` (`page.ts:565-567`), whose body
  is identical to `getDishMetaKey` (:569-571), and using `getDishMetaKey` at its call sites. Import
  `blankMenuItemIndex` on the existing `./menu-form.util` import line (`page.ts:21`).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-form.util.ts
src/app/pages/menu-intelligence/menu-form.util.spec.ts
docs/mvp/runs/496.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/496.md`, add it to
the scope block, continue (run mode: you work alone). Never edit `menu-dish-row.component.*` (owned by 487/495) — if
the host binding cannot hide the row in print, log it as `unsure` for the Human instead.

## Architecture Impact
- INV-1: preserves — no permission or ownership change; the client form only.
- INV-2: preserves — no tenancy path touched.
- INV-3: preserves — no cross-document write; the saved menu shape is unchanged (empty rows were already dropped).
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change (course categories are only read).
- INV-6: preserves — no AI call; `menu-ai-flow.service.ts` is not touched.

## Backend Impact
- None. No API, schema, auth, validation or migration change. The saved menu event is byte-for-byte the same as today
  (blank items were already skipped by `buildEventFromForm`). Security surface: none.

## Reuse Check
- `blankMenuItemIndex(items, skipIndex)` beside `pruneBlankMenuItems` in the existing `menu-form.util.ts` — family: helpers — rung: 3 — why: a menu-form-only rule (what counts as a blank menu item) that must sit next to its sibling `pruneBlankMenuItems` so both read "blank" the same way; no new file, no generic helper in `core/utils` fits a reactive menu FormArray.
- Print hiding of an empty row — family: engine-classes — rung: 1 — why: the existing global `.no-print` print rule (`src/styles.scss:1893`) does it as is, next to the existing `.dish-search-wrap` print rule (`styles.scss:1990-1994`); no new component, pipe, service or `.c-*` class.

## Step 0 — Reality Check
On `origin/mvp-qa-fixes`, find: `addItem(sectionIndex` in `menu-intelligence.page.ts`, `this.addItem(sectionIndex)` in
`selectRecipe`, `editingDishAt_`, `private dishKey(` and `getDishMetaKey(` (identical bodies), `pruneBlankMenuItems` in
`menu-form.util.ts`, `(click)="addItem(sectionIndex)"` and `<app-menu-dish-row` in `menu-intelligence.page.html`, and
`.no-print,` and `.dish-search-wrap {` inside `@media print` blocks in `src/styles.scss`. Print `ok` / `conflict: <what>` in the run file.

## Atomic Sub-tasks
- [ ] U1: Add one helper that finds the open empty dish row of a course, ignoring a row being renamed — `blankMenuItemIndex(items: FormArray, skipIndex = -1): number` returns the first index whose `recipeId` is empty and is not `skipIndex`, else `-1`; JSDoc names plan 496 — src/app/pages/menu-intelligence/menu-form.util.ts
- [ ] U2: Cover the helper and the existing blank-row pruning with unit tests — new spec with the five cases in Done-when, using `FormBuilder` groups like the page — src/app/pages/menu-intelligence/menu-form.util.spec.ts
- [ ] P1: Make «הוסף מנה» and the after-pick step focus the open empty row instead of adding a second one — in `addItem`, `const edit = this.editingDishAt_()`; `let i = blankMenuItemIndex(items, edit?.sectionIndex === sectionIndex ? edit.itemIndex : -1)`; push the new group only when `i < 0` (then `i = items.length - 1`); keep the `setQuery(..., '')` and `focusDishSearchInput(sectionIndex, i)` calls on `i` — src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [ ] P2: Keep the growth-frozen menu page from getting longer — remove `private dishKey` and call `getDishMetaKey` at its call sites; add the import on the existing line 21; confirm the numstat gate — src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [ ] P3: Remove the blank line an empty dish row leaves on the printed menu — on `<app-menu-dish-row>` add `[class.no-print]="!item.get('recipeId')?.value"` (the search box is already hidden in print by `styles.scss:1990-1994`; this removes the row box around it) — src/app/pages/menu-intelligence/menu-intelligence.page.html
- [ ] V1: Build, run the specs and the line-count gate, run the print-emulation `[auto]` check, replay the five human cards in a browser on this slot (desktop 1440 px and phone 375 px; for the print card use print-media emulation and a screenshot, or mark it unsure), write the run file — docs/mvp/runs/496.md

## Out of Scope
- AI-built menus: `menu-ai-flow.service.ts` `applyMatchedMenu` (:92-105) still creates one placeholder row per
  unmatched AI dish (each keeps its sell price). Those are AI results the chef resolves, not rows the chef opened;
  collapsing them would drop data and touch an AI file (INV-6 glob). Noted, not changed.
- A delete button on an empty row, the unsaved-changes check counting an empty row as a change, and the empty-course
  (category with no dishes) print layout.
- Recipe Builder prep categories (`/recipe-builder/<id>`): the report names the Menu Editor; the recipe builder has
  no «חפש מנה או הכנה...» row.
- Any change to the dish row component (`menu-dish-row.component.*`, owned by plans 487/495) or to passed checks 55,
  58 and 67 (existing menus look the same, edit and save a menu, change one dish by hand and go back) beyond the
  blank-row rule.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

Independent reviewer (plan reviewer, 2026-10-24) — gaps found and fixed in this file:

```
ARCHITECT + PM REVIEW
- Root cause for print was wrong: the search box text is already hidden in print (styles.scss:1990-1994); the real
  defect is the empty row's line-high gap (.dish-name-cell min-height) → Problem Statement + P3 corrected; fix unchanged.
- Print card could not be replayed: a new menu saves under a date name and save jumps to /menu-library → SETUP names
  the menu «בדיקה 496»; SEE ✓ now checks the blank gap, not only the placeholder text.
- No machine check for print → [auto] print-emulation check on app-menu-dish-row computed display added (V1 runs it).
- AI placeholder rows (recipeId '') would silently count as the open empty row → named in Execution Notes as intended.
- Rename-skip reason and "blank" definition shared with pruneBlankMenuItems → written in Execution Notes.
```

- Architect: every named file/symbol exists on `origin/mvp-qa-fixes` at `ea6af7b0` except the new
  `menu-form.util.spec.ts` and `blankMenuItemIndex` (marked new). Design follows the page's existing reactive-form
  pattern and its blank-row helper; no new pattern. Growth freeze honoured by a net-zero edit. Scope = exactly the
  files the steps write. Architecture Impact filled for INV-1..6, all `preserves`.
- PM: the problem is testable; every Done-when item is tagged; the five `[human]` cards replay the reported scenario
  (several «הוסף מנה» clicks), the after-pick path, rename, two courses on a phone, and print + save. Backend / auth /
  security / data impact named as none. Smallest version: one helper, one guard, one class binding. Plan checks
  (`docs/agent/plan-checks.md`): log-query item present; Reuse Check present; chef user story present; no hotspot
  edits; no new translation keys (all on-screen strings already exist: `menu_add_dish`, `menu_search_dish`,
  `menu_add_section`, `menu_section_placeholder`, `menu_print`, `menu_toolbar_open`, `menu_save`); no new persisted data.
