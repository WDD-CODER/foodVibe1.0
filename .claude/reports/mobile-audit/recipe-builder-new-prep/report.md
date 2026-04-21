# Mobile Audit Report — recipe-builder-new-prep

**Flow:** `/recipe-builder` (new prep recipe — מנה מוכנה / הכנה type)
**Viewport:** 375×812 (RTL — Hebrew)
**Auditor:** Mobile Flow Auditor (subagent)
**Date:** 2026-04-20
**Credentials used:** mobileaudit / Audit2026!
**Screenshots:** 12 (`shots/`)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 4 |
| Major    | 5 |
| Minor    | 3 |
| **Total**| **12** |

---

## Critical Defects

### C1 — FAB on wrong RTL side (`left: 8px` hard-coded)
**Screenshot:** `shots/10b-save-button-bottom-zone.png`, `shots/05-ingredients-5rows.png`
**Element:** `.hero-fab-container` (fixed, `z-index: 210`)
**Measured:** `left: 8px`, `right: 311px`, renders at x=8–64px (inline-end / physical left)
**Expected RTL:** FAB should be at `right: 8px` (inline-start / physical right side)
**Impact:** In RTL the FAB is on the left edge — opposite of the primary thumb zone. Shared component affects every page.

---

### C2 — `col-actions` (ingredient row delete button) is `display: none` on mobile
**Screenshot:** `shots/06-ingredients-20rows.png`
**Element:** `.col-actions` inside `.ingredient-grid-row`
**Measured:** `display: none` on all 18 ingredient rows. The trash-2 delete button is in DOM but hidden.
**Grid template:** `82px 80px 64px 56px` — only 4 of 7 columns rendered. `col-drag`, `col-percent`, `col-actions` all collapse to 0px.
**Impact:** Users cannot delete individual ingredient rows on mobile. Functional regression.

---

### C3 — `approve-stamp` clips outside viewport (right: 367+56=423px > 375px)
**Screenshot:** `shots/05-ingredients-5rows.png`, `shots/10b-save-button-bottom-zone.png`
**Element:** `.approve-stamp` (fixed, `z-index: 210`, `right: 367px`, width `56px`)
**Measured:** Stamp overflows viewport by 48px on the right edge. At same z-index as FAB.
**Impact:** Stamp is partially invisible; overlaps ingredient rows and step rows in scroll buffer.

---

### C4 — `col-drag` (ingredient drag handle) renders at 0×0
**Screenshot:** `shots/06-ingredients-20rows.png`
**Element:** `.cdk-drag-handle.col-drag`
**Measured:** `w: 0, h: 0` — all 30 drag handles zero-size despite `display: flex`.
**Impact:** Row reordering completely inaccessible on mobile. No visual affordance, no tap target.

---

## Major Defects

### M1 — Recipe name field: long Hebrew text clipped with no ellipsis
**Screenshots:** `shots/02-name-p1.png`, `shots/03-name-p2.png`
**Element:** `input[placeholder="שם המתכון..."]` — `w: 255px`, `overflow: clip`, `text-overflow: clip`
**P1 (40 chars):** Only tail visible — "סט בעברית עם הרבה תווים". Beginning truncated with no indicator.
**P2 (80 chars):** Even more aggressively clipped — only "וים ועוד המון תווים נוספים" visible.
**Impact:** Recipe name unreadable/unverifiable when long. No `text-overflow: ellipsis` or scroll affordance.

---

### M2 — Label dropdown (P4) opens over ingredient table with no z-index separation
**Screenshot:** `shots/08-labels-p4.png`
**Element:** `.ng-dropdown-panel` (labels multi-select)
**Observed:** Dropdown options render over ingredient table rows with no backdrop or boundary.
Clicking the second תוויות reference dismissed dropdown A (no simultaneous open state, but architectural collision risk remains).
**Impact:** Open dropdown visually overlaps ingredient data; panel may extend off-screen bottom.

---

### M3 — Step text areas too narrow (106px) with tightly packed 28–32px action buttons
**Screenshot:** `shots/07-steps-10rows.png`
**Measured:** `textarea` w=106px, h=40px; `col-step-actions` w=100px containing 3 buttons (32px, 32px, 28px).
**Impact:** Step description textarea barely fits 4–5 Hebrew characters per line. Buttons meet minimum tap size but gaps are ≤4px.

---

### M4 — User profile card intrudes mid-page over step rows 5–6
**Screenshot:** `shots/07-steps-10rows.png`
**Observed:** "mobileaudit User" profile popover appears between step 5 and step 6, overlaying step content during scroll.
**Impact:** Obscures step content. Users cannot see step 6 text while card is visible.

---

### M5 — `col-percent` collapses to 0px — ingredient waste % invisible on mobile
**Screenshot:** `shots/06-ingredients-20rows.png`
**Element:** `.col-percent` — `display: block`, `width: auto`, `min-width: 0px`, measured w=0.
**Impact:** Ingredient waste percentage not shown on mobile. Cost-critical data absent.

---

## Minor Defects

### m1 — Save button accessible but deep (3292px scroll depth with all sections open)
**Screenshots:** `shots/10-save-button.png`, `shots/10b-save-button-bottom-zone.png`
**Finding:** Save button IS visible above the bottom nav when scrolled to bottom (not covered). However 3.3m page depth with no sticky CTA makes it hard to discover.

---

### m2 — Image upload area has no text label on mobile
**Screenshot:** `shots/04-image-upload.png`
**Observed:** Only a camera icon overlay. No "העלה תמונה" / "tap to upload" text at 375px.
**Impact:** Low discoverability for first-time users.

---

### m3 — Yield vessel search field renders at 30px wide
**Screenshot:** `shots/09-yield.png`
**Element:** `input[placeholder="חפש כלי..."]` — measured w=30px.
**Impact:** Effectively unusable — narrower than a single Hebrew character at typical font size.

---

## Cross-Cutting Measurements

| Issue | Selector | Measured | Expected |
|-------|----------|----------|----------|
| FAB RTL side | `.hero-fab-container` | `left: 8px` | `right: 8px` |
| Bottom nav | `.bottom-nav` | 56px fixed, z-index 200 | Scroll padding on content container |
| Header | `header` | `position: static` | N/A (no sticky header here) |
| approve-stamp | `.approve-stamp` | `right: 367px`, w=56px — clips at 375px | `right: 8px` or clamp |
| Save button coverage | button | top=3292px, above nav | Not covered (minor) |
| Step control buttons | `col-step-actions` | 28–32px each | Meets 44px minimum ONLY if padding added |

---

## Screenshots Index

| File | Step | Notes |
|------|------|-------|
| `01-baseline.png` | Baseline | Clean load, הכנה type pre-selected |
| `02-name-p1.png` | P1 name | 40-char Hebrew — tail visible, start clipped |
| `03-name-p2.png` | P2 name | 80-char Hebrew — more aggressively clipped |
| `04-image-upload.png` | Image upload | Camera icon only, no text label |
| `05-ingredients-5rows.png` | 5 ingredient rows | FAB wrong RTL side, stamp overlap |
| `06-ingredients-20rows.png` | 20 ingredient rows | col-actions hidden, col-percent 0px, col-drag 0px |
| `07-steps-10rows.png` | 10 workflow steps | Narrow textarea, profile card intrusion |
| `08-labels-p4.png` | Labels dropdown A open | Overlaps ingredient table |
| `08b-labels-both-open.png` | After clicking 2nd label ref | Dropdown A dismissed — no simultaneous collision captured |
| `09-yield.png` | Yield/logistics | Vessel search field 30px wide |
| `10-save-button.png` | Save button (full scroll) | Save accessible but 3.3m deep |
| `10b-save-button-bottom-zone.png` | Save + nav zone | Save visible above nav; FAB wrong side; stamp clips edge |
