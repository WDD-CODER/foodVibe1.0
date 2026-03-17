---
name: Cook-view scale-by UX fixes
overview: Fix seven UX/styling issues in the cook-view scale-by-ingredient feature: button visibility on hover only, button position left of name, confirmation modal, full-row hover border, yellow box-shadow for setting state, distinct "according to" state visuals, and spacing between containers.
todos: []
isProject: true
---

# Cook-view scale-by-ingredient: UX and layout fixes

## Scope

- **a)** "Set recipe by this item" button visible **only on hover**
- **b)** Button **to the left of the ingredient name** (inside name column)
- **c)** Keep confirmation via ConfirmModalService (no change)
- **d)** Row hover: **whole row** border/box-shadow
- **e)** Setting state: **yellow box-shadow**
- **f)** "According to" state: visual like edit mode, **different colors**
- **g)** **Space between containers** in cook-view

## Files

- [cook-view.page.html](src/app/pages/cook-view/cook-view.page.html): Move button into col-name (left of name); empty col-scale-action for normal rows.
- [cook-view.page.scss](src/app/pages/cook-view/cook-view.page.scss): (a) Button visible only on row hover. (d) Full-row border/box-shadow on hover. (e) Yellow box-shadow for `.setting-by`. (f) Scaled-view shell + banner (edit-mode-like, different colors). (g) Spacing between header, main, sections.
