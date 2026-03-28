---
name: Auth Refresh Guard + withCredentials Hardening
overview: Add concurrent-request guard to the 401 refresh flow and ensure all HTTP data calls send the fv_refresh cookie via withCredentials.
todos:
  - "[ ] auth.interceptor.ts — isRefreshing guard + refreshSubject$ queue"
  - "[ ] http-storage.adapter.ts — withCredentials on all HTTP calls"
  - "[ ] ng build — zero errors"
isProject: false
---

# Auth Refresh Guard + withCredentials Hardening

## Goal

Prevent multiple simultaneous token-refresh calls when several 401s fire at once, and ensure every HTTP data request carries `withCredentials: true` so the `fv_refresh` httpOnly cookie is forwarded to the refresh endpoint.

## Atomic Sub-tasks

- [ ] `auth.interceptor.ts` — add module-level `isRefreshing` flag + `refreshSubject$` Subject; queue concurrent 401 requests during refresh instead of firing multiple `/auth/refresh` calls
- [ ] `http-storage.adapter.ts` — add `withCredentials: true` to `query`, `get`, `post`, `put`, `remove`, `appendExisting` (preserve existing `withCredentials` on `replaceAll`)
- [ ] Run `ng build` — verify zero errors before commit

## Constraints

- No `any` casts; single quotes in TS; no semicolons
- `inject()` for DI — no constructor injection
- Never write JWT token to localStorage — `sessionStorage('fv_token')` only
- Do not remove local (non-backend) code paths
- Do not touch `auth-modal.component.ts`

## Verification

- `ng build` passes with zero errors
- `useBackendAuth: false`: login/signup/logout work exactly as before
- `useBackendAuth: true`: simultaneous 401s trigger only one `/auth/refresh` call; remaining requests queue and retry with the new token
- All HTTP data requests send the `fv_refresh` cookie (`withCredentials: true`)

## Notes

- Brief steps 1 (user.service.ts) and 3 (server/routes/auth.js POST /logout) are already implemented — excluded from execution to avoid regression
- Brief's instruction to hash password before login was dropped: `hashPassword()` uses a random salt (non-deterministic); server re-derives PBKDF2 from plain text using the stored salt — hashing client-side before login would break verification
- `environment.prod.ts`: `authApiUrl` is currently `''` — manual deploy step required (paste real Render URL before going live)
