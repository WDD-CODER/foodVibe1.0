# angularComponentStructure Test Suite

## Metadata
- skill_file: .claude/skills/angularComponentStructure/SKILL.md
- version: 1.0
- last_updated: 2026-04-03

## Test Cases

### TC-001: Standard Component Creation
**Prompt**: |
  Create a new component for displaying recipe cards in a grid layout

**Expected Behaviors**:
- [ ] Creates component with `standalone: true` in decorator
- [ ] Sets `changeDetection: ChangeDetectionStrategy.OnPush` in decorator
- [ ] Uses `inject()` for all dependency injection — no constructor injection
- [ ] Generates four-file split: .ts, .html, .scss, .spec.ts (or notes spec is deferred)
- [ ] Class sections follow strict order: INJECTED → INPUTS → OUTPUTS → SIGNALS & CONSTANTS → COMPUTED SIGNALS → CRDUL methods

**Anti-Patterns** (should NOT happen):
- [ ] Uses `@NgModule` or declares component in a module
- [ ] Uses `constructor(private service: Service)` for injection
- [ ] Uses `ChangeDetectionStrategy.Default` or omits change detection
- [ ] Defines `.c-*` CSS classes in component .scss instead of src/styles.scss

### TC-002: Signal-Based Reactivity
**Prompt**: |
  Add a search filter with reactive state to this component — it should
  filter a list of recipes by name as the user types

**Expected Behaviors**:
- [ ] Uses `signal()` for internal state (the search query)
- [ ] Uses `computed()` for derived state (the filtered list)
- [ ] Uses `input()` function for component inputs — not `@Input()` decorator
- [ ] Uses `output()` function for component outputs — not `@Output()` decorator
- [ ] Exposes public state via `.asReadonly()` if needed

**Anti-Patterns** (should NOT happen):
- [ ] Uses `BehaviorSubject` or classic RxJS for simple local state
- [ ] Uses `@Input()` / `@Output()` decorators instead of signal-based API
- [ ] Uses `effect()` where `computed()` would suffice

### TC-003: Component With CRDUL Methods
**Prompt**: |
  Build a recipe management component that can create, read, update,
  delete, and list recipes from a service

**Expected Behaviors**:
- [ ] CRDUL methods grouped in this exact order: Create, Read, Delete, Update, List
- [ ] Each CRDUL method is clearly identifiable in its group
- [ ] Service dependencies use `inject()` — not constructor injection
- [ ] Class section order maintained: INJECTED services come first, then INPUTS, then OUTPUTS, then SIGNALS, then COMPUTED, then CRDUL methods

**Anti-Patterns** (should NOT happen):
- [ ] CRDUL methods scattered throughout the class without grouping
- [ ] Methods ordered alphabetically instead of by CRDUL convention
- [ ] Uses `any` type for method parameters or return values

### TC-004: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Fix the MongoDB connection timeout in the backend server

**Expected Behaviors**:
- [ ] Skill does NOT activate — this is a backend/database task, not Angular component work
- [ ] No Angular component structure guidance given
- [ ] Response addresses the actual MongoDB issue without referencing component patterns

**Anti-Patterns** (should NOT happen):
- [ ] Skill activates and gives Angular component guidance for a non-Angular task
- [ ] Response includes boilerplate component structure when none was asked for

### TC-005: Trigger Boundary — SHOULD Activate
**Prompt**: |
  Refactor the recipe-header component to clean up the class structure

**Expected Behaviors**:
- [ ] Skill activates — "refactoring an Angular component" matches the trigger
- [ ] Checks existing component against the mandatory class section order
- [ ] Identifies sections that are out of order and proposes reordering
- [ ] Verifies Lucide icons used in template are registered in app.config.ts
- [ ] Checks for `.c-*` class definitions in component .scss — flags for move to styles.scss

**Anti-Patterns** (should NOT happen):
- [ ] Skill does not activate for a component refactoring request
- [ ] Rewrites the component from scratch instead of reordering existing code
- [ ] Ignores the Lucide icon registration check
