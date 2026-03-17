---
name: Use only prep_categories discard mise_categories
overview: Use prep_categories_ as the single source of truth for dish prep-by-category, remove mise_categories_ from the model and all code, and migrate demo data and read paths so nothing references mise_categories_.
todos: []
isProject: false
---

# Consolidate on prep_categories_; Remove mise_categories_

- **Single field:** prep_categories_ (and prep_items_ for flat list). **Remove:** mise_categories_ and MiseCategory type.
- **Model:** recipe.model.ts — remove MiseCategory interface and mise_categories_ from Recipe.
- **Read paths:** getPrepRowsFromRecipe (recipe-builder, cook-view) use prep_categories_ after prep_items_; getScaledPrepItems (scaling.service) use prep_categories_; all isDish checks use prep_categories_ (and prep_items_) only.
- **Write paths:** recipe-builder and cook-view — stop setting mise_categories_.
- **Demo data:** demo-dishes.json — rename "mise_categories_" to "prep_categories_".
- **Tests:** scaling.service.spec — mock uses prep_categories_.
- **Optional:** DishDataService normalizer on load — if mise_categories_ present and prep_categories_ missing, copy over for backward compat.

Files: recipe.model.ts, recipe-builder.page.ts, cook-view.page.ts, scaling.service.ts, menu-intelligence.page.ts, recipe-book-list.component.ts, kitchen-state.service.ts, export.service.ts, demo-dishes.json, scaling.service.spec.ts.
