# MVP run — decision log

One line per decision the orchestrator or a Worker took without asking Dandan (he asked: act on the recommendation, report it).
Format: `- YYYY-MM-DD · plan NNN · decision · why`

- 2026-10-20 · all · merges go to `mvp`, not `main`; one Human gate at the end · production stays untouched until validated
- 2026-10-20 · all · plan failing 3 checker rounds is parked, lanes continue · Human choice
- 2026-10-20 · 423 · runs first in lane 2 (before engine 433 and lean form 438) · engine builds on its unit conversion; avoids product-form collision
- 2026-10-20 · 420, 421 · run at head of lane 3 · small QA fixes on files lane 3 touches
- 2026-10-20 · 427/428/429 · lane-1 order kept 5→6→4; 428 creates /settings · Human lane order
- 2026-10-20 · old map #11 · dropped: plan 407 merged without userPrefs; its business scoping folds into 425 · Reality Check
- 2026-10-20 · old map #27 · plan 321 header fixed by the Planner directly · plan-file-only edit
- 2026-10-20 · 424 · 407 migration 0005 not yet on Atlas → 0006 is rehearsed on a scratch Atlas copy only; Atlas order at final gate: 0005, 0006, 0007, 0008 · no production writes without Dandan
- 2026-10-20 · all · reuse audit: refactor plans P1–P9 deferred until after the MVP; MVP plans follow a "reuse first" rule and the checker enforces it · avoids delaying the MVP and colliding with every MVP file, while stopping new drift
- 2026-10-20 · all · builders + merge step on Sonnet (merge at low effort), checker on Opus at high effort, 3 lanes kept · Dandan asked for cost cuts; fewer lanes would spend the same total, just slower
