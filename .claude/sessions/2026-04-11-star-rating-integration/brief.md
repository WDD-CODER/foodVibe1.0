## Goal
Integrate the RatingStarsComponent across the app so users can set and view recipe ratings in cook-view, recipe-builder, recipe-book list, and any other appropriate surfaces.

## Scope
- `src/app/shared/rating-stars/` — component already created (read-only phase done)
- `src/app/pages/cook-view/` — show interactive rating on the active recipe
- `src/app/pages/recipe-builder/` — show/set rating within the recipe form
- `src/app/pages/recipe-book/` — add rating as a sortable column in the recipe list
- `public/assets/data/dictionary.json` — recipe data model; verify `rating` field exists or needs adding
- Server / storage — determine if rating persists to disk or stays in-memory

## Out of Scope
- Rating aggregation / averaging across users (single-user app)
- External rating sync

## Success Criteria
- [ ] Recipe data model has a `rating` field (number, 0–5)
- [ ] Cook-view displays interactive RatingStarsComponent; clicking a star persists the value
- [ ] Recipe-builder shows the rating inside the form and allows editing
- [ ] Recipe-book list has a "Rating" column that renders stars and is sortable
- [ ] At least one additional surface identified and wired up
- [ ] No `.c-*` classes defined in component SCSS
- [ ] `Star` icon confirmed registered in app.config.ts (already verified ✓)

## Session ID
2026-04-11-star-rating-integration
