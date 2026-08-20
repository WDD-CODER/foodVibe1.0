# Session State

## Branch
feat/perf-phase1-m3-m5

## Date
2026-08-20

## Session Summary
- Executed **plan 302 Milestones 3-5** (Perf Phase 1). M1's code had already shipped (PR #180); M1's remaining work and all of M2 are Human/ops-gated, so M3-M5 were the executable scope.
- **Measured before/after on a real dashboard load**, not estimated: JS downloaded fell from **2,519,067 B to 829,679 B (-67%)**, requests 87 -> 61, and the 996 KB ExcelJS chunk is now absent at boot.
- **Corrected a wrong prediction in the plan.** M4's verification expected "total JS 2.8 MB -> 600-800 KB". Total JS on disk is *unchanged* (2,713,927 -> 2,714,089 B) and the initial bundle barely moved (645.38 -> 643.85 kB). Removing a preload strategy changes *when* code is fetched, not whether it exists. The real win is the download figure above. Correction written into the audit report rather than reporting the flattering number.
- **Review caught a bug I introduced.** The plan's literal `maxAge: '1y', immutable: true` would have pinned every *unhashed* asset for a year - above all `assets/data/dictionary.json`, which every Hebrew UI string flows through. `outputHashing: "all"` only hashes generated JS/CSS; `public/` is copied verbatim. Fixed by gating `immutable` on a `HASHED_ASSET` regex and defaulting everything else to `no-cache`. Captured as a brain gotcha.
- **M4b had no API ripple**, contrary to the plan's warning: all 9 `new Workbook()` sites were already inside `async` methods, so `export.service.ts` and its three consumers needed no changes.
- Diagnosed a user-reported "cache headers not working": they were testing through `ng serve`, which never executes `server/index.js` and hard-codes `Cache-Control: no-cache`. Added `npm run serve:prod` and documented the production-equivalent local test.
- **A concurrent session in the same directory committed `src/app/app.config.ts` into `012d3c9` on `feat/design-migration`** (an unrelated commit, almost certainly `git add -A`). `/ship` Phase 3's branch guard caught it; the change was re-applied here. That change now exists on both branches. Captured as a brain gotcha.

## Files Modified
```
  .claude/todo.md                                    |  14 +-
  docs/brain/gotchas.md                              |   4 +-
  docs/brain/gotchas/backend.md                      |  25 +++
  docs/brain/gotchas/git-workflow.md                 |  21 +++
  package.json                                       |   1 +
  plans/302-perf-phase1-infra-and-payload.plan.md    |  18 +--
  public/assets/style/img/food-compos-logo.png       | Bin 1884522 -> 0 bytes
  public/assets/style/img/recipe_placeholder.png     | Bin 1276764 -> 0 bytes
  render.yaml                                        |   7 +
  reports/performance-audit-2026-08-13.md            | 172 +++++++++++++++++++++
  server/index.js                                    |  40 ++++-
  src/app/app.config.ts                              |   8 +-
  src/app/core/services/menu-export.service.ts       |  18 ++-
  src/app/core/services/recipe-export.service.ts     | 131 ++++++++++------
  .../recipe-header/recipe-header.component.ts       |  79 +++++++---
  15 files changed, 442 insertions(+), 96 deletions(-)
```

## Commit
b8955c4

## PR
See Next Steps - opened at ship time; merge gated on checks.

## Next Steps
- **Human validation pending on the click-test**: Export on cook-view, menu-intelligence, and recipe-builder must each produce a valid `.xlsx`. This is the one real regression risk in the ship and is the only M4 sub-task left `[ ]`.
- **Unblock plan 302 M1**: `PERF_LOG=1` is now declared in `render.yaml`, so `[data/query]` lines start flowing on the next deploy. Collect ~24h of Render logs, then extract p50/p95 `:response-time` for `/api/v1/data/*`, cold-start frequency during business hours, and real `docs=`/`bytes=` into the audit's Observed section. That closes M1 and unblocks the M2 billing decision.
- **`PERF_LOG` is temporary** - set it to `"0"` or remove the `render.yaml` entry once the sample is captured; it costs real CPU on the 0.1-shared-CPU tier.
- **Deferred, still `[ ]`**: the two approve-stamp PNGs (338 KB combined). They are designed artwork, so unlike the placeholder they cannot become a generated SVG without a design call, and no WebP encoder exists on this machine (no sharp/ImageMagick/cwebp/PIL).
- **Next branch, already agreed**: the boot double fetch (plan 301 M4 == plan 304 M2). Measured evidence is recorded in the audit - every collection fetched twice, ~627 kB wasted, `POST /auth/guest` taking 2.85 s. Mechanism: `AppComponent` pulls in the four heavy data services whose constructors call `ensureLoaded()` before auth resolves, then `UserService._reloadDataServices()` re-fetches them all. Fix on its own branch after this merges.
- **Housekeeping**: three untracked paths must not be committed - `.browse-guest-auth.js` (my QA scratch file; `rm` is permission-blocked for the agent), `UI refactor and design.zip`, and `UI refactor/`.
- **Still open from a prior session**: `docs/brain/gotchas/agent-workflow.md` is at 10 entries / ~164 lines, past the split threshold in `docs/brain/gotchas.md`.
