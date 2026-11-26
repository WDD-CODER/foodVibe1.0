# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (96 runs): plans 248 · merged 225 · parked 20 · fix rounds 108 · escalations 52 · gate fails 36 · ✗ 14 · checker misses 0 — per run: plans 2.58 · parked 0.21 · fix rounds 1.13 · ✗ per plan 0.06

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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
| 2026-11-24 | rs-modals | 720,721 | 1 | 1 | environment | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-autoreply | 719 | 1 | 0 | - | 0 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-models | 730 | 1 | 0 | - | 0 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-turn | 731 | 1 | 0 | - | 1 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-24 | rs-schema | 732 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | rs-sim | 733 | 1 | 0 | - | 2 | 2 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | rs-level | 734 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | rs-typing | 735 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-26 | rs-console | 751,752,753,754,755,756,757 | 0 | 1 | other | 0 | 1 | 0 | - | - | - | - |
