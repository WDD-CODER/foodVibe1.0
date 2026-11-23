# Plan 687 — Conversations for members on the server: the list, the thread, reply, take over, hand back and close

Status: draft
Depends-on: 675
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Plan 675 stores a guest's messages and can send an answer, but no member can read a conversation or answer one:
the router `server/routes/conversations.js` is empty. This plan fills it — the list the inbox shows, the thread of
one conversation, a member's reply, **take over** (the assistant stops answering), **hand back**, and **close** —
and keeps old conversations from staying forever. It is the server half of the inbox (plan 677) and of the
simulator screen (plan 678), which both read the thread through these routes. It was split out of map row R13,
which did not fit one Worker session.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/routes/conversations.js` does not exist on `main`; plan 662 creates it empty and mounts it at
  `/api/v1/conversations`. Plan 662 also adds the action `manageConversations` (any member) to
  `server/utils/permissions.js` and the indexes `conversations_business_last` (`{ businessId, lastMessageAt: -1 }`)
  and `messages_conversation_at` (`{ businessId, conversationId, at }`).
- Plan 675 creates `server/services/conversations.js` (`loadConversation`, `closeConversation`),
  `server/services/outbound.js` (`sendOut`, which answers `{ ok, reason }`) and
  `shared/schemas/front-desk/message-templates.ts` (`MESSAGE_TEMPLATE_NAMES`, `templateMessage`).
- `server/routes/requests.js:9–15` is the pattern of a member router: `verifyToken`, `requireModule('frontdesk')`,
  `scopeFilter(req)`, `assertCan(req, res, action, { type, doc })`, `actorOf(req)`, `dataWriteLimiter`.
- `server/jobs/retention.js:27–49` (`purgeRetained`) deletes over-age requests, bookings and messages of one
  business, at most once per business per 24 hours; `RETENTION.messagesDays` is 365. It does not know
  `conversations`. `server/test/retention.test.js` has a "constants" case that lists `RETENTION`.
- `server/test/cross-business.test.js` covers the generic API only; conversations are server-only (map delta 11),
  so their cross-business test belongs to this router's own test file.
- `shared/schemas/staff-fields.ts`: staff read a client's `name`, `phone`, `tags`, `kinds` only.

## Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-CONV (routes part)**
- `server/routes/conversations.js` (`manageConversations`): `GET /`, `GET /:id/messages`, `POST /:id/messages`
  (member reply; outside the window only a template), `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close`.
- Both collections are server-only (delta 11): the generic API does not serve them, so guest message text has one
  read path, the conversations router.
- `messages` … Kept 12 months (`server/jobs/retention.js`).

**C-CHANNEL (the sender)** — `server/services/outbound.js` → `sendOut(db, conversation, outbound, author)` is the
only caller of a transport: it checks do-not-contact (R-02), the window (free text only inside it), `test`, writes
the `messages` row and calls the transport.

### Contract details this plan fixes
1. `GET /` answers `{ conversations, now }`; each conversation is the stored document plus `client: { _id, name,
   phone, tags }` and `last: { text, direction, kind, at } | null` (the newest message, its text cut at 120
   characters). Query: `status` (`open` — the default, `bot` and `human` — or `closed`), `test` (`1` returns only
   test conversations; without it test conversations are left out), `limit` (default 50, max 100), `before`
   (a `lastMessageAt` to page from). Order: `lastMessageAt` descending; the browser puts unread first.
2. `GET /:id/messages` answers `{ conversation, messages, now }`, messages ascending by `at`, at most 200 (the
   newest 200; `before` pages back), and sets the conversation's `unread` to 0.
3. `POST /:id/messages` body is `{ text }` or `{ template: { name, values } }`, never both. A member's reply takes
   the conversation over: a `bot` conversation becomes `human` with `assignedTo` the member, in the same request.
4. `PUT /:id/takeover` → `status: 'human'`, `assignedTo: <member>`; `PUT /:id/release` → `status: 'bot'`,
   `assignedTo` removed; `PUT /:id/close` → `closeConversation`. Each is conditional on the status that was read;
   a move that does not apply answers 409 `BAD_STATUS`.
5. A refusal of `sendOut` is answered 409 with its reason as the error (`DO_NOT_CONTACT`, `WINDOW_CLOSED`,
   `NOT_LIVE`, `TEST_ONLY`), 400 for `BAD_TEMPLATE`, 502 for `SEND_FAILED`.

## Goals & Success Criteria
**Primary:** any member can list the business's conversations, read one, answer it, take it over, hand it back
and close it, and no member of another business can reach any of it.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/conversations-router.test.js` and the
  updated `server/test/retention.test.js`.
- [auto] `server/test/conversations-router.test.js` (access): every route answers 401 without a token and 403
  `MODULE_OFF` for a business without `frontdesk`; an owner and a staff member of the business get 200; a member of
  another business gets an empty list on `GET /` and 404 on each of the five `/:id` routes, and the conversation
  and its messages are unchanged afterwards.
- [auto] `server/test/conversations-router.test.js` (list): two open conversations come back newest first with
  `client.name`, `last.text` and `now`; a closed one appears only with `status=closed`; a test conversation appears
  only with `test=1`; `limit=1` returns one and `before` returns the next.
- [auto] `server/test/conversations-router.test.js` (thread): `GET /:id/messages` returns the messages in time
  order and the conversation's `unread` is 0 afterwards.
- [auto] `server/test/conversations-router.test.js` (reply): a text reply inside the window is stored with
  `author: 'member'`, `memberId` of the caller and `status: 'delivered'`, and a `bot` conversation is `human` with
  `assignedTo` the caller afterwards; a text reply after the window answers 409 `WINDOW_CLOSED` and stores nothing;
  a template reply after the window is stored; an unknown template name answers 400 `BAD_TEMPLATE`; a reply to a
  do-not-contact client answers 409 `DO_NOT_CONTACT`; a body with both `text` and `template`, an empty `text`, and
  a `text` of 4001 characters each answer 400 `BAD_INPUT`; a reply to a closed conversation answers 409
  `BAD_STATUS`.
- [auto] `server/test/conversations-router.test.js` (moves): takeover of a `bot` conversation sets `human` and
  `assignedTo`; a second takeover by another member changes `assignedTo` to him; release sets `bot` and removes
  `assignedTo`; release of a `bot` conversation answers 409 `BAD_STATUS`; close removes `liveKey` and a second
  close answers 409 `BAD_STATUS`.
- [auto] `server/test/conversations-router.test.js` ("logs"): after a list, a thread read and a reply, no captured
  log line contains the client's name, the phone digits or the reply's text.
- [auto] `server/test/retention.test.js`: a closed conversation whose `lastMessageAt` is 366 days old is deleted
  with its messages; a 364-day one stays; an open conversation of any age stays; `RETENTION.conversationsDays`
  is 365.
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: yes — second plan of run `rs-conv-srv` (after 675). It adds no dictionary key, browser route or icon.
- Concurrent plans: the plans of run `rs-book-ui` (670, 671, 686, 672, 673) — no shared file. Never beside 675,
  676, 679 or 683.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/conversations.js
server/services/conversations.js
server/jobs/retention.js
server/test/conversations-router.test.js
server/test/retention.test.js
server/test/helpers/**
server/breadcrumbs.md
docs/restaurant/restaurant-map.md
server/test/files-route.test.js
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

- INV-1: preserves — every route of `server/routes/conversations.js` runs `verifyToken`, takes the business from the signed token through `scopeFilter(req)` and is authorized with `assertCan(req, res, 'manageConversations', …)`, an action any member may do and no non-member can reach; a conversation of another business answers 404. Staff read the client's name, phone and tags only — the fields `STAFF_READ_FIELDS` already allows.
- INV-2: preserves — every query of the router, of `server/services/conversations.js` and of `server/jobs/retention.js` carries the caller's `businessId`; retention runs per business, as today.
- INV-7: preserves — no table is offered, confirmed or moved; a member's reply is text or a template and writes no booking.

## Reuse Check

- none — the router fills a file plan 662 created and calls `sendOut`, `loadConversation`, `closeConversation` and `templateMessage` of plan 675; one function is added to the existing `server/services/conversations.js` (`listConversations`), no new piece

## Defaults

- empty-state-on-list — exception — why: server only; the plan builds no list on a screen
- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list on a screen
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS
- anchored-popup — exception — why: server only; "peek" here is a query flag of a read, not a floating box

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to see which guests wrote and answer them myself, so that a guest is never left with only the
  assistant.
- As the owner, I want to take a conversation over with one action and hand it back when I am done, so that the
  assistant and I never answer the same guest at once.
- As a guest, I want my messages to be seen only by the restaurant I wrote to.

## Functional Requirements

### Must Have (P0)
- [ ] **Router frame.** Every route: `verifyToken`, `requireModule('frontdesk')`; writes also `dataWriteLimiter`.
  The conversation of a `/:id` route is read with `{ _id, ...scopeFilter(req) }` (404 `{ error: 'Conversation not
  found' }`), then `assertCan(req, res, 'manageConversations', { type: 'conversations', doc })`.
- [ ] **`GET /`** per detail 1. `listConversations(db, businessId, { status, test, limit, before })` in
  `server/services/conversations.js` does the read: one `find` on `conversations` (sorted by the
  `conversations_business_last` index), one `find` on `clients` for the ids on the page (projection `name, phone,
  tags`), and one aggregate on `messages` that takes the newest message of each conversation on the page. No query
  runs per conversation.
- [ ] **`GET /:id/messages`** per detail 2; the `unread` reset is a separate `updateOne` after the read and its
  failure is logged, not answered. With the query `peek=1` the read resets nothing: the simulator of plan 678 reads
  the thread as the guest, and its polling must not clear the business's unread number. One test: a read with
  `peek=1` leaves `unread` as it was.
- [ ] **`POST /:id/messages`** per details 3 and 5. Input: `text` a trimmed string 1–4000, or `template.name` one
  of `MESSAGE_TEMPLATE_NAMES` with `template.values` an object of strings (`templateMessage` builds the message;
  a template with buttons is refused here with 400 `BAD_TEMPLATE` — the reminder is sent by the scheduler, never
  by hand). A `closed` conversation answers 409 `BAD_STATUS`. Then `sendOut(db, conversation, outbound, 'member',
  { memberId: actor.userId })`; on success, when the conversation was `bot`, a conditional update sets `human` and
  `assignedTo`. Answer: 201 `{ message, conversation }`.
- [ ] **`PUT /:id/takeover`, `/release`, `/close`** per detail 4, each answering the updated conversation.
  `takeover` is allowed from `bot` and from `human` (another member takes it); `release` only from `human`; `close`
  from `bot` and `human`. `release` and `close` also unset `suggestion`.
- [ ] **Logs.** `conversations.listed` (count), `conversations.read` (count), `conversations.replied` (`kind`),
  `conversations.moved` (`from`, `to`) — ids, counts and enums only.
- [ ] **Retention.** `RETENTION` gains `conversationsDays: 365`. `purgeRetained` deletes the business's
  conversations with `status: 'closed'` and `lastMessageAt` older than that, and the messages of exactly those
  conversations (by `conversationId`), before the existing delete of old messages; the counts object and the log
  line gain `conversations`. An open conversation is never deleted by age.
- [ ] **Docs.** `server/breadcrumbs.md`: the router's line says what it serves. `docs/restaurant/restaurant-map.md`
  "Contract extensions (run)": the five details above, one line.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built; the inbox is plan 677. No dictionary key, icon or browser route.

## Atomic Sub-tasks

- [ ] A1: Read a business's conversations in three queries, however many there are — the list function with status, test, limit and paging, the client and newest-message joins — server/services/conversations.js
- [ ] A2: Let a member see the list and one thread — the two reads with the server's time, the unread reset, access for members only — server/routes/conversations.js
- [ ] A3: Let a member answer a guest through the one sender — text or a template, the input limits, the refusals as answers, the take-over that a reply implies — server/routes/conversations.js
- [ ] A4: Let a member take a conversation over, hand it back and close it — the three moves, each conditional on the status that was read — server/routes/conversations.js
- [ ] A5: Stop closed conversations from staying forever — the new retention number, the delete of old closed conversations with their messages, the updated test — server/jobs/retention.js, server/test/retention.test.js
- [ ] A6: Prove that another business reaches nothing and that logs stay clean — the router's test file with the access, list, thread, reply, moves and logs blocks — server/test/conversations-router.test.js
- [ ] A7: Record the router and run every check — the folder map, the map's extension line, test:server, build, lint, log-query; evidence into Execution Notes — server/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: `sendOut`, `templateMessage`, `loadConversation`, `closeConversation` (plan 675); the action and
  the indexes of plan 662.
- New files needed: `server/test/conversations-router.test.js`.
- Model changes: none.
- Backend / API: six routes under `/api/v1/conversations`.
- Auth and validation: any member of the business (`manageConversations`), module `frontdesk`; body limits above.
- Security surface: guest message text is readable here and nowhere else; the business always comes from the
  signed token; another business gets 404. Logs carry no text, name or phone.
- Data / migration: none; retention starts deleting closed conversations older than 12 months.
- Project checks: the `log-query` Done-when item; `server/breadcrumbs.md` in scope; a dedicated router, justified
  in the map (delta 11).

## Out of Scope
- The inbox and the simulator screens (plans 677, 678), the assistant's suggestion (plans 679, 682).
- The inbound handler and the sender themselves (plan 675), the scheduler (plan 676), real WhatsApp (plan 683).
- Unread counts on the navigation badge (plan 677 reads them from `GET /`).

## Critical Questions
- none

## Execution Notes
- behaviour: a member's reply takes the conversation over; handing it back is an explicit action.
- behaviour: test conversations are left out of the list unless `test=1` is asked (the simulator screen asks).
- behaviour: a template with buttons cannot be sent by hand.
- behaviour: only closed conversations are deleted by age (12 months after their last message).
