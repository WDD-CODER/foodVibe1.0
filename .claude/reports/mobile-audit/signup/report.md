# Mobile Audit — Signup Flow

**Run date:** 2026-04-20  
**Viewport:** 375×812 (RTL)  
**Flow:** signup / auth-modal  
**Probes applied:** P5 (keyboard-open state on each input field)  
**Credentials tested:** `mobileaudit@foodvibe.test` / `Audit2026!`  
**Signup result:** SUCCESS (account created, auto-logged in)

---

## Severity Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major    | 3 |
| Minor    | 2 |
| **Total**| **5** |

---

## Defects

### [major] auth-modal overlay — Modal does not cover full viewport; background content visible and interactive

- Screenshot: ./shots/01-baseline.png, ./shots/02-email-focused.png
- Selector: auth-modal backdrop (no ARIA ref — not in accessibility tree; identified via visual screenshot inspection)
- Description: At 375×812, the auth modal renders as a tall card anchored near the top of the viewport. The dashboard content ("פעילות אחרונה") is visible below the modal's bottom edge. The backdrop does not extend to full viewport height and there is no scroll trap. Background content appears reachable while the modal is open.
- Steps to reproduce:
  1. Load http://localhost:4200 in logged-out state at 375×812.
  2. Tap "התחברות" in the nav to open the auth modal.
  3. Switch to the הרשמה (signup) tab.
  4. Observe: dashboard "פעילות אחרונה" text is visible beneath the modal bottom edge.
  5. Attempt to tap the area below the modal — background content is not fully blocked.

---

### [major] password input (RTL) — Show-password toggle placed at wrong edge in RTL layout

- Screenshot: ./shots/01-baseline.png, ./shots/03-password-focused.png, ./shots/04-confirm-focused.png
- Selector: `@e23 [button] "הצג סיסמה"` / `@e25 [button] "הצג סיסמה"` (from `$B snapshot -i`)
- Description: In RTL layout at 375px, the password-visibility eye icon is positioned at the physical left edge of each password input. In RTL context the left edge is the trailing (end) side — text flows from the right. The toggle should sit at the inline-end right side to stay adjacent to where the cursor and text are. As rendered, the icon is stranded on the opposite side from the text, appearing disconnected.
- Steps to reproduce:
  1. Open auth modal, switch to הרשמה (signup) tab.
  2. Observe the סיסמה and אשר סיסמה fields.
  3. The eye icon appears at the left edge of each field while password text renders from the right — icon is on the wrong RTL edge.

---

### [major] dashboard post-signup — FAB overlaps bottom navigation bar

- Screenshot: ./shots/06-post-submit.png
- Selector: `@e36 [button] "בונה מתכונים"` (FAB) overlapping bottom nav (from post-submit snapshot)
- Description: After successful signup, the floating action button ("בונה מתכונים" / recipe builder) sits at the bottom-left of the screen directly on top of the bottom navigation bar. The FAB's circular body covers the "תפריטי אירוע" tab, creating a tap-target collision. Both elements occupy the same screen region.
- Steps to reproduce:
  1. Complete signup to arrive at the dashboard.
  2. Observe the bottom of the screen at 375×812.
  3. The teal circular FAB is positioned on top of the bottom nav bar, obscuring the leftmost tab label.

---

### [minor] auth-modal container — Left edge of modal card clips at viewport boundary

- Screenshot: ./shots/01-baseline.png
- Selector: Modal card container (outermost dialog/modal element — no ARIA ref in accessibility tree)
- Description: The modal card's left border and rounded corner is clipped at approximately x=7px from the left viewport edge. The modal has visible right-side margin but the left edge is flush against the screen, cutting off the card's box-shadow and border-radius. In RTL, the left (trailing) edge should have equal margin to the right (leading) edge.
- Steps to reproduce:
  1. Open auth modal at 375×812 in RTL.
  2. Observe left edge of the modal card — the rounded corner and box-shadow are cropped by the viewport boundary.

---

### [minor] dashboard cards — Label word-wrap causes vertical misalignment within card grid rows

- Screenshot: ./shots/06-post-submit.png
- Selector: `@e22 [article]` (סה"כ מתכונים/מנות) vs `@e18 [article]` (סה"כ מוצרים) — from post-submit snapshot
- Description: The "סה"כ מתכונים/מנות" card label wraps to two lines while "סה"כ מוצרים" fits on one. This causes the two cards in the same row to have different label-region heights, pushing the metric numbers and action buttons to different vertical positions within the row — the grid loses alignment.
- Steps to reproduce:
  1. Complete signup and view the dashboard.
  2. Compare the top-right card ("סה"כ מוצרים — 249") and bottom-left card ("סה"כ מתכונים/מנות — 23").
  3. The metric numbers sit at different vertical offsets due to uneven label wrapping.

---

## P5 Probe Results (Keyboard-Open State)

| Input field | Screenshot | Finding |
|-------------|-----------|---------|
| Email (אימייל) | ./shots/02-email-focused.png | No layout shift observed. Modal stable on focus. |
| Password (סיסמה) | ./shots/03-password-focused.png | No layout shift. Eye icon misalignment defect visible (Major #2). |
| Confirm Password (אשר סיסמה) | ./shots/04-confirm-focused.png | No layout shift. Same eye icon misalignment. |

> Note: Headless mode does not invoke the OS software keyboard. P5 results reflect focused-field visual state only. A headed/real-device test is required to verify keyboard push-up behavior.

---

## Screenshots Index

| # | File | State |
|---|------|-------|
| 01 | ./shots/01-baseline.png | Signup form open, empty |
| 02 | ./shots/02-email-focused.png | Email field focused (P5) |
| 03 | ./shots/03-password-focused.png | Password field focused (P5), email filled |
| 04 | ./shots/04-confirm-focused.png | Confirm-password focused (P5), password filled |
| 05 | ./shots/05-form-filled.png | All fields filled, pre-submit |
| 06 | ./shots/06-post-submit.png | Post-submit — signup success, dashboard |
