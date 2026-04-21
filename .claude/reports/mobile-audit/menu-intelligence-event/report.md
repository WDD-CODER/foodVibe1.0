# Mobile Audit — menu-intelligence-event
**Route:** `/menu-intelligence`
**Viewport:** 375x812 RTL
**Date:** 2026-04-20
**Auditor:** Mobile Flow Auditor (automated)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Major    | 2 |
| Minor    | 2 |

---

## Critical

### C1 — Financial bar hidden behind bottom nav (2026-04-09 critical: STILL PRESENT)
DOM evidence: `.financial-bar` at top:747, bottom:812, height:65, z-index:100. Bottom nav at top:756, bottom:812, height:56, z-index:200. Bottom nav fully covers the cost summary (עלות כוללת, עלות מזון %, עלות לאורח). Completely invisible to the user.
Screenshot: shots/05-financial-bar.png
Status: UNRESOLVED

### C2 — Bottom nav bisects scrollable content mid-section
The fixed bottom nav (height 56px) overlays section headers and dish rows during scroll. No bottom padding on scroll container accounts for nav height.
Screenshot: shots/06-gemini.png

---

## Major

### M1 — FAB at left:8px in RTL layout (known cross-page issue confirmed)
FAB computed cssLeft:8px, cssRight:311px. In RTL the FAB should be right:8px. Sits in bottom-left — wrong side for RTL reading flow.
Screenshot: shots/01-baseline.png

### M2 — Toolbar / Gemini generation panel not accessible on mobile
Buttons "פתח סרגל כלים", "בונה מתכונים", "פעולות מהירות" present in ARIA tree but clicking produces no visible panel. Gemini AI menu generation is unreachable at 375x812.
Screenshot: shots/06-gemini.png

---

## Minor

### m1 — Guest Admin chip overlaps scrolling content
Fixed/sticky "Guest Admin" chip overlaps content rows during scroll.
Screenshot: shots/03-sections.png

### m2 — Section category buttons indistinguishable
All three "לחץ לבחור קטגוריה" buttons render identically with no section index, making them indistinguishable for AT/screen reader users.

---

## Known Cross-Page Issues (confirmed present)

| Issue | Status |
|-------|--------|
| FAB left:8px wrong RTL | Confirmed |
| Bottom nav covers 56px | Confirmed |
| Dropdowns don't dismiss on Escape | Not tested (no dropdowns opened) |
| Content behind sticky header | Confirmed |
| Financial bar hidden behind bottom nav | Confirmed STILL CRITICAL |

---

## Screenshots

| # | File | Description |
|---|------|-------------|
| 01 | shots/01-baseline.png | Page on load |
| 02 | shots/02-new-event.png | Event name filled |
| 03 | shots/03-sections.png | 2 sections added |
| 04 | shots/04-dishes.png | 1 dish per section |
| 05 | shots/05-financial-bar.png | Bottom zone — financial bar hidden |
| 06 | shots/06-gemini.png | Toolbar/Gemini attempt — no panel |
