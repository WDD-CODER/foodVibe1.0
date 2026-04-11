## Goal
Add a URL exclusion guard to auth.interceptor.ts so the generic error logger skips requests targeting the log server, breaking the recursive 401 cascade.

## Scope
- `src/app/core/interceptors/auth.interceptor.ts` — line 98, condition guard

## Out of Scope
- Any other interceptor logic
- LoggingService itself
- Production environment config

## Success Criteria
- [ ] `auth.interceptor.ts:98` condition includes `&& !req.url.startsWith(environment.logServerUrl)`
- [ ] `ng build` compiles cleanly
- [ ] Bad-credentials submit in Chrome produces 1 × 401 (login attempt), not 9

## Session ID
2026-04-11-auth-interceptor-log-guard
