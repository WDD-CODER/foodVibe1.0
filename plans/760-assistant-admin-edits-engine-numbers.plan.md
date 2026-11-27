# Plan 760 — The platform admin changes every assistant number; a longer quiet wait; one field less on the flow map

Status: draft
Depends-on: none
Track: code
Snapshot: 6b189f63

## Problem Statement
Dandan graded the rs-console cards on 2026-11-27 (plans 751–757, branch `orch/rs-console`). His words, cleaned from
voice dictation:

- **③ (two quick messages, one answer):** "it works, but the user must send the second message very fast — not
  realistic. Add another second before the assistant starts answering." Today `QUIET_MS = 2000`
  (`server/services/inbound.js:19`), `MAX_WAIT_MS = 6000`.
- **flow map:** "`asr-field` — this is redundant, remove!" The open step row of `flow-map.component.html:45-…` shows a
  `<dl class="asr-fields">` with two `asr-field` rows: «what this step reads» (`asr_flow_reads`) and «what can stop it»
  (`asr_flow_stops`). The stops row is what plan 756's card asked for («מה יכול לעצור כאן»), so the redundant one is
  the «reads» row, which repeats the step text above it. (behaviour decision — Dandan grades it.)
- **⑩ (assistant settings):** "there are many values set in the system, like the time it takes to answer. The admin
  needs to be able to change them, but right now I'm the admin and I have no option to change them. Everything that is
  set in the system must be changeable if the admin decides." Today the engine numbers are code constants
  (`server/services/assistant-setup.js` `engineNumbers()`: `quietMs`, `maxWaitMs`, `dailyTurns`, `turnLimit`,
  `followUpMax`, `historyWindow`, `glueMax`, `factsMaxChars`, `firstModelMs`, `turnBudgetMs`, plus the model order
  `modelChain()`), and the settings tab shows them locked: «רק צוות FoodVibe משנה את ההגדרה הזו» — also to the platform
  admin, who is the FoodVibe team.

## Goals & Success Criteria
**Primary:** the platform admin edits every assistant engine number from the settings tab, the assistant uses the new
value from its next message, and the quiet wait defaults to 3 seconds.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0; `pnpm run test:server` exits 0.
- [auto] `server/test/assistant-engine-settings.test.js` passes: with no saved settings every engine number equals
  today's constant except `quietMs` = 3000; the platform admin saves `quietMs: 4000` and the next quiet wait uses 4000;
  a value outside its allowed range (each number has a min and max in one table) is refused with 400; a business
  owner, staff and a consultant get 403 on the save; every save writes one history entry (who, when, field, old, new)
  and the log line carries no value from a business profile.
- [auto] `src/app/pages/frontdesk/assistant/components/settings-table/settings-table.component.spec.ts`: for the
  platform admin each engine row has «לשנות» that opens an inline number box with its unit and range, «שמירה» saves;
  for an owner the rows stay locked with today's tooltip.
- [auto] `src/app/pages/frontdesk/assistant/components/flow-map/flow-map.component.spec.ts`: an open step shows the
  «what can stop it» row and no «what this step reads» row.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/760-assistant-admin-edits-engine-numbers.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/760-assistant-admin-edits-engine-numbers.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/inventory.mjs --check` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] As the platform admin, on `/frontdesk/assistant?tab=settings`, change «זמן המתנה להודעה נוספת» from 3 to 4
  seconds and save; on the simulator, write one message and then another within 3 seconds: one answer covers both.
- [human] Signed in as `demo_host` (owner, not admin), the same rows show the lock and the tooltip, with no «לשנות».
- [human] On the simulator, write a question and a second one about 2 seconds later (default settings): one answer
  covers both.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — here: as `demo_host` on `/frontdesk/assistant?tab=settings`, hover the lock of an engine row: the tooltip says why it is locked, and no such text sits in the row.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: as the platform admin, save a new engine number while the slot's API server is stopped (the agent stops it for this check and starts it again after): a readable error toast appears and the row keeps its old value.
- [human] On `/frontdesk/assistant?tab=flow` open any step: it shows what can stop it, and no «what this step reads»
  line.

## Execution Mode
- Parallel: no — one plan.
- Concurrent plans: none in this run.
- Isolated DB: yes — the server test writes a settings document.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/inbound.js
server/services/assistant-setup.js
server/services/assistant-engine-settings.js
server/services/frontdesk-turn.js
server/services/frontdesk-guardrails.js
server/services/frontdesk-prompt.js
server/services/knowledge.js
server/services/gemini-client.js
server/routes/ai/frontdesk.js
server/routes/assistant-runs.js
server/constants/collections.js
server/test/assistant-engine-settings.test.js
server/test/collections.test.js
server/breadcrumbs.md
shared/schemas/entities/index.ts
shared/schemas/front-desk/**
src/app/pages/frontdesk/assistant/**
src/app/pages/frontdesk/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — the engine settings are one shared, platform-wide document; only the platform admin writes it
  (the same rule as shared `__master__` items), through `server/utils/permissions.js`-style checks in the route; every
  other user reads the values only as today's read-only rows.
- INV-2: preserves — the settings document is platform-wide, not business data; no business-scoped query changes.
- INV-4: preserves — the save body is validated on the server by a Zod schema in `shared/schemas/front-desk/`.
- INV-6: preserves — AI calls still go only through the server; only the numbers they read change.
- INV-7: preserves — the table engine still decides every table; `server/services/frontdesk-turn.js` only reads the engine's numbers from the settings service.
- INV-none: preserves — no money field, no module gate, no CSP change.

## Reuse Check
- assistant-engine-settings service (defaults with ranges, cached read, admin save with history) — family: none — rung: 4 — why: no platform-wide runtime settings store exists; the engine numbers are code constants today

## Defaults

- hints-in-tooltips — applies — how: the lock tooltip stays for non-admins (shared tooltip / plan 756's text).
- disabled-explains-why — applies — how: a locked row keeps its «why» tooltip.
- loading-and-error-states — applies — how: a failed save shows a readable toast and keeps the old value.
- unsaved-changes-on-leave — exception — why: each number saves on its own «שמירה».
- confirm-destructive-action — exception — why: nothing is deleted.
- empty-state-on-list — exception — why: no list added.
- row-action-icons — exception — why: «לשנות» already exists on these rows.
- live-summary — exception — why: no summary box.
- leave-and-return — exception — why: no navigation.
- app-list-container — exception — why: no list added.
- one-breakpoint-set — exception — why: no new breakpoint.
- anchored-popup — exception — why: inline box, no popup.
- unit-dropdown-add — exception — why: no dropdown.
- modal-centered — exception — why: no popup.
- modal-scrollable — exception — why: no popup.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to tune the assistant's timings and limits without a code change, so I can react to
  how real guests write.

## Functional Requirements
- One settings document (collection registered in `server/constants/collections.js`, e.g. `platformSettings`,
  `_id: 'assistant-engine'`) holds only the values that differ from the defaults. The defaults table lives in
  `server/services/assistant-engine-settings.js` with each number's min, max and unit; `quietMs` default 3000 (Dandan:
  +1 s); `maxWaitMs` stays 6000 but is at least `quietMs` + 1000.
- Every place that reads one of these constants reads it through the service instead (with a short in-memory cache,
  refreshed on save), so a change applies from the next guest message, no restart.
- The model order: when the codebase already has an admin editor for the AI model chain (the AI models manager in the
  metadata manager), the settings row links there for the admin; otherwise the order is one more editable value.
- API: `GET` stays as today (adds `editable: true` for the admin); `PUT /…/assistant/engine-settings` admin-only.
- Settings tab: for the admin, «לשנות» opens an inline number box in the row (seconds shown for ms values), with the
  range as a hint; «שמירה» / «ביטול». For everyone else, unchanged.
- Flow map: remove the «what this step reads» `asr-field` row and its now-unused dictionary key use; keep the stops row.

## UI/UX Notes
- Seconds with one decimal for every `…Ms` value («3.0 שנ׳»).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] D1: Write the server test for defaults, admin save, ranges, refusals and history — server/test/assistant-engine-settings.test.js
- [x] D2: Add the engine settings service with defaults (quiet wait 3 s) and history — server/services/assistant-engine-settings.js
- [x] D3: Read every engine number through the service — server/services/inbound.js
- [x] D4: Let the admin edit each number inline on the settings tab — src/app/pages/frontdesk/assistant/components/settings-table/settings-table.component.ts
- [x] D5: Remove the redundant «reads» field from the flow map — src/app/pages/frontdesk/assistant/components/flow-map/flow-map.component.html
- [ ] D6: Run every automatic check and paste the outputs under Execution Notes — plans/760-assistant-admin-edits-engine-numbers.plan.md

## What happens when
- The settings document is missing or unreadable: the defaults apply and a warning is logged once.
- Two admins save at once: the last save wins; both are in the history.

## Technical Considerations
- Run branch: a new run cut from `orch/rs-console` (plans 751–757). Do not run browser checks; the Human checks the
  cards. Model changes: one settings document. Backend / API: one admin route. Security: admin-only write, range
  checks on the server.

## Out of Scope
- Per-business engine numbers (the business's own values stay where they are).

## Critical Questions
- none

## Execution Notes

Builder, round 0 (2026-11-27).

- Step 0: `scope-check --drift` → `REALITY: drift` (8 commits on `origin/main`, none an ancestor of this branch; they touch
  only registry / breadcrumbs files in scope, no symbol this plan names) → ok.
- `INV-7` line added under Architecture Impact: `--arch` asked for it (`frontdesk-turn.js` is in INV-7's Touches).
- The save route is `PUT /api/v1/assistant-runs/engine-settings` `{ field, value }`.

**Open (D6): `pnpm run test:server` exits non-zero until two test files outside the scope are updated.**
185 test files pass, 2 fail (11 of 2840 tests), each because it asserts the old 2 s quiet wait:

- `server/test/inbound.test.js` (10): the numbers become 3000; five-message burst waits `[500, 1500, 3000, 3000, 3000]`;
  "a follow-up waits what is left" cases use 3000.
- `server/test/frontdesk-one-run.test.js` (1, line 188): `calls[0]` is 3000.

`plan-ledger-check` fails on the base too: `.claude/todo.md` names plans 758, 759 and 761, which this branch does not hold
(this branch changes neither). The three files are on `origin/main`. The check is the last step of the pre-commit hook, so
`git commit` exits 1 and nothing is committed or pushed; the work is staged in the builder folder. The hook was not
bypassed (`--no-verify` is denied in `.claude/settings.json`).

Evidence:

- `pnpm run build` → exit 0
- `pnpm run lint` → exit 0 (0 errors, 72 warnings)
- `pnpm run test:ci` → exit 0, `TOTAL: 3346 SUCCESS`
- `pnpm run test:server` → `Test Files 2 failed | 185 passed (187)`, `Tests 11 failed | 2829 passed (2840)`
- `vitest run test/assistant-engine-settings.test.js test/collections.test.js test/assistant-runs-router.test.js` →
  3 files, 41 tests passed
- `scope-check --arch` → `ARCH: ok`; `--reuse` → `REUSE: ok`; gate scope check → `SCOPE: ok`
- `kit-manifest-check` → ok; `kit-checks` → `KIT_CHECKS: ok (6 checks)`; `override-check` → ok
- `breadcrumbs-check` → clean; `inventory --check` → ok; `lint:icons`, `lint:no-native-select` → ok
- `log-query --since=plan-start --level=error` → `SKIP: no database configured`
- `ci-scope-check --checkout-branch` → skipped, exit 0
- `plan-ledger-check` → exit 1 (see above)
