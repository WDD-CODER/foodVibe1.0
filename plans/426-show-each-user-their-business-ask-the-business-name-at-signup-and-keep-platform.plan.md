# Plan 426 — Show each user their business, ask the business name at signup, and keep platform screens for the platform admin

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 01.1, last of three plans (424 → 425 → 426). After plan 425 the server keeps every business's data apart
and knows who is a platform admin (`isPlatformAdmin`), but the client still thinks in the old global `role`:
`UserService.isAdmin_` (`user.service.ts`, `role === 'admin'`), the header crown
(`header.component.html`, `user_()?.role === 'admin'`), `kitchen-state.service.ts` (`user.role !== 'admin'`),
token claims in `_tokenClaims`. Signup asks no business name; a login refused with NO_BUSINESS or
USER_REMOVED shows "server error" (`UserService.login` maps only 401/423/429); and the user-management and
AI-model sections of the metadata manager (`/dashboard?tab=metadata`) are shown to everyone with a lock
message instead of being platform-admin screens. The admin user list shows no business, and deleting an owner
(which now deletes the whole business, plan 425) asks only once.

This plan moves the client onto the business model: user state carries `businessId`, `businessRole`,
`isPlatformAdmin`; a `BusinessService` holds the user's business; signup requires a business name; login shows
the two new block messages; platform-admin-only sections are hidden from everyone else; the admin user list
shows business and role and asks twice before deleting a business; and the last reads of `role` go away
(client and token).

## Goals & Success Criteria
- Primary: a new owner signs up with a business name and sees it in the header; an owner never sees platform
  screens; a user with no business gets the Hebrew block message.
- Success:
  - [x] [auto] `npx ng test --watch=false --include='src/app/core/services/user.service.spec.ts' --include='src/app/core/services/business.service.spec.ts' --include='src/app/core/services/taxonomy-store.service.spec.ts' --include='src/app/core/components/auth-modal/**/*.spec.ts' --include='src/app/core/components/header/**/*.spec.ts' --include='src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts' --include='src/app/pages/metadata-manager/components/user-management/**/*.spec.ts'`
    passes, including the new specs:
    - `UserService`: a login response with `isPlatformAdmin: true` → `isPlatformAdmin_()` true, `isAdmin_()` true
      (alias); `businessRole: 'owner'` → `isOwner_()` true; a refreshed token's claims (`businessId`,
      `businessRole`, `isPlatformAdmin`) land in `user_()`; login 403 `{ error: 'NO_BUSINESS' }` →
      `Error('NO_BUSINESS')`, 403 `{ error: 'USER_REMOVED' }` → `Error('USER_REMOVED')`; signup posts
      `businessName`;
    - `BusinessService`: signed-in user → one `GET <apiUrl>/api/v1/business`, `business_()` holds the reply;
      logout → `business_()` is `null`; a 404 leaves it `null` without throwing;
    - auth modal: sign-up with an empty business name → `errorKey()` `business_name_required` and no request;
      201 characters → `business_name_too_long`; `Error('NO_BUSINESS')` → `no_business`;
      `Error('USER_REMOVED')` → `user_removed`;
    - header: crown badge only when `isPlatformAdmin_()`; the business name from `business_()` shows in the user chip;
    - metadata manager page: user-management and AI-model sections and their jump tabs are absent when
      `isPlatformAdmin_()` is false and present when true;
    - user management: deleting an owner opens the confirm twice and calls `deleteUser` only after both yes;
      deleting a staff user asks once; a row of the admin's own business has the delete button disabled.
  - [x] [auto] `npm --prefix server test` passes, including `server/test/auth-business.test.js` (extended): signup
    without `businessName` → 400 `{ error: 'BUSINESS_NAME_REQUIRED' }`; 201 characters → 400
    `{ error: 'BUSINESS_NAME_TOO_LONG' }`; `businessName: '  מטבח דנה  '` → business named `מטבח דנה`; access
    tokens and the signup / login / guest `user` objects have no `role` key.
  - [x] [auto] `grep -rnE "(user|claims)[_A-Za-z]*(\(\))?\??\.role\b|role [!=]== 'admin'" src/app --include=*.ts --include=*.html --exclude=*.spec.ts`
    → no output (at snapshot it lists 5 lines: header.html:11, kitchen-state:275, user.service:36/237/256).
  - [x] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries. (Not checked against the slot DB: local MongoDB was down; re-run when it is up.)
  - [human] wt-1 slot `http://localhost:4201` → sign up → the form has «שם העסק»; leaving it empty shows «נא
    להזין את שם העסק»; fill «מטבח בדיקה» → signed in, the header chip shows «מטבח בדיקה» under the username.
    Phone width and desktop.
  - [human] Same new account → `http://localhost:4201/dashboard?tab=metadata`: no «ניהול משתמשים» and no AI
    models section, and no tabs for them in the phone jump bar; signed in as the dev guest (platform admin) both
    sections and the crown are there. Phone width and desktop.
  - [human] Signed in as the dev guest, user management lists the test account with «מטבח בדיקה» and «בעלים»;
    delete it → two questions, the second says it can't be undone; after yes the row is gone. Desktop.
  - [human] Sign in as the prepared account `nobiz-test` (the agent removes its business on the slot DB) → the
    sign-in window shows «החשבון לא משויך לעסק – פנה לתמיכה». Phone width and desktop.

## Execution Mode
- Parallel: yes with plans that touch none of the scope files below (check
  `node scripts/scope-check.mjs --overlap --plan=<this>` at take time); lane wt-1 runs it after 425.
- Concurrent plans: whatever wt-2 / wt-3 run, if the overlap check is clean.
- Isolated DB: yes — the slot DB holds the test accounts (`nobiz-test` gets its `businessId` unset there only).

## Execution Notes
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/426.md`.
- Depends on: plan 425 merged (server sends `businessId` / `businessRole` / `isPlatformAdmin`, `GET
  /api/v1/business`, NO_BUSINESS / USER_REMOVED, business-aware admin delete).
- Must not run at the same time as: plan 428 (it builds `/settings` from the same user state and
  metadata-manager sections). This plan does not edit growth-frozen files: `product-form.component.ts` and
  `recipe-builder.page.ts` keep using `UserService.isAdmin_`, which becomes a deprecated alias of
  `isPlatformAdmin_` (same meaning for those callers: "may push a new item to everyone").
- Server deploy order: the signup now requires `businessName`; the client sends it in the same merge (GitHub
  Pages + Render deploy from the same commit). A browser holding the old bundle gets
  `BUSINESS_NAME_REQUIRED` → shown as a server error until reload; acceptable for the pilot.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/models/user.model.ts
src/app/core/models/admin-user.model.ts
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/user-admin.service.ts
src/app/core/services/taxonomy-store.service.spec.ts
src/app/core/components/auth-modal/**
src/app/core/components/header/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/metadata-manager/components/user-management/**
server/routes/auth.js
server/test/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — implements ADR 0023 on the client: platform-admin screens follow `isPlatformAdmin`; the
  server (`requirePlatformAdmin`, plan 425) still decides.
- INV-2: preserves — implements ADR 0023: no change to clone, sync or taxonomy reads; the client only shows the
  business it already reads from.
- INV-3: preserves — `kitchen-state.service.ts` and the metadata manager change only an admin check and which
  sections render; no new client-side write loop.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `isAdmin_`, `_tokenClaims`,
`refreshToken`, `signup`, `login`, `callBackendSignup`, `_reloadDataServices` (`user.service.ts`);
`onSubmit`, `_onError`, `_reset` (`auth-modal.component.ts`); the `role-badge` block and `.user-meta`
(`header.component.html`); `permanentlyDeleteRecipe` (`kitchen-state.service.ts`); `jumpSections`,
`isAdmin`, `<app-user-management>`, `<app-ai-model-manager>` (metadata-manager page); `onDeleteUser`,
`loadUsers` (`user-management.component.ts`); `signAccess` and the signup handler (`server/routes/auth.js`);
`GET /api/v1/business` (`server/routes/business.js`). Print `ok` or `conflict: <what>` per commit.

## Contracts (verbatim from the approved MVP map)

**C-USER (424/425/426)**
- User fields added: `businessId: string`, `businessRole: 'owner' | 'staff'`, `isPlatformAdmin: boolean` (migration: `true` where `role === 'admin'`), `removedAt?: number` (staff removed → login blocked), `createdAt: number`. `role` stays read-only legacy until 426 removes client use.
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.
- Middleware: `requirePlatformAdmin` (new name) in `server/middleware/auth.js`; `requireAdmin` kept as an alias until 425 replaces all uses.
- Login with no businessId → 403 `{ error: 'NO_BUSINESS' }`, client key `no_business` → "החשבון לא משויך לעסק – פנה לתמיכה". Removed staff → 403 `{ error: 'USER_REMOVED' }`.

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

How this plan applies them: this plan removes `role` from the access token and the auth `user` objects, so the
payload becomes exactly the contract's. Client key for USER_REMOVED: `user_removed` → «המשתמש הוסר מהעסק – פנה
לבעל העסק». Signup body gains `businessName` (required, 1–200 chars after trim; errors `BUSINESS_NAME_REQUIRED`,
`BUSINESS_NAME_TOO_LONG`).

## User Stories
- As a chef opening a new account, I want to type my business's name at signup so that the app is set up for
  my kitchen from the first minute.
- As a chef, I want to see my business's name next to my username so that I know which kitchen I'm working in.
- As a chef who owns a business, I don't want platform tools (AI models, all users) in my settings so that my
  screens only show what belongs to my kitchen.
- As a cook whose account isn't linked to a business, I want a clear message instead of "server error" so that
  I know to call support.

## Functional Requirements

### Must Have (P0)
- [ ] Client user state has `businessId`, `businessRole`, `isPlatformAdmin`; `role` removed from the `User` model.
- [ ] `UserService.isPlatformAdmin_`, `businessRole_`, `isOwner_`; `isAdmin_` = deprecated alias of
      `isPlatformAdmin_`.
- [ ] `BusinessService.business_` loaded for a signed-in user, cleared on sign-out.
- [ ] Signup requires a business name (client and server).
- [ ] Login shows `no_business` / `user_removed` messages.
- [ ] User management and AI models sections (and their jump tabs) render only for a platform admin; header
      crown follows `isPlatformAdmin_`.
- [ ] Admin user list shows business name and role; deleting an owner asks twice; own-business rows can't be deleted.
- [ ] No client read of `role`; token and auth `user` objects carry no `role`.

### Should Have (P1)
- [ ] Business name in the header user chip.

## UI/UX Notes
- Sign-up form: new text field «שם העסק» (`business_name`) after the username, sign-up mode only, `maxlength="200"`,
  `autocomplete="organization"`, same field styling and error placement as the email field.
- Header user chip: business name in a smaller, muted line under the username (`.business-name`, logical CSS,
  truncates with ellipsis); hidden when `business_()` is null.
- User management row: name · email · business name · role chip (`business_role_owner` / `business_role_staff`) ·
  crown for platform admins.
- New dictionary keys (append to `public/assets/data/dictionary.json`, `general` group next to `username_taken`):
  - `business_name`: «שם העסק»
  - `business_name_required`: «נא להזין את שם העסק»
  - `business_name_too_long`: «שם העסק עד 200 תווים»
  - `no_business`: «החשבון לא משויך לעסק – פנה לתמיכה»
  - `user_removed`: «המשתמש הוסר מהעסק – פנה לבעל העסק»
  - `platform_admin`: «מנהל מערכת»
  - `business_role_owner`: «בעלים»
  - `business_role_staff`: «צוות»
  - `delete_business_confirm`: «מחיקת בעל העסק מוחקת את כל העסק – כל הנתונים וכל המשתמשים שלו. העסק:»
  - `delete_business_confirm_final`: «המחיקה סופית ואי אפשר לשחזר אותה. למחוק את העסק?»
  - `delete_staff_user_confirm`: «המשתמש יימחק. הפריטים שיצר יישארו בעסק. המשתמש:»
  - `business_deleted`: «העסק נמחק»
  - `user_deleted`: «המשתמש נמחק»
- The pipe has no interpolation: confirm texts are `translate(key) + ' "' + name + '"'` in the component.
- Icons: `crown`, `lock`, `users` are already registered; no new Lucide icon.

## Atomic Sub-tasks
- [x] C1: Teach the client user state about businesses and platform admins — user.model.ts: add `businessId?: string`, `businessRole?: 'owner' | 'staff'`, `isPlatformAdmin?: boolean`, remove `role`; user.service.ts: `isPlatformAdmin_ = computed(() => this._user_()?.isPlatformAdmin === true)`, `businessRole_`, `isOwner_`, `isAdmin_` kept as `/** @deprecated use isPlatformAdmin_ */` alias; `_tokenClaims` returns `businessId`, `businessRole`, `isPlatformAdmin` (no `role`) and `refreshToken`'s mismatch branch saves them; new user.service.spec.ts; existing spec fixtures typed `User` drop `role` (taxonomy-store.service.spec.ts uses `isPlatformAdmin: true` for its admin user and `isAdmin_: computed(() => user()?.isPlatformAdmin === true)`; header.component.spec.ts drops `role: 'user'`) so `ng test` still compiles — src/app/core/models/user.model.ts, src/app/core/services/user.service.ts, src/app/core/services/user.service.spec.ts, src/app/core/services/taxonomy-store.service.spec.ts, src/app/core/components/header/header.component.spec.ts
- [x] C2: Load the signed-in user's business once and keep it in one place — new business.service.ts (`providedIn: 'root'`, `inject()`): private `_business_` signal of `Business | null` (type from `@schemas/entities`, plan 424), exposed as public readonly `business_` (C-BUSINESS name); an `effect` on `UserService.user_()` `_id`: signed in → `GET ${environment.apiUrl}/api/v1/business` → set (404/error → null, logged with `LoggingService.warn`), signed out → null; spec with `HttpTestingController` — src/app/core/services/business.service.ts, src/app/core/services/business.service.spec.ts
- [x] C3: Ask for the business name at signup and require it on the server — auth-modal: `businessName` field (sign-up only), validation `business_name_required` / `business_name_too_long` in `onSubmit` before the request, `_reset` clears it, drop `role: 'user'` from the signup call; `UserService.signup(newUser, password, businessName)` → `callBackendSignup` posts `businessName`; signup `catchError` maps `BUSINESS_NAME_REQUIRED` / `BUSINESS_NAME_TOO_LONG`; server auth.js signup: `businessName` trimmed, 1–200 chars, else 400 with those codes, used as the business name — src/app/core/components/auth-modal/**, src/app/core/services/user.service.ts, server/routes/auth.js, server/test/auth-business.test.js
- [x] C4: Show a clear message when an account has no business or was removed — `UserService.login` `catchError`: 403 with `error` `NO_BUSINESS` / `USER_REMOVED` → `Error` with that code (checked before the 401 branch); auth-modal `_onError` maps them to `no_business` / `user_removed`; new auth-modal.component.spec.ts covers C3 + C4 — src/app/core/services/user.service.ts, src/app/core/components/auth-modal/**
- [x] C5: Show platform-admin screens only to the platform admin, and the business in the header — metadata-manager page.ts: `isAdmin` → `isPlatformAdmin_` (incl. the check at `onRenameMetadata` ~L584), `jumpSections` becomes a `computed` that drops `mm-sec-user` / `mm-sec-ai-models` for non-admins; page.html wraps `<app-user-management>` and `<app-ai-model-manager>` in `@if (isPlatformAdmin_())`; header: crown `@if (isPlatformAdmin_())`, business name line from `BusinessService.business_()`; header.component.scss `.business-name` (logical properties, per cssLayer skill); specs — src/app/pages/metadata-manager/metadata-manager.page.component.ts, src/app/pages/metadata-manager/metadata-manager.page.component.html, src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts, src/app/core/components/header/**
- [x] C6: Show business and role in the admin user list; ask twice before deleting a business — admin-user.model.ts: `businessId`, `businessName`, `businessRole`, `isPlatformAdmin` replace `role`; user-management: row shows business name, role chip, crown; `onDeleteUser`: owner → `delete_business_confirm` + name, then `delete_business_confirm_final`, both yes → `deleteUser`; staff → one `delete_staff_user_confirm`; success message `business_deleted` / `user_deleted` from the response's `deletedBusiness`; delete disabled when `row.businessId === user_().businessId`; hard-coded Hebrew in this component moves to `translatePipe` keys only where this task touches it; new user-management.component.spec.ts — src/app/core/models/admin-user.model.ts, src/app/pages/metadata-manager/components/user-management/**
- [x] C7: Remove the last reads of the old admin role, in the app and in the token — kitchen-state.service.ts `permanentlyDeleteRecipe`: `user.role !== 'admin'` → `!this.userService.isPlatformAdmin_()`; server auth.js `signAccess` drops `role`; signup / login / guest `user` objects drop `role` (guest gets `isPlatformAdmin: true`); run the `role` grep from Goals — src/app/core/services/kitchen-state.service.ts, server/routes/auth.js, server/test/**
- [x] C8: Add the new Hebrew texts — the 13 keys in UI/UX Notes, appended — public/assets/data/dictionary.json
- [ ] C9: Build, test, prepare the no-business account and hand Dandan the four checks — `npx ng build`, the `ng test` include list, `npm --prefix server test`, `node scripts/log-query.mjs --since=plan-start --level=error`; on the slot DB create user `nobiz-test` (sign up through the app, then `$unset` its `businessId` with a one-off `node -e` MongoDB-driver command (or `mongosh`) against the slot DB only — never Atlas); `node scripts/slot-serve.mjs`; Human: the four [human] checks — this plan file

## Technical Considerations
- Dependencies: plan 425's `GET /api/v1/business`, admin `GET /users` fields, delete response
  `{ deletedBusiness, usersDeleted }`; `ConfirmModalService.open`; `TranslationService.translate`.
- New files: `business.service.ts` + spec, `user.service.spec.ts`, `auth-modal.component.spec.ts`,
  `user-management.component.spec.ts`.
- Model changes: client `User`, `AdminUser`; access token and auth `user` objects lose `role`.
- Backend / API: signup requires `businessName`; no new route.
- Auth and validation: client hides; server decides (plan 425 `requirePlatformAdmin`). `businessName` validated
  on both sides (≤200, `NAME_MAX_LENGTH`).
- Security surface: no new secret or permission; hiding sections is cosmetic, the routes are already
  platform-admin-only on the server.
- Data / migration: none (the `role` field stays in user documents, unread).
- Signal flow: `UserService._user_` → `computed` `isPlatformAdmin_` / `businessRole_` → templates;
  `UserService.user_` → `BusinessService` effect → `business_` → header template.
- Project checks: log-query Done-when present; chef-side stories; 13 dictionary keys listed; RTL logical CSS in
  `header.component.scss`; no new Lucide icon; angularComponentStructure + cssLayer skills apply.

## Backend Impact
- Collections affected: users, businesses (signup creates the business with the typed name).
- New collections: no.
- Server changes needed: yes — `server/routes/auth.js` signup requires `businessName`; `role` removed from the
  token and the auth `user` objects.

## Out of Scope
- `/settings` page, Team tab, `PermissionService`, staff gating, price lock (plan 428); business settings (429).
- Renaming `isAdmin_` inside growth-frozen files (`product-form.component.ts`, `recipe-builder.page.ts`) and in
  untouched callers (`master-push.service.ts`, `taxonomy-store.service.ts`, `recipe-book-list.component.ts`,
  `ai-model-manager.component.ts`) — they use the alias.
- Editing the business name after signup; showing a message on the silent refresh path (the interceptor signs
  the user out; the message shows on the next sign-in).
- Removing the `role` field from user documents.

## Critical Questions
None — product defaults are locked in the brief's Part 4 (business name required at signup; owner ≠ platform admin).
