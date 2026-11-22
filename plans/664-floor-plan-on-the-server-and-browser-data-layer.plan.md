# Plan 664 — Floor plan on the server and in the browser's data layer: save with checks, the in-use refusal

Status: draft
Depends-on: 662
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant owner is going to draw his room — tables with numbers and seats, in areas, with the joins he allows
(plan 665 builds the editor). Before a screen can exist, the drawing needs a home: one stored floor plan per
business, a server route that reads it and replaces it, the checks that keep it sound (no repeated table number, no
table outside the grid, no join across two areas) and the refusal that protects bookings — a table that a future
booking sits on cannot be dropped. This plan builds that data layer on both sides: the two routes, one pure check the
server and the editor share, and the browser service every table screen will read the plan from. No screen is built.

Verified on `origin/main` (28359b6d, 2026-11-22):
- There is no floor plan code: no `server/routes/floor-plan.js`, no `floorPlans` collection row in
  `server/constants/collections.js`, no `floor-plan` name under `src/app/` or `shared/schemas/`.
- Plan 662 (C-REGISTRY-R, treated as existing here and never edited) creates: the schema
  `shared/schemas/entities/floor-plan.schema.ts` (`floorPlanSchema`, type `FloorPlan`, exported from
  `shared/schemas/entities/index.ts` and `SCHEMA_BY_COLLECTION`); the collection row `floorPlans` (`userData: true`,
  `routerWrites: true`); the unique index `{ businessId: 1 }` on `floorPlans`; `OWNER_ONLY_TYPES` with `floorPlans`;
  the module key `tables`; the empty router `server/routes/floor-plan.js` and its mount `/api/v1/floor-plan` in
  `server/app.js`; and `bookingSchema.tableKeys`.
- `src/app/core/services/http-storage.adapter.ts:11` — the `API` map is the one place for backend paths (17 entries,
  `bookings: \`${API_ROOT}/bookings\`` at line 25); it has no floor plan entry and plan 662 does not add one.
- `server/routes/bookings.js` (102 lines) is the pattern to follow: `verifyToken` then `requireModule(...)` per route
  (lines 40, 62), `router.use(dataWriteLimiter)` (line 27), `scopeFilter(req)` for the business
  (`server/utils/business-scope.js:11`), `assertCan(req, res, action, { type, doc })`
  (`server/utils/permissions.js:84`), `checkStoredDoc(type, doc)` before a write
  (`server/middleware/validate.js:12`), `actorOf(req)`, a `fail` helper that logs `<area>.<name>.failed` and answers
  500, and `LIVE` from `server/jobs/purge-deleted.js`.
- `server/utils/permissions.js`: `manageRequests` is allowed to every member (line 58); `editFrontDesk` is in
  `OWNER_ONLY_ACTIONS` (line 20), so staff get 403 `OWNER_ONLY`; a consultant may do both (line 55).
- `server/middleware/require-module.js:47` `requireModule(key)` answers 403 `{ error: 'MODULE_OFF', module }`; tests set
  a business's modules with `testDb().collection('businesses').updateOne(..., { $set: { modules } }, { upsert: true })`
  and `clearModuleCache()` (`server/test/modules-gate.test.js:21–24`).
- `server/utils/id.js` `newId()`; a duplicate-key error is read as `err.code === 11000` (`server/routes/business.js:238`).
- `server/test/helpers/app.js` gives `buildTestApp`, `teardownTestApp`, `signTestToken`, `testDb`;
  `server/test/bookings-router.test.js:19–21` shows the owner / staff / outsider tokens and line 26 a seeded booking.
- `shared/schemas/entities/front-desk-profile.schema.ts:41` — `requestKinds.table.rules.areas` is a list of free
  strings (≤ 30, each ≤ 80), not keys.
- Browser: `src/app/core/services/booking-data.service.ts` shows a service that calls its own router through
  `environment.apiUrl + API.bookings` with `HttpClient` and returns `{ ok: true, … } | { ok: false, code }`;
  `src/app/core/models/booking.model.ts` shows a model file that re-exports the schema types from `@schemas/entities`.
  `src/app/core/services/breadcrumbs.md`, `src/app/core/models/breadcrumbs.md` and `server/breadcrumbs.md` are the
  folder maps of the three folders this plan adds files to.
- `docs/brain/invariants.md`: INV-1 `Touches` includes `src/app/core/services/*-data.service.ts`; INV-4 includes
  `shared/schemas/**`.

## Goals & Success Criteria
**Primary:** a business with the `tables` module can store, read and replace its one floor plan through
`/api/v1/floor-plan`; every unsound plan and every plan that drops a table in use is refused with a reason a screen
can show; the browser has one service that holds the plan.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/floor-plan.test.js` and
  `server/test/floor-plan-check.test.js`.
- [auto] `server/test/floor-plan.test.js` "first read": `GET /api/v1/floor-plan` of an owner whose business has
  `['frontdesk', 'tables']` and no stored plan answers 200 `{ plan: null }`; a staff member of the same business gets
  the same; nothing is inserted into `floorPlans`.
- [auto] `server/test/floor-plan.test.js` "save and read": the owner's `PUT /api/v1/floor-plan` with a valid body
  (three areas, four tables, one join) answers 200 `{ plan }` with `_id`, `schemaVersion: 2`, the token's
  `businessId`, `createdBy` and equal `createdAt` / `updatedAt`; `GET` returns the same plan; a second `PUT` keeps
  `_id`, `createdAt` and `createdBy`, changes `updatedAt`, and `floorPlans` still holds exactly one document for the
  business; a body that also carries `_id`, `businessId` or an unknown key cannot change the stored `_id` or
  `businessId`.
- [auto] `server/test/floor-plan.test.js` "who": a staff token gets 403 on `PUT` and the plan is unchanged; a staff
  token gets 200 on `GET`; an owner of another business gets `{ plan: null }` on `GET` and his `PUT` creates his own
  plan without touching the first; a business with `['frontdesk']` only gets 403 `{ error: 'MODULE_OFF', module:
  'tables' }` on both routes; a request without a token gets 401.
- [auto] `server/test/floor-plan.test.js` "refusals": each of these bodies answers 400 `{ error: 'BAD_FLOOR_PLAN',
  issues }` with exactly the named code and writes nothing — two tables with one `key` (`duplicate_key`), two tables
  with one `number` (`duplicate_number`), two areas with one `key` (`duplicate_area`), a table whose `areaKey` names
  no area (`area_missing`), a join that names a missing table (`join_table_missing`), a join that names one table
  twice (`join_repeated_table`), a join whose tables are in two areas (`join_mixed_areas`), two joins with one `key`
  (`duplicate_join`), a table at `x: 9, w: 2` on a 10-column grid and a turned table whose `h` crosses the last
  column (`outside_grid`); a body that breaks the schema (a seat range with `maxSeats < minSeats`, 201 tables, a grid
  of 9 columns) answers 400 `Validation failed`; two tables on the same cells answer 200.
- [auto] `server/test/floor-plan.test.js` "in use": with a seeded `confirmed` booking that ends in the future and
  holds `tableKeys: ['tblaaa01']`, a `PUT` without that table answers 409 `{ error: 'TABLE_IN_USE', bookings: [{ _id,
  date, time, partySize, tableKeys }] }` and the stored plan is unchanged; the same `PUT` with the table kept and
  `active: false` answers 200; the same holds for a `seated` booking; a `finished`, `cancelled` or `no_show` booking
  and one whose `endAt` is in the past do not block; a booking that holds the two tables of a join blocks a `PUT`
  that drops that join but keeps both tables, and no longer blocks once a join with the same tables under another
  `key` is in the body; the response carries no guest name and no phone.
- [auto] `server/test/floor-plan-check.test.js`: `checkFloorPlan` returns `[]` for the fixture plan and one issue
  with `code` and the offending `key` for each of the nine codes; `emptyFloorPlan(['בפנים', 'בחוץ'])` returns two
  areas with those names, keys that match `^[a-z0-9]{6,12}$`, orders 0 and 1, no table and no join;
  `emptyFloorPlan([])` returns a 24 × 16 grid with no area (the caller always passes names).
- [auto] `pnpm run test:ci` → exit 0, including the new `src/app/core/services/floor-plan-data.service.spec.ts`: `load`
  puts the server's plan into `plan_` and `null` for `{ plan: null }`; `save` puts the stored plan into `plan_` and
  returns `{ ok: true }`; a 400 returns `{ ok: false, code: 'BAD_FLOOR_PLAN', issues }` and a 409 returns
  `{ ok: false, code: 'TABLE_IN_USE', bookings }`, both leaving `plan_` unchanged; a failed `load` sets `loadFailed_`.
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — second plan of run `rs-engine` (663, then 664). It shares no file with 663. It must not run beside
  662 (which creates the router file this plan fills) or 667 (which adds a route to the same router file).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/floor-plan.js
server/test/floor-plan.test.js
server/test/floor-plan-check.test.js
server/breadcrumbs.md
shared/schemas/front-desk/floor-plan-check.ts
src/app/core/models/floor-plan.model.ts
src/app/core/models/breadcrumbs.md
src/app/core/services/floor-plan-data.service.ts
src/app/core/services/floor-plan-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/restaurant/restaurant-map.md
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

- INV-1: preserves — the floor plan belongs to the business in the token (`scopeFilter`), never one named by the
  request; every member reads it, only the owner (or a consultant acting as one) replaces it, through
  `assertCan(… 'editFrontDesk' …)`; the new browser service only calls that router.
- INV-4: preserves — the stored shape stays the schema plan 662 wrote; the server validates every write with
  `checkStoredDoc('floorPlans', …)`; the new shared file adds pure cross-field checks and no shape.
- INV-7: preserves — no table is offered, confirmed or moved here; the plan only stores the room the engine reads.

## Reuse Check

- `checkFloorPlan`, `emptyFloorPlan` in `floor-plan-check.ts` — family: helpers — rung: 4 — why: no shared piece checks a floor plan; one pure check is used by the server route and by the editor of plan 665, registered as the new logic family `floor-plan`
- `API.floorPlan` in `http-storage.adapter.ts` — family: http — rung: 2 — why: one more entry in the existing path map
- `FloorPlanDataService` — family: http — rung: 1 — why: a one-document client of its own router through `API.floorPlan` and `HttpClient`, the pattern of `BookingDataService.day`; the list base class does not fit one document that may be `null`
- `floor-plan.model.ts` — family: entity-schemas — rung: 1 — why: re-exports the schema's types, as `booking.model.ts` does

## Defaults

- empty-state-on-list — exception — why: routes and a data service only; the plan builds no list and no screen
- app-list-container — exception — why: routes and a data service only; the plan builds no list and no screen
- loading-and-error-states — exception — why: no screen is built; the service exposes isLoaded_ and loadFailed_ for the screens of plan 665
- one-breakpoint-set — exception — why: the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want my drawing of the room to be saved as one plan and refused when it has a mistake
  (two tables with the same number, a join across two areas), so that the engine and my hosts never work from a
  broken room.
- As a restaurant owner, I want to be stopped when I remove a table that guests are already booked on, and shown
  those bookings, so that no guest arrives to a table that is gone.
- As a host, I want to read the room as the owner drew it, so that the service screen shows the real place.

## Functional Requirements

### Contract C-FLOOR (frozen 2026-11-22, copied verbatim from `docs/restaurant/restaurant-map.md`)

**C-FLOOR (R2; used by R1's fixtures, R3, R4, R6, R9)**
- Collection `floorPlans`, at most one live document per business (unique index `{ businessId }`):
  `{ ...baseDocShape, grid: { cols: int 10–80, rows: int 10–80 }, areas: [{ key, name (nameField), order: int }]
  (1–10), tables: [{ key, number: string 1–6, areaKey, shape: 'round' | 'square' | 'rect', minSeats: int ≥ 1,
  maxSeats: int ≥ minSeats ≤ 30, x: int, y: int, w: int 1–8, h: int 1–8, turned: boolean, active: boolean,
  online: boolean }] (0–200), joins: [{ key, tableKeys: string[] 2–4, minSeats, maxSeats, online: boolean }] (0–60) }`.
  `key` is made by the browser once (`^[a-z0-9]{6,12}$`) and never changes; `number` is what people see.
- `PUT /api/v1/floor-plan` (owner, `editFrontDesk`) replaces the whole plan; `GET /api/v1/floor-plan` (any member).
  The server refuses: a repeated `key` or `number`, an `areaKey` or a join's table that does not exist, a table
  outside the grid, a join whose tables are in different areas, and — 409 `TABLE_IN_USE` with the bookings — a plan
  that drops a table or a join that a booking with `endAt > now` and status `confirmed | seated` holds (A5).
  Overlapping tables are allowed.
- A new plan is not created by a migration: the first `GET` of a business without one answers
  `{ plan: null }` and the editor starts from one area per entry of `requestKinds.table.rules.areas` (or the three
  defaults inside / outside / bar) and no tables.

### Contract C-TABLES (the part this plan implements, copied verbatim)

- Server: `requireModule('tables')` on `/api/v1/floor-plan/**`, `/api/v1/waitlist/**` and on the table routes of
  `/api/v1/bookings` named in C-BOOK2.

### Must Have (P0)

The shared check — `shared/schemas/front-desk/floor-plan-check.ts` (new, pure, no zod import at run time)
- [ ] `checkFloorPlan(plan: Pick<FloorPlan, 'grid' | 'areas' | 'tables' | 'joins'>): FloorPlanIssue[]` where
  `FloorPlanIssue = { code: FloorPlanIssueCode; key: string }` and the codes are `duplicate_area`, `duplicate_key`,
  `duplicate_number`, `area_missing`, `outside_grid`, `duplicate_join`, `join_table_missing`, `join_repeated_table`,
  `join_mixed_areas` (exported as `FLOOR_PLAN_ISSUE_CODES`). `key` is the key of the area, table or join at fault.
- [ ] Rules: an area `key`, a table `key` and a join `key` are each unique in their list; a table `number` is unique
  after trimming; a table's `areaKey` names an area; a table lies inside the grid — `x >= 0`, `y >= 0`,
  `x + width <= grid.cols`, `y + height <= grid.rows`, where width and height are `w` and `h`, swapped when `turned`;
  a join names existing tables, each once, all in one area. Overlapping tables are not an issue. Every issue found is
  returned (not only the first), in the order areas, tables, joins.
- [ ] `emptyFloorPlan(areaNames: readonly string[], makeKey?: () => string): Pick<FloorPlan, 'grid' | 'areas' |
  'tables' | 'joins'>` — the plan an editor starts from: `grid: { cols: 24, rows: 16 }`, one area per non-empty
  trimmed name (at most 10, repeats dropped) with `order` 0, 1, 2 …, no tables, no joins. With no usable name it
  returns no area: the caller passes the names (the editor of plan 665 passes the profile's
  `requestKinds.table.rules.areas`, else the Hebrew dictionary values of `fd_opt_inside`, `fd_opt_outside`,
  `fd_opt_bar`), so a stored area name is always plain text the owner can rename, never a dictionary key. `makeKey` defaults to a function that returns eight characters of `a–z0–9` from `Math.random` — a key only
  has to be unique inside one plan, and a test passes its own counter.

The routes — `server/routes/floor-plan.js` (the empty router of plan 662 is filled; the mount is not touched)
- [ ] `router.use(dataWriteLimiter)`; every route is `verifyToken`, then `requireModule('tables')`.
- [ ] `GET /` — `assertCan(req, res, 'manageRequests', { type: 'floorPlans' })`; answers `{ plan }` with the business's
  document, or `{ plan: null }` when it has none. It never inserts.
- [ ] `PUT /` — `assertCan(req, res, 'editFrontDesk', { type: 'floorPlans' })`. The body's `grid`, `areas`, `tables`
  and `joins` are taken and nothing else; a body where one of the four is missing answers 400
  `{ error: 'BAD_REQUEST_INPUT' }`. The stored document is built by the server: for a first save `_id: newId()`,
  `schemaVersion: 2`, `businessId` from `scopeFilter(req)`, `createdBy` and `userId` from `actorOf(req)`,
  `createdAt = updatedAt = now`; for a later save the stored `_id`, `businessId`, `createdBy`, `userId` and
  `createdAt` are kept and `updatedAt = now`.
- [ ] Order of checks on `PUT`: (1) `checkStoredDoc('floorPlans', doc)` → 400 `{ error: 'Validation failed', issues }`;
  (2) `checkFloorPlan(doc)` → 400 `{ error: 'BAD_FLOOR_PLAN', issues }`; (3) the in-use check → 409; (4) the write.
- [ ] The in-use check (A5): read the business's bookings with `status` in `confirmed | seated`, `endAt > now` and a
  non-empty `tableKeys`. A booking blocks the save when one of its `tableKeys` is not a table of the new plan, or when
  it holds more than one table and no join of the new plan has exactly that set of tables. The answer is 409
  `{ error: 'TABLE_IN_USE', bookings }` with, per blocking booking and ordered by `startAt`, only `_id`, `date`,
  `time`, `partySize` and `tableKeys` (at most 50 rows). Bookings marked `test: true` block too (they hold tables,
  brief A6). A table that is kept with `active: false` never blocks.
- [ ] The write: a later save is one `findOneAndReplace` by `_id` and `businessId`; a first save is an `insertOne`,
  and a duplicate-key error (`err.code === 11000`, two first saves at once) answers 409 `{ error: 'PLAN_CHANGED' }`.
  Two owners saving one after the other: the last save wins (no version field). The answer is 200 `{ plan }`.
- [ ] Logs: `floor_plan.saved` with `tables`, `joins` and `areas` as counts and `first: boolean`;
  `floor_plan.refused` with `reason` (`validation | check | in_use`) and counts. Never a table number, an area name
  or a guest's detail. Failures use the `fail` helper pattern with events `floor_plan.<name>.failed`.

The browser data layer
- [ ] `src/app/core/services/http-storage.adapter.ts`: the `API` map gains one entry,
  `floorPlan: (path?: string) => (path ? \`${API_ROOT}/floor-plan/${path}\` : \`${API_ROOT}/floor-plan\`)` (the shape
  of `API.diag`), added after `bookings`; nothing else in the file changes. When the entry is already there (a later
  edit of plan 662), it is left as it is.
- [ ] `src/app/core/models/floor-plan.model.ts`: re-exports the types `FloorPlan`, `FloorTable`, `FloorArea`,
  `FloorJoin` from `@schemas/entities` (the names plan 662 exports; where 662 exported only `FloorPlan`, the three
  others are derived here with indexed access types), plus `FloorPlanBody = Pick<FloorPlan, 'grid' | 'areas' |
  'tables' | 'joins'>` and re-exports `FloorPlanIssue` and `FLOOR_PLAN_ISSUE_CODES` from
  `@schemas/front-desk/floor-plan-check`.
- [ ] `src/app/core/services/floor-plan-data.service.ts` — `FloorPlanDataService` (`providedIn: 'root'`, `inject()`,
  signals only): `plan_` (`FloorPlan | null`, read-only outside), `isLoaded_`, `loadFailed_`; `load(): Promise<void>`
  (GET `environment.apiUrl + API.floorPlan()`; a failure sets `loadFailed_` and logs `floor_plan.load_failed` — `warn`
  for a 4xx, `error` otherwise — with the status only); `ensureLoaded()` (loads once); `save(body: FloorPlanBody):
  Promise<FloorPlanSaveResult>` with `FloorPlanSaveResult = { ok: true; plan: FloorPlan } | { ok: false; code:
  string | null; issues?: FloorPlanIssue[]; bookings?: InUseBooking[] }` — on 200 it sets `plan_`; on a refusal it
  returns the server's `error` as `code` with `issues` or `bookings` and leaves `plan_` as it was. No toast and no
  dictionary text here: the screens of plan 665 show the refusals.

Registry and maps
- [ ] `docs/brain/component-families.md`: a new logic family `### floor-plan — the room: one stored plan, its checks
  and its browser service` (Use: `checkFloorPlan`, `emptyFloorPlan`, `FloorPlanDataService`; When: any screen that
  reads or saves the room — never a second copy of the checks). `docs/brain/inventory.md` gains its line.
- [ ] `server/breadcrumbs.md`, `src/app/core/services/breadcrumbs.md` and `src/app/core/models/breadcrumbs.md` each
  gain the row of the new or filled file.
- [ ] `docs/restaurant/restaurant-map.md` "Contract extensions (run)": one line for the issue codes, the join rule of
  the in-use check, `PLAN_CHANGED` and `emptyFloorPlan`.

### Should Have (P1)
- [ ] `server/test/floor-plan.test.js` asserts through the log capture helper (`server/test/helpers/log-capture.js`)
  that a save and a refusal log no table number and no area name.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built and no key is added to `public/assets/data/dictionary.json`. The issue codes and
  `TABLE_IN_USE` are English keys; plan 665 adds their Hebrew texts when it shows them.

## Atomic Sub-tasks

- [ ] A1: Write the one check of a room that the server and the editor will share — checkFloorPlan with its nine issue codes (grid bounds honour a turned table) and emptyFloorPlan for a first visit; its own test file — shared/schemas/front-desk/floor-plan-check.ts, server/test/floor-plan-check.test.js
- [ ] A2: Let every member read the room and get an empty answer before it is drawn — fill the empty router: the limiter, the tables gate, the read route that never inserts; tests "first read" and the read half of "who" — server/routes/floor-plan.js, server/test/floor-plan.test.js
- [ ] A3: Let the owner replace the whole room, with the server writing the identity fields — the save route: body pick, built document, schema check, shared check, insert or replace, the two-first-saves answer, count-only logs; tests "save and read", "who", "refusals" — server/routes/floor-plan.js, server/test/floor-plan.test.js
- [ ] A4: Refuse a save that drops a table or a join a coming booking sits on — the in-use read of confirmed and seated bookings, the join rule, the trimmed booking rows in the answer; test "in use" with seeded bookings — server/routes/floor-plan.js, server/test/floor-plan.test.js
- [ ] A5: Give the browser one place that holds the room — the floor plan entry of the backend path map, the model file and the data service with load, ensureLoaded and save returning the refusal with its issues or bookings; its spec — src/app/core/services/http-storage.adapter.ts, src/app/core/models/floor-plan.model.ts, src/app/core/services/floor-plan-data.service.ts, src/app/core/services/floor-plan-data.service.spec.ts
- [ ] A6: Register the new pieces so later plans reuse them — the floor-plan family entry and inventory line, the three folder maps, the map's extension line — docs/brain/component-families.md, docs/brain/inventory.md, server/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: everything plan 662 registers (listed under "Verified"); `server/middleware/auth.js`,
  `require-module.js`, `write-limit.js`, `validate.js`, `server/utils/business-scope.js`, `permissions.js`, `actor.js`,
  `id.js`. No shared registry file is edited (C-REGISTRY-R): if one turns out to be missing an entry this plan needs
  (the `floorPlans` row, the index, the mount), stop and offer `approved: <path>`. The `API` map of the browser is
  not one of those registries; this plan appends its one entry and plan 667 reuses it.
- New files needed: `shared/schemas/front-desk/floor-plan-check.ts`, `server/test/floor-plan.test.js`,
  `server/test/floor-plan-check.test.js`, `src/app/core/models/floor-plan.model.ts`,
  `src/app/core/services/floor-plan-data.service.ts` and its spec.
- Model changes: none to a stored shape; the browser model file is new.
- Backend / API: `GET /api/v1/floor-plan` → `{ plan: FloorPlan | null }`; `PUT /api/v1/floor-plan` body `{ grid, areas,
  tables, joins }` → 200 `{ plan }` | 400 `BAD_REQUEST_INPUT` | 400 `Validation failed` | 400 `BAD_FLOOR_PLAN` |
  403 `MODULE_OFF` / `OWNER_ONLY` | 409 `TABLE_IN_USE` | 409 `PLAN_CHANGED`. A dedicated router, not the generic API,
  because the write needs the cross-field check and the in-use refusal (`routerWrites: true` in the collections row).
- Auth and validation: token on both routes; module `tables`; read = any member, write = owner or consultant; Zod
  through `checkStoredDoc`, then `checkFloorPlan`; identity fields are never taken from the body.
- Security surface: one new write route, rate-limited by `dataWriteLimiter`; the in-use answer returns booking ids,
  dates, sizes and table keys only — no guest name or phone, so a staff-level reader of a refusal learns nothing new.
- Data / migration: none — a business has no plan until its owner saves one.
- Project checks: `[auto] log-query` present; no dictionary key and no icon (no screen); Reuse Check lists every new
  piece and the registry is updated in the same branch; folder maps of `server/`, `core/services` and `core/models`
  are in scope; no hotspot is edited.
- Traps: `bookings.tableKeys` is written by no route before plan 668 — the "in use" test seeds bookings straight into
  the collection (raw documents, as `bookings-router.test.js:26` does); clear the module cache after setting a test
  business's modules.

## Out of Scope
- The editor, the shared floor map and every screen (plans 665, 666); the table settings and `PUT /confirm-mode`
  (plan 667); holds, bookings and the engine's use of the plan (plans 663, 668).
- Editing any file plan 662 owns (schemas, collections, indexes, permissions, mounts).
- Several layouts, walls, free rotation, history of plan changes.

## Critical Questions
- none

## Execution Notes
- behaviour: two saves one after the other — the last one wins; there is no version check (one owner edits the room).
- behaviour: a booking marked `test: true` blocks dropping its table like any other (brief A6: test data does take tables).
- behaviour: a first-visit plan uses a 24 × 16 grid (changed in plan 684); area names are stored as plain text the caller passes, never as dictionary keys (aligned with plan 665 by the Planner, 2026-11-22).
