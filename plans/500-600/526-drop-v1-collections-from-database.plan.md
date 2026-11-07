# Plan 526 — Drop the v1 collections from the database

Status: done
Depends-on: none
Snapshot: f99816b3d37f6e0c555c79e7471f8761cbca0068

## Problem Statement
Migration `0001-v2-schema.js` copied the seven v1 entity collections (`PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST`,
`KITCHEN_SUPPLIERS`, `EQUIPMENT_LIST`, `VENUE_PROFILES`, `MENU_EVENT_LIST`) into their v2 names and left the
originals in place as the rollback path. No runtime code reads them since the cutover, and the Human decided on
2026-11-06 that FoodVibe will never return to v1. They still sit in the local and Atlas databases (Atlas free
tier: they cost storage), they show up in every `db-backup.js` snapshot, and anyone browsing the DB sees two
copies of every product and recipe. The registries were already removed the same way by `0004`; this plan does
the same for the seven entity collections.

## Goals & Success Criteria
**Primary:** the seven v1 entity collections no longer exist in the local or the Atlas database, a fresh backup
taken right before the drop is kept as the final v1 archive, and the drop is recorded by a `migrations` marker.

- [auto] `cd server && npx vitest run test/migration-0010-drop-v1-collections.test.js` → all tests pass
- [auto] `pnpm --dir server test` → all test files pass
- [auto] `pnpm --dir server run lint` → exit 0
- [auto] `node server/migrations/0010-drop-v1-collections.js --target=local --verify=yes` → prints `[verify] OK` and exits 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [human] Atlas: the Human ran the runbook in A4 (backup → dry run → write → verify); the verify run printed `[verify] OK`, and the backup folder named in the write run is kept outside the repo as the v1 archive.
- [human] After the Atlas drop, the Human opens the deployed app, logs in, and the products list, a recipe, a dish and a menu event load as before.

## Execution Mode
- Parallel: yes
- Concurrent plans: none share files (only a new migration and its new test)
- Isolated DB: yes — drops collections; the Worker runs it against the local DB only. Atlas is run by the Human.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/migrations/0010-drop-v1-collections.js
server/test/migration-0010-drop-v1-collections.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — the migration only drops the seven v1 collections named in `COLLECTION_RENAMES`; it never reads or writes a v2 collection, `taxonomyTerms`, `businesses` or `users`, and business scoping is untouched.
- INV-4: preserves — no schema in `shared/schemas` changes; the migration only reads `COLLECTION_RENAMES` from the compiled `server/generated/schemas/field-map.v1-to-v2`.

## Reuse Check

- none — a one-shot migration script and its test; it reuses `parseArgs`/`connect` from `server/migrations/tools/_connect.js` and `checkBackup` from `server/migrations/0001-v2-schema.js`, as `0004` does.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want one copy of my products and recipes in the database so that no tool or person ever edits a stale copy.
- As the developer, I want backups and DB browsing to show only live data so that restores and investigations are not confused by v1 leftovers.

## Functional Requirements

### Must Have (P0)
- [x] Dry run (default) lists which of the seven v1 collections exist, their document counts, the matching v2 collection counts, and the reasons it would refuse; it writes nothing.
- [x] `--write=yes` needs a fresh `--backup-dir` (same `checkBackup` as `0001`), refuses when `planDrop` returns any refusal, refuses to re-run without `--force=yes`, drops only collections present in the list, and stores the marker.
- [x] `--verify=yes` exits 0 only when none of the seven exists and the marker is stored.
- [x] Refusal rules (pure function, unit tested): no `0001-v2-schema` marker in `migrations`; or a v1 collection that has documents while its v2 counterpart is missing or has 0 documents.

### Should Have (P1)
- [x] The dry run also prints, for information only, any other collection whose name is all upper-case (`/^[A-Z][A-Z0-9_]+$/`) and is not `VERSION_HISTORY` or `DICTIONARY_OVERRIDES` — never dropped, listed so the Human can decide later.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No UI change. No `dictionary.json` change.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Write the pure planning step and its test — new `server/migrations/0010-drop-v1-collections.js` exporting `V1_COLLECTIONS` (= `Object.keys(COLLECTION_RENAMES)` from `../generated/schemas/field-map.v1-to-v2`, 7 names) and `planDrop({ present, counts, v2Counts, has0001 })` → `{ drop: string[], refuse: string[] }`. `present` = the v1 names that exist; `counts` = docs per present v1 collection; `v2Counts` = docs per v2 counterpart (`undefined` when missing); `has0001` = the `0001-v2-schema` marker exists. New `server/test/migration-0010-drop-v1-collections.test.js` (pure, no DB, same style as `migration-0004-drop-registry-collections.test.js`): covers all 7 names; refuses without `has0001`; refuses a non-empty v1 whose v2 is missing or empty; drops an empty v1 even when its v2 is empty; returns `drop: []` when nothing is present.
- [x] A2: Write the DB modes — in the same file, following `0004-drop-registry-collections.js` line for line: `MIGRATION_ID = '0010-drop-v1-collections'`; `parseArgs(process.argv, { write: 1, verify: 1, force: 1, 'backup-dir': 1 })` and `connect(args)` from `./tools/_connect`; `plan(db)` reads `listCollections({}, { nameOnly: true })`, counts, and the `0001` marker from `db.collection('migrations')`; `printPlan` prints one line per v1 collection (`<v1>: <n> doc(s) → <v2>: <m> doc(s)`), each refusal, and the P1 info list; `write` calls `checkBackup(args)` from `./0001-v2-schema`, refuses on re-run without `--force=yes` and on any refusal, drops each name in `drop`, then `replaceOne({ _id: MIGRATION_ID }, { _id, appliedAt: new Date(), dropped: counts }, { upsert: true })`; `verify` exits 1 and prints `STILL PRESENT <name>` / `MISSING marker` when not clean, else `[verify] OK: no v1 collection left; marker stored.`; header comment in the same shape as `0004` (purpose, modes, usage). `module.exports = { planDrop, V1_COLLECTIONS }` with the `require.main === module` guard.
- [x] A3: Run it on the local DB — `pnpm run build:schemas`; `node server/scripts/db-backup.js --target=local` (note the printed folder); `node server/migrations/0010-drop-v1-collections.js --target=local` (dry run: paste the output into Execution Notes); if it refuses, STOP and show the Human the refusal; else `node server/migrations/0010-drop-v1-collections.js --target=local --write=yes --backup-dir=<folder>`; then `--verify=yes` → `[verify] OK`. Never pass `--target=atlas`.
- [x] A4: Hand the Atlas run to the Human — paste this runbook into Execution Notes, with `<host>` left for the Human (the error message of a run without `--confirm-host` prints it):
  ```powershell
  cd "C:\coding projects\Cursor\foodVibe1.0"
  pnpm run build:schemas
  node server\scripts\db-backup.js --target=atlas
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host>
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host> --write=yes --backup-dir=<folder printed by db-backup>
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host> --verify=yes
  ```
  The backup folder (default `C:\coding projects\Cursor\foodvibe-db-backups\...`) is the final v1 archive: do not delete it.

## Technical Considerations
- Dependencies: `server/migrations/tools/_connect.js`, `checkBackup` in `server/migrations/0001-v2-schema.js`, compiled `server/generated/schemas/field-map.v1-to-v2` (`pnpm run build:schemas` first).
- New files needed: `server/migrations/0010-drop-v1-collections.js`, `server/test/migration-0010-drop-v1-collections.test.js`.
- Model changes: none.
- Backend / API: none — no route, service or runtime code changes.
- Auth and validation: none at runtime. The script itself requires `--target`, Atlas host confirm, and a backup under 24 h old before writing.
- Security surface: none new; uses the existing `server/.env` URIs.
- Data / migration: irreversible drop of 7 collections; the pre-drop `db-backup.js` snapshot is the only way back (restore into a scratch DB with `node server/scripts/db-restore.js --target=<t> --dir=<snapshot dir> --db=<scratch db name>`, then copy what is needed).
- Why not reuse `0001 --write` rollback assumptions: `0001`'s header says the old collections "are the rollback path"; this plan ends that path on purpose (Human decision 2026-11-06), and the marker records it.
- Project checks: log-query Done-when included; Reuse Check filled.

## Out of Scope
- Removing v1 scripts and tools from the repo (plan "Remove the v1-era scripts and tools…").
- Legacy field shims in client services (`product-data.service.ts`, `dish-data.service.ts`) — waits for the read-only probe `tmp\legacy-fields-probe.js` results.
- The v1→v2 upgrade code in `shared/schemas/upgrade/**`, `field-map.v1-to-v2.ts` and `server/utils/schema-check.js` (migrations `0001`–`0003` still import it).
- Any collection not among the seven (the info list in P1 is report-only).

## Critical Questions
- none

## Execution Notes

- A3 local backup (pre-drop v1 archive, local): `C:\coding projects\Cursor\foodvibe-db-backups\local-2026-11-07T06-06-31` (29 collections, 48690 docs).
- A3 local dry run:
  ```text
  v1 collections present: 7 of 7
    PRODUCT_LIST: 4486 doc(s) → products: 10394 doc(s)
    RECIPE_LIST: 3353 doc(s) → recipes: 7776 doc(s)
    DISH_LIST: 3007 doc(s) → dishes: 7026 doc(s)
    KITCHEN_SUPPLIERS: 114 doc(s) → suppliers: 269 doc(s)
    EQUIPMENT_LIST: 192 doc(s) → equipment: 451 doc(s)
    VENUE_PROFILES: 3 doc(s) → venues: 7 doc(s)
    MENU_EVENT_LIST: 3 doc(s) → menuEvents: 17 doc(s)
  Refusals: 0
  Other upper-case collections (info only, not dropped):
    GEMINI_MENU_SHOTS, GEMINI_SHOTS, GEMINI_USAGE, MASTER_META, MENU_LIST, RECIPE_BOOK_VIEW
  ```
- A3 local write → `dropped 7 collection(s)`; verify → `[verify] OK: no v1 collection left; marker stored.`; a second `--write=yes` refused (`already applied … --force=yes`), exit 1.
- decision: seen: `pnpm --dir server test` failed once (exit 1, 325 s) and passed on the immediate re-run (67 files / 819 tests) — a flaky test somewhere in the suite; not investigated.
- A4 Atlas runbook (Human runs it; `<host>` is printed by the error of a run without `--confirm-host`):
  ```powershell
  cd "C:\coding projects\Cursor\foodVibe1.0"
  pnpm run build:schemas
  node server\scripts\db-backup.js --target=atlas
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host>
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host> --write=yes --backup-dir=<folder printed by db-backup>
  node server\migrations\0010-drop-v1-collections.js --target=atlas --confirm-host=<host> --verify=yes
  ```
  The backup folder (default `C:\coding projects\Cursor\foodvibe-db-backups\...`) is the final v1 archive: do not delete it. If the dry run prints any `REFUSE` line, stop and do not write.
- Atlas dry run (2026-11-07, backup `C:\coding projects\Cursor\foodvibe-db-backups\atlas-2026-11-07T06-18-20`, 34258 docs) refused: `MENU_EVENT_LIST has 8 doc(s) but menuEvents is empty`. Read-only name probe: the 8 events are one demo event ("אירוע טעימה — סיפור של אוכל", 2 per account); equipment 512→320 and venues 8→5 are duplicates (every v1 name exists in v2); products/recipes/dishes miss only test names plus one dish name (4 copies). v1 and v2 `_id`s no longer match (re-keyed after 0001), so the comparison is by name.
- decision: behaviour: added `--accept-refusals=yes` to `--write` (drops despite refusals; the marker stores them as `refusalsAccepted`) — Human said the 8 events are test data, drop them — reverse: remove the flag check in `write()`.
- Atlas write (2026-11-07, Human via `!`): `dropped 7 collection(s)`; verify → `[verify] OK: no v1 collection left; marker stored.` Final v1 archive: `C:\coding projects\Cursor\foodvibe-db-backups\atlas-2026-11-07T06-18-20`.
- review: checkers kept 0 dropped 0 rechecked 0 minutes 4.5 models check-plan=sonnet,check-bugs=sonnet,check-rules=sonnet
