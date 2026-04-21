# Session State

## Branch
fix/resolver-rtl-cook-fixes

## All Client-Side Fixes DONE (committed)
- `11b512a` — guest nav → cook-view
- `7b2870e` — auto-repair null referenceId via nameSnapshot
- `75b6da6` — orphaned referenceId: scaling service isUnlinked, patchFormFromRecipe clears refId, seed-master ordering assertion

## Next: Server-side A1+A2 in `server/routes/generic.js`
Plan file: `C:\Users\danwe\.claude\plans\jazzy-weaving-lagoon.md`

### A1 — DELETE /api/v1/data/PRODUCT_LIST/:id (~line 199)
Insert BEFORE the existing `findOne` check:
```js
if (req.params.type === 'PRODUCT_LIST') {
  const recipeRef = await col('RECIPE_LIST').findOne({
    userId: req.user.userId,
    'ingredients_.referenceId': req.params.id,
    _userDeleted: { $ne: true },
  })
  const dishRef = !recipeRef && await col('DISH_LIST').findOne({
    userId: req.user.userId,
    'ingredients_.referenceId': req.params.id,
    _userDeleted: { $ne: true },
  })
  if (recipeRef || dishRef) {
    const ref = recipeRef || dishRef
    return res.status(409).json({
      error: 'Product is used in one or more recipes',
      referencedBy: ref.name_hebrew || ref._id,
    })
  }
}
```

### A2 — PUT /api/v1/data/:type/:id (~line 125)
Insert BEFORE the `findOneAndUpdate` call:
```js
if (req.params.type === 'RECIPE_LIST' || req.params.type === 'DISH_LIST') {
  const ings = req.body.ingredients_ ?? []
  const orphan = ings.find(ing => ing.referenceId && !ing.nameSnapshot)
  if (orphan) {
    return res.status(400).json({
      error: 'Each linked ingredient must have a nameSnapshot',
      referenceId: orphan.referenceId,
    })
  }
}
```

## After implementing A1+A2
- Restart backend server
- Set `useBackend: true` in `src/environments/environment.ts` to test
- Test A1: delete a product used by a recipe → expect 409
- Test A2: save recipe with linked ingredient missing nameSnapshot → expect 400
