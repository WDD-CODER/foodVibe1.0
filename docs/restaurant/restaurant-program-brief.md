# Brief — write and run the Restaurant program Plan Contracts (FoodVibe 1.0)

You are the Planner (main folder, on `main`). Your job in this session: check this brief against the code as it is
today, turn it into a complete, ordered set of saved Plan Contracts, and hand Dandan the list of `/orchestrate` runs.
Plans only — no app code.

Written 2026-11-21 by the claude.ai Architect, read against `origin/main`
`ed369adc38b87d19433a91cd4c1f8cae37a113ea` (2026-11-21 10:45). The plan map with the draft Contracts is
`docs/restaurant/restaurant-map.md`. Order of authority when two texts disagree:
**map Contracts > Part 0.5 of this brief > the rest of this brief.**

The code and the workflow kit are both changing while this brief is written, and a second program
(`origin/chore/modules-staging`, about 147 commits ahead of `main`) is not merged yet. Nothing here is true until
Step 0 (Reality Check) says so. Workflow commands are named, never copied: the source of truth for how a run starts
and behaves is `.claude/commands/orchestrate.md` and `docs/agent/orchestrator.md` as they are on `main` when you run.

This program **replaces rows 18–23 (560–565) of `docs/frontdesk/frontdesk-map.md`** (Wave 1b) and brings forward the
table parts of `docs/frontdesk/reference-bookings-engine.md` (Wave 2). Step 1 updates that map so one place says so.

---

## Part 0 — Product direction (decided with Dandan, 2026-11-21)

**What exists (verified in code, see Reality Check seeds).** A restaurant today gets a public request page with table
questions, a request queue where a person approves or declines, a day / week list of bookings with status moves, the
client CRM, the knowledge base and the business report. Nothing checks capacity: two guests can be approved for the
same table at the same time. There is no picture of the room, no walk-in, no phone booking, no waiting list, no
reminder, no conversation channel and no assistant. The kitchen side (products, suppliers, recipes, costs) is complete.

**The direction.** Dandan starts a one-to-two-month pilot with three kinds of business at once: a private chef, a
caterer and a restaurant. The restaurant must get a whole product, so everything that is missing for it is closed
now, in one program:

1. **The room** — the owner draws the place: tables with a number, a shape and seats, in areas, moved by dragging.
2. **The engine** — code decides whether a party fits at a time, on which table, and what to offer instead.
3. **The service screen** — the host runs the evening on the drawing of the room.
4. **The waiting list** — who waits, who is told, who is seated.
5. **The conversation channel** — messages in and out, first through a simulator that behaves like WhatsApp.
6. **The assistant** — answers guests and takes, changes and cancels table bookings through the engine.

**The rule behind all of it (already how the app works).** The model only understands text and phrases answers. It
never decides whether a table is free, never states a time the engine did not return, and never writes. Availability,
table assignment, alternatives and every status are code.

**Not in this program:** deposits and card holds, Reserve with Google, SMS, marketing broadcasts, a consumer discovery
app, POS and payment for meals, table-side ordering, walls and decoration on the floor plan, business verification at
Meta, a key per business for the model (only the seam is built), covers forecast for the kitchen.

---

## Part 0.5 — Decisions (Dandan, 2026-11-21) — these override anything below

| # | Decision | Effect on the plans |
| --- | --- | --- |
| D1 | The restaurant is completed now, as one program, so pilot talks this week can show something built. | The first three waves (room, engine, bookings on the engine, service screen) are the demo; they run first. |
| D2 | The floor plan is a working sketch, not an exact drawing: tables with numbers and chairs next to them, laid out like the real place, and everything can be moved, changed and renumbered. | RS-02. No walls, no decoration, no free rotation in the first version. |
| D3 | A table can be confirmed automatically or only by the owner, and **the owner switches between the two with one button.** | `tableService.confirmMode: 'auto' \| 'manual'` (C-TSERVICE); RS-04, RS-05, RS-11. |
| D4 | The first stage is **internal testing**. A simulator inside the app must behave like WhatsApp, with no connection to WhatsApp. Real WhatsApp tests, when they happen, use Dandan's private phone as the guest. | One pipeline, two transports (C-CHANNEL). The simulator is built first and is the test surface of every messaging and assistant plan. The real transport is the last, optional run. |
| D5 | The assistant runs on Dandan's own model key for now; later the businesses move to keys of their own. | One function resolves the key for a business (C-AIKEY). Nothing else is built for per-business keys. |
| D6 | Deposits and credit-card connection are deferred. | Out of scope; no money field is added by this program. |
| D7 | The program is built on its own staging branch that starts from `main`, apart from `chore/modules-staging`. | Part 4. |
| D8 | **`chore/modules-staging` merges into `main` before this program starts.** | Step 0 checks that it is merged and stops if it is not. Every Reality Check seed is re-verified on the merged `main`: the seeds below were read before that merge and several will have moved. |
| D9 | The floor plan is drawn with ordinary page elements (SVG or positioned elements) and `@angular/cdk/drag-drop`, which is already installed. No canvas library. | RS-02. Every table is an element the screen checks (`[ui]`, styleqa) can find and the theme can colour. Rotation is 0° / 90°, size follows the seat count. |
| D10 | Four new dependencies are approved: `agenda` (job scheduler on MongoDB), `qrcode`, `ics`, `promptfoo` (dev only). | C-JOBS runs on `agenda`; the guest's confirmation page offers "add to calendar" (`ics`); the owner gets a QR code of his booking page to print (`qrcode`); the eval set runs on `promptfoo`. Before a plan names one, the Planner checks the package against the code (licence, still maintained, works with Node 22 and the MongoDB driver in `server/package.json`); one that does not fit is replaced by its fallback and reported. Any other new dependency still needs Dandan's `ok`. |
| D11 | The rule "only the engine decides availability" becomes an invariant (INV-7) with ADR 0033. | Gate G1 stays: Dandan types the approval words in the Planner session, as `docs/brain/decisions/0017-*` requires. |

**Defaults the Architect took (Dandan may overturn any of them in one line; each is marked `(default)` where used).**

| # | Default | Why |
| --- | --- | --- |
| A1 | (became decision D9) | |
| A2 | (became decision D10) Fallbacks, used only when an approved package does not fit: `agenda` → one in-process tick; `qrcode` → no QR; `ics` → no "add to calendar"; `promptfoo` → an eval script in the pattern of `server/scripts/ai-eval-recipes.js`. Not needed at all: a date library (`shared/schemas/front-desk/local-time.ts` already does Jerusalem time) and a phone library (`shared/schemas/phone.ts` exists). | |
| A3 | Table service is its own module key, `tables`, off by default, needing `frontdesk`. Conversations, the simulator and the assistant stay under `frontdesk`. | A caterer with Front Desk must not see a floor plan; unfinished parts must not reach a customer who was not given them. |
| A4 | A guest who is late is **flagged** after `holdMinutes`; turning the booking into a no-show by itself is a separate switch, off by default. | A host who forgot to tap "seated" must not lose the table on the screen. |
| A5 | A table that has future bookings cannot be deleted; it can be switched to not active. | No booking may point at a table that is gone (INV-3). |
| A6 | Everything created through the simulator is marked `test: true`, is left out of every number and report, does take tables (that is what is being tested), and is removed by one "clear test data" action. | R-15, R-19. |
| A7 | Bookings that exist before `tables` is switched on have no table. The engine ignores them and the service screen lists them as "not assigned" until a person assigns them. | No migration guesses a table. |
| A8 | The assistant's table answers are fixed Hebrew sentences from the dictionary with buttons; the model only extracts what the guest wants. | One model call a turn, and no sentence about availability the engine did not produce. |

---

## Part 1 — How to run this session

### Step 0 — Reality Check (first, before any plan is saved)

1. `git fetch origin`. Read: `AGENTS.md`, `.claude/commands/plan.md`, `.claude/references/prd-template.md`,
   `.claude/skills/save-plan/SKILL.md`, `.claude/commands/orchestrate.md`, `docs/agent/orchestrator.md`,
   `docs/agent/plan-checks.md`, `docs/agent/model-routing.md`, `docs/brain/invariants.md`,
   `docs/brain/decisions/0017-*`, `0023-*`, `0030-*`, `0031-*`, `0032-*`, `docs/brain/gotchas.md`,
   `docs/agent/standards-backend.md`, `standards-security.md`, `standards-angular.md`, `standards-domain.md`,
   `standards-reuse.md`, `docs/brain/component-families.md`, `docs/frontdesk/frontdesk-map.md` (the Contracts this
   program builds on: C-GUEST, C-CLIENT, C-PROFILE, C-REQUEST, C-ACTOR, C-AIUSAGE),
   `docs/frontdesk/frontdesk-program-brief.md` sections FD-06 and FD-07, `docs/frontdesk/assistant-behaviour-rules.md`
   (R-01…R-21), `docs/frontdesk/reference-bookings-engine.md` sections 4, 5, 7, 8 and 11,
   `docs/modules/modules-map.md` (C-MODULES, C-AICAP, C-LEARN, C-AIDRAFT, C-FILES, C-VOICE and the format to repeat).
2. Re-verify **every line** of "Reality Check seeds" (Part 3) against live `origin/main`. Print one line per seed:
   `ok` or `changed: <what it is now>`.
3. **The other program (D8).** Dandan decided that `chore/modules-staging` merges into `main` first. Check it:
   `git rev-list --count origin/main..origin/chore/modules-staging` must print `0`. If it does not, stop and tell
   Dandan — do not save a plan on a `main` that the other program is about to change. Once it is merged, the
   Modules collections, routes, module rules and screens are part of what this program builds on: read
   `docs/modules/modules-map.md` "Reality Check deltas" and the run reports under `docs/orchestrator/runs/mod-*`.
4. Check the open plans under `plans/` and `plans/design/` for scope overlap (seen open: 471, 542, 581, 654, 655,
   656 and the modules plans 623–653 that live on the staging branch), and the highest ADR, migration and plan
   numbers (seen before the merge of D8: ADR 0032, migration 0012, highest plan 656).
5. Write the result into `docs/restaurant/restaurant-map.md` under "Reality Check deltas", and fix every Contract and
   map row a change touches.
6. A change that contradicts a decision in Part 0.5 is a question to Dandan, asked once, with choices and a
   recommendation. Any other change you fix yourself and list. Do not ask about things the code answers.

### Step 1 — Numbers and Contracts

Assign plan numbers to the map rows with `node scripts/next-plan-number.mjs` and write them into the map table (the
rows are `R0`…`R21` until then; after this step reference plans by NNN only). Decide whether the numbers 560–565
reserved in `docs/frontdesk/frontdesk-map.md` are reused or retired, and write one paragraph there that points at
this program. Freeze the Contracts section. The map is then the plan of record.

### Step 2 — Write the plans

One `/plan` + `save-plan` per map row, in dependency order, from that row's **planning card** in the map (scope
seed, must-cover list, Done-when seeds, traps). A card is a seed: verify every path and symbol before it goes into a
plan. Every plan: PRD template shape, `Depends-on:`, a parsed `## Read-Write Scope` with its test locations and the
folder maps it changes, `## Architecture Impact`, `## Reuse Check`, tagged Done-when (`[auto]` / `[ui]` / `[human]`),
the plan-checks `[auto] log-query` item, dictionary keys named, Lucide icons named, stories from the owner's, the
host's or the guest's side. A plan that adds a collection follows `standards-backend.md` §3. A plan whose main work
is look and layout is `Track: design` in `plans/design/`. Sizes in the map are estimates: split an `L` when the
card does not fit one Worker session.

If a card cannot become a plan without a product decision, put the decision in `## Critical Questions` with choices
and a recommendation, and collect **all** such questions of the whole program into one message to Dandan — he wants
one stop, not twenty.

Because each run must not stop, every `[auto]` check works with no secret and no outside service: the model, the
clock, the scheduler tick and the outbound channel are faked in tests. The simulator channel (C-CHANNEL) is the
fake of the outbound channel in every screen check.

### Step 3 — Runs

Dry-run first, as `/orchestrate` does. Print the list of runs from Part 4, corrected by
`node scripts/plan-order.mjs` on the saved plans, and say which may run side by side. Dandan starts them and merges
each run branch himself.

---

## Part 2 — Cross-cutting rules (apply to every plan)

1. **Evolve, do not duplicate.** `requests`, `bookings`, `clients`, `frontDeskProfiles`, `knowledgeItems`,
   `qualify`, `publicFacts`, the public router, the request claim pattern and the usage ledger exist. Each plan
   extends the existing piece and names it. No `guests`, `bookingProfiles` or `messageLog` collection (the reference
   document's names are not this code's names).
2. **The engine decides, the model never does (new invariant INV-7, gate G1).** No route confirms, moves or offers a
   table unless `shared/schemas/front-desk/table-engine.ts` returned it in the same request. One implementation,
   used by the server and by the browser.
3. **Two bookings never hold the same table at the same time.** This is enforced by a unique index (C-HOLD), not by
   reading and then writing.
4. **One door per kind of write.** Guests write only through `server/routes/public.js` and the inbound handler of a
   channel (ADR 0030, INV-1). Bookings are written only by `server/routes/bookings.js` and the approve path of
   `server/routes/requests.js`; the generic API stays read-only for them.
5. **Server time, Jerusalem.** Every slot, turn, reminder hour and cutoff is computed on the server with
   `jerusalemEpoch` / `weekdayOf`. The browser never sends an epoch for a slot; it sends `date` and `time`.
6. **One conversation pipeline, two transports.** Nothing above the transport knows whether a message came from the
   simulator or from WhatsApp. The simulator is never a second code path with its own rules.
7. **Test data never leaks.** Anything marked `test: true` is excluded from stats, reports, exports, learning and
   client counters, and never causes a message to a real phone (R-15, R-19).
8. **Assistant rules R-01…R-21 hold.** Each plan that touches messaging or the assistant quotes the rules it
   implements in Done-when, each with a server test. R-06 is rewritten by this program (map, "Rule changes").
9. **Every model call is metered and capped** (`feature` key from `server/constants/ai-features.js`; C-AIUSAGE,
   C-AICAP) and goes through `server/services/gemini-client.js` (INV-6). Prompts are English, written from scratch;
   guest text goes into the `user` part only; Hebrew appears only as data.
10. **Module gates are on the server.** A route of table service answers 403 `MODULE_OFF` when `tables` is off; the
    public availability read answers as if the feature did not exist. Hiding a link is never the gate.
11. **Tenant and permissions unchanged in spirit.** Every new document carries `baseDocShape`, is scoped through
    `server/utils/business-scope.js`, validated by Zod in `shared/schemas` (INV-4) and authorised through
    `permissions.js`. New collections are never cloneable. The floor plan and the table settings are owner-only;
    running the service (seat, finish, walk-in, waiting list, replying in the inbox) is any member.
12. **Privacy.** A guest's name, phone and message text never go into logs — counts, ids and sizes only. Guest
    conversations feed learning only after name and phone are removed (pilot terms 7.2); this program adds no
    learning from conversations.
13. **Hebrew RTL, dictionary only.** Strings through `translatePipe` + `dictionary.json` (append-only); canonical
    values are English keys; Lucide icons registered in `app.config.ts`; logical CSS only. Screens follow the one
    breakpoint set of plan 656 once it is merged (phone ≤ 767, tablet ≤ 1023, desktop ≥ 1024).
14. **Reuse first** (`docs/agent/standards-reuse.md`, `docs/brain/component-families.md`): `app-page-header`,
    `app-list-shell`, `app-empty-state`, `app-modal-shell`, `ConfirmModalService`, `app-custom-select`,
    `app-counter`, `app-date-field`, `app-time-field`, `app-hours-editor`, `app-client-picker`,
    `BaseEntityDataService`, `.c-*` engines. The floor map and the chat thread are new families (rung 4 + `why:`).
    Every new screen is a lazy route.
15. **No unasked UX.** Build only what the plan's UI notes say. No extra confirmation dialogs.
16. **Free-tier reality.** The server may sleep; the scheduler runs only while it is awake (gate G-AWAKE). The model
    chain is the free one. One guest turn = one model call. No websocket: screens refresh by polling and on focus.
17. **Parallel-safe by construction.** After wave 0 a plan never edits a shared registry file (C-REGISTRY-R and the
    "must not run at the same time" list). If a plan finds it must, it stops and offers `approved: <path>`.
18. **No other product is named** in code, comments, dictionary texts or documents of the app.

---

## Part 3 — Product specs

### Reality Check seeds (seen at `ed369adc`; re-verify every line in Step 0)

Profile, requests, bookings
- `shared/schemas/entities/front-desk-profile.schema.ts`: `frontDeskProfileSchema` is strict. `requestKinds` is a
  partial record of `requestKindConfigSchema` (`enabled`, `questions`, `rules` with `minPartySize`, `maxPartySize`,
  `minLeadHours`, `maxLeadDays`, `minBudgetPerGuest`, `areas`; `defaultDurationMinutes`; `expireAfterHours`).
  `assistant.level` is `0 | 1 | 2`. `status`, `whatsapp`, `adminHistory` are server-owned (`PROFILE_SERVER_FIELDS`).
  There is no capacity, slot or turn field.
- `shared/schemas/front-desk-templates.ts`, restaurant: kind `table` with questions date, time, `party_size`,
  `seating` (choice: inside, outside, bar), `occasion`; rules `maxPartySize: 12`, `minLeadHours: 2`,
  `maxLeadDays: 60`; `defaultDurationMinutes: 120`; `expireAfterHours: 4`.
- `shared/schemas/entities/booking.schema.ts`: kinds `table | tasting | consultation`; statuses
  `confirmed | seated | finished | no_show | cancelled`; sources `request | phone | walk_in | whatsapp | google | ai`
  (only `request` is written today); server fields `status, statusHistory, source, startAt, endAt, publicToken`;
  `endAt === startAt + durationMinutes`. No table field.
- `server/routes/bookings.js` (102 lines): `GET /day` (bookings + `coversByHour`), `PUT /:id/status` with
  `MOVES = { confirmed: [seated, no_show, cancelled], seated: [finished, cancelled] }`, `no_show` refused before
  `startAt`, `counters.noShows` bumped. No create route.
- `server/routes/requests.js` (411 lines): a booking is created only in `POST /:id/approve` (`bookingOutcome`), with
  the claim → insert → undo pattern and no transaction; a `test: true` request is only marked approved; decisions go
  through `writeDecision`. Status moves `MOVES`, `OPEN = [new, qualified, needs_info]`.
- `shared/schemas/entities/request.schema.ts`: `REQUEST_CHANNELS = [manual, public_form, whatsapp]`; `wanted`
  (`date`, `time`, `partySize`, …); `suggested`; `conversationId`; `test`.
- `server/routes/public.js`: `GET /:slug`, `POST /:slug/requests` (`publicLimiter`, `honeypot`, `createRequest`),
  `GET /:slug/requests/:token`, `POST /:slug/requests/:token/cancel`. No availability read.
- `server/utils/request-create.js` (`createRequest`, `runQualify`), `server/utils/public-profile.js`
  (`loadPublicProfile`, `isPublic`, `publicView`), `server/utils/request-expiry.js` (`expireDue`, lazy).
- `shared/schemas/front-desk/local-time.ts` (`jerusalemEpoch`, `weekdayOf`), `shared/schemas/front-desk/qualify.ts`
  (`qualify`, `hoursCheck`, `parseReason`), `shared/schemas/phone.ts`.
- `shared/schemas/entities/client.schema.ts`: `CLIENT_KINDS = [diner, event_client, lead]`, `counters`, `waId`,
  `doNotContact`, reserved tags `vip`, `allergy`, `repeat_no_show`.

Modules, permissions, registries
- `shared/schemas/modules-pure.ts`: `MODULE_KEYS` (5 keys), `DEFAULT_MODULES` (4), `MODULE_OF_TYPE`;
  `shared/schemas/modules.ts`: `modulesFieldSchema` has `.max(5)`.
- `server/utils/permissions.js`: `ACTIONS` includes `manageRequests` (any member); `OWNER_ONLY_ACTIONS` includes
  `editFrontDesk`; `OWNER_ONLY_TYPES = clients, frontDeskProfiles, knowledgeItems, invoices, diagnoses`.
- `server/constants/collections.js`: one row per collection with `userData, cloneable, backup, searchable,
  softDelete, routerWrites`; `requests` and `bookings` are `routerWrites: true`.

AI and messaging
- `server/services/gemini-client.js`: `callGemini({ body, timeoutMs, log, eventPrefix, needsVision, needsMedia,
  model, usage })`; a call without a known `usage.feature` throws under vitest.
  `server/constants/ai-features.js` already has `frontdesk_turn`, `frontdesk_suggest`, `voice_transcribe`.
- `server/services/knowledge.js`: `publicFacts(db, businessId)`.
- There is no conversation, message, webhook or WhatsApp code: no `conversations` / `messages` collection, no
  `server/routes/conversations.js`, no `server/routes/webhooks-whatsapp.js`, no `/inbox` route.
- There is no scheduler: `server/index.js` starts nothing periodic; `server/jobs/purge-deleted.js` and
  `server/jobs/retention.js` run lazily on reads.

Browser
- `src/app/pages/bookings/bookings.page.ts` (143 lines): views `day | week`, a list grouped by time, status buttons.
- `src/app/pages/requests/` with `request-card`, `day-load-strip`, `new-request-dialog`, `ask-dialog`,
  `decline-dialog`; `src/app/pages/frontdesk/frontdesk-settings/` with `request-kind-card`, `data-export-card`;
  `src/app/pages/frontdesk/frontdesk-onboarding/` (the test request, `test: true`);
  `src/app/pages/public-request/` (the guest page and its status page).
- `src/app/core/components/tab-chips/`: group `frontdesk` with chips `/requests`, `/bookings`, `/clients`,
  `/frontdesk/knowledge`, `/frontdesk/settings`.
- `@angular/cdk` `^19.2.19` is installed (Angular 19.2). No canvas or drawing library is installed.
- `server/scripts/seed-demo-business.js` seeds one demo **catering** business, local only.

### RS-01 — Table service as a module

A sixth module key, `tables`: floor plan, engine, service screen, waiting list. It needs `frontdesk`
(`modulesOf` drops it otherwise, the way `event_logistics` needs `events`). It is not in `DEFAULT_MODULES`: existing
businesses change nothing; the platform admin switches it on for a restaurant. The platform dialog, the module
service, the route guard and the chip row learn the key. A business with `tables` off behaves exactly as today:
requests are approved by hand and nothing reads the engine.

### RS-02 — The room: floor plan

**Owner story.** "I open the floor plan, add my tables, give each its number and how many people sit there, drag
them to where they stand, mark what is inside, outside and at the bar, and save. Next month I add two tables on the
terrace and move table 7."

- One floor plan per business (`floorPlans`, C-FLOOR): areas, tables, joins.
- A table: number as the staff call it (text, unique in the plan), shape `round | square | rect`, seats `min`–`max`,
  area, place on a grid (whole cells), turned 0° or 90°, **active** (takes bookings) and **online** (guests may book
  it themselves).
- A join: two to four tables the owner declares can be pushed together, with its own seat range and online switch.
  The engine never invents a join.
- Editor `/frontdesk/floor-plan` (owner): add a table from presets (2, 4, 6, 8 seats, bar seat), drag with snapping
  to the grid, tap a table to edit it in a side panel (bottom sheet on a phone), duplicate, delete, manage areas,
  select several tables and join them. On a phone a selected table can also be moved with arrow buttons.
  One save for the whole plan; the existing unsaved-changes guard; overlap is a warning, never a block.
- One shared read-only renderer `app-floor-map` draws the plan for the editor, the service screen and the phone
  booking dialog (inputs: plan, a state per table, the selected keys; output: table tapped).
- Deleting a table that has future bookings is refused with the list (A5).

### RS-03 — The engine: is there a table, which one, and what else

Pure functions in `shared/schemas/front-desk/table-engine.ts` (C-ENGINE), no database, no clock of their own:

- `slotsFor(profile, date)` — the bookable start times of a day: opening hours minus closed dates, in steps of
  `slotMinutes`, minus `lastSeatingBeforeCloseMinutes`, minus what `minLeadHours` / `maxLeadDays` forbid.
- `turnFor(service, partySize)` — how long the party keeps the table (the ladder; default from the profile's
  `defaultDurationMinutes`).
- `candidates(plan, partySize, areaKey?, onlineOnly)` — single tables whose seat range fits, then declared joins;
  ordered by the fewest wasted seats, the preferred area first.
- `assign(plan, service, holds, { date, time, partySize, areaKey?, onlineOnly })` → `{ ok: true, tableKeys, startAt,
  endAt }` or `{ ok: false, reason }` (`closed | too_late | too_soon | too_far | too_big | full`).
- `alternatives(...)` — up to three nearest free start times the same day within ±90 minutes, then the same time on
  the next two open days.
- `dayAvailability(...)` — every slot of the day with `available: boolean`, for the public page and the dialogs.

Rules: a table is taken from `startAt` to `endAt + bufferMinutes`; a party never gets a table smaller than it or a
join that was not declared; a guest booking online gets only online tables; a member may override (C-BOOK2).
Tests with fixtures: hours, a daylight-saving day, the ladder, joins, buffer, a full evening, alternatives.

### RS-04 — Table settings and the one-button confirm mode

A card on `/frontdesk/settings`, shown when `tables` is on (C-TSERVICE): **confirm mode as one switch** — "a free
table is confirmed at once" / "I approve every booking" (D3) — plus the largest party confirmed automatically, slot
length (15 or 30 minutes), the turn ladder, last seating before closing, buffer between parties, hold minutes for a
late guest, the automatic no-show switch (A4, off), the reminder hour and the cancellation cutoff. Stored on the
profile as `tableService`. The owner changes the mode from the service screen too (one tap, with the mode always
visible there). Next to the public link the settings page shows a QR code of the booking page, to print (D10).

### RS-05 — Bookings on the engine

**Server (C-BOOK2, C-HOLD).** A booking of kind `table` in a business with `tables` on carries `tableKeys`. New
routes in `server/routes/bookings.js`: create by a member (phone booking), walk-in (seated at once), assign or move
tables, change date / time / party, availability for members, and the day read gains the plan's holds. Approving a
table request (`requests.js`) goes through `assign` and answers 409 with alternatives when nothing fits; the owner
may then override on a table of his choice. Status moves gain `late` as a flag (not a status), `seatedAt`,
`finishedAt`. Finishing or cancelling frees the table from that moment.

**Guests (C-PUBAVAIL).** `GET /api/v1/public/:slug/availability?date=&partySize=&area=` returns the day's slots.
`POST /:slug/requests` for kind `table`: with confirm mode `auto`, a party within the limit and a free table, the
server creates the request already approved and its booking in the same call and answers `confirmed`; otherwise the
request waits for the owner as today, and the answer says so. The guest page of a booking (by token) lets the guest
cancel before the cutoff and confirm arrival.

**Public page.** For kind `table` with the module on: date → party size → time chips from the availability read
(taken times dimmed, the nearest free time offered when a day is full) → area preference → name and phone. The done
page says "confirmed" or "waiting for the restaurant", with the manage link and, for a confirmed booking, "add to
calendar" (D10).

### RS-06 — The service screen

**Host story.** "It is 19:40. I look at the room: who sits where, which table is about to be needed, who is late.
A couple walks in — I tap a free table and seat them. The phone rings — I open a new booking, the screen offers
table 12 at 21:00, I save."

`/bookings` gains a third view, **floor**, beside day and week:

- The room drawn by `app-floor-map`, each table in one of the states free / reserved soon / seated / over time /
  late guest / not active, with the party name and time on it.
- A time strip to look at the room at another hour of the day.
- Summary pills: covers booked, seated, waiting, no-shows; the confirm-mode switch (owner).
- Tap a table → sheet with what is on it now and next, and the actions that fit: seat the arriving booking, seat a
  walk-in, finish, move to another table, cancel, open the client.
- "Arriving next" list and "not assigned" list (A7) beside the room (below it on a phone).
- New booking dialog (phone): client picker, date, party, time chips from the engine, the table it offers on a small
  map, alternatives; an owner may pick another table (`override`).
- Refresh by polling (30–60 s) and on focus. Phone and tablet first.

### RS-07 — The waiting list

`waitlistEntries` (C-WAIT): a host adds a party (name, phone, size, area preference, quoted minutes). States
`waiting → notified → seated | left | expired`. A drawer on the service screen: position, how long they wait,
"table is ready" (sends the message through the channel when the business has one, otherwise only marks it),
"seat" (opens the table choice and creates a seated walk-in booking), "left". When a table is freed the screen
points at the first waiting party that fits it. Guests joining by themselves through a QR code is a later row
(it opens a new door for guests to write, so it is not in this program).

### RS-08 — The conversation channel, and the simulator that behaves like WhatsApp

`conversations` and `messages` as in FD-06 (C-CONV), with `channel: 'sim' | 'whatsapp'`. One inbound handler does
everything a real inbound message needs: find the business and the client by phone (R-01), respect do-not-contact
(R-02), coalesce bursts (R-03), keep the 24-hour window, hand the turn to the assistant or leave it to a person
(`bot | human | closed`), send what was decided through the transport of the conversation (C-CHANNEL).

- **Templates** are a catalogue in code (C-TEMPLATES): booking confirmed, reminder with Confirm / Cancel buttons,
  booking cancelled, table is ready, request received / approved / declined, more information needed. Outside the
  24-hour window only a template may be sent — the simulator enforces this exactly like the real channel.
- **The simulator** `/frontdesk/simulator` (owner and platform admin): a phone-shaped chat. Pick or create a test
  guest (name and phone), write as that guest, tap the buttons the business sends, see delivery ticks, see the
  window clock, and "jump the clock" controls that run the reminder job for the test guest's booking. Everything
  is `test: true` (A6), with "clear test data".
- **The inbox** `/inbox`: conversations (unread first; held by the assistant, by me, by another member) → thread
  with the client chip, the linked request or booking card with its actions, a reply box, **Take over** / **Hand
  back**. On a phone: list → thread.

### RS-09 — Things that happen by themselves

One scheduler (C-JOBS) on `agenda` (D10), started by `server/index.js`, idempotent, every job safe to run twice and safe to miss:
flag late guests; optional automatic no-show (A4); the reminder at the business's hour for today's bookings, once,
through the channel, with Confirm / Cancel buttons whose taps move the booking (`via: 'guest'`); expire waiting-list
entries of yesterday; the existing lazy sweeps stay as they are. The tick is faked in tests. Production needs a
server that stays awake (gate G-AWAKE).

### RS-10 — The assistant, as specified, on the simulator

FD-07 as written — levels 0 and 1, one model call a turn, the JSON answer (`reply`, `intent`, `kind`, `collected`,
`missing`, `handoff`, `usedFacts`), the server validating and writing, the guardrails (handoff rules, 8 turns, the
keyword list, active hours, the daily cap from the usage ledger), the English prompt in
`server/services/frontdesk-prompt.js`, rules R-04…R-11, R-16, R-18, R-20, the test chat of R-15 (which is now the
simulator), "suggest a reply" in the inbox for level 0, the "fix this answer" loop of R-14 — built and tested
against the simulator channel. The key the call uses comes from one function (C-AIKEY, D5).

### RS-11 — The assistant books, changes and cancels a table

When the business has `tables`, the turn handler adds three intents on top of FD-07 (C-AI2, A8):

- **Book.** The model extracts date, time, party size and area. When something is missing the assistant asks for
  it. When all are there, **the server** runs `assign`: free → a fixed sentence with the time and party and the
  buttons Confirm / Another time; not free → a fixed sentence with up to three alternatives as buttons. On the
  guest's Confirm the server assigns again and, by confirm mode, creates the booking and sends the "confirmed"
  template (`auto`) or creates a qualified request and says the restaurant will confirm (`manual`).
- **Change / cancel.** The guest's upcoming bookings are found by phone. One booking → the server acts within the
  cutoff and answers with a fixed sentence; several → buttons to choose; after the cutoff → handoff to a person.
- The model's own `reply` is sent only for questions answered from `publicFacts`, for asking a missing detail and
  for small talk. A reply that names a time, a table or "confirmed" is blocked (R-06 as rewritten).
- Eval: 30 Hebrew dialogues, at least 12 about tables (book, full evening, change, cancel, late cutoff, a party
  over the limit, a closed day, a question in the middle of a booking), with the expected intent, collected
  fields, server action and handoff.

### RS-12 — Real WhatsApp, last and optional

The second transport: `server/services/channels/whatsapp-channel.js` (Meta Cloud API over HTTPS, no SDK) and the
signed webhook `server/routes/webhooks-whatsapp.js` (verify token on `GET`; `X-Hub-Signature-256` HMAC over the raw
body on `POST`; idempotent on the provider message id; answers 200 at once). It runs only when the three
`WHATSAPP_*` variables are set (they are already named in `render.yaml`). Internal tests use Meta's own test number
with Dandan's private phone on its allowed-recipients list — no business verification is needed for that (gate
G-WA). The owner-alert template (FD-06, R-17) rides this run.

---

## Part 4 — Rounds and runs

The program branch is `chore/restaurant-staging`, cut from `main` (D7). Every run branch starts from it and merges
back into it; Dandan checks by hand on it and merges it to `main` when a round is closed.

| Round | Runs | What Dandan can show after it |
| --- | --- | --- |
| 1 | `rs-0` (alone) | nothing yet: the foundation |
| 2 | `rs-engine`, then `rs-floor-ui` beside `rs-book-srv` | the owner draws the room; the engine answers |
| 3 | `rs-book-ui`, then `rs-demo` | **the restaurant demo**: public page with real free times, the service screen, walk-in, phone booking, waiting list, a seeded demo restaurant |
| 4 | `rs-conv-srv` (may run beside `rs-book-ui`), then `rs-conv-ui` | a guest conversation in the simulator, reminders, the inbox |
| 5 | `rs-ai` | **the assistant demo**: book, change and cancel a table by chat in the simulator |
| 6 | `rs-wa` (optional, after gate G-WA) | the same on a real phone |

One screen run at a time (they all append to the dictionary, the routes, the icons and the chip row). Server runs
may run beside a screen run when the map's "must not run at the same time" list allows it.

---

## Part 5 — Critical Questions

The Architect's four questions were answered by Dandan on 2026-11-21 and are decisions D8–D11 above. Nothing is
open from the brief. What remains for him:

- **Gate G1** — the approval words for INV-7 and ADR 0033, typed in the Planner session.
- Anything Step 0 or Step 2 adds, collected into **one** message with choices and a recommendation. Do not ask
  about A3–A8 unless the code makes one of them impossible.

---

## Part 6 — Later (do not plan now)

Guests joining the waiting list by QR and a position page · deposits, card hold and a cancellation fee through an
Israeli payment provider · Reserve with Google and the reservation link in the Google business profile · SMS when a
phone has no WhatsApp · a number per business through embedded signup, business verification, a paid model key and
a key per business · covers forecast for the kitchen and prep sheets by expected covers · server sections, turn-time
reports, table spend · walls, free rotation and several layouts (weekday / weekend) on the floor plan · voice notes
in conversations (R-13) · conversation numbers on the dashboard (565) · English on the guest page.
