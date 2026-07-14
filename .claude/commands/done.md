---
description: Validate a finished job (chat path) — close-out ask, then mark matching todos [x]
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# /done — Job validation (chat path)

Lightweight path when a job finished in chat and the Human is **not** running full `/ship`.  
Follow `docs/agent/job-validation.md` Path B exactly.

## Steps

1. Identify the job just completed (this chat / Human-named task).
2. Find matching open `[ ]` items in `.claude/todo.md` and the plan’s Atomic Sub-tasks (same IDs when present).
3. Print the close-out block and **wait** (unless the Human’s invoking message already contains a validation phrase: `done` / `mark done` / `mark it` / `verified` / `approved` / `LGTM for this job`):

```text
JOB DONE — awaiting your validation
Matched todos (still [ ]):
  - …
Reply: done  |  not yet  |  edit list
```

4. On **`done`** (or equivalent validation phrase):
   - Mark matching items `[x]`
   - Archive fully-complete plan sections to `.claude/todo-archive.md` under `## Done` when applicable
   - If committing in this turn → stage todo/plan files with that commit
   - Else → leave marks on disk and report: `Todo: marked [x] (uncommitted — include in next commit)`
5. On **`not yet`** → leave `[ ]`; ask what remains.
6. On **`edit list`** → revise matches; re-show block; wait again.

## Hard rules

- Never self-mark without Human validation.
- Never invent completion for unrelated open todos.
- `/ship` Approve **Y** remains the formal path (todos in the same ship commit). Use `/done` when there is no ship.
