---
name: add-recipe-from-image
description: Extracts recipe or dish data from an image or from pasted/written text (name, type, ingredients with quantities/units, preparation, logistics), asks for missing info, presents a short bullet-point breakdown for confirmation, then creates any missing products and equipment in demo JSON and adds the entry to demo-recipes.json or demo-dishes.json. Use when the user wants to add a recipe from a picture, from text, paste a recipe screenshot, or says they are adding recipe info.
---

# Add Recipe from Image or Text

When the user provides an **image** or **text** of a recipe and wants to add it to the demo data, follow this workflow. The goal is to extract the data, fill any gaps by asking the user, show a concise breakdown for confirmation, then create missing products and equipment if needed and write one new entry to the correct demo JSON so the app can load it.

## When to use

- **Image:** User attaches or pastes an image of a recipe screen (e.g. app UI with name, totals, ingredients, instructions).
- **Text:** User pastes or writes recipe text (e.g. name, type, ingredients with quantities/units, preparation, logistics) and says "add this recipe", "add recipe from this text", or similar.
- User says "add this recipe", "add recipe from this picture", "break this apart and add to demo recipes/dishes", or equivalent.

## Image layout (typical)

Use this to know where to read from:

- **Right side (or list)**: Recipe/dish **name** (often highlighted; may be Hebrew).
- **Left / main panel, top row**: Number of **serving dishes**, **total amount in grams**, **total in ml**, **total in units**, **total price**.
- **Below**: **Ingredients table** — columns for ingredient description/name, quantity in grams, in ml, in units, and price per line.
- **Bottom**: **Preparation instructions** (steps or single "פירוט" / details field) and **preparation time (minutes)**.

If the layout differs, extract whatever fields are visible (name, totals, ingredients with quantities/units, instructions).

## Text input (when user provides written/pasted recipe)

Parse the text for:

- **Name**: e.g. "שם המנה" / "שם המתכון" or first heading.
- **Type**: מנה (dish) vs מתכון (recipe/preparation).
- **Ingredients**: e.g. "מרכיבים" / "מריבים" — each line as "[name] [quantity] [unit]" (יח = unit, גרם = g, מ"ל = ml). Normalize to grams / ml / unit.
- **Preparation**: "הכנות" / "הוראות הכנה" / "פירוט" — steps or single block; "זמן הכנה (בדקות)" if present.
- **Logistics**: "לוגיסטיקה" — list of tools (e.g. "מכונת נקניקיות × 2", "שיפודי יקטורי"). Extract name and quantity per item.

If a field is missing or ambiguous, note it for gap-filling (step 2).

## Workflow

### 1. Extract (from image or text)

From the image or text, read and normalize:

- **Name** (Hebrew or other): exact as shown, for `name_hebrew`.
- **Servings** (number of serving dishes).
- **Totals**: total grams, total ml, total units, total price.
- **Ingredients**: for each row — ingredient name/description, quantity, and **which unit** (grams, ml, or unit). If only one unit column has values, use that (e.g. all in grams).
- **Preparation**: step-by-step text and **prep time in minutes** (if shown).
- **Logistics** (if present): equipment/tool names and quantities.

### 2. Gap-filling: ask for missing info

Before showing the bullet summary, check for missing or ambiguous data and **ask the user**:

- **Servings / yield** (מנות) if missing.
- **Type**: recipe (preparation) vs dish (מנה) if ambiguous.
- **Default station** (stove / oven / cold / fry) if unknown.
- **Prep time in minutes** if missing.
- **Logistics**: for each tool mentioned by name (e.g. "מכונת נקניקיות", "שיפד יקיטורי"), confirm name and quantity if not clear.

Then proceed to the bullet summary.

### 3. Present a short bullet-point breakdown

Reply with a **concise bullet list** so the user can verify at a glance:

- **Name**: [name_hebrew]
- **Type**: Recipe (preparation) or Dish
- **Servings / yield**: [number] [unit]
- **Totals**: … g, … ml, … units, price …
- **Measurement unit used**: e.g. grams (convert to kg in JSON), or ml (convert to liter), or unit
- **Ingredients** (each line):
  - [ingredient name]: [quantity] [unit]
- **Preparation**: brief summary or numbered steps; **prep time**: … minutes

Do **not** write to any file yet. Ask the user to **confirm** (e.g. "Confirm if this is correct and I'll add it to the demo data").

### 4. Wait for confirmation

- If the user **corrects** something, update the breakdown and ask again.
- If the user **confirms**, proceed to step 5.

### 5. Create-if-missing and add to demo JSON

- **Target file**:  
  - **Preparation recipes** (sauces, stocks, preps) → `public/assets/data/demo-recipes.json`  
  - **Dishes** (full dishes served to guests) → `public/assets/data/demo-dishes.json`
- If unclear, prefer **demo-recipes.json** for bases/sauces/preps and **demo-dishes.json** for finished dishes; or ask the user.

**Order of operations:** Read demo-products.json, demo-equipment.json, and the target file. Then:

**A. Missing products:** For each ingredient, match by `name_hebrew` to demo-products.json. If no match, create a new product (next `demo_NNN`, `buy_price_global_: 0`, required fields per [SCHEMA.md](SCHEMA.md)), append to demo-products.json, and use its `_id` as `referenceId`.

**B. Missing equipment:** For each logistics item (by Hebrew name), match by `name_hebrew` to demo-equipment.json. If no match, create a new equipment (next `eq_NNN`, `owned_quantity_: 0`, `is_consumable_: false`, `created_at_`/`updated_at_` ISO string), append to demo-equipment.json, and use its `_id` in the dish `logistics_.baseline_[]`.

**C. Build and write:** Next recipe/dish ID = highest in target file + 1. Units: kg (g/1000), liter (ml/1000), unit. Build one object per [SCHEMA.md](SCHEMA.md).

**Recipe entry (demo-recipes.json)** — minimal required shape:

- `_id`, `name_hebrew`, `recipe_type_: "preparation"`, `ingredients_`, `steps_`, `yield_amount_`, `yield_unit_`, `default_station_`, `is_approved_: true`
- Each ingredient: `_id` (e.g. `prep_011_i1`), `referenceId`, `type: "product"`, `amount_` (number in kg/liter/unit), `unit_` (kg | liter | unit), optional `note_`
- Each step: `order_`, `instruction_`, `labor_time_minutes_` (split from total prep time if only one block of text)

**Dish entry (demo-dishes.json)** — same as above plus:

- `recipe_type_: "dish"`, `yield_unit_: "dish"` typically, and optionally `logistics_`, `prep_items_`, `mise_categories_`, `labels_`. For a first add-from-image pass, you may omit optional blocks or set minimal defaults.

- **Append** the new recipe/dish object to the array in the chosen file. Preserve existing formatting (indentation, trailing newline). Write the file.

### 6. Confirm to the user

Tell the user what was added: file path, `_id`, and `name_hebrew`. List any **new products** or **new equipment** created (so they can set prices or quantities later).

## Summary checklist

- [ ] Extract name, totals, ingredients (with quantity + unit), preparation, and logistics from image or text.
- [ ] Ask for missing info (servings, type, station, prep time, logistics details).
- [ ] Output short bullet-point breakdown; do not write files yet.
- [ ] Wait for user confirmation.
- [ ] Read demo-products, demo-equipment, and target file; create missing products, then missing equipment; collect new _ids.
- [ ] Build recipe/dish using matched and new IDs; convert units (g→kg, ml→liter); append to target file.
- [ ] Reply with what was added and any new products/equipment created.
