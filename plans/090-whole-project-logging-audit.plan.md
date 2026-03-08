# Whole-project logging audit

**Note:** "Houle" was not found in the repo; this plan treats the request as the **whole** project.

## Current state

- **[LoggingService](src/app/core/services/logging.service.ts)** writes to console and, when `logServerUrl` is set (dev), POSTs to the log server → `logs/app.log`.
- **Already using LoggingService** for errors/warnings: [preparation-registry.service.ts](src/app/core/services/preparation-registry.service.ts), [user.service.ts](src/app/core/services/user.service.ts), [translation.service.ts](src/app/core/services/translation.service.ts), [unit-registry.service.ts](src/app/core/services/unit-registry.service.ts), [metadata-registry.service.ts](src/app/core/services/metadata-registry.service.ts), [auth.guard.ts](src/app/core/guards/auth.guard.ts), [auth.interceptor.ts](src/app/core/interceptors/auth.interceptor.ts), [global-error.handler.ts](src/app/core/services/global-error.handler.ts).

Several data services inject `LoggingService` but do not use it in error paths: product-data, supplier-data, venue-data, recipe-data, equipment-data, logistics-baseline-data. No change needed unless we add explicit error handling later.

---

## Gaps (where to add or fix logging)

### 1. Replace raw `console.error` / `console.warn` with LoggingService

- **metadata-manager.page.component.ts**: Replace `console.error` in delete catch with LoggingService (`crud.metadata.delete_error`).
- **preparation-registry.service.ts**: Add `this.logging.error` for load catch (`crud.preparations.load_error`); remove console.error.
- **metadata-registry.service.ts**: Replace `console.error(err)` in rename menuType catch with `this.logging.error` (`crud.metadata.menuType.rename_error`).
- **demo-loader.service.ts**: Inject LoggingService; add `this.logging.error` for demo load catch (`demo.load_error`); remove console.error.
- **backup.service.ts**: Inject LoggingService; add `this.logging.warn` for write failure (`backup.write_failed`); remove console.warn.

### 2. Component catch blocks that only show user message

- **equipment-list.component.ts**, **supplier-list.component.ts**, **venue-list.component.ts**: Inject LoggingService; add error event; remove console.error.
- **supplier-form.component.ts**: Inject LoggingService; in both catch paths call `this.logging.error` (`supplier.save_error`); remove console.error.
- **product-form.component.ts**: Inject LoggingService; add `inventory.product.add_category_error` and `inventory.product.add_allergen_error`; remove console.error.
- **metadata-manager.page.component.ts**: Add LoggingService and log sync errors (`metadata.sync_error`) in the two catch blocks that only call userMsgService.

### 3. Catch blocks with no logging at all

- **metadata-registry.service.ts**: Add logging in `registerAllergen` catch (`crud.metadata.allergen.save_error`) and `deleteAllergen` catch (`crud.metadata.allergen.delete_error`).
- **trash.page.ts**: Inject LoggingService; add `this.logging.error` (`trash.load_error`) in catch.
- **equipment-form.component.ts**: Inject LoggingService; log `equipment.save_error` in catch.
- **recipe-builder.page.ts**: Inject LoggingService; log `recipe_builder.save_error` in catch.

### 4. Bootstrap (optional)

- **main.ts**: Keeping `console.error` for bootstrap failure is acceptable; no change.

---

## Event naming convention

Keep existing pattern: `domain.action.result` (e.g. `crud.metadata.menuType.save_error`). Use `*_error`, `*_failed`, `*.failure`.

---

## Implementation order

1. Core services: metadata-registry (rename + allergen save/delete), preparation-registry (load), demo-loader, backup.
2. Page/container: metadata-manager (delete + sync catches), trash.
3. List components: equipment-list, supplier-list, venue-list.
4. Form components: supplier-form, product-form, equipment-form, recipe-builder (catch blocks only).
