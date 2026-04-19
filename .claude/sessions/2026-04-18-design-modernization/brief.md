## Goal
Implement the foodCo Liquid Glass design system modernization from the Claude.ai design export into the Angular app — covering font migration (Heebo → Rubik + Space Grotesk), body gradient update, global engine class upgrades in styles.scss, and dashboard KPI card + activity row redesign.

## Scope
- `src/styles.scss` — font @import, :root tokens, body styles, engine class updates
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss` — KPI cards, activity rows

## Out of Scope
- Sidebar navigation shell (deferred — user said "not sure for now")
- Cook view redesign (already exists; no changes requested yet)
- Recipe book, Inventory, Menus, Venues, Suppliers, Trash, Settings screens
- Any server or backend files

## Success Criteria
- [ ] Google Fonts @import loads Rubik (300–900) + Space Grotesk (400–700)
- [ ] :root declares --font-sans, --font-mono, --shadow-soft, --bg-glass-dense, --border-glass-strong, --color-primary-light tokens
- [ ] body font-family uses Rubik throughout the app
- [ ] body::before gradient matches modern prototype (stronger teal+amber wash)
- [ ] .c-btn-primary uses gradient from --color-primary-light to --color-primary with inset highlight
- [ ] .c-btn-dark engine class added
- [ ] .c-status pill engine class added (variants: created/updated/deleted/pending/draft)
- [ ] .c-eyebrow engine class added
- [ ] .kpi-card shows glow ::after pseudo-element, --shadow-soft, overflow:hidden
- [ ] .kpi-value renders at 2.375rem / fw 800 / letter-spacing -0.045em
- [ ] .kpi-label uses Space Grotesk monospace uppercase treatment
- [ ] .activity-item and .change-tag use Space Grotesk monospace style
- [ ] ng build passes with no errors after changes

## Session ID
2026-04-18-design-modernization
