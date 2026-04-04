# cssLayer Test Suite

## Metadata
- skill_file: .claude/skills/cssLayer/SKILL.md
- version: 2.0
- last_updated: 2026-04-04

## Test Cases

### TC-001: New Component SCSS
**Prompt**: |
  Style the new recipe-card component — add layout for a grid card with
  padding, a header image, and a hover shadow effect

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "styles.scss" — skill must reference styles.scss for engine class placement
- GREP: "Five-Group" — skill must name the Five-Group Vertical Rhythm
- GREP: "Layout" — skill must name Group 1
- GREP: "Effects" — skill must name Group 5
- GREP: "padding-inline" — skill must mention logical property for inline padding
- GREP: "padding-block" — skill must mention logical property for block padding
- GREP: "logical" — skill must mention logical properties concept

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The Five-Group order is presented as strict/mandatory sequence (Layout → Dimensions → Content → Structure → Effects) — not optional guidance
- [ ] Phase 1 clearly requires scanning `src/styles.scss` BEFORE writing any new styles — the ordering is explicit

**Anti-Patterns** (machine-verified):
- GREP-NOT: "padding-left" — skill must not use physical directional properties in examples
- GREP-NOT: "padding-right" — skill must not use physical directional properties in examples
- GREP-NOT: "margin-left" — skill must not use physical directional properties in examples

**Behavior Checks** (behavioral execution — unkammable layer):
- RUN_AGENT: "Add styles: display flex, color red, padding 10px, width 200px, transition all 0.3s"
  → OUTPUT-GREP-BEFORE: "display" BEFORE "color"
  → OUTPUT-GREP-BEFORE: "width" BEFORE "transition"
  → OUTPUT-GREP-NOT: "padding-left"
  → OUTPUT-GREP-NOT: "padding-right"

### TC-002: Component File Contains .c-* Classes
**Prompt**: |
  I found `.c-btn-primary` and `.c-card-header` defined in recipe-builder.component.scss
  — please fix this

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: ".c-*" — skill must reference the .c-* engine class naming convention
- GREP: "src/styles.scss" — skill must specify where engine classes belong
- GREP: "view encapsulation" — skill must explain why .c-* in components breaks reuse
- GREP: "component" — skill must reference component files in the context of .c-* rules

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The skill is specific enough that a developer finding .c-* in a component file would know to MOVE them to src/styles.scss (not rename, not delete)
- [ ] The explanation of WHY (Angular view encapsulation scopes .c-* in components) is present and clear

**Anti-Patterns** (machine-verified):
- GREP-NOT: "rename" — skill must not suggest renaming .c-* classes as a fix

### TC-003: Five-Group Rhythm — Ambiguous Properties
**Prompt**: |
  Add these styles to the sidebar component:
  gap: 1rem;
  border-radius: 8px;
  color: var(--text-primary);
  width: 280px;
  transition: width 0.3s ease;
  display: flex;
  z-index: 10;
  padding-block: 1.5rem;
  animation: slide-in 0.2s ease;

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "gap" — skill must list gap as a Layout property
- GREP: "z-index" — skill must list z-index as a Layout property
- GREP: "width" — skill must list width as a Dimensions property
- GREP: "border-radius" — skill must list border-radius as a Structure property
- GREP: "transition" — skill must list transition as an Effects property
- GREP: "animation" — skill must list animation as an Effects property
- GREP: "opacity" — skill must list opacity as an Effects property

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] gap is explicitly listed under Group 1 (Layout) — not under Structure or Dimensions
- [ ] z-index is explicitly listed under Group 1 (Layout) — not under Effects
- [ ] border-radius is explicitly listed under Group 4 (Structure) — not under Dimensions
- [ ] The rule states each group is separated by exactly one blank line

**Anti-Patterns** (machine-verified):
- GREP-NOT: "gap.*Structure" — gap must not be classified under Structure
- GREP-NOT: "z-index.*Effects" — z-index must not be classified under Effects

**Behavior Checks** (behavioral execution — unkammable layer):
- RUN_AGENT: "Style a sidebar: flex column, gap 1rem, width 280px, z-index 10, opacity 0.9, transition width 0.3s"
  → OUTPUT-GREP-BEFORE: "z-index" BEFORE "opacity"
  → OUTPUT-GREP-NOT: "margin-left"

### TC-004: Repeated Styles Across Three Components
**Prompt**: |
  I notice the same card shadow + border-radius styles are duplicated in
  recipe-card.component.scss, menu-card.component.scss, and dish-card.component.scss

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "Phase 3" — skill must define Phase 3 for abstraction
- GREP: "more than two" — skill must specify the Phase 3 trigger threshold
- GREP: ".c-*" — skill must reference engine class abstraction
- GREP: "replace" — skill must instruct replacing duplicated styles with the new class

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] Phase 3 clearly states it only activates when styles repeat across MORE than two components (not two, not one)
- [ ] The skill instructs proposing, defining, AND registering a new .c-* class — all three steps are present

**Anti-Patterns** (machine-verified):
- GREP-NOT: "copy" — skill must not suggest copying styles as a solution

### TC-005: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Add a new method `onCardClick()` to the recipe-card.component.ts that
  emits a selected event

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: ".scss" — skill trigger must mention .scss files
- GREP: ".css" — skill trigger must mention .css files

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The trigger rule is scoped to .scss/.css files — a .component.ts file would NOT activate this skill
- [ ] No CSS architecture guidance would be given for a TypeScript-only change

> Note: Trigger-boundary TCs are exempt from the 70% machine-check target. Trigger activation is inherently interpretive.

<!-- source: human-validated seed | dimension: logical properties enforcement -->
### TC-006: Logical Properties — Physical Direction Rejection

**Prompt**: |
  Add styles to src/app/dishes/dish-card/dish-card.component.scss.
  The card needs 16px space on the left and right sides, 8px space at the top,
  and no space at the bottom. Style it with a 1px solid border.

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "padding-inline" — skill must require inline logical properties
- GREP: "padding-block" — skill must require block logical properties
- GREP: "margin-inline" — skill must require inline logical properties for margins
- GREP: "logical" — skill must explicitly name logical properties

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The skill is specific enough that a developer would use padding-inline (not padding-left/right) for horizontal spacing
- [ ] Border property would be placed in Group 4 (Structure) based on the Five-Group listing

**Anti-Patterns** (machine-verified):
- GREP-NOT: "padding-left" — skill must not use physical directional properties
- GREP-NOT: "padding-right" — skill must not use physical directional properties
- GREP-NOT: "margin-left" — skill must not use physical directional properties

**Behavior Checks** (behavioral execution — unkammable layer):
- RUN_AGENT: "Add 16px horizontal spacing and 8px top spacing to a card component"
  → OUTPUT-GREP: "padding-inline"
  → OUTPUT-GREP-NOT: "padding-left"
  → OUTPUT-GREP-NOT: "padding-right"

<!-- source: agent-derived | dimension: phase-1-compose-before-write -->
### TC-007: Phase 1 — Compose Existing Engine Class Before Writing New Styles

**Prompt**: |
  Add styles to src/app/menu/menu-item/menu-item.component.scss.
  The component needs a card layout: flex column, white background, rounded corners,
  and a subtle drop shadow.

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "Engine Search" — skill must have an engine search step in Phase 1
- GREP: "src/styles.scss" — skill must specify where to scan for engine classes
- GREP: "Shared UI Check" — skill must have a shared scan step in Phase 1
- GREP: "src/app/shared/" — skill must specify the shared directory to scan

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] Phase 1 ordering is clear: scan for existing .c-* classes FIRST, then compose if found — writing new styles is the fallback, not the default
- [ ] The skill explicitly prohibits defining new .c-* classes inside component .scss files

**Anti-Patterns** (machine-verified):
- GREP-NOT: "create .c-* in component" — must not suggest creating engine classes in component files

<!-- source: agent-derived | dimension: inline-styles-static-values -->
### TC-008: Inline Styles — Static Value Must Go in SCSS

**Prompt**: |
  The recipe header image needs to be exactly 240px tall with a background color
  of #1a1a2e. Add this to the recipe-header component.

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "inline" — skill must mention inline styles rule
- GREP: "dynamic" — skill must distinguish dynamic from static values
- GREP: "height" — skill must list height as a property (Dimensions group)

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The skill makes a clear distinction: inline styles are only acceptable for dynamic/runtime values, NOT for static values like fixed heights or colors
- [ ] Five-Group placement would put height in Group 2 (Dimensions) and background-color in Group 3 (Content)

**Anti-Patterns** (machine-verified):
- GREP-NOT: "style=" — skill must not show inline style attribute examples

<!-- source: agent-derived | dimension: responsive-breakpoints -->
### TC-009: Responsive Breakpoints — Must Follow Token Definitions

**Prompt**: |
  Make the dish grid responsive — it should switch from a 3-column layout to a
  1-column layout on small screens. Add this to dish-grid.component.scss.

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "breakpoint" — skill must reference breakpoints
- GREP: "token" — skill must reference project token definitions

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The skill requires using project-defined breakpoint tokens — not hardcoded pixel values like 768px
- [ ] Responsive breakpoint blocks are placed after the base selector, not before

**Anti-Patterns** (machine-verified):
- GREP-NOT: "768px" — skill must not hardcode specific breakpoint values
- GREP-NOT: "600px" — skill must not hardcode specific breakpoint values

<!-- source: agent-derived | dimension: z-index-opacity-placement -->
### TC-010: Group Placement — z-index (Layout) vs opacity (Effects)

**Prompt**: |
  Add styles to the modal overlay component: it needs to sit on top of everything
  (z-index: 1000), be semi-transparent (opacity: 0.85), cover the full viewport,
  and fade in with a 0.2s ease transition.

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "z-index" — skill must list z-index in the property groups
- GREP: "opacity" — skill must list opacity in the property groups
- GREP: "shadow" — skill must list shadow as an Effects property

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] z-index is under Group 1 (Layout) — NOT under Effects
- [ ] opacity is under Group 5 (Effects) — NOT under Layout
- [ ] transition is under Group 5 (Effects) alongside opacity and animation

**Anti-Patterns** (machine-verified):
- GREP-NOT: "z-index.*opacity" — z-index and opacity must not be in the same property list
