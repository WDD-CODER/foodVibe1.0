Skill: angular-pipe-logic (Lite)

Context: Triggered before creating or refactoring an Angular Pipe or Directive.
Standard: Follows Section 3 (Architecture & Reactivity) of the Master Instructions.

Workflow Phases

Phase 1: Structural Scaffolding [Procedural — Haiku/Composer (Fast/Flash)]

File Creation: Generate the standard .ts and .spec.ts files in the appropriate directory (usually core/pipes/ or shared/directives/).

Boilerplate:

Use standalone: true.

For Pipes: Implement PipeTransform.

For Directives: Use inject(ElementRef) or inject(Renderer2) as needed.

Phase 2: Logic Implementation [High Reasoning — Sonnet/Gemini 1.5 Pro]

Pure Transformation: Ensure the transform method (Pipes) or internal logic (Directives) is pure as defined in Section 3.

Signal Integration: If the pipe handles Signal inputs, ensure the transformation logic is optimized for reactive change detection.

Complex Mapping: For specialized domain logic (e.g., Triple-Unit conversion display), ensure the logic aligns with the core domain rules.

Phase 3: Registry & Testing [Procedural — Haiku/Composer (Fast/Flash)]

Import Check: Ensure the new pipe/directive is exported if intended for shared use.

Unit Tests: Write the .spec.ts focusing on boundary values and expected output for the transformation.

Efficiency Notes

Scaffolding: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Algorithm/Logic: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 when writing the actual transformation algorithm.

Cursor Tip: Pipes and Directives are small, focused units. Always use Composer 2.0 (Fast/Flash) for the entire lifecycle unless the transformation logic involves complex mathematics or data mapping.

Completion Gate

Output: "Angular [Pipe/Directive] created. Logic verified as pure and registered for use."

Run targeted specs to confirm the transformation logic before finishing.