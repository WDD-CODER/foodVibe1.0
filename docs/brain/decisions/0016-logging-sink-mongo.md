---
status: accepted
date: 2026-10-06
review-by: 2027-04-06
---

# 0016. Mongo `app_logs` (90-day TTL) is the single log sink; the dev log server is retired

## Context

Browser events from `LoggingService` went to `scripts/log-server.js` (port 9765), a dev-only process nothing ever started. In dev the events were dropped after the first refused request; in prod `logServerUrl` was `''`, so nothing was ever sent — and `auth.interceptor.ts` compared every URL against that empty string, so prod did not even log `http.error` to the console. A real user's error left no record. Alternatives considered: an external tracker (Sentry-style) — rejected for now, no real clients yet and another account/secret to run; log files on the Render disk — rejected, the disk is ephemeral and not queryable; keeping the separate log server — rejected, it never runs where users are.

## Decision

All persisted logs go to one MongoDB collection, `app_logs`, in the app's existing database (local in dev, Atlas in prod), written by `server/services/log-sink.js`. The browser posts one event per request to `POST /api/v1/log` on the same Express server (Plan 382). `warn` and `error` are always stored; `info` only with `LOG_PERSIST_INFO=1`. Every entry is also echoed as one JSON line to stdout. A TTL index deletes entries after 90 days. Entries carry `userId` only — never email, name, IP or user-agent. Event names follow `domain.action.result` (dots, camelCase segments allowed).

## Consequences

- Easier: one place to ask "what failed, when, for whom" — from `mongosh` now, from `scripts/log-query.mjs` after Plan 384. Works in every environment without extra processes.
- Harder: the log route is public-write by design. Bounded by a 60/min per-IP limit, a 16 kb body cap, a strict Zod schema (`shared/schemas/entities/log-event.schema.ts`) and the TTL; the client adds a 30/min flood guard and a 60 s back-off.
- Accepted: logs share the app database's storage quota (Atlas free tier); log volume is a small fraction of it at warn/error only.
- Re-evaluate early if `app_logs` grows past ~50 MB, or once there are paying clients (then add an external tracker beside, not instead of, this sink).

## Review

Check `db.app_logs.stats()` size against the Atlas quota, whether anyone still hand-reads logs instead of querying them, and whether real clients now justify an external tracker.
