# Plan 429 — Let the owner set the business profit target, safety margin and overrun threshold

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Specs 03.2 and 08.1 need three numbers that belong to the business, not to an event: the profit target (default
25%), the recommended safety margin (default 10%) and the supplier-overrun threshold (default 10%). Today the menu
screen hard-codes a 30% target on save (`buildEventFromForm` in `menu-intelligence.page.ts`) and a 33% warning in
its footer; nothing is stored per business. Plan 424 created the `businesses` collection with a `settings` field;
this plan gives `settings` its shape and defaults, an owner-only write route, and a **Business** tab in the
`/settings` page that plan 428 created. Plans 445 (pricing meter) and 446 (closing dialog) read these numbers from
`BusinessService.business_().settings`; this plan does not touch the menu screen.

User stories:
- As a chef who owns the business, I want to set my profit target once so that every menu tells me whether its
  price meets it.
- As a chef who owns the business, I want to set how big a supplier overrun must be before it turns red so that
  small differences don't alarm me.
- As a cook on the team, I want the business numbers kept away from me so that I can't change them by mistake.

## Goals & Success Criteria
**Primary:** one settings record per business with the three numbers, defaults 25 / 10 / 10, editable only by the
owner from Settings → «הגדרות עסק», validated by one Zod schema on the server.

Done when:
- [auto] `npx ng build` passes.
- [auto] `npm --prefix server test -- test/business-settings.test.js` passes, covering:
  - a business with no stored `settings` → `GET /api/v1/business` returns `settings: { profitTargetPct: 25,
    safetyMarginPct: 10, overrunThresholdPct: 10 }`;
  - owner `PUT /api/v1/business/settings` `{ profitTargetPct: 30, safetyMarginPct: 12.5, overrunThresholdPct: 15 }`
    → 200 and the same values on the next `GET`;
  - `profitTargetPct: 100` → 400 `{ error: 'Validation failed' }` with an issue on `profitTargetPct`;
    `profitTargetPct: -1` → 400; `safetyMarginPct: 100` → 400; `overrunThresholdPct: 0` → 400; a string value → 400;
    an unknown key (`foo: 1`) → 400;
  - staff `PUT /settings` → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`, stored values unchanged;
  - owner of business X cannot change business Y (the route only ever writes `req.user.businessId`).
- [auto] `npm --prefix server test` passes (whole server suite).
- [auto] `npx ng test --watch=false --include='src/app/pages/settings/**/*.spec.ts' --include='src/app/core/services/business.service.spec.ts'`
  passes, covering: the Business tab is listed for an owner and not for staff; `?tab=business` as staff falls back
  to the owner-only state; the form shows the defaults when the server returns them; 100 in the target field shows
  the field error and disables save; `BusinessService.updateSettings` puts the new `settings` into `business_`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, owner: menu → «הגדרות» → tab «הגדרות עסק» → shows יעד רווח 25%, מרווח ביטחון 10%, סף חריגה
  מספק 10%. Change the target to 30 → «שמור» → toast «ההגדרות נשמרו». Reload the page → 30 is still there.
- [human] Desktop, owner: type 100 in יעד רווח → red «חייב להיות בין 0 ל-99.9», «שמור» disabled.
- [human] Staff login: no «הגדרות» link; open `/settings?tab=business` by hand → «ההגדרות זמינות לבעל העסק בלבד»,
  no numbers shown.
- [human] Mobile (≤ 620 px), owner: the three fields stack one under the other with the % sign on the inline-end
  side, the numeric keyboard opens, no sideways scroll.

## Execution Mode
- Parallel: yes against lanes 2 and 3 (check `node scripts/scope-check.mjs --overlap --plan=<this>`); no against
  any open plan that edits `shared/schemas/entities/business.schema.ts` or `server/routes/business.js` (430 in
  lane 2 — may be ready at the same time; 431 is later in lane 1).
- Concurrent plans: lane 2 / lane 3 plans running at take time.
- Isolated DB: no — writes only the `settings` field of the slot's own business docs through the API.

## Execution Notes
- Depends on: plan 428 merged (it creates `/settings`, `SETTINGS_TABS`, `PermissionService`, the team routes in
  `server/routes/business.js`). Through it: 424, 425, 426, 427.
- Must not run at the same time as: 430 and 431 (both edit `server/routes/business.js`; 431 also
  `business.schema.ts` and the settings page).
- Lane wt-1, after 428. Unblocks: 431 (lane 1) and 445 (lane 3, reads `settings`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Decision (Planner review): the client validators (target/margin ≤ 99.9, overrun ≥ 0.1) are slightly stricter
  than the server schema (`lt(100)`, `gt(0)`) — kept: the server is the decider and the gap only refuses values
  nobody types — why: one-decimal inputs cannot express the open bounds.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/business.schema.ts
server/routes/business.js
server/test/business-settings.test.js
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/pages/settings/**
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
`node scripts/scope-check.mjs --arch --plan=<this>` at Step 0 and add a line for any invariant whose rewritten
Touches globs this scope now reaches.

- INV-4: preserves — the `settings` shape lives once in `shared/schemas/entities/business.schema.ts`
  (`businessSettingsSchema`), and `PUT /api/v1/business/settings` validates every write against it.
- INV-1: preserves — the write is owner-only through `assertCan(req, res, 'editSettings', { type: 'businesses' })`
  (plan 427); the client only hides the tab.
- INV-6: preserves — no AI call.

## Step 0 — Reality Check

Runs always. Check by symbol, one line each, `ok` or `conflict: <what>`:
- `shared/schemas/entities/business.schema.ts` exports the business schema (plan 424) and how `settings` is typed
  there today (likely loose/optional). Note how the server reads it (`server/generated/schemas/...` path built by
  `npm run build:schemas`, as `server/utils/schema-check.js` does for entities).
- `server/routes/business.js` `GET /` returns `settings`; note whether it fills defaults.
- `server/utils/permissions.js` `assertCan` and action `editSettings` (C-PERM).
- `src/app/pages/settings/settings-tabs.ts` `SETTINGS_TABS` and the page's `@switch`/`@if` on `activeTab_()`
  (plan 428).
- `BusinessService.business_` signal shape (plan 426/428).
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

### 1. Schema (`shared/schemas/entities/business.schema.ts`)
```ts
export const BUSINESS_SETTINGS_DEFAULTS = { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 } as const
export const businessSettingsSchema = z.strictObject({
  profitTargetPct: z.number().min(0).lt(100),      // spec 03.2: target ≥ 100% is an error
  safetyMarginPct: z.number().min(0).lt(100),
  overrunThresholdPct: z.number().gt(0).max(100),  // 0 would flag every supplier
})
export type BusinessSettings = z.infer<typeof businessSettingsSchema>
```
The business schema's `settings` field becomes `businessSettingsSchema.optional()` (an older doc may have none; reads
fill defaults). Numbers may carry decimals (12.5%); display rounding stays with the engine's `formatPct1` (C-ENGINE)
when plans 445/446 show them — this plan shows the stored value as typed.

### 2. Server (`server/routes/business.js`)
- `GET /` → `settings: { ...BUSINESS_SETTINGS_DEFAULTS, ...(doc.settings ?? {}) }` (defaults on read; nothing written
  on read).
- `PUT /settings` → `verifyToken`, `assertCan(req, res, 'editSettings', { type: 'businesses' })`,
  `businessSettingsSchema.safeParse(req.body)`; fail → 400 `{ error: 'Validation failed', issues }` (same shape as
  the generic routes); ok → `updateOne({ _id: req.user.businessId }, { $set: { settings: parsed } })` → 200 `{ settings }`.
  Log `business.settings.saved` / `business.settings.failed`.

### 3. Client
- `BusinessService.updateSettings(settings: BusinessSettings): Promise<void>` → `PUT
  ${environment.authApiUrl}/api/v1/business/settings`; on 200 patch `business_` with the returned `settings`.
- `SETTINGS_TABS` gets `{ key: 'business', labelKey: 'settings_tab_business', icon: 'building-2', ownerOnly: true }`
  after `team`; the page template gets one `@case ('business')` rendering the new tab.
- New `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.*`: reactive form
  with three number inputs (`inputmode="decimal"`, `%` suffix), validators mirroring the schema (target and margin
  `min(0)` + `max(99.9)`; overrun `min(0.1)` + `max(100)`), helper text under each field, «שמור» disabled while
  invalid or unchanged; on save → `updateSettings`, toast `settings_saved`; server 400 → toast
  `settings_invalid`.

### 4. Dictionary (append, group `general`)
| key | Hebrew |
|---|---|
| `settings_tab_business` | הגדרות עסק |
| `profit_target_pct` | יעד רווח נקי (%) |
| `profit_target_help` | הרווח שאתה רוצה מכל אירוע, באחוזים מההכנסה |
| `safety_margin_pct` | מרווח ביטחון (%) |
| `safety_margin_help` | סכום ביטחון מומלץ להוספה למחיר האירוע |
| `overrun_threshold_pct` | סף חריגה מספק (%) |
| `overrun_threshold_help` | מעל אחוז זה תשלום לספק יסומן באדום בסגירת אירוע |
| `pct_range_0_99` | חייב להיות בין 0 ל-99.9 |
| `pct_range_overrun` | חייב להיות בין 0.1 ל-100 |
| `settings_saved` | ההגדרות נשמרו |
| `settings_invalid` | ערך לא תקין – בדוק את השדות |

### 5. Icons
Add `Building2` to `src/app/app.config.ts` (import list + `LucideAngularModule.pick`).

## Functional Requirements

### Must Have (P0)
- [ ] One `settings` shape with defaults 25 / 10 / 10 in the shared Zod schema.
- [ ] `GET /api/v1/business` always returns full settings (defaults filled).
- [ ] `PUT /api/v1/business/settings` owner-only, validated; target ≥ 100 refused.
- [ ] «הגדרות עסק» tab in `/settings`, owner only; staff never see it or its numbers.

### Should Have (P1)
- [ ] Field help texts under each number.

## UI/UX Notes
- Same tab bar as plan 428; form in a single column card, max inline size ~28rem on desktop.
- RTL; `%` suffix placed with logical properties (`padding-inline-end`), numbers `dir="ltr"` inside the input.
- Run the `cssLayer` skill before the component `.scss`.

## Atomic Sub-tasks
- [ ] S1: Give business settings one validated shape with the agreed defaults — businessSettingsSchema, BUSINESS_SETTINGS_DEFAULTS, settings field optional, rebuild schemas — shared/schemas/entities/business.schema.ts
- [ ] S2: Let only the owner save the settings and always return them with defaults filled — GET / defaults, PUT /settings with assertCan editSettings + safeParse — server/routes/business.js
- [ ] S3: Prove defaults, validation, owner-only and same-business writes with server tests — every Done-when case — server/test/business-settings.test.js
- [ ] S4: Add the Business tab where the owner edits the three numbers — SETTINGS_TABS entry, @case, BusinessSettingsTabComponent, BusinessService.updateSettings, specs — src/app/pages/settings/**, src/app/core/services/business.service.ts, business.service.spec.ts
- [ ] S5: Add the Hebrew texts and the building icon — 11 dictionary keys, Building2 — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] S6: Build, test and hand over the settings checks — ng build, server suite, listed specs, log-query; Human runs the [human] items on desktop and mobile — this plan file

## Technical Considerations
- Dependencies: `SettingsPage`, `SETTINGS_TABS`, `PermissionService.isOwner_` (428); `BusinessService` (426/428);
  `assertCan` (427).
- New files: `business-settings-tab/**`, `server/test/business-settings.test.js`.
- Model changes: `businessSettingsSchema` + `BusinessSettings` type exported from `shared/schemas`.
- Backend / API: `PUT /api/v1/business/settings`; `GET /api/v1/business` fills defaults.
- Auth and validation: owner only (`editSettings`); strict Zod object, ranges above.
- Security surface: none new beyond one owner-only write route.
- Data / migration: none — missing `settings` reads as defaults; nothing is backfilled.
- Project checks: log-query Done-when; chef stories; 11 dictionary keys; RTL logical CSS; `Building2` registered;
  no new screen route (tab inside the lazy `/settings`).

## Backend Impact
- Collections affected: `businesses` (`settings` field written by the owner).
- New collections: no.
- Server changes needed: yes — `PUT /api/v1/business/settings`, defaults on `GET /api/v1/business`.

## Out of Scope
- Using the numbers: pricing meter, per-event overrides (plan 445), overrun colouring (plan 446).
- Removing the hard-coded 30% / 33% in `menu-intelligence.page.*` (plan 445).
- Baseline fields and tab (plan 431).
- Per-event-type targets, cost breakdowns.

## Critical Questions
None — defaults and owner-only rule are locked by spec 03.2 and the brief's Part 4.
