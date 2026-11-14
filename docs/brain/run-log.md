# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (10 runs): plans 25 · merged 16 · parked 9 · fix rounds 18 · escalations 6 · gate fails 2 · ✗ 10 · checker misses 0 — per run: plans 2.5 · parked 0.9 · fix rounds 1.8 · ✗ per plan 0.4

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-09 | run-518 | 372,533 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-09 | run-518b | 518,528,530,533,534 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-09 | run-519 | 519,520,521,529,531 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | run-542 | 542 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | run-522 | 522,523,532 | 3 | 0 | - | 2 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-11 | pass-theme | 571,572,573,574,576 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | fd-1a-data | 543,544,545,548,549,550,566,569,570 | 9 | 0 | - | 3 | 4 | 0 | ok | 0 | 0 | 0 |
| 2026-11-11 | run-546 | 546,558,567,575,579 | 5 | 0 | - | 2 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-2 | 546,547,567,568,579,580,581 | 7 | 0 | - | 2 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-584 | 584 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-585 | 584,585 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-590 | 590 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-3 | 546,547,551,552,553,554,580 | 7 | 0 | - | 6 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-2-fix | 547,580,581,586,587,588 | 6 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-4 | 553,554,555,556,580 | 5 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-594 | 594 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-13 | batch-5 | 553,554,555,556,557,559,580 | 7 | 0 | - | 3 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-593 | 593 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | batch-6 | 582,595,596 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-601 | 601,602,603,605,606 | 5 | 0 | - | 2 | 2 | 1 | ok | - | - | - |
