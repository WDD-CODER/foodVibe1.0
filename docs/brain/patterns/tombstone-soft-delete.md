<!-- Rewritten for plan 407 / ADR 0022 (2026-10-20): the TRASH_* collections are gone. -->
# Pattern: Soft-delete with `deletedAt`

## Problem

Destructive delete on kitchen/venue data (recipes, dishes, products, equipment, venues, menu events, suppliers) is unrecoverable — a solo dev with no team review has no safety net if it happens by mistake.

## Solution

Deleting stamps `deletedAt` / `deletedBy` on the document itself; it stays in its own collection and shows in Trash until it is restored (stamp removed) or removed for good (dispose, empty Trash, or the 30-day purge). A user's copy of a shared item is never hard-deleted — it shrinks to a stub (`_masterId` + `purgedAt`) so the login sync does not clone it back. See [[0022-soft-delete-user-prefs]].

## When to use

Any new entity type that supports user-initiated delete: set `softDelete: true` on its entry in `server/constants/collections.js` and add it to `TRASH_SECTIONS` in `src/app/core/services/trash.service.ts`. Every server read/write of that collection filters on `LIVE` from `server/jobs/purge-deleted.js`. Not for ephemeral UI-only state (modals, draft form fields).
