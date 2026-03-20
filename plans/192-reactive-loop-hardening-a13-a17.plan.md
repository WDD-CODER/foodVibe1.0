# Plan — Pillar 3 Reactive Loop Hardening (A13–A17)

## Context

Plan 190 Pillar 3 targets the "broken reactive loop": handoffs never written, stale todos accumulating, breadcrumbs updated manually.
Pillar 1 (token reduction) and Pillar 2 (MCP) are already complete.

Current state (post-exploration):
- `session-start.mdc` exists (`alwaysApply: true`)
- `session-end.mdc` exists (description trigger)
- `commit-to-github` Phase 4 Steps 6-7 already contain archive + breadcrumb logic
- `sweep-stale-todos.md` exists (basic implementation)

The loop is still broken despite these files existing. Proof: `notes/session-handoffs/` contains only `.gitkeep` and no handoffs.

---

## Root Cause Analysis

- Handoffs never written: `session-end.mdc` requires "wrap up"/"handoff" and misses common user phrasing
- Session-start fires every prompt: `alwaysApply: true` with no first-message guard
- GitHub sync runs on every prompt: same missing guard
- Stale todos never archived: sweep command is manual and not naturally triggered
- False-archive risk: "all `[x]`" heuristic misses deferred/skipped markers

---

## Rule Logic Design (A13 — `session-start.mdc`)

### Problem

`alwaysApply: true` loads on every prompt, causing repeated github-sync and repeated handoff checks.

### Solution: First-Message Guard

Keep `alwaysApply: true`, but add a strict behavior guard:

> Execute steps 1 and 2 only if this is the first user message in the conversation (no prior assistant responses in context). Skip silently if already executed.

Append this reminder to step 1 output:

> Tip: Say "wrap up" when you're done for the day to save a session handoff.

Exact behavior:
- Fire only on first message in a new conversation
- Skip on all subsequent messages in the same conversation
- Step 1: read `notes/session-handoffs/` and look for files from last 3 days
- Step 2: read `.claude/skills/github-sync/SKILL.md` and run sync

---

## Rule Logic Design (A14 — `session-end.mdc`)

### Problem

Trigger phrase set is too narrow and misses natural end-of-session phrases.

### Solution: Broaden Triggers + Sweep Integration

Expanded trigger phrases (case-insensitive, partial match acceptable):
- wrap up
- done for today
- session end
- handoff
- I'm done
- that's it for today
- goodbye
- EOD
- end of day
- logging off
- I'll stop here

Sweep integration before handoff:

> Before saving the handoff - run stale-todo sweep? (Recommended: removes noise from the handoff summary)

If approved: run sweep then handoff.
If skipped: handoff directly.

Constraint: keep description trigger (do not use `alwaysApply: true`).

---

## State Management Strategy

Cursor/Claude has no persistent conversation state flag, so infer state using context + files:

1. Conversation context (primary): first message iff no prior assistant responses
2. Handoff files: `notes/session-handoffs/YYYY-MM-DD.md`
3. GitHub sync notes: `notes/github-sync/YYYY-MM-DD.md`

Decision tree:
- Not first message -> skip steps
- First message ->
  - Check handoffs from last 3 days and summarize
  - If today's github-sync note exists -> skip sync
  - Else run github-sync skill

---

## Automation Workflow: Phase 4 Archive Logic (A15)

### Gap

Current archive rule ("all items are `[x]`") is unsafe.

### Enhanced Archive Safety Rules

1. All-items-checked gate (existing): every task must be `[x]`
2. No-deferred gate (new): block archive if section contains `(deferred)`, `(skipped)`, `[~]`, or `<!-- TODO -->`
3. Git verification gate (new): require commit evidence, else warn:
   - "No commits found for Plan NNN - skip archive or confirm manually?"
4. User confirmation gate (new): if section has 5+ items, require explicit confirmation before archive

Archive format remains:

`## Plan NNN — [title] (archived YYYY-MM-DD)`

---

## `sweep-stale-todos` Hardening (A17)

Enhancements:

- Step 2b (new): deferred item filter
  - Exclude sections containing `(deferred)`, `(skipped)`, or `[~]`
  - Report under "Sections Kept" with reason
- Step 3 (updated): precise verification
  1. `git log --oneline` search by plan keyword
  2. `gh pr list --state merged --search "<plan-keyword>"`
  - If both miss: mark as unverifiable and exclude
- Step 3b (new): age threshold
  - Only propose archive for plan sections older than 7 days
  - Infer plan age from git history of `plans/NNN-*.plan.md`

Enhanced report output:
- Sections Archived (with commit hash or PR # verification)
- Sections Kept (partial progress, deferred markers, or unverifiable)

---

## File Impact Map

- MODIFY `.cursor/rules/session-start.mdc` (A13)
- MODIFY `.cursor/rules/session-end.mdc` (A14)
- MODIFY `.claude/commands/sweep-stale-todos.md` (A17)
- MODIFY `.claude/skills/commit-to-github/SKILL.md` (A15)
- NO CHANGE `.claude/skills/session-handoff/SKILL.md`

Files not modified:
- Any file under `src/`
- `.cursor/rules/git-commit-must-use-skill.mdc`
- `notes/session-handoffs/`

---

## Risk Assessment

- Trap 1 (High): `alwaysApply` over-fire -> mitigated by first-message guard
- Trap 2 (High): false archive -> mitigated by 4 safety gates
- Trap 3 (Medium): handoff overwrite -> already mitigated by append behavior in session-handoff skill
- Trap 4 (Medium): sweep during active work -> mitigated by session-end coupling + 7-day threshold
- Trap 5 (Low): duplicate session-start in new chat window -> mitigated by first-message + same-day github-sync skip
- Trap 6 (Low): unverifiable plans -> excluded by default, manual review

---

## Verification

1. Session-start test: first message triggers once; second message does not
2. Session-end test: phrase "I'm done" triggers sweep prompt then handoff write
3. Sweep safety test: all `[x]` section with `(deferred)` must not be proposed for archive
4. Commit archive test: Step 6 includes git verification and 5+ item confirmation
5. Handoff directory test: dated file appears in `notes/session-handoffs/`

---

## Execution Order

1. Modify `session-start.mdc` (A13)
2. Modify `session-end.mdc` (A14)
3. Modify `commit-to-github` Step 6 (A15)
4. Modify `sweep-stale-todos.md` (A17)
5. Run `validate-agent-refs` for reference integrity
