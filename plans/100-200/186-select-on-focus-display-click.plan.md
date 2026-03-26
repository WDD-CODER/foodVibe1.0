# Select-on-focus and whole-area click for selected-item-display

## Goal
- Clicking **anywhere** on the selected-item-display (except the clear button) enters edit mode and focuses the search input.
- When the input receives focus, **all text is selected** (select-on-focus) so typing replaces it.

## Current state
- **Ingredients**: Only the `<span class="item-text">` is clickable; clicking it sets `editingNameAtRow_.set($index)` and shows `app-ingredient-search` with `initialQuery`. The search input has no SelectOnFocus and is not auto-focused when shown in edit mode.
- **Workflow (prep name)**: No click-to-edit; when `preparation_name` is set only the display is shown. There is no edit mode or `initialQuery` on `app-preparation-search`.

## Implementation

### 1. Recipe ingredients table

**File: recipe-ingredients-table.component.html**
- Move the click and keyboard handlers from the inner `<span class="item-text">` to the wrapping `<div class="selected-item-display">` so the **whole** display is the hit target for entering edit mode.
- Keep the span for display only (no handlers). Add `(click)="$event.stopPropagation()"` on the **clear button** so clicking it does not trigger edit mode and still runs `clearIngredient(group)`.
- Ensure the div has `role="button"`, `tabindex="0"`, and `(keydown.enter)` / `(keydown.space)` with `preventDefault` where needed for accessibility.

### 2. Ingredient search: SelectOnFocus + focus when initialQuery set

**File: ingredient-search.component.html**
- Add the existing `SelectOnFocus` directive to the search `<input>`.

**File: ingredient-search.component.ts**
- Import and add `SelectOnFocusDirective` to the component `imports`.
- In the existing effect that reacts to `initialQuery()` and sets `searchQuery_.set(q)`, after setting the query schedule a single focus call: `setTimeout(() => this.focus(), 0)`.

### 3. Recipe workflow: edit mode for preparation name

**File: recipe-workflow.component.ts**
- Add `editingPreparationNameAtRow_ = signal<number | null>(null)`.
- In `onPreparationSelected`, set `editingPreparationNameAtRow_.set(null)`.

**File: recipe-workflow.component.html**
- Show `app-preparation-search` when **either** `!group.get('preparation_name')?.value` **or** `editingPreparationNameAtRow_() === i`. When in edit mode, pass the current name as an initial query (new input on preparation-search).
- In the `selected-item-display` block: add click handler on the **wrapper div** that sets `editingPreparationNameAtRow_.set(i)` and keyboard handlers for accessibility. On the clear button use `(click)="$event.stopPropagation(); clearPreparation(group)"`.

### 4. Preparation search: initialQuery, SelectOnFocus, and focus on open

**File: preparation-search.component.html**
- Add `SelectOnFocus` to the search `<input>`.

**File: preparation-search.component.ts**
- Add optional `initialQuery = input<string>('')`.
- Add an effect: when `initialQuery()` is non-empty, set `searchQuery_.set(initialQuery().trim())`, set `showResults_.set(true)`, and in a `setTimeout(() => this.focusSearch(), 0)` focus the input.
- Import and add `SelectOnFocusDirective` to the component `imports`.

## Files to touch (summary)

| Area | File | Change |
|------|------|--------|
| Ingredients table | recipe-ingredients-table.component.html | Whole-div click + keyboard, clear button stopPropagation |
| Ingredient search | ingredient-search.component.html | Add SelectOnFocus on input |
| Ingredient search | ingredient-search.component.ts | Import directive; in initialQuery effect call focus() after setTimeout |
| Workflow | recipe-workflow.component.ts | Add editingPreparationNameAtRow_, clear it in onPreparationSelected |
| Workflow | recipe-workflow.component.html | Show search when editingPreparationNameAtRow_ === i with initialQuery; div click + clear stopPropagation |
| Preparation search | preparation-search.component.html | Add SelectOnFocus on input |
| Preparation search | preparation-search.component.ts | Add initialQuery input, effect to set query + focus, import SelectOnFocusDirective |
