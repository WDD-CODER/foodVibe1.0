# Plan 681 — The assistant's eval set: 30 Hebrew dialogues with a runner, and its suggestion on the request card

Status: draft
Depends-on: 680
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After plans 679 and 680 the assistant answers guests and books, changes and cancels a table by chat. Nothing yet
says how good it is: a change of the prompt or of the model chain can break the booking dialogue without one test
failing, because every server test fakes the model's answer for one turn. And when the business confirms tables by
hand (confirm mode `manual`), the owner gets a request with no hint of what the assistant thinks should happen
with it, so the record that is meant to justify automation later (`decisionLog`) has an empty `suggestion` column.

This plan adds (1) a fixed set of 30 Hebrew dialogues, stored as data files, and one runner that plays each of them
through the real conversation pipeline on the simulator channel and scores what the server did — with a scripted
model in the test suite, and with the real model chain when Dandan runs it by hand; (2) the assistant's suggestion
(`approve` / `decline` / `ask` with one line why) on every request the assistant creates, shown on the request
card, and carried into the decision row the requests router already writes.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/scripts/ai-eval-recipes.js` (295 lines) is the pattern of an opt-in live eval: a `CASES` list, a pure
  check per case, paced calls, exit codes 0 / 1 / 2 (no key) / 3 (daily quota), and `module.exports` of the pure
  parts (line 295) so a test can import them. It is never run in CI.
- `server/constants/ai-features.js` has the key `eval` (reserved for this work), `frontdesk_turn` and
  `frontdesk_suggest`. `callGemini` (`server/services/gemini-client.js`) throws under vitest for a call without a
  known `usage.feature`.
- Server tests fake the model by stubbing the global `fetch` (`server/test/knowledge-import.test.js:24–25`,
  `vi.stubGlobal('fetch', fetchMock)`).
- `shared/schemas/entities/request.schema.ts:85–87`: `suggested?: { action: 'approve' | 'decline' | 'ask', text?:
  string ≤ 600, at: number }` exists and is server-owned (in `REQUEST_SERVER_FIELDS`, line 19). Nothing writes it.
- `server/routes/requests.js:91–112` (`writeDecision`): the decision row already takes `suggestion` from
  `request.suggested.action` (line 101). `shared/schemas/entities/decision-log.schema.ts` has `suggestion` optional.
  A `test: true` request writes no decision row (`requests.js:214–223`, `:311`).
- `src/app/pages/requests/components/request-card/request-card.component.html` (166 lines): the verdict block is
  lines 40–50 (`data-testid="request-verdict"`); nothing shows `suggested`. `src/app/core/models/request.model.ts`
  re-exports `FrontDeskRequest` from the shared schema, so the field is already typed in the browser.
- `promptfoo` 0.126.0 (approved in D10) was checked and is **not used** (see "Why not promptfoo" below).
- Not on `main` yet, created by earlier plans of the program (use their names if they differ):
  `server/services/inbound.js` `handleInbound` and the simulator transport (675), `server/services/frontdesk-turn.js`
  `runTurn` and `server/services/frontdesk-prompt.js` (679), the `book | change | cancel` intents and the fixed
  sentences (680), `server/services/table-bookings.js` (668).

### Why not promptfoo (D10 fallback, reported)
Each dialogue has several turns and is judged by what the **server** did (a booking with a table, a request, a
handoff), not by a text the model returned. That needs the real pipeline with a database in the same process, which
is what the server's own test tools already do. `promptfoo` would only wrap that in a custom provider, and it
brings 74 direct dependencies (34 MB unpacked before its own tree, a local results database) and needs
Node ≥ 22.22 into a repository whose CI pins "22". The fallback of brief A2 is used: a script in the pattern of
`server/scripts/ai-eval-recipes.js`. No dependency is added.

## Goals & Success Criteria
**Primary:** one command plays the 30 dialogues against a scripted model in the test suite and against the real
chain by hand, and every request the assistant creates carries its suggestion to the card and the decision row.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/frontdesk-eval.test.js` and
  `server/test/frontdesk-suggested.test.js`.
- [auto] `server/test/frontdesk-eval.test.js`: the folder `server/eval/frontdesk/dialogues/` holds exactly 30 `.json`
  files; each passes `evalDialogueSchema`; 20 have the `businessType` `restaurant`, 5 `caterer` and 5
  `private_chef` (the template keys of `shared/schemas/front-desk-templates.ts` — use the real keys if they differ);
  at least 12 carry the tag `tables`, and the tags `book`, `full_evening`, `change`, `cancel`, `late_cutoff`,
  `over_limit`, `closed_day`, `question_mid_booking` each appear on at least one.
- [auto] `server/test/frontdesk-eval.test.js`: `runDialogue` plays every one of the 30 files with the scripted model
  (the file's own `script`) through `handleInbound` on the `sim` channel with an in-memory database and a fixed
  clock, and `scoreDialogue` returns `pass: true` for all 30; the stubbed `fetch` was called exactly once per guest
  turn that reaches the model and never for a button tap.
- [auto] `server/test/frontdesk-eval.test.js`: a dialogue whose `expected.serverAction` is `booking` leaves one
  booking with `tableKeys` and source `ai`; one with `request` leaves one `qualified` request and no booking; one
  with `handoff` leaves the conversation in status `human`; changing one expected field of a copied dialogue makes
  `scoreDialogue` return `pass: false` and name that field.
- [auto] `server/test/frontdesk-eval.test.js`: every row the eval run writes has `test: true`, and no row of a
  second, real business in the same database is read or changed.
- [auto] `server/test/frontdesk-suggested.test.js`: in confirm mode `manual`, a chat that ends with the guest's `OK`
  creates a request with `suggested.action: 'approve'`, a `text` of one line and at most 600 characters, and
  `suggested.at`; a model answer with `suggested.action: 'book'`, with a `text` of 700 characters, or with a line
  break in `text` stores the request with no `suggested` at all (action) or with the text cut to one line of 600
  characters (text); a request created by the public form or by a member has no `suggested`.
- [auto] `server/test/frontdesk-suggested.test.js`: approving a non-test request that carries `suggested.action:
  'approve'` writes a `decisionLog` row with `suggestion: 'approve'` and `decidedAction: 'approve'`; declining it
  writes `suggestion: 'approve'`, `decidedAction: 'decline'`.
- [auto] `node server/scripts/ai-eval-frontdesk.js --dry` → prints `30 dialogues ok` and exits 0 with no key set and
  no network (it only loads and validates the files).
- [auto] `pnpm run test:ci` → exit 0, including the request card spec: a request with `suggested` shows the line
  with `data-testid="request-suggested"`; one without shows none.
- [ui] `/requests` (the API answered by the spec with one open request that has `suggested: { action: 'approve',
  text: 'שולחן פנוי, קבוצה בגודל רגיל' }`) · open the page · the card shows "העוזר מציע: לאשר" —
  `e2e/ui/681-1.spec.ts`, screenshot `screens/681-1.png`.
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan runs `node server/scripts/ai-eval-frontdesk.js` once on the real model chain (it needs
  `GEMINI_API_KEY` in `server/.env`) and reads the printed score; 26 of 30 or more is the bar FD-07 set. The result
  is written into Execution Notes. This check is not part of any unattended run.

## Execution Mode
- Parallel: no — third plan of run `rs-ai` (679, 680, 681, 682, in that order). It edits the turn handler and the
  prompt that 679 and 680 own, and appends to `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/eval/frontdesk/**
server/scripts/ai-eval-frontdesk.js
server/services/frontdesk-turn.js
server/services/frontdesk-prompt.js
shared/schemas/front-desk/turn-answer.schema.ts
server/test/frontdesk-eval.test.js
server/test/frontdesk-suggested.test.js
server/test/frontdesk-turn.test.js
server/breadcrumbs.md
src/app/pages/requests/components/request-card/**
public/assets/data/dictionary.json
e2e/ui/681-1.spec.ts
screens/681-*.png
docs/restaurant/restaurant-map.md
docs/workflow-kit/manifest.json
server/services/frontdesk-tables.js
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

- INV-4: preserves — the one schema change is an optional field on `turnAnswerSchema` in `shared/schemas`; what is stored on the request is still checked against `requestSchema` by the server.
- INV-2: preserves — `server/services/frontdesk-turn.js` already takes the business from the conversation the inbound handler resolved; this plan adds one field to the request it writes and no query. The eval runner creates its own `test: true` business rows and scopes every read by that business id.
- INV-6: preserves — the eval and the suggestion add no model call path: the suggestion rides the one call a turn already makes through `server/services/gemini-client.js`, and the hand-run eval calls the same `runTurn`, metered with the feature key `eval`. No key reaches the browser.
- INV-7: preserves — the suggestion is advice to the owner on a request that waits for him; it confirms nothing. An approve still goes through the engine and the claim (plan 685). The eval only reads what the engine and the hold wrote.

## Reuse Check

- `runDialogue`, `scoreDialogue`, `loadDialogues` in `server/scripts/ai-eval-frontdesk.js` — family: none — rung: 4 — why: no runner plays a multi-turn conversation through the server; it follows the shape of `server/scripts/ai-eval-recipes.js` (pure parts exported for the test, the live run opt-in)
- the suggestion line on the request card — family: chip — rung: 1 — why: the existing `c-chip--tag` beside the verdict chip; no new class or component

## Defaults

- hints-in-tooltips — exception — why: the plan adds no dialog and no explained control; the suggestion's one-line reason is content of the card, not a hint about a control
- app-list-container — exception — why: the requests list and its container are unchanged; one line is added inside the existing card
- one-breakpoint-set — exception — why: the plan adds no @media rule
- anchored-popup — exception — why: the plan adds no floating box
- empty-state-on-list — exception — why: no list is added or changed
- loading-and-error-states — exception — why: no screen or data request is added; the card shows a field of a request the page already loads

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner of a restaurant who confirms tables himself, I want to see on each request what the assistant would
  do with it and why, so that I decide in one look and can later see how often it was right.
- As the product owner, I want one command that tells me whether the assistant still books, changes and cancels
  correctly after the prompt or the model changed, so that I do not find out from a pilot restaurant.

## Functional Requirements

### Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-AI (R17; used by R18, R19, R20)** — FD-07's contract as written in `docs/frontdesk/frontdesk-program-brief.md`
(the answer schema, levels, "the server writes, the model proposes"), with:
- `server/services/frontdesk-turn.js` → `runTurn(db, conversation, { log })` called by `handleInbound` and by the
  inbox's "suggest" button; one `callGemini` per turn with `usage.feature: 'frontdesk_turn'` (or
  `'frontdesk_suggest'`); level 0 stores `suggestion` on the conversation, level 1 sends through `sendOut`.
- The simulator is the test chat of R-15: a `test: true` conversation runs the real handler and is metered like
  any turn, but is left out of the business's daily turn cap.

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

### Must Have (P0)

**The dialogue files** — `server/eval/frontdesk/dialogues/NN-<slug>.json` (30 files, `01`…`30`)
- [ ] One dialogue is `{ id, title (English, one line), businessType, tags: string[], setup, turns, expected }`:
  - `setup`: `{ modules: string[], confirmMode?: 'auto' | 'manual', autoMaxParty?: number, level: 0 | 1, now:
    'YYYY-MM-DDTHH:mm' (Jerusalem wall time the run's clock is set to), facts?: [{ topic, question, answer }]
    (approved public knowledge items), floor?: 'room14' | 'none', bookings?: [{ date, time, partySize, tableNumbers?
    , ofGuest?: true }] (bookings that exist before the first turn; `ofGuest` makes it the eval guest's own) }`.
  - `turns`: `[{ guest?: string (Hebrew, what the guest writes), button?: string (a button id the guest taps, by its
    prefix and position: 'OK', 'OTHER', 'ALT:1', 'CONFIRM', 'CANCEL'), script?: object (the model answer the scripted
    run returns for this turn, in the answer schema of C-AI and C-AI2) }]` — a turn has `guest` or `button`, never
    both; a `guest` turn that should reach the model has a `script`.
  - `expected`: `{ intent: string (of the last model turn), collected?: object (keys that must equal),
    serverAction: 'none' | 'offer' | 'alternatives' | 'booking' | 'request' | 'changed' | 'cancelled' | 'handoff',
    handoff: boolean, booking?: { date, time, partySize }, lastOut?: { kind: 'text' | 'template' | 'button',
    template?: string, buttons?: number } }`.
- [ ] `evalDialogueSchema` (zod, strict) lives in `server/eval/frontdesk/dialogue-schema.js` and is what the test
  and the `--dry` run validate with.
- [ ] `server/eval/frontdesk/room14.js` exports the fixed room of the eval: 14 tables in three areas (inside,
  outside, bar) with two joins, and the table settings defaults — the same shape as plan 663's engine fixture (reuse
  that fixture file if it is exported from `shared/schemas/testing/**`; do not write a second room).
- [ ] The 30 dialogues: 20 restaurant (16 of them about tables), 5 caterer, 5 private chef; every tag of the
  list below is covered. Guest lines are natural Hebrew, with at least five that use
  spoken forms ("מחר ב-8 בערב", "לשישי הקרוב", "אנחנו 4", "תזיזו לי ל-9", "לבטל בבקשה"):

  | # | type | tags | what happens | serverAction |
  |---|---|---|---|---|
  | 01 | restaurant | tables, book | table for 4 tomorrow 20:00, free, guest taps OK, mode auto | booking |
  | 02 | restaurant | tables, book | same, mode manual | request |
  | 03 | restaurant | tables, book | guest gives the details over three messages | booking |
  | 04 | restaurant | tables, full_evening | 20:00 is full, three alternatives, guest taps the second | booking |
  | 05 | restaurant | tables, full_evening | the whole evening is full, no alternative on that day | alternatives |
  | 06 | restaurant | tables, change | one booking, moved from 20:00 to 21:00 inside the cutoff | changed |
  | 07 | restaurant | tables, cancel | one booking, cancelled inside the cutoff | cancelled |
  | 08 | restaurant | tables, cancel, late_cutoff | cancel one hour before, cutoff is three hours | handoff |
  | 09 | restaurant | tables, over_limit | party of 9, `autoMaxParty` 6, mode auto | request |
  | 10 | restaurant | tables, closed_day | asks for a closed date | none |
  | 11 | restaurant | tables, question_mid_booking | asks about parking in the middle, then finishes the booking | booking |
  | 12 | restaurant | tables, change | two bookings, guest picks which by button | changed |
  | 13 | restaurant | tables, book | party of 13, larger than any table or join | handoff |
  | 14 | restaurant | question | opening hours, answered from a fact | none |
  | 15 | restaurant | question | a price that is in no fact | handoff |
  | 16 | restaurant | handoff | a complaint keyword | handoff |
  | 17 | restaurant | tables, book | the guest taps "another time" after the offer | none |
  | 18 | restaurant | smalltalk | thanks and goodbye | none |
  | 19 | restaurant | tables, book | no floor plan drawn (`floor: 'none'`) | handoff |
  | 20 | restaurant | level0 | level 0: nothing is sent, a suggestion is stored | none |
  | 21–25 | caterer | request ×3, question, handoff | an event request collected over turns; a tasting; a budget under the minimum; a menu question from a fact; an allergy-emergency keyword | request ×3, none, handoff |
  | 26–30 | private_chef | request ×3, question, handoff | a dinner at home; a consultation; a date inside the lead time; a question with no fact; eight turns reached | request ×3, handoff, handoff |

  The set is 20 restaurant, 5 caterer, 5 private chef. This is a deliberate change from FD-07's "10 per business
  type": RS-11 asks for at least 12 table dialogues and only a restaurant has tables. It is logged as a
  `behaviour:` decision.
- [ ] Every dialogue is self-contained: it names its own clock, facts and existing bookings; none depends on
  another dialogue having run.

**The runner** — `server/scripts/ai-eval-frontdesk.js`
- [ ] `loadDialogues(dir?)` reads and validates the files, sorted by name. `runDialogue(db, dialogue, { model:
  'scripted' | 'live', now })` creates one `test: true` business with the dialogue's modules, a public profile of
  its type with the table settings, the room when `floor` is `room14`, the facts as approved public knowledge
  items, and the existing bookings through `server/services/table-bookings.js` (so they hold tables); then sends
  each turn through `handleInbound` with `channel: 'sim'`, a fixed test phone and the turn's clock (the inbound
  handler's coalescing delay is injected as zero, as plan 675's tests do); a `button` turn resolves the button id
  from the last outbound message's buttons. It returns `{ intents, collected, lastOut, bookings, requests,
  conversation }` read back from the database, never from the model's text.
- [ ] `scoreDialogue(dialogue, result)` → `{ pass, failed: string[] }` comparing: the last model turn's `intent`,
  each key of `expected.collected`, `serverAction` (derived from the rows: a new booking with `tableKeys` →
  `booking`; a new `qualified` request and no booking → `request`; an existing booking with a new time → `changed`;
  status `cancelled` → `cancelled`; conversation `human` → `handoff`; last outbound with `OK` buttons → `offer`;
  with `ALT` buttons → `alternatives`; else `none`), `handoff`, `expected.booking`, `expected.lastOut`.
- [ ] Scripted mode stubs the model exactly as the server tests do (the global `fetch` returns the turn's `script`
  as a model answer) and makes no network call. Live mode calls the real chain through `runTurn` with
  `usage.feature: 'eval'`, paced for the free tier as `ai-eval-recipes.js` does, and stops with exit 3 on the daily
  quota.
- [ ] Command line: `node server/scripts/ai-eval-frontdesk.js [--dry] [--only=1,4] [--model=<id>]`. `--dry`
  validates the files and prints `30 dialogues ok`. Without it the script needs `GEMINI_API_KEY` (exit 2 when it is
  missing), starts an in-memory database (`mongodb-memory-server`, already a dev dependency of `server/`), runs the
  dialogues in live mode, prints one line per dialogue (`ok` / `FAIL: <fields>`) and the score `N/30`, exits 0 at
  26 or more and 1 below. It never connects to the configured database and never writes outside the in-memory one.
- [ ] Logs and output carry dialogue ids, intents and field names only — never a guest line or a phone.

**The suggestion on a request the assistant creates**
- [ ] The answer schema of the turn (`turnAnswerSchema` in `shared/schemas/front-desk/turn-answer.schema.ts`, plan
  679, extended by 680) gains optional `suggested: { action: string ≤ 20, text?: string ≤ 2000 }` — loose on
  purpose, so a wrong action never fails the whole turn; the server's rule below decides what is stored. The prompt (`server/services/frontdesk-prompt.js`) gains two sentences, in
  English: when the request is complete, say what the business should do with it and why in one short line; never
  mention a table number or promise availability.
- [ ] `server/services/frontdesk-turn.js`: when a turn creates a request (C-AI2's `manual` or over-the-limit branch,
  and FD-07's completed request for the kinds that are not a table), the server writes `suggested` on it:
  `action` only when it is one of the three values (anything else: no `suggested` at all); `text` trimmed, line
  breaks and tabs replaced by one space, cut to 600 characters, dropped when empty; `at` the turn's clock. The
  model's suggestion changes nothing else: status, qualification and the answer to the guest are as before.
- [ ] A request created by the public form, by a member, or by an automatic confirmation (`confirmMode: 'auto'`)
  never gets `suggested`.

**The card**
- [ ] `request-card.component.html`, right under the verdict block: when `request().suggested` exists, one line
  with `data-testid="request-suggested"` — a `c-chip--tag c-chip--sm` reading `rq_suggested_approve` /
  `rq_suggested_decline` / `rq_suggested_ask`, and after it the `text` as plain text when there is one. Shown for
  every status (it is history after a decision). No button and no tooltip; the card's actions are unchanged.

### Should Have (P1)
- [ ] `server/breadcrumbs.md` gains one line for `server/eval/frontdesk/` and one for the script.
- [ ] One line under "Contract extensions (run)" in `docs/restaurant/restaurant-map.md`: the answer schema's
  `suggested`, the 20 / 5 / 5 split, and "promptfoo not used".

### Nice to Have (P2)
- none

## UI/UX Notes
- One new line on the request card; Hebrew RTL; no layout change at any breakpoint (the line wraps like the
  verdict reasons).
- New keys in `public/assets/data/dictionary.json`: `rq_suggested_approve` "העוזר מציע: לאשר",
  `rq_suggested_decline` "העוזר מציע: לדחות", `rq_suggested_ask` "העוזר מציע: לשאול את הלקוח".
- No icon is added.

## Atomic Sub-tasks

- [x] A1: Fix the shape of one test dialogue so thirty of them can be data, not code — the strict dialogue schema and the fixed fourteen-table room, reusing the engine fixture — server/eval/frontdesk/dialogue-schema.js, server/eval/frontdesk/room14.js
- [x] A2: Write the thirty Hebrew dialogues with what the server is expected to do in each — twenty restaurant, five caterer, five private chef, every tag covered, each with its scripted model answers — server/eval/frontdesk/dialogues/
- [x] A3: Build the runner that plays a dialogue through the real pipeline and scores the result — loadDialogues, runDialogue on the simulator channel with a test business, scoreDialogue from the stored rows, scripted and live modes, the command line with its exit codes — server/scripts/ai-eval-frontdesk.js
- [x] A4: Prove the runner and the set in the test suite with no key and no network — file counts and tags, all thirty passing on the scripted model, one call per model turn, test rows only — server/test/frontdesk-eval.test.js
- [x] A5: Let the assistant say what it would do with a request it created — the optional suggested field in the answer schema, the two prompt sentences, the server's cleaning and writing rule, the existing turn tests kept green — server/services/frontdesk-turn.js, server/services/frontdesk-prompt.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-suggested.test.js
- [x] A6: Show the suggestion on the request card and prove it reaches the decision record — the line under the verdict, three dictionary keys, the card spec, the decision-row test — src/app/pages/requests/components/request-card/request-card.component.html, src/app/pages/requests/components/request-card/request-card.component.spec.ts, public/assets/data/dictionary.json
- [x] A7: Check the card in the running app and record what changed — one screen check with the API answered by the spec, the folder map lines, the map's extension line — e2e/ui/681-1.spec.ts, server/breadcrumbs.md, docs/restaurant/restaurant-map.md
- [x] A8: Run every check of this plan and hand Dandan the live run — test:server, test:ci, build, both lints, log-query, the dry run; evidence into Execution Notes; then the one hand check

## Technical Considerations
- Dependencies: `handleInbound` and the simulator transport (675), `runTurn` and the prompt (679, 680),
  `table-bookings.js` (668), the engine fixture (663), `mongodb-memory-server` (already in `server/`).
- New files needed: `server/eval/frontdesk/dialogue-schema.js`, `room14.js`, 30 dialogue files,
  `server/scripts/ai-eval-frontdesk.js`, the two test files, `e2e/ui/681-1.spec.ts`.
- Model changes: no entity schema changes (`request.suggested` exists). `turnAnswerSchema` gains one optional
  object.
- Backend / API: no new route. Requests created by a chat carry `suggested`.
- Auth and validation: the model's `suggested` is validated and cleaned by the server before it is stored; it is
  shown as plain text, never as HTML.
- Security surface: guest text reaches the model only in the `user` part, as before. The eval files hold invented
  guests only; the live run needs the model key from `server/.env` and prints no part of it.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; three dictionary keys named above; no icon; `server/breadcrumbs.md`
  in scope; the `[ui]` spec signs in with `signInQa` and answers the requests API itself.

## Out of Scope
- Any change to how a request is approved, declined or asked about.
- An agreement-rate number on a screen or in the business report (brief Part 6, "conversation numbers on the
  dashboard").
- Running the live eval in CI or in an orchestrator run.
- `promptfoo` or any other eval dependency.
- "Suggest a reply" and "fix this answer" in the inbox (plan 682).

## Critical Questions
- none

## Execution Notes
- behaviour: the set is 20 restaurant / 5 caterer / 5 private chef dialogues, not 10 / 10 / 10 — RS-11 needs at least 12 table dialogues and only a restaurant has tables.
- behaviour: `promptfoo` is not used (D10 fallback): the dialogues are judged by what the server wrote, which needs the pipeline and a database in one process; a script in the pattern of `ai-eval-recipes.js` does that with no new dependency.
- behaviour: the suggestion comes from the model in the same call as the turn; an invalid action stores no suggestion (no fallback to the verdict).
- scope extended: server/services/frontdesk-tables.js — approved by the Human (ask 681-1): the table dialogue's `manual` / over-the-limit request is created on the `OK` tap with no model call, so the suggestion rides `pending.data.suggested` and `confirm()` writes it.
- behaviour: the business type key is `catering` (the template key), not `caterer` — the plan says to use the real key.
- behaviour: dialogue 19 (no floor plan) expects `request`, not `handoff`: plan 680 treats `no_plan` as plan 679's table request path, and the eval scores what the server does — reverse: make `no_plan` hand off in frontdesk-tables.js and flip the file's `serverAction`.
- behaviour: dialogue 28 (a date inside the private chef's 72-hour lead time) expects `none` (the rule sentence, no request): an unfit request is never written (R-10) — reverse: change the dialogue to a borderline case.
- behaviour: dialogue setup gains two optional fields beyond the plan's list, `closedDates` (dialogue 10) and `rules` (dialogue 23's minimum budget), and `expected` gains `suggestion: true` (dialogue 20, level 0) — reverse: drop them from dialogue-schema.js and those three files.
- behaviour: buttons in a dialogue are the real ids of plan 680 (`OK`, `OTHER`, `ALT:n`, `BK:n`); a pre-existing booking holds at most four tables (C-BOOK), so dialogue 05 fills the evening with four bookings.
- behaviour: the suggestion's `at` is the clock of the model turn that gave it (for a table request: the offer turn, not the OK tap) — reverse: set `at` in confirm().
- behaviour: the eval's turn clock is injected through `setTurnHandler` and the button `at`; `createRequest` keeps its own `Date.now()` (out of scope), so the dialogues use 2030 dates as the existing table tests do.
- evidence: `node server/scripts/ai-eval-frontdesk.js --dry` → exit 0, `30 dialogues ok`.
- evidence: `npx vitest run test/frontdesk-eval.test.js` → exit 0, 39 passed (30 dialogues scripted + 9).
- evidence: `npx vitest run test/frontdesk-suggested.test.js test/frontdesk-turn.test.js test/frontdesk-tables.test.js test/frontdesk-prompt.test.js` → exit 0, 73 passed.
- evidence: `pnpm run build` → exit 0; `pnpm run test:ci` → exit 0, TOTAL 3080 SUCCESS; `pnpm run test:server` → exit 0, 176 files, 2431 tests passed; `pnpm run lint`, `pnpm --dir server run lint`, `lint:icons`, `lint:no-native-select` → exit 0; kit-manifest, override, plan-ledger, breadcrumbs, scope-check → ok; log-query → exit 0 (`SKIP: no database configured`).
- stop (ask 681-2): `kit-checks.mjs` → `reuse-registry-missing-piece docs/brain/component-families.md:1` — the Reuse Check row of the runner (rung 4) needs a family heading in `docs/brain/component-families.md`, which is outside this plan's scope. Proposed addition (8 lines, the shape of the 679/680 entries): `### assistant-eval — loadDialogues, runDialogue, scoreDialogue (plan 681)` with `Status: stable — server only`, `Use:` the 30 dialogues in `server/eval/frontdesk/` played through `handleInbound` on `sim` and scored from the rows, and `Pieces: loadDialogues, runDialogue, scoreDialogue, evalDialogueSchema, room14For`.
- resumed (ask 681-2 answered `approved: docs/brain/component-families.md` by the Human): added the `assistant-eval` family entry; `node scripts/inventory.mjs` regenerated `docs/brain/inventory.md` (one generated line, needed by kit-checks `inventory-stale`).
- evidence (after the last code commit): `kit-checks.mjs --base origin/orch/rs-ai` → exit 0, `KIT_CHECKS: ok (6 checks)`; scope-check → `SCOPE: ok`; `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `pnpm --dir server run lint` → exit 0; `pnpm run test:ci` → exit 0, TOTAL 3080 SUCCESS; `pnpm run test:server` → exit 0, 176 files, 2431 passed; kit-manifest → ok, 0 unclassified; override, lint:icons, lint:no-native-select, plan-ledger, breadcrumbs → exit 0; ci-scope-check → skipped (detached worktree branch name); log-query → exit 0 (`SKIP: no database configured`); `node server/scripts/ai-eval-frontdesk.js --dry` → exit 0, `30 dialogues ok`.
- [ui] `e2e/ui/681-1.spec.ts`: written, not run (no running app in the worktree). [human] the live eval run on the real model chain waits for Dandan.
