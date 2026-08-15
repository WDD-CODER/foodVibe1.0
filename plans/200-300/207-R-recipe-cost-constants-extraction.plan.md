---
name: RecipeCostService constants extraction
overview: Extract four module-level constants from recipe-cost.service.ts into a shared recipe-cost.constants.ts util file.
todos:
  - Create src/app/core/utils/recipe-cost.constants.ts — export all four constants verbatim with JSDoc comments
  - Update recipe-cost.service.ts — delete four constant declarations and add import from new util file
  - Verify ng build passes with no errors
isProject: false
---

# Extract RecipeCostService Constants

## Goal
Extract `UNIT_ALIASES`, `MASS_UNITS`, `VOLUME_OR_WEIGHT_KEYS`, and `MAX_RECURSION_DEPTH` from `RecipeCostService` into a shared constants file, reducing file noise and making constants importable by other cost-related code.

## Atomic Sub-tasks
- [ ] Create `src/app/core/utils/recipe-cost.constants.ts` — export all four constants verbatim with JSDoc comments
- [ ] Update `recipe-cost.service.ts` — delete four constant declarations (lines 8–28) and add import from new util file
- [ ] Verify `ng build` passes with no errors

## Rules
- Do not touch any methods — zero logic changes
- No `any`, single quotes in TS, no semicolons

## Done When
- `ng build` passes with no errors
- `recipe-cost.constants.ts` exists with all four exported constants
- `recipe-cost.service.ts` imports from the new file
