# Plan 490 — Pasted ingredient lines match existing products first and Not Ready never saves

Status: built (evidence: docs/mvp/runs/490.md)
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
QA report 2026-10-22, item 13 (check 43), Dandan's words: "recipe builder → paste ingredient lines. The paste tool
creates unverified new products instead of matching existing inventory (e.g. "salt" → existing «מלח»). Clicking
"Not Ready" saves/yellows the product prematurely. Unify with the main AI recipe tool's logic: check inventory first,
offer options when ambiguous (table salt vs coarse salt), and "Not Ready" must not save the product."

This plan builds on plan 463 (shared matcher `ProductNameMatcherService`, merged) — the name-similarity gate found no
hit, but 463 is the predecessor and its pieces are extended here, never copied.

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- **"Not Ready" saves a product.** The red badge «לא מוכן»
  (`recipe-ingredients-table.component.html:84-93`) calls `onUnlinkedBadgeClick`
  (`recipe-ingredients-table.component.ts:192-225`). Unless a product with the exact same name exists (plan 485 branch,
  ts:196-202), it builds a stub product (ts:203-213) and saves it at once with `productDataService.addProduct(stub)`
  (ts:214-215), links the row and opens quick-edit. The stub has no category and no supplier, so
  `getProductValidationStatus` (`core/utils/product-validation.util.ts:31-35`) rates it `incomplete` → the row turns
  yellow (`warning-row`). Closing quick-edit does not undo the save. The badge's own hint already promises something
  else: `unlinked_ingredient_hint` = «הרכיב לא מקושר למוצר — לחץ לחיפוש וקישור» (`dictionary.json:227`), and the
  plan-439 card for check 44 said "the create-product window opens with that name; close it without saving".
- **Lines the parser cannot read are never matched.** `parseIngredientLines`
  (`core/utils/ingredient-line-parser.util.ts:80-83`) turns every line without a leading number (`salt`, `מלח`,
  `מלח לפי הטעם`, `מלח 200 גרם`) into `{ kind: 'text' }`. `onPasteIngredients` (ts:265-267) adds those rows unlinked
  with no lookup at all, and only parsed lines are queued for the AI step (ts:258-264).
- **Cross-language names never link.** Tier 1-2 (`core/utils/product-name-match.util.ts:45-58`) compares Hebrew
  spellings only, so `salt` vs «מלח» needs the AI step. Its prompt (`server/routes/ai.js:604-613`) says the names are
  "written in Hebrew" and to answer null "whenever you are unsure".
- **No options when ambiguous.** The AI answer is one product or null per name
  (`shared/schemas/ai-product-match.schema.ts:20-27`; `cleanProductMatches` ai.js:616-628 drops nulls). With several
  salts in the inventory («מלח שולחן», «מלח גס») the model answers null → the row stays red and the chef's only way
  forward is the «לא מוכן» badge, which saves a new product. A tier-2 `ambiguous` result
  (`product-name-match.util.ts:56`) is also thrown away (`ingredient-match.util.ts:24`).
- **The AI step does fail in real use.** Local logs: `ai.match_product_names.timeout` at 2026-10-23T13:12:37Z
  (`gemini-3.1-flash-lite`) and `ai.match_product_names.gemini_failed` 503 "high demand" at 2026-10-22T21:59:20Z.
  After a failure the rows stay red with one toast (`recipe-ingredients-table.component.ts:289-297`) — so the click
  path must still offer the inventory's products without any AI.
- **The main AI recipe tool** (passed checks 16-18) sends the whole text to Gemini (`ai.js:318-342` `/generate`),
  which writes clean Hebrew names; its rows are linked by the same `findIngredientMatch`
  (`pages/recipe-builder/services/recipe-ai-flow.service.ts:98-104, 211-217`). Both tools already share the matcher;
  what differs is that pasted names arrive raw. Its unlinked rows land in the same table and get the same «לא מוכן»
  badge, so the badge fix covers both tools.
- **Picking a product resets the pasted unit.** `onItemSelected` (ts:415-439) keeps the amount when re-editing a
  row but always replaces the unit with the product's first purchase unit or base unit.

## Goals & Success Criteria
- Primary: a pasted ingredient that exists in the inventory (any spelling, plural, English or Hebrew) is linked to
  it or offered as an option; the chef never ends up with a second product by accident.
- Primary: «לא מוכן» never saves anything. It opens a search with the row's name: the inventory's best options
  first, then the normal search, then "add new ingredient", which opens the existing quick-add window. That window
  saves only on its own «שמור».
- Frozen: passed check 44 (a not-ready row stays and the recipe saves), checks 16-18 (main AI tool linking),
  33-34 (import matching), 41-42 (recipe line units).

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include=src/app/core/services/product-name-matcher.service.spec.ts --include=src/app/core/utils/product-name-match.util.spec.ts --include=src/app/core/utils/ingredient-match.util.spec.ts --include=src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts --include=src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.spec.ts --include=src/app/pages/recipe-builder/services/recipe-ai-flow.service.spec.ts --include=src/app/pages/inventory/components/product-import/product-import.component.spec.ts` → all SUCCESS, including these new cases:
  - matcher (Gemini mocked): `matchNamesWithOptions` returns `linked` for tier 1-2 and AI `product` answers, and `options` for AI `options` answers (positions mapped back to products, out-of-range dropped, max 5); a tier-2 `ambiguous` name the AI does not settle → its candidates become options; an item with `linkable: false` is never in `linked` (an AI `product` answer for it becomes a one-item option); `matchNames` still returns exactly the `linked` map (import page unchanged); an HTTP error → `onAiFailure` called once, the local ambiguous candidates are still returned as options, no throw.
  - table: clicking «לא מוכן» on a row with no same-name product calls neither `ProductDataService.addProduct` nor `KitchenStateService.saveProduct` and sets the row into search mode; a row with an exact same-name product is linked as before (plan 485); a pasted text line (`קצת פטרוזיליה`) goes to the matcher as `linkable: false` and is never linked, but its AI answer is stored as that row's options; options for a row are passed to the search when that row is edited; picking a product on an unlinked pasted row keeps its amount and unit when the row had an amount (`200` + `gram` stays `200` + `gram`).
  - ingredient search: `suggestions` are listed first (before server results, no duplicates by `_id`) while the query equals the opening query, and are not listed once the user types something else; the add option is still offered and opens quick-add prefilled; cancelling quick-add selects nothing.
- [x] [auto] `cd server && npx vitest run test/ai-match-product-names.test.js` passes, including: an answer `{"i":0,"product":null,"options":[1,2]}` → response entry `{ i: 0, product: null, options: [1, 2] }`; options out of range (negative or ≥ product count), repeated or over 5 are dropped while the rest of the answer is kept (an answer with 7 options for one name still returns the other names' links); an entry with `product: null` and no options is still dropped; an answer with both `product` and `options` keeps `product` and drops `options`; the system prompt sent to the mocked Gemini contains the words `any language` and `options`.
- [x] [auto] `npm --prefix server test` passes.
- [x] [auto] `grep -n "addProduct" src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts` → no output.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (if `plan-start` is not supported, use `--since=<minutes since the run started>m` and say so in the run file).
- [ ] [human] Replay of the report, "salt" (desktop 1440 px, owner). SETUP: `/inventory/list` has a product «מלח» (create it with a name only if missing); note the product count. PAGE `/recipe-builder` → open any saved recipe. DO: press «הדבק מצרכים», paste `200 גרם salt`, press «הוסף», wait until the row stops changing (up to 30 seconds). SEE ✓: either the row now reads «מלח» (200, גרם) and is not red, or it is red and clicking «לא מוכן» opens a list whose first rows are inventory products marked «הצעה מהמלאי» with «מלח» among them; picking «מלח» links the row and keeps 200 גרם. Then paste a line with the bare word `salt` (no amount) → «הוסף» → wait up to 30 s: that row stays red (a line without an amount is never linked by itself), and clicking its «לא מוכן» lists «מלח» marked «הצעה מהמלאי». In all cases `/inventory/list` shows the same product count and no product named «salt»; leave the recipe without saving. FAIL ✗: a product «salt» appears, «מלח» is not offered for the bare `salt` row in the inventory, or the row turns yellow before you picked anything.
- [ ] [human] Ambiguous name → options (desktop 1440 px, owner). SETUP: products «זעתר ירדני» and «זעתר לבנוני» exist and no product is named exactly «זעתר» (create the two with a name only; if a product named exactly «זעתר» already exists, mark this card unsure — never rename or delete it). PAGE `/recipe-builder`, any saved recipe. DO: «הדבק מצרכים» → paste `1 כף זעתר` → «הוסף», wait until the row stops changing (up to 30 seconds), then click the row's «לא מוכן». SEE ✓: the row stayed red until the click (not linked to one of them silently); the list shows «זעתר ירדני» and «זעתר לבנוני» at the top, each marked «הצעה מהמלאי», and «הוסף מרכיב חדש» at the bottom; clicking «זעתר לבנוני» makes the row «זעתר לבנוני», 1 כף, not red. FAIL ✗: the row was linked to one of the two without asking, the two are not offered, or the amount/unit changed.
- [x] [human] «לא מוכן» never saves (desktop 1440 px, owner). SETUP: note the product count in `/inventory/list`; no product named «שום יבש קלוי». PAGE `/recipe-builder`, any saved recipe. DO: paste `2 כף שום יבש קלוי` → «הוסף» → wait up to 30 s → click «לא מוכן» → press Escape. SEE ✓: the row is still red «לא מוכן» (not yellow), and `/inventory/list` shows the same count with no «שום יבש קלוי». Then click «לא מוכן» again → choose «הוסף מרכיב חדש» → the add-product window opens with «שום יבש קלוי» typed in → press «ביטול»: the row is still red and the count is still the same. FAIL ✗: the row turns yellow, or a product «שום יבש קלוי» exists without pressing «שמור» in the add window.
- [x] [human] Check 44 replay — a not-ready row stays and the recipe saves (desktop 1440 px, owner). PAGE `/recipe-builder` → a test recipe of your own (create one named «בדיקה 490» with one linked ingredient if needed; this card saves the recipe, so never use a real menu recipe). DO: paste `קצת פטרוזיליה` → «הוסף» → click «לא מוכן» → press Escape → press the recipe's «שמור» and confirm «save anyway» → reload the page. SEE ✓: the recipe saved and the red row «קצת פטרוזיליה» is still there. FAIL ✗: the save is refused, or the row is gone or linked after reloading.
- [ ] [human] Phone (375 px, owner): repeat the ambiguous-name check. SEE ✓: the options list fits the screen with no sideways scrolling, «הצעה מהמלאי» is readable, and picking an option links the row. FAIL ✗: the list is cut off or needs a sideways scroll.

## Execution Mode
- Parallel: yes — no shared file with plans 486-489 or 491-496 (only the append-only `dictionary.json` hotspot).
- Isolated DB: no — no stored data is reshaped.

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then `run-mode-review-fixes.md`,
  `run-mode-review.md`). `[human]` items become cards in `docs/mvp/runs/490.md`; the UI validator runs them on wt-1 or
  wt-2 only. Cards 1, 2 and 5 call the real Gemini model. The local tiers compare Hebrew spellings only and
  «זעתר» (one word) does not fold to «זעתר ירדני» (two words), so without a working AI step (no key, quota gone,
  timeout) neither "salt" → «מלח» nor the two zaatar options can appear: those cards are then `unsure`, never
  `pass`. Cards 3 and 4 need no AI.
- Import page (checks 33-34): it shares the route, so after the prompt change an English name in a pasted price
  list may link to its Hebrew product when it is clearly the same food. That is the report's "check inventory
  first" and needs no import UI change; `options` are ignored there (`matchNames` returns `linked` only) and
  `product-import.component.spec.ts` must stay green.
- Planner decisions (no Human available, run mode "decide and log"):
  - Text lines (no leading number) stay unlinked by design (plan 463 Out of Scope, check 44) — they now get options,
    never an automatic link.
  - The AI step stays one call per paste, now also carrying text lines; no call when every line already matched
    locally and there are no text lines without a local candidate.
  - The plan-485 branch of `onUnlinkedBadgeClick` (exact same-name product → link it) stays; only the stub-saving
    branch is replaced. Linking an existing product saves nothing.
  - The main AI recipe tool's draft flow (`recipe-ai-flow.service.ts`) is not changed (checks 16-18 frozen); its
    unlinked rows get the new badge behaviour through the shared table.
  - The import page keeps calling `matchNames` (linked only); the prompt keeps the same "product only when clearly the
    same food" rule, so import links do not loosen.
- `recipe-ingredients-table.component.ts` is 736 lines and not on the growth-frozen list; keep matching logic in the
  matcher service and keep the table changes small.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` — add to them,
never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/ai-product-match.schema.ts
server/routes/ai.js
server/test/ai-match-product-names.test.js
src/app/core/services/product-name-matcher.service.ts
src/app/core/services/product-name-matcher.service.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.spec.ts
public/assets/data/dictionary.json
docs/mvp/runs/490.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Run mode: you work alone. Writing outside the scope block: log path + change + why under `## Decisions` in
`docs/mvp/runs/490.md`, add the path to the scope block above, continue. Never touch the frozen pieces named in
Execution Notes.

## Architecture Impact
- INV-4: preserves — the AI match response schema in `shared/schemas/ai-product-match.schema.ts` gains an optional `options` array; it stays the one definition, the server still validates the request body and the model's answer against it; no entity shape changes.
- INV-6: preserves — the only AI call is the existing `POST /api/v1/ai/match-product-names` in `server/routes/ai.js` (JWT + `aiLimiter` + `callGemini`); the browser reaches it only through `GeminiService.matchProductNames`; no key in the browser.
- INV-1: preserves — the route still reads no business data (the browser sends names and units only); «לא מוכן» now creates nothing, and a product added through quick-add goes through the same `ProductDataService.addProduct` permission path as today.
- INV-2, INV-3, INV-5: preserves — no tenancy, cascade or taxonomy change.

## Backend Impact
- Collections affected: none (no read, no write).
- New collections: no.
- Server changes: yes — `POST /api/v1/ai/match-product-names` prompt and answer cleaning (optional `options`), same
  route, same auth, same limiter. Response stays backward compatible: entries with a `product` are unchanged; new
  entries carry `product: null` with `options`.
- Security surface: user text still goes into a Gemini prompt; options are positions validated against the lists the
  browser sent, so an injected instruction cannot select anything outside them. Names are never logged (counts only;
  add an `options` count to the `ai.match_product_names.done` log line).

## Reuse Check
- Inventory suggestions shown first in the recipe ingredient search — family: search-combobox — rung: 2 — why: `app-search-combobox` already takes any `options` list, `knownOptions` and an `optionTemplate`; the page-local `app-ingredient-search` only gains a `suggestions` input that it puts first in that list.
- Creating a new product from a not-ready row — family: modal-controller — rung: 1 — why: `QuickAddProductModalService.open({ prefillName })` already opens the quick-add window that saves only on its «שמור», and the ingredient search's add option already calls it.
- "Suggestion" tag on an option row — family: chip — rung: 2 — why: existing `c-chip c-chip--tag c-chip--sm` classes, same as the «מוצר»/«מתכון» tag in the same template.

## Step 0 — Reality Check
On `origin/mvp-qa-fixes`, find by symbol and print `ok` / `conflict: <what>` per line: `onUnlinkedBadgeClick`,
`onPasteIngredients`, `linkPastedByAi_`, `onItemSelected`, `editingNameAtRow_` in
`recipe-ingredients-table.component.ts`; `initialQuery`, `addNewProduct`, `filteredResults_` in
`ingredient-search.component.ts`; `matchNames`, `NameMatchItem` in `product-name-matcher.service.ts`;
`PRODUCT_MATCH_SYSTEM_PROMPT`, `cleanProductMatches` in `server/routes/ai.js`; `productNameMatchResponseSchema` in
`shared/schemas/ai-product-match.schema.ts`; `QuickAddProductModalService.open`; the `ingredient_not_ready` and
`unlinked_ingredient_hint` keys. Also check whether a merged plan 486-496 changed any of these files since `ea6af7b0`.

## User Stories
- As a chef, I want a pasted «salt» to use the «מלח» I already have so that I never get a second salt product.
- As a chef, I want to choose between my table salt and my coarse salt when the app cannot tell which I meant.
- As a chef, I want «לא מוכן» to help me find the product, and to save nothing until I say so.

## Atomic Sub-tasks
- [x] S1: Let the AI matching answer carry a short list of options when it is unsure — `productNameMatchResponseSchema` entries get optional `options: z.array(z.number().int()).optional()` with **no `.max()` / `.min(0)` on the array or its items** (the same schema parses the model's raw answer, so one over-long or out-of-range options list must not make `safeParse` reject the whole answer; `cleanProductMatches` does the capping and range check); export `PRODUCT_MATCH_MAX_OPTIONS = 5`; run `npm run build:schemas` — shared/schemas/ai-product-match.schema.ts
- [x] S2: Teach the server step to read names in any language and to return options instead of guessing — prompt: names come from a chef in any language (Hebrew, English, …) and may carry an amount, a pack word or a remark («קצת», «לפי הטעם») to ignore; set `product` only when exactly one product is clearly the same food (unchanged rule, still `חלב` ≠ `חלבה`); when two to five products could be that food and you cannot tell which, set `product` null and list them in `options`; otherwise null with no options; `cleanProductMatches` keeps `product` entries as today, keeps `product: null` entries only with cleaned options (in range, unique, max 5; dropped when `product` is set), and the done log line gains an `options` count; server tests as in Done-when — server/routes/ai.js, server/test/ai-match-product-names.test.js
- [x] S3: Give the shared matcher an options result next to the links, without changing the import page — new `matchNamesWithOptions(items, options)` returning `{ linked: Map<key, NameMatchResult>, options: Map<key, Product[]> }`; `NameMatchItem` gets optional `linkable?: boolean` (default true); tier-2 `ambiguous` candidates are kept and become options when the AI does not link that name (also after an AI failure); a non-linkable item never enters `linked` (an AI `product` for it becomes a one-item option, a local exact/variant hit too); options capped at 5, in the model's order then local; `matchNames` delegates and returns `linked`; spec — product-name-matcher.service.ts, product-name-matcher.service.spec.ts
- [x] S4: Send pasted text lines to the matcher for options only and keep each row's options — in `onPasteIngredients` queue text lines as `{ name: line.text, linkable: false }` next to the unlinked parsed lines; `linkPastedByAi_` calls `matchNamesWithOptions`, links as today, and stores options per row in a signal `rowOptions_` (a `Map<FormGroup, readonly Product[]>`, replaced not mutated) only while the row is still in the table, unlinked and its name unchanged; drop a row's options when it gets linked or cleared — recipe-ingredients-table.component.ts
- [x] S5: Make «לא מוכן» open the search with the inventory's options instead of saving a stub product — `onUnlinkedBadgeClick` keeps the plan-485 exact-name branch; otherwise it only sets `editingNameAtRow_` to that row (no `addProduct`, no `saveProduct`); `suggestionsFor(group)` = the row's stored options, then the local `matchProductName` result for its name over `KitchenStateService.products_()` (exact/variant product, or ambiguous candidates), no duplicates, max 5; the template passes `[suggestions]` to the row's `app-ingredient-search` only for the row being edited; remove the stub code and the imports it alone used — recipe-ingredients-table.component.ts, recipe-ingredients-table.component.html
- [x] S6: Keep the pasted amount and unit when the chef picks a product for an unlinked row — in `onItemSelected`, when the row being edited had no `referenceId` and has an amount above 0, keep its `amount_net` and `unit` (the unit dropdown already lists the row's current unit); other rows keep today's behaviour (checks 41-42) — recipe-ingredients-table.component.ts
- [x] S7: List the inventory's options first in the ingredient search, marked as suggestions — new input `suggestions = input<readonly Product[]>([])`; the combobox `options` become suggestions (as `item_type_: 'product'`, filtered by `excludeNames`) followed by `filteredResults_()` without the same `_id`, while the trimmed query equals the trimmed `initialQuery()`; once the user types something else, only the normal search; `knownOptions` includes the suggestions so an exact name still hides the add row (rule X); each suggestion row shows a `c-chip c-chip--tag c-chip--sm` «הצעה מהמלאי» chip; the add option and quick-add flow stay as they are (saves only on the window's «שמור») — ingredient-search.component.ts, ingredient-search.component.html, ingredient-search.component.scss (only if the chip needs spacing; logical properties, cssLayer skill first)
- [x] S8: Add the suggestion label and make the hint say what the badge now does — append `"ingredient_suggestion": "הצעה מהמלאי"` next to `ingredient_not_ready`; keep `unlinked_ingredient_hint` (it already says «לחץ לחיפוש וקישור») — public/assets/data/dictionary.json
- [x] S9: Specs for the table, search and matcher as listed in Done-when; update the plan-463 spec "never sends a text-only line to the AI step" to "sends a text-only line for options only and never links it" — recipe-ingredients-table.component.spec.ts, ingredient-search.component.spec.ts, product-name-matcher.service.spec.ts
- [ ] V1 (build, tests, grep, log-query and run file done; browser replay left to the UI validator): Build, run every listed test, replay the cards in the browser and write the run file — `npx ng build`, the `ng test` includes, the server tests, the grep, log-query; record evidence, decisions and the five cards — docs/mvp/runs/490.md

## Technical Considerations
- Data flow: paste text → `parseIngredientLines` → rows (sync tier 1-2 link) → one `matchNamesWithOptions` call →
  linked rows patched + `rowOptions_` signal → `suggestionsFor(group)` → `app-ingredient-search [suggestions]` →
  combobox `options` computed → pick (`onItemSelected`) or add (quick-add window → `addProduct` on «שמור»).
- New translation key: `ingredient_suggestion` = «הצעה מהמלאי».
- Quota: still at most one Gemini call per paste, counted on the server by `callGemini` and in the browser by
  `incrementGeminiUsage()`.
- Data/migration: none. Atlas: none.

## Out of Scope
- Sending the whole paste to Gemini like the AI recipe tool (a parse call per paste); the local parser stays.
- Linking text lines automatically, or reading amounts written after the name (`מלח 200 גרם`).
- The AI step's timeout or retry policy (30 s, one attempt) and model choice.
- The main AI recipe tool's draft flow and the import page's matching UI (they only see the backward-compatible API).
- Cleaning up stub products the old «לא מוכן» already saved (Dandan can delete them from the inventory list).
- Recipe export/print (plan 471).

## Architect + PM review (always)
ARCHITECT + PM REVIEW
no gaps

- Architect: Architecture Impact filled for INV-1, 2, 3, 4, 5, 6 (gate below). Every named file and symbol exists on
  `ea6af7b0` except the new symbols `matchNamesWithOptions`, `rowOptions_`, `suggestionsFor`, `suggestions` input,
  `PRODUCT_MATCH_MAX_OPTIONS` and the key `ingredient_suggestion`, all marked new. Signals, `inject()`, `input()` only;
  no new component, service or util — two existing pieces are extended. Scope covers every file the steps write.
- PM: problem replays Dandan's words and the verified causes; every Done-when item is tagged; [human] cards replay the
  report's "salt", ambiguous and "Not Ready saves" scenarios plus frozen check 44 and a 375 px check; Out of Scope
  written; backend (one route, backward compatible), auth (unchanged), security (positions only), data (none) named.
  Smallest version: no new screen, no new endpoint, one AI call per paste as today.
- Project checks (`docs/agent/plan-checks.md`): log-query [auto] item present; chef-side stories; one new Hebrew key
  through `translatePipe`; no new persisted data; Reuse Check filled.

Independent review (2026-10-24, plan reviewer) — fixed in place:
- S1: a `.max(5)` / `.min(0)` on `options` in the response schema would make `safeParse` of the model's raw answer
  reject every link when one name gets 6+ or a negative option; the schema now stays loose and `cleanProductMatches`
  caps and range-checks (Done-when server case added).
- Execution Notes wrongly said card 1's options branch works without the AI step; the local tiers never map
  `salt` → «מלח», so cards 1, 2 and 5 are `unsure` without AI.
- Import page (checks 33-34) effect of the "any language" prompt named explicitly.
- Cards: wait up to 30 s (the AI timeout), bare `salt` line added to card 1 (the report's literal example), card 2
  never renames/deletes an existing «זעתר», card 4 saves only a test recipe of the tester's own.
- Code citations re-checked on `ea6af7b0` (table ts:192-225, 247-300, 415-446; matcher; util:45-58; ai.js:604-628;
  schema; gemini.service.ts:174-187 types follow the schema, so no scope change). Scope complete and minimal.
