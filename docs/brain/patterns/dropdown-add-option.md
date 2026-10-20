# Pattern: one add option and one keyboard helper for every dropdown

## Problem

Each dropdown built its own "add" option and arrow-key code. The result: bare "הוסף" labels, two add
buttons in one list, searches that matched the stored English key instead of the Hebrew label, the raw
typed text written into the field after an add, and arrow keys that wrapped or moved focus into the list.
The Human had to re-explain the same rule per dropdown (plans 398, 400, 401).

## Solution

1. Follow the add-option rule in `docs/agent/standards-domain.md` (one add option, label, search by
   on-screen label, select the stored key, keyboard).
2. Prefer the shared selects (`custom-select`, `custom-multi-select`, `chip-search-dropdown`); pass
   `addNewLabelKey`, and `[allowTypedAdd]="true"` only when the add flow can take the typed name.
3. For a page-level picker, use `core/utils/add-option.util.ts` + `shared/add-option-row` for the add
   option and `core/utils/keyed-picker-search.util.ts` (`KeyedPickerSearch`) for the keyboard.
4. After an add, resolve the stored key from the registry/result (`resolveAddedKey`), not from the text.
5. Filter by "contains", prefix matches first (`filterOptionsByLabel`); an exact typed name hides the add
   option entirely; every add opens its window prefilled with the typed name; after the window saves,
   `notifyItemAdded` shows `"<name>" נוסף` (plan 416 — found in the Human's validation of 400–402).
6. Units and suppliers prefill too (plan 418): `openUnitCreator({ prefillName })`,
   `AddSupplierFlowService.open(name)`. Wait for a new unit with `awaitUnitCreated()` — a bare
   `unitAdded$.pipe(take(1))` stays open after a cancel and fills the cancelled field with the next unit
   added anywhere.

## When to use

Building or changing any dropdown or search picker. Do not use it for list-page toolbar "add" buttons
or form commit buttons — those are not dropdown add options.

See also: plans 398, 400, 401, 402, 416, 418.
