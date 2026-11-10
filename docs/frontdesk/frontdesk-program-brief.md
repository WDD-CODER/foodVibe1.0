# Brief — write the Front Desk program Plan Contracts (FoodVibe 1.0)

You are the Planner (main folder, on `main`). Your job in this session: turn the product direction below into a
complete, ordered set of saved Plan Contracts, so Dandan only has to run Workers / `/orchestrate`. Plans only — no app code.

**Revision 2 (2026-11-10, after Dandan's answers).** The plan map is written and approved:
`docs/frontdesk/frontdesk-map.md`. Order of authority when two texts disagree:
**map Contracts > Part 0.5 of this brief > the rest of this brief > `reference-bookings-engine.md`.**
Behaviour rules R-01…R-21: `docs/frontdesk/assistant-behaviour-rules.md`.

Written 2026-11-10 by the claude.ai Architect, read against `origin/main` `05741afd` (2026-11-09). It follows the shape
of `docs/mvp/mvp-specs-brief.md` on purpose: Part 1 = how to run the session, Part 2 = cross-cutting rules,
Part 3 = product specs (ids `FD-nn`), Part 4 = proposed plan map, Part 5 = Critical Questions, Part 6 = later waves.
The brief is self-contained. It **supersedes** `bookings-program-brief.md` (2026-11-09) as the plan of record; that file
stays as technical reference for Wave 2 only (availability engine, booking statuses, WhatsApp templates, deposits, Google).

---

## Part 0 — Product direction (decided with Dandan, 2026-11-10)

**What FoodVibe is today (verified in code).** A back-of-house tool that already covers an event end to end:
clients (`clients`, plans 512–516) → inquiry and stage pipeline (`menuEvents`, `server/routes/events.js`, 8 stages) →
menu, costing and pricing meter → supplier orders, prep sheets, cook view → closing (planned vs paid) → business
performance (`server/routes/stats.js`). Plus inventory, suppliers, equipment, venues, team and business settings.
Nobody outside the kitchen sees any of it, there are **no active businesses**, and onboarding a kitchen is slow.

**The problem.** The kitchen value (less waste, faster ordering) is real but hard to pitch. What owners say they will pay
for is what brings or saves money at the door: answering customers, booking them, and not losing leads.

**The decision.** FoodVibe becomes one product with two layers:

| Layer | Name | Who uses it | Role in the business |
| --- | --- | --- | --- |
| 1 | **Front Desk** — CRM + conversations + AI assistant + booking requests | owner, host, the business's customers | what we pitch and what gets a business in (this brief) |
| 2 | **Kitchen** — recipes, costing, inventory, orders, prep, events execution | chef, staff | what keeps them and what no booking bot has (exists; later waves connect it) |

**One core, three business types.** The same CRM, the same inbox, the same assistant. Only the *request template*
changes:

| Business type | Request kinds it uses | What an approved request becomes |
| --- | --- | --- |
| restaurant / café / bar | `table` | a `bookings` record (date, time, party) |
| private chef | `consultation`, `event` | a `bookings` record (call/meeting) or a `menuEvents` inquiry |
| catering / events | `event`, `tasting` | a `menuEvents` inquiry (existing pipeline) or a `bookings` record (tasting) |

**Human in the loop first.** In Wave 1 the assistant answers questions and collects details; **a person approves every
booking**. Every suggestion the system makes and what the person did with it is recorded, so Wave 2 can automate with
the person only observing. Autonomy is a per-business setting (`assistantLevel`, FD-07).

**Pilot model.** 1–3 friendly businesses, one per type, free. Dandan onboards each one by hand (concierge), sitting with
the owner — onboarding is **not** self-serve in Wave 1. The product must make that hand-onboarding precise and fast
(FD-10). A business can later be moved to paid or suspended (FD-11). Aggregated, anonymised usage numbers belong to the
platform and are the sales evidence (FD-09); the contacts' personal data belongs to each business.

**Not in this program:** consumer marketplace, POS, native apps, marketing broadcasts.

---

## Part 0.5 — Decisions (Dandan, 2026-11-10) — these override anything below

| # | Decision | Effect on the plans |
| --- | --- | --- |
| D1 | `approve arch change INV-1` given. | Plan 543 writes ADR 0030 and the INV-1 amendment with `Arch-approved: Human 2026-11-10`. |
| D2 | Clients stay **owner-only to write**. Staff cause a client only through a manual request. Must stay cheap to open later. | No `editClientProfile` action. `clients` stays in `OWNER_ONLY_TYPES`. `STAFF_READ_FIELDS.clients = ['name','phone','tags','kinds']`. Opening it later = `permissions.js` + `PermissionService`, no migration. |
| D3 | Clients are **soft-deleted** (Trash). | ADR 0031 supersedes only that line of ADR 0027. |
| D4 | Onboarding is typed by Dandan inside the owner's account. Prepare for a later "act in business" mode. | Every server stamp takes its actor from `actorOf(req)` (`server/utils/actor.js`, plan 543). No impersonation code now. |
| D5 | WhatsApp: **one shared FoodVibe number during development**, a dedicated number per business at deployment. | `resolveBusiness()` order in the map (C-CONV). A dedicated number is one profile field, no code change. |
| D6 | Server kept awake by an uptime ping every 10 minutes. | Documented in plan 558; no code. |
| D7 | AI during development: free model chain; assistant default **level 0** (drafts). | Level 1 is switched on per business by the platform admin. |
| D8 | **Every AI call is metered from day one** (tokens, cost estimate, business, feature) so pricing can be set from real numbers. | New plan 566 (C-AIUSAGE), early in Wave 1a, covers every existing AI route too. |
| D9 | Public pages Hebrew only; "Powered by FoodVibe" shown. | — |
| D10 | Section name **"לקוחות והזמנות"**; a request is **"בקשה"** ("פנייה" keeps meaning an event inquiry). | Dictionary keys in 547, 552. |
| D11 | Voice notes are transcribed with Gemini. | Plan 560, metered as `voice_transcribe`. |
| D12 | **Every prompt sent to a model is English, written from scratch.** The customer writes Hebrew; the assistant answers in the customer's language. | Replaces "Hebrew system prompt" in FD-07. Fixed customer-facing sentences are Hebrew data (profile / dictionary). |
| D13 | **This repo never mentions any other project** — not in code, comments, docs, plans, commit messages or ADRs; no "based on" / "inspired by" wording. | Applies to every plan and every Worker. Rules are stated as FoodVibe's own. |
| D14 | First pilot is a **catering** business, but **all three business types are built in Wave 1a** (restaurant and private chef may follow quickly). | Templates, checklist and tests cover restaurant, private chef and catering equally. No type is deferred. |
| D15 | **"Before" numbers are optional, never a gate.** With no baseline the product reports from the first day of use; when a baseline is entered it is shown beside the measured numbers and labelled an owner estimate. Measured numbers are the strong evidence. | FD-09, FD-10, FD-14. Onboarding never blocks on baseline. The onboarding checklist does not list baseline as required. |
| D16 | Small business-report track (FD-14) is planned now. | Plans 567, 568. |

Name changes made after the Reality Check (already in the map Contracts): profile field `kinds` → **`requestKinds`**;
booking statuses **`confirmed | seated | finished | no_show | cancelled`** (not `arrived` / `done`); bookings gain
`source` and `endAt`; clients gain **`phoneKey`** (last 9 digits — the match key) and **`doNotContact`**; there is no
unique index on the phone (uniqueness is enforced in `upsertClientByPhone`); request expiry runs lazily on read, not
on a timer; `decisionLog` is written from Wave 1a (plan 550); `knowledgeItems` gain `variations` and
`source: 'correction'`.

---

## Part 1 — How to run this session

### Step 0 — Housekeeping (before planning)

1. Save this brief as `docs/frontdesk/frontdesk-program-brief.md` and the 2026-11-09 file as
   `docs/frontdesk/reference-bookings-engine.md` (new folder; docs-only chore through the normal ship lane —
   `branch-guard.sh` allows only plan files and `.claude/todo.md` on `main`). Do not block planning on that merge.
2. Read: `AGENTS.md`, `.claude/commands/plan.md`, `.claude/references/prd-template.md`,
   `.claude/skills/save-plan/SKILL.md`, `docs/brain/invariants.md`, `docs/brain/decisions/0023-*`, `0026-*`, `0027-*`,
   `docs/brain/gotchas.md`, `docs/agent/plan-checks.md`, `docs/agent/standards-backend.md`, `standards-angular.md`,
   `standards-domain.md`, `standards-reuse.md`, `docs/brain/component-families.md`, `_shared/tech-stack.md`,
   `docs/mvp/mvp-map.md` (the format to repeat), `docs/mvp/run-mode.md`, and closed plans 512–516, 527 (clients),
   442–443 (stages, inquiry), 431 (baseline, setup checklist), 447 (performance), 430 (usage record).
3. `git fetch origin` and re-verify every fact in "Reality Check seeds" (Part 3 intro) against live `origin/main`.
   This brief is a starting map, not truth.

### Step 1 — Plan map — DONE (approved 2026-11-10; do not redo)

The map exists at `docs/frontdesk/frontdesk-map.md` with plan numbers 543–568, lanes, hotspots, Reality Check
deltas and frozen Contracts. Re-verify its "Reality Check deltas" only if `origin/main` moved past `05741afd`
(`node scripts/scope-check.mjs --drift`), then go to Step 2. The original instruction is kept below for reference.

#### (original) Plan map (STOP for Dandan's approval)

Produce `docs/frontdesk/frontdesk-map.md` in the shape of `docs/mvp/mvp-map.md`: one table (Map# · NNN · spec ·
title · lane/slot · depends on), lanes, the "must not run at the same time" list (shared hotspots), Human gates,
Reality Check deltas, and the **Contracts** section (Step 1b). Start from Part 4; you own the final split — each plan =
one Worker session. Ask Part 5's open questions in the same message. Wait for "approved" (or edits) before drafting.

### Step 1b — Contracts

Plans are written before their dependencies exist. Fix every cross-plan name once, in the map, and copy it verbatim
into every plan that uses it. Part 3 proposes them as `C-…` blocks; adjust after the Reality Check, then freeze.

### Step 2 — Write the plans

One `/plan` + `save-plan` per map row, in dependency order, using the **planning card** of that plan in Part 4
(scope seed, must-cover list, Done-when seeds, rules to quote, traps). A card is a seed: verify every path and
symbol in it against the live repo before it goes into a plan. If a card cannot be turned into a plan without a
product decision, put the decision in the plan's `## Critical Questions` with choices and stop — never guess.
Plans 560–565 (Wave 1b) are drafted only after Wave 1a has run with the pilot business.

One `/plan` + `save-plan` per row, in dependency order. Every plan: PRD template shape, `Depends-on:`, parsed
`## Read-Write Scope` with test locations, `## Architecture Impact`, `## Reuse Check`, tagged Done-when
(`[auto]` / `[ui]` / `[human]`), the plan-checks `[auto] log-query` item, dictionary keys named, Lucide icons named,
stories "As a chef / owner / host…". UI-heavy plans whose main work is look and layout → `Track: design` in
`plans/design/`. A plan that adds a collection follows `standards-backend.md` §3 (schema, `COLLECTIONS`, model + data
service, cross-business test). A plan that migrates data sets `Isolated DB: yes` and carries the Atlas final-gate
commands (dry-run default, `--write=yes --backup-dir=`, `--confirm-host=`).

### Step 3 — Run

Wave 1a first (no external dependency), validated by Dandan with one real pilot business, then Wave 1b. Use the
existing run mode (`/orchestrate <NNN,…> <run name>` → run branch `orch/<run>`, Dandan merges). Suggested runs:
`fd-1a-data`, `fd-1a-ui`, `fd-1b`. Do **not** plan Waves 2–3 now (Part 6): they depend on what the pilot teaches.

---

## Part 2 — Cross-cutting rules (apply to every plan)

1. **Evolve, do not duplicate.** `clients` already exists with a schema, migration, data service, permission rule and
   two pickers. The CRM is built **on** it (FD-01). No parallel `guests` / `contacts` / `leads` collection.
2. **Customer-entity logic leaves the menu screens.** Whatever is about *who the customer is* (create, pick, edit, see
   history) moves to the CRM section and becomes shared pieces; menu screens keep only a link/chip and call the shared
   piece (FD-02). Growth-frozen files (`menu-intelligence.page.ts`, `cook-view.page.ts`, `recipe-builder.page.ts`,
   `product-form.component.ts`, `menu-export.service.ts`) keep net lines ≤ 0.
3. **Tenant and permissions unchanged in spirit.** Every new doc carries `baseDocShape`, is business-scoped through
   `server/utils/business-scope.js`, validated by Zod in `shared/schemas` (INV-4), authorised through
   `permissions.js` (`can` / `assertCan`). New collections are never cloneable (no `_masterId`).
4. **Guest-originated writes have one door.** Anything a non-member causes (public form, WhatsApp webhook) enters only
   through `server/routes/public.js` / `server/routes/webhooks-whatsapp.js`, is bound to the business resolved by the
   server (slug or phone-number id), stamps `createdBy: 'public:<channel>'`, and can read back only what its own
   unguessable token names. This needs an INV-1 amendment + ADR (Part 5, Q1).
5. **Server-owned fields.** Status, status history, source, channel stamps, AI stamps and counters are written only by
   dedicated routers (pattern: `events.js` — `loadX`, `validMerged`, `writeConditional`, `fail`, actor from the token);
   the generic API strips them (pattern: `EVENT_SERVER_FIELDS`).
6. **The assistant never decides.** In Wave 1 no AI output creates or confirms a booking or an event. It produces a
   reply and a *request* in status `new`/`qualified`; a member approves. All Gemini calls go through
   `server/services/gemini-client.js` (INV-6). No client-side key.
7. **Record the decision trail.** Every AI suggestion and every human approval/decline/edit is stored (FD-07
   `decisionLog`) — this is the dataset that later justifies automation and the evidence shown to new customers.
8. **Hebrew RTL, dictionary only.** All strings via `translatePipe` + `dictionary.json` (append-only); canonical values
   are English keys. Public pages are Hebrew in Wave 1 (D9). Lucide icons registered in `app.config.ts`.
   **Model prompts are English only (D12)** — Hebrew appears in a prompt only as data (customer text, knowledge).
9. **Reuse first.** `app-list-shell`, `app-page-header`, `app-empty-state`, `app-modal-shell`, `ConfirmModalService`,
   `app-search-combobox`, `app-custom-select`, `app-custom-multi-select`, `app-date-field`, `app-time-field`,
   `app-counter`, `app-hours-editor`, `BaseEntityDataService`, `.c-*` engines in `src/styles.scss`. A new family needs
   rung 4 + `why:`. Every new screen is a lazy route (bundle budget).
10. **Privacy.** Contacts are personal data (Protection of Privacy Law, Amendment 13). Phone numbers never in logs.
    Marketing consent stored with time and channel; no marketing messages in this program. Retention and
    delete-by-phone are specified in FD-12.
11. **Free-tier reality.** Render free tier sleeps (cold start 30–60 s), Atlas M0 has 512 MB, Gemini free tier is
    20–500 calls/day for the whole platform. Wave 1a must work fully inside these (D5–D7 fix the Wave 1b choices).
12. **Every model call is metered (D8, R-21).** No plan adds a `callGemini` call without `usage: { businessId,
    userId?, feature }` and a `feature` key registered in `server/constants/ai-features.js` (C-AIUSAGE).
13. **Behaviour rules.** A plan that touches messaging, the assistant or client matching quotes the `R-nn` rules it
    implements from `docs/frontdesk/assistant-behaviour-rules.md`, each with an `[auto]` test.
14. **No other project is named anywhere (D13).**
15. **Nothing is gated on owner-supplied history (D15).** Every screen and number works for a business that
    entered no baseline.

---

## Part 3 — Product specs

### Reality Check seeds (verified at `05741afd`; re-verify)

- `shared/schemas/entities/client.schema.ts`: `name`, `phone`, `phoneNormalized` (server-derived), `clientType`
  (`private | business | production_company`), `companyName?`, `email?`, `notes?`, `source?`. Not cloneable, hard delete
  (`collections.js`: `softDelete: false`). ADR 0027.
- `server/utils/permissions.js`: `ACTIONS = create, edit, delete, editMoney, changeStage, addNote, markArrival,
  manageTeam, editSettings, editTaxonomy`; `OWNER_ONLY_TYPES = { clients }`. `shared/schemas/staff-fields.ts`:
  `STAFF_READ_FIELDS.clients = ['name','phone']`.
- Client UI exists only inside menu screens: `src/app/pages/menu-library/components/new-inquiry-dialog/` (client picker,
  plan 515) and `src/app/pages/menu-intelligence/components/event-stage-bar/` (client row + picker + details, plan 516).
  `ClientDataService` (`src/app/core/services/client-data.service.ts`), `client-display.util.ts`,
  `clientsEnsureLoadedResolver`. **There is no clients page and no route.**
- `menuEvents` carry `clientId`, `clientName`, `clientPhone` (snapshot), `stage` + `stageHistory` + `notes`
  (server-owned), `deposit`. A generic POST starts an event in `inquiry`.
- Navigation: `src/app/core/components/tab-chips/tab-chips.component.ts` — groups `dashboard | inventory | recipes |
  menus` (`GROUP_BY_PATH_PREFIX`, `CHIPS_BY_GROUP`); header in `src/app/core/components/header/`.
  `app.component.html` renders `<app-header />` and `<app-tab-chips />` unconditionally.
- Settings: `/settings` with `SETTINGS_TABS` (`team`, `business`, `baseline`) in `src/app/pages/settings/settings-tabs.ts`.
- Business doc: `settings`, `baseline` (`inquiriesPerMonth`, `eventsClosedPerMonth`, `avgRevenuePerEvent`,
  `estProfitPct`), `staffVisibleStages`; routes in `server/routes/business.js` incl. `GET /setup-status`.
- Stats: `GET /api/v1/stats/business` (`server/services/business-stats.js`); usage record `server/middleware/usage.js`.
- AI: `server/routes/ai.js` (JSON-shaped prompts such as `/parse-text`, `/generate-from-url`; no function calling in
  use), `aiLimiter` 20 req / 15 min per user. `gemini-client.js`: one call per request, model chain, free-tier budgets.
- Server mounts (`server/app.js`): `/api/v1/{log,auth,data,events,ai,admin,business,stats,product-import}`. No public
  router, no webhook, no scheduler other than `server/jobs/purge-deleted.js`. No WhatsApp / SMS / e-mail dependency.
- Auth interceptor adds `Authorization` only when a token exists, so anonymous calls to our own API need no bypass.
- `ngsw-config.json` has no `navigationUrls`: every navigation is served the cached shell.
- Highest ADR: 0029. Highest migration: 0010. Client runtime code is already shared from `shared/schemas`
  (`snapshotActionOnStage`), so shared pure logic can live there.

---

### FD-01 — Clients become the CRM foundation (schema, permissions, migration)

**Exists:** the `clients` entity as above. **Problem:** it models only "who an event is for", is owner-only, has no
lifecycle, no tags, no consent, no history, and is deleted hard.

**Change (same collection, wider shape):**

```ts
// additions to clientSchema — all optional so existing docs validate; migration 0011 backfills
kinds: z.array(z.enum(['diner', 'event_client', 'lead'])).max(3).optional(),   // derived by the server from what the client has
tags: z.array(z.string().max(40)).max(12).optional(),                           // free tags + reserved: vip, allergy, repeat_no_show
lifecycle: z.enum(['new', 'active', 'dormant']).optional(),                     // server-derived
firstSeenAt: z.number().optional(), lastContactAt: z.number().optional(),       // server-owned
counters: z.strictObject({ requests: z.number().int(), bookings: z.number().int(), events: z.number().int(),
                           noShows: z.number().int(), conversations: z.number().int() }).optional(),   // server-owned
consent: z.strictObject({ terms: z.number().optional(),
                          marketing: z.strictObject({ given: z.boolean(), at: z.number(), via: z.string().max(40) }).optional() }).optional(),
language: z.enum(['he', 'en', 'ar', 'ru']).optional(),
waId: z.string().max(30).optional(),                                            // WhatsApp id once a conversation exists (server-owned)
mergedInto: z.string().optional()                                               // duplicate handling (FD-02)
```

- `source` stays free text but the server writes canonical keys for its own creations: `manual`, `public_form`,
  `whatsapp`, `event_migration`.
- Index `{ businessId, phoneKey }`, **not unique** (a trashed or merged client keeps its phone). Uniqueness over
  live, unmerged clients is enforced in `upsertClientByPhone`; restoring a client whose phone is taken → 409
  `PHONE_TAKEN`. Migration 0011 reports existing collisions in its dry-run and resolves them only by `mergedInto`.
- **Soft delete** for clients (`softDelete: true`, Trash lists them) — a CRM cannot lose a customer by one click.
  This reverses a line of ADR 0027 → new ADR superseding that point.
- **Permissions (D2):** `clients` stays in `OWNER_ONLY_TYPES`. A staff member (host) causes a client only by
  creating a manual request (`manageRequests`) — the server runs `upsertClientByPhone`. Staff read
  `STAFF_READ_FIELDS.clients = ['name','phone','tags','kinds']`. No new action. Platform admin unchanged.
- **Match key (R-01):** `phoneKey` = last 9 digits of `phoneNormalized` (all digits when fewer than 9), server-derived;
  `upsertClientByPhone` matches on it. **Do-not-contact (R-02):** `doNotContact?: { at, reason, via }`, server-owned.
- `CLIENT_SERVER_FIELDS` (stripped by the generic API): `phoneNormalized`, `kinds`, `lifecycle`, `firstSeenAt`,
  `lastContactAt`, `counters`, `waId`, `mergedInto`, `phoneKey`, `doNotContact`.

**C-CONTACT:** the collection name stays `clients`; the TS type stays `Client`; UI word "לקוח / לקוחות". Find-or-create
by phone lives in one server function `server/utils/client-upsert.js` → `upsertClientByPhone(db, businessId, { name,
phone, source, actor })` used by events, requests, public and webhook routers. Client util `normalizePhone` already
exists (`client-display.util.ts`) — the server twin must give identical digits (shared test vector).

**Done-when seeds:** [auto] migration 0011 dry-run + verify on a scratch copy; [auto] cross-business + staff/owner
permission tests; [auto] generic PUT cannot change a server field; [human] ADR text approved.

---

### FD-02 — A real CRM section: `/clients`

**Exists:** nothing visible; client creation/picking is embedded in two menu components.

**Build:**
- Routes (append to `app.routes.ts`): `/clients` (list), `/clients/:id` (profile), guarded by `authGuard`,
  `resolve: clientsEnsureLoadedResolver`. New nav group `frontdesk` in `tab-chips` (see FD-06 for the full chip list)
  and a header entry.
- **List** (`app-list-shell`): name, phone, kinds chips, tags, last contact, counters; search (existing
  `matchesClientQuery`), filters by kind / tag / lifecycle, sort by last contact. Add client → shared
  `client-form` (modal-shell).
- **Profile**: header (name, phone with tap-to-call and tap-to-WhatsApp, tags, kinds), then one **timeline** merging
  everything the business knows: requests (FD-03), bookings, events with their stage (link to
  `/menu-intelligence/:id`), conversations (FD-06), notes. Owner sees notes/consent/e-mail; staff see the trimmed view.
  Actions: new request, new event inquiry, add note, merge duplicate (owner).
- **Move customer logic out of the menus (the refactor Dandan asked for):**
  - Extract the client picker + "add new client" inline form used by `new-inquiry-dialog` and `event-stage-bar` into
    one shared piece `src/app/shared/client-picker/` (`app-client-picker`: search by name/phone, add-option row per the
    add-option rule, emits a `Client`). Both existing components consume it; their own picker code is deleted.
  - `event-stage-bar`'s client row becomes a chip linking to `/clients/:id` plus "change"; the inline client details
    editor is removed from the stage bar (editing happens on the profile).
  - "פנייה חדשה" is no longer owned by the menu library: `NewInquiryDialogComponent` moves to
    `src/app/pages/clients/components/new-inquiry-dialog/` (or `shared/` if two pages open it) and is opened from the
    client profile, the requests screen and — unchanged for the user — the menu library button.
  - Register the new family in `docs/brain/component-families.md`; `reuse-lint --check-registry` stays green.
- **Duplicates:** merge A into B (owner): server re-keys `clientId` on `menuEvents`, `requests`, `bookings`,
  `conversations` in one request (INV-3), stamps `mergedInto` on A and soft-deletes it.

**Done-when seeds:** [ui] `/clients` lists a client created from the inquiry dialog; [ui] profile shows that event in
the timeline; [auto] merge re-keys all four collections in one request; [auto] `menu-intelligence.page.ts` net lines ≤ 0;
[human] the menu screens feel unchanged except the client chip now opens the profile.

---

### FD-03 — Requests: one object for "a customer wants something"

**Exists:** only event inquiries, created directly as `menuEvents` by a member.

**New collection `requests`** — the single intake object for every channel and every business type.

```ts
export const REQUEST_KINDS = ['table', 'event', 'tasting', 'consultation'] as const
export const REQUEST_STATUSES = ['new', 'qualified', 'needs_info', 'approved', 'declined', 'cancelled', 'expired'] as const
export const REQUEST_CHANNELS = ['manual', 'public_form', 'whatsapp'] as const
requestSchema = z.strictObject({ ...baseDocShape,
  kind, status, channel, clientId: z.string(),
  guestName: nameField, guestPhone: z.string().max(30),                 // snapshot, like menuEvents.clientName
  wanted: z.strictObject({ date: z.string().optional(), time: z.string().optional(), partySize: z.number().int().min(1).max(5000).optional(),
                           eventTypeKey: z.string().optional(), budgetPerGuest: z.number().min(0).optional(), location: z.string().max(200).optional() }),
  answers: z.array(z.strictObject({ questionKey: z.string().max(60), label: z.string().max(120), value: z.string().max(500) })).max(30),
  qualification: z.strictObject({ verdict: z.enum(['fit', 'borderline', 'unfit']), reasons: z.array(z.string().max(80)).max(8), by: z.enum(['rules', 'ai', 'member']) }).optional(),
  statusHistory: [{ status, at, by, byName, via: 'member' | 'guest' | 'ai' | 'server', note? }],
  outcome: z.strictObject({ type: z.enum(['booking', 'menuEvent']), id: z.string() }).optional(),   // set on approve
  publicToken: z.string().min(16), conversationId: z.string().optional(),
  suggested: z.strictObject({ action: z.enum(['approve', 'decline', 'ask']), text: z.string().max(600).optional(), at: z.number() }).optional()  // FD-07
})
```

- **Approve** (member, one tap) → the server creates the outcome in the same request:
  - `event` → a `menuEvents` doc in stage `inquiry` exactly as the generic POST does today (name
    `<client> – <event type> <date>`, `guestCount`, `eventDate`, `eventType` snapshot, `clientId` + snapshot, first note
    = the request summary via the notes rule), `outcome = { menuEvent }`.
  - `table | tasting | consultation` → a `bookings` doc (below), `outcome = { booking }`.
  The approver can edit date/time/party before approving. Decline takes a reason key
  (`full | out_of_area | below_minimum | date_taken | other`) + optional text.
- **`bookings` (Wave 1 = a calendar record, no engine):** `{ kind: 'table' | 'tasting' | 'consultation', status:
  'confirmed' | 'seated' | 'finished' | 'no_show' | 'cancelled', source, date, time, startAt, endAt, durationMinutes,
  partySize, clientId, guestName, guestPhone, requestId?, notes?, statusHistory, publicToken }`. Server-owned: `status`,
  `statusHistory`, `source`, `startAt`, `endAt`, `publicToken`. Hebrew labels stay "הגיעו" / "סיימו". The approve screen shows the day's existing bookings and total covers per hour beside the
  request so the person decides with the load in view (this is the manual stand-in for the Wave 2 engine; the engine
  spec is in `reference-bookings-engine.md` §5.3 and must be able to read this same collection).
- Dedicated router `server/routes/requests.js` mounted at `/api/v1/requests` (`POST /` manual, `PUT /:id/status`,
  `POST /:id/approve`, `POST /:id/decline`, `PUT /:id/wanted`) and `server/routes/bookings.js` at `/api/v1/bookings`
  (`PUT /:id/status`, `GET /day?date=`). Reads through the generic API (members), writes only through these routers.
- Permissions: new action `manageRequests` (any member). Staff visibility for the resulting `menuEvents` keeps the
  existing `staffVisibleStages` rule.
- Expiry: `new`/`needs_info` older than the profile's `expireAfterHours` → `expired`, applied lazily by
  `expireDue(db, businessId, now)` on `GET /requests` and before approve/decline (same lazy pattern as
  `purge-deleted.js`; there is no scheduler and the free server sleeps).
- `decisionLog` (see FD-07) is written by this router from Wave 1a on every approve / decline / ask.

**UI:** `/requests` — the owner's work queue. Tabs: waiting (new + qualified + needs_info) / approved / declined.
Each card: who, what they want, the qualification verdict with its reasons, the answers, the day load strip (for
time-bound kinds), buttons **Approve / Ask / Decline**. `/bookings` — a simple day/week agenda of confirmed bookings
with status actions (seated, finished, no-show). Manual "new request" for phone calls.

**C-REQUEST:** names above are final: collections `requests`, `bookings`; enums as written; `outcome.type` values;
router paths.

**Done-when seeds:** [auto] approve of an `event` request yields a `menuEvents` doc in `inquiry` with the client linked
and is idempotent (second approve → 409 `ALREADY_DECIDED`); [auto] status-move rules; [auto] generic write of
`status` is ignored; [ui] approve a table request on `/requests` and see it on `/bookings`.

---

### FD-04 — Front Desk profile: one configuration per business

**New collection `frontDeskProfiles`** (one doc per business, owner-only write, not cloneable). It is what Dandan fills
with the owner during onboarding and what the public page, the rules and the assistant all read.

```ts
{ businessType: 'restaurant' | 'private_chef' | 'catering' | 'other',
  slug, displayName, logoUrl?, phone?, address?, serviceArea?: string, hours: hoursRow[] (same shape as venue.operatingHours), closedDates?: string[],
  requestKinds: { [kind]: { enabled: boolean,
                     questions: [{ key, label, type: 'text'|'number'|'date'|'time'|'choice', options?: string[], required: boolean }],   // ≤ 12
                     rules: { minPartySize?, maxPartySize?, minLeadHours?, maxLeadDays?, minBudgetPerGuest?, areas?: string[] },
                     defaultDurationMinutes?, expireAfterHours: number } },
  whatsapp?: { phoneNumberId?, ownerAlertPhone?, ownerAlertOptIn },   // server-side only (FD-06)
  assistant: { level: 0 | 1 | 2, tone: 'warm' | 'formal', greeting?: string, handoffText?: string, activeHours?: hoursRow[] },   // FD-07
  status: 'draft' | 'pilot' | 'active' | 'suspended' }                                                                            // FD-11
```

- **Templates:** `shared/schemas/front-desk-templates.ts` exports a default profile per `businessType` (questions and
  rules pre-filled in Hebrew via dictionary keys): restaurant → `table` (date, time, party, seating preference,
  occasion); private chef → `consultation` + `event` (date, guests, location, kitchen on site?, dietary needs, budget
  per guest); catering → `event` + `tasting` (date, guests, event type from `taxonomyTerms` `eventType`, venue, serving
  style, budget). Creating a profile copies the template; the owner edits it.
- **Qualification rules** are pure: `shared/front-desk/qualify.ts` → `qualify(profileKind, wanted, answers) →
  { verdict, reasons[] }` — used by the server on every new request and by the client to preview. This is the
  "stop wasting time on irrelevant customers" feature and it works without any AI.
- UI: `/frontdesk/settings` — titled cards: Business type + link, Hours (`app-hours-editor`), per-kind card (enable,
  questions editor, rules), Assistant (FD-07), Status. `canDeactivate: pendingChangesGuard`.
- Permissions: new owner-only action `editFrontDesk`; `frontDeskProfiles` in `OWNER_ONLY_TYPES`.

**C-PROFILE:** collection `frontDeskProfiles`, field names as above, `qualify` signature, slug regex
`^[a-z0-9-]{3,40}$` with a unique index.

---

### FD-05 — Knowledge base: what the business knows about itself

**New collection `knowledgeItems`** — short facts the assistant (and a new host) may use:
`{ topic: 'hours' | 'location' | 'menu' | 'prices' | 'policy' | 'dietary' | 'events' | 'faq' | 'other', question:
string ≤ 200, answer: string ≤ 1200, status: 'draft' | 'approved', source: 'manual' | 'ai_import', visibility:
'public' | 'internal', variations?: string[] (≤ 5 × 200 — other phrasings of the question) }`; `source` also takes
`'correction'` (R-14). Only `approved` + `public` items ever reach a customer.

- UI: `/frontdesk/knowledge` — list by topic, add/edit (owner), approve drafts in bulk.
- **AI import (concierge speed):** paste text or give a URL (site, menu page) → `POST /api/v1/ai/knowledge-import`
  (same shape and limiter as `/parse-text` / `/generate-from-url`) returns draft items; nothing is approved without
  the owner. Hard cap 60 items per import.
- Derived facts: hours, address, phone are rendered from the profile at answer time — never duplicated into items.
- Server helper `server/services/knowledge.js` → `publicFacts(businessId)` = profile facts + approved public items,
  size-capped; the only source the assistant is given.

**C-KB:** collection `knowledgeItems`, `publicFacts` signature and cap (target ≤ 6,000 characters).

---

### FD-08 — Public request page: the first channel (no WhatsApp API needed)

Listed before FD-06/07 on purpose: it ships in Wave 1a and makes the product usable by a pilot business on day one —
the owner puts one link in Instagram, Google Business Profile and their WhatsApp auto-reply.

- Routes: `/book/:slug` (kind picker when several are enabled → the kind's questions → name + phone + terms consent →
  done page with reference and "we will confirm shortly"), `/book/:slug/r/:token` (the guest's own request/booking:
  status, cancel). Rendered **without the app shell**: route data `{ bare: true }` read by a new `LayoutModeService`
  (one signal); `app.component.html` wraps `<app-header />` and `<app-tab-chips />` in `@if`. Lazy-loaded; initial
  bundle unchanged.
- Server: new `server/routes/public.js` at `/api/v1/public`: `GET /:slug` (public subset of the profile + enabled kinds
  + questions), `POST /:slug/requests` (Zod input schema in `shared/schemas/public/`, honeypot, `publicLimiter` keyed
  by IP + slug: 20 writes / 15 min), `GET /:slug/requests/:token`, `POST /:slug/requests/:token/cancel`. The server
  runs `upsertClientByPhone`, `qualify`, stores the request `channel: 'public_form'`, `createdBy: 'public:form'`.
- Owner notification in Wave 1a: in-app only — a badge on the `frontdesk` nav group and the dashboard card (polling the
  count endpoint on focus, no websocket). Push/WhatsApp notification to the owner comes with FD-06.
- The done page carries a WhatsApp deep link `wa.me/<business phone>?text=<reference>` so the customer can continue on
  the business's existing WhatsApp today (no API), and the footer line "Powered by FoodVibe" (Q8).
- Design: the page looks like the *business* (logo, name, one accent), not like FoodVibe; phone-first, RTL.

**C-PUBLIC:** paths above; `publicToken` = 24 random bytes base64url; guest text is never rendered as HTML.

---

### FD-06 — Conversations and the inbox (WhatsApp)

**New collections** `conversations` (`{ clientId, channel: 'whatsapp', waId, status: 'bot' | 'human' | 'closed',
assignedTo?, lastMessageAt, lastInboundAt, unread: number, requestId?, windowExpiresAt }`) and `messages`
(`{ conversationId, direction: 'in' | 'out', author: 'guest' | 'ai' | 'member', memberId?, text ≤ 4000, at,
providerMessageId, status, kind: 'text' | 'template' | 'button' }`, TTL policy in FD-12). Server-owned, read by members
through a dedicated router `server/routes/conversations.js` (`GET /` list, `GET /:id/messages`, `POST /:id/messages`
member reply, `PUT /:id/takeover`, `PUT /:id/release`, `PUT /:id/close`).

- **Channel:** Meta WhatsApp Cloud API, called from one file `server/services/whatsapp-client.js`. Webhook
  `server/routes/webhooks-whatsapp.js` (`GET` verify token; `POST` with `X-Hub-Signature-256` HMAC check, idempotent on
  `providerMessageId`, answers 200 immediately and processes in-process). Business resolved from the receiving
  phone-number id stored on the profile (`whatsapp.phoneNumberId`, server-side only).
- **Cost rule:** conversations are guest-initiated (the public page and the business's link send the customer to
  write first). Replies inside the 24-hour window are sent as free-form messages; outside it only approved *utility*
  templates (`request_received`, `request_approved`, `request_declined`, `need_more_info`). No marketing templates.
- **Inbox UI** `/inbox`: conversation list (unread first, who holds it: bot / me / other member) → thread view with
  the client chip, the linked request card with its Approve / Ask / Decline buttons, a reply box, **Take over** /
  **Hand back to assistant**. On phones: list → thread, bottom sheet for the request.
- Nav group `frontdesk` chips: `inbox`, `requests`, `bookings`, `clients`, `knowledge`, `settings` (labels:
  "שיחות", "בקשות", "יומן", "לקוחות", "מידע על העסק", "הגדרות"). Unread/pending count badge on the group.
- Owner alert: when a request reaches `qualified` or a conversation needs a human, send the owner a WhatsApp utility
  template to their own phone (opt-in on the profile) — this is what makes "approve in one tap" real when the app is closed.
- Permissions: action `manageConversations` (any member).

**C-CONV:** collection and field names above; conversation `status` meanings: `bot` = the assistant may reply,
`human` = only members reply, `closed` = archived (a new inbound message reopens as `bot` or `human` per profile).

- **Number model (D5):** development and the first pilot run on one shared FoodVibe number. `resolveBusiness({
  phoneNumberId, waId, text })` order: dedicated `whatsapp.phoneNumberId` → open conversation of this `waId` →
  request reference or slug in the text (the public page's `wa.me` link pre-fills it) → one fixed "which business?"
  reply with no AI call. Outbound on the shared number is prefixed with the business display name.
- Behaviour rules that belong to this spec: R-02 (send guard), R-03 (coalesce bursts), R-12 (buttons), R-13 (voice
  notes, D11), R-17 (owner alert hygiene), R-19.

**Infra gate:** Meta business verification (long lead — start now), the shared test number, the uptime ping (D6).

---

### FD-07 — The assistant (assist mode)

- **Default level is 0 during development (D7);** level 1 is set per business by the platform admin.
- **Levels (profile `assistant.level`):** `0` — drafts only: for each inbound message the AI writes a suggested reply
  and a member sends or edits it. `1` (pilot default) — answers factual questions from `publicFacts` and collects the
  kind's questions on its own; never promises availability or price beyond the knowledge base; when the request is
  complete it says the business will confirm, creates/updates the `request`, and stops. `2` — auto-approve by rules
  (Wave 2, not planned now; the field value is reserved).
- **One turn = one Gemini call** through `gemini-client.js`, JSON-shaped like the existing prompts (no function
  calling): input = system rules + `publicFacts` + the kind's questions and rules + the last 12 messages + the request
  so far; output schema `{ reply: string, intent: 'question' | 'request' | 'change' | 'cancel' | 'smalltalk' | 'other',
  kind?: RequestKind, collected: { [questionKey]: string }, wanted: {…}, missing: string[], handoff: boolean,
  handoffReason?: string, usedFacts: string[] }`. The server — not the model — validates `collected`, runs `qualify`,
  writes the request, and decides whether to send `reply` (level 1) or store it as a suggestion (level 0).
- **Guardrails (server-enforced):** hand off to a human on `handoff`, on 2 consecutive low-content turns, after 8 AI
  turns in one conversation, on any message containing a complaint/refund/allergy-emergency keyword list, and outside
  `assistant.activeHours` if set. A reply that states a time, a price or "confirmed" not present in `usedFacts` is
  blocked and turned into a handoff. Per-business daily cap on AI turns (`frontDeskUsage.aiTurns`); when the model
  chain reports `model_exhausted` the conversation goes to `human` with the standard handoff text.
- **Request suggestion:** for a complete request the AI also fills `request.suggested` (`approve | decline | ask` +
  one line why). The owner sees it on the card.
- **`decisionLog` collection:** `{ requestId, suggestion, verdict, decidedAction, decidedBy, editedFields[], secondsToDecision, at }`
  written by the requests router on every approve/decline/ask. This is the automation dataset (rule 7).
- New route `POST /api/v1/ai/frontdesk-turn` is **internal** (called by the webhook handler and the inbox "suggest"
  button, never by the browser of a guest); own limiter keyed by `businessId`.
- Eval script `server/scripts/ai-eval-frontdesk.js` (pattern: `ai-eval-recipes.js`): 30 Hebrew dialogues — 10 per
  business type — with expected `intent`, `collected`, `handoff`. A plan's `[auto]` = score ≥ 26/30 on the chosen model.
- **English system prompt (D12)** lives in `server/services/frontdesk-prompt.js`, written from scratch, with the
  business tone as a parameter; it tells the model to answer in the customer's language (Hebrew by default). Prompt
  changes are code changes (reviewed), not runtime-editable in Wave 1. The eval dialogues are Hebrew on the customer side.
- Behaviour rules that belong to this spec: R-04 … R-11, R-16, R-18, R-20, each with a server-side test.
- Every turn is metered: `feature: 'frontdesk_turn'` / `'frontdesk_suggest'` (C-AIUSAGE). The per-business daily cap
  reads the `aiUsage` ledger — no second counter.

**C-AI:** output schema above; level meanings; the rule "the server writes, the model proposes".

**Infra note:** development runs on the free chain (D7). Whether to buy a paid key is decided at deployment from the
plan-566 numbers.

---

### FD-09 — Value dashboard: the numbers that sell

- **Measured first (D15).** Every number on this dashboard is computed from what FoodVibe recorded, from the
  business's first day of use; the baseline is an optional extra column, labelled "הערכת בעל העסק", shown only for
  the fields that were filled. The baseline fields themselves are added by plan 567 (FD-14), not here.
- **Baseline (optional — extend plan 431's `business.baseline`):** `phoneInquiriesPerDay?`,
  `messagesPerDay?`, `avgResponseMinutes?`, `hostHoursPerWeek?`, `noShowsPerWeek?`, `missedInquiriesPerWeek?`
  (owner's estimate). All optional numbers.
- **Measured (server, extend `business-stats.js` → `GET /api/v1/stats/frontdesk?from&to`):** requests by channel and
  kind; share captured outside opening hours; median minutes from first message to request and from request to
  decision; approved / declined / expired; declines by reason; AI turns, share of conversations finished without a
  human message; suggestion-agreement rate (from `decisionLog`); bookings `no_show` rate; events created from requests
  and, when they close, their revenue (from existing event pricing/closing).
- **Owner view:** a card group on the dashboard + `/frontdesk` home: "this week the front desk handled N
  conversations, captured M requests (K after hours), you approved X in a median of Y minutes" next to the baseline.
- **Platform admin view (extend `/platform`):** the same numbers per business, plus pilot health (last activity from
  the usage record). Export as CSV. Aggregated/anonymised only — no contact names or phones leave a business.

---

### FD-10 — Concierge onboarding kit

Onboarding is done by Dandan with the owner. The product must tell him exactly what is missing.

- **Onboarding checklist per business type** computed by the server (`GET /api/v1/business/setup-status` grows a
  `frontDesk` block): profile basics, hours, kinds enabled with questions and rules reviewed, ≥ N approved knowledge
  items per required topic (restaurant: hours, location, menu, policy; private chef: prices, events, dietary, policy;
  catering: events, prices, policy), link published, WhatsApp connected (1b), a test request approved.
  Shown as a new card beside the existing `setup-checklist-card` and to the platform admin per business.
- **Intake form:** `/frontdesk/onboarding` — one long, printable, type-specific form that mirrors Appendix A; saving it
  writes the profile, the baseline and draft knowledge items in one go (so a 45-minute sitting produces a working
  front desk). Works offline-tolerant: local draft in memory + explicit save, `pendingChangesGuard`.
- **Baseline is an optional section of the form (D15):** collapsed by default, every field optional, a visible
  "skip — measure from today" choice; saving the form never fails because of it, and the checklist never lists it.
- **Who types (D4):** Dandan works in the owner's account during the sitting. No impersonation feature now.
- **Test chat (R-15, added with Wave 1b):** the owner talks to the assistant inside the app; nothing leaves the app.
- **Test mode:** a "send a test request" button that creates a request flagged `test: true` (excluded from stats) so
  the owner sees the whole loop before publishing the link.

---

### FD-11 — Pilot, paid, suspended (entitlements stub — no billing yet)

- `frontDeskProfiles.status`: `draft` (not public) → `pilot` (free) → `active` (paying; set by platform admin) →
  `suspended`. Set through a platform-admin route only, logged with reason.
- `suspended`: the public page answers "not available", the webhook stores inbound messages but the assistant is
  silent and members get a banner; **all data stays readable and exportable** by the owner (CSV export of clients,
  requests, bookings — also the answer to "can I take my customers with me?").
- No payments, invoices or plans UI in this program. Field `business.frontDeskPlan: 'pilot' | 'basic' | 'pro'` is
  reserved (server-written) so Wave 2 features can check it.

---

### FD-12 — Platform readiness (docs and small code)

- ADR for guest-originated writes (Q1) and for the clients changes (FD-01); invariants file updated by the plan that
  owns each ADR.
- `docs/security-go-live.md`: new section — public endpoints, webhook verification, rate limits, data retention
  (`messages` 12 months then purge job; `requests`/`bookings` 24 months; `decisionLog` kept, no personal fields),
  delete-by-phone script `server/scripts/erase-client.js` (takes `--target`, local by default, per plan 531's rule).
- `render.yaml`: document new env vars as `sync: false` with comments (`PUBLIC_BASE_URL`, `WHATSAPP_TOKEN`,
  `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`); the live service is configured by hand, so the plan's `[human]`
  item lists the dashboard steps.
- Pilot terms (a one-page Hebrew text, written by the plan as a draft for Dandan's lawyer): free pilot, the business
  owns its customer data, the platform may use aggregated anonymised statistics, either side may stop, export on exit.
- `standards-backend.md` §1/§5 updated with every new collection and route by the plan that adds it.

---

### FD-13 — AI usage ledger (D8)

**Exists:** `server/services/gemini-client.js` counts calls per model per day (`incrementUsage`) for the quota
chain. It records no tokens, no business and no feature; `callGemini({ body, timeoutMs, log, eventPrefix,
needsVision, model })` does not know who called it.

**Build (C-AIUSAGE in the map is the contract):**
- `callGemini` takes a required `usage: { businessId, userId?, feature }`. After every attempt (success or failure,
  every model in the chain that was actually called) it writes one `aiUsage` row: model, `inputTokens` /
  `outputTokens` / `totalTokens` from the response `usageMetadata`, `audioSeconds?`, `imageCount?`, `latencyMs`,
  `ok`, `errorCode?`, `estCostUsd`, `at`, `day` (Asia/Jerusalem). The write is fire-and-forget: a failed ledger write
  never fails the AI call (log `ai.usage.write_failed`).
- `server/constants/ai-features.js` — the closed list of feature keys; `server/constants/ai-prices.js` — USD price
  per model with a `pricesAsOf` date. `estCostUsd` is always computed at the paid-tier price, also on the free tier —
  that is the number product pricing needs. The Planner looks up the current published Gemini prices when
  drafting and records the source URL and date in the plan.
- Every existing `callGemini` caller in `server/routes/ai.js` and `server/routes/product-import.js` passes its
  feature key (the Planner lists each call site by line in the plan).
- `GET /api/v1/admin/ai-usage?from&to&groupBy=business|feature|model|day` (platform admin) → calls, tokens, cost.
  A table on `/platform`: per business — calls, tokens, estimated cost this month; drill-down by feature. CSV export.
- No prompt text, no reply text and no phone number is ever stored in the ledger.

**Done-when seeds:** [auto] a mocked Gemini response with `usageMetadata` produces one row with the right tokens and
cost; [auto] a failed call produces a row with `ok: false`; [auto] a `callGemini` call without `usage` fails the test
suite; [auto] cross-business: the admin route is 403 for a business owner; [ui] `/platform` shows the table;
[human] Dandan checks one real call's numbers against Google AI Studio's usage page.

---

### FD-14 — Business report: "where the business stands, and how it moved" (D15, D16)

**Why:** Dandan onboards a business and wants to show the owner, with numbers the product measured, how the
business improved since it started using FoodVibe — and to use the same page to advise the owner (culinary side:
food cost, pricing, what closes and what does not). It is one report page, **not** a consultant product.

**Exists:** `GET /api/v1/stats/business?period=30|90|all` (`server/services/business-stats.js` `shapeStats`) already
returns cards `inquiries`, `closed` (+ `closeRatePct`, `notClosed`), `revenue`, `accuracy` (planned vs actual profit
points), `usage`, each with an optional `baseline` and `changePct`; `business.baseline` (plan 431) has four optional
fields and an empty baseline means "skipped". Each event stores `pricing { foodCost, revenue, profit, profitPct,
partial }`, `planSnapshot`, `closing` (planned vs paid per supplier), `stageHistory`, `notClosedReason`.

**Principles:**
1. **Measured first.** The report's main comparison is *the business's own first period in FoodVibe vs its latest
   period* — data nobody can dress up. No baseline is needed for the report to work.
2. **Baseline is an optional extra column** ("לפני FoodVibe — הערכת בעל העסק"), shown per metric only when that
   field was filled, always visually different from measured numbers. It can be filled or edited at any time.
3. **Honest thresholds.** A metric with fewer than 3 events in a period shows "אין מספיק נתונים", never a number.
4. No personal data: the report has no client names or phones, so the platform admin may open it for any business.

**Plan 567 — optional "before" numbers.** Extend `baselineInputSchema` (all optional numbers, all estimates):
kitchen — `foodCostPct?`, `hoursPerWeekOrdering?`, `hoursPerWeekQuotes?`, `wastePct?`, `supplierOverrunPct?`;
front desk (moved here from FD-09) — `phoneInquiriesPerDay?`, `messagesPerDay?`, `avgResponseMinutes?`,
`hostHoursPerWeek?`, `noShowsPerWeek?`, `missedInquiriesPerWeek?`. The existing baseline tab in `/settings` gains two
collapsed groups ("מטבח", "לקוחות ופניות") with a one-line hint that these are estimates and may be skipped.
`PUT /api/v1/business/baseline` keeps its behaviour (owner only, empty = skipped).

**Plan 568 — the report.**
- Server: `GET /api/v1/stats/report?months=3|6|12` (owner; platform admin with `?businessId=`), built beside
  `shapeStats` in `business-stats.js` (or a new `business-report.js` if the file would grow past review size):
  - `series`: one point per calendar month (Asia/Jerusalem) for — inquiries, events closed, close rate %, revenue,
    average food cost % (finished or priced events, `pricing.partial !== true`), average profit %, profit per guest,
    pricing accuracy points (actual − planned profit %), supplier overrun % (`closing` paid vs `planSnapshot` planned),
    share of events with partial prices (data quality), active days.
  - `start` vs `latest`: the first 30 days counted from the business's first event `createdAt`, and the latest 30
    days; `changePct` / `changePts` per metric; `enough: boolean` per metric per window (principle 3).
  - `baseline`: the filled baseline fields mapped to the same metric keys, or `null`.
  - `findings`: up to 3, rule-based, **no AI call**, each `{ key, value, evidenceCount }` — e.g. events priced below
    the profit target, events closed with partial prices, the most common not-closed reason, the supplier with the
    largest overrun. Thresholds are constants in one file with tests.
- Client: lazy route `/report` (owner), reachable from the dashboard performance card; platform admin opens the
  same component from the business drill-down on `/platform`. Layout: header (business name, period picker) → "מאז
  שהתחלנו" strip (start vs latest, change arrows) → optional "לפני FoodVibe" column → monthly trend rows (small
  inline bars, no chart library unless one is already in the bundle) → findings cards → print button
  (`@media print` in the component stylesheet; one A4 page, RTL).
- Plan 559 (FD-09) adds the front desk block to this same report (requests captured, median time to decision,
  after-hours share) — it does not build a second page.

**Not in this track:** menu engineering (margin × popularity per dish), waste capture at event closing, labour
cost, AI-written advice, benchmarks across businesses. Each is a later plan if the pilot asks for it.

**Done-when seeds:** [auto] fixture of 8 events over 3 months → expected series, start/latest and findings;
[auto] a metric with 2 events returns `enough: false`; [auto] no baseline → `baseline: null` and the report still
returns 200; [auto] staff get 403, another business's owner gets 403, platform admin gets 200 with `businessId`;
[ui] `/report` shows "מאז שהתחלנו" for a seeded business; [human] the printed page is readable on one A4 sheet.

---

## Part 4 — Plan map and planning cards

**The authoritative table (numbers, lanes, depends-on, hotspots, Contracts) is `docs/frontdesk/frontdesk-map.md`.**
The table that follows is the original proposal, kept only for history — do not plan from it. The planning cards
after it are current.

### Planning cards (one per plan; every path is a seed to verify)

**543 · FD-12 · Safe door for non-members.** Scope seed: `server/routes/public.js` (new, empty router with a
`GET /health`-style probe only), `server/app.js` (mount `/api/v1/public`), `server/middleware/rate-limit.js`
(`publicLimiter`), `server/utils/actor.js` (new, `actorOf(req)`), `server/utils/public-token.js` (new),
`server/test/public-router.test.js`, `server/test/invariants.test.js`, `docs/brain/decisions/0030-*.md`,
`docs/brain/invariants.md`, `docs/agent/standards-backend.md`. Must cover: C-GUEST and C-ACTOR verbatim; the
limiter key is IP + slug and is IPv6-safe (see closed plan 528); honeypot helper; `createdBy: 'public:<channel>'`
helper; INV-1 rule sentence + Touches list. Done-when: [auto] 21st write in 15 min → 429; [auto] token is 32
base64url chars and unique over 10k draws; [auto] INV-1 test still green; [human] ADR text. Trap: the public router
must sit **after** `express.json` and must not pass through `verifyToken` or `recordUsage`.

**544 · FD-01 · Clients become CRM records.** Scope seed: `shared/schemas/entities/client.schema.ts`,
`shared/schemas/staff-fields.ts`, `server/constants/collections.js`, `server/routes/generic.js` (strip
`CLIENT_SERVER_FIELDS`, Trash for clients), `server/db.js` (index), `server/migrations/0011-clients-crm.js`,
`server/test/clients.test.js`, `server/test/cross-business.test.js`, `src/app/core/models/` client type,
`src/app/pages/trash/**` (clients listed), `docs/brain/decisions/0031-*.md`, `docs/agent/standards-backend.md`.
Must cover: C-CONTACT fields; D2 (no permission change beyond staff read fields); D3; migration backfills
`phoneKey`, `kinds` (`event_client` for clients that have events), `firstSeenAt` (= `createdAt`), `counters.events`;
dry-run lists `phoneKey` collisions. `Isolated DB: yes` + the Atlas final-gate commands. Done-when: [auto] generic PUT
cannot change any server field; [auto] staff POST/PUT/DELETE `clients` still 403; [auto] delete → Trash → restore
round trip; [auto] migration dry-run then verify on a scratch DB; [human] ADR text; [human] Atlas go. Trap:
`generic.js` already stamps `phoneNormalized` at two places (POST ~L517, PUT ~L638) — `phoneKey` goes in the same
two places until 545 centralises it.

**545 · FD-01 · One find-or-create by phone.** Scope seed: `server/utils/client-upsert.js` (new),
`server/routes/generic.js` (POST `clients` calls it; restore → `PHONE_TAKEN`), `shared/schemas/testing/phone-vectors.ts`
(new), `server/test/client-upsert.test.js`, `src/app/core/utils/client-display.util.spec.ts` (same vectors),
`src/app/core/utils/client-display.util.ts` (`phoneKey` twin). Must cover: R-01 vectors (`052-123 4567`,
`+972 52 123 4567`, `972521234567`, a 7-digit landline, a foreign number); match only live, unmerged docs; a
soft-deleted match is not revived silently — a new client is created; two concurrent upserts for the same phone
create one client (retry on the second insert finding the first). Done-when: [auto] vectors pass on both sides;
[auto] concurrency test; [auto] POST of an existing phone returns the existing client with `created: false`.

**566 · FD-13 · AI usage ledger.** See FD-13. Scope seed: `server/services/gemini-client.js`,
`server/constants/ai-features.js`, `server/constants/ai-prices.js`, `server/constants/collections.js`, `server/db.js`,
`server/routes/ai.js`, `server/routes/product-import.js`, `server/routes/admin.js`, `server/test/gemini-client.test.js`,
`server/test/ai-usage.test.js`, `src/app/pages/platform-dashboard/**`, dictionary, `docs/agent/standards-backend.md`.
Trap: `gemini-client.js` retries down a model chain — one user action can be several rows; the admin totals group by
`at` window, not by request.

**548 · FD-04 · Front desk profile.** Scope seed: `shared/schemas/entities/front-desk-profile.schema.ts`,
`shared/schemas/front-desk-templates.ts`, `shared/front-desk/qualify.ts` (+ spec), `server/constants/collections.js`,
`server/utils/permissions.js` (`editFrontDesk`, `OWNER_ONLY_TYPES`), `server/db.js` (slug unique index),
`server/test/front-desk-profile.test.js`, `server/test/qualify.test.js`, `server/test/cross-business.test.js`,
`src/app/core/services/front-desk-profile-data.service.ts`, `src/app/core/services/permission.service.ts`. Must
cover: C-PROFILE with `requestKinds`; three complete templates (D14) with every question's dictionary key named;
`qualify` reasons as dictionary keys (R-10: an out-of-hours or out-of-rules request returns the allowed window in
`reasons`); `status` and `whatsapp` are server-owned; slug 409 `SLUG_TAKEN`; confirm `shared/front-desk/` is built by
`build:schemas` for both sides. Done-when: [auto] a `qualify` table test with ≥ 20 rows over the three types;
[auto] generic write cannot change `status`; [auto] staff write 403.

**549 · FD-03 · Requests and bookings, part 1.** Scope seed: `shared/schemas/entities/request.schema.ts`,
`booking.schema.ts`, `server/constants/collections.js`, `server/utils/permissions.js` (`manageRequests`),
`server/routes/requests.js` (`POST /`, `PUT /:id/status`, `PUT /:id/wanted`), `server/routes/bookings.js`
(`PUT /:id/status`), `server/utils/request-expiry.js`, `server/routes/generic.js` (strip server fields; reads only),
`server/app.js`, `server/db.js`, tests `requests-router.test.js`, `bookings-router.test.js`, `cross-business.test.js`,
client models + `RequestDataService`, `BookingDataService`. Must cover: C-REQUEST; the events-router pattern (`loadX`,
`validMerged`, `writeConditional`, `fail`, actor via `actorOf`); manual create runs `upsertClientByPhone` + `qualify`
and bumps `client.counters.requests`, `lastContactAt`; the status-move table for requests and for bookings (illegal →
409 `BAD_STATUS`); `expireDue`. Done-when: [auto] every legal and illegal move; [auto] staff can create a request and
a client appears; [auto] generic write of `status` ignored.

**550 · FD-03 · Approve, decline, day load, decision log.** Scope seed: `server/routes/requests.js` (approve,
decline, ask), `server/utils/event-create.js` (new — extracted from the generic POST path), `server/routes/generic.js`
(use it), `server/routes/bookings.js` (`GET /day`), `shared/schemas/entities/decision-log.schema.ts`, tests. Must
cover: approve is conditional on status (second approve → 409 `ALREADY_DECIDED`) and creates the outcome in the same
request (INV-3); `event` → `menuEvents` through `buildNewEventDoc` with the request summary as the first note via the
notes rule; other kinds → `bookings` with `source: 'request'`, `endAt`; client `kinds` and `counters` updated;
`decisionLog` row with `secondsToDecision` and `editedFields`; `GET /day` returns bookings + `coversByHour`. Done-when:
[auto] idempotency; [auto] the created event equals a generic-POST event field for field (snapshot test); [auto]
`decisionLog` has no name or phone. Trap: the generic POST for `menuEvents` must behave exactly as before — pin it with
a test before extracting.

**546 · FD-02 · One shared client picker.** Scope seed: `src/app/shared/client-picker/**`,
`src/app/shared/new-inquiry-dialog/**` (moved), `src/app/pages/menu-library/**` (import path),
`src/app/pages/menu-intelligence/components/event-stage-bar/**`, `docs/brain/component-families.md`,
`e2e/ui/<NNN>-*.spec.ts`. Must cover: C-PICKER; both hosts lose their own picker code; the stage-bar client row
becomes a chip + "החלפה" (the link target `/clients/:id` is wired by 547 — until then the chip is not a link);
`menu-intelligence.page.ts` net lines ≤ 0; `reuse-lint --check-registry` green. Not with plan 522. Done-when: [ui]
new inquiry with a new client still works from the menu library; [ui] change client on the stage bar; [auto] line
counts of the two hosts went down; [human] menu screens feel unchanged.

**547 · FD-02 · `/clients` list and the nav group.** Scope seed: `src/app/pages/clients/**`,
`src/app/core/components/tab-chips/tab-chips.component.ts`, `src/app/core/components/header/**`,
`src/app/app.routes.ts`, `src/app/app.config.ts`, dictionary, e2e. Must cover: C-NAV (group `frontdesk`, section
label "לקוחות והזמנות"); `app-list-shell`; filters kind / tag / lifecycle; owner-only "add client" (D2); staff see
the trimmed columns; the stage-bar chip from 546 becomes a link.

**551 · FD-02 · Client profile, timeline, merge.** Scope seed: `src/app/pages/clients/components/client-profile/**`,
`server/routes/clients.js` (new dedicated router: `POST /:id/merge`, `PUT /:id/do-not-contact`), `server/app.js`,
tests, dictionary. Must cover: the timeline merges requests, bookings, events (with stage, link to
`/menu-intelligence/:id`) and notes, newest first; merge re-keys `clientId` on `menuEvents`, `requests`, `bookings`
(and `conversations` once it exists — write the code so a missing collection is a no-op) in one request, stamps
`mergedInto`, soft-deletes A; R-02 member route. Done-when: [auto] merge re-keys every collection and is owner-only;
[auto] restoring a merged client is refused with a clear code; [ui] profile shows an event created from the inquiry dialog.

**552 · FD-03 · Requests queue and bookings agenda.** `Track: design`. Scope seed: `src/app/pages/requests/**`,
`src/app/pages/bookings/**`, routes, tab-chips, dictionary, styles append, e2e. Must cover: tabs waiting / approved /
declined; the card (who, what, verdict + reasons, answers, day load strip for time-bound kinds, Approve / Ask /
Decline); edit date/time/party before approve; decline reason picker; manual "בקשה חדשה" using `app-client-picker`
(staff type name + phone instead); `/bookings` day and week agenda with seated / finished / no-show; pending badge on
the nav group (poll the count on window focus). All three business types must read well: an event request, a
tasting, a table, a consultation.

**553 · FD-04 · Front desk settings.** Scope seed: `src/app/pages/frontdesk/components/frontdesk-settings/**`,
routes, tab-chips, dictionary, e2e. Must cover: first visit picks the business type and copies its template; cards —
type + public link (copy button), hours (`app-hours-editor`), one card per request kind (enable, questions editor ≤ 12,
rules), assistant (level shown read-only when set by the platform admin, tone, greeting, handoff text), status
(read-only); `pendingChangesGuard`.

**554 · FD-05 · Knowledge base.** Scope seed: `shared/schemas/entities/knowledge-item.schema.ts`, collections,
permissions, `server/services/knowledge.js`, `server/routes/ai.js` (`POST /knowledge-import`), tests,
`src/app/pages/frontdesk/components/knowledge/**`, dictionary. Must cover: C-KB; import returns drafts only (≤ 60);
bulk approve; `publicFacts` cap and deterministic order; the import prompt is English (D12) and metered
(`knowledge_import`). Done-when: [auto] a draft or internal item never appears in `publicFacts`; [auto] the cap.

**555 · FD-08 · Public request page.** `Track: design`. Alone in its window. Scope seed: `server/routes/public.js`,
`shared/schemas/public/**`, tests, `src/app/pages/public-request/**`, `src/app/core/services/layout-mode.service.ts`,
`src/app/app.component.html` + `.ts`, routes, dictionary, styles append, e2e. Must cover: C-PUBLIC; kind picker →
questions → name + phone + terms → done page with reference, the `wa.me` link and "Powered by FoodVibe"; the guest
page by token (status, cancel); a `draft` or `suspended` profile answers "not available"; initial bundle unchanged;
no phone number in any log line. Done-when: [auto] a public POST creates a request visible only to that business;
[auto] a token reads only its own request; [auto] honeypot → 201 and nothing written; [ui] `/book/<slug>` sends a
request and shows the reference; [human] Dandan opens it on his phone after a cold start.

**567 · FD-14 · Optional "before" numbers.** See FD-14. Scope seed: `shared/schemas/entities/business.schema.ts`,
`server/routes/business.js`, `server/services/business-stats.js` (`BASELINE_FIELDS`), `server/test/business-baseline.test.js`,
`src/app/pages/settings/**` (baseline tab), dictionary.

**556 · FD-10 · Onboarding intake and checklist.** Scope seed: `server/routes/business.js` (`setup-status.frontDesk`),
`src/app/pages/frontdesk/components/onboarding/**`, `src/app/pages/dashboard/components/` (new checklist card beside
the existing one), tests, dictionary. Must cover: Appendix A per business type; one save writes profile + draft
knowledge items (+ baseline only if filled, D15); printable; "send a test request" (`test: true`, R-19).

**557 · FD-11 · Status and export.** Scope seed: `server/routes/admin.js` (set status, with reason, logged),
`server/routes/business.js` or a new export route (CSV of clients, requests, bookings — owner), platform dashboard,
public page "not available" state, tests.

**558 · FD-12 · Privacy and go-live docs.** Scope seed: `server/scripts/erase-client.js`, `server/jobs/` retention
(lazy, same pattern), `docs/security-go-live.md`, `render.yaml` (commented env vars), `docs/frontdesk/pilot-terms-draft.md`
(Hebrew), tests. Must cover: erase by phone uses `phoneKey` and removes or anonymises the client, its requests,
bookings and (later) messages; the uptime-ping instructions (D6).

**568 · FD-14 · Business report.** See FD-14.

**559 · FD-09 · Front desk numbers.** Scope seed: `server/services/business-stats.js` / `server/routes/stats.js`
(`GET /stats/frontdesk`), the report page from 568 (front desk block), dashboard card, platform dashboard, tests.
`test: true` requests are excluded everywhere.

**560–565 · Wave 1b.** Drafted after the pilot week. Inputs already fixed: C-CONV / C-AI decisions in the map,
rules R-02 … R-20, D5, D7, D11, D12.

### Original proposal (history only)

#### Proposed plan map (you own the final split; NNN from `next-plan-number.mjs`)

**Wave 1a — works with zero external services (pilot can start here)**

| # | Spec | Plan title (plain) | Size | Depends on |
| --- | --- | --- | --- | --- |
| 1 | FD-12 | Open one safe door for customers who are not members — ADR, INV-1 amendment, public rate limiter, empty public router with tests | S | — (Q1 approval) |
| 2 | FD-01 | Turn clients into CRM records — wider schema, staff may add clients, soft delete, migration 0011, ADR | M | — (Q2) |
| 3 | FD-01 | Find or create a client by phone in one server function everyone uses | S | 2 |
| 4 | FD-02 | One shared client picker instead of two copies inside the menu screens | M | 2 |
| 5 | FD-02 | Give clients their own section — list, add, search, filters, navigation group | M | 4 |
| 6 | FD-04 | Front desk profile per business — schema, templates per business type, qualification rules (pure, tested) | M | 1 |
| 7 | FD-03 | Requests and bookings on the server — collections, routers, approve creates the booking or the event inquiry | L | 3, 6 |
| 8 | FD-03 | The requests queue and the bookings agenda screens | M (design) | 7, 5 |
| 9 | FD-02 | Client profile with one timeline of requests, bookings and events; merge duplicates | M | 7, 5 |
| 10 | FD-04 | Front desk settings screen | M | 6 |
| 11 | FD-08 | Public request page and its API, without the app shell | M (design) | 7, 10 |
| 12 | FD-05 | Knowledge base — items, screen, AI import from text or link | M | 6 |
| 13 | FD-10 | Onboarding intake form and checklist by business type; test request | M | 10, 12 |
| 14 | FD-11 | Pilot / active / suspended status and data export | S | 10 |
| 15 | FD-09 | Front desk numbers for the owner and the platform admin (form + manual channels) | M | 7, 13 |

**Wave 1b — needs Q4–Q6 answered and Meta verification**

| # | Spec | Plan title | Size | Depends on |
| --- | --- | --- | --- | --- |
| 16 | FD-06 | WhatsApp in and out on the server — client, signed webhook, conversations and messages stored | L | 7 |
| 17 | FD-06 | The inbox screen with take over / hand back and the request card | M (design) | 16, 8 |
| 18 | FD-07 | The assistant answers and collects, the server decides — turn route, guardrails, eval set | L | 16, 12 |
| 19 | FD-07 | Suggestions on requests and the decision log | S | 18 |
| 20 | FD-06 | Alert the owner on WhatsApp when a request waits | S | 16 |
| 21 | FD-09 | Add conversation and assistant numbers to the dashboard | S | 18, 15 |

**Lanes (three slots):** wt-1 data/server: 1 → 2 → 3 → 6 → 7 → 16 → 18 → 19 · wt-2 CRM UI: 4 → 5 → 9 → 8 → 17 ·
wt-3 front desk UI: 10 → 11 → 12 → 13 → 14 → 15 → 20 → 21. Adjust after the Reality Check.

**Must not run together (shared hotspots):** anything editing `shared/schemas/entities/client.schema.ts` or
`server/utils/permissions.js` (2, 6, 7 — sequential in wt-1); 4 with any open plan touching
`event-stage-bar` or `new-inquiry-dialog` (check open plans 519–523: 522 edits the event panel — sequence 4 after it
or coordinate scope); 5, 8, 10, 17 all append to `tab-chips.component.ts` and `app.routes.ts` (append-only, but
serialise the merges); `dictionary.json` and `styles.scss` appends in every UI plan; 11 edits `app.component.html`
(shell flag) — alone in its window.

**Human gates:** Q1/Q2 arch approvals before plans 1–2 are saved; Atlas dry-run → go for migration 0011; every
`[human]` Done-when; Meta/WhatsApp setup and Render env vars before 16; a real pilot business uses Wave 1a for one
week before Wave 1b is run.

---

## Part 5 — Critical Questions — ALL ANSWERED 2026-11-10 (see Part 0.5; the original text is kept for the record)

Q1 → D1 · Q2 → D2 (b) + D3 · Q3 → D4 (a) · Q4 → D5 (c now, a at deployment) · Q5 → D6 (a) · Q6 → D7 (b) ·
Q7 → D9 (a) · Q8 → D9 (a) · Q9 → D10 · Q10 → D14 · voice notes → D11 · prompt language → D12.

- Q1 · INV-1 · current rule: every write is authorised through `permissions.js` for a business member · proposed
  change: guest-originated writes are allowed only through `public.js` / the WhatsApp webhook, bound to the business
  the server resolves, `createdBy: 'public:<channel>'`, read-back only by token · who loses what: nobody loses; the
  owner gains inbound requests. Needs `approve arch change INV-1`. A: answered — see Part 0.5.
- Q2 · ADR 0027 (clients are owner-only, hard delete) · proposed: staff may add clients and edit the ones they
  created; owner-only fields stay hidden from staff; clients are soft-deleted · who loses what: the owner loses
  exclusivity on creating clients; staff gain what a host needs. (a) as proposed — recommended / (b) keep owner-only
  and let staff create clients only implicitly through a request. A: answered — see Part 0.5.
- Q3 · Onboarding typing: (a) Dandan works in the owner's account during the sitting — recommended, no new code /
  (b) platform-admin "act in business" mode (INV-1 change + ADR + audit log). A: answered — see Part 0.5.
- Q4 · WhatsApp number per pilot business: (a) a new dedicated number per business under Dandan's Meta business
  account — recommended for the pilot, fastest / (b) the business's existing number moved to the Cloud API (the
  Planner must verify Meta's current coexistence rules with the WhatsApp Business app before proposing it) /
  (c) one shared FoodVibe number for all businesses. A: answered — see Part 0.5.
- Q5 · Keeping the server awake for webhooks: (a) uptime ping every 10 minutes — free / (b) Render paid instance —
  recommended once WhatsApp is live / (c) external cron for jobs only. A: answered — see Part 0.5.
- Q6 · AI budget for conversations: (a) a paid Gemini key with a per-business daily cap — recommended, required for
  real traffic / (b) stay on the free chain with assistant level 0 (drafts only) during the pilot. A: answered — see Part 0.5.
- Q7 · Public page languages in Wave 1: (a) Hebrew only — recommended / (b) Hebrew + English. A: answered — see Part 0.5.
- Q8 · "Powered by FoodVibe" on the public page and messages during the pilot: (a) yes — recommended / (b) no. A: answered — see Part 0.5.
- Q9 · Product words in the UI: section name (a) "דלפק קבלה" / (b) "לקוחות והזמנות" / (c) other; request =
  "בקשה" vs "פנייה" (today "פנייה" means an event inquiry). A: answered — see Part 0.5.
- Q10 · First pilot business type to validate Wave 1a with: (a) catering — closest to what exists / (b) restaurant —
  highest message volume / (c) private chef. A: answered — see Part 0.5.

---

## Part 6 — Later waves (do NOT plan now; listed so Wave 1 contracts do not block them)

- **Wave 2 — automate what the pilot proved:** availability engine and auto-confirm for `table` (assistant level 2;
  spec in `reference-bookings-engine.md` §5.3, reading the same `bookings` collection), reminders with
  confirm/cancel buttons and no-show auto-release, walk-in waitlist with QR, host service screen in `theme-kitchen`,
  tasting/consultation slot calendars, card hold and cancellation fee through an Israeli payment provider,
  subscriptions and billing, self-serve onboarding, English/Arabic/Russian public pages.
- **Wave 3 — the bridge that only FoodVibe has:** covers forecast → prep sheets and purchasing; request → priced quote
  from the menu engine in one step; post-event follow-up and review request; repeat-customer suggestions; Reserve with
  Google (partner programme, long lead); staff task lists and consolidated supplier ordering promoted in the Kitchen
  layer for businesses that came in through the Front Desk.

---

## Appendix A — What Dandan collects at the onboarding sitting (drives FD-10's form)

**Every business**
1. Business name as customers know it, logo, address, service area, phone customers call, WhatsApp number they use today.
2. Opening hours per day; closed dates; holidays policy.
3. Who answers customers today (owner / host / whoever is free), on which channels, in which hours.
4. Baseline numbers (estimates are fine): phone inquiries per day, messages per day, usual time to answer, inquiries
   lost per week, host hours per week, no-shows per week.
5. The 15 questions customers ask most, with the answers the owner wants given (→ knowledge items).
6. Policies: cancellation, deposits, minimum order / minimum guests, kashrut, allergens statement, accessibility,
   parking, children, pets.
7. Tone: formal or warm; a greeting sentence; what the assistant must never say; when to hand over to a person.
8. Who approves requests, and on which phone they get the alert.
9. Existing customer list, if any (a file or the phone's contacts export) — imported as clients with `source: manual`.

**Restaurant / café / bar** — seats inside / outside / bar; largest party taken without a call; usual sitting length;
days and hours that fill up vs dead hours they want to fill; menu (link or photo) and price range; reservations taken
today through (phone, Instagram, another system — which, and what it costs them).

**Private chef** — services offered and where (client's home, rented venue); minimum and maximum guests; price per
guest ranges by menu level; what the price includes; lead time needed; equipment needed on site; travel area and fee;
sample menus; payment terms.

**Catering / events** — event types handled (mapped to the business's `eventType` terms), serving styles, minimum
guests and minimum order, price ranges per guest by style, tasting policy (when, where, cost, how many people),
lead time, areas served and delivery fees, staff and equipment options, payment and deposit terms, venues they work
with (→ existing `venues`).

End of brief.
