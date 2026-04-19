## Goal
Two independent improvements: (1) recipe type switch now carries content across types so users do not lose their prep items or step instructions when toggling; (2) context-monitor.sh hook now uses the correct PostToolUse output field and has raised alert thresholds.

## Scope
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — enhance `onRecipeTypeChange()` with bidirectional content migration and fix cached-steps restore bug
- `scripts/context-monitor.sh` — fix `systemMessage` output field; raise KB thresholds

## Out of Scope
- Browser QA / automated tests
- Other recipe-builder features

## Success Criteria
- [ ] dish → steps: prep item names populate step instructions on first switch; switching back restores original prep items with quantity/unit/category intact
- [ ] steps → dish: step instructions populate prep item names on first switch; switching back restores cached steps with instruction/labor_time/cooking_time intact
- [ ] Pre-existing bug fixed: cached steps restore `instruction`, `labor_time`, and `cooking_time` (previously only `order` was restored)
- [ ] `context-monitor.sh`: uses `systemMessage` field (not `hookSpecificOutput.decision.additionalContext`) for all three alert tiers
- [ ] `context-monitor.sh`: alert thresholds raised to 550/750/900 KB

## Session ID
2026-04-17-recipe-type-switch-context-monitor
