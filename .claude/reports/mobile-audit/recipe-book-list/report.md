# Mobile Audit — recipe-book-list
**Route:** `/recipe-book`
**Viewport:** 375×812 RTL (dir=rtl, lang=he)
**Auditor:** Mobile Flow Auditor
**Date:** 2026-04-20
**Credentials:** Logged in as mobileaudit@foodvibe.test / Audit2026!

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major    | 4 |
| Minor    | 3 |

**Total defects: 7**

---

## Defects

### MAJOR-01 — Row action buttons: tap-target width 24px (below 44px minimum)
**Severity:** Major
**Screenshot:** `shots/06-row-actions.png`

All three row action buttons (הוסף למועדפים / בישול / מחיקה) measure **24×44px**. Width is 24px — below the 44px WCAG minimum tap target. The height is acceptable (44px) but the narrow width makes precise tapping on mobile unreliable, especially since the three buttons are packed side-by-side with a ~4px gap.

Measured dimensions:
- הוסף למועדפים (favorite): 24×44px at left:153, right:177
- בישול (cook): 24×44px at left:125, right:149
- מחיקה (delete): 24×44px at left:97, right:121

Total three-button strip: ~80px for 3 buttons. Minimum needed: 132px (3 × 44px).

---

### MAJOR-02 — Content scrolls under sticky header (no safe zone)
**Severity:** Major
**Screenshot:** `shots/tmp-scroll-under-header.png`

Header is `position:sticky`, height 62px, z-index 100. The list container starts at `top:62px` at rest. After scrolling 50px, the first recipe row top drops to 36px — **26px into the header area**. No `padding-top` or `margin-top` applied to page content wrapper (`.list-container`). Content disappears behind the opaque sticky header during normal scroll.

Measurements:
- Header height: 62px
- Content wrapper `padding-top`: 0px, `margin-top`: 0px
- After 50px scroll: firstRow.top = 36px < header.bottom = 62px — overlap confirmed

Matches known cross-page issue.

---

### MAJOR-03 — Filter panel close button on wrong side (RTL mismatch)
**Severity:** Major
**Screenshot:** `shots/02-filters-open.png`

The "Toggle filters" button is physically at right:363px (near physical right / RTL inline-start). The filter panel close button (×) is positioned at left:56–100px — the physical LEFT / inline-end side, the opposite corner from the trigger.

In RTL Hebrew, the close button should be near the inline-start edge (physical right) so the user's thumb does not need to travel ~263px to dismiss what they just opened.

Measurements:
- Toggle button: left:319, right:363 (near physical right)
- Close button: left:56, right:100 (near physical left)
- Cross-screen distance: ~263px

---

### MAJOR-04 — Search icon on wrong side of field in RTL
**Severity:** Major
**Screenshot:** `shots/03-search-focused.png`, `shots/04-search-filled.png`

The magnifying-glass icon inside the search field is positioned at the physical RIGHT side of the field (icon left:280, right:298; wrapper spans left:64 to right:311). In RTL Hebrew, inline-start = physical right. The icon sits at the inline-start edge — where typed text enters. Expected: icon at inline-end (physical left ~64–82px), with text flowing from the right (inline-start).

Measurements:
- Wrapper: left:64, right:311 (width:247)
- Icon: left:280, right:298 — 13px from wrapper right edge (inline-start side)
- Expected: icon at inline-end, near left:64–82

---

### MINOR-01 — FAB uses hardcoded `left:8px` instead of logical `inset-inline-end`
**Severity:** Minor
**Screenshot:** `shots/01-baseline.png`

FAB (`button.fab-main`) is at `left:8px` — a hardcoded physical CSS property. Visually correct for current RTL Hebrew layout (physical left = inline-end). Breaks if page serves an LTR locale. Should use `inset-inline-end: 8px`.

FAB: left:8, right:64, bottom:744, size 56×56px.

Matches known cross-page issue.

---

### MINOR-02 — Search field container height 39px (below 44px minimum)
**Severity:** Minor
**Screenshot:** `shots/03-search-focused.png`

The search input wrapper (`.c-input-wrapper`) is **39px tall** — 5px below the 44px minimum tap-target. Inner `<input>` is 21px tall. Users tapping at the edge of the search area will miss.

Measurements:
- `.c-input-wrapper`: 247×39px
- Inner `<input>`: 195×21px

---

### MINOR-03 — P4: Two filter dropdowns open simultaneously (no auto-collapse)
**Severity:** Minor
**Screenshot:** `shots/05-two-dropdowns.png`

Opening the second filter dropdown (סוג) does not collapse the first (תאריך). Both remain expanded simultaneously. No visual collision at 375px — they stack vertically. The combined height pushes remaining filters (תוויות, מאושר, תחנה, אל תכלול אלרגנים) below the viewport fold with no scroll indicator. UX/discoverability issue only, no layout breakage.

---

## P5 — Keyboard Coverage Probe
**Screenshot:** `shots/03-search-focused.png`

Search field is at top:128px (15% from viewport top). A standard mobile keyboard (~260px tall) would leave the field well above the keyboard fold. No keyboard coverage issue expected.

---

## P4 — Two Dropdowns Simultaneously
**Screenshot:** `shots/05-two-dropdowns.png`

תאריך and סוג dropdowns opened simultaneously without z-index collision or visual corruption. See MINOR-03 for the UX concern.

---

## Row Actions
- **Favorite:** Works. Toast "המתכון עודכן בהצלחה" appears at top-LEFT of viewport — in RTL it should be top-right or centered. (`shots/07-favorite.png`)
- **Cook / Delete:** Buttons present, 24×44px (see MAJOR-01).
- **Overflow:** No ⋮ menu. Row uses a carousel (Previous slide / Next slide, each 24×83px) to reveal additional data attributes. Carousel nav buttons share the same 24px width tap-target issue.

---

## Empty State
**Screenshot:** `shots/09-empty-state.png`

Renders correctly for no-results query. Centered message, FAB and bottom nav visible. No defects.

---

## Filter Panel
- No viewport overflow (panel width = 375px = viewport).
- `z-index: auto` — relies on DOM stacking order. No issues observed.
- Panel height 731px — fits within 812px viewport.
- Close button 44×44px — acceptable size, wrong RTL position (see MAJOR-03).

---

## Screenshots Index

| File | Step |
|------|------|
| `shots/01-baseline.png` | Baseline page load |
| `shots/02-filters-open.png` | Filter panel open (also annotated variant) |
| `shots/03-search-focused.png` | P5: Main search field focused |
| `shots/04-search-filled.png` | Search typed "עוף" — filtered results |
| `shots/05-two-dropdowns.png` | P4: Two filter dropdowns open simultaneously |
| `shots/06-row-actions.png` | Row action buttons baseline |
| `shots/07-favorite.png` | Favorite action triggered — toast visible |
| `shots/08-overflow-menu.png` | Row carousel next-slide (tag view) |
| `shots/09-empty-state.png` | Empty search results state |
