---
name: angular-pipe-logic
description: Scaffolds, implements, and tests Angular Pipes and Directives for foodVibe 1.0 following the Master's reactivity and purity standards.
---

# Skill: angular-pipe-logic

**Trigger:** Before creating or refactoring an Angular Pipe or Directive.
**Standard:** Follows Section 3 (Architecture & Reactivity) of the Master Instructions.

---

## Phase 1: Structural Scaffolding `[Procedural — Haiku/Composer (Fast/Flash)]`

**File Creation:** Generate standard `.ts` and `.spec.ts` files in the appropriate directory (usually `core/pipes/` or `shared/directives/`).

**Boilerplate:**
- `standalone: true`
- For Pipes: implement `PipeTransform`
- For Directives: use `inject(ElementRef)` or `inject(Renderer2)` as needed

---

## Phase 2: Logic Implementation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Pure Transformation:** Ensure the `transform` method (Pipes) or internal logic (Directives) is **pure** per Section 3 (same inputs → same outputs; no I/O or mutation of shared state).

**Signal Integration:** If the pipe handles Signal inputs, ensure transformation is optimized for reactive change detection.

**Complex Mapping:** For specialized domain logic (e.g., Triple-Unit conversion display), align with the core domain rules in Section 3.

---

## Phase 3: Registry & Testing `[Procedural — Haiku/Composer (Fast/Flash)]`

**Import Check:** Ensure the new pipe/directive is exported if intended for shared use.

**Unit Tests:** Write `.spec.ts` focusing on boundary values and expected output for the transformation.

---

## Completion Gate

Output: `"Angular [Pipe/Directive] created. Logic verified as pure and registered for use."`

Run targeted specs to confirm the transformation logic before finishing.

---

## Cursor Tip
> Pipes and Directives are small, focused units. Use Composer 2.0 (Fast/Flash) for Phase 1 and Phase 3.
> Reserve Gemini 1.5 Pro for Phase 2 **only** when the transformation logic involves complex mathematics or domain-specific data mapping.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
