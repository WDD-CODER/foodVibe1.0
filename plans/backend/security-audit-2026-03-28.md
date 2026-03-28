## Security Audit Report — 2026-03-28

**Auditor:** Security Officer (Claude Sonnet 4.6)
**Branch:** feat/223-backend-auth-wire
**Scope:** Full pre-deployment go-live audit
**Verdict:** FAIL — 3 Critical / 2 High blocking issues must be resolved before go-live.

---

### Summary

| Severity | Count |
|---|---|
| Critical (BLOCKING) | 3 |
| High (BLOCKING) | 2 |
| Medium (NON-BLOCKING) | 3 |
| Low / Recommendation | 4 |
| **Total** | **12** |

---

## Passed

- **JWT secret from env only**: `process.env.JWT_SECRET` used exclusively in `server/middleware/auth.js:21` and `server/routes/auth.js`. Never hardcoded. Startup guard in `server/db.js:12` throws if `JWT_SECRET` is absent.
- **Access token expiry 15m**: `ACCESS_TOKEN_EXPIRY = '15m'` confirmed at `server/routes/auth.js:11`.
- **Refresh token is httpOnly cookie only**: All three cookie writes (`signup`, `login`, `refresh`) use `httpOnly: true` and are never returned in a response body that Angular stores. Confirmed `server/routes/auth.js:108-113`, `173-178`, `216-221`.
- **fv_token key matches between services**: `TOKEN_KEY = 'fv_token'` in `src/app/core/services/user.service.ts:13` and `const TOKEN_KEY = 'fv_token'` in `src/app/core/services/http-storage.adapter.ts:22`. Exact match.
- **Access token never logged**: No log call in any auth path includes the token string. Confirmed by grep across all `.ts` and `.js` files.
- **cookie-parser installed and wired**: `cookie-parser` is in `server/package.json` dependencies and applied at `server/index.js:6,34`.
- **Account lockout fires after 5 attempts**: `server/routes/auth.js:152-158` — `failedAttempts >= 5` triggers `lockedUntil = Date.now() + 15 * 60 * 1000`. Lock checked at line 141-143.
- **Rate limiting on login and signup**: `loginLimiter` (10/15min) applied at line 82, `signupLimiter` (5/1h) at line 127. `express-rate-limit` in dependencies.
- **router.use(verifyToken) is FIRST in generic.js**: Line 8 — `router.use(verifyToken)` appears before all route handlers. All data routes are authenticated.
- **replaceAll endpoint requires X-Confirm-Replace header**: `server/routes/generic.js:106` checks `req.headers['x-confirm-replace'] !== 'true'` and returns 400. Angular sets this header in `src/app/core/services/http-storage.adapter.ts:139`.
- **Body size capped at 2mb**: `express.json({ limit: '2mb' })` at `server/index.js:33`.
- **No [innerHTML] bindings in templates**: Grep across all `.html` files found zero matches.
- **No bypassSecurityTrust* usage**: Grep across all `.ts` files found zero matches.
- **Production error handler suppresses stack traces**: `server/index.js:49-55` — `NODE_ENV === 'production'` check returns `{ error: 'Internal server error' }` only.
- **server/.env in .gitignore**: `.gitignore:54` — `.env` and `.env.*` patterns present.
- **migration-dump.json in .gitignore**: `.gitignore:58` — explicitly listed.
- **\*.pem and \*.key in .gitignore**: `.gitignore:56-57` — both patterns present.
- **environment.prod.ts contains no real secrets**: Both `apiUrl` and `authApiUrl` are placeholder strings `'https://your-render-url.onrender.com'`. No credentials or keys.
- **Startup guard throws on placeholder URL**: `src/environments/environment.prod.ts:11-16` — throws at module load if `apiUrl` still contains `'your-render-url'`.
- **server/package-lock.json is committed**: File confirmed present at `server/package-lock.json`.
- **server npm audit: zero vulnerabilities**: `npm audit` in `server/` reports `found 0 vulnerabilities`.
- **PBKDF2 used for all new signups (Angular client)**: `src/app/core/services/user.service.ts:94` calls `hashPassword(password)` before signup in both backend and local-storage modes.
- **sessionStorage used for user session**: `SESSION_USER_KEY = 'loggedInUser'` written to `sessionStorage` only in `user.service.ts:223-228`. No token or password hash ever written to `localStorage`.
- **No PII in log statements**: All logging calls use `{ userId: user._id }` only. No email, name, password, or hash in any log entry.
- **No hardcoded secrets in environment files**: Both environment files contain only empty strings or placeholder URLs.
- **Logout clears sessionStorage correctly**: `user.service.ts:141` calls `_saveUserLocal(null)` and `clearToken()` which removes both `loggedInUser` and `fv_token` from sessionStorage.
- **authGuard used on all data-mutating routes**: All add/edit routes in `app.routes.ts` carry `canActivate: [authGuard]`. See detailed route analysis below.
- **requireAuth.util.ts pattern is correct**: `RequireAuthService.requireAuth()` checks `isLoggedIn()`, shows warning, opens sign-in modal, returns false.
- **helmet() applied**: `server/index.js:18` — sets `X-Content-Type-Options`, `X-Frame-Options`, and other headers.
- **morgan('tiny') applied**: Request logging at `server/index.js:20`. Does not log request/response bodies.
- **no console.log with PII on the server**: Server `console.log` calls at `server/db.js:14` and `server/index.js:63-64` log only non-sensitive startup info (connection status, port, CORS origin).

---

## Needs Fix — Before Go-Live (BLOCKING)

### [CRITICAL-1] Backend login sends raw plaintext password — PBKDF2 verification will always fail

- **Location**: `src/app/core/services/user.service.ts:66-70` (callBackendLogin) and `src/app/core/services/user.service.ts:156` (login method)
- **Description**: When `useBackendAuth` is true, `login()` at line 156 calls `callBackendLogin(name, password)` where `password` is the raw plaintext string entered by the user. It is sent directly to `POST /api/v1/auth/login` without hashing. However, at **signup**, the client hashes the password with PBKDF2 first (`hashPassword(password)` at line 94) and stores the hash string (format: `saltHex:hashHex`) in the database. On the server, `verifyPbkdf2()` (auth.js:62-76) expects to receive a **plaintext password**, re-derives the PBKDF2 hash, and compares against the stored value. Because the stored value is `PBKDF2(PBKDF2(plaintext))` and the comparison computes `PBKDF2(plaintext)`, login will always fail for any user created via the backend signup flow. This is a complete authentication breakage in production.
- **Impact**: No user who signed up via the backend auth flow can ever log in. Authentication is non-functional for production mode.
- **Remediation**: The Angular `login()` method must hash the password with PBKDF2 before sending, identical to how signup works. Add `from(hashPassword(password)).pipe(switchMap(hashedPassword => this.callBackendLogin(name, hashedPassword)))` in the `useBackendAuth` login path. The server's `verifyPbkdf2()` function must then be updated to do a **direct comparison** of the incoming hash against the stored hash (not re-derive from a plaintext), since both signup and login will now send the hash. Alternatively, invert the design so the client always sends plaintext and the server always derives — but that requires storing the plaintext PBKDF2 hash differently at signup. The simplest fix is: client hashes at login, server does direct `timingSafeEqual` of `incoming hash vs. stored hash`.

### [CRITICAL-2] signed-users-db (including passwordHash fields) is included in localStorage backup and exported to downloadable JSON file

- **Location**: `src/app/core/services/async-storage.service.ts:20` and `src/app/core/services/backup.service.ts:52-61`
- **Description**: `BACKUP_ENTITY_TYPES` includes `'signed-users-db'`. In local-storage mode, the `_save()` method writes the entire user list — including `passwordHash` fields — to both `localStorage['signed-users-db']` and `localStorage['backup_signed-users-db']`. The `BackupService.exportAllToFile()` method (backup.service.ts:50-78) iterates over all `BACKUP_ENTITY_TYPES` and writes their contents (including `backup_signed-users-db`) into a downloadable JSON file. Any user triggering an export receives a file containing all other users' PBKDF2 password hashes.
- **Impact**: Full password hash exposure for all users in the system, downloadable by any authenticated user. Even though PBKDF2 hashes are expensive to crack, exfiltrating them violates the credential-storage prohibition and enables offline attacks.
- **Remediation**: Remove `'signed-users-db'` from `BACKUP_ENTITY_TYPES`. User authentication records must never be included in data backups or exports. Ensure `BackupService.exportAllToFile()` explicitly skips any entity type containing auth data.

### [CRITICAL-3] No backend /logout endpoint — refresh cookie is never cleared server-side

- **Location**: `server/routes/auth.js` (entire file) and `src/app/core/services/user.service.ts:80-86`
- **Description**: `UserService.callBackendLogout()` makes a `POST` to `/api/v1/auth/logout` with `withCredentials: true`. However, the server has no `POST /logout` route — only `/signup`, `/login`, and `/refresh` are defined. The server never clears the `fv_refresh` httpOnly cookie on logout. Angular clears the `fv_token` from sessionStorage and the user signal, but the refresh cookie persists in the browser indefinitely (30-day maxAge). Any attacker with access to the browser can call `/api/v1/auth/refresh` to obtain a new valid access token even after the user believes they have logged out.
- **Impact**: Logout is ineffective. The session persists for up to 30 days after the user logs out, reachable via the refresh endpoint. This is a session persistence vulnerability.
- **Remediation**: Add `POST /logout` to `server/routes/auth.js`. The handler must call `res.clearCookie('fv_refresh', { httpOnly: true, secure: ..., sameSite: 'strict' })` and return 200. This endpoint should also require a valid access token (verifyToken middleware) to prevent unauthenticated cookie clearing abuse.

### [HIGH-1] Angular client sends PBKDF2 hash as the `password` field at signup — but backend stores it without validation of format

- **Location**: `server/routes/auth.js:84,100`
- **Description**: The signup route accepts any value in the `password` field and stores it as `passwordHash` without validating that it conforms to the expected `saltHex:hashHex` PBKDF2 format. An attacker sending a crafted request with a short or malformed `password` value (e.g. a 64-char hex string that looks like a legacy SHA-256 hash) would have their account stored with a legacy hash, bypassing PBKDF2 entirely and making their account trivially attackable offline. The server comment at line 98-100 notes "Angular already hashed the password" but does not enforce this assumption.
- **Impact**: Malicious signup requests can create accounts with weak legacy SHA-256 hashes, bypassing the PBKDF2 hardening entirely.
- **Remediation**: Add server-side format validation in `/signup` that rejects any `password` value not matching the pattern `/^[0-9a-f]{32}:[0-9a-f]{64}$/` (16-byte salt hex + 32-byte key hex). Return 400 if the format is wrong.

### [HIGH-2] No authorization scoping on data routes — any authenticated user can read or mutate any other user's data (IDOR)

- **Location**: `server/routes/generic.js:15-143` (all routes)
- **Description**: All data routes accept `req.params.type` (the entity type) and `req.params.id` freely. `req.user` (the decoded JWT payload) is attached by `verifyToken` but is **never consulted** in any route handler. Any authenticated user can query, update, or delete records belonging to any other user by knowing or guessing their entity IDs. The `entityType` parameter accepts any value including `signed-users-db`, meaning any authenticated user can issue `GET /api/v1/data/signed-users-db` and receive the full list of all user records including `passwordHash` fields for every account.
- **Impact**: (a) Complete data exposure — any user can read all other users' data entities. (b) Password hash exfiltration via `GET /api/v1/data/signed-users-db`. (c) Any user can delete or modify any other user's recipes, products, menus, etc.
- **Remediation**: (a) Add ownership scoping to all data queries and mutations: filter by `userId` field embedded in entity data, matching against `req.user.userId`. (b) Explicitly block access to `signed-users-db` entityType in the generic router with a 403 response. (c) Consider whether multi-tenancy (per-user data isolation) is in scope for this deployment — if all data is shared, document that decision explicitly.

---

## Needs Fix — Soon (NON-BLOCKING)

### [MEDIUM-1] Gemini API key stored in localStorage under user-controlled key 'FV_GEMINI_API_KEY'

- **Location**: `src/app/core/services/gemini.service.ts:20,23`
- **Description**: The Gemini API key is read from and written to `localStorage.getItem('FV_GEMINI_API_KEY')`. Any XSS payload, browser extension with storage access, or malicious script can exfiltrate this key. The key is entered by the user, but once stored it functions as a persistent credential in localStorage.
- **Impact**: Gemini API key exfiltration. An attacker obtaining this key can make API calls billed to the user's quota until the key is revoked.
- **Remediation**: This is low-severity given the key is user-provided for personal use. However, consider using sessionStorage instead of localStorage so the key is cleared when the tab is closed. Add a note in the UI that the key is stored locally.

### [MEDIUM-2] No rate limiting on /refresh endpoint

- **Location**: `server/routes/auth.js:193`
- **Description**: The `POST /refresh` endpoint has no rate limiter applied. An attacker who has obtained a refresh cookie (e.g. via network interception on non-HTTPS, or from the browser) can call this endpoint in a tight loop to continuously renew access tokens. Rate limiting is applied to `/login` and `/signup` but not to `/refresh`.
- **Impact**: Refresh token abuse is not throttled. Also reduces effectiveness of account lockout since the attacker can maintain a session without going through login.
- **Remediation**: Apply a rate limiter to `/refresh` (e.g. 30 req/15min/IP) using the existing `express-rate-limit` package that is already installed.

### [MEDIUM-3] `document.getElementById` used for focus management in multiple components — minor DOM coupling risk

- **Location**: `src/app/shared/unit-creator/unit-creator.component.ts:36,108,113` and `src/app/pages/menu-intelligence/menu-intelligence.page.ts:242,390,634-638,754,834-842,924-927`
- **Description**: Multiple components use `document.getElementById()` for focus management. While none of these assign to `.innerHTML` or create DOM content, the pattern bypasses Angular's abstraction layer. If any of the ID values are constructed from user-generated content (e.g. `'dish-name-' + s + '-' + i` where `s` comes from a section name), there is a risk of DOM clobbering if a section name contains characters that break the ID selector — though in current code `s` and `i` appear to be indices, not user strings.
- **Impact**: Low current risk. Establishes a code pattern that could become dangerous if future developers follow it with user-controlled ID values.
- **Remediation**: Use Angular's `ViewChild`/`ElementRef` or `@ViewChildren` for focus management. Avoid `document.getElementById` in Angular components.

---

## Recommendations (future)

### [REC-1] No refresh token rotation invalidation list / token revocation

- **Description**: The server issues new refresh tokens on each `/refresh` call (token rotation at auth.js:215), but old tokens are never added to a denylist. If an old refresh token is stolen, the attacker can use it to generate access tokens until expiry (30 days). Implement a server-side refresh token store (Redis or MongoDB collection) and invalidate old tokens on rotation.

### [REC-2] No CSRF protection on state-mutating auth routes

- **Description**: The `/login`, `/signup`, and `/refresh` endpoints use `sameSite: 'strict'` on the refresh cookie, which provides strong cross-site request forgery protection for the cookie itself. However, the access token is sent via `Authorization` header (not cookie), so CSRF is not a vector for data API calls. The current architecture is acceptable; just confirm `sameSite: 'strict'` is maintained in all environments.

### [REC-3] Log server URL (`logServerUrl`) is non-empty in development environment

- **Location**: `src/environments/environment.ts:7`
- **Description**: `logServerUrl: 'http://localhost:9765'` causes `LoggingService` to fire-and-forget HTTP log requests to a local server during development. In production `environment.prod.ts:7` it is an empty string, so this is correctly disabled. No action required but confirm the log server is never exposed on a public interface.

### [REC-4] Content-Security-Policy header not explicitly configured beyond Helmet defaults

- **Description**: `helmet()` is applied at `server/index.js:18` but the Angular SPA is served separately. Confirm the production serving infrastructure (Render, Nginx, etc.) serves the Angular app with an explicit CSP header that disallows `unsafe-inline` scripts. Helmet's defaults protect the API server but not the SPA's serving.

---

## npm audit — server/

```
found 0 vulnerabilities
```

---

## npm audit — root

```
# npm audit report

@angular/compiler  19.0.0-next.0 - 19.2.19
Severity: high
Angular vulnerable to XSS in i18n attribute bindings - https://github.com/advisories/GHSA-g93w-mfhg-p222
fix available via `npm audit fix`
node_modules/@angular/compiler
  @angular/compiler-cli  19.0.0-next.0 - 19.2.19
  Depends on vulnerable versions of @angular/compiler
  node_modules/@angular/compiler-cli
  @angular/platform-browser-dynamic  19.0.0-next.0 - 19.2.19
  Depends on vulnerable versions of @angular/common
  Depends on vulnerable versions of @angular/compiler
  Depends on vulnerable versions of @angular/core
  Depends on vulnerable versions of @angular/platform-browser
  node_modules/@angular/platform-browser-dynamic

@angular/core  19.0.0-next.0 - 19.2.19
Severity: high
Angular i18n vulnerable to Cross-Site Scripting - https://github.com/advisories/GHSA-prjf-86w9-mfqv
Angular vulnerable to XSS in i18n attribute bindings - https://github.com/advisories/GHSA-g93w-mfhg-p222
fix available via `npm audit fix`
node_modules/@angular/core
  @angular/common  19.0.0-next.0 - 19.2.18
  Depends on vulnerable versions of @angular/core
  node_modules/@angular/common
    @angular/forms  4.4.0-RC.0 - 4.4.0 || 19.0.0-next.0 - 19.2.18
    ...
  @angular/platform-browser  19.0.0-next.0 - 19.2.18
  ...
  @angular/router  10.0.0-next.0 - 10.0.0-rc.1 || 19.0.0-next.0 - 19.2.18
  ...

ajv  7.0.0-alpha.0 - 8.17.1
Severity: moderate
ajv has ReDoS when using `$data` option - https://github.com/advisories/GHSA-2g4f-4pwh-qvx6

brace-expansion  <1.1.13 || >=2.0.0 <2.0.3
Severity: moderate
brace-expansion: Zero-step sequence causes process hang and memory exhaustion

node-forge  <=1.3.3
Severity: high
Multiple vulnerabilities (cert chain bypass, Ed25519 signature forgery, RSA PKCS forgery, DoS)

path-to-regexp  <0.1.13
Severity: high
path-to-regexp vulnerable to Regular Expression Denial of Service

picomatch  <=2.3.1 || 4.0.0 - 4.0.3
Severity: high
Method Injection in POSIX Character Classes / ReDoS via extglob quantifiers

qs  6.7.0 - 6.14.1
qs's arrayLimit bypass in comma parsing allows denial of service

rollup  4.0.0 - 4.58.0
Severity: high
Rollup 4 has Arbitrary File Write via Path Traversal - https://github.com/advisories/GHSA-mw96-cpmx-2vgc

serialize-javascript  <=7.0.4
Severity: high
Serialize JavaScript is Vulnerable to RCE via RegExp.flags and Date.prototype.toISOString()

socket.io-parser  4.0.0 - 4.2.5
Severity: high
socket.io allows an unbounded number of binary attachments

tar  <=7.5.10
Severity: high
Multiple path traversal / file overwrite / symlink poisoning vulnerabilities

webpack  5.49.0 - 5.104.0
Severity: high
buildHttp HttpUriPlugin SSRF via allowedUris bypass

minimatch  <3.1.2
Severity: high
minimatch ReDoS

33 vulnerabilities (2 low, 7 moderate, 24 high)

To address all issues, run:
  npm audit fix
```

**Note on root npm audit:** The majority of vulnerabilities are in devDependencies used only during the Angular build process (`@angular-devkit`, `webpack`, `karma`, etc.) and are NOT present in the production bundle served to users. However, two require immediate attention:

- **@angular/core and @angular/compiler (high, XSS in i18n)** — these are production runtime dependencies. Run `npm audit fix` to upgrade to the patched Angular 19.2.x release. This is a BLOCKING go-live requirement per standards-security.md §8.
- All other high-severity findings are in devDependencies (build tooling). They do not affect the deployed application but should be updated promptly.

---

## Route Guard Coverage Analysis

| Route | Guard | Assessment |
|---|---|---|
| `equipment/list` | None | PASS — read-only, no mutation |
| `equipment/add` | authGuard | PASS |
| `equipment/edit/:id` | authGuard | PASS |
| `venues/list` | None | PASS — read-only |
| `venues/add` | authGuard | PASS |
| `venues/edit/:id` | authGuard | PASS |
| `inventory/list` | None | PASS — read-only |
| `inventory/add` | authGuard | PASS |
| `inventory/edit/:id` | authGuard | PASS |
| `inventory/equipment` | None | PASS — read-only |
| `inventory/equipment/add` | authGuard | PASS |
| `inventory/equipment/edit/:id` | authGuard | PASS |
| `recipe-builder` | authGuard | PASS |
| `recipe-builder/:id` | authGuard | PASS |
| `recipe-book` | None | PASS — read-only |
| `menu-library` | None | PASS — read-only |
| `menu-intelligence` | authGuard | PASS |
| `menu-intelligence/:id` | authGuard | PASS |
| `cook` | None | ADVISORY — read mode but canDeactivate missing on base route |
| `cook/:id` | None (canDeactivate only) | ADVISORY — cook view allows recipe modification without authGuard |
| `suppliers/list` | None | PASS — read-only |
| `suppliers/add` | authGuard | PASS |
| `suppliers/edit/:id` | authGuard | PASS |
| `dashboard` | None | PASS — read-only |
| `trash` | authGuard | PASS |

**Advisory on `cook` routes**: `cook` and `cook/:id` have no `authGuard`. If cook-view allows any state mutation (e.g. marking steps complete, saving notes) those mutations need `requireAuth()` guards at the component level. Verify `CookViewPage` component has mutation entry-point guards if it can write data.

---

## Verdict

**FAIL — Go-live is blocked.**

Three critical and two high-severity issues must be remediated before deployment:

1. **[CRITICAL-1]** Login for all backend-auth users will always fail due to the plaintext vs. PBKDF2 hash asymmetry between the Angular login and signup flows. The entire authentication system is non-functional in production mode.
2. **[CRITICAL-2]** `signed-users-db` (containing `passwordHash` for every user) is included in the backup export, making all user password hashes downloadable by any authenticated user.
3. **[CRITICAL-3]** No `/logout` backend endpoint means the 30-day refresh cookie is never cleared on logout — the session persists indefinitely.
4. **[HIGH-1]** Signup accepts any `password` format — a crafted request can register an account with a weak legacy SHA-256 hash, bypassing PBKDF2.
5. **[HIGH-2]** No data ownership scoping on generic routes — any user can read all other users' data, including `GET /api/v1/data/signed-users-db` (full password hash exposure).
6. **[HIGH — npm]** `@angular/core` and `@angular/compiler` have a known XSS vulnerability in i18n bindings. Run `npm audit fix` before building the production bundle.
