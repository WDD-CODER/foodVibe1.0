---
name: Cook View UX Overhaul
overview: "Overhaul the cook-view page with: disabled minus at 0, unit selector per ingredient, always-visible workflow container, premium styling, inline edit mode with save/undo/confirm/diff, and overall fun/premium feel."
todos:
  - id: a-disable-minus
    content: Disable minus button when quantity is at minimum
    status: pending
  - id: c-workflow-always
    content: Always show workflow container with empty-state text
    status: pending
  - id: d-premium-styling
    content: Premium styling overhaul (warm colors, shadows, spacing, icons)
    status: pending
  - id: f-fun-touches
    content: Fun/premium touches (icons, animations, badges)
    status: pending
  - id: b-unit-selector
    content: Unit selector dropdown per ingredient row with conversion
    status: pending
  - id: e-edit-mode
    content: "Inline edit mode: editable ingredients/workflow, save/undo, diff, confirm modal, guard"
    status: pending
isProject: false
---

# Cook View UX Overhaul

## Files involved

- cook-view.page.html, cook-view.page.ts, cook-view.page.scss
- scaling.service.ts, dictionary.json, app.routes.ts
- KitchenStateService.saveRecipe, IngredientSearchComponent (reuse in edit mode)

## (a) Disable minus button at 0

- Add `[disabled]="targetQuantity_() <= (isDish_() ? 1 : 0.01)"` to the minus button.
- Style `.qty-btn:disabled` with reduced opacity and `cursor: not-allowed`.

## (b) Unit selector on ingredients

- Add `ScaledIngredientRow.availableUnits: string[]` in ScalingService.
- Replace col-unit text with `<select>` per ingredient row; store overrides in `unitOverrides_`; convert amounts when unit changes.

## (c) Always show workflow container

- Always render workflow section: dish = "Prep list" (empty state if no prep); preparation = "Prep workflow" (empty state if no steps).

## (d) Premium styling overhaul

- Header: warm gradient, larger name, shadow. Quantity: pill-shaped, accent color. Table: alternating warm tint, rounded corners. Workflow: card-style, step numbers. Section titles: icons. Page: warm background, cost as badge.

## (e) Inline edit mode

- editMode_, originalRecipe_; Edit → Save/Undo; shell gets .edit-mode (yellowish bg). Ingredients: search + qty +/- + unit select + add/remove row. Workflow: editable steps or prep rows. Diff styling; confirm modal on save; pendingChangesGuard on cook route.

## (f) Premium/fun touches

- Icons (flask-conical, timer, utensils), cost chip, empty state with icon, transitions.

## Dictionary keys

edit_mode, save_changes, undo_changes, no_steps_defined, no_preparations_defined, start_cooking

## Implementation order

1. (a) Disable minus  2. (c) Workflow always  3. (d+f) Styling + icons  4. (b) Unit selector  5. (e) Edit mode
