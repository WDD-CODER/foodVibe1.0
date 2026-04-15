## Goal
Fix the duplicate-name validator in recipe-builder so it does not falsely block saving when converting a preparation to a dish (or vice versa).

## Scope
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — `duplicateNameValidator_()` method (~line 494–508)

## Out of Scope
- Changes to kitchen-state.service.ts save/delete logic
- Changes to dish-data.service.ts or recipe-data.service.ts
- UI changes

## Success Criteria
- [x] Opening a preparation, switching to dish, and saving does NOT show "שם המנה כבר בשימוש" unless a genuinely different record with that name exists
- [x] Opening a dish, switching to preparation, and saving does NOT show a false duplicate error
- [x] A real duplicate (two distinct records with the same name in any type) is still caught and blocked
- [x] Saving an existing dish/preparation without changing type continues to work correctly

## Session ID
2026-04-15-duplicate-name-validator-fix
