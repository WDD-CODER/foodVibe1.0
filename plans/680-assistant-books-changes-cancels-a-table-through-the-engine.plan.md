# Plan 680 — The assistant books, changes and cancels a table through the engine, with fixed sentences and buttons

Status: draft
Depends-on: 679, 689, 668, 685
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After plans 679 and 689 the assistant answers questions and collects a request that a person approves. A guest who
writes "שולחן ל-4 מחר ב-8 בערב" still waits for the owner, although the table engine (plan 663) and the unique
hold (plan 668) can answer at once. This plan lets a conversation book, change and cancel a table — and keeps the
rule of the whole program: the model only extracts what the guest wants (date, time, party, area). Whether there
is a table, which times to offer, and every sentence about availability come from the server: fixed Hebrew
sentences from the dictionary, with buttons. The guest's tap on a button is handled with no model call at all.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `docs/frontdesk/assistant-behaviour-rules.md` R-06 ("no completion claim without the write"; plan 662 rewrites
  its last sentence to "A table is confirmed only by the engine and the hold (INV-7)"), R-09 (today's date is
  injected), R-12 (closed questions are sent as buttons).
- `server/middleware/require-module.js`: `businessModules(businessId)` returns the business's modules (cached 30 s).
- `shared/schemas/front-desk/qualify.ts`, `server/utils/request-create.js` (`runQualify`, `createRequest`): the
  path a table request takes today; `REQUEST_VIA` and `BOOKING_SOURCES` both have `ai`
  (`shared/schemas/entities/request.schema.ts:10`, `booking.schema.ts:7`).
- None of these exists: `server/services/frontdesk-tables.js`, any `fd_ai_*` key in
  `public/assets/data/dictionary.json`.

From plans not on `main` yet (use the merged names if they differ):
- 662: `conversation.pending?: { kind: 'book' | 'change' | 'cancel', data, at }`, `conversation.bookingId`,
  `tableServiceOf(profile)` (`confirmMode`, `autoMaxParty`, `cancellationCutoffHours`), bookings with `tableKeys`,
  `test`.
- 663: `assign`, `alternatives` in `shared/schemas/front-desk/table-engine.ts`.
- 668: `server/services/table-bookings.js` — `loadTableContext(db, businessId)`, `reserveTable`, `bookTable(db,
  { doc, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now, insert })`, `countBooking`;
  `server/services/table-holds.js` — `holdsOf`, `move`, `release`; `PUT /api/v1/bookings/:id/when` re-assigns a
  `confirmed` booking through `move`.
- 669: a guest's cancel moves the booking and its request to `cancelled`, with a history entry `via: 'guest'`,
  and deletes the holds; allowed while `now < startAt − cancellationCutoffHours`.
- 675: `registerButton(prefix, handler(db, { conversation, token, at }))` — an inbound `buttonId` `PREFIX:token`
  is handled by the server with no model call; `sendOut(db, conversation, outbound, author, { now })` with
  `outbound = { kind: 'text' | 'template' | 'button', text?, template?, buttons? }`; the template
  `booking_confirmed(name, date, time, partySize)` in `shared/schemas/front-desk/message-templates.ts`.
- 679: `runTurn`, `decide`, `fixedText`, `turnAnswerSchema`, `TURN_SYSTEM_PROMPT`, `buildTurnBody`, the key
  `fd_ai_will_confirm`, level 0 storing `suggestion`. 689: `applyGuardrails` with its ordered reply checks and
  `GUARD_WORDS.COMPLETION`.

## Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-AI2 (R18; used by R19)**
- The answer schema gains `intent` values `book | change | cancel` and `collected.table?: { date?, time?,
  partySize?, areaKey? }` (the model fills what the guest said; `date` and `time` are resolved by the model from
  the injected today's date, R-09, and validated by the server).
- For these intents the model's `reply` is dropped and the server answers:
  missing field → the dictionary question for that field;
  complete → `assign(onlineOnly)`: free → `fd_ai_offer` sentence + buttons `OK:<n>` / `OTHER`; not free →
  `fd_ai_alternatives` + up to three buttons `ALT:<n>`; the offer is kept in `conversation.pending`;
  `OK` → assign again → `auto` within `autoMaxParty`: claim, booking (source `ai`), template `booking_confirmed`;
  `manual` or over the limit: a `qualified` request (channel of the conversation) and `fd_ai_will_confirm`;
  a lost race → alternatives again.
  `change` / `cancel`: the guest's bookings with `endAt > now` by `clientId`; one → act through C-BOOK2 within the
  cutoff and answer with the fixed sentence; several → buttons; past the cutoff or none found → handoff.
- A model `reply` that contains a time (`\d{1,2}:\d{2}`), a table number or a word of the "confirmed" list is
  blocked and becomes a handoff (R-06). The fixed sentences come only from the dictionary.

What this plan fixes inside the Contract (lines for the map's "Contract extensions (run)"):
1. **A time taken from a fact is allowed.** Blocking every `HH:mm` would block "we are open 12:00–23:00". A time in
   the model's reply passes only when the same `HH:mm` string stands in a fact line whose id is in `usedFacts`;
   any other time, and every table number, is blocked.
2. **Buttons cost no model call.** `OK`, `ALT`, `OTHER` and `BK` (pick one of several bookings) are registered
   with plan 675's `registerButton`; `OK:<n>` and `ALT:<n>` carry the index of the offer in `pending.data`.
3. **An alternative tapped is a confirmation** of that time: `ALT:<n>` goes straight to the booking step.
4. **Engine answers that are not "full".** `closed`, `too_soon`, `too_far`, `too_late` → a fixed sentence that asks
   for another time; `too_big`, `too_small` → handoff (a person takes a party the rules do not fit); `no_plan`, or a
   business without `tables` → the intent is treated as a table `request` exactly as in plan 679.
5. **Level 0 books nothing.** At level 0 and in "suggest" mode the server's sentence is stored as the suggestion
   (without buttons), `pending` is not written and no table is touched.
6. **Fixed sentences are sent with `author: 'server'`**, so they do not count toward the eight-turn limit.
7. **Several bookings:** up to three are offered as buttons; more than three is a handoff.

## Goals & Success Criteria
**Primary:** in the simulator transport a guest books, changes and cancels a table by chat; every sentence about
availability is a dictionary sentence the server chose after the engine answered, and a table is written only
through the booking service.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/frontdesk-tables.test.js` and the added
  cases of `server/test/frontdesk-guardrails.test.js` and `server/test/frontdesk-prompt.test.js`. The model is a
  stubbed `fetch`, the transport is the simulator's, the clock is injected.
- [auto] `server/test/frontdesk-tables.test.js` ("book, auto"): business with `tables`, a 14-table plan, confirm
  mode `auto`, level 1. Guest text "שולחן ל-4 מחר ב-8 בערב", the model answering `intent: 'book'`,
  `collected.table: { date: <tomorrow>, time: '20:00', partySize: 4 }` and any `reply` → one outbound `button`
  message whose text is the rendered `fd_ai_offer` and whose buttons are `OK:1` and `OTHER`; the model's `reply`
  is nowhere in `messages`; `conversation.pending.kind` is `book`. Then an inbound button `OK:1` → no `fetch`
  call, one booking with `source: 'ai'`, `status: 'confirmed'`, `tableKeys` of an online table, holds for it,
  `conversation.bookingId` set, `pending` removed, and an outbound `template` message `booking_confirmed` with the
  client's name, the date, `20:00` and `4`.
- [auto] same file ("book, manual"): the same with confirm mode `manual` → after `OK:1` no booking and no hold;
  one request with `kind: 'table'`, `status: 'qualified'`, `channel: 'sim'`, a history entry `via: 'ai'`; the text
  sent is `fd_ai_will_confirm`. The same with mode `auto` and a party of 8 over `autoMaxParty: 6`.
- [auto] same file ("missing"): `collected.table: { partySize: 4 }` → the text `fd_ai_ask_date`, `pending.data`
  keeps the party; the next answer with only a date → `fd_ai_ask_time`; the next with a time → the offer for all
  three.
- [auto] same file ("full"): with every online table held at 20:00 → the text `fd_ai_alternatives` and at most
  three buttons `ALT:1`…, each title a date and a time the engine returned; `ALT:2` → a booking at exactly that
  alternative. With no alternative at all → the text `fd_ai_full_none` and no button.
- [auto] same file ("lost race"): the offer is free, then another booking takes the table before `OK:1` → no
  booking for this guest, the answer is `fd_ai_alternatives` again, and no hold of this conversation is left.
- [auto] same file ("other", "expired"): `OTHER` → the text `fd_ai_ask_time` and `pending.data` without a time;
  `OK:1` with no `pending` → the text `fd_ai_expired` and nothing written.
- [auto] same file ("reasons"): a closed date → `fd_ai_reason_closed`; a time two hours from now with
  `minLeadHours: 2` broken → `fd_ai_reason_too_soon`; a party of 20 over `maxPartySize: 12` → `status: 'human'` and
  the handoff sentence.
- [auto] same file ("cancel"): one future booking of the client, `intent: 'cancel'`, 5 hours before it with a
  cutoff of 3 → the booking and its request are `cancelled` with a history entry `via: 'guest'`, the holds are
  gone, the text is `fd_ai_cancelled`. Two hours before it → nothing changes and the conversation is handed off.
  No booking → handoff. Two bookings → the text `fd_ai_pick_booking` with buttons `BK:1`, `BK:2`; `BK:2` cancels
  the second.
- [auto] same file ("change"): one future booking, `intent: 'change'` with `collected.table: { time: '21:00' }`
  and a free table → the booking's time is 21:00, its holds moved, the text is the rendered `fd_ai_changed`; with
  21:00 full → the booking is unchanged and the text is `fd_ai_change_full`; with nothing in `collected.table` →
  `fd_ai_ask_change`.
- [auto] same file ("level 0"): the first case at level 0 → no outbound message, `suggestion` equals the rendered
  `fd_ai_offer`, no `pending`, and an inbound `OK:1` writes nothing.
- [auto] same file ("without tables"): a business without `tables`, `intent: 'book'` with all three fields → the
  request path of plan 679 (one `qualified` request, `fd_ai_will_confirm`), no engine call.
- [auto] same file ("test data"): in a `test: true` conversation the booking carries `test: true`.
- [auto] same file ("logs"): after a full booking by chat the captured log lines contain no guest text, name,
  phone or table key.
- [auto] `server/test/frontdesk-guardrails.test.js` (added): a reply with "20:00" and no used fact containing
  `20:00` → `unsupported_time`; with a used fact line containing `20:00` it passes; "שולחן 12" or "table 7" →
  `table_number`.
- [auto] `server/test/frontdesk-prompt.test.js` (added): with `tables` on, the body's data block lists the plan's
  areas (`key`, `name`) and the system instruction contains the table section; with `tables` off neither is there.
- [auto] `pnpm run test:server` runs `server/test/bookings-tables.test.js` of plan 668 unchanged and green.
- [auto] `grep -n "assign(\|claim(" server/services/frontdesk-tables.js` shows `assign(` only inside the function
  that builds an offer and no `claim(` at all (a table is written through `bookTable` and `changeWhen`).
- [auto] `pnpm --dir server run lint` → exit 0. `pnpm run build` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan books a table for four in the simulator (plan 678), taps "לאשר", sees the confirmation and finds
  the booking on the room of the service screen; then writes "תבטלו לי" and sees it gone.

## Execution Mode
- Parallel: no — third plan of run `rs-ai`, after 679 and 689 (the same turn handler files). It appends to
  `public/assets/data/dictionary.json`, so no screen run is live beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/frontdesk-tables.js
server/services/frontdesk-turn.js
server/services/frontdesk-prompt.js
server/services/frontdesk-guardrails.js
server/services/table-bookings.js
server/routes/bookings.js
server/routes/ai/frontdesk.js
shared/schemas/front-desk/turn-answer.schema.ts
server/test/frontdesk-tables.test.js
server/test/bookings-tables.test.js
server/test/frontdesk-guardrails.test.js
server/test/frontdesk-prompt.test.js
server/test/frontdesk-turn.test.js
public/assets/data/dictionary.json
server/breadcrumbs.md
docs/restaurant/restaurant-map.md
docs/workflow-kit/manifest.json
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-7: preserves — the model never decides: its `reply` is dropped for `book`, `change` and `cancel`, an offer is sent only after `assign` returned it in the same request, the booking is written only through `bookTable` (claim, then write, release on failure) and a change only through `move`; a reply of the model with a time that is in no used fact, or with a table number, is blocked.
- INV-6: preserves — no model call is added; the button handlers make none, and the turn's one call stays `askTurnModel` under `server/routes/ai/`.
- INV-1: preserves — the guest writes through the inbound handler of plan 675 only; the booking and the request are stamped by the server with the conversation's business and client; `server/routes/bookings.js` only hands the body of an existing member route to a service function, with the same permission checks in the route.
- INV-2: preserves — every query of `frontdesk-tables.js` and of the two new functions of `table-bookings.js` carries the conversation's `businessId`.
- INV-4: preserves — `collected.table` is added to the answer's Zod schema; the booking and the request are checked against their schemas by the functions that write them.

## Reuse Check

- `handleTableIntent`, the four button handlers (`server/services/frontdesk-tables.js`) — family: none — rung: 4 — why: the chat's table dialogue is new; it reuses the engine, the booking service and the fixed-text helper and adds only the conversation's state machine
- `changeWhen`, `cancelByGuest` (`server/services/table-bookings.js`) — family: none — rung: 4 — why: the change body of the member route and a guest's cancel must be callable from a conversation; one function each, in the service plan 668 made the only door to a held booking

## Defaults

- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list
- empty-state-on-list — exception — why: server only; the plan builds no list
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS
- unit-dropdown-add — exception — why: server only; the plan builds no dropdown

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a guest, I want to write "שולחן ל-4 מחר ב-8" and get a yes with one tap, at any hour.
- As a guest, I want to be offered the nearest free times when my hour is full, instead of a "no".
- As a guest, I want to cancel or move my booking by writing, without calling.
- As the owner who approves every booking myself, I want the chat to collect the booking and leave the yes to me.
- As the owner, I want the assistant never to promise a table the room does not have.

## Functional Requirements

### Must Have (P0)

**The answer schema and the prompt**
- [ ] `turnAnswerSchema`: `TURN_INTENTS` gains `'book'`; `collected` becomes an object with an optional `table:
  { date?: string, time?: string, partySize?: number (int 1–5000), areaKey?: string ≤ 12 }` and every other key a
  string, as before.
- [ ] `TURN_SYSTEM_PROMPT` gains a table section, added to the instruction only when the business has `tables`
  and a floor plan: a wish to reserve a table is `intent: 'book'`, to move an existing one `change`, to give it up
  `cancel`; put what the guest said in `collected.table` (`date` as `YYYY-MM-DD` and `time` as `HH:mm`, resolved
  from the today block; `areaKey` only from the listed areas); never say whether there is room, never name a time
  as available, never say a booking was made, changed or cancelled — the system answers those itself.
  `buildTurnBody` gets `{ tablesOn, areas }` and lists the areas (`key`, `name`) in the data block.

**The table dialogue — `server/services/frontdesk-tables.js`** (new)
- [ ] `tablesFor(db, businessId)` → `null` unless `businessModules` includes `tables` and
  `loadTableContext` finds a plan; else the context. `runTurn` calls it once per turn and passes it on.
- [ ] `handleTableIntent(db, conversation, answer, ctx)` is called by `runTurn` instead of `decide` when the
  intent is `book`, `change` or `cancel` and `tablesFor` is not null. It returns `{ outbound, pending, handoff }`
  and writes nothing itself at level 0 or in "suggest" mode (Contract point 5).
- [ ] **Book.** Merge `conversation.pending.data` (when `pending.kind === 'book'` and it is younger than 30
  minutes) with `collected.table`; new values win. Validate: `date` `YYYY-MM-DD`, `time` `HH:mm`, `partySize` an
  integer 1–30; an invalid value counts as missing. The first missing of date, party, time is asked with
  `fd_ai_ask_date`, `fd_ai_ask_party`, `fd_ai_ask_time`, and `pending = { kind: 'book', data, at: now }`. Nothing
  missing → `offer`.
- [ ] **`offer(db, conversation, ask, ctx)`** — `holdsOf` for the date, then `assign(plan, profile, holds, { date,
  time, partySize, areaKey, onlineOnly: true, now })`:
  `ok` → a `button` message: text `fixedText('fd_ai_offer', { date: 'dd/MM', time, party })`, buttons
  `[{ id: 'OK:1', title: fd_ai_btn_confirm }, { id: 'OTHER', title: fd_ai_btn_other }]`; `pending.data.offers =
  [{ date, time }]`.
  `full` → `alternatives(...)`: one to three → text `fd_ai_alternatives`, a button `ALT:<n>` per alternative with
  the title `dd/MM HH:mm`, `pending.data.offers` = the alternatives; none → text `fd_ai_full_none`, `time`
  removed from `pending.data`.
  `closed`, `too_soon`, `too_far`, `too_late` → the text `fd_ai_reason_<reason>` and the refused field removed
  from `pending.data` (`date` for `closed` and `too_far`, `time` for the other two).
  `too_big`, `too_small` → handoff. `no_plan` → the request path of plan 679.
  A button title is at most 20 characters.
- [ ] **Buttons**, registered at load with `registerButton`, each a no-model handler that reads the conversation,
  requires level 1 or 2 and `status: 'bot'` (else it does nothing), and answers through `sendOut` with
  `author: 'server'`:
  `OK` and `ALT` (token = the index) → the offer `pending.data.offers[n − 1]`; none, or `pending` older than 30
  minutes → text `fd_ai_expired`, `pending` removed. Else `confirm`.
  `OTHER` → `time` and `offers` removed from `pending.data`, text `fd_ai_ask_time`.
  `BK` (token = the index into `pending.data.bookingIds`) → the cancel or the change waiting in `pending`.
- [ ] **`confirm(db, conversation, ask, ctx)`**: `service = tableServiceOf(profile)`.
  `confirmMode === 'auto'` and `partySize <= autoMaxParty` → build the booking the way plan 668's phone booking
  does (kind `table`, source `ai`, the client of `conversation.clientId`, `test: true` for a test conversation)
  and `bookTable(..., onlineOnly: true)`. Success → `countBooking` (not for a test conversation), `$set:
  { bookingId }` and `$unset: { pending }` on the conversation, and the template `booking_confirmed(name, date,
  time, partySize)` through `sendOut`. `NO_TABLE` → `offer` again for the same ask (the lost race: the guest gets
  alternatives). Any other failure → handoff.
  Otherwise (`manual`, or over the limit) → `runQualify`; `unfit` → the rule sentences (`reasonText`), no request;
  else `createRequest` for kind `table` with `wanted: { date, time, partySize }`, the area's name as the `seating`
  answer when the kind has that question, `{ channel: conversation.channel, actor: 'public:' + channel, via:
  'ai' }`; `$set: { requestId }`, `$unset: { pending }`; text `fd_ai_will_confirm`.
- [ ] **Cancel and change.** The guest's bookings: `{ businessId, clientId: conversation.clientId, kind: 'table',
  status: 'confirmed', endAt: { $gt: now } }`, by `startAt`. None → handoff. More than three → handoff. Two or
  three → text `fd_ai_pick_booking`, buttons `BK:<n>` titled `dd/MM HH:mm`, `pending = { kind, data: { bookingIds,
  table: collected.table }, at }`. One (or the one picked) →
  past the cutoff (`now >= startAt − cancellationCutoffHours × 3600000`) → handoff;
  `cancel` → `cancelByGuest`, text `fd_ai_cancelled`;
  `change` → the new `date`, `time`, `partySize` from `collected.table` over the booking's own; none given → text
  `fd_ai_ask_change` and `pending` kept; else `changeWhen`: success → text `fixedText('fd_ai_changed', { date,
  time, party })`; `NO_TABLE` → text `fd_ai_change_full`, the booking untouched; any other refusal → handoff.
- [ ] Logs: `frontdesk.table.offer` (`reason` or `ok`, `alternatives` count), `frontdesk.table.booked`,
  `frontdesk.table.request`, `frontdesk.table.cancelled`, `frontdesk.table.changed`, `frontdesk.table.expired` —
  ids, enums and numbers only; never a name, a phone, a text or a table key.

**The booking service — `server/services/table-bookings.js`**
- [ ] `changeWhen(db, ctx, booking, { date, time, partySize, tableKeys }, { now, actor, via })`: the body of plan
  668's `PUT /:id/when`, moved here unchanged; the route keeps its validation and permission checks and calls it.
  `via` is `'member'` from the route and `'guest'` from the chat.
- [ ] `cancelByGuest(db, booking, { now })`: the booking → `cancelled` with a history entry `{ via: 'guest', by:
  'public:' + channel… }` in the shape plan 669's guest cancel writes, its holds released from `now`, and the
  request named by `booking.requestId` → `cancelled` when it is `approved`. If plan 669 merged a shared function
  for the guest's cancel, call it and add none.

**The turn and the guardrails**
- [ ] `runTurn` (`server/services/frontdesk-turn.js`): after the guardrails, `book | change | cancel` with tables
  on → `handleTableIntent`; with tables off → `book` is treated as `request` of kind `table` (the `collected.table`
  fields mapped to `date`, `time`, `party_size`), and `change` / `cancel` keep plan 679's behaviour. The file
  requires `frontdesk-tables.js` so the buttons are registered at start.
- [ ] `applyGuardrails` (`server/services/frontdesk-guardrails.js`) gains two reply checks after the completion
  check, only when `ctx.tablesOn`: every `\d{1,2}:\d{2}` in the reply must stand in a fact line whose id is in
  `usedFacts`, else `unsupported_time`; `שולחן\s*\d+` or `table\s*\d+` → `table_number`. For the three table
  intents `ctx.replyWillBeSent` is false, so the model's reply is not checked — it is not sent.

**Dictionary keys** (append under `general`):
`fd_ai_ask_date` "לאיזה תאריך תרצו להזמין?" · `fd_ai_ask_party` "לכמה אנשים?" · `fd_ai_ask_time` "באיזו שעה?" ·
`fd_ai_offer` "יש מקום ב-{date} בשעה {time} ל-{party} אנשים. לאשר?" · `fd_ai_btn_confirm` "לאשר" ·
`fd_ai_btn_other` "שעה אחרת" · `fd_ai_alternatives` "בשעה שביקשתם אין מקום. אפשר באחד מהמועדים האלה:" ·
`fd_ai_full_none` "לצערנו אין מקום פנוי קרוב למועד שביקשתם. אפשר לנסות מועד אחר?" ·
`fd_ai_reason_closed` "אנחנו סגורים במועד הזה. אפשר לבחור מועד אחר?" ·
`fd_ai_reason_too_soon` "אי אפשר להזמין בהתראה כל כך קצרה. אפשר לבחור מועד מאוחר יותר?" ·
`fd_ai_reason_too_far` "עדיין אי אפשר להזמין למועד כל כך רחוק. אפשר לבחור מועד קרוב יותר?" ·
`fd_ai_reason_too_late` "בשעה הזאת כבר לא מושיבים. אפשר לבחור שעה מוקדמת יותר?" ·
`fd_ai_expired` "ההצעה כבר לא בתוקף. אפשר לכתוב שוב מה תרצו?" ·
`fd_ai_pick_booking` "לאיזו הזמנה הכוונה?" · `fd_ai_ask_change` "מה תרצו לשנות — תאריך, שעה או מספר האנשים?" ·
`fd_ai_cancelled` "ההזמנה בוטלה. נשמח לראות אתכם בפעם אחרת." ·
`fd_ai_changed` "ההזמנה עודכנה: {date} בשעה {time}, {party} אנשים." ·
`fd_ai_change_full` "אין מקום במועד החדש. ההזמנה נשארה כפי שהייתה."

### Should Have (P1)
- [ ] `server/breadcrumbs.md` lists `frontdesk-tables.js`; `docs/restaurant/restaurant-map.md` gets the seven
  lines of "What this plan fixes" under "Contract extensions (run)".

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built. The guest sees the sentences and buttons in the simulator (plan 678) and later on the real
  channel; R-12: every closed question here is a button message, and outside the window `sendOut` already refuses
  free text.
- Dates in sentences and button titles are `dd/MM`; times `HH:mm`.
- Dictionary keys added: the eighteen `fd_ai_*` keys above.

## Atomic Sub-tasks

- [x] A1: Teach the model's answer and prompt the three table wishes without letting it speak about room — the book intent, the table fields, the table section and the area list only when table service is on; the prompt test — shared/schemas/front-desk/turn-answer.schema.ts, server/services/frontdesk-prompt.js, server/test/frontdesk-prompt.test.js
- [x] A2: Add the fixed sentences the server speaks about tables — the eighteen keys with their Hebrew values — public/assets/data/dictionary.json
- [x] A3: Collect what is missing and make an offer only after the engine answered — merge with what is pending, the three questions, the offer with its buttons, alternatives, the sentences for the other engine answers — server/services/frontdesk-tables.js
- [x] A4: Turn the guest's tap into a booking or a request by the owner's confirm mode — the four button handlers with no model call, confirm through the booking service, the lost race, the expired offer — server/services/frontdesk-tables.js
- [x] A5: Let a guest cancel or move a booking by chat inside the cutoff — find the bookings, the pick buttons, the two service functions and the member route calling the moved body — server/services/frontdesk-tables.js, server/services/table-bookings.js, server/routes/bookings.js
- [x] A6: Route the three intents in the turn and block a time or a table number the model made up — the branch in the turn, the level 0 rule, the two reply checks and their tests — server/services/frontdesk-turn.js, server/services/frontdesk-guardrails.js, server/routes/ai/frontdesk.js, server/test/frontdesk-guardrails.test.js, server/test/frontdesk-turn.test.js
- [x] A7: Prove every branch on the simulator transport with the model faked — book in both modes, missing fields, full, lost race, other, expired, reasons, cancel, change, level 0, no tables, test data, logs — server/test/frontdesk-tables.test.js
- [x] A8: Record the new piece and the Contract lines, then run every check — the folder map, the map's extension lines, the evidence in Execution Notes — server/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: the engine (663), the booking service and holds (668), the approve path's request shape (685),
  the conversation pipeline (675), the turn and its guardrails (679, 689).
- New files needed: `server/services/frontdesk-tables.js`, `server/test/frontdesk-tables.test.js`.
- Model changes: none stored beyond what plan 662 declared (`pending`, `bookingId`); the answer schema grows.
- Backend / API: no new route. `PUT /api/v1/bookings/:id/when` keeps its contract; its body moves into a service.
- Auth and validation: the guest's fields are validated by the server before the engine sees them; the buttons act
  only on the conversation they arrived in and only on bookings of that conversation's client.
- Security surface: a guest can now cause a booking write without a person. It is bounded by the owner's switch
  (`confirmMode`, `autoMaxParty`), by the engine and the unique hold, and by the cutoff for cancel and change; a
  `test: true` conversation writes only test rows. Logs carry no name, phone, text or table key.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; dictionary keys named with their values; no icon;
  `server/breadcrumbs.md` in scope.
- Free tier: at most one model call per guest text; none per button tap.

## Out of Scope
- The eval dialogues and `request.suggested` (plan 681); the inbox buttons (plan 682); the real channel (plan 683).
- Joining a waiting list by chat, deposits, a booking for another person's phone.
- Booking a tasting or a consultation by chat (they stay requests).
- Changing the member routes' behaviour: `PUT /:id/when` answers exactly as plan 668 built it.

## Critical Questions
- none

## Execution Notes
- behaviour: a time in the model's own reply is allowed only when the same time stands in a fact it used; otherwise the reply is blocked.
- behaviour: tapping an alternative books that time at once (or sends it to the owner in manual mode), with no second confirm.
- behaviour: an offer and a pending question expire after 30 minutes.
- behaviour: a party the rules do not fit (too big, too small) goes to a person; a closed day or a time too soon, too far or too late gets a fixed sentence asking for another time.
- behaviour: at level 0 nothing is booked by chat; the server's sentence is the suggested reply.
- behaviour: a guest with more than three future bookings is handed to a person.
- behaviour: at level 0 / suggest mode a `change` or `cancel` by chat acts on nothing and hands off (the handoff sentence is the suggestion) — reverse: store the pick or ask sentence as the suggestion instead.
- behaviour: an unfit manual request sends the rule sentences (`reasonText`) and clears `pending`.
- `changeWhen(…, { now, via })` keeps the route unchanged: `via` only labels the caller, no history entry is written for a change, as before. `holdsByDate` is now exported from `table-bookings.js` (in scope) for the offer's alternatives.
- docs/brain/component-families.md: assistant-table-dialogue heading added (approved, ANSWER 680-1).
- Evidence: `pnpm run build` → 0; `pnpm run lint` → 0; `lint:icons` → 0; `lint:no-native-select` → 0; `pnpm --dir server run lint` → 0 errors; `vitest frontdesk-tables` → 26 pass; `frontdesk-prompt`, `frontdesk-guardrails` green; `grep "assign(\|claim("` frontdesk-tables.js → one `assign(` inside `offer`, no `claim(`.
- `pnpm run test:server` → 2380 pass, 1 fail `ai-invoice-read.test.js` (log-leak test) under full-suite load; rerun alone → 18/18 pass (load, rerun once).
