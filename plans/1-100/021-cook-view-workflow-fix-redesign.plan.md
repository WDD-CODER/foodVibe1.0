# Plan 021 — Cook View: Workflow Fix + UX Redesign

## Goals
- Fix workflow editing in `cook-view` for both `dish` and `preparation` entities (add/edit/remove, even when workflow starts empty).
- Redesign the cook-view page to be more engaging and easier to use, with distinct mobile and desktop layouts.
- Keep behavior consistent with existing workflow editing in recipe builder.

## Confirmed Root Cause
- `cook-view` edit mode only supports ingredient editing; workflow sections remain read-only.
- The reusable workflow editor used in recipe-builder is never wired into cook-view.

## Implementation Strategy

### Part A – Workflow Editing Fix (Functional)
- Extend `cook-view` edit mode to support add / edit / remove for:
  - `preparation`: step instruction + labor time rows.
  - `dish`: prep item selection / category / qty / unit rows.
- Reuse workflow FormArray patterns from recipe-builder to avoid duplication.
- Empty-workflow edge case: always allow creating the first row in edit mode.
- Undo restores full original state (ingredients + workflow).

Target files:
- `src/app/pages/cook-view/cook-view.page.ts`
- `src/app/pages/cook-view/cook-view.page.html`
- `src/app/pages/cook-view/cook-view.page.scss`

### Part B – UX Redesign (Visual + Responsive Layout)
Patterns sourced from AnyList, Paprika, Samsung Food, RecipeKit:
- **Mobile**: Section tabs (Ingredients | Prep/Steps) with compact, readable rows; sticky header.
- **Desktop**: Two-column cockpit — ingredients on left, workflow on right; everything visible without scrolling on typical recipes.
- Checkable ingredient progress visuals.
- Active step highlighting.
- Cleaner visual hierarchy (stronger section anchors, comfortable spacing).

### Part C – Data Normalisation + Persistency Safety
- Normalise workflow payload before save to produce stable `steps_` / `prep_items_` regardless of initial structure.
- Preserve backward compatibility (`mise_categories_`).

## Testing
- Dish with zero prep rows → add, edit, save, reload.
- Dish with rows → edit qty/unit/category, remove, add, save, reload.
- Preparation with zero steps → add first step, labor time, save, reload.
- Preparation with steps → edit text/time, save, reload.
- Undo after mixed edits (ingredients + workflow) restores full original.

## Responsive Layout Blueprint
```
Mobile:  [StickyHeader] → [SectionTabs: Ingredients | Prep/Steps] → scroll within tab
Desktop: [StickyHeader spanning full width]
         [Left column: Ingredients] | [Right column: Workflow/Steps]
```
