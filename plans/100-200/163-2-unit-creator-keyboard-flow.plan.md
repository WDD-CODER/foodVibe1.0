# Unit-creator-modal keyboard flow (Plan 163-2; PRD 2.8)

## Goal

Full keyboard flow: focus to name on open → Enter/tab to quantity → then to unit select; unit dropdown supports Arrow Up/Down without scrolling the page.

## Acceptance criteria

- Modal open: focus in "name" (search) input.
- After selecting name (Enter or mouse): focus moves to quantity.
- After quantity (Enter): focus moves to unit select; dropdown opens and Arrow Up/Down move within options (prevent default so page does not scroll).
- Tab and click into unit select also open dropdown and allow Arrow Up/Down.

## Implementation summary

1. **unit-creator:** Focus name on open (effect + afterNextRender). Add id to name and quantity inputs; Enter on name → focus quantity; quantity Enter already focuses unit select.
2. **custom-select:** When trigger (button) receives focus from Tab or programmatic focus, open dropdown; use mousedown flag so click does not double-toggle. Arrow Up/Down already call preventDefault when open.

## Files

- [unit-creator.component.html](src/app/shared/unit-creator/unit-creator.component.html)
- [unit-creator.component.ts](src/app/shared/unit-creator/unit-creator.component.ts)
- [custom-select.component.html](src/app/shared/custom-select/custom-select.component.html)
- [custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts)
