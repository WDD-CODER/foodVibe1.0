# /ship Workflow Analysis

> **Purpose:** Comprehensive inventory of every activity, command, skill, hook, and implicit pattern that fires (or should fire) when a coding session ends. This analysis led to the creation of the `/ship` (`.claude/agents//ship (formerly /ship)`). Some information below reflects the pre-migration state.
>
> **Generated:** 2026-04-08
> **Updated:** 2026-04-08 â€” /ship created. Session handoff skill is now a redirect. Output path migrated from `notes/session-handoffs/` to `.claude/sessions/{session-id}/session-handoff.md`.

---

## 1. Inventory Table

| # | Name | Type | Location | Trigger | What It Does |
|---|------|------|----------|---------|--------------|
| 1 | **Session Handoff** | Skill | `.claude/skills/session-handoff/SKILL.md` | User says "done / wrap up / ship / handoff / end session / finish up" on main repo (`.git` detected) | Gathers completed tasks from `todo.md`, lists modified files, reads open PRs, writes a structured narrative summary to `notes/session-handoffs/<YYYY-MM-DD>.md`, suggests plan file cleanup, reminds about `github-sync` |
| 2 | **Worktree Session End** | Skill | `.claude/skills/worktree-session-end/SKILL.md` | Same trigger phrases but inside a git worktree (`.git/worktrees/*` detected) | Checks dirty/unpushed state â†’ delegates to git-agent for commit/push/PR â†’ offers merge+cleanup or keep-open â†’ kills dev server, pulls main, writes `.worktree-cleanup` breadcrumb |
| 3 | **Techdebt Audit** | Skill | `.claude/skills/techdebt/SKILL.md` | "End of session, before PR" (per `copilot-instructions.md` Â§0 triggers) | Scans `src/app/` for dead code, unused imports, TODO/FIXME, style violations, security flags â†’ writes rolling report to `.claude/techdebt-reports/techdebt-YYYY-MM-DD.md` (7-report retention) â†’ updates breadcrumbs via `update-docs` |
| 4 | **Sweep Stale Todos** | Command | `.claude/commands/sweep-stale-todos.md` | "At session end (after all tasks marked `[x]`)" or on explicit `/sweep-stale-todos` | Finds all-`[x]` plan sections in `todo.md` â†’ verifies via `git log` + `gh pr list --state merged` â†’ enforces 7-day age threshold â†’ proposes archival to `todo-archive.md` |
| 5 | **Git Agent** | Agent | `.claude/agents/git-agent.md` | Invoked by session-handoff or worktree-session-end when uncommitted/unpushed work exists | Assesses repo state â†’ proposes visual commit tree â†’ waits for user approval â†’ commits, pushes, creates PR â†’ auto-archives completed todo sections |
| 6 | **Update Docs** | Skill | `.claude/skills/update-docs/SKILL.md` | "After features" trigger; also called by techdebt Phase 4 | Refreshes `breadcrumbs.md` at major seams, prunes stale entries, updates key exports |
| 7 | **Finalize Docs** | Skill | `.claude/skills/finalize-docs/SKILL.md` | User says "finalize docs" or "global audit" | Full documentation audit: seam verification, dead-link check, icon registry sync, domain dictionary sync, architecture state report |
| 8 | **Evaluate Me** | Command | `.claude/commands/evaluate-me.md` | User runs `/evaluate-me` | Session retrospective: inventories agents used, files touched, evaluates efficiency/accuracy/gate compliance, extracts patterns, generates suggested file edits, saves to `.claude/retrospectives/` |
| 9 | **Reflect (Session Retrospective)** | Command | `.claude/commands/reflect.md` | User runs `/reflect` (no args) | Scans session for skills used, reports improvement opportunities, optionally runs skill-improvement iterations |
| 10 | **Auto-Reflect (Stop Hook)** | Hook + Script | `.claude/settings.json` â†’ `.claude/reflect/auto-reflect.ps1` | **Automatic** â€” fires on every Claude Code session stop via `hooks.Stop` | In `failure-only` mode (default): checks for git conflict markers â†’ if found, invokes `claude --print` with AUTO MODE reflect â†’ logs to `auto-reflection-log.tsv` |
| 11 | **Auto-Reflect (Inline)** | Behavioral Rule | `copilot-instructions.md` Â§0 ("Auto-reflect after correction cycle") | **Automatic** â€” agent detects completed correction cycle during session | Runs reflect AUTO MODE inline: finds one low-risk improvement, applies it, logs result, exits |
| 12 | **Validation Checklist** | Instruction | `.claude/instructions/validation-checklist.md` | After any code execution task completes (post-execution gate) | Shows "HOW TO VALIDATE" checklist, asks user to verify or auto-verify |
| 13 | **Build Verification Gate** | Gate | `copilot-instructions.md` Â§0.4 + `agent.md` Post-Execution Gate | After any agent-written code, before marking tasks `[x]` | Mandatory `ng build` or `getDiagnostics` â€” trust the compiler, not the agent's self-report |
| 14 | **Test â†’ PR â†’ Review â†’ Merge** | Command | `.claude/commands/test-pr-review-merge.md` | User runs `/test-pr-review-merge` | Full CI pipeline: sync trunk â†’ unit tests â†’ build verification â†’ push â†’ create PR â†’ review checks â†’ merge with `--delete-branch` |
| 15 | **Ship (gstack)** | Skill (gstack) | `~/.claude/skills/gstack/` | User says "ship" | gstack's deploy workflow â€” detect+merge base, run tests, review diff, bump VERSION |
| 16 | **Auto-Solve "approve and stop"** | Path in Command | `.claude/commands/auto-solve.md` Phase 6 | User says "approve and stop" during auto-solve loop | Commits changes â†’ runs session-handoff skill â†’ ends |
| 17 | **Plan Cleanup Suggestion** | Pattern | Session handoff output (implicit) | During session-handoff Phase 3 | Suggests deleting `.plan.md` files that are fully implemented and committed |
| 18 | **Sync Check / github-sync Reminder** | Pattern | Session handoff output (implicit) | During session-handoff Phase 3 | If unpushed commits exist â†’ reminds user to run `github-sync` at next session start |
| 19 | **User Confirmation Gate (commits)** | Memory/Feedback | `memory/feedback_no_auto_commit.md` | Before every `git commit` or `git push` | Show visual staged-files summary + proposed commit message â†’ wait for explicit user approval |
| 20 | **User Confirmation Gate (git-agent plans)** | Memory/Feedback | `memory/feedback_git_confirmation.md` | When git-agent presents "Approve? Y/N" | Relay the plan to the user â†’ never auto-approve |
| 21 | **Main-branch auto-redirect** | Memory/Feedback | `memory/feedback_ship_on_main_redirect.md` | Session-end phrases on `main` | Automatically invoke `session-handoff` instead of stopping with a message |

---

## 2. Workflow Sequence

The typical /ship flow, reconstructed from skill triggers, handoff examples, and `copilot-instructions.md`:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  USER SAYS: "done" / "wrap up" / "ship" / "handoff"        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 0: Environment Detection  â”‚
â”‚ git rev-parse --git-dir         â”‚
â”‚ â”œâ”€ .git/worktrees/* â†’ WORKTREE  â”‚
â”‚ â””â”€ .git            â†’ MAIN REPO â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”
     â–¼                 â–¼
 WORKTREE          MAIN REPO
 (skill: worktree  (skill: session
  -session-end)     -handoff)
     â”‚                 â”‚
     â–¼                 â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚ Dirty check  â”‚       â”‚
â”‚ â†’ git-agent  â”‚       â”‚
â”‚   if needed  â”‚       â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
       â–¼               â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚ Merge/Keep/  â”‚       â”‚
â”‚ Cancel menu  â”‚       â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
       â”‚               â”‚
       â–¼               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 1: Build Verification     â”‚  â† often implicit / already done
â”‚ ng build (if not run recently)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 2: Techdebt Audit         â”‚  â† trigger: "end of session, before PR"
â”‚ Scan src/app/, write report     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 3: Git Operations         â”‚
â”‚ â”œâ”€ Stage files                  â”‚
â”‚ â”œâ”€ Show visual tree to user     â”‚
â”‚ â”œâ”€ Wait for explicit approval   â”‚
â”‚ â”œâ”€ Commit (Conventional Commits)â”‚
â”‚ â”œâ”€ Push                         â”‚
â”‚ â””â”€ Create PR (if applicable)    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 4: Todo Maintenance       â”‚
â”‚ â”œâ”€ Mark completed tasks [x]     â”‚
â”‚ â”œâ”€ Sweep stale todos â†’ archive  â”‚
â”‚ â””â”€ Update todo.md               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 5: Documentation          â”‚
â”‚ â”œâ”€ Update breadcrumbs (update-  â”‚
â”‚ â”‚   docs) if structural changes â”‚
â”‚ â””â”€ Suggest plan file cleanup    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 6: Session Handoff Report â”‚
â”‚ â”œâ”€ Gather completed [x] tasks   â”‚
â”‚ â”œâ”€ List modified files          â”‚
â”‚ â”œâ”€ Read open PRs                â”‚
â”‚ â”œâ”€ Write narrative summary      â”‚
â”‚ â”œâ”€ Identify next [ ] task       â”‚
â”‚ â””â”€ Save to notes/session-       â”‚
â”‚    handoffs/<date>.md            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ PHASE 7: Post-Stop (automatic)  â”‚
â”‚ auto-reflect.ps1 Stop hook      â”‚
â”‚ â”œâ”€ Check for failure signals    â”‚
â”‚ â””â”€ If found â†’ AUTO reflect      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Sequence Notes

- **Phases 2â€“5 are not always run explicitly.** The session-handoff skill itself only covers Phases 0, 6, and parts of 3/5. Techdebt audit, stale-todo sweep, and build verification depend on the user or agent remembering the triggers in `copilot-instructions.md`.
- **Git operations (Phase 3)** may happen before or during the handoff â€” the handoff skill checks for dirty state but delegates to git-agent.
- **Phase 7 (auto-reflect)** is fully automatic via the Stop hook â€” it fires regardless of whether the user ran session-handoff.

---

## 3. Dependencies

| Step | Requires |
|------|----------|
| Environment Detection | `git rev-parse --git-dir` output |
| Worktree Session End | `.worktree-port`, `.worktree-root`, main repo path |
| Build Verification | `ng build` or `mcp__ide__getDiagnostics` availability |
| Techdebt Audit | Access to `src/app/`, previous reports in `.claude/techdebt-reports/` for trend comparison |
| Git Operations | `git status`, `git diff`, branch name, staged files, conventional commit conventions from `standards-git.md` |
| User Confirmation Gates | Visual summary of staged files, commit message, target branch |
| Todo Maintenance | Current `.claude/todo.md`, `git log` for plan verification, `gh pr list --state merged` for PR verification, plan file dates for 7-day age threshold |
| Update Docs | Knowledge of which directories changed, breadcrumb seam definitions from `standards-angular.md` |
| Session Handoff Report | Completed `[x]` tasks from `todo.md`, list of modified files, open PRs via `gh pr list` or MCP, next `[ ]` task from `todo.md` |
| Plan Cleanup | List of `.plan.md` files, knowledge of which are fully implemented |
| github-sync Reminder | `git log origin/main..HEAD` (are there unpushed commits?) |
| Auto-Reflect Hook | `git status --short` for conflict markers, `claude --print` CLI availability |

---

## 4. Gaps Identified

### 4.1 No Single Orchestrator

The biggest gap: **there is no unified /ship that runs the full sequence.** The user must know to:
1. Trigger session-handoff (or worktree-session-end)
2. Separately remember that techdebt audit should run "at end of session, before PR"
3. Separately remember to sweep stale todos
4. Separately remember to update docs if structural changes were made

The session-handoff skill handles reporting but does NOT invoke techdebt, stale-todo sweep, or update-docs. These are triggered by separate rules in `copilot-instructions.md` that rely on the agent's memory of when to fire them.

### 4.2 Build Verification is Assumed, Not Enforced

The post-execution gate says `ng build` is "mandatory, no exceptions," but the session-handoff skill doesn't include a build step. If the last code change wasn't followed by a build, there's no guarantee the session ends with a green build.

### 4.3 Techdebt Audit Has No Automated Trigger at Session End

`copilot-instructions.md` says techdebt should run "End of session, before PR," but nothing in the session-handoff or worktree-session-end skills actually invokes it. It relies on the agent noticing the trigger and acting on it â€” which is inconsistent.

### 4.4 Stale Todo Sweep is Easily Forgotten

The sweep command says it runs "automatically during session-end," but neither session-handoff nor worktree-session-end invokes it. The git-agent has its own inline archive logic (Step 10 in commit flow), but that only runs after a commit â€” not at session end if no new commit was made.

### 4.5 No Consolidated Diff/Change Summary

The session handoff asks for a "file audit" (list all files modified) but doesn't systematically run `git diff --stat` or gather the actual changes. The file list in handoff reports varies in quality â€” sometimes it's thorough, sometimes it's incomplete.

### 4.6 Plan Cleanup is Suggestion-Only

Session handoff "suggests deleting" fully-implemented plan files but never actually deletes them. Over time, the `plans/` directory accumulates completed plans that add noise. There's no automated cleanup path with user confirmation.

### 4.7 No Memory Pruning at Session End

The auto-memory system accumulates entries but there's no session-end step to review and prune stale memories. This is a slow-growing problem.

### 4.8 Validation Checklist Has No Session-End Integration

The validation checklist (`validation-checklist.md`) runs after individual execution tasks but has no role in the /ship flow. Outstanding unverified items aren't surfaced in the handoff.

### 4.9 Evaluate-Me and Reflect Are Never Triggered Automatically at Session End

`/evaluate-me` (session retrospective) and `/reflect` (session retrospective path) are user-invoked only. The auto-reflect hook runs on Stop but only in `failure-only` mode â€” it's not a full retrospective. There's no automatic quality review at session end.

### 4.10 Worktree Cleanup File Is Not Always Processed

The `.worktree-cleanup` breadcrumb file written by worktree-session-end is only processed by `github-sync` at the next session start. If the user forgets to run `github-sync`, stale remote branches accumulate.

---

## 5. Consolidation Opportunities

### 5.1 Unified /ship

Combine into a single orchestrated flow:
1. Environment detection (main vs worktree)
2. Build verification (mandatory gate)
3. Techdebt audit (currently separate trigger)
4. Git operations with user confirmation
5. Todo maintenance + stale sweep (currently fragmented between git-agent auto-archive and sweep-stale-todos command)
6. Documentation refresh (currently separate trigger)
7. Session handoff report
8. Plan cleanup (with user confirmation)

This eliminates 4 separate trigger rules and replaces them with one deterministic pipeline.

### 5.2 Git + Todo as a Single Transaction

Currently, git-agent commits â†’ then updates todo â†’ then optionally archives. The session-handoff also reads todo for completed tasks. These could be a single atomic step: commit â†’ mark `[x]` â†’ archive qualifying sections â†’ generate handoff â†’ done.

### 5.3 Techdebt + Build Verification Merge

The techdebt audit already scans for code issues. The build verification is a superset check. Run `ng build` first, then if it passes, run the techdebt scan as a lighter-weight quality pass. If `ng build` fails, skip techdebt and focus on fixing the build.

### 5.4 Handoff Report + Stale Sweep as One Phase

The handoff report already reads `todo.md` to identify completed tasks and next steps. The stale sweep also reads `todo.md` to find archivable sections. Merge these into one pass: read `todo.md` once â†’ identify completed tasks for the handoff narrative â†’ identify archivable sections â†’ propose archive â†’ write handoff.

### 5.5 Plan Cleanup with Confirmation

Instead of "suggesting" plan deletion, the /ship should:
1. Identify fully-implemented plans (all `[x]`, verified in git, >7 days old)
2. List them with one-line summaries
3. Ask: "Delete these completed plan files? (Y/N)"
4. Execute on approval

### 5.6 Conditional Phases

Not every session needs every phase. The agent should skip intelligently:
- **No code changes this session** â†’ skip build verification, techdebt audit
- **No new `[x]` tasks** â†’ skip stale sweep
- **No structural changes** â†’ skip update-docs
- **On main with clean tree** â†’ skip git operations, go straight to handoff
- **Worktree** â†’ use worktree-session-end path, which has its own merge/cleanup flow

---

## 6. Proposed Agent Phase Map

For the future /ship, the recommended phase structure:

| Phase | Name | Condition | Source Skill/Command |
|-------|------|-----------|---------------------|
| 0 | Environment Detection | Always | New (inline) |
| 1 | State Assessment | Always | `git status`, `git diff --stat`, `todo.md` read |
| 2 | Build Gate | Code was changed this session | `ng build` (from Post-Execution Gate) |
| 3 | Techdebt Scan | Code was changed this session | `techdebt/SKILL.md` |
| 4 | Git Operations | Dirty tree or unpushed commits | `git-agent.md` (with user confirmation gates) |
| 5 | Todo + Archive | Tasks were completed | `sweep-stale-todos.md` + git-agent auto-archive |
| 6 | Doc Refresh | Structural changes detected | `update-docs/SKILL.md` |
| 7 | Plan Cleanup | Completed plans exist | New (with user confirmation) |
| 8 | Handoff Report | Always | `session-handoff/SKILL.md` |
| 9 | Post-Stop Hook | Always (automatic) | `auto-reflect.ps1` (unchanged) |

### User Confirmation Points (non-negotiable per feedback memories)

1. **Phase 4**: Visual commit tree + message â†’ "Approve?" before any git write
2. **Phase 5**: Archive list â†’ "Archive these?" before moving todo sections
3. **Phase 7**: Plan file list â†’ "Delete these?" before removing plan files

---

## 7. Source File Cross-Reference

All files analyzed for this report:

| File | Role |
|------|------|
| `.claude/copilot-instructions.md` | Master trigger rules (Â§0 Skill Triggers) |
| `agent.md` | Preflight checklist, post-execution gate, core skills index |
| `.claude/skills/session-handoff/SKILL.md` | Main repo /ship report |
| `.claude/skills/worktree-session-end/SKILL.md` | Worktree /ship cleanup |
| `.claude/skills/techdebt/SKILL.md` | Code quality audit |
| `.claude/skills/update-docs/SKILL.md` | Breadcrumb/documentation refresh |
| `.claude/skills/finalize-docs/SKILL.md` | Global documentation audit |
| `.claude/skills/github-sync/SKILL.md` | Worktree cleanup breadcrumb processing |
| `.claude/skills/save-plan/SKILL.md` | Plan numbering and todo sync |
| `.claude/commands/sweep-stale-todos.md` | Todo archival |
| `.claude/commands/evaluate-me.md` | Session retrospective |
| `.claude/commands/reflect.md` | Self-improvement loop (AUTO MODE) |
| `.claude/commands/test-pr-review-merge.md` | Full CI pipeline |
| `.claude/commands/auto-solve.md` | Autonomous executor ("approve and stop" path) |
| `.claude/agents/git-agent.md` | All git operations + todo auto-archive |
| `.claude/instructions/validation-checklist.md` | Post-execution verification |
| `.claude/settings.json` | Stop hook configuration |
| `.claude/reflect/auto-reflect.ps1` | Stop hook bridge script |
| `memory/feedback_no_auto_commit.md` | User rule: always confirm before commit |
| `memory/feedback_git_confirmation.md` | User rule: relay git-agent plans to user |
| `memory/feedback_ship_on_main_redirect.md` | User rule: auto-redirect to session-handoff on main |
| `notes/session-handoffs/*.md` | Historical handoff examples (pattern analysis) |
