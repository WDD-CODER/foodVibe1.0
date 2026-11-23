# Plan 677 — The inbox: conversation list, thread, take over and hand back, the linked card and the reply box

Status: draft
Depends-on: 675, 687
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Plan 675 gives the server guest conversations: messages in and out, a 24-hour window, a state that says who holds
the conversation (the assistant, a person, closed). Nothing in the browser shows them. A member cannot see that a
guest wrote, cannot read the thread, cannot take the conversation from the assistant or give it back, and cannot
answer. This plan builds `/inbox`: the list of conversations, the thread, Take over / Hand back, a small card of the
request or booking the conversation is about, and the reply box, which offers only a template once the 24-hour
window has closed. It also builds the shared message thread (`app-chat-thread`) that the simulator of plan 678 uses
as well. It is map row R15 of the Restaurant program (`docs/restaurant/restaurant-map.md`, spec RS-08 "The inbox").

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/app.routes.ts:182–186`: `/requests` is a lazy route with `canActivate: [authGuard, moduleGuard(['frontdesk'])]`;
  `moduleGuard` is `src/app/core/guards/module.guard.ts`. No route starts with `inbox`.
- `src/app/core/components/tab-chips/tab-chips.component.ts`: `GROUP_BY_PATH_PREFIX` (lines 34–50) maps `/requests`,
  `/bookings`, `/clients`, `/frontdesk` to the group `frontdesk`; `CHIPS_BY_GROUP.frontdesk` (lines 86–111) has five
  chips, each with `modules`; a chip with `badge: true` shows `FrontDeskBadgeService.waitingCount_` in a
  `.c-chip__count` (`tab-chips.component.html:16–20`). `tab-chips.component.spec.ts:181` asserts the exact list of
  five chip paths for a business with the default modules.
- `src/app/core/services/front-desk-badge.service.ts` (44 lines): one root signal, loaded once a member is signed in,
  reloaded when the window regains focus (at most once per 60 s); no timer. The header reads it:
  `src/app/core/components/header/header.component.ts:76` and `header.component.html:69–72, 105–108` (the count on
  the front desk link).
- `src/app/core/services/http-storage.adapter.ts:11–29`: the `API` map of backend paths; it has `requests` and
  `bookings`, no `conversations`.
- `src/app/core/services/permission.service.ts:19, 66`: the action union and the rule "any member may
  `manageRequests`"; plan 662 adds `manageConversations` the same way. `isOwner_` (line 50) is true for the owner
  and for a consultant.
- `src/app/core/services/notifications.service.ts:28–64` is the precedent of a timer that stops while the page is
  hidden (`setInterval` plus `visibilitychange`).
- Lucide icons registered in `src/app/app.config.ts`: `message-circle`, `message-square`, `send`, `clock`, `check`,
  `arrow-right`, `refresh-cw`, `phone`, `x`. Not registered: `inbox`, `check-check`, `bot`, `hand`.
- Dictionary (`public/assets/data/dictionary.json`): `rq_test_tag` "בדיקה", `retry` "נסה שוב", `back` "חזרה",
  `cancel` "ביטול", `close` "סגור" exist. No key starts with `ibx_` or `chat_`.
- `docs/brain/component-families.md` has the families `list-page`, `chip`, `empty-state`, `feedback`, `http`,
  `form-field`, `search-combobox`, `module-gate`; none for a message thread.
- `e2e/ui/634-1.spec.ts` is the pattern of a `[ui]` spec that answers the API itself with `page.route`;
  `signInQa(context)` is in `e2e/helpers/qa-session.ts`. The QA business has the module `frontdesk` (a default
  module), so only the conversation calls are answered by the spec.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): the collections
  `conversations` and `messages`, the action `manageConversations` and its browser mirror (662); the routes of
  C-CONV in `server/routes/conversations.js`, `sendOut`, the template catalogue
  `shared/schemas/front-desk/message-templates.ts` (675).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-CONV (R13; used by R14–R21)** — FD-06's collections, with these changes:
- `conversations`: `{ ...baseDocShape, clientId, channel: 'sim' | 'whatsapp', waId, status: 'bot' | 'human' |
  'closed', assignedTo?, lastMessageAt, lastInboundAt, unread: int, requestId?, bookingId?, windowExpiresAt,
  pending?: { kind: 'book' | 'change' | 'cancel', data, at }, suggestion?: string (≤ 4000), liveKey?: string,
  test?: true }`.
- Both collections are server-only (delta 11): the generic API does not serve them, so guest message text has one
  read path, the conversations router.
- `messages`: `{ _id, businessId, conversationId, direction: 'in' | 'out', author: 'guest' | 'ai' | 'member' |
  'server', memberId?, kind: 'text' | 'template' | 'button', text (≤ 4000), template?: { name, params },
  buttons?: [{ id, title }] (≤ 3), buttonId?, at, providerMessageId, status: 'queued' | 'sent' | 'delivered' |
  'read' | 'failed', test?: true }`.
- `server/routes/conversations.js` (`manageConversations`): `GET /`, `GET /:id/messages`, `POST /:id/messages`
  (member reply; outside the window only a template), `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close`.

**C-TEMPLATES (R13)** — `shared/schemas/front-desk/message-templates.ts`: a closed list with the parameters of each
— `booking_confirmed(name, date, time, partySize)`, `booking_reminder(name, time, partySize)` with buttons
`CONFIRM:<token>` / `CANCEL:<token>`, `booking_cancelled`, `waitlist_table_ready(name)`, `request_received`,
`request_approved`, `request_declined`, `need_more_info(text)`. The Hebrew body of each is a dictionary key;
parameters are one line each (R-17).

**The routes this plan calls** (built by plan 687, `server/routes/conversations.js`; copied from its details — use
the merged names if they differ):
- `GET /api/v1/conversations` → `{ conversations, now }`; each conversation is the stored document plus
  `client: { _id, name, phone, tags }` and `last: { text, direction, kind, at } | null` (the newest message, its
  text cut at 120 characters). Query: `status` (`open` — the default, `bot` and `human` — or `closed`), `test`
  (`1` returns only test conversations; without it test conversations are left out), `limit` (default 50, max
  100), `before`. Order: `lastMessageAt` descending; the browser puts unread first.
- `GET /api/v1/conversations/:id/messages` → `{ conversation, messages, now }`, messages ascending by `at`, the
  newest 200; it sets the conversation's `unread` to 0.
- `POST /api/v1/conversations/:id/messages` with `{ text }` or `{ template: { name, values } }` → 201
  `{ message, conversation }`. A member's reply takes the conversation over (a `bot` conversation becomes `human`
  with `assignedTo` the member). Refusals: 409 `WINDOW_CLOSED`, `DO_NOT_CONTACT`, `NOT_LIVE`, `TEST_ONLY`,
  `BAD_STATUS` (a closed conversation); 400 `BAD_INPUT`, `BAD_TEMPLATE`; 502 `SEND_FAILED`.
- `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close` → the updated conversation; a move that does not apply
  answers 409 `BAD_STATUS`.
- The template catalogue `MESSAGE_TEMPLATES` (plan 675): each `{ name, params: string[], bodyKey, buttons? }`;
  the dictionary keys `tpl_booking_confirmed`, `tpl_booking_reminder`, `tpl_booking_cancelled`,
  `tpl_waitlist_table_ready`, `tpl_request_received`, `tpl_request_approved`, `tpl_request_declined`,
  `tpl_need_more_info`, `tpl_btn_confirm`, `tpl_btn_cancel` are fixed by 675 and get their Hebrew values here.
The routes return no linked request or booking: this plan reads them in the browser (Must Have, "The linked card").

## Goals & Success Criteria
**Primary:** a member opens `/inbox`, sees which guests wrote and who holds each conversation, reads a thread, takes
it over from the assistant, answers, and hands it back — on a phone as list → thread.

- [auto] `pnpm run test:ci` → exit 0, including:
  - `src/app/core/services/conversation-data.service.spec.ts`: `list()` fills `conversations_` and `now_`;
    `list({ test: true })` sends `test=1`; `open(id)` fills `thread_` with the conversation and its messages and
    sets that row's `unread` to 0 in `conversations_`; `reply`, `sendTemplate`, `takeOver`, `handBack`, `close`
    each call their route and put the answer into the signals; a 409 `WINDOW_CLOSED`, a 409 `DO_NOT_CONTACT` and a
    409 `BAD_STATUS` come back as `{ ok: false, code }`; a failed `list()` keeps the last list and sets
    `listFailed_`.
  - `src/app/core/services/inbox-badge.service.spec.ts`: `pendingCount_` counts the conversations with
    `status: 'human'`, `unread > 0` and no `test`; it is 0 when signed out; `refresh()` inside 60 s does nothing and
    `refresh(true)` reloads.
  - `src/app/shared/chat-thread/chat-thread.component.spec.ts`: inbound and outbound bubbles sit on opposite sides
    and swap when `perspective` is `guest`; a template message shows its body from the dictionary with its
    parameters; buttons render only on the last outbound message and emit `buttonTapped` with the button's `id` when
    `buttonsEnabled` is true; each of the five statuses shows its own icon and label; a day line appears between
    messages of different Jerusalem dates; the author tag reads "העוזר", "צוות" or "אוטומטי" for `ai`, `member`,
    `server`.
  - `src/app/pages/inbox/inbox.page.spec.ts`: rows are ordered unread first and then by `lastMessageAt`, newest
    first; each row shows its holder tag ("העוזר", "אני", another member's "צוות"); the filter chips "הכול",
    "אצלי", "אצל העוזר" narrow the list and "בדיקה" reads the test conversations, each with the tag "בדיקה"; with
    status `bot` the line "העוזר עונה בשיחה הזאת" and the button "אני עונה" show above the reply box; with status
    `human` "החזרה לעוזר" shows; a reply to a do-not-contact client shows "הלקוח ביקש שלא נפנה אליו"; with `windowExpiresAt` before `now` the text box is replaced by the template
    choice; a linked booking shows its date, time and party with the link "פתיחה"; the empty list shows the empty
    message; a failed list read shows the error with "נסה שוב".
  - `src/app/core/components/tab-chips/tab-chips.component.spec.ts`: the front desk group lists
    `/requests`, `/bookings`, `/inbox`, `/clients`, `/frontdesk/knowledge`, `/frontdesk/settings` (the assertion at
    line 181 gains `/inbox`); the inbox chip shows `pendingCount_` when it is above 0; `/inbox` maps to the group.
  - `src/app/core/components/header/header.component.spec.ts`: the front desk link's number is the waiting
    requests plus the pending conversations.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse`
  → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/677-inbox-conversation-list-thread-take-over-hand-back-reply.plan.md`
  → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/inbox` (the spec answers `GET /api/v1/conversations` with two conversations, "דנה" held by the assistant
  with one unread message and "יוסי" held by a person) · open the page · the row of "דנה" is first and shows the
  tag "העוזר" — `e2e/ui/677-1.spec.ts`, screenshot `screens/677-1.png`.
- [ui] `/inbox` (same stubs, stateful: takeover answers `status: 'human'`, the message post answers 201) · open
  "דנה", press "אני עונה", type "שלום דנה" and press send · the thread shows a bubble with "שלום דנה" and the button
  "החזרה לעוזר" — `e2e/ui/677-2.spec.ts`, screenshot `screens/677-2.png`.
- [ui] `/inbox` at 375 px (same stubs) · tap the row of "יוסי", then the back button · the thread fills the screen
  after the tap, and the list with "דנה" is back after the back button — `e2e/ui/677-3.spec.ts`, screenshot
  `screens/677-3.png`.
- [human] Dandan answers a simulator guest from his phone: he sees the new conversation in the inbox, takes it over,
  replies, hands it back, and the screen reads well with one hand (after plan 678 is merged, on the run branch).
- [human] the list's page with no items · open the page · a message says the list is empty
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
- [human] the inbox on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line

## Execution Mode
- Parallel: no — first plan of run `rs-conv-ui` (677, 678, in that order). It appends to
  `public/assets/data/dictionary.json`, `src/app/app.routes.ts`, `src/app/app.config.ts` and
  `tab-chips.component.ts`, as every screen plan of the program does: one screen run at a time.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inbox/**
src/app/pages/inbox/inbox.page.spec.ts
src/app/shared/chat-thread/**
src/app/shared/chat-thread/chat-thread.component.spec.ts
src/app/core/services/conversation-data.service.ts
src/app/core/services/conversation-data.service.spec.ts
src/app/core/services/inbox-badge.service.ts
src/app/core/services/inbox-badge.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/models/conversation.model.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.html
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
e2e/ui/677-1.spec.ts
e2e/ui/677-2.spec.ts
e2e/ui/677-3.spec.ts
screens/677-*.png
src/app/appRoot/app.component.spec.ts
src/app/core/services/async-storage.service.spec.ts
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

- INV-1: preserves — `conversation-data.service.ts` is a plain client of the conversations routes of plan 687, which authorise every call on the server (`manageConversations`, any member) and take the business from the token; the browser sends no business id and reads guest text only through that router. The screen hides nothing the server allows and allows nothing the server refuses.
- INV-6: preserves — the globs `src/app/**/*ai*` match no new file of this plan on purpose (no file name holds "ai"); the inbox makes no model call, and the "suggest a reply" button is plan 682.
- INV-7: preserves — the linked card only shows a booking's date, time and party and links to its page; nothing here offers, confirms or moves a table.

## Reuse Check

- `ChatThreadComponent` (`app-chat-thread`, `src/app/shared/chat-thread/`) — family: none — rung: 4 — why: no piece draws a message thread; the inbox and the simulator of plan 678 must draw the same messages the same way, so it is one shared, read-only component (inputs: messages, now, perspective, buttonsEnabled; output: buttonTapped), registered as the new family `chat-thread`.
- `ConversationDataService` (`src/app/core/services/conversation-data.service.ts`) — family: http — rung: 3 — why: a client of the conversations routes through `HttpClient` and the `API` map; the list is a polled read with the server's time, not a stored collection, so it does not extend `BaseEntityDataService`.
- `ReplyBoxComponent` (`app-reply-box`, `src/app/pages/inbox/components/reply-box/`) — family: form-field — rung: 2 — why: the reply box of one thread (free text, the one template after the window, take over); it uses `app-form-field`, `app-custom-select` and the engine `.c-input-stack`, and keeps its own layout classes `.rb`, `.rb-bot`, `.rb-row`, `.rb-line`, `.rb-text`.
- Page-local layout classes of the inbox page — family: list-page — rung: 2 — why: layout only, no engine class: `.ibx`, `.ibx-body`, `.ibx-header`, `.ibx-list`, `.ibx-filters`, `.ibx-rows`, `.ibx-row`, `.is-selected`, `.ibx-name`, `.ibx-preview`, `.ibx-time`, `.ibx-thread`, `.ibx-thread-head`, `.ibx-who`, `.ibx-phone`, `.ibx-window`, `.ibx-actions`, `.ibx-back`, `.ibx-card`, `.ibx-card-link`, `.ibx-messages`, `.ibx--thread`.
- Bubble layout classes of the thread — family: chat-thread — rung: 2 — why: the layout of `app-chat-thread` only: `.ct`, `.ct-day`, `.ct-row`, `.ct-row--mine`, `.ct-bubble`, `.ct-bubble--mine`, `.ct-text`, `.ct-buttons`, `.ct-meta`, `.ct-status`, `.ct-status--read`, `.ct-status--failed`.
- `InboxBadgeService` (`src/app/core/services/inbox-badge.service.ts`) — family: http — rung: 3 — why: one root signal for the pending-conversations number, built like `FrontDeskBadgeService` (load when signed in, reload on focus with a 60 s gap).
- `InboxPage` (`src/app/pages/inbox/`) — family: list-page — rung: 2 — why: `app-page-header` and single-line `.c-list-row` rows; the list sits beside a thread, has no search, selection or sort, so the rows are drawn by the page inside the list engine classes and not by a second `app-list-shell`.
- Holder and test tags, the unread number — family: chip — rung: 1 — why: `c-chip--tag c-chip--sm` and `c-chip__count`.
- Filter chips (all / mine / the assistant) — family: chip — rung: 1 — why: `c-chip c-chip--toggle` radios in a `c-chip-group`.
- Take over / Hand back / Close buttons — family: engine-classes — rung: 1 — why: `c-btn-primary`, `c-btn-ghost`.
- Reply box and the template text — family: form-field — rung: 1 — why: the app's input engine inside `app-form-field`.
- Template choice — family: search-combobox — rung: 1 — why: `app-custom-select`, one value of a short fixed list; no add option.
- Empty list, no conversation chosen, failed read — family: empty-state — rung: 1 — why: `app-empty-state` with a message key (and the retry action).
- Loading — family: feedback — rung: 1 — why: `app-loader`; messages through `UserMsgService` + `LoggingService`.
- Inbox chip and its number — family: chip — rung: 2 — why: one more entry of `CHIPS_BY_GROUP.frontdesk` with a new optional `inboxBadge` field read by the same `.c-chip__count` markup.
- Route — family: module-gate — rung: 1 — why: `moduleGuard(['frontdesk'])` as `/requests` uses it.

## Defaults

- empty-state-on-list — applies — how: the shared empty-state piece
- loading-and-error-states — applies — how: the shared loading and error pieces
- app-list-container — exception — why: the list is one column of a two-column screen (list beside thread) with no search, sort or selection; it uses `app-page-header` and single-line `c-list-row` rows, and the card in Done-when checks both
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- hints-in-tooltips — exception — why: the screen has no dialog; the two short lines under the reply box ("only a template") are a state of the box, not an explanation of a control
- anchored-popup — exception — why: the plan adds no floating box
- leave-and-return — exception — why: the linked card's link is plain navigation to another page; the reply draft is deliberately not kept (Execution Notes)

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner, I want one screen that shows every guest who wrote and whether the assistant or one of us is
  answering, so that no guest waits without anyone knowing.
- As a host, I want to take a conversation from the assistant, answer the guest myself and hand it back, so that
  the hard questions get a person and the easy ones do not need me.
- As a host on a phone, I want the list and then the thread, each on the whole screen, so that I can answer with one
  hand during service.
- As the owner, I want the reply box to stop me from sending free text when the 24-hour window has closed, so that
  what I see in tests is what the real channel will allow.

## Functional Requirements

### Must Have (P0)
- [ ] **Browser client.** `ConversationDataService` (root): signals `conversations_`, `now_`, `listFailed_`,
  `thread_` (`{ conversation, messages } | null`), `threadFailed_`; methods `list({ test? })`, `open(id)`,
  `closeThread()`, `reply(id, text)`, `sendTemplate(id, name, values)`, `takeOver(id)`, `handBack(id)`,
  `close(id)`. Each write returns `{ ok: true } | { ok: false, code }` and puts the server's answer into the
  signals; a failure is logged with an event name, the status and the code — never a name, a phone or message text.
  `API.conversations` (`${API_ROOT}/conversations`) is appended to the `API` map. `Conversation`, `ConversationRow`
  (the row with `client` and `last`), `Message` and `LinkedCard` are exported
  from `src/app/core/models/conversation.model.ts` (the first two re-export the shared schema types).
- [ ] **Route and chip.** `/inbox` and `/inbox/:id`, both lazy to `InboxPage`, `canActivate: [authGuard,
  moduleGuard(['frontdesk'])]`. `GROUP_BY_PATH_PREFIX` gains `['/inbox', 'frontdesk']`. `CHIPS_BY_GROUP.frontdesk`
  gains, after the bookings chip, `{ id: 'inbox', labelKey: 'ibx_chip', icon: 'inbox', path: '/inbox',
  inboxBadge: true, modules: ['frontdesk'] }`; `TabChip` gains the optional `inboxBadge`. The chip shows
  `InboxBadgeService.pendingCount_` in a `.c-chip__count` (`data-testid="inbox-count"`, aria label
  `ibx_pending_count_label`) when it is above 0. No existing chip entry is changed.
- [ ] **The pending number.** `InboxBadgeService.pendingCount_` = conversations with `status: 'human'`,
  `unread > 0` and no `test` (a guest wrote and a person must answer). It loads the list once a member of a
  business with `frontdesk` is signed in, reloads on window focus at most once per 60 s, and `refresh(true)` runs
  when `/inbox` opens. The header's front desk link shows waiting requests plus `pendingCount_` (one number; its
  aria label stays `rq_waiting_count_label` with the total).
- [ ] **Layout.** `app-page-header` with the title `ibx_title`. Desktop and tablet (≥ 768 px): two columns — the
  list at the inline start (a fixed 22rem on desktop, 18rem on tablet), the thread in the rest; with no
  conversation chosen the thread column shows `app-empty-state` with `ibx_pick`. Phone (≤ 767 px): `/inbox` shows
  only the list, `/inbox/:id` only the thread with a back button (icon `arrow-right`, label `back`) to `/inbox`.
  The chosen conversation is always in the URL, so reload and the browser's back work.
- [ ] **The list.** Above it four filter chips, one chosen at a time: "הכול" (default), "אצלי" (status `human`
  and `assignedTo` is me), "אצל העוזר" (status `bot`), and "בדיקה", which reads the test conversations
  (`test=1`) instead of the real ones — that is where a simulator guest of plan 678 is answered. Rows: unread first, then by `lastMessageAt` newest first.
  One line per row: the guest's name (the phone when the name is empty), the holder tag — "העוזר" for `bot`, "אני"
  for `human` assigned to me, "צוות" for `human` assigned to someone else or to nobody — the tag "בדיקה"
  (`rq_test_tag`) for a `test` conversation, the start of the last message (`last.text`, cut by the row's width with
  an ellipsis; for a template message the template's dictionary body), the time of the last message (HH:mm today, the date otherwise) and the unread number in a
  `.c-chip__count` when above 0. The chosen row is marked (`aria-current="true"`). A row is a link to
  `/inbox/<id>`. Closed conversations are not listed.
- [ ] **List states.** First load: `app-loader`. No conversation at all: `app-empty-state` with `ibx_empty`. A
  filter with no match: `ibx_empty_filter`. A failed read with nothing loaded: `app-empty-state` with
  `ibx_load_failed` and the button "נסה שוב" that reads again; a failed reload keeps the last list and shows nothing.
- [ ] **The thread.** Header line: the guest's name and phone, the holder tag, and — from the server's `now` and
  `windowExpiresAt` — `ibx_window_open` with the hours and minutes left, or `ibx_window_closed`. Under it the
  linked card (below), then `app-chat-thread` (`perspective: 'business'`, `buttonsEnabled: false`), which scrolls
  to the newest message when the thread opens and when a message arrives while the view is already at the bottom.
  Opening a thread calls `open(id)`; the row's unread number goes to 0. A thread id that does not exist (404):
  `app-empty-state` with `ibx_not_found` and a link to `/inbox`. A failed thread read: `ibx_load_failed` with
  "נסה שוב".
- [ ] **`app-chat-thread`** (`src/app/shared/chat-thread/`, read-only, no service injected): inputs `messages`,
  `now` (server epoch), `perspective: 'business' | 'guest'` (whose messages sit at the inline end: outbound for
  `business`, inbound for `guest`), `buttonsEnabled` (default false); output `buttonTapped` (the button's `id`).
  Each bubble: the text (line breaks kept, long words wrapped); for a `template` message the dictionary body of
  the template (its `bodyKey`, `tpl_<name>`, from `MESSAGE_TEMPLATES` of plan 675) with the message's values put
  into the `{<param>}` places in the catalogue's parameter order, never the raw name; a button's title is its
  dictionary key (`tpl_btn_confirm`, `tpl_btn_cancel`) when the stored title is a key; under an outbound bubble a tag
  of who wrote it — `chat_by_ai` "העוזר", `chat_by_member` "צוות", `chat_by_server` "אוטומטי" — the time (HH:mm)
  and the delivery state as an icon with an accessible label: `clock` + `chat_st_queued`, `check` + `chat_st_sent`,
  `check-check` + `chat_st_delivered`, `check-check` in the accent colour + `chat_st_read`, `x` in the danger
  colour + `chat_st_failed`. A state is never shown by colour alone. Buttons of a message are drawn under it as
  `c-chip c-chip--tap`; they are enabled only on the newest outbound message and only when `buttonsEnabled`. A
  `button` message from the guest shows the title of the button that was tapped. A line with the date sits between
  messages of different Jerusalem dates. Bubbles are 78% of the width at most; logical CSS only.
- [ ] **Who holds it.** The reply box shows for every conversation that is not closed. Status `bot`: above the
  box the line `ibx_bot_answers` and the button "אני עונה" (`c-btn-primary`, icon `hand`) → `takeOver(id)`; on
  success focus goes into the box. A reply sent while the status is `bot` also takes the conversation over (the
  server does it in the same request; the screen shows the answer's conversation). Status `human`: in the thread
  header "החזרה לעוזר" (`c-btn-ghost`, icon `bot`) → `handBack(id)` and
  "סגירת השיחה" (`c-btn-ghost`) → `close(id)`, after which the page goes to `/inbox` and the row is gone. A
  conversation held by another member shows the same reply box and buttons (any member may answer). A 409
  `BAD_STATUS` on any of the three reads the thread again and shows `ibx_action_failed`. No confirmation dialog on
  any of the three.
- [ ] **The reply box, window open** (`now < windowExpiresAt`): a text area (1–4 rows, grows with the text, at most
  4000 characters) and the send button (icon `send`, label `ibx_send`). Enter sends, Shift+Enter is a new line;
  on a phone Enter is a new line and only the button sends. Empty or only spaces: the button is disabled. While
  sending the box and button are disabled. Success: the bubble appears, the box empties and keeps focus. 409
  `WINDOW_CLOSED`: the box switches to the template choice with `ibx_window_closed_now`, the typed text is kept in
  the template's text field. 409 `DO_NOT_CONTACT`: `ibx_do_not_contact`, the text stays. 409 `BAD_STATUS` (the
  conversation was closed meanwhile): the page goes to `/inbox` with `ibx_closed_meanwhile`. Any other failure:
  `ibx_send_failed`, the text stays.
- [ ] **The reply box, window closed** (`now ≥ windowExpiresAt`): no free-text box. The line `ibx_window_closed`
  and `ibx_template_hint`, a template choice with one entry, `need_more_info`, shown by its dictionary body, one
  text field for its `text` parameter (one line, 1–200 characters, no line break) and the send button, which calls
  `sendTemplate(id, 'need_more_info', { text })` (the route's `template.values`). The other templates are sent by the server on its own events
  (booking, reminder, waiting list), never by hand from here.
- [ ] **A draft per conversation.** Text typed in the reply box is kept in memory per conversation while the page
  is open, so switching to another conversation and back keeps it. Leaving the page drops it; no leave question.
- [ ] **The linked card.** The conversation carries `bookingId` and `requestId`; the routes return no more, so
  the browser reads the record itself: a booking by id through the generic read (`API.data('bookings')`, one GET
  when the thread opens and when `bookingId` changes), a request from `RequestDataService` (`ensureLoaded()`,
  found by id). When the booking is found: one line with `ibx_linked_booking`, the date, the time, the party size
  and the booking's status as a tag, and the link "פתיחה" (`ibx_open`) to `/bookings?date=<date>`. Else when the
  request is found: `ibx_linked_request`, its kind's name, the date, time and party when it has them, the status
  tag, and the link "פתיחה" to `/requests`. Neither id, or the record is not found or its read failed: no card and
  no message. The card
  has no approve, decline or seat action; they stay on their own pages.
- [ ] **Refresh.** While `/inbox` is open and the document is visible: the list every 30 s and the open thread
  every 10 s, both also when the window regains focus; the timers stop when the document is hidden and when the
  page is destroyed. No websocket.
- [ ] **Icons and words.** Register `Inbox`, `CheckCheck`, `Bot`, `Hand` in `src/app/app.config.ts`. Dictionary
  keys (all new, appended): `ibx_chip` "שיחות", `ibx_title` "שיחות עם לקוחות", `ibx_pending_count_label`
  "{count} שיחות מחכות לתשובה", `ibx_filter_all` "הכול", `ibx_filter_mine` "אצלי", `ibx_filter_bot` "אצל העוזר",
  `ibx_holder_bot` "העוזר", `ibx_holder_me` "אני", `ibx_holder_team` "צוות", `ibx_empty` "עדיין אין שיחות",
  `ibx_empty_filter` "אין שיחות בסינון הזה", `ibx_load_failed` "לא הצלחנו לטעון את השיחות", `ibx_pick`
  "בחרו שיחה מהרשימה", `ibx_not_found` "השיחה לא נמצאה", `ibx_window_open` "אפשר לענות חופשי עוד {time}",
  `ibx_window_closed` "חלפו 24 שעות מההודעה האחרונה של הלקוח", `ibx_window_closed_now`
  "החלון נסגר בינתיים, אפשר לשלוח רק תבנית", `ibx_template_hint` "אפשר לשלוח רק הודעת תבנית",
  `ibx_template_text` "מה לשאול", `ibx_bot_answers` "העוזר עונה בשיחה הזאת", `ibx_take_over` "אני עונה",
  `ibx_hand_back` "החזרה לעוזר", `ibx_close` "סגירת השיחה", `ibx_send` "שליחה", `ibx_reply_placeholder`
  "כתבו תשובה", `ibx_send_failed` "ההודעה לא נשלחה", `ibx_do_not_contact` "הלקוח ביקש שלא נפנה אליו",
  `ibx_closed_meanwhile` "השיחה נסגרה בינתיים", `ibx_filter_test` "בדיקה", `ibx_action_failed`
  "הפעולה לא נשמרה", `ibx_linked_booking` "הזמנה", `ibx_linked_request` "בקשה", `ibx_open` "פתיחה",
  `chat_by_ai` "העוזר", `chat_by_member` "צוות", `chat_by_server` "אוטומטי", `chat_st_queued` "בדרך",
  `chat_st_sent` "נשלחה", `chat_st_delivered` "הגיעה", `chat_st_read` "נקראה", `chat_st_failed` "נכשלה",
  `chat_button_tapped` "נבחר: {title}". The ten template keys plan 675 fixed get their Hebrew values here (the
  parameter names are the catalogue's): `tpl_booking_confirmed` "שלום {name}, ההזמנה שלך אושרה: {date} בשעה
  {time}, {partySize} אורחים. נתראה!", `tpl_booking_reminder` "שלום {name}, מזכירים את ההזמנה שלך היום בשעה {time}
  ל-{partySize} אורחים. מגיעים?", `tpl_booking_cancelled` "שלום {name}, ההזמנה ל-{date} בשעה {time} בוטלה.",
  `tpl_waitlist_table_ready` "שלום {name}, השולחן שלכם מוכן. מחכים לכם!", `tpl_request_received`
  "שלום {name}, קיבלנו את הבקשה ונחזור אליך בהקדם.", `tpl_request_approved` "שלום {name}, הבקשה שלך אושרה.",
  `tpl_request_declined` "שלום {name}, לצערנו לא נוכל לאשר את הבקשה הפעם.", `tpl_need_more_info` "{text}",
  `tpl_btn_confirm` "מגיעים", `tpl_btn_cancel` "מבטלים". When a body key is missing the thread shows the message's
  own `text`.
- [ ] **Registry and maps.** `docs/brain/component-families.md` gains the family `chat-thread` (Use, When, Inputs,
  Known copies: none) and one line under `http` for the two services; `docs/brain/inventory.md` gains
  `app-chat-thread`; the four `breadcrumbs.md` files gain their new entries; `docs/restaurant/restaurant-map.md`
  gains one line under "Contract extensions (run)" with the answer shapes this plan read from 675.

### Should Have (P1)
- [ ] The document title's unread hint: none. (Named so nobody adds one: the chip and header numbers are the signal.)

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL, logical CSS only; the list is at the inline start, the thread at the inline end. Bubbles of the
  business sit at the inline end, the guest's at the inline start (`perspective: 'business'`).
- Breakpoints from `src/styles.scss` only: phone ≤ 767 (list → thread), tablet ≤ 1023 (two columns, list 18rem),
  desktop ≥ 1024 (two columns, list 22rem).
- The reply box sticks to the bottom of the thread column; the thread scrolls above it; on a phone the box stays
  above the bottom bar.
- Component SCSS holds only layout of this page and of the thread; no `.c-*` engine class is defined outside
  `src/styles.scss`, and none is added by this plan.
- No dialog, no confirmation question, no sound, no browser notification. Nothing is built that this plan does not
  name (rule 15 of the brief).
- Lucide icons: `inbox`, `check-check`, `bot`, `hand` (new); `send`, `clock`, `check`, `x`, `arrow-right` (exist).
- Dictionary keys: the list in Must Have.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Give the browser one client for guest conversations — list, open a thread, reply, send a template, take over, hand back, close, with error codes returned as codes; the path entry and the model types; spec — src/app/core/services/conversation-data.service.ts, src/app/core/services/conversation-data.service.spec.ts, src/app/core/services/http-storage.adapter.ts, src/app/core/models/conversation.model.ts
- [x] A2: Build the one message thread the inbox and the simulator both draw — bubbles by side, template bodies, author tag, delivery state with icon and label, buttons, day lines; spec — src/app/shared/chat-thread/chat-thread.component.ts, .html, .scss, .spec.ts
- [x] A3: Open the inbox from the front desk chips and count what waits for a person — the two lazy routes, the group prefix, the chip with its number, the badge service, the header total, the four icons; specs — src/app/app.routes.ts, src/app/app.config.ts, src/app/core/components/tab-chips/tab-chips.component.ts, .html, .spec.ts, src/app/core/services/inbox-badge.service.ts, .spec.ts, src/app/core/components/header/header.component.ts, .html, .spec.ts
- [x] A4: Show who wrote and who holds each conversation — the page with its header, the filter chips, the ordered single-line rows with tags and unread numbers, loading, empty and failed states; all dictionary keys of this plan — src/app/pages/inbox/inbox.page.ts, .html, .scss, public/assets/data/dictionary.json
- [x] A5: Show one conversation with its window clock and the booking or request it is about — the thread column, the header line, the linked card with its link, not-found and failed states, list then thread on a phone — src/app/pages/inbox/inbox.page.ts, .html, .scss
- [x] A6: Let a member take a conversation, answer and hand it back — the three buttons, the reply box with its keys and failure paths, the per-conversation draft, the template choice once the window is closed — src/app/pages/inbox/components/reply-box/reply-box.component.ts, .html, .scss, .spec.ts, src/app/pages/inbox/inbox.page.ts
- [x] A7: Keep the screen fresh without a live connection — list and thread timers that stop when the page is hidden or left, reload on focus; the page spec — src/app/pages/inbox/inbox.page.ts, src/app/pages/inbox/inbox.page.spec.ts
- [x] A8: Record the new pieces where the next plan looks for them — the chat-thread family, the http lines, the inventory row, the four folder maps, the map's extension line — docs/brain/component-families.md, docs/brain/inventory.md, src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, docs/restaurant/restaurant-map.md
- [x] A9: Write the three screen checks that run in the real app — signInQa, stateful answers of the conversation calls, the 375 px case; screenshots — e2e/ui/677-1.spec.ts, e2e/ui/677-2.spec.ts, e2e/ui/677-3.spec.ts
- [x] A10: Run every check of this plan and hand Dandan the hand checks — test:ci, build, lint, lint:icons, lint:reuse, the arch gate, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: the conversations routes of plan 687 and the template catalogue of plan 675; `PermissionService`,
  `UserService` (who "me" is), `ModuleService`, `TranslationService`, `UserMsgService`, `LoggingService`.
- New files needed: `src/app/pages/inbox/**` (the page and `components/reply-box/`), `src/app/shared/chat-thread/**`,
  `conversation-data.service.ts`, `inbox-badge.service.ts`, `conversation.model.ts`, the three e2e specs.
- Model changes: none on the server; browser types re-export the shared schemas of plan 662.
- Backend / API: none built here. Read: `GET /conversations`, `GET /conversations/:id/messages`. Write:
  `POST /conversations/:id/messages`, `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close` (all plan 687), and one generic read of a booking by id.
- Auth and validation: every call carries the member's token through the existing interceptor; the server
  authorises (`manageConversations`). The browser checks only what the reply box needs (length, empty, one line for
  the template text).
- Security surface: guest names, phones and message text are shown on this screen and nowhere else; they are never
  written to a log line (`LoggingService` calls carry an event name, an id, a status and a code), never put in a
  URL beyond the conversation id, and never stored in `localStorage` or `sessionStorage` (the draft is in memory).
  Message text is rendered as text, never as HTML.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; every new dictionary key and Lucide icon is named above; the four
  `breadcrumbs.md` files are in scope; no native `select`; the `[ui]` specs sign in with `signInQa`.

## Out of Scope
- "Suggest a reply" and "fix this answer" (plan 682), and anything the assistant writes (plans 679–681).
- The simulator screen (plan 678) — this plan only builds the thread it will reuse.
- Approving, declining, seating or cancelling from the linked card; a client card or client edit in the thread.
- Searching conversations, a list of closed conversations, reopening a closed conversation.
- Sending any template other than `need_more_info` by hand; pictures, voice notes and files in a conversation.
- Browser notifications, sounds, a websocket.
- Conversation numbers on the dashboard (brief Part 6).

## Critical Questions
- none

## Execution Notes
- behaviour: closed conversations are not listed and cannot be reopened from the screen; a new message from the guest opens a new conversation on the server (plan 675).
- behaviour: the linked card is a one-line summary with a link to its page, not the request card with its approve and decline actions.
- behaviour: outside the 24-hour window a member can send only the `need_more_info` template by hand.
- behaviour: taking over, handing back and closing ask no confirmation.
- behaviour: any member may answer a conversation another member holds.
- behaviour: the pending number counts conversations a person holds that have an unread guest message; conversations the assistant holds are not counted.
- behaviour: a typed reply is kept per conversation only while the page is open; leaving the page drops it without a question.
- behaviour: on a phone Enter adds a line and only the button sends.
- seen: a template message is stored with text '' (plan 675), so a list row's preview is empty for it; the row carries no template name to show the dictionary body — server/routes/conversations.js (the `last` field).
- evidence: pnpm run build -> 0; pnpm run lint -> 0 (0 errors); pnpm run test:ci -> 0 (3027 SUCCESS); lint:icons, lint:no-native-select, lint:reuse, override-check, plan-ledger-check, breadcrumbs-check, scope-check --arch -> 0. The three [ui] specs (e2e/ui/677-*.spec.ts) are written, not run.
