---
name: kitchen-demo-data-full-values
overview: Upgrade kitchen demo data so every category has 10 items where applicable, and each entity carries all possible values (ingredients, base unit, workflow/steps, logistics, prep items) for optimal app testing.
todos:
  - id: demo-suppliers
    content: demo-suppliers.json 10 suppliers (add 2)
    status: completed
  - id: demo-products
    content: demo-products.json purchase_options_ and variety on subset
    status: completed
  - id: demo-recipes
    content: demo-recipes.json optional ingredient note_ on some
    status: completed
  - id: demo-dishes
    content: demo-dishes.json logistics_.baseline_ + prep_items_ for all 10
    status: completed
  - id: demo-equipment
    content: demo-equipment.json verify categories and scaling mix
    status: completed
  - id: demo-venues
    content: demo-venues.json 10 venues (add 7)
    status: completed
isProject: false
---

# Kitchen Demo Data — Full Values Upgrade (012-2)

This plan upgrades [plans/012-1-kitchen-demo-data-and-recipes.plan.md](plans/012-1-kitchen-demo-data-and-recipes.plan.md) so demo data is **complete and test-ready**: 10 of each entity type where applicable, with every addable value populated (e.g. dishes with ingredients, workflow/steps, base unit, logistics, and prep lists).

---

## 1. Current state vs target

| Category | Current | Target | Notes |
|----------|---------|--------|-------|
| **Suppliers** | 8 | **10** | Add 2; all with delivery_days_, min_order_mov_, lead_time_days_ |
| **Products** | ~100 | **~100** | Keep count; ensure variety: some with purchase_options_, mixed base_unit_ (kg/liter/unit), allergens_, multiple supplierIds_/categories_ where relevant |
| **Preparations** | 10 | **10** | Keep 10; ensure each has full steps_ (labor_time_minutes_), default_station_, yield; optional ingredient note_ on some |
| **Dishes** | 10 | **10** | Keep 10; **add** logistics_.baseline_, prep_items_ or mise_categories_ on every dish |
| **Equipment** | 10 | **10** | Keep 10; already loaded by demo-loader; ensure all categories and scaling_rule_ / consumable mix |
| **Venues** | 3 | **10** | Add 7; cover all environment_type_s; use equipment refs and notes_ |

---

## 2. Data model reference (full values per entity)

### 2.1 Product

- **Required:** `_id`, `name_hebrew`, `base_unit_` (kg | liter | unit), `buy_price_global_`, `purchase_options_[]`, `categories_[]`, `supplierIds_[]`, `yield_factor_`, `allergens_[]`, `min_stock_level_`, `expiry_days_default_`
- **Optional:** `purchase_options_` with entries (unit_symbol_, conversion_rate_, price_override_?), `updatedAt`
- For testing: at least a few products with non-empty `purchase_options_`; some with multiple `categories_` or `supplierIds_`; mix of `base_unit_` (kg, liter, unit).

### 2.2 Supplier

- `_id`, `name_hebrew`, `delivery_days_[]`, `min_order_mov_`, `lead_time_days_`

### 2.3 Recipe / Preparation (RECIPE_LIST)

- **Required:** `_id`, `name_hebrew`, `recipe_type_: 'preparation'`, `ingredients_[]`, `steps_[]`, `yield_amount_`, `yield_unit_`, `default_station_`, `is_approved_`
- **Optional:** `steps_[].video_url_`; ingredient `note_`

### 2.4 Dish (DISH_LIST)

Each dish must have:

- **Ingredients:** product and/or recipe refs, with `amount_`, `unit_`.
- **Workflow:** `steps_[]` with `order_`, `instruction_`, `labor_time_minutes_`.
- **Yield:** `yield_amount_`, `yield_unit_: 'dish'`, `default_station_`.
- **Logistics:** `logistics_: { baseline_: BaselineEntry[] }` with `equipment_id_`, `quantity_`, `phase_: 'prep' | 'service' | 'both'`, `is_critical_`, optional `notes_`.
- **Prep list:** either `prep_items_[]` (FlatPrepItem) or `mise_categories_[]` for cook-view.

Optional: `logistics_.service_overrides_` (plated / takeaway / buffet) on 1–2 dishes.

### 2.5 Equipment

- Categories: heat_source, tool, container, packaging, infrastructure, consumable. Optional `scaling_rule_`, `tags_`, `notes_`.

### 2.6 Venue

- `_id`, `name_hebrew`, `environment_type_` (professional_kitchen | outdoor_field | client_home | popup_venue), `available_infrastructure_[]`, `created_at_`; optional `notes_`. Target 10 venues.

---

## 3. File deliverables (all under `public/assets/data/`)

- **demo-suppliers.json** — Add 2 suppliers (total 10).
- **demo-products.json** — Add `purchase_options_` and/or multi-supplier/category on a subset.
- **demo-recipes.json** — Add `note_` on selected ingredients if desired.
- **demo-dishes.json** — For every dish: add `logistics_.baseline_` and either `prep_items_` or `mise_categories_`; optionally `service_overrides_` on 1–2.
- **demo-equipment.json** — Keep 10; verify categories and scaling/consumable mix.
- **demo-venues.json** — Add 7 venues (total 10); all four environment_type_s.

---

## 4. Demo-loader and validation

- Demo-loader already loads all six JSON files. No code change required.
- After loading: test product form, cook-view (prep + dish), prep list and logistics, venue/event flow.
