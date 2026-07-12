---
name: auth-crypto
description: Implements and audits hashing, encryption, and token management in auth-crypto.ts with mandatory pre-commit security grep + CI gate.
---

# Skill: auth-crypto
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.

**Trigger:** Implementing or refactoring hashing, encryption, or token management in `src/app/core/auth-crypto.ts`.

**Crypto Rules (inline â€” no guide read required):**
- Minimum algorithms: PBKDF2 for hashing, AES-256 for encryption â€” nothing weaker
- Never hardcode salts or IVs â€” generate securely at runtime, never log them
- Generic error messages only for crypto failures â€” no timing/padding side-channel leakage
- No PII, keys, salts, or raw inputs in any log statement â€” including test logs
- External crypto libraries must be approved, correctly typed, and in `package.json`
- **pre-commit security grep + CI sign-off mandatory before any commit â€” no exceptions**

---

## Phase 1: Security Surface Audit

**Algorithm Check:** Verify hashing/encryption algorithms meet minimum standards (PBKDF2, AES-256). Flag anything weaker immediately.

**Dependency Scan:** Verify any external crypto libraries are approved, correctly typed, and registered in `package.json`.

---

## Phase 2: Core Implementation 

**Logic Hardening:** Implement or refactor core crypto functions (`hashPassword`, `encryptData`, `verifyToken`).

**Salt / IV Management:** Generate salts and IVs securely at runtime. Never hardcode, never log â€” zero-trust policy applies.

**Error Masking:** Implement generic error messages for all crypto failures â€” no information that could enable timing or padding attacks.

---

## Phase 3: Verification & Spec

**Unit Testing:** Write or update `.spec.ts` to test hashing consistency and encryption/decryption cycles.

**PII Leakage Check:** Scan all test logs and assertions â€” ensure no sensitive keys, salts, or raw inputs are accidentally logged.

---

## Completion Gate

**Mandatory pre-commit security grep + CI Trigger:** Invoke pre-commit security grep + CI agent for a logic-flow audit before committing. This is non-negotiable â€” do not skip even if changes seem minor.

Output: `"Crypto logic updated. Algorithms verified, spec coverage confirmed. Invoking pre-commit security grep + CI for final audit..."`
