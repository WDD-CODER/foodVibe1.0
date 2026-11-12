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

The sweep runs on a read of `requests` or `bookings` for the caller's own business, at most once per business per 24 hours. An open request is never cleared.

### Erase a customer by phone
Dry run first (counts only, nothing written):

    node server/scripts/erase-client.js --target=local --business=<businessId> --phone=<number>

Apply locally (`--db=<scratch>` for a copy), then on Atlas after a backup:

    node server/scripts/erase-client.js --target=local --business=<businessId> --phone=<number> --write
    node server/scripts/db-backup.js --target=atlas
    node server/scripts/erase-client.js --target=atlas --confirm-host=<host> --business=<businessId> --phone=<number>
    node server/scripts/erase-client.js --target=atlas --confirm-host=<host> --business=<businessId> --phone=<number> --write

It deletes the person's clients (live, in Trash and merged), requests, bookings, conversations and messages, and removes `clientId`, `clientName` and `clientPhone` from their events (the event, its money and history stay). The phone `052-123 4567`, `+972 52 123 4567` and `972521234567` are the same person. Free-text event notes may still name the person: check them by hand.

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
