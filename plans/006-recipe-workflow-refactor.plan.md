---
name: Recipe Workflow Refactor
overview: "Refactor the recipe-workflow and preparation-search components: category select with add-option, quantity input without native spinners, instruction textarea with SelectOnFocus and Enter-to-save, category search button for dish mode, dual workflow persistence when switching recipe type, and full translatePipe coverage."
todos:
  - id: a-category-select
    content: "Preparation category: always a select (main grid + add-form); choose category placeholder; add-option; per-recipe override for checklist"
  - id: b-quantity-spinners
    content: "Quantity input: remove browser default add/decrease spinners"
  - id: c-instruction-textarea
    content: "Instruction textarea: SelectOnFocus, Enter-to-save-and-new-row, center text"
  - id: d-category-search
    content: "Dish mode: add sort/search button beside preparation category"
  - id: e-workflow-persistence
    content: "Dual workflow persistence: keep both prep list and steps when switching recipe type"
  - id: f-translate-pipe
    content: "Apply translatePipe to all user-facing strings"
  - id: g-english-key-prompt
    content: "New category: prompt for English value, add to dictionary"
isProject: false
---

# Recipe Workflow Refactor Plan

## Summary

Refactor the recipe-workflow and preparation-search components per user requirements (a–f), plus the existing English-key prompt for new categories. Includes a structured todo list for execution.

---

## Todo List

| ID | Task | Status |
|----|------|--------|
| a | Preparation category: always a select (main grid + add-form); choose category placeholder; add-option; per-recipe override for checklist | Done |
| b | Quantity input: remove browser default add/decrease spinners | Done |
| c | Instruction textarea: SelectOnFocus, Enter-to-save-and-new-row, center text | Done |
| d | Dish mode: add a sort icon button beside the Preparation Category label (the whole label, including icon, is clickable and toggles grouping prep items by category) | Done |
| e | Dual workflow persistence: keep both prep list and steps when switching recipe type | Done |
| f | Apply translatePipe to all user-facing strings | Done |
| g | New category: prompt for English value, add to dictionary | Done |

---

## Requirement Details

### a. Preparation Category — Always a Select, Two Contexts

**Current:** Add-form shows category as text input or select; main grid shows category as read-only display (`<span class="category-display">`).

**Target — Two places where category appears:**

#### A1. Main grid (recipe-workflow, dish mode) — category cell per row

- Category is **always a select dropdown** (never read-only display).
- **When user picks preparation from search dropdown:** category auto-fills with that preparation's category (already done via `onPreparationSelected`).
- **When user adds new preparation** (doesn't exist, added via "Add new preparation"): preparation has no category yet.
  - Category select shows placeholder: **"Choose category"**.
  - If user never chooses: stays with no category (empty).
- **When user opens category select:** options = all existing preparation categories + **"Add new category"**.
- Category can always be changed per row.

#### A2. Add-form (preparation-search) — when adding new preparation

- Same behavior: category is always a select.
- If no categories exist: placeholder "no designated categories".
- If categories exist: default to preparation's category when editing; otherwise "Choose category".
- Select options: existing categories + "Add new category".
- Choosing "Add new category" opens inline flow; on submit, prompt for English key (see g).

#### A3. Persistence and checklist behavior

- Save **preparation with its category** per recipe in `prep_items_` (already: `preparation_name`, `category_name`).
- Per-recipe: user can **override** the default category for a preparation.
- When building a **meeting checklist** in later feter!  for preparations: if a recipe was chosen and the user changed the preparation category in that recipe, the checklist shows that preparation **under that (recipe-specific) category**.
- Product metadata / preparation registry stores the default category; recipe-level `prep_items_` stores the per-recipe override.

**Implementation notes (main grid):**
- Replace `<span class="category-display">` with `<select formControlName="category_name">`.
- Inject `PreparationRegistryService` in recipe-workflow to get `preparationCategories_()` for options.
- Add empty option with placeholder "Choose category" (`value=""`).
- Add "Add new category" option (`value="__add_new__"`); when selected, show inline input or emit to open add-category flow (reuse logic from preparation-search or extract shared component).
- Use `translatePipe` for category display when category is a dictionary key; otherwise show raw value.

**Files:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html), [recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts), [preparation-search.component.ts](src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.ts), [preparation-search.component.html](src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html)

---

### b. Quantity Input — Remove Default Spinners

**Current:** Quantity input may show browser-native up/down spinners on `input type="number"`.

**Target:** Suppress the browser's default number input spinners (add/decrease arrows).

**Implementation:** Add CSS to `.qty-input` (and any other number inputs in workflow):
```scss
-moz-appearance: textfield;
&::-webkit-inner-spin-button,
&::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
```

**Files:** [recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss)

---

### c. Instruction Textarea — SelectOnFocus, Enter to Save, Center Text

**Current:** Textarea for preparation steps; no SelectOnFocus; no Enter behavior.

**Target:**
1. **SelectOnFocus:** When user focuses the textarea, select all text (extend [SelectOnFocusDirective](src/app/core/directives/select-on-focus.directive.ts) to support `HTMLTextAreaElement` or add textarea-specific logic).
2. **Enter to save:** When user presses Enter after filling text, save the current row and open a new row (emit addItem, optionally blur/focus next).
3. **Text alignment:** Center the instruction text (`text-align: center`).

**Files:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html), [recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts), [recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss), [select-on-focus.directive.ts](src/app/core/directives/select-on-focus.directive.ts)

---

### d. Dish Mode — Category Search/Sort Button

**Current:** Preparation category column shows category name only.

**Target:** Add a **sort/search button** beside the "Preparation Category" header. When clicked, allow the user to search or filter preparations by category (e.g., filter the prep list by selected category).

**Files:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html), [recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts), [recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss)

---

### e. Dual Workflow Persistence

**Current:** [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts) `onRecipeTypeChange` clears `workflowArray` and replaces with a single empty row for the new type. Data is lost when switching dish ↔ preparation.

**Target:**
- Keep **both** workflow datasets in memory (prep list for dish, steps for preparation).
- When user switches recipe_type: swap visible form array but **do not discard** the other type's data.
- When user returns to a type: restore that type's data.
- On **save**: persist only the data for the current `recipe_type` (prep_items_ for dish, steps_ for preparation).
- Data persists until user leaves the recipe builder page.

**Implementation approach:**
- Add private signals or variables: `cachedPrepItems_`, `cachedSteps_`.
- On `recipe_type` change: save current workflow to cache, load from cache for the target type (or default empty).
- `buildRecipeFromForm` already uses current `workflow_items`; ensure it only reads the active array.

**Files:** [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts)

---

### f. Translation Pipe — Full Coverage

**Current:** Some strings are hardcoded Hebrew/English.

**Target:** Use `translatePipe` for all user-facing strings.

**Locations to fix:**
- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) line 7: `תהליך / Instruction` → `{{ 'instruction' | translatePipe }}` (add key)
- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) line 8: `זמן (דק')` → `{{ 'labor_time_minutes' | translatePipe }}` (add key)
- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) lines 77–79: `הוסף שלב הכנה / Add Stage` → `{{ 'add_prep_stage' | translatePipe }}` (add key)
- [recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html) lines 29–32: `רשימת הכנות (מיזאנפלאס)` and `תהליך הכנה / Prep Workflow` → use translatePipe with keys e.g. `prep_list_mise_en_place`, `prep_workflow`
- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html) line 23: placeholder `תאר את פעולת ההכנה...` → `{{ 'instruction_placeholder' | translatePipe }}`
- Audit other recipe-builder templates for hardcoded strings.

**Files:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html), [recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html), [dictionary.json](public/assets/data/dictionary.json)

---

### g. New Category — English Key Prompt

**Existing requirement:** When user adds a new preparation category and submits:
- Prompt for **English value** (key) before saving.
- Store English key in preparation registry (backend).
- Add `english_key → Hebrew value` to dictionary so translatePipe displays Hebrew.

**Layout:** Fix disproportionate search container when add-category form is shown.

**Files:** [preparation-search.component.ts](src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.ts), [preparation-search.component.html](src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html), [preparation-registry.service.ts](src/app/core/services/preparation-registry.service.ts), [translation.service.ts](src/app/core/services/translation.service.ts) or dictionary

---

## Dictionary Keys to Add

| Key | Hebrew (example) |
|-----|------------------|
| `instruction` | תהליך |
| `labor_time_minutes` | זמן (דק') |
| `add_prep_stage` | הוסף שלב הכנה |
| `prep_list_mise_en_place` | רשימת הכנות (מיזאנפלאס) |
| `prep_workflow` | תהליך הכנה |
| `instruction_placeholder` | תאר את פעולת ההכנה... |
| `no_designated_categories` | אין קטגוריות מוגדרות |
| `choose_category` | בחר קטגוריה |

---

## Execution Order

1. **f** — Add dictionary keys and translatePipe (enables consistent i18n for other changes)
2. **b** — Quantity spinners (quick CSS fix)
3. **c** — Instruction textarea (SelectOnFocus, Enter, center)
4. **a** + **g** — Category select refactor and English-key prompt (preparation-search)
5. **d** — Category search button (dish mode)
6. **e** — Dual workflow persistence (recipe-builder.page)

---

## Files Summary

| File | Changes |
|------|---------|
| preparation-search.component.ts/html | Category select, add-option, English prompt |
| preparation-registry.service.ts | Support English key storage |
| recipe-workflow.component.ts/html/scss | Quantity spinners, instruction behavior, category search, translatePipe |
| recipe-builder.page.ts | Dual workflow persistence |
| recipe-builder.page.html | translatePipe |
| select-on-focus.directive.ts | Support textarea |
| dictionary.json | New keys |
| translation.service.ts | Add category to dictionary (if dynamic) |
