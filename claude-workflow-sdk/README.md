# Claude Workflow SDK

A portable multi-agent Claude Code workflow system. Drop this folder into any project and run `/init-repo` to get a fully-wired AI development workflow in one command.

## What's included

- **10 agents** — Team Leader, Software Architect, Product Manager, QA Engineer, Security Officer, Git Agent, Mobile Flow Auditor, Render Flow Auditor, End-of-Session Agent, Reflect Agent
- **34 commands** — Full lifecycle: plan, execute, fix, refactor, security, audit, ship, end-session
- **19 universal skills** — cssLayer, techdebt, elegant-fix, save-plan, breadcrumb-navigator, context-management, nightly-audit, worktree-setup, preflight, session-handoff, quick-chat, and more
- **6 `.EXAMPLE` skills** — Domain feature, Angular component structure, Angular pipe/directive, auth patterns, crypto, GitHub Pages deploy (copy and adapt)
- **6 standards files** — FRAMEWORK (template), backend, security, git, domain (empty template), scheduled-reporting
- **Hook scripts** — session-startup, branch-guard, context-monitor, session-manifest, pre-compact-reminder, handoff-check
- **Config templates** — CLAUDE.md, agent.md, .mcp.json, settings.json, settings.local.json, copilot-instructions.md
- **Reference templates** — HLD, PRD, team-leader output, validation checklist, GitHub Actions deploy workflow

## Quick start

1. Copy `claude-workflow-sdk/` into your project root
2. Open Claude Code in your project
3. Run `/init-repo`
4. Follow the 5-phase setup wizard

The wizard will:
- Detect your framework, build commands, and project structure
- Fill all `[PLACEHOLDER]` values automatically (or walk through them with you)
- Wire up hooks, agents, and skills
- Write a `SETUP-LOG.md` showing exactly what was configured

## SDK version

See `SDK-VERSION` for the version number and extraction date.

## Manual placeholder reference

After `/init-repo`, search for any remaining `[PLACEHOLDER]` markers:

```bash
grep -r "\[PLACEHOLDER\]" .claude/ CLAUDE.md agent.md
```

Common placeholders filled by `/init-repo`:

| Placeholder | Description |
|-------------|-------------|
| `[PROJECT_NAME]` | Repository/project name |
| `[PROJECT_ROOT]` | Absolute path to project root |
| `[CLAUDE_DATA_DIR]` | Claude config directory (`~/.claude` on Unix, `%APPDATA%\Claude` on Windows) |
| `[FRAMEWORK]` | Frontend framework (angular, react, vue, next, etc.) |
| `[BUILD_COMMAND]` | Build command (e.g. `ng build`, `npm run build`) |
| `[TEST_COMMAND]` | Test command (e.g. `npm test`, `ng test`) |
| `[DEV_PORT]` | Dev server port (e.g. 4200, 3000, 5173) |
| `[WORKTREE_PORT]` | Base port for worktrees (DEV_PORT + 1) |
| `[SRC_ROOT]` | Source root directory (e.g. `src/`, `app/`) |
| `[BUILD_OUTPUT]` | Build output directory (e.g. `dist/myapp`) |
| `[AUTH_FILE]` | Primary auth file path |
| `[BACKEND_STACK]` | Backend technology description |

## MemPalace (optional)

MemPalace is a semantic memory system for Claude Code. It is **not pre-wired** in this SDK — you wire it in when you're ready. During `/init-repo` Phase 5d, the wizard will walk you through:

1. Installing MemPalace (`pip install mempalace`)
2. Enabling the `.mcp.json` entry (remove the `_disabled` prefix)
3. Adding MemPalace permissions to `settings.json`

Until MemPalace is configured, all `mempalace_search()` calls are silently skipped.

## Updating the SDK

This SDK is a personal tool — there is no automated update mechanism. To update:

1. Pull the latest `claude-workflow-sdk/` from your source
2. Compare changed files manually
3. Apply updates to your installed copy, preserving your project-specific customizations

Check `SDK-VERSION` to know which version is installed in each project.
