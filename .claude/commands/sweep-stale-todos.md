# Sweep Stale Todos

Scan `todo.md` for plan sections where all items are `[x]` and no safety exceptions apply. Archive qualifying sections via `node scripts/todo-archive.mjs` into numbered `.claude/todo-archive/NNN.md` volumes (max 300 lines).

## When to Run

- Automatically during session-end (prompted by `session-end.mdc`)
- After a series of commits
- Manually on demand

---

## Steps

### Step 1 — Read
Read `.claude/todo.md` in full.

### Step 2 — Identify all-`[x]` sections
Identify plan sections where every item is `[x]` (no open `[ ]` items remain).

### Step 2b — Deferred item filter
From the all-`[x]` sections, remove any section that contains the text `(deferred)`, `(skipped)`, or `[~]`. Add these to the **Sections Kept** report with reason: "contains deferred items."

### Step 3 — Precise git verification
For each remaining candidate section, run in order:
```bash
git log --oneline | grep -i "<plan-keyword>"        # any commit ref
gh pr list --state merged --search "<plan-keyword>" # merged PR
```
If **neither** returns results → flag as "unverifiable" and exclude from the archive proposal. Add to **Sections Kept** with reason: "all [x] but no git verification found — manual review needed."

### Step 4 — Archive via script
If Step 3 left any **unverifiable** candidates, stop and report them under Sections Kept — do **not** run the script until the Human confirms.

Otherwise run:

```bash
node scripts/todo-archive.mjs
```

The script moves every all-`[x]` section (skipping deferred/skipped/`[~]`) from `todo.md` into the latest `.claude/todo-archive/NNN.md` volume, rolling to `NNN+1` when an append would exceed 300 lines. No hand-edits to a monolithic `todo-archive.md`.

### Step 6 — Report

```markdown
## Stale Todo Sweep — [Date]

### Sections Archived
- Plan NNN: [title] — N items (verified: [commit hash or PR #])

### Sections Kept
- Plan NNN: N/M items done
- Plan NNN: all [x] but contains deferred items
- Plan NNN: all [x] but no git verification found — manual review needed
- Plan NNN: all [x] but plan too recent (< 7 days)
```
