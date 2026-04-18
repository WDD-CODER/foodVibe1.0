## Goal
Fix the 4 actionable mobile layout issues found in the recipe builder QA report (horizontal overflow, FAB touch targets, fixed-element overlap, ingredient dropdown z-index).

## Scope
- `src/app/pages/recipe-builder/recipe-builder.page.scss` — logistics grid overflow, FAB sizing, fixed-element spacing
- `src/app/pages/recipe-builder/recipe-builder.page.html` — potential structural changes if CSS-only fix is insufficient
- `src/app/shared/` — ingredient autocomplete dropdown z-index (if component-scoped)

## Out of Scope
- ISSUE-005 (low severity — ingredient name truncation at 320px, cosmetic)
- Console errors (401/404 are expected resolver behavior)
- Desktop layout changes
- Functional changes to FAB actions or ingredient editing logic

## Success Criteria
- [ ] No horizontal overflow at 375px or 320px viewports (scrollWidth === clientWidth)
- [ ] FAB action buttons meet 44x44px minimum touch target on mobile
- [ ] Fixed elements (FAB, NOT APPROVED stamp) don't overlap content sections at 320px
- [ ] Ingredient autocomplete dropdown visible above bottom nav bar

## Session ID
2026-04-17-recipe-builder-mobile-fixes
