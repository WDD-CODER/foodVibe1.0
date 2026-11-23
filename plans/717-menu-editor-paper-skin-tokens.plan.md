# Plan 717 — Event-menu editor: paper skin on tokens, shared empty states, panels and table

Status: draft
Depends-on: 703, 713
Track: code
Snapshot: d06302a3

## Problem Statement
The event-menu editor (`/menu-intelligence/:id`) keeps a "paper" skin on purpose (registry `chip`), but that skin
holds the most colour literals in the app (`_paper-ui.scss`: 10 colour and 21 font-size literals) and its satellites
redraw what the engines provide: the stage bar uses a local `.stage-pill` and a client chip without its base class,
the notes log, logistics panel and the editor's sections re-declare the glass surface, three empty states are
page-local, the loading list is a raw `<table>`, and the dish row uses physical left/right (`night/style-audit.md`
P5, P8, P11, P12, P13). This plan keeps the paper skin's classes and moves their values onto tokens, fixes the
missing base class, and converges the satellites on `.c-glass-panel`, `app-empty-state`, `.c-table`, `.c-chip` and
`.c-btn-*`. Plan 713 moved the editor's popups first.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `menu-intelligence/_paper-ui.scss`: 10 colour literals, 21 font sizes, physical `:109,194,231,378`, radii (8);
  `_toolbar.scss:19,27` `.pill` with `rgba(255,255,255,.9)`; `_layout.scss`; `menu-intelligence.page.scss:15,34,41`
  `720px` / `1120px` widths.
- `components/event-stage-bar/event-stage-bar.component.html:8,32` `.stage-pill` / `--danger` (`.scss:35-100`);
  `:57,59` `class="c-chip--tag client-chip"` (no `c-chip`); `:62` `.client-row-empty`; `.stage-link`
  (`.scss:136`).
- `components/event-notes-log/event-notes-log.component.html:28` `.notes-empty`, `:43,51` `.note-btn`;
  `.scss:7-18` `.notes-log` surface.
- `components/event-logistics-panel/event-logistics-panel.component.scss:9-19` `.logistics` surface.
- `components/menu-dish-row/menu-dish-row.component.scss:211,265` physical; 6 font sizes.
- `components/pricing-meter/pricing-meter.component.html:121` `c-chip targets-toggle` (no variant);
  `.scss:86` restyles a `.c-*` class; 6 font sizes.
- `components/loading-list/loading-list.component.html:27` raw `<table class="loading-table">` (its many `loading-*`
  class names are the component's own name, not a loading state).
- From 703: `.c-table(--compact)`, `app-empty-state [compact]`, `.c-page`, token mapping, `styleFindings`.

## Goals & Success Criteria
**Primary:** the editor keeps its paper look with token values only, and its stage bar, notes, logistics, pricing
meter and loading list use the shared pieces.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-717.test.mjs`: `styleFindings` on `src/app/pages/menu-intelligence/{_paper-ui,_toolbar,_layout}.scss`, `menu-intelligence.page.{html,scss}` and every `.html`/`.scss` under `components/{event-stage-bar,event-notes-log,event-logistics-panel,menu-dish-row,pricing-meter, loading-list}/` returns `[]`; no template contains `stage-pill`, `notes-empty`, `client-row-empty`, `note-btn`, `class="c-chip--tag client-chip"`; `loading-list.component.html` has `class="c-table`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts` (the current stage chip has `c-chip` and `c-chip--tab` with `.active`; no client → compact `app-empty-state`) and `src/app/pages/menu-intelligence/components/event-notes-log/event-notes-log.component.spec.ts` (no notes → compact `app-empty-state`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] an event menu on a laptop: the paper menu looks the same as before; the stage row above it uses the same tab chips as the rest of the app; the notes and logistics boxes have the same frame as other panels.
- [human] an event → loading list → print preview: the table prints as before.
- [human] the list's page with no items · open the page · a message says the list is empty (an event with no notes: the notes log; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703 and 713 (same feature folder; 713 changes its popups first).
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/_toolbar.scss
src/app/pages/menu-intelligence/_layout.scss
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-intelligence/components/event-notes-log/**
src/app/pages/menu-intelligence/components/event-logistics-panel/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/components/pricing-meter/**
src/app/pages/menu-intelligence/components/loading-list/**
scripts/test/style-717.test.mjs
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
src/app/pages/menu-intelligence/components/event-notes-log/event-notes-log.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and styles of the editor; event costing (`event-plan` family), stage changes and logistics writes are unchanged.

## Reuse Check

- Paper skin (`event-chip*`, `counter-pill*`, toolbar `.pill`) — family: chip — rung: 1 — why: kept on purpose by the registry; values move to tokens.
- Stage pills — family: chip — rung: 1 — why: `c-chip c-chip--tab` (+ `.active`; the "lost" stage `c-chip--red`).
- Client chip — family: chip — rung: 1 — why: add the missing base class `c-chip`.
- Pricing-meter targets toggle — family: chip — rung: 1 — why: `c-chip c-chip--tap` with `aria-expanded`.
- Notes log, logistics panel — family: engine-classes — rung: 1 — why: `.c-glass-panel`.
- Note buttons, stage link — family: engine-classes — rung: 1 — why: `.c-icon-btn`, `.c-btn-ghost--sm`.
- Empties — family: empty-state — rung: 1 — why: `app-empty-state [compact]`.
- Loading list table — family: engine-classes — rung: 1 — why: `.c-table.c-table--compact`.
- none new.

## Defaults

- empty-state-on-list — applies — how: compact `app-empty-state` for no notes and no client
- confirm-destructive-action — applies — how: deleting a note keeps its existing confirmation
- loading-and-error-states — exception — why: no load path changes
- one-breakpoint-set — applies — how: `$break-*` names only; `720px` / `1120px` → `45rem` / `70rem`

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a caterer, I want the event screen's controls to look like the rest of the app while the printed menu keeps its paper look, so that I work fast and the client still gets a beautiful menu.

## Functional Requirements

### Must Have (P0)
- [ ] `_paper-ui.scss`, `_toolbar.scss`, `_layout.scss`, `menu-intelligence.page.scss`: every literal → token (703
  mapping; a paper tint without a token → `color-mix(in srgb, var(--token) N%, transparent)` with the same alpha);
  physical → logical; class names unchanged.
- [ ] Stage bar: `.stage-pill(--danger)` → `c-chip c-chip--tab` (`.active` for the current stage, `c-chip--red` for
  lost); the client chip gets `c-chip`; `.client-row-empty` → `app-empty-state [compact]="true"` with its key;
  `.stage-link` → `.c-btn-ghost--sm`.
- [ ] Notes log: `.notes-log` → `.c-glass-panel` (+ local padding only); `.notes-empty` → compact empty state;
  `.note-btn` → `.c-icon-btn` (16, same labels).
- [ ] Logistics panel: `.logistics` surface → `.c-glass-panel`.
- [ ] Menu dish row and pricing meter: literals → tokens, physical → logical; the pricing meter's `.c-*` restyle goes;
  `targets-toggle` → `c-chip c-chip--tap`.
- [ ] Loading list: `<table class="c-table c-table--compact">` (print rules stay in `@media print`).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 16 in chips and buttons. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the paper skin, toolbar and editor layout values onto tokens and logical properties without changing their look — src/app/pages/menu-intelligence/_paper-ui.scss, _toolbar.scss, _layout.scss, menu-intelligence.page.scss, menu-intelligence.page.html
- [ ] A2: Draw the stage bar with shared tab chips, fix the client chip's base class and use the small empty state — src/app/pages/menu-intelligence/components/event-stage-bar/**
- [ ] A3: Put the notes log and logistics panel on the shared panel with shared icon buttons and empty state — src/app/pages/menu-intelligence/components/event-notes-log/**, src/app/pages/menu-intelligence/components/event-logistics-panel/**
- [ ] A4: Move the dish row and pricing meter onto tokens and the shared tap chip — src/app/pages/menu-intelligence/components/menu-dish-row/**, src/app/pages/menu-intelligence/components/pricing-meter/**
- [ ] A5: Draw the loading list as the shared table — src/app/pages/menu-intelligence/components/loading-list/**
- [ ] A6: Lock the editor on the shared pieces and tokens — scripts/test/style-717.test.mjs

## Technical Considerations
- The style test `scripts/test/style-717.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703, 713.
- New files: `scripts/test/style-717.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the paper skin prints — keep every `@media print` block; `KEYBOARD-FOCUS-REPORT.md` in the folder is a report,
  not code — do not edit it.

## Out of Scope
- The popups (plan 713), `menu-export-sheet` (kept off the shell), replacing the paper skin with engine chips.

## Critical Questions
- none

## Execution Notes
- behaviour: the paper skin keeps its classes and look; only its values become tokens (small rounding differences are accepted).
- behaviour: the stage pills become the app's tab chips — the one visible change on the editor's top row.
