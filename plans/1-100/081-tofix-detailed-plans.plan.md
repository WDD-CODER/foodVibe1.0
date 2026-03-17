# toFix.md — Detailed Plans by Section

---

## Section 1: Sign-in / Sign-up

**Files**
- `src/app/core/components/auth-modal/auth-modal.component.ts`
- `src/app/core/components/auth-modal/auth-modal.component.html`
- `src/app/core/services/user.service.ts`

**Changes**

- **Auto-focus on open**: Add `viewChild<ElementRef>('nameInput')` to the component. Use an `effect()` that watches `modalService.isOpen()`; when it becomes `true`, call `nameInput.nativeElement.focus()` after a `setTimeout(0)` tick so the DOM is ready.
- **Dev-only existing users dropdown**: Import `isDevMode` from `@angular/core`. In the template, wrap a `<select>` or `<datalist>` that binds to `userService.users_()` inside `@if (isDevMode())`. Selecting a user fills the `name` field and moves focus to the password field via `viewChild('passwordInput')`. Add a `(change)` handler `onDevUserPick(event)` that sets `this.name` and calls `passwordInput.focus()`.
- **Enter key to submit**: Add `(keydown.enter)="onSubmit()"` on the `<form>` element (already fires `ngSubmit` on Enter in some browsers, but explicit binding ensures consistent behavior and prevents accidental page reload).
- **Field-specific error display**: Replace the single `<p class="auth-error">` block with two conditional blocks: one under the name input (`@if (errorKey() === 'user_not_found')`) and one under the password input (`@if (errorKey() === 'password_required')`). Clear `errorKey` whenever the user modifies the relevant input via `(input)="errorKey.set(null)"`.

**Enhancements beyond the spec**
- `onSubmit()` currently silently returns if `name.trim()` is empty; add a `this.errorKey.set('name_required')` guard and add the missing `name_required` translation key.
- Auto-clear the dev dropdown selection when the user manually types into the name field.

---

## Section 2: Recipe Builder — Add-new-item (quick-add-title) Default Unit

**Files**
- `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts`

**Change**

One-line fix: change the `baseUnit_` signal initializer from `signal('')` to `signal('gram')`.

```typescript
// Before
protected baseUnit_ = signal('');
// After
protected baseUnit_ = signal('gram');
```

**Enhancements beyond the spec**
- Ensure the `CustomSelectComponent` (or whatever renders the unit dropdown in the modal) visually pre-selects "gram" rather than showing a blank/placeholder — audit that the binding correctly reflects the default signal value.
- Reset back to `'gram'` (not `''`) in the `reset()` method that clears the form on save/cancel.

---

## Section 3: Recipe View (Cook View)

**Files**
- `src/app/pages/cook-view/cook-view.page.ts`
- `src/app/pages/cook-view/cook-view.page.html`
- `src/app/pages/cook-view/cook-view.page.scss`
- `src/app/core/pipes/` — add `format-quantity.pipe.ts`

**Changes**

- **Locale-aware number formatting**: Create a pure pipe `FormatQuantityPipe` in `src/app/core/pipes/format-quantity.pipe.ts`. The pipe calls `new Intl.NumberFormat('he-IL', { maximumFractionDigits: 3 }).format(value)` so that `1200` renders as `1,200` and `0.333` stays compact. Import and apply the pipe to every quantity display in the template (ingredient amounts, yield, scaled totals). Do not apply to inputs — only to read-only display.
- **Unit change before multiplication**: Add a `selectedUnit_` signal initialized to `recipe_()?.yield_unit_ ?? ''`. Add a `CustomSelectComponent` in the quantity-control row that lists all compatible units (via `unitRegistry.allUnitKeys_()` filtered to same dimension as yield unit). Compute a `convertedYieldAmount_` = `yield_amount_ * (baseConversion / selectedConversion)`. The existing `scaleFactor_` computed already divides `targetQuantity_` by yield — update it to divide by `convertedYieldAmount_` instead. This makes unit change and quantity scale fully independent.
- **Ingredient alignment**: In the cook-view ingredients grid, change the CSS so each row uses `align-items: start` (not `stretch`). Each cell (`col-name`, `col-qty`, `col-unit`, `col-cost`) should be a proper grid column with a fixed `min-width`. Use `var(--space-xs)` gap between columns.

**Enhancements beyond the spec**
- Display a small "conversion badge" (e.g. `×1.2`) next to the unit selector when the selected unit differs from the recipe's original yield unit, so the chef can immediately see the conversion factor.
- Keep the scaled unit display consistent in both the ingredient rows and the yield header badge.

---

## Section 4: Recipe Builder — Container State, Controls, and Drag-and-Drop

**Files**
- `src/app/pages/recipe-builder/recipe-builder.page.ts`
- `src/app/pages/recipe-builder/recipe-builder.page.html`
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html`
- `package.json` (add `@angular/cdk`)

**Changes**

- **Persist open/closed container state**: Add three localStorage-backed helpers in `recipe-builder.page.ts`. On `ngOnInit`, read from localStorage keys `rb_col_ingredients`, `rb_col_workflow`, `rb_col_logistics` and initialize the three `*_collapsed_` signals from them. In each collapse toggle method, write the new value back to localStorage. This is scoped globally (not per-recipe), matching the user's expectation that sections stay in their last state.

- **Remove up/down arrows from category title**: In `recipe-workflow.component.html` (dish mode), locate the category header row that renders sort/order arrows (`▲▼` buttons or `ChevronUp`/`ChevronDown` icons). Remove those button elements entirely and their associated `sortByCategory` output handler. Remove the `sortByCategory` output from the component if unused.

- **Quantity control with custom +/- buttons**: Audit `recipe-workflow.component.html` (dish mode) and `recipe-ingredients-table.component.html`. If any quantity field still uses a raw `<input type="number">` instead of the custom `incrementQuantity`/`decrementQuantity` button pair, replace it with the existing button pattern (`<button (click)="decrement()">`, `<span>{{ value }}</span>`, `<button (click)="increment()">`). The pattern already exists in the ingredient table — replicate it verbatim in the workflow table.

- **Expand/collapse by clicking anywhere on the header**: In `recipe-builder.page.html`, for each collapsible section header `<div>`, add `(click)="toggle*()"` and `style="cursor: pointer"` (via CSS class `builder-section-header--clickable`) to the entire header row div, not just the chevron icon. Ensure `$event.stopPropagation()` is on inner interactive elements (buttons, selects) inside the header so they don't also trigger collapse.

- **Drag and drop — ingredient index**:
  - Install: `npm install @angular/cdk`
  - In `recipe-ingredients-table.component.ts`, import `CdkDragDrop`, `moveItemInArray` from `@angular/cdk/drag-drop`, add `CdkDrag`, `CdkDropList` to imports.
  - Add `cdkDropList (cdkDropListDropped)="onDropIngredient($event)"` on the rows container.
  - Add `cdkDrag` and a `cdkDragHandle` grip icon (`GripVertical` from lucide) as the first column (`col-drag`) on each row.
  - In `onDropIngredient(event: CdkDragDrop<FormGroup[]>)`: call `moveItemInArray(this.ingredientsFormArray.controls, event.previousIndex, event.currentIndex)` then emit a signal so the parent recalculates costs.

- **Drag and drop — workflow steps (preparation mode)**:
  - Same CDK setup on `recipe-workflow.component`.
  - In `onDropStep(event)`: call `moveItemInArray`, then renumber `order_` fields sequentially starting at 1 (`controls.forEach((ctrl, i) => ctrl.get('order_')?.setValue(i + 1))`). This ensures step numbers always display as 1, 2, 3… regardless of drag position.
  - For dish/prep list (non-ordered), drag reorder only — no renumbering needed.

**Enhancements beyond the spec**
- Add a `cdkDragPreviewClass` to show a ghost row while dragging (subtle opacity + shadow).
- After drag, briefly highlight the dropped row with a CSS animation (e.g., a 300ms background flash) so the user sees where the item landed.

---

## Section 5: Maison Plus (Recipe Builder — Dish Preparation List)

This section targets `recipe-workflow.component` in `type() === 'dish'` mode — the flat preparation grid where mise-en-place items are listed with category, quantity, and unit.

**Files**
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss`

**Changes**

- **Row style**: The current `prep-flat-grid` rows lack visual separation. Add a `border-bottom: 1px solid var(--color-border-subtle)` between rows, increase row `padding-block` to `var(--space-sm)`, and add a hover state `background: var(--color-bg-hover)`. Each row should feel like a clean table row rather than a floating element.

- **Quantity control with custom buttons**: Confirm that `incrementQuantity(i)` / `decrementQuantity(i)` methods in the component are wired to custom `+`/`-` button elements in the HTML for the prep quantity column, matching the ingredient-table pattern. Replace any raw `<input type="number">` with the button pair + a readonly display span.

- **Category-first add flow**: Modify the "add preparation" button behavior:
  1. Clicking "add" first opens a compact inline category picker (a `CustomSelectComponent` dropdown, not a modal) rendered as a transient overlay attached to the "add" button.
  2. Once the user selects a category, the `addItem` output is emitted with the chosen category pre-filled.
  3. The parent (`recipe-builder.page.ts`) creates the new row with `category_` already set.
  4. After row creation, the `focusWorkflowRowAt_` signal is set to the new row index so `preparation-search` auto-focuses.

- **Auto-focus new empty row**: The `focusRowAt` input on `recipe-workflow` already exists. When `addItem` is emitted and the parent pushes a new `FormGroup` to `workflowFormArray`, set `focusWorkflowRowAt_.set(newIndex)`. Ensure the `preparation-search` component handles this signal and calls `.focus()` on its input.

**Enhancements beyond the spec**
- Add a colored category badge chip on each row (same visual as labels — small rounded pill using `var(--color-primary-tint)`) so the chef can scan categories at a glance without reading the full dropdown text.
- After the user completes one row (presses Enter or Tab out of the last field), automatically trigger the category picker for the next row creation, enabling rapid sequential entry.

---

## Section 6: Application-wide — "Add New" in Category and Unit Dropdowns

**Scope audit** — Every location with a category or unit dropdown:

| Location | Dropdown type | Currently has "add new"? |
|---|---|---|
| `quick-add-product-modal` | category | No |
| `quick-add-product-modal` | base unit | No |
| `add-equipment-modal` | category | Partial (separate flow) |
| `recipe-ingredients-table` | unit per row | No |
| `recipe-workflow` (dish) | category per row | No |
| `inventory product-form` | category, unit | Unknown — needs audit |

**Files**
- `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts` + `.html`
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts` + `.html`
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.ts`
- All `product-form` and `inventory` form components (audit first)

**Pattern to implement for every affected dropdown**

For **category dropdowns**:
- Append a sentinel option `{ value: '__add_category__', label: '+ הוסף קטגוריה' }` to the options array.
- In `(valueChange)` handler: when the selected value is `'__add_category__'`, call `addItemModal.open({ title: 'new_category', ... })`. On modal save: call `metadataRegistry.registerCategory(newName)`, then immediately set the dropdown's bound signal to `newName`.

For **unit dropdowns**:
- Append sentinel `{ value: '__add_unit__', label: '+ יחידה חדשה' }`.
- When selected: call `unitRegistry.openUnitCreator()`. After unit creation (via `UnitCreatorModal`'s existing close/save flow), set the dropdown signal to the newly created unit key.

**Enhancements beyond the spec**
- Extract this sentinel-plus-registration logic into a reusable helper function `appendAddNewOption<T>(options: T[], handler: () => Promise<string>): T[]` to avoid duplicating the pattern across 5+ places.
- When "add new" is triggered in the middle of a larger form (e.g., quick-add-product), dim the main modal (reduced opacity) while the nested modal is open, then restore it immediately after — giving a clear visual sense of "sub-task in progress."

---

## Section 7: Logistics — Chip Width and Keyboard Navigation

**Files**
- `src/app/pages/recipe-builder/recipe-builder.page.scss` (chip CSS)
- `src/app/pages/recipe-builder/recipe-builder.page.ts` (search keyboard handler)
- `src/app/pages/recipe-builder/recipe-builder.page.html`

**Changes**

- **Chips grid width**: Locate the logistics chip selector (likely `.logistics-chip` or `.baseline-chip`). Remove any `overflow: hidden`, `text-overflow: ellipsis`, or fixed `width`/`max-width`. Replace with:

```scss
.logistics-chip {
  width: fit-content;
  white-space: nowrap;
  min-width: 0;
}
```

The chip container grid/flex parent should use `flex-wrap: wrap` with `gap: var(--space-xs)` so chips wrap naturally without truncation.

- **Search dropdown keyboard navigation**: In `recipe-builder.page.ts`, add a `logisticsHighlightedIndex_` signal initialized to `-1`. Add a `onLogisticsSearchKeydown(event: KeyboardEvent)` method:
  - `ArrowDown`: increment index (capped at `filteredLogisticsTools_().length - 1`), prevent default scroll
  - `ArrowUp`: decrement index (floor at 0), prevent default scroll
  - `Enter`: if index ≥ 0, call `selectLogisticsTool(filteredLogisticsTools_()[logisticsHighlightedIndex_()])` and reset index to -1
  - `Escape`: close the dropdown and reset index
  In the template, bind `(keydown)="onLogisticsSearchKeydown($event)"` to the search input, and add `[class.highlighted]="logisticsHighlightedIndex_() === i"` to each dropdown item. Add a CSS rule `.highlighted { background: var(--color-primary-tint) }` and call `scrollIntoView({ block: 'nearest' })` in the handler.

**Enhancements beyond the spec**
- Reset `logisticsHighlightedIndex_` to `-1` whenever `logisticsToolSearchQuery_` changes (via `effect()`), so stale highlight doesn't persist as the list filters.
- Show a keyboard shortcut hint (e.g., `↑↓ לניווט · Enter לבחירה`) as a subtle footer inside the open dropdown.

---

## Section 8: Add-Item Modal (Equipment) — Category Quick-Save Flow

**Files**
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.ts`
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.html`

**Current behavior**: When the user picks "add new category" from the category dropdown, it goes through `AddItemModalService` for input + `ConfirmModalService` for confirmation — two extra steps.

**Changes**

Collapse this to a single step:
- When the category `CustomSelectComponent` emits `'__add_category__'`, call `addItemModal.open(categoryConfig)` directly (skip the confirm modal entirely — the input IS the confirmation).
- Use `firstValueFrom` or `.subscribe` on the modal result. On save: call `metadataRegistry.registerCategory(newName)`, then immediately set `this.category = newName` (pre-filling the equipment modal's category field).
- The equipment modal remains open with the new category already selected. The user can now type the equipment name and click save — a single uninterrupted flow.
- Remove any intermediary `ConfirmModalService` call that was part of the old two-step path.

**Enhancement**: After the category is created and pre-filled, move focus programmatically to the equipment name input so the user can continue typing without any mouse click.

---

## Section 9: Labels — Selectable Existing Labels

**Files**
- `src/app/shared/label-creation-modal/label-creation-modal.component.ts`
- `src/app/shared/label-creation-modal/label-creation-modal.component.html`
- `src/app/pages/recipe-builder/recipe-builder.page.ts`
- `src/app/pages/recipe-builder/recipe-builder.page.html`
- `metadata-manager.page.component.ts`

**Root cause**: `metadataRegistry.allLabels_()` returns `LabelDefinition[]` with `{ key, color, autoTriggers }`. Labels are recognized by key (duplicate ID check), but the UIs that need to *list and select* existing labels are not consuming `allLabels_()` properly.

**Changes**

- **Delete-label container** (locate in `metadata-manager.page.component.ts` or similar): Replace any static or text-only label display with a list of clickable label chips generated from `metadataRegistry.allLabels_()`. Each chip shows the Hebrew label name (from the translation dictionary using the key) and the label's color swatch. Selecting a chip marks it for deletion; a confirm action calls `metadataRegistry.deleteLabel(key)`.

- **Recipe builder — manual label selector**: In `recipe-builder.page.html`, the labels section (inside recipe-header or a labels row) should show:
  1. Auto-labels (read-only chips, already computed by `liveAutoLabels_`)
  2. A manual label selector: a multi-select chip list from `metadataRegistry.allLabels_()` minus auto-labels. Each chip is toggleable — clicking adds/removes the label key from `recipeForm_.get('labels')`. Currently the `labels` FormControl exists but may lack a UI to add manual labels from the full registry.
  - Bind the toggle to `toggleManualLabel(key: string)`: check if key is in `labels` value, add or remove accordingly.

- **Consistency fix**: When `LabelCreationModalService` is opened in "edit" mode and `key` already exists, the modal currently shows a validation error ("ID already used") but does not offer to SELECT or EDIT that label. Separate the two cases:
  - If key matches an existing label AND the user is in "create new" mode: show an inline warning with a link/button "This label already exists — do you want to select it instead?"
  - This resolves the inconsistency the user described.

**Enhancements beyond the spec**
- Add a color swatch dot (3×3 `border-radius: 50%` circle using the label's `color` from `LabelDefinition`) next to every label chip in both the selector and the recipe header display, making it instantly scannable.
- In the recipe builder, separate the labels display area into two visual rows: "Auto" (teal tint, read-only) and "Manual" (neutral tint, interactive toggle), with a small pill legend so the chef knows which labels fire automatically.
