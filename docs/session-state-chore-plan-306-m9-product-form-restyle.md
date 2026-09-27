# Session State

## Branch
chore/plan-306-m9-product-form-restyle

## Date
2026-09-27

## Session Summary
- Completed the legacy FoodComposer→Mongo migration on **both** local and Atlas. `audit-against-spec.js` reports clean on both; the only remaining entry is one deliberately-rejected sodium value.
- Wrote `plans/317` — the field-by-field spec that had been missing. Every prior bug came from an assumption inside `transform.js` with nothing external to check it against; the new audit derives expectations from the spec and never calls `buildImport()`.
- Found and fixed the reason **no legacy recipe could be saved at all**: `PUT` requires `nameSnapshot` on linked ingredients and the importer never wrote one. 1,082 recipes returned HTTP 400 on any edit. Backfilled 26,962 lines local / 27,214 Atlas.
- Extended the save-scope prompt from 1 path to 9, behind a single `MasterPushService`, and fixed the dirty-check that ignored every signal the save path writes.

## Files Modified
3 commits: `10524cd7` spec + audit tooling · `d0f560f3` importer fixes · `ef55a498` save-scope feature.
20 files (11 modified, 9 new) across `plans/`, `server/scripts/`, `server/routes/`, `src/app/`, `docs/brain/`.

## Commit
ef55a498

## PR
see Next Steps

## Next Steps
- **PR #206** (`fix/list-page-persistence`) is still open and green — the pagination commit orphaned when PR #205 merged at an older head.
- Atlas repairs are applied; backups at `foodvibe-db-backups/{local,atlas}-2026-09-27T05-57-*`.
- Known source-side ceiling, not defects: 48 ingredient lines reference nothing, 454 products (36%) have no price, 69 sub-recipe lines recorded only one measure.
- `push-to-master` is open to any signed-in user by explicit decision; the admin guard is one commented line in `server/routes/generic.js`.
