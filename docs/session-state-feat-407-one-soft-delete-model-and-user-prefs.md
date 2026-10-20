# Session state — feat/407-one-soft-delete-model-and-user-prefs

Updated: 2026-10-20

## Where it stands

- Built and committed on the branch (not pushed): server soft-delete + Trash routes + purge, client
  Trash page for all 7 types, favorite flag, migration 0005, ADR 0022. Sub-tasks P6.0–P6.2, P6.4 `[x]`.
- Open: P6.3 (Atlas rehearsal on a restored copy → Human go → Atlas write, right after deploy) and
  P6.5 (Human validation cards).
- Slot DB `foodvibe_wt3` = copy of local `foodvibe` (snapshot
  `../foodvibe-db-backups/wt-seed-foodvibe_wt3-407-1792505949`), migrated with 0005 (verify OK,
  second run no-op). Shared local `foodvibe` is NOT migrated — run 0005 on it after merge.

## Evidence

- `npm --prefix server test`: 26 files, 274 passed. `npm run test:scripts`: 93 pass.
- `ng build`: OK. `ng test`: 595/596 — the one failure (`RowActionsMenuComponent … row-tall`)
  fails on `main` too (checked in the Planner folder), unrelated.
- Local dry run: TRASH_RECIPES 323 (17 insert · 7 replace · 299 stale · 0 conflict), DISHES 10,
  PRODUCTS 12, MENU_EVENTS 4; tombstones → stubs 25; favorites 7 docs → 1 owner favorite.
  The 299 stale = one user's recipes trashed 2026-10-05 whose live copies still exist (restore
  had failed silently); they are dropped as duplicates.

## Decisions (Human 2026-10-20)

`go: all recommended, 30 days from original delete date, approve the extra files`.
Favorites: `favorite: boolean` instead of a `userPrefs` collection; `hiddenBy` dropped.

## Findings for the kit / Planner

- `scripts/slot-serve.mjs` reads `process.env.MONGO_LOCAL_URI` without loading `server/.env`, so
  "Isolated DB: yes" never switches the backend DB. Worked around by starting it with the env
  pre-set. The plan's `Isolated DB:` line also has to start the line (a `- ` bullet is ignored).
- Auto mode blocks Atlas reads and edits under `~/.claude/hooks` — the Human runs those.

## Production rollout order (P6.3)

1. Human: `node server/scripts/db-backup.js --target=atlas` (snapshot under `../foodvibe-db-backups/`).
2. Restore it to a local scratch DB and rehearse:
   `node server/scripts/db-restore.js --target=local --dir=<snapshot> --db=foodvibe_atlas_407`
   `node server/migrations/0005-soft-delete-unify.js --target=local --db=foodvibe_atlas_407 --write=yes`
   `node server/migrations/0005-soft-delete-unify.js --target=local --db=foodvibe_atlas_407 --verify=yes`
3. Merge → deploy → immediately: `0005 --target=atlas --confirm-host=<host> --write=yes --backup-dir=<step 1 snapshot>`, then `--verify=yes`.
   Between deploy and step 3 old trash items are hidden and old tombstones show as blank rows.
