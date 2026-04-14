# Session State — 2026-04-14

> Single source of continuity. Read this at session start, update it at session end.

---

## Current Status

**Branch:** `main`
**Latest commit:** `7972591` (fix/recipe-builder: resolve canDeactivate save-and-leave + server name collision root cause)
**Build status:** passing (verified 2026-04-14, warnings only)
**Open PRs:** none — commit is unpushed

---

## Session Summary (2026-04-14)

Fixed two bugs in the neto (net yield) confirmation flow of the recipe-builder:

### Bug 1: Neto confirmation modal not showing on re-edit
- **Root cause:** `netoConfirmed_` signal was loaded from `recipe.neto_confirmed_` (which could be `true` from a previous save). When `true`, the gate `!this.netoConfirmed_()` blocked the modal from appearing even after a new manual yield override.
- **Fix:** `recipe-header.component.ts` — wrapper methods `onPrimaryAmountChange()` / `onPrimaryUnitChange()` now emit `yieldManuallyChanged` output. Parent (`recipe-builder.page.html`) resets `netoConfirmed_.set(false)` via `(yieldManuallyChanged)` binding.

### Bug 2: Sync-badge reset button hidden when `neto_confirmed_` was true on load
- **Root cause:** Same `!netoConfirmed()` gate in the `@if` condition in `recipe-header.component.html`.
- **Fix:** Removed `&& !netoConfirmed()` from the condition — button now always shows when yield differs from computed.

All changes shipped in commit `7972591` (alongside canDeactivate + server name collision fixes).

---

## Uncommitted Changes

- `.claude/reflect/failure-log.tsv` — pre-commit hook artifact, skip

---

## Next Steps

1. **Push `7972591` to remote and open PR** — all 10-file fix is committed but unpushed
2. **Run `cleanupNameCollisionClones` against production** to clear existing bad clones (requires manual Atlas/Compass access or one-time migration script)
3. **Manual smoke tests:**
   - Open recipe-builder → change yield manually → save → reopen → change yield again → confirm neto modal appears
   - Navigate from a preparation recipe to a dish recipe → confirm no `workflow_items -> N -> instruction` crash
   - Open recipe-builder → make a change → navigate away → confirm "Save & Leave" succeeds without "name already taken"
4. Address Plan 234 operational tasks (stamp migration, manual deploy/smoke test) — see `todo.md`

---

## Blocked

- Plan 234 operational tasks require manual Atlas/Compass access and production deploy — cannot be agent-executed
- Name collision cleanup in production requires manual run or deploy of migration script

---

## References

- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` — `yieldManuallyChanged` output + wrappers
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html` — sync-badge condition fix
- `src/app/pages/recipe-builder/recipe-builder.page.html` — `(yieldManuallyChanged)` binding
- `server/services/sync-master.js` — `cleanupNameCollisionClones()` + `userNameSet` guard
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — `saveAndWait()` async rewrite
