---
name: Unified add-recipe skill and create-if-missing
overview: Unify the add-recipe flow so it works from either an image or text; add explicit "ask for missing info" steps; and implement recursive "create if missing" for products and equipment so the agent adds new demo-products and demo-equipment entries when they do not exist. All behavior is encoded in one skill and its schema reference; no application code changes are required for the new logic.
---

# Unified Add-Recipe Skill and Create-If-Missing Logic

## Goal

- **Single skill** that handles adding a recipe/dish from **either** an image **or** text.
- **Same flow** in both cases: extract → ask for missing info → bullet summary → confirm → write.
- **Recursive create-if-missing**: when writing, if an **ingredient** has no matching product in `demo-products.json`, create it; if a **logistics item** has no matching equipment in `demo-equipment.json`, create it. Then write the recipe/dish using the new IDs.

No changes to Angular/services are required: the app already loads products and equipment from storage, which is populated from the demo JSON files. Adding entries to those JSON files and reloading demo data is sufficient.

---

## 1. Skill: Unify image and text input

**File:** `.claude/skills/add-recipe-from-image/SKILL.md`

- **Rename concept** (in title and description) to "Add recipe from image or text" (keep skill name `add-recipe-from-image` for backward compatibility).
- **Trigger (When to use):**
  - Image: user attaches/pastes an image of a recipe screen or says "add this recipe from the picture".
  - Text: user pastes or writes recipe text (e.g. name, type, ingredients with quantities/units, preparation, logistics) and says "add this recipe" / "add recipe from this text".
- **Input branching:**
  - **From image:** use existing "Image layout" section; extract name, totals, ingredients (name + quantity + unit), preparation, and if visible logistics.
  - **From text:** add a short "Text input" section: parse name (e.g. "שם המנה"), type (מנה / מתכון), ingredients list (מריבים/מרכיבים with "X יח" or "Y גרם"), preparation (הכנות / הוראות), logistics (לוגיסטיקה) if present. Normalize units (גרם → g, יח → unit, מ"ל → ml).
- **Single workflow** after extraction (for both image and text):
  1. **Gap-filling:** Before showing the bullet summary, check for missing data and **ask the user** for: Servings / yield (מנות) if missing; Type (recipe vs dish) if ambiguous; Default station if unknown; Prep time in minutes if missing; Any logistics tools mentioned by name and their quantities.
  2. **Bullet summary:** same format as now (name, type, servings, totals, ingredients with quantity+unit, preparation, logistics).
  3. **Confirm:** wait for user confirmation (or corrections).
  4. **Write:** only after confirm; see "Create-if-missing" below.

---

## 2. Skill: Create-if-missing (recursive) behavior

**File:** `.claude/skills/add-recipe-from-image/SKILL.md`

Add a dedicated subsection **"Create-if-missing before writing"** that runs **before** appending the recipe/dish:

**A. Missing products:** For each ingredient, try to match by `name_hebrew` to demo-products.json. If no match, create new product (next demo_NNN, buy_price_global_: 0, required fields), append to demo-products.json, use its _id as referenceId.

**B. Missing equipment:** For each logistics item mentioned, try to match by name_hebrew to demo-equipment.json. If no match, create new equipment (next eq_NNN, category_, owned_quantity_: 0, is_consumable_: false, created_at_/updated_at_), append to demo-equipment.json, use its _id in logistics_.baseline_[].

**C. Order of operations:** (1) Read demo-products, demo-equipment, target file. (2) Create all missing products; collect new _ids. (3) Create all missing equipment; collect new _ids. (4) Build recipe/dish using those IDs. (5) Append recipe/dish. (6) Reply with what was added and list new products/equipment created.

---

## 3. Schema reference: equipment and product creation

**File:** `.claude/skills/add-recipe-from-image/SCHEMA.md`

- **Equipment (demo-equipment.json):** Path, ID pattern eq_NNN, required fields; allowed category_: heat_source, tool, container, packaging, consumable.
- **Product creation (for create-if-missing):** Same path and demo_NNN; use buy_price_global_: 0 when creating.

---

## 4. HOW-WE-WORK and skill description

**File:** `.claude/HOW-WE-WORK.md`

- Update the "Add recipe from image" entry to state that the skill applies when the user adds a recipe **from an image or from text**; the agent extracts data, asks for missing info, shows a breakdown for confirmation, then adds the entry and **creates any missing products and equipment** in the demo JSON.

---

## 5. Application code: no changes

Products and equipment are loaded from storage/JSON; new IDs work after demo reload. No code changes required.
