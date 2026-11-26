# Plan 751 — The assistant understands "מחר" by itself and no longer hands an opening-hours answer to the staff

Status: draft
Depends-on: none
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

Two gaps the Human found in his simulator tests of 2026-11-25/26.

**Gap 1 — "מחר" is not turned into a date.** In 2 of 3 rounds the guest wrote "אפשר שולחן לארבעה מחר ב-20:00?"
(the sentence of `server/test/frontdesk-tables.test.js:136`), the model answered `book` with a time and a party size
but no date (or a date that is not `YYYY-MM-DD`), and the guest was asked "לאיזה תאריך תרצו להזמין?". Verified on the
Snapshot:
- The prompt already asks the model to resolve such words (`server/services/frontdesk-prompt.js:25` and `:37`) and
  gives it today's and tomorrow's date (`todayBlock`, `:44-55`). Nothing on the server checks that it did.
- Table path: `cleanTable` drops a date that is not a real `YYYY-MM-DD` (`server/services/frontdesk-tables.js:63`,
  `validDate` `:45`) and a time that is not strict `HH:mm` (`:64`, `TIME_RE` `:30`); `bookStep` then asks for the first
  missing field, the date first (`:151-153` → `fd_ai_ask_date`).
- Request path: `gather` drops a `date` that fails `DATE_RE` (`server/services/frontdesk-turn.js:58`, `:25`) and a
  `time` that fails `TIME_RE` (`:59`, `:26`), so the field counts as missing and the model's own reply is sent (`:90`).
  A `book` answer of a business without tables takes this path through `bookAsRequest` (`:33-41`, `:253`).
- The existing test `server/test/frontdesk-turn.test.js:159-164` pins the drop: a date `'tomorrow'` writes no request.

The Human agreed to the direction: do not trust the model for this. A script resolves the date words before the
collected data reaches the table engine or the request path.

**Gap 2 — an opening-hours answer was stopped as `unsupported_time` and handed to the staff.** The guest asked
"מתי אתם פתוחים?", a backup model answered, and `applyGuardrails` returned `unsupported_time`. Verified on the Snapshot:
- `timeBlocked` (`server/services/frontdesk-guardrails.js:76-81`) passes a `\d{1,2}:\d{2}` of the reply (`:22`) only
  when the same string stands in a fact line whose id the answer listed in `usedFacts`; it runs only with table service
  on (`:105-108`). `usedFacts` is first filtered to known ids (`:86-87`).
- The hours fact is one line, `[profile.hours] opening hours: <days> <time>; …` (`server/services/knowledge.js:20-23`);
  the demo restaurant renders `[profile.hours] opening hours: כל יום 12:00–23:00`
  (`server/scripts/lib/demo-restaurant-data.js:85`). The row's structured `open` / `close` values are not in the line.
- The reply is not logged (`frontdesk.turn.blocked` carries `reason`, `stage`, `level` only,
  `server/services/frontdesk-turn.js:139`), so the exact cause is unknown. What the code blocks wrongly:
  1. the model quotes the hours correctly and lists no fact id, or an id in another spelling (for example with the
     square brackets) that the known-id filter removes — the most likely cause on a backup model;
  2. a leading zero differs: the fact says `9:00`, the reply says `09:00` (`'9:00'.includes('09:00')` is false);
  3. the hours row is free text (`בערב`, `12-23`) and the model writes the same hours as `18:00–23:00`.
  A dash of another kind is not a cause (each time is matched on its own), and "11 בלילה" is not caught by the
  pattern at all. The same substring test also passes a wrong time today: `2:00` passes when a used fact holds `12:00`.

The rule's purpose (plan 680, `plans/680-assistant-books-changes-cancels-a-table-through-the-engine.plan.md:64-66`;
`docs/restaurant/restaurant-map.md:787` point 1) is "the model never invents a time and never promises a table time".
Every fact line is public, approved data that was sent to the model, so a time that stands in any of them is not
invented. `usedFacts` is the model's own report: it is no protection against a model that invents (such a model can
list the hours fact as well). The rules table `docs/frontdesk/assistant-behaviour-rules.md` has no row for this check;
R-09 (`:23`) is the row about date words.

## Goals & Success Criteria
**Primary:** a guest who writes "מחר", "היום", a weekday or a day/month date gets the table offer or the request for
that date even when the model left the date out; an answer that quotes the opening hours from the facts is sent to the
guest; a blocked time leaves numbers in the log that say why.

- [auto] `pnpm run test:server` → exit 0, including the new files `server/test/date-words.test.js` and
  `server/test/frontdesk-when.test.js`, the changed cases below, and `server/test/frontdesk-eval.test.js` unchanged
  and green.
- [auto] `server/test/date-words.test.js`, `dateFromWords(text, now)` with `now = Date.parse('2026-11-26T10:00:00Z')`
  (Thursday 12:00 in Jerusalem): `'אפשר שולחן לארבעה מחר ב-20:00?'` → `'2026-11-27'`; `'היום בערב'`, `'שולחן להערב'`,
  `'הלילה'`, `'tonight'` → `'2026-11-26'`; `'מחרתיים בצהריים'`, `'the day after tomorrow'` → `'2026-11-28'`; `'למחר'`,
  `'tomorrow at 8'`, `'ביום שישי'`, `'שישי הקרוב'`, `'לשישי בערב'`, `'next Friday'` → `'2026-11-27'`; `'בשבת'` →
  `'2026-11-28'`; `'יום ראשון'`, `'on Sunday'` → `'2026-11-29'`; `'ביום שני'` → `'2026-11-30'`; today's own weekday
  `'יום חמישי'`, `'חמישי הבא'`, `'Thursday'` → `'2026-12-03'`.
- [auto] same file, numeric dates with the same `now`: `'26/11'` → `'2026-11-26'`; `'25.11'` → `'2027-11-25'`;
  `'1/12/26'` and `'01.12.2026'` → `'2026-12-01'`; `'25/11/2026'` → `null`; `'31/2'` → `null`; `'ב-20.00'` and
  `'ב-8.30'` → `null`; `'2026-12-05T20:00'` → `'2026-12-05'`.
- [auto] same file, no date: `'שולחן לשני אנשים'`, `'אפשר לשבת בחוץ?'`, `'ערב שבת'`, `'שלום'`, `''` → `null`; two
  different dates `'מחר או בשבת'` → `null`; the same date twice `'מחר, יום שישי'` → `'2026-11-27'`.
- [auto] same file, around midnight in Jerusalem: `now = Date.parse('2026-11-26T21:59:00Z')` (Thursday 23:59):
  `'מחר'` → `'2026-11-27'`, `'היום'` → `'2026-11-26'`; `now = Date.parse('2026-11-26T22:01:00Z')` (Friday 00:01):
  `'מחר'` → `'2026-11-28'`, `'היום'` → `'2026-11-27'`, `'שישי'` → `'2026-12-04'`, `'שבת'` → `'2026-11-28'`; summer
  time `now = Date.parse('2026-06-30T21:30:00Z')` (Wednesday 00:30): `'מחר'` → `'2026-07-02'`, `'היום'` →
  `'2026-07-01'`.
- [auto] same file, wraps: `now = Date.parse('2026-11-28T10:00:00Z')` (Saturday): `'מחר'` and `'ביום ראשון'` →
  `'2026-11-29'`, `'שבת'` → `'2026-12-05'`, `'בשישי'` → `'2026-12-04'`; `now = Date.parse('2026-12-31T10:00:00Z')`:
  `'מחר'` and `'1/1'` → `'2027-01-01'`, `'31/12'` → `'2026-12-31'`.
- [auto] same file, `clockTimeOf`: `'8:00'` → `'08:00'`; `'20:00'` → `'20:00'`; `'20:00:00'` → `'20:00'`; `'20.30'` →
  `'20:30'`; `' 9:05 '` → `'09:05'`; `'24:00'`, `'20:60'`, `'8'`, `'8 בערב'`, `''` → `null`.
- [auto] `server/test/frontdesk-when.test.js`, `fillWhen` with `NOW = Date.parse('2030-01-07T10:00:00+02:00')` (a
  Monday): a `book` answer with `collected.table = { time: '20:00', partySize: 4 }` and one guest message
  `'אפשר שולחן לארבעה מחר ב-20:00?'` at `NOW` → `answer.collected.table.date === '2030-01-08'`, `dateFrom: 'guest'`,
  time and party unchanged, the input answer not mutated; the same with `date: '2030-01-10'` → the very same answer
  object, `dateFrom: null`; with `date: 'מחר'` and the guest message `'בשבת'` → `'2030-01-08'`, `dateFrom: 'model'`;
  with `date: 'someday'` and the guest message `'בשבת'` → `'2030-01-12'`, `dateFrom: 'guest'`.
- [auto] same file, which messages are read: `[guest 'מחר' at NOW-60000, an outbound message at NOW-50000, guest
  'לארבעה' at NOW]` → no date, `dateFrom: null`; `[outbound, guest 'שולחן לארבעה', guest 'מחר בערב']` →
  `'2030-01-08'`; `[guest 'מחר' at NOW - 31 * 60000, guest 'שולחן' at NOW]` → no date; a guest message of
  `kind: 'button'` with text `'מחר'` → no date; `'מחר או בשבת'` → no date.
- [auto] same file, the other intents: `change` with `collected.table = { time: '21:00' }` and the guest message
  `'יש לי הזמנה למחר, תזיזו ל-9'` → no date added; `change` with `date: 'tomorrow'` → `'2030-01-08'`,
  `dateFrom: 'model'`; `cancel`, `question`, `smalltalk` and `other` with the guest message `'מחר'` → the same answer
  object; `request` of kind `table` (enabled, with a `date` question) with `collected = { time: '19:00', party_size: '4' }`
  and the guest message `'מחר'` → `collected.date === '2030-01-08'`, `dateFrom: 'guest'`; a `request` whose kind has no
  `date` question → no date added; a `request` with `collected.date: 'tomorrow'` → `'2030-01-08'`, `dateFrom: 'model'`.
- [auto] same file, times: `book` with `table.time: '8:00'` → `'08:00'`, `timeFixed: true`; `'8 בערב'` → unchanged,
  `timeFixed: false`; `request` with `collected.time: '9:30'` → `'09:30'`, `timeFixed: true`.
- [auto] `server/test/frontdesk-tables.test.js`, new block "plan 751: date words": with table service,
  `say(conversation, BOOK({ time: '20:00', partySize: 4 }), { text: 'אפשר שולחן לארבעה מחר ב-20:00?' })` → the last
  outbound message is the button message `fixedText('fd_ai_offer', { date: '08/01', time: '20:00', party: 4 })` with
  buttons `['OK:1', 'OTHER']`, and one log line `frontdesk.turn.when_filled` with `{ intent: 'book', dateFrom: 'guest',
  timeFixed: false }`; `BOOK({ date: 'מחר', time: '20:00', partySize: 4 })` with the default guest text → the same
  offer, `dateFrom: 'model'`.
- [auto] same block, no stale word: a first turn with the guest text `'נדבר מחר'` and the model answer
  `{ reply: 'שלום', intent: 'smalltalk' }` (the reply is sent), then `say(conversation, BOOK({ time: '20:00',
  partySize: 4 }))` → the last outbound text is `fixedText('fd_ai_ask_date')` and `pending.data` equals
  `{ time: '20:00', partySize: 4 }`.
- [auto] same block, without tables: `setup({ tables: false })`, `say(conversation, BOOK({ time: '20:00', partySize: 4 },
  { reply: 'MODEL-REPLY' }), { text: 'שולחן לארבעה מחר ב-20:00' })` → one request with
  `wanted: { date: '2030-01-08', time: '20:00', partySize: 4 }` and the last outbound text `fixedText('fd_ai_will_confirm')`.
- [auto] same block: the captured log text of these cases contains neither `'מחר'` nor `'GUEST-SECRET-TEXT'`.
- [auto] `server/test/frontdesk-turn.test.js`: the case at `:159-164` becomes two — "a date word of the model is
  resolved": `collected.date: 'tomorrow'`, `turn(conversation, { now: Date.parse('2030-01-07T10:00:00+02:00') })` → one
  request with `wanted.date === '2030-01-08'`; "a date that cannot be resolved is dropped and counts as missing":
  `collected.date: 'someday'` → no request.
- [auto] `server/test/frontdesk-guardrails.test.js`, block "table replies (plan 680)" with
  `FACT_TEXT = '[f1] שעות: 12:00–23:00\n[f2] שולחן קבוע ללא שעה'`: `'אנחנו פתוחים 12:00–23:00'` with `usedFacts: []`
  → `ok: true`; the same with `usedFacts: ['[f1]']` → `ok: true`; `'פתוחים מ-12:00 עד 23:00'` → `ok: true`;
  `'נתראה ב-20:00'` with and without `usedFacts: ['f1']` → `unsupported_time`; `'נתראה ב-2:00'` with
  `usedFacts: ['f1']` → `unsupported_time`.
- [auto] same block: facts `'[profile.hours] opening hours: כל יום 9:00–23:00'` and the reply `'פתוחים 09:00–23:00'` →
  `ok: true`; facts with `09:00` and the reply `'פתוחים מ-9:00'` → `ok: true`; a profile with
  `hours: [{ days: 'א-ה', time: 'בערב', open: '18:00', close: '23:00' }]`, facts
  `'[profile.hours] opening hours: א-ה בערב'` and the reply `'פתוחים 18:00–23:00'` → `ok: true`.
- [auto] same block: `applyGuardrails(answer('יש מקום ב-20:00 וגם ב-12:00', { usedFacts: ['f1', 'nope'] }), ctx(tables()))`
  equals `{ ok: false, reason: 'unsupported_time', detail: { times: 2, unmatched: 1, usedFacts: 1, unknownFacts: 1 } }`;
  the existing case "the two checks are off when tables are off" still passes.
- [auto] `server/test/frontdesk-tables.test.js`, new block "plan 751: a time from the facts": with table service (the
  fixture's hours line is `א-ש 12:00-23:00`), the guest text `'מתי אתם פתוחים?'` and the model answer
  `{ reply: 'אנחנו פתוחים כל יום 12:00–23:00', intent: 'question', usedFacts: [] }` → one outbound message with exactly
  that text, `author: 'ai'`, the conversation still `bot`, no `frontdesk.turn.blocked` line.
- [auto] same block: the model answer `{ reply: 'יש לנו מקום ב-21:15', intent: 'question' }` → the handoff sentence is
  sent, status `human`, and the one `frontdesk.turn.blocked` line matches `{ reason: 'unsupported_time', stage: 'post',
  level: 1, times: 1, unmatched: 1, usedFacts: 0, unknownFacts: 0 }`; the captured log text does not contain `'21:15'`.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0.
- [auto] `pnpm run build` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`) of a restaurant with table booking by chat,
  the test guest writes "אפשר שולחן לארבעה מחר ב-20:00?" · the answer is "יש מקום ב-<tomorrow's day/month> בשעה
  20:00 ל-4 אנשים. לאשר?" with the two buttons, and never "לאיזה תאריך תרצו להזמין?". Repeat it three times in three
  new chats.
- [human] Same page, a new chat: the test guest writes "מתי אתם פתוחים?" · the assistant answers with the opening
  hours of the business, and the chat is not handed to the staff (the assistant answers the next message too).

## Execution Mode
- Parallel: no with any plan that touches `server/services/frontdesk-turn.js`, `server/services/frontdesk-guardrails.js`
  or their tests. Plans 752–756 (the agent console) build on the same files and run after this plan; nothing here
  depends on them.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/front-desk/date-words.ts
server/services/frontdesk-when.js
server/services/frontdesk-turn.js
server/services/frontdesk-guardrails.js
server/test/date-words.test.js
server/test/frontdesk-when.test.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-tables.test.js
server/test/frontdesk-guardrails.test.js
docs/frontdesk/assistant-behaviour-rules.md
docs/restaurant/restaurant-map.md
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
server/test/frontdesk-eval.test.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. The likely case is a dialogue of the assistant's test set
(`server/eval/frontdesk/dialogues/*.json`) whose scripted answer has no date while its guest line holds a date word,
so the scripted run now takes another path (none was found on the Snapshot: every scripted `book` and `request` turn
with a date word carries an ISO date, and the `change` / `cancel` turns are not filled from the guest's words): offer
`approved: <that dialogue file>` with the one-line change. `server/services/frontdesk-tables.js`,
`server/services/frontdesk-prompt.js`, `server/services/knowledge.js` and everything under `server/generated/` are
never offered: the plan needs no change there (`server/generated` is built, and ignored by git, `.gitignore:148`).

## Architecture Impact

- INV-7: preserves — `server/services/frontdesk-turn.js` still lets only `handleTableIntent` and the engine decide a table: the new step only fills the date (and the form of the time) of what the guest asked for before `cleanTable` validates it, and the offer still comes from `assign` and names its date; the model's reply stays dropped for `book`, `change` and `cancel`; a time in a reply that is sent must still stand in the business's public facts (now any fact line or the hours row, compared as `HH:mm`), so a time the facts do not hold is blocked as before, and the table-number check is unchanged.
- INV-2: preserves — `server/services/frontdesk-when.js` and the guardrails are pure (no database); they read only the messages and the profile `runTurnInner` already loaded with `businessId`; no new query and no write.
- INV-4: preserves — `shared/schemas/front-desk/date-words.ts` is a pure helper beside `local-time.ts`; no entity shape and no validation of a write changes.

## Reuse Check

- `dateFromWords(text, now)` and `clockTimeOf(value)` in `shared/schemas/front-desk/date-words.ts` — family: none — rung: 4 — why: no piece turns words into a date; it is built on `jerusalemDateTime` and `weekdayOf` of `local-time.ts` (used as is) and sits beside them so the server and, later, the browser read one rule.
- `fillWhen(answer, ctx)` and `currentGuestText(history, now)` in `server/services/frontdesk-when.js` — family: assistant-turn — rung: 3 — why: one more pure step of the turn between the model's answer and the rules, called once from `runTurnInner`; no second turn path.
- The time check of `applyGuardrails` — family: assistant-guardrails — rung: 3 — why: the existing `unsupported_time` block is changed in its one place, `frontdesk-guardrails.js`; no second place for a block.

## Adopt Check

- Turning Hebrew and English date words into a date — verdict: skip — why: domain logic with this product's own rules (which words count, Asia/Jerusalem, never guess between two dates); about 80 lines on helpers the repo has.

## Defaults

- unsaved-changes-on-leave — exception — why: no form and no page; server code, tests and docs only
- empty-state-on-list — exception — why: no list on a page changes; the word names word tables and log fields
- app-list-container — exception — why: no list page in this plan
- unit-dropdown-add — exception — why: no unit field; the word only names unit test files

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a guest, I want to write "מחר ב-20:00" and get an offer for tomorrow, so that I am not asked for a date I already gave.
- As a restaurant owner, I want the assistant to answer "מתי אתם פתוחים?" from my opening hours by itself, so that my staff are not called for a question the facts answer.
- As a restaurant owner, I still want the assistant stopped when it names a time my facts do not hold, so that no guest is promised a table time.
- As the person who looks after the assistant, I want a blocked answer to leave numbers in the log, so that the next wrong block can be understood without reading a guest's words.

## Functional Requirements

### Must Have (P0)

**Date words — `shared/schemas/front-desk/date-words.ts` (new)**
- [ ] `export function dateFromWords(text: string, now: number): string | null` — pure. Imports `jerusalemDateTime`
  and `weekdayOf` from `./local-time` (`shared/schemas/front-desk/local-time.ts:35-44`). `today` is
  `jerusalemDateTime(now).date`; "today + n" is `new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)` (the
  way `todayBlock` computes tomorrow, `server/services/frontdesk-prompt.js:47`). Never `new Date()` without an
  argument, never the server's own time zone.
- [ ] Steps, in this order, on `String(text ?? '').slice(0, 2000).toLowerCase()` with Hebrew vowel points removed
  (`/[֑-ׇ]/g`); every date found goes into one set:
  1. ISO: each `(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)` that is a real calendar date is added as it is; the match is
     replaced by a space.
  2. Day and month: each `(?<![\d./:])(\d{1,2})[./](\d{1,2})(?:[./](\d{4}|\d{2}))?(?![\d:])` with day 1–31 and month
     1–12 (anything else is skipped: `20.00`, `8.30`). With a year (two digits mean `2000 + yy`): added when it is a
     real calendar date and not before `today`, else skipped. Without a year: this year when that is a real date and
     not before `today`, else next year when that is a real date, else skipped. The match is replaced by a space.
  3. Words: every run of characters that are not a letter or a digit (`/[^\p{L}\p{N}]+/gu`) becomes one space; split
     into tokens; walk them once.
     - `היום`, `הערב`, `הלילה` → today; `מחר` → today + 1; `מחרתיים` → today + 2. Each also with one prefix letter of
       `ו ל ב ש מ` (`למחר`, `ומחר`, `להערב`, `מהיום`).
     - `today`, `tonight` → today; `tomorrow` → today + 1, but today + 2 when the two tokens before it are `day`
       `after`.
     - Weekday names: `ראשון` 0, `שני` 1, `שלישי` 2, `רביעי` 3, `חמישי` 4, `שישי` and `ששי` 5, `שבת` 6;
       `sunday` … `saturday` 0–6. A weekday resolves to the next such day strictly after today:
       today + `(((dow - weekdayOf(today)) + 7) % 7 || 7)`.
     - An English weekday name counts wherever it stands. A Hebrew one counts only in these forms:
       (A) after `יום`, `ביום`, `ליום`, `ויום` or `מיום` — all seven names;
       (B) followed by `הקרוב`, `הקרובה`, `הבא`, `הבאה`, `הזה`, `הזאת` or `הזו`, the name bare or with a prefix `ב`,
       `ל` or `ו` — all seven names;
       (C) with the prefix `ב` (`בשישי`, `בשבת`, `בראשון`) — every name except `שני`;
       (D) bare or with the prefix `ל`: `שלישי`, `רביעי`, `חמישי`, `שישי`, `ששי`; bare `שבת` and `השבת`.
       Never: bare `ראשון`, bare `שני`, `לשני` ("for two"), `לשבת` ("to sit") — outside forms A and B; and a `שבת`
       whose token before it is `ערב` or `בערב` (Friday evening) is not counted.
  4. Exactly one date in the set → it; none, or two different ones → `null`.
- [ ] `export function clockTimeOf(value: string): string | null` — pure: `^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*$`
  with hour 0–23 and minute 0–59 → `HH:mm` with a leading zero; anything else → `null`.
- [ ] The file's doc comment: "Plan 751 (R-24): a guest's date words as a date, in Asia/Jerusalem. A fallback for
  when the model left the date out — it never guesses between two dates." No import from `src/` or `server/`; it is
  compiled by `pnpm run build:schemas` (`package.json:24`) to `server/generated/schemas/front-desk/date-words.js`,
  which is never committed.

**The fill step — `server/services/frontdesk-when.js` (new)**
- [ ] `'use strict'`, CommonJS, no database, no logger. Requires `dateFromWords` and `clockTimeOf` from
  `../generated/schemas/front-desk/date-words`. Exports `{ fillWhen, currentGuestText, CURRENT_WINDOW_MS }` with
  `CURRENT_WINDOW_MS = 30 * 60000`.
- [ ] `currentGuestText(history, now)` — `history` is oldest first (what `runTurnInner` builds at
  `server/services/frontdesk-turn.js:216-218`). It takes the messages after the last one with `direction === 'out'`
  (all of them when there is none), keeps those with `direction === 'in'`, `author === 'guest'`, `kind !== 'button'`,
  a non-empty `text` and `now - at <= CURRENT_WINDOW_MS`, and returns their texts joined by `'\n'` (`''` when none).
  These are the guest messages this turn answers (R-03, `server/services/inbound.js:91-97`); nothing older is read.
- [ ] `fillWhen(answer, { history, now, profile })` → `{ answer, dateFrom, timeFixed }`, `dateFrom` one of `'model'`,
  `'guest'`, `null`. The input is never mutated; when nothing changes the same `answer` object is returned.
  - A date is "valid" when it matches `^\d{4}-\d{2}-\d{2}$` and is a real calendar date (the test of
    `server/services/frontdesk-tables.js:45`). A valid date is never replaced.
  - `intent: 'book'`: the date is `collected.table.date` (the `table` object may be missing). Not valid →
    `dateFromWords(String(date ?? ''), now)` (source `'model'`), else `dateFromWords(currentGuestText(history, now), now)`
    (source `'guest'`); a result is written to `collected.table.date` (the `table` object is created when missing).
    `collected.table.time` that is a string and not strict `HH:mm` (`^([01]\d|2[0-3]):[0-5]\d$`) is replaced by
    `clockTimeOf(time)` when that is not `null` (`timeFixed: true`).
  - `intent: 'change'`: the same, but only the model's own value is resolved; the guest's words are not read (in a
    change they usually name the existing booking: "יש לי הזמנה למחר, תזיזו ל-9").
  - `intent: 'request'`: the keys are `collected.date` and `collected.time`. A present, not valid `collected.date` is
    resolved from the model's own value. The guest's words are read only when `answer.kind` names an enabled kind of
    `profile.requestKinds` that has a question with `key === 'date'`. `collected.time` is fixed with `clockTimeOf` as
    above.
  - `cancel`, `question`, `smalltalk`, `other`: returned unchanged.
- [ ] Doc comment: "Plan 751 (R-24): the server fills the date the model left out, from the model's own value or the
  guest's current message(s). Pure. A valid date of the model always wins."

**The turn — `server/services/frontdesk-turn.js`**
- [ ] Right after the failed-call branch (`:243-251`) and before `:253`:
  `const when = fillWhen(asked.answer, { history, now, profile })`; when `when.dateFrom || when.timeFixed`, one info
  line `frontdesk.turn.when_filled { conversationId, intent, dateFrom, timeFixed }` (ids, enums and booleans only —
  never the date word or the text). Line `:253` then builds `modelAnswer` from `when.answer` instead of
  `asked.answer`. Nothing else in the file reads the collected data from `asked.answer` (`:274`, `:277` and `:284`
  read `intent`, `reply` and `suggested` only and stay as they are).
- [ ] It runs in both modes (`turn` and `suggest`) and at every level: a level-0 draft and a member's suggestion get
  the same offer text as a sent answer.
- [ ] `blockTurn` (`:138-143`) takes an optional `detail` and spreads it into its log line:
  `{ event: 'frontdesk.turn.blocked', reason, stage, level, ...(detail ?? {}) }`. The two post-model calls pass it:
  `:265` → `{ reason: verdict.reason, stage: 'post', detail: verdict.detail }`, `:292` →
  `{ reason: again.reason, stage: 'post', detail: again.detail }`. The pre-model call (`:228`) is unchanged.
- [ ] The file's doc comment gains: "Plan 751 (R-24): a date the model left out is filled by `fillWhen` before the
  rules run."

**The time check — `server/services/frontdesk-guardrails.js`**
- [ ] `TIME_IN_TEXT_RE` (`:22`) becomes `/(?<!\d)(\d{1,2}):(\d{2})(?!\d)/g`; a helper `timesOf(text)` returns every
  match as `HH:mm` with the hour padded to two digits.
- [ ] `timeBlocked` (`:76-81`) is replaced by `timeCheck(reply, ctx)` → `{ times, unmatched }` (two numbers). The
  allowed set is `timesOf(ctx.factsText)` of the whole facts text plus, for each row of `ctx.profile.hours` (when it
  is an array), `timesOf(String(row.open ?? ''))` and `timesOf(String(row.close ?? ''))`. `times` is the number of
  times in the reply, `unmatched` the number of them not in the set. The comparison is equality of the padded form,
  not a substring.
- [ ] `applyGuardrails` (`:105-106`): with `ctx.tablesOn`, when `unmatched > 0` it returns
  `{ ok: false, reason: 'unsupported_time', detail: { times, unmatched, usedFacts: usedFacts.length, unknownFacts: (answer.usedFacts ?? []).length - usedFacts.length } }`.
  No other block gains a `detail`; the order of the checks, `table_number`, the price check (still by used fact) and
  everything in `preCheck` are unchanged.
- [ ] The comment above the function: "Plans 680 + 751 (R-25): a time in the reply passes when the same time, as
  HH:mm, stands in any fact line sent to the model or in the open / close of the profile's hours."

**Rules and maps**
- [ ] `docs/frontdesk/assistant-behaviour-rules.md`: R-09's row (`:23`) keeps its text and adds "Superseded in part by
  R-24 (plan 751): the server no longer relies on the model for this." Two new rows after R-23:
  **R-24** "Date words are resolved by the server. When a `book`, `change` or `request` answer has no valid
  `YYYY-MM-DD` date, the server resolves the model's own value, and for `book` and `request` else the guest's current
  message(s) — the ones since the last outbound message, at most 30 minutes old — for היום, הערב, הלילה, מחר,
  מחרתיים, a weekday name or a day/month date, in `Asia/Jerusalem`. A weekday means the next such day after today.
  Two different dates resolve to nothing. A valid date of the model always wins." (plan 751) ·
  **R-25** "A time in a reply must stand in the facts. With table service on, every `H:mm` of a reply that is sent
  must equal, as `HH:mm`, a time in any fact line sent to the model or the open / close of the profile's hours; else
  the reply is blocked (`unsupported_time`) and a person answers. The model's `usedFacts` list no longer decides
  this." (680, 751).
- [ ] `docs/restaurant/restaurant-map.md`, "Contract extensions (run)" (after the 733 line, `:789`): one line
  `751 · C-AI / C-AI2 · (1) a date the model left out is filled by the server before the engine and the request path
  (R-24, fillWhen); (2) plan 680's point 1 is superseded: a time in a sent reply passes when it stands, as HH:mm, in
  any fact line or in the hours row's open / close (R-25); frontdesk.turn.blocked carries the counts times,
  unmatched, usedFacts, unknownFacts for unsupported_time · the Human's simulator tests of 2026-11-25/26`.
- [ ] `server/breadcrumbs.md`: a new row `services/frontdesk-when.js` — "`fillWhen`, `currentGuestText` (plan 751,
  R-24): fills the date the model left out from its own value or the guest's current message(s); pure"; a new row
  `shared/schemas/front-desk/date-words.ts` — "`dateFromWords`, `clockTimeOf` (plan 751): date words and clock times
  as `YYYY-MM-DD` / `HH:mm` in Asia/Jerusalem"; the `services/frontdesk-turn.js` row (`:42`) adds "plan 751: `fillWhen`
  before the rules; `frontdesk.turn.blocked` carries the time counts"; the `services/frontdesk-guardrails.js` row
  (`:45`) adds "plan 751: a time passes when it stands in any fact line (R-25)".
- [ ] `docs/brain/component-families.md`: a new family `### date-words — dateFromWords(text, now), clockTimeOf(value)
  in shared/schemas/front-desk/date-words.ts, fillWhen in server/services/frontdesk-when.js (plan 751)` with
  Status `stable — server only`, Use (what each does, one line), Pieces `dateFromWords, clockTimeOf, fillWhen,
  currentGuestText`, When "any code that needs a date or a clock time out of a person's words — call it, never a
  second word table", Known copies `none`; the `assistant-guardrails` family's Use line adds "plan 751: a time in a
  reply is checked against every fact line (R-25)". Then `node scripts/inventory.mjs` and commit
  `docs/brain/inventory.md` only if it changed.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No page changes. What the guest sees: after "אפשר שולחן לארבעה מחר ב-20:00?" the existing offer sentence
  "יש מקום ב-{date} בשעה {time} ל-{party} אנשים. לאשר?" with tomorrow's day/month, instead of "לאיזה תאריך תרצו
  להזמין?"; after "מתי אתם פתוחים?" the assistant's own answer with the hours, instead of the handoff sentence.
- No new dictionary key: every sentence used is an existing one.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Turn a guest's date words into a real date with one tested helper, because the model often leaves the date out — dateFromWords and clockTimeOf with the word table of the requirements, and every listed case of the new test file — shared/schemas/front-desk/date-words.ts, server/test/date-words.test.js
- [ ] A2: Fill the missing date before the table engine and the request path see the answer — fillWhen and currentGuestText, the call and the when_filled log line in the turn, the new unit test file, the two turn-test cases and the date-words block of the table tests — server/services/frontdesk-when.js, server/services/frontdesk-turn.js, server/test/frontdesk-when.test.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-tables.test.js
- [ ] A3: Let a time that stands in any of the business's facts through, so an opening-hours answer reaches the guest — timesOf and timeCheck, the padded comparison, the hours row's open and close, the detail on the block, the guardrail cases — server/services/frontdesk-guardrails.js, server/test/frontdesk-guardrails.test.js
- [ ] A4: Write the counts of a blocked time into the log so the next wrong block can be understood — blockTurn takes the detail, the two post-model calls pass it, the facts-time block of the table tests — server/services/frontdesk-turn.js, server/test/frontdesk-tables.test.js
- [ ] A5: Write down the two changed rules and where the new pieces live — R-09 note, R-24 and R-25, the map's Contract line, breadcrumbs, the family entry and the inventory — docs/frontdesk/assistant-behaviour-rules.md, docs/restaurant/restaurant-map.md, server/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A6: Run every check of this plan and hand Dandan the two simulator checks — test:server, both lints, build, inventory check, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: plan 679 (`gather`, `decide`, `bookAsRequest`), plan 680 (`cleanTable`, `bookStep`, the reply
  checks), plan 689 (`applyGuardrails`, `blockTurn`), plan 733 (`turnProfile` — `fillWhen` gets the wrapped `profile`,
  it reads only `requestKinds`), R-03 (the burst of guest messages one turn answers).
- New files needed: `shared/schemas/front-desk/date-words.ts`, `server/services/frontdesk-when.js`,
  `server/test/date-words.test.js`, `server/test/frontdesk-when.test.js` (all new).
- Model changes: none. `turnAnswerSchema` is unchanged (`collected.table.date` is already a free string of up to 40
  characters, `shared/schemas/front-desk/turn-answer.schema.ts:17`).
- Backend / API: no route or response changes. New log event `frontdesk.turn.when_filled`; four optional numbers on
  `frontdesk.turn.blocked`.
- Auth and validation: unchanged. The filled date still passes `cleanTable` / `gather`, the engine's own rules
  (closed day, lead time) and, for a request, `runQualify`.
- Security surface: none new. The helper reads guest text that the turn already holds; nothing of it is logged or
  stored, only the resulting date.
- Data / migration: none.
- Generated code: `server/generated/` is the `tsc` output of `shared/schemas/` (`shared/schemas/tsconfig.cjs.json`,
  `outDir`), ignored by git (`.gitignore:148`) and rebuilt by `pnpm run test:server` (`package.json:16`) and by the
  server's `pretest` (`server/package.json:15`). Commit the `.ts` source only. The server tests require the built file
  (`../generated/schemas/front-desk/date-words`), as `server/test/qualify.test.js` does for `local-time`.
- Why the wider time rule is safe: (1) for `book`, `change` and `cancel` with table service the model's reply is never
  sent (`frontdesk-turn.js:261`, `:281-304`), so the check does not run there at all; (2) where it runs (a question,
  small talk, a request that still misses a detail), a time now passes only when the business's own public facts hold
  it, so "יש מקום ב-21:15" is blocked unless 21:15 is itself a fact time; (3) the old extra condition was the model's
  own `usedFacts` list, which a model that invents can fill in as well, so it stopped honest answers more than
  dishonest ones; (4) the comparison is now exact, which closes a hole (`2:00` passing on `12:00`). What stays
  possible: a model that answers a table question as `intent: 'question'`, against its rules, with a time that happens
  to be a fact time (for example the closing time) — the prompt forbids it (`frontdesk-prompt.js:38`) and no table is
  written by a reply.
- Why a wrong fill is cheap: the offer sentence always names the date before anything is booked, and a request goes
  to a person; a missed fill is today's behaviour (the guest is asked for the date).
- Project checks: the `log-query` Done-when item; logs carry ids, enums, booleans and numbers only; no new entity
  shape, no dictionary key, no page; `server/breadcrumbs.md`, the families registry and the inventory are in scope.
- Traps: the look-behind and `\p{L}` patterns need the `u` flag where written and the ES2022 target the schemas
  already compile to; `'ב-20:00'` must not be read as a date (only `.` and `/` separate a day from a month); the
  token walk must test form A before form D so `יום שני` counts while a bare `שני` does not; `fillWhen` runs before
  `bookAsRequest`, so a `book` answer of a business without tables is filled in its `table` shape; in the table tests
  the guest message and the turn share `now`, in the turn tests the message is stored at the real clock while `now`
  is fixed in 2030 — `now - at` is then negative and the message counts, which is intended; never assert a fetch
  count of 1 on a retried answer (plan 731).

## Out of Scope
- Times in words ("8 בערב", "בשמונה וחצי"): turning them into `HH:mm` needs morning / evening rules and no test
  showed the drop; only the form of a clock time the model itself gave is fixed (`8:00` → `08:00`).
- Reading a clock time out of the guest's words when the model left the time out: no test showed it.
- More date phrases: "בעוד שבוע", "שבוע הבא", "סופ״ש", "יום ו׳", "לשבת" (reads as "to sit"), month names.
- Filling a `change` from the guest's words, and anything for `cancel`.
- Changing the prompt (`frontdesk-prompt.js`): it keeps asking the model to resolve the words; the server step is
  the safety net.
- A new dialogue in the assistant's test set: the set is fixed at 30 files (`server/scripts/ai-eval-frontdesk.js:30`,
  `server/test/frontdesk-eval.test.js`), its scripted answers always carry the date, and dialogue 01 already plays
  "מחר ב-8 בערב" against the real model in a live run.
- The price check: it still needs the used fact. The new `unknownFacts` number will show whether models write ids in
  another spelling; accepting such ids is a later plan if the number says so.
- Letting the current time of the TODAY block through the time check, and logging the model's reply or the guest's
  text for diagnosis (the agent console of plans 752–756 covers recording).

## Critical Questions
- none

## Execution Notes
- behaviour: a weekday name means the next such day strictly after today; today's own weekday name means a week from today, because a guest who means today writes היום or הערב, which are resolved on their own.
- behaviour: a valid `YYYY-MM-DD` date of the model is never replaced, also when the guest's words say something else.
- behaviour: the model's own not-valid value ("מחר", "tomorrow", "26/11") is tried first, the guest's words second.
- behaviour: the guest's words are the guest messages since the last outbound message, at most 30 minutes old, without button taps; nothing older is read.
- behaviour: two different dates in the words resolve to nothing, and the guest is asked for the date as today.
- behaviour: a day/month date is included; without a year it is the next such date that is not in the past, and a full date in the past is ignored.
- behaviour: for `change` only the model's own value is resolved, because the guest's words there usually name the existing booking; `cancel` is untouched.
- behaviour: for a `request` the guest's words are read only when the kind has a `date` question.
- behaviour: `לשבת`, a bare `שני` and a bare `ראשון` are never read as a day; `ערב שבת` is not read as Saturday.
- behaviour: the fill also runs for a level-0 draft and a member's suggestion.
- behaviour: a time in a sent reply passes when it stands in any fact line or in the hours row's open / close, compared as `HH:mm`; the model's `usedFacts` list no longer decides it. This supersedes point 1 of plan 680's Contract line by a new rule row (R-25) and a Contract line, as plan 733 did for R-04; the rule is not an invariant or an ADR.
- behaviour: the blocked-time log line gains four numbers (`times`, `unmatched`, `usedFacts`, `unknownFacts`) and nothing else.
- review (Planner, 2026-11-26): INV-7 is read as preserved — a time in a sent reply must still stand in the business's own public facts; only "a fact the answer listed" became "any fact line that was sent", and plan 680 allowed fact times under the same reading. Told to the Human when the plan was saved.
- review (Planner, 2026-11-26): `scope-check --reuse` run on `main` reports the families `assistant-turn` and `assistant-guardrails` as unknown; they are headings of the staging registry (the base branch), where the gate passes. `scope-check --tests` warns about `server/test/frontdesk-eval.test.js`; that test stays unchanged on purpose (Out of Scope).
