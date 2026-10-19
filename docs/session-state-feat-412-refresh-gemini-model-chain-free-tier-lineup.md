# Session State

## Branch
feat/412-refresh-gemini-model-chain-free-tier-lineup

## Date
2026-10-19

## Session Summary
- Plan 412: Gemini chain = free-tier catalog, quota-first order; 3.5/3.7-flash dropped (auto-routed), 3-flash-preview added; removed models never called, flagged in admin screen; --probe-models added

## Files Modified
 docs/brain/gotchas/backend.md                      |   2 +
 ...esh-gemini-model-chain-free-tier-lineup.plan.md |  35 +++--
 public/assets/data/dictionary.json                 |   1 +
 server/.env.example                                |   9 +-
 server/routes/ai.js                                |   5 +-
 server/scripts/ai-eval-recipes.js                  |  70 +++++++++
 server/services/gemini-client.js                   |  86 ++++++++---
 server/test/gemini-client.test.js                  | 158 +++++++++++++++++----
 src/app/core/services/gemini.service.ts            |   9 +-
 .../ai-model-manager.component.html                |  18 +++
 .../ai-model-manager.component.scss                |  11 ++
 .../ai-model-manager/ai-model-manager.component.ts |  15 +-
 12 files changed, 345 insertions(+), 74 deletions(-)

## Commit
27441802

## PR
N/A

## Next Steps
- C1 open: set MODEL_DAILY_BUDGETS from the Human's ai.dev/rate-limit screenshot (follow-up branch)
