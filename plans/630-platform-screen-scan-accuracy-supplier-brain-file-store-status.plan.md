# Plan 630 — Platform screen: how accurate each AI scan flow is per model, how big the shared supplier brain is, and whether files are kept

Status: draft
Depends-on: 627, 620
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The program records, for every AI draft, what the model suggested and what the person finally saved, with a closeness
score (`aiDrafts.keptRatio`, C-AIDRAFT), and every approved invoice grows a supplier brain all businesses share
(C-ALIAS). Nobody can see any of it. Dandan, as platform admin, cannot tell whether the invoice scan is getting
better, which model does it well, how much the shared brain already knows, or that the private file store was never
configured and no file is being kept. This plan (brief MP-09) adds one read route for the platform admin and one
section on the platform screen that shows exactly those three things.

Verified on `origin/main` (e916e48e, 2026-11-17):
- The platform screen is `src/app/pages/platform-dashboard/platform-dashboard.page.ts` (318 lines; the map's "Reality
  Check deltas" call it `platform.page.ts` — no such file exists), route `platform` in `src/app/app.routes.ts:293`
  behind `platformAdminGuard`. Its template mounts two self-loading child sections at the bottom:
  `<app-platform-logistics-items />` (line 241) and `<app-platform-ai-shots />` (line 243), from
  `src/app/pages/platform-dashboard/components/`. The page spec (325 lines) removes both children with
  `TestBed.overrideComponent(PlatformDashboardPage, { remove: { imports: [...] } })` (lines 124–125).
- The pattern for a new section is `components/platform-ai-shots/platform-ai-shots.component.ts`: `OnInit` load
  through `PlatformAdminService`, `isLoading_` signal, `app-empty-state`, a failure = `logging.error` +
  `userMsg.onSetErrorMsg(translate(key))`, accuracy shown with `formatPctInt(keptRatio * 100)` or «—».
- `PlatformAdminService` (`src/app/core/services/platform-admin.service.ts`, 161 lines, has a spec) calls
  `${environment.apiUrl}${API.admin('<path>')}`; `API.admin('learning/stats')` gives `/api/v1/admin/learning/stats`
  with no change to the `API` map. It already exports row types of its own (`BusinessRow`).
- Server: platform-admin routes use `verifyToken, requirePlatformAdmin` (`server/middleware/auth.js:102`; a
  non-admin gets 403 `{ error: 'Admin access required' }`). `server/routes/admin.js` (437 lines) shows the style;
  `jerusalemDate(ms)` is exported by `server/middleware/usage.js`; `MASTER_BUSINESS_ID` by
  `server/utils/business-scope.js`.
- Admin route tests: `server/test/admin-frontdesk-stats.test.js` is the pattern (`buildTestApp`, `signTestToken`,
  `testDb`; `ADMIN = { userId, role: 'admin', businessId, businessRole: 'owner', isPlatformAdmin: true }`; fixture
  rows inserted straight into the collections). No model call, file store call or network is needed for this plan's
  tests.
- `callGemini` returns the model it used (`{ kind: 'ok', model, data }`, `server/services/gemini-client.js:505`), but
  the C-AIDRAFT shape has no `model` field — see Execution Notes and the first requirement below.
- Icons `alert-triangle` and `chevron-down` are registered in `src/app/app.config.ts` and in `TEST_LUCIDE_ICONS`.
- Not on `e916e48e`, created by the plans this one depends on (their Contracts are below): the router
  `server/routes/admin-learning.js` mounted at `/api/v1/admin/learning` (615, empty) with `GET /status` →
  `{ fileStore: boolean }` (619); the collections `aiDrafts` (618), `invoiceAliases` and `supplierProfiles` (627);
  `mayLearnFrom(business)` in `server/utils/ai-learning.js` (618); `business.aiPrivate` (615, 616); the platform
  dialog and the "modules" column on the platform screen (620).

## Goals & Success Criteria
**Primary:** the platform admin opens `/platform` and reads, per AI flow and model, how many drafts were made and how
close they were to what people saved, week by week; how many suppliers, names and businesses the shared brain holds;
and a plain note when files are not being kept.

- [auto] `pnpm run test:server` passes, including the new `server/test/learning-stats.test.js` (pure function, fixed `now`): two confirmed drafts of one flow and model with `keptRatio` 0.5 and 1 give `drafts: 2, confirmed: 2, avgKeptRatio: 0.75`; a pending draft counts in `drafts` only; a confirmed draft with no `keptRatio` counts in `confirmed` and not in the average; a group with no scored draft has `avgKeptRatio: null`; drafts of two models of one flow are two rows; a draft with no `model` lands in the row whose `model` is `null`; a draft dated Sunday 2026-11-15 00:30 and one dated Saturday 2026-11-14 23:30 (Asia/Jerusalem) land in the weeks `2026-11-15` and `2026-11-08`; weeks are ascending.
- [auto] `pnpm run test:server` passes, including the new `server/test/admin-learning-stats.test.js` (route): drafts of a business with `aiPrivate: true` are left out of every number and `privateBusinesses` is 1; a draft whose business no longer exists (a stripped row: `feature`, `model`, `keptRatio`, `status`, `at`, `confirmedAt`, `businessId` only) is counted in its flow and in the average; a draft older than `days` is left out; `brain` is `{ suppliers: 2, names: 3, businesses: 2 }` for the fixture (2 `supplierProfiles`, 3 master alias rows and 1 own alias row, contributors `['b1']`, `['b1','b2']`, `['b2']`); the response text contains none of the fixture's business ids, business names, printed names or supplier names; an owner token gets 403; no token gets 401; `days=6`, `days=366` and `days=x` get 400 `BAD_DAYS`.
- [auto] `pnpm run test:ci` passes, including `src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.spec.ts` (rows from a stubbed service with the flow label, model, counts and «75%»; a `null` model shows `platform_learning_model_unknown`; a `null` average shows «—»; the week list opens and closes on the row's chip; the brain numbers; the private note only when the count is above 0; the file-store note only when `fileStore` is `false`; the empty state; a failed load shows `platform_learning_error`), the two new cases in `src/app/core/services/platform-admin.service.spec.ts`, and the unchanged cases of `src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts`.
- [auto] `pnpm run lint` exits 0, `pnpm --dir server run lint` exits 0, `pnpm run lint:icons` exits 0, `pnpm run lint:reuse` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/platform` (the two learning routes answered by prepared fixtures: `status` → `{ "fileStore": false }`, `stats` → one `invoice_read` flow) the section «למידת המערכת» shows the text «אחסון הקבצים הפרטי אינו מוגדר» (`e2e/ui/630-1.spec.ts`).
- [human] After scanning three invoices in a test business, Dandan opens `/platform`: the invoice-read row counts them, the accuracy reads as he expects from how much he corrected, and the brain numbers moved.

## Execution Mode
- Parallel: no — 620 and 632 also edit `src/app/pages/platform-dashboard/**` (620 is merged before this plan; 632 belongs to a later run and must never be live together with this one); 628 and 629 run before it in the same run and, like 620, 623, 624, 632, 634, 636, 637, append to `public/assets/data/dictionary.json`; 619 wrote `server/routes/admin-learning.js` (merged).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/admin-learning.js
server/utils/learning-stats.js
server/test/learning-stats.test.js
server/test/admin-learning-stats.test.js
server/breadcrumbs.md
src/app/core/services/platform-admin.service.ts
src/app/core/services/platform-admin.service.spec.ts
src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.ts
src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.html
src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.scss
src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
public/assets/data/dictionary.json
e2e/ui/630-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/routes/admin-learning.js` (in INV-1's `Touches` once plan 615 has merged) gains one read behind `verifyToken, requirePlatformAdmin`; it writes nothing, returns counts and averages only — no business id, no business name, no document — and leaves live private businesses out through `mayLearnFrom` (a deleted business's rows are already stripped to numbers by plan 619).
- INV-2: preserves — the route reads the server-only collections `aiDrafts`, `invoiceAliases`, `supplierProfiles` and the `aiPrivate` flag of `businesses` for the platform admin only; no scoped business query is added or changed and nothing is copied between businesses.

## Reuse Check

- `GET /stats` handler in `server/routes/admin-learning.js` — family: server-auth — rung: 1 — why: `verifyToken` + `requirePlatformAdmin` as every platform route uses them.
- `buildLearningStats`, `weekStart` in `server/utils/learning-stats.js` — family: none — rung: 4 — why: pure server-side grouping of draft rows into flows and weeks; no server helper groups by week, and keeping it pure lets the week rule be tested with a fixed clock.
- `PlatformAdminService.getLearningStats` — family: http — rung: 3 — why: a new method on the existing admin service, same `API.admin(...)` pattern.
- `PlatformAdminService.getLearningStatus` — family: http — rung: 3 — why: a second new method on the same service, same pattern.
- `app-platform-learning` section — family: empty-state — rung: 1 — why: a page-local section like `platform-ai-shots` (`c-glass-panel`, its own table styles) that uses `app-empty-state` as is.
- "By week" control on a flow row — family: chip — rung: 1 — why: a `button` with `c-chip c-chip--tap` and `aria-expanded`, the engine's own reveal control.
- File-store and private-business notes — family: feedback — rung: 1 — why: plain text lines with a registered icon; a failed load uses `LoggingService` + `UserMsgService`.
- `platform-learning`, `.platform-learning`, `.learning`, `.learning__title`, `.learning__desc`, `.learning__hint`, `.learning__warn`, `.learning__scroll`, `.learning__table`, `.learning__week`, `.learning__heading`, `.learning__numbers`, `.learning__brain` — family: empty-state — rung: 1 — why: page-local layout of the one section, as `.ai-shots*` is for `platform-ai-shots`; the empty state itself is the shared `app-empty-state`.
- Accuracy text — family: helpers — rung: 1 — why: `formatPctInt` from `src/app/core/engine/rounding.ts`, as `platform-ai-shots` does.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to see per AI flow and model how close the drafts were to what people saved so that I know whether the scan is good enough to sell and which model to keep.
- As the platform admin, I want to see the numbers week by week so that I can tell whether the memory is making the scan better.
- As the platform admin, I want to know how many suppliers and names the shared brain holds and how many businesses feed it so that I can say what a new customer gets on day one.
- As the platform admin, I want to be told plainly when files are not being kept so that I add the storage keys before a customer asks for an invoice file.
- As a chef-owner of a private business, I want my drafts left out of the platform's numbers so that "private" means what I was told.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-AIDRAFT (618; used by 622, 625, 626, 633, 637)**
  - Collection `aiDrafts` (server-only): `{ _id, businessId, userId, feature, subject?: { type: 'menuEvent' |
    'invoice' | 'diagnosis' | 'stockCount', id?: string }, input: { text?: string (≤ 20,000), fileId?: string },
    aiDraft, model?: string, saved?, keptRatio?: number (0–1), status: 'pending' | 'confirmed', at, confirmedAt? }`
    (`model` = the model that answered, so accuracy can be read per model).
    Index `{ businessId, feature, at }`. At most the newest 500 per business and feature are kept.
  - `server/services/ai-drafts.js`: `saveAiDraft(req, { feature, subject?, input, aiDraft, model? }) → draftId` (never
    throws; on failure returns `null` and the feature still answers); `confirmAiDraft(req, draftId, saved, ratio)`
    — `ratio` is a pure function `(aiDraft, saved) → 0..1` owned by the feature (lines saved unchanged / lines
    suggested). A draft of another business answers 404.
  - Nothing from `aiDrafts` is returned by a business route except its `_id`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LEARN (618; used by 627, 630, 633)**
  - `business.aiPrivate?: boolean` — platform admin only (C-MODULES platform write). Absent = shared (D8).
  - `server/utils/ai-learning.js` → `mayLearnFrom(business) → business?.aiPrivate !== true`. The only test any code
    uses before it (a) copies something into a `'__master__'` pool, (b) lists a business's AI material for the
    platform admin. A private business keeps its own per-business memory and its own drafts.
  - `setAiPrivate(id, value)` in `server/services/business.js` replaces `setShareAiExamples`: turning private on
    deletes the business's promoted `GEMINI_SHOTS` copies (`promotedFrom.businessId`) and calls
    `forgetBusiness` (C-ALIAS; 618 leaves a one-line placeholder and 627 adds the real call).
  - Removed: `PUT /api/v1/business/share-ai-examples`, `shareAiExamplesInputSchema`,
    `BusinessService.updateShareAiExamples`. `business.shareAiExamples` stays in the schema as optional so stored
    documents validate; nothing reads it.
  - `GET /api/v1/admin/ai-shots` candidates and `POST …/promote`: every business with `mayLearnFrom` true.
  - Deleting a business keeps what the platform learned from it (Dandan, 2026-11-17). Always deleted, as the
    business's own records: `priceHistory`, its own `invoiceAliases`, its `storedFiles` and the provider files
    (recordings, invoice files), its `businessAccess` rows. Kept when the business is not private at that moment: its
    contributions to the shared supplier brain, its promoted recipe examples, and its `aiDrafts` rows reduced to
    numbers (`feature`, `model`, `keptRatio`, `status`, `at`, `confirmedAt`, `businessId`; no input, draft, saved text
    or user id). A private business leaves nothing. To erase everything of a business, the platform admin turns
    private mode on, then deletes it (619).
  - The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
    key saying private mode is arranged by contacting FoodVibe. It calls no route.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-ALIAS (627; used by 628, 630)**
  - `invoiceAliases` (server-only). Own alias: `{ _id, businessId, supplierKey, nameKey, printedName, productId,
    unit?, packQty?, hits, lastAt }`, unique `{ businessId, supplierKey, nameKey }` over rows that have a `productId`
    (a partial index) — the person's latest link wins. `packQty` is not filled in this program (no read gives it).
    Shared alias: `{ _id, businessId: '__master__', supplierKey, nameKey, printedName, masterProductId, hits,
    contributors: string[] (≤ 200, never returned), lastAt }`, unique `{ supplierKey, nameKey, masterProductId }`
    over rows that have a `masterProductId` (a partial index; the two unique indexes never meet on one row).
    `nameKey = normalizeProductName(printedName)`.
  - `supplierProfiles` (server-only, shared): `{ _id: supplierKey, names: string[] (≤ 10), vatIncludedYes,
    vatIncludedNo, invoices, contributors: string[] (≤ 200, never returned), lastAt }`.
  - Neither shared shape has a price, a quantity or a date of purchase (a schema test asserts the key list).
  - `server/services/invoice-memory.js`: `learnFromApply(db, business, { supplierKey, supplierName, vatIncluded,
    lines: [{ printedName, productId, unit? }] })` — always writes own aliases; writes shared rows only when
    `mayLearnFrom(business)` and the product is from the shared catalog (a live `products` document with
    `businessId: '__master__'` and `_id === product._masterId`); `resolveNames(db, businessId, { supplierKey,
    names }) → [{ i, productId, source: 'own' | 'shared' }]` — own first; shared = the target with the most
    contributors (newest on a tie), mapped to the business's live product whose `_masterId` is that target;
    `forgetBusiness(db, businessId)` — pulls the business from every `contributors` list and deletes rows left empty.
  - `POST /api/v1/product-import/resolve` body `{ supplierKey, names: string[] (≤ 200) }` (owner or consultant) →
    `{ matches }`. No model call.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-FILES (619; used by 621, 626, 628)**
  - `server/services/file-store.js`: `isFileStoreConfigured()` (all of `CLOUDINARY_CLOUD_NAME`,
    `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set); `putPrivateFile(req, { kind: 'invoice' | 'voice', mimeType,
    buffer, deleteAfterDays? }) → fileId | null` — `null` when not configured or when the upload fails (one warn log with kind and
    size, never the content; never throws); `signedFileUrl(file, ttlSeconds)`; `deleteStoredFile(file)`;
    `setFileStoreForTests(fake)`.
  - Upload is signed by the server and delivered as an authenticated (non-public) asset; no new npm dependency
    (`node:crypto` + `fetch`). The request shapes are in 619, taken from the provider's documentation as read on
    2026-11-17 and built by pure functions in `server/services/cloudinary-requests.js`: a signed delivery URL does not
    expire there, so the 300-second link is the provider's API download endpoint with `expires_at`.
  - `server/app.js` gains `media-src` in the content security policy (619), so a recording can be replayed from a
    `blob:` and from a stored file.
  - Collection `storedFiles` (server-only): `{ _id, businessId, kind, mimeType, bytes, provider: 'cloudinary',
    providerId, resourceType, format?: string (≤ 12, from the provider's upload answer), createdBy, createdAt,
    deleteAfter?: number }`. Index `{ businessId, kind, createdAt }`.
  - `GET /api/v1/files/:id` → `{ url }` (expires in 300 s) for a member of the file's business; 404 otherwise.
    An invoice file: owner (and consultant) only — it shows prices.
  - Limits: base64 ≤ 1,800,000 characters (the JSON body limit is 2 MB). Mime allowlists — invoice:
    `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; voice: `audio/webm`, `audio/mp4`, `audio/ogg`,
    `audio/mpeg`, `audio/wav`.
  - Retention: a voice file gets `deleteAfter = createdAt + 730 days`; `server/jobs/retention.js` deletes the
    provider asset and the document of every stored file whose `deleteAfter` has passed (lazy, same throttle). An
    invoice file is stored at read time with `deleteAfterDays: 30`; when `apply` writes the invoice it calls
    `keepStoredFile(db, businessId, fileId)` (`file-store.js`), which clears `deleteAfter` — so a read nobody saved is
    cleaned up, and a kept invoice's file lives as long as its invoice.
  - Model input: `callGemini` gains `needsMedia?: 'image' | 'audio' | 'pdf'` (`needsVision: true` keeps meaning
    `'image'`); a model that cannot take the medium is skipped in the chain; ledger rows gain `audioSeconds?` and
    `fileCount?`.
  - `GET /api/v1/admin/learning/status` → `{ fileStore: boolean }`.
- [ ] **Which model a draft came from:** the group key is the flow (`feature`) plus `model`, where `model` is the stored draft's `model` when it is a non-empty string, else `null`. C-AIDRAFT stores no model today, so until a draft carries one every flow has a single row with `model: null`, shown as «לא נרשם»; the section needs no change the day the field appears. This plan adds no field and edits no schema.
- [ ] **`server/utils/learning-stats.js`** (new, pure, no database):
  - `weekStart(dateStr)` — `dateStr` is a `YYYY-MM-DD` day; returns the `YYYY-MM-DD` of the Sunday that starts its week (the week runs Sunday to Saturday).
  - `buildLearningStats(drafts, { dayOf })` — `drafts`: `[{ feature, model?, status, keptRatio?, at }]`; `dayOf(ms)` → the `YYYY-MM-DD` day (the route passes `jerusalemDate`). Returns `[{ feature, model: string | null, drafts, confirmed, avgKeptRatio: number | null, weeks: [{ week, drafts, confirmed, avgKeptRatio }] }]`, sorted by `feature` then `model` (`null` last), `weeks` ascending. `confirmed` = rows with `status === 'confirmed'`; `avgKeptRatio` = the mean of `keptRatio` over confirmed rows whose `keptRatio` is a finite number from 0 to 1, rounded to 4 decimals, `null` when there is none. The same rule per week.
- [ ] **`GET /api/v1/admin/learning/stats`** in `server/routes/admin-learning.js` (`verifyToken, requirePlatformAdmin`; the file's existing `GET /status` is not touched):
  - `days`: absent → 90; otherwise an integer from 7 to 365, else 400 `{ error: 'BAD_DAYS' }`.
  - businesses: `businesses.find({}, { projection: { aiPrivate: 1 } })`; `private` = the ids of the live businesses for which `mayLearnFrom(business)` is false; `privateBusinesses` = their number (the `'__master__'` id is never counted).
  - drafts: `aiDrafts.find({ at: { $gte: Date.now() - days × 86,400,000 } }, { projection: { businessId: 1, feature: 1, model: 1, status: 1, keptRatio: 1, at: 1 } }).sort({ at: -1 }).limit(20000)`; rows whose `businessId` is in `private` are dropped; every other row goes to `buildLearningStats` — a draft whose business was deleted included: plan 619 keeps such rows reduced to numbers (and deletes a private business's rows entirely), so what the platform learned outlives the business. `truncated` = the read returned 20,000 rows.
  - brain: `suppliers` = `supplierProfiles.countDocuments({})`; `names` = `invoiceAliases.countDocuments({ businessId: MASTER_BUSINESS_ID })`; `businesses` = the size of the union of `invoiceAliases.distinct('contributors', { businessId: MASTER_BUSINESS_ID })` and `supplierProfiles.distinct('contributors')`. The lists themselves never leave the handler.
  - answer: `{ days, from, to, flows, brain: { suppliers, names, businesses }, privateBusinesses, truncated }` (`from` / `to` = the Asia/Jerusalem days of the window's ends). No business id, no business name, no draft content, no printed name.
  - log: failure only — `req.log.error({ err, event: 'admin.learning_stats.failed' })` and 500 `{ error: 'Server error' }`.
- [ ] **`PlatformAdminService`** gains the exported types `LearningFlowRow`, `LearningWeekRow`, `LearningStats` (the answer above) and the methods `getLearningStats(days = 90): Promise<LearningStats>` (`GET API.admin('learning/stats')`, query `days`) and `getLearningStatus(): Promise<{ fileStore: boolean }>` (`GET API.admin('learning/status')`).
- [ ] **Section `app-platform-learning`** — new child component in `src/app/pages/platform-dashboard/components/platform-learning/`, structured like `platform-ai-shots` (`OnInit`, `isLoading_`, signals `stats_`, `fileStore_ = signal<boolean | null>(null)`, `openKey_ = signal<string | null>(null)`), mounted in `platform-dashboard.page.html` on the line after `<app-platform-ai-shots />` and added to the page's `imports` (two lines in `platform-dashboard.page.ts`); the page spec adds it to the children it removes. The section (`c-glass-panel`, `data-testid="platform-learning"`) shows, top to bottom:
  1. the title `platform_learning_title` and the description `platform_learning_desc`;
  2. when `fileStore_() === false`: one amber line with the icon `alert-triangle` and `platform_learning_no_file_store` (`role="status"`, `data-testid="learning-no-file-store"`); nothing when it is `true` or the status call failed;
  3. the flows table — columns `platform_learning_col_flow` (the label `ai_feature_<feature>`), `platform_learning_col_model` (the model name, `dir="ltr"`, or `platform_learning_model_unknown`), `platform_learning_col_drafts`, `platform_learning_col_confirmed`, `platform_learning_col_kept` (`formatPctInt(avgKeptRatio * 100)`, or «—» when `null`), and a last cell with the button `c-chip c-chip--tap` «לפי שבוע» (`platform_learning_by_week`, `aria-expanded`, icon `chevron-down`); pressing it shows under the row that flow's weeks (week start `dd/MM/yy`, drafts, confirmed, average), pressing it again or opening another row closes it — one open at a time; rows `data-testid="learning-flow-row"`;
  4. with no flows: `app-empty-state` `messageKey="platform_learning_empty"` in place of the table;
  5. when `truncated`: the line `platform_learning_truncated`;
  6. the brain block, title `platform_learning_brain_title`: three numbers with the labels `platform_learning_brain_suppliers`, `platform_learning_brain_names`, `platform_learning_brain_businesses` (`data-testid="learning-brain"`);
  7. when `privateBusinesses > 0`: the line `platform_learning_private_note` with `{count}` replaced.
- [ ] **Loading, error, empty, edit, leave:** the two calls run together on init; nothing of the section but its title renders until they settle. A failed stats call → `logging.error({ event: 'platform.learning_load_failed', … })` + `userMsg.onSetErrorMsg(translate('platform_learning_error'))`, and the section shows the empty state. A failed status call is logged the same way without a toast and shows no note. The section is read-only: nothing to edit, save, cancel or confirm; leaving the page needs no rule. There is no period picker (the window is the last 90 days).
- [ ] `server/breadcrumbs.md` gains one row for `utils/learning-stats.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; numbers and model names `dir="ltr"` with `c-num`; the table reuses the look of the page's AI usage table through page-local classes `learning*` in the new `.scss` (no new `.c-*` class); on a phone the table scrolls inside its own wrapper.
- New keys, appended to the `general` section of `public/assets/data/dictionary.json` (none exists today):
  - `platform_learning_title` «למידת המערכת» (section title) · `platform_learning_desc` «כמה קרוב היה ה-AI למה שאנשים שמרו בסוף, לפי פעולה ומודל, ומה גודל הזיכרון המשותף של הספקים» (description)
  - `platform_learning_col_flow` «פעולה» · `platform_learning_col_model` «מודל» · `platform_learning_col_drafts` «טיוטות» · `platform_learning_col_confirmed` «אושרו» · `platform_learning_col_kept` «דיוק ממוצע» · `platform_learning_by_week` «לפי שבוע» · `platform_learning_col_week` «שבוע שמתחיל ב-» · `platform_learning_model_unknown` «לא נרשם» (no model recorded)
  - `platform_learning_empty` «עדיין אין טיוטות AI ב-90 הימים האחרונים» · `platform_learning_truncated` «מוצגות 20,000 הטיוטות האחרונות בלבד» · `platform_learning_error` «טעינת נתוני הלמידה נכשלה»
  - `platform_learning_brain_title` «הזיכרון המשותף של הספקים» · `platform_learning_brain_suppliers` «ספקים» · `platform_learning_brain_names` «שמות מוצרים מקושרים» · `platform_learning_brain_businesses` «עסקים תורמים»
  - `platform_learning_private_note` «{count} עסקים במצב פרטי אינם נכללים במספרים» · `platform_learning_no_file_store` «אחסון הקבצים הפרטי אינו מוגדר: חשבוניות והקלטות נקראות כרגיל, אבל הקובץ לא נשמר»
  - Flow labels, each appended only when the key is absent at build time (an earlier plan of the program may have added it): `ai_feature_logistics_extract` «פענוח סיור שטח» · `ai_feature_invoice_read` «קריאת חשבונית» · `ai_feature_menu_prices_parse` «קריאת תפריט עם מחירים» · `ai_feature_stock_extract` «ספירת מלאי בקול או בטקסט». `ai_feature_voice_transcribe` exists.
- Lucide icons: `alert-triangle`, `chevron-down` — both already registered in `src/app/app.config.ts`. No new icon; `app.config.ts` is not edited.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Group draft rows by flow, model and week in one pure function that tests can pin a date on — weekStart and buildLearningStats with the average and rounding rules; the fixtures of the first Done-when item — server/utils/learning-stats.js (new), server/test/learning-stats.test.js (new)
- [x] A2: Give the platform admin one read of scan accuracy and brain size that never includes a private business — GET /stats (days check, mayLearnFrom filter, 20,000 cap, three brain counts, counts-only answer), route tests with the fixtures of the second Done-when item, breadcrumbs row — server/routes/admin-learning.js, server/test/admin-learning-stats.test.js (new), server/breadcrumbs.md
- [x] A3: Let the browser's admin service fetch the learning numbers and the file-store status — the three types, getLearningStats and getLearningStatus, two spec cases with HttpTestingController — src/app/core/services/platform-admin.service.ts, src/app/core/services/platform-admin.service.spec.ts
- [x] A4: Build the learning section so the numbers can be read on the platform screen — the component (table, by-week reveal, brain block, private note, file-store note, empty and error states), its styles and spec, every dictionary key of the UI notes — src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.ts (new), src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.html (new), src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.scss (new), src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.spec.ts (new), public/assets/data/dictionary.json
- [x] A5: Mount the section on the platform screen without disturbing what is there — one template line after the AI examples section, the import, the page spec's removed-children list — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
- [x] A6: Prove the file-store note in the running app, then run every check — 630-1 answers the status and stats routes with page.route and reads the note; then test:server, test:ci, both lints, lint:icons, lint:reuse, build, log-query — e2e/ui/630-1.spec.ts (new)

## Technical Considerations
- Dependencies: `mayLearnFrom` (`server/utils/ai-learning.js`, 618), the `aiDrafts` rows (618; written by 622, 626 and later flows), `invoiceAliases` / `supplierProfiles` (627), `GET /status` (619), the platform page as plan 620 left it.
- New files needed: `server/utils/learning-stats.js`, `server/test/learning-stats.test.js`, `server/test/admin-learning-stats.test.js`, the four `platform-learning` files, `e2e/ui/630-1.spec.ts`.
- Model changes: browser types in `platform-admin.service.ts` only (no new model file). No schema change.
- Backend / API: new `GET /api/v1/admin/learning/stats?days=90`. Dedicated, not the generic API: the three collections are server-only and the answer is aggregates across businesses for the platform admin.
- Auth and validation: platform admin only (`requirePlatformAdmin`); `days` validated; no body.
- Security surface: a cross-business read, so the answer is counts and averages only — tested to contain no business id or name, no printed name, no supplier name; `contributors` never leaves the handler; private businesses are excluded by the one function `mayLearnFrom`. No secret; the file-store note says only configured or not.
- Data / migration: none. Cost: one read of `aiDrafts` by date (no index on `at` alone; the collection is capped at 500 rows per business and feature, and the read is projected and limited to 20,000) plus two counts and two `distinct` — run only when the platform admin opens the page. Watch it against the real database once the pilot has data.
- Project checks: `[auto] log-query`; new dictionary keys named with Hebrew values; icons named (both registered); Reuse Check filled with the one rung-4 reason; dedicated endpoint named and justified; `pnpm run test:server` + `pnpm run test:ci`; hotspot `dictionary.json` append-only; the `[ui]` spec signs in with `signInQa` (the QA user must be the platform admin, as the existing `/platform` specs `e2e/ui/611-1.spec.ts` and `e2e/ui/612-1.spec.ts` assume).

## Out of Scope
- Adding a `model` field to `aiDrafts` or passing the model to `saveAiDraft` (a Contract change, reported to the Planner).
- The recipe examples' accuracy (`GEMINI_SHOTS`, plans 600 and 612) — it stays in the AI examples section.
- A period picker, a chart, a CSV export, per-business rows, drill-down to a single draft.
- Configuring the file store, or showing anything about it beyond configured / not configured.
- Any change to `GET /api/v1/admin/learning/status`, to the businesses table or to the platform dialog (plans 619, 620, 632).
- Editing or deleting anything in the supplier brain.

## Critical Questions
- none

## Execution Notes
- decided: rows are grouped by flow and by the draft's own `model`, read defensively (`null` when absent) — why: MP-09 asks "per model" but C-AIDRAFT stores no model; the section works today and lights up without a change when the field is added.
- decided: "over time" is weeks starting Sunday in Asia/Jerusalem, over the last 90 days, opened per row — why: a pilot has too few drafts for days and needs a trend sooner than months; the Israeli week starts on Sunday.
- decided: the average is over confirmed drafts that carry a score; pending drafts count only in "drafts" — why: a draft nobody saved has no closeness to anything.
- decided: a private business is left out by loading the businesses and asking `mayLearnFrom` for each — why: C-LEARN makes that function the only test. A draft whose business was deleted is counted (the Human's decision: deleting a business keeps what the platform learned; plan 619 leaves those rows as numbers only).
- decided: "businesses contributing" is the number of distinct ids across the `contributors` lists of the shared alias rows and the supplier profiles — why: counts only, as the Contract requires; the ids never leave the handler.
- decided: grouping is a pure function in `server/utils/`, the route only reads and filters — why: the week rule is tested with a fixed clock and no faked `Date`.
- decided: the types live in `platform-admin.service.ts` — why: no new file under `src/app/core/models/`, so no breadcrumbs edit there.
- decided: no row for the new route in `docs/agent/standards-backend.md` — why: that table does not list the program's other new routes; the Planner can add the program's routes in one pass.
- decided: the four `ai_feature_*` labels of the program's new flows are added here only if missing — why: the platform's AI usage table already looks them up by that name, and no earlier card names who adds them.
- evidence: pnpm run build -> 0; pnpm run lint -> 0 errors; pnpm run test:ci -> 2419 of 2419 SUCCESS; pnpm run test:server -> 1812 passed; lint:icons, lint:reuse, breadcrumbs-check -> ok; log-query -> SKIP no database.
- note: the four ai_feature_* flow labels already existed in dictionary.json, so none were added. 630-1 e2e written, not run.
