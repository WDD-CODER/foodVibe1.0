Skill: tech-debt (Lite)

Context: Triggered before a PR, at the end of a feature, or by "audit tech debt", "cleanup", or "check todos".
Standard: Follows Section 3 (Architecture) and Section 5 (Security & QA) of the Master Instructions.

Workflow Phases

Phase 1: Static Analysis [Procedural — Haiku/Composer (Fast/Flash)]

Duplicate Detection: Scan for redundant utility functions or UI patterns that should be moved to shared/ or core/utils/.

Dead Code: Identify unused imports, variables, and commented-out code blocks.

TODO Audit: Scan the codebase for // TODO or // FIXME comments; categorize them by urgency.

Phase 2: Logic & Complexity Pruning [High Reasoning — Sonnet/Gemini 1.5 Pro]

Refactor Candidate: Identify components or services exceeding the 300-line threshold.

Signal Optimization: Identify imperative logic that can be converted to declarative Signals or computed() values.

Security Surface: Ensure no temporary "hacky" auth bypasses or hardcoded keys were left behind during development.

Phase 3: Documentation & Sync [Procedural — Haiku/Composer (Fast/Flash)]

Breadcrumb Check: Run update-docs (Section 0) to ensure the navigation maps reflect the current cleaned state.

Ledger Update: Mark completed items in .claude/todo.md and move unresolved debt to a "Tech Debt" section for future planning.

Efficiency Notes

Scanning & Pruning: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Refactor Strategy: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 when determining the best way to decouple complex logic.

Cursor Tip: Tech debt cleanup is often about pattern matching and deletion. Use Composer 2.0 (Fast/Flash) for 90% of this work. It is excellent at finding unused code and following the naming/structure rules in the Master Instructions.

Completion Gate

Output: "Tech debt audit complete. [X] unused imports removed, [Y] TODOs logged, and [Z] components flagged for refactor."

If critical logic was changed, invoke the QA Engineer (Section 0.3) for verification.