# Plan 445 — Show live profit against the target while the chef builds a menu

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 03.2. The menu footer shows food cost, food-cost %, revenue, cost per guest and profit per guest, but there
is no price per guest to the client, no extra costs, no profit target, no safety margin and no "meets target"
answer. A hard-coded 33 % food-cost warning sits in `menu-intelligence.page.html` (`.financial-footnote`), and
`buildEventFromForm()` writes `financialTargets: { targetFoodCostPct: 30, targetRevenuePerGuest: 0 }` on every save.
Revenue is computed in three places (`totalRevenue_` in the page, `computeEventRevenue` in
`MenuIntelligenceService`, a private `computeEventRevenue` in `menu-library-list.component.ts`) and they disagree
for cocktail events — the library and the screen show different revenue for the same event.

This plan:
1. Adds one pure function `computeEventPricing` (C-PRICING) — the only place profit, profit %, minimum price per
   guest and safety margin are computed — with the spec's acceptance numbers as tests.
2. Adds per-event money fields (`pricePerGuest`, `extraCosts`, `targetsOverride`) to the schema and the menu.
3. Replaces the footer with a live **pricing meter** child component that updates on every change without a save.
4. Stores a `pricing` cache on every save so the library (now) and the dashboard (plan 447) show the meter's revenue.
5. Removes the 33 % warning, the `{30, 0}` hard-code and the duplicate revenue code.

Business defaults (profit target 25 %, safety margin 10 %) come from plan 429's business settings.
`menu-intelligence.page.ts` is growth-frozen: this plan's page edits are wiring, and they delete more lines than
they add.

## Goals & Success Criteria
**Primary:** while building a menu the chef sees, live, whether the price per guest meets the profit target and by
how much it falls short; the same revenue appears in the meter, the menu library and (later) the dashboard.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/engine/event-pricing.spec.ts' --include='src/app/pages/menu-intelligence/menu-money-form.util.spec.ts' --include='src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts' --include='src/app/pages/menu-intelligence/components/pricing-meter/**/*.spec.ts' --include='src/app/pages/menu-library/**/*.spec.ts' --include='src/app/core/services/menu-intelligence.service.spec.ts'`
  passes, including the spec 03.2 acceptance numbers in `event-pricing.spec.ts` (plan stub
  `eventFoodCost: 4000, partial: false`; event 50 guests, `extraCosts.amount: 1000`; settings `{ profitTargetPct:
  25, safetyMarginPct: 10 }`):
  - `pricePerGuest: 200` → `revenue 10000`, `profit 5000`, `profitPct 50`, `profitPerGuest 100`, `meetsTarget
    true`, `formatMoney(minPricePerGuest)` → `'₪133.33'`, `safetyMarginAmount 1000`, `revenueIsComputed false`;
  - `pricePerGuest: 120` → `revenue 6000`, `profit 1000`, `formatPct1(profitPct)` → `'16.7%'`, `meetsTarget false`,
    `formatMoney(shortfallPerGuest)` → `'₪13.33'`;
  - same at 120 with `targetsOverride.profitTargetPct: 15` → `meetsTarget true`; the settings object passed in is
    unchanged (still 25);
  - `pricePerGuest` empty, two items `{ sellPrice: 50, portions: 100 }` and `{ sellPrice: 20, portions: 50 }` →
    `revenue 6000`, `revenueIsComputed true`, `pricePerGuest 120`;
  - `pricePerGuest: 0` → `revenue 0`, `profitPct null`;
  - plan stub `partial: true` → result `partial: true`.
  - `menu-money-form.util`: target 100 → control error `targetTooHigh`; extra cost −1 → error `min`; empty price →
    `pricePerGuest` left out of the saved event (not 0).
  - `MenuEventSaveService.prepareForSave` adds `pricing { foodCost, revenue, profit, profitPct, partial,
    computedAt }` equal to `computeEventPricing` for the same inputs.
  - library card revenue reads `event.pricing.revenue` (shows "—" when `pricing` is absent).
- [x] [auto] `npm --prefix server test -- menu-event-pricing` passes: create a `menuEvents` doc with
  `targetsOverride.profitTargetPct: 100` → 400; `extraCosts.amount: -1` → 400; valid money fields and a `pricing`
  object → 201 and stored as sent; a staff token changing `pricePerGuest` on an event that same staff member
  created → 403 `FORBIDDEN` (`editMoney`, plan 427 rule, regression check); the same staff token saving that event
  with only `pricing` changed → 200 (`pricing` is a derived cache, not in `MONEY_FIELDS`). (A staff edit of the
  owner's event is already 403 by C-PERM's creator rule, so it cannot isolate the money check.)
- [x] [auto] `grep -n "> 33" src/app/pages/menu-intelligence/menu-intelligence.page.html` and
  `grep -n "targetFoodCostPct: 30" src/app/pages/menu-intelligence/menu-intelligence.page.ts` print nothing.
- [x] [auto] Net line count of `menu-intelligence.page.ts` ≤ 0 for this plan: `git diff --numstat origin/mvp --
  src/app/pages/menu-intelligence/menu-intelligence.page.ts` prints added ≤ deleted.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, open an event with dishes at `/menu-intelligence/<id>`: the meter at the bottom shows price per
  guest, profit per guest, profit %, a green "עומד ביעד" or a red "חסר … ₪ לאורח", the minimum price per guest and
  "מומלץ להוסיף … ₪ מרווח ביטחון". There is no red food-cost % at 33 %.
- [human] Leave «מחיר לאורח ללקוח» empty → the price shows with the tag "מחושב". Type a price → the numbers change
  at once; add a dish → they change again, with no save and no refresh.
- [human] Open «יעד לאירוע זה», set the target to 15 → the verdict turns green. Open `/settings` → business tab →
  the profit target still says 25.
- [human] Type 100 in the event target → the field shows an error and «שמור» refuses; type −50 in extra costs → the
  field refuses it.
- [human] Save the event, go to `/menu-library`: the card's revenue equals the meter's revenue.
- [human] Phone width: the meter collapses to one line (price per guest · profit % · verdict) and expands on tap;
  nothing scrolls sideways.
- [human] Sign in as a staff member, open the same event: the money fields are visible but locked (lock icon).

## Execution Mode
- Parallel: no against 434, 435 and 437 (Menu Intelligence page / approved map hotspot); no against 440, 442, 446
  (`shared/schemas/entities/menu-event.schema.ts`); no against 424 and 425 (any `shared/schemas/**` edit); no
  against 441, 443, 444 (same page, sequential in lane wt-3).
- Concurrent plans: none required; check `node scripts/scope-check.mjs --overlap --plan=<this file>` at take time.
- Isolated DB: no — new optional fields only, no migration, no reshaping. Server tests run on the in-memory DB.

## Execution Notes
- Depends on: plan 444 merged (partial marks, lane order, same page).
- Depends on: plan 429 merged (`BusinessService.business_().settings` with `profitTargetPct`, `safetyMarginPct`).
- Transitively merged by then (via 444/429): 434 (`eventCost_` on the engine), 444 (page computed `menuPlan_` = the live form's `EventPlan`), 441
  (page-provided `MenuPortionsService` with `byItem` / `at`), 428 (client `PermissionService`), 427
  (server money-field check), 440 (`computePortions`).
- Must not run at the same time as: 434, 435, 437 (Menu Intelligence page); 440, 442, 446
  (`menu-event.schema.ts`, sequential in lane wt-3); 441, 443, 444; 424, 425 (`shared/schemas/**`).
- Frozen-file budget: added in the page `.ts` ≈ 6 lines (meter import + `imports: []` entry, `money` form group,
  `loadEvent` patch, save-service inject, save call); deleted ≈ 25+ (the old footer computeds `foodCostPct_`,
  `totalRevenue_`, `costPerGuest_`, `profitPerGuest_` — or their plan-434 replacements — once the meter owns those
  numbers, and the 4-line `financialTargets` literal). Verify each deleted member has no other reader.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/event-pricing.ts
src/app/core/engine/event-pricing.spec.ts
src/app/core/models/menu-event.model.ts
src/app/core/services/menu-intelligence.service.ts
src/app/core/services/menu-intelligence.service.spec.ts
shared/schemas/entities/menu-event.schema.ts
server/test/menu-event-pricing.test.js
src/app/pages/menu-intelligence/components/pricing-meter/**
src/app/pages/menu-intelligence/menu-money-form.util.ts
src/app/pages/menu-intelligence/menu-money-form.util.spec.ts
src/app/pages/menu-intelligence/services/menu-event-save.service.ts
src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-library/components/menu-library-list/**
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the four new event fields (`pricePerGuest`, `extraCosts`, `targetsOverride`, `pricing`) are
  defined once in `shared/schemas/entities/menu-event.schema.ts` (strict object, ranges in Zod) and the server's
  existing write validation rejects bad values; covered by `server/test/menu-event-pricing.test.js`.
- INV-1: preserves — who may change money fields is still decided by plan 427's checker through `MONEY_FIELDS`
  (`pricePerGuest`, `extraCosts`, `targetsOverride` are already listed there); `pricing` is a derived cache, not a
  money field. No route or permission code is written.
- INV-none for the rest: no taxonomy, no AI, no cascade.

## Step 0 — Reality Check

Runs when `scope-check.mjs --drift` reports drift (it will). Check by symbol, print `ok` or `conflict: <what>`:
- Plan 433/434: `EventPlan` (`eventFoodCost`, `partial`, `missing`), `formatMoney`, `formatPct1` in
  `src/app/core/engine/`; plan 444's page computed `menuPlan_` (built from `buildEventFromForm()`); `eventCost_`
  and the footer computeds `foodCostPct_`, `totalRevenue_`, `costPerGuest_`, `profitPerGuest_` and their template
  readers; `computeEventIngredientCost` / `computeFoodCostPctFromActualRevenue` in `menu-intelligence.service.ts`
  (434 W4).
- Plan 441: page-provided `MenuPortionsService` (`byItem`, `at`) in
  `src/app/pages/menu-intelligence/services/menu-portions.service.ts`.
- Plan 440: `computePortions(event, recipes)` in `src/app/core/engine/portions.ts`.
- Plan 444: the `partial-cost-badge` component (the meter reuses it).
- Plan 429: `BusinessService.business_()` and `settings.{ profitTargetPct, safetyMarginPct }`.
- Plan 428/427: `PermissionService.can('editMoney', …)`; `MONEY_FIELDS.menuEvents` in
  `shared/schemas/money-fields.ts` lists `pricePerGuest`, `extraCosts`, `targetsOverride` (427 writes them; a
  missing one is a `conflict` — offer `approved: shared/schemas/money-fields.ts`).
- Plans 440/442: the current shape of `menuEventSchema` (strict object) — add the new keys next to theirs.
- Repo: `buildEventFromForm` (`financialTargets` literal), `loadEvent`, `save`, `form_` in the page;
  `computeEventRevenue` callers in `menu-intelligence.service.ts` and its spec;
  `getTotalSalePriceDisplay` / `getFoodCostPctDisplay` / private `computeEventRevenue` in
  `menu-library-list.component.ts`.

## User Stories
- As a chef, I want to type the price per guest I quote and see at once whether it meets my profit target so that
  I never quote below cost.
- As a chef, I want extra costs (staff, transport) in the same calculation so that the profit is real.
- As a chef, I want to lower the target for one special event without changing my business setting so that the
  verdict fits that deal.
- As a chef, I want the library to show the same revenue as the menu screen so that I trust the numbers.

## Functional Requirements

### Must Have (P0)
- [ ] `computeEventPricing` is the only place the meter's numbers are computed (formulas in Design below).
- [ ] Event fields: price per guest (≥ 0, optional), extra costs `{ amount ≥ 0, note ≤ 200 }`, per-event target
  and margin override (each 0 ≤ x < 100). Saved with the event.
- [ ] Empty price per guest → revenue = Σ (dish sell price × its portions from `computePortions`), price per guest
  = revenue ÷ guests, tagged "מחושב".
- [ ] Meter shows: price per guest · profit per guest · profit % · "עומד ביעד" (green) or "חסר X ₪ לאורח" (red) ·
  min price per guest · "מומלץ להוסיף X ₪ מרווח ביטחון"; plus food cost and revenue lines. Updates on every
  change (dish, coefficient, guests, price, costs) without save.
- [ ] Any partial cost → every meter number marked "חלקי" and the 444 badge shown.
- [ ] Revenue 0 → profit % "—". Target ≥ 100 → field error, save refused. Negative extra cost → refused.
- [ ] Money inputs editable only with `can('editMoney')`; staff see them locked.
- [ ] Every save stores `pricing` (C-PRICING); the library card's revenue and food-cost tag read it.
- [ ] Remove the 33 % warning, the `{30, 0}` hard-code and the duplicate revenue functions.

### Should Have (P1)
- [ ] The library's `food_cost` sort reads `pricing.foodCost ÷ pricing.revenue` (events without `pricing` sort last).

### Nice to Have (P2)
- [ ] none.

## Design

`src/app/core/engine/event-pricing.ts` (pure, no Angular):
- `type PricingEvent = { guestCount: number; pricePerGuest?: number; extraCosts?: { amount: number; note?: string };
  targetsOverride?: { profitTargetPct?: number; safetyMarginPct?: number }; items: { sellPrice?: number; portions:
  number }[] }`.
- `toPricingEvent(event: MenuEvent, portionsByItem: Map<string, { portions: number }>): PricingEvent` — maps every
  item by key `${section._id}|${itemIndex}`.
- `computeEventPricing(plan: EventPlan, event: PricingEvent, settings: { profitTargetPct: number; safetyMarginPct:
  number })` returns the C-PRICING fields plus `pricePerGuest` (the effective one):
  - `foodCost = plan.eventFoodCost`; `extraCost = event.extraCosts?.amount ?? 0`; `totalCost = foodCost + extraCost`
  - `revenueIsComputed = event.pricePerGuest == null`; `revenue = revenueIsComputed ? Σ(sellPrice ?? 0) × portions :
    pricePerGuest × guestCount`
  - `pricePerGuest = guestCount > 0 ? revenue ÷ guestCount : 0`
  - `profit = revenue − totalCost`; `profitPct = revenue > 0 ? profit ÷ revenue × 100 : null`
  - `profitPerGuest = guestCount > 0 ? profit ÷ guestCount : 0`
  - `target = targetsOverride.profitTargetPct ?? settings.profitTargetPct`; `margin = targetsOverride.safetyMarginPct
    ?? settings.safetyMarginPct`
  - `minPricePerGuest = guestCount > 0 ? totalCost ÷ (1 − target ÷ 100) ÷ guestCount : 0`
  - `safetyMarginAmount = revenue × margin ÷ 100`
  - `meetsTarget = profitPct !== null && profitPct >= target`
  - `shortfallPerGuest = meetsTarget ? 0 : max(0, minPricePerGuest − pricePerGuest)`
  - `partial = plan.partial`
  - No rounding inside; display through `formatMoney` / `formatPct1` only.
- `toPricingCache(result, now: number)` → `{ foodCost, revenue, profit, profitPct, partial, computedAt: now }`.

Page wiring (frozen file, net ≤ 0):
- `form_` gains `money: createMoneyGroup(this.fb)` (`menu-money-form.util.ts`: controls `pricePerGuest`,
  `extraCostAmount`, `extraCostNote`, `profitTargetPct`, `safetyMarginPct`; validators `min(0)`, target/margin
  `targetTooHigh` when ≥ 100).
- `loadEvent` patches `money` from `moneyFormFromEvent(event)` before `savedSnapshot_` is taken.
- `buildEventFromForm` replaces the `financialTargets` literal with `...moneyFieldsFromForm(raw.money)` (empty
  inputs → keys left out).
- `save` passes the built event through `MenuEventSaveService.prepareForSave(event, this.menuPlan_(), this.editingId_())` (the id lets plan 446 read the stored event), which adds
  `pricing` using `computePortions` (440), `BusinessService` settings (defaults `{ 25, 10 }` when absent) and
  `computeEventPricing`. Plan 446 extends this same service with the planning snapshot.
- Template: `.financial-footnote` block replaced by `<pricing-meter [event]="<live event>" [plan]="menuPlan_()"
  [moneyForm]="form_.controls.money" [eventId]="editingId_()" />`. The live event is what `menuPlan_` feeds the
  engine (`buildEventFromForm()`); the meter takes portions from 441's `MenuPortionsService.byItem()` (provided on
  the page, so the child component injects it) for `toPricingEvent`.

## UI/UX Notes
- `pricing-meter` is a fixed bar at the bottom like today's footnote (`.no-print`), two rows on desktop: inputs
  row (מחיר לאורח ללקוח · עלויות נוספות + הערה · «יעד לאירוע זה» toggle revealing target/margin inputs) and the
  numbers row. On phones: one summary line, tap to expand into a bottom sheet. RTL; logical properties only;
  `cssLayer` skill first; reuse `c-input-wrapper` and the existing `fin-metric` look moved into the component.
- Verdict colours from the existing success/danger tokens in `src/styles.scss` (no new colour values).
- Locked money inputs show the registered `lock` icon and `money_locked_hint`.
- Icons: `circle-check`, `alert-triangle`, `lock`, `chevron-up`, `chevron-down` — all registered; no new icons.
- New `dictionary.json` keys (append to `general`):

| key | Hebrew |
|---|---|
| `price_per_guest_client` | מחיר לאורח ללקוח |
| `price_computed` | מחושב |
| `extra_costs` | עלויות נוספות |
| `extra_costs_note` | הערה לעלויות |
| `event_target_toggle` | יעד לאירוע זה |
| `profit_target_pct` | יעד רווח (%) |
| `safety_margin_pct` | מרווח ביטחון (%) |
| `profit_per_guest` | רווח לאורח |
| `profit_pct` | אחוז רווח |
| `meets_target` | עומד ביעד |
| `short_per_guest` | חסר {{amount}} לאורח |
| `min_price_per_guest` | מחיר מינימום לאורח |
| `recommended_margin` | מומלץ להוסיף {{amount}} מרווח ביטחון |
| `target_too_high` | היעד חייב להיות קטן מ-100% |
| `extra_costs_negative` | עלויות נוספות לא יכולות להיות שליליות |
| `money_locked_hint` | רק הבעלים יכולים לשנות סכומים |

## Atomic Sub-tasks
- [x] M1: Compute every profit number in one tested place — event-pricing.ts: PricingEvent, toPricingEvent, computeEventPricing, toPricingCache per Design; spec with the spec 03.2 acceptance numbers — src/app/core/engine/event-pricing.ts, src/app/core/engine/event-pricing.spec.ts
- [x] M2: Let an event store its price per guest, extra costs, own target and a pricing summary — menuEventSchema: pricePerGuest z.number().min(0).optional(), extraCosts strictObject { amount min(0), note max(200) optional }, targetsOverride strictObject { profitTargetPct, safetyMarginPct: min(0).lt(100) optional }, pricing strictObject { foodCost, revenue, profit, profitPct nullable, partial boolean, computedAt } optional; client MenuEvent model; server test — shared/schemas/entities/menu-event.schema.ts, src/app/core/models/menu-event.model.ts, server/test/menu-event-pricing.test.js
- [x] M3: Add the money fields to the menu form and keep empty fields out of the saved event — createMoneyGroup, moneyFormFromEvent, moneyFieldsFromForm, targetTooHigh validator + spec — src/app/pages/menu-intelligence/menu-money-form.util.ts, src/app/pages/menu-intelligence/menu-money-form.util.spec.ts
- [x] M4: Store the pricing summary on every save so other screens show the same revenue — MenuEventSaveService.prepareForSave(event, plan, editingId: string | null) (providedIn root; computePortions + BusinessService settings + computeEventPricing + toPricingCache) + spec — src/app/pages/menu-intelligence/services/menu-event-save.service.ts, src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts
- [x] M5: Replace the footer with a live pricing meter that answers "does this price meet my target" — PricingMeterComponent (inputs event, plan, moneyForm, eventId; computed result from computeEventPricing with live form values and BusinessService settings; "חלקי" on each number + partial-cost-badge when plan.partial; inputs disabled unless PermissionService.can('editMoney', { type: 'menuEvents', doc }); phone summary line) + spec — src/app/pages/menu-intelligence/components/pricing-meter/**
- [x] M6: Wire the meter and the money fields into the frozen menu page while shrinking it — form_ money group, loadEvent patch, buildEventFromForm spread replacing financialTargets {30,0}, save via prepareForSave, template swap of .financial-footnote (33% warning gone), delete the old footer computeds; net lines ≤ 0 — src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.scss
- [x] M7: Make the library show the meter's revenue and drop the duplicate revenue code — card revenue and food-cost tag from event.pricing (formatMoney / formatPct1, "—" when absent, "חלקי" when pricing.partial); food_cost sort from pricing; delete the component's private computeEventRevenue and MenuIntelligenceService.computeEventRevenue when no caller remains (update its spec) — src/app/pages/menu-library/components/menu-library-list/**, src/app/core/services/menu-intelligence.service.ts, src/app/core/services/menu-intelligence.service.spec.ts
- [x] M8: Add the Hebrew labels — keys from UI/UX Notes, appended — public/assets/data/dictionary.json
- [x] M9: Build, test client and server, confirm hard-codes gone and page not grown, hand over — ng build, the Done-when ng test and server test commands, the two greps, git diff --numstat, log-query; slot servers up; [human] cards — this plan file

## Technical Considerations
- Dependencies: `EventPlan` + `rounding.ts` (433), `menuPlan_` (444), `MenuPortionsService` (441), `computePortions` (440),
  `partial-cost-badge` (444), `BusinessService` (429), `PermissionService` (428), `MONEY_FIELDS` (427).
- New files needed: `event-pricing.ts` (+spec), `menu-money-form.util.ts` (+spec), `menu-event-save.service.ts`
  (+spec), `components/pricing-meter/`, `server/test/menu-event-pricing.test.js`.
- Model changes: `MenuEvent` gains `pricePerGuest?`, `extraCosts?`, `targetsOverride?`, `pricing?`.
  `financialTargets` stays in the schema as an optional legacy key and is no longer written.
- Backend / API: no new route; the generic `POST/PUT /api/v1/data/menuEvents` validates the new keys through the
  shared schema.
- Auth and validation: server — Zod ranges (`min(0)`, `lt(100)`), plan 427 money-field check; client — same
  ranges as form validators, inputs locked without `editMoney`.
- Security surface: none new (numeric fields + a 200-char note rendered by interpolation).
- Data / migration: none. Existing events have no `pricing` until their next save; the library shows "—" for
  them meanwhile.
- Lazy loading: the meter is imported by the lazy menu-intelligence route only.
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; no new icons;
  `[human]` checks on phone and desktop.

## Backend Impact
- Collections affected: `menuEvents` (four new optional fields).
- New collections: no.
- Server changes needed: schema only (`shared/schemas/entities/menu-event.schema.ts`, compiled into
  `server/generated` by `build:schemas`); one new server test file.

## Contracts (verbatim from the approved map)

**C-PRICING (445; consumed by 446, 447)**
- Event fields: `pricePerGuest?: number`, `extraCosts?: { amount: number, note?: string }`, `targetsOverride?: { profitTargetPct?: number, safetyMarginPct?: number }`.
- `src/app/core/engine/event-pricing.ts` `computeEventPricing(plan: EventPlan, event, settings) → { foodCost, extraCost, totalCost, revenue, revenueIsComputed, profit, profitPct | null, profitPerGuest, minPricePerGuest, safetyMarginAmount, meetsTarget, shortfallPerGuest, partial }`.
- On every save the client stores `pricing: { foodCost, revenue, profit, profitPct, partial, computedAt }` on the event (server dashboards read this, never run the engine).

Contract extension (this plan): `event` is typed `PricingEvent` (built by `toPricingEvent(event, portionsByItem)`),
and the result also carries `pricePerGuest` (the effective price per guest) so no screen divides revenue by
guests itself.

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

**C-PORTIONS (440; consumed by 433 via EventPlanService, 441)**
- `src/app/core/engine/portions.ts`: `computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, { portions: number, coefficient: number, overridden: boolean }>`; portions = portionsPerDiner × guests × coefficient; coefficient default = eventTypeSnapshot.coefficient × servingTypeSnapshot.coefficient (not rounded); override → `coefficientOverride` (> 0, ≤ 2 decimals).
- Taxonomy: `eventType` and `menuType` terms gain `coefficient: number` (> 0; missing → 1.0).
- Event: `eventTypeSnapshot?: { key, name, coefficient }`, `servingTypeSnapshot?: { key, name, coefficient }` (missing → 1.0). Item: `portionsPerDiner?: number` (replaces servingPortions; migration copies), `coefficientOverride?: number`. `predictedTakeRate`, `piecesPerPerson` become optional legacy, unused.

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

## Out of Scope
- Business settings screen and storage (plan 429). The dashboard revenue card (plan 447).
- The planning snapshot and closing (plan 446) — it reuses `MenuEventSaveService`.
- Cost breakdown (labor, transport, equipment), client PDF quote, per-event-type safety factors.
- Back-filling `pricing` on existing events (each event gets it on its next save).

## Critical Questions
None — spec 03.2 fixes formulas and edge cases.
