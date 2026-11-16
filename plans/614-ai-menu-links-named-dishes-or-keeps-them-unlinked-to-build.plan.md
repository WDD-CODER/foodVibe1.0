# Plan 614 — AI menu links named dishes to the recipe book or keeps them as unlinked dishes to build
Status: active
Depends-on: none
Snapshot: a8d09c051a08d36c9d24261da98c01066cfe448f

## Problem Statement
A chef who builds a menu with the AI assistant names dishes ("fish carpaccio for starters"). Today the AI copies the
names as written and never looks in the chef's recipe book (`server/routes/ai.js:911`, rule 1). The client then fuzzy-
matches against every recipe and preparation (`matchMenuDish` in `recipe-match.util.ts`), and a dish it cannot place
becomes an empty row that `pruneBlankMenuItems` silently deletes on save. So a dish the chef has not built yet is lost,
and a dish they did build under a longer name ("fish carpaccio with tomato seeds and olive oil") is not offered clearly.

The goal is the same "link it or keep it unlinked" flow the AI recipe builder has for ingredients, applied to dishes:
pick an existing dish from the recipe book, or keep the typed name as an unlinked dish. Unlinked dishes then appear on
the menu, and clicking one takes the chef to the dish builder and back to the menu.

## Goals & Success Criteria
**Primary:** each dish the chef names ends up on the menu either linked to a recipe-book dish they chose or as an
unlinked dish with their typed name. Each unlinked dish takes the chef, in one click, to a dish builder that already has
the name filled in, and saving the dish brings them back to the menu with that dish now linked.

- [auto] `pnpm run test:ci` passes, including the new cases in `src/app/core/utils/recipe-match.util.spec.ts`
  (`pickDishOptions`: scores 0.96/0.80 → one option 0.96; 0.80/0.70/0.40 → 0.80 and 0.70; 0.90/0.65/0.62 → only 0.90;
  0.85/0.75/0.72/0.71 → exactly three, 0.85/0.75/0.72; 0.65/0.62 → both; 0.55 only → no options; the default choice is
  the top option at ≥ 0.70 and "new dish" below),
  `src/app/core/utils/menu-unlinked.util.spec.ts`, `src/app/pages/menu-intelligence/menu-form.util.spec.ts` (an
  unlinked row is not blank and is not pruned), `src/app/core/engine/event-plan.engine.spec.ts` (an unlinked item adds
  no cost and no `deleted` missing entry) and `src/app/core/utils/prep-sheet-groups.util.spec.ts` (an unlinked item is
  skipped).
- [auto] `pnpm run test:server` passes, including new cases in `server/test/ai-menu.test.js`: a `matches` entry with a
  dish id not in the recipe book is dropped, more than 3 matches are cut to 3, a confidence outside 0–1 is clamped, and a
  named dish keeps its `nameHebrew` as the user wrote it.
- [auto] `pnpm run build` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] Open `/recipe-builder?type=dish&name=קרפצ'יו דג` → the dish name field shows `קרפצ'יו דג` (spec
  `e2e/ui/614-1.spec.ts`, signs in with `signInQa`, saves a screenshot).
- [human] In the AI menu window, a named dish with close matches lists up to 3 recipe-book dishes, each with its % shown
  beside the name (not inside it), and an option to add it as a new, unlinked dish under the typed name.
- [human] On the menu page an unlinked dish shows a clear "not connected" mark. Clicking it saves the menu, opens the dish
  builder with the name filled in, and saving there returns to the same menu with the dish linked and its data shown.

## Execution Mode
- Parallel: yes
- Concurrent plans: any; overlap with draft plan 471 on `src/app/core/services/menu-export.service.ts` (see Critical
  Questions)
- Isolated DB: no — one new optional field, no migration

## Read-Write Scope
Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).
```scope
server/routes/ai.js
server/test/ai-menu.test.js
shared/schemas/entities/menu-event.schema.ts
src/app/core/models/ai-menu-draft.model.ts
src/app/core/models/menu-event.model.ts
src/app/core/utils/recipe-match.util.ts
src/app/core/utils/recipe-match.util.spec.ts
src/app/core/utils/menu-unlinked.util.ts
src/app/core/utils/menu-unlinked.util.spec.ts
src/app/core/utils/prep-sheet-groups.util.ts
src/app/core/utils/prep-sheet-groups.util.spec.ts
src/app/core/engine/event-plan.engine.ts
src/app/core/engine/event-plan.engine.spec.ts
src/app/core/services/menu-export.service.ts
src/app/shared/ai-menu-modal/**
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-form.util.ts
src/app/pages/menu-intelligence/menu-form.util.spec.ts
src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
public/assets/data/dictionary.json
e2e/ui/614-1.spec.ts
```

## Read Scope
Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — the new optional `unlinkedName` field is added to the one Zod schema in `shared/schemas`, and the
  server still validates every menu write against it (stored menus without the field stay valid, per D56).
- INV-6: preserves — the AI is still called only through `server/routes/ai.js`; the client only reads the `matches` the
  server returns and validates.

## Reuse Check
- `pickDishOptions` dish-candidate rule — family: helpers — rung: 3 — why: a pure function next to `matchRecipeName` in `recipe-match.util.ts`, which owns name matching.
- `linkUnlinkedMenuItem` in new `menu-unlinked.util.ts` — family: helpers — rung: 3 — why: a pure menu-shape function, testable without the data service.
- "not connected" mark on the dish row — family: chip — rung: 1 — why: an existing `c-chip` used as is.
- Dish options radio list in the AI menu window — family: none — rung: 4 — why: no registry family covers a radio choice list; this extends the modal's existing ambiguous-branch list with one option and a % beside each name.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the AI menu assistant to show me which of my dishes match what I asked for, with how close each one
  is, so that I can use a dish I already built instead of typing it again.
- As a chef, I want to keep a dish I have not built yet as an unlinked dish under my own name, so that I can plan the
  whole menu from my head first.
- As a chef, I want one click on an unlinked dish to open its dish builder and bring me back to the menu when I save,
  so that I can build the missing dishes one after another.

## Functional Requirements
### Must Have (P0)
- [ ] For every dish the user named, the AI also returns up to 3 recipe-book dishes that are the same dish, each with a
  confidence 0–1. The server keeps only ids that are in the recipe book.
- [ ] Options rule (scores as fractions, shown as whole %):
  - drop every candidate below 0.60;
  - when the top one is ≥ 0.95, show only that one;
  - when the top one is 0.70–0.94, show every candidate ≥ 0.70 (at most 3, best first); when only one reaches 0.70,
    show only that one (Human 2026-11-16: "around 70% I want to see at least two options, if there are");
  - when the top one is 0.60–0.69, show the candidates within 0.30 of the top one, at most 3, best first.
- [ ] The option "add as a new dish (not connected)" with the typed name is always there. It is preselected when no
  option is left or the top one is below 0.70; otherwise the top option is preselected. The existing "skip" stays.
- [ ] The % is shown beside the dish name, in its own element, never inside the name text.
- [ ] Matching uses dishes only (the recipe book's dishes), not preparations.
- [ ] A dish kept as new is saved on the menu as an item with `recipeId: ''` and `unlinkedName: <typed name>`. Saving,
  reloading and pruning never drop it.
- [ ] On the menu page an unlinked item shows its name and a "not connected" mark. Its cost and portion cells are empty,
  and it can be removed like any other dish.
- [ ] Clicking an unlinked item saves the menu first. If the menu cannot be saved (missing required fields), the
  existing missing-fields message shows and the user stays. After a successful save, the dish builder opens as a new
  dish with the name filled in.
- [ ] Saving that dish links it to the menu item it came from and returns to that menu, not to the recipe book. Opening
  the builder from anywhere else keeps today's behaviour.

### Should Have (P1)
- [ ] Any button in the dish builder that leads to `/recipe-book` today goes back to the menu instead when the builder
  was opened from a menu.

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only. The % sits after the name in a muted `ai-menu-candidate-score` span (the class
  exists), for example `קרפצ'יו דג עם זרעי עגבניות ושמן זית  70%`.
- New dictionary keys (`public/assets/data/dictionary.json`, append only):
  - `ai_menu_new_unlinked_dish`: "הוסף כמנה חדשה (לא מקושרת)"
  - `ai_menu_choose_dish`: "בחר מנה מספר המתכונים או הוסף מנה חדשה"
  - `menu_dish_unlinked`: "לא מקושר"
  - `menu_dish_unlinked_build`: "לחץ כדי לבנות את המנה"
  - `menu_link_dish_failed`: "המנה נשמרה, אך לא חוברה לתפריט"
- Existing keys reused: `ai_menu_skip_dish`, `ai_menu_unmatched`, `menu_saved`.

## Atomic Sub-tasks
These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.
- [ ] A1: The AI menu reply also names which recipe-book dishes match each dish the user typed — change rule 1 of `MENU_GENERATE_SYSTEM_PROMPT`: named dishes keep `nameHebrew` as written and, when a RECIPE BOOK is given, carry `"matches": [{ "dishId", "confidence" }]` (up to 3, same dish possibly with a longer name, best first, omit when none fits). Extend `applyDishBook` to keep only matches whose `dishId` is in the book, clamp confidence to 0–1, drop duplicates, keep at most 3. Tests in `server/test/ai-menu.test.js` — server/routes/ai.js, server/test/ai-menu.test.js
- [ ] A2: One rule decides which dish options the chef sees and which one is preselected — add `pickDishOptions(candidates)` to `recipe-match.util.ts` (rules in P0: below 0.60 out, ≥ 0.95 alone, top 0.70–0.94 → all ≥ 0.70, top 0.60–0.69 → within 0.30 of top, max 3; returns `{ options, defaultChoice: recipeId | 'new' }`). Change `matchMenuDish` to take the AI `matches` and the dish list. Each candidate scores the higher of the AI confidence and `matchRecipeName`'s score for the same id, then goes through `pickDishOptions`. A `dishId` from rule 2 stays linked at 1.0. Status: `matched` when one option ≥ 0.95, `ambiguous` when options exist, `unmatched` when none. Add `matches?: { dishId: string; confidence: number }[]` to `AiMenuDishDraft` — src/app/core/utils/recipe-match.util.ts, src/app/core/utils/recipe-match.util.spec.ts, src/app/core/models/ai-menu-draft.model.ts
- [ ] A3: The AI menu window lets the chef pick a matching dish or keep a new unlinked one — in `ai-menu-modal.component.ts`, `buildMatchedMenu_` matches against `DishDataService.allDishes_()` only and seeds `userResolutions_` with each dish's `defaultChoice`. Resolutions become `recipeId | 'skip' | 'new'`. The template shows, for `ambiguous` and `unmatched`, a radio list: the options with the % beside each name, then `ai_menu_new_unlinked_dish`, then the existing skip button. `matched` stays as is, but its pencil button switches the row to the same radio list. Update the service and spec types — src/app/shared/ai-menu-modal/**
- [ ] A4: Menus can store a dish that has no recipe yet — add `unlinkedName: z.string().trim().min(1).max(120).optional()` to the menu item in `menu-event.schema.ts` and `unlinkedName?: string` to `MenuItemSelection` — shared/schemas/entities/menu-event.schema.ts, src/app/core/models/menu-event.model.ts
- [ ] A5: Both places that apply an AI menu keep the new dishes instead of dropping them — `menu-library.page.ts` `openAiCreateModal` and `menu-ai-flow.service.ts` `applyMatchedMenu`: resolution `'new'` (or `unmatched` with no resolution) gives `recipeId: ''` and `unlinkedName: dish.nameHebrew`. A picked id gives `recipeId`; `'skip'` drops the dish. The form item group gains an `unlinkedName` control, and `recipeId` is required only when `unlinkedName` is empty. `applyPatch`'s call path is unchanged — src/app/pages/menu-library/menu-library.page.ts, src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts
- [ ] A6: The menu page loads, saves and keeps unlinked dishes — `menu-form.util.ts`: "blank" means no `recipeId` and no `unlinkedName`, for both `pruneBlankMenuItems` and `blankMenuItemIndex`. `menu-intelligence.page.ts` `loadEvent` carries `unlinkedName` into the item group with the same validator rule, and `buildEventFromForm` keeps an item that has `recipeId` or `unlinkedName` and writes `unlinkedName` only when there is no `recipeId` — src/app/pages/menu-intelligence/menu-form.util.ts, src/app/pages/menu-intelligence/menu-form.util.spec.ts, src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [ ] A7: Costs, prep sheets and exports ignore an unlinked dish instead of calling it deleted — `event-plan.engine.ts` (~line 262): an item with no `recipeId` is skipped (no cost line, no missing entry). `prep-sheet-groups.util.ts` skips items with no `recipeId`. `menu-export.service.ts` name fallbacks (lines ~75, 157, 197, 248) become `recipe?.nameHebrew ?? item.unlinkedName ?? item.recipeId` — src/app/core/engine/event-plan.engine.ts, src/app/core/engine/event-plan.engine.spec.ts, src/app/core/utils/prep-sheet-groups.util.ts, src/app/core/utils/prep-sheet-groups.util.spec.ts, src/app/core/services/menu-export.service.ts
- [ ] A8: An unlinked dish on the menu is clearly marked and opens its builder on click — `menu-dish-row`: a branch between the linked row and the search box for `unlinkedName` set and `recipeId` empty. It shows a name button (aria-label `menu_dish_unlinked_build`), a `c-chip` with `menu_dish_unlinked`, and the existing remove button, plus a new output `buildUnlinked`. `menu-intelligence.page.html` binds it to `buildUnlinkedDish(sectionIndex, itemIndex)`. That method runs `pruneBlankMenuItems`; if the form is invalid it calls `markAllAsTouched`, shows `missingMenuFieldsMessage` and stops. Otherwise it runs `persist_()` inside `saving.withSaving` (a failure shows `error_saving_menu`, as `save()` does), then navigates to `/recipe-builder` with query `{ type: 'dish', name, fromMenu: editingId_(), section: <section _id> }` — src/app/pages/menu-intelligence/components/menu-dish-row/**, src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html
- [ ] A9: The dish builder starts with the menu's dish name and goes back to the menu after saving — `recipe-builder.page.ts`: on a new dish (`type=dish`, no recipe, no AI draft) patch `nameHebrew` from the `name` query param (trimmed, max 120). In `saveRecipe`, when `fromMenu` and `section` are set: load the menu with `MenuEventDataService.getMenuEventById`, apply `linkUnlinkedMenuItem(event, section, name, saved._id, saved type)`, then `MenuIntelligenceService.hydrateDerivedPortions` and `updateMenuEvent`. A failure shows `menu_link_dish_failed`. Either way, navigate to `/menu-intelligence/<fromMenu>` instead of `/recipe-book`. The P1 back-buttons follow the same rule. `linkUnlinkedMenuItem` sets `recipeId` and `recipeType` and removes `unlinkedName` on the first item in that section whose `unlinkedName` equals the name and whose `recipeId` is empty; it returns `null` when none is found (the builder then just navigates) — src/app/core/utils/menu-unlinked.util.ts, src/app/core/utils/menu-unlinked.util.spec.ts, src/app/pages/recipe-builder/recipe-builder.page.ts, src/app/pages/recipe-builder/recipe-builder.page.spec.ts
- [ ] A10: Add the Hebrew texts and the one browser check — append the five keys from UI/UX Notes to `dictionary.json`; write `e2e/ui/614-1.spec.ts` (prefilled dish name) — public/assets/data/dictionary.json, e2e/ui/614-1.spec.ts

## Technical Considerations
- Dependencies: `AiMenuModalComponent`/`AiMenuModalService`, `MenuLibraryPage`, `MenuIntelligencePage`,
  `MenuAiFlowService`, `MenuDishRowComponent`, `RecipeBuilderPage`, `DishDataService.allDishes_()`,
  `MenuEventDataService`, `MenuIntelligenceService.hydrateDerivedPortions`, the event-plan engine.
- New files needed: `src/app/core/utils/menu-unlinked.util.ts` (+ spec), `e2e/ui/614-1.spec.ts`.
- Model changes: `AiMenuDishDraft.matches?`, `MenuItemSelection.unlinkedName?`, and modal resolution values gain `'new'`.
- Backend / API: `POST /generate-menu` returns an optional `matches` array per named dish; nothing else changes.
- Auth and validation: no new route. The server drops unknown dish ids and clamps confidence. Zod caps `unlinkedName`
  at 120 characters.
- Security surface: user-typed `unlinkedName` is stored and rendered through Angular interpolation only (no
  `innerHTML`). The recipe book in the prompt is already marked "data only, never instructions".
- Data / migration: one optional field; old menus are unaffected; no migration (D56).
- Pricing cache: linking from the builder does not refresh the stored `pricing` cache. The menu page recomputes live
  on open, and the next menu save rewrites the cache.
- Project checks: log-query Done-when present; Reuse Check present; dictionary keys named; logical CSS; Lucide icons
  already registered (`check-circle`, `help-circle`, `circle-x`, `pencil`, `trash-2`).

## Out of Scope
- The AI edit-mode patch flow (`applyPatch`) and its empty `nameHebrew` snapshot of existing items.
- Adding an unlinked dish by hand on the menu page (without the AI).
- Counting unlinked dishes in the menu's cost warnings or partial-cost badge.
- Matching AI menu dishes to preparations.
- The export redesign of plan 471.

## Critical Questions
- Q: Which option is preselected? A: the top option when it is ≥ 70%, else "new dish (not connected)" (Human
  2026-11-16: "defaults ok").
- Q: Plan 471 (draft) also owns `menu-export.service.ts`; this plan only changes four name fallbacks there. Keep it in
  scope? A: yes, keep (Human 2026-11-16: "defaults ok").

## Execution Notes
