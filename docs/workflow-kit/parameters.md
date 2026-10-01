# Parameter catalogue — proposed `kit.config.json` keys

Generated from `params[]` in `manifest.json` (plan 328, A6). Each key is a hardcoded FoodVibe value that core files must read from config instead.
Values are **npm script names** wherever one exists — core never calls raw `ng`/`playwright`. The exact hardcoded strings per file are in `manifest.json` (`params[].strings`).

**38 keys.** Keys with no file today are marked *(none today)*.

## Project identity

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `project.name` | string | "FoodVibe 1.0" (repo folder `foodVibe1.0`) | 21 files: `_shared/current-state.md`, `_shared/tech-stack.md`, `.claude/agents/git-agent.md`, `.claude/commands/feat.md`, … (full list: filter manifest.json by key) | Project name shown in titles, DB labels and slot folder names. |
| `project.uiLocale` | string | "he" (Hebrew, RTL) | `_shared/tech-stack.md`, `.claude/references/prd-template.md`, `AGENTS.md`, `docs/agent/conventions.md`, `docs/brain/glossary.md`, `docs/brain/projectbrief.md` | UI language rules that appear in standards/rules; core only needs to know whether a locale pass exists. |
| `project.i18nFile` | path | public/assets/data/dictionary.json | 10 files: `_shared/tech-stack.md`, `.claude/commands/review.md`, `.claude/commands/ship.md`, `.claude/references/hld-template.md`, … (full list: filter manifest.json by key) | Translation dictionary every UI string must go through; also a hotspot file. |

## Stack

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `stack.packs` | string[] | ["angular", "node-express"] | *(none today)* | Which stack packs the installer copies; the only switch core needs. (No file reads it today.) |
| `stack.name` | string | "Angular 19" | 23 files: `_shared/tech-stack.md`, `.claude/commands/commands.md`, `.claude/commands/docs-refresh.md`, `.claude/commands/feat.md`, … (full list: filter manifest.json by key) | Frontend framework name for prose in commands, skills and rules; the pack supplies the wording. |
| `stack.backend` | string | "Node/Express + MongoDB" | 9 files: `_shared/tech-stack.md`, `.claude/commands/fix.md`, `.claude/skills/preflight/SKILL.md`, `.gitignore`, … (full list: filter manifest.json by key) | Backend stack name for prose in commands and standards. |
| `stack.stylesheetExt` | string | "scss" | 11 files: `_shared/tech-stack.md`, `.claude/commands/auto-solve.md`, `.claude/commands/refactor.md`, `.claude/commands/ship.md`, … (full list: filter manifest.json by key) | Stylesheet extension used in lint-staged globs, brain-review ref patterns and CSS rules. |
| `stack.stateRules` | string | "signals-only (signal()/computed(), no BehaviorSubject)" | `_shared/tech-stack.md`, `.claude/skills/elegant-fix/SKILL.md`, `.claude/skills/techdebt/SKILL.md`, `AGENTS.md`, `docs/agent/conventions.md`, `docs/brain/how-it-works.md` | State-management hard rules quoted in AGENTS.md, techdebt and elegant-fix checks (pack content). |

## Commands (npm script names)

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `commands.build` | npm script | "build" (`ng build`) | 15 files: `_shared/tech-stack.md`, `.claude/commands/auto-solve.md`, `.claude/commands/docs-refresh.md`, `.claude/commands/feat.md`, … (full list: filter manifest.json by key) | Build gate before any commit/ship; core calls the npm script name, never raw `ng`. |
| `commands.buildProd` | npm script | "build:render" (`npx ng build --configuration=production`) | *(none today)* | Production build (plan 321 renames/uses it as the build gate when merged). |
| `commands.dev` | npm script | "start" (`ng serve`) | `.claude/skills/worktree-setup/SKILL.md`, `.vscode/launch.json`, `docs/agent/workflow-map.md` | Plain dev-server start. |
| `commands.devLocal` | npm script | "dev:local" in root AND server/package.json | `scripts/take-plan.mjs` | Per-slot dev server started by take-plan.mjs; must exist in both package.json files (root: `ng serve -c local`, server: `node --watch`). Beware the root/server `dev:remote` naming collision. |
| `commands.test` | npm script | "test" (`ng test`; server: `vitest run`) | `.claude/commands/refactor.md`, `.claude/skills/elegant-fix/SKILL.md`, `.claude/skills/techdebt/SKILL.md`, `.github/workflows/ci.yml`, `.vscode/launch.json` | Unit-test gate and CI test job. |
| `commands.lint` | npm script | "lint" (eslint over `src/app/**`) | 8 files: `_shared/tech-stack.md`, `.claude/commands/auto-solve.md`, `.claude/commands/feat.md`, `.claude/commands/fix.md`, … (full list: filter manifest.json by key) | Lint gate before a milestone is declared ready. |
| `commands.e2e` | npm script | "e2e" (`playwright test`) | *(none today)* | End-to-end suite. No workflow file calls it today; listed so core can gate on it later. |
| `commands.codegen` | npm script | "build:schemas" (plan 321, not merged yet) | *(none today)* | Schema/codegen pre-step that must run before build/test once plan 321 lands. No file calls it yet. |
| `commands.cli` | string | `ng generate\|serve\|...` | *(none today)* | Raw framework-CLI subcommands cited in prose; every one should map to an npm script above. |
| `commands.npm` | string[] | `npm run <script>`, `npm ci`, `npx <tool>` occurrences | 10 files: `.claude/commands/ship.md`, `.claude/prompts/deploy-angular-github.md`, `.claude/skills/worktree-setup/SKILL.md`, `.claude/workflows/deploy.yml`, … (full list: filter manifest.json by key) | Raw npm invocations found in docs/CI (exact strings in manifest.json params); each must resolve to a commands.* key. |
| `commands.lintStaged` | string | "npx lint-staged" | `.husky/pre-commit` | Staged-file lint hook run by .husky/pre-commit. |
| `commands.dbBackup` | path[] | server/scripts/db-backup.js, db-restore.js | `scripts/take-plan.mjs` | DB snapshot/restore scripts take-plan.mjs runs to seed a slot database (only when the project has a DB). |

## Deployment

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `deploy.host` | string | "Render.com" (single service; Express serves the Angular build) | `_shared/tech-stack.md`, `.gitignore`, `docs/brain/projectbrief.md`, `scripts/kit-manifest-check.mjs` | Hosting target named in stack docs, gotchas and .gitignore; drives deploy docs only. |
| `deploy.dbHost` | string | "MongoDB Atlas" (prod) + local Mongo (dev) | `_shared/tech-stack.md`, `docs/agent/standards-backend.md`, `docs/brain/projectbrief.md`, `scripts/kit-manifest-check.mjs` | Database hosting named in backend standards/gotchas and scripts. |

## Git

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `git.mainBranch` | string | "main" | 19 files: `.claude/commands/plan.md`, `.claude/commands/review.md`, `.claude/commands/ship.md`, `.claude/commands/take-plan.md`, … (full list: filter manifest.json by key) | Integration branch used in branch guard, pre-push, ship, free-slots and scope/drift checks (`origin/main`). |

## Worker slots

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `slots.count` | number | 3 | `scripts/lib/slot.mjs`, `scripts/take-plan.mjs` | Number of permanent Worker slots (wt-1..3). |
| `slots.nameFormat` | string | "wt-N" | 16 files: `.claude/commands/done.md`, `.claude/commands/plan.md`, `.claude/commands/ship.md`, `.claude/commands/take-plan.md`, … (full list: filter manifest.json by key) | Slot label used in prose, scope guard and slot detection. |
| `slots.folderSuffix` | string | "-wt-N" (sibling folder `<repo>-wt-N`) | `.claude/skills/worktree-setup/SKILL.md` | Slot worktree folder naming derived from the repo folder; slot.mjs parses N from it. |
| `slots.fePorts` | number base | 4200 (+N per slot) | 9 files: `.claude/commands/auto-solve.md`, `.claude/commands/take-plan.md`, `.claude/skills/preflight/SKILL.md`, `.claude/skills/worktree-setup/SKILL.md`, … (full list: filter manifest.json by key) | Frontend dev port per slot; main = base. |
| `slots.bePorts` | number base | 3000 (+N per slot) | `.claude/commands/take-plan.md`, `AGENTS.md`, `docs/agent/workflow-map.md`, `README_WORKFLOW.md`, `scripts/lib/slot.mjs` | Backend dev port per slot; main = base. |
| `slots.dbNameFormat` | string | "foodvibe_wt{N}" (backup dir `foodvibe-db-backups`) | `scripts/take-plan.mjs` | Per-slot isolated DB name when a plan declares an isolated DB. |

## Hook shell and machine paths

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `hooks.shellPath` | path | C:/Program Files/Git/bin/bash.exe | `.claude/settings.json`, `.mcp.json`, `scripts/take-plan.mjs` | Shell used to run every hook command in `.claude/settings.json` (Windows needs an explicit Git Bash path). |
| `hooks.projectRoot` | path | C:/coding projects/Cursor/foodVibe1.0 | `.claude/settings.json` | Absolute project path baked into `permissions.allow`; replaced by `${CLAUDE_PROJECT_DIR}`. |
| `hooks.userHome` | path | C:/Users/danwe | `.claude/settings.json` | User-home paths (`.claude/**`, Temp) in `permissions.allow`; installer should derive from the environment. |

## Paths

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `paths.hotspots` | path[] | src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts | 12 files: `_shared/current-state.md`, `_shared/tech-stack.md`, `.claude/commands/auto-solve.md`, `.claude/commands/ship.md`, … (full list: filter manifest.json by key) | Append-only shared files every plan may touch; union-merged on conflict (scope-check, ship, PRD template). |
| `paths.srcRoot` | path | src/app/ (+ src/main.ts, app.config.ts, app.routes.ts) | 17 files: `_shared/current-state.md`, `_shared/tech-stack.md`, `.claude/skills/elegant-fix/SKILL.md`, `.claude/skills/techdebt/SKILL.md`, … (full list: filter manifest.json by key) | Application source root used by lint/format hooks, seam folders and Cursor rule globs. |
| `paths.serverRoot` | path | server/ | 16 files: `_shared/current-state.md`, `.claude/commands/review-it.md`, `.claude/skills/worktree-setup/SKILL.md`, `.cursor/rules/auth-and-logging-must-use-skill.mdc`, … (full list: filter manifest.json by key) | Backend root: .env copy for slots, sensitive-path rules, CI cache paths, security globs. |
| `paths.slotEnvFile` | path | src/environments/environment.slot.ts (+ `ng serve -c slot`) | `.gitignore`, `docs/agent/workflow-map.md`, `scripts/take-plan.mjs` | Generated per-slot env file that points the frontend at the slot backend port. |

## Security

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `security.sensitivePaths` | regex | `auth\|crypto\|guard\|interceptor\|security\|payment\|migration\|schema\|\.env\|server/routes\|package(-lock)?.json\|.github/workflows\|...` | `scripts/ship-prep.mjs` | Paths that bump /ship from a fast lane to REGULAR review (ship-prep.mjs). |

## Tools

| key | type | FoodVibe value | used by | purpose |
| --- | --- | --- | --- | --- |
| `tools.browser` | string | "gstack /browse" (fallback Playwright MCP) | 8 files: `.claude/commands/auto-solve.md`, `.claude/commands/security.md`, `.claude/skills/preflight/SKILL.md`, `.cursor/mcp.json`, … (full list: filter manifest.json by key) | Browser tool the workflow is allowed to drive; also decides the .mcp/cursor MCP entries and the preflight probe. |

## Workflow-called npm scripts (must exist in the target project)

| script | where | called from |
| --- | --- | --- |
| `dev:local` | root `package.json` AND `server/package.json` | `scripts/take-plan.mjs` (line ~237, `npm run dev:local`) |
| `build` | root | /ship, AGENTS.md hard rule, CI (as `npx ng build`) |
| `build:render` | root | plan 321 build gate (success criteria of this plan) |
| `build:schemas` | root (plan 321) | not called yet |
| `test`, `lint`, `e2e` | root (server: `test`) | CI, contractor-role, review-it |
| `lint:icons`, `lint:no-native-select`, `lint:backup-entity-types` | root | FoodVibe-only checks (`project` tier) |

## Kit runtime paths the installer must scaffold

Not parameters — constants of the workflow that core files read/write (all excluded from the inventory as runtime data):
`.claude/todo.md`, `.claude/todo-archive/` (+ legacy `.claude/todo-archive.md`), `.claude/sessions/`, `.claude/reports/`, `.claude/techdebt-reports/`, `plans/`, `docs/session-state.md` (+ per-branch `docs/session-state-<branch>.md`), `notes/github-sync/`, `notes/session-handoffs/`, `.worktree-port` / `.worktree-plan` / `.worktree-root` (slot markers), `.claude/.ship-baseline`, `.claude/.slot-pids`.
