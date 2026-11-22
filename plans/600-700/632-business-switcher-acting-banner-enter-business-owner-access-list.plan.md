# Plan 632 — Business switcher, the acting banner, entering a business from the platform table and the owner's access list

Status: done
Depends-on: 631, 620
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
Plan 631 lets one user work in more than one business on the server, but nothing on the screen uses it: a consultant
has no way to switch into a client's kitchen, nobody can tell in which business they are working, the platform admin
cannot enter a business or give a consultant access, and an owner cannot see or remove who has access to his business
(spec MP-10, decisions D11–D13). The risk this plan must close is the worst one of the feature: showing or saving one
business's data while the session is in another.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `src/app/core/services/user.service.ts` (417 lines): `user_` signal (line 37), `isOwner_` = `businessRole === 'owner'`
  (line 40). After sign-in the state is loaded by the private `_reloadDataServices()` (lines 52–110): it reloads 13
  named services, most of them only when they were already loaded, and it does not touch any other service.
  `refreshToken()` (line 243) saves the user the server answers; `_tokenClaims(token)` (line 276) reads
  `userId, name, businessId, businessRole, isPlatformAdmin` from the token. `REFRESH_INTERVAL_MS` is 13 minutes
  (line 17). On a page load the constructor restores the session with one refresh (lines 133–149).
- `src/app/core/services/business.service.ts` (136 lines) loads `GET /api/v1/business` once per **user id**
  (`_userId_`, line 58; effect, lines 60–65): the same user in another business would keep the old business document.
  So `_reloadDataServices()` alone is not a full reload for a switch.
- `src/app/core/interceptors/auth.interceptor.ts`: on any 401 outside login and refresh it refreshes the token and
  **replays the original request** with the new token (lines 73–101).
- `src/app/core/services/permission.service.ts` (75 lines): `can()` lets `owner` do everything and refuses any role
  that is not `staff` (lines 53–54); `isOwner_` (line 46) mirrors `UserService.isOwner_`.
- Screens that read `permission.isOwner_` for owner-level work: client list, client profile, knowledge page, new
  request dialog, client picker, data export card, front desk week card. Screens that read it for the team or the
  business settings: `src/app/pages/settings/settings.page.ts:51` (tabs),
  `src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.ts:101,107,126` and
  `src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.ts:45,52` (both
  call `GET /api/v1/business/setup-status`, which 631 refuses to a consultant),
  `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts:98` (the opening-details
  banner). The header reads `userService.isOwner_` for the settings link (`header.component.ts:46,54`,
  `header.component.html:140`).
- `src/app/core/components/header/header.component.html` shows the business name as a plain
  `<span class="business-name">` under the username (lines 25–27); the phone profile menu is at lines 136–158.
- `src/app/appRoot/app.component.html` renders `<app-header />` and `<app-tab-chips />` for every non-bare route
  (lines 1–4).
- The platform screen is `src/app/pages/platform-dashboard/platform-dashboard.page.ts` (318 lines) with
  `platform-dashboard.page.html` (248 lines); each business row ends with `<app-row-actions-menu>` holding the report
  link and the front desk pencil (html lines 153–174). The dialog family to follow is
  `src/app/pages/platform-dashboard/components/front-desk-admin-dialog/` (`app-modal-shell`, `app-form-field`, a
  `ModalController` service). No screen creates an access grant today.
- `src/app/pages/settings/settings-tabs.ts` (17 lines): `SETTINGS_TABS` has `team`, `business`, `baseline`, all
  `ownerOnly: true`; `settings.page.html` has one `@case` per tab. The sibling to follow is
  `src/app/pages/settings/components/team-tab/` with `src/app/pages/settings/services/team.service.ts`.
- `src/app/core/models/user.model.ts`: `businessRole?: 'owner' | 'staff'`.
- `src/app/core/services/http-storage.adapter.ts` `API` map (lines 9–23) has no `access` entry.
- Lucide icons already registered in `src/app/app.config.ts`: `arrow-left-right`, `undo-2`, `eye`, `user-plus`,
  `user-check`, `trash-2`. None of the dictionary keys listed under UI/UX Notes exists in
  `public/assets/data/dictionary.json`.
- From plan 631 (merged before this plan): `POST /api/v1/auth/switch-business`, `GET /api/v1/access/businesses`,
  `POST /api/v1/access/grants`, `DELETE /api/v1/access/grants/:id`, `GET /api/v1/access/grants`; the user object of
  login, refresh and switch carries `businessId` (active), `businessRole` (`owner` | `staff` | `consultant`),
  `homeBusinessId`, and while acting `acting` and `homeModules`; a request of a session whose grant was removed
  answers 401 `{ error: 'ACCESS_ENDED' }`.

## Goals & Success Criteria
**Primary:** a user with access to another business switches into it from the header, always sees in which business
he is acting and returns with one tap; the platform admin enters any business and gives a consultant access from the
platform table; the owner sees who has access and removes it. After a switch nothing of the previous business is left
on the screen.

- [auto] `pnpm run test:ci` → exit 0, including `src/app/core/services/user.service.spec.ts` (switch stores the new token and user, then calls the reload function once with `/dashboard`; a refresh that answers another business for the same user reloads; `homeBusinessId_`, `acting_`, `homeModules_`), `src/app/core/services/permission.service.spec.ts` (consultant: every action except `manageTeam` and `editSettings`), `src/app/core/interceptors/auth.interceptor.spec.ts` (a 401 `ACCESS_ENDED` is never replayed; a refresh that returns a token of another business does not replay the request), `src/app/core/services/access.service.spec.ts`, `src/app/core/components/header/header.component.spec.ts` (switcher only when there is something to switch to), `src/app/core/components/acting-banner/acting-banner.component.spec.ts`, `src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts` (enter and grant buttons), `src/app/pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog.component.spec.ts`, `src/app/pages/settings/components/access-tab/access-tab.component.spec.ts`, `src/app/pages/settings/settings.page.spec.ts` (a consultant sees no tab), and the three dashboard specs in scope.
- [auto] `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0; `pnpm run lint:reuse` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/breadcrumbs-check.mjs` → `BREADCRUMBS: clean`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/settings`, the QA owner taps the tab "גישת יועצים" and sees "לאף יועץ אין כרגע גישה לעסק" (`e2e/ui/632-1.spec.ts`).
- [ui] On `/dashboard`, the QA owner (nothing to switch to) sees the business name in the header and no element `[data-testid="acting-banner"]` and no `[data-testid="business-switcher"]` (`e2e/ui/632-2.spec.ts`).
- [human] Dandan, as the platform admin, taps "כניסה לעסק" on a test business in the platform table: the app reloads, the banner names that business, the lists show that business's products; "חזרה לעסק שלי" brings his own business back.
- [human] Dandan gives a test user access from the platform table, signs in as that user, switches into the business from the header, then as the owner removes the access in Settings: the consultant's next tap lands him in his own business with the notice.
- [human] The banner reads clearly on a phone and does not cover the page's own controls.

## Execution Mode
- Parallel: no — the map's must-not-run list: 620, 623, 624, 628, 629, 630, 632, 634, 636, 637 all append to `public/assets/data/dictionary.json` (one screen run at a time); 620, 630 and 632 all edit `src/app/pages/platform-dashboard/**` (never in two live runs); 629 edits `src/app/pages/dashboard/components/**` and `src/app/pages/settings/components/business-settings-tab/**`. Run `mod-access-ui` holds 632 alone.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
src/app/core/services/access.service.ts
src/app/core/services/access.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/breadcrumbs.md
src/app/core/models/user.model.ts
src/app/core/utils/app-reload.util.ts
src/app/core/utils/app-reload.util.spec.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/interceptors/auth.interceptor.spec.ts
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.scss
src/app/core/components/header/header.component.spec.ts
src/app/core/components/acting-banner/acting-banner.component.ts
src/app/core/components/acting-banner/acting-banner.component.html
src/app/core/components/acting-banner/acting-banner.component.scss
src/app/core/components/acting-banner/acting-banner.component.spec.ts
src/app/core/components/breadcrumbs.md
src/app/appRoot/app.component.ts
src/app/appRoot/app.component.html
src/app/appRoot/app.component.spec.ts
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog.component.ts
src/app/pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog.component.html
src/app/pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog.component.spec.ts
src/app/pages/platform-dashboard/components/grant-access-dialog/grant-access-dialog.service.ts
src/app/pages/settings/settings-tabs.ts
src/app/pages/settings/settings.page.ts
src/app/pages/settings/settings.page.html
src/app/pages/settings/settings.page.spec.ts
src/app/pages/settings/components/access-tab/access-tab.component.ts
src/app/pages/settings/components/access-tab/access-tab.component.html
src/app/pages/settings/components/access-tab/access-tab.component.scss
src/app/pages/settings/components/access-tab/access-tab.component.spec.ts
src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.ts
src/app/pages/dashboard/components/setup-checklist-card/setup-checklist-card.component.spec.ts
src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.ts
src/app/pages/dashboard/components/front-desk-checklist-card/front-desk-checklist-card.component.spec.ts
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
e2e/ui/632-1.spec.ts
e2e/ui/632-2.spec.ts
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

- INV-1: preserves — `PermissionService.can` only mirrors the rule ADR 0032 added (a consultant: everything except the team and the business settings); the server still refuses every write it does not allow. The browser never chooses the business: it asks `POST /api/v1/auth/switch-business` and uses the token the server signs. After a switch, or when a refresh answers another business, the whole application reloads, and the interceptor never replays a request into a different business.

## Reuse Check

- `AccessService` (`src/app/core/services/access.service.ts`) — family: http — rung: 2 — why: a small client of the `API` map and `HttpClient`, the same shape as `TeamService`; it holds the enterable businesses and the grants list.
- `APP_RELOAD` token (`src/app/core/utils/app-reload.util.ts`) — family: helpers — rung: 3 — why: one core helper that reloads the application at a path, injectable so specs replace it; no page-local `window.location` call.
- Header business switcher (`.business-switcher`, a width cap on the select host) — family: search-combobox — rung: 2 — why: `app-custom-select` with `variant="chip"` and `[translateLabels]="false"`; a short fixed list, no new dropdown.
- Phone profile-menu switch rows — family: chip — rung: 1 — why: plain buttons with the existing `profile-menu__item` class of the header; no new control.
- `acting-banner` (`app-acting-banner`, `src/app/core/components/acting-banner/`, classes `.acting-banner`, `.acting-banner__text`, `.acting-banner__back`) — family: acting-banner — rung: 4 — why: a persistent notice with an action button, shown by the app shell on every screen; `app-front-desk-status-banner` is tied to the front desk profile and has no action, and `UserMsgService` toasts disappear. It is a shell component of `core/components`, recorded in that folder's breadcrumbs.
- "Enter business" and "give access" row buttons — family: list-page — rung: 1 — why: two more `c-icon-btn` buttons inside the row's existing `app-row-actions-menu`.
- `grant-access-dialog` (`app-grant-access-dialog` with `GrantAccessDialogService`) — family: modal-shell — rung: 2 — why: `app-modal-shell` + `app-form-field` + a `ModalController` service, the shape of `front-desk-admin-dialog`.
- `GrantAccessDialogService` — family: modal-controller — rung: 1 — why: `new ModalController<boolean>(false)` as is.
- `access-tab` (`app-access-tab` in settings; classes `.access-tab`, `.access-hint`, `.access-list`, `.access-row`, `.access-row__name`, `.access-row__since`) — family: empty-state — rung: 1 — why: rows in the team tab's layout, `app-empty-state` for no grants, `app-loader` while loading.
- Remove-access question — family: modal-controller — rung: 1 — why: `ConfirmModalService.open` exactly as the team tab's remove.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a consultant, I want to pick a client's business in the header so that I work in his kitchen without signing out.
- As a consultant, I want a banner that always names the business I am in so that I never change the wrong kitchen's prices.
- As a business owner, I want to see who has access to my business and remove it with one tap so that I stay in control.
- As the platform admin, I want to enter a business from the platform table and give a consultant access there so that I can help without asking for a password.
- As a chef, I want nothing of another kitchen left on my screen after a switch so that what I see is always what I save.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-ACCESS (631; used by 632, 633)**
  - `businessAccess` (server-only): `{ _id, userId, businessId, role: 'consultant', grantedBy, grantedByName,
    grantedAt, revokedAt?, revokedBy? }`; unique index `{ userId, businessId, revokedAt }` (a partial index cannot
    say "no `revokedAt`"; two live grants of one user in one business collide, removed ones differ by their time).
    `users` gain `activeBusinessId?`.
  - Token payload: `{ userId, name, businessId, businessRole, isPlatformAdmin, homeBusinessId, acting? }` —
    `businessId` is the **active** business, so every existing reader keeps working; `businessRole` is `owner`,
    `staff` or `consultant`; `acting` is `'consultant'` or `'platform'` and absent at home.
  - `server/services/access.js` → `resolveSession(user) → { businessId, businessRole, acting? }`: no active
    business or active = home → home; a live grant → `consultant`; a platform admin → `owner` with
    `acting: 'platform'`; anything else → home, and `activeBusinessId` is cleared. `signAccess` uses it; `/refresh`
    re-resolves.
  - `POST /api/v1/auth/switch-business` body `{ businessId: string | null }` → `{ token, user }`, or 403
    `NO_ACCESS`. `GET /api/v1/access/businesses` → `[{ businessId, name, role }]` for the signed-in user.
  - While `acting` is set, `verifyToken` re-resolves on every request (one indexed read); a session whose grant was
    removed gets 401 `{ error: 'ACCESS_ENDED' }` on its very next request (so the browser can tell it from an expired
    token) and the refresh lands at home.
  - While acting, the user object the server answers on login, refresh and switch also carries `homeModules` (the
    resolved modules of the home business): `GET /api/v1/business` answers the client's business then, and the browser
    needs the home modules for the diagnosis entry (C-MODULES). The token payload does not change.
  - `trashOwnerFilter` in `server/routes/generic.js` tests the role name `owner` directly; 631 changes that one test
    so a consultant's "restore all" and "empty Trash" answer like the owner's.
  - `permissions.js`: `consultant` may do everything the owner may, except `manageTeam` and `editSettings`
    (`CONSULTANT_DENIED`). Map every `server/routes/business.js` route to one of the two sides in the plan. The
    platform write (modules, cap, private, front desk status) stays platform admin only.
  - Grants: `POST /api/v1/access/grants` body `{ businessId, username }` — platform admin only; the user must
    exist, not be removed, and not already belong to that business; `DELETE /api/v1/access/grants/:id` — platform
    admin, or the owner of that business; `GET /api/v1/access/grants` — the owner's list for his business
    (`name`, `grantedAt`). Every grant and removal is logged with ids only.
  - Stamps keep the real person: `createdBy` and `actorOf(req)` are unchanged. `aiUsage` rows keep the active
    `businessId`. `recordUsage` (`server/middleware/usage.js`) skips a request whose token has `acting`.
  - `verifyAccessToken` (used by `server/middleware/write-limit.js` and `server/routes/log.js`) does not re-check a
    grant: the write limit is keyed by the real `userId`, and a log line sent by an acting session carries the real
    `userId`. Neither reads or writes business data, so a removed grant loses nothing there.
  - INV-1 rule gains one sentence (a user reads and writes a business only as its member, as a consultant with a
    live grant, or as the platform admin acting in it; the business is always taken from the token the server
    signed). ADR `docs/brain/decisions/0032-one-user-more-than-one-business.md` (amends ADR 0023's "one business
    per user"). `Touches` gains `server/services/access.js`, `server/routes/access.js`.
  - Browser: `UserService` exposes `homeBusinessId` and `acting`; `PermissionService.can` mirrors the consultant
    rule; a switch reloads the application state from the server.
- [ ] **User model and `UserService`.** `User` gains `businessRole?: 'owner' | 'staff' | 'consultant'`, `homeBusinessId?: string`, `acting?: 'consultant' | 'platform'`, `homeModules?: string[]`. `UserService` exposes `homeBusinessId_` (the user's `homeBusinessId ?? businessId ?? null`), `acting_` (`'consultant' | 'platform' | null`) and `homeModules_` (`string[]`, empty at home), all `computed` from `user_`. `isOwner_` stays "owner of the active business" (`businessRole === 'owner'`; true for the platform admin acting). `_tokenClaims` also reads `homeBusinessId` and `acting`, and the user it builds from claims carries them. New public `tokenBusinessId(token: string): string | null`.
- [ ] **Switch = a full reload.** `UserService.switchBusiness(businessId: string | null): Promise<boolean>`: (1) `router.navigate(['/dashboard'])` first, exactly as `HeaderComponent.logout` does, so an open form's unsaved-changes question runs; a result of `false` stops the switch and returns `false`; (2) `POST` `API.auth('switch-business')` with `{ businessId }` and `withCredentials: true`; (3) on success `storeToken(token)`, `_saveUserLocal(user)`, then the injected `APP_RELOAD('/dashboard')` — a document reload, after which the application starts exactly as it does on any page load with a session (constructor refresh → token → every service loads for the active business); returns `true`; (4) on an error: no state change, returns `false` (the caller shows `switch_failed`). `_reloadDataServices()` is **not** used for a switch: it reloads 13 services and leaves the rest (the business document is keyed by user id), and a leftover signal of the previous business is the failure this plan exists to prevent.
- [ ] **A refresh that moves the session reloads too.** In `refreshToken()`: when the answered user has the same `_id` as the current one and a different `businessId`, save the user and the token, set the session flag `fv_access_ended` when the previous user was `acting` and the new one is not, and call `APP_RELOAD('/dashboard')`. `UserService.consumeAccessEndedNotice(): boolean` reads and clears the flag (sessionStorage, try/catch like `_loadUserFromSession`).
- [ ] **The interceptor never carries a request into another business** (`auth.interceptor.ts`): (a) a 401 whose body is `{ error: 'ACCESS_ENDED' }` is not replayed: it calls `userService.refreshToken()` once (a module flag stops parallel 401s from starting a second one) and rethrows the error; the refresh above then reloads the application at home; (b) in the existing refresh-and-replay path, the business of the token before the refresh (`tokenBusinessId`) is compared with the business of the new token: when they differ the request is **not** replayed, the original error is rethrown and `userService.refreshToken()`'s reload path runs. A request is replayed only into the business it was made for.
- [ ] **`PermissionService`:** `CONSULTANT_DENIED: readonly PermissionAction[] = ['manageTeam', 'editSettings']`; in `can()` after the owner line: `if (user.businessRole === 'consultant') return !CONSULTANT_DENIED.includes(action)`. `isOwner_` becomes "has the owner's rights in the active business" (`owner` or `consultant`), with its comment saying so, so the client, knowledge, request and export screens open for a consultant as the server allows. `isStaff_` is unchanged.
- [ ] **The four places that are about the team or the business settings ask `can`, not `isOwner_`:** `settings.page.ts` (each `SettingsTabDef` gains `action: PermissionAction` — `team` and `access` → `manageTeam`, `business` and `baseline` → `editSettings` — and `visibleTabs_` keeps a tab when `!tab.ownerOnly || permission.can(tab.action)`; a consultant sees the existing "ההגדרות זמינות לבעל העסק בלבד" empty state), `setup-checklist-card.component.ts` (3 reads), `front-desk-checklist-card.component.ts` (2 reads), `dashboard-overview.component.ts` (`needsOpeningDetails_`) — each becomes `permission.can('editSettings')`. Their specs' `PermissionService` stubs gain `can`.
- [ ] **`AccessService`** (new, root-provided): `API.access(path)` is added to the `API` map (`/api/v1/access/<path>`). `businesses_` signal of `{ businessId, name, role }[]`; `loadBusinesses()` (`GET businesses`; on an error logs a warning and leaves the list empty); `canSwitch_` = `businesses_().length > 1 || userService.acting_() !== null`; `grants_` signal of `{ _id, name, grantedAt }[]`; `loadGrants()`; `removeGrant(id)` (removes the row, toast `access_removed`; error → toast `server_error`, a 403 already has the interceptor's toast); `createGrant(businessId, username)` → `{ ok: true } | { ok: false, errorKey }` with `USER_NOT_FOUND` → `access_err_user_not_found`, `ALREADY_MEMBER` → `access_err_already_member`, `ALREADY_GRANTED` → `access_err_already_granted`, anything else → `server_error`.
- [ ] **Header switcher** (`header.component.*`): the header loads `access.loadBusinesses()` once per signed-in user id (an `effect` on the id). When `access.canSwitch_()` is false the header is exactly as today (the plain business name). When true, the business name is replaced by `app-custom-select` (`variant="chip"`, `[translateLabels]="false"`, `triggerId="business-switcher"`, `data-testid="business-switcher"`, `aria-label` `switch_business`), value = the active `businessId`, options = the list (the home row's label ends with " · העסק שלי" from `my_business`; when the active business is not in the list — the platform admin inside a business — it is added from `business_().name`). Choosing another value calls `switchBusiness(value)` (the home id is sent as `null`); `false` from a server error shows `switch_failed` and the select shows the active business again. In the phone profile menu, under the name: one `profile-menu__item` button per business other than the active one (icon `arrow-left-right`, text = the business name). On construction the header calls `consumeAccessEndedNotice()` and, when true, shows the toast `access_ended`.
- [ ] **Acting banner** (`app-acting-banner`, new; rendered in `app.component.html` right after `<app-header />`, so on every non-bare screen): shown only while `userService.acting_()` is set. Text `acting_banner_consultant` or `acting_banner_platform` with `{name}` replaced by the active business's name (`BusinessService.business_().name`, empty until loaded). One button "חזרה לעסק שלי" (`acting_back_home`, icon `undo-2`, `data-testid="acting-back-home"`) → `switchBusiness(null)`; while it runs the button is disabled; `false` → toast `switch_failed`. `role="status"`, `data-testid="acting-banner"`; hidden in print (`@media print`). It is a bar in the page flow between the header and the tab chips, not fixed, with the warning colours the front desk banner uses (`--bg-warning`, `--border-warning`, `--text-warning`); logical properties only; on a phone the text wraps and the button stays on its own line.
- [ ] **Platform table** (`platform-dashboard.page.*`): two buttons added to each row's `app-row-actions-menu`: "כניסה לעסק" (`platform_enter_business`, icon `eye`, `data-testid="enter-business"`) → `switchBusiness(row._id)`, hidden on the row of the admin's own home business; `false` → toast `switch_failed`. "מתן גישה ליועץ" (`platform_grant_access`, icon `user-plus`, `data-testid="grant-access"`) → opens the grant dialog for `{ businessId: row._id, name: row.name }`.
- [ ] **Grant dialog** (`app-grant-access-dialog`, new, rendered by the platform page inside `@if (grantDialog.isOpen_())`): `app-modal-shell` with `titleKey="platform_grant_access"`; the business name as plain text; one `app-form-field` text input "שם המשתמש של היועץ" (`platform_grant_username`), focused on open; buttons `cancel` and `platform_grant_access` (disabled while the trimmed name is empty or a save runs). Save → `access.createGrant(businessId, name.trim())`: success → toast `platform_grant_done`, the dialog closes; failure → the message of `errorKey` under the field, the dialog stays open with the typed name. Cancel, X, Escape and the backdrop close it and send nothing. This is the control C-ACCESS's `POST /api/v1/access/grants` body `{ businessId, username }` is called from. The platform admin sees and removes a business's grants by entering the business and opening Settings → "גישת יועצים" (he has the owner's rights there).
- [ ] **Owner's access list** (settings tab `access`): `SETTINGS_TABS` gains `{ key: 'access', labelKey: 'settings_tab_access', icon: 'user-check', ownerOnly: true, action: 'manageTeam' }` after `team`; `SettingsTab` gains `'access'`; `settings.page.html` gains `@case ('access') { <app-access-tab /> }`. `app-access-tab` (new): on open `access.loadGrants()` with `app-loader` while it runs; one line of help text (`access_list_hint`); a row per grant — the name, "גישה מאז" (`access_granted_on`) with the date `dd/MM/yyyy`, and a remove button (icon `trash-2`, `aria-label` `access_remove`, `data-testid="access-remove"`); no grants → `app-empty-state` with `access_list_empty` and icon `user-check`. Remove asks through `ConfirmModalService.open` with `access_remove_confirm` (`{name}` replaced), `{ variant: 'danger', title: 'remove' }` — the team tab's pattern; yes → `access.removeGrant(id)`. The tab has no add control (only the platform admin grants) and nothing to save, so it holds no unsaved state.
- [ ] **Specs** for every item above (the list in the first Done-when), and the two `[ui]` specs signing in with `signInQa`.
- [ ] `src/app/core/services/breadcrumbs.md` gains a row for `access.service.ts`; `src/app/core/components/breadcrumbs.md` a row for `acting-banner/`; `src/app/pages/breadcrumbs.md` — the `settings/` and `platform-dashboard/` rows each gain a few words (the access tab; enter business and the grant dialog).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; no new `.c-*` class; no new Lucide icon (`arrow-left-right`, `undo-2`, `eye`, `user-plus`, `user-check`, `trash-2` are registered in `src/app/app.config.ts`; `pnpm run lint:icons` confirms). `src/app/app.routes.ts` and `src/app/app.config.ts` are not written by this plan.
- What happens on each state:
  - Switch: the open page is left through `/dashboard` first (its own unsaved-changes question may stop the switch); the app shows its loader while it reloads; there is no extra question.
  - Leave / cancel: the grant dialog closes with nothing sent; the access tab has nothing to leave.
  - Error: a failed switch keeps the user where he was with the toast "המעבר לעסק נכשל. נסו שוב"; a failed grant shows its reason under the field; a failed remove shows the server-error toast.
  - Empty: no grants → the empty state; a user with nothing to switch to sees today's header.
  - Access removed while working: the next request is refused, the app reloads into the user's own business and shows "הגישה שלכם לעסק הוסרה. חזרתם לעסק שלכם".
- New keys in `public/assets/data/dictionary.json` (append only; none exists today):

  | Key | Hebrew | Meaning |
  |---|---|---|
  | `my_business` | העסק שלי | "my business" — marks the home row in the switcher |
  | `switch_business` | החלפת עסק | accessible name of the switcher |
  | `switch_failed` | המעבר לעסק נכשל. נסו שוב | switching failed, try again |
  | `acting_banner_consultant` | אתם עובדים עכשיו בעסק {name} כיועצים | you are working in business {name} as a consultant |
  | `acting_banner_platform` | אתם נמצאים בתוך העסק {name} כמנהלי המערכת | you are inside business {name} as the platform admin |
  | `acting_back_home` | חזרה לעסק שלי | back to my business |
  | `access_ended` | הגישה שלכם לעסק הוסרה. חזרתם לעסק שלכם | your access to the business was removed; you are back in your own |
  | `business_role_consultant` | יועץ | role label "consultant" (the `business_role_` + role pattern) |
  | `settings_tab_access` | גישת יועצים | settings tab "consultant access" |
  | `access_list_hint` | גישה ליועץ ניתנת על ידי FoodVibe. כאן רואים למי יש גישה לעסק, ואפשר להסיר אותה בכל רגע. | access is given by FoodVibe; here you see who has it and can remove it at any time |
  | `access_list_empty` | לאף יועץ אין כרגע גישה לעסק | no consultant has access to the business now |
  | `access_granted_on` | גישה מאז | access since |
  | `access_remove` | הסרת גישה | remove access |
  | `access_remove_confirm` | להסיר את הגישה של {name}? הגישה תיפסק מיד | remove {name}'s access? it stops at once |
  | `access_removed` | הגישה הוסרה | access removed |
  | `platform_enter_business` | כניסה לעסק | enter the business |
  | `platform_grant_access` | מתן גישה ליועץ | give a consultant access (button, dialog title) |
  | `platform_grant_username` | שם המשתמש של היועץ | the consultant's username |
  | `platform_grant_done` | הגישה ניתנה | access given |
  | `access_err_user_not_found` | לא נמצא משתמש פעיל בשם הזה | no active user with this name |
  | `access_err_already_member` | המשתמש כבר שייך לעסק הזה | the user already belongs to this business |
  | `access_err_already_granted` | למשתמש כבר יש גישה לעסק הזה | the user already has access to this business |

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let the browser know the home business, the acting state and the consultant role — user model fields, the three computed signals, token claims, the consultant branch and the owner-rights signal in the permission mirror; specs — src/app/core/models/user.model.ts, src/app/core/services/user.service.ts, src/app/core/services/permission.service.ts, src/app/core/services/user.service.spec.ts, src/app/core/services/permission.service.spec.ts
- [x] A2: Make a switch reload the whole application so nothing of the other business stays on screen — the reload token, switchBusiness (leave the page, call the route, store, reload), the reload when a refresh answers another business, the access-ended flag; specs — src/app/core/utils/app-reload.util.ts, src/app/core/utils/app-reload.util.spec.ts, src/app/core/services/user.service.ts, src/app/core/services/user.service.spec.ts
- [x] A3: Never replay a request into a different business after a refresh — the ACCESS_ENDED branch and the business comparison before a replay; specs for both — src/app/core/interceptors/auth.interceptor.ts, src/app/core/interceptors/auth.interceptor.spec.ts
- [x] A4: Add the service that lists enterable businesses and manages grants — the access entry in the API map, the two signals, load, remove and create with their error keys; spec; breadcrumbs row — src/app/core/services/access.service.ts, src/app/core/services/access.service.spec.ts, src/app/core/services/http-storage.adapter.ts, src/app/core/services/breadcrumbs.md
- [x] A5: Show the switcher in the header only to a user who has somewhere to switch to — the select in the user chip, the phone profile-menu rows, the access-ended toast; the existing header specs stay green and new ones cover both states — src/app/core/components/header/header.component.ts, src/app/core/components/header/header.component.html, src/app/core/components/header/header.component.scss, src/app/core/components/header/header.component.spec.ts
- [x] A6: Show on every screen in which business the user is acting, with one tap back home — the banner component, its place in the app shell, print hidden; specs; breadcrumbs row — src/app/core/components/acting-banner/, src/app/appRoot/app.component.html, src/app/appRoot/app.component.ts, src/app/appRoot/app.component.spec.ts, src/app/core/components/breadcrumbs.md
- [x] A7: Let the platform admin enter a business and give a consultant access from the table — the two row buttons, the grant dialog and its service, error texts under the field; specs — src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, src/app/pages/platform-dashboard/components/grant-access-dialog/
- [x] A8: Give the owner a settings tab that lists who has access and removes it — the tab entry with its permission, the tab component with loader, rows, empty state and the remove question; tabs filtered by permission; specs — src/app/pages/settings/settings-tabs.ts, src/app/pages/settings/settings.page.ts, src/app/pages/settings/settings.page.html, src/app/pages/settings/settings.page.spec.ts, src/app/pages/settings/components/access-tab/
- [x] A9: Keep the owner-only setup cards away from a consultant, who cannot open what they point to — the three dashboard components ask for the settings permission; their spec stubs gain it — src/app/pages/dashboard/components/setup-checklist-card/, src/app/pages/dashboard/components/front-desk-checklist-card/, src/app/pages/dashboard/components/dashboard-overview/
- [x] A10: Add the words, the two screen checks and run everything — the 22 dictionary keys, the pages map rows, both ui specs, then every Done-when command and the human cards — public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md, e2e/ui/632-1.spec.ts, e2e/ui/632-2.spec.ts

## Technical Considerations
- Dependencies: `UserService`, `PermissionService`, `BusinessService` (read only), `authInterceptor`, `HeaderComponent`, the app shell, the platform page, the settings page, three dashboard components; `ModuleService` (plan 620) is not changed — after a reload it reads the active business's modules, which is decision D11.
- New files needed: `src/app/core/services/access.service.ts` (+ spec), `src/app/core/utils/app-reload.util.ts` (+ spec), `src/app/core/components/acting-banner/` (4 files), `src/app/pages/platform-dashboard/components/grant-access-dialog/` (4 files), `src/app/pages/settings/components/access-tab/` (4 files), `e2e/ui/632-1.spec.ts`, `e2e/ui/632-2.spec.ts`.
- Model changes: `User` (`businessRole` union, `homeBusinessId`, `acting`, `homeModules`); `SettingsTabDef.action`, `SettingsTab` gains `'access'`.
- Backend / API: none new; the browser starts calling the five routes of plan 631.
- Auth and validation: the browser only hides; the server decides every switch, grant and removal. The grant dialog sends a trimmed username; the server checks it.
- Security surface: the access token of the active business replaces the stored one on a switch (`sessionStorage`, as today); no token or username is logged; a request is never replayed into another business; a full reload drops every in-memory signal of the previous business. `scripts/pre-commit-secret-scan.mjs` and the CI security workflow are the gates.
- Data / migration: none.
- Project checks: `[auto] log-query` present; every new dictionary key named with its Hebrew value; icons named and already registered; Hebrew RTL and logical CSS; Reuse Check lists every control; `[ui]` specs under `e2e/ui/` with `signInQa`; hotspots append-only (`dictionary.json`).

## Out of Scope
- The diagnosis entry in the banner and the inventory chips (plan 634).
- A list of every grant across businesses for the platform admin, grant expiry, an owner inviting a consultant himself.
- Reloading the state without a document reload (keying every data service by business).
- Changing which screens `ModuleService` hides.
- A separate look for the header while acting (colour, avatar); the banner is the signal.

## Critical Questions
- none

## Execution Notes
- decided: a switch reloads the document instead of calling `_reloadDataServices()` — why: that method is how state loads after sign-in, but it covers 13 services and skips the rest (the business document is keyed by user id, `business.service.ts:58`); after a reload the app boots through the same constructor refresh as any page load with a session, and no signal of the previous business can survive.
- decided: the interceptor compares the business before and after a refresh and does not replay when they differ — why: a token can expire in the same minute a grant is removed; the plain 401 path would replay a create meant for the client's business into the user's own.
- decided: `PermissionService.isOwner_` means "owner's rights in the active business" (owner or consultant); `UserService.isOwner_` stays the strict owner for the header's settings link — why: decision D12 gives the consultant what the owner does; seven screens read `permission.isOwner_` for exactly that, and only four reads are about the team or the settings, which move to `can('editSettings')` / `can('manageTeam')`.
- decided: the setup card, the front desk checklist card and the opening-details banner are hidden from a consultant — why: all three lead to the business settings or call `GET /business/setup-status`, which the server refuses him.
- decided: the banner sits in the page flow under the header on every non-bare screen and is hidden in print — why: "on every screen" without covering a page's own controls on a phone; the card left the place open.
- decided: the grant control is a row button and a one-field dialog on the platform table — why: no grant screen exists; the row already holds the per-business actions and the dialog family exists there.
- decided: the platform admin manages a business's existing grants by entering it and using the owner's tab — why: C-ACCESS has no cross-business grants list, and he has the owner's rights inside.
- decided: removing access asks one question — why: it is the existing pattern of the sibling team tab for the same kind of act, and the removal takes effect at once.
- decided: no new Lucide icon and no route — why: the six icons are registered and the access list is a tab of an existing route; this plan writes neither `app.config.ts` nor `app.routes.ts`.
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run lint:icons` → exit 0; `pnpm run lint:reuse` → REUSE: ok; `pnpm run test:ci` → exit 0 (all specs, incl. the new ones); `node scripts/breadcrumbs-check.mjs` → BREADCRUMBS: clean; kit-checks → ok (6 checks); kit-manifest-check → ok.
- scope extended: plans/632 plan file `## Reuse Check` rows now name the file stems and classes (the reuse check matches whole words, `app-grant-access-dialog` did not match `grant-access-dialog`); `docs/brain/inventory.md` regenerated with `node scripts/inventory.mjs`; `docs/brain/component-families.md` gained the `APP_RELOAD` line under helpers and the `acting-banner` family (rung 3 and 4 rows need them).
- decided: `PermissionService.isOwner_` reads `user_().businessRole` (owner or consultant) instead of `UserService.businessRole_` — why: many specs stub `UserService` with `user_` only.
- decided: the two `[ui]` specs (`e2e/ui/632-1.spec.ts`, `632-2.spec.ts`) are written, not run — no running app in the worktree.
- seen: `src/testing/test-lucide-icons.ts` lacks `UserCheck`, `UserPlus`, `ArrowLeftRight`, `Undo2`; the new specs add them to their own `pick(...)` (that file is out of scope).
