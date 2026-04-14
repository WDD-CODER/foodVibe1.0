# Session State — 2026-04-14

> Single source of truth for all project rules, standards, and skill/agent routing.

---

## Current Status

**Branch:** `main`
**Latest commit:** `de03a1d` (chore: session-handoff for security-audit-sprint)
**Build status:** passing (verified 2026-04-14 end-of-session run, warnings only — budget overage, cook-view SCSS, exceljs CommonJS — all pre-existing)
**Open PRs:** none — commits `7972591`, `b6ce1fc`, `de03a1d` unpushed; new session changes also uncommitted

---

## Session Summary (2026-04-14) — Neto Confirm + Dish Reset + Type-Change Modal

Four fixes/features shipped in the recipe-builder neto/dish confirmation flow:

### Fix 1: Neto confirmation modal not showing on re-edit
- **Root cause:** `netoConfirmed_` was loaded as `true` from the saved recipe, blocking the modal gate.
- **Fix:** `RecipeHeaderComponent` emits `yieldManuallyChanged` output. Parent resets `netoConfirmed_.set(false)` on yield change.

### Fix 2: Sync-badge reset button hidden
- **Root cause:** Same `!netoConfirmed()` guard in the `@if` condition.
- **Fix:** Removed `!netoConfirmed()` — button always shows when yield differs from computed.

### Feature 3: Dish-type neto confirmation + reset button
- `isYieldManualOverride()` returns `isManualOverride_()` for dish type (no ingredient-total comparison).
- Dish-specific modal text: `dish_portions_confirm_header` / `dish_portions_confirm_message`.
- New `savedPortions` input on `RecipeHeaderComponent`; dish reset button shows when editing existing dish with changed portions.
- `savedPortions_` signal in page: set from `recipe.yield_amount_` in `patchFormFromRecipe`, cleared on new recipe.
- New `resetToSavedPortions()` method in `RecipeYieldManager`.
- Template: recipe sync badge gated on `!== 'dish'`; dish reset badge gated on `=== 'dish' && isManualOverride_() && savedPortions() !== null`.

### Feature 4: Type-change confirmation modal
- When user clicks the recipe/dish toggle while the form is dirty, a warning modal fires.
- Fresh (non-dirty) forms toggle immediately with no prompt.
- `ConfirmModalService` injected into `RecipeHeaderComponent`; `toggleTypeWrapper()` made async.

### Plus (same uncommitted batch)
- `server/routes/generic.js` — master-copy fallback for users whose sync skipped due to name collision
- `docs/session-state.md` — updated for this session
- `.claude/copilot-instructions.md` — routing rule updated for end-of-session-agent

---

## Prior Session Summary (2026-04-14) — Guest 404 Fix

Fixed spurious 404 console errors when a guest user clicks a recipe after login.

### Fixes
1. `server/routes/generic.js` — `_masterId` fallback in `GET /:type/:id`
2. `recipe-data.service.ts` — silenced 404 logging
3. `dish-data.service.ts` — silenced 404 logging

All committed in `7972591`.

---

## Uncommitted Changes (This Session)

- `public/assets/data/dictionary.json` — 4 new translation keys
- `src/app/core/utils/recipe-yield-manager.util.ts` — `resetToSavedPortions()`
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` — dish portions input, reset wrapper, `isYieldManualOverride()` fix, `ConfirmModalService`, async toggle
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html` — sync/dish badge split
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — `savedPortions_` signal, dish confirmation messages
- `src/app/pages/recipe-builder/recipe-builder.page.html` — `[savedPortions]` binding
- `server/routes/generic.js` — master-copy fallback (additional fix)
- `docs/session-state.md` — this update
- `.claude/copilot-instructions.md` — routing rule tweak

---

## Next Steps

1. **Commit and push** all uncommitted changes above
2. **Manual smoke tests:**
   - Open recipe-builder → change yield → save → reopen → change yield again → confirm neto modal appears
   - Confirm sync-badge always visible when yield differs from computed
   - Open existing dish → change portions → verify dish-specific modal fires on save
   - Open existing dish → change portions → verify reset button appears and restores saved value
   - Toggle recipe/dish type while form is dirty → confirm warning modal appears; toggle while clean → confirm immediate
   - Navigate from preparation to dish → confirm no `workflow_items -> N -> instruction` crash
3. **Push `main` to remote** — multiple unpushed commits: `7972591`, `b6ce1fc`, `de03a1d` + new commit
4. **Run `cleanupNameCollisionClones`** against production — requires Atlas/Compass
5. Address Plan 234 operational tasks — see `todo.md`

---

## Blocked

- Plan 234 operational tasks require manual Atlas/Compass access and production deploy
- Name collision cleanup in production requires manual run or deploy of migration script

---

## References

- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` — `yieldManuallyChanged`, `savedPortions`, `isYieldManualOverride()`, `toggleTypeWrapper()` async
- `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html` — recipe/dish badge split
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — `savedPortions_` signal, dish confirmation messages
- `src/app/core/utils/recipe-yield-manager.util.ts` — `resetToSavedPortions()`
- `server/routes/generic.js` — master-copy fallback
