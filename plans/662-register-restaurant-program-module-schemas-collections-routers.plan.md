# Plan 662 — Register the Restaurant program once: module key tables, schemas, collections, indexes, permission, empty routers, ADR 0033 and INV-7

Status: draft
Depends-on: none
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
The Restaurant program (plans 662–683, `docs/restaurant/restaurant-map.md`) adds a sixth module, five collections,
four routers, new fields on the front desk profile, on bookings and on requests, one permission action and one
architecture invariant. All of them are declared in a handful of shared registry files. If each later plan edited
those files itself, the runs of the program could not work side by side and every merge would collide. This plan
declares everything once, with no behaviour of its own, so that after it merges no plan of the program edits a
shared registry file again (Contract C-REGISTRY-R). It also writes down the rule the whole program stands on —
"the table engine decides" — as ADR 0033 and invariant INV-7, and the rule changes of the front desk documents.

This plan adds architecture invariant INV-7. Human gate G1 (`approve arch change INV-7`, typed to the Planner) was
answered before the plan was saved; the approved texts are in "ADR 0033 and INV-7 text" below.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `shared/schemas/modules-pure.ts` (34 lines): `MODULE_KEYS` has five keys (line 4), `DEFAULT_MODULES` four (line 8),
  `modulesOf` drops `event_logistics` without `events` (lines 14–19), `MODULE_OF_TYPE` has seven types (lines 26–34).
  `shared/schemas/modules.ts:6–9`: `modulesFieldSchema` is `.max(5)` with a no-repeat refine.
- `server/routes/admin.js:272, 317` writes a business's modules as `MODULE_KEYS.filter(k => modules.includes(k))`;
  the platform dialog (`src/app/pages/platform-dashboard/components/platform-business-dialog/
  platform-business-dialog.component.ts:92`, `.html:17–28`) loops over `MODULE_KEYS` and shows `'module_' + key`
  through `translatePipe`. `public/assets/data/dictionary.json:2356–2360` has the five `module_*` names.
- `server/middleware/require-module.js`: `requireModule(key)` answers 403 `{ error: 'MODULE_OFF', module }` and
  caches a business's modules for 30 s (`clearModuleCache`). The generic API gates a type through `MODULE_OF_TYPE`.
- `shared/schemas/entities/index.ts` (84 lines): one `export *` per schema file (lines 26–46) and the hand-written
  `SCHEMA_BY_COLLECTION` (lines 50–75). `server/generated/schemas/**` is its compiled copy (`pnpm run build:schemas`).
- `shared/schemas/entities/front-desk-profile.schema.ts`: `frontDeskProfileSchema` is strict; no `tableService`.
  The profile is read and written through the generic API (`frontDeskProfiles` is `userData`, not `routerWrites`);
  there is no profile router, so nothing fills defaults on read (map delta 4).
- `shared/schemas/entities/booking.schema.ts`: `BOOKING_SERVER_FIELDS` (line 9) has six names; `bookingSchema` is a
  strict object with a refine; none of `tableKeys`, `areaKey`, `seatedAt`, `finishedAt`, `remindedAt`,
  `guestConfirmedAt`, `override`, `test` exists.
- `shared/schemas/entities/request.schema.ts:8`: `REQUEST_CHANNELS = ['manual', 'public_form', 'whatsapp']`.
- `server/constants/collections.js` (28 rows): flags `userData, cloneable, backup, searchable, softDelete` and
  optionally `routerWrites`. `server/test/collections.test.js:47` asserts `ROUTER_WRITE_TYPES` equals
  `['requests', 'bookings', 'invoices', 'diagnoses', 'stockCounts']`, and (line 27) that a `backup` row is `userData`.
- `server/test/cross-business.test.js:40–65`: `BODY` has one key per `ALL_USER_ENTITY_TYPES` entry; router-written
  types hold `() => ({})`.
- `server/utils/permissions.js:15–20`: `ACTIONS` has 13 names, `manageRequests` last; line 58 lets any member do
  `manageRequests`; `OWNER_ONLY_TYPES` (line 25) has five types. The browser mirror is
  `src/app/core/services/permission.service.ts` (the action union at line 19, the `manageRequests` line at 66).
- `shared/schemas/staff-fields.ts`: a type that is not listed is not trimmed for staff, so "staff read all of it"
  needs no entry.
- `server/db.js` (199 lines): indexes are created in `connectDb`; lines 128–132 (`client_live_key_unique`) show a
  "one live row" rule done with a helper field and `partialFilterExpression: { liveKey: { $exists: true } }`.
- `server/app.js`: routers are required at lines 12–32 and mounted at lines 202–233; `/api/v1/public` is last.
- Deleting a business: `server/routes/admin.js:83` removes the business's rows in every `ALL_USER_ENTITY_TYPES`
  collection, then (line 78) calls `deleteBusinessServerData` (`server/services/business.js:111–127`), which removes
  the server-only Modules collections by a loop over names (line 119). So the two readable new types go by
  themselves and the three server-only ones need a name in that loop.
- `docs/brain/invariants.md`: six invariants, each `## INV-n — <title>` plus five `- Field:` lines, parsed by
  `scripts/lib/invariants.mjs`. Highest ADR is 0032. `scripts/lib/invariants.mjs:113` accepts a `changes` line whose
  ADR is in the plan's scope.
- `docs/frontdesk/assistant-behaviour-rules.md:20` (R-06) ends "In Wave 1 the assistant never says a booking is
  confirmed."; `docs/frontdesk/frontdesk-map.md:188` says "no channel confirms a table in Wave 1 (rule 6)".
- None of these names exists in `server/`, `shared/schemas/` or `src/app/`: `floorPlans`, `tableHolds`,
  `waitlistEntries`, `conversations` (as a collection), `tableService`, `manageConversations`, `module_tables`,
  `server/routes/floor-plan.js`, `waitlist.js`, `conversations.js`, `sim.js`.

## Goals & Success Criteria
**Primary:** every schema, collection flag, index, permission entry, module key, empty router and mount the program
needs exists and is tested, INV-7 and ADR 0033 are written, and the application behaves as before.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/restaurant-schema.test.js` and
  `server/test/restaurant-registry.test.js` and the updated `server/test/collections.test.js`,
  `server/test/cross-business.test.js`, `server/test/modules-schema.test.js`.
- [auto] `server/test/restaurant-schema.test.js`: `modulesOf` returns the four defaults for a business with no
  `modules` field; keeps `tables` for `['frontdesk', 'tables']`; drops `tables` for `['tables']` and for
  `['events', 'tables']`; `modulesFieldSchema` accepts all six keys and refuses a repeated key; `MODULE_OF_TYPE`
  has the seven types of today plus `floorPlans: ['tables']` and `waitlistEntries: ['tables']`.
- [auto] `server/test/restaurant-schema.test.js`: a stored profile, booking and request of today (no new field)
  still pass their schemas; a profile with a full `tableService` passes and one with `slotMinutes: 20`,
  `turnMinutes` out of ascending order, or `autoMaxParty: 31` is refused; a booking with the eight new fields
  passes and one with five `tableKeys` is refused; a request with `channel: 'sim'` passes.
- [auto] `server/test/restaurant-schema.test.js`: `tableServiceOf({})` equals `TABLE_SERVICE_DEFAULTS` with the
  one-step ladder `{ maxParty: 30, minutes: 120 }`; with `requestKinds.table.defaultDurationMinutes: 90` the ladder
  step is 90; a stored `confirmMode: 'auto'` wins over the default and the other fields stay the defaults.
- [auto] `server/test/restaurant-schema.test.js`: each of the five new schemas accepts one full valid document and
  refuses one with an unknown key; a floor plan with 201 tables, a table with `maxSeats < minSeats`, a `key` that
  breaks `^[a-z0-9]{6,12}$` and a join of five tables are each refused; `SCHEMA_BY_COLLECTION` has the five new keys.
- [auto] `server/test/collections.test.js`: the five new rows carry the flags of the C-REGISTRY-R table and
  `ROUTER_WRITE_TYPES` equals `['requests', 'bookings', 'invoices', 'diagnoses', 'stockCounts', 'floorPlans',
  'waitlistEntries']`.
- [auto] `server/test/restaurant-registry.test.js`: with a business that has `['frontdesk', 'tables']` the owner's
  `GET /api/v1/data/floorPlans` and `GET /api/v1/data/waitlistEntries` answer 200 `[]`; with `['tables']` alone and
  with no stored list they answer 403 `MODULE_OFF`; a generic POST, PUT and DELETE of both types answer 405
  `USE_ROUTER`; a generic GET of `tableHolds`, `conversations` and `messages` answers 403.
- [auto] `server/test/restaurant-registry.test.js`: after `connectDb` the eight indexes named in Must Have exist by
  name; two `tableHolds` rows with the same `businessId`, `tableKey`, `cell` collide (E11000) and rows that differ in
  one of the three do not; two `floorPlans` of one business collide; two `conversations` with the same `businessId`
  and `liveKey` collide and one without `liveKey` beside them does not; two `messages` with the same `businessId`
  and `providerMessageId` collide.
- [auto] `server/test/restaurant-registry.test.js` ("registry probe"): `GET <mount>/__registry_probe__` answers 404
  for `/api/v1/floor-plan`, `/api/v1/waitlist`, `/api/v1/conversations`, `/api/v1/sim`, sent with the token of an
  owner whose business has all six modules; each of the four router modules loads on its own and exports a router
  function.
- [auto] `server/test/restaurant-registry.test.js`: `can` allows `manageConversations` for an owner and for staff
  and answers `UNKNOWN_ACTION` for a made-up action; after `deleteBusinessServerData` no row of the business is
  left in `tableHolds`, `conversations` or `messages`, and `ALL_USER_ENTITY_TYPES` contains `floorPlans` and
  `waitlistEntries` (the list the admin delete route clears).
- [auto] `pnpm run test:ci` → exit 0 (the permission service spec has one new case: staff may `manageConversations`).
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/662-register-restaurant-program-module-schemas-collections-routers.plan.md`
  → exit 0 after `docs/brain/invariants.md` is edited (INV-7 parses, INV-1 `Touches` has the five new paths).
- [auto] `grep -c "^## INV-" docs/brain/invariants.md` prints `7`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads `docs/brain/decisions/0033-the-table-engine-decides.md` and INV-7 in
  `docs/brain/invariants.md` on the run branch and confirms they say what he approved at gate G1.

## Execution Mode
- Parallel: no — the only plan of run `rs-0`. It edits every shared registry of the map's must-not-run list; no
  other plan of the program, and no open plan that edits `shared/schemas/entities/index.ts`,
  `server/constants/collections.js`, `server/db.js`, `server/app.js` or `server/utils/permissions.js`, may run
  beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/modules-pure.ts
shared/schemas/modules.ts
shared/schemas/entities/index.ts
shared/schemas/entities/front-desk-profile.schema.ts
shared/schemas/entities/booking.schema.ts
shared/schemas/entities/request.schema.ts
shared/schemas/entities/floor-plan.schema.ts
shared/schemas/entities/table-hold.schema.ts
shared/schemas/entities/waitlist-entry.schema.ts
shared/schemas/entities/conversation.schema.ts
shared/schemas/entities/message.schema.ts
shared/schemas/front-desk/table-service.ts
server/constants/collections.js
server/db.js
server/app.js
server/utils/permissions.js
server/services/business.js
server/routes/floor-plan.js
server/routes/waitlist.js
server/routes/conversations.js
server/routes/sim.js
server/breadcrumbs.md
server/test/restaurant-schema.test.js
server/test/restaurant-registry.test.js
server/test/collections.test.js
server/test/cross-business.test.js
server/test/modules-schema.test.js
server/test/admin-business-delete.test.js
server/test/admin-platform.test.js
server/test/helpers/app.js
server/test/invoice-memory.test.js
server/test/permissions.test.js
src/app/core/services/unlinked-ingredient-link.service.spec.ts
docs/workflow-kit/manifest.json
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
public/assets/data/dictionary.json
docs/brain/invariants.md
docs/brain/decisions/0033-the-table-engine-decides.md
docs/frontdesk/assistant-behaviour-rules.md
docs/frontdesk/frontdesk-map.md
docs/restaurant/restaurant-map.md
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

- INV-7: changes — ADR docs/brain/decisions/0033-the-table-engine-decides.md — Arch-approved: Human 2026-11-22
- INV-1: preserves — the rule text is unchanged; only its `Touches` list grows by the four new routers and `server/services/inbound.js`, so later plans of the program must write an INV-1 line. `server/utils/permissions.js` gains one action any member may do (`manageConversations`), the same way `manageRequests` works; no owner-only rule is loosened. `floorPlans` joins `OWNER_ONLY_TYPES`.
- INV-2: preserves — every new collection carries `businessId`, none is cloneable, and `server/services/business.js` only gains names in the delete loop; no scoped query is added in this plan.
- INV-4: preserves — every new shape is a Zod schema in `shared/schemas`, exported through `entities/index.ts` and `SCHEMA_BY_COLLECTION`; the new fields on existing schemas are optional, so every stored document stays valid.

## ADR 0033 and INV-7 text (gate G1 — the Human read this before the plan was saved)

**(a) The full text of `docs/brain/decisions/0033-the-table-engine-decides.md`** (new file):

```markdown
---
status: accepted
date: 2026-11-22
review-by: 2027-05-22
---

# 0033. The table engine decides: availability and table assignment are code, and one index guards a table

## Context

Until the Restaurant program a table request was approved by a person and nothing checked capacity: two guests
could be approved for the same table at the same hour. The program adds a floor plan, automatic confirmation, a
public availability read, a waiting list and an assistant that books by chat. Each of them is a new place where
"is there a table" could be answered — by a route that reads the bookings and trusts what it read, by a screen, or
by the AI model in a sentence. Any second answer will sooner or later disagree with the first, and the guest is
told "confirmed" for a table that is taken.

## Decision

1. **One engine.** Whether a party fits at a time, on which table, and what to offer instead is decided only by
   the pure functions of `shared/schemas/front-desk/table-engine.ts`. The server and the browser run the same file.
2. **Same request.** No route confirms, moves or offers a table unless the engine returned it in the same request.
3. **One guard.** Two bookings never hold one table at one time because of the unique index on `tableHolds`
   (`businessId`, `tableKey`, `cell`): a booking is written only after its cells were claimed, and a failed write
   releases them. No route checks by reading first and trusting it.
4. **The owner may override, the index still decides.** An owner may put a booking on a table of his choice
   (`override: true`); the claim must still succeed.
5. **The model never decides.** The AI model only understands what the guest wants and phrases answers. It never
   says whether a table is free, never states a time or a table the engine did not return, and never writes.
6. **Automatic confirmation is the business's switch** (`tableService.confirmMode`), not an assistant level.

## Rejected

- **Capacity counters per hour** (covers by hour): cannot say which table, cannot join tables, and two requests
  can both pass the same counter read.
- **Check, then write, inside a transaction:** the code base uses no transactions, and the free database tier
  makes long ones fragile; a unique index gives the same guarantee with one insert.
- **Letting the model propose a time and validating it afterwards:** one missed validation is a false "confirmed".

## Consequences

- Easier: every channel — the guest page, the host's screen, the waiting list, the chat — gives the same answer.
- Harder: every table write is two steps (claim, then write) with a release on failure; a change of slot length
  must not break old holds, so a hold stores the cell's own time, never a count.
- Accepted: bookings made before the module was switched on have no table; the engine ignores them and a person
  assigns them.

## Review

Check that every route that writes `tableKeys` calls the claim first, and that no file outside the engine computes
availability.
```

**(b) The new section of `docs/brain/invariants.md`** (appended after INV-6; each field on one line):

```markdown
## INV-7 — The table engine decides
- Rule: a table is offered, confirmed, moved or released only by code. `shared/schemas/front-desk/table-engine.ts` decides whether a party fits and on which table, in the same request that writes it; the unique index on `tableHolds` (`businessId`, `tableKey`, `cell`) is the only guard against two bookings on one table at one time, and no route reads first and trusts what it read. An owner may put a booking on a table of his choice (`override`); the claim must still succeed. The AI model never decides availability, never states a time or a table the engine did not return, and never writes.
- Source: ADR 0033 (plan 662), `docs/restaurant/restaurant-map.md` C-ENGINE and C-HOLD
- Touches: `shared/schemas/front-desk/table-engine.ts`, `server/services/table-holds.js`, `server/routes/bookings.js`, `server/routes/requests.js`, `server/routes/public.js`, `server/routes/waitlist.js`, `server/services/frontdesk-turn.js`
- Users lose if broken: two parties are confirmed for the same table at the same hour, or a guest is told "confirmed" for a table that is not free.
- Test: server/test/invariants.test.js "INV-7 …" (added by plan 668)
```

**(c) INV-1, one field edit:** `Touches` gains `server/routes/floor-plan.js`, `server/routes/waitlist.js`,
`server/routes/conversations.js`, `server/routes/sim.js`, `server/services/inbound.js`. No other field changes.

## Reuse Check

- tableServiceOf (pure helper, shared/schemas/front-desk/table-service.ts) — family: none — rung: 4 — why: no helper reads a profile's table settings today; it follows the shape of modulesOf (stored value over defaults) so the server and the browser read the settings one way
- none — no component, pipe, service or `.c-*` class is created

## Defaults

- loading-and-error-states — exception — why: registry only; the plan builds no screen
- app-list-container — exception — why: registry only; the plan builds no list
- one-breakpoint-set — exception — why: registry only; the plan writes no SCSS
- empty-state-on-list — exception — why: registry only; the plan builds no list

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner of a restaurant, I want table service to be a part of the product that is switched on for me, so
  that my floor plan and my tables appear, and a caterer who uses the same app never sees them.
- As the owner of any business that exists today, I want nothing to change for me when this is merged.
- As the product owner, I want the rule "only the engine decides whether a table is free" written where every
  later plan is checked against it.

## Functional Requirements

### Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-REGISTRY-R (R0; used by every plan)** — after R0 merges, no plan of this program edits a shared registry file.
R0 creates, with tests (schema round-trips, the collections test, a route test that each empty router answers 404,
the cross-business test body for each new type):
- `shared/schemas/modules-pure.ts`: `MODULE_KEYS` gains `tables`; `modulesOf` drops `tables` when `frontdesk` is
  not in the list; `DEFAULT_MODULES` unchanged. `shared/schemas/modules.ts`: `.max(5)` → `.max(6)`.
  `MODULE_OF_TYPE` gains `floorPlans: ['tables']`, `waitlistEntries: ['tables']`.
- `frontDeskProfileSchema` gains optional `tableService` (C-TSERVICE). `bookingSchema` gains the optional fields of
  C-BOOK2 and `BOOKING_SERVER_FIELDS` grows with them. `REQUEST_CHANNELS` gains `sim`.
- New schema files under `shared/schemas/entities/`, exported from `index.ts` and `SCHEMA_BY_COLLECTION`:
  `floor-plan.schema.ts`, `table-hold.schema.ts`, `waitlist-entry.schema.ts`, `conversation.schema.ts`,
  `message.schema.ts` — shapes as in the Contracts below. A later plan may edit its own schema file.
- `server/constants/collections.js`:

  | name | userData | cloneable | backup | searchable | softDelete | routerWrites |
  |---|---|---|---|---|---|---|
  | `floorPlans` | true | false | true | false | false | true |
  | `waitlistEntries` | true | false | true | false | false | true |
  | `conversations`, `messages` | false | false | false | false | false | — |
  | `tableHolds` | false | false | false | false | false | — |

- `server/utils/permissions.js`: action `manageConversations` (any member), mirrored in
  `src/app/core/services/permission.service.ts`; `OWNER_ONLY_TYPES` gains `floorPlans`.
  `shared/schemas/staff-fields.ts` is not edited: staff read all of a floor plan and of a waiting-list entry, and a
  type that is not listed there is not trimmed.
- `server/db.js` indexes: the ones named in the Contracts below.
- Empty routers (each exports a `Router()` with no route) and their one-line mounts in `server/app.js`:
  `/api/v1/floor-plan` → `routes/floor-plan.js`, `/api/v1/waitlist` → `routes/waitlist.js`,
  `/api/v1/conversations` → `routes/conversations.js`, `/api/v1/sim` → `routes/sim.js`. (The webhook router is
  added by R21, not here.)
- `docs/brain/decisions/0033-the-table-engine-decides.md` and INV-7 in `docs/brain/invariants.md` (exact shape the
  parser needs); INV-1 `Touches` gains the four routers and `server/services/inbound.js`. The rule changes above.
- Deleting a business removes its rows in the five new collections: they are added to the loop over collection
  names in `server/services/business.js` (delta 1).
- `server/test/collections.test.js`: `ROUTER_WRITE_TYPES` equals the five of today plus `floorPlans`,
  `waitlistEntries` (delta 1).
- `shared/schemas/front-desk/table-service.ts`: `TABLE_SERVICE_DEFAULTS` and `tableServiceOf(profile)` (C-TSERVICE,
  delta 4).

**C-TSERVICE (schema part)** — `frontDeskProfile.tableService?: { confirmMode: 'auto' | 'manual' (default
'manual'), autoMaxParty: int 1–30 (default 6), slotMinutes: 15 | 30 (default 15), turnMinutes: [{ maxParty: int,
minutes: int 30–360 }] (1–6, ascending by maxParty), lastSeatingBeforeCloseMinutes: int 0–180 (default 60),
bufferMinutes: int 0–30 (default 0), holdMinutes: int 5–60 (default 15), autoNoShow: boolean (default false),
reminderHour: 'HH:mm' (default '10:00'), cancellationCutoffHours: int 0–72 (default 3) }`. Owner-written through
the existing profile write (the generic API). Nothing fills defaults on read: `tableServiceOf(profile)` in
`shared/schemas/front-desk/table-service.ts` (pure, R0) returns the stored value over `TABLE_SERVICE_DEFAULTS`
(default ladder: one step, `{ maxParty: 30, minutes: requestKinds.table.defaultDurationMinutes ?? 120 }`), and the
server and the browser read the settings only through it (delta 4).

**C-FLOOR (shape part)** — collection `floorPlans`, at most one document per business (unique index
`{ businessId }`): `{ ...baseDocShape, grid: { cols: int 10–80, rows: int 10–80 }, areas: [{ key, name
(nameField), order: int }] (1–10), tables: [{ key, number: string 1–6, areaKey, shape: 'round' | 'square' |
'rect', minSeats: int ≥ 1, maxSeats: int ≥ minSeats ≤ 30, x: int, y: int, w: int 1–8, h: int 1–8, turned: boolean,
active: boolean, online: boolean }] (0–200), joins: [{ key, tableKeys: string[] 2–4, minSeats, maxSeats, online:
boolean }] (0–60) }`. `key` is made by the browser once (`^[a-z0-9]{6,12}$`) and never changes.

**C-HOLD (shape part)** — collection `tableHolds` (server-only): `{ _id, businessId, tableKey, cell: number,
bookingId, test?: true }`. Unique index `{ businessId: 1, tableKey: 1, cell: 1 }`; index `{ businessId, bookingId }`.

**C-BOOK2 (fields part)** — `bookings` gains, all optional and server-written: `tableKeys: string[] (1–4)`,
`areaKey`, `seatedAt`, `finishedAt`, `remindedAt`, `guestConfirmedAt`, `override: true`, `test: true`.

**C-WAIT (shape part)** — collection `waitlistEntries`: `{ ...baseDocShape, date, guestName, guestPhone,
clientId?, partySize: int 1–30, areaKey?, quotedMinutes?: int, status: 'waiting' | 'notified' | 'seated' | 'left'
| 'expired', joinedAt, notifiedAt?, bookingId?, test?: true }`. Index `{ businessId, date, status }`.

**C-CONV (shape part)** — `conversations`: `{ ...baseDocShape, clientId, channel: 'sim' | 'whatsapp', waId,
status: 'bot' | 'human' | 'closed', assignedTo?, lastMessageAt, lastInboundAt, unread: int, requestId?,
bookingId?, windowExpiresAt, pending?: { kind: 'book' | 'change' | 'cancel', data, at }, suggestion?: string
(≤ 4000), liveKey?: string, test?: true }`. `liveKey` is `'<channel>:<waId>'` while the status is not `closed` and
is removed on close; unique index `{ businessId, liveKey }`, partial on `liveKey` existing. `messages`: `{ _id,
businessId, conversationId, direction: 'in' | 'out', author: 'guest' | 'ai' | 'member' | 'server', memberId?,
kind: 'text' | 'template' | 'button', text (≤ 4000), template?: { name, params }, buttons?: [{ id, title }] (≤ 3),
buttonId?, at, providerMessageId, status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed', test?: true }`.
Unique index `{ businessId, providerMessageId }`.

### Must Have (P0)
- [ ] **Module key.** `MODULE_KEYS` gains `'tables'` as the last key. `modulesOf` drops `tables` when `frontdesk`
  is not in the kept list (after the existing `event_logistics` rule). `DEFAULT_MODULES` is unchanged.
  `modulesFieldSchema` becomes `.max(6)`. `MODULE_OF_TYPE` gains `floorPlans: ['tables']` and
  `waitlistEntries: ['tables']`. `server/test/modules-schema.test.js:61` ("a sixth module") is rewritten to "a
  repeated module beyond the six"; its "seven types" case becomes nine.
- [ ] **Profile, booking, request.** `frontDeskProfileSchema` gains optional `tableService` exactly as C-TSERVICE
  (a strict object; a refine checks `turnMinutes` is ascending by `maxParty`; `reminderHour` matches
  `^\d{2}:\d{2}$`). It is not added to `PROFILE_SERVER_FIELDS` (the owner writes it). `bookingSchema` gains the
  eight optional fields of C-BOOK2 (`override` and `test` are `z.literal(true).optional()`; the four `…At` fields
  are numbers; `areaKey` a string ≤ 12) and all eight join `BOOKING_SERVER_FIELDS`. `REQUEST_CHANNELS` gains `'sim'`
  as the last value.
- [ ] **`shared/schemas/front-desk/table-service.ts`** (new, pure, no zod import): `TABLE_SERVICE_DEFAULTS` (every
  default of C-TSERVICE except the ladder) and `tableServiceOf(profile)` returning all ten fields: the stored
  `tableService` spread over the defaults, the ladder being the stored one when it has at least one step, else the
  one-step default. It accepts `null` / `undefined` and a profile without `requestKinds`.
- [ ] **Five schema files** under `shared/schemas/entities/` with the shapes above, each a strict object exporting
  its schema, its inferred type and its enum constants (`FLOOR_TABLE_SHAPES`, `WAITLIST_STATUSES`,
  `CONVERSATION_CHANNELS`, `CONVERSATION_STATUSES`, `MESSAGE_KINDS`, `MESSAGE_STATUSES`). `floorPlanSchema` refines:
  `maxSeats ≥ minSeats` on tables and joins. The key pattern `^[a-z0-9]{6,12}$` applies to every `key` — table,
  area and join — and to `areaKey` and each entry of `tableKeys`. Cross-reference checks (repeated key or number, unknown area, a table
  outside the grid) are left to plan 664's route. All five are exported from `entities/index.ts` and added to
  `SCHEMA_BY_COLLECTION` as `floorPlans`, `tableHolds`, `waitlistEntries`, `conversations`, `messages`.
- [ ] **Collections.** Five rows in `server/constants/collections.js` with the flags of the C-REGISTRY-R table and
  a comment naming this plan and the Contract; `floorPlans` and `waitlistEntries` carry `routerWrites: true`.
  `server/test/collections.test.js` and `server/test/cross-business.test.js` (`floorPlans: () => ({})`,
  `waitlistEntries: () => ({})`) are updated. `docs/agent/standards-backend.md` §1 lists the five.
- [ ] **Indexes** in `server/db.js`, each with a name, after the Modules block: `floor_plans_business_unique`
  (`{ businessId: 1 }`, unique), `table_holds_cell_unique` (`{ businessId: 1, tableKey: 1, cell: 1 }`, unique),
  `table_holds_booking` (`{ businessId: 1, bookingId: 1 }`), `waitlist_business_date_status`
  (`{ businessId: 1, date: 1, status: 1 }`), `conversations_live_key_unique` (`{ businessId: 1, liveKey: 1 }`,
  unique, `partialFilterExpression: { liveKey: { $exists: true } }`), `conversations_business_last`
  (`{ businessId: 1, lastMessageAt: -1 }`), `messages_provider_unique` (`{ businessId: 1, providerMessageId: 1 }`,
  unique), `messages_conversation_at` (`{ businessId: 1, conversationId: 1, at: 1 }`).
- [ ] **Permission.** `ACTIONS` gains `'manageConversations'`; any member may do it (the line beside
  `manageRequests`); `OWNER_ONLY_TYPES` gains `'floorPlans'`. The browser mirror gets the same action and rule.
- [ ] **Four empty routers and mounts.** Each file exports `express.Router()` with no route and a header comment
  naming the plan that fills it (664 and 667, 673, 675, 675). Mounted in `server/app.js` before `/api/v1/public`.
  No gate is added here: the plan that adds a route adds `verifyToken` and `requireModule` on it.
- [ ] **Business delete.** The loop at `server/services/business.js:119` gains `tableHolds`, `conversations`,
  `messages`. `floorPlans` and `waitlistEntries` need no code: they are in `ALL_USER_ENTITY_TYPES`, which
  `server/routes/admin.js:83` already clears.
- [ ] **Module name.** `public/assets/data/dictionary.json` gains `"module_tables": "שולחנות ואירוח"` after
  `module_consultant_diag`. The platform dialog then lists the sixth module with no code change (verify by test in
  the dialog's existing spec only if a spec counts the checkboxes; none does today).
- [ ] **ADR 0033 and INV-7.** Create the ADR from section (a); append section (b) to `docs/brain/invariants.md`;
  apply the one field edit of section (c) to INV-1. Keep every field on one line.
- [ ] **Rule changes** (map, "Rule changes this program makes"): `docs/frontdesk/assistant-behaviour-rules.md`
  R-06 reads "…may be sent only when the server wrote it in the same turn. A table is confirmed only by the engine
  and the hold (INV-7)."; `docs/frontdesk/frontdesk-map.md` line 188 gains "except through the table engine when
  the business has `tables` and confirm mode `auto` (Restaurant program)."; the "C-CONV, C-AI (560–563)" paragraph
  there (line 172) gains one bullet: "Replaced by `docs/restaurant/restaurant-map.md` C-CONV and C-AI:
  `conversations.channel` is `'sim' | 'whatsapp'`; `assistant.level` 2 stays reserved and unused."
- [ ] **Map.** In `docs/restaurant/restaurant-map.md` add one line under "Contract extensions (run)" for anything
  this plan had to build differently from C-REGISTRY-R, or nothing when it was built as written.
- [ ] **Behaviour unchanged.** No existing test file other than the three named above is edited; the whole server
  and browser suites pass.

### Should Have (P1)
- [ ] `server/breadcrumbs.md` lists the four new router files with one line each.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built. The only visible change: the platform admin's business dialog shows a sixth module checkbox,
  "שולחנות ואירוח" (`module_tables`). Switching it on without "לקוחות והזמנות" stores it, and `modulesOf` ignores it.
- Dictionary key added: `module_tables` = `שולחנות ואירוח`.

## Atomic Sub-tasks

- [ ] A1: Write the approved rule down first so the code is built against it — ADR 0033 from section (a), INV-7 from section (b), the INV-1 Touches edit of section (c), each field on one line — docs/brain/decisions/0033-the-table-engine-decides.md, docs/brain/invariants.md
- [ ] A2: Add the sixth module so table service can be switched on per business — the key, the frontdesk dependency in modulesOf, max 6, the two gated types, the dictionary name, the updated module tests — shared/schemas/modules-pure.ts, shared/schemas/modules.ts, public/assets/data/dictionary.json, server/test/modules-schema.test.js
- [ ] A3: Give the profile, the booking and the request their new optional fields without breaking stored data — tableService, the eight booking fields and server-field names, the sim channel, the pure tableServiceOf helper — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/booking.schema.ts, shared/schemas/entities/request.schema.ts, shared/schemas/front-desk/table-service.ts
- [ ] A4: Declare the five new document shapes in the one schema package — floor plan, table hold, waiting-list entry, conversation, message, exported and mapped by collection — shared/schemas/entities/floor-plan.schema.ts, shared/schemas/entities/table-hold.schema.ts, shared/schemas/entities/waitlist-entry.schema.ts, shared/schemas/entities/conversation.schema.ts, shared/schemas/entities/message.schema.ts, shared/schemas/entities/index.ts
- [ ] A5: Register the five collections and their indexes so later plans only fill them — collection flags, eight named indexes, the backend standards list — server/constants/collections.js, server/db.js, docs/agent/standards-backend.md
- [ ] A6: Let any member answer guests and keep the floor plan owner-only — the new action on the server and in the browser mirror, the owner-only type — server/utils/permissions.js, src/app/core/services/permission.service.ts, src/app/core/services/permission.service.spec.ts
- [ ] A7: Mount four empty routers so later plans never touch the app file — router files with a header comment, one mount line each, the folder map — server/routes/floor-plan.js, server/routes/waitlist.js, server/routes/conversations.js, server/routes/sim.js, server/app.js, server/breadcrumbs.md
- [ ] A8: Make deleting a business remove its restaurant data too — the three server-only names in the delete loop, the two readable types the way requests and bookings go — server/services/business.js
- [ ] A9: Prove the registry with tests and keep every existing suite green — the two new test files, the updated collections, cross-business and modules tests — server/test/restaurant-schema.test.js, server/test/restaurant-registry.test.js, server/test/collections.test.js, server/test/cross-business.test.js
- [ ] A10: Change the front desk rules that said no channel confirms a table — R-06, rule 6 and the channel value, and the map's extension line — docs/frontdesk/assistant-behaviour-rules.md, docs/frontdesk/frontdesk-map.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: every reader of `MODULE_KEYS` (the platform dialog, `server/routes/admin.js`), `modulesOf`
  (`require-module.js`, `ModuleService`), `SCHEMA_BY_COLLECTION` (`server/utils/schema-check.js`,
  `permissions.js`), `ALL_USER_ENTITY_TYPES` (the generic API).
- New files needed: the five schema files, `table-service.ts`, the four router files, the two test files, ADR 0033.
- Model changes: optional fields only, on `frontDeskProfile`, `booking`; one enum value on `request.channel`.
- Backend / API: four mounts that answer 404 for every path; the generic API starts to read `floorPlans` and
  `waitlistEntries` (empty until plans 664 and 673), gated by module `tables`.
- Auth and validation: no new input is accepted in this plan. Generic writes of the two readable types answer 405.
- Security surface: none new — the routers are empty; `conversations`, `messages` and `tableHolds` are server-only
  (403 on the generic API), so guest message text has one read path, added by plan 675.
- Data / migration: none. No stored document changes; every new field is optional; the new indexes build on empty
  collections.
- Project checks: the `log-query` Done-when item; `module_tables` named above; no icon; `server/breadcrumbs.md` in
  scope; new persisted data follows `docs/agent/standards-backend.md` §3 (dedicated routers, named and justified in
  the map: guests and members write through their own doors).

## Out of Scope
- Any route, service, screen or job of the program (plans 663–683).
- A migration: no existing document is touched.
- The webhook router and its mount (plan 683).
- A per-business model key, deposits, and everything in the brief's Part 6.

## Critical Questions
- none

## Execution Notes
