---
name: angular-pipe-logic
description: Scaffolds, implements, and tests Angular Pipes and Directives following the project's reactivity and purity standards.
---

# Skill: angular-pipe-logic
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only when transformation logic involves complex domain mapping.

**Trigger:** Before creating or refactoring an Angular Pipe or Directive.

**Pipe/Directive Rules (inline — no guide read required):**
- `standalone: true` — always
- Pipes: implement `PipeTransform`, `transform()` must be pure — same inputs → same outputs, no I/O or shared state mutation
- Directives: use `inject(ElementRef)` or `inject(Renderer2)` — no constructor injection
- Signal inputs: ensure transformation is optimized for reactive change detection
- Export pipe/directive if intended for shared use
- `.spec.ts` only during `commit-to-github` Phase 0 or explicit user request

---

## Phase 1: Structural Scaffolding 

**File Creation:** Generate standard `.ts` and `.spec.ts` files in the appropriate directory (`core/pipes/` or `shared/directives/`).

**Boilerplate:**
- `standalone: true`
- Pipes: implement `PipeTransform`
- Directives: `inject(ElementRef)` or `inject(Renderer2)` as needed — no constructor injection

---

## Phase 2: Logic Implementation`

> **Only invoke for complex transformation logic.** Simple pipes (string formatting, date display) can stay in Flash.

**Pure Transformation:** Verify `transform()` method (Pipes) or internal logic (Directives) is strictly pure — same inputs always produce same outputs, no side effects.

**Signal Integration:** If the pipe handles Signal inputs → ensure transformation is optimized for reactive change detection and doesn't break `OnPush`.

**Complex Mapping:** For specialized domain logic (e.g. unit conversion display, multi-format output) → align with core domain rules in project guide.

---

## Phase 3: Registry & Testing 

**Export Check:** If the pipe/directive is intended for shared use → confirm it is exported from the appropriate module or barrel file.

**Unit Tests:** Write `.spec.ts` focusing on boundary values and expected transformation output. Test pure logic only — no DOM in pipe specs.

---

## Completion Gate

Output: `"Angular [Pipe/Directive] [Name] created. Logic verified as pure and registered for use."`

Run targeted specs to confirm transformation logic before finishing.

---

## Cursor Tip
> Pipes and Directives are small, focused units. Use Composer 2.0 (Fast/Flash) for Phase 1 and Phase 3.
> Reserve Gemini 1.5 Pro for Phase 2 **only** when transformation logic involves complex mathematics or domain-specific data mapping.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.