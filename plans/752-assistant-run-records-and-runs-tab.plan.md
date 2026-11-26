# Plan 752 — Every run of the front-desk assistant is recorded step by step, kept 30 days, and shown to the owner in a "what the assistant did" page

Status: draft
Depends-on: 751
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

When the front-desk assistant hands a guest to the staff, or answers weakly, nobody can see why. Verified on the
Snapshot:

- The turn (`server/services/frontdesk-turn.js:195` `runTurnInner`) logs ids and enums only — `frontdesk.turn.blocked
  { reason, stage, level }` (`:139`), `frontdesk.turn.failed { reason, group }` (`:245`), `frontdesk.turn.done
  { intent, level, handoff, requestWritten }` (`:274`, `:295`, `:300`, `:309`, `:317`, `:338`). By rule the logs never
  carry guest text (file comment `:8`), and `info` lines are not kept in the database at all
  (`server/services/log-sink.js:20-22`: only `warn` / `error` are persisted).
- The AI's raw answer is thrown away: `askTurnModel` (`server/routes/ai/frontdesk.js:37-66`) parses
  `responseText(call.data)` (`:45`) and returns only `{ ok, answer }` or `{ ok: false, reason, status }`; the model
  that answered (`call.model`, `server/services/gemini-client.js:649`) and the retry of plan 731 (`:61-65`) are not
  returned either.
- The wait before a turn (`server/services/inbound.js:91`, `COALESCE_MS = 6000` at `:15`) and a turn that was folded
  into a later message (`:93-96`, log `inbound.coalesced`) leave no record a person can read.

The Human wants an "Executions" list like n8n's: every run of the assistant with each step's input, output, status and
duration, kept 30 days, readable by the business owner for the owner's own business and by the platform admin acting in
that business. This is the first of five plans (752–756). This plan builds the recorder and its storage, the recording
of the 13 steps, a read API, and the page with the "runs" tab. Plans 753–756 build on the names fixed here (see
"Contract for plans 753–756" under Technical Considerations).

The 13 steps (the vocabulary of the approved mock-up), with the fixed key each gets in this plan:

| # | key | step | where it runs today |
| --- | --- | --- | --- |
| 1 | `inbound` | Guest message arrives, the wait for a second message | `server/services/inbound.js:73-98` `afterStored` |
| 2 | `setup` | Load the business setup | `frontdesk-turn.js:198-202` (profile, `turnProfile`) |
| 3 | `limit` | Daily limit | `:204-214` (`FRONTDESK_DAILY_TURNS`, `aiUsage` count) |
| 4 | `history` | Read the conversation | `:216-219` (last `HISTORY_WINDOW` = 12 messages, `aiTurns`) |
| 5 | `precheck` | Pre-check | `:221-229` (`isRemoval`, `preCheck`) |
| 6 | `facts` | Gather the facts | `:231-232` (`publicFacts`, `tablesFor`) |
| 7 | `prompt` | Build the prompt | `:233` (`buildTurnBody`) |
| 8 | `ai` | Ask the AI | `:234-242` (`askTurnModel`) |
| 9 | `shape` | Check the JSON | inside `askTurnModel` (`routes/ai/frontdesk.js:45-58`, the retry `:61-65`) |
| 10 | `guardrails` | Guardrails | `:253-279` (`applyGuardrails`, the low-content mark) |
| 11 | `tables` | Table engine | `:285-305` (`handleTableIntent`) |
| 12 | `decide` | Decide | `:307-313` (`decide`) |
| 13 | `send` | Send or draft | `:315-339`, `handOff` `:99-116`, `holdGuest` `:153-167`, `removeGuest` `:121-135`, `finishSuggestion` `:342-348` |

Plan 751 runs first and edits `frontdesk-turn.js`, `frontdesk-tables.js` and `frontdesk-guardrails.js`; line numbers
above are the Snapshot's. Find every place by the symbol named, not by the number.

## Goals & Success Criteria
**Primary:** every run of the assistant leaves one record in the business's own data with the 13 steps (status,
duration, input, output), the result and the reason; the owner opens a page, sees the runs newest first, opens one and
reads why the assistant answered, asked, drafted or handed over; a record is deleted by itself after 30 days.

- [auto] `pnpm run test:server` → exit 0, including the new files `server/test/frontdesk-runs.test.js` and
  `server/test/assistant-runs-router.test.js` and the new and changed cases in `server/test/frontdesk-turn.test.js`,
  `server/test/frontdesk-tables.test.js`, `server/test/inbound.test.js`, `server/test/erase-client.test.js` and
  `server/test/sim-router.test.js`.
- [auto] `server/test/frontdesk-turn.test.js`, new block "plan 752: every turn leaves a run record": `setup()` with
  the `SMALL` answer → exactly one `assistantRuns` document with `businessId: 'b1'`, the conversation's id,
  `mode: 'turn'`, `level: 1`, `outcome: 'answered'`, `fallbackUsed: false`, `model` equal to `DEFAULT_MODELS[0]`,
  `trigger` equal to `{ messageIds: ['g1'], text: 'GUEST-SECRET-TEXT' }`, no `prompt` field, `expiresAt` a `Date`
  exactly `30 * 86400000` ms after `startedAt`, and `steps.map(s => s.key)` equal to `RUN_STEP_KEYS`; statuses:
  `inbound` `skipped`, `tables` `skipped`, every other step `ok`; the `ai` step's `out.raw` contains `שלום`; the `send`
  step's `out` is `{ action: 'sent', author: 'ai', messageId: <the outbound row's _id>, chars: 4 }`.
- [auto] same block, blocked by a guardrail: an answer `{ reply: 'ראו https://evil.example/x', intent: 'question' }` →
  one run with `outcome: 'handover'`, `reason: 'invented_link'`; step `guardrails` is `stopped` with
  `out.reason: 'invented_link'`; steps `tables` and `decide` are `skipped`; the `ai` step's `out.raw` contains
  `evil.example`; `prompt.lead` contains `=== FACTS (data) ===`; the `send` step's `out.action` is `'sent'`.
- [auto] same block, model failure: a 503 answer on every call → one run with `outcome: 'failed'`, `reason: 'busy'`,
  step `ai` `stopped` with every `out.attempts[i].ok === false`, step `shape` `skipped`, `send` `out.action:
  'holding'`. An answer that is not JSON on every call → `outcome: 'failed'`, `reason: 'other'`, step `ai` `ok`, step
  `shape` `stopped` with `out` `{ tries: 2, ok: false, issue: 'bad_json' }`, and `ai` `out.raw` equal to the text the
  model sent.
- [auto] same block, pre-check keyword: the guest's message is the first word of `HANDOFF`
  (`server/constants/frontdesk-guard-words.js`) → `fetch` not called; one run with `outcome: 'handover'`,
  `reason: 'keyword'`, step `precheck` `stopped`, steps `facts`, `prompt`, `ai`, `shape`, `guardrails`, `tables`,
  `decide` `skipped`, no `model` field.
- [auto] same block, level 0: `setup({ level: 0 })` with `SMALL` → one run with `level: 0`, `outcome: 'draft'`, `send`
  `out.action: 'draft'`. `mode: 'suggest'` on a level-1 conversation → `mode: 'suggest'`, `outcome: 'draft'`, steps
  `limit` and `precheck` `skipped`.
- [auto] same block, the daily cap (300 `frontdesk_turn` rows today) → `outcome: 'failed'`, `reason: 'quota'`, step
  `limit` `stopped` with `out.used: 300`; a removal word → `outcome: 'removed'`, `reason: 'removal'`, `send`
  `out.action: 'removal_notice'`.
- [auto] same block, the wait: `turn(conversation, { inbound: { at: 5, waitedMs: 6000 } })` → step `inbound` is `ok`
  with `ms: 6000` and `out` `{ waitedMs: 6000, answers: 1 }`; with a second unanswered guest message `g2` stored
  before the turn → step `inbound` is `note`, `out.answers: 2`, `trigger.messageIds` equal to `['g1', 'g2']`.
- [auto] same block, nothing recorded: a conversation whose status is `human` (`{ skipped: 'not_bot' }`), a business
  with no profile (`{ skipped: 'no_profile' }`) and a turn with `feature: 'eval'` → zero `assistantRuns` documents.
- [auto] same block, a recorder failure never fails the turn: with `_setInsertForTests(async () => { throw new
  Error('down') })` the turn still returns `{ ok: true, sent: true }`, the outbound row exists, zero run documents,
  and one log record `frontdesk.run.record_failed` with `reason: 'db'`. A turn whose `log.info` throws `boom` →
  `runTurn` rejects with `boom` and one run exists with `outcome: 'failed'`, `reason: 'error'`.
- [auto] same block, logs: over all the cases above the captured log text contains none of `GUEST-SECRET-TEXT`,
  `שלום`, `evil.example`; every `frontdesk.run.recorded` record has exactly the keys `event`, `runId`,
  `conversationId`, `outcome`, `reason` (when set), `ms`, `fallbackUsed` beside the logger's own.
- [auto] `server/test/frontdesk-tables.test.js`: `setup({ level: 1 })` with `BOOK(FULL_ASK)` → one run with
  `outcome: 'asked'`, step `tables` `ok` with `out.result: 'offer'`, step `decide` `out.why: 'table_engine'`, `send`
  `out.action: 'sent'`.
- [auto] `server/test/inbound.test.js`: the turn handler's third argument carries
  `inbound: { at: NOW, waitedMs: <a number ≥ 0> }`; a message folded into a later one still calls the handler once.
- [auto] `server/test/frontdesk-runs.test.js`: the cases listed under "Tests" in Functional Requirements (the 13 keys
  always present and in order, clipping, `discard`, `NO_RUN`, schema refusal logged and not thrown, `listRuns` filters
  and paging, `loadRun` scope, the three indexes by name, `deleteBusinessServerData` removes a business's runs only).
- [auto] `server/test/assistant-runs-router.test.js`: 401 without a token; 403 `MODULE_OFF` without the module; 403 for
  staff on both routes; 200 for the owner and for a consultant; another business's run id answers 404 and its runs
  never appear in the list; the filters `answered`, `handover`, `fallback` and `scope=test` return exactly the seeded
  rows; `limit` / `before` page with `more`; a malformed `limit` answers 400 `BAD_INPUT`; a generic
  `GET /api/v1/data/assistantRuns` answers 403; an acting platform admin gets `text: ''` and `textHidden: true` for a
  real run in the list, and opening that run adds one `adminViews` row `{ at, userId }` and one `warn` log record
  `assistant_runs.admin_read`; opening a test run adds none; `prompt` and `promptRules` are in the answer only for a
  platform admin.
- [auto] `pnpm run test:ci` → exit 0, including the new specs
  `src/app/pages/frontdesk/assistant/assistant.page.spec.ts`,
  `src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts`,
  `src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts`,
  `src/app/core/services/assistant-run-data.service.spec.ts` and the changed
  `src/app/pages/inbox/inbox.page.spec.ts` and `src/app/pages/frontdesk/simulator/simulator.page.spec.ts` (cases
  listed under "Tests").
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, signed in as the demo restaurant's owner
  `demo_host`) write "שלום, אתם פתוחים מחר?" as a test guest, wait for the answer, then press "מה העוזר עשה" · the page
  `http://localhost:4202/frontdesk/assistant?scope=test` opens with a row that shows the text "שלום, אתם פתוחים מחר?"
  and a result tag; pressing the row shows one sentence on top (for an answer: "העוזר ענה לאורח.") and 13 step rows,
  the first named "הודעת האורח התקבלה" and the last "שליחה או טיוטה"; opening "שאילת ה-AI" shows the block
  "התשובה הגולמית של ה-AI".
- [human] the list's page with no items · open the page · a message says the list is empty — here: `http://localhost:4202/frontdesk/assistant` with "שיחות בדיקה" off, in a business with no real guest conversations; the list area shows "עדיין אין כאן מה להציג: העוזר עוד לא טיפל בהודעות".
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: `http://localhost:4202/frontdesk/assistant` while the slot's API server is stopped (the agent stops it for this check and starts it again after); "לא הצלחנו לטעון את הרשימה" with a "נסה שוב" button appears.

## Execution Mode
- Parallel: no — the plan edits `server/services/frontdesk-turn.js`, `server/services/inbound.js` and
  `server/routes/ai/frontdesk.js`; plans 753–756 depend on it and plan 751 must be merged first.
- Concurrent plans: none
- Isolated DB: no — one new collection, no change to stored data
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/assistant-run.schema.ts
shared/schemas/entities/index.ts
server/constants/collections.js
server/db.js
server/app.js
server/services/frontdesk-runs.js
server/services/frontdesk-turn.js
server/services/inbound.js
server/services/business.js
server/routes/ai/frontdesk.js
server/routes/assistant-runs.js
server/routes/sim.js
server/scripts/erase-client.js
server/test/frontdesk-runs.test.js
server/test/assistant-runs-router.test.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-tables.test.js
server/test/inbound.test.js
server/test/erase-client.test.js
server/test/sim-router.test.js
server/breadcrumbs.md
src/app/core/models/assistant-run.model.ts
src/app/core/models/breadcrumbs.md
src/app/core/services/assistant-run-data.service.ts
src/app/core/services/assistant-run-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/breadcrumbs.md
src/app/pages/frontdesk/assistant/**
src/app/pages/inbox/inbox.page.html
src/app/pages/inbox/inbox.page.spec.ts
src/app/pages/frontdesk/simulator/simulator.page.html
src/app/pages/frontdesk/simulator/simulator.page.ts
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
src/app/pages/breadcrumbs.md
src/app/app.routes.ts
public/assets/data/dictionary.json
docs/agent/standards-backend.md
docs/restaurant/restaurant-map.md
docs/brain/component-families.md
docs/brain/inventory.md
```

New files: `shared/schemas/entities/assistant-run.schema.ts`, `server/services/frontdesk-runs.js`,
`server/routes/assistant-runs.js`, `server/test/frontdesk-runs.test.js`, `server/test/assistant-runs-router.test.js`,
`src/app/core/models/assistant-run.model.ts`, `src/app/core/services/assistant-run-data.service.ts` (+ spec) and
everything under `src/app/pages/frontdesk/assistant/`. Every other path exists on the Snapshot.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely cases: another server test that lists every collection or
every key of `SCHEMA_BY_COLLECTION` with an exact match (none was found on the Snapshot beyond the files in scope:
`server/test/collections.test.js` and `server/test/restaurant-registry.test.js` name their own collections) — offer
`approved: <that test path>` with the one-line addition of `assistantRuns`. `server/services/gemini-client.js`,
`server/services/frontdesk-guardrails.js`, `server/services/frontdesk-tables.js`, `server/services/frontdesk-prompt.js`,
`server/utils/permissions.js` and `src/app/core/components/tab-chips/**` are never offered: the plan needs no change
there.

## Architecture Impact

- INV-1: preserves — a run carries `businessId` and is read only through `server/routes/assistant-runs.js`, whose every query takes the business from `scopeFilter(req)` (the signed token) and is authorized with the existing action `assertCan(req, res, 'editFrontDesk', …)` (owner; a consultant by ADR 0032; the platform admin acting in the business; staff refused); `server/utils/permissions.js` is not edited and no new action or rule is added; `src/app/core/services/assistant-run-data.service.ts` only calls those two routes.
- INV-2: preserves — `server/services/frontdesk-runs.js`, `frontdesk-turn.js`, `inbound.js` and `business.js` write and read `assistantRuns` only with the conversation's own `businessId`; the collection is server-only and not cloneable, so master sync and the clone never see it; a business delete removes its runs.
- INV-4: preserves — the shape is one Zod schema `shared/schemas/entities/assistant-run.schema.ts`, registered in `SCHEMA_BY_COLLECTION`; the recorder checks the document with `checkStoredDoc('assistantRuns', doc)` before its one insert and stores nothing when the check fails.
- INV-6: preserves — the one model call stays `askTurnModel` in `server/routes/ai/frontdesk.js`; it only returns extra facts about the call it already makes (`trace`); no second call place, no key in the browser.
- INV-7: preserves — `server/services/frontdesk-turn.js` only observes `handleTableIntent`'s result (`outbound`, `pending`, `handoff`, `request`) to name what the engine did; the recorder decides nothing, writes no hold and changes no message the guest gets.

## Reuse Check

- `assistantRunSchema` in `shared/schemas/entities/assistant-run.schema.ts` — family: entity-schemas — rung: 3 — why: one more stored shape, one file, registered like `messageSchema`.
- `startRun`, `NO_RUN`, `listRuns`, `loadRun`, `markAdminView` in `server/services/frontdesk-runs.js` — family: none — rung: 4 — why: no piece records the steps of a turn today (the logs keep enums only and `aiUsage` keeps one row per model call); one module owns every read and write of `assistantRuns`, as `server/services/access.js` does for `businessAccess`.
- `server/routes/assistant-runs.js` — family: none — rung: 4 — why: runs are written only by the server and read-only for people, with filters, paging and an admin trace the generic `/api/v1/data/:type` contract cannot express; the collection is server-only like `conversations`, whose router (`server/routes/conversations.js`) is the model.
- `AssistantRunDataService` — family: http — rung: 3 — why: a read client built like `ConversationDataService` (signals for the list, the open record and their failures); it does not extend `BaseEntityDataService` because the list is paged and filtered on the server.
- `AssistantPage` (`/frontdesk/assistant`) with `RunDetailComponent` (`app-run-detail`) — family: none — rung: 4 — why: a new page; it is built from existing pieces only (`app-page-header`, `.c-chip--tab` in `app-scroll-rail` as the settings page, `.c-chip-group` + `.c-chip--toggle` as the inbox filters, `ul.c-list` + `.c-list-row`, `app-empty-state`, `app-loader`, `.c-glass-panel`, `.c-chip--tag`); plan 756 adds two tabs to the same page.
- `assistant-run-view.util.ts` (`verdictOf`, `stepRows`, `STEP_FIELDS`, `outcomeTone`) — family: helpers — rung: 3 — why: pure functions that turn a run into labelled lines; nothing in the registry formats a run.
- The tab strip — family: chip — rung: 1 — why: `button.c-chip.c-chip--tab` inside `app-scroll-rail` with `role="tablist"`, exactly as `src/app/pages/settings/settings.page.html:7-24`; no new tab component.
- The filter chips and the "test conversations" switch — family: chip — rung: 1 — why: `.c-chip-group` with `.c-chip--toggle` radios as `src/app/pages/inbox/inbox.page.html:13-26`.
- The result tag, the test tag and the "backup AI" mark on a row — family: chip — rung: 1 — why: `span.c-chip.c-chip--tag.c-chip--sm` with the tones `--green`, `--amber`, `--red`.
- The step row that opens and closes — family: none — rung: 4 — why: no shared collapsible piece exists (`docs/brain/component-families.md` has none; a native `details` is not used in the app); it is a `button` with `aria-expanded` and `aria-controls` over a panel, page-local classes `.asr-step*`, registered in the new family below.
- New registry family `assistant-runs` in `docs/brain/component-families.md` — family: none — rung: 4 — why: gives the recorder, the route, the service, the page and the step row one entry so plans 753–756 extend them instead of copying.

## Adopt Check
- recording the steps of the assistant's turn — verdict: skip — why: domain logic bound to `runTurn`'s own steps; a tracing package would add a dependency and a second store for one insert per run.
- the read route and the page — verdict: skip — why: domain screens built from the app's own pieces.
- `startRun`, `NO_RUN`, `listRuns`, `loadRun`, `markAdminView` in `server/services/frontdesk-runs.js` — verdict: skip — why: domain logic; one module that reads and writes the app's own `assistantRuns` collection.
- `server/routes/assistant-runs.js` — verdict: skip — why: domain logic; two read routes of the app's own API.
- `AssistantPage` (`/frontdesk/assistant`) with `RunDetailComponent` (`app-run-detail`) — verdict: skip — why: a domain page built from the app's own pieces.
- The step row that opens and closes — verdict: skip — why: a button with `aria-expanded` over a panel; a package for one collapsible row would add a dependency for a few lines.
- New registry family `assistant-runs` in `docs/brain/component-families.md` — verdict: skip — why: a registry entry, not code.

## Defaults

- empty-state-on-list — applies — how: `app-empty-state` (`src/app/shared/empty-state/`) in the list area: `asr_empty` when the business has no runs in the chosen scope, `asr_empty_filter` when the filter leaves nothing
- loading-and-error-states — applies — how: `app-loader` (`src/app/shared/loader/`) until the first list read answers and while a run opens; `app-empty-state` with `ctaLabelKey="retry"` when the list or the run fails to load
- app-list-container — exception — why: the runs list sits in a side column beside the open run, the inbox's layout (plan 677), which `app-list-shell` cannot hold; the page still uses `app-page-header` and every row is one `.c-list-row` on a single line at every width
- one-breakpoint-set — applies — how: the page's two `@media` rules use `$break-tablet-max` and `$break-phone-max` only
- unsaved-changes-on-leave — exception — why: a read-only page; its only inputs are filter chips
- confirm-destructive-action — exception — why: nothing on the page deletes or discards; the simulator's existing "clear test data" keeps its own confirm
- hints-in-tooltips — exception — why: no dialog and no explained control; a step's details are the content of the row the user opens
- anchored-popup — exception — why: no floating box; a step opens in place inside the list of steps
- unit-dropdown-add — exception — why: no unit-of-measure dropdown (the word appears only in "unit tests")
- leave-and-return — exception — why: the page's links (to the conversation, back to the list) carry no unsaved work

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten). Plan 751's commits are expected drift: check that
`runTurn`, `runTurnInner`, `handOff`, `blockTurn`, `holdGuest`, `removeGuest`, `decide`, `finishSuggestion`
(`frontdesk-turn.js`), `handleTableIntent` (`frontdesk-tables.js`) and `applyGuardrails` / `preCheck`
(`frontdesk-guardrails.js`) still exist with the roles described here; a new guardrail reason from 751 is handled by
the open `reason` string and the `asr_reason_unknown` fallback (add its key to `RUN_REASONS` and the dictionary).

## User Stories
- As a restaurant owner, I want to see every message my assistant handled and what it did with it, so that I know why a guest was passed to my staff.
- As a restaurant owner, I want to open one run and read it step by step in plain words, so that I can fix the missing fact or the setting that caused a weak answer.
- As a restaurant owner, I want test conversations from the simulator kept apart from real guests, so that my tests do not hide what really happened.
- As the platform admin helping a restaurant, I want the AI's raw answer and the data that was sent to it, so that I can find the cause of a wrong block; and when I open a real guest's run, a trace of that is kept.
- As a guest, I want my words kept only where the restaurant's own conversations are kept, and deleted with them, so that they never end up in a technical log.

## Functional Requirements

### Must Have (P0)

**1. The stored shape — `shared/schemas/entities/assistant-run.schema.ts` (new), `shared/schemas/entities/index.ts`**
- [ ] The new file exports these constants and the schema (comment: "Plan 752 (C-RUNS): one run of the front-desk
  assistant, step by step. Server-only collection, written once by `server/services/frontdesk-runs.js`, deleted by a
  TTL index 30 days after it started."):

```ts
export const RUN_MODES = ['turn', 'suggest'] as const
export const RUN_OUTCOMES = ['answered', 'asked', 'draft', 'handover', 'failed', 'removed'] as const
export const RUN_STEP_KEYS = ['inbound', 'setup', 'limit', 'history', 'precheck', 'facts', 'prompt', 'ai', 'shape',
  'guardrails', 'tables', 'decide', 'send'] as const
export const RUN_STEP_STATUSES = ['ok', 'note', 'stopped', 'skipped'] as const
export const RUN_REASONS = ['quota', 'busy', 'timeout', 'other', 'error', 'send_refused', 'removal', 'keyword',
  'outside_hours', 'turn_limit', 'model', 'low_content', 'internals', 'invented_link', 'deferred', 'completion_claim',
  'unsupported_time', 'table_number', 'unsupported_price', 'table_engine', 'open_request'] as const

export const runStepSchema = z.strictObject({
  key: z.enum(RUN_STEP_KEYS),
  status: z.enum(RUN_STEP_STATUSES),
  ms: z.number().min(0),
  in: z.record(z.string(), z.unknown()).optional(),
  out: z.record(z.string(), z.unknown()).optional()
})

export const assistantRunSchema = z.strictObject({
  _id: z.string().min(1),
  businessId: z.string().min(1),
  conversationId: z.string().min(1),
  test: z.literal(true).optional(),
  mode: z.enum(RUN_MODES),
  level: z.number().int().min(0).max(2),
  startedAt: z.number(),
  endedAt: z.number(),
  ms: z.number().min(0),
  expiresAt: z.date(),
  trigger: z.strictObject({ messageIds: z.array(z.string().min(1)).max(12), text: z.string().max(300) }),
  outcome: z.enum(RUN_OUTCOMES),
  reason: z.string().min(1).max(40).optional(),
  fallbackUsed: z.boolean(),
  model: z.string().min(1).max(80).optional(),
  intent: z.string().min(1).max(20).optional(),
  steps: z.array(runStepSchema).length(13),
  prompt: z.strictObject({
    lead: z.string().max(8000), truncated: z.literal(true).optional(),
    tone: z.enum(['warm', 'formal']), tablesOn: z.boolean()
  }).optional(),
  followsRunId: z.string().min(1).optional(),
  adminViews: z.array(z.strictObject({ at: z.number(), userId: z.string().min(1) })).max(20).optional()
})
export type AssistantRun = z.infer<typeof assistantRunSchema>
export type RunStep = z.infer<typeof runStepSchema>
export type RunStepKey = (typeof RUN_STEP_KEYS)[number]
export type RunOutcome = (typeof RUN_OUTCOMES)[number]
```
- [ ] `reason` is a string, not an enum, on purpose: plan 751 or a later plan may add a guardrail reason without a
  schema change; `RUN_REASONS` is the list the dictionary and the tests cover. `followsRunId` is not written by this
  plan (plan 753 uses it).
- [ ] `index.ts`: `import { assistantRunSchema } from './assistant-run.schema'`, `export * from
  './assistant-run.schema'` under the "Plan 662" exports, and `assistantRuns: assistantRunSchema` as the last key of
  `SCHEMA_BY_COLLECTION` (after `messages`, with the comment `// Plan 752 (C-RUNS)`).

**2. The collection, its indexes and its life — `server/constants/collections.js`, `server/db.js`**
- [ ] `COLLECTIONS` gets, after the `tableHolds` row (`collections.js:80`):
  `{ name: 'assistantRuns', userData: false, cloneable: false, backup: false, searchable: false, softDelete: false }, // C-RUNS, plan 752: server-only; read through routes/assistant-runs.js`.
  `userData: false` keeps it off the generic API (a generic `GET` answers 403, as for `conversations`).
- [ ] `server/db.js`, right after the `messages_conversation_at` index (`:214`) and before the
  `mongo.index.ensured … 'restaurant'` line (`:215`), three indexes:
  `createIndex({ businessId: 1, startedAt: -1 }, { name: 'assistant_runs_business_started' })`,
  `createIndex({ businessId: 1, conversationId: 1, startedAt: -1 }, { name: 'assistant_runs_conversation' })`,
  `createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'assistant_runs_ttl' })` with the comment
  "Plan 752 (C-RUNS): MongoDB deletes a run when its `expiresAt` (a Date, 30 days after it started) has passed — the
  same mechanism as `app_logs` (`server/services/log-sink.js`, `ttl_createdAt`)."
- [ ] No job is added to `server/jobs/` and `server/jobs/retention.js` is not edited: the TTL index is the retention
  (30 days is far shorter than the 365 days of messages, so a run never outlives its conversation's messages by rule).

**3. The recorder — `server/services/frontdesk-runs.js` (new, CommonJS, `'use strict'`, semicolons as the
neighbouring services)**
- [ ] File comment: "Plan 752 (C-RUNS): records one run of the assistant's turn — 13 steps with status, duration,
  input and output — and writes it once, at the end, to `assistantRuns`. Recording never breaks or slows a turn: no
  method throws, nothing is awaited before `finish`, and a failed write is one warn line. A run document holds the
  guest's words and the AI's answer; the LOG never does — log lines here carry ids, enums and numbers only."
- [ ] Exports: `RUN_TTL_DAYS = 30`, `RAW_MAX = 4000`, `LEAD_MAX = 8000`, `TRIGGER_TEXT_MAX = 300`, `startRun`,
  `NO_RUN`, `listRuns`, `loadRun`, `markAdminView`, `_setInsertForTests`.
- [ ] `startRun(db, conversation, { now = Date.now(), mode = 'turn', feature, inbound } = {})` → a `run` object, or
  `NO_RUN` when `feature === 'eval'`. It reads nothing and writes nothing. `run.id` is `newId()`
  (`server/utils/id.js`). `inbound` is `{ at, waitedMs }` or undefined.
- [ ] `run.time(key, fn)` — awaits `fn()`, adds the elapsed milliseconds (`performance.now()`, rounded) to that
  step's `ms`, returns `fn`'s result; when `fn` throws, the step becomes `stopped` with `out.error` = the error's
  `name`, and the error is rethrown unchanged. `run.timeSync(key, fn)` — the same for a function that returns at once
  (no `await`).
- [ ] `run.step(key, { status, ms, in, out })` — merges into the step: `status` replaces, `ms` replaces when given,
  `in` / `out` are shallow-merged into what the step already has. A step that was only timed has status `ok`.
- [ ] `run.set({ level, trigger, model, firstModel, intent, lead, tone, tablesOn })` — keeps run-level facts in memory.
  `run.end(outcome, reason)` — sets the result; the last call wins. `run.discard()` — `finish` then writes nothing.
- [ ] `run.finish({ log = logger } = {})` → `Promise<void>`, never rejects. When discarded: returns. Otherwise it
  builds the document: every key of `RUN_STEP_KEYS` in order (a step never touched is `{ key, status: 'skipped',
  ms: 0 }`); `ms` = elapsed since `startRun` plus `inbound.waitedMs` (0 when absent); `startedAt = now -
  (inbound?.waitedMs ?? 0)`, `endedAt = startedAt + ms`; `expiresAt = new Date(startedAt + RUN_TTL_DAYS * 86400000)`;
  `test: true` only when `conversation.test === true`; `outcome` (when `end` was never called: `'failed'` with reason
  `'error'`); `fallbackUsed = !!model && !!firstModel && model !== firstModel`; `prompt` (`{ lead:
  lead.slice(0, LEAD_MAX), truncated: true` only when cut, `tone`, `tablesOn }`) only when a `lead` was set AND the
  outcome is `handover` or `failed`; then `checkStoredDoc('assistantRuns', doc)` — not ok → `log.warn({ event:
  'frontdesk.run.record_failed', conversationId, reason: 'schema', paths })` (`paths` = the first 10 issue paths, no
  values) and return; ok → one `insertOne`; a rejected insert → `log.warn({ event: 'frontdesk.run.record_failed',
  conversationId, reason: 'db', errName })`; success → `log.info({ event: 'frontdesk.run.recorded', runId,
  conversationId, outcome, reason, ms, fallbackUsed })`. The whole body is inside one `try` / `catch` that swallows
  (also a throwing `log`).
- [ ] Clipping, applied by `run.step` to `in` and `out`: a string is cut to 300 characters, except the key `raw`
  (cut to `RAW_MAX`); an array keeps its first 200 entries; nesting deeper than 3 levels is dropped. `trigger.text`
  is cut to `TRIGGER_TEXT_MAX`, `trigger.messageIds` to 12.
- [ ] `NO_RUN` — an object with the same methods that record nothing (`time` / `timeSync` still call `fn` and return
  its result; `finish` resolves). `run.step`, `run.set`, `run.end`, `run.discard` never throw, whatever they are given.
- [ ] `_setInsertForTests(fn)` — tests only: replaces the insert (`fn(doc)`); `null` restores it.
- [ ] `listRuns(db, businessId, { filter = 'all', test = false, limit = 50, before } = {})` → `{ runs, more }`: query
  `{ businessId, test: test ? true : { $ne: true } }` plus, by `filter`: `answered` → `outcome: { $in: ['answered',
  'asked'] }`; `handover` → `outcome: { $in: ['handover', 'failed', 'removed'] }`; `fallback` → `fallbackUsed: true`;
  `all` → nothing more; `before` (a number) → `startedAt: { $lt: before }`; sorted `{ startedAt: -1, _id: -1 }`,
  `limit + 1` read to set `more`; projection: `_id, conversationId, test, mode, startedAt, ms, outcome, reason,
  fallbackUsed, model, 'trigger.text'`; each row is returned flat with `text: trigger.text`.
- [ ] `loadRun(db, businessId, id)` → the whole document or `null`, always filtered by `{ _id: id, businessId }`.
- [ ] `markAdminView(db, run, userId, now)` → `updateOne({ _id: run._id, businessId: run.businessId }, { $push:
  { adminViews: { $each: [{ at: now, userId: String(userId) }], $slice: -20 } } })`; returns the row it wrote.

**4. The AI step says what happened — `server/routes/ai/frontdesk.js` `askTurnModel`**
- [ ] The signature and the existing result fields do not change. Both results gain `trace`:
  `{ attempts, model, firstModel, raw, rawChars, shapeTries }` where `attempts` is one entry per call of
  `callGemini` made by `attempt` (at most 2): `{ model: call.model ?? null, ms, ok: call.kind === 'ok', reason:
  call.kind` (only when not ok)`, status: call.status` (only when set) `}` with `ms` measured around the
  `callGemini` call; `model` = the model of the last `ok` call, else `null`; `firstModel` = `modelChain()[0] ?? null`
  (import `modelChain` from `../../services/gemini-client`); `raw` = `responseText(call.data).slice(0, 4000)` of the
  last `ok` call (also when that text failed the JSON or the shape check), else `''`; `rawChars` = its full length;
  `shapeTries` = 1 or 2. `server/services/gemini-client.js` is not edited (its `{ kind: 'ok', model, data }` result
  already names the model; plan 754 adds per-HTTP-call attempts there).
- [ ] The function's doc comment gains: "`trace` (plan 752) tells the run record which model answered, each try and
  the raw text; it never goes to a log."
- [ ] No log line changes; `frontdesk.turn.bad_answer` keeps its fields.

**5. The wait is measured — `server/services/inbound.js` `afterStored`**
- [ ] Around the existing `await wait(COALESCE_MS)`: `const waitStarted = Date.now()` before it, and the call at the
  end becomes `await turnHandler(db, fresh, { log, inbound: { at, waitedMs: Date.now() - waitStarted } })`. Nothing
  else in the file changes: `answerWaiting` keeps calling `turnHandler(db, conversation, { log })` (its run records
  the `inbound` step as `skipped`, `out.via: 'direct'`), the folded-away message keeps its `inbound.coalesced` log
  line and gets no run of its own (the later message's run lists it in `trigger.messageIds`).

**6. Every step of the turn is recorded — `server/services/frontdesk-turn.js`**
- [ ] `runTurn` creates the run and finishes it in one place:
  `const run = startRun(db, conversation, { now: opts.now ?? Date.now(), mode: opts.mode ?? 'turn', feature:
  opts.feature, inbound: opts.inbound })`; it calls `runTurnInner(db, conversation, { ...opts, run })` inside
  `try` / `catch`: on a throw → `run.end('failed', 'error')`, `await run.finish({ log: opts.log })`, rethrow; on a
  return → `await run.finish({ log: opts.log })`, then the existing `assistantFailed` clean-up and `return result`.
  `runTurnInner` takes `run` from its options (default `NO_RUN`) and puts it on `base` (`{ now, profile, mode, log,
  run }`) so `blockTurn`, `handOff` and `holdGuest` reach it. No return value of `runTurn` changes.
- [ ] Three helpers get a return value the callers may ignore (no behaviour change): `handOff` returns
  `{ action: 'none' }` (silent, or mode not `turn`), `{ action: 'draft', chars }` (level 0: the sentence stored as the
  suggestion) or `{ action: 'sent', author: 'ai', messageId, chars }` / `{ action: 'sent', author: 'ai', refused:
  sent.reason }`; `holdGuest` returns `null` when it sends nothing, else `{ action: 'holding', author: 'server',
  messageId, chars }` or `{ action: 'holding', refused }`; `removeGuest` returns `{ action: 'removal_notice', author:
  'server', messageId, chars }` or `{ …, refused }`. `messageId` is `sent.message._id`; `chars` is the text's length.
- [ ] `decide` adds one field to each result, nothing else: `{ text: answer.reply, why: 'reply' }` (not a request or
  the kind is off), `{ handoff: true, why: 'open_request' }`, `{ text: answer.reply, why: 'missing', missing }`,
  `{ text: <rule sentences>, why: 'unfit' }`, `{ text: fixedText('fd_ai_will_confirm'), request, why: 'request' }`.
- [ ] The recording, by place in `runTurnInner` (statuses are `ok` unless said; every `in` / `out` holds ids, counts,
  enums and booleans — the only free text is `raw` in step 8):

| step | recorded where | `in` | `out` | status rule |
| --- | --- | --- | --- | --- |
| `inbound` | filled by `run.finish` from `inbound` and `trigger` | `{ at }` | `{ waitedMs, answers }` (`answers` = `trigger.messageIds.length`); no `inbound` option → `{ via: 'suggest' }` in suggest mode, else `{ via: 'direct' }` | `ms = waitedMs`; `note` when `answers > 1`; `skipped` when there is no `inbound` option |
| `setup` | `run.time` around the `frontDeskProfiles.findOne`; `not_bot` and `no_profile` → `run.discard()` before the existing `return` | — | `{ level, storedLevel, simulated, tone, kinds, activeHours, handoffText }`: `level` = `levelOf(profile)` after `turnProfile`, `storedLevel` = `levelOf(stored)`, `simulated` = `level !== storedLevel`, `tone` `'warm'` / `'formal'`, `kinds` = keys of the enabled `requestKinds`, `activeHours` / `handoffText` booleans (set or not); also `run.set({ level })` | — |
| `limit` | `run.time` around the `aiUsage.countDocuments` | `{ limit: FRONTDESK_DAILY_TURNS }` | `{ used }`; not counted → `{ why: 'test' }` (test conversation) or `{ why: 'suggest' }` | `stopped` when `used >= limit`, then `run.step('send', …)` from `holdGuest`'s return (`{ action: 'none' }` when it returned `null`) and `run.end('failed', 'quota')`; `skipped` when not counted |
| `history` | `run.time` around the two `messages` reads | `{ window: HISTORY_WINDOW }` | `{ messages, messageIds, aiTurns }`; then `run.set({ trigger })` (rule below) | — |
| `precheck` | `run.timeSync` around `isRemoval` / `preCheck` | `{ aiTurns, turnLimit: TURN_LIMIT }` (`TURN_LIMIT` from `frontdesk-guardrails`) | `{ ok: true }` or `{ ok: false, reason }` | `stopped` on a reason: `removal` → `send` from `removeGuest`'s return, `run.end('removed', 'removal')` (suggest mode: `send` `{ action: 'none' }`, `run.end('handover', 'removal')`); other reasons → `blockTurn` (below); `skipped` with `out.why: 'suggest'` when the mode is suggest and it is not a removal |
| `facts` | `run.time` around `publicFacts` + `tablesFor` | — | `{ factIds, factsChars, tablesOn, areas }` (`factsChars` = `facts.text.length`, `areas` = count) | — |
| `prompt` | `run.timeSync` around `buildTurnBody` | — | `{ rulesChars, leadChars, historyMessages, today }`: lengths of `body.systemInstruction.parts[0].text` and `body.contents[0].parts[0].text`, `body.contents.length - 1`, `todayBlock(now)`; then `run.set({ lead: body.contents[0].parts[0].text, tone, tablesOn })` | — |
| `ai` | `run.time` around `askTurnModel` | `{ feature }` (the `usage.feature` sent) | from `asked.trace`: `{ model, firstModel, attempts, raw, rawChars }`; `run.set({ model, firstModel })` | `stopped` when `!asked.ok` and the reason is not `bad_json` / `bad_shape`; `note` when a backup model answered (`model !== firstModel`) or `attempts.length > 1` |
| `shape` | `run.step` right after the call (`ms: 0`: the check runs inside step 8) | — | `{ tries: trace.shapeTries, ok, issue }` (`issue` only `'bad_json'` / `'bad_shape'`) | `stopped` when the reason is `bad_json` / `bad_shape`; `note` when ok on try 2; `skipped` when the call itself failed |
| (failure) | the existing `if (!asked.ok)` block | | `send` from `holdGuest`'s return (`{ action: 'none' }` for `null` or mode not `turn`) | `run.end('failed', group)` — `group` from `failureReason` |
| `guardrails` | `run.timeSync` around the one or two `applyGuardrails` calls; `run.set({ intent: asked.answer.intent })` | `{ replyWillBeSent }` (true when the second call ran) | `{ ok, reason, low, usedFacts, intentAfter }` (`reason` when blocked; `low: true` when marked; `usedFacts` and `intentAfter` from `verdict.answer` when ok) | `stopped` when not ok (also reason `model`); `note` when `low` or `intentAfter !== asked.answer.intent` |
| (blocked) | `blockTurn` (pre and post), and the `!verdict.ok` model-handoff block | | `send`: from `handOff`'s return; in suggest mode `{ action: 'draft', chars }` | `run.end('handover', reason)` — the guardrail or pre-check reason, `'model'` for the model's own flag |
| `tables` | `run.time` around `handleTableIntent` | `{ intent, date, time, partySize, areaKey }` from `answer.collected.table` (only the values that are a string / number) | `{ result, outboundKind, pending }`: `result` = `'handoff'` (`res.handoff`), `'request'` (`res.request`), `'offer'` (`res.pending` and `res.outbound.kind === 'button'`), `'ask'` (`res.pending`), else `'done'` | `skipped` with `out.why: 'tables_off'` (no `tables`) or `'not_a_table_intent'`; `stopped` on `result: 'handoff'` → `send` from `handOff` (suggest: draft), `run.end('handover', 'table_engine')`; the second `applyGuardrails` after `res.request` that blocks → `blockTurn` as above |
| `decide` | `run.timeSync` around the final `decide` call; a table turn that did not fall through records `out: { why: 'table_engine' }` | `{ intent, kind }` | `{ why, missing, requestWritten }` (`missing` = question keys, `requestWritten` set after `createRequest`) | `stopped` on `why: 'open_request'` → `send` from `handOff`, `run.end('handover', 'open_request')` |
| `send` | every exit: `finishSuggestion` → `{ action: 'draft', chars }`; `deliver` / `sendOut` → `{ action: 'sent', author, messageId, chars }` (`author` `'server'` for `deliver`, `'ai'` for the model's reply) or `{ action: 'sent', author, refused }` | — | as left | `note` when `refused` or `action: 'draft'`; run result: level 0 or suggest → `run.end('draft')`; a refused send of the answer → `run.end('failed', 'send_refused')`; else `run.end('asked')` when `decision.why === 'missing'` or (table turn) `res.pending`, otherwise `run.end('answered')` |

- [ ] `trigger` (set after the history read): `messageIds` = the `_id` of every message in `history` with
  `author: 'guest'` that comes after the newest message with `direction: 'out'` (all guest messages when there is no
  outbound one), oldest first; `text` = the text of the newest guest message in `history` (`buttonId` for a button
  message), `''` when there is none. A run that stops before the history read (the daily cap) keeps
  `{ messageIds: [], text: '' }`.
- [ ] The outcome is the decision; step 13 says what left the server. So a blocked turn of a real level-0 guest is
  `handover` with `send.out.action: 'draft'`, and a blocked suggestion is `handover` with a draft too.
- [ ] Button taps (`OK`, `ALT`, `OTHER`, `BK`, `CONFIRM`, `CANCEL` — `registerButton` handlers, no model call) are
  not runs and are not recorded.
- [ ] The file's doc comment gains: "Plan 752: every run is recorded step by step (`frontdesk-runs.js`); the record
  holds guest text and the AI's answer, the logs still never do."

**7. Runs go when their owner goes — `server/services/business.js`, `server/scripts/erase-client.js`,
`server/routes/sim.js`**
- [ ] `deleteBusinessServerData`: `'assistantRuns'` is added to the list of the delete loop (`business.js:121`), and
  its doc comment names "assistant runs (plan 752)".
- [ ] `runErase` (`erase-client.js:60-94`): after the plan is made, `runs` = with `write`: `deleteMany({ businessId,
  conversationId: { $in: plan.deleteConversations } })`'s `deletedCount`; without: the same filter's
  `countDocuments`; skipped (0) when the list is empty. `counts.runs` is added after `messages`, and `formatResult`
  prints `assistant runs: ${verb} ${c.runs}` after the messages line. `planErase` is unchanged.
- [ ] `DELETE /api/v1/sim/test-data` (`sim.js:97-117`): `'assistantRuns'` is added to the loop of collections deleted
  with `{ businessId, test: true }`, so "clear test data" also clears the test runs.

**8. The read routes — `server/routes/assistant-runs.js` (new), `server/app.js`**
- [ ] Mounted in `app.js` right after the conversations router (`:239`): `app.use('/api/v1/assistant-runs',
  assistantRunsRouter)`. `router.use(verifyToken, requireModule('frontdesk'), dataWriteLimiter)` as
  `routes/conversations.js:48`. Every handler first takes `const { businessId } = scopeFilter(req)` and then
  `if (!assertCan(req, res, 'editFrontDesk', { type: 'assistantRuns' })) return` — staff get 403 `FORBIDDEN`. The file
  holds no query of its own: it calls `listRuns`, `loadRun`, `markAdminView`.
- [ ] `GET /` — query: `filter` (`all` default | `answered` | `handover` | `fallback`), `scope` (`real` default |
  `test`), `limit` (1–100, default 50), `before` (a number); anything else → 400 `{ error: 'BAD_INPUT' }` (use the
  `queryInt` pattern of `routes/conversations.js`). Answer `{ runs, more, now: Date.now() }`. For a caller with
  `req.user.acting === 'platform'`, every row that is not `test` gets `text: ''` and `textHidden: true` (a real
  guest's words are shown to the platform admin only by opening the run, which leaves the trace). Log
  `assistant_runs.listed { count, filter, scope }`.
- [ ] `GET /:id` — `loadRun`; none → 404 `{ error: 'Run not found' }`. When `req.user.acting === 'platform'` and the
  run is not `test`: `markAdminView(db, run, req.user.userId, Date.now())` first, and `req.log.warn({ event:
  'assistant_runs.admin_read', runId, conversationId })` (the request logger already adds `userId`, `acting` and
  `actingIn`, `server/middleware/auth.js:75-77`; `warn` is the level the log store keeps, 90 days); when that write
  throws → 503 `{ error: 'TRACE_FAILED' }` and the run is not returned. Answer `{ run }` where `run` is the document
  (with the new `adminViews` row) without `prompt`, unless `isPlatformAdmin(req)` (`server/middleware/auth.js`): then
  `prompt` stays and, when it exists, `promptRules` is added — `TURN_SYSTEM_PROMPT.replace('{{TONE}}',
  run.prompt.tone) + (run.prompt.tablesOn ? '\n' + TABLE_SYSTEM_PROMPT : '')` (today's rules from
  `server/services/frontdesk-prompt.js`). Log `assistant_runs.read { runId }` (info).
- [ ] Failures: `req.log.error({ err, event: 'assistant_runs.list.failed' | 'assistant_runs.read.failed' })` and 500
  `{ error: 'Server error' }`. No log line of this file carries text from a run.

**9. The browser side — model, service, helpers**
- [ ] `src/app/core/models/assistant-run.model.ts` (new): re-exports `RUN_STEP_KEYS`, `RUN_OUTCOMES`, `RUN_REASONS`
  and the types `RunStep`, `RunStepKey`, `RunOutcome` from `@schemas/entities`; `AssistantRunView = Omit<AssistantRun,
  'expiresAt'> & { expiresAt: string; promptRules?: string }`; `AssistantRunRow = { _id: string; conversationId:
  string; test?: true; mode: 'turn' | 'suggest'; startedAt: number; ms: number; outcome: RunOutcome; reason?: string;
  fallbackUsed: boolean; model?: string; text: string; textHidden?: true }`; `RunFilter = 'all' | 'answered' |
  'handover' | 'fallback'`.
- [ ] `src/app/core/services/http-storage.adapter.ts`: `assistantRuns: \`${API_ROOT}/assistant-runs\`` in `API`,
  beside `conversations`.
- [ ] `src/app/core/services/assistant-run-data.service.ts` (new, `providedIn: 'root'`, `inject()` only): readonly
  signals `runs_`, `more_`, `listLoaded_`, `listFailed_`, `loadingMore_`, `run_`, `runLoading_`, `runFailed_`
  (`'not_found' | 'failed' | null`); methods `list({ filter, test })` (replaces the list; on failure sets
  `listFailed_` and keeps the rows it had), `loadMore()` (the same filter with `before` = the last row's `startedAt`,
  appends), `open(id)` (sets `runLoading_`, then `run_` or `runFailed_`: 404 → `'not_found'`), `closeRun()`. Failures
  are logged through `LoggingService` with an event (`assistant_runs.list.failed` / `assistant_runs.open.failed`), the
  HTTP status and nothing from a run.
- [ ] `src/app/pages/frontdesk/assistant/assistant-run-view.util.ts` (new, pure):
  - `outcomeTone(outcome)` → `'green'` (`answered`, `asked`), `'amber'` (`draft`), `'red'` (`handover`, `failed`,
    `removed`).
  - `reasonKey(reason)` → `'asr_reason_' + reason` when `reason` is in `RUN_REASONS`, else `'asr_reason_unknown'`.
  - `verdictOf(run)` → `{ key: 'asr_verdict_' + outcome, params: { reason: <reasonKey or ''>, step: <'asr_step_' +
    the key of the first step whose status is `stopped`, or ''> } }`; the page translates the two params and replaces
    `{reason}` / `{step}` in the sentence.
  - `STEP_FIELDS: Record<RunStepKey, { in: FieldDef[]; out: FieldDef[] }>` with `FieldDef = { name: string;
    labelKey: string; kind: 'text' | 'number' | 'ms' | 'count' | 'bool' | 'enum' | 'list' | 'raw'; enumPrefix?:
    string }` — exactly the fields of the table under "UI/UX Notes"; `stepRows(step, side: 'in' | 'out')` →
    `{ labelKey, kind, value, valueKey? }[]` for the registered fields that are present (`count` shows an array's
    length, `list` joins up to 12 short values with ", ", `ms` shows seconds with one decimal, `bool` gives
    `valueKey` `'yes'` / `'no'`, `enum` gives `valueKey = enumPrefix + value`). A field that is in the record but not
    in `STEP_FIELDS` is not shown (plans 754 and 755 add their fields by adding a row here).

**10. The page — `src/app/pages/frontdesk/assistant/` (new), route, links**
- [ ] `src/app/app.routes.ts` (append, after the `frontdesk/knowledge` route): `frontdesk/assistant` and
  `frontdesk/assistant/runs/:id`, both `loadComponent: () => import('./pages/frontdesk/assistant/assistant.page')
  .then(m => m.AssistantPage)`, `canActivate: [authGuard, moduleGuard(['frontdesk'])]`.
- [ ] `assistant.page.ts` — `AssistantPage`, standalone, `OnPush`, signals only. `allowed_ = computed(() =>
  permission.isOwner_() || user.isPlatformAdmin_())` (the rule of the simulator link, `inbox.page.ts:84`); `tabs =
  [{ key: 'runs', labelKey: 'asr_tab_runs', icon: 'activity' }]`, `activeTab_ = signal<'runs'>('runs')`; `filter_ =
  signal<RunFilter>('all')`; `testScope_ = signal(false)`, set to true on entry when the query has `scope=test`;
  `id_` from the route's `id` param; an `effect` calls `data.list({ filter, test })` when the filter or the scope
  changes, and `data.open(id)` when `id_()` is set (`data.closeRun()` when it is cleared); `refresh()` reads the list
  again; `rowTime(ms)` gives `HH:mm` for a run of today (Jerusalem) and `dd/MM HH:mm` otherwise (the `Intl`
  formatters of `inbox.page.ts:46-53`); `seconds(ms)` gives `(ms / 1000).toFixed(1)`.
- [ ] `assistant.page.html`, top to bottom: `<section class="c-page asr" dir="rtl" [class.asr--open]="id_()"
  data-testid="assistant-page">`; `app-page-header titleKey="asr_title"` with one `header-actions` button
  (`c-btn-ghost`, icon `refresh-cw`, label `asr_refresh`, `data-testid="asr-refresh"`); not allowed →
  `app-empty-state messageKey="asr_owner_only" icon="lock"` and nothing else; the tab strip (`role="tablist"`,
  `app-scroll-rail`, one `button role="tab" class="c-chip c-chip--tab active"` per entry of `tabs`,
  `data-testid="asr-tab-runs"`); the tab panel `div.asr-body role="tabpanel"` with two columns:
  - `aside.asr-list` (`data-testid="asr-list"`): the filter chips (`.c-chip-group` radiogroup, `c-chip
    c-chip--toggle`, `data-testid="asr-filter-<filter>"`, labels `asr_filter_<filter>`) and one more toggle chip
    (checkbox) `asr_scope_test` (`data-testid="asr-scope-test"`); then: list not loaded → `app-loader size="medium"`;
    failed with no rows → `app-empty-state messageKey="asr_load_failed" icon="activity" ctaLabelKey="retry"
    (ctaClick)="refresh()"`; no rows → `app-empty-state [messageKey]="filter_() === 'all' ? 'asr_empty' :
    'asr_empty_filter'" icon="activity"`; else `ul.c-list role="list"` of `li.c-list-row.c-list-row--link`
    (`data-testid="asr-row"`, `.is-selected` on the open one): first cell — the link `a.c-row-link`
    (`[routerLink]="['/frontdesk/assistant/runs', row._id]"`, `queryParamsHandling="preserve"`) whose text is the
    guest's message cut by CSS to one line (`asr_text_hidden` when `row.textHidden`, `asr_no_text` when the text is
    empty); end cell — the time, the duration (`{{ seconds(row.ms) }} {{ 'asr_seconds' | translatePipe }}`), the
    result tag (`c-chip c-chip--tag c-chip--sm` + the tone, text `asr_outcome_<outcome>`), `asr_fallback_mark`
    (tone amber, `data-testid="asr-fallback"`) when `row.fallbackUsed`, and the existing `rq_test_tag` when
    `row.test`; under the list a `c-btn-ghost` "load more" (`asr_load_more`, `data-testid="asr-more"`, disabled with
    an inline `app-loader` while `loadingMore_()`), shown only when `more_()`.
  - `div.c-glass-panel.asr-detail` (`data-testid="asr-detail"`): no id → `app-empty-state messageKey="asr_pick"
    icon="activity"`; loading → `app-loader`; `runFailed_() === 'not_found'` → `app-empty-state
    messageKey="asr_not_found"`; `'failed'` → `app-empty-state messageKey="asr_run_load_failed" ctaLabelKey="retry"`
    (reads the run again); else `<app-run-detail [run]="run" [isAdmin]="isAdmin_()" />`.
- [ ] `components/run-detail/run-detail.component.{ts,html,scss,spec.ts}` — `RunDetailComponent`
  (`app-run-detail`), inputs `run = input.required<AssistantRunView>()`, `isAdmin = input(false)`; state: `open_ =
  signal<Set<RunStepKey>>` (on a new run: the first `stopped` step is open, else none), `promptOpen_ = signal(false)`.
  Template: a head with the back link (`a.c-btn-ghost--sm`, `routerLink="/frontdesk/assistant"`,
  `queryParamsHandling="preserve"`, shown on the phone only, `data-testid="asr-back"`), the verdict sentence
  (`p.asr-verdict`, `role="status"`, `data-testid="asr-verdict"`), the tags of the row, the time and total duration,
  the model (`asr_model` + name, when set), a link "to the conversation" (`asr_open_conversation`,
  `[routerLink]="['/inbox', run().conversationId]"`), the line `asr_expires` with the date of `expiresAt`, and — when
  `run().adminViews?.length` — the line `asr_admin_viewed` with the date of the newest view
  (`data-testid="asr-admin-viewed"`). Then `ol.asr-steps`: for each of the 13 steps one `li` with a
  `button.asr-step` (`type="button"`, `[attr.aria-expanded]`, `[attr.aria-controls]="'asr-step-' + step.key"`,
  `[attr.data-testid]="'asr-step-' + step.key"`): the step number, its name (`asr_step_<key>`), a status tag
  (`asr_status_<status>`; tones: `ok` green, `note` amber, `stopped` red, `skipped` none) and the duration
  (`seconds(step.ms)`, not shown for `skipped`), a `chevron-down` icon; the open panel (`div[id]`) shows two titled
  groups, `asr_in` and `asr_out`, each a `dl.asr-fields` of `stepRows(...)` (label `dt`, value `dd`); a group with no
  rows is left out; a step with neither shows `asr_step_nothing`; the field of kind `raw` is drawn as
  `pre.asr-raw dir="ltr"` (wrapping, no scroll area of its own) under the label `asr_f_raw`. For the admin only
  (`isAdmin()`): a `c-btn-ghost` "open the full prompt" (`asr_prompt_open`, `data-testid="asr-prompt-toggle"`) that
  shows / hides two `pre.asr-raw` blocks titled `asr_prompt_rules` (`promptRules`) and `asr_prompt_data`
  (`prompt.lead`, plus the line `asr_prompt_cut` when `prompt.truncated`); when the run has no `prompt`, the button is
  replaced by the line `asr_prompt_not_kept`. Enter / Space on a step button toggles it (native button).
- [ ] `assistant.page.scss` / `run-detail.component.scss`: logical properties only, tokens only, no typed
  transition time, no `overflow: auto | scroll` (the page scrolls as a whole). `.asr-body` is a two-column grid
  (`22rem minmax(0, 1fr)`; `18rem` under `$break-tablet-max`); under `$break-phone-max` one column, where
  `.asr--open .asr-list` and `.asr:not(.asr--open) .asr-detail` are hidden (the inbox's rule,
  `inbox.page.scss:151-160`) and the back link shows. The row's text cell is one line with an ellipsis.
- [ ] Links: `src/app/pages/inbox/inbox.page.html` — inside the existing `@if (canSimulate_())`, after the simulator
  link, a second `header-actions` link `a.c-btn-ghost routerLink="/frontdesk/assistant"` with icon `activity`, label
  `asr_link`, `data-testid="asr-link"`. `src/app/pages/frontdesk/simulator/simulator.page.html` — the page header
  gets, when `allowed_()`, a `header-actions` link `a.c-btn-ghost routerLink="/frontdesk/assistant"
  [queryParams]="{ scope: 'test' }"` with icon `activity`, label `asr_link`, `data-testid="sim-asr-link"`
  (`simulator.page.ts` adds `RouterLink` to its imports only if it is not there already).
- [ ] `public/assets/data/dictionary.json` — append the keys listed under "UI/UX Notes" to `general`.

**11. Maps and docs**
- [ ] `server/breadcrumbs.md`: new rows for `services/frontdesk-runs.js` ("`startRun`, `listRuns`, `loadRun`,
  `markAdminView` (plan 752, C-RUNS): the step-by-step record of an assistant run in `assistantRuns`, 30 days") and
  `routes/assistant-runs.js` ("Mounted at `/api/v1/assistant-runs` (plan 752): list and one run; owner / consultant /
  acting platform admin; a real run opened by the acting admin leaves a trace"); the rows of
  `services/frontdesk-turn.js`, `services/inbound.js` and `routes/sim.js` gain "plan 752: …" (recorded step by step;
  the measured wait; clear test data also clears test runs).
- [ ] `src/app/pages/breadcrumbs.md`: a row `frontdesk/assistant/` — "`/frontdesk/assistant`,
  `/frontdesk/assistant/runs/:id` — what the assistant did (plan 752): a tab strip (one tab, the runs), the list with
  filter chips and the test switch, one run step by step; owner / platform admin; opened from the inbox and the
  simulator headers". `src/app/core/services/breadcrumbs.md` and `src/app/core/models/breadcrumbs.md`: one row each
  for the new service and model.
- [ ] `docs/agent/standards-backend.md`: the registry table gets the row `assistantRuns` (Restaurant · "One run of
  the front-desk assistant, step by step (plan 752, C-RUNS). Server-only. Indexes `assistant_runs_business_started`,
  `assistant_runs_conversation`, TTL `assistant_runs_ttl` (30 days)"), and the API table the two routes of section 8
  with who may call them.
- [ ] `docs/restaurant/restaurant-map.md`, at the end of the run's Contract extensions: `752 · C-RUNS (new) · every
  assistant run is one `assistantRuns` document (13 fixed step keys, outcome, reason, 30-day TTL) written by
  `frontdesk-runs.js`; read through `/api/v1/assistant-runs` with `editFrontDesk`; logs still carry no guest text ·
  the Human's request of 2026-11-26`.
- [ ] `docs/brain/component-families.md`: new family `### assistant-runs — the step-by-step record of an assistant
  run and its page (plan 752)` with Status, Use (the recorder API, the route, `AssistantRunDataService`,
  `AssistantPage`, `app-run-detail`, `assistant-run-view.util.ts`, the page-local classes `.asr-*`), Pieces, When
  ("any new fact about a run is a field of an existing step, registered in `STEP_FIELDS`; a second recorder, a second
  runs list or a log line with run content is never added") and Known copies: none. Then `node scripts/inventory.mjs`
  and commit `docs/brain/inventory.md` if it changed.

**12. Tests** (beyond the Done-when items above)
- [ ] `server/test/frontdesk-runs.test.js`: (a) a run with two timed steps and `end('answered')` stores 13 steps in
  `RUN_STEP_KEYS` order, the untouched ones `skipped` with `ms: 0`; (b) `step` merges `in` / `out` and clips: a
  400-character string becomes 300, `raw` of 5,000 becomes 4,000, an array of 300 becomes 200; (c) `time` rethrows
  the function's error and marks the step `stopped` with `out.error`; (d) `discard()` and `NO_RUN` write nothing;
  (e) a document that fails the schema (an unknown `outcome`) is not stored, `finish` resolves, one
  `frontdesk.run.record_failed` record with `reason: 'schema'`; (f) `prompt` is stored for `handover` and `failed`
  and left out for `answered`, and a 9,000-character lead is stored as 8,000 with `truncated: true`; (g) `listRuns`:
  newest first, each filter, `test` apart from real, `before` + `limit` with `more`; (h) `loadRun` with another
  business's id → `null`; (i) the three indexes exist by name on the test database; (j)
  `deleteBusinessServerData` deletes the runs of that business and leaves another business's; (k)
  `RUN_REASONS`: every entry has the key `asr_reason_<entry>` in `public/assets/data/dictionary.json`, and every
  `RUN_STEP_KEYS` / `RUN_OUTCOMES` entry has `asr_step_<key>` / `asr_outcome_<outcome>` and `asr_verdict_<outcome>`.
- [ ] `server/test/erase-client.test.js`: the exact `counts` expectation gains `runs`; a new case: runs of an erased
  client's conversation are deleted with `--write`, another conversation's runs stay.
- [ ] `server/test/sim-router.test.js`: the `deleted` expectation gains `assistantRuns: 1` (seed one test run and one
  real run; the real one stays).
- [ ] `assistant-run-data.service.spec.ts`: `list` sends `filter` / `scope` params and fills `runs_` / `more_`; a
  failed list sets `listFailed_` and keeps the old rows; `loadMore` sends `before`; `open` 404 → `'not_found'`.
- [ ] `assistant-run-view.util.spec.ts`: `verdictOf` for each outcome (a `handover` names the stopped step and the
  reason key; an unknown reason gives `asr_reason_unknown`); `stepRows` shows registered fields only, a count for an
  array, seconds for `ms`; `outcomeTone` for all six outcomes.
- [ ] `assistant.page.spec.ts`: staff see `asr_owner_only` and no list; the loader before the first answer; the
  empty state `asr_empty` (and `asr_empty_filter` under a filter); the failed state with a retry that calls `list`
  again; rows show the text, the result tag, the test tag and the fallback mark; a `textHidden` row shows
  `asr_text_hidden`; pressing a filter chip and the test switch call `list` with the new values; `?scope=test` turns
  the switch on; "load more" shows only when `more_()`; with an id the detail shows, without one `asr_pick`.
- [ ] `run-detail.component.spec.ts`: 13 step buttons in order; the first `stopped` step starts open and the others
  closed; a click toggles `aria-expanded`; the verdict text; the raw block only inside the open `ai` step; the prompt
  button only when `isAdmin` is true, and `asr_prompt_not_kept` when the run has no `prompt`; `asr_admin_viewed` only
  with `adminViews`.
- [ ] `inbox.page.spec.ts`: the existing case "shows the simulator link to an owner and hides it from staff" also
  expects `asr-link` for the owner and none for staff. `simulator.page.spec.ts`: `sim-asr-link` is shown to an owner.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: recipe-list — `/frontdesk/assistant` (the runs list in a side column with the open run beside it, the
  inbox's layout of plan 677; the open run is one `.c-glass-panel` whose parts follow recipe-detail). States: loading
  — `app-loader`; empty — `app-empty-state`; nothing under a filter — `app-empty-state`; error — `app-empty-state`
  with retry (a read page has no toast to hang an error on); no permission — `app-empty-state` with a lock; phone —
  the page scrolls as a whole, the list first, an opened run replaces the list and has a back link.
- Hebrew, RTL; logical CSS properties only. Raw AI text and the prompt blocks are `dir="ltr"`.
- Plain words for an owner: no JSON anywhere except the block "התשובה הגולמית של ה-AI" inside step 8 and the admin's
  prompt blocks. A step shows labelled values only.
- Icons: `activity`, `refresh-cw`, `chevron-down`, `lock`, `arrow-right` — all registered in `src/app/app.config.ts`
  on the Snapshot; no new icon.
- Data flow: `AssistantRunDataService` signals (`runs_`, `run_`, their load and failure flags) → the page's
  `computed()` values (`allowed_`, `id_`, the row view) → the template; `run` → `app-run-detail` input → `computed()`
  verdict and step rows → the template.

**Dictionary keys** (all new, appended to `general` in `public/assets/data/dictionary.json`):

| key | Hebrew |
| --- | --- |
| `asr_title` | מה העוזר עשה |
| `asr_link` | מה העוזר עשה |
| `asr_tab_runs` | הודעות שטופלו |
| `asr_refresh` | רענון |
| `asr_owner_only` | הדף פתוח לבעל העסק בלבד |
| `asr_filter_all` | הכול |
| `asr_filter_answered` | נענו |
| `asr_filter_handover` | הועברו לצוות |
| `asr_filter_fallback` | נעזר ב-AI גיבוי |
| `asr_scope_test` | שיחות בדיקה |
| `asr_empty` | עדיין אין כאן מה להציג: העוזר עוד לא טיפל בהודעות |
| `asr_empty_filter` | אין הודעות שמתאימות לסינון הזה |
| `asr_load_failed` | לא הצלחנו לטעון את הרשימה |
| `asr_run_load_failed` | לא הצלחנו לטעון את הפרטים |
| `asr_not_found` | הרשומה לא נמצאה. ייתכן שנמחקה אחרי 30 יום |
| `asr_pick` | בחרו הודעה מהרשימה כדי לראות מה העוזר עשה איתה, שלב אחרי שלב |
| `asr_load_more` | טען עוד |
| `asr_seconds` | שנ׳ |
| `asr_no_text` | (בלי טקסט) |
| `asr_text_hidden` | הודעת אורח — הטקסט מוצג רק בפתיחת הרשומה |
| `asr_fallback_mark` | AI גיבוי |
| `asr_model` | מודל |
| `asr_open_conversation` | לשיחה |
| `asr_expires` | נמחק אוטומטית ב-{date} |
| `asr_admin_viewed` | צוות FoodVibe צפה ברשומה הזו ב-{date} |
| `asr_in` | מה נכנס לשלב |
| `asr_out` | מה יצא ממנו |
| `asr_step_nothing` | אין פרטים לשלב הזה |
| `asr_prompt_open` | הצגת הבקשה המלאה ל-AI |
| `asr_prompt_rules` | הכללים (כפי שהם בקוד היום) |
| `asr_prompt_data` | הנתונים שנשלחו |
| `asr_prompt_cut` | הנתונים קוצרו ל-8,000 תווים |
| `asr_prompt_not_kept` | הבקשה המלאה נשמרת רק כשהעוזר נעצר או נכשל |
| `asr_outcome_answered` | ענה לאורח |
| `asr_outcome_asked` | שאל שאלה חזרה |
| `asr_outcome_draft` | הכין טיוטה לצוות |
| `asr_outcome_handover` | הועבר לצוות |
| `asr_outcome_failed` | תקלה טכנית |
| `asr_outcome_removed` | בקשת הסרה |
| `asr_verdict_answered` | העוזר ענה לאורח. |
| `asr_verdict_asked` | העוזר שאל את האורח שאלה חזרה. |
| `asr_verdict_draft` | העוזר הכין טיוטה לצוות ולא שלח דבר לאורח. |
| `asr_verdict_handover` | העוזר העביר את השיחה לצוות. נעצר בשלב "{step}": {reason}. |
| `asr_verdict_failed` | תקלה טכנית: {reason}. השיחה עברה לצוות. |
| `asr_verdict_removed` | האורח ביקש שלא יפנו אליו. נשלחה הודעת אישור והשיחה עברה לצוות. |
| `asr_status_ok` | תקין |
| `asr_status_note` | הערה |
| `asr_status_stopped` | נעצר כאן |
| `asr_status_skipped` | דולג |
| `asr_step_inbound` | הודעת האורח התקבלה |
| `asr_step_setup` | טעינת הגדרות העסק |
| `asr_step_limit` | בדיקת המכסה היומית |
| `asr_step_history` | קריאת השיחה |
| `asr_step_precheck` | בדיקה מוקדמת |
| `asr_step_facts` | איסוף המידע על העסק |
| `asr_step_prompt` | הכנת הבקשה ל-AI |
| `asr_step_ai` | שאילת ה-AI |
| `asr_step_shape` | בדיקת מבנה התשובה |
| `asr_step_guardrails` | בדיקות בטיחות |
| `asr_step_tables` | מנוע השולחנות |
| `asr_step_decide` | החלטה |
| `asr_step_send` | שליחה או טיוטה |
| `asr_reason_quota` | המכסה היומית של העוזר נגמרה |
| `asr_reason_busy` | שירות ה-AI היה עמוס |
| `asr_reason_timeout` | ה-AI לא ענה בזמן |
| `asr_reason_other` | תקלה בשירות ה-AI |
| `asr_reason_error` | שגיאה במערכת |
| `asr_reason_send_refused` | ההודעה לא נשלחה לאורח |
| `asr_reason_removal` | האורח ביקש שלא יפנו אליו |
| `asr_reason_keyword` | האורח ביקש נציג, או כתב מילה שמעבירה לצוות |
| `asr_reason_outside_hours` | מחוץ לשעות הפעילות של העוזר |
| `asr_reason_turn_limit` | העוזר הגיע למספר התשובות המרבי בשיחה |
| `asr_reason_model` | ה-AI ביקש להעביר לאדם |
| `asr_reason_low_content` | שתי תשובות בלי תוכן ברצף |
| `asr_reason_internals` | התשובה חשפה פרטים פנימיים |
| `asr_reason_invented_link` | התשובה כללה קישור שלא מופיע במידע על העסק |
| `asr_reason_deferred` | התשובה הבטיחה לבדוק ולחזור |
| `asr_reason_completion_claim` | התשובה טענה שהזמנה אושרה או בוצעה |
| `asr_reason_unsupported_time` | התשובה כללה שעה שלא מופיעה במידע על העסק |
| `asr_reason_table_number` | התשובה כללה מספר שולחן |
| `asr_reason_unsupported_price` | התשובה כללה מחיר שלא מופיע במידע על העסק |
| `asr_reason_table_engine` | מנוע השולחנות העביר לצוות |
| `asr_reason_open_request` | לאורח כבר יש בקשה פתוחה |
| `asr_reason_unknown` | סיבה אחרת |

**Step fields** — `STEP_FIELDS` (name in the record · `kind` · label key · Hebrew). Enum values use the prefix shown.

| step · side | name | kind | key | Hebrew |
| --- | --- | --- | --- | --- |
| inbound · out | `waitedMs` | ms | `asr_f_waited` | המתנה להודעה נוספת |
| inbound · out | `answers` | number | `asr_f_answers` | כמה הודעות נענו יחד |
| inbound · out | `via` | enum `asr_via_` | `asr_f_via` | איך התחיל |
| setup · out | `level` | number | `asr_f_level` | רמת העוזר |
| setup · out | `simulated` | bool | `asr_f_simulated` | בסימולטור (כמו רמה 1) |
| setup · out | `tone` | enum `asr_tone_` | `asr_f_tone` | סגנון |
| setup · out | `kinds` | list | `asr_f_kinds` | סוגי בקשות פעילים |
| limit · in | `limit` | number | `asr_f_limit` | מכסה יומית |
| limit · out | `used` | number | `asr_f_used` | תשובות עד עכשיו היום |
| limit, precheck, tables · out | `why` | enum `asr_why_` | `asr_f_why` | למה דולג |
| history · out | `messages` | number | `asr_f_messages` | הודעות שנקראו |
| history · out | `aiTurns` | number | `asr_f_ai_turns` | תשובות העוזר בשיחה עד כה |
| precheck, guardrails · out | `reason` | enum `asr_reason_` | `asr_f_reason` | סיבה |
| facts · out | `factIds` | count | `asr_f_facts` | פריטי מידע שנשלחו |
| facts · out | `factsChars` | number | `asr_f_facts_chars` | אורך המידע (תווים) |
| facts · out | `tablesOn` | bool | `asr_f_tables_on` | שירות שולחנות פעיל |
| prompt · out | `today` | text | `asr_f_today` | התאריך והשעה שנשלחו |
| prompt · out | `leadChars` | number | `asr_f_lead_chars` | אורך הנתונים (תווים) |
| prompt · out | `historyMessages` | number | `asr_f_history_sent` | הודעות מהשיחה שנשלחו |
| ai · out | `model` | text | `asr_f_model` | המודל שענה |
| ai · out | `attempts` | count | `asr_f_attempts` | ניסיונות |
| ai · out | `raw` | raw | `asr_f_raw` | התשובה הגולמית של ה-AI |
| shape · out | `tries` | number | `asr_f_tries` | ניסיונות קריאה |
| shape · out | `issue` | enum `asr_issue_` | `asr_f_issue` | הבעיה |
| guardrails · out | `usedFacts` | count | `asr_f_used_facts` | פריטי מידע שהתשובה נשענה עליהם |
| guardrails · out | `low` | bool | `asr_f_low` | תשובה בלי תוכן |
| guardrails · out | `intentAfter` | enum `asr_intent_` | `asr_f_intent` | כוונה |
| tables · in | `intent` | enum `asr_intent_` | `asr_f_intent` | כוונה |
| tables · in | `date` | text | `asr_f_date` | תאריך |
| tables · in | `time` | text | `asr_f_time` | שעה |
| tables · in | `partySize` | number | `asr_f_party` | מספר סועדים |
| tables · out | `result` | enum `asr_table_` | `asr_f_table_result` | מה המנוע עשה |
| decide · out | `why` | enum `asr_decide_` | `asr_f_decide` | ההחלטה |
| decide · out | `missing` | count | `asr_f_missing` | פרטים שחסרים |
| decide · out | `requestWritten` | bool | `asr_f_request_written` | נפתחה בקשה |
| send · out | `action` | enum `asr_send_` | `asr_f_action` | מה נעשה |
| send · out | `refused` | text | `asr_f_refused` | השליחה נדחתה |
| send · out | `chars` | number | `asr_f_chars` | אורך ההודעה (תווים) |

Enum value keys (also appended): `asr_via_suggest` בקשת טיוטה מהצוות · `asr_via_direct` החזרה לעוזר ·
`asr_tone_warm` חם · `asr_tone_formal` רשמי · `asr_why_test` שיחת בדיקה · `asr_why_suggest` טיוטה לצוות ·
`asr_why_tables_off` שירות שולחנות כבוי · `asr_why_not_a_table_intent` לא בקשת שולחן · `asr_issue_bad_json`
התשובה לא הייתה במבנה שאפשר לקרוא · `asr_issue_bad_shape` חסרו שדות בתשובה · `asr_intent_question` שאלה ·
`asr_intent_request` בקשה · `asr_intent_book` הזמנת שולחן · `asr_intent_change` שינוי הזמנה · `asr_intent_cancel`
ביטול הזמנה · `asr_intent_smalltalk` שיחת חולין · `asr_intent_other` אחר · `asr_table_offer` הוצע שולחן ·
`asr_table_ask` נשאלה שאלה · `asr_table_done` בוצע · `asr_table_handoff` הועבר לצוות · `asr_table_request` נפתחה
בקשה · `asr_decide_reply` נשלחת תשובת ה-AI · `asr_decide_missing` חסרים פרטים, נשאלת שאלה · `asr_decide_unfit`
הבקשה לא עומדת בכללי העסק · `asr_decide_request` נפתחה בקשה לאישור העסק · `asr_decide_open_request` כבר יש בקשה
פתוחה · `asr_decide_table_engine` לפי מנוע השולחנות · `asr_send_sent` נשלחה הודעה לאורח · `asr_send_draft` נשמרה
טיוטה לצוות · `asr_send_holding` נשלחה הודעת המתנה · `asr_send_removal_notice` נשלחה הודעת אישור הסרה ·
`asr_send_none` לא נשלח דבר. Existing keys reused: `retry`, `back`, `rq_test_tag`. For the yes / no of a `bool`
field append `asr_yes` כן and `asr_no` לא (`stepRows` gives `valueKey` `'asr_yes'` / `'asr_no'`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the stored shape and the collection for assistant runs, deleted by themselves after 30 days — the Zod schema with its constants, the registry entries, the collection row, the three indexes with the TTL one — shared/schemas/entities/assistant-run.schema.ts, shared/schemas/entities/index.ts, server/constants/collections.js, server/db.js
- [ ] A2: Build the recorder that collects the steps of a run and saves it once at the end — startRun with time, step, set, end, discard, finish, the clipping, NO_RUN, listRuns, loadRun, markAdminView, the unit tests a to k — server/services/frontdesk-runs.js, server/test/frontdesk-runs.test.js
- [ ] A3: Let the AI call report which model answered, each try and the raw answer — the trace field on both results of askTurnModel, no change to its other fields or to the model client — server/routes/ai/frontdesk.js
- [ ] A4: Record every step of the assistant's turn and the wait before it — runTurn starts and finishes the run, the recording table, the three helper return values, decide's why, the measured wait, the turn, table and inbound tests — server/services/frontdesk-turn.js, server/services/inbound.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-tables.test.js, server/test/inbound.test.js
- [ ] A5: Delete runs together with their business, their guest and the test data — the business delete loop, the erase script with its count, clear test data, their tests — server/services/business.js, server/scripts/erase-client.js, server/routes/sim.js, server/test/erase-client.test.js, server/test/sim-router.test.js
- [ ] A6: Add the two read routes with the owner-only rule and the trace of an admin's look — list with filters and paging, one run, hidden guest text and the trace for the acting platform admin, the prompt for the admin only, route tests — server/routes/assistant-runs.js, server/app.js, server/test/assistant-runs-router.test.js
- [ ] A7: Add the browser's model, data service and the helpers that turn a run into plain lines — the types, the API address, the signals and methods, verdictOf, stepRows and STEP_FIELDS, their specs — src/app/core/models/assistant-run.model.ts, src/app/core/services/http-storage.adapter.ts, src/app/core/services/assistant-run-data.service.ts, src/app/core/services/assistant-run-data.service.spec.ts, src/app/pages/frontdesk/assistant/assistant-run-view.util.ts, src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts
- [ ] A8: Build the page with its tab strip, the list of runs and the open run step by step — the page, the run detail component, every state, the words in the dictionary, the specs — src/app/pages/frontdesk/assistant/**, public/assets/data/dictionary.json
- [ ] A9: Make the page reachable: its route and the links from the inbox and the simulator — two routes, the two header links, the two spec cases — src/app/app.routes.ts, src/app/pages/inbox/inbox.page.html, src/app/pages/inbox/inbox.page.spec.ts, src/app/pages/frontdesk/simulator/simulator.page.html, src/app/pages/frontdesk/simulator/simulator.page.ts, src/app/pages/frontdesk/simulator/simulator.page.spec.ts
- [ ] A10: Write down where the new pieces live — folder maps, the backend standards rows, the restaurant map's Contract line, the new registry family and the inventory — server/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, docs/agent/standards-backend.md, docs/restaurant/restaurant-map.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A11: Run every check of this plan and hand Dandan the three page checks — test:server, test:ci, build, both lints, the icon lint, the inventory check, log-query; evidence into Execution Notes; the slot's servers up before the cards

## Technical Considerations
- Dependencies: plan 751 (merged first; same files). Plans 679 (the turn), 689 (guardrails), 680 (table dialogue),
  701 / 731 (failure reasons, the shape retry), 719 / 733 (levels, the simulator as level 1, the holding message),
  675 / 687 (inbound, conversations routes), 631 (acting sessions).
- New files needed: listed under Read-Write Scope.
- Model changes: new `AssistantRun` shape; no change to `conversations` or `messages`.
- Backend / API: `GET /api/v1/assistant-runs`, `GET /api/v1/assistant-runs/:id` (section 8). A dedicated router is
  justified (plan-checks "Data and API"): the collection is written only by the server, people only read it, the list
  is filtered and paged on the server, the acting admin's read hides text and leaves a trace — none of which the
  generic `/api/v1/data/:type` contract does; the collection is therefore `userData: false`, like `conversations`.
  New log events: `frontdesk.run.recorded` (info), `frontdesk.run.record_failed` (warn), `assistant_runs.listed`,
  `assistant_runs.read` (info), `assistant_runs.admin_read` (warn), `assistant_runs.list.failed`,
  `assistant_runs.read.failed` (error).
- Auth and validation: token + module `frontdesk` + `assertCan(…, 'editFrontDesk')`: the owner; a consultant with a
  live grant (ADR 0032: the owner's rights minus team and settings); the platform admin acting in the business
  (`businessRole: 'owner'`, `acting: 'platform'`); staff 403. The business always comes from the signed token. Query
  values are checked (`filter`, `scope`, `limit`, `before`); a run id is only ever used in `{ _id, businessId }`.
- Security surface / privacy: a run holds the guest's last message (≤ 300 characters), the AI's raw answer (≤ 4,000)
  and, for stopped or failed runs, the data block of the prompt (≤ 8,000: the business's own facts, request kinds and
  the date — no guest text; the conversation itself is referenced by message ids only). It lives in the
  business-scoped collection beside `messages` (which already keeps guest text for 365 days) and nowhere else; no log
  line gets any of it (tested). It is deleted after 30 days, with the business, with the guest (`erase-client`) and,
  for test runs, with "clear test data". The platform admin sees a real guest's words only by opening a run in an
  acting session, which writes `adminViews { at, userId }` on the run (the owner sees the line "צוות FoodVibe צפה…")
  and one kept log line with the admin's user id, the business and the run id. No secret is read or stored; the
  prompt's fixed rules are not stored (they are code).
- Data / migration: none. The indexes are created at start-up (`createIndex` is idempotent). Size on the Atlas free
  tier (512 MB for everything, no paid tier): a typical run is about 4 KB — 13 steps ≈ 1.5 KB, up to ~40 fact ids
  and 12 message ids ≈ 2 KB, the raw answer ≈ 0.5 KB; a stopped or failed run adds the data block, typically 3,000
  Hebrew characters ≈ 6 KB (worst case 8,000 characters ≈ 15 KB plus a 4,000-character raw answer ≈ 7 KB). At 30
  runs a day with 15 % stopped: 900 documents × ~5 KB ≈ 4.5 MB per business, ≈ 45 MB for ten businesses (9 % of the
  tier). The hard ceiling per business is the daily cap of 300 real turns: 9,000 documents ≈ 45 MB. Storing the data
  block on every run would roughly triple this (≈ 13 MB per business at 30 runs a day, ≈ 130 MB at the cap), which is
  why it is kept only where the exact text decides the question — a stop or a failure. These sizes are estimates
  from the field shapes, not measured.
- Cost and speed of recording: no model call, no extra read; one insert per run after the reply has already left the
  server. `performance.now()` is used for durations so a test's fixed `now` does not distort them.
- Contract for plans 753–756 (names they may rely on):
  - Collection `assistantRuns`; schema `assistantRunSchema` and the constants `RUN_STEP_KEYS` (13 fixed keys, never
    renamed or reordered), `RUN_OUTCOMES`, `RUN_REASONS`, `RUN_STEP_STATUSES`, `RUN_MODES`.
  - 753 appends `'dropped'` / `'superseded'` (and `'skipped'` if it records skipped runs) to `RUN_OUTCOMES` with
    `asr_outcome_*` / `asr_verdict_*` keys, uses `trigger.messageIds` as "the guest messages this run answers" and
    writes `followsRunId` (already in the schema) on a follow-up run; `listRuns`' `handover` group is where a dropped
    run should be listed unless 753 adds a chip.
  - 754 puts timings in each step's `ms`, refines `steps[ai].out.attempts` (`{ model, ms, ok, reason?, status? }`,
    today one entry per `callGemini` call) to one entry per HTTP call, and may add fields to `inbound.out`.
  - 755 adds `leftOutIds` beside `factIds` in `steps[facts].out`.
  - A new field becomes visible by adding a row to `STEP_FIELDS` and a dictionary key; the recorder API
    (`run.time`, `run.timeSync`, `run.step`, `run.set`, `run.end`, `run.discard`, `run.finish`) does not change.
  - 756 adds tabs by adding entries to `AssistantPage.tabs` (`activeTab_`), and the platform-admin view on top of
    `GET /api/v1/assistant-runs`.
- Project checks: the `log-query` Done-when item; the Reuse Check; the `Page recipe:` line; hotspots append-only
  (`dictionary.json`, `app.routes.ts`; `src/styles.scss` is not touched — no new `.c-*` class); every string through
  `translatePipe` with its key listed; breadcrumbs, registry and inventory in scope; the shape in `shared/schemas/`;
  the dedicated endpoint named and justified; retention and erase handled in the same plan
  (`docs/agent/standards-backend.md` §3 item 7: the TTL index instead of `retention.js`, and `erase-client.js`).
- Traps: `expiresAt` must be a real `Date` (a number is ignored by a TTL index); the generated schemas must be
  rebuilt before server tests (`pnpm run test:server` does it); `frontdesk.js` requires `frontdesk-turn.js` at its
  top and the turn requires `askTurnModel` lazily — `frontdesk-runs.js` must require neither of them (it needs only
  `logger`, `newId`, `checkStoredDoc`); `runTurnInner` returns from many places — every one of them must have called
  `run.end` or `run.discard` (a missed one is stored as `failed` / `error`, which the turn tests would show); the
  turn and table tests add `'assistantRuns'` to their `beforeEach` clean-up list; in the turn tests do not assert a
  step's `ms` except for the `inbound` step; `listRuns` must use `test: { $ne: true }` for real runs because the field
  is absent on them; the acting admin's trace is written before the answer, so a test that opens a run twice expects
  two rows.

## Out of Scope
- Running a run again, or editing anything from the page.
- The "flow map" and "what you can change" tabs, and the platform admin's own view across businesses (plan 756).
- One run at a time per conversation, follow-up runs, a reply dropped because a team member took over (plan 753);
  recording a run for a message that was folded into a later one.
- Speed work, per-HTTP-call attempts and fallback timing inside `callGemini` (plan 754).
- Picking the relevant facts (plan 755).
- A link from one message in the simulator or the inbox to its run; a search box; live refresh of the list.
- Recording button taps and the scheduler's messages (no model call, not a run).
- Changing the retention period from the app, or exporting runs.
- A chip for the page in the front desk's chip row (`app-tab-chips`); the page is opened from the inbox and the
  simulator headers.
- Storing the fixed rules of the prompt, or the data block for runs that ended with an answer or a draft.

## Critical Questions
- none

## Execution Notes
- behaviour: the page is for the owner (and a consultant, who has the owner's rights by ADR 0032) and the platform admin acting in the business, as the Human named them; staff do not see runs. The existing action `editFrontDesk` expresses exactly that, so no permission rule and no word of INV-1 changes.
- behaviour: retention is a MongoDB TTL index on `expiresAt` (30 days after the run started), the mechanism `app_logs` already uses; no job and no change to `retention.js`.
- behaviour: one insert at the end of a run and no marker at its start; a run that throws is still stored (`failed` / `error`) by `runTurn`'s catch; a run lost because the server process died mid-turn is not recorded.
- behaviour: runs skipped before any work (`not_bot`, `no_profile`) and the hand-run eval (`feature: 'eval'`) are not recorded; suggest-mode runs are recorded with `mode: 'suggest'`.
- behaviour: a guest message folded into a later one gets no run of its own; the later run lists both in `trigger.messageIds` and its first step says how many messages it answers.
- behaviour: `trigger.messageIds` are the guest messages after the newest outbound message of the conversation, within the 12-message window; a run stopped by the daily cap has none (it stops before the conversation is read).
- behaviour: the result of a run is the decision (`answered`, `asked`, `draft`, `handover`, `failed`, `removed`); what left the server is step 13. A blocked turn at level 0 is therefore `handover` with a draft.
- behaviour: `asked` means the assistant's message asks the guest for something (required details missing, or the table engine waits for an answer or offers a table); a refused send of an answer is `failed` / `send_refused`.
- behaviour: the data block of the prompt is stored only for runs that ended in a handover or a failure (size arithmetic under Technical Considerations); the fixed rules are never stored and the admin sees today's rules.
- behaviour: the owner never sees the prompt blocks ("open the full prompt" is for the platform admin, as in the mock-up); the owner does see the AI's raw answer.
- behaviour: "AI fallback" means the model that answered is not the first model of the chain (`modelChain()[0]`).
- behaviour: the list shows real conversations by default; "שיחות בדיקה" switches to test runs; the simulator's link opens the page with that switch on.
- behaviour: a level-0 draft is listed only under "הכול" (the mock-up's four chips are kept as they are).
- behaviour: the trace of the platform admin's look is two things — a row on the run itself (`adminViews`, shown to the owner, gone with the run after 30 days) and one `warn` log line with ids (kept 90 days by the existing log store); if the trace cannot be written the run is not shown (503). In the list an acting admin does not see a real guest's text at all.
- behaviour: the trace is written for the platform admin acting in a business (`acting: 'platform'`), not for a consultant and not for the platform admin in his own business.
- behaviour: "clear test data" in the simulator also deletes the test runs.
- behaviour: the page is reached from the inbox and the simulator headers, not from the chip row; it has no live refresh, only a refresh button.
- behaviour: route `/frontdesk/assistant` with `/frontdesk/assistant/runs/:id` for an open run; the page name is "מה העוזר עשה" and the tab "הודעות שטופלו".
