# FoodVibe — "Front Door" Bookings Program Brief

Status: brief (not a plan) — the Planner splits this into `plans/NNN-*.plan.md` via `/plan` + `save-plan`
Author: Dandan (via Claude.ai), 2026-11-09
Audience: the FoodVibe Planner agent (Claude Code, main folder). Workers read only the plans derived from it.
Repo snapshot read for this brief: `origin/main` on 2026-11-09 (menuEvents pipeline, clients, business tenant, plans up to 538).

---

## 0. How to use this brief (Planner instructions)

1. Read sections 1–4 first (why, what, fit, data model). They are the product contract.
2. Section 10 is the proposed split into plans with `Depends-on` order. Run `/plan` on **one plan at a time**, starting with P0.
   Each plan must pass the normal gates (`scope-check --arch/--reuse/--deps/--tags`), the FoodVibe `plan-checks.md`, and the reuse ladder.
3. Section 12 lists the **Critical Questions**. Ask the Human the open ones before saving P0 — several of them are
   `INV-n · current rule · proposed change · who loses what` questions that need an explicit `approve arch change INV-n`.
4. Nothing here overrides `AGENTS.md`, `docs/brain/invariants.md` or `docs/agent/*`. Where this brief and the repo
   standards disagree, the repo standards win and the Planner notes the deviation in the plan's Execution Notes.
5. Growth-frozen files (`_shared/tech-stack.md`) stay frozen: `menu-intelligence.page.ts`, `cook-view.page.ts`, etc. All new
   logic lives in new services/components.
6. Keep the English/Hebrew split: canonical values (statuses, kinds, channels) are English keys; every UI string is a
   `dictionary.json` key under the `bookings.` namespace (section 6.6).

---

## 1. Why — the business case in one page

FoodVibe today is back-of-house: recipes, costing, inventory, suppliers, event pipeline (`menuEvents`: inquiry → quote → deposit →
ordering → execution → post-production → finished), clients, venues. Nobody outside the kitchen ever sees it, so every new
business must be sold one by one.

The reservations market research (Hebrew doc "תוכנית פעולה – מערכת הזמנות וניהול הושבה למסעדות", 2026-11-08) found:

- Israel has ~10,000 food businesses but only ~1,300–2,000 full-service restaurants use a reservation system (Ontopo ~1,200,
  Tabit Guest the rest). Ontopo charged ~$200/month in 2022; Tabit Guest is sold only bundled with its POS by quote.
- ~8,000 cafés, bars, neighbourhood restaurants, wineries, pop-ups, caterers and event businesses manage bookings by phone,
  WhatsApp and a notebook. They pay ₪99–149/month for Israeli ordering systems (Wisepage, Algora) — that is the price ceiling.
- 13% of bookings are no-shows; the Restaurateurs' Association recommends a ₪30–50/diner cancellation fee; deposits cut
  no-shows ~50%. 64% of Israeli bookings are already online; ~60% are same-day/next-day.
- Tabit's Reserve-with-Google pilot: >20% of online bookings came through Google. Nobody serves the small business there.
- No Israeli product does **walk-in waitlist** (the TablesReady / Waitly category).

**Strategy — Land & Expand.** A free-to-cheap, customer-facing booking "front door" is the acquisition wedge:

1. It is the only FoodVibe feature diners and event clients see. Every confirmation page and WhatsApp message carries
   "Powered by FoodVibe" → every business becomes a billboard to other owners.
2. It is used daily from day one ("stop the phone ringing"), unlike inventory, which needs a migration effort.
3. **The synergy nobody else has:** bookings feed the kitchen. Tomorrow's covers → prep sheets and purchasing;
   an event inquiry from the public page → a `menuEvents` document already in stage `inquiry`, with its `clients` record.
   Tabit does this only via POS at thousands of shekels; Ontopo does not do it at all.
4. Money comes from the kitchen modules and a Pro booking tier (deposits, Google, CRM), not from the free booking page.

Target customers (Human, 2026-11-09): restaurants, caterers, event businesses, and the food industry in general. The
module therefore has **two booking kinds** from day one:

| Kind | Who | What the public page does | What it creates in FoodVibe |
| --- | --- | --- | --- |
| `table` | restaurants, cafés, bars, wineries | pick date / time / party size → instant confirmation (or waitlist) | `bookings` document (new collection) |
| `event` | caterers, event businesses, private chefs, food trucks | event date, guest count, type, budget → inquiry | `menuEvents` in stage `inquiry` + `clients` record (existing pipeline) |

A business can enable one or both.

---

## 2. Product definition — what we build

Module name: **Bookings** (Hebrew UI: "הזמנות" — not to be confused with supplier orders "הזמנות ספקים"; use "הזמנת מקום" / "פניות"
in labels, see 6.6). Route prefix: `/bookings` (authenticated) and `/book/:slug` (public).

### 2.1 In scope (phased — see section 10)

| Phase | Capability | Serves |
| --- | --- | --- |
| P0 | Data model, permissions, ADR, business booking profile (slug, kinds enabled, hours, capacity, policies) | foundation |
| P1 | Owner settings screen `/bookings/settings` | owner |
| P2 | Public page `/book/:slug` (table + event inquiry), public API, confirmation page, "Powered by FoodVibe" | diner / client |
| P3 | Host screen `/bookings/today` — timeline, statuses, walk-ins, waitlist, table pulse timers; dashboard card | host / owner |
| P4 | WhatsApp Cloud API: confirmations, morning reminder with Confirm/Cancel buttons, waitlist "table ready", inbound webhook | diner |
| P5 | Smart waitlist: QR self-join, position page, flash waitlist on cancellation | diner / host |
| P6 | Kitchen link: covers forecast per service → dashboard + prep-sheets hook; event inquiry → pipeline (already in P2) | chef |
| P7 | Deposits / card-hold (J5) via an Israeli PSP, cancellation fee policy | owner (Pro) |
| P8 | AI hostess on WhatsApp (Gemini tools over the deterministic engine), guest-initiated only | diner (Pro) |
| P9 | Reserve with Google (Actions Center partner feed + booking server) | growth |

### 2.2 Out of scope (now)

- Consumer marketplace / discovery app (Ontopo's game). No cross-business search, ever, in this program.
- POS integration, table-side ordering, payments for meals.
- Native apps. Everything is the existing Angular PWA (`ngsw-config.json` already present).
- Floor-plan drag-and-drop editor (P3 uses a list/timeline, not a map; a map is a later design-track plan).
- SMS as a primary channel (fallback only, P4 decides provider).

### 2.3 Success criteria for the program (Human-level)

- [human] A café owner with no FoodVibe account can get a working booking link in under 15 minutes from signup.
- [human] A host runs a Thursday-night service from a phone or tablet without opening another tool.
- [auto] Every booking created through the public page is visible only to its business (cross-business test).
- [auto] Tomorrow's covers appear on the dashboard the moment a booking is confirmed.
- [human] A catering inquiry submitted on the public page shows up in `/menu-intelligence` as an `inquiry`-stage event with its client.

---

## 3. Fit with the current codebase — what exists, what we reuse, what is new

| Need | Already in FoodVibe | Decision |
| --- | --- | --- |
| Tenant / ownership | `businesses` collection, `businessId` on every doc, `scopeFilter`, `can/assertCan` (INV-1, INV-2) | Reuse as is. Bookings are business-scoped docs. |
| Owner vs staff | `OWNER_ONLY_ACTIONS`, `OWNER_ONLY_TYPES` (`clients`), `STAFF_READ_FIELDS` | Add actions `editBookingProfile` (owner) and `manageBookings` (any member). `bookingProfiles` is owner-only to write. |
| Validation | Zod in `shared/schemas`, `checkStoredDoc`, `SCHEMA_BY_COLLECTION` (INV-4) | New schemas in `shared/schemas/entities/booking*.schema.ts`. |
| Generic CRUD | `/api/v1/data/:type` | Use for `bookingProfiles` reads/writes by the owner and for `guests`. **Not** for `bookings` writes — they need server-owned fields (status history, messaging stamps, source) like `menuEvents`. Dedicated router `server/routes/bookings.js`, same pattern as `events.js`. |
| Events pipeline | `menuEvents` stages, `events.js`, `clients` (plan 512), `event-pipeline.service.ts` | Event inquiries from the public page are created by the server directly as `menuEvents` (stage `inquiry`, `source: 'public_page'`) + a `clients` doc (owner-only type — the public router writes it with server-set `createdBy`, see INV-1 question). |
| Opening hours UI | `src/app/shared/hours-editor/` + `src/app/core/utils/venue-hours.util.ts` (`HoursDraftRow`, `draftToHours`) | Reuse rung 1 for service hours in the booking profile. |
| Date / time / counter inputs | `src/app/shared/date-field/`, `time-field/`, `counter/` | Reuse rung 1 on the public page and host screen. |
| Dropdowns | `custom-select` (never native select — `lint:no-native-select`) | Reuse. |
| Page frame | `page-header`, `list-shell`, `empty-state`, `modal-shell`, `confirm-modal` | Reuse. |
| Dark screen for the floor | `:root.theme-kitchen` set by Cook View (plan 404) | Reuse the same class on the host screen (`/bookings/today`), set/unset the way `CookViewPage` does — via a new small service, not by touching `cook-view.page.ts` (frozen). |
| Photos / logo | `cloudinary.service.ts`, Cloudinary URLs in `closing.photos` | Reuse for the business logo on the public page (`bookingProfile.logoUrl`, `https://res.cloudinary.com/` prefix rule). |
| AI | `server/services/gemini-client.js`, `server/routes/ai.js`, `aiLimiter` (INV-6) | P8 adds tools to the same client. Free-tier budgets (20–500 calls/day per model) mean the AI hostess is **opt-in per business** and never the default path. |
| Jobs | `server/jobs/purge-deleted.js` | Add `server/jobs/booking-reminders.js` on the same scheduler pattern. |
| Logging | pino, `req.log`, `LoggingService` | Event names `bookings.*.*` (`domain.action.result`). |
| Rate limits | `dataWriteLimiter`, `aiLimiter` (`server/middleware/rate-limit.js`, `write-limit.js`) | New `publicLimiter` (IP + slug keyed) for `/api/v1/public`. |
| Dashboard | `pages/dashboard/components/*` (setup checklist, business performance) | Add a `bookings-today-card` component + a setup-checklist item "Get your booking link". |
| Settings | `pages/settings/` (tabs) | Booking profile lives under `/bookings/settings` (own page), linked from settings tabs — no edits inside the settings page beyond a tab link. |
| Translation | `translatePipe` + `dictionary.json` (append-only hotspot) | All keys `bookings.*`. |
| Icons | Lucide, registered in `app.config.ts`, `lint:icons` | Register: `calendar-check`, `clock`, `users`, `message-circle`, `qr-code`, `link`, `bell-ring`, `hourglass`, `check-check`, `ban`. |

Nothing in this program touches `products`, `recipes`, `dishes`, `suppliers`, `taxonomyTerms` or the master catalog. Bookings data
is **never cloneable** (no `_masterId`).

---

## 4. Domain model (Zod, `shared/schemas/entities/`)

All documents carry `baseDocShape` (`_id`, `schemaVersion: 2`, `businessId`, `createdBy`, `createdAt`, `updatedAt`, optional soft-delete).
Times are stored as ISO strings in the business timezone (`Asia/Jerusalem`) plus an epoch `startAt`/`endAt` for indexing — one rule,
stated in the ADR, so the engine never guesses.

### 4.1 `bookingProfiles` — one per business (owner-only write, not cloneable, no soft delete)

```ts
export const BOOKING_KINDS = ['table', 'event'] as const
export const bookingProfileSchema = z.strictObject({
  ...baseDocShape,
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/),          // public URL /book/:slug — unique across businesses (index)
  kinds: z.array(z.enum(BOOKING_KINDS)).min(1),
  displayName: nameField,                                           // what diners see (may differ from business.name)
  logoUrl: z.string().url().max(500).startsWith('https://res.cloudinary.com/').optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  // table kind
  serviceHours: z.array(hoursRowSchema).max(14),                   // same shape as venue.operatingHours (reuse venue-hours.util)
  closedDates: z.array(z.string()).max(366).optional(),             // 'YYYY-MM-DD'
  capacity: z.strictObject({
    mode: z.enum(['seats', 'tables']),                              // MVP = seats per 15-min slot; tables = P3+
    seatsPerSlot: z.number().int().min(1).max(500),
    slotMinutes: z.literal(15),
    turnMinutes: z.array(z.strictObject({ maxParty: z.number().int(), minutes: z.number().int().min(30).max(360) })).max(6),
    maxPartyOnline: z.number().int().min(1).max(50),
    lastSeatingBeforeCloseMinutes: z.number().int().min(0).max(180)
  }),
  areas: z.array(z.strictObject({ key: z.string(), name: nameField, seats: z.number().int().min(0) })).max(10).optional(),
  tables: z.array(z.strictObject({ key: z.string(), areaKey: z.string(), name: nameField, minSeats: z.number().int(), maxSeats: z.number().int(),
            combinableWith: z.array(z.string()).max(6).optional() })).max(200).optional(),   // P3+ (Gemini: table combinations)
  policies: z.strictObject({
    reminderHour: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),  // Tabit data: 10:00 reminder → cancellations peak 10–12
    autoReleaseMinutesAfterStart: z.number().int().min(0).max(60).default(15),
    cancellationCutoffHours: z.number().int().min(0).max(72).default(6),  // Restaurateurs' Association: <6h
    cancellationFeePerGuest: z.number().min(0).max(500).optional(),      // money field (P7)
    cardHoldFromParty: z.number().int().min(1).optional(),               // P7
    waitlistEnabled: z.boolean().default(true),
    notesToGuest: z.string().max(500).optional()
  }),
  // event kind
  eventIntake: z.strictObject({
    eventTypes: z.array(z.string()).max(20),          // taxonomy keys of the business's event types (read from taxonomyTerms)
    minGuests: z.number().int().min(1).default(10),
    leadDays: z.number().int().min(0).default(3),
    askBudget: z.boolean().default(true)
  }).optional(),
  whatsapp: z.strictObject({                           // P4
    enabled: z.boolean(),
    phoneNumberId: z.string().max(40).optional(),      // Meta WABA phone id (server-side only, never sent to the public API)
    displayPhone: z.string().max(30).optional()
  }).optional(),
  branding: z.strictObject({ accent: z.string().regex(/^#[0-9a-f]{6}$/i).optional() }).optional(),
  active: z.boolean().default(true)
})
```

### 4.2 `bookings` — table reservations (dedicated router; generic API read-only for members)

```ts
export const BOOKING_STATUSES = ['pending', 'confirmed', 'reminded', 'guest_confirmed', 'seated', 'finished', 'no_show', 'cancelled'] as const
export const BOOKING_SOURCES = ['public_page', 'whatsapp', 'phone', 'walk_in', 'google', 'ai_hostess'] as const
export const bookingSchema = z.strictObject({
  ...baseDocShape,
  kind: z.literal('table'),
  status: z.enum(BOOKING_STATUSES),
  statusHistory: z.array(z.strictObject({ status: z.enum(BOOKING_STATUSES), at: z.number(), by: z.string(), byName: z.string(), via: z.enum(['server','host','guest','job']) })),
  source: z.enum(BOOKING_SOURCES),
  date: z.string(),                 // 'YYYY-MM-DD' business-local
  time: z.string(),                 // 'HH:mm'
  startAt: z.number(),              // epoch ms (index with businessId)
  endAt: z.number(),                // startAt + turn
  partySize: z.number().int().min(1).max(100),
  areaKey: z.string().optional(),
  tableKeys: z.array(z.string()).max(4).optional(),
  guest: z.strictObject({ name: nameField.min(1), phone: z.string().regex(/^[0-9+\-\s()]{7,20}$/), phoneNormalized: z.string(), email: z.string().max(200).optional(), notes: z.string().max(300).optional() }),
  guestId: z.string().optional(),   // → guests collection
  clientId: z.string().optional(),  // optional link to clients (owner decides, P6)
  tags: z.array(z.enum(['vip','allergy','birthday','repeat_no_show','stroller','highchair','accessible'])).max(6).optional(),
  publicToken: z.string().min(16),  // unguessable id used in guest links (manage/cancel); never the _id
  messaging: z.strictObject({ confirmationSentAt: z.number().optional(), reminderSentAt: z.number().optional(), lastInboundAt: z.number().optional(), channel: z.enum(['whatsapp','sms','none']) }).optional(),
  deposit: z.strictObject({ required: z.boolean(), holdToken: z.string().optional(), amount: z.number().min(0).optional(), chargedAt: z.number().optional() }).optional(),  // money field (P7)
  seatedAt: z.number().optional(),
  finishedAt: z.number().optional()
})
```

Server-owned fields (stripped from any generic write, like `EVENT_SERVER_FIELDS`): `status`, `statusHistory`, `startAt`, `endAt`,
`publicToken`, `messaging`, `deposit`, `seatedAt`, `finishedAt`, `guest.phoneNormalized`, `source`.

### 4.3 `waitlistEntries`

```ts
export const waitlistEntrySchema = z.strictObject({
  ...baseDocShape,
  date: z.string(), joinedAt: z.number(), partySize: z.number().int().min(1).max(50),
  guest: /* same guest shape */, publicToken: z.string().min(16),
  status: z.enum(['waiting', 'notified', 'seated', 'left', 'expired']),
  quotedMinutes: z.number().int().optional(), notifiedAt: z.number().optional(), seatedBookingId: z.string().optional(),
  source: z.enum(['qr', 'host', 'whatsapp', 'flash'])
})
```

### 4.4 `guests` — the diner CRM (generic API, any member reads, owner edits notes/tags)

```ts
export const guestSchema = z.strictObject({
  ...baseDocShape,
  name: nameField, phone: z.string(), phoneNormalized: z.string(),   // unique per business (index businessId+phoneNormalized)
  email: z.string().max(200).optional(),
  visits: z.number().int().min(0), noShows: z.number().int().min(0), lastVisitAt: z.number().optional(),
  tags: z.array(z.string()).max(10).optional(), notes: z.string().max(1000).optional(),
  marketingConsent: z.strictObject({ given: z.boolean(), at: z.number(), via: z.string() }).optional(),  // Spam Law §30A
  clientId: z.string().optional()
})
```

`guests` vs `clients`: `clients` (plan 512) are event customers, owner-only, hard-delete. `guests` are high-volume diners, created by the
server from bookings, soft-delete, staff may read name + phone + tags only (`STAFF_READ_FIELDS` entry). Do **not** merge the two in this
program; add `guests.clientId` so an owner can link a regular diner to a catering client later.

### 4.5 `messageLog` (P4) — one row per outbound/inbound WhatsApp message

`{ bookingId | waitlistId, direction, channel, templateKey, waId, status: queued|sent|delivered|read|failed, providerMessageId, costCategory: utility|service|marketing, at, error? }`.
Not user-visible except as a timeline on the booking detail. 90-day TTL index like `app_logs`.

### 4.6 `businesses` additions (dedicated route, like `settings` / `baseline`)

`bookingPlan: z.enum(['free','pro']).optional()` and `bookingUsage: { month: 'YYYY-MM', bookings: number, messages: number }` — written only by the server. The plan tier gates P7/P8/P9 features; billing itself is out of scope here (manual for the pilot).

### 4.7 `collections.js` entries

```js
{ name: 'bookingProfiles',  userData: true, cloneable: false, backup: true, searchable: false, softDelete: false },
{ name: 'bookings',         userData: true, cloneable: false, backup: true, searchable: false, softDelete: true },   // reads via generic; writes refused there (BOOKING_SERVER_TYPES)
{ name: 'waitlistEntries',  userData: true, cloneable: false, backup: true, searchable: false, softDelete: false },
{ name: 'guests',           userData: true, cloneable: false, backup: true, searchable: true,  softDelete: true },
{ name: 'messageLog',       userData: false, cloneable: false, backup: false, searchable: false, softDelete: false },  // bookings router only
```

Indexes (migration `0011-bookings.js`): `bookings {businessId, startAt}`, `bookings {publicToken} unique`, `bookingProfiles {slug} unique`,
`guests {businessId, phoneNormalized} unique`, `waitlistEntries {businessId, date, status}`, `messageLog {at} TTL 90d`.

---

## 5. Server

### 5.1 Routers (mount in `server/app.js` after `/api/v1/business`)

| Mount | File | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/v1/public` | `server/routes/public.js` | none + `publicLimiter` | Everything a diner/client calls. Business resolved from `:slug` → `bookingProfiles`; `businessId` is set by the server, never from the body. |
| `/api/v1/bookings` | `server/routes/bookings.js` | `verifyToken` + `assertCan('manageBookings')` | Host/owner actions with server-owned stamps (status moves, seat, no-show, walk-in, waitlist ops, notes). Same patterns as `events.js` (`loadX`, `validMerged`, `writeConditional`, `fail`). |
| `/api/v1/webhooks/whatsapp` | `server/routes/webhooks-whatsapp.js` | Meta signature (`X-Hub-Signature-256`) + verify-token GET | P4. Must respond 200 within seconds; work is queued in-process. |
| `/api/v1/business/booking-plan` | in `business.js` | platform admin | sets `bookingPlan` for the pilot |

### 5.2 Public API (P2)

```
GET  /api/v1/public/:slug                         → profile for the page: displayName, logoUrl, kinds, serviceHours, policies(public subset), eventIntake, branding. Never phoneNumberId.
GET  /api/v1/public/:slug/availability?date=YYYY-MM-DD&party=N   → { slots: [{ time:'19:00', available:true }...], nextAvailable?: {date,time} }
POST /api/v1/public/:slug/bookings                 { date, time, partySize, guest:{name,phone,email?,notes?}, areaKey?, consent:{terms:true, marketing?:bool} }
                                                   → 201 { publicToken, status, summary } | 409 SLOT_TAKEN (with alternatives) | 422 OUTSIDE_HOURS | 429
GET  /api/v1/public/:slug/bookings/:publicToken    → the guest's own booking (manage page)
POST /api/v1/public/:slug/bookings/:publicToken/cancel
POST /api/v1/public/:slug/bookings/:publicToken/confirm            (reminder link / button)
POST /api/v1/public/:slug/inquiries                { eventDate, guestCount, eventTypeKey, servingPreference?, budgetPerGuest?, client:{name,phone,email?,companyName?}, notes?, consent }
                                                   → 201 { reference } — creates clients (find-or-create by phoneNormalized) + menuEvents { stage:'inquiry', name:`<client> – <type> <date>`, guestCount, eventDate, clientId, clientName, clientPhone, notes:[server note 'From public page'] , source via a note }
POST /api/v1/public/:slug/waitlist                 (P5) { partySize, guest } → { publicToken, position, quotedMinutes }
GET  /api/v1/public/:slug/waitlist/:publicToken    (P5) → { position, status, quotedMinutes }
```

Rules: every POST validates with Zod input schemas (`shared/schemas/public/*.schema.ts`), honeypot field + `publicLimiter`
(20 writes / 15 min per IP+slug, 200 reads), and logs `public.booking.created` with `businessId` (never the phone).

### 5.3 The availability engine — deterministic, pure, tested (P2; the heart of everything)

`server/services/booking-engine.js` — pure functions, no DB access, unit-tested in `server/test/booking-engine.test.js`:

- `slotsForDate(profile, date)` → 15-min slots from `serviceHours` minus `closedDates`, minus `lastSeatingBeforeCloseMinutes`.
- `turnFor(profile, partySize)` → minutes from `capacity.turnMinutes` ladder (Gemini: turn management — no 20:15 booking that burns the table for the night; the ladder plus a `preferredTimes` nudge in the UI, not a hard block, for MVP).
- `occupancy(bookings, slot)` → seats taken in the slot window (status in `pending|confirmed|reminded|guest_confirmed|seated`).
- `isAvailable(profile, bookings, date, time, partySize)` → boolean + reason.
- `alternatives(...)` → up to 3 nearest slots (±90 min, then next day) — the "negotiation" Gemini wants the AI to do is a pure function here, the AI only phrases it.
- `tables` mode (P3+): first-fit on `tables[]` with `combinableWith`, never promising a combination that is not declared.

The router wraps `isAvailable` in a conditional insert: `bookings.insertOne` only after re-checking occupancy inside the same request, then re-counting;
on a race (two guests, last seats) the second gets 409 with alternatives. Atlas M0 has no transactions on standalone, so use the
count-then-insert-then-verify pattern and delete-on-overflow (document this in the ADR).

### 5.4 Host router (P3)

```
PUT  /api/v1/bookings/:id/status     { status, reason? }   allowed moves: confirmed→seated→finished; →no_show after startAt+autoRelease; →cancelled any time before finished
POST /api/v1/bookings/walk-in        { partySize, guest?{name,phone?}, tableKeys? }  → seated booking with source:'walk_in'
POST /api/v1/bookings                { date,time,partySize,guest,source:'phone' }    → host-created (engine check, override flag for owner)
PUT  /api/v1/bookings/:id/tables     { tableKeys }
POST /api/v1/bookings/:id/notes      { text }
GET  /api/v1/bookings/day?date=      → bookings + waitlist for the host screen (lean projection; staff get `STAFF_READ_FIELDS`)
GET  /api/v1/bookings/forecast?from=&to=   (P6) → covers per date per hour, by status
POST /api/v1/waitlist                (P5) host adds; PUT /api/v1/waitlist/:id/notify | /seat | /leave
```

### 5.5 Jobs

- `server/jobs/booking-reminders.js` (P4): every 5 min, find `confirmed` bookings whose business `reminderHour` just passed today →
  send the reminder template with Confirm / Cancel quick-reply buttons; mark `reminded`. Every 5 min: `confirmed|reminded` with
  `startAt + autoReleaseMinutes < now` and not seated → `no_show` (via `job`) and bump `guests.noShows`; this frees the seats for the
  flash waitlist (P5).
- Runs on the same scheduler as `purge-deleted.js`. **Render free tier sleeps after 15 min idle** — see section 11; reminders need a
  warm process or an external ping.

### 5.6 Permissions (`server/utils/permissions.js` + client mirror)

- `ACTIONS` += `manageBookings` (any member: status moves, walk-ins, waitlist, notes), `editBookingProfile` (owner-only), `editGuests` (owner-only for `notes`/`tags`; staff may create via bookings only).
- `OWNER_ONLY_TYPES` += `bookingProfiles`.
- Money fields (`shared/schemas/money-fields.ts`): `bookingProfiles.policies.cancellationFeePerGuest`, `bookings.deposit.*`.
- `STAFF_READ_FIELDS.guests` = `['name','phone','tags','visits','noShows']`.

### 5.7 Architecture Impact (what the Planner must write and ask)

- **INV-1 (Ownership) — change needed.** Today "every write is authorized through `permissions.js`" by a business member. The public
  router creates `bookings`, `waitlistEntries`, `guests`, `clients` and `menuEvents` on behalf of a **non-member**. Proposed rule
  addition: *"A guest-originated write enters only through `server/routes/public.js`, is bound to the business resolved from the slug,
  creates documents with `createdBy: 'public:<slug>'`, and can read back only the single document its `publicToken` names."*
  Who loses what: nothing for members; the owner gains inbound bookings. Ask the Human: `INV-1 · current rule · proposed change ·
  who loses what` → on `approve arch change INV-1`, write ADR `docs/brain/decisions/00NN-public-guest-writes.md`, supersede, and add the
  `Arch-approved:` line to P0.
- **INV-2 (Tenancy) — preserves.** Booking collections are not cloneable; no master items; every query goes through `scopeFilter` or the
  slug-resolved `businessId`.
- **INV-3 — preserves.** Status moves and counters (`guests.visits/noShows`) are single-request server updates.
- **INV-4 — preserves.** New schemas registered in `SCHEMA_BY_COLLECTION`; public input schemas separate from stored schemas.
- **INV-5 — preserves.** Event types for the inquiry form are read from `taxonomyTerms`; no new registry.
- **INV-6 — preserves.** P8 calls Gemini only through `gemini-client.js`.
- New invariant candidate (ADR, P0): **INV-7 — The engine decides availability.** No channel (page, host, WhatsApp bot, Google, AI)
  creates a `confirmed` table booking without `booking-engine.isAvailable` returning true inside the same server request.

### 5.8 Security surface

- Public inputs: phone regex, name ≤ 200, notes ≤ 300, honeypot, rate limit, slug allowlist regex. No HTML rendering of guest text.
- `publicToken`: 24 random bytes base64url via `server/utils/id.js` pattern; never log it.
- Webhook: HMAC check with `WHATSAPP_APP_SECRET`; verify-token GET; idempotency on `providerMessageId`.
- New env vars (Render dashboard, never committed): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (platform default), `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN`, `PUBLIC_BASE_URL`, later `PSP_*`. Add to `render.yaml` as `sync: false` with the same comment style.
- Privacy: guests are personal data (Protection of Privacy Law, Amendment 13). Add a `docs/security-go-live.md` section: retention
  (bookings 24 months, messageLog 90 days), export/delete-by-phone admin script, marketing consent stored with timestamp.

---

## 6. Client (Angular 19, standalone, signals only)

### 6.1 Routes (`src/app/app.routes.ts` — append only)

```ts
{ path: 'book/:slug', loadChildren: () => import('./pages/public-booking/public-booking.routes').then(m => m.publicBookingRoutes) },  // no app shell
{ path: 'bookings', loadComponent: () => import('./pages/bookings/bookings.page').then(m => m.BookingsPage), canActivate: [authGuard],
  resolve: { profileLoaded: bookingProfileEnsureLoadedResolver },
  children: [
    { path: '', redirectTo: 'today', pathMatch: 'full' },
    { path: 'today',    loadComponent: () => import('./pages/bookings/components/host-day/host-day.component').then(m => m.HostDayComponent) },
    { path: 'list',     loadComponent: () => import('./pages/bookings/components/booking-list/booking-list.component').then(m => m.BookingListComponent) },
    { path: 'guests',   loadComponent: () => import('./pages/bookings/components/guest-list/guest-list.component').then(m => m.GuestListComponent) },
    { path: 'settings', loadComponent: () => import('./pages/bookings/components/booking-settings/booking-settings.component').then(m => m.BookingSettingsComponent), canDeactivate: [pendingChangesGuard] },
  ] },
```

The public group renders **without** the authenticated shell (no nav, no auth modal). Verified 2026-11-09: `app.component.html` renders
`<app-header />` and `<app-tab-chips />` unconditionally, so P2 adds a route-data flag `{ bare: true }` read by a small `LayoutModeService`
(one signal, fed from `Router` events + `ActivatedRoute` data) and wraps the two shell components in `@if (!layout.bare_())` — do not
special-case by URL string in the template. The auth interceptor already skips the `Authorization` header when no token is stored, so the
public API calls need no `skipAuth` context token.

### 6.2 Pages and components (`src/app/pages/`)

**`public-booking/`** (P2, P5)
- `public-booking.routes.ts` — `''` → `BookPage`; `manage/:token` → `ManageBookingPage`; `done` → `ConfirmationPage`; `waitlist/:token` → `WaitlistStatusPage` (P5); `inquiry` → `EventInquiryPage`.
- `book.page.ts` — one column, mobile first, RTL. Header: logo + displayName. Kind switch when both kinds are enabled ("שולחן" / "אירוע"). Table flow in **three steps on one screen**: (1) date chips for the next 14 days + `app-date-field` for later, (2) party `app-counter` (1..maxPartyOnline), (3) time slot chips from `/availability` (unavailable ones dimmed; `nextAvailable` hint when a day is full). Then guest form (name, phone, notes, consent checkbox with the policy text). Submit → `ConfirmationPage`.
- `confirmation.page.ts` — summary card, "Add to calendar" (.ics generated client-side), "Manage / cancel" link (`/book/:slug/manage/:token`), WhatsApp confirmation note, and the growth line: *"Powered by FoodVibe — book a table system for your own restaurant"* linking to `/` signup with `?ref=<slug>`.
- `event-inquiry.page.ts` — event date (`app-date-field`), guests (`app-counter`, min from profile), event type (`app-custom-select` from profile.eventIntake.eventTypes), budget per guest (optional), contact, notes. Confirmation says the chef will call within X hours.
- `manage-booking.page.ts` — the guest's booking by token: status, details, Cancel (with the cutoff policy text), Confirm.
- Services: `public-booking-api.service.ts` (HttpClient to `/api/v1/public`, no auth interceptor — check the interceptor skips when no token; otherwise add a `skipAuth` context token), `booking-draft.service.ts` (signals: date_, party_, time_, guest_).

**`bookings/`** (P1, P3, P5, P6)
- `bookings.page.ts` — `app-page-header` + tab nav (today / list / guests / settings) in the same shape as `inventory.page` / `suppliers.page`.
- `components/booking-settings/` (P1) — form sections as titled cards: Public link (slug with live validation + copy button + QR of the link), Kinds, Hours (`app-hours-editor`, rung 1), Capacity (seats per slot, turn ladder rows, max party online, last seating), Policies (reminder hour `app-time-field`, cutoff, auto-release, waitlist on/off, notes to guest), Event intake (types multi-pick `app-custom-multi-select`, min guests, lead days), Branding (logo upload via `cloudinary.service`, accent), WhatsApp (P4: status + connect instructions). Save through `BookingProfileDataService` (generic PUT, owner-only).
- `components/host-day/` (P3) — **the service screen**. Dark (`theme-kitchen`), big touch targets, phone and tablet. Layout: date strip (yesterday/today/tomorrow + picker) → summary pills (covers booked / seated / waiting / no-shows) → **timeline list grouped by 30 min**, each row: time, party, guest name, status chip, tags icons, one-tap actions by status (Confirmed → "הגיעו" seat; Seated → "סיימו"; Pending/late → "לא הגיעו"). Seated rows show the **table pulse**: a thin progress bar of `turnMinutes` elapsed; amber at 20 min before end, red past end (Gemini's Smart Table Pulse — replaces the missing POS link). Sticky bottom bar: "Walk-in" (opens `WalkInModal`), "Waitlist (n)" (P5 drawer), "Phone booking" (opens `QuickBookingModal`, engine-checked, owner override toggle).
- `components/booking-list/` — `app-list-shell` table: date filter, status filter, search by name/phone; row → `BookingDetailModal` (status history, messages timeline P4, notes).
- `components/guest-list/` (P6) — `app-list-shell`: name, phone, visits, no-shows, tags; owner edits notes/tags inline; link to `clients` ("convert to catering client" → opens the existing client flow).
- `components/walk-in-modal/`, `quick-booking-modal/`, `booking-detail-modal/` — all inside `app-modal-shell` (never a hand-drawn overlay; `[sheet]="true"` on phones).
- `components/waitlist-drawer/` (P5) — list with position, party, quoted minutes, "Notify" (sends template), "Seat" (creates seated booking), "Left"; QR card for the counter (QR of `/book/:slug/waitlist`).
- Services: `booking-data.service.ts` (host router calls, signals: day_, selectedDate_), `booking-profile-data.service.ts` (extends `BaseEntityDataService` for `bookingProfiles`), `guest-data.service.ts` (extends `BaseEntityDataService`), `waitlist-data.service.ts`, `booking-engine-client.util.ts` (**the same pure functions as the server**, ported to TS for instant slot rendering; server stays the authority — put the engine in `shared/` only if the Planner confirms `shared/` builds for the client; otherwise duplicate with a shared test fixture JSON).
- `dashboard/components/bookings-today-card/` (P3) — covers today / tomorrow, next 3 arrivals, link to `/bookings/today`; shown only when a profile exists; otherwise the setup checklist gets "Create your booking link" (P1).
- P6 hook into prep: `menu-intelligence/components/prep-sheets/` is frozen-adjacent — add a **new** `bookings/components/covers-forecast/` component and surface it on the dashboard; prep-sheet integration is a separate later plan after the Human sees the forecast.

### 6.3 Reuse Check (seed for the plans' `## Reuse Check`)

| New piece | Family | Rung | Why |
| --- | --- | --- | --- |
| `app-hours-editor` on settings | hours-editor | 1 | as is |
| `app-date-field`, `app-time-field`, `app-counter` | existing | 1 | as is |
| `app-custom-select`, `app-custom-multi-select` | search/pick | 1 | as is |
| `app-modal-shell`, `ConfirmModalService` | modal-shell | 1 | as is |
| `app-list-shell`, `app-page-header`, `app-empty-state` | page frame | 1 | as is |
| `BookingProfileDataService`, `GuestDataService` | BaseEntityDataService | 2 | existing base, new type |
| `BookingDataService` | data service | 3 | extends the pattern of `event-pipeline.service.ts` for a server-owned router |
| `host-day` timeline row | none | 4 | a new family "service-timeline": dense, touch-first, status-driven rows; nothing in the catalog is time-based |
| `slot-chips` (time chip grid) | none → consider `scaling-chip` | 3 | if `scaling-chip` can carry a disabled + selected state, extend it; else rung 4 "chip-grid" |
| `table-pulse` progress bar | none | 4 | a timer bar; smallest possible, could become `.c-pulse` engine in `styles.scss` (append) |
| `LayoutModeService` | none | 4 | one signal `bare_`; the public page has no shell |
| `.c-public-card` | styles.scss | 3 | extend the existing card engine with a public (light, branded accent) variant |

Run `node scripts/reuse-lint.mjs --diff=<base>` in every plan; `/dev/catalog` gets the new families (plan-535 style).

### 6.4 Design direction (hand to `/design-port` if a Design track is opened)

- **Public page**: light, calm, one accent color from the profile, generous spacing, 16px+ body, buttons full-width on phones. It must
  look like the *restaurant's* page, not like FoodVibe — FoodVibe appears only in the footer line. Hebrew first, auto-switch to English
  when `navigator.language` is not `he` (dictionary already has both layers; confirm `TranslationService` supports a per-page locale,
  else P2 keeps Hebrew only and English is a Critical Question).
- **Host screen**: `theme-kitchen` dark; status colors reuse the existing semantic tokens (success / warning / danger) — no new palette;
  minimum touch target 48px; no hover-only affordances; works offline for reading the day (service-worker cached GET of `/day`, writes
  queued = **not** in MVP, show "offline" banner instead).
- **Settings**: the same titled-card look as `/settings` and the venue form.
- All layout with logical properties; RTL by default; icons from Lucide only.

### 6.5 Models (`src/app/core/models/`)

`booking-profile.model.ts`, `booking.model.ts`, `waitlist-entry.model.ts`, `guest.model.ts` — TS types inferred from the Zod schemas
(`z.infer`), re-exported; no hand-written duplicates (`shared/schemas` already feeds the client models under `models/v2`, follow that).

### 6.6 Dictionary keys (`public/assets/data/dictionary.json`, append only, namespace `bookings.`)

`bookings.title` הזמנת מקום · `bookings.tab.today` היום · `bookings.tab.list` כל ההזמנות · `bookings.tab.guests` אורחים · `bookings.tab.settings` הגדרות ·
`bookings.kind.table` שולחן · `bookings.kind.event` אירוע · `bookings.status.pending` ממתין · `.confirmed` מאושר · `.reminded` נשלחה תזכורת ·
`.guest_confirmed` האורח אישר · `.seated` יושבים · `.finished` סיימו · `.no_show` לא הגיעו · `.cancelled` בוטל ·
`bookings.action.seat` הגיעו · `.finish` סיימו · `.noShow` לא הגיעו · `.cancel` ביטול · `.walkIn` מזדמן · `.phoneBooking` הזמנה טלפונית ·
`bookings.public.pickDate` לאיזה יום? · `.pickParty` כמה אתם? · `.pickTime` באיזו שעה? · `.full` אין מקום ביום הזה · `.nextAvailable` הכי קרוב שפנוי ·
`.yourDetails` הפרטים שלך · `.consent` קראתי את מדיניות הביטולים · `.book` הזמינו שולחן · `.confirmed.title` השולחן שלכם שמור ·
`.manage` שינוי או ביטול · `.poweredBy` מופעל על ידי FoodVibe · `.inquiry.title` בקשה לאירוע · `.inquiry.sent` קיבלנו, נחזור אליכם ·
`bookings.settings.slug` כתובת הדף · `.slugTaken` הכתובת תפוסה · `.copyLink` העתקת קישור · `.capacity` קיבולת · `.seatsPerSlot` מקומות לכל רבע שעה ·
`.turnMinutes` משך ישיבה · `.maxPartyOnline` מקסימום סועדים בהזמנה אונליין · `.lastSeating` הושבה אחרונה לפני סגירה · `.reminderHour` שעת תזכורת ·
`.cutoffHours` ביטול חינם עד (שעות) · `.autoRelease` שחרור שולחן אחרי (דקות) · `.waitlist` רשימת המתנה · `.notesToGuest` הודעה לאורחים ·
`bookings.waitlist.join` הצטרפות לתור · `.position` המקום שלך בתור · `.quoted` זמן המתנה משוער · `.ready` השולחן שלכם מוכן ·
`bookings.forecast.covers` סועדים צפויים · `bookings.wa.confirmation` / `.reminder` / `.tableReady` (template bodies live on Meta, keys only for the preview).

English values go in the English layer of the same file (check the existing structure before adding).

---

## 7. WhatsApp layer (P4) — the channel Israelis actually use

- **Provider:** Meta WhatsApp Cloud API directly (no BSP). Israel utility template ≈ $0.006/message (Oct 2026 rates); marketing ≈ $0.04.
  One business with 400 bookings/month × 3 messages ≈ ₪25–30/month — absorbed by the plan price.
- **Gemini-research rule we adopt:** prefer **guest-initiated** conversations. The public page's confirmation screen has a
  "Send me the confirmation on WhatsApp" button that opens `wa.me/<displayPhone>?text=<prefilled code>`; the guest's first message opens a
  24-hour service window, and everything we reply inside it is cheaper (service messages are billed from Oct 2026 but at the utility
  rate, still far below marketing). Reminders the next day are outbound **utility** templates (approved: `booking_confirmation`,
  `booking_reminder` with Confirm/Cancel quick replies, `waitlist_table_ready`, `booking_cancelled`). Never send marketing templates in
  this program (Spam Law consent + cost).
- **Number model (Critical Question):** (a) one platform number for all businesses, message prefixed with the business name — cheapest,
  one WABA, fastest to pilot; (b) each business connects its own WABA number via Embedded Signup — right long-term, heavier. Recommend
  (a) for the pilot, (b) in a later plan.
- **Inbound** (`webhooks-whatsapp.js`): button replies `CONFIRM_<token>` / `CANCEL_<token>` → status move via the same functions as the
  host router (`via: 'guest'`); free text → store on the booking as a guest note and notify the host screen (badge); P8 routes free text
  to the AI hostess when the business opted in.
- **Fallback:** SMS via an Israeli gateway (019/Inforu) only when the phone is not on WhatsApp (delivery failure webhook) — decide the
  provider in P4; keep `channel` on the booking.
- **Cold start:** Meta retries webhooks, but a 50-second Render free-tier wake-up will drop quick-reply UX. See section 11.

---

## 8. AI hostess (P8) — Gemini tools over the engine, opt-in

- Model: the existing chain in `gemini-client.js`; new route `POST /api/v1/ai/hostess` called only by the WhatsApp webhook handler.
- Tools (function calling): `check_availability(date, time, partySize)`, `list_alternatives(...)`, `create_booking(...)`, `modify_booking(token, ...)`,
  `cancel_booking(token)`, `join_waitlist(...)`. Every tool is a thin wrapper over `booking-engine` + the booking router functions —
  **the model never confirms anything the engine did not return** (INV-7).
- System prompt in Hebrew, business facts injected from the profile (hours, policies, address). Max 6 turns, then hand off to a human
  ("המארחת תחזור אליך") and flag the conversation on the host screen.
- Quota reality: free-tier budgets are 20–500 calls/day per model **for the whole platform**. The hostess is therefore gated behind
  `bookingPlan: 'pro'` and a per-business daily cap (`bookingUsage.aiTurns`), and the Human decides whether a paid Gemini key is
  acceptable for this feature (Critical Question). Gemini-research expects ₪40/business/month for LLM tokens on a paid tier — plausible.
- Eval: extend `server/scripts/ai-eval-recipes.js` pattern with `ai-eval-hostess.js` — 25 Hebrew dialogues with expected tool calls.

---

## 9. Later integrations

- **P7 Deposits / card hold:** Israeli PSPs with hosted payment pages and tokenization: Grow (Meshulam), Cardcom, PayPlus, Sumit.
  Flow: when `partySize >= cardHoldFromParty` or a weekend, the confirmation step opens the PSP's hosted page (iframe/redirect) for a J5
  (card verification / hold) — FoodVibe stores only the PSP token on `bookings.deposit.holdToken`. No-show after `autoRelease` →
  owner clicks "charge cancellation fee" (never automatic in the first version) → server calls the PSP with the token. Money fields
  → owner only. Fees are the business's own PSP account (we hold no money). Provider choice is a Critical Question.
- **P9 Reserve with Google:** become an Actions Center partner (feed of merchants + availability, booking server endpoints:
  `CheckAvailability`, `CreateBooking`, `UpdateBooking`, `GetBookingStatus`). Google states 12–14 weeks with dedicated effort; needs a
  direct contract with every listed business (our ToS covers it). Start the partner interest form during P2 — it is the longest lead item.
  Until approved, P2 already supports the lighter **Business Link** path: the owner pastes `/book/:slug` into their Google Business
  Profile "Reservations" link — document it in the settings screen with a one-click copy.
- **P6 Kitchen link:** `GET /bookings/forecast` → dashboard card "covers next 7 days" → later a prep-sheet quantity suggestion
  (`expected covers × portions per diner` using the same coefficients as `menuEvents`). Event inquiries already land in the pipeline.

---

## 10. Proposed plan split (for `/plan`, one at a time)

| Plan | Title (plain) | Depends-on | Read-Write Scope (globs, seed) | Done-when (seed) |
| --- | --- | --- | --- | --- |
| P0 | Give bookings a home in the data model and the rules — schemas, collections, permissions, ADR for guest writes, migration 0011 | none | `shared/schemas/entities/booking*.ts`, `shared/schemas/entities/index.ts`, `shared/schemas/money-fields.ts`, `shared/schemas/staff-fields.ts`, `server/constants/collections.js`, `server/utils/permissions.js`, `server/migrations/0011-bookings.js`, `server/test/bookings-schema.test.js`, `server/test/permissions.test.js`, `server/test/cross-business.test.js`, `src/app/core/services/permission.service.ts` + spec, `src/app/core/models/booking*.ts`, `docs/brain/decisions/00NN-*.md`, `docs/brain/invariants.md`, `docs/agent/standards-backend.md` | [auto] `pnpm run build:schemas` + `test:server` + `test:ci` exit 0; [auto] cross-business test lists a body for every new type; [auto] `scope-check --arch` ok with `Arch-approved` on INV-1; [human] ADR text approved |
| P1 | Let the owner set up the public booking page from one settings screen | P0 | `src/app/pages/bookings/**`, `src/app/core/services/booking-profile-data.service.ts`, `src/app/core/resolvers/booking-profile-ensure-loaded.resolver.ts`, `src/app/pages/dashboard/components/setup-checklist-card/**`, `src/app/pages/settings/settings-tabs.ts`, `src/app/app.routes.ts` (append), `public/assets/data/dictionary.json` (append), `src/app/app.config.ts` (icons), `e2e/ui/<NNN>-*.spec.ts` | [ui] `/bookings/settings` saves a slug and shows the copyable link; [auto] slug uniqueness 409 test; [human] look matches `/settings` |
| P2 | Let a diner book a table or send an event inquiry from a public page, with the engine deciding availability | P0, P1 | `server/routes/public.js`, `server/services/booking-engine.js`, `server/middleware/rate-limit.js`, `server/app.js`, `shared/schemas/public/**`, `server/test/booking-engine.test.js`, `server/test/public-bookings.test.js`, `src/app/pages/public-booking/**`, `src/app/core/services/layout-mode.service.ts`, `src/app/appRoot/**` (shell flag only), `src/styles.scss` (append), `e2e/ui/<NNN>-*.spec.ts`, `docs/agent/standards-backend.md` | [auto] engine tests: hours, turn ladder, occupancy, race (two inserts, one 409), closed dates; [auto] inquiry test creates `clients` + `menuEvents` stage `inquiry` scoped to the slug's business and invisible to another; [ui] `/book/demo` books a table and shows "השולחן שלכם שמור"; [human] page looks like the restaurant's, not FoodVibe's |
| P3 | Give the host one dark screen to run the service — timeline, statuses, walk-ins, table timers | P2 | `server/routes/bookings.js`, `server/test/bookings-router.test.js`, `src/app/pages/bookings/components/host-day/**`, `.../walk-in-modal/**`, `.../quick-booking-modal/**`, `.../booking-detail-modal/**`, `.../booking-list/**`, `src/app/core/services/booking-data.service.ts`, `src/app/pages/dashboard/components/bookings-today-card/**`, `src/app/pages/dashboard/dashboard.page.html` (one line), `src/styles.scss` (append), dictionary (append), e2e | [auto] status-move rules tested (illegal move → 409 `BAD_STATUS`); [ui] seat a booking on `/bookings/today` and see the pulse bar; [human] usable one-handed on a phone in `theme-kitchen` |
| P4 | Confirm and remind guests on WhatsApp, and take their Confirm/Cancel replies | P3 | `server/services/whatsapp-client.js`, `server/routes/webhooks-whatsapp.js`, `server/jobs/booking-reminders.js`, `server/index.js` (job registration), `server/app.js`, `render.yaml` (env comments), `server/test/whatsapp-*.test.js`, `src/app/pages/bookings/components/booking-settings/**` (WhatsApp card), booking-detail messages timeline, dictionary | [auto] signature check rejects a bad HMAC (401) and accepts a good one; [auto] reminder job marks `reminded` once (idempotent); [human] a real reminder arrives on the Human's phone with working buttons |
| P5 | Let waiting guests join a QR waitlist and get "your table is ready" automatically | P3 (P4 for messages) | `server/routes/bookings.js` (waitlist), `server/routes/public.js` (waitlist), `src/app/pages/bookings/components/waitlist-drawer/**`, `src/app/pages/public-booking/**` (waitlist pages), tests, dictionary | [auto] position math + flash-waitlist on cancellation tested; [ui] join via `/book/demo/waitlist`, see position 1 |
| P6 | Show the chef tomorrow's covers and turn regular diners into clients | P3 | `server/routes/bookings.js` (forecast), `src/app/pages/bookings/components/guest-list/**`, `covers-forecast/**`, `src/app/core/services/guest-data.service.ts`, dashboard card, tests | [auto] forecast sums by hour match fixtures; [human] forecast card reads right on the dashboard |
| P7 | Protect the owner from no-shows with a card hold and a cancellation fee | P4 | `server/services/psp-client.js`, `server/routes/public.js`, `server/routes/bookings.js`, money-fields, settings UI, tests | [auto] sandbox hold + charge round trip; [human] policy text approved by the Human |
| P8 | Let an AI hostess answer WhatsApp bookings in Hebrew without ever inventing a table | P4, P5 | `server/routes/ai.js`, `server/services/gemini-client.js`, `server/services/hostess-agent.js`, `server/scripts/ai-eval-hostess.js`, tests | [auto] eval ≥ 22/25 expected tool calls; [auto] no `create_booking` without a prior `check_availability` true (test harness) |
| P9 | List every booking page on Google Maps through Reserve with Google | P2 (+ partner approval) | `server/routes/google-actions.js`, feed generator script, tests | [auto] feed validates against Google's schema; [human] one business live on Maps |

Each plan: `Isolated DB: no` except P0 (`yes` — migration). Parallel: P1 ∥ P2-server half is possible if the Planner splits P2 into
P2a (server + engine) and P2b (public UI); recommended for two Worker slots.

---

## 11. Non-functional constraints (free-tier reality)

- **Render free tier spins down after ~15 min idle; cold start ~30–60 s.** Acceptable for the public page (rare) but not for webhook
  quick replies or 5-minute reminder jobs. Options: (a) external uptime ping every 10 min (free, keeps it warm, Render tolerates it),
  (b) Render Starter ($7/month) — the first real infra cost of the program, (c) move the reminder job to a scheduled external trigger
  (GitHub Actions cron hitting `POST /api/v1/jobs/booking-reminders` with a secret). Recommend (a) now, (b) at the first paying customer.
  Critical Question.
- **Atlas M0:** 512 MB, no transactions on shared tier guarantees — hence the count-insert-verify pattern in 5.3 and the TTL on `messageLog`.
- **Timezone:** all slot math in `Asia/Jerusalem` on the server (use `Intl`/`Temporal`-polyfill or `date-fns-tz` — Planner picks one
  already in the lockfile if present; otherwise `Intl.DateTimeFormat` only, no new dependency without the Human's ok).
- **Gemini quotas:** see section 8.
- **Hebrew/English:** the public page is the first FoodVibe screen an English-speaking tourist may see; if the translation layer cannot
  switch per page, English is deferred and the page states Hebrew-only in P2's Critical Questions.
- **PWA:** `ngsw-config.json` today has no `navigationUrls` (every navigation gets the cached `index.html`). That is fine for the
  owner's app; for guests it means `/book/:slug` is served from the same shell — acceptable (the shell is hidden by `LayoutModeService`),
  but P2 must verify a first-time guest on a slow phone does not wait for the full app bundle: lazy-load the public pages and keep the
  initial bundle unchanged (`ng build` budget in `angular.json` stays green).

---

## 12. Critical Questions for the Human (ask before P0; offer choices)

- Q1 INV-1 · current: every write authorized through `permissions.js` by a member · proposed: guest-originated writes through
  `public.js` only, bound to the slug's business, `createdBy: 'public:<slug>'` · who loses what: nobody; owner gains inbound bookings.
  A: open → needs `approve arch change INV-1`.
- Q2 New invariant INV-7 "the engine decides availability" — adopt as an invariant (a) yes, ADR in P0 (recommended) / (b) a rule in
  `standards-backend.md` only. A: open.
- Q3 Public page languages — (a) Hebrew only in P2, English in a later plan (recommended, keeps P2 small) / (b) both from P2. A: open.
- Q4 WhatsApp number model — (a) one platform number, business name prefixed (recommended for pilot) / (b) each business's own WABA
  via Embedded Signup. A: open.
- Q5 Keeping the server warm — (a) uptime ping (recommended now) / (b) Render Starter / (c) external cron for jobs. A: open.
- Q6 Paid Gemini key for the AI hostess (P8) — (a) yes, capped per business / (b) no, P8 waits. A: open.
- Q7 PSP for card holds (P7) — (a) Grow/Meshulam (recommended: the Human's market research shows SMB adoption, hosted page, tokenization) /
  (b) Cardcom / (c) PayPlus. A: open.
- Q8 Pilot pricing shown on the public confirmation footer — (a) "Free for restaurants" link to signup / (b) no price, just "Powered by".
  A: open.
- Q9 Event inquiry — create the `menuEvents` document immediately (recommended; it is what the owner wants to see) / (b) a separate
  `inquiries` collection the owner converts manually. A: open.
- Q10 `shared/` engine code — verified 2026-11-09: the client already imports runtime code from `@schemas/entities`
  (`snapshotActionOnStage` in `event-stage.ts`, used by both sides), so the engine goes to `shared/booking-engine/` as **one**
  implementation, built by `build:schemas` like the rest. A: answered (no duplicate).

---

## 13. What we took from the Gemini research, and what we did not

Taken (with the reason):
- **AI hostess that negotiates alternatives** → P8, but only over the deterministic engine (their own "deterministic engine behind the AI"
  rule), and gated by quotas.
- **Turn management ladder, table combinations, J5 card hold above a party size, Smart Table Pulse timer, flash waitlist, 3-second
  host screen on a dark tablet, PWA not native, no POS integration in MVP** → all in sections 4–6.
- **Cost rule: let the guest send the first WhatsApp message** → section 7.
- **Beachhead: wine bars, wineries, pop-ups, boutique 30–80 seats** → folded into our segment list; our research adds cafés/neighbourhood
  places and the Hadera–Sharon–North geography.
- **Hybrid / pop-up businesses with irregular schedules** → `closedDates` + per-day `serviceHours` rows cover it; a "service calendar"
  (named services, e.g. "Friday brunch") is a later plan.

Not taken (and why):
- **Pricing ₪350 / ₪650 / ₪1,100** — contradicts the Israeli price ceiling we measured (₪99–149 for SMB ordering tools, Ontopo ≈ ₪700
  for full-service). Our model: free page, ₪149 basic, ₪249 pro, ₪349 multi-site; prices are a Human decision outside this brief.
- **5-week MVP** — unrealistic for a solo developer inside FoodVibe's gates; the split above is ~10–14 weeks for P0–P3.
- **Competitor table numbers** (Ontopo ₪800–2,500, Tabit ₪1,200–4,000, Wix/Mazmin) — unsourced; our doc keeps sourced figures only.
- **Marketing WhatsApp campaigns to fill weak days** — Spam Law consent + marketing rates; not in this program.
- **Separate standalone product** — the whole point here is that it lives inside FoodVibe and feeds the kitchen.

---

## 14. Glossary (for dictionary and code names)

| Code key | Hebrew | Meaning |
| --- | --- | --- |
| booking (kind table) | הזמנת מקום | a table reservation |
| inquiry (kind event) | פנייה לאירוע | an event request → `menuEvents` stage `inquiry` |
| walk-in | מזדמן | guest without a booking |
| waitlist | רשימת המתנה / תור | queue for walk-ins |
| cover | סועד | one diner |
| turn | סבב | the time a table is occupied by one party |
| service | סרוויס / משמרת | one opening period |
| host | מארח/ת | the person running the door |
| table pulse | מד זמן שולחן | the turn-elapsed bar |
| flash waitlist | הודעת "התפנה שולחן" | notify the waitlist when a cancellation frees seats |

End of brief.
