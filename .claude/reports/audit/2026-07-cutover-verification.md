# Phase 0 — Cutover Verification Pass

**Date:** 2026-07-08  
**Branch:** `chore/three-agent-cutover`  
**Checkpoint tag:** `pre-cutover-checkpoint` (pushed to origin)  
**Part 0 commit:** `610ae2e` — disarm legacy CLAUDE.md gate

---

## 1. MemPalace references in `.claude/` and `.mcp.json`

**Confirmed present.**

| Location | Notes |
|---|---|
| `.mcp.json` | `mempalace` MCP server registered (`python -m mempalace.mcp_server`) |
| `.claude/settings.json` | 19 `mcp__mempalace__*` allow entries; `defaultMode: bypassPermissions` |
| `.claude/skills/mp-search/` | Full MemPalace search skill |
| `.claude/skills/techdebt/`, `elegant-fix/`, `auth-and-logging/`, `angular-pipe-logic/`, `save-plan/`, `nightly-audit/`, `github-sync/`, `brief-detection/` | Orient / KG / hook references |
| `.claude/copilot-instructions.md` | §0 routing + MemPalace-first search protocol |
| Historical: `todo-archive`, techdebt reports, retrospectives, reflect failure logs, audit reports | Archive/history only — not live routing |

`.cursor/mcp.json` has **no** MemPalace entry (playwright + github only).

---

## 2. MemPalace / embed-runner process

**Not running.**  
`Get-Process` / `Win32_Process` scan for `embed-runner`, `mempalace`, `chroma` returned empty. No OS scheduled task matched `nightly|reflect|mempalace|audit|claude`.

---

## 3. MCP servers configured

| File | Servers |
|---|---|
| `.mcp.json` | `github`, **`mempalace`** |
| `.cursor/mcp.json` | `playwright`, `github` |

MemPalace is still registered in project `.mcp.json` → Phase 1 must remove it.

---

## 4. Live inventory (repo root `.claude/` only — not SDK/toolkit copies)

### Agents (10)
`/ship (formerly /ship)`, `git-agent.md`, `mobile-flow-auditor.md`, `product-manager.md`, `qa-engineer.md`, `reflect-agent.md`, `render-flow-auditor.md`, `security-officer.md`, `software-architect.md`, `team-leader.md`

### Skills (22 dirs)
`add-recipe`, `angular-pipe-logic`, `angularComponentStructure`, `auth-and-logging`, `auth-crypto`, `breadcrumb-navigator`, `brief-detection`, `context-management`, `cssLayer`, `cssLayer-workspace`, `deploy-github-pages`, `elegant-fix`, `execute-debugging`, `github-sync`, `mp-search`, `nightly-audit`, `preflight`, `save-plan`, `techdebt`, `update-docs`, `worktree-session-end`, `worktree-setup`

**Absent from live root (PRD listed, only in SDK):** `session-handoff/`, `end-session/`, `quick-chat/`, `finalize-docs/`, `commit-to-github/`

### Commands (notable retire targets present)
`plan-implementation.md`, `execute-it.md`, `validate-agent-refs.md`, `nightly-audit.md`, `audit-report.md`  
**Absent:** `new-feature.md`, `mp-wake-up.md` (not in live `.claude/commands/`)

### Standards (live)
`standards-angular.md`, `standards-backend.md`, `standards-domain.md`, `standards-git.md`, `standards-security.md`, `standards-scheduled-reporting.md`

---

## 5. `settings.json` defaultMode

**Confirmed:** `"defaultMode": "bypassPermissions"`  
Phase 3 must change to `"plan"`.

---

## 6. RemoteTrigger / nightly-audit / reflect-agent crons

**No evidence of active OS scheduled tasks** matching those names.  
RemoteTrigger MCP tools not available in this Cursor session.  
**Flag for Human:** manually confirm/delete any remaining jobs at https://claude.ai/code/scheduled if present.

---

## 7. gstack

**Installed in user skills**, not vendored in-repo:  
`C:\Users\danwe\.claude\skills\gstack\` (+ `browse`, `qa`, `qa-only`, `open-gstack-browser`, `setup-browser-cookies`, `gstack-upgrade`).  
Keep as-is this pass (PRD Part 2 / Appendix).

---

## 8. Retire-list reference check (C6)

Policy: **live routing** = `.claude/copilot-instructions.md`, `.claude/commands/_index.md`, `.claude/agents/*`, `.claude/settings.json`, `.mcp.json`, `.cursor/rules/*`, `CLAUDE.md*`.  
Historical plans/docs/archives do **not** block deletion of dead components.

| Component | Live routing refs outside own dir? | Verdict |
|---|---|---|
| `commands/plan-implementation.md` | Yes — copilot-instructions, feat/plan commands, `_index` | **Retire after Phase 1 disconnects routing** |
| `commands/execute-it.md` | Yes — same | **Retire after Phase 1** |
| `commands/new-feature.md` | **File absent** in live commands | N/A — skip delete |
| `commands/validate-agent-refs.md` | Yes — `_index`, validate command self | **Retire after Phase 1** |
| `commands/nightly-audit.md`, `audit-report.md`, `skills/nightly-audit/` | Yes — routing + standards-scheduled | **Retire after Phase 1** |
| `agents/reflect-agent.md`, `.claude/reflect/` | Yes — reflect commands + PostToolUse hook in settings | **Retire after Phase 1** (also remove reflect hook) |
| `skills/mp-search/`, MemPalace in settings/mcp | Yes — heavy | **Retire after Phase 1** |
| `mp-wake-up.md` | **Absent** | N/A |
| `agents/team-leader.md` | Yes — convert in Phase 3, do not delete | **CONVERT** |
| `agents/software-architect.md`, `product-manager.md` | Yes — routing | **Retire after Phase 1** |
| `agents//ship (formerly /ship)`, `skills/worktree-session-end/` | Yes — session-end rule, ship | **Retire after Phase 1** |
| `skills/session-handoff/`, `end-session/`, `quick-chat/` | **Absent** from live root | N/A — already gone |
| `reports/audit/` (old nightly artifacts) | Self-contained + this verification file lives here | **Keep directory**; do not wipe verification report. Old nightly files may be archived later |
| `fix-templates/` | Referenced by nightly-audit skill | **Retire with nightly-audit** |
| `skills/cssLayer-workspace/*.html` | Workspace eval artifacts only | **Safe to remove HTML artifacts**; keep skill dir if cssLayer still used |

**Kept skills with MemPalace Orient sections** (`techdebt`, `elegant-fix`, `auth-and-logging`, `angular-pipe-logic`, `save-plan`, `github-sync`): **not deleted** this phase — Phase 1/2 should strip MemPalace steps from kept skills rather than delete the skills (Appendix: Keep).

---

## Extra findings (not in PRD 8-item list)

- `render-flow-auditor.md` exists live; PRD Appendix does not mention it → **keep as-is**.
- `plans/` exists (old `NNN-name.plan.md` convention). `bugs/`, `sessions/`, `_shared/` **do not exist** yet → Phase 3 creates them.
- Active todo still has Plan 288 Task 11 pointing at `plan-implementation.md` comprehensive-brief gate — will be moot after retire; note in Phase 5 summary.
- Cursor MCP has Playwright; PRD keeps gstack mobile auditor — no conflict this pass.

---

## Phase 0 Done Criteria

- [x] All 8 verification items documented
- [x] Rollback tag `pre-cutover-checkpoint` exists on origin
- [x] This file written to `.claude/reports/audit/2026-07-cutover-verification.md`
