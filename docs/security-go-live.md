# Security & Go-Live Checklist

Use this checklist before deploying foodVibe 1.0 to production.

## Auth API contract (when backend exists)

- **POST /auth/login** — body: `{ name/email, password }`; response: `{ user, accessToken [, refreshToken ] }`
- **POST /auth/signup** — body: user + password; response: `{ user, accessToken [, refreshToken ] }`
- **POST /auth/refresh** — refresh token; response: `{ accessToken [, refreshToken ] }`
- **DELETE** or **POST /auth/logout** — invalidate session

All over **HTTPS** in production. Frontend: set `useBackendAuth: true` and `authApiUrl` in `environment.prod.ts` (from env vars, not committed).

---

## Pre-launch checklist

| Item | Notes |
|------|--------|
| **HTTPS** | All auth and API traffic over HTTPS in production. |
| **Secrets** | No API keys or secrets in frontend source. Use environment variables; production keys must not be committed. |
| **Error exposure** | In production, do not expose stack traces or internal error details to the client; show generic messages; log full details server-side or via LoggingService to a backend log sink. |
| **Security headers** | When serving the app (e.g. via server or CDN), set: **CSP**, **X-Frame-Options**, **X-Content-Type-Options**, and similar. |
| **Rate limiting** | When backend exists, rate-limit login/signup (and optionally password reset) to mitigate brute force. |
| **Dependencies** | Run `npm audit` and update dependencies for known vulnerabilities before going online. See [techdebt](.claude/skills/techdebt/SKILL.md). |

---

## Development logging

Nothing to start. `LoggingService` sends every `warn` / `error` to **`POST /api/v1/log`** on the app's own Express server, which stores it in the MongoDB collection **`app_logs`** (local DB in dev, Atlas in prod; entries expire after 90 days). The same works in every environment — see [ADR 0016](brain/decisions/0016-logging-sink-mongo.md).

- `info` events are stored only when the server runs with `LOG_PERSIST_INFO=1`; otherwise they go to the browser console and server stdout only.
- Entries carry `userId` only — never email, name, IP or user-agent.
- Until `scripts/log-query.mjs` lands (Plan 384), query with `mongosh`:
  `db.app_logs.find({ level: 'error' }).sort({ createdAt: -1 }).limit(20)`

---

## Front desk: public door and customer data

### Public endpoints
- `/api/v1/public` (plans 543, 555): no member token. Writes go through `publicLimiter` (20 per 15 minutes per IP + slug) and a honeypot field `website`. A guest reads a request back only with its 32-character token. Guest text is stored as plain text and never rendered as HTML.

### Webhook (plan 560, before it goes live)
- `GET` answers the verify token. `POST` is checked with the `X-Hub-Signature-256` HMAC over the raw body with `WHATSAPP_APP_SECRET`, and is idempotent on the provider message id.

### Rate limits
| Surface | Limit |
| --- | --- |
| Data writes | 300 / 15 min |
| AI calls | 20 / 15 min per user |
| Public writes | 20 / 15 min per IP + slug |

### Data retention
| Data | Kept | How |
| --- | --- | --- |
| `requests` (final status: approved, declined, cancelled, expired) | 24 months from the last change | lazy sweep, `server/jobs/retention.js` |
| `bookings` | 24 months after `startAt` | same sweep |
| `messages` | 12 months | same sweep (collection arrives in plan 560) |
| `decisionLog` | kept (no personal fields) | — |
| clients | until erased | `erase-client.js` |
| Trash | purged after 30 days | `server/jobs/purge-deleted.js` |
| Voice recordings (`storedFiles`, kind voice) | 24 months from the recording | same sweep (also run when a file link is asked for) |
| File of an invoice read that was never saved | 30 days | same sweep |
| File of a saved invoice | as long as the invoice | `keepStoredFile` clears its `deleteAfter` |

The sweep runs on a read of `requests` or `bookings` for the caller's own business, at most once per business per 24 hours. An open request is never cleared.

### Private files: invoices and voice notes (plan 619)
- `storedFiles` holds ids and sizes only; the file itself lives in the file store (Cloudinary, uploaded as an authenticated, non-public asset), never in MongoDB.
- Three server variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. The browser never gets them. Without all three every feature works and the file is simply not kept.
- Gate G3, in order: (1) create the three values in the provider's console; (2) set them on Render by hand; (3) allow "PDF and ZIP files delivery" under the provider's Security settings; (4) check `/platform` shows the store on (`GET /api/v1/admin/learning/status` → `{ fileStore: true }`).
- A link to a file lives 300 seconds (`GET /api/v1/files/:id`).
- Who may open what: any member of the business a voice note; the owner an invoice file (it shows prices).
- What is logged: the kind and the size only — never the content, a file name or a provider id.

#### Deleting a business and an erasure request
- A delete always removes the business's files, price history, own name memory and access grants, together with the user-data collections.
- For a business that is not private, its part in the shared supplier memory, its promoted recipe examples and its draft rows (reduced to numbers, no content) stay.
- A full erasure is two steps: 1. turn private mode on for the business on `/platform`; 2. delete the business. Nothing learned from it remains.

### Erase a customer by phone
Dry run first (counts only, nothing written):

    node server/scripts/erase-client.js --target=local --business=<businessId> --phone=<number>

Apply locally (`--db=<scratch>` for a copy), then on Atlas after a backup:

    node server/scripts/erase-client.js --target=local --business=<businessId> --phone=<number> --write
    node server/scripts/db-backup.js --target=atlas
    node server/scripts/erase-client.js --target=atlas --confirm-host=<host> --business=<businessId> --phone=<number>
    node server/scripts/erase-client.js --target=atlas --confirm-host=<host> --business=<businessId> --phone=<number> --write

It deletes the person's clients (live, in Trash and merged), requests, bookings, conversations and messages, and removes `clientId`, `clientName` and `clientPhone` from their events (the event, its money and history stay). The phone `052-123 4567`, `+972 52 123 4567` and `972521234567` are the same person. Free-text event notes may still name the person: check them by hand.

### הפיכת משתמש למנהל מערכת באפליקציה החיה
Make one existing user the platform admin on the live app (plan 737). Nothing else grants it: no route, sign-up rule or environment setting sets `isPlatformAdmin`. Agents never run this against Atlas; it is the Human's, from the main folder (the only folder with `server/.env.live`).

1. Open https://foodvibe1-0-1-frankfurt.onrender.com/ (the first load can take about 50 seconds) and sign up with your own email and a password. If sign-up says the email is taken and you never signed up, do not run the script for that email: sign up with another address you own and use that one.
2. In PowerShell in the main folder, one command at a time. First:

       node server/scripts/set-platform-admin.js --target=atlas --email=<your email>

   It stops with `Atlas host confirm required: re-run with --confirm-host=<host>`. Re-run with that host (a dry run, nothing written):

       node server/scripts/set-platform-admin.js --target=atlas --confirm-host=<host> --email=<your email>

   Check the line `PLATFORM_ADMIN: <your user id> false → true (dry run — add --write to apply)`, then apply:

       node server/scripts/set-platform-admin.js --target=atlas --confirm-host=<host> --email=<your email> --write

   It prints `PLATFORM_ADMIN: <your user id> false → true written`.
3. On the live app, sign out and sign in again: the profile menu shows «דאשבורד מערכת».

To take it away, run the same commands with `--off` (dry run, then `--off --write`). Every write adds a row to the user's `platformAdminHistory` (`at`, `on`, `by: 'script'`). The output names the user id only, never the email or the name. A refusal (no user, more than one user, a removed user, a user changed meanwhile) writes nothing and exits 1.

### Logging
- Phones, names and tokens are never written to logs or to the script's output.

### Keeping the server awake (D6)
The free Render tier sleeps after idle time, and a sleeping server misses webhooks and makes the public page slow. An external free uptime monitor keeps it awake; no code is involved.
1. In Render, set `PUBLIC_BASE_URL` on the live service to its public `https://…onrender.com` address and save.
2. In a free uptime service, create an HTTP monitor for `GET <PUBLIC_BASE_URL>/api/v1/health`, interval 10 minutes.
3. Check that it reports "up" (the answer is `{ ok: true, ts }`).

---

## References

- Auth, logging and security rules for agents: [.claude/skills/auth-and-logging/SKILL.md](../.claude/skills/auth-and-logging/SKILL.md)
- Project rules: [.claude/copilot-instructions.md](../.claude/copilot-instructions.md)
