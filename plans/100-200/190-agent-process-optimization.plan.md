# Plan 190 — Agent Process Optimization

## Problem Statement

The agent guidance system (28 files, ~33K tokens total) works but has three scaling problems:

1. **Token waste** — ~4,238 tokens loaded on every session start (mandatory). Skills and agents add 400-2,500 each on-demand. Redundancy between `agent.md`, `CLAUDE.md`, and `copilot-instructions.md` inflates cost. Agent persona files embed verbose templates and code examples that could be leaner.
2. **No MCP automation** — Every workflow (commit, techdebt, PR, validation, sync) relies on the agent manually executing shell commands. No MCPs are configured despite Cursor supporting them and GitLens MCP already being installed.
3. **Broken reactive loop** — Session handoffs exist as a skill but `notes/session-handoffs/` is empty (never used). Breadcrumbs are maintained manually. `todo.md` accumulates stale items. There is no enforcement that session-start or session-end flows actually run.

Plan 184 (Agent System Refactor) fixes broken references and contradictions. This plan builds on that clean foundation.

---

## Pillar 1: Token Reduction

### Current token budget

- **Mandatory (every session):** `agent.md` (~1,302) + `copilot-instructions.md` (~2,936) = **~4,238 tokens**
- **CLAUDE.md:** ~833 tokens (largely duplicates `agent.md` bootstrap)
- **5 Cursor rules (alwaysApply):** ~500 tokens (loaded by Cursor on every prompt)
- **Effective boot cost:** ~5,571 tokens before any work begins

### Proposed reductions

**R1 — Merge CLAUDE.md into agent.md** (save ~600 tokens)

- `CLAUDE.md` exists solely to say "read `agent.md` and `copilot-instructions.md`". That instruction is already in `agent.md` line 3 and the preflight checklist.
- Keep `CLAUDE.md` as a 3-line pointer only: "Read `agent.md` first. Say Yes chef! when loaded."
- Move the "why this gate is non-negotiable" rationale into `agent.md` if not already there.

**R2 — Compress agent.md tables** (save ~300 tokens)

- The Agent System and Skills tables in `agent.md` repeat information that lives in `copilot-instructions.md` Section 0 and 0.3.
- Replace verbose two-column tables with compact lists: `skill-name — trigger phrase` (one line each).
- Remove the "Which flow to use?" paragraph (move to `copilot-instructions.md` if not there).

**R3 — Slim agent persona templates** (save ~2,000 tokens across 5 files)

- `qa-engineer.md` (113 lines) embeds full TypeScript test examples. Replace with: "Follow the patterns in the nearest existing `.spec.ts` file."
- `software-architect.md` (77 lines) has a full HLD template that is rarely used. Move the template to a separate file `references/hld-template.md` and reference it.
- `team-leader.md` (68 lines) has a verbose output format template. Slim to a 3-line format note.
- `product-manager.md` (95 lines) has a full PRD template. Move to `references/prd-template.md`.

**R4 — Compact copilot-instructions Section 0** (save ~200 tokens)

- 14 skill triggers use a repetitive "When X -> read Y" prose format.
- Convert to a compact table: `| Trigger | Skill path |` — one row per trigger.

**Estimated savings:** ~3,100 tokens (~56% of mandatory boot, ~9% of total corpus).

---

## Pillar 2: MCP Integration

### Current state

- No `mcp.json` in project (`.cursor/mcp.json`) or user config.
- GitLens MCP (`mcp-cursor.js`) is installed via extension but not configured as a Cursor MCP server.
- Playwright MCP artifacts exist in `.playwright-mcp/` (console log + screenshot) but no server config.
- Empty `mcps/` directory at `C:\Users\danwe\.cursor\projects\c-foodCo-foodVibe1-0\mcps`.

### Proposed MCPs

**M1 — GitHub MCP** (highest value)

- Covers: `gh pr create`, `gh pr list`, `gh pr view`, `gh pr diff`, `gh pr checks`, `gh pr merge`, `gh issue list`
- Used by: `test-pr-review-merge`, `github-sync`
- Setup: Add `@modelcontextprotocol/server-github` to project `.cursor/mcp.json` with a `GITHUB_TOKEN` env var

**M2 — Playwright MCP** (high value for E2E)

- Covers: Browser testing, visual verification, E2E assertion
- Used by: QA flows, `test-pr-review-merge` (optional E2E step)
- Setup: Add `@playwright/mcp` to `.cursor/mcp.json` — artifacts already being written to `.playwright-mcp/`

**M3 — Filesystem MCP** (medium value)

- Covers: File existence checks, directory listings, line counts
- Used by: `validate-agent-refs`, `techdebt` (Phase 4 file size)
- Note: Cursor already has built-in file tools, so this is lower priority. Value is in structured responses for validation workflows.

### Skill updates needed

- Update `test-pr-review-merge.md` to note MCP availability: "Use GitHub MCP tools when available; fall back to `gh` CLI."
- Update `github-sync/SKILL.md` to prefer GitHub MCP for PR/issue data.
- Update `validate-agent-refs.md` to use filesystem tools for link checking.
- Add a new Section 0 trigger or note in `copilot-instructions.md`: "MCPs: When MCP servers are available, prefer them over equivalent shell commands."

---

## Pillar 3: Reactive Process Improvement

### Current gaps

- `notes/session-handoffs/` is empty — the handoff skill has never been triggered.
- No enforcement that `github-sync` runs at session start.
- `todo.md` has items from plans 167-183 with no cleanup cycle.
- Breadcrumbs (6 files) are updated manually with no schedule.
- The `techdebt` and `elegant-fix` skills are end-of-session flows that depend on the user remembering to trigger them.

### Proposed improvements

**P1 — Auto-prompt session bookends**

- Add a `.cursor/rules/session-start.mdc` with `alwaysApply: true`:
  "At the start of a new session (first message), check `notes/session-handoffs/` for a file from the last 3 days. If found, read it and summarize key context. If not found, note this and continue."
- Add a `.cursor/rules/session-end.mdc` with `description` trigger on "wrap up" / "done for today" / "session end":
  "Before ending, run `.claude/skills/session-handoff/SKILL.md` to write the handoff."

**P2 — todo.md hygiene rule**

- Add to the `commit-to-github` Phase 4 (already updates todo): "After marking committed items as `[x]`, scan for items from plans that are fully completed (all items `[x]`). Move those plan sections to `todo-archive.md`."
- This prevents unbounded growth of `todo.md`.

**P3 — Breadcrumb auto-trigger after commits**

- Add to `commit-to-github` Phase 4, after all commits: "If any committed files added or removed components, services, or pages, note which directories changed. Suggest: 'Run breadcrumb-navigator for [dirs]?' — but do not block the commit flow."

**P4 — Stale-item sweep command**

- Create `.claude/commands/sweep-stale-todos.md`: Reads `todo.md`, finds items where the associated plan is fully `[x]` or the plan file references features already merged to main, and proposes archival.

---

## Atomic Sub-tasks

### Pillar 1 — Token Reduction

- A1: Slim `CLAUDE.md` to 3-line pointer
- A2: Compress `agent.md` tables to compact one-line-per-item lists
- A3: Remove code examples from `qa-engineer.md`, reference existing spec patterns
- A4: Extract HLD template from `software-architect.md` to `references/hld-template.md`
- A5: Extract PRD template from `product-manager.md` to `references/prd-template.md`
- A6: Slim `team-leader.md` output format to 3-line note
- A7: Convert copilot-instructions Section 0 triggers to compact table

### Pillar 2 — MCP Integration

- A8: Create `.cursor/mcp.json` with GitHub MCP server config
- A9: Add Playwright MCP server config to `.cursor/mcp.json`
- A10: Update `test-pr-review-merge.md` with MCP-aware instructions
- A11: Update `github-sync/SKILL.md` with MCP-aware instructions
- A12: Update `validate-agent-refs.md` to use built-in tools over shell

### Pillar 3 — Reactive Process

- A13: Create `.cursor/rules/session-start.mdc` for auto-context loading
- A14: Create `.cursor/rules/session-end.mdc` for handoff prompting
- A15: Add todo archival step to `commit-to-github` Phase 4
- A16: Add breadcrumb suggestion to `commit-to-github` Phase 4
- A17: Create `.claude/commands/sweep-stale-todos.md`

---

## Technical Considerations

- All Pillar 1 and 3 changes are to `.claude/` and `.cursor/` markdown files — no `src/` changes, no build impact.
- Pillar 2 (MCP) requires a `GITHUB_TOKEN` environment variable. The user will need to provide or configure this. Do not commit tokens.
- A3-A6 (template extraction) should be validated with `validate-agent-refs` after changes to ensure no broken references.
- Session-start rule (A13) adds ~100 tokens to every prompt via `alwaysApply`. This is acceptable given the context value it provides.
- The Playwright MCP (A9) requires `@playwright/mcp` to be installed. Check if it is already a dev dependency.

## Execution Order

1. **Pillar 1 first** (A1-A7) — reduces noise for everything that follows
2. **Pillar 3 next** (A13-A17) — process improvements that take effect immediately
3. **Pillar 2 last** (A8-A12) — MCP setup depends on user providing tokens and confirming server choices

## Out of Scope

- Changing any application source code in `src/`
- Adding new agent personas
- Modifying the priority hierarchy (Section 0.1)
- E2E test authoring (that is QA Engineer scope)

## Critical Questions

**Q1** — For Pillar 1 (token reduction), how aggressive should we be with agent persona slimming?

a. Conservative: only remove code examples; keep all prose guidance intact.
b. Moderate: remove code examples AND extract templates to `references/`; keep role descriptions and "When to Invoke" sections.
c. Aggressive: reduce each agent file to ~30 lines (role + triggers + output format only); move all templates and examples to `references/`.

Recommendation: b.

**Q2** — For Pillar 2 (MCP), which servers should we set up first?

a. GitHub MCP only — highest immediate value for commit and PR workflows.
b. GitHub + Playwright — covers both CI and E2E automation.
c. All three (GitHub + Playwright + Filesystem) — maximum coverage.

Recommendation: a — start with GitHub, add Playwright when E2E testing becomes active.

**Q3** — For Pillar 3, should the session-start rule be `alwaysApply: true` (adds ~100 tokens to every prompt) or triggered only on specific phrases?

a. `alwaysApply: true` — ensures context is always loaded, costs ~100 tokens per prompt.
b. Trigger on "start session", "good morning", or first message only — saves tokens but risks being missed.

Recommendation: a — 100 tokens is negligible for the context continuity it provides.
