## Goal
Implement design bundle 1W-BfuBwaxPJVQYM0_7exQ — fix Hebrew font, RTL nav icon order, dashboard sub-nav pill upgrade, and KPI label font correctness.

## Context
Bundle at /tmp/design3/foodco-design-system/. Key sources: ui_kits/foodco-app/index.html, preview/components-nav.html, preview/components-kpi-card.html, project/README.md, type-heebo.html.

## Scope
- `src/styles.scss` — add Heebo font import, update --font-sans token
- `src/app/core/components/header/header.component.html` — swap nav-pill DOM order (icon after text for RTL)
- `src/app/core/components/header/header.component.scss` — remove letter-spacing from .nav-pill
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html` — replace .header-btn with .c-tab-pill
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss` — remove .header-btn block, fix .kpi-label font, fix .link-btn color, add kpi-card::before shine

## Out of Scope
- Any pages other than dashboard and header
- Backend, tests, routes
- KPI delta rows (no real trend data service)

## Success Criteria
- [ ] Google Fonts URL imports Heebo (wght 300–900) alongside Rubik and Space Grotesk
- [ ] --font-sans: 'Heebo', 'Rubik', system-ui, sans-serif
- [ ] Nav-pill DOM order: text label first, lucide-icon second (icon LEFT of text in RTL)
- [ ] .nav-pill has no letter-spacing (removed -0.005em)
- [ ] Dashboard sub-nav buttons use c-tab-pill class (not header-btn)
- [ ] .header-btn block removed from dashboard-overview.component.scss
- [ ] .kpi-label uses var(--font-sans) not var(--font-mono)
- [ ] .link-btn color: inherit (inherits from .kpi-foot context)
- [ ] .kpi-card::before shine gradient added
- [ ] ng build passes 0 errors

## Session ID
2026-04-18-hebrew-font-rtl
