---
name: auth-crypto
description: Implements and audits hashing, encryption, and token management in auth-crypto.ts with mandatory Security Officer sign-off.
---

# Skill: auth-crypto
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.

**Trigger:** Implementing or refactoring hashing, encryption, or token management in `src/app/core/auth-crypto.ts`.

**Crypto Rules (inline — no guide read required):**
- Minimum algorithms: PBKDF2 for hashing, AES-256 for encryption — nothing weaker
- Never hardcode salts or IVs — generate securely at runtime, never log them
- Generic error messages only for crypto failures — no timing/padding side-channel leakage
- No PII, keys, salts, or raw inputs in any log statement — including test logs
- External crypto libraries must be approved, correctly typed, and in `package.json`
- **Security Officer sign-off mandatory before any commit — no exceptions**

---

## Phase 1: Security Surface Audit

**Algorithm Check:** Verify hashing/encryption algorithms meet minimum standards (PBKDF2, AES-256). Flag anything weaker immediately.

**Dependency Scan:** Verify any external crypto libraries are approved, correctly typed, and registered in `package.json`.

---

## Phase 2: Core Implementation 

**Logic Hardening:** Implement or refactor core crypto functions (`hashPassword`, `encryptData`, `verifyToken`).

**Salt / IV Management:** Generate salts and IVs securely at runtime. Never hardcode, never log — zero-trust policy applies.

**Error Masking:** Implement generic error messages for all crypto failures — no information that could enable timing or padding attacks.

---

## Phase 3: Verification & Spec

**Unit Testing:** Write or update `.spec.ts` to test hashing consistency and encryption/decryption cycles.

**PII Leakage Check:** Scan all test logs and assertions — ensure no sensitive keys, salts, or raw inputs are accidentally logged.

---

## Completion Gate

**Mandatory Security Officer Trigger:** Invoke Security Officer agent for a logic-flow audit before committing. This is non-negotiable — do not skip even if changes seem minor.

Output: `"Crypto logic updated. Algorithms verified, spec coverage confirmed. Invoking Security Officer for final audit..."`

---

## Cursor Tip
> For standard hashing updates or spec maintenance, use Composer 2.0 (Fast/Flash) — it follows the existing patterns in `auth-crypto.ts`.
> Reserve Gemini 1.5 Pro for Phase 2 only when implementing new encryption schemes or key derivation logic.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.