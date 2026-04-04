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

<!-- source: human-validated seed | dimension: logical properties enforcement -->
### TC-006: Logical Properties — Physical Direction Rejection

**Prompt**: |
  Add styles to src/app/dishes/dish-card/dish-card.component.scss.
  The card needs 16px space on the left and right sides, 8px space at the top,
  and no space at the bottom. Style it with a 1px solid border.

**Expected Behaviors**:
- [ ] Uses `padding-inline: 16px` (not `padding-left`/`padding-right`) for horizontal spacing
- [ ] Uses `padding-block-start: 8px` (not `padding-top`) for top spacing
- [ ] Uses `padding-block-end: 0` (not `padding-bottom`) for bottom spacing OR omits it if default is 0
- [ ] Places `border` property in Group 4 (Structure), not in Group 5 (Effects)

**Anti-Patterns** (should NOT happen):
- [ ] Uses `padding-left` or `padding-right` for horizontal spacing
- [ ] Uses `padding-top` for top spacing
- [ ] Uses `margin-left` or `margin-right` instead of `margin-inline`
- [ ] Places `border` in Group 5 (Effects) alongside `transition` or `animation`

<!-- source: agent-derived | dimension: phase-1-compose-before-write -->
### TC-007: Phase 1 — Compose Existing Engine Class Before Writing New Styles

**Prompt**: |
  Add styles to src/app/menu/menu-item/menu-item.component.scss.
  The component needs a card layout: flex column, white background, rounded corners,
  and a subtle drop shadow.

**Expected Behaviors**:
- [ ] Scans `src/styles.scss` for existing `.c-*` engine classes before writing any styles
- [ ] If a `.c-card-surface` or similar engine class already covers the card layout, composes it via the HTML class — does NOT rewrite the same styles in the component file
- [ ] If no matching engine class exists, writes new styles in the component file following Five-Group Rhythm
- [ ] Does NOT define a new `.c-*` class inside `menu-item.component.scss` regardless of outcome

**Anti-Patterns** (should NOT happen):
- [ ] Writes new card layout styles in the component file without first checking `src/styles.scss`
- [ ] Defines `.c-card-surface` or any `.c-*` class inside the component `.scss` file
- [ ] Skips the `src/app/shared/` scan required by Phase 1

<!-- source: agent-derived | dimension: inline-styles-static-values -->
### TC-008: Inline Styles — Static Value Must Go in SCSS

**Prompt**: |
  The recipe header image needs to be exactly 240px tall with a background color
  of #1a1a2e. Add this to the recipe-header component.

**Expected Behaviors**:
- [ ] Places `height: 240px` in the component `.scss` file under Group 2 (Dimensions) — NOT as an inline `style` attribute
- [ ] Places `background-color: #1a1a2e` in the component `.scss` file under Group 3 (Content) — NOT as an inline `style` attribute
- [ ] Applies Five-Group Rhythm with `height` in Group 2 and `background-color` in Group 3, separated by a blank line

**Anti-Patterns** (should NOT happen):
- [ ] Adds `style="height: 240px"` or `style="background-color: #1a1a2e"` to the HTML template
- [ ] Adds `[style.height]="'240px'"` binding for a value that is static (not runtime/dynamic)
- [ ] Adds `[style.backgroundColor]="'#1a1a2e'"` binding for a value that is static

<!-- source: agent-derived | dimension: responsive-breakpoints -->
### TC-009: Responsive Breakpoints — Must Follow Token Definitions

**Prompt**: |
  Make the dish grid responsive — it should switch from a 3-column layout to a
  1-column layout on small screens. Add this to dish-grid.component.scss.

**Expected Behaviors**:
- [ ] Uses the project's defined breakpoint tokens (e.g., `$bp-sm`, `$bp-md`, or CSS custom property equivalents) — NOT hardcoded pixel values like `@media (max-width: 768px)`
- [ ] Places breakpoint/responsive rules inside or after the base selector block — not before it
- [ ] Applies Five-Group Rhythm inside the responsive block (layout properties in Group 1)

**Anti-Patterns** (should NOT happen):
- [ ] Uses a hardcoded breakpoint value like `@media (max-width: 768px)` instead of a project token
- [ ] Uses `@media (max-width: 600px)` or any arbitrary pixel value not defined in the token system
- [ ] Places `grid-template-columns` in Group 4 (Structure) instead of Group 1 (Layout)

<!-- source: agent-derived | dimension: z-index-opacity-placement -->
### TC-010: Group Placement — z-index (Layout) vs opacity (Effects)

**Prompt**: |
  Add styles to the modal overlay component: it needs to sit on top of everything
  (z-index: 1000), be semi-transparent (opacity: 0.85), cover the full viewport,
  and fade in with a 0.2s ease transition.

**Expected Behaviors**:
- [ ] Places `z-index: 1000` in Group 1 (Layout) — not in Group 5 (Effects)
- [ ] Places `opacity: 0.85` in Group 5 (Effects) — not in Group 1 (Layout)
- [ ] Places `transition: opacity 0.2s ease` in Group 5 (Effects) alongside `opacity`
- [ ] Places `width: 100vw` and `height: 100vh` in Group 2 (Dimensions)

**Anti-Patterns** (should NOT happen):
- [ ] Places `z-index` in Group 5 (Effects) because "it affects how the element appears"
- [ ] Places `opacity` in Group 1 (Layout) because "it controls element visibility"
- [ ] Places `z-index` and `opacity` in the same group
