Here's the full brief for the end-of-session agent:

markdown# End-of-Session Agent Brief

## Goal

Create a unified end-of-session agent that orchestrates all session-closing workflows into a single deterministic pipeline, eliminating the current fragmented system where 4+ separate triggers must be remembered manually.

## Scope

**Files to create:**
- `.claude/agents/end-of-session-agent.md` — the agent definition

**Files to modify:**
- `.claude/skills/session-handoff/SKILL.md` — update trigger to spawn agent instead of running standalone
- `.claude/skills/worktree-session-end/SKILL.md` — update trigger to spawn agent instead of running standalone
- `.claude/copilot-instructions.md` — remove redundant "end of session" triggers that agent now handles

**Files the agent will read:**
- `.claude/sessions/{session-id}/brief.md` — session goal and success criteria
- `.claude/todo.md` — completed tasks, archivable sections
- `.claude/techdebt-reports/` — for trend comparison
- `memory/feedback_no_auto_commit.md` — user confirmation rules
- `memory/feedback_git_confirmation.md` — user confirmation rules

**Files the agent will write:**
- `.claude/sessions/{session-id}/session-handoff.md` — unified session evaluation + handoff report
- `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` — techdebt scan output
- `.claude/todo-archive.md` — archived todo sections

## Out of Scope

- Modifying `/plan-implementation` command (separate task)
- Creating `/brief` command (separate task)
- Changing `auto-reflect.ps1` conflict-marker logic (remains as-is); enhanced session-handoff parsing IS in scope (Phase 14)
- Modifying git-agent internals (agent delegates to it)
- Worktree merge/cleanup flow details (delegates to existing worktree-session-end logic)

## Agent Phase Structure

### Phase 0: Brief Check (HARD GATE)
Look for: .claude/sessions/*/brief.md
(match by branch name slug or today's date)
IF NOT FOUND:
⛔ STOP
Output: "No brief.md found for this session.
Run /brief to create one, then call me again."
EXIT AGENT
IF FOUND:
→ Store session_id and brief_path
→ Continue

### Phase 1: Environment Detection
git rev-parse --git-dir
├─ .git/worktrees/* → WORKTREE path
└─ .git             → MAIN REPO path
Store: is_worktree, repo_root

### Phase 2: State Assessment
Run:
git status --short
git diff --stat
git log origin/main..HEAD --oneline
Read .claude/todo.md
Derive:
has_dirty_tree: bool
has_unpushed_commits: bool
code_changed_this_session: bool (any .ts/.html/.scss in diff)
structural_changes: bool (new components/services/modules)
completed_tasks: list of [x] items
archivable_sections: list (all [x], >7 days old)

### Phase 3: Build Gate (CONDITIONAL)
SKIP IF: code_changed_this_session == false
Run: ng build
IF FAILS:
⛔ STOP
Output: "Build failed. Fix errors before ending session."
Show: build errors
EXIT AGENT
IF PASSES:
→ Continue

### Phase 4: Techdebt Scan (CONDITIONAL)
SKIP IF: code_changed_this_session == false
Run: techdebt skill scan
Write: .claude/techdebt-reports/techdebt-YYYY-MM-DD.md
Output: summary of findings (not full report)

### Phase 5: Git Operations (CONDITIONAL)
SKIP IF: has_dirty_tree == false AND has_unpushed_commits == false
IF WORKTREE:
→ Delegate to worktree-session-end merge/cleanup flow
→ Return here after completion
IF MAIN REPO:
Stage files
Generate commit message (Conventional Commits)
Show visual tree:
┌─────────────────────────────┐
│ Staged files:               │
│  M src/app/foo.ts           │
│  A src/app/bar.ts           │
│                             │
│ Commit message:             │
│  feat(recipes): add parser  │
└─────────────────────────────┘
🛑 USER CONFIRM: "Approve commit? (Y/N)"
IF APPROVED:
git commit
git push
Create PR if on feature branch
IF REJECTED:
Output: "Commit skipped. You can commit manually later."
→ Continue to next phase

### Phase 6: Todo + Archive (CONDITIONAL)
SKIP IF: completed_tasks is empty AND archivable_sections is empty
Mark completed tasks [x] (if not already)
IF archivable_sections exist:
Show list:
┌─────────────────────────────┐
│ Archivable sections:        │
│  • Plan #12: Recipe parser  │
│  • Plan #11: Form validation│
└─────────────────────────────┘
🛑 USER CONFIRM: "Archive these? (Y/N)"
IF APPROVED:
Move to todo-archive.md
IF REJECTED:
Output: "Archive skipped."
→ Continue

### Phase 7: Doc Refresh (CONDITIONAL)
SKIP IF: structural_changes == false
Run: update-docs skill
Output: "Breadcrumbs updated."

### Phase 8: Plan Cleanup (CONDITIONAL)
Scan: .claude/plans/*.plan.md
Find: files where all tasks [x], verified in git, file >7 days old
IF found:
Show list:
┌─────────────────────────────┐
│ Completed plan files:       │
│  • plans/012-recipe-parser  │
│  • plans/011-form-validation│
└─────────────────────────────┘
🛑 USER CONFIRM: "Delete these? (Y/N)"
IF APPROVED:
Delete files
IF REJECTED:
Output: "Plan cleanup skipped."
→ Continue

### Phase 9: Session Evaluation (ALWAYS)
Read: .claude/sessions/{session-id}/brief.md
Extract: success_criteria list
For each criterion:
Evaluate: ✅ Done / ❌ Missed / ⚠️ Partial
(Use git diff, todo.md, build status as evidence)
Generate report:
Session ID
{session-id}
What Was Done

[bullet list from completed_tasks and git diff]

What Was Skipped or Blocked

[bullet list with reasons]

Self-Evaluation Against Success Criteria

✅ Criterion 1: [text]
❌ Criterion 2: [text] — Reason: [why missed]
⚠️ Criterion 3: [text] — Reason: [partial progress]

Validation Checklist

 Build passes
 Changes committed
 PR created (if applicable)
 Manual verification needed: [list]

Agent Notes

[edge cases, decisions made, things to verify]


Write: .claude/sessions/{session-id}/session-handoff.md
Output: Print summary to user

## User Confirmation Gates (NON-NEGOTIABLE)

| Gate | Phase | What User Sees |
|------|-------|----------------|
| Commit approval | 5 | Visual staged files + commit message |
| Archive approval | 6 | List of archivable todo sections |
| Plan delete approval | 8 | List of completed .plan.md files |

Per `memory/feedback_no_auto_commit.md` and `memory/feedback_git_confirmation.md` — agent NEVER auto-approves these.

## Success Criteria

- [ ] Agent runs full pipeline when brief.md exists
- [ ] Agent stops immediately with clear message when brief.md missing
- [ ] Agent skips phases correctly based on conditions (no code change → skip build/techdebt)
- [ ] All 3 user confirmation gates work (commit, archive, plan delete)
- [ ] Build failure stops the pipeline (no commit of broken code)
- [ ] Session evaluation correctly compares against brief.md success criteria
- [ ] session-handoff.md is written to correct session directory
- [ ] Unified session-handoff.md is written to .claude/sessions/{session-id}/
- [ ] Existing trigger phrases ("wrap up", "done", "ship", "handoff") spawn this agent
- [ ] Worktree detection works and delegates appropriately

## Session ID

2026-04-08-end-of-session-agent

## Dependencies

**Skills the agent invokes:**
- `techdebt/SKILL.md` (Phase 4)
- `update-docs/SKILL.md` (Phase 7)
- `session-handoff/SKILL.md` (Phase 10, narrative only)

**Agents the agent may invoke:**
- `git-agent.md` (Phase 5, for complex git operations)

**Tools required:**
- `git` CLI
- `ng` CLI (for build)
- `gh` CLI (for PR creation)

## Notes

- This agent replaces the need to remember 4+ separate triggers
- The auto-reflect.ps1 Stop hook still fires AFTER this agent completes (Phase 11 equivalent, unchanged)
- Agent should be lean — read brief, introspect via git/files, don't need conversation history
- If worktree path detected, Phase 5 delegates to worktree-session-end's existing merge/cleanup menu

Ready to paste into /plan-implementation or use directly with Claude Code. Want me to adjust anything?## Goal
Create a dedicated agent definition for the session-wrap ritual. This agent is 
invoked whenever /session-wrap is triggered and is responsible for evaluating 
the session, writing the report, and presenting it to the user.
## Deliverable
Path: .claude/agents/session-wrap-agent.md
A full agent definition file including persona, responsibilities, and behavior rules.
## Agent Persona
Name: Session Wrap Agent
Role: Independent evaluator — not the agent that did the work. It reads what 
happened and judges it objectively against the brief.
Tone: Direct, structured, no fluff. Flags problems clearly without softening them.
## Agent Responsibilities
### 1. Locate Context
- Find the current session ID from context or conversation history
- Load .claude/sessions/{session-id}/brief.md
- If brief.md does not exist → reconstruct it from conversation history 
  and write it before proceeding
### 2. Evaluate
- Read everything that happened in the session
- Grade each success criterion from the brief as: ✅ Done / ❌ Missed / ⚠️ Partial
- Run the full validation checklist per existing agent rules
- Identify anything the user should know about: assumptions made, 
  shortcuts taken, tech debt introduced, things left open
### 3. Write session-handoff.md
Path: .claude/sessions/{session-id}/session-handoff.md
Use the unified session-handoff template (defined in Phase 11).
This file must be written before presenting anything to the user.
### 4. Present to User
Print a clean terminal summary — not the raw file, a readable digest:
- Session status: COMPLETE / INCOMPLETE / BLOCKED
- Quick wins (what was done well)
- Gaps (what was missed or partial)
- Flags requiring user attention
- Validation checklist results
Then ask: "Does this look accurate or do you want to flag anything?"
### 5. Wait for User Confirmation
- If user confirms → session is officially closed
- If user flags something → update session-handoff.md and re-present
- Do NOT close the session unilaterally
## Behavior Rules
- Never skip writing session-handoff.md even if the session seems complete
- Never soften a ❌ — if something was missed, say it clearly
- Never evaluate your own work — this agent only runs AFTER execution is done
- If invoked mid-session by mistake, say so and ask user to confirm wrap-up intent
- Always respect the brief as the source of truth — not your own interpretation 
  of what "done" means
## Invocation
This agent is activated by:
- Natural language triggers: "wrap up", "done", "ship", "handoff", "end session", "finish up"
- `<invoke>end-of-session-agent</invoke>` from other agents
## Dependencies
- .claude/sessions/{session-id}/brief.md (or conversation history as fallback)
- Existing validation checklist rules from CLAUDE.md
- Write access to .claude/sessions/
## Success Criteria
- [ ] Agent file exists at .claude/agents/session-wrap-agent.md
- [ ] Agent correctly loads brief.md when present
- [ ] Agent reconstructs brief when not present
- [ ] session-handoff.md is always written before user is presented with summary
- [ ] Validation checklist is always included in report
- [ ] Agent waits for user confirmation before closing
- [ ] Agent can be triggered by other agents via invoke syntax take this in consideration and see if you can improve from this waht you did. if no just say soShow more11:20 AMCompared specifications, identified improvements to merge, flagged one disagreementCompared specifications, identified improvements to merge, flagged one disagreementYes — there are several good improvements I can take from this. Here's what I'd merge:

Improvements to Add
From Your BriefWhat It AddsMy Version Was MissingPersona section"Independent evaluator — not the agent that did the work"Clear identity separationTone definition"Direct, structured, no fluff. Flags problems clearly without softening them"Behavioral guidanceSession statusCOMPLETE / INCOMPLETE / BLOCKEDClean top-level categorizationQuick wins / Gaps / FlagsStructured presentation formatMy summary was less digestible"Never evaluate your own work" ruleExplicit behavioral constraintImplied but not statedMid-session handling"If invoked mid-session by mistake, say so and ask user to confirm"Edge case I didn't coverInvoke syntax<invoke>/session-wrap</invoke> for agent-to-agent callsCross-agent invocation pattern

One Thing I'd Keep From Mine
Your brief says:

"If brief.md does not exist → reconstruct it from conversation history"

But we agreed the agent runs in fresh context — it doesn't have conversation history. My version (stop and tell user to run /brief first) is more cost-effective and architecturally clean.

Clarification Needed
Your brief focuses only on evaluation/reporting. My brief includes the full pipeline (build gate, techdebt, git operations, todo archive, doc refresh, plan cleanup, THEN evaluation).
Are these the same agent or two separate agents?
OptionStructureA: One agentFull pipeline + evaluation (my approach, with your improvements merged)B: Two agentsEnd-of-session orchestrator → spawns → session-wrap evaluator
Option B is cleaner separation but adds one more agent call. Option A is simpler but one bigger agent.
Which do you prefer?aso give the the full updated mose expleced and detailed brif!11:21 AMSynthesized comprehensive brief merging original phases with user improvementsSynthesized comprehensive brief merging original phases with user improvementsHere's the final, fully merged brief:

markdown# End-of-Session Agent — Full Specification Brief

## Session ID
2026-04-08-end-of-session-agent

## Goal

Create a unified end-of-session agent that orchestrates ALL session-closing workflows into a single deterministic pipeline. This agent eliminates the current fragmented system where 4+ separate triggers must be remembered manually.

The agent handles: brief validation → environment detection → build verification → techdebt scan → git operations → todo maintenance → documentation refresh → plan cleanup → session evaluation → handoff report.

---

## Agent Persona

| Attribute | Definition |
|-----------|------------|
| **Name** | End-of-Session Agent |
| **Role** | Independent orchestrator and evaluator — NOT the agent that did the work. It reads what happened and judges it objectively against the brief. |
| **Tone** | Direct, structured, no fluff. Flags problems clearly without softening them. Never says "great job" unless everything actually passed. |
| **Identity** | This agent is a auditor and closer. It does not create features, fix bugs, or write application code. It verifies, evaluates, commits, and reports. |

---

## Scope

### Files to Create
| Path | Purpose |
|------|---------|
| `.claude/agents/end-of-session-agent.md` | The agent definition |

### Files to Modify
| Path | Change |
|------|--------|
| `.claude/skills/session-handoff/SKILL.md` | Update trigger to spawn agent instead of running standalone |
| `.claude/skills/worktree-session-end/SKILL.md` | Update trigger to spawn agent instead of running standalone |
| `.claude/copilot-instructions.md` | Remove redundant "end of session" triggers that agent now handles |

### Files the Agent Reads
| Path | Purpose |
|------|---------|
| `.claude/sessions/{session-id}/brief.md` | Session goal and success criteria (SOURCE OF TRUTH) |
| `.claude/todo.md` | Completed tasks, archivable sections |
| `.claude/techdebt-reports/*.md` | Previous reports for trend comparison |
| `.claude/plans/*.plan.md` | To identify completed plans for cleanup |
| `memory/feedback_no_auto_commit.md` | User confirmation rules |
| `memory/feedback_git_confirmation.md` | User confirmation rules |

### Files the Agent Writes
| Path | Purpose |
|------|---------|
| `.claude/sessions/{session-id}/session-handoff.md` | Unified session evaluation + handoff report (MUST be written before presenting to user) |
| `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` | Techdebt scan output |
| `.claude/todo-archive.md` | Archived todo sections |

---

## Out of Scope

- Modifying `/plan-implementation` command (separate task)
- Creating `/brief` command (separate task)
- Changing `auto-reflect.ps1` conflict-marker logic (remains as-is); enhanced session-handoff parsing IS in scope (Phase 14)
- Modifying git-agent internals (agent delegates to it)
- Worktree merge/cleanup flow details (delegates to existing worktree-session-end logic)
- Writing application code, fixing bugs, or creating features

---

## Invocation

This agent is activated by:

| Trigger | Source |
|---------|--------|
| Natural language: "wrap up", "done", "ship", "handoff", "end session", "finish up" | User in conversation |
| `<invoke>end-of-session-agent</invoke>` | Other agents (e.g., auto-solve "approve and stop" path) |

---

## Agent Phase Structure

### Phase 0: Brief Check (HARD GATE — ALWAYS FIRST)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: BRIEF CHECK                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Look for: .claude/sessions/*/brief.md                       │
│           Match by: branch name slug OR today's date        │
│                                                             │
│ IF NOT FOUND:                                               │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ ⛔ HARD STOP                                          │ │
│   │                                                       │ │
│   │ Output:                                               │ │
│   │ "No brief.md found for this session.                  │ │
│   │  I cannot evaluate work without a brief.              │ │
│   │                                                       │ │
│   │  Run /brief to create one, then invoke me again."     │ │
│   │                                                       │ │
│   │ → EXIT AGENT                                          │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
│ IF FOUND:                                                   │
│   → Store: session_id, brief_path                           │
│   → Load brief contents into working memory                 │
│   → Continue to Phase 1                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

**Rationale:** The brief is the source of truth. Without it, evaluation is meaningless. Agent does NOT reconstruct from conversation (fresh context = no conversation history). User must create brief explicitly.

---

### Phase 1: Mid-Session Check
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: MID-SESSION CHECK                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Detect if session appears incomplete:                       │
│   - Open tasks in todo.md still marked [ ]                  │
│   - Uncommitted changes with recent timestamps              │
│   - Success criteria from brief clearly not addressed       │
│                                                             │
│ IF APPEARS MID-SESSION:                                     │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ ⚠️ WARNING                                            │ │
│   │                                                       │ │
│   │ Output:                                               │ │
│   │ "This session appears incomplete:                     │ │
│   │  • 3 tasks still open in todo.md                      │ │
│   │  • Success criterion 'X' not addressed                │ │
│   │                                                       │ │
│   │  Are you sure you want to wrap up now? (Y/N)"         │ │
│   │                                                       │ │
│   │ → Wait for user confirmation                          │ │
│   │ → IF N: Exit agent                                    │ │
│   │ → IF Y: Continue with status = INCOMPLETE             │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
│ IF APPEARS COMPLETE:                                        │
│   → Continue to Phase 2                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 2: Environment Detection
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: ENVIRONMENT DETECTION                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Run: git rev-parse --git-dir                                │
│                                                             │
│ Parse result:                                               │
│   .git/worktrees/* → is_worktree = true                     │
│   .git             → is_worktree = false                    │
│                                                             │
│ Store:                                                      │
│   is_worktree: bool                                         │
│   repo_root: string                                         │
│   branch_name: string (from git branch --show-current)      │
│                                                             │
│ → Continue to Phase 3                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 3: State Assessment
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: STATE ASSESSMENT                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Run:                                                        │
│   git status --short                                        │
│   git diff --stat                                           │
│   git log origin/main..HEAD --oneline                       │
│   Read .claude/todo.md                                      │
│   Read .claude/plans/*.plan.md                              │
│                                                             │
│ Derive and store:                                           │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ has_dirty_tree: bool                                  │   │
│ │ has_unpushed_commits: bool                            │   │
│ │ code_changed_this_session: bool                       │   │
│ │   (true if any .ts/.html/.scss/.css in diff)          │   │
│ │ structural_changes: bool                              │   │
│ │   (true if new components/services/modules created)   │   │
│ │ completed_tasks: list of [x] items from todo.md       │   │
│ │ open_tasks: list of [ ] items from todo.md            │   │
│ │ archivable_sections: list                             │   │
│ │   (all [x], verified in git, >7 days old)             │   │
│ │ completed_plans: list of .plan.md files               │   │
│ │   (all [x], verified in git, >7 days old)             │   │
│ │ files_modified: list from git diff --name-only        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ → Continue to Phase 4                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 4: Build Gate (CONDITIONAL — HARD GATE)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: BUILD GATE                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: code_changed_this_session == false                 │
│          → Continue to Phase 5                              │
│                                                             │
│ Run: ng build                                               │
│                                                             │
│ IF BUILD FAILS:                                             │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ ⛔ HARD STOP                                          │ │
│   │                                                       │ │
│   │ Output:                                               │ │
│   │ "Build failed. Cannot close session with broken code."│ │
│   │                                                       │ │
│   │ Show: [build errors]                                  │ │
│   │                                                       │ │
│   │ "Fix the errors and try again."                       │ │
│   │                                                       │ │
│   │ → EXIT AGENT                                          │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
│ IF BUILD PASSES:                                            │
│   → Store: build_passed = true                              │
│   → Continue to Phase 5                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

**Rationale:** Never commit broken code. Never evaluate a session that doesn't compile. Build is a hard prerequisite.

---

### Phase 5: Techdebt Scan (CONDITIONAL)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: TECHDEBT SCAN                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: code_changed_this_session == false                 │
│          → Continue to Phase 6                              │
│                                                             │
│ Run: techdebt skill scan on src/app/                        │
│                                                             │
│ Scan for:                                                   │
│   - Dead code                                               │
│   - Unused imports                                          │
│   - TODO/FIXME comments                                     │
│   - Style violations                                        │
│   - Security flags                                          │
│                                                             │
│ Write: .claude/techdebt-reports/techdebt-YYYY-MM-DD.md      │
│        (7-report retention, delete oldest if >7)            │
│                                                             │
│ Store: techdebt_summary (for inclusion in session-handoff.md)        │
│                                                             │
│ Output: Brief summary (not full report)                     │
│   "Techdebt scan: 2 warnings, 0 critical issues."           │
│                                                             │
│ → Continue to Phase 6                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 6: Git Operations (CONDITIONAL — USER CONFIRMATION REQUIRED)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: GIT OPERATIONS                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: has_dirty_tree == false                            │
│          AND has_unpushed_commits == false                  │
│          → Continue to Phase 7                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ IF WORKTREE:                                            │ │
│ │   → Delegate to worktree-session-end merge/cleanup flow │ │
│ │   → That flow handles its own git operations            │ │
│ │   → Return here after completion                        │ │
│ │   → Continue to Phase 7                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ IF MAIN REPO:                                           │ │
│ │                                                         │ │
│ │ Gather payload for git-agent:                           │ │
│ │   {                                                     │ │
│ │     files_to_stage: [list from git status],             │ │
│ │     branch: {branch_name},                              │ │
│ │     suggested_message: {derived from completed tasks},  │ │
│ │     create_pr: {true if on feature branch},             │ │
│ │     source: "end-of-session-agent"                      │ │
│ │   }                                                     │ │
│ │                                                         │ │
│ │ <invoke>git-agent</invoke> with payload                 │ │
│ │                                                         │ │
│ │ Git-agent handles:                                      │ │
│ │   - Visual staged files summary                         │ │
│ │   - Commit message generation (Conventional Commits)    │ │
│ │   - 🛑 User confirmation gate                           │ │
│ │   - Commit execution                                    │ │
│ │   - Push to remote                                      │ │
│ │   - PR creation (if applicable)                         │ │
│ │                                                         │ │
│ │ Receive from git-agent:                                 │ │
│ │   {                                                     │ │
│ │     commit_sha: string | null,                          │ │
│ │     pr_url: string | null,                              │ │
│ │     skipped: bool,                                      │ │
│ │     skip_reason: string | null                          │ │
│ │   }                                                     │ │
│ │                                                         │ │
│ │ Store result for inclusion in session-handoff.md        │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ → Continue to Phase 7                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
**Non-negotiable:** Per `memory/feedback_no_auto_commit.md` — NEVER auto-commit. Always show visual summary. Always wait for explicit user approval.

---

### Phase 7: Todo + Archive (CONDITIONAL — USER CONFIRMATION REQUIRED)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 7: TODO + ARCHIVE                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: completed_tasks is empty                           │
│          AND archivable_sections is empty                   │
│          → Continue to Phase 8                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ STEP 1: MARK COMPLETED (AUTOMATIC — NO CONFIRMATION)    │ │
│ │                                                         │ │
│ │ For each task verified as complete:                     │ │
│ │   - Evidence: code committed, tests pass, file exists   │ │
│ │   - Mark as [x] in todo.md                              │ │
│ │                                                         │ │
│ │ Output: "Marked {n} tasks complete in todo.md"          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ STEP 2: ARCHIVE (AUTOMATIC — NO CONFIRMATION)           │ │
│ │                                                         │ │
│ │ Find archivable sections:                               │ │
│ │   - All tasks in section marked [x]                     │ │
│ │   - Verified in git (commits exist)                     │ │
│ │   - Section >7 days old                                 │ │
│ │                                                         │ │
│ │ For each archivable section:                            │ │
│ │   - Move to .claude/todo-archive.md                     │ │
│ │   - Prepend with archive date header                    │ │
│ │                                                         │ │
│ │ Output: "Archived {n} completed sections to             │ │
│ │          todo-archive.md"                               │ │
│ │                                                         │ │
│ │ Store: archived_sections = [list of section names]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ → Continue to Phase 8                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
---

### Phase 8: Doc Refresh (CONDITIONAL)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 8: DOC REFRESH                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: structural_changes == false                        │
│          → Continue to Phase 9                              │
│                                                             │
│ Run: update-docs skill                                      │
│   - Refresh breadcrumbs.md at major seams                   │
│   - Prune stale entries                                     │
│   - Update key exports                                      │
│                                                             │
│ Output: "Breadcrumbs updated for new components/services."  │
│                                                             │
│ → Continue to Phase 9                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 9: Plan Cleanup (CONDITIONAL — USER CONFIRMATION REQUIRED)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 9: PLAN ARCHIVE                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SKIP IF: completed_plans is empty                           │
│          → Continue to Phase 10                             │
│                                                             │
│ Find completed plans:                                       │
│   - All tasks in plan marked [x]                            │ 
│   - Verified in git (commits exist for the work)            │
│   - Plan file >7 days old                                   │
│                                                             │
│ Show list:                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Completed plan files ready to archive:                  │ │
│ │   • .claude/plans/012-recipe-parser.plan.md             │ │
│ │   • .claude/plans/011-form-validation.plan.md           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🛑 USER CONFIRM: "Mark these plans as done? (Y/N)"          │
│                                                             │
│ IF Y (APPROVED):                                            │
│   For each completed plan:                                  │
│     Rename: {filename}.plan.md → {filename}.done.plan.md    │
│                                                             │
│   Example:                                                  │
│     .claude/plans/012-recipe-parser.plan.md                 │
│     → .claude/plans/012-recipe-parser.done.plan.md          │
│                                                             │
│   Output: "Marked {n} plans as done."                       │
│   Store: archived_plans = [list of renamed files]           │
│                                                             │
│ IF N (REJECTED):                                            │
│   Output: "Plan archive skipped."                           │
│   Store: plan_archive_skipped = true                        │
│                                                             │
│ → Continue to Phase 10                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
---

### Phase 10: Session Evaluation (ALWAYS — CORE RESPONSIBILITY)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 10: SESSION EVALUATION                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ THIS PHASE ALWAYS RUNS — IT IS THE CORE PURPOSE OF THE AGENT│
│                                                             │
│ Read: .claude/sessions/{session-id}/brief.md                │
│                                                             │
│ Extract: success_criteria list                              │
│                                                             │
│ For EACH criterion:                                         │
│   Evaluate against evidence:                                │
│     - git diff (was code written?)                          │
│     - todo.md (was task marked [x]?)                        │
│     - build status (does it compile?)                       │
│     - test results (if applicable)                          │
│     - file existence (was deliverable created?)             │
│                                                             │
│   Grade:                                                    │
│     ✅ Done    — criterion fully met, evidence clear        │
│     ❌ Missed  — criterion not addressed or failed          │
│     ⚠️ Partial — criterion partially met, gaps remain       │
│                                                             │
│   For ❌ and ⚠️: include explicit reason                     │
│                                                             │
│ Determine session_status:                                   │
│   COMPLETE   — all criteria ✅                               │
│   INCOMPLETE — at least one ⚠️, no ❌                        │
│   BLOCKED    — at least one ❌                               │
│                                                             │
│ Compile:                                                    │
│   quick_wins: list of things done well                      │
│   gaps: list of things missed or partial                    │
│   flags: list of things requiring user attention            │
│     - assumptions made                                      │
│     - shortcuts taken                                       │
│     - tech debt introduced                                  │
│     - things left open                                      │
│     - edge cases not handled                                │
│                                                             │
│ Compile validation_checklist:                               │
│   - [x] Build passes                                        │
│   - [x] Changes committed (or [ ] if skipped)               │
│   - [x] PR created (if applicable)                          │
│   - [x] Tests pass (if applicable)                          │
│   - [ ] Manual verification needed: [specific items]        │
│                                                             │
│ → Continue to Phase 11                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 11: Write session-handoff.md (ALWAYS — BEFORE PRESENTING TO USER)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 11: WRITE SESSION-HANDOFF.MD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ THIS PHASE ALWAYS RUNS                                      │
│ FILE MUST BE WRITTEN BEFORE PRESENTING ANYTHING TO USER     │
│                                                             │
│ Path: .claude/sessions/{session-id}/session-handoff.md      │
│                                                             │
│ NOTE: This file combines the evaluation report AND the      │
│       handoff narrative into ONE unified document.          │
│       All agents across the system use this same format.    │
│                                                             │
│ Template:                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ # Session Handoff                                       │ │
│ │                                                         │ │
│ │ ## Session ID                                           │ │
│ │ {session-id}                                            │ │
│ │                                                         │ │
│ │ ## Status                                               │ │
│ │ {COMPLETE / INCOMPLETE / BLOCKED}                       │ │
│ │                                                         │ │
│ │ ## Summary                                              │ │
│ │ Goal: {goal from brief.md}                              │ │
│ │ Branch: {branch_name}                                   │ │
│ │ Date: {YYYY-MM-DD}                                      │ │
│ │                                                         │ │
│ │ ---                                                     │ │
│ │                                                         │ │
│ │ ## What Was Done                                        │ │
│ │ - {bullet list from completed_tasks}                    │ │
│ │ - {bullet list from git diff summary}                   │ │
│ │                                                         │ │
│ │ ## Files Modified                                       │ │
│ │ ```                                                     │ │
│ │ {git diff --stat output}                                │ │
│ │ ```                                                     │ │
│ │                                                         │ │
│ │ ## What Was Skipped or Blocked                          │ │
│ │ - {bullet list with reason for each}                    │ │
│ │ - {or "None" if nothing skipped}                        │ │
│ │                                                         │ │
│ │ ---                                                     │ │
│ │                                                         │ │
│ │ ## Evaluation Against Success Criteria                  │ │
│ │ | Criterion | Status | Evidence/Reason |                │ │
│ │ |-----------|--------|-----------------|                │ │
│ │ | {criterion 1} | ✅ Done | {evidence} |                 │ │
│ │ | {criterion 2} | ❌ Missed | {reason} |                 │ │
│ │ | {criterion 3} | ⚠️ Partial | {explanation} |           │ │
│ │                                                         │ │
│ │ ## Validation Checklist                                 │ │
│ │ - [x] Build passes                                      │ │
│ │ - [x] Changes committed: {commit_sha}                   │ │
│ │ - [x] PR created: {pr_url}                              │ │
│ │ - [x] Techdebt scan: {summary}                          │ │
│ │ - [ ] Manual verification needed:                       │ │
│ │   - {item 1}                                            │ │
│ │   - {item 2}                                            │ │
│ │                                                         │ │
│ │ ---                                                     │ │
│ │                                                         │ │
│ │ ## Session Actions                                      │ │
│ │ - Commit: {commit_sha or "skipped"}                     │ │
│ │ - PR: {pr_url or "N/A"}                                 │ │
│ │ - Tasks archived: {count or "none"}                     │ │
│ │ - Plans marked done: {list or "none"}                   │ │
│ │                                                         │ │
│ │ ## Agent Notes                                          │ │
│ │ - {assumptions made}                                    │ │
│ │ - {shortcuts taken}                                     │ │
│ │ - {edge cases to verify}                                │ │
│ │ - {tech debt introduced}                                │ │
│ │                                                         │ │
│ │ ---                                                     │ │
│ │                                                         │ │
│ │ ## Next Session                                         │ │
│ │ **Open PRs:**                                           │ │
│ │ - {pr_url}: {title}                                     │ │
│ │                                                         │ │
│ │ **Next task:**                                          │ │
│ │ {first [ ] item from todo.md}                           │ │
│ │                                                         │ │
│ │ **Suggested focus:**                                    │ │
│ │ {based on what was incomplete or blocked}               │ │
│ │                                                         │ │
│ │ ---                                                     │ │
│ │ Generated: {timestamp}                                  │ │
│ │ Agent: end-of-session-agent                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Write file to disk                                          │
│                                                             │
│ → Continue to Phase 12                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
---

### Phase 12: Present to User (ALWAYS — USER CONFIRMATION REQUIRED)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 12: PRESENT TO USER                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Print clean terminal summary (NOT the raw file):            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ═══════════════════════════════════════════════════════ │ │
│ │ SESSION WRAP: {session-id}                              │ │
│ │ ═══════════════════════════════════════════════════════ │ │
│ │                                                         │ │
│ │ STATUS: {COMPLETE ✅ / INCOMPLETE ⚠️ / BLOCKED ❌}       │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ QUICK WINS                                              │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ • {thing done well 1}                                   │ │
│ │ • {thing done well 2}                                   │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ GAPS                                                    │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ • {missed or partial item 1} — {reason}                 │ │
│ │ • {missed or partial item 2} — {reason}                 │ │
│ │ (or "None — all criteria met")                          │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ FLAGS REQUIRING YOUR ATTENTION                          │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ ⚠️ {assumption or decision needing confirmation}        │ │
│ │ ⚠️ {edge case to manually verify}                       │ │
│ │ (or "None")                                             │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ VALIDATION                                              │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ [x] Build passes                                        │ │
│ │ [x] Changes committed                                   │ │
│ │ [x] PR created                                          │ │
│ │ [ ] Manual checks: {list}                               │ │
│ │                                                         │ │
│ │ ═══════════════════════════════════════════════════════ │ │
│ │ Full report: .claude/sessions/{session-id}/session-handoff.md │ │
│ │ ═══════════════════════════════════════════════════════ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🛑 USER CONFIRM:                                            │
│ "Does this look accurate? (Y to close / N to flag issues)"  │
│                                                             │
│ IF Y (CONFIRMED):                                           │
│   → Session officially closed                               │
│   → Continue to Phase 13                                    │
│                                                             │
│ IF N (FLAGS ISSUES):                                        │
│   → Ask: "What needs to be corrected?"                      │
│   → Update session-handoff.md with user's corrections       │
│   → Re-present summary                                      │
│   → Loop until user confirms                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

---

### Phase 13: Handoff Report (ALWAYS — FINAL STEP)
Key change: Phase 13 is gone. Handoff is now part of Phase 11's unified session-handoff.md.
---

### Phase 14: Post-Stop Hook (AUTOMATIC — EXTERNAL)
┌─────────────────────────────────────────────────────────────┐
│ PHASE 14: AUTO-REFLECT (ENHANCED)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ THIS IS EXTERNAL — fires via .claude/settings.json          │
│ hooks.Stop → .claude/reflect/auto-reflect.ps1               │
│                                                             │
│ UPDATED BEHAVIOR:                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ STEP 1: CHECK FOR SESSION-HANDOFF.MD                    │ │
│ │                                                         │ │
│ │ Look for: .claude/sessions/*/session-handoff.md         │ │
│ │           (most recent by timestamp)                    │ │
│ │                                                         │ │
│ │ IF FOUND:                                               │ │
│ │   → Parse the file                                      │ │
│ │   → Extract: status, success criteria grades            │ │
│ │   → Continue to Step 2                                  │ │
│ │                                                         │ │
│ │ IF NOT FOUND:                                           │ │
│ │   → Fall back to legacy behavior (Step 3)               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ STEP 2: EVALUATE BASED ON SESSION-HANDOFF               │ │
│ │                                                         │ │
│ │ Parse success criteria:                                 │ │
│ │   ✅ Done    → count as pass                            │ │
│ │   ❌ Missed  → flag for reflection                      │ │
│ │   ⚠️ Partial → flag for reflection                      │ │
│ │                                                         │ │
│ │ IF any ❌ or ⚠️ found:                                   │ │
│ │   Build reflection context:                             │ │
│ │   {                                                     │ │
│ │     session_id: "...",                                  │ │
│ │     status: "INCOMPLETE" or "BLOCKED",                  │ │
│ │     missed_criteria: [                                  │ │
│ │       { criterion: "...", status: "❌", reason: "..." },│ │
│ │       { criterion: "...", status: "⚠️", reason: "..." } │ │
│ │     ],                                                  │ │
│ │     agent_notes: ["...", "..."]                         │ │
│ │   }                                                     │ │
│ │                                                         │ │
│ │   Invoke: claude --print with AUTO MODE reflect         │ │
│ │   Prompt:                                               │ │
│ │     "Session {session_id} ended with issues:            │ │
│ │      {missed_criteria as formatted list}                │ │
│ │                                                         │ │
│ │      Find ONE low-risk workflow improvement that        │ │
│ │      would help prevent this type of issue.             │ │
│ │      Apply if safe, log result."                        │ │
│ │                                                         │ │
│ │   Log to: .claude/reflect/auto-reflection-log.tsv       │ │
│ │   Columns: timestamp, session_id, issue_type,           │ │
│ │            improvement_applied, result                  │ │
│ │                                                         │ │
│ │ IF all ✅ (COMPLETE):                                    │ │
│ │   → Skip reflection (nothing to improve)                │ │
│ │   → Log: "Session {session_id} completed successfully"  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ STEP 3: LEGACY FALLBACK (no session-handoff found)      │ │
│ │                                                         │ │
│ │ Original behavior (unchanged):                          │ │
│ │   - Check for git conflict markers via git status       │ │
│ │   - If found → invoke claude --print with AUTO reflect  │ │
│ │   - Log to auto-reflection-log.tsv                      │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ → AGENT COMPLETE                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
---

## User Confirmation Gates Summary

| Gate | Phase | What User Sees | Can Skip Pipeline? |
|------|-------|----------------|-------------------|
| Mid-session warning | 1 | "Session appears incomplete. Continue?" | Yes (exits) |
| Commit approval | 6 | Visual staged files + commit message | No (continues without commit) |
| Plan delete approval | 9 | List of completed .plan.md files | No (continues without deletion) |
| Report confirmation | 12 | Summary digest | No (loops until confirmed) |

Per `memory/feedback_no_auto_commit.md` and `memory/feedback_git_confirmation.md` — agent NEVER auto-approves any of these.

---

## Behavior Rules

| Rule | Description |
|------|-------------|
| **Never skip session-handoff.md** | Even if session seems complete, always write it before presenting |
| **Never soften a ❌** | If something was missed, say it clearly. No "almost done" or "nearly there" |
| **Never evaluate your own work** | This agent only runs AFTER execution is done by another agent |
| **Brief is source of truth** | Evaluate against brief.md, not your own interpretation of "done" |
| **Fresh context only** | Do not expect conversation history. Introspect via git/files only |
| **No auto-commits** | Every git write requires explicit user approval |
| **No auto-closes** | Session is only closed when user confirms the report |
| **Hard stop on no brief** | Cannot evaluate without brief.md — exit and ask user to create one |
| **Hard stop on build fail** | Cannot close session with broken code — exit and ask user to fix |

---

## Dependencies

### Skills the Agent Invokes
| Skill | Phase | Purpose |
|-------|-------|---------|
| `techdebt/SKILL.md` | 5 | Code quality scan |
| `update-docs/SKILL.md` | 8 | Breadcrumb refresh |
| `worktree-session-end/SKILL.md` | 6 | Worktree merge/cleanup (delegated) |

### Agents the Agent May Invoke
| Agent | Phase | Purpose |
|-------|-------|---------|
| `git-agent.md` | 6 | Complex git operations (if needed) |

### Tools Required
| Tool | Purpose |
|------|---------|
| `git` CLI | Status, diff, commit, push, log |
| `ng` CLI | Build verification |
| `gh` CLI | PR creation, PR list |

### Files Required (Pre-existing)
| File | Required By |
|------|-------------|
| `.claude/sessions/{session-id}/brief.md` | Phase 0 (hard requirement) |
| `.claude/todo.md` | Phase 3, 7 |
| `memory/feedback_no_auto_commit.md` | Phase 6 behavior |
| `memory/feedback_git_confirmation.md` | Phase 6 behavior |

---

## Success Criteria

- [ ] Agent file exists at `.claude/agents/end-of-session-agent.md`
- [ ] Agent stops with clear message when brief.md not found (Phase 0)
- [ ] Agent warns and confirms when session appears incomplete (Phase 1)
- [ ] Agent detects worktree vs main repo correctly (Phase 2)
- [ ] Agent skips phases correctly based on conditions
- [ ] Build failure stops the pipeline (Phase 4)
- [ ] Techdebt scan runs and writes report when code changed (Phase 5)
- [ ] All 3 git/archive/plan confirmation gates work (Phases 6, 7, 9)
- [ ] Agent never auto-commits or auto-approves
- [ ] Session evaluation correctly grades against brief.md criteria (Phase 10)
- [ ] session-handoff.md is ALWAYS written before presenting to user (Phase 11)
- [ ] User can flag issues and agent updates report (Phase 12)
- [ ] Session only closes on user confirmation (Phase 12)
- [ ] Unified session-handoff.md is written to .claude/sessions/{session-id}/ (Phase 13)
- [ ] Existing trigger phrases spawn this agent
- [ ] Agent can be invoked by other agents via `<invoke>` syntax

---

## Notes

- This agent replaces the need to remember 4+ separate triggers
- The auto-reflect.ps1 Stop hook still fires AFTER this agent completes
- Agent is lean — reads brief, introspects via git/files, no conversation history needed
- If worktree detected, Phase 6 delegates to worktree-session-end's existing merge/cleanup menu
- All outputs are structured for easy parsing by future tooling