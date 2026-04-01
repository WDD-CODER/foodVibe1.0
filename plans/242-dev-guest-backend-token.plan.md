# Plan 242 — Dev Guest Backend Token

## Problem

`loginAsGuest()` only writes a user object to sessionStorage — no JWT is issued.
When the app runs with `environment.local.ts` (`useBackendAuth: true`, `useBackend: true`),
every save/update goes through `HttpStorageAdapter` which requires `Authorization: Bearer <token>`.
Result: guest saves hit the backend, get 401 "No token provided", the interceptor tries
to refresh (no cookie), fails, and signs the user out — redirecting them to the sign-in modal.

## Goal

Guest mode works end-to-end in local+server mode:
- Guest button visible and functional when `isDev` (non-production), regardless of `useBackendAuth`
- Guest saves/reads go to MongoDB when backend is enabled
- No backend changes needed when `useBackendAuth: false` (localStorage path unchanged)
- The guest endpoint is **dev-only** — blocked in production

---

## Atomic Sub-tasks

### 0. Schema — update `user.model.js`
**File:** `server/models/user.model.js`

- Add `role: { type: String, enum: ['admin', 'user'], default: 'user' }` field
- Change `passwordHash` from `required: true` to `default: null` (removes required constraint)

### 1. Backend — add `POST /api/v1/auth/guest` endpoint
**File:** `server/routes/auth.js`

- Add after the existing `/logout` route
- Gate with `if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' })`
- Upsert the guest user into MongoDB:
  ```js
  await User.findOneAndUpdate(
    { _id: 'dev-guest' },
    { _id: 'dev-guest', name: 'Guest Admin', email: 'guest@dev.local', role: 'admin', passwordHash: null },
    { upsert: true, new: true }
  )
  ```
- Sign a 15-min access token and a 30-day refresh token (same as `/login`)
- Set the `fv_refresh` httpOnly cookie (same options as `/login`)
- Return `{ token, user: { _id, name, email, role } }`
- No rate limiter needed (dev-only endpoint)

### 2. Frontend — add `UserService.loginAsGuestBackend()`
**File:** `src/app/core/services/user.service.ts`

- Add a private method `callBackendGuestLogin()` that POSTs to `${this.authBase}/api/v1/auth/guest` with no body
- Add a public method `loginAsGuestBackend()` that:
  - calls `callBackendGuestLogin()`
  - on success: `storeToken(token)` + `_saveUserLocal(user)`
  - on error: propagates

### 3. Frontend — update `AuthModalComponent.loginAsGuest()`
**File:** `src/app/core/components/auth-modal/auth-modal.component.ts`

- Restore `isDev` to `!environment.production` (remove the `&& !environment.useBackendAuth` added in this session)
- Update `loginAsGuest()`:
  ```ts
  protected loginAsGuest(): void {
    if (environment.useBackendAuth) {
      this.userService.loginAsGuestBackend().subscribe({
        next: () => { this._reset(); this.modalService.close(); },
        error: () => { /* fallback: still close modal, just no backend session */ this._reset(); this.modalService.close(); }
      });
      return;
    }
    // existing localStorage-only path
    this.userService._saveUserLocal({ _id: 'dev-guest', name: 'Guest Admin', email: 'guest@dev.local', role: 'admin' });
    this._reset();
    this.modalService.close();
  }
  ```

### 4. Backend — register the guest route
**File:** `server/index.js`

- Verify the auth router is already mounted at `/api/v1/auth` (it should be — just confirm no extra mount needed)

---

## Files Changed

| File | Change |
|------|--------|
| `server/routes/auth.js` | Add `POST /guest` route (dev-only, upserts guest user, returns JWT) |
| `src/app/core/services/user.service.ts` | Add `callBackendGuestLogin()` + `loginAsGuestBackend()` |
| `src/app/core/components/auth-modal/auth-modal.component.ts` | Restore `isDev`, branch `loginAsGuest()` on `useBackendAuth` |

## Files NOT changed
- `auth.interceptor.ts` — the interceptor fix from this session (login-vs-refresh 401 split) stays as-is
- `environment.*.ts` — no changes needed
- Any SCSS / template files

## Verification

1. Run backend (`node server/index.js`) + Angular (`ng serve -c local`)
2. Open auth modal → "Guest (Dev)" button is visible
3. Click it → user is set to "Guest Admin", no sign-in form needed
4. Navigate to recipe builder, save a recipe → save succeeds, recipe appears in MongoDB
5. Reload tab → guest session is gone (sessionStorage cleared on tab close) — expected

## Notes for implementing agent

- The `User` model may need `role` as an enum field that includes `'admin'` — check `server/models/user.model.js` before writing
- The guest endpoint has no password, so `verifyToken` middleware must NOT be applied to it
- `loginAsGuestBackend()` in UserService follows the exact same pattern as `callBackendLogin()` — keep it consistent
