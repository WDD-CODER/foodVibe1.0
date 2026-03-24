Skill: auth-and-logging (Lite)

Context: Triggered by touching auth guards, interceptors, user services, HTTP CRUD, or any flow requiring protected access.
Standard: Follows Section 5 (Security & QA) and Section 3 (Architecture) of the Master Instructions.

Workflow Phases

Phase 1: Surface Audit [Procedural — Haiku/Composer (Fast/Flash)]

Entry Point Scan: Identify all new routes in app.routes.ts or new mutation handlers (buttons, FABs, modals) that require protection.

Storage Check: Verify that any existing code touching localStorage or sessionStorage complies with the Section 5 mandates.

Phase 2: Security Implementation [High Reasoning — Sonnet/Gemini 1.5 Pro]

Guard Application: Ensure authGuard is applied to relevant routes.

Mutation Hardening: Implement the mandatory isLoggedIn() check at the entry point of all non-route mutation handlers.

Crypto/Logic: If handling sensitive data, implement the appropriate hashing or encryption via auth-crypto.ts.

Phase 3: Logging & Privacy Audit [Procedural — Haiku/Composer (Fast/Flash)]

PII Scrub: Scan all new LoggingService calls to ensure NO PII (emails, names, passwords) is being logged.

Identity Check: Ensure only the user _id is used for audit trails.

Feedback Logic: Use UserMsgService for standard security warnings (e.g., 'sign_in_to_use').

Efficiency Notes

Scanning & Scrubbing: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Auth Architecture: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 logic and crypto implementation.

Cursor Tip: For adding standard logging or repetitive auth checks, stay in Composer 2.0 (Fast/Flash). It is excellent at enforcing the "Never-Events" listed in the Master Instructions.

Completion Gate

Security Officer Trigger: If this task touches the security surface, invoke the Security Officer agent (Section 0.3) for a final audit before committing.

Output: "Auth/Logging hardened. [X] mutation handlers protected, PII audit passed."