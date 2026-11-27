# Plan 755 — The assistant gets the facts that fit the guest's question: the business's basics always, the rest picked by a script, and what was left out is written down

Status: draft
Depends-on: 754
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The facts the assistant may use are one block of text of at most 6,000 characters. When a business has more
knowledge than that, the rest never reaches the model and nobody is told. Verified on the Snapshot:

- `publicFacts(db, businessId)` (`server/services/knowledge.js:46-69`) builds the block: first the profile's own
  lines (`profileLines`, `:13-28` — name, phone, address, service area, opening hours, closed dates), then every
  knowledge item that is `approved`, `public` and not deleted (`:48-50`), sorted by topic in the order of
  `KNOWLEDGE_TOPICS` (`hours, location, menu, prices, policy, dietary, events, faq, other`,
  `shared/schemas/entities/knowledge-item.schema.ts:5`), then `createdAt`, then `_id` (`:51-54`). One item is one
  line, `[<_id>] <topic>: Q: <question> | A: <answer>` plus ` | also asked: …` for its `variations` (`itemLine`,
  `:35-39`).
- The cut (`:57-64`, `MAX_CHARS = 6000` at `:8`): lines are added whole until one does not fit, and the loop stops
  there (`break`, `:61`). So the cut is never in the middle of a line, but everything after the first line that
  does not fit is dropped — always the last topics (`faq`, `other`) and the newest items — whatever the guest
  asked. The function returns `{ text, factIds }` (`:65-68`) and says nothing about what it dropped; there is no
  log line.
- One caller: `runTurnInner` (`server/services/frontdesk-turn.js:231`). A guest turn, a member's "suggest" (`POST
  /api/v1/ai/frontdesk/suggest` calls `runTurn` with `mode: 'suggest'`, `server/routes/ai/frontdesk.js:86`) and the
  eval (`server/scripts/ai-eval-frontdesk.js` plays its dialogues through the same turn) all pass through that one
  line. The public page, the knowledge import and the "fix this answer" prompt
  (`server/routes/ai/frontdesk.js:108-164`) do not read `publicFacts`.
- What the cut costs: the prompt tells the model "If the answer is not in the facts, set handoff to true"
  (`server/services/frontdesk-prompt.js:18`), so a guest who asks about a dropped fact is passed to the staff. The
  guardrails judge the reply against the same block: `guardCtx` gets `factIds: facts.factIds, factsText: facts.text`
  (`frontdesk-turn.js:255-258`); `usedFacts` is filtered to the known ids
  (`server/services/frontdesk-guardrails.js:86-87`), a link must stand in `factsText` (`:55-62`), a price must stand
  in a used fact line (`:64-74`), and a time — after plan 751 — must stand, as `HH:mm`, in any fact line that was
  sent (`timeCheck`, plan 751) or in the hours row's open / close.
- A knowledge item has no tags, keywords, category or "pinned" field. Its text fields are `question` (≤ 200),
  `answer` (≤ 1,200) and `variations` (≤ 5 × 200, "also asked") (`knowledge-item.schema.ts:12-14`, `:20-29`); one
  item line can be about 2,450 characters long.
- Sizes today: the demo restaurant has no knowledge items at all (`server/scripts/lib/demo-restaurant-data.js:190-196`
  returns no `knowledgeItems`); its facts are four profile lines, 172 characters. Every dialogue of the eval set
  seeds at most one fact (`server/eval/frontdesk/dialogues/*.json`, `setup.facts`). So nothing is dropped in the
  demo or in the eval today, and nothing changes for them in this plan.

The Human agreed to the direction: the business's basic facts are always sent; the rest is picked by a script
according to what the guest is asking now; nothing is left out silently.

Plans this one is written against (their code is not in the Snapshot): plan 751 (`currentGuestText`,
`CURRENT_WINDOW_MS` in `server/services/frontdesk-when.js`; `timeCheck` and the `detail` of `unsupported_time` in
`frontdesk-guardrails.js`; rules R-24 and R-25) and plan 752 (the run record: `run.time` / `run.step` in
`runTurnInner`, the `facts` step with `out = { factIds, factsChars, tablesOn, areas }`, `STEP_FIELDS` in
`src/app/pages/frontdesk/assistant/assistant-run-view.util.ts`, the `asr_` dictionary keys). Plans 753 and 754 run
before this one and do not touch `knowledge.js`. Line numbers above are the Snapshot's; find every place by the
symbol named.

## Goals & Success Criteria
**Primary:** when a business's knowledge is longer than the assistant can read at once, the item that answers the
guest's question is sent to the model, the business's basic facts are always sent, and the run record and the log
say how many facts were sent and which were left out. A business whose knowledge fits gets exactly the text it gets
today.

- [auto] `pnpm run test:server` → exit 0, including the new file `server/test/fact-pick.test.js`, the new and
  changed cases below, and `server/test/frontdesk-eval.test.js` unchanged and green.
- [auto] `server/test/fact-pick.test.js`, `factTokens`: `'יֵשׁ חֲנָיָה?'` → `['חניה']`; `'Is there PARKING near you?'` →
  `['parking', 'near']`; `'יש לכם חנייה בחינם ב-20:00?'` → `['חניה', 'בחינם']`; `'כמה עולה ש"ח 50? צ\'יפס'` →
  `['עולה', 'שח', 'ציפס']`; `'שלום'` → `[]`; `'וכמה זה עולה?'` → `['עולה']`; `'חניה חניה וחניה'` →
  `['חניה', 'וחניה']`; `''`, `null` and `undefined` → `[]`; `factTokens('חניה כלב מחיר', 2)` →
  `['חניה', 'כלב']`.
- [auto] same file, `formsOf`: `'בחניה'` → `['בחניה', 'חניה']`; `'ובחניה'` → `['ובחניה', 'בחניה', 'חניה']`;
  `'שבחניה'` → `['שבחניה', 'בחניה', 'חניה']`; `'לילד'` → `['לילד', 'ילד']`; `'משלוח'` → `['משלוח', 'שלוח']`;
  `'הבלוח'` → `['הבלוח', 'בלוח']`; `'בית'` → `['בית']`; `'parking'` → `['parking']`.
- [auto] same file, `tokenMatch(a, b)`: 3 for `('בחניה', 'החניה')`, `('חניה', 'חניה')`, `('כלב', 'הכלב')`; 2 for
  `('מחיר', 'מחירים')`, `('ילדים', 'לילד')`, `('חניה', 'חניון')`, `('כשר', 'כשרות')`, `('טבעוני', 'טבעונית')`,
  `('עולה', 'עולים')`, `('ולחניה', 'חניון')`, `('parking', 'park')`, `('reservation', 'reserve')`; 0 for
  `('שבת', 'שבוע')`, `('כלב', 'חניה')`, `('כלב', 'כלה')`, `('עולה', 'עלות')`, `('price', 'private')`,
  `('bar', 'barbecue')`.
- [auto] same file, `scoreItem(item, query, context)` with `PARKING = { question: 'יש חניה ליד המסעדה?', answer:
  'יש חניון ציבורי במרחק 100 מטר' }`, `HOURS = { question: 'מה שעות הפתיחה?', answer: 'החניה סגורה בלילה' }` and
  `VARIED = { question: 'איפה משאירים את הרכב?', answer: 'ברחוב', variations: ['יש חניה?'] }`:
  `(PARKING, ['חניה'])` → 12; `(HOURS, ['חניה'])` → 6; `(VARIED, ['חניה'])` → 12; `(PARKING, ['כלב'])` → 0;
  `(PARKING, [], ['חניה'])` → 6; `(HOURS, [], ['חניה'])` → 3; `(PARKING, ['חניה'], ['חניה', 'מסעדה'])` → 18; the
  follow-up `(PARKING, factTokens('וכמה זה עולה?'), factTokens('יש חניה? יש חניון ציבורי'))` → 13; a price item
  `({ question: 'מחירון', answer: 'מנה עולה 50' }, factTokens('וכמה זה עולה?'), factTokens('יש חניה?'))` → 6.
- [auto] same file, `pickFacts` with the 40-item set `BIG` (built in the test: `k01`…`k38` with `topic: 'faq'`,
  `question: 'שאלה כללית NN'`, `answer: 'א'.repeat(300)` — each line 333 characters; `k39` with `topic: 'other'`,
  `question: 'יש חניה ליד המסעדה?'`, `answer: 'יש חניון ציבורי במרחק 100 מטר, פתוח עד 23:30. ' + 'ג'.repeat(300)` —
  387 characters; `k40` with `topic: 'other'`, `question: 'אפשר להביא כלב?'`, `answer: 'ב'.repeat(300)` — 337
  characters; in this order, no core lines, budget 6,000):
  - `query: 'יש לכם חניה?'` → `factIds` equals `['k01', …, 'k16', 'k39']` (17 ids, in that order), `leftOutIds` has
    23 ids starting `['k17', 'k18', 'k19', 'k20']` and containing `'k40'`, `leftOutTitles[0] === 'שאלה כללית 17'`,
    `text.length === 5731`, `stats` equals `{ pick: 'matched', core: 0, sent: 17, leftOut: 23, chars: 5731,
    coreChars: 0, budget: 6000, queryTokens: 1, matched: 1, matchedLeftOut: 0, coreOver: false }`; every line of
    `text` is one whole item line (`text.split('\n')` has 17 entries, each equal to an item's own `line`).
  - `query: 'שלום'` (nothing matches) → `factIds` equals `['k01', …, 'k17']`, `leftOutIds` has 23 ids starting
    `'k18'` and containing `'k39'` and `'k40'`, `stats.pick === 'general'`, `stats.chars === 5677`,
    `stats.queryTokens === 0`.
  - the follow-up: `query: 'וכמה זה עולה?'`, `context: 'יש לכם חניה?\nיש חניון ציבורי במרחק 100 מטר'` → `factIds`
    contains `'k39'`, `stats.pick === 'matched'`.
  - `query: 'אפשר לבוא עם הכלב?'` → `factIds` ends with `'k40'` and does not contain `'k39'`.
  - everything fits: `items: BIG.slice(0, 5)`, `query: 'חניה'` → `stats.pick === 'all'`, `leftOutIds` equals `[]`,
    `stats.queryTokens === 0`, `text` equals the five lines joined by `'\n'`.
  - with two core lines (`'[profile.displayName] name: מסעדה'` and `'[profile.hours] opening hours: א-ש
    12:00-23:00'`, 80 characters together) and `query: 'יש לכם חניה?'` → `factIds` equals `['profile.displayName',
    'profile.hours', 'k01', …, 'k16', 'k39']`, `stats.core === 2`, `stats.coreChars === 80`, `stats.chars === 5812`.
  - core larger than the budget (a name line and an hours line of 6,100 characters, 6,360 together) → `factIds`
    equals the two core ids, `text.length === 6360`, `leftOutIds` has 40 ids starting `'k39'`, `stats.sent === 0`,
    `stats.coreOver === true`, `stats.matchedLeftOut === 1`.
  - stable ties: three items `a1`, `b1`, `c1` with the questions `'חניה א'`, `'חניה ב'`, `'חניה ג'` and
    `answer: 'x'.repeat(2900)`, `query: 'חניה'` → given as `[a1, b1, c1]`: `factIds` `['a1', 'b1']`, `leftOutIds`
    `['c1']`, `stats.matchedLeftOut === 1`; given as `[c1, b1, a1]`: `factIds` `['c1', 'b1']`, `leftOutIds` `['a1']`.
- [auto] same file, `factQueryOf(history)`: `[guest 'יש לכם חניה?', out 'יש חניון ציבורי', guest 'וכמה זה עולה?']`
  → `{ query: 'וכמה זה עולה?', context: 'יש לכם חניה?\nיש חניון ציבורי' }`; two guest messages after the last
  outbound one → `query` is both joined by `'\n'`; a guest message two hours old still counts; a `kind: 'button'`
  message is in neither; no outbound message → `context: ''`; an empty history → `{ query: '', context: '' }`.
- [auto] same file: every entry of `FACT_PICK_MODES` has the key `asr_factpick_<mode>` in
  `public/assets/data/dictionary.json`, and the keys `asr_f_facts_left_out`, `asr_f_left_out_titles`,
  `asr_f_fact_pick` exist.
- [auto] `server/test/knowledge.test.js`: the three existing `publicFacts` cases at `:47-97` pass unchanged; the
  case at `:99-101` expects the new empty shape `{ text: '', factIds: [], leftOutIds: [], leftOutTitles: [], stats:
  { pick: 'all', core: 0, sent: 0, leftOut: 0, chars: 0, coreChars: 0, budget: 6000, queryTokens: 0, matched: 0,
  matchedLeftOut: 0, coreOver: false } }`; new case "picks the item the guest asks about": the `BIG` set stored as
  40 approved public items of `kb1` (`createdAt` 1…40) plus a profile with `displayName: 'מסעדה'` →
  `publicFacts(testDb(), 'kb1', { query: 'יש לכם חניה?' })` has `factIds[0] === 'profile.displayName'`, contains
  `'k39'`, not `'k40'`, `text.length <= 6000`, `factIds.length - 1 + leftOutIds.length === 40`, and
  `leftOutTitles.length === leftOutIds.length`; the same call without options has `stats.pick === 'general'` and no
  `'k39'` in `factIds`; a draft, an internal and a deleted item appear in neither `factIds` nor `leftOutIds`.
- [auto] `server/test/seed-demo-restaurant.test.js`, new case "the demo's facts are all sent": the profile of
  `buildDemoRestaurant({ now })` stored, then `publicFacts` for its `businessId` → `text` equals
  `'[profile.displayName] name: מסעדת הדגמה\n[profile.phone] phone: 03-5550100\n[profile.address] address: רחוב הרצל
  10, תל אביב\n[profile.hours] opening hours: כל יום 12:00–23:00'` (172 characters), `leftOutIds` equals `[]`,
  `stats.pick === 'all'`.
- [auto] `server/test/frontdesk-when.test.js`: `currentGuestText([guest 'מחר' at NOW - 31 * 60000, guest 'שולחן' at
  NOW], NOW)` → `'שולחן'` (unchanged); the same with `{ windowMs: Infinity }` as third argument → `'מחר\nשולחן'`.
- [auto] `server/test/frontdesk-turn.test.js`, new block "plan 755: the facts are picked" (the `BIG` set stored for
  `b1`; the fixture's profile gives one core line, `[profile.hours] opening hours: all all`, 38 characters):
  - the guest message is `'יש לכם חניה?'`, the model answers `SMALL` → the request body's
    `contents[0].parts[0].text` contains `'[k39]'` and `'[profile.hours]'`, and contains neither `'[k40]'` nor
    `'[k38]'`; the one `assistantRuns` document's `facts` step has status `note` and `out` matching `{ pick:
    'matched', core: 1, sent: 17, leftOut: 23, matchedLeftOut: 0, queryTokens: 1 }`, `out.factIds` has 18 entries,
    `out.leftOutIds` has 23 entries starting `'k17'` and containing `'k40'`, `out.leftOutTitles` has exactly 12
    entries starting `'שאלה כללית 17'`.
  - the guest message is `'GUEST-SECRET-TEXT'` → the body contains `'[k17]'` and not `'[k39]'`; the `facts` step's
    `out.pick` is `'general'` and `out.leftOutIds` contains `'k39'`.
  - the follow-up: messages `[guest 'יש לכם חניה?', outbound by the assistant 'יש חניון ציבורי במרחק 100 מטר',
    guest 'וכמה זה עולה?']` → the body contains `'[k39]'`.
  - `mode: 'suggest'` with the guest message `'יש לכם חניה?'` → the body contains `'[k39]'`.
  - without knowledge items (the existing `setup()`) → the `facts` step has status `ok`, `out` matches `{ pick:
    'all', core: 1, sent: 0, leftOut: 0 }` and has no `leftOutIds` and no `leftOutTitles` key.
  - logs: each of these turns leaves one `frontdesk.turn.facts` record whose keys beside the logger's own are
    exactly `event`, `conversationId`, `pick`, `sent`, `leftOut`, `core`, `chars`; the captured log text of the
    block contains none of `'חניה'`, `'שאלה כללית'`, `'GUEST-SECRET-TEXT'`; no `frontdesk.turn.facts_core_over`
    record.
  - core over the budget: the profile's `hours` set to one row whose `time` is 6,100 characters → the turn still
    answers, one `warn` record `frontdesk.turn.facts_core_over` with `coreChars` and `budget: 6000` and no other
    field beside `event` and `conversationId`, and the `facts` step's `out.sent` is 0.
- [auto] `server/test/frontdesk-tables.test.js`, new block "plan 755: the rules judge the facts that were sent"
  (table service on, the `BIG` set stored for `b1`):
  - `say(conversation, { reply: 'יש חניון ציבורי, פתוח עד 23:30', intent: 'question', usedFacts: ['k39'] }, { text:
    'יש לכם חניה?' })` → one outbound message with exactly that text, `author: 'ai'`, the conversation still `bot`,
    no `frontdesk.turn.blocked` record.
  - the same model answer with `{ text: 'שלום' }` (the parking item is left out) → the handoff sentence is sent,
    status `human`, and the one `frontdesk.turn.blocked` record matches `{ reason: 'unsupported_time', stage: 'post',
    times: 1, unmatched: 1, usedFacts: 0, unknownFacts: 1 }`; the run's `facts` step's `out.leftOutIds` contains
    `'k39'` and its `guardrails` step is `stopped`.
- [auto] `server/test/frontdesk-guardrails.test.js` passes unchanged (the moved `norm` behaves the same).
- [auto] `pnpm run test:ci` → exit 0, including the new cases of
  `src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts`: `stepRows` of a `facts` step with `out = {
  factIds: [19 ids], factsChars: 5812, tablesOn: false, pick: 'matched', leftOut: 23, leftOutIds: ['k17'],
  leftOutTitles: ['שאלה כללית 17', 'שאלה כללית 18'] }` on side `'out'` holds a row with `labelKey:
  'asr_f_facts_left_out'` and `value: 23`, a row with `labelKey: 'asr_f_left_out_titles'` and `value: 'שאלה כללית
  17, שאלה כללית 18'`, a row with `labelKey: 'asr_f_fact_pick'` and `valueKey: 'asr_factpick_matched'`, and no row
  for `leftOutIds`; a `facts` step without those fields gives the rows it gave before.
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, signed in as the demo restaurant's owner
  `demo_host`) write "מתי אתם פתוחים?" as a test guest, wait for the answer, press "מה העוזר עשה", open the newest
  row and press the step "איסוף המידע על העסק" · the step shows "פריטי מידע שנשארו בחוץ" with 0 and "איך נבחר המידע"
  with "כל המידע נשלח", and the assistant answered with the opening hours as before.

## Execution Mode
- Parallel: no — the plan edits `server/services/frontdesk-turn.js`, `frontdesk-guardrails.js`, `frontdesk-when.js`
  and the assistant page's helper, the files of plans 751–754; it runs after 754.
- Concurrent plans: none
- Isolated DB: no — no stored shape changes
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/text-norm.js
server/services/fact-pick.js
server/services/knowledge.js
server/services/frontdesk-when.js
server/services/frontdesk-guardrails.js
server/services/frontdesk-turn.js
server/test/fact-pick.test.js
server/test/knowledge.test.js
server/test/frontdesk-when.test.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-tables.test.js
server/test/seed-demo-restaurant.test.js
src/app/pages/frontdesk/assistant/assistant-run-view.util.ts
src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts
public/assets/data/dictionary.json
docs/frontdesk/assistant-behaviour-rules.md
docs/restaurant/restaurant-map.md
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
server/test/frontdesk-eval.test.js
server/test/frontdesk-guardrails.test.js
docs/workflow-kit/manifest.json
```

New files: `server/utils/text-norm.js`, `server/services/fact-pick.js`, `server/test/fact-pick.test.js`. Every other
path exists on the Snapshot or is added by plan 751 (`server/services/frontdesk-when.js`,
`server/test/frontdesk-when.test.js`) or plan 752 (the two `assistant-run-view.util` files).

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely cases: a test of plans 752–754 that compares the `facts`
step's `out` with an exact object (`toEqual`) and now sees the added fields — offer `approved: <that test path>` with
the one-line change to the added fields; `server/test/frontdesk-runs.test.js` if it lists every `STEP_FIELDS` name.
`server/services/frontdesk-prompt.js`, `server/services/frontdesk-runs.js`, `server/routes/ai/frontdesk.js`,
`shared/schemas/**`, `server/eval/**`, `server/scripts/**` and `server/services/ai-recipe-helpers.js` are never
offered: the plan needs no change there.

## Architecture Impact

- INV-2: preserves — `server/services/knowledge.js` still reads the profile and the knowledge items only with the `businessId` it is given (the conversation's own), with the same two queries; `server/services/fact-pick.js` and `server/utils/text-norm.js` are pure and read nothing; no new query, no write, no cross-business read.
- INV-7: preserves — `server/services/frontdesk-turn.js` changes only which fact lines are sent to the model and what is recorded about them; `handleTableIntent` and the engine still decide every table, the model's reply is still dropped for `book`, `change` and `cancel`, and a time in a sent reply must still stand in the facts that were sent or in the hours row (R-25) — a fact that was left out supports nothing, so the check became stricter, never looser.

## Reuse Check

- `norm(text)` in `server/utils/text-norm.js` — family: assistant-guardrails — rung: 3 — why: the existing one-line helper of `frontdesk-guardrails.js:25` moves out unchanged so a second module can call it; the guardrails import it and keep no copy.
- `factTokens`, `formsOf`, `tokenMatch`, `scoreItem`, `pickFacts`, `factQueryOf` in `server/services/fact-pick.js` — family: none — rung: 4 — why: nothing ranks knowledge items today; the only relative, the private `tokenize` / `selectShots` of `server/services/ai-recipe-helpers.js:198-228` (plan 370, recipe examples), has its own ten stop words, no Hebrew prefix handling, no budget and no "left out" list, and is not exported; the new module builds on the shared `norm`.
- `publicFacts(db, businessId, { query, context, budget })` — family: assistant-turn — rung: 2 — why: the one fact source gains optional inputs and returns more; it stays the only place that builds the facts block.
- `currentGuestText(history, now, { windowMs })` — family: date-words — rung: 2 — why: plan 751's helper gains one optional input so the facts read the same guest messages without the 30-minute window; no second walk over the history.
- Three rows in `STEP_FIELDS` — family: assistant-runs — rung: 2 — why: plan 752's way to show a new fact of a step; no component, class or template changes.
- New registry family `fact-pick` in `docs/brain/component-families.md` — family: none — rung: 4 — why: gives the scorer, the shared `norm` and the picked `publicFacts` one entry, with the known copies named.

## Adopt Check
- `factTokens`, `formsOf`, `tokenMatch`, `scoreItem`, `pickFacts`, `factQueryOf` in `server/services/fact-pick.js` — verdict: skip — why: this product's own rules (the profile lines always, whole items inside a character budget, the fixed topic order, the left-out list for the run record); about 120 lines on the repo's `norm`; a search or stemming package would add a runtime dependency and has no Hebrew prefix handling the plan could rely on; no new package and no paid service.
- New registry family `fact-pick` in `docs/brain/component-families.md` — verdict: skip — why: a registry entry for the pieces above, not a capability.

## Defaults

- empty-state-on-list — exception — why: no list on a page changes; a step's fields are labelled values inside the row plan 752 built
- loading-and-error-states — exception — why: no new loading or error state; the run page keeps plan 752's
- app-list-container — exception — why: no list page in this plan
- unsaved-changes-on-leave — exception — why: no form and no input; server code, three labelled values and docs
- hints-in-tooltips — exception — why: no new control and no dialog
- unit-dropdown-add — exception — why: no unit field; the word only names unit test files
- one-breakpoint-set — exception — why: no SCSS changes
- confirm-destructive-action — exception — why: nothing a person does here deletes or discards; the word only describes a knowledge item that was deleted later

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten). The commits of plans 751–754 are expected drift.
Check that these still exist with the roles described: `publicFacts`, `profileLines`, `itemLine`, `MAX_FACTS_CHARS`
(`knowledge.js`); in `runTurnInner` the call of `publicFacts`, the `history` array built before it, `guardCtx` with
`factIds: facts.factIds, factsText: facts.text`, and plan 752's recording of the `facts` step; `currentGuestText`
(`frontdesk-when.js`); `norm` (`frontdesk-guardrails.js`); `STEP_FIELDS` and `stepRows`
(`assistant-run-view.util.ts`). Not a conflict, handle it as written: plan 754 runs `publicFacts` at the same time
as other reads — the call needs `history`, so it moves after the history read (it may still run beside
`tablesFor`); plan 753 or 754 added a rule row — take the next free R-number.

## User Stories
- As a guest, I want my question answered from what the restaurant wrote about it, so that I am not passed to the staff for something the restaurant already answered.
- As a restaurant owner with a long list of knowledge, I want the assistant to read the item that fits the question, so that items I added late are used too.
- As a restaurant owner, I want to see in "what the assistant did" how many facts were sent and which were left out, so that I can shorten or merge items when an answer was missed.
- As a restaurant owner, I want the assistant to always know my name, hours, address and phone, so that the basics are never the part that was cut.
- As the person who looks after the assistant, I want numbers in the log for every pick, so that a business whose knowledge no longer fits is found without reading a guest's words.

## Functional Requirements

### Must Have (P0)

**1. One shared text helper — `server/utils/text-norm.js` (new), `server/services/frontdesk-guardrails.js`**
- [ ] `server/utils/text-norm.js`: `'use strict'`, CommonJS. `const NIQQUD_RE = /[֑-ׇ]/g` and
  `const norm = text => String(text ?? '').toLowerCase().replace(NIQQUD_RE, '')` — the exact behaviour of
  `frontdesk-guardrails.js:14` and `:25`. Exports `{ norm, NIQQUD_RE }`. Doc comment: "Plan 755: lower-case text
  with the Hebrew vowel points removed. One copy for the guardrails and the fact picker."
- [ ] `frontdesk-guardrails.js`: the local `NIQQUD_RE` and `norm` are deleted and replaced by
  `const { norm } = require('../utils/text-norm')`. Nothing else in the file changes (`hasAny`, `trimmed` and every
  check keep calling `norm`).

**2. The picker — `server/services/fact-pick.js` (new, pure: no database, no logger)**
- [ ] `'use strict'`, CommonJS, the code style of `knowledge.js`. Requires `norm` from `../utils/text-norm` and
  `currentGuestText` from `./frontdesk-when`. Exports `{ factTokens, formsOf, tokenMatch, scoreItem, pickFacts,
  factQueryOf, FACT_STOP_WORDS, FACT_PICK_MODES, QUERY_TOKENS_MAX, TITLE_MAX }` with `FACT_PICK_MODES = ['all',
  'matched', 'general']`, `QUERY_TOKENS_MAX = 12`, `TITLE_MAX = 60`. Doc comment: "Plan 755 (R-nn): which knowledge
  lines are sent to the model when they do not all fit. A script, no model call. The profile's lines are never cut;
  an item is sent whole or not at all; what was left out is returned, never dropped silently. Nothing here is
  logged: the texts are a guest's and an owner's words."
- [ ] `FACT_STOP_WORDS` — a `Set` of exactly: `של את עם על אל זה זו זאת הוא היא הם אני אנחנו אתם אתה יש אין לי לך
  לנו לכם אצלכם מה מי איך איפה כמה מתי למה האם אם או גם רק כל כן לא אבל כי אז עוד שלום היי הי תודה בבקשה אפשר רוצה
  רוצים צריך` and `the an is are do does you your we to of in on at for and or it what when where how can have
  there hi hello thanks please`.
- [ ] `factTokens(text, max = Infinity)` → `string[]`. Steps, in order: `norm(String(text ?? '').slice(0, 4000))`;
  remove every quote mark `/["'׳״’\`]/g` (so `ש"ח` is `שח`); split on `/[^\p{L}\p{N}]+/u`; in each piece collapse
  a run of `י` to one `י` and a run of `ו` to one `ו` (`חנייה` is `חניה`); drop a piece that is shorter than 2
  characters, is digits only (`/^\p{N}+$/u`), is in `FACT_STOP_WORDS`, starts with `ו` and is a stop word without
  it (`וכמה`), or was already kept; stop after `max` kept tokens. The order of first appearance is kept.
- [ ] `formsOf(token)` → `string[]`: the token; plus the token without its first letter when that letter is one of
  `ו ה ב ל מ ש כ` and at least 3 letters remain; plus the token without its first two letters when the first is `ו`
  or `ש`, the second is one of the seven, and at least 3 letters remain. In this order.
- [ ] `tokenMatch(a, b)` → `3 | 2 | 0`: 3 when any form of `a` equals any form of `b`; else 2 when some form of `a`
  and some form of `b` share their first letters — at least 3 when both forms start with a Hebrew letter
  (`/^[א-ת]/`), at least 4 otherwise; else 0.
- [ ] `scoreItem(item, query, context = [])` → a whole number. `item` is `{ question, answer, variations? }`,
  `query` and `context` are token arrays. `title = factTokens(question + ' ' + variations.join(' '))`,
  `body = factTokens(answer)`. For one token `t`: `points(t) = max(2 × best tokenMatch(t, title token), best
  tokenMatch(t, body token))`. The score is `2 × Σ points(q)` over the query tokens plus `Σ points(c)` over the
  context tokens that are not also query tokens. So a query word in the title counts 12 (exact) or 8 (shared
  start), in the answer 6 or 4, and a context word half of that.
- [ ] `pickFacts({ core = [], items = [], query = '', context = '', budget })` → `{ text, factIds, leftOutIds,
  leftOutTitles, stats }`. `core` is `{ id, line }[]`; `items` is `{ id, line, title, question, answer,
  variations }[]` already in the fixed order. The length of a set of lines is the sum of the lines plus one per
  line break.
  1. `coreChars` = the length of the core lines. The core lines are always sent, whole, also when `coreChars >
     budget` (`stats.coreOver`).
  2. Everything fits (core and all items ≤ `budget`): every item is sent, `pick: 'all'`, no token is computed
     (`queryTokens: 0`, `matched: 0`).
  3. Otherwise: `q = factTokens(query, QUERY_TOKENS_MAX)`, `c = factTokens(context, QUERY_TOKENS_MAX)`; every item
     gets `scoreItem(item, q, c)`; the items are ranked by score, highest first, equal scores in the fixed order
     they came in; `pick` is `'matched'` when at least one item scored above 0, else `'general'`. Walk the ranked
     list once: an item is taken when its line (plus one for the line break, when a line is already taken) still
     fits in what is left of `budget`; an item that does not fit is skipped and the walk goes on (a shorter item
     further down may still fit). No line is ever shortened.
  4. `text` = the core lines, then the taken items in the fixed order (not the ranked order), joined by `'\n'`;
     `factIds` = their ids in that order; `leftOutIds` / `leftOutTitles` = the ids and `title`s of the items not
     taken, in the ranked order (the most relevant first).
  5. `stats = { pick, core: core.length, sent: <items sent>, leftOut: <items left out>, chars: text.length,
     coreChars, budget, queryTokens: q.length, matched: <sent items that scored above 0>, matchedLeftOut: <left-out
     items that scored above 0>, coreOver: coreChars > budget }`.
- [ ] `factQueryOf(history)` → `{ query, context }`; `history` is oldest first, as `runTurnInner` builds it.
  `query = currentGuestText(history, 0, { windowMs: Infinity })` — the guest's text messages since the last
  outbound message, whatever their age. `context` = the last outbound message and the message right before it
  (the two messages before the current guest messages), each only when it has a non-empty `text` and its `kind` is
  neither `'button'` nor `'template'`, each cut to 500 characters, older first, joined by `'\n'`; `''` when the
  history has no outbound message.

**3. The fact source — `server/services/knowledge.js`**
- [ ] `publicFacts(db, businessId, { query = '', context = '', budget = MAX_CHARS } = {})`. The two reads and the
  sort of the items (`:47-54`) do not change. `profileLines` returns `{ id, line }` for each line (`id` is the text
  between the square brackets: `profile.displayName`, `profile.phone`, `profile.address`, `profile.serviceArea`,
  `profile.hours`, `profile.closedDates`); `itemLine` returns `{ id, line, title, question, answer, variations }`
  with `title = oneLine(item.question).slice(0, TITLE_MAX)` and the item's own `question`, `answer` and
  `variations` (an empty array when missing). The loop at `:56-68` is replaced by
  `return pickFacts({ core: profileLines(profile), items: items.map(itemLine), query, context, budget })`.
- [ ] The core set is exactly the six profile lines above — everything `profileLines` renders today, in today's
  order. No profile field is added to the facts and no knowledge item is "core".
- [ ] The `@returns` line becomes `Promise<{ text: string, factIds: string[], leftOutIds: string[], leftOutTitles:
  string[], stats: object }>`; the file comment gains: "Plan 755 (R-nn): when the lines do not all fit in 6,000
  characters the profile's lines are always sent and the items are picked by `pickFacts` for the guest's current
  message; `factIds` are exactly the lines that were sent."
- [ ] `MAX_CHARS` stays 6,000 and the export `MAX_FACTS_CHARS` stays.

**4. The turn — `server/services/frontdesk-when.js`, `server/services/frontdesk-turn.js`**
- [ ] `currentGuestText(history, now, { windowMs = CURRENT_WINDOW_MS } = {})`: the age test becomes
  `now - at <= windowMs`. Its two existing callers pass no third argument and behave as before.
- [ ] In `runTurnInner`, the call becomes `publicFacts(db, businessId, factQueryOf(history))`. It runs after
  `history` is built, in both modes (`turn`, `suggest`) and for the eval (`feature: 'eval'`).
- [ ] Right after it, one info line: `log.info({ event: 'frontdesk.turn.facts', conversationId: conversation._id,
  pick, sent, leftOut, core, chars })` (the five values from `facts.stats`). When `facts.stats.coreOver`, also
  `log.warn({ event: 'frontdesk.turn.facts_core_over', conversationId: conversation._id, coreChars, budget })`
  (`warn` is kept by the log store). No id of a fact, no title and no text in either line.
- [ ] The run record (plan 752's `facts` step): its `out` keeps `factIds`, `factsChars`, `tablesOn`, `areas` and
  gains `pick`, `core`, `sent`, `leftOut`, `matchedLeftOut`, `queryTokens` (from `facts.stats`); when
  `leftOut > 0` it also gains `leftOutIds: facts.leftOutIds.slice(0, 40)` and
  `leftOutTitles: facts.leftOutTitles.slice(0, 12)`, and the step's status is `note`. With `leftOut === 0` the two
  list keys are not written and the status stays as plan 752 set it.
- [ ] `guardCtx` is not edited: it keeps `factIds: facts.factIds, factsText: facts.text`, which are now exactly the
  lines that were sent. `buildTurnBody` is not edited: it reads `facts.text`.
- [ ] The file's doc comment gains: "Plan 755 (R-nn): the facts are picked for the guest's current message
  (`factQueryOf`, `publicFacts`); the rules judge the reply against the lines that were sent."

**5. What the owner sees — `assistant-run-view.util.ts`, `public/assets/data/dictionary.json`**
- [ ] `STEP_FIELDS.facts.out` gains three rows after plan 752's `factIds` row: `{ name: 'leftOut', labelKey:
  'asr_f_facts_left_out', kind: 'number' }`, `{ name: 'leftOutTitles', labelKey: 'asr_f_left_out_titles', kind:
  'list' }`, `{ name: 'pick', labelKey: 'asr_f_fact_pick', kind: 'enum', enumPrefix: 'asr_factpick_' }`.
  `leftOutIds`, `core`, `sent`, `matchedLeftOut` and `queryTokens` are in the record and not shown. No component,
  template or SCSS changes: `stepRows` already draws the three kinds, and a step with status `note` already shows
  the amber tag "הערה".
- [ ] Dictionary keys appended to `general` (see UI/UX Notes).

**6. Rules, maps and the registry**
- [ ] `docs/frontdesk/assistant-behaviour-rules.md`: one new row after the last one, with the next free R-number
  at execution time (R-26 when plans 753 and 754 added none): "**The facts are picked, and nothing is left out
  silently.** The profile's own facts (name, phone, address, service area, opening hours, closed dates) are always
  sent whole. Knowledge items are sent whole or not at all, within 6,000 characters together with the profile's
  facts. When they do not all fit, a script — no model call — ranks them by the words they share with the guest's
  current message(s) and, at half weight, with the two messages before them (a word in the question or its "also
  asked" lines counts double), and fills what is left in the fixed topic order. The items left out are written to
  the run record and counted in the log. A reply is judged against the facts that were sent only." (554, 755). The
  same number replaces `R-nn` in the code comments above.
- [ ] `docs/restaurant/restaurant-map.md`, at the end of "Contract extensions (run)": `755 · C-KB / C-AI / C-RUNS ·
  publicFacts(db, businessId, { query, context, budget }) returns { text, factIds, leftOutIds, leftOutTitles, stats
  }; the profile's lines are always sent, knowledge items are picked whole by pickFacts (server/services/fact-pick.js)
  when they do not fit 6,000 characters; factIds / factsText of the guardrails are the lines that were sent; the
  facts step of a run records pick, sent, leftOut, leftOutIds (≤ 40) and leftOutTitles (≤ 12); log
  frontdesk.turn.facts carries numbers only · the Human's direction of 2026-11-26`.
- [ ] `server/breadcrumbs.md`: new rows `services/fact-pick.js` — "`pickFacts`, `scoreItem`, `factTokens`,
  `factQueryOf` (plan 755): which knowledge lines are sent when they do not all fit — the profile's lines always,
  items whole, ranked by the guest's words; pure" and `utils/text-norm.js` — "`norm` (plan 755): lower-case text
  without Hebrew vowel points; used by the guardrails and the fact picker"; the `services/knowledge.js` row (`:14`)
  adds "plan 755: takes `{ query, context, budget }` and returns what was sent and what was left out"; the
  `services/frontdesk-turn.js` and `services/frontdesk-guardrails.js` rows add "plan 755: the facts are picked;
  `frontdesk.turn.facts`" and "plan 755: `norm` lives in `utils/text-norm.js`".
- [ ] `docs/brain/component-families.md`: new family `### fact-pick — pickFacts, scoreItem, factTokens, factQueryOf
  in server/services/fact-pick.js, norm in server/utils/text-norm.js, publicFacts in server/services/knowledge.js
  (plan 755)` with Status `stable — server only`; Use (one line per piece); Pieces `norm, factTokens, formsOf,
  tokenMatch, scoreItem, pickFacts, factQueryOf, publicFacts`; When "any text that goes to the assistant as a fact
  comes from `publicFacts`; any ranking of Hebrew text by shared words on the server starts from `factTokens` — a
  second stop-word list or a second cut of the facts is never added"; Known copies "`tokenize` in
  `server/services/ai-recipe-helpers.js` (plan 370, recipe examples); the vowel-point strip inside
  `shared/schemas/front-desk/date-words.ts` (plan 751 — shared code cannot import a server util);
  `normalizeHebrew` in `src/app/core/utils/recipe-match.util.ts` (browser)". The `assistant-turn` family's Use line
  adds "plan 755: the facts are picked by `pickFacts`"; the `assistant-runs` family's Use line adds "plan 755: the
  facts step records what was left out". Then `node scripts/inventory.mjs` and commit `docs/brain/inventory.md`
  only if it changed.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: none — no page or page frame changes; three labelled values are added to the step "איסוף המידע על
  העסק" of plan 752's page (`/frontdesk/assistant`) through `STEP_FIELDS`.
- Hebrew, RTL. No new icon, class or component.
- What the owner reads in that step when something was left out: the amber tag "הערה", "פריטי מידע שנשלחו" with
  the number sent (plan 752's row, profile lines included), "פריטי מידע שנשארו בחוץ" with the number left out,
  "מה נשאר בחוץ" with up to 12 titles (the start of each item's question), and "איך נבחר המידע".
- Data flow: unchanged — `AssistantRunDataService.run_` → `app-run-detail` input → `stepRows(step, 'out')` → the
  template.

**Dictionary keys** (all new, appended to `general` in `public/assets/data/dictionary.json`):

| key | Hebrew |
| --- | --- |
| `asr_f_facts_left_out` | פריטי מידע שנשארו בחוץ |
| `asr_f_left_out_titles` | מה נשאר בחוץ |
| `asr_f_fact_pick` | איך נבחר המידע |
| `asr_factpick_all` | כל המידע נשלח |
| `asr_factpick_matched` | נבחר לפי שאלת האורח |
| `asr_factpick_general` | לא נמצאה התאמה לשאלה, נשלח המידע הכללי |

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Build the script that ranks knowledge items by the guest's words, so the right item is found without another AI call — the shared norm helper moved out of the guardrails, the tokens, the word forms, the match, the score, the pick inside the budget, the query from the conversation, and every listed case of the new test file — server/utils/text-norm.js, server/services/frontdesk-guardrails.js, server/services/fact-pick.js, server/services/frontdesk-when.js, server/test/fact-pick.test.js, server/test/frontdesk-when.test.js
- [x] A2: Make the one fact source use the pick and say what it left out, with the business's basics always sent — the new options and return value of publicFacts, the profile lines as the core, the changed and new knowledge cases, the demo restaurant case — server/services/knowledge.js, server/test/knowledge.test.js, server/test/seed-demo-restaurant.test.js
- [x] A3: Give the turn the guest's question, and write the numbers to the log and the left-out items to the run record — the call with the query, the two log lines, the added fields and the note status of the facts step, the turn block and the table block of tests — server/services/frontdesk-turn.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-tables.test.js
- [x] A4: Show the owner how many facts were left out and which — three rows in the step fields, six dictionary keys, the spec cases — src/app/pages/frontdesk/assistant/assistant-run-view.util.ts, src/app/pages/frontdesk/assistant/assistant-run-view.util.spec.ts, public/assets/data/dictionary.json
- [x] A5: Write down the new rule and where the new pieces live — the rule row with the next free number, the map's Contract line, breadcrumbs, the new family and the inventory — docs/frontdesk/assistant-behaviour-rules.md, docs/restaurant/restaurant-map.md, server/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A6: Run every check of this plan and hand Dandan the one simulator check — test:server, test:ci, build, both lints, the inventory check, log-query; evidence into Execution Notes; the slot's servers up before the card

## Technical Considerations
- Dependencies: plan 554 (`publicFacts`, the knowledge item), plan 679 / 689 (the turn, the guardrails), plan 751
  (`currentGuestText`; the time check reads every sent fact line), plan 752 (the run record, `STEP_FIELDS`), plans
  753 and 754 (merged first; same files). Facts taken from plans 751 and 752, not from the Snapshot:
  `currentGuestText(history, now)` and `CURRENT_WINDOW_MS`; `timeCheck` and the `detail` numbers of
  `unsupported_time`; `run.time` / `run.step`, the `facts` step's `out`, the statuses `ok | note | stopped |
  skipped`, the recorder's clipping (a string to 300 characters, an array to 200 entries, three levels of nesting);
  `STEP_FIELDS`, `stepRows`, the field kinds `number`, `list` (joins up to 12 values) and `enum`; the dictionary's
  `general` block.
- New files needed: `server/utils/text-norm.js`, `server/services/fact-pick.js`, `server/test/fact-pick.test.js`.
- Model changes: none. `assistantRunSchema` is not edited: a step's `out` is an open record (plan 752), and the two
  new lists are flat arrays of short strings, so the recorder's clipping leaves them whole.
- Backend / API: no route, no response and no stored shape changes. `publicFacts` gains an optional third argument
  and three keys in its result. New log events `frontdesk.turn.facts` (info) and `frontdesk.turn.facts_core_over`
  (warn).
- Auth and validation: unchanged. The picker reads only data the turn already loaded for the conversation's own
  business.
- Security surface / privacy: the guest's text is passed to `publicFacts` as an argument and is used only to score;
  it is not stored and not logged. The run record gains the ids and the titles (the first 60 characters of the
  question) of the owner's own knowledge items — the owner's words, not a guest's — readable by the people who may
  read a run (plan 752). The log lines carry counts only (tested).
- Data / migration: none. Size of a run record (the Atlas free tier, 512 MB, plan 752's arithmetic): the added
  numbers are about 0.1 KB on every run; the lists are written only when something was left out — up to 40 ids of
  about 24 characters (≈ 1 KB) and 12 titles of up to 60 Hebrew characters (≈ 1.5 KB), so at most ≈ 2.5 KB on a
  typical 4 KB record, and only for a business whose knowledge is longer than 6,000 characters. Titles are stored
  at record time so the record stays true when the item is edited or deleted later. Estimates from the field
  shapes, not measured.
- Why 6,000 stays: the model's own limit is far higher, so it is not the reason; a longer block costs time and
  tokens on every turn of every business, plan 754 has just worked on speed, and plan 752 stores at most 8,000
  characters of the data block (`LEAD_MAX`), which 6,000 of facts plus the date and the request kinds fit. With the
  pick, the budget now holds the items that matter for the question.
- Cost of the pick: nothing when everything fits (no token is computed). Otherwise one pass over the items in
  memory: the items are already read on every turn today; with 300 items of about 250 words, 12 query and 12
  context words and at most three forms a word, it is a few million short string comparisons — an estimate, not
  measured. No model call, no extra database read, no package.
- The guardrails stay correct, by the flow in `runTurnInner`: `facts = await publicFacts(…)` → `buildTurnBody({
  facts })` sends `facts.text` → `guardCtx` holds the same `facts.factIds` and `facts.text` → every
  `applyGuardrails` call reads `guardCtx`. So an id the model lists that was not sent is not a known id, a link, a
  price or a time passes only when it stands in a line that was sent (for a time, also in the hours row's open /
  close). A fact that was left out cannot be cited: the model was not shown it, and if it writes its content
  anyway (from an earlier message of the conversation), the reply is blocked and a person answers. That is the
  intended trade, and the run record shows the left-out item beside the block.
- Who gets the picked set: every path, because there is one caller. A guest turn and a member's "suggest" pick by
  the conversation's guest messages. The eval picks too, and stays deterministic: the pick is a pure function of
  the stored items and the history, and every dialogue seeds at most one fact, so its text is today's text
  (`pick: 'all'`); `server/test/frontdesk-eval.test.js` is not edited.
- Known limits of the word match (accepted, visible in the run record): Hebrew words that share fewer than three
  first letters do not match (`עולה` / `עלות`, `חונים` / `חניה`); the owner's "also asked" lines are scored as part
  of the title, which is the owner's way to add such words today. A word that appears in many items lifts them all
  equally; the fixed order then decides.
- Project checks: the `log-query` Done-when item; the Reuse Check and the Adopt Check; the `Page recipe:` line;
  `dictionary.json` append-only with every key listed; `server/breadcrumbs.md`, the families registry and the
  inventory in scope; no entity shape and no endpoint.
- Traps: `factQueryOf` needs `history`, so `publicFacts` cannot run before the history read; `text` keeps the fixed
  order while `leftOutIds` is in ranked order — do not sort one like the other; the walk skips an item that does
  not fit and goes on (`continue`, not `break`), so a short item far down can be sent; the existing 200-item test
  still expects the first items in order — it holds because its lines never get shorter; the `u` flag is needed on
  the `\p{…}` patterns; the stop-word test runs after the `י` / `ו` collapse; `fact-pick.js` requires
  `frontdesk-when.js`, which requires the generated `date-words` — the server tests build the schemas first
  (`pnpm run test:server`); in the turn tests the `BIG` items need the stored fields the turn's query filters on
  (`businessId: 'b1'`, `status: 'approved'`, `visibility: 'public'`, no `deletedAt`); add a `text` option to the
  turn test's `setup` (default `'GUEST-SECRET-TEXT'`) instead of a second fixture; never assert a fetch count of 1
  on a retried answer (plan 731).

## Out of Scope
- Embeddings, a vector index or any AI-based retrieval; a second model call to choose facts; any new package or
  paid service.
- New owner-facing fields on a knowledge item (pinned, keywords, priority) and any change to the knowledge page.
- A warning on the Knowledge page or in the setup checklist that the knowledge is longer than the assistant can
  read at once: it needs a new read of the total length, a place on the page and its states — a plan of its own.
  Until then the run record's amber "הערה" and the log line are where it shows.
- Changing what counts as public knowledge, the order of topics, or adding profile fields (parking, table-service
  rules) to the facts.
- Reading the last run's `usedFacts` from `assistantRuns` to keep the previous answer's facts: the two messages
  before the guest's question do that job without a database read (Execution Notes).
- A table of synonyms or of words per topic, suffix stemming, and merging the picker's tokens with `tokenize` of
  `ai-recipe-helpers.js`.
- Shortening or summarising a long item, and a hard cap on the profile's own lines.
- The price check still needs the used fact (plan 751 left it so).
- The console's Flow and Settings tabs (plan 756); a link from a left-out title to the knowledge item.

## Critical Questions
- none

## Execution Notes
- behaviour: the always-sent set is the six profile lines `publicFacts` renders today (name, phone, address, service area, opening hours, closed dates); the profile holds no parking or handoff fact (`assistant.handoffText` is a sentence the server sends, not a fact), and no knowledge item is made "core".
- behaviour: when everything fits in 6,000 characters the text is exactly today's text and nothing is scored; the pick starts only when it does not fit.
- behaviour: the query is the guest's text messages since the last outbound message, whatever their age (the 30-minute window of plan 751 is for date words only); button taps are not read.
- behaviour: a follow-up question ("וכמה זה עולה?") is helped by the two messages before the guest's current messages (the assistant's last answer and the message before it), scored at half weight; the last run's `usedFacts` is not read — no database read, the same result in the eval, and no dependence on the 30-day run store.
- behaviour: a word in the item's question or "also asked" lines counts double a word in its answer; an exact word counts 3, a shared start 2 (three letters for Hebrew, four otherwise).
- behaviour: equal scores keep the fixed order (topic order, then creation time, then id) — one order everywhere; when nothing matches, the same order fills the budget, so a greeting gets today's first items.
- behaviour: after the matched items the rest of the budget is filled with unmatched items in the fixed order, so the model can still answer simple follow-ups; an item that does not fit is skipped and a shorter one further down may be sent.
- behaviour: the profile's lines are never cut; when they alone pass 6,000 characters they are still sent whole, no item is sent, and a `warn` line `frontdesk.turn.facts_core_over` is written.
- behaviour: the budget stays 6,000 characters.
- behaviour: the run record stores up to 40 left-out ids and up to 12 left-out titles (60 characters each), the most relevant first, copied at record time; the page shows the count and the 12 titles as two labelled values of the step — "פריטי מידע שנשלחו" (plan 752's row) and "פריטי מידע שנשארו בחוץ" — not as one sentence, because plan 752's page shows a step as labelled values.
- behaviour: the facts step is marked "הערה" (note) when something was left out.
- behaviour: `frontdesk.turn.facts` is written on every turn at `info` (not kept in the database); the run record is the kept trace.
- behaviour: suggest mode and the eval use the same pick as a guest turn.
- review (draft, 2026-11-26): the expected values of the `fact-pick` cases (tokens, forms, matches, scores, the ids, counts and lengths of the 40-item set) were produced by running a throwaway copy of the algorithm as written here, not counted by hand.
- review (draft, 2026-11-26): `scope-check --tags`, `--defaults`, `--adopt`, `--arch` (INV-2, INV-7) and `--deps` pass on the draft. `--reuse` run on `main` reports the families `assistant-guardrails`, `assistant-turn` (staging registry), `date-words` (added by plan 751) and `assistant-runs` (added by plan 752) as unknown; they are headings of the base branch once those plans are merged. `--tests` warns about `server/test/frontdesk-eval.test.js` and `server/test/frontdesk-guardrails.test.js`; both stay unchanged on purpose.
