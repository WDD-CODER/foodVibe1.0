# Plan 678 — The simulator: a phone chat as a test guest, with buttons, the window clock and clear test data

Status: draft
Depends-on: 675, 676, 677, 687
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
The conversation channel is built before any real phone is connected (brief D4): the first stage is internal
testing, and a simulator inside the app must behave like the real channel with no connection to it. The server
side exists after plans 675, 676 and 687 — a "guest sends" route, a route that runs the reminder now, a route that
clears test data. Nothing lets the owner use them. This plan builds `/frontdesk/simulator`: a phone-shaped chat in
which the owner writes as a test guest, sees what the business answers, taps the buttons the business sends, sees
delivery ticks and the 24-hour window clock, makes the reminder happen now, and clears everything the test created.
It is map row R16 of the Restaurant program (`docs/restaurant/restaurant-map.md`, spec RS-08 "The simulator"), and
it is the test surface of every later messaging and assistant plan.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/app.routes.ts:188–204`: the routes under `frontdesk/` (`settings`, `onboarding`, `knowledge`) are lazy
  with `canActivate: [authGuard, moduleGuard(['frontdesk'])]`. No route `frontdesk/simulator`.
- `src/app/core/components/tab-chips/tab-chips.component.ts:49`: every path that starts with `/frontdesk` already
  maps to the chip group `frontdesk`; no chip is needed for a new page under it.
- `src/app/core/services/permission.service.ts:50`: `isOwner_` is true for the owner and for a consultant;
  `src/app/core/services/user.service.ts:41`: `isPlatformAdmin_`.
- `src/app/core/services/confirm-modal.service.ts` (`ConfirmModalService`) is the shared confirmation dialog
  (family `modal-controller`).
- `src/app/core/services/http-storage.adapter.ts:11–29`: the `API` map has no `sim` entry.
- Lucide icons registered in `src/app/app.config.ts`: `flask-conical`, `send`, `trash-2`, `clock`, `user-plus`,
  `refresh-cw`, `message-circle`. Not registered: `smartphone`, `fast-forward`.
- Dictionary: no key starts with `sim_`. `cancel` "ביטול", `retry` "נסה שוב" exist.
- `shared/schemas/phone.ts:6`: `normalizePhone`.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): `POST /api/v1/sim/inbound`
  and `DELETE /api/v1/sim/test-data` (675); `POST /api/v1/sim/clock` (676); the conversations reads (687);
  `app-chat-thread`, `ConversationDataService`, `API.conversations`, the `chat_*` and `tpl_*` dictionary keys, the
  inbox page and its "בדיקה" filter (677).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-CHANNEL (the simulator part)**
- `POST /api/v1/sim/inbound { phone, name?, text?, buttonId? }` (owner or platform admin; `frontdesk` module):
  the simulator's "guest sends" — it calls the same `handleInbound` with `channel: 'sim'`.
  `POST /api/v1/sim/clock { conversationId, job: 'reminder' | 'late' }` runs that job for the test booking now.
  `DELETE /api/v1/sim/test-data` (C-TESTDATA).
- Nothing outside `server/services/channels/**` and `server/routes/sim.js` / `webhooks-whatsapp.js` may branch on
  the channel name.

**C-TESTDATA (R13 server, R16 screen)**
- Everything the simulator creates carries `test: true`: the client (kind `lead`, tag `test`), conversation,
  messages, request, booking, holds, waiting-list entry.
- `test: true` rows are excluded from `/stats/**`, the business report, the CSV exports, client counters, the
  platform tables, `decisionLog` and learning; they never reach a `whatsapp` transport.
- `DELETE /api/v1/sim/test-data` (owner) removes every `test: true` row of the business in these collections and
  releases their holds.

**The routes this plan calls** (details copied from plans 675 and 687):
- `POST /api/v1/sim/inbound`: `phone` with 9–15 digits after `normalizePhone`, `name` ≤ 80, `text` ≤ 4000,
  `buttonId` ≤ 100, one of `text` / `buttonId` needed (400 `BAD_INPUT`); 409 `REAL_CLIENT` when the phone belongs
  to a real client of the business; 200 `{ conversationId, messageId }`, answered without waiting for the
  business's reply.
- `GET /api/v1/conversations?test=1` → `{ conversations, now }` — only the test conversations, each with
  `client: { _id, name, phone, tags }` and `last`.
- `GET /api/v1/conversations/:id/messages` → `{ conversation, messages, now }`. It sets the conversation's
  `unread` to 0 — see Critical Questions and "Reading without marking as read" in Must Have.
- `POST /api/v1/sim/clock { conversationId, job }` (plan 676) → 200 `{ job, done: boolean, reason? }`: `done: true`
  when the job ran for the conversation's test booking; `done: false` with a `reason` (`NO_BOOKING`, `ALREADY`, …)
  when there was nothing to run.
- `PUT /api/v1/waitlist/:id/notify` (plan 673, changed by 676) answers the entry plus `sent: boolean`.
- Test clients carry the tag `test` (the client schema has no `test` field); plan 675 leaves hiding them in the
  browser to this plan.
- `DELETE /api/v1/sim/test-data` → 200 with the counts of what was removed.

## Goals & Success Criteria
**Primary:** the owner opens the simulator, writes as a test guest, sees the business's answer in a phone-shaped
chat, taps a button the business sent, makes the reminder arrive now, and clears the test data — and nothing
leaves the app.

- [auto] `pnpm run test:ci` → exit 0, including:
  - `src/app/pages/frontdesk/simulator/services/simulator.service.spec.ts`: `send(phone, name, text)` posts
    `{ phone, name, text }` and returns the conversation id; `tap(phone, buttonId)` posts `{ phone, buttonId }`;
    `runJob(conversationId, 'reminder' | 'late')` posts the clock body; `clearTestData()` sends the DELETE; a 409
    `REAL_CLIENT`, a 400 `BAD_INPUT` and a 4xx of the clock each come back as `{ ok: false, code }`; no log line
    holds the phone, the name or the text (the spec captures `LoggingService`).
  - `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`: the banner "מצב בדיקה — שום הודעה לא נשלחת
    החוצה" is always shown; a staff user sees only the message "הסימולטור פתוח לבעל העסק בלבד" and no chat; the
    guest list shows the test conversations by name and phone; "אורח חדש" needs a name and a phone of 9–15 digits
    before "התחלת שיחה" is enabled; sending "שלום" calls `send` once, empties the box and shows the bubble at the
    inline end (the guest's side); the thread is `app-chat-thread` with `perspective` `guest` and
    `buttonsEnabled` true; a tap on a button calls `tap` with its id; the window line shows the time left from the
    server's `now`; the two clock buttons are disabled while the conversation has no `bookingId`; "ניקוי נתוני
    בדיקה" opens the confirmation and calls `clearTestData` only on confirm, after which the guest list is empty;
    a 409 `REAL_CLIENT` shows "המספר הזה שייך ללקוח אמיתי. בחרו מספר אחר"; a failed send keeps the typed text.
  - `src/app/core/services/client-data.service.spec.ts`: `realClients_` leaves out every client with the tag
    `test` and keeps the rest; `src/app/pages/clients/components/client-list/client-list.component.spec.ts`: a
    client tagged `test` is not in the list and `test` is not among the tag filters;
    `src/app/shared/client-picker/client-picker.component.spec.ts`: a client tagged `test` is not offered;
    `src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.spec.ts`:
    the clients file has no client tagged `test` and the bookings file no booking with `test: true`.
  - `src/app/core/services/waitlist-data.service.spec.ts`: `notify` returns the answer's `sent`;
    `src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts`: after "השולחן מוכן" the
    message is "ההודעה נשלחה ללקוח" when `sent` is true and "סומן. לא נשלחה הודעה" when it is false, and the
    button's tooltip is the new hint.
  - `src/app/pages/inbox/inbox.page.spec.ts` (one new case): an owner sees the header link "סימולטור" to
    `/frontdesk/simulator`; a staff user does not.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse`
  → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/678-simulator-screen-phone-chat-as-a-test-guest.plan.md`
  → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/frontdesk/simulator` (the spec answers the sim and conversation calls itself, stateful: after the inbound
  post the thread holds the guest's message and an answer "שלום, איך אפשר לעזור?" from the business) · start a
  guest "אורח בדיקה" with the phone `0500000001`, type "שלום" and press send · the chat shows "שלום" and then
  "שלום, איך אפשר לעזור?" — `e2e/ui/678-1.spec.ts`, screenshot `screens/678-1.png`.
- [ui] `/frontdesk/simulator` (same stubs; the conversation has a `bookingId`; the clock post adds a reminder
  template message with the buttons "מגיעים" and "מבטלים"; the inbound post with `buttonId` `CANCEL:…` adds the
  message "ההזמנה בוטלה") · open the guest, press "הרצת תזכורת עכשיו", then tap "מבטלים" · the two buttons appear
  after the first press and the chat shows "ההזמנה בוטלה" after the tap — `e2e/ui/678-2.spec.ts`, screenshot
  `screens/678-2.png`.
- [ui] `/frontdesk/simulator` (same stubs, the DELETE answers 200 and the list read then answers no conversation)
  · press "ניקוי נתוני בדיקה", then the confirmation's confirm button · the guest list shows "אין אורחי בדיקה" —
  `e2e/ui/678-3.spec.ts`, screenshot `screens/678-3.png`.
- [human] Dandan, on the run branch with the local servers: he writes as a guest in the simulator on his laptop,
  answers from `/inbox` (filter "בדיקה") on his phone, and each side shows the other's message within about ten
  seconds; the chat looks like a phone chat and the banner makes it clear nothing is sent.
- [human] the list's page with no items · open the page · a message says the list is empty (here: the guest list with no test guest).
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (here: the simulator with the conversations read failing).
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (here: "ניקוי נתוני בדיקה").

## Execution Mode
- Parallel: no — second plan of run `rs-conv-ui` (677, then 678). It appends to
  `public/assets/data/dictionary.json`, `src/app/app.routes.ts` and `src/app/app.config.ts`, and edits the inbox
  page of 677.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/simulator/**
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
src/app/pages/frontdesk/simulator/services/simulator.service.spec.ts
src/app/pages/inbox/inbox.page.ts
src/app/pages/inbox/inbox.page.html
src/app/pages/inbox/inbox.page.spec.ts
src/app/core/services/conversation-data.service.ts
src/app/core/services/conversation-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/client-data.service.ts
src/app/core/services/client-data.service.spec.ts
src/app/pages/clients/components/client-list/client-list.component.ts
src/app/pages/clients/components/client-list/client-list.component.spec.ts
src/app/shared/client-picker/client-picker.component.ts
src/app/shared/client-picker/client-picker.component.spec.ts
src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.ts
src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.spec.ts
src/app/core/services/waitlist-data.service.ts
src/app/core/services/waitlist-data.service.spec.ts
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.ts
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.html
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
e2e/ui/678-1.spec.ts
e2e/ui/678-2.spec.ts
e2e/ui/678-3.spec.ts
screens/678-*.png
src/app/core/services/async-storage.service.spec.ts
src/app/core/services/trash.service.spec.ts
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
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

- INV-1: preserves — the simulator is a member's screen: its calls carry the owner's token, the server authorises them (owner or platform admin) and takes the business from the token; the one change to `conversation-data.service.ts` is an optional read flag, `waitlist-data.service.ts` only passes one more answer field on, and `client-data.service.ts` gains a computed that hides test clients from lists — it narrows what is shown and widens nothing. The simulated guest is test data written by `server/routes/sim.js`, not a second door for a real guest: the public router and the future webhook stay the only ways a non-member writes.
- INV-6: preserves — the glob `src/app/**/*ai*` matches only the word "waitlist" in the two waiting-list files this plan edits (a tooltip and a message); the browser makes no model call. When the assistant of plan 679 answers a test guest it does so on the server.
- INV-7: preserves — the screen shows messages the server stored; it offers, confirms and moves no table.

## Reuse Check

- `SimulatorPage` (`src/app/pages/frontdesk/simulator/`) — family: none — rung: 4 — why: no screen plays a guest; it is a page of its own, built from shared pieces (`app-page-header`, `app-chat-thread`, `app-empty-state`, `app-form-field`), with no new shared component.
- The chat — family: none — rung: 4 — why: `app-chat-thread` of plan 677 used as it is (`perspective: 'guest'`, `buttonsEnabled: true`), no new piece; its family `chat-thread` is registered by 677 and is not on `main` when this plan is saved, so the gate cannot name it yet.
- `SimulatorService` (`src/app/pages/frontdesk/simulator/services/simulator.service.ts`) — family: http — rung: 3 — why: a page-scoped client of the three `sim` routes through `HttpClient` and the `API` map, like `StockCountService`; the thread and the guest list come from `ConversationDataService` of plan 677.
- Guest list rows — family: list-page — rung: 2 — why: single-line `.c-list-row` buttons in a side column; no search, sort or selection.
- New-guest fields and the message box — family: form-field — rung: 1 — why: `app-form-field` rows with the app's input engine.
- The banner — family: feedback — rung: 2 — why: the amber notice look of `app-front-desk-status-banner`, as a page-local line with the classes that banner uses; the banner component itself reads the profile's status and cannot carry this text.
- Clock and clear buttons, the inbox link — family: engine-classes — rung: 1 — why: `c-btn-ghost`, `c-btn-primary`.
- Clear confirmation — family: modal-controller — rung: 1 — why: `ConfirmModalService` as it is.
- `realClients_` on `ClientDataService` — family: entity-data-service — rung: 2 — why: one more computed on the existing client service, read by the list, the picker and the export.
- Waiting-list tooltip — family: feedback — rung: 1 — why: the native `[attr.title]` plus `aria-label` the drawer of plan 673 already has on that button; only its key changes.
- Empty guest list, owner-only message, failed read — family: empty-state — rung: 1 — why: `app-empty-state` with a message key (and the retry action).
- Loading and messages — family: feedback — rung: 1 — why: `app-loader`, `UserMsgService`, `LoggingService`.
- Route — family: module-gate — rung: 1 — why: `moduleGuard(['frontdesk'])` as the other `frontdesk/` pages.

## Defaults

- empty-state-on-list — applies — how: the shared empty-state piece
- loading-and-error-states — applies — how: the shared loading and error pieces
- app-list-container — exception — why: the guest list is a short side column of a test tool, not a list page; its rows are single-line `c-list-row`s
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- hints-in-tooltips — exception — why: the page has no dialog of its own; the confirmation is the shared confirm dialog with its own text
- anchored-popup — exception — why: the plan adds no floating box
- leave-and-return — exception — why: the link to the inbox is plain navigation; a test chat has nothing to save before leaving
- confirm-destructive-action — applies — how: the shared confirm dialog

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner, I want to write to my own business as if I were a guest, inside the app, so that I see what a
  guest would get before any real phone is connected.
- As the owner, I want to tap the buttons the business sends and to make the reminder arrive now, so that I can
  test a whole booking — confirm, reminder, cancel — in two minutes and not in two days.
- As the owner, I want one button that removes everything my tests created, so that test guests and test bookings
  never mix with my real ones.
- As the product owner, I want a clear line on the screen that nothing is sent outside, so that nobody is afraid to
  press.

## Functional Requirements

### Must Have (P0)
- [ ] **Route and entry.** `frontdesk/simulator`, lazy to `SimulatorPage`, `canActivate: [authGuard,
  moduleGuard(['frontdesk'])]`. No chip. Entry: the inbox page's header (`header-actions` of its
  `app-page-header`) gains the link "סימולטור" (`c-btn-ghost`, icon `smartphone`, key `sim_link`) to
  `/frontdesk/simulator`, shown when `permission.isOwner_()` or `user.isPlatformAdmin_()`.
- [ ] **Who may use it.** The owner (and a consultant, who has the owner's rights) or a platform admin. Anyone
  else who opens the address sees `app-page-header` and `app-empty-state` with `sim_owner_only`, and the page makes
  no sim call.
- [ ] **The banner.** Under the page header, always: an amber notice line with the icon `flask-conical` and
  `sim_banner` "מצב בדיקה — שום הודעה לא נשלחת החוצה". It never hides.
- [ ] **Layout.** Desktop and tablet (≥ 768 px): two columns — at the inline start a side column (18rem) with the
  guest list, the new-guest fields, the window line, the two clock buttons and the clear button; at the inline end
  the phone: a frame 24rem wide at most, centred in its column, with a rounded border, the guest's name on its top
  bar, the thread in the middle (it scrolls) and the message box at its bottom. Phone (≤ 767 px): one column — the
  side column's content first, collapsed to one line ("אורח: <name>" and a button `sim_change_guest` that opens it)
  once a guest is chosen, then the chat at full width with no frame border.
- [ ] **Guest list.** On open, `ConversationDataService.list({ test: true })`; each test conversation is one
  line (the client's name, the phone) and choosing it opens its chat. While loading: `app-loader`. None:
  `app-empty-state` with `sim_no_guests`. A failed read: `sim_load_failed` with "נסה שוב". The chosen guest is
  marked (`aria-current="true"`).
- [ ] **New guest.** The button "אורח חדש" (icon `user-plus`) shows two fields: name (1–80 characters) and phone
  (digits, spaces, `+`, `-`; 9–15 digits after `normalizePhone`), and "התחלת שיחה", enabled only when both are
  valid. Pressing it makes that guest the chosen one with an empty chat; nothing is sent to the server until the
  first message. "ביטול" closes the two fields and keeps the earlier guest.
- [ ] **Writing as the guest.** The message box: a text area (1–4 rows, at most 4000 characters) and the send
  button (icon `send`, label `sim_send`). Enter sends, Shift+Enter is a new line; on a phone only the button sends.
  Empty: disabled. Send → `SimulatorService.send(phone, name, text)`. Success: the box empties and keeps focus, the
  answer's `conversationId` becomes the open conversation, and the thread is read at once. 409 `REAL_CLIENT`:
  `sim_real_client`, the text stays, and for a new guest the two fields open again. Any other failure:
  `sim_send_failed`, the text stays.
- [ ] **The chat.** `app-chat-thread` with `perspective: 'guest'` (the guest's messages at the inline end, the
  business's at the inline start), `buttonsEnabled: true`, `now` from the server. A tap on a button →
  `SimulatorService.tap(phone, buttonId)`; while it runs the buttons are disabled; a failure shows
  `sim_send_failed`. The delivery state under the guest's own messages and the author tag under the business's
  messages are drawn by the thread as in the inbox.
- [ ] **Reading without marking as read.** The simulator reads the thread as the guest, so it must not clear the
  business's unread number. `ConversationDataService.open(id, { peek: true })` adds `peek=1` to the messages read
  and does not touch the row's `unread` in the browser. The route of plan 687 must leave `unread` alone when
  `peek=1` is sent (Critical Questions); when the merged route has no such flag, the Worker stops and offers
  `approved: server/routes/conversations.js` (one condition around the reset, and its test in
  `server/test/conversations-router.test.js`).
- [ ] **Refresh.** While a conversation is open and the document is visible, the thread is read every 2 s for the
  30 s after each send, tap or clock run (the business's answer arrives after the server's short wait for more
  messages), and every 10 s otherwise; the guest list is read again after each first message of a new guest. The
  timers stop when the document is hidden and when the page is destroyed. No websocket.
- [ ] **The window clock.** In the side column, for the open conversation: `sim_window_open` with the hours and
  minutes left (`windowExpiresAt` minus the server's `now`, recomputed on every thread read), or
  `sim_window_closed`. No control changes the window in this plan.
- [ ] **Jump the clock.** Two buttons under the window line, each with the icon `fast-forward`: "הרצת תזכורת
  עכשיו" → `runJob(id, 'reminder')` and "סימון איחור עכשיו" → `runJob(id, 'late')`. Both are disabled, with the
  line `sim_clock_needs_booking`, while the open conversation has no `bookingId`. The answer is `{ job, done, reason? }`: `done: true` →
  `sim_job_ran` and the thread is read at once; `done: false` → `sim_job_nothing` ("אין מה להריץ עכשיו"), whatever
  the reason. A failed call: `sim_job_failed`.
- [ ] **Test guests stay out of the real lists.** `ClientDataService` gains `realClients_` (a computed:
  `allClients_` without the clients whose `tags` hold `test`). The clients list (`client-list.component.ts:94`,
  `baseClients_`), the client picker's search list and the clients CSV of the data export card
  (`data-export-card.component.ts:152`) read `realClients_` instead of `allClients_`; the bookings CSV (line 161)
  leaves out bookings with `test: true`, as the requests CSV already leaves out test requests. Nothing else
  changes in those three pieces. A test client is still found by id (the inbox shows its name from the server).
- [ ] **The waiting list says the truth about "table is ready".** Plan 676 makes `PUT /waitlist/:id/notify` send
  the message when the guest has an open conversation, so the hint of plan 673 ("no message is sent") is no longer
  true. `WaitlistDataService.notify` returns the answer's `sent`; the drawer's "השולחן מוכן" button gets the new
  hint `wl_notify_hint_sends` as its tooltip (the old key `wl_notify_hint` stays in the dictionary, unused), and
  after the press the message is `wl_notify_sent` when `sent` is true and `wl_notify_marked` when it is false.
- [ ] **Clear test data.** The button "ניקוי נתוני בדיקה" (`c-btn-ghost`, icon `trash-2`) at the end of the side
  column → `ConfirmModalService` with `sim_clear_confirm_title` and `sim_clear_confirm_text`; on confirm
  `clearTestData()`. Success: `sim_cleared`, the open chat closes, the guest list is read again. Cancel: nothing.
  Failure: `sim_clear_failed`, nothing changes on the screen.
- [ ] **Open in the inbox.** On the phone frame's top bar, a link (icon `message-circle`, `sim_open_inbox`) to
  `/inbox/<conversationId>`, shown once the conversation exists.
- [ ] **Leaving.** Leaving the page or choosing another guest drops a typed, unsent message with no question.
- [ ] **Client and path.** `SimulatorService` with `send`, `tap`, `runJob`, `clearTestData`, each returning
  `{ ok: true, … } | { ok: false, code }` and logging an event name, the status and the code only.
  `API.sim` (`(path: string) => ${API_ROOT}/sim/${path}`) is appended to the `API` map.
- [ ] **Icons and words.** Register `Smartphone` and `FastForward` in `src/app/app.config.ts`. Dictionary keys
  (all new, appended): `sim_link` "סימולטור", `sim_title` "סימולטור שיחות", `sim_banner`
  "מצב בדיקה — שום הודעה לא נשלחת החוצה", `sim_owner_only` "הסימולטור פתוח לבעל העסק בלבד", `sim_guests`
  "אורחי בדיקה", `sim_no_guests` "אין אורחי בדיקה", `sim_load_failed` "לא הצלחנו לטעון את אורחי הבדיקה",
  `sim_new_guest` "אורח חדש", `sim_guest_name` "שם האורח", `sim_guest_phone` "טלפון האורח", `sim_start`
  "התחלת שיחה", `sim_change_guest` "החלפת אורח", `sim_guest_label` "אורח: {name}", `sim_placeholder`
  "כתבו כמו לקוח", `sim_send` "שליחה", `sim_send_failed` "ההודעה לא נשלחה", `sim_real_client`
  "המספר הזה שייך ללקוח אמיתי. בחרו מספר אחר", `sim_window_open` "חלון 24 השעות פתוח עוד {time}",
  `sim_window_closed` "חלון 24 השעות נסגר", `sim_job_reminder` "הרצת תזכורת עכשיו", `sim_job_late`
  "סימון איחור עכשיו", `sim_clock_needs_booking` "הכפתורים יופעלו כשלאורח תהיה הזמנה", `sim_job_ran`
  "הפעולה רצה", `sim_job_nothing` "אין מה להריץ עכשיו", `sim_job_failed` "הפעולה נכשלה", `sim_clear`
  "ניקוי נתוני בדיקה", `sim_clear_confirm_title` "למחוק את כל נתוני הבדיקה?", `sim_clear_confirm_text`
  "כל אורחי הבדיקה, השיחות, הבקשות וההזמנות שנוצרו בסימולטור יימחקו. נתונים אמיתיים לא ייפגעו.", `sim_cleared`
  "נתוני הבדיקה נמחקו", `sim_clear_failed` "המחיקה לא הצליחה", `sim_open_inbox` "פתיחה בשיחות",
  `wl_notify_hint_sends` "מסמן שהודעתם להם. אם ללקוח יש שיחה פתוחה, נשלחת אליו הודעה", `wl_notify_sent`
  "ההודעה נשלחה ללקוח", `wl_notify_marked` "סומן. לא נשלחה הודעה".
- [ ] **Registry and maps.** `docs/brain/component-families.md`: one line under `chat-thread` (second user: the
  simulator) and one under `http` (`SimulatorService`, `API.sim`); `docs/brain/inventory.md` and
  `src/app/pages/breadcrumbs.md` gain the page; `docs/restaurant/restaurant-map.md` gains one line under "Contract
  extensions (run)" for the `peek` flag.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL, logical CSS only. In the simulator the guest is "me": the guest's bubbles sit at the inline end, the
  business's at the inline start — the mirror of the inbox.
- Breakpoints from `src/styles.scss` only: phone ≤ 767 (one column, chat at full width), tablet ≤ 1023 and
  desktop ≥ 1024 (side column 18rem beside the phone frame).
- The phone frame is page-local SCSS (border, radius, a fixed height of `min(40rem, 100dvh - header)` with the
  thread scrolling inside); no `.c-*` engine class is defined outside `src/styles.scss`, and none is added.
- No dialog other than the clear confirmation; no confirmation on send, tap or clock. Nothing is built that this
  plan does not name (rule 15 of the brief).
- Lucide icons: `smartphone`, `fast-forward` (new); `flask-conical`, `send`, `trash-2`, `user-plus`,
  `message-circle` (exist).
- Dictionary keys: the list in Must Have.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give the browser one client for the three test routes — guest sends, guest taps a button, run a job now, clear test data, with error codes returned as codes; the path entry; spec — src/app/pages/frontdesk/simulator/services/simulator.service.ts, src/app/pages/frontdesk/simulator/services/simulator.service.spec.ts, src/app/core/services/http-storage.adapter.ts
- [ ] A2: Let the simulator read a thread as the guest without clearing the business's unread number — the optional peek flag on the thread read and its spec case — src/app/core/services/conversation-data.service.ts, src/app/core/services/conversation-data.service.spec.ts
- [ ] A3: Open the simulator page for the owner only and say clearly that nothing is sent — the lazy route, the owner check with its message, the banner, the two-column and one-column layout, the two icons; all dictionary keys of this plan — src/app/app.routes.ts, src/app/app.config.ts, src/app/pages/frontdesk/simulator/simulator.page.ts, .html, .scss, public/assets/data/dictionary.json
- [ ] A4: Pick a test guest or make a new one — the guest list with its loading, empty and failed states, the new-guest fields with their checks — src/app/pages/frontdesk/simulator/simulator.page.ts, .html
- [ ] A5: Write as the guest and see the business answer in a phone-shaped chat — the frame, the shared thread from the guest's side, the message box with its failure paths, button taps, the fast and slow refresh — src/app/pages/frontdesk/simulator/simulator.page.ts, .html, .scss
- [ ] A6: Show the 24-hour window and make the reminder or the late mark happen now — the window line, the two clock buttons with their disabled rule and results — src/app/pages/frontdesk/simulator/simulator.page.ts, .html
- [ ] A7: Remove everything the tests created with one confirmed press — the clear button, the shared confirmation, the results; the page spec — src/app/pages/frontdesk/simulator/simulator.page.ts, src/app/pages/frontdesk/simulator/simulator.page.spec.ts
- [ ] A12: Keep test guests out of the real clients list, the client picker and the downloads — the real-clients computed and its three readers, test bookings out of the bookings file; specs — src/app/core/services/client-data.service.ts, src/app/pages/clients/components/client-list/client-list.component.ts, src/app/shared/client-picker/client-picker.component.ts, src/app/pages/frontdesk/frontdesk-settings/components/data-export-card/data-export-card.component.ts
- [ ] A13: Make the waiting list say whether the table-is-ready message was really sent — the sent flag from the call, the new tooltip, the two result messages; specs — src/app/core/services/waitlist-data.service.ts, src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.ts, .html, .spec.ts
- [ ] A8: Link the simulator and the inbox to each other — the owner-only header link on the inbox, the open-in-inbox link on the phone frame; the inbox spec case — src/app/pages/inbox/inbox.page.ts, src/app/pages/inbox/inbox.page.html, src/app/pages/inbox/inbox.page.spec.ts
- [ ] A9: Record the new pieces where the next plan looks for them — the registry lines, the inventory row, the folder map, the map's extension line — docs/brain/component-families.md, docs/brain/inventory.md, src/app/pages/breadcrumbs.md, docs/restaurant/restaurant-map.md
- [ ] A10: Write the three screen checks that run in the real app — signInQa, stateful answers of the sim and conversation calls; screenshots — e2e/ui/678-1.spec.ts, e2e/ui/678-2.spec.ts, e2e/ui/678-3.spec.ts
- [ ] A11: Run every check of this plan and hand Dandan the hand checks — test:ci, build, lint, lint:icons, lint:reuse, the arch gate, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: `server/routes/sim.js` (675: inbound, test-data; 676: clock), the conversations reads (687),
  `app-chat-thread`, `ConversationDataService` and the inbox page (677), `ConfirmModalService`,
  `PermissionService`, `UserService`.
- New files needed: `src/app/pages/frontdesk/simulator/**` (the page and `services/simulator.service.ts`), the
  three e2e specs.
- Model changes: none.
- Backend / API: none built here; one small ask of plan 687 (`peek=1` on the messages read, Critical Questions).
  Calls: `POST /sim/inbound`, `POST /sim/clock`, `DELETE /sim/test-data`, `GET /conversations?test=1`,
  `GET /conversations/:id/messages?peek=1`.
- Auth and validation: every call carries the member's token; the server allows the sim routes to the owner or a
  platform admin only. The browser checks the name, the phone's digit count and the message length before sending.
- Security surface: the page can create test clients, conversations and bookings and can delete all test data of
  the business; the server limits both to `test: true` rows and refuses a phone that belongs to a real client. The
  browser never logs a phone, a name or message text, and renders message text as text, never as HTML.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; every new dictionary key and Lucide icon is named above;
  `src/app/pages/breadcrumbs.md` is in scope; no native `select`; the `[ui]` specs sign in with `signInQa`.

## Out of Scope
- The assistant's answers themselves (plans 679–681); until they merge the business side answers only what plans
  675 and 676 send (templates, button handling) and what a member writes from the inbox.
- A control that closes or moves the 24-hour window; any clock job other than `reminder` and `late`.
- Several chats side by side, exporting a test chat, pictures or voice notes.
- A chip for the simulator in the front desk row; a link from the settings page.
- Real WhatsApp (plan 683).

## Critical Questions
- none

## Execution Notes
- behaviour: the simulator has no chip; it is opened from a link in the inbox header that only the owner and a platform admin see.
- behaviour: a new test guest is created on the server only when the first message is sent.
- behaviour: an unsent message is dropped without a question when the owner leaves the page or changes guest.
- behaviour: the clock buttons are disabled until the test guest has a booking, instead of answering with an error.
- behaviour: the window clock is shown only; no control closes the window in this plan.
- behaviour: the thread read of the simulator sends `peek=1` so the business's unread number stays; plan 687 must honour it.
