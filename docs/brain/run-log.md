# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (67 runs): plans 201 · merged 179 · parked 19 · fix rounds 82 · escalations 38 · gate fails 17 · ✗ 14 · checker misses 0 — per run: plans 3 · parked 0.28 · fix rounds 1.22 · ✗ per plan 0.07

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-18 | mod-invoices-ui | 628,629,630 | 3 | 0 | - | 2 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-access-ui | 632 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-history | 638,639 | 2 | 0 | - | 2 | 1 | 2 | ok | 0 | 0 | 0 |
| 2026-11-18 | mod-stock-srv | 635 | 1 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-diag | 633,634 | 2 | 0 | - | 2 | 0 | 2 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-stock | 636,637 | 2 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-fixes | 641,642,643,644 | 4 | 0 | - | 5 | 1 | 2 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-fixes-2 | 645 | 1 | 0 | - | 1 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-alerts | 646 | 1 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-learning | 647 | 1 | 0 | - | 1 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-data-fix | 648,649 | 2 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | mod-voice-match | 650 | 1 | 0 | - | 1 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-20 | mod-count-polish | 651 | 1 | 0 | - | 1 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-20 | mod-dash-diag | 652 | 1 | 0 | - | 0 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-21 | mod-count-units | 654 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-21 | mod-count-compact | 655 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-21 | mod-breakpoints | 656 | 1 | 0 | - | 2 | 2 | 1 | ok | 0 | 0 | 0 |
| 2026-11-21 | mod-count-confirm | 657 | 1 | 0 | - | 0 | 0 | 1 | ok | 0 | 0 | 0 |
| 2026-11-22 | mod-count-popup | 658,659 | 2 | 0 | - | 0 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-22 | rs-0 | 662 | 1 | 0 | - | 0 | 1 | 0 | ok | - | - | - |
