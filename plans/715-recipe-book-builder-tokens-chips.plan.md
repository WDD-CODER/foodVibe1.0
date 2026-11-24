# Plan 715 — Recipe book and recipe builder: empty state, panels, chips, buttons and tokens

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The recipe book is on the shared list page but shows "no match" as a local text box and uses local expander
buttons; the recipe builder — the screen chefs use most — has the most literal values of any page (23 font sizes, 22
weights, ≈120 spacing literals), re-declares the glass surface for its three sections, defines the same "add row"
button and the same warning badge twice, and carries a set of page-local badges and buttons that duplicate
`.c-chip` and `.c-btn-*` (`night/style-audit.md` P5, P8, P9, P11, P13). This plan converges both on the shared empty
state, `.c-glass-panel`, `.c-chip--tag` tones, `.c-btn-ghost(--sm)`, `.c-icon-btn` and tokens. The ingredient and
workflow grids are **not** moved to `.c-list-row`: their rows are `cdkDrag` items, and a `display: contents` row
cannot be dragged.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `recipe-book/components/recipe-book-list/recipe-book-list.component.html:175-186` `.no-results` holds
  `app-empty-state` for an empty book but plain text for no match (`.scss:63-85` restyles the surface); `.labels-btn`
  (`.scss:121`), `.allergen-btn` with `rgba(220,38,38,.2)` (`.scss:173-196`), `.ingredient-clear-btn` (`html:415`,
  `.scss:221`), `.approval-pending-badge` (`.scss:34`, 50% radius); `.cost-tooltip` / `.date-tooltip` duplicate each
  other with physical `left: 50%` (`.scss:247,282`).
- `recipe-builder/recipe-builder.page.scss:11-50` `.history-view-banner` + `.btn-back`; `:92-104` `.section-card`;
  `:143` `.section-toggle-btn`; `:216` `.add-row-btn` (also `recipe-workflow.component.scss:366`); `:354`
  `.logistics-add-btn` (a copy of `.c-btn-primary`).
- `recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html:64-105`
  `.incomplete-badge` / `.warning-badge` (defined twice, `.scss:337,370`) / `.unlinked-badge` / `.edit-badge`;
  `.clear-btn` (`.scss:404`), `.qty-btn` (`.scss:141`), `.grid-input` (`.scss:189`); `.scss:501` restyles a `.c-*`
  class.
- `recipe-builder/components/recipe-workflow/recipe-workflow.component.scss`: `.clear-btn` (`:210`), `.step-badge`
  (`:236`), `.workflow-textarea` (`:248`), `.timer-toggle-btn` (`:273`), `.counter-btn` (`:334`); icons sized by a
  `.wf-icon` class (`html:48+`).
- `recipe-builder/components/recipe-header/recipe-header.component.scss`: rgba at `:78,162,285`, `.recipe-name-input`
  (`:111`), `.yield-sync-badge` / `.add-custom-chip` (`:183,221`), `.type-toggle-btn` (`html:24`), `:313` physical.
- Kept on purpose (registry `chip`): `logistics-chip`, `scaling-chip`.
- From 703: `.c-glass-panel`, `.c-chip--tag` tones, `app-empty-state`, `styleFindings`.

## Goals & Success Criteria
**Primary:** the recipe book and recipe builder hold no literal value and no page-local copy of a chip, badge,
button or panel the engines already provide; drag-and-drop and steppers keep working.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-715.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/recipe-book/` and on `src/app/pages/recipe-builder/recipe-builder.page.{html,scss}` and `src/app/pages/recipe-builder/components/{recipe-header,recipe-ingredients-table,recipe-workflow,ingredient-search, preparation-search}/` returns `[]` (every text input and textarea has `c-input`); none contains `section-card`, `add-row-btn`, `warning-badge`, `incomplete-badge`, `unlinked-badge`, `edit-badge`, `step-badge`, `logistics-add-btn`, `no-results` (the recipe book's wrapper is renamed `rb-search-miss`, a layout-only class).
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts` (a search with no match renders `app-empty-state`) and the existing recipe-builder specs unchanged in behaviour (drag reorder, quantity step, timer toggle).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] a recipe in the builder on a tablet: the three sections have the same frame as the other app panels; the "missing price" / "not linked" marks look like the app's other small tags; dragging an ingredient row still moves it.
- [human] `/recipe-book`: search for "zzzz" — the same no-result picture as in the menu library appears.
- [human] the list's page with no items · open the page · a message says the list is empty (`/recipe-book` → search "zzzz"; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-book/**
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.scss
src/app/pages/recipe-builder/components/recipe-header/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/recipe-builder/components/ingredient-search/**
src/app/pages/recipe-builder/components/preparation-search/**
scripts/test/style-715.test.mjs
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and styles; recipe save, cost calculation and AI calls are untouched (`*ai*` files under `src/app/**` are not in scope, INV-6).

## Reuse Check

- No-match — family: empty-state — rung: 1 — why: `app-empty-state icon="search"`.
- Section frames — family: engine-classes — rung: 1 — why: `.c-glass-panel`; `.section-toggle-btn` → `.c-icon-btn`.
- Badges (incomplete, warning, unlinked, edit, step, yield-sync, approval pending) — family: chip — rung: 1 — why: `c-chip c-chip--tag c-chip--sm` + tone (amber warning, red incomplete, teal edit/step, glass sync); approval pending as `c-chip--tag c-chip--amber`.
- Buttons (add row ×2, logistics add, clear ×2, labels, allergens, ingredient clear, type toggle, timer toggle, history back) — family: engine-classes — rung: 1 — why: `.c-btn-ghost` / `.c-btn-ghost--sm` / `.c-btn-primary` / `.c-icon-btn`; the labels and allergen expanders → `c-chip c-chip--tap` (`aria-expanded`).
- Grid inputs, workflow textarea, recipe name input — family: form-field — rung: 1 — why: `.c-input` (outline variant `.c-input--outline` where the field sits inside a grid cell).
- Tooltips (cost, last-updated) — family: tooltip — rung: 1 — why: `[appTip]` (`TipDirective`, plan 699) replaces the two page-local hover bubbles and their service; the plan's "no shared tooltip piece exists" was stale.
- approval-pending, rb-search-miss, rb-section, rb-section-head, rb-section-body, rb-pulse, rb-pulse--strong, rb-reveal, rb-mini-btn, rb-step-btn, rb-step-num, rb-step-text, rb-timer-toggle, rb-add-chip, yield-sync, c-chip--tap, c-chip--toggle, c-icon-btn — family: engine-classes — rung: 1 — why: the `rb-*` classes, `approval-pending` and `yield-sync` only set layout, size, placement or an attention pulse on a shared `.c-chip`, `.c-icon-btn`, `.c-input`, `.c-glass-panel` or `.c-btn-*`; `.c-chip--tap`, `.c-chip--toggle` and `.c-icon-btn` are used as shared and only positioned by a local rule.
- none new shared.

## Adopt Check
- Tooltips — verdict: skip — why: one page-local CSS rule merging two identical hover hints; no package is warranted

## Defaults

- empty-state-on-list — applies — how: `app-empty-state` for no match
- app-list-container — exception — why: the ingredient and workflow grids are editable drag-and-drop rows (`cdkDrag`), which cannot be `display: contents` rows; the recipe book list itself is already on `app-list-shell`
- unsaved-changes-on-leave — applies — how: the builder's guard is untouched
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef writing a recipe, I want its warnings and buttons to look like the rest of the app, so that I spot a missing price the same way everywhere.

## Functional Requirements

### Must Have (P0)
- [ ] Recipe book: the no-match text → `app-empty-state icon="search"` with its existing key; the `.no-results`
  surface rules go; local buttons and badges → engines as in the Reuse Check; the two tooltips → one `.rb-tooltip`
  with logical properties.
- [ ] Recipe builder page: `.section-card` → `.c-glass-panel` (local `rb-section` keeps padding and gap only);
  `.section-toggle-btn` → `.c-icon-btn`; `.add-row-btn` → `.c-btn-ghost`; `.logistics-add-btn` → `.c-btn-primary`;
  `.history-view-banner` → tokens with `.btn-back` → `.c-btn-ghost--sm`.
- [ ] Ingredients table: badges → chips; `.warning-badge` defined once; `.clear-btn`, `.qty-btn` → `.c-icon-btn`
  (handlers and `appStepHold` unchanged); `.grid-input` → `.c-input.c-input--outline`; the `.c-*` restyle at `:501` goes.
- [ ] Workflow: `.step-badge` → chip; `.workflow-textarea` → `.c-input`; `.timer-toggle-btn` → `c-chip c-chip--toggle`
  (same state); `.counter-btn` → `.c-icon-btn`; icons sized by `[size]` (14 / 16), the `.wf-icon` sizing rule goes;
  the second `.add-row-btn` rule goes.
- [ ] Header: rgba → tokens / `color-mix`; `.recipe-name-input` → `.c-input`; `.yield-sync-badge` → chip;
  `.add-custom-chip` → `c-chip c-chip--tap`; `.type-toggle-btn` → `c-chip c-chip--toggle`; physical → logical.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 14 meta, 16 buttons and chips, 18 section heads. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show the recipe book's no-match case as the shared empty state and its buttons and badges as shared ones — src/app/pages/recipe-book/**
- [x] A2: Draw the builder's sections as shared panels with shared buttons — src/app/pages/recipe-builder/recipe-builder.page.html, .scss
- [x] A3: Turn the ingredient table's badges, buttons and inputs into shared chips, icon buttons and inputs without touching drag or steppers — src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [x] A4: Do the same for the workflow steps and the recipe header — src/app/pages/recipe-builder/components/recipe-workflow/**, src/app/pages/recipe-builder/components/recipe-header/**
- [x] A5: Move the two search pickers' stylesheets onto tokens — src/app/pages/recipe-builder/components/ingredient-search/**, src/app/pages/recipe-builder/components/preparation-search/**
- [x] A6: Lock both pages on the shared pieces and tokens — scripts/test/style-715.test.mjs

## Technical Considerations
- The style test `scripts/test/style-715.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-715.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: keep `cdkDrag` / `cdkDropList` on the same elements; `.c-icon-btn` must keep `appStepHold`'s pointer handlers
  (the directive sits on the button, the class only changes look).

## Out of Scope
- `paste-ingredients-dialog` (plan 713); swapping steppers for `app-counter`; the scaling chip and logistics chip skins;
  cook view (plan 716).

## Critical Questions
- none

## Execution Notes
- behaviour: ingredient and workflow grids stay grids (drag rows), restyled with tokens and shared badges only.
- behaviour: the quantity and counter buttons keep their hold-to-repeat behaviour; only their look becomes `.c-icon-btn`.
- tooltips: the cost and last-updated hover bubbles now use the shared `[appTip]` (plan 699) instead of one page-local `.rb-tooltip`; the plan's "no shared tooltip piece exists" was stale, and `RecipeListTooltipsService` (only used by this list) is deleted. Reverse: restore the service and two page-local bubbles.
- section frame: the three builder sections lose the 4px primary start-border accent of the old `.section-card` and use the plain `.c-glass-panel` frame (Done-when: same frame as the other app panels).
- history banner keeps the class `history-view-banner` (a global print rule hides it); section toggles and add-row buttons carry `no-print` so print still hides them.
- evidence: pnpm run build → exit 0; pnpm run lint → exit 0 (0 errors); pnpm run test:ci → exit 0, 3201 SUCCESS; pnpm run test:scripts → exit 0, fail 0; node --test scripts/test/style-715.test.mjs → pass 2, fail 0; lint:icons, lint:no-native-select, lint:reuse → exit 0; kit-checks → ok (6 checks); kit-manifest-check → ok.
- seen: e2e/ui/603-5.spec.ts:9 and :11 query `.section-card`, which no longer exists (now `c-glass-panel rb-section`); outside this plan's scope.
- seen: src/styles.scss:1947-1948 print rule names `.section-card-header button` and `.add-row-btn`, now unused; outside this plan's scope.
