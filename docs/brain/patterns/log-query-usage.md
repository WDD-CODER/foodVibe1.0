# Pattern: ask the recorded logs before reading code

## Problem

A bug report ("X didn't work", a Hebrew note) used to start from code reading, and the human re-described failures the system had already captured in Mongo `app_logs` or in a slot log. `cat .claude/be.log` dumps thousands of lines into context.

## Solution

`node scripts/log-query.mjs` (or `npm run logs -- <flags>`) — one line per entry, context capped at 300 chars, no colors.

1. Overview first: `node scripts/log-query.mjs --since=2h --level=warn --summary` (event, count, last, sample, distinct users).
2. Narrow: `--event=http.error` (exact) or `--event=http.` (prefix), `--userId=<id>`, `--source=client|server`.
3. Follow one failure end to end: `--requestId=<id>` returns the client and the server entries sharing that id.
4. Slot dev-server output instead of Mongo: `--file` (default `.claude/be.log`; rotated runs sit in `.claude/logs/`, pruned after 14 days).
5. Work gate: `--since=plan-start --level=error` must print `no entries`, or every entry is explained. `plan-start` is `.claude/.slot-plan-start`, written by `take-plan`.
6. Production: add `--remote` (Atlas). It asks for `y`, or pass `--yes`. Reads `userId` only, never emails.

## When to use

At the start of `/fix`, `/auto-solve` and `/review-it`, and whenever a note says something broke. Not for performance profiling. Never `cat` a slot log.

See also: [[0016-logging-sink-mongo]]
