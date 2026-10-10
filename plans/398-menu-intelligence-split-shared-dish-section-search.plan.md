# Plan 398 — Menu intelligence split: shared dish and section search helper

Status: active
Track: code — here (not design)
Snapshot: da1d7f666cefa259d0233d6c5522042073ab8a3f

## Problem Statement
`src/app/pages/menu-intelligence/menu-intelligence.page.ts` is 1398 lines (4 edits since
2026-09-01). Follow-up to closed plan 318 (refactor-candidate backlog).

The seam is the search/keyboard state of two pickers (~L729–1100):
- **Dish search** per section/item: `getDishSearchKey`, `get/setDishSearchQuery`,
  `onDishSearchQueryChange`, `getDishSearchHighlightKey/HighlightedIndex`, `getFilteredRecipes`,
  `onDishSearchKeydown`, `clearDishSearch`, `focusDishSearchInput`.
- **Section-category search** per section: `open/closeSectionSearch`,
  `getSectionCategoryHighlightedIndex/OptionCount`, `onSectionSearchKeydown`,
  `get/setSectionSearchQuery`, `onSectionSearchQueryChange`, `getFilteredSectionCategories`.

Both keep a keyed query signal, a highlighted index, a keydown handler (arrows / Enter / Escape)
and a filter, written twice. They can become one shared keyed-search helper in a
component-scoped service, with each picker supplying its own options and select action.

Proven pattern: the cook-view split (2026-09-28, `chore/cook-view-service-split`) moved
self-contained flows into component-scoped services (`@Injectable()` + page `providers`) and left
code tied to the shared signals in place. This page already does this for `MenuAiFlowService`.

## Goals & Success Criteria
- Primary: one keyed search/keyboard helper serves both pickers, in
  `src/app/pages/menu-intelligence/services/`; the page delegates to it. Refactor only — no
  behavior, look or text change.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes (existing specs).
  - [auto] `wc -l src/app/pages/menu-intelligence/menu-intelligence.page.ts` is lower than 1398 (report the number).
  - [human] Dish search: type in a section's dish row, arrow keys move the highlight, Enter picks, Escape and click-outside close; picking replaces when editing a dish name; works in two sections at once without cross-talk.
  - [human] Section category: open the search, filter, arrow + Enter picks, "add new category" from the search and from the modal both work.
  - [human] Save a menu, reopen it — sections and dishes are as saved.

## Execution Mode
- Parallel: yes — disjoint folders from plans 397 and 399
- Concurrent plans: 397, 399
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/services/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the existing `*-ai-flow.service.ts` in `services/` is not touched; no AI call is added or moved.
- INV-none: preserves — client-side refactor inside one page folder; no write routes, schemas, taxonomy storage or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a developer, I want one search/keyboard helper for the menu pickers, so a keyboard fix
  lands once instead of twice.

## Functional Requirements

### Must Have (P0)
- [x] A component-scoped service (e.g. `MenuPickerSearchService`, `@Injectable()`, provided on
      the page) holding keyed query + highlighted-index signals and a generic keydown handler
      (ArrowUp/ArrowDown/Enter/Escape) parameterised by option count and select/close callbacks.
- [x] Dish search and section-category search both use it; their own filter (recipes vs
      categories) and select action stay specific.
- [x] Template bindings updated; no visible change. `KEYBOARD-FOCUS-REPORT.md` behavior holds.
- [x] Code style per hard rules: `inject()`, signals with trailing `_` for private state, no
      `any`, single quotes, no semicolons. Class structure per
      `.claude/skills/angularComponentStructure/SKILL.md`.

### Should Have (P1)
- [x] Spec for the helper service (highlight wraps/clamps, Enter selects, Escape clears, keys don't cross between sections).
- [x] Note in session-state whether the event-type dropdown (~L462–615, same pattern) and the export block (~L1320–1398, like recipe builder's) are worth a follow-up — report only, don't move them.

### Nice to Have (P2)
- none

## UI/UX Notes
- No UI change, no new dictionary keys.

## Atomic Sub-tasks
- [x] A1: Confirm the seam against the current file (line numbers are from 2026-10-10); list exact differences between the two pickers' keyboard logic before unifying
- [x] A2: Create `src/app/pages/menu-intelligence/services/menu-picker-search.service.ts` (+ spec, P1)
- [x] A3: Move dish search onto it; wire `menu-intelligence.page.html`
- [x] A4: Move section-category search onto it; wire template
- [x] A5: `ng build` + `ng test` green, report new line count and the P1 follow-up note; hand the Human the click list from Success
- [x] A6 (Human review fallout, 2026-10-10): renaming a dish — erasing all the text keeps the row empty for a fresh name instead of snapping back to the old dish (Escape / click-outside still restore it)
- [x] A7 (Human review fallout, 2026-10-10): section category search matches the Hebrew labels; one "add" option — `הוסף "<typed>"` while typing a new name, else `הוסף קטגוריה חדשה` (modal); the section gets the stored category key, and nothing if the add is cancelled
- [x] A8 (/ship review fallout): Tab out of a dish rename without picking restores the old dish (same as click-outside), so an erased name can't silently drop the dish on save

## Technical Considerations
- Dependencies: the menu `FormArray` sections/items (stays in the page), recipe list, section
  category registry, `MenuAiFlowService` (unchanged).
- If A1 finds a real behavioral difference between the two pickers' keyboard handling, keep it
  as an option on the helper — do not "fix" it here.
- New files: the service (+ spec).
- Model changes: none.

## Out of Scope
- Event-type dropdown, export block, guest stepper, date input.
- Any behavior, style or text change.

## Critical Questions
- none
