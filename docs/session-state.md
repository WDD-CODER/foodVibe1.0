# Session State — 2026-04-13

> Single source of continuity. Read this at session start, update it at session end.

---

## Current Status

**Branch:** `main`
**Latest commit:** `250552b` (Merge PR #109 — context-management session-handoff)
**Build status:** passing (last verified this session)
**Open PRs:** none

---

## Session Summary

Fixed the `pendingChangesGuard` (canDeactivate) bug on the recipe-builder:

1. **`recipe-form.service.ts`** — Added `{ emitEvent: false }` to `form.patchValue()` in `patchFormFromRecipe` to prevent `recipe_type.valueChanges` from firing during form initialization, which was triggering stale `name_hebrew.updateValueAndValidity()` calls in component-reuse scenarios.

2. **`recipe-builder.page.ts`** — Rewrote `saveAndWait()` as async:
   - Neto yield confirmation gate added (matches `saveRecipe()` parity)
   - Stale `duplicateName` error: re-triggers fresh validation before saving
   - Waits for PENDING async validators to settle via `statusChanges.pipe(filter, take(1))`
   - Removed debug `console.log` statements from `hasRealChanges()`

3. **`recipe-header.component.ts`** — Added `yieldManuallyChanged` output + wrapper methods `onPrimaryAmountChange` / `onPrimaryUnitChange` so parent can reset `netoConfirmed` signal when yield changes.

4. **Server-side name collision fix** (root cause of "name already taken" on Save & Leave):
   - `sync-master.js`: Added `cleanupNameCollisionClones()` function — detects and removes duplicate user clones where `name_hebrew` collides with an existing user recipe
   - `sync-master.js`: Added `userNameSet` guard in `syncMasterToUser()` — skips cloning master items whose name already exists in user namespace (Rule 1)
   - `auth.js`: Calls `cleanupNameCollisionClones(userId)` before `syncMasterToUser()` on login, refresh, and guest login
   - `generic.js`: Added `_masterId` fallback lookup — if a doc isn't found by `_id` in user namespace, tries `{ _masterId: requestedId, userId }` to handle post-login returnUrl race

5. **`recipe-data.service.ts` + `dish-data.service.ts`**: Rethrow `404` errors (alongside existing `401` rethrow) so callers can handle "not found" explicitly.

---

## Uncommitted Changes

All 10 modified files are uncommitted. Ready to stage and commit:
- `src/app/pages/recipe-builder/recipe-builder.page.ts`
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts`
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html`
- `src/app/pages/recipe-builder/recipe-builder.page.html`
- `src/app/core/services/recipe-data.service.ts`
- `src/app/core/services/dish-data.service.ts`
- `server/routes/auth.js`
- `server/routes/generic.js`
- `server/services/sync-master.js`
- `.claude/reflect/failure-log.tsv` (skip — pre-commit hook artifact)

---

## Next Steps

1. Commit and PR the pending-changes guard fix + server name-collision fix (suggest branch `fix/pending-changes-guard-save-and-leave`)
2. Run `cleanupNameCollisionClones` against production data to clear existing bad clones (requires manual Atlas/Compass access or a one-time migration script)
3. Manual smoke test: open recipe-builder → make a change → navigate away → confirm "Save & Leave" succeeds without "name already taken"
4. Address Plan 234 operational tasks (stamp migration, manual deploy/smoke test) — see `todo.md`

---

## Blocked

- Plan 234 operational tasks require manual Atlas/Compass access and production deploy — cannot be agent-executed
- Name collision cleanup in production requires manual run or deploy of migration script

---

## References

- `server/services/sync-master.js` — `cleanupNameCollisionClones()` + `userNameSet` guard
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — `saveAndWait()` async rewrite
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` — `yieldManuallyChanged` output
