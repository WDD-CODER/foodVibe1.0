# Demo recipe/dish JSON schema reference

Used by the [add-recipe](SKILL.md) skill when writing to `public/assets/data/demo-recipes.json` or `public/assets/data/demo-dishes.json`.

## Demo products (for referenceId)

- Path: `public/assets/data/demo-products.json`
- Each product has `_id` (e.g. `demo_001`), `name_hebrew`, and `base_unit_` (`kg` | `liter` | `unit`).
- Match ingredient names to `name_hebrew` to get `referenceId`.
- **Always check `base_unit_` and `purchase_options_`** to decide the correct `unit_` for the ingredient (see unit validation below).

**Product creation (create-if-missing):** When adding a recipe and an ingredient has no matching product, create a new product: next `demo_NNN` (scan file for max), `name_hebrew` from ingredient, `buy_price_global_: 0`, plus any other required fields per existing entries. Append to `demo-products.json` and use the new `_id` as `referenceId`.

## Equipment (for logistics) — demo-equipment.json

- Path: `public/assets/data/demo-equipment.json`
- ID pattern: `eq_NNN` (e.g. `eq_011`); next NNN = max existing + 1.
- Required fields: `_id`, `name_hebrew`, `category_`, `owned_quantity_`, `is_consumable_`, `created_at_`, `updated_at_` (ISO string).
- Allowed `category_`: `heat_source`, `tool`, `container`, `packaging`, `consumable`.
- When creating new equipment (create-if-missing): use `owned_quantity_: 0`, `is_consumable_: false` unless known otherwise; optional `scaling_rule_` can be added later.

## Recipe (preparation) — demo-recipes.json

| Field | Type | Notes |
|-------|------|--------|
| `_id` | string | `prep_NNN` (e.g. prep_011); next NNN from existing max |
| `name_hebrew` | string | Hebrew (or other) name from image |
| `recipe_type_` | string | Always `"preparation"` |
| `ingredients_` | array | See ingredient object below |
| `steps_` | array | See step object below |
| `yield_amount_` | number | From total amount or servings (e.g. 2) |
| `yield_unit_` | string | `kg` \| `liter` \| `dish` (e.g. kg for sauce) |
| `default_station_` | string | `stove` \| `oven` \| `cold` \| `fry` |
| `is_approved_` | boolean | `true` |

**Ingredient object:**

| Field | Type | Notes |
|-------|------|--------|
| `_id` | string | `{parentId}_i{index}` (e.g. prep_011_i1) |
| `referenceId` | string | Product `_id` from demo-products.json |
| `type` | string | `"product"` (or `"recipe"` if referencing another prep) |
| `amount_` | number | In kg, liter, or unit (convert from g/ml) |
| `unit_` | string | Must match product `base_unit_` or a valid `purchase_options_[].unit_symbol_` |
| `note_` | string | Optional (e.g. "קצוץ דק") |

**Step object:**

| Field | Type | Notes |
|-------|------|--------|
| `order_` | number | 1, 2, 3, … |
| `instruction_` | string | One paragraph or sentence |
| `labor_time_minutes_` | number | Minutes for this step (or 0) |

## Dish — demo-dishes.json

Same as recipe above, plus:

| Field | Type | Notes |
|-------|------|--------|
| `recipe_type_` | string | `"dish"` |
| `yield_unit_` | string | Usually `"dish"` |
| `logistics_` | object | Optional; baseline_ and service_overrides_ |
| `prep_items_` | array | Optional; prep name, category, quantity, unit |
| `mise_categories_` | array | Optional; category_name, items |
| `labels_` | array | Optional; e.g. ["vegetarian", "gluten_free"] |

**Dishes vs preparations:**
- **Dishes** get `mise_categories_` (mise-en-place list) and a single assembly step with `labor_time_minutes_: 0`. No detailed prep steps.
- **Preparations** get multi-step `steps_` with real prep times.

## Unit conversion from image to JSON

- **grams** → `unit_: "kg"`, `amount_`: value / 1000
- **ml** → `unit_: "liter"`, `amount_`: value / 1000
- **count / "יחידה"** → `unit_: "unit"`, `amount_`: numeric value

## Unit validation rule

Before writing an ingredient, verify the chosen `unit_` is valid for the matched product:

1. If `unit_` === product's `base_unit_` → OK
2. If `unit_` appears in product's `purchase_options_[].unit_symbol_` → OK
3. Otherwise → **MISMATCH** — flag for the user; default to the product's `base_unit_` and convert the amount accordingly.

## ID numbering

- **Recipes**: Scan `demo-recipes.json` for max `prep_NNN`; next is `prep_(NNN+1)` zero-padded (e.g. prep_011).
- **Dishes**: Scan `demo-dishes.json` for max `dish_NNN`; next is `dish_(NNN+1)` zero-padded (e.g. dish_008).
