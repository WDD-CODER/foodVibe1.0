# Restaurant program plan map — plan of record (Architect draft 2026-11-21, Planner Step 0 + Step 1 2026-11-22)

Source brief: `docs/restaurant/restaurant-program-brief.md` (Part 0.5 = decisions D1–D11 and defaults A3–A8, Part 2 =
cross-cutting rules, Part 3 = specs RS-nn and the Reality Check seeds, Part 4 = rounds and runs).
Step 0 ran against `origin/main` `28359b6d54b0c77e288c52702a850daef92ccf07` (2026-11-22) — every plan of the program
uses it as `Snapshot:`.
Seen: highest ADR 0032, highest migration 0012, highest plan 659. Plan numbers 662–683 were assigned in Step 1
(660 and 661 are the two finance audits saved the same day; they are not part of this program).
Builds on the Front Desk Contracts in `docs/frontdesk/frontdesk-map.md` (C-GUEST, C-CLIENT, C-PROFILE, C-REQUEST,
C-ACTOR, C-AIUSAGE) and on the Modules Contracts in `docs/modules/modules-map.md` (C-MODULES, C-AICAP, C-AIDRAFT).

The Contracts below were checked against the code in Step 0, corrected (every correction is a numbered delta under
"Reality Check deltas") and **frozen on 2026-11-22**. Copy a Contract verbatim into every plan that uses it. They
are a proposal read against the code, not tested code: a plan that finds a Contract cannot be built as written
changes it here, under "Contract extensions (run)" at the end, and carries on.

## Plan rows

Size: S / M / L (one Worker session each; an L may be split at drafting). Tier: the builder's starting tier
(`docs/agent/model-routing.md`).

### Wave 0 — foundation (run `rs-0`, alone, first)

| Map# | NNN | Spec | Title | Size · tier | Depends on (must be merged) |
|---|---|---|---|---|---|
| R0 | 662 | all | Register the program once — module key `tables`, new schemas, collections, indexes, permission lists, empty routers and their mounts, ADR 0033 and INV-7 (C-REGISTRY-R, C-TABLES) | L · build | gate G1; `chore/modules-staging` merged into `main` (D8) |

### Wave 1 — the room and the engine

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| R1 | 663 | RS-03 | The table engine: slots, turn, candidates, assign, alternatives — pure, shared, tested (C-ENGINE) | M · judgment | R0 |
| R2 | 664 | RS-02 | Floor plan on the server and in the browser's data layer: save with checks, the in-use refusal (C-FLOOR) | M · build | R0 |
| R3 | 665 | RS-02 | The shared floor map and the floor plan editor: add, drag, edit, duplicate, delete, areas | L · build (design-light) | R2 |
| R4 | 666 | RS-02 | Joined tables in the editor, and the editor on a phone | M · build | R3 |
| R5 | 667 | RS-04 | Table settings card with the one-button confirm mode (C-TSERVICE) | M · build | R0 |

### Wave 2 — bookings on the engine

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| R6 | 668 | RS-05 | Bookings hold tables: the unique hold, create by a member, walk-in, move, change, approve through the engine (C-HOLD, C-BOOK2) | L · judgment | R1, R2 |
| R7 | 669 | RS-05 | Guests see free times and get a table at once when the owner allows it (C-PUBAVAIL) | M · build | R6 |
| R8 | 670 | RS-05 | The guest page: time chips, area, "confirmed" or "waiting", manage the booking | M · build (design-light) | R7 |
| R9 | 671 | RS-06 | The service screen: the room with live states, the table sheet, the time strip, the mode switch | L · build (design) | R6, R3 |
| R10 | 672 | RS-06 | New booking by phone and walk-in dialogs, "arriving next" and "not assigned" lists | M · build | R9 |
| R11 | 673 | RS-07 | The waiting list on the server and its drawer on the service screen (C-WAIT) | M · build | R9 |
| R12 | 674 | D1 | A demo restaurant: seeded floor, a week of bookings, a waiting list; the onboarding step "draw your room" | S · build | R9 |

### Wave 3 — the conversation channel (simulator first)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| R13 | 675 | RS-08 | Conversations and messages on the server: the inbound handler, the window, takeover, the template catalogue, the simulator transport (C-CONV, C-CHANNEL, C-TEMPLATES) | L · judgment | R0 |
| R14 | 676 | RS-09 | The scheduler and its jobs: late flag, reminder with buttons, guest taps move the booking (C-JOBS) | M · build | R13, R6 |
| R15 | 677 | RS-08 | The inbox: list, thread, take over and hand back, the linked card, reply | M · build (design) | R13 |
| R16 | 678 | RS-08 | The simulator screen: a phone chat as a test guest, buttons, the window clock, clear test data (C-TESTDATA) | M · build (design-light) | R13 |

### Wave 4 — the assistant

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| R17 | 679 | RS-10 | The assistant's turn on the server: prompt, answer schema, guardrails, levels 0 and 1, the key seam (C-AI, C-AIKEY) | L · judgment | R13 |
| R18 | 680 | RS-11 | The assistant books, changes and cancels a table through the engine with fixed sentences and buttons (C-AI2) | M · judgment | R17, R6 |
| R19 | 681 | RS-10, RS-11 | The eval set (30 Hebrew dialogues) and the suggestion on the request card with the agreement log | M · build | R18 |
| R20 | 682 | RS-10 | "Suggest a reply" and "fix this answer" in the inbox | S · build | R17, R15 |

### Wave 5 — real WhatsApp (optional)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| R21 | 683 | RS-12 | The WhatsApp transport and the signed webhook; the owner alert | M · build | R13, R14, gate G-WA |

## Runs

By plan number, after the Step 2 splits (R3 = 665 + 684, R6 = 668 + 685, R9 = 671 + 686):
`rs-0` = 662 · `rs-engine` = 663, 664 · `rs-floor-ui` = 665, 684, 666, 667 · `rs-book-srv` = 668, 685, 669 ·
`rs-book-ui` = 670, 671, 686, 672, 673 · `rs-demo` = 674 · `rs-conv-srv` = 675, 687 · `rs-jobs` = 676 ·
`rs-conv-ui` = 677, 678 · `rs-ai` = 679, 689, 680, 681, 682 · `rs-wa` = 683.

Waves 3–5 were drafted on 2026-11-22 (R13 = 675 + 687, R17 = 679 + 689). 676 edits the waiting-list route, so it
needs 673 and runs alone after `rs-book-ui` (`rs-jobs`); `rs-conv-srv` may still run beside `rs-book-ui`. 678 needs
676 and 687 and edits the waiting-list drawer and the clients list, so `rs-conv-ui` runs after `rs-jobs`. `rs-ai`
needs 685 (680) and 677 (682). 679, 689 and 680 edit the same turn files: sequential.

Dependencies changed in Step 2: 667 also needs 664 (both edit `server/routes/floor-plan.js`); 671 also needs 667
(the mode switch calls its route) and 685 (the browser booking calls); 673 also needs 672 and 686; 674 needs 673.
667 and 670 both edit `package.json` and `pnpm-lock.yaml` (`qrcode`, `ics`): never in two live runs, and never
beside open plan 542.

Side by side: `rs-floor-ui` with `rs-book-srv` (screens against server); `rs-conv-srv` with `rs-book-ui`.
One at a time: every screen run. Confirm every grouping with `node scripts/plan-order.mjs` and the `/orchestrate`
dry run before printing the list.

## Must not run at the same time (write `Parallel: no` against these)

- R0 with every other plan of the program: it edits the shared registries (`shared/schemas/modules-pure.ts`,
  `shared/schemas/modules.ts`, `shared/schemas/entities/index.ts`, `front-desk-profile.schema.ts`,
  `booking.schema.ts`, `request.schema.ts`, `server/constants/collections.js`, `server/db.js`, `server/app.js`,
  `server/utils/permissions.js`, `shared/schemas/staff-fields.ts`, `docs/brain/invariants.md`).
- R6 and R7 both edit `server/routes/bookings.js` / `server/routes/requests.js` / `server/routes/public.js` —
  sequential inside `rs-book-srv`.
- R13, R14 and R21 all edit the inbound handler and `server/index.js` — never in two live runs.
- R17 and R18 both edit the turn handler — sequential inside `rs-ai`.
- R3, R4, R5, R8, R9, R10, R11, R12, R15, R16, R20 all append to `public/assets/data/dictionary.json`,
  `src/app/app.routes.ts`, `src/app/app.config.ts` (icons) and `tab-chips.component.ts` — one screen run at a time.
- R9, R10 and R11 all touch `src/app/pages/bookings/**` — sequential.
- Any plan of the Modules program still open on `chore/modules-staging` that edits the same hot files (Step 0
  lists them): never live together with a run of this program.

## Human gates

- **G1 (before saving R0):** the new invariant INV-7 and ADR 0033 (approved in direction, D11). The Planner shows Dandan the two texts;
  he answers in the Planner session with the words the gate needs (`docs/brain/decisions/0017-*`). INV-1 `Touches`
  only grows (`preserves`).
- **D8 (before `rs-0`):** `chore/modules-staging` is merged into `main`. The Planner checks; Dandan merges.
- **G-DEPS (answered, D10; checked in Step 0):** `qrcode`, `ics` and `promptfoo` fit and are used; `agenda` does not fit and C-JOBS uses its fallback (delta 6). The Planner checks each against the code before a plan names it; one that does not fit is replaced by its fallback (brief A2) and reported. Any other new dependency needs Dandan's `ok`.
- **G-AWAKE (not a gate — a condition of real use):** the scheduler runs only while the server is awake. Local
  development needs nothing. Production needs the uptime ping of `docs/security-go-live.md` (open as H4 in the
  ledger) or a paid instance.
- **G-WA (before `rs-wa`):** Dandan creates the developer app at Meta, takes its test number, adds his private
  phone as an allowed recipient, and sets `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` and
  `PUBLIC_BASE_URL`. Never register a personal number as the business number. Note for pricing later: since
  2026-10-01 free-form replies inside the 24-hour window are charged per message after a monthly free allowance;
  the cost lines of the older documents are out of date.
- **G-KEY (before a real customer uses the assistant):** a paid model key. The free tier's terms let the provider
  use submitted content and ask not to send personal data to it; a guest conversation is personal data. Internal
  tests in the simulator with invented guests need no decision.
- Dandan merges each run branch. Every plan's `[human]` Done-when.

## Rule changes this program makes (R0 writes them)

- `docs/frontdesk/assistant-behaviour-rules.md` **R-06** loses its last sentence ("In Wave 1 the assistant never
  says a booking is confirmed") and reads: "…may be sent only when the server wrote it in the same turn. A table
  is confirmed only by the engine and the hold (INV-7)."
- `docs/frontdesk/frontdesk-map.md` rule 6 ("no channel confirms a table in Wave 1") gains: "except through the
  table engine when the business has `tables` and confirm mode `auto` (Restaurant program)."
- `assistant.level` value `2` stays reserved and unused: automatic confirmation is the business's confirm mode,
  not an assistant level.
- FD-06's `conversations.channel: 'whatsapp'` becomes `'sim' | 'whatsapp'`; `REQUEST_CHANNELS` gains `sim`.

## Reality Check deltas

Step 0 ran on 2026-11-22 against `origin/main` `28359b6d`. One line per seed of brief Part 3, in the brief's order.

D8 — the other program: ok. `chore/modules-staging` was merged into `main` as PR #611 (`ff0f7831`) and the branch is
deleted on the remote, so there is no diff to list and no open Modules plan on a side branch.

Profile, requests, bookings
- `front-desk-profile.schema.ts` (strict, `requestKinds`, rules, `assistant.level` 0 | 1 | 2, `PROFILE_SERVER_FIELDS`,
  no capacity field): ok — `hours` is `operatingHoursRowSchema[]` and `closedDates` (≤ 100) exists.
- `front-desk-templates.ts`, restaurant kind `table`: ok (lines 47–58).
- `booking.schema.ts` (kinds, statuses, sources, server fields, `endAt === startAt + durationMinutes`): ok — `clientId`
  is required (`min(1)`) and `guestName` is `nameField` (may be empty) (delta 3).
- `server/routes/bookings.js` (102 lines, `GET /day`, `PUT /:id/status`, `MOVES`, no create route): ok — both routes
  carry `requireModule('frontdesk')` since plan 616 (delta 2).
- `server/routes/requests.js` (411 lines, booking only in `POST /:id/approve`, `bookingOutcome`, test requests,
  `writeDecision`, `MOVES`, `OPEN`): ok — every route carries `requireModule('frontdesk')`.
- `request.schema.ts` (`REQUEST_CHANNELS`, `wanted`, `suggested`, `conversationId`, `test`): ok — `REQUEST_VIA` is
  `member | guest | ai | server`.
- `server/routes/public.js` (198 lines; `GET /:slug`, `POST /:slug/requests`, the token read, cancel; no availability
  read): ok — there is also `GET /health`. `publicLimiter` is 20 writes / 15 min per IP + slug and counts no read.
- `request-create.js`, `public-profile.js`, `request-expiry.js`: ok.
- `local-time.ts`, `qualify.ts` (`qualify`, `hoursCheck`, `parseReason`), `phone.ts`: ok — `hoursCheck` answers a
  yes / no for one time and does not expose the day's opening ranges; with no checkable row it answers
  `{ ok: true, unchecked: true }` (delta 5).
- `client.schema.ts` (`CLIENT_KINDS`, `counters`, `waId`, `doNotContact`, reserved tags): ok. `upsertClientByPhone`
  lives in `server/utils/client-upsert.js`.

Modules, permissions, registries
- `modules-pure.ts` (5 keys, 4 defaults, `MODULE_OF_TYPE` with 7 types), `modules.ts` `.max(5)`: ok.
- `permissions.js` (`manageRequests` any member, `editFrontDesk` owner only, `OWNER_ONLY_TYPES`): ok.
- `collections.js` (flags, `requests` and `bookings` are `routerWrites`): ok — the file now has 28 rows (the Modules
  collections and `notifications` are in); `server/test/collections.test.js` asserts the exact `ROUTER_WRITE_TYPES`
  list and that a `backup` row is also `userData` (delta 1).

AI and messaging
- `gemini-client.js` `callGemini`, a call without a known `usage.feature` throws under vitest: ok.
  `ai-features.js` has `frontdesk_turn`, `frontdesk_suggest`, `voice_transcribe` (23 keys in all).
- `knowledge.js` `publicFacts(db, businessId)`: ok.
- No conversation, message, webhook or WhatsApp code: ok.
- No scheduler; `purge-deleted.js` and `retention.js` are lazy: ok — the server's database library is `mongoose`
  `^8.9.2` (its own MongoDB driver 6.20); `server/package.json` has no `mongodb` dependency (delta 6).

Browser
- `bookings.page.ts` (143 lines, views `day | week`): ok — the page has no `components/` folder yet.
- `pages/requests`, `pages/frontdesk/frontdesk-settings`, `frontdesk-onboarding`, `pages/public-request`: ok.
- `tab-chips`, group `frontdesk` with five chips, each with `modules: [...]`: ok.
- `@angular/cdk` `^19.2.19`, no canvas library: ok.
- `server/scripts/seed-demo-business.js` seeds a catering business: ok.

Open plans checked for overlap (Step 0.4): 471 (exports), 542 (MCP), 581 (metadata card), 631 (still `Status: draft`
on `main` though merged), 373 (design, venues). Shared files: 581 appends to `dictionary.json`,
`docs/brain/component-families.md` and the `breadcrumbs.md` files, like every screen plan here (append-only, never
live together with a screen run); 373 lists `server/test/**` (new test files only on both sides); 542 edits
`package.json` and `pnpm-lock.yaml`, as 667 and 670 do (`qrcode`, `ics`) — never live together with those two.

### Deltas that override the brief

1. **R0 touches three more places.** Deleting a business removes its Modules rows in `server/services/business.js`
   (the loop over collection names, lines 113–123): the five new collections are added there.
   `server/test/collections.test.js` asserts `ROUTER_WRITE_TYPES` as an exact list, so R0 updates it with the four
   new router-written types. The platform dialog reads `MODULE_KEYS` itself, so it lists the sixth module once the
   key and its dictionary name exist.
2. **The table routes carry two gates.** Every route of `server/routes/bookings.js` already has
   `requireModule('frontdesk')`. The routes C-BOOK2 adds carry `requireModule('tables')` as well; `GET /day` and
   `PUT /:id/status` keep the `frontdesk` gate only and add the table behaviour when the business has `tables`.
3. **A walk-in with no guest details still needs a client id.** `bookingSchema.clientId` is required. A walk-in sent
   without `guest` is stored with `clientId: '__walk_in__'` (the precedent is `__test__` in `requests.js`),
   `guestName: ''`, `guestPhone: ''`; no client is created and no counter moves. Screens show the dictionary label
   for a walk-in when the name is empty.
4. **The table settings are not filled on read.** The profile is read and written through the generic API (there is
   no profile router), so nothing can fill defaults on read. One pure helper, `tableServiceOf(profile)` in
   `shared/schemas/front-desk/table-service.ts`, returns the stored `tableService` over the defaults; the server and
   the browser both read the settings only through it. `PUT /api/v1/floor-plan/confirm-mode` writes the one field.
5. **The engine needs the day's opening ranges.** `hoursCheck` cannot list them. R1 adds an exported pure
   `openRangesOf(hours, date)` beside `hoursCheck` in `shared/schemas/front-desk/qualify.ts` (and `hoursCheck` uses
   it, so there is one reading of the hours). A profile with no usable hours row has no slots: `slotsFor` returns
   `[]` and `assign` answers `closed`.
6. **`agenda` does not fit (D10 fallback, reported).** `agenda` 6.2.8 has no database code of its own: it needs a
   second package, `@agendajs/mongo-backend`, which needs a `mongodb` driver dependency the server does not have
   (it uses `mongoose`). That is two more dependencies than D10 approved, so C-JOBS uses the fallback of brief A2:
   one in-process tick. `qrcode` 1.5.4 (MIT), `ics` 3.12.1 (ISC) and `promptfoo` 0.126.0 (MIT, dev only, needs
   Node ≥ 22.22) fit; `qrcode` and `ics` are browser dependencies (root `package.json`).
7. **Product defaults are on since the brief was written** (`_shared/product-defaults.md`): `empty-state-on-list`,
   `loading-and-error-states`, `app-list-container`, `one-breakpoint-set`, `anchored-popup`, `hints-in-tooltips`,
   `leave-and-return`. Every screen plan fills `## Defaults`.
8. **Folder maps.** A plan that adds a file under `server/`, `src/app/core/**`, `src/app/shared/` or
   `src/app/pages/` lists that folder's `breadcrumbs.md` in its scope (`docs/agent/plan-checks.md`).
9. **INV-6's glob `src/app/**/*ai*` also matches every file with "wait" in its name** (`waitlist-*`). R11 writes an
   `INV-6: preserves` line; it makes no model call.
11. **`conversations` and `messages` are server-only**, not readable through the generic API (the draft had
    `userData: true`): the conversations router already reads them, and a second read door for guest message text
    is not wanted. Nothing is added to `MODULE_OF_TYPE`, `staff-fields.ts` or the cross-business `BODY` for them;
    plan 675 writes their cross-business test on its own router. R0's own Done-when cannot be "GET
    `/api/v1/floor-plan` → 200" either (its routers are empty): the module gate is proven through
    `GET /api/v1/data/floorPlans`.
10. **Numbers 560–565 are retired**, not reused (`scripts/next-plan-number.mjs` only counts upward). Their work is in
    675–683, except 565 (conversation numbers on the dashboard), which stays in brief Part 6 "Later".

## Contracts (frozen 2026-11-22 — copy verbatim into every plan that uses them)

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

**C-TABLES (R0; used by R2, R5, R6, R7, R9, R11, R18)**
- Server: `requireModule('tables')` on `/api/v1/floor-plan/**`, `/api/v1/waitlist/**` and on the table routes of
  `/api/v1/bookings` named in C-BOOK2. `GET /api/v1/public/:slug/availability` answers 404 `NOT_FOUND` when the
  business has `tables` off. With `tables` off, `POST /requests/:id/approve` and the public request post behave
  exactly as today.
- Browser: route guard `moduleGuard(['tables'])` on `/frontdesk/floor-plan`; the floor view, the table settings
  card and the waiting list are hidden without the module. The platform dialog lists the sixth module with its
  dictionary name.

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

**C-TSERVICE (R0 schema, R5 screen; used by R1, R6, R7, R9, R14, R18)**
- `frontDeskProfile.tableService?: { confirmMode: 'auto' | 'manual' (default 'manual'), autoMaxParty: int 1–30
  (default 6), slotMinutes: 15 | 30 (default 15), turnMinutes: [{ maxParty: int, minutes: int 30–360 }] (1–6,
  ascending by maxParty), lastSeatingBeforeCloseMinutes: int 0–180 (default 60), bufferMinutes: int 0–30
  (default 0), holdMinutes: int 5–60 (default 15), autoNoShow: boolean (default false), reminderHour: 'HH:mm'
  (default '10:00'), cancellationCutoffHours: int 0–72 (default 3) }`. Owner-written through the existing profile
  write (the generic API). Nothing fills defaults on read: `tableServiceOf(profile)` in
  `shared/schemas/front-desk/table-service.ts` (pure, R0) returns the stored value over `TABLE_SERVICE_DEFAULTS`
  (default ladder: one step, `{ maxParty: 30, minutes: requestKinds.table.defaultDurationMinutes ?? 120 }`), and the
  server and the browser read the settings only through it (delta 4).
- `PUT /api/v1/floor-plan/confirm-mode { confirmMode }` (owner) changes only that one field — the one-button
  switch of D3, used by the settings card and the service screen.
- Party limits and lead times stay where they are: `requestKinds.table.rules`.

**C-ENGINE (R1; used by R6, R7, R8, R9, R10, R18)** — `shared/schemas/front-desk/table-engine.ts`, pure, built by
`build:schemas` for the server and imported by the browser through `@schemas`. No `Date.now()`, no database:
- Types: `Hold = { tableKey, startAt, endAt }` (epoch ms, `endAt` already includes the buffer),
  `Ask = { date, time, partySize, areaKey?, onlineOnly: boolean, now: number }`.
- `slotsFor(profile, date, now) → string[]` ('HH:mm'), `turnFor(service, partySize) → minutes`,
  `candidates(plan, partySize, areaKey?, onlineOnly) → Array<{ tableKeys, seats }>`,
  `assign(plan, profile, holds, ask) → { ok: true, tableKeys, startAt, endAt } | { ok: false, reason }` with
  `reason ∈ closed | too_late | too_soon | too_far | too_big | too_small | full | no_plan`,
  `alternatives(plan, profile, holdsByDate, ask) → Array<{ date, time }>` (≤ 3),
  `dayAvailability(plan, profile, holds, { date, partySize, areaKey?, onlineOnly, now }) → Array<{ time, available }>`.
- Order of candidates: fewest wasted seats (`seats.max − partySize`), then the asked area, then single tables before
  joins, then the table `number` — so the same question always gets the same answer.
- A table is busy when any of its holds overlaps `[startAt, endAt + bufferMinutes)`. A join is busy when any of its
  tables is.
- Hours come from `profile.hours` and `closedDates` through `openRangesOf(hours, date)`, a pure function R1 adds
  beside `hoursCheck` in `shared/schemas/front-desk/qualify.ts` (`hoursCheck` then uses it; delta 5); time through
  `jerusalemEpoch`. A slot whose turn would end after closing is still offered until
  `lastSeatingBeforeCloseMinutes`. A profile with no usable hours row has no slots (`assign` → `closed`).
- The settings come from `tableServiceOf(profile)` (C-TSERVICE), never from `profile.tableService` directly.

**C-HOLD (R6; used by R7, R9, R10, R11, R14, R18)**
- Collection `tableHolds` (server-only): one row per table per time cell —
  `{ _id, businessId, tableKey, cell: number, bookingId, test?: true }` where `cell` is the epoch of a
  `slotMinutes`-long step. Unique index `{ businessId: 1, tableKey: 1, cell: 1 }`; index `{ businessId, bookingId }`.
- `server/services/table-holds.js`: `claim(db, booking, tableKeys, startAt, endAtWithBuffer)` — one ordered
  `insertMany` of every cell of every table; a duplicate-key error deletes the rows this call inserted and returns
  `{ ok: false }`; `release(db, bookingId, fromEpoch?)` deletes the booking's rows (from a moment on, when a party
  leaves early); `holdsOf(db, businessId, fromEpoch, toEpoch) → Hold[]` for the engine.
- A booking of kind `table` in a business with `tables` on is written **only after** `claim` returned ok, and a
  failed booking write releases the claim. Moving a booking = claim the new cells, then release the old ones.
- This index is the only guard against a double booking (INV-7). No route checks by reading first and trusting it.

**C-BOOK2 (R0 fields, R6 routes; used by R7, R9, R10, R11, R14, R18)**
- `bookings` gains, all optional and server-written: `tableKeys: string[] (1–4)`, `areaKey`, `seatedAt`,
  `finishedAt`, `remindedAt`, `guestConfirmedAt`, `override: true` (a member chose the table against the engine),
  `test: true`. Statuses stay the five that exist. "Late" is computed (`status === 'confirmed' && now > startAt +
  holdMinutes`), never stored.
- A walk-in sent without `guest` is stored with `clientId: '__walk_in__'`, `guestName: ''`, `guestPhone: ''`; no
  client is created and no counter moves (delta 3).
- Routes in `server/routes/bookings.js`, all `requireModule('frontdesk')` and `requireModule('tables')` (delta 2;
  `GET /day` and `PUT /:id/status` keep the `frontdesk` gate only), action `manageRequests`:
  `GET /availability?date=&partySize=&area=` → `dayAvailability` for members (not `onlineOnly`);
  `POST /` `{ clientId | guest: { name, phone }, date, time, partySize, areaKey?, tableKeys?, notes? }` → source
  `phone`; without `tableKeys` the engine assigns, with them the claim decides (owner only → `override`);
  409 `NO_TABLE` with `alternatives`;
  `POST /walk-in` `{ partySize, tableKeys, guest? }` → a `seated` booking from now, source `walk_in`;
  `PUT /:id/tables` `{ tableKeys }`; `PUT /:id/when` `{ date?, time?, partySize? }` (re-assign through the engine
  unless `tableKeys` is sent); the existing `PUT /:id/status` also stamps `seatedAt` / `finishedAt` and releases the
  hold from now on `finished`, `cancelled`, `no_show`.
  `GET /day` also returns `holds` and the bookings with no `tableKeys` (A7).
- `POST /api/v1/requests/:id/approve` for kind `table` with `tables` on: assign (or the sent `tableKeys`), claim,
  then the existing claim-and-insert of the request; any failure releases the hold. 409 `NO_TABLE` with
  alternatives.
- A client is found or created through the existing `upsertClientByPhone`; counters as today.

**C-PUBAVAIL (R7; used by R8, R18)**
- `GET /api/v1/public/:slug/availability?date=&partySize=&area=` — no token; its own limiter (reads: 60 / 15 min
  per IP + slug); answers `{ slots: [{ time, available }], next?: { date, time } }` with `onlineOnly: true`; 404
  when the profile is not public or `tables` is off. It never returns a table, a name or a count.
- `POST /api/v1/public/:slug/requests`, kind `table`, `tables` on: the server runs `assign` (`onlineOnly`). When
  `confirmMode === 'auto'`, `partySize ≤ autoMaxParty`, `qualify` says `fit` and the claim succeeds → the request
  is created with status `approved` (history entry `via: 'server'`), the booking with source `request`, and the
  answer is `{ reference, token, confirmed: true, booking: { date, time, partySize } }`. In every other case the
  request is created as today and the answer has `confirmed: false`; when the time is taken the answer is 409
  `NO_TABLE` with `alternatives` and nothing is written.
- Guest page of an approved table request (`GET /:slug/requests/:token`) shows the booking; `POST …/cancel`
  cancels the booking too when `now < startAt − cancellationCutoffHours` (else 409 `TOO_LATE`);
  `POST …/confirm` stamps `guestConfirmedAt`.

**C-WAIT (R11)**
- Collection `waitlistEntries`: `{ ...baseDocShape, date, guestName, guestPhone, clientId?, partySize: int 1–30,
  areaKey?, quotedMinutes?: int, status: 'waiting' | 'notified' | 'seated' | 'left' | 'expired', joinedAt,
  notifiedAt?, bookingId?, test?: true }`. Index `{ businessId, date, status }`.
- `server/routes/waitlist.js` (`manageRequests`): `GET /?date=`, `POST /`, `PUT /:id/notify`, `PUT /:id/seat
  { tableKeys }` (creates the walk-in booking through C-BOOK2 and links it), `PUT /:id/left`.
- `notify` sends the template `waitlist_table_ready` through the client's open conversation when there is one and
  the client is not do-not-contact; otherwise it only stamps `notifiedAt`.

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
  `{ businessId, conversationId, at }` for the thread. Kept 12 months
  (`server/jobs/retention.js`).
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

**C-JOBS (R14; used by R21)**
- `server/jobs/scheduler.js`: `startScheduler(db, { now, every })` called from `server/index.js` after the
  listen; `runDue(db, now)` is exported and is what tests call. The tick is one `setInterval` of 60 s with
  `.unref()`, cleared on shutdown — `agenda` does not fit the code (delta 6: it needs two more dependencies).
  Not started when `process.env.VITEST`.
- Each job claims its work with a conditional update so two runs cannot both do it:
  `reminders` — bookings of today (Jerusalem), `status: 'confirmed'`, no `remindedAt`, business `reminderHour`
  passed, `tables` on → `sendOut` the reminder template through the client's conversation, stamp `remindedAt`;
  `no-show` — only where `autoNoShow` is on: `confirmed` and `now > startAt + holdMinutes` → `no_show`
  (`via: 'server'`), release the hold, bump the counter;
  `waitlist-expire` — `waiting | notified` entries of an earlier date → `expired`.
- A job never sends to a do-not-contact client, never for a `draft` / `suspended` profile (R-19), and logs counts
  only.

**C-AI (R17; used by R18, R19, R20)** — FD-07's contract as written in `docs/frontdesk/frontdesk-program-brief.md`
(the answer schema, levels, "the server writes, the model proposes"), with:
- `server/services/frontdesk-turn.js` → `runTurn(db, conversation, { log })` called by `handleInbound` and by the
  inbox's "suggest" button; one `callGemini` per turn with `usage.feature: 'frontdesk_turn'` (or
  `'frontdesk_suggest'`); level 0 stores `suggestion` on the conversation, level 1 sends through `sendOut`.
- The simulator is the test chat of R-15: a `test: true` conversation runs the real handler and is metered like
  any turn, but is left out of the business's daily turn cap.

**C-AIKEY (R17)**
- `server/services/ai-key.js` → `keyFor(businessId) → string` returns `process.env.GEMINI_API_KEY` today.
  `gemini-client.js` takes the key from it for calls that carry a `usage.businessId`. No field, screen or route
  for a business's own key is built (D5).

**C-AI2 (R18; used by R19)**
- The answer schema gains `intent` values `book | change | cancel` and `collected.table?: { date?, time?,
  partySize?, areaKey? }` (the model fills what the guest said; `date` and `time` are resolved by the model from
  the injected today's date, R-09, and validated by the server).
- For these intents the model's `reply` is dropped and the server answers:
  missing field → the dictionary question for that field;
  complete → `assign(onlineOnly)`: free → `fd_ai_offer` sentence + buttons `OK:<n>` / `OTHER`; not free →
  `fd_ai_alternatives` + up to three buttons `ALT:<n>`; the offer is kept in `conversation.pending`;
  `OK` → assign again → `auto` within `autoMaxParty`: claim, booking (source `ai`), template `booking_confirmed`;
  `manual` or over the limit: a `qualified` request (channel of the conversation) and `fd_ai_will_confirm`;
  a lost race → alternatives again.
  `change` / `cancel`: the guest's bookings with `endAt > now` by `clientId`; one → act through C-BOOK2 within the
  cutoff and answer with the fixed sentence; several → buttons; past the cutoff or none found → handoff.
- A model `reply` that contains a time (`\d{1,2}:\d{2}`), a table number or a word of the "confirmed" list is
  blocked and becomes a handoff (R-06). The fixed sentences come only from the dictionary.

## Planning cards

Each card: **Scope seed** (verify every path) · **Must cover** · **Done-when seeds** · **Traps**.

**R0 — register the program.**
Scope seed: the files of C-REGISTRY-R; `server/test/**` for the registry, collections, cross-business and invariant
tests; `src/app/core/services/module.service.ts` and its spec; the platform dialog's module list;
`public/assets/data/dictionary.json` (module name); `docs/restaurant/**`, `docs/frontdesk/**` (rule changes).
Must cover: every row of C-REGISTRY-R; existing businesses unchanged (a test with no `modules` field and one with
the four defaults); the whole existing suite green with only registry-listing assertions updated.
Done-when seeds: `[auto]` `pnpm run test:server` and `pnpm run test:ci` pass; `[auto]` a business with
`['frontdesk','tables']` gets 200 on `GET /api/v1/floor-plan` and one with `['tables']` alone gets 403 `MODULE_OFF`;
`[human]` Dandan reads ADR 0033 and INV-7.
Traps: `server/test/cross-business.test.js` fails for any new collection until its `BODY` has an entry (follow-up
D16); `modulesFieldSchema.max(5)`; the Modules program edits the same registries on its branch.

**R1 — the engine.**
Scope seed: `shared/schemas/front-desk/table-engine.ts` (+ `server/test/table-engine.test.js`, where `qualify.test.js` lives),
`shared/schemas/testing/**` fixtures, `docs/brain/component-families.md`.
Must cover: every function of C-ENGINE; fixtures — a 14-table room in three areas with two joins; a Friday with
short hours; the two daylight-saving days of the year; a party of 1, 2, 5, 9, 13; a full 20:00; buffer 0 and 15;
online-only tables; a closed date.
Done-when seeds: `[auto]` `server/test/table-engine.test.js` passes, and one browser spec imports the engine through `@schemas`; `[auto]` the same
`Ask` gives the same `tableKeys` 100 times; no `Date.now` in the file (grep).
Traps: slot arithmetic in epoch, never in 'HH:mm' strings; a turn that crosses midnight; `hoursCheck` already
knows split days.

**R2 — floor plan data.**
Scope seed: `server/routes/floor-plan.js`, `server/test/floor-plan.test.js`, `shared/schemas/entities/floor-plan.schema.ts`,
`src/app/core/models/floor-plan.model.ts`, `src/app/core/services/floor-plan-data.service.ts` (+ spec).
Must cover: C-FLOOR's refusals, each with a test; staff read, owner write; the `{ plan: null }` first read.
Done-when seeds: `[auto]` server tests; `[auto]` a staff token gets 403 on `PUT`.
Traps: `TABLE_IN_USE` needs `bookings.tableKeys`, which no route writes before R6 — test it with a seeded booking.

**R3 — the floor map and the editor.**
Scope seed: `src/app/shared/floor-map/**` (new family), `src/app/pages/frontdesk/floor-plan/**`,
`src/app/app.routes.ts`, `tab-chips.component.ts` (+ spec), `app.config.ts` (icons), dictionary,
`docs/brain/component-families.md`, `e2e/ui/<NNN>-*.spec.ts`.
Must cover: RS-02's editor list except joins and the phone arrows (R4); grid snapping; number uniqueness shown in
the panel; the unsaved-changes guard; the empty state with the three default areas; every table has a
`data-testid` with its `number`.
Done-when seeds: `[ui]` add three tables, drag one, rename it, save, reload — the plan is the same; `[human]`
Dandan draws a real 15-table room on a laptop in under ten minutes.
Traps: `cdkDrag` positions are pixels — convert to cells on drop and store only cells; RTL flips the x axis:
decide once (store `x` from the inline start) and test it; no `.c-*` engine classes in component SCSS.

**R4 — joins, and the editor on a phone.**
Must cover: select several → join → seat range and online switch; a join listed and removable; arrow buttons move
the selected table one cell; the side panel as a bottom sheet under 768 px.
Done-when seeds: `[ui]` at 375 px add a table, move it with the arrows, save; `[human]` Dandan edits on his phone.

**R5 — table settings and the confirm switch.**
Scope seed: `src/app/pages/frontdesk/frontdesk-settings/components/table-service-card/**`, the settings page,
`server/routes/floor-plan.js` (`PUT /confirm-mode`) + test, dictionary.
Must cover: every field of C-TSERVICE with its limits; the ladder editor (add / remove a step, ascending); defaults
shown when nothing is stored; the switch saved by its own call; a QR code of the booking page beside the public
link, printable (`qrcode`, D10).
Done-when seeds: `[ui]` flip the switch, reload, it stayed; `[auto]` a staff token gets 403.

**R6 — bookings hold tables.**
Scope seed: `server/services/table-holds.js`, `server/routes/bookings.js`, `server/routes/requests.js` (approve),
`server/test/table-holds.test.js`, `server/test/bookings-tables.test.js`, `server/test/invariants.test.js` (INV-7),
`src/app/core/services/booking-data.service.ts` (+ spec), `src/app/core/models/booking.model.ts`.
Must cover: C-HOLD and C-BOOK2 in full; twenty concurrent creates for one table and one time → exactly one
booking and no orphan hold; a failed booking write leaves no hold; move, change, finish early; approve with
`tables` off unchanged (the existing approve tests stay green untouched).
Done-when seeds: `[auto]` the concurrency test; `[auto]` INV-7 test; `[auto]` log-query.
Traps: no transaction — order is claim, write, and release on failure; cells depend on `slotMinutes`: a business
that changes it later must not break old holds (store `cell` as an epoch and derive nothing from the count).

**R7 — guests and free times.**
Scope seed: `server/routes/public.js`, `server/utils/request-create.js`, `server/middleware/rate-limit*`,
`shared/schemas/public/public-request.schema.ts`, `server/test/public-availability.test.js`.
Must cover: C-PUBAVAIL; auto and manual mode; over `autoMaxParty`; taken time → 409 and nothing written; guest
cancel inside and after the cutoff; the response never carries a table key.
Done-when seeds: `[auto]` server tests; `[auto]` 61 availability reads from one IP → 429.
Traps: `createRequest` qualifies first — keep one path; a `test: true` request never auto-confirms into a real hold
unless it came from the simulator (C-TESTDATA).

**R8 — the guest page.**
Scope seed: `src/app/pages/public-request/**`, dictionary, `e2e/ui/<NNN>-*.spec.ts`.
Must cover: RS-05 "Public page"; the page for a business without `tables` is exactly today's page;
"add to calendar" on a confirmed booking (`ics`, D10).
Done-when seeds: `[ui]` book a free time and read "confirmed"; `[ui]` a full evening shows the next free time;
`[human]` Dandan books from his phone.

**R9 — the service screen.**
Scope seed: `src/app/pages/bookings/**` (new `components/floor-view/**`, `table-sheet/**`), `app-floor-map`
(states), dictionary, icons, e2e. `Track: design` if the Planner judges the look is most of the work.
Must cover: RS-06 except the dialogs and lists of R10; the six states with their rule; the time strip; polling and
refresh on focus; the mode switch visible to the owner only; staff can seat and finish.
Done-when seeds: `[ui]` seat a booking from its table, finish it, the table turns free; `[human]` Dandan runs a
mock evening of ten bookings on a tablet.
Traps: "now" comes from the server's answer, not the device clock; never colour-only states (icon or label too).

**R10 — phone booking, walk-in, the two lists.**
Must cover: the dialog of RS-06 with `app-client-picker`; alternatives as chips; owner override; walk-in from a
free table and from a button; "arriving next" (next 90 minutes) and "not assigned" with an assign action.
Done-when seeds: `[ui]` a phone booking lands on the table the dialog showed; `[ui]` a staff user has no override.

**R11 — the waiting list.**
Scope seed: `server/routes/waitlist.js` + test, `src/app/pages/bookings/components/waitlist-drawer/**`,
`src/app/core/services/waitlist-data.service.ts`.
Must cover: C-WAIT; the "fits this table" pointer when a table frees; seat → walk-in booking linked to the entry.
Done-when seeds: `[ui]` add a party, seat it, the entry is `seated` and the table is taken.

**R12 — the demo restaurant.**
Scope seed: `server/scripts/seed-demo-business.js` or a sibling `seed-demo-restaurant.js` (local only, dry run by
default, idempotent — the same rules), `server/services/front-desk-setup.js` (checklist step), dictionary.
Must cover: a restaurant business with a 14-table plan in three areas and two joins, table settings, a public
profile, 40 bookings over seven days with holds made through `claim`, four waiting-list entries, six clients.
Done-when seeds: `[auto]` the script twice → the second run inserts nothing; `[human]` Dandan opens the demo
restaurant and shows the floor at 20:00.

**R13 — conversations on the server.**
Scope seed: `server/services/inbound.js`, `outbound.js`, `channels/**`, `server/routes/conversations.js`,
`server/routes/sim.js`, `shared/schemas/front-desk/message-templates.ts`, tests for each, `server/jobs/retention.js`.
Must cover: C-CONV, C-CHANNEL, C-TEMPLATES, C-TESTDATA (server side); R-01, R-02, R-03, R-12, R-19 each with a
test; idempotency on the provider id; free text refused outside the window.
Done-when seeds: `[auto]` two inbound messages 2 s apart produce one turn call (faked clock); `[auto]` a
do-not-contact client gets no outbound row; `[auto]` grep: no `'whatsapp'` string outside the allowed files.
Traps: R-03's wait must not hold the HTTP request of the simulator open for six seconds in tests — inject the
delay; logs carry no text and no phone.

**R14 — the scheduler.**
Must cover: C-JOBS; each job run twice does its work once; the reminder's Confirm and Cancel buttons through
`handleInbound`; `autoNoShow` off does nothing but the screen's late flag still shows.
Done-when seeds: `[auto]` `runDue` at 09:59 sends nothing and at 10:00 sends one reminder per booking; `[auto]`
no interval is alive in the test process.
Traps: `.unref()` and the shutdown path in `server/index.js`; "today" in Jerusalem, not UTC.

**R15 — the inbox.** Scope seed: `src/app/pages/inbox/**`, routes, chips, the pending badge of the `frontdesk`
group, a new `chat-thread` family shared with R16. Must cover: RS-08 "The inbox"; the reply box offers only
templates outside the window. Done-when seeds: `[ui]` take over, reply, hand back; `[human]` Dandan answers a
simulator guest from his phone.

**R16 — the simulator.** Scope seed: `src/app/pages/frontdesk/simulator/**`, the `chat-thread` family.
Must cover: RS-08 "The simulator"; the banner "test — nothing is sent"; clear test data with a confirmation.
Done-when seeds: `[ui]` write as a guest, see the business's reply; `[ui]` jump the clock, the reminder appears
with two buttons, tap Cancel, the booking is cancelled.

**R17 — the assistant's turn.** Scope seed: `server/services/frontdesk-turn.js`, `frontdesk-prompt.js`,
`ai-key.js`, `server/routes/ai/**` (the internal turn route), tests with the model faked.
Must cover: C-AI, C-AIKEY; R-04…R-11, R-16, R-18, R-20 each with a server test; the handoff rules of FD-07; the
daily cap from the ledger. Done-when seeds: `[auto]` a faked model answer that names a price not in `usedFacts`
is blocked; `[auto]` a failed model call sends nothing and moves the conversation to `human` (R-04).
Traps: one model call a turn; the prompt is English, guest text only in the `user` part; an L — split server
core / guardrails if the card does not fit.

**R18 — tables by chat.** Must cover: C-AI2; every branch of book / change / cancel; both confirm modes; the lost
race; the button ids. Done-when seeds: `[auto]` in the simulator transport, "שולחן ל-4 מחר ב-8 בערב" → offer →
`OK` → a booking with `tableKeys` and source `ai`; `[auto]` the model's own reply with "20:00" in it is blocked.

**R19 — eval and suggestion.** Must cover: the 30 dialogues of RS-11 as data files; the runner (dependency or
script — `promptfoo`, D10); `request.suggested` and the agreement row of FD-07 for manual mode. Done-when seeds: `[auto]`
the runner passes on a faked model; `[human]` Dandan runs it once on the real chain and reads the score.

**R20 — suggest and fix.** Must cover: level 0 "suggest a reply" in the inbox; R-14's "fix this answer" creating a
draft knowledge item. Done-when seeds: `[ui]` a suggestion is edited and sent.

**R21 — real WhatsApp.** Scope seed: `server/services/channels/whatsapp-channel.js`,
`server/routes/webhooks-whatsapp.js`, `server/app.js` (raw body for that route only), `render.yaml`,
`docs/security-go-live.md`. Must cover: RS-12; HMAC accept and reject tests; nothing changes for a business on the
simulator; the owner alert with R-17. Done-when seeds: `[auto]` a bad signature gets 401; `[human]` Dandan writes
from his private phone to the test number, books a table and gets the confirmation.

## Contract extensions (Step 2, waves 3–5 — found while drafting plans 675–683, 687, 689, 2026-11-22)

Each line is already written into the plan that owns it; where a line and a Contract above disagree, the line wins.

- 675 · C-CONV · `handleInbound` takes an optional `actor` and answers `{ ok, conversationId, messageId, duplicate?,
  settled }`; `registerButton` and `setTurnHandler` in `inbound.js` are how 676, 679 and 680 plug in; a new
  conversation starts `bot`; an inbound to a closed conversation opens a new one.
- 675 · C-CHANNEL · `channelFor` returns `{ send, real, clientSource }` (a transport describes itself; nothing
  branches on the channel name); `sendOut` answers `{ ok, message }` or `{ ok: false, reason }`; more than three
  buttons become one numbered text; `POST /sim/inbound` answers 409 `REAL_CLIENT` for a real client's phone.
- 675 · C-TEMPLATES · each template has a `bodyKey` (`tpl_*`); the server stores `template: { name, params }` and no
  body; the ten Hebrew values are added by 677. `booking_cancelled(name, date, time)`,
  `request_received / approved / declined(name)`.
- 675 · C-TESTDATA · a simulator client has source `manual`, kind `lead` and tag `test` (no `test` field on
  clients); the delete also removes clients tagged `test`; 678 hides them in the browser's lists and exports.
- 687 · C-CONV · the six member routes, their answer shapes, `test=1` to list test conversations, `peek=1` to read
  a thread without clearing `unread`; a member's reply takes the conversation over; closed conversations are
  removed by retention.
- 676 · C-JOBS · four jobs (reminders, no-show, waiting-list expiry, orphan holds — a hold whose booking is missing
  on two ticks in a row); `moveBookingStatus` in `table-bookings.js` is the one status move; a booking with no
  conversation, or a refused send, is stamped and not retried; test bookings are left out; `POST /sim/clock`
  answers `{ job, done, reason? }` and is built here; the `waitlist_table_ready` send is built here (C-WAIT:
  `notify` answers `sent`).
- 676 · C-JOBS · the eight details in one line: (1) `moveBookingStatus(db, { businessId, id, status, by, byName, via,
  note?, now })` answers `{ ok, booking }` or `{ ok: false, code }`; (2) the orphan sweep needs two ticks in a row;
  (3) the reminder buttons carry the booking's `publicToken`; (4) Confirm answers once with `booking_confirmed`,
  Cancel inside the cutoff cancels with `booking_cancelled`, otherwise the conversation goes `human`; (5) no
  conversation or a refused send is stamped and counted; (6) test bookings are left out of every job; (7) `POST
  /sim/clock` answers `{ job, done, reason? }`; (8) `PUT /waitlist/:id/notify` answers the entry plus `sent`.
- 679 · C-AI · `runTurn(db, conversation, { log, mode, now })`, `mode: 'turn' | 'suggest'`; the one model call is
  `askTurnModel` in `server/routes/ai/frontdesk.js` (INV-6); `POST /api/v1/ai/frontdesk/suggest`; every failure is
  silent (R-04 wins over FD-07); the daily cap counts today's `frontdesk_turn` rows (300), test turns carry
  `usage.userId: 'sim'`; `fixedText(key, params)` in `server/utils/fixed-text.js` is the only source of fixed
  sentences; at level 0 no request is written.
- 689 · C-AI · the order of the guardrail checks; a removal request (R-02) is matched by fixed phrases before any
  model call, answered once, and sets do-not-contact; `conversation.lowTurns`.
- 680 · C-AI2 · a time in the model's reply passes only when the same `HH:mm` stands in a fact it used; `ALT:<n>`
  books at once, `BK:<n>` picks one of several bookings; offers expire after 30 minutes; `changeWhen` and
  `cancelByGuest` in `table-bookings.js`; more than three future bookings is a handoff.
- 681 · G-DEPS · `promptfoo` is not used: the eval is a script in the pattern of `ai-eval-recipes.js` (the
  dialogues are judged by what the server wrote, which needs the pipeline and a database in one process). The set
  is 20 restaurant, 5 caterer, 5 private chef. `turnAnswerSchema` gains optional `suggested`.
- 682 · C-AI · `POST /api/v1/ai/frontdesk/fix { conversationId, messageId, answer, issue }` → `{ item, drafted }`.
- 683 · RS-12 · the webhook path is `/api/v1/webhooks/whatsapp`, mounted before the JSON parser with a raw body;
  routing: the receiving `phone_number_id`, then the sender's open `whatsapp` conversation, else dropped; a ninth
  template `owner_request_waiting(business, kind, reference)`; `ownerAlertedAt?` on a request and a conversation;
  `profile.whatsapp` is set by the operator script `server/scripts/set-front-desk-whatsapp.js`; gate G-WA also
  needs the nine templates created at the provider and the Graph API version confirmed (the payload shapes in the
  plan are from memory, not checked against the provider's reference).

## Contract extensions (Step 2 — found while drafting plans 662–674, 2026-11-22)

Each line is already written into the plan that owns it; where a line and a Contract above disagree, the line wins.

- 662 · C-FLOOR · the key pattern `^[a-z0-9]{6,12}$` covers table, area and join keys, `areaKey` and `tableKeys`.
- 662 · C-REGISTRY-R · the browser's API path map (`http-storage.adapter.ts`) is not a registry of this program:
  each plan appends its own entry (664 `floorPlan`, 673 `waitlist`, 675 `conversations` and `sim`).
- 663 · C-ENGINE · exports `windowsOf(profile, date)` (the service windows of a date, used by tests) and adds exported
  `jerusalemDateTime(epoch)` to `local-time.ts`; `openRangesOf` returns
  `{ open, close, overnight }[]`; a slot belongs to the calendar date its start falls on, and a closed date closes
  its whole service day; the asked area is a preference, never a filter; `alternatives` looks at most 14 dates ahead.
- 664 · C-FLOOR · cross-field checks live in the pure `shared/schemas/front-desk/floor-plan-check.ts`
  (`checkFloorPlan`, nine issue codes; `emptyFloorPlan(names)` → a 24 × 16 grid, area names are plain text passed by
  the caller); 400 `BAD_FLOOR_PLAN { issues }`; 409 `TABLE_IN_USE` rows carry `_id, date, time, partySize,
  tableKeys` only; 409 `PLAN_CHANGED` when two first saves collide; a booking on a join blocks the save when no
  join with the same table set remains; two later saves: the last one wins.
- 667 · C-TSERVICE · `PUT /floor-plan/confirm-mode` answers `{ confirmMode }`, stores the whole settings object
  over the defaults, and answers 404 `NO_PROFILE`; the browser call is `FrontDeskProfileDataService.setConfirmMode`.
- 668 · C-HOLD · a cell is always 15 minutes (never `slotMinutes`, so a later change of slot length cannot hide
  old holds); `move()` beside `claim()`; `release` and `holdsOf` take `businessId`; one booking service,
  `server/services/table-bookings.js` (`reserveTable`, `bookTable`, `countBooking`, `createWalkIn`), is the only
  caller of `claim`.
- 668 · C-BOOK2 · `GET /day` returns `holds`, `unassigned` and `now` (server epoch ms); `PUT /:id/when` only for a
  `confirmed` booking, `PUT /:id/tables` for `confirmed` or `seated`; any member picks the table of a walk-in or a
  move, only the owner on a phone booking, a change of time or an approve; `override` is set when the chosen set is
  not an engine candidate.
- 669 · C-PUBAVAIL · `GET /:slug` gains `tableBooking: { areas: [{ key, name }] }`; `publicRequestSchema` gains
  optional `areaKey`; only the engine's `full` answers 409 `NO_TABLE`, any other refusal creates the request as
  today; a guest's cancel moves the booking and the request to `cancelled`; the guest view's `booking` gains
  `guestConfirmed` and `canCancel`; `next` is the first free slot in the following 14 days; an automatic
  confirmation writes no `decisionLog` row; a booking write that fails after the request was stored leaves the
  request `qualified`.
- 673 · C-WAIT · `notify` only stamps `notifiedAt` until plan 675 exists; `POST /` takes `date` from the browser
  and checks it is today in Jerusalem.
- 672 · RS-05 · a refused approve (409 `NO_TABLE`) on `/requests` opens a dialog with the alternatives and, for
  the owner, a table choice (Dandan, 2026-11-22).
- 676 · C-JOBS · gains a fourth job, `orphan-holds`: `tableHolds` rows older than 10 minutes whose `bookingId` has
  no booking are removed (a crash between the claim and the booking write; Dandan, 2026-11-22).
- every screen plan · the QA business has no `tables` module, so `[ui]` specs answer the business and the table
  routes themselves (the pattern of `e2e/ui/634-1.spec.ts`).

## Contract extensions (run)

(A run that has to change a frozen Contract writes one line here: plan · Contract · what changed · why.)

- 662 · C-FLOOR · `floor_plans_business_unique` is partial on `grid` being an object (as `frontdesk_business_unique`
  is on `slug`) · the existing `server/test/admin-business.test.js` seeds raw rows without a grid in every
  user-data collection, and every real floor plan has a grid, so the rule "one floor plan per business" is unchanged.
- 662 · C-TSERVICE · every field of `tableService` is optional in the schema · `tableServiceOf` fills a missing
  field from `TABLE_SERVICE_DEFAULTS`, so a profile may store only what the owner changed.
- 664 · C-FLOOR · issue codes are duplicate_area, duplicate_key, duplicate_number, area_missing, outside_grid, duplicate_join, join_table_missing, join_repeated_table, join_mixed_areas (`checkFloorPlan`); a booking holding several tables blocks a save unless a join of the new plan has exactly that set of tables; a first save lost to a concurrent one answers 409 `PLAN_CHANGED`; `emptyFloorPlan(names)` starts a 24 x 16 grid with one area per name.
- 667 · C-TSERVICE · `PUT /api/v1/floor-plan/confirm-mode` answers `{ confirmMode }`, writes the whole `tableService` over the defaults (`{ ...tableServiceOf(profile), confirmMode }`), and answers 404 `NO_PROFILE` when the business has no live profile.
- 668 · C-HOLD · `release(db, businessId, bookingId, fromEpoch?)` and `holdsOf(db, businessId, from, to, exceptBookingId?)`
  take `businessId` so every query is scoped; cells are always 15 minutes (`CELL_MS`); `holdsOf` returns one `Hold` per
  row; `move(db, booking, tableKeys, startAt, endAtWithBuffer)` inserts only the cells the booking does not hold and
  then deletes the rest; `rangesOf(rows)` merges touching cells for `GET /day`; `server/services/table-bookings.js`
  (`reserveTable`, `bookTable`, `rebookTable`, `countBooking`, `createWalkIn`) is the only code that turns an ask into
  a held table, and `GET /day` gains `now` beside `holds` and `unassigned` · one hold rule, scoped by business.
- 668 · C-BOOK2 · `createWalkIn(db, ctx, { partySize, tableKeys, guest?, name? })` takes `ctx` = `loadTableContext`
  plus `{ businessId, actor, now? }`; a `NO_TABLE` answer carries `reason` and `alternatives`; `PUT /:id/tables` answers
  `alternatives: []` · plan 673 seats a party through the same function.
- 669 · C-PUBAVAIL · (1) `GET /api/v1/public/:slug` gains `tableBooking: { areas: [{ key, name }] }` when the business has
  `tables` and its plan has an active, online table: the areas that have one, in plan `order`. (2) `publicRequestSchema`
  gains optional `areaKey` (`^[a-z0-9]{6,12}$`), used for `assign`; a waiting request stores it as the answer
  `{ questionKey: 'seating', label: 'fd_q_seating', value: <area name> }`. (3) "The time is taken" means the engine
  answered `full` (409 `NO_TABLE` + `alternatives`); any other `ok: false` reason creates the request as today with
  `confirmed: false`. (4) A guest's cancel of a confirmed booking moves the booking and the request to `cancelled`
  (409 `TOO_LATE` after the cutoff). (5) Guest answers gain `booking.guestConfirmed` and `booking.canCancel`;
  `createRequest` takes `approvedBooking: { id, at }`.

- 675 · C-CONV / C-CHANNEL / C-TEMPLATES · nine details fixed while building: (1) `handleInbound` takes an optional `actor` and answers `{ ok, conversationId, messageId, duplicate?, settled }`; (2) a transport describes itself `{ send, real, clientSource }` (`sim`: false, `manual`), so no code outside `channels/` names a channel; `whatsapp` before 683 is a stand-in whose `send` fails; (3) the test rule lives in `sendOut`: a test conversation only on `real: false`, a real transport only for a `pilot` / `active` profile; (4) `registerButton(prefix, handler)` in `inbound.js`, 676 registers `CONFIRM` / `CANCEL`; (5) `setTurnHandler(fn)`, default sets `human`; (6) `sendOut` answers `{ ok, message }` or `{ ok: false, reason }`, reason in DO_NOT_CONTACT, WINDOW_CLOSED, NOT_LIVE, TEST_ONLY, BAD_TEMPLATE, SEND_FAILED; (7) more than three buttons become one numbered text, outside the window a button message is refused; (8) a template message is stored with `text: ''` and the screen renders the body from `bodyKey`; (9) `POST /sim/inbound` for a real client's phone answers 409 `REAL_CLIENT`.
- 687 · C-CONV (routes) · `GET /` answers `{ conversations, now }` with `client` and `last` (status open|bot|human|closed, `test=1`, `limit`, `before`); `GET /:id/messages` answers `{ conversation, messages, now }` (newest 200, `before` pages back, `peek=1` leaves `unread`); `POST /:id/messages` takes `{ text }` or `{ template }`, a reply takes a `bot` conversation over, refusals are 409 (reason), 400 `BAD_TEMPLATE`, 502 `SEND_FAILED`; takeover / release / close answer 409 `BAD_STATUS` when the move does not apply; retention deletes closed conversations 365 days past their last message with their messages · one read path for guest text.
- 677 · C-CONV (browser) · read from 675 and 687: a template message carries `text: ''`, so a list row's `last.text` is empty for it; the thread renders the body from `tpl_<name>` with `template.params` in the catalogue order; `GET /` rows carry `client` and `last`; the linked booking is read in the browser with the generic `GET /data/bookings/:id`, the request from `RequestDataService`.
- 678 · C-CHANNEL (browser) · the simulator reads a thread with `GET /conversations/:id/messages?peek=1` (`ConversationDataService.open(id, { peek: true })`), so the business's `unread` stays; test clients (tag `test`) are left out of the clients list, the client picker and the clients CSV by `ClientDataService.realClients_`, test bookings out of the bookings CSV.
- 679 · C-AI / C-AIKEY · six details fixed while building: (1) the one model call of the assistant is `askTurnModel` in `server/routes/ai/frontdesk.js` (INV-6); `frontdesk-turn.js` calls it and never `callGemini`; the same file holds `POST /api/v1/ai/frontdesk/suggest`; (2) fixed Hebrew sentences leave the server through `fixedText(key, params)` / `reasonText(reason)` (`server/utils/fixed-text.js`) over `general` of the shipped dictionary; (3) every failure is silent (R-04), also an exhausted model chain: the conversation goes to `human`, nothing is sent; (4) the daily cap is 300 `frontdesk_turn` ledger rows of the Jerusalem day without `userId: 'sim'`; a test conversation is metered with `userId: 'sim'`; (5) level 2 behaves as level 1; (6) `frontdesk-turn.js` registers itself with `setTurnHandler(runTurn)` and `routes/ai/frontdesk.js` requires it, so `app.js` and `inbound.js` are untouched; `createRequest`'s input gains an optional `test`.
- 689 · C-AI · four lines fixed while building: (1) the checks run in this order and the first that fails decides: before the model call — removal, keywords, active hours, the eight-turn limit (`preCheck`); after it — the model's flag, low content twice, R-18, then the reply checks R-20, R-07, R-05, R-06, the unsupported price; (2) the three checks that need no model answer run before the call, so a complaint costs no model call; (3) a blocked reply is never rewritten or retried: it becomes a handoff (one model call a turn); at level 0 the handoff sentence is stored as the suggestion and the status stays `bot`; (4) in `mode: 'suggest'` the pre-call checks and the turn counters are skipped, the reply checks still run, and a blocked draft answers 200 with the handoff sentence as the suggestion. A removal phrase (R-02) is answered once with `fd_ai_removed`, sets the client's `doNotContact` (`via: 'guest'`) and moves the conversation to `human`; `conversation.lowTurns` (1) remembers one empty turn.
- 680 · C-AI2 · seven details fixed while building: (1) a time in the model's reply passes only when the same `HH:mm` stands in a fact line whose id is in `usedFacts`, any other time (`unsupported_time`) and every table number (`table_number`) is blocked, only when table service is on; (2) `OK`, `ALT`, `OTHER` and `BK` are buttons registered with `registerButton`, handled with no model call, and `OK:<n>` / `ALT:<n>` / `BK:<n>` carry the index into `pending.data.offers` / `pending.data.bookingIds`; (3) a tapped alternative is a confirmation of that time (`ALT:<n>` goes straight to the booking step); (4) `closed`, `too_soon`, `too_far`, `too_late` answer a fixed sentence asking for another time, `too_big` and `too_small` hand off, `no_plan` (or no `tables`) treats the intent as a table `request` as in plan 679; (5) at level 0 and in suggest mode the server's sentence is stored as the suggestion with no buttons, `pending` is not written and no table is touched (change and cancel hand off); (6) fixed sentences are sent with `author: 'server'` and do not count toward the eight-turn limit; (7) up to three bookings are offered as `BK:<n>` buttons, more than three is a handoff · the model only extracts; the engine, the booking service and the dictionary answer.
- 681 · C-AI · the answer schema gains optional `suggested: { action, text? }` (loose: a wrong value is dropped, never fails the turn); the server stores `request.suggested` only for `approve` / `decline` / `ask`, the text on one line and cut to 600, on every request the assistant creates (plan 679's request path and the table dialogue's `manual` / over-the-limit branch, carried on `pending.data.suggested` until `OK`); `runTurn` takes `feature: 'eval'` for the hand-run eval only · the eval set is 20 restaurant / 5 catering / 5 private chef dialogues (only a restaurant has tables) in `server/eval/frontdesk/`, played by `server/scripts/ai-eval-frontdesk.js` · `promptfoo` not used (D10 fallback).
- 733 · C-AI · R-04 superseded in part: a technical failure sends one holding message (R-22); a test conversation is answered as level 1 (R-23) · the Human's decisions of 2026-11-25
- 751 · C-AI / C-AI2 · (1) a date the model left out is filled by the server before the engine and the request path (R-24, `fillWhen`); (2) plan 680's point 1 is superseded: a time in a sent reply passes when it stands, as `HH:mm`, in any fact line or in the hours row's open / close (R-25); `frontdesk.turn.blocked` carries the counts `times`, `unmatched`, `usedFacts`, `unknownFacts` for `unsupported_time` · the Human's simulator tests of 2026-11-25/26
- 752 · C-RUNS (new) · every assistant run is one `assistantRuns` document (13 fixed step keys, outcome, reason, 30-day TTL) written by `frontdesk-runs.js`; read through `/api/v1/assistant-runs` with `editFrontDesk`; logs still carry no guest text · the Human's request of 2026-11-26
- 753 · C-CONV / C-AI / C-RUNS · (1) a conversation carries the lease run { id, since, until, chain, waiting } while a run works on it (frontdesk-lease.js; R-26); (2) a guest message during a live lease is noted and answered by one follow-up run (followsRunId, at most 3 in a row, then follow_up_limit); (3) take over and a member's reply remove the lease, and the run re-checks after the model call: outcomes dropped (taken_over, closed, lease_lost) and superseded (overtaken) (R-27); (4) the prompt answers every unanswered guest message, data block UNANSWERED (R-28); (5) nextStep in inbound.js is the one place that decides run / wait / leave · the Human's simulator tests of 2026-11-25/26
