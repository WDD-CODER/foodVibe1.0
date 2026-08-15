---
name: AI Text Import Parser
overview: Parse plain-text recipe/dish descriptions via Gemini and auto-fill the recipe-builder form.
isProject: false
todos:
  - "[ ] parsed-result.model.ts"
  - "[ ] recipe-text-import-modal.service.ts"
  - "[ ] recipe-parser.service.ts"
  - "[ ] recipe-text-import-modal component"
  - "[ ] recipe-header output + button"
  - "[ ] recipe-builder wiring + toasts"
  - "[ ] just-filled CSS"
  - "[ ] app.component registration"
  - "[ ] dictionary keys"
---

# AI Text Import Parser (Plan 226)

## Goal
Allow users to paste a plain-text recipe or dish description. The app sends it to Gemini, classifies it as `recipe` or `dish`, extracts structured fields, and auto-fills the recipe-builder form. User reviews before saving.

## Key architectural decisions (from plan-implementation verification)
- No separate Dish model or form — dishes are Recipes with `recipe_type_ === 'dish'`; one form, one page
- API key stays in localStorage (matches GeminiService pattern) — NOT in environment.ts
- GeminiService.generateRaw() added as generic entry point (forward-compatible with Plan 225 proxy migration)
- Modal result delivery via service signal (RecipeTextImportModalService) — NOT via @Output
- ParsedRecipe uses form field names: `name_hebrew`, `serving_portions`, `labels[]` (not name/servings/tags)
- prepTimeMinutes / cookTimeMinutes dropped — they don't exist in the model or form

## Atomic Sub-tasks

- [ ] `src/app/shared/models/parsed-result.model.ts` — ParsedIngredient, ParsedStep, ParsedRecipe (name_hebrew, serving_portions, labels, ingredients, steps), ParsedDish (name_hebrew, serving_portions?), ParsedResultType, ParsedResult
- [ ] `src/app/core/services/gemini.service.ts` — add generateRaw(systemPrompt, userText): Promise<string> method (generic, reused by both generateRecipe and new parser)
- [ ] `src/app/core/services/recipe-text-import-modal.service.ts` — signal-based open/close + result delivery (AuthModalService pattern)
- [ ] `src/app/core/services/recipe-parser.service.ts` — inject GeminiService; parseText(rawText): Observable<ParsedResult>; system prompt with correct field names; catchError wrapping
- [ ] `src/app/shared/components/recipe-text-import-modal/recipe-text-import-modal.component.ts+html+scss` — standalone; textarea dir="auto"; idle/loading/error states; confidence < 0.6 warning banner with two override buttons
- [ ] `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts+html` — add importTextClick output() + "ייבוא מטקסט" button in .top-row
- [ ] `src/app/pages/recipe-builder/recipe-builder.page.ts` — inject RecipeTextImportModalService + RecipeParserService; handle modal result; patch name_hebrew/serving_portions/labels/ingredientsArray/workflowArray; type mismatch toast via userMsg_
- [ ] `src/app/pages/recipe-builder/recipe-builder.page.scss` — add .just-filled animation (highlight fade-out at 1500ms)
- [ ] `src/app/appRoot/app.component.ts+html` — register RecipeTextImportModalComponent at root
- [ ] `public/assets/data/dictionary.json` — add Hebrew keys: import_text_btn, parsing_text, parse_error_msg, low_confidence_warning, type_mismatch_recipe_toast, type_mismatch_dish_toast

## Constraints
- No `any` types; no semicolons; single quotes in TS; double quotes in HTML
- Standalone components only; no new patterns
- No .c-* engine classes in component SCSS

## Done when
- [ ] ParsedResult model created and matches form fields exactly
- [ ] RecipeParserService wraps GeminiService with correct system prompt and catchError
- [ ] RecipeTextImportModalComponent has all three states + low-confidence override
- [ ] "ייבוא מטקסט" button wired into recipe-builder header
- [ ] Form auto-fill works for both recipe and dish types
- [ ] Type mismatch toast shows on type mismatch
- [ ] ng build passes with zero errors
