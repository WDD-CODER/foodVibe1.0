# Export "All" View Option – Recipe Builder + Menu Builder

## Overview
Add a **View** option alongside **Export** for the "All" button in **both** the recipe-builder and the menu-intelligence (menu-builder) export toolbars. Fix the menu-intelligence dish-data miscalculation so **Food cost (₪)** and **Cost per 1 portion** display correctly.

- **Recipe Builder:** View = one main screen (recipe/dish info + ingredients + workflow). Export = existing "all" Excel (info + shopping list).
- **Menu Builder:** View = one main screen showing **only menu structure and info beside each dish** (from dish data). Export = existing "all" Excel (menu info + sections + checklist + shopping list).
- **Bug fix:** In menu-intelligence, "Cost per 1 portion" must be total food cost ÷ **derived portions** (not ÷ serving_portions); "Food cost (₪)" remains total cost by portions × guests.

## Implementation order (full plan)

1. **Part C – Cost fix** (menu-intelligence). Fix `getFoodCostPerPortion` so the editor and any menu view show correct "cost per 1 portion." Do this first so all later menu data is correct.
2. **Part A – Recipe Builder view.** Add View/Export for "All" in recipe-builder; view reuses `getRecipeInfoPreviewPayload`.
3. **Part B – Menu Builder view.** Add `getMenuAllViewPreviewPayload` in ExportService; add View/Export for "All" in menu-intelligence; view shows menu structure + dish data (using fixed cost).

---

## Part A – Recipe Builder

### Context
- **Where:** [src/app/pages/recipe-builder/](src/app/pages/recipe-builder/) — export toolbar overlay.
- **Current "All" behavior:** Single button that only calls `onExportAllTogether()` → `exportAllTogetherRecipe()` (downloads Excel with sheet 1 = recipe info, sheet 2 = shopping list). No View option.
- **Other options** (Recipe info, Shopping list, Cooking steps, Dish checklist) already have View + Export via `view-export-wrap` and `view-export-modal`.

## Goal
- **All** gets the same View / Export pattern as the other toolbar options.
- **View:** Opens the export preview with **one main screen** showing:
  - **Recipe/dish info** – date, recipe name, yield (amount + unit).
  - **Ingredients** – scaled ingredients table (name, amount, unit, unit price).
  - **Workflow** – preparation instructions (steps) + preparation time.
- **Export:** Unchanged – from toolbar or from preview, still calls `exportAllTogetherRecipe()` (same Excel file).
- No menu data; single recipe or dish only.

## Reuse existing payload
The existing **recipe info** preview payload already contains exactly that combination: recipe header, yield, ingredients table, preparation instructions, and prep time. So the "All" **view** can reuse it.

- **ExportService** already has `getRecipeInfoPreviewPayload(recipe, quantity): ExportPayload` which returns:
  - `recipeSheet`: date, recipeName, yieldQty, yieldUnit, preparationInstructions, preparationTime
  - `recipeSheetLabels` (Hebrew headers)
  - `sections`: one section = ingredients table (name, amount, unit, unit price)
- The shared [export-preview](src/app/shared/export-preview/export-preview.component.html) template already renders that as the "recipe-sheet" layout (header, yield, ingredients table, instructions block, prep time).

So no new payload builder is required. "All" view = same payload as "Recipe info" view; only the label and the "Export from preview" action differ (Export from "All" view downloads the full "all" workbook).

## Visual representation – Recipe view (single recipe/dish)

Preview uses `dir="rtl"` on the paper wrapper; all labels come from `heHeader(key)` (Hebrew in [export.util.ts](src/app/core/utils/export.util.ts) EXPORT_HEADER_HE). Layout is right-aligned; content flows right-to-left.

```
                        ┌─────────────────────────────────────────────────────────────────┐
                        │  [שם המתכון/מנה] — פרטים                    ← title (RTL)   │
                        │  × [quantity] [יח' תפוקה]                   ← subtitle       │
                        │  יוצא בתאריך: …                             ← 'exported_at'  │
                        ├─────────────────────────────────────────────────────────────────┤
                        │  Header row (label right, value left in RTL):                   │
                        │           [value]  תאריך    │    [value]  שם המתכון           │
                        │           [qty]   כמות     │    [unit]   יח' מידה             │
                        ├─────────────────────────────────────────────────────────────────┤
                        │  מצרכים (ingredients_header)                                    │
                        │  ┌────────────┬──────┬────────┬──────────────┐  ← RTL cols    │
                        │  │ מחיר ליחידה│ יח'  │ כמות   │ מצרכים       │  (headerRow)   │
                        │  │ …          │ …    │ …      │ …            │                │
                        │  └────────────┴──────┴────────┴──────────────┘                │
                        ├─────────────────────────────────────────────────────────────────┤
                        │  הוראות הכנה (preparation_instructions)                        │
                        │                    [instruction line one]                        │
                        │                    [instruction line two]                       │
                        │  …                                                                 │
                        │  זמן הכנה (preparation_time): [minutes]                          │
                        └─────────────────────────────────────────────────────────────────┘
  Export to Excel    Print    Close  ← actions (order may follow app RTL)
```

- **Translation keys / Hebrew:** Labels in the preview use the same keys as export (e.g. `recipe_name` → שם המתכון, `date` → תאריך, `amount` → כמות, `unit` → יח' מידה, `ingredients_header` → מצרכים, `preparation_instructions` → הוראות הכנה, `preparation_time` → זמן הכנה, `exported_at` → יוצא בתאריך). The payload’s `recipeSheetLabels` are built with `heHeader(...)` in the service; the template binds those strings. For meta like “exported at”, the template uses `{{ 'exported_at' | translatePipe }}`.
- **RTL:** The preview wrapper has `dir="rtl"`; the diagram above suggests right-aligned title/subtitle and table columns ordered right-to-left (מחיר ליחידה | יח' | כמות | מצרכים). Actual alignment is handled by CSS and the existing export-preview styles.

One scrollable page; no menu, no sections — single recipe or dish only.

## Implementation

### 1. Recipe-builder template
**File:** [src/app/pages/recipe-builder/recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html)

- Replace the single "All" button (lines ~89–92) with the same view/export pattern as the other options:
  - Wrap in `<div class="view-export-wrap">`.
  - Primary button: opens dropdown, e.g. `openViewExportModal('all')`, `[attr.aria-expanded]="viewExportModal_() === 'all'"`.
  - When `viewExportModal_() === 'all'`, show `view-export-modal` with:
    - **View** → `onViewAll()` (opens preview with recipe info payload).
    - **Export** → `onExportAllTogether()` (current behavior).

### 2. Recipe-builder component
**File:** [src/app/pages/recipe-builder/recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts)

- Extend `viewExportModal_` type to include `'all'`:  
  `'recipe-info' | 'shopping-list' | 'cooking-steps' | 'dish-checklist' | 'all' | null`.
- Extend `exportPreviewType_` to include `'recipe-all' | null`.
- **onViewAll():**  
  - Get current recipe via `buildRecipeFromForm()` and quantity via `exportQuantity_()`.  
  - Set `exportPreviewPayload_.set(this.exportService_.getRecipeInfoPreviewPayload(recipe, qty))`.  
  - Set `exportPreviewType_ = 'recipe-all'`.  
  - Close modal: `closeViewExportModal()`.
- **onExportFromPreview():**  
  - When `type === 'recipe-all'`, call `this.exportService_.exportAllTogetherRecipe(recipe, qty)` (same as current "All" export).  
  - Then clear preview and type as for other export types.

### 3. No changes to ExportService or export-preview (recipe-builder)
- No new payload method: reuse `getRecipeInfoPreviewPayload`.
- No changes to [export.service.ts](src/app/core/services/export.service.ts) or [export-preview](src/app/shared/export-preview/) for recipe-builder.

---

## Part B – Menu Builder (menu-intelligence) "All" view

### Goal
- Add **View** and **Export** for the "All" button in [menu-intelligence](src/app/pages/menu-intelligence/) (same toolbar pattern as Menu info / Shopping / Checklist).
- **View:** One main screen showing **only menu structure and info beside each dish** — no checklist or shopping list in the view. Content is driven by **dish data** (per item): e.g. dish name, derived portions, food cost (₪), cost per 1 portion, and any other active menu-type fields (sell price, etc.).
- **Export:** Unchanged — from toolbar or from preview, still calls `exportAllTogetherMenu()` (same Excel: menu info + sections + checklist + shopping list).

### View payload (menu structure + dish data)
- **New method** in [export.service.ts](src/app/core/services/export.service.ts): e.g. `getMenuAllViewPreviewPayload(menu, recipes): ExportPayload`. The menu must include guest_count_, pieces_per_person_, serving_type_, and sections with items (recipe_id_, predicted_take_rate_, serving_portions, etc.). The service can use existing `MenuIntelligenceService.derivePortions` and `RecipeCostService` (plus recipe yield) to compute derived portions and food costs per item so the view shows the same numbers as the editor (including the Part C fix for cost per portion).
- **Structure:** One scrollable page, RTL, Hebrew labels (translate pipe / heHeader).
  - **Block 1 – Menu info:** Cover rows (שם תפריט, סוג אירוע, תאריך, מספר סועדים, פריטים לסועד) from current menu.
  - **Block 2 – Sections and dishes:** For each menu section (מנות עיקריות, etc.), section title then **per dish** a row or block with: dish name, derived portions (מנות), food cost in ₪ (עלות מזון), cost per 1 portion (עלות למנה) — using the **correct** formulas after Part C fix — and any other active dish fields (e.g. sell price). Data comes from the same logic as the editor: `getDerivedPortions`, `getAutoFoodCost`, `getFoodCostPerPortion` (fixed).
- Reuse existing `ExportPayload` / `ExportSection`; no new export types. The preview template renders sections as tables or labeled rows; the menu view can use one section per menu section with headerRow + rows where each row is one dish and columns are dish name, portions, food cost ₪, cost per portion, etc.

### UI (menu-intelligence)
- [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html): Replace the single "All" button with `view-export-wrap` + dropdown; when open, **View** → `onViewAll()` (sets payload to `getMenuAllViewPreviewPayload`), **Export** → `onExportAllTogether()`.
- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts): Add `'all'` to view modal type; add `exportPreviewType_ === 'menu-all'`; implement `onViewAll()`; in `onExportFromPreview()` when type is `'menu-all'`, call `exportAllTogetherMenu()` then clear preview.

### Visual representation – Menu view (single scrollable page, RTL, Hebrew)

Preview uses `dir="rtl"`; labels from `heHeader()` / translate pipe. Menu cover then one table per section; each row = one dish with dish data (after Part C fix).

```
                        ┌─────────────────────────────────────────────────────────────────────────┐
                        │  [שם תפריט] — הכל                                    ← title (RTL)   │
                        │  [סוג אירוע] · [תאריך]                                ← subtitle       │
                        │  יוצא בתאריך: …                                        ← exported_at   │
                        ├─────────────────────────────────────────────────────────────────────────┤
                        │  פרטי תפריט (menu info block)                                            │
                        │  ┌────────────────────┬────────────────────┐  ← RTL                  │
                        │  │ ערך                 │ שדה                 │  (field | value)        │
                        │  │ [menu name]         │ שם תפריט            │                         │
                        │  │ [event type]        │ סוג אירוע           │                         │
                        │  │ [date]              │ תאריך               │                         │
                        │  │ [guest count]      │ מספר סועדים         │                         │
                        │  │ [pieces]            │ פריטים לסועד        │                         │
                        │  └────────────────────┴────────────────────┘                          │
                        ├─────────────────────────────────────────────────────────────────────────┤
                        │  מנות עיקריות (section title)                                            │
                        │  ┌──────────┬────────┬──────────────┬────────────┬────────────┐  RTL  │
                        │  │ מחיר מכירה│ עלות למנה│ עלות מזון (₪) │ מנות       │ שם מנה     │       │
                        │  │ …        │ [per 1] │ [total ₪]    │ [derived]  │ [dish name]│       │
                        │  │ …        │ …       │ …           │ …          │ …          │       │
                        │  └──────────┴────────┴──────────────┴────────────┴────────────┘       │
                        ├─────────────────────────────────────────────────────────────────────────┤
                        │  [Section 2 name]                                                      │
                        │  (same table: שם מנה | מנות | עלות מזון (₪) | עלות למנה | מחיר מכירה)   │
                        │  …                                                                      │
                        └─────────────────────────────────────────────────────────────────────────┘
  Export to Excel    Print    Close  ← actions
```

- **Cost columns (after Part C fix):** **עלות מזון (₪)** = total food cost for derived portions (getAutoFoodCost). **עלות למנה** = cost of 1 portion = total ÷ derived portions (getFoodCostPerPortion fixed). Both use same Hebrew/labels as editor.

---

## Part C – Dish data miscalculation fix (menu-intelligence)

### Problem
- **Food cost (₪)** should be the total cost in shekels for the dish according to **amount of portions × guests** (derived portions). This is already correct: `getAutoFoodCost` uses `derivePortions(...)` and scales recipe cost by `derivedPortions / baseYield`, so it shows total cost for the derived number of portions.
- **Cost of 1 portion** should always be the cost of **one** portion. Currently `getFoodCostPerPortion` divides total by `serving_portions` (form value, often 1), so when total is for 40 portions it shows 991.2 instead of 991.2/40 ≈ 24.78.

### Fix
- **File:** [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)
- **Change:** In `getFoodCostPerPortion(sectionIndex, itemIndex)`, divide by **derived portions** (same as used in `getAutoFoodCost`), not by `serving_portions`.
  - Get `derivedPortions = this.getDerivedPortions(this.getItemsArray(sectionIndex).at(itemIndex))` (or reuse the same derivePortions call as in getAutoFoodCost for this item).
  - `return total / Math.max(1, derivedPortions)` (then round as now).
- **Result:** "עלות למנה" (cost per 1 portion) = total food cost ÷ number of portions actually produced (derived portions). "עלות מזון (₪)" stays as is (total for derived portions).

---

## Files to touch

| File | Change |
|------|--------|
| [recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html) | Wrap "All" in view-export-wrap; add view-export-modal with View and Export when `viewExportModal_() === 'all'`. |
| [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts) | Add `'all'` to view modal type; add `'recipe-all'` to export preview type; implement `onViewAll()` and handle `'recipe-all'` in `onExportFromPreview()`. |
| [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) | Replace single "All" button with view-export-wrap + view-export-modal (View / Export). |
| [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts) | Add `'all'` to view modal; add `'menu-all'` preview type; `onViewAll()` → set payload from `getMenuAllViewPreviewPayload`; handle `'menu-all'` in `onExportFromPreview()`; fix `getFoodCostPerPortion` to divide by derived portions (Part C). |
| [export.service.ts](src/app/core/services/export.service.ts) | Add `getMenuAllViewPreviewPayload(menu, recipes)` returning ExportPayload with menu cover + sections with per-dish rows (dish name, derived portions, food cost ₪, cost per portion, other dish fields). |

## Summary
- **Recipe Builder:** View = one screen (recipe info + ingredients + workflow); Export = same "all" Excel (info + shopping list).
- **Menu Builder:** View = one screen with **only menu structure and info beside each dish** (from dish data); Export = same "all" Excel (menu + checklist + shopping).
- **Cost fix (Part C):** Cost per 1 portion = total food cost ÷ **derived portions** (not serving_portions). Food cost (₪) unchanged (total for derived portions). Implement first.
- **Visuals (both RTL, Hebrew):**
  - **Recipe view:** See "Visual representation – Recipe view" above: title, subtitle, exported_at, header row (תאריך, שם המתכון, כמות, יח'), מצרכים table, הוראות הכנה, זמן הכנה, actions.
  - **Menu view:** See "Visual representation – Menu view" above: title (שם תפריט — הכל), subtitle, פרטי תפריט table, then one table per section (שם מנה | מנות | עלות מזון (₪) | עלות למנה | מחיר מכירה), actions.
