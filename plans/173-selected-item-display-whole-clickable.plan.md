---
name: Selected-item-display whole clickable
overview: Make the entire selected-ingredient display area clickable in the recipe ingredients table (not only the ingredient name text), so clicking anywhere on the chip opens the ingredient search.
todos: []
isProject: false
---

# Make selected-item-display whole area clickable

## Current behavior

In [recipe-ingredients-table.component.html](src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html), the click-to-edit is attached only to the inner **span** (lines 28–29):

```html
<div class="selected-item-display">
  <span class="item-text" (click)="editingNameAtRow_.set($index)" role="button" tabindex="0"
    (keydown.enter)="editingNameAtRow_.set($index)" (keydown.space)="$event.preventDefault(); editingNameAtRow_.set($index)">{{ group.get('name_hebrew')?.value }}</span>
  <button type="button" class="clear-btn" (click)="clearIngredient(group)">...</button>
</div>
```

So only the text is clickable; padding and empty space in the chip are not.

## Desired behavior

The whole `.selected-item-display` (the chip/input-like block) should be clickable to open the ingredient search. The clear (X) button must still only clear the ingredient and must not trigger opening the search.

## Implementation

### 1. Template ([recipe-ingredients-table.component.html](src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html))

- Move the interactive behavior from the **span** to the **div**:
  - On the **div** `.selected-item-display`: add `(click)="editingNameAtRow_.set($index)"`, `role="button"`, `tabindex="0"`, `(keydown.enter)="editingNameAtRow_.set($index)"`, `(keydown.space)="$event.preventDefault(); editingNameAtRow_.set($index)"`.
- Remove those attributes from the **span**; keep the span as display-only for the name.
- On the **clear button**: keep `(click)="clearIngredient(group)"` and add `$event.stopPropagation()` so a click on the X does not bubble to the div and open the search (e.g. `(click)="clearIngredient(group); $event.stopPropagation()"` or a small handler that stops propagation and calls `clearIngredient`).

### 2. Styles ([recipe-ingredients-table.component.scss](src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss))

- Before editing SCSS, read and apply [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) (per workspace rules).
- In `.selected-item-display`, add `cursor: pointer` in the **Effects** group (per cssLayer five-group ordering) so the entire chip looks clickable.

## Out of scope

- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) also has a `.selected-item-display` for preparation name, but that block currently has no click-to-edit on the text; the toFix item targets **app-recipe-ingredients-table** only. No change there unless you later add the same "whole area clickable" behavior to the workflow component.

## Verification

- Click on the ingredient name text → opens ingredient search.
- Click on the padding/empty area of the same chip (not on the X) → opens ingredient search.
- Click on the X → clears the ingredient only; search does not open.
- Keyboard: focus the chip (Tab), Enter/Space → opens search. Clear button remains focusable and separate.
