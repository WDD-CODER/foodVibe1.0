# Units as dictionary + fixed system defaults

## Goals

- **Metadata manager – Units**: Manage only "which measurement units exist" (add/remove by name). Do not show or edit conversion values in this card.
- **System units**: A fixed set of units have constant, non-removable defaults and cannot be deleted or have their values overwritten. **dish** is included with value 1 (used in recipes/yield).
- **Layout**: Units card list items match the other cards (categories, etc.): no number input, same list-item structure.

## 1. System units constant and fixed values

Define a single source of truth for protected units and their immutable values (gram-equivalent for weight, ml-equivalent for volume; the app already uses one registry for both).

**System units (not removable, constant):**

- `kg` = 1000 (grams)
- `gram` = 1
- `liter` = 1000 (ml)
- `ml` = 1
- `unit` = 1
- `dish` = 1 (recipes/yield; non-removable)

**Location:** [src/app/core/services/unit-registry.service.ts](src/app/core/services/unit-registry.service.ts)

- Add a readonly constant, e.g. `SYSTEM_UNITS: Readonly<Record<string, number>>` with the above keys and values (and export it if the metadata manager needs to know which units are system).
- Use it in:
  - **Hydration** (`initUnits`): After loading from storage, always merge `SYSTEM_UNITS` over the stored `units` so system unit values are never overwritten by stored data. Ensure system keys always exist.
  - **deleteUnit**: If `unitKey` is in `SYSTEM_UNITS`, do not delete; show a short message (e.g. "לא ניתן למחוק יחידות בסיס") and return.
  - **registerUnit**: When the unit key is one of the system units, do not change its value—keep the value from `SYSTEM_UNITS` when updating the in-memory and persisted registry (so no code path can overwrite system constants).

## 2. Metadata manager – Units card (no value, layout, protect delete)

**Template** [src/app/pages/metadata-manager/metadata-manager.page.component.html](src/app/pages/metadata-manager/metadata-manager.page.component.html)

- In the `managerCard` template, remove the unit-only block that shows and updates the conversion value:
  - Remove the `@if (type === 'unit') { ... <input type="number" ... updateUnitRate ... > }` block (lines 169–173).
- For `type === 'unit'`, conditionally hide the delete button for system units: e.g. `@if (type !== 'unit' || !isSystemUnit(item))` around the delete button, and add a method or getter `isSystemUnit(unitKey: string): boolean` that checks against the same system-units set/keys (import or inject the registry and use its public system-units list or a shared constant).

**Component** [src/app/pages/metadata-manager/metadata-manager.page.component.ts](src/app/pages/metadata-manager/metadata-manager.page.component.ts)

- Remove `tempUnitRates` signal and all its usage (initialization in `ngOnInit`, updates in `updateUnitRate` and in the unit-deletion branch of `onRemoveMetadata`).
- Remove `updateUnitRate` method.
- Add `isSystemUnit(unitKey: string): boolean` (using the registry's or a shared system-units constant).

**Styles** [src/app/pages/metadata-manager/metadata-manager.page.component.scss](src/app/pages/metadata-manager/metadata-manager.page.component.scss)

- Align Units card layout with the category card:
  - For `[data-type="unit"]`, use the same list structure as category: e.g. same `.list-stack` grid as category (`minmax(115px, auto)` or similar) and `.list-item.group` with two-column grid `1fr auto` (label + delete only). Remove or override the unit-specific grid that was for the number input (currently `.manager-card[data-type="unit"] .list-stack` with `minmax(135px, auto)`).
- In the shared `.list-item.group` block (around lines 122–142), the `input` styles were only needed for the unit rate input; with that input removed, either:
  - Change the grid to `1fr auto` (two columns) for all uses of this card so category and unit both get label + delete, or
  - Scope the three-column grid and input styles to a type that still has an input (none after this change), and use `1fr auto` for unit and category.

Apply [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) when editing SCSS (tokens, five-group order, no inline styles).

## 3. Rest of app (consistency)

- **Unit creator** [src/app/shared/unit-creator/unit-creator.component.ts](src/app/shared/unit-creator/unit-creator.component.ts): No change required; it creates new units with a rate and basis. System units already exist in the registry and are not created here; if someone tried to "add" a system unit by name, the registry would treat it as existing and not overwrite its value once we add the `registerUnit` guard above.
- **Product form / recipe / inventory**: No change to how they read conversions via `getConversion()`; they already use product-level `conversion_rate_` when present and fall back to the registry. System unit values will now always be the fixed constants.
- **Tests**: Update [src/app/core/services/unit-registry.service.spec.ts](src/app/core/services/unit-registry.service.spec.ts) so that:
  - Registering or overwriting a system unit (e.g. `gram`) leaves its value as the system constant.
  - Deleting a system unit does not remove it and (if applicable) shows or returns the expected behavior.
- Update [src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts](src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts): Remove any references to `tempUnitRates` and `updateUnitRate`; if tests assert on the unit rate input, remove or adjust those assertions. Optionally add a quick check that system units do not show a delete button.

## 4. Summary of file touches

| File | Change |
|------|--------|
| unit-registry.service.ts | Add `SYSTEM_UNITS` (kg, liter, gram, ml, unit, dish); in `initUnits` merge system values; in `deleteUnit` block system keys; in `registerUnit` do not overwrite system unit value. |
| metadata-manager.page.component.html | Remove unit rate input; hide delete for system units. |
| metadata-manager.page.component.ts | Remove `tempUnitRates`, `updateUnitRate`, and unit-rate logic from `onRemoveMetadata`; add `isSystemUnit()`. |
| metadata-manager.page.component.scss | Units card: list layout aligned with category (two-column list-item, no input); remove/adjust unit-only grid that assumed a number input. |
| unit-registry.service.spec.ts | Protect system unit value on register; protect system unit from delete. |
| metadata-manager.page.component.spec.ts | Drop `tempUnitRates`/`updateUnitRate`; adjust/remove unit rate input assertions; optional: assert delete hidden for system units. |
