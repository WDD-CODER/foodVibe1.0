---
name: todo-archive
description: Verify and move all-[x] plan sections from todo.md to todo-archive.md with git evidence and metadata audit trail. Invoked by agents after marking [x], by end-of-session-agent Phase 4, and by /sweep-stale-todos.
---

# Skill: todo-archive

> **ARCHIVAL PRECONDITION (cross-reference):** This skill mirrors the three rules defined in
> `.claude/commands/auto-solve.md Phase 6 — ARCHIVAL PRECONDITION`. Those rules are authoritative.
> This skill is an additional entry point, not a replacement for the auto-solve flow.
> Do NOT weaken the preconditions below.

---

## Input Modes

The caller specifies one of two modes when invoking this skill:

### (a) Section-mode
Caller passes a specific `### Plan NNN` heading to process. Only that section is evaluated.

**Caller contract:** Pass the exact heading string and your own agent/command name as `archived_by`.

### (b) Scan-mode
Scan the entire `.claude/todo.md` for all sections where every checkbox item is `[x]`.

**Caller contract:** Pass your own agent/command name as `archived_by`.

---

## Per-Section Pipeline (exact order)

For each candidate section (the one passed in section-mode, or each found in scan-mode):

### Step 1 — Extract slug/keyword

Extract a plan slug/keyword from the heading.

Example: `### Plan 265 — auto-solve Enforcement Fixes` → keyword `auto-solve`

Use the most distinctive word(s) — not generic terms like "fix" or "update".

### Step 2 — Deferred-item filter

If the section contains `(deferred)`, `(skipped)`, or `[~]`:
- Leave section in `todo.md`
- Append `<!-- ARCHIVE-PENDING: contains deferred items -->` on the line directly after the heading
- Return result: **`kept`** — reason: "contains deferred items"

### Step 3 — Operational-task filter

If any checkbox text matches `/\b(migrate|deploy|merge PR|review|verify on prod|run on Atlas)\b/i`
AND no explicit session confirmation exists (i.e., user has NOT typed `"approve"` or `"approve and stop"` in the current session):
- Leave section in `todo.md`
- Append `<!-- ARCHIVE-PENDING: operational task, needs user confirmation -->` after heading
- Return result: **`kept`** — reason: "operational task, needs user confirmation"

### Step 4 — Git verification

Run both commands (using the keyword from Step 1):

```bash
git log --oneline | grep -i "<keyword>"
gh pr list --state merged --search "<keyword>"
```

If **both** return empty results:
- Leave section in `todo.md`
- Append `<!-- ARCHIVE-PENDING: no git evidence found -->` after heading
- Return result: **`kept`** — reason: "no git evidence found"

On any match, record the first matching commit SHA or PR number as `verified`.

### Step 5 — Archive

Section passed all filters. Extract the full `### Plan NNN` block (heading + all checkbox lines).

Append to `.claude/todo-archive.md` under `## Done` (after the last `---` separator) with this format:

```markdown
### Plan NNN — {title}
<!-- archived_by: {archived_by} · date: {YYYY-MM-DD} · verified: {first-commit-sha or PR#} -->
- [x] task one
- [x] task two
...

---
```

Remove the block from `.claude/todo.md`. Collapse surrounding `---` separators so no double-`---`
remains (i.e., if the removed section was between two `---` lines, keep only one).

Return result: **`archived`**

---

## Output Format

After processing all sections, print:

```
TODO-ARCHIVE REPORT
Archived: N sections
  - Plan NNN — {title} (verified: {sha-or-pr})
Kept: M sections
  - Plan NNN — {reason}
```

---

## Caller Contract

- The invoking agent MUST pass its own identifier as `archived_by`.
- If invoked by a command (e.g., `/sweep-stale-todos`), use the command name as `archived_by`.
- If the skill returns `kept` with an `ARCHIVE-PENDING` reason, the caller MUST surface that reason
  verbatim in its completion message. Do not omit or silently discard pending notices.

---

## Notes

- This skill is read and followed **inline** by the calling agent. It is NOT spawned as a sub-agent.
- Do NOT change `todo-archive.md`'s existing `## Done` section layout. Only new entries get the metadata header.
- The three ARCHIVAL PRECONDITION rules from `auto-solve.md Phase 6` remain authoritative. This skill
  adds section-mode and scan-mode entry points; it does not override or weaken those rules.
