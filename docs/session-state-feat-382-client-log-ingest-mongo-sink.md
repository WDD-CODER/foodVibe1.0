# Session State

## Branch
feat/382-client-log-ingest-mongo-sink

## Date
2026-10-06

## Session Summary
- Plan 382 done: POST /api/v1/log + Mongo app_logs sink (90-day TTL), LoggingService posts to it, prod http.error logging fixed, dev log server removed; ADR 0016

## Files Modified
 .gitignore                                      |   3 -
 CHANGELOG.md                                    |  13 ++-
 _shared/tech-stack.md                           |   7 ++
 docs/brain/decisions/0016-logging-sink-mongo.md |  26 +++++
 docs/brain/gotchas/backend.md                   |  12 +++
 docs/brain/index.md                             |   1 +
 docs/security-go-live.md                        |  11 +--
 package.json                                    |   1 -
 plans/382-client-log-ingest-mongo-sink.plan.md  |  20 ++--
 scripts/log-server.js                           |  66 -------------
 server/app.js                                   |  14 +++
 server/db.js                                    |   5 +
 server/routes/log.js                            |  73 ++++++++++++++
 server/services/log-sink.js                     |  61 ++++++++++++
 server/test/log-route.test.js                   | 125 ++++++++++++++++++++++++
 shared/schemas/entities/log-event.schema.ts     |  27 +++++
 shared/schemas/index.ts                         |   1 +
 src/app/core/interceptors/auth.interceptor.ts   |   8 +-
 src/app/core/services/logging.service.ts        | 124 ++++++++++++++++++-----
 src/environments/environment.gh-pages.ts        |   1 -
 src/environments/environment.local.ts           |   1 -
 src/environments/environment.prod.ts            |   1 -
 src/environments/environment.remote.ts          |   1 -
 src/environments/environment.ts                 |   1 -
 24 files changed, 485 insertions(+), 118 deletions(-)

## Commit
288c56bf

## PR
N/A

## Next Steps
- Plans 383 (pino + request ids) and 384 (log-query script) are unblocked. Planner: fix take-plan.mjs detached shell spawn that leaves .claude/be.log empty (kit-owned).
