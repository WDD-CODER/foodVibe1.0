# Plan 316 — Roll the legacy-import repairs out to Atlas

> **EXECUTED 2026-09-27.** All steps applied to Atlas and verified: `audit-against-spec.js --target=atlas`
> reports zero findings beyond the expected sodium rejection. Backup taken first
> (`foodvibe-db-backups/atlas-2026-09-27T05-57-33`, 15,639 docs). Kept for the record.
>
> Applied in order: orphan sweep (7,752 docs across 20 dead accounts) → quantities
> (10,732 ingredient amounts, 1,532 yields) → dish prep-items (911 master + 911 clone)
> → recipe yields (2,093 master + 2,093 clone; 960 unit relabels, 1,905 gained a
> selectable unit) → nutrition (33, + 66 stale fields removed) → supplier phones (25)
> → legacy config.
>
> The `_userModified` question below resolved itself: the falafel recipe's owning
> account was one of the 20 orphans, so it was purged rather than repaired.

## Goal

Apply the plan 313/314/315 data repairs to the **live Atlas** database. They have only ever run against local Mongo, so production still carries every bug those plans fixed.

## Why this is not optional

Atlas is in the *original* broken state — in places worse than local was before the repairs. Confirmed 2026-09-27 by direct query:

```
Atlas recipe 1620 (אבוקדו ללא קליפה וגרעין):
  yield_amount_: 0        yield_unit_: 'gram'
  yield_conversions_: [{"amount":1,"unit":"dish"}]
  neto_confirmed_: (absent)
```

Local had already recovered `850 gram`; Atlas has `0`. Every consequence described in plans 314 and 315 is live there right now:

- Dish mise-en-place lists are duplicated ingredient lines rather than the real checklist.
- `yield_conversions_[0]` holds the dish count instead of the primary yield, so **opening any affected preparation and pressing save silently overwrites its real yield** and inflates every parent recipe's cost line that uses it.
- `neto_confirmed_` is unset, so the builder replaces recorded net yields with the gross ingredient sum on open.
- Supplier phone numbers and product nutrition are missing.

## Atlas baseline (measured 2026-09-27)

| | Atlas | Local (already repaired) |
|---|---|---|
| Legacy recipes (`RECIPE_LIST`) | 6,642 | 2,093 incl. dishes |
| Legacy dishes (`DISH_LIST`) | 5,916 | — |
| Accounts with legacy data | 6 | 3 |
| `_userModified` docs | 1 recipe, 0 dishes | 2 |

Atlas accounts: `__master__`, `UMyJP`, `XixXy`, `Xs420`, `lFFgH`, `rjP6v` — a different set from local's `__master__`/`dev-guest`/`yYYGl`. Every script re-derives this list at runtime via `distinct('userId', …)`, so no hardcoded account list needs updating.

## Preconditions — do not skip

1. **Snapshot Atlas first.** This rewrites ~12,500 documents across 6 real accounts and is not reversible in-place. On a paid tier use point-in-time restore; on M0 there is no automatic backup, so take one:
   ```bash
   mongodump --uri="$MONGO_URI" --out=./atlas-backup-$(date +%Y%m%d)
   ```
   Keep it outside the repo (it contains real data).
2. **Confirm nobody is mid-edit.** The per-user passes skip `_userModified: true`, but a save landing *during* the run could still race a bulk write.
3. **Decide the `פלאפל ירוק שלי` question** — see Open decision below.

## Code change required before running

Four of the five scripts are hardcoded to `MONGO_LOCAL_URI` and must accept an Atlas target. Only `backfill-quantities.js` already supports `--write=atlas`.

Give each of these the same `--write=local|atlas` handling `backfill-quantities.js` already has (select `process.env.MONGO_URI` when `atlas`, keep dry-run as the default with no flag):

- `server/scripts/legacy-import/repair-recipe-yields.js`
- `server/scripts/legacy-import/repair-dish-prep-items.js`
- `server/scripts/legacy-import/backfill-product-nutrition.js`
- `server/scripts/legacy-import/backfill-supplier-phones.js`

Do **not** loosen the `_userModified: { $ne: true }` guards while doing it.

## Run order

Order matters: `repair-recipe-yields.js` is authoritative for the yield fields and must run *after* `backfill-quantities.js`, which also touches `yield_amount_`.

Dry-run every script first (no flag = dry run), read the counts, then apply:

```bash
# 1. dry run everything, review output
node server/scripts/legacy-import/backfill-quantities.js       --target=atlas
node server/scripts/legacy-import/repair-dish-prep-items.js    # add --target support if dry-run needs it
node server/scripts/legacy-import/repair-recipe-yields.js
node server/scripts/legacy-import/backfill-product-nutrition.js
node server/scripts/legacy-import/backfill-supplier-phones.js

# 2. apply, in this order
node server/scripts/legacy-import/backfill-quantities.js       --write=atlas
node server/scripts/legacy-import/repair-dish-prep-items.js    --write=atlas
node server/scripts/legacy-import/repair-recipe-yields.js      --write=atlas
node server/scripts/legacy-import/backfill-product-nutrition.js --write=atlas
node server/scripts/legacy-import/backfill-supplier-phones.js  --write=atlas
```

Do **not** re-run the full import, and do **not** run `backfill-dish-prep-items.js` — it is superseded and its premise is wrong.

## Verification

`verify-against-source.js` currently targets local only; point it at Atlas the same way, then run it for `__master__` and each of the 6 accounts.

| Check | Expected after |
|---|---|
| Atlas recipe 1620 | `yield_amount_: 850`, `yield_unit_: 'gram'`, conversions `[{850,gram},{1,dish}]`, `neto_confirmed_: true` |
| `verify-against-source.js`, all 6 accounts | 0 yield and 0 prep mismatches, except skipped `_userModified` docs |
| Duplicate unit inside any `yield_conversions_` | 0 |
| Rows where `yield_conversions_[0]` ≠ primary | 0 |
| Spot-check in the deployed app | a dish shows its real checklist, not duplicated ingredients; a sub-recipe's unit dropdown offers every recorded measure |

Then re-open a known parent recipe and confirm its cost line is unchanged from what it should be — the whole point is that prices stop being wrong, so check one you know the right answer for.

## Open decision

**`פלאפל ירוק שלי`** — account `lFFgH`, legacyRecipeNo 642, 10 ingredients. The only `_userModified: true` legacy doc on Atlas.

Its yield reads `4 dish` with conversions `[{4, dish}]` — the exact broken shape plan 315 fixes, i.e. the dish count sitting in slot 0 where the primary yield belongs. That looks like the inherited import bug rather than a value the owner chose; they likely edited something else in the recipe and saved, which set the flag.

- **Skip it** (what the scripts do today) — never touches a human's edit, but that recipe keeps a broken yield and will price wrong if used as a sub-recipe.
- **Repair it** — patch only `yield_amount_`/`yield_unit_`/`yield_conversions_`/`neto_confirmed_` on this single `_id`, leaving every other field alone.

Decide before running. If repairing, do it as a one-off targeted update after the main run, not by loosening the guard.

## Rollback

There is no in-place undo. If the run goes wrong, restore from the snapshot taken in Preconditions. This is the only reason step 1 is mandatory.

## Also outstanding (unrelated to Atlas)

- **PR #206** — `fix/list-page-persistence`, the pagination-persistence commit orphaned when PR #205 was merged at an older head. Open and green, just needs merging.
