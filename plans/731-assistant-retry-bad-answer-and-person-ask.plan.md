# Plan 731 — The assistant tries once more when its answer comes back malformed, and hands a guest who asks for a person to the staff

Status: draft
Depends-on: none
Snapshot: 6f6158e38baeeb4aa3b2438faadbe64afa1e997f

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

In the end-to-end test of 2026-11-24 (demo restaurant, assistant level 1, guest messages sent through
`POST /api/v1/sim/inbound`, slot log `.claude/be.log` of `wt-2`) two of four guest questions went wrong:

1. "אפשר שולחן לארבעה מחר ב-20:00?" got **no answer**. The log shows `frontdesk.turn.failed` with reason
   `bad_shape`: Google answered 200, but the model's JSON did not pass `turnAnswerSchema`. The same question passed in
   an earlier run, so it is intermittent. A failed turn hands the conversation to staff silently (R-04), so the guest
   gets nothing and the staff do not learn which field was wrong.
2. "אפשר לדבר עם מישהו?" (can I talk to someone?) was answered by the model as smalltalk ("אני כאן כדי לעזור...")
   instead of moving the guest to a person.

Root causes, verified on the Snapshot:
- `server/routes/ai/frontdesk.js:30-43` — `askTurnModel` makes one `callGemini` call (`timeoutMs: 15000`,
  `deadlineMs: 35000`, `fallback: true`, plan 701). `:39` returns `{ ok: false, reason: 'bad_json' }` and `:41`
  `{ ok: false, reason: 'bad_shape' }` at once: no second try, and the zod issues are thrown away, so nothing in the
  log says which field failed. A malformed answer is not a Google failure (plan 701's fallback only reacts to
  503 / 429 / timeouts), so the 35 s budget is mostly unused when it happens (about 15 s in the test).
- `server/services/frontdesk-turn.js:214-221` — `runTurn` logs `frontdesk.turn.failed`, hands off silently with
  `assistantFailed: { reason: 'other' }` (`failureReason('bad_shape') === 'other'`, `:150-156`). This stays as it is
  for a second failure.
- Plan 689 (`plans/689-assistant-guardrails-blocked-replies-and-handoff-rules.plan.md`) promises that "a conversation
  that needs a person reaches one" through two lines: the model's `handoff` flag (first line) and the server's
  `HANDOFF` word list, checked in `preCheck` before any model call (`server/services/frontdesk-guardrails.js:39-42`,
  reason `keyword`, handoff with the business's handoff sentence, no model call). Its list
  (`server/constants/frontdesk-guard-words.js:9-14`) holds complaint, refund and allergy-emergency words only; a guest
  asking for a person is in neither the list nor the prompt (`server/services/frontdesk-prompt.js:26` names
  "a complaint, a refund, an allergy emergency, or anything outside the facts"). The file says "a list changes here
  without touching the checks", so the plan-689 mechanism for this case is a new group of `HANDOFF` fragments, with
  the prompt line as the model's own first line.

## Goals & Success Criteria
**Primary:** a malformed model answer gets one more try inside the same 35 s budget and the log names the fields that
failed; a guest who asks for a person in common Hebrew phrasings goes to the staff with the handoff sentence, with no
model call.

- [auto] `pnpm run test:server` → exit 0, including the new cases in `server/test/frontdesk-turn.test.js`,
  `server/test/frontdesk-guardrails.test.js`, `server/test/frontdesk-tables.test.js` and
  `server/test/frontdesk-prompt.test.js`.
- [auto] `server/test/frontdesk-turn.test.js` (Gemini faked by the stubbed `fetch`): a first answer with
  `intent: 'weird'` then a well-shaped `SMALL` answer → exactly 2 fetch calls, the guest gets one outbound reply,
  `status` stays `bot`, no `assistantFailed`; the second request's `systemInstruction` text ends with
  `SHAPE_RETRY_LINE` and its `contents` equal the first request's; one `frontdesk.turn.bad_answer` log line
  `{ reason: 'bad_shape', attempt: 1, paths: ['intent'] }`.
- [auto] same file: two bad-shape answers → exactly 2 fetch calls, no outbound row, `status: 'human'`,
  `assistantFailed.reason: 'other'`, one `frontdesk.turn.failed` line with `reason: 'bad_shape'` (as today); a
  non-JSON answer then a well-shaped one → answered; a bad shape when less than 2000 ms of the 35 s budget is left
  (`Date.now` stubbed to jump 34 000 ms after the first call) → exactly 1 fetch call and the turn fails as today; the
  existing case "a bad_json answer: reason other" still passes.
- [auto] same file: the captured log text of the bad-shape cases contains none of `GUEST-SECRET-TEXT`, the model's
  reply text or a zod message (only paths and codes are logged).
- [auto] `server/test/frontdesk-guardrails.test.js`: `preCheck` answers `{ ok: false, reason: 'keyword' }` for each of
  "אפשר לדבר עם מישהו?", "אני רוצה לדבר עם בן אדם", "אפשר נציג?", "אני צריך נציג אנושי",
  "תעבירו אותי למישהו בבקשה", "can I talk to a person?"; it passes "אפשר שולחן לארבעה מחר ב-20:00?" and
  "מישהו מאיתנו יאחר בעשר דקות".
- [auto] `server/test/frontdesk-turn.test.js`: a level-1 turn whose last guest message is "אפשר לדבר עם מישהו?" →
  no fetch call, one outbound row with the profile's handoff sentence, `status: 'human'`, one
  `frontdesk.turn.blocked` line with `reason: 'keyword'`.
- [auto] `server/test/frontdesk-tables.test.js`: guest text "אפשר שולחן לארבעה מחר ב-20:00?" with the well-shaped
  `BOOK(FULL_ASK)` answer → the `fd_ai_offer` button message with `OK:1` / `OTHER` (as in "offers with OK:1 / OTHER"),
  1 fetch call; the same text with a bad-shape answer first, then `BOOK(FULL_ASK)` → the same offer after 2 fetch calls.
- [auto] `server/test/frontdesk-prompt.test.js`: `TURN_SYSTEM_PROMPT` names a guest who asks to talk to a person among
  the handoff reasons; `withShapeReminder(body)` returns a new body whose `systemInstruction` text is the old text,
  a newline and `SHAPE_RETRY_LINE`, with `contents` and `generationConfig` unchanged and the original body not mutated.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, as `demo_host`, assistant level 1) the test
  guest writes "אפשר שולחן לארבעה מחר ב-20:00?" three times in new chats, then "אפשר לדבר עם מישהו?" · each table
  question gets an offer with a confirm button within about half a minute, and the last one gets the restaurant's
  handoff sentence and the chat shows "אצל הצוות".

## Execution Mode
- Parallel: yes with plans that do not touch `server/routes/ai/frontdesk.js`, `server/constants/frontdesk-guard-words.js`
  or `server/services/frontdesk-prompt.js`. Plan 730 changes `server/services/gemini-client.js` and
  `server/constants/ai-prices.js` now; this plan reads neither's internals and writes neither.
- Concurrent plans: 730
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai/frontdesk.js
server/services/frontdesk-prompt.js
server/constants/frontdesk-guard-words.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-guardrails.test.js
server/test/frontdesk-tables.test.js
server/test/frontdesk-prompt.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. `server/services/gemini-client.js` and
`server/constants/ai-prices.js` are never offered: plan 730 owns them; a need there waits for 730's merge.

## Architecture Impact

- INV-6: preserves — the retry is a second `callGemini` call from the AI sub-router `server/routes/ai/frontdesk.js`, the one place the front desk already calls the model; `frontdesk-turn.js` still calls only `askTurnModel`; no key or prompt reaches the browser, and the corrective line is a fixed English rule in `systemInstruction`, never guest data.
- INV-2: preserves — `server/services/frontdesk-prompt.js` only builds prompt text and reads no collection; no query, filter or business scope changes anywhere in the plan.
- INV-7: preserves — `server/services/frontdesk-turn.js` is not changed; the retry happens before any table decision, a table turn still answers from the table engine (a test proves the offer), and the new handoff words only move a conversation to a person; nothing is offered, held or written by them.

## Reuse Check

- `withShapeReminder(body)` and `SHAPE_RETRY_LINE` in `server/services/frontdesk-prompt.js` — family: none — rung: 4 — why: a three-line pure helper beside `buildTurnBody`, the one place the turn's prompt text lives; the server has no registry family for services.
- The person-request fragments — family: none — rung: 4 — why: data added to the existing `HANDOFF` list of plan 689; no new list and no new check.

## Defaults

- loading-and-error-states — exception — why: no screen in this plan; the guest-facing handoff sentence and the "אצל הצוות" status already exist
- hints-in-tooltips — exception — why: no screen in this plan
- empty-state-on-list — exception — why: no list or screen in this plan; server code and tests only
- app-list-container — exception — why: no list or screen in this plan; server code and tests only
- one-breakpoint-set — exception — why: no screen and no CSS in this plan

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want the assistant to answer a table question even when the model stumbles once, so that a guest is not left without a reply.
- As a guest, I want to reach a person when I ask for one, so that I am not answered by a machine against my wish.
- As the developer on call, I want the log to say which field of the model's answer was wrong, so that I can fix the prompt instead of guessing.

## Functional Requirements

### Must Have (P0)

**One more try on a malformed answer — `server/routes/ai/frontdesk.js`**
- [ ] `askTurnModel` notes `startedAt = Date.now()` before its first call. When the answer is `bad_json` or
  `bad_shape`, it logs `warn` `frontdesk.turn.bad_answer` `{ reason, attempt: 1, paths, codes }` — `paths` is the zod
  issues' `path.join('.')` (`'(root)'` for an empty path), `codes` their `code`, both capped at 10 entries; `[]` for
  `bad_json`. Never the issue `message`, the model's text or any guest text (zod messages can quote the received
  value).
- [ ] Then, when `35000 - (Date.now() - startedAt)` is at least 2000 ms (the same floor as plan 701's
  `MIN_CALL_MS`; a local constant, since `gemini-client.js` is not touched), it calls `callGemini` once more with
  `withShapeReminder(body)`, the same `timeoutMs`, `fallback`, `log`, `eventPrefix` and `usage`, and
  `deadlineMs: <the remaining ms>`. The second answer goes through the same `extractJsonPayload` and
  `turnAnswerSchema.safeParse`; a second `bad_json` / `bad_shape` logs `frontdesk.turn.bad_answer` with `attempt: 2`.
- [ ] The result of the second call is the result: ok → `{ ok: true, answer }`; any failure →
  `{ ok: false, reason, status }` exactly as today, so `runTurn` logs `frontdesk.turn.failed` and hands off silently
  as today (R-04). Less than 2000 ms left → no second call; the first result is returned.
- [ ] A Google failure (`call.kind !== 'ok'`) is never retried here (plan 701's fallback already did that).
- [ ] The comment on `askTurnModel` says: one retry on a malformed answer, inside the same 35 s budget.

**The corrective line — `server/services/frontdesk-prompt.js`**
- [ ] `SHAPE_RETRY_LINE` (English, fixed): "Your previous answer was not one valid JSON object of the required shape.
  Answer again with exactly one JSON object as described above, and nothing else."
- [ ] `withShapeReminder(body)` (pure, exported) → a new body whose `systemInstruction.parts[0].text` is the old text
  plus `'\n' + SHAPE_RETRY_LINE`; `contents` and `generationConfig` are the same; the input is not mutated.
- [ ] The handoff rule line (`:26`) becomes "Set handoff to true for a complaint, a refund, an allergy emergency, a
  guest who asks to talk to a person, or anything outside the facts, and say why in handoffReason."

**A guest who asks for a person — `server/constants/frontdesk-guard-words.js`**
- [ ] `HANDOFF` gains a person-request group (lower-case fragments, matched as substrings after removing vowel
  points, as the file says): "לדבר עם מישהו", "עם בן אדם", "אדם אמיתי", "נציג", "תעבירו אותי", "להעביר אותי",
  "talk to a person", "talk to someone", "real person". "נציג" covers "נציג אנושי" and "נציגה"; "עם בן אדם" covers
  "לדבר עם בן אדם". The doc comment of `HANDOFF` adds "a guest asking for a person".
- [ ] No change to `preCheck`: it already hands a `keyword` match to a person with the handoff sentence before any
  model call, at level 1 sends it, at level 0 stores it as the suggestion, and skips in suggest mode (plan 689).

**Tests (Gemini faked with the stubbed `fetch` the files already use)**
- [ ] `server/test/frontdesk-turn.test.js`: bad shape then good → answered; two bad shapes → fails as today; non-JSON
  then good → answered; budget nearly spent → no retry; the bad-answer log line and its privacy; a person request →
  keyword handoff with no model call.
- [ ] `server/test/frontdesk-guardrails.test.js`: each person phrase → `keyword`; the table question and a sentence
  with "מישהו" but no request for a person pass.
- [ ] `server/test/frontdesk-tables.test.js`: the morning's table question with a well-shaped answer offers a table,
  and with one bad shape before it still offers.
- [ ] `server/test/frontdesk-prompt.test.js`: the handoff line and `withShapeReminder`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen. The guest sees only existing text: the model's reply, the table offer, or the business's handoff sentence
  (`profile.assistant.handoffText` or `fd_ai_handoff_default`).
- No new dictionary key.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Hand a guest who asks for a person straight to the staff, before any model call — person-request fragments in HANDOFF, the prompt's handoff line, guardrail and turn tests — server/constants/frontdesk-guard-words.js, server/services/frontdesk-prompt.js, server/test/frontdesk-guardrails.test.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-prompt.test.js
- [ ] A2: Give the model one more try when its answer comes back malformed, inside the same time budget — SHAPE_RETRY_LINE and withShapeReminder, the retry in askTurnModel with the 2000 ms floor, the bad_answer log line with zod paths only, turn and prompt tests — server/routes/ai/frontdesk.js, server/services/frontdesk-prompt.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-prompt.test.js
- [ ] A3: Prove the morning's table question still gets a table offer, also after one malformed answer — two cases beside "offers with OK:1 / OTHER" — server/test/frontdesk-tables.test.js
- [ ] A4: Run every check of this plan and hand Dandan the simulator check — test:server, server lint, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `askTurnModel` and the `fallback` / `deadlineMs` options of `callGemini` (plan 701), `preCheck` and the
  `HANDOFF` list (plan 689), the table offer (plan 680).
- New files needed: none.
- Model changes: none.
- Backend / API: none; no route, response or log event changes except the new `frontdesk.turn.bad_answer` line.
- Auth and validation: unchanged.
- Security surface: none new; the corrective line is fixed English in `systemInstruction`; the new log line carries
  enums and field paths only.
- Data / migration: none.
- Cost: at most one extra model call per turn, only after a malformed answer; each call writes its own `aiUsage` row
  (as plan 701's fallback does), so a retried turn counts twice toward the business's daily turn cap.
- Project checks: the `log-query` Done-when item; logs carry no guest text.
- Traps: `callGemini` already caps each call's timeout by `deadlineMs`, so pass the remaining ms, never 35000 again;
  the existing "a bad_json answer: reason other" case uses `mockResolvedValue` (every call bad), so it stays green
  with 2 calls — do not add a call-count assertion of 1 to it; the guardrail match is a substring of the **last**
  guest message only, so an earlier person request in the history does not re-trigger.

## Out of Scope
- `server/services/gemini-client.js` and `server/constants/ai-prices.js` (plan 730).
- Retrying a reply that the guardrails blocked (plan 689: a blocked reply is never retried).
- A guest-facing message on failure (R-04 keeps a failed turn silent).
- Changing `turnAnswerSchema` to accept what the model sent (first find out from the new log line which field fails).

## Critical Questions
- none

## Execution Notes
- behaviour: the person request is caught by the server's `HANDOFF` word list (plan 689's second line, before any model call) and also named in the prompt (the model's first line); the word list alone decides the tests, because the model cannot be trusted to flag it.
- behaviour: "תעבירו אותי" and "להעביר אותי" also match "תעבירו אותי לשולחן ליד החלון"; such a guest goes to a person, which is the safe side; if the Human prefers, narrow them to "תעבירו אותי לנציג" / "תעבירו אותי למישהו".
- behaviour: "נציג" alone hands off (it also catches "נציגה" and "נציג אנושי"); "מישהו" alone does not, so "מישהו מאיתנו יאחר" still reaches the assistant.
- behaviour: one retry only, and only for `bad_json` / `bad_shape`; a second malformed answer fails as today with reason `other`.
- behaviour: the corrective line is a fixed rule appended to `systemInstruction`; the model's malformed text is not sent back (it may hold guest words and adds tokens).
- behaviour: no retry when less than 2000 ms of the 35 s budget is left, the same floor plan 701 uses between fallback calls.
- behaviour: a retried turn writes two `aiUsage` rows, so it counts twice toward the daily turn cap, as a fallback call already does.
