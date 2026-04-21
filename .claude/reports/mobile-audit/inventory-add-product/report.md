# Mobile Audit — inventory-add-product
**Route:** `/inventory/add`
**Viewport:** 375×812 RTL
**Date:** 2026-04-20
**Auditor:** Mobile Flow Auditor (automated)

---

## Issues Found

### CRITICAL

None found.

---

### MAJOR

#### M1 — Purchase option rows obscured by FAB + bottom nav (shot 08)
When 2 purchase options are added, the first option's "מחיר מיוחד" checkbox row sits directly behind the FAB button (teal circle, `left:8px`) and the bottom nav bar. The FAB overlaps the checkbox label making it untappable on mobile.
**Screenshot:** `shots/08-purchase-options.png`

#### M2 — Allergens dropdown results clipped behind FAB + bottom nav (shot 07)
When the allergens search field is focused and options render, the results list is clipped by the FAB and bottom nav. Options appear behind the fixed nav (56px) and are unreachable.
**Screenshot:** `shots/07-allergens-p4.png`

#### M3 — Allergens expanded section content behind bottom nav on open (shot 06)
On first expand of the allergens panel, the "מחדל" text appears below the bottom nav bar (visible clipped at bottom of viewport). Content is not scrolled into view on expand.
**Screenshot:** `shots/06-allergens.png`

---

### MINOR

#### m1 — Name field: long Hebrew text truncated with no overflow hint (shots 02, 03)
P1 (40-char) and P2 (80-char) Hebrew text shows only the tail end in the field. No `title` attribute or overflow indicator.
**Screenshots:** `shots/02-name-p1.png`, `shots/03-name-p2.png`

#### m2 — Category dropdown overlaps form fields above (shot 04b)
Category dropdown list physically covers the "יחידה בסיס" label and input row.
**Screenshot:** `shots/04b-both-dropdowns.png`

#### m3 — Escape key unreliable for dropdown dismiss (cross-page known issue)
Escape did not reliably close open dropdowns during testing.

#### m4 — FAB positioned `left:8px` wrong for RTL (cross-page known issue)
Teal FAB at `left:8px` instead of `right:8px` partially obscures purchase option and allergen content.

#### m5 — Supplier button shows no visible expand feedback (shot 09)
Tapping ספק produced no visible panel expansion or scroll-into-view. No error state either.
**Screenshot:** `shots/09-supplier.png`

---

## Totals
Critical: 0 · Major: 3 · Minor: 5

## Screenshots
| File | Step |
|------|------|
| `shots/01-baseline.png` | Baseline |
| `shots/02-name-p1.png` | Name P1 40-char Hebrew |
| `shots/03-name-p2.png` | Name P2 80-char Hebrew |
| `shots/04-base-unit-p4.png` | Base unit dropdown open |
| `shots/04b-both-dropdowns.png` | Category dropdown mutual exclusion test |
| `shots/05-add-category.png` | Category dropdown options |
| `shots/06-allergens.png` | Allergens expanded |
| `shots/07-allergens-p4.png` | Allergens search dropdown open |
| `shots/08-purchase-options.png` | 2 purchase options added |
| `shots/09-supplier.png` | Supplier button tapped |
| `shots/10-save.png` | Save button area |
