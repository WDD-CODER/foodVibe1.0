# Plan 596 — Platform CSV downloads show Hebrew correctly in Excel

Status: draft
Depends-on: 559
Snapshot: dfe7571d555d5809cb8421204bf4ed3a32b1c2f3

## Problem Statement
The Human (2026-11-13, card D2 on orch/batch-5): the platform front desk CSV opens in Excel with broken Hebrew names
("×”×¢×¡×§ ×©×œ qa-bot" instead of "העסק של qa-bot"). The numbers are right.

Cause: the two server-built CSVs in `server/routes/admin.js` (`GET /admin/frontdesk-stats?format=csv`, plan 559, and
`GET /admin/ai-usage?format=csv`) send UTF-8 without a byte order mark (BOM). Excel reads a CSV with no BOM in the PC's
legacy code page. The owner's three exports (plan 557) build their files in the browser with
`src/app/core/utils/csv.util.ts`, which puts the BOM first, and the Human confirmed they open correctly (card D3).

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/admin-frontdesk-stats.test.js` and
  `server/test/ai-usage.test.js`, whose CSV cases now check that the body starts with `﻿` followed by the header row.
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [human] On `/platform`, download "ייצוא קבלה CSV" and open it in Excel by double-clicking it: the business names read in
  Hebrew.

## Execution Mode
Single Worker slot from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/routes/admin.js
server/test/admin-frontdesk-stats.test.js
server/test/ai-usage.test.js
```

## Read Scope
`src/app/core/utils/csv.util.ts` (the BOM and line-ending convention the owner exports use).

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the same data in the same routes; only the file's first bytes and line endings change.

## Reuse Check
- none — one shared send step inside `server/routes/admin.js`, matching the convention of `src/app/core/utils/csv.util.ts`.

## Step 0 — Reality Check
Confirm both `format=csv` branches in `server/routes/admin.js` send `lines.join('\n')` with no BOM.

## User Stories
- As the platform admin, I want the CSV downloads to open in Excel with readable Hebrew.

## Functional Requirements

### Must Have (P0)
1. One helper in `server/routes/admin.js` sends a CSV: `﻿` first, rows joined with `\r\n`, a final `\r\n`,
   `Content-Type: text/csv; charset=utf-8`, and the given file name. Both `format=csv` branches use it.
2. The tests' CSV cases assert the BOM and the header row after it.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none.

## Atomic Sub-tasks
- [ ] A1: Make both platform CSV downloads open in Excel with readable Hebrew — BOM and CRLF in one send helper — server/routes/admin.js
- [ ] A2: Check the downloads start with the marker Excel needs — server/test/admin-frontdesk-stats.test.js, server/test/ai-usage.test.js

## What happens when
- A script reads the CSV with a strict parser → most parsers drop a leading BOM; the owner exports already ship one.

## Technical Considerations
- Security surface: none (admin-only routes, no new data).

## Out of Scope
- The owner's exports (already correct).

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-13: D2 numbers ok, names broken in Excel; merge of batch-5 approved, fix follows as this plan.
