# Nutrition Badge — Design Spec
**Date:** 2026-04-19  
**Status:** Approved for implementation  
**Scope:** Nutrition glance badge + hover tooltip for products with `nutrition_per_100g` data

---

## 1. Overview

A slim colored macro-bar strip ("badge") appears next to every product name in the surfaces listed below. Hovering (desktop) or tapping (mobile) the badge reveals a glass tooltip panel with a full nutrient breakdown. Products without nutrition data show no badge at all — silent omission, no placeholder.

---

## 2. Surfaces

| Surface | Location in UI | Component to update |
|---|---|---|
| Inventory product list | Next to product name in each row | `inventory-product-list.component.html` |
| Recipe builder ingredient rows | Next to product name, not in cook-view | `recipe-ingredients-table.component.html` (or equivalent builder component) |

**Explicitly excluded:**
- Ingredient search dropdowns (too small)
- Cook-view / recipe viewer
- Quick-add / quick-edit modals (phase 2, if ever)

---

## 3. Data Model

### 3a. Backend (already in MongoDB)
The `nutrition_per_100g` field is already written to MongoDB by the catalog seeder. It is absent from the TypeScript `Product` interface and must be added.

### 3b. TypeScript interface addition (`product.model.ts`)

```typescript
export interface NutritionPer100g {
  energy_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  sugars_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
}
```

Add to `Product` interface:
```typescript
nutrition_per_100g?: NutritionPer100g;
```

---

## 4. Badge Component

**Component:** `NutritionBadgeComponent`  
**Selector:** `<app-nutrition-badge>`  
**Input:** `@Input() nutrition: NutritionPer100g | null | undefined`  
**Standalone, OnPush**

### 4a. Badge visual

A single Lucide `Leaf` icon, 14px, colored by the dominant macro (whichever contributes the most kcal):

| Dominant macro | Leaf color |
|---|---|
| Protein (`protein_g × 4`) | `#3b82f6` blue |
| Carbs (`carbs_g × 4`) | `#f59e0b` amber |
| Fat (`fat_g × 9`) | `#ef4444` red |
| Fiber (`fiber_g × 2`) | `#10b981` green |

If all macros are zero/absent, show no badge. The macro bar strip belongs inside the tooltip only.

### 4b. Rendering rule

```
if (!nutrition || allMacrosZero(nutrition)) → render nothing (no host element in DOM)
```

### 4c. Hover / tap behavior

- **Desktop:** tooltip appears on `mouseenter`, hides on `mouseleave`
- **Mobile:** tooltip toggles on `click/tap`
- Tooltip rendered inside the component via `@ViewChild` + `ngIf`, positioned with CSS `position: absolute` above the badge strip. No Angular CDK overlay required for phase 1.

---

## 5. Tooltip Design

**Width:** 164px  
**Theme:** Liquid Glass — `background: rgba(255,255,255,0.92)`, `border: 1px solid rgba(0,0,0,0.08)`, `border-radius: 1rem`, `box-shadow: 0 8px 28px rgba(15,23,42,0.13), 0 2px 6px rgba(15,23,42,0.07)`, `backdrop-filter: blur(16px)`  
**Direction:** RTL (`direction: rtl`)  
**Padding:** `10px 11px 8px`

### 5a. Structure (top → bottom)

```
┌─────────────────────────────┐
│        100 גר׳              │  ← teal, 0.62rem, uppercase, centered
├─────────────────────────────┤
│  [macro bar — 8px tall]     │  ← same color segments as badge
│  [icon legend row]          │  ← 4 icons + percentage each, no text
├─────────────────────────────┤
│  divider                    │
├─────────────────────────────┤
│  🔥  קלוריות       123 קק״ל │  ← nutrient rows
│  💪  חלבון           8.2 ג  │
│  🌾  פחמימות        42.1 ג  │
│    🍬  מהם סוכרים    3.1 ג  │  ← sub-row, indented 8px
│  💧FAT שומן          6.3 ג  │
│  🌿  סיבים           1.8 ג  │
│  〰️  נתרן            210 מג │
├─────────────────────────────┤
│  Open Food Facts · per 100g │  ← 0.6rem muted, centered
└─────────────────────────────┘
```

### 5b. Icon set

| Nutrient | Icon | Source | Color |
|---|---|---|---|
| Calories | Flame | Lucide `Flame` | `#f97316` (orange) |
| Protein | Dumbbell | Lucide `Dumbbell` | `#3b82f6` |
| Carbs | Wheat | Lucide `Wheat` | `#f59e0b` |
| Sugars | Candy | Lucide `Candy` | `#f59e0b` |
| Fat | Custom SVG (drop + "FAT" text) | See §5c | `#ef4444` |
| Fiber | Leaf | Lucide `Leaf` | `#10b981` |
| Sodium | Waves | Lucide `Waves` | `#64748b` |

Icon size in rows: 12×12px. Icon size in legend: 10×10px.

### 5c. Fat icon SVG

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round">
  <path d="M12 2C6.5 8 4 12.5 4 15a8 8 0 0 0 16 0c0-2.5-2.5-7-8-13z"/>
  <text x="12" y="17" text-anchor="middle" font-size="5.5" font-weight="800"
        fill="#ef4444" stroke="none" font-family="system-ui,sans-serif">FAT</text>
</svg>
```

Used everywhere fat appears: legend, nutrient row, badge strip color (no icon on strip).

### 5d. Legend row

Four icons in a horizontal flex row (space-between), each showing:
- Icon (10px)
- Percentage of total kcal from that macro (e.g. "32%"), 0.6rem, muted

Macros shown: Protein / Carbs / Fat / Fiber (no calories, no sugars, no sodium in legend).

### 5e. Sugars sub-row

Rendered only when `sugars_g` is present. Indented 8px from left (RTL: padding-left in LTR = padding-right in RTL). Smaller font (0.68rem), muted label color.

### 5f. Tooltip positioning

- Appears **above** the badge strip by default
- If not enough space above (within 150px of viewport top), flip below
- `z-index: 1100` (above modals if needed)

---

## 6. Angular Component Architecture

```
NutritionBadgeComponent (standalone, OnPush)
├── @Input() nutrition: NutritionPer100g | null | undefined
├── computed: macroSegments[] (width percentages)
├── computed: legendItems[] (icon + percentage)
├── computed: rows[] (icon + label + value + unit)
├── isVisible: boolean (all-zeros guard)
└── showTooltip: boolean (hover/tap state)
```

Single component file. No separate tooltip component — the tooltip is a conditional `div` inside the same template, toggled by `showTooltip`. This keeps it simple for phase 1; CDK overlay can be added later if z-index or overflow clipping becomes an issue.

**Files to create:**
- `src/app/shared/nutrition-badge/nutrition-badge.component.ts`
- `src/app/shared/nutrition-badge/nutrition-badge.component.html`
- `src/app/shared/nutrition-badge/nutrition-badge.component.scss`

---

## 7. Integration Points

### 7a. Inventory product list
File: `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`

Place `<app-nutrition-badge [nutrition]="product.nutrition_per_100g">` next to the product name. The badge self-hides when data is absent, so no `*ngIf` wrapper needed at the call site.

### 7b. Recipe builder
File: TBD — explore recipe-builder ingredient row template. Same pattern: drop `<app-nutrition-badge>` next to product name. Confirm the component that renders ingredient rows in the builder (not cook-view).

---

## 8. Out of Scope (Phase 1)

- Recipes, dishes, menus — nutrition aggregation is a separate effort
- Nutri-Score / A–E letter grade — no grading algorithm in phase 1
- Nutrition data entry / editing UI
- Real-time tooltip with CDK overlay (simple CSS positioning is sufficient)
- Quick-add modal, search dropdowns

---

## 9. Open Questions (resolved)

| # | Question | Answer |
|---|---|---|
| 1 | Which surfaces? | Inventory list + recipe builder only |
| 2 | No-data behavior | Hide badge entirely |
| 3 | Fat icon | Custom SVG drop + "FAT" embedded text |
| 4 | Sugar icon | Lucide `Candy` |
| 5 | Macro bar reference | 100g serving |
