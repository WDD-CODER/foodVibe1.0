# Plan 431 — Capture the opening baseline and guide a new business through setup

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 06.1. Dandan signs a new owner up in person (plan 425/426 signup with business name). Today nothing records
how the business ran **before** FoodVibe, so the performance dashboard (plan 447) has nothing to compare against,
and nothing tells a new owner what to do first. Also:
- the installed app is called "foodVibe1.0" (`public/manifest.webmanifest` `name` / `short_name`; `<title>`
  `FoodVibe10` in `src/index.html`);
- `server/services/seed-master.js` `seedMasterData` still tries to read seven `public/assets/data/demo-*.json`
  files (`DEMO_FILE_MAP`) that do not exist (only `demoProducts.json` does, and it is not in the map) — on a fresh
  database it logs seven `seed.master.file_skipped` warnings and seeds nothing from them. Dead code with noisy logs.

This plan adds:
1. The opening baseline on the business (`baseline` per C-BUSINESS), owner-only `PUT /api/v1/business/baseline`,
   and a **«פרטי פתיחה»** tab in `/settings` (plan 428's page). The owner's first visit to the dashboard opens it;
   «דלג» skips it for good; it stays reachable from Settings.
2. A **«הקמת העסק»** card on the dashboard with steps ticked from the business's own data (not the master copy),
   until all required steps are done or the owner presses «הסתר».
3. PWA name "FoodVibe" (dir rtl, lang he) and removal of the dead demo-file read.

User stories:
- As a chef who owns the business, I want to type how many events I closed and what I earned per event before
  FoodVibe so that later I can see whether the app made a difference.
- As a chef who just joined, I want a short checklist of what to set up first so that I get to a priced menu fast.
- As a chef, I want the app on my phone's home screen to be called "FoodVibe".

## Goals & Success Criteria
**Primary:** an owner can store (and later update) a dated baseline; a new owner lands on it once; the dashboard
shows a setup card whose steps tick from real business data; the installed app is "FoodVibe"; the dead demo read
is gone.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npm --prefix server test -- test/business-baseline.test.js` passes, covering:
  - owner `PUT /api/v1/business/baseline` `{ eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000 }` → 200; `GET
    /api/v1/business` → `baseline: { eventsClosedPerMonth: 4, avgRevenuePerEvent: 12000, filledAt: <number> }`;
  - a second PUT `{ eventsClosedPerMonth: 5 }` replaces the baseline (other fields gone) and `filledAt` is newer;
  - `PUT` `{}` (skip) → 200, `baseline: { filledAt }` only;
  - `inquiriesPerMonth: -1` → 400; `estProfitPct: 100` → 400; `avgRevenuePerEvent: 'x'` → 400; unknown key → 400;
    a client-sent `filledAt` is ignored (server sets it);
  - staff `PUT /baseline` and `GET /setup-status` → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`;
  - `GET /api/v1/business/setup-status` on a business holding only master clones (each `_masterId` ≠ own `_id`)
    → `{ pricedProducts: 0, suppliers: 0, recipes: 0, events: 0, staff: 0 }`; after the owner creates 10 products
    with `sources[0].price > 0`, 1 supplier, 1 recipe, 1 menu event via `/api/v1/data` and adds 1 staff →
    `{ pricedProducts: 10, suppliers: 1, recipes: 1, events: 1, staff: 1 }`; a product priced only in
    `purchaseOptions[].priceOverride` counts; a soft-deleted product does not; another business's items never count.
- [x] [auto] `npm --prefix server test -- test/seed-master-taxonomy.test.js` passes, plus a new case in it: on an empty
  database `seedMasterData()` seeds the master taxonomy terms and logs no `seed.master.file_skipped`.
- [x] [auto] `npm --prefix server test` passes (whole server suite).
- [x] [auto] `node -e "const m=JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8'));console.log(m.name,m.short_name,m.dir,m.lang)"`
  → prints `FoodVibe FoodVibe rtl he`.
- [x] [auto] `grep -c "demo-" server/services/seed-master.js` → `0`.
- [x] [auto] `npx ng test --watch=false --include='src/app/pages/settings/**/*.spec.ts' --include='src/app/pages/dashboard/components/setup-checklist-card/**/*.spec.ts' --include='src/app/core/services/business.service.spec.ts'`
  passes, covering: `updateBaseline` puts the returned `baseline` into `business_`; baseline tab hidden for staff; the form saves only filled fields; «דלג» calls
  `updateBaseline({})`; setup card: steps ✓ from a status fixture (`pricedProducts: 10` → step 1 ✓, `9` → not),
  card hidden when the 4 required steps are ✓ even if staff = 0, hidden after «הסתר», never rendered for staff;
  owner with `business.baseline` undefined → `router.navigate(['/settings'], { queryParams: { tab: 'baseline',
  first: 1 } })` once; with a baseline → no redirect.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, a freshly signed-up owner (sign up a new business), then click «לוח בקרה»: the app switches to
  Settings → «פרטי פתיחה».
  Type «4» in אירועים שנסגרו בחודש and «12000» in הכנסה ממוצעת לאירוע → «שמור» → toast «פרטי הפתיחה נשמרו» →
  Settings → «פרטי פתיחה» shows 4 and 12,000 with «עודכן ב-<today's date>».
- [human] Desktop, another new owner: on «פרטי פתיחה» press «דלג» → dashboard; reload → it does not open again;
  Settings → «פרטי פתיחה» is still there and empty.
- [human] Desktop, owner: the dashboard shows «הקמת העסק» with 5 steps, none ✓. Create a recipe, go back to the
  dashboard → «מתכון ראשון» is ✓ without reloading the page. «הסתר» → the card disappears and stays hidden after reload.
- [human] Staff login: no «פרטי פתיחה» screen, no «הקמת העסק» card.
- [human] Mobile (Android Chrome or iPhone Safari): reinstall / «הוסף למסך הבית» → the icon's name is «FoodVibe».
  The baseline form and the setup card fit a 360 px screen with no sideways scroll.

## Execution Mode
- Parallel: no against 436, 438 and 440 (all edit `server/services/seed-master.js`) and against any open plan
  editing `src/app/pages/dashboard/components/dashboard-overview/**` (447) or `server/routes/business.js`
  (430). Check `node scripts/scope-check.mjs --overlap --plan=<this>` at take time.
- Concurrent plans: lane 2 / lane 3 plans other than 436, 438, 440 and 447.
- Isolated DB: no — writes only `baseline` on the slot's own business through the API; no reshape.

## Execution Notes
- Depends on: plan 429 merged (Business tab and `businessSettingsSchema` in `business.schema.ts` — this plan adds
  `baseline` next to it), plan 430 merged (`usageDays`; this plan does not read it but must not collide on
  `server/routes/business.js`). Through them: 424–428.
- Must not run at the same time as: 436, 438, 440 (`seed-master.js`), 447 (`dashboard-overview`), 430
  (`server/routes/business.js`; it is a dependency anyway).
- Lane wt-1, after 429. Unblocks: 432 (lane 1), 447 (lane 3 reads `baseline`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Contract extension (run): `GET /api/v1/business/setup-status` (owner) → `{ pricedProducts, suppliers, recipes,
  events, staff }` is a new route on the C-BUSINESS router. Append it to `docs/mvp/mvp-map.md`
  `## Contract extensions (run)` (plan 431) and log it in `docs/mvp/runs/431.md` `## Decisions`.
- Decision (Planner review): the first-visit redirect runs from an `effect` in the setup card, not only on init —
  why: `/dashboard` has no guard and login happens in a modal on top of it, so the card can be created before the
  user and `business_()` are loaded; the effect fires once both are known (owner, `baseline === undefined`), guarded
  by a one-shot flag.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/business.schema.ts
server/routes/business.js
server/services/business.js
server/jobs/purge-deleted.js
docs/mvp/mvp-map.md
server/services/seed-master.js
server/test/business-baseline.test.js
server/test/seed-master-taxonomy.test.js
server/test/business-stamp.test.js
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/pages/settings/**
src/app/pages/dashboard/components/setup-checklist-card/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts
public/manifest.webmanifest
src/index.html
src/app/app.config.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

INV-1/INV-2 wording comes from ADR `docs/brain/decisions/0023-business-is-the-tenant.md` (plan 424). Re-run
`node scripts/scope-check.mjs --arch --plan=<this>` at Step 0 and add a line for any newly reached invariant.

- INV-2: preserves — `seed-master.js` keeps seeding the shared master taxonomy exactly as today
  (`seedMasterTaxonomy`); only the dead demo-file loop is removed. A new business still gets the full master copy
  through clone (plan 425), untouched here.
- INV-4: preserves — `baseline` is defined once in `shared/schemas/entities/business.schema.ts`
  (`businessBaselineSchema`) and `PUT /api/v1/business/baseline` validates every write against it.
- INV-1: preserves — baseline write and setup status are owner-only via `assertCan(…, 'editSettings', …)` (plan 427).
- INV-6: preserves — no AI call.

## Step 0 — Reality Check

Runs always. Check by symbol, one line each, `ok` or `conflict: <what>`:
- `business.schema.ts` exports `businessSettingsSchema` (429) and the business schema's `baseline` field type.
- `server/routes/business.js`: `GET /` (returns `settings` with defaults), `PUT /settings`, team routes.
- `server/utils/business-scope.js` `scopeFilter`; `server/jobs/purge-deleted.js` `LIVE`.
- Generic `POST /:type` in `server/routes/generic.js` still sets `_masterId: _id` on a user's own new doc (today
  L425), and `clone-master.js` sets `_masterId` = the master doc id on clones. If 425 changed this lineage marker,
  adapt the "own item" filter in Design §2 to the new marker and note it.
- `seed-master.js`: `DEMO_FILE_MAP`, `readDemoFile`, `upgradeDemoEntity`, `seedMasterData`, `seedMasterTaxonomy`;
  whether plan 438 already changed `DEFAULT_COURSES` / `defaultMasterRegistries` (leave those parts alone).
- `SETTINGS_TABS` has `team`, `business` (428, 429).
- `DashboardOverviewComponent` template: the `kpi-grid` section (insertion point for the card).
All `ok` → continue. A `conflict` → STOP for a go.

## Contracts used (verbatim from the approved map)

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

## Design

### 1. Baseline schema and route
`business.schema.ts`:
```ts
export const baselineInputSchema = z.strictObject({
  inquiriesPerMonth: z.number().min(0).optional(),
  eventsClosedPerMonth: z.number().min(0).optional(),
  avgRevenuePerEvent: z.number().min(0).optional(),
  estProfitPct: z.number().gt(-100).lt(100).optional(),
})
export const businessBaselineSchema = baselineInputSchema.extend({ filledAt: z.number() })
```
The business schema's `baseline` becomes `businessBaselineSchema.optional()`. Values are monthly averages of the
last 3 months (decimals allowed — "3.5 events a month" is real).
`PUT /api/v1/business/baseline`: `verifyToken`, `assertCan(req, res, 'editSettings', { type: 'businesses' })`,
strip `filledAt` from the body, `baselineInputSchema.safeParse` → 400 `{ error: 'Validation failed', issues }` or
`$set: { baseline: { ...parsed, filledAt: Date.now() } }` (whole replace — an emptied field disappears) → 200
`{ baseline }`. `GET /` already returns the business doc; make sure `baseline` is included when present.

### 2. Setup status route
`GET /api/v1/business/setup-status` (owner only, same `assertCan`). "Own" = created inside the business, not
cloned from master: `OWN = { $or: [ { _masterId: { $exists: false } }, { _masterId: null }, { $expr: { $eq:
['$_masterId', '$_id'] } } ] }` combined with `scopeFilter(req)` and `LIVE`. Counts (`countDocuments`, each capped
with `limit: 10` — the card only needs "reached or not"):
- `pricedProducts`: products, OWN, `$or: [{ 'sources.price': { $gt: 0 } }, { 'purchaseOptions.priceOverride': { $gt: 0 } }]`;
- `suppliers`: suppliers, OWN;
- `recipes`: recipes OWN + dishes OWN;
- `events`: menuEvents OWN;
- `staff`: users with the business id, `businessRole: 'staff'`, no `removedAt`.
Returns `{ pricedProducts, suppliers, recipes, events, staff }`. This route extends the C-BUSINESS router list
(contract extension — see Execution Notes).

### 3. Client
- `BusinessService`: `updateBaseline(input: BaselineInput): Promise<void>` (PUT; patches `business_`),
  `loadSetupStatus(): Promise<SetupStatus>` (GET, no signal cache — the card asks each time it is created).
- `SETTINGS_TABS` gets `{ key: 'baseline', labelKey: 'settings_tab_baseline', icon: 'clipboard-list', ownerOnly:
  true }`; page template one `@case ('baseline')`.
- New `src/app/pages/settings/components/baseline-tab/baseline-tab.component.*`: intro line
  (`baseline_intro`), four optional number inputs (`inputmode="decimal"`, ₪ / % suffixes), «שמור» (sends only
  filled fields), «דלג» (only when `?first=1`; calls `updateBaseline({})` then `router.navigate(['/dashboard'])`),
  and under the form «עודכן ב-dd/MM/yyyy» from `filledAt` (or `baseline_not_filled` when no number is stored).
  Toast `baseline_saved` on save. After saving with `?first=1` → navigate to `/dashboard`.
- New `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.*`
  (selector `setup-checklist-card`), placed at the top of `dashboard-overview.component.html` before the
  `kpi-grid` section; `dashboard-overview.component.ts` adds the import and `imports` entry only.
  - Renders nothing unless `permission.isOwner_()`.
  - An `effect` (one-shot flag `redirected_`): once the user is the owner and `business_()` is loaded, if
    `business_().baseline === undefined` → navigate once to `/settings?tab=baseline&first=1` (this is "first login
    opens the baseline screen" — `''` redirects to `/dashboard` and the login modal opens over it, so `business_()`
    may arrive after the card is created). Otherwise `loadSetupStatus()`.
  - Steps (✓ from status): `setup_step_products` (pricedProducts ≥ 10), `setup_step_supplier` (suppliers ≥ 1),
    `setup_step_recipe` (recipes ≥ 1), `setup_step_event` (events ≥ 1), `setup_step_staff` (staff ≥ 1, marked
    «רשות»). Each unticked step links to where it is done (`/inventory/add`, `/suppliers/add`, `/recipe-builder`,
    `/menu-intelligence`, `/settings?tab=team`). Progress «X מתוך 4».
  - Hidden when the four required steps are ✓, or after «הסתר» — stored in `localStorage` key
    `fv_setup_card_hidden_<businessId>` (read/write wrapped in try/catch; per-device convenience).
  - Because the card re-fetches every time the dashboard opens, a step created elsewhere shows ✓ on return without
    a manual reload.

### 4. PWA name
`public/manifest.webmanifest`: `"name": "FoodVibe"`, `"short_name": "FoodVibe"`, add `"dir": "rtl"`, `"lang": "he"`.
`src/index.html`: `<title>FoodVibe</title>` and `<meta name="apple-mobile-web-app-title" content="FoodVibe">` (iOS
uses it for the home-screen name).

### 5. Dead demo-file read (`server/services/seed-master.js`)
Delete `DEMO_FILE_MAP`, `readDemoFile`, `upgradeDemoEntity`, the `upgradeV1toV2` / `COLLECTION_RENAMES` requires,
`ASSETS_DIR`, the CLONEABLE_TYPES ordering guard and the per-type insert loop, and every require left unused
(`fs`, `path`, `CLONEABLE_TYPES`, `makeId`). `seedMasterData()` becomes: `const seeded = await
seedMasterTaxonomy(); logger.info({ event: 'seed.master.done', totalSeeded: seeded }); return seeded`. Update the
file's header comment. `server/index.js` keeps calling `seedMasterData()` unchanged. Do not touch
`DEFAULT_COURSES` / `defaultMasterRegistries` (plan 438 owns the course colours).

### 6. Dictionary (append, group `general`)
| key | Hebrew |
|---|---|
| `settings_tab_baseline` | פרטי פתיחה |
| `baseline_intro` | ממוצע חודשי של שלושת החודשים האחרונים לפני FoodVibe. כל השדות רשות. |
| `baseline_inquiries_per_month` | פניות בחודש |
| `baseline_events_closed_per_month` | אירועים שנסגרו בחודש |
| `baseline_avg_revenue_per_event` | הכנסה ממוצעת לאירוע (₪) |
| `baseline_est_profit_pct` | רווח משוער (%) |
| `baseline_saved` | פרטי הפתיחה נשמרו |
| `baseline_updated_at` | עודכן ב- |
| `baseline_not_filled` | עדיין לא מולא |
| `skip` | דלג |
| `setup_card_title` | הקמת העסק |
| `setup_step_products` | 10 מוצרים עם מחיר |
| `setup_step_supplier` | ספק ראשון |
| `setup_step_recipe` | מתכון ראשון |
| `setup_step_event` | תפריט אירוע ראשון |
| `setup_step_staff` | חבר צוות |
| `setup_optional` | רשות |
| `setup_progress` | מתוך 4 |
| `hide` | הסתר |
Skip any key that already exists at take time.

### 7. Icons
`ClipboardList`, `CircleCheck` are already registered. Add `ListChecks` (card header) to `src/app/app.config.ts`.

## Functional Requirements

### Must Have (P0)
- [ ] Baseline stored on the business with a fill date; owner can update (date updates); all fields optional.
- [ ] Owner's first dashboard visit opens «פרטי פתיחה»; «דלג» ends that for good; reachable from Settings.
- [ ] «הקמת העסק» card with the 5 steps, ticked only by items created in the business.
- [ ] Card disappears when the 4 required steps are done or on «הסתר».
- [ ] Staff see neither the baseline screen nor the card.
- [ ] PWA name "FoodVibe", dir rtl, lang he.
- [ ] Dead `demo-*.json` read removed from `seed-master.js`.

### Should Have (P1)
- [ ] Each unticked step links to the screen where it is done.

## UI/UX Notes
- Card in the dashboard's existing card language (`kpi-card` look), full width above the KPI grid; steps as a
  vertical list with ✓ (`circle-check`) or an empty circle; on mobile one column.
- Baseline form: single column; numbers `dir="ltr"` inside inputs; suffixes with logical padding.
- Run the `cssLayer` skill before any `.scss`. RTL, logical properties only.

## Atomic Sub-tasks
- [x] B1: Give the opening baseline one validated shape on the business — baselineInputSchema, businessBaselineSchema, baseline field — shared/schemas/entities/business.schema.ts
- [x] B2: Let only the owner save the baseline with the date it was filled — PUT /baseline replace + filledAt, GET / includes baseline — server/routes/business.js
- [x] B3: Tell the owner which setup steps are done using only items made in the business — GET /setup-status with OWN filter and capped counts — server/routes/business.js
- [x] B4: Prove baseline saving, skipping, validation and setup counts with server tests — every Done-when case — server/test/business-baseline.test.js
- [x] B5: Add the opening-baseline tab with save and skip — SETTINGS_TABS entry, @case, BaselineTabComponent, BusinessService.updateBaseline, specs — src/app/pages/settings/**, src/app/core/services/business.service.ts
- [x] B6: Show the setup card on the dashboard and open the baseline once for a new owner — SetupChecklistCardComponent, loadSetupStatus, localStorage hide, first-visit redirect, placement in dashboard overview, spec — src/app/pages/dashboard/components/setup-checklist-card/**, dashboard-overview.component.ts/.html
- [x] B7: Name the installed app FoodVibe — manifest name/short_name/dir/lang, index title + apple title — public/manifest.webmanifest, src/index.html
- [x] B8: Remove the master seed's attempt to read demo files that don't exist — drop DEMO_FILE_MAP and the loop, keep taxonomy seeding, extend the seed test — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js
- [x] B9: Add the Hebrew texts and the checklist icon — 19 dictionary keys, ListChecks — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] B10: Build, test and hand over the baseline, card and phone-name checks — ng build, server suite, listed specs, manifest check, log-query; Human runs the [human] items — this plan file

## Technical Considerations
- Dependencies: `SettingsPage` / `SETTINGS_TABS` (428, 429), `PermissionService.isOwner_` (428), `BusinessService`,
  `assertCan` (427), `scopeFilter` (425), `LIVE` (`server/jobs/purge-deleted.js`).
- New files: `baseline-tab/**`, `setup-checklist-card/**`, `server/test/business-baseline.test.js`.
- Model changes: `baselineInputSchema`, `businessBaselineSchema`, types `BaselineInput`, `BusinessBaseline`;
  client `SetupStatus` interface in `business.service.ts`.
- Backend / API: `PUT /api/v1/business/baseline`, `GET /api/v1/business/setup-status`.
- Auth and validation: owner only; strict Zod; `filledAt` server-set.
- Security surface: none new beyond two owner-only routes; the setup counts return numbers only.
- Data / migration: none; businesses without `baseline` simply have none (the first-visit screen asks).
- Project checks: log-query Done-when; chef stories; 19 dictionary keys; RTL logical CSS; `ListChecks` registered;
  new UI is a tab of the lazy `/settings` and a child card component of the lazy dashboard.

## Backend Impact
- Collections affected: `businesses` (`baseline`); reads `products`, `suppliers`, `recipes`, `dishes`,
  `menuEvents`, `users` for counts.
- New collections: no.
- Server changes needed: yes — two routes in `server/routes/business.js`; `seed-master.js` dead-code removal.

## Out of Scope
- Comparing against the baseline on the dashboard («+X% מול לפני», «אין נתוני פתיחה») — plan 447.
- Self-serve signup with demo data ("magic moment"); shipping demo JSON files.
- The stale "demo loader" wording in the `reloadFromStorage` comment of `recipe-data.service.ts` (comment only;
  not worth a `*-data.service.ts` scope entry).
- Course colours in `seed-master.js` (plan 438).

## Critical Questions
None — spec 06.1 and the brief's Part 4 fix the behaviour. Two implementation choices made here, not product
questions: «דלג» stores an empty baseline (only `filledAt`) so the screen never reopens by itself; «הסתר» is
remembered per device in `localStorage`.
