EXECUTIVE BRIEF — AI-Everywhere Rollout (program brief)
Vision
Every entity in the app gets an AI button on two surfaces:

List page — "add new with AI" creates the entity from natural language text.
Entity page — "edit with AI" mutates the current entity from natural language text via sparse patches.

Already shipped: recipes (AiRecipeModal + /generate + /patch-recipe). Rest of the program extends this pattern across: menus, products, equipment, units, suppliers, venues.
Pattern being standardized (the "template" Phase 1 proves)
Each entity's AI capability gets:

Two backend endpoints in server/routes/ai.js — /generate-<entity> + /patch-<entity>. Both behind verifyToken, both count against daily limit.
Two GeminiService methods — generate<Entity>() + patch<Entity>().
One shared utility for matching AI output to existing records (Hebrew-aware fuzzy match) — written once in Phase 1, reused across phases.
One page-scoped flow service — orchestrates match + form patching. Keeps page components thin.
One shared modal component — create mode + edit mode. Reuses .c-modal-* engine classes, daily-limit display, overlay patterns.
Integration at two entry points per entity (list page + entity page).

Phase plan
Phase	Entity	Status	Priority rationale
1	Menus	Detailed sub-briefs below, ready to delegate	Headline feature; establishes the template
2	Products (+ quick-add modal)	Roadmap brief below	Highest-volume add flow; biggest user friction reduction
3	Equipment	Roadmap brief below	Clear category-inference signal, self-contained
4	Units	Roadmap brief below	Smallest surface, removes friction on the trickiest modal
5	Suppliers	Roadmap brief below	Needs missing form fields added first (phone/email/address)
6	Venues	Roadmap brief below	Smallest payoff, do last

Delegation guidance for Team Leader
Right now: delegate Phase 1 using the four detailed sub-briefs below. Sequence: Sub-briefs 1+2 can run in parallel once the response JSON contract is agreed. Sub-brief 3 depends on 2. Sub-brief 4 depends on 3.
For each subsequent phase: the roadmap brief below is a program-tracking artifact, not executable work. When a phase activates, bring it back to planning for full expansion into detailed sub-briefs. Do not hand the roadmap text to Claude Code as-is.
Stop conditions between phases: after each phase ships, hold before starting the next. Phase 1 findings will refine the template. Specifically watch for: token usage patterns, match quality edge cases, modal UX issues — all will inform Phase 2+.
Hard scope guardrails applying across all phases:

Never store Gemini API key client-side (always backend proxy — already established).
serving_type_ and other enum fields always returned as English canonical keys, never Hebrew.
Signals only. inject() only. input()/output() only. No any.
.c-* engine classes live in src/styles.scss only.
menu-intelligence.page.ts (1249 LOC) and cook-view.page.ts (846 LOC) must NOT grow. All new logic goes in flow services.
Mobile audit fixes are separate work — AI phases do not touch them.

Explicitly out of scope for the whole program:

Inline-edit AI triggers (per-row AI buttons inside list quick-edits). Defer until after all six entity phases ship; revisit then based on user demand.
Auto-generating dependency entities (e.g., AI generating a missing recipe when referenced in a menu). Each phase only reads from existing data.


PHASE 1 — MENUS (4 detailed sub-briefs, execute now)
Phase 1 scope

Create a menu from scratch from text — entry point on menu list/library page.
Edit current menu via natural language — entry point inside a menu.
AI selects dishes from existing KitchenStateService.recipes_(). Unmatched dishes become placeholder rows the user resolves.
AI proposes sections.
Matching threshold: matched if top confidence > 0.85 AND gap to second > 0.3. Ambiguous if 2+ candidates > 0.55 — render top 3, user picks. Unmatched otherwise.

Sub-brief 1.1 — Backend endpoints
Goal
Add /generate-menu and /patch-menu to the AI router, following /generate and /patch-recipe patterns.
Files to check first

server/routes/ai.js
server/index.js (confirm aiRouter mounted at /api/v1/ai)

Steps

Add MENU_GENERATE_SYSTEM_PROMPT after the existing PATCH_SYSTEM_PROMPT. Instructs Gemini to return:

   {
     "name_": string,
     "event_type_": string,
     "event_date_": ISO date string or null,
     "serving_type_": one of ["plated_course", "buffet", "finger_food", "family_style"],
     "guest_count_": number,
     "sections_": [
       { "category": string,
         "items": [
           { "name_hebrew": string,
             "predicted_take_rate_": number 0-1 or null,
             "serving_portions": number or null,
             "sell_price": number or null } ] } ]
   }
Return ONLY JSON. serving_type_ must be one of the four English keys exactly.
2. Add validateMenuDraft(menu) helper — required fields, type checks, serving_type_ enum check.
3. Add router.post('/generate-menu', verifyToken, ...) accepting { rawText }. Same structure as /generate: apiKey + daily-limit checks, Gemini POST, fence strip, JSON parse, validation, await incrementUsage(), return { menu }. Skip few-shot pool.
4. Add MENU_PATCH_SYSTEM_PROMPT — sparse-patch instructions. Allowable keys: name_, event_type_, event_date_, serving_type_, guest_count_, sections_ (full-array replacement only).
5. Add router.post('/patch-menu', verifyToken, ...) accepting { currentMenu, instruction }. Mirror /patch-recipe. Return { changes }.
6. Smoke-test: curl -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"rawText":"חתונה ל־120 אורחים מנות אישיות"}' http://localhost:3000/api/v1/ai/generate-menu.
Rules

Do NOT copy-paste the recipe prompts.
serving_type_ enum values are English keys only.
No new npm dependencies.
Do NOT modify existing endpoints.
Follow file style: CommonJS, single quotes, semicolons.

Done when

Both endpoints return valid JSON with all fields populated.
Existing endpoints untouched.
Server restarts cleanly via node --watch.


Sub-brief 1.2 — Client models, services, match utility
Goal
Add client types, Gemini service methods, reusable Hebrew-aware match utility, menu AI flow orchestrator.
Files to check first

src/app/core/services/gemini.service.ts
src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts (pattern reference)
src/app/core/services/ai-recipe-draft.service.ts
src/app/core/models/menu-event.model.ts
src/app/core/services/kitchen-state.service.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts — loadEvent(), buildEventFromForm(), form_ structure

Steps

Create src/app/core/models/ai-menu-draft.model.ts. Export:

   AiMenuDishDraft { name_hebrew, predicted_take_rate_, serving_portions, sell_price }
   AiMenuSectionDraft { category, items: AiMenuDishDraft[] }
   AiMenuDraft { name_, event_type_, event_date_, serving_type_, guest_count_, sections_: AiMenuSectionDraft[] }
   AiMenuPatch — partial of AiMenuDraft
   MatchedDish { name_hebrew, status: 'matched'|'ambiguous'|'unmatched', recipeId: string|null, candidates: Array<{recipeId, name, confidence}>, predictedTakeRate?, servingPortions?, sellPrice? }
   MatchedSection { category, items: MatchedDish[] }
   MatchedMenu { ...event fields, sections: MatchedSection[] }
No any.

Create src/app/core/utils/recipe-match.util.ts. Pure functions (no Angular DI):

normalizeHebrew(s: string): string — trim, lowercase Latin, strip common punctuation, collapse whitespace, normalize niqqud. Generalize logic from recipe-ai-flow.service.ts findIngredientMatch_.
matchRecipeName(query, recipes): { bestMatch, candidates, status }. Scoring: exact (1.0) → starts-with (0.9) → contains (0.7) → Levenshtein ratio. Return top 3 sorted desc.
Status rules: matched if top > 0.85 AND (second < 0.55 OR gap > 0.3); ambiguous if 2+ > 0.55; unmatched otherwise.

Note: this util is reused in Phases 2–6 against different collections. Design it generically enough — accept any array of { _id, name_hebrew } records, not Recipe-specific.
In src/app/core/services/gemini.service.ts, add:

generateMenu(rawText): Observable<AiMenuDraft> — POSTs to /api/v1/ai/generate-menu.
patchMenu(currentMenu, instruction): Observable<AiMenuPatch> — POSTs to /api/v1/ai/patch-menu.
Style matches existing generateRecipe / patchRecipe.


Create src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts. Mirror RecipeAiFlowService:

@Injectable() (page-scoped).
inject(): FormBuilder, KitchenStateService, MenuSectionCategoriesService.
init(refs: { menuForm: FormGroup }): void.
runMatching(draft: AiMenuDraft): MatchedMenu — for each dish, matchRecipeName(dish.name_hebrew, state.recipes_()).
applyMatchedMenu(matched, resolutions): void — clear sectionsArray, rebuild. If matched or resolved, set recipe_id_. If skipped, omit. If unresolved unmatched, create row with recipe_id_: null + name snapshot.
applyPatch(patch): void — sparse patch. If sections_ present, re-run matching before applying.



Rules

Pure logic in recipe-match.util.ts (no Angular imports).
Signals only. inject() only. No any.
Single quotes TS, double quotes HTML, no semicolons (match recipe-ai-flow.service.ts style).
UI decisions belong in the modal, not the flow service.

Done when

recipe-match.util.ts is importable, pure, generic over entity type.
GeminiService.generateMenu() + patchMenu() typecheck.
MenuAiFlowService.runMatching() returns MatchedMenu with correct statuses.
applyMatchedMenu() correctly writes to the form (verify via temporary wiring).
ng build passes.


Sub-brief 1.3 — AI menu modal (shared UI)
Goal
Build the shared modal + service that owns the user-facing AI menu flow. Mirrors AiRecipeModal architecturally.
Files to check first

src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts, .html, .scss
src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts
src/app/shared/ai-recipe-modal/ai-draft-editor/
src/app/appRoot/app.component.html
src/app/core/utils/gemini-usage.util.ts
public/assets/data/dictionary.json
Outputs from Sub-brief 1.2

Steps

Create src/app/shared/ai-menu-modal/ai-menu-modal.service.ts. Signals:

isOpen_, mode_: signal<'create'|'edit'>, currentMenu_: signal<AiMenuDraft|null>, resultCallback_.
open(mode, currentMenu, callback), close(), save(result).


Create src/app/shared/ai-menu-modal/ai-menu-modal.component.ts:

Standalone, OnPush.
inject(): AiMenuModalService, GeminiService, MenuAiFlowService, KitchenStateService, UserMsgService, TranslationService.
Signals: prompt_, instruction_, draft_, matched_, patch_, loading_, status_, userResolutions_: signal<Map<string, string|'skip'>>, errorKey_, geminiUsage_.
onGenerate() → gemini.generateMenu() → runMatching() → matched_.set().
onPatch() → gemini.patchMenu() → patch_.set().
onResolve(dishKey, recipeId|'skip') → update userResolutions_.
onApply() → fire resultCallback_ with matched+resolutions (create) or patch (edit) → close.


Create ai-menu-modal.component.html. Structure:

c-modal-overlay + c-modal-card.
Usage indicator at top (reuse pattern from ai-recipe-modal.component.html).
Mode branch. Per dish status render:

matched: recipe name + check icon + "change" pencil that transitions row to ambiguous-picker.
ambiguous: radio of top 3 + "pick another manually" option.
unmatched: placeholder name + "pick a recipe" (inline filter by typed text against kitchenState.recipes_()) + "skip".


Edit mode: instruction textarea → patch summary → approve/reject.


Create ai-menu-modal.component.scss. Only .c-* engines from styles.scss. Component-scoped classes. Logical properties. Native nesting.
In app.component.html, add <app-ai-menu-modal/> next to <app-ai-recipe-modal/>.
In app.component.ts, import AiMenuModalComponent.
Dictionary keys: ai_menu_title_create, ai_menu_title_edit, ai_menu_prompt_placeholder, ai_menu_instruction_placeholder, ai_menu_generate, ai_menu_generate_again, ai_menu_apply, ai_menu_matched, ai_menu_ambiguous, ai_menu_unmatched, ai_menu_change_match, ai_menu_pick_recipe, ai_menu_skip_dish, ai_menu_pick_manually, ai_menu_error, ai_menu_daily_limit_reached, ai_menu_empty_draft, ai_menu_no_matches_warning, ai_menu_dish_placeholder_note.

Rules

input() / output() / model() — no decorators.
inject() only. Signals only.
.c-* engines from styles.scss only.
Logical properties, five-group rhythm.
All strings through translatePipe.
Do NOT modify AiRecipeModal.

Done when

Open via aiMenuModal.open('create', null, cb) renders prompt.
Post-generate preview renders matched/ambiguous/unmatched per branch.
User can change match, pick from candidates, resolve unmatched.
Apply fires callback with resolved MatchedMenu.
Edit mode: instruction → patch preview → apply → callback fires with AiMenuPatch.
Overlay click + Escape close + reset.
ng build passes.


Sub-brief 1.4 — Integration + entry points
Goal
Wire the modal into menu-intelligence page (edit current) and menu list page (add new), with dirty-state protection.
Files to check first

src/app/pages/menu-intelligence/menu-intelligence.page.ts + .html
src/app/pages/menu-library/ (find the menu list page)
src/app/core/services/menu-event-data.service.ts
src/app/core/services/confirm-modal.service.ts
Sub-brief 1.3 output
public/assets/data/dictionary.json
Confirm what the existing "בונה מתכונים" button in menu-intelligence.page.html does

Steps

In menu-intelligence.page.ts:

inject(AiMenuModalService). Provide MenuAiFlowService in component providers, then inject().
In ngOnInit: menuAiFlow.init({ menuForm: this.form_ }).
Add openAiMenuModal():

If form_ empty-ish: create mode. Callback: menuAiFlow.applyMatchedMenu(result, resolutions).
If form_ has content: edit mode with snapshot from buildEventFromForm(). Callback: menuAiFlow.applyPatch(patch).
If user triggers create while form has content: ConfirmModalService.open({ title: 'ai_menu_replace_confirm_title', body: 'ai_menu_replace_confirm' }). Confirm → clear + proceed.




In menu-intelligence.page.html:

Investigate existing "בונה מתכונים" button.
If unwired/broken: repurpose → openAiMenuModal() + update label to ai_menu_open.
If already legitimate: add sibling button with (click)="openAiMenuModal()" + label ai_menu_open.


Find menu list page (src/app/pages/menu-library/ or equivalent):

Add "add with AI" button next to existing "add new menu" action. Label ai_menu_create_new.
Click handler: open modal in create mode. Callback creates MenuEvent via existing data service, navigates to /menu-intelligence/:newId.


Dictionary keys: ai_menu_open, ai_menu_create_new, ai_menu_replace_confirm_title, ai_menu_replace_confirm.

Rules

Do NOT expand menu-intelligence.page.ts by more than ~30 LOC.
Do NOT break existing menu functionality — manually verify regression-free.
Do NOT touch mobile-audit issues.
If existing AI button already works, leave it and add a new dedicated one.
Do NOT modify AiMenuModal* — consume only.

Done when

List page "add with AI" → modal create mode → generate → resolve → apply creates MenuEvent + navigates to it.
Inside menu: AI button → modal edit mode → instruction → patch preview → apply updates form.
Create-while-dirty shows confirm.
Save works post-AI. No regressions.
Mobile render acceptable at 375px.
ng build passes.


PHASE 2 — PRODUCTS (roadmap brief — expand before delegating)
[...full roadmap brief as provided...]

PHASE 3 — EQUIPMENT (roadmap brief — expand before delegating)
[...full roadmap brief as provided...]

PHASE 4 — UNITS (roadmap brief — expand before delegating)
[...full roadmap brief as provided...]

PHASE 5 — SUPPLIERS (roadmap brief — gated on form expansion, expand before delegating)
[...full roadmap brief as provided...]

PHASE 6 — VENUES (roadmap brief — expand before delegating)
[...full roadmap brief as provided...]

## Session ID
2026-04-25-ai-everywhere-menus
