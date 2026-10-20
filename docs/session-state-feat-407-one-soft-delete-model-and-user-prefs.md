# Session state — feat/407-one-soft-delete-model-and-user-prefs

Updated: 2026-10-20

## Step 0 (P6.0) — Reality Check, waiting for the Human's go

Drift: fe266724 (plan 412) ok, 788e4a38 (plan 376) ok — neither touches plan files.

Readers/writers found:
- TRASH_*: client data services for all 7 types (recipe, dish, product, equipment, venue, menu-event + supplier via server); `generic.js` delete-from-master + purgeSupplierEverywhere + clear-all list (~L907); `server/scripts/lib/cleanup-fixers.js`, `cleanup-dish-types.js`; `scripts/qa/code-qa/api-fixtures.mjs` + `api-cases.mjs` + `api-layer.mjs`.
- `_userDeleted`: tombstone for deleted clones of master items so login sync does not re-clone; ~10 filters in `generic.js`, schemas (base + 6 entities), cleanup scripts, `dedupe-master-names.js`.
- `hiddenBy`: no writer anywhere, 0 docs locally — only schema/model + strip code.
- `favoritedBy`: written client-side on the user's own recipe copy (`recipe-row-actions.service.ts`, read in `recipe-book-list.component.ts`). Recipes are per-user copies, so it is effectively a per-user boolean. 6 local docs carry another user's id — copied from a master doc that got a favorite pushed into it, then cloned. Harmless on screen (check is `.includes(uid)`), junk in data.

Local counts (tool: `server/migrations/tools/soft-delete-inventory.js`):
- TRASH_RECIPES 323 (14 master, 7 >30d), DISHES 10 (5 master, 3 >30d), PRODUCTS 12, MENU_EVENTS 4, EQUIPMENT/VENUES/SUPPLIERS 0.
- Tombstones: recipes 16, dishes 5, products 15, menuEvents 1, suppliers 3. favoritedBy: 7 recipes. hiddenBy: 0.
- Atlas counts: pending — auto mode blocks production reads; Human runs the tool.

Proposed model (awaiting go):
1. Delete = set `deletedAt`/`deletedBy` on the doc itself (all 7 types). Clones of master items keep their full doc, so restore works for them too. Login sync treats `deletedAt` as user-wins.
2. Purge job: after 30 days, hard-delete own items; clones of master items shrink to a stub (`_masterId` + `deletedAt`) so sync never re-clones them.
3. delete-from-master / supplier delete-for-everyone: set `deletedAt` on the master doc / each user's clone instead of moving to TRASH_*. Signup clone + sync skip deleted master docs.
4. hiddenBy: remove the field (no data, no writer).
5. Favorites: recommend `favorite: boolean` on the own doc, excluded from push-to-master (instead of a new `userPrefs` collection); junk ids stripped by the migration.

Scope additions needed (approved: lines): the 4 other client data services, recipe-book-list favorite files, master-push.service.ts, sync/clone service on the server, cleanup scripts, code-qa fixtures.
