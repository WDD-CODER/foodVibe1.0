# Mobile Audit — trash-restore
**Viewport:** 375×812 RTL  
**Date:** 2026-04-20  
**Flow:** /trash — view trashed item, restore it  
**Screenshots:** 4 (shots/01-baseline.png … shots/04-after-confirm.png)

---

## Known cross-page issues (excluded)
- FAB left:8px wrong RTL
- Bottom nav covers 56px
- Dropdowns don't dismiss on Escape
- Content behind sticky header

---

## New defects

### MAJOR-1 — All row action buttons below 44px touch target height
**Severity:** Major  
**Element:** `.btn-item` buttons — "משחזר", "ממחק לצמיתות", "היסטוריה"  
**Measured:** height = 30px on all three buttons (restore: 74×30, delete: 115×30, history: 67×30)  
**Required:** ≥44px per WCAG 2.5.5 / Apple HIG  
**Impact:** High miss-tap rate on a destructive-action screen. "ממחק לצמיתות" (permanent delete) is 30px tall — user can accidentally miss-tap.

---

### MAJOR-2 — Section-level action buttons also 30px tall
**Severity:** Major  
**Element:** `.btn-action.btn-restore`, `.btn-action.btn-dispose`  
**Measured:** height = 30px  
**Same root cause as MAJOR-1** — the entire button system on this page uses 30px height.

---

### MINOR-1 — Item action row has asymmetric RTL margin
**Severity:** Minor  
**Element:** `.trash-item-actions`  
**Measured:** left=45, right=308 inside card (card: left=33, right=342). Right/start gap = 34px, left/end gap = 12px.  
**Expected in RTL:** start side (right) should have equal or smaller margin than end side (left). Action row not flush to RTL start edge.

---

### MINOR-2 — Success toast overlaps page header on restore confirm
**Severity:** Minor  
**Element:** Green success toast "כל המתכונים שוחזרו"  
**Observed:** Toast renders at top of viewport over the "אשפה" heading and sticky top bar. Heading text illegible for toast duration.  
**Screenshot:** shots/04-after-confirm.png

---

### MINOR-3 — Confirmation modal CTA says "משחזר הכל" for single-item restore
**Severity:** Minor  
**Element:** `.c-modal-card` confirm button  
**Context:** Per-item restore triggers modal with title "לשחזר פריט זה?" (singular) but confirm CTA reads "משחזר הכל" (Restore All) — contradicts the singular framing.

---

## Checklist

| Check | Result |
|---|---|
| Restore button tap-target ≥44px | FAIL — 30px |
| Row action buttons clip within card | PASS |
| Confirmation modal fits at 375px | PASS — 343px wide, 16px margins |
| Modal confirm button ≥44px | PASS — 47px |
| Restore flow completes | PASS — item removed from trash |

---

## Summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 2 |
| Minor | 3 |
| Screenshots | 4 |
