# Drift classification — kit vs FoodVibe (plan 390)

Each row is one file where a fresh `kit-extract` of FoodVibe differs from the kit.
Classes: `intended` (placeholder / PACK marker / split), `drift-fixed` (+ which side was right),
`override` (FoodVibe keeps it forever — Dandan approves each), `project-only` (FoodVibe file, not kit-owned).

## Step 0 — reality check (2026-10-17)

- FoodVibe `origin/main` = `86a579c1`; slot branch based on it.
- Kit `main` = `origin/main` = `d110f229`. Unmerged: PR #4 `chore/skills-v2-port` (open, from 2026-10-10),
  `feat/take-plan-brief-and-validation-cards` (no PR), old `origin/chore/skills-v2`. Nothing else. Matches the plan.
- Other slots: wt-2 `fix/408-qa-up-build-schemas` has no diff against `main`; wt-3 `feat/404-cook-view-redesign`
  changes only app files (`src/**`, `e2e/**`, `.interface-design/**`) — no kit-owned file.
- `kit-extract --check`: FAIL, 10 problems — exactly the 10 skills-v2 files the plan expected.
- `kit-manifest-check`: FAIL, 22 unclassified FoodVibe files (design-port scripts + fixtures, QA harness `scripts/qa/*`,
  ADR 0019). `--lessons`: FAIL, 30 brain entries missing a triage row. Both feed A2.
- Fresh extract vs kit: **66 files** — 56 differ, 10 missing from the kit (the skills-v2 files).
- Old validation items:
  - ship-prep ULTRA-TRIVIAL on a big diff — **fixed**. Only a plan/todo-only diff (Planner admin shape) or a single
    ≤10-line doc file gets ULTRA-TRIVIAL; any other big diff is REGULAR. Kit copy has the same logic.
  - Plan-number reuse across open Worker branches — **fixed**. `scripts/next-plan-number.mjs` counts local/remote
    `<type>/NNN-*` branches; save-plan uses it. Present in the kit.
  - So A6 has nothing to do.

## Rows

| Path (kit side) | Class | Notes | Kit commit |
| --- | --- | --- | --- |
| core/.claude/commands/auto-solve.md | override | FoodVibe-only: runs `scripts/log-query.mjs` (Mongo `app_logs`) before reading code; the kit has no log query | — |
| core/.claude/commands/commands.md | override | `/remote` row: `remote.md` is project-only (manifest `project stay`) | — |
| core/.claude/commands/feat.md | intended | `{{docs.domainStandards}}` placeholder | — |
| core/.claude/commands/fix.md | override | FoodVibe-only: runs `scripts/log-query.mjs` (Mongo `app_logs`) before reading code; the kit has no log query | — |
| core/.claude/commands/review-it.md | intended | kit 1.3.0: the Logs check renders from `commands.logQuery`; override dropped, kit wording taken (Architecture line names the Planner; table cell shows the full command) | 30ee30f |
| core/.claude/commands/ship.md | drift-fixed (FoodVibe right) | `merge` in the `/ship` request pre-approves merge — newer than kit | c708599 |
| core/.claude/commands/take-plan.md | intended | `{{git.mainBranch}}` | — |
| core/.claude/settings.json | override | split file: absolute Write/Edit allows and `defaultMode` are per-machine; Playwright MCP allows dropped (kit right) | — |
| core/.claude/skills/preflight/SKILL.md | override | documents FoodVibe's preflight.mjs (MongoDB 27017, gstack browse binary); kit's is config-driven | — |
| core/.claude/skills/save-plan/evals/evals.json | intended | example plan number `395` → `NNN` | — |
| core/.claude/skills/save-plan/SKILL.md | intended | placeholders + `{{plans.openDirs}}` wording (landed in kit PR #9) | 51874c1 |
| core/.claude/skills/techdebt/SKILL.md | override | FoodVibe-specific greps (`@Input`, `BehaviorSubject`, knip) vs kit PACK marker | — |
| core/.github/workflows/ci.yml | override | root `npm ci` for `build:schemas`; build-cache step is a PACK marker; BOM | — |
| core/.github/workflows/security.yml | intended | BOM only | — |
| core/.github/workflows/todo-sync.yml | intended | `{{git.mainBranch}}` | — |
| core/.husky/pre-commit | drift-fixed (kit right) | FoodVibe keeps the deprecated `husky.sh` lines (husky prints a v10 warning) | — |
| core/.husky/pre-push | intended | `{{plans.openDirs\|alt}}` filter | — |
| core/docs/agent/brain-capture.md | intended | kit drops FoodVibe-only example links / ADR refs | — |
| core/docs/agent/job-validation.md | intended | kit drops FoodVibe-only example, ADR link, plan number | — |
| core/docs/agent/ship-recovery.md | intended | plan-number reference dropped | — |
| core/docs/agent/ship-regular.md | drift-fixed (FoodVibe right) | `merge` in the `/ship` request; ADR/gotcha links are intended | c708599 |
| core/docs/agent/standards-git.md | drift-fixed (FoodVibe right) | `merge` in the `/ship` request; rest placeholders | c708599 |
| core/docs/agent/standards-security.md | override | kit generalized + PACK markers; FoodVibe keeps its concrete rules (authGuard, auth-crypto, sessionStorage) | — |
| core/docs/agent/workflow-map.md | override | split file: FoodVibe's map lists its own plans/history | — |
| core/README_WORKFLOW.md | intended | ADR link dropped | — |
| core/scripts/brain-capture-comment.mjs | intended | ADR link dropped | — |
| core/scripts/branch-guard.sh | intended | `{{plans.openDirs\|alt}}`, `{{git.mainBranch}}` | — |
| core/scripts/kit-manifest-check.mjs | override | kit version is the generic config-driven checker; FoodVibe keeps `--lessons` (its own extraction audit) | — |
| core/scripts/lib/plan-paths.mjs | intended | `{{plans.openDirs\|quoted}}` | — |
| core/scripts/lib/slot.mjs | intended | `{{slots.count}}` | — |
| core/scripts/next-plan-number.mjs | intended | placeholder in a comment | — |
| core/scripts/plan-ledger-check.mjs | drift-fixed (kit right) | kit exits 0 when `.claude/todo.md` is missing (new projects); harmless for FoodVibe | — |
| core/scripts/plan-name-similarity.mjs | intended | BOM + plan-number comment | — |
| core/scripts/plan-write-guard.sh | intended | BOM only | — |
| core/scripts/pre-commit-secret-scan.mjs | intended | BOM; rule name `gemini-or-google-key` → `google-api-key` | — |
| core/scripts/preflight.mjs | override | kit reads `kit.config.json` + DB_PORT/BROWSER_BIN; FoodVibe checks MongoDB 27017 + gstack browse binary | — |
| core/scripts/scope-check.mjs | intended | `\|quoted` filters, `{{git.mainBranch}}` | — |
| core/scripts/session-startup.sh | intended | `{{git.mainBranch}}`, plan-number comments | — |
| core/scripts/ship-prep.mjs | drift-fixed (FoodVibe right) | `pruned` stale-manifest report is newer than kit; plan-number comments intended | c708599 |
| core/scripts/take-plan.mjs | drift-fixed (FoodVibe right) | apiUrl rewrite keeps the remote-link branch (plan 388); `slotPrepare`/`dbBackup` placeholders intended | c708599 |
| layers/cursor/.cursor/mcp.json | drift-fixed (kit right) | Playwright MCP entry dropped per 2026-10-01 decision | — |
| packs/angular/.claude/skills/angularComponentStructure/evals/evals.json | override | FoodVibe text says Hebrew/translatePipe; kit is language-neutral | — |
| packs/angular/.claude/skills/angularComponentStructure/SKILL.md | override | Hebrew/`translatePipe`/`dictionary.json` line (60) only; Lucide + `app.config.ts` now render from `project.icons.*` (kit 1.3.0) | — |
| packs/angular/.claude/skills/auth-and-logging/SKILL.md | intended | `{{project.name}}` | — |
| packs/angular/.claude/skills/cssLayer/SKILL.md | intended | kit 1.3.0: "The UI is Hebrew RTL" renders from `project.uiDirection: rtl` + `project.uiLocale`; override dropped (byte-identical) | 30ee30f |
| packs/angular/.lintstagedrc.mjs | intended | BOM + `\|quoted` filter | — |
| packs/angular/docs/agent/conventions.md | override | FoodVibe's translation rules (Hebrew, TranslationService resolvers, Lucide) and naming rules (`app-` selector prefix, is/has/can/should booleans, input names without `_`, measured by `scripts/rule-sweep-count.mjs`; plan 458) vs generic kit text | — |
| packs/angular/docs/agent/standards-angular.md | intended | kit 1.3.0: the **Logic** line renders from `docs.domainSummary`; override dropped (byte-identical) | 30ee30f |
| packs/angular/eslint.config.mjs | intended | BOM only | — |
| packs/angular/knip.json | intended | `\|dquoted` filter | — |
| packs/angular/scripts/pre-commit-no-semi.mjs | intended | `\|quoted` filter | — |
| packs/angular/scripts/pre-commit-security-grep.mjs | override | FoodVibe excludes `.interface-design/source/` (vendored snapshot); BOM | — |
| packs/node-express/docs/agent/standards-backend.md | override | FoodVibe's real versions, entity registry and Atlas notes vs kit template | — |

Totals: 53 rows = 53 files in the fresh extract diff after kit PR #9 (the 10 skills-v2 files and 3 others now match).
`intended` 28 · `drift-fixed` 9 (kit right 4, FoodVibe right 5) · `override` 16 (Dandan approves each) · `project-only` 0 here (the 22 unclassified FoodVibe files are handled in `manifest.json`).
"Intended" rows are confirmed only when the A5 drift check renders the kit file with FoodVibe's `kit.config.json`; anything still different there moves to `drift-fixed` or `override`.

## Second pass — kit rendered with FoodVibe's `kit.config.json` (A5)

The extract diff above compares FoodVibe-turned-into-placeholders with the kit. The real check renders the kit
with FoodVibe's values and compares with FoodVibe's files (`kit-drift.ps1`). That pass found:

- **Kit render bugs, fixed kit-first** (kit `74af9a3`): `{{paths.hotspots}}` used where only the route table was
  meant (new key `paths.routesFile`); slot folders and base hrefs built from `project.name` (new key
  `project.repoName`); backup folder (new key `slots.dbBackupDir`); slot lists rendered as `wt-N, wt-N, wt-N`;
  the browser-tool placeholder standing in for "vendored skill" and leaving stray backticks; `@Angular/*` in a comment.
- **Brain lessons** (`docs/brain/**`, 13 files): the kit now installs them as seeds — written once, then the
  project's (kit `89b5458`, approved by Dandan 2026-10-17). They are no longer compared.
- **FoodVibe adopted the rendered kit text** for every other file (34 files + `eslint.config.mjs` and
  `.lintstagedrc.mjs`, BOM only, approved 2026-10-17): placeholders filled, `ng build` → `npm run build`, mojibake
  arrows fixed, plan-number and ADR back-references dropped, Playwright MCP and the deprecated husky lines gone.
- Result: `KIT_DRIFT: ok — 0 undeclared differences, 19 overrides` (the 19 `override` rows above, including
  `preflight/SKILL.md`; each has its reason in `kit.config.json`).

## Plan 450 — reuse layer (2026-10-21)

Three kit-owned files carry the reuse layer until the kit absorbs it (kit PR + release, ADR 0021). Each has an
`overrides` entry in `kit.config.json`; the logic lives in FoodVibe-owned files (`scripts/lib/reuse-check.mjs`,
`scripts/lib/registry-families.mjs`, `scripts/reuse-lint.mjs`, `docs/agent/standards-reuse.md`).

| Path (kit side) | Class | Notes | Kit commit |
| --- | --- | --- | --- |
| core/scripts/scope-check.mjs | override | plan 450: `import { runReuseCheck }` + one `--reuse` dispatch line; queued for a kit PR | — |
| core/.claude/references/prd-template.md | override | plan 450: `## Reuse Check` block; queued for a kit PR | — |
| core/.claude/skills/save-plan/SKILL.md | override | plan 450: reuse-gate checklist line + Phase 2 rule; queued for a kit PR | — |
