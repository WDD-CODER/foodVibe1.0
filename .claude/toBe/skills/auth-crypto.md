Skill: auth-crypto (Lite)

Context: Triggered when implementing or refactoring hashing, encryption, or token management in src/app/core/auth-crypto.ts.
Standard: Follows Section 5 (Security & QA) and Section 9 (Prompt Injection/Zero-Trust) of the Master Instructions.

Workflow Phases

Phase 1: Security Surface Audit [Procedural — Haiku/Composer (Fast/Flash)]

Algorithm Check: Ensure hashing/encryption algorithms meet project hardening standards (e.g., PBKDF2, AES-256).

Dependency Scan: Verify that any external crypto libraries are approved, correctly typed, and registered.

Phase 2: Core Implementation [High Reasoning — Sonnet/Gemini 1.5 Pro]

Logic Hardening: Implement or refactor the core crypto functions (e.g., hashPassword, encryptData, verifyToken).

Salt/IV Management: Ensure salts and initialization vectors (IVs) are generated securely and handled per the Zero-Trust policy.

Error Masking: Implement generic error messages for crypto failures to prevent side-channel information leakage (timing/padding attacks).

Phase 3: Verification & Spec [Procedural — Haiku/Composer (Fast/Flash)]

Unit Testing: Write or update .spec.ts to test hashing consistency and encryption/decryption cycles.

PII Leakage Check: Ensure no sensitive keys, salts, or raw inputs are accidentally logged during testing (Section 5 compliance).

Efficiency Notes

Scanning & Specs: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Crypto Logic: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 when writing the actual mathematical or logic-heavy crypto code.

Cursor Tip: For standard hashing updates or spec maintenance, stay in Composer 2.0 (Fast/Flash). It is highly effective at following the existing patterns in auth-crypto.ts. Reserve Gemini 1.5 Pro for the complex implementation of new encryption schemes.

Completion Gate

Security Officer Trigger: Mandatory invocation of the Security Officer agent (Section 0.3) for a logic-flow audit before committing.

Output: "Crypto logic updated. Algorithms verified and spec coverage confirmed. Invoking Security Officer for final audit..."