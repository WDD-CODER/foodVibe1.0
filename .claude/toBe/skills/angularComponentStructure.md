Skill: angular-component-structure (Lite)

Context: Triggered before creating or refactoring any Angular component class.
Standard: Follows Section 3 (Reactivity) and Section 4 (Styles/Folder) of the Master Instructions.

Workflow Phases

Phase 1: Boilerplate Generation [Procedural — Haiku/Composer (Fast/Flash)]

File Creation: Generate the standard four-file split (unless inlineTemplate is requested): .ts, .html, .scss, .spec.ts.

Class Skeleton:

Use standalone: true.

Use changeDetection: ChangeDetectionStrategy.OnPush.

Implement inject() for all service dependencies.

Phase 2: Reactive State Definition [High Reasoning — Sonnet/Gemini 1.5 Pro]

Signal Mapping: Define the internal state using signal().

Derived State: Identify and implement computed() values to prevent unnecessary effects.

API Definition: Use input(), output(), and model() for component communication per Section 3 standards.

Phase 3: Template & Style Integration [Procedural — Haiku/Composer (Fast/Flash)]

HTML: Apply double quotes and Lucide Icon registry checks (Section 8).

SCSS: Apply css-layer (logical properties and property order).

Engine Check: Ensure no .c-* classes are defined locally; use existing engines from src/styles.scss.

Phase 4: Unit Test Strategy [High Reasoning — Sonnet/Gemini 1.5 Pro]

Spec Logic: Define the core testing requirements for the component logic.

Signal Testing: Ensure the .spec.ts correctly triggers and asserts signal changes.

Efficiency Notes

Scaffold & Markup: Use procedural models (Haiku/Flash/Composer Fast) for 80% of the work (Phase 1 & 3).

State Logic: Use high-reasoning models (Sonnet/Pro) ONLY for the Signal/Logic architecture (Phase 2 & 4).

Cursor Tip: For adding standard UI components, stay in Composer 2.0 (Fast/Flash). It is excellent at following the boilerplate patterns defined in the Master Instructions.

Completion Gate

Output: "Component [Name] created with [X] signals and [Y] inputs. Verifying Lucide registry..."

Update .claude/todo.md and proceed to the next atomic task.