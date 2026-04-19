# Plan 275 — Design Bundle 3: Hebrew Font, RTL Nav, Dashboard Tab Pills, KPI Polish

## Goal
Implement design bundle 1W-BfuBwaxPJVQYM0_7exQ. Fix Hebrew font rendering (Heebo > Rubik for Hebrew glyphs), RTL nav icon order, upgrade dashboard sub-nav to c-tab-pill, and fix kpi-label font + link-btn color inheritance.

## Source
Design bundle: `/tmp/design3/foodco-design-system/`
- README: confirms Heebo as Hebrew font, Rubik+Space Grotesk as Latin system
- `ui_kits/foodco-app/index.html`: nav pill centering, kpi structure, activity rows
- `preview/components-nav.html`: nav uses `font-family:Heebo`
- `preview/components-kpi-card.html`: kpi-label = Rubik (not monospace), link inherits color

## Session
`.claude/sessions/2026-04-18-hebrew-font-rtl/`

## Atomic Sub-tasks

- [ ] Task 1: `src/styles.scss` — add Heebo to Google Fonts URL; update --font-sans to 'Heebo', 'Rubik', system-ui
- [ ] Task 2: `header.component.html` — swap DOM order in all 4 nav pills (text before icon)
- [ ] Task 3: `header.component.scss` — remove letter-spacing: -0.005em from .nav-pill
- [ ] Task 4: `dashboard-overview.component.html` — replace .header-btn with .c-tab-pill on all 4 sub-nav buttons
- [ ] Task 5: `dashboard-overview.component.scss` — remove .header-btn block; fix .kpi-label font; fix .link-btn color; add .kpi-card::before shine
- [ ] Task 6: `ng build` — 0 errors

## Rules
- All font values via var(--*) or stacked font families — no raw font-family strings outside :root
- .c-tab-pill must stay in src/styles.scss only (engine class rule)
- No hardcoded pixel values — use rem
- RTL-safe: use logical properties (padding-inline, margin-inline-start)

## Done When
- [ ] ng build passes 0 errors
- [ ] Heebo in @import URL
- [ ] --font-sans starts with 'Heebo'
- [ ] Nav pill icons appear LEFT of label text on screen (in RTL)
- [ ] Dashboard sub-nav buttons use c-tab-pill class
- [ ] .kpi-label renders in Heebo/Rubik (not Space Grotesk)
- [ ] Warn KPI card footer links are amber (color: inherit from .kpi-foot)
