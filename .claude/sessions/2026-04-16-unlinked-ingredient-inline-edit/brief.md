## Goal
When AI-added recipe ingredients are unlinked (no product matched), clicking the unlinked icon should open inline edit mode — the same way other notification badge icons behave. Clicking the ingredient name should still open the dropdown search as normal.

## Scope
- `recipe-ingredients-table` component (HTML + TS)
- Potentially `recipe-builder.page` (AI draft approval flow)
- The unlinked/warning badge icon click handler

## Out of Scope
- Changing the inline edit panel itself (Quick-Edit Product Panel already exists)
- Changing the dropdown/search behavior on name click

## Success Criteria
- [ ] Clicking the "unlinked" icon on an AI-added ingredient row opens the inline edit panel
- [ ] Clicking the ingredient name still opens the dropdown search as before
- [ ] Behavior is consistent with how other notification badge icons (red/yellow) already open inline edit
- [ ] No regressions on manually-added ingredients

## Session ID
2026-04-16-unlinked-ingredient-inline-edit
