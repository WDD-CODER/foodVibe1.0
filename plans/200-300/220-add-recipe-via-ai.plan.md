---
name: Add recipe via AI
overview: FAB action on recipe-book list opens a Gemini-powered modal where user describes a recipe; structured JSON is returned and pre-fills the recipe-builder form.
todos: []
isProject: false
---

# Goal

Add an "Add recipe via AI" flow: a FAB action on the recipe-book list opens a modal where the user describes a recipe, Gemini generates structured data, and the user is sent to a pre-filled recipe-builder to review and save.

# Atomic Sub-tasks

- [ ] `src/app/core/services/ai-recipe-draft.service.ts` — create AiRecipeDraft interface + AiRecipeDraftService (signal-based, set/consume pattern)
- [ ] `src/app/core/services/gemini.service.ts` — create GeminiService (localStorage key FV_GEMINI_API_KEY, fetch-based generateRecipe, system prompt)
- [ ] `src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts` — create promise-based modal service (isOpen_ signal, open/close)
- [ ] `src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts + .html + .scss` — standalone modal component (configure-key panel, prompt textarea, preview card, generate/open-in-builder actions)
- [ ] `src/app/appRoot/app.component.ts + .html` — wire AiRecipeModalComponent into root template (after app-confirm-modal)
- [ ] `recipe-book-list.component.ts` — add OnInit/OnDestroy interfaces, inject HeroFabService + AiRecipeModalService, register sparkles FAB action
- [ ] `recipe-builder.page.ts` — inject AiRecipeDraftService, add private prefillFromAiDraft method, call consume+prefill in ngOnInit after route load block
- [ ] `public/assets/data/dictionary.json` — add 10 AI recipe translation keys to "general" section

# Constraints

- API key in localStorage under FV_GEMINI_API_KEY only — never environment.ts
- GeminiService.generateRecipe must use fetch, not HttpClient
- AI ingredients must NOT resolve referenceId — leave as null
- AiRecipeModalComponent must be standalone, inject(), signals only, no @Input/@Output
- SCSS: use existing c-modal-overlay / c-modal-card engines — no new engine classes
- ng build must pass after every file creation (treat errors as blockers)
- Sparkles icon is available via full LucideAngularModule (no .pick() change needed)
- Field name corrections from plan-implementation: step field is `instruction` (not `instruction_`); ingredient unit field is `unit` (not `unit_`)
- Yield for dish type: set `serving_portions` AND `yield_conversions[0]`; for preparation: only `yield_conversions[0]`
- Dictionary file is at `public/assets/data/dictionary.json` (not src/assets/i18n)
- App component is at `src/app/appRoot/app.component.ts` (not root src/app)

# Done When

- A "sparkles" FAB action appears on the /recipe-book page
- Clicking it opens a modal with a Hebrew text area and "Generate" button
- If no API key is configured, an inline key input is shown instead
- After generation, a read-only recipe preview appears in the modal
- Clicking "Open in recipe builder" navigates to /recipe-builder with the form pre-filled (name, yield, ingredient names, steps)
- ng build passes with no errors
