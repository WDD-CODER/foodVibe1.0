## Goal
Fix all untranslated i18n keys, touch target violations (<44px), layout overlaps, and investigate auth session persistence — three parallel briefs from the mobile audit report.

## Scope
- `src/assets/i18n/he.json`
- `src/app/shared/empty-state/empty-state.component.html`
- `src/app/core/components/hero-fab/hero-fab.component.html`
- `src/app/shared/list-shell/list-shell.component.scss`
- `src/app/pages/suppliers/components/supplier-list/supplier-list.component.scss`
- `src/app/pages/venues/components/venue-list/venue-list.component.scss`
- `src/app/pages/equipment/equipment.page.scss`
- `src/app/pages/menu-intelligence/menu-intelligence.page.scss`
- `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`
- `src/app/core/components/hero-fab/hero-fab.component.scss`
- `src/app/core/guards/auth.guard.ts`
- `src/app/core/services/auth.service.ts`
- `src/environments/environment.ts`, `environment.prod.ts`

## Out of Scope
- Component TypeScript logic changes (Brief 1 is template-only)
- New features
- .c-* engine classes (go in styles.scss only)

## Success Criteria
- [ ] /dashboard?tab=trash shows "רענן", not "general.refresh"
- [ ] /recipe-book, /inventory, /suppliers empty states show Hebrew text
- [ ] Hero FAB aria-label is Hebrew
- [ ] Filter panel open/close buttons ≥44px
- [ ] Suppliers back button ≥44px
- [ ] Venues header buttons same height
- [ ] Equipment nav links ≥44px
- [ ] Financial bar fully visible above bottom nav on /menu-intelligence
- [ ] Dashboard activity has padding before bottom nav
- [ ] Auth session persistence behavior documented or fixed

## Session ID
2026-04-09-mobile-fixes
