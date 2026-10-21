# Plan 472 — Make the sign-up business name optional and let the owner rename it

Status: draft
Track: code
Snapshot: feb9f3da29fafafdacf2f3f12cfd22a5791d58f6

## Problem Statement
The Human asked (handoff `docs/mvp/review-handoff-2026-10-21.md` H4, decision D1, answered): sign-up must not
require a business name. When the box is left empty the business is called «העסק של {{name}}» (the username) and
the owner can rename it later in Settings. The Human also wants the sign-up form to say that staff do not sign up.

Verified in code on `feb9f3da`:
- `server/routes/auth.js:169-173` refuses sign-up without a business name (`BUSINESS_NAME_REQUIRED`, 400) and
  `:200` passes the trimmed name to `createBusinessFor`.
- The default already exists on the server: `server/services/business.js:13`
  `const defaultBusinessName = name => \`העסק של ${name}\`` and `createBusinessFor` (`:16-19`) uses it when `name`
  is `null`/`undefined` (`name: name ?? defaultBusinessName(user.name)`). Migration `server/migrations/0006-business-tenant.js:41`
  uses the same function. So the server is already the one source of the default; the Hebrew pattern lives in a
  `.js` server service (existing precedent), not in any `.ts` file. No dictionary key is needed for the stored name.
- The client also refuses an empty name: `auth-modal.component.ts:139-148` sets `business_name_required`, and the
  input has `required` (`auth-modal.component.html:64-85`). `UserService.signup` (`user.service.ts:312`) sends
  whatever string it gets; an empty string reaches the server unchanged.
- **The business cannot be renamed today.** `server/routes/business.js` has `GET /` (`:33`), `PUT /settings` (`:45`),
  `PUT /baseline` (`:64`), `GET /setup-status` (`:88`) and team routes, but no route writes `name`.
  `BusinessService` (`business.service.ts:39-59`) only PUTs `settings` and `baseline`, and the Settings «הגדרות עסק»
  tab (`business-settings-tab.component.html`) shows only the three percent numbers. So "renameable later in
  Settings" needs a small owner-only rename route and one field.
- Where the name shows: `supplier-orders.component.ts:88` (sender name of supplier orders), the platform admin user
  list (`user-management.component.html:20-21`). Nothing else reads it.
- Staff fact for the hint (verified): sign-up always creates a new business with the user as owner
  (`auth.js:199-200` `createBusinessFor`, `business.js:26` `businessRole: 'owner'`); staff are created only by
  `POST /api/v1/business/team` (`server/routes/business.js:140`, `ownerOnly`).

## Goals & Success Criteria
- Primary: a new user can sign up with the business name left empty and gets «העסק של <username>»; the owner can
  rename the business in Settings → «הגדרות עסק»; the sign-up form tells staff they do not sign up.
- Success:
  - [ ] [auto] `npm --prefix server test` passes, including updated and new tests: sign-up with no `businessName` → 201 and the business is named `העסק של chefone`; sign-up with `'   '` → 201, same default; 201 characters still → 400 `BUSINESS_NAME_TOO_LONG`; owner `PUT /api/v1/business/name` `{ name: '  מטבח דנה ' }` → 200 `{ name: 'מטבח דנה' }` and stored; empty or 201-char name → 400; staff → 403 and the name is unchanged; a second business's name is never touched.
  - [ ] [auto] `npx ng test --watch=false --include='src/app/core/components/auth-modal/**/*.spec.ts' --include='src/app/core/services/business.service.spec.ts' --include='src/app/pages/settings/components/business-name-form/**/*.spec.ts'` passes, including: an empty business name sends the sign-up request with `''` and shows no error; the placeholder shows «העסק של <typed username>»; the rename form shows the stored name, keeps save disabled until it changes, refuses empty, and calls `updateName` with the trimmed text.
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Replay H4: sign out, open sign-up, fill username `chef472`, email, password twice, leave «שם העסק» empty. The box shows the grey hint «העסק של chef472» and a line under it says the name can be changed in Settings. Press sign-up: the account is created, no error.
  - [ ] [human] After that sign-up open `/settings?tab=business`: the top field «שם העסק» shows «העסק של chef472». Change it to «מטבח 472» and save: a success message shows; reload the page and the new name is still there.
  - [ ] [human] On the sign-up form a short line says staff do not sign up here and that the owner adds them in Settings → צוות. Check it fits on a phone (375px) without pushing the sign-up button off the window.
  - [ ] [human] Sign in as a staff member and open `/settings` → still not reachable (no change for staff).

## Execution Mode
- Parallel: no — writes `server/routes/business.js`, `src/app/core/services/business.service.ts` and the settings
  business tab template, which plan 469 also writes.
- Concurrent plans: 469 (settings centring, setup counter: same `server/routes/business.js`, `business.service.ts`
  and `business.service.spec.ts`, and the business tab's scss). Run 472 after 469 is merged into `mvp`, or rebase
  onto it; both add lines in different places, keep both.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only (never `main`); executed per `docs/mvp/run-mode.md` — `[human]`
  items become validation cards in `docs/mvp/runs/472.md`.
- Depends on: plan 469 merged (soft — shared files above; no code dependency).
- The default name is built on the server only (`defaultBusinessName`, unchanged). The client only *previews* it as a
  placeholder through the new dictionary key `business_name_default`; the two texts must say the same thing.
- Contract extension (log it in `docs/mvp/mvp-map.md` → `## Contract extensions (run)`): `PUT /api/v1/business/name`
  (owner only, `{ name }` → `{ name }`), `businessNameInputSchema` in `shared/schemas/entities/business.schema.ts`,
  `BusinessService.updateName(name)`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/auth.js
server/routes/business.js
server/services/business.js
server/test/auth-signup-business-name.test.js
server/test/business-name.test.js
shared/schemas/entities/business.schema.ts
src/app/core/components/auth-modal/auth-modal.component.ts
src/app/core/components/auth-modal/auth-modal.component.html
src/app/core/components/auth-modal/auth-modal.component.scss
src/app/core/components/auth-modal/auth-modal.component.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/pages/settings/components/business-name-form/**
src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.html
src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts
docs/mvp/mvp-map.md
docs/mvp/runs/472.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-2: preserves — `server/services/business.js` gains one function that updates the `name` of the caller's own business by `_id` (same shape as `setBusinessSettings`); a new business still gets its own copy of master; no scoping, sync or tenancy rule changes.
- INV-4: preserves — the new rename body is a Zod schema in `shared/schemas/entities/business.schema.ts` (`businessNameInputSchema`, built from the existing `nameField`), and the server validates the write against it; `businessSchema.name` is unchanged.
- INV-1: preserves — rename is owner-only through the existing `assertCan(req, res, 'editSettings', { type: 'businesses' })`; no permission rule or file of INV-1's Touches is edited.

## Backend Impact
- Collections affected: `businesses` (the `name` field: written at sign-up as today, and by the new rename route).
- New collections: no
- Server changes needed: yes — `POST /api/v1/auth/signup` accepts an empty/missing `businessName`; new
  `PUT /api/v1/business/name` (owner only).

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. Find on `origin/mvp`: `BUSINESS_NAME_REQUIRED` and
`createBusinessFor(user, { name: trimmedBusinessName` in `server/routes/auth.js`; `defaultBusinessName` and
`setBusinessSettings` in `server/services/business.js`; `router.put('/settings'` in `server/routes/business.js`;
`_put<K extends 'settings' | 'baseline'>` in `business.service.ts`; `business_name_required` in `auth-modal.component.ts`.
Print `ok` or `conflict: <what>` per symbol. Also check whether plan 469 merged and moved lines in `business.js` /
`business.service.ts`; if so, build on it.

## User Stories
- As a chef signing up, I want to skip the business name so that I can start working right away and name my business later.
- As a chef who owns the business, I want to rename my business in Settings so that supplier orders carry the right name.
- As a cook whose owner uses FoodVibe, I want the sign-up form to tell me I do not sign up myself so that I do not open a second, empty business by mistake.

## Functional Requirements

### Must Have (P0)
- [ ] Sign-up with an empty or missing business name succeeds and names the business «העסק של <username>» (server default, `defaultBusinessName`); a name longer than 200 characters is still refused.
- [ ] The sign-up form no longer requires the business name; its placeholder previews «העסק של <username>» from the typed username, and a one-line hint says it can be changed later in Settings.
- [ ] The sign-up form shows a one-line hint that staff do not sign up — the owner adds them in Settings → צוות.
- [ ] Settings → «הגדרות עסק» starts with a «שם העסק» field holding the stored name, with its own save button; save trims, refuses empty and more than 200 characters, and updates the name everywhere the app reads `BusinessService.business_()`.
- [ ] Only the owner can rename (server 403 for staff; staff never see Settings, unchanged).

### Nice to Have (P1)
- [ ] None.

## UI/UX Notes
- RTL; logical CSS properties only; `translatePipe` for every text; OnPush; `inject()`; signals.
- Sign-up form (`auth-modal`): the business-name box keeps its place; remove `required`; label stays `business_name`;
  `[placeholder]` = `business_name_default` with `{{name}}` replaced by the trimmed username (when the username is
  empty, show the plain `business_name_default` with `{{name}}` replaced by the translated `username` word). Under the
  box, a muted one-line hint `business_name_default_hint`. The staff hint `signup_staff_hint` is one muted line at the
  top of the sign-up fields (sign-up mode only). Both hints use one small local class in `auth-modal.component.scss`
  (muted colour, small font) — no new `.c-*` class.
- Settings: a new small component `app-business-name-form` above the numbers form inside the «הגדרות עסק» tab —
  label `business_name`, text box (`maxlength` 200), help line `settings_business_name_help`, field error
  `business_name_required` / `business_name_too_long`, save button `save`, success toast `business_name_saved`,
  failure toast `save_failed` with `logging.error`. It reuses the tab's existing look (`c-glass-panel`,
  `c-input-wrapper`, `c-field-error`, `c-form-actions`, `c-btn-primary`).
- New dictionary keys (append at the end of `dictionary.json`):
  - `business_name_default` «העסק של {{name}}»
  - `business_name_default_hint` «לא חובה. אם תשאירו ריק, העסק ייקרא בשם המשתמש – אפשר לשנות בהגדרות.»
  - `signup_staff_hint` «עובדים במטבח לא נרשמים כאן – בעל העסק מוסיף אותם בהגדרות ← צוות.»
  - `settings_business_name_help` «השם של העסק, כפי שהוא מופיע בהזמנות לספקים»
  - `business_name_saved` «שם העסק נשמר»
- Existing keys reused: `business_name`, `business_name_required`, `business_name_too_long`, `username`, `save`, `save_failed`.

## Atomic Sub-tasks
- [ ] S1: Let sign-up go through with no business name and use the default name — remove the `BUSINESS_NAME_REQUIRED` refusal, keep the 200-character check, pass `name: trimmedBusinessName || undefined` so `createBusinessFor` falls back to `defaultBusinessName(user.name)`; update the plan 426 comment — `server/routes/auth.js`
- [ ] S2: Update the sign-up server tests to the new rule — the "missing or blank" case now expects 201 and a business named `העסק של chefone` (one user, one business); keep the too-long and exact-200 cases — `server/test/auth-signup-business-name.test.js`
- [ ] S3: Add the rename body schema — `businessNameInputSchema = z.strictObject({ name: nameField.trim().min(1) })` and its type, next to `businessSettingsSchema` — `shared/schemas/entities/business.schema.ts`
- [ ] S4: Add an owner-only rename route — `PUT /api/v1/business/name`: `assertCan(req, res, 'editSettings', { type: 'businesses' })`, parse with `businessNameInputSchema` (400 `Validation failed` with issues, like `/settings`), new service function `setBusinessName(id, name)` (`updateOne` by `_id`, `$set: { name }`), 404 when no match, reply `{ name }`, `req.log.info`/`error` events `business.name.saved` / `business.name.failed` — `server/routes/business.js`, `server/services/business.js`
- [ ] S5: Test the rename route — owner 200 trimmed and stored; empty, spaces-only and 201 characters → 400; staff → 403 and unchanged; another business untouched — `server/test/business-name.test.js`
- [ ] S6: Let the browser save the new name — `updateName(name: string)` on `BusinessService` through `_put` (widen its key type to include `'name'`, body `{ name }`), so `business_()` gets the stored name; spec for the PUT URL, body and the updated signal — `src/app/core/services/business.service.ts`, `src/app/core/services/business.service.spec.ts`
- [ ] S7: Make the business name optional on the sign-up form — drop the empty-name check and the `required` attribute, keep the length check, send the trimmed text (may be empty); placeholder preview and the hint line under the box; keep the server error mapping for `BUSINESS_NAME_TOO_LONG` (the `BUSINESS_NAME_REQUIRED` branch may stay as harmless fallback); spec: empty name sends `''` with no error, placeholder follows the username — `auth-modal.component.ts`, `auth-modal.component.html`, `auth-modal.component.scss`, `auth-modal.component.spec.ts`, `public/assets/data/dictionary.json`
- [ ] S8: Tell staff on the sign-up form that the owner adds them — the `signup_staff_hint` line at the top of the sign-up fields, sign-up mode only; spec: shown in sign-up, hidden in sign-in — `auth-modal.component.html`, `auth-modal.component.scss`, `auth-modal.component.spec.ts`, `public/assets/data/dictionary.json`
- [ ] S9: Add the business-name field to Settings — new standalone OnPush component under the settings components folder: reactive control (required, max 200, trimmed), filled from `BusinessService.business_()?.name` until the owner types, save disabled while saving, empty, unchanged or invalid; on save call `updateName`, success toast, 400 → `settings_invalid` toast, other non-403 errors → `save_failed` + `logging.error`; place it at the top of the «הגדרות עסק» tab; spec — `src/app/pages/settings/components/business-name-form/business-name-form.component.ts`, `.html`, `.scss`, `.spec.ts`, `business-settings-tab.component.html`, `business-settings-tab.component.ts`, `public/assets/data/dictionary.json`
- [ ] S10: Record the contract extension, build, run server and client tests, write the run file with the validation cards (sign-up at 375px and 1280px) — `docs/mvp/mvp-map.md`, `docs/mvp/runs/472.md`

## Technical Considerations
- Dependencies: `defaultBusinessName`, `createBusinessFor` (`server/services/business.js`), `assertCan` with `editSettings` (owner-only in `server/utils/permissions.js:15`), `nameField` / `NAME_MAX_LENGTH` (`shared/schemas/base.schema.ts`), `BusinessService._put`.
- New files: `server/test/business-name.test.js`; `src/app/pages/settings/components/business-name-form/business-name-form.component.{ts,html,scss,spec.ts}` (`@layer` in the scss, `app-` prefix, no `.c-*` definitions).
- Model changes: none to stored shapes; `businessNameInputSchema` is a request body schema. `server/generated/schemas` is rebuilt from `shared/schemas` by the normal build (gitignored).
- Hebrew pattern: one stored source (`defaultBusinessName` in the server `.js` service, as today); the client preview uses the dictionary key `business_name_default` with `.replace('{{name}}', …)` — the same pattern other components use (`event-closing-dialog.component.ts:120`). No raw Hebrew in `.ts`.
- Username rules (3–20 characters) keep the default name far under 200 characters.
- Security surface: the rename route is owner-only and writes only the caller's own business (`req.user.businessId`).
- Data / migration: none; existing businesses keep their names.
- Project checks: log-query [auto]; chef-side stories; five new dictionary keys listed; the new route is a dedicated endpoint because `businesses` is not on the generic `/api/v1/data/:type` pipe (`business.schema.ts:31`).

## Out of Scope
- Any export, print or preview of a recipe or a menu — plan 471, not this run.
- Showing the business name in the header or anywhere new.
- A staff "join an existing business" flow or invite links.
- Settings layout centring and the setup card — plan 469.
- Renaming or removing existing dictionary keys (`business_name_required` stays; it is still used for the Settings field).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. **Staff hint on the sign-up form — keep it?** Recommended: **yes**, one muted line at the top of the sign-up fields (it costs one line, and a cook who signs up by mistake opens an empty second business). Alternative: drop the line (skip S8) if the window feels crowded on a phone; the Human decides at the [human] check.
2. **Where the rename lives.** Recommended: the top of Settings → «הגדרות עסק», its own save button. Alternative: a pencil next to a business name shown in the header (more work, outside this plan).
