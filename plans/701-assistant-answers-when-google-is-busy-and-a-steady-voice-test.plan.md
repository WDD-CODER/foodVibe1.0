# Plan 701 — The assistant answers when Google is busy: a second model on overload, a reason the staff can read, and a steady voice test

Status: draft
Depends-on: none
Snapshot: d06302a34cca8c8fc09125c3a7737c34b4ed2ab3

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

In the Human's validation of 2026-11-23 (cards ㉙, ㉚, ㉛) the front-desk assistant almost never answered. The server
log (`.claude/be.log` of slot `wt-2`) shows why: 24 of 27 `frontdesk.turn.gemini_call` calls went to
`gemini-3.1-flash-lite` and Google answered 503 "This model is currently experiencing high demand"; three more ended
in a 20 s timeout. Every request kept retrying the **same** model (plan 614: up to 4 calls, 0.5 / 1 / 2 s apart), so
all four calls hit the same overloaded model and the turn failed. A failed guest turn is silent (R-04) and moves the
conversation to a person — but nothing tells the staff why; a failed "suggest a reply" answers 502 `AI_FAILED` with no
reason, so the inbox can only say "לא הצלחנו להציע תשובה".

Root causes, verified on the Snapshot:
- `server/services/gemini-client.js:475-482` — the retry loop calls `callOnce` with the same `model` every time;
  `:483-491` `MAX_ATTEMPTS = 4`, delays 0.5 / 1 / 2 s; `:493-497` `isTransient` does not count `timeout`, so a timeout
  ends the request at once (be.log request `12c3d62b…`: 503, 503, then a 20 s timeout → failed).
- `server/services/gemini-client.js:412-414` — the rule "never a second model per request" (Human 2026-10-09: no
  unattended spend). The model list (`DEFAULT_MODELS`, `:55-63`) holds only free-tier models and every business uses the
  one shared key (`server/services/ai-key.js:6-8`), so a second free model costs nothing; but the front desk has no
  user to ask, so it has to switch by itself.
- `server/routes/ai/frontdesk.js:31-39` — `askTurnModel` calls `callGemini` with `timeoutMs: 20000` and keeps only
  `call.kind` (no status); `:60` answers `502 { error: 'AI_FAILED' }` with no reason.
- `server/services/frontdesk-turn.js:190-195` — a failed turn logs `frontdesk.turn.failed`, hands off silently and
  stores nothing on the conversation, so the inbox cannot explain the handoff.

Also in this plan (server-only, same run): the flaky test `server/test/ai-voice-transcribe.test.js` "writes one ledger
row per call…" (expected 1 row, got 2) that failed on 4 PRs. Cause: `beforeEach` (`:32-50`) runs
`aiUsage.deleteMany({})` without first waiting for the ledger writes of the previous test. `recordAiUsage`
(`server/services/ai-usage.js:90-117`) is fire-and-forget; the test before it ("puts the prompt only in
system_instruction…", `:153`) makes a successful call and does not wait, so its `insertOne` can land after the
`deleteMany` on another pooled connection, and the next test counts two `voice_transcribe` rows.

Plan 702 (browser) shows the reason this plan returns; it depends on this plan.

## Goals & Success Criteria
**Primary:** when Google answers 503 / overloaded / a per-minute 429 / a timeout for the front-desk assistant, the same
request tries the next free model of the chain, within a fixed time budget; a failure that still happens carries one of
four reasons (`busy`, `timeout`, `quota`, `other`) — on the suggest answer and, for a guest turn, on the conversation —
and the voice test passes every time.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/gemini-fallback.test.js` and the new cases in
  `server/test/frontdesk-turn.test.js`, `server/test/ai-frontdesk-suggest.test.js` and
  `server/test/ai-voice-transcribe.test.js`.
- [auto] `server/test/gemini-fallback.test.js` (fetch stubbed): with the chain `[A, B, C]` and `fallback: true`, A
  answering 503 and B answering 200 → result `{ kind: 'ok', model: B }`, exactly 2 fetch calls (the second URL names
  B), 2 ledger rows (models A and B), one `frontdesk.turn.fallback` log line `{ from: A, to: B }`; A timing out then B
  ok → ok on B; A 429 not-daily → B; A 429 daily quota → A marked exhausted and B called, no wait; A 400 → no fallback,
  `gemini_error` 400 after 1 call; all models 503 → `gemini_error` 503 after exactly `MAX_ATTEMPTS` (4) calls, cycling
  A, B, C, A; a chain of one model → the same model is retried (plan 614 behaviour); `deadlineMs: 5000` with calls that
  each take longer than the remaining time → no call starts with less than 2000 ms left and the last result is
  returned; **without** `fallback` every case above calls only A (the existing behaviour, unchanged).
- [auto] `server/test/gemini-client.test.js` keeps passing unchanged (the default path is untouched).
- [auto] `server/test/frontdesk-turn.test.js` (new cases): a guest turn whose model call fails with 503 on every model
  sends nothing (R-04), sets the conversation to `human` and stores `assistantFailed: { at, reason: 'busy' }`; a timeout
  → `reason: 'timeout'`; the daily turn cap → `reason: 'quota'`; a `bad_json` answer → `reason: 'other'`; the next
  successful turn of that conversation removes `assistantFailed`; the conversation still validates against
  `conversationSchema`.
- [auto] `server/test/ai-frontdesk-suggest.test.js` (new case): a suggest whose model calls all fail with 503 answers
  `502 { error: 'AI_FAILED', reason: 'busy' }` and leaves the conversation unchanged (no `assistantFailed` in suggest
  mode); the existing case "a failed model call is 502 AI_FAILED…" still passes.
- [auto] `server/test/ai-voice-transcribe.test.js`: `beforeEach` awaits `_waitForUsageWritesForTests()` before it
  clears `aiUsage`, and the ledger case reads only its own business's rows; `pnpm run build:schemas` then
  `pnpm --dir server exec vitest run ai-voice-transcribe` → exit 0 on five runs in a row (vitest 5 has no
  repeat flag; run the command five times and paste the five exit codes into Execution Notes).
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`/frontdesk/simulator`, as `demo_host`), the test guest writes three questions in a row
  ("מתי אתם פתוחים?", "יש חניה?", "אפשר שולחן לארבעה מחר ב-20:00?") · each one gets an answer from the assistant
  within about half a minute, even on an evening when Google is busy.

## Execution Mode
- Parallel: yes with plans that do not touch `server/services/gemini-client.js`, `server/routes/ai/frontdesk.js`,
  `server/services/frontdesk-turn.js` or `shared/schemas/entities/conversation.schema.ts`. Plan 702 runs after it.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/gemini-client.js
server/routes/ai/frontdesk.js
server/services/frontdesk-turn.js
shared/schemas/entities/conversation.schema.ts
server/test/gemini-fallback.test.js
server/test/gemini-client.test.js
server/test/frontdesk-turn.test.js
server/test/ai-frontdesk-suggest.test.js
server/test/ai-voice-transcribe.test.js
server/breadcrumbs.md
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

- INV-6: preserves — every Gemini call still goes through `callGemini` from the AI sub-router `server/routes/ai/frontdesk.js` (and `frontdesk-turn.js` still calls only `askTurnModel`); the fallback only changes which catalog model the server calls; no key reaches the browser.
- INV-2: preserves — `gemini-client.js` and `frontdesk-turn.js` change no business scoping; the one new write (`assistantFailed` on the conversation) uses the conversation's own `_id` + `businessId` filter, as the existing `status` write does.
- INV-4: preserves — the new optional `assistantFailed` field is added to the one Zod schema in `shared/schemas/entities/conversation.schema.ts`; the generated server schema is rebuilt by `pnpm run test:server` (`build:schemas`), and a test checks the stored document still validates.
- INV-7: preserves — `frontdesk-turn.js` only records why a model call failed; every table decision still goes through the table engine, and no hold, booking or seating path changes.
- INV-1: preserves — no route, permission or actor changes; the suggest route keeps `verifyToken`, `requireModule('frontdesk')`, `manageConversations` and `scopeFilter`.

## Reuse Check

- `callGemini({ fallback, deadlineMs })` — family: none — rung: 4 — why: two options on the one existing Gemini client (plan 395), not a new piece; the server has no registry family for services.
- `failureReason(kind, status)` in `server/services/frontdesk-turn.js` — family: none — rung: 4 — why: a five-line pure mapping used by the turn and the suggest route only; it lives beside `runTurn`, which both already import.
- `server/test/gemini-fallback.test.js` — family: none — rung: 4 — why: a test file in the existing `server/test/` folder, the stub pattern of `server/test/gemini-client.test.js`.

## Defaults

- loading-and-error-states — exception — why: no screen in this plan; it only adds the failure reason, and plan 702 shows it and carries the card
- hints-in-tooltips — exception — why: no screen in this plan

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want the assistant to answer my guests even when one AI model is overloaded, so that guests are not left waiting for a person at night.
- As a host, I want to know why the assistant passed a chat to me, so that I know whether to try again or just answer myself.

## Functional Requirements

### Must Have (P0)

**Gemini client — `server/services/gemini-client.js`**
- [ ] `callGemini` takes two new optional options: `fallback` (boolean, default false) and `deadlineMs` (number,
  default none). Without `fallback` nothing changes: same model, up to 4 calls, `isTransient` as today.
- [ ] With `fallback: true`, a call is **overloaded** when it is `network`, `timeout`, or `gemini_error` with status
  429 (not the daily quota), 500, 502, 503 or 504. After an overloaded call the next attempt goes to the **next usable
  model** of `candidates` after the current one in chain order, wrapping around, skipping exhausted models; with one
  usable model it is the same model. A daily-quota 429 (`model_exhausted`) marks the model exhausted as today and the
  next attempt goes to `nextModel` with no wait; `all_exhausted` returns at once. Any other result (ok, 4xx, unreadable
  body) returns at once.
- [ ] At most `MAX_ATTEMPTS` (4) calls in all. Between attempts the existing `retryDelayMs(attempt)` wait (0 under the
  test runner), except after a daily quota (no wait).
- [ ] With `deadlineMs`, the request ends when the time since the first call plus the next call's wait would leave less
  than 2000 ms; each call's timeout is `min(timeoutMs, remaining)`. The last result is returned.
- [ ] Each attempt is a real call with its own usage count, ledger row (its own `model`) and `gemini_call` log, as
  today. A switch logs `warn` `${eventPrefix}.fallback` `{ from, to, attempt, kind, status }`. The `ok` result names
  the model that answered.
- [ ] The business cap check, the removed-model check and the media filter run once, before the first call, as today.
- [ ] Update the comment block of `callGemini` (`:410-427`): the server switches models by itself only for callers
  that pass `fallback` — the unattended front desk — and only among the free-tier catalog models on the shared key.

**Front-desk calls — `server/routes/ai/frontdesk.js`**
- [ ] `askTurnModel` calls `callGemini` with `timeoutMs: 15000`, `deadlineMs: 35000`, `fallback: true`, and returns
  `{ ok: false, reason: call.kind, status: call.status }` on failure (`bad_json` / `bad_shape` as today).
- [ ] The `/fix` route's `callGemini` gets `fallback: true` and `deadlineMs: 35000` (its draft is still saved plainly
  when the model fails, as plan 682 says).
- [ ] `/suggest`: a failed `runTurn` answers `502 { error: 'AI_FAILED', reason }`, `reason` from the result's `group`
  (`'other'` when the result has none, e.g. `skipped`).

**Turn — `server/services/frontdesk-turn.js`**
- [ ] New pure, exported `failureReason(kind, status)`: `busy` for `network` and for `gemini_error` with 429 / 500 /
  502 / 503 / 504; `timeout` for `timeout`; `quota` for `model_exhausted`, `all_exhausted`, `business_cap` and the turn
  cap `cap`; `other` for everything else (`bad_json`, `bad_shape`, `model_removed`, any other status).
- [ ] A failed model call returns `{ ok: false, reason, group: failureReason(reason, status) }`. In mode `turn` it also
  sets `assistantFailed: { at: now, reason: group }` on the conversation in the same `updateOne` that hands it to a
  person (pass it into `handOff` or write it right after; one write per failure). The daily cap path does the same with
  `quota`. Nothing is sent to the guest (R-04 unchanged).
- [ ] A turn that completes (any `frontdesk.turn.done`) in mode `turn` unsets `assistantFailed`. Suggest mode never
  writes it.
- [ ] The log line `frontdesk.turn.failed` gains `group`. Logs stay ids and enums only.

**Schema — `shared/schemas/entities/conversation.schema.ts`**
- [ ] `assistantFailed: z.strictObject({ at: z.number(), reason: z.enum(ASSISTANT_FAILURE_REASONS) }).optional()`,
  with `export const ASSISTANT_FAILURE_REASONS = ['busy', 'timeout', 'quota', 'other'] as const` and its type. The
  conversation read routes already return the whole document, so plan 702 receives it with no route change.

**Flaky voice test — `server/test/ai-voice-transcribe.test.js`**
- [ ] `beforeEach` awaits `_waitForUsageWritesForTests()` before `aiUsage.deleteMany({})`; `afterEach` also awaits it.
- [ ] The ledger case filters its rows by the business of its own request (`businessId` of the token it signs, the
  `b_voice<n>` value it already asserts) instead of reading every `voice_transcribe` row.

### Should Have (P1)
- [ ] `server/breadcrumbs.md`: one line under the services entry that `gemini-client.js` has an opt-in model fallback
  for the front desk.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen. The reason values are a contract for plan 702: `busy`, `timeout`, `quota`, `other`.
- No new dictionary key (the server sends no new guest text).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Stop the flaky voice test by waiting for the last test's ledger writes before clearing them — await the pending writes in beforeEach and afterEach, read only this request's rows — server/test/ai-voice-transcribe.test.js
- [ ] A2: Let the front desk switch to the next free model when Google is overloaded — fallback and deadlineMs options, next-model order, quota skip, attempt cap, fallback log, comment updated; tests for every case and for the unchanged default — server/services/gemini-client.js, server/test/gemini-fallback.test.js, server/test/gemini-client.test.js
- [ ] A3: Give every assistant failure a reason the staff can read — failureReason, assistantFailed on a failed guest turn and removed on the next good one, the schema field — server/services/frontdesk-turn.js, shared/schemas/entities/conversation.schema.ts, server/test/frontdesk-turn.test.js
- [ ] A4: Use the fallback in the front-desk calls and send the reason with a failed suggestion — askTurnModel options and status, fix route options, 502 with reason — server/routes/ai/frontdesk.js, server/test/ai-frontdesk-suggest.test.js
- [ ] A5: Note the opt-in fallback where the next plan looks — server/breadcrumbs.md, docs/brain/inventory.md (only if it lists gemini-client options)
- [ ] A6: Run every check of this plan and hand Dandan the hand check — test:server, the voice test five times, server lint, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `callGemini` (plans 395, 412, 566, 614, 617), `runTurn` / `handOff` (679, 689), the suggest and fix
  routes (679, 682).
- New files needed: `server/test/gemini-fallback.test.js`.
- Model changes: `conversation.assistantFailed` (optional).
- Backend / API: `POST /api/v1/ai/frontdesk/suggest` 502 body gains `reason`. No new route.
- Auth and validation: unchanged.
- Security surface: none new; the fallback only calls catalog models with the same shared key.
- Data / migration: none (optional field).
- Cost: free-tier models only (`DEFAULT_MODELS` holds no paid model); at most 4 calls per request, as today.
- Project checks: the `log-query` Done-when item; schemas in `shared/schemas`; logs carry no guest text.
- Traps: keep the default path byte-for-byte the same — many routes rely on "one model per request"; count the turn
  cap's `aiUsage` rows the same way (a fallback adds rows per call exactly as a retry does today); `timeout` must be a
  fallback reason only with `fallback: true`.

## Out of Scope
- Any screen (plan 702). A guest-facing message on failure (R-04 keeps a failed turn silent).
- Changing the admin's model chain or its order; paid models; per-business keys.
- Retrying other AI features on another model.
- The floor editor's tooltip and joined-border items (another plan).

## Critical Questions
- none

## Execution Notes
- behaviour: the front desk switches to the next free model by itself on overload, a narrow exception to the Human's 2026-10-09 rule "the server never switches models by itself"; it applies only to callers passing `fallback` (the unattended assistant and the fix draft), only among free-tier catalog models on the shared key, so it adds no spend. If the Human rejects it, drop `fallback: true` in `server/routes/ai/frontdesk.js` and the rest stays harmless.
- behaviour: a failed guest turn stays silent to the guest (R-04); the reason is stored for the staff only.
- behaviour: per-call timeout 15 s and a 35 s budget per request, so one suggest answers within about 35 s instead of up to 80 s.
- behaviour: a per-minute 429 and a timeout count as overload for the front desk, because a second model has its own bucket.
- behaviour: the voice test fix is in the test only; `recordAiUsage` stays fire-and-forget.
