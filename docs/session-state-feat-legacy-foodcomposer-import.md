# Session State

## Branch
feat/legacy-foodcomposer-import

## Date
2026-08-12

## Session Summary
- Plan 300 (legacy FoodComposer→Mongo migration repair) is **complete, verified, and
  committed** — all 5 findings fixed: (1) `sync-master.js` never remapped sub-recipe
  ingredient refs on clone, (2) dishes never got `prep_items_`, (3) a client-side
  load-order race in recipe-builder (fixed via a new `kitchen-data-ensure-loaded`
  resolver), (4) a long-standing 500-doc cap on `GET /api/v1/data/:type` silently
  truncated any account's catalog once it exceeded that (raised to 20000 + added gzip
  compression), (5) the mise-en-place derivation rule itself was too narrow (sub-recipes
  only — fixed to include every ingredient line, per domain clarification).
- Full comprehensive audit (`server/scripts/legacy-import/verify-against-source.js`,
  extended this session to also check suppliers) reports **0 mismatches** against both
  `__master__` and `dev-guest` — confirmed `dev-guest` is the only account with any
  legacy-imported data (no other account silently still broken).
- Legacy SQL source committed to the repo
  (`server/scripts/legacy-import/source-data/fullDATA_utf8.sql` + README) — explicitly
  **temporary**, delete deliberately once the migration is fully validated long-term
  (not yet — flagged, not scheduled).
- Scoped (not implemented) **plan 301** — server-side search — for next session. Root
  cause: the app eagerly loads a user's entire product/recipe/dish catalog into memory
  on every page load and searches it client-side; fine at hundreds of items, real
  latency at 1000s. Milestone 1 (lean `/search` endpoint + refactor the two typeahead
  components) is fully scoped and ready to execute; Milestones 2-4 are placeholders only.
- Two brain gotchas captured this session (`docs/brain/gotchas/backend.md`): a silent
  list-endpoint cap producing symptoms identical to a client load-order race, and an
  audit script built from the same derivation logic as the import being structurally
  unable to catch that logic's own domain-assumption errors.

## Files Modified
```
 .claude/todo-archive/011.md                        |    20 +
 .claude/todo.md                                    |    79 +
 docs/brain/gotchas.md                              |     2 +-
 docs/brain/gotchas/backend.md                      |    20 +
 plans/300-legacy-foodcomposer-import-repair.plan.md|   172 +
 plans/301-server-side-search-lean-data-loading.plan.md | 83 +
 server/index.js                                    |    10 +
 server/package-lock.json                           |    40 +
 server/package.json                                |     1 +
 server/routes/generic.js                           |    12 +-
 server/scripts/legacy-import/backfill-dish-prep-items.js   | 197 +
 server/scripts/legacy-import/backfill-product-nutrition.js | 153 +
 server/scripts/legacy-import/import-foodcomposer.js |    2 +-
 server/scripts/legacy-import/lib/transform.js       |    60 +
 server/scripts/legacy-import/repair-dish-prep-items.js     | 151 +
 server/scripts/legacy-import/repair-subrecipe-refs.js      | 137 +
 server/scripts/legacy-import/source-data/README.md |    16 +
 server/scripts/legacy-import/source-data/fullDATA_utf8.sql | 46423 + (data file)
 server/scripts/legacy-import/verify-against-source.js      | 334 +
 server/services/sync-master.js                     |   131 +-
 src/app/app.routes.ts                               |     7 +-
 src/app/core/resolvers/kitchen-data-ensure-loaded.resolver.ts | 20 +
 src/app/core/services/dish-data.service.ts          |    83 +-
 src/app/core/services/product-data.service.ts       |   138 +-
 src/app/core/services/recipe-data.service.ts        |   111 +-

25 files changed, 48287 insertions(+), 115 deletions(-)
```

Note: several other files were dirty in this branch's working tree throughout the
session (`.claude/settings.json`, `public/assets/data/dictionary.json`, `server/db.js`,
`server/routes/auth.js`, `src/app/core/components/auth-modal/*`,
`src/app/core/services/user.service.ts`) — **none of these were touched by this session's
work**; they predate it (unrelated in-progress changes) and were deliberately left
unstaged/uncommitted here.

## Commit
`46dfb487d07b4dc2389860634a63fd7a6a369435` — fix(legacy-import): repair sub-recipe refs, mise-en-place derivation, and data-cap truncation

## PR
N/A — checkpoint commit, not pushed this session (user approved commit via `/ship`, did not request push)

## Next Steps
1. Push this commit when ready (`git push -u origin feat/legacy-foodcomposer-import`) — not yet done.
2. Start **plan 301** (`plans/301-server-side-search-lean-data-loading.plan.md`),
   Milestone 1 — first sub-task: confirm the exact lean field list
   `ingredient-search.component.html`'s template needs before designing the `/search`
   endpoint's response shape. Also mirrored in `.claude/todo.md`.
3. No other open work on this branch — plan 300 is fully done and archived
   (`.claude/todo-archive/011.md`).
