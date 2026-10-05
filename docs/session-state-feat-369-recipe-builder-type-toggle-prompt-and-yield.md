# Session state — feat/369-recipe-builder-type-toggle-prompt-and-yield

Plan: `plans/369-recipe-builder-type-toggle-prompt-and-yield.plan.md` · Slot: wt-3 (fe 4203 / be 3003, shared DB)

## Done
- A1: `RecipeYieldManager.toggleType()` caches last dish portions / prep yield (+ manual flag) per loaded recipe; dish → prep with no cache = ingredient weight in grams; prep → dish = cached portions or 1. New spec (5 cases).
- A2: `isExistingRecord` input (page: `recipeId_() !== null`); existing records toggle without prompt; new dirty records get one Hebrew confirm by direction; 3 dictionary keys; `type_change_confirm_*` removed.

- A2b: type-change save showed an error toast — template bound prep-item controls to a step row after `resetToNewForm_()` (`recipeType_` not synced under `emitEvent:false`). Fixed; reproduced before/after with /browse on a throwaway recipe (console errors 2 → 0, toast now "שונה לסוג החדש ונשמר בהצלחה", dish listed). Test data cleaned up.

- A2c: reload silently swapped a regular user for Guest Admin (NG0200 circular DI in `UserService` ctor refresh + login/signup without `withCredentials`). Fixed in `user.service.ts` (approved). Verified: qa369 login → reload → goto stays qa369; regular-user dish conversion touched only qa369's copy; admin "only me" touched only dev-guest's copy (other 4 users + master unchanged).
- A2d: per-port dev refresh cookie (`server/routes/auth.js`, approved) + token-is-identity on refresh (`user.service.ts`). Verified 4200 guest tab no longer hijacks a 4203 login. Server tests 114/114.
- Test leftovers in local DB: user `qa369`, its גלייז קוריאני dish, dev-guest's גלייז קוריאני dish (old copies in trash).

## Evidence
- `rg -n "type_change_confirm" src/app` → no matches.
- Specs (yield manager + recipe-builder) → 30/30 SUCCESS; full suite 347/347.
- `npm run build` → exit 0.

## Open
- A3 [human]: manual test new + existing, both directions (checklist in chat).
