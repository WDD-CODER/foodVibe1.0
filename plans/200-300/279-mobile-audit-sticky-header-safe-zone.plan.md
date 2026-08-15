# Plan 279 — Mobile audit fix: sticky-header-safe-zone

## Problem
The sticky top nav (`position: sticky; top: 0; height: 3.875rem = 62px; z-index: 100`) has no corresponding `padding-top` on page content wrappers. As users scroll, the page title (h1) and first content rows slide under and behind the opaque header bar. Confirmed in dashboard (h1 hidden at scroll ≥ 86px) and recipe-book-list (first recipe row overlaps header at scroll ≥ 50px).

## Scope
**Files to modify:**
- `src/app/pages/dashboard/dashboard.page.scss` — add `padding-block-start` to `.dashboard-content` at mobile breakpoint
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — add `padding-block-start` to the list container at mobile breakpoint

**Out of Scope:**
- No changes to `header.component.scss`
- No changes to other pages (cross-page reports for this cluster only listed these 2 as new defects)
- No scroll-behaviour JavaScript changes

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| dashboard | `app-dashboard-page` content area | `@media ≤620px { padding-block-start: 3.875rem; }` on `.dashboard-content` |
| recipe-book-list | `.list-container` (or page host content wrapper) | Same `padding-block-start: 3.875rem;` |

## Requirements
1. Dashboard h1 ("לוח בקרה") always visible, never behind sticky header, at any scroll position
2. Recipe-book-list first row always visible at scroll = 0
3. No extra blank space above content on desktop (rule scoped to ≤ 620px breakpoint)
4. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] Read `.claude/skills/cssLayer/SKILL.md` before editing any `.scss`
- [ ] `src/app/pages/dashboard/dashboard.page.scss` — append to `.dashboard-content`:
  ```scss
  @media (max-width: 620px) {
    padding-block-start: 3.875rem;
  }
  ```
- [ ] `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — identify the top-level scroll container (read the full file if needed; look for `.list-container`, `:host`, or `.page-content`); add same rule
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-book-list`
- [ ] Update TRIAGE.md — mark Cluster 5 (sticky-header-safe-zone) defects as ✓ resolved (plan 279)

## Validation (mobile)
- Viewport 375×812 RTL
- Dashboard: scroll 100px — h1 "לוח בקרה" remains fully visible below sticky nav
- Recipe-book-list: scroll 50px — first recipe row does not overlap header bar
- Desktop (1200px): no extra blank space above dashboard content

## Notes
- Header height is `3.875rem` (confirmed from `header.component.scss` line 9) — use this exact value, not `62px` or `4rem`
- Logical properties required: `padding-block-start` not `padding-top`
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` first
