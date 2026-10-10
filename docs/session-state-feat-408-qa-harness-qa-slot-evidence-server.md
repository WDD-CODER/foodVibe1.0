# Session State

## Branch
feat/408-qa-harness-qa-slot-evidence-server

## Date
2026-10-10

## Session Summary
- Plan 408 QA harness built: evidence server (4206), qa-up/qa-down (4205/3005), nightly + schedule scripts, docs/qa/README.md
- Launch fix: detached ng serve needs stdin NUL and Start-Process (WMI quota stalls the build)
- /save restricted to application/json (review finding)

## Files Modified
 .gitignore                                         |   6 +
 bugs/qa-runs/.gitkeep                              |   0
 docs/qa/README.md                                  | 117 ++++++++
 package-lock.json                                  |  55 ++++
 package.json                                       |   3 +
 .../408-qa-harness-qa-slot-evidence-server.plan.md |  18 +-
 scripts/qa/evidence-server.mjs                     | 322 +++++++++++++++++++++
 scripts/qa/qa-down.ps1                             |  53 ++++
 scripts/qa/qa-nightly-down.ps1                     |  18 ++
 scripts/qa/qa-nightly-up.ps1                       |  69 +++++
 scripts/qa/qa-schedule.ps1                         |  55 ++++
 scripts/qa/qa-up.ps1                               | 181 ++++++++++++
 12 files changed, 888 insertions(+), 9 deletions(-)

## Commit
b68cbecd

## PR
N/A

## Next Steps
- Human: run A5 (npm run qa:up, /shot smoke PNG, qa:down) and the nightly dry run in the QA checkout; delete local users qa408probe/qa408probe2; point wt-2 environment.slot.ts back to 3002 after QA testing
