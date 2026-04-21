# Mobile Audit Report — recipe-builder-new-dish

**Flow:** `/recipe-builder` (new dish — מנה type, with מיזאנפלאס prep list)
**Viewport:** 375×812 (RTL — Hebrew)
**Auditor:** Mobile Flow Auditor (subagent)
**Date:** 2026-04-20
**Credentials used:** mobileaudit@foodvibe.test / Audit2026!
**Screenshots:** 11 (`shots/`)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 (new, dish-mode specific) |
| Major    | 4 (new, dish-mode specific) |
| Minor    | 2 (new, dish-mode specific) |
| **Total new** | **8** |
| Cross-page confirmed | 4 (see recipe-builder-new-prep) |

---

## Cross-Page Defects Confirmed Present

The following defects from `recipe-builder-new-prep` are confirmed present in the מנה (dish) flow:

| ID | Issue | Evidence |
|----|-------|----------|
| C1 | FAB `left: 8px` — wrong RTL side | Measured: `left:8, right:64` — shots/08-save.png |
| C3 | approve-stamp clips viewport — `right: 367px`, w=56px | Measured: `right:367` — shots/08-save.png |
| C2 | `col-actions` ingredient delete `display:none` | Measured: `display:none, w:0` — shots/09-ingredient-section.png |
| C4 | Ingredient `col-drag` drag handle 0x0 | Measured: `display:none, w:0, h:0` — shots/09-ingredient-section.png |

---

## New Critical Defects

### DC1 — Prep-row delete button (`.col-prep-actions`) is `display: none` on all dish prep rows
**Screenshots:** shots/04-prepitems-5.png, shots/05-prepitems-20.png
**Element:** `.col-prep-actions` inside `.prep-grid-row` (CDK drag row in מיזאנפלאס list)
**Measured:** `display: none`, `width: 0` on all 20 prep rows tested
**Button inside:** `<button class="c-icon-btn danger">` with `lucide-icon name="trash-2"` — in DOM but zero-size container
**Impact:** Users cannot delete individual prep items (מיזאנפלאס rows) on mobile in dish mode. Functional regression. Affects all dish recipes.

### DC2 — Prep-row drag handle renders at 0×0 on all dish prep rows
**Screenshots:** shots/04-prepitems-5.png, shots/05-prepitems-20.png
**Element:** `.cdk-drag-handle.col-drag` inside `.prep-grid-row`
**Measured:** `display: none`, `width: 0`, `height: 0` on all 20+ prep rows
**Impact:** Row reordering completely inaccessible on mobile for מיזאנפלאס prep list. No visual affordance for drag; no usable tap target.

---

## New Major Defects

### DM1 — "Guest Admin" nav avatar floats mid-page over header card during scroll
**Screenshots:** shots/04-prepitems-5.png, shots/08-save.png, shots/09-ingredient-section.png
**Element:** User avatar badge in top navigation bar
**Observed:** The nav avatar (green "G" circle + "Guest Admin" text) detaches from the nav bar and floats over the recipe header card — appearing at y≈300–330px into content during certain scroll states. Visible between the image upload area and rating stars.
**Impact:** Obscures header content; layering/z-index collision between sticky nav avatar and scrolled content.

### DM2 — Labels dropdown does not dismiss on Escape key
**Screenshots:** shots/07-labels-p4.png, shots/08-save.png
**Element:** `.ng-dropdown-panel` for תוויות (labels multi-select)
**Observed:** After pressing Escape, labels dropdown remains fully open. Renders over the "אינדקס מרכיבים" section, obscuring ingredient search.
**Impact:** Keyboard/soft-dismiss does not work. Dropdown blocks underlying content until user taps elsewhere.

### DM3 — Ingredient search text truncated (RTL leading-char clip)
**Screenshots:** shots/09-ingredient-section.png
**Element:** `input[placeholder="חפש מוצר או מתכון"]` in אינדקס מרכיבים
**Observed:** Value "עגבנייה" renders as ".בנייה" — leading characters clipped behind left edge of field in RTL layout.
**Impact:** Users cannot see beginning of ingredient names during typing, making ingredient search error-prone.

### DM4 — Prep-row item names truncated in all rows
**Screenshots:** shots/04-prepitems-5.png, shots/05-prepitems-20.png
**Element:** `input[placeholder="חפש הכנה"]` in each `.prep-grid-row`
**Observed:** Prep item names are visually cut off — search magnifier icon on right eats into display area. E.g., "פרחי עגבניה שרי" shows as "פרחי עגבניה שר", "עלי בזיליקום טרי" shows as "עלי בזיליקום טו".
**Impact:** Users cannot confirm full prep item names without tapping into each field.

---

## New Minor Defects

### Dm1 — Recipe name input clips beginning of long text (RTL overflow)
**Screenshots:** shots/02-name-filled.png
**Element:** `input[placeholder="שם המנה..."]`
**Observed:** With 40+ char name, input shows only trailing portion. Beginning of Hebrew text clipped. No multi-line expansion.
**Impact:** Users cannot verify start of long dish names without clearing field.

### Dm2 — Form state fully lost on scroll-to-top gesture
**Reproduction:** Calling `window.scrollTo(0, 0)` after deep scroll caused full component reset — all 21 prep rows wiped, type reverted to הכנה, name cleared.
**Element:** Angular recipe-builder component lifecycle / scroll event handling
**Impact:** Fragile component lifecycle — browser navigation gesture or programmatic scroll could destroy in-progress form data.

---

## Dish Mode vs. Prep Mode Layout Differences

| Feature | הכנה (Prep) mode | מנה (Dish) mode |
|---------|-------------------|-----------------|
| Prep item structure | Full ingredient grid | Simplified `.prep-grid-row` (name + category + qty + unit + actions) |
| Delete mechanism | `.col-actions` (hidden — C2) | `.col-prep-actions` (hidden — DC1) |
| Drag handle | `.cdk-drag-handle.col-drag` (0×0 — C4) | `.cdk-drag-handle.col-drag` (0×0 — DC2) |
| Category selector | N/A | Custom `app-custom-select` (formcontrolname=category_name) |
| Add item button | "הוסף שורה" | "הוסף הכנה" |
| Categories available | N/A | קישוט, תוספות, נקניקיות, רטבים, קצבות, קונדיטוריה, הפשרות, בישולים, חיתוכים, רטבים_צירים, טיגון |
| Workflow steps section | Present (תהליך הכנה) | Absent (replaced by מיזאנפלאס) |
| Save button label | "שמור מתכון" | "שמור מנה" |

---

## Cross-Cutting Measurements (Dish Mode)

| Issue | Selector | Measured | Expected |
|-------|----------|----------|----------|
| FAB position | `.hero-fab-container` fixed | `left:8, right:64, top:688` | `right:8px` (RTL) |
| Approve stamp | `.approve-stamp` fixed | `left:311, right:367` | `right:8px` or clamped |
| `col-prep-actions` | per prep row | `display:none, w:0` | Visible, ≥44px tap target |
| `col-drag` (prep row) | per prep row | `display:none, w:0, h:0` | Visible, ≥44px |
| `col-actions` (ingredient) | `.ingredients-grid-header` | `display:none` | Visible |
| Labels dropdown Escape | תוויות dropdown | Remains open | Should close |

---

## Screenshots Index

| File | Step | Notes |
|------|------|-------|
| shots/00-initial-state.png | Initial load | הכנה type pre-selected by default |
| shots/01-type-selected.png | After selecting מנה type | Type toggled; placeholder changes to "שם המנה..." |
| shots/02-name-filled.png | Name filled (long stress text) | Beginning of name clipped in RTL |
| shots/03-image-upload.png | Image upload area | Camera icon thumbnail; same as prep mode |
| shots/04-prepitems-5.png | 5 prep items | FAB wrong side; NOT APPROVED stamp; delete/drag hidden |
| shots/05-prepitems-20.png | 20+ prep items (21 rows, 4 categories) | All rows; delete/drag 0×0 confirmed |
| shots/05b-prepitems-20-detail.png | Rows 18–21 detail | |
| shots/06-portions.png | Portions / serving section | Clean render; +/- counter functional |
| shots/07-labels-p4.png | Labels dropdown open | Overlaps next section; partially obscures content |
| shots/08-save.png | Save button area | FAB left:8px; stamp right:367px; labels not dismissed |
| shots/09-ingredient-section.png | Ingredient index section | Avatar floating; ingredient name clipped |
