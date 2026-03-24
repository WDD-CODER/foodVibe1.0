Skill: elegant-fix (Lite)

Context: Triggered by "refactor this", "make it cleaner", "elegant fix", or after a "hacky" solution is confirmed to work.
Standard: Follows Section 3 (Architecture & Reactivity) of the Master Instructions.

Workflow Phases

Phase 1: Complexity Audit [Procedural — Haiku/Composer (Fast/Flash)]

Identify Smell: Scan for nested subscriptions, large components (>300 lines), or one-off utility functions that belong in core/utils/.

State Check: Identify any "Signal-Leaking" or untracked state as defined in the Master Instructions.

Phase 2: Structural Refinement [High Reasoning — Sonnet/Gemini 1.5 Pro]

Pattern Application: Apply the Adapter Pattern or Facade Pattern if the current logic is too coupled to external APIs or storage.

Reactive Logic: Convert imperative logic to declarative Signals (using computed() and effect() correctly).

Pure Functions: Extract logic into pure, testable utilities in src/app/core/services/util.service.ts.

Phase 3: Cleanup & Verification [Procedural — Haiku/Composer (Fast/Flash)]

Dead Code: Remove unused imports, commented-out code, and temporary console logs.

Naming: Ensure all variables follow the PascalCase/kebab-case rules in Section 3.

CSS Alignment: Apply css-layer (Section 4) to any local styles to ensure logical property usage.

Efficiency Notes

Smell Detection: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Architectural Refactoring: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 when changing the structure of the logic.

Cursor Tip: For simple code cleaning and naming fixes, use Composer 2.0 (Fast/Flash). It is highly effective at following the style rules in the Master Instructions without needing expensive reasoning.

Completion Gate

Output: "Refactored [Component/Service] for elegance. Moved [X] functions to core/utils and converted [Y] variables to Signals."

Run QA Engineer (Section 0.3) if the refactor touches critical business logic.