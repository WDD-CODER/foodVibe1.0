---
name: cssLayer
description: Enforces the project CSS architecture — engine class placement, style group rhythm, and token tier rules — before any stylesheet file is written or edited.
---

# Skill: cssLayer
**Model Guidance:** Use Haiku/Flash for Phases 1 and 2. Use Sonnet for Phase 3 only when designing a new global engine class.

**Trigger:** Before creating or editing any `.scss` or `.css` file.

**CSS Rules (inline — no guide read required):**
- `[CSS_ENGINE_PREFIX]-*` engine classes belong **only** in `[CSS_GLOBAL_STYLES_FILE]` — never inside a component stylesheet
- Framework view encapsulation (if applicable) will scope engine classes defined in components, breaking cross-component reuse
- If an engine class is found in a component file → move to the global styles file before proceeding
- No inline styles unless the value is dynamic/runtime
- Logical properties only: `padding-inline`, `padding-block`, `margin-inline` — no physical directional values
- Responsive breakpoints must follow project token definitions — never hardcode pixel values
- **No hardcoded values** — use CSS custom properties (`var(--*)`) for ALL colors, shadows, radii, blur, and easing. The design system tokens exist for exactly these values

> **[PLACEHOLDER]** After running `/init-repo`, fill in:
> - `[CSS_ENGINE_PREFIX]` — the prefix for engine/global CSS classes (e.g., `.c-` in Angular projects)
> - `[CSS_GLOBAL_STYLES_FILE]` — the global styles entry point (e.g., `src/styles.scss`)
> - `[CSS_BREAKPOINT_VARS]` — breakpoint variable names from your project's design tokens

---

## Phase 1: Token & Engine Audit 

**Theme Alignment:** Read the design system tokens at the top of `[CSS_GLOBAL_STYLES_FILE]`. Identify which tokens apply to the component type you're about to style — surface tokens, semantic tokens, radius tokens, shadow tokens. Every value you write should map to one of these.

**Engine Search:** Scan `[CSS_GLOBAL_STYLES_FILE]` for existing engine classes that can be composed before writing new styles. Composing an engine means adding it as an HTML class on the host element — not replicating its properties in the component stylesheet.

**Component Scan:** Check all component stylesheet files in scope for any engine class definitions → move any found to `[CSS_GLOBAL_STYLES_FILE]`.

**Shared UI Check:** Scan the project's shared components directory for composable patterns before writing new markup.

---

## Phase 2: Structural Authoring 

Apply the **Five-Group Vertical Rhythm** in every selector — in this order, each group separated by a blank line:

1. **Layout** — `display`, `flex`, `grid`, `position`, `gap`, `z-index`
2. **Dimensions** — `width`, `height`, `aspect-ratio`
3. **Content** — typography, colors, `content`
4. **Structure** — `margin`, `padding`, `border`, `border-radius`
5. **Effects** — `transition`, `animation`, `shadow`, `opacity`

Use logical properties throughout (`margin-inline`, `padding-block`). Use native CSS nesting syntax. Place responsive breakpoint blocks after the base selector — never before the base styles.

---

## Phase 3: Complexity Review 

> **Only invoke if** the same styles are repeated across more than two components.

**Abstraction:** Propose a new engine class for `[CSS_GLOBAL_STYLES_FILE]` — name it, define it, register it. Then replace the repeated styles in each affected component file with the new engine class.

**Performance:** Optimize for layout stability (avoid CLS) and minimal selector depth.

---

## Completion Gate

- No inline styles added (unless value is dynamic/runtime)
- Responsive breakpoints use design token variables — no hardcoded pixel values
- No engine class defined in any component stylesheet file
- Five-Group Vertical Rhythm applied to every new/edited selector
- No hardcoded colors, shadows, radii, or blur values — every value uses `var(--*)` or a design token variable
