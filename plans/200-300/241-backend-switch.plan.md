---
name: Switch FoodVibe to MongoDB Backend Mode
overview: Open anonymous GET routes on Express, create environment.local.ts, wire Angular build config, and fix login password hashing so the app loads from MongoDB without login.
todos:
  - "[ ] server/routes/generic.js — remove blanket verifyToken; add per-route middleware on write routes only; update comment"
  - "[ ] src/environments/environment.ts — revert to useBackend: false, useBackendAuth: false (plain ng serve stays localStorage-only)"
  - "[ ] Create src/environments/environment.local.ts with useBackend: true, useBackendAuth: true"
  - "[ ] angular.json — add local build + serve configurations"
  - "[ ] package.json — add dev:local script"
  - "[ ] user.service.ts — fix login() backend path to hash password before sending"
isProject: false
---

# Goal
Switch FoodVibe from localStorage-only mode to MongoDB backend mode via a local-only Angular build configuration, so the app loads seeded data from MongoDB on startup without requiring login, while plain `ng serve` continues to work in localStorage mode.

# Atomic Sub-tasks

- [ ] `server/routes/generic.js` — remove `router.use(verifyToken)` at line 8; add `verifyToken` inline on `router.post`, both `router.put`, and `router.delete` handlers; update file comment
- [ ] `src/environments/environment.ts` — revert `useBackend` and `useBackendAuth` to `false` (Plan 229 had set these to true; superseded by local config approach)
- [ ] Create `src/environments/environment.local.ts` — `useBackend: true`, `useBackendAuth: true`, pointing at localhost:3000
- [ ] `angular.json` — add `"local"` under `build.configurations` (fileReplacements → environment.local.ts) and `serve.configurations`
- [ ] Root `package.json` — add `"dev:local": "ng serve -c local"` script
- [ ] `src/app/core/services/user.service.ts` — fix `login()` backend path: wrap `callBackendLogin` call with `from(hashPassword(password)).pipe(switchMap(...))`

# Constraints
- Do NOT touch `server/routes/auth.js`, `server/middleware/auth.js`, `http-storage.adapter.ts`, `async-storage.service.ts`, `auth-modal.component.ts`, `environment.prod.ts`
- Keep existing localStorage auth paths in `else` branches — do not delete them
- TOKEN_KEY must remain `'fv_token'` to match http-storage.adapter.ts
- Follow project conventions: single quotes in TS, no semicolons, `inject()` DI, no `any`

# Verification
1. `curl http://localhost:3000/api/v1/data/PRODUCT_LIST` returns product array (no token)
2. `curl -X POST http://localhost:3000/api/v1/data/PRODUCT_LIST -H "Content-Type: application/json" -d '{"_id":"test1"}'` returns 401
3. `npm run dev:local` → app loads all seeded data immediately, no login needed
4. Sign up → JWT stored in sessionStorage as `fv_token`
5. `ng serve` (no flag) still works in localStorage mode
