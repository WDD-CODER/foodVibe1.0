# Legacy FoodComposer SQL source

`fullDATA_utf8.sql` is the original FoodComposer (MS SQL Server) database export, used
by every script in `server/scripts/legacy-import/` as the source of truth for the
one-time migration into MongoDB (plan 300) and its ongoing verification
(`verify-against-source.js`).

**This is a temporary artifact.** It's committed here now (not left as an
external-machine-only file) because the import is still being actively validated —
new discrepancies between this source and Mongo are still being found and fixed as of
plan 300 Finding 5. Once the migration is fully validated, stable, and no further
legacy-data questions are expected, this file should be deleted from the repo — Mongo
is the permanent source of truth going forward, not this file. Track that removal as
an explicit, deliberate cleanup step (see `plans/300-legacy-foodcomposer-import-repair.plan.md`),
not something to do casually — deleting it disables `verify-against-source.js` and any
future re-audit entirely.
