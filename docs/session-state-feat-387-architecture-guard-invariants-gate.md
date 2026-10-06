# Session State

## Branch
feat/387-architecture-guard-invariants-gate

## Date
2026-10-06

## Session Summary
- Plan 387 architecture invariants gate shipped: docs/brain/invariants.md (INV-1..6), ## Architecture Impact plan section, scope-check --arch (plan block / diff warn) wired into save-plan, take-plan, ship-prep, review-it; kit core mirrored|Server INV-1/INV-4 tests pass; INV-2 + admin-on-master for non-taxonomy are it.todo until plan 386|CI runs npm run test:scripts; recipe PUT with non-array ingredients now 400|Rebased over #273 (redundant-stops): kept both sides in take-plan, scope-check, prd-template, take-plan.md, gotchas

## Files Modified
 .claude/commands/plan.md                           |   6 +
 .claude/commands/review-it.md                      |   2 +
 .claude/commands/take-plan.md                      |   2 +
 .claude/references/hld-template.md                 |   3 +
 .claude/references/prd-template.md                 |  12 ++
 .claude/skills/save-plan/SKILL.md                  |   1 +
 .github/workflows/ci.yml                           |   2 +
 AGENTS.md                                          |   3 +-
 docs/agent/workflow-map.md                         |   5 +-
 .../decisions/0017-architecture-invariants-gate.md |  63 +++++++
 docs/brain/gotchas/agent-workflow.md               |   8 +
 docs/brain/index.md                                |  11 +-
 docs/brain/invariants.md                           |  57 +++++++
 docs/workflow-kit/kit-owned.json                   |   1 +
 docs/workflow-kit/manifest.json                    | 136 +++++++++++++++
 docs/workflow-kit/manifest.md                      |  14 +-
 package.json                                       |   1 +
 .../387-architecture-guard-invariants-gate.plan.md |  31 ++--
 scripts/lib/invariants.mjs                         | 154 +++++++++++++++++
 scripts/scope-check.mjs                            |  72 +++++++-
 scripts/ship-prep.mjs                              |  16 ++
 scripts/take-plan.mjs                              |  17 ++
 scripts/test/fixtures/arch-approved.plan.md        |  18 ++
 scripts/test/fixtures/arch-missing.plan.md         |  12 ++
 scripts/test/fixtures/arch-unapproved.plan.md      |  16 ++
 scripts/test/invariants.test.mjs                   | 189 +++++++++++++++++++++
 server/routes/generic.js                           |   3 +-
 server/test/invariants.test.js                     | 145 ++++++++++++++++
 28 files changed, 972 insertions(+), 28 deletions(-)

## Commit
dd3c6542

## PR
N/A

## Next Steps
- After plan 386 merges: turn the 6 it.todo cases in server/test/invariants.test.js into real tests (A7)|Human check: /plan a small fix touching server/routes/generic.js and confirm an INV-1 line
