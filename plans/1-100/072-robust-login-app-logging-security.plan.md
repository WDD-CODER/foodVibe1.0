# Robust Login System + Application-Wide Logging + Security Hardening

Refactor of the login/auth plan: **application-wide logging** (not only auth) and **security-expert** measures so the app is safe and manageable when going online.

---

## Current state

- **Auth**: [UserService](src/app/core/services/user.service.ts) — name-only, no password; users in `signed-users-db` via [StorageService](src/app/core/services/async-storage.service.ts); session in `sessionStorage`.
- **UI**: [AuthModalComponent](src/app/core/components/auth-modal/auth-modal.component.ts), [AuthModalService](src/app/core/services/auth-modal.service.ts), [authGuard](src/app/core/guards/auth.guard.ts) on many routes in [app.routes.ts](src/app/app.routes.ts).
- **Data**: Critical entities (recipes, products, inventory, equipment, venues, suppliers, metadata registries) persist via [StorageService](src/app/core/services/async-storage.service.ts) (see `BACKUP_ENTITY_TYPES`).
- **Gaps**: No environment config, no backend API, no password, no structured logging, no security checklist.

---

## Part 1 — Skills and rules (auth, logging, security)

**Goal**: Agents always (1) consider auth and sensitive data, (2) use the **application-wide** logging facility where appropriate, and (3) follow security rules (no secrets/PII in logs, validate input, etc.). When unsure about logging, ask the user.

### 1.1 Where to save

- **Rules**: [.claude/copilot-instructions.md](.claude/copilot-instructions.md) (single source of truth; do not add to `.cursor/rules/`).
- **Skill**: New `.claude/skills/auth-and-logging/SKILL.md` linked from [.claude/copilot-instructions.md](.claude/copilot-instructions.md).

### 1.2 Skill content (auth-and-logging)

- **When**: Any feature touching routes, user data, auth, persistence, HTTP, or critical operations; or adding/refactoring services.
- **Auth awareness**: Protected routes (`authGuard`), current user when needed, never store or log passwords/tokens; never log PII (full names, emails) — use identifiers (e.g. user id) for audit only.
- **Logging**: Use the project **LoggingService** for all categories in Part 2.4 (auth, HTTP, CRUD, errors). Structured events (event type + minimal context); **when unsure** whether to log, ask the user.
- **Security**: Follow the security hardening list (Part 2.5); no secrets in code (use environment); validate/sanitize user input where it is stored or displayed.

---

## Part 2 — Implementation

### 2.1 Auth hardening (no backend yet)

- **User model**: Keep `name`, `email`, `imgUrl`, `_id`; do **not** store password in the entity. Use credentials types only at login/signup.
- **Password**: Local path — store only a **hash** (e.g. Web Crypto SHA-256) in the user record; compare on login. Production: backend hashes (e.g. bcrypt) over HTTPS; frontend never stores password.
- **Auth abstraction**: Single facade (auth service or refactored UserService) with `login(credentials)`, `signup(user + password)`, `logout()`, `refreshSession()`, `isLoggedIn`, `currentUser`. Current impl: StorageService + sessionStorage + local hashing.
- **Auth modal**: Add password field to sign-in and sign-up; wire to new methods; follow [cssLayer](.claude/skills/cssLayer/SKILL.md) for styles.
- **Guard**: Unchanged surface; use same `isLoggedIn` from auth facade.
- Remove stray `console.log('variable')` in UserService.

### 2.2 Backend-ready (environment + API)

- **Environment**: `src/environments/environment.ts` and `environment.prod.ts` with `apiUrl` (or `authApiUrl`) and `useBackendAuth: false` (true in prod when backend exists).
- **Auth API contract**: `POST /auth/login`, `POST /auth/signup`, `POST /auth/refresh`, `DELETE|POST /auth/logout`; return `{ user, accessToken [, refreshToken ] }`. All over **HTTPS** in production.
- **Auth provider**: When `useBackendAuth` is true, HTTP provider calls API, stores token (in-memory preferred; sessionStorage acceptable if documented); same facade API.
- **HTTP interceptor**: Attach `Authorization: Bearer <token>`; on **401** clear session, open auth modal or redirect, and **log** (e.g. "Session expired") via LoggingService.
- **Token lifecycle**: Short-lived access token; refresh rotation when backend supports it; clear tokens on logout.

### 2.3 Logging service (single facility)

- **Service**: e.g. `LoggingService` in `src/app/core/services/` with `info(message, context?)`, `warn(...)`, `error(...)`. Dev: forward to console; prod: backend endpoint or suppress/strip by level. **Never** log passwords, tokens, or PII (use ids or "user" only).
- **Structured events**: Prefer `{ event, message, context? }` so later you can filter by event (e.g. `auth.login`, `crud.recipe.delete`).

### 2.4 Application-wide logging scope

Use the **same** LoggingService across the app. Wire it in this order:

| Category | What to log | Where |
|----------|-------------|--------|
| **Auth & session** | Login success/failure (no password), logout, signup, guard denial, 401 / session expired | Auth service, auth guard, HTTP interceptor |
| **HTTP / API** | Failed requests (4xx/5xx), timeouts, network errors; optionally request method + URL + status for debugging. **Never** log request/response bodies or headers (may contain tokens) | HTTP interceptor |
| **Critical data (CRUD)** | Create/update/delete of important entities: recipes, products, inventory, equipment, venues, suppliers, metadata (categories, allergens, labels, menu types, units, preparations). Log **what** (e.g. "recipe created", "product deleted") and entity type + id, **not** full payload or PII | Services that call StorageService post/put/delete (e.g. [async-storage.service](src/app/core/services/async-storage.service.ts) callers: product/recipe/equipment/venue/supplier data services, [metadata-registry.service](src/app/core/services/metadata-registry.service.ts), [unit-registry.service](src/app/core/services/unit-registry.service.ts), [preparation-registry.service](src/app/core/services/preparation-registry.service.ts)) |
| **Errors & exceptions** | Unhandled errors: message + stack (or correlation id); caught errors that affect user-visible outcomes (e.g. "save failed") | Global ErrorHandler; try/catch in services that show UserMsgService |
| **Optional** | Route changes (for support/debug); slow or heavy operations (e.g. large list load) | Router events; specific services |

The **auth-and-logging** skill will state: use LoggingService for these categories when adding or changing features; when in doubt, ask.

### 2.5 Security hardening (cyber perspective)

- **HTTPS**: All auth and API traffic over HTTPS in production; document in environment/deploy docs.
- **Secrets**: No API keys or secrets in frontend source; use environment variables; production keys must not be committed (document in skill or copilot-instructions).
- **Input validation & sanitization**: Validate and sanitize user input (names, emails, recipe/content fields) before persistence or display to reduce XSS/injection. Rely on Angular's default escaping; for rich content or URLs, sanitize explicitly (e.g. DomSanitizer / allowed schemes).
- **Token storage**: Prefer in-memory for access token; if using sessionStorage, document and plan for httpOnly cookies later for XSS hardening.
- **Error exposure**: In production, do not expose stack traces or internal error details to the client; show generic messages to the user; log full details server-side (or via LoggingService to a backend log sink).
- **Rate limiting**: When backend exists, rate-limit login/signup (and optionally password reset) to mitigate brute force; document as backend requirement.
- **Security headers (when deployed)**: When serving the app (e.g. via a server or CDN), set CSP, X-Frame-Options, X-Content-Type-Options, and similar; keep a short "go-live" checklist in docs or plan.
- **Audit trail**: Logging critical CRUD + auth (with user identifier when logged in) provides a minimal audit trail; no PII in logs.
- **Dependencies**: Keep packages updated for known vulnerabilities; use existing [techdebt](.claude/skills/techdebt/SKILL.md) and add a note to run `npm audit` / update deps before going online.

---

## Part 3 — Order of implementation

1. **Skills first**: Create `.claude/skills/auth-and-logging/SKILL.md` (include application-wide logging scope and security rules), update HOW-WE-WORK.md and copilot-instructions.md.
2. **Logging service**: Implement LoggingService; replace ad-hoc `console.log` in [user.service](src/app/core/services/user.service.ts) and [translation.service](src/app/core/services/translation.service.ts) where appropriate.
3. **Wire logging**: Auth (login/logout/signup/guard/401), then HTTP interceptor (when backend exists), then global ErrorHandler, then critical CRUD in services that use StorageService for key entities.
4. **Auth hardening**: Password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring.
5. **Backend-ready**: Environment files, API contract, HTTP provider, interceptor, token lifecycle.
6. **Security checklist**: Add a short "Security & go-live" section to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure).

---

## Summary

| Part | What | Where |
|------|------|--------|
| 1 | Auth + app-wide logging + security rules for agents | Skill `.claude/skills/auth-and-logging/SKILL.md`; HOW-WE-WORK; copilot-instructions |
| 2.1 | Passwords, no plaintext, auth abstraction | User model, auth service, modal, guard |
| 2.2 | Backend-ready: env, API, HTTP provider, interceptor, token lifecycle | environments; auth provider; interceptor |
| 2.3 | Single LoggingService | `src/app/core/services/` |
| 2.4 | **Application-wide logging**: auth, HTTP, CRUD, errors, optional | Auth, interceptor, ErrorHandler, data services |
| 2.5 | **Security hardening**: HTTPS, secrets, input, tokens, errors, rate limit, headers, audit, deps | Env, code, docs/checklist |

After execution: secure login path, **one logging facility used across the app** (auth, HTTP, CRUD, errors), and clear rules so agents always consider auth, logging, and security.
