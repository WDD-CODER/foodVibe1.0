# Unify Modal Styles Across All Components

## Problem

There are **8 modal components** under `src/app/shared/`, and each one copy-pastes the same ~80 lines of overlay, card, button, actions, input, and responsive CSS:

- add-item-modal, add-equipment-modal, confirm-modal, restore-choice-modal, global-specific-modal, translation-key-modal, label-creation-modal, unit-creator

The project already has **unused engine classes** in `src/styles.scss` (`.c-modal-overlay`, `.c-modal-card`, `.c-btn-primary`, `.c-btn-ghost`) that were built for this purpose but never adopted.

## What Is Duplicated (identical or near-identical in all 8)

- `.modal-overlay` — fixed fullscreen backdrop with flex centering (only z-index differs: 1001 vs 1000)
- `.modal-card` — glass card with shadow, blur, border (only `max-width` varies: 28rem / 34rem / 90vw)
- `.modal-card h3` — title styling
- `.modal-actions` — flex row with top border
- `.btn-ghost` / `.btn-save` / `.btn-confirm` etc. — cancel and primary buttons
- `.input-stack` with label, input, select — form input pattern
- `@media (max-width: 768px)` — responsive breakpoint rules

## What Is Unique Per Modal (stays in component SCSS)

- confirm-modal: `.modal-card--danger`, `.modal-card--warning`
- restore-choice-modal: `.btn-replace`
- global-specific-modal: `.modal-detail`, `.btn-specific`
- label-creation-modal: `.color-swatches`, `.trigger-checklist`
- unit-creator: `.cost-preview`, `.math-operator`
- translation-key-modal: `.readonly-input`, `.validation-error`

## Strategy

1. **Expand engine classes in `src/styles.scss`**: Add `.c-modal-card--md`, `.c-modal-card--fluid`, `.c-modal-actions`, `.c-modal-body`, `.c-input-stack`, `.c-btn-primary--danger`, `.c-btn-primary--warning`, and modal responsive rules; add `h3` inside `.c-modal-card`.
2. **Update each modal HTML**: Use `.c-modal-overlay`, `.c-modal-card` (+ size modifier), `.c-modal-body`, `.c-input-stack`, `.c-modal-actions`, `.c-btn-ghost`, `.c-btn-primary` (and modifiers where needed).
3. **Strip each modal SCSS**: Remove duplicated rules; keep only unique component-specific styles.
4. **Normalize z-index** to 1000 for all modals.

## Estimated Impact

- ~800 lines of duplicated SCSS removed across 8 files
- Engine classes in `styles.scss` extended; each modal SCSS shrinks to unique styles only
