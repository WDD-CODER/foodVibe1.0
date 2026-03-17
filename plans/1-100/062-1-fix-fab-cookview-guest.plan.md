# Fix: FAB always visible + Cook View accessible to guests

Follow-up to Plan 062 (auth single source and sign-in/up).

## Problem

- Hero FAB is entirely hidden for guests -- but the Cook View button should always be available.
- `cook/:id` route has `authGuard`, blocking guests from viewing recipes in cook mode.
- Cook View edit actions (edit mode, scale-by-ingredient) need UI gating for guests.

## Changes

### 1. Hero FAB -- always visible, gate only recipe-builder action

- Remove outer `@if (isLoggedIn())` wrapper.
- Wrap only the recipe-builder button in `@if (isLoggedIn())`.
- Cook button and main FAB button remain visible for all users.

### 2. Route -- remove authGuard from cook/:id

- Remove `canActivate: [authGuard]` from `cook/:id` route.
- Keep `canDeactivate: [pendingChangesGuard]`.

### 3. Cook View -- gate edit actions for guests

- Add `isLoggedIn` signal from UserService to cook-view.page.ts.
- Hide the "Enter edit mode" button for guests.
- Hide the "Set recipe by this item" scale-by trigger for guests.
