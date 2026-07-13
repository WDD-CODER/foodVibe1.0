# Pattern: Tombstone soft-delete

## Problem

Destructive delete on kitchen/venue data (recipes, dishes, products, equipment, venues, menu events) is unrecoverable — a solo dev with no team review has no safety net if it happens by mistake.

## Solution

Every major entity type has a parallel `TRASH_*` entity type (`TRASH_RECIPES`, `TRASH_DISHES`, `TRASH_PRODUCTS`, `TRASH_EQUIPMENT`, `TRASH_VENUES`, `TRASH_MENU_EVENTS`). Deleting an item moves it to its trash counterpart instead of removing it outright, so it stays recoverable until explicitly purged.

## When to use

Any new entity type that supports user-initiated delete should get a matching `TRASH_*` type rather than a real `DELETE`. See the full entity registry and new-collection checklist in `docs/agent/standards-backend.md` §1 and §3 — this pattern file doesn't restate that checklist, just the "why."
