# Plan 060 — Data persistence audit and backup

## Overview

Ensure every save in the app is resilient (try/catch around storage), add a confirmation step before loading demo data, and implement per-category backup so that on every save the app updates a mirror and can produce physical JSON files for easy restore.

---

## 1. StorageService try/catch (across the app)

### 1.1 Problem

[StorageService](src/app/core/services/async-storage.service.ts) `_save()` calls `localStorage.setItem()` with no try/catch. If the browser throws (quota exceeded, private mode, disabled storage), the exception propagates. Data services often update their in-memory signal **after** `await storage.post()` returns; if `_save` throws inside `post`, the signal is not updated (good), but the user sees an unhandled error and the app state can be unclear.

### 1.2 Fix in StorageService

- Wrap `_save(entityType, entities)` in try/catch.
- On failure: re-throw a clear error (e.g. `new Error('Storage failed: quota or access denied')`) so callers can catch and show a message.
- Optionally add a small helper or type so callers know to handle `StorageError` (e.g. same Error with a known message or code).

No signature change required: `post`, `put`, `remove`, `appendExisting`, `replaceAll` already propagate the throw. Callers that `await` will get the error and can show it via UserMsgService.

### 1.3 Call sites to verify

All persistence goes through StorageService or direct localStorage. Ensure:

- **StorageService** — only change: add try/catch in `_save`, re-throw with clear message.
- **ActivityLogService** — already has try/catch around `localStorage.setItem`; no change.
- **UtilService** — `saveToStorage()` and any direct `localStorage.setItem`: add try/catch, re-throw or return so callers can show error. (Note: `saveToStorage` is currently dead code; still harden it if kept.)
- **TranslationService** — `localStorage.setItem('DICTIONARY_CACHE', ...)` in multiple places: wrap in try/catch so a full cache or quota failure doesn’t break the app; optionally re-throw after logging.

After StorageService change, run the app and existing tests; add one unit test that mocks `localStorage.setItem` to throw and asserts that the error propagates (and optionally that the in-memory store is not updated).

---

## 2. Demo loader confirmation step

### 2.1 Current behavior

[DemoLoaderService.loadDemoData()](src/app/core/services/demo-loader.service.ts) replaces PRODUCT_LIST, RECIPE_LIST, DISH_LIST, KITCHEN_SUPPLIERS, EQUIPMENT_LIST, VENUE_PROFILES. It does not clear trash, version history, activity log, or users.

### 2.2 Change

- **Before** calling `loadDemoData()`, show a confirmation step.
- **Copy:** Clearly state that loading demo data will **replace** current recipes, dishes, products, suppliers, equipment, and venues. Trash, version history, activity log, and user accounts are not changed.
- **Implementation:** Either (a) a modal (preferred for RTL and styling) with “Load demo” / “Cancel”, or (b) `window.confirm()`. Use the same pattern as other destructive actions in the app (e.g. “Dispose all” in trash).
- **Where:** The place that calls `loadDemoData()` (e.g. dashboard or settings) must show the confirmation first; only on confirm call `demoLoader.loadDemoData()`.

---

## 3. Per-category backup (mirror + physical JSON)

### 3.1 Goal

On every save of any item (recipe, dish, product, category, etc.):

- Keep a **mirror** of that category’s data so it can be restored.
- Produce **physical JSON files** per category (recipes.json, dishes.json, products.json, etc.) so the user can keep them anywhere (e.g. project folder, cloud) and restore later.

### 3.2 Browser constraint

The Angular app runs in the browser. It **cannot** write files to the project’s filesystem (e.g. `src/assets/data/recipes.json`). The only way to get a “physical” file is to **trigger a download** (e.g. `recipes.json` into the user’s Downloads folder).

### 3.3 Design

**A. Mirror (localStorage)**

- Define a fixed set of “backup keys” per category, e.g. one key per entity type:
  - `backup_RECIPE_LIST`, `backup_DISH_LIST`, `backup_PRODUCT_LIST`, `backup_KITCHEN_SUPPLIERS`, `backup_EQUIPMENT_LIST`, `backup_VENUE_PROFILES`, `backup_MENU_EVENT_LIST`, plus registries/trash/version history if desired.
- **On every successful save** for a given entity type (after StorageService has written the main key), update the corresponding backup key with the **full current list** for that type (query the main key and write to the backup key). So the backup key always holds the latest full snapshot of that category.
- This can be done in one of two ways:
  - **Option A (central):** In StorageService, after every successful `_save(entityType, entities)`, also write to `backup_${entityType}` with the same `entities`. Then one place handles all backup writes.
  - **Option B (per service):** Each data service, after a successful add/update/delete/restore, calls a small `BackupService.syncCategory(entityType)` that reads the main key and writes to the backup key.
- Prefer **Option A** so no caller can forget; only entity types that go through StorageService get mirrored. Direct localStorage writers (activity_log, DICTIONARY_CACHE, signed-users-db) can be added to a separate list and synced from their respective services if desired.

**B. Physical JSON files (download)**

- **On-demand export:** A single “Export all data” action that, for each backup category, triggers a download of a file named e.g. `recipes.json`, `dishes.json`, `products.json`, … (or one ZIP containing all). User saves these wherever they want (e.g. project folder, cloud). This does not require any write on every save.
- **Auto-download on save (optional):** To approximate “every change is written to a JSON file”, we can **debounce** and trigger a download per category when that category’s data has changed. For example: after any save to RECIPE_LIST, set a flag; after 30 seconds of no further recipe saves, trigger one download of `recipes.json` with the current backup content. So the user gets updated JSON files in their Downloads folder without a download on every single save. Implement only if you want this behavior; otherwise “Export all” is enough.

**C. Restore**

- **From mirror:** Add a “Restore from last backup” (or “Restore category X from backup”) that copies from `backup_*` back to the main keys and reloads data services (same pattern as demo loader reload).
- **From file:** Add “Import from file(s)”: user selects one or more JSON files (or one combined export), app validates shape and key names, then either replaces or merges into the main keys and reloads. This covers the case where the user restored from their own saved JSON files.

### 3.4 Implementation outline

1. **Backup keys and mirror**
   - Add a constant list of entity types that participate in backup (e.g. RECIPE_LIST, DISH_LIST, PRODUCT_LIST, KITCHEN_SUPPLIERS, EQUIPMENT_LIST, VENUE_PROFILES, MENU_EVENT_LIST, plus TRASH_*, VERSION_HISTORY, and optionally KITCHEN_UNITS, KITCHEN_PREPARATIONS, KITCHEN_CATEGORIES, KITCHEN_ALLERGENS, KITCHEN_LABELS, MENU_TYPES, signed-users-db).
   - In StorageService `_save()`, after a successful `localStorage.setItem(entityType, ...)`, if `entityType` is in the backup list, write the same payload to `backup_${entityType}` (same try/catch; if backup write fails, log but don’t fail the main save).

2. **Export to physical files**
   - Add a BackupService (or extend an existing service) with:
     - `exportAllToFiles()`: for each backup key, create a blob with the JSON and trigger download (`recipes.json`, `dishes.json`, etc.).
   - Add UI (e.g. Settings or Dashboard): “Export all data” button that calls `exportAllToFiles()`.

3. **Restore**
   - “Restore from backup”: read from `backup_*` into main keys, then call the same `reloadFromStorage()` pattern as the demo loader for each data service.
   - “Import from file”: file input → parse JSON → validate keys and shape → write to main keys (and optionally to backup keys) → reload services. Add confirmation before overwriting.

4. **Optional: debounced auto-download**
   - If you want “physical JSON file updated on every change”: for each category, maintain a debounce timer; on any save to that category, reset the timer; when the timer fires, trigger a single download for that category’s JSON. Limit to one download per category per N seconds to avoid too many dialogs.

---

## 4. Implementation order

1. **StorageService** — Add try/catch in `_save`, re-throw with clear message. Add unit test for throw propagation. Harden **UtilService** and **TranslationService** direct localStorage writes with try/catch.
2. **Demo loader** — Find the call site of `loadDemoData()`, add confirmation modal or `confirm()` with clear copy; only call `loadDemoData()` on confirm.
3. **Backup mirror** — Define backup entity list; in StorageService after successful save, write to `backup_<entityType>` when entityType is in the list.
4. **Export / Restore** — Implement `exportAllToFiles()` and “Restore from backup” and “Import from file(s)” with validation and reload.
5. **Optional** — Debounced auto-download per category if desired.

---

## 5. Summary

| Item | Action |
|------|--------|
| StorageService | Wrap `_save()` in try/catch; re-throw. Harden UtilService and TranslationService localStorage writes. |
| Demo loader | Add confirmation step before `loadDemoData()` with clear text about what gets replaced. |
| Backup | Mirror every saved category to `backup_<key>` in StorageService; add Export all (download JSON per category) and Restore from backup / Import from file. |
| Physical JSON | Achieved by “Export all” (and optional debounced auto-download per category). |
