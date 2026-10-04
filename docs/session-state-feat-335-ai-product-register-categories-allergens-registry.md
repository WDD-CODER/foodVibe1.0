# Session state — plan 335 (feat/335-ai-product-register-categories-allergens-registry, slot wt-3)

## Done
- A1 `registerAllergen()` returns `Promise<string | null>` (the resolved key; null on cancel or save error), matching `registerCategory()`. Spec: new key, existing key, cancelled.
- A2 `src/app/pages/inventory/services/ai-draft-metadata.util.ts` — `resolveDraftMetadata(draft, registry)` resolves sequentially (modals one after another), drops nulls, dedupes. Spec: passthrough, Hebrew→key, null dropped, dedupe, missing arrays.
- A3 `ProductAiFlowService.applyDraft()` patches the form with resolved keys; `openAiCreateModal()` resolves before `addProduct()`.
- A4 (P1) modal `addCategory()` / `addAllergen()` resolve through the util; draft chips now render through `translatePipe` (resolved keys show in Hebrew, raw Hebrew passes through).
- A5 `GeminiService` sends `knownCategories` / `knownAllergens` on generate-product and patch-product. `ai.js`: `appendKnownMetadata()` sanitizes (arrays of strings, trimmed, deduped, cap 200, 80 chars each) and appends a "prefer existing keys" section to both system prompts. `validateProductDraft()` unchanged (P1: no server rejection).
- A6 `server/test/ai-known-metadata.test.js` 5/5; plan's targeted specs 10/10; inventory + metadata-manager specs 25/25; `npm run build` exit 0.

## Human test round 1 (2026-10-04)
- AI create "יוגורט עיזים 3%": worked.
- AI patch returned English ("soy") instead of Hebrew. Cause: the known-key list and the current product's categories/allergens were sent as English keys, and the prompt said "return the key exactly as listed". Fix: GeminiService sends Hebrew labels (translate) for both the known lists and the current product; prompt now demands Hebrew; patch-preview diff renders through translate.
- "שגיאה בעדכון המוצר" on save: NOT from this plan. 5 of 5982 local products carry a stray `ingredients: []` key (master clones created 2026-10-01); the v2 strict schema rejects any PUT on them (`Unrecognized key: "ingredients"`). Needs a data cleanup + origin fix outside this plan's scope.

## Human round 2 (2026-10-05)
- Cleaned local Mongo: `$unset ingredients` on the 5 products with `ingredients: []` (2 __master__ + 3 clones); all 5 pass parseV2 now. Atlas not checked (SRV DNS refused from this machine).
- Origin: `pushDocToMasterRecursive()` in server/routes/generic.js (Plan 322 M9, 844b2cc0) always writes `ingredients` on the master copy, also for products/suppliers/equipment; sync-master spreads it to clones. Fix is outside this plan's scope — awaiting approval.
- Registration deferred to save: `resolveDraftMetadata` now resolves only (new `resolveCategoryKey` / `resolveAllergenKey`); `registerDraftMetadata` registers after `addProduct` on AI create. Edit path: product-form save registers categories but NOT allergens — needs product-form approval.
- New request: product-form AI button moves into the hero FAB (like recipe-builder `ai_recipe_edit`) — needs product-form approval.

## Round 2 approvals applied (approved: product-form/**, server/routes/generic.js, server/test/push-to-master.test.js)
- product-form: AI action moved to hero FAB (`ai_product_title_edit`, sparkles; cleared on destroy); header ✨ button removed. Save registers categories + allergens via `registerDraftMetadata` only after a successful save (was: categories registered before save, allergens never).
- generic.js `pushDocToMasterRecursive`: `ingredients` written only for recipes/dishes. 2 new tests (update + first-push paths). Server suite 70/70; build exit 0; client specs 22/22.

## Side fix (approved: scripts/take-plan.mjs)
- `take-plan.mjs` crashed when the plan was already saved as `Status: active` (empty commit). Now skips the commit when nothing is staged.
- Plan file's scope block was missing its ```scope fences, so `scope-check --drift` found no scope; fences added.

## Ship review fix
- `registerDraftMetadata` skips keys already in Metadata (re-registering re-sanitizes "milk solids" → "milk_solids" duplicate). Spec covers it.

## Open
- [human] success criteria validated by the Human via `/ship fast y` (2026-10-05).
- Production Atlas not checked for stray `ingredients` on products (SRV DNS refused locally) — run the same `$unset` (empty arrays only) there if any exist.
- `.claude/be.log` / `.claude/fe.log` are not gitignored → next `take-plan` in this slot refuses on "untracked changes" until they are removed or ignored.
- Plan 336 depends on this plan; it can start once this merges.
