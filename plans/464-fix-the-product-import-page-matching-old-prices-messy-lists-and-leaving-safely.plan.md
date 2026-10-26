# Plan 464 — Fix the product import page: matching, old prices, messy lists and leaving safely

Status: active
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Handoff D1, D2 and D4 for `/inventory/import` (plan 432), found while the Human validated card #34 and #37:
- D1: a row for an existing product shows «קיים – עדכן מחיר» without the old price; a misspelled name came in as
  «חדש», and after the user corrected the name the row froze (not editable any more) and the page still did not
  clearly say the product exists.
- D2: the price-list parser misread `עגבניה ניסיון 1 קילו 1 עוהל 50 שח`, and a deliberately messy text failed outright.
  Human (2026-10-21): «עוהל» is a typo of «עולה» ("costs"). The line means: product «עגבניה ניסיון», 1 kg costs 50 ₪.
  There is no second purchase unit in it; the parser must treat «עולה» (and close misspellings) as a price word.
- D4: leaving the page with text in the box or an unsaved preview loses it silently; the paste box should grow with
  its text.

Verified in code on `mvp` (b7d21fb0):
- Why the row froze: `product-import.component.html:93-109` renders the name as a read-only `<span>` whenever
  `item.match` exists and as an `<input>` only otherwise. `match` comes from `productsByName_` keyed by the exact
  `normalizeProductName` (`product-import.component.ts:101-128`). The moment the typed name equals an existing
  product, the input is destroyed and replaced by plain text: focus is lost mid-typing and the name can never be
  edited again. Same swap for unit, purchase unit and category cells (`:111-121`, `:138-176`).
- Why a typo is «חדש»: matching is exact only (`normalizeProductName` = trim, single spaces, lower-case). Plural,
  spelling variants and niqqud never match. Plan 463 supplies the shared matcher.
- Old price: `view_` already reads the stored price (`current`, `:123`) but only uses it to pick the status; it is
  never shown.
- Matched-by-variant rows would still create duplicates on save: `saveAll` sends `row.name` (`:171`) and the server
  matches by exact normalised name (`server/routes/product-import.js:57-61, 83`). The fix must send the matched
  product's own name.
- Related (not the cause of this example): `server/routes/product-import.js:117-119` creates a purchase unit only when the
  unit word is a base unit or an existing unit term (`knownUnits`). An unknown pack word is dropped
  silently on save, even when the AI read it (kept: S5 warning chip).
- Prompt: `PRICE_LIST_SYSTEM_PROMPT` (`server/routes/ai.js:452-463`) describes one pack/price pattern ("a crate of
  10 kg for 50") and says nothing about word order; no test exercises it (`grep` finds the constant only in
  `ai.js`, and it is not exported). The failure of the messy text is NOT reproduced here (no log, no text);
  the prompt hardening is the evidence-based part and the [human] card is the real check.
- Leaving the page: the route `inventory/import` has no `canDeactivate` (`src/app/app.routes.ts:72-76`); the product
  form routes use `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts`), which calls
  `hasRealChanges()` on the component and shows the shared `unsaved_changes_confirm` modal.
- The directive `textareaAutoGrow` already exists (`src/app/core/directives/textarea-auto-grow.directive.ts`) and is
  used in the recipe workflow; the import paste box (`product-import.component.html:19-29`) has fixed `rows="6"`.

## Goals & Success Criteria
- Primary: every preview row that corresponds to an existing product says so, shows the old price next to the new
  one, stays editable, and saving it updates that product instead of creating a copy.
- Primary: a messy price list (any order of product, price, unit, pack) gives usable rows; a pack word is never lost
  without telling the user.
- Primary: the page never loses typed text or a preview without asking first.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/product-import/**'` passes, including new cases (matcher service mocked with a real `matchProductName`-based fake):
  - a preview row named `עגבניות` with existing product `עגבנייה` (supplier price 5, new price 6.2, supplier chosen) shows status `import_status_update`, the old price text `₪5.00` next to the new price, and the name input is still an `<input>` (not a `<span>`);
  - typing a new name into a «חדש» row (`פטרוזליה` → the name matches product `פטרוזיליה`) switches the row to `import_status_update` with that product's old price while the same input element keeps focus/identity; clearing the name back to an unknown text switches it to `import_status_new`;
  - after parsing, the matcher's AI step (mock returns `{ 'row-name' → product }`) marks that row as matched; editing its name drops the AI link and re-matches by name only;
  - `saveAll` sends the matched product's own name (`עגבנייה`) for a row typed as `עגבניות`, and the typed name for a new row;
  - while the matcher call is pending the save button is disabled and the text `import_matching` is shown; if it fails, the rows stay `import_status_new` and `import_match_failed` is shown;
  - a new row whose purchase unit word is not in the unit registry shows the chip `import_flag_unknown_unit`; a known unit does not;
  - `hasRealChanges()` is false on an empty page, true with text in the box, true with preview rows, false again after a successful save.
- [x] [auto] `npm --prefix server test -- price-list-prompt` passes (Gemini mocked by stubbing global `fetch`): (a) the system prompt sent to Gemini contains the order-independence rules and the failing example `עגבניה ניסיון 1 קילו 1 עוהל 50 שח`; (b) for the fixture text in `server/test/fixtures/price-list-messy.js` and the canned model reply stored beside it, `POST /api/v1/ai/parse-price-list` returns exactly the expected rows (first row: name `עגבניה ניסיון`, `baseUnit` `kg`, `price` 50, no purchase unit — «עוהל»/«עולה» is read as "costs"); (c) staff still get 403 and an unreadable reply still gives 502.
  What this proves: the prompt text, the plumbing and the cleaning rules. What it cannot prove: that the real Gemini model follows the prompt. The real-model check is the [human] card below.
- [x] [auto] `npm --prefix server test` passes.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
- [ ] [human] D2 replay with the real model — `/inventory/import`, paste exactly `עגבניה ניסיון 1 קילו 1 עוהל 50 שח` and press «נתח». One row appears: name «עגבניה ניסיון», unit kg, price 50, and no purchase unit — the word «עוהל» does not appear as a unit or in the name. Then paste the messy text from `server/test/fixtures/price-list-messy.js` (the file is in the repo; the run file `docs/mvp/runs/464.md` copies the text into the card) → rows appear for every product line, the greeting line is skipped, and the page shows no error.
- [ ] [human] D1 replay — SETUP: inventory has a product «פטרוזיליה» with a price from the chosen supplier. Paste `פטרוזליה 7 לק"ג` (a misspelling), press «נתח». The row says «קיים – עדכן מחיר», shows the old price next to 7, and the name box can be clicked and edited. Change the name to a nonsense word → the row becomes «חדש»; type the correct «פטרוזיליה» → it goes back to «קיים – עדכן מחיר» and the cursor stays in the box. Press «שמור הכל» → the summary says 1 updated and `/inventory/list` shows no second parsley product.
- [ ] [human] D4 replay — type any text in the paste box and press the browser back button or the «חזרה למלאי» link → a window asks whether to leave without saving; «ביטול» keeps you on the page with the text intact. Paste a long list (about 15 lines) → the box grows to show all of it with no inner scrolling, on the phone as well as the desktop; after a successful save the box is small again.

## Execution Mode
- Parallel: no against 465 (same component) and against any plan editing `server/routes/ai.js` or `app.routes.ts` in the same run.
- Concurrent plans: 459, 461, 462, 466, 468, 469 may run alongside (no shared file in this scope except `dictionary.json` and `app.routes.ts`, both append-only).
- Isolated DB: no.

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md`; [human] items become validation cards in `docs/mvp/runs/464.md`.
- Depends on: plan 463 (the shared `ProductNameMatcherService`, `matchProductName`) and plan 460 (the dirty-form guard A7 and the textarea auto-grow A6). If plan 460 replaced `pendingChangesGuard` with a new API, follow the API in `plans/460-*.plan.md` / `docs/mvp/runs/460.md` for S6; if it kept the existing guard, use it as described here. If 460 only changed the directive, wire `textareaAutoGrow` as delivered; if 460 did not touch it, use the existing directive.
- Plan 465 (receipt photo) depends on this plan and edits the same component afterwards.
- INV-6: the prompt change stays in `server/routes/ai.js`; the matching AI call is the one from plan 463. Quota: an import is now at most two AI calls (the parse and, only when some names found no match, the matching step). They share the per-user limit of 20 per 15 minutes.
- `product-import.component.ts` is not on the growth-frozen list (283 lines today); the matching lives in plan 463's service, so the component gains only glue.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-import/**
src/app/app.routes.ts
server/routes/ai.js
server/test/**
docs/mvp/runs/464.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — the prompt edit and the export stay in `server/routes/ai.js`; no new key or call path.
- INV-1: preserves — `server/test/**` only gains tests; the import's owner-only check is untouched (staff still get 403).

## Backend Impact
- Collections affected: none changed (the apply route is untouched; the client now sends the matched product's name).
- New collections: no
- Server changes needed: yes, small — a rewritten price-list prompt and an exported constant in `server/routes/ai.js`.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Check by symbol on `origin/mvp`: `view_`, `productsByName_`,
`saveAll`, `updateRow`, `parse` in `product-import.component.ts`; the `@if (item.match)` blocks in
`product-import.component.html`; `PRICE_LIST_SYSTEM_PROMPT` and the `/parse-price-list` route in `server/routes/ai.js`;
`knownUnits` in `server/routes/product-import.js`; `pendingChangesGuard` and the `inventory/import` route; and that
plan 463's `ProductNameMatcherService` exists. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want to see the old price beside the new one so that I know what I am changing.
- As a chef, I want to fix a misspelled name in the preview and see the row become an update of my product so that I don't create a duplicate.
- As a chef, I want messy supplier messages to still turn into rows so that I don't retype them.
- As a chef, I want the page to ask before it throws away what I pasted.

## Functional Requirements

### Must Have (P0)
- [ ] The name box is always editable. A matched row shows, under the name, «קיים במלאי: {product name}»; its price cell shows «היה ₪X» (old price for the chosen supplier) when the status is update.
- [ ] Matching = plan 463's matcher: exact/variant on every name edit (instant); the AI step once after a parse, for names with no match. Editing a name drops an AI link and re-matches by name only.
- [ ] Saving sends the matched product's own name so the server updates the existing product.
- [ ] Parse prompt handles any order of product, price, unit and a pack word; unknown pack words are flagged in the preview instead of vanishing.
- [ ] Leaving with text in the box or with preview rows asks first; the paste box grows with its text.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- The old price sits next to the price input in the same cell (smaller, muted, `dir="ltr"`, formatted with `formatMoney` from `src/app/core/engine/rounding.ts`). No new colours; the existing amber «קיים – עדכן מחיר» chip stays.
- «קיים במלאי: …» is a small muted line under the name input (only when matched); on a phone it wraps under the input.
- While the matching step runs a muted line `import_matching` shows above the table and «שמור הכל» is disabled.
- New dictionary keys (append to `general`):
  - `"import_old_price": "היה"`
  - `"import_matches_existing": "קיים במלאי:"`
  - `"import_matching": "בודק מול המלאי…"`
  - `"import_match_failed": "לא הצלחנו לבדוק מול המלאי בעזרת AI – בדקו ידנית שורות שסומנו כחדשות"`
  - `"import_flag_unknown_unit": "יחידת רכש לא מוכרת – לא תישמר"`
- Logical CSS properties only; component styles stay inside `@layer components.product-import`; no new `.c-*` classes.

## Atomic Sub-tasks
- [x] S1: Keep the name editable and show which product a row matches — render the name `<input>` always; add `matchedId` to the preview row; `view_` finds the match from `matchedId` (AI link) or from `ProductNameMatcherService.matchExact(name)` (ambiguous counts as no match) and also returns the stored price for the chosen supplier as `oldPrice`; template shows «קיים במלאי: …» and keeps the unit, purchase and category cells read-only while matched without ever replacing the name box; editing a name sets `matchedId` back to null — product-import.component.ts, product-import.component.html
- [x] S2: Show the old price next to the new one on update rows — in the price cell add the muted «היה ₪X» text with `formatMoney` when status is update; styles in the component scss — product-import.component.html, product-import.component.scss
- [x] S3: Send the existing product's own name when saving — `saveAll` uses the matched product's `nameHebrew` for matched rows so the server finds it; new rows keep the typed name; no server change — product-import.component.ts
- [x] S4: Check unmatched names against the inventory with the AI step after reading a list — after `parse()` sets the rows, call `ProductNameMatcherService.matchNames` for rows without a name match, set `matchedId` for the answers, show `import_matching` meanwhile and keep save disabled (`canSave_` also requires not matching); on failure keep the rows as new and show `import_match_failed` — product-import.component.ts, product-import.component.html
- [x] S5: Warn when a pack word will not be saved — rows with a purchase unit text that is not a base unit or a key in `UnitRegistryService.allUnitKeys_()` get a «יחידת רכש לא מוכרת – לא תישמר» chip next to the other flags; spec both cases — product-import.component.ts, product-import.component.html, product-import.component.spec.ts
- [x] S6: Ask before leaving with unsaved text or a preview — the component implements `hasRealChanges()` (text not blank or rows present; false after a save) and the `inventory/import` route gets `canDeactivate: [pendingChangesGuard]` (adds one property to the existing route entry); use plan 460's guard if it changed the API — product-import.component.ts, app.routes.ts
- [x] S7: Let the paste box grow with its text — add `textareaAutoGrow` (or the version plan 460 delivered) to the textarea, drop the fixed `rows`, keep a minimum height; after a successful save or a cleared text dispatch an `input` event on the box so it shrinks back; check the phone width — product-import.component.html, product-import.component.ts, product-import.component.scss
- [x] S8: Make the price-list prompt read any order and keep pack words — words like «עולה» / «עלות» / «במחיר» (and close misspellings such as «עוהל») mark the price that follows and are never a unit or part of the name; rewrite `PRICE_LIST_SYSTEM_PROMPT`: product, price, unit and pack can appear in any order and on either side of each other; a price is the number next to ₪ / שח / ש"ח / שקל or the number that is not tied to a unit word; "N kilo/ק"ג/ליטר" next to a unit word is a quantity, never the price; any other word with a number beside it («1 עוהל», «קרטון 24», «ארגז 10 ק"ג») is a pack word: always fill `purchaseUnit` with the word as written and `purchaseQty` with how many of the unit it holds (the written number); never drop a pack word; keep the greeting/heading skip rule; add four worked examples including `עגבניה ניסיון 1 קילו 1 עוהל 50 שח`; export the constant (`module.exports.PRICE_LIST_SYSTEM_PROMPT`) — server/routes/ai.js
- [x] S9: Add messy price lists as test fixtures and a prompt test — fixture file with `MESSY_TEXT` (the failing example, `5.9 ₪ לק"ג - מלפפון`, `קילו בצל 3.5 שקל`, `שמנת 32% 12 ש"ח ליטר`, `ארגז 10 ק"ג תפוחי אדמה 45`, `24 יח' בייגלה בקרטון 150`, and the greeting `שלום וברכה, מחירון לשבוע הבא`), the canned model reply and `EXPECTED_ROWS` (expected: עגבניה ניסיון kg 50, no pack; מלפפון kg 5.9; בצל kg 3.5; שמנת 32% liter 12; תפוחי אדמה kg 4.5 with pack «ארגז»×10; בייגלה unit 6.25 with pack «קרטון»×24; greeting skipped); test file stubs global `fetch` like `gemini-client.test.js`, asserts the prompt content, the rows, 403 for staff and 502 for garbage — server/test/fixtures/price-list-messy.js, server/test/price-list-prompt.test.js
- [x] S10: Add the new texts, build, run all tests and write the run file with the validation cards — append the five keys to the dictionary; `npx ng build`; the `ng test` include and `npm --prefix server test`; copy `MESSY_TEXT` into the D2 card — public/assets/data/dictionary.json, docs/mvp/runs/464.md

## Technical Considerations
- Dependencies: plan 463 (`ProductNameMatcherService.matchExact` / `matchNames`), `UnitRegistryService`, `formatMoney`, `pendingChangesGuard`, `TextareaAutoGrowDirective`.
- New files: `server/test/fixtures/price-list-messy.js`, `server/test/price-list-prompt.test.js`.
- Model changes: none. Backend/API: prompt only; the apply route and its schema are unchanged.
- Auth: unchanged (owner only, `editMoney`).
- The server apply route still matches by the exact normalised name; that is why S3 sends the stored name.
- Data/migration: none.
- Project checks: log-query [auto]; chef-side stories; five new Hebrew keys.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Receipt photos (plan 465).
- Creating the missing unit (taxonomy term) for an unknown pack word at import time; this plan only warns (see question 2).
- Changing the apply route to match by id or fuzzy name.
- Multiple prices per supplier on the preview; per-unit-of-purchase price columns.
- Fixing the dropdown layering/click problems seen on this page (plan 459) and the modal/popover placement (plan 460).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it. Q1 answered: «עוהל» is a typo of «עולה» ("costs"); the line is 1 kg for 50 ₪ — fixtures and S8 follow that reading. Q2: warning chip (recommended).
1. ANSWERED (Human 2026-10-21): «עוהל» is a typo of «עולה» ("costs"); the line is product «עגבניה ניסיון», 1 kg for 50 ₪, no pack.
2. A pack word the app does not know (like «עוהל») is dropped on save today. Recommended: for now show the warning chip (S5) and let the owner add the unit in the product form later. Alternative (a larger plan touching the server apply route and the unit list, INV-5): create the unit automatically on import. Which do you want?
3. An import can now use two AI calls (read the list, then check unmatched names). Recommended: yes, the second call only when some names found no match. Alternative: skip the second call and rely on exact/variant matching only (typos would stay «חדש»).
4. Should rows matched to an existing product that are «ללא שינוי» (same price) stay greyed as today? Recommended: yes, unchanged.
