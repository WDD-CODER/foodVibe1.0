# Plan 600 — Recipe AI examples count only saved recipes, plus a shared pool the platform admin curates

Status: draft
Depends-on: 582
Snapshot: a1de3cdb

## Problem Statement
Raised by the Human on 2026-11-14 after batch-6 (plan 582 made recipe AI examples per business, PR #573).

- **Weak "approved" signal.** `ai-recipe-modal.component.ts:303` (`onDraftApproved`) saves the AI draft as an `approved` example in `GEMINI_SHOTS` the moment the cook clicks to continue into the recipe builder. Nobody checks that the recipe was saved, or how much of the draft the cook kept. A draft the cook rewrote by hand still teaches the AI.
- **No shared learning.** Since plan 582 each business learns only from its own examples (`getApprovedShots(req)`, `server/routes/ai.js:255`). A new business starts with none. The Human wants the AI to learn from every kitchen's experience, but only from good, chosen examples and only with the source business's consent (Human, 2026-11-14: opt-in businesses).
- **Dead data.** 28 old `GEMINI_SHOTS` documents (local `foodvibe` DB, counted 2026-11-14) have no `businessId` and no `userId`. Nothing reads them after plan 582 and the per-business prune never reaches them (batch-6 decision D1).

## Goals & Success Criteria
**Primary:** the AI's recipe examples are recipes a cook actually saved; a business that opted in can have its examples promoted by the platform admin into a shared pool that every business's AI uses after its own examples.

- [auto] `server/test/ai-shots-saved.test.js` (new): `POST /api/v1/ai/shots` with `status: 'pending'` and a `shotKey` stores a `pending` shot; a `POST /api/v1/ai/generate` by the same business does not send its prompt to Gemini (stubbed `fetch` body); after `POST /api/v1/ai/shots/confirm` with that `shotKey`, a changed draft and a `recipeId`, the same generate call sends the **confirmed** draft's dish name, and the stored shot has `status: 'approved'`, `aiDraft` (the original), `recipeId` and a `keptRatio` between 0 and 1.
- [auto] `server/test/ai-shots-saved.test.js`: `POST /api/v1/ai/shots` with `status: 'approved'` answers 400; a confirm for another business's `shotKey` answers 404 and changes nothing; a confirm whose draft holds "ignore previous instructions" answers 400.
- [auto] `server/test/ai-recipe-helpers.test.js`: `keptRatio` — same ingredient names → 1; half kept → 0.5; empty AI draft → 0; names compared trimmed, case- and space-insensitive. `pickShots` — two matching own shots → only own shots; one matching own shot → one own + one shared; none own → two shared.
- [auto] `server/test/ai-shots-shared.test.js` (new): business B (no own shots) gets a promoted shared example in its generate prompt; promote answers 403 for a non-admin, 409 when the source business has `shareAiExamples` off, 409 when the shot is already promoted; `GET /api/v1/admin/ai-shots` lists approved shots only from businesses that opted in; `DELETE /api/v1/admin/ai-shots/shared/:id` removes the copy; `PUT /api/v1/business/share-ai-examples` `{ share: false }` by the owner removes that business's shared copies and answers 403 for staff.
- [auto] `server/test/migration-0012.test.js` (new): the dry run reports the count of `GEMINI_SHOTS` documents with no `businessId` and deletes nothing; `--write=yes` deletes only those (a stamped shot and a `__master__` shot stay); `--verify=yes` exits 0 afterwards.
- [auto] `src/app/pages/recipe-builder/services/recipe-ai-flow.service.spec.ts`: after `applyPendingDraft()` with a shot key, `confirmAiShot('r1')` calls `GeminiShotsService.confirmShot` once with the key, the form snapshot and `'r1'`; a second call does nothing; without a key it never calls it.
- [auto] `src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.spec.ts` and `src/app/pages/platform-dashboard/components/platform-ai-shots/platform-ai-shots.component.spec.ts`: the toggle calls `updateShareAiExamples(true/false)` and flips back on a refusal; the admin list renders both lists and calls promote / remove.
- [auto] `pnpm run build`, `pnpm run test:ci`, `pnpm run test:server`, `pnpm run lint`, `pnpm --dir server run lint`, `pnpm run lint:icons` pass; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `e2e/ui/600-1.spec.ts`: as the owner (`signInQa`), on `/metadata-manager` the card "שיתוף דוגמאות AI" shows the chip "לשתף דוגמאות"; ticking it and reloading keeps it ticked; untick restores it (cleanup in `finally`). Screenshot `screens/600-1.png`.
- [ui] `e2e/ui/600-2.spec.ts`: as the platform admin, on `/platform` the section "דוגמאות AI למתכונים" shows the headings "מאגר משותף" and "מועמדים"; a seeded candidate (API setup) shows the button "הוספה למאגר"; clicking it moves the row under "מאגר משותף" with the button "הסרה מהמאגר"; cleanup removes it. Screenshot `screens/600-2.png`.
- [human] Make a recipe with AI from text, change one ingredient in the builder and save it; then, as the platform admin with that business opted in, the recipe appears under "מועמדים" on `/platform` with a kept % below 100.
- [human] After merge, from the main folder: `node server/migrations/0012-drop-unscoped-ai-shots.js --target=atlas --confirm-host=<member host>` (dry run) shows the count; the same with `--write=yes` deletes them; `--verify=yes` exits 0.

## Execution Mode
- Parallel: no — edits `server/routes/ai.js` and `src/app/pages/recipe-builder/recipe-builder.page.ts`; run alone.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai.js
server/routes/admin.js
server/routes/business.js
server/services/business.js
server/services/ai-recipe-helpers.js
server/migrations/0012-drop-unscoped-ai-shots.js
server/test/ai-shots-saved.test.js
server/test/ai-shots-shared.test.js
server/test/ai-recipe-helpers.test.js
server/test/migration-0012.test.js
server/breadcrumbs.md
shared/schemas/entities/business.schema.ts
src/app/core/services/ai-recipe-draft.service.ts
src/app/core/services/gemini-shots.service.ts
src/app/core/services/business.service.ts
src/app/core/services/platform-admin.service.ts
src/app/core/models/ai-shot.model.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/components/ai-examples-share/**
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/components/platform-ai-shots/**
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/agent/standards-backend.md
docs/brain/component-families.md
e2e/ui/600-1.spec.ts
e2e/ui/600-2.spec.ts
server/test/ai-shots.test.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — a shared example is a `__master__` item written only by the platform admin (`requirePlatformAdmin`), the same rule as master push. It is copied only from a business whose owner turned on `shareAiExamples` (owner-only, `assertCan(req, res, 'editSettings', …)`), and turning it off deletes that business's copies. The copy carries no business name. Every member still reads only its own business's shots; the shared ones are master items. Consent model chosen by the Human 2026-11-14 (opt-in businesses).
- INV-2: preserves — the shared read filters `businessId: MASTER_BUSINESS_ID` from `server/utils/business-scope.js`; own reads keep `scopeFilter(req)`.
- INV-3: preserves — turning sharing off deletes that business's shared copies on the server inside `PUT /business/share-ai-examples` (one request); the new metadata-manager card makes one write, no client loop.
- INV-4: preserves — the new `PUT /api/v1/business/share-ai-examples` body is validated by `shareAiExamplesInputSchema` in `shared/schemas/entities/business.schema.ts`; `businessSchema` gains `shareAiExamples`. `POST /shots/confirm` reuses `validateRecipeDraft`.
- INV-6: preserves — Gemini calls stay in `server/routes/ai.js`; only the examples put into the prompt change.

## Reuse Check
- `ai-examples-share` component — family: chip — rung: 3 — why: a settings card shaped like `staff-stages-manager` (`manager-card c-glass-panel`) with one `c-chip c-chip--toggle`; no new style class.
- `platform-ai-shots` component — family: empty-state — rung: 3 — why: an admin list section on `/platform` like `platform-logistics-items`; reuses `app-loader`, `app-empty-state`, `.c-glass-panel`, `c-btn` classes.
- `keptRatio`, `pickShots` helpers — family: helpers — rung: 4 — why: new pure functions beside `selectShots` in `server/services/ai-recipe-helpers.js`.
- `ai-shot.model.ts` — family: none — rung: 4 — why: the admin list row types (`AiShotRow`, `AiShotsReport`).
- Migration 0012 — family: none — rung: 4 — why: a one-off script; reuses `server/migrations/tools/_connect.js` (`parseArgs`, `connect`) and 0010's mode flags.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Check by symbol: `saveShot`, `getApprovedShots`, `selectShots`, `FEW_SHOT_COUNT`, `POST /shots` in `server/routes/ai.js`; `onDraftApproved`, `saveShot_`, `navigateToBuilder_` in `ai-recipe-modal.component.ts`; `applyPendingDraft`, `buildDraftSnapshot` in `recipe-ai-flow.service.ts`; both `this.state_.saveRecipe(recipe)` calls in `recipe-builder.page.ts` (`saveAndWait`, `saveRecipe`).

## User Stories
- As a chef, I want the AI to learn only from recipes I actually saved, with my fixes, so its next drafts match how my kitchen really cooks.
- As a chef in a new business, I want the AI to use good examples from other kitchens until I have my own, so my first AI recipes are already decent.
- As an owner, I want to decide whether my examples may help other kitchens, anonymously, and to take them back by turning it off.
- As the platform admin, I want to choose which examples enter the shared pool and remove bad ones.

## Functional Requirements

### Must Have (P0)
- [ ] **Pending on continue (client).** `ai-recipe-modal.component.ts`: `onDraftApproved` makes `const shotKey = crypto.randomUUID()`, calls `saveShot_(draft, 'pending', shotKey)` and passes the key on: `navigateToBuilder_(draft, shotKey)` → `this.aiDraft.set(draft, shotKey)`. Rejections stay `'rejected'` with no key. `GeminiShotsService.saveShot(prompt, draft, status: 'pending' | 'rejected', source, shotKey?)` sends `shotKey` when given. `AiRecipeDraftService.set(draft, shotKey?: string)` stores the key in its own signal; `consumeShotKey(): string | null` returns and clears it; `consume()` is unchanged.
- [ ] **Pending on the server.** `POST /shots` accepts `status` `'pending'` or `'rejected'` (400 for anything else, including `'approved'`); `'pending'` needs `shotKey` (a string of 8–64 characters, else 400) and gets the structural check and injection screen that `'approved'` had. `saveShot` stores `shotKey` when present. Per-business prune unchanged (pending and rejected count toward the 50).
- [ ] **Confirm on save (client).** `RecipeAiFlowService.applyPendingDraft()` also keeps `this.pendingShotKey_ = this.aiRecipeDraft_.consumeShotKey()`. New `confirmAiShot(recipeId: string): void`: when a key is held, calls `GeminiShotsService.confirmShot(key, this.buildDraftSnapshot(), recipeId)` fire-and-forget (errors ignored, like `saveShot_`), then clears the key. `recipe-builder.page.ts` calls `this.aiFlow_.confirmAiShot(saved._id)` right after a successful `this.state_.saveRecipe(recipe)` in both `saveAndWait` and `saveRecipe`. `GeminiShotsService.confirmShot(shotKey, draft, recipeId)` posts to `API.ai('shots/confirm')`.
- [ ] **Confirm on the server.** `POST /shots/confirm` (`verifyToken`, no `aiLimiter`: it calls no AI) with `{ shotKey, draft, recipeId }`: 400 when a field is missing, `validateRecipeDraft(draft)` fails, or the injection screen hits; finds `{ ...scopeFilter(req), shotKey, status: 'pending' }`, 404 when none; sets `status: 'approved'`, `aiDraft: <the stored draft>`, `draft: <the posted draft>`, `keptRatio: keptRatio(storedDraft, postedDraft)`, `recipeId`, `confirmedAt: new Date()`. Logs `ai.shots.confirmed` with `keptRatio`. Answers `{ confirmed: true, keptRatio }`.
- [ ] **Helpers.** `server/services/ai-recipe-helpers.js` exports `keptRatio(aiDraft, savedDraft)` — the share of the AI draft's ingredient names (trimmed, lower-cased, inner spaces collapsed) found among the saved draft's ingredient names, rounded to 2 decimals; 0 when the AI draft has no ingredients — and `pickShots(own, shared, prompt, n)` — `selectShots(own, prompt, n)`, then, when fewer than `n`, adds `selectShots(shared, prompt, n - picked.length)`.
- [ ] **Shared read.** `server/routes/ai.js`: `getSharedShots()` reads `{ businessId: MASTER_BUSINESS_ID, status: 'approved' }`, newest first, limit `SHARED_SHOTS_CAP = 200`. `POST /generate` and `POST /generate-from-url` use `pickShots(await getApprovedShots(req), await getSharedShots(), <same text as today>, FEW_SHOT_COUNT)`. The comment block above `SHOTS_COLLECTION` describes pending → approved, the shared pool and consent.
- [ ] **Opt-in (server).** `shared/schemas/entities/business.schema.ts`: `shareAiExamplesInputSchema = z.strictObject({ share: z.boolean() })` and its type; `businessSchema` gains `/** Plan 600: the owner lets the platform admin copy its saved AI recipe examples, anonymously, into the shared pool. Absent = off. */ shareAiExamples: z.boolean().optional()`. `server/services/business.js` `setShareAiExamples(id, share)`: sets the field; when `share` is false also deletes `GEMINI_SHOTS` documents with `businessId: MASTER_BUSINESS_ID` and `promotedFrom.businessId: id`; returns `{ matchedCount, shareAiExamples, removed }`. `PUT /api/v1/business/share-ai-examples` in `server/routes/business.js`, same shape as `/staff-visible-stages` (owner only via `assertCan`, 400 with issues, 404, logs `business.share_ai_examples.saved` with `share` and `removed`), answers `{ shareAiExamples }`.
- [ ] **Admin endpoints.** `server/routes/admin.js`, all `verifyToken, requirePlatformAdmin`:
  - `GET /ai-shots` → `{ candidates, shared }`. `candidates`: up to 100 newest `approved` shots whose `businessId` is a business with `shareAiExamples: true` and that no shared shot names in `promotedFrom.shotId`. `shared`: up to 200 newest master shots. Row: `{ _id, nameHebrew: draft.nameHebrew, prompt: <first 200 characters>, ingredientCount, keptRatio (null when missing), source, createdAt }`; candidate rows also carry `businessName`.
  - `POST /ai-shots/:id/promote` → 404 when the shot is missing or not `approved`; 409 `{ code: 'not_shared' }` when its business has `shareAiExamples` not true; 409 `{ code: 'already_shared' }` when a master shot names it; 400 on the injection screen. Inserts `{ businessId: MASTER_BUSINESS_ID, prompt, draft, source, keptRatio, status: 'approved', promotedFrom: { businessId, shotId }, promotedBy: req.user.userId, createdAt: new Date() }` (no business name), then prunes master shots to the newest 200. Logs `admin.ai_shots.promoted`. Answers the new shared row.
  - `DELETE /ai-shots/shared/:id` → deletes only a master shot with that id (404 otherwise); logs `admin.ai_shots.removed`.
- [ ] **Opt-in card (client).** `BusinessService.updateShareAiExamples(share: boolean)` → `_put('share-ai-examples', { share })` (extend the `_put` path and body unions). New `src/app/pages/metadata-manager/components/ai-examples-share/` (`app-ai-examples-share`): the `staff-stages-manager` card shape — icon `sparkles`, title `metadata_ai_share_title` "שיתוף דוגמאות AI", text `metadata_ai_share_desc` "מתכונים שיצרתם ב-AI ושמרתם יכולים לעזור ל-AI של עסקים אחרים, בלי שם העסק. מנהל הפלטפורמה בוחר אילו. כיבוי מוחק את מה שכבר שותף.", one toggle chip `metadata_ai_share_chip` "לשתף דוגמאות" checked from `business_()?.shareAiExamples === true`; a refused save flips it back and shows `metadata_ai_share_error` "השמירה נכשלה, נסו שוב". `metadata-manager.page.component.html` shows it right after `app-staff-stages-manager`, inside the same `@if (canEditSettings_())`, with `id="mm-sec-ai-share"`.
- [ ] **Admin section (client).** `src/app/core/models/ai-shot.model.ts`: `AiShotRow`, `AiShotsReport { candidates: AiShotRow[]; shared: AiShotRow[] }`. `PlatformAdminService`: `getAiShots()`, `promoteAiShot(id)`, `removeSharedAiShot(id)`. New `src/app/pages/platform-dashboard/components/platform-ai-shots/` (`app-platform-ai-shots`): a `c-glass-panel` section titled `platform_ai_shots_title` "דוגמאות AI למתכונים", two lists `platform_ai_shots_shared` "מאגר משותף" and `platform_ai_shots_candidates` "מועמדים", each row: dish name, the request text (one line, ellipsis), kept % via `formatPctInt` ("—" when null), date, business name (candidates only), and a button `platform_ai_shots_promote` "הוספה למאגר" / `platform_ai_shots_remove` "הסרה מהמאגר"; empty lists use `app-empty-state` (`platform_ai_shots_empty`). After a promote or remove it reloads both lists; a refusal shows `platform_ai_shots_error` "הפעולה נכשלה". `platform-dashboard.page.html` places it right after `<app-platform-logistics-items />`; the page imports it.
- [ ] **Legacy cleanup.** `server/migrations/0012-drop-unscoped-ai-shots.js`, modelled on 0010 (`--target=local|atlas`, Atlas needs `--confirm-host`): default dry run prints `GEMINI_SHOTS` documents with no `businessId` (count); `--write=yes` deletes exactly `{ businessId: { $exists: false } }`; `--verify=yes` exits 1 while any remain. No backup is required (the documents are unreadable by design since plan 582).
- [ ] **Docs.** `docs/agent/standards-backend.md`: the `GEMINI_SHOTS` row lists `status` pending/approved/rejected, `shotKey`, `aiDraft`, `keptRatio`, `recipeId`, `promotedFrom`, and that `__master__` shots are the shared pool; §5 lists `POST /ai/shots/confirm`, `PUT /business/share-ai-examples`, `GET|POST|DELETE /admin/ai-shots…`. `docs/brain/component-families.md`: add `ai-examples-share` to the settings-card users and `platform-ai-shots` to the platform sections. `server/breadcrumbs.md` and the maps `node scripts/breadcrumbs-check.mjs` names.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- `/metadata-manager`: one new owner-only card after "שלבי אירוע שהצוות רואה". Staff never see it.
- `/platform`: one new section after the logistics items; only the platform admin reaches this page.
- The AI recipe window looks the same; only what it saves changes.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add `keptRatio` and `pickShots` with their tests — server/services/ai-recipe-helpers.js, server/test/ai-recipe-helpers.test.js
- [x] A2: Save a pending example on continue and confirm it on save (server) — `POST /shots` statuses and `shotKey`, `POST /shots/confirm`, the comment block — server/routes/ai.js
- [x] A3: Read the shared pool after the business's own examples in both generate routes — `getSharedShots`, `pickShots` — server/routes/ai.js
- [x] A4: Let the owner opt in and out — schema field and input schema, `build:schemas`, `setShareAiExamples`, `PUT /business/share-ai-examples` — shared/schemas/entities/business.schema.ts, server/services/business.js, server/routes/business.js
- [x] A5: Let the platform admin list, promote and remove shared examples — server/routes/admin.js
- [x] A6: Test the saved signal and the shared pool — server/test/ai-shots-saved.test.js, server/test/ai-shots-shared.test.js
- [x] A7: Write migration 0012 and its test — server/migrations/0012-drop-unscoped-ai-shots.js, server/test/migration-0012.test.js
- [x] A8: Send pending + key from the AI window and confirm after the recipe is saved — src/app/core/services/ai-recipe-draft.service.ts, src/app/core/services/gemini-shots.service.ts, src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts, src/app/pages/recipe-builder/services/recipe-ai-flow.service.ts (+ spec), src/app/pages/recipe-builder/recipe-builder.page.ts
- [x] A9: Add the owner's sharing card — src/app/core/services/business.service.ts, src/app/pages/metadata-manager/components/ai-examples-share/**, src/app/pages/metadata-manager/metadata-manager.page.component.html (+ .ts imports), public/assets/data/dictionary.json
- [x] A10: Add the admin's examples section — src/app/core/models/ai-shot.model.ts, src/app/core/services/platform-admin.service.ts, src/app/pages/platform-dashboard/components/platform-ai-shots/**, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, public/assets/data/dictionary.json
- [x] A11: Write the two screen checks — e2e/ui/600-1.spec.ts, e2e/ui/600-2.spec.ts (`signInQa`, API setup and cleanup in `finally`, screenshots `screens/600-<n>.png`)
- [x] A12: Update the docs and maps — docs/agent/standards-backend.md, docs/brain/component-families.md, breadcrumbs maps; run `node scripts/breadcrumbs-check.mjs`
- [ ] A13: Run the checks and hand over — build, test:ci, test:server, both lints, lint:icons, breadcrumbs-check, log-query, specs 600-1/600-2 against the slot app; then the [human] cards

## Technical Considerations
- Dependencies: plan 582 (per-business shots, merged #573).
- New files needed: `server/migrations/0012-drop-unscoped-ai-shots.js`, `server/test/ai-shots-saved.test.js`, `server/test/ai-shots-shared.test.js`, `server/test/migration-0012.test.js`, `src/app/core/models/ai-shot.model.ts`, the two component folders, `e2e/ui/600-1.spec.ts`, `e2e/ui/600-2.spec.ts`.
- Model changes: `GEMINI_SHOTS` documents gain `shotKey`, `aiDraft`, `keptRatio`, `recipeId`, `confirmedAt`; master copies carry `promotedFrom`, `promotedBy`. `businesses` gain `shareAiExamples`.
- Image generate route: unchanged (it has no request text, so `selectShots` picks none today).
- A pending shot that is never saved stays pending and is pruned by the per-business cap.
- Only the first save of an AI-started recipe confirms it; later edits do not change the example.
- Backend / API: new `POST /api/v1/ai/shots/confirm`, `PUT /api/v1/business/share-ai-examples`, `GET /api/v1/admin/ai-shots`, `POST /api/v1/admin/ai-shots/:id/promote`, `DELETE /api/v1/admin/ai-shots/shared/:id`; `POST /api/v1/ai/shots` no longer accepts `approved`.
- Auth and validation: owner-only opt-in (`assertCan`), admin-only promote/remove (`requirePlatformAdmin`), Zod body for the opt-in, `validateRecipeDraft` + the injection screen on confirm and on promote.
- Security surface: shared copies reach every business's prompt, so the injection screen runs again at promote; only consenting businesses' examples are eligible.
- Data / migration: migration 0012 deletes the unscoped legacy shots (local by the Worker's test only; Atlas by the Human after merge).
- Cost: none (no extra Gemini calls).

## Backend Impact
- Collections affected: `GEMINI_SHOTS`, `businesses`.
- New collections: no
- Server changes needed: yes — `ai.js`, `admin.js`, `business.js` routes, `business.js` and `ai-recipe-helpers.js` services, migration 0012.

## Out of Scope
- AI menu examples (`GEMINI_MENU_SHOTS`): same pattern in a separate plan (Human, 2026-11-14) — todo follow-up.
- Ranking by quality beyond the own-first order (e.g. weighting `keptRatio`); the admin's choice is the quality gate for now.
- Showing a business which of its examples were promoted.
- Running migration 0012 on Atlas from a slot (Human only, main folder).

## Critical Questions
- none open. Consent = opt-in businesses; the example stored = the recipe as saved; menus = separate plan (Human, 2026-11-14).

## Execution Notes
- Planner draft 2026-11-14 from the Human's batch-6 D1 question; checked against `origin/main` at a1de3cdb.
- 28 unscoped `GEMINI_SHOTS` documents counted on the local `foodvibe` DB on 2026-11-14 (none has `businessId` or `userId`). Atlas not counted.
- Builder run-600 (2026-11-14): A1-A12 done; A13 partly: build 0, lint 0 errors, test:ci 2183 SUCCESS, test:server 1379 passed, lint:icons ok, breadcrumbs-check clean, override/ledger ok. The two `[ui]` specs are written, not run.
- scope extended: server/test/ai-shots.test.js — its helper saved 'approved' shots, which POST /shots now refuses; it now saves pending + confirms.
- scope extended: src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts — specs beside scoped page files (stub for the new section; the metadata tab list is unchanged).
- scope extended: moved containsInjectionPattern / scanRecipeDraftForInjection from routes/ai.js into services/ai-recipe-helpers.js so admin.js uses the same screen (both in scope).
- kit-manifest-check (kit copy from main folder) reports `unclassified: scripts/qa/lib/styleqa-sign-in.mjs` — not touched by this plan.
