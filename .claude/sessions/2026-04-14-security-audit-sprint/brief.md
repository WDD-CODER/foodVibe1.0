# Session Brief

## Session ID
2026-04-14-security-audit-sprint

## Date
2026-04-14

## Branch
main (merged via PR #111)

## Goal
Run full security audit via /cso, implement all actionable fixes, and ship to main.

## Success Criteria
- [ ] CRITICAL SSRF vulnerability fixed in server/routes/ai.js
- [ ] HIGH shots poisoning via generic API fixed in server/routes/generic.js
- [ ] HIGH prompt injection fixed in server/routes/ai.js
- [ ] HIGH admin gate missing on POST /shots fixed
- [ ] JWT secret split (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET) with fallback for zero-downtime rollout
- [ ] All fixes merged to main via PR
- [ ] Vite CVEs assessed (deferred if dev-only)
- [ ] JWT_SECRET cleanup scheduled for ~30 days out

## Notes
- /cso ran the audit and found 5 vulnerabilities
- Vite CVEs require Angular 21 upgrade — deferred
- May 14, 2026 follow-up: remove JWT_SECRET from Render + strip fallbacks
