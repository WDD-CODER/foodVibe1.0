---
name: 002 - Recipe Header Scaling & Dish Mode Plan
overview: Second-phase plan focused on dish-specific units and richer scaling chips (primary + secondary) for the recipe header.
todos: []
isProject: false
---

## 1. Goal

Make the recipe header’s scaling area smart and consistent, especially for **dish** recipes and extra scaling units:

- When switching to **dish**, the **primary unit in the dropdown becomes a real `dish` unit**.
- Both **primary and secondary scaling chips** share the same UX: number input with `SelectOnFocus`, plus and minus buttons, minus disabled at zero.
- The **secondary-units-container** still shows one `scaling-chip secondary` per extra conversion, but:
  - The secondary unit picker only shows **units not already used** in this recipe (no duplicates, including primary).
  - Each secondary chip behaves like a proper scaling unit for this recipe (so it can be used when merging recipes).

---

## 2. Dish unit behavior

### 2.1 Register `dish` as a real unit

- **File:** `src/app/core/services/unit-registry.service.ts`
- **Tasks:**
  - Add `'dish': 1` to the default `globalUnits_` map so it appears in `allUnitKeys_()`.
  - Confirm `TranslationService` and the dictionary already support the key:
    - `public/assets/data/dictionary.json` → `general.dish = "מנה"` (already present).
  - Ensure hydration from storage (`initUnits`) and updates keep `dish` in the registry.

### 2.2 Primary unit label for dishes

- **Files:**
  - `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts`
  - `src/app/pages/recipe-builder/recipe-builder.page.ts`
- **Tasks:**
  - In `RecipeHeaderComponent.primaryUnitLabel_`:
    - For `type === 'dish'`, return `'dish'` (so the dropdown shows `dish | translatePipe`).
  - Decide **data vs display** behavior and implement accordingly:

    - **Important:** `dish` is a **serving portion** unit (like "1 portion"), not a weight. It **cannot** be converted to grams unless the user has explicitly set a secondary unit with a measurable conversion (e.g. "1 dish = 350g"). Do not assume dish recipes have an internal gram equivalent; use `dish` as the primary display and scaling unit. Cost/weight math applies only when a secondary unit with gram conversion exists. 

  - Verify the save/load mapping in `recipe-builder.page.ts` still maps `yield_amount_` and `yield_unit_` correctly for dishes.

---

## 3. Shared UX for primary and secondary scaling chips

### 3.1 Primary chip baseline (already exists)

- **File:** `recipe-header.component.html`
- **Current behavior:**
  - Number input bound via `primaryAmount_()` and `onAmountManualChange`.
  - +/- buttons using `updatePrimaryAmount`.
  - `SelectOnFocus` directive on the input.
  - Minus button disabled when `primaryAmount_() === 0`.
- **Task:** Keep this as the **reference UX**; no breaking changes here.

### 3.2 Upgrade secondary chips to the same UX

- **Files:**
  - `recipe-header.component.html`
  - `recipe-header.component.scss`
  - `recipe-header.component.ts`
- **Current:**
  - Each `scaling-chip secondary` shows:
    - Unit name (`group.get('unit')?.value | translatePipe`).
    - Simple number input bound via `onSecondaryAmountInput(...)`.
    - Remove (X) button — **keep this** so the user can remove a secondary unit chip if desired.
- **Tasks:**
  - In the template:
    - Wrap the secondary chip amount input and new +/- buttons in a small `counter-grid` variant (similar structure to the primary chip, but sized down).
    - Apply `SelectOnFocusDirective` to the secondary number input.
    - Disable the secondary minus button when that chip’s `amount` is zero.
  - In TS:
    - Add helper methods for secondary increment/decrement, e.g.:
      - `updateSecondaryAmount(index: number, delta: number)` that:
        - Finds the correct `FormGroup` in `yield_conversions` (remember: index offset because primary is at 0).
        - Applies clamped numeric updates (`>= 0`) and marks the form dirty.
    - Reuse or extend the existing `onSecondaryAmountInput` to keep all paths numeric and validated.
  - In SCSS:
    - Extend `.counter-grid` with a `.small` variant suitable for secondary chips (smaller height, font-size, buttons).
    - Ensure multiple secondary chips line up nicely in `.secondary-units-container`.

---

## 4. Secondary unit selection (no duplicates)

### 4.1 Filter available units for secondary selection

- **Files:**
  - `recipe-header.component.ts`
  - `recipe-header.component.html`
- **Current:**
  - `availableUnits_ = unitRegistryService.allUnitKeys_`.
  - Secondary dropdown (`unit-dropdown-menu`) iterates `availableUnits_()` and relies on a runtime check in `addSecondaryUnit` to prevent duplicates.
- **Tasks:**
  - Add computed values for **available units** (bidirectional exclusivity):
    - `availableSecondaryUnits_ = computed(() => allUnitKeys_().filter(unit => !usedUnits.has(unit)))`
    - `availablePrimaryUnits_ = computed(() => allUnitKeys_().filter(unit => !usedUnits.has(unit)))`
    - Where `usedUnits` is built from the current `yield_conversions` (primary at index 0 + all secondary chips).
  - Change the `@for` in the secondary dropdown to use `availableSecondaryUnits_()`.
  - Change the primary unit dropdown to use `availablePrimaryUnits_()` so that **units already used as secondary are absent from the main unit dropdown** (e.g. if `liter` is secondary, user cannot choose `liter` as primary).
  - Keep the runtime duplicate guard in `addSecondaryUnit` as a safety net, but it should rarely trigger now.
  - Confirm behavior:
    - **Default primary unit:** `gram` (for preparation recipes).
    - **`dish` in both dropdowns:** The user can choose `dish` as the **main/primary unit** from the primary dropdown, or add `dish` as a **secondary unit** when primary is something else (e.g. gram). `dish` is a first-class option in both.
    - Primary unit (including `dish` when used) never appears in the secondary list.
    - Once the user adds e.g. `gram` as a secondary chip, `gram` disappears from both dropdowns until that chip is removed.

### 4.2 Maintain one scaling chip per unit

- **File:** `recipe-header.component.ts`
- **Tasks:**
  - Keep the model of **one FormArray entry per unit** (primary at index 0, then one per secondary chip).
  - On chip removal:
    - Ensure the corresponding entry is removed from `yield_conversions`.
    - The unit becomes available again in `availableSecondaryUnits_()`.

---

## 5. Tests and safety checks

### 5.1 Header unit & scaling tests

- **File:** `recipe-header.component.spec.ts`
- **Tasks:**
  - Add/extend tests to cover:
    - When `recipe_type` is `dish`, the primary unit label resolves to `'dish'` (through `translatePipe`) and not to a mass unit.
    - Secondary chip minus button is disabled when its `amount` is zero and enabled when > 0.
    - Clicking +/- on a secondary chip updates its `amount` as expected.
    - When a unit is already used (primary or secondary), it is **absent** from both the secondary and main unit dropdowns (bidirectional exclusivity).
    - Removing a secondary chip makes its unit reappear in both dropdowns.

### 5.2 Keep cost/weight math intact

- **Files:**
  - `recipe-builder.page.ts`
  - `recipe-header.component.ts` (only for display logic)
  - `recipe-cost.service.ts`
- **Tasks:**
  - Re-run existing tests and a manual check on:
    - Total cost (`totalCost_()`).
    - Total weight (`totalWeightG_()` and header display).
  - Ensure the new `dish` unit and extra chips do **not** break:
    - `RecipeCostService.computeTotalWeightG`.
    - Form → recipe model mapping for yields (`yield_amount_`, `yield_unit_`).
  - **Recipe total weight:** Some ingredients use non-gram units (e.g. cups, tablespoons). When calculating total weight:
    - For each ingredient, check its metadata (global unit registry, product `purchase_options` conversion to base unit, etc.) for a conversion path to grams.
    - If a conversion to grams exists, include the ingredient in the total weight.
    - If no conversion exists, **do not count** that ingredient in the recipe total weight.

---

## 6. Suggested execution order

1. Register `dish` in `UnitRegistryService` and verify it appears in unit lists and translates correctly.
2. Adjust dish header behavior so the primary label shows `'dish'` via `translatePipe`, without breaking underlying conversions.
3. Upgrade secondary scaling chips to match primary UX (input, `SelectOnFocus`, +/- with disabled minus at zero) and tune SCSS.
4. Implement unit filtering for secondary selection (no duplicate units across primary/secondary).
5. Extend header specs to cover new chip UX, dish unit display, and unit filtering.
6. Run tests and do a quick manual pass on the recipe builder page for both **preparation** and **dish** recipes.

