# Plan 439 — Paste a recipe or a list of ingredients, with red "not ready" rows

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 02.1 (lean entry). Chefs keep their recipes in WhatsApp, notes and Word. Getting one into FoodVibe today
means typing every ingredient row by hand, or describing the recipe to the AI and hoping it invents the same
thing. The server already has the right tool — `POST /api/v1/ai/parse-text` (`server/routes/ai.js:400`, returns
`{ type, confidence, data: { nameHebrew, serving_portions, labels[], ingredients[{ nameHebrew, amount_net, unit }],
steps[{ order, instruction }] } }`) and the client wrapper `GeminiService.parseText()` (`gemini.service.ts:117`) —
but nothing calls them.

Two entry points (Dandan, 2026-10-20):
1. **"הדבק מתכון"** — a second action in the recipe book's floating button, next to "מתכון ב-AI"
   (`RecipeBookListComponent.ngOnInit`, `recipe-book-list.component.ts` ~L435). The chef pastes the text; it goes
   through `parse-text` and then down the **same path** as the AI recipe: editable draft in the AI modal →
   `AiRecipeDraftService.set(draft)` → `/recipe-builder` → `RecipeAiFlowService.applyPendingDraft()`.
2. **"הדבק מצרכים"** — a button in the recipe builder's ingredients table. One ingredient per line
   ("2 ק"ג עגבניות"); each line becomes a row in the open recipe, linked to an existing product when the name
   matches. A line that cannot be read is **never dropped**: it becomes an unlinked row holding the original text.
   This is a local, deterministic parser — no AI call, no quota.

Unlinked rows (from AI, paste, or typing) must be **red** with the label "לא מוכן"; clicking still opens the
create/edit product flow (existing `onUnlinkedBadgeClick`). Today they are dashed blue (`.unlinked-row`,
`recipe-ingredients-table.component.scss:273`). Two gaps block "a recipe with unready rows saves":
- `ingredientRowValidator` (`recipe-form.service.ts` L33) rejects a named row without an amount, so an unparsed
  line ("קצת פטרוזיליה") would make the whole form invalid;
- the save serializer (`recipe-form.service.ts` ~L190) drops unlinked rows whose amount is 0 — the text would be lost.

Also: the AI draft path silently turns an unknown unit into `'unit'` (`recipe-ai-flow.service.ts` `prefillFromDraft`,
`safeUnit`) and keeps the product link, so a wrong amount looks ready. Spec: "unknown unit → saved as text, לא מוכן".

## Goals & Success Criteria
- Primary: pasting a full recipe gives an editable draft that opens in the builder and saves.
- Primary: pasting ingredient lines adds one row per line; unreadable lines are kept as red "לא מוכן" rows with
  their original text, and the recipe still saves.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/utils/ingredient-line-parser.util.spec.ts' --include='src/app/core/utils/parsed-result-draft.util.spec.ts' --include='src/app/core/utils/ingredient-match.util.spec.ts' --include='src/app/pages/recipe-builder/**' --include='src/app/shared/ai-recipe-modal/**'`
  passes, including the new specs:
  - parser (unit resolver knows `kg` for `ק"ג`, `gram` for `גרם`, `cup` for `כוס`):
    `parseIngredientLines('2 ק"ג עגבניות\n200 גרם מלח\nקצת פטרוזיליה')` →
    `[{ kind: 'parsed', amount: 2, unit: 'kg', name: 'עגבניות' }, { kind: 'parsed', amount: 200, unit: 'gram', name: 'מלח' }, { kind: 'text', text: 'קצת פטרוזיליה' }]`;
    `'1.5 ליטר חלב'` → 1.5 / `liter`; `'½ כוס סוכר'` → 0.5 / `cup`; `'2,5 ק״ג קמח'` (gershayim, comma decimal)
    → 2.5 / `kg`; `'3 ביצים'` → 3 / `unit` / `ביצים`; `'2 קופסאות שימורים'` → 2 / `unit` / `קופסאות שימורים`;
    blank lines skipped; `'   '` → `[]`;
  - table: with products "עגבניות" and "מלח" in state, pasting the three lines above adds 3 rows — rows 1-2 have
    `referenceId` set, row 3 has `nameHebrew === 'קצת פטרוזיליה'`, no `referenceId`, and `isUnlinkedRow()` true;
    an existing empty trailing row is replaced, not kept;
  - recipe form: an unlinked row with a name and no amount passes `ingredientRowValidator`; the save payload
    keeps it (`amount: 0`, `nameSnapshot: 'קצת פטרוזיליה'`, no `referenceId`); a linked row without an amount
    still fails;
  - draft mapping: a `parse-text` result with name, 2 ingredients and 2 steps → draft with the same name,
    ingredients `{ name, amount, unit }` and steps as strings; a result with no ingredients and no steps → `null`;
  - AI prefill: a draft ingredient whose unit is not a known unit → row has no `referenceId` and its name keeps
    the unit text (`'עגבניות (קופסה)'`).
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop: `/recipe-book` → floating button → «הדבק מתכון» → paste a full recipe (name, 4 ingredients,
  3 steps) → «זהה מתכון». The editable draft shows the name, ingredients and steps; change one amount → «פתח בבונה
  המתכון» → the builder opens filled in, with the changed amount → «שמור» → the recipe is in the recipe book.
- [human] Mobile: same flow on a phone — the paste box, the draft and the builder are usable without sideways scrolling.
- [human] Desktop: «הדבק מתכון» → paste "שלום מה נשמע" → the modal shows "לא זוהה מתכון בטקסט" and no draft opens.
- [human] Desktop: open any recipe in the builder → «הדבק מצרכים» → paste
  `2 ק"ג עגבניות` / `200 גרם מלח` / `קצת פטרוזיליה` (three lines) → «הוסף». Three rows appear; the tomato and salt
  rows are linked (if those products exist); the third row is red, reads "קצת פטרוזיליה" and shows "לא מוכן".
  Click "לא מוכן" → the create-product window opens with that name. «שמור» on the recipe → confirm "save anyway"
  → it saves, and reopening the recipe still shows the red row with its text.
- [human] Mobile: «הדבק מצרכים» on a phone — the paste window fits the screen, the red rows and "לא מוכן" are readable.

## Execution Mode
- Parallel: no against 428 (`recipe-book-list.component.ts`; it also edits `recipe-builder.page.*`), 432
  (`server/routes/ai.js` / `gemini.service.ts` — this plan relies on `parse-text` as it is; both add icons to
  `app.config.ts`), 436 (`recipe-form.service.ts` + spec) and 423 (`recipe-ingredients-table.component.ts` + spec;
  already ordered before this plan via 438). Yes against the rest (`dictionary.json` is append-only).
- Concurrent plans: any; lane wt-3 order is 438 → 439 → 440.
- Isolated DB: no — no stored data is reshaped.

## Execution Notes
- Depends on: plan 438 merged (same lane; 438 changes the product rules the unlinked-row click opens).
- Must not run at the same time as: 428 (`recipe-book-list.component.ts`, `recipe-builder.page.*`), 432
  (`server/routes/ai.js`, `gemini.service.ts`, `app.config.ts`), 436 (`recipe-form.service.ts`), 423
  (`recipe-ingredients-table.component.ts`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps (incl. 'go 0007' / 'go 0008') are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- `recipe-builder.page.ts` is growth-frozen and is **not** edited: the paste button and its dialog live inside the
  ingredients table component and a new child component.
- INV-6: the only AI call is `GeminiService.parseText()` → `POST /api/v1/ai/parse-text`. Pasted recipes are not
  saved as few-shot examples (no `saveShot` in paste mode).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/ingredient-line-parser.util.ts
src/app/core/utils/ingredient-line-parser.util.spec.ts
src/app/core/utils/parsed-result-draft.util.ts
src/app/core/utils/parsed-result-draft.util.spec.ts
src/app/core/utils/ingredient-match.util.ts
src/app/core/utils/ingredient-match.util.spec.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.html
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.scss
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.service.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts
src/app/pages/recipe-builder/services/recipe-ai-flow.service.spec.ts
src/app/pages/recipe-builder/services/recipe-form.service.ts
src/app/pages/recipe-builder/services/recipe-form.service.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/paste-ingredients-dialog/**
public/assets/data/dictionary.json
src/app/app.config.ts
src/testing/test-lucide-icons.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — "הדבק מתכון" calls `GeminiService.parseText()`, which posts to `/api/v1/ai/parse-text` in
  `server/routes/ai.js` (JWT + `aiLimiter`); the browser holds no key. "הדבק מצרכים" makes no AI call at all.
  `ai-recipe-modal.*` and `recipe-ai-flow.service.ts` (matched by `src/app/**/*ai*`) only gain a paste tab and a
  unit check.
- INV-4: preserves — no schema change; an unlinked ingredient `{ _id, amount: 0, unit, nameSnapshot }` is already
  valid under `ingredientSchema` (`referenceId`/`type` optional) and the server keeps validating every recipe write.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `parseText` in
`gemini.service.ts`; `POST /parse-text` + `TEXT_IMPORT_SYSTEM_PROMPT` in `server/routes/ai.js`; `ngOnInit`
`setPageActions` in `recipe-book-list.component.ts`; `InputMode`, `onGenerate`, `resolveErrorKey_`,
`navigateToBuilder_`, `onDraftApproved` in `ai-recipe-modal.component.ts`; `open` in `ai-recipe-modal.service.ts`;
`prefillFromDraft`, `findIngredientMatch_` in `recipe-ai-flow.service.ts`; `ingredientRowValidator`,
`createIngredientGroup` and the ingredients filter in the save serializer of `recipe-form.service.ts`;
`isUnlinkedRow`, `onUnlinkedBadgeClick` in `recipe-ingredients-table.component.ts`; `.unlinked-row` /
`.unlinked-badge` in its `.scss`. Print `ok` / `conflict: <what>` per symbol.

## User Stories
- As a chef, I want to paste a recipe I wrote in WhatsApp so that I don't have to type it again.
- As a chef, I want to paste a list of ingredients into an open recipe so that rows are added in one go.
- As a chef, I want lines the app could not understand to stay in the recipe in red so that nothing I pasted is
  lost and I can see what still needs fixing.
- As a chef, I want to save a recipe even when some rows are not ready so that I can finish it later.

## Functional Requirements

### Must Have (P0)
- [ ] FAB action «הדבק מתכון» on `/recipe-book`, next to «מתכון ב-AI», opens the AI modal on a "paste" tab.
- [ ] Paste tab: textarea + «זהה מתכון» → `parseText` → draft (editable in the existing draft editor) → same
  approve → builder → save path. Empty / unrecognized result → "לא זוהה מתכון בטקסט", no draft. Errors (quota,
  network, invalid response) use the existing `resolveErrorKey_` messages.
- [ ] «הדבק מצרכים» button in the ingredients table → paste window → one row per non-empty line; parsed lines
  linked when the name matches a product or recipe exactly (same rule as the AI path); unparsed lines added as
  unlinked rows with the original text; nothing dropped.
- [ ] Unlinked rows red with "לא מוכן" on the badge; click keeps today's create/link behavior.
- [ ] A recipe with unlinked rows (with or without an amount) saves after the existing "save anyway" confirm and
  keeps those rows.
- [ ] AI draft ingredient with an unknown unit → unlinked row, name keeps the unit text.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- Paste tab: fourth tab in the AI modal's tab row (`ai-tab-btn`), label «הדבק מתכון», icon `clipboard-paste`;
  a `textarea` (same styling as the text tab) with placeholder; the generate button reads «זהה מתכון» in this tab.
- Paste ingredients: a ghost button with icon `clipboard-paste` under the table, next to the existing «הוסף שורה»
  area but inside the table component (`recipe-ingredients-table.component.html`, after the rows loop; hidden in
  history view the same way the rows are read-only). The window reuses the `.c-modal-overlay` / `.c-modal-card` /
  `.c-modal-body` / `.c-modal-actions` engine classes (as `add-item-modal` does); textarea `dir="rtl"`,
  hint "שורה אחת לכל מצרך, למשל: 2 ק"ג עגבניות".
- Red rows: `.unlinked-row` border `1px solid var(--color-danger)`, background
  `color-mix(in srgb, var(--color-danger) 6%, var(--bg-muted))`; `.unlinked-badge` color `var(--color-danger)` and
  a text label `{{ 'ingredient_not_ready' | translatePipe }}` beside the link icon. Logical properties only.
- New dictionary keys (append to `general`):
  - `"paste_recipe": "הדבק מתכון"`
  - `"paste_recipe_placeholder": "הדבק כאן את טקסט המתכון — שם, מצרכים ושלבים"`
  - `"paste_recipe_parse": "זהה מתכון"`
  - `"paste_recipe_not_recognized": "לא זוהה מתכון בטקסט"`
  - `"paste_ingredients": "הדבק מצרכים"`
  - `"paste_ingredients_hint": "שורה אחת לכל מצרך, למשל: 2 ק\"ג עגבניות"`
  - `"paste_ingredients_add": "הוסף"`
  - `"ingredient_not_ready": "לא מוכן"`
- New Lucide icon: `ClipboardPaste` (`clipboard-paste`) — import + `LucideAngularModule.pick` in `app.config.ts`.

## Atomic Sub-tasks
- [x] P1: Read pasted ingredient lines into amount, unit and name, keeping unreadable lines as text — pure parseIngredientLines(text, resolveUnit) → ParsedLine[] (`{ kind: 'parsed', amount, unit, name } | { kind: 'text', text }`); number forms int, decimal with . or , , a/b, ½ ¼ ¾; normalizes ״ and ′ quotes; first token a unit → that unit, else unit 'unit' and the whole rest is the name; no number → text; spec with the Done-when cases — src/app/core/utils/ingredient-line-parser.util.ts, ingredient-line-parser.util.spec.ts
- [x] P2: Share one exact-name matcher for products and recipes — move findIngredientMatch_ out of RecipeAiFlowService into findIngredientMatch(name, products, recipes); RecipeAiFlowService calls it; spec — src/app/core/utils/ingredient-match.util.ts, ingredient-match.util.spec.ts, src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts
- [x] P3: Turn a parse-text result into the same draft the AI recipe uses — parsedResultToDraft(result): AiRecipeDraft | null; recipe_type 'dish' when type is 'dish' else 'preparation'; yield_amount = serving_portions ?? 1, yield_unit 'portion'; ingredients map nameHebrew/amount_net ?? 0/unit ?? 'unit'; steps sorted by order → instruction; null when name, ingredients and steps are all empty or when both lists are empty; spec — src/app/core/utils/parsed-result-draft.util.ts, parsed-result-draft.util.spec.ts
- [x] P4: Add a "paste recipe" tab to the AI recipe window that goes through the server parser — InputMode gains 'paste'; AiRecipeModalService.open(mode, currentRecipe?, onPatch?, inputMode = 'text') stores initialInputMode_; the component sets inputMode_ from it when isOpen turns true (effect); onParsePasted(): firstValueFrom(gemini.parseText(prompt_())) → parsedResultToDraft → draft_ or errorKey_ 'paste_recipe_not_recognized'; skip saveShot when inputMode_ is 'paste'; tab, textarea, button label; spec — src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts/.html/.scss/.spec.ts, ai-recipe-modal.service.ts
- [x] P5: Put "הדבק מתכון" in the recipe book's floating button next to the AI recipe — second HeroFab action `{ labelKey: 'paste_recipe', icon: 'clipboard-paste', run: () => aiRecipeModal.open('create', undefined, undefined, 'paste') }` — src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
- [x] P6: Keep AI-draft rows with an unknown unit unlinked so they show as not ready — in prefillFromDraft, when ing.unit is not a known unit key: no referenceId, unit 'unit', nameHebrew `${ing.name} (${ing.unit})`; spec — src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts, recipe-ai-flow.service.spec.ts
- [x] P7: Let a recipe save with unready rows and never lose their text — ingredientRowValidator returns null for a named row without referenceId and with an empty amount; the save serializer keeps every row with a referenceId or a trimmed nameHebrew (amount ?? 0); spec — src/app/pages/recipe-builder/services/recipe-form.service.ts, recipe-form.service.spec.ts
- [x] P8: Add a paste window for ingredient lines — new standalone child component, input open, outputs submitted(text) and closed; textarea + hint + «הוסף» / «ביטול»; Escape closes — src/app/pages/recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.ts/.html/.scss
- [x] P9: Add "הדבק מצרכים" to the ingredients table, one row per pasted line — button + dialog; onPasteIngredients(text): drop trailing empty rows, then for each parsed line push RecipeFormService.createIngredientGroup() patched with amount/unit/name and the matcher's referenceId + item_type, for each text line push a row with nameHebrew = original text, amount null, unit 'unit'; unit resolver = UNIT_ALIASES → TranslationService.resolveUnit → UnitRegistryService.allUnitKeys_; mark the array dirty and bump updateValueAndValidity; spec — src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts/.html/.spec.ts
- [x] P10: Show unlinked rows in red with a "לא מוכן" label — .unlinked-row and .unlinked-badge colors to --color-danger (logical properties), badge text label — recipe-ingredients-table.component.scss, recipe-ingredients-table.component.html
- [x] P11: Add the new texts and the paste icon — 8 dictionary keys above; ClipboardPaste in app.config.ts — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] P12: Build, run the listed specs, check the error log, then hand over the five app checks — ng build, ng test (listed specs), log-query — this plan file

## Technical Considerations
- Dependencies: `GeminiService.parseText` (Observable → `firstValueFrom`), `AiRecipeDraftService`,
  `RecipeAiFlowService.applyPendingDraft` (unchanged entry), `RecipeFormService.createIngredientGroup`,
  `TranslationService.resolveUnit`, `UnitRegistryService.allUnitKeys_`, `UNIT_ALIASES` (`recipe-cost.constants.ts`),
  `KitchenStateService.products_` / `recipes_`, `HeroFabService.setPageActions`.
- New files needed: the three utils + specs, `paste-ingredients-dialog` component (3 files),
  `ai-recipe-modal.component.spec.ts` and `recipe-ai-flow.service.spec.ts` (neither exists on `origin/main`).
- Model changes: none (`ParsedResult` already in `parsed-result.model.ts`).
- Backend / API: none — uses the existing `POST /api/v1/ai/parse-text`.
- Auth and validation: `parse-text` requires a JWT and is rate-limited 20/15 min per user (`aiLimiter`); the modal
  service already sends anonymous users to sign-in. Pasted text is sent only to our server.
- Security surface: pasted free text reaches the existing parse-text prompt (no new input surface); nothing is
  rendered as HTML.
- Data / migration: none. Recipes may now store unlinked rows with `amount: 0` (schema-valid already).
- Hebrew canonical values: units in pasted lines resolve through `TranslationService.resolveUnit` (the canonical
  flow); an unresolvable unit token is **not** added to the dictionary — the row stays text/unlinked
  (`docs/agent/standards-domain.md` → Hebrew-Primary Canonical Values).
- Project checks: log-query Done-when present; chef stories; 8 dictionary keys listed; RTL logical CSS; icon
  registered; hotspots append-only.

## Backend Impact
- Collections affected: `recipes`, `dishes` (may now contain unlinked ingredient rows with `amount: 0`).
- New collections: no.
- Server changes needed: no.

## Out of Scope
- "partial" recipe cost and "לא סגור סופית" labels (plan 444, spec 03.3).
- Bulk product import from a price list (plan 432).
- Parsing amounts written after the name ("עגבניות 2 ק"ג") — such lines become text rows.
- Changing the parse-text prompt or adding yield fields to it.
- Global AI quota meter, green mobile recipe header, unit drag-reorder.

## Critical Questions
none
