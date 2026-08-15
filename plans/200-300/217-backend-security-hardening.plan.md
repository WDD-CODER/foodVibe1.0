---
name: 217-backend-security-hardening
overview: Harden the foodVibe Express/Mongo backend and Angular client to production security standards before go-live — covering auth, transport, input, rate limiting, token lifecycle, logging, and dependency hygiene.
todos: []
isProject: false
---

# Goal
Harden the foodVibe backend and Angular client to production security standards before go-live — covering auth, transport, input, rate limiting, token lifecycle, logging, and dependency hygiene.

# Atomic Sub-tasks

## A — Packages & Lock File
- [ ] A1: `cd server && npm install helmet express-rate-limit morgan` — generate package-lock.json, commit it

## B — server/index.js Hardening
- [ ] B1: Add `helmet()` as first middleware (before CORS)
- [ ] B2: Change `express.json()` → `express.json({ limit: '2mb' })`
- [ ] B3: Add morgan request logger (method/URL/status/response-time; no body)
- [ ] B4: Rename route mounts: `/api/auth` → `/api/v1/auth`, `/api/data` → `/api/v1/data`; update health route to `/api/v1/health`
- [ ] B5: Add global error handler at bottom — `NODE_ENV === 'production'` returns `{ error: 'Internal server error' }` only; dev includes stack

## C — server/db.js
- [ ] C1: Pass `{ serverSelectionTimeoutMS: 5000 }` to `mongoose.connect()` options
- [ ] C2: Add startup guard — throw if `JWT_SECRET` is missing

## D — server/routes/auth.js Overhaul
- [ ] D1: Remove `hashPassword()` and `verifyPassword()` PBKDF2 helpers; remove `pbkdf2Async`, crypto re-hash imports; keep `crypto.timingSafeEqual` for comparison
- [ ] D2: Signup — store incoming `password` field directly as `passwordHash` (no re-hashing)
- [ ] D3: Login — compare incoming password string to `stored.passwordHash` via `timingSafeEqual`; keep legacy bare-SHA-256 path for migrated users
- [ ] D4: Add `loginLimiter` (10 req / 15 min / IP) via express-rate-limit; apply to `POST /login`
- [ ] D5: Add `signupLimiter` (5 req / 1 hour / IP); apply to `POST /signup`
- [ ] D6: Add `failedAttempts` + `lockedUntil` fields to user document on failed login; reject login with 423 if `lockedUntil > Date.now()`; reset counter on success
- [ ] D7: Shorten `JWT_EXPIRY` from `'30d'` to `'15m'`
- [ ] D8: Add `POST /refresh` endpoint — reads `fv_refresh` httpOnly cookie, verifies long-lived refresh JWT (30d), issues new 15m access token; sets new `fv_refresh` cookie
- [ ] D9: Add `data.email` uniqueness check on signup (neighborhood gap)

## E — server/routes/generic.js Hardening
- [ ] E1: Replace write-only middleware gate with `verifyToken` on ALL routes (`router.use(verifyToken)`)
- [ ] E2: Add `X-Confirm-Replace: true` header check to `PUT /:type` (replaceAll); reject with 400 if missing
- [ ] E3: Add `?limit` / `?skip` pagination to `GET /:type` (default limit 500, max 1000)

## F — Angular: Adapter & Environment
- [ ] F1: `http-storage.adapter.ts` — update all paths from `/api/data/` → `/api/v1/data/` and auth call paths to `/api/v1/auth/`
- [ ] F2: `http-storage.adapter.ts` — add `X-Confirm-Replace: true` header in `replaceAll()` method
- [ ] F3: `http-storage.adapter.ts` — add `withCredentials: true` to replaceAll/refresh calls so httpOnly cookie is sent
- [ ] F4: `environment.prod.ts` — add APP_INITIALIZER startup validation: if `useBackend && apiUrl.includes('your-render-url')` throw descriptive error

## G — Hygiene & Docs
- [ ] G1: `.gitignore` — add `migration-dump.json`
- [ ] G2: Create `scripts/seed-from-dump.js` from inline code in `migration-sequence.md`; add `NODE_ENV === 'production'` guard; add `--confirm-seed` CLI flag requirement
- [ ] G3: `plans/backend/migration-sequence.md` — add security warnings about dump file; update Phase 3 checklist
- [ ] G4: `.claude/standards-security.md` — append backend security rules: reads must be authenticated, JWT max 15m, refresh via httpOnly cookie, rate limiting required, replaceAll needs X-Confirm-Replace header, server logging required

# Rules
- Do not change any Angular data service (RecipeDataService, ProductDataService, etc.)
- Do not change StorageService public interface
- makeId() stays in Angular — do not switch to MongoDB ObjectIds
- All new Express middleware goes in server/index.js before routes, not inside individual route files
- Never log request/response bodies — only method, URL, status, userId
- PBKDF2 hash from Angular must be stored and compared as-is on the backend — the backend must NOT re-hash it

# Done When
- GET /api/v1/data/PRODUCT_LIST without a JWT returns 401
- POST /api/v1/auth/login with wrong password 11 times returns 429 on attempt 11
- curl -X POST http://localhost:3000/api/v1/data/PRODUCT_LIST -d "$(python -c "print('x'*3000000)")" returns 413 not a crash
- Stack traces never appear in production API responses
- npm audit in server/ reports zero critical or high vulnerabilities
- server/package-lock.json is committed to git
- migration-dump.json is in .gitignore
