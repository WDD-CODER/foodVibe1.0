---
name: auth-and-logging
description: Auth awareness, application-wide logging via LoggingService, and security hardening rules for foodVibe 1.0.
---

# Skill: Auth, Application-Wide Logging & Security

## When to use

- Any feature touching **routes**, **user data**, **auth**, **persistence**, **HTTP**, or **critical operations**
- Adding or refactoring **services** (especially data/CRUD and auth)
- When unsure whether to log an event: **ask the user**

---

## 1. Auth awareness

- **Protected routes**: Use `authGuard`; check `UserService.isLoggedIn()` (or auth facade) for current user when needed.
- **Never** store or log **passwords** or **tokens**; never log **PII** (full names, emails) — use identifiers (e.g. user `_id`) for audit only.
- **Credentials**: Use credential types only at login/signup; do not persist password in the user entity (store only hash if local path).

### Guest action feedback (add/edit/delete)

Any UI action that creates, updates, or deletes data (or otherwise requires a signed-in user) must give **guests** the same experience: show a clear message and prompt to sign in, instead of doing nothing or only redirecting.

**Two cases:**

- **Route-based (navigate to add/edit/delete page):** Keep using `authGuard` on those routes. The guard already shows `UserMsgService.onSetWarningMsg(translation.translate('sign_in_to_use'))` and `AuthModalService.open('sign-in')` before redirecting to dashboard. No extra handler logic needed.
- **Non-route (modal, embedded view, in-place action):** The guard never runs. At the **start** of the handler that performs the action, check sign-in; if not logged in, show the same message and modal, then return without performing the action.

**Pattern for non-route handlers:**

- Inject (if not already present): `UserService`, `UserMsgService`, `AuthModalService`, `TranslationService`.
- At the very beginning of the handler (e.g. `onAdd()`, `onDelete(item)`): if `!userService.isLoggedIn()`, call `userMsgService.onSetWarningMsg(translationService.translate('sign_in_to_use'))`, then `authModal.open('sign-in')`, then `return`.
- Reuse the dictionary key **`sign_in_to_use`** (in `public/assets/data/dictionary.json`).

**Buttons:** Prefer not disabling the button only (disabled gives no click feedback). Let the button run the handler so the guard or handler check runs and shows the toast + modal. Keep `[attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null"` for accessibility when the button is clickable.

**Reference implementations:**

- Route guard: `src/app/core/guards/auth.guard.ts`
- Handler-level check (list with modal add): `src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts` (`onAdd`)
- Handler-level check (embedded add): `src/app/pages/venues/components/venue-list/venue-list.component.ts` (`onAddPlace`)
- Many handlers in one place: `src/app/pages/metadata-manager/metadata-manager.page.component.ts` (`requireSignIn()` and its use in add/edit/remove/backup handlers)

⚠️ **Common mistake:** Adding `isLoggedIn()` only to route-based flows and forgetting non-route handlers (modals, FABs, inline buttons). The guard never fires there. Every handler that mutates data needs the check — use `requireSignIn()` to avoid repeating it.

---

## 2. Logging (application-wide)

Use the project **LoggingService** for all categories below. Prefer **structured events**: `{ event, message, context? }` (e.g. `auth.login`, `crud.recipe.delete`).

| Category | What to log | Where |
|----------|-------------|--------|
| **Auth & session** | Login success/failure (no password), logout, signup, guard denial, 401 / session expired | Auth service, auth guard, HTTP interceptor |
| **HTTP / API** | Failed requests (4xx/5xx), timeouts, network errors; optionally method + URL + status. **Never** log request/response bodies or headers (may contain tokens) | HTTP interceptor |
| **Critical data (CRUD)** | Create/update/delete of recipes, products, inventory, equipment, venues, suppliers, metadata (categories, allergens, labels, menu types, units, preparations). Log **what** (e.g. "recipe created") and entity type + id, **not** full payload or PII | Data services that call StorageService post/put/remove |
| **Errors & exceptions** | Unhandled errors: message + stack (or correlation id); caught errors that affect user-visible outcomes (e.g. "save failed") | Global ErrorHandler; try/catch in services that show UserMsgService |
| **Optional** | Route changes (support/debug); slow or heavy operations (e.g. large list load) | Router events; specific services |

✓ **Log after the action succeeds** (in the `.then()` / success path) — not before. A pre-call log that outlives a failure is a false record.
⚠️ **Log in the service, not the component.** Components are created and destroyed; their logs are inconsistent. The data service that calls `StorageService` is always alive — that's where CRUD events belong.

**When in doubt** whether to log, ask the user.

---

## 3. Security hardening

- **HTTPS**: All auth and API traffic over HTTPS in production; document in environment/deploy docs.
- **Secrets**: No API keys or secrets in frontend source; use environment variables; production keys must not be committed.
- **Input validation & sanitization**: Validate and sanitize user input (names, emails, recipe/content) before persistence or display; use Angular's default escaping; for rich content or URLs use DomSanitizer / allowed schemes.
- **Token storage**: Prefer in-memory for access token; if using sessionStorage, document and plan for httpOnly cookies later for XSS hardening.
- **Error exposure**: In production, do not expose stack traces or internal error details to the client; show generic messages; log full details via LoggingService (or backend log sink).
- **Rate limiting**: When backend exists, rate-limit login/signup (and optionally password reset); document as backend requirement.
- **Security headers**: When serving the app (server/CDN), set CSP, X-Frame-Options, X-Content-Type-Options; keep a short go-live checklist in docs.
- **Audit trail**: Logging critical CRUD + auth (with user identifier when logged in) provides minimal audit; no PII in logs.
- **Dependencies**: Keep packages updated; use [techdebt](.claude/skills/techdebt/SKILL.md) and run `npm audit` / update deps before going online.
