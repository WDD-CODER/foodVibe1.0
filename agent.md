# Agent Guide: foodVibe1.0

Read this and `.claude/copilot-instructions.md` at the start of every task.

## Core Rules & Source of Truth
- **Primary Instructions**: `.claude/copilot-instructions.md` — single source of truth for all project rules. New rules from the user go there. The `.cursor/rules/*.mdc` files are Cursor-specific pointers that reinforce triggers; canonical rules live in copilot-instructions.
- **When adding or editing Lucide icons** in any template → read `.claude/copilot-instructions.md` Section 8 and apply it.
- **Active Tasks**: `.claude/todo.md` (update status after each sub-task).
- **Plans**: All plans in project `plans/` only (e.g. `plans/NNN-slug.plan.md`). When the user says "save the plan" after confirming, read `.claude/skills/save-plan/SKILL.md` and follow it.

## Agent System (`.claude/agents/`)
- team-leader.md — Orchestrate multi-agent tasks, resolve conflicts
- software-architect.md — Architecture, HLD documents
- product-manager.md — PRDs, feature scoping, plans/
- breadcrumb-navigator — Workflow: `.claude/skills/breadcrumb-navigator/SKILL.md`; persona: `.claude/agents/breadcrumb-navigator.md`
- qa-engineer.md — Testing, specs, E2E

## Skills (`.claude/skills/`)
- save-plan — User says "save the plan" after confirming
- commit-to-github — User says commit, push, save to GitHub — read skill first; no git writes until approval
- deploy-github-pages — User says deploy, publish app, GitHub Pages
- cssLayer — Before creating or editing any `.scss`/`.css` in `src/`
- add-recipe — User adds recipe/dish from image or text — Step 3 confirmation before any write
- github-sync — Start of session, after time away
- techdebt — End of session, before PRs
- update-docs — After completing features
- elegant-fix — After a fix that feels hacky
- angularComponentStructure — Creating/refactoring Angular components
- auth-and-logging — Routes, auth, persistence, HTTP, CRUD, logging
- session-handoff — User says "wrap up" / "session end" while on `main` (no worktree) — structured session summary for next session. When inside a worktree, `end-session` runs instead.
- end-session — User says "done", "end session", "I'm done", "wrap up", "finish up" while on a non-main branch → read `.claude/skills/end-session/SKILL.md` immediately. Replaces session-handoff when in a worktree.
- Hebrew→English key flows — When a plan adds or changes flows where the user enters a Hebrew value that must have an English key → apply `.claude/copilot-instructions.md` Section 7.1–7.2

## Commands (`.claude/commands/`)
| Command | Purpose |
|---------|----------|
| test-pr-review-merge.md | Full CI: test, PR, review, merge |
| validate-agent-refs.md | Periodic health check: verify all agent file cross-references are valid |

**Which flow to use?** `commit-to-github` = organize changes into branches and commits. `test-pr-review-merge` = full CI pipeline: test, create PR, review, merge to main.

## Preflight Checklist
Before starting any task:
1. Read this file and `.claude/copilot-instructions.md` (mandatory).
2. Check `notes/session-handoffs/` for a handoff file from the last 3 days. If found, read it and summarize key context in your first response.
3. Check `.claude/todo.md` for related pending work.
4. Read `breadcrumbs.md` in the target directory before changing it (if present). If the task adds a new `pages/<feature>/` or top-level subtree under `src/app/`, add or refresh `breadcrumbs.md` for that hub — see **UI, CSS & Folder Structure** in `.claude/copilot-instructions.md`.
5. If touching SCSS/CSS: read `.claude/skills/cssLayer/SKILL.md`.
6. If creating/refactoring components: read `.claude/skills/angularComponentStructure/SKILL.md`.
7. **[Claude Code only]** Before any work, check the current git branch (`git branch --show-current`).
   If on `main` or `master` — follow the Branch Gate in `CLAUDE.md`: ask the user whether to create a worktree (multi-agent/complex) or proceed directly (quick task). When creating a worktree, follow Worktree Provisioning in `CLAUDE.md` in exact order (prune → create → .env copy → npm install → port assignment).

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
4.5 **UI Inspect**: After structural `.html`/`.scss` edits → invoke `ui-inspector` agent (subagent_type: "ui-inspector", model: "haiku") with: changed files, page URL, worktreeRoot, navigation hint. Fix issues; confirm with re-run. Skip: aesthetic-only changes or explicit user opt-out.
5. **Audit**: Verify the build compiles (`ng build` if uncertain). Do NOT run the full test suite here — it runs only in the commit-to-github flow (Phase 0) or when the user explicitly asks.
5.5 **Tech debt**: Before considering the task done (or before suggesting commit), read `.claude/skills/techdebt/SKILL.md`. Run the analysis; fix critical/high items or attach a short tech-debt report and ask whether to fix or proceed. If the user later runs commit-to-github in the same session, Phase 0 of that skill will use this report (no second techdebt run).
6. **Branch**: Not on `main`; use `feat/` branch if needed.
7. **Commit/push**: User asks to commit or push → read `.claude/skills/commit-to-github/SKILL.md` and follow all phases in order. Get approval before any git write.
