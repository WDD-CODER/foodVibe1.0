# Plan 675 — The conversation pipeline on the server: inbound handler, the one sender, the template catalogue and the simulator transport

Status: draft
Depends-on: 662
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant cannot talk to a guest through the app: there is no conversation, no message, no way in and no way
out. The Restaurant program adds one conversation pipeline with two transports (brief D4, Part 2 rule 6): the
simulator inside the app, built first, and real WhatsApp, built last (plan 683). This plan builds the pipeline
itself and the simulator transport: one handler for every inbound message, one function that sends every outbound
message, the closed list of templates, and the routes the simulator screen (plan 678) will call. Everything a real
inbound message needs happens here — find the guest by phone, respect do-not-contact, coalesce bursts, keep the
24-hour window, hand the turn to the assistant or to a person — so that nothing above the transport ever knows
whether a message came from the simulator or from a phone.

The member's side of a conversation (list, thread, reply, take over, hand back, close) is plan 687; the scheduler
and the reminder are plan 676; the assistant's turn is plan 679.

Verified on `origin/main` (28359b6d, 2026-11-22):
- There is no conversation or message code: no `server/services/inbound.js`, `outbound.js`, `channels/`, no
  `shared/schemas/front-desk/message-templates.ts`. Plan 662 creates the two collections (server-only, the generic
  API answers 403 for them), their schemas (`conversation.schema.ts`, `message.schema.ts`), their four indexes, the
  empty routers `server/routes/conversations.js` and `server/routes/sim.js` mounted at `/api/v1/conversations` and
  `/api/v1/sim`, the action `manageConversations`, and the value `sim` in `REQUEST_CHANNELS`.
- `server/utils/client-upsert.js:51` `upsertClientByPhone(db, businessId, { name, phone, source, actor })` finds a
  live client by `phoneKey` (R-01) or creates one; `source` must be one of `CLIENT_SOURCES`
  (`shared/schemas/entities/client.schema.ts:18`: `manual | public_form | whatsapp | event_migration` — there is no
  `sim`); `actor` is `actorOf(req)` or a `guestActor(...)` string (`server/utils/actor.js:17`: only `form` and
  `whatsapp`). A new client gets `counters.conversations: 0`.
- `client.schema.ts:82`: `doNotContact?: { at, reason, via }`; `tags` (≤ 12 strings), `kinds`
  (`diner | event_client | lead`). The client schema has no `test` field: a test client is marked by the tag `test`.
- `shared/schemas/entities/front-desk-profile.schema.ts:6, 72`: `status` is `draft | pilot | active | suspended`
  (server-owned).
- `server/routes/requests.js:9–15`: the pattern of a member router — `verifyToken`, `requireModule('frontdesk')`,
  `scopeFilter`, `assertCan`, `actorOf`; `server/middleware/auth.js:35` `isPlatformAdmin(req)`;
  `server/utils/permissions.js:52` — `req.user.businessRole === 'owner'`.
- `server/services/frontdesk-stats.js:96–100`: test requests are left out of the numbers
  (`test: { $ne: true }`); the bookings read at line 100 has no such filter (bookings had no `test` field before 662).
- `server/jobs/retention.js:39` already deletes a business's `messages` older than 365 days by `at`
  (`RETENTION.messagesDays`); plan 687 adds the conversations to it.
- `server/test/helpers/app.js`: `buildTestApp`, `teardownTestApp`, `signTestToken`, `testDb`;
  `server/test/helpers/log-capture.js` captures log lines for "no name, no phone" assertions.
- `shared/schemas/phone.ts`: `normalizePhone`, `phoneKey`.

## Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-CONV (R13; used by R14–R21)** — FD-06's collections, with these changes:
- `conversations`: `{ ...baseDocShape, clientId, channel: 'sim' | 'whatsapp', waId, status: 'bot' | 'human' |
  'closed', assignedTo?, lastMessageAt, lastInboundAt, unread: int, requestId?, bookingId?, windowExpiresAt,
  pending?: { kind: 'book' | 'change' | 'cancel', data, at }, suggestion?: string (≤ 4000), liveKey?: string,
  test?: true }`. `liveKey` is `'<channel>:<waId>'` while the status is not `closed` and is removed on close;
  unique index `{ businessId, liveKey }`, partial on `liveKey` existing (the pattern of `client_live_key_unique`;
  a partial index cannot say "status is not closed"). Index `{ businessId, lastMessageAt }` for the inbox.
- Both collections are server-only (delta 11): the generic API does not serve them, so guest message text has one
  read path, the conversations router.
- `messages`: `{ _id, businessId, conversationId, direction: 'in' | 'out', author: 'guest' | 'ai' | 'member' |
  'server', memberId?, kind: 'text' | 'template' | 'button', text (≤ 4000), template?: { name, params },
  buttons?: [{ id, title }] (≤ 3), buttonId?, at, providerMessageId, status: 'queued' | 'sent' | 'delivered' |
  'read' | 'failed', test?: true }`. Unique index `{ businessId, providerMessageId }`; index
  `{ businessId, conversationId, at }` for the thread. Kept 12 months (`server/jobs/retention.js`).
- `server/routes/conversations.js` (`manageConversations`): `GET /`, `GET /:id/messages`, `POST /:id/messages`
  (member reply; outside the window only a template), `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close`.
- `server/services/inbound.js` → `handleInbound(db, { businessId, channel, waId, guestName?, text?, buttonId?,
  providerMessageId, at })`: idempotent on `providerMessageId`; find or create the client (`phoneKey`, R-01) and
  the conversation; store the message; set `windowExpiresAt = at + 24 h`; a button id of a template
  (`CONFIRM:<token>`, `CANCEL:<token>`) is handled by the server with no model call; otherwise, when
  `status === 'bot'`, wait and coalesce (R-03) and call the turn handler (R17 — until it merges, the handler only
  stores the message and marks the conversation `human`).

**C-CHANNEL (R13; used by R14, R16, R17, R21)**
- `server/services/channels/index.js`: `channelFor(conversation) → { send(db, conversation, outbound) →
  { providerMessageId, status } }` and `outbound = { kind: 'text' | 'template' | 'button', text?, template?,
  buttons? }`. `server/services/outbound.js` → `sendOut(db, conversation, outbound, author)` is the only caller: it
  checks do-not-contact (R-02), the window (free text only inside it), `test`, writes the `messages` row and calls
  the transport.
- `sim-channel.js`: makes a local id, returns `delivered`. `whatsapp-channel.js` (R21): the Cloud API call.
- `POST /api/v1/sim/inbound { phone, name?, text?, buttonId? }` (owner or platform admin; `frontdesk` module):
  the simulator's "guest sends" — it calls the same `handleInbound` with `channel: 'sim'`.
  `POST /api/v1/sim/clock { conversationId, job: 'reminder' | 'late' }` runs that job for the test booking now.
  `DELETE /api/v1/sim/test-data` (C-TESTDATA).
- Nothing outside `server/services/channels/**` and `server/routes/sim.js` / `webhooks-whatsapp.js` may branch on
  the channel name.

**C-TEMPLATES (R13; used by R14, R16, R18, R21)**
- `shared/schemas/front-desk/message-templates.ts`: a closed list with the parameters of each —
  `booking_confirmed(name, date, time, partySize)`, `booking_reminder(name, time, partySize)` with buttons
  `CONFIRM:<token>` / `CANCEL:<token>`, `booking_cancelled`, `waitlist_table_ready(name)`,
  `request_received`, `request_approved`, `request_declined`, `need_more_info(text)`. The Hebrew body of each is a
  dictionary key; parameters are one line each (R-17). The simulator renders the same body the real channel will
  send. Names and parameter order are what gets registered at the provider later — do not rename after the freeze.

**C-TESTDATA (R13 server, R16 screen)**
- Everything the simulator creates carries `test: true`: the client (kind `lead`, tag `test`), conversation,
  messages, request, booking, holds, waiting-list entry.
- `test: true` rows are excluded from `/stats/**`, the business report, the CSV exports, client counters, the
  platform tables, `decisionLog` and learning; they never reach a `whatsapp` transport.
- `DELETE /api/v1/sim/test-data` (owner) removes every `test: true` row of the business in these collections and
  releases their holds.

### Contract details this plan fixes (each is also one line in the map's "Contract extensions (run)")
1. `handleInbound` takes two more optional fields: `actor` (the `createdBy` of a client it creates — the simulator
   route passes `actorOf(req)`, a real channel passes `guestActor('whatsapp')`, the default) and nothing else.
   It answers `{ ok: true, conversationId, messageId, duplicate?: true, settled: Promise<void> }`; `settled`
   resolves when the wait of R-03 and whatever followed it are over (tests await it; routes never do).
2. A transport describes itself, so no code outside `server/services/channels/**` branches on a channel name:
   `channelFor(conversation) → { send, real: boolean, clientSource }`. `sim`: `real: false`,
   `clientSource: 'manual'`. `whatsapp` (plan 683): `real: true`, `clientSource: 'whatsapp'`. Until 683 merges,
   `channelFor` of a `whatsapp` conversation returns a transport whose `send` answers `{ status: 'failed' }`.
3. The test rule, in one place (`sendOut`): a conversation with `test: true` is sent only through a transport with
   `real: false`; a transport with `real: true` sends only when the profile's `status` is `pilot` or `active`
   (R-19). The simulator works for a `draft` profile (R-15: the owner tests before going live).
4. Buttons of a template are handled through a registry in `inbound.js`:
   `registerButton(prefix, handler(db, { conversation, token, at }))`. This plan registers none; plan 676
   registers `CONFIRM` and `CANCEL`. An inbound `buttonId` with no registered prefix is stored like a text.
5. The turn is a hook: `setTurnHandler(fn(db, conversation, { log }))`. This plan's default handler sets the
   conversation to `human`. Plan 679 sets the real one.
6. `sendOut` answers `{ ok: true, message }` or `{ ok: false, reason }` with `reason ∈ DO_NOT_CONTACT |
   WINDOW_CLOSED | NOT_LIVE | TEST_ONLY | BAD_TEMPLATE | SEND_FAILED`. A refusal writes no `messages` row, except
   `SEND_FAILED`, which keeps the row with `status: 'failed'`.
7. More than three buttons (R-12): `sendOut` sends one `text` message, the text followed by one numbered line per
   button title. Outside the window a `button` message is refused like free text (`WINDOW_CLOSED`); only a
   template passes.
8. A `template` message is stored with `template: { name, params }` and `text: ''`; its buttons are stored in
   `buttons`. The server never holds a Hebrew body: the screen renders the body from the template's dictionary key
   (`bodyKey`), and the provider holds its own registered copy.
9. The simulator refuses to write as a real guest: `POST /sim/inbound` with a phone whose `phoneKey` belongs to a
   live client without the tag `test` answers 409 `REAL_CLIENT`.

## Goals & Success Criteria
**Primary:** a message sent as a test guest through `POST /api/v1/sim/inbound` ends as a stored conversation with
its messages, handled by the same code a real message will use, and every outbound message of the app goes through
one function that enforces do-not-contact, the 24-hour window and the test rule.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/message-templates.test.js`,
  `server/test/outbound.test.js`, `server/test/inbound.test.js`, `server/test/sim-router.test.js`.
- [auto] `server/test/message-templates.test.js`: `MESSAGE_TEMPLATES` has exactly the eight names of C-TEMPLATES in
  that order; `templateMessage('booking_reminder', { name, time, partySize, token })` returns
  `{ name, params: [name, time, partySize], buttons: [{ id: 'CONFIRM:<token>', … }, { id: 'CANCEL:<token>', … }] }`;
  a parameter with a newline, a tab or two spaces in a row comes out as one line (R-17); a missing parameter and an
  unknown name each throw `BAD_TEMPLATE`; every template has a `bodyKey` that starts with `tpl_`.
- [auto] `server/test/outbound.test.js` (R-02): `sendOut` to a conversation whose client has `doNotContact` answers
  `{ ok: false, reason: 'DO_NOT_CONTACT' }` and no `messages` row exists.
- [auto] `server/test/outbound.test.js` (window): free text and a button message one millisecond after
  `windowExpiresAt` answer `WINDOW_CLOSED` with no row; a template at the same moment is stored and sent; free text
  one millisecond before it is stored with `status: 'delivered'` and a `providerMessageId` that starts with `sim:`.
- [auto] `server/test/outbound.test.js` (R-19): with a fake transport `{ real: true }`, a profile in `draft` and one
  in `suspended` each answer `NOT_LIVE` and the transport's `send` was not called; `pilot` sends. A conversation
  with `test: true` on that transport answers `TEST_ONLY`. On the simulator transport a `draft` profile sends.
- [auto] `server/test/outbound.test.js` (R-12): four buttons are stored as one `text` message whose text ends with
  four numbered lines; three buttons are stored as `kind: 'button'` with three `buttons`.
- [auto] `server/test/outbound.test.js`: a transport whose `send` throws leaves one row with `status: 'failed'` and
  the answer `SEND_FAILED`; `sendOut` updates the conversation's `lastMessageAt`.
- [auto] `server/test/inbound.test.js` (R-01): an inbound from `972521234567` in a business that has a client with
  phone `052-1234567` uses that client (no second client); an unknown phone creates one client.
- [auto] `server/test/inbound.test.js` (idempotent): the same `providerMessageId` twice stores one message and the
  second answer has `duplicate: true`; `unread` is 1.
- [auto] `server/test/inbound.test.js` (R-03): with the wait injected as a promise the test resolves, two inbound
  messages 2 s apart produce exactly one call of the turn handler, made after the second wait; a conversation
  moved to `human` during the wait produces none.
- [auto] `server/test/inbound.test.js`: the first inbound creates a conversation with `status: 'bot'`,
  `liveKey: 'sim:<waId>'`, `windowExpiresAt === at + 86400000`, `lastInboundAt === at`; with no turn handler set the
  conversation ends `human`; an inbound to a `human` conversation calls no handler; an inbound after the
  conversation was closed creates a second conversation and the first keeps no `liveKey`.
- [auto] `server/test/inbound.test.js` (buttons): a `buttonId` `PING:abc` with `registerButton('PING', spy)` calls
  the spy with `token: 'abc'` and calls no turn handler; an unregistered prefix is stored as a message and goes to
  the turn handler.
- [auto] `server/test/inbound.test.js` ("logs"): after three inbound messages with a name, a phone and a text, no
  captured log line contains the name, the phone digits or the text.
- [auto] `server/test/sim-router.test.js`: `POST /api/v1/sim/inbound` answers 401 without a token, 403 for staff,
  403 `MODULE_OFF` for a business without `frontdesk`, 400 `BAD_INPUT` without `phone` or with neither `text` nor
  `buttonId`, 409 `REAL_CLIENT` for the phone of a client without the tag `test`, and 200
  `{ conversationId, messageId }` for an owner and for a platform admin; the client it creates has
  `tags: ['test']`, `kinds: ['lead']`, and the conversation and the message have `test: true`; the answer arrives
  before the injected wait resolves.
- [auto] `server/test/sim-router.test.js`: `DELETE /api/v1/sim/test-data` (owner) removes the business's test
  conversations, messages, requests, bookings, waiting-list entries, `tableHolds` rows and the clients tagged
  `test`, answers their counts, and leaves a real conversation, a real booking and its hold, and another
  business's test rows untouched; staff get 403.
- [auto] `server/test/frontdesk-stats.test.js`: a `test: true` booking with status `no_show` does not change the
  no-show rate.
- [auto] `grep -rn "'whatsapp'" server/services server/routes server/jobs --include=*.js` lists only files under
  `server/services/channels/` and lines that existed before this plan (`server/utils` and `server/routes/public.js`
  are not touched).
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads the eight template names and their parameters in
  `shared/schemas/front-desk/message-templates.ts` and confirms the list — the names are registered at the provider
  later and cannot be renamed.

## Execution Mode
- Parallel: yes — first plan of run `rs-conv-srv` (675, then 687). It adds no dictionary key, route of the browser
  or icon, and edits no file a screen plan edits.
- Concurrent plans: the plans of run `rs-book-ui` (670, 671, 686, 672, 673) — no shared file. Never beside 676,
  687, 679 or 683 (the inbound handler and `server/routes/sim.js`).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/front-desk/message-templates.ts
server/services/inbound.js
server/services/outbound.js
server/services/conversations.js
server/services/channels/**
server/routes/sim.js
server/services/frontdesk-stats.js
server/test/message-templates.test.js
server/test/outbound.test.js
server/test/inbound.test.js
server/test/sim-router.test.js
server/test/frontdesk-stats.test.js
server/test/helpers/**
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
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

- INV-1: preserves — `server/routes/sim.js` is a member route: `verifyToken`, the business from the signed token (`scopeFilter`), owner or platform admin only. The guest it writes for is a test guest of that same business; the client is created through `upsertClientByPhone` with the member as `createdBy`. `server/services/inbound.js` takes the business from its caller and never from the message; a real non-member reaches it only through the webhook of plan 683, already named in INV-1.
- INV-2: preserves — every query of the new services carries the `businessId` the caller resolved; nothing is cloned or synced; `server/services/frontdesk-stats.js` only gains a filter.
- INV-4: preserves — every stored conversation and message is checked against the schemas of plan 662 (`checkStoredDoc`) before it is written; the template catalogue is one file in `shared/schemas`.
- INV-7: preserves — this plan offers, confirms and moves no table; the test-data delete removes `tableHolds` rows only together with the test booking that owns them.

## Reuse Check

- message-templates.ts (`MESSAGE_TEMPLATES`, `templateMessage`) — family: none — rung: 4 — why: no closed list of outbound templates exists; the names and parameter order are a contract with the provider, so they live once, in the shared package, read by the server and by the simulator screen
- server/services/outbound.js (`sendOut`) — family: none — rung: 4 — why: the one sender; do-not-contact, the window and the test rule must be checked in one place or one caller will skip them
- server/services/inbound.js (`handleInbound`, `registerButton`, `setTurnHandler`) — family: none — rung: 4 — why: the one handler both transports call, so the simulator is never a second code path
- server/services/conversations.js (`findOrCreateConversation`, `loadConversation`, `closeConversation`) — family: none — rung: 4 — why: the live-key rule of a conversation is written once and used by the inbound handler here and by the member router of plan 687
- server/services/channels (`channelFor`, `sim-channel.js`) — family: none — rung: 4 — why: the only place that knows a channel's name

## Defaults

- empty-state-on-list — exception — why: server only; the plan builds no list on a screen
- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list on a screen
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner of a restaurant, I want to write to my own business as a test guest and see that the message is
  kept, so that I can try the conversation channel before any real guest is connected.
- As a guest who asked not to be contacted, I want no message from the business, whatever part of the app tries to
  send one.
- As a host, I want two quick messages from one guest to be treated as one, so that the guest gets one answer.
- As the product owner, I want the simulator to run the same code a real phone message will run, so that what was
  tested is what is shipped.

## Functional Requirements

### Must Have (P0)

**The template catalogue — `shared/schemas/front-desk/message-templates.ts`** (new, pure, no zod import)
- [ ] `MESSAGE_TEMPLATES`: a frozen record keyed by the eight names, each `{ name, params: string[], bodyKey,
  buttons?: [{ prefix, titleKey }] }`: `booking_confirmed` (`name, date, time, partySize`; `tpl_booking_confirmed`),
  `booking_reminder` (`name, time, partySize`; `tpl_booking_reminder`; buttons `CONFIRM` / `tpl_btn_confirm` and
  `CANCEL` / `tpl_btn_cancel`), `booking_cancelled` (`name, date, time`; `tpl_booking_cancelled`),
  `waitlist_table_ready` (`name`; `tpl_waitlist_table_ready`), `request_received` (`name`; `tpl_request_received`),
  `request_approved` (`name`; `tpl_request_approved`), `request_declined` (`name`; `tpl_request_declined`),
  `need_more_info` (`text`; `tpl_need_more_info`). `MESSAGE_TEMPLATE_NAMES` is the ordered list.
- [ ] `oneLine(value)`: a string with every newline and tab replaced by a space, runs of spaces collapsed, trimmed,
  cut at 200 characters (R-17). `templateMessage(name, values, token?)` → `{ name, params, buttons? }` with
  `params` in the catalogue's order, each through `oneLine(String(value))`; buttons get `id: '<prefix>:<token>'` and
  `title: titleKey` (the screen translates it; the provider holds its own text). It throws an `Error` whose `code`
  is `BAD_TEMPLATE` for an unknown name, a missing value, or buttons without a token.
- [ ] The dictionary values of the ten `tpl_*` keys are not added here (this plan edits no browser file): plan 677,
  the first screen of the conversation channel, adds them. The key names above are fixed by this plan.

**Transports — `server/services/channels/`** (new)
- [ ] `sim-channel.js`: `{ name: 'sim', real: false, clientSource: 'manual', send(db, conversation, outbound) }`;
  `send` returns `{ providerMessageId: 'sim:' + newId(), status: 'delivered' }` and does nothing else.
- [ ] `index.js`: `channelFor(conversation)` returns the transport of `conversation.channel`; for a channel with no
  transport file yet it returns `{ name, real: true, clientSource: 'whatsapp', send: async () => ({
  providerMessageId: 'none:' + newId(), status: 'failed' }) }`. `setChannelForTest(name, transport)` and
  `resetChannelsForTest()` let a test put a fake transport in. This folder is the only place where the strings
  `'sim'` and `'whatsapp'` are compared.

**Conversations — `server/services/conversations.js`** (new)
- [ ] `findOrCreateConversation(db, { businessId, channel, waId, clientId, at, test })`: finds the conversation
  with `{ businessId, liveKey: channel + ':' + waId }`; else inserts `{ _id, schemaVersion: 2, businessId,
  createdBy: 'server', createdAt: at, updatedAt: at, clientId, channel, waId, status: 'bot', lastMessageAt: at,
  lastInboundAt: at, unread: 0, windowExpiresAt: at + 86400000, liveKey, ...(test && { test: true }) }` after
  `checkStoredDoc('conversations', doc)`; a duplicate-key error (two first messages at once) reads the winner.
  Returns `{ conversation, created }`. A created conversation of a non-test client bumps
  `clients.counters.conversations` by one.
- [ ] `loadConversation(db, businessId, id)` and `closeConversation(db, businessId, id, now)` (sets
  `status: 'closed'`, unsets `liveKey` and `pending`). The member router of plan 687 uses both.

**The one sender — `server/services/outbound.js`** (new)
- [ ] `sendOut(db, conversation, outbound, author, { now = Date.now(), memberId } = {})`, in this order:
  1. `outbound.kind === 'template'` → `templateMessage` shape is checked (`BAD_TEMPLATE` on an unknown name).
  2. The client (`clients`, same business, `conversation.clientId`): `doNotContact` set → `DO_NOT_CONTACT`.
  3. The transport `channelFor(conversation)`: `conversation.test === true && transport.real` → `TEST_ONLY`;
     `transport.real` and the profile's `status` not `pilot` / `active` → `NOT_LIVE`.
  4. Not a template and `now > conversation.windowExpiresAt` → `WINDOW_CLOSED`.
  5. A `button` message with more than three buttons becomes a `text` message (detail 7).
  6. `transport.send` — a throw or `status: 'failed'` → the row is stored with `status: 'failed'` and the answer is
     `SEND_FAILED`.
  7. The `messages` row: `{ _id, businessId, conversationId, direction: 'out', author, memberId?, kind, text,
     template?, buttons?, at: now, providerMessageId, status, ...(conversation.test && { test: true }) }`, checked
     with `checkStoredDoc('messages', row)`; then `conversations.updateOne` sets `lastMessageAt: now`,
     `updatedAt: now`.
  It logs `outbound.sent` or `outbound.refused` with `reason`, `kind`, `author` and the conversation id only.
- [ ] No other file calls a transport's `send`. A test asserts it by grep: `\.send\(db` appears under
  `server/services` only in `outbound.js` and `channels/`.

**The one way in — `server/services/inbound.js`** (new)
- [ ] `handleInbound(db, { businessId, channel, waId, guestName, text, buttonId, providerMessageId, at, actor },
  { log })`:
  1. `messages.findOne({ businessId, providerMessageId })` → found: `{ ok: true, duplicate: true, … }`, nothing
     else happens.
  2. The transport's descriptor (`channelFor({ channel })`): `test = !transport.real`.
  3. The client: `upsertClientByPhone(db, businessId, { name: guestName || waId, phone: waId,
     source: transport.clientSource, actor: actor ?? guestActor('whatsapp') })`; a client created for a test
     conversation gets `$set: { tags: ['test'], kinds: ['lead'] }`.
  4. `findOrCreateConversation`; the inbound row `{ direction: 'in', author: 'guest', kind: buttonId ? 'button' :
     'text', text: text ?? '', buttonId?, at, providerMessageId, status: 'delivered', test? }` — a duplicate-key
     error on insert is answered as step 1 (two deliveries at once).
  5. `conversations.updateOne`: `lastInboundAt: at`, `lastMessageAt: at`, `windowExpiresAt: at + 86400000`,
     `$inc: { unread: 1 }`.
  6. A `buttonId` whose prefix (the part before the first `:`) is registered → that handler runs with
     `{ conversation, token, at }`; no wait, no turn.
  7. Otherwise, when the conversation's status is `bot`: `await wait(COALESCE_MS)` (6000; `setWaitForTest(fn)`
     replaces the timer, and the real timer is `.unref()`'d); then re-read the conversation — if its
     `lastInboundAt` is newer than this message's `at`, or its status is no longer `bot`, stop; else call the turn
     handler. A throw of the handler is logged (`inbound.turn.failed`) and sets the conversation to `human`.
  Steps 1–5 are awaited by the caller; steps 6–7 run after the answer and resolve `settled`.
- [ ] `registerButton(prefix, handler)`, `setTurnHandler(fn)`, `resetInboundForTest()`. The default turn handler
  sets `status: 'human'` (until plan 679).
- [ ] Logs: `inbound.stored` (`channel` is not logged; `kind`, `created`, `duplicate`), `inbound.coalesced`,
  `inbound.turn.failed` — ids and booleans only, never `text`, `guestName` or `waId`.

**The simulator routes — `server/routes/sim.js`** (the empty router of plan 662 is filled; the mount is not touched)
- [ ] Every route: `verifyToken`, `requireModule('frontdesk')`, then owner or platform admin
  (`req.user.businessRole === 'owner' || isPlatformAdmin(req)`, else 403 `OWNER_ONLY`), `dataWriteLimiter`.
- [ ] `POST /inbound` `{ phone, name?, text?, buttonId? }`: `phone` a string whose `normalizePhone` has 9–15
  digits; `name` ≤ 80; `text` ≤ 4000; `buttonId` ≤ 100; one of `text` / `buttonId` is needed (400 `BAD_INPUT`).
  409 `REAL_CLIENT` per detail 9. Then `handleInbound` with `channel: 'sim'`, `waId: normalizePhone(phone)`,
  `providerMessageId: 'sim-in:' + newId()`, `at: Date.now()`, `actor: actorOf(req)`; answers 200
  `{ conversationId, messageId }` without waiting for `settled`.
- [ ] `DELETE /test-data` (owner or platform admin): in the caller's business, `deleteMany({ businessId,
  test: true })` on `messages`, `conversations`, `requests`, `bookings`, `waitlistEntries`, `tableHolds`, and
  `deleteMany({ businessId, tags: 'test' })` on `clients`; answers `{ deleted: { <collection>: n } }` and logs the
  counts. It does not touch `decisionLog` (a test request never writes one) or `aiUsage` (metering is kept).
- [ ] `POST /clock` is added by plan 676, not here.

**Test rows out of the numbers**
- [ ] `server/services/frontdesk-stats.js:100`: the bookings read gains `test: { $ne: true }`. (Requests already
  have it. Test clients are found by the tag `test`; leaving them out of the clients list and the exports is the
  screen's work in plan 678, which shows the "clear test data" action.)

**Docs**
- [ ] `server/breadcrumbs.md`: the new service files and the `channels/` folder. `docs/brain/inventory.md` and
  `docs/brain/component-families.md` (family `helpers`): one row each for `sendOut`, `handleInbound`,
  `templateMessage` — "Use: every outbound message goes through `sendOut`; never call a transport".
  `docs/restaurant/restaurant-map.md` "Contract extensions (run)": the nine details above, one line.

### Should Have (P1)
- [ ] `server/test/helpers/` gains `conversation-fixtures.js` (a business with a profile, a client and a
  conversation; a controllable `wait`) used by the three new test files and by plans 676, 687 and 679.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built. The simulator screen is plan 678 and the inbox is plan 677.
- No key is added to `public/assets/data/dictionary.json`. Keys this plan names for plan 677 to add with their
  Hebrew values: `tpl_booking_confirmed`, `tpl_booking_reminder`, `tpl_booking_cancelled`,
  `tpl_waitlist_table_ready`, `tpl_request_received`, `tpl_request_approved`, `tpl_request_declined`,
  `tpl_need_more_info`, `tpl_btn_confirm`, `tpl_btn_cancel`.

## Atomic Sub-tasks

- [ ] A1: Fix the closed list of messages the business may send outside a live conversation — the eight templates with their parameters, one-line values, button ids from a token, the bad-template error; its test — shared/schemas/front-desk/message-templates.ts, server/test/message-templates.test.js
- [ ] A2: Add the simulator transport and the one place that knows a channel by name — sim transport, channelFor with the descriptor, the stand-in for a channel not built yet, the test hooks — server/services/channels/index.js, server/services/channels/sim-channel.js
- [ ] A3: Keep one live conversation per guest and channel — find or create by live key, the race of two first messages, load and close, the client counter — server/services/conversations.js, server/test/helpers/conversation-fixtures.js
- [ ] A4: Send every outbound message through one function that can refuse — do-not-contact, the test rule, a profile that is not live, the window, the button limit, a failed send; its test file — server/services/outbound.js, server/test/outbound.test.js
- [ ] A5: Handle every inbound message in one place, once — the duplicate check, the client by phone, the stored message, the window, the button registry, the wait that joins a burst, the turn hook; its test file with the log check — server/services/inbound.js, server/test/inbound.test.js
- [ ] A6: Let the owner write as a test guest and wipe what the test left — the inbound route with its refusals, the test-data delete, both owner or platform admin only; the router test — server/routes/sim.js, server/test/sim-router.test.js
- [ ] A7: Keep test bookings out of the front desk numbers — the one filter and its test case — server/services/frontdesk-stats.js, server/test/frontdesk-stats.test.js
- [ ] A8: Record the new pieces where the next plans look for them — the folder map, the registry rows, the map's extension lines — server/breadcrumbs.md, docs/brain/inventory.md, docs/brain/component-families.md, docs/restaurant/restaurant-map.md
- [ ] A9: Run every check of this plan and hand Dandan the template list to confirm — test:server, build, both lints, the two greps, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `upsertClientByPhone` (unchanged), `checkStoredDoc`, `newId`, `requireModule`, `isPlatformAdmin`,
  the schemas and indexes of plan 662.
- New files needed: `message-templates.ts`, `inbound.js`, `outbound.js`, `conversations.js`,
  `channels/index.js`, `channels/sim-channel.js`, four test files, one test helper.
- Model changes: none (the shapes are plan 662's).
- Backend / API: `POST /api/v1/sim/inbound`, `DELETE /api/v1/sim/test-data`.
- Auth and validation: owner or platform admin, module `frontdesk`; body limits as listed; the business always
  comes from the signed token.
- Security surface: the simulator can create clients and conversations — test ones only, never on a real
  client's phone (409 `REAL_CLIENT`), never through a real transport (`TEST_ONLY`). The delete removes only rows
  marked as test. Logs carry ids and counts, never a name, a phone or a text.
- Data / migration: none; the first rows of `conversations` and `messages` are written.
- Project checks: the `log-query` Done-when item; no dictionary key, icon or route; `server/breadcrumbs.md` and
  the registry files are in scope; the routes are dedicated (not the generic API) because guests' message text
  must have one door (map delta 11).

## Out of Scope
- The member's routes of a conversation, retention of conversations and their cross-business test (plan 687).
- The scheduler, the reminder, `POST /sim/clock`, the Confirm / Cancel button handlers (plan 676).
- The assistant's turn (plan 679), the inbox (677), the simulator screen (678), real WhatsApp (683).
- Voice notes (R-13) and the owner alert (R-17, plan 683).
- Leaving test clients out of the clients list and the exports (plan 678).

## Critical Questions
- none

## Execution Notes
- behaviour: a new conversation always starts as `bot`; with no assistant yet it moves to `human` after the wait.
- behaviour: a message to a closed conversation opens a new conversation; the closed one stays closed.
- behaviour: the simulator creates its client with source `manual` (the client schema has no `sim` source and is not a file of this program).
- behaviour: outside the 24-hour window a button message is refused like free text; only a template passes.
- behaviour: the simulator refuses a phone that belongs to a real client (409 `REAL_CLIENT`).
- behaviour: the Hebrew bodies of the templates are added by plan 677, so this server plan edits no browser file.
