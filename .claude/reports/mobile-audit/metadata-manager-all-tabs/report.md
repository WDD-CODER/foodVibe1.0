# Mobile Audit — metadata-manager-all-tabs
**Date:** 2026-04-20  
**Viewport:** 375×812 RTL  
**Route:** /metadata-manager → redirects to /dashboard?tab=metadata  
**Auth:** Guest Admin (pre-authenticated)

## Layout Overview

The metadata-manager is NOT a tabbed interface. It is a single long scrollable page (6321px total height) containing stacked sections:
1. יחידות והמרות (Units & Conversions)
2. קטגוריות מוצרים (Product Categories)
3. מאגר אלרגנים גלובלי (Global Allergens)
4. תוויות מתכונים (Recipe Labels)
5. סוגי תפריט (Menu Types)
6. קטגוריות הכנה (Preparation Categories)
7. קטגוריות מקטעי תפריט (Menu Section Categories)
8. Demo Data / Backup sections

## Known Cross-Page Issues (confirmed present)

- FAB left:8px wrong RTL — confirmed: left:8px, right:311px
- Bottom nav covers 62px; main has padding-bottom:56px — 6px short (confirmed)

## New Defects

### MAJOR

**M1 — /metadata-manager silently redirects to /dashboard?tab=metadata with no tab UI**
Deep link lands on full dashboard page. No tab strip shown — user sees complete dashboard context with a sub-nav header containing 4 buttons that overflow to 2 rows at 375px.

**M2 — Sub-nav buttons wrap to 2 rows at 375px, no overflow scroll**
"חזרה ללוח הבקרה" (143px) + "מיקומי אירוע" (118px) + "ספקים" (85px) + "אשפה" (83px) — total ~430px, wraps at 375px viewport. No horizontal scroll provided. Ragged 2-row layout breaks navigation hierarchy.

### MINOR

**N1 — Add-row container leaves ~60px dead space on right edge**
Input parent: left=60px, right=314px. Input is only 178px wide at 375px viewport. Container does not span full available width.

**N2 — padding-bottom 56px is 6px short of 62px bottom nav**
Bottom content (backup/restore section) is partially obscured by the bottom nav bar.

**N3 — No jump navigation for 6321px page**
7+ metadata sections stacked vertically with no sticky sub-nav, anchor links, or scroll-spy. Users cannot jump to a specific section on mobile.

**N4 — Each section heading rendered twice in DOM**
e.g. "יחידות והמרות" appears twice in headings query. Likely template duplication — screen readers double-announce each section.

## Add Item Flow

Input accepts text ("TestUnit"), הוסף button visible and correctly placed at RTL-start. No keyboard coverage issue — input is in upper viewport half.

## Screenshots

| File | Content |
|------|---------|
| shots/01-baseline.png | Baseline load |
| shots/02-categories.png | Page top — units + categories |
| shots/03-allergens.png | 25% scroll — allergens area |
| shots/04-units.png | 50% scroll — menu types area |
| shots/05-preparations.png | 75% scroll — preparation categories |
| shots/06-add-item.png | Units input filled "TestUnit" |

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Major | 2 |
| Minor | 4 |
| Screenshots | 6 |
