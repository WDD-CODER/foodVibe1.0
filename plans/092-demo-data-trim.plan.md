---
name: Demo data trim only
overview: Trim all demo JSON files to keep only the 15 confirmed dishes (including אורן אסידו טירת צבי and dish_023 renamed to "פונדו"), 3 recipes, and their referenced products, equipment, suppliers, prep categories, and labels.
todos: []
isProject: false
---

# Demo data cleanup — trimmed plan (Part 2 only)

Single scope: reduce demo data to a minimal, consistent set built from your confirmed dish and recipe list.

---

## 1. Items to keep (final list)

**Dishes (15)** — include in trimmed `demo-dishes.json`. For **dish_023**, set `name_hebrew` to **"פונדו"** (replace "פיזום פלס").

| _id      | name_hebrew (final)                                             |
| -------- | --------------------------------------------------------------- |
| dish_011 | אורן אסידו - טירת צבי                                           |
| dish_012 | נקניקית עוף בלחמניה עם רטבים כרוב כבוש ובצל                     |
| dish_013 | סיפור של אוכל                                                   |
| dish_014 | המבורגר בלחמניה של אבי ביטון ועידן תלם                          |
| dish_015 | שיפוד עוף בולגוגי מוגש על אורז עגול ופוריקקה                    |
| dish_016 | קציצות בקר ברוטב עגבניות שרי צלויות אורז צהוב ופטרוזיליה שיפונד |
| dish_017 | אוניגירי מוגש עם קימצי וסויה                                    |
| dish_018 | שיפוד נקניקים של טירת צבי ומטבל                                 |
| dish_019 | ציפס מנה                                                        |
| dish_020 | סלט איטריות שעועית                                              |
| dish_021 | פופקורן עוף / טבעוני — בזיגוג רוטב קוריאני וטופינג צבעוני       |
| dish_022 | פאג בננות                                                       |
| dish_023 | **פונדו**                                                       |
| dish_024 | מגנומוס — מגנום מצופה ו־2 רטבי שוקולד לציפוי לבד                |
| dish_025 | מטיל זהב                                                        |

**Recipes / preparations (3)** — include in trimmed `demo-recipes.json`, plus any prep recipes referenced as ingredients by these or by the 15 dishes (transitive dependencies).

| _id      | name_hebrew          |
| -------- | -------------------- |
| prep_014 | משרה לפרגית בולגוגית |
| prep_015 | רוטב לסלט איטריות    |
| prep_016 | גלייז קוריאני        |

---

## 2. Dependency collection

From the 15 dishes + 3 preps (and any transitive preps):

- **Products:** all `referenceId` in `ingredients_` (type `product`) and product IDs from `mise_categories_` / prep items.
- **Equipment:** all `equipment_id_` in `logistics_.baseline_` (dishes + preps).
- **Preparations:** all `referenceId` with `type: "recipe"` in ingredients (add those prep recipes to the kept list).
- **Suppliers:** from `supplierIds_` (or equivalent) on kept products.
- **Prep categories:** every `category_name` in `prep_items_`, `prep_categories_`, `mise_categories_`, and in the prep registry entries used by kept items.

---

## 3. File-by-file trim

- **demo-dishes.json** — Keep only the 15 dishes (full objects). Set dish_023 `name_hebrew` = "פונדו".
- **demo-recipes.json** — Keep the 3 preps above + any transitive prep recipes (referenced by the 15 dishes or the 3 preps).
- **demo-products.json** — Keep only products in the collected product ID set.
- **demo-equipment.json** — Keep only equipment in the collected equipment ID set.
- **demo-suppliers.json** — Keep only suppliers referenced by kept products (or a minimal set if needed).
- **demo-venues.json** — Keep a minimal set required for demo (or as referenced).
- **demo-labels.json** — Keep labels used by kept dishes/recipes (at least sipur_shel_ochel).
- **demo-kitchen-preparations.json** — Keep only categories and preparations that appear in the dependency set.
- **demo-section-categories.json** / **demo-logistics-baseline.json** — Trim to what is referenced (or minimal).
- **dictionary.json** — Do not remove keys still used by the app; add/keep only what the trimmed demo and UI need.

---

## 4. Order of work

1. Resolve the full set of kept dishes (15) and preps (3 + transitive).
2. Run dependency collection (products, equipment, preps, suppliers, prep categories).
3. Write trimmed content to each demo file; when writing dishes, set dish_023 `name_hebrew` to "פונדו".
4. Sanity-check: load demo in the app and confirm dishes, recipes, and prep categories behave as expected.

---

## 5. Files to change

- public/assets/data/demo-dishes.json
- public/assets/data/demo-recipes.json
- public/assets/data/demo-products.json
- public/assets/data/demo-equipment.json
- public/assets/data/demo-suppliers.json
- public/assets/data/demo-venues.json
- public/assets/data/demo-labels.json
- public/assets/data/demo-kitchen-preparations.json
- public/assets/data/demo-section-categories.json (if used)
- public/assets/data/demo-logistics-baseline.json (if used)
- public/assets/data/dictionary.json (only if new keys needed for demo)
