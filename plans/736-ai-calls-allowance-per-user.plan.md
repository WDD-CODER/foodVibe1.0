# Plan 736 — Every user gets 100 AI calls; after that each AI request says the budget is over and whom to contact

Status: draft
Depends-on: none
Track: code
Snapshot: 84703cef

## Problem Statement
Dandan (2026-11-25): "each new signed-up user receives a total of 100 api calls and when they are over he should be
notified each time he wants to have an ai call that his budget is over so he needs to contact dan.weibren@gmail.com
in order to get more ai usage — this needs to be a starting point to all users that are coming in the deployment".
The live demo (Render, free Gemini key) is about to be shown to recruiters (plan 738 links it); without a per-user
limit one visitor can spend the whole free daily model quota for everyone.

Verified on `origin/main` 84703cef:
- Every model call goes through `callGemini` in `server/services/gemini-client.js:427` — the only file that calls
  Google. Its callers are all on the `/api/v1/ai` router (`server/app.js:220`): 14 call sites in `server/routes/ai.js`
  (`/generate`, `/parse-text`, `/parse-price-list`, `/parse-receipt-photo`, `/match-product-names`, `/patch-recipe`,
  `/generate-menu`, `/patch-menu`, `/generate-product`, `/patch-product`, `/generate-from-image`,
  `/generate-product-from-image`, `/generate-from-url`, `/knowledge-import`; `/shots` and `/save-menu-shot` make no
  model call) and one each in
  `server/routes/ai/voice.js` (`/voice/transcribe`), `logistics.js` (`/logistics/extract`), `invoices.js`
  (`/invoices/read`), `diag.js` (`/diag/menu`), `stock.js` (`/stock/extract`). Every one builds its `usage` from
  `usageOf(req)` (`server/routes/ai.js:120`), and every non-ok result goes through `respondFromGeminiFailure`
  (`server/routes/ai.js:336`). No other route calls the model on main.
- Plan 617 already refuses a call before it is made: `callGemini` asks `capState` (`server/services/ai-cap.js`) for the
  business's monthly token cap and returns `{ kind: 'business_cap' }`, which `respondFromGeminiFailure` turns into 429
  `ai_monthly_cap_reached`. This plan adds a per-user count in the same place, so no route can skip it.
- One user request can make several model calls: `callGemini` retries a passing failure up to 4 times (plan 614,
  `MAX_ATTEMPTS`), and `callGeminiForRecipeWithRetry` (`server/routes/ai.js:316`) sends a second request when the first
  answer was unusable.
- The user record (`server/models/user.model.js`) has `isPlatformAdmin` and no AI field. The access token carries
  `userId` and `isPlatformAdmin` (`server/routes/auth.js:84-96`, `signAccess`).
- Platform admin user list: `GET /api/v1/admin/users` (`server/routes/admin.js:31`) feeds «ניהול משתמשים»
  (`src/app/pages/metadata-manager/components/user-management/`, shown on `/dashboard?tab=metadata` to a platform admin)
  through `UserAdminService` (`src/app/core/services/user-admin.service.ts`).
- Browser error handling for AI is per screen: `aiCapErrorKey` (`src/app/core/utils/ai-error.util.ts`) is read by the
  recipe, menu and product AI modals, the recipe ingredients table and the stock AI draft; four other screens compare
  the `ai_monthly_cap_reached` string themselves (`diag-menu.component.ts:154`, `invoice-import.util.ts:87`,
  `logistics-note-draft.component.ts:136`, `voice-note.component.ts:173`). The one shared place every answer passes is
  `src/app/core/interceptors/auth.interceptor.ts`, which already shows one toast for some refusals (data-API 429, 403
  `no_permission`) and tells callers with `refusalShownToUser` (`src/app/core/utils/server-refusal.util.ts`).
- The AI modals show a daily bar from `GET /api/v1/ai/usage` (`server/routes/ai.js:132`, public, the chain's shared
  daily budget) through `GeminiService.fetchUsage`.

## Goals & Success Criteria
**Primary:** a signed-in user who is not a platform admin can make 100 counted AI requests in all; from then on every
AI request is refused by the server before the model is called, and the screen shows «מכסת השימוש שלך ב-AI הסתיימה.
כדי לקבל עוד, פנו אל dan.weibren@gmail.com». A platform admin can raise one user's allowance in «ניהול משתמשים».

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:server` exits 0, including `server/test/ai-allowance.test.js` (A2, A3, A4) and `server/test/ai-cap.test.js` (unchanged, still green).
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/interceptors/auth.interceptor.spec.ts`, `src/app/core/utils/ai-error.util.spec.ts`, `src/app/core/utils/server-refusal.util.spec.ts` (A5), `src/app/core/services/user-admin.service.spec.ts` and `src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts` (A6).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/736-ai-calls-allowance-per-user.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/736-ai-calls-allowance-per-user.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] As a platform admin, open the dashboard page `/dashboard?tab=metadata` and scroll to the card «ניהול משתמשים»: each user row shows «מכסת AI» with a number (100 for a user never changed) and «נוצלו N». Set a test user's number to 2, press «שמור»: the toast «מכסת ה-AI עודכנה» shows, and after a reload the row still says 2.
- [human] Sign in as that test user (allowance 2) and create a recipe with AI twice: both work. The third try shows the toast «מכסת השימוש שלך ב-AI הסתיימה. כדי לקבל עוד, פנו אל dan.weibren@gmail.com» and no recipe draft; a fourth try shows the same toast again.
- [human] Still as the test user, open the AI recipe window: under the daily bar it says «נשארו לך 0 מתוך 2 קריאות AI». Back as the platform admin, raise the user to 5; the user's next AI try works and the line says «נשארו לך 2 מתוך 5 קריאות AI».
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: as the platform admin, open `/dashboard?tab=metadata` with the server stopped (or the network off), change a user's «מכסת AI» and press «שמור»: a readable error toast «שגיאת שרת, נסה שוב מאוחר יותר» appears, not a blank page, the row keeps its old number and «שמור» can be pressed again to retry.
- [human] As the platform admin yourself, the AI recipe window says «קריאות AI ללא הגבלה (מנהל מערכת)» and AI keeps working whatever your own number is.

## Execution Mode
- Parallel: no with plan 730 (it also edits `server/services/gemini-client.js` and `server/test/ai-usage.test.js`); run
  after 730 merges or serially in the same run. Parallel with 731–735 and 737 (no shared file).
- Concurrent plans: any that do not touch `server/services/gemini-client.js`, `server/routes/ai.js`,
  `src/app/core/interceptors/auth.interceptor.ts` or the user management card.
- Isolated DB: no — three optional fields on `users` (missing means the default); no migration.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/ai-allowance.schema.ts
shared/schemas/index.ts
server/generated/schemas/ai-allowance.schema.js
server/services/ai-allowance.js
server/services/gemini-client.js
server/routes/ai.js
server/routes/admin.js
server/models/user.model.js
server/test/ai-allowance.test.js
server/test/ai-cap.test.js
server/test/gemini-client.test.js
server/test/helpers/app.js
server/breadcrumbs.md
src/app/core/interceptors/auth.interceptor.ts
src/app/core/interceptors/auth.interceptor.spec.ts
src/app/core/utils/ai-error.util.ts
src/app/core/utils/ai-error.util.spec.ts
src/app/core/utils/server-refusal.util.ts
src/app/core/utils/server-refusal.util.spec.ts
src/app/core/utils/gemini-usage.util.ts
src/app/core/utils/gemini-usage.util.spec.ts
src/app/core/models/admin-user.model.ts
src/app/core/services/user-admin.service.ts
src/app/core/services/user-admin.service.spec.ts
src/app/pages/metadata-manager/components/user-management/**
src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-menu-modal/**
src/app/shared/ai-product-modal/**
src/app/pages/diagnosis/components/diag-menu/diag-menu.component.ts
src/app/pages/inventory/components/product-import/invoice-import.util.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.ts
src/app/shared/voice-note/voice-note.component.ts
src/app/core/breadcrumbs.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
docs/agent/standards-backend.md
docs/brain/component-families.md
server/test/ai-diag-menu.test.js
server/test/ai-invoice-read.test.js
server/test/ai-known-metadata.test.js
server/test/ai-logistics-extract.test.js
server/test/ai-match-product-names.test.js
server/test/ai-menu.test.js
server/test/ai-receipt-photo.test.js
server/test/ai-shots-saved.test.js
server/test/ai-shots-shared.test.js
server/test/ai-shots.test.js
server/test/ai-stock-extract.test.js
server/test/ai-usage.test.js
server/test/ai-voice-transcribe.test.js
server/test/generate-from-url.test.js
server/test/knowledge-import.test.js
server/test/modules-registry.test.js
server/test/price-list-prompt.test.js
server/test/product-import-route.test.js
src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — every model call still goes through `callGemini` behind `/api/v1/ai`; the allowance is one more
  refusal inside that same function, before any request to Google. No key reaches the browser.
- INV-4: preserves — the admin body is a Zod schema in `shared/schemas/ai-allowance.schema.ts`; `users` is not an
  entity type (auth and admin routers only, `docs/agent/standards-backend.md`), so no generic-route change.
- INV-1: preserves — no business data, scope or permission changes: the allowance is a field of the user, raised only
  by `requirePlatformAdmin` on `server/routes/admin.js`. No money field is involved (an AI call count is not a price).
  A consultant acting in another business spends his own allowance (the token's `userId`), never the owner's.
- INV-3: preserves — the admin saves one user's number with one PUT; no client loop over documents, no rename or
  cascade (the scope touches `src/app/pages/metadata-manager/**` only for the user list card).
- INV-2: preserves — `server/services/ai-allowance.js` reads and writes only the `users` collection by `_id`; no
  tenant query, no master data.
- Module gating: unchanged — each AI route keeps its `requireModule` gate; the allowance is checked after it, inside
  `callGemini`.

## Reuse Check
- `server/services/ai-allowance.js` (`reserveAiCall`, `refundAiCall`, `allowanceOf`, `trackAiAllowance`) — family: ai-cap — rung: 3 — why: the per-user twin of `capState`, checked at the same point in `callGemini`; one new file because the cap counts business tokens per month and this counts user requests for life
- `shared/schemas/ai-allowance.schema.ts` (`aiAllowanceUpdateSchema`, `AI_DEFAULT_ALLOWANCE`) — family: entity-schemas — rung: 3 — why: one small body schema plus the default both sides read
- the AI-budget toast in `auth.interceptor.ts` and `refusalShownToUser` for it — family: http — rung: 2 — why: the interceptor already toasts the data-API 429 and `no_permission` once; this is one more case
- `aiCapErrorKey` returning the budget key — family: feedback — rung: 2 — why: extends the existing helper; no second error helper
- `UserAdminService.setAiAllowance(userId, aiAllowance)` — family: http — rung: 2 — why: one PUT beside `deleteUser`
- the allowance number and save button on a user row — family: form-field — rung: 1 — why: `.c-input` with `appNumberBox` and a `.c-btn-ghost` save; no new piece

## Defaults

- confirm-destructive-action — exception — why: nothing is removed; lowering a user's number is undone by raising it again.
- empty-state-on-list — exception — why: no new list; the user list keeps its «אין משתמשים רשומים» state.
- loading-and-error-states — applies — how: the save button is disabled while the PUT runs; a refused number shows «מספר שלם בין 0 ל-100000» under the field and nothing is sent; a failed save shows the existing `server_error` toast and the row keeps the old number.
- unsaved-changes-on-leave — exception — why: one number per row saved by its own button; a typed, unsaved number is simply dropped on leave, like the other inline admin fields.
- hints-in-tooltips — exception — why: no hint text.
- leave-and-return — exception — why: the admin stays on the same card.
- app-list-container — exception — why: the user list is an existing card inside the metadata tab, not a page list.
- one-breakpoint-set — applies — how: no new `@media`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As Dan, I want every new visitor to the live app to get 100 AI requests and then be told to contact me, so one visitor cannot use up the free AI quota everyone shares.
- As a chef trying the app, I want a clear message with an email when my AI requests are over, so I know it is a limit and whom to ask, not a broken feature.
- As Dan (platform admin), I want to give one user more AI requests from the user list, so I can unblock a real prospect in a minute.

## Functional Requirements

### Must Have (P0)
- [ ] **Allowance on the user:** `users` gets optional `aiAllowance` (whole number) and `aiCallsUsed` (whole number). Missing `aiAllowance` reads as `AI_DEFAULT_ALLOWANCE` = 100 (exported from `shared/schemas/ai-allowance.schema.ts`), missing `aiCallsUsed` as 0 — so every existing and new user starts with 100 and no migration or sign-up change is needed. Both fields are added to `server/models/user.model.js` without a default.
- [ ] **What counts:** one counted call per user request that reaches the model and ends with a success answer (HTTP status below 400). Model retries inside one request (plan 614's up to 4 attempts, the recipe routes' second attempt after an unusable answer) count once. A request the server refuses or that fails (any 4xx/5xx answer: model busy, timeout, unusable answer, module off, over budget) does not count. A user who switches model after `model_exhausted` sends a new request, which counts only if it succeeds.
- [ ] **Reserve before the call, race safe** (`server/services/ai-allowance.js`): `reserveAiCall(db, holder)` does one `findOneAndUpdate` on `users` with `{ _id: userId, $expr: { $lt: [{ $ifNull: ['$aiCallsUsed', 0] }, { $ifNull: ['$aiAllowance', AI_DEFAULT_ALLOWANCE] }] } }` and `{ $inc: { aiCallsUsed: 1 } }`. No match → over budget. The holder is reserved at most once per request. `refundAiCall(db, userId)` does `$inc: { aiCallsUsed: -1 }` only where `aiCallsUsed > 0`. Parallel requests can never spend more than the allowance, because the check and the count are one atomic update.
- [ ] **One gate for every AI route:** `trackAiAllowance` is mounted on the AI router right after `trackAiOutcome` (`server/routes/ai.js:107`), so it also covers the five sub-routers. It sets `req.aiAllowance = { reserved: false }` and, on `res` `finish`, refunds when the request reserved and its status is 400 or more. `usageOf(req)` adds `allowance: req.aiAllowance` and fills in `userId` and `unlimited: req.user.isPlatformAdmin === true`. `callGemini` reserves through `usage.allowance` right before its attempt loop (after the module, catalog, business-cap and known-exhausted checks, so a call refused for another reason never reserves). Over budget → no request to Google, one ledger row with `errorCode: 'ai_budget_exhausted'` (like `business_cap`), and the result `{ kind: 'ai_budget_exhausted', model }`. Under the test runner, `callGemini` throws when `usage.userId` is set but `usage.allowance` is missing, so a new signed-in route cannot skip the gate.
- [ ] **The refusal answer:** `respondFromGeminiFailure` maps `ai_budget_exhausted` to HTTP 402 `{ error: 'AI_BUDGET_EXHAUSTED', code: 'AI_BUDGET_EXHAUSTED', contactEmail }`. `contactEmail` is `process.env.AI_BUDGET_CONTACT_EMAIL`, default `dan.weibren@gmail.com`. 402 is used, not 429, so the screens that read every 429 as "the daily model limit" do not show the wrong message.
- [ ] **Platform admins are unlimited:** a token with `isPlatformAdmin: true` never reserves and is never refused (the platform admin acting in a business included).
- [ ] **A database error never blocks AI:** if the reserve fails for a database reason (not "no match"), log `ai.allowance.check_failed` (warn, `userId` only) and let the call go on, the rule plan 617 uses for the cap. With Mongo not connected (`readyState !== 1`) the check is skipped.
- [ ] **The message on every attempt** (`auth.interceptor.ts`): an HTTP 402 whose body `code` is `AI_BUDGET_EXHAUSTED` shows one error toast: `ai_budget_exhausted` with `{{email}}` replaced by the body's `contactEmail` (fallback: the constant `AI_BUDGET_CONTACT_EMAIL` in `ai-error.util.ts`, same default), and logs `ai.budget_exhausted` at info, not as an app error. `refusalShownToUser` returns true for it. `aiCapErrorKey` returns `ai_budget_exhausted_short` for it, so the five screens that already use it show «מכסת ה-AI שלך הסתיימה» inline instead of a "try again" error.
- [ ] **Platform admin raises a user:** `GET /api/v1/admin/users` also returns `aiAllowance` (the default when missing) and `aiCallsUsed` (0 when missing). New `PUT /api/v1/admin/users/:userId/ai-allowance` (`verifyToken`, `requirePlatformAdmin`), body `aiAllowanceUpdateSchema` = `{ aiAllowance: int 0–100000 }`; 400 `Validation failed` with issues, 404 for an unknown user; sets `aiAllowance`, pushes `{ at, by, byName, from, to }` onto the user's `aiAllowanceHistory` (last 20 kept) as the durable audit line, logs `admin.ai_allowance.updated` with the target `userId`, `from`, `to`, and answers `{ ok: true, aiAllowance, aiCallsUsed }`. `aiCallsUsed` is never reset by this route.
- [ ] **The admin row:** in «ניהול משתמשים» each row shows a number field «מכסת AI» (`appNumberBox`, `.c-input`), «נוצלו N» and a `.c-btn-ghost` «שמור» that is enabled only when the number changed and is a whole number from 0 to 100000. Save → `UserAdminService.setAiAllowance` → toast `admin_ai_allowance_saved`, the row shows the answer's numbers.

### Should Have (P1)
- [ ] **Calls left for the user:** `GET /api/v1/ai/usage` takes `optionalToken`; for a signed-in user it adds `mine: { allowance, used, remaining, unlimited }` (one read of the user by `_id`). Without a token the answer is unchanged. `GeminiUsage` gets optional `mine`; the recipe, menu and product AI windows show under the daily bar «נשארו לך {{left}} מתוך {{total}} קריאות AI», or «קריאות AI ללא הגבלה (מנהל מערכת)» when `unlimited`.
- [ ] **The four screens that compare the cap string themselves** (diag menu, invoice import, logistics note draft, voice note) read `aiCapErrorKey` first, so they also show the short inline line.
- [ ] `docs/agent/standards-backend.md`: the `aiUsage` row notes `errorCode: 'ai_budget_exhausted'`; the API table gets the new PUT, the `mine` field of `/ai/usage`, and "every AI route: 402 `AI_BUDGET_EXHAUSTED`". `server/breadcrumbs.md` lists `services/ai-allowance.js`; `docs/brain/component-families.md` `ai-cap` names it.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only. The admin number field sits on the row's inline end before the delete button; on a phone it wraps under the name.
- Dictionary keys (append-only, `general`): `ai_budget_exhausted` ("מכסת השימוש שלך ב-AI הסתיימה. כדי לקבל עוד, פנו אל {{email}}"), `ai_budget_exhausted_short` ("מכסת ה-AI שלך הסתיימה"), `ai_calls_left` ("נשארו לך {{left}} מתוך {{total}} קריאות AI"), `ai_calls_unlimited` ("קריאות AI ללא הגבלה (מנהל מערכת)"), `admin_ai_allowance` ("מכסת AI"), `admin_ai_allowance_used` ("נוצלו {{used}}"), `admin_ai_allowance_saved` ("מכסת ה-AI עודכנה"), `admin_ai_allowance_invalid` ("מספר שלם בין 0 ל-100000").
- The placeholders are filled with `.replace('{{email}}', …)` the way `saveRefusalMessage` fills `{{fields}}`.
- No new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Give every user a lifetime AI allowance of 100 that the server and browser both know — `AI_DEFAULT_ALLOWANCE`, `AI_ALLOWANCE_MAX`, `aiAllowanceUpdateSchema`; two optional user fields; export from the schema index — shared/schemas/ai-allowance.schema.ts, shared/schemas/index.ts, server/models/user.model.js
- [x] A2: Count one AI request per user and refuse the next one before the model is called — `server/services/ai-allowance.js` (atomic reserve, refund, `allowanceOf`, `trackAiAllowance`), the reserve in `callGemini`, `usageOf` and the router mount, the 402 answer; tests: counts one per success, retries count once, a 502/504 is refunded, the 101st request is 402 with no fetch, missing fields read as 100, five parallel requests at allowance 2 reach the model exactly twice, a platform admin is never counted, a database error lets the call through, the vitest guard throws without `allowance` — server/services/ai-allowance.js, server/services/gemini-client.js, server/routes/ai.js, server/test/ai-allowance.test.js
- [x] A3: Keep the existing AI tests green with the new gate — any direct `callGemini` test that passes a `userId` adds an `allowance` holder; the cap tests still pass — server/test/gemini-client.test.js, server/test/ai-cap.test.js, server/test/helpers/app.js
- [x] A4: Let the platform admin see and raise one user's AI allowance — the two fields in `GET /admin/users`, the PUT with schema, 404, history row and log line; tests: admin raises, owner gets 403, bad body 400, unknown user 404, the raised user can call again — server/routes/admin.js, server/test/ai-allowance.test.js
- [x] A5: Show the budget-over message with the email on every AI attempt, on every screen — the interceptor toast and info log, `refusalShownToUser`, `aiCapErrorKey` short key, the email constant; specs: a 402 `AI_BUDGET_EXHAUSTED` toasts the email once per answer, another 402 does not, the helper returns the short key — src/app/core/interceptors/auth.interceptor.ts, src/app/core/utils/ai-error.util.ts, src/app/core/utils/server-refusal.util.ts and their specs
- [x] A6: Add the allowance number and save button to each row of the admin user list — model fields, `setAiAllowance`, row field with validation; specs: the PUT is sent with the number, a bad number never sends, a failed save keeps the old number — src/app/core/models/admin-user.model.ts, src/app/core/services/user-admin.service.ts, src/app/pages/metadata-manager/components/user-management/**
- [x] A7: Show each user how many AI calls are left in the AI windows — `optionalToken` and `mine` on `/ai/usage`, `GeminiUsage.mine`, the line in the three AI windows; a server case and a util spec case — server/routes/ai.js, src/app/core/utils/gemini-usage.util.ts, src/app/shared/ai-recipe-modal/**, src/app/shared/ai-menu-modal/**, src/app/shared/ai-product-modal/**
- [x] A8: Make the four screens with their own cap check show the same short line — read `aiCapErrorKey` first — diag-menu.component.ts, invoice-import.util.ts, logistics-note-draft.component.ts, voice-note.component.ts
- [x] A9: Add the Hebrew words — the keys of UI/UX Notes — public/assets/data/dictionary.json
- [x] A10: Record the allowance in the maps and docs and run every check — paste outputs under Execution Notes — server/breadcrumbs.md, src/app/core/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, docs/agent/standards-backend.md, docs/brain/component-families.md

## What happens when
- Two tabs fire AI requests together with one call left: the atomic update lets exactly one reserve; the other gets
  402 and the toast.
- The model answers but the route refuses the answer (unusable JSON → 502): the reserve is refunded on `finish`; the
  user is not charged.
- The browser closes the connection mid-request: `finish` may not fire, so the reserve stays (the model was most likely
  called). Accepted; recorded as a `behaviour:` decision.
- The platform admin lowers a user below what the user already used (allowance 50, used 80): the next request is
  refused; `aiCallsUsed` is kept as it is.
- A platform admin flag is taken away (plan 737's `--off`): the old token still says admin until it is refreshed (at
  most the access token's life), so AI stays unlimited until then.
- The Render server restarts: nothing is lost; the count lives on the user record.
- Mongo is down: AI is not blocked by the allowance (the routes fail on their own if they need the database).

## Technical Considerations
- Dependencies: plan 617 (`capState` in `callGemini`, the refusal-before-the-call pattern), plan 580 (`trackAiOutcome`,
  the per-request `req.aiUsageIds`), plan 614 (retries inside `callGemini`), plan 456 (interceptor toasts).
- New files: `server/services/ai-allowance.js`, `shared/schemas/ai-allowance.schema.ts` (built to
  `server/generated/schemas/ai-allowance.schema.js` by `pnpm run build:schemas`, which is not tracked by git),
  `server/test/ai-allowance.test.js`.
- Model changes: three optional fields on `users` (`aiAllowance`, `aiCallsUsed`, `aiAllowanceHistory`). They never
  reach `toPublicUser` (`server/routes/auth.js`) or the token. No migration: missing fields read as the defaults.
- Backend / API: one new admin PUT; `GET /ai/usage` gains `optionalToken` and `mine`; every AI route can answer 402
  `AI_BUDGET_EXHAUSTED`. New env `AI_BUDGET_CONTACT_EMAIL` (optional; the default is Dan's address, so Render needs no
  change).
- Out of the count on purpose: guest and public AI. Main has none; branch `chore/restaurant-staging` adds the front-desk
  assistant (`server/services/frontdesk-turn.js`, guest turns with their own `usage`) and two signed-in routes in
  `server/routes/ai/frontdesk.js` (`/frontdesk/suggest`, `/frontdesk/fix`) that build `usage` by hand. When staging
  merges, the vitest guard will fail on those two signed-in routes until they add `allowance: req.aiAllowance`
  (a one-line change each); the guest turns have no `userId` and stay outside the allowance.
- Collision: plan 730 edits `callGemini`'s model chain in the same file; the reserve sits in a different block (before
  the attempt loop), so a rebase is a small textual merge.
- Security surface (auth and storage): the count is a server-side field updated only by the server; the browser cannot
  set it (the PUT is platform admin only and validated); no email, name or IP is logged — log lines carry `userId` only.
  The contact email is public by design.
- Cost: none. It lowers the risk of the free Gemini tier running out for all users.

## Out of Scope
- A daily or monthly per-user limit, paid top-ups, or a self-service "ask for more" form.
- Guest and public AI (front-desk guest turns on the staging branch).
- Resetting `aiCallsUsed` from the admin screen (raising the allowance is the one control).
- Changing the per-business monthly token cap (plan 617) or the shared daily model budget.

## Critical Questions
- none — Dandan's request of 2026-11-25 sets the number, the lifetime rule and the message; the counting rule (one
  per successful request, retries once), 402, fail-open on a database error and the admin row placement are the
  Planner's defaults, and anything they do not settle is a `behaviour:` decision for him to grade.

## Execution Notes
- Planner 2026-11-25: written from Dandan's requests of 2026-11-25
- Builder round 2 (fresh judgment builder, re-implemented from base 9cb4bcf3):
  - Rerun of the failing check first, on the base: `pnpm run test:server` → exit 1, `Test Files 2 failed | 147 passed`
    (ai-receipt-photo 500s, ai-shots-saved 30 s timeout) with no plan change in the tree; the same two files alone →
    exit 0, `27 passed`. Load flake under the full suite, not a code fault.
  - A user with no `users` record (the tests' fake ids, a token of a removed user) is not counted: `reserveAiCall`
    reads the record once after a no-match and answers `no_user`, so the call goes on. Existing test files therefore
    needed no seeded users; only `server/test/ai-usage.test.js` (direct `callGemini` with a `userId`) got an
    `allowance` holder. `gemini-client.test.js` and `ai-cap.test.js` pass no `userId` and are unchanged.
  - The vitest guard sits at the top of `callGemini`, beside the `usage.feature` guard, so it fires on every path.
  - Logistics note and voice note: when the interceptor already toasted the budget refusal (`refusalShownToUser`) they
    add no second toast and no error log; otherwise they read `aiCapErrorKey` first.
  - `server/test/ai-allowance.test.js` → `npx vitest run test/ai-allowance.test.js` exit 0, `30 passed`.
  - Neighbours not in scope run alone: admin-business, auth-business, gemini-client, admin-platform, modules-gate,
    ai-product-from-image, usage-days → exit 0, `148 passed`.
  - `pnpm run build` → exit 0 (budget warnings only, as before). `pnpm run lint` → exit 0, `0 errors`.
  - `node scripts/scope-check.mjs --arch` → `ARCH: ok INV-6, INV-4, INV-1, INV-3, INV-2`; `--reuse` → `REUSE: ok`.
  - `node scripts/breadcrumbs-check.mjs` → `BREADCRUMBS: clean`. kit-manifest-check → `KIT_MANIFEST: ok`.
  - `pnpm run test:ci` → exit 0, `TOTAL: 2794 SUCCESS`.
  - override-check, lint:icons, lint:no-native-select, plan-ledger-check → exit 0.
