# Session State

## Branch
feat/376-dish-types-cleanup-remap-recipes-decision-gate

## Date
2026-10-10

## Session Summary
- Plan 376: dish types 63→51 on local + Atlas via server/scripts/cleanup-dish-types.js (backup-gated, idempotent); seed lists, dictionary main_dish, stale course shows ללא; list-shell scroll fix (min-block-size: 0 on .table-area)

## Files Modified
 ...sh-types-cleanup-remap-recipes-decision-gate.md |  34 +++
 ...pes-cleanup-remap-recipes-decision-gate.plan.md |  17 +-
 public/assets/data/dictionary.json                 |   1 +
 scripts/migrate-labels-to-courses.mjs              |  22 +-
 server/scripts/cleanup-dish-types.js               | 228 +++++++++++++++++++++
 server/services/seed-master.js                     |  17 +-
 server/test/cleanup-dish-types.test.js             | 142 +++++++++++++
 .../recipe-book-list.component.spec.ts             |   5 +-
 .../recipe-book-list/recipe-book-list.component.ts |   7 +-
 .../utils/recipe-book-list.util.spec.ts            |   6 +
 .../utils/recipe-book-list.util.ts                 |  19 +-
 .../recipe-header/recipe-header.component.spec.ts  |  17 +-
 .../recipe-header/recipe-header.component.ts       |  24 ++-
 .../shared/list-shell/list-shell.component.scss    |   4 +
 14 files changed, 498 insertions(+), 45 deletions(-)

## Commit
1093ffa5

## PR
N/A

## Next Steps
- Free disk space on C: (mongod needs 500 MB) and re-run full server vitest.

## Decisions & evidence (plan 376)
- Reality check: 321 Phase 3 moved dish types to `taxonomyTerms` (kind `course`); `DEFAULT_COURSES` now in `server/services/seed-master.js` (`approved:`). Script remaps docs first, then deletes terms.
- Dandan 2026-10-10: preparation categories, the 4 dessert categories (merged into desserts on dishes only), `stews_cookery` and `soups_stocks_cooking_liquids` stay; removed values cleared (Q4 a). Source of truth: `MAPPING` in `server/scripts/cleanup-dish-types.js` (51 keys).
- Local: backup `foodvibe-db-backups/local-2026-10-10T18-52-19`; write 700 docs, 13 master terms deleted, `main_dish` added; re-run → 0.
- Atlas: backup `foodvibe-db-backups/atlas-2026-10-10T19-36-28`; Dandan ran the write (711 docs, 13 terms, +`main_dish`); re-run → 0.
- `approved: src/app/shared/list-shell/list-shell.component.scss` — list pages did not scroll (`overflow: clip` from d7c69ca0); `min-block-size: 0` on `.table-area`.
- Tests: cleanup-dish-types 8/8, recipe-header specs 15/15, `npm run build` exit 0. Full server vitest blocked by low disk on C: (mongod needs 500 MB) — not code failures. recipe-book-list specs not re-run.
- Out of scope: legacy import mappings would reintroduce the dropped values. Mutation logs in `.claude/reports/dish-types-cleanup/` are not committed (user ids, recipe names).
