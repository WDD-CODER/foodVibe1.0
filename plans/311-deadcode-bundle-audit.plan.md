# Plan 311 — Dead-code & Bundle-size Cleanup: Audit + Tooling Pass

## Goal

Add automated dead-code and dependency-relevance tooling (nothing exists today), run it, and merge the output with this session's manual audit into one prioritized report. **Audit and report only — no deletions or refactors execute in this plan.** The human picks what to act on next from the report; any consolidation refactor gets its own follow-up plan.

## Context

Related prior plans already closed and out of scope here — do not re-derive or redo this work:
- `plans/307-purge-committed-scrape-artifacts.plan.md` — removed ~164MB of committed scrape/legacy-SQL artifacts from git tracking. Closed, human-validated 2026-09-15.
- `plans/308-dead-css-purge-orphan-classes.plan.md` — purged all 14 dead `.c-*` global CSS engines + ~87 orphan component classes. Closed, human-validated 2026-09-14.

This plan covers the remaining angle neither of those touched: **JS/TS dead code (files + exports), npm dependency relevance, and actual shipped-bundle composition** (a bundle analyzer has never been run despite budgets being configured in `angular.json`).

A full manual audit was already run this session (6 parallel Explore agents covering `core/`, `pages/`, `shared/`+`appRoot/`, `server/`, npm dependencies, and the Render build pipeline). Conclusion: **no whole-file dead code exists** — every component, service, route, and server module traced back to a real caller. So the opportunity isn't "delete orphaned files" (there mostly aren't any), it's:
1. tooling to catch what manual grep can't (unused exports/methods inside live files, unused npm packages),
2. flagging clearly duplicated patterns that bloat the bundle even though nothing is technically dead,
3. a few small, concrete already-identified items.

`_claude-data/design-migration/` is explicitly out of scope — still actively used by plan 306 (in progress on another branch), and it's pure markdown never read by the build, so it doesn't affect bundle size regardless.

## This session's manual audit findings (reuse — do not re-research)

**Zero-reference candidate found:**
- `@angular-eslint/builder` (root devDependency, `package.json`) — no `ng lint` architect target exists in `angular.json`; `lint`/`lint:fix` scripts call the `eslint` CLI directly, not `ng lint`. Confirmed zero references anywhere in the repo.

**Uncertain — confirm with tooling in this plan:**
- `@typescript-eslint/eslint-plugin` / `@typescript-eslint/parser` (root) — likely redundant; `eslint.config.mjs` only imports the bundled `typescript-eslint` wrapper package, which already includes both.
- `autoprefixer`, `postcss` (root) — no postcss config file in repo; Angular's builder ships its own nested copies in `package-lock.json`.
- `server/scripts/migrate-supplier-ids.js` and `server/scripts/fix-supplier-refs.js` — one-off migration scripts, zero references, last touched April 2026. Flag in report as "likely safe to archive, needs a human confirm the migration already ran in production" — not detectable from code alone.

**Explicitly confirmed still-live, not orphaned (don't re-flag these):**
- `server/scripts/legacy-import/` — actively touched 2026-09-15 (FoodComposer import in progress).
- `metadata-manager/` page folder — not in `app.routes.ts` but embedded directly as a dashboard tab; live.
- All `shared/` modal folders (ai-recipe-modal, ai-product-modal, ai-menu-modal, and the rest) — every one traced to a real opener.
- `menu-export.service.ts` (897 lines, 40K, largest file in `core/`) — no dead code found by manual spot-check; flag for the AST tool to double-check at method level, not for deletion.

**Consolidation candidates (bloat, not dead code — note in report, do NOT refactor in this plan):**
- ~3,000 lines of near-identical filter/sort/search/pagination logic across 6 entity list components: `recipe-book-list` (906L), `inventory-product-list` (671L), `equipment-list` (540L), `supplier-list` (444L), `menu-library-list` (245L), `venue-list` (227L).
- 4 parallel CRUD form implementations: `product-form`, `venue-form`, `supplier-form`, `equipment-form`.
- 7 near-identical modal-state services in `core/` (~230 lines total) — candidate for a generic `ModalStateService<T>`.
- `quick-add-product-modal` vs `quick-edit-product-panel` — separate form implementations for add/edit of the same entity.
- `confirm-modal` vs `restore-choice-modal` — the latter is just a 3-way variant of the former.
- Entity-data service inconsistency: only 3 of 7 CRUD data services (`equipment`, `venue`, `supplier`) extend `base-entity-data.service.ts`; `recipe`, `product`, `dish`, `menu-event` don't.

**Other flags (note in report, do NOT act on in this plan):**
- `render.yaml` has `PERF_LOG=1` left on from a past diagnostic (plan 302 M1) — burns CPU on Render's free/shared-CPU tier. Unrelated to bundle size; deploy-config change needs explicit human go-ahead.
- `server/breadcrumbs.md` is stale (references a `models/entity.model.js` that no longer exists; omits `routes/admin.js` and `services/`).

## Files to check first

- `angular.json` — build target config, existing budgets (500kB warn / 1MB error initial bundle), entry points for `knip.json`
- `eslint.config.mjs` (root) — confirms the `typescript-eslint` wrapper usage, relevant to the uncertain-dependency check above
- `package.json` (root) and `server/package.json` — where devDependencies get added
- `.claude/skills/techdebt/SKILL.md` — reuse its report format/location instead of inventing a new one

## Atomic Sub-tasks

- [x] Add `knip` and `depcheck` as root devDependencies in `package.json`
- [x] Create `knip.json` — configure Angular client entry points (`src/main.ts`, `angular.json` build target) for unused-file/unused-export detection
- [x] Add `depcheck` as a devDependency to `server/package.json` (or confirm running it via root `npx` against `server/` works without a duplicate install — pick whichever avoids redundancy) — confirmed `npx depcheck server` works from the root install; no duplicate install added
- [x] Add an `audit:deadcode` npm script chaining `knip` + `depcheck` (both package.json's) for repeatability — do not wire into CI in this plan
- [x] Run `npm run build:render` (or `ng build --configuration=production`) — confirm it still passes after adding devDependencies (must stay green per `AGENTS.md`'s hard rule)
- [x] Run `npx source-map-explorer dist/food-vibe1.0/browser/**/*.js` against the production build output — capture actual shipped chunk composition, compare against the 500kB/1MB budgets already configured — `source-map-explorer` cannot parse esbuild's source-map format (0% mapped on every chunk, a tool/builder incompatibility, not a repo problem); pivoted to Angular's own build-stats chunk table instead, which confirmed the initial bundle is 593.77 kB, 93.77 kB over its own 500 kB budget. Follow-up noted in the report: try esbuild's own `--metafile` output for module-level drill-down.
- [x] Run `npx knip` on the client — capture unused-file and unused-export output, cross-check specifically against `menu-export.service.ts` and `kitchen-state.service.ts` for method-level dead code the manual audit couldn't confirm — confirmed neither file has unused exports; found 39 unused exports/types elsewhere (see report)
- [x] Run `npx depcheck` against both `package.json` and `server/package.json` — cross-check against the "uncertain" dependency list above (`@typescript-eslint/*`, `autoprefixer`, `postcss`) and confirm/refute the `@angular-eslint/builder` zero-reference finding — confirmed `@angular-eslint/builder` and `@angular/platform-browser-dynamic` as genuine zero-reference; distinguished tool false positives (`tslib`, `karma-*`, `lint-staged`, `prettier`, etc.) from real findings — see report
- [x] Merge tool output + this plan's manual audit findings into `.claude/techdebt-reports/techdebt-<date>.md`, following the existing `techdebt` skill's report format — categorize every item as **safe now** (zero references, tool-confirmed) / **needs human decision** (consolidation or size/behavior tradeoffs) / **deferred** (tied to `_claude-data`/plan 306 or the in-progress `legacy-import/` migration) — `.claude/techdebt-reports/techdebt-2026-09-16.md`
- [x] Present the report to the Human with a HOW TO VALIDATE section per `docs/agent/job-validation.md` — do not delete or refactor anything in this plan — presented; Human then explicitly approved deleting the two confirmed zero-reference packages (`@angular-eslint/builder`, `@angular/platform-browser-dynamic`) as a separate follow-up action, done and build-verified

## Addendum — approved follow-up action (same session, after report presented)

Human reviewed the report and explicitly approved removing the two zero-reference packages. `npm uninstall @angular-eslint/builder @angular/platform-browser-dynamic` — `ng build` re-verified clean afterward, same pre-existing warnings, no new ones, bundle size unchanged (as expected — neither package shipped to the client bundle). Everything else in the report (consolidation candidates, the two uncertain packages, 39 unused exports, the two server migration scripts) remains untouched, pending individual Human decisions.

## Rules

- Do not delete, refactor, or consolidate anything found by the tooling or the manual audit in this plan — report only. Each consolidation candidate is large enough to warrant its own follow-up Plan Contract.
- Do not touch `_claude-data/design-migration/` (deferred until plan 306 closes).
- Do not touch `server/scripts/legacy-import/` (active migration in progress).
- Do not turn off `PERF_LOG=1` in `render.yaml` in this plan — flag only, needs explicit human go-ahead since it's a deploy-config change.
- `ng build` must keep passing throughout (hard rule, `AGENTS.md`).

## Done when

- `knip` + `depcheck` are installed and runnable via `npm run audit:deadcode`.
- `npx source-map-explorer` output exists and has been reviewed against the configured budgets.
- `.claude/techdebt-reports/techdebt-<date>.md` exists, merges tool output with the manual findings above, and every item is categorized safe-now / needs-decision / deferred.
- `ng build` (production config) still passes.
- Report has been presented to the Human for review — no code deleted or refactored as part of this plan.
