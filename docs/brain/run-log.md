# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. `orch-readiness` reads the last three rows (a reason that parked a plan in two of them is asked about before the run starts), and the run report ends with a trend line from them (`node scripts/orch-state.mjs trend`). The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

Earlier (87 runs): plans 233 · merged 211 · parked 19 · fix rounds 111 · escalations 46 · gate fails 33 · ✗ 14 · checker misses 0 — per run: plans 2.68 · parked 0.22 · fix rounds 1.28 · ✗ per plan 0.06

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Earlier (70 runs): plans 207 · merged 185 · parked 19 · fix rounds 86 · escalations 40 · gate fails 20 · ✗ 14 · checker misses 0 — per run: plans 2.96 · parked 0.27 · fix rounds 1.23 · ✗ per plan 0.07

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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
| 2026-11-22 | fin-audit | 660,661 | 1 | 1 | same-reason-twice | 1 | 1 | 2 | ok | 0 | 0 | 0 |
| 2026-11-22 | fin-audit-3 | 661 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-23 | run-698 | 698 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | biz-numbers | 722,723,724,725,726,727,728,729 | 7 | 1 | other | 2 | 4 | 4 | ok | 0 | 0 | 0 |
| 2026-11-26 | biz-fixes | 748,749,750 | 3 | 0 | - | 1 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | house-style-ui | 743,744,745,746 | 4 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-26 | house-style-finish | 758 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-27 | biz-house | 759 | 1 | 0 | - | 1 | 1 | 0 | ok | 0 | 0 | 0 |
| 2026-11-27 | biz-house2 | 762 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-26 | repo-polish | 738 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | biz-722 | 722 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-25 | live-ready | 736,737,738 | 2 | 1 | fix-rounds | 6 | 3 | 2 | ok | 0 | 0 | 0 |
| 2026-11-27 | live-fix | 761 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-27 | biz-final | 763 | 1 | 0 | - | 0 | 1 | 0 | ok | - | - | - |
| 2026-11-27 | md-0 | 764 | 1 | 0 | - | 0 | 0 | 0 | ok | - | - | - |
