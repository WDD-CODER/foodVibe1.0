# Plan 323 — Metadata Registry Single Source of Truth

Status: superseded

> **Superseded 2026-10-05 by Plan 321 Phase 3** (unified `taxonomyTerms` + `TaxonomyStore`). Do not take.

## Problem Statement

`KITCHEN_CATEGORIES`, `KITCHEN_ALLERGENS`, `KITCHEN_COURSES`, and `MENU_TYPES` each have **two independent, disconnected seeding paths**:

1. **Server-side clone-at-signup**: `__master__`'s own doc for the type gets copied into any brand-new user at signup (`clone-master.js`, `CLONEABLE_TYPES` in `server/constants/collections.js`).
2. **Client-side lazy-seed**: in `MetadataRegistryService.initMetadata()`, if the *currently logged-in* user's own doc for the type is empty, the client seeds it directly from a hardcoded array baked into the Angular bundle (`DEFAULT_CATEGORIES`, `DEFAULT_ALLERGENS`, `DEFAULT_COURSES`, `defaultMenuTypes`) — entirely bypassing `__master__`.

Nothing ever reconciles the two. Path 2 only ever updates the *current user's own* doc. `__master__` only grows when an admin explicitly pushes a change to it (Plan 322's "save for everyone", added 2026-09-30) — which didn't exist until today, and even now only fires on actions a user actually takes through the metadata-manager UI, not automatically.

Confirmed via direct DB read (2026-09-30, local dev database) — `__master__` vs the long-lived `dev-guest` test account:

| Registry | `__master__` | `dev-guest` |
| --- | --- | --- |
| KITCHEN_COURSES | 2 (before manual fix) | 63 |
| KITCHEN_CATEGORIES | 6 | 9 |
| KITCHEN_ALLERGENS | 10 | 11 |
| KITCHEN_LABELS | 12 | 14 |
| MENU_TYPES | 3 | 3 (matches) |
| MENU_SECTION_CATEGORIES | 8 | 8 (matches) |

Courses was the extreme case (a 63-item hardcoded default list that had evidently never once been pushed to `__master__`), which is what surfaced this during Plan 322 testing — but categories/allergens/labels drift the same way, just slower, and will keep drifting again even after a one-time manual fix unless the mechanism itself changes.

**Labels has no client-side default-seed fallback at all** (`reloadLabelsFromStorage()` just loads whatever exists, empty if empty) — its drift (12 vs 14) is from real usage (the admin account created 2 more labels than were ever pushed to master), not from a second seeding path. Worth noting because the fix for labels is different (none needed at the seeding level — it's purely a "push to everyone" usage question) from the fix for categories/allergens/courses/menu-types (a real architecture problem).

## Goal

`__master__` becomes the **only** seed source for `KITCHEN_CATEGORIES`, `KITCHEN_ALLERGENS`, `KITCHEN_COURSES`, and `MENU_TYPES`. No hardcoded per-type default list should exist in client code once this ships — a brand-new signup's registries come from `__master__` cloning (already wired, `CLONEABLE_TYPES`), never from a separate client-side fallback that can silently diverge from it.

## Proposed approach (needs confirmation before Milestone 1 execution)

1. **One-time backfill**: for each affected type, `__master__`'s doc gets whatever the current hardcoded `DEFAULT_*` array holds (if `__master__`'s doc is thinner than the hardcoded list) — a script, not a manual DB command this time, since it's now a permanent repo artifact (`scripts/seed-master-registries.mjs`, run once against local and once against Atlas).
2. **Remove the client-side lazy-seed branches** in `MetadataRegistryService.initMetadata()` for categories/allergens/courses/menu-types. If a user's own doc for one of these types is empty, that is now solely a clone-at-signup problem, not something the client papers over at runtime.
3. **`clone-master.js` / signup flow**: confirm what happens for a user who somehow ends up with an empty doc post-signup (should not happen if cloning is correct, but the current lazy-seed silently masked exactly this class of bug — removing it means any future signup/clone defect becomes *visible* instead of silently patched over). Decide: hard error, or fall back to re-running the clone step for just that collection.
4. **Hardcoded `DEFAULT_*` constants**: delete them from `metadata-registry.service.ts` once `__master__` is confirmed authoritative — they become dead code once nothing reads them.

## Explicitly out of scope

- `KITCHEN_LABELS` — no seeding-path bug; already single-source (`__master__` via clone at signup). Its 12-vs-14 drift is a usage gap (admin never pushed those 2 to everyone), not an architecture problem. Plan 322's push-to-master feature already covers correcting this going forward.
- `KITCHEN_UNITS` / `KITCHEN_PREPARATIONS` — confirmed these don't use the `{items: [...]}` shape at all (separate-document-per-item model); not affected by this bug class. Not investigated further here — flag separately if a similar drift is ever suspected for these.
- Retroactively fixing every existing signed-up user's already-diverged registries — this plan fixes the seed source and the mechanism going forward; reconciling existing users' data (if ever needed) is a separate migration decision.

## Milestone 1 — Backfill + remove the client-side fallback

### Atomic Sub-tasks
- [ ] M1.1: `server/scripts/seed-master-registries.mjs` — one-off script, mirrors the shape of `scripts/migrate-labels-to-courses.mjs` (Plan 320): for KITCHEN_CATEGORIES/KITCHEN_ALLERGENS/KITCHEN_COURSES/MENU_TYPES, merge the current hardcoded `DEFAULT_*` list into `__master__`'s doc (union, no duplicates), report before/after counts. Run against local dev DB and Atlas.
- [ ] M1.2: `metadata-registry.service.ts` `initMetadata()` — remove the "if current user's doc is empty, seed from `DEFAULT_CATEGORIES`/`DEFAULT_ALLERGENS`/`DEFAULT_COURSES`" branches and the inline `defaultMenuTypes` fallback. Replace with: if empty, log a warning (this should now only happen if clone-at-signup itself failed) and leave the registry empty rather than silently seeding it client-side.
- [ ] M1.3: Delete the now-dead `DEFAULT_CATEGORIES`, `DEFAULT_ALLERGENS`, `DEFAULT_COURSES` constants and the inline `defaultMenuTypes` array from `metadata-registry.service.ts`.
- [ ] M1.4: Spot-check `clone-master.js` / the signup flow to confirm `CLONEABLE_TYPES` cloning actually runs for these 4 types before M1.2 ships (removing the client-side safety net is only safe once server-side cloning is confirmed reliable).

## Verify
- Brand-new signup (local dev) → Metadata page shows the full category/allergen/course/menu-type lists immediately, sourced entirely from `__master__`, with no client-side fallback firing (confirm via a temporary log line during testing, removed before merge).
- `grep -r "DEFAULT_CATEGORIES\|DEFAULT_ALLERGENS\|DEFAULT_COURSES" src/` returns nothing.
- `ng build` clean.
- Existing accounts (dev-guest, the 3 already-migrated production accounts) unaffected — this plan only changes what happens for *new* signups and removes a fallback that should never fire for an already-populated account.
