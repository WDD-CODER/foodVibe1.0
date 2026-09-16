# Session State

## Branch
chore/deadcode-bundle-audit

## Date
2026-09-16

## Session Summary
- Ran a full dead-code/bundle-size audit (6 parallel manual Explore agents over `core/`, `pages/`, `shared/`+`appRoot/`, `server/`, npm dependencies, and the Render build pipeline) — conclusion: no whole-file dead code exists anywhere in the app.
- Persisted `plans/311-deadcode-bundle-audit.plan.md`, added `knip` + `depcheck` tooling (`knip.json`, `audit:deadcode` npm script), ran both plus a production-build budget check, and merged everything into `.claude/techdebt-reports/techdebt-2026-09-16.md`.
- Per Human approval after reviewing the report, removed the two npm packages confirmed to have zero references anywhere in the repo: `@angular-eslint/builder`, `@angular/platform-browser-dynamic`.
- Shipped fast lane (forced to REGULAR review by the `package.json`/`package-lock.json` sensitive-path match) — build gate, `/review` (PASS), manifest check all clean.

## Files Modified
```
.claude/techdebt-reports/techdebt-2026-04-07.md |  139 --  (deleted, retention)
.claude/techdebt-reports/techdebt-2026-04-09.md |   67 -  (deleted, retention)
.claude/techdebt-reports/techdebt-2026-09-16.md |  128 ++ (new report)
.claude/todo-archive/011.md                     |   17 +  (plan 311 archived)
knip.json                                       |    5 +  (new)
package-lock.json                               | 2029 ++++++++++++++++++++---
package.json                                    |    5 +-
plans/311-deadcode-bundle-audit.plan.md         |   88 +  (new)
8 files changed, 2034 insertions(+), 444 deletions(-)
```

## Commit
f527f50

## PR
N/A — checkpoint commit, not yet pushed as of this write

## Next Steps
- Report has 5 categories still open for individual Human decisions, none acted on yet: 2 uncertain npm packages (`@typescript-eslint/eslint-plugin`/`parser`, `autoprefixer`+`postcss`), 39 unused exports/types inside otherwise-live files (concentrated in `core/utils/export.util.ts`, `excel-workbook.util.ts`, and 5 model files), 7 consolidation candidates (~3,500+ duplicated lines across list/table components, CRUD forms, and modal services), 2 server migration scripts (`migrate-supplier-ids.js`, `fix-supplier-refs.js`) pending confirmation they already ran in production, and an undeclared-dependency risk (`mongodb`/`dotenv` used in root `scripts/*.mjs` but not listed in root `package.json`).
- The initial client bundle is confirmed **93.77 kB over its own 500 kB budget** — no module-level breakdown available yet since `source-map-explorer` can't parse esbuild's source maps; a follow-up should try esbuild's own `--metafile` output instead.
- `server/eslint.config.mjs` exists but no `server/package.json` script wires it up — minor gap, human call whether to add a `lint` script there.
- Full report: `.claude/techdebt-reports/techdebt-2026-09-16.md`.
