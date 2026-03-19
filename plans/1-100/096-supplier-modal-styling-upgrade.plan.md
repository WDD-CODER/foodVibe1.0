---
name: Supplier modal styling upgrade
overview: Upgrade the supplier modal's styling to match the app's Liquid Glass modal engines (c-modal-body, c-input-stack, c-modal-actions), make the form the reference pattern for future form modals, and ensure all styles follow the cssLayer skill (tokens, five-group rhythm, reuse).
todos:
  - Align supplier form with shared modal pattern when embedded (h3, c-modal-body, c-input-stack, c-modal-actions)
  - Delivery days via c-filter-options--inline + c-filter-option
  - Supplier form SCSS: rely on engines, minimal overrides only
  - Add reference comment to supplier-modal for reuse pattern
---

# Supplier modal styling upgrade (reference for reuse)

## Current state

- **Supplier modal** (`src/app/shared/supplier-modal/supplier-modal.component.html`) uses the shared overlay and card (`.c-modal-overlay`, `.c-modal-card--md`) but delegates all content to `app-supplier-form`.
- **Supplier form** (`src/app/pages/suppliers/components/supplier-form/`) uses a **custom** structure (`.supplier-form-container`, `.form-header`, `.form-body`, `.form-actions`) and does not use `.c-modal-body`, `.c-input-stack`, or `.c-modal-actions`.
- **Other modals** (add-item, label-creation, add-equipment) use: `<h3>`, `.c-modal-body`, `.c-input-stack full-width`, `.c-modal-actions`.

## Target pattern (reference structure)

- **Title:** `<h3>` inside the card.
- **Body:** One `<div class="c-modal-body">` containing form fields.
- **Fields:** Each label+input in `<div class="c-input-stack full-width">`.
- **Footer:** `<div class="c-modal-actions">` with Cancel (`c-btn-ghost`) and primary (`c-btn-primary`).

## Implementation

1. **Supplier form (modal mode):** When `embeddedInDashboard()` is true, render h3 + c-modal-body + c-input-stack (full-width) per field + c-modal-actions; delivery days via `.c-filter-options.c-filter-options--inline` and `.c-filter-option` for global checkbox styling.
2. **Supplier form (page mode):** Keep existing layout (form-header, form-body, form-actions) for standalone page.
3. **Supplier form SCSS:** Remove duplication of engine styles; keep only component-specific overrides in `@layer components.supplier-form`.
4. **Supplier modal:** Add short HTML comment documenting the reference form-modal structure for reuse.

## Design tokens and conventions

- Follow `.claude/skills/cssLayer/SKILL.md`: use `var(--…)` from `src/styles.scss`, `rem`/`em`, five-group property order.
