# Mobile Audit: suppliers-add
**Route:** /suppliers/add  
**Viewport:** 375x812 RTL  
**Date:** 2026-04-20  
**Auth:** mobileaudit@foodvibe.test (Guest Admin — already authenticated)

---

## Cross-page issues (confirmed present)
FAB left:8px wrong RTL, bottom nav covers 56px, dropdowns don't dismiss on Escape, content behind sticky header, allergens/dropdowns clipped by nav — all confirmed on this page.

---

## New defects

### CRITICAL
None.

### MAJOR

**M1 — `min_order` label not localized (raw key exposed)**  
Label reads `min_order` instead of a Hebrew string (e.g., "הזמנה מינימלית"). All other labels are Hebrew. This is an untranslated i18n key displayed directly to the user.  
Screenshot: `shots/04-form-filled.png`  
Element: `<label>min_order</label>` (id: `min_order_mov_page`)

**M2 — Page title truncated at right edge**  
"הוסף ספק" renders with its right side touching x=375 (0 padding on right). In RTL the title aligns right but has no inset — the rightmost character of "ספק" sits flush against the viewport edge with no safe-area margin.  
Screenshot: `shots/01-baseline.png`  
Computed: title rect x=0 width=375, right=375 — zero right padding.

### MINOR

**m1 — Form has no phone/email/address fields**  
The supplier add form only exposes: name, contact person, delivery days (checkboxes), min_order, lead time. No phone number, email, or address fields are present. If intentionally deferred, note for completeness.  
Screenshot: `shots/04-form-filled.png`

**m2 — Delivery day checkbox tap targets borderline**  
7 checkboxes + labels span full width at ~28px each. No overflow clipping, but individual tap targets are tight at 375px. Visual RTL order is correct.  
Screenshot: `shots/01-baseline.png`

---

## Probe results

| Probe | Field | Value | Result |
|-------|-------|-------|--------|
| P1 | Name | 46-char Hebrew | Renders correctly, single line, no overflow |
| P3 | Name | "מתכון 🍝 123 pasta" | Renders correctly, RTL+LTR+emoji mixed as expected |

---

## Screenshots
1. `shots/01-baseline.png` — page load
2. `shots/02-name-p1.png` — P1 (40-char Hebrew)
3. `shots/03-name-p3.png` — P3 (emoji+LTR in RTL)
4. `shots/04-form-filled.png` — all fields filled
5. `shots/05-save.png` — save button visible
