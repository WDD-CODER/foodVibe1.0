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
8. **Label keys are English snake_case.** `labels_` on dishes must use keys matching `^[a-z0-9_]+$`. Never use Hebrew strings as label keys. Check `demo-labels.json` for existing keys; add new labels there and in `dictionary.json` (general) when needed.

## Input parsing

**Image:** Extract name, servings/yield, totals, ingredients (name + qty + unit), prep/mise, logistics, infrastructure.

**Text:** Parse name ("שם המנה"/"שם המתכון"), type (מנה/מתכון), ingredients ("[name] [qty] [unit]"), prep/mise, logistics.

---

## Workflow

### Step 1 — EXTRACT, MATCH & VALIDATE

**Read now:** `demo-products.json`, `demo-kitchen-preparations.json`, and `demo-labels.json` (for label keys). Defer other files to later steps.

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

**Labels (dishes only):** Decide which labels apply (diet, allergen, cuisine, campaign). Use only keys that exist in `demo-labels.json` (first doc’s `items` array). Key format: `^[a-z0-9_]+$`. If a needed label is missing, mark **NEW LABEL** and plan to add it in Step 4. Prefer existing keys: `vegetarian`, `vegan`, `gluten_free`, `fish`, `gluten`, `sesame`, `meat`, `asian`, `sipur_shel_ochel`.

**Default yield (when user does not specify):** Apply only when the user has not provided yield and does not answer the yield question in Step 2. **Computation:** Sum all ingredient `amount_` where `unit_` is `kg` → `total_kg`. Sum all where `unit_` is `liter` → `total_liter`. **Result:** If there is any weight: set `yield_amount_` = total_kg + total_liter (treat liter as kg with factor 1), `yield_unit_` = `"kg"`. If only volume (all `liter`, no `kg`): set `yield_amount_` = total_liter, `yield_unit_` = `"liter"`. If only `unit` (no kg, no liter): use `yield_amount_: 1`, `yield_unit_: "unit"`. If the user does answer with a value (e.g. "סך המרכיבים", "באצ' אחד", "X מנות"), use that; the default applies only when yield is missing and the user does not answer.

### Step 2 — ASK

Ask focused, numbered questions only for what is actually missing:

1. **Type** (if ambiguous): dish or preparation?
2. **Yield** (if missing): **Ask** the user (e.g. "כמה מנות? או אשר ברירת מחדל: סך משקלי המרכיבים"). If the user does **not** answer (or replies "default" / "ברירת מחדל" / "סך המרכיבים"), apply the **Default yield** rule (sum of kg/liter). If the user answers with a value, use that. If the default cannot be applied (e.g. all ingredients in `unit`), ask and fall back to `yield_amount_: 1`, `yield_unit_: "unit"` when unanswered.
3. **Station** (if unknown): stove / oven / cold / fry?
4. **Unit mismatches**: ask per ingredient with specific conversion options.
5. **Mise vs steps** (for dishes): use mise list as-is?
6. **Logistics details**: ask per item if unclear.

Do NOT mix food and logistics questions.

### Step 3 — CONFIRM

**Before presenting the tree:** Search `demo-recipes.json` and `demo-dishes.json` for existing `name_hebrew` values to check for duplicates. If the name exists, disambiguate as "[name] (2)" (or (3), etc.) and notify the user in the tree.

**Present the visual tree only.** Do not show detail tables unless the user asks. Present the tree with **Part 1 (מתכון/מנה)** and **Part 2 (לוגיסטיקה)** as two distinct top-level branches; do not use a flat list or inline arrows for equipment.

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️  הוספת מנה/מתכון — אישור לפני כתיבה                         │
└─────────────────────────────────────────────────────────────────┘

[Target] demo-dishes.json  →  dish_NNN   (or demo-recipes.json → prep_NNN)
  │
  ├── Part 1 — מתכון / מנה
  │     ├── 📌 שם:    [name_hebrew]
  │     ├── 📌 סוג:   dish | תפוקה: [N] [unit] | תחנה: [default_station_]
  │     ├── 🏷️  תוויות:  [labels_] (mark NEW LABEL if key not in demo-labels.json) or none
  │     ├── 📦 מרכיבים ([N])
  │     │     • [ingredient 1] [qty] [unit] ([product id or NEW])
  │     │     • [product name] [qty] [unit] ([id])  ← פורק מ: "[original text]"   (when decomposed)
  │     │     • …
  │     └── 📋 שלבים / מיסום ([K])
  │           • [step or mise item] → [category] ([Hebrew])
  │           • [mise item] → [category] (אוטומטי מפירוק)   (when from decomposition)
  │           • …
  │
  └── Part 2 — לוגיסטיקה
        └── 🔧 ציוד ([M])
              • [equipment name] × [qty] ([eq_id or חדש])
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

**Only after explicit confirmation.** Now read the remaining files: `demo-equipment.json`, `dictionary.json`, `demo-labels.json`, and the target file (`demo-recipes.json` or `demo-dishes.json`).

1. **Create missing labels** — for each **NEW LABEL**: add `{ "key": "<snake_case>", "color": "<hex>", "autoTriggers": [], "addedAt_": Date.now() }` to the first doc’s `items` array in `demo-labels.json`; add the same key with Hebrew translation to `dictionary.json` under `general`. Use a color from the app palette (e.g. `#10B981`, `#84CC16`, `#EF4444`, `#8B5CF6`, `#EC4899`).
2. **Create missing products** — next `demo_NNN`, `buy_price_global_: 0`, `"addedAt_": Date.now()`. Append to `demo-products.json`.
3. **Create missing equipment** — next `eq_NNN`, `owned_quantity_: 0`, `is_consumable_: false`. Set `created_at_` and `updated_at_` to current ISO (`new Date().toISOString()`). Append to `demo-equipment.json`.
4. **Update kitchen preparations** — add new categories to `categories` array; add new entries to `preparations` as `{ "name", "category", "addedAt_": Date.now() }`. The file is a single-element array containing one document — preserve this structure exactly:
   ```json
   [{ "categories": ["חיתוכים", "בישולים"], "preparations": [{ "name": "בצל קצוץ", "category": "חיתוכים" }] }]
   ```
5. **Update dictionary** — for each NEW CATEGORY, add entry under `preparation_categories` with Hebrew translation; for each NEW LABEL, add entry under `general` with Hebrew translation.
6. **Build the recipe/dish object:**
   - Next ID: `prep_NNN` or `dish_NNN` (max existing + 1, zero-padded to 3 digits).
   - **Timestamps (mandatory):** set `"addedAt_": Date.now()` and `"updatedAt_": Date.now()`.
   - Convert units: g→kg (/1000), ml→liter (/1000), unit stays.
   - When yield was not provided by the user and the user did not answer the yield question, set `yield_amount_` and `yield_unit_` according to the **Default yield** rule (sum of kg, or sum of liter, or 1 unit as fallback).
   - **Dishes**: `recipe_type_: "dish"`, include `mise_categories_`, `prep_items_`, `labels_` (array of English keys only), one assembly step with `labor_time_minutes_: 0`, `logistics_: { baseline_: [...] }`.
   - **Preparations**: `recipe_type_: "preparation"`, multi-step `steps_` with real times.
7. **Append** to the target file array.


### Step 5 — VERIFY & REPORT

1. **Read back** the written entry. Check each ingredient's `unit_` against its product. Report mismatches immediately.
2. **Report:** file path, `_id`, `name_hebrew`. List new products (need prices), new equipment (need quantities), new preparations/categories. Note any categories/labels/allergens for manual follow-up in Metadata.

---

## Schema Reference (field names; see demo JSONs for full shape)

- **Ingredient**: `_id`, `referenceId`, `type`, `amount_`, `unit_`, `note_`. `unit_` must match product `base_unit_` or `purchase_options_[].unit_symbol_`.
- **Step**: `order_`, `instruction_`, `labor_time_minutes_`.
- **Recipe** (demo-recipes): `_id` (prep_NNN), `name_hebrew`, `recipe_type_: "preparation"`, `ingredients_`, `steps_`, `yield_amount_`, `yield_unit_`, `default_station_`, `is_approved_: true`, `addedAt_?: number`, `updatedAt_?: number`.
- **Dish** (demo-dishes): same as recipe plus `recipe_type_: "dish"`, `logistics_: { baseline_: [...] }`, `prep_items_`, `mise_categories_`, `labels_`; include `addedAt_` and `updatedAt_`.
- **Product** (demo-products): `demo_NNN`; required `_id`, `name_hebrew`, `base_unit_`, `buy_price_global_: 0`, `purchase_options_`, `categories_`, `supplierIds_`, `yield_factor_: 1`, `allergens_`, `min_stock_level_: 0`, `expiry_days_default_: 0`; when creating new products in Step 4 add `addedAt_?: number`.
- **Equipment** (demo-equipment): `eq_NNN`; `_id`, `name_hebrew`, `category_`, `owned_quantity_: 0`, `is_consumable_: false`, `created_at_`, `updated_at_` (use current ISO when creating new equipment).
- **Kitchen preparations**: one doc `[{ "categories": [], "preparations": [{ "name", "category", "addedAt_"? }] }]`; category key trim, lowercase, spaces→underscores.
- **Unit validation**: `unit_` === `base_unit_` or in `purchase_options_[].unit_symbol_` → OK; else MISMATCH, flag and default to `base_unit_`.

---

## Recovery

If something goes wrong during the workflow:

- **Ambiguous product match** (multiple products could match an ingredient name): list all candidates with their `_id` and `name_hebrew`, ask the user to pick one. Do not guess.
- **JSON write fails** (parse error or malformed file): read back the target file, validate it is valid JSON, report the exact error. Do not retry blindly -- show the user the issue.
- **Duplicate name detected after write**: if the duplicate check in Step 3 was missed and the write created a duplicate `name_hebrew`, report it immediately in Step 5 and offer to rename or remove.
- **Unit mismatch unresolved**: if the user does not answer the unit question in Step 2, default to the product's `base_unit_` and flag it in the Step 5 report for manual follow-up.
- **Image extraction incomplete** (blurry, partial, multi-page): extract what is readable, list the gaps explicitly in Step 2, and ask the user to fill in missing fields before proceeding to Step 3.
