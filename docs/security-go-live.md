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

## References

- Auth, logging and security rules for agents: [.claude/skills/auth-and-logging/SKILL.md](../.claude/skills/auth-and-logging/SKILL.md)
- Project rules: [.claude/copilot-instructions.md](../.claude/copilot-instructions.md)
