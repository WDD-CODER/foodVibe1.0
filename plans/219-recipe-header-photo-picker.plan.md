---
name: Recipe header photo-picker
overview: Make the recipe-header image square a tappable photo-picker that persists the selected image as imageUrl_ on the saved recipe.
todos:
  - recipe.model.ts — add imageUrl_?: string after hiddenBy?
  - recipe-builder.page.ts — add recipeImageUrl_ signal after isApproved_
  - recipe-builder.page.ts — patch patchFormFromRecipe to set recipeImageUrl_
  - recipe-builder.page.ts — replace buildRecipeFromForm body to spread imageUrl_
  - recipe-builder.page.ts — add recipeImageUrl_.set(null) as first line of resetToNewForm_
  - recipe-builder.page.ts — add onImageChange method to //UPDATE group
  - recipe-builder.page.html — add [imageUrl], (imageChange), [readonlyMode] to <app-recipe-header>
  - recipe-header.component.ts — add readonlyMode input, imageChange output, onImageSelected method
  - recipe-header.component.html — replace .image-square div with label+input+overlay structure
  - app.config.ts — import Camera and add to LucideAngularModule.pick
  - recipe-header.component.scss — add cursor + .img-upload-label rules
isProject: false
---

## Goal
Make the recipe-header image square a tappable photo-picker: clicking opens the native file picker, the selected image renders immediately, and persists as `imageUrl_` on the saved recipe.

## Atomic Sub-tasks
- [ ] recipe.model.ts — add `imageUrl_?: string` after `hiddenBy?`
- [ ] recipe-builder.page.ts — add `recipeImageUrl_` signal after `isApproved_`
- [ ] recipe-builder.page.ts — patch `patchFormFromRecipe` to set `recipeImageUrl_`
- [ ] recipe-builder.page.ts — replace `buildRecipeFromForm` body to spread `imageUrl_`
- [ ] recipe-builder.page.ts — add `recipeImageUrl_.set(null)` as first line of `resetToNewForm_`
- [ ] recipe-builder.page.ts — add `onImageChange` method to `//UPDATE` group
- [ ] recipe-builder.page.html — add `[imageUrl]`, `(imageChange)`, `[readonlyMode]` to `<app-recipe-header>`
- [ ] recipe-header.component.ts — add `readonlyMode` input, `imageChange` output, `onImageSelected` method
- [ ] recipe-header.component.html — replace `.image-square` div with label+input+overlay structure
- [ ] app.config.ts — import `Camera` and add to `LucideAngularModule.pick` (blocker — camera icon not registered)
- [ ] recipe-header.component.scss — add `cursor: pointer`, `&.is-readonly`, `.img-upload-label` rules

## Rules
- Do NOT put `.img-upload-label` rules in `src/styles.scss` — component-scoped only
- Do NOT add `imageUrl_` to `recipeForm_` — side-signal only; `RecipeFormService` must not be touched
- `onImageSelected` must be `readonlyMode()` gated
- No `@Input/@Output` decorators — `input()` and `output()` only
- No semicolons in TS, single quotes in TS, double quotes in HTML
- `ng build` must pass — mandatory gate

## Done when
- Clicking the image square opens the OS file picker
- Selecting a photo shows it immediately in the header
- Saving and reloading shows the same photo (persisted)
- History-view mode: image visible, clicking does nothing / no file picker
- New recipe form (after save-and-reset): placeholder shown, no image
