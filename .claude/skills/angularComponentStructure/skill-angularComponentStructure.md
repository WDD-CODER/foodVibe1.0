---
name: angularComponentStructure
description: Defines the mandatory class structure, section ordering, and CRDUL method grouping for every Angular component in foodVibe 1.0.
---

# Skill: angularComponentStructure

**Trigger:** Before creating or refactoring any Angular component class.
**Standard:** Follows Section 3 (Angular 19 & Reactivity) and Section 4 (Styles/Folder Structure) of the Master Instructions.

---

## Phase 1: Boilerplate Generation `[Procedural — Haiku/Composer (Fast/Flash)]`

**File Creation:** Standard four-file split: `.ts`, `.html`, `.scss`, `.spec.ts` (unless `inlineTemplate` requested).

**Class Skeleton — mandatory:**
- `standalone: true`
- `changeDetection: ChangeDetectionStrategy.OnPush`
- `inject()` for all service dependencies (no constructor injection)

**Class Section Order (strict):**
1. INJECTED services
2. INPUTS (`input()`, `model()`)
3. OUTPUTS (`output()`)
4. SIGNALS & CONSTANTS (`signal()`, `readonly`)
5. COMPUTED SIGNALS (`computed()`)
6. CRDUL methods — Create, Read, Delete, Update, List (grouped in this order)

---

## Phase 2: Reactive State Definition `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Signal Mapping:** Define internal state using `signal()`. Expose public state via `.asReadonly()`.

**Derived State:** Implement `computed()` values to prevent unnecessary `effect()` calls.

**API Definition:** Use `input()`, `output()`, `model()` for component communication (Section 3).

---

## Phase 3: Template & Style Integration `[Procedural — Haiku/Composer (Fast/Flash)]`

**HTML:** Apply double quotes, Lucide icon registry checks (Section 8), semantic element choice.

**SCSS:** Apply cssLayer skill rules (logical properties, five-group vertical rhythm).

**Engine Check:** No `.c-*` classes defined locally — use engines from `src/styles.scss` only.

---

## Phase 4: Unit Test Strategy `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Spec Logic:** Define core testing requirements for the component's Signal-driven logic.

**Signal Testing:** Ensure `.spec.ts` correctly triggers and asserts signal changes.

> Write `.spec.ts` only during `commit-to-github` Phase 0 or when the user explicitly requests tests.

---

## Completion Gate

Output: `"Component [Name] created with [X] signals and [Y] inputs. Verifying Lucide registry..."`

Update `.claude/todo.md` and proceed to the next atomic task.

---

## Cursor Tip
> Use Composer 2.0 (Fast/Flash) for Phase 1 and Phase 3 — boilerplate and markup follow the Master patterns exactly.
> Reserve Gemini 1.5 Pro for Phase 2 (Signal architecture) and Phase 4 (test strategy) only.
> Credit-saver: ~50% of component work (Phases 1 + 3) is Flash-eligible.
