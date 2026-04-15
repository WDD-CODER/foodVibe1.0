# Session State — 2026-04-15 (end of day)

> Single source of truth for all project rules, standards, and skill/agent routing.

---

## Current Status

**Branch:** `main` (all work merged)
**Latest main commits:**
- `8d6c68f` — chore(session): end-of-day snapshot — plans, sessions, todo, state
- `40c3432` — fix(http-adapter): appendExisting swallows 409 — item already in target is success (merged via PR #117)
- `dd763de` — fix(server): stop POST from writing master copies + tombstone deletes (merged via PR #117)
- `5961d64` — Merge pull request #116 from WDD-CODER/fix/duplicate-name-validator-combined-search
**Build status:** not verified (server-only changes; frontend adapter fix is minimal)
**Open PRs:** none — all work on main

---

## Session Summary (2026-04-15) — Full Day

### Investigation 1 — Guest cook-view 3 console errors (PR #116, `5961d64`)
- Root cause: `recipeResolver` redirected to `/recipe-builder` on not-found regardless of auth state. Guests hit auth guard → misleading auth modal cascade.
- Fix: `src/app/core/resolvers/recipe.resolver.ts` — auth-aware redirect: guests → `/recipe-book`, logged-in → `/recipe-builder`

### Investigation 2 — Kitchen preparations explosion (32→47 items) + "name already taken" blocker (PR #116, `5961d64`)
- Root cause: `syncMasterToUser` cross-collection blindspot — RECIPE_LIST and DISH_LIST share a name namespace but sync checked per-collection only, causing double-clone of same-name master items.
- Fix: `server/services/sync-master.js` — cross-collection name set + `pendingNames` accumulator + `cleanupNameCollisionClones` cross-collection pass (later superseded in PR #117)

### Plan 268 — Data Architecture Map (reference, no code changes)
- Complete audit of storage modes, Mongoose models, server routes, signup seeding, and frontend services.
- Saved as `plans/268-data-architecture-map.plan.md`.

### Plan 269 — Master Pool Cleanup + Deletion Tombstones (PR #117, `dd763de`)
- `server/routes/generic.js` POST: removed master-copy dual-write + collision branch; `_masterId` now self-referential.
- `server/routes/generic.js` GET list + GET by-id: added `_userDeleted: { $ne: true }` tombstone filter; GET by-id collapsed from 3-layer fallback to single `findOne`.
- `server/routes/generic.js` DELETE: master-cloned items → tombstone; user-originated items → hard delete.
- `server/services/sync-master.js`: `cleanupNameCollisionClones` removed entirely (root cause fixed, cleanup no longer needed).
- `server/routes/auth.js`: `cleanupNameCollisionClones` import + all 3 call sites removed.

### Fix — type-change 409 crash in TRASH_RECIPES (PR #117, `40c3432`)
- `src/app/core/services/http-storage.adapter.ts`: `appendExisting` treats 409 as success (idempotent semantics).

### Also shipped in PR #116
- `feat(recipe-builder)`: type-change confirmation modal with direction-specific messages
- `feat(cook-view)`: stopwatch pause/resume for steps
- `chore(infra)`: `scripts/branch-guard.sh` — auto-creates `feat/session-YYYYMMDD` on main edits

---

## Prior Session Summary (2026-04-14) — Neto Confirm + Dish Reset + Type-Change Modal

Four fixes/features shipped in the recipe-builder neto/dish confirmation flow:
1. `RecipeHeaderComponent` emits `yieldManuallyChanged`; parent resets `netoConfirmed_` on yield change.
2. Sync-badge reset button always shows when yield differs from computed.
3. Dish-type neto confirmation + reset button added.
4. Type-change confirmation modal when form is dirty.
- Commit: `a26e48d`

---

## Next Steps (Priority Order)

1. **Manual smoke tests (MongoDB required):**
   - Sign in → create product → Compass: single doc in userId, nothing in `__master__`
   - Delete master-seeded item → Compass: `_userDeleted: true`, client-invisible
   - Log out and back in → tombstoned item must NOT re-appear
   - Delete user-owned item (not master clone) → Compass: hard deleted
   - Type-change a dish/prep with prior TRASH_RECIPES entry → confirm no 409
2. **TRASH_RECIPES cleanup (optional):** one-time Atlas script to remove stale duplicate `_id` entries from failed prior type-changes
3. **Existing __master__ pollution (optional):** existing pollution stays until users delete it manually, or write a one-off cleanup script
4. **Plan 234 operational tasks** — blocked on Atlas/Compass access + production deploy

---

## Blocked

- Plan 234 operational tasks require manual Atlas/Compass access and production deploy
- Smoke tests for Plan 269 require running server against a real MongoDB instance

---

## References

- PR #116: https://github.com/WDD-CODER/foodVibe1.0/pull/116 (merged `5961d64`)
- PR #117: https://github.com/WDD-CODER/foodVibe1.0/pull/117 (merged `dd763de` + `40c3432`)
- `server/routes/generic.js` — POST, GET `/:type`, GET `/:type/:id`, DELETE — all updated
- `server/services/sync-master.js` — `cleanupNameCollisionClones` removed
- `server/routes/auth.js` — `cleanupNameCollisionClones` removed from import + 3 call sites
- `src/app/core/services/http-storage.adapter.ts` — `appendExisting` 409 handling
- `src/app/core/resolvers/recipe.resolver.ts` — auth-aware not-found redirect
- `plans/268-data-architecture-map.plan.md` — reference architecture map
- `plans/269-master-pool-cleanup.plan.md` — plan with implementation notes
- `.claude/sessions/2026-04-15-master-pool-cleanup/session-handoff.md` — full end-of-day evaluation
