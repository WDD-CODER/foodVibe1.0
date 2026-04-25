---
name: AI Menu — Phase 1 (Menus)
overview: Add AI-powered menu creation and editing across four sub-briefs — backend endpoints, client models/match utility, shared modal, and list/page integration.
todos:
  - "[ ] 1.1.1 server/routes/ai.js — add MENU_GENERATE_SYSTEM_PROMPT"
  - "[ ] 1.1.2 server/routes/ai.js — add validateMenuDraft() helper"
  - "[ ] 1.1.3 server/routes/ai.js — add POST /generate-menu endpoint"
  - "[ ] 1.1.4 server/routes/ai.js — add MENU_PATCH_SYSTEM_PROMPT"
  - "[ ] 1.1.5 server/routes/ai.js — add POST /patch-menu endpoint"
  - "[ ] 1.2.1 src/app/core/models/ai-menu-draft.model.ts — create"
  - "[ ] 1.2.2 src/app/core/utils/recipe-match.util.ts — create"
  - "[ ] 1.2.3 src/app/core/services/gemini.service.ts — add generateMenu() + patchMenu()"
  - "[ ] 1.2.4 src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts — create"
  - "[ ] 1.3.1 src/app/shared/ai-menu-modal/ai-menu-modal.service.ts — create"
  - "[ ] 1.3.2 src/app/shared/ai-menu-modal/ai-menu-modal.component.ts — create"
  - "[ ] 1.3.3 src/app/shared/ai-menu-modal/ai-menu-modal.component.html — create"
  - "[ ] 1.3.4 src/app/shared/ai-menu-modal/ai-menu-modal.component.scss — create"
  - "[ ] 1.3.5 src/app/appRoot/app.component.html — add <app-ai-menu-modal/>"
  - "[ ] 1.3.6 src/app/appRoot/app.component.ts — import AiMenuModalComponent"
  - "[ ] 1.3.7 public/assets/data/dictionary.json — add 19 ai_menu_* keys"
  - "[ ] 1.4.1 menu-intelligence.page.ts — providers + inject + ngOnInit init()"
  - "[ ] 1.4.2 menu-intelligence.page.ts — openAiMenuModal() + buildAiMenuSnapshot_()"
  - "[ ] 1.4.3 menu-intelligence.page.html — add AI button"
  - "[ ] 1.4.4 menu-library-list.component.ts+html — onCreateWithAi() + button"
  - "[ ] 1.4.5 public/assets/data/dictionary.json — add 4 more keys"
  - "[ ] BG — ng build 0 errors"
isProject: false
---

# AI Menu — Phase 1

## Goal
Add AI-powered menu creation (from natural language text on the list page) and editing (natural language instruction on the menu page), following the established AiRecipeModal + GeminiService pattern.

## Atomic Sub-tasks

### Sub-brief 1.1 — Backend endpoints

- [ ] `server/routes/ai.js` — add `MENU_GENERATE_SYSTEM_PROMPT` after PATCH_SYSTEM_PROMPT (line 508). Instructs Gemini to return ONLY JSON: `{ name_, event_type_, event_date_ (ISO or null), serving_type_ (one of plated_course|buffet|finger_food|family_style), guest_count_, sections_: [{ category, items: [{ name_hebrew, predicted_take_rate_, serving_portions, sell_price }] }] }`. New prompt — do not copy existing prompts.
- [ ] `server/routes/ai.js` — add `validateMenuDraft(menu)` returning `string[]`. Checks: `name_` non-empty string; `serving_type_` in enum; `guest_count_` number; `sections_` array.
- [ ] `server/routes/ai.js` — add `router.post('/generate-menu', verifyToken, ...)` accepting `{ rawText }`. Mirrors `/generate` pattern: apiKey check → daily-limit check → rawText validation → Gemini POST → fence strip → JSON parse → validateMenuDraft → incrementUsage → `res.json({ menu })`. No few-shot pool.
- [ ] `server/routes/ai.js` — add `MENU_PATCH_SYSTEM_PROMPT`. Allowable patch keys: `name_`, `event_type_`, `event_date_`, `serving_type_`, `guest_count_`, `sections_` (full-array only). Returns `{ changes: {...} }`.
- [ ] `server/routes/ai.js` — add `router.post('/patch-menu', verifyToken, ...)` accepting `{ currentMenu, instruction }`. Mirrors `/patch-recipe`: validate → Gemini POST → parse → check `parsed.changes` → incrementUsage → `res.json({ changes })`.

### Sub-brief 1.2 — Client models, services, match utility

- [ ] `src/app/core/models/ai-menu-draft.model.ts` — create. Export: `AiMenuDishDraft`, `AiMenuSectionDraft { category: string; items: AiMenuDishDraft[] }`, `AiMenuDraft`, `AiMenuPatch = Partial<AiMenuDraft>`, `MatchedDish`, `MatchedSection { category: string; items: MatchedDish[] }`, `MatchedMenu`. No `any`.
- [ ] `src/app/core/utils/recipe-match.util.ts` — create. Pure functions, zero Angular imports. Export `normalizeHebrew(s): string` (niqqud strip via NFD, lowercase Latin, punctuation strip, collapse whitespace). Export `matchRecipeName<T extends { _id: string; name_hebrew: string }>(query, records): { bestMatch, candidates, status }`. Scoring: exact=1.0, starts-with=0.9, contains=0.7, Levenshtein otherwise. Top 3 sorted desc. Status: matched if top>0.85 AND (second<0.55 OR gap>0.3); ambiguous if 2+>0.55; unmatched otherwise.
- [ ] `src/app/core/services/gemini.service.ts` — add `async generateMenu(rawText: string): Promise<AiMenuDraft>` and `async patchMenu(currentMenu: AiMenuDraft, instruction: string): Promise<AiMenuPatch>`. Both use `withRetry() + firstValueFrom()` pattern identical to existing methods.
- [ ] `src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts` — create (new `services/` directory). `@Injectable()` page-scoped. `inject(FormBuilder, KitchenStateService)`. Methods: `init({ menuForm: FormGroup })`, `runMatching(draft): MatchedMenu`, `applyMatchedMenu(matched, resolutions: Map<string, string|'skip'>): void` (accesses `menuForm.get('sections_') as FormArray<FormGroup>`; maps `section.category → name_`; item groups match `addItem()` exact fields: `recipe_id_, recipe_type_, predicted_take_rate_, sell_price, food_cost_money, food_cost_pct, serving_portions, serving_portions_pct`), `applyPatch(patch): void`.

### Sub-brief 1.3 — AI menu modal (shared UI)

- [ ] `src/app/shared/ai-menu-modal/ai-menu-modal.service.ts` — create. `@Injectable({ providedIn: 'root' })`. Plain callback field `private onResult_: fn|null` (NOT signal). `open(mode, currentMenu?, onResult?)` with auth-gate. `getEditContext()`, `deliverResult(result, resolutions?)`, `close()`.
- [ ] `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts` — create. Standalone OnPush. Inject: `AiMenuModalService, GeminiService, KitchenStateService, UserMsgService, TranslationService`. **No MenuAiFlowService** (page-scoped). `onGenerate()` calls `await gemini.generateMenu()` then `matchRecipeName()` from util with `kitchenState.recipes_()`, sets `matched_`. `onApply()` → `deliverResult()`. `onClose()` → `modalService.close()`.
- [ ] `src/app/shared/ai-menu-modal/ai-menu-modal.component.html` — create. `c-modal-overlay` + `c-modal-card`. Usage indicator. Create mode: prompt textarea → matched-menu preview (matched/ambiguous/unmatched per-dish branches). Edit mode: instruction textarea → patch summary → approve/reject. All strings via `| translatePipe`.
- [ ] `src/app/shared/ai-menu-modal/ai-menu-modal.component.scss` — create. Only `.c-*` engine classes from `styles.scss`. Logical properties, native nesting.
- [ ] `src/app/appRoot/app.component.html` — add `<app-ai-menu-modal/>` after line 19 (`<app-ai-recipe-modal/>`).
- [ ] `src/app/appRoot/app.component.ts` — import `AiMenuModalComponent`, add to `imports[]`.
- [ ] `public/assets/data/dictionary.json` — add 19 keys: `ai_menu_title_create`, `ai_menu_title_edit`, `ai_menu_prompt_placeholder`, `ai_menu_instruction_placeholder`, `ai_menu_generate`, `ai_menu_generate_again`, `ai_menu_apply`, `ai_menu_matched`, `ai_menu_ambiguous`, `ai_menu_unmatched`, `ai_menu_change_match`, `ai_menu_pick_recipe`, `ai_menu_skip_dish`, `ai_menu_pick_manually`, `ai_menu_error`, `ai_menu_daily_limit_reached`, `ai_menu_empty_draft`, `ai_menu_no_matches_warning`, `ai_menu_dish_placeholder_note`.

### Sub-brief 1.4 — Integration + entry points

- [ ] `menu-intelligence.page.ts` — add `providers: [MenuAiFlowService]` to `@Component`. Inject `AiMenuModalService` + `MenuAiFlowService`. In `ngOnInit()` add `this.menuAiFlow.init({ menuForm: this.form_ })`.
- [ ] `menu-intelligence.page.ts` — add `protected openAiMenuModal(): void` + `private buildAiMenuSnapshot_(): AiMenuDraft`. Empty form → create mode callback = `menuAiFlow.applyMatchedMenu`. Has content → `confirmModal.open(...)` → edit mode callback = `menuAiFlow.applyPatch`. Max +24 LOC.
- [ ] `menu-intelligence.page.html` — add AI button `(click)="openAiMenuModal()"` with label `ai_menu_open`. No existing button to repurpose ("בונה מתכונים" does not exist).
- [ ] `menu-library-list.component.ts + .html` — inject `AiMenuModalService`. Add `onCreateWithAi()`: opens create mode, callback builds `Omit<MenuEvent, '_id'>` from `MatchedMenu` (sections with `_id: crypto.randomUUID()`, `name_: sec.category`, `sort_order_: i+1`, items with `derived_portions_: Math.round(guest_count * predictedTakeRate)`) → `addMenuEvent(draft)` → navigate to `/menu-intelligence/:newId`. HTML: add "Add with AI" button next to existing create button.
- [ ] `public/assets/data/dictionary.json` — add 4 keys: `ai_menu_open`, `ai_menu_create_new`, `ai_menu_replace_confirm_title`, `ai_menu_replace_confirm`.
- [ ] `ng build` — must pass 0 errors.

## Constraints
- Never store Gemini API key client-side
- serving_type_ and other enum fields always English canonical keys
- Signals only, inject() only, no any
- .c-* engine classes in styles.scss only
- menu-intelligence.page.ts must NOT grow more than ~30 LOC
- No mobile-audit fixes in this plan
- GeminiService methods are async Promise<T> with withRetry() — NOT Observable
- AiMenuModalComponent must NOT inject MenuAiFlowService (page-scoped DI conflict)
- Section form: name_ field (not category); map AI's category → name_
- Item form group fields (exact): recipe_id_, recipe_type_, predicted_take_rate_, sell_price, food_cost_money, food_cost_pct, serving_portions, serving_portions_pct

## Done when
- `/api/v1/ai/generate-menu` and `/patch-menu` return valid JSON
- `ng build` passes with 0 errors
- List page "Add with AI" → modal → generate → apply creates MenuEvent + navigates
- Menu page AI button → edit mode → apply patches form
- Create-while-dirty shows confirm modal
- Existing menu functionality unbroken
