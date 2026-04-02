---
description: Autonomous plan executor — finds next incomplete plan, validates, executes, surfaces for approval
allowed-tools: Read, Write, Edit, Bash, Agent, mcp__playwright__*, mcp__plugin_playwright_playwright__*
---

# Command: auto-solve

Autonomous workflow that processes plans from `todo.md` one by one.

**Assumes:** Session started with `--worktree --dangerously-approve`

---

## Phase 0 — Find Next Plan

1. Read `.claude/todo.md`
2. Find the first plan section with unchecked `[ ]` items
3. Extract the plan file path from the header (e.g., `plans/219-recipe-header-photo-picker.plan.md`)
4. If no incomplete plans found → report "All plans complete" and stop

---

## Phase 1 — Understand & Present

1. Read the plan file completely
2. **Present to user in plain language:**

```
## Next Plan: [Plan Name]

**What this does:** [1-2 sentence plain English summary]

**Tasks:**
1. [Plain language description of checkbox 1]
2. [Plain language description of checkbox 2]
...

**Complexity assessment:** [Simple / Medium / Complex]
**Estimated scope:** [N files, N components]

Continuing in 5 seconds... (Ctrl+C to stop)
```

3. Run `sleep 5` (allows user to abort if something looks wrong):
```bash
sleep 5
```

4. Assess complexity. If the plan has more than 8 tasks, touches >3 subsystems, or requires architectural decisions → stop and report:
```
   COMPLEXITY GATE — This plan requires human planning first.
   Reason: [specific reason]
```

---

## Phase 1.5 — Git History Check (before any modification)

Before touching any file mentioned in the plan:

1. **Check recent commits on target files:**
```bash
git log --oneline -5 -- <file>
```

2. **If plan involves restoration or revert:**
```bash
git diff <base>..HEAD -- <file>
```
Review what would be lost. Surface to user if significant changes detected.

3. **Rule:** Never add methods, restore code, or make structural changes without first verifying current state via git history. This prevents wasted tool calls on already-done work.

---

## Phase 2 — Pre-Validate Checkboxes

For each checkbox in the plan:

1. **Code inspection first:** Read the target file, check if the described change already exists
2. **Browser verification (if UI-related):** Use Playwright to verify visual state if applicable
3. Mark each checkbox as:
   - `DONE` — already implemented in code
   - `TODO` — needs to be done
   - `BLOCKED` — dependency missing or unexpected state

Output:
```
## Pre-Validation Results
- [x] Task 1 — DONE (already in code at line 45)
- [ ] Task 2 — TODO
- [ ] Task 3 — TODO
- [ ] Task 4 — BLOCKED (missing dependency: X)
```

---

## Phase 3 — Execute

Use Team Leader orchestration patterns to determine parallelism:
- Tasks targeting **different files** → run in parallel via Agent tool
- Tasks with **dependencies or same file** → run sequentially

Execute all `TODO` tasks.

For `BLOCKED` tasks:
- If solvable without major deviation → solve and continue
- If complex/risky → mark as "needs human" and skip

After each task: update checkbox in `.claude/todo.md` to `[x]`.

---

## Phase 4 — Self-Validate

Run validation checklist:
```bash
ng build 2>&1 | tee /tmp/build-output.txt
if grep -q "ERROR" /tmp/build-output.txt; then
  echo "BUILD FAILED — errors detected:"
  grep "ERROR" /tmp/build-output.txt
  exit 1
fi
```

```bash
ng lint 2>/dev/null || echo "No lint configured"
```

If plan touched UI/layout:
- Read `.worktree-port` (fallback 4200)
- Run `/qa http://localhost:<port>/<affected-page>`
- Capture screenshot if Playwright available

---

## Phase 5 — Surface for Approval

1. **Sound signal:**
```bash
powershell -Command "[console]::beep(800,300); Start-Sleep -Milliseconds 100; [console]::beep(1000,300)"
```

2. **Present validation report:**

```
===================================================
PLAN COMPLETE — AWAITING APPROVAL
===================================================

## Plan: [Name]

## Summary
[One sentence: what was accomplished]

## Tasks Completed
| # | Task | Status | What was done |
|---|------|--------|---------------|
| 1 | [checkbox text] | DONE | [short description] |
| 2 | [checkbox text] | DONE | [short description] |
| 3 | [checkbox text] | SKIPPED | [reason] |

## Validation
ng build — passed / failed
ng lint — passed / N/A
Visual QA — passed / skipped / screenshot captured

## Files Modified
- path/to/file1.ts
- path/to/file2.scss

===================================================
Commands:
  "approve"          — commit changes and continue to next plan
  "approve and stop" — commit changes and end session
  "show diff"        — display git diff
  "abort"            — discard all changes (git checkout .)
===================================================
```

---

## Phase 6 — Handle User Response

- **"approve":**
  1. Before committing, verify plan file number is still unique (re-check `plans/` directory)
  2. If collision detected (another worktree created same-numbered plan), rename current plan to next available number and update `todo.md` reference
  3. Commit with conventional message (read `.claude/agents/git-agent.md`)
  4. Loop back to Phase 0 for next plan
- **"approve and stop"** → Commit, then run session-handoff skill
- **"show diff"** → Run `git diff`, then wait for next command
- **"abort"** → Run `git checkout .` to discard, end session

---

## Error Handling

- **Build fails:** Stop, show full error output, wait for user input — do not auto-fix
- **Playwright unavailable:** Skip visual QA, note in report
- **Unexpected file state:** Stop that task, mark as "needs human", continue with others
- **All tasks blocked:** Surface immediately, don't wait for validation phase

---

## Permissions Required

These are already in `.claude/settings.json`:
- `Bash(*)` — for build, git, sound
- `Write/Edit` for worktree paths
- `mcp__playwright__*` and `mcp__plugin_playwright_playwright__*` — for visual QA
