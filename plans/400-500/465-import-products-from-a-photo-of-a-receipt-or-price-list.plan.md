# Plan 465 — Import products from a photo of a receipt or price list

Status: done
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
Handoff D3 (new feature, Source #34/#37). A chef standing with a supplier receipt wants to photograph it (phone
camera, or an uploaded picture) and get the same editable preview that the pasted price list gives on
`/inventory/import`: name, quantity and price per line, ready to save as new products or price updates.

Verified in code on `mvp` (b7d21fb0):
- How an image reaches the AI today: `POST /api/v1/ai/generate-product-from-image`
  (`server/routes/ai.js:1143-1195`) takes `{ imageBase64, mimeType, hint?, knownCategories?, knownAllergens? }`,
  accepts any `image/*` mime, builds `inlineData` parts and calls `callGemini({ needsVision: true, ... })` with a
  prompt that returns ONE product (`PRODUCT_GENERATE_SYSTEM_PROMPT`, `maxOutputTokens: 1024`). It cannot return a
  list and its output budget is too small for 200 rows. A sibling route for a list is needed.
- The client side: `GeminiService.generateProductFromImage` -> `encodeImage_` (`gemini.service.ts:296-306`) shrinks
  the file with `downscaleImage` (`src/app/core/utils/downscale-image.util.ts`: max edge 1280, JPEG 0.8, files up to
  300 KB are sent as they are; a file the browser cannot decode, such as HEIC on desktop Chrome, is sent unchanged).
  The server caps JSON bodies at 2 MB (`server/app.js:175`, `express.json({ limit: '2mb' })`), so an undecodable
  large file would fail with a 413 and no friendly message. 1280 px is probably too small for a long receipt
  (small print); the shrink function takes `maxEdge` and `quality` parameters, so no change to it is needed.
- Camera input pattern: the AI product window already uses
  `<input type="file" accept="image/*" capture="environment" hidden>` with the `camera` icon
  (`ai-product-modal.component.html:149-156`); `Camera` and `Image` icons are registered in `app.config.ts`.
  `capture` makes many phones open the camera directly and skip the gallery, so a second input without `capture`
  is needed for "choose from gallery / upload".
- Quota and limits: `callGemini` counts one use per call on the server (`incrementUsage`,
  `server/services/gemini-client.js:415`); the browser counts one with `incrementGeminiUsage()`; `aiLimiter` is 20 per
  15 minutes per user (`ai.js:15-22`). The existing price-list route checks `assertCan(req, res, 'editMoney')`
  BEFORE the limiter so staff never burn quota (`ai.js:465-467`); the same applies here (prices are money).
- Reuse: the preview, the 200-row cap and the cleaning of units, duplicates and per-unit prices already live in
  `normalizePriceListRows` (`server/utils/price-list-import.js:57-97`) and the preview in
  `product-import.component.*`. The response of the new route can be the same `{ rows, truncated }` shape, so the
  page shows it without a second preview.
- Not verifiable here: how well Gemini reads real Hebrew receipts (needs a real photo and the key).

Design:
- New route `POST /api/v1/ai/parse-receipt-photo` in `server/routes/ai.js`: owner only, then `aiLimiter`, then ONE
  `callGemini` with `needsVision: true`. Body `{ imageBase64, mimeType, knownCategories? }`, validated by the new Zod
  schema `receiptPhotoRequestSchema` in `shared/schemas/ai-receipt-photo.schema.ts` (mime limited to jpeg, png, webp;
  base64 up to 1,800,000 characters so the whole body stays under the 2 MB limit).
- The model returns what is printed per line — `{ name, quantity, unit, unitPrice, lineTotal }` — not a decision
  about prices. A new pure function `normalizeReceiptRows` in `server/utils/price-list-import.js` turns it into the
  per-unit price: `unitPrice` if printed; else `lineTotal / quantity`; if both are printed and disagree by more than
  5%, use `lineTotal / quantity` and flag the row for review; if only a total and no quantity, use the total as the
  price of 1 and flag it. It then calls `normalizePriceListRows`, so units, duplicates, names and the 200-row cap
  behave exactly as for pasted text.
- The photo is never stored: not written to the database, not logged (only its size and mime type are logged), and
  the browser drops the reference after the call.

## Goals & Success Criteria
- Primary: from `/inventory/import` the owner can take or upload a photo of a receipt and get editable preview rows
  (same table, same save) with the line total versus unit price handled correctly.
- Primary: the photo is sent only through `server/routes/ai.js`, counted against the same AI quota, limited to 200
  rows, and never stored.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/services/gemini.service.spec.ts' --include='src/app/pages/inventory/components/product-import/**'` passes, including new cases:
  - service: `parseReceiptPhoto(file, ['dairy'])` posts `{ imageBase64, mimeType, knownCategories }` to `/api/v1/ai/parse-receipt-photo` and returns `{ rows, truncated }`; a file whose encoded size stays above 1,800,000 characters after the two shrink attempts rejects with `IMAGE_TOO_LARGE` and sends no request; a `application/pdf` file rejects with `IMAGE_TYPE_UNSUPPORTED` and sends no request;
  - component: the page shows a camera button (its hidden input has `capture="environment"` and `accept="image/jpeg,image/png,image/webp"`) and an upload button (same `accept`, no `capture`); choosing a file calls `parseReceiptPhoto` once, fills the preview with the returned rows, shows the hint `import_photo_check_hint`, and increments the AI usage once; the pasted text box is left untouched;
  - component: 429 or `daily_limit_reached` shows `ai_daily_limit_reached_all`; `IMAGE_TOO_LARGE` shows `import_photo_too_big`; `IMAGE_TYPE_UNSUPPORTED` shows `import_photo_unsupported`; any other failure shows `import_photo_failed`; in every case the existing preview rows are kept;
  - component: rows from a photo get the same name matching as pasted rows (plan 463/464): a row named `עגבניות` next to product `עגבנייה` shows `import_status_update`.
- [x] [auto] `npm --prefix server test -- ai-receipt-photo` passes (Gemini mocked by stubbing global `fetch`, as in `server/test/gemini-client.test.js`):
  - no token → 401; staff → 403 and the usage count does not move; missing image → 400; mime `application/pdf` or `image/gif` → 400; base64 longer than 1,800,000 characters → 400 `IMAGE_TOO_LARGE` with no Gemini call;
  - the request that reaches the mocked Gemini holds an `inlineData` part with the sent mime type and data, and the model chain used is a vision model;
  - cleaning (unit tests of `normalizeReceiptRows` and through the route) with a canned model reply: quantity 2 + unit price 5 + total 10 → price 5; quantity 2.35 kg + total 14.1 and no unit price → price 6; unit price 5 + quantity 3 + total 20 → price 6.6667 and `needsReview`; total 12 and no quantity → price 12 and `needsReview`; a line without a name is dropped; a reply of 250 lines → 200 rows and `truncated: true`; unreadable model text → 502;
  - nothing is stored: after a successful call no collection other than the AI usage counter has gained a document.
- [x] [auto] `npm --prefix server test` passes.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
- [ ] [human] On a phone, open `/inventory/import`, press «צלם קבלה», photograph a real supplier receipt (at least 5 lines, one with a quantity above 1) → within about 10 seconds the preview shows one row per product line, each with a name and a price per kg/unit (a line "2 × 5.00 = 10.00" shows 5, not 10) and the hint «נקרא מתמונה – בדקו כל שורה לפני השמירה». Edit one name, press «שמור הכל» → the summary counts match the rows and the products appear in `/inventory/list`.
- [ ] [human] On a desktop, press «העלה תמונה» and choose a photo from disk (a large one, at least 4 MB) → the same preview appears (no "too big" error). Choose a PDF file → the message «יש לבחור תמונה בפורמט JPG, PNG או WEBP» appears and nothing changes.
- [ ] [human] Take a photo that is not a receipt (a wall) → the message «לא זוהו מוצרים בטקסט» (or the photo equivalent) appears, no error screen, and the paste box still works.

## Execution Mode
- Parallel: no against 464 (same component, ordered after it) and against any plan editing `server/routes/ai.js`, `server/utils/price-list-import.js` or `gemini.service.ts` in the same run.
- Concurrent plans: 459, 461, 462, 466, 468, 469 may run alongside (only append-only `dictionary.json` is shared).
- Isolated DB: no.

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md`; [human] items become validation cards in `docs/mvp/runs/465.md`.
- Depends on: plan 464 (preview, matching, dirty-form guard on the import page) and, through it, plans 463 and 460. If 464 renamed the preview helpers, reuse its names; the photo path must feed the same row-building and matching function as the paste path (one `applyResult_`-style method, not a copy).
- INV-6: the photo goes only to the new route in `server/routes/ai.js`; no key in the browser.
- Quota: one AI call per photo (server `incrementUsage` plus the browser's `incrementGeminiUsage()`), and then, as for pasted text, at most one more call from plan 463's matching step when some names have no match. A retry by the user is a new call.
- The global 2 MB body limit (`server/app.js:175`) is not changed; the client shrinks the photo to fit.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-import/**
src/app/core/services/gemini.service.ts
src/app/core/services/gemini.service.spec.ts
src/testing/test-lucide-icons.ts
shared/schemas/ai-receipt-photo.schema.ts
shared/schemas/index.ts
server/routes/ai.js
server/utils/price-list-import.js
server/test/**
docs/mvp/runs/465.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-4: preserves — adds a request schema for an AI route in `shared/schemas`; no entity shape changes; the server validates the body against it before calling Gemini.
- INV-6: preserves — the new route lives in `server/routes/ai.js` (JWT, owner check, `aiLimiter`, `callGemini`); the browser calls it only through `GeminiService`.
- INV-1: preserves — owner-only through the same `assertCan(req, res, 'editMoney', { type: 'products' })` check as the price-list route; staff get 403 before any quota is used.

## Backend Impact
- Collections affected: none (the photo is not stored; saving rows uses the existing `/api/v1/product-import/apply`).
- New collections: no
- Server changes needed: yes — one new route `POST /api/v1/ai/parse-receipt-photo` in `server/routes/ai.js`, one pure function in `server/utils/price-list-import.js`, one schema file.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Check by symbol on `origin/mvp`: `/parse-price-list` route,
`respondFromGeminiFailure`, `callGemini` (`needsVision`), `normalizePriceListRows` and `positiveNumber` in
`price-list-import.js`; `encodeImage_` and `parsePriceList` in `gemini.service.ts`; `downscaleImage`; the preview
helpers in `product-import.component.ts` (as left by plan 464); `express.json` limit in `server/app.js`. Print `ok` or
`conflict: <what>` per symbol.

## User Stories
- As a chef, I want to photograph a supplier receipt so that I don't retype the lines.
- As a chef, I want a line like "2 × 5.00 = 10.00" to give me the price of one so that costs are right.
- As a chef, I want to review and edit every line before anything is saved.

## Functional Requirements

### Must Have (P0)
- [ ] Two buttons next to the paste box: «צלם קבלה» (camera, `capture="environment"`) and «העלה תמונה» (gallery/file); both accept JPG, PNG, WEBP.
- [ ] One AI call reads the photo into at most 200 rows `{ name, unit, per-unit price }`, flagged for review when the price or unit is uncertain.
- [ ] The rows land in the same preview as pasted text, with the same matching to existing products, the same editing and the same save; a banner asks the user to check every line.
- [ ] Photo too large, wrong type, quota reached and AI failure each show a specific message and keep what is on the page.
- [ ] The photo is not stored or logged.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- The two buttons sit in the paste box row (`.import-paste__row`) as `c-btn-ghost` buttons with the `camera` and `image` icons; they stay on one line on desktop and wrap on a phone, each at least 44 px high. While a photo is being read both are disabled and the existing parse button shows its busy state.
- A muted one-line note under the buttons: `import_photo_privacy`.
- After a photo is read, a muted banner above the table: `import_photo_check_hint`.
- New dictionary keys (append to `general`):
  - `"import_photo_camera": "צלם קבלה"`
  - `"import_photo_upload": "העלה תמונה"`
  - `"import_photo_privacy": "התמונה נשלחת לקריאה ב-AI ואינה נשמרת באפליקציה"`
  - `"import_photo_check_hint": "נקרא מתמונה – בדקו כל שורה לפני השמירה"`
  - `"import_photo_too_big": "התמונה גדולה מדי – נסו תמונה קטנה יותר או צלמו מחדש"`
  - `"import_photo_unsupported": "יש לבחור תמונה בפורמט JPG, PNG או WEBP"`
  - `"import_photo_failed": "קריאת התמונה נכשלה – נסו שוב או הדביקו את הטקסט"`
- Logical CSS properties only; styles inside `@layer components.product-import`; no new `.c-*` classes.

## Atomic Sub-tasks
- [x] S1: Define what the photo route accepts — Zod `receiptPhotoRequestSchema` (`imageBase64` string up to 1,800,000 chars, `mimeType` one of image/jpeg, image/png, image/webp, optional `knownCategories` up to 200 strings of 80 chars, optional `model`) and the constant `RECEIPT_IMAGE_MAX_BASE64`; export from the index; run `npm run build:schemas` — shared/schemas/ai-receipt-photo.schema.ts, shared/schemas/index.ts
- [x] S2: Turn printed receipt lines into per-unit prices on the server — pure `normalizeReceiptRows(payload)` as designed above (unit price, else total divided by quantity, 5% mismatch rule, total-only rule), reusing `normalizePriceListRows` for units, duplicates, names and the 200-row cap; `normalizePriceListRows` learns one optional input flag `needsReview: true` that it ORs into its own review rule; unit tests for the five price cases and the cap — server/utils/price-list-import.js, server/test/ai-receipt-photo.test.js
- [x] S3: Add the route that reads a receipt photo with one AI call — `POST /parse-receipt-photo` with `verifyToken`, the owner check (`assertCan(req, res, 'editMoney', { type: 'products' })`), `aiLimiter`, request schema (400 `INVALID_REQUEST` / `IMAGE_TOO_LARGE`), a system prompt that says: read a supplier receipt or invoice photo in Hebrew; return only `{ "rows": [ { "name", "quantity", "unit", "unitPrice", "lineTotal", "category" } ] }`; one row per product line; copy numbers exactly as printed; never compute or invent a price; skip totals, VAT lines, payment, dates, phone numbers and the supplier header; units one of kg, gram, liter, ml, unit; category only from the known list; `callGemini` with `needsVision: true`, 45 s timeout, `maxOutputTokens: 8192`, `eventPrefix: 'ai.parse_receipt_photo'`, `requestedModel(req)`; answer through `normalizeReceiptRows`; log only mime type and size; empty reply gives 200 with no rows, invalid JSON gives 502 — server/routes/ai.js
- [x] S4: Test the route with the AI mocked — stub global `fetch` and call `resetForTests()` as in `gemini-client.test.js`; cover every case listed in Done-when including "nothing stored" and "vision model used" — server/test/ai-receipt-photo.test.js
- [x] S5: Add the browser call that shrinks and sends the photo — `GeminiService.parseReceiptPhoto(file, knownCategories)`: reject `IMAGE_TYPE_UNSUPPORTED` unless the file is jpeg, png or webp; shrink with `downscaleImage(file, 2000, 0.75)`, and if the base64 is still above 1,800,000 characters try `downscaleImage(file, 1400, 0.6)`, then reject `IMAGE_TOO_LARGE`; post `{ imageBase64, mimeType, knownCategories, ...modelParam_() }`; return `{ rows, truncated }`; `encodeImage_` gets optional `maxEdge` and `quality` parameters (default unchanged) — gemini.service.ts, gemini.service.spec.ts
- [x] S6: Add the camera and upload buttons to the import page — two hidden file inputs (camera with `capture="environment"`, upload without), the two ghost buttons with `camera` and `image` icons, the privacy note; choosing a file resets the input value, then runs the shared read-and-fill method used by pasted text (one method taking "the call to make", so errors, quota counting, 200-row notice, matching from plan 464 and the empty-result message are not duplicated); the banner `import_photo_check_hint` shows after a photo read and hides after the next paste read; map `IMAGE_TOO_LARGE`, `IMAGE_TYPE_UNSUPPORTED`, 429 and other errors to their messages; keep the file only in a local variable — product-import.component.ts, product-import.component.html, product-import.component.scss
- [x] S7: Test the page flow — component spec cases from Done-when (buttons and attributes, rows filled, text box untouched, usage incremented once, each error message keeps existing rows, matching applied to photo rows); add the `Image` icon to the test icon set if missing — product-import.component.spec.ts, src/testing/test-lucide-icons.ts
- [x] S8: Add the texts, build, run all tests and write the run file with the validation cards — append the seven keys to the dictionary; `npx ng build`; the `ng test` includes and `npm --prefix server test`; three [human] cards (phone camera, desktop big upload and PDF, non-receipt photo) — public/assets/data/dictionary.json, docs/mvp/runs/465.md

## Technical Considerations
- Dependencies: `callGemini` (`needsVision`), `respondFromGeminiFailure`, `normalizePriceListRows`, `downscaleImage`, `incrementGeminiUsage`, plan 464's shared preview-filling method and plan 463's matcher.
- New files: `shared/schemas/ai-receipt-photo.schema.ts`, `server/test/ai-receipt-photo.test.js`.
- Model changes: none. Backend/API: one new AI route; the apply route is untouched.
- Auth: owner only, before the limiter.
- Security surface: an uploaded file name never reaches the server; only base64 and a whitelisted mime type; size capped; the model's reply is cleaned by the same pure rules as pasted text, so a hostile photo cannot add fields.
- Privacy: the photo leaves the app to Google Gemini for reading; the app keeps no copy and logs only size and type. A receipt can show the supplier's name and the business's purchases.
- Data/migration: none.
- Project checks: log-query [auto]; chef-side stories; seven new Hebrew keys.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- Reading several photos or a multi-page PDF in one go; HEIC conversion on desktop browsers that cannot decode it.
- Saving the photo or attaching it to the products or the supplier.
- Reading the supplier name or date from the receipt, or choosing the supplier automatically.
- Handling VAT: prices are taken as printed.
- Camera cropping or rotation tools in the page.
- Changing the global 2 MB request limit.

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. Image size limit: the plan caps the encoded photo at 1,800,000 characters (about 1.3 MB of image) after shrinking to 2000 px, to stay under the server's existing 2 MB body limit. Recommended: keep it; raising it means changing `server/app.js` and exposes every route to bigger bodies.
2. Formats: JPG, PNG, WEBP only. iPhone photos usually arrive as JPG from the browser's file picker, but a raw HEIC picked on a desktop cannot be shrunk and will be refused with the "choose JPG, PNG or WEBP" message. Recommended: accept that for now.
3. Quota: one photo uses one AI call, and the name-matching step (plan 463) can add a second. Every user shares 20 AI calls per 15 minutes and the daily model budget. Recommended: count them normally; no special allowance for photos.
4. Prices on receipts usually include VAT while supplier price lists often do not. Recommended: store the printed price as is and say nothing; alternatively add a "price includes VAT" switch next to the photo buttons (a follow-up plan).
5. Privacy: the photo is sent to Google's Gemini. On Google's free tier submitted content may be used to improve Google's products (the recipe-photo and product-photo features already work this way). Recommended: accept, with the one-line note under the buttons (`import_photo_privacy`). If the receipts are sensitive, the alternative is to wait for a paid tier (you said no paid tiers), so the note is the mitigation.
6. Should the phone show both buttons or only the camera? Recommended: both; `capture` skips the gallery on many phones.
