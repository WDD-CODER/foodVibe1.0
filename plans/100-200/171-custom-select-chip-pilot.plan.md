---
name: Custom select chip pilot
overview: Refactor CustomSelectComponent to support a "chip" variant that matches the recipe header's unit dropdown (trigger, options, add-new row, and behavior), then use it in the recipe-ingredients-table unit column as the first pilot.
todos: []
isProject: false
---

# Custom Select Chip Variant — Pilot in Recipe Ingredients Table

## Goal

- Make CustomSelectComponent support the **same look and behavior** as the current recipe header unit dropdown (chip trigger, menu-item options, add-new row, dropdown centered under trigger).
- Keep existing **default** variant for other usages (bordered full-width trigger).
- **Pilot** the chip variant in app-recipe-ingredients-table (unit column) only. Once this works, the same component can be rolled out elsewhere (including the header) with `variant="chip"`.
- **Multi-select / chips**: This refactor is single-select only.

---

## Reference: Recipe Header Chip Styling

- **Trigger** (`.unit-switcher-btn`): pill, no border, primary text (0.85rem, weight 800), padding 0.5rem inline / 0.125rem block, hover `var(--color-primary-soft)`, chevron size 10.
- **Options** (`.menu-item`): padding 0.75rem/0.5rem, `var(--color-text-secondary)`, 0.85rem, weight 600, hover `var(--bg-muted)`.
- **Add-new** (`.menu-item-create`): same + primary color, weight 700, `border-block-start: 1px solid var(--border-default)`.

---

## Phase 1: Add Chip Variant to CustomSelectComponent

### 1.1 Inputs

- Add `variant = input<'default' | 'chip'>('default')`.
- Add `addNewValue = input<string>('__add_unit__')` for add-new option styling.

### 1.2 Template

- Root wrap: `[class.custom-select-wrap--chip]="variant() === 'chip'"`.
- Button branch: `[class.custom-select-trigger--chip]="variant() === 'chip'"`, chevron `[size]="variant() === 'chip' ? 10 : 14"`.
- Options: `[class.custom-select-option--chip]="variant() === 'chip'"`, `[class.custom-select-option--add-new]="opt.value === addNewValue()"`.

### 1.3 Chip styles (custom-select.component.scss, cssLayer)

- `.custom-select-trigger--chip`: pill, no/minimal border, primary text, 0.85rem, weight 800, padding 0.5rem/0.125rem, hover primary-soft.
- `.custom-select-option--chip`: menu-item match (padding, color, font, hover bg-muted); keep highlighted for keyboard.
- `.custom-select-option--chip.custom-select-option--add-new`: menu-item-create (primary, weight 700, border-block-start); override default add-new left border.

---

## Phase 2: Pilot in Recipe Ingredients Table

- On unit column `app-custom-select`: add `variant="chip"`.
- Remove `::ng-deep .col-unit .custom-select-trigger` block in recipe-ingredients-table.component.scss.
- Verify build and behavior (chip trigger, dropdown, add-new, valueChange/onUnitChange).

---

## Phase 3: Later Rollout

- Recipe header: replace custom unit markup with app-custom-select + variant="chip".
- Other screens: add variant="chip" where header look is desired; leave default for dense forms.
