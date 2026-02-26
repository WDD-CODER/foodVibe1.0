# Recipe builder: focus, labor-time UX, and type-change save

**Overview:** Fix three recipe-builder behaviors: (a) focus and tab order after adding a workflow item and Tab skips +/- buttons; (b) labor-time inline edit so one click shows a focused input; (c) allow changing recipe/dish type on save and show specific error messages.

---

## Status after review

### Already implemented (no change needed)

- **a. Focus after add:** Preparation workflow effect uses `setTimeout(0)` to focus the new row’s instruction textarea and emits `focusRowDone`. Dish workflow passes `focusTrigger` and `rowIndex` to `app-preparation-search`, which focuses the search input when they match. Parent wires `(addItem)="addNewStep()"` and `(focusRowDone)="focusWorkflowRowAt_.set(null)"`.
- **a. Tab (preparation):** Labor-time minus/plus already have `tabindex="-1"` in recipe-workflow.component.html.
- **b. Labor-time one-click:** `#laborTimeInput` is on the input; `@ViewChildren('laborTimeInput')` and `enterLaborTimeEdit` with `setTimeout` focus are implemented. Span has `(focus)="enterLaborTimeEdit(i)"` for keyboard. **Bug to fix:** only one labor-time input exists in the DOM at a time, so focus must use `laborTimeInputs?.get(0)` instead of `get(index)`.

### Still to do

- **a. Tab (dish):** Add `tabindex="-1"` to the dish quantity minus and plus buttons so Tab skips them.
- **b. Labor-time:** In `enterLaborTimeEdit`, use `laborTimeInputs?.get(0)` (not `get(index)`) when focusing, since only one labor-time input is rendered at a time.
- **c. Type change on save:** In `KitchenStateService.saveRecipe`, detect when the user changed type (previous entity was recipe vs dish and current payload is the other). For type change: delete the old entity by id, then create the new one (add recipe or add dish) with the built payload without reusing `_id`. Show appropriate success message.
- **c. Specific error on save failure:** In `saveRecipe`’s `catchError`, use `err?.error?.message || err?.message || errorMsg` so backend/API errors are shown to the user.

---

## a. Focus and tab order

- **Done:** Focus effect for preparation; focusTrigger/rowIndex for dish; prep labor buttons `tabindex="-1"`.
- **Todo:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) — add `tabindex="-1"` to dish quantity minus and plus buttons (col-prep-qty).

---

## b. Labor-time one-click

- **Done:** `#laborTimeInput`, `ViewChildren('laborTimeInput')`, `enterLaborTimeEdit` with setTimeout focus; span `(focus)` for keyboard.
- **Todo:** [recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts) — in `enterLaborTimeEdit`, focus with `this.laborTimeInputs?.get(0)?.nativeElement?.focus()` (only one input in DOM when editing).

---

## c. Type change and error message

- **Todo:** [kitchen-state.service.ts](src/app/core/services/kitchen-state.service.ts):
  1. In `saveRecipe`, set `previousIsDish` from `previous` (e.g. `previous.recipe_type_ === 'dish'` or prep/mise presence). If `isUpdate && previous && previousIsDish !== isDish`: delete old entity (`deleteRecipe(previous)` or dish delete), then add new (add recipe or add dish) with payload that omits or clears `_id`. Record version/activity and show success.
  2. In `catchError`, use `err?.error?.message || err?.message || errorMsg` (with safe fallback) and pass to `onSetErrorMsg`.

---

## Summary

| Item | Done | Todo |
|------|------|------|
| a | Focus + prep tabindex="-1" | Dish qty buttons tabindex="-1" |
| b | #laborTimeInput, ViewChildren, focus in enterLaborTimeEdit | Use get(0) in enterLaborTimeEdit |
| c | — | Type-change delete+create; specific error in catchError |
