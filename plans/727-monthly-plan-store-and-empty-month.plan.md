# Plan 727 — Monthly plan: the month record, its module and a page to open a month and type revenue and targets

Status: draft
Depends-on: 723, 726
Track: code
Snapshot: 33a6c572

## Problem Statement
Dandan wants a monthly planning screen: what the month should bring in, what it costs, and what is left. The
feasibility audit (`docs/finance/monthly-planning-feasibility.md`, plan 661) found that the app has no notion of a
month at all (M1, M13 `missing`/`partial`), and the research report ("Restaurant dish and month analytics", section
"Updated decisions") refined how a month must be stored. On 2026-11-24 Dandan answered "decisions: all recommended".
This plan is monthly slice 1 of the revised order ("module and the empty month, unchanged") and carries these decisions:

- monthly 1 (keep): the screen is the business's own module `monthly_plan`; the consultant enters and reads numbers when
  acting in the business; staff never.
- monthly 2 (keep, refined): the month stores its own target set, copied from the business settings when the month is
  opened — food %, labour %, prime %, profit % and fixed (overhead) % — and the consultant may change the month's copy.
- N-M4: the starter targets come from the Israeli bands (food 30–35%, labour 30–35%, fixed and overhead 20–25%, net
  5–10%, prime at most 65%); every target is editable and the band is shown beside it.
- monthly 7 (change) + N-X1: the VAT rate and dealer type are read from the one business setting (plan 723:
  `vatRatePct`, default 18; `dealerType` `murshe` | `patur`); the month keeps a copy for history; all money is net.
- monthly 9 (keep, refined): revenue is typed by hand, net of VAT and discounts, without tips.
- N-M2: every amount is "not entered" (`null`) or a number, where 0 is a real value.

Later slices must fit the record without a migration: month close with a reopen reason and an audit log (N-M6, N-X2),
"start next month" (N-M5), fixed lines and the labour total (plan 729), and per-employee pay lines that stay owner-only
while everyone else gets server-computed totals (N-M3, ADR 0034 from plan 722).

Verified on `origin/main` 33a6c572:
- `shared/schemas/modules-pure.ts:4` has five keys (`events`, `event_logistics`, `frontdesk`, `ai_create`,
  `consultant_diag`); `DEFAULT_MODULES` (`:8`) has four; `MODULE_OF_TYPE` (`:26-34`) gates generic types only.
- `shared/schemas/modules.ts:6-9` — `modulesFieldSchema` is `.max(5)`: a sixth key would be refused by the platform
  write. It must follow the key count.
- The platform dialog lists every `MODULE_KEYS` entry by itself, labelled `'module_' + key`
  (`platform-business-dialog.component.html:28`); the dictionary has `module_consultant_diag` at line 2362.
- `shared/schemas/entities/business.schema.ts:8-18` — `BUSINESS_SETTINGS_DEFAULTS` and `businessSettingsSchema`
  (`profitTargetPct` 25, an event margin, not a month's net profit); `GET /api/v1/business` fills the defaults on read
  (`server/routes/business.js:42`); `PUT /business/settings` is `editSettings` and keeps a stored `priceRiseAlertPct`
  when the body leaves it out (`:50-72`).
- `server/routes/diag.js:28-30` is the pattern for a money router: `verifyToken`, the module gate,
  `assertCan(req, res, 'editMoney', { type })`, `dataWriteLimiter`; `checkStoredDoc` before every insert.
- `server/utils/permissions.js:20-25` — `editMoney` is owner-only for staff and allowed for a consultant
  (`CONSULTANT_DENIED` is `manageTeam`, `editSettings` only); `OWNER_ONLY_TYPES` lists the owner-only types.
- `server/services/business.js:119` — `deleteBusinessServerData` deletes the server-only collections by a fixed list.
- `src/app/core/components/tab-chips/tab-chips.component.ts:52-64` — the `dashboard` chip group (venues, metadata,
  suppliers, trash); `TabChip.modules` hides a chip by module (`:28`, filter at `:176`).
- `src/app/pages/diagnosis/diagnosis.guard.ts` and `src/app/pages/diagnosis/services/diagnosis.service.ts` are the
  pattern for a page guard and a page-scoped HTTP client of a router-written type.

## Goals & Success Criteria
**Primary:** once the platform admin switches «תכנון חודשי» on for a business, the owner or the consultant opens
«תכנון חודשי» from the dashboard chips, opens a month, types the expected and the actual revenue, sees the five
targets copied from the business settings with the Israeli band beside each, changes one, and finds everything saved
after a reload. A staff member never sees the chip, the page or the data.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/month-plans.test.js` (A4), `server/test/month-rules.test.js` (A1), `server/test/modules-schema.test.js` (A1), `server/test/business-settings.test.js` (A2) and `server/test/admin-business-delete.test.js` (A3).
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/monthly-plan/monthly-plan.page.spec.ts` (A7), `src/app/pages/monthly-plan/monthly-plan.guard.spec.ts` (A6), `src/app/pages/monthly-plan/services/month-plan.service.spec.ts` (A6), `src/app/core/components/tab-chips/tab-chips.component.spec.ts` (A8) and `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts` (A9).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/727-monthly-plan-store-and-empty-month.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/727-monthly-plan-store-and-empty-month.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] As the platform admin, open a test business, tick «תכנון חודשי» and save with a reason; sign in as that business's owner: the dashboard chips show «תכנון חודשי».
- [human] On «תכנון חודשי» with no month yet: the page says «עוד אין חודשים. פתחו את החודש הראשון.»; press «חודש חדש», keep the current month and press «פתח חודש»: the month opens with both revenue boxes empty and marked «לא הוזן», and the targets 32 / 33 / 65 / 25 / 10 with «מקובל בישראל» beside each.
- [human] Type 0 in «הכנסה בפועל» and 120000 in «הכנסה צפויה», change «רווח נקי» to 8, press «שמירה», reload: the 0 is still 0 (not «לא הוזן»), the 120000 and the 8 are kept.
- [human] the list's page with no items · open the page · a message says the list is empty — «תכנון חודשי» of a business with no month shows «עוד אין חודשים. פתחו את החודש הראשון.».
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — with the server stopped, «תכנון חודשי» shows «לא הצלחנו לטעון את החודשים» and «נסו שוב».
- [human] Sign in as a staff member of the same business: no «תכנון חודשי» chip, and typing `/monthly-plan` in the address bar lands on the dashboard.

## Execution Mode
- Parallel: no with plan 724 — both append a module key on the same line of `shared/schemas/modules-pure.ts` and touch
  `modulesFieldSchema`; run after 724 merges (or expect a one-line union).
- Runs after the dish chain (724–726). Plan 726 adds `src/app/core/utils/month-key.util.ts`; this plan turns that file
  into a thin wrapper over the `shared/schemas/month/` month rules (one month rule, not two) and keeps its spec green.
- Concurrent plans: any that do not touch the module registry, `business.schema.ts`, the business settings tab or the
  tab chips.
- Isolated DB: no — a new collection `monthPlans`; nothing existing is rewritten.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/modules-pure.ts
shared/schemas/modules.ts
shared/schemas/money-fields.ts
shared/schemas/month/**
shared/schemas/entities/month-plan.schema.ts
shared/schemas/entities/index.ts
shared/schemas/entities/business.schema.ts
server/constants/collections.js
server/utils/permissions.js
server/routes/month-plans.js
server/routes/business.js
server/services/business.js
server/app.js
server/db.js
server/test/month-plans.test.js
server/test/month-rules.test.js
server/test/modules-schema.test.js
server/test/modules-registry.test.js
server/test/business-settings.test.js
server/test/admin-business-delete.test.js
server/test/collections.test.js
server/breadcrumbs.md
src/app/pages/monthly-plan/**
src/app/pages/monthly-plan/monthly-plan.page.spec.ts
src/app/pages/monthly-plan/monthly-plan.guard.spec.ts
src/app/pages/monthly-plan/services/month-plan.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/utils/month-key.util.ts
src/app/core/utils/month-key.util.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/pages/settings/components/business-settings-tab/**
src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/components/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/modules/modules-map.md
server/test/admin-platform.test.js
server/test/cross-business.test.js
server/test/helpers/app.js
server/test/invoice-memory.test.js
server/test/permissions.test.js
src/app/core/services/async-storage.service.spec.ts
src/app/pages/settings/settings.page.spec.ts
docs/workflow-kit/manifest.json
server/test/business-route.test.js
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — `monthPlans` is read and written only through `server/routes/month-plans.js`, behind
  `assertCan(req, res, 'editMoney', { type: 'monthPlans' })`: the owner and a consultant with a live grant pass, staff
  are refused every call (reads too). `monthPlans` joins `OWNER_ONLY_TYPES` and `MONEY_FIELDS` (`targets`, `revenue`,
  `vatRatePct`). The default month targets live in the business settings and stay `editSettings` (owner only); the
  consultant changes the month's own copy (monthly decision 2), so the consultant rule is unchanged.
- INV-2: preserves — every query is `scopeFilter(req)`, the business comes from the signed token; the collection is
  server-only (not `userData`, not cloneable), and `deleteBusinessServerData` (`server/services/business.js`) deletes it
  with the business.
- INV-4: preserves — `monthPlanSchema` in `shared/schemas/entities/month-plan.schema.ts`, registered in
  `SCHEMA_BY_COLLECTION`; the router validates each body with its own input schema and the stored document with
  `checkStoredDoc`; `businessSettingsSchema` gains an optional `monthTargets`.
- INV-none: preserves — module gate: every `/api/v1/month-plans/**` route runs `requireModule('monthly_plan')` (the
  active business's module, not the home one); `DEFAULT_MODULES` is unchanged, so no existing business sees anything
  until the platform admin switches it on. No AI call, no generic-API type, no taxonomy (the targets are fixed keys).

## Reuse Check
- `month-plan.schema` (`monthPlanSchema`, `monthPlanCreateInputSchema`, `monthPlanUpdateInputSchema`) — family: entity-schemas — rung: 3 — why: one more `z.strictObject` entity file registered in `SCHEMA_BY_COLLECTION`, beside `diagnosis.schema.ts`
- `month-rules` (`MONTH_KEY_PATTERN`, `monthKeyOf`, `shiftMonth`, `monthLabel`, `MONTH_TARGET_KEYS`, `MONTH_TARGET_DEFAULTS`, `MONTH_TARGET_BANDS`) — family: helpers — rung: 3 — why: pure month and target rules the server (creation) and the browser (picker, bands) both need, so they live in `shared/schemas/month/` like `shared/schemas/units/to-base.ts`; no zod, so the page does not pull it twice
- `month-plans` router — family: server-auth — rung: 2 — why: the `diag.js` chain as is (`verifyToken`, `requireModule`, `assertCan`, `dataWriteLimiter`, `scopeFilter`, `checkStoredDoc`); no new auth piece
- `MonthPlanService` — family: http — rung: 3 — why: a page-scoped client through the `API` map (new `API.monthPlans`), the same shape as `DiagnosisService`
- `monthlyPlanGuard` — family: page-entry-loading — rung: 3 — why: like `diagnosisGuard`: staff → `/dashboard`, else `moduleGuard(['monthly_plan'])`
- `monthly-plan.page` — family: list-page — rung: 2 — why: `app-page-header` and `app-empty-state` as they are; the month body is a form of `app-form-field` + `appNumberBox` boxes and `app-custom-select` for the month, no new UI piece
- `TabChip.money` flag — family: module-gate — rung: 3 — why: one more hide rule beside `modules` (shown only when `PermissionService.can('editMoney')`), so staff never see a money chip

## Defaults

- confirm-destructive-action — exception — why: nothing is deleted or discarded; a month cannot be removed in this plan.
- empty-state-on-list — applies — how: `app-empty-state` «עוד אין חודשים. פתחו את החודש הראשון.» with the «חודש חדש» button.
- loading-and-error-states — applies — how: `app-loader` while the months load; a failed load shows «לא הצלחנו לטעון את החודשים» with «נסו שוב»; a failed save shows «שמירת החודש נכשלה. נסו שוב.» and keeps the typed values.
- unsaved-changes-on-leave — applies — how: the month form uses `useUnsavedChanges`; the route has `canDeactivate: [pendingChangesGuard]`; switching to another month with typed changes asks first. The settings tab already has the guard.
- hints-in-tooltips — exception — why: no dialog; the revenue rule and the bands are short lines on the page, not explanations inside a dialog.
- leave-and-return — exception — why: the page sends the user nowhere to act.
- app-list-container — exception — why: the page is one month's form with a month picker, not a list of rows.
- one-breakpoint-set — applies — how: no new `@media`; the boxes wrap with the shared form layout.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to open this month and type what I expect to sell and what I sold, so the month has a starting point I can plan against.
- As a restaurant owner, I want my month's targets to start from sensible Israeli numbers that I can change, so I do not have to invent them.
- As the consultant of a restaurant, I want to type the month's numbers and adjust its targets when I work in the client's business, so I can prepare the plan with the owner.
- As an owner, I want my staff never to see the month's money, so pay and profit stay private.

## Functional Requirements

### Must Have (P0)
- [ ] **Module key:** `'monthly_plan'` appended to `MODULE_KEYS` after the existing keys (`modules-pure.ts:4`);
  `DEFAULT_MODULES` unchanged; `modulesFieldSchema` `.max(MODULE_KEYS.length)` instead of `.max(5)`; no
  `MODULE_OF_TYPE` row (the type is not served by the generic API). Dictionary `module_monthly_plan` «תכנון חודשי».
- [ ] **Month and target rules** (`shared/schemas/month/month-rules.ts`, no zod):
  `MONTH_KEY_PATTERN` = `^(20\d\d)-(0[1-9]|1[0-2])$` (`2000-01` … `2099-12`); `monthKeyOf(nowMs)` = the calendar month in
  `Asia/Jerusalem` (the rule of `monthKeys` in `server/services/business-report.js:24`); `shiftMonth(key, n)`;
  `monthLabel(key, locale)` (`he-IL`, e.g. «נובמבר 2026»); `MONTH_TARGET_KEYS = ['foodPct', 'labourPct', 'primePct',
  'fixedPct', 'profitPct']`; `MONTH_TARGET_DEFAULTS = { foodPct: 32, labourPct: 33, primePct: 65, fixedPct: 25,
  profitPct: 10 }` (food + labour + fixed + profit = 100, prime = food + labour, each inside its N-M4 band);
  `MONTH_TARGET_BANDS = { foodPct: [30, 35], labourPct: [30, 35], primePct: [null, 65], fixedPct: [20, 25],
  profitPct: [5, 10] }` (`null` = no lower bound).
- [ ] **Default targets in the business settings:** `businessSettingsSchema.monthTargets` optional
  `z.strictObject` of the five keys, each `z.number().min(0).max(100)`; `GET /api/v1/business` fills
  `monthTargets: MONTH_TARGET_DEFAULTS` when absent (beside the other defaults at `business.js:42`);
  `PUT /business/settings` keeps a stored `monthTargets` when the body leaves it out (the same keep rule as
  `priceRiseAlertPct`, `:58-63`). Still `editSettings`: the owner only.
- [ ] **Entity `monthPlans`** (`shared/schemas/entities/month-plan.schema.ts`, registered in `SCHEMA_BY_COLLECTION`):
  `z.strictObject({ ...baseDocShape, month, status, targets, vatRatePct, dealerType, revenue })` with
  `month` matching `MONTH_KEY_PATTERN`; `status: z.enum(['open', 'closed'])` (`MONTH_PLAN_STATUSES`; this plan writes
  only `open`); `targets` the five keys (required numbers 0–100); `vatRatePct` 0–100; `dealerType` the plan 723 enum
  (`murshe` | `patur`); `revenue: z.strictObject({ plan: amount, actual: amount })` where
  `amount = z.number().min(0).max(1_000_000_000).nullable()` (`null` = not entered, 0 = a real 0). Exported type
  `MonthPlan`. Inputs: `monthPlanCreateInputSchema = { month }`; `monthPlanUpdateInputSchema = { revenue?: { plan?,
  actual? }, targets?: partial of the five }`, at least one field.
- [ ] **Collection registration:** `COLLECTIONS` entry `monthPlans` with `userData: false` (server-only: staff can never
  read it through the generic API), `cloneable: false`, `backup: false`, `softDelete: false`; `OWNER_ONLY_TYPES` gains
  `monthPlans`; `MONEY_FIELDS.monthPlans = ['targets', 'revenue', 'vatRatePct']`; unique index
  `{ businessId: 1, month: 1 }` named `month_plans_business_month` in `server/db.js`; `deleteBusinessServerData` adds
  `monthPlans` to its delete list.
- [ ] **Router `server/routes/month-plans.js`**, mounted at `/api/v1/month-plans` in `server/app.js`; chain
  `verifyToken`, `requireModule('monthly_plan')`, `assertCan(req, res, 'editMoney', { type: 'monthPlans' })`,
  `dataWriteLimiter`:
  - `GET /` → `{ months: MonthPlan[] }` of the business, newest month first (at most 120).
  - `GET /:month` → the month, `404 { error: 'MONTH_NOT_FOUND' }`; a key that fails the pattern → `400`.
  - `POST /` `{ month }` → `201` the new month: `status: 'open'`, `targets` = the stored `settings.monthTargets` or
    `MONTH_TARGET_DEFAULTS`, `vatRatePct` / `dealerType` = the plan 723 business setting or its defaults (18, `murshe`),
    `revenue: { plan: null, actual: null }`, `businessId` from the token, `createdBy` from `actorOf(req)`;
    `409 { error: 'MONTH_EXISTS' }` when the month is already there (checked first, and the unique index's duplicate
    key error maps to the same answer).
  - `PUT /:month` body `monthPlanUpdateInputSchema` → `200` the stored month; sets only the named paths
    (`revenue.plan`, `revenue.actual`, `targets.<key>`) and `updatedAt`; `null` clears an amount; a closed month →
    `409 { error: 'MONTH_CLOSED' }` (no route closes a month yet; the rule is here for N-M6).
  - Logs: `month.created`, `month.saved`, `month.*.failed` with the month id and key only, never an amount.
- [ ] **Browser client** `MonthPlanService` (`src/app/pages/monthly-plan/services/month-plan.service.ts`):
  `list()`, `get(month)`, `create(month)`, `update(month, body)` through `API.monthPlans(path?)` added to the `API` map
  in `http-storage.adapter.ts`; throws the `HttpErrorResponse` on a refusal.
- [ ] **Route and guard:** `monthly-plan` in `app.routes.ts` (append), `canActivate: [authGuard, monthlyPlanGuard]`,
  `canDeactivate: [pendingChangesGuard]`, `runGuardsAndResolvers: 'paramsOrQueryParamsChange'`, the open month in
  `?month=YYYY-MM`. `monthlyPlanGuard` (`src/app/pages/monthly-plan/monthly-plan.guard.ts`): staff → `/dashboard`;
  otherwise `moduleGuard(['monthly_plan'])`.
- [ ] **Chip:** in the `dashboard` group of `tab-chips.component.ts`, `{ id: 'monthly-plan', labelKey: 'mp_chip',
  icon: 'calendar-days', path: '/monthly-plan', modules: ['monthly_plan'], money: true }`; new `TabChip.money?: boolean`
  hides a chip unless `PermissionService.can('editMoney')`; `GROUP_BY_PATH_PREFIX` gains `['/monthly-plan', 'dashboard']`.
- [ ] **Page** `src/app/pages/monthly-plan/monthly-plan.page.*` (signals, `inject()`, OnPush):
  - Loads `list()`; shows `app-loader`, then either `app-empty-state` (`mp_empty`) with the «חודש חדש» button, or the
    month picker (`app-custom-select` of the stored months, labelled with `monthLabel`, newest first) and the open month
    (from `?month=`, else the newest).
  - «חודש חדש» shows a second `app-custom-select` of the months from 12 before to 2 after the current Jerusalem month
    that are not stored yet (current month preselected) and «פתח חודש»; on `201` the new month opens; on `409` the
    stored month is loaded and opened with the toast `mp_month_exists`.
  - Revenue card «הכנסות»: «הכנסה צפויה» and «הכנסה בפועל», each an `appNumberBox` in ₪; an empty box is `null` and
    shows the muted word «לא הוזן»; the line «לפני מע״מ, אחרי הנחות, בלי טיפים» under the card title.
  - Targets card «יעדים לחודש»: five `appNumberBox` boxes in % (labels in UI/UX Notes), each with the band line
    («מקובל בישראל: 30–35%», for prime «מקובל בישראל: עד 65%»); a value outside its band gets the amber tag
    «מחוץ לטווח» (`.c-chip--tag --amber`).
  - The VAT line: «מע״מ 18% · עוסק מורשה — הועתק מהגדרות העסק בפתיחת החודש» (rate and dealer type from the month,
    labels from plan 723's dealer-type keys).
  - «שמירה» sends only changed fields (`update`), toast `mp_saved`; error toast `mp_save_failed`, the typed values stay.
  - A month with `status: 'closed'` shows every box read-only and the tag «סגור» (no route closes one yet).
- [ ] **Business settings tab:** a group «יעדים לחודש חדש» with the same five boxes and band lines, saved with the
  other numbers of the tab in one `PUT /business/settings`; it changes only months opened afterwards.

### Should Have (P1)
- [ ] «הסכום כולל מע״מ» toggle beside each revenue box (hidden for `patur`): when on, the typed amount is divided by
  `1 + vatRatePct / 100` (rounded to 2 decimals with `roundMoney`) before it is stored, and the box shows the net
  amount after leaving it.
- [ ] A soft line under the targets when food + labour + fixed + profit ≠ 100: «סכום היעדים הוא {{sum}}% ולא 100%»
  (no refusal: the owner may plan a month that does not add up).
- [ ] Maps: `server/breadcrumbs.md` names the router and the collection; `src/app/pages/breadcrumbs.md` the page
  folder; `src/app/core/components/breadcrumbs.md` the chip's `money` flag; `src/app/core/services/breadcrumbs.md`
  `API.monthPlans`; `docs/modules/modules-map.md` gets the `monthly_plan` row in the C-MODULES table;
  `docs/brain/component-families.md` gets the month-rules helper, the entity file and the chip flag.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; no new `.c-*` class; no new `@media`.
- The chip sits after «ספקים» in the dashboard group.
- Dictionary keys (append-only, `general`): `module_monthly_plan` ("תכנון חודשי"), `mp_chip` ("תכנון חודשי"),
  `mp_title` ("תכנון חודשי"), `mp_month_label` ("חודש"), `mp_new_month` ("חודש חדש"), `mp_create` ("פתח חודש"),
  `mp_empty` ("עוד אין חודשים. פתחו את החודש הראשון."), `mp_month_exists` ("החודש הזה כבר פתוח"),
  `mp_load_failed` ("לא הצלחנו לטעון את החודשים"), `mp_retry` ("נסו שוב"), `mp_revenue_title` ("הכנסות"),
  `mp_revenue_plan` ("הכנסה צפויה"), `mp_revenue_actual` ("הכנסה בפועל"),
  `mp_revenue_rule` ("לפני מע״מ, אחרי הנחות, בלי טיפים"), `mp_not_entered` ("לא הוזן"),
  `mp_includes_vat` ("הסכום כולל מע״מ"), `mp_targets_title` ("יעדים לחודש"), `mp_target_food` ("עלות מזון"),
  `mp_target_labour` ("עלות צוות"), `mp_target_prime` ("עלות ראשית (מזון + צוות)"),
  `mp_target_fixed` ("הוצאות קבועות"), `mp_target_profit` ("רווח נקי"),
  `mp_band` ("מקובל בישראל: {{from}}–{{to}}%"), `mp_band_max` ("מקובל בישראל: עד {{to}}%"),
  `mp_out_of_band` ("מחוץ לטווח"), `mp_targets_sum` ("סכום היעדים הוא {{sum}}% ולא 100%"),
  `mp_vat_line` ("מע״מ {{rate}}% · {{dealer}} — הועתק מהגדרות העסק בפתיחת החודש"), `mp_status_closed` ("סגור"),
  `mp_saved` ("החודש נשמר"), `mp_save_failed` ("שמירת החודש נכשלה. נסו שוב."),
  `mp_settings_targets_title` ("יעדים לחודש חדש").
- Icon `calendar-days` is already registered (`src/app/app.config.ts`); no new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the monthly planning module and the shared month and target rules — module key, max follows the key count, month key pattern, Jerusalem month, labels, target defaults and bands; tests for every rule and for the key being off by default — shared/schemas/modules-pure.ts, shared/schemas/modules.ts, shared/schemas/month/month-rules.ts, server/test/month-rules.test.js, server/test/modules-schema.test.js
- [ ] A2: Let the business settings hold the default targets for a new month — optional monthTargets, filled on read, kept when a save leaves it out; owner only — shared/schemas/entities/business.schema.ts, server/routes/business.js, server/test/business-settings.test.js
- [ ] A3: Store one month per business with its targets, VAT copy and revenue, money-protected — entity schema and inputs, collection entry, owner-only type, money fields, unique index, delete with the business — shared/schemas/entities/month-plan.schema.ts, shared/schemas/entities/index.ts, shared/schemas/money-fields.ts, server/constants/collections.js, server/utils/permissions.js, server/db.js, server/services/business.js, server/test/admin-business-delete.test.js, server/test/collections.test.js
- [ ] A4: Let the owner and the consultant list, open, create and change a month on the server — the four routes, module gate, staff refused, 409 for a second copy and for a closed month, null kept apart from 0; tests for owner, consultant, staff, second business, module off and the generic API refusing the type — server/routes/month-plans.js, server/app.js, server/test/month-plans.test.js, server/test/modules-registry.test.js
- [ ] A5: Teach the browser to call the month routes — API map entry and the page-scoped client — src/app/core/services/http-storage.adapter.ts, src/app/pages/monthly-plan/services/month-plan.service.ts
- [ ] A6: Keep staff and businesses without the module out of the monthly page — guard and route with the leave question; specs for staff, module off, owner — src/app/pages/monthly-plan/monthly-plan.guard.ts, src/app/pages/monthly-plan/monthly-plan.guard.spec.ts, src/app/pages/monthly-plan/services/month-plan.service.spec.ts, src/app/app.routes.ts
- [ ] A7: Build the monthly page to open a month and type revenue and targets — empty state, picker, new month, revenue and target cards, bands, VAT line, save, closed read-only, VAT-included toggle; spec: empty box saves null, 0 saves 0, 409 opens the stored month, a failed save keeps the values — src/app/pages/monthly-plan/**
- [ ] A8: Show the monthly chip only to money roles of a business with the module — money flag, chip, path group; spec for owner, consultant, staff and module off — src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts
- [ ] A9: Let the owner set the default targets for new months in the business settings — five boxes with bands in the business tab, saved with the tab; spec — src/app/pages/settings/components/business-settings-tab/**
- [ ] A10: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A11: Record the month in the maps and run every automatic check — paste outputs under Execution Notes — server/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/core/components/breadcrumbs.md, src/app/core/services/breadcrumbs.md, docs/modules/modules-map.md, docs/brain/component-families.md

## What happens when
- Two tabs open the same month at once: the second `POST` gets `409 MONTH_EXISTS` (the unique index decides); the page
  loads the stored month and says «החודש הזה כבר פתוח».
- The owner changes the default targets in the settings after opening November: November keeps its copy; December,
  opened later, gets the new defaults.
- The owner changes the VAT rate or dealer type (plan 723) mid-month: the open month keeps the copy it was opened with;
  a later slice may offer "take the new rate".
- The platform admin switches the module off: every route answers `403 MODULE_OFF`, the chip disappears, the guard
  sends the user to the dashboard; the stored months stay and come back when it is switched on.
- A consultant's grant is removed while he has the page open: his next call is refused by the session check (ADR 0032)
  and the page shows the load or save error.
- A staff member calls `/api/v1/month-plans` directly: `403`; `/api/v1/data/monthPlans`: refused as an unknown type.
- A box is cleared after it held 0: `null` is sent and the month shows «לא הוזן» again.

## Technical Considerations
- Dependencies: plan 723 (business-level `vatRatePct` and `dealerType` and their dictionary labels). If 723 merged
  with other field names, use its names; the month's own fields keep the names above.
- **Room for later slices (no migration needed):**
  - Month close (N-M6, N-X2): `status` already has `closed`, and `PUT` already refuses a closed month. The close slice
    adds optional `closedAt`, `closedBy` and a reopen route that needs a typed reason; the audit rows (who, when, field,
    old value, new value) go to a new server-only collection (e.g. `monthPlanLog`), not into this document, so the
    month stays small.
  - Carry-forward (N-M5): an optional `copiedFrom` month key; the copy leaves amounts it lacks as `null`, never 0.
  - Fixed lines, rough mode and labour total (plan 729) and typed purchases: new optional groups on this document.
  - Per-employee pay lines (N-M3, ADR 0034): a separate owner-only collection, never inside `monthPlans`, so every
    month read a consultant makes can never carry a person's pay; the server writes or computes the labour total that
    the month shows.
- **Planner choice for Dandan to grade:** the month's profit target does not start from `settings.profitTargetPct`
  (25, an event's margin); it starts from the month defaults (net 10%, top of the 5–10% band), so food + labour + fixed
  + profit = 100. `behaviour:` reverse = seed `profitPct` from `profitTargetPct`.
- Known collision: branch `chore/restaurant-staging` (not on main) appends `'tables'` to `MODULE_KEYS` and a
  `MODULE_OF_TYPE` row; plan 724 appends `'dish_analysis'`. This plan appends `'monthly_plan'` after the keys on main;
  the staging merge needs a trivial union of the key list, and `modulesFieldSchema` following `MODULE_KEYS.length`
  removes the second conflict.
- Server-only collection: `collections.test.js` requires `userData` for a `backup` entry, so `backup` is false; the
  generic API never serves the type. `modules-registry.test.js` lists index names; add `month_plans_business_month`.
- Cost: none (no AI, no paid service). Security: money data; staff refused on every route; logs carry ids and the
  month key only.

## Out of Scope
- Every derived number (profit, prime cost, break-even, completeness): plan 728.
- Fixed lines, rough mode, labour, typed purchases: plan 729.
- Month close, reopen, audit, carry-forward, per-employee lines, invoices as food cost, closed events as a revenue hint,
  daily target: later slices.
- Deleting a month.

## Critical Questions
- none — Dandan answered "decisions: all recommended" (2026-11-24); the one unasked choice (the month's profit target
  start value) is logged above as a `behaviour:` decision for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
