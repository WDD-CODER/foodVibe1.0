---
status: accepted
date: 2026-11-09
review-by: 2027-05-09
---

# 0028. A read-only MongoDB MCP server, local database only

## Context

Agents inspected the local database with throw-away scripts (write a query file, run it, delete it). The Human approved
a read-only MongoDB MCP server on 2026-10-20, connected only to the local database, never to Atlas (plan 529).

## Decision

- Use `mongodb-mcp-server` pinned at `3.2.2`, started by `scripts/mcp-mongo-local.mjs` (entry `mongodb-local` in `.mcp.json`).
- The launcher reads only its own user-level variable `FOODVIBE_MCP_MONGO_URI`, accepts only a single-host `mongodb://`
  URI on `127.0.0.1`, `localhost` or `[::1]`, and otherwise exits 2 with the reason on stderr.
- The child gets read-only mode, Atlas tools disabled, telemetry off, and every inherited `MDB_MCP_*` variable removed.
- Never Atlas, never a production URI; no value lives in git; the server is not pre-approved in `settings.json`.

Extends ADR 0001 (lean native workflow: one dev tool, no service) and ADR 0002 (file-based memory: the MCP reads data,
it stores no memory).

Rejected: Atlas read-only access (production data); a shared `MONGO_*` variable (could carry the Atlas URI); `@latest`
(unreviewed changes in a tool with database access).

## Consequences

- A version bump is a plan.
- The Human sets `FOODVIBE_MCP_MONGO_URI` once and approves the server once in `/mcp`.

## Review

Check whether the pinned version is still maintained and still honours the four `MDB_MCP_*` names.
