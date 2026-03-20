# Sweep Stale Todos

Scan `todo.md` for plan sections where all items are `[x]` and no safety exceptions apply. Propose archival of qualifying sections to `todo-archive.md`.

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

### Step 3b — Age threshold
Only propose archiving sections from plans older than **7 days**. Infer plan age from:
```bash
git log --oneline -- plans/<NNN>-*.plan.md | tail -1
```
If the plan file was committed fewer than 7 days ago → keep it. Add to **Sections Kept** with reason: "plan too recent (< 7 days)."

### Step 4 — Propose archival
List all sections that passed every gate. Ask: "Archive these sections to `todo-archive.md`?"

### Step 5 — If approved
Move each approved section (heading + items) from `todo.md` to `todo-archive.md` (create if needed), appended with today's date and plan number.

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
