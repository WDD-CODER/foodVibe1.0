---
name: Data Service Error Guards
overview: Wrap every unprotected async storage/HTTP call in data services with a consistent try/catch + 401 noise-suppression guard, and silence Zone.js unhandled rejections from fire-and-forget constructor calls.
todos: []
isProject: false
---

# Goal
Wrap every unprotected async storage/HTTP call in data services with a consistent try/catch + 401 noise-suppression guard, and silence Zone.js unhandled rejections from fire-and-forget constructor calls.

# Atomic Sub-tasks

- [ ] Create branch `fix/data-service-error-guards`
- [ ] `menu-event-data.service.ts` — inject LoggingService; fix loadInitialData catch; wrap getMenuEventById, addMenuEvent, updateMenuEvent, deleteMenuEvent
- [ ] `version-history.service.ts` — inject LoggingService; wrap getVersions, getVersionEntry, addVersion, restoreVersion
- [ ] `menu-section-categories.service.ts` — inject LoggingService; fix constructor .catch(() => {}); fix load() and persist() catches
- [ ] `preparation-registry.service.ts` — fix constructor .catch(() => {}); add 401 guard to initRegistry + remove userMsg; add 401 guard to 5 CRUD methods
- [ ] `unit-registry.service.ts` — remove userMsg from initUnits catch; add 401 guard to registerUnit and deleteUnit
- [ ] `metadata-registry.service.ts` — add try/catch to reloadLabelsFromStorage; add 401 guard to 11 CRUD method catches
- [ ] `recipe-data.service.ts` — wrap 11 unprotected CRUD methods
- [ ] `dish-data.service.ts` — wrap 11 unprotected CRUD methods
- [ ] `product-data.service.ts` — wrap 9 unprotected CRUD methods
- [ ] `supplier-data.service.ts` — wrap getSupplierById, addSupplier, updateSupplier, removeSupplier
- [ ] `equipment-data.service.ts` — wrap getEquipmentById, addEquipment, updateEquipment, deleteEquipment, getTrashEquipment, restoreEquipment
- [ ] `venue-data.service.ts` — wrap getVenueById, addVenue, updateVenue, deleteVenue, getTrashVenues, restoreVenue
- [ ] `backup.service.ts` — add 401 guard to exportAllToFile and importFromFile backend-loop catches
- [ ] Run `npx ng build --configuration development` — confirm zero errors

# Rules

- Do NOT touch: async-storage.service.ts, http-storage.adapter.ts, user.service.ts, demo-loader.service.ts, logging.service.ts, translation.service.ts
- 401 guard is log-noise suppression only — not auth handling
- Init method catches must NOT call userMsgService.onSetErrorMsg
- Do not restructure method logic — wrap existing bodies as-is
- err in catch must be typed as unknown; use instanceof HttpErrorResponse

# Done When

- npx ng build --configuration development exits zero
- Every async method making a storage call has try/catch with 401 guard as first catch line
- Every fire-and-forget constructor init call ends in .catch(() => {})
- No logging.error fires for a 401
