---
name: auth-and-logging
description: Audits and hardens authentication guards, mutation entry points, and logging calls in compliance with project Security & QA standards.
---

# Skill: auth-and-logging
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.
**Trigger:** Touching auth guards, interceptors, user services, HTTP CRUD, or any flow requiring protected access.

**Security Rules (inline â€” no guide read required):**
- Every new protected route â†’ `canActivate: [authGuard]` â€” no exceptions
- Every mutation handler (add, edit, delete buttons/modals/FABs) â†’ `isLoggedIn()` check at entry point
- Credentials â†’ `sessionStorage` only â€” never `localStorage`
- Sensitive data handling â†’ use `auth-crypto.ts` and invoke `auth-crypto` skill
- No PII in logs â€” only `user._id` permitted in audit trails
- User-facing security warnings â†’ `UserMsgService` only (e.g. `'sign_in_to_use'`)
- Security Officer sign-off required before commit if this task touches the security surface

---

## Phase 0 â€” Auto Memory Orient (CONDITIONAL)
Run `Auto Memory_search(query="<keywords>", limit=3)` ONLY if task involves an unfamiliar code area or known-recurring debt category. Skip for routine cleanup or pattern application. Default: skip. If MCP unavailable: skip silently.

---

## Phase 1: Surface Audit 

**Entry Point Scan:** Identify all new routes in `app.routes.ts` and new mutation handlers (buttons, FABs, modals) that require protection.

**Storage Check:** Verify all code touching `localStorage` or `sessionStorage` â€” credentials must use `sessionStorage` only.

**Logging Scan:** List all new `LoggingService` calls and flag any that may include PII.

---

## Phase 2: Security Implementation 

**Guard Application:** Apply `canActivate: [authGuard]` to every new protected route in `app.routes.ts`.

**Mutation Hardening:** Implement `isLoggedIn()` check at the entry point of all non-route mutation handlers â€” add, edit, delete buttons and modals.

**Crypto / Logic:** If handling sensitive data â†’ delegate to `auth-crypto.ts` and invoke the `auth-crypto` skill.

---

## Phase 3: Logging & Privacy Audit 

**PII Scrub:** Scan all new `LoggingService` calls â€” ensure NO PII (emails, names, passwords, tokens) is logged.

**Identity Check:** Only `user._id` is permitted in audit trails â€” flag anything else.

**Feedback Logic:** Verify all user-facing security warnings route through `UserMsgService`.

---

## Completion Gate

**Security Officer Trigger:** If this task touches the security surface (auth files, `localStorage`/`sessionStorage`, `[innerHTML]`, new routes) â†’ invoke Security Officer agent for final audit before committing. No exceptions.

Output: `"Auth/Logging hardened. [X] mutation handlers protected, PII audit passed."`

