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
| **Dependencies** | Run `npm audit` and update dependencies for known vulnerabilities before going online. See [techdebt](.assistant/skills/techdebt/SKILL.md). |

---

## Development logging

To write logs to a file in the project during development:

1. In a separate terminal, run: **`npm run log-server`** (starts a small Node server on port 9765).
2. Run **`ng serve`** as usual.
3. Logs appear in the browser console and are appended to **`logs/app.log`** in the project root.

If the log server is not running, the app still logs to the console only; no errors are shown. The log server is for local development only; production builds do not use it.

---

## References

- Auth, logging and security rules for agents: [.assistant/skills/auth-and-logging/SKILL.md](../.assistant/skills/auth-and-logging/SKILL.md)
- Project rules: [.assistant/copilot-instructions.md](../.assistant/copilot-instructions.md)
