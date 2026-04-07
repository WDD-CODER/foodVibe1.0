# Dead Code Audit Report
**Date:** 2026-04-06
**Scanned:** 303 files total (169 `.ts` excluding `.spec.ts` + 67 `.html` + 67 `.scss`)
**Skipped:** `.spec.ts` files, `breadcrumbs.md` files

---

## Overview

The application codebase itself is in good shape — all Angular components, services, guards, resolvers, interceptors, directives, and pipes are actively referenced through the component tree or via `app.routes.ts` / `app.config.ts`. The meaningful dead weight lives in two places: the `scripts/` folder (nine one-time migration scripts that have no npm script entry and no CI hook) and the AI workflow tooling (two deprecated skills still occupying the skills folder, one agent with zero invocation wiring, and two commands with no trigger or routing). One exported function in `gemini-shots.util.ts` is public but only consumed internally. The team should prioritize pruning the obsolete workflow tools first, since they create confusion about what the current workflow actually is, then audit whether the migration scripts should be archived or deleted.

---

## Layer 1: Application Logic

**Summary:** All guards, resolvers, interceptors, services, directives, pipes, and models are actively used. Two exported symbols are public but have no external consumers: `getGeminiShots()` and the `VOLUME_UNITS` set — both are only consumed within their own file or a closely-coupled sibling. No components, services, or models are fully dead.

| Item | What it does | Tier | Why it looks dead |
|---|---|---|---|
| `src/app/core/utils/gemini-shots.util.ts` — `getGeminiShots()` export | Reads AI prompt/draft history from localStorage so previous shots can be fed back as context | INVESTIGATE | Exported as a public function but never imported by any file outside the util itself. `addGeminiShot` is imported by `ai-recipe-modal.component.ts`, but the read half is not wired to any UI or service. The shots are written but apparently never read back. |

> **Note on VOLUME_UNITS:** `recipe-cost.constants.ts` exports `VOLUME_UNITS` — this IS imported by `recipe-yield-manager.util.ts`. Not dead.
>
> **Note on metadata-manager page:** `MetadataManagerComponent` is not a lazy route — it is embedded directly inside the dashboard page template as `<app-metadata-manager />`. This is intentional and alive.

---

## Layer 2: Shared UI Components

**Summary:** All 30+ shared components under `src/app/shared/` have at least one active caller. No shared component is dead.

| Component | What it does | Tier | Why it looks dead |
|---|---|---|---|
| — | — | — | Nothing dead found in this layer |

---

## Layer 3: Skills & Commands (AI Workflow Tooling)

**Summary:** Two skills are explicitly marked DEPRECATED in their own `SKILL.md` files and are not referenced by the main routing documents. The `interface-design` skill is not wired into `copilot-instructions.md` triggers but is actively invoked by four commands (`/audit`, `/critique`, `/extract`, `/init`, `/status`). Two commands (`reflect-add-tests`, `sweep-stale-todos`) have no trigger entry in `copilot-instructions.md` or `agent.md`, though `sweep-stale-todos` is mentioned in a to-do task. The `git.md` command is a thin wrapper that simply redirects to `git-agent.md`.

| Skill / Command | What it's supposed to do | Invoked? | Invocation valid? | References | Tier |
|---|---|---|---|---|---|
| `.claude/skills/commit-to-github/` | Git commit/push/PR workflow | No — deprecated | No — file explicitly says "use git-agent instead" | 1 (from `qa-engineer.md`, a stale reference to "commit-to-github Phase 0") | CONFIRMED DEAD |
| `.claude/skills/end-session/` | End session cleanup | No — deprecated | No — file explicitly says "renamed to worktree-session-end" | 0 | CONFIRMED DEAD |
| `.claude/skills/interface-design/` | Design system for dashboards and app UIs | Yes — invoked by commands folder | Yes — four sub-commands depend on it | Multiple (via `audit.md`, `critique.md`, `extract.md`, `init.md`, `status.md`) | Not dead — but INVESTIGATE: trigger is absent from `copilot-instructions.md §0`, so it will not auto-route from conversational prompts |
| `.claude/commands/reflect-add-tests.md` | Guided test-suite builder for skills | No direct trigger in main config | — | 0 in main config files; 1 in `truly-open-tasks.md` (a to-do) | INVESTIGATE |
| `.claude/commands/sweep-stale-todos.md` | Sweep completed todo sections to archive | No direct trigger in main config | — | 1 (in `truly-open-tasks.md` as a pending task to update it) | INVESTIGATE |
| `.claude/commands/git.md` | Thin wrapper: reads and follows `git-agent.md` | Referenced in `todo-archive.md` (completed task) | Yes — correctly redirects to git-agent | Low (1 archive reference) | Not dead — alive as a convenience alias |

---

## Layer 4: Agents

**Summary:** Six agents are in the roster (`copilot-instructions.md §0.3`) and properly wired. Two agents exist on disk but are absent from the roster: `triage-agent.md` and `git-agent.md`. The git-agent is heavily referenced in skills and main config (just not listed in the roster table). The triage-agent has zero references outside its own file.

| Agent | What it's supposed to do | In roster? | Invoked? | Description matches? | Tier |
|---|---|---|---|---|---|
| `team-leader.md` | Coordinates multi-agent task forces, resolves conflicts | Yes | Yes — via §0.3 trigger | Yes | Alive |
| `software-architect.md` | HLD creation, architecture trade-offs | Yes | Yes — via §0.3 trigger | Yes | Alive |
| `product-manager.md` | Feature planning, plan file authoring | Yes | Yes — via §0.3 trigger | Yes | Alive |
| `breadcrumb-navigator.md` | Maintains directory navigation docs | Yes | Yes — via §0.3 trigger and skill trigger | Yes | Alive |
| `qa-engineer.md` | Test strategy, regression verification | Yes | Yes — via §0.3 trigger | Mostly yes — but contains a stale reference to "commit-to-github Phase 0" (that skill is deprecated) | INVESTIGATE |
| `security-officer.md` | Auth/storage/route security reviews | Yes | Yes — via §0.3 trigger and multiple skill triggers | Yes | Alive |
| `git-agent.md` | Handles all git operations (commit, push, PR, merge) | **No** — absent from §0.3 roster | Yes — referenced in `CLAUDE.md`, `agent.md`, `copilot-instructions.md` git trigger, and three skills | Yes — matches description | Not dead — but INVESTIGATE: should be added to the §0.3 roster table for completeness |
| `triage-agent.md` | Guides through `todo.md` one task at a time, collecting keep/delete/defer/done decisions | **No** — absent from §0.3 roster | **No** — zero references anywhere in `.claude/` except its own file | N/A | CONFIRMED DEAD |

---

## Layer 5: Scripts

**Summary:** Three scripts are wired to npm script commands (`log-server.js`, `check-lucide-icons.mjs`, `check-no-native-select.mjs`). The remaining nine scripts are one-time database migration/repair tools with no npm entry, no CI hook, and no reference from other scripts — except `link-users-to-master.mjs` which documents a dependency on `migrate-to-master.mjs` in its own header comments. `backfill-name-snapshots.mjs` is untracked in git (listed in `git status` as `??`).

| Script file | What it does | Called from | Tier |
|---|---|---|---|
| `scripts/log-server.js` | Express server that receives logs from the Angular app during development | `npm run log-server` | Alive |
| `scripts/check-lucide-icons.mjs` | Lints templates to catch icon names not registered in `app.config.ts` | `npm run lint:icons` | Alive |
| `scripts/check-no-native-select.mjs` | Lints templates to enforce use of the custom select component over native `<select>` | `npm run lint:no-native-select` | Alive |
| `scripts/backfill-name-snapshots.mjs` | Fixes stale `nameSnapshot` values in recipe/dish ingredient lists after product renames | Nothing (untracked, no npm entry) | CONFIRMED DEAD |
| `scripts/backup-before-repair.mjs` | Dumps `PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST` to timestamped backup folder before a repair run | Nothing (no npm entry) | PROBABLE DEAD |
| `scripts/diagnose-broken-refs.mjs` | Scans MongoDB for broken ingredient `referenceId` links in recipes/dishes | Nothing (no npm entry) | PROBABLE DEAD |
| `scripts/link-users-to-master.mjs` | Links existing user products to their master product counterparts after a migration | Nothing (no npm entry); header references `migrate-to-master.mjs` as a prerequisite | PROBABLE DEAD |
| `scripts/migrate-to-master.mjs` | Promotes orphaned MongoDB documents (no `userId`) to the shared master layer | Nothing (no npm entry); referenced by `link-users-to-master.mjs` header comment | PROBABLE DEAD |
| `scripts/repair-recipe-references.mjs` | Repairs broken `demo_XXX` referenceIds in recipes and dishes using name-matching | Nothing (no npm entry) | PROBABLE DEAD |
| `scripts/seed-from-dump.js` | One-time import of a `migration-dump.json` into MongoDB Atlas | Nothing (no npm entry) | CONFIRMED DEAD |
| `scripts/stamp-master-userId.js` | One-time migration: stamps all existing entity documents with `userId: '__master__'` | Nothing (no npm entry); doc says "Run ONCE after deploying Brief 1" | CONFIRMED DEAD |
| `scripts/trim-demo-data.mjs` | Trims demo data to 15 dishes + 3 preps for use in seeding | Nothing (no npm entry) | PROBABLE DEAD |

---

## Layer 6: Styles & Assets

**Summary:** No SCSS partial files (files starting with `_`) exist in the project — all style files are component-scoped and alive with their components. The `src/assets/` directory is empty. No dead styles or assets were found in this layer.

| File | Type | Tier | Why |
|---|---|---|---|
| — | — | — | Nothing dead found in this layer |

---

## Team Action Plan

This is your prioritized checklist for the cleanup work ahead.

### Safe to Delete
These are CONFIRMED DEAD with no ambiguity. Delete them and run `ng build` to confirm nothing breaks.

- [ ] `.claude/skills/commit-to-github/` folder — explicitly deprecated; the replacement (`git-agent.md`) is fully live. Nothing in the app depends on this folder.
- [ ] `.claude/skills/end-session/` folder — explicitly deprecated; the replacement (`worktree-session-end`) is fully live. This is a redirect stub with no logic.
- [ ] `.claude/agents/triage-agent.md` — zero references anywhere in the project. Not in the agent roster, not invoked by any skill or trigger. A standalone tool that was never wired in.
- [ ] `scripts/backfill-name-snapshots.mjs` — not tracked in git, not in any npm script. Safe to remove unless actively used ad-hoc.
- [ ] `scripts/seed-from-dump.js` — explicitly documented as a one-time seed operation. If Brief 1 is deployed and seeded, this is done.
- [ ] `scripts/stamp-master-userId.js` — explicitly documented as "Run ONCE after deploying Brief 1." If that migration is complete, this is done.

### Needs a Second Look
These are PROBABLE DEAD or have a mismatch. A developer should verify before deleting.

- [ ] `scripts/backup-before-repair.mjs`, `scripts/diagnose-broken-refs.mjs`, `scripts/repair-recipe-references.mjs` — these are a matched set of repair tools. Verify whether the broken-ref situation they were built to fix has been resolved. If yes, delete all three together.
- [ ] `scripts/migrate-to-master.mjs` and `scripts/link-users-to-master.mjs` — these two scripts form a sequential migration pair. Verify whether the master-layer migration has been fully applied in production. If complete, both can be deleted.
- [ ] `scripts/trim-demo-data.mjs` — verify whether demo data is now managed differently (e.g., from a seeded dump). If demo trimming is a recurring operation, add an npm script entry; if it was a one-time preparation, delete it.
- [ ] `.claude/agents/git-agent.md` — fully alive and correctly wired, but missing from the `§0.3` agent roster table in `copilot-instructions.md`. Add a row for it so new sessions know it exists.

### Investigate Before Deciding
These are INVESTIGATE tier. Do not delete without understanding the reference.

- [ ] `src/app/core/utils/gemini-shots.util.ts` — `getGeminiShots()` is exported but never imported outside the file. This means AI prompt history is written to localStorage but never read back into any flow. Either the read-back feature was planned but never built, or it was removed while the write side was left in. Decide whether to build the read-back UI, or remove `getGeminiShots()` and the `localStorage` write alongside it.
- [ ] `.claude/agents/qa-engineer.md` — contains the line "commit-to-github Phase 0 — the commit skill identifies which files need specs and invokes this agent." The `commit-to-github` skill is now deprecated. This reference is a stale workflow description. Update the trigger condition to reference `git-agent` instead, or remove the restriction entirely.
- [ ] `.claude/skills/interface-design/` — the skill is fully functional and invoked by five commands. However, there is no trigger line in `copilot-instructions.md §0` for it, meaning it will not auto-invoke from conversational prompts like "design this page." Add a trigger line such as: `**Interface design** [SHARED]: User asks to design, redesign, or improve a UI → invoke /init (or /audit, /critique, /extract, /status as appropriate).`
- [ ] `.claude/commands/reflect-add-tests.md` — a tool for building test suites for skills. Not referenced in any trigger. If the team uses `reflect` for skill iteration, this companion command needs a trigger in `copilot-instructions.md` (e.g., `/reflect add-tests`). If unused, safe to delete.
- [ ] `.claude/commands/sweep-stale-todos.md` — mentioned in `truly-open-tasks.md` as a pending update. Before touching it, check whether the update described there has been applied, then add a trigger entry so it auto-runs at session end.

### Do Not Touch
Items that appear potentially unused but should be kept — with a clear explanation of why.

- `scripts/log-server.js` — has an npm script entry (`npm run log-server`). Alive.
- `scripts/check-lucide-icons.mjs` — has an npm lint entry. Active code quality gate.
- `scripts/check-no-native-select.mjs` — has an npm lint entry. Active code quality gate.
- `.claude/commands/git.md` — thin wrapper redirecting to `git-agent.md`. Useful as a `/git` slash-command alias for Cursor users. Keep but consider adding it to the roster table.
- `src/app/core/utils/gemini-shots.util.ts` (the `addGeminiShot` export) — this half IS used by `ai-recipe-modal.component.ts`. Only the read side (`getGeminiShots`) is orphaned.
- All component SCSS files — they are scoped to their components. Every component in the project is alive, so all SCSS files are alive. No need to audit them individually.
