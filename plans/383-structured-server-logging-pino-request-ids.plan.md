# Plan 383 — Structured server logging: pino + request ids (delivers 321 §7e early)

Status: active
Snapshot: 05132814b7a74187683bb45d5ef48339ae5fb5a0

Logging series: A = 382 (client ingest + Mongo sink), **B = 383 (this plan)**, C = 384 (logs in
the AI workflow). Depends on 382 merged. May run in parallel with 384.

Shared decisions (apply to 382/383/384):
- One durable sink: MongoDB collection `app_logs` in the existing DB (local / Atlas), TTL 90 days.
  Sentry-style external tracker is deferred until there are real clients.
- Event naming everywhere (client and server): `domain.action.result`, lowercase, dots.
- `warn` + `error` are persisted; `info` only to stdout (and to Mongo when `LOG_PERSIST_INFO=1`).
- No PII in any log line (`auth-and-logging` skill rules): only `userId` (= `user._id`), never
  email/name/IP.
- The hand-started `scripts/log-server.js` on port 9765 is removed, not revived.

## Problem Statement
Server logging is `morgan` request lines plus ~63 bare `console.error('[data/query]', err)`
sites in `server/routes/*.js` (ai.js 37, generic.js 18, auth.js 8, admin.js 2 by rough count),
with no levels, no structure, no correlation between a client `http.error` and the server
failure that caused it, and `PERF_LOG` as a separate env flag. Plan 321 §7e specifies the fix
(`pino` + `pino-http`, `X-Request-Id` propagated into client `LoggingService` reports, replace
the `console.error` calls, fold `PERF_LOG` into a log level) but sits behind Phase 6. It only
touches server logging — no data model — so it is pulled forward here as its own plan, and
extended to write `warn`/`error` into the `app_logs` sink from Plan 382.

## Goals & Success Criteria
- Primary: every server log line is one JSON object with `level`, `time`, `event`, `requestId`,
  `userId?`; every response carries `X-Request-Id`; client `http.error` entries carry the same
  id; server `warn`/`error` land in `app_logs` with `source: 'server'`.
- Success:
  - [auto] `rg -n "console\.(log|error|warn)" server/app.js server/db.js server/routes server/services server/middleware` → 0 matches (migrations/scripts excluded)
  - [auto] `npm --prefix server run lint` → 0 errors with the new `no-console` rule
  - [auto] `npm --prefix server test` → green incl. `server/test/request-id.test.js`
  - [auto] `curl -s -D - -o NUL http://localhost:3000/api/v1/health | Select-String "X-Request-Id"` → one header line
  - [auto] `curl -s -D - -o NUL -H "X-Request-Id: abc123" http://localhost:3000/api/v1/health | Select-String "abc123"` → echoed
  - [auto] `rg -n "PERF_LOG" server render.yaml` → 0 matches
  - [human] Trigger a 500 (e.g. temporarily break a query) in the slot app; the `http.error`
    doc and the server `data.query.failed` doc in `app_logs` share the same `requestId`.

## Execution Mode
- Parallel: yes (with Plan 384 after Plan 382 merged)
- Concurrent plans: Plan 384 (workflow wiring) — scopes don't overlap; run `scope-check.mjs --overlap`
- Isolated DB: no

## Read-Write Scope

```scope
server/logger.js
server/app.js
server/db.js
server/index.js
server/routes/**
server/services/**
server/middleware/**
server/package.json
server/package-lock.json
server/eslint.config.mjs
server/test/request-id.test.js
server/test/helpers/**
render.yaml
src/app/core/interceptors/auth.interceptor.ts
src/app/core/services/logging.service.ts
docs/agent/standards-backend.md
docs/brain/gotchas/backend.md
docs/brain/patterns/**
_shared/tech-stack.md
plans/321-professional-foundation-refactor.plan.md
CHANGELOG.md
```

## Read Scope
Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Also confirm Plan 382 has
merged: `server/services/log-sink.js` and `server/routes/log.js` exist on `origin/main`.
If not, STOP — this plan depends on the sink.

## User Stories
- As the developer reading Render logs, I want to filter by `level` and `event` and jump from a
  user's reported error to the exact server failure via one id.
- As a Worker agent, I want one grep-able JSON format for server and client events.

## Functional Requirements

### Must Have (P0)
- [ ] `server/logger.js`: `pino` instance; level from `LOG_LEVEL` (default `info` in production,
      `debug` otherwise); `base: { service: 'foodvibe-api' }`; ISO timestamps; redact paths
      `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.email`.
      `LOG_PRETTY=1` enables `pino-pretty` (devDependency) for a human terminal; default is
      one JSON line everywhere (slots, Render) so Plan 384 can parse it.
- [ ] Mongo bridge: a second pino destination (`pino.multistream` or a tiny `Writable`) that
      forwards records with `level >= 40` (warn) to `log-sink.write({ source: 'server', ... })`
      from Plan 382, mapping `event`, `msg → message`, `requestId`, `userId`, `err` (name,
      message, stack — stack only outside production). Must be non-blocking and never throw.
- [ ] `pino-http` replaces `morgan` in `server/app.js`, registered at the same position
      (before `express.static` — keep the existing comment block, update its text).
      `genReqId`: reuse incoming `X-Request-Id` if it matches `/^[A-Za-z0-9_-]{8,64}$/`,
      else `crypto.randomUUID()`; always set `res.setHeader('X-Request-Id', id)`.
      `autoLogging.ignore`: static asset paths (`/assets/`, the `HASHED_ASSET` regex,
      `/favicon`), so request logs stay about `/api/`.
      `customProps`: `{ userId: req.user?._id }` (available after `verifyToken`/`optionalToken`;
      acceptable that the request-complete line has it and the request-start line doesn't).
- [ ] CORS: add `exposedHeaders: ['X-Request-Id']` to `corsOptions` so slot frontends
      (different origin) can read it.
- [ ] Replace every `console.*` in `server/app.js`, `server/db.js`, `server/index.js`,
      `server/routes/**`, `server/services/**`, `server/middleware/**` with `req.log.<level>`
      (inside handlers) or `logger.<level>` (startup/db). Each call gets an `event` in
      `domain.action.result` form derived from the current bracket tag, e.g.
      `[data/query]` → `data.query.failed`, `[auth/refresh] sync error` → `auth.refresh.sync_failed`,
      `${logTag} Gemini API error` → `ai.<route>.gemini_failed`, `[mongo] disconnected` →
      `mongo.connection.disconnected`. Pass the error as `{ err }` (pino serializes it).
      Record the full mapping in `docs/brain/patterns/server-log-events.md`.
- [ ] `PERF_LOG`: the `[data/query] docs= bytes= mongo= serialize=` line becomes
      `req.log.debug({ event: 'data.query.perf', type, docs, bytes, mongoMs, serializeMs })`;
      remove the `PERF_LOG` env read and the `PERF_LOG: "0"` line from `render.yaml`.
- [ ] Global error handler: `req.log.error({ err, event: 'server.unhandled' })` (replaces the
      Plan 382 direct sink write — the pino bridge now covers it).
- [ ] Client: `auth.interceptor.ts` reads `err.headers.get('X-Request-Id')` and adds
      `requestId` to the `http.error` context; `LoggingService` forwards `requestId` to
      `/api/v1/log` (field already in the Plan 382 schema).
- [ ] ESLint: in `server/eslint.config.mjs` add `no-console: 'error'` for
      `app.js, db.js, index.js, routes/**, services/**, middleware/**` only (scripts/,
      migrations/, test/ keep console). Add `npm --prefix server run lint` to the `/ship`
      REGULAR-lane gate only if `ship.md` already runs server lint — otherwise leave `/ship`
      untouched and note it in CHANGELOG (321 §7d owns CI changes).
- [ ] Tests `server/test/request-id.test.js`: header present and UUID-shaped; incoming valid id
      echoed; invalid incoming id replaced; a forced route error produces a log record (use
      pino's test destination / `pino.destination` to an in-memory stream via the test helper)
      containing `requestId` equal to the response header.
- [ ] Docs: `docs/agent/standards-backend.md` gains a "Logging" rule (no `console.*` in
      server runtime code; `req.log` in handlers; `event` mandatory; PII redaction list);
      `_shared/tech-stack.md` logging paragraph updated; `plans/321-…plan.md` checklist line
      `- [ ] P7e Structured logging + request ids` → `- [x] P7e … (delivered by plan 383)`;
      CHANGELOG entry.

### Should Have (P1)
- [ ] `server/index.js` startup/shutdown lines via `logger` with `event: 'server.start.ok'`,
      `server.shutdown.begin`.
- [ ] Slow-request warning: `pino-http` `customLogLevel` → `warn` when `responseTime > 2000ms`
      with `event: 'http.request.slow'`.

### Nice to Have (P2)
- [ ] Sampling of `info` request logs in production (`LOG_SAMPLE_INFO`) — not now.

## UI/UX Notes
- No UI. No `dictionary.json` keys.

## Atomic Sub-tasks
- [ ] B1: add `pino`, `pino-http` (deps) and `pino-pretty` (devDep) in `server/package.json`; `server/logger.js` with redaction + Mongo bridge.
- [ ] B2: `pino-http` in `server/app.js` (replace morgan, `genReqId`, `X-Request-Id`, ignore list, `exposedHeaders`); remove `morgan` dependency.
- [ ] B3: migrate `server/routes/generic.js` (incl. `PERF_LOG` → debug event) and `server/db.js`.
- [ ] B4: migrate `server/routes/auth.js`, `server/routes/admin.js`, `server/middleware/**`, `server/services/**`.
- [ ] B5: migrate `server/routes/ai.js` (largest; keep `logTag` semantics as the `event` prefix).
- [ ] B6: global error handler + `server/index.js`; `render.yaml` cleanup.
- [ ] B7: client — interceptor `requestId` (`auth.interceptor.ts`), `logging.service.ts` pass-through.
- [ ] B8: ESLint `no-console` scoped rule (`server/eslint.config.mjs`); fix anything it catches.
- [ ] B9: `server/test/request-id.test.js` + test helper for capturing pino output (`server/test/helpers/**`).
- [ ] B10: docs/patterns mapping, standards, tech-stack, 321 checklist, CHANGELOG; run all [auto] criteria.

## Technical Considerations
- Dependencies: new `pino`, `pino-http`, `pino-pretty`; removes `morgan`. Depends on Plan 382's
  `server/services/log-sink.js` contract (`write(entry)`).
- Keep the "logger before `express.static`" invariant documented in
  `docs/brain/gotchas/backend.md:99` — update that gotcha's text from morgan to pino-http.
- Growth-frozen files: none are server-side; not affected.
- Model changes: `LogEvent.context.requestId` on the client (already optional in schema).
- Render: stdout JSON lines are what the Render dashboard shows; `LOG_PRETTY` must stay unset
  there.
- Hebrew canonical values: n/a.
- Security surface: redaction of auth headers/cookies/password/email — rely on pre-commit
  security grep + CI.

## Out of Scope
- CI jobs / coverage floors (321 §7d).
- Client-side pino or any client log format change beyond `requestId`.
- Query tooling and workflow wiring (Plan 384).

## Critical Questions
- Q1 Pull §7e ahead of 321 Phases 4–6? **(a) yes — it touches no data model and the Phase-7
  parallel-worktree allowance applies — default** / (b) no, wait for Phase 6 and only do the
  client `requestId` read now.
- Q2 Keep `morgan`-style one-line request logs for humans in dev? **(a) no — JSON always,
  `LOG_PRETTY=1` when you want it readable — default** / (b) yes, pretty by default in dev.
- Q3 Slow-request threshold: **(a) 2000 ms — default** / (b) 1000 ms / (c) skip P1.
