# Plan 459 — Make dropdown lists click reliably, appear on top and let Space type

Status: active
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Three dropdown bugs found while the Human validated branch `mvp` (handoff A1–A3, `docs/mvp/review-handoff-2026-10-21.md`):
1. **A1 — a mouse click on an option often does nothing.** Verified in code: `custom-select.component.html` selects on `(click)` (line 90, and 109 for the add option) while the trigger's `(blur)` calls `onTriggerBlur()` (`custom-select.component.ts:287-293`), which closes the list 120 ms after focus leaves. Pressing an option button moves focus off the trigger (the button is focusable), so a press held longer than 120 ms removes the list before the mouse is released and no click fires. `custom-multi-select` has the same shape (`onTriggerBlur` / `onSearchInputBlur_`, `custom-multi-select.component.ts:249-268`; options select on `(click)`, html lines 116 and 134). The other pickers (`chip-search-dropdown.component.html:49,62`, `ingredient-search.component.html:36,58`, menu editor lists) already stop this with `(mousedown)="$event.preventDefault()"`; the two select components are the ones missing it.
2. **A2 — an open list is painted behind the next container.** Verified in code: `.custom-select-wrap.open` has `z-index: 9999` (`custom-select.component.scss:10-12`), but that only orders it inside its own stacking context. The page panels use `.c-glass-panel` (`src/styles.scss:459-466`), and `backdrop-filter` makes every panel its own stacking context, so the panel that holds the supplier select (`.import-paste`, `product-import.component.html:16`) is painted as one layer and the later `.import-preview` panel (html line 70, also `.c-glass-panel`) paints over its dropdown. Modals have the same trap: `.c-modal-card` also sets `backdrop-filter` (`styles.scss:658-670`).
3. **A3 — Space picks the first suggestion in the menu editor's dish search.** Verified in code: `onDishSearchKeydown` passes `selectOnSpace: true` (`menu-intelligence.page.ts:839`) to `KeyedPickerSearch.handleKeydown` (`keyed-picker-search.util.ts:61`). No other type-to-filter picker sets it for its text box: `custom-select` typeToFilter, `ingredient-search`, `chip-search-dropdown`, the event-type and section pickers do not, and `custom-multi-select`'s search box already types Space (`onSearchKeydown`, comment and spec "Space in the search box does not select"). The one `selectOnSpace: true` left in `custom-multi-select` (line 346) is the no-search-box trigger handler, where Space acting like Enter is correct.

Nothing here was reproduced in a browser; the causes are from reading code.

## Goals & Success Criteria
- Primary: every option of every select dropdown can be chosen with a normal mouse press (short or long); an open list sits above all page panels; Space types a space in the dish search.
- Success:
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `npx ng test --watch=false --include='src/app/shared/custom-select/**' --include='src/app/shared/custom-multi-select/**' --include='src/app/core/utils/keyed-picker-search.util.spec.ts'` passes, including the new specs: pressing the mouse on an option is default-prevented (focus stays on the trigger), a long press (`tick(500)` after the mousedown, no blur) leaves the list open and the later click selects, and Space in a type-to-filter box types and never selects.
  - [x] [auto] `git diff --numstat origin/mvp -- src/app/pages/menu-intelligence/menu-intelligence.page.ts` shows net added lines ≤ 0 (growth-frozen file).
  - [ ] [human] Open the inventory import page (`/inventory/import`), click the supplier box under the paste box with some text pasted or a preview shown below → the whole supplier list shows on top of the preview panel, not cut off behind it.
  - [ ] [human] In any form with a select (for example product form «ספק»), press an option with the mouse and hold it for about a second before releasing → the option is chosen. Repeat with a quick click.
  - [ ] [human] In the menu editor, click a dish name field, type «חזה עוף» with a space → the space appears and no dish is picked; press Enter or click a suggestion → it is picked.

## Execution Mode
- Parallel: yes with plans that do not touch `src/app/shared/custom-select/**`, `src/app/shared/custom-multi-select/**` or `src/styles.scss` in the same hunks; `src/styles.scss` is append-only so a parallel append merges cleanly.
- Concurrent plans: 460 (shared floating panels) touches `menu-library-list` and shared badges only; 464 (import page) edits `product-import.component.*` — this plan does not edit that folder.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed unattended per `docs/mvp/run-mode.md`; [human] items become validation cards in `docs/mvp/runs/459.md`.
- Depends on: none from this batch (459 goes first; plans 461, 464, 467 use these dropdowns).
- Written by the Planner from handoff A1–A3. Main has unrelated plans 450–458 (popup shell, search box, chip engine); they are not on `mvp` and this plan does not depend on them.
- `menu-intelligence.page.ts` is growth-frozen (`_shared/tech-stack.md`): the only edit is deleting one line, net ≤ 0.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/custom-select/**
src/app/shared/custom-multi-select/**
src/app/core/utils/keyed-picker-search.util.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html
docs/mvp/runs/459.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — presentation only; no data, permission, schema, taxonomy or AI path is touched (scope globs reach none of INV-1 to INV-6 `Touches`).

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `onTriggerBlur` and `onOptionClick` in `custom-select.component.ts`; `onTriggerBlur`, `onSearchInputBlur_` in `custom-multi-select.component.ts`; `selectOnSpace: true` in `menu-intelligence.page.ts` (`onDishSearchKeydown`); `.c-glass-panel` and `.c-modal-card` in `src/styles.scss`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want a click on a dropdown option to always select it, even if I press slowly, so that I never have to click twice.
- As a chef, I want an open dropdown list to appear above everything else on the page so that I can read and pick every option.
- As a chef building a menu, I want Space to type a space in the dish search so that I can write a dish name with several words.

## Functional Requirements

### Must Have (P0)
- [ ] Pressing the mouse on an option (or the add-new option) in `app-custom-select` and `app-custom-multi-select` keeps focus where it is, so the 120 ms blur-close never fires mid-click; keyboard behaviour (arrows, Enter, Tab, Escape) is unchanged.
- [ ] An open dropdown list is not hidden behind a later `.c-glass-panel` or inside a `.c-modal-card`.
- [ ] Space in the menu editor's dish search types a space; Enter and click still select.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- No visual change except that lists are no longer cut off. Add-option rule (`docs/agent/standards-domain.md` → Add-option rule) stays intact, keyboard included: no change to the add row, its label or its order; the new specs re-assert that the add option still opens by Enter and by click.
- No new dictionary keys.

## Atomic Sub-tasks
- [x] A1a: Make clicking a select option work every time — press on an option no longer pulls focus away, so the list stays open until the click lands — add `(mousedown)="$event.preventDefault()"` to the option button (html line ~90) and to the add-new option button (line ~109) in the single-select; leave `onTriggerBlur` as is for Tab-away — `src/app/shared/custom-select/custom-select.component.html`
- [x] A1b: Do the same for the multi-select so picking several items by mouse is reliable — same `(mousedown)` prevent on the option button (line ~116) and the add-new button (line ~134); the search box inside the list keeps normal mouse behaviour (do not put the prevent on the wrapper) — `src/app/shared/custom-multi-select/custom-multi-select.component.html`
- [x] A1c: Prove the slow click in a test — new specs: mousedown on `.custom-select-option` is `defaultPrevented`; in a `fakeAsync` test open the list, mousedown, `tick(500)` without a blur, list still open, then click selects and emits `valueChange`; the same for the add option (still emits the typed name then the sentinel) and for `custom-multi-select` (option click adds the value after `tick(500)`) — `src/app/shared/custom-select/custom-select.component.spec.ts`, `src/app/shared/custom-multi-select/custom-multi-select.component.spec.ts`
- [x] A2a: Find every container that traps an open list — in the run file list each `.c-glass-panel`/`.c-modal-card` (and page-local class with `backdrop-filter`, 40 component scss files have it) that holds a `custom-select`, `custom-multi-select` or `app-scrollable-dropdown`, and the sibling after it that paints over; record file:line — `docs/mvp/runs/459.md`
- [x] A2b: Lift a panel above its neighbours while a list is open inside it — append to the hotspot a rule `.c-glass-panel:has(.c-dropdown), .c-modal-card:has(.c-dropdown) { position: relative; z-index: 20 }` with a comment naming the stacking-context cause (the `.c-dropdown` node exists in the DOM only while a list is open; the app header is z-index 100, so 20 stays below it); if the audit in A2a finds another engine class with the same trap, add it to the same selector list; page-local containers outside the scope are reported in the run file, not edited — `src/styles.scss`
- [x] A3a: Make Space type a space in the dish search — delete the `selectOnSpace: true,` line in `onDishSearchKeydown` and update its doc comment to "Enter picks"; do not touch the other `selectOnSpace` user, the trigger-key handler of the multi-select, which is correct — moved by refactor 452 to `menu-dish-row.component.html` (see run file)
- [x] A3b: Lock the Space rule in tests — add specs: in `custom-select` with `typeToFilter` pressing Space in the input is not default-prevented and picks nothing; in `keyed-picker-search.util.spec.ts` keep "Space selects only when selectOnSpace is set" and add that a typed-in picker without the option never calls `onSelect` for Space — `src/app/shared/custom-select/custom-select.component.spec.ts`, `src/app/core/utils/keyed-picker-search.util.spec.ts`
- [x] A9: Build, run the specs, write the run file with the validation cards — `npx ng build`, the `ng test` command from Goals, `git diff --numstat` for the frozen page, then the cards (supplier list on import page, slow click, Space in dish search) — `docs/mvp/runs/459.md`

## Technical Considerations
- Dependencies: none new. The `(mousedown)` + `preventDefault` pattern already exists in `chip-search-dropdown.component.html` and `ingredient-search.component.html`; reuse it, do not invent a new mechanism.
- Why not "select on mousedown": a click selects on mouseup, which allows dragging away to cancel and keeps touch scrolling inside the list working; preventing the focus change fixes the root cause (the blur) instead.
- Considered and rejected for this plan: moving every list into the browser top layer (`popover="manual"`, as `nutrition-badge` does). It fixes clipping by `overflow` too, but needs measured placement code for each list; the `:has()` rule is a few lines. Revisit if the audit in A2a finds lists clipped by `overflow` (for example the preview table wrapper `.import-table-wrap { overflow-x: auto }`, `product-import.component.scss:83-86`, which would clip the per-row selects in the preview — that page is plan 464's, report it there).
- Test setup exists: `custom-select.component.spec.ts` and `custom-multi-select.component.spec.ts` already build the components with `TestBed`; add `fakeAsync`/`tick` imports. `menu-intelligence.page.ts` has no component spec, so the A3 behaviour on that page is a [human] card plus the util spec.
- Frozen file: `menu-intelligence.page.ts` ends with one line less.
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys; `@layer` rules unchanged (the new rule is in `src/styles.scss`, where engines live).

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- A second positioning mechanism for lists (top layer); page-local `overflow` clipping such as the import preview table (plan 464).
- Changing the 120 ms Tab-away close, the add-option rule, or any dropdown's keyboard map.
- Any other `selectOnSpace` user; the popover/modal placement helper (plan 460).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
None.
