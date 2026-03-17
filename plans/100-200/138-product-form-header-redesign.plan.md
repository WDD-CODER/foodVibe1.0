# Product Form Header and Layout Redesign

## Current state

- **product-form.component.html** — The header (`.form-header`) is a **sibling** of the form: it sits in `.product-form-container` above `<form class="form-container">`. The white card (glass background, rounded corners, shadow) is only the form; the header and the green top border live outside it, which creates the "wasted" top area.
- **Redundant copy** — In edit mode the subtitle "עדכון נתונים במנוע התמחור הרקורסיבי" is shown; remove it.
- **product-form.component.scss** — `.form-header` is styled under `.product-form-container` (lines 19–38). The container has `border-top: 4px solid var(--color-primary)` and transparent background; the card styling is on `.form-container` (lines 47–56).

## Target state

- One clear card: header + form content + actions all inside the same visual container.
- No redundant edit-mode subtitle.
- Tighter, better-looking header (compact spacing, clear hierarchy).
- SCSS changes follow cssLayer skill (tokens from `src/styles.scss`, five-group vertical rhythm).

---

## 1. HTML changes — product-form.component.html

- **Move the header into the form** — Make `<header class="form-header">...</header>` the first child of `<form class="form-container" ...>`, so the card wraps both header and form body.
- **Remove the redundant edit-mode subtitle** — Delete the line: `<p class="subtitle">עדכון נתונים במנוע התמחור הרקורסיבי</p>`.
- **Add mode** — Keep the existing add-mode subtitle (`{{ 'add_product_subtitle' | translatePipe }}`).

Resulting structure:

```html
<div class="product-form-container" [class.edit-mode]="isEditMode_()">
  <form ... class="form-container" dir="rtl">
    <header class="form-header">...</header>
    <!-- rest of form: form-section, form-actions, etc. -->
  </form>
</div>
```

---

## 2. SCSS changes — product-form.component.scss

- **Header inside the card** — Move `.form-header` rules from `.product-form-container` into `.form-container`.
- **Compact header** — Less margin/padding; thin `border-block-end` with `var(--border-default)` or soft accent; keep h2 hierarchy and edit-mode `var(--color-primary)`; keep `.subtitle` for add mode (small, muted).
- **Container vs card** — Keep green `border-top` on `.product-form-container` as page accent or move subtler accent to card; prefer one clear card.
- **Compliance** — Use existing tokens; five-group vertical rhythm; logical properties.

---

## 3. Optional

- **Spec** — Update product-form.component.spec.ts if tests assert on removed text or header position.

---

## Files to touch

| File | Action |
|------|--------|
| product-form.component.html | Move header into form; remove edit-mode subtitle. |
| product-form.component.scss | Move `.form-header` under `.form-container`; compact and refine header. |
| product-form.component.spec.ts | Only if tests reference removed text or DOM structure. |
