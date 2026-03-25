---
name: techdebt
description: Scans for duplicated code, dead code, style violations, and TODO debt — run before PRs, after features, or at session end.
---

# Skill: techdebt

**Trigger:** End of development session, before a PR, after large features, or user says "audit tech debt" / "cleanup" / "check todos".

**Style Violation Rules (inline — no guide read required):**
- Flag: `@Input`/`@Output` decorators → replace with `input()`, `output()`, `model()`
- Flag: `BehaviorSubject` → replace with `signal()`
- Flag: `any` types → replace with explicit types
- Flag: semicolons in TypeScript files
- Flag: components or services exceeding 300 lines → refactor candidate
- Flag: temporary auth bypasses or hardcoded keys → security risk, must fix before PR
- Reusable logic → move to `shared/` or `core/utils/`

---

## Scope Modes

- **Working-tree mode** (invoked from `commit-to-github` [S-full] Phase 0): scope = only files staged for commit
- **Full-project mode** (invoked at session end): scope = all of `src/app/`
- **Fast-path skip:** If no `.ts` files are in scope → skip entirely and report clean

---

## Phase 1: Static Analysis `[Procedural — Haiku/Composer (Fast/Flash)]`

**Duplicate Detection:** Scan for redundant utility functions or UI patterns that should move to `shared/` or `core/utils/`.

**Dead Code:** Identify unused imports, variables, and commented-out code blocks.

**TODO Audit:** Scan for `// TODO` or `// FIXME` comments — categorize by urgency (critical / nice-to-have).

**Style Violations:** Flag all violations listed in the rules above.

---

## Phase 2: Logic & Complexity Pruning 

> **Only invoke if** style violations, refactor candidates, or security flags were found in Phase 1.

**Refactor Candidates:** Identify components or services exceeding 300 lines — propose split strategy.

**Signal Optimization:** Identify imperative logic convertible to declarative Signals or `computed()` values.

**Security Surface:** Verify no temporary auth bypasses or hardcoded keys remain — these are blocking, must be resolved before PR.

---

## Phase 3: Documentation & Sync `[Procedural — Haiku/Composer (Fast/Flash)]`

**Breadcrumb Check:** Run `update-docs` skill to ensure navigation maps reflect the cleaned state.

**Ledger Update:** Mark completed items in `.claude/todo.md` — move unresolved debt to a dedicated "Tech Debt" section.

---

## Completion Gate

Output: `"Tech debt audit complete. [X] unused imports removed, [Y] TODOs logged, [Z] components flagged for refactor."`

If critical logic was changed → invoke QA Engineer for verification before committing.

---

## Cursor Tip
> Tech debt cleanup is pattern-matching and deletion. Use Composer 2.0 (Fast/Flash) for ~90% of this work (Phases 1 + 3).
> Reserve Gemini 1.5 Pro for Phase 2 only when determining how to decouple complex logic or optimize Signal architecture.
> Credit-saver: ~67% of this skill is Flash-eligible.