# angularComponentStructure Test Suite

## Metadata
- skill_file: .claude/skills/angularComponentStructure/SKILL.md
- version: 2.0
- last_updated: 2026-04-04

## Test Cases

### TC-001: Standard Component Creation
**Prompt**: |
  Create a new component for displaying recipe cards in a grid layout

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "standalone: true" — skill must require standalone decorator
- GREP: "ChangeDetectionStrategy.OnPush" — skill must require OnPush change detection
- GREP: "inject()" — skill must require inject() for dependency injection
- GREP: "four-file split" — skill must specify four-file output (.ts/.html/.scss/.spec.ts)
- GREP: "INJECTED" — skill must name the INJECTED section in class order
- GREP: "CRDUL" — skill must name the CRDUL section in class order

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The class section order rule lists sections in the correct sequence: INJECTED → INPUTS → OUTPUTS → SIGNALS & CONSTANTS → COMPUTED SIGNALS → CRDUL methods
- [ ] The section order rule is presented as strict/mandatory — not optional guidance

**Anti-Patterns** (machine-verified):
- GREP-NOT: "@NgModule" — skill must not recommend NgModule-based declarations
- GREP-NOT: "constructor(" — skill must not use constructor injection syntax in any example

**Behavior Checks** (behavioral execution — unkammable layer):
- RUN_AGENT: "Create an Angular component for displaying a user profile with a name and avatar"
  → OUTPUT-GREP: "signal("
  → OUTPUT-GREP: "inject("
  → OUTPUT-GREP-NOT: "constructor("
  → OUTPUT-GREP-NOT: "@Input("
  → OUTPUT-GREP: "OnPush"

### TC-002: Signal-Based Reactivity
**Prompt**: |
  Add a search filter with reactive state to this component — it should
  filter a list of recipes by name as the user types

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "signal()" — skill must mention signal() for internal state
- GREP: "computed()" — skill must mention computed() for derived state
- GREP: "input()" — skill must specify input() function (not decorator)
- GREP: "output()" — skill must specify output() function (not decorator)
- GREP: "asReadonly()" — skill must mention asReadonly() for public state exposure
- GREP-NOT: "BehaviorSubject" — skill must not recommend BehaviorSubject for local state

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The skill is specific enough that a developer would choose signal() over a plain class property for reactive state
- [ ] The skill warns against effect() where computed() would suffice

### TC-003: Component With CRDUL Methods
**Prompt**: |
  Build a recipe management component that can create, read, update,
  delete, and list recipes from a service

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "Create, Read, Delete, Update, List" — skill must list CRDUL order explicitly
- GREP: "explicit TypeScript types" — skill must require explicit types (implies no any)

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] The CRDUL method ordering rule clearly identifies the sequence: Create, Read, Delete, Update, List — in that order
- [ ] The class section ordering rule places CRDUL methods last (after INJECTED, INPUTS, OUTPUTS, SIGNALS, COMPUTED)
- [ ] The skill is specific enough that a developer would know to group all CRDUL methods together, not scatter them
- [ ] The ordering is presented as non-negotiable (strict enforcement, not a preference)

**Anti-Patterns** (machine-verified):
- GREP-NOT: "alphabetical" — skill must not suggest alphabetical method ordering

**Behavior Checks** (behavioral execution — unkammable layer):
- RUN_AGENT: "Create a RecipeListComponent with an input for the recipe list and a delete method"
  → OUTPUT-GREP-BEFORE: "inject(" BEFORE "input("
  → OUTPUT-GREP-BEFORE: "input(" BEFORE "signal("
  → OUTPUT-GREP-NOT: "@Output("

### TC-004: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Fix the MongoDB connection timeout in the backend server

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] Skill does NOT activate — this is a backend/database task, not Angular component work
- [ ] No Angular component structure guidance given
- [ ] Response addresses the actual MongoDB issue without referencing component patterns

**Anti-Patterns** (machine-verified):
- GREP-NOT: "MongoDB" — trigger rules must not inadvertently include backend keywords

> Note: Trigger-boundary TCs are exempt from the 70% machine-check target. Trigger activation is inherently interpretive.

### TC-005: Trigger Boundary — SHOULD Activate
**Prompt**: |
  Refactor the recipe-header component to clean up the class structure

**Concrete Checks** (machine-verified by `test-runner.sh`):
- GREP: "app.config.ts" — skill must mention Lucide icon registration in app.config.ts
- GREP: "src/styles.scss" — skill must reference styles.scss for .c-* class enforcement

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% weight):
- [ ] Skill activates — "refactoring an Angular component" matches the trigger
- [ ] Checks existing component against the mandatory class section order
- [ ] Identifies sections that are out of order and proposes reordering
- [ ] Verifies Lucide icons used in template are registered in app.config.ts
- [ ] Checks for `.c-*` class definitions in component .scss — flags for move to styles.scss

**Anti-Patterns** (machine-verified):
- GREP-NOT: "rewrite" — skill must not instruct a full rewrite when refactoring is asked
