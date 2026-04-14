# Session Brief — 2026-04-14

## Session ID
2026-04-14-neto-confirm-modal-fix

## Goal
Fix two related bugs in the recipe-builder neto (net yield) confirmation flow: (1) neto confirmation modal not showing when the recipe loads with a previously-saved `neto_confirmed_: true`, and (2) the sync-badge reset button being hidden under the same condition.

## Branch
main

## Success Criteria
1. `yieldManuallyChanged` output added to `recipe-header.component.ts` with wrapper methods that forward to `RecipeYieldManager` and emit the event
2. `recipe-builder.page.html` resets `netoConfirmed_` to `false` on `(yieldManuallyChanged)`
3. `recipe-header.component.html` sync-badge condition uses only `yield.yieldDiffersFromComputed_()` — `!netoConfirmed()` guard removed
4. TypeScript compiles clean (no errors)
5. All changes committed

## Files Changed
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts`
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html`
- `src/app/pages/recipe-builder/recipe-builder.page.html`
