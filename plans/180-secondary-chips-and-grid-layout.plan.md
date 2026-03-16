# Secondary scaling chips and grid layout

## Goal

1. Use `app-scaling-chip` for every secondary chip; replace inline secondary chip markup.
2. Restructure the scaling dock: Part 1 = primary chip (content-sized); Part 2 = dense container for secondary chips + add button (flex-wrap, content-sized chips).

## Implementation

- Recipe-header HTML: replace secondary @for block with app-scaling-chip loop; bind value, unit, unitOptions (getSecondaryUnitOptions), minAmount 0, variant secondary, showRemove true; valueChange/unitChange/createUnit/remove handlers.
- Recipe-header TS: add getSecondaryUnitOptions(chipIdx) (include current unit + create new); add onSecondaryScalingChipAmountChange(chipIdx, value); remove activeSecondaryEdit_, setActiveSecondaryEdit, openSecondaryUnitDropdown and related calls.
- Recipe-header SCSS: scaling-dock-grid = auto minmax(0, 1fr); secondary-units-container = flex-wrap + gap; remove .scaling-chip, .unit-switcher-btn, .counter-grid, .remove-btn, .unit-dropdown-menu secondary.
- Recipe-header spec: update tests for secondary chip DOM and amount/remove.

## File summary

| Action | File |
|--------|------|
| Modify | recipe-header.component.html |
| Modify | recipe-header.component.ts |
| Modify | recipe-header.component.scss |
| Modify | recipe-header.component.spec.ts |
