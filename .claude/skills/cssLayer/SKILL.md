---
name: cssLayer
description: Enforces the project CSS architecture — engine placement, five-group rhythm, and token tier rules — before any SCSS/CSS file is written or edited.
---

# Skill: cssLayer
**Model Guidance:** Use Haiku/Flash for Phases 1 and 2. Use Sonnet for Phase 3 only when designing a new global `.c-*` engine class.

**Trigger:** Before creating or editing any `.scss` or `.css` file in `src/`.

**CSS Rules (inline — no guide read required):**
- `.c-*` engine classes belong **only** in `src/styles.scss` — never inside a component `.scss`
- Angular view encapsulation will scope `.c-*` defined in components, breaking cross-component reuse
- If a `.c-*` is found in a component file → move to `src/styles.scss` before proceeding
- No inline styles unless the value is dynamic/runtime
- Logical properties only: `margin-inline`, `padding-block` — no physical directional values
- Responsive breakpoints must follow project token definitions

---

## Phase 1: Token & Engine Audit 

**Engine Search:** Scan `src/styles.scss` for existing `.c-*` engine classes that can be composed before writing new styles.

**Component Scan:** Check all component `.scss` files in scope for any `.c-*` definitions → move any found to `src/styles.scss`.

**Shared UI Check:** Scan `src/app/shared/` for composable patterns before writing new markup.

---

## Phase 2: Structural Authoring 

Apply the **Five-Group Vertical Rhythm** in every selector — in this order, each group separated by a blank line:

1. **Layout** — `display`, `flex`, `grid`, `position`
2. **Dimensions** — `width`, `height`, `aspect-ratio`
3. **Content** — typography, colors, `content`
4. **Structure** — `margin`, `padding`, `border`
5. **Effects** — `transition`, `shadow`, `opacity`

Use logical properties throughout (`margin-inline`, `padding-block`). Use native CSS nesting syntax.

---

## Phase 3: Complexity Review 

> **Only invoke if** the same styles are repeated across more than two components.

**Abstraction:** Propose a new `.c-*` engine class for `src/styles.scss` — name it, define it, register it. Then replace the repeated styles in each affected component file with the new `.c-*` class.

**Performance:** Optimize for layout stability (avoid CLS) and minimal selector depth.

---

## Completion Gate

- No inline styles added (unless value is dynamic/runtime)
- Responsive breakpoints follow project token definitions
- No `.c-*` class defined in any component `.scss` file
- Five-Group Vertical Rhythm applied to every new/edited selector

---

## Cursor Tip
> CSS is highly pattern-driven. Use Composer 2.0 (Fast/Flash) for **all** styling work (Phases 1 & 2) — ~90% of this skill is procedural.
> Reserve Gemini 1.5 Pro for Phase 3 **only** when designing a new global `.c-*` engine class.
> Credit-saver: Highest Flash-eligible ratio in the registry (~90%).