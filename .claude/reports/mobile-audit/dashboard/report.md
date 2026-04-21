# dashboard — Mobile Flow Audit
Run: 2026-04-20
Viewport: 375×812 RTL
Route: /dashboard
Severity counts: Critical 0 · Major 2 · Minor 2
Screenshots: 8

---

## Defects

### [MAJOR-01] FAB positioned on physical LEFT edge — wrong side for RTL layout

**Severity:** Major
**Component:** `app-hero-fab` / `.hero-fab-container`
**Screenshot:** `shots/01-baseline.png`, `shots/04-top-fab-nav.png`

The FAB button (recipe builder / "בונה מתכונים") is positioned using `left: 8px` via `.hero-fab-container`. In an RTL document (`<html dir="rtl">`) the physical left edge is the *end* side — the FAB should sit on the *start* side (physical right). This is a longstanding known issue (prior audit 2026-04-09 flagged it on other screens) now confirmed on the dashboard.

**Measurements:**
- FAB `left: 8px`, `right: 311px` — anchored to physical left
- Viewport width: 375px — FAB center at x≈36, should be at x≈339
- `html[dir]`: `rtl`, `body direction`: `rtl`

**Expected:** Use `inset-inline-end: 8px` (or `right: 8px` with RTL-aware logic) so FAB floats at the start-side (right edge) in RTL.

---

### [MAJOR-02] Page title (h1) scrolls under sticky header — no safe zone

**Severity:** Major
**Component:** `app-header` sticky nav + `app-dashboard-page` h1
**Screenshot:** `shots/06-scroll-100-header-check.png`, `shots/07-scroll100-actual-check.png`

The sticky top nav (`position: sticky; top: 0; height: 62px; z-index: 100`) sits inside `app-header`. The page h1 ("לוח בקרה") is at `top: 86px` at scroll=0, which is below the sticky nav in natural flow. As the user scrolls, the h1 moves into and behind the sticky nav bar starting at scroll≈24px, and is fully hidden by scroll≈86px. No `scroll-margin-top` or top padding on the content area accounts for the sticky nav height.

**Measurements at scroll=100:**
- Sticky nav: viewport top 0–62px (correct position)
- h1: `top: -14px`, `bottom: 21px` — partially behind sticky nav
- At scroll≥86: h1 completely hidden behind sticky header

**Expected:** Content area should have `padding-top: 62px` (or `scroll-padding-top: 62px` on the scroll container) to ensure the page title is never obscured by the sticky nav.

---

### [MINOR-01] FAB to bottom-nav gap is 12px — risk of visual crowding

**Severity:** Minor
**Component:** `app-hero-fab` / bottom nav
**Screenshot:** `shots/01-baseline.png`

The FAB (`position: fixed; bottom: 68px`) sits 12px above the bottom nav (`top: 756px`, height 56px). The gap is technically non-overlapping but creates visual crowding and would collapse to 0 at viewport heights below ~768px.

**Measurements:**
- FAB bottom: 744px, bottom nav top: 756px, gap: 12px
- Bottom nav z-index: 200, FAB container z-index: 210

**Expected:** Minimum 16px gap. FAB `bottom` should be `≥ nav-height + 16px = 72px`.

---

### [MINOR-02] Two stat card headings wrap to 2 lines — inconsistent card header alignment

**Severity:** Minor
**Component:** Dashboard stat cards (grid)
**Screenshot:** `shots/01-baseline.png`

Two of the four stat cards have multi-line h2 headings:
- "סה"כ מתכונים/מנות" — wraps to 2 lines
- "מתכונים/מנות לא מאושרים" — wraps to 2 lines

The other two cards have single-line headings. Card heights equalize (CSS grid stretch) but the large stat numbers appear at different vertical offsets within each card, disrupting visual rhythm.

**Measurements:**
- Card width: 157.5px
- Two-line heading height: ~24px; single-line: ~12px

**Expected:** Apply consistent 2-line clamp or fixed min-height to all stat card headings so the metric number always appears at the same vertical offset.

---

## Passing Checks

- Bottom nav: all 4 labels fully visible, not clipped. Icon + label vertical alignment consistent across all tabs.
- Stat card CTA buttons: no text clipping ("צפייה בספר מתכונים" at 109px fits within 157.5px card width).
- Recent activity section: fully scrollable into view at max scroll (heading at y=605, paragraph at y=658 at max scroll — both above bottom nav at y=756).
- Dashboard filter buttons ("הגדרות ליבה", "מיקומי אירוע", "אשפה", "ספקים"): no text clipping.
- Stat numbers (333, 23, 0, 23): large numerals render without overflow or truncation.
- Grid card heights: equal within each row (CSS grid stretch working correctly).
- No content permanently hidden behind fixed bottom nav.

---

## Screenshots

| File | Description |
|---|---|
| `shots/01-baseline.png` | Viewport at scroll=0, full dashboard view |
| `shots/02-scroll-mid.png` | After scrolling ~400px |
| `shots/03-scroll-bottom.png` | At document.body.scrollHeight bottom |
| `shots/04-top-fab-nav.png` | Baseline retake showing FAB + bottom nav proximity |
| `shots/05-max-scroll-recent-activity.png` | At maxScroll=216, recent activity section visible |
| `shots/06-scroll-100-header-check.png` | Scroll=100, h1 obscured behind sticky nav |
| `shots/07-scroll100-actual-check.png` | Second capture at scroll=100 confirming MAJOR-02 |
| `shots/08-baseline-clean.png` | Final clean baseline at scroll=0 |
