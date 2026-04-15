# Session State — 2026-04-15

> Single source of truth for all project rules, standards, and skill/agent routing.

---

## Current Status

**Branch:** `fix/master-pool-cleanup`
**Latest commits:** `dd763de` (fix(server): stop POST from writing master copies + tombstone deletes), `40c3432` (fix(http-adapter): appendExisting swallows 409)
**Build status:** not verified this session (server-only changes in Plan 269; frontend adapter fix in 40c3432)
**Open PRs:** none — `fix/master-pool-cleanup` branch has 2 unpushed commits; needs PR to merge to main

---

## Session Summary (2026-04-15) — Data Architecture Map + Master Pool Cleanup

Two plans executed this session.

### Plan 268 — Data Architecture Map (reference only, no code changes)
A complete audit of storage modes, Mongoose models, server routes, signup seeding, and frontend services. Saved as `plans/268-data-architecture-map.plan.md`. No todo entries — reference artifact only.

### Plan 269 — Master Pool Cleanup + Deletion Tombstones
**Branch:** `fix/master-pool-cleanup`
**Commit:** `dd763de`

Changes shipped:
- `server/routes/generic.js` POST: removed master-copy dual-write + `PRODUCT_LIST` collision branch. Users now create docs scoped only to their `userId`. `_masterId` set to doc's own `_id` (self-referential).
- `server/routes/generic.js` GET `/:type` and `/:type/:id`: added `_userDeleted: { $ne: true }` filter (tombstones invisible to clients). GET `/:type/:id` reduced from 3-layer fallback to single `findOne`.
- `server/routes/generic.js` DELETE: master-cloned items (`_masterId !== _id`) become tombstones (`_userDeleted: true, _userModified: true`). User-originated items are hard-deleted.
- `server/services/sync-master.js`: `cleanupNameCollisionClones` function removed entirely.
- `server/routes/auth.js`: `cleanupNameCollisionClones` import and all 3 call sites removed.

### Additional fix (same session)
- `src/app/core/services/http-storage.adapter.ts`: `appendExisting` now treats 409 as success — idempotent "make sure it's there" behavior.
  **Commit:** `40c3432`

---

## Prior Session Summary (2026-04-14) — Neto Confirm + Dish Reset + Type-Change Modal

Four fixes/features shipped in the recipe-builder neto/dish confirmation flow:
1. `RecipeHeaderComponent` emits `yieldManuallyChanged`; parent resets `netoConfirmed_` on yield change.
2. Sync-badge reset button always shows when yield differs from computed.
3. Dish-type neto confirmation + reset button added.
4. Type-change confirmation modal when form is dirty.
- Commit: `a26e48d`

---

## Uncommitted Changes (This Session)

- `.claude/todo.md` — Plan 269 tasks marked `[x]`
- `.claude/sessions/2026-04-15-data-architecture-map/brief.md` — new session artifact
- `.claude/sessions/2026-04-15-master-pool-cleanup/brief.md` — new session artifact
- `plans/268-data-architecture-map.plan.md` — new plan file
- `plans/269-master-pool-cleanup.plan.md` — new plan file
- `docs/session-state.md` — this update

---

## Next Steps

1. **Create PR** for `fix/master-pool-cleanup` → main (includes `dd763de` + `40c3432`)
2. **Manual smoke tests (server):**
   - Sign in → create a product → confirm single doc in user's `userId` collection, nothing in `__master__`
   - Delete a master-seeded item → confirm tombstone (`_userDeleted: true`) in DB, item invisible in client
   - Log out and back in → confirm tombstoned item does NOT re-appear
   - Delete a user-created item (not master-seeded) → confirm hard delete
3. **Commit session artifacts** (briefs, plans, updated todo.md) after user confirmation
4. Address Plan 234 operational tasks — still requires manual Atlas/Compass access

---

## Blocked

- Plan 234 operational tasks require manual Atlas/Compass access and production deploy
- Smoke tests for Plan 269 require running server against a real MongoDB instance

---

## References

- `server/routes/generic.js` — POST, GET `/:type`, GET `/:type/:id`, DELETE — all updated
- `server/services/sync-master.js` — `cleanupNameCollisionClones` removed
- `server/routes/auth.js` — `cleanupNameCollisionClones` removed from import + 3 call sites
- `src/app/core/services/http-storage.adapter.ts` — `appendExisting` 409 handling
- `plans/268-data-architecture-map.plan.md` — reference architecture map
- `plans/269-master-pool-cleanup.plan.md` — plan with implementation notes
