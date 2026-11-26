# Plan 754 — The assistant answers faster: it waits 2 quiet seconds instead of a fixed 6, gives the first AI model 6 seconds before the next one is tried, and can show "typing…" on a channel that supports it

Status: draft
Depends-on: 753
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

In the Human's simulator tests of 2026-11-25/26 a simple answer took 11–15 s. Where the time goes, verified on the
Snapshot:

**1. Every message waits a fixed 6 s.** `afterStored` (`server/services/inbound.js:73-98`) waits `COALESCE_MS` = 6000
(`:15`, `:91`) before every turn, to see whether the guest sends another message (R-03,
`docs/frontdesk/assistant-behaviour-rules.md:17`). A guest who sent one message and stopped writing still waits the
whole 6 s. `COALESCE_MS` is read only inside that file on the Snapshot (`:91`, exported at `:150`); no test, no page
and no script reads it. Plan 753 (merged before this plan) keeps the value and reads it in two more places: its
function `nextStep` in `inbound.js` and the `graceMs: COALESCE_MS` of the lease loop in `frontdesk-turn.js`.

**2. A slow first AI model holds the answer for up to 15 s.** What is true NOW for the front-desk turn:
- `askTurnModel` (`server/routes/ai/frontdesk.js:37-66`) calls `callGemini` with `timeoutMs: 15000`,
  `fallback: true` and one shared budget of 35 s (`TURN_BUDGET_MS`, `:28`, `:41-43`); a malformed answer gets one
  more `callGemini` inside the same budget (plan 731, `:61-65`).
- The file header of `server/services/gemini-client.js` still says "the server never retries on another model by
  itself" (`:9-10`). That holds for every other AI feature. The front desk is the one exception since plan 701
  (`:424-432`): with `fallback: true`, `callWithFallback` (`:544-582`) makes up to 4 HTTP calls (`MAX_ATTEMPTS`,
  `:518`); a network error, a timeout, a 429 that is not the daily quota, or a 500 / 502 / 503 / 504 (`isOverloaded`,
  `:523-526`) moves to the next usable model of the chain, wrapping around (`nextUsableAfter`, `:534-541`), after a
  pause of 0.5 s, 1 s, 2 s (`retryDelayMs`, `:586`); a daily-quota 429 marks the model exhausted until Google's
  reset (`:626-632`); a 404 marks it gone for the day (plan 730, `:560-566`); no call starts with less than 2 s of
  the budget left (`MIN_CALL_MS`, `:519`, `:574`).
- One HTTP call is cut by `AbortSignal.timeout(timeoutMs)` (`:611`); a cut call returns `{ kind: 'timeout', model }`
  (`:614-618`) and marks nothing. There is no shorter limit for the first model: a first model that is alive but
  slow keeps the guest waiting until it answers or 15 s pass.
- The chain (`DEFAULT_MODELS`, `:55-61`) and the free daily requests per model (`MODEL_DAILY_BUDGETS`, `:33-39`):
  `gemini-3.1-flash-lite` 500, `gemini-3.5-flash-lite` 500, `gemini-3.6-flash` 20, `gemini-3.8-flash` 20,
  `gemini-3-flash-preview` 20. One key serves every business (`server/services/ai-key.js:6-8`).

Measured latency (not from the checkout: the `aiUsage` rows of the Human's local database `foodvibe`, feature
`frontdesk_turn`, all from the simulator, 2026-11-23 to 2026-11-25, 102 HTTP calls, read on 2026-11-26):

| model · result | calls | median | 75 % | 90 % | longest |
| --- | --- | --- | --- | --- | --- |
| `gemini-3.1-flash-lite` · answered | 35 | 3.7 s | 6.8 s | 7.6 s | 12.8 s |
| `gemini-3.1-flash-lite` · 503 | 23 | 2.1 s | 5.8 s | 9.4 s | 15.1 s |
| `gemini-3.1-flash-lite` · cut at 15 s | 10 | 15.0 s | — | — | — |
| `gemini-3.5-flash-lite` · answered | 13 | 1.0 s | 1.1 s | 1.2 s | 14.9 s |
| `gemini-3.5-flash-lite` · 503 | 9 | 0.9 s | 1.1 s | 3.5 s | 3.5 s |

Of the 35 good answers of the first model, 7 came within 2 s (20 %), 14 within 3 s (40 %), 18 within 4 s (51 %),
20 within 5 s (57 %), 25 within 6 s (71 %), 28 within 7 s (80 %), 32 within 8 s (91 %). The direction the Human
agreed to was "2 s on the first model". The numbers say a 2 s limit would throw away 4 of every 5 good first
answers and pay for a second request each time. This plan therefore sets the limit at 6 s (see "Why 6 seconds"
under Technical Considerations) and makes the value one named constant that can be tuned from the records.

**3. The guest sees nothing while the assistant works.** The transports are `sim` only
(`server/services/channels/index.js:10`, `sim-channel.js:5-12`); WhatsApp is a stand-in that never sends
(`index.js:13-21`); there is no WhatsApp transport file and no webhook route (plan 683 is a draft that is not
built; only the variable names exist, `server/.env.example:27-31`). A transport has four members, `{ name, real,
clientSource, send }` (`index.js:4`), and `sendOut` is the only caller of a transport (`server/services/outbound.js:5`,
`:51`). The simulator already shows moving dots from the browser side (plan 735, built:
`src/app/pages/frontdesk/simulator/simulator.page.ts:38`, `:122-127`).

**4. The time is not visible.** Plan 752's run record keeps `waitedMs` for the wait and one `attempts` entry per
`callGemini` call, not per HTTP call, so a slow first model and the switch to the second look like one long try.

**5. The reads before the model call run one after another** (`server/services/frontdesk-turn.js:216-219`: the
history, then the count of assistant answers; `:231-232`: the facts, then the tables).

Plans 751, 752 and 753 run first; their code is not in the Snapshot. This plan names their symbols, not their lines
(see "Facts taken from plans 751–753" under Technical Considerations).

## Goals & Success Criteria
**Primary:** a guest who writes one message gets the assistant's answer about 4 s sooner than today; a guest who
keeps writing short messages still gets one answer, started at most 6 s after the first of them; a first AI model
that is slow costs 6 s, not 15 s; the page of runs shows the wait, each AI try with its time, and the time from the
guest's last message to the answer.

- [auto] `pnpm run test:server` → exit 0, including the new and changed cases in `server/test/inbound.test.js`,
  `server/test/gemini-fallback.test.js`, `server/test/frontdesk-turn.test.js`, `server/test/frontdesk-one-run.test.js`,
  `server/test/frontdesk-runs.test.js`, `server/test/outbound.test.js`; and `server/test/gemini-client.test.js`,
  `server/test/ai-usage.test.js`, `server/test/frontdesk-lease.test.js` and `server/test/frontdesk-eval.test.js`
  unchanged and green.
- [auto] `server/test/inbound.test.js`, new block "plan 754: the quiet wait", `nextStep` with `now = 100000`:
  a `bot` conversation with no lease, `waited: false`, `at: 50000` and no `burstAt` → `{ do: 'wait', ms: 2000,
  capped: false }`; the same with `burstAt: 50000` → `ms: 2000, capped: false`; `burstAt: 46000` → `ms: 2000,
  capped: false`; `burstAt: 45500` → `ms: 1500, capped: true`; `burstAt: 44500` → `ms: 500, capped: true`;
  `burstAt: 44000` and `burstAt: 10000` → `ms: 0, capped: true`; `burstAt: 60000` (later than `at`) → `ms: 2000,
  capped: false`. With `holder: true`, `waited: false`: `at: now - 500` → `{ do: 'wait', ms: 1500, capped: false }`;
  `at: now - 2000` and `at: now - 9000` → `ms: 0`; `at: now + 5000` → `ms: 2000`. The cases `stop`, `leave`
  (`running`, `newer`) and `run` of plan 753 pass unchanged.
- [auto] same block, `burstAtOf(rows, at)` (rows newest first): `[]` with `at: 100` → `100`; `[guest in at 100,
  guest in at 60, out at 50, guest in at 10]` → `60`; `[out at 100, guest in at 60]` → `100`; `[guest in at 100,
  guest in at 40]` → `40`.
- [auto] same block, "one message": `controllableWait()`, a stub turn handler, one guest message at `NOW` → after
  20 ms `w.calls` equals `[2000]` and the handler was not called; after `w.release()` the handler was called 1 time
  and its third argument's `inbound` matches `{ at: NOW, quietMs: 2000, capped: false }` with `waitedMs` and
  `arrivedAt` numbers.
- [auto] same block, "five short messages": guest messages at `NOW`, `NOW + 1500`, `NOW + 3000`, `NOW + 4500`,
  `NOW + 5500` → `[...w.calls].sort((a, b) => a - b)` equals `[500, 1500, 2000, 2000, 2000]` (so the two newest
  both end their wait at `NOW + 6000`); after one `w.release()` the handler was called exactly 1 time, with a
  conversation whose `lastInboundAt` is `NOW + 5500` and `inbound` matching `{ at: NOW + 5500, quietMs: 500,
  capped: true }`; the log holds 4 records `inbound.coalesced`.
- [auto] same block, "an old message does not shorten the wait": a guest message at `NOW`, released (the stub
  handler sends nothing), then one at `NOW + 7000` → `w.calls` equals `[2000, 2000]` and the handler was called 2
  times. "An answer starts a new burst": a guest message at `NOW` released, an outbound `messages` row inserted at
  `NOW + 1000`, a guest message at `NOW + 5000` → its wait is `2000`.
- [auto] `server/test/frontdesk-one-run.test.js`, new case "plan 754: the follow-up waits what is left of 2
  seconds": `setWaitForTest(async ms => { calls.push(ms) })`; the first run's model call is held open, `m2` arrives,
  both calls answer → `calls.length === 2`, `calls[0] === 2000`, `0 <= calls[1] && calls[1] <= 2000`; the second
  run document's `inbound` step has `out.via === 'follow_up'`, `out.quietMs === calls[1]`, `out.capped === false`;
  `fetch` was called 2 times; every existing case of the file passes unchanged.
- [auto] `server/test/gemini-fallback.test.js`, new block "plan 754: a short limit on the first model" (the file's
  `fb` helper, `timeoutMs: 1000`, chain `[A, B, C]`, `AbortSignal.timeout` spied as in the file's deadline case):
  (a) `fb(log, { firstLimitMs: 300, onCall })`, `fetch` rejects once with a `TimeoutError` and then answers 200 →
  the result matches `{ kind: 'ok', model: B }`; the spied limits equal `[300, 1000]`; `onCall` got 2 entries
  matching `[{ model: A, ok: false, reason: 'slow', limitMs: 300 }, { model: B, ok: true }]`, each with a number
  `ms`; the ledger holds a row for `A` with `ok: false, errorCode: 'slow'` and a row for `B` with `ok: true`; the
  log holds one warn `frontdesk.turn.slow` matching `{ model: A, limitMs: 300 }` and one warn
  `frontdesk.turn.fallback` matching `{ from: A, to: B, kind: 'slow' }`; `(await getModelStatus([A]))[0].exhausted`
  is `false` and the next `fb(log)` calls `A` first.
  (b) `A` answers 200 at once → `fetch` called 1 time, the spied limits equal `[300]`, `onCall` got 1 entry
  `{ model: A, ok: true }`.
  (c) `process.env.GEMINI_MODELS = [A, C].join(',')` (the next model has 20 a day) → the first spied limit is `1000`;
  a `TimeoutError` on `A` gives `onCall[0].reason === 'timeout'` and the answer comes from `C` (plan 701, unchanged).
  (d) the quota document of today (`_id: 'quota-' + quotaDayKey()`) seeded with `calls` of 250 for `B` (key with `_`
  for `.`) → the first spied limit is `1000`; seeded with 249 → `300`.
  (e) a chain of one model → the first spied limit is `1000`.
  (f) `A` rejects with a `TimeoutError`, `B` answers 503, then 200 → the called models equal `[A, B, A]` (never
  `C`) and the spied limits equal `[300, 1000, 1000]`.
  (g) without `fallback`: `call(log, { firstLimitMs: 300 })` with a `TimeoutError` → the spied limit is `1000` and
  the result equals exactly `{ kind: 'timeout', model: A }`.
  (h) `fb(log, { firstLimitMs: 300, deadlineMs: 200 })` with a `TimeoutError` → the result equals exactly
  `{ kind: 'timeout', model: A }`, `fetch` called 1 time, `onCall[0].reason === 'timeout'`.
  (i) an `onCall` that throws → the result still matches `{ kind: 'ok' }`.
  Every existing case of the file passes unchanged.
- [auto] `server/test/frontdesk-turn.test.js`, new block "plan 754: speed": "the first model is slow": `fetch`
  rejects once with a `TimeoutError`, then answers `SMALL` → the turn returns `{ ok: true, sent: true }`, one
  outbound message `שלום` by `ai`; the spied limits that are `6000` or `15000` equal `[6000, 15000]`; the run
  document has `outcome: 'answered'`, `fallbackUsed: true`, `model === DEFAULT_MODELS[1]`, step `ai` with status
  `note` and `out.attempts` matching `[{ model: DEFAULT_MODELS[0], ok: false, reason: 'slow', limitMs: 6000,
  try: 1 }, { model: DEFAULT_MODELS[1], ok: true, try: 1 }]`.
  "The first model is fast": `SMALL` at once → `fetch` called 1 time, `out.attempts` has 1 entry with `ok: true`,
  step `ai` is `ok`.
  "Every model is slow": `fetch` always rejects with a `TimeoutError` → the turn returns `{ ok: false, reason:
  'timeout', group: 'timeout' }`; exactly one outbound message, the holding text by `server`; status `human`; the
  run is `failed` / `timeout`; `out.attempts.map(a => a.model)` equals `[M0, M1, M0, M1]` (the first two of
  `DEFAULT_MODELS`; never a model with 20 a day) and `out.attempts.map(a => a.reason)` equals `['slow', 'timeout',
  'timeout', 'timeout']`.
  "The limit fits the budget": `FIRST_MODEL_LIMIT_MS === 6000`, `FIRST_MODEL_LIMIT_MS + 15000 + 2000 <=
  TURN_BUDGET_MS`, `TURN_BUDGET_MS === 35000` (both read from `require('../routes/ai/frontdesk')`).
- [auto] same block, "typing" (the `sim` channel replaced through `setChannelForTest` by a transport with a
  `typing` spy; `resetChannelsForTest()` after each case): a level-1 turn with `SMALL` → `typing` called 1 time, its
  third argument equals `{ providerMessageId: 'pm1' }`; a conversation with status `human` → not called; `mode:
  'suggest'` → not called; a real guest at level 0 → not called; a turn stopped by the pre-check (the first word of
  `HANDOFF`) → not called; a `typing` that rejects → the turn still returns `{ ok: true, sent: true }` and the log
  holds one warn `outbound.typing.failed` whose keys beside the logger's own are `event`, `conversationId`,
  `errName`.
- [auto] same block, "the timings in the record": `turn(conversation, { inbound: { at: 5, waitedMs: 2000,
  quietMs: 2000, capped: false, arrivedAt: Date.now() - 3000 } })` with `SMALL` → the `inbound` step's `out` equals
  `{ waitedMs: 2000, answers: 1, quietMs: 2000, capped: false }` and the `send` step's `out.answerMs` is a number
  `>= 3000` and `< 60000`; plan 752's case `turn(conversation, { inbound: { at: 5, waitedMs: 6000 } })` still gives
  `out` equal to `{ waitedMs: 6000, answers: 1 }` and a `send` step with no `answerMs`. Over all cases of the block
  the captured log text contains neither `GUEST-SECRET-TEXT` nor `שלום`.
- [auto] `server/test/outbound.test.js`, new block "showTyping (plan 754)" (a fake transport `{ name: 'whatsapp',
  real: true, clientSource: 'whatsapp', send, typing }` through `setChannelForTest('whatsapp', …)`, a conversation
  seeded with `channel: 'whatsapp'`, an `active` profile and one stored guest message with `providerMessageId:
  'wamid.1'`): → `{ shown: true }` and `typing` called 1 time with a third argument equal to `{ providerMessageId:
  'wamid.1' }`; profile status `draft` → `{ shown: false, why: 'not_live' }`; `test: true` on the conversation →
  `not_live`; a client with `doNotContact` → `do_not_contact`; no guest message → `no_message`; `typing` rejects →
  `{ shown: false, why: 'failed' }` (the call does not reject); the unchanged `sim` channel → `{ shown: false, why:
  'no_typing' }`.
- [auto] `server/test/frontdesk-runs.test.js`: a run started with `inbound: { at: 1, waitedMs: 500, quietMs: 500,
  capped: true, arrivedAt: Date.now() - 1000 }` stores `inbound.out` with `quietMs: 500, capped: true`; `run.step('send',
  { out: { action: 'sent' } })` adds `answerMs >= 1000`; a second `run.step('send', …)` does not change it; `action:
  'draft'` and `action: 'none'` add none; a run without `arrivedAt` adds none.
- [auto] `pnpm run test:ci` → exit 0, including the changed
  `src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts` and
  `src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts` (cases under "Tests").
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, a restaurant whose facts hold opening
  hours) write "מה שעות הפתיחה?" as a test guest and start a stopwatch when you press send; do it three times in
  three new chats · in at least two of the three the answer appears within about 8 seconds (before this plan:
  11–15 seconds).
- [human] `http://localhost:4202/frontdesk/assistant?scope=test` after the check above · press the newest row and
  open the first step "הודעת האורח התקבלה" and the step "שאילת ה-AI" · the first step shows "המתנה להודעה נוספת"
  with about 2.0 שנ׳, and the AI step shows "כל ניסיון והזמן שלקח" with one line per try: the model's name, its
  seconds and "ענה" (or "איטי מדי, עברנו למודל הבא" on a try that was cut).

## Execution Mode
- Parallel: no — the plan edits `server/services/inbound.js`, `server/services/frontdesk-turn.js`,
  `server/routes/ai/frontdesk.js` and files plans 752 and 753 create; plan 753 must be merged first and plans 755
  and 756 build on this one.
- Concurrent plans: none
- Isolated DB: no — no stored shape changes
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/inbound.js
server/services/frontdesk-turn.js
server/services/frontdesk-runs.js
server/services/gemini-client.js
server/services/outbound.js
server/services/channels/index.js
server/routes/ai/frontdesk.js
server/test/inbound.test.js
server/test/gemini-fallback.test.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-one-run.test.js
server/test/frontdesk-runs.test.js
server/test/outbound.test.js
src/app/pages/frontdesk/assistant/assistant-run-view.util.ts
src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.ts
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.html
src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts
public/assets/data/dictionary.json
docs/frontdesk/assistant-behaviour-rules.md
docs/restaurant/restaurant-map.md
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
server/test/gemini-client.test.js
server/test/ai-usage.test.js
server/test/frontdesk-lease.test.js
server/test/frontdesk-eval.test.js
```

No new file. `server/services/frontdesk-runs.js`, `server/test/frontdesk-runs.test.js` and everything under
`src/app/pages/frontdesk/assistant/` are created by plan 752; `server/test/frontdesk-one-run.test.js` by plan 753.
Every other path exists on the Snapshot.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely cases: (1) a server test outside the list that releases
a `controllableWait` a fixed 20 ms after a message and now releases before the wait began, because the wait starts
one database read later (`server/test/sim-router.test.js:53-54` uses the helper) — offer `approved: <that test
path>` with the change "wait until `w.calls.length` is the number of messages, then release"; (2) a test of plan
752 or 753 outside the list that compares the `ai` step's `out.attempts` with an exact object and now gets the
added `try` field — offer `approved: <that test path>` with the one added field. `server/test/gemini-client.test.js`,
`server/test/ai-usage.test.js`, `server/services/ai-usage.js`, `server/services/frontdesk-lease.js`,
`server/services/channels/sim-channel.js`, `shared/schemas/**` and every other caller of `callGemini`
(`server/routes/ai.js`, `server/routes/ai/diag.js`, `invoices.js`, `logistics.js`, `stock.js`, `voice.js`) are never
offered: the plan needs no change there.

## Architecture Impact

- INV-2: preserves — `server/services/inbound.js`, `frontdesk-turn.js`, `frontdesk-runs.js` and `outbound.js` read only the conversation's own messages, client and profile, every filter carries `businessId`; `gemini-client.js` reads the platform's own quota document, which holds no business data; no new collection and no cross-business read.
- INV-6: preserves — the one model call of the assistant stays `askTurnModel` in `server/routes/ai/frontdesk.js`, which passes two more options to the one `callGemini`; no second call place, no key in the browser, and no other AI feature passes the options.
- INV-7: preserves — `server/services/frontdesk-turn.js` still lets only `handleTableIntent` and the engine decide a table; this plan changes when a run starts, which model answers first and what the record shows, never what is offered, confirmed or written.

## Reuse Check

- `QUIET_MS`, `MAX_WAIT_MS`, `burstAtOf`, `burstStart` and the changed rule of `nextStep` in `server/services/inbound.js` — family: assistant-run-lease — rung: 3 — why: the timing of a guest message is changed in the one place plan 753 made for it; no second wait and no second gate.
- The options `firstLimitMs` and `onCall` of `callGemini`, with `slowTarget` in `server/services/gemini-client.js` and `FIRST_MODEL_LIMIT_MS` in `server/routes/ai/frontdesk.js` — family: gemini-fallback — rung: 3 — why: one more rule of the one model-switching loop (`callWithFallback`); a second loop or a wrapper with its own timer is never added.
- `showTyping` in `server/services/outbound.js` and the optional `typing` member of a transport — family: conversation-pipeline — rung: 3 — why: `outbound.js` is the only caller of a transport; the sign goes through the same file and the same checks as a message.
- `tryResultKey` and the field kind `tries` in `assistant-run-view.util.ts` — family: assistant-runs — rung: 3 — why: a new fact about a run is a row of `STEP_FIELDS`, as the family asks; one more kind next to `raw`.

## Adopt Check
- none — why: no rung-4 piece and no package.json change; the wait, the model limit and the typing seam are rules of the app's own pipeline.

## Defaults

- empty-state-on-list — exception — why: no list changes; the runs list of plan 752 keeps its states
- loading-and-error-states — exception — why: no new loading or error state; the open run gains fields inside existing steps
- app-list-container — exception — why: no list page changes
- one-breakpoint-set — exception — why: no layout and no SCSS change
- unsaved-changes-on-leave — exception — why: no form; server code and a read-only detail
- confirm-destructive-action — exception — why: nothing a user presses deletes or discards; a slow model call that is cut is the server's own decision and loses no data
- hints-in-tooltips — exception — why: no new control
- anchored-popup — exception — why: no floating box
- unit-dropdown-add — exception — why: no unit field; the word names unit tests only
- leave-and-return — exception — why: no new link and no unsaved work

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten). The commits of plans 751, 752 and 753 are expected
drift: check that `nextStep({ conversation, at, now, waited, holder })` and `waitFor` exist in `inbound.js` and that
`afterStored` passes `inbound: { at, waitedMs }` and `messageId` to the turn handler; that `runTurn` holds the
lease loop with `runOnce`, `endLease(…, { graceMs: COALESCE_MS })` and the follow-up's `inbound: { at, waitedMs }`;
that `runTurnInner` receives `lease` and `run`; that `askTurnModel` returns `trace { attempts, model, firstModel,
raw, rawChars, shapeTries }` and `TURN_BUDGET_MS` is exported; that `startRun`, `run.step`, `run.finish` exist in
`frontdesk-runs.js`; that `STEP_FIELDS`, `stepRows` and `app-run-detail` exist under
`src/app/pages/frontdesk/assistant/`; that `server/test/frontdesk-lease.test.js` still holds `RUN_LEASE_MS >=
TURN_BUDGET_MS + 30000`.

## User Stories
- As a guest, I want an answer a few seconds after I stop writing, so that the chat feels like a conversation.
- As a guest who writes several short messages, I want one answer to all of them, so that I am not answered in pieces.
- As a restaurant owner, I want the assistant to move on when the first AI model is slow, so that my guests are not left waiting 15 seconds.
- As a restaurant owner, I want to see in "מה העוזר עשה" how long the wait and each AI try took, so that I can tell a slow day from a broken setup.
- As the person who pays nothing for the AI, I want slowness never to spend the small daily allowances of the strong models, so that the free tier lasts the day.

## Functional Requirements

### Must Have (P0)

**1. The quiet wait — `server/services/inbound.js`**
- [ ] Constants, in place of the line `const COALESCE_MS = 6000;`:
  `const QUIET_MS = 2000;` (a run starts when the guest has been quiet this long),
  `const MAX_WAIT_MS = 6000;` (and never later than this after the first unanswered message of the burst),
  `const COALESCE_MS = MAX_WAIT_MS;` with the comment "the old name of the longest wait; kept for its readers
  (`frontdesk-turn.js` passes it as the lease's grace, plan 753)", `const BURST_SCAN_MAX = 30;`.
  `module.exports` gains `QUIET_MS`, `MAX_WAIT_MS`, `burstAtOf`, `burstStart`; `COALESCE_MS` stays exported with
  the value 6000. Readers of `COALESCE_MS` after plan 753: `nextStep` (this file, changed below) and the
  `graceMs: COALESCE_MS` of `runTurn` in `frontdesk-turn.js` (unchanged: a grace of 6 s covers a follow-up wait of
  at most 2 s). No test, page or script reads the name.
- [ ] The first message of a burst, from stored data (so it holds after a restart and for any number of server
  processes): new pure function `burstAtOf(rows, at)` — `rows` are message rows newest first; start with `at`;
  walk the rows while a row has `direction === 'in'` and `author === 'guest'`, taking `Math.min(start, row.at)`;
  stop at the first row that is anything else; return the start. And `burstStart(db, conversation, at)` → one read
  of `messages` with `{ businessId: conversation.businessId, conversationId: conversation._id, at: { $gte: at -
  MAX_WAIT_MS, $lte: at } }`, projection `{ at: 1, direction: 1, author: 1 }`, sorted `{ at: -1, _id: -1 }`, limit
  `BURST_SCAN_MAX` (the index `messages_conversation_at`, `server/db.js:214`), returned through `burstAtOf`. In
  words: the burst is the run of guest messages that ends with this message, has no other message between them, and
  began at most 6 s before this message. An unanswered message older than that never shortens the wait.
- [ ] `nextStep({ conversation, at, now, waited, holder = false, burstAt })` — rules 1, 2, 3 and 5 of plan 753 are
  unchanged (`stop` / `not_bot`, `leave` / `running`, `leave` / `newer`, `run`). Rule 4 (`!waited`) becomes:
  - `holder` (the run that holds the lease and is about to start a follow-up): `ms = Math.max(0, QUIET_MS -
    Math.max(0, now - at))`, `capped: false` — what is left of the 2 quiet seconds since the newest guest message.
  - otherwise: `start = typeof burstAt === 'number' && burstAt <= at ? burstAt : at`; `left = Math.max(0, start +
    MAX_WAIT_MS - at)`; `ms = Math.min(QUIET_MS, left)`; `capped = left < QUIET_MS`.
  - the result is `{ do: 'wait', ms, capped }`.
  "Quiet" is measured after the wait exactly as today: the run starts only when `conversation.lastInboundAt` is
  still this message's `at` (rule 3). The wait of a message that is not a follow-up is computed from the stored
  times of the messages only (`burstAt` and `at`), never from the server's clock, so a test's fixed `NOW` gives
  exact numbers. Comment on the function: "Plan 754 (R-29): a quiet wait — run after `QUIET_MS` without a newer
  guest message, at most `MAX_WAIT_MS` after the first message of the burst."
- [ ] `afterStored`: `const arrivedAt = Date.now()` as its first line. After plan 753's back-to-the-assistant
  branch and before plan 753's step 1: `const burstAt = conversation.status === 'bot' ? await burstStart(db,
  conversation, at) : at;`. Step 1 calls `nextStep({ conversation, at, now: Date.now(), waited: false, burstAt })`.
  The wait becomes `await wait(step.ms)` (always through `wait`, also when `step.ms` is 0, so `setWaitForTest`
  keeps control); `waitedMs` is measured around it as plan 752 does. The call of the turn handler becomes
  `turnHandler(db, fresh, { log, inbound: { at, waitedMs, quietMs: step.ms, capped: step.capped, arrivedAt },
  messageId })`. Steps 3 and 4 of plan 753 are otherwise unchanged. `answerWaiting` is unchanged (no wait, no
  `inbound`).
- [ ] One run per burst still holds, by the same two mechanisms: (1) every message waits on its own and, after its
  wait, leaves when a newer message is stored (`lastInboundAt > at`, the `inbound.coalesced` line), so only the
  newest message of the burst reaches the turn handler; with the cap, the waits of the last messages may end at the
  same moment — the older ones still see the newer one and leave. (2) Two messages with the same `at`, or a message
  whose wait ends while a run already works, meet plan 753's lease: the second finds it and is noted
  (`inbound.left_to_run`), and the follow-up answers it.
- [ ] The file comment's first paragraph: "waits (R-03)" becomes "waits for the guest to go quiet (R-29, plan 754;
  it was a fixed 6 s, R-03)".

**2. The follow-up uses the same rule — `server/services/frontdesk-turn.js` `runTurn` (plan 753's loop)**
- [ ] The loop's `nextStep({ …, waited: false, holder: true })` call is unchanged in code and now returns the
  quiet rule's `ms` (at most 2000). The cap does not apply to a follow-up: its messages arrived while the earlier
  run worked, and its own wait is never longer than 2 s. The options of the follow-up run become
  `inbound: { at: conv.lastInboundAt, waitedMs, quietMs: step.ms, capped: false, arrivedAt: conv.lastInboundAt }`.
  `graceMs: COALESCE_MS` stays. Nothing else in the loop changes.

**3. A short limit on the first model — `server/services/gemini-client.js`**
- [ ] `callGemini` accepts two more options, read only when given: `firstLimitMs` (a number of milliseconds) and
  `onCall` (a function). Its results for a caller that passes neither are byte for byte what they are today (the
  exact comparisons at `server/test/gemini-client.test.js:101` and `server/test/ai-usage.test.js:230` stay green
  and those files are not edited). Both options are passed on to `callWithFallback` from its two call places
  (`:492-494`, `:506`); `onCall` is also passed to `callOnce` in the loop without fallback (`:510`); `firstLimitMs`
  is ignored without `fallback`.
- [ ] New constants beside `MIN_CALL_MS`: `const SLOW_SWITCH_MIN_BUDGET = 100;` and `const SLOW_SWITCH_BUDGET_SHARE
  = 0.5;` with the comment "Plan 754 (R-30): a call cut for slowness may move only to a model with at least 100
  free requests a day, and only while that model has used less than half of them today (decisions D80, D81: free
  tier only; the small buckets are not spent early)."
- [ ] New function `slowTarget(candidates, current, now)` → a model name or `null`: `next =
  nextUsableAfter(candidates, current, now)`; `null` when there is none or it is `current`; `budget =
  MODEL_DAILY_BUDGETS[next] ?? 0`; `null` when `budget < SLOW_SWITCH_MIN_BUDGET`; `used = (await
  readQuotaDoc(now)).calls?.[encodeModelKey(next)] ?? 0`; `null` when `used >= budget * SLOW_SWITCH_BUDGET_SHARE`;
  else `next`. (`readQuotaDoc` answers `{}` when the database cannot be read, `:258-264`: the limit then applies.)
- [ ] `callWithFallback` takes `firstLimitMs` and `onCall`.
  - Before the loop: `const slowTo = typeof firstLimitMs === 'number' && firstLimitMs > 0 && firstLimitMs <
    timeoutMs ? await slowTarget(candidates, current, new Date()) : null;` and `let slowed = false;`.
  - Attempt 1 only: `limit = slowTo ? firstLimitMs : timeoutMs`; the call gets `timeoutMs: Math.min(limit,
    remaining)` and `slowLimit: !!slowTo && Math.min(limit, remaining) === firstLimitMs`. Every later attempt is
    called exactly as today (`Math.min(timeoutMs, remaining)`, no `slowLimit`).
  - After a call, a new first branch before the `model_exhausted` one: `if (result.slow) { next = slowTo; wait = 0;
    slowed = true; }` (no pause: the next model is another model).
  - After `next` is chosen by any branch: `if (slowed && next && (MODEL_DAILY_BUDGETS[next] ?? 0) <
    SLOW_SWITCH_MIN_BUDGET) next = model;` (`model` is the request's first model, which was only slow) — a request
    whose first call was cut for slowness never reaches a model with a small daily bucket; it goes back to its
    first model with the normal time limit.
  - The `fields.kind` of the `.fallback` log line: `result.slow ? 'slow' : isGone(result) ? 'gone' : result.kind`.
  - Nothing else changes: `MAX_ATTEMPTS`, the deadline check, the pauses of the other branches, `goneUntil`.
- [ ] `callOnce` takes `slowLimit = false` and `onCall`.
  - In its `catch`, for a `TimeoutError` / `AbortError` when `slowLimit` is true: `record(false, 'slow')`,
    `log.warn({ event: \`${eventPrefix}.slow\`, model, limitMs: timeoutMs })`, and the result is `{ kind: 'timeout',
    model, slow: true }`. Without `slowLimit` the branch is unchanged (`record(false, 'timeout')`, the `.timeout`
    line, `{ kind: 'timeout', model }`).
  - A call cut by our own limit marks nothing: no `markExhausted`, no `goneUntil`. (The abort is the existing
    `AbortSignal.timeout(timeoutMs)` at `:611`; no second controller is added.)
  - Every `return` of the function goes through one local `done(result)` that, when `onCall` is a function, calls
    `onCall({ model, ms: Date.now() - startedAt, ok: result.kind === 'ok', ...(result.kind !== 'ok' && { reason:
    result.slow ? 'slow' : result.kind }), ...(result.status !== undefined && { status: result.status }),
    ...(slowLimit && { limitMs: timeoutMs }) })` inside `try` / `catch` (a throwing callback changes nothing) and
    returns `result`.
- [ ] The doc comment of `callGemini` gains: "Plan 754 (R-30): with `fallback`, `firstLimitMs` cuts the FIRST
  HTTP call of the request after that many milliseconds when a next model with a large free bucket is usable, and
  moves to it; the cut marks nothing and is recorded as `slow`. `onCall` is told about every HTTP call. Only the
  front desk passes them." The file header's sentence at `:9-10` gains "(the front desk is the exception: plan 701
  `fallback`, plan 754 `firstLimitMs`)".

**4. The front desk asks for the limit and reports every try — `server/routes/ai/frontdesk.js` `askTurnModel`**
- [ ] `const FIRST_MODEL_LIMIT_MS = 6000;` beside `TURN_BUDGET_MS`, with the comment "Plan 754 (R-30): the first
  model gets 6 s, then the next one is tried. From the simulator tests of 2026-11-23..25: 71 % of the first
  model's good answers came within 6 s; 13 % of its calls ran into the 15 s limit. Tune it from `aiUsage`
  (`errorCode: 'slow'`, `latencyMs`) — see plan 754, Technical Considerations." Exported:
  `module.exports.FIRST_MODEL_LIMIT_MS = FIRST_MODEL_LIMIT_MS;`.
- [ ] The `callGemini` call of `attempt` gains `firstLimitMs: FIRST_MODEL_LIMIT_MS` and `onCall: c =>
  calls.push({ ...c, try: n })`, where `calls` is one array of `askTurnModel` (both tries of plan 731 push into
  it). `timeoutMs: 15000`, `deadlineMs`, `fallback: true`, `TURN_BUDGET_MS` = 35000 and `MIN_RETRY_MS` are
  unchanged. The limit applies to the first HTTP call of each `callGemini` call — so also to the retry of plan 731 —
  and to all three uses of `askTurnModel` (a guest turn, a member's "suggest", the hand-run eval).
- [ ] `trace.attempts` (plan 752) becomes one entry per HTTP call: the `calls` array, each entry `{ model, ms, ok,
  reason?, status?, limitMs?, try }`. When a `callGemini` call returned without any HTTP call (`all_exhausted`,
  `business_cap`, `model_removed`), plan 752's entry for that call is kept (`{ model: call.model ?? null, ms, ok:
  false, reason: call.kind, try: n }`), so a refusal stays visible. `trace.model`, `trace.firstModel`, `trace.raw`,
  `trace.rawChars`, `trace.shapeTries` are unchanged. No field of the function's result is renamed.
- [ ] `failureReason` (`server/services/frontdesk-turn.js:175-181`) is unchanged: a turn fails only when the last
  call failed; that call is never a cut one unless nothing of the budget was left for another, and then its kind is
  `timeout` → the group `timeout`, the reason the inbox already shows. There is no new failure reason and no new
  entry of `RUN_REASONS`.

**5. The "typing…" sign — `server/services/outbound.js`, `server/services/channels/index.js`,
`server/services/frontdesk-turn.js`**
- [ ] A transport may have a fifth, optional member: `typing(db, conversation, { providerMessageId })` → a promise;
  it tells the guest's app that an answer is being written to the message with that provider id. The comment of
  `channels/index.js` (`:4`) names the shape as `{ name, real, clientSource, send, typing? }` and adds "Plan 754
  (R-31): `typing` is optional; the simulator has none (its page draws its own dots, plan 735), WhatsApp's is
  written with its transport." `sim-channel.js` and `standIn` are not changed (neither has `typing`).
- [ ] `showTyping(db, conversation, { log = logger } = {})` in `outbound.js`, exported; it never throws and
  resolves to `{ shown: true }` or `{ shown: false, why }`. In this order:
  1. `transport = channelFor(conversation)`; `typeof transport.typing !== 'function'` → `{ shown: false, why:
     'no_typing' }` (no read, no log line).
  2. `transport.real`: `conversation.test === true` → `not_live`; the profile (`frontDeskProfiles.findOne({
     businessId, deletedAt: { $exists: false } })`) is missing or its `status` is not in `LIVE_STATUSES` (`:15`) →
     `{ shown: false, why: 'not_live' }` (R-19).
  3. The client (`clients.findOne({ _id: conversation.clientId, businessId })`) has `doNotContact` →
     `{ shown: false, why: 'do_not_contact' }` (R-02).
  4. The newest message of the conversation with `direction: 'in'` and `author: 'guest'` (sorted `{ at: -1, _id:
     -1 }`); none, or no `providerMessageId` → `{ shown: false, why: 'no_message' }`.
  5. `await transport.typing(db, conversation, { providerMessageId })` → `log.info({ event: 'outbound.typing',
     conversationId })` and `{ shown: true }`.
  The whole body is inside `try` / `catch`: any throw → `log.warn({ event: 'outbound.typing.failed',
  conversationId: conversation._id, errName: err && err.name })` and `{ shown: false, why: 'failed' }`. No log line
  carries a text, a name, a phone or a provider id. The file comment gains: "Plan 754 (R-31): `showTyping` is the
  one place that calls a transport's `typing`."
- [ ] `runTurnInner`: right after the pre-check passed (after the `if (!pre.ok) { … }` block) and before the facts
  are read: `if (mode === 'turn' && lease && feature !== 'eval' && levelOf(profile) >= 1) void showTyping(db,
  conversation, { log });` — not awaited, so it never delays the model call. So the sign is asked for once per run
  (a follow-up run asks again, for its own newest message), only by a run that holds the lease (after the wait,
  never for a conversation a person holds: such a run gets no lease), never in suggest mode, never at level 0 for a
  real guest (nothing will be sent), never for a turn the pre-check stopped, never for the eval.
- [ ] The file's doc comment gains: "Plan 754: the run asks the channel to show 'typing…' (`showTyping`) before it
  reads the facts; a run cut for a slow first model is recorded per HTTP call."

**6. The timings in the run record — `server/services/frontdesk-runs.js`**
- [ ] `startRun`'s `inbound` option may also carry `quietMs`, `capped`, `arrivedAt` (numbers and a boolean).
  `run.finish`, where plan 752 fills the `inbound` step's `out` with `{ waitedMs, answers }`: it also writes
  `quietMs` when `inbound.quietMs` is a number and `capped` when `inbound.capped` is a boolean. Nothing is written
  for a run without them.
- [ ] `run.step('send', …)`: when the merged `out.action` is `'sent'`, `'holding'` or `'removal_notice'`, the run
  has a number `inbound.arrivedAt`, and the step has no `answerMs` yet → `out.answerMs = Math.max(0, Date.now() -
  inbound.arrivedAt)` — the time from the guest's last message reaching the server to the answer leaving it. It is
  set once (a later `run.step('send', …)` keeps it). The real clock is used on both ends (`arrivedAt` is taken
  with `Date.now()` in `afterStored`; for a follow-up it is the newest guest message's `at`).
- [ ] No schema change: a step's `out` is an open record (`runStepSchema`, plan 752); no new outcome, no new reason.
- [ ] `server/services/frontdesk-turn.js`: the `ai` step's `out.attempts` is `asked.trace.attempts` as plan 752
  writes it — now one entry per HTTP call. The status rule of plan 752 (`note` when a backup model answered or
  `attempts.length > 1`) is unchanged.

**7. Two pairs of reads run together — `server/services/frontdesk-turn.js` `runTurnInner`**
- [ ] Inside plan 752's `run.time('history', …)`: the history read and the count of assistant answers become
  `const [recent, aiTurns] = await Promise.all([<the find of :216-217>, <the countDocuments of :219>])`.
- [ ] Inside plan 752's `run.time('facts', …)`: `const [facts, tables] = await Promise.all([publicFacts(db,
  businessId), tablesFor(db, businessId)])`.
- [ ] The order of the steps is unchanged: setup, limit, history, pre-check, facts, prompt, model. The facts are
  still read AFTER the history (plan 755 passes the history to `publicFacts`); the history is never read together
  with the facts. Both pairs are reads of different collections with no write between them, so the result is the
  same; a read that rejects still rejects the turn as today.

**8. The page of runs — `src/app/pages/frontdesk/assistant/`**
- [ ] `assistant-run-view.util.ts`:
  - `FieldDef['kind']` gains `'tries'`.
  - `tryResultKey(attempt)` → `'asr_try_ok'` when `attempt.ok`; `'asr_try_slow'` for `reason === 'slow'`;
    `'asr_try_timeout'` for `'timeout'`; `'asr_try_busy'` for `'network'`, or `'gemini_error'` with a `status` of
    429, 500, 502, 503 or 504; `'asr_try_quota'` for `'model_exhausted'`, `'all_exhausted'` or `'business_cap'`;
    else `'asr_try_other'`. Exported.
  - `stepRows`: a field of kind `tries` whose value is an array gives one row `{ labelKey, kind: 'tries', value }`
    where `value` is the first 8 entries mapped to `{ model: String(a.model ?? '—'), seconds: (Number(a.ms ?? 0) /
    1000).toFixed(1), resultKey: tryResultKey(a) }`; an empty array or a value that is not an array gives no row.
  - `STEP_FIELDS` gains four rows: `inbound · out · quietMs · ms · asr_f_quiet`; `inbound · out · capped · bool ·
    asr_f_capped`; `ai · out · attempts · tries · asr_f_tries` (beside plan 752's `attempts · count` row, which
    stays); `send · out · answerMs · ms · asr_f_answer_ms`.
- [ ] `run-detail.component.html` (and `.ts` only if an import is missing): where a step's rows are drawn as `dt` /
  `dd`, a row of kind `tries` draws, inside its `dd`, one `<div data-testid="asr-try">` per entry with the text
  `{{ t.model }} · {{ t.seconds }} {{ 'asr_seconds' | translatePipe }} · {{ t.resultKey | translatePipe }}`
  (`@for (t of row.value; track $index)`; the model name inside `<span dir="ltr">`). No SCSS change, no new class.
- [ ] `public/assets/data/dictionary.json` — append to `general` the keys under "UI/UX Notes".

**9. Rules, maps, registry**
- [ ] `docs/frontdesk/assistant-behaviour-rules.md`: R-03's row keeps its text and adds "Superseded in part by
  R-29 (plan 754): the wait is no longer a fixed 6 s." Three rows after the last row plans 751–753 added (R-28;
  take the next free numbers if another plan took these):
  **R-29** "A quiet wait before a run. A run starts when the guest has sent nothing for 2 s (`QUIET_MS`), and at
  the latest 6 s (`MAX_WAIT_MS`) after the first message of the burst — the run of guest messages with nothing
  between them that began at most 6 s before the newest one. A follow-up run (R-26) waits what is left of the 2 s
  since the newest guest message. One run per burst, as R-03." (754) ·
  **R-30** "The first model gets 6 s. For the assistant's turn the first model call is cut after 6 s
  (`FIRST_MODEL_LIMIT_MS`) and the next model is tried, when that model has at least 100 free requests a day and
  has used less than half of them today; a request that was cut never moves to a model with a smaller daily
  bucket. A cut marks no model exhausted and is recorded as `slow`. Later calls keep the 15 s limit; the whole turn
  stays inside 35 s. Other AI features are not affected." (754) ·
  **R-31** "A 'typing…' sign while a run works. A run that holds the lease and may send (level 1 or the simulator,
  mode `turn`) asks the channel once to show the sign, through `showTyping`; not for a conversation a person
  holds, not in suggest mode, not for a profile that is not live, not for a do-not-contact guest; a failure is one
  log line and changes nothing. A channel without the sign (the simulator) is skipped." (754).
- [ ] `docs/restaurant/restaurant-map.md`, at the end of "Contract extensions (run)" (after plan 753's line):
  `754 · C-CONV / C-AI / C-CHANNEL / C-RUNS · (1) the wait before a run is quiet-based: QUIET_MS 2000, MAX_WAIT_MS
  6000 from the first message of the burst, decided in nextStep (R-29; COALESCE_MS stays exported, 6000); (2)
  callGemini({ firstLimitMs, onCall }) for the front desk only: the first HTTP call is cut after
  FIRST_MODEL_LIMIT_MS 6000 and moves to the next large-bucket model, recorded as slow (R-30); (3) a transport may
  have typing(db, conversation, { providerMessageId }); showTyping in outbound.js is its one caller (R-31); (4) the
  run record: inbound.out.quietMs / capped, ai.out.attempts one entry per HTTP call { model, ms, ok, reason?,
  status?, limitMs?, try }, send.out.answerMs · the Human's simulator tests of 2026-11-25/26`.
- [ ] `server/breadcrumbs.md`: the rows of `services/inbound.js` (`:26`), `services/outbound.js` (`:27`),
  `services/channels/` (`:29`), `services/frontdesk-turn.js` (`:42`), `services/gemini-client.js` (`:43`) and
  `routes/ai/frontdesk.js` (`:47`), and plan 752's row of `services/frontdesk-runs.js`, each gain one "plan 754:
  …" phrase (the quiet wait `QUIET_MS` / `MAX_WAIT_MS`; `showTyping`; the optional `typing` of a transport; the
  typing call and the paired reads; `firstLimitMs` and `onCall`; `FIRST_MODEL_LIMIT_MS` and per-call attempts;
  `quietMs`, `capped`, `answerMs`).
- [ ] `docs/brain/component-families.md`: `assistant-run-lease` (plan 753) — Pieces gain `QUIET_MS`,
  `MAX_WAIT_MS`, `burstAtOf`, `burstStart`, and the Use line gains "plan 754: the wait is quiet-based (R-29)";
  `gemini-fallback` (`:940`) — Pieces gain "plan 754: `callGemini({ firstLimitMs, onCall })`, `slowTarget`,
  `FIRST_MODEL_LIMIT_MS` in `server/routes/ai/frontdesk.js`", and When gains "a new time limit for a model is an
  option of `callGemini`, never a timer around it"; `conversation-pipeline` (`:859`) — Pieces gain `showTyping`
  and the Use line gains "a transport's optional `typing` is called only by `showTyping` (plan 754)";
  `assistant-runs` (plan 752) — Use gains "plan 754: the field kind `tries`, `tryResultKey`". Then
  `node scripts/inventory.mjs` and commit `docs/brain/inventory.md` only if it changed.

**10. Tests** (beyond the Done-when items above)
- [ ] `server/test/inbound.test.js`: plan 753's `nextStep` cases that expect a wait change their numbers — `bot`,
  no lease, `waited: false` → `ms: 2000` (was 6000); `holder: true`, `at: now - 2000` → `ms: 0` (was 4000); the
  results now carry `capped`. Every other existing case passes unchanged: "waits and joins a burst" (`:57-76`:
  messages at `NOW` and `NOW + 2000`, one release, one turn) and cases (h) and (i) of the hand-back block. Where a
  case releases a `controllableWait` after a fixed 20 ms pause, replace the pause by `await vi.waitFor(() =>
  expect(w.calls).toHaveLength(<the number of messages sent so far>))` — the wait now starts one read later.
- [ ] `server/test/gemini-fallback.test.js`: the spied `AbortSignal.timeout` is restored in every new case; the
  new cases import `getModelStatus` and `quotaDayKey` from `../services/gemini-client`.
- [ ] `server/test/frontdesk-turn.test.js`: the block imports `FIRST_MODEL_LIMIT_MS` and `TURN_BUDGET_MS` from
  `../routes/ai/frontdesk`, `DEFAULT_MODELS` from `../services/gemini-client`, `setChannelForTest` and
  `resetChannelsForTest` from `../services/channels`; the typing cases replace the channel with
  `setChannelForTest('sim', { name: 'sim', real: false, clientSource: 'manual', send: async () => ({
  providerMessageId: 'sim:t', status: 'delivered' }), typing })` where `typing = vi.fn(async () => {})`; a `typing`
  call is awaited with `await vi.waitFor(() =>
  expect(typing).toHaveBeenCalledTimes(1))`; "not called" cases wait for the turn to end and then 20 ms.
  Every existing case passes unchanged (a case of plan 752 that compares one `attempts` entry exactly gains
  `try: 1`).
- [ ] `assistant-run-view.util.spec.ts`: `tryResultKey` for `{ ok: true }` → `asr_try_ok`; `{ ok: false, reason:
  'slow' }` → `asr_try_slow`; `'timeout'` → `asr_try_timeout`; `{ reason: 'gemini_error', status: 503 }` →
  `asr_try_busy`; `{ reason: 'gemini_error', status: 400 }` → `asr_try_other`; `'all_exhausted'` → `asr_try_quota`.
  `stepRows` of an `ai` step with two attempts `[{ model: 'm1', ms: 6003, ok: false, reason: 'slow' }, { model:
  'm2', ms: 1040, ok: true }]` holds a `tries` row whose value equals `[{ model: 'm1', seconds: '6.0', resultKey:
  'asr_try_slow' }, { model: 'm2', seconds: '1.0', resultKey: 'asr_try_ok' }]` and still the `count` row with 2;
  `stepRows` of an `inbound` step with `out: { waitedMs: 500, quietMs: 500, capped: true }` holds the rows
  `asr_f_quiet` and `asr_f_capped` (value key `asr_yes`); of a `send` step with `out.answerMs: 5400` the row
  `asr_f_answer_ms`.
- [ ] `run-detail.component.spec.ts`: a run whose `ai` step has two attempts shows, in the open step, 2 `asr-try`
  elements; the first contains `m1` and the text of `asr_try_slow`; a run with no attempts shows none.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: recipe-list — `/frontdesk/assistant` (plan 752's page; its frame does not change — fields are added
  inside the steps of the open run).
- Hebrew, RTL; no SCSS change, no new class, no new icon. A model's name is Latin text and sits in a `dir="ltr"`
  span.
- What the guest sees: after one message, the answer comes about 4 s sooner; after several short messages, one
  answer, started at most 6 s after the first of them; in the simulator the moving dots of plan 735 are unchanged.
- Data flow: unchanged — `AssistantRunDataService.run_` → `app-run-detail` input → `computed()` step rows →
  the template; the new rows come from `STEP_FIELDS`.

**Dictionary keys** (all new, appended to `general` in `public/assets/data/dictionary.json`):

| key | Hebrew |
| --- | --- |
| `asr_f_quiet` | ההמתנה שנקבעה |
| `asr_f_capped` | ההמתנה קוצרה כי האורח המשיך לכתוב |
| `asr_f_answer_ms` | מההודעה האחרונה של האורח ועד התשובה |
| `asr_f_tries` | כל ניסיון והזמן שלקח |
| `asr_try_ok` | ענה |
| `asr_try_slow` | איטי מדי, עברנו למודל הבא |
| `asr_try_timeout` | לא ענה בזמן |
| `asr_try_busy` | עמוס |
| `asr_try_quota` | המכסה היומית נגמרה |
| `asr_try_other` | תקלה |

Existing keys reused: `asr_seconds`, `asr_yes`, `asr_no`, `asr_f_waited`, `asr_f_attempts` (plan 752).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Start a run two quiet seconds after the guest stops writing, and six seconds after the first message at the latest — the two constants with the old name kept, burstAtOf and burstStart, the new rule of nextStep, afterStored passes the wait numbers, the changed and new inbound cases — server/services/inbound.js, server/test/inbound.test.js
- [ ] A2: Let the follow-up run wait by the same quiet rule and carry its wait numbers — the follow-up's inbound option in the lease loop, the new one-run case — server/services/frontdesk-turn.js, server/test/frontdesk-one-run.test.js
- [ ] A3: Cut a slow first model call and move to the next large-bucket model without marking anything — firstLimitMs and onCall, slowTarget with the two budget rules, the slow result and its ledger and log lines, the back-to-first rule, cases a to i — server/services/gemini-client.js, server/test/gemini-fallback.test.js
- [ ] A4: Make the assistant's turn use the six second limit and report every call it made — FIRST_MODEL_LIMIT_MS exported, the two options on the one model call, attempts per call with the try number, the speed cases of the turn tests — server/routes/ai/frontdesk.js, server/test/frontdesk-turn.test.js
- [ ] A5: Give a channel a typing sign the run asks for once, safely — the optional typing member, showTyping with its five checks, the call after the pre-check, the outbound and turn cases — server/services/outbound.js, server/services/channels/index.js, server/services/frontdesk-turn.js, server/test/outbound.test.js, server/test/frontdesk-turn.test.js
- [ ] A6: Write the wait numbers and the time to answer into the run record — quietMs and capped on the first step, answerMs on the send step, the recorder and turn cases — server/services/frontdesk-runs.js, server/test/frontdesk-runs.test.js, server/test/frontdesk-turn.test.js
- [ ] A7: Read the history with its count and the facts with the tables at the same time, keeping the order of the steps — two Promise.all pairs inside the existing timed steps, every turn and table test green — server/services/frontdesk-turn.js
- [ ] A8: Show the wait, each AI try with its time and the time to answer in the page of runs — the tries kind, tryResultKey, four field rows, the try lines in the run detail, ten dictionary keys, the two specs — src/app/pages/frontdesk/assistant/assistant-run-view.util.ts, src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.html, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.ts, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.spec.ts, public/assets/data/dictionary.json
- [ ] A9: Write down the three new rules and where the changed pieces live — R-03 note, R-29 to R-31, the map's Contract line, breadcrumbs, the four family entries and the inventory — docs/frontdesk/assistant-behaviour-rules.md, docs/restaurant/restaurant-map.md, server/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A10: Run every check of this plan and hand Dandan the two simulator checks — test:server, test:ci, build, both lints, the icon lint, the inventory check, log-query; evidence into Execution Notes; the slot's servers up before the cards

## Technical Considerations
- Dependencies: plan 753 (merged first) and through it plans 752 and 751. Plans 675 (inbound, outbound, the
  transport shape), 679 (the turn, `askTurnModel`), 701 / 730 / 731 (the fallback loop, gone models, the shape
  retry), 733 (the holding message), 735 (the simulator's dots).
- Facts taken from plans 751–753, not from the Snapshot: `nextStep`, `waitFor`, `messageId` and the three-step
  shape of `afterStored`; the lease loop of `runTurn` with `runOnce`, `endLease`, `graceMs: COALESCE_MS`, the
  follow-up's `inbound`; `lease` in `runTurnInner`'s options; `RUN_LEASE_MS = 90000` and the test `RUN_LEASE_MS >=
  TURN_BUDGET_MS + 30000`; `module.exports.TURN_BUDGET_MS` (753). `startRun`, `run.time`, `run.step`,
  `run.finish`, the `inbound` step filled by `finish` with `{ waitedMs, answers }`, `trace` of `askTurnModel`,
  `STEP_FIELDS`, `stepRows`, `FieldDef`, `app-run-detail`, the keys `asr_seconds`, `asr_yes`, `asr_no` (752).
  `fillWhen` after the failed-call branch (751) — not touched here.
- Time to an answer, before and after (one guest message, the first model answers): before = 6 s wait + the model
  (median 3.7 s in the sample) = about 9.7 s, plus up to 2 s until the simulator page reads the thread (plan 735
  reads every 2 s) → 9.7–11.7 s. After = 2 s + 3.7 s = 5.7 s, plus up to 2 s → 5.7–7.7 s; hence "about 8 seconds"
  in the `[human]` check. A slow first model: before = 6 s + 15 s + 0.5 s pause + the second model (median 1.0 s)
  = 22.5 s; after = 2 s + 6 s + 1.0 s = 9 s.
- Why 6 seconds and not 2. With the sample's numbers for the first model's good answers: a limit of 2 s cuts 80 %
  of them, 3 s cuts 60 %, 4 s cuts 49 %, 6 s cuts 29 %, 8 s cuts 9 %. Every cut answer costs one more request (on
  the second model) and the second model answered 503 in 9 of its 22 calls of the sample. The large gain is the
  tail: 10 of the first model's 68 calls ran to the 15 s limit, and each of those now costs 6 s. At 6 s about 7 of
  10 good first answers are kept and a cut answer is rarely slower than it would have been (it arrives at about
  6 + 1 s; the answers it replaces took 6–12.8 s). The sample is small (3 days, one machine, the simulator) — the
  value is one constant, and the record makes it tunable.
- Tuning the limit later (no code): every HTTP call is a row of `aiUsage` with `model`, `ok`, `errorCode`,
  `latencyMs`, `feature` (`server/services/ai-usage.js:57-79`); a cut call has `errorCode: 'slow'`. Two numbers
  decide: the share of first-model calls with `errorCode: 'slow'` (if it is above about 30 %, the limit is too
  low), and the share of the first model's good answers that take longer than a candidate limit (group
  `{ feature: 'frontdesk_turn', model: <first>, ok: true }` by `latencyMs` buckets). The same is visible per run in
  `steps[ai].out.attempts` (`reason: 'slow'`, `ms`) and in the kept warn log lines `frontdesk.turn.slow` and
  `frontdesk.turn.fallback` with `kind: 'slow'` (warn lines are stored 90 days).
- Free-tier arithmetic (decisions D80: free tier only, no billing; D81: the small buckets are not spent early). A
  cut call spends one request of the first model's bucket (500 a day) — it was made anyway — and causes one
  request on the next model that a patient wait would have saved. Rules that bound this: (1) the cut happens only
  when the next usable model has at least 100 free requests a day — today only `gemini-3.5-flash-lite` (500) or,
  after it, `gemini-3.1-flash-lite` (500); never a 20-a-day model; (2) only while that model has used less than
  half of its daily bucket (250 of 500, counted for all features in the quota document) — so slowness can spend at
  most the first half of the backup bucket and the second half stays for real failures; (3) a request that was cut
  never moves on to a small-bucket model; it returns to its first model; (4) at most one cut per `callGemini` call
  (the first HTTP call only), so at most 2 per turn (the retry of plan 731). Expected extra requests: 29 % of
  turns at the sample's rate — 87 a day for a business that uses its whole daily cap of 300 turns
  (`FRONTDESK_DAILY_TURNS`, `frontdesk-turn.js:24`). When a bucket does run out, nothing is charged: Google answers
  the daily 429, the model is marked exhausted until the reset and the chain moves on, as today.
- The budget still holds: the worst turn is first call 6 s (cut) + second model 15 s + a 1 s pause + a third call
  cut by the deadline at 13 s = 35 s = `TURN_BUDGET_MS`; `MIN_CALL_MS` stops a fourth. `TURN_BUDGET_MS` is not
  changed, so plan 753's `RUN_LEASE_MS >= TURN_BUDGET_MS + 30000` holds (90000 ≥ 65000) and its test is not edited.
  The lease is taken after the wait, so the shorter wait does not touch the lease length; the follow-up's wait
  (≤ 2 s) is covered by the unchanged grace of 6 s.
- Other AI features are unchanged: `firstLimitMs` and `onCall` are read only when passed, only `askTurnModel`
  passes them, `firstLimitMs` needs `fallback: true`, and a result gains the key `slow` only on a cut call. The
  callers `server/routes/ai.js`, `routes/ai/diag.js`, `invoices.js`, `logistics.js`, `stock.js`, `voice.js` and the
  `/fix` route (`routes/ai/frontdesk.js:132-135`) are not edited.
- The WhatsApp request, for the plan that builds the transport (not coded here — there is no WhatsApp transport
  file, token reader or webhook on the Snapshot): as remembered from Meta's Cloud API documentation of 2025, the
  typing sign is sent together with marking the guest's message as read — `POST /{phone-number-id}/messages` with
  `{ messaging_product: 'whatsapp', status: 'read', message_id: <the inbound message id>, typing_indicator: { type:
  'text' } }`; it shows for up to 25 s or until a message is sent. Whoever writes `typing` on the WhatsApp
  transport verifies the exact request against Meta's current documentation first, records the URL in that plan's
  Execution Notes, and stops with a clear note instead of guessing when the API differs. The seam built here
  passes exactly what that request needs: the conversation and the provider id of the newest guest message.
- Model changes: none in `shared/schemas/`. The `Conversation` and `AssistantRun` shapes are unchanged.
- Backend / API: no new route and no changed response. `callGemini` gains two options; a transport may have
  `typing`. New log events: `<prefix>.slow` (warn: `model`, `limitMs`), `outbound.typing` (info),
  `outbound.typing.failed` (warn) — ids, enums and numbers only. The `.fallback` line's `kind` may be `'slow'`.
- Auth and validation: unchanged.
- Security surface: none new. `showTyping` applies the same refusals as `sendOut` for a real channel (test
  conversation, profile not live, do-not-contact). No secret is read.
- Data / migration: none. `aiUsage.errorCode` gains the value `'slow'` (a free string, no enum).
- Project checks: the `log-query` Done-when item; logs carry no guest text (tested); the Reuse Check; the
  `Page recipe:` line; `dictionary.json` append-only with every key listed; `server/breadcrumbs.md`, the registry
  and the inventory in scope; no new shape, endpoint or collection.
- Traps: the wait now starts one database read after the message is stored — a test that releases a
  `controllableWait` on a fixed pause must wait for `w.calls` instead; `nextStep` for a message that is not a
  follow-up must not read `now` for the wait (tests store messages at a fixed `NOW` far from the real clock);
  `wait(0)` must still go through the `wait` hook; in `callWithFallback` the slow branch must stand before the
  `isOverloaded` branch (a cut call is also a `timeout`) and must not pause; `slowTarget` is asked once, before
  attempt 1, never per attempt; `retryDelayMs` is 0 under the test runner, so the "every model is slow" case makes
  4 calls at once; the mocked `AbortSignal.timeout` may also be called by other code — compare only the values the
  case names; `showTyping` is not awaited by the turn — a test awaits the spy with `vi.waitFor`; `answerMs` uses
  the real clock on purpose, never a turn's fixed `now`; never assert a `fetch` count of 1 on a retried answer
  (plan 731).

## Out of Scope
- Streaming the answer; a paid model tier; changing the order of the models (an admin setting — the sample shows
  the second model of the chain answering in about 1 s against 3.7 s for the first, which is the Human's call on
  the admin page, with answer quality in mind); racing two models at once.
- Picking the relevant facts (plan 755); the console's other tabs and showing the wait there (plan 756 reads
  `QUIET_MS` and `MAX_WAIT_MS`).
- The WhatsApp request for the typing sign and a live check of it: both need the WhatsApp transport and a
  connected number (plan 683, a draft). This plan builds the seam and its tests only.
- The simulator's dots: they keep plan 735's rule (a `bot` conversation whose newest message is the guest's text,
  at most 45 s old). It stays right after this plan — the longest turn is 6 s wait + 35 s = 41 s — and reading the
  lease field `run` instead would change a page for no visible gain.
- The 0.5 / 1 / 2 s pauses between calls after a real overload, the 15 s limit of later calls, `MAX_ATTEMPTS`, the
  35 s budget.
- Making the usage counter (`incrementUsage`, awaited before every model call, `gemini-client.js:602`) and the
  monthly-cap read not block the call: they serve every AI feature.
- Running the profile read, the daily-limit count and the history together: each may stop the turn before the
  next is needed.
- A stored "burst" field on the conversation; a cap for a follow-up's total wait.
- A report script for the latency numbers (the query is described above).

## Critical Questions
- none

## Execution Notes
- behaviour: the first model's limit is 6 s, not the 2 s named as the direction — in the simulator tests of 2026-11-23..25 only 1 in 5 good first answers came within 2 s, so 2 s would cut 4 of 5 and double the requests; 6 s keeps 7 of 10 and still turns a 15 s stall into 6 s. One constant, tunable from the records.
- behaviour: a call is cut for slowness only when the next model has at least 100 free requests a day and has used less than half of them today; a request that was cut never moves to a 20-a-day model (it goes back to its first model). Free tier only (D80), small buckets kept (D81).
- behaviour: a cut call marks no model exhausted or gone, is stored in the usage ledger with `errorCode: 'slow'` and shown in the run as "איטי מדי, עברנו למודל הבא"; when every call of a turn fails the reason stays `timeout` / `busy` as today.
- behaviour: the limit applies to the first call of each model request of the assistant — a guest turn, the one retry of a malformed answer, a member's "suggest" and the hand-run eval.
- behaviour: the wait is 2 s after the newest guest message, and at most 6 s after the first message of the burst; the burst is the guest messages with nothing between them that began at most 6 s before the newest one, read from the stored messages.
- behaviour: an unanswered message older than 6 s (a conversation that came back from the staff, a level-0 draft) does not shorten the wait of a new message.
- behaviour: a follow-up run waits what is left of 2 s since the newest guest message; the 6 s cap does not apply to it.
- behaviour: `COALESCE_MS` stays exported with the value 6000 as the old name of the longest wait.
- behaviour: the typing sign is asked for once per run, after the wait and the pre-check and before the facts are read, without waiting for it; never for a conversation a person holds, in suggest mode, at level 0 for a real guest, for a profile that is not live, for a do-not-contact guest or for the eval.
- behaviour: on WhatsApp the typing sign is sent together with marking the guest's message as read (blue ticks) — a visible side effect that comes with the sign; it is decided when the WhatsApp transport is written, this plan only builds the seam.
- behaviour: the simulator gets nothing new for typing; its dots stay as plan 735 built them.
- behaviour: "time to answer" in the record is from the guest's last message reaching the server to the first message that leaves it (an answer, a holding message or a removal notice); a draft has none.
- behaviour: the history with its count, and the facts with the tables, are read at the same time; the order history → facts is kept for plan 755.
- review (drafter, 2026-11-26): the Reuse Check names the families `assistant-run-lease` (added by plan 753) and `assistant-runs` (added by plan 752); they are headings of the registry only after those plans are merged into the base branch, so `scope-check --reuse` run before that reports them as unknown.
- review (drafter, 2026-11-26): the latency table comes from the `aiUsage` rows of the Human's local database `foodvibe` (102 calls of `frontdesk_turn`, simulator, 2026-11-23..25), read through the read-only local database tool; it is a small sample from one machine, not from the live service.
