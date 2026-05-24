# Changelog

All notable changes to this project will be documented in this file.

## [0.0.0.1] - 2026-05-24

### Added

- **Claude Workflow SDK** (`claude-workflow-sdk/`) — portable multi-agent Claude Code workflow system that can be dropped into any project and initialized with `/init-repo`
  - 10 agents: Team Leader, Software Architect, Product Manager, QA Engineer, Security Officer, Git Agent, Mobile Flow Auditor, Render Flow Auditor, End-of-Session Agent, Reflect Agent
  - 34 commands covering the full lifecycle: plan, execute, fix, refactor, security, audit, ship, end-session
  - 15 universal skills plus 6 project-specific `.EXAMPLE` skills (domain feature, Angular component structure, auth patterns, crypto, deploy)
  - 6 standards files: git, security, backend, scheduled-reporting, domain (template), and framework (template)
  - 8 hook scripts: session-startup, branch-guard, context-monitor, session-manifest, pre-compact-reminder, handoff-check, tool-failure-hook, session-manifest-ship
  - Config templates: CLAUDE.md, agent.md, .mcp.json (GitHub MCP wired, MemPalace opt-in), settings.json, settings.local.json
  - `/init-repo` 7-phase wizard: scans project, fills 14 placeholders, offers Mode A (auto), B (walk-through), or C (config file), generates SETUP-LOG.md
  - `SDK-VERSION` file, README with quick-start and placeholder reference table
