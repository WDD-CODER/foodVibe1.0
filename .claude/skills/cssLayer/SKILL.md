---
name: cssLayer
description: Enforces the foodVibe 1.0 CSS architecture — engine placement, five-group rhythm, and token tier rules — before any SCSS/CSS file is written or edited.
---

# Skill: cssLayer

**Trigger:** Before creating or editing any `.scss` or `.css` file in `src/`.
**Standard:** Follows Section 4 (UI, CSS & Folder Structure) of the Master Instructions for engine placement, token rules, and property ordering.

---

## Phase 1: Token & Engine Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Engine Search:** Scan `src/styles.scss` for existing `.c-*` engine classes composable before writing new styles.

**Constraint Check — Hard Rule (Section 4):**
- `.c-*` engine classes belong **only** in `src/styles.scss`
- Never define a `.c-*` class inside a component `.scss` — Angular view encapsulation scopes it and breaks cross-component reuse
- If a `.c-*` is found in a component file → move to `src/styles.scss` before proceeding

**Shared UI Check:** Scan `src/app/shared/` for composable patterns before writing new markup.

---

## Phase 2: Structural Authoring `[Procedural — Haiku/Composer (Fast/Flash)]`

Apply the **Five-Group Vertical Rhythm** in every selector:

1. **Layout** — `display`, `flex`, `grid`, `position`
2. **Dimensions** — `width`, `height`, `aspect-ratio`
3. **Content** — typography, colors, `content`
4. **Structure** — `margin`, `padding`, `border`
5. **Effects** — `transition`, `shadow`, `opacity`

Separate each group with a blank line. Use logical properties (`margin-inline`, `padding-block`) instead of physical directional values. Use native CSS nesting syntax.

---

## Phase 3: Complexity Review `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Only invoke if** styles are repeated across more than two components.

**Abstraction:** Propose a new `.c-*` engine class for `src/styles.scss`.

**Performance:** Optimize for layout stability (avoid CLS) and minimal selector depth.

---

## Completion Gate

- No inline styles added (unless value is dynamic/runtime)
- Responsive breakpoints follow project standard tokens
- No `.c-*` class defined in any component `.scss` file

---

## Cursor Tip
> CSS is highly pattern-driven. Use Composer 2.0 (Fast/Flash) for **all** styling work (Phases 1 & 2) — ~90% of this skill is procedural.
> Reserve Gemini 1.5 Pro for Phase 3 **only** when designing a new global `.c-*` engine class.
> Credit-saver: Highest Flash-eligible ratio in the registry (~90%).
