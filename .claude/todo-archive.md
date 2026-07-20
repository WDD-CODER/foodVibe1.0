# Archived Done Tasks

This file is a **stub** (Plan 292). Completed plan sections no longer live here.

## Where to look

| Path | Purpose |
| --- | --- |
| [todo-archive/README.md](todo-archive/README.md) | Rules + volume layout |
| [todo-archive/NNN.md](todo-archive/) | Numbered volumes (max 300 lines each) — start at the highest `NNN` |
| [todo-archive/INDEX.md](todo-archive/INDEX.md) | Done rows from the old Plan Index |

Agents checking for duplicate plans: run `node scripts/plan-name-similarity.mjs` (scans `plans/` + the **last two** archive volumes only).

To archive newly completed sections from `todo.md`:

```bash
node scripts/todo-archive.mjs
```

Legacy monolith (pre-migration) was renamed to `todo-archive.legacy.md` and may be deleted after Human review.
