# Plan 733 — The simulator's assistant always answers the test guest, and a real guest gets a holding message when the assistant fails

Status: draft
Depends-on: none
Snapshot: d1fc1531de9fdbd137b6510dd0bca3bb3f967220

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Human's decisions of 2026-11-25:

1. **The simulator must simulate the assistant's traffic.** On his own business "wwww"
   (`businessId 65bc756b-ca5c-4e68-a8d3-bdf90d1ad7bd`, `frontDeskProfiles.assistant.level: 0`, set by the platform
   admin) the test guest writes in the simulator and the assistant never answers in the chat: the page shows only the
   note "טיוטת העוזר לצוות (לא נשלחה לאורח)". The only time the assistant must not answer in the simulator is when a
   staff member holds the conversation.
2. **Send a holding message.** When a guest turn fails for a technical reason (Google overload, timeout, quota, other)
   the guest gets one short holding message instead of silence.

Root causes, verified on the Snapshot:
- `server/services/frontdesk-turn.js:43` — `levelOf(profile)` reads only the business's level. At level 0 every path
  stores a draft and sends nothing: `:256` (`level0` → `write: false`, `finishSuggestion` at `:270`), `:285-289`
  (`level === 0` → `finishSuggestion`), and `handOff` `:101-107` (the handoff sentence becomes the suggestion). A
  test conversation (`conversation.test === true`, set by `server/routes/sim.js` / `server/services/inbound.js`) is
  treated exactly like a real one.
- `server/services/frontdesk-tables.js:302` — `onTap` ignores a button tap below level 1, so even an offer could not
  be confirmed in the simulator of a level-0 business.
- `src/app/pages/frontdesk/simulator/simulator.page.ts:118-122` and `simulator.page.html:176-180` — plan 719's
  `draft_` block shows the level-0 suggestion labelled `sim_draft_label`; `simulator.page.html:14` shows `sim_level_0`
  ("העוזר ברמת טיוטות: הוא לא עונה לאורח לבד ..."), which stops being true for the simulator once decision 1 is built.
- `server/services/frontdesk-turn.js:214-219` (model failure) and `:180-184` (daily cap) — `handOffSilently` moves
  the conversation to `human` with `assistantFailed { at, reason }` and sends nothing.

**Where R-04 is written.** R-04 is a row of the front-desk rules table
`docs/frontdesk/assistant-behaviour-rules.md:18` ("Silent on AI failure. When the model call fails the customer gets
no 'small glitch' text; the conversation moves to `human`." — plan 562), restated as plan-level decisions in plans 679
(point 3, "R-04 wins over FD-07"), 701, 702, 719, 731, 732 and in the run's Contract line
`docs/restaurant/restaurant-map.md:785` (679 · C-AI (3)). It is **not** an invariant (`docs/brain/invariants.md`
holds INV-1 … INV-7, none about failures) and **not** an ADR (`docs/brain/decisions/` has none on it). So this plan
changes it by a superseding note in the rules table (R-04 amended, new rows R-22 and R-23), one Contract line in the
restaurant map and `behaviour:` decisions below — no ADR and no `approve arch change`.

## Goals & Success Criteria
**Primary:** in the simulator the assistant answers every test-guest message as a level-1 assistant would, whatever
the business's level, unless a staff member holds the chat; a guest whose turn fails for a technical reason gets one
holding message per guest message, and the conversation still goes to the staff.

- [auto] `pnpm run test:server` → exit 0, including the new and changed cases in `server/test/frontdesk-turn.test.js`
  and `server/test/frontdesk-tables.test.js`.
- [auto] `server/test/frontdesk-turn.test.js`: a test conversation (`setup({ level: 0, test: true })`) with a `SMALL`
  answer → one outbound row with the model's reply, `author: 'ai'`, `suggestion` not set, `status: 'bot'`; the same
  with a full table-kind `request` answer (business without tables) → one request with `test: true` and the
  `fd_ai_will_confirm` sentence sent.
- [auto] same file: a real conversation at level 0 (`setup({ level: 0 })`) is unchanged: no outbound row, the reply
  stored as `suggestion` (the existing level-0 cases still pass untouched).
- [auto] same file: a test conversation at level 0 whose `status` is `human` (a member took over) → `runTurn` returns
  `{ skipped: 'not_bot' }`, no fetch call, no outbound row.
- [auto] same file, the renamed block "R-04 as changed by plan 733": for each of a 500 answer, a timeout,
  `model_exhausted`, `business_cap`, an answer that is not JSON and an answer that fails the schema, at level 1 →
  exactly one outbound row, `author: 'server'`, text `fixedText('fd_ai_holding_default')`; `status: 'human'`,
  `assistantFailed.reason` as plan 701 maps it, `suggestion: 'KEEP'` untouched; one `frontdesk.turn.holding` log line
  `{ group, sent: true }`.
- [auto] same file: with `assistant.handoffText: HANDOFF_TEXT` a failed turn sends `HANDOFF_TEXT`; the daily cap
  (300 `frontdesk_turn` rows today) sends one holding message too; a test conversation at level 0 with a 503 answer
  sends the holding message.
- [auto] same file: no spam — a failed turn, then `runTurn` again on the same conversation (status set back to `bot`,
  no new guest message) with another failure → still exactly one holding row; after a new inbound guest message and
  a third failure → two holding rows.
- [auto] same file: a real conversation at level 0 with a 503 answer → no outbound row, `status: 'human'`,
  `assistantFailed.reason: 'busy'`; `mode: 'suggest'` with a 503 answer → no outbound row, status unchanged.
- [auto] same file: a guardrail block (a keyword message, plan 689) at level 1 still sends the handoff sentence with
  `author: 'ai'` and no holding row; the plan 701 block's `expect(await outbound()).toHaveLength(0)` becomes one
  holding row; the captured log text of the failure cases contains neither `GUEST-SECRET-TEXT` nor the holding text.
- [auto] `server/test/frontdesk-tables.test.js`: `setup({ level: 0, test: true })` with `BOOK(FULL_ASK)` → the
  `fd_ai_offer` button message is sent (not stored as `suggestion`), and `tap('OK:1')` books one booking with
  `test: true`; the existing "level 0" case (real conversation) still stores the offer and a tap writes nothing.
- [auto] `pnpm run test:ci` → exit 0, including `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`: at level 0
  `sim-level` shows `sim_level_0_sim`; at level 1 and 2 `sim_level_1`; no `sim-draft` element at any level even when
  the conversation carries a `suggestion`.
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`) of a business whose assistant level is 0, the
  test guest writes "שלום, אתם פתוחים מחר?" · the assistant's answer appears in the chat within about half a minute,
  no "טיוטת העוזר לצוות" note is shown, and the level line reads "בסימולטור העוזר עונה כמו ברמה 1; לאורחים אמיתיים
  הוא כרגע רק מנסח טיוטות".
- [human] Same chat: take the conversation over as a team member (plan 719's take-over), then write as the guest
  again · the assistant does not answer; after "החזר לעוזר" it answers the next guest message.

## Execution Mode
- Parallel: yes with plans that do not touch `server/services/frontdesk-turn.js`, `server/services/frontdesk-tables.js`,
  `server/test/frontdesk-turn.test.js`, `server/test/frontdesk-tables.test.js` or the simulator page. Plan 732 adds
  cases to `server/test/frontdesk-turn.test.js`; both plans only add or edit their own `describe` blocks, so a merge is
  a plain text merge.
- Concurrent plans: 732
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/frontdesk-turn.js
server/services/frontdesk-tables.js
server/test/frontdesk-turn.test.js
server/test/frontdesk-tables.test.js
src/app/pages/frontdesk/simulator/simulator.page.ts
src/app/pages/frontdesk/simulator/simulator.page.html
src/app/pages/frontdesk/simulator/simulator.page.scss
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
public/assets/data/dictionary.json
docs/frontdesk/assistant-behaviour-rules.md
docs/restaurant/restaurant-map.md
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. The likely case is another server test that asserts "no
outbound row" after a failed level-1 turn (none was found on the Snapshot beyond `server/test/frontdesk-turn.test.js`):
offer `approved: <that test path>` with the one-line change to expect the holding row.
`server/services/outbound.js`, `server/services/inbound.js` and `server/routes/sim.js` are never offered: the plan
needs no change there.

## Architecture Impact

- INV-7: preserves — `server/services/frontdesk-turn.js` still lets only `handleTableIntent` and the engine decide a table; a test conversation of a level-0 business now calls it with `write: true`, so the engine and the `tableHolds` index decide and write test holds exactly as at level 1 (marked `test: true`, as plan 680 does); the holding message is a fixed sentence that states no time, table or confirmation.
- INV-2: preserves — `server/services/frontdesk-turn.js` and `server/services/frontdesk-tables.js` add one read, the newest message of the conversation, filtered by `businessId` and `conversationId` like every other query in the file; no write leaves the conversation's business.

## Reuse Check

- `turnProfile(profile, conversation)` in `server/services/frontdesk-tables.js` — family: none — rung: 4 — why: a three-line pure helper next to that file's own `levelOf`; `frontdesk-turn.js` already requires this file, so both the turn and the tap read one rule; the server has no registry family for services.
- The holding message — family: none — rung: 4 — why: a small function `holdGuest` in `frontdesk-turn.js` beside `handOff`, sending through the one sender `sendOut` and the existing `handoffText` / `fixedText` pattern; no new sender.
- The simulator level line — family: simulator-level-held-draft — rung: 1 — why: the existing `.sim-level` block of plan 719 shows a new dictionary key; the `.sim-draft` block of the same family is removed, not copied.

## Defaults

- loading-and-error-states — exception — why: no new loading or error state; the level line and the existing `ai-failed-note` keep theirs
- hints-in-tooltips — exception — why: no new control; one sentence in the existing level line and one block removed
- empty-state-on-list — exception — why: no list changes; the simulator's guest list and chat are untouched
- app-list-container — exception — why: no list changes in this plan
- one-breakpoint-set — exception — why: no new layout; only the `.sim-draft` rule is removed from the page's SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner whose assistant is still on drafts, I want the simulator to answer me as the assistant would, so that I can see how it talks before FoodVibe turns it on for real guests.
- As a restaurant owner, I want the assistant to stay quiet in the simulator while I hold the chat as a team member, so that the test matches what a real take-over does.
- As a guest, I want a short "we got your message" when the assistant has a technical problem, so that I am not left wondering whether anyone read me.
- As a staff member, I still want the failed conversation in my inbox with its reason, so that a person answers.

## Functional Requirements

### Must Have (P0)

**The simulator answers like level 1 — `server/services/frontdesk-tables.js`, `server/services/frontdesk-turn.js`**
- [ ] `turnProfile(profile, conversation)` (pure, exported from `server/services/frontdesk-tables.js`): when
  `conversation && conversation.test === true` and `levelOf(profile) < 1` → a new object
  `{ ...profile, assistant: { ...(profile.assistant || {}), level: 1 } }`; otherwise `profile` itself. The input is not
  mutated. Doc comment: "A test conversation (the simulator) is answered as level 1 whatever the business's level
  (plan 733, R-23); real guests keep the level."
- [ ] `runTurnInner` wraps the loaded profile once, right after the `findOne`:
  `const profile = turnProfile(stored, conversation)`. Every later use (`levelOf`, `handOff`, `blockTurn`, `preCheck`,
  `applyGuardrails`, `level0`, `deliver`, `handoffSentence`) therefore sees level 1 for a test conversation. No other
  line of the level-0 paths changes, so a real level-0 conversation behaves exactly as today.
- [ ] `onTap` (`:302`) checks `levelOf(turnProfile(tables.profile, conv)) < 1`, so a tap on an offer in the simulator
  of a level-0 business books a test booking.
- [ ] Unchanged on purpose: `if (mode === 'turn' && conversation.status !== 'bot') return { skipped: 'not_bot' }` — a
  conversation a member took over or replied in (plan 719 sets `status: 'human'`) gets no answer in the simulator
  either; `mode: 'suggest'` still only drafts.

**One holding message on a technical failure — `server/services/frontdesk-turn.js`**
- [ ] `holdGuest(db, conversation, { now, profile, mode, log }, group)`: returns without sending when
  `mode !== 'turn'` or `levelOf(profile) < 1` (a real level-0 guest gets nothing from the assistant, as the level
  says). Otherwise it reads the newest message of the conversation
  (`messages.find({ businessId, conversationId }).sort({ at: -1, _id: -1 }).limit(1)`); when that message is not
  `direction: 'in'` it sends nothing (at most one holding message until the guest writes again). Else it sends
  `{ kind: 'text', text }` through `sendOut(..., 'server', { now })` with
  `text = (profile.assistant && profile.assistant.handoffText) || fixedText('fd_ai_holding_default')`, and logs info
  `frontdesk.turn.holding { conversationId, group, sent }` (`sent` false when `sendOut` refused, with its
  `frontdesk.turn.send_refused` line as elsewhere). Never the text.
- [ ] It is called after `handOffSilently` in both failure paths: the daily cap (`:180-184`, group `quota`) and the
  failed model call (`:214-219`, group from `failureReason`), only in `mode === 'turn'`. The status change and
  `assistantFailed` are written first, exactly as today, so the staff get the conversation even if the send fails.
- [ ] Unchanged: a guardrail block (`blockTurn`, plan 689) and a model handoff still send the handoff sentence with
  `author: 'ai'` as today; removal (R-02) as today; no change to `failureReason`.
- [ ] The file's doc comment says: "A technical failure hands the conversation to a person and sends one holding
  message per guest message at level 1 or in a test conversation (plan 733, R-22, which supersedes R-04's silence)."

**The fixed sentence and the level line — `public/assets/data/dictionary.json`** (append only, in `general`)
- [ ] `fd_ai_holding_default`: "קיבלנו את ההודעה, נחזור אליך בהקדם."
- [ ] `sim_level_0_sim`: "בסימולטור העוזר עונה כמו ברמה 1; לאורחים אמיתיים הוא כרגע רק מנסח טיוטות. את הרמה משנה צוות FoodVibe"
- [ ] `sim_level_0` and `sim_draft_label` stay in the file (hotspot, no removal); the simulator no longer uses them.

**The simulator page — `src/app/pages/frontdesk/simulator/`**
- [ ] `simulator.page.html:14` shows `sim_level_0_sim` when `level_() === 0`, `sim_level_1` otherwise.
- [ ] The `draft_` computed (`simulator.page.ts:118-122`) and the `sim-draft` block (`simulator.page.html:176-180`) are
  removed, and the `.sim-draft` rule in `simulator.page.scss`; the held line (`sim-held`, hand back) and
  `ai-failed-note` stay.
- [ ] `simulator.page.spec.ts`: the plan 719 case "says who answers" expects `sim_level_0_sim` at level 0; the case
  "shows the level-0 draft under the chat" becomes "never shows a draft block, also at level 0 with a suggestion".

**Rules and maps**
- [ ] `docs/frontdesk/assistant-behaviour-rules.md`: R-04's row keeps its text and adds "Superseded in part by R-22
  (plan 733): a technical failure now sends one holding message." New rows: **R-22** "One holding message on a
  technical failure. When the model call or the daily cap fails the turn (`assistantFailed` busy / timeout / quota /
  other), the guest gets the business's handoff text, else `fd_ai_holding_default`, once until the guest writes
  again; the conversation still moves to `human`. Not at level 0 for a real guest; guardrail blocks are unchanged."
  (plan 733) · **R-23** "The simulator answers as level 1. A test conversation is answered as at level 1 whatever the
  business's level, unless a member holds it; real guests keep the level." (plan 733).
- [ ] `docs/restaurant/restaurant-map.md`, "Contract extensions (run)": one line
  `733 · C-AI · R-04 superseded in part: a technical failure sends one holding message (R-22); a test conversation is
  answered as level 1 (R-23) · the Human's decisions of 2026-11-25`.
- [ ] `server/breadcrumbs.md` (the `services/frontdesk-turn.js` row): add "plan 733: one holding message on a
  technical failure; a test conversation is answered as level 1 (`turnProfile`)". `src/app/pages/breadcrumbs.md` (the
  `frontdesk/simulator/` row): "the level-0 draft (plan 719)" becomes "the level line says the simulator answers as
  level 1 (plan 733)".
- [ ] `docs/brain/component-families.md` `simulator-level-held-draft`: the Use line drops `.sim-draft` and adds
  "(the draft block was removed by plan 733)"; the family id stays. Then `node scripts/inventory.mjs` and commit
  `docs/brain/inventory.md` only if it changed.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Simulator: the level line at level 0 reads "בסימולטור העוזר עונה כמו ברמה 1; לאורחים אמיתיים הוא כרגע רק מנסח
  טיוטות. את הרמה משנה צוות FoodVibe"; the assistant's answers appear in the chat as guest-visible bubbles; the draft
  note is gone. Levels 1 and 2 show "העוזר עונה לאורחים לבד" as today.
- Guest: after a technical failure, one bubble "קיבלנו את ההודעה, נחזור אליך בהקדם." (or the business's handoff
  text). The inbox and the simulator still show plan 702's failure note to the staff.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the simulator's assistant answer the test guest as at level 1 whatever the business's level — turnProfile helper, runTurnInner and onTap use it, turn and table tests — server/services/frontdesk-tables.js, server/services/frontdesk-turn.js, server/test/frontdesk-turn.test.js, server/test/frontdesk-tables.test.js
- [ ] A2: Send the guest one holding message when the assistant fails for a technical reason — holdGuest after both silent handoffs, one per guest message, not for a real level-0 guest, fd_ai_holding_default key, R-04 tests rewritten — server/services/frontdesk-turn.js, server/test/frontdesk-turn.test.js, public/assets/data/dictionary.json
- [ ] A3: Make the simulator's level line tell the truth and drop the staff-draft note from its chat — sim_level_0_sim key, draft_ block and .sim-draft rule removed, spec cases — src/app/pages/frontdesk/simulator/simulator.page.ts, src/app/pages/frontdesk/simulator/simulator.page.html, src/app/pages/frontdesk/simulator/simulator.page.scss, src/app/pages/frontdesk/simulator/simulator.page.spec.ts, public/assets/data/dictionary.json
- [ ] A4: Write down that rule R-04 changed and where the new behaviour lives — R-04 note, R-22 and R-23, the map's Contract line, breadcrumbs, the family entry and the inventory — docs/frontdesk/assistant-behaviour-rules.md, docs/restaurant/restaurant-map.md, server/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A5: Run every check of this plan and hand Dandan the two simulator checks — test:server, test:ci, build, both lints, inventory check, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: plan 719 (take-over sets `status: 'human'`, back to the assistant on the guest's next message when
  `assistantFailed` and no member), plan 701 (`assistantFailed` reasons), plan 689 (guardrails), plan 680 (table
  offers and taps), R-19 (`sendOut` refuses a test conversation only on a real transport; the simulator's `sim`
  channel is not real).
- New files needed: none.
- Model changes: none; no new persisted field (the "once per guest message" rule reads the newest message instead of
  storing a flag).
- Backend / API: no route or response changes; new log event `frontdesk.turn.holding`.
- Auth and validation: unchanged; the holding row passes `checkStoredDoc('messages', ...)` like the removal sentence
  (`author: 'server'`).
- Security surface: none new; the holding text is the business's own handoff text or a fixed dictionary sentence.
- Data / migration: none. Existing level-0 test conversations simply get answers from the next guest message on.
- Cost: a level-0 business's simulator turns now run the full level-1 path; they were already model calls metered
  with `userId: 'sim'` and outside the daily cap, so no cost change.
- Project checks: the `log-query` Done-when item; logs carry no guest text and no holding text.
- Traps: a holding row has `author: 'server'`, so the `aiTurns` count of plan 689's eight-turn limit does not grow;
  `handOff`'s `keepStatus && levelOf(profile) === 0` must keep reading the wrapped `profile`, so do not re-read the
  stored profile anywhere in `runTurnInner`; the R-04 test block uses `mockResolvedValue` for every call (plan 731's
  retry makes two calls on a bad shape) — assert on outbound rows, never on a fetch count of 1; the no-spam case must
  put the conversation back to `status: 'bot'` itself, because `runTurn` skips a `human` conversation.

## Out of Scope
- Changing what level 0 means for real guests, or who may change the level (the platform admin, plan 719).
- A holding message for a guardrail block (plan 689 already sends the handoff sentence) or in suggest mode.
- Removing `sim_level_0` / `sim_draft_label` from `dictionary.json` (hotspot; a later clean-up may).
- Retrying a failed turn (plans 701, 731).

## Critical Questions
- none

## Execution Notes
- behaviour: R-04 is a rule of the rules table (`docs/frontdesk/assistant-behaviour-rules.md`) and of plans 679/701/719/731/732, not an invariant or an ADR, so it is changed by a superseding note (R-22) and a Contract line, without `approve arch change`.
- behaviour: a test conversation is answered as level 1 by wrapping the profile once per turn (and per tap); a level-2 business stays level 2.
- behaviour: a conversation a member holds (`status: 'human'`) is never answered in the simulator; plan 719's back-to-the-assistant rules decide when it returns.
- behaviour: the holding message is sent at level 1/2 and in any test conversation, never to a real guest at level 0 (at that level the assistant sends nothing to guests; the staff get the conversation as today).
- behaviour: "one per conversation until the guest writes again" is read from the newest message (`direction: 'in'` → send), not stored as a new field.
- behaviour: the holding text is the business's `assistant.handoffText` when set, else the new `fd_ai_holding_default` "קיבלנו את ההודעה, נחזור אליך בהקדם."; the message is authored `server`, like the removal sentence, so it does not count as an assistant turn.
- behaviour: the daily-cap failure (`quota`) also sends the holding message, as it is one of plan 701's technical reasons.
- behaviour: the status change and `assistantFailed` are written before the holding message, so the staff get the conversation even when the send is refused.
- behaviour: `sim_level_0` and `sim_draft_label` stay in `dictionary.json` unused (append-only hotspot); the simulator shows the new key `sim_level_0_sim`.
