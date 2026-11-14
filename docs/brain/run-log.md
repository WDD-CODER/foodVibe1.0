# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (12 runs): plans 27 · merged 20 · parked 6 · fix rounds 13 · escalations 5 · gate fails 1 · ✗ 6 · checker misses 0 — per run: plans 2.25 · parked 0.5 · fix rounds 1.08 · ✗ per plan 0.22

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-10 | run-522 | 522,523,532 | 3 | 0 | - | 2 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-11 | pass-theme | 571,572,573,574,576 | 5 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-10 | fd-1a-data | 543,544,545,548,549,550,566,569,570 | 9 | 0 | - | 3 | 4 | 0 | ok | 0 | 0 | 0 |
| 2026-11-11 | run-546 | 546,558,567,575,579 | 5 | 0 | - | 2 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-2 | 546,547,567,568,579,580,581 | 7 | 0 | - | 2 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-584 | 584 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-585 | 584,585 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-590 | 590 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-589 | 589 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-591 | 589,591 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-592 | 589,591,592 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-3 | 546,547,551,552,553,554,580 | 7 | 0 | - | 6 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-2-fix | 547,580,581,586,587,588 | 6 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-4 | 553,554,555,556,580 | 5 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-594 | 594 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-13 | batch-5 | 553,554,555,556,557,559,580 | 7 | 0 | - | 3 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-593 | 593 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-597 | 597,598,599 | 3 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-14 | batch-6 | 582,595,596 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-611 | 611 | 1 | 0 | - | 0 | 0 | 0 | ok | - | - | - |
