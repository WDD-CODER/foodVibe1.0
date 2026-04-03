# cssLayer Test Suite

## Metadata
- skill_file: .claude/skills/cssLayer/SKILL.md
- version: 1.0
- last_updated: 2026-04-03

## Test Cases

### TC-001: New Component SCSS
**Prompt**: |
  Style the new recipe-card component — add layout for a grid card with
  padding, a header image, and a hover shadow effect

**Expected Behaviors**:
- [ ] Scans `src/styles.scss` for existing `.c-*` engine classes before writing new styles
- [ ] Checks `src/app/shared/` for composable patterns before writing markup
- [ ] Applies Five-Group Vertical Rhythm: Layout → Dimensions → Content → Structure → Effects, each group separated by a blank line
- [ ] Uses logical properties (`padding-inline`, `padding-block`) — not `padding-left`, `padding-right`
- [ ] Does NOT define any `.c-*` class inside the component `.scss` file

**Anti-Patterns** (should NOT happen):
- [ ] Writes styles without first scanning `src/styles.scss` for reusable `.c-*` classes
- [ ] Uses physical directional properties (`margin-left`, `padding-right`, `border-top`)
- [ ] Mixes CSS property groups without blank-line separation (e.g., `display` next to `color`)
- [ ] Adds inline styles to the HTML template for static values

### TC-002: Component File Contains .c-* Classes
**Prompt**: |
  I found `.c-btn-primary` and `.c-card-header` defined in recipe-builder.component.scss
  — please fix this

**Expected Behaviors**:
- [ ] Identifies that `.c-*` definitions in a component `.scss` file violate the rule
- [ ] Moves `.c-btn-primary` and `.c-card-header` definitions to `src/styles.scss`
- [ ] Removes the definitions from `recipe-builder.component.scss`
- [ ] Explains why: Angular view encapsulation scopes `.c-*` in components, breaking cross-component reuse

**Anti-Patterns** (should NOT happen):
- [ ] Leaves `.c-*` definitions in the component file
- [ ] Renames the classes instead of moving them
- [ ] Moves to a different file other than `src/styles.scss`

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

**Expected Behaviors**:
- [ ] Places `display: flex`, `gap: 1rem`, and `z-index: 10` all in Group 1 (Layout) — not scattered into other groups
- [ ] Places `width: 280px` in Group 2 (Dimensions)
- [ ] Places `color: var(--text-primary)` in Group 3 (Content)
- [ ] Places `border-radius: 8px` and `padding-block: 1.5rem` together in Group 4 (Structure)
- [ ] Places `transition: width 0.3s ease` and `animation: slide-in 0.2s ease` together in Group 5 (Effects)
- [ ] Exactly one blank line separates each group — not zero lines, not two

**Anti-Patterns** (should NOT happen):
- [ ] Places `gap` in Group 4 (Structure) because it "relates to spacing"
- [ ] Places `border-radius` in Group 2 (Dimensions) because it "relates to size"
- [ ] Places `z-index` in Group 5 (Effects) instead of Group 1 (Layout)
- [ ] Separates `transition` and `animation` into different groups

### TC-004: Repeated Styles Across Three Components
**Prompt**: |
  I notice the same card shadow + border-radius styles are duplicated in
  recipe-card.component.scss, menu-card.component.scss, and dish-card.component.scss

**Expected Behaviors**:
- [ ] Recognizes this as a Phase 3 case — same styles repeated across more than two components
- [ ] Proposes a new `.c-*` engine class (e.g., `.c-card-surface`) in `src/styles.scss`
- [ ] Names the engine class, defines it, and registers it
- [ ] Suggests replacing the duplicated styles in all three component files with the new `.c-*` class

**Anti-Patterns** (should NOT happen):
- [ ] Skips Phase 3 and just copies the styles again instead of abstracting
- [ ] Creates the `.c-*` class inside one of the component files instead of `src/styles.scss`
- [ ] Triggers Phase 3 for only TWO components (Phase 3 requires more than two)

### TC-005: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Add a new method `onCardClick()` to the recipe-card.component.ts that
  emits a selected event

**Expected Behaviors**:
- [ ] Skill does NOT activate — this is a TypeScript file change, not a `.scss` or `.css` file
- [ ] No CSS architecture guidance given
- [ ] Response focuses on the TypeScript method and event emitter

**Anti-Patterns** (should NOT happen):
- [ ] Skill activates and gives CSS guidance for a TypeScript-only task
- [ ] Mentions Five-Group Rhythm or `.c-*` engine classes unprompted
