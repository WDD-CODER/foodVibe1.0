# Unified scaling chip component

## Goal

- Replace the current inline primary "scaling chip" (unit dropdown + counter) in the recipe header with a **single reusable component** that contains:
  - **custom-select** (unit, chip variant) — label always visible, no truncation.
  - **app-counter** (amount) — keeps existing behavior (value cell width grows/shrinks via `--value-width`).
- The **chip container** must grow/shrink with content: when the counter value or the unit label changes, the chip width follows (no fixed width).

## Implementation plan

### 1. Custom-select: content-sized width in chip variant

- When `variant === 'chip'`, use `.custom-select-wrap--chip` so the wrap has `width: max-content` and `min-width: 0`.

### 2. Create shared scaling-chip component

- **Location**: `src/app/shared/scaling-chip/`
- **Inputs**: value, unit, unitOptions, minAmount, variant, showRemove
- **Outputs**: valueChange, unitChange, createUnit, remove
- **Template**: div.scaling-chip + custom-select (variant chip) + app-counter + optional remove button
- **Styling**: @layer components.scaling-chip; inline-flex chip, variant primary/secondary, remove button

### 3. Recipe-header: use scaling-chip for primary chip

- Replace primary chip block with `<app-scaling-chip>`; add primaryUnitOptions_() and onScalingChipAmountChange(); remove activePrimaryEdit_ / setActivePrimaryEdit if only used by primary.
- Trim recipe-header SCSS: remove .scaling-chip.primary layout moved to shared component; keep .scaling-dock-grid, .primary-chip-wrapper, .scaling-chip.secondary for now.

### 4. Secondary chips (later)

- Not in scope; component API supports showRemove and remove output.

### 5. Tests and registration

- Extend recipe-header spec so primary chip still updates amount/unit. Register lucide "x" if used in scaling-chip (remove button).

## File summary

| Action | File |
|--------|-----|
| Modify | custom-select.component.scss — chip wrap width max-content |
| Create | scaling-chip.component.ts | html | scss |
| Modify | recipe-header.component.html — app-scaling-chip for primary |
| Modify | recipe-header.component.ts — options computed, handler, remove primary dropdown state |
| Modify | recipe-header.component.scss — trim primary chip styles |
