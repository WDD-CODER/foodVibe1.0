# Plan 770 — Menu from text or voice inside the app: sure matches only, menu-only sections until confirmed

Status: draft
Depends-on: 764, 768, 769
Track: code
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement
To send a customer an offer fast, the chef wants to type or say a plain list of dishes ("fish carpaccio with
tomato seeds, focaccia with spreads, beef bourguignon") and get a finished menu in the business's design, with its
PDF one tap away. Later the same engine answers WhatsApp (last stage, M7); this plan builds it inside the app only.

Dandan's rules (2026-11-27, map M4–M6):
- A dish links to the catalog only when the strongest match is 95% or above; otherwise the text stays exactly as
  written. No suggestions, no back and forth (the chef may rename a dish for this customer).
- The AI maps dishes to the closest existing section category. When none fits it may name a new section, but that
  name stays on this menu only (an unlinked section, like an unlinked dish) until the chef confirms it.
- The result is a plain menu, the same as one created by hand in the menu library — no client, no lead.

Program map: `docs/menu-design/menu-design-map.md` (contracts frozen 2026-11-27, extension E1).

Verified on `d34a0106` (2026-11-27):
- A hand-made menu: the editor POSTs `buildEventFromForm()` (`menu-intelligence.page.ts:929-968`) to the generic
  `menuEvents` route; the server builds the stored doc with `buildNewEventDoc` (`server/utils/event-create.js:36`,
  stage `inquiry`, first history entry, no notes) — the request approve route uses the same builder. Empty-form
  defaults: `servingType 'plated_course'`, `guestCount 50`, `eventDate` today, `eventType ''`
  (`menu-intelligence.page.ts:189-197`); names: `uniqueMenuName` / `dateMenuName` (`menu-form.util.ts:41-55`).
- Dish book: `loadDishBook(req)` in `server/routes/ai.js:967` (live `dishes` of the business, `_id, nameHebrew, course`, cap 300).
- Matcher: `src/app/core/utils/recipe-match.util.ts` (pure: `normalizeHebrew`, `scoreDishName`, `pickDishOptions`,
  `matchMenuDish`, `matchRecipeName`; `DISH_SURE = 0.95`); callers: `ai-menu-modal.component.ts`, `menu-ai-flow.service.ts`,
  `diag-menu.component.ts`, `stock-count.component.ts`, `metadata-manager.page.component.ts`, `list-controls.util.ts`,
  `product-name-match.util.ts`; spec `recipe-match.util.spec.ts`.
- Section categories: `taxonomyTerms` of kind `sectionCategory` (`MenuSectionCategoriesService`, `addCategory` through
  `KeyResolutionService.ensureKeyForContext(name, 'section_category')`); the editor's add path is
  `openAddCategoryModal` → `addAndSelectSectionCategory` (`menu-intelligence.page.ts:722-748`).
- AI sub-routers mount in `server/routes/ai.js:113-117`; `server/routes/ai/voice.js` is the pattern (lazy `aiLimiter`).
- The AI menu window: `src/app/shared/ai-menu-modal/` (modes `create` | `edit`, opened from `menu-library.page.ts:37`
  and the editor); the voice box: `app-voice-note` (`src/app/shared/voice-note/`, output `send` = `{ text, source, fileId }`).

## Contracts used (verbatim from the map)

### C-MODULE
- New module key `menu_design` in `MODULE_KEYS` (`shared/schemas/modules-pure.ts`). **Not** in `DEFAULT_MODULES`:
  a business without it sees menu intelligence exactly as today (D2). Only the platform admin switches it on (existing path).
- `MODULE_OF_TYPE.menuDesigns = ['menu_design']`.
- Menus are `menuEvents`, gated by `events`. Every menu-design screen and button shows only when the business has
  **both** `menu_design` and `events` (`ModuleService.has`). The designer page itself needs only `menu_design`.

### C-MENU-FIELDS (the part this plan uses)
- `designId?: string` — the design this menu wears; missing = the business default.
- `MenuSection.unlinkedName?: string` (max 60) — a menu-only section title (M4). When set, `name` is `''`.
  Confirming turns it into a category through the existing "add new category" path and clears `unlinkedName`.

### C-ENGINE — the boundary
`server/services/menu-engine/` is the only code WhatsApp and the outside API will call later:
- `exportMenuPdf({ businessId, eventId, actor }) → { fileId, url }` (plan 768).
- `menuFromText({ businessId, text, actor }) → { eventId, linked: string[], plain: string[] }` (plan 770).
It reaches the rest of FoodVibe only through `server/services/menu-engine/host.js`: resolve business + modules,
read dishes/categories, `callGemini` (which records AI usage, D28), `putPrivateFile` / delete file, create a menu
the way a hand-made one is created. Routes are thin callers.

### C-AI — feature keys and routes
- New keys in `server/constants/ai-features.js` (added in 764): `menu_design_variants`, `menu_design_refine`, `menu_from_text`.
- Routes live under `server/routes/ai/` (INV-6): `menu-design.js` (variants, refine — plan 766),
  `menu-from-text.js` (plan 770). Prompts are written in English. AI output is parsed with `menuDesignDraftSchema`;
  an invalid answer falls back to the base template, never a broken render (guideline 4).

### C-MATCH — dish and section matching for text menus (plan 770)
- The pure matcher (`scoreDishName`, Hebrew normalising) moves from `src/app/core/utils/recipe-match.util.ts` to
  `shared/schemas/menu-match/dish-match.ts` (map extension E1); the browser util re-exports it so every caller keeps working.
- Rule: the strongest name score ≥ 0.95 → link to that dish; otherwise `unlinkedName` = the text exactly as written.
  The AI's own match list never lowers the bar.
- Section: an existing category key when the AI names one that exists (exact or the matcher ≥ 0.95 on its label);
  otherwise `unlinkedName` (M4).

## Goals & Success Criteria
**Primary:** inside the app, a chef with the module types or records a list of dishes and gets a saved menu in the
default design: sure catalog dishes linked, everything else exactly as written, unknown sections kept on this menu
only until confirmed, and the PDF one tap away.

- [auto] `pnpm run test:server` passes, including the new `server/test/ai-menu-from-text.test.js` (Gemini stubbed through `fetch` as in `server/test/ai-menu.test.js`): a dish whose name scores ≥ 0.95 against a book dish is linked (`recipeId` set, name in `linked`); a dish scoring 0.94 stays `unlinkedName` exactly as typed (in `plain`), even when the AI listed it in `matches`; a section the AI names that is an existing `sectionCategory` gets that key; an unknown section gets `name: ''` and `unlinkedName`; text with no dishes → `400 { code: 'no_dishes' }` and no menu is created; empty text → `400 { code: 'empty' }`; text over 2000 characters → `400 { code: 'too_long' }`; a business without `menu_design` → `403 MODULE_OFF`; the created menu has stage `inquiry`, no `clientId`, the caller's `businessId` and `createdBy`, and one `aiUsage` row with feature `menu_from_text`.
- [auto] `pnpm run test:ci` passes, including `src/app/core/utils/recipe-match.util.spec.ts` unchanged and green through the re-export, and new cases in `src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts` (an unlinked section shows its `unlinkedName` and `[data-testid="section-confirm-category"]`; confirming calls `MenuSectionCategoriesService.addCategory` with that name, then the section's `name` is the new key and `unlinkedName` is empty; a section is never added to the category list without that click; saving keeps an unconfirmed section as `unlinkedName`) and `src/app/shared/ai-menu-modal/ai-menu-modal.component.spec.ts` (quick mode sends the text to `GeminiService.menuFromText`, shows the linked / plain line, "open menu" navigates to `/menu-intelligence/<eventId>`; `no_dishes` shows the example text).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `e2e/ui/770-1.spec.ts`: a QA business with `menu_design`, `events` and `ai_create` on · open `/menu-library`, choose the hero action "menu from text", paste `קרפצ'יו דג עם זרעי עגבניות, פוקאצ'ה עם ממרחים, בורגיניון בקר` and send (AI route stubbed with `page.route`) · the window shows the linked / plain line and `[data-testid="quick-menu-open"]`; pressing it opens `/menu-intelligence/<id>` with three dishes on the sheet. Screenshot saved.
- [human] with real AI: type a list mixing two dishes that exist in the catalog (one spelled exactly, one with a small change) and one new dish · only the exact one is linked, the other two stay as written · the sections are the business's own categories where they fit.
- [human] record the same list as a voice note · the same menu comes out.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (here: the quick window when the AI route fails keeps the typed text and offers "try again")
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal (here: the "this menu only" mark on an unlinked section)
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off (here: the "this menu only" tooltip on the first and the last section of a long menu)
- [human] a list with a section name the business doesn't have ("wedding starters") · the menu shows it, the category list doesn't have it, and after "add as category" it is in the list.

## Execution Mode
- Parallel: no — runs alone in wave 4 (`md-text`), after 764, 768 and 769 are merged.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/test/ai-known-metadata.test.js
server/test/modules-registry.test.js
server/test/price-list-prompt.test.js
src/app/core/services/async-storage.service.spec.ts
src/app/core/services/product-name-matcher.service.spec.ts
docs/workflow-kit/manifest.json
shared/schemas/menu-match/**
shared/schemas/menu-design/menu-name.ts
src/app/core/utils/recipe-match.util.ts
src/app/core/utils/recipe-match.util.spec.ts
src/app/pages/menu-intelligence/menu-form.util.ts
src/app/pages/menu-intelligence/menu-form.util.spec.ts
server/services/menu-engine/**
server/services/dish-book.js
server/routes/ai/menu-from-text.js
server/routes/ai.js
server/test/ai-menu-from-text.test.js
server/test/ai-menu.test.js
server/breadcrumbs.md
src/app/core/services/gemini.service.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/breadcrumbs.md
src/app/shared/ai-menu-modal/**
src/app/shared/breadcrumbs.md
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
public/assets/data/dictionary.json
src/app/app.config.ts
e2e/ui/770-1.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the route takes the business and the actor only from the verified token (`verifyToken`), never from the body; the menu is stamped through `buildNewEventDoc` like a hand-made one (`createdBy` = the caller); host reads go through `readScope` with that token's user.
- INV-2: preserves — dishes and section categories are read through `server/utils/business-scope.js` (`readScope`: the business's dishes; master ∪ own `sectionCategory` terms); nothing in the master catalog is written.
- INV-4: preserves — the matcher moves into `shared/schemas/` as a pure helper (no new entity shape); the menu the engine stores is checked against the existing `menuEvents` schema before it is inserted, the same schema the generic route uses.
- INV-5: preserves — an unconfirmed section name is menu text (`MenuSection.unlinkedName`), never a term; it becomes a `sectionCategory` term only through the existing add path when the chef confirms.
- INV-6: preserves — the one Gemini call goes through `server/routes/ai/menu-from-text.js` → `callGemini` on the server (feature `menu_from_text`); the browser only posts text.

## Reuse Check

- Dish matcher in the shared package (`shared/schemas/menu-match/dish-match.ts`) — family: helpers — rung: 3 — why: the existing `recipe-match.util.ts` code moved as is so the server applies the same score; the browser file re-exports it, every caller unchanged.
- Menu name rule in the shared package (`shared/schemas/menu-design/menu-name.ts`: `uniqueMenuName`, `dateMenuName`) — family: helpers — rung: 3 — why: moved from `menu-form.util.ts` so a server-made menu is named by the same rule; `menu-form.util.ts` re-exports them.
- Dish book reader (`server/services/dish-book.js`: `loadDishBook`) — family: helpers — rung: 3 — why: moved out of `routes/ai.js` unchanged (ai.js imports it) so the engine reads the same book.
- `menuFromText` and its host (`server/services/menu-engine/menu-from-text.js`, `host.js`) — family: none — rung: 4 — why: C-ENGINE's boundary; no engine for "text → stored menu" exists (the AI add-menu flow builds the menu in the browser).
- AI route (`server/routes/ai/menu-from-text.js`) — family: http — rung: 3 — why: a sub-router like `routes/ai/voice.js`, mounted in `ai.js`, same limiter and `respondFromGeminiFailure`.
- `GeminiService.menuFromText` — family: http — rung: 3 — why: one more AI client method through `API.ai(...)`, the same `withRetry` pattern as `extractStockCount`.
- Quick mode of the AI menu window — family: modal-shell — rung: 2 — why: a third mode (`'quick'`) of `app-ai-menu-modal` on the same `app-modal-shell`; no new popup.
- Voice input — family: voice-note — rung: 1 — why: `app-voice-note` as it is (`send` gives the transcript).
- Confirm an unlinked section — family: search-combobox — rung: 1 — why: the existing `openAddCategoryModal` → `MenuSectionCategoriesService.addCategory` path, prefilled with the section's name (Add-option rule).
- Unlinked mark on the section title — family: chip — rung: 1 — why: `c-chip c-chip--tag c-chip--amber c-chip--sm`, the same mark an unlinked dish uses.
- Module check — family: module-gate — rung: 1 — why: `HeroFabAction.module` and `requireModule` on the route.

## Adopt Check
- text → stored menu engine — verdict: skip — why: domain logic (our dish book, our categories, our menu record); nothing to adopt.

## Defaults

- loading-and-error-states — applies — how: the quick window shows `app-loader` while sending; an AI or server failure shows a readable message in the window with "try again", the typed text kept.
- house-keyboard-focus — applies — how: the window is `app-modal-shell` (Escape closes it, focus returns to the hero button); the confirm button on a section is a real button.
- hints-in-tooltips — applies — how: the "kept on this menu only" explanation on an unlinked section shows as the shared tooltip on its mark, not as text on the sheet.
- one-breakpoint-set — applies — how: any phone rule for the quick window or the section mark uses the shared `$break-*` names only.
- anchored-popup — applies — how: the unlinked-section tooltip is the app's shared tooltip box, placed by `placeInViewport` (src/app/core/utils/viewport-placement.util.ts).
- row-action-icons — exception — why: no list rows are added or changed; the section header keeps its existing trash button.
- unsaved-changes-on-leave — applies — how: `unlinkedName` is a control of the editor's existing `form_`, so the existing `useUnsavedChanges` + `pendingChangesGuard` ask before leaving; the quick window asks through `app-modal-shell` `hasChanges` like the other modes.
- empty-state-on-list — exception — why: no list is added; the menu library list is unchanged (one more hero action).
- unit-dropdown-add — exception — why: no unit dropdown is added or changed; the section confirm uses the existing add-category window.
- app-list-container — exception — why: no list page is added.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also check by symbol that the pieces from earlier plans exist on `main`: the `menu_from_text` feature key and
`MenuSection.unlinkedName` (764), `server/services/menu-engine/` with `exportMenuPdf` and `host.js` (768),
`MenuPdfService` and the designed sheet (769). A different name → use it and note it; a missing piece → STOP and escalate.

## User Stories
- As a chef, I want to type or say a list of dishes and get a finished menu in my design so that I can send an offer in seconds.
- As a chef, I want only the dishes that are surely mine linked to my catalog, and everything else kept as I wrote it, so that I can name a dish the way this customer likes without the app second-guessing me.
- As a chef, I want a section the AI invented to stay on this menu until I approve it so that my category list doesn't fill up with one-off names.

## Functional Requirements

### Must Have (P0)
- [ ] Move the matcher: `shared/schemas/menu-match/dish-match.ts` holds the pure code of `recipe-match.util.ts` (no Angular imports); `src/app/core/utils/recipe-match.util.ts` becomes `export * from '@schemas/menu-match/dish-match'`. Every caller and `recipe-match.util.spec.ts` stay unchanged and green. `pnpm run build:schemas` compiles it to `server/generated/schemas/menu-match/dish-match.js`.
- [ ] Move the menu name rule to `shared/schemas/menu-design/menu-name.ts`; `menu-form.util.ts` re-exports `uniqueMenuName` and `dateMenuName`.
- [ ] Move `loadDishBook` to `server/services/dish-book.js` (same filter, cap 300, takes a scope instead of `req`); `routes/ai.js` imports it.
- [ ] Host (`server/services/menu-engine/host.js`, C-ENGINE): `dishBook(ctx)`, `sectionCategories(ctx)` → `[{ key, label }]` (live master ∪ own `sectionCategory` terms; `label` = the Hebrew text the editor shows, read from `dictionary.json` the way the server already reads unit names for `unitVocabulary`), `liveMenuNames(ctx)`, `createMenu(ctx, body)` (validates against the `menuEvents` schema, then `buildNewEventDoc`, insert), `modules(ctx)`. `ctx = { businessId, actor }`; host builds `{ user: { businessId, userId } }` for `readScope`.
- [ ] Engine `menuFromText({ businessId, text, actor })` (`server/services/menu-engine/menu-from-text.js`):
  1. Prompt (English) to `callGemini` with feature `menu_from_text`: the text as data (never instructions), the business's section labels; asks for `{ title: string|null, sections: [{ category: string|null, newSectionName: string|null, dishes: [string] }] }` — every dish exactly as written, nothing added, no prices or portions.
  2. Parse with a Zod schema; an invalid answer → `502 { code: 'invalid_answer' }`, nothing stored.
  3. Sections: `category` equal to a label (or the matcher ≥ 0.95 on a label) → that key; else `name: ''`, `unlinkedName` = `newSectionName` or `category` (trimmed, max 60). Empty sections are dropped.
  4. Dishes: for each typed dish, `scoreDishName` against every book dish; the strongest ≥ 0.95 → `{ recipeId, recipeType: 'dish' }` and the name goes to `linked`; otherwise `{ recipeId: '', recipeType: 'dish', unlinkedName: <exactly as written> }` and the name goes to `plain`. Each item gets `derivedPortions: 0`, `portionsPerDiner: 1`.
  5. No dish at all → `400 { code: 'no_dishes' }`, nothing stored.
  6. The menu: `name` = `uniqueMenuName(title, liveMenuNames)` or `dateMenuName(liveMenuNames)`; `eventType ''`, `eventDate` today (business time zone as the editor uses), `servingType 'plated_course'`, `guestCount 50` (the editor's empty form), no `designId` (it wears the default), no client. Stored through `createMenu`. Returns `{ eventId, linked, plain }`.
- [ ] Route `POST /api/v1/ai/menu-from-text` (`server/routes/ai/menu-from-text.js`, mounted in `ai.js` beside `/voice`): `verifyToken`, `requireModule('events')`, `requireModule('menu_design')`, the AI limiter; body `{ text: string }` checked (trimmed, 1–2000 characters: `empty` / `too_long`); AI failures through `respondFromGeminiFailure`; logs carry codes and counts only, never the text.
- [ ] Browser: `GeminiService.menuFromText(text)` → `API.ai('menu-from-text')`.
- [ ] Quick mode in `app-ai-menu-modal` (`AiMenuModalService.open('quick')`, allowed when `menu_design` and `events` are on; the `ai_create` check stays for `create` / `edit`): a title "menu from text", `app-voice-note` (typed or recorded; its `send` posts the text), a sending state, then the result: "קושרו לקטלוג: … · נשארו כפי שנכתבו: …" and the button `[data-testid="quick-menu-open"]` that navigates to `/menu-intelligence/<eventId>` (where 769's export button is). `no_dishes` → the window shows `menu_from_text_example`, the text kept for editing.
- [ ] Entry point: a hero-FAB action "menu from text" on `/menu-library` (`module: 'menu_design'`, icon `file-text`).
- [ ] Editor — unlinked sections (M4): the section form group gets `unlinkedName`; `name` is required unless `unlinkedName` is set (`sectionNameValidators(unlinkedName)` in `menu-form.util.ts`, like `recipeIdValidators`); `loadEvent`, `addSection` and `buildEventFromForm` carry it (`name: ''` + `unlinkedName` when unconfirmed). The section title shows `unlinkedName` with the amber "this menu only" mark (tooltip: `menu_section_unlinked_hint`) and a button `[data-testid="section-confirm-category"]` "add as category" that opens the existing `openAddCategoryModal(sectionIndex, unlinkedName)`; on success the picked key is set and `unlinkedName` cleared. Picking any existing category from the section search also clears it. Nothing is added to the category list without that click.

### Should Have (P1)
- [ ] The quick window keeps the last typed text if it is closed and reopened in the same session (in memory only).

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: not triggered — no page or route is added; the quick window is a mode of the existing AI menu window and the editor's frame is unchanged.
- Behaviour: house-keyboard-focus (the window), hints-in-tooltips (the unlinked mark); no drag, no new scroll area, no animation.
- Hebrew canonical values: a confirmed section goes through `KeyResolutionService.ensureKeyForContext(name, 'section_category')` (the existing `addCategory`), so the Hebrew name is resolved to its key or the translation-key modal opens — `docs/agent/standards-domain.md` Add-option rule and Hebrew canonical values guidance.
- RTL: dish and section names keep the language they were typed in; the result line uses `dir="auto"` per name.
- New `dictionary.json` keys: `menu_from_text_open` ("תפריט מטקסט"), `menu_from_text_title` ("תפריט מטקסט או מהקלטה"), `menu_from_text_placeholder` ("כתבו או הקליטו את המנות, למשל: קרפצ'יו דג, פוקאצ'ה עם ממרחים, בורגיניון בקר"), `menu_from_text_send` ("צור תפריט"), `menu_from_text_busy` ("בונה תפריט…"), `menu_from_text_linked` ("קושרו לקטלוג"), `menu_from_text_plain` ("נשארו כפי שנכתבו"), `menu_from_text_open_menu` ("פתיחת התפריט"), `menu_from_text_example` ("לא מצאנו מנות בטקסט. נסו כך: קרפצ'יו דג, פוקאצ'ה עם ממרחים, בורגיניון בקר"), `menu_from_text_failed` ("לא הצלחנו לבנות תפריט, נסו שוב"), `menu_section_unlinked` ("בתפריט הזה בלבד"), `menu_section_unlinked_hint` ("השם נשמר רק בתפריט הזה. הוסיפו אותו כקטגוריה כדי שיופיע ברשימה."), `menu_section_confirm_category` ("הוספה כקטגוריה").
- Icon `file-text` registered in `src/app/app.config.ts` if not already.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the dish-name matcher into the shared package so the server scores dishes exactly like the browser — code moved as is, browser util re-exports, existing spec green — shared/schemas/menu-match/dish-match.ts, src/app/core/utils/recipe-match.util.ts
- [ ] A2: Move the menu naming rule and the dish book reader where the server engine can use them — uniqueMenuName/dateMenuName to the shared package with re-export; loadDishBook to its own service imported by ai.js — shared/schemas/menu-design/menu-name.ts, src/app/pages/menu-intelligence/menu-form.util.ts, server/services/dish-book.js, server/routes/ai.js
- [ ] A3: Build the engine's door to the rest of the app — host.js: dish book, section categories with labels, live menu names, create a menu like a hand-made one, modules — server/services/menu-engine/host.js
- [ ] A4: Turn a plain list of dishes into a stored menu with sure links only and menu-only sections — menuFromText: English prompt, answer schema, 0.95 rule, section mapping, naming, no_dishes — server/services/menu-engine/menu-from-text.js
- [ ] A5: Open the engine to the app through one AI route that checks the modules and the text — POST /api/v1/ai/menu-from-text mounted beside /voice — server/routes/ai/menu-from-text.js, server/routes/ai.js
- [ ] A6: Prove the 95% rule, the sections and the refusals on the server — stubbed Gemini cases from Done-when — server/test/ai-menu-from-text.test.js
- [ ] A7: Let the chef type or record the dish list in the AI menu window and open the new menu — GeminiService.menuFromText, quick mode with app-voice-note, result line, open button, hero action on the menu library — src/app/core/services/gemini.service.ts, src/app/shared/ai-menu-modal/, src/app/pages/menu-library/menu-library.page.ts
- [ ] A8: Show menu-only sections on the sheet and let the chef turn one into a real category with one click — unlinkedName in the section form, validator, mark + tooltip, confirm through the existing add path — src/app/pages/menu-intelligence/menu-form.util.ts, src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/_paper-ui.scss
- [ ] A9: Add the Hebrew texts and the icon — dictionary keys from UI/UX Notes, file-text icon — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A10: Prove the window and the section confirm in specs and one browser check — modal spec, page spec, e2e with the AI route stubbed — src/app/shared/ai-menu-modal/ai-menu-modal.component.spec.ts, src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts, e2e/ui/770-1.spec.ts
- [ ] A11: Update the folder maps for the moved matcher, the engine files, the route and the quick mode — server/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/shared/breadcrumbs.md

## Technical Considerations
- Dependencies: plan 764 (`menu_from_text` key, `unlinkedName` on sections, `menu_design` module, `shared/schemas/menu-design/`), plan 768 (`server/services/menu-engine/` and its `host.js` — this plan adds functions to the same host), plan 769 (the designed sheet and the export button the new menu opens on).
- New files needed: `shared/schemas/menu-match/dish-match.ts`, `shared/schemas/menu-design/menu-name.ts`, `server/services/dish-book.js`, `server/services/menu-engine/menu-from-text.js`, `server/routes/ai/menu-from-text.js`, `server/test/ai-menu-from-text.test.js`, `e2e/ui/770-1.spec.ts`.
- Model changes: none new (`unlinkedName` on `MenuSection` comes from 764); `AiMenuModalMode` gains `'quick'`.
- Backend / API: `POST /api/v1/ai/menu-from-text` → `{ eventId, linked: string[], plain: string[] }` | `400 { code: 'empty' | 'too_long' | 'no_dishes' }` | `403 MODULE_OFF` | `502 { code: 'invalid_answer' }` | the existing AI failure codes. Document it in `server/breadcrumbs.md`.
- Auth and validation: signed-in member (owner or staff: staff may create menus today); `events` and `menu_design` modules; the body is one string; the business comes from the token only.
- Security surface: user text goes into a prompt — it is passed as data inside a clearly marked block and the answer is schema-checked; names are stored as text and the template HTML-escapes them (C-TEMPLATE). The text is never logged.
- Data / migration: none — new menus only; existing menus have no `unlinkedName` on sections and behave as today.
- Project checks: log-query item present; `[ui]` spec `e2e/ui/770-1.spec.ts` with `signInQa`; Hebrew through `translatePipe`; Add-option rule and Hebrew canonical values (confirm path); breadcrumbs listed; `dictionary.json` append-only.

## Out of Scope
- WhatsApp: sender phones, routing, voice notes from WhatsApp, reply corrections (last stage, M7).
- The outside API and setup page (B5, last stage).
- Changing the existing AI add-menu `create` / `edit` modes and their 0.70 / 0.95 suggestion rules.
- Choosing a design by name in the text (D20) — in the app the chef switches the design on the sheet (plan 769); the WhatsApp stage adds it.
- Prices, descriptions, guests or dates from the text.

## Critical Questions
- Q: Does quick mode also need the ai_create module? A: no — menu_design and events only, Dandan 2026-11-27

## Execution Notes
- behaviour: the dish book is not sent to the AI; dishes are matched on the server by name only, so the AI's guesses can never link a dish below 95% (C-MATCH) and the prompt stays small.
- behaviour: a text menu is created with the editor's empty-form defaults (plated, 50 guests, today) and stage `inquiry`, exactly like a hand-made menu (M6); its cost cache is filled the first time the chef saves it in the editor.
- behaviour: quick mode needs `menu_design` and `events`, not `ai_create` (the menu-design module is the paying feature for this flow).
- behaviour: the result is shown in the window with an "open menu" button instead of jumping straight to the editor, so the chef reads which dishes stayed as written.
