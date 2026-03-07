---
name: add-recipe
description: Extracts recipe or dish data from an image or text, validates units against product inventory, asks structured questions for missing info, presents a visual tree for confirmation, then creates any missing products, equipment, and kitchen preparations in demo JSON and adds the entry to demo-recipes.json or demo-dishes.json.
---

# Add Recipe or Dish

Extract data faithfully, validate against inventory, fill gaps via questions, show a visual tree for confirmation, then write.

## When to use

- User provides an image or text of a recipe/dish and wants to add it to demo data.

## MANDATORY: No write without confirmation

**NEVER modify any demo JSON until the user has explicitly confirmed (Step 3).** Stop after the visual tree and wait.

## Core principles

1. **Trust the source units.** Preserve original units (convert g→kg, ml→liter for JSON). Never change a unit without the user naming that ingredient.
2. **Validate against inventory.** Cross-check every ingredient's unit against its product's `base_unit_` and `purchase_options_`. Flag mismatches.
3. **Separate food from logistics.** Never mix ingredient questions with logistics questions.
4. **Dishes use mise, preparations use steps.** Dishes get `mise_categories_` + one assembly step. Preparations get multi-step `steps_` with real times.
5. **Dictionary sync.** New preparation categories must be added to `dictionary.json` under `preparation_categories` with Hebrew translations.
6. **Mise categories are per preparation.** No fixed default list. Each is added with its category from the registry.
7. **No service_overrides_.** Do not generate `service_overrides_` in `logistics_`. Only generate `baseline_`.

## Input parsing

**Image:** Extract name, servings/yield, totals, ingredients (name + qty + unit), prep/mise, logistics, infrastructure.

**Text:** Parse name ("שם המנה"/"שם המתכון"), type (מנה/מתכון), ingredients ("[name] [qty] [unit]"), prep/mise, logistics.

---

## Workflow

### Step 1 — EXTRACT, MATCH & VALIDATE

**Read now:** `demo-products.json` and `demo-kitchen-preparations.json` only. Defer other files to later steps.

**Extract** from image/text: name, yield, ingredients, mise/steps, logistics.

**Match products:** For each ingredient, look up `name_hebrew` in `demo-products.json`. Record `_id`, `base_unit_`, `purchase_options_`. Mark unmatched as **NEW**.

**Step 1a — SMART DECOMPOSITION** (only for ingredients that did NOT get an exact product match):

For each such ingredient, try to split "product + prep action" so the recipe uses the raw product (for costing/waste) and suggests a mise item for the action.

1. **Tokenize** the ingredient name into words.
2. **Greedy match from the left**: try matching the longest prefix of words against product `name_hebrew` values. For products with `/` in the name (e.g. "עירית/בצל ירוק"), match against each alias segment. Example: "בצל ירוק פרוס דק" → try "בצל ירוק פרוס דק", then "בצל ירוק פרוס", then "בצל ירוק" → matches demo_020 "עירית/בצל ירוק".
3. **Extract the action suffix**: remaining words after the matched prefix = prep action (e.g. "פרוס דק").
4. **Build mise suggestion**: product short name + action suffix = mise item name (e.g. "בצל ירוק פרוס דק"). If it exists in `demo-kitchen-preparations.json`, reuse it; else mark **NEW PREP** and auto-assign category from the **action keyword table** below.
5. **Replace in ingredient list**: ingredient references the raw product (same qty/unit). For **dishes**, add the mise item to `mise_categories_`. For **preparations**, put the action in ingredient `note_` (no mise).
6. In the visual tree, show decomposed ingredients with a marker and tag auto-generated mise items.

**Action keyword table** (scan action suffix; assign first matching category; when multiple match, use priority rules):

- **חיתוכים**: פרוס, קצוץ, חתוך, מגורד, קוביות, ירחים, פרוסות, רצועות, פירורים, קילוף, לפרחים
- **בישולים**: מבושל, מטוגן, צלוי, אפוי, מוקפץ, מקורמל, מחומם, טיגון, בישול
- **pickling**: כבוש, מוחמץ, מותסס, חמוץ, כבישה, החמצה, תסיסה, מומלח (בהקשר שימור)
- **חלבון**: ממולח, מפולפל, מתובל, מוכן לציפוי, ממרינד
- **garnish**: פרוס דק (for garnish vegetables), מגורד (for cheese garnish)
- **מצרכים_רטובים**: סחוט

**Priority when keyword matches multiple categories:** (1) Prefer category already used in this dish. (2) Protein product → prefer חלבון. (3) Heat action (מטוגן, צלוי, מבושל, מקורמל) → בישולים. (4) Fermentation (כבוש, מוחמץ, מותסס) → pickling. (5) Default → חיתוכים.

**Decomposition rules:** Exact product match → do NOT decompose. Full name matches an existing preparation → treat as prep reference, no decomposition. No prefix matches any product → keep existing behavior (NEW product). User can deny and correct in the tree.

**Match preparations:** For each mise/prep item (including those from decomposition), check `demo-kitchen-preparations.json` (`[{ "categories": [...], "preparations": [{ "name", "category" }] }]`). Mark unmatched as **NEW PREP**. If category is missing from `categories` array, mark as **NEW CATEGORY**.

**Validate units:** For each matched product, convert source unit to JSON unit (g→kg, ml→liter, יחידה→unit). Check if it matches `base_unit_` or any `purchase_options_[].unit_symbol_`. Mark OK or **MISMATCH**.

### Step 2 — ASK

Ask focused, numbered questions only for what is actually missing:

1. **Type** (if ambiguous): dish or preparation?
2. **Yield** (if missing): how many servings?
3. **Station** (if unknown): stove / oven / cold / fry?
4. **Unit mismatches**: ask per ingredient with specific conversion options.
5. **Mise vs steps** (for dishes): use mise list as-is?
6. **Logistics details**: ask per item if unclear.

Do NOT mix food and logistics questions.

### Step 3 — CONFIRM

**Before presenting the tree:** Search `demo-recipes.json` and `demo-dishes.json` for existing `name_hebrew` values to check for duplicates. If the name exists, disambiguate as "[name] (2)" (or (3), etc.) and notify the user in the tree.

**Present the visual tree only.** Do not show detail tables unless the user asks.

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️  הוספת מנה/מתכון — אישור לפני כתיבה                         │
└─────────────────────────────────────────────────────────────────┘

[Target] demo-dishes.json  →  dish_NNN   (or demo-recipes.json → prep_NNN)
  │
  ├── 📌 שם:    [name_hebrew]
  ├── 📌 סוג:   dish | תפוקה: [N] [unit] | תחנה: [default_station_]
  ├── 🏷️  תוויות:  [labels_] or none
  │
  ├── 📦 מרכיבים ([N])
  │     • [ingredient 1] [qty] [unit] ([product id or NEW])
  │     • [product name] [qty] [unit] ([id])  ← פורק מ: "[original text]"   (when decomposed)
  │     • …
  │
  ├── 🔧 לוגיסטיקה ([M])
  │     • [equipment name] × [qty] ([eq_id or חדש])
  │     • …
  │
  └── 📋 מיסום ([K]) — קטגוריות
        • [item] → [category] ([Hebrew])
        • [mise item] → [category] (אוטומטי מפירוק)   (when from decomposition)
        • …

┌── קבצים שישתנו (אחרי אישור) ──┐
│  📄 [list affected files]     │
└───────────────────────────────┘

  ✅ Reply  confirm  (או  yes / add it)  כדי לכתוב ל-demo
  ❌ Reply  deny  וכתוב מה לשנות — לא נכתוב עד שתאשר
```

If a duplicate name was detected, show after the tree: "**Name already in use:** '[original]' exists as [id]. New entry stored as **[name] (2)**."

**Stop here. Do not proceed until the user confirms.**

### Step 4 — WRITE

**Only after explicit confirmation.** Now read the remaining files: `demo-equipment.json`, `dictionary.json`, and the target file (`demo-recipes.json` or `demo-dishes.json`).

1. **Create missing products** — next `demo_NNN`, `buy_price_global_: 0`. Append to `demo-products.json`.
2. **Create missing equipment** — next `eq_NNN`, `owned_quantity_: 0`, `is_consumable_: false`. Append to `demo-equipment.json`.
3. **Update kitchen preparations** — add new categories to `categories` array, add new `{ name, category }` to `preparations` array. Preserve array-of-one-doc structure.
4. **Update dictionary** — for each NEW CATEGORY, add entry under `preparation_categories` with Hebrew translation.
5. **Build the recipe/dish object:**
   - Next ID: `prep_NNN` or `dish_NNN` (max existing + 1, zero-padded to 3 digits).
   - Convert units: g→kg (/1000), ml→liter (/1000), unit stays.
   - **Dishes**: `recipe_type_: "dish"`, include `mise_categories_`, `prep_items_`, one assembly step with `labor_time_minutes_: 0`, `logistics_: { baseline_: [...] }`.
   - **Preparations**: `recipe_type_: "preparation"`, multi-step `steps_` with real times.
6. **Append** to the target file array.

### Step 5 — VERIFY & REPORT

1. **Read back** the written entry. Check each ingredient's `unit_` against its product. Report mismatches immediately.
2. **Report:** file path, `_id`, `name_hebrew`. List new products (need prices), new equipment (need quantities), new preparations/categories. Note any categories/labels/allergens for manual follow-up in Metadata.

---

## Schema Reference (field names; see demo JSONs for full shape)

- **Ingredient**: `_id`, `referenceId`, `type`, `amount_`, `unit_`, `note_`. `unit_` must match product `base_unit_` or `purchase_options_[].unit_symbol_`.
- **Step**: `order_`, `instruction_`, `labor_time_minutes_`.
- **Recipe** (demo-recipes): `_id` (prep_NNN), `name_hebrew`, `recipe_type_: "preparation"`, `ingredients_`, `steps_`, `yield_amount_`, `yield_unit_`, `default_station_`, `is_approved_: true`.
- **Dish** (demo-dishes): same as recipe plus `recipe_type_: "dish"`, `logistics_: { baseline_: [...] }`, `prep_items_`, `mise_categories_`, `labels_`.
- **Product** (demo-products): `demo_NNN`; required `_id`, `name_hebrew`, `base_unit_`, `buy_price_global_: 0`, `purchase_options_`, `categories_`, `supplierIds_`, `yield_factor_: 1`, `allergens_`, `min_stock_level_: 0`, `expiry_days_default_: 0`.
- **Equipment** (demo-equipment): `eq_NNN`; `_id`, `name_hebrew`, `category_`, `owned_quantity_: 0`, `is_consumable_: false`, `created_at_`, `updated_at_`.
- **Kitchen preparations**: one doc `[{ "categories": [], "preparations": [{ "name", "category" }] }]`; category key trim, lowercase, spaces→underscores.
- **Unit validation**: `unit_` === `base_unit_` or in `purchase_options_[].unit_symbol_` → OK; else MISMATCH, flag and default to `base_unit_`.
