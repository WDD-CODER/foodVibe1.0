# Render Flow Audit — Executive Report
**Date:** 2026-04-24  
**Target:** https://foodvibe.onrender.com  
**Viewport:** 1366×768  
**Flows run:** signup · login · recipe-builder-edit  
**Auditor:** Render Flow Auditor agent

---

## Summary

| Flow | Outcome | Critical | Major | Minor | API errs | Console errs |
|------|---------|----------|-------|-------|----------|--------------|
| signup | PASS | 0 | 0 | 0 | 0 | 0 |
| login | PASS | 0 | 0 | 1 | 0 | 0 |
| recipe-builder-edit | FAIL | 1 | 1 | 0 | 0 | 0 |
| **Total** | | **1** | **1** | **1** | **0** | **0** |

---

## Defects

### [CRITICAL] F2 — Duplicate-name false-positive on recipe edit
**Flow:** recipe-builder-edit  
**Report:** [→](./recipe-builder-edit/report.md)

When an existing recipe is opened in the editor and the user touches the name field without changing it, the validator "שם מתכון זה כבר קיים" fires and blocks save silently (zero API calls). The validator checks name uniqueness across ALL users' recipes without scoping to the current user — causing false positives whenever another user has a recipe with the same name.

**Status: Fixed** — `duplicateNameValidator_()` in `recipe-builder.page.ts` now filters the combined list to the current user's own records (`createdBy === currentUserId`) before the duplicate check.

---

### [MAJOR] NG04002 — Route `/recipe-builder/edit/:id` does not exist
**Flow:** recipe-builder-edit (auditor-introduced)  
**Report:** [→](./recipe-builder-edit/report.md)

The audit command's flow catalog referenced `/recipe-builder/edit/:id` which never existed — the correct route is `/recipe-builder/:id`. The NG04002 was triggered by the auditor navigating to a non-existent URL, not a real app bug. However, the silent redirect to `/` with no error page is a resilience gap.

**Status: Fixed** — Audit command updated to use correct route. Router resilience redirect added: `recipe-builder/edit/:id → recipe-builder/:id`.

---

### [MINOR] Login API latency — 8045ms cold-start
**Flow:** login  
**Report:** [→](./login/report.md)

`POST /api/v1/auth/login` took 8s on first request after Render free-tier idle sleep. Login succeeds; no data loss. MongoDB connection caching was already correctly implemented.

**Status: Mitigated** — Three improvements applied:
1. GitHub Actions keep-alive pinger (every 14 min) prevents the service from sleeping
2. MongoDB `minPoolSize: 1` hint in `server/db.js` pre-allocates a connection slot on startup
3. Login button spinner added — cold-start wait is now visually acknowledged

---

## Observations (non-defect)

- **Signup API latency:** 6098ms on first request (same cold-start root cause as login latency — mitigated by keep-alive)
- **Silent save-permission:** The recipe editor opens other users' recipes in full edit mode but silently blocks save with zero network calls. No error message shown. Out of scope for this audit but worth a separate ticket.
- **Auth token is in-memory only:** Hard page reload drops the Angular auth token; only `fv_refresh` cookie persists. SPA navigation required to maintain session. Expected behaviour for this auth pattern.

---

## Per-flow Reports
- [signup/report.md](./signup/report.md)
- [login/report.md](./login/report.md)
- [recipe-builder-edit/report.md](./recipe-builder-edit/report.md)
- [INDEX.md](./INDEX.md)
