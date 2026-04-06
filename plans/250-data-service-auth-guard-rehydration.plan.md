---
name: Data Service Auth Guard + Post-Login Rehydration
overview: Silence 401 errors in three data services on unauthenticated page load; rehydrate those services after every successful login.
todos: []
isProject: false
---

# Goal
Stop three data services from throwing unhandled errors on page load when the user is unauthenticated; after login, rehydrate those services so data appears without a page reload.

# Atomic Sub-tasks
- [ ] unit-registry.service.ts — add HttpErrorResponse import; add 401 early-return at top of initUnits() catch block
- [ ] product-data.service.ts — add HttpErrorResponse import; wrap loadInitialData() body in try/catch with 401 early-return + logging.error fallback
- [ ] metadata-registry.service.ts — add HttpErrorResponse import; wrap full initMetadata() body in try/catch with 401 early-return + logging.error fallback
- [ ] user.service.ts — import + inject UnitRegistryService, ProductDataService, MetadataRegistryService; add fire-and-forget reloadFromStorage() calls after _saveUserLocal(user) in backend login tap, localStorage login switchMap, and loginAsGuestBackend tap

# Rules
- Do not add UserService as a dependency to any of the three data services (circular dependency risk)
- Do not change reloadFromStorage() / refreshFromStorage() signatures
- reloadFromStorage() calls must be fire-and-forget — no await, no subscribe
- Do not touch backend routes

# Done When
- Fresh page load (no session) produces zero console errors and zero unhandled rejections
- After logging in, inventory/units/categories data loads without a page reload
- ng build passes with zero errors
