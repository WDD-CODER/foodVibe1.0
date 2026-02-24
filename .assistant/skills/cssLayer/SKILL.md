---
name: cssLayer
description: Unified CSS Protocol; enforces Five-Group Vertical Rhythm, Engine-based Unification, and Native Nesting.
---

# Skill: CSS & Styling Standards

## 1. Architecture & Global Hierarchy
* **Native Only**: Strictly **PROHIBITED**: SCSS/Sass, CSS Modules, or Inline Styles.
* **Nesting**: Use Native CSS Nesting. Use `&` for pseudo-classes (`&:hover`) and state modifiers (`&.is-active`).
* **Logic**: Prefer **scoped `<style>` blocks** in Angular components. Avoid lang="scss".

## 2. Unification Rule (Mandatory)
1.  **Unify First**: Before creating a selector, search for an existing **Engine** (e.g., `.c-button`, `.c-card`, `.c-chip`).
2.  **Engines & Modifiers**: Use shared blocks and apply modifiers (e.g., `.c-button.primary`) instead of one-off classes.
3.  **Tokens**: Zero tolerance for hex codes or raw `px`. Use `var(--token)`. Use `rem` for layout and `em` for relative spacing.

## 3. Vertical Rhythm (The Five Groups)
Every selector MUST group properties into these five blocks, separated by **exactly one blank line**. Omit empty groups.

1.  **Layout**: `display`, `position`, `top`, `right`, `bottom`, `left`, `inset`, `z-index`, `flex`, `grid`, `align-items`, `justify-content`, `place-items`.
2.  **Dimensions**: `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `margin`, `padding`, `gap`, `aspect-ratio`.
3.  **Content/Typo**: `background`, `background-color`, `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`, `text-decoration`.
4.  **Structure**: `border`, `border-radius`, `box-shadow`, `outline`, `overflow`, `opacity`, `visibility`.
5.  **Effects**: `cursor`, `transition`, `transform`, `animation`, `pointer-events`, `user-select`.

## 4. Per-Selector Checklist
1.  [ ] Can I reuse an existing Engine (`.c-`)?
2.  [ ] Are properties sorted into the 5 groups?
3.  [ ] Is there a blank line between each group?
4.  [ ] Are all values using tokens (`var(--)`) and `rem`/`em`?
5.  [ ] Did I use Logical Properties (e.g., `margin-inline`)?

## 5. Master Pattern (The "Expected" Output)
```css
/* CORRECT: Grouped, Tokenized, Unified */
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