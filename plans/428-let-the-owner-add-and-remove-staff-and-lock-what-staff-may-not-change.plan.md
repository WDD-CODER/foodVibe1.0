# Plan 428 — Let the owner add and remove staff, and lock what staff may not change

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 01.2 (Team and permissions). After plans 424–427 every business has an owner, data is scoped by
`businessId`, and the server decides every write through one checker (`server/utils/permissions.js`). But the
owner has no way to bring a cook into the business, and the screens still offer staff buttons the server will
refuse (product prices, edit/delete on the owner's recipes). This plan adds:

1. A new lazy `/settings` page with tabs (`?tab=team|business|baseline`) — this plan creates the page and the
   **Team** tab; plan 429 adds the Business tab, plan 431 the Baseline tab.
2. Team management on the server (`GET/POST/DELETE /api/v1/business/team…`, owner only): add staff by username +
   initial password (no email, no invite, no forced change), remove staff (login blocked, their items stay).
3. The client mirror of the permission checker (`PermissionService.can(action, ctx)`) and the UI locks that use it:
   product prices locked for staff (through a **new child component**, because `product-form.component.ts` is
   growth-frozen), no delete on items staff did not create, no save on someone else's recipe, a Hebrew toast on
   any 403 `no_permission`.

The team list's "last login" column shows "—" in this plan. Plan 430 (usage record) fills it from `usageDays`
when it merges — 430 owns that wiring, not this plan.

User stories:
- As a chef who owns the business, I want to add a cook with a username and a first password so that he can log
  in to my kitchen's data the same day.
- As a chef who owns the business, I want to remove a cook who left so that he can no longer log in, while the
  recipes he wrote stay.
- As a cook on the team, I want price fields to look locked so that I understand prices are the owner's job
  instead of hitting an error.
- As a cook on the team, I want only my own items to offer edit and delete so that I never break the owner's work.

## Goals & Success Criteria
**Primary:** the owner adds and removes staff from Settings → Team; staff log straight into the business; every
place this plan touches hides or locks exactly what the server (plan 427) would refuse.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npm --prefix server test -- test/business-team.test.js` passes, covering:
  - owner `POST /api/v1/business/team` `{ name: 'cook1', password: <valid PBKDF2 hash> }` → 201; the stored user
    has `businessId` = owner's, `businessRole: 'staff'`, `isPlatformAdmin: false`, a `createdAt` number, an
    email ending in `@staff.foodvibe.invalid`; no product/recipe docs are cloned for him;
  - the new staff `POST /api/v1/auth/login` → 200, access token carries the owner's `businessId` and
    `businessRole: 'staff'`;
  - same username again → 409 `{ error: 'USERNAME_TAKEN' }`; bad username (`'a b'`) → 400 `INVALID_USERNAME`;
    non-PBKDF2 password → 400 `INVALID_PASSWORD_FORMAT`;
  - staff token on `GET/POST/DELETE /team…` → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`;
  - owner `DELETE /api/v1/business/team/<ownerId>` → 403 `{ error: 'CANNOT_REMOVE_SELF' }`;
  - owner `DELETE /api/v1/business/team/<staffId of another business>` → 404;
  - owner removes cook1 → 200; cook1 `POST /auth/login` → 403 `{ error: 'USER_REMOVED' }`; cook1's refresh →
    401 `{ error: 'USER_REMOVED' }` (plan 425); a recipe cook1 created still exists (`GET /api/v1/data/recipes/<id>` as owner → 200);
  - `GET /team` lists owner + active staff only (removed staff gone), each row `{ _id, name, businessRole,
    createdAt, lastActiveAt: null }`.
- [x] [auto] `npm --prefix server test` passes (whole server suite).
- [x] [auto] `npx ng test --watch=false --include='src/app/core/services/permission.service.spec.ts' --include='src/app/pages/settings/**/*.spec.ts' --include='src/app/pages/inventory/components/product-price-lock/**/*.spec.ts' --include='src/app/shared/edit-gate/**/*.spec.ts'`
  passes, covering:
  - `PermissionService.can`: owner → true for every action; staff → `create` true; `edit`/`delete` true only when
    `doc.createdBy === user._id`; `editMoney`, `manageTeam`, `editSettings` false; `editTaxonomy` false for
    `eventType`, `menuType`, `station`; `changeStage` only on own events; `addNote`, `markArrival` true on any
    event; signed-out → false;
  - price lock: staff → `buy_price_global_` and every `purchaseOptions[i].priceOverride` /
    `show_special_price_` disabled, also on a row added after init; a programmatic `setValue` on a locked price
    snaps back to the loaded value; owner → nothing disabled;
  - edit gate: staff + `route.data.recipe.createdBy` ≠ staff id → projected content not rendered, note shown;
    own recipe or new recipe (no route data) → content rendered;
  - settings page: staff → the "owner only" empty state, no tabs; owner → Team tab active by default.
- [x] [auto] `git diff --numstat origin/mvp -- src/app/pages/inventory/components/product-form/product-form.component.ts src/app/pages/recipe-builder/recipe-builder.page.ts`
  → for each file, added ≤ deleted (growth-frozen, net lines ≤ 0).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, owner: menu → «הגדרות» → tab «צוות» → «הוסף חבר צוות» → username `cook1`, password → save →
  toast «חבר הצוות נוסף», `cook1` in the list as «צוות», last login «—».
- [human] Desktop, second browser (or private window): log in as `cook1` → the owner's products and recipes are
  there; open a product → price fields are greyed with «המחירים נעולים – רק בעל העסק יכול לשנות אותם»; in the
  recipe book, an owner's recipe has no trash button; open it → no «שמור מתכון» button, note «נוצר על ידי חבר
  צוות אחר – צפייה בלבד».
- [human] As `cook1`: create a recipe, edit it, delete it → all work. The «הגדרות» link is not in the menu; typing
  `/settings` shows «ההגדרות זמינות לבעל העסק בלבד».
- [human] As owner: «הסר» on `cook1` → confirm → gone from the list. In the `cook1` window, log out and log in →
  login refused with «המשתמש הוסר מהעסק – פנה לבעל העסק». Owner still sees the recipe `cook1` created earlier
  (create one before removing).
- [human] Mobile (≤ 620 px): bottom bar «פרופיל» → «הגדרות» opens the Team tab; the add form and the list fit the
  screen with no sideways scroll; «הסר» is reachable.

## Execution Mode
- Parallel: no against plans 423, 438, 444 (all edit `product-form.component.ts`) and 439 (recipe builder page);
  yes against the rest of lane 2 / lane 3 — run `node scripts/scope-check.mjs --overlap --plan=<this>` at take time.
- Concurrent plans: lane 2 (433–437, 430) and lane 3 plans other than 438, 439, 444.
- Isolated DB: no — creates users only in the slot DB through the normal API; no data reshape.

## Execution Notes
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/428.md`.
- Depends on: plan 427 merged (server permission checker), plan 426 merged (client business + role in user state).
  Through them: plans 424, 425.
- Must not run at the same time as: 423, 438, 444 (`product-form.component.ts`), 439 (`recipe-builder.page.*`).
- Lane wt-1, after 427. Next in lane: 429 (adds the Business tab to the page this plan creates).
- Plan 430 later fills the Team list's `lastActiveAt` from `usageDays` (C-USAGE); this plan returns `null` and the
  UI shows «—».

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/business.js
server/routes/auth.js
server/app.js
server/utils/username.js
server/test/business-team.test.js
src/app/core/services/permission.service.ts
src/app/core/services/permission.service.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/breadcrumbs.md
src/app/core/interceptors/auth.interceptor.ts
src/app/core/interceptors/auth.interceptor.spec.ts
src/app/core/components/header/**
src/app/pages/settings/**
src/app/pages/breadcrumbs.md
src/app/pages/inventory/components/product-price-lock/**
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/shared/edit-gate/**
src/app/shared/breadcrumbs.md
src/app/app.config.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

INV-1 and INV-2 are governed by ADR `docs/brain/decisions/0023-business-is-the-tenant.md` (plan 424). At Step 0
re-run `node scripts/scope-check.mjs --arch --plan=<this>` against the rewritten `docs/brain/invariants.md` and add a
line for any invariant the new Touches globs reach.

- INV-1: preserves — rewritten rule (ADR 0023): owner does everything in the business, staff edit/delete only what
  they created, money never. The server checker from plan 427 stays the only decider; this plan's team routes call
  `assertCan(req, res, 'manageTeam', …)`, and the client `PermissionService` only hides/locks by the same rules.
- INV-4: preserves — no entity shape changes; staff users are `users` docs (Mongoose model, not a `shared/schemas`
  entity), and every product/recipe write still goes through the generic validated routes.
- INV-6: preserves — no AI call added or moved.

## Step 0 — Reality Check

Runs always (plans 424–427 land the symbols this plan builds on). Check by symbol and print one line each, `ok` or
`conflict: <what>`:
- `server/utils/permissions.js` exports `can`, `assertCan`; action `manageTeam` exists (C-PERM).
- `server/utils/business-scope.js` exports `scopeFilter`, `stampNew`, `MASTER_BUSINESS_ID` (C-SCOPE).
- `server/models/user.model.js` has `businessId`, `businessRole`, `isPlatformAdmin`, `removedAt`, `createdAt`
  (C-USER); `email` is still `required` + `unique` (this plan does not change that — see Design §1).
- `server/routes/auth.js` `/login` answers 403 and `/refresh` answers 401 `{ error: 'USER_REMOVED' }` for a user
  with `removedAt` (C-USER; refresh 401 per plan 425). If either is missing → add it here (in scope) as sub-task T1b.
- `server/routes/business.js` exists, is mounted at `/api/v1/business` in `server/app.js`, has `GET /`. If the
  router is missing → create it with `GET /` per C-BUSINESS and mount it (in scope).
- `src/app/core/services/business.service.ts` exists with `business_` (C-BUSINESS). If missing → create it.
- `UserService.user_()` carries `businessRole` and `isPlatformAdmin` (plan 426); note the exact names.
- `docs/brain/decisions/0023-business-is-the-tenant.md` exists.
- Growth-frozen line counts at take time: `product-form.component.ts`, `recipe-builder.page.ts`.
All `ok` → continue. A `conflict` → STOP for a go.

## Contracts used (verbatim from the approved map)

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

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

**C-USAGE (430; consumed by 428 last-login, 447, 448)**
- Collection `usageDays`: `{ _id: `${userId}:${date}`, userId, businessId, date: 'YYYY-MM-DD' /* Asia/Jerusalem */, firstAt, lastAt, writeCount }`. Written by `server/middleware/usage.js` `recordUsage` after auth; writes = POST/PUT/PATCH/DELETE on business data excluding /auth/*; reads update at most once per minute per user (in-memory throttle). No TTL. Index `{ businessId: 1, date: 1 }`.
- "Last login" = latest `lastAt` for the user.

## Design

### 1. Team routes (server, `server/routes/business.js`)
All three use `verifyToken` and then `assertCan(req, res, 'manageTeam', { type: 'businesses' })` (returns early on
403). Every query filters `businessId: req.user.businessId`.
- `GET /team` → users with that `businessId` and no `removedAt`, projected to `{ _id, name, businessRole,
  createdAt }`, plus `lastActiveAt: null` on every row (plan 430 replaces `null` with the latest `usageDays.lastAt`).
  Sorted owner first, then `name`.
- `POST /team` body `{ name, password }`. `password` arrives already PBKDF2-hashed by the client, exactly like
  `/auth/signup` (`saltHex:hashHex`, checked with the same `PBKDF2_FORMAT`). Username rule = sign-up's rule, moved
  into `server/utils/username.js` (`isValidUsername(name)`: trimmed, 3–20 chars, `^[a-zA-Z0-9_-]+$`); `/auth/signup`
  calls the same helper (one rule, two callers). Name taken (any business) → 409 `USERNAME_TAKEN`. Creates:
  `{ _id: newId(), name, email: `${_id}@staff.foodvibe.invalid`, imgUrl: '', role: 'user', passwordHash,
  businessId: req.user.businessId, businessRole: 'staff', isPlatformAdmin: false, createdAt: Date.now(),
  lastSyncedMasterVersion: <the business's lastSyncedMasterVersion> }`. No clone — staff share the business copy.
  **Why a placeholder email:** `users.email` is `required` + `unique` (non-sparse index `email_1`); making it
  optional means rebuilding a unique index on Atlas. The reserved `.invalid` domain never receives mail, follows the
  dev guest precedent (`guest@dev.local` in `/auth/guest`) and is never shown in the team UI. Returns 201 with the
  `GET /team` row shape.
- `DELETE /team/:userId` → target must be in the caller's business (else 404 `NOT_FOUND`); target = caller → 403
  `CANNOT_REMOVE_SELF`; target `businessRole: 'owner'` → 403 `CANNOT_REMOVE_OWNER`. Sets `removedAt: Date.now()`
  (idempotent — already removed → 200). Never deletes the user or any of their documents.
- Log events: `business.team.added`, `business.team.removed`, `business.team.failed` (`req.log`, userId only — no
  names in logs).
- Removed staff with a live 15-minute access token keep working until it expires; `/refresh` refuses them
  (C-USER), so the longest window is 15 minutes. Accepted for MVP.

### 2. Client permission mirror (`src/app/core/services/permission.service.ts`)
`@Injectable({ providedIn: 'root' })`. Reads `UserService.user_()`.
`can(action: PermissionAction, ctx: { type: string; doc?: { createdBy?: string; kind?: string } }): boolean`
implements the C-PERM rules: signed out → false; owner → true; staff → per the rules list; `editTaxonomy` is always
false for staff, exactly like plan 427's server (`OWNER_ONLY`) — callers ask `editTaxonomy` only for the locked kinds
`eventType`, `menuType`, `station` and use `create` / `edit` / `delete` for every other kind. A ctx without `doc`
(business-level actions) skips the creator check and applies the role rule only. A doc with no
`createdBy` (pre-424 data never reaches here after migration 0006) counts as not created by the staff member.
Also `isOwner_` = `UserService.isOwner_` (plan 426) re-exposed, so plans 429 / 431 read one source. `PermissionAction` is a string-literal union of the
10 C-PERM actions, exported from the same file.

### 3. `/settings` page (lazy)
- Route appended to `src/app/app.routes.ts`: `{ path: 'settings', loadComponent: () =>
  import('./pages/settings/settings.page').then(m => m.SettingsPage), canActivate: [authGuard] }`.
- `src/app/pages/settings/settings-tabs.ts`: `export type SettingsTab = 'team' | 'business' | 'baseline'` and
  `SETTINGS_TABS: { key: SettingsTab; labelKey: string; icon: string; ownerOnly: boolean }[]` — this plan ships one
  entry `{ key: 'team', labelKey: 'settings_tab_team', icon: 'users', ownerOnly: true }`. Plans 429 and 431 append
  their entries and one `@case` each in the page template — nothing else.
- `SettingsPage` (`settings.page.ts/.html/.scss`): `activeTab_` computed from `?tab=` (unknown or not in
  `visibleTabs_()` → first visible tab), `visibleTabs_` = `SETTINGS_TABS` filtered by `ownerOnly → permission.isOwner_()`,
  `setTab(tab)` = `router.navigate([], { queryParams: { tab }, replaceUrl: true })` (same idiom as
  `DashboardPage.setTab`). No visible tab (staff) → `app-empty-state` with `settings_owner_only`. Tab bar: a row of
  buttons with `role="tab"`, `aria-selected`; on mobile it scrolls inline, never wraps the page. Header via
  `app-page-header` `titleKey="settings"`.
- Team tab `src/app/pages/settings/components/team-tab/team-tab.component.*`: on init `BusinessService.loadTeam()`.
  Add form (username, initial password, «הוסף»): client checks with `validateUsername(name)` and
  `validatePassword(password, name, '')` from `src/app/core/utils/auth-validation.util.ts` (same error keys as
  sign-up), hashes with `hashPassword` from `src/app/core/utils/auth-crypto.ts`, then `BusinessService.addStaff`.
  Errors: 409 → `username_taken` (existing key), 400 → `username_invalid_chars`. List rows: name · role
  (`business_role_owner` / `business_role_staff`, added by plan 426) · last login (`lastActiveAt` → `dd/MM/yyyy HH:mm` via Angular `DatePipe`, `null` →
  «—») · «הסר» (not on the owner row). Remove asks `ConfirmModalService.open(translate('team_remove_confirm'))`.
- `BusinessService` gains `team_` signal (`TeamMember[]`: `{ _id, name, businessRole, createdAt, lastActiveAt:
  number | null }`), `loadTeam()`, `addStaff(name, plainPassword)`, `removeStaff(userId)` — HTTP to
  `${environment.authApiUrl}/api/v1/business/team` (same base the auth calls use), success toasts via
  `UserMsgService`.

### 4. Locks in existing screens
- **Product prices — new child `src/app/pages/inventory/components/product-price-lock/`**
  (`ProductPriceLockComponent`, selector `product-price-lock`). Input `form = input.required<FormGroup>()`. Reads the
  edited product from `ActivatedRoute.snapshot.data['product']` (set by `productResolver` on `/inventory/edit/:id`).
  - Not allowed `editMoney` (staff): disables `buy_price_global_`, and in every `purchaseOptions` row
    `priceOverride` + `show_special_price_` (with `{ emitEvent: false }`); subscribes to the `purchaseOptions`
    FormArray `valueChanges` (`takeUntilDestroyed`) to disable rows added later and to put any changed locked
    value back to its value at load (the form's auto-suggested price would otherwise change a money field and the
    save would 403). Renders the note `prices_locked_owner_only` with the `lock` icon.
  - Existing product and not allowed `edit` (staff on another member's product): `form.disable()` and note
    `view_only_not_yours`. The form's own save then sends nothing new; the server is still the decider.
  - Owner: renders nothing, touches nothing.
  - Placement: `<product-price-lock [form]="productForm_" />` once at the top of the price section in
    `product-form.component.html`. In `product-form.component.ts` add one import line and put
    `ProductPriceLockComponent` on an existing line of the `imports: [...]` array (no new line); offset the import line
    by merging the second `@angular/core/rxjs-interop` import (`toSignal`, ~L46) into the first (`takeUntilDestroyed`,
    L17) — net 0. (`supplierIds_` is still read at L182/L324 — do not remove it.)
  - Save path needs no change: `onSubmit` builds the product from `productForm_.getRawValue()`, which keeps disabled
    values.
- **Edit gate — new `src/app/shared/edit-gate/edit-gate.component.*`** (selector `app-edit-gate`). Inputs `type =
  input.required<string>()`, `routeDataKey = input<string>('recipe')`. Reads `ActivatedRoute.snapshot.data[key]`; no
  doc (new item) → `can('create')`, else `can('edit', { type, doc })`. Allowed → `<ng-content />`; denied → the note
  `view_only_not_yours`. Used once in `recipe-builder.page.html` around the main save button
  (`main-submit-btn`): `<app-edit-gate type="recipes">…</app-edit-gate>`. `recipe-builder.page.ts` gets one import line and the
  class on an existing line of its `imports: [...]` array; offset by merging `import type { VersionEntityType }` (L33)
  into the `VersionHistoryService` import on L32 — net 0.
- **Lists:** `recipe-book-list.component.html` — the row trash button shows only when
  `canDelete_(row.recipe)`; `recipe-book-list.component.ts` adds `canDelete_ = (r) => permission.can('delete', {
  type: r.recipe_type === 'dish' ? 'dishes' : 'recipes', doc: r })` (read the actual type field name at Step 0).
  `inventory-product-list.component.html` — the row delete button (`onDeleteProduct`) shows only when
  `permission.can('delete', { type: 'products', doc: row.product })`. Bulk delete stays server-enforced: refused
  items come back as 403 and show the toast.
- **Header:** «הגדרות» link (`settings` icon) visible when `permission.isOwner_()` — in the side menu list next to
  the dashboard link, and in the mobile bottom-bar profile menu (`profile-menu`) above «התנתק».
- **403 toast:** `auth.interceptor.ts` — when `err.status === 403 && err.error?.messageKey === 'no_permission'`,
  show `translate('no_permission')` through `UserMsgService.onSetErrorMsg` and log it at `info`
  (`event: 'http.forbidden'`) instead of the `http.error` error line (an expected refusal is not an app error).

### 5. Dictionary (append to `public/assets/data/dictionary.json`, group `general`)
| key | Hebrew |
|---|---|
| `settings` | הגדרות |
| `settings_tab_team` | צוות |
| `settings_owner_only` | ההגדרות זמינות לבעל העסק בלבד |
| `team_add_member` | הוסף חבר צוות |
| `team_initial_password` | סיסמה ראשונית |
| `team_col_role` | תפקיד |
| `team_col_last_login` | כניסה אחרונה |
| `team_member_added` | חבר הצוות נוסף |
| `team_member_removed` | חבר הצוות הוסר |
| `team_remove_confirm` | להסיר את חבר הצוות? הפריטים שיצר יישארו בעסק |
| `team_cannot_remove_self` | לא ניתן להסיר את עצמך |
| `team_empty` | עדיין אין חברי צוות |
| `no_permission` | אין לך הרשאה לפעולה הזו |
| `prices_locked_owner_only` | המחירים נעולים – רק בעל העסק יכול לשנות אותם |
| `view_only_not_yours` | נוצר על ידי חבר צוות אחר – צפייה בלבד |

Skip any key that already exists at take time. Reused from plan 426: `business_role_owner`, `business_role_staff`,
`user_removed`. Existing keys reused: `username`,
`password`, `name`, `add`, `remove`, `username_taken`, `username_invalid_chars` and the password error keys.

### 6. Icons (`src/app/app.config.ts`, both the import list and `LucideAngularModule.pick`)
Add `Settings`, `UserPlus`. Already registered: `Lock`, `Users`, `Trash2`.

## Functional Requirements

### Must Have (P0)
- [ ] Owner adds staff by username + initial password; staff logs in straight into the business.
- [ ] Owner removes staff; removed staff can't log in or refresh; their items stay.
- [ ] Owner can't remove self; username taken → «שם המשתמש כבר תפוס».
- [ ] Team list: name, role, last login («—» until plan 430), «הסר».
- [ ] `/settings` lazy page with `?tab=` tabs; staff see the owner-only state, no link.
- [ ] Client `PermissionService.can` mirrors C-PERM.
- [ ] Product price fields locked for staff via the new child component; product-form net lines ≤ 0.
- [ ] Staff: no delete on items they did not create (recipe book, inventory); no save on another member's recipe.
- [ ] Any 403 `no_permission` → toast «אין לך הרשאה לפעולה הזו».

### Should Have (P1)
- [ ] Staff on another member's product → whole product form read-only with the note.

## UI/UX Notes
- RTL, logical CSS only; tab bar and team table follow the dashboard tab look (`dashboard-header`) and existing
  `.c-*` list engines — run the `cssLayer` skill before any `.scss`.
- Team table on mobile: name + role on one line, last login under it, «הסר» as an icon button with
  `aria-label`.
- No new `.c-*` classes; if one is truly needed, append it to `src/styles.scss`.

## Atomic Sub-tasks
- [x] T1: Let the owner list, add and remove staff on the server, with the sign-up username rule — GET/POST/DELETE /team in business.js, assertCan manageTeam, placeholder email, removedAt, server/utils/username.js used by /auth/signup — server/routes/business.js, server/utils/username.js, server/routes/auth.js
- [x] T1b: Refuse login and refresh for removed staff if plan 425 did not already — only when Step 0 found it missing; 403 USER_REMOVED in /login, 401 USER_REMOVED + cleared cookie in /refresh (as plan 425) — server/routes/auth.js
- [x] T2: Prove team management and the removed-staff block with server tests — every case in Done-when, users seeded with User.create — server/test/business-team.test.js
- [x] T3: Mirror the server permission rules in the browser so screens hide what would be refused — PermissionService.can, isOwner_, PermissionAction, spec — src/app/core/services/permission.service.ts, permission.service.spec.ts
- [x] T4: Add the settings page with tabs and the owner-only state for staff — lazy /settings route, SETTINGS_TABS, SettingsPage, spec — src/app/app.routes.ts, src/app/pages/settings/settings-tabs.ts, src/app/pages/settings/settings.page.*
- [x] T5: Build the Team tab where the owner adds and removes cooks — TeamTabComponent, BusinessService team_/loadTeam/addStaff/removeStaff, hashPassword, validateUsername/validatePassword, confirm modal — src/app/pages/settings/components/team-tab/**, src/app/core/services/business.service.ts
- [x] T6: Lock product prices for staff without growing the frozen product form — ProductPriceLockComponent + spec, one tag in the form template, import offset by deleted lines — src/app/pages/inventory/components/product-price-lock/**, product-form.component.html, product-form.component.ts
- [x] T7: Hide save on someone else's recipe and delete on items staff did not create — EditGateComponent + spec, builder save wrapped (net ≤ 0), canDelete in recipe book and inventory lists — src/app/shared/edit-gate/**, recipe-builder.page.html/.ts, recipe-book-list.component.*, inventory-product-list.component.*
- [x] T8: Show the owner a settings link and every user a Hebrew message when the server refuses — header link + profile menu item, 403 no_permission toast + info log in the interceptor — src/app/core/components/header/**, src/app/core/interceptors/auth.interceptor.ts
- [x] T9: Add the Hebrew texts and icons the new screens use — 15 dictionary keys (skip existing), Settings + UserPlus icons — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] T10: Refresh the folder maps for the new settings page and shared edit gate — breadcrumbs skill — src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, src/app/core/services/breadcrumbs.md
- [ ] T11: Build, test, check the frozen files and hand over the team and lock checks — ng build, server suite, listed specs, numstat, log-query; Human runs the [human] items on desktop and mobile — this plan file

## Technical Considerations
- Dependencies: `UserService.user_`, `ConfirmModalService`, `UserMsgService`, `TranslationService`,
  `auth-validation.util.ts`, `auth-crypto.ts`, `productResolver` / `recipeResolver` route data, `app-empty-state`,
  `app-page-header`.
- New files: `server/utils/username.js`, `server/test/business-team.test.js`, `permission.service.ts` (+spec),
  `pages/settings/**`, `product-price-lock/**`, `shared/edit-gate/**`.
- Model changes: client `TeamMember` interface in `business.service.ts`; no shared schema change.
- Backend / API: `GET /api/v1/business/team`, `POST /api/v1/business/team`, `DELETE /api/v1/business/team/:userId`
  (C-BUSINESS router); `/auth/signup` uses the extracted username helper (behavior unchanged).
- Auth and validation: owner only via `assertCan(…, 'manageTeam')`; username rule; PBKDF2 format; same-business
  check on delete.
- Security surface: a new account-creating endpoint. Owner-only, plus a `teamLimiter` in business.js (10 requests
  per 15 min, keyed by `req.user.userId`, same `express-rate-limit` setup as `signupLimiter`) because it is not under
  the `/api/v1/data` write limiter. Passwords never logged; the client hashes before sending, as sign-up does.
- Data / migration: none. New `users` docs only.
- Project checks: log-query Done-when; chef-side stories; 15 dictionary keys listed; RTL logical CSS; two Lucide
  icons registered; new screen is a lazy route (plan 419 budget); hotspots append-only.

## Backend Impact
- Collections affected: `users` (new staff docs; `removedAt` set on removal). Reads `businesses`
  (`lastSyncedMasterVersion`).
- New collections: no.
- Server changes needed: yes — team routes in `server/routes/business.js`; `server/utils/username.js`; `/auth/signup`
  calls the helper; `USER_REMOVED` in `/login` + `/refresh` only if plan 425 did not add it.

## Out of Scope
- Last-login values (plan 430 fills `lastActiveAt`).
- Business settings tab (plan 429), baseline tab (plan 431), coefficient lists (plan 441).
- Staff locks on event money, stage bar, notes, closing dialog (plans 443–446 use `PermissionService` there).
- Price lock in the quick-edit product panel / modal and the missing-prices popover (plan 444); the server still
  refuses staff there and the toast explains it.
- Email invites, password reset, role change staff→owner, per-person permissions, change proposals.
- Removing a whole business (platform admin, not in this plan).

## Critical Questions
None — product defaults are locked by the brief's Part 4. (Design choice made here, not a product question: staff
get a reserved placeholder email so the unique email index on Atlas stays untouched.)
