# Plan 463 — Link pasted ingredient names to existing products with one shared matcher

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Handoff E2 (validation card #43, plan 439). In the recipe builder, «הדבק מצרכים» linked «מלח» to the existing product
but treated «עגבניות» and «פטרוזיליה» as new products although they exist in the inventory. The import page
(`/inventory/import`, plan 432, handoff D1) has the same weakness: a misspelled name came in as «חדש».

Verified in code on `mvp` (b7d21fb0):
- `onPasteIngredients` (`recipe-ingredients-table.component.ts:214-250`) calls `findIngredientMatch`
  (`src/app/core/utils/ingredient-match.util.ts:12-24`). That function compares `trim().toLowerCase()` only
  (`ingredient-match.util.ts:8`). Plural vs singular («עגבניות» vs «עגבנייה»), spelling variants of the same word
  («עגבניה» / «עגבנייה», «פטרוזיליה» / «פטרוזליה»), niqqud and punctuation all miss, so the row is added unlinked
  (red «לא מוכן») and the chef is pushed to create a duplicate product.
- A pasted line such as `1 צרור פטרוזיליה` keeps «צרור» in the name (the line parser only treats the first word after
  the number as a unit, `ingredient-line-parser.util.ts:81-96`), so even a perfect text match cannot find it.
- The import page matches by `normalizeProductName` (`product-name.util.ts`, trim + lower-case only; the server apply
  route uses the same rule, `server/routes/product-import.js:57-61`).
- Not verifiable without the Human's inventory: which exact product names exist (the review did not record them).
  The plan therefore covers all the variant kinds above.

The project already has a Hebrew normaliser (`normalizeHebrew`, `src/app/core/utils/recipe-match.util.ts:3`, strips
niqqud and punctuation) and the AI proxy `server/routes/ai.js` (INV-6). Nothing combines them for products.

Design (Human's brief, E2): one shared matcher — exact normalised match first (including singular/plural and common
spelling variants), then ONE AI step only for the names that found no match. The AI receives names and units only.

Placement decision (client vs server), from what the code already does:
- Exact and variant tiers run in the browser: instant, no quota, and `KitchenStateService.products_()` already holds
  every product the user may see. The recipe-ai-flow and the paste flow already match client-side.
- The AI step runs on the server in `server/routes/ai.js` (INV-6, shared quota via `callGemini`, per-user `aiLimiter`).
  The browser sends the leftover names plus the candidate product names (names and base units only — no ids, no
  prices, no suppliers). The model answers with positions in those two lists, never ids, so the server needs no
  database read and cannot be tricked into returning a product the caller did not send. The browser maps positions
  back to products. A new endpoint is needed: `POST /api/v1/ai/match-product-names`, validated by the new Zod schemas
  `productNameMatchRequestSchema` / `productNameMatchResponseSchema` in `shared/schemas/ai-product-match.schema.ts`.

## Goals & Success Criteria
- Primary: a pasted ingredient that exists in the inventory (any plural/singular/spelling form, or a close typo)
  is linked to that product and never becomes a new product.
- Primary: the matcher is a shared service that plan 464 reuses for the import page.

Done when:
- [ ] [auto] `npx ng build` passes.
- [ ] [auto] `npx ng test --watch=false --include='src/app/core/utils/product-name-match.util.spec.ts' --include='src/app/core/utils/ingredient-match.util.spec.ts' --include='src/app/core/services/product-name-matcher.service.spec.ts' --include='src/app/core/services/gemini.service.spec.ts' --include='src/app/pages/recipe-builder/components/recipe-ingredients-table/**'` passes, including these new cases:
  - util fixtures (products `עגבנייה`, `פטרוזיליה`, `מלח`, `ביצה`, `בצל ירוק`, `מלפפון`, `חלב`, `חלבה`): `'עגבניות'`, `'עגבניה'`, `'עגבנייה '` → `עגבנייה` (variant or exact);
    `'פטרוזליה'`, `'פְּטְרוֹזִיליָה'` (niqqud) → `פטרוזיליה`; `'ביצים'` → `ביצה`; `'בצלים ירוקים'` → `בצל ירוק`;
    `'מלפפונים'` → `מלפפון`; `'חלבה'` does NOT match `חלב` and `'חלב'` does NOT match `חלבה`; `'פטרוזיליא'` (a letter typo) → `null`;
    two products that fold to the same key (`עגבנייה` and `עגבניה`) with query `'עגבניות'` → `ambiguous` (never picked silently), while the query `'עגבנייה'` → exact on the first;
  - `findIngredientMatch`: the order is product-exact, recipe-exact, product-variant, recipe-variant; `'עגבניות'` with product `עגבנייה` → that product;
  - matcher service (Gemini mocked): all names matched exactly/variant → `matchProductNames` is NOT called; one leftover name → called once with only `{ name, unit }` objects (assert no `_id`, price or supplier key in the request body) and the answer's position is mapped back to the right product; a position outside the list is ignored; an HTTP error → the leftover name stays unmatched and the method does not throw; zero products → no call;
  - paste flow (table spec): with products `עגבנייה` and `מלח`, pasting `2 ק"ג עגבניות` and `200 גרם מלח` links both rows with no Gemini call; with product `פטרוזיליה` and a mocked answer, pasting `1 צרור פטרוזיליה` first adds the row unlinked, then (after the mocked answer) links it, keeping amount 1; if the user edited that row's name before the answer arrived, the row is left alone; a text-only line (`קצת פטרוזיליה`) is never sent to the AI step.
- [ ] [auto] `npm --prefix server test -- ai-match-product-names` passes (Gemini mocked by stubbing global `fetch`, the way `server/test/gemini-client.test.js` does): valid request → mapped matches; out-of-range or repeated positions dropped; request without token → 401; empty `names`, more than 200 names or more than 1000 products → 400; the request that reaches the mocked Gemini contains the product names and units and no other fields; Gemini 429 daily quota → 429 `daily_limit_reached`; unparseable model text → 502.
- [ ] [auto] `npm --prefix server test` passes.
- [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
- [ ] [human] Replay of the review's failure — SETUP: inventory has the products «עגבנייה», «פטרוזיליה» and «מלח» (any spelling of the first two). Open any recipe at `/recipe-builder`, press «הדבק מצרכים», paste three lines `2 ק"ג עגבניות`, `1 צרור פטרוזיליה`, `200 גרם מלח` and press «הוסף». The tomato and salt rows are linked at once (not red); the parsley row may show red «לא מוכן» for a second or two and then turns into the linked product «פטרוזיליה». No row stays red. Open `/inventory/list`: no new «עגבניות» or «פטרוזיליה» product exists.
- [ ] [human] Paste `שום יבש בכמות קטנה` (a name that is not in the inventory) → that row stays red «לא מוכן» and no error message appears.

## Execution Mode
- Parallel: no against 464 and 465 (both depend on this plan); no against any plan editing `server/routes/ai.js` or `gemini.service.ts`.
- Concurrent plans: 459–462 may run alongside (they touch dropdowns, shared floating panels, the product form and the inventory list — no shared file with this scope).
- Isolated DB: no — no data is reshaped.

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md`, [human] items become validation cards in `docs/mvp/runs/463.md`.
- Depends on: none from this batch. Plan 464 and 465 depend on this plan (they reuse `ProductNameMatcherService`).
- The reuse-layer plans 450–458 live on `main`, not on `mvp`; this plan does not depend on them.
- INV-6: the only AI call is the new route in `server/routes/ai.js`; the browser holds no key. Quota: the step costs one Gemini call per paste (counted by `callGemini` on the server and by `incrementGeminiUsage()` in the browser), and only when at least one name found no exact/variant match.
- `recipe-ingredients-table.component.ts` is 671 lines and is not on the growth-frozen list (`_shared/tech-stack.md`: recipe-builder.page.ts, menu-intelligence.page.ts, cook-view.page.ts, product-form.component.ts, menu-export.service.ts); the matching logic lives in the new service so the table only gains the small continuation in S7.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/product-name-match.util.ts
src/app/core/utils/product-name-match.util.spec.ts
src/app/core/utils/ingredient-match.util.ts
src/app/core/utils/ingredient-match.util.spec.ts
src/app/core/services/product-name-matcher.service.ts
src/app/core/services/product-name-matcher.service.spec.ts
src/app/core/services/gemini.service.ts
src/app/core/services/gemini.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/utils/breadcrumbs.md
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts
shared/schemas/ai-product-match.schema.ts
shared/schemas/index.ts
server/routes/ai.js
server/test/ai-match-product-names.test.js
docs/mvp/runs/463.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — adds request/response schemas for an AI route in `shared/schemas`; no entity shape changes, and the server validates the request body against the new schema before calling Gemini.
- INV-6: preserves — the new route lives in `server/routes/ai.js` (JWT + `aiLimiter` + `callGemini`); the browser only calls it through `GeminiService`.
- INV-1: preserves — the route reads no business data (the browser sends names only); who may call it is unchanged (any signed-in member, same as `/parse-text`).

## Backend Impact
- Collections affected: none (no read, no write).
- New collections: no
- Server changes needed: yes — one new route `POST /api/v1/ai/match-product-names` in `server/routes/ai.js`.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Check by symbol on `origin/mvp`: `findIngredientMatch` in
`ingredient-match.util.ts`; `normalizeHebrew` in `recipe-match.util.ts`; `onPasteIngredients` and `isEmptyRow_` in
`recipe-ingredients-table.component.ts`; `parseIngredientLines` in `ingredient-line-parser.util.ts`;
`parsePriceList`, `modelParam_`, `offerModelSwitch` in `gemini.service.ts`; `callGemini`, `respondFromGeminiFailure`,
`requestedModel`, `extractJsonPayload` use in `server/routes/ai.js`; `server/generated/schemas` is rebuilt by
`npm run build:schemas`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want a pasted «עגבניות» to use the «עגבנייה» I already have so that I never end up with two tomato products.
- As a chef, I want a misspelled ingredient to still find my product so that I don't have to fix it by hand.
- As a chef, I want a name the app is not sure about to stay red rather than link to the wrong product.

## Functional Requirements

### Must Have (P0)
- [ ] Tier 1 (exact): equal after `normalizeHebrew` (niqqud, punctuation, case, spaces). Tier 2 (variant): equal after folding plural/singular and spelling variants (rules in S1). Tier 2 matches only when exactly one product fits; two fits are `ambiguous` and go to the AI step.
- [ ] Order of lookup: products first, then recipes (exact before variant), as today; the AI step links products only.
- [ ] The AI step runs once per paste, only for parsed lines without a match, and never for unreadable (text) lines.
- [ ] The AI answer links a row only when it names a product from the list the browser sent; the row shows the product's own name.
- [ ] A failed or empty AI step leaves the rows red as today (plus one calm message, no blocking).

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No new screen. Pasted rows appear at once; rows waiting for the AI step look like today's red «לא מוכן» row and turn into the linked product when the answer arrives (about 1–3 seconds).
- New dictionary key (append to `general`): `"paste_ingredients_match_failed": "לא הצלחנו לחבר חלק מהמצרכים למוצרים קיימים – הם נשארו אדומים"`.
- Quota/limit errors reuse the existing key `ai_daily_limit_reached_all`.

## Atomic Sub-tasks
- [ ] S1: Make name matching forgive plural, spelling variants and accents — new pure helper `foldProductName` / `matchProductName` per word: apply `normalizeHebrew`; fold final letters (ך ם ן ף ץ → כ מ נ פ צ); a word ending «ים» or «ות» (stem of 3+ letters) has the keys {stem, stem+«ה»}, any other word has {word}; then drop «י» and «ו» inside every key when 2+ letters remain; two names match when they have the same number of words and every word pair shares a key; return `exact` (equal after `normalizeHebrew`), `variant`, `ambiguous` (more than one product) or null; spec with the fixtures in Done-when — product-name-match.util.ts, product-name-match.util.spec.ts
- [ ] S2: Make the ingredient lookup use the new matching — `findIngredientMatch` keeps its signature and result shape; order product-exact, recipe-exact, product-variant, recipe-variant; ambiguous gives null; extend the spec (this also helps the AI-recipe draft rows, which call the same function) — ingredient-match.util.ts, ingredient-match.util.spec.ts
- [ ] S3: Define the AI matching request and answer shapes once — Zod schemas `productNameMatchRequestSchema` (`names` 1–200 and `products` 1–1000 items of `{ name 1–200 chars, unit up to 40 chars }`, optional `model`) and `productNameMatchResponseSchema` (`matches` of `{ i, product }` with `product` an integer or null) plus the constants `PRODUCT_MATCH_MAX_NAMES` / `PRODUCT_MATCH_MAX_PRODUCTS`; export from the index; run `npm run build:schemas` — shared/schemas/ai-product-match.schema.ts, shared/schemas/index.ts
- [ ] S4: Add the server step that matches leftover names with one AI call — route `POST /match-product-names` with `verifyToken, aiLimiter` (no owner check: staff paste ingredients too); parse the body with the request schema (400 `INVALID_REQUEST`); system prompt tells the model to match each name to the SAME food in the product list allowing typos, plural, spelling and a leading pack word such as «צרור», to answer null for a different food that only looks similar (for example «חלב» vs «חלבה») and when unsure, and to return only `{ "matches": [ { "i", "product" } ] }`; send names and units as numbered lists, temperature 0, `callGemini` with `eventPrefix: 'ai.match_product_names'`, `requestedModel(req)`, 30 s timeout; clean the answer (drop repeated `i`, out-of-range `i` or `product`, anything the response schema rejects) and respond `{ matches }`; log only counts, never names; failures through `respondFromGeminiFailure`; server test with `vi.stubGlobal('fetch')` and `resetForTests()` as in `gemini-client.test.js` — server/routes/ai.js, server/test/ai-match-product-names.test.js
- [ ] S5: Add the browser call for the AI step — `GeminiService.matchProductNames(names, products)` posts `{ names, products, ...modelParam_() }` to the new route, calls `incrementGeminiUsage()` on success and returns the `matches`; spec with `HttpTestingController` like `generateProductFromImage` — gemini.service.ts, gemini.service.spec.ts
- [ ] S6: Build one shared matcher service — `ProductNameMatcherService` (`providedIn: 'root'`, `inject()`): `matchExact(name)` = `matchProductName` over `KitchenStateService.products_()` (sync, for the import page to re-match on every edit); `matchNames(items: { key, name, unit? }[])` = tier 1–2 for all, then ONE `matchProductNames` call for the leftover (unmatched or ambiguous) names with the product list as candidates (names and `baseUnit` only; when there are more than 1000 products send only those whose folded name shares its first two letters with a leftover name, cap 1000), returns `Map<key, { product, via: 'exact' | 'variant' | 'ai' }>`; any error is logged with `LoggingService` and the leftover names are simply left out; no call when there is nothing to ask or no products — product-name-matcher.service.ts, product-name-matcher.service.spec.ts
- [ ] S7: Link pasted ingredient lines through the shared matcher — keep the sync row creation (recipes also match) and then, for parsed lines still unlinked, call `matchNames` once (not awaited by the dialog); when it answers, patch a row only if its group is still in the array, still has no `referenceId` and its name is unchanged since the paste, then set `referenceId`, `item_type: 'product'`, `nameHebrew`, `nameSnapshot` to the product's name and call `updateLineCalculations`; on a failed or partly empty answer show the new `paste_ingredients_match_failed` toast once; spec as in Done-when — recipe-ingredients-table.component.ts, recipe-ingredients-table.component.spec.ts
- [ ] S8: Add the toast text and update the folder maps — append `paste_ingredients_match_failed` to `general` in the dictionary; add the new files to the services and utils breadcrumbs — public/assets/data/dictionary.json, src/app/core/services/breadcrumbs.md, src/app/core/utils/breadcrumbs.md
- [ ] S9: Build, run all affected tests and write the run file with the validation cards — `npx ng build`, the listed `ng test` includes, `npm --prefix server test`; record evidence and the two [human] cards — docs/mvp/runs/463.md

## Technical Considerations
- Dependencies: `normalizeHebrew` (`recipe-match.util.ts`), `KitchenStateService.products_()`, `GeminiService`, `LoggingService`, `UserMsgService`, `callGemini` and friends in `server/services/gemini-client.js`.
- New files: `product-name-match.util.ts(+spec)`, `product-name-matcher.service.ts(+spec)`, `shared/schemas/ai-product-match.schema.ts`, `server/test/ai-match-product-names.test.js`.
- Model changes: none. Backend/API: one new AI route. Auth: JWT + per-user `aiLimiter` (20 per 15 minutes, shared with the other AI routes).
- Security surface: user text goes into a Gemini prompt; the answer is only positions, validated against the lists, so an injected instruction cannot select anything the browser did not send. Names are not logged.
- Privacy: product and ingredient names (no prices, no ids) leave the app to Google Gemini, like every other AI route.
- Server body limit is the global 2 MB (`server/app.js:175`); 1000 names fit easily.
- Data/migration: none.
- Project checks: log-query [auto]; chef-side stories; one new Hebrew key.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Unit conversion of the pasted amount into the product's unit (a line `2 עגבניות` keeps unit «unit» as plan 439 built it).
- Letting the AI link text-only lines (`קצת פטרוזיליה`): those stay red by design; an amount is missing.
- Fuzzy (edit-distance) matching on the client; typos beyond the folding rules go to the AI step.
- The import page itself (plan 464) and any change to the product form's duplicate-name check (plan 461).
- Linking to recipes through the AI step.

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. Should the AI step link automatically when it is confident, or show «האם התכוונת ל-…?» first? Recommended: link automatically; the row shows the product's own name and the model answers null when unsure. Asking each time would add a click per line.
2. A paste with unmatched names costs one AI call out of the shared daily quota (and the import page may add one more per import, plan 464). Accept? Recommended: yes, one call per paste, never when everything matched.
3. Plural/singular folding uses the rules in S1 and will link «ביצים» to «ביצה» but not «חלבה» to «חלב». Any word pairs the chef knows that must never merge (for example brand names)? Recommended: none now; the ambiguity rule and the AI answer «null when unsure» are the guards.
