# Claude Code Workflow Toolkit

## What this is

A portable, copy-paste-ready multi-agent Claude Code system extracted from a production project. Dropping this folder into any new repo gives you a complete planning→execution pipeline: agent personas, quality gates, slash commands, skill-based workflows, and a session lifecycle — all pre-wired and ready to customize.

---

## Setup (5 steps)

1. **Copy these files to your project root:**
   ```
   CLAUDE.md
   agent.md
   .mcp.json
   .claude/
   ```

2. **Find and replace all placeholders** (see Placeholder Reference below). Every `[PLACEHOLDER]` must be filled before the system is operational.

3. **Customize `[PROJECT_SEAMS]`** in agent files and skills — replace with the actual directory paths that form your project's architectural seams (e.g., `src/components/`, `src/services/`).

4. **Add your framework standards** to `.claude/standards-FRAMEWORK.md` — fill in your specific framework version, reactivity model, component rules, and test standards.

5. **Add your domain constants** to `.claude/standards-domain.md` — use `.claude/standards-domain.EXAMPLE.md` as a structural reference. Key sections: canonical value tables, icon registries, i18n keys.

---

## Placeholder Reference

Replace every `[PLACEHOLDER]` with your project-specific values:

| Placeholder | What to put here | Example |
|---|---|---|
| `[PROJECT_NAME]` | Your project's display name | `MyApp 2.0` |
| `[PROJECT_ROOT]` | Absolute path to your project root | `C:/dev/myapp` |
| `[CLAUDE_DATA_DIR]` | Path to your Claude data directory | `C:/Users/yourname/.claude` |
| `[FRAMEWORK]` | Your frontend framework name + version | `React 18`, `Vue 3`, `Angular 19` |
| `[FRAMEWORK_VERSION]` | Framework version number only | `18`, `3`, `19` |
| `[SRC_ROOT]` | Source root relative path | `src/`, `src/app/`, `app/` |
| `[BUILD_OUTPUT]` | Build output folder path | `dist/myapp/browser`, `build/` |
| `[BUILD_COMMAND]` | Build command | `npm run build`, `yarn build` |
| `[TEST_COMMAND]` | Test runner command | `npm test`, `yarn test` |
| `[TEST_FRAMEWORK]` | Testing framework in use | `Jest/RTL`, `Vitest`, `Jasmine/Karma` |
| `[DEV_PORT]` | Local dev server port | `3000`, `4200`, `5173` |
| `[WORKTREE_PORT]` | Parallel worktree dev port | `3001`, `4201` |
| `[PERSONA_PREFIX]` | Agent acknowledgment prefix | `Yes chef!`, `Roger that!`, `On it.` |
| `[PERSONA_PREFIX_NEG]` | Negative acknowledgment prefix (e.g., "No [word]!" from above) | `No chef!`, `Negative.` |
| `[PERSONA_ROLE]` | Agent role description | `Senior Full-Stack Engineer (E-commerce Specialist)` |
| `[DOMAIN_SERVICE_NAME]` | Key domain service class names | `CartService`, `UserProfileService` |
| `[AUTH_FILE]` | Auth/crypto file name | `auth-crypto.ts`, `auth-utils.ts` |
| `[PROJECT_SEAMS]` | Comma-separated architectural seam paths | `src/components/, src/services/, src/pages/` |
| `[BASE_HREF]` | Base href for deployment | `/myapp/`, `/` |
| `[BACKEND_STACK]` | Backend technology stack | `Node.js / Express / PostgreSQL` |
| `[DB_ENTITY_TYPE]` | Database entity type discriminator field | `entityType`, `type`, `kind` |
| `[USER_PERSONA]` | User story persona | `a developer`, `a customer`, `a manager` |

---

## File Map

| File | Status | What to customize |
|---|---|---|
| `README.md` | TEMPLATE | Update with your project details |
| `CLAUDE.md` | TEMPLATE | Persona prefix, skill names |
| `agent.md` | TEMPLATE | Persona, skill names, seams |
| `.mcp.json` | PORTABLE | Add/remove MCP servers as needed |
| `.claude/settings.json` | TEMPLATE | Replace path placeholders |
| `.claude/settings.local.json` | TEMPLATE | Replace paths, add project-specific allow rules |
| `.claude/copilot-instructions.md` | TEMPLATE | Persona, framework, domain triggers |
| `.claude/standards-git.md` | PORTABLE | Works as-is |
| `.claude/standards-security.md` | TEMPLATE | Adapt security rules to your stack |
| `.claude/standards-FRAMEWORK.md` | TEMPLATE | Fill in your framework's rules completely |
| `.claude/standards-backend.md` | TEMPLATE | Fill entity registry, adapt API contract |
| `.claude/standards-domain.EXAMPLE.md` | EXAMPLE | Reference only — create your own `standards-domain.md` |
| `.claude/agents/team-leader.md` | TEMPLATE | Persona, seams |
| `.claude/agents/software-architect.md` | TEMPLATE | Stack, seams, domain references |
| `.claude/agents/product-manager.md` | TEMPLATE | Domain triggers |
| `.claude/agents/qa-engineer.md` | TEMPLATE | Framework, test tooling |
| `.claude/agents/security-officer.md` | TEMPLATE | Auth file names |
| `.claude/agents/git-agent.md` | TEMPLATE | Project name |
| `.claude/agents/breadcrumb-navigator.md` | TEMPLATE | Seam paths |
| `.claude/commands/plan-implementation.md` | PORTABLE | Works as-is |
| `.claude/commands/execute-it.md` | TEMPLATE | Backend impact check section |
| `.claude/commands/test-pr-review-merge.md` | TEMPLATE | Test/build commands |
| `.claude/commands/validate-agent-refs.md` | TEMPLATE | Update skill/agent inventory |
| `.claude/commands/git.md` | PORTABLE | Works as-is |
| `.claude/commands/quick-chat.md` | PORTABLE | Works as-is |
| `.claude/commands/sweep-stale-todos.md` | PORTABLE | Works as-is |
| `.claude/commands/audit.md` | PORTABLE | Works as-is |
| `.claude/commands/critique.md` | PORTABLE | Works as-is |
| `.claude/commands/extract.md` | PORTABLE | Works as-is |
| `.claude/commands/status.md` | PORTABLE | Works as-is |
| `.claude/commands/init.md` | PORTABLE | Works as-is |
| `.claude/skills/github-sync/SKILL.md` | PORTABLE | Works as-is |
| `.claude/skills/session-handoff/SKILL.md` | PORTABLE | Works as-is |
| `.claude/skills/quick-chat/SKILL.md` | PORTABLE | Works as-is |
| `.claude/skills/save-plan/SKILL.md` | PORTABLE | Works as-is |
| `.claude/skills/techdebt/SKILL.md` | TEMPLATE | Replace framework-specific style rules |
| `.claude/skills/elegant-fix/SKILL.md` | TEMPLATE | Replace framework-specific patterns |
| `.claude/skills/update-docs/SKILL.md` | TEMPLATE | Replace seam paths |
| `.claude/skills/finalize-docs/SKILL.md` | TEMPLATE | Replace seam paths |
| `.claude/skills/breadcrumb-navigator/SKILL.md` | TEMPLATE | Replace seam paths |
| `.claude/skills/worktree-setup/SKILL.md` | PORTABLE | Cross-platform port commands included |
| `.claude/skills/worktree-session-end/SKILL.md` | PORTABLE | Cross-platform port commands included |
| `.claude/skills/auth-and-logging/SKILL.md` | TEMPLATE | Replace auth file names, service names |
| `.claude/skills/auth-crypto/SKILL.md` | TEMPLATE | Replace auth file name |
| `.claude/skills/deploy-github-pages/SKILL.md` | TEMPLATE | Replace project name, paths |
| `.claude/skills/ui-styles/SKILL.md` | TEMPLATE | Replace framework CSS rules |
| `.claude/skills/FRAMEWORK-component/SKILL.md` | TEMPLATE | Fill in your framework's component rules |
| `.claude/skills/FRAMEWORK-pipe-logic/SKILL.md` | TEMPLATE | Fill in your framework's pipe/transform rules |
| `.claude/skills/domain-feature/SKILL.md.EXAMPLE` | EXAMPLE | Reference only — create your own domain skills |
| `.claude/instructions/validation-checklist.md` | PORTABLE | Works as-is |
| `.claude/references/hld-template.md` | TEMPLATE | Adapt data flow section |
| `.claude/references/prd-template.md` | TEMPLATE | Adapt user stories, domain notes |
| `.claude/references/team-leader-output-template.md` | PORTABLE | Works as-is |
| `.claude/prompts/deploy-angular-github.md` | TEMPLATE | Replace project name, paths |
| `.claude/workflows/deploy.yml` | TEMPLATE | Replace project name, paths, Node version |

---

## Workflow Overview

The system runs a 5-stage pipeline for every feature:

1. **Session Boot** — Agent reads `CLAUDE.md` → `agent.md` → `copilot-instructions.md`. GitHub sync runs once per day. Session handoff from previous session is surfaced.

2. **Plan** — User presents an architectural brief. `/plan-implementation` scans the codebase, verifies the brief against reality, flags gaps, and outputs a merged execution plan. Hard stop — waits for user approval.

3. **Verify** — User reviews the plan, resolves flagged conflicts, and says `execute-it`.

4. **Execute** — `/execute-it` runs atomically: one logical unit per commit. Stops only on new, unexpected surprises. Build verification after each phase.

5. **Close** — `/worktree-session-end` or `/session-handoff` produces a structured summary. Tech debt audit optional before PR. `/test-pr-review-merge` handles full CI → PR → merge.

---

## Agent Roster

| Agent | File | When to invoke |
|---|---|---|
| Team Leader | `team-leader.md` | Task spans >2 subsystems; agents conflict; progress report needed |
| Software Architect | `software-architect.md` | PRD exists and needs HLD; architecture trade-offs to evaluate |
| Product Manager | `product-manager.md` | Planning a new feature; writing a plan file; scoping work |
| Breadcrumb Navigator | `breadcrumb-navigator.md` | New routed area or subtree; structural changes; after update-docs |
| QA Engineer | `qa-engineer.md` | Spec gaps; diagnosing failing tests; E2E creation |
| Security Officer | `security-officer.md` | Post-feature review of auth/storage/route changes; pre-deploy |
| Git Agent | `git-agent.md` | All commit/push/PR/merge operations |

---

## Slash Commands

| Command | What it does |
|---|---|
| `/plan-implementation` | Scan codebase, verify brief against reality, output merged execution plan — read-only phase |
| `/execute-it` | Execute the verified plan atomically — full write phase |
| `/test-pr-review-merge` | Full CI: run tests → build → push → PR → review → merge |
| `/validate-agent-refs` | Health check: verify all agent file cross-references are valid |
| `/git` | Git Agent — all commit/push/PR/batch operations |
| `/quick-chat` | Fast single-turn interaction, skips planning gates |
| `/sweep-stale-todos` | Archive completed plan sections from todo.md |
| `/audit` | Check code against design system for violations |
| `/critique` | Design-lead review: find what defaulted, rebuild with craft |
| `/extract` | Extract design patterns from existing code |
| `/status` | Show current design system state |
| `/init` | Build UI with craft and consistency |

---

## What to build next (project-specific skills)

The `domain-feature/SKILL.md.EXAMPLE` file shows the structural pattern for domain-specific skills. The original was an `add-recipe` skill with phase-based execution, hard pause gates before writes, and canonical value validation.

**To add your own domain skill:**
1. Copy `domain-feature/SKILL.md.EXAMPLE` to `.claude/skills/<your-skill-name>/SKILL.md`
2. Replace the domain logic with your project's equivalent
3. Keep the phase structure: Extract → Validate → Confirm (hard pause) → Write
4. Register the trigger in `.claude/copilot-instructions.md §0`

The phase + hard-pause pattern prevents agents from writing data without user confirmation — critical for any skill that modifies persistent state.
