# Plan 550 — Approve or decline a request in one tap: the event or booking is created, the day's load is shown, every decision is logged

Status: draft
Depends-on: 549
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
After plan 549 a request exists, but nothing happens when the owner says yes. The Front Desk program
(`docs/frontdesk/frontdesk-map.md`, map row 8, spec FD-03) makes approve one server call that creates what the request
becomes — an event inquiry in the existing pipeline for `event`, a booking for `table | tasting | consultation` — in
the same request, idempotently. Decline stores a reason. The approver sees the day's bookings and covers per hour
beside the request (the manual stand-in for a later availability engine). Every approve / decline / ask is written to
`decisionLog` from the first pilot day: that is the dataset that later justifies automation (brief Part 2 rule 7).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- An event is created only by the generic POST (`server/routes/generic.js` `router.post('/:type', …)`): for `menuEvents` it applies `withSavedSnapshot(withoutServerEventFields(body), null)` (lines ~100 and 89), `assertCan(…, 'create')`, the staff money strip (`stripMoneyFields`), `stampNew(req, …)` (`server/utils/business-scope.js`: `businessId`, `createdBy`, `createdAt`), lineage `_masterId: _id, _userModified: false` (events are not in `NO_LINEAGE`), `schemaVersion: 2`, `createdAt` / `updatedAt`, then `stage: 'inquiry'`, `stageHistory: [{ stage: 'inquiry', at, by, byName }]`, `notes: []` (lines ~503–507), `checkStoredDoc`, insert. There is no shared builder: this plan extracts one (map delta 6).
- `menuEventSchema` requires `name`, `eventType` (string), `servingType` (string), `guestCount` (number), `sections`; `eventDate` optional; the library's inquiry dialog sends `servingType: ''` and `sections: []` (`new-inquiry-dialog.component.ts` `buildBody`).
- The notes rule is `newNote(text, actor, now, id)` in `server/utils/event-stage.js` (trimmed, 1–2,000 chars, `NOTE_EMPTY` / `NOTE_TOO_LONG`); ids from `newId()` (`server/utils/id.js`).
- Local MongoDB in tests (`mongodb-memory-server`, single node) has no transactions; multi-document consistency is done by a conditional claim plus compensation, the way `writeConditional` in `server/routes/events.js` guards stage moves.
- Plan 549 provides `requests` / `bookings` schemas, `REQUEST_SERVER_FIELDS` with `decline`, `requests.js` / `bookings.js` routers and their helpers, `expireDue`, `manageRequests`; plan 548 provides `jerusalemEpoch` and the profile's `defaultDurationMinutes`; plan 543 `actorOf`, `newPublicToken`.

## Goals & Success Criteria
**Primary:** one approve call creates exactly one outcome, linked both ways, with the client's kinds and counters
updated and a decision-log row written; a second approve changes nothing.

- [auto] Before any extraction, `server/test/menu-event-create.test.js` pins the generic `POST /api/v1/data/menuEvents` result for an owner and for a staff member (every stored field except `_id`, `_masterId`, `createdAt`, `updatedAt`, `stageHistory[0].at`), and it passes unchanged after `buildNewEventDoc` is extracted.
- [auto] `pnpm run test:server` passes, including `server/test/menu-event-create.test.js`, `server/test/requests-approve.test.js`, `server/test/bookings-day.test.js` and `server/test/requests-router.test.js`.
- [auto] Approving an `event` request yields one `menuEvents` doc in stage `inquiry` with `clientId`, `clientName`, `clientPhone`, `guestCount`, `eventDate`, `eventType` from the request and the request summary as its first note; the request is `approved` with `outcome: { type: 'menuEvent', id }`; the event equals a generic-POST event made from the same body field for field (same keys and values except ids, timestamps, history time and `notes`) (`server/test/requests-approve.test.js`).
- [auto] Approving a `table` request yields one `bookings` doc `confirmed`, `source: 'request'`, `requestId` set, `startAt` = `jerusalemEpoch(date, time)`, `endAt = startAt + durationMinutes × 60000` with the profile's `defaultDurationMinutes` (`server/test/requests-approve.test.js`).
- [auto] Idempotency: a second approve or a decline of a decided request → 409 `{ error: 'ALREADY_DECIDED' }`, no second outcome; two approves sent at the same time → one 200, one 409, one outcome (`server/test/requests-approve.test.js`).
- [auto] Decline with `{ reason: 'date_taken', text: 'x' }` → request `declined` with `decline: { reason: 'date_taken', text: 'x', at, by }`; a reason outside `DECLINE_REASONS` → 400 `BAD_REASON` (`server/test/requests-approve.test.js`).
- [auto] `decisionLog`: approve, decline and a member move to `needs_info` ("ask") each write one row with `decidedAction`, `decidedBy`, `editedFields` (the `wanted` keys the approver changed), `secondsToDecision`, `verdict`; no row contains the guest's name or phone anywhere, and its keys are exactly the contract's plus base fields (`server/test/requests-approve.test.js`).
- [auto] `GET /api/v1/bookings/day?date=2026-12-24` returns that day's non-cancelled bookings of the caller's business sorted by `startAt` and `coversByHour` such as `{ "19": 10, "20": 4 }`; `date=24-12` → 400 `BAD_DATE`; another business's bookings never appear (`server/test/bookings-day.test.js`).
- [auto] The client's `kinds` gains `event_client` (event, tasting, consultation) or `diner` (table) and loses `lead`; `counters.events` or `counters.bookings` grows by 1 (`server/test/requests-approve.test.js`).
- [auto] `pnpm run test:ci` passes, including `src/app/core/services/request-data.service.spec.ts` and `src/app/core/services/booking-data.service.spec.ts`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/550-approve-or-decline-a-request-with-day-load-and-decision-log.plan.md` exits 0.
- [auto] `pnpm --dir server run lint` exits 0 and `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — 543, 544, 548, 549, 550 all edit `server/utils/permissions.js` and/or `server/constants/collections.js` (map: sequential in wt-1); 550 also edits `server/routes/generic.js`.
- Concurrent plans: none in its lane.
- Isolated DB: no — a new server-only collection, startup index, no migration.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
shared/schemas/entities/decision-log.schema.ts
shared/schemas/entities/index.ts
server/utils/event-create.js
server/routes/generic.js
server/routes/requests.js
server/routes/bookings.js
server/constants/collections.js
server/db.js
server/test/menu-event-create.test.js
server/test/requests-approve.test.js
server/test/bookings-day.test.js
server/test/requests-router.test.js
src/app/core/services/request-data.service.ts
src/app/core/services/request-data.service.spec.ts
src/app/core/services/booking-data.service.ts
src/app/core/services/booking-data.service.spec.ts
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — approve and decline run through `requests.js` with `assertCan(…, 'manageRequests', { type: 'requests', doc })`; the outcome is created in the caller's business with `createdBy` = the approver (`actorOf`); staff see the new event under the existing `staffVisibleStages` rule (they are its creator).
- INV-2: preserves — the new event is the business's own doc (lineage stamps as every generic-POST event); nothing touches `__master__`; queries stay business-scoped.
- INV-3: preserves — the request's decision, the outcome, the client's kinds / counters and the decision-log row are written by the server in one request (conditional claim, then the outcome, compensation on failure); the client never loops.
- INV-4: preserves — every stored doc (event, booking, request, decision-log row) is checked with `checkStoredDoc` against its shared Zod schema before the write.

## Reuse Check

- `buildNewEventDoc` (`server/utils/event-create.js`) — family: none — rung: 4 — why: server helpers have no registry family; extracted from the generic POST (not new logic) so approve and generic create share one copy of the event defaults.
- `decisionLogSchema` — family: none — rung: 4 — why: a new server-only collection (`standards-backend.md` §3), no existing log carries decisions.
- `approve`, `decline`, `day` methods — family: entity-data-service — rung: 1 — why: added to the 549 data services in the same `EventPipelineService` call shape.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner of a catering business, I want to approve an event request in one tap so that it lands in my event pipeline as an inquiry with the customer and the details already filled.
- As a host, I want to see the day's bookings and covers per hour when I approve a table so that I do not overfill the room.
- As an owner, I want to decline with a reason so that I can later see why I turn customers away.
- As an owner, I want every decision recorded without customer names so that FoodVibe can later learn which requests to approve by itself.

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
  This plan builds: `POST /:id/approve`, `POST /:id/decline`, the "ask" log on `PUT /:id/status`, `GET /day`, `buildNewEventDoc`, `decisionLog`.
- [ ] Pin first (A1, before any change to `generic.js`): `server/test/menu-event-create.test.js` posts a full inquiry-dialog body (`name`, `clientId`, `clientName`, `clientPhone`, `eventDate`, `guestCount`, `eventType`, `eventTypeSnapshot`, `servingType: ''`, `sections: []`, plus forbidden `stage: 'finished'`, `notes: [x]`, a `planSnapshot` with `frozenAt`) as owner and as staff (with a money field), and asserts the exact stored doc minus `_id`, `_masterId`, `createdAt`, `updatedAt`, `stageHistory[0].at`.
- [ ] `server/utils/event-create.js` `buildNewEventDoc(body, { actor, businessId, _id, now })` → the doc the generic POST inserts today for `menuEvents`: removes `EVENT_SERVER_FIELDS`, applies the new-doc snapshot rule (`withSavedSnapshot(…, null)` moves here), sets `_id`, `userId: actor.userId`, `businessId`, `createdBy: actor.userId`, `_masterId: _id`, `_userModified: false`, `schemaVersion: 2`, `createdAt` (a numeric body `createdAt` is kept, as today), `updatedAt: now`, `stage: 'inquiry'`, `stageHistory: [{ stage: 'inquiry', at: now, by: actor.userId, byName: actor.name }]`, `notes: []`. The generic POST calls it for `menuEvents` after its permission check and staff money strip; its other types are unchanged. The pin test stays green.
- [ ] `POST /api/v1/requests/:id/approve` `{ wanted?, note? }` (`manageRequests`):
  1. `expireDue`, then load the request; status not in `new | qualified | needs_info` → 409 `ALREADY_DECIDED`.
  2. `wanted` overrides merged over the stored `wanted` and validated (400 `BAD_REQUEST_INPUT`); `editedFields` = the `wanted` keys whose value changed.
  3. Claim: one conditional update `{ _id, businessId, status: <read status> }` → `status: 'approved'`, the merged `wanted`, `outcome: { type, id: <new id> }`, history entry `{ status: 'approved', at, by, byName, via: 'member', note? }`. No match → 409 `ALREADY_DECIDED`.
  4. Outcome, same request:
     - `event`: `buildNewEventDoc({ name, clientId, clientName: guestName, clientPhone: guestPhone, eventDate: wanted.date, guestCount: wanted.partySize ?? 0, eventType: wanted.eventTypeKey ?? '', servingType: '', sections: [] }, { actor, businessId, _id: outcomeId, now })` with `name` = `` `${guestName} – ${eventTypeKey} ${date}` `` (parts that are missing are left out, single spaces, trimmed); first note = `newNote(summary, actor, now, newId())` where `summary` = one line `label: value` per stored `answers` entry, cut to 2,000 chars; no answers → `notes: []`.
     - `table | tasting | consultation`: requires `wanted.date` and `wanted.time`, and `partySize` for `table` / `tasting` (`consultation` defaults to 1) — else the claim is reverted and 400 `{ error: 'MISSING_BOOKING_FIELDS', fields: [...] }`; `durationMinutes` = profile `requestKinds[kind].defaultDurationMinutes` ?? 60; `startAt = jerusalemEpoch(date, time)`; `endAt`; `status: 'confirmed'`; `source: 'request'`; `requestId`; `publicToken: newPublicToken()`; history `{ status: 'confirmed', … via: 'member' }`.
     `checkStoredDoc` then insert. If the outcome fails to validate or insert, the claim is reverted (status, `outcome`, `wanted` and the last history entry restored by a conditional update) and the error answered (400 / 500).
  5. Client (same business): `kinds` = stored kinds without `lead`, plus `event_client` (event, tasting, consultation) or `diner` (table), unique, ≤ 3; `$inc` `counters.events` (event) or `counters.bookings` (other kinds); `lastContactAt: now`.
  6. `decisionLog` row (below) with `decidedAction: 'approve'`.
  7. 200 `{ request, outcome }` (the stored event or booking). Log `requests.approved` `{ kind, outcomeType }` — never the name or phone.
- [ ] `POST /api/v1/requests/:id/decline` `{ reason, text? }` (`manageRequests`): `expireDue`; `reason` not in `DECLINE_REASONS` → 400 `BAD_REASON`; `text` ≤ 500; conditional update from an open status → `status: 'declined'`, **`decline: { reason, text?, at: now, by: actor.userId }`** (the server-owned field added to the request schema by plan 549; plan 559 counts declines by `decline.reason`), history `{ status: 'declined', … via: 'member', note: text? }`; decided → 409 `ALREADY_DECIDED`; `decisionLog` row `decidedAction: 'decline'`, `editedFields: []`.
- [ ] "Ask": in `PUT /api/v1/requests/:id/status` (plan 549), a member move to `needs_info` also writes a `decisionLog` row `decidedAction: 'ask'`.
- [ ] `shared/schemas/entities/decision-log.schema.ts`: `decisionLogSchema = z.strictObject({ _id, schemaVersion: z.literal(2), businessId, createdBy, createdAt, updatedAt, requestId: z.string().min(1), suggestion: z.enum(['approve','decline','ask']).optional(), verdict: z.enum(['fit','borderline','unfit']).optional(), decidedAction: z.enum(['approve','decline','ask']), decidedBy: z.string().min(1), editedFields: z.array(z.string().max(40)).max(10), secondsToDecision: z.number().int().min(0), at: z.number() })` — no name, phone or free text by design. `suggestion` = the request's `suggested.action` when present (563 fills it), `verdict` = `qualification.verdict`, `secondsToDecision` = `round((now − request.createdAt) / 1000)`. Registered as `decisionLog` in `SCHEMA_BY_COLLECTION`. Collection entry `{ name: 'decisionLog', userData: false, cloneable: false, backup: true, searchable: false, softDelete: false }` (server-only; read later by stats, 559/563). Index `{ businessId: 1, at: 1 }` (`decisionlog_business_at`).
- [ ] `GET /api/v1/bookings/day?date=YYYY-MM-DD` (`verifyToken`, any member): `date` not `^\d{4}-\d{2}-\d{2}$` → 400 `BAD_DATE`; returns `{ bookings, coversByHour }` — the business's bookings with that `date` and `status ≠ 'cancelled'`, sorted by `startAt`; `coversByHour` sums `partySize` of `confirmed | seated | finished` bookings by the two-digit hour of `time` (`{ "19": 10 }`); a booking counts only in its start hour.
- [ ] Client: `RequestDataService.approve(id, wanted?, note?)` (writes the returned request into its store and the outcome into `MenuEventDataService` or `BookingDataService`), `decline(id, reason, text?)`; `BookingDataService.day(date)` → `{ bookings, coversByHour }`. Same result shape as plan 549's calls.
- [ ] Docs: `docs/agent/standards-backend.md` §1 row for `decisionLog` (server-only) and §5 rows for approve, decline and `GET /day` with their error codes.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen (552 shows the queue, the load strip and the decline picker). No dictionary keys, no icons.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Pin how a new event is created today, before touching that code — owner and staff cases, exact stored fields — server/test/menu-event-create.test.js
- [ ] A2: Move the new-event defaults into one shared builder that the generic create uses — buildNewEventDoc, generic POST calls it, pin test unchanged — server/utils/event-create.js, server/routes/generic.js
- [ ] A3: Add the decision log collection that keeps decisions without customer names — schema, registry, collection entry, index — shared/schemas/entities/decision-log.schema.ts, shared/schemas/entities/index.ts, server/constants/collections.js, server/db.js
- [ ] A4: Approve a request in one call: claim it, create the event or booking, update the client, log the decision — POST /:id/approve with compensation — server/routes/requests.js
- [ ] A5: Decline a request with a reason, and log an ask when a member asks for more details — POST /:id/decline, decline field, ask row on PUT /:id/status — server/routes/requests.js
- [ ] A6: Show a day's bookings and covers per hour for the approve screen — GET /day — server/routes/bookings.js
- [ ] A7: Test approve, decline, ask, idempotency, the day view and that the log holds no personal data — server/test/requests-approve.test.js, server/test/bookings-day.test.js, server/test/requests-router.test.js
- [ ] A8: Let the app approve, decline and read a day's load — RequestDataService approve/decline, BookingDataService day, specs — src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts
- [ ] A9: Record the routes and run every check — standards-backend §1/§5; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md

## Technical Considerations
- Dependencies: 549 (routers, schemas, `decline` field, `expireDue`), 548 (`jerusalemEpoch`, profile durations), 543 (`actorOf`, `newPublicToken`), the generic POST for `menuEvents` (refactored, pinned).
- New files needed: `server/utils/event-create.js`, `decision-log.schema.ts`, three tests.
- Model changes: new `DecisionLog` (server-only); none on the client models beyond 549.
- Backend / API: `POST /api/v1/requests/:id/approve`, `POST /api/v1/requests/:id/decline`, `GET /api/v1/bookings/day`. Codes: `ALREADY_DECIDED` (409), `BAD_REASON`, `BAD_DATE`, `MISSING_BOOKING_FIELDS`, `BAD_REQUEST_INPUT` (400).
- Auth and validation: `verifyToken` + `manageRequests`; Zod checks of every stored doc.
- Security surface: `decisionLog` stores ids, enums and numbers only; log lines never carry names or phones; the booking's `publicToken` is never logged.
- Data / migration: none.
- Project checks: log-query item; Reuse Check; no dictionary keys, no icons (no UI).

## Out of Scope
- The queue screen, the load strip, the decline picker (552); public and WhatsApp approval flows (555, 560); AI suggestions filling `suggested` (563); stats over `decisionLog` (559).
- Automatic availability or auto-approve (Wave 2).
- Reopening a declined or approved request.

## Critical Questions
- none

## Execution Notes
- Summary note: the event's first note lists every stored `answers` line (`label: value`). For the summary to be complete, the screens that create requests (552 manual form, 555 public form) store **every answered question in `answers`**, including those also copied into `wanted`, with the label as shown to the person. For the map's "Contract extensions (run)": `- plan 550 · answers holds every answered question (label as displayed), also those mapped to wanted · the approve summary note reads answers only`.
- No transactions (single-node test DB, M0 free tier): a conditional claim on the request's read status makes approve idempotent and race-safe; the outcome insert follows; a failed insert reverts the claim.
- `coversByHour` counts a booking only in its start hour (Wave 1 manual stand-in; the Wave 2 engine reads the same collection with durations).
