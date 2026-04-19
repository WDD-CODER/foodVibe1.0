## Goal
Implement the second design bundle (nav redesign, KPI icon/delta/footer, activity row grid, engine classes) into the Angular app, building on Plan 273.

## Scope
- `src/app/core/components/header/header.component.html` + `.scss` — nav pill container, 62px height, user chip
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html` + `.scss` — KPI top row, delta, footer; activity row grid + avatar
- `src/styles.scss` — `.c-tab-pill`, `.c-table`, `.c-table-card` engine classes

## Out of Scope
- Search bar in nav (user confirmed: discard)
- Sidebar navigation (deferred)
- Cook view, Inventory, Recipe book, Menus, Venues, Suppliers, Trash, Settings
- Any backend/server files

## Success Criteria
- [ ] Header nav pills float as a centered glass pill container; active item = gradient teal bg + glow shadow
- [ ] Nav height: 62px (up from current 3rem/48px)
- [ ] User chip shows avatar + name + role in a pill (replaces text-only button)
- [ ] KPI card top row: icon badge (`.kpi-icon`) + label side by side
- [ ] KPI delta pill (`.kpi-delta` up/down/hold) added to each card
- [ ] KPI footer row (`.kpi-foot`): dashed border, link action + sparkline SVG
- [ ] Activity row has entity avatar icon (`.act-avatar`)
- [ ] Activity row uses 4-col grid: avatar / middle / changes / status
- [ ] `.c-tab-pill` engine class in `styles.scss`
- [ ] `.c-table` + `.c-table-card` engine classes in `styles.scss`
- [ ] `ng build` passes 0 errors

## Session ID
2026-04-18-ui-bundle-2
