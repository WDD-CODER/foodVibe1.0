# Agent Guide: foodVibe1.0 (Agent Optimized)

This is the primary entry point for AI Agents. Embark on every task by reading this and `.assistant/copilot-instructions.md`.

## Core Rules & Source of Truth
- **Primary Instructions**: `.assistant/copilot-instructions.md` — this is the **single source of truth** for all project rules. Read it at the start of every task.
- **Rule Location**: When you receive a new project rule from the user, add it to `.assistant/copilot-instructions.md`. Do **not** create rules in `.cursor/rules/` — all rules live in the copilot-instructions file.
- **Active Tasks**: `.assistant/todo.md` (Update status after every sub-task).
- **Planning**: Mandatory `plans/` folder usage. All plans must be saved to the project's `plans/` folder (e.g. `plans/004-feature.plan.md`). NEVER use Cursor's default `~/.cursor/plans/`. Use the `write` tool to create plan files directly. When the user says **"save the plan"** after confirming a plan, apply the **save-plan** skill (`.assistant/skills/save-plan/`): determine the next plan number from existing files in `plans/`, then write to `plans/NNN-slug.plan.md` or `plans/NNN-R-slug.plan.md` for refactors. Wait for explicit user confirmation before execution.

## Agent System

This project uses specialized agent personas for complex tasks. Read the relevant agent file before delegating work.

### Agent Files (`.assistant/agents/`)
| Agent | File | Purpose |
|-------|------|---------|
| Team Leader | `team-leader.md` | Orchestrate multi-agent tasks, resolve conflicts |
| Software Architect | `software-architect.md` | Architecture decisions, HLD documents |
| Product Manager | `product-manager.md` | PRDs, feature scoping, plans/ integration |
| Breadcrumb Navigator | `breadcrumb-navigator.md` | Codebase documentation & navigation |
| QA Engineer | `qa-engineer.md` | Testing strategy, spec coverage, E2E |

### Skills (`.assistant/skills/`)
| Skill | Folder | Purpose |
|-------|--------|---------|
| Save Plan | `save-plan/` | When user says "save the plan" after confirming: determine next plan number from `plans/`, write to `plans/NNN-slug.plan.md` or `plans/NNN-R-slug.plan.md` for refactors |
| GitHub Sync | `github-sync/` | Pull recent GitHub activity for context |
| Commit to GitHub | `commit-to-github/` | Safe branch/commit workflow; present plan as tree, then execute after approval |
| Tech Debt | `techdebt/` | Find duplicates, dead code, TODO audit |
| Update Docs | `update-docs/` | Refresh all project documentation |
| Elegant Fix | `elegant-fix/` | Refine hacky solutions into clean ones |

### Commands (`.assistant/commands/`)
| Command | File | Purpose |
|---------|------|---------|
| Test-PR-Merge | `test-pr-review-merge.md` | Full CI flow: test, PR, review, merge |

### Using Breadcrumbs
Before making changes to any directory, check for a `breadcrumbs.md` file and read it for context about file purposes, architecture, and conventions.

## Autonomous Permissions (Agent Mode)
- **Terminal**: You are authorized to run non-destructive commands (`npm test`, `ng build`, `ls`, `mkdir`) autonomously.
- **File System**: You may create new components/services following the established architecture without individual confirmation, provided they are in the approved `plans/`.
- **Self-Correction**: If a build or test fails, autonomously diagnose and attempt a fix before escalating.

## Secrets, .env & .gitignore
- **Never commit secrets**: API keys, tokens, and any secrets must **never** be uploaded to GitHub or any remote. They belong **only** in `.env` (or environment-specific env files). Code must read them from the environment, not from committed files.
- **Keep .env out of Git**: `.env` and `.env.*` (e.g. `.env.local`) must be listed in `.gitignore`. Never add them to the repo.
- **Sensitive/end files**: Any file that must not be in the repo (local config, keys, etc.) must be added to `.gitignore` — do not commit such files to GitHub.

## Technical Guardrails
- **Tech Stack**: Angular 19 (Renaissance/Signals), TypeScript (Strict). See `project-plan.md` for scope.
- **Naming Convention**: Strict `app-` prefix for collision-prone selectors; multi-word kebab-case otherwise. File names match selector.
- **Paths**: Prefer path aliases `@services/*`, `@models/*`, `@directives/*` as defined in `tsconfig.json`.

## Operational Workflow
1. **Recon**: Search @Codebase to see if a similar pattern exists.
2. **Plan (The Gate)**:
   - Write `plans/XXX.plan.md`.
   - **MUST** include a "Questions for user" (or "Critical Questions") section.
   - **STOP**. Do not modify `src/` until approved.
3. **Approval**: Wait for explicit user confirmation.
4. **Execute**: Only then use @Composer for multi-file updates. Keep files under ~300 lines; refactor when needed.
5. **Audit**: Run tests and ask for the mandatory `.spec.ts` confirmation.
6. **Branch Check**: Ensure you are not on `main`. Create a `feat/` branch if necessary.
