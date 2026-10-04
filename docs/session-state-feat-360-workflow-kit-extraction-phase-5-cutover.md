# Session State

## Branch
feat/360-workflow-kit-extraction-phase-5-cutover

## Date
2026-10-04

## Session Summary
- Phase 5 ownership switch: kit owns 131 workflow files, scope-guard denies agent edits (Claude Code deny format). | Slot fixes from 4 Worker reports: take-plan validates before claiming (scope shapes, plan order, branch held/done, ports), resumes, keeps servers, waits + log tail; slot-stop.mjs; merge from a slot stays in the slot; only 'merge' merges. | todo sync --merged picks up finished plans whose branch is gone. Plan renumbered 337->340->350->360 (Planner kept taking the numbers).

## Files Modified
 .claude/commands/ship.md                           |  12 +-
 .claude/commands/take-plan.md                      |  28 +-
 .claude/skills/save-plan/SKILL.md                  |   9 +-
 .gitignore                                         |   1 +
 docs/agent/ship-recovery.md                        |   2 +-
 docs/agent/ship-regular.md                         |   4 +-
 docs/agent/standards-git.md                        |  11 +-
 docs/brain/gotchas/git-workflow.md                 |  10 +
 ...-350-workflow-kit-extraction-phase-5-cutover.md |  44 ++++
 docs/workflow-kit/kit-owned.json                   | 136 ++++++++++
 docs/workflow-kit/lessons-triage.md                |   1 +
 docs/workflow-kit/manifest.json                    |  53 +++-
 docs/workflow-kit/manifest.md                      |  12 +-
 ...workflow-kit-extraction-phase-5-cutover.plan.md | 114 ++++++++
 scripts/free-merged-slots.mjs                      |  18 +-
 scripts/kit-owned.mjs                              |  60 +++++
 scripts/lib/plan-scope.mjs                         |  43 +++
 scripts/lib/slot-procs.mjs                         | 156 +++++++++++
 scripts/scope-check.mjs                            |  19 +-
 scripts/scope-guard.sh                             |  32 ++-
 scripts/slot-stop.mjs                              |  18 ++
 scripts/take-plan.mjs                              | 292 ++++++++++++++-------
 scripts/todo-query.mjs                             |  23 +-
 23 files changed, 951 insertions(+), 147 deletions(-)

## Commit
dde6945c

## PR
N/A

## Next Steps
- After merge: wt-2/wt-3 one-time (del .claude\*.log; git fetch; git switch --detach origin/main), then take plan NNN. Collect workflow reports. Known: ship-prep lane misclassifies uncommitted multi-file diffs as ULTRA-TRIVIAL; Planner reuses plan numbers of open Worker branches; FoodVibe .kit/install.json baseline not done.
