# Cutover Summary — Three-Agent Workflow (2026-07-08)

**Branch:** `chore/three-agent-cutover`  
**Checkpoint:** `pre-cutover-checkpoint` (origin)  
**PRD:** [`PRD-three-agent-cutover.md`](../PRD-three-agent-cutover.md)

## Retired
- Custom plan-implementation / execute-it / validate-agent-refs commands
- nightly-audit + reflect-agent + `.claude/reflect/` + fix-templates
- MemPalace MCP registration, mp-search skill, settings allows
- software-architect, product-manager, end-of-session-agent, worktree-session-end
- `.claude/copilot-instructions.md` §0 routing (stubbed then superseded)
- `.cursor/rules/*.mdc` (replaced by `.cursorrules`)
- `standards-*.md` (converted or folded)

## Converted
- `standards-{angular,security,domain,backend}.md` → `.claude/rules/*.md` with `paths:`
- `standards-git.md` → folded into `CLAUDE.md` + `.cursorrules`
- `qa-engineer`, `security-officer` → native subagents + `memory: project`
- `git-agent` → diff/message prep only (never commits)
- `team-leader` → review-time coordinator, `Agent(qa-engineer, security-officer)` only
- `mobile-flow-auditor` → native frontmatter kept

## Kept as-is
- cssLayer, angularComponentStructure, add-recipe, auth-and-logging, auth-crypto,
  angular-pipe-logic, breadcrumb-navigator, techdebt, deploy-github-pages, update-docs
- gstack (`/browse`, `/qa`) — user-skills install
- `render-flow-auditor`
- Existing `plans/NNN-*.plan.md` (coexist with new `/plans/[feature]_v[N].md`)

## Installed
- `CLAUDE.md` (Reviewer, 54 lines)
- `.cursorrules` (Contractor)
- `/_shared/tech-stack.md`, `/_shared/current-state.md`
- `/bugs/`, `/sessions/`
- `.claude/commands/review-it.md` (file-based only)
- `settings.json` `defaultMode: plan`
- Official plugin `security-guidance@claude-plugins-official` (+ project `enabledPlugins`)
- `README_WORKFLOW.md`

## Smoke test (Phase 4)
- Plan: `plans/close-obsolete-plan288-task11_v1.md`
- Session: `sessions/2026-07-08.md`
- Review: `sessions/2026-07-08-review.md` → **APPROVE**
- Closed obsolete Plan 288 Task 11 (plan-implementation retirement)

## Carry-forward from CLAUDE.md.legacy
- Branch guard / never write on main — kept
- Browser via gstack `/browse` — kept
- Build gate `ng build` — kept
- MemPalace-first / path router / Yes chef! gate — **dropped** (by design)
- Plugin-cache superpowers note — not carried (operational footnote, not Reviewer rule)

## Human follow-ups
- [ ] Confirm/delete any RemoteTrigger jobs at claude.ai/code/scheduled
- [ ] Merge this PR when satisfied (do not auto-merge)
- [ ] Delete `CLAUDE.md.legacy` / `agent.md.legacy` after one more cycle if unused

## Late fixes (same branch)
- Role flexibility: CLAUDE.md / .cursorrules / README_WORKFLOW — explicit Human override of roles for cost routing (`08cbb8c`)
- Branch-guard: portable path + JSON-safe stdout + Git Bash pin (`2b369f7`)
- PostToolUse matcher key order normalized (matcher before hooks)
