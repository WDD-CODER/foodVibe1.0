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

### Step 4 — Archive immediately
Move each qualifying section (heading + all items) from `todo.md` to `todo-archive.md`, appended under `## Done`. No confirmation gate — all-`[x]` sections that passed git verification are archived on the spot.

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
