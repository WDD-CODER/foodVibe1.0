# Plan 723 — One VAT rate and dealer type for the whole business, set by the owner

Status: draft
Depends-on: none
Track: code
Snapshot: 33a6c572

## Problem Statement
Dandan approved (2026-11-24, "decisions: all recommended") dish decision 6 (keep, refined), monthly decision 7
(changed) and new decision N-X1 of the research report "Research sharpens FoodVibe's dish and month plans", section
"Updated decisions": one VAT rate per business, default 18%, stored at business level and read by dish analysis, the
month screen and the consultant diagnosis; a dealer-type setting (עוסק מורשה / עוסק פטור) says whether costs are
counted net or gross. Both feasibility reports' section 6 recommend the same single place.

Verified on `origin/main` 33a6c572:
- `shared/schemas/entities/business.schema.ts:8` — `BUSINESS_SETTINGS_DEFAULTS = { profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10, priceRiseAlertPct: 5 }`; `businessSettingsSchema` (`:10-18`) is a `z.strictObject` whose newest field `priceRiseAlertPct` is optional (absent on older documents, reads fill the default).
- `server/routes/business.js:38-48` — `GET /api/v1/business` returns `settings: { ...BUSINESS_SETTINGS_DEFAULTS, ...business.settings }` to any member. `:51-73` — `PUT /api/v1/business/settings` is `assertCan(... 'editSettings' ...)` (owner only: staff are refused, and a consultant is refused through `CONSULTANT_DENIED`, `server/utils/permissions.js:22`), replaces `settings` whole, and keeps a stored `priceRiseAlertPct` when the body has none.
- `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts` — a reactive form of four `%` number fields driven by the `fields` array; `canSave` and `hasRealChanges` compare only the keys in `fields`; `save()` sends `form.getRawValue()` through `BusinessService.updateSettings` (`src/app/core/services/business.service.ts:83`).
- No VAT field exists at business level. The diagnosis keeps its own: `shared/schemas/entities/diagnosis.schema.ts:13` `vatPct ... .default(18)`; `server/routes/diag.js:69-70` creates a diagnosis with `pricesIncludeVat: parsed.data.pricesIncludeVat ?? true, vatPct: parsed.data.vatPct ?? 18`; the browser's create call sends only `name` and `periodDays` (`src/app/pages/diagnosis/services/diagnosis.service.ts:43`), so every new diagnosis gets 18 today. Its menu step (`diag-menu.component.ts:109-110`) reads the diagnosis's own `vatPct` — unchanged by this plan.
- `shared/schemas/money-fields.ts` already lists `businesses: ['settings', 'baseline']`, so the new fields are money fields with no change.

## Goals & Success Criteria
**Primary:** in «הגדרות עסק» the owner sees «שיעור מע״מ (%)» (18 until changed) and «סוג עוסק» (עוסק מורשה until changed), saves them with the other numbers, and a new consultant diagnosis in that business starts with the business's VAT rate.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts` (A4).
- [auto] `pnpm run test:server` exits 0, including `server/test/business-settings.test.js` (A2), `server/test/modules-schema.test.js` (A1) and `server/test/diag-router.test.js` (A3).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/723-business-vat-rate-and-dealer-type.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/723-business-vat-rate-and-dealer-type.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] As the owner, open «הגדרות» → «הגדרות עסק»: «שיעור מע״מ (%)» shows 18 and «סוג עוסק» shows «עוסק מורשה». Change the rate to 17 and the type to «עוסק פטור», press «שמור»: the toast «ההגדרות נשמרו» shows, and after a reload both values are still 17 and «עוסק פטור».
- [human] Type 101 in «שיעור מע״מ (%)»: the field shows «חייב להיות בין 0 ל-100» and «שמור» stays disabled.
- [human] As a consultant acting in that business (rate 17 from the card above), create a new diagnosis: its menu step shows «אחוז מע״מ» 17, not 18. A diagnosis made before the change keeps its own rate.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — with the server stopped, saving «הגדרות עסק» shows «השמירה נכשלה» and the typed values stay in the boxes so «שמור» can be pressed again.

## Execution Mode
- Parallel: yes — no open plan on main writes these files.
- Concurrent plans: 722 (documents only). Plans 724 and 727 depend on this one.
- Isolated DB: no — two optional fields on the existing `businesses.settings`; stored documents without them read the defaults.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/business.schema.ts
server/routes/business.js
server/routes/diag.js
server/test/business-settings.test.js
server/test/modules-schema.test.js
server/test/diag-router.test.js
src/app/pages/settings/components/business-settings-tab/**
src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts
src/app/pages/breadcrumbs.md
server/breadcrumbs.md
src/app/pages/settings/settings.page.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — the two fields live in `businesses.settings`, written only through `PUT /api/v1/business/settings` (`editSettings`: the owner; staff and consultants are refused as today). Any member reads them through `GET /api/v1/business` as today. `server/routes/diag.js` only reads the active business's settings when it creates a diagnosis; its `editMoney` + `requireHomeModule('consultant_diag')` gate is unchanged. Money fields: `settings` is already in `MONEY_FIELDS.businesses`. Module gating: none — VAT is a business setting every module reads, so it is not behind `dish_analysis` or `monthly_plan`.
- INV-4: preserves — the fields are added to `businessSettingsSchema` in `shared/schemas/entities/business.schema.ts`; the server validates the PUT body against it as today.
- INV-2: preserves — the business document is not cloned from `__master__`; no scoped query changes.

## Reuse Check
- Dealer-type picker in the business settings form — family: search-combobox — rung: 2 — why: `app-custom-select` is the registry's "pick one value of a short fixed list", used with `formControlName` and two options
- VAT rate field — family: number-box — rung: 1 — why: one more row of the existing `fields` loop (`appNumberBox` + `%` suffix)

## Defaults

- confirm-destructive-action — exception — why: nothing is deleted; a changed rate is a setting saved with «שמור».
- empty-state-on-list — exception — why: no list is added.
- loading-and-error-states — applies — how: the tab keeps its save states («שומר...», «ההגדרות נשמרו», «ערך לא תקין – בדוק את השדות», «השמירה נכשלה»); the new fields show their own range error.
- unsaved-changes-on-leave — applies — how: `hasRealChanges()` includes the two new fields, so leaving the tab with a changed rate or type asks first (the settings page's existing guard).
- hints-in-tooltips — exception — why: this is a page tab, not a dialog; the tab already shows a help line under each field, and the new fields follow it.
- leave-and-return — exception — why: the user stays on the settings tab.
- app-list-container — exception — why: a form, not a list.
- one-breakpoint-set — applies — how: no new `@media`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want to set my VAT rate and whether I am an עוסק מורשה or עוסק פטור once, so that every money screen computes my prices and costs the same way.
- As a consultant advising a kitchen, I want a new diagnosis to start with that kitchen's VAT rate, so that I do not fix 18 by hand when the rate is different.

## Functional Requirements

### Must Have (P0)
- [ ] **Schema** (`business.schema.ts`): `businessSettingsSchema` gains `vatRatePct: z.number().min(0).max(100).optional()` and `dealerType: z.enum(['murshe', 'patur']).optional()`, each with a one-line comment (plan 723, N-X1; absent on older documents, reads fill the default). Export `DEALER_TYPES = ['murshe', 'patur'] as const` and type `DealerType`. `BUSINESS_SETTINGS_DEFAULTS` gains `vatRatePct: 18, dealerType: 'murshe'` (still `as const`). The comment above `BusinessSettings` says six fields.
- [ ] **GET** `/api/v1/business`: no code change — the existing spread fills `vatRatePct: 18` and `dealerType: 'murshe'` when they are not stored, and writes nothing.
- [ ] **PUT** `/api/v1/business/settings`: the "keep the stored value when the body has none" rule now covers every optional key — `priceRiseAlertPct`, `vatRatePct`, `dealerType` — through one small list in the route (`OPTIONAL_SETTINGS_KEYS`), so an older three-number body never wipes a stored VAT rate or dealer type. Body values are validated by the schema (rate 0–100, type one of the two); a wrong value is 400 as today. Owner only, as today.
- [ ] **Diagnosis default** (`server/routes/diag.js` `POST /`): `vatPct: parsed.data.vatPct ?? <the active business's vatRatePct>`, read from `getBusiness(req.user.businessId)` with `BUSINESS_SETTINGS_DEFAULTS` filled (so a business with nothing stored still gives 18). A body `vatPct` still wins. `pricesIncludeVat` is unchanged (`?? true`). Existing diagnoses are never rewritten; the menu step keeps reading the diagnosis's own `vatPct`.
- [ ] **Settings tab** (`business-settings-tab.component.*`):
  - A fifth row in `fields`: `vatRatePct`, label `vat_rate_pct`, help `vat_rate_help`, error `vat_rate_range`; control validators `required`, `min(0)`, `max(100)`; same `%` suffix and `appNumberBox`.
  - Under the number rows, a «סוג עוסק» row: `app-custom-select` bound to a `dealerType` form control with the options `[{ value: 'murshe', label: 'dealer_type_murshe' }, { value: 'patur', label: 'dealer_type_patur' }]` (labels translated by the select), and the help line `dealer_type_help`.
  - `stored`, `canSave`, `hasRealChanges` and `saveAll` compare all six settings (the five `fields` keys plus `dealerType`), not only the `fields` loop; `save()` sends all six.

### Should Have (P1)
- [ ] `server/breadcrumbs.md`: the `routes/business.js` line names the VAT rate and dealer type settings (plan 723); the `routes/diag.js` line says a new diagnosis takes the business's VAT rate. `src/app/pages/breadcrumbs.md`: the `settings/` line names the VAT rate and dealer type in the business tab.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; the new rows look like the existing ones.
- Dictionary keys (append-only, next to `price_rise_alert_help`):
  - `vat_rate_pct` — "שיעור מע״מ (%)"
  - `vat_rate_help` — "משמש לחישוב מחיר ללא מע״מ בניתוח המנות, בתכנון החודשי ובאבחון חדש"
  - `vat_rate_range` — "חייב להיות בין 0 ל-100"
  - `dealer_type` — "סוג עוסק"
  - `dealer_type_help` — "עוסק מורשה: עלויות נספרות ללא מע״מ. עוסק פטור: עלויות נספרות כולל מע״מ."
  - `dealer_type_murshe` — "עוסק מורשה"
  - `dealer_type_patur` — "עוסק פטור"
- No new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let a business store one VAT rate and its dealer type, 18% and מורשה when not set — two optional settings fields, defaults, dealer-type list; schema cases (18 and 0 and 100 valid, 101 and -1 refused, an unknown dealer type refused, defaults 18 and murshe) — shared/schemas/entities/business.schema.ts, server/test/modules-schema.test.js
- [ ] A2: Keep a stored VAT rate and dealer type when an older form saves only some numbers — one optional-keys list in the settings route; route cases (GET fills 18 and murshe; PUT stores 17 and patur and the next GET returns them; a three-number body keeps them; vatRatePct 101 is 400; staff and consultant 403, nothing changed); update the existing exact-defaults expectation — server/routes/business.js, server/test/business-settings.test.js
- [ ] A3: Start a new consultant diagnosis with the kitchen's own VAT rate — read the active business's rate on create; cases (stored 17 → new diagnosis 17; nothing stored → 18; a body vatPct 16 wins; an existing diagnosis is not changed) — server/routes/diag.js, server/test/diag-router.test.js
- [ ] A4: Show and save the VAT rate and dealer type in the business settings tab — fifth number row, dealer-type select, six-key compare and save; spec cases (shows 18 and מורשה by default; 101 shows the range error and disables save; changing only the type enables save and sends all six; leaving with a changed type counts as unsaved) — src/app/pages/settings/components/business-settings-tab/**
- [ ] A5: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [ ] A6: Record the settings in the folder maps and run every automatic check — paste outputs under Execution Notes — server/breadcrumbs.md, src/app/pages/breadcrumbs.md

## What happens when
- A business has no stored `vatRatePct` or `dealerType` (every business today): reads give 18 and `murshe`; nothing is written until the owner saves.
- An older browser tab saves the four old numbers: the route keeps the stored rate and type (A2).
- The owner sets the rate to 0 (for example a business outside Israel): allowed; a new diagnosis starts at 0.
- The owner changes the rate after diagnoses exist: old diagnoses keep their own `vatPct`; only new ones start from the new rate. Months (plan 727) keep their own copy too (monthly decision 7).
- The business is `patur`: this plan only stores it; the screens that count costs (dish analysis, the month) read it when they are built. The diagnosis does not read the dealer type (its `pricesIncludeVat` stays its own).
- A consultant opens the settings tab: he cannot reach it (the tab is owner-only today), and a direct PUT is 403 `CONSULTANT_DENIED`.

## Technical Considerations
- Dependencies: plan 429 (business settings), plan 616 (the keep-`priceRiseAlertPct` rule this generalises), plan 633 (diagnosis route), plan 631 (consultant rights).
- Field names are fixed for the plans that read them: `settings.vatRatePct` (number, percent) and `settings.dealerType` (`'murshe' | 'patur'`). Plans 724–729 read them from `BusinessService.business_()?.settings` in the browser and from `getBusiness(...)` with `BUSINESS_SETTINGS_DEFAULTS` on the server.
- New files needed: none. Model changes: two optional fields in `businessSettingsSchema`. Backend / API: no new endpoint. Data / migration: none.
- Collision: `chore/restaurant-staging` (not on main) rewrites the settings tab's rows onto `app-form-field` (`business-settings-tab.component.html/.scss/.ts`). This plan targets main; when staging merges, the new VAT row comes along with the `fields` loop and the dealer-type row moves into an `app-form-field` too — a small merge, no behaviour change.
- Security surface: none new — an existing owner-only route gains two validated fields.

## Out of Scope
- Using the dealer type in any calculation (dish cost, month cost) — that is in the plans that build those screens.
- Changing existing diagnoses or the diagnosis menu step's own VAT controls; defaulting `pricesIncludeVat` from the dealer type.
- A VAT history or a per-dish rate (dish decision 6 chose one rate per business).

## Critical Questions
- none — Dandan approved dish 6, monthly 7 and N-X1 on 2026-11-24; anything they do not settle is a `behaviour:` decision for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions
