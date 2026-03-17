---
name: kitchen-demo-data-and-recipes
overview: Refactor the kitchen demo data plan to match the current data model and create ~100 demo products, 8 suppliers, 10 preparation recipes, and 10 dishes -- all saved directly to localStorage with backup JSON copies in public/assets/data/.
todos:
  - id: review-models
    content: Review current Product, Supplier, Recipe, Ingredient, and Dish models plus storage keys to ensure the plan aligns with real shapes.
    status: completed
  - id: create-supplier-json
    content: Create demo-suppliers.json with 8 supplier objects matching the Supplier interface.
    status: pending
  - id: create-product-json
    content: Create demo-products.json with ~100 product objects matching the current Product interface.
    status: pending
  - id: create-recipe-json
    content: Create demo-recipes.json with 10 preparation recipes referencing demo products.
    status: pending
  - id: create-dish-json
    content: Create demo-dishes.json with 10 dishes referencing demo products and preparations.
    status: pending
  - id: build-demo-loader
    content: Build a demo-loader service that reads the JSON files and writes them into localStorage (replace mode), then reloads data services.
    status: pending
  - id: update-metadata
    content: Align metadata-registry defaults (allergens to snake_case, add spices to categories) and update dictionary.json.
    status: pending
isProject: false
---

# Kitchen Demo Data Plan (Refactored)

## Decisions (locked in)

- **Loading**: Save demo data directly into localStorage. Keep backup JSON copies in `public/assets/data/` so data can be restored if localStorage is cleared.
- **Replace mode**: When loading demo data, wipe existing products, suppliers, recipes, and dishes and replace with demo data (clean slate). Do NOT touch `VERSION_HISTORY` or `TRASH_*` keys.
- **Recipe/dish style**: Mix of Israeli/Mediterranean classics, core preps (stocks, sauces), and some international favorites.
- **Oils category**: Oils stay under `dry` -- no separate "oils" category.

---

## 1. Data model alignment

All demo data must match these exact interfaces and storage keys:

- **Product** (`PRODUCT_LIST` in localStorage)
  - `_id`, `name_hebrew`, `base_unit_` (kg | liter | unit), `buy_price_global_` (price per 1 base unit), `purchase_options_[]`, `categories_[]`, `supplierIds_[]`, `yield_factor_`, `allergens_[]`, `min_stock_level_`, `expiry_days_default_`
- **Supplier** (`KITCHEN_SUPPLIERS` in localStorage)
  - `_id`, `name_hebrew`, `delivery_days_[]`, `min_order_mov_`, `lead_time_days_`
- **Recipe / Dish** (preparations in `RECIPE_LIST`, dishes in `DISH_LIST`)
  - `_id`, `name_hebrew`, `recipe_type_` ('preparation' or 'dish'), `ingredients_[]`, `steps_[]`, `yield_amount_`, `yield_unit_`, `default_station_`, `is_approved_`
  - Dishes may also have `prep_items_[]` and/or `mise_categories_[]`
- **Ingredient** (nested inside recipes/dishes)
  - `_id`, `type` ('product' | 'recipe'), `referenceId` (FK to Product._id or Recipe._id), `amount_`, `unit_`, `note_?`
- **Metadata registries** (single-doc each):
  - `KITCHEN_CATEGORIES`: `{ items: ['vegetables','dairy','meat','dry','fish','spices'] }`
  - `KITCHEN_ALLERGENS`: `{ items: ['gluten','eggs','peanuts','nuts','soy','milk_solids','sesame','fish','shellfish','seafood'] }`
  - `KITCHEN_UNITS`: `{ units: { kg: 1000, liter: 1000, gram: 1, ml: 1, unit: 1, dish: 1 } }`

---

## 2. Suppliers (8 total)

Same as original plan, using the `Supplier` interface:

- `sup_vegetable` -- vegetables, fruit, herbs
- `sup_dairy` -- dairy products
- `sup_meat` -- meat and poultry
- `sup_dry` -- dry goods, grains, sugar, oils, vinegars, canned goods
- `sup_fish` -- fish only
- `sup_shellfish` -- shellfish only
- `sup_spices` -- spices and condiments
- `sup_eggs` -- eggs

Each gets `delivery_days_: [0,1,2,3,4]`, `min_order_mov_: 200`, `lead_time_days_: 1`.

---

## 3. Products (~100 total)

Use the existing 100-item table from [plans/012](plans/012-kitchen-demo-data.plan.md) as-is. Each row becomes a `Product` object with:

- `_id`: `'demo_001'` through `'demo_100'`
- Fields mapped directly from the table columns
- `categories_` as a single-item array (e.g. `['vegetables']`)
- `supplierIds_` as a single-item array (e.g. `['sup_vegetable']`)
- `purchase_options_`: empty array for most items

---

## 4. Demo preparations (10 recipes in `RECIPE_LIST`)

Each uses `recipe_type_: 'preparation'`, has `ingredients_` referencing demo products by `_id`, and includes real `steps_` with `labor_time_minutes_`.

| ID         | name_hebrew       | English name          | yield_amount_ | yield_unit_ | Key ingredients (demo product refs)                                           |
| ---------- | ----------------- | --------------------- | ------------- | ----------- | ----------------------------------------------------------------------------- |
| `prep_001` | ציר עוף           | Chicken stock         | 5             | liter       | chicken thighs, onion, carrot, celery, garlic, bay leaves, black pepper, salt |
| `prep_002` | ציר ירקות         | Vegetable stock       | 5             | liter       | onion, carrot, celery, potato, garlic, bay leaves, black pepper, parsley      |
| `prep_003` | רוטב עגבניות ביתי | Homemade tomato sauce | 2             | kg          | tomato paste, onion, garlic, olive oil, oregano, basil, sugar, salt, pepper   |
| `prep_004` | רוטב טחינה        | Tahini sauce          | 1             | kg          | tahini, lemon, garlic, salt                                                   |
| `prep_005` | ויניגרט בסיסי     | Basic vinaigrette     | 1             | liter       | olive oil, red wine vinegar, mustard, salt, pepper, honey                     |
| `prep_006` | שום קונפי         | Garlic confit         | 0.5           | kg          | garlic, canola oil, salt                                                      |
| `prep_007` | ירקות צלויים      | Roasted vegetable mix | 2             | kg          | zucchini, eggplant, red pepper, onion, olive oil, salt, pepper, cumin         |
| `prep_008` | חומוס בסיסי       | Basic hummus          | 1.5           | kg          | dry chickpeas, tahini, lemon, garlic, cumin, salt, olive oil                  |
| `prep_009` | תערובת תבלינים    | Spice rub             | 0.5           | kg          | paprika, cumin, turmeric, black pepper, salt, cinnamon                        |
| `prep_010` | קרם פטיסייר       | Pastry cream          | 1             | kg          | milk, sugar, egg, cornstarch, butter, vanilla extract                         |

---

## 5. Demo dishes (10 dishes in `DISH_LIST`)

Each uses `recipe_type_: 'dish'`, `yield_unit_: 'dish'`, has `ingredients_` referencing both products AND preparations, and includes `steps_` and optionally `mise_categories_` for cook-view prep lists.

| ID         | name_hebrew             | English name                      | yield_amount_ | Key ingredients and preps                                                                                  |
| ---------- | ----------------------- | --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `dish_001` | שקשוקה                  | Shakshuka                         | 4             | tomato sauce (prep_003), eggs, onion, red pepper, garlic, cumin, paprika, olive oil, parsley               |
| `dish_002` | סלמון צלוי עם טחינה     | Roasted salmon with tahini        | 4             | salmon fillet, tahini sauce (prep_004), lemon, olive oil, salt, pepper, parsley                            |
| `dish_003` | שניצל עוף עם סלט        | Chicken schnitzel with salad      | 4             | chicken breast, flour, eggs, breadcrumbs, canola oil, lettuce, tomato, cucumber, vinaigrette (prep_005)    |
| `dish_004` | כרובית צלויה עם טחינה   | Roasted cauliflower with tahini   | 4             | cauliflower, tahini sauce (prep_004), olive oil, cumin, paprika, salt, parsley, lemon                      |
| `dish_005` | נזיד עדשים              | Lentil stew                       | 6             | green lentils, onion, carrot, potato, garlic, vegetable stock (prep_002), cumin, turmeric, olive oil, salt |
| `dish_006` | פסטה ברוטב עגבניות      | Pasta with tomato sauce           | 4             | spaghetti, tomato sauce (prep_003), garlic, olive oil, parmesan, basil                                     |
| `dish_007` | שיפודי עוף עם אורז      | Grilled chicken skewers with rice | 4             | chicken breast, spice rub (prep_009), basmati rice, onion, olive oil, lemon, salt                          |
| `dish_008` | דניס עם חמאת עשבי תיבול | Sea bream with herb butter        | 4             | sea bream fillet, butter, parsley, dill, garlic, lemon, potato, salt, pepper, olive oil                    |
| `dish_009` | קערת חומוס              | Hummus bowl                       | 4             | hummus (prep_008), roasted vegetables (prep_007), tahini sauce (prep_004), olive oil, paprika, parsley     |
| `dish_010` | קרם ברולה               | Creme brulee                      | 6             | pastry cream (prep_010), sugar, heavy cream, eggs, vanilla extract                                         |

---

## 6. File deliverables

All JSON files go in `public/assets/data/`:

- `demo-suppliers.json` -- array of 8 `Supplier` objects
- `demo-products.json` -- array of ~100 `Product` objects
- `demo-recipes.json` -- array of 10 `Recipe` objects (preparations)
- `demo-dishes.json` -- array of 10 `Recipe` objects (dishes)

These are the canonical backup copies. The demo-loader reads them and writes to localStorage.

---

## 7. Demo-loader service

Create `src/app/core/services/demo-loader.service.ts`:

- **Method**: `loadDemoData()`:
  1. Fetch all 4 JSON files from `assets/data/`.
  2. Clear and replace `KITCHEN_SUPPLIERS`, `PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST` in localStorage using `StorageService.replaceAll()`.
  3. Reload each data service's internal signal so the UI updates immediately.
  4. Do NOT touch `VERSION_HISTORY`, `TRASH_PRODUCTS`, `TRASH_RECIPES`, `TRASH_DISHES`.
- **Entry point**: A button or menu item in the app (e.g. settings page or a dev toolbar) that calls `loadDemoData()` after a confirmation dialog.

---

## 8. Metadata updates

- **Categories** (`KITCHEN_CATEGORIES`): ensure `spices` is in the default list: `['vegetables','dairy','meat','dry','fish','spices']`.
- **Allergens** (`KITCHEN_ALLERGENS`): standardize to snake_case: `['gluten','eggs','peanuts','nuts','soy','milk_solids','sesame','fish','shellfish','seafood']`. Update `metadata-registry.service.ts` defaults and `dictionary.json`.
- **Units** (`KITCHEN_UNITS`): no changes needed; current defaults (`kg`, `liter`, `gram`, `ml`, `unit`, `dish`) cover all demo data.

---

## 9. Version history and trash

- Demo data entities are normal `Product`/`Recipe` objects. Version history and trash entries are created automatically by user actions through `KitchenStateService` -- no seeding needed.
- The demo-loader does NOT clear trash or history, so users can reload demo data without losing their action history.

---

## 10. Validation checklist (after implementation)

- Open a few demo products in the product form -- verify price, unit, yield, allergens, categories, and supplier display correctly.
- Open a demo preparation in cook-view -- verify ingredients resolve, scaling works, steps display, and cost computes.
- Open a demo dish in cook-view -- verify ingredients (including nested prep references) resolve, mise/prep list shows, scaling works.
- Delete a demo product and a demo dish -- verify they appear in trash and can be restored.
- Edit a demo recipe -- verify version history records the change.
