# Session State

## Branch
feat/406-design-plans-folder-open-claude-design-plans

## Date
2026-10-10

## Session Summary
- Plan 406: open design plans live in plans/design/ via scripts/lib/plan-paths.mjs (take-plan, todo-query, scope-check, slot, plan-close, next-plan-number, ship-prep, branch-guard, pre-push); 372-374 moved; 318 filed; ADR 0020. Kit PR #6 merged (c1a015a6), kit PR #7 (ship-prep) open.

## Files Modified
 .claude/skills/save-plan/SKILL.md                  |   8 +-
 .claude/todo.md                                    |  10 +-
 .husky/pre-push                                    |   6 +-
 AGENTS.md                                          |   1 +
 docs/brain/decisions/0020-plans-design-folder.md   |  43 ++++++
 docs/brain/index.md                                |   1 +
 docs/workflow-kit/kit-owned.json                   |   1 +
 docs/workflow-kit/manifest.json                    |  64 ++++++++-
 ...ightly-maintenance-followups-2026-09-27.plan.md |   0
 ...n-plans-folder-open-claude-design-plans.plan.md |  22 +--
 ...venues-b-multiple-contacts-hours-picker.plan.md |   0
 ...3-venues-c-tour-videos-current-location.plan.md |   0
 ...es-d-infrastructure-vs-equipment-groups.plan.md |   0
 plans/design/README.md                             |   5 +
 scripts/branch-guard.sh                            |   7 +-
 scripts/lib/plan-paths.mjs                         |  53 ++++++++
 scripts/lib/slot.mjs                               |  17 +--
 scripts/next-plan-number.mjs                       |   7 +-
 scripts/plan-close.mjs                             |  65 +++++----
 scripts/scope-check.mjs                            |  10 +-
 scripts/ship-prep.mjs                              |   5 +-
 scripts/take-plan.mjs                              |   9 +-
 scripts/test/plan-close.test.mjs                   |  11 ++
 scripts/test/plan-paths.test.mjs                   | 147 +++++++++++++++++++++
 scripts/todo-query.mjs                             |  15 +--
 25 files changed, 417 insertions(+), 90 deletions(-)

## Commit
adb07c9f

## PR
N/A

## Next Steps
- Human merges ai-workflow-kit PR #7. Planner: run take-plan 374 dry-run from main to confirm design plans are takeable.
