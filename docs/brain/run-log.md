# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-02 | test-512-422 | 422,512 | 2 | 0 | - | 1 | 0 | 1 | ok | 1 | 0 | 0.5 |
| 2026-11-03 | test-514-515 | 514,515 | 2 | 0 | - | 2 | 1 | 0 | ok | 1 | 0 | 0.5 |
| 2026-11-03 | run-513-516 | 513,516 | 0 | 2 | other | 3 | 1 | 0 | - | 0 | 0 | 0 |
| 2026-11-03 | run-513-516c | 513,516 | 1 | 1 | other | 1 | 0 | 0 | ok | 4 | 0 | 2 |
| 2026-11-08 | run-517 | 374,510,517,533,535 | 2 | 3 | other | 6 | 3 | 0 | failed | 0 | 0 | 0 |
| 2026-11-08 | run-374b | 374,510,535 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-08 | run-536 | 536,537,538,539 | 4 | 0 | - | 1 | 0 | 1 | failed | 0 | 0 | 0 |
| 2026-11-09 | run-540 | 540 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-09 | run-518 | 372,533 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-09 | run-518b | 518,528,530,533,534 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-09 | run-519 | 519,520,521,529,531 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | run-542 | 542 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | run-522 | 522,523,532 | 3 | 0 | - | 2 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-11 | pass-theme | 571,572,573,574,576 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | fd-1a-data | 543,544,545,548,549,550,566,569,570 | 9 | 0 | - | 3 | 4 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-584 | 584 | 1 | 0 | - | 0 | 0 | 0 | ok | - | - | - |
