# Session State

## Branch
feat/session-20260421

## Date
2026-04-21

## Committed Fixes (clean)
- `11b512a` — Bug 1: guest navigation routes to cook-view (recipe-book-list)
- `7b2870e` — Bug 2 partial: auto-repair `patchFormFromRecipe` when referenceId null + nameSnapshot set

## Active Bug — "משרה לפרגית בולגוגית" (prep LZDsy)

### Real Root Cause (confirmed via browser + localStorage inspection)
- Recipe `LZDsy` has 11 ingredients with **non-null referenceIds** (BCI12, ME4Pi, etc.)
- **nameSnapshot is null on all** — recipe was saved before nameSnapshot was in the model
- The referenced product IDs (BCI12 etc.) **do not exist** in PRODUCT_LIST (localStorage wiped at some point)
- Result: orphaned referenceIds + no nameSnapshot fallback

### Symptom breakdown
| View | What shows | Why |
|------|-----------|-----|
| Cook-view | `(לא נמצא)` | scaling.service finds referenceId, item=undefined, nameSnapshot=null → fallback |
| Recipe-builder | blank name, NO badge | patchFormFromRecipe sets referenceId="BCI12" (truthy) → isUnlinkedRow=false |

### My `patchFormFromRecipe` auto-repair DOES NOT help here
- It only fires on `!resolvedRefId` — but referenceId is "BCI12" (truthy) → skipped
- Needs to ALSO handle: referenceId set but product not in state

### Architecture verdict (audited)
- `useBackend=false` (localStorage) in dev is **intentional, not legacy**
- `useBackend=true` (MongoDB via HTTP) in prod
- Clean adapter pattern — no migration needed
- The data corruption is localStorage-specific: products wiped (demo reload?) while recipe retained old IDs

## Plan (approved approach — see jazzy-weaving-lagoon.md)
Two-file fix:

### Fix A: `src/app/pages/recipe-builder/services/recipe-form.service.ts`
Extend auto-repair in `patchFormFromRecipe` to handle orphaned referenceIds:
```typescript
let item = state.products_().find(p => p._id === ing.referenceId)
  ?? state.recipes_().find(r => r._id === ing.referenceId)
let resolvedRefId = ing.referenceId
let resolvedType = ing.type

// Try name-based repair: covers both null-refId AND orphaned-refId cases
if (!item && ing.nameSnapshot) {
  const byName = state.products_().find(p => p.name_hebrew === ing.nameSnapshot)
    ?? state.recipes_().find(r => r.name_hebrew === ing.nameSnapshot)
  if (byName) { item = byName; resolvedRefId = byName._id; resolvedType = ... }
}
// If still no item → clear resolvedRefId so badge shows (user must re-link)
if (!item && resolvedRefId) { resolvedRefId = undefined; resolvedType = undefined }
```

### Fix B: `src/app/core/services/scaling.service.ts`
In `getScaledIngredients`, when referenceId set but item not found → add `isUnlinked: true`:
```typescript
// Change '(לא נמצא)' fallback → '' and add isUnlinked when !item
const name = item?.name_hebrew ?? ing.nameSnapshot ?? ''
return { name, ..., ...(item ? {} : { isUnlinked: true }) }
```

## Next Steps (new session)
1. Apply Fix A to `recipe-form.service.ts` (replace current auto-repair block ~lines 309-334)
2. Apply Fix B to `scaling.service.ts` (lines ~63-74)
3. `ng build` — must pass
4. Browser test: cook-view shows faded/italic unlinked rows; recipe-builder shows "לא מקושר" badge
5. Commit both

## Plan file
`C:\Users\danwe\.claude\plans\jazzy-weaving-lagoon.md`
