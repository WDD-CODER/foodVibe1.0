# Plan 714 — Metadata manager: one panel, shared rows, empty states and loaders

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The metadata screen (`/dashboard?tab=metadata`) is a grid of manager cards, and each card is drawn its own way
(`night/style-audit.md` P2, P5, P6, P8): `.manager-card` is re-declared four times while other sections use
`.c-glass-panel`; the row lists use five techniques (`.list-stack > .list-item` twice, `ul.logistics-items`,
`ul.coef-list > li.coef-row`, `ol.model-list > li.model-row`); five page-local empty texts and two text "loading"
lines; a bare `<input>` styled by a local rule; legacy chip modifiers; and the most literal font sizes and weights of any
page after the recipe builder (27 / 16). This plan puts every card on `.c-glass-panel` with `.c-card-head`, every row
list on `.c-list`, every empty on `app-empty-state [compact]`, every wait on `app-loader`, and the stylesheets on
tokens. The page header is already provided by the dashboard host (`app-dashboard-header`), so none is added.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- Host: `src/app/pages/dashboard/dashboard.page.html` renders `app-dashboard-header` (an `app-page-header` with the tab
  title) above `app-metadata-manager` for `?tab=metadata`.
- `metadata-manager.page.component.html`: jump nav (`c-chip--tab` in `app-scroll-rail`, kept), `.admin-grid`, menu types
  `.list-stack > .list-item` (`:98-148`, `.scss:124-144`), `.empty-state` (`:146`); `.manager-card` (`.scss:86`, `:170`
  local `.empty-state`).
- `components/taxonomy-kind-manager`: `.manager-card` (`.scss:6`), bare `<input>` (`html:11`, `.input-group input`
  `.scss:55-90`), `.empty-state` (`html:77`, `.scss:95`); chip cloud `c-chip--tap` (kept — a chip editor, not a list).
- `components/user-management`: `.manager-card` (`.scss:6`), `.list-stack > .list-item` (`html:14-47`), loading and
  empty as `.empty-state` text (`html:10-12`, `.scss:168`), `c-chip teal` / `c-chip amber` (`html:25,28`), `.scss:109`
  restyles a `.c-*` class.
- `components/logistics-item-manager`: `ul.logistics-items > li` (`html:28-87`), `p.logistics-empty` (`html:89`).
- `components/coefficient-manager`: `ul.coef-list > li.coef-row` with an inline `c-input` (`html:9-53,87-120`).
- `components/ai-model-manager`: `.manager-card` (`.scss:6`), `ol.model-list > li.model-row` with `cdkDrag`
  (`html:16-70`), `.empty-state` loading/empty (`html:9,14`, `.scss:254`), literal shadows (`.scss`).
- `staff-stages-manager`, `ai-examples-share`, `station-manager`, `section-category-manager`,
  `preparation-category-manager`, `unit-edit-dialog` already use `.c-glass-panel` / `app-modal-shell`; they only get
  tokens.
- From 703: `.c-list`, `.c-list--plain`, `.c-card-head`, `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** every metadata card has the same surface and head, every list in it the same rows, every empty and
loading state the shared piece, and no stylesheet in the folder holds a literal value.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-714.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/metadata-manager/` returns `[]`; no template contains `manager-card`, `list-stack`, `list-item`, `coef-row`, `model-row`, `logistics-empty`, `class="empty-state`, `c-chip teal`, `c-chip amber`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts` (two menu types → two `.c-list-row`; none → compact `app-empty-state`) and, beside their components, `src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts` (while loading → `app-loader`; two users → two rows) and `src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.spec.ts` (dragging still reorders: the existing drop handler is called with the new order).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/dashboard?tab=metadata` on a laptop: every card has the same frame and title row; the users, logistics, coefficients and AI-model lists have the same row height and separators.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (`/dashboard?tab=metadata`, a menu type's remove; default `confirm-destructive-action`).
- [human] the list's page with no items · open the page · a message says the list is empty (`/dashboard?tab=metadata` → AI models card with no model; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts
src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.spec.ts
scripts/test/style-714.test.mjs
src/app/pages/dashboard/dashboard.page.spec.ts
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

- INV-6: preserves — the scope matches `src/app/**/*ai*` only by file or folder name (e.g. waitlist, platform-ai-shots, ai-model-manager, deposit-paid, dashboard); no AI call is added, moved or changed, and every model call still goes through `server/routes/ai.js`.
- INV-3: preserves — `src/app/pages/metadata-manager/**` is in its Touches; only templates and styles change, every rename and cascade still goes to the server in one request through the existing services; no client loop is added.
- INV-5: preserves — taxonomy terms are still read and written through the registry services; the chip editor keeps its logic.

## Reuse Check

- Card surfaces and heads — family: engine-classes — rung: 1 — why: `.c-glass-panel` + `.c-card-head` (703); the four `.manager-card` copies go.
- Menu types, users, logistics items, coefficients, AI models lists — family: list-page — rung: 1 — why: `.c-list.c-list--plain` rows; the AI model rows keep `cdkDrag` on the `li` with `display: grid` through a `.c-list` subgrid row (see Traps).
- Empty texts — family: empty-state — rung: 1 — why: `app-empty-state [compact]`.
- Loading texts — family: feedback — rung: 1 — why: `app-loader size="small"`.
- Taxonomy add input — family: form-field — rung: 1 — why: `.c-input` inside the existing `.c-input-wrapper`.
- Role chips — family: chip — rung: 1 — why: `c-chip c-chip--tag c-chip--sm c-chip--teal|--amber`.
- mm-card, mm-card-desc, mm-model-list, mm-model-row, mm-users-list, mm-logistics-list, mm-removed-list, mm-coef-list, mm-coef-error, mm-menu-list, menu-type-fields-cell, user-name, c-list-body-cell — family: engine-classes — rung: 1 — why: `.mm-card` and `.mm-card-desc` are padding and size only (one rule in `src/styles.scss`); the `mm-*` list classes only set `--list-cols`, a column span or the draggable subgrid row on the shared `.c-list` / `.c-list-body-cell`; `.c-list-body-cell` is only dimmed there.

## Defaults

- app-list-container — exception — why: the metadata lists are short lists inside cards; they use `.c-list` (703's in-panel form)
- empty-state-on-list — applies — how: `app-empty-state [compact]`
- loading-and-error-states — exception — why: this plan swaps the two text loaders for `app-loader`; error paths stay the existing toasts
- confirm-destructive-action — applies — how: existing remove / hide confirmations unchanged
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the settings cards of my kitchen lists to look the same, so that I find where to add a unit or a stage without reading each card.

## Functional Requirements

### Must Have (P0)
- [ ] Every `section.manager-card` → `section.c-glass-panel` with the shared inner padding `var(--space-4)` (a local
  `mm-card` layout class may hold padding and grid placement only) and its title row → `header.c-card-head`
  (`__title` `h2` with the existing key, actions in `__end`); the four `.manager-card` rules go.
- [ ] Menu types (page), users, logistics items, coefficients: `ul.c-list.c-list--plain[role=list]` with
  `li.c-list-row[role=listitem]` and `.c-list-body-cell` cells; `--list-cols` per list: menu types `minmax(0, 1fr)
  auto`; users `minmax(0, 1fr) auto auto` (name · role chip · remove); logistics `minmax(0, 1fr) auto auto`
  (question · scope chip · actions); coefficients `minmax(0, 1fr) 7rem auto` (name · input · actions). All handlers,
  inline inputs and edit modes stay.
- [ ] AI models: `ol.c-list.c-list--plain` with `cdkDropList`; each `li.c-list-row` keeps `cdkDrag` — because a
  `display: contents` element cannot be dragged, the AI model rows use a local class `mm-model-row` that sets
  `display: grid; grid-column: 1 / -1; grid-template-columns: subgrid` on the `li` (overriding `display: contents`
  needs an unlayered rule — write it unlayered under the component's host selector, with a comment).
- [ ] Empties (`.empty-state` ×4, `p.logistics-empty`) → `app-empty-state [compact]="true"` with their keys; text
  loading lines → `app-loader size="small"`.
- [ ] Taxonomy add input → `class="c-input"` (the `.input-group input` rules go); legacy chip modifiers → tones;
  the `.c-*` restyle in user-management goes.
- [ ] Every literal in the folder's stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 16 in rows, 18 in card heads. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Give every metadata card the shared panel and head, and the menu types the shared rows — src/app/pages/metadata-manager/metadata-manager.page.component.*
- [x] A2: Draw the users list as shared rows with a loader, small empty state and tone chips — src/app/pages/metadata-manager/components/user-management/*
- [x] A3: Draw the logistics items and coefficients as shared rows — src/app/pages/metadata-manager/components/logistics-item-manager/*, src/app/pages/metadata-manager/components/coefficient-manager/*
- [x] A4: Draw the AI models as shared rows that can still be dragged, with a loader and small empty state — src/app/pages/metadata-manager/components/ai-model-manager/*
- [x] A5: Fix the bare taxonomy input and move the remaining cards' stylesheets onto tokens — src/app/pages/metadata-manager/components/{taxonomy-kind-manager,staff-stages-manager,ai-examples-share,station-manager,section-category-manager,preparation-category-manager,unit-edit-dialog}/*
- [x] A6: Lock the folder on the shared pieces and tokens — scripts/test/style-714.test.mjs

## Technical Considerations
- The style test `scripts/test/style-714.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts`, `src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.spec.ts` if absent (beside their
  components), `scripts/test/style-714.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: `cdkDrag` needs a box — the subgrid row rule is the only `display` override of `.c-list-row` allowed, and
  only for draggable rows; it must be unlayered to beat the engine (component stylesheets here use `@layer`).

## Out of Scope
- A page header for the metadata tab (the dashboard host already renders one). The jump nav. The chip editors.

## Critical Questions
- none

## Execution Notes
- behaviour: draggable rows (AI models) use a subgrid row instead of `display: contents`; they look the same as the other rows.
- behaviour: no page header is added — `app-dashboard-header` above the tab is the page header.
- behaviour: menu-type add button moved from under the description into the card head's end slot — reverse: move it back under `.card-desc`.
- behaviour: menu-type rows keep the name above the five field chips (the fields cell spans both columns) so the card stays narrow — reverse: drop `.menu-type-fields-cell`.
- behaviour: the taxonomy card's default empty text (prefix + title + suffix) is composed in the component and passed to `app-empty-state` as its message — reverse: pass `emptyKey` always.
- seen: `lint:reuse` still prints `number-input-outside-number-box` for coefficient-manager html:27,111 — the rule is line-based; the inputs sit in an `appNumberBox` cell (exit 0).
- The dictionary key `ai_model_loading` is now unused (the loader uses its default label).
- Evidence: pnpm run build → exit 0; pnpm run lint → exit 0 (0 errors); pnpm run test:ci → exit 0, 3200 SUCCESS; pnpm run test:scripts → exit 0; lint:icons, lint:no-native-select, lint:reuse → exit 0.
