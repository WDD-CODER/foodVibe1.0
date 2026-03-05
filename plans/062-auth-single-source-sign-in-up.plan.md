# Auth: Single Source of Truth + Sign-in / Sign-up Behavior

## Problem summary

- `_users_` initialized from `UtilService.LoadFromStorage()` (direct localStorage) but signup writes via `StorageService.post()` -- the in-memory list is never refreshed after signup.
- `UtilService.saveToStorage()` is dead code; `LoadFromStorage()` used only once at init.
- No auth UI exists -- no sign-in/sign-up screens, no header user state, no route protection.
- Session stored in **sessionStorage** -- lost on every tab close / refresh, forcing re-login every time.

## Target behavior

1. **StorageService** is the single source of truth for the users list.
2. **Unique username** enforced on signup -- duplicates rejected with an error message.
3. **Persistent session** -- logged-in user saved to **localStorage** (not sessionStorage). Auto-login on app load if the user hasn't explicitly logged out. Only explicit logout clears the session.
4. **Auth guard** (`canActivate`) blocks all create/edit/delete routes for guests.
5. **Read-only guest mode** -- guests can browse lists and view data but cannot see add/edit/delete buttons or the hero FAB.
6. **User profile image** -- users can upload a picture at sign-up (stored as base64 data URL in localStorage alongside the user record).
7. **Header avatar UX** -- visual indicator in the nav bar: guest sees a default avatar icon + "Sign in" link; signed-in user sees their uploaded image (or fallback initials) + username + "Log out" action.
8. **Auth modal** -- Liquid Glass modal with sign-in / sign-up tabs, form validation, error feedback.

---

## 1. User model

**File**: `src/app/core/models/user.model.ts`

Add `imgUrl?: string` (base64 data URL or external URL).

---

## 2. UserService: single source of truth + persistent session

**File**: `src/app/core/services/user.service.ts`

### 2a. Persistent session (localStorage instead of sessionStorage)

- Change `_saveUserLocal` to write the logged-in user to **localStorage** (key `logged-in-user`) instead of calling `utilService.saveUserToSession()` (which uses sessionStorage).
- On init, read from `localStorage` to hydrate `_user_` signal. This means: page refresh, new tab, browser restart all keep the user signed in.
- `logout()` clears the localStorage key and sets `_user_` to `null`.
- Remove dependency on `UtilService.LoadUserFromSession` / `saveUserToSession` for user session.

### 2b. Auto-login on app start

- In the constructor, read `logged-in-user` from localStorage. If a user object exists, set `_user_` signal immediately (synchronous -- no flicker).
- The user stays logged in across refreshes until they explicitly log out.

### 2c. Users list from StorageService

- Initialize `_users_` to `null`.
- Add `async refreshUsersFromStorage(): Promise<void>` that calls `storageService.query<User>(SIGNED_USERS, 0)` and sets `_users_`.
- Call this in an `APP_INITIALIZER` (see section 9).
- After every signup, call `refreshUsersFromStorage()` so the list stays in sync.

### 2d. Unique username enforcement

- In `signup()`, after querying existing users, if a user with the same `name` already exists, emit an error (`USERNAME_TAKEN`) instead of silently returning the existing user.
- The auth modal catches this error and shows an inline "username already taken" message.

### 2e. Login error handling

- Replace `filter(user => !!user)` with `switchMap` that throws `USER_NOT_FOUND` when the user doesn't exist. The auth modal catches this and shows "user not found".

### 2f. Expose auth convenience

- Add a computed signal: `isLoggedIn = computed(() => !!this._user_())` for use in templates and the auth guard.
- Remove unused `_clearSessionStorage()`, `_updateUser()`, and commented-out code blocks.

---

## 3. UtilService: dead code cleanup

**File**: `src/app/core/services/util.service.ts`

Remove: `LoadFromStorage()`, `saveToStorage()`, `LoadUserFromSession()`, `saveUserToSession()`, constants `SIGNED_USERS` and `LOGGED_IN_USER`.

Keep: `makeId()`, `getEmptyProduct()` (still used elsewhere).

---

## 4. Auth guard

**New file**: `src/app/core/guards/auth.guard.ts`

When a guest tries to navigate to a protected route, the guard redirects to `/dashboard` and opens the sign-in modal automatically.

**Apply to routes** in `src/app/app.routes.ts`:

Protected routes (require signed-in user):
- `equipment/add`, `equipment/edit/:id`
- `venues/add`, `venues/edit/:id`
- `inventory/add`, `inventory/edit/:id`, `inventory/equipment/add`, `inventory/equipment/edit/:id`
- `recipe-builder`, `recipe-builder/:id`
- `menu-intelligence`, `menu-intelligence/:id`
- `cook/:id` (editing mode)
- `suppliers/add`, `suppliers/edit/:id`
- `trash`

Open routes (guests can view):
- All `list` routes (equipment, venues, inventory, suppliers)
- `recipe-book`, `menu-library`
- `cook` (view-only without `:id`)
- `dashboard`

---

## 5. Read-only guest mode (UI gating)

For every list/page component that currently shows add/edit/delete actions, conditionally hide those controls when no user is signed in.

**Approach**: Inject `UserService` in each component that has edit actions, expose `isLoggedIn` to the template, and wrap action buttons with `@if (isLoggedIn())`.

**Affected components** (action buttons to hide for guests):
- supplier-list, equipment-list, venue-list, inventory-product-list, recipe-book-list, menu-library-list, dashboard-overview
- hero-fab: hide entire FAB for guests

---

## 6. Auth modal

### 6a. AuthModalService

**New file**: `src/app/core/services/auth-modal.service.ts`

### 6b. Auth modal component

**New files**: `src/app/core/components/auth-modal/auth-modal.component.{ts,html,scss}`

Sign-up fields: name (required, unique), email (required), profile image (optional file input with base64 preview).
Sign-in fields: name only.
Auth tabs: two buttons at top of modal card (active = primary style, inactive = ghost).
Inline error display for USERNAME_TAKEN and USER_NOT_FOUND.

---

## 7. Header: avatar and auth UX

Add `.auth-section` to header nav:
- Guest: default avatar icon + "Sign in" link
- Signed-in: user image (or initials circle) + username + log-out icon button

---

## 8. Translations

Add auth-related keys to `public/assets/data/dictionary.json`.

---

## 9. App wiring

- APP_INITIALIZER for users list refresh
- Register Lucide icons: `CircleUserRound`, `LogOut`
- Add `<app-auth-modal />` to app root
- Add `canActivate: [authGuard]` to protected routes
