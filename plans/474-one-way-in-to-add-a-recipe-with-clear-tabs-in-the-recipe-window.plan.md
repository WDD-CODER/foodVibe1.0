# Plan 474 — One way in to add a recipe, with clear tabs in the recipe window

Status: draft
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
The Human asked what «הדבק מתכון» adds next to «הוסף מתכון עם AI» (handoff `docs/mvp/review-handoff-2026-10-21.md`
E1, decision D7, answered): remove the separate «הדבק מתכון» entry. The user chooses how to add a recipe inside the
one recipe window, whose tabs must say clearly what each does: describe a new recipe / paste your own recipe / from
a photo / from a link. The paste tab states in one line that the text is kept as written, without AI invention.

Verified in code on `feb9f3da`:
- The only «הדבק מתכון» entry point is the recipe book's flame («+») menu: `recipe-book-list.component.ts:440-460`
  sets two page actions — `add_recipe_ai` («הוסף מתכון עם AI», icon `sparkles`, `aiRecipeModal.open()`) and
  `paste_recipe` («הדבק מתכון», icon `clipboard-paste`, `aiRecipeModal.open('create', undefined, undefined, 'paste')`).
  No other code opens the window on the paste tab (`grep "'paste'"` in `src/app`: only the modal itself and these lines).
  The recipe builder opens the window only in edit mode (`recipe-ai-flow.service.ts:66`).
  The `clipboard-paste` icon in `recipe-ingredients-table.component.html:205` is «הדבק מצרכים» (ingredients), not this entry — it stays.
- The window already has the four modes (`ai-recipe-modal.service.ts:9`
  `AiModalInputMode = 'text' | 'image' | 'url' | 'paste'`). Its tabs are **icon-only buttons** with the name only in a
  `title` tooltip (`ai-recipe-modal.component.html:121-159`: `type` / `camera` / `link` / `clipboard-paste`, titles
  `ai_recipe_input_text_mode` «הזן טקסט», `ai_recipe_input_image_mode` «העלה תמונה», `ai_recipe_input_url_mode`
  «הזן קישור», `paste_recipe` «הדבק מתכון»). On a phone there is no tooltip, so the four icons say nothing.
- The paste tab sends the text to `POST /api/v1/ai/parse-text` (`ai-recipe-modal.component.ts:155-178`;
  `server/routes/ai.js:402`, `TEXT_IMPORT_SYSTEM_PROMPT` = extraction only) and skips few-shot saving
  (`saveShot_`, `:181-184`): the chef's own text is structured, not rewritten. Nothing in the tab says so; only the
  placeholder differs (`paste_recipe_placeholder`).
- Tab styles: `.ai-input-mode-tabs` / `.ai-tab-btn` (`ai-recipe-modal.component.scss:262-300`, fixed `width: 2.25rem`).
  The shared pill engine `.c-tab-pill` exists in `src/styles.scss:1001-1053` (used by `tab-chips`, `prep-sheets`).

## Goals & Success Criteria
- Primary: one entry adds a recipe; inside the window each way in has a readable name, and the paste way says it keeps the chef's text.
- Success:
  - [ ] [auto] `npx ng test --watch=false --include='src/app/shared/ai-recipe-modal/**/*.spec.ts' --include='src/app/pages/recipe-book/components/recipe-book-list/**/*.spec.ts'` passes, including new specs: the recipe book sets exactly one recipe-window page action (`add_recipe_ai`) and none with `paste_recipe`; the create window shows four tabs with visible text in the order describe / paste / photo / link; the paste tab shows the `ai_recipe_paste_hint` line and the describe tab does not; the active tab has `aria-selected="true"`.
  - [ ] [auto] `grep -rn "'paste_recipe'" src/app --include=*.ts --exclude=*.spec.ts` → no entries (the menu entry is gone).
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Replay E1: open `/recipe-book`, open the flame («+») menu. There is «הוסף מתכון עם AI» and no «הדבק מתכון».
  - [ ] [human] Choose «הוסף מתכון עם AI»: the window shows four labelled tabs — «תיאור מתכון חדש», «הדבקת מתכון שלי», «מתמונה», «מקישור» — with «תיאור מתכון חדש» selected. Tap «הדבקת מתכון שלי»: one line under the tabs says the recipe is kept as written and the AI only sorts it into fields. Paste a short recipe and press «זהה מתכון»: the draft shows your own name, ingredients and steps.
  - [ ] [human] On a phone (375px) the four tabs are readable (no cut words) and fit without sideways scrolling of the window.

## Execution Mode
- Parallel: no — writes `ai-recipe-modal.component.html` / `.ts` (plan 460 adds auto-grow to the same textarea) and `recipe-book-list.component.ts` (plan 476 changes the row click in the same file).
- Concurrent plans: 460 (same modal template and class), 476 (same recipe book list class: 474 edits `ngOnInit`, 476 edits `onEditRecipe` — different methods, keep both). Run after 460; 474 and 476 run one after the other.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/474.md`.
- Depends on: plan 460 merged (soft — same template; build on its textarea change).
- Dictionary keys are append-only: `paste_recipe`, `ai_recipe_input_text_mode`, `ai_recipe_input_image_mode`, `ai_recipe_input_url_mode` stay in the file even when unused.
- The service keeps its `inputMode` parameter (`open(..., inputMode)`): harmless, and the cheapest way back if a direct paste entry is ever wanted again.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.scss
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts
docs/mvp/runs/474.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — the AI recipe window's files match `src/app/**/*ai*`, but only its tab markup, labels and one hint line change; every call still goes through `GeminiService` to `server/routes/ai.js` (`parse-text`, generate, image, url) exactly as today, and no AI call is added or changed.

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find on `origin/mvp`: the `paste_recipe` page action in
`ngOnInit` of `recipe-book-list.component.ts`; `.ai-input-mode-tabs` / `ai-tab-btn` in `ai-recipe-modal.component.html`
and `.scss`; `inputMode_` and the constructor effect reading `initialInputMode` in `ai-recipe-modal.component.ts`.
Print `ok` or `conflict: <what>` per symbol. If plan 460 merged, its textarea change is in the same block — keep it.

## User Stories
- As a chef, I want one button to add a recipe and then choose how (describe, paste, photo, link) so that I do not have to guess which menu entry does what.
- As a chef pasting my own recipe, I want to be told it is kept as I wrote it so that I trust the AI did not change my recipe.

## Functional Requirements

### Must Have (P0)
- [ ] The recipe book flame menu has no «הדבק מתכון» entry; «הוסף מתכון עם AI» stays and opens the window on the describe tab.
- [ ] The create window's tabs show an icon and a visible text label, in this order: describe a new recipe (`text`), paste your own recipe (`paste`), from a photo (`image`), from a link (`url`).
- [ ] When the paste tab is active, one line under the tabs says the text is kept as written and only sorted into fields.
- [ ] Tabs are a proper tab list for keyboard and screen readers (`role="tablist"`, each `role="tab"` with `aria-selected`); the existing behaviour of each mode (inputs, buttons, errors, quota bar) is unchanged.

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- RTL; logical CSS only; `translatePipe` for all texts; Lucide icons already registered (`type`, `clipboard-paste`, `camera`, `link`).
- Tabs reuse the shared `.c-tab-pill` engine (with `.active`), replacing the page-local `.ai-tab-btn` look; the row
  wraps on narrow screens (`flex-wrap: wrap`, gap `var(--space-2)`), so on a 375px phone it becomes two rows of two.
  Remove the now-unused `.ai-tab-btn` rules (they hold a physical `width`/`height`).
- The paste hint is a muted one-line text (`--color-text-muted`, small font) directly under the tab row, only on the paste tab.
- New dictionary keys (append at the end of `dictionary.json`):
  - `ai_recipe_tab_describe` «תיאור מתכון חדש»
  - `ai_recipe_tab_paste` «הדבקת מתכון שלי»
  - `ai_recipe_tab_image` «מתמונה»
  - `ai_recipe_tab_url` «מקישור»
  - `ai_recipe_paste_hint` «המתכון נשמר כמו שכתבת – ה-AI רק מסדר אותו לשדות, בלי להמציא»
- Existing keys reused: `add_recipe_ai`, `ai_recipe_modal_title`, `paste_recipe_placeholder`, `paste_recipe_parse`, `ai_recipe_generate`.
- Not a dropdown, so the add-option rule does not apply.

## Atomic Sub-tasks
- [ ] T1: Remove the separate paste entry from the recipe book menu — delete the `paste_recipe` page action from `ngOnInit`, keep `add_recipe_ai`; spec: `setPageActions` gets one action with `add_recipe_ai` and none with `paste_recipe` — `recipe-book-list.component.ts`, `recipe-book-list.component.spec.ts`
- [ ] T2: Give the window's four tabs visible names in the agreed order — rebuild the tab row as a `role="tablist"` of four `c-tab-pill` buttons (`role="tab"`, `[class.active]`, `[attr.aria-selected]`), icon plus text from the new keys, order describe / paste / photo / link; drop the `title` tooltips — `ai-recipe-modal.component.html`, `public/assets/data/dictionary.json`
- [ ] T3: Say on the paste tab that the recipe is kept as written — `@if` the paste mode is active, one muted line `ai_recipe_paste_hint` under the tab row — `ai-recipe-modal.component.html`, `public/assets/data/dictionary.json`
- [ ] T4: Restyle the tab row for phones — the row wraps with a gap; remove the unused `.ai-tab-btn` rules; add the hint line's small local class; logical properties only — `ai-recipe-modal.component.scss`
- [ ] T5: Tidy the window class comment that names the removed entry — the constructor comment «Opening the window from "הדבק מתכון"…» now says the window opens on the tab the caller asks for (default describe); no logic change — `ai-recipe-modal.component.ts`
- [ ] T6: Spec the tabs — four tabs with text in order; clicking each sets the mode; paste shows the hint and describe does not; `aria-selected` follows the active tab; keep the existing paste and parse specs green — `ai-recipe-modal.component.spec.ts`
- [ ] T7: Build, run the specs, check at 375px and 1280px, write the run file with the validation cards — `docs/mvp/runs/474.md`

## Technical Considerations
- Dependencies: `HeroFabService.setPageActions`, `AiRecipeModalService.open`, `.c-tab-pill` (`src/styles.scss:1001`).
- New files: none.
- Model changes: none.
- Backend / API: none; the paste tab still posts to `parse-text`.
- Security surface: none.
- The `$any(...)` casts already in this template are untouched (not new code).
- Project checks: log-query [auto]; chef-side stories; five new dictionary keys listed; no server change.

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- «הדבק מצרכים» in the recipe builder (ingredients paste) and its matcher — plan 463.
- The paste textarea growing with its text — plan 460.
- Renaming «הוסף מתכון עם AI» or the window title (see Critical Questions).
- Deleting any dictionary key.

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. **Rename the menu entry and window title now that the window also takes a pasted recipe?** Recommended: **no, keep «הוסף מתכון עם AI» / «יצירת מתכון עם AI»** — the paste tab also uses the AI (to sort the text into fields), and the Human called it "the AI recipe window". Alternative: append new keys «הוסף מתכון» / «הוספת מתכון» and switch the menu entry and title to them (two lines more).
