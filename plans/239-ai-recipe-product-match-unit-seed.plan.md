---
name: AI Recipe — product matching + unit seeding
overview: Pre-fill AI-generated ingredient rows with matched product referenceId and seed standard cooking units so amounts, units, and costs all arrive correctly in the recipe builder.
isProject: false
todos:
  - "[ ] unit-registry.service.ts — add tablespoon/teaspoon/cup/pinch/portion to SYSTEM_UNITS"
  - "[ ] recipe-builder.page.ts — product name matching in prefillFromAiDraft"
  - "[ ] recipe-builder.page.ts — fix hydration-race in unit lookup (use live signal, not one-time snapshot)"
---

## Goal
Make the AI (Gemini) recipe flow carry ingredient amounts and units through to the recipe builder form, and auto-link ingredient rows to matching products so line costs recalculate automatically.

## Atomic Sub-tasks

- [ ] `unit-registry.service.ts` — add tablespoon/teaspoon/cup/pinch/portion to `SYSTEM_UNITS`
- [ ] `recipe-builder.page.ts` — in `prefillFromAiDraft`, after patchValue name/amount/unit, attempt name-match against `products_()` and `recipes_()`; if matched, patchValue `referenceId` + `item_type`
- [ ] `recipe-builder.page.ts` — use live `this.unitRegistry_.allUnitKeys_()` signal call inside loop (not one-time Set snapshot) to fix hydration race

## Verification findings (plan-implementation)

- Steps 1, 3, 5 from original brief already implemented — `prefillFromAiDraft` already patches `amount_net` and `unit`
- `onItemSelected` concern in brief is irrelevant — AI flow never calls it
- `SYSTEM_UNITS` is missing tablespoon/teaspoon/cup/pinch/portion → these always fall back to 'unit'
- No `referenceId` set → `refreshAllLineCalculations` (via `effect()`) skips all AI rows → zero cost calculation
- No `@ViewChild` needed — cost recalc fires automatically via existing `effect()` once `referenceId` is set

## Rules
- Don't modify `onItemSelected` default behavior
- Unit mapping runtime-validated against registry
- Single quotes in TS, no semicolons, `inject()` for DI
- Don't call `onItemSelected` in AI flow — use `patchValue` directly

## Done when
- "סלט ביצים" → Gemini → accept → recipe builder: ביצים = 5 unit, מיונז = 1 tablespoon, מלח = 1 pinch
- Each matched ingredient row shows cost (auto-recalculated via effect)
- Non-AI flows unchanged
