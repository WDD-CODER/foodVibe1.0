# Session State

## Branch
feat/407-one-soft-delete-model-and-user-prefs

## Date
2026-10-20

## Session Summary
- Plan 407 built, validated by the Human, merged: deletedAt soft delete, server Trash routes, 30-day purge, Trash for 7 types, favorite flag, migration 0005 (rehearsed on slot DB and Atlas copy).

## Files Modified
 docs/agent/standards-backend.md                    |   8 +-
 .../brain/decisions/0022-soft-delete-user-prefs.md |  53 +++++
 docs/brain/glossary.md                             |   4 +-
 docs/brain/index.md                                |   1 +
 docs/brain/patterns/tombstone-soft-delete.md       |  10 +-
 ...eat-407-one-soft-delete-model-and-user-prefs.md |  45 ++++
 ...07-one-soft-delete-model-and-user-prefs.plan.md |  56 +++--
 public/assets/data/dictionary.json                 |   8 +
 scripts/audit-labels.mjs                           |   2 +-
 scripts/qa/code-qa/api-cases.mjs                   |  41 ++--
 scripts/qa/code-qa/api-fixtures.mjs                |  14 +-
 scripts/qa/code-qa/api-layer.mjs                   |  31 +--
 scripts/test/code-qa-api.test.mjs                  |  10 +-
 server/constants/collections.js                    |  25 +--
 server/jobs/purge-deleted.js                       |  71 +++++++
 server/migrations/0005-soft-delete-unify.js        | 234 +++++++++++++++++++++
 server/migrations/tools/_connect.js                |   8 +-
 server/migrations/tools/soft-delete-inventory.js   |  53 +++++
 server/routes/generic.js                           | 210 +++++++++++-------
 server/scripts/cleanup-dish-types.js               |   2 +-
 server/scripts/dedupe-master-names.js              |   4 +-
 server/scripts/lib/cleanup-fixers.js               |  16 +-
 server/services/clone-master.js                    |   4 +-
 server/services/sync-master.js                     |  12 +-
 server/test/cleanup-legacy-data.test.js            |   4 +-
 server/test/generic.test.js                        |  65 ++++--
 .../test/migration-0005-soft-delete-unify.test.js  | 131 ++++++++++++
 server/test/soft-delete.test.js                    | 210 ++++++++++++++++++
 server/test/supplier-delete.test.js                |  23 +-
 shared/schemas/base.schema.ts                      |  12 +-
 shared/schemas/entities/equipment.schema.ts        |   3 +-
 shared/schemas/entities/menu-event.schema.ts       |   3 +-
 shared/schemas/entities/product.schema.ts          |   3 +-
 shared/schemas/entities/recipe.schema.ts           |   9 +-
 shared/schemas/entities/supplier.schema.ts         |   3 +-
 shared/schemas/entities/venue.schema.ts            |   3 +-
 shared/schemas/field-map.v1-to-v2.ts               |   8 +-
 src/app/core/models/recipe.model.ts                |   6 +-
 .../core/services/async-storage.service.spec.ts    |  35 +--
 src/app/core/services/async-storage.service.ts     |  24 ++-
 src/app/core/services/dish-data.service.ts         |  87 +-------
 src/app/core/services/equipment-data.service.ts    |  41 +---
 src/app/core/services/http-storage.adapter.ts      |  85 +++++---
 src/app/core/services/master-push.service.ts       |   4 +-
 src/app/core/services/menu-event-data.service.ts   |   5 +-
 src/app/core/services/product-data.service.spec.ts |   3 +-
 src/app/core/services/product-data.service.ts      | 107 +---------
 src/app/core/services/recipe-data.service.ts       |  91 +-------
 src/app/core/services/trash.service.spec.ts        |  92 ++++++++
 src/app/core/services/trash.service.ts             | 176 ++++++++--------
 src/app/core/services/venue-data.service.ts        |  37 +---
 .../recipe-book-list/recipe-book-list.component.ts |   7 +-
 .../services/recipe-row-actions.service.ts         |   7 +-
 src/app/pages/trash/trash.page.html                | 125 ++---------
 src/app/pages/trash/trash.page.ts                  |  91 ++------
 55 files changed, 1474 insertions(+), 948 deletions(-)

## Commit
38d83993

## PR
N/A

## Next Steps
- Run 0005 on Atlas right after deploy (--write=yes --backup-dir=atlas-2026-10-20T15-32-31), then --verify=yes; run 0005 on shared local foodvibe; mark P6.3 + the [auto] Atlas verify item.
