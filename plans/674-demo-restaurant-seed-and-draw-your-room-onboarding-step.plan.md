# Plan 674 — A demo restaurant: a seeded room, a week of bookings and a waiting list, and the setup step "draw your room"

Status: draft
Depends-on: 673
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Dandan shows the product to pilot restaurants this week. After plans 662–673 a restaurant has a room, an engine, a
service screen and a waiting list — but an empty one: to show it he would have to draw a room and type forty bookings
by hand before every meeting. The only demo data today is a catering business. And a real restaurant that gets table
service switched on is not told that its first step is to draw the room. This plan adds a local seed script for one
demo restaurant and one more step in the front desk setup checklist. It is map row R12 of the Restaurant program
(`docs/restaurant/restaurant-map.md`, decision D1).

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/scripts/seed-demo-business.js` (128 lines, plan 575) seeds one catering business. Its rules: local only —
  `parseArgs` (line 25) refuses `--target=atlas` and `--confirm-host`, needs `--target=local`, accepts `--db=<name>`;
  dry run by default, `--write` inserts; idempotent — per collection only documents whose `_id` is not there yet are
  inserted (lines 88–98) and a second run prints `already seeded`; every document is validated with `parseV2` before
  anything is written (`validateAll`, line 48); the owner's password comes from `DEMO_OWNER_PASSWORD` (≥ 8
  characters) and is stored only as a PBKDF2 hash (`hashPassword`, line 41); the business is `internal: true`; it
  connects through `server/migrations/tools/_connect.js` (line 115); it exports `{ parseArgs, seedDemoBusiness }`.
- `server/scripts/lib/demo-data.js` (306 lines): a pure builder (`buildDemoData({ now, ownerId, businessId })`), fixed
  `demo_…` ids, no clock of its own; it uses `jerusalemDate` from `server/middleware/usage.js`.
  `server/test/seed-demo-business.test.js` (156 lines) is the test pattern (counts, schemas, second run, local only).
- `server/services/front-desk-setup.js` (71 lines): `checklistFor(db, businessId, profile)` (line 30) builds the items
  `profile_basics`, `hours`, `request_kinds`, `knowledge_<topic>`…, `link_published`, `test_request`;
  `frontDeskSetup(db, businessId, loadedProfile)` (65). Callers: `server/routes/business.js:280`
  (`GET /business/setup-status`) and `server/routes/admin.js:138` (the platform rows).
  `server/test/front-desk-setup.test.js` asserts exact totals (`total` 8 at line 116, `{ done: 2, total: 6 }` at 126).
- `src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.ts:28–33`: each
  item is shown with the label key `'frontdesk_setup_' + item.key` and links to `/requests` for `test_request` and to
  `/frontdesk/onboarding` for every other key. Keys such as `frontdesk_setup_profile_basics` exist in
  `public/assets/data/dictionary.json`; `frontdesk_setup_floor_plan` does not.
- `server/middleware/require-module.js:6–7` shows how the server reads a business's modules: `getBusiness` from
  `server/services/business.js` and `modulesOf` from `server/generated/schemas/modules`.
- `shared/schemas/front-desk-templates.ts:112`: `templateFor('restaurant')` gives the restaurant's request kinds
  (kind `table`, lines 47–58). `shared/schemas/entities/front-desk-profile.schema.ts`: `slug` (line 56), `hours`
  (62, rows with `dayIndexes`, `open`, `close`), `status` (72; `pilot` and `active` are public).
- `shared/schemas/entities/booking.schema.ts`: a booking needs `clientId`, `guestName`, `guestPhone`, `statusHistory`
  (≥ 1), `publicToken` (≥ 16 characters) and `endAt === startAt + durationMinutes × 60000`.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): the module key `tables`,
  `floorPlanSchema`, `waitlistEntrySchema`, `tableService` on the profile and `tableServiceOf` (662); the engine
  `assign` / `turnFor` compiled to `server/generated/schemas/front-desk/table-engine.js` (663); the floor plan route
  and the editor at `/frontdesk/floor-plan` (664, 665); `claim` in `server/services/table-holds.js` and `tableKeys`
  on a booking (668).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-FLOOR** (the shape) — Collection `floorPlans`, at most one live document per business:
`{ ...baseDocShape, grid: { cols: int 10–80, rows: int 10–80 }, areas: [{ key, name (nameField), order: int }]
(1–10), tables: [{ key, number: string 1–6, areaKey, shape: 'round' | 'square' | 'rect', minSeats: int ≥ 1,
maxSeats: int ≥ minSeats ≤ 30, x: int, y: int, w: int 1–8, h: int 1–8, turned: boolean, active: boolean,
online: boolean }] (0–200), joins: [{ key, tableKeys: string[] 2–4, minSeats, maxSeats, online: boolean }] (0–60) }`.
`key` is made once (`^[a-z0-9]{6,12}$`) and never changes; `number` is what people see.

**C-HOLD** (the parts used here) — `server/services/table-holds.js`: `claim(db, booking, tableKeys, startAt,
endAtWithBuffer)` — one ordered `insertMany` of every cell of every table; a duplicate-key error deletes the rows
this call inserted and returns `{ ok: false }`. A booking of kind `table` in a business with `tables` on is written
**only after** `claim` returned ok, and a failed booking write releases the claim. This index is the only guard
against a double booking (INV-7).

**C-WAIT** (the shape) — Collection `waitlistEntries`: `{ ...baseDocShape, date, guestName, guestPhone, clientId?,
partySize: int 1–30, areaKey?, quotedMinutes?: int, status: 'waiting' | 'notified' | 'seated' | 'left' | 'expired',
joinedAt, notifiedAt?, bookingId?, test?: true }`.

## Goals & Success Criteria
**Primary:** one command fills a local database with a restaurant that has a drawn room, table settings, a public
profile, 40 bookings over seven days on real tables, four waiting parties and six clients; and a restaurant with
table service sees "draw your room" in its setup checklist until it has a table.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/seed-demo-restaurant.test.js`:
  - `buildDemoRestaurant({ now })` returns 1 floor plan with 14 tables in 3 areas and 2 joins, 1 profile, 6 clients,
    40 bookings on 7 different dates (the Jerusalem date of `now` − 1 day … + 5 days) and 4 waiting-list entries, and
    every document passes its shared schema (`parseV2`);
  - no two bookings that are `confirmed` or `seated` share a table at overlapping times (checked in the test from
    `tableKeys`, `startAt`, `endAt`), and every booking's party fits the seat range of its table or join;
  - the same `now` gives the same documents twice (deep equality), for three clocks: `2026-11-12T21:21:00Z`,
    `2026-03-27T21:30:00Z` and `2026-10-25T00:30:00Z` (the two daylight-saving nights);
  - `seedDemoRestaurant(db, { write: false })` writes nothing (every collection count is unchanged, `tableHolds`
    included); with `write: true` the documents exist, the business has `tables` in `modulesOf`, and every
    `confirmed` or `seated` booking has its rows in `tableHolds`; a second run with `write: true` inserts 0 documents
    and adds 0 hold rows;
  - `parseArgs` refuses `--target=atlas`, `--confirm-host=x`, a missing `--target` and an unknown argument;
  - with the seeded business, `GET /api/v1/bookings/day?date=<today>` as its owner answers 200 with bookings that
    carry `tableKeys`, and `GET /api/v1/floor-plan` answers the 14 tables.
- [auto] `server/test/front-desk-setup.test.js`: for a restaurant profile of a business with
  `['frontdesk', 'tables']` the items hold `floor_plan` right after `request_kinds`, not done without a floor plan,
  not done with a plan of zero tables, done with one table; for a business without `tables` there is no `floor_plan`
  item and the two existing totals (8 and 6) are unchanged.
- [auto] `pnpm run test:ci` → exit 0, including
  `src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.spec.ts`: the row of the key
  `floor_plan` links to `/frontdesk/floor-plan`; the row of `hours` still links to `/frontdesk/onboarding`.
- [auto] `node server/scripts/seed-demo-restaurant.js --target=atlas` → exit 1 and the line
  `[seed-demo-restaurant] failed: demo seed is local only`.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/dashboard` (the setup-status answer stubbed with a `frontDesk` checklist that holds `floor_plan`, not done) ·
  tap the row "ציור החדר" · the address is `/frontdesk/floor-plan` — `e2e/ui/674-1.spec.ts`.
- [human] Dandan runs the seed with `--write` on a scratch local database, signs in as the demo owner, opens
  `/bookings?view=floor`, taps 20:00 on the strip and sees a busy, believable room; the guest page
  `/book/demo-restaurant` shows free and taken times (after plan 670).

## Execution Mode
- Parallel: no — the only plan of run `rs-demo`, after `rs-book-ui`. It appends to
  `public/assets/data/dictionary.json`, as every screen plan of the program does, so it never runs beside a screen run.
- Concurrent plans: none
- Isolated DB: no — the tests use the in-memory test database; the script itself only ever writes to a local
  database named on its command line.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/seed-demo-restaurant.js
server/scripts/lib/demo-restaurant-data.js
server/test/seed-demo-restaurant.test.js
server/services/front-desk-setup.js
server/test/front-desk-setup.test.js
server/breadcrumbs.md
src/app/pages/dashboard/components/front-desk-checklist-card/**
src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
e2e/ui/674-1.spec.ts
screens/674-*.png
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

- INV-2: preserves — `server/services/front-desk-setup.js` reads one more document of the same business (its floor plan) and the business's own module list; every query carries that `businessId`, nothing crosses businesses and no master data is read or written. The seed script writes one business's documents, each with that business's id, into a local database only.

## Reuse Check

- `server/scripts/seed-demo-restaurant.js` — family: none — rung: 4 — why: a sibling of `seed-demo-business.js` with the same rules (local only, dry run by default, idempotent by `_id`, schema-checked, password from the environment); a second business with other collections and hold claims does not fit as a flag on the catering script without making that script hard to read. `parseArgs` is imported from it, not copied; the catering script is not edited.
- `server/scripts/lib/demo-restaurant-data.js` (`buildDemoRestaurant`) — family: none — rung: 4 — why: the pure data builder of the demo restaurant, the twin of `demo-data.js`; it places bookings with the shared engine instead of hand-written tables.
- Checklist item `floor_plan` — family: none — rung: 4 — why: no new piece: one more item in the existing `checklistFor` list and one more branch in the card's existing path rule.

## Defaults

- one-breakpoint-set — exception — why: no SCSS is written; the card's template and styles are unchanged
- loading-and-error-states — exception — why: no screen is added; the card keeps its own loading behaviour
- empty-state-on-list — exception — why: no list is added; one item joins an existing checklist
- app-list-container — exception — why: no list page is added or changed

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the product owner, I want one command that gives me a restaurant with a full week, so that I can show the room,
  the service screen and the guest page to a pilot restaurant without preparing data by hand.
- As a restaurant owner who just got table service, I want my setup checklist to tell me to draw my room, so that I
  know what to do first.

## Functional Requirements

### Must Have (P0)
- [ ] **The script** `server/scripts/seed-demo-restaurant.js`, with the rules of `seed-demo-business.js`:
  `--target=local` required, `--db=<name>` optional, `--write` to insert, anything else refused; `--target=atlas` and
  `--confirm-host` answer `demo seed is local only`; dry run prints `would insert <n> <collection>` per collection
  and `would claim tables for <n> bookings`, and writes nothing; `--write` needs `DEMO_OWNER_PASSWORD` (≥ 8
  characters), stored only as the PBKDF2 hash signup uses; errors print `[seed-demo-restaurant] failed: <message>`
  and exit 1; it exports `{ seedDemoRestaurant }` and reuses `parseArgs` of `seed-demo-business.js` by `require`.
  The password hash function is the same formula (PBKDF2-SHA-256, 100 000 rounds, 32 bytes, `<saltHex>:<hashHex>`),
  written in the new script (the existing script does not export it and is not edited).
- [ ] **What it writes** (fixed ids, so a second run finds them):
  - `users`: `demo_rest_owner` (name `demo_host`, email `demo-restaurant@foodco.invalid`, `businessRole: 'owner'`,
    not a platform admin) — the same fields the catering seed writes.
  - `businesses`: `demo_restaurant`, name "מסעדת הדגמה", `internal: true`, `modules: ['events', 'event_logistics',
    'frontdesk', 'ai_create', 'tables']`, checked with `businessSchema`.
  - `frontDeskProfiles`: one, `businessType: 'restaurant'`, `displayName` "מסעדת הדגמה", `slug: 'demo-restaurant'`,
    a phone and an address, `status: 'pilot'`, `hours`: one row for all seven days, `open: '12:00'`, `close: '23:00'`,
    `requestKinds` from `templateFor('restaurant')` with kind `table` enabled and its areas `inside`, `outside`,
    `bar`, and `tableService: { confirmMode: 'auto', autoMaxParty: 6, slotMinutes: 15, turnMinutes: [{ maxParty: 4,
    minutes: 90 }, { maxParty: 30, minutes: 120 }], lastSeatingBeforeCloseMinutes: 60, bufferMinutes: 0,
    holdMinutes: 15, autoNoShow: false, reminderHour: '10:00', cancellationCutoffHours: 3 }`.
  - `floorPlans`: one, grid 40 × 24, areas `inside` "בפנים" (order 0), `outside` "בחוץ" (1), `bar` "בר" (2), and the 14
    tables of the table below; all are `active`, none is `turned`, and all are `online` except table 14
    (`online: false`); two joins:

    | number | area | shape | seats min–max | key |
    |---|---|---|---|---|
    | 1, 2, 3, 4 | inside | square | 1–2 | `demot01`…`demot04` |
    | 5, 6, 7 | inside | rect | 3–4 | `demot05`…`demot07` |
    | 8 | inside | round | 5–6 | `demot08` |
    | 9 | inside | rect | 6–8 | `demot09` |
    | 10, 11 | outside | square | 2–4 | `demot10`, `demot11` |
    | 12 | outside | round | 4–6 | `demot12` |
    | 13, 14 | bar | square | 1–2 | `demot13`, `demot14` |

    Joins: `demoj01` = tables 5 + 6 (6–8 seats, online); `demoj02` = tables 10 + 11 (5–8 seats, online). Positions:
    whole cells, no two tables on the same cell, each area in its own band of the grid (inside columns 2–24,
    outside 27–38, bar along row 21), sizes by seats (2 seats 2 × 2, 4 seats 3 × 2, 6–8 seats 4 × 2 or 3 × 3).
  - `clients`: 6 diners with Hebrew names and invented `05x` phone numbers, kind `diner`, one tagged `vip`.
  - `bookings`: 40, kind `table`, placed by the builder (next item).
  - `waitlistEntries`: 4 for today's date — two `waiting`, one `notified`, one `left` — parties 2, 4, 2, 5, joined
    10, 20, 35 and 50 minutes before `now`.
- [ ] **How the 40 bookings are placed** — in `buildDemoRestaurant({ now })`, pure and deterministic: the dates are
  the Jerusalem date of `now` − 1 day (6 bookings), today (10), and + 1 … + 5 days (5, 5, 5, 5, 4). For each date the
  builder walks a fixed list of asks — times `12:30, 13:00, 13:30, 19:00, 19:30, 20:00, 20:00, 20:30, 21:00, 21:00`
  with parties `2, 4, 2, 6, 3, 2, 8, 4, 2, 5` and areas `inside, inside, bar, inside, outside, inside, inside,
  outside, bar, inside` — and gives each to the engine's `assign(plan, profile, holds, ask)` with the holds of the
  bookings already placed on that date, `onlineOnly: false` and a `now` early enough that no lead rule refuses it
  (the builder passes the booking's own `startAt` − 3 days as the engine's `now`). An ask the engine refuses is
  skipped and the next one is taken; if a date cannot reach its count the builder throws. Each booking gets the
  engine's `tableKeys`, `startAt` and `endAt`, `durationMinutes` from them, a client in rotation, `source: 'phone'`,
  a fixed `publicToken` (`demo_rest_booking_<nn>` padded to 24 characters) and a status from `now`:
  `endAt ≤ now` → `finished` (the third and the fifth of yesterday → `no_show`); `startAt ≤ now < endAt` → `seated`
  (with `seatedAt: startAt`); otherwise `confirmed`. `statusHistory` holds the moves in order, `via: 'server'`,
  by the demo owner.
- [ ] **Writing with holds.** Documents that are not bookings are inserted the way the catering seed does (only ids
  that are missing). Each missing booking that is `confirmed` or `seated` is written as C-HOLD says: `claim` first,
  then the insert; when `claim` answers `{ ok: false }` the script stops with
  `demo booking <id>: its table is taken in this database` and inserts no further booking; when the insert fails the
  claim is released. `finished` and `no_show` bookings are inserted without a claim. A booking whose `_id` exists is
  skipped together with its claim. The final line is `already seeded` when nothing was missing, else the catering
  seed's two summary lines with the number of claimed bookings added.
- [ ] **The checklist step.** `checklistFor` adds `{ key: 'floor_plan', done }` right after `request_kinds`, only
  when the business has `tables` (`modulesOf(await getBusiness(businessId))` — the two helpers
  `require-module.js` uses); `done` is true when the business's `floorPlans` document has at least one table. A
  business without `tables` gets exactly today's list. `total` and `done` follow the list.
- [ ] **The card.** In `front-desk-checklist-card.component.ts` the row of `floor_plan` links to
  `/frontdesk/floor-plan`; every other row is unchanged. New dictionary key `frontdesk_setup_floor_plan` "ציור החדר".
  A staff member who follows the link is sent away by the route's own guard (665); the card itself is unchanged for
  staff.

### Should Have (P1)
- [ ] The script's header comment gives the one command to run and says how to remove the demo (drop the scratch
  database), as the catering script does.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No new screen. The only visible change is one more row, "ציור החדר", in the front desk setup card of the dashboard
  for a business with table service, linking to the floor plan editor.
- New key in `public/assets/data/dictionary.json` (appended; checked free): `frontdesk_setup_floor_plan` "ציור החדר".
- No icon is added (the card's rows use its existing done / not-done icons).
- Hebrew texts inside the seed (names of the business, areas, clients) are data of a local demo database, not UI
  strings.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Describe the demo restaurant as plain data that never collides with itself — the business, owner, profile with table settings, the 14-table room with its two joins, six clients, the fixed asks placed by the engine into 40 bookings with statuses from the clock, four waiting parties; pure and deterministic — server/scripts/lib/demo-restaurant-data.js
- [x] A2: Write the seed command with the same safety rules as the catering demo — local only, dry run by default, schema check before any write, missing ids only, password from the environment — server/scripts/seed-demo-restaurant.js
- [x] A3: Give every live demo booking its tables through the hold claim — claim before insert, stop on a taken table, release on a failed insert, skip claims for bookings that exist, the dry-run line — server/scripts/seed-demo-restaurant.js
- [x] A4: Prove the seed with tests — counts and schemas, no shared table at one time, the three clocks, dry run writes nothing, second run inserts nothing, local only, the day and floor-plan reads of the seeded business — server/test/seed-demo-restaurant.test.js, server/breadcrumbs.md
- [x] A5: Tell a restaurant with table service to draw its room first — the floor-plan item behind the module check with its done rule; test cases for with and without the module and the unchanged totals — server/services/front-desk-setup.js, server/test/front-desk-setup.test.js
- [x] A6: Send the new checklist row to the floor plan editor — the path rule of the card, the dictionary key, the card spec — src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.ts, src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.spec.ts, public/assets/data/dictionary.json
- [x] A7: Write the screen check that runs in the real app — signInQa, the setup-status answer stubbed with the floor-plan item, the tap and the address; screenshot — e2e/ui/674-1.spec.ts
- [x] A8: Run every check of this plan and hand Dandan the hand check — test:server, test:ci, the refused atlas run, build, both lints, log-query; evidence into Execution Notes; then the human card with the exact seed command

## Technical Considerations
- Dependencies: `parseArgs` of `seed-demo-business.js`; `parseV2` (`server/utils/schema-check.js`); `businessSchema`;
  `templateFor`; the engine and `tableServiceOf` from `server/generated/schemas/front-desk/` (662, 663); `claim` and
  the release function of `server/services/table-holds.js` (668); `getBusiness`, `modulesOf`;
  `server/migrations/tools/_connect.js`.
- New files needed: `server/scripts/seed-demo-restaurant.js`, `server/scripts/lib/demo-restaurant-data.js`,
  `server/test/seed-demo-restaurant.test.js`, `e2e/ui/674-1.spec.ts`.
- Model changes: none.
- Backend / API: no route changes. `GET /business/setup-status` and the platform rows may carry one more checklist
  item (`floor_plan`) for a business with `tables`.
- Auth and validation: the script runs only by hand against a local database; it validates every document with the
  shared schemas before writing (INV-4). The checklist is read by members as today.
- Security surface: the demo owner's password is read from the environment, never printed, stored as a hash; the
  script refuses any non-local target. The demo phones and names are invented.
- Data / migration: none — no existing document changes; the script only inserts missing demo documents.
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; one `[ui]` spec with
  `signInQa`; the dictionary key named with its Hebrew value; no icon; Reuse Check filled; hotspots appended only;
  `server/breadcrumbs.md` in scope.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Kitchen data for the demo restaurant (products, recipes, suppliers): the demo shows the front of house; the
  catering demo covers the kitchen.
- Seeding any non-local database; a "reset demo" command (drop the scratch database instead).
- Conversations, messages and assistant data for the demo (plans 675–682).
- A step on the onboarding page itself: the checklist card is where setup steps are shown.
- Any change to `seed-demo-business.js`, to a shared registry file or to the floor plan editor.

## Critical Questions
- none

## Execution Notes
- behaviour: booking statuses are set from the clock of the seed run (past → finished, running → seated, later →
  confirmed); seed a fresh scratch database shortly before a demo for a lively room.
- evidence: build, lint, test:ci (2991 SUCCESS), test:server, lint:icons, lint:no-native-select, override-check, plan-ledger, breadcrumbs, kit-manifest-check → exit 0; `node server/scripts/seed-demo-restaurant.js --target=atlas` → exit 1, `[seed-demo-restaurant] failed: demo seed is local only`; log-query → SKIP (no database).
- scope extended: docs/brain/component-families.md was already in scope; two family entries added (kit reuse-registry check).
- behaviour: the "draw your room" step is an item of the dashboard's setup checklist (where every other setup step
  is), linking to the editor; no separate onboarding page step is built.
