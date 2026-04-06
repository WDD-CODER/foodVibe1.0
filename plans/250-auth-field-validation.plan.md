---
name: Auth Field Validation — Signup & Login
overview: Add real email + password + username validation to signup (and presence check to login) with specific inline error messages on both frontend and backend.
todos: []
isProject: false
---

# Goal
Add real email + password + username validation to signup (and password check to login) on both frontend and backend, with specific inline error messages.

# Atomic Sub-tasks

- [ ] Task 1: Create `src/app/core/utils/auth-validation.util.ts` — pure validator functions (validateUsername, validateEmail, validatePassword)
- [ ] Task 2: Add 4 per-field touched signals to `auth-modal.component.ts` (nameTouched_, emailTouched_, passwordTouched_, confirmTouched_)
- [ ] Task 3: Replace onSubmit() validation block in `auth-modal.component.ts` with validator calls
- [ ] Task 4: Add (blur) handlers to `auth-modal.component.ts` for live per-field validation
- [ ] Task 5: Fix _onError() in `auth-modal.component.ts` — add EMAIL_TAKEN, INVALID_USERNAME, INVALID_EMAIL mappings
- [ ] Task 6: Update `user.service.ts` signup() catchError — add INVALID_USERNAME, INVALID_EMAIL mappings
- [ ] Task 7: Update `auth-modal.component.html` — extend c-input--invalid bindings and @if error blocks for all new keys; add (blur) events
- [ ] Task 8: Update `server/routes/auth.js` /signup — add username + email validation before uniqueness checks
- [ ] Task 9: Update `public/assets/data/dictionary.json` — add 9 new Hebrew translation keys

# Constraints

- Do not touch PBKDF2 hashing, JWT, refresh cookie, lockout, or rate limiter logic
- Do not enforce password strength on login — only signup
- Signals only (signal()) — no BehaviorSubject; trailing underscore for private signals
- inject() only — no constructor DI
- No any — explicit union return types on validators
- TS: single quotes, no semicolons; HTML: double quotes
- Keep login's generic user_not_found error (anti-enumeration)

# Verification (Done when)

- Signing up with email "abc" shows "Invalid email address" inline under email field on blur
- Signing up with password "abc" shows "Password must be at least 8 characters"
- Signing up with password "password" (no digit) shows "Password must contain a letter and a number"
- Signing up with username "ab" shows "Username must be at least 3 characters"
- Signing up with username "dan dan" (space) shows invalid-chars error
- Backend rejects same invalid inputs with 400 via curl to /api/v1/auth/signup
- Existing valid signups still work end-to-end
- Login still works for existing users with any password length
- All new error messages appear in Hebrew in the RTL modal
