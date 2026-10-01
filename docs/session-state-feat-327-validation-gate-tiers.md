# Session State

## Branch
feat/327-validation-gate-tiers

## Date
2026-10-01

## Session Summary
- Plan 327: split job validation into [auto] (agent-verified, todo-query mark --auto-verified) and [human] tiers; ADR 0014; ship Y = commit/push consent

## Files Modified
 .claude/commands/done.md                           |  4 +-
 .claude/commands/review-it.md                      |  2 +-
 .claude/commands/ship.md                           | 11 +++-
 .claude/skills/save-plan/SKILL.md                  |  3 +-
 .cursor/rules/contractor-role.mdc                  |  2 +-
 AGENTS.md                                          |  9 ++-
 docs/agent/job-validation.md                       | 40 ++++++++++++-
 docs/agent/standards-git.md                        |  2 +-
 docs/agent/workflow-map.md                         |  8 +--
 docs/brain/decisions/0014-validation-gate-tiers.md | 27 +++++++++
 plans/327-validation-gate-tiers.plan.md            | 68 ++++++++++++++++++++++
 scripts/todo-query.mjs                             |  3 +-
 12 files changed, 160 insertions(+), 19 deletions(-)

## Commit
0f5f1d03

## PR
N/A

## Next Steps
- Planner: sync --merged for Plan 327; tag Done-when items [auto]/[human] in new plans
