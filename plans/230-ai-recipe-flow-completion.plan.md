---
name: AI Recipe Flow — Completion
overview: Complete the "Add recipe via AI" flow by fixing the spec, draft placement, modal service pattern, and missing translation keys.
isProject: false
todos:
  - Fix spec — Sparkles + HeroFabService + AiRecipeModalService mocks
  - Fix AiRecipeModalService — void open(), private isOpen_, public isOpen accessor
  - Fix AiRecipeModalComponent — OnPush + update template to use isOpen
  - Fix recipe-builder draft placement — move inside else block
  - Add missing translation keys — ai_recipe_preview_ingredients, ai_recipe_preview_steps
---

# Goal
Complete the "Add recipe via AI" flow. Steps 1, 5, 6, 7 of the original brief are already done (Plan 225 handled GeminiService proxy + modal cleanup). Remaining work: spec mocks, modal service pattern, draft placement, and translation keys.

# Context
- Plan 225 intentionally moved GeminiService to HttpClient + backend proxy; localStorage key approach is superseded.
- Plan 226 added parseText() to GeminiService.
- AiRecipeModalComponent, AiRecipeModalService, AiRecipeDraftService all exist but need fixes.

# Atomic Sub-tasks

- [ ] `recipe-book-list.component.spec.ts` — add Sparkles to LucideAngularModule.pick(), add HeroFabService + AiRecipeModalService mock providers
- [ ] `ai-recipe-modal.service.ts` — change open() to void return (remove Promise), make isOpen_ private, add readonly isOpen accessor
- [ ] `ai-recipe-modal.component.ts` — add ChangeDetectionStrategy.OnPush
- [ ] `ai-recipe-modal.component.html` — update isOpen_() → isOpen() to match service change
- [ ] `recipe-builder.page.ts` — move aiRecipeDraft_.consume() call inside the else { no recipe } branch
- [ ] `dictionary.json` — add ai_recipe_preview_ingredients and ai_recipe_preview_steps keys
- [ ] Run ng build — verify zero errors
- [ ] Run ng test --watch=false — verify all tests pass

# Rules
- No auto-commit without explicit user confirmation
- GeminiService stays as HttpClient proxy (Plan 225 decision)
- No new .c-* engine classes in component SCSS
- No any, single quotes in TS, double quotes in HTML, no semicolons

# Done when
- ng build passes with zero errors
- ng test --watch=false passes
- FAB sparkles action opens modal on /recipe-book
- Draft prefill only triggers when navigating to a new recipe (not editing existing)
