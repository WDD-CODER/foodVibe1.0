# MVP gap audit — technical findings (2026-10-19)

Snapshot: origin/main `8a3980b` (2026-10-19 22:57 +0300). Read-only audit, verified in code.
Product specs live in Drive (`foodvibe/01 מוצר/אפיון – NN.N – …`); this file holds the code facts the Planner needs to write Plan Contracts. Re-verify against live main before planning (Reality Check).

## Tenancy, users, permissions (feeds 01.1, 01.2, 07.3)

- Live model is **per-user full clone of `__master__`**: `server/routes/auth.js` `POST /signup` → `cloneMasterDataToUser(_id)` (`server/services/clone-master.js`); login/refresh/guest → `syncMasterToUser` (`server/services/sync-master.js`, 4 rules, user-modified wins), gated by `server/services/master-version.js` (`MASTER_META`).
- Taxonomy is the exception: read as master ∪ own via `readOwner()` in `server/routes/generic.js` (~L86-93, `termWriteOwner()`).
- Plan 321: phases 0–3 done; **Phase 4 and Phase 5 (shared master + overrides) DROPPED 2026-10-06**; Phase 6 → plan 407 (open); 7–8 dropped. Plan header still says `Status: done`. No `baseId`/`baseVersion`/`server/repositories/` exist.
- `server/utils/can-write.js` and `src/app/core/services/permission.service.ts` **do not exist** (plan 386 retired 2026-10-17). `docs/brain/invariants.md` INV-1/INV-2 sources are stale (cite can-write.js and "ADR 0019", which is the design-port ADR). `server/test/invariants.test.js` INV-2 has only `it.todo`.
- User model `server/models/user.model.js`: `role` enum `['admin','user']`, no business/team field, no `createdAt`/last-login. Admin = per-user role; signup always `user`; admin only via dev `POST /auth/guest` (localhost) or `server/scripts/cleanup-legacy-data.js --promote-admin`.
- JWT access `{userId,name,role}` 15m; refresh `{userId}` 30d cookie `fv_refresh`. Middleware `server/middleware/auth.js`: `verifyToken`, `optionalToken` (anonymous reads `__master__`), `requireAdmin`.
- Scoping: single owner field `userId` on every doc (`shared/schemas/base.schema.ts`); ~82 `userId` occurrences in `generic.js`, no central ownership helper. All indexes in `server/db.js` (L26-78) lead with `userId`; taxonomy unique `{kind,key,userId}`.
- Cloneable collections (`server/constants/collections.js`): suppliers, products, recipes, dishes, equipment, venues, menuEvents. Plus TRASH_*, VERSION_HISTORY, activity_log, taxonomyTerms, DICTIONARY_OVERRIDES (`__global__`).
- Admin-only routes: push-to-master (generic.js ~L650), delete-from-master (~L756), purge-ingredient-everywhere (~L812), shared term creation (~L362), global dictionary (~L419). Client admin check: `UserService.isAdmin_` (`user.service.ts` L36), ~18 non-spec references.
- `server/routes/admin.js` (38 lines): `GET /users`, `DELETE /users/:userId` (blocks self, `deleteMany({userId})` across ALL_USER_ENTITY_TYPES). No create/role/invite. No stats endpoints.
- Prices live on `products.sources[].price` and `purchaseOptions[].priceOverride` (`shared/schemas/entities/product.schema.ts`); no field-level permission. `product-form.component.ts` is growth-frozen.
- **01.1 sizing (minimal = business as clone unit):** new business schema + `businessId` in `baseDocShape`; user business role; JWT payload; signup creates business; re-key clone/sync per business; rewrite every `userId` filter in generic.js (L, leak risk); indexes; split platform admin vs business owner; Atlas backfill migration (~20 collections incl. TRASH/VERSION_HISTORY/activity_log); INV-1/INV-2 change + superseding ADR; rewrite userId-keyed server tests. Est. 3–4 Worker plans.
- **Collision:** plan 407 (`plans/407-one-soft-delete-model-and-user-prefs.plan.md`) touches generic.js, collections.js, shared/schemas, adds `deletedBy`/`userPrefs` + migration 0005 — sequence after 01.1 or redesign business-aware.

## Menu Intelligence: portions, pricing, lists (feeds 03.1–03.3, 04.1–04.3)

Key files: `src/app/pages/menu-intelligence/menu-intelligence.page.ts` (1297 lines), `components/menu-dish-row/*`, `components/menu-export-sheet/*`, `src/app/core/services/menu-intelligence.service.ts`, `menu-export.service.ts` (897 lines), `scaling.service.ts`, `recipe-cost.service.ts`, `src/app/core/utils/product-source.util.ts`, `shared/schemas/entities/menu-event.schema.ts`, `src/app/core/models/menu-event.model.ts`.

- `menuEventSchema` (strictObject): name, eventType, eventDate?, servingType, guestCount, piecesPerPerson?, sections[].items[]{recipeId, recipeType ('dish'|'preparation'), predictedTakeRate, derivedPortions, sellPrice?, foodCostOverride?, servingPortions?}, financialTargets?, performanceTags?, cuisineTags?, createdFromTemplateId?, logistics?. **No status/stage/notes/customer/actuals.**
- Event types = taxonomy kind `eventType` (key only); serving types = kind `menuType` (`fields` only, `metadata-registry.service.ts` L52-55). **No coefficients anywhere.** Serving keys seen: `cocktail_passed`, `buffet_family`, plated.
- `derivePortions` (`menu-intelligence.service.ts` L19-38): non-cocktail = `guestCount × servingPortions` (take rate ignored); `cocktail_passed` = `round(guests × piecesPerPerson × takeRate)`. `buildEventFromForm` (page.ts ~L1168-1217) never sets `piecesPerPerson` → **cocktail derivedPortions = 0**; UI cost uses `getPiecesPerPerson() ?? 1` (page.ts ~L696) → footer and export disagree. Spec locks this (`menu-intelligence.service.spec.ts` ~L55).
- Footer computeds (page.ts L192-238, html L313-338): `eventCost_`, `foodCostPct_`, `totalRevenue_` (= Σ sellPrice × sp × guests), `costPerGuest_`, `profitPerGuest_`. `computeEventRevenue` (service) uses derivedPortions → differs for cocktail. Hard-coded 33% warning (html L321); `financialTargets` hard-coded `{30, 0}` on save (page.ts ~L1200-1213). No target profit, extra costs, safety margin.
- Missing price → `getEffectivePrice` (min supplier price → `buy_price_global_` → 0) → `computeIngredientCost` (`recipe-cost.service.ts` L256-288) silently 0; deleted refs also 0. `product-validation.util.ts` `getProductValidationStatus()` lumps price/category/supplier into `incomplete`.
- **Shopping list** — duplicated 3×: `exportMenuShoppingList` (L109-181), `getMenuShoppingListPreviewPayload` (L430-495), `addMenuShoppingListSheetToWorkbook` (L827-896). Ranked bugs:
  1. `ScalingService.getScaledIngredients` (L44-78) is flat; `type:'recipe'` rows land under `'הכנות'` (L141-144, 462-465, 857-860) — **sub-recipe ingredients never reach the list**. Fix: recursive expansion like `computeIngredientCost` L279-285 (amount in sub-recipe yield unit ÷ yieldAmount), with cycle guard.
  2. Aggregation key `name + unit` (L115, 436, 836) — no unit normalization; `unitPrice = cost/amount` (L161, 477, 879) meaningless when mixed.
  3. Waste: `product.yieldFactor` only in cost (`recipe-cost.service.ts` L276), not quantity.
  4. Menu item of type `preparation`: `factor = portions / yieldAmount` where prep yield is grams (`recipe-form.service.ts` L264-265) → nonsense factor.
  5. Cocktail 0 (above).
  6. Coefficients absent; `predictedTakeRate` (default 0.4, page.ts L675) shown but unused outside cocktail.
  7. Yield division inconsistent: cost uses `Math.max(1, yieldAmount)` (service L65, page L713, dish-row L96, export L642); lists use `yieldAmount || 1`.
  8. Aggregates by display name, not `referenceId`; unlinked `nameSnapshot` merges with linked same-name.
  9. Station grouping broken: `recipe-form.service.ts` L284 always saves `defaultStation: ''`; `recipe.defaultStation ?? 'כללי'` (export L270, 573, 763) doesn't catch ''. No station taxonomy kind exists.
  10. Rounding drift: Excel line total formula on rounded qty × rounded unit price (L168, 886) vs preview `round(cost)` (L478).
  11. `loadEvent` loads `servingPortions ?? 0` (page L1114), `buildEventFromForm` coerces `|| 1` (L1179).
- No supplier grouping (`getSupplierIds` in `product-source.util.ts` L16 unused). No clipboard/share/WhatsApp anywhere (grep `clipboard|navigator.share|whatsapp|wa.me`: none). Output: xlsx via ExcelJS, paper-style preview (`src/app/shared/export-preview/`), `window.print()`.
- Checklist preview (`getMenuChecklistPreviewPayload` L498-608): `by_category`/`by_station` flatten all groups into **one** section "accumulated" — group names are not printed (by_category rows have no group column). Print CSS in `src/styles.scss` L2119+ uses visibility hack.
- Tests: `export.service.spec.ts` L107-197 mocks ScalingService (factor only); no tests of aggregated quantities/units/nested preps.

## Events lifecycle, post-production, dashboard, usage (feeds 07.x, 08.1, 09.1)

- Trash for events exists (`TRASH_MENU_EVENTS`, `menu-event-data.service.ts` L9) but Trash page lists only dishes/recipes/products.
- `menu-library-list.component.ts`: filters eventType/servingStyle/date, sorts name/date/food_cost/guest_count.
- Supplier schema (`supplier.schema.ts`): name, contactPerson, phone, phone2, deliveryDays, minOrderMov, leadTimeDays, logo — no transactions.
- Image upload: `src/app/core/services/cloudinary.service.ts` (unsigned upload, cloud `dsxi4o2gb`, preset `foodvibe`), used in `recipe-header.component.ts` and `venue-form.component.ts`; `core/utils/downscale-image.util.ts`.
- Dashboard (`src/app/pages/dashboard/components/dashboard-overview/*`): 4 KPI cards (products, recipes+dishes, low stock, unapproved); **sparklines are hard-coded SVG paths**; "recent activity" from `activity-log.service.ts` = **localStorage only** (key `activity_log`, 100 entries). Design port is merged (`_claude-data/design-migration/screens/_registry.md` row 1 done).
- Logging: `server/services/log-sink.js` → `app_logs`, **90-day TTL**; info persisted only if `LOG_PERSIST_INFO=1` (not set in `render.yaml`); client `LoggingService.sendToServer` drops info in production. Not usable for usage metrics → dedicated daily-activity collection recommended.

## Recipes, cook view, onboarding (feeds 02.1, 04.3, 06.x)

- Recipe save requires only name, yield amount/unit, ≥1 ingredient with amount (`recipe-header.component.ts` ~L165-175, `recipe-form.service.ts` ~L44); unlinked rows allowed with confirm (`recipe-builder.page.ts` ~L851).
- Product form required: name, baseUnit, `buy_price_global_`, categories (min 1), yieldFactor (`product-form.component.ts` ~L375-388).
- `POST /api/v1/ai/parse-text` (`server/routes/ai.js` ~L400, `TEXT_IMPORT_SYSTEM_PROMPT`) + `GeminiService.parseText()` exist, **no caller** → backend for "paste recipe/ingredients".
- AI recipe flow: FAB sparkles (`recipe-book-list.component.ts` → `HeroFabService`), modal text/image/URL, editable draft (`ai-draft-editor.component.html`), `AiRecipeDraftService` → `/recipe-builder`, `RecipeAiFlowService.applyPendingDraft()`. Unmatched ingredient → `.unlinked-row` (dashed primary, not red), badge creates stub product + Quick-Edit. Leave guard generic (`core/guards/pending-changes.guard.ts`).
- AI quota: `GET /api/v1/ai/usage`, `DEFAULT_MODELS` in `server/services/gemini-client.js` ~L50; client `.ai-usage-bar` only inside AI modals.
- Course color: `taxonomy-term.schema.ts` L109 still requires `color` for `course`; client fakes `COURSE_NEUTRAL_COLOR` (`metadata-registry.service.ts` L15-16); `seed-master.js` ~L106 seeds palette colors.
- Cook view Concept D exists (`cook-view.page.html` L542-812, `.cv-act`/`.cv-go`, `cook-timer.service.ts`); timer icon grey→green state not implemented.
- Onboarding: no baseline, no setup checklist. `seed-master.js` reads `public/assets/data/demo-*.json` — **only `demoProducts.json` present**. No Demo Data section in metadata-manager anymore (stale ref `recipe-data.service.ts` L52). No bulk import UI (exceljs export-only). PWA present (`public/manifest.webmanifest` name "foodVibe1.0", `ngsw-config.json`, `provideServiceWorker` prod-only).

## Planned but not started (relevant)

- Venues plans 372–374 (`plans/design/37{2,3,4}-*.plan.md`) — out of MVP.
- Plan 407 soft-delete/userPrefs — collides with 01.1.
