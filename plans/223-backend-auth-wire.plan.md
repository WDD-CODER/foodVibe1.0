---
name: Backend Auth Wire + cookie-parser Fix
overview: Install cookie-parser, fix server login PBKDF2 verification, and wire UserService to call real backend for login/signup/logout/refresh while keeping localStorage dev path intact.
todos: []
isProject: false
---

# Goal
Fix the missing cookie-parser bug and wire UserService to call the real backend for login, signup, logout, and token refresh — so the app fully authenticates against the Express/MongoDB server instead of localStorage.

# Atomic Sub-tasks

- [ ] `server/` — npm install cookie-parser
- [ ] `server/index.js` — add cookieParser() middleware after express.json()
- [ ] `server/routes/auth.js` — fix login: replace direct safeCompare with PBKDF2 re-derivation (blocker — plain password never matches stored hash with current code)
- [ ] `user.service.ts` — add HttpClient import + inject; add environment import + authBase
- [ ] `user.service.ts` — add storeToken() / clearToken() helpers using 'fv_token'
- [ ] `user.service.ts` — add callBackendLogin(), callBackendSignup(), callBackendRefresh(), callBackendLogout()
- [ ] `user.service.ts` — update login() with useBackendAuth branch + HTTP error mapping (401→USER_NOT_FOUND, 423→ACCOUNT_LOCKED, 429→RATE_LIMITED)
- [ ] `user.service.ts` — update signup() with useBackendAuth branch (hash before send) + error mapping (409→USERNAME_TAKEN/EMAIL_TAKEN)
- [ ] `user.service.ts` — update logout() — add clearToken() + fire-and-forget logout POST
- [ ] `auth.interceptor.ts` — add silent token refresh on 401 with URL guard to prevent infinite loop
- [ ] Run ng build — verify zero errors

# Constraints / Rules
- Never remove the localStorage path — useBackendAuth: false must keep working for local dev
- Never log the password or token — log userId only
- hashPassword() from auth-crypto.ts runs on Angular side before sending signup — do not send plaintext for signup
- Login sends plain password — server re-derives PBKDF2 hash using stored salt
- The fv_token key in sessionStorage must match TOKEN_KEY in http-storage.adapter.ts exactly
- withCredentials: true required on refresh and logout calls
- Do not touch any data service (RecipeDataService, ProductDataService, etc.)
- After every file change run ng build

# Verification
1. Dev mode (useBackendAuth: false) — login/signup/logout work via localStorage as before
2. Prod mode (useBackendAuth: true) — login POSTs to /api/v1/auth/login; token stored in sessionStorage under fv_token; data requests include Authorization: Bearer <token>
3. A 401 response triggers silent refresh attempt before showing sign-in modal
4. ng build passes with zero errors
