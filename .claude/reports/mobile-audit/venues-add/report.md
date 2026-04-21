# Mobile Audit — venues-add (`/venues/add`)
**Date:** 2026-04-20  
**Viewport:** 375×812 RTL  
**Probe:** P6 (20+ infra rows)  
**Screenshots:** 4

---

## Cross-page issues (confirmed, not detailed)
FAB left:8px wrong RTL; bottom nav covers 56px; dropdowns don't dismiss on Escape; content behind sticky header.

---

## NEW defects

### CRITICAL
None.

### MAJOR

#### M1 — Bottom nav occludes first two infra rows during mid-scroll
**Severity:** Major  
**Location:** Infra rows section, rows 1–2 after scrolling to the list  
**Observed:** When 20+ rows are present the sticky bottom nav (56px) sits on top of the first 1–2 visible infra rows at the scroll position where the header has just left the viewport. The row inputs and "הסר" button for those rows are partially hidden.  
**Screenshot:** shots/03-infra-20rows.png — rows 1–2 clipped behind bottom nav.

#### M2 — FAB overlaps infra row delete controls (RTL position wrong)
**Severity:** Major  
**Location:** FAB button at left:8px, overlaps leftmost column of rows  
**Observed:** FAB is at left:8px (should be right:8px in RTL). With 20+ rows the FAB floats over the "הסר" (delete) column on rows near the bottom of the visible area, making delete controls unreachable without deliberate scrolling away from the FAB zone.  
**Screenshot:** shots/03-infra-20rows.png — FAB overlaps row delete area.

### MINOR

#### m1 — "סוג סביבה" renders as free-text input, not a constrained picker
**Severity:** Minor  
**Location:** Environment-type field (@e9)  
**Observed:** ARIA tree shows [textbox] with value "חוץ / שטח". Has a visual chevron but accepts arbitrary free-text. On mobile a native select would give the OS picker; a textbox allows invalid values with no validation feedback.  
**Screenshot:** shots/01-baseline.png.

#### m2 — "הוסף שורה" plus icon sits on wrong side for RTL
**Severity:** Minor  
**Location:** "הוסף שורה" button  
**Observed:** The + icon is to the left of the Hebrew label. In RTL the icon should trail the text (right side). Current layout breaks reading order.  
**Screenshot:** shots/01-baseline.png.

#### m3 — No capacity field present (probe spec mismatch)
**Severity:** Minor  
**Location:** Form fields  
**Observed:** Task probe specified filling a "capacity" field; no such field exists. Form contains: שם, סוג סביבה, הערות, and infra rows only. If planned, field is missing.

---

## What works
- "הסר" (delete) button accessible on all 22 rows — no controls hidden by overflow.
- Rows stack vertically only — no horizontal overflow beyond 375px viewport width.
- Save ("שמור") and Cancel ("ביטול") fully visible at page bottom, not obscured.
- Auth: loads without redirect.
- "הוסף שורה" adds rows reliably, no double-add on tap.

---

## Screenshots
| # | File | Description |
|---|------|-------------|
| 1 | shots/01-baseline.png | Empty form on load |
| 2 | shots/02-form-partial.png | Name + notes filled |
| 3 | shots/03-infra-20rows.png | 22 infra rows added |
| 4 | shots/04-save.png | Scrolled to save button |
