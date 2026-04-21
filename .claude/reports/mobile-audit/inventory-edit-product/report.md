# Mobile Audit — inventory-edit-product
**Route:** `/inventory/edit/:id` (tested with `demo_001` — בצל צהוב)
**Viewport:** 375×812 RTL
**Date:** 2026-04-20
**Auditor:** Mobile Flow Auditor (subagent)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Major | 3 |
| Minor | 2 |
| **Total** | **7** |

---

## New Defects (not in inventory-add-product report)

### CRITICAL

#### DEF-IE-01 — Category dropdown stays open after selection; second category tag applied unexpectedly
**Screenshot:** `shots/03-category-change.png`, `shots/04-save.png`
**Observed:** After clicking "בשר" from the category dropdown, the dropdown did not close. In `shots/04-save.png` the dropdown is still rendered mid-page, partially covering the 3rd purchase option row. Two category tags now appear in the category field ("ירקות ×" and "בשר ×"), suggesting multi-select is active but the field label says "קטגוריה" (singular). Saving with two categories could corrupt backend data.
**Impact:** Data integrity risk; dropdown obscures content; 3rd purchase option row is inaccessible behind open dropdown.

#### DEF-IE-02 — Stale duplicate-name validation fires on load for existing product (name unchanged)
**Screenshot:** `shots/03-category-change.png`, `shots/04-save.png`
**Observed:** The error "כבר קיים חומר גלם בשם זה" (ingredient with this name already exists) appears immediately on the edit form — before the user has typed anything. The validator compares the existing product name against the full list including itself, producing a false positive.
**Impact:** Incorrect validation falsely blocks saving an unchanged product name; misleads the user.

---

### MAJOR

#### DEF-IE-03 — FAB covers price/checkbox of 1st purchase option row
**Screenshot:** `shots/01-baseline.png`, `shots/02-three-purchase-options.png`
**Observed:** The teal FAB (flame icon, RTL `left:8px` cross-page bug) sits at ~y=430, directly overlapping the "מחיר מיוחד" checkbox and ₪3.7 price input of purchase option 1. The checkbox hit target is unreachable without scrolling.
**Impact:** First purchase option's special-price interaction blocked.

#### DEF-IE-04 — 3rd purchase option row partially obscured by sticky header avatar on scroll
**Screenshot:** `shots/04-save.png`
**Observed:** When scrolled to the bottom of the form, the fixed "Guest Admin" header avatar reappears over the top edge of the 3rd purchase option card (~y=530). The unit dropdown of the 3rd row renders behind the sticky header due to a z-index stacking context issue.
**Impact:** 3rd purchase option unit field partially inaccessible.

#### DEF-IE-05 — Category dropdown list clipped; last options and "הוסף" hidden below viewport
**Screenshot:** `shots/03-category-change.png`
**Observed:** The category dropdown opens downward and clips — options "audit-cat-1744", "audit_cat2_1744", and "הוסף" are hidden below the visible area. No upward-flip logic exists. Bottom nav consumes 56px, further reducing usable height.
**Impact:** Last 3 category options and the "add new category" action require a secondary scroll gesture to reach.

---

### MINOR

#### DEF-IE-06 — Button label mismatch: "הוסף יחידת רכש" vs. "הוסף אפשרות רכישה" in add-product
**Screenshot:** `shots/01-baseline.png`
**Observed:** Edit form uses "הוסף יחידת רכש" while the add-product form uses "הוסף אפשרות רכישה" for the same action.
**Impact:** Minor inconsistency; no functional breakage.

#### DEF-IE-07 — Save button row has no safe-area padding above bottom nav
**Screenshot:** `shots/04-save.png`
**Observed:** "עדכן מוצר" / "חזור לרשימה" buttons sit flush against the bottom navigation bar with no padding-bottom or safe-area inset. On devices with gesture navigation bars the CTAs may be clipped.
**Impact:** Save CTA may be partially unreachable on iOS/Android gesture-nav devices.

---

## Cross-Page Issues Confirmed

| Issue | Status |
|-------|--------|
| FAB `left:8px` wrong RTL position | Confirmed present |
| Bottom nav covers bottom 56px | Confirmed present |
| Allergens dropdown clipped behind FAB + bottom nav | Button visible; dropdown not opened this pass (carry-forward) |
| Dropdowns don't dismiss on Escape | Carry-forward from add-product (not retested) |
| Purchase option rows obscured by FAB + nav | Confirmed — see DEF-IE-03, DEF-IE-04 |

---

## Screenshots

| File | Description |
|------|-------------|
| `shots/01-baseline.png` | Edit form on load — 2 purchase options, FAB overlap visible |
| `shots/02-three-purchase-options.png` | After adding 3rd purchase option |
| `shots/03-category-change.png` | Category dropdown open — clipping and false duplicate-name error visible |
| `shots/04-save.png` | Bottom of form — dropdown not dismissed, header overlap on 3rd row, save buttons above bottom nav |
