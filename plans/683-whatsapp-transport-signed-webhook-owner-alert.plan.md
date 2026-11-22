# Plan 683 — Real WhatsApp: the second transport, the signed webhook, and the alert to the owner's phone

Status: draft
Depends-on: 675, 676
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Everything the conversation channel does — guests writing, the assistant answering, reminders with buttons, a
member replying from the inbox — works today only inside the simulator. The pipeline was built for two transports
(Contract C-CHANNEL), and the second one is missing: no message can reach a real phone and no real message can
come in. The owner also learns about a waiting request only by opening the app.

This plan adds the real transport and nothing above it. (1) `server/services/channels/whatsapp-channel.js` sends
through the Meta WhatsApp Cloud API over plain HTTPS, with no SDK. (2) `server/routes/webhooks-whatsapp.js`
receives Meta's calls: the verify handshake on `GET`, and on `POST` a signature check over the raw body before
anything is parsed, then the same `handleInbound` the simulator uses. (3) When a request waits for the owner, or a
conversation was handed to a person, the owner gets one short template message on his own phone, if he opted in
(rule R-17). It all stays switched off unless the three `WHATSAPP_*` variables are set, so a server without them —
every test run, every local machine — behaves exactly as before.

This is the last, optional run of the program (`rs-wa`). Its hand check needs gate G-WA: a developer app at Meta
with its test number, Dandan's private phone as an allowed recipient, and the variables set.

Verified on `origin/main` (28359b6d, 2026-11-22):
- There is no WhatsApp code: no `server/routes/webhooks-whatsapp.js`, no `server/services/channels/`.
- `server/app.js`: the client-log router mounts at line 202, **before** the global `express.json({ limit: '2mb' })`
  of line 204, because it parses its own body — the precedent for a route that needs the raw body. Routers are
  required at lines 12–32; `/api/v1/public` mounts last (line 233).
- `render.yaml:38–46` already names `PUBLIC_BASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN` (`sync: false`).
- `docs/security-go-live.md:45–46` has a two-line "Webhook (plan 560, before it goes live)" section, and lines
  100–103 describe the uptime ping a sleeping free server needs.
- `shared/schemas/entities/front-desk-profile.schema.ts:73–77`: `whatsapp?: { phoneNumberId: string ≤ 100,
  ownerAlertPhone?: string ≤ 30, ownerAlertOptIn: boolean }`, server-owned (`PROFILE_SERVER_FIELDS`, line 12).
  **Nothing writes it** — no route, no script, no screen. `FRONT_DESK_STATUSES = ['draft', 'pilot', 'active',
  'suspended']` (line 6).
- `server/scripts/set-front-desk-status.js` is the pattern of a small operator script: `--slug=`, local by default
  through `parseTarget`, Atlas only with `--target=atlas --confirm-host=<host>`, one result line.
- `server/utils/actor.js:14–17`: `guestActor('whatsapp')` → `'public:whatsapp'`.
- `server/utils/request-create.js:37–95` (`createRequest`): the one place a request is inserted; it returns
  `{ request, client }`. `shared/schemas/entities/request.schema.ts:12–22`: `REQUEST_SERVER_FIELDS`; the schema is
  strict and has no alert field.
- `docs/brain/invariants.md` INV-1 already names `server/routes/webhooks-whatsapp.js` in its **Rule** ("A non-member
  writes only through `server/routes/public.js` and `server/routes/webhooks-whatsapp.js`"), but not in `Touches`.
  `server/test/invariants.test.js:195–210` holds the "INV-1 guest door" tests for `public.js`.
- `docs/frontdesk/assistant-behaviour-rules.md:31` (R-17): template parameters are one line; the same request
  alerts the same phone at most once per 6 hours; never about a do-not-contact client. Line 33 (R-19): test rows
  and `draft` / `suspended` profiles send nothing to a customer.
- Server tests fake outbound HTTP by stubbing the global `fetch` (`server/test/knowledge-import.test.js:24–25`).
- Not on `main` yet, created by earlier plans (read them; use their names if they differ):
  - 675: `server/services/channels/index.js` (`channelFor`, `setChannelForTest`; a transport is `{ name, real,
    clientSource, send(db, conversation, outbound) → { providerMessageId, status } }`; for `whatsapp` it returns a
    stand-in whose `send` answers `failed` until this plan), `server/services/outbound.js` (`sendOut`, which already
    refuses a test conversation on a real transport and a profile that is not `pilot` / `active`),
    `server/services/inbound.js` (`handleInbound(db, { businessId, channel, waId, guestName, text, buttonId,
    providerMessageId, at, actor }, { log })`, idempotent on `providerMessageId`),
    `shared/schemas/front-desk/message-templates.ts` (`MESSAGE_TEMPLATES`, `templateMessage`, `oneLine`).
  - 676: `server/jobs/scheduler.js` (`runDue`), the reminder job that sends `booking_reminder` through `sendOut`.
  - 679: `handOff(db, conversation, { now, silent })` in `server/services/frontdesk-turn.js`.

## Goals & Success Criteria
**Primary:** with the three variables set, a real WhatsApp message reaches the same pipeline as a simulator message
and its answer reaches the guest's phone; without them nothing changes; a forged call is refused before it is read.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/whatsapp-webhook.test.js`,
  `server/test/whatsapp-channel.test.js`, `server/test/owner-alert.test.js` and the new INV-1 cases in
  `server/test/invariants.test.js`. In all of them the outbound call is a stubbed `fetch`; no secret and no network.
- [auto] `server/test/whatsapp-webhook.test.js` ("off"): with no `WHATSAPP_*` variable set, `GET` and `POST
  /api/v1/webhooks/whatsapp` answer 404 and nothing is stored.
- [auto] same file ("verify"): with the variables set, `GET ?hub.mode=subscribe&hub.verify_token=<right>&
  hub.challenge=abc` answers 200 with the body `abc` as plain text; a wrong token and a missing `hub.mode` answer 403.
- [auto] same file ("signature"): a `POST` whose `X-Hub-Signature-256` is the HMAC-SHA256 of the exact raw body
  with the app secret answers 200; the same body with one byte changed, a header without the `sha256=` prefix, a
  header of another length, and no header each answer 401, and for each of them `handleInbound` was not called and
  no row exists; a body that is not JSON but is correctly signed answers 200 and stores nothing.
- [auto] same file ("inbound"): the fixture `server/test/fixtures/whatsapp/text-message.json`, signed, for a
  business whose profile holds the fixture's `phone_number_id` → one client, one `whatsapp` conversation without
  `test`, one inbound message with the fixture's provider id; the same delivery sent twice stores one message;
  `button-reply.json` reaches `handleInbound` with the `buttonId` of the fixture; `status-delivered.json` moves the
  outbound message with that provider id to `delivered` and `status-read.json` to `read`, and never backwards.
- [auto] same file ("routing"): a `phone_number_id` no profile holds, with a sender who has no open `whatsapp`
  conversation, answers 200, stores nothing and logs `whatsapp.webhook.unresolved` once; the same sender with an
  open `whatsapp` conversation of business B lands in business B; two profiles never hold one id (the script test).
- [auto] same file ("logs"): the captured log lines of a full inbound hold counts, ids and lengths only — no part of
  the text, no phone number, no header value and no secret.
- [auto] `server/test/whatsapp-channel.test.js`: with the variables set, `sendOut` on a `whatsapp` conversation of a
  `pilot` profile calls `fetch` once with the URL `https://graph.facebook.com/<version>/<phoneNumberId>/messages`,
  the header `Authorization: Bearer <token>` and a JSON body of `type: 'text'` for a text, `type: 'interactive'`
  with at most three reply buttons for a button message, and `type: 'template'` with the catalogue name, the
  language code `he` and the parameters in order for a template; the stored row has Meta's message id as
  `providerMessageId` and `status: 'sent'`; a 400 answer and a thrown `fetch` store the row as `failed` and
  `sendOut` answers `SEND_FAILED`; a `draft` profile and a `test: true` conversation never reach `fetch`.
- [auto] same file: with no variable set, `channelFor` of a `whatsapp` conversation still answers `failed` and
  `fetch` is not called; a conversation on the `sim` channel never calls `fetch` in either case.
- [auto] `server/test/owner-alert.test.js`: a request stored as `qualified` through the public form, for a `pilot`
  profile with `ownerAlertOptIn: true` and an `ownerAlertPhone`, calls `fetch` once with the template
  `owner_request_waiting` to that phone; a second trigger for the same request inside 6 hours sends nothing and one
  after 6 hours sends again; opt-in off, no phone, a `draft` profile, a `test: true` request, a request of a
  do-not-contact client, a request created by a member, and no variables each send nothing; a parameter given as
  "a\n b\t c" arrives as "a b c"; a failing `fetch` does not fail the request that triggered it.
- [auto] same file: a conversation handed to a person (`handOff`) alerts once with the kind `conversation`, under
  the same rules.
- [auto] `server/test/invariants.test.js`: "INV-1 guest door: webhooks-whatsapp.js never reads a member token" (the
  source holds none of `verifyToken`, `verifyAccessToken`, `decodeAccessToken`, `req.user`, `recordUsage`), and
  "INV-1 guest door: a member token gives nothing extra on the webhook".
- [auto] `node server/scripts/set-front-desk-whatsapp.js --slug=<slug> --phone-number-id=123 --owner-phone=0501234567
  --opt-in=yes` on the local database prints `FRONT_DESK_WHATSAPP: <slug> set` and stores the three fields; with an
  id another profile holds it prints an error and exits 1 (covered by `server/test/whatsapp-webhook.test.js`,
  which runs the script's exported function against the test database).
- [auto] `grep -rn "'whatsapp'" server/services server/routes --include=*.js` lists only files under
  `server/services/channels/`, `server/routes/webhooks-whatsapp.js`, `server/routes/sim.js` and
  `server/utils/actor.js` (C-CHANNEL: nothing else branches on the channel name).
- [auto] `pnpm run test:ci` → exit 0 (no browser file changes). `pnpm run build` → exit 0.
  `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/683-whatsapp-transport-signed-webhook-owner-alert.plan.md`
  → exit 0 after INV-1 `Touches` gains the webhook file.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] (after gate G-WA, on the deployed server) Dandan writes from his private phone to the test number, books
  a table by chat and gets the answer on the phone; the conversation shows in the inbox with the channel WhatsApp.
- [human] Dandan sets his own phone as the owner phone with the script, sends a request through the public page and
  gets one alert message; a second request alert for the same request does not arrive inside six hours.

## Execution Mode
- Parallel: no — the only plan of run `rs-wa`. It edits `server/app.js`, a shared registry file: the map names
  this plan as the one allowed exception (C-REGISTRY-R, "The webhook router is added by R21, not here"). It also
  edits `server/services/inbound.js` neighbours and `server/index.js` is not touched. No other plan of the program,
  and no open plan that edits `server/app.js`, runs beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/webhooks-whatsapp.js
server/services/channels/whatsapp-channel.js
server/services/channels/index.js
server/services/whatsapp-routing.js
server/services/owner-alert.js
server/services/frontdesk-turn.js
server/utils/request-create.js
server/scripts/set-front-desk-whatsapp.js
server/app.js
server/breadcrumbs.md
shared/schemas/front-desk/message-templates.ts
shared/schemas/entities/request.schema.ts
shared/schemas/entities/conversation.schema.ts
server/test/whatsapp-webhook.test.js
server/test/whatsapp-channel.test.js
server/test/owner-alert.test.js
server/test/invariants.test.js
server/test/message-templates.test.js
server/test/fixtures/whatsapp/**
render.yaml
docs/security-go-live.md
docs/brain/invariants.md
docs/restaurant/restaurant-map.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the rule already names `server/routes/webhooks-whatsapp.js` as the second guest door (ADR 0030); this plan builds it to that rule: it reads no member token, the server resolves the business (from the receiving number id or the sender's open conversation, never from a field the sender controls), and every write is stamped `public:whatsapp` by the inbound handler. Only `Touches` grows by the webhook file. `server/utils/request-create.js` gains one call after the insert and no change to who may create a request.
- INV-2: preserves — every query of `server/services/whatsapp-routing.js` and `server/services/owner-alert.js` is by the business the server resolved; no data crosses businesses, and the routing lookup returns a business id only.
- INV-4: preserves — the two new optional server fields (`ownerAlertedAt` on a request and on a conversation) and the ninth template are declared in `shared/schemas`; every stored row is still checked against its schema.
- INV-6: preserves — this plan makes no model call; the transport's `fetch` goes to the messaging provider, and the turn handler it feeds is unchanged.
- INV-7: preserves — the transport carries what the server decided; a table is still offered and confirmed only by the engine and the hold. The webhook writes no booking itself.

## Reuse Check

- `whatsapp-channel.js` (transport) — family: none — rung: 4 — why: no registry family holds the transports yet; the second implementation of the transport shape plan 675 defined (`{ name, real, clientSource, send }`), registered in `channels/index.js`
- `whatsapp-routing.js` (`resolveBusiness`) — family: none — rung: 4 — why: nothing maps a receiving number to a business today
- `owner-alert.js` (`notifyOwner`) — family: none — rung: 4 — why: no outbound message goes to a member's phone today; one service owns the R-17 rules so no caller repeats them
- `set-front-desk-whatsapp.js` — family: none — rung: 4 — why: no registry family holds operator scripts; an operator script in the pattern of `server/scripts/set-front-desk-status.js`

## Defaults

- empty-state-on-list — exception — why: server only; the plan builds no list
- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a guest, I want to write to the restaurant on WhatsApp and get the same answers I would get anywhere else, so
  that I do not need an app or a web page.
- As the owner, I want a short message on my own phone when a request waits for me, so that I approve it while the
  app is closed.
- As the product owner, I want the real channel to be a switch of three variables, so that tests, local machines
  and every business on the simulator are untouched.

## Functional Requirements

### Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

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

### Must Have (P0)

**The switch**
- [ ] `whatsappConfig()` (in `whatsapp-channel.js`) reads `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN` at call time and returns them only when all three are non-empty; otherwise `null`.
  `WHATSAPP_GRAPH_VERSION` is optional (default `v21.0`, one constant; Dandan confirms the current version at gate
  G-WA). No value is read at module load, cached in a log, or sent to the browser.
- [ ] With `null`: the webhook answers 404 to every method, `channelFor` keeps plan 675's stand-in for `whatsapp`,
  and `notifyOwner` returns at once.

**The transport — `server/services/channels/whatsapp-channel.js`** (new)
- [ ] `{ name: 'whatsapp', real: true, clientSource: 'whatsapp', send(db, conversation, outbound) }`, registered
  in `server/services/channels/index.js` in place of the stand-in when `whatsappConfig()` is not `null`.
- [ ] `send` loads the profile of `conversation.businessId` for `whatsapp.phoneNumberId` (none → `{ status:
  'failed' }`), then one `fetch` `POST https://graph.facebook.com/<version>/<phoneNumberId>/messages` with
  `Authorization: Bearer <token>`, `Content-Type: application/json`, a 10-second abort timeout, and the body
  `{ messaging_product: 'whatsapp', to: conversation.waId, … }`:
  - `text` → `type: 'text', text: { body }`;
  - `button` → `type: 'interactive', interactive: { type: 'button', body: { text }, action: { buttons: [{ type:
    'reply', reply: { id, title } }] } }` — at most three, each title cut to 20 characters;
  - `template` → `type: 'template', template: { name, language: { code: 'he' }, components: [{ type: 'body',
    parameters: [{ type: 'text', text }…] }, and for each button { type: 'button', sub_type: 'quick_reply', index,
    parameters: [{ type: 'payload', payload: id }] }] }`.
  A 2xx answer with `messages[0].id` → `{ providerMessageId: <that id>, status: 'sent' }`; anything else, a thrown
  error or a timeout → `{ providerMessageId: 'wa-failed:' + newId(), status: 'failed' }`. No retry (the caller
  stores the failure; a person sees it in the inbox).
- [ ] `sendTemplateTo(phone, businessId, templateOutbound)` — the same call for a phone that has no conversation
  (the owner alert); it writes no row.
- [ ] The file logs `whatsapp.send` with `kind`, `status`, the HTTP status and the conversation id only. The
  token, the phone and the text are never logged, also not inside a caught error (log `err.name` and the status,
  never the request).

**Who the message is for — `server/services/whatsapp-routing.js`** (new)
- [ ] `resolveBusiness(db, { phoneNumberId, waId })` → a business id or `null`, in this order: the live profile
  whose `whatsapp.phoneNumberId` equals the receiving id; else the newest conversation with `liveKey: 'whatsapp:' +
  waId` (the pattern of plan 662's index) — its business; else `null`. The message's text is never read here.

**The webhook — `server/routes/webhooks-whatsapp.js`** (new) and its mount
- [ ] `server/app.js`: one require beside the other routers and one mount **before** the global `express.json` of
  line 204, beside the log router: `app.use('/api/v1/webhooks/whatsapp', express.raw({ type: '*/*', limit:
  '256kb' }), webhooksWhatsappRouter)`. No other line of `app.js` changes; no other route gets a raw body.
- [ ] `GET /` — `hub.mode === 'subscribe'` and `hub.verify_token` equal to the verify token (compared with
  `crypto.timingSafeEqual` on buffers of equal length) → 200, `Content-Type: text/plain`, the body is
  `hub.challenge` as sent; otherwise 403.
- [ ] `POST /`, in this order, and nothing before step 1 reads the body:
  1. `req.body` must be a `Buffer`; the header `X-Hub-Signature-256` must be `sha256=` + 64 hex characters; the
     HMAC-SHA256 of the raw buffer with the app secret is compared with `crypto.timingSafeEqual`. Any failure →
     401 `{ error: 'BAD_SIGNATURE' }`, one log line `whatsapp.webhook.refused` with the reason only.
  2. Answer 200 `{ ok: true }` **at once**.
  3. Then, in the same process and never failing the answer: parse the JSON (a parse error is logged and dropped);
     for each `entry[].changes[].value`: `metadata.phone_number_id`; each `messages[]` item of type `text`
     (`text.body`), `interactive` (`interactive.button_reply.id`) or `button` (`button.payload`) → `resolveBusiness`
     → `handleInbound(db, { businessId, channel: 'whatsapp', waId: from, guestName: the matching
     contacts[].profile.name, text, buttonId, providerMessageId: id, at: timestamp × 1000, actor:
     guestActor('whatsapp') }, { log })`; any other message type is stored through `handleInbound` with an empty
     text only when a conversation exists, and otherwise dropped; each `statuses[]` item → the outbound message
     with that `providerMessageId` moves forward along `sent → delivered → read` (or to `failed`), scoped by the
     resolved business, never backwards.
  4. An unresolved business: nothing is stored, one line `whatsapp.webhook.unresolved`, no reply is sent.
- [ ] The route exports a promise hook for tests (`lastWork()`), so a test awaits step 3 without a sleep.
- [ ] The router reads no member token, uses no `verifyToken`, counts no usage, and has no rate limiter of its own
  (the signature is the gate; the provider retries on anything but 200).
- [ ] The fixtures under `server/test/fixtures/whatsapp/` (`text-message.json`, `button-reply.json`,
  `template-button.json`, `status-delivered.json`, `status-read.json`, `unknown-type.json`) are the shape the tests
  hold the code to. They use invented ids and the phone `972500000001`. The Worker checks them against Meta's
  current Cloud API reference when he has it; if the reference cannot be read, he says so in Execution Notes and
  Dandan's first hand check is the proof.

**The owner alert — `server/services/owner-alert.js`** (new)
- [ ] `shared/schemas/front-desk/message-templates.ts` gains a ninth template, last in the list:
  `owner_request_waiting(business, kind, reference)` with the body key `tpl_owner_request_waiting` and no button.
  `server/test/message-templates.test.js` (plan 675) expects nine names. The eight existing names and their
  parameter order are untouched.
- [ ] `requestSchema` and `conversationSchema` each gain optional `ownerAlertedAt: number`; on the request it joins
  `REQUEST_SERVER_FIELDS`.
- [ ] `notifyOwner(db, { businessId, kind: 'request' | 'conversation', id, clientId, reference, requestKind?, test
  }, { now = Date.now(), log })` sends nothing and returns `{ sent: false, reason }` when: `whatsappConfig()` is
  `null`; `test` is true; the profile is missing, not `pilot` / `active`, has no `whatsapp.ownerAlertOptIn` or no
  `ownerAlertPhone`; the client is do-not-contact (R-17); or the row's `ownerAlertedAt` is less than 6 hours before
  `now`. Otherwise it claims the alert with one conditional update (`ownerAlertedAt` absent or older than 6 hours →
  set to `now`; a lost race sends nothing), builds `templateMessage('owner_request_waiting', { business: the
  profile's display name, kind: the request kind or 'conversation', reference })` (every value through `oneLine`),
  and calls `sendTemplateTo`. It never throws: a failure is logged as `owner.alert.failed` with the reason.
- [ ] Callers, each one line after the write, awaited inside a `try` that swallows: `createRequest`
  (`server/utils/request-create.js`) when the stored `status` is `qualified` and `via` is not `'member'`; `handOff`
  (`server/services/frontdesk-turn.js`) for a conversation that just became `human`. Nothing else alerts.
- [ ] The owner is alerted on his phone only; the alert is not a `messages` row and not a conversation.

**Setting the number — `server/scripts/set-front-desk-whatsapp.js`** (new)
- [ ] `node server/scripts/set-front-desk-whatsapp.js --slug=<slug> [--phone-number-id=<id>] [--owner-phone=<phone>]
  [--opt-in=yes|no] [--clear] [--target=local|atlas] [--confirm-host=<host>]` — local by default, Atlas only with
  the two flags, as `set-front-desk-status.js`. It sets `whatsapp` on that profile (the phone normalised with
  `normalizePhone` of `shared/schemas/phone.ts`), refuses a `phone-number-id` another live profile holds (exit 1),
  and prints `FRONT_DESK_WHATSAPP: <slug> set` or `… cleared`. Its work is an exported function the test calls.
  No screen writes these fields in this plan.

**Documents**
- [ ] `render.yaml`: the comment of the WhatsApp block names this plan instead of plan 560 and adds the optional
  `WHATSAPP_GRAPH_VERSION`. No value is written.
- [ ] `docs/security-go-live.md`: the "Webhook" section is rewritten for what was built — the path, the verify
  handshake, the signature over the raw body checked before any parse, constant-time compare, 200 at once, no
  secret and no message text in logs, what happens without the variables, the script that sets a business's
  number, that the uptime ping of the "Keeping the server awake" section is needed for a webhook to be heard, and
  gate G-WA's list: the developer app, the test number, the allowed recipient, the nine templates created at the
  provider in Hebrew with the catalogue's names and parameter order (until a template is approved there, a
  template send is stored as `failed`), and never a personal number as the business number.
- [ ] `docs/brain/invariants.md`: INV-1 `Touches` gains `server/routes/webhooks-whatsapp.js`. No other field changes.
- [ ] `docs/restaurant/restaurant-map.md`: one line under "Contract extensions (run)" — the ninth template, the two
  `ownerAlertedAt` fields, the routing order, and "a template is always sent as the provider's template".

### Should Have (P1)
- [ ] `server/breadcrumbs.md` gains the five new server files.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built and no dictionary key is added by this plan: `tpl_owner_request_waiting` is the provider's
  template text ("יש בקשה חדשה ב-{{1}}: {{2}}, מספר {{3}}"), written into `docs/security-go-live.md` for gate G-WA.
  The inbox of plan 677 already shows a conversation's channel.

## Atomic Sub-tasks

- [ ] A1: Build the switch and the real transport so the pipeline can reach a phone — the config reader, the three message shapes, the result mapping, the send to a phone without a conversation, registration in the channel index — server/services/channels/whatsapp-channel.js, server/services/channels/index.js
- [ ] A2: Decide which business an incoming message belongs to without reading its text — the receiving number first, then the sender's open conversation — server/services/whatsapp-routing.js
- [ ] A3: Open the signed door for incoming messages — the verify handshake, the signature check before any parse, the immediate answer, the in-process handling of messages and delivery states, the test hook; the mount with a raw body for this route only — server/routes/webhooks-whatsapp.js, server/app.js
- [ ] A4: Prove the door and the transport with recorded shapes and a faked network — six fixture files, the off, verify, signature, inbound, routing and log cases, the transport cases — server/test/fixtures/whatsapp/, server/test/whatsapp-webhook.test.js, server/test/whatsapp-channel.test.js
- [ ] A5: Tell the owner on his own phone when something waits for him — the ninth template, the two alert time fields, the one service with the six-hour and opt-in rules, its two callers — shared/schemas/front-desk/message-templates.ts, shared/schemas/entities/request.schema.ts, shared/schemas/entities/conversation.schema.ts, server/services/owner-alert.js, server/utils/request-create.js, server/services/frontdesk-turn.js, server/test/owner-alert.test.js, server/test/message-templates.test.js
- [ ] A6: Give the operator one command that connects a business to a number — the script with its refusal of a number already in use, tested through its exported function — server/scripts/set-front-desk-whatsapp.js, server/test/whatsapp-webhook.test.js
- [ ] A7: Hold the new door to the ownership rule — the webhook file in the rule's file list, the two guest-door tests — docs/brain/invariants.md, server/test/invariants.test.js
- [ ] A8: Write down how to switch it on safely — the go-live section with gate G-WA's list, the deployment variables comment, the folder map, the map's extension line — docs/security-go-live.md, render.yaml, server/breadcrumbs.md, docs/restaurant/restaurant-map.md
- [ ] A9: Run every check of this plan and hand Dandan the two phone checks — test:server, test:ci, build, server lint, the channel-name grep, the architecture gate, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `handleInbound`, `sendOut`, `channelFor`, the template catalogue (675); the reminder job (676);
  `handOff` (679); `createRequest`; `guestActor`; `normalizePhone`. Node's own `crypto` and `fetch`; no package is
  added.
- New files needed: the transport, the routing service, the alert service, the webhook router, the script, three
  test files, six fixtures.
- Model changes: optional `ownerAlertedAt` on a request and on a conversation; a ninth template name.
- Backend / API: `GET` and `POST /api/v1/webhooks/whatsapp`, public, signed. No member route changes.
- Auth and validation: the verify token on `GET`; the HMAC signature on `POST`; the JSON is read defensively
  (every field optional, unknown types ignored).
- Security surface (new, public):
  - The signature is checked on the raw bytes before the body is parsed; a body that fails is never read.
  - Secrets are compared in constant time, on buffers of equal length (an unequal length is refused first).
  - The route answers 200 before it works, so a slow model call can never make the provider retry and double a
    message; a repeated delivery is dropped by the unique provider id (plan 662's index).
  - The body is capped at 256 kb for this route.
  - The business is resolved by the server from the receiving number or the sender's own open conversation — never
    from text, a header or a query the sender controls.
  - Logs hold counts, ids, lengths and HTTP statuses: no token, no secret, no signature, no phone, no text.
  - Without the three variables the route does not exist (404) and no outbound call is possible.
  - A test conversation and a `draft` / `suspended` profile never reach the real transport (plan 675's `sendOut`).
- Data / migration: none; the new fields are optional.
- Project checks: the `log-query` Done-when item; no dictionary key and no icon; `server/breadcrumbs.md` in scope;
  the collection checklist does not apply (no new collection).

## Out of Scope
- Business verification at Meta, a number per business through embedded signup, and any screen for the WhatsApp
  fields of the profile (brief Part 6).
- Voice notes, images and documents in a conversation (R-13, later): such a message is stored as an empty text.
- SMS, marketing templates, broadcasts.
- A retry queue for failed sends.
- A paid model key (gate G-KEY) — a condition of use with real customers, not of this plan.

## Critical Questions
- none

## Execution Notes
- behaviour: the WhatsApp fields of a profile are set by an operator script only; no screen is built (first stage is internal testing, D4).
- behaviour: a template message is always sent as the provider's own template by name, also inside the 24-hour window; the nine templates must exist at the provider before the hand check (gate G-WA).
- behaviour: an incoming message for a number no business holds, from a sender with no open conversation, is dropped without a reply (the "which business?" reply of the front desk brief is not built).
- behaviour: the owner is alerted for a qualified request that a guest or the assistant created, and for a conversation handed to a person; never for a request a member created.
- behaviour: a failed send is stored as failed and not retried.
