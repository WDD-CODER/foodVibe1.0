# Changelog

All notable changes to FoodVibe are documented here.

## [0.1.0.0] - 2026-04-27

### Added
- **User Management card** (Plan 288) — admin-only panel in Metadata Manager for viewing registered users and deleting their data; guards non-admins with a lock state
- **Nutrition filter in Inventory sidebar** — filter products by nutrition tags; fixes leaf-off icon crash when filter panel is open
- **MongoDB nutrition patching scripts** — batch-patch nutrition fields on Atlas products and demo catalog; catalog-review output updated
- **Admin API routes** — `GET /admin/users` and `DELETE /admin/users/:id` with role-gated middleware; `UserAdminService` and `AdminUser` model wired in Angular

### Fixed
- `logging.service.ts` — `logServerUrl` removed from default `environment.ts`; eliminates `ERR_CONNECTION_REFUSED` console noise on plain `ng serve` (log server URL retained in `environment.local.ts` for intentional use)

### Changed
- Claude configuration: skill routing rules, REV3 token-opt, merge conflict guard, session retrospective, failure-log entries, standards-domain updates, execute-it command revision

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
