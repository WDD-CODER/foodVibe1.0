# Unit creator: TranslatePipe + focus flow

## 1. Template: Hebrew via TranslatePipe

**File:** [src/app/shared/unit-creator/unit-creator.component.html](src/app/shared/unit-creator/unit-creator.component.html)

- Replace every user-facing string with a translation key and `| translatePipe` (same pattern as add-equipment-modal).
- Add stable DOM ids for focus targets: `id="unit-creator-name"` on the name input, `id="unit-creator-amount"` on the amount input (basis unit already has `triggerId="unit-creator-basis-unit"`).
- Map strings to keys: `unit_creator_title`, `unit_name`, `unit_name_placeholder`, `amount`, `basis_unit_label`, `net_cost_calculated`, `cancel`, `approve_and_save_unit`. Error block uses `errorMessage_() | translatePipe` (component stores translation keys).

## 2. Component: TranslatePipe and focus on open

**File:** [src/app/shared/unit-creator/unit-creator.component.ts](src/app/shared/unit-creator/unit-creator.component.ts)

- Import and add `TranslatePipe`, `TranslationService`, `KeyResolutionService`; add `TranslatePipe` to `imports`.
- Focus name input when modal opens: `effect()` that depends on `isOpen_()`; when true, `setTimeout(() => document.getElementById('unit-creator-name')?.focus(), 0)`.
- Add `onNameLeave()` (async): on Enter/Tab from name — if empty or `resolveUnit(trimmed)` exists → focus amount; else `ensureKeyForContext(trimmed, 'unit')`; if key returned → focus amount.
- Add `focusAmountInput()`: `document.getElementById('unit-creator-amount')?.focus()`.
- Use error **keys** in `errorMessage_.set(...)` (e.g. `unit_already_on_product`, `unit_save_error`).

## 3. Name field: resolve on Enter/Tab and move focus to amount

- Template: name input has `(keydown.enter)` and `(keydown.tab)` calling `onNameLeave($event)` with `$event.preventDefault()`.
- Handler: trimmed name; if empty → focus amount. If `translationService.resolveUnit(trimmed)` → focus amount. Else `await keyResolution.ensureKeyForContext(trimmed, 'unit')`; if key → focus amount.

## 4. Amount field: Enter/Tab → focus basis unit select

- Keep `(keydown.enter)="$event.preventDefault(); focusBasisUnitSelect()"`. Optionally add `(keydown.tab)` to focus basis for symmetry.

## 5. Error messages: use keys

- Component and unit-registry set/return translation keys; template: `{{ errorMessage_() | translatePipe }}`.
- Dictionary: add `unit_creator_title`, `unit_name`, `unit_name_placeholder`, `basis_unit_label`, `net_cost_calculated`, `approve_and_save_unit`, `unit_already_on_product`, `unit_save_error`, `cancelled_by_user`, `unit_name_empty`.

## 6. Files to touch

| File | Changes |
|------|--------|
| unit-creator.component.html | TranslatePipe for all strings; ids on name/amount inputs; keydown.enter/tab on name; error \| translatePipe |
| unit-creator.component.ts | TranslatePipe, TranslationService, KeyResolutionService; effect focus name; onNameLeave, focusAmountInput; error keys |
| public/assets/data/dictionary.json | Add keys under general |
| unit-registry.service.ts | Return error keys in result.error (e.g. unit_already_on_product, cancelled_by_user, unit_name_empty, unit_save_error) |
