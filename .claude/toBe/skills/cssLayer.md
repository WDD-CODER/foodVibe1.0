Skill: css-layer (Lite)

Context: Triggered before creating or editing any .scss or .css file in src/.
Standard: Follows Section 4 of the Master Instructions for engine placement.

Workflow Phases

Phase 1: Token & Engine Audit [Procedural — Haiku/Composer (Fast/Flash)]

Engine Search: Scan src/styles.scss for existing .c-* engine classes that can be composed before writing new styles.

Constraint Check: Ensure no .c-* classes are being defined inside component-local SCSS files (Hard Rule: Section 4).

Phase 2: Structural Authoring [Procedural — Haiku/Composer (Fast/Flash)]

Logical Properties: Use margin-inline, padding-block, etc., instead of left/right/top/bottom.

Five-Group Rhythm: Apply the standard property order:

Layout (display, flex, grid)

Dimensions (width, height, aspect-ratio)

Content (typography, colors)

Structure (margin, padding, border)

Effects (transition, shadow, opacity)

Phase 3: Complexity Review [High Reasoning — Sonnet/Gemini 1.5 Pro]

Abstraction: If a set of styles is being repeated across >2 components, propose a new .c-* engine class for src/styles.scss.

Performance: Optimize for layout stability (avoiding CLS) and minimizing selector depth.

Efficiency Notes

Standard Styling: Use procedural models (Haiku/Flash/Composer Fast) for 90% of CSS/SCSS tasks.

Engine Creation: Use high-reasoning models (Sonnet/Pro) ONLY when designing new global layout engines.

Cursor Tip: CSS is highly pattern-driven. Use Composer 2.0 (Fast/Flash) for all styling work to maintain high speed and low cost.

Completion Gate

Verify no inline styles were added.

Verify responsive breakpoints follow the project's standard tokens.