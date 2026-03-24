# Agent Guide: foodVibe1.0

Read this and `.claude/copilot-instructions.md` at the start of every task.

## Core Rules & Source of Truth
- **Primary Instructions**: `.claude/copilot-instructions.md` — single source of truth for all project rules. New rules from the user go there.
- **Skill triggers**: All defined in `.claude/copilot-instructions.md` §0. Load skills on-demand at point of need — do not pre-load.
- **When adding or editing Lucide icons** in any template → read `.claude/copilot-instructions.md` Section 8 and apply it.
- **Active Tasks**: `.claude/todo.md` (update status after each sub-task).
- **Plans**: All plans in project `plans/` only (e.g. `plans/NNN-slug.plan.md`). When the user says "save the plan" after confirming, read `.claude/skills/save-plan/SKILL.md` and follow it.

## Agent System (`.claude/agents/`) — Claude Code only
| Agent | File | Invoke when |
|-------|------|-------------|
| Team Leader | `team-leader.md` | Task spans >2 subsystems; agents conflict; progress report needed |
| Software Architect | `software-architect.md` | PRD exists and needs HLD; architecture trade-offs to evaluate |
| Product Manager | `product-manager.md` | Planning a new feature; writing a plan file; scoping work |
| Breadcrumb Navigator | `breadcrumb-navigator/SKILL.md` | New `pages/<x>/` or app subtree; structural changes; after update-docs |
| QA Engineer | `qa-engineer.md` | Spec gaps; diagnosing failing tests; E2E creation |
| Security Officer | `security-officer.md` | Post-feature review of auth/storage/route changes; pre-deploy; security consult |
| UI Inspector | `ui-inspector.md` | Visual QA on explicit request or when team-leader/qa-engineer needs visual verification |

## Skills (`.claude/skills/`)
- save-plan — User says "save the plan" after confirming
- commit-to-github — User says commit, push, save to GitHub — read skill first; no git writes until approval. Context-aware: auto-detects main-repo vs worktree. Args: `c` = checkpoint/push, `s` = ship (auto light/full/worktree), `sl` = force ship-light, `sf` = force ship-full
- deploy-github-pages — User says deploy, publish app, GitHub Pages
- cssLayer — Before creating or editing any `.scss`/`.css` in `src/`
- add-recipe — User adds recipe/dish from image or text — Step 3 confirmation before any write
- github-sync — Start of session, after time away
- quick-chat — User invokes `/quick-chat` → skip handoff check and GitHub sync (mandatory gate reads remain)
- techdebt — End of session, before PRs
- update-docs — After completing features
- elegant-fix — After a fix that feels hacky
- angularComponentStructure — Creating/refactoring Angular components
- auth-and-logging — Routes, auth, persistence, HTTP, CRUD, logging
- session-end routing — see copilot-instructions.md Section 0
- Hebrew→English key flows — When a plan adds or changes flows where the user enters a Hebrew value that must have an English key → apply `.claude/copilot-instructions.md` Section 7.1–7.2

## Commands (`.claude/commands/`)
| Command | Purpose |
|---------|---------|
| `test-pr-review-merge.md` | Full CI: test, PR, review, merge to main |
| `validate-agent-refs.md` | Health check: verify all agent file cross-references are valid |

**Which flow to use?** `commit-to-github` = organize changes into commits with approval. `test-pr-review-merge` = full CI pipeline: test, PR, review, merge.

## Preflight Checklist
Before starting any task:
1. Read this file and `.claude/copilot-instructions.md` (mandatory).
   - If the first user message is a command/task, confirm `Yes chef!` and continue handling it in the same turn (do not hard-stop after confirmation).
2. Check `notes/session-handoffs/` for a handoff file from the last 3 days. If found, read it and summarize key context in your first response.
3. Check `.claude/todo.md` for related pending work.
4. Read `breadcrumbs.md` in the target directory before changing it (if present). If the task adds a new `pages/<feature>/` or top-level subtree under `src/app/`, add or refresh `breadcrumbs.md` for that hub — see **UI, CSS & Folder Structure** in `.claude/copilot-instructions.md`.
5. If touching SCSS/CSS: read `.claude/skills/cssLayer/SKILL.md`.
6. If creating/refactoring components: read `.claude/skills/angularComponentStructure/SKILL.md`.
7. **[Claude Code only]** Check the current git branch (`git branch --show-current`). Never commit to `main` directly. If writing code on `main`, run `git checkout -b feat/<name>` or `fix/<name>` first.

## Autonomous Permissions
- **Terminal**: Non-destructive commands (`npm test`, `ng build`, `ls`, `mkdir`) allowed.
- **File System**: Create components/services per approved plans without per-file confirmation.
- **Self-Correction**: If build/test fails, diagnose and attempt fix before escalating.

## Secrets & .gitignore
- Never commit secrets; use `.env` only; keep `.env*` in `.gitignore`. Do not commit local config or keys.

## Technical Guardrails
- Angular 19 (Signals), TypeScript strict. `app-` prefix for collision-prone selectors; file names match selector. Path aliases: `@services/*`, `@models/*`, `@directives/*`.

## Operational Workflow
1. **Recon**: Search codebase for existing patterns.
2. **Plan**: Write `plans/XXX.plan.md` with "Critical Questions" section. If the plan touches `.scss`/`.css`, add a step: read and apply `.claude/skills/cssLayer/SKILL.md` before writing styles. **STOP** — no `src/` changes until approved.
3. **Approval**: Wait for explicit user confirmation.
4. **Execute**: Multi-file updates; keep files under ~300 lines.
5. **Audit**: Verify the build compiles (`ng build` if uncertain). Do NOT run the full test suite here — it runs only in the commit-to-github flow or when the user explicitly asks.
5.5 **Tech debt**: When considering a task complete, read `.claude/skills/techdebt/SKILL.md`. Run the analysis scoped to files changed this task. Fix critical/high items or attach a short report and ask whether to fix or proceed.
6. **Branch**: Not on `main`; use `feat/` or `fix/` branch.
7. **Commit/push**: User asks to commit or push → read `.claude/skills/commit-to-github/SKILL.md`. The skill auto-detects context (main repo vs worktree) and routes accordingly. **[C]** = checkpoint on main repo, or commit+push on worktree. **[S]** = ship with auto-light (docs/skills/configs) or auto-full (.ts/.scss/Angular). Shortcuts: `commit c` → [C]; `commit s` → [S] auto-detect; `commit sl` → force light; `commit sf` → force full. Get approval before any git write.
