# Pattern: every server log line is one JSON record with an `event`, logged through pino

## Problem

Server logs were morgan request lines plus ~65 bare `console.error('[data/query]', err)` calls:
no levels, no structure, nothing tying a client `http.error` to the server failure behind it,
and `PERF_LOG` as a separate on/off flag. Finding "what broke for this user" meant grepping
free text across Render logs.

## Solution

1. Inside a route handler: `req.log.<level>({ err, event: 'domain.action.result', ...fields })`.
   `req.log` (pino-http) already carries `requestId`, and `userId` once `verifyToken` /
   `optionalToken` accepted a token (`attachUser` in `server/middleware/auth.js`).
2. Outside a request (startup, db, services): `const { logger } = require('../logger')`.
3. Pass errors as `{ err }` — pino serializes name/message/stack. Never `err.message` into `msg`.
4. `event` is mandatory, lowercase, dot-separated: `domain.action.result`. Multi-word parts use
   `_` (`data.push_to_master.failed`).
5. `warn`+ also lands in Mongo `app_logs` (`source: 'server'`) through the bridge in
   `server/logger.js`. `info`/`debug` go to stdout only.
6. Never `console.*` in `app.js`, `db.js`, `index.js`, `logger.js`, `routes/`, `services/`,
   `middleware/` — `npm --prefix server run lint` fails on it. `scripts/`, `migrations/`,
   `test/` keep console.
7. No PII: `userId` only. Request lines log method/url/status — no headers, no IP.

Event map (old bracket tag → event):

| Old | Event | Level |
|---|---|---|
| morgan request line | `http.request.ok` / `http.request.slow` (>2 s) / `http.request.failed` (5xx) | info / warn / error |
| `[unhandled]` | `server.unhandled` | error |
| `[data/<route>]` | `data.<route>.failed` (`query`, `search`, `count`, `get`, `post`, `put`, `delete`, `delete_bulk`, `replace_all`, `push_to_master`, `delete_from_master`, `registry_rename_master`, `registry_delete_master`, `dictionary_global_get`, `dictionary_global_put`, `purge_ingredient_everywhere`) | error |
| `[data/replaceAll] transaction aborted` | `data.replace_all.tx_aborted` | error |
| `PERF_LOG` `[data/query] docs= bytes=` | `data.query.perf` (`type, docs, bytes, mongoMs, serializeMs`) | debug |
| `[auth/<route>]` | `auth.<signup\|login\|refresh\|guest>.failed` | error |
| `[auth/<route>] sync error` | `auth.<login\|refresh\|guest>.sync_failed` | error |
| `[auth/refresh] sync skipped` | `auth.refresh.sync_skipped` | debug |
| `[admin/users GET\|DELETE]` | `admin.users_list.failed` / `admin.users_delete.failed` | error |
| `${logTag} …` / `[ai/<route>] …` | `ai.<route>.gemini_failed` · `.parse_failed` · `.validation_failed` · `.changes_missing` · `.failed` (error), `.timeout` · `.retry` (warn) | — |
| `[ai/generate-from-url] fetch error` | `ai.generate_from_url.fetch_failed` | warn |
| `[ai/shots] rejected: … injection` | `ai.shots.injection_rejected` | warn |
| `[mongo] …` | `mongo.connection.ok` · `.error` · `.disconnected` · `.reconnected`; `mongo.connection.failed` (fatal, startup) | — |
| `… indexes ensured` | `mongo.index.ensured` | debug |
| `[seed-master] …` | `seed.master.begin` · `.skipped` · `.collection_seeded` · `.taxonomy_seeded` · `.done` (info), `.file_skipped` (warn), `.collection_failed` · `.failed` (error) | — |
| `[sync-master] …` | `sync.master.clones_skipped` · `.stale_clones_removed` | info |
| `[log/sink]` | `log.sink.write_failed` (stderr directly — never through the logger, or it loops) | error |
| listen / signal | `server.start.ok` · `server.shutdown.begin` | info |

## When to use

Any new server log line. Not for one-off scripts in `server/scripts/` or migrations — those
are terminal tools and keep `console`. Client events follow the same naming via `LoggingService`.

See also: [[0016-logging-sink-mongo]], plan 383, `docs/agent/standards-backend.md` §5a.
