---
name: elegant-fix
description: Refines a working but mediocre fix into a clean, idiomatic solution for foodVibe 1.0 after the initial implementation is confirmed to work.
---

# Skill: elegant-fix

**Trigger:** After any fix that feels hacky, before submitting a PR with "I know this isn't ideal" comments, or when duplicate logic or too many special cases are noticed.
**Standard:** Follows Section 3 (Architecture & Reactivity) of the Master Instructions.

---

## Phase 1: Complexity Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Identify Smell:** Scan for nested subscriptions, large components (>300 lines), or one-off utility functions that belong in `core/utils/`.

**State Check:** Identify any "Signal-Leaking" or untracked state per Section 3.

**Duplication Scan:** Flag any copied logic blocks that should be extracted as pure functions.

---

## Phase 2: Structural Refinement `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Pattern Application:** Apply Adapter Pattern or Facade Pattern if the logic is too coupled to external APIs or storage.

**Reactive Logic:** Convert imperative logic to declarative Signals using `computed()` and `effect()` correctly.

**Pure Functions:** Extract reusable logic into `src/app/core/services/util.service.ts`.

---

## Phase 3: Cleanup & Verification `[Procedural — Haiku/Composer (Fast/Flash)]`

**Dead Code:** Remove unused imports, commented-out code, temporary console logs.

**Naming:** Ensure all variables follow Section 3 naming conventions (PascalCase classes, kebab-case selectors, `is`/`has` boolean flags).

**CSS Alignment:** Apply cssLayer (Section 4) to any local styles touched during refactor.

---

## Completion Gate

Output: `"Refactored [Component/Service] for elegance. Moved [X] functions to core/utils and converted [Y] variables to Signals."`

Run QA Engineer (Section 0.3) if the refactor touches critical business logic.

---

## Cursor Tip
> For simple code cleaning and naming fixes, use Composer 2.0 (Fast/Flash) — it follows the style rules in the Master Instructions without expensive reasoning.
> Reserve Gemini 1.5 Pro for Phase 2 only when restructuring logic or applying architectural patterns.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
