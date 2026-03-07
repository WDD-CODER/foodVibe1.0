---
name: add-recipe
description: Extracts recipe or dish data from an image or from pasted/written text, validates units against product inventory, asks structured questions for missing info, presents a table-format breakdown for confirmation, then creates any missing products and equipment in demo JSON and adds the entry to demo-recipes.json or demo-dishes.json. Use when the user wants to add a recipe or dish from a picture, from text, or says they are adding recipe info.
---

# Add Recipe or Dish

When the user provides an **image** or **text** of a recipe/dish and wants to add it to the demo data, follow this workflow. The goal is to extract the data faithfully, validate it against the product inventory, fill gaps via structured questions, show a scannable confirmation table, then write the entry.

## When to use

- User attaches or pastes an image of a recipe/dish screen (costing sheet, app UI, handwritten recipe).
- User pastes or writes recipe text and says "add this recipe", "add this dish", or similar.
- User says "add recipe from this picture", "break this apart and add to demo", or equivalent.

## MANDATORY: No write without confirmation

**You must NEVER append or modify `demo-recipes.json`, `demo-dishes.json`, `demo-products.json`, or `demo-equipment.json` until the user has explicitly confirmed the confirmation tables (Step 5).** This applies to you and to any agent that runs this skill or the add-recipe command. If the user has not said "yes", "confirm", "add it", or equivalent approval after seeing the tables — do not write. Stop after Step 5 and wait.

## Core principles

1. **Trust the source units.** Always preserve the original units from the image or text. If the sheet says "גרם", keep grams (convert to kg for JSON). If "יחידה", keep unit. Never change an ingredient's unit based on an unrelated user comment. If the user wants to override a specific ingredient's unit, they must name that ingredient explicitly.
2. **Validate against inventory.** Before confirming, cross-check every ingredient's unit against its matched product's `base_unit_` and `purchase_options_`. Flag mismatches.
3. **Separate food from logistics.** Food ingredients and service/logistics items are presented and discussed separately — never mix them.
4. **Dishes use mise, preparations use steps.** Dishes get `mise_categories_` plus one assembly step. Preparations get multi-step `steps_` with real times.

## Image layout (typical)

- **Right side (or list)**: Recipe/dish **name** (often Hebrew).
- **Left / main panel, top row**: Servings, total grams, total ml, total units, total price.
- **Below**: **Ingredients table** — columns for ingredient name, quantity in grams, in ml, in units, and price per line.
- **Bottom**: Preparation instructions, prep time, logistics, mise/פיזום פלס.

If the layout differs, extract whatever fields are visible.

## Text input

Parse for:
- **Name**: "שם המנה" / "שם המתכון" or first heading.
- **Type**: מנה (dish) vs מתכון (recipe/preparation).
- **Ingredients**: each line as "[name] [quantity] [unit]".
- **Preparation / Mise**: steps or mise list.
- **Logistics**: equipment/tool names and quantities.

---

## Workflow

### Step 1 — EXTRACT

From the image or text, extract exactly as shown:

- **Name** (Hebrew or other)
- **Servings / yield**
- **Totals** (grams, ml, units, price — if visible)
- **Ingredients**: for each row — name, quantity, unit (preserve the source unit exactly)
- **Preparation / Mise**: steps or mise-en-place list
- **Logistics** (if present): equipment names and quantities
- **Building/infrastructure** (if present): electrical connections, etc.

### Step 2 — MATCH products

For each extracted ingredient:

1. Look up by name in `public/assets/data/demo-products.json` (`name_hebrew`).
2. Record the product's `_id`, `base_unit_`, and `purchase_options_`.
3. If no match found, mark as **NEW** (will be created).

### Step 3 — VALIDATE units

For each ingredient with a matched product:

1. Convert the source unit to the JSON unit (g→kg, ml→liter, יחידה→unit).
2. Check: does the JSON unit match the product's `base_unit_`? Or does it appear in `purchase_options_[].unit_symbol_`?
3. If **YES** → mark as OK.
4. If **NO** → mark as **MISMATCH**. This will be flagged to the user in the confirmation step.

### Step 4 — ASK (structured gap-filling)

Ask focused, numbered questions — one topic per question. Only ask what is actually missing:

1. **Type** (if ambiguous): "Is this a dish (מנה) or a preparation (הכנה)?"
2. **Yield** (if missing): "How many servings/portions does this make?"
3. **Station** (if unknown): "Which station? stove / oven / cold / fry"
4. **Unit mismatches** (if any): For each mismatch, ask specifically:
   > "כרוב כבוש is stored as kg in inventory, but the sheet says 'unit'. Should I use X grams (= 0.0X kg) or keep as 1 unit?"
5. **Mise vs steps** (for dishes): "I see a mise list (פיזום פלס). Should I use it as-is?"
6. **Logistics details** (if items need clarification): ask per item.

Do NOT mix food ingredient questions with logistics/service questions.

### Step 4b — Check duplicate name (before Step 5)

Before presenting the confirmation (Step 5):

1. **Read** `demo-recipes.json` and `demo-dishes.json` and collect every existing `name_hebrew`.
2. **Compare** the name the user wants for the new recipe/dish (from extract or user override) to these existing names. Use exact match (trimmed, same string).
3. **If the name already exists:**
   - Do **not** use the same name for the new entry.
   - Set the new entry's name to a **disambiguated** version so it is clearly a different one: use **"[name] (2)"**. If "[name] (2)" also exists, use **"[name] (3)"**, and so on until the name is unique.
   - In Step 5 you **must explicitly tell the user**: "**Name already in use:** The name '[original name]' already exists in the recipe/dish list (as [existing _id]). To keep this as a separate entry, the new one will be stored as **[name] (2)**. This way you can tell it's not the same recipe/dish. You can rename it later if you prefer." Show the disambiguated name in the visual structure and in the summary table (שם).
4. **If the name does not exist:** use it as-is; no notice needed.

This step is mandatory. The user must always see when a name was changed because it was taken.

### Step 5 — CONFIRM (full summary + visual structure + tables)

Present the following **in this order**. No write (Step 6) until the user explicitly confirms.

---

**1. Visual structure (what will be written)**

Show exactly where and how the entry will be stored:

```
Target file:     demo-dishes.json  (or demo-recipes.json)
New ID:          dish_NNN         (or prep_NNN)
Type:            dish             (or preparation)
Structure:
  ├── name_hebrew
  ├── recipe_type_
  ├── yield_amount_ + yield_unit_
  ├── default_station_
  ├── ingredients_     [N items]
  ├── steps_           [1 assembly step for dish / multiple for preparation]
  ├── logistics_.baseline_  [M items]   (if any)
  └── mise_categories_  [K categories]  (dishes only; if any)
```

If a similar recipe/dish already exists (same ingredients/structure), say so and ask: "Add as new entry (new ID) or update existing [id] (e.g. add label only)?"

**If the name was changed in Step 4b (duplicate):** Right after the structure block, show the mandatory notice: "**Name already in use:** The name '[original]' already exists (as [id]). The new entry will be stored as **[name] (2)** so you can tell it's not the same one. You can rename it later if you prefer."

---

**2. Summary — main details (must all be visible)**

Present this block so the user can confirm or correct every key field:

| Field | Value |
|-------|--------|
| **שם (name_hebrew)** | [exact name as will be stored] |
| **סוג (type)** | dish / preparation |
| **תפוקה (yield)** | [number] [unit: dish / kg / liter] |
| **תחנה (default_station_)** | stove / oven / cold / fry |
| **יחידות מדידה (measurement units)** | e.g. kg for [list]; unit for [list] |
| **תוויות (labels_)** | [list or "none"] |
| **מספר מרכיבים** | [N] |
| **מספר ציוד לוגיסטיקה** | [M] |
| **מיסום (mise)** | [K] categories / none |

---

**3. מרכיבים (Food ingredients)** — full table

| # | מרכיב | כמות | יחידה | מוצר תואם | OK? |
|---|--------|------|--------|------------|-----|
| 1 | … | … | … | … | V/X |

(OK? = V when unit matches product, X + short reason when mismatch.)

---

**4. לוגיסטיקה (Equipment & service)** — full table

| # | פריט | כמות | סוג |
|---|------|------|-----|
| 1 | … | … | … |

---

**5. מיסום (Mise-en-place)** — for dishes only

| # | פריט | כמות | יחידה |
|---|------|------|-------|
| 1 | … | … | … |

---

**6. Confirm or deny**

End with exactly:

"Review the structure, summary, and tables above. Reply **confirm** (or yes / add it) to add this to the demo data, or **deny** and say what to change. I will not write any file until you confirm."

**Then stop. Do not run Step 6 until the user explicitly confirms (e.g. confirm, yes, add it).**

### Step 6 — WRITE

**Only after the user has explicitly confirmed** (e.g. "yes", "confirm", "add it"):

1. **Read** `demo-products.json`, `demo-equipment.json`, and the target file.
2. **Create missing products** (next `demo_NNN`, `buy_price_global_: 0`, required fields per [SCHEMA.md](SCHEMA.md)).
3. **Create missing equipment** (next `eq_NNN`, required fields per [SCHEMA.md](SCHEMA.md)).
4. **Build the recipe/dish object:**
   - Target: `demo-recipes.json` for preparations, `demo-dishes.json` for dishes.
   - Next ID: `prep_NNN` or `dish_NNN` (scan existing max + 1).
   - Convert units: g→kg (/1000), ml→liter (/1000), unit stays unit.
   - **Dishes**: include `mise_categories_` from the mise list; set `steps_` to one assembly step with `labor_time_minutes_: 0`.
   - **Preparations**: include multi-step `steps_` with real times.
   - Include `logistics_` with `baseline_` entries for equipment.
5. **Append** the new object to the target file array.

### Step 7 — VERIFY

After writing:

1. **Read back** the entry just written.
2. **Check** each ingredient's `unit_` against its product's `base_unit_` / `purchase_options_`.
3. If any mismatch is found, report it immediately and offer to fix.

### Step 8 — REPORT

Tell the user:
- File path, `_id`, and `name_hebrew` of what was added.
- List any **new products** created (so they can set prices later).
- List any **new equipment** created (so they can set quantities later).
- Flag any issues found in verification.

---

## Summary checklist

- [ ] Extract all data from image/text — preserve original units exactly.
- [ ] Match ingredients to products in `demo-products.json`.
- [ ] Validate units against each product's `base_unit_` and `purchase_options_`.
- [ ] Ask structured questions for missing info; flag unit mismatches explicitly.
- [ ] **Check duplicate name (Step 4b):** If name_hebrew already exists in demo-recipes or demo-dishes, use "[name] (2)" (or (3), …) and in Step 5 explicitly tell the user the name was taken and why the number was added.
- [ ] Present confirmation: (1) visual structure + target file/ID (+ duplicate-name notice if applicable), (2) summary table with name, type, yield, station, units, labels, counts, (3) מרכיבים table, (4) לוגיסטיקה table, (5) מיסום table, (6) "Confirm or deny" prompt.
- [ ] Wait for user confirmation. Do not write until they confirm.
- [ ] Create missing products and equipment; build and append recipe/dish.
- [ ] Read back and verify units are valid.
- [ ] Report what was added and any new items created.
