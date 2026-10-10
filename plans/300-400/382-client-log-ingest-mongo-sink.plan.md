# Plan 382 — Client log ingest + Mongo sink (replace dev log server)

Status: done
Snapshot: 05132814b7a74187683bb45d5ef48339ae5fb5a0

Logging series: **A = 382 (this plan)**, B = 383 (pino + request ids), C = 384 (logs in the AI
workflow). 382 runs alone first; 383 and 384 may run in parallel after 382 merges.

Shared decisions (apply to 382/383/384):
- One durable sink: MongoDB collection `app_logs` in the existing DB (local / Atlas), TTL 90 days.
  Sentry-style external tracker is deferred until there are real clients.
- Event naming everywhere (client and server): `domain.action.result`, lowercase, dots.
- `warn` + `error` are persisted; `info` only to stdout (and to Mongo when `LOG_PERSIST_INFO=1`).
- No PII in any log line (`auth-and-logging` skill rules): only `userId` (= `user._id`), never
  email/name/IP.
- The hand-started `scripts/log-server.js` on port 9765 is removed, not revived.

## Problem Statement
Browser-side events from `LoggingService` are posted to a separate dev-only log server
(`scripts/log-server.js`, port 9765) that nothing ever starts, so in dev they are dropped after
the first refused request and in prod (`logServerUrl: ''`) they are never sent at all. A real
user hitting an error tonight leaves zero record. Worse, `auth.interceptor.ts:107` guards with
`!req.url.startsWith(environment.logServerUrl)` — with `''` that is always true, so in prod
`http.error` is never even logged to the console. The log endpoint belongs on the Express
server that already runs everywhere (slot, local, Render), and the sink must survive the
session.

## Goals & Success Criteria
- Primary: every `warn`/`error` emitted by `LoggingService` in any environment is stored in
  Mongo `app_logs` within seconds, attributed to `userId` when logged in.
- Success:
  - [auto] `npm --prefix server test` → all green, including new `server/test/log-route.test.js`
  - [auto] `npx ng build` → 0 errors
  - [auto] `rg -n "logServerUrl|9765|log-server" src scripts package.json docs/security-go-live.md` → 0 matches
  - [auto] `curl -s -o NUL -w "%{http_code}" -X POST http://localhost:3000/api/v1/log -H "Content-Type: application/json" -d "{\"level\":\"error\",\"event\":\"test.manual.failed\",\"message\":\"smoke\",\"timestamp\":\"2026-10-05T10:00:00.000Z\"}"` → `202`
  - [auto] `mongosh "$env:MONGO_LOCAL_URI" --quiet --eval "db.app_logs.countDocuments({event:'test.manual.failed'})"` → `≥ 1`
  - [human] In the slot app, trigger a failing request (e.g. edit a recipe with the backend
    stopped for a second); DevTools Network shows one `POST /api/v1/log` 202, and
    `db.app_logs.find({event:'http.error'}).sort({createdAt:-1}).limit(1)` shows it with the
    logged-in `userId`.

## Execution Mode
- Parallel: no
- Concurrent plans: —
- Isolated DB: no (adds one new collection + indexes, idempotent `createIndex`)

## Read-Write Scope

```scope
server/routes/log.js
server/services/log-sink.js
server/app.js
server/db.js
server/test/log-route.test.js
shared/schemas/entities/log-event.schema.ts
shared/schemas/index.ts
src/app/core/services/logging.service.ts
src/app/core/services/global-error.handler.ts
src/app/core/interceptors/auth.interceptor.ts
src/environments/*.ts
scripts/log-server.js
package.json
.gitignore
CHANGELOG.md
docs/security-go-live.md
docs/brain/gotchas/backend.md
docs/brain/decisions/0016-logging-sink-mongo.md
docs/brain/index.md
_shared/tech-stack.md
```

## Read Scope
Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone. Specifically confirm: `LoggingService.sendToLogServer` still exists;
`environment.ts` still carries `logServerUrl`; no `server/routes/log.js` yet.

## User Stories
- As the developer, I want every error a user hits in production saved with their userId so
  that I can investigate bugs I never saw myself.
- As a Worker agent, I want client and server events in one queryable place so that I don't
  have to ask the Human to reproduce and describe the bug.

## Functional Requirements

### Must Have (P0)
- [x] `POST /api/v1/log` on the Express app, mounted in `server/app.js` next to the other
      `/api/v1/*` routers. Accepts one event (not batches, keep it simple).
- [x] Auth: `optionalToken` (from `server/middleware/auth.js`) — anonymous allowed so
      pre-login errors are captured; `userId = req.user?._id ?? null`.
- [x] Abuse guard: `express-rate-limit` 60 req / minute / IP on this route only; route-local
      `express.json({ limit: '16kb' })`; respond `202` on accept (fire-and-forget semantics),
      `400` on invalid body, `429` over limit. Never `401`.
- [x] Zod schema `LogEventSchema` in `shared/schemas/entities/log-event.schema.ts`, exported
      from `shared/schemas/index.ts`, validated via `server/middleware/validate.js`:
      `level: 'info'|'warn'|'error'`, `event: /^[a-z0-9]+(\.[a-z0-9_-]+)+$/ max 64`,
      `message: string max 500`, `context?: record max 4kb when stringified`,
      `timestamp: ISO datetime`, `requestId?: string max 64`, `url?: string max 300`
      (the client route path, not query string).
- [x] `server/services/log-sink.js` — single `write(entry)` function using
      `mongoose.connection.db.collection('app_logs')`. Stored doc:
      `{ source: 'client'|'server', level, event, message, context, userId, requestId, url,
      clientTs, createdAt: new Date() }`. Persists `warn`/`error` always; `info` only when
      `process.env.LOG_PERSIST_INFO === '1'`. Always echoes one JSON line to stdout
      (`console.log(JSON.stringify({...}))`) so `.claude/be.log` / Render see it too.
      Sink failure must never throw into the request — catch, `console.error('[log/sink]')`.
- [x] Indexes created in `server/db.js` `connectDb()` (idempotent, same pattern as the
      `userId` indexes): `{ createdAt: 1 }` with `expireAfterSeconds: 90*24*3600`;
      `{ level: 1, createdAt: -1 }`; `{ event: 1, createdAt: -1 }`; `{ userId: 1, createdAt: -1 }`.
- [x] Global error handler in `server/app.js` also writes `{ source:'server', level:'error',
      event:'server.unhandled', message: err.message, context:{ stack: dev only } }` to the sink.
      (All other `console.error('[data/…]')` sites stay for Plan 383.)
- [x] `LoggingService`: rename `sendToLogServer` → `sendToServer`; target
      `${environment.apiUrl}/api/v1/log` (empty `apiUrl` = same origin, works in prod);
      keep `fetch` + `keepalive`; attach `Authorization: Bearer <token>` when a token exists
      (see Technical Considerations for the DI-cycle rule); add `url: location.pathname`.
      Replace the permanent `_logServerDown` latch with a 60 s back-off after a network
      failure; a `429` pauses for 60 s too. Client flood guard: max 30 events/minute total,
      beyond that drop and emit one `log.client.dropped` with the dropped count when the
      window resets.
- [x] `auth.interceptor.ts:107`: replace `!req.url.startsWith(environment.logServerUrl)` with
      `!req.url.endsWith('/api/v1/log')`. This fixes the prod bug.
- [x] Remove `logServerUrl` from all five `src/environments/*.ts`; delete
      `scripts/log-server.js`; remove the `log-server` npm script from root `package.json`;
      drop the `# Log files (dev log server)` / `/logs/` block from `.gitignore`.
- [x] Docs: rewrite `docs/security-go-live.md` "Development logging" section (now: nothing to
      start; query with `mongosh` until Plan 384 lands); fix the stale `CHANGELOG.md:14` line
      and add a new entry; append a gotcha to `docs/brain/gotchas/backend.md` marking the
      "Production logs silently vanish when logServerUrl is unset" entry as superseded (never
      delete); write ADR `docs/brain/decisions/0016-logging-sink-mongo.md` (decision: Mongo
      `app_logs` with 90-day TTL as the single sink; external tracker deferred; dev log
      server retired) and register it in `docs/brain/index.md`; add a "Logging" paragraph to
      `_shared/tech-stack.md`.

### Should Have (P1)
- [-] (not built — open follow-up if wanted) `GlobalErrorHandler` additionally listens to `window 'unhandledrejection'` and logs
      `error.unhandled_rejection` (guard against double-logging the same error object).
- [-] (not built — plan 384 can add it) `GET /api/v1/health` response unchanged, but `log-sink.js` exposes `isHealthy()` used
      by nothing yet (Plan 384 preflight will use it) — skip if it adds complexity.

### Nice to Have (P2)
- [-] Batch endpoint (`events: []`) — explicitly not now.

## UI/UX Notes
- No UI. No `dictionary.json` keys.

## Atomic Sub-tasks
- [x] A1: Zod `LogEventSchema` + export; `npm run build:schemas` passes (`shared/schemas/entities/log-event.schema.ts`, `shared/schemas/index.ts`).
- [x] A2: `server/services/log-sink.js` + indexes in `server/db.js`.
- [x] A3: `server/routes/log.js` (optionalToken → rateLimit → json 16kb → validate → sink → 202); mount in `server/app.js`; global error handler writes to sink.
- [x] A4: `server/test/log-route.test.js` (supertest + mongodb-memory-server, same helpers as `generic.test.js`): 202 valid; 400 bad `event` pattern; 400 oversized context; 429 after 60 in a minute; `info` not persisted by default, persisted with `LOG_PERSIST_INFO=1`; `userId` set when Bearer token present, `null` when absent.
- [x] A5: `LoggingService` rewrite (`sendToServer`, token, back-off, flood guard, `url`) (`src/app/core/services/logging.service.ts`).
- [x] A6: Interceptor fix `endsWith('/api/v1/log')` (`src/app/core/interceptors/auth.interceptor.ts`).
- [x] A7: Remove `logServerUrl` ×5 (`src/environments/*.ts`), delete `scripts/log-server.js`, npm script (`package.json`), `.gitignore` block.
- [x] A8: Docs + ADR 0016 + gotcha supersede + CHANGELOG + tech-stack.
- [x] A9: `ng build`, `npm --prefix server test`, the `rg` zero-match check, manual [human] check.

## Technical Considerations
- Dependencies: `express-rate-limit` and `zod` already in `server/package.json`; `mongoose`
  connection via `server/db.js`. No new packages.
- DI-cycle rule for the token: `auth.interceptor.ts` injects `LoggingService`, so
  `LoggingService` must NOT inject `UserService` or `HttpClient`. Read the access token
  through whatever storage primitive `UserService.storeToken()` writes to (inspect it first);
  if that is not reachable without a cycle, add a tiny `TokenStore` (signals, `providedIn:
  'root'`, no deps) that `UserService` writes and `LoggingService` reads. Plain `fetch` stays
  (it bypasses the interceptor on purpose — a failing log call must never trigger refresh/sign-out).
- CSP: `connectSrc 'self'` in `server/app.js` already allows same-origin; slots are
  cross-origin (`4201 → 3001`) but CORS already whitelists via `ALLOWED_ORIGIN` set by
  `take-plan.mjs`. Nothing to change.
- `take-plan.mjs` `generateEnvironmentSlot()` only rewrites `apiUrl`/`authApiUrl`; once
  `logServerUrl` is gone from `environment.local.ts` slots are automatically correct.
- Conventions: `.ts` single quotes, no semicolons; server files keep their current style;
  signals-only on the client; no `any`.
- Model changes: new `LogEvent` type gains optional `requestId`, `url`.
- Hebrew canonical values: n/a.
- Security: route is public-write by design; the rate limit, 16 kb cap, schema allow-list and
  TTL bound the blast radius. Never store IP or user-agent (PII policy). Security surface:
  touches token read path (auth/storage) — rely on pre-commit security grep + CI.

## Out of Scope
- Replacing the 60+ server `console.error('[area/action]')` calls, pino, request ids → Plan 383.
- Query script, slot log retention, command/skill wiring → Plan 384.
- Batching, sampling, external trackers (Sentry etc.), log UI.

## Critical Questions
- Q1 Anonymous (pre-login) client events accepted? **(a) yes, rate-limited — default** / (b) logged-in only.
- Q2 Retention: **(a) 90 days — default** / (b) 30 days / (c) 180 days.
- Q3 Persist `info` to Mongo in dev? **(a) no, stdout only; opt-in via `LOG_PERSIST_INFO=1` — default** / (b) yes always in dev.
