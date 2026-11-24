# Plan 719 — The assistant answers the guest by itself: the demo restaurant answers, a stuck conversation goes back to the assistant, and the simulator says who answers

Status: draft
Depends-on: none
Snapshot: dcf66fec99ebb6efcd85fa8228fb9b2fc42fb0f9

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Human (2026-11-24): "In the simulator I write as the guest and the assistant never answers. Only when I open this
chat in the inbox and press 'suggest a reply' does an answer come. I want the answer to be automatic."

Traced on the Snapshot for conversation `cc615e07-abbc-4a49-ae09-e9c095d6fa70` (business `demo_restaurant`, slot
`wt-2`, `.claude/be.log` and the local `foodvibe` database, read-only):

| time (UTC) | what happened | evidence |
| --- | --- | --- |
| 11-23 20:45 | first guest message; the conversation opens as `bot` and the turn runs at **level 0** → it only stores a draft (`suggestion`), nothing reaches the guest | `server/services/conversations.js:23`; `server/services/frontdesk-turn.js:285-289` |
| 11-23 20:46 | the Human answers from the inbox → the member reply moves `bot` → `human` with `assignedTo` | `server/routes/conversations.js:133-137` |
| 11-24 07:00, 07:46 | two guest messages; the conversation is `human`, so no turn runs at all (no `frontdesk.turn` line) | `server/services/inbound.js:48`; be.log line 107 (`inbound.stored`, no turn after it) |
| 07:47 | the Human presses "suggest a reply" → `mode: 'suggest'`, a draft; the Human sends it | be.log 140-157 |
| 07:49:00 | the Human presses "hand back" → `human` → `bot` | be.log 193 (`conversations.moved`) |
| 07:49:37 | a guest message; this time the turn runs (`mode: 'turn'`, `level: 0`, `handoff: false`) and again only stores a draft — the conversation now holds `suggestion: "לאיזה תאריך תרצו להזמין?"`, `status: 'bot'`, and no outbound row | be.log 232-250; `conversations` document |

Root causes, verified on the Snapshot:
1. **The demo restaurant is at level 0 ("drafts only — you send").** `frontDeskProfiles` `demo_rest_profile` stores
   `assistant: { level: 0 }`; it comes from the demo seed, `server/scripts/lib/demo-restaurant-data.js:87`
   (`assistant: { level: 0, tone }`). At level 0 a guest turn never sends (`frontdesk-turn.js:43` `levelOf`,
   `:285-289` → `finishSuggestion`; plan 679 decision "level 0 stores a suggestion, level 1 answers"). Only the
   platform admin can raise the level (`server/routes/generic.js:572-574, 763-765`, `server/routes/admin.js:246`,
   plan 557), so the owner cannot fix it from the app, and the simulator never says which level is on: the level
   shows only on `/frontdesk/settings` (`frontdesk-settings.page.html:275`).
2. **Once a conversation is `human` it never goes back by itself.** A member reply (`conversations.js:133-137`), a
   take-over, and every failed assistant turn (`frontdesk-turn.js:97-103`, `:184`, `:219` — Google busy, timeout,
   quota) set `status: 'human'`; `inbound.js:48` then skips every later guest message, and only the inbox's "hand back"
   (`conversations.js:175-176`) returns it. A failed turn (plan 701: `assistantFailed`) hands the conversation to a
   person **forever** even when no person ever picked it up, and a member who answered once yesterday keeps the
   conversation forever.
3. **Hand back does not answer the guest who is waiting.** `PUT /:id/release` only flips the status; the guest's
   unanswered message waits until the guest writes again.

## Goals & Success Criteria
**Primary:** in the simulator of the demo restaurant, every guest message gets the assistant's answer by itself within
about half a minute, with no "suggest a reply"; for real guests the business's level still decides (level 0 drafts,
level 1 answers); a conversation the assistant gave up on for a technical reason, or that a member left idle for two
hours, goes back to the assistant on the guest's next message; a guardrail handoff (plan 689, R-04) stays with a
person; and the simulator says plainly who answers this conversation.

- [auto] `pnpm run test:server` → exit 0, including the new cases in `server/test/inbound.test.js`,
  `server/test/conversations-router.test.js` and `server/test/seed-demo-restaurant.test.js`.
- [auto] `server/test/inbound.test.js` (new cases, fake turn handler and `setWaitForTest`): (a) a `human`
  conversation with `assistantFailed: { at, reason: 'busy' }` and no `assignedTo` → the next guest message sets
  `status: 'bot'` and the turn handler runs once, and the log has `inbound.back_to_bot` `{ why: 'failed' }`; (b) a
  `human` conversation with `assignedTo: 'st1'` and `heldAt` 2 h + 1 min ago → `bot`, `assignedTo` and `suggestion`
  removed, the turn runs, `why: 'idle'`; (c) the same with `heldAt` 1 h 59 min ago → stays `human`, no turn; (d) a
  `human` conversation with neither `assistantFailed` nor `assignedTo` (a guardrail handoff) → stays `human`, no turn;
  (e) a conversation whose client has `doNotContact` → stays `human`, no turn; (f) a `human` conversation with
  `assignedTo` and **no** `heldAt` (stored before this plan) → stays `human`; (g) the existing case "none once the
  conversation is human (R-03)" still passes with a conversation held by a member (`assignedTo` + recent `heldAt`);
  (h) a burst of two guest messages to a failed conversation runs one turn (R-03 wait unchanged); every moved
  conversation still validates against `conversationSchema`.
- [auto] `server/test/conversations-router.test.js` (new cases): a member reply and `PUT /:id/takeover` store
  `heldAt` (a number, the request time) together with `assignedTo`; a second member reply on a `human` conversation
  updates `heldAt`; `PUT /:id/release` removes `heldAt` and, when the newest message is a guest's inbound, calls the
  turn handler once for that conversation (fake handler, awaited through the returned promise in the test); when the
  newest message is outbound it calls no turn; the existing take-over / release / close cases pass unchanged.
- [auto] `server/test/seed-demo-restaurant.test.js` (new cases): the built demo profile has `assistant.level: 1`;
  with `--write` on a database whose `demo_rest_profile` is at level 0 with no `adminHistory`, the run sets
  `assistant.level: 1` and prints `raised the demo assistant to level 1`; a profile with an `adminHistory` entry or a
  level of 1 or 2 is left as it is; a dry run changes nothing.
- [auto] `src/app/pages/frontdesk/simulator/simulator.page.spec.ts` (new cases, stubbed services): with a profile at
  level 0 the line `sim_level_0` shows (`data-testid="sim-level"`); at level 1 or 2 `sim_level_1`; with no profile
  loaded no line; a thread whose conversation is `human` shows `sim_held_by_staff` and the button `ibx_hand_back`
  (`data-testid="sim-hand-back"`) which calls `ConversationDataService.handBack(id)` once and then re-reads the
  thread; a `bot` conversation at level 0 with a `suggestion` shows the draft under `sim_draft_label`
  (`data-testid="sim-draft"`); at level 1 no draft block; the existing cases pass.
- [auto] `pnpm run test:ci` → exit 0.
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm run lint` → exit 0 and `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Simulator, demo restaurant (`/frontdesk/simulator`, as `demo_host`): start a new test guest and write
  "מתי אתם פתוחים?" · the line above the chat says "העוזר עונה לאורחים לבד" and the assistant's answer appears in the
  chat within about half a minute, without opening the inbox.
- [human] Same guest: open the chat in the inbox, write a reply yourself, come back to the simulator · the line
  "השיחה אצל הצוות — העוזר לא עונה עד שמחזירים אותה אליו" shows with the button "החזרה לעוזר"; press it and write
  another question as the guest · the assistant answers it by itself.

## Execution Mode
- Parallel: yes with plans that do not touch `server/services/inbound.js`, `server/routes/conversations.js`,
  `shared/schemas/entities/conversation.schema.ts` or `src/app/pages/frontdesk/simulator/**`.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/inbound.js
server/routes/conversations.js
shared/schemas/entities/conversation.schema.ts
server/scripts/lib/demo-restaurant-data.js
server/scripts/seed-demo-restaurant.js
server/test/inbound.test.js
server/test/conversations-router.test.js
server/test/seed-demo-restaurant.test.js
src/app/pages/frontdesk/simulator/simulator.page.ts
src/app/pages/frontdesk/simulator/simulator.page.html
src/app/pages/frontdesk/simulator/simulator.page.scss
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
public/assets/data/dictionary.json
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/inventory.md
docs/brain/component-families.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/routes/conversations.js` keeps its member-only chain and `scopeFilter`; the release route only adds a call to the inbound service for the same conversation it already loaded for this business; `server/services/inbound.js` changes no actor or permission; `server/routes/sim.js` is not touched.
- INV-2: preserves — every new write in `server/services/inbound.js` (back to `bot`) and `server/routes/conversations.js` (`heldAt`) filters by the conversation's own `_id` + `businessId`, as the existing `status` writes do; the seed change is local-only and filters by `_id: 'demo_rest_profile'` + `businessId`.
- INV-4: preserves — the new optional `heldAt: z.number().optional()` is added to the one Zod schema in `shared/schemas/entities/conversation.schema.ts`; `pnpm run test:server` rebuilds the generated server schema (`build:schemas`) and the new tests check the moved conversations still validate.
- INV-6: preserves — no new model call path: a turn started by the release route or by a guest message after a failure goes through the existing turn handler (`runTurn` → `askTurnModel` in `server/routes/ai/frontdesk.js`); no key reaches the browser.
- INV-7: preserves — `server/services/frontdesk-turn.js` is not changed; table answers still go through the table engine inside the turn.

## Reuse Check

- `backToBot(db, conversation, { now, log })` in `server/services/inbound.js` — family: none — rung: 4 — why: a private step of the one inbound handler (`handleInbound`, component-families "Plan 675: never a second handler"); no service family exists on the server for it.
- `answerWaiting(db, conversation, { log })` exported from `server/services/inbound.js` — family: none — rung: 4 — why: the release route needs the same "run the turn for the newest guest message" the inbound handler already does; it lives beside `turnHandler` so there is still one way to start a guest turn.
- Simulator level line, held line and draft block — family: none — rung: 4 — why: three short template blocks inside the existing simulator page beside its `ai-failed-note` (plan 702); they reuse `c-btn-ghost` and the page's existing note style, no new shared component or `.c-*` class.

## Defaults

- loading-and-error-states — exception — why: the page's loading and error states (plan 678) are unchanged; the new level line is simply absent while the profile loads or fails, the hand-back button is disabled while it runs and a failure shows `sim_hand_back_failed`
- hints-in-tooltips — exception — why: the new lines are full sentences shown on the page; there is no icon-only control
- empty-state-on-list — exception — why: no new list; the guest list's empty state (plan 678) is unchanged
- app-list-container — exception — why: no new list page; the simulator's layout is unchanged
- one-breakpoint-set — exception — why: the new styles add no `@media` rule; the page's existing breakpoints are unchanged

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner testing my front desk, I want the assistant to answer my test guest by itself in the simulator, so that I see what a real guest will get without pressing anything.
- As a restaurant owner, I want to see in the simulator whether the assistant answers guests or only drafts for my staff, so that I am not left wondering why no answer came.
- As a host, I want a chat the assistant gave up on because Google was busy to be answered again when the guest writes, so that the guest is not left waiting when no one on the team took it.
- As a host who answered a guest yesterday, I want the assistant to answer the guest's new question today, so that a chat I touched once does not stay unanswered.

## Functional Requirements

### Must Have (P0)

**The demo restaurant answers — `server/scripts/lib/demo-restaurant-data.js`, `server/scripts/seed-demo-restaurant.js`**
- [ ] `demo-restaurant-data.js:87`: `assistant: { level: 1, tone: template.assistant.tone }`.
- [ ] `seed-demo-restaurant.js`: after the insert loop, with `--write`, one update
  `{ _id: 'demo_rest_profile', businessId: BUSINESS_ID, 'assistant.level': 0, 'adminHistory.0': { $exists: false } }`
  → `$set: { 'assistant.level': 1, updatedAt: now }`; when it matched, print `raised the demo assistant to level 1`;
  without `--write` print `would raise the demo assistant to level 1` when the stored profile matches, and write nothing.
  Update the file's header comment: "nothing existing is changed, except the demo assistant's level (plan 719)".
  The local-only refusals (`--target=atlas`, `--confirm-host`) are unchanged.

**Back to the assistant — `server/services/inbound.js`**
- [ ] New constant `HUMAN_IDLE_MS = 2 * 60 * 60 * 1000`, exported for the tests.
- [ ] In `afterStored`, before the `status !== 'bot'` return (`:48`), for a conversation with `status: 'human'` (not
  a button tap, which keeps its handler path): it goes back to the assistant when **both** hold:
  - the guest may be contacted: the conversation's client (`conversation.clientId`, same `businessId`) has no
    `doNotContact` (R-02 removal keeps a person for good);
  - and either **failed**: `conversation.assistantFailed` is set and `assignedTo` is not set (the assistant gave up for
    a technical reason and no member took it), or **idle**: `assignedTo` is set and `heldAt` is a number older than
    `now - HUMAN_IDLE_MS`.
  A `human` conversation with neither (a guardrail handoff of plan 689: the guest asked for a person, the turn limit,
  a blocked reply, outside hours) stays `human`; a conversation with `assignedTo` and no `heldAt` stays `human`.
- [ ] `backToBot`: one `updateOne({ _id, businessId, status: 'human' }, { $set: { status: 'bot', updatedAt: now },
  $unset: { assignedTo: '', heldAt: '', suggestion: '' } })`; only when `matchedCount` is 1 it logs `info`
  `inbound.back_to_bot` `{ conversationId, why: 'failed' | 'idle' }` and the flow continues to the R-03 wait and the
  turn exactly as for a `bot` conversation (the fresh read after the wait sees `bot`). `assistantFailed` is not
  removed here; the next completed turn removes it (plan 701, `frontdesk-turn.js:160-168`).
- [ ] New exported `answerWaiting(db, conversation, { log })`: reads the newest message of the conversation
  (`businessId`, `conversationId`, sort `{ at: -1, _id: -1 }`, limit 1); when it is `direction: 'in'` and
  `author: 'guest'`, calls `turnHandler(db, conversation, { log })` and returns its promise; otherwise returns
  `Promise.resolve()`. No wait (the guest is already waiting).
- [ ] Logs carry ids and enums only — never text, a name or a phone.

**Who holds it — `server/routes/conversations.js`, `shared/schemas/entities/conversation.schema.ts`**
- [ ] Schema: `heldAt: z.number().optional()` beside `assignedTo`, with a comment "when a member last took over or
  replied (plan 719)".
- [ ] Member reply (`POST /:id/messages`, `:133-137`): the `bot` → `human` update also sets `heldAt: now`; on a
  conversation that is already `human`, one more `updateOne({ _id, businessId, status: 'human' }, { $set: { heldAt:
  now } })`.
- [ ] `PUT /:id/takeover` sets `heldAt: now` with `assignedTo`.
- [ ] `PUT /:id/release` also unsets `heldAt`; after a successful move to `bot` it calls
  `answerWaiting(db(), updated, { log: logOf(req) })` without awaiting it in the answer path (the response is sent
  first; the promise's rejection is caught, logged as `conversations.release.turn_failed` and sets nothing — the turn
  handler already hands off on its own failures). Export nothing new from the route; the test awaits the turn through
  `setTurnHandler`.

**The simulator says who answers — `src/app/pages/frontdesk/simulator/`**
- [ ] Inject `FrontDeskProfileDataService` and call `ensureLoaded()` in the constructor when `allowed_()`;
  `level_ = computed(() => this.profiles.profile_()?.assistant.level ?? null)`.
- [ ] Under the existing banner (`simulator.page.html:7-10`), when `level_() !== null`: `<p class="sim-level"
  data-testid="sim-level" role="status">` with icon `bot` and `sim_level_0` (level 0) or `sim_level_1` (level 1 or 2).
- [ ] Above the reply box, beside `ai-failed-note`, when the open thread's conversation is `human`:
  `<p class="sim-held" data-testid="sim-held">` with `sim_held_by_staff` and a `c-btn-ghost` button
  `data-testid="sim-hand-back"` labelled `ibx_hand_back` (icon `undo-2`), disabled while `handBackBusy_()`; it calls
  `this.data.handBack(id)`, then `afterAction()` and `readThread()`; a failed result shows `sim_hand_back_failed`
  through `UserMsgService.onSetErrorMsg`.
- [ ] When the conversation is `bot`, `level_() === 0` and `conversation.suggestion` is a non-empty string: a block
  `data-testid="sim-draft"` under the thread with the label `sim_draft_label` and the draft text (plain text
  interpolation, no HTML), so the owner sees what the assistant drafted for the staff.
- [ ] Styles in `simulator.page.scss` with logical properties only, the page's existing tokens; the new lines reuse
  the `ai-failed-note` layout (icon + text in a row).
- [ ] The icons `bot` and `undo-2` are already registered in `src/app/app.config.ts` (`Bot`, `Undo2`); no change there.

**Dictionary — `public/assets/data/dictionary.json` (append only)**
- [ ] `sim_level_0`: "העוזר ברמת טיוטות: הוא לא עונה לאורח לבד, אלא מכין טיוטה לצוות בתיבת השיחות. את הרמה משנה צוות FoodVibe"
- [ ] `sim_level_1`: "העוזר עונה לאורחים לבד"
- [ ] `sim_held_by_staff`: "השיחה אצל הצוות — העוזר לא עונה עד שמחזירים אותה אליו"
- [ ] `sim_draft_label`: "טיוטת העוזר לצוות (לא נשלחה לאורח)"
- [ ] `sim_hand_back_failed`: "לא הצלחנו להחזיר את השיחה לעוזר"

### Should Have (P1)
- [ ] `server/breadcrumbs.md`: the `services/inbound.js` row adds "back to the assistant after a failure or 2 h idle;
  `answerWaiting`"; the `scripts/seed-demo-restaurant.js` row adds "raises the demo assistant to level 1".
- [ ] `src/app/pages/breadcrumbs.md`: the `frontdesk/simulator/` row adds "the assistant level line, who holds the
  chat with hand back, the level-0 draft".
- [ ] `docs/brain/component-families.md`: the `simulator-page` entry adds the three lines; the Plan 675 inbound line
  adds "a `human` conversation goes back to `bot` on the guest's next message after a failed turn or 2 h member idle
  (plan 719) — never a second handler".
- [ ] `docs/brain/inventory.md`: only if it lists the simulator page's parts or `inbound.js` exports.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL page; the level line sits under the "test mode" banner, the held line and the draft sit at the bottom of the
  phone frame above the reply box, as the failure note of plan 702 does.
- The simulator plays the guest, so the draft block is labelled as the staff's draft, never as a guest bubble.
- New dictionary keys: `sim_level_0`, `sim_level_1`, `sim_held_by_staff`, `sim_draft_label`, `sim_hand_back_failed`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make the demo restaurant's assistant answer guests by itself — level 1 in the demo data, the seed raises a stored level-0 demo profile once, tests — server/scripts/lib/demo-restaurant-data.js, server/scripts/seed-demo-restaurant.js, server/test/seed-demo-restaurant.test.js
- [ ] A2: Record when a member took the chat, so an idle one can be told apart — heldAt in the schema, set on reply and take over, removed on hand back, tests — shared/schemas/entities/conversation.schema.ts, server/routes/conversations.js, server/test/conversations-router.test.js
- [ ] A3: Give a stuck chat back to the assistant on the guest's next message — after a failed turn with no member, or 2 h member idle; guardrail handoffs and do-not-contact stay with a person; tests for every case — server/services/inbound.js, server/test/inbound.test.js
- [ ] A4: Answer the waiting guest when a member hands the chat back — answerWaiting in inbound, called by the release route, tests — server/services/inbound.js, server/routes/conversations.js, server/test/conversations-router.test.js
- [ ] A5: Show in the simulator who answers — the level line, the held line with hand back, the level-0 draft, dictionary keys, spec cases — src/app/pages/frontdesk/simulator/simulator.page.ts, src/app/pages/frontdesk/simulator/simulator.page.html, src/app/pages/frontdesk/simulator/simulator.page.scss, src/app/pages/frontdesk/simulator/simulator.page.spec.ts, public/assets/data/dictionary.json
- [ ] A6: Update the maps the next plan reads — server/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md (only if it lists these parts)
- [ ] A7: Run every check of this plan and record the evidence — test:server, test:ci, build, both lints, log-query; evidence into Execution Notes. The builder does not run the seed against any database: the Planner runs the demo seed with --write in slot wt-2 after the merge, so `demo_rest_profile` is at level 1 before the Human's cards

## Technical Considerations
- Dependencies: `handleInbound` / `afterStored` (675), the member routes (687), `runTurn` / `handOff` (679, 689),
  `assistantFailed` (701), the simulator (678, 702), the platform admin's level (557).
- New files needed: none.
- Model changes: `conversation.heldAt` (optional number).
- Backend / API: no new route; `PUT /api/v1/conversations/:id/release` may start a turn; member reply and take over
  store `heldAt`.
- Auth and validation: unchanged; the level stays platform-admin only (557) — the seed is a local developer script.
- Security surface: none new; R-02 do-not-contact is checked before a conversation goes back to the assistant.
- Data / migration: none (optional field; conversations stored before this plan have no `heldAt` and keep today's
  behaviour until a member touches them again).
- Cost: a failed conversation retries one turn per new guest message (the existing R-03 wait joins bursts; the daily
  turn cap of `frontdesk-turn.js:178-187` still applies to real guests).
- Project checks: the `log-query` Done-when item; schemas in `shared/schemas`; logs carry no guest text; Hebrew
  strings through `translatePipe`.
- Traps: the R-03 wait re-reads the conversation (`inbound.js:50-51`) — write `bot` **before** the wait, or the fresh
  read sees `human` and coalesces; the move to `bot` must be conditional on `status: 'human'` so a member's take-over
  in the same second wins; `answerWaiting` must not run the 6 s wait; a button tap keeps its handler path and never
  moves the status.

## Out of Scope
- Changing what level 0 means for real guests (it still drafts only), or letting the owner change the level.
- A simulator-only override that answers at level 0.
- An automatic draft for a `human` conversation at level 0.
- Guardrail handoffs (plan 689) going back to the assistant by themselves.
- The inbox page (it already has take over / hand back; it shows the new behaviour without a change).
- A migration that sets `heldAt` on old conversations.

## Critical Questions
- none

## Execution Notes
- behaviour: the demo restaurant moves to level 1 ("answers and collects details") because it is the business the Human tests the assistant with; other businesses keep their level, and the level stays the platform admin's to change (plan 557). The seed raises a stored demo profile only when it is still at 0 and the admin never moved it (`adminHistory` empty).
- behaviour: at level 0 the assistant still never answers a guest, the simulator included — the simulator mirrors what a real guest gets; instead it says so and shows the draft.
- behaviour: a conversation the assistant handed off for a technical reason (`assistantFailed`) with no member on it goes back to the assistant on the guest's next message; R-04 stays — the failed turn itself sent nothing.
- behaviour: a conversation a member took (reply or take over) goes back to the assistant on the guest's next message after 2 hours with no member reply; within 2 hours it stays with the member. Old conversations with no `heldAt` stay with the member until a member replies again.
- behaviour: a guardrail handoff (the guest asked for a person, the turn limit, a blocked reply, outside hours, a model handoff) and a do-not-contact guest stay with a person until a member hands it back.
- behaviour: hand back answers the guest's waiting message at once (no 6 s wait); when the newest message is ours, nothing runs.
- behaviour: going back to the assistant clears `assignedTo`, `heldAt` and the old `suggestion`, as hand back does today.
- checked: 675, 676, 677, 678, 681, 687, 701, 702 (built on `chore/restaurant-staging`; this plan builds on them, none is the same work).
