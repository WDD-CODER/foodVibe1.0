---
name: Recipe approve stamp button
overview: Add a wax-seal-style "Approve" button fixed at the bottom-right (opposite the hero FAB), visible only in recipe-builder and cook-view. Recipes stay unapproved until the user explicitly presses it; the button persists approval via existing is_approved_ and KitchenStateService.saveRecipe. Stamp uses app theme colors (teal primary), not red.
todos: []
isProject: true
---

# Recipe approve stamp button

## Context

- **Model**: [Recipe](src/app/core/models/recipe.model.ts) already has `is_approved_: boolean`.
- **Persistence**: [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts) toggles approval via `onToggleApproval` → `kitchenState.saveRecipe(updated)`.
- **Recipe builder**: [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts) currently hardcodes `is_approved_: true` in `buildRecipeFromForm()` (line 1160). New recipes should default to **unapproved**; approval only when user clicks the stamp.
- **Hero FAB**: [hero-fab.component.scss](src/app/core/components/hero-fab/hero-fab.component.scss) is fixed at `left: 0.75rem; bottom: 0.75rem; z-index: 90`. The stamp will mirror this at **right: 0.75rem; bottom: 0.75rem** (same bottom, opposite side).
- **Styling**: Follow [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md) and reuse tokens from [src/styles.scss](src/styles.scss). The stamp uses **app theme colors** (e.g. `--color-primary`, `--color-primary-hover`, `--color-text-on-primary`) so it fits the Liquid Glass design—not red.

## 1. Data and approval state

**Recipe builder**

- Add a signal: `isApproved_ = signal(false)`.
- When loading a recipe (in the same branch where `patchFormFromRecipe(recipe)` is called): after patching, set `this.isApproved_.set(recipe.is_approved_)`.
- In `resetToNewForm_()`: set `this.isApproved_.set(false)`.
- In `buildRecipeFromForm()`: replace the hardcoded `is_approved_: true` with `is_approved_: this.isApproved_()`.
- Extend `saveRecipe()` with an optional parameter (e.g. `options?: { navigateOnSuccess?: boolean }`). When `navigateOnSuccess === false`, on success only set `isSaving_.set(false)` and do **not** call `resetToNewForm_()` or `router_.navigate()`.

**Cook view**

- No new state. On approve: build `updated = { ...recipe, is_approved_: true }`, call `kitchenState.saveRecipe(updated).subscribe({ next: (saved) => { this.recipe_.set(saved); ... } })`. Rely on `saveRecipe` returning the saved recipe in `next` (already the case in [kitchen-state.service.ts](src/app/core/services/kitchen-state.service.ts)).

## 2. Approve stamp UI (wax seal look)

**Shared component**

- Create a small presentational component, e.g. **ApproveStampComponent**, in `src/app/shared/approve-stamp/`:
  - **Inputs**: `approved: boolean` (if true, show "stamped" state, non-clickable or disabled), optional `disabled?: boolean` (e.g. while saving).
  - **Output**: `approve: EventEmitter<void>` (emit on click when not approved and not disabled).
  - **Template**: One button that looks like a wax seal in style only (from references): circular/irregular shape, glossy (box-shadow + gradient), text "APPROVED", optional star/icon. **Color**: use app theme (e.g. `var(--color-primary)` for the seal, `var(--color-text-on-primary)` for text)—no red.
  - **Styles**: Fixed position: `right: 0.75rem; bottom: 0.75rem`; `z-index: 90` (same as hero FAB). Size ~3–3.5rem. Use CSS only: `border-radius` for slightly irregular circle, `background` (gradient using theme colors) and `box-shadow` for wax-like depth/gloss. Follow cssLayer; use existing theme tokens.

**Where it appears**

- **Recipe builder** ([recipe-builder.page.html](src/app/pages/recipe-builder/recipe-builder.page.html)): Place the stamp inside `.recipe-builder-container`, e.g. after `.builder-shell`. Show only when `!historyViewMode_()`. Bind `[approved]="isApproved_()"`, `(approve)="onApproveStamp()"`. Optionally disable when `isSaving_()`.
- **Cook view** ([cook-view.page.html](src/app/pages/cook-view/cook-view.page.html)): Place inside `.cook-view-container` when `recipe_()` is set. Bind `[approved]="recipe_()?.is_approved_ ?? false"`, `(approve)="onApproveStamp()"`. Optionally disable when `isSaving_()`.

**Behavior**

- **Recipe builder**
  - **Add mode** (no `recipeId_()`): On stamp click, set `isApproved_.set(true)` only (no save). When the user later clicks the main "Save", the recipe is saved with `is_approved_: true`.
  - **Edit mode** (has `recipeId_()`): On stamp click, set `isApproved_.set(true)` and call `saveRecipe({ navigateOnSuccess: false })` so approval is persisted immediately and the user stays on the page.
- **Cook view**: On stamp click, call `kitchenState.saveRecipe({ ...recipe, is_approved_: true })` and in `next(saved)` set `recipe_.set(saved)`.

## 3. Translation and a11y

- Add a key for the action, e.g. `approve_recipe` or `mark_as_approved`, and use it for the stamp's `aria-label` and optionally `title`. Register in the project's translation assets.

## 4. Visual reference

- **Take from the references**: wax-seal **style**—glossy, irregular circular shape; "APPROVED" text; optional stars; slight 3D/shadow. When `approved === true`, show a "stamped" state (e.g. slightly muted) and not clickable.
- **Do not take from the references**: red color. Use **app theme colors** (teal primary) so the stamp fits the Liquid Glass styling and matches the hero FAB.

## 5. Files to touch

| Area                    | File | Change |
| ----------------------- | --- | --- |
| Recipe builder state    | recipe-builder.page.ts | Add isApproved_ signal; set in init and resetToNewForm_; use in buildRecipeFromForm(); add saveRecipe(options?) and onApproveStamp(). |
| Recipe builder template | recipe-builder.page.html | Add stamp component when !historyViewMode_(). |
| Cook view               | cook-view.page.ts | Add onApproveStamp() that saves with is_approved_: true and updates recipe_(). |
| Cook view template      | cook-view.page.html | Add stamp component when recipe_() is set. |
| New component           | src/app/shared/approve-stamp/* | Wax-seal button; inputs approved, disabled; output approve; fixed bottom-right; theme colors. |
| Translations            | Project translation files | Add approve_recipe (or mark_as_approved) key. |

No changes to recipe-book list or dashboard; they already filter and show approval state.
