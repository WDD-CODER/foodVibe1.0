---
name: Unified Context-Aware AI Modal
overview: Merge the text-import flow into the global AI modal — inside the builder it patches the current recipe via a natural-language instruction; everywhere else it creates a new recipe.
todos: []
isProject: false
---

# Unified Context-Aware AI Modal

## Goal
Replace the separate `import-text-btn` / `RecipeTextImportModal` flow with a single smart AI modal that is context-aware:
- **Inside recipe builder** → "edit" mode: user's spoken/typed instruction + current recipe state → Gemini returns a sparse patch → preview → apply
- **Outside recipe builder** → "create" mode: unchanged existing generate flow

## Atomic Sub-tasks

- [ ] server/routes/ai.js — add POST /api/v1/ai/patch-recipe endpoint with smart partial-patch system prompt
- [ ] gemini.service.ts — add `patchRecipe(currentRecipe, instruction)` method calling new endpoint
- [ ] ai-recipe-modal.service.ts — extend to support `open('create')` and `open('edit', currentRecipe, onPatch)`
- [ ] ai-recipe-modal.component.ts + .html — add edit-mode UI (instruction textarea + patch preview card)
- [ ] recipe-builder.page.ts — replace `onImportTextClick` + `RecipeTextImportModalService` with `onAiEditClick` wired to AiRecipeModalService edit mode
- [ ] recipe-header.component.ts + .html — remove `importTextClick` output + `import-text-btn`
- [ ] app.component.ts + .html — remove RecipeTextImportModalComponent
- [ ] Delete recipe-text-import-modal component (3 files) + recipe-text-import-modal.service.ts
- [ ] ng build — verify zero errors

## Rules / Constraints
- Partial patch from Gemini uses sparse JSON: only keys the user asked to change are present in `changes`
- Preview card shown before applying — user must confirm
- No regression to the existing "create" mode (generate flow unchanged)
- `RecipeTextImportModalService` + `RecipeParserService` fully removed (no dead imports)
- HeroFab action updated: `import_text_btn` (scan-text) → `ai_recipe_edit` (sparkles)

## Done When
- Sparkles button in recipe builder opens edit-mode modal
- Spoken instruction like "only add the steps" updates only steps, leaves ingredients untouched
- Sparkles button outside builder creates a new recipe (unchanged behavior)
- `recipe-text-import-modal` component and service are deleted, app compiles with zero errors
