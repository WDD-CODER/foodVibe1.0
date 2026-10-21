# MVP plan map — APPROVED by Dandan 2026-10-20 (map + contracts). Arch: `approve arch change INV-1` and `approve arch change INV-2` given 2026-10-20.

Source brief (product specs = Part 3, cross-cutting rules = Part 2): C:\Users\danwe\Downloads\mvp-planning-brief.md
Technical audit: C:\coding projects\Cursor\foodVibe1.0\docs\mvp\2026-10-19-mvp-gap-audit.md (moved from docs/brain; may be untracked)
Verified against origin/main SHA: 8ffda3d2 (use as `Snapshot:` — run `git rev-parse origin/main` to get full SHA)

## Plan numbers (fixed — use these, never spec ids, when referencing other plans)

| Map# | NNN | Spec | Title | Lane/slot | Depends on (must be merged) |
|---|---|---|---|---|---|
| 1 | 424 | 01.1 | Business entity, businessId + createdBy on every item, user business fields, migration 0006, ADR 0023, INV-1/INV-2 rewrite | wt-1 | plan 407 P6.3 (migration 0005 applied on Atlas) |
| 2 | 425 | 01.1 | Scope every read/write by business (scope helper, clone/sync per business, JWT, signup creates business, platform-admin split, trash/purge per business, cross-business tests, real INV-1/INV-2 tests) | wt-1 | 424 |
| 3 | 426 | 01.1 | Client: business + role in user state, business name at signup, platform-admin-only screens, "no business" login block | wt-1 | 425 |
| 5 | 427 | 01.2 | Central permission checker on the server + tests | wt-1 | 425 |
| 6 | 428 | 01.2 | /settings page + Team tab, client PermissionService, product price lock via new child component | wt-1 | 427, 426 |
| 4 | 429 | — | Business settings (profit target, safety margin, overrun threshold) owner-only + Business tab in /settings | wt-1 | 428 |
| 7 | 430 | 07.1 | Daily usage record on the server | wt-2 (after 437) | 425 |
| 8 | 431 | 06.1 | Opening baseline screen, setup checklist card, PWA name FoodVibe, remove dead demo-*.json read | wt-1 | 429, 430 |
| 9 | 432 | 06.2 | Bulk product import from pasted price list | wt-1 | 431, 427 |
| 12 | 433 | 04.1 | One quantity + cost engine, pure, fixture tests, no UI | wt-2 | plan 423 |
| 13 | 434 | 04.1 | Wire every list/preview/Excel/menu footer to the engine; delete the 3 shopping-list copies | wt-2 | 433 |
| 14 | 435 | 04.2 | Supplier orders screen + copy / WhatsApp | wt-2 | 434 |
| 15 | 436 | 04.3 | Station taxonomy kind + station picker in recipe header | wt-2 | 434 |
| 16 | 437 | 04.3 | Printed prep sheets per group, page per group, group selection | wt-2 | 436 |
| 17 | 438 | 02.1 | Lean product form (name + unit only) + remove course color | wt-3 | plan 423 (both edit product-form) |
| 18 | 439 | 02.1 | Paste recipe / paste ingredients (wire /ai/parse-text), red "לא מוכן" rows | wt-3 | 438 |
| 19 | 440 | 03.1 | Coefficients: schema, migration 0007 seed, single portions function | wt-3 | 424 |
| 20 | 441 | 03.1 | Coefficients UI: settings lists, per-dish coefficient + manual override, remove take-rate / pieces-per-person | wt-3 | 440, 433 |
| 21 | 442 | 09.1 | Event stage pipeline, stage history, server events router, legacy-event migration 0008 | wt-3 | 441 |
| 22 | 443 | 09.1 | New inquiry form, stage bar, notes log, library stage chip/filter, customer fields | wt-3 | 442 |
| 23 | 444 | 03.3 | "לא סגור סופית" flag, "חלקי" badge, missing-prices popover with inline price edit | wt-3 | 434, 443 |
| 24 | 445 | 03.2 | Live pricing meter + per-event money fields | wt-3 | 444, 429 |
| 25 | 446 | 08.1 | Planning snapshot + event closing dialog | wt-3 | 445, 435 |
| 26 | 447 | 07.2 | Business performance dashboard (server-computed) | wt-3 | 431, 430, 446, 443 |
| 10 | 448 | 07.3 | Platform admin dashboard (business table; drill-down only if 447 merged) | wt-1 (last) | 430, 442 (drill-down: 447) |

Lanes: wt-1: 424→425→426→427→428→429→431→432→448 · wt-2: 423→433→434→435→436→437→430 · wt-3: 420,421 (QA fixes, existing plans) → 438→439→440→441→442→443→444→445→446→447.

Must not run at the same time (shared hotspot files) — write `Parallel: no` against these in Execution Mode:
- 434 or 435 with any of 441–446 (`menu-intelligence.page.ts`).
- 434, 435, 437 with each other (`menu-export.service.ts`).
- 428, 438, 444 with each other and with 423 (`product-form.component.ts`).
- 424 or 425 with any plan that edits `shared/schemas/**` or `server/routes/generic.js`.
- 440, 442, 445, 446 all edit `shared/schemas/entities/menu-event.schema.ts` — sequential in lane 3.

Human gates: 424 (Atlas migration go after dry-run), 440 and 442 (Atlas migration go after dry-run), every plan's [human] Done-when.

## Reality Check deltas (verified at 8ffda3d2 — these override the brief/audit)

Tenancy/server:
- signup `server/routes/auth.js` ~L101 → `cloneMasterDataToUser` (`server/services/clone-master.js:41`), stamps `lastSyncedMasterVersion`. login ~L165, refresh ~L225, guest ~L300 → `syncMasterToUser` (`server/services/sync-master.js:67`); only /refresh is version-gated. Since 407 clone/sync filter master with `LIVE`; sync rule 5 never re-clones an item the user deleted.
- `server/routes/generic.js` (1142 lines): 122 `userId` occurrences on 86 lines. `isAdmin` :94, `readOwner(type,userId)` :97 (taxonomy `{$in:[userId,'__master__']}`), `termWriteOwner(req)` :102, `termScope` :107, `masterHasTerm` :168. No central scope/permission helper. 407 added `LIVE`/`IN_TRASH` filters, `deleteStamp` :770, `requireSoftDelete` :79.
- Admin routes: PUT `/:type/:id/push-to-master` :708 (verifyToken, requireAdmin); PUT `/:type/:id/delete-from-master` :809; PUT `/:type/:id/purge-ingredient-everywhere` :867; shared term creation inside POST `/:type` :410 (403 "Only an admin can add a shared term"); global dictionary PUT `/DICTIONARY_OVERRIDES/global` :474 inline role check.
- Trash routes (407): GET `/:type/trash` :333 (runs `purgeExpired` for [caller, __master__]), PUT `/:type/trash/restore-all` :347, PUT `/:type/:id/restore` :360, DELETE `/:type/trash` :1068, DELETE `/:type/:id?permanent=true` :1088. `server/jobs/purge-deleted.js` (PURGE_AFTER_DAYS=30, LIVE, IN_TRASH, isMasterClone, toStub, disposeDoc, purgeExpired). All keyed by userId. No userPrefs collection was built: favorites = `favorite: boolean` on the user's own recipe/dish copy (ADR 0022).
- `shared/schemas/base.schema.ts` baseDocShape: `_id, schemaVersion(2), userId, createdAt, updatedAt, deletedAt?, deletedBy?`; `tombstoneSchema` (`_masterId`, `deletedAt`, `purgedAt`); `NAME_MAX_LENGTH=200`, `nameField` (plan 417).
- `server/models/user.model.js`: `_id, name (unique), email (unique), imgUrl, role enum ['admin','user'], passwordHash, failedAttempts, lockedUntil, lastSyncedMasterVersion`; timestamps false.
- JWT access `{userId,name,role}` 15m; refresh `{userId}` 30d httpOnly cookie `fv_refresh` (dev: `fv_refresh_${PORT}`). `server/middleware/auth.js` exports `verifyToken, optionalToken, requireAdmin` (via `attachUser`).
- `server/db.js` indexes all lead with userId except taxonomy unique `{kind,key,userId}` (`kind_key_user_unique`); also `user_kind_order`, VERSION_HISTORY `{userId,entityType,entityId}`, searchable `{userId,nameHebrew}`, products `{userId,minStockLevel}`, recipes/dishes `{userId,isApproved}` and `{userId,'ingredients.referenceId'}`.
- `server/constants/collections.js`: suppliers, products, recipes, dishes, equipment, venues, menuEvents (softDelete:true), VERSION_HISTORY, activity_log, taxonomyTerms, DICTIONARY_OVERRIDES. Exports COLLECTIONS, ALL_USER_ENTITY_TYPES, CLONEABLE_TYPES, SEARCHABLE_ENTITY_TYPES, BACKUP_ENTITY_TYPES, SOFT_DELETE_TYPES. No TRASH_* any more.
- `server/routes/admin.js`: GET /users, DELETE /users/:userId (deleteMany({userId}) across ALL_USER_ENTITY_TYPES).
- Migrations: `server/migrations/0001..0005-*.js` + `tools/` (`_connect.js` parseArgs, `field-inventory.js`, `soft-delete-inventory.js`, `validate-all.js`). No runner; each file runs standalone `node server/migrations/000N-x.js --target=local|atlas`. Default dry-run; `--write=yes` requires `--backup-dir=`; `--verify=yes` read-only; Atlas needs `--confirm-host=<host>`; `--db=<scratch>` local scratch copy. Each migration exports pure functions tested in `server/test/migration-000N-*.test.js`. Backup/restore: `docs/agent/standards-backend.md` §7.
- Server tests: `npm --prefix server test` (vitest, pretest builds schemas). Helpers `server/test/helpers/app.js` (`buildTestApp`, `teardownTestApp`, `signTestToken(payload)`, `testDb`), `helpers/v2-docs.js` (`productBody`, `recipeBody`, `stored`). No helper creating User docs. `server/test/invariants.test.js`: INV-1 real tests per type (+ it.todo admin edits master item for products/recipes/dishes/menuEvents); INV-2 only it.todo; INV-4 real.
- Client: `src/app/core/services/user.service.ts` `isAdmin_` :36 (`role==='admin'`), 16 non-spec refs in 9 files; `signup()` :280, `login()` :318 rethrows ANY 401 as Error('USER_NOT_FOUND') (:333). Signup/login modal `src/app/core/components/auth-modal/auth-modal.component.*` (`_onError` maps keys). Header admin check `header.component.html:11`.
- No settings page/route; guards only `authGuard`, `pendingChangesGuard` (`src/app/core/guards/`). `/dashboard` has no guard; tabs `?tab=overview|metadata|venues|add-venue|trash`. Metadata manager `src/app/pages/metadata-manager/metadata-manager.page.component.ts` rendered only in dashboard `?tab=metadata`; `KIND_BY_TYPE` L49; sections incl. user management + AI models (admin-only via `isAdmin()`), `canEditTerm` L181.
- `server/routes/ai.js`: `POST /parse-text` :400 (verifyToken, aiLimiter 20/15min per userId), `TEXT_IMPORT_SYSTEM_PROMPT` :351 returns `{type:'recipe'|'dish', confidence, data:{nameHebrew, serving_portions, labels[], ingredients[{nameHebrew, amount_net, unit}], steps[{order,instruction}]}}`; `GET /usage` :69; `/models` admin :79. `GeminiService.parseText()` `gemini.service.ts:117` no callers.
- AI recipe flow: `RecipeBookListComponent.ngOnInit` (L435) HeroFab action `add_recipe_ai` → `AiRecipeModalService.open()` → `ai-recipe-modal.component.ts` → `navigateToBuilder_` (L267) → `AiRecipeDraftService.set(draft)` → `/recipe-builder` → `RecipeAiFlowService.applyPendingDraft()` (`recipe-ai-flow.service.ts:55`). Draft shape: nameHebrew, recipe_type, yield_amount, yield_unit, ingredients{name,amount,unit}, steps[], equipment?.
- Recipe save: `RecipeHeaderComponent.validate()` (~L166-177); `recipe-form.service.ts` `recipeFormValidator` L45, `ingredientRowValidator` L33, L284 `defaultStation: ''`; `recipe-builder.page.ts` saveRecipe ~L833, unlinked confirm L858-861. `.unlinked-row`: `recipe-ingredients-table.component.html` L39, `.scss:273`; `isUnlinkedRow`/`hasUnlinkedRows` ts:410-417.
- Growth-frozen (declared `_shared/tech-stack.md:26-28`; review-only, net lines ≤ 0, new logic in new service/component): `recipe-builder.page.ts`, `menu-intelligence.page.ts` (1313), `cook-view.page.ts` (1295), `product-form.component.ts` (976), `menu-export.service.ts` (897).
- `product-form.component.ts` `initForm()` L373, validators L375-388 (productName required + duplicateNameValidator, baseUnit required, buy_price_global_ required min 0, categories required minLength 1, yieldFactor required min 0).
- Product schema `shared/schemas/entities/product.schema.ts`: baseUnit, `sources[]{supplierId, price, addedBy?, addedAt?}`, `purchaseOptions[]{unitSymbol, conversionRate, priceOverride?, uom?}`, yieldFactor, categories, allergens, minStockLevel, expiryDaysDefault. `buy_price_global_` / `supplierIds_` only as deprecated client shims (`product.model.ts` L49/51, `product-data.service.ts` L99). Money fields on products = `sources[].price`, `purchaseOptions[].priceOverride`.
- Supplier schema: nameHebrew, contactPerson?, phone?, phone2?, deliveryDays, minOrderMov, leadTimeDays, supplierLogoUrl?.
- Taxonomy kinds (`taxonomy-term.schema.ts` L13-27): ingredientCategory, allergen, label, course, protein, kosherType, unit, prepCategory, preparation, menuType, eventType, sectionCategory, equipmentCategory. course + label require `color` (L109); unit has `gramRate`; menuType has `fields: DishFieldKey[]`; eventType plain. `TERM_REFERENCES` menuType→menuEvents.servingType, eventType→menuEvents.eventType. `COURSE_NEUTRAL_COLOR` `metadata-registry.service.ts:16`; `allMenuTypes_` L52-56. `server/services/seed-master.js` seeds course colors (L74/L106) and reads non-existent demo-*.json (L27-33). Gotcha: `docs/brain/gotchas/backend.md` L223 "Course terms must carry a color".
- Menu event schema (strictObject): baseDocShape, name, eventType, eventDate?, servingType, guestCount, piecesPerPerson?, sections[]{_id,name,sortOrder,items[]{recipeId, recipeType, predictedTakeRate, derivedPortions, sellPrice?, foodCostOverride?, servingPortions?}}, financialTargets?{targetFoodCostPct, targetRevenuePerGuest?}, performanceTags?, cuisineTags?, createdFromTemplateId?, logistics?, _masterId?, _userModified?. Items have NO _id → item key = `${section._id}|${itemIndex}`.
- `menu-intelligence.service.ts` `derivePortions` L19-38, `hydrateDerivedPortions` L40-57, `computeEventRevenue` L81-91, `computeFoodCostPct` L94, `computeFoodCostPctFromActualRevenue` L103. Spec `menu-intelligence.service.spec.ts` L45-56, L100+ lock cocktail/take-rate behaviour.
- `menu-intelligence.page.ts`: `form_` L168-175 (no piecesPerPerson control), `eventCost_` L198, `foodCostPct_` L204, `totalRevenue_` L212-227 (sell_price × serving_portions × guests, from form), `costPerGuest_` L229, `profitPerGuest_` L239, `getPiecesPerPerson()` L700-702, `selectRecipe` L826, `loadEvent` L1102-1139 (serving_portions ?? 0 at L1130), `buildEventFromForm` L1184-1233 (`|| 1`, financialTargets {30,0} L1216-1219). html 33% at L315, footer L311-330. Child components: `components/menu-dish-row/` (piecesPerPerson input L53), `components/menu-export-sheet/`; services `services/menu-ai-flow.service.ts`, `services/menu-picker-search.service.ts`; `menu-form.util.ts`.
- `menu-library-list.component.ts` (269 lines) is a CARD GRID (article.event-card: name, eventType · date, tags food cost %, revenue, guests). Filters searchQuery_, eventTypeFilter_, servingStyleFilter_, dateFrom_; sorts date/name/food_cost/guest_count; URL state via `useListState('menu-library', …)`.
- `menu-export.service.ts` (897): shopping list copies `exportMenuShoppingList` L109-181, `getMenuShoppingListPreviewPayload` L430-495, `addMenuShoppingListSheetToWorkbook` L827-896 (aggregate by name+unit, group by categories[0]/'כללי'/'הכנות'); `getMenuChecklistPreviewPayload` L498-608; `defaultStation ?? 'כללי'` L270, L573, L763. `ExportService` facade `export.service.ts`. `ScalingService.getScaledIngredients` `scaling.service.ts` L44. Tests: `export.service.spec.ts` (spies scaling; no aggregation test).
- Cost: `getEffectivePrice` in `src/app/core/utils/product-source.util.ts` L7 (lowest positive sources[].price → deprecated buy_price_global_ → 0); `getSupplierIds` L16. `recipe-cost.service.ts` `computeIngredientCost` L256-288, `getCostForIngredient` L26, `computeRecipeCost` L34, `convertToBaseUnits` L57, `amountInRecipeYieldUnit` L68, `normalizeToRecipeYieldUnit` L291; `recipe-cost.constants.ts` (UNIT_ALIASES, MASS_UNITS, MAX_RECURSION_DEPTH=5). `UnitRegistryService` `getConversion(key)` L89 (SYSTEM_UNITS kg 1000, liter 1000, gram 1, ml 1, unit 1, …). `product-price.util.ts` `getPricePerUnit` L17. `product-validation.util.ts` `getProductValidationStatus` L21, `getProductMissingFields` L32.
- Plan 423 (open, runs before 433 and 438): adds `src/app/core/utils/purchase-option-rate.util.ts` `optionRateInBase(product, opt, registry)` = conversionRate × getConversion(uom||base) / getConversion(base); used in recipe-cost, product-price.util. The engine (433) must use `optionRateInBase` for purchase units.
- Print CSS `src/styles.scss` @media print blocks L2119, L2231, L2264. `src/app/shared/export-preview/` (payload input `ExportPayload` from `src/app/core/utils/export.util.ts` L175; outputs exportClick, printClick, close).
- No clipboard / navigator.share / WhatsApp anywhere.
- Client tests: Karma + Jasmine, `npx ng test --watch=false --include='<spec>'`; pure utils pattern `src/app/core/utils/*.util.ts` + spec.
- Dashboard `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html`: 4 KPI cards (L7, L34, L61, L88), fake sparklines L49, L76, L103; recent activity `ActivityLogService` localStorage.
- `server/services/log-sink.js` app_logs 90d TTL; render.yaml has no LOG_PERSIST_INFO.
- Cloudinary: `CloudinaryService.upload(file)` (unsigned, `secure_url`); callers auth-modal, recipe-header, venue-form. `downscaleImage` only used by gemini.service.
- Cook view `src/app/pages/cook-view/cook-view.page.ts` `markStepDone` L868 (in-memory only).
- Version history written by the client (`version-history.service.ts:72`) into VERSION_HISTORY via generic API; server stamps userId.
- `public/manifest.webmanifest` name/short_name "foodVibe1.0". Dictionary `public/assets/data/dictionary.json` groups: units, categories, section_categories, preparation_categories, allergens, actions, export_headers, general.
- ADRs: highest 0022. New ADR from plan 424 = `docs/brain/decisions/0023-business-is-the-tenant.md` (supersedes ADR 0008 D1).

## Contracts (copy verbatim into every plan that uses them)

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-USER (424/425/426)**
- User fields added: `businessId: string`, `businessRole: 'owner' | 'staff'`, `isPlatformAdmin: boolean` (migration: `true` where `role === 'admin'`), `removedAt?: number` (staff removed → login blocked), `createdAt: number`. `role` stays read-only legacy until 426 removes client use.
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.
- Middleware: `requirePlatformAdmin` (new name) in `server/middleware/auth.js`; `requireAdmin` kept as an alias until 425 replaces all uses.
- Login with no businessId → 403 `{ error: 'NO_BUSINESS' }`, client key `no_business` → "החשבון לא משויך לעסק – פנה לתמיכה". Removed staff → 403 `{ error: 'USER_REMOVED' }`.

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

**C-STAGES (442; consumed by 443, 446, 447, 448)**
- Stage keys: `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `execution`, `post_production`, `finished`, `not_closed`. Order array `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`.
- Event fields: `stage`, `stageHistory: { stage, at, by, byName, reason?, reasonText? }[]`, `closedAt?` (first transition to deposit_paid or later; never changes), `notClosedAt?`, `notClosedReason?: 'price' | 'date_taken' | 'no_reply' | 'other'`, `notClosedText?`, `legacy?: boolean` ("ישן"), `notes: { _id, text /* ≤ 2000 */, at, by, byName, editedAt? }[]`, `clientName?`, `clientPhone?`, `deposit?: { amount?, date? }`.
- "Closed" = `closedAt` set. Active = stage not in {finished, not_closed}.
- Dedicated router `server/routes/events.js` at `/api/v1/events`: `PUT /:id/stage` `{ stage, reason?, reasonText? }`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId`, (446) `PUT /:id/closing`, `POST /:id/finish`, `POST /:id/reopen`, `POST /:id/refresh-plan`. Stage history/notes are written only by the server (generic PUT strips them).

**C-PRICING (445; consumed by 446, 447)**
- Event fields: `pricePerGuest?: number`, `extraCosts?: { amount: number, note?: string }`, `targetsOverride?: { profitTargetPct?: number, safetyMarginPct?: number }`.
- `src/app/core/engine/event-pricing.ts` `computeEventPricing(plan: EventPlan, event, settings) → { foodCost, extraCost, totalCost, revenue, revenueIsComputed, profit, profitPct | null, profitPerGuest, minPricePerGuest, safetyMarginAmount, meetsTarget, shortfallPerGuest, partial }`.
- On every save the client stores `pricing: { foodCost, revenue, profit, profitPct, partial, computedAt }` on the event (server dashboards read this, never run the engine).

**C-SNAPSHOT (446; consumed by 447)**
- `planSnapshot?: { at, frozenAt?, suppliers: { supplierId: string | null, name, plannedCost }[], extraCosts, plannedRevenue, plannedProfit, plannedProfitPct }`
- `closing?: { suppliers: { supplierId: string | null, name, planned, actualPaid?, arrived: boolean, hasInvoice: boolean, photos: string[] }[], actualExtraCosts?, actualRevenue?, finishedAt?, finishedBy? }`
- Pricing accuracy per finished event = actual profit % − planned profit % (points).

**C-USAGE (430; consumed by 428 last-login, 447, 448)**
- Collection `usageDays`: `{ _id: `${userId}:${date}`, userId, businessId, date: 'YYYY-MM-DD' /* Asia/Jerusalem */, firstAt, lastAt, writeCount }`. Written by `server/middleware/usage.js` `recordUsage` after auth; writes = POST/PUT/PATCH/DELETE on business data excluding /auth/*; reads update at most once per minute per user (in-memory throttle). No TTL. Index `{ businessId: 1, date: 1 }`.
- "Last login" = latest `lastAt` for the user.

**Cross-cutting (from brief Part 2, re-verified)**: new UI in child components under `pages/<page>/components/<feature>/`; frozen files net ≤ 0 lines; INV-4 every new field in Zod `shared/schemas/` + server validates (200-char name cap); INV-6 AI only via `server/routes/ai.js`; INV-3 re-key/cascade on server; migrations dry-run first, Atlas only after Dandan's go, `Isolated DB: yes`, idempotent, rollback note; rounding only from `rounding.ts`; every code plan has `[auto] node scripts/log-query.mjs --since=plan-start --level=error → no entries`; chef-side user stories; new dictionary keys listed; RTL logical CSS; Lucide icons registered in `src/app/app.config.ts`; every UI plan has `[human]` Done-when on mobile and desktop; every new screen is a lazy-loaded route or component (plan 419 bundle budget). Dependencies go in `## Execution Notes` ("Depends on: plan NNN merged") + `## Execution Mode`, never `## Prerequisites`.

## Contract extensions (drafting, accepted by the Planner 2026-10-20)

These extend the contracts above; each plan file carries its own exact wording.

- **424/425 transition:** `businessId`/`createdBy` optional in `baseDocShape` in 424; 425 makes them required and `userId` optional. Token keeps `role` until 426; `isPlatformAdmin` in the token = `user.isPlatformAdmin === true || user.role === 'admin'` until 425 drops the fallback. Signup creates the business already in 424 (default name "העסק של <name>"); 426 makes `businessName` required (errors `BUSINESS_NAME_REQUIRED`, `BUSINESS_NAME_TOO_LONG`).
- **C-USER:** refresh with no business / removed → **401** `{ error: 'NO_BUSINESS' | 'USER_REMOVED' }` + cookie cleared; login → 403. Client key `user_removed` → «המשתמש הוסר מהעסק – פנה לבעל העסק». Staff placeholder email `${_id}@staff.foodvibe.invalid` (428).
- **C-BUSINESS:** schema exports `businessSettingsSchema`, `BUSINESS_SETTINGS_DEFAULTS` (429), `baselineInputSchema`, `businessBaselineSchema` (431). Router adds `GET /setup-status` (owner, 431) and `GET /team` rows `{ _id, name, businessRole, createdAt, lastActiveAt: number | null }` (428 returns null, 430 fills). Settings tabs registry `src/app/pages/settings/settings-tabs.ts` `SETTINGS_TABS: { key, labelKey, icon, ownerOnly }[]` (428; 429/431 append).
- **C-PERM:** reasons `MASTER_ONLY`, `OTHER_BUSINESS`, `NO_ROLE`; Trash restore counts as `delete`; `VERSION_HISTORY`, `activity_log`, `DICTIONARY_OVERRIDES` exempt from the per-creator rule; locked taxonomy kinds `['eventType','menuType','station']`; staff PUT changing a money field → 403, staff POST money fields stripped; `no_permission` dictionary key added by 428. Finish/reopen/refresh-plan (446) and dashboard money split (447) use `editMoney`.
- **Admin delete (425):** deleting an owner deletes the whole business; deleting staff deletes only that user; own business can't be deleted.
- **C-USAGE:** writes = successful (status < 400) POST/PUT/PATCH/DELETE excluding `/api/v1/auth`, `/log`, `/ai`, `/admin`, `/data/VERSION_HISTORY`, `/data/activity_log`. `usage.js` also exports `jerusalemDate`, `NOT_BUSINESS_WRITE_PREFIXES`; `server/utils/usage-stats.js` exports `lastActiveByUser`, `activeDays`, `activeDaysByBusiness`, `weekBounds`.
- **New endpoints:** `POST /api/v1/ai/parse-price-list` + `server/routes/product-import.js` at `/api/v1/product-import` (432); `GET /api/v1/admin/businesses`, `PUT /api/v1/admin/businesses/:id/internal`, `GET /api/v1/admin/businesses/:id/performance` (448); `GET /api/v1/stats/business?period=30|90|all` (447, response shape reused by 448).
- **C-ENGINE (433):** `EngineError.kind` adds `'no_conversion' | 'no_ingredients'`; `PrepLine` adds `category: string`, `source: 'prep' | 'mise'`, `note?: string` (`station` = serving dish's `defaultStation` or `''`); `UnitConversion = { getConversion(key): number, has(key): boolean }`; `rounding.ts` adds `roundMoney(n)`, `formatDecimal1(n)` (447), and `formatQty` returns `{ qty, unit }`; `EventPlanService.costFor(recipeId, portions): { cost, partial }`; `portionsFromDerived` lives in `portions-from-derived.ts`. 423's `optionRateInBase` third param widened to `Pick<UnitRegistryService, 'getConversion'>`.
- **Supplier orders (435):** `supplier-orders.util.ts` exports `buildSupplierOrders(plan, productsById, suppliersById) → { cards: SupplierOrderCard[], review: RawLine[] }`, `buildOrderMessage`, `buildAllOrdersMessage`, `toWhatsAppPhone`; `SupplierOrderCard = { supplierId: string | null, name, phone: string | null, lines: RawLine[], total, partial }`.
- **Stations (436):** taxonomy kind `station`, keys = Hebrew names; `TERM_REFERENCES.station = { recipes: ['defaultStation'], dishes: ['defaultStation'] }`; defaults are master terms (owner adds own next to them); dictionary key `general_group` "כללי".
- **C-PORTIONS (440):** `portions.ts` also exports `defaultCoefficient(event)`, `isValidCoefficient(x)`, `formatCoefficient(x)`, type `ItemPortions`; weight/volume preps not rounded. Seeded event types keyed by Hebrew names; new serving key `chef_plated_front`. 0007 also unsets stored course colors.
- **C-STAGES (442):** `event-stage.ts` also exports `NOT_CLOSED_REASONS`, `NOT_CLOSED_FROM`, `CLOSED_FROM_INDEX`, `NOTE_MAX_LENGTH`, `EVENT_SERVER_FIELDS`; `stage` optional in schema (server always sets it; POST → `inquiry`); error codes `DATE_REQUIRED`, `REASON_REQUIRED`, `NOT_CLOSED_FROM_STAGE`, `USE_FINISH`, `EVENT_FINISHED`, `NOTE_EMPTY`, `NOTE_TOO_LONG`. `PUT /:id/stage` accepts optional `planSnapshot` (446). Reopen removes `closing.finishedAt/finishedBy`; finished = `stage === 'finished'` with `closing.finishedAt`. Library URL: `?stage=<key|active|all>`, `?new=inquiry` (443).
- **C-PRICING (445):** `computeEventPricing` takes a `PricingEvent` (`toPricingEvent(event, portionsByItem)`) and also returns `pricePerGuest`. `MenuEventSaveService.prepareForSave(event, plan, editingId)` stores the `pricing` cache.

## Contract extensions (run)

Workers append here: `- plan NNN · <extension> · why`.
- plan 424 · `tombstoneSchema` also accepts optional `createdBy` (next to `businessId`) · migration 0006 stamps purged stubs like any doc and the strict schema rejected them.
- plan 423 · `UnitRegistryService`: `UnitCreatorContext.forProduct?: { name, baseUnit }`, `productUnitAdded$` (`ProductUnitAdded { key, amount, basis }`), `awaitProductUnitAdded()`, `creatorForProduct_`; `optionRateInBase(product, opt, registry)` in `core/utils/purchase-option-rate.util.ts` · product-mode unit window asks the amount for that product; every reader of `purchaseOptions[].conversionRate` (433 engine, 438 form) must go through `optionRateInBase`.
- plan 433 · `MissingItem.productId` is also set on `deleted` (the dangling reference id) and `unpriced` entries; `src/app/core/engine/units.ts` exports `normalizeUnit`, `unitFamily`, `toBase`, `toYield`; `src/app/core/engine/testing/event-plan.fixture.ts` exports `buildFixtureInput`, `makeEvent`, `makeInput`, `makeProduct`, `makeRecipe`, `productIng`, `recipeIng`, `FIXTURE_IDS`, `FIXTURE_SUPPLIERS`, `FIXTURE_UNITS` for later specs · consumers (434, 435, 437, 444) need the product id and the shared fixture.
- plan 440 · `portions.ts` also exports `defaultCoefficient(event)` and type `ItemPortions`; `taxonomy-term.schema.ts` exports `coefficientSchema`; client `menu-event.model.ts` exports `TypeSnapshot` · plan 441 and the schema tests reuse them instead of re-declaring the rule.
- plan 436 · taxonomy kind `station` (plain, keys are the Hebrew names, `TERM_REFERENCES.station = { recipes: ['defaultStation'], dishes: ['defaultStation'] }`); `seed-master.js` exports `ensureDefaultStations()`; client `StationRegistryService` (`stations_`, `addStation`, `renameStation`, `removeStation`, `hasStation`, `canEdit`); form control `default_station` · plan 437 groups the by-station checklist by `Recipe.defaultStation` (`''` = "כללי").
- plan 441 · `EventPlanService.planFor` takes `portionsByItem` from `computePortions` and `portionsFromDerived` is deleted (the fixture exports `derivedPortionsByItem` instead); `EventTypeSnapshotService.snapshotFor(kind, key, stored?)` (`core/services`); page-provided `MenuPortionsService` (`pages/menu-intelligence/services`: `bind`, `remember`, `snapshots`, `byItem`, `at`); dish-row input `portionInfo`; form control `coefficient_override`; `MenuEventTypeService.addEventType(name, coefficient = 1)` now returns `Promise<boolean>`; `AiMenuDishDraft.predictedTakeRate` is optional/deprecated · plans 442-446 read portions through these, never through take rate.
- plan 442 · `server/utils/event-stage.js` exports `applyStageChange(event, { stage, reason?, reasonText? }, actor { userId, name }, now)` and `newNote(text, actor, now, id)`; `shared/schemas/entities/event-stage.ts` also exports types `EventStage`, `NotClosedReason`; client `menu-event.model.ts` exports `EventStage`, `NotClosedReason`, `EventStageEntry`, `EventNote` and the `MenuEvent` fields of C-STAGES · `/api/v1/events` stage/notes routes answer with the whole updated event (stage: 200, add note: 201, edit/delete note: 200); error bodies are `{ error: '<CODE>' }`, CODEs: `BAD_STAGE`, `EVENT_FINISHED` (409), `USE_FINISH`, `NOT_CLOSED_FROM_STAGE`, `REASON_REQUIRED`, `DATE_REQUIRED`, `NOTE_EMPTY`, `NOTE_TOO_LONG` · plans 443 and 446 mount the UI / extra routes on these; a note edited or deleted by a non-author is 403 `FORBIDDEN` / `no_permission`.
