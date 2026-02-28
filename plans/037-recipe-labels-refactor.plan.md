---
name: Recipe Labels Refactor
overview: Replace the derived "main category" column with explicit, colored labels -- both user-assigned and auto-computed from ingredient categories/allergens. Labels are a first-class entity (with color + optional auto-triggers) managed in the dashboard, selectable via a custom searchable dropdown in the recipe header, and displayed as colored chips in the recipe-book table.
---

# Recipe Labels Refactor

## Data model

- **LabelDefinition** (new): `key`, `color`, `autoTriggers?: string[]`
- **Recipe**: add `labels_?: string[]` (manual), `autoLabels_?: string[]` (computed on save)
- **LABEL_COLOR_PALETTE**: 12 preset hex colors

## Phases

1. **Registry** — MetadataRegistryService: `allLabels_`, `registerLabel`, `deleteLabel`, `getLabelColor`, storage `KITCHEN_LABELS`
2. **Label creation modal** — New component + service: name, english key, color swatches, auto-trigger source picker (categories + allergens)
3. **Dashboard metadata manager** — Add 'label' type, labels card, delete guard (check recipes), add via label modal
4. **Recipe builder** — Form: `labels` FormControl; `computeAutoLabels(recipe)` on save; `liveAutoLabels_` computed for header
5. **Recipe header** — Custom searchable dropdown, colored chips (manual removable, auto locked)
6. **Recipe book table** — Replace main_category column with labels (colored chips, read-only), filter, sort
7. **Translations** — labels, choose_label, create_new_label, no_label, label_name, label_color, auto_trigger_sources, save_label, add_new_label

## Files

- NEW: `src/app/core/models/label.model.ts`
- NEW: `src/app/shared/label-creation-modal/` (component, service, template, scss)
- `src/app/core/models/recipe.model.ts`
- `src/app/core/services/metadata-registry.service.ts`
- `src/app/pages/metadata-manager/*`
- `src/app/pages/recipe-builder/*` (page, recipe-header)
- `src/app/pages/recipe-book/components/recipe-book-list/*`
- App root: add `<app-label-creation-modal />`
- Translation dictionary
