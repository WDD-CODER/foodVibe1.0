---
name: cssLayer
description: Unified CSS protocol; enforces Native Nesting, Vertical Rhythm property grouping, and Theme-driven Variable architecture.
---

# Skill: CSS & Styling Standards

## 1. Architecture & Global Hierarchy
* **Entry Point**: `src/style/main.css` (The master manifest).
* **Directory Structure**:
    * `style/setup/`: Variables (`var.css`) and Typography (`typography.css`).
    * `style/basics/`: Global Reset, Layout utilities, and Base element styles.
    * `style/cmps/`: Global component styles (Only for shared/common elements).
* **Angular Scoping**: For page-specific styles, use **Scoped `<style>` blocks** within the `.ts` or `.html` component files, following the same Vertical Rhythm rules.
* **Prohibition**: Strictly **FORBIDDEN** to use SCSS/Sass, CSS Modules, or Inline Styles.

## 2. Modern Implementation & Units
* **Layout Engine**: Default to `display: flex` or `display: grid`.
* **Sizing**: Use `rem` for layout/typography and `em` for component-relative spacing. Avoid `px`.
* **Nesting**: Use **Native CSS Nesting**. Use the `&` selector for clarity when nesting pseudo-classes (`&:hover`) or state classes (`&.active`).
* **Icons**: Use `lucide-angular` exclusively.

## 3. Theme & Variable Logic
* **Injection**: All colors/tokens must use `var(--token-name)`.
* **Reactivity**: Theme values must react to the `theme_` signal state.
* **Definition**: Define all tokens in `style/setup/var.css` under `:root` (light) and `.theme-dark` (dark).

## 4. Vertical Rhythm & Property Grouping
* **Strict Rule**: Every selector MUST group properties using a **single blank line** between the five functional categories.
* **Property Ordering**:
    1. **Layout**: `display`, `position`, `top`, `left`, `z-index`, `flex`, `grid`, `align-items`, `justify-content`.
    
    2. **Dimensions/Spacing**: `width`, `height`, `margin`, `padding`, `gap`.
    
    3. **Content**: `background-color`, `color`, `font-size`, `font-weight`, `line-height`, `text-decoration`.
    
    4. **Structure**: `border`, `border-radius`, `box-shadow`, `overflow`, `visibility`.
    
    5. **Effects/Interactions**: `cursor`, `transition`, `transform`, `animation`.

## 5. Visual Example (The Agent Pattern)
```css
.recipe-card {
  display: flex;
  flex-direction: column;

  padding: 1.5rem;
  gap: 1rem;

  background-color: var(--bg-surface);
  color: var(--text-primary);

  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);

  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
}