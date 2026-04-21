---
name: Design System Modernization — Rubik + Component Refresh
overview: Implement the foodCo Liquid Glass design modernization from the Claude.ai design export — font migration (Heebo → Rubik + Space Grotesk), body gradient update, engine class upgrades, and dashboard KPI/activity redesign.
isProject: false
todos:
  - id: font-tokens
    content: "src/styles.scss — replace Heebo @import with Rubik+Space Grotesk, add --font-sans/--font-mono/--shadow-soft/--bg-glass-dense/--border-glass-strong/--color-primary-light tokens, update :root font-family and body font-family"
    status: pending
  - id: body-gradient
    content: "src/styles.scss — update body::before radial gradient to stronger teal+amber wash matching modern prototype"
    status: pending
  - id: engine-classes
    content: "src/styles.scss — update .c-btn-primary to gradient, add .c-btn-dark, .c-btn-sm/.c-btn-lg size modifiers, update .c-chip styling, add .c-status pill class (variants: created/updated/deleted/pending/draft) and .c-eyebrow class"
    status: pending
  - id: kpi-cards
    content: "dashboard-overview.component.scss — add glow ::after pseudo-element to .kpi-card, use --shadow-soft, update .kpi-value to 2.375rem/fw800/letter-spacing, update .kpi-label to monospace uppercase treatment"
    status: pending
  - id: activity-rows
    content: "dashboard-overview.component.scss — update .activity-item, .entity-type-tag, .change-tag, .activity-type to use Space Grotesk monospace styling from design prototype"
    status: pending
  - id: build-verify
    content: "Run ng build — must pass 0 errors"
    status: pending
---

# Design System Modernization — Rubik + Component Refresh

## Source
Claude.ai design export — `foodco-design-system` bundle, session 2026-04-18.

## Decisions
- Font: Rubik (300–900) + Space Grotesk (400–700). Heebo removed. Rubik supports Hebrew + Latin natively.
- Sidebar: **deferred** — user said "not sure for now". No shell layout changes.
- Scope: `styles.scss` global tokens + engine classes + `dashboard-overview.component.scss` only.

## Constraints (cssLayer skill)
- `.c-*` engine classes → `src/styles.scss` only
- No hardcoded hex/rgba in component SCSS — use `var(--*)`
- Logical properties only (`padding-inline`, `padding-block`)
- Responsive breakpoints use `$break-*` SCSS vars

# Atomic Sub-tasks

- [ ] Task 1: `src/styles.scss` — replace Heebo @import with Rubik+Space Grotesk; add --font-sans, --font-mono, --shadow-soft, --bg-glass-dense, --border-glass-strong, --color-primary-light tokens; update :root font-family and body font-family
- [ ] Task 2: `src/styles.scss` — update body::before radial gradient to stronger teal+amber wash
- [ ] Task 3: `src/styles.scss` — update .c-btn-primary to gradient; add .c-btn-dark, .c-btn-sm, .c-btn-lg; update .c-chip; add .c-status (variants), .c-eyebrow
- [ ] Task 4: `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss` — KPI card glow, --shadow-soft, 2.375rem/800 value, monospace label
- [ ] Task 5: `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss` — activity-item, entity-type-tag, change-tag, activity-type Space Grotesk monospace update
- [ ] Task 6: `ng build` — verify 0 errors

## Backend Impact — None
