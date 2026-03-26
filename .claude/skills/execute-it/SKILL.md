---
description: Execute the implementation plan from this conversation
allowed-tools: Read, Write, Edit, Bash
---

# Skill: execute-it

Execute the implementation plan we just created in this conversation, step by step.

## Workflow

1. **Follow the plan exactly** — do not deviate or add features
2. **Respect existing conventions** in the codebase
3. **Execute atomically** — one file change per commit (or one logical unit)
4. **Stop on surprises** — if you hit something unexpected, stop and report; do not improvise
5. **Update progress** — mark completed tasks in the plan

## Tools Available
- `Read` — examine files before modifying
- `Write` — create new files
- `Edit` — modify existing files
- `Bash` — run commands (build, test, git)

## Execution Rules

- **Read first** — always read a file before editing it
- **Commit often** — use conventional commits (feat/fix/docs/refactor) for each atomic change
- **Verify** — after each file change, run diagnostics or build checks if applicable
- **Stop on conflict** — if the code differs from what the plan expected, stop and report

## Output

When complete:
```
✓ Execution complete
- Tasks: [N completed]
- Files modified: [list]
- How to verify: [steps/checks]
```
