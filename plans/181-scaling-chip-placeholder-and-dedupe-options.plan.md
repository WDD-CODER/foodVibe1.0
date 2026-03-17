# Scaling-chip placeholder and duplicate-option fix

## Goal

1. Placeholder: Use "choose" (Hebrew) for the unit select in scaling-chip.
2. Duplicate options: Deduplicate by translated label in custom-select so one option per display label (e.g. one "גרם" when searching gram).

## Implementation

- scaling-chip.component.html: placeholder="choose".
- custom-select.component.ts: In filteredOptions_, after building base list (filtered or rest), deduplicate by translated label; when duplicate display, prefer option where value === current value.
- dictionary.json: Add "choose": "בחר" in general.

## File summary

| Action | File |
|--------|------|
| Modify | scaling-chip.component.html |
| Modify | custom-select.component.ts |
| Modify | dictionary.json |
