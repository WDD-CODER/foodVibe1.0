# Workflow kit manifest — plan 328 (phase 1 of 5)

Machine-readable source: `manifest.json` (every workflow file: `path, tier, action, params[], refs[], notes`). Verify with `node scripts/kit-manifest-check.mjs`.
Lessons verdicts: `lessons-triage.md`. Config keys: `parameters.md`.

## Summary

**Kit repo (plan 329, phase 2):** `../ai-workflow-kit` (sibling folder, local git, no remote). Its `core/` holds all 77 `tier: core` files, landed by `node scripts/kit-extract.mjs`.

**197 files classified** (196 from plan 328 + `scripts/kit-extract.mjs`, `project`/`stay`) across the inventory roots; 11 excluded path patterns (project history/data).

| tier \ action | copy | parameterize | split | skeleton | stay | total |
| --- | --- | --- | --- | --- | --- | --- |
| `core` | 34 | 36 | 7 | · | · | 77 |
| `layer:cursor` | 26 | 2 | · | · | · | 28 |
| `pack:angular` | 10 | 10 | 2 | · | · | 22 |
| `pack:node-express` | · | · | 1 | · | · | 1 |
| `template` | · | · | · | 17 | · | 17 |
| `project` | · | · | · | · | 52 | 52 |
| **total** | 70 | 48 | 10 | 17 | 52 | 197 |

Tier legend: `core` = ships to every project; `layer:cursor` = optional Cursor layer (`-Cursor`); `pack:*` = stack pack contract (standards doc, skills, Cursor rules, gotchas, validation commands); `template` = generic structure, FoodVibe content, ships as a skeleton; `project` = stays in FoodVibe.

### Blockers (core → project references)

Strict blockers per the plan are core entries that reference a `project`-tier file. Each needs a fix before phase 2 can copy the file as-is.

| core file | references | proposed fix |
| --- | --- | --- |
| `.claude/commands/feat.md`, `.claude/commands/fix.md` | `docs/agent/standards-domain.md` | **parameterize** — `docs.domainStandards` (project-owned doc, optional); pack supplies `standards-<stack>.md` |
| `.claude/commands/ship.md`, `docs/agent/ship-regular.md` | `docs/brain/gotchas/agent-workflow.md`, `docs/brain/decisions/0006-…` | **move** — those lessons are `transfer` in lessons-triage; point at the kit copy |
| `.cursor/rules/git-commit-must-use-skill.mdc`, `scripts/brain-capture-comment.mjs` | ADR 0006 | **move** (ADR 0006 is `transfer`) |
| `docs/agent/job-validation.md` | ADR 0014 | **move** (ADR 0014 is `generalize`) |
| `README_WORKFLOW.md` | ADR 0009 | **move** (ADR 0009 is `generalize`) |
| `docs/agent/brain-capture.md` | `docs/brain/gotchas/` | **keep** — directory exists in the `docs/brain/` skeleton; not a real blocker |
| `scripts/kit-manifest-check.mjs` | root + server `package.json` | **parameterize** — inventory roots become `kit.config.json` |

Core → project **code/layout** paths (outside the inventory, recorded as params with the exact strings; fix = parameterize or move to a pack):

- `src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` (hotspots) — `scripts/scope-check.mjs`, `.claude/commands/ship.md`, `.claude/commands/auto-solve.md`, PRD template → `paths.hotspots`
- `server/middleware`, `server/routes/auth.js`, `src/app/core/guards|interceptors` — `.claude/commands/review-it.md`, `docs/agent/standards-security.md` → `paths.serverRoot` + security pack
- `src/app/core/services/util.service.ts`, `src/app/{core,shared,pages}` — `elegant-fix`, `update-docs`, `techdebt` skills → `paths.srcRoot`
- `server/.env`, `server/scripts/db-backup.js|db-restore.js` — `worktree-setup`, `take-plan.mjs` → `paths.serverRoot` + `commands.dbBackup`
- `.angular/cache`, `server/package-lock.json` — `ci.yml` → Angular pack job
- `docs/security-go-live.md` (FoodVibe doc, not in inventory) — `docs/agent/standards-security.md` → move to template or drop the pointer
- Comments citing FoodVibe plans `plans/324-…`, `plans/326-…`, `plans/328-…` in `scripts/{take-plan,free-merged-slots,scope-check,ship-prep,write-session-state,session-state-path}.mjs`, `scripts/lib/slot.mjs` — **drop** in the kit copy

### Pending workflow changes

Open remote branches whose diff vs `origin/main` touches inventory paths (`git diff --name-only origin/main...origin/<branch>`, fetched 2026-10-01). Record only (Critical Question 3 default a): phase 2 Step 0 picks them up after merge.

| branch | last commit | ahead | files |
| --- | --- | --- | --- |
| `audit/2026-04-25` | 2026-04-25 | 15 | `.claude/agents/render-flow-auditor.md`, `.claude/commands/render-flow-audit.md`, `.github/workflows/render-keepalive.yml`, `.gitignore`, `CLAUDE.md`, `scripts/pre-compact-reminder.sh`, `scripts/session-startup.sh` |
| `claude/document-ai-workflow-ySGoG` | 2026-05-23 | 6 | `.claude/settings.json` |
| `claude/notion-api-assistant-ZvfeH` | 2026-05-20 | 1 | `.claude/settings.json` |
| `feat/321-professional-foundation-refactor` | 2026-10-01 | 4 | `.gitignore`, `package.json`, `scripts/take-plan.mjs`, `server/package.json` |
| `feat/session-20261001-1854` | 2026-10-01 | 2 | `.claude/skills/save-plan/SKILL.md`, `docs/brain/gotchas.md`, `docs/brain/gotchas/agent-workflow.md`, `scripts/branch-guard.sh` |
| `main-fadnX` | 2026-04-20 | 7 | `.claude/settings.json`, `.claude/skills/nightly-audit/SKILL.md` |

Notes: `feat/321-professional-foundation-refactor` carries the Windows `shell` fix in `scripts/take-plan.mjs` plus `package.json`/`server/package.json`/`.gitignore` (expected; separate chore PR). `feat/session-20261001-1854` has live edits to `save-plan`, `branch-guard.sh` and two gotcha files — re-classify after it merges. `audit/2026-04-25`, `main-fadnX` and the two `claude/*` branches are old (all before June 2026) and look abandoned; they would add `render-flow-*`/`nightly-audit` files that are FoodVibe-only (`project` tier) if they ever merge.

### Flagged stale or broken (record only — fixes belong to their own plans)

- `.claude/commands/auto-solve.md` — Contains mojibake (`â€”`) — encoding damage, record only.
- `.claude/commands/design-port.md` — Likely stale/finished one-off — verify before phase 5.
- `.claude/commands/sweep-stale-todos.md` — STALE-REF: cites `session-end.mdc`, which does not exist in `.cursor/rules/`.
- `.claude/prompts/deploy-angular-github.md` — Likely stale: project now deploys to Render (see deploy.host).
- `.claude/references/prd-template.md` — STALE-REF [.claude/rules/domain.md] not on disk.
- `.claude/workflows/deploy.yml` — Likely stale.
- `.cursor/commands/commit-github.md` — Redirect alias to git-agent (duplicate of git.md) — candidate to drop in the kit.
- `.cursor/mcp.json` — AGENTS.md says browser work must go through gstack /browse, never raw Playwright MCP — conflict to resolve in phase 3 (tools.browser).
- `docs/brain/how-it-works.md` — STALE-REF [docs/brain/patterns/defer-singleton-data.md] not on disk.
- `README_WORKFLOW.md` — STALE: line ~43 cites `.claude/rules/{angular,security,domain,backend}.md`, which do not exist (path-scoped standards now live in `.cursor/rules/*.mdc` + `docs/agent/standards-*.md`).
- `scripts/remove-trailing-semicolons.mjs` — Candidate to drop.

### Naming collision: `_shared/` vs `shared/`

FoodVibe's `_shared/` holds workflow docs (`tech-stack.md`, `current-state.md`); plan 321 adds `shared/` for code schemas. Proposal: the kit template ships these as `docs/project/` (`tech-stack.md`, `current-state.md`) instead of `_shared/`, with one path key (`paths.sharedDocs`) so existing references (`contractor-role.mdc`, `CLAUDE.md`) resolve. FoodVibe keeps `_shared/` until the phase 5 cutover. Needs Dandan's call in phase 2.

### React-pack input (P2)

What a React/Vite+Express stack pack would have to supply for each Angular pack file:

| Angular pack file | React equivalent needed |
| --- | --- |
| `.claude/skills/angular-pipe-logic/SKILL.md` | purity/hook-selector logic skill (no pipes) |
| `.claude/skills/angularComponentStructure/SKILL.md` | function-component section ordering + hooks rules |
| `.claude/skills/cssLayer/SKILL.md` | CSS-modules / Tailwind layering rules |
| `.claude/skills/breadcrumb-navigator/SKILL.md` | seam definitions for `src/` (features/ pages/ components/) |
| `.claude/skills/auth-and-logging/SKILL.md` | route guards via router loaders/wrappers; fetch interceptors |
| `docs/agent/standards-angular.md` | `standards-react.md` |
| `docs/agent/conventions.md` | React/CSS/i18n conventions |
| `eslint.config.mjs` | eslint + react-hooks plugin, `src/**` globs |
| `.lintstagedrc.mjs` | globs for `src/**/*.{ts,tsx,css}` |
| `knip.json` | Vite entry points |
| `.vscode/launch.json` | Vite/Chrome debug config |
| `.vscode/tasks.json` | npm tasks with Vite problem-matcher |
| `.vscode/extensions.json` | drop Angular extension |
| `scripts/pre-commit-no-semi.mjs` | same hook, `src/**/*.{ts,tsx}` |
| `scripts/pre-commit-security-grep.mjs` | `dangerouslySetInnerHTML` instead of `[innerHTML]` |
| `docs/agent/standards-backend.md` | reusable as-is for Express |

## Entries by tier

Full per-file detail (params, refs) is in `manifest.json`; this is the human index.

### `core` (77)

| path | action | notes |
| --- | --- | --- |
| `.claude/agents/git-agent.md` | parameterize | Diff + commit-message prep agent; only the title says "FoodVibe 1.0". |
| `.claude/commands/auto-solve.md` | parameterize | Autonomous plan executor. Hardcodes `ng build`/`ng lint` (-> commands.build/lint), gstack `/browse` + Playwright fallback (tools.browser), `.worktree-port` fallback 4200, a UI-detection gate on `*.component.html/ts/scss` globs (Angular layout), `app.routes.ts`, `src/styles.scss`. Contains mojibake (`â€”`) — encoding damage, record only. |
| `.claude/commands/brief.md` | copy | Session brief capture; generic. |
| `.claude/commands/cleanup.md` | copy | Dry-run + confirm wrapper over prune-merged-worktrees.sh and prune-old-sessions.sh. |
| `.claude/commands/commands.md` | parameterize | Command index. One row says "angular/domain rules" for /refactor. Index must be regenerated per kit install. |
| `.claude/commands/docs-refresh.md` | parameterize | Refreshes docs after structural changes; names Angular components/services and `ng build`. |
| `.claude/commands/done.md` | parameterize | Job-validation close-out; mentions wt-N slot mechanics. |
| `.claude/commands/end-session.md` | copy | Alias for /ship. |
| `.claude/commands/feat.md` | parameterize | Feature path: loads standards-angular + standards-domain (-> stack pack standards doc + project domain doc), `ng build`/`ng lint`. |
| `.claude/commands/fix-pr-checks.md` | copy | Thin pointer to docs/agent/pr-check-fix-loop.md. |
| `.claude/commands/fix.md` | parameterize | Bug-fix path: routing table points at standards-angular/domain + `cssLayer` skill; mentions MongoDB data bugs; `ng build`/`ng lint`. |
| `.claude/commands/plan.md` | parameterize | Planner path; names the `wt-N` slots. |
| `.claude/commands/refactor.md` | parameterize | Refactor path: standards-angular, cssLayer, `ng build`/`ng lint`/`ng test`, `.scss` rule. |
| `.claude/commands/review-it.md` | parameterize | Reviewer protocol titled "(FoodVibe)"; verify command `ng lint`; security-sensitive trigger lists `server/middleware`. |
| `.claude/commands/review.md` | parameterize | Diff review; keeps `dictionary.json` in diff scope (project.i18nFile). |
| `.claude/commands/security.md` | parameterize | Security review; recommends gstack `/cso`. |
| `.claude/commands/ship.md` | parameterize | Session-end pipeline (largest coupling surface): `ng build` (commands.build), wt-N scope gate, hotspot union-merge rule listing `src/styles.scss`/`dictionary.json`/`app.routes.ts` (paths.hotspots), `origin/main`. Source of truth for ship-prep.mjs thresholds. |
| `.claude/commands/skills.md` | copy | Prints AGENTS.md skill-trigger table (AGENTS.md is the source of truth). |
| `.claude/commands/sweep-stale-todos.md` | copy | Archives fully-done todo sections via todo-archive.mjs. STALE-REF: cites `session-end.mdc`, which does not exist in `.cursor/rules/`. |
| `.claude/commands/take-plan.md` | parameterize | Claims a slot; names FoodVibe DB label `foodvibe_wtN` and ports `420N`/`300N`. |
| `.claude/commands/tune-workflow.md` | copy | Usage-driven workflow-trim proposals (report only). Uses Claude Code /insights and /usage. |
| `.claude/instructions/validation-checklist.md` | copy | Generic validation checklist. |
| `.claude/settings.json` | split | Generic: hook wiring (PreToolUse branch/plan-write/scope guards, SessionStart startup, PreCompact reminder, Stop handoff check) and deny list. FoodVibe/machine-specific: lines ~5-12 `permissions.allow` with absolute `C:/coding projects/Cursor/foodVibe1.0/**` and `C:/Users/danwe/...` paths; every hook `command` hardcodes `C:/Program Files/Git/bin/bash.exe`. Phase 4 emits this file with `${CLAUDE_PROJECT_DIR}` and `hooks.shellPath` only. |
| `.claude/skills/brief-detection/SKILL.md` | parameterize | Brief gate; one wt-N sentence. |
| `.claude/skills/elegant-fix/SKILL.md` | split | Generic: refine-a-working-fix procedure. Angular part: BehaviorSubject->signal() bullet (line 15), "State Check" signal wording (34), `ng test` (64), `src/app/core/services/util.service.ts` as extraction target (18, 46). |
| `.claude/skills/github-sync/SKILL.md` | copy | Daily GitHub sync; generic. |
| `.claude/skills/preflight/SKILL.md` | parameterize | Pre-flight: dev server on `.worktree-port` fallback 4200, `mongosh` ping, gstack binary check. Each probe is stack/tool specific -> list of probes in kit.config. |
| `.claude/skills/save-plan/SKILL.md` | parameterize | Plan persistence; `ng build`-style done-when examples (line 37) and wt-N Worker/Planner rules. |
| `.claude/skills/techdebt/SKILL.md` | split | Generic debt audit. Angular-only: BehaviorSubject flag (12), `ng test` (143), full-project scope `src/app/` (43). |
| `.claude/skills/update-docs/SKILL.md` | split | Generic doc-refresh flow; FoodVibe/Angular: description names foodVibe 1.0, seam folders `src/app/core\|shared\|pages`, defers to standards-angular.md. |
| `.claude/skills/worktree-setup/SKILL.md` | parameterize | One-time slot provisioning. Hardcodes `../foodVibe1.0-wt-N` folder names (slots.folderSuffix), `foodVibe1.0-wt-parallel` migration (FoodVibe-only history), ports `420N`, `ng serve -c slot`, `server/.env` copy (paths.serverRoot). |
| `.editorconfig` | copy | Stack-neutral formatting defaults. |
| `.gitattributes` | copy | Line-ending / diff attributes; stack-neutral. |
| `.github/workflows/brain-capture-reminder.yml` | copy | PR brain-capture reminder. |
| `.github/workflows/ci.yml` | split | Generic: checkout/node setup, secret scan, lint, server install. Angular: `.angular/cache` caching, `npx ng build`, `npx ng test --watch=false --browsers=ChromeHeadless`, `server/package-lock.json` cache path. Job split by stack in phase 3. |
| `.github/workflows/security.yml` | parameterize | npm-audit + secret-scan; only comments name Angular (blocked `@angular/*` findings). `--omit=dev` policy is ADR 0005. |
| `.husky/pre-commit` | parameterize | Runs lint-staged, no-semi, secret-scan, security-grep, plan-ledger-check. no-semi + security-grep are pack:angular; installer must emit only the hooks whose scripts shipped. |
| `.husky/pre-push` | parameterize | Planner-Worker guard: push to `refs/heads/main` may only touch `plans/*.plan.md` + `.claude/todo.md` (git.mainBranch). |
| `.vscode/settings.json` | copy | Excludes `worktree-*` folders from watcher/search (workflow-related, stack-neutral). |
| `docs/agent/brain-capture.md` | copy | Brain-capture procedure; stack-neutral. |
| `docs/agent/job-validation.md` | parameterize | Job validation (ADR 0014). `ng build` example and wt-N mechanics for todo marking. |
| `docs/agent/pr-check-fix-loop.md` | parameterize | PR check fix loop; `ng build` and npm commands in the loop. |
| `docs/agent/ship-recovery.md` | copy | Ship recovery steps; stack-neutral. |
| `docs/agent/ship-regular.md` | parameterize | REGULAR-lane ship; gstack browse QA references. |
| `docs/agent/standards-git.md` | parameterize | Git/PR/merge-gate rules; `ng build`/`ng lint` as pre-commit gates. |
| `docs/agent/standards-security.md` | split | Generic security checklist vs Angular (guards/interceptors, `src/app/core/*`) and Express (`server/middleware`, `server/routes/auth.js`) sections -> split across core + both packs. |
| `docs/agent/workflow-map.md` | split | Workflow diagram/table. Generic pipeline vs FoodVibe ports (3000-3003/4200-4203), Angular layout, `environment.slot.ts`, Mongo. 335 lines — largest single split. |
| `docs/brain/decisions/_TEMPLATE.md` | copy | ADR template. |
| `docs/brain/patterns/_TEMPLATE.md` | copy | Pattern template. |
| `README_WORKFLOW.md` | parameterize | Workflow manual (Planner/Worker/Reviewer). Hardcodes slot ports and `wt-N` names. STALE: line ~43 cites `.claude/rules/{angular,security,domain,backend}.md`, which do not exist (path-scoped standards now live in `.cursor/rules/*.mdc` + `docs/agent/standards-*.md`). Fix belongs to its own plan. |
| `scripts/brain-capture-comment.mjs` | copy | Posts brain-capture PR comment. |
| `scripts/brain-review-check.mjs` | parameterize | REF_PATTERN accepts extensions ts\|html\|scss\|js\|mjs\|json\|md\|py\|sh and comments cite FoodVibe paths (`logging.service.ts`, `server/routes/ai.js`) — extension list -> config. |
| `scripts/branch-guard.sh` | parameterize | Blocks writes on main; worktree-aware. Only a comment names wt-N; `main` branch name hardcoded (git.mainBranch). |
| `scripts/free-merged-slots.mjs` | parameterize | Detaches merged wt-N slots; `origin/main`, slot naming. |
| `scripts/handoff-check.sh` | copy | Stop-hook handoff reminder. |
| `scripts/kit-manifest-check.mjs` | parameterize | This plan's checker. Its COUPLING term list and inventory roots are themselves the kit config (coupling terms, inventory roots) — phase 5 reuses it for drift. |
| `scripts/lib/slot.mjs` | parameterize | Slot detection: folder-name `wt-N`, ports `4200+N` / `3000+N` (slots.nameFormat, slots.fePorts, slots.bePorts, slots.count). |
| `scripts/lib/todo-parse.mjs` | copy | Todo parsing helper. |
| `scripts/plan-ledger-check.mjs` | copy | Plan ledger consistency check (pre-commit). |
| `scripts/plan-name-similarity.mjs` | copy | Plan-name collision check used by save-plan. |
| `scripts/plan-write-guard.sh` | copy | PreToolUse guard for plans/ writes; uses `plans/` convention (kit constant). |
| `scripts/pre-commit-secret-scan.mjs` | copy | Secret-shape scan. Includes a Gemini/Google key regex (generic enough to keep). |
| `scripts/pre-compact-reminder.sh` | copy | PreCompact reminder. |
| `scripts/prune-merged-worktrees.sh` | parameterize | Prunes merged worktrees; branch/slot naming + `origin/main`. |
| `scripts/prune-old-sessions.sh` | copy | Prunes `.claude/sessions`. |
| `scripts/scope-check.mjs` | parameterize | Read-Write-Scope + drift check. HOTSPOTS constant hardcodes `src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` (lines 30-34) -> paths.hotspots. |
| `scripts/scope-guard.sh` | parameterize | PreToolUse scope guard; wt-N slot detection via `.worktree-port` / `.worktree-plan`. |
| `scripts/session-lock.sh` | copy | Session lock. |
| `scripts/session-manifest-hook.py` | copy | Session manifest PostToolUse hook (python). |
| `scripts/session-manifest-ship.py` | copy | Session manifest at ship (python). |
| `scripts/session-startup.sh` | copy | SessionStart hook; no stack terms found. |
| `scripts/session-state-path.mjs` | copy | Resolves docs/session-state-<branch>.md path. |
| `scripts/ship-prep.mjs` | parameterize | Lane classifier. SENSITIVE_PATHS_RE (line ~27) hardcodes `server\/routes`, `package(-lock)?.json`, `.github/workflows`, `.claude/(settings\|commands/ship)` and auth/crypto/guard/interceptor words -> security.sensitivePaths. ULTRA_TRIVIAL_RE treats `docs/*.md` as trivial. Escaped slashes defeat the checker's term scan, so these are recorded by hand. |
| `scripts/take-plan.mjs` | parameterize | Slot claim. Hardcodes Git Bash path (line 21), `npm run dev:local` (237), DB names `foodvibe_wt${n}` (235/260), backup dir `foodvibe-db-backups` (115), `server/scripts/db-backup.js`/`db-restore.js` (117/122), `src/environments/environment.slot.ts` (72), `ng serve -c slot`. 321 pending change: Windows `shell` fix. |
| `scripts/todo-archive.mjs` | copy | Archives done plan sections to todo-archive volumes. |
| `scripts/todo-query.mjs` | copy | Todo query/mark helper. |
| `scripts/write-session-state.mjs` | copy | Writes session state. |

### `layer:cursor` (28)

| path | action | notes |
| --- | --- | --- |
| `.cursor/commands/brief.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/cleanup.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/commit-github.md` | copy | Redirect alias to git-agent (duplicate of git.md) — candidate to drop in the kit. |
| `.cursor/commands/docs-refresh.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/done.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/feat.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/fix-pr-checks.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/fix.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/git.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/plan.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/refactor.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/review-it.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/review.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/security.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/ship.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/commands/sweep-stale-todos.md` | copy | Thin wrapper: points at the matching `.claude/commands/` file. |
| `.cursor/mcp.json` | parameterize | Cursor MCP list: playwright (`@playwright/mcp@latest`) + github. AGENTS.md says browser work must go through gstack /browse, never raw Playwright MCP — conflict to resolve in phase 3 (tools.browser). |
| `.cursor/rules/brain-memory-session-start.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/brief-detection-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/contractor-role.mdc` | parameterize | Contractor protocol; `ng lint` before review (commands.lint). Defers to `_shared/tech-stack.md`. |
| `.cursor/rules/elegant-fix-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/git-commit-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/github-sync-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/preflight-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/save-plan-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/techdebt-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/update-docs-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |
| `.cursor/rules/worktree-setup-must-use-skill.mdc` | copy | Generic Cursor rule pointing at a core skill/doc. |

### `pack:angular` (22)

| path | action | notes |
| --- | --- | --- |
| `.claude/prompts/deploy-angular-github.md` | parameterize | GitHub Pages deploy prompt for "foodVibe1.0" Angular SPA (`--base-href`). Likely stale: project now deploys to Render (see deploy.host). |
| `.claude/skills/angular-pipe-logic/SKILL.md` | copy | Wholly Angular pipe/directive logic. React equivalent: hooks/selectors purity skill. |
| `.claude/skills/angularComponentStructure/SKILL.md` | copy | Angular component section ordering, `.c-*`/`src/styles.scss` rules, Lucide registration in `app.config.ts` (the last two are FoodVibe conventions — consider moving to project). |
| `.claude/skills/auth-and-logging/SKILL.md` | parameterize | Auth guard / interceptor / logging audit; names `app.routes.ts`. Spans client (Angular) and server (Express) — phase 3 may split into two packs. |
| `.claude/skills/breadcrumb-navigator/SKILL.md` | parameterize | Maintains `breadcrumbs.md` at "major seams"; seam definitions live in standards-angular.md (src/app layout). React pack must redefine seams. |
| `.claude/skills/cssLayer/SKILL.md` | copy | Wholly the FoodVibe CSS architecture (`.c-*` engines in `src/styles.scss`, tokens, scss variables). Could be `project`; kept pack:angular because other Angular+SCSS apps can adopt it. |
| `.claude/workflows/deploy.yml` | parameterize | GitHub Pages deploy workflow for foodVibe1.0 (`--base-href /foodVibe1.0/`). Sits under `.claude/workflows/`, NOT `.github/workflows/`, so GitHub never runs it. Likely stale. |
| `.cursor/rules/angular-component-structure.mdc` | copy | Cursor rule glued to an Angular `src/app/**` glob and an Angular skill/standard. |
| `.cursor/rules/angular-pipe-logic-must-use-skill.mdc` | copy | Cursor rule glued to an Angular `src/app/**` glob and an Angular skill/standard. |
| `.cursor/rules/breadcrumb-navigator-must-use-skill.mdc` | copy | Cursor rule glued to an Angular `src/app/**` glob and an Angular skill/standard. |
| `.cursor/rules/core-angular.mdc` | copy | Cursor rule glued to an Angular `src/app/**` glob and an Angular skill/standard. |
| `.cursor/rules/scss-styling-must-use-cssLayer.mdc` | copy | Cursor rule glued to an Angular `src/app/**` glob and an Angular skill/standard. |
| `.lintstagedrc.mjs` | parameterize | Globs `src/app/**/*.{ts,html,scss}` and bootstrap-file exclusions are Angular layout. React equivalent: different globs/eslint config, same lint-staged wiring. |
| `.vscode/extensions.json` | copy | Recommends `angular.ng-template`. |
| `.vscode/launch.json` | parameterize | `ng serve` / `ng test` configs on `http://localhost:4200/`. |
| `.vscode/tasks.json` | parameterize | npm tasks `start` and `test` (commands.dev/test) with an Angular-CLI-specific problem-matcher end pattern ("bundle generation complete"). React equivalent: same tasks, different matcher. |
| `docs/agent/conventions.md` | split | Generic convention-loading index vs Angular/SCSS/translation specifics (`src/app/core/services/`, `src/app/shared/`, Hebrew, `dictionary.json`, `app.config.ts`). |
| `docs/agent/standards-angular.md` | copy | Angular standards (seams, components, CSS layers, signals). |
| `eslint.config.mjs` | parameterize | Angular-eslint rule set + `src/app/**` and `server/**` globs. React pack would swap plugins/globs. |
| `knip.json` | parameterize | Dead-code config with Angular entry points (`app.config.ts`, `app.routes.ts`). Generic tool, stack-specific entries. |
| `scripts/pre-commit-no-semi.mjs` | parameterize | Strips trailing semicolons in staged `src/app/**/*.ts` excluding `src/main.ts`, `app.config.ts`, `app.routes.ts`. TS style rule + Angular layout. |
| `scripts/pre-commit-security-grep.mjs` | split | Generic: staged-file PII-in-logs scan. Angular-specific: `[innerHTML]` without DomSanitizer, `LoggingService` name; FoodVibe-specific: `.interface-design/source/` exclusion (lines 13-17). Called from `.husky/pre-commit`. |

### `pack:node-express` (1)

| path | action | notes |
| --- | --- | --- |
| `docs/agent/standards-backend.md` | split | Express/Mongo backend contract. Generic: entity-type + persistence rules. FoodVibe: Atlas notes, `server/constants/all-user-entity-types.js`, db-backup/restore scripts, `async-storage.service.ts`. |

### `template` (17)

| path | action | notes |
| --- | --- | --- |
| `_shared/current-state.md` | skeleton | Current-state stub naming FoodVibe key files (`app.routes.ts`, `kitchen-state.service.ts`, `server/routes/ai.js`). Naming collision: `_shared/` (workflow docs) vs 321's `shared/` (code schemas). |
| `_shared/tech-stack.md` | skeleton | Authoritative tech-stack doc (Angular 19, Express, Mongo Atlas, Render, Hebrew RTL). Becomes the pack-filled file: stack pack supplies content, core only requires the file exists. |
| `.claude/references/hld-template.md` | skeleton | High-level-design template; one `dictionary.json` placeholder line. |
| `.claude/references/prd-template.md` | skeleton | PRD template; lists FoodVibe hotspots, Hebrew considerations and dictionary keys. STALE-REF [.claude/rules/domain.md] not on disk. |
| `.cursor/rules/auth-and-logging-must-use-skill.mdc` | skeleton | Glob list enumerates project paths from both stacks (`server/middleware`, `server/routes/auth.js`, `src/app/core/guards\|interceptors`). |
| `.cursor/rules/security.mdc` | skeleton | Glob list enumerates project paths from both stacks (`server/middleware`, `server/routes/auth.js`, `src/app/core/guards\|interceptors`). |
| `.gitignore` | skeleton | Generic base (node, env, logs, `.worktree-*`, `.claude/sessions`) plus FoodVibe/Angular lines: `.angular/cache`, `.gstack/`, Render audit creds, local Mongo (:27018), `server/node_modules`, `src/environments/environment.slot.ts`, legacy-import data. Split in phase 2: generic base = core fragment, Angular lines = pack:angular fragment, rest stays. |
| `.mcp.json` | skeleton | Claude Code MCP list: only the `github` server (token via ${GITHUB_MCP_TOKEN}, `cmd /c npx` = Windows-only launcher). Generic structure; installer should emit per-OS launcher. |
| `.nvmrc` | skeleton | Node version pin; value is per-project. |
| `.prettierrc.json` | skeleton | Style choices (single quotes, no semicolons) are the FoodVibe convention that the `no-semi` hook enforces; ship as a default the project may change. |
| `AGENTS.md` | skeleton | Generic skeleton + FoodVibe content. Core rules (branch/main guard, `ng build`-style build gate -> commands.build, inject/signals are Angular PACK rules, secrets, job validation, Plan Contracts, Planner-Worker, compaction, skill-trigger table, standards index) split by section: Hard-rules bullets for signals/inject/input()/output()/logical CSS/`.c-*`/no any/quotes/Gemini proxy/Hebrew+dictionary belong to pack:angular + project; the rest is core. Phase 4 ships a skeleton with placeholders for ports (slots.fePorts/bePorts), hotspots (paths.hotspots), browser tool (tools.browser). |
| `CLAUDE.md` | skeleton | Skeleton: title + `@AGENTS.md` import + Claude-only addendum (branch guard, hooks, subagents, "Yes chef!" gate). Only the title names FoodVibe. The Yes-chef gate is a user-preference quirk — decide in phase 2 whether it is core or opt-in. |
| `docs/brain/glossary.md` | skeleton | Glossary skeleton; FoodVibe/Hebrew terms. |
| `docs/brain/gotchas.md` | skeleton | Index of domain gotcha files; copy structure, drop entries. Lists Angular terms in descriptions. |
| `docs/brain/how-it-works.md` | skeleton | Visual tour of the brain system; FoodVibe-named but mechanism is generic. STALE-REF [docs/brain/patterns/defer-singleton-data.md] not on disk. |
| `docs/brain/index.md` | skeleton | Brain index skeleton. |
| `docs/brain/projectbrief.md` | skeleton | Project brief skeleton; all content is FoodVibe (stack, Hebrew, Render, Atlas). |

### `project` (51)

| path | action | notes |
| --- | --- | --- |
| `.claude/commands/design-port.md` | stay | FoodVibe design-port handoff ("session 1 of ~11"): FoodVibe screens, 71 `.c-*` engines, Hebrew. Likely stale/finished one-off — verify before phase 5. |
| `.claude/references/tab-orders.md` | stay | Keyboard tab order for FoodVibe pages (Recipe Builder etc.). |
| `.claude/skills/auth-crypto/SKILL.md` | stay | Bound to `src/app/core/auth-crypto.ts` (FoodVibe file). Pairs with security grep + CI gate. |
| `.cursor/rules/auth-crypto-must-use-skill.mdc` | stay | Rule bound to a FoodVibe-only standard/skill (translation + dictionary.json, Lucide icon registry, auth-crypto.ts). |
| `.cursor/rules/lucide-icons-must-register-in-app-config.mdc` | stay | Rule bound to a FoodVibe-only standard/skill (translation + dictionary.json, Lucide icon registry, auth-crypto.ts). |
| `.cursor/rules/translation.mdc` | stay | Rule bound to a FoodVibe-only standard/skill (translation + dictionary.json, Lucide icon registry, auth-crypto.ts). |
| `.gitleaksignore` | stay | Fingerprint allowlist of known false positives in FoodVibe history (commit hashes); meaningless in another repo. |
| `docs/agent/standards-domain.md` | stay | FoodVibe domain: translation keys, Hebrew canonical values, Lucide icons, ingredient ledger. |
| `docs/brain/decisions/0001-lean-native-workflow.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0002-file-based-memory-over-tool-memory.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0003-auto-evoke-brain-on-pr.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0004-full-draft-brain-proposals.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0006-auto-write-brain-capture-by-default.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0007-ship-fast-decouples-approval-from-classification.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0008-professional-foundation-refactor.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0009-planner-worker-worktrees.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0014-validation-gate-tiers.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/decisions/0015-workflow-kit-extraction.md` | stay | FoodVibe ADR; its lesson travels via lessons-triage.md (phase 3 regenerates generalized entries into core/pack). The file itself is not copied. |
| `docs/brain/gotchas/agent-workflow.md` | stay | FoodVibe gotcha file; each `##` entry has a verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/gotchas/angular.md` | stay | FoodVibe gotcha file; each `##` entry has a verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/gotchas/backend.md` | stay | FoodVibe gotcha file; each `##` entry has a verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/gotchas/ci.md` | stay | FoodVibe gotcha file; each `##` entry has a verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/gotchas/git-workflow.md` | stay | FoodVibe gotcha file; each `##` entry has a verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/atomic-bulk-replace-with-standalone-fallback.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/defer-singleton-data-ensureLoaded.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/gemini-backend-proxy.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/global-loading-feedback-via-loadingservice.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/how-to-validate-on-job-gate.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/signals-only-state.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/split-catalog-scan-from-filter-decoration.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `docs/brain/patterns/tombstone-soft-delete.md` | stay | FoodVibe pattern; verdict in lessons-triage.md. The file itself is not copied. |
| `package.json` | stay | Project manifest. Workflow-called scripts (catalogue -> parameters.md): build, build:render, build:schemas (321), start/dev:local, dev:remote, test, lint, e2e, lint:icons, lint:no-native-select, lint:backup-entity-types. `dev:local` is invoked by scripts/take-plan.mjs. |
| `scripts/audit-labels.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/backup-before-repair.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/check-backup-entity-types.mjs` | stay | Compares `server/constants/collections.js` with client `async-storage.service.ts` (FoodVibe data model). |
| `scripts/check-lucide-icons.mjs` | stay | Parses `LucideAngularModule.pick()` in `app.config.ts`; FoodVibe icon policy (`npm run lint:icons`). |
| `scripts/check-no-native-select.mjs` | stay | Bans native `<select>` in favour of `app-custom-select` (FoodVibe UI rule; `npm run lint:no-native-select`). |
| `scripts/diagnose-broken-refs.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/fix-duplicate-names.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/link-users-to-master.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/log-server.js` | stay | Local logging server (FoodVibe dev tool). |
| `scripts/merge-labels.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/migrate-labels-to-courses.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/migrate-to-master.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/promote-guest-to-master.js` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/push-master-to-atlas.js` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/remove-trailing-semicolons.mjs` | stay | One-shot sweep companion to no-semi hook; hardcodes `src/app`. Candidate to drop. |
| `scripts/repair-recipe-references.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `scripts/trim-demo-data.mjs` | stay | One-off FoodVibe data/DB tooling (Mongo/Atlas, labels, recipes). Never part of the kit. |
| `server/package.json` | stay | Backend manifest. Workflow-called scripts: `dev:local` (invoked by scripts/take-plan.mjs), `test`. NOTE (see memory): server `dev:remote` points at Atlas while root `dev:remote` points at Render — name collision, separate plan. |

## Excluded (checker ignores)

| pattern | reason |
| --- | --- |
| `.husky/_/**` | husky-generated shim dir (has its own .gitignore); recreated by `husky` on install |
| `.claude/sessions/**` | per-session runtime history |
| `.claude/reports/**` | generated reports (project history) |
| `.claude/audits/**` | one-off audit write-ups (project history) |
| `.claude/techdebt-reports/**` | rolling techdebt reports (project history) |
| `.claude/todo-archive/**` | archived todo volumes (project history) |
| `.claude/todo.md` | live project todo list (project data; Planner-owned) |
| `.claude/todo-archive.md` | legacy archived todos (project data) |
| `plans/**` | FoodVibe plans (project history); all 5 kit plans live here by decision |
| `docs/session-state-*.md` | per-branch session state (runtime data) |
| `.cursor/*.log` | Cursor debug logs (runtime data) |
