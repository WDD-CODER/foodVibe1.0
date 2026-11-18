# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (45 runs): plans 136 · merged 115 · parked 18 · fix rounds 51 · escalations 27 · gate fails 3 · ✗ 14 · checker misses 0 — per run: plans 3.02 · parked 0.4 · fix rounds 1.13 · ✗ per plan 0.1

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-12 | run-592 | 589,591,592 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-3 | 546,547,551,552,553,554,580 | 7 | 0 | - | 6 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-2-fix | 547,580,581,586,587,588 | 6 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | batch-4 | 553,554,555,556,580 | 5 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-594 | 594 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-13 | batch-5 | 553,554,555,556,557,559,580 | 7 | 0 | - | 3 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-12 | run-593 | 593 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-597 | 597,598,599 | 3 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-14 | batch-6 | 582,595,596 | 3 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-611 | 611 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-601 | 601,602,603,605,606 | 5 | 0 | - | 2 | 2 | 1 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-607 | 607,610 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-604 | 604 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-14 | run-600 | 600,612,613 | 3 | 0 | - | 2 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-15 | run-608 | 608 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-15 | run-609 | 609 | 1 | 0 | - | 1 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-0 | 615,616,617,618,619,620 | 5 | 1 | fix-rounds | 7 | 2 | 4 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-invoices-srv | 625,626,627 | 3 | 0 | - | 2 | 0 | 2 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-events-srv | 621,622 | 2 | 0 | - | 2 | 0 | 2 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-events-ui | 623,624 | 2 | 0 | - | 2 | 1 | 2 | ok | - | - | - |
