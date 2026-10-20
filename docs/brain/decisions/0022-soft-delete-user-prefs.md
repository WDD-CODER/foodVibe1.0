---
status: accepted
date: 2026-10-20
review-by: 2027-04-20
---

# 0022. One soft-delete model: `deletedAt` on the document; favorites are a flag on the user's own copy

## Context

Plan 407 (carried out of plan 321 Phase 6). FoodVibe had three deletion mechanisms: the client
copied a deleted item into one of seven `TRASH_*` collections and then deleted it; deleting a
user's copy of a shared (`__master__`) item left a `_userDeleted` tombstone so the login sync would
not clone it back; and `hiddenBy[]` / `favoritedBy[]` arrays lived on recipe/dish documents. The
client ran the move-to-trash and restore as several writes (copy, then delete; rewrite the whole
trash collection, then re-append), and restoring a deleted copy of a shared item silently did
nothing (the tombstone held its `_id`, the re-append got a 409 that was treated as success).

Plan 321's Phase 5 (shared master + per-user overrides) was dropped, so every user keeps their own
copy of each item. That makes a per-user `userPrefs` collection unnecessary: a favorite on your own
copy is already yours. `hiddenBy` had no writer and no data.

## Decision

- **Delete = a stamp on the doc.** `DELETE /api/v1/data/:type/:id` sets `deletedAt` / `deletedBy`
  for the seven Trash types (`softDelete: true` in `server/constants/collections.js`). Every read
  and write filters on `LIVE` (`deletedAt` absent) from `server/jobs/purge-deleted.js`.
- **Trash routes, server-side** (INV-3): `GET /:type/trash`, `PUT /:type/:id/restore`,
  `PUT /:type/trash/restore-all`, `DELETE /:type/trash`, `DELETE /:type/:id?permanent=true`.
- **Removing for good** hard-deletes an own item; a user's copy of a shared item shrinks to a stub
  (`_masterId` + `deletedAt` + `purgedAt`, validated by `tombstoneSchema`) so sync never re-clones it.
- **Purge after 30 days, counted from the original `deletedAt`** (Human, 2026-10-20). It runs
  when Trash is opened (caller + `__master__` docs) — no background timer, which a sleeping
  free-tier host would not run reliably.
- **Shared items:** delete-from-master and the admin "delete supplier for everyone" stamp the
  master doc / each user's copy the same way; signup clone and login sync skip deleted master docs
  and never refresh or re-clone a copy the user deleted.
- **Favorites:** `favorite: boolean` on the user's own recipe/dish copy. Push-to-master strips it
  (and the delete stamps), so it never reaches another user. `hiddenBy` / `favoritedBy` are gone
  from the schema.
- **Migration** `server/migrations/0005-soft-delete-unify.js` moves the existing data (trash docs
  back with their original delete time, leftover tombstones to stubs, owner favorites to the flag)
  and drops `TRASH_*` only after each doc is verified in place.

Rejected: a `userPrefs` collection (plan 407's first draft) — extra collection, routes and client
store for state that already lives on a per-user document.

## Consequences

- Trash covers all seven types (equipment, venues, menu events and suppliers had no restore before).
- `TRASH_*` collections and `PUT /:type` for them are gone; `PUT /:type` is VERSION_HISTORY-only.
- The "product used in a recipe" delete check counts live recipes/dishes only, as before.
- Favoriting still sets `_userModified` on the copy (a normal PUT), as `favoritedBy` did.
