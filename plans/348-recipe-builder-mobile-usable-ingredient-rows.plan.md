# Plan 348 — Recipe builder on mobile: usable ingredient rows (portrait and landscape)

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

On a phone, the recipe builder's ingredient rows are so cramped they can't be used. In landscape, the per-ingredient info and edit buttons can't be seen. Component: `src/app/pages/recipe-builder/components/recipe-ingredients-table/`.

1. **Two conflicting mobile layouts.**
   - `@container ingredients (max-width: 520px)` (scss ~L418) turns each row into a 2-column card with the name on its own row.
   - A later `@media (max-width: 640px)` block (~L471) forces `grid-template-columns: 1fr 5rem 4rem 3.5rem 2.5rem` and `grid-row:1` on every column.
   - Same specificity, and the media block comes later, so it wins. On 360px the name/search column gets about 20–40px.
2. **Hover-only controls.** These are invisible on touch:
   - `.edit-badge` (`opacity:0`, revealed on `.selected-item-display:hover`, ~L405-414)
   - the row trash `.c-icon-btn` (`opacity:0`, ~L73-77)
   - the quantity buttons inside the container block (~L455-462)
3. **Landscape.** About 740–930px wide, so the ≤640/767 rules don't apply and the hover desktop styles take over. `isMobile_` (`(max-width: 767px)`, ts:77) is false, so quick-edit opens as the inline desktop accordion. `NutritionBadgeComponent.onBadgeClick()` (`shared/nutrition-badge/nutrition-badge.component.ts:229`) toggles the tooltip without the positioning in `onMouseEnter()` (L51-80), so on touch the `position:fixed` tooltip lands in the wrong place. Its 240px height estimate overflows a ~390px landscape viewport.
4. **Header grid.** `recipe-header.component.scss:467` uses `grid-template-columns: 50% 50%` plus a gap, which overflows and causes horizontal scroll on phone.

## Goals & Success Criteria

- Primary: at 360px portrait every ingredient row is a readable card: the full-width name/search, then amount, unit, cost and actions, all tappable.
- Primary: in phone landscape, the edit badge, nutrition info and delete are visible and tappable, and the info popup fits the screen.
- Success: no horizontal page scroll in the recipe builder at 360px.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching `src/app/pages/recipe-builder/components/**` or `src/app/shared/nutrition-badge/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss
src/app/shared/nutrition-badge/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef building a recipe on my phone, I want each ingredient row readable and every control tappable, in portrait and landscape.

## Functional Requirements

### Must Have (P0)
- [ ] Delete the `@media (max-width: 640px)` row-grid block. The container-query card layout is the single mobile layout. Widen its threshold if needed so landscape phones (container ≤ ~700px) also get cards.
- [ ] Touch visibility: wrap every hover-reveal (`.edit-badge`, row trash, quantity buttons) as `@media (hover: hover) { … opacity:0 / :hover reveal … }`. On `(hover: none)` they're always visible.
- [ ] `isMobile_` query becomes `(max-width: 767px), (hover: none) and (max-height: 500px)`, so landscape phones use the modal quick-edit.
- [ ] `NutritionBadgeComponent.onBadgeClick()` runs the same positioning as `onMouseEnter()` (extract a `positionTooltip_()` method). Clamp top and height to `window.innerHeight` (estimated height `min(240, innerHeight - 16)`) and to the inline viewport edges. Close on outside tap.
- [ ] `recipe-header.component.scss:467`: `50% 50%` → `1fr 1fr`.

### Should Have (P1)
- [ ] Name cell in card mode: `.selected-item-display` puts the name on line 1 with the badges (nutrition, edit, clear) on the same line, ellipsis on the name only.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Card layout (RTL): row 1 = name/search, full width. Row 2 = amount (stepper) · unit · cost · actions. Tap targets ≥44px.
- No dictionary changes.

## Atomic Sub-tasks

- [x] A1: Remove the conflicting media block; tune the container card layout for portrait and landscape (`recipe-ingredients-table.component.scss`).
- [x] A2: Gate hover-reveals behind `(hover: hover)` (`recipe-ingredients-table.component.scss`).
- [x] A3: Update the `isMobile_` query (`recipe-ingredients-table.component.ts`).
- [x] A4: Nutrition badge tap positioning, clamp and outside-tap close, with a spec (`shared/nutrition-badge/**`).
- [x] A5: Header grid `1fr 1fr` (`recipe-header.component.scss`).
- [ ] A6: Build and run specs. Check at 360×740 portrait, 740×360 landscape and desktop. Update the session-state file.

## Technical Considerations

- Dependencies: `RecipeIngredientsTableComponent`, `IngredientSearchComponent` (inside the name cell, read-only here), `NutritionBadgeComponent` (also used elsewhere, so check its other usages still position correctly on desktop hover), `BreakpointObserver`.
- New files: none.
- Model changes: none.

## Out of Scope

- Workflow / prep section mobile issues (`.col-prep-actions` hidden ≤768, the step delete opacity).
- The approve stamp and FAB overlapping the save button (covered by Plan 347 when typing; otherwise a separate follow-up).
- The menu-builder dish row.

## Critical Questions

1. Card threshold for the ingredients container:
   - a) ≤700px, so landscape phones get cards too (default)
   - b) ≤520px as today, with landscape keeping the row layout but with visible controls

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/pages/recipe-builder/**/*.spec.ts --include=src/app/shared/nutrition-badge/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone portrait: new recipe → add 3 ingredients → each row shows the full name, amount, unit and delete; all tappable. No sideways scroll.
- [human] Phone landscape: the edit badge and nutrition leaf are visible. Tapping the leaf opens nutrition info fully on screen; tapping outside closes it. Delete works.
- [human] Desktop: rows look as before, with hover reveal intact.
