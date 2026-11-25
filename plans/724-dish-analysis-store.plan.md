# Plan 724 — Dish analysis store: module, standing menu, monthly dish sales and sales-name aliases

Status: draft
Depends-on: 723
Track: code
Snapshot: 33a6c572

## Problem Statement
Dish analysis (feasibility plan 660, `docs/finance/dish-analysis-feasibility.md`; research report "Restaurant dish and
month analytics", section "Updated decisions") needs a place to keep a restaurant's standing menu and its monthly dish
sales. Today nothing holds either: the only menus are events (`menuEvents`) and the consultant's own diagnosis snapshot
(`diagnoses.menu`), and no collection counts a dish sold or returned (feasibility rows D1, D4, D5, D6). Dandan answered
on 2026-11-24 "decisions: all recommended". This plan builds the store those decisions need, with nothing visible:

- dish 1 (keep): a new owner-only entity for the standing menu; each dish has a stable id, a course, a price with VAT
  and a cost source.
- dish 4 (changed): every dish is costed by recipe, by a linked product, by a typed cost, or counted in units only.
- dish 2 (changed) and N-X3: typed months first; a file import with remembered aliases follows later. The alias table
  is created now, so the import slice adds no collection.
- dish 3 (keep): return reasons from a fixed list the owner can extend, with "other" and a note.
- dish 5 (refined) and N-X2: cost stays live while a month is open and freezes at the shared month close. This plan
  defines the frozen snapshot fields and keeps them server-owned; the close itself is a later plan.
- dish 6 (refined) and N-X1: one business VAT rate and dealer type (plan 723); a dish's net price is read from them.
- dish 7 (keep): a new module `dish_analysis` set by the platform admin.
- N-D1: classification is per course, so every dish carries its own course (taxonomy key).
- N-D2: a file's net-of-discount sales may sit beside the units (`netSales`), never required.
- N-D3: each alias maps a sales name to a dish with a portion factor (default 1).
- N-D4: an unmapped name is matched, skipped or added; a skip is remembered as an alias, and skipped names are listed
  on the month as "not counted".
- N-M2 (shared rule): a sold or returned count is `null` (not entered) or a number, where 0 is a real value.

Verified on `origin/main` 33a6c572:
- `shared/schemas/modules-pure.ts:4` has five `MODULE_KEYS`; `MODULE_OF_TYPE` (`:26-34`) has seven types;
  `shared/schemas/modules.ts:6-9` `modulesFieldSchema` is `.max(5)`. The generic API gates a type through
  `requireModuleForType` (`server/middleware/require-module.js:63-69`); the browser skips a request for a type whose
  module is off (`src/app/core/services/http-storage.adapter.ts:106-110`). The platform dialog lists `MODULE_KEYS` with
  `'module_' + key` (`platform-business-dialog.component.html:28`); `dictionary.json:2358-2362` has the five names.
- `server/utils/permissions.js:25` `OWNER_ONLY_TYPES` (staff may not create, edit or delete); staff reads are trimmed
  by `STAFF_READ_FIELDS` (`shared/schemas/staff-fields.ts`, `staffProjection` at `permissions.js:73`; an entry hides
  every non-base field it does not list). `MONEY_FIELDS` in `shared/schemas/money-fields.ts`. A consultant may do what
  the owner may except `manageTeam` and `editSettings` (`permissions.js:21`).
- `server/routes/generic.js` strips server-owned fields of clients and profiles on POST (`:573-575`) and PUT
  (`:747-749`), keeping the stored values through `merged = { ...current, ...updatable }` (`:772`). An E11000 on POST
  answers 409 (`:669-671`).
- `shared/schemas/entities/taxonomy-term.schema.ts`: `TAXONOMY_KINDS` (`:15-32`), `plainKinds` (`:107-117`),
  `TERM_REFERENCES` (`:59-89`, typed to five collections) drives the server's delete block and re-key
  (`generic.js:199-235`). The precedent for "built-in list + the business's own terms" is `logisticsSection`
  (`LogisticsItemRegistryService.sections_`, `logistics-item-registry.service.ts:42-48`).
- `coefficientSchema` (`taxonomy-term.schema.ts:102-105`) is a positive number with at most 2 decimals.
- `server/db.js:186-194` adds named indexes for the non-cloneable readable collections.
- `server/test/cross-business.test.js:39-60` keeps a POST body per user type and checks that every listed type has one;
  it wipes every collection before each case, so a business with no stored modules has `DEFAULT_MODULES`.

## Goals & Success Criteria
**Primary:** the three new collections exist, are validated, gated on `dish_analysis`, owner and consultant only,
indexed and tested; the application looks and behaves exactly as before for every business.

- [auto] `pnpm run test:server` exits 0, including the new `server/test/dish-analysis-schema.test.js` and
  `server/test/dish-analysis-store.test.js` and the updated `server/test/collections.test.js`,
  `server/test/cross-business.test.js`, `server/test/modules-schema.test.js`, `server/test/permissions.test.js`,
  `server/test/taxonomy-term-schema.test.js`.
- [auto] `server/test/dish-analysis-schema.test.js`: one full valid document of each new schema passes and one with an
  unknown key is refused; a menu dish whose `costSource` is `recipe` without `recipeId`, `product` without
  `productId`/`productAmount`/`productUnit`, `typed` without `typedCost`, or that carries a field of another source is
  refused; a month `2026-13`, two rows with one `menuDishId`, a row whose reason counts add up to more than
  `returned`, a reason row on a `returned: null` row, a repeated reason in one row and an `other` reason without a note
  are each refused; `sold: null` and `sold: 0` both pass; an alias with `action: 'skip'` and a `menuDishId`, or
  `action: 'dish'` without one, or `portionFactor: 0` or `1.005` is refused; `netPriceOf(118, 18, 'murshe')` is `100`
  and `netPriceOf(118, 18, 'patur')` is `118`.
- [auto] `server/test/dish-analysis-store.test.js`: with a business that has `dish_analysis`, the owner and an acting
  consultant create, read, change and delete each type through `/api/v1/data/<type>`; staff get 403 on every write and
  read documents with base fields only (no `name`, `priceWithVat`, `rows`); without the module every call answers 403
  `MODULE_OFF`; `closedAt`, `frozen`, `skipped`, `hits`, `lastSeenAt` sent by a client are dropped and stored values
  survive a PUT; a PUT or DELETE of a month with `closedAt` answers 409 `MONTH_CLOSED`; a second month with the same
  `month` answers 409 `MONTH_EXISTS`; a second alias whose name differs only in case and spaces answers 409
  `ALIAS_EXISTS`; the alias `nameKey` is the server's normalised `name`; after `connectDb` the four indexes named in
  Must Have exist by name.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0; `pnpm run test:ci`
  exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/724-dish-analysis-store.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/724-dish-analysis-store.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] On `/platform`, Dandan opens a business: the module list shows «ניתוח מנות» as a sixth tick box; ticking it,
  saving with a reason and reopening shows it still ticked; nothing else on the app changes for that business.

## Execution Mode
- Parallel: no with plan 727 — both append a module key and edit `shared/schemas/modules-pure.ts`,
  `shared/schemas/modules.ts`, `shared/schemas/entities/index.ts`, `server/constants/collections.js`, `server/db.js`,
  `server/utils/permissions.js`, `server/test/modules-schema.test.js`, `server/test/cross-business.test.js` and
  `dictionary.json`. Run them one after the other; the second one unions the lists.
- Concurrent plans: any plan that touches none of the files above (722, 723 only if merged first: this plan depends on 723).
- Isolated DB: no — new collections only; no existing document changes.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/modules-pure.ts
shared/schemas/modules.ts
shared/schemas/money-fields.ts
shared/schemas/staff-fields.ts
shared/schemas/entities/index.ts
shared/schemas/entities/menu-dish.schema.ts
shared/schemas/entities/dish-sales-month.schema.ts
shared/schemas/entities/dish-sales-alias.schema.ts
shared/schemas/entities/taxonomy-term.schema.ts
shared/schemas/dish-analysis/**
server/constants/collections.js
server/db.js
server/utils/permissions.js
server/routes/generic.js
server/breadcrumbs.md
server/test/dish-analysis-schema.test.js
server/test/dish-analysis-store.test.js
server/test/collections.test.js
server/test/cross-business.test.js
server/test/modules-schema.test.js
server/test/permissions.test.js
server/test/taxonomy-term-schema.test.js
server/test/helpers/v2-docs.js
docs/agent/standards-backend.md
docs/modules/modules-map.md
docs/brain/component-families.md
docs/workflow-kit/manifest.json
server/test/helpers/app.js
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — the three types join `OWNER_ONLY_TYPES` (staff never create, edit or delete them) and
  `STAFF_READ_FIELDS` with an empty list (a staff read returns base fields only: no names, prices, counts or costs —
  the trimming `diagnoses` and `invoices` already use). Money fields are listed in `MONEY_FIELDS`
  (`menuDishes.priceWithVat`, `menuDishes.typedCost`, `dishSalesMonths.rows[].netSales`, `dishSalesMonths.frozen`).
  The owner and a consultant acting with a live grant may do everything (no new action, `CONSULTANT_DENIED` unchanged).
  Every write still goes through `assertCan` in `server/routes/generic.js`; module gating is `MODULE_OF_TYPE`.
- INV-2: preserves — every document carries `businessId` and is read through `scopeFilter`; none of the three is
  cloneable (no `_masterId`, like `diagnoses`); the admin delete route clears them through `ALL_USER_ENTITY_TYPES`.
- INV-3: preserves — the server strips its own fields and re-derives the alias `nameKey` in the same request; the later
  month close (N-X2) is one server request; renaming a course or an own return reason re-keys menu dishes and months on
  the server through `TERM_REFERENCES` (no client loop).
- INV-4: preserves — three new `z.strictObject` schemas in `shared/schemas/entities/`, registered in
  `SCHEMA_BY_COLLECTION`; the server validates every generic write against them.
- INV-5: preserves — a dish's course is a `course` taxonomy key; the business's own return reasons are terms of a new
  plain kind `dishReturnReason` in `taxonomyTerms`, beside six built-in reason keys kept as code constants (the
  `logisticsSection` pattern). `TERM_REFERENCES` gains the two new reference paths.

## Reuse Check
- `netPriceOf` (pure helper, `shared/schemas/dish-analysis/net-price.ts`) — family: helpers — rung: 3 — why: the
  net-of-VAT rule of `buildMarginReport` (`margin-report.ts:29`) plus the dealer type; one shared file so the menu page,
  the month close and the analysis function divide the same way
- `portionFactor` uses `coefficientSchema` — family: taxonomy — rung: 1 — why: the same "positive, 2 decimals" multiplier the event types use
- alias `nameKey` uses `normalizeProductName` (`server/utils/price-list-import.js:25`) — family: invoice-memory — rung: 1 — why: the same trim, collapse-spaces, lower-case rule the invoice name memory uses
- three entity schemas — family: entity-schemas — rung: 2 — why: one stored shape per file, registered in `SCHEMA_BY_COLLECTION`
- none — no component, pipe, service or `.c-*` class is created

## Defaults

- confirm-destructive-action — exception — why: store only; no screen deletes anything in this plan.
- empty-state-on-list — exception — why: store only; no list is shown.
- loading-and-error-states — exception — why: store only; no screen.
- unsaved-changes-on-leave — exception — why: no form.
- hints-in-tooltips — exception — why: no hint text.
- leave-and-return — exception — why: no navigation.
- app-list-container — exception — why: no list.
- one-breakpoint-set — exception — why: no SCSS.
- unit-dropdown-add — exception — why: no dropdown; `productUnit` is only a stored field here (plan 725 builds its picker).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want my standing menu and my monthly dish sales stored in my business only, so that
  later screens can show what each dish leaves me.
- As a chef, I want my cooks never to see my selling prices, costs or sales counts.
- As a consultant acting in a client's kitchen, I want to enter and read the same numbers the owner does.
- As the platform admin, I want dish analysis to be one module I switch on per business, so a caterer never sees it.

## Functional Requirements

### Must Have (P0)
- [ ] **Module.** `MODULE_KEYS` gains `'dish_analysis'` after `'consultant_diag'`; it is not in `DEFAULT_MODULES`.
  `modulesFieldSchema` max becomes `MODULE_KEYS.length`. `MODULE_OF_TYPE` gains `menuDishes`, `dishSalesMonths` and
  `dishSalesAliases`, each `['dish_analysis']`. Dictionary `module_dish_analysis` («ניתוח מנות»).
- [ ] **`menuDishes`** (`shared/schemas/entities/menu-dish.schema.ts`, `menuDishSchema`, one document per dish of the
  standing menu): `...baseDocShape`, `name` (`nameField`, trimmed, min 1), `course?` (a `course` term key),
  `priceWithVat?` (number 0–100000; absent = no price yet), `costSource` (`DISH_COST_SOURCES =
  ['recipe', 'product', 'typed', 'units']`), `recipeId?` (an id of `recipes` or `dishes`), `productId?`,
  `productAmount?` (> 0), `productUnit?` (1–40 chars), `typedCost?` (number 0–100000, cost per portion as stored
  product prices are), `active` (boolean, default true: a dish taken off the menu keeps its history), `note?` (≤ 200).
  A refine: `recipe` needs `recipeId`; `product` needs `productId`, `productAmount`, `productUnit`; `typed` needs
  `typedCost`; a field of another source is refused; `units` carries none of them.
- [ ] **`dishSalesMonths`** (`dish-sales-month.schema.ts`, `dishSalesMonthSchema`, one document per business and month):
  `...baseDocShape`, `month` (`MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/`), `note?` (≤ 500), `rows` (≤ 300) of
  `{ menuDishId, nameSnapshot (≤ 200), sold: int 0–100000 | null, returned: int 0–100000 | null, returnReasons:
  [{ reason (1–80 chars: a built-in key or an own term key), count: int ≥ 1, note? (≤ 200) }] (≤ 20, default []),
  netSales?: number ≥ 0 | null, source: 'typed' | 'import' (default 'typed') }`. Refines: `menuDishId` unique across
  rows; per row the reasons are unique, their counts add up to at most `returned`, there are none when `returned` is
  null, and `other` has a note. Server-owned (`DISH_MONTH_SERVER_FIELDS = ['closedAt', 'closedBy', 'frozen',
  'skipped']`): `closedAt?`, `closedBy?`, `frozen?` = `{ at, vatRatePct, dealerType, dishes: [{ menuDishId, name,
  course?, priceWithVat: number | null, costPerPortion: number | null, costSource, partial: boolean }] (≤ 300) }`,
  `skipped?` = `[{ name (≤ 200), units: int ≥ 0 }]` (≤ 300; N-D4 "not counted"). `dealerType` uses plan 723's dealer
  type enum.
- [ ] **`dishSalesAliases`** (`dish-sales-alias.schema.ts`, `dishSalesAliasSchema`): `...baseDocShape`, `name` (1–200,
  as printed on a sales file), `nameKey` (server-derived), `action: 'dish' | 'skip'`, `menuDishId?` (required for
  `dish`, refused for `skip`), `portionFactor` (`coefficientSchema`, ≤ 20, default 1), `hits` (int ≥ 0, default 0),
  `lastSeenAt?`. Server-owned: `DISH_ALIAS_SERVER_FIELDS = ['nameKey', 'hits', 'lastSeenAt']`.
- [ ] **Return reasons.** `DISH_RETURN_REASONS = ['guest_returned', 'kitchen_mistake', 'staff_meal', 'comp',
  'expired', 'other']` (in `dish-sales-month.schema.ts`); dictionary `dish_return_reason_<key>`. `TAXONOMY_KINDS` and
  `plainKinds` gain `dishReturnReason` (the business's own reasons; `key` = the Hebrew text, as `logisticsSection`).
  `LOCKED_TAXONOMY_KINDS` gains it (owner and consultant add them; staff never).
- [ ] **Term references.** `TERM_REFERENCES` collection type gains `menuDishes` and `dishSalesMonths`;
  `course.menuDishes = ['course']`; `dishReturnReason.dishSalesMonths = ['rows.returnReasons.reason']`.
- [ ] **Registry.** `SCHEMA_BY_COLLECTION` and `export *` for the three schemas. `COLLECTIONS` rows: all three
  `userData: true, cloneable: false, backup: true, searchable: false, softDelete: false` (no `routerWrites`).
  `OWNER_ONLY_TYPES` gains the three; `STAFF_READ_FIELDS` gains each with `[]`; `MONEY_FIELDS` as in Architecture Impact.
- [ ] **Generic route** (`server/routes/generic.js`): POST and PUT of `dishSalesMonths` drop `DISH_MONTH_SERVER_FIELDS`
  and of `dishSalesAliases` drop `DISH_ALIAS_SERVER_FIELDS` (stored values survive a PUT); the alias `nameKey` is
  `normalizeProductName(name)` on every write; a PUT or DELETE of a month whose stored `closedAt` is set answers 409
  `{ error: 'MONTH_CLOSED', messageKey: 'dish_month_closed' }`; E11000 on a month answers 409
  `{ error: 'MONTH_EXISTS', messageKey: 'dish_month_exists' }`, on an alias 409
  `{ error: 'ALIAS_EXISTS', messageKey: 'dish_alias_exists' }`.
- [ ] **Indexes** (`server/db.js`): `menu_dishes_business_active` `{ businessId, active, name }`;
  `dish_sales_months_business_month` `{ businessId, month }` unique; `dish_sales_aliases_business_key`
  `{ businessId, nameKey }` unique; `dish_sales_aliases_business_dish` `{ businessId, menuDishId }`. Four new names;
  the taxonomy indexes are unchanged.
- [ ] **Net price** (`shared/schemas/dish-analysis/net-price.ts`): `netPriceOf(priceWithVat, vatRatePct, dealerType)`
  → `murshe`: `price ÷ (1 + rate / 100)` rounded to 2 decimals; `patur`: the price unchanged (no VAT is charged).

### Should Have (P1)
- [ ] `docs/agent/standards-backend.md` §1 registry rows for the three types; `docs/modules/modules-map.md` C-MODULES
  table row `dish_analysis` (server: the three generic types; browser: the menu page and the sales page, plans 725–726).
- [ ] `server/breadcrumbs.md`: `generic.js` line names the month and alias rules.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No screen. Dictionary keys (append-only, `general`): `module_dish_analysis` ("ניתוח מנות"),
  `dish_return_reason_guest_returned` ("הוחזר על ידי אורח"), `dish_return_reason_kitchen_mistake` ("טעות במטבח"),
  `dish_return_reason_staff_meal` ("ארוחת צוות"), `dish_return_reason_comp` ("על חשבון הבית"),
  `dish_return_reason_expired` ("פג תוקף"), `dish_return_reason_other` ("אחר"),
  `dish_month_closed` ("החודש נסגר ולא ניתן לשנות אותו"), `dish_month_exists` ("כבר קיים רישום לחודש הזה"),
  `dish_alias_exists` ("השם הזה כבר מקושר").

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add dish analysis as a sixth module the platform admin can switch on — key, type gates, schema max, dictionary name — shared/schemas/modules-pure.ts, shared/schemas/modules.ts, public/assets/data/dictionary.json, server/test/modules-schema.test.js
- [ ] A2: Define the standing menu, monthly sales and sales-name shapes with their rules — three schema files, return reason list, net price helper — shared/schemas/entities/menu-dish.schema.ts, shared/schemas/entities/dish-sales-month.schema.ts, shared/schemas/entities/dish-sales-alias.schema.ts, shared/schemas/dish-analysis/net-price.ts, shared/schemas/entities/index.ts
- [ ] A3: Let courses and the owner's own return reasons re-key and protect these records — new taxonomy kind, term references — shared/schemas/entities/taxonomy-term.schema.ts, server/test/taxonomy-term-schema.test.js
- [ ] A4: Keep prices, costs and counts away from staff and gate them on the module — owner-only types, empty staff read, money fields, collection rows — server/constants/collections.js, server/utils/permissions.js, shared/schemas/staff-fields.ts, shared/schemas/money-fields.ts, server/test/collections.test.js, server/test/permissions.test.js
- [ ] A5: Stop a browser from writing the frozen cost or a closed month, and give clear refusals — server field stripping, alias name key, MONTH_CLOSED / MONTH_EXISTS / ALIAS_EXISTS, indexes — server/routes/generic.js, server/db.js
- [ ] A6: Prove the store with tests for owner, consultant, staff, module off and a second business — server/test/dish-analysis-schema.test.js, server/test/dish-analysis-store.test.js, server/test/cross-business.test.js, server/test/helpers/v2-docs.js
- [ ] A7: Record the new store in the maps and run every automatic check — registry lines for netPriceOf (helpers) and the three schemas (entity-schemas); paste outputs under Execution Notes — docs/agent/standards-backend.md, docs/modules/modules-map.md, server/breadcrumbs.md, docs/brain/component-families.md

## What happens when
- A business without the module calls any of the three types: 403 `MODULE_OFF`; the browser sends no request
  (`HttpStorageAdapter`).
- The platform admin switches the module off: the documents stay; reads answer 403 until it is on again.
- A staff member reads a type: documents with base fields only. Writes: 403 `OWNER_ONLY_TYPE`.
- A consultant's grant is removed: the next request is refused by the existing acting re-check (ADR 0032).
- The owner renames a course or an own return reason: the server re-keys menu dishes and months in the same request;
  deleting a term still in use is blocked with the documents listed (existing rule).
- A recipe or product linked from a menu dish is deleted: the menu dish keeps the id; plan 725 shows its cost as partial.
- `cross-business.test.js` wipes `businesses` before each case: its `beforeEach` stores `biz_X` and `biz_Y` with
  `modules` that include `dish_analysis` and clears the module cache (`clearModuleCache`), and `BODY` gains one body
  per new type.

## Technical Considerations
- Dependencies: plan 723 (business `settings.vatRatePct`, `settings.dealerType` and its dealer type enum; this plan
  imports that enum for `frozen.dealerType`). If 723 named them differently, use 723's names and note it.
- Known collision: branch `chore/restaurant-staging` (not on main) adds `'tables'` to `MODULE_KEYS` and
  `MODULE_OF_TYPE` and raises the modules max; plan 727 adds `'monthly_plan'`. This plan targets main and appends
  `'dish_analysis'` after the existing keys; the staging merge and 727 each need a trivial union of the lists (keep
  `modulesFieldSchema.max(MODULE_KEYS.length)`).
- One document per month (not per dish-month) keeps a month one write and one close (INV-3). 300 rows matches the
  diagnosis menu cap. Per dish per month is about 120 bytes: a 100-dish menu over 5 years is well under 1 MB.
- Frozen cost: `frozen` is defined now and written only by the month close plan (N-X2). The browser computes recipe
  costs today (`RecipeCostService`, feasibility section 5); that plan decides whether the close request carries the
  browser's costs or moves the cost rule to `shared/`. While `frozen` is absent the month is open and the cost is live.
- `menuDishes` is not soft-deleted: a dish leaves the menu by `active: false`, so every past month still finds it. A
  month row also keeps `nameSnapshot` for the rare hard delete.
- Logs carry ids and counts only, never a dish name or a price (`server/routes/diag.js:4`).
- Security surface: three owner-only money collections on the existing generic pipe; no new route, no AI call, no file.
- Data / migration: none (new collections; existing taxonomy documents unchanged).

## Out of Scope
- Any screen (plans 725 and 726), the analysis function, the sales file import and its preview, the month close and
  freeze, insights, the new-dish calculator, labour per dish.
- Patur cost gross-up (dish 6 "dealer type controls whether costs are net or gross"): applied by the analysis function.

## Critical Questions
- none — Dandan chose every recommended option on 2026-11-24; choices the decisions do not settle are `behaviour:`
  decisions below for him to grade.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions.
- behaviour: one document per dish for the standing menu (not one per business) — stable ids, plain generic CRUD — reverse: one menu document holding a dish list
- behaviour: staff read the three types with base fields only (empty STAFF_READ_FIELDS), not a 403 — the diagnoses pattern, keeps INV-1 unchanged — reverse: refuse staff reads with 403 (an INV-1 change)
- behaviour: the business's own return reasons are taxonomy terms keyed by their Hebrew text, no translation key — the logisticsSection pattern — reverse: route a new reason through the translation-key popup
- behaviour: a menu dish keeps its own course (prefilled from the recipe in plan 725) so dishes without a recipe can be classified per course (N-D1) — reverse: read course through the recipe only
