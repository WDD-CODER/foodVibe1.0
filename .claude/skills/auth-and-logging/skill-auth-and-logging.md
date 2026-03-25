---
name: auth-and-logging
description: Audits and hardens authentication guards, mutation entry points, and logging calls for foodVibe 1.0 in compliance with the Security & QA standards.
---

# Skill: auth-and-logging

**Trigger:** Touching auth guards, interceptors, user services, HTTP CRUD, or any flow requiring protected access.
**Standard:** Follows Section 5 (Security & QA) and Section 3 (Architecture) of the Master Instructions.

---

## Phase 1: Surface Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Entry Point Scan:** Identify all new routes in `app.routes.ts` or new mutation handlers (buttons, FABs, modals) that require protection.

**Storage Check:** Verify code touching `localStorage` or `sessionStorage` complies with Section 5 mandates.

**Logging Scan:** List all new `LoggingService` calls and flag any that may include PII.

---

## Phase 2: Security Implementation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Guard Application:** Ensure `authGuard` (`canActivate: [authGuard]`) is applied to every new protected route.

**Mutation Hardening:** Implement the mandatory `isLoggedIn()` check at the entry point of all non-route mutation handlers (add, edit, delete buttons and modals).

**Crypto / Logic:** If handling sensitive data → use `auth-crypto.ts` and invoke the `auth-crypto` skill.

---

## Phase 3: Logging & Privacy Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**PII Scrub:** Scan all new `LoggingService` calls — ensure NO PII (emails, names, passwords, tokens) is logged.

**Identity Check:** Only `user._id` is permitted in audit trails.

**Feedback Logic:** Use `UserMsgService` for user-facing security warnings (e.g., `'sign_in_to_use'`).

---

## Completion Gate

**Security Officer Trigger:** If this task touches the security surface (auth files, `localStorage`/`sessionStorage`, `[innerHTML]`, new routes), invoke the Security Officer agent (Section 0.3) for a final audit before committing.

Output: `"Auth/Logging hardened. [X] mutation handlers protected, PII audit passed."`

---

## Cursor Tip
> Use Composer 2.0 (Fast/Flash) for Phase 1 and Phase 3 — scanning and PII checks are pattern-matching tasks.
> Reserve Gemini 1.5 Pro for Phase 2 only when implementing guard logic or crypto architecture.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
