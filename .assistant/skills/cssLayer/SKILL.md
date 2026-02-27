---
name: cssLayer
description: Unified CSS Protocol; enforces designated global tokens file, three-tier token placement, Five-Group Vertical Rhythm, and Engine-based Unification.
---

# Skill: CSS & Styling Standards

## 1. Architecture & Global Hierarchy
1. **Environment Agnostic** : Detect project context. Use .scss (SCSS syntax) for Angular/Sass projects and .css (Native Nesting) for standard web projects.
2. **Universal Nesting** : Always use nesting (Native & for CSS or SCSS nesting). Use & for pseudo-classes (&:hover), state modifiers (&.is-active), and child elements.
3. **Encapsulation** :
Angular: Use Component-Scoped SCSS. Avoid ::ng-deep for internal logic.
Vue/React/Vanilla: Use <style scoped> or modular files where available.
4. **Zero Inline**: Strictly PROHIBITED: style="..." attributes.
5. **Tailwind Override**: Use Tailwind utility classes only for minor, non-reusable layout adjustments (e.g., flex-1, m-auto) to avoid selector bloat.

## 2. Designated Global Tokens File
* **Path**: `src/styles.scss` — the single file that holds app-wide CSS variables.
* **Location**: Root variables live in a `:root { ... }` block in that file (e.g. `--bg-warm`, `--color-accent`, `--radius-sm`).
* **Purpose**: For properties reused **across the application** (backgrounds, borders, colors, radii, shadows). Read this file before creating or editing component styles; reuse existing tokens where they fit.

## 3. Unification Rule (Mandatory)
1.  **Unify First**: Before creating a selector, search for an existing **Engine** (e.g., `.c-button`, `.c-card`, `.c-chip`).
2.  **Engines & Modifiers**: Use shared blocks and apply modifiers (e.g., `.c-button.primary`) instead of one-off classes.
3.  **Token placement (three tiers)**:
    * **Rule bodies**: Use `var(--token)` and `rem`/`em` when a token is used. Exception: when "No token" tier applies, the value may be used literally in the rule.
    * **Global**: Value reused in **multiple components or pages** → define in `src/styles.scss` inside `:root`; use `var(--name)` everywhere. If a suitable token is missing, add it to `:root` and use it in the component(s).
    * **Component-scoped**: Value reused **only inside the current component** (e.g. several times in the same file) → define in that file's `:host { --local-name: value; }`; use `var(--local-name)` only in that file.
    * **No token**: Value used **once or twice** in the component → do not create a token; use the value directly in the rule.
4.  **Before styling (workflow)**: Before creating or editing any component `.scss`/`.css`: (1) Read `src/styles.scss`. (2) Reuse existing `:root` variables where they apply. (3) For any new value, decide tier (global / component-scoped / no token) and create or reference tokens accordingly.
5.  **Token naming**: Global tokens: use a consistent scheme (e.g. `--color-*`, `--bg-*`, `--radius-*`, `--shadow-*`). Component-scoped: use a prefix or suffix to avoid collisions (e.g. `--ml-bg` for menu-library).
6.  **Where hex/px are allowed**: (a) In `src/styles.scss` inside `:root { --name: value; }`. (b) In component `:host { --local: value; }` token definitions. (c) In rule bodies only when "No token" applies (value used 1–2 times in the file). Everywhere else use `var(--...)` and `rem`/`em`.

## 4. Vertical Rhythm (The Five Groups)
Every selector MUST group properties into these five blocks, separated by **exactly one blank line**. Omit empty groups.

1.  **Layout**: `display`, `position`, `top`, `right`, `bottom`, `left`, `inset`, `z-index`, `flex`, `grid`, `align-items`, `justify-content`, `place-items`.
2.  **Dimensions**: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `margin`, `padding`, `gap`, `aspect-ratio`.
3.  **Content/Typo**: `background`, `background-color`, `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`, `text-decoration`.
4.  **Structure**: `border`, `border-radius`, `box-shadow`, `outline`, `overflow`, `opacity`, `visibility`.
5.  **Effects**: `cursor`, `transition`, `transform`, `animation`, `pointer-events`, `user-select`.

## 5. Per-Selector Checklist
1.  [ ] Can I reuse an existing Engine (`.c-`)?
2.  [ ] Did I check `src/styles.scss` and apply the three-tier rule (global / component-scoped / no token)?
3.  [ ] Are properties sorted into the 5 groups?
4.  [ ] Is there a blank line between each group?
5.  [ ] Are values using tokens (`var(--)`) and `rem`/`em` where a token applies?
6.  [ ] Did I use Logical Properties (e.g., `margin-inline`)?

## 6. Master Pattern (The "Expected" Output)
```css
/* CORRECT: Grouped, Tokenized (from src/styles.scss or :host), Unified */
.c-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding-inline: 1.5rem;
  height: var(--size-md);
  gap: 0.5em;

  background-color: var(--bg-primary);
  color: var(--text-on-primary);
  font-weight: var(--font-bold);

  border-radius: var(--radius-sm);
  border: none;

  transition: filter 0.2s ease;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```
