# Plan 183 — Agent Intelligence Map and Optimization

## Problem Statement

The agent guidance system has grown organically to 39 files across 10 layers. While functional, it carries ~1,800-2,300 tokens of redundant instructions loaded per session, has structural gaps that reduce agent reliability, and lacks mechanisms for session continuity and error recovery.

## Goals & Success Criteria

- Primary: Eliminate redundant token cost without removing any safety nets
- Primary: Add missing infrastructure that makes agents more reliable across sessions
- Success: All .mdc rules still fire; all skills still trigger; zero behavioral regressions
- Success: New skills and references improve session handoff and error recovery

---

## Part A — Redundancy Cleanup (token savings ~1,800-2,300)

These changes trim restated details from non-canonical locations. Every trigger pointer stays in place — only the duplicated *explanations* are removed.

### R1: Slim `.cursor/commands/` to one-liner pointers

**Files:** `.cursor/commands/commit-github.md`, `.cursor/commands/add-recipe.md`

**Current problem:** Both files restate Phase 0 / Step 3 instructions that already live in the SKILL files. If the SKILL changes, these copies go stale.

**Change:** Replace each with a single line: "Read and follow [SKILL path] start-to-finish."

**Token savings:** ~200

### R2: Remove Phase 0 restatements from trigger files

**Files:** `copilot-instructions.md` (Section 0, commit bullet), `agent.md` (step 7), `.cursor/rules/git-commit-must-use-skill.mdc`

**Current problem:** Phase 0 logic (techdebt scope, spec coverage, test suite command) is described in 5 places. The canonical source is `commit-to-github/SKILL.md`.

**Change:** Each trigger location says only: "read `.claude/skills/commit-to-github/SKILL.md` and follow all phases in order." Remove the inline Phase 0 bullet-point summaries.

**Token savings:** ~390

**Risk:** None — the .mdc rule still fires on every commit request and still directs the agent to read the SKILL. The SKILL itself is unchanged.

### R3: Extract tab-order sections from commit-to-github

**Files:** `.claude/skills/commit-to-github/SKILL.md` -> new file `.claude/references/tab-orders.md`

**Current problem:** The commit skill contains ~60 lines of recipe-builder and menu-intelligence tab-order reference that have nothing to do with committing. Every commit flow loads this.

**Change:** Move both tab-order sections to `.claude/references/tab-orders.md`. Add a one-line link in the commit skill: "Tab orders: see `.claude/references/tab-orders.md`." Add a breadcrumb reference from recipe-builder and menu-intelligence component directories.

**Token savings:** ~500

### R4: Slim agent files

**Files:** `.claude/agents/team-leader.md`, `software-architect.md`, `product-manager.md`, `qa-engineer.md`

**Current problem:** Each agent re-summarizes project standards (test commands, file size limits, folder structure, Q&A format) already in `copilot-instructions.md`.

**Change:** Replace repeated blocks with: "Apply standards from `.claude/copilot-instructions.md` Sections X, Y." Keep only the agent-unique responsibilities and output templates.

**Token savings:** ~400-500

### R5: Add CI flow disambiguation

**File:** `agent.md`

**Current problem:** Two overlapping flows exist — `commit-to-github` (organize and commit) and `test-pr-review-merge` (full CI pipeline with PR and merge). No guidance on which to use when.

**Change:** Add a one-line note under Commands or Operational Workflow: "commit-to-github = organize commits on branches. test-pr-review-merge = full CI: test, PR, review, merge to main."

### R6: Verify stale docs

**File:** `docs/tech-debt-2025-03-05.md`

**Change:** Check if its suggestions (migrate @Input/@Output) are already implemented. If yes, archive. If partially done, add a note.

### R7: Extract add-recipe data to reference files

**Files:** `.claude/skills/add-recipe/SKILL.md`

**Current problem:** The action keyword table and schema reference add ~800 tokens to the heaviest skill.

**Change:** Extract to `.claude/references/add-recipe-schema.md` and `.claude/references/action-keywords.md`. Link from SKILL.

**Token savings:** ~800 (deferred — only do if add-recipe is causing context pressure)

---

## Part B — New Capabilities (make agents stronger)

### N1: Session Handoff Skill

**New file:** `.claude/skills/session-handoff/SKILL.md`

**Purpose:** When ending a session or when the user says "wrap up" / "session end", the agent produces a structured handoff note so the next session starts with full context.

**Content:**
- What was accomplished (completed todos, branches created, files changed)
- What is in progress (open todos, uncommitted changes, known issues)
- Decisions made (and why — prevents re-litigating in next session)
- Recommended next steps
- Save to `notes/session-handoffs/YYYY-MM-DD.md`

**Why:** Currently the agent starts cold every session. Reading `todo.md` gives task status but not context, decisions, or gotchas. This bridges that gap.

### N2: Recovery sections in complex skills

**Files:** `.claude/skills/commit-to-github/SKILL.md`, `.claude/skills/add-recipe/SKILL.md`

**Purpose:** Add a "Recovery" section to each that tells the agent what to do when things fail mid-skill.

**Content for commit-to-github:**
- If `git stash` fails: check for untracked files, use `-u` flag
- If tests fail in Phase 0: report, ask user, do not silently skip
- If branch creation fails (already exists): append `-v2` or ask user
- If push fails (no remote, auth): report with specific error and suggest fix

**Content for add-recipe:**
- If product match is ambiguous: list candidates, ask user
- If JSON write fails (parse error): read back file, validate, report
- If duplicate name detected: show both, let user choose

**Why:** Currently when a skill hits an error mid-flow, the agent improvises. Documented recovery paths make it deterministic.

### N3: Skill priority hierarchy

**File:** `copilot-instructions.md` (new Section 0.1)

**Purpose:** When two guidance sources conflict, the agent needs a clear precedence order.

**Content:**
```
Priority (highest to lowest):
1. User's explicit instruction in this conversation
2. copilot-instructions.md (single source of truth)
3. Active SKILL being executed (context-specific rules)
4. Agent persona file (role-specific guidance)
5. Breadcrumbs (directory-local context)
6. Historical docs and reports
```

**Why:** Prevents the agent from following stale breadcrumbs over current copilot-instructions, or ignoring a user override because a skill says otherwise.

### N4: Cross-reference validation command

**New file:** `.claude/commands/validate-agent-refs.md`

**Purpose:** A periodic health check that verifies all internal links in agent files are valid.

**Content:** Script or checklist:
- For every `[text](path)` link in `.claude/`, `agent.md`, `agent.md`: verify the target file exists
- For every skill referenced in `copilot-instructions.md` Section 0: verify the SKILL.md exists
- For every agent listed in `agent.md`: verify the agent file exists
- For every `.mdc` rule: verify the linked SKILL exists
- Report broken links

**Why:** As files get renamed, moved, or deleted, dangling references silently break agent behavior. This catches them.

### N5: Preflight checklist in agent.md

**File:** `agent.md` (new section)

**Purpose:** A quick "before you start" list the agent runs through at task start.

**Content:**
```
Before starting any task:
1. Read this file and copilot-instructions.md (already mandated)
2. Check todo.md for related pending work
3. Check breadcrumbs.md in the target directory
4. If touching SCSS: read cssLayer SKILL
5. If creating components: read angularComponentStructure SKILL
6. Verify you are NOT on main branch for code changes
```

**Why:** Reduces the chance of starting work without context. Currently the agent sometimes skips breadcrumbs or forgets the branch check.

### N6: Context-budget awareness

**File:** `copilot-instructions.md` (new note in Section 0)

**Purpose:** Guide the agent to be intentional about what it loads.

**Content:** "When a skill or agent file says 'read X', read it on-demand at the point of need — do not pre-load all skills at session start. Each skill is ~500-3,500 tokens. Load only what the current task requires."

**Why:** Prevents the agent from front-loading all 10 skills (13,400 tokens) when only 1-2 are needed. Keeps the working context focused.

---

## Atomic Sub-tasks

- [ ] A1: R1 — Slim `.cursor/commands/` to one-liners
- [ ] A2: R2 — Remove Phase 0 restatements from copilot-instructions, agent.md, .mdc
- [ ] A3: R3 — Extract tab-orders to `.claude/references/tab-orders.md`
- [ ] A4: R4 — Slim agent files (team-leader, software-architect, product-manager, qa-engineer)
- [ ] A5: R5 — Add CI flow disambiguation to agent.md
- [ ] A6: R6 — Verify and archive stale docs
- [ ] A7: N1 — Create session-handoff SKILL
- [ ] A8: N2 — Add recovery sections to commit-to-github and add-recipe
- [ ] A9: N3 — Add skill priority hierarchy to copilot-instructions.md
- [ ] A10: N4 — Create validate-agent-refs command
- [ ] A11: N5 — Add preflight checklist to agent.md
- [ ] A12: N6 — Add context-budget awareness note
- [ ] A13: R7 — Extract add-recipe data (deferred, optional)

## Out of Scope

- Rewriting any SKILL logic (only trimming duplicated text)
- Changing how .mdc rules fire (they stay as-is)
- Removing any agent persona files
- Modifying breadcrumbs content

## Critical Questions

**Q1: Should we execute Part A (cleanup) and Part B (new capabilities) together or in phases?**
a. Execute both in one pass
b. Execute Part A first, verify no regressions, then Part B
c. Execute Part A only; defer Part B to a later plan

Recommendation: b

**Q2: For N1 (session-handoff skill), should it run automatically at end of session or only when the user asks?**
a. Automatic — always generate before the user leaves
b. Manual — only when user says "wrap up" / "session end" / "handoff"
c. Hybrid — suggest it when detecting idle time, but wait for confirmation

Recommendation: b

---

## Exhaustive Inventory (Reference)

### Full file listing (39 files)

| # | File | Layer | Est. Tokens | Loading |
|---|------|-------|-------------|---------|
| 1 | `agent.md` | Entry | ~50 | Always |
| 2 | `agent.md` | Entry | ~900 | Always |
| 3 | `.claude/copilot-instructions.md` | Rules | ~2,500 | Always |
| 4 | `.cursor/rules/git-commit-must-use-skill.mdc` | Cursor | ~120 | Always |
| 5 | `.cursor/rules/scss-styling-must-use-cssLayer.mdc` | Cursor | ~80 | Always |
| 6 | `.cursor/rules/add-recipe-must-use-skill.mdc` | Cursor | ~80 | Always |
| 7 | `.cursor/rules/save-plan-must-use-skill.mdc` | Cursor | ~80 | Always |
| 8 | `.cursor/rules/lucide-icons-must-register-in-app-config.mdc` | Cursor | ~100 | On HTML edit |
| 9 | `.cursor/commands/commit-github.md` | Command | ~150 | On invoke |
| 10 | `.cursor/commands/add-recipe.md` | Command | ~100 | On invoke |
| 11 | `.claude/skills/commit-to-github/SKILL.md` | Skill | ~2,500 | On trigger |
| 12 | `.claude/skills/add-recipe/SKILL.md` | Skill | ~3,500 | On trigger |
| 13 | `.claude/skills/cssLayer/SKILL.md` | Skill | ~1,500 | On trigger |
| 14 | `.claude/skills/auth-and-logging/SKILL.md` | Skill | ~1,200 | On trigger |
| 15 | `.claude/skills/techdebt/SKILL.md` | Skill | ~1,000 | On trigger |
| 16 | `.claude/skills/save-plan/SKILL.md` | Skill | ~1,000 | On trigger |
| 17 | `.claude/skills/update-docs/SKILL.md` | Skill | ~1,000 | On trigger |
| 18 | `.claude/skills/angularComponentStructure/SKILL.md` | Skill | ~800 | On trigger |
| 19 | `.claude/skills/github-sync/SKILL.md` | Skill | ~500 | On trigger |
| 20 | `.claude/skills/elegant-fix/SKILL.md` | Skill | ~400 | On trigger |
| 21 | `.claude/agents/team-leader.md` | Agent | ~700 | On invoke |
| 22 | `.claude/agents/software-architect.md` | Agent | ~800 | On invoke |
| 23 | `.claude/agents/product-manager.md` | Agent | ~900 | On invoke |
| 24 | `.claude/agents/qa-engineer.md` | Agent | ~800 | On invoke |
| 25 | `.claude/agents/breadcrumb-navigator.md` | Agent | ~700 | On invoke |
| 26 | `.claude/commands/test-pr-review-merge.md` | Command | ~600 | On invoke |
| 27 | `.claude/prompts/deploy-angular-github.md` | Prompt | ~200 | Rare |
| 28 | `.claude/workflows/deploy.yml` | Workflow | ~200 | Rare |
| 29 | `.claude/todo.md` | State | ~2,000 | On reference |
| 30 | `.claude/todo-archive.md` | State | Variable | Rare |
| 31 | `.claude/BUILD-FIXES-AUDIT.md` | Audit | ~800 | On reference |
| 32 | `src/app/core/breadcrumbs.md` | Context | ~600 | Per directory |
| 33 | `src/app/core/services/breadcrumbs.md` | Context | ~600 | Per directory |
| 34 | `src/app/core/models/breadcrumbs.md` | Context | ~600 | Per directory |
| 35 | `src/app/core/components/breadcrumbs.md` | Context | ~600 | Per directory |
| 36 | `src/app/pages/breadcrumbs.md` | Context | ~600 | Per directory |
| 37 | `src/app/shared/breadcrumbs.md` | Context | ~600 | Per directory |
| 38 | `docs/security-go-live.md` | Docs | ~300 | Rare |
| 39 | `docs/tech-debt-2025-03-05.md` | Docs | ~400 | Rare |

**Total: ~29,960 tokens | Redundant: ~1,800-2,300 tokens | Always loaded: ~3,810 tokens**

### Dependency Map

```
agent.md --> agent.md --> copilot-instructions.md (always loaded chain)
                       --> todo.md (task state)

.mdc rules (always injected) --> trigger skills on-demand

commit-to-github SKILL --> techdebt SKILL (Phase 0)
update-docs SKILL --> breadcrumb-navigator agent
team-leader agent --> sequences all agents
save-plan SKILL --> writes todo.md
github-sync SKILL --> feeds techdebt and update-docs
elegant-fix SKILL --> feeds copilot-instructions updates
```

### Redundancy Summary

| What | Canonical Location | Also Found In | Extra Tokens |
|------|-------------------|---------------|-------------|
| Phase 0 instructions | commit-to-github SKILL | copilot-instructions, agent.md, .mdc rule, .cursor command | ~390 |
| Skill trigger table | copilot-instructions Section 0 | agent.md Skills table | ~200 |
| Test command string | qa-engineer agent | team-leader, copilot-instructions, .mdc rule, .cursor command, test-pr-review-merge | ~100 |
| Q&A format | copilot-instructions Section 1.1 | product-manager agent | ~100 |
| Angular standards | copilot-instructions Section 3 | software-architect agent, angularComponentStructure SKILL | ~200 |
| Tab orders | commit-to-github SKILL | (misplaced, should be in reference) | ~500 |
