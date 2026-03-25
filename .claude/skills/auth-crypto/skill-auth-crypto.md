---
name: auth-crypto
description: Implements and audits hashing, encryption, and token management in foodVibe 1.0's auth-crypto.ts with mandatory Security Officer sign-off.
---

# Skill: auth-crypto

**Trigger:** Implementing or refactoring hashing, encryption, or token management in `src/app/core/auth-crypto.ts`.
**Standard:** Follows Section 5 (Security & QA) and Section 9 (Prompt Injection / Zero-Trust) of the Master Instructions.

---

## Phase 1: Security Surface Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Algorithm Check:** Ensure hashing/encryption algorithms meet project hardening standards (PBKDF2, AES-256 minimum).

**Dependency Scan:** Verify any external crypto libraries are approved, correctly typed, and registered in `package.json`.

---

## Phase 2: Core Implementation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Logic Hardening:** Implement or refactor core crypto functions (`hashPassword`, `encryptData`, `verifyToken`).

**Salt / IV Management:** Generate salts and initialization vectors (IVs) securely per the Zero-Trust policy (Section 9). Never hardcode or log these values.

**Error Masking:** Implement generic error messages for crypto failures to prevent side-channel information leakage (timing / padding attacks).

---

## Phase 3: Verification & Spec `[Procedural — Haiku/Composer (Fast/Flash)]`

**Unit Testing:** Write or update `.spec.ts` to test hashing consistency and encryption/decryption cycles.

**PII Leakage Check:** Ensure no sensitive keys, salts, or raw inputs are accidentally logged during testing (Section 5 compliance).

---

## Completion Gate

**Mandatory Security Officer Trigger:** Invoke the Security Officer agent (Section 0.3) for a logic-flow audit before committing. No exceptions.

Output: `"Crypto logic updated. Algorithms verified and spec coverage confirmed. Invoking Security Officer for final audit..."`

---

## Cursor Tip
> For standard hashing updates or spec maintenance, use Composer 2.0 (Fast/Flash) — it follows the existing patterns in `auth-crypto.ts`.
> Reserve Gemini 1.5 Pro for Phase 2 only when implementing new encryption schemes or key derivation logic.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
