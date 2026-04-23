# Menu Intelligence Page — UI/UX Redesign Spec

**Date:** 2026-04-23  
**Status:** Approved  
**Branch:** feat/session-20260423

---

## 1. Overview

Redesign the visual presentation of the Menu Intelligence page. The page is where a chef builds a menu before an event — choosing dishes, organising them into course sections, and reviewing costs. The goal is to make it feel like a physical paper menu being filled in, not a computer form. It should be familiar, warm, and non-threatening to chefs who are not heavy computer users.

**Scope:** Visual layer only (HTML + SCSS). All business logic, Angular signals, keyboard navigation, export functions, and form validation are preserved exactly as-is.

---

## 2. Design Direction — Bistro Elegance Card

The page centres a single "paper card" on a warm linen background. The card uses a double-border frame (thick outer + thin inner), rounded corners, and Georgia serif typography throughout. Ornamental dividers (`— ✦ —`) give it the feel of a printed event menu held in hand.

### 2.1 Page Shell

| Property | Value |
|---|---|
| Body background | `#edeae2` (warm linen) |
| Paper max-width | `680px`, centred |
| Page padding | `20px 16px 40px` |

### 2.2 Paper Card

| Property | Value |
|---|---|
| Outer border | `2px solid #1a1a1a` |
| Outer border-radius | `16px` |
| Outer padding | `7px` (creates the gap between borders) |
| Inner border | `1px solid #1a1a1a` |
| Inner border-radius | `12px` |
| Inner padding | `28px 32px 24px` |
| Background | `#fdfdfa` |
| Box-shadow | `4px 6px 20px rgba(0,0,0,0.16)` |

### 2.3 Ornaments

- Top of paper: `— ✦ —` centred, `0.62rem`, `letter-spacing: 9px`, colour `#8a7450`
- Bottom of paper: same
- Between sections: `✦` with gradient rule lines either side (`color: #c8b890`)
- Between info header and sections: `✦` rule (same style)

---

## 3. Event Header — Inline Editable Text

Replaces the current stacked form column (`meta-column` with label+value pairs). The header reads like menu text; fields are edited by clicking directly on them.

### Structure (top to bottom)

1. **Tag line** — small uppercase chips: `event_type_ · serving_type_`
   - Font: `0.6rem`, `letter-spacing: 0.24em`, uppercase, colour `#8a7450`
   - Each chip: `cursor: pointer`, hover shows subtle warm background + dashed underline
   - Clicking `event_type_` chip → triggers existing event-type dropdown (same logic as today)
   - Clicking `serving_type_` chip → triggers existing custom-select (same logic as today)

2. **Menu title input** — centred, `1.85rem`, `font-style: italic`, Georgia
   - Transparent background, no border, full-width
   - Placeholder: `שם האירוע...` in muted gold

3. **Meta line** — three inline chips: `{guest_count_} אורחים · {event_date_display} · {serving_type_}`
   - Font: `0.78rem`, colour `#7a6a50`, Georgia
   - Clicking guests chip → activates inline number input in place (commit on Enter/blur)
   - Clicking date chip → triggers existing date picker (same logic as today)
   - Clicking serving_type chip → same as tag line chip above

4. **Ornamental rule** `✦` — separates header from sections

### What is removed
- `.meta-column`, `.meta-row`, `.meta-label`, `.counter-pill` — all deleted
- The stacked label/value layout is gone entirely

---

## 4. Dish Rows

### 4.1 Normal row (recipe assigned)

Layout (RTL flex row):

```
[ dish-name-wrap ]          [ ₪price ]  [ ✕ ]
  └─ dish name text  ▾
```

- `dish-name-wrap`: `display: inline-flex`, `align-items: center`, `gap: 3px` — holds name button + expand toggle together as one visual unit
- **Dish name**: `0.92rem`, Georgia, centred, clickable (triggers existing edit-name search flow)
- **▾ toggle**: sits immediately after the name text, `0.6rem`, colour `#c8b890` → `#8a7450` when open or on hover
- **Price**: `0.78rem`, `#7a6a50`, right-aligned, `direction: ltr`
- **✕ remove**: `opacity: 0`, revealed on row hover → `color: #d4a0a0` → `#c05050` on its own hover
- Each row separated by `border-bottom: 1px dotted #e2d8c6`

### 4.2 Annotation row (expanded on ▾ click)

Appears below the dish row when ▾ is clicked. Hidden by default (`display: none` → `display: flex`).

```
| עלות מזון  | מנות [input] | % לקיחה [input] | לפורציה |
```

- `border-top: 1px dashed #ede5d8`
- Fields separated by `border-left: 1px solid #ede5d8`
- Each field: centred label (`0.55rem`, uppercase, `#b0a080`) + value below (`0.77rem`, `#6a5a3a`)
- Editable fields (`serving_portions`, `predicted_take_rate_`): rendered as inline inputs with `border-bottom: 1px solid #c8b890`
- Read-only fields (`food_cost_money`, cost-per-portion): plain value span

### 4.3 Search slot (no recipe yet)

Replaces the dish row when `recipe_id_` is empty:

- Centred dashed-underline text input, `0.88rem`, italic placeholder `חפש מנה להוספה...`
- No border except `border-bottom: 1px dashed #c8b890` → `#8a7450` on focus
- Dropdown below (existing `app-scrollable-dropdown`, styling unchanged)

---

## 5. Section Headers

- Centred, `0.68rem`, `font-weight: 700`, `letter-spacing: 0.24em`, uppercase, `#5a4a2a`, Georgia
- `cursor: pointer` → hover colour `#8a7450` (clicking opens existing category-search dropdown)
- **Remove button** (`✕`): `position: absolute; left: 0`, `opacity: 0` → revealed on section-header hover
- Between sections: ornamental `✦` divider with gradient rules either side

---

## 6. Add Buttons

| Button | Text | Style |
|---|---|---|
| Add dish | `+ הוסף מנה` | `0.72rem`, centred, `#b0a080` → `#8a7450` hover, no border |
| Add section | `+ הוסף קטגוריה` | `0.78rem`, centred, same colours, `margin-top: 6px` |

Both use Georgia serif, transparent background, `letter-spacing: 0.06em`.

---

## 7. Financial Footnote (replaces footer bar)

Sits inside the paper, below the last section and above the bottom ornament.

- `border-top: 1px solid #e6dece`
- `margin-top: 20px; padding-top: 12px`
- Four metrics in a `justify-content: space-around` flex row:
  - `עלות מזון` → `eventCost_()` formatted `₪X,XXX`
  - `% עלות מזון` → `foodCostPct_()` — colour `#b05a2a` (warning) when > 33%, otherwise `#6a5a3a` (mirrors the 30% target with a small buffer; exact threshold can be tuned at implementation)
  - `הכנסות` → `totalRevenue_()`
  - `לאורח` → `costPerGuest_()`
- Label: `0.55rem`, uppercase, `#b0a080`
- Value: `0.82rem`, `font-weight: 600`, `#6a5a3a`

**The `.financial-bar` footer element is removed entirely** from the page HTML.

---

## 8. Toolbar — Pill Row Above Paper

Replaces the current `toolbarOpen_()` overlay toggle pattern for the primary actions. The `app-export-toolbar-overlay` component and its internal dropdown logic are preserved but the trigger moves to always-visible pill buttons.

### Pill row

- `display: flex; justify-content: center; gap: 8px; flex-wrap: wrap`
- Positioned above the paper card, `margin-bottom: 14px`
- Each pill: `background: rgba(255,255,255,0.9)`, `border: 1px solid #d0c8b4`, `border-radius: 20px`, `padding: 5px 14px`, `0.7rem`, colour `#5a4a2a`
- Hover: `background: #fff`, `border-color: #8a7450`
- **Save pill**: `background: #1a1a1a`, `color: #fff`, hover `background: #333`

### Pill items (match existing toolbar buttons)

| Pill | Icon | Action |
|---|---|---|
| קניות | 🛒 | `openViewExportModal('shopping-list')` |
| צ׳קליסט | 📋 | `toggleExportChecklistDropdown()` |
| הדפסה | 🖨 | `printMenu()` |
| הכל | 📦 | `openViewExportModal('all')` |
| שמור | — | `save()` |

The existing toolbar overlay (`app-export-toolbar-overlay`) and its sub-modals (`view-export-modal`, `checklist-export-dropdown`) remain in the template — they are triggered by the pill clicks above rather than by `toolbarOpen_()`.

---

## 9. Files Changed

| File | Change type |
|---|---|
| `_layout.scss` | Body background, shell max-width |
| `_paper-ui.scss` | Full rewrite — paper frame, header chips, section headers, dish rows, annotation row, add buttons, financial footnote |
| `_toolbar.scss` | Pill row above paper replaces overlay-trigger styles |
| `menu-intelligence.page.html` | Event header restructured to chip layout; financial-bar removed; toolbar trigger moved to pill row |
| `menu-dish-row.component.html` | `dish-name-wrap` wrapping name + toggle; annotation row replacing horizontal carousel |
| `menu-dish-row.component.scss` | New dish row, annotation row, search slot styles |

### Files NOT changed

- `menu-intelligence.page.ts` — zero changes
- All services, models, pipes — zero changes
- `app-export-toolbar-overlay`, `app-scrollable-dropdown`, `app-custom-select`, `app-export-preview` — component logic unchanged; styling may receive minor token alignment only

---

## 10. Behaviour Preserved

- All keyboard navigation: Tab, Shift+Tab, Arrow Up/Down, Enter, Escape, Space
- Dish search: type-to-filter, highlight, select with Enter
- Section category search: same as today
- Guest counter: existing `incrementGuests` / `decrementGuests` (now triggered by clicking the guests chip)
- Date picker: existing `openDatePicker()` (now triggered by clicking the date chip)
- Event type dropdown: existing `openEventTypeDropdown()` (now triggered by clicking event-type chip)
- Serving type select: existing `app-custom-select` (now triggered by clicking serving-type chip)
- Unsaved-changes guard: `hasRealChanges()` / `saveAndWait()` — untouched
- Export preview modal: `exportPreviewPayload_()` — untouched
- RTL direction on all elements
