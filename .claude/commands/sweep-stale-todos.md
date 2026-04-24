# Sweep Stale Todos

Scan `todo.md` for plan sections where all items are `[x]` and no safety exceptions apply. Archive qualifying sections to `todo-archive.md` with git verification and a metadata audit trail.

## When to Run

- Automatically during session-end (prompted by `session-end.mdc`)
- After a series of commits
- Manually on demand

---

## Steps

### Step 1 — Read
Read `.claude/todo.md` in full.

### Step 2 — Invoke todo-archive skill
Read `.claude/skills/todo-archive/SKILL.md` and follow it in **scan-mode**.
Pass `caller=sweep-stale-todos` as the `archived_by` value.

The skill handles:
- Identifying all-`[x]` sections
- Deferred-item filter
- Operational-task filter
- Git verification (commit log + merged PRs)
- Writing to `todo-archive.md` with metadata header
- Removing archived sections from `todo.md`
- Returning a report block

### Step 6 — Report
Relay the skill's `TODO-ARCHIVE REPORT` block verbatim to the user.
If any sections were `kept` with `ARCHIVE-PENDING` reasons, surface those reasons explicitly.
