---
name: UI Bundle 2 — Nav Pill Container, KPI Icon/Footer, Activity Avatar
overview: Implement the second design bundle — floating nav pill container, KPI icon badge and footer, activity row entity avatar, and new engine classes.
isProject: false
todos:
  - id: engine-classes
    content: "src/styles.scss — add .c-tab-pill, .c-table-card, .c-table engine classes"
    status: pending
  - id: header-html
    content: "header.component.html — replace ul nav with .nav-pills div + .nav-pill anchors; add .user-chip wrapper with role display"
    status: pending
  - id: header-scss
    content: "header.component.scss — height 3rem→3.875rem, .nav-pills glass container, .nav-pill active gradient, .user-chip pill, mobile hide nav-pills"
    status: pending
  - id: kpi-html
    content: "dashboard-overview.component.html — add .kpi-top/.kpi-icon per card, replace .kpi-actions with .kpi-foot, add sparkline SVGs on single-link cards"
    status: pending
  - id: activity-html
    content: "dashboard-overview.component.html — add .act-avatar + .act-middle wrapper per activity item"
    status: pending
  - id: kpi-activity-scss
    content: "dashboard-overview.component.scss — add .kpi-top/.kpi-icon/.kpi-foot styles; change .activity-item to grid; add .act-avatar/.act-middle/.act-sep"
    status: pending
  - id: build-verify
    content: "Run ng build — must pass 0 errors"
    status: pending
---

# UI Bundle 2 — Nav Pill Container, KPI Icon/Footer, Activity Avatar

## Goal
Implement remaining design bundle changes: floating centered nav pill container, KPI card icon badge + dashed footer, activity row entity avatar, and 3 new engine classes.

## Session
.claude/sessions/2026-04-18-ui-bundle-2

## Atomic Sub-tasks

- [ ] Task 1: `src/styles.scss` — add `.c-tab-pill` (glass pill, active = teal gradient), `.c-table-card` (radius-xl glass container), `.c-table` (mono th headers, hover rows)
- [ ] Task 2: `header.component.html` — replace `<ul>` nav with `<div class="nav-pills">` + `<a class="nav-pill">` items; wrap auth in `.user-chip`; add `.user-role` span
- [ ] Task 3: `header.component.scss` — height 3.875rem; `.nav-pills` glass container (position absolute, centered); `.nav-pill` active gradient; `.user-chip`; mobile hides nav-pills
- [ ] Task 4: `dashboard-overview.component.html` — restructure 4 KPI cards: `.kpi-top` + `.kpi-icon` + label; `.kpi-foot` replaces `.kpi-actions`; sparkline SVGs on 3 cards
- [ ] Task 5: `dashboard-overview.component.html` — activity items: add `.act-avatar` + `.act-middle` wrapper
- [ ] Task 6: `dashboard-overview.component.scss` — `.kpi-top`/`.kpi-icon`/`.kpi-foot` styles; grid activity item; `.act-avatar`/`.act-middle`/`.act-sep`
- [ ] Task 7: `ng build` — verify 0 errors

## Constraints (cssLayer)
- `.c-*` engine classes only in `styles.scss`
- No hardcoded colors in component SCSS — use `var(--*)`
- Logical properties only
- No `$break-*` SCSS vars in component SCSS files

## Backend Impact — None
