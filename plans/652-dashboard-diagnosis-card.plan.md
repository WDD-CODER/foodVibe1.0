# Plan 652 — The dashboard shows a diagnosis card for a business with the consultant's module

Status: draft
Depends-on: 634, 646
Snapshot: 6d151456

## Problem Statement
On 2026-11-19 the Planner told Dandan the diagnosis would get "its own entry in the main menu and on the dashboard".
Plan 646 added only the main-menu pill (`src/app/core/components/header/header.component.ts:36`, `DIAGNOSIS_LINK`).
Dandan, 2026-11-20, as the guest admin and as a regular user on a desktop, looked for it on the dashboard and found
nothing. The dashboard's cards live in
`src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html` (e.g. `app-price-rises-card`,
line 13).

## Goals & Success Criteria
**Primary:** with `consultant_diag` on (the home module while acting), the dashboard shows a diagnosis card with the
number of open diagnoses, the three newest and a button to start a new one.

- [auto] `pnpm run test:ci` passes, including a spec for the new
  `src/app/pages/dashboard/components/diagnosis-card/diagnosis-card.component.spec.ts`: (a) hidden and not loaded
  without `consultant_diag`; (b) shown with it (and while acting, with the home module); (c) lists the three newest
  diagnoses with their name and date, each opening `/diagnosis/<id>`; (d) «יצירת אבחון» opens `/diagnosis` with the
  create form; (e) no diagnosis → the empty text `diag_card_empty` and the create button; (f) a failed load hides the
  card.
- [auto] The same command:
  `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts` renders the card only with the module.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan opens `/dashboard` with «אבחון יועץ» on: the diagnosis card is there, its newest diagnosis opens, and
  «יצירת אבחון» starts a new one; with the module off the card is gone.

## Execution Mode
- Parallel: no — it appends to `public/assets/data/dictionary.json`; runs after 651.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/dashboard/components/diagnosis-card/**
src/app/pages/dashboard/components/dashboard-overview/**
src/app/pages/diagnosis/services/**
src/app/core/services/diagnosis.service.ts
src/app/core/services/diagnosis.service.spec.ts
public/assets/data/dictionary.json
src/app/app.config.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — screen only; the card reads diagnoses through the existing route the diagnosis list uses.

## Reuse Check

- the diagnosis card — family: engine-classes — rung: 1 — why: the dashboard's existing card classes, as
  `price-rises-card`.
- the card's module gate — family: module-gate — rung: 1 — why: the same rule as the header's `showDiagnosis_`.
- the empty text — family: empty-state — rung: 1 — why: `app-empty-state` with a new key.

## Defaults

- hints-in-tooltips — applies — how: the card's button explanation is a `title`; no hint text on the card.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a consultant, I want my diagnoses on the dashboard, so that I start my day from them.

## Functional Requirements

### Must Have (P0)
- [ ] `app-diagnosis-card` on the dashboard overview: title «אבחונים», the count of open diagnoses, the three newest
  (name, date) linking to `/diagnosis/<id>`, «יצירת אבחון», and «לכל האבחונים» to `/diagnosis`.
- [ ] Shown with `consultant_diag` (home modules while acting), loaded only then.
- [ ] Dictionary (append-only): `diag_card_title` — "אבחונים", `diag_card_open_count` — "{count} פתוחים",
  `diag_card_empty` — "עוד אין אבחונים", `diag_card_all` — "לכל האבחונים".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Show the consultant's diagnoses on the dashboard — the card, the module gate, the keys, the specs — src/app/pages/dashboard/components/diagnosis-card/**, src/app/pages/dashboard/components/dashboard-overview/**, public/assets/data/dictionary.json
- [ ] A2: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Dependencies: 634 (diagnoses), 646 (the module rule in the header).

## Out of Scope
- Changing the diagnosis screens.

## Critical Questions
- none

## Execution Notes
- decided: a card, not a second menu — why: the main-menu pill exists; the dashboard is where Dandan looked.
