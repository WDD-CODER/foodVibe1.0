# Plan 753 — The assistant works on one guest conversation at a time: messages that arrive meanwhile get one follow-up answer, a team member who steps in stops the answer, and every unanswered message is answered

Status: draft
Depends-on: 752
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

Three gaps the Human found in his simulator tests of 2026-11-25/26. Verified on the Snapshot:

**Gap 1 — two runs of one conversation can work at the same time.** `afterStored` (`server/services/inbound.js:73-98`)
waits `COALESCE_MS` = 6 s (`:15`, `:91`), reads the conversation again and starts the turn unless a newer guest message
arrived during the wait (`:93-97`). Nothing records that a turn is running. The model call takes seconds (budget 35 s,
`server/routes/ai/frontdesk.js:28`), so a guest message that arrives after the first wait ended waits its own 6 s and
starts a second `runTurn` beside the first. Both read the history, both answer: twice, or out of order. Plan 733's CI
already hit two timing bugs of this family, fixed one by one in commit `4715c94c` (`holdGuest`'s "something already
went out" check, `server/services/frontdesk-turn.js:159-162`; the status re-read and `$max` in `inbound.js:83-89`,
`:137`). `answerWaiting` (`inbound.js:65-71`, hand-back) starts a turn with no wait and no check either.

**Gap 2 — a team member who steps in does not stop a run that is already working.** Take over
(`server/routes/conversations.js:181-182`) and a member's reply (`:124-150`) change the status to `human`, but
`runTurnInner` checks the status once, at its first line (`frontdesk-turn.js:197`). After the model call it still sends
its answer (`:336`, `deliver` `:302`), writes a request (`:323-334`), changes or cancels a table
(`handleTableIntent` with `write: true`, `:287` → `act`, `server/services/frontdesk-tables.js:163-196`), stores a
draft (`finishSuggestion` `:342-348`) and, on a failure, sets the status and sends the holding message (`:247-248`).

**Gap 3 — the prompt never says "answer every message".** `TURN_SYSTEM_PROMPT`
(`server/services/frontdesk-prompt.js:12-31`) has no rule about several guest messages in a row; `buildTurnBody`
(`:78-96`) sends them as consecutive `user` turns after the data block (`:87-93`). The model tends to answer the last
one only.

The Human wants: at most one run per conversation; a message that arrives during a run starts no run and gets one
follow-up run when the first ends; a member who steps in mid-run stops the answer and every write; the model is told
to answer every unanswered message. Plans 751 (date words, `fillWhen`) and 752 (the run record `assistantRuns`, the
recorder `startRun` / `run.step` / `run.end` / `run.finish`, the page `/frontdesk/assistant`) run first; their code is
not in the Snapshot, so this plan names their symbols, not their lines.

## Goals & Success Criteria
**Primary:** a guest never gets two answers to one message or answers out of order; a message written while the
assistant works is answered by one follow-up; when a team member takes the conversation or replies in it, a run that
is still working sends nothing and writes nothing; several messages in a row all get an answer.

- [auto] `pnpm run test:server` → exit 0, including the new files `server/test/frontdesk-lease.test.js` and
  `server/test/frontdesk-one-run.test.js`, the new and changed cases in `server/test/inbound.test.js`,
  `server/test/frontdesk-prompt.test.js`, `server/test/frontdesk-guardrails.test.js`,
  `server/test/frontdesk-runs.test.js`, `server/test/conversations-router.test.js`, `server/test/sim-router.test.js`,
  and `server/test/frontdesk-eval.test.js` unchanged and green (still exactly 30 dialogue files).
- [auto] `server/test/frontdesk-one-run.test.js`, "two messages one second apart": guest messages `m1` at `T` and `m2`
  at `T + 1000` through `handleInbound` (`channel: 'sim'`), the wait released once → `fetch` called 1 time; one
  outbound message with `author: 'ai'`; one `assistantRuns` document whose `trigger.messageIds` equals `[m1, m2]`;
  the conversation has no `run` field.
- [auto] same file, "a message during a run": the model call of the first run is held open; `m2` arrives → its
  `settled` resolves with no second `fetch`, one log record `inbound.left_to_run`, and the conversation's
  `run.waiting` equals `[m2]`; the first call answers `{ reply: 'A1', intent: 'smalltalk' }`, the second `{ reply:
  'A2', intent: 'smalltalk' }` → `fetch` called 2 times in all; the outbound texts sorted by `at` are `['A1', 'A2']`;
  two run documents: the first has `steps[send].out.overtaken === 1` and no `followsRunId`; the second has
  `followsRunId` equal to the first's `_id`, `trigger.messageIds` equal to `[m2]` and `steps[inbound].out.via ===
  'follow_up'`; the second request body's `contents` hold `A1` as a `model` turn before `m2`'s text; the conversation
  has no `run` field.
- [auto] same file, "three messages during a run" → exactly one follow-up (`fetch` called 2 times) whose
  `trigger.messageIds` holds the three ids oldest first; the second request's data block contains
  `=== UNANSWERED (data) ===` and `no answer yet: 3`. "Seven messages during a run" → one follow-up whose
  `trigger.messageIds` holds the 5 newest ids; the data block says `no answer yet: 5`.
- [auto] same file, "take over mid-run": the first call is held open with the `COMPLETE` request answer of
  `frontdesk-turn.test.js`; the conversation is taken over (`PUT /api/v1/conversations/:id/takeover`); the call
  answers → zero outbound messages, zero `requests`, the conversation has no `requestId`, `suggestion`, `lowTurns`
  or `assistantFailed`, status `human`; one run document with `outcome: 'dropped'`, `reason: 'taken_over'`, step
  `ai` `ok`, steps `guardrails`, `tables`, `decide` `skipped`, step `send` `stopped` with `out.action: 'none'`; one
  log record `frontdesk.turn.dropped` with `reason: 'taken_over'`; with a second guest message noted during the run
  no follow-up starts (`fetch` called 1 time).
- [auto] same file, "a member replies mid-run": `POST /api/v1/conversations/:id/messages { text: 'אני כאן' }` while
  the call is held open → after the call answers the only outbound message is the member's; the run is `dropped` with
  `reason: 'taken_over'`. The same with the lease cleared and the status left `bot` (the moment before the route
  writes the status) → `dropped`, `reason: 'lease_lost'`, nothing sent.
- [auto] same file, "hand back while a run is live": (a) `answerWaiting` on a conversation whose lease is live →
  `{ skipped: 'busy' }`, no `fetch`, the newest guest message's id is in `run.waiting`; (b) take over and release
  during a held run A → the release starts run B at once (the take over cleared the lease), B answers `B1`, then A's
  call answers `A1` → the outbound texts are `['B1']`, run A is `dropped` with `reason: 'lease_lost'`.
- [auto] same file, "a crashed run": a conversation seeded with `run: { id: 'dead', since: 1, until: Date.now() - 1,
  chain: 0, waiting: [] }` → the next guest message runs (one `fetch`, one outbound message) and one `warn` record
  `frontdesk.lease.expired`; seeded with `until: Date.now() + 60000` → no `fetch`, `run.waiting` holds the message id.
- [auto] same file, "a failure under the lock": every model call answers 503, `m2` arrives during the run → exactly
  one outbound message (the holding text, `author: 'server'`), status `human`, one run document (`failed` / `busy`),
  no follow-up, no `run` field.
- [auto] same file, "the first run was about to write": the first call is held open with the `COMPLETE` request
  answer, `m2` arrives, the call answers, the follow-up answers `{ reply: 'A2', intent: 'smalltalk' }` → zero
  `requests`; the first run is `superseded` with `reason: 'overtaken'` and sent nothing; the follow-up's
  `trigger.messageIds` equals `[m1, m2]`; one outbound message `A2`.
- [auto] same file, "a guest who never stops": a new guest message arrives during each run → `fetch` called 4 times;
  the fifth run stops before the model with `outcome: 'handover'`, `reason: 'follow_up_limit'`; the handoff sentence
  is sent, status `human`, no `run` field.
- [auto] same file, "button taps": a registered button tap that arrives while a lease is live → its handler runs at
  once, `run.waiting` stays empty and the lease is unchanged; a button id with no handler is left to the run like a
  text message. "A thrown error": a turn that throws leaves no `run` field. "Level 0": a message during a level-0
  run → no outbound message, the follow-up's draft replaces the first as `suggestion`.
- [auto] same file, logs: over all cases the captured log text contains none of the guest texts and none of `A1`,
  `A2`, `B1`.
- [auto] `server/test/frontdesk-lease.test.js`: the cases listed under "Tests" (take, busy, expired, not `bot`,
  `noteWaiting` and its cap of 20, `endLease` release / continue / lost, `leaseCheck` reasons, `clearLease`, and
  `RUN_LEASE_MS >= TURN_BUDGET_MS + 30000`).
- [auto] `server/test/inbound.test.js`, new block "plan 753: what a message does next": the seven `nextStep` cases
  under "Tests"; the turn handler's third argument carries `messageId` equal to the stored message's `_id`; every
  existing case of the file passes unchanged.
- [auto] `server/test/frontdesk-prompt.test.js`: `TURN_SYSTEM_PROMPT` contains `answer every one of them in a single
  reply`; with 0 or 1 guest message at the end the data block has no `UNANSWERED`; with 2 → `no answer yet: 2`;
  with 7 → `no answer yet: 5`; the block stands before `=== CONVERSATION FOLLOWS ===`; `unansweredTail` returns the
  messages after the newest non-guest one, at most 5, oldest first; the existing cases pass unchanged.
- [auto] `server/test/frontdesk-guardrails.test.js`: `preCheck({ …, chain: 4 })` → `{ ok: false, reason:
  'follow_up_limit' }`; `chain: 3` and no `chain` → `ok: true`; `mode: 'suggest'` with `chain: 4` → `ok: true`.
- [auto] `server/test/conversations-router.test.js`: a take over of a conversation with a `run` field removes it; a
  member's reply to a `bot` conversation with a `run` field removes it and logs `conversations.run_cancelled`; the
  existing cases pass unchanged.
- [auto] `server/test/sim-router.test.js`: `POST /sim/inbound` for a test conversation whose lease is live → 200, the
  stub turn handler is not called, `run.waiting` holds the new message id.
- [auto] `pnpm run test:ci` → exit 0, including the changed
  `src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts` and
  `src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts` (cases under "Tests").
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, a restaurant whose facts hold opening hours
  and parking) write "מה שעות הפתיחה?" and right after it, before any answer, "ויש חניה?" · the assistant sends ONE
  answer that speaks about both the hours and the parking, and no second answer follows.
- [human] `http://localhost:4202/frontdesk/assistant?scope=test` after the check above · press the newest row · the
  first step "הודעת האורח התקבלה" shows "כמה הודעות נענו יחד" with the value 2, and the list has one row for the two
  messages, not two.

## Execution Mode
- Parallel: no — the plan edits `server/services/frontdesk-turn.js`, `server/services/inbound.js`,
  `server/services/frontdesk-prompt.js` and files plan 752 creates; plan 752 must be merged first and plans 754–756
  build on this one.
- Concurrent plans: none
- Isolated DB: no — one optional field on `conversations`, no stored data is reshaped
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/conversation.schema.ts
shared/schemas/entities/assistant-run.schema.ts
server/services/frontdesk-lease.js
server/services/inbound.js
server/services/frontdesk-turn.js
server/services/frontdesk-prompt.js
server/services/frontdesk-guardrails.js
server/services/frontdesk-runs.js
server/routes/conversations.js
server/routes/ai/frontdesk.js
server/test/frontdesk-lease.test.js
server/test/frontdesk-one-run.test.js
server/test/inbound.test.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-tables.test.js
server/test/frontdesk-prompt.test.js
server/test/frontdesk-guardrails.test.js
server/test/frontdesk-runs.test.js
server/test/conversations-router.test.js
server/test/sim-router.test.js
src/app/pages/frontdesk/assistant/assistant-run-view.util.ts
src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.ts
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.html
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts
public/assets/data/dictionary.json
docs/frontdesk/assistant-behaviour-rules.md
docs/restaurant/restaurant-map.md
docs/agent/standards-backend.md
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
```

New files: `server/services/frontdesk-lease.js`, `server/test/frontdesk-lease.test.js`,
`server/test/frontdesk-one-run.test.js`. `shared/schemas/entities/assistant-run.schema.ts`,
`server/services/frontdesk-runs.js`, `server/test/frontdesk-runs.test.js` and everything under
`src/app/pages/frontdesk/assistant/` are created by plan 752. Every other path exists on the Snapshot.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely cases: (1) an existing server test that runs two turns
of one conversation at the same moment and now gets `{ skipped: 'busy' }` for the second — offer
`approved: <that test path>` with the change to run them one after the other; (2) a dialogue of the assistant's test
set whose scripted run changes because of the new data block (none is expected: the block appears only with two or
more unanswered guest messages and the scripted model does not read the prompt) — offer `approved:
server/eval/frontdesk/dialogues/<file>`; never add or remove a dialogue file (the set is fixed at 30,
`server/scripts/ai-eval-frontdesk.js:30`). `server/services/gemini-client.js`, `server/services/outbound.js`,
`server/services/frontdesk-tables.js`, `server/services/conversations.js`, `server/routes/sim.js` and
`server/utils/permissions.js` are never offered: the plan needs no change there.

## Architecture Impact

- INV-1: preserves — `server/routes/conversations.js` keeps `loadFor` (the business from the signed token, `assertCan(…, 'manageConversations')`) in front of every handler; the two routes only gain the removal of the `run` field of the conversation they already loaded and authorized; no new route, no new action, `server/utils/permissions.js` is not edited.
- INV-2: preserves — `server/services/frontdesk-lease.js`, `inbound.js` and `frontdesk-turn.js` read and write the lease only on the conversation's own document, every filter carries `_id` and `businessId`; no cross-business read, no new collection.
- INV-4: preserves — the lease is an optional field `run` of the one Zod schema `shared/schemas/entities/conversation.schema.ts`; the new run outcomes and reasons are appended to the constants of `assistant-run.schema.ts`; a run record still passes `checkStoredDoc('assistantRuns', doc)` before its insert.
- INV-6: preserves — the one model call stays `askTurnModel` in `server/routes/ai/frontdesk.js`; that file only exports its existing constant `TURN_BUDGET_MS` so a test can hold the lease length against it; no second call place, no key in the browser.
- INV-7: preserves — `server/services/frontdesk-turn.js` still lets only `handleTableIntent` and the engine decide a table; the lock and the re-check only decide whether a run may start, write or send at all, and a run that is stopped writes no hold, no booking and no request.

## Reuse Check

- `takeLease`, `noteWaiting`, `leaseCheck`, `endLease`, `clearLease`, `leaseLive` in `server/services/frontdesk-lease.js` — family: none — rung: 4 — why: nothing in the registry gives one piece of work exclusive use of a document; the conditional-update pattern itself is the repo's own (`backToBot`, `inbound.js:55-58`; `move`, `routes/conversations.js:168`; `table-bookings.js:244-249`), here given one home so no second lock is ever written.
- `nextStep` and `waitFor` in `server/services/inbound.js` — family: conversation-pipeline — rung: 3 — why: the decision "start a run now, wait, or leave it to the running run" was three inline `if`s of `afterStored`; it becomes one pure function of the same file, the seam plan 754 changes.
- `unansweredTail` and the `UNANSWERED` data block in `server/services/frontdesk-prompt.js` — family: assistant-turn — rung: 3 — why: one more data block of `buildTurnBody` and the helper both the prompt and the run's `trigger` read.
- The `follow_up_limit` stop in `preCheck` — family: assistant-guardrails — rung: 3 — why: one more reason in the one place where the assistant's blocks live.
- The "follow-up of an earlier run" link in `app-run-detail` — family: assistant-runs — rung: 2 — why: one more line of the head plan 752 builds, an `a` with `routerLink`; new fields are rows of `STEP_FIELDS`.
- New registry family `assistant-run-lease` in `docs/brain/component-families.md` — family: none — rung: 4 — why: gives the lease functions and `nextStep` one entry so plan 754 changes the timing there instead of adding a second gate.

## Adopt Check
- one run at a time per conversation — verdict: skip — why: domain logic on the conversation document (status, hand-over, follow-up); a lock package would add a dependency and a second store for one conditional update.
- `takeLease`, `noteWaiting`, `leaseCheck`, `endLease`, `clearLease`, `leaseLive` in `server/services/frontdesk-lease.js` — verdict: skip — why: domain logic; conditional updates on the app's own conversation document.

## Defaults

- empty-state-on-list — exception — why: no list changes; the runs list of plan 752 keeps its states
- loading-and-error-states — exception — why: no new loading or error state; the run detail gains one line and one link
- app-list-container — exception — why: no list page changes
- one-breakpoint-set — exception — why: no layout and no SCSS change
- unsaved-changes-on-leave — exception — why: no form; server code and a read-only detail
- confirm-destructive-action — exception — why: nothing a user presses deletes or discards; a dropped answer is the server's decision after a team member stepped in
- hints-in-tooltips — exception — why: no new control
- anchored-popup — exception — why: no floating box
- unit-dropdown-add — exception — why: no unit field; the word names unit tests only
- leave-and-return — exception — why: the new link opens another run of the same page and carries no unsaved work

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten). The commits of plans 751 and 752 are expected
drift: check that `runTurn` still starts the run with `startRun` and finishes it with `run.finish`, that
`runTurnInner` still calls `askTurnModel` once and `fillWhen` right after the failed-call branch, that `run.step`,
`run.set`, `run.end` exist with plan 752's meaning, that `RUN_OUTCOMES`, `RUN_REASONS`, `followsRunId` and
`trigger.messageIds` are in `assistant-run.schema.ts`, and that `STEP_FIELDS`, `outcomeTone`, `verdictOf` and
`app-run-detail` exist under `src/app/pages/frontdesk/assistant/`.

## User Stories
- As a guest, I want one answer to what I wrote, in the order I wrote it, so that I am not answered twice or backwards.
- As a guest who sends another message while the assistant is still working, I want that message answered too, so that I do not have to repeat it.
- As a team member, I want the assistant to stay silent once I take a conversation or reply in it, so that the guest does not get my answer and the assistant's.
- As a restaurant owner, I want no request, table change or cancellation written by the assistant after my staff stepped in, so that the staff's word is the last one.
- As a restaurant owner, I want to see in "מה העוזר עשה" that an answer was not sent and why, and which run continued an earlier one, so that nothing the assistant did is hidden.

## Functional Requirements

### Must Have (P0)

**1. The lease — `shared/schemas/entities/conversation.schema.ts`, `server/services/frontdesk-lease.js` (new)**
- [ ] `conversationSchema` gains, after `assistantFailed`:
  `run: z.strictObject({ id: z.string().min(1), since: z.number(), until: z.number(), chain: z.number().int().min(0).max(10), waiting: z.array(z.string().min(1)).max(20) }).optional()`
  with the comment "Plan 753 (R-26): the lease of the assistant run that works on this conversation now. `until` is
  when it stops counting; `waiting` are the guest messages that arrived meanwhile; `chain` counts follow-up runs."
- [ ] New file, CommonJS, `'use strict'`, semicolons as the neighbouring services. It requires only `../logger` and
  `../utils/id` (never `inbound.js` or `frontdesk-turn.js`, which require it). File comment: "Plan 753 (R-26, R-27):
  one assistant run per conversation. The lease is the field `run` of the conversation, taken and given back with
  conditional updates, so it holds for any number of server processes and ends by itself (`RUN_LEASE_MS`) when a run
  dies. Logs carry ids and numbers only."
- [ ] Exports `RUN_LEASE_MS = 90000`, `WAITING_MAX = 20`, `leaseLive`, `takeLease`, `noteWaiting`, `leaseCheck`,
  `endLease`, `clearLease`. Every filter below starts with `{ _id: conversation._id, businessId:
  conversation.businessId }`; a `findOneAndUpdate` result is read the way `table-bookings.js:249` does (`result.value`
  when that key exists, else `result`). Every `now` defaults to `Date.now()` (the real clock — never a turn's own
  `now`, which tests fix in another year).
- [ ] `leaseLive(conversation, now)` → `!!(conversation && conversation.run && conversation.run.until > now)`. Pure.
- [ ] `takeLease(db, conversation, { now, log = logger } = {})` → `{ id, since }` or `null`. One
  `findOneAndUpdate` with the filter `status: 'bot', $or: [{ run: { $exists: false } }, { 'run.until': { $lte: now } }]`,
  the update `{ $set: { run: { id: newId(), since: now, until: now + RUN_LEASE_MS, chain: 0, waiting: [] } } }` and
  `{ returnDocument: 'before' }`. No document → `null`. When the document before the update had a `run` (an expired
  lease) → `log.warn({ event: 'frontdesk.lease.expired', conversationId, ageMs: now - before.run.since })`.
- [ ] `noteWaiting(db, conversation, messageId, now)` → `true` when a live lease took the note, else `false`.
  `messageId` empty → `false`. `updateOne` with the filter `'run.until': { $gt: now }` and
  `{ $push: { 'run.waiting': { $each: [messageId], $slice: -WAITING_MAX } } }`; the answer is `matchedCount === 1`.
- [ ] `leaseCheck(db, conversation, lease, seen)` → `{ ok: true, overtaken }` or `{ ok: false, reason }`. One
  `findOne`. No document or `status === 'closed'` → `reason: 'closed'`; `status !== 'bot'` → `'taken_over'`;
  `doc.run?.id !== lease.id` → `'lease_lost'`; else `overtaken` = the number of ids in `doc.run.waiting` that are not
  in `seen`.
- [ ] `endLease(db, conversation, lease, { seen = [], follow = true, graceMs = 0, now } = {})` →
  `{ follow: false }` or `{ follow: true, conversation, chain }`.
  - `follow === false`: `updateOne({ …, 'run.id': lease.id }, { $unset: { run: '' } })` → `{ follow: false }`.
  - Else first the atomic release: `updateOne({ …, 'run.id': lease.id, $or: [{ status: { $ne: 'bot' } },
    { 'run.waiting': { $not: { $elemMatch: { $nin: seen } } } }] }, { $unset: { run: '' } })`; matched →
    `{ follow: false }`. (A note pushed before this update is seen by it; a note after it finds no lease, so that
    message starts its own run — no message is lost between the two.)
  - Not matched: `findOneAndUpdate({ …, 'run.id': lease.id, status: 'bot' }, { $set: { 'run.until': now + graceMs +
    RUN_LEASE_MS, 'run.waiting': [] }, $inc: { 'run.chain': 1 } }, { returnDocument: 'after' })`; no document (the
    lease is no longer this run's) → `{ follow: false }`; else `{ follow: true, conversation: doc, chain:
    doc.run.chain }`. Clearing `waiting` is safe: every noted message is already stored, so the follow-up reads it.
- [ ] `clearLease(db, conversation)` → `updateOne({ …, run: { $exists: true } }, { $unset: { run: '' } })`; returns
  `modifiedCount === 1`.
- [ ] `server/routes/ai/frontdesk.js`: one added line at the end, `module.exports.TURN_BUDGET_MS = TURN_BUDGET_MS;`.
  Nothing else in that file changes.

**2. What a guest message does next — `server/services/inbound.js`**
- [ ] New pure function, exported, with the comment "Plan 753 (R-26): the one place that decides what a guest
  message does next — start a run, wait, or leave it to the run that is working. Plan 754 changes the timing here
  and nowhere else.":
  `nextStep({ conversation, at, now, waited, holder = false })` → `{ do, why?, ms? }`, the first rule that fits:
  1. no conversation or `conversation.status !== 'bot'` → `{ do: 'stop', why: 'not_bot' }`;
  2. `!holder && leaseLive(conversation, now)` → `{ do: 'leave', why: 'running' }`;
  3. `!holder && waited && conversation.lastInboundAt > at` → `{ do: 'leave', why: 'newer' }`;
  4. `!waited` → `{ do: 'wait', ms: holder ? Math.max(0, COALESCE_MS - Math.max(0, now - at)) : COALESCE_MS }`;
  5. `{ do: 'run' }`.
  `holder: true` is the run that already holds the lease and is about to start a follow-up.
- [ ] `afterStored(db, conversation, { buttonId, at, messageId }, log)` — `handleInbound` passes `messageId: row._id`
  (`:141`). The button branch (`:74-82`) and the back-to-the-assistant branch (`:83-89`) are unchanged. The rest
  (`:90-97`) becomes:
  1. `step = nextStep({ conversation, at, now: Date.now(), waited: false })`; `stop` → return (today's `:90`);
     `leave` → when `await noteWaiting(db, conversation, messageId, Date.now())` is true:
     `log.info({ event: 'inbound.left_to_run', conversationId })` and return (no timer is started); when it is false
     (the lease ended in between) carry on.
  2. The wait exactly as plan 752 left it (`waitStarted`, `await wait(COALESCE_MS)`, `waitedMs`), then
     `fresh = await loadConversation(…)`.
  3. `step = nextStep({ conversation: fresh, at, now: Date.now(), waited: true })`; `stop`, or `leave` with
     `why: 'newer'` → the existing `inbound.coalesced` log line and return (today's `:93-96`); `leave` with
     `why: 'running'` → `noteWaiting(db, fresh, messageId, Date.now())` true → `inbound.left_to_run` and return.
  4. `await turnHandler(db, fresh, { log, inbound: { at, waitedMs }, messageId })`.
- [ ] `answerWaiting` passes the newest message's id: `turnHandler(db, conversation, { log, messageId: newest._id })`.
- [ ] New export `waitFor = ms => wait(ms)` (the follow-up's wait goes through the same `wait`, so `setWaitForTest`
  covers it). `module.exports` gains `nextStep` and `waitFor`. `COALESCE_MS` stays 6000. The file comment gains:
  "Plan 753 (R-26): a message that arrives while a run holds the conversation's lease starts no run; it is noted on
  the lease and the run answers it in a follow-up."
- [ ] Button taps: a tap whose prefix has a handler (`OK`, `ALT`, `OTHER`, `BK`, `CONFIRM`, `CANCEL`) never reaches
  `nextStep`: it takes no lease, waits for none and is never noted — it is answered at once by its handler, as today.
  A button id with no handler is treated as a text message (today's fall-through, `inbound.test.js:109-110`).

**3. One run at a time, the follow-up, the re-check — `server/services/frontdesk-turn.js`**
- [ ] Plan 752's `runTurn` body (start the run, call `runTurnInner`, `run.finish`, the `assistantFailed` clean-up)
  is renamed `runOnce(db, conversation, opts)` and returns `{ result, runId: run.id, seen: track.seen }`, where
  `track = { seen: [] }` is passed to `runTurnInner` in its options and filled there right after the history read
  with the `_id` of every message of `history` whose `author` is `'guest'`. `runOnce` calls
  `run.set({ followsRunId: opts.followsRunId })` when that option is set and, for a follow-up,
  `run.step('inbound', { out: { via: 'follow_up' } })`. The `assistantFailed` clean-up does not run for a result
  with `skipped`.
- [ ] The new `runTurn(db, conversation, opts = {})`:
  1. mode `suggest` → `return (await runOnce(db, conversation, opts)).result` — no lease, no re-check (a suggestion
     sends nothing and may be made beside a run).
  2. `conversation.status !== 'bot'` → `{ skipped: 'not_bot' }` (as today, before anything is written).
  3. `lease = await takeLease(db, conversation, { log })`. `null` → read the conversation again: not `bot` →
     `{ skipped: 'not_bot' }`; else `noted = await noteWaiting(db, conversation, opts.messageId, Date.now())`; when
     `noted` is false try `takeLease` once more; still `null` → `log.info({ event: 'frontdesk.turn.busy',
     conversationId, noted })` and `return { skipped: 'busy' }`.
  4. The loop, inside `try` / `finally`: `conv = conversation`, `chain = 0`, `follows = undefined`, `startedReal =
     Date.now()`.
     - `one = await runOnce(db, conv, { ...opts, now: opts.now === undefined || chain === 0 ? opts.now : opts.now +
       (Date.now() - startedReal), lease, chain, followsRunId: follows })`; the first `one.result` is what `runTurn`
       returns.
     - `next = await endLease(db, conv, lease, { seen: one.seen, follow: !one.result?.skipped && chain <=
       FOLLOW_UP_MAX, graceMs: COALESCE_MS })`; `!next.follow` → leave the loop.
     - `step = nextStep({ conversation: next.conversation, at: next.conversation.lastInboundAt, now: Date.now(),
       waited: false, holder: true })`; `waitedMs` measured around `await waitFor(step.ms)`; then
       `conv = await loadConversation(…)`; `nextStep({ conversation: conv, …, waited: true, holder: true }).do !==
       'run'` → `await endLease(db, next.conversation, lease, { follow: false })` and leave the loop.
     - `log.info({ event: 'frontdesk.turn.follow_up', conversationId, chain: next.chain, waitMs: waitedMs })`;
       `chain = next.chain`, `follows = one.runId`, `opts = { ...opts, inbound: { at: conv.lastInboundAt, waitedMs },
       messageId: undefined }`; go round.
     - `finally`: when the loop was left by a throw, `await endLease(db, conversation, lease, { follow: false })`
       (errors of this call are swallowed), and the error is rethrown unchanged.
- [ ] `runTurnInner` takes `lease`, `chain = 0` and `track` from its options.
  - `preCheck` gets `chain` in its context.
  - The re-check: right after `askTurnModel` returned and BEFORE the failed-call branch (`if (!asked.ok)`), when a
    `lease` is set: `gate = await leaseCheck(db, conversation, lease, track.seen)`. Not ok →
    `log.info({ event: 'frontdesk.turn.dropped', conversationId, reason: gate.reason })`,
    `run.step('send', { status: 'stopped', out: { action: 'none' } })`, `run.end('dropped', gate.reason)`,
    `return { skipped: 'dropped', reason: gate.reason }`. Nothing after this point runs for a dropped turn: no
    `handOffSilently`, no `holdGuest`, no `lowTurns` write, no `handOff`, no `handleTableIntent`, no `deliver`, no
    `createRequest`, no `sendOut`, no `finishSuggestion`, no `frontdesk.turn.done` line.
  - `gate.overtaken > 0` → `run.step('send', { out: { overtaken: gate.overtaken } })` (it stays on the record
    whatever the run then does).
  - The run that was about to write while newer messages wait: with `gate.overtaken > 0`, (a) just before
    `handleTableIntent` when the turn is a table turn, not level 0 / suggest, and the intent is `change` or `cancel`;
    (b) just before `createRequest` (`decision.request` is set) → `log.info({ event: 'frontdesk.turn.superseded',
    conversationId, waiting: gate.overtaken })`, `run.step('send', { status: 'stopped', out: { action: 'none' } })`,
    `run.end('superseded', 'overtaken')`, `return { skipped: 'superseded' }`. Nothing is written or sent; the
    follow-up starts (the status is still `bot`, the notes are still on the lease) and answers every unanswered
    message. Every other run that was overtaken sends its answer as today (a text answer, a table offer, a question
    back), and the follow-up answers the newer messages.
  - `trigger.messageIds` (plan 752, set after the history read) becomes `unansweredTail(history).map(m => m._id)`:
    the same messages as plan 752's rule, at most the 5 newest.
- [ ] The file's doc comment gains: "Plan 753 (R-26, R-27): `runTurn` holds the conversation's lease
  (`frontdesk-lease.js`) for a run and its follow-ups; after the model call the turn reads the conversation again
  and sends and writes nothing when a person stepped in."
- [ ] The existing limits: every follow-up is an ordinary turn. It is counted by the daily cap
  (`FRONTDESK_DAILY_TURNS`, `frontdesk-turn.js:24`, `:204-214`) and stopped by it with the holding message of R-22;
  each answer it sends as `author: 'ai'` counts toward `TURN_LIMIT` = 8 (`frontdesk-guardrails.js:13`, `:48`;
  `aiTurns` `frontdesk-turn.js:219`), so a follow-up of a conversation at the limit hands over as any turn does. The
  holding message keeps its own check (`holdGuest`, `:153-167`): under the lock two failing runs can no longer
  overlap, and a run that failed leaves the status `human`, so no follow-up starts after it.

**4. The follow-up cap — `server/services/frontdesk-guardrails.js`**
- [ ] `const FOLLOW_UP_MAX = 3;` beside `TURN_LIMIT`, exported. `preCheck`, after the `turn_limit` line (`:48`):
  `if ((ctx.chain ?? 0) > FOLLOW_UP_MAX) return { ok: false, reason: 'follow_up_limit' };`. So a first run and three
  follow-ups may call the model; a fourth follow-up stops before the model and goes through the existing `blockTurn`
  (the handoff sentence, status `human`; at level 0 the sentence as the draft). The file comment's list of
  pre-checks gains "the follow-up limit (plan 753)". `runTurn`'s `chain <= FOLLOW_UP_MAX` bound makes the loop end
  even at level 0, where a block keeps the status `bot`.

**5. Take over and a member's reply cancel the run — `server/routes/conversations.js`**
- [ ] Take over (`:181-182`): the `apply` result gains `$unset: { run: '' }` beside its `$set`.
- [ ] A member's reply (`POST /:id/messages`): after the `closed` check (`:130`) and BEFORE `sendOut` (`:132`), when
  `conversation.status === 'bot'`: `if (await clearLease(db(), conversation)) logOf(req).info({ event:
  'conversations.run_cancelled', by: 'reply' })`. The rest of the handler is unchanged (the status still moves after
  a successful send, `:135-139`).
- [ ] Hand back (`:183-190`) and close (`:191`) are unchanged: a hand back calls `answerWaiting`, whose turn takes a
  fresh lease (the take over cleared the old one) or, when a lease is live, is noted on it; a close makes the
  re-check answer `closed`.
- [ ] The conversation documents these routes return may carry `run` (ids and numbers); nothing reads it in the
  browser in this plan.

**6. The prompt — `server/services/frontdesk-prompt.js`**
- [ ] `TURN_SYSTEM_PROMPT` gains one line right after the line that starts `'Address the guest'` (`:16`):
  `'When the conversation ends with several guest messages that have no assistant message after them, answer every one of them in a single reply, in the order they were written; the UNANSWERED block, when present, says how many there are. When they ask for different things, intent and collected describe the request or the table booking and reply also answers the questions.'`
- [ ] `const GLUE_MAX = 5;` and `unansweredTail(history)` — the messages after the newest one whose `author` is not
  `'guest'` (all of them when there is none), the last `GLUE_MAX`, oldest first; `[]` for an empty history. Both
  exported.
- [ ] `buildTurnBody`: with `n = unansweredTail(history).length`, when `n >= 2` the lead gets, right before
  `'=== CONVERSATION FOLLOWS ==='`, the two lines `'=== UNANSWERED (data) ==='` and
  `` `Guest messages at the end of the conversation with no answer yet: ${n}` ``. With `n < 2` the lead is byte for
  byte what it is today. The roles, the 12-message window (`HISTORY_WINDOW`, `:10`) and consecutive `user` turns are
  unchanged.
- [ ] The file comment gains: "Plan 753 (R-28): several unanswered guest messages are all answered; their number is
  data in the UNANSWERED block."

**7. The run record and its page — plan 752's files**
- [ ] `shared/schemas/entities/assistant-run.schema.ts`: `RUN_OUTCOMES` gains `'dropped', 'superseded'` at its end;
  `RUN_REASONS` gains `'taken_over', 'closed', 'lease_lost', 'overtaken', 'follow_up_limit'` at its end. Nothing is
  renamed or reordered; `followsRunId` is already in the schema.
- [ ] `server/services/frontdesk-runs.js`: `run.set` also accepts `followsRunId` and `finish` writes it when set;
  `finish` keeps an `out.via` a caller already put on the `inbound` step; `listRuns`' `handover` filter becomes
  `outcome: { $in: ['handover', 'failed', 'removed', 'dropped'] }` (a `superseded` run is listed under "הכול" only).
- [ ] `assistant-run-view.util.ts`: `outcomeTone` → `'amber'` for `dropped` and `superseded`; `STEP_FIELDS` gains
  the row `send · out · overtaken · number · asr_f_overtaken`; the `via` enum of the `inbound` step gets its new
  value through the key `asr_via_follow_up`. `verdictOf` is unchanged (it builds `asr_verdict_<outcome>` with the
  reason).
- [ ] `run-detail.component.html` (and `.ts` only if an import is missing): in the head, after the link to the
  conversation, when `run().followsRunId` is set: `<a class="c-btn-ghost--sm" [routerLink]="['/frontdesk/assistant/runs',
  run().followsRunId]" queryParamsHandling="preserve" data-testid="asr-follows">{{ 'asr_follows' | translatePipe }}</a>`.
  No other change to the page; no SCSS change.
- [ ] `public/assets/data/dictionary.json` — append to `general` the keys under "UI/UX Notes".

**8. Rules, maps, registry**
- [ ] `docs/frontdesk/assistant-behaviour-rules.md`: R-03's row keeps its text and adds "Superseded in part by R-26
  and R-27 (plan 753): a message that arrives while a run works starts no second run, and the takeover re-check also
  runs after the model call." Three rows after R-25 (plan 751 takes R-24 and R-25; plan 752 takes none):
  **R-26** "One assistant run per conversation. A run takes a lease on the conversation (`run`, 90 s, ends by itself).
  A guest message that arrives while the lease is live starts no run and is noted on it; when the run ends and a
  noted message was not read by it, one follow-up run answers the unanswered guest messages together (the 5 newest),
  linked to the first by `followsRunId`; at most 3 follow-ups in a row, then a person. The first run's answer is
  sent, except when it was about to write a request or change or cancel a table: then it writes and sends nothing
  and the follow-up answers everything. Button taps take no lease." (753) ·
  **R-27** "A person who steps in stops the run. Take over and a member's reply remove the lease; after the model
  call and before its first write the run reads the conversation again and, when the status is not `bot` or the
  lease is not its own, sends nothing and writes nothing (run `dropped`), and no follow-up starts." (753) ·
  **R-28** "Every unanswered guest message is answered. The prompt tells the model to answer, in one reply and in
  order, every guest message at the end of the conversation that has no assistant message after it; with two or more
  the data block UNANSWERED gives their number (at most 5)." (753).
- [ ] `docs/restaurant/restaurant-map.md`, at the end of "Contract extensions (run)" (after plan 752's line):
  `753 · C-CONV / C-AI / C-RUNS · (1) a conversation carries the lease run { id, since, until, chain, waiting } while
  a run works on it (frontdesk-lease.js; R-26); (2) a guest message during a live lease is noted and answered by one
  follow-up run (followsRunId, at most 3 in a row, then follow_up_limit); (3) take over and a member's reply remove
  the lease, and the run re-checks after the model call: outcomes dropped (taken_over, closed, lease_lost) and
  superseded (overtaken) (R-27); (4) the prompt answers every unanswered guest message, data block UNANSWERED
  (R-28); (5) nextStep in inbound.js is the one place that decides run / wait / leave · the Human's simulator tests
  of 2026-11-25/26`.
- [ ] `docs/agent/standards-backend.md`: the `conversations` row of the registry table (`:61`) gains "`run`: the
  lease of the working assistant run (plan 753)".
- [ ] `server/breadcrumbs.md`: a new row `services/frontdesk-lease.js` — "`takeLease`, `noteWaiting`, `leaseCheck`,
  `endLease`, `clearLease` (plan 753, R-26 / R-27): one assistant run per conversation, the lease on the
  conversation document"; the rows of `services/inbound.js` (`:26`), `services/frontdesk-turn.js` (`:42`),
  `services/frontdesk-prompt.js` (`:44`), `services/frontdesk-guardrails.js` (`:45`) and `routes/conversations.js`
  (`:52`) each gain one "plan 753: …" phrase (`nextStep`; the lease loop and the re-check; the UNANSWERED block;
  `follow_up_limit`; take over and reply remove the lease).
- [ ] `docs/brain/component-families.md`: new family `### assistant-run-lease — takeLease, noteWaiting, leaseCheck,
  endLease, clearLease in server/services/frontdesk-lease.js, nextStep in server/services/inbound.js (plan 753)`
  with Status `stable — server only`, Use (one line per function), Pieces, When ("anything that must not run twice
  for one conversation, or must stop when a person steps in, goes through these; the timing of a guest message is
  changed in `nextStep` only; a second lock, an in-memory map of running turns or a second wait is never added"),
  Known copies `none`; the `assistant-turn` family's Use line gains "plan 753: `unansweredTail`, the UNANSWERED
  block"; the `assistant-runs` family (plan 752) gains "plan 753: outcomes `dropped` and `superseded`, the
  follow-up link". Then `node scripts/inventory.mjs` and commit `docs/brain/inventory.md` only if it changed.

**9. Tests** (beyond the Done-when items above)
- [ ] `server/test/frontdesk-lease.test.js` (the test database of `helpers/app`, a conversation from
  `seedConversation`): (a) `takeLease` writes `run` with `chain: 0`, `waiting: []`, `until - since === RUN_LEASE_MS`,
  and a second `takeLease` answers `null`; (b) a lease with `until` in the past is taken and one
  `frontdesk.lease.expired` record is logged with a number `ageMs`; (c) a `human` conversation → `null`, no `run`
  written; (d) `noteWaiting` on a live lease → `true` and the id is in `waiting`; with no lease or an expired one →
  `false`; 25 notes leave the 20 newest; (e) `endLease` with `waiting ⊆ seen` removes `run` and answers
  `{ follow: false }`; (f) with an id not in `seen` → `{ follow: true, chain: 1 }`, `waiting` is `[]`, `until` moved
  forward by `graceMs`; (g) the same on a `human` conversation → `run` removed, `{ follow: false }`; (h)
  `follow: false` removes `run` whatever waits; (i) an `endLease` and a `leaseCheck` with another lease id change
  nothing and answer `{ follow: false }` / `{ ok: false, reason: 'lease_lost' }`; (j) `leaseCheck`: `bot` and own
  lease → `{ ok: true, overtaken: 0 }`; one unseen note → `overtaken: 1`; status `human` → `'taken_over'`; `closed` →
  `'closed'`; (k) `clearLease` → `true` once, `false` the second time; (l) `RUN_LEASE_MS >=
  require('../routes/ai/frontdesk').TURN_BUDGET_MS + 30000`; (m) the conversation with a `run` passes
  `conversationSchema`.
- [ ] `server/test/inbound.test.js`, `nextStep` (with `COALESCE_MS` = 6000, `now = 100000`): a `human` conversation →
  `{ do: 'stop', why: 'not_bot' }`; `bot` with `run.until: now + 1` → `{ do: 'leave', why: 'running' }`; the same
  with `holder: true`, `waited: true` → `{ do: 'run' }`; `bot`, no lease, `waited: false` → `{ do: 'wait', ms: 6000 }`;
  `waited: true` with `lastInboundAt > at` → `{ do: 'leave', why: 'newer' }`; `waited: true` with `lastInboundAt ===
  at` → `{ do: 'run' }`; `holder: true`, `waited: false`, `at: now - 2000` → `{ do: 'wait', ms: 4000 }` and with
  `at: now - 9000` → `ms: 0`.
- [ ] `server/test/frontdesk-one-run.test.js`: built like `frontdesk-turn.test.js` (`buildTestApp`, `captureLogs`,
  the stubbed `fetch`, `seedBusiness`, a level-1 profile with the `TABLE` request kind), messages sent with
  `handleInbound(db, { businessId: 'b1', channel: 'sim', waId, text, providerMessageId, at: Date.now() })` — the
  call `server/routes/sim.js:54-57` makes — and the real `runTurn` as the turn handler (`setTurnHandler(runTurn)`
  after `resetInboundForTest()`). A model call is held open with a `fetch` mock that returns a promise the test
  resolves; "the run is in flight" is awaited with `vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(n))`.
  The wait is `setWaitForTest(async () => {})`, or `controllableWait()` for the burst case. `beforeEach` empties
  `messages`, `conversations`, `clients`, `aiUsage`, `GEMINI_USAGE`, `requests`, `businesses`, `frontDeskProfiles`,
  `knowledgeItems`, `assistantRuns`. No new test hook is needed in `inbound.js`.
- [ ] `server/test/frontdesk-turn.test.js` and `server/test/frontdesk-tables.test.js`: every existing case passes
  unchanged (each calls one turn at a time on a stored conversation, so the lease is taken and given back inside the
  call); one added case in the turn file: after a turn the stored conversation has no `run` field and
  `conversationSchema.safeParse` succeeds.
- [ ] `server/test/frontdesk-runs.test.js`: `listRuns` with `filter: 'handover'` returns a seeded `dropped` run and
  not a `superseded` one; case (k) of plan 752 (every outcome and reason has its dictionary keys) passes with the
  new entries.
- [ ] `assistant-run-view.util.spec.ts`: `outcomeTone('dropped')` and `outcomeTone('superseded')` → `'amber'`;
  `verdictOf` of a `dropped` run with reason `taken_over` → key `asr_verdict_dropped`, `params.reason ===
  'asr_reason_taken_over'`; `stepRows` of a `send` step with `out.overtaken: 2` holds the row `asr_f_overtaken` with
  value 2. `run-detail.component.spec.ts`: `asr-follows` is shown with the right link only when the run has
  `followsRunId`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: recipe-list — `/frontdesk/assistant` (plan 752's page; its frame does not change — one link and one
  field are added inside the open run).
- Hebrew, RTL; no SCSS change, no new class, no new icon.
- What the guest sees: one answer per burst; a message sent while the assistant "types" gets its own answer right
  after the first, never before it; after a team member answers, nothing more from the assistant.
- Data flow: unchanged — `AssistantRunDataService.run_` → `app-run-detail` input → `computed()` verdict and step
  rows → the template; the new link reads `run().followsRunId`.

**Dictionary keys** (all new, appended to `general` in `public/assets/data/dictionary.json`):

| key | Hebrew |
| --- | --- |
| `asr_outcome_dropped` | התשובה לא נשלחה |
| `asr_outcome_superseded` | הוחלף בתשובת המשך |
| `asr_verdict_dropped` | העוזר לא שלח את התשובה ולא שמר דבר: {reason}. |
| `asr_verdict_superseded` | האורח כתב שוב בזמן שהעוזר עבד, ולכן העוזר לא שלח תשובה ולא פתח בקשה. תשובת ההמשך עונה על כל ההודעות יחד. |
| `asr_reason_taken_over` | איש צוות לקח את השיחה בזמן שהעוזר עבד |
| `asr_reason_closed` | השיחה נסגרה בזמן שהעוזר עבד |
| `asr_reason_lease_lost` | איש צוות נכנס לשיחה, או שהעוזר כבר טיפל בה מחדש |
| `asr_reason_overtaken` | האורח כתב שוב בזמן שהעוזר עבד |
| `asr_reason_follow_up_limit` | האורח המשיך לכתוב בזמן שהעוזר ענה, יותר מדי פעמים ברצף |
| `asr_follows` | המשך לטיפול קודם |
| `asr_via_follow_up` | המשך: הודעות שהגיעו בזמן שהעוזר עבד |
| `asr_f_overtaken` | הודעות חדשות שהגיעו בזמן העבודה |

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give a conversation a lease so only one assistant run can work on it, and let the lease end by itself — the run field on the conversation shape, the six lease functions, the exported model budget, the lease unit tests a to m — shared/schemas/entities/conversation.schema.ts, server/services/frontdesk-lease.js, server/routes/ai/frontdesk.js, server/test/frontdesk-lease.test.js
- [ ] A2: Put the decision of what a guest message does next in one function, so a message during a run starts no second run — nextStep and waitFor, afterStored and answerWaiting pass the message id and note a waiting message, the nextStep cases — server/services/inbound.js, server/test/inbound.test.js
- [ ] A3: Tell the model to answer every unanswered guest message and show it how many there are — the prompt line, unansweredTail, the UNANSWERED data block, the prompt cases — server/services/frontdesk-prompt.js, server/test/frontdesk-prompt.test.js
- [ ] A4: Stop a guest who never stops writing from looping the assistant — the follow-up limit in the pre-check with its reason, the guardrail cases — server/services/frontdesk-guardrails.js, server/test/frontdesk-guardrails.test.js
- [ ] A5: Add the new results of a run to its record — the two outcomes and five reasons, followsRunId through the recorder, the handover filter, the recorder cases — shared/schemas/entities/assistant-run.schema.ts, server/services/frontdesk-runs.js, server/test/frontdesk-runs.test.js
- [ ] A6: Run one turn at a time with a follow-up for what arrived meanwhile, and re-check after the model call — runOnce, the lease loop of runTurn, the re-check and the two early exits in runTurnInner, the trigger from unansweredTail, the added turn case — server/services/frontdesk-turn.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-tables.test.js
- [ ] A7: Let take over and a member reply cancel the run that is working — the unset in take over, clearLease before the reply is sent, the router and simulator cases — server/routes/conversations.js, server/test/conversations-router.test.js, server/test/sim-router.test.js
- [ ] A8: Prove the whole behaviour end to end with a held model call — every case of the new one-run test file — server/test/frontdesk-one-run.test.js
- [ ] A9: Show the new results and the follow-up link in the page of runs — the tones, the overtaken field, the link in the run detail, the twelve dictionary keys, the two specs — src/app/pages/frontdesk/assistant/assistant-run-view.util.ts, src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.html, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.ts, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts, public/assets/data/dictionary.json
- [ ] A10: Write down the three new rules and where the new pieces live — R-03 note, R-26 to R-28, the map's Contract line, the backend registry row, breadcrumbs, the new family and the inventory — docs/frontdesk/assistant-behaviour-rules.md, docs/restaurant/restaurant-map.md, docs/agent/standards-backend.md, server/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A11: Run every check of this plan and hand Dandan the two simulator checks — test:server, test:ci, build, both lints, the icon lint, the inventory check, log-query; evidence into Execution Notes; the slot's servers up before the cards

## Technical Considerations
- Dependencies: plan 752 (merged first) and through it plan 751. Plans 675 / 687 / 719 (inbound, the conversation
  routes, hand back), 679 / 689 / 680 (the turn, the pre-checks, the table dialogue), 701 / 731 (the model budget and
  the shape retry), 733 and its fix `4715c94c` (the holding message, the burst on hand back).
- Facts taken from plans 751 and 752, not from the Snapshot: `fillWhen` is called right after the failed-call branch
  (751) — the re-check of this plan stands before that branch; `runTurn` starts the run with `startRun` and ends it
  with `run.finish`, `runTurnInner` receives `run` and records with `run.step` / `run.set` / `run.end`, `NO_RUN` for
  the eval, the turn handler's third argument carries `inbound: { at, waitedMs }`, `trigger.messageIds`,
  `followsRunId`, `RUN_OUTCOMES`, `RUN_REASONS`, `listRuns`, `STEP_FIELDS`, `outcomeTone`, `verdictOf`,
  `app-run-detail`, the `asr_` dictionary prefix and its test (k) that every outcome and reason has its keys (752).
  Plan 752's contract names `'dropped'` / `'superseded'` and `followsRunId` for this plan. One rule of 752 is
  narrowed here: `trigger.messageIds` holds at most the 5 newest unanswered guest messages instead of 12.
- Why the lease is on the conversation document and not in memory. Today the server is one process: one `web`
  service on the free plan started with `node server/index.js` (`render.yaml:5-10`), one `app.listen`
  (`server/index.js:17`). An in-memory map would be correct for that and nothing more. The document lease is chosen
  because (1) the re-check has to read the conversation anyway, and the same read answers "is it still `bot`" and
  "is the lease still mine"; (2) a lease needs an end time in either form (a run that hangs must not block the
  conversation), so the in-memory form saves no code; (3) the live service is hand-made and not tied to the file
  (`render.yaml:2-4`), a deploy runs the old and the new process side by side for a moment, and a second service or
  a local server on the same database is a second process — the map would silently stop working there; (4) the cost
  is two small writes and one read per run beside a model call of seconds. The pattern is the repo's own: a
  conditional update that only one caller can win (`inbound.js:55-58`, `routes/conversations.js:168`), as the unique
  index does for table holds (`server/db.js:202`, `table_holds_cell_unique`).
- The lease length. A run's long part is the model: `askTurnModel` gives both tries one budget of 35 s
  (`TURN_BUDGET_MS`, `routes/ai/frontdesk.js:28`, `:61-65`); inside it each HTTP call is cut at 15 s (`:42`), at
  most 4 calls (`MAX_ATTEMPTS`, `gemini-client.js:518`) with pauses of 0.5 / 1 / 2 s (`:586`), all under the same
  deadline (`callWithFallback`, `:544-581`). So the bound is 35 s, not 15 s × 4. The rest (a handful of database
  reads and writes, one send) has no timeout of its own; 55 s are left for it: `RUN_LEASE_MS = 90000`. A test holds
  `RUN_LEASE_MS >= TURN_BUDGET_MS + 30000`, so plan 754 cannot raise the budget past the lease unnoticed. A follow-up
  moves `until` forward (`graceMs` + `RUN_LEASE_MS`). A run that outlives its lease and finds another run's lease
  drops its answer (`lease_lost`); one that finds its own id still there carries on.
- What stays possible, stated plainly: the re-check and the send are two steps. A take over that lands in the few
  milliseconds between them (guardrails are pure; a table offer is a few reads) still gets the assistant's answer
  just before the member's — the same as a take over a moment after an answer. Closing it needs a send that is
  conditional inside the transport, which `sendOut` (`server/services/outbound.js:18-82`) does not have.
- Why a reply clears the lease before `sendOut`: the member's message is stored only after the transport answered
  (`outbound.js:51`, `:71`) and the status moves after that (`routes/conversations.js:135-139`), so without it a run
  could pass the re-check while the member's message is on its way.
- Order of messages: an answer is stored with the turn's `now`, the time the run started (`sendOut(…, { now })`,
  `frontdesk-turn.js:336`), so a guest message that arrived during the run sorts after it and the follow-up's history
  reads "first answer, then the newer messages".
- Model changes: `Conversation` gains optional `run`; `AssistantRun` gains two outcomes (reasons stay a free string).
- Backend / API: no new route. `PUT /:id/takeover` and `POST /:id/messages` also remove the lease. `runTurn` may
  answer `{ skipped: 'busy' }`, `{ skipped: 'dropped', reason }`, `{ skipped: 'superseded' }`. New log events:
  `inbound.left_to_run`, `frontdesk.turn.busy`, `frontdesk.turn.follow_up`, `frontdesk.turn.dropped`,
  `frontdesk.turn.superseded` (info), `frontdesk.lease.expired` (warn), `conversations.run_cancelled` (info) — ids,
  enums and numbers only.
- Auth and validation: unchanged; the lease is written only by the server for the conversation it already holds.
- Security surface: none new. `run` holds a random id, three numbers and message ids; no guest text.
- Data / migration: none. Old conversations have no `run`; a `run` left by a dead process ends after 90 s.
- Seam for plan 754: the wait and the choice run / wait / leave are `nextStep` (both for an arriving message and for
  the follow-up); the lease does not know the wait (it gets `graceMs`), and `runTurn`'s loop does not know its
  length. 754 changes `nextStep` and `COALESCE_MS` only.
- Project checks: the `log-query` Done-when item; logs carry no guest text (tested); the Reuse Check; the
  `Page recipe:` line; `dictionary.json` append-only with every key listed; `server/breadcrumbs.md`, the registry and
  the inventory in scope; the shapes in `shared/schemas/`; no new endpoint and no new collection.
- Traps: `takeLease` uses the real clock while a turn's `now` may be a test's fixed time — never mix them;
  `runTurn` must give the lease back on every path (`try` / `finally`), or the next test of the same conversation
  gets `busy`; `$elemMatch` with `$nin` on an array of strings matches "some element outside the list" — with an
  empty `seen` every element is outside it, which is intended for a run that stopped before the history read;
  `frontdesk-lease.js` must not require `inbound.js` (a cycle); the generated schemas must be rebuilt before the
  server tests (`pnpm run test:server` does it); the eval passes a changed copy of the conversation to `runTurn`
  (`server/scripts/ai-eval-frontdesk.js:225`), so the turn keeps working on the object it was given and the lease
  functions use only its `_id` and `businessId`; in the one-run tests never assert a `fetch` count before the
  `settled` promise of the first message resolved (it resolves after the last follow-up).

## Out of Scope
- The length of the wait, the model timeouts and anything else about speed (plan 754); picking the relevant facts
  (plan 755); the console's other tabs (plan 756).
- A lock for suggest mode: a member's "suggest" may run beside a turn; it sends nothing.
- Button taps: no lease and no order between a tap and a run that is working; a run still reads `pending` from the
  conversation it was started with, as today.
- A question glued to a table booking in one burst: the table engine's sentence is sent and the model's reply (with
  the answer to the question) is dropped, as for every table turn today (`frontdesk-turn.js:281`); the guest asks
  again.
- A send that is conditional inside the transport (the few-millisecond window named above).
- Showing "the assistant is working" in the inbox from the `run` field; a filter chip for dropped runs.
- Recording a run for a message that was left to a running run (it appears in the follow-up's `trigger.messageIds`).
- Changing the dialogue set of the eval (fixed at 30) or adding a live-model check of the new prompt line.
- Removing the lease in `closeConversation`: a closed conversation's lease ends by itself and is never read again.

## Critical Questions
- none

## Execution Notes
- behaviour: at most one assistant run works on a conversation; the lock is a lease on the conversation document (90 s, ends by itself), not an in-memory map, so it also holds for two server processes and a restart.
- behaviour: a guest message that arrives while a run works starts no run; it is noted on the lease, and when the run ends one follow-up run answers the unanswered guest messages together — at most the 5 newest are counted, older ones stay in the history the model reads.
- behaviour: the follow-up waits what is left of the 6-second burst wait since the guest's newest message, then runs; the lease is held through that wait.
- behaviour: the first run's answer IS sent when newer messages arrived (it answers what it was asked and is stored before them), and the follow-up answers the newer ones; the record of the first run says how many arrived.
- behaviour: one exception — when the first run was about to open a request or change or cancel a table and newer messages wait, it writes nothing and sends nothing (run `superseded`), and the follow-up answers all the messages together; the guest may just have corrected himself, and a write cannot be taken back.
- behaviour: at most 3 follow-ups in a row; a guest who keeps writing through four answers is handed to a person with the usual handoff sentence (reason `follow_up_limit`).
- behaviour: a follow-up is an ordinary turn for the daily cap and for the 8-answer limit; no separate counting.
- behaviour: take over and a member's reply cancel the run that is working: nothing is sent, no request, table change, draft or holding message is written, the run is recorded as `dropped`, and no follow-up starts.
- behaviour: a member's reply cancels the run before the reply is sent, also when the send is then refused (window closed, do not contact): the assistant could not have sent in those cases either.
- behaviour: a hand back during a run that is still working: the take over already cancelled that run, so the hand back starts a fresh one at once; the old run's answer is dropped (`lease_lost`).
- behaviour: a conversation closed during a run: the answer is dropped (`closed`).
- behaviour: a run whose process died blocks the conversation for at most 90 seconds; the next guest message after that runs normally and a warning is logged.
- behaviour: button taps take no lease and are answered at once, also during a run.
- behaviour: a member's "suggest" takes no lease.
- behaviour: at level 0 the same rules hold for drafts: a follow-up's draft replaces the first one.
- behaviour: the prompt gets one new line; the UNANSWERED block appears only with two or more unanswered guest messages, so a single-message turn sends the model exactly what it sends today.
- behaviour: when several unanswered messages ask for different things, the model is told to let a request or a table booking decide the intent and to answer the questions in the reply.
- behaviour: a dropped run is listed under "הועברו לצוות" in the page of runs, a superseded one under "הכול" only; both get an amber tag.
- behaviour: the Gemini request keeps consecutive `user` turns as the code already sends them (the data block is itself a `user` turn before the first guest message); no merge of messages.
