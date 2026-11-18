# Plan 643 — Small debts the Modules runs left: the settings type, the test icon list and the flaky export test

Status: draft
Depends-on: 629, 632
Snapshot: 5d6cd7b8

## Problem Statement
The runs of 2026-11-18 left three small debts, each named in a run report:
- Run `mod-invoices-ui`, D10/D11 (plan 629): `shared/schemas/entities/business.schema.ts:21` still declares
  `BusinessSettings` as `Omit<…, 'priceRiseAlertPct'>`, and its comment (line 20) says plan 629 widens it; 629 could not
  (out of scope) and declared a local `SettingsNumbers` type in
  `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts`.
- Run `mod-access-ui`, D3 (plan 632): `src/testing/test-lucide-icons.ts` lacks `UserCheck`, `UserPlus`,
  `ArrowLeftRight`, `Undo2`; the new specs add them to their own `pick(...)`.
- `src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.spec.ts:109`
  ('leaves test requests out of the requests file', `Expected 0 to be 2` at line 114) failed once in CI on PR #607 and
  once in each of runs `mod-events-ui`, `mod-equip-rule` and `mod-stock-srv` (final gate), passing on rerun. The CI
  log around it shows `crud.requests.hydrate_error … NG0205: Injector has already been destroyed`, so a request load
  from an earlier test lands in this one.

## Goals & Success Criteria
**Primary:** the shared settings type carries the price-rise threshold, the shared test icon list has the icons the
specs need, and the export test passes 20 times in a row.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts` with no local
  settings type left in the component, and the four specs of plan 632 using `test-lucide-icons.ts` without their own
  additions.
- [auto] `pnpm run test:ci` passes 3 times in a row with no failure, including
  `src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.spec.ts`; the
  fix makes the test wait for or stub the requests load it reads, and it is run alone 20 times
  (`--include` of that spec) with 20 passes.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run test:server` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — runs after 641 and 642 in the same run.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/business.schema.ts
src/app/pages/settings/components/business-settings-tab/**
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/testing/test-lucide-icons.ts
src/app/pages/settings/components/access-tab/**
src/app/core/components/business-switcher/**
src/app/core/components/acting-banner/**
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/**
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

- INV-4: preserves — `BusinessSettings` is still inferred from `businessSettingsSchema`; the `Omit` goes, the schema
  does not change.

## Reuse Check

- none — no new piece; one type widened, one test list extended, one test fixed.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a developer, I want the settings type to match the schema, so that the next field is not added twice.
- As the Human, I want a run not to stop on a test that fails by chance, so that overnight runs finish.

## Functional Requirements

### Must Have (P0)
- [ ] `BusinessSettings` = `z.infer<typeof businessSettingsSchema>`; the comment updated; the tab drops
  `SettingsNumbers`; every user of `BusinessSettings` still compiles (the three-number save keeps the stored threshold,
  `server/routes/business.js:58`).
- [ ] `test-lucide-icons.ts` gains `UserCheck`, `UserPlus`, `ArrowLeftRight`, `Undo2`; the specs drop their own copies.
- [ ] The export test: find which load reaches it (the CI log names `crud.requests.hydrate_error`) and make the test
  independent of it (stub the requests source or await its settle); no change to the component's behaviour.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
None.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the shared settings type carry the price-rise threshold — the type, the tab, the compile — shared/schemas/entities/business.schema.ts, src/app/pages/settings/components/business-settings-tab/**
- [ ] A2: Put the four new icons in the shared test list — the list and the specs that copied them — src/testing/test-lucide-icons.ts
- [ ] A3: Make the export test independent of other tests' loads — the fix and the 20 runs — src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/**
- [ ] A4: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Dependencies: 629, 632. Model, backend, auth, data: none.

## Out of Scope
- Other flaky tests (`menu-dish-row.component.spec.ts:217/261`), unless the same cause is found.

## Critical Questions
- none

## Execution Notes
- decided: one plan for three small debts — why: each is a few lines and none touches a screen.
