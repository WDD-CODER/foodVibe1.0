# Plan 549 — Store customer requests and bookings on the server: manual request, status moves, lazy expiry

Status: draft
Depends-on: 545, 548
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Today the only thing a customer can "want" in FoodVibe is an event inquiry, typed straight into `menuEvents` by a
member. The Front Desk program (`docs/frontdesk/frontdesk-map.md`, map row 7, spec FD-03) needs one intake object for
every channel and every business type — a **request** ("בקשה") — and a simple calendar record for what an approved
table, tasting or consultation becomes — a **booking**. This plan adds both collections, their shared schemas, the
dedicated routers that own every write (manual request from a phone call, status moves, editing what the customer
wants), lazy expiry, and the client data services. Approve / decline / day load / decision log are plan 550.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- The dedicated-router pattern is `server/routes/events.js`: `loadEvent`, `validMerged` (Zod check of the merged doc), `fail` (logs `events.<name>.failed`, 500), `writeConditional` (filter on the read `stage`, 409 `STAGE_CHANGED` on a concurrent move), `router.use(dataWriteLimiter)`, `verifyToken` per route, `scopeFilter(req)` + `LIVE` from `server/jobs/purge-deleted.js`. Plan 543 moves `actorOf` to `server/utils/actor.js` (C-ACTOR).
- `server/utils/permissions.js` `can()`: for staff, any action other than create/edit/delete reaching the end hits `if (type !== undefined && type !== EVENTS) return deny('NOT_AN_EVENT')` — a new any-member action must return before that line. Client mirror: `src/app/core/services/permission.service.ts`.
- `server/routes/generic.js` serves every `userData` type for reads and writes; there is no "read-only through generic" flag today. Express `router.param('type', …)` runs for every route of that router that has a `:type` parameter.
- `server/test/cross-business.test.js` posts a `BODY[type]()` through the generic API for every `ALL_USER_ENTITY_TYPES` member and expects 201.
- Client calls to a dedicated router follow `src/app/core/services/event-pipeline.service.ts` (`HttpClient` + `API.events` from `src/app/core/services/http-storage.adapter.ts`, result `{ ok: true, … } | { ok: false, code }`).
- A type named `Request` would shadow the global Fetch `Request` in the client; the TS type is `FrontDeskRequest`.
- Plan 545 provides `upsertClientByPhone(db, businessId, { name, phone, source, actor }) → { client, created }` in `server/utils/client-upsert.js`; plan 548 provides `qualify`, `templateFor`, `WANTED_QUESTION_KEYS`, `FRONT_DESK_REQUEST_KINDS` in `shared/schemas/front-desk/` and `shared/schemas/front-desk-templates.ts`; plan 543 provides `newPublicToken()` in `server/utils/public-token.js`.

## Goals & Success Criteria
**Primary:** a member records a customer's phone request in one call; the server finds or creates the client, checks
the request against the profile's rules, stores it with its status history, and is the only writer of every status.

- [auto] `pnpm run test:server` passes, including `server/test/requests-router.test.js`, `server/test/bookings-router.test.js`, `server/test/request-expiry.test.js`, `server/test/cross-business.test.js`, `server/test/permissions.test.js` and `server/test/collections.test.js`.
- [auto] Request status moves: every pair in the table under P0 is tested — each legal move answers 200 and appends one `statusHistory` entry stamped by `actorOf`; each illegal move answers 409 `{ error: 'BAD_STATUS' }` and changes nothing (`server/test/requests-router.test.js`).
- [auto] Booking status moves: `confirmed → seated → finished`, `confirmed → no_show` after `startAt`, `confirmed | seated → cancelled` answer 200; `no_show` before `startAt`, `finished → seated`, `cancelled → confirmed` answer 409 `BAD_STATUS`; `no_show` adds 1 to the client's `counters.noShows` (`server/test/bookings-router.test.js`).
- [auto] A staff member `POST /api/v1/requests` with a new name + phone → 201; a client with that phone now exists with `source: 'manual'`, `counters.requests: 1`, `lastContactAt` set, `kinds: ['lead']`; a second request with the same phone in `+972` form reuses that client and makes `counters.requests: 2` (`server/test/requests-router.test.js`).
- [auto] A manual request with every required answer is stored `qualified` with `qualification.by: 'rules'` and the exact `qualify` reasons; one missing a required answer is stored `needs_info` (`server/test/requests-router.test.js`).
- [auto] Generic `POST`, `PUT /:id` and `DELETE /:id` on `/api/v1/data/requests` and `/api/v1/data/bookings` answer 405 `{ error: 'USE_ROUTER' }` and write nothing; generic `GET` lists the caller's business's requests (`server/test/requests-router.test.js`).
- [auto] Expiry: a `new` request older than its kind's `expireAfterHours` is `expired` (history `via: 'server'`) after the next `GET /api/v1/data/requests`; a `qualified` one of the same age is untouched; another business's requests are untouched (`server/test/request-expiry.test.js`).
- [auto] Business Y cannot list, read, move or edit business X's requests or bookings (404) (`server/test/cross-business.test.js`).
- [auto] `pnpm run test:ci` passes, including `src/app/core/services/request-data.service.spec.ts` and `src/app/core/services/booking-data.service.spec.ts`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/549-requests-and-bookings-on-the-server-part-1.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0 and `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — 543, 544, 548, 549, 550 all edit `server/utils/permissions.js` and/or `server/constants/collections.js` (map: sequential in wt-1); 549 also edits `server/routes/generic.js`, shared with 544/545.
- Concurrent plans: none in its lane.
- Isolated DB: no — new collections, startup indexes, no migration.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
shared/schemas/entities/request.schema.ts
shared/schemas/entities/booking.schema.ts
shared/schemas/entities/index.ts
server/constants/collections.js
server/utils/permissions.js
server/utils/request-expiry.js
server/routes/requests.js
server/routes/bookings.js
server/routes/generic.js
server/app.js
server/db.js
server/test/requests-router.test.js
server/test/bookings-router.test.js
server/test/request-expiry.test.js
server/test/cross-business.test.js
server/test/permissions.test.js
server/test/collections.test.js
server/breadcrumbs.md
src/app/core/models/request.model.ts
src/app/core/models/booking.model.ts
src/app/core/services/request-data.service.ts
src/app/core/services/request-data.service.spec.ts
src/app/core/services/booking-data.service.ts
src/app/core/services/booking-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
docs/brain/invariants.md
docs/agent/standards-backend.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — requests and bookings belong to one business (`scopeFilter`, `stampNew`); every write goes through the two new routers and `assertCan(req, res, 'manageRequests', { type, doc })`; the generic API reads them and refuses their writes. `server/routes/requests.js` and `server/routes/bookings.js` join INV-1's Touches list (map delta 8, under ADR 0030 / D1); the rule text does not change.
- INV-2: preserves — neither collection is cloneable; nothing is copied from `__master__`; all queries go through `server/utils/business-scope.js`.
- INV-3: preserves — a manual request and its client's counters are written by the server in the same request; the client never loops.
- INV-4: preserves — both shapes are Zod schemas in `shared/schemas` registered in `SCHEMA_BY_COLLECTION`; every router write is checked with `checkStoredDoc` before it is stored.

## Reuse Check

- `requestSchema`, `bookingSchema` — family: none — rung: 4 — why: new entities (`standards-backend.md` §3).
- `server/routes/requests.js`, `server/routes/bookings.js` — family: none — rung: 4 — why: dedicated routers in the shape of `server/routes/events.js` (same helpers, same 409 conventions); a server router is not a UI family.
- `expireDue` (`server/utils/request-expiry.js`) — family: none — rung: 4 — why: the lazy pattern of `server/jobs/purge-deleted.js` (run on read, no scheduler), for a different rule.
- `RequestDataService`, `BookingDataService` — family: entity-data-service — rung: 1 — why: `BaseEntityDataService` as is for reads, plus router calls in the shape of `EventPipelineService`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to type a phone call's details once so that the customer, the request and the check against our rules all exist without extra steps.
- As an owner, I want every request's status changed only by the server, with who did it and when, so that the history is true.
- As an owner, I want stale requests to expire by themselves so that my queue shows only what still needs an answer.
- As a chef, I want a booking to move from confirmed to seated to finished so that the day's agenda reflects the room.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen):
  **C-REQUEST (549, 550; used by 551, 552, 555, 556, 559, 560, 562)**
  - `REQUEST_KINDS = ['table','event','tasting','consultation']`, `REQUEST_STATUSES = ['new','qualified','needs_info','approved','declined','cancelled','expired']`, `REQUEST_CHANNELS = ['manual','public_form','whatsapp']`, `DECLINE_REASONS = ['full','out_of_area','below_minimum','date_taken','other']` in `shared/schemas/entities/request.schema.ts`.
  - `requests` fields as brief FD-03, plus `test?: boolean` (556; excluded from stats). Server-owned (`REQUEST_SERVER_FIELDS`): `status`, `statusHistory`, `qualification`, `outcome`, `publicToken`, `channel`, `suggested`, `conversationId`.
  - `bookings` (`shared/schemas/entities/booking.schema.ts`): `{ kind: 'table'|'tasting'|'consultation', status, source, date, time, startAt, endAt, durationMinutes, partySize, clientId, guestName, guestPhone, requestId?, notes?, statusHistory, publicToken }`.
    - `BOOKING_STATUSES` (Wave 1) = `['confirmed','seated','finished','no_show','cancelled']` — names taken from the reference engine so Wave 2 only *adds* `pending`, `reminded`, `guest_confirmed`. Hebrew labels stay "הגיעו" / "סיימו".
    - `BOOKING_SOURCES` = `['request','phone','walk_in','whatsapp','google','ai']`; Wave 1 writes only `request`.
    - `endAt = startAt + durationMinutes × 60000` (epoch ms; date/time stored business-local `Asia/Jerusalem`).
    - Server-owned (`BOOKING_SERVER_FIELDS`): `status`, `statusHistory`, `source`, `startAt`, `endAt`, `publicToken`.
    - Indexes: `{ businessId, startAt }`, `{ publicToken }` unique (also `requests.publicToken` unique).
  - Routers: `server/routes/requests.js` at `/api/v1/requests` — `POST /` (manual), `PUT /:id/status`, `PUT /:id/wanted`, `POST /:id/approve`, `POST /:id/decline` `{ reason, text? }`; `server/routes/bookings.js` at `/api/v1/bookings` — `PUT /:id/status`, `GET /day?date=YYYY-MM-DD` → `{ bookings, coversByHour }`. Reads through the generic API.
  - Booking status moves (Wave 1): `confirmed → seated → finished`; `confirmed → no_show` after `startAt`; `confirmed|seated → cancelled`; illegal → 409 `BAD_STATUS`.
  - Approve is idempotent: a decided request → 409 `ALREADY_DECIDED`. `event` → `menuEvents` via `buildNewEventDoc` (delta 6), `outcome { type: 'menuEvent', id }`; other kinds → `bookings`, `outcome { type: 'booking', id }`.
  - Action `manageRequests` (any member).
  - `expireDue(db, businessId, now)` in `server/utils/request-expiry.js` (delta 5).
  - `decisionLog` collection (550): `{ requestId, suggestion?, verdict?, decidedAction: 'approve'|'decline'|'ask', decidedBy, editedFields[], secondsToDecision, at }` — no names or phones.
  This plan builds: the two schemas, `POST /`, `PUT /:id/status`, `PUT /:id/wanted`, bookings `PUT /:id/status`, `manageRequests`, `expireDue`. Plan 550 builds approve, decline, `GET /day`, `decisionLog`.
- [ ] `shared/schemas/entities/request.schema.ts`: the four enums above (`REQUEST_KINDS` is `FRONT_DESK_REQUEST_KINDS` from plan 548, re-exported, so the lists cannot drift); `REQUEST_VIA = ['member','guest','ai','server']`; `requestSchema = z.strictObject({ ...baseDocShape, kind, status, channel, clientId: z.string().min(1), guestName: nameField, guestPhone: z.string().max(30), wanted: z.strictObject({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), time: z.string().regex(/^\d{2}:\d{2}$/).optional(), partySize: z.number().int().min(1).max(5000).optional(), eventTypeKey: z.string().max(80).optional(), budgetPerGuest: z.number().min(0).optional(), location: z.string().max(200).optional() }), answers: z.array(z.strictObject({ questionKey: z.string().max(60), label: z.string().max(120), value: z.string().max(500) })).max(30), qualification: z.strictObject({ verdict: z.enum(['fit','borderline','unfit']), reasons: z.array(z.string().max(80)).max(8), by: z.enum(['rules','ai','member']) }).optional(), statusHistory: z.array(z.strictObject({ status, at: z.number(), by: z.string().min(1), byName: z.string().max(200), via, note: z.string().max(500).optional() })).min(1), outcome: z.strictObject({ type: z.enum(['booking','menuEvent']), id: z.string() }).optional(), publicToken: z.string().min(16), conversationId: z.string().optional(), suggested: z.strictObject({ action: z.enum(['approve','decline','ask']), text: z.string().max(600).optional(), at: z.number() }).optional(), test: z.boolean().optional(), decline: z.strictObject({ reason: z.enum(DECLINE_REASONS), text: z.string().max(500).optional(), at: z.number(), by: z.string().min(1) }).optional() })`; `REQUEST_SERVER_FIELDS` = the contract's list plus `decline` (written only by plan 550's `POST /:id/decline`; plan 559 reads `decline.reason` for declines by reason); `manualRequestInputSchema = z.strictObject({ kind, clientId: z.string().optional(), guestName: nameField.min(1).optional(), guestPhone: z.string().min(7).max(30).optional(), wanted, answers: answers.default([]) })` refined so that either `clientId` or both `guestName` + `guestPhone` are present; type `FrontDeskRequest`. Registered as `requests` in `SCHEMA_BY_COLLECTION`.
- [ ] `shared/schemas/entities/booking.schema.ts`: `BOOKING_KINDS = ['table','tasting','consultation']`, `BOOKING_STATUSES`, `BOOKING_SOURCES`, `BOOKING_SERVER_FIELDS` as in the contract; `bookingSchema = z.strictObject({ ...baseDocShape, kind, status, source, date (YYYY-MM-DD), time (HH:mm), startAt: z.number(), endAt: z.number(), durationMinutes: z.number().int().min(5).max(1440), partySize: z.number().int().min(1).max(5000), clientId: z.string().min(1), guestName: nameField, guestPhone: z.string().max(30), requestId: z.string().optional(), notes: z.string().max(1000).optional(), statusHistory: (same entry shape as requests, `via` without `ai`).min(1), publicToken: z.string().min(16) })`, refined `endAt === startAt + durationMinutes * 60000`; type `Booking`. Registered as `bookings`.
- [ ] Collections (`server/constants/collections.js`): `requests` and `bookings` with `{ userData: true, cloneable: false, backup: true, searchable: false, softDelete: false, routerWrites: true }`; new flag `routerWrites` documented in the header ("generic API reads only; every write goes through the type's own router") and an exported `ROUTER_WRITE_TYPES`. `server/test/collections.test.js` checks the flag is boolean when present and the derived list matches it.
- [ ] Generic API (`server/routes/generic.js`): `router.param('type', …)` answers 405 `{ error: 'USE_ROUTER' }` for any non-GET method on a `ROUTER_WRITE_TYPES` type (covers POST, PUT, DELETE, bulk, push-to-master). `GET /requests` (list and by id) first runs `await expireDue(db, req.user.businessId, Date.now())` when the caller has a business.
- [ ] Permissions: `manageRequests` added to `ACTIONS` (not owner-only); in `can()` an `if (action === 'manageRequests') return OK` placed after the owner-only checks and before the event-only line; the client mirror adds `'manageRequests'` and returns true for any signed-in member.
- [ ] `server/routes/requests.js` (mounted `app.use('/api/v1/requests', requestsRouter)` in `server/app.js` beside `/api/v1/events`; `router.use(dataWriteLimiter)`; `verifyToken` on each route; actor only from `actorOf(req)`; helpers `loadRequest`, `validMerged`, `fail`, `writeConditional` filtered on the read `status` → 409 `{ error: 'STATUS_CHANGED' }` when a concurrent write moved it):
  - `POST /` — `manualRequestInputSchema` (400 `BAD_REQUEST_INPUT` with Zod issues); `assertCan(…, 'manageRequests', { type: 'requests' })`; load the business's profile (`frontDeskProfiles`, `{ businessId }`, live) → none: 409 `{ error: 'NO_PROFILE' }`; client: `clientId` given → the live, unmerged client of this business (else 404 `CLIENT_NOT_FOUND`), snapshot its `name` / `phone` into `guestName` / `guestPhone`; else `upsertClientByPhone(db, businessId, { name: guestName, phone: guestPhone, source: 'manual', actor })`; `qualify(profile.requestKinds[kind] ?? { enabled: false, questions: [], rules: {}, expireAfterHours: 24 }, wanted, answers, { now, hours: profile.hours, closedDates: profile.closedDates, kind })`; status `needs_info` when any reason starts with `fd_reason_missing_answer`, else `qualified`; `channel: 'manual'`, `publicToken: newPublicToken()`, `statusHistory: [{ status, at: now, by: actor.userId, byName: actor.name, via: 'member' }]`, `qualification: { …result, by: 'rules' }`; `stampNew`; `checkStoredDoc`; insert; then on the client `$inc: { 'counters.requests': 1 }`, `$set: { lastContactAt: now, updatedAt: now }`, and `kinds: ['lead']` only when the client has no `kinds` yet. 201 with the stored request. Log `requests.created` with `{ kind, status, channel }` only — never the name or phone.
  - `PUT /:id/status` `{ status, note? }` — `manageRequests`; legal moves only:

    | from | to |
    | --- | --- |
    | `new` | `qualified`, `needs_info`, `cancelled` |
    | `qualified` | `needs_info`, `cancelled` |
    | `needs_info` | `qualified`, `cancelled` |

    Every other pair (including any move to `approved`, `declined`, `expired`, and any move out of `approved`, `declined`, `cancelled`, `expired`) → 409 `BAD_STATUS`. Appends one history entry (`via: 'member'`, `note` when sent, ≤ 500).
  - `PUT /:id/wanted` `{ wanted, answers? }` — `manageRequests`; only while `new | qualified | needs_info` (else 409 `{ error: 'ALREADY_DECIDED' }`); re-runs `qualify` with the stored kind; status moves between `qualified` and `needs_info` by the same missing-answer rule (a history entry only when it changed); `qualification.by: 'rules'`.
- [ ] `server/routes/bookings.js` (mounted at `/api/v1/bookings`, same helpers): `PUT /:id/status` `{ status, note? }` — `manageRequests`; the contract's moves; `no_show` only when `Date.now() >= startAt`, else 409 `BAD_STATUS`; a `no_show` also runs `$inc: { 'counters.noShows': 1 }` on the booking's client (same business) in the same request. (`GET /day` is plan 550.)
- [ ] `server/utils/request-expiry.js` `expireDue(db, businessId, now) → number`: reads the business's profile; for each kind in `requestKinds` with `expireAfterHours`, one `updateMany` over `{ businessId, kind, status: { $in: ['new','needs_info'] }, createdAt: { $lte: now - hours * 3600000 } }` that sets `status: 'expired'`, `updatedAt: now` and pushes `{ status: 'expired', at: now, by: 'server', byName: '', via: 'server' }`; returns the count; no profile → 0. Logs `requests.expired` with the count only when > 0.
- [ ] Indexes (`server/db.js`): `requests` `{ businessId: 1, status: 1, createdAt: 1 }` (`requests_business_status`), `{ publicToken: 1 }` unique (`requests_token_unique`); `bookings` `{ businessId: 1, startAt: 1 }` (`bookings_business_start`), `{ publicToken: 1 }` unique (`bookings_token_unique`).
- [ ] Client: `src/app/core/models/request.model.ts` and `booking.model.ts` re-export the schema constants and types; `API` in `http-storage.adapter.ts` gains `requests: \`${API_ROOT}/requests\`` and `bookings: \`${API_ROOT}/bookings\``; `RequestDataService extends BaseEntityDataService<FrontDeskRequest>` (entity `requests`, deferred) with `createManual(input)`, `setStatus(id, status, note?)`, `updateWanted(id, wanted, answers?)`; `BookingDataService extends BaseEntityDataService<Booking>` (entity `bookings`, deferred) with `setStatus(id, status, note?)`. Each router call writes the returned doc into the store and returns `{ ok: true, request | booking } | { ok: false, code }` (pattern: `EventPipelineService`).
- [ ] Docs: `docs/agent/standards-backend.md` §1 rows for both collections (with "router writes only") and §5 rows for the five routes; `docs/brain/invariants.md` INV-1 Touches gains `` `server/routes/requests.js` `` and `` `server/routes/bookings.js` ``; `server/breadcrumbs.md` rows for both routers.
- [ ] Tests as named in the Done-when; `server/test/cross-business.test.js` keeps `BODY` covering every user type by giving `requests` / `bookings` a router-created doc (the generic describe skips `ROUTER_WRITE_TYPES` and a separate describe creates through `/api/v1/requests` or a direct insert, then asserts Y gets 404 on list item, read, `PUT /:id/status`, `PUT /:id/wanted`).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen (the queue and agenda are 552). No dictionary keys, no icons: error codes are returned as codes; 552 maps them to dictionary keys.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Define the request and booking shapes once, shared by server and app — enums, schemas, server-field lists, manual input schema, registry, types — shared/schemas/entities/request.schema.ts, shared/schemas/entities/booking.schema.ts, shared/schemas/entities/index.ts
- [x] A2: Register both collections as read-through-generic, write-through-router, with their indexes and the new member action — collections flag, generic 405 and expiry hook, manageRequests, indexes — server/constants/collections.js, server/routes/generic.js, server/utils/permissions.js, server/db.js
- [x] A3: Let a member record a phone request that finds or creates the client and checks it against the rules — POST / with upsert, qualify, counters, token, history — server/routes/requests.js, server/app.js
- [x] A4: Let members move a request's status and edit what the customer wants, only along allowed paths — PUT /:id/status table, PUT /:id/wanted re-qualify, conditional writes — server/routes/requests.js
- [x] A5: Let members move a booking through confirmed, seated, finished, no-show and cancelled — PUT /:id/status, no-show counter — server/routes/bookings.js, server/app.js
- [x] A6: Expire stale requests when the list is read, not on a timer — expireDue and the generic GET hook — server/utils/request-expiry.js, server/routes/generic.js
- [x] A7: Test every move, the manual create, expiry and tenant isolation — server/test/requests-router.test.js, server/test/bookings-router.test.js, server/test/request-expiry.test.js, server/test/cross-business.test.js, server/test/permissions.test.js, server/test/collections.test.js
- [x] A8: Give the app request and booking data services that call the routers — models, API paths, two services + specs, permission mirror — src/app/core/models/request.model.ts, src/app/core/models/booking.model.ts, src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts, src/app/core/services/http-storage.adapter.ts, src/app/core/services/permission.service.ts
- [x] A9: Record the new collections and routes and run every check — standards-backend §1/§5, invariants Touches, breadcrumbs; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md, docs/brain/invariants.md, server/breadcrumbs.md

## Technical Considerations
- Dependencies: 545 (`upsertClientByPhone`), 548 (`qualify`, profile, `FRONT_DESK_REQUEST_KINDS`), 543 (`actorOf`, `newPublicToken`), 544 (client `counters`, `kinds`, `lastContactAt` as server fields).
- New files needed: two schemas, two routers, `request-expiry.js`, three server tests, two models, two data services + specs.
- Model changes: new `FrontDeskRequest`, `Booking`.
- Backend / API: `POST /api/v1/requests`, `PUT /api/v1/requests/:id/status`, `PUT /api/v1/requests/:id/wanted`, `PUT /api/v1/bookings/:id/status`; generic writes on both types → 405 `USE_ROUTER`. Codes: `BAD_REQUEST_INPUT` (400), `NO_PROFILE`, `BAD_STATUS`, `STATUS_CHANGED`, `ALREADY_DECIDED` (409), `CLIENT_NOT_FOUND` (404).
- Auth and validation: `verifyToken` + `manageRequests` (any member) on every write; Zod input and stored-doc checks; staff create clients only through this route (D2: `clients` stays owner-only in the generic API).
- Security surface: guest name and phone are personal data — never logged (log lines carry kind, status, channel, counts); `publicToken` is generated now for every request and never logged.
- Data / migration: none.
- Project checks: log-query item; Reuse Check; no dictionary keys, no icons (no UI).

## Out of Scope
- Approve, decline, the "ask" decision log row, `GET /bookings/day`, `buildNewEventDoc` (550).
- Screens (552), public creation (555), WhatsApp creation (560), AI suggestions (563).
- Deleting requests or bookings (retention and erase are 558).

## Critical Questions
- none

## Execution Notes
- Generic writes refused (405 `USE_ROUTER`) rather than "accepted with server fields stripped": the brief says requests and bookings are read through the generic API and written only through these routers; the Done-when seed "generic write of `status` is ignored" holds because nothing is written. Kept as this plan's choice.
- Contract extension (for the map's "Contract extensions (run)"): `- plan 549 · requests gain server-owned `decline { reason, text?, at, by }` (in REQUEST_SERVER_FIELDS) · 550 writes it, 559 counts declines by reason`.
- A new client made by a manual request gets `kinds: ['lead']`; plan 550 adds `diner` / `event_client` on approve.
- Evidence: `pnpm run build` exit 0; `pnpm run lint` 0 errors; `pnpm --dir server run lint` exit 0 (0 errors); `pnpm run test:server` exit 0, 83 files / 1106 tests pass (incl. requests-router, bookings-router, request-expiry, cross-business, permissions, collections); `pnpm run test:ci` exit 0, 1899 SUCCESS.
- Choice: the `publicToken` unique indexes are partial (`publicToken` is a string) so a raw fixture doc without a token cannot break startup (same as the profile slug index). Reverse: drop the `partialFilterExpression`.
- Blocked on one gate check: `node scripts/breadcrumbs-check.mjs` exit 1 — `src/app/core/services/breadcrumbs.md` and `src/app/core/models/breadcrumbs.md` do not mention the four new files (request/booking data services and models). Both files are outside the Read-Write Scope; escalated with `approved: <path>` (one row each, as plan 548 did).
