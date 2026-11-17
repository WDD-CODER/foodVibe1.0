# Plan 618 — Every business teaches the AI by default, and every AI draft keeps its trail

Status: draft
Depends-on: 617
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
Today the platform learns only from a business whose owner found a switch and turned it on (plan 600, default off).
Dandan decided the opposite (program brief Part 0.5, D8–D10): every business that uses the AI shares what it produces
with the platform by default; a business is taken out only by the platform admin, who marks it **private**. The owner
can no longer change it. Second problem: the three new AI flows of this program (site notes, invoices, stock count)
need one place that stores what the model suggested next to what the person finally saved, with a closeness score —
the learning data and the accuracy evidence. Today only recipes have that (`GEMINI_SHOTS`), written inline in
`server/routes/ai.js`.

This plan changes the consent test on the server, removes the owner's route, and adds the draft trail as two
functions. It adds no model call and no new screen.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/services/business.js` (103 lines): `setShareAiExamples(id, share)` at lines 81–91 sets
  `businesses.shareAiExamples` and, when turned off, deletes `GEMINI_SHOTS` documents
  `{ businessId: '__master__', 'promotedFrom.businessId': id }`; it is exported at line 103. `getBusiness(id)` is at line 50.
- `server/routes/business.js` (391 lines): `PUT /share-ai-examples` at lines 104–119 (`assertCan(req, res, 'editSettings',
  { type: 'businesses' })`, body `shareAiExamplesInputSchema`); the two imports are on line 6 (`setShareAiExamples`) and
  line 16 (`shareAiExamplesInputSchema`).
- `shared/schemas/entities/business.schema.ts`: `shareAiExamplesInputSchema` and `ShareAiExamplesInput` at lines 77–79;
  `shareAiExamples: z.boolean().optional()` at line 98 inside `businessSchema` (a `z.strictObject`).
- `server/routes/admin.js` (437 lines): `GET /ai-shots` at line 366 lists candidates only from
  `businesses.find({ shareAiExamples: true })` (line 368); `POST /ai-shots/:id/promote` at line 386 answers 409
  `{ code: 'not_shared' }` when `business?.shareAiExamples !== true` (lines 392–393); `DELETE /ai-shots/shared/:id` at
  line 423 needs no change. No platform write route exists yet (plan 616 adds `PUT /businesses/:id/platform`).
- `server/routes/ai.js` (1,876 lines): the comment block at lines 181–190 describes the opt-in
  (`business.shareAiExamples`, line 187); `getSharedShots()` (line 254) reads the `'__master__'` pool and has no consent
  test of its own — it needs none (a private business still reads the shared pool).
- `server/test/ai-shots-shared.test.js` (140 lines) is the only server test that names the switch: the fixture at
  line 31 (`biz('bizShareA', 'Sharing Kitchen', { shareAiExamples: true })`), the candidates test at line 83, the
  `not_shared` test at line 69, and the owner-route test at lines 126–139. `server/test/ai-shots.test.js` and
  `ai-shots-saved.test.js` do not name it.
- `src/app/core/services/business.service.ts` (136 lines): `updateShareAiExamples(share)` at lines 86–89; the type import
  `ShareAiExamplesInput` at line 12; `'share-ai-examples'` in the `_put` path union at line 110 and
  `ShareAiExamplesInput` in the body union at line 117. `src/app/core/services/business.service.spec.ts` does not name the method.
- The only caller of `updateShareAiExamples` is `src/app/pages/metadata-manager/components/ai-examples-share/
  ai-examples-share.component.ts` (58 lines, `onToggle` at line 38; `checked` reads `shareAiExamples` at line 34). Its
  template is one `label.c-chip.c-chip--toggle` with a checkbox; its spec (86 lines) has four cases, all on the toggle.
  The card is shown only to the owner (`metadata-manager` template line 154, inside `@if (canEditSettings_())`).
- Three e2e specs call the owner route: `e2e/ui/600-1.spec.ts` (the toggle itself — its subject disappears),
  `e2e/ui/600-2.spec.ts` lines 22 and 47, `e2e/ui/612-1.spec.ts` lines 23 and 45 (setup and cleanup only).
- Docs that describe the switch: `docs/agent/standards-backend.md` line 49 (`GEMINI_SHOTS` row), line 129 (the route row),
  line 130 (the admin routes row); `server/breadcrumbs.md` line 10.
- The generic API refuses a type that is not a user-data collection with 403
  (`server/routes/generic.js` lines 48–55), so a server-only collection is never readable through it.
- `server/utils/id.js` `newId()` is the id generator; `server/utils/actor.js` `actorOf(req)` gives `{ userId, name }`.
- New files of this plan (none exists today): `server/utils/ai-learning.js`, `server/services/ai-drafts.js`,
  `server/test/ai-learning.test.js`, `server/test/ai-drafts.test.js`, `e2e/ui/618-1.spec.ts`.
- From plan 615 (must be merged; this plan does not add them): `business.aiPrivate`, the collection `aiDrafts` in
  `server/constants/collections.js`, its schema file `shared/schemas/entities/ai-draft.schema.ts`, the index
  `{ businessId, feature, at }` in `server/db.js`. From plan 616: `PUT /api/v1/admin/businesses/:id/platform`.

## Goals & Success Criteria
**Primary:** the platform admin's examples list and the promote route accept every business that is not private, with
no owner action; turning a business private removes what it already shared; the owner's route is gone; and
`saveAiDraft` / `confirmAiDraft` store a draft and what was saved beside it, per business, capped at 500 per feature.

- [auto] `pnpm run test:server` passes, including `server/test/ai-learning.test.js`: `mayLearnFrom` is `true` for `{}`,
  `{ aiPrivate: false }`, `{ shareAiExamples: false }` and `undefined`, and `false` only for `{ aiPrivate: true }`;
  `businessSchema` still accepts a stored document with `shareAiExamples: true`; the generated schemas no longer
  export `shareAiExamplesInputSchema`.
- [auto] `pnpm run test:server` passes, including `server/test/ai-shots-shared.test.js` with these cases: the promote route answers
  200 for an approved shot of a business that has neither `shareAiExamples` nor `aiPrivate`; it answers 409
  `not_shared` for a business with `aiPrivate: true`; `GET /api/v1/admin/ai-shots` lists no candidate of the private
  business; `PUT /api/v1/business/share-ai-examples` answers 404 for an owner and for staff and deletes nothing.
- [auto] Same file: `PUT /api/v1/admin/businesses/<id>/platform` with `{ aiPrivate: true, reason: 'test reason' }`
  deletes that business's promoted copies (`promotedFrom.businessId`), leaves another business's copy, and the
  business's own shots stay; sending `{ aiPrivate: false, reason }` afterwards restores nothing and deletes nothing.
- [auto] `pnpm run test:server` passes, including `server/test/ai-drafts.test.js`: `saveAiDraft` returns a string id and stores
  exactly the C-AIDRAFT fields with `status: 'pending'`; a draft saved with `model: 'gemini-3.1-flash-lite'` stores
  that name and one saved without it has no `model` key; a failing insert returns `null` and does not throw; the 501st
  draft of one business and feature deletes the oldest and leaves another feature's and another business's drafts;
  `confirmAiDraft` stores `saved`, `keptRatio`, `status: 'confirmed'`, `confirmedAt`; a draft of another business and
  an unknown id both return `null`; `GET /api/v1/data/aiDrafts` answers 403.
- [auto] `pnpm run test:server` passes, including `server/test/admin-platform.test.js` (plan 616's test of the platform route) with
  one added case: `aiPrivate: true` answers 200, stores `aiPrivate: true`, appends one `platformHistory` row, and a
  promoted copy of that business is gone.
- [auto] `pnpm run test:server` passes (the whole server suite).
- [auto] `pnpm run test:ci` passes, including the two cases of
  `src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.spec.ts`.
- [auto] `pnpm run build` passes with `updateShareAiExamples` removed.
- [auto] `pnpm run lint` exits 0 and `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/dashboard?tab=metadata`, signed in as the owner, the card titled "שיתוף דוגמאות AI" has no control that
  can be switched: it holds no enabled checkbox (`e2e/ui/618-1.spec.ts`).

## Execution Mode
- Parallel: no — a plan of run `mod-0`: it edits the shared registry file `shared/schemas/entities/business.schema.ts`,
  and `server/routes/admin.js`, which 616 and 617 edit before it; it runs after 617 and before 619 and 620, never
  beside any other plan of the program.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/ai-learning.js
server/services/ai-drafts.js
server/services/business.js
server/routes/business.js
server/routes/admin.js
server/routes/ai.js
shared/schemas/entities/business.schema.ts
server/test/ai-learning.test.js
server/test/ai-drafts.test.js
server/test/ai-shots-shared.test.js
server/test/admin-platform.test.js
shared/schemas/entities/ai-draft.schema.ts
src/app/core/services/business.service.ts
src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.ts
src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.html
src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.spec.ts
e2e/ui/600-1.spec.ts
e2e/ui/600-2.spec.ts
e2e/ui/612-1.spec.ts
e2e/ui/618-1.spec.ts
docs/agent/standards-backend.md
server/breadcrumbs.md
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

- INV-2: preserves — `aiDrafts` rows carry the caller's `businessId` taken from the signed token, are server-only and never cloned; the `'__master__'` examples pool is still written only by the platform admin's promote route.
- INV-3: preserves — the owner's card loses its save; no client write loop is added, and turning a business private deletes its shared copies on the server in the same request.
- INV-4: preserves — the schema edits remove an input schema whose route is removed and add one optional field (`model`) to the draft shape; `businessSchema` keeps `shareAiExamples` optional so stored documents validate; every `aiDrafts` insert is checked against the schema plan 615 registered.
- INV-6: preserves — no model call is added or moved; `server/routes/ai.js` changes one comment; the owner's card (`ai-examples-share`) calls no AI route.

## Reuse Check

- `mayLearnFrom` in `server/utils/ai-learning.js` — family: none — rung: 4 — why: server rule with no UI family; the Contract makes it the one consent test, so it gets its own small file beside `business-scope.js`.
- `saveAiDraft` / `confirmAiDraft` in `server/services/ai-drafts.js` — family: none — rung: 4 — why: server service; it generalises the lifecycle `GEMINI_SHOTS` has inline in `server/routes/ai.js` (pending, then confirmed with a closeness score) so the three new flows do not each copy it.
- `setAiPrivate` in `server/services/business.js` — family: none — rung: 4 — why: replaces `setShareAiExamples` in the same file; not a new piece beside it.
- Disabled chip in `ai-examples-share` — family: chip — rung: 1 — why: the existing `c-chip c-chip--toggle` with its checkbox `disabled`; no new control.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want every business's saved AI examples to be offered to me without the owner doing anything, so that the shared pool grows from all kitchens and not only from the few who found a switch.
- As the platform admin, I want marking a business private to remove what it already shared, so that a customer who pays for privacy is really out of the pool.
- As an owner, I want my private business to keep its own AI memory and its own drafts, so that going private does not make my own AI worse.
- As a chef, I want a failed save of the draft trail to never stop my AI action, so that the checklist or the invoice still comes back when the trail has a problem.

## Functional Requirements

### Must Have (P0)
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
- [ ] `server/utils/ai-learning.js` (new) exports `mayLearnFrom(business)` → `business?.aiPrivate !== true`. No
  database access, no other export.
- [ ] `server/services/business.js`: `setAiPrivate(id, value)` replaces `setShareAiExamples` (function and export
  removed). It runs `updateOne({ _id: String(id) }, { $set: { aiPrivate: value === true } })`; when a document matched
  and `value === true` it deletes `GEMINI_SHOTS` documents `{ businessId: MASTER_BUSINESS_ID,
  'promotedFrom.businessId': String(id) }`. It returns `{ matchedCount, aiPrivate, removed }` (`removed` = the deleted
  count, 0 when turning private off). Turning private off restores nothing. The Contract's `forgetBusiness` call
  belongs to plan 627, which adds `server/services/invoice-memory.js` and the call here (its card lists this file); 618
  leaves one comment line at that spot: `// plan 627 calls forgetBusiness(db, id) here when value is true`.
- [ ] `server/routes/admin.js`:
  - `GET /ai-shots`: read `businesses.find({ _id: { $ne: '__master__' } }, { projection: { name: 1, aiPrivate: 1 } })`
    and keep the ones for which `mayLearnFrom(b)` is true (replaces the `{ shareAiExamples: true }` query at line 368).
    Everything else in the route stays (caps, `promoted` filter, `aiShotRow`).
  - `POST /ai-shots/:id/promote`: load the business with projection `{ aiPrivate: 1 }`; a missing business or
    `!mayLearnFrom(business)` answers 409 `{ error: 'Business is private', code: 'not_shared' }` (the code is kept so
    `PlatformAiShotsComponent` and its tests are untouched).
  - `PUT /businesses/:id/platform` (added by 616): when the body has `aiPrivate`, the value is written through
    `setAiPrivate(req.params.id, body.aiPrivate)` and not by the route's own `$set`. Plan 616 sets the field plainly
    with a comment that points here: replace that one line (and take `aiPrivate` out of the route's own `$set`); `platformHistory`, the other fields, the module-cache clear and the response stay exactly as
    616 left them. The log line of the route gains `removed` (a count) when `aiPrivate` was sent.
- [ ] Removed: the route `PUT /api/v1/business/share-ai-examples` (`server/routes/business.js` lines 104–119) with its
  two imports; `shareAiExamplesInputSchema` and `ShareAiExamplesInput` (`business.schema.ts` lines 77–79). The line
  `shareAiExamples: z.boolean().optional()` in `businessSchema` stays, with its comment changed to
  "Plan 600 (retired by plan 618): kept so stored documents validate; nothing reads it."
- [ ] `server/routes/ai.js`: only the comment at lines 187–189 changes, to say that the platform admin may copy an
  approved shot of any business that is not private (`business.aiPrivate`, `mayLearnFrom`). No code line changes.
- [ ] `shared/schemas/entities/ai-draft.schema.ts` (plan 615's file): the stored shape gains `model: z.string().min(1)
  .max(80).optional()` when 615 did not already add it (Contract correction of 2026-11-17: `aiDrafts` gains
  `model?`); `pnpm run build:schemas`.
- [ ] `server/services/ai-drafts.js` (new):
  - Constants `AI_DRAFT_KEEP = 500`, `AI_DRAFT_TEXT_MAX = 20000`, `AI_DRAFT_JSON_MAX = 200000` (characters of
    `JSON.stringify`), exported.
  - `saveAiDraft(req, { feature, subject, input, aiDraft, model })` → `draftId | null`. Builds
    `{ _id: newId(), businessId: req.user.businessId, userId: actorOf(req).userId, feature, subject?, input: { text?,
    fileId? }, aiDraft, model?, status: 'pending', at: Date.now() }`. `model` is the model name `callGemini` returned
    (`{ kind: 'ok', model, data }`); a value that is not a non-empty string of at most 80 characters is left out. `input.text` longer than `AI_DRAFT_TEXT_MAX` is cut to
    that length; a key with an undefined value is left out. Returns `null` (and stores nothing) when: `feature` is not
    in `AI_FEATURES` (`isAiFeature`), the caller has no `businessId`, `JSON.stringify(aiDraft)` is longer than
    `AI_DRAFT_JSON_MAX`, the document fails the schema of `shared/schemas/entities/ai-draft.schema.ts`
    (`safeParse`), or the insert throws. Every `null` path logs one `req.log.warn({ event: 'ai.draft.save_failed',
    feature, reason })` with `reason` one of `feature | no_business | too_large | schema | db` — never the text, the
    draft or a file name. The function never throws.
  - After a successful insert it prunes: the documents of the same `{ businessId, feature }` sorted by `at`
    descending, from position 500 on, are deleted (`find … sort … skip(AI_DRAFT_KEEP) … project({ _id: 1 })`, then
    `deleteMany`). A prune that throws is swallowed (the id is still returned).
  - `confirmAiDraft(req, draftId, saved, ratio)` → `{ draftId, keptRatio } | null`. Finds
    `{ _id: String(draftId), businessId: req.user.businessId, status: 'pending' }`; none → `null` (the calling route
    answers 404: a draft of another business, an unknown id and an already confirmed draft all look the same).
    `keptRatio` = `ratio(stored.aiDraft, saved)` clamped to 0–1 and rounded to two decimals; when `ratio` throws or
    returns a non-finite number, `keptRatio` is left out and one `ai.draft.ratio_failed` warn (feature only) is logged.
    Writes `$set: { saved, status: 'confirmed', confirmedAt: Date.now() }` plus `keptRatio` when there is one; `saved`
    is left out (and the rest still written) when `JSON.stringify(saved)` is longer than `AI_DRAFT_JSON_MAX`. Logs
    `ai.draft.confirmed` with `feature` and `keptRatio` only. A database error is not caught here: the calling route
    decides (C-INVOICE logs it and still answers 200).
  - No function of this file returns a stored document; nothing but the `_id` leaves the server.
- [ ] `src/app/core/services/business.service.ts`: remove `updateShareAiExamples`, the `ShareAiExamplesInput` import,
  `'share-ai-examples'` from the `_put` path union and `ShareAiExamplesInput` from its body union.
- [ ] The owner's card between this plan and plan 620 (same run): `ai-examples-share.component.ts` loses `onToggle`,
  `saving_`, `saving` and the `UserMsgService`, `TranslationService` and `LoggingService` injections; `checked` becomes
  `computed(() => this.businessService.business_()?.aiPrivate !== true)`. The template keeps the card, its title and
  description keys and the one `label.c-chip.c-chip--toggle`, with the checkbox `[checked]="checked()"` and
  `disabled` and no `(change)`. It calls no route. Plan 620 turns it into the locked chip with the tooltip and the new
  text. The spec is rewritten to two cases (below).
- [ ] e2e specs that call the removed route: delete `e2e/ui/600-1.spec.ts` (it tests the toggle that no longer
  exists); in `e2e/ui/600-2.spec.ts` and `e2e/ui/612-1.spec.ts` remove the two `request.put(… share-ai-examples …)`
  lines each and change the setup comment to "the QA business is not private, so its confirmed example is a candidate".
- [ ] Docs: `docs/agent/standards-backend.md` — the `GEMINI_SHOTS` row says "a business that is not private
  (`businesses.aiPrivate`, `mayLearnFrom`)" where it says "an opted-in business (`businesses.shareAiExamples`)"; the
  `PUT /api/v1/business/share-ai-examples` row is deleted; the admin `ai-shots` row says "of a business that is not
  private"; the `aiDrafts` row of §1 (added by 615, or added here if 615 did not) names `server/services/ai-drafts.js`
  as its only writer. `server/breadcrumbs.md` — the `routes/business.js` row loses the plan 600 clause; new rows for
  `utils/ai-learning.js` and `services/ai-drafts.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No new screen, no new dictionary key, no new icon. The card keeps `metadata_ai_share_title`, `metadata_ai_share_desc`
  and `metadata_ai_share_chip` until plan 620 replaces the text; `metadata_ai_share_error` stays in the dictionary
  (append-only) and is no longer used.
- The card between 618 and 620: the chip shows ticked for a business that is not private and unticked for a private
  one, greyed out, and does nothing on a click. Edit, cancel, error: there is nothing to edit and no request, so none
  applies. Empty (business not loaded yet): the chip shows ticked (the default is shared).
- Hebrew RTL and logical CSS are unchanged; the `.scss` file is not edited.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the one test that says whether the platform may learn from a business — new file with mayLearnFrom (aiPrivate not true); unit cases for absent, false, true, undefined and the old shareAiExamples field; businessSchema still accepts a stored shareAiExamples — server/utils/ai-learning.js, server/test/ai-learning.test.js
- [x] A2: Replace the owner's sharing switch on the server with a private mark only the platform admin sets — setAiPrivate replaces setShareAiExamples (deletes promoted copies when turned on, returns matchedCount, aiPrivate, removed; the comment line for plan 627); remove the route and its two imports; remove shareAiExamplesInputSchema and its type, keep the optional field with the new comment; run pnpm run build:schemas — server/services/business.js, server/routes/business.js, shared/schemas/entities/business.schema.ts
- [x] A3: Offer every business that is not private to the platform admin's examples list and promote action — GET ai-shots filters with mayLearnFrom; promote answers 409 not_shared for a private or missing business; the platform route writes aiPrivate through setAiPrivate and logs the removed count; the ai.js comment — server/routes/admin.js, server/routes/ai.js
- [x] A4: Update the shared examples tests to the new consent rule — fixture: bizShareA without a flag, bizPrivateC with aiPrivate true, bizNewB; new case promote 200 for a business that never touched a switch; candidates exclude the private business; the old route answers 404 for owner and staff and deletes nothing; the platform route with aiPrivate true deletes only that business's copies, false deletes nothing; one added case in plan 616's platform test (stored flag, history row, copy gone); server/test/ai-learning.test.js asserts the generated schemas no longer export shareAiExamplesInputSchema — server/test/ai-shots-shared.test.js, server/test/admin-platform.test.js, server/test/ai-learning.test.js
- [x] A5: Add the draft trail that stores what the AI suggested next to what the person saved — the optional model field in the schema; saveAiDraft (stores the model name when given, never throws, five null reasons, schema check, prune to 500 per business and feature) and confirmAiDraft (own business and pending only, clamped ratio, size guard); tests with a fake request object { user, log } on the in-memory database: stored field list, failing insert, the 501st draft, another feature and business untouched, confirm, other business and unknown id return null, a throwing ratio, model stored and left out, generic GET of aiDrafts answers 403 — shared/schemas/entities/ai-draft.schema.ts, server/services/ai-drafts.js, server/test/ai-drafts.test.js
- [x] A6: Remove the browser's call to the retired route and keep the owner's card building — delete updateShareAiExamples, its type import and the two union members; the card reads aiPrivate, shows a disabled chip and has no save; spec rewritten to two cases: ticked and disabled when the business is not private, unticked and disabled when aiPrivate is true — src/app/core/services/business.service.ts, src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.ts, ai-examples-share.component.html, src/app/pages/metadata-manager/components/ai-examples-share/ai-examples-share.component.spec.ts
- [x] A7: Bring the browser checks that used the retired route in line — delete 600-1; drop the two share-ai-examples calls from 600-2 and from 612-1; new 618-1 signs in with signInQa, opens /dashboard?tab=metadata, expects the card #mm-sec-ai-share to contain "שיתוף דוגמאות AI" and to hold no enabled input, saves screens/618-1.png — e2e/ui/600-1.spec.ts, e2e/ui/600-2.spec.ts, e2e/ui/612-1.spec.ts, e2e/ui/618-1.spec.ts
- [x] A8: Record the new rule in the backend docs and the server map — the GEMINI_SHOTS row, the deleted route row, the admin ai-shots row, the aiDrafts writer; breadcrumbs rows for the two new files and the business route — docs/agent/standards-backend.md, server/breadcrumbs.md
- [x] A9: Run every check and write the evidence into the plan — pnpm run test:server, pnpm run test:ci, pnpm run build, pnpm run lint, pnpm --dir server run lint, node scripts/log-query.mjs --since=plan-start --level=error; exact result lines into Execution Notes

## Technical Considerations
- Dependencies: `PlatformAiShotsComponent` and `PlatformAdminService.getAiShots / promoteAiShot` keep their request and
  response shapes (the 409 code stays `not_shared`). `getSharedShots()` and every prompt builder in `server/routes/ai.js`
  are untouched. Plan 620 rewrites the owner's card; plans 622, 625, 626, 633 and 637 call `saveAiDraft` /
  `confirmAiDraft`; plan 627 adds the `forgetBusiness` call inside `setAiPrivate`.
- New files needed: `server/utils/ai-learning.js`, `server/services/ai-drafts.js`, `server/test/ai-learning.test.js`,
  `server/test/ai-drafts.test.js`, `e2e/ui/618-1.spec.ts`. Deleted: `e2e/ui/600-1.spec.ts`.
- Model changes: `ShareAiExamplesInput` removed from `@schemas/entities`; no new client type (`Business.aiPrivate`
  comes from plan 615's schema change).
- Backend / API: removed `PUT /api/v1/business/share-ai-examples` (answers 404 through the JSON 404 of
  `server/app.js`). Changed behaviour, same shapes: `GET /api/v1/admin/ai-shots`, `POST /api/v1/admin/ai-shots/:id/promote`,
  `PUT /api/v1/admin/businesses/:id/platform` (the `aiPrivate` write). No new route.
- Auth and validation: the three admin routes stay `verifyToken, requirePlatformAdmin`. `aiPrivate` can be written only
  through the platform route (the generic API never writes `businesses`; `PUT /business/*` routes do not accept it).
  `saveAiDraft` takes the business and the user from the signed token (`req.user`, `actorOf(req)`), never from input,
  and validates the document with the shared schema before the insert.
- Security surface: `aiDrafts` holds business content (notes, invoice lines); it is server-only (generic API → 403,
  tested) and no function returns a stored document. Logs carry `feature`, `reason`, `keptRatio` and counts only — no
  text, draft, file name, product name or price. No secret, no new input from outside the business.
- Data / migration: no migration. Stored `shareAiExamples` values stay and are ignored: a business that had it `false`
  or absent becomes shared by default (decision D8); a business becomes private only by the platform admin. Free tier:
  at most 500 drafts per business and feature, each at most about 200 KB of draft JSON plus 20,000 characters of text.
- Project checks: the `[auto] log-query` item is present; `pnpm run test:server` and `pnpm run test:ci` are Done-when
  items; no new dictionary key and no new Lucide icon; Reuse Check filled; entity shapes stay in `shared/schemas`; the
  new collection's registration follows `standards-backend.md` §3 in plan 615, this plan adds its only writer.

## Out of Scope
- The locked chip, its tooltip and the new Hebrew text of the owner's card; the platform dialog that sets `aiPrivate`
  — plan 620.
- `forgetBusiness` and the shared supplier memory — plan 627.
- Any route that calls `saveAiDraft` / `confirmAiDraft` (622, 625, 626, 633, 637), and moving the recipe examples
  (`GEMINI_SHOTS`, `POST /ai/shots`, `/ai/shots/confirm`) onto the draft trail — they stay as plan 600 built them.
- Removing `shareAiExamples` from stored documents or from `businessSchema`.
- Showing drafts or closeness scores on any screen (plan 630 reads them for the platform admin).
- Deleting a business's `aiDrafts` when the platform admin deletes the business — plan 619 (it extends
  `DELETE /api/v1/admin/users/:userId` for every server-only collection of the program).

## Critical Questions
- none

## Execution Notes
- decided: the promote route keeps the 409 code `not_shared` for a private business — why: `PlatformAiShotsComponent` and its spec read that code; a new code would be a browser change with no gain.
- decided: `setAiPrivate` leaves a comment where plan 627 adds the `forgetBusiness` call instead of creating an empty `invoice-memory.js` now — why: the Contract calls it "a no-op until 627" and 627's card already lists `server/services/business.js`; an empty service file would be a second writer of a file 627 owns.
- decided: 618 edits the platform route of 616 so `aiPrivate` goes through `setAiPrivate` — why: 616 runs before `setAiPrivate` exists, and `server/routes/admin.js` is in this plan's scope by the map.
- decided: between 618 and 620 the owner's card shows the existing chip, disabled, ticked unless the business is private — why: the build must pass after 618 alone, the card may call no route, and 620 (same run) replaces it; no dictionary key is added for a state that lives for one plan.
- decided: `e2e/ui/600-1.spec.ts` is deleted and 600-2 / 612-1 lose their two setup calls — why: 600-1 tests only the removed toggle; the other two would send a request to a route that answers 404.
- decided: `confirmAiDraft` returns `null` for an unknown id, another business's draft and an already confirmed draft alike — why: the Contract's "a draft of another business answers 404" must not tell a caller that the id exists elsewhere.
- decided: a draft or a saved result over 200,000 characters of JSON is not stored — why: the Contract gives no size limit and the database is the free tier (512 MB); the AI action still answers.
- decided: `input.text` over 20,000 characters is cut, not refused — why: `saveAiDraft` may never fail a feature, and every caller already validates its text at 20,000.
- builder (round 2, fresh from base ac5f0e8): no file outside the Read-Write Scope is touched; the earlier attempt's docs/brain family registration (review STOP: out of scope) is not repeated.
- decided (builder): `ai-draft.schema.ts` already has `model: z.string().max(80).optional()` from plan 615, so it is not edited; `saveAiDraft` itself leaves out an empty or over-80-character model.
- decided (builder): the platform route calls `setAiPrivate` before its own `findOneAndUpdate` (an unknown business still answers 404), so the response's `aiPrivate` reads the written value.
- evidence: `pnpm run build:schemas` -> exit 0; the generated `business.schema.js` has 0 matches of shareAiExamplesInputSchema.
- evidence: `npx vitest run test/ai-learning.test.js test/ai-drafts.test.js test/ai-shots-shared.test.js test/admin-platform.test.js` (in server/) -> exit 0, Test Files 4 passed, Tests 45 passed.
- evidence: `pnpm run test:server` -> exit 0, Test Files 117 passed (117), Tests 1568 passed (1568).
- evidence: `pnpm run test:ci` -> exit 0, TOTAL: 2242 SUCCESS.
- evidence: `pnpm run build` -> exit 0.
- evidence: `pnpm run lint` -> exit 0 (0 errors, 67 warnings); `pnpm --dir server run lint` -> exit 0 (0 errors).
- evidence: `node scripts/log-query.mjs --since=plan-start --level=error` -> exit 0, "SKIP: no database configured".
- [ui] `e2e/ui/618-1.spec.ts` written, not run (no running app in the worktree).
