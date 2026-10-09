# Session State

## Branch
feat/395-gemini-model-chain-daily-quota-fallback

## Date
2026-10-09

## Session Summary
- Plan 395: all Gemini calls through server/services/gemini-client.js — admin-ordered model chain with per-model daily budgets (~1,120/day). One Gemini call per request; on daily quota the server returns model_exhausted + nextModel and the user clicks to switch (no automatic fallback). /usage and AI modals show used / budget / left. Admin 'AI models' box in metadata manager (on/off, drag & drop, reset). ai-eval-recipes.js --model / --check-models.

## Files Modified
 docs/brain/gotchas/backend.md                      |   8 +
 ...gemini-model-chain-daily-quota-fallback.plan.md |  72 ++-
 public/assets/data/dictionary.json                 |  24 +-
 server/.env.example                                |   5 +
 server/routes/ai.js                                | 495 ++++++++-------------
 server/scripts/ai-eval-recipes.js                  |  54 ++-
 server/services/ai-recipe-helpers.js               |   6 -
 server/services/gemini-client.js                   | 457 +++++++++++++++++++
 server/test/gemini-client.test.js                  | 304 +++++++++++++
 src/app/core/services/gemini.service.ts            | 142 ++++--
 src/app/core/utils/gemini-usage.util.ts            |  94 +++-
 .../ai-model-manager.component.html                |  86 ++++
 .../ai-model-manager.component.scss                | 215 +++++++++
 .../ai-model-manager/ai-model-manager.component.ts | 145 ++++++
 .../metadata-manager.page.component.html           |   1 +
 .../metadata-manager.page.component.spec.ts        |  14 +-
 .../metadata-manager.page.component.ts             |   7 +-
 .../ai-menu-modal/ai-menu-modal.component.html     |  21 +-
 .../ai-menu-modal/ai-menu-modal.component.ts       |  44 +-
 .../ai-product-modal.component.html                |  21 +-
 .../ai-product-modal/ai-product-modal.component.ts |  44 +-
 .../ai-recipe-modal/ai-recipe-modal.component.html |  32 +-
 .../ai-recipe-modal/ai-recipe-modal.component.ts   |  45 +-
 23 files changed, 1885 insertions(+), 451 deletions(-)

## Commit
fdc70b69

## PR
N/A

## Next Steps
- Human: check the switch prompt in the app with a used-up model first (e.g. drag gemini-2.5-flash-lite to the top). Production still calls only gemini-2.5-flash-lite until this deploys. Open question: gemini-3.7-flash often 503s — keep or turn off.
