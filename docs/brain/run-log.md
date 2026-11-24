# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (88 runs): plans 229 · merged 207 · parked 19 · fix rounds 104 · escalations 47 · gate fails 32 · ✗ 14 · checker misses 0 — per run: plans 2.6 · parked 0.22 · fix rounds 1.18 · ✗ per plan 0.06

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-22 | mod-count-popup | 658,659 | 2 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-22 | rs-0 | 662 | 1 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-22 | rs-engine | 663,664 | 2 | 0 | - | 2 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-22 | fin-audit | 660,661 | 1 | 1 | same-reason-twice | 1 | 1 | 2 | ok | 0 | 0 | 0 |
| 2026-11-22 | fin-audit-3 | 661 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-22 | rs-floor-ui | 665,666,667,684 | 4 | 0 | - | 0 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-book-srv | 668,669,685 | 3 | 0 | - | 1 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-book-ui-2 | 671,672,673,686 | 4 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-conv-srv | 675,687 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-jobs | 676 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-book-ui-3 | 670 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-conv-ui | 677,678 | 2 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-demo | 674 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-ai | 679,680,681,682,689 | 5 | 0 | - | 2 | 3 | 1 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-fixes | 701,702 | 0 | 1 | other | 1 | 1 | 0 | - | 0 | 0 | 0 |
| 2026-11-24 | rs-fixes-2 | 701,702 | 2 | 0 | - | 1 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-23 | rs-zones | 699,700 | 1 | 1 | other | 1 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-zones-2 | 700 | 1 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-style | 703,704,705,706,707,708,709,710,711,712,713,714,715,716,717,718 | 16 | 0 | - | 1 | 1 | 2 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-autoreply | 719 | 1 | 0 | - | 0 | 0 | 1 | ok | - | - | - |
