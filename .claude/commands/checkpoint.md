# /checkpoint — Project Schema Extension

This command invokes the gstack `checkpoint` skill (via `Skill` tool or `/checkpoint`).
The schema below defines the **project-specific sections** that must appear in every checkpoint file.

---

## Checkpoint Schema

When writing a checkpoint file, include these sections (in addition to the gstack skill's standard sections):

### Goal
What is the session trying to accomplish?

### Completed
What was finished before this checkpoint?

### Current step
Exactly what step are you on right now?

### Next steps
Ordered list of remaining work.

### Key decisions
Architectural or product choices made this session.

### Files touched
List of files modified (from `git status --short`).

### Pending Archive
List any `### Plan NNN` sections in `.claude/todo.md` that became all-`[x]` during this session but were not archived (because git verification hadn't happened yet, or an operational task needed user confirmation).
Format: `- Plan NNN — {title} — reason: {not-yet-committed | operational-task-unconfirmed | other}`
If none, write: `None.`

### Open questions
Unresolved decisions or blockers.

---

## Execution — Pending Archive Seeding

Before writing the checkpoint file, scan `.claude/todo.md` for any `<!-- ARCHIVE-PENDING: ... -->` comments. For each found, add an entry to the `## Pending Archive` section using the format above. If none found, write `None.`
