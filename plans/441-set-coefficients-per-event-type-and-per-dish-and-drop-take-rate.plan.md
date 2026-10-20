# Plan 441 — Set coefficients per event type and per dish, and drop take rate

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 03.1, screens half. Plan 440 stores the coefficients and adds the one formula `computePortions`; nothing
on screen uses it yet. Today:
- the menu screen computes portions in four places with `derivePortions` (`menu-intelligence.page.ts`
  `getAutoFoodCost` ~L704, `selectRecipe` ~L822, `menu-dish-row.component.ts` `getAutoFoodCost` L96 /
  `getDerivedPortions` L123) plus `hydrateDerivedPortions` on save, all driven by take rate and pieces per person
  — cocktail menus come out at 0 portions in the stored event and at "×1" in the footer;
- `loadEvent` loads `servingPortions ?? 0` and `buildEventFromForm` coerces `|| 1` (a typed 0 silently becomes 1);
- `menu-intelligence.service.spec.ts` (~L45-56, ~L100+) locks the take-rate behavior;
- `EventPlanService` (plan 433) still reads stored `derivedPortions` through `portionsFromDerived(event)`;
- the Excel / preview exports still print "שיעור לקיחה" and "פריטים לסועד" (`menu-export.service.ts` L69, L81,
  L350, L359, L398, L417, L622) and recompute portions with `derivePortions` (~L614-637);
- there is no place to see or change an event type's or serving type's coefficient (the metadata manager has a
  serving-types card with names and fields only, and no event-types card at all).

After this plan (Dandan, 2026-10-20): the metadata manager lists event types and serving types with their
coefficient — owner adds/edits/deletes event types and edits coefficients; each dish on the menu shows
"מקדם המנה" (default = event coef × serving coef) and its portions; typing a different value marks it
"שונה ידנית" with "חזור לברירת מחדל"; take rate and pieces per person are gone from the screen, the exports and
the math; every list gets its portions from `computePortions`.

## Goals & Success Criteria
- Primary: one portions number (from `computePortions`) drives the dish row, the footer, the saved event and
  every engine list; the chef can see and override the coefficient per dish.

Done when:
- [auto] `npx ng build` passes.
- [auto] `git diff --numstat origin/mvp -- src/app/pages/menu-intelligence/menu-intelligence.page.ts src/app/core/services/menu-export.service.ts`
  shows deletions ≥ insertions for each file (growth-frozen files, net ≤ 0; base branch per MVP run mode).
- [auto] `npx ng test --watch=false --include='src/app/core/engine/**' --include='src/app/core/services/menu-intelligence.service.spec.ts' --include='src/app/core/services/event-type-snapshot.service.spec.ts' --include='src/app/pages/menu-intelligence/**' --include='src/app/pages/metadata-manager/**' --include='src/app/core/services/export.service.spec.ts'`
  passes, including:
  - `menu-intelligence.service.spec.ts`: the take-rate / pieces-per-person cases are removed; `hydrateDerivedPortions`
    on an event with snapshots private 1.15 × cocktail 3, 50 guests, 1 per diner → `derivedPortions` **173**;
    no snapshots, 80 guests, `portionsPerDiner: 2` → **160**; `portionsPerDiner: 0` → **0**;
  - `src/app/core/engine/portions-plan.spec.ts`: the cocktail event above with one dish of one linked product →
    `computeEventPlan(...)` gets `portionsByItem` from `computePortions` and returns `rawLines.length > 0`
    ("shopping list not empty");
  - `event-type-snapshot.service.spec.ts`: a stored snapshot whose key matches the chosen key is kept even after
    the term's coefficient changes; a new key gives `{ key, name, coefficient }` from the current term; a term
    without a coefficient gives 1;
  - menu dish row: typing `1.1` sets `coefficient_override` to 1.1 and shows "שונה ידנית"; «חזור לברירת מחדל»
    clears it; typing `1.111` or `0` shows the invalid message and keeps the old value;
  - coefficient manager: adding event type "בר מצווה" with 1.25 calls `TaxonomyStore.add('eventType', 'בר מצווה', { coefficient: 1.25 })`;
    a shared term's input is disabled for a non-admin.
- [auto] `grep -rn "derivePortions\|getPiecesPerPerson\|portionsFromDerived" src/app --include=*.ts` → no matches.
- [auto] `grep -rn "take_rate\|pieces_per_person\|predictedTakeRate" src/app/pages src/app/core/services/menu-export.service.ts --include=*.ts --include=*.html` → no matches.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop: dashboard → «מטא-דאטה» tab → «מקדמים» card → event types list shows עסקי 1.1, פרטי 1.15,
  חתונה 1.2, מסיבה 1.1, כנסים 0.9; serving types show 1, 1.1, 2, 3. Add «בר מצווה» with 1.25 → it appears.
- [human] Desktop: `/menu-intelligence` (new menu) → event type «פרטי», serving «בופה», 100 guests, add one dish
  (1 portion per diner) → open the dish details: «מקדם המנה» shows **1.27** and portions **127**.
- [human] Same menu: change that dish's coefficient to 1.1 → portions **110** and the tag «שונה ידנית» shows. Add a
  second dish. Switch event type to «חתונה» → the second dish shows 1.32 / **132**, the first stays **110**.
  Click «חזור לברירת מחדל» on the first → it shows 1.32 / 132.
- [human] Same menu: set event type «בר מצווה» (from the card above) → the dishes use 1.25 × the serving coefficient.
- [human] Same menu: set guests to 0 → every dish shows 0 portions and "הזן מספר אורחים" appears.
- [human] Mobile (phone width): open a saved menu, open a dish's details → «מקדם המנה», «שונה ידנית» and
  «חזור לברירת מחדל» fit and are tappable; no "שיעור לקיחה" or "פריטים לסועד" anywhere on the page or in the
  Excel export.
- [human] Open a menu saved before plan 440's migration → the portions are the same as before.

## Execution Mode
- Parallel: no against 434, 435 (`menu-intelligence.page.ts`, `menu-export.service.ts`), 437
  (`menu-export.service.ts`), 442-446 (`menu-intelligence.page.ts`, sequential in lane wt-3), and 421, 436
  (`metadata-manager.page.component.*`; 436 also `menu-export.service.ts`). Yes otherwise.
- Concurrent plans: lane wt-3 order is 440 → 441 → 442.
- Isolated DB: no — only the UI writes terms and events through the normal API.

## Execution Notes
- Depends on: plan 440 merged and plan 433 merged (`EventPlanService`, `computeEventPlan`, `rounding.ts`).
  Normally 434 is merged too (lane wt-2 order 433 → 434); Step 0 says which `menu-export.service.ts` lines are left.
- Must not run at the same time as: 434, 435, 437 (`menu-export.service.ts` / `menu-intelligence.page.ts`), 442-446
  (`menu-intelligence.page.ts`), 421, 436 (`metadata-manager.page.component.ts/.html`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps (incl. 'go 0007' / 'go 0008') are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Decision (Planner review): plan 440's Q1 → option a — no per-business override of a shared type's coefficient
  in the MVP; shared rows are read-only for non-admins, the owner overrides per dish or adds his own event type.
- Decision (Planner review): serving types show their existing Hebrew labels (dictionary.json is append-only);
  only the new `chef_plated_front` uses the spec's name "פלייט שף פרונטלי".
- `portionsFromDerived` lives in its own file from plan 433 (`src/app/core/engine/portions-from-derived.ts` + spec);
  K1 deletes both files, so the `portionsFromDerived` grep in Done-when returns nothing.
- Growth-frozen files: `menu-intelligence.page.ts` (net ≤ 0 — new logic goes in `MenuPortionsService` and the dish
  row; the page only rewires) and `menu-export.service.ts` (net ≤ 0 — this plan only deletes there).
- Owner-only gate (C-PERM `editTaxonomy`): if plan 428 is merged, the coefficient inputs and the add/delete
  controls use `PermissionService.can('editTaxonomy', { type: 'taxonomyTerms' })`; if it is not merged yet, no
  client gate is added (C-PERM: before 427 merges every signed-in user counts as owner) — the server check from
  plan 427 decides either way. Step 0 prints which case applies.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/event-plan.service.ts
src/app/core/engine/event-plan.service.spec.ts
src/app/core/engine/portions-plan.spec.ts
src/app/core/engine/portions-from-derived.ts
src/app/core/engine/portions-from-derived.spec.ts
src/app/core/services/menu-intelligence.service.ts
src/app/core/services/menu-intelligence.service.spec.ts
src/app/core/services/event-type-snapshot.service.ts
src/app/core/services/event-type-snapshot.service.spec.ts
src/app/core/services/menu-event-type.service.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/export.service.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-intelligence/services/menu-portions.service.ts
src/app/pages/menu-intelligence/services/menu-portions.service.spec.ts
src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/components/coefficient-manager/**
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

- INV-3: preserves — the metadata manager changes a coefficient with one term write
  (`TaxonomyStore.updateByKey`) and adds/deletes event types with one write each; nothing re-keys, and existing
  events keep their own snapshot, so no cascade is needed. No client loop over documents.
- INV-6: preserves — `menu-ai-flow.service.ts` only stops copying the AI's take rate into the form; the AI menu
  call still goes through `server/routes/ai.js`.
- INV-5: preserves — coefficients are read and written as fields of `eventType` / `menuType` terms through
  `TaxonomyStore` (no second list); `event-type-snapshot.service.ts` only reads terms.
- INV-1: preserves — (rule as rewritten by plan 424 / ADR 0023) no route or ownership change; shared terms stay
  editable only where `TaxonomyStore.canEdit` allows, and the server (plan 427) decides staff vs owner.

## Step 0 — Reality Check

Runs always (plans 433, 434, 440 and possibly 428 change these files). Check by symbol, one line each, `ok` /
`conflict: <what>`: `computePortions`, `formatCoefficient`, `isValidCoefficient` in `src/app/core/engine/portions.ts`;
`EventPlanService.planFor` in `event-plan.service.ts` and its `portionsFromDerived` call (defined in
`portions-from-derived.ts`, plan 433); `computeEventPlan`;
`derivePortions`, `hydrateDerivedPortions` in `menu-intelligence.service.ts`; in `menu-intelligence.page.ts`:
`form_`, `getAutoFoodCost`, `getPiecesPerPerson`, `addItem`, `selectRecipe`, `loadEvent`, `buildEventFromForm`,
`buildAiMenuSnapshot_`, `providers`; in `menu-dish-row.component.ts`: `servingType`, `guestCount`,
`piecesPerPerson` inputs, `getAutoFoodCost`, `getDerivedPortions`; in `menu-export.service.ts`: every
`take_rate` / `pieces_per_person` header and the `derivePortions` call (print whether 434 already removed it);
`menu-ai-flow.service.ts` `predictedTakeRate` control; `menu-library.page.ts` item builder (~L50-56);
`addEventType` in `menu-event-type.service.ts`; `SECTIONS` list (~L142) in the metadata page; whether
`src/app/core/services/permission.service.ts` exists (plan 428). STOP only on a `conflict`.

## User Stories
- As a chef, I want to set how much more people eat at a wedding than at a conference once, in settings, so that
  every menu starts with the right amounts.
- As a chef, I want to see each dish's coefficient and portions on the menu so that I know what the kitchen makes.
- As a chef, I want to change one dish's coefficient and get back to the default with one click so that special
  dishes are handled without breaking the rest.
- As a chef, I want take rate and pieces per person gone so that there is one number to think about.

## Functional Requirements

### Must Have (P0)
- [ ] Metadata manager «מקדמים» card: event types (name + coefficient; add, change coefficient, delete own) and
  serving types (coefficient). Shared terms editable only by the platform admin (`TaxonomyStore.canEdit`); staff
  locked when `PermissionService` exists.
- [ ] Each event stores the name + coefficient of its event type and serving type when chosen; a later change to
  the type never changes a saved event (`EventTypeSnapshotService`).
- [ ] Dish row: «מקדם המנה» (2-decimal display), portions, override input (> 0, ≤ 2 decimals), «שונה ידנית»,
  «חזור לברירת מחדל»; prep items show the per-diner amount in the prep's yield unit.
- [ ] Changing event type / serving type updates only dishes without an override (follows from the formula).
- [ ] Guests 0 → all 0 + "הזן מספר אורחים"; portions per diner 0 → 0 + warning; no 0 → 1 coercion.
- [ ] Take rate and pieces per person removed from form, dish row, page, AI menu flow, library AI import,
  exports and `MenuIntelligenceService`; spec updated.
- [ ] `EventPlanService.planFor` uses `computePortions`; `portionsFromDerived` deleted.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- Coefficients card (`mm-sec-coefficients`, icon `scale`, after the serving-types card): two lists, «סוגי אירוע»
  and «סוגי הגשה»; each row = translated name + a narrow number input (`inputmode="decimal"`, step 0.01) + for own
  event types a delete icon (`trash-2`); add row for event types = name input + coefficient input (default 1) +
  «הוסף». Locked rows show the existing lock hint `taxonomy_shared_admin_only`. Reuses `.c-input`, `.c-btn-primary`,
  `.c-btn-ghost` engines; logical properties only.
- Dish row details (the existing expandable meta area): label «מקדם המנה», input showing `formatCoefficient`,
  then «מנות לאירוע: N». Overridden → small chip «שונה ידנית» + text button «חזור לברירת מחדל» (icon `rotate-ccw`).
  Invalid input → `c-field-error` with `coefficient_invalid`. For a preparation the per-diner field label reads
  «{{unit}} לסועד» with the prep's yield unit.
- Guests 0: a `c-field-error`-styled hint under the guest-count field: "הזן מספר אורחים".
- New dictionary keys (append to `general`):
  - `"dish_coefficient": "מקדם המנה"`
  - `"coefficient_manual": "שונה ידנית"`
  - `"coefficient_reset": "חזור לברירת מחדל"`
  - `"coefficient_invalid": "מקדם חייב להיות מספר גדול מ-0 עם עד 2 ספרות אחרי הנקודה"`
  - `"coefficient_label": "מקדם"`
  - `"event_portions": "מנות לאירוע"`
  - `"enter_guest_count": "הזן מספר אורחים"`
  - `"portions_per_diner_zero": "0 לסועד — המנה לא תיכלל בכמויות"`
  - `"per_diner_in_unit": "{{unit}} לסועד"`
  - `"metadata_coefficients_title": "מקדמים"`
  - `"metadata_coefficients_desc": "כמה אוכלים בכל סוג אירוע ובכל סגנון הגשה. 1 = כמות רגילה."`
  - `"metadata_event_types_title": "סוגי אירוע"`
  - `"metadata_serving_types_title": "סוגי הגשה"`
- Icons: `scale`, `rotate-ccw`, `trash-2` are already registered in `app.config.ts`; no new icon.

## Contracts used (verbatim from the approved MVP map)

**C-PORTIONS (440; consumed by 433 via EventPlanService, 441)**
- `src/app/core/engine/portions.ts`: `computePortions(event: MenuEvent, recipes: Recipe[]): Map<string, { portions: number, coefficient: number, overridden: boolean }>`; portions = portionsPerDiner × guests × coefficient; coefficient default = eventTypeSnapshot.coefficient × servingTypeSnapshot.coefficient (not rounded); override → `coefficientOverride` (> 0, ≤ 2 decimals).
- Taxonomy: `eventType` and `menuType` terms gain `coefficient: number` (> 0; missing → 1.0).
- Event: `eventTypeSnapshot?: { key, name, coefficient }`, `servingTypeSnapshot?: { key, name, coefficient }` (missing → 1.0). Item: `portionsPerDiner?: number` (replaces servingPortions; migration copies), `coefficientOverride?: number`. `predictedTakeRate`, `piecesPerPerson` become optional legacy, unused.

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

**C-PERM (427; client mirror 428)** — excerpt
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

## Atomic Sub-tasks
- [ ] K1: Feed every engine list the portions from the one formula — EventPlanService.planFor builds portionsByItem from computePortions(event, recipes) (portions only); delete portions-from-derived.ts and its spec, and the service spec cases that used it; new portions-plan.spec.ts (cocktail → rawLines not empty) — src/app/core/engine/event-plan.service.ts, event-plan.service.spec.ts, portions-plan.spec.ts, portions-from-derived.ts, portions-from-derived.spec.ts
- [ ] K2: Make the menu service use the one formula and drop take rate — delete derivePortions; hydrateDerivedPortions sets derivedPortions from computePortions(event, kitchenState.recipes_()); rewrite the locked spec cases per Done-when — src/app/core/services/menu-intelligence.service.ts, menu-intelligence.service.spec.ts
- [ ] K3: Freeze an event's type coefficients when the chef picks them — EventTypeSnapshotService.snapshotFor(kind, key, stored?): stored kept when stored.key === key, else { key, name: translate(key), coefficient: term?.coefficient ?? 1 } from TaxonomyStore; spec — src/app/core/services/event-type-snapshot.service.ts, event-type-snapshot.service.spec.ts
- [ ] K4: Hold the menu's portions logic outside the frozen page — page-provided MenuPortionsService: bind(form, version signal); remember(event) keeps loaded snapshots; snapshots(eventTypeKey, servingTypeKey) → { eventTypeSnapshot?, servingTypeSnapshot? }; byItem computed = computePortions(minimal event from the raw form, recipes); at(sectionIndex, itemIndex) → ItemPortions | null; spec — src/app/pages/menu-intelligence/services/menu-portions.service.ts, menu-portions.service.spec.ts
- [ ] K5: Rewire the menu page to the portions service and drop take rate, without growing the file — provide + inject MenuPortionsService, bind in the constructor; replace the derivePortions blocks in getAutoFoodCost and selectRecipe with menuPortions_.at(...)?.portions ?? 0; delete getPiecesPerPerson and every predictedTakeRate control/field (addItem, loadEvent, buildEventFromForm, buildAiMenuSnapshot_); add coefficient_override control in addItem/loadEvent; loadEvent: serving_portions = portionsPerDiner ?? servingPortions ?? 1 and remember(event); buildEventFromForm: portionsPerDiner = Number(serving_portions ?? 0) (no || 1), coefficientOverride, spread snapshots(...); template: dish row gets [portionInfo] instead of servingType/guestCount/piecesPerPerson, guest-count-0 hint; net lines in .ts ≤ 0 — src/app/pages/menu-intelligence/menu-intelligence.page.ts, .html, .scss
- [ ] K6: Show and override each dish's coefficient on the menu row — inputs servingType/guestCount/piecesPerPerson replaced by portionInfo; getDerivedPortions/getAutoFoodCost use portionInfo; coefficient input with isValidCoefficient → itemGroup.patchValue({ coefficient_override }), «שונה ידנית» chip, «חזור לברירת מחדל» → null, invalid message, per-diner-zero warning, prep yield-unit label; spec — src/app/pages/menu-intelligence/components/menu-dish-row/**
- [ ] K7: Stop the AI menu flows from writing take rate — menu-ai-flow: drop predictedTakeRate from the MatchedDish mapping (~L39) and from the form group (~L98), serving_portions kept, coefficient_override null; menu-library AI import builds items with portionsPerDiner = dish.servingPortions ?? 1 and derivedPortions from hydrateDerivedPortions — src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts, src/app/pages/menu-library/menu-library.page.ts
- [ ] K8: Remove take rate and pieces per person from the exports — delete the pieces_per_person rows and the take_rate column in every sheet/preview; replace any remaining derivePortions call with menuIntelligence hydrate / EventPlanService portions; net lines ≤ 0; spec — src/app/core/services/menu-export.service.ts, src/app/core/services/export.service.spec.ts
- [ ] K9: Let the owner set coefficients for event types and serving types in the metadata manager — new CoefficientManagerComponent (both lists, add/delete own event types, coefficient save on change via TaxonomyStore.updateByKey, canEdit + optional PermissionService gate, TaxonomyStore.errorMessage on failure); addEventType(name, coefficient = 1) in MenuEventTypeService; page: import + SECTIONS entry `mm-sec-coefficients` + tag; spec — src/app/pages/metadata-manager/components/coefficient-manager/**, metadata-manager.page.component.ts/.html, src/app/core/services/menu-event-type.service.ts
- [ ] K10: Add the new texts — 13 dictionary keys above — public/assets/data/dictionary.json
- [ ] K11: Build, run the listed specs and greps, check the error log, then hand over the app checks — ng build, git diff --numstat on the two frozen files, ng test (listed), both greps, log-query — this plan file

## Technical Considerations
- Dependencies: `computePortions` / `formatCoefficient` / `isValidCoefficient` (440), `EventPlanService` +
  `computeEventPlan` (433), `TaxonomyStore` (`terms`, `find`, `add`, `updateByKey`, `removeByKey`, `canEdit`,
  `errorMessage`), `TranslationService`, `KitchenStateService.recipes_`, `MenuEventTypeService`,
  `PermissionService` (428, optional per Execution Notes).
- New files needed: `event-type-snapshot.service.ts` + spec, `menu-portions.service.ts` + spec,
  `portions-plan.spec.ts`, `coefficient-manager` component (ts/html/scss/spec).
- Model changes: none (440 added them). Form: item control `coefficient_override` (number | null); the
  `predictedTakeRate` control is gone.
- Backend / API: none; terms and events go through the generic API, validated by 440's schema.
- Auth and validation: coefficient > 0, ≤ 2 decimals checked in the UI (`isValidCoefficient`) and by Zod on the
  server; owner-only per C-PERM (server 427; client gate when 428 is merged).
- Security surface: none new.
- Data / migration: none. Events saved from now on carry snapshots, `portionsPerDiner` and `coefficientOverride`;
  stored `predictedTakeRate` on old events is left untouched and unread.
- Signal flow: form value → `formValueVersion_` → `MenuPortionsService.byItem` (`computed`) → dish row
  `portionInfo` input → template; save → `buildEventFromForm` → `hydrateDerivedPortions` (computePortions) →
  stored `derivedPortions`.
- Project checks: log-query Done-when present; chef stories; 13 dictionary keys listed; RTL logical CSS; icons
  already registered; hotspots append-only.

## Backend Impact
- Collections affected: `taxonomyTerms` (coefficient edits, new event types — through the generic API),
  `menuEvents` (new fields on save).
- New collections: no.
- Server changes needed: no.

## Out of Scope
- Live pricing, profit target and revenue math (plan 445) — `totalRevenue_` is not touched here.
- Renaming event types (edit = coefficient here); per-business overrides of shared types (Planner decision on
  plan 440 Q1: not in the MVP); renaming the existing serving types' Hebrew labels.
- Split engine by main-course count, event-attributes engine.
- "לא סגור סופית" / "חלקי" (plan 444), event stages (442/443).

## Critical Questions
none (plan 440's Q1 decided by the Planner: option a — see Execution Notes).
