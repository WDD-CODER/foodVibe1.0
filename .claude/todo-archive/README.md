# Todo Archive Volumes

Numbered dumps of **fully done** plan sections moved out of `.claude/todo.md`
so agents only read open work by default.

## Layout

| Path | Role |
| --- | --- |
| `NNN.md` (e.g. `001.md`) | Archive volume — max **300 lines** |
| `INDEX.md` | Historical Done catalog rows (moved out of todo.md; not an open-work index) |
| `README.md` | This file |

Legacy single file `.claude/todo-archive.md` is migrated once via
`node scripts/todo-archive.mjs --migrate`, then replaced with a stub.

## Rules

1. **When to archive** — a `### Plan …` section in `todo.md` where every checkbox
   is `[x]`, and the section does **not** contain `(deferred)`, `(skipped)`, or `[~]`.
2. **How** — run `node scripts/todo-archive.mjs` (wired from `/ship`, `/done`,
   `/sweep-stale-todos`). Use `--dry-run` to preview.
3. **Volume roll** — append to the latest `NNN.md`; if the append would exceed
   300 lines, create `NNN+1.md` and continue.
4. **Agent duplicate check** — when validating a new plan name, read only the
   **last two** volume files (`NNN-1.md` + `NNN.md`), not the full history.
   `scripts/plan-name-similarity.mjs` does this automatically (Milestone 2).

## Do not

- Do not hand-edit volumes to “fix” history without Human approval.
- Do not put open `[ ]` tasks into archive volumes.
- Do not ask agents to load every volume on session start.
