# Mobile Audit — equipment-add
**Flow:** /equipment/add · Add Equipment form  
**Viewport:** 375×812 RTL  
**Date:** 2026-04-20  
**Probe P6 status:** NOT APPLICABLE — equipment scaling is a single formula (per-guests / min / max), not a multi-row rules table. No "הוסף כלל" button exists.

---

## Cross-page issues (confirmed present)
- FAB left:8px (confirmed — computed left:8px, should be right:8px for RTL)
- Bottom nav covers 56px (confirmed — nav top:756px, height:56px)
- Content behind sticky header (confirmed — header position:sticky, height:62px)
- Dropdowns don't dismiss on Escape (not tested this flow — no multi-select dropdown opened)
- Allergens/dropdowns clipped by nav (not applicable — no allergen fields on this form)

---

## NEW defects — equipment-add

### CRITICAL (0)

### MAJOR (2)

**MAJ-1: Scaling fields cut off below viewport / bottom nav**  
The "לכל אורחים" (per-guests) input bottom edge is at y=817, which is 5px past the 812px viewport height. The "כמות מקסימלית" (max quantity) input bottom edge is at y=901, well below viewport. Both fields are unreachable without scrolling, but the page does not indicate scrollability — the user has no affordance to scroll further. With the bottom nav at y=756 the last two scaling fields are effectively hidden on first render.  
Affected: `כלל סקלה` section when `הפעל סקלה` is checked.

**MAJ-2: User avatar/profile chip overlaps form content mid-scroll**  
The "Guest Admin G" badge (position:fixed or sticky) renders at ~y=290 on top of the name field label and input area during scroll. Visible in shots 02b and 04 — the avatar chip floats over the form card, obscuring the "שם" field at mid-scroll positions.

### MINOR (1)

**MIN-1: "כמות מקסימלית" label/input layout breaks at 375px**  
The max-quantity field and its sibling "לכל אורחים" are laid out side-by-side at x=195 and x=45, each 134.5px wide. At 375px width with RTL the label "כמות מקסימלית" (right side) and "כמות מינימלית" (left side) appear to be swapped relative to their numeric inputs — RTL column order places right-start fields on the left visually, causing the label-to-input pairing to look reversed.

---

## Screenshots
| File | Description |
|------|-------------|
| shots/01-baseline.png | Page load baseline |
| shots/02-form-partial.png | Name filled, form partial |
| shots/02b-scaling-revealed.png | Scaling section after enabling checkbox |
| shots/03-scaling-20rows.png | P6 N/A — single-formula scaling (no row table) |
| shots/04-save.png | Save button area, bottom of form |

---

## P6 Probe Notes
Equipment scaling does not use a row-based rules table. The `כלל סקלה` section contains exactly 3 numeric inputs (per-guests, min, max). There is no "הוסף כלל" add-row button. P6 (20+ scaling rows) cannot be exercised on this flow.
