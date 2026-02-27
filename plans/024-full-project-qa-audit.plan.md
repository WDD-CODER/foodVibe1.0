# Full Project QA Audit Report — foodVibe1.0

This report summarizes findings from a full pass over the project from the perspectives of a senior QA engineer and professional developer. It is **read-only**: no code changes are proposed until you decide what to implement.

---

## 1. Architecture and structure

- **Stack:** Angular 19 (standalone), lazy-loaded pages, signals + RxJS, localStorage-backed persistence ([`StorageService`](src/app/core/services/async-storage.service.ts)), no backend API.
- **Routing:** [app.routes.ts](src/app/app.routes.ts) uses resolvers (`recipeResolver`, `productResolver`) and one guard (`pendingChangesGuard`) for unsaved changes.
- **State:** [KitchenStateService](src/app/core/services/kitchen-state.service.ts) is the main facade; data services (Product, Recipe, Dish, Supplier) use signals and `StorageService`.
- **Gaps:** No environment-based config (e.g. `environment.ts`); asset paths are hardcoded. When a real API is added, base URL and secrets should be externalized.

---

## 2. Error handling and robustness

### 2.1 Resolver / navigation failures — no user feedback

- **Recipe not found:** [recipe.resolver.ts](src/app/core/resolvers/recipe.resolver.ts) catches missing recipe/dish, redirects to `/recipe-builder`, returns `null`. User gets **no toast or message** that the recipe was not found.
- **Product not found:** [product.resolver.ts](src/app/core/resolvers/product.resolver.ts) redirects to `/inventory/list` and logs `console.warn` only. **No user-visible "product not found".**

**Recommendation:** After redirect, set a one-time message (e.g. via `UserMsgService`) such as "המתכון לא נמצא" / "המוצר לא נמצא".

### 2.2 Subscribe error handlers — errors not surfaced

- [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts): `deleteRecipe().subscribe({ next: () => {}, error: () => {} })` — errors ignored.
- [cook-view](src/app/pages/cook-view/cook-view.page.ts): `saveRecipe().subscribe(..., error: () => {})` — no user message.
- [recipe-builder](src/app/pages/recipe-builder/recipe-builder.page.ts): on save error only `isSaving_.set(false)`; `KitchenStateService.saveRecipe` already uses `catchError` and `onSetErrorMsg`, so the user does see the message, but the component could still show a loading/error state.
- [inventory-product-list](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts): `deleteProduct` logs to console; `saveProduct` subscribe has empty `error: () => {}`.
- [product-form](src/app/pages/inventory/components/product-form/product-form.component.ts): save error only resets `isSubmitted`; duplicate-name error is shown by `KitchenStateService` via `userMsgService`.

**Recommendation:** Either rely on service-level `catchError` + `onSetErrorMsg` and document it, or ensure every subscribe that can fail shows a user message and/or loading/error state in the template.

### 2.3 Async load without try/catch — loading can get stuck

- [trash.page.ts](src/app/pages/trash/trash.page.ts): `loadTrash()` is awaited in `ngOnInit` and `refresh()` with **no try/catch**. If it throws, `loading.set(false)` may never run → endless loading; template has no error block.
- [version-history-panel](src/app/shared/version-history-panel/version-history-panel.component.ts): `loadVersions()` uses try/finally (only sets `loading.set(false)` in finally); **errors are not caught or shown**; template has no error state.

**Recommendation:** Wrap async load in try/catch, set loading false and an error flag/signal, and show an error state in the template (e.g. retry or message).

### 2.4 Translation and bootstrap

- [translation.service.ts](src/app/core/services/translation.service.ts): `loadGlobalDictionary()` catch only `console.error`; no user feedback. If the dictionary fails to load, app still boots (APP_INITIALIZER doesn't rethrow) but translations may be missing.

**Recommendation:** Consider a user-visible warning or fallback message when dictionary load fails.

### 2.5 JSON.parse and localStorage

- **Unprotected JSON.parse:** Used in [async-storage.service.ts](src/app/core/services/async-storage.service.ts) (line 12), [activity-log.service.ts](src/app/core/services/activity-log.service.ts), [util.service.ts](src/app/core/services/util.service.ts), [translation.service.ts](src/app/core/services/translation.service.ts). If localStorage/sessionStorage is corrupted or manually edited, **JSON.parse can throw** and break the flow (e.g. query/get failing).

**Recommendation:** Wrap in try/catch and either return a safe default (e.g. `[]` or `{}`) or show a clear error and optionally clear the bad key.

---

## 3. Memory leaks and subscriptions

- **[product-form.component.ts](src/app/pages/inventory/components/product-form/product-form.component.ts):** Multiple long-lived subscriptions with **no unsubscribe or takeUntilDestroyed**: `route.data`, `percentCtrl?.valueChanges`, `yieldCtrl?.valueChanges`, `group.get('unit_symbol_')?.valueChanges`, `group.get('conversion_rate_')?.valueChanges`. If the user navigates away and back repeatedly, subscriptions accumulate.
- **[user-msg.service.ts](src/app/core/services/user-msg.service.ts):** `this._msgQueueTimeOut$.pipe(takeUntilDestroyed()).subscribe()` in the constructor. Service is `providedIn: 'root'`. **takeUntilDestroyed() without an injection context (e.g. DestroyRef) does not complete when a component is destroyed**; it's intended for components. For a root service the subscription never tears down (same as app lifetime), but the pattern is incorrect and could cause confusion or issues if the service were ever provided in a different scope.

**Recommendation:** In product-form, use `DestroyRef` + `takeUntilDestroyed(this.destroyRef)` (or a single Subject + ngOnDestroy) for all long-lived subscriptions. In UserMsgService, either keep the stream finite (e.g. take(1) per message) or use a different teardown strategy and document it.

---

## 4. Loading and error states in the UI

- **Trash and version-history-panel:** Show loading state but **no error state** in the template; if load fails, user sees loading forever or empty list with no explanation.
- **Cook-view, recipe-builder, recipe-book-list, product-form, inventory-product-list, metadata-manager:** No loading or error UI for main async operations (save, delete, load). Recipe-builder sets `isSaving_` but it's not clearly used in the template for a spinner/disabled state; cook-view save has no loading indicator.

**Recommendation:** Add error branches (and where relevant loading indicators) for: trash load, version history load, recipe/product save and delete, and any other critical async actions.

---

## 5. Security and validation

- **Auth:** [UserService](src/app/core/services/user.service.ts) and [UtilService](src/app/core/services/util.service.ts) implement login/signup/session via localStorage/sessionStorage, but **no route is protected**; there are no auth guards. All routes are effectively public.
- **Duplicate product name:** [duplicateNameValidator](src/app/core/validators/item.validators.ts) exists and is tested but **is not used in product-form**. Duplicate is enforced only at save time in `KitchenStateService`; user gets no inline or pre-submit warning.
- **Add-item modal:** Saves value to the modal service with no validation/sanitization in the component (acceptable if the value is only used in controlled contexts).
- **XSS:** No `innerHTML` or `bypassSecurityTrust*` usage found; translation pipe returns plain text (Angular escapes). No obvious XSS from the code reviewed.
- **Secrets:** No hardcoded API keys in app code; when adding a backend, use environment config and avoid committing secrets.

---

## 6. UX and user-journey logic

### 6.1 Resolvers and "not found"

- Invalid or deleted recipe id → redirect to recipe-builder with **no message** (see 2.1).
- Invalid or deleted product id → redirect to inventory list with **no message** (see 2.1).

### 6.2 Pending changes and data loss

- [pending-changes.guard.ts](src/app/core/guards/pending-changes.guard.ts) runs on **in-app navigation** (including browser back when the router handles it). **Tab close and page refresh do not run canDeactivate**; there is no `beforeunload` handler. User can lose work by closing the tab or refreshing.

**Recommendation:** Consider `beforeunload` (or equivalent) when there are unsaved changes, with a short generic message (browsers often ignore custom text).

### 6.3 Recipe builder

- Workflow (steps/prep) is **not required**; save can succeed with no steps. If that's intentional, consider documenting; otherwise add validation.
- After save, redirect to `/recipe-builder`; if navigation failed, user could see a blank form with data already saved (edge case).

### 6.4 Version history restore

- Restore **replaces** the current entity with the snapshot (no merge). If the same recipe is open in recipe-builder with **unsaved edits**, the form still shows the old state; list/cook-view show the restored version. **Stale form state** until user navigates away and back or reloads.

### 6.5 Demo loader

- One failed HTTP request → no state change, error toast. If JSON is partial or invalid but 200, all four keys can be replaced and services reloaded with bad/empty data; **no rollback** if a later step (e.g. reload) fails.

---

## 7. Accessibility

- **Recipe header image:** [recipe-header.component.html](src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html) — `<img [src]="...">` has **no `alt`**.
- **Modals (confirm, unit-creator, add-item, translation-key, global-specific, restore-choice):** No focus trap (e.g. CDK `CdkTrapFocus`), **no Escape to close**, and **no focus restore** to trigger element on close. Focus can leave the modal; keyboard-only users may get stuck.
- **Missing or weak labels:** Cook-view quantity/amount inputs; recipe-header name and chip inputs; unit-creator, add-item, translation-key modal inputs; ingredient-search and preparation-search; metadata-manager new-item and unit rate inputs — no associated `<label>`/`for` or `aria-label`.
- **Positive:** Many list/table and button elements use `aria-label`, `role`, and `tabindex`; some keyboard handling (Enter/Space, Escape in dropdowns); focus-by-row and select-on-focus directives.

**Recommendation:** Add `alt` to the recipe image; add focus trap, Escape to close, and focus restore for modals; add labels or `aria-label` for all form inputs used in the flows above.

---

## 8. Testing

### 8.1 Unit tests

- **No spec:** recipe.resolver, cook-view page, recipe-data.service, recipe-cost.service, confirm-modal.service, user-msg.service, cook-view-state.service, scaling.service, util.service, supplier-data.service, dish-data.service, trash.service, version-history.service, demo-loader.service, add-supplier-flow.service, restore-choice-modal.service, add-item-modal.service, translation-key-modal.service, global-specific-modal.service; version-history-panel component; focus-by-row directive.
- **Placeholder-only (single "should create"):** recipe-builder.page, recipe-book.page, translation.service, ingredient-search, recipe-workflow, recipe-ingredients-table, metadata-manager.page.
- **Stronger coverage:** pending-changes.guard, kitchen-state.service, recipe-header, product-form, async-storage, unit-registry, translation-pipe, item.validators.

### 8.2 E2E (Playwright)

- **Covered:** Product CRUD (add, edit, delete); recipe creation (product → recipe with ingredient, save); recipe edit (name change, save).
- **Not covered:** Cook view (open recipe, scale, edit, save); dashboard; metadata-manager; version history (restore replace/add-as-new); recipe delete with confirm; pending-changes guard (navigate away with dirty form); recipe-book and inventory filters/search; modal flows (confirm, restore-choice, global-specific).

---

## 9. Code quality and maintainability

### 9.1 File length (project rule: keep files under 300 lines)

- [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts) — **614 lines**
- [product-form.component.ts](src/app/pages/inventory/components/product-form/product-form.component.ts) — **606 lines**
- [cook-view.page.ts](src/app/pages/cook-view/cook-view.page.ts) — **404 lines**
- [kitchen-state.service.ts](src/app/core/services/kitchen-state.service.ts) — **378 lines**
- [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts) — **341 lines**

**Recommendation:** Refactor into smaller components or extract logic into services/helpers to improve readability and testing.

### 9.2 Naming typo

- **SINGED_USERS** (should be SIGNED_USERS) in [user.service.ts](src/app/core/services/user.service.ts) and [util.service.ts](src/app/core/services/util.service.ts). Used consistently as the storage key, so behavior is correct but the name is wrong.

### 9.3 Non-null assertions

- [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts): `this.recipeForm_.get('serving_portions')!.valueChanges` and `get('recipe_type')!.valueChanges` — if the form or controls are not yet built, this can throw.
- [version-history.service.ts](src/app/core/services/version-history.service.ts): `byEntity.get(key)!.push(e)` — safe after `has` check but relies on `!`.

**Recommendation:** Replace with optional chaining and early returns or default values where possible to avoid runtime throws.

---

## 10. Summary table (what could break or is weak)

| Area | Risk / weakness |
|------|------------------|
| Resolvers | User not told when recipe/product not found (redirect only). |
| Error handling | Trash/version-history load can hang or show no error; many subscribes ignore or don't surface errors. |
| JSON.parse | Throws on corrupted localStorage/sessionStorage; no try/catch in several services. |
| Subscriptions | product-form long-lived subscriptions without unsubscribe; UserMsgService takeUntilDestroyed misuse. |
| UI feedback | No loading/error states for save/delete/load in several pages and modals. |
| Auth | Implemented but not wired; no protected routes. |
| Duplicate name | Validator exists but not used in product form; only server-side on submit. |
| Pending changes | Tab close/refresh not guarded; possible data loss. |
| Version restore | Open recipe-builder can show stale form after replace from another screen. |
| A11y | Missing alt on image; modals lack focus trap, Escape, focus restore; several inputs without labels. |
| Tests | Many services and cook-view have no spec; 7 specs are placeholder-only; E2E misses cook view, guards, modals, filters. |
| File size | 5 files exceed 300 lines (up to 614). |
| Typo | SINGED_USERS in user and util services. |

---

## Next steps

- Use this report to prioritize: e.g. resolver feedback, error/loading UI, subscription cleanup, and a11y first; then tests and refactors.
- For each item you want to fix, you can ask for a concrete implementation plan or patch in a follow-up.
