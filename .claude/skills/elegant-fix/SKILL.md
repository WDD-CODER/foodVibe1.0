---
name: elegant-fix
description: Refines a working but mediocre fix into a clean, idiomatic solution after the initial implementation is confirmed to work.
---

# Skill: elegant-fix
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only.

**Trigger:** After any fix that feels hacky, before submitting a PR with "I know this isn't ideal" comments, or when duplicate logic or too many special cases are noticed.

**Code Quality Rules (inline — no guide read required):**
- Naming: PascalCase classes, kebab-case selectors, `is`/`has` boolean flags
- No nested subscriptions — use `computed()` and `effect()` correctly
- No `@Input`/`@Output` decorators — use `input()`, `output()`, `model()` signals
- No `BehaviorSubject` — use `signal()` instead
- No `any` types, no semicolons in TypeScript
- Components >300 lines → candidate for split/refactor
- Reusable logic → `src/app/core/services/util.service.ts`
- Adapter/Facade pattern for logic too coupled to external APIs or storage
- CSS touched during refactor → run `cssLayer` skill

---

## Phase 1: Complexity Audit 

**Identify Smell:** Scan for nested subscriptions, large components (>300 lines), or one-off utility functions that belong in `core/utils/`.

**State Check:** Identify any Signal-leaking or untracked state — any reactive value not managed via `signal()` or `computed()`.

**Duplication Scan:** Flag any copied logic blocks that should be extracted as pure functions.

---

## Phase 2: Structural Refinement 

**Pattern Application:** Apply Adapter Pattern or Facade Pattern if the logic is too coupled to external APIs or storage.

**Reactive Logic:** Convert imperative logic to declarative Signals using `computed()` and `effect()` correctly. Never introduce new `BehaviorSubject`.

**Pure Functions:** Extract reusable logic into `src/app/core/services/util.service.ts`.

---

## Phase 3: Cleanup & Verification 

**Dead Code:** Remove unused imports, commented-out code, temporary console logs.

**Naming:** Verify PascalCase classes, kebab-case selectors, `is`/`has` boolean flags throughout.

**CSS Alignment:** If any local styles were touched during refactor → invoke `cssLayer` skill.

---

## Completion Gate

Output: `"Refactored [Component/Service] for elegance. Moved [X] functions to core/utils and converted [Y] variables to Signals."`

If the refactor touches critical business logic → invoke QA Engineer for verification before committing.

---

## Cursor Tip
> For simple code cleaning and naming fixes, use Composer 2.0 (Fast/Flash) — all naming and dead code removal is pattern-driven.
> Reserve Gemini 1.5 Pro for Phase 2 only when restructuring logic or applying architectural patterns.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.