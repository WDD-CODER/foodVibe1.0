# Agent Guide: foodVibe1.0

Read this and `.assistant/copilot-instructions.md` at the start of every task.

## Core Rules & Source of Truth
- **Primary Instructions**: `.assistant/copilot-instructions.md` — single source of truth for all project rules. New rules from the user go there. The `.cursor/rules/*.mdc` files are Cursor-specific pointers that reinforce triggers; canonical rules live in copilot-instructions.
- **When adding or editing Lucide icons** in any template → read `.assistant/copilot-instructions.md` Section 8 and apply it.
- **Active Tasks**: `.assistant/todo.md` (update status after each sub-task).
- **Plans**: All plans in project `plans/` only (e.g. `plans/NNN-slug.plan.md`). When the user says "save the plan" after confirming, read `.assistant/skills/save-plan/SKILL.md` and follow it.

## Agent System (`.assistant/agents/`)
| Agent | File | Purpose |
|-------|------|---------|
| Team Leader | `team-leader.md` | Orchestrate multi-agent tasks, resolve conflicts |
| Software Architect | `software-architect.md` | Architecture, HLD documents |
| Product Manager | `product-manager.md` | PRDs, feature scoping, plans/ |
| Breadcrumb Navigator | `breadcrumb-navigator.md` | Codebase docs, breadcrumbs.md |
| QA Engineer | `qa-engineer.md` | Testing, specs, E2E |

## Skills (`.assistant/skills/`)
| Skill | When to use |
|-------|--------------|
| save-plan | User says "save the plan" after confirming |
| commit-to-github | User says commit, push, save to GitHub — read skill first; no git writes until approval |
| cssLayer | Before creating or editing any `.scss`/`.css` in `src/` |
| add-recipe | User adds recipe/dish from image or text — Step 3 confirmation before any write |
| github-sync | Start of session, after time away |
| techdebt | End of session, before PRs |
| update-docs | After completing features |
| elegant-fix | After a fix that feels hacky |
| angularComponentStructure | Creating/refactoring Angular components |
| auth-and-logging | Routes, auth, persistence, HTTP, CRUD, logging |

## Commands (`.assistant/commands/`)
| Command | Purpose |
|---------|----------|
| test-pr-review-merge.md | Full CI: test, PR, review, merge |

## Breadcrumbs
Before changing a directory, check for `breadcrumbs.md` and read it.

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
2. **Plan**: Write `plans/XXX.plan.md` with "Critical Questions" section. If the plan touches `.scss`/`.css`, add a step: read and apply `.assistant/skills/cssLayer/SKILL.md` before writing styles. **STOP** — no `src/` changes until approved.
3. **Approval**: Wait for explicit user confirmation.
4. **Execute**: Multi-file updates; keep files under ~300 lines.
5. **Audit**: Run tests; confirm `.spec.ts` coverage.
5.5 **Tech debt**: Before considering the task done (or before suggesting commit), read `.assistant/skills/techdebt/SKILL.md`. Run the analysis; fix critical/high items or attach a short tech-debt report and ask whether to fix or proceed.
6. **Branch**: Not on `main`; use `feat/` branch if needed.
7. **Commit/push**: User asks to commit or push → read `.assistant/skills/commit-to-github/SKILL.md`, follow phases, get approval before any git write.
