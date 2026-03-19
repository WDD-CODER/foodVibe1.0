---
name: No-auto-test agent rule
overview: Remove the automatic "run tests" after Execute from the agent workflow so the full test suite only runs at commit time (Phase 0) or when the user explicitly asks. Three targeted, minimal edits across three files.
---

# No-auto-test agent rule

## What changes and why

The only reason agents run the full test suite after executing a plan is **agent.md Step 5** (`Audit: Run tests to confirm nothing is broken`). This triggers compute on every plan execution, even during iteration when code is still changing. The fix is three small, surgical edits — no new files, no new concepts.

## Files to change

### 1. agent.md — Step 5 (root cause)

**Current (line 59):** `5. **Audit**: Run tests to confirm nothing is broken.`

**Replace with:** `5. **Audit**: Verify the build compiles (`ng build` if uncertain). Do NOT run the full test suite here — it runs only in the commit-to-github flow (Phase 0) or when the user explicitly asks.`

### 2. .claude/copilot-instructions.md — Section 3 (Services)

Append to the Services bullet: `Do not run the full test suite after executing a plan — only in the commit-to-github flow (Phase 0) or when the user explicitly asks.`

### 3. .claude/todo.md — Pending item line 867

**Current:** `run tests before considering the task done.`  
**Replace with:** `run the full test suite only at commit time (Phase 0) or when the user explicitly asks — not after every iteration.`

## What stays the same

- commit-to-github Phase 0 — unchanged. Full test suite still runs before every commit.
- git-commit-must-use-skill.mdc — unchanged.
