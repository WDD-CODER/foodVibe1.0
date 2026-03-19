---
name: Add-Recipe Dictionary and Mise Category
overview: Ensure demo data (add-recipe flow) always creates matching dictionary entries for any new English display values (especially preparation categories), and document/verify that mise en place categories are per-item and that "only for this recipe" vs "update globally" is respected when building preparation lists.
todos: []
isProject: false
---

# Add-Recipe: Dictionary Sync and Mise Category Semantics

## Problem

1. **Dictionary gap**: When adding a recipe via the add-recipe flow, new items (e.g. preparation categories like "stocks", new mise items) are written to demo JSON but **not** to [public/assets/data/dictionary.json](public/assets/data/dictionary.json). The UI uses [TranslatePipe](src/app/core/pipes/translation-pipe.pipe.ts) and [CustomSelectComponent](src/app/shared/custom-select/custom-select.component.html) with `translateLabels: true`, so category labels are looked up in the dictionary; [TranslationService.translate()](src/app/core/services/translation.service.ts) returns the key as-is when missing (`return translation || key`). Result: English keys (e.g. "stocks") appear in the UI instead of Hebrew.
2. **Mise category semantics**: You want it explicit that (a) mise items don't use a fixed "default category list"—each item is added **with** its category from the registry (the only category it has unless the user overrides); (b) "Only for this recipe" means the item appears under the overridden category only when preparation lists include that specific recipe; (c) "Update globally" means the registry is updated so the category applies everywhere.

---

## 1. Dictionary sync when demo data creates new items

**Goal:** Whenever the add-recipe flow creates new data that is displayed via translation keys (especially preparation categories and any other English values), the same keys must be added to the dictionary with Hebrew translations so the app works correctly.

**Current state:**

- [.claude/skills/add-recipe/SKILL.md](.claude/skills/add-recipe/SKILL.md) Step 6 updates `demo-kitchen-preparations.json` (new categories and preparations) but does **not** update `dictionary.json`.
- [translation.service.ts](src/app/core/services/translation.service.ts) builds the flat dictionary from `units`, `categories`, `allergens`, `actions`, and `general` only. Preparation category keys (e.g. `stocks`, `sauces`, `garnish`) are not in `dictionary.json`, so they render in English.

**Proposed changes:**

- **Skill (add-recipe):**
  - Add a **core principle** (or mandatory note): "Any new item that stores or displays values in English (or keys used by translatePipe) must have the same keys added to `dictionary.json` with a Hebrew translation."
  - In **Step 2**: When marking a preparation category as **NEW CATEGORY**, record it for dictionary (and, if the source gives a Hebrew label, keep it for Step 6).
  - In **Step 5 (5b)**: In the "New kitchen preparations" table, add a column or note that new categories will also be added to the dictionary (and show the intended Hebrew label if available).
  - In **Step 6**: After updating `demo-kitchen-preparations.json`:
    - For each **new category** added to the registry: add an entry to `dictionary.json` (see below for where). Use the Hebrew label from the recipe/source or a sensible default; if the agent has no Hebrew, the skill should require asking the user or deriving from context.
  - In **Step 8 (Report)**: Explicitly list "New dictionary keys added (preparation categories): …" so the user knows the UI will show Hebrew for those categories.
- **Dictionary structure:**
  - **Option A (recommended):** Add a top-level section `preparation_categories` in [dictionary.json](public/assets/data/dictionary.json) and merge it in [translation.service.ts](src/app/core/services/translation.service.ts) inside `loadGlobalDictionary()` (e.g. `...(baseData.preparation_categories ?? {})`). Then add-recipe writes new preparation category keys there.
  - **Option B:** Put new preparation category keys under `general`. No loader change; add-recipe adds to `general` in `dictionary.json`.
- **Scope:** Focus on **preparation categories** first (the case you hit: "stocks" etc.). Optionally extend later to any other demo-created English display values (e.g. new product/equipment names if ever displayed by key).

---

## 2. Mise category behavior (documentation + verification)

**Intended semantics (no change to modal logic):**

- **Categories are per preparation:** There is no separate "default category list" for mise. Each preparation in [demo-kitchen-preparations.json](public/assets/data/demo-kitchen-preparations.json) and the registry has a single category. When a user adds a mise item to a recipe, it is added **with** that category; that is the only category for that item unless the user explicitly changes it.
- **"Only for this recipe" (add_as_specific):** The change is stored only in the recipe's `prep_items_` / `mise_categories_` (e.g. "פלפל אדום חתוך" with `category_name: "stocks"`). The global registry is **not** updated. When building preparation lists that include this recipe, this item appears under "stocks" **only** when it came from this recipe.
- **"Update globally" (change_global):** [PreparationRegistryService.updatePreparationCategory](src/app/core/services/preparation-registry.service.ts) updates the registry; the category is used everywhere unless a recipe has a recipe-specific override.

**Implementation already in place:**

- [Plans 006 and 006-1](plans/006-1-preparation-global-vs-specific.plan.md): Modal and `onCategoryChange` in [recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts) implement "update globally" vs "only for this recipe"; recipe payload uses `prep_items_` with per-row `category_name`.
- Category options in the workflow come from [getPreparationCategories()](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts) → `prepRegistry_.preparationCategories_()`, i.e. the registry's categories (dynamic, not a fixed default list).

**What to do:**

- **Skill (add-recipe):** In the section that describes kitchen preparations / mise (e.g. Step 2 and the "Core principles" or "Dishes use mise" part), add one short paragraph:
  - Mise items are added **with** their category from the registry; that category is the only one for that item unless the user explicitly changes it and chooses "only for this recipe" or "update globally." When creating new preparations or new categories in Step 6, add the category to the registry and to the dictionary (as above).
- **Verification:** Ensure any code that builds a **combined** preparation list from multiple recipes (e.g. for a menu or event) uses each recipe's own `prep_items_` / `mise_categories_` and does **not** overwrite `category_name` with the global registry. Today, cook-view and recipe-builder build prep from a single recipe's `prep_items_`/`mise_categories_`, so recipe-scoped overrides are already respected. If a future feature aggregates prep across recipes, it must keep per-recipe `category_name` so that "only for this recipe" overrides behave correctly.

---

## 3. Summary of deliverables

| Area                   | Action                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add-recipe skill**   | Add principle and steps: when demo data creates new preparation categories (and optionally other English display values), add the same keys to dictionary with Hebrew; in Step 6 write to dictionary; in Step 8 report new dictionary keys. |
| **Dictionary**         | Add `preparation_categories` section (or use `general`) and backfill existing demo prep categories (e.g. `stocks`, `sauces`, `garnish`, `dips`, `sides`, etc.) so current data shows in Hebrew.                                             |
| **TranslationService** | If using `preparation_categories`, merge it in `loadGlobalDictionary()`.                                                                                                                                                                    |
| **Mise semantics**     | Document in the skill that mise items are added with their category; "only for this recipe" vs "update globally" is already implemented; verify combined prep-list logic (now or when added) uses per-recipe category.                      |

---

## 4. Execution order

1. Add `preparation_categories` (or use `general`) to `dictionary.json` and merge in `TranslationService` if needed.
2. Backfill existing preparation categories from `demo-kitchen-preparations.json` into the dictionary (so "stocks" etc. show in Hebrew immediately).
3. Update the add-recipe skill: principle, Step 2/5b/6/8 for dictionary; short mise-category paragraph.
4. Optionally: one-time audit of any other demo-created English keys (products, equipment) and add to dictionary if they are shown via translatePipe.
