# mvp-qa-fixes — validation feedback and merge-to-main report (2026-10-26)

Source: Dandan's answers to the cards in `docs/mvp/qa-fixes-report.md` (section 5), run on the tip `c09bc822` at http://localhost:4200. Card numbers below are the report's numbers.

## 1. Result
Most cards passed. Three things block or need a follow-up, and a list of wanted changes came out of the walk. Decision taken: merge anyway and carry the failures forward as known issues (reply `1`, 2026-10-26).

## 2. Failed
| Card | Plan | What happened | Likely cause |
| --- | --- | --- | --- |
| 41 | 494 | No background glow on `/menu-library` or on the event page. | Not investigated. The card may compare against a page that never had the glow. |
| 47 | 488 / 493 | As staff on an event already in «פוסט-פרודקשן», clicking «פוסט-פרודקשן» shows "only an owner can switch stages". The card cannot be validated. | Staff cannot move stages (by design), so the card's route to the closing dialog may be wrong, or the closing dialog should open without a stage click. Needs a Planner decision. |
| 49 | 488 | Not validated, because it follows 47. | — |

## 3. Unconfirmed
- ⑮ (plan 489): the bin lock during «שמור הכל» was not seen, because the save finished too fast. The save itself worked. Not a fail.
- ⑭, ⑯, ⑰, 38–40, 42, 43, 50–55 and 60: passed after the cards were rewritten.

## 4. New things we want (not plans yet)
1. **Import (489):** on every screen size, each pasted row is its own card with a little space between rows. Today a row can look like one long ingredient.
2. **Date field (483):** add a calendar icon inside the field on desktop. Correction to the earlier note: the date picker does work on desktop; only the icon is missing.
3. **Leave warning (482):** show the "unsaved changes" popup only when the user leaves the page, not when they leave the card or switch dashboard tab. Instead show which cards changed.
4. **Inventory actions column:** hide the empty actions column for users who are not business owners.
5. **Pricing bar (487), card 37:** a negative extra cost must not change the values below it (a negative extra income is not possible).
6. **Event closing dialog (488):** pre-fill the planned amount as the paid amount so the user doesn't type it each time. Show the amount fields only after «הגיע» or «יש חשבונית» is ticked. Drop the "finish without all suppliers?" question. Fast path: arrived, with or without receipt, and edit the price only when it differs.
7. **Staff permissions (487, card 56):** a staff member sees the menu as preview only: no editing or removing of dishes or any value, including the dish detail fields «מקדם המנה» and «מנות לאירוע». Staff may add comments and move the stage, except on events they created themselves (full rights there).
8. **Delete business (486):** reverse the order. First ask for the exact business name, then ask "are you sure, this removes everything". Card 60 changes with it.

## 5. Merge to main
- **Branch chain:** `main` → `mvp` (`b4be2053`) → `mvp-review` (`ae9dc090`) → `mvp-review-fixes` (`5c711358`) → `mvp-qa-fixes` (`c09bc822`). Verified with `git merge-base --is-ancestor`: each of `mvp`, `mvp-review` and `mvp-review-fixes` is contained in the tip. Every remote `feat/4xx` and `fix/4xx` branch of these runs is contained too.
- **Main:** `origin/main` is `c7c7ec64`, and the tip contains it. Main has 0 commits the tip lacks, so the PR is a clean fast-forward (339 commits).
- **Old branches not in the tip (not part of this chain, nothing lost by this PR):** `feat/321-professional-foundation-refactor`, `feat/night-1007-340`, `-341`, `-346`, `-353`, `-365`, `feat/session-20261001-1829`, `feat/session-20261004`, `fix/ci-server-tests-build-schemas`, `fix/touch-list-checkbox-hide-row-outline`. They are old work that was never merged into main. Decide separately whether to delete them.

## 6. Data
- The local database was restored from `local-2026-10-21T07-56-14`, so the QA test owners, cooks and events are gone (4 users, 11 events remain). Migrations 0006, 0007 and 0008 were then run on it, each verified (`[verify] OK`).
- Safety copies, all under `C:\coding projects\Cursor\foodvibe-db-backups\`: `local-2026-10-26T09-14-55` (before the restore, with the QA data) and `local-2026-10-26T09-19-04` (restored, before the migrations).
- One orphaned event (owner id `6f2f09e0-d9d6-4c78-a18b-e1b807202e8c`) exists in the old snapshot and was left untouched by 0006.
- Atlas was never written to by this work.

## 7. Atlas steps for you, after the PR is merged
Run in Git Bash from the repo root. `<host>` is printed by running any migration with `--target=atlas` and no `--confirm-host`. Take a fresh backup before each step and use it as `<snapshot>`:
`node server/scripts/db-backup.js --target=atlas`

1. Confirm 0005: `node server/migrations/0005-soft-delete-unify.js --target=atlas --confirm-host=<host> --verify=yes`
2. **0006** business tenant. The dry run must list every real user once; orphans may only be leftover test users.
   - `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host>`
   - `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host> --write=yes --backup-dir="<snapshot>"`
   - `node server/migrations/0006-business-tenant.js --target=atlas --confirm-host=<host> --verify=yes`
3. **0007** coefficients: same three commands with `0007-coefficients.js`. A second dry run must print 0 for every step.
4. **0008** event stages: same three commands with `0008-event-stages.js`. A second dry run must print `events to give a stage: 0`.
5. Deploy the server (plans 488, 492 and 493 change server code), then re-run the 0006 dry run: it must show only signups made in between. Then the removed-cook-names script from plan 492 (backup first):
   - `node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<host>`
   - `node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<host> --write`
   - `node server/scripts/release-removed-staff-names.js --target=atlas --confirm-host=<host>` (must print `Would release 0 removed staff name(s)`)
6. Do not run `server/scripts/cleanup-dish-types.js` after 0007: it puts colors back and 0007's verify would fail.

Rollback for any step: restore its snapshot (`docs/agent/standards-backend.md` section 7).

## 8. Checks run on the tip (2026-10-26)
- `ng build`: passes (two budget warnings only: initial bundle 564.41 kB vs 560, `cook-view.page.scss` 25.89 kB vs 20).
- Server tests: 63 files, 774 of 774 pass (`vitest run --no-file-parallelism`).
- Client tests: 1591 of 1594 pass in the full run. Three failures: `RowActionsMenuComponent` "⋮ opens the popover in the top layer" (`Expected 4 to be ≥ 8`, a viewport-margin check), `v2 inferred types … parses into the inferred Recipe type`, and one `ProductFormComponent` timeout that passed when run alone (flaky). The first two also fail with `main`'s copy of `row-actions-menu.component.ts` swapped in, and the v2 spec file is untouched by this branch, so they are not caused by these changes. They need a separate look.

## 9. Open before release
- The starting bundle is a little over its 560 kB warning level (560.13–564.41 kB). Only a warning.
- Plans 471 (exports epic) and 473 (per-supplier price) stay parked.
