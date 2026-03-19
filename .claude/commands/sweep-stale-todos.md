# Sweep Stale Todos

Scan `todo.md` for plan sections where all items are `[x]` or where the plan branch is already merged to main. Propose archival of those sections to `todo-archive.md`.

## When to Run

- After a series of commits
- At session end, before wrap up
- Periodically (monthly)

## Steps

1. **Read** `.claude/todo.md`.
2. **Identify** plan sections where ALL items are `[x]`.
3. **Check git** — for each fully-completed section, verify the plan branch is merged:
   ```bash
   gh pr list --state merged | grep "<plan-name>"
   git log --oneline | grep "<plan-name>"
   ```
4. **Propose archival**: List the sections to be archived and ask: "Archive these sections to `todo-archive.md`?"
5. **If approved**: Move those sections (heading + items) from `todo.md` to `todo-archive.md`, appended with today's date and plan number.
6. **Report**:

```
## Stale Todo Sweep — [Date]

### Sections Archived
- Plan NNN: [section title] — [N] items

### Sections Kept (incomplete)
- Plan NNN: [N/M items done]
```
