---
description: Capture or generate a session brief â€” source of truth for validation and session-wrap evaluation
allowed-tools: Read, Write, Grep, Glob, Bash
---

# /brief

Create a session brief. The brief is the contract that the /ship
agent evaluates against.

## Usage

- `/brief <description>` â€” generate brief from your description (proactive)
- `/brief` â€” auto-generate from session activity (retroactive)

## Step 1: Detect Mode

- If the user provided a description after `/brief` â†’ **Proactive mode**
- If no description â†’ **Retroactive mode**

## Step 2a: Proactive Mode

1. Parse the user's description
2. Generate session ID: `YYYY-MM-DD-{2-4-word-slug}` (lowercase, no special chars)
3. **Collision check:** If `.claude/sessions/{session-id}/` already exists â†’ append `-2`, `-3`, etc.
4. Write brief to `.claude/sessions/{session-id}/brief.md` using template:

```markdown
## Goal
[one sentence from user input]

## Scope
[inferred files/modules â€” or "TBD"]

## Out of Scope
[anything excluded â€” or "None stated"]

## Success Criteria
- [ ] criterion 1
- [ ] criterion 2

## Session ID
{session-id}
```

5. Print brief verbatim to user
6. Ask: "Brief captured. Confirm or adjust before I continue."
7. On confirmation â†’ done. On adjustment â†’ update brief.md, re-confirm.

## Step 2b: Retroactive Mode

1. Gather session activity:
   - `git diff --stat` (what files changed)
   - `git log --oneline -10` (recent commits)
   - Read `.claude/todo.md` for `[x]` tasks completed today
   - Scan conversation for key decisions and changes
2. Synthesize into a brief using the same template
3. Generate session ID from the synthesized goal
4. **Collision check:** same as Step 2a
5. Print: "Reconstructed from session activity. Adjust as needed."
6. On confirmation â†’ write to `.claude/sessions/{session-id}/brief.md`
7. On adjustment â†’ update, re-confirm.

## Completion

Output: `Session: .claude/sessions/{session-id}`

This line threads the brief through the session lifecycle â€” picked up by `/ship`
and `/evaluate-me` (legacy /ship automation is gone).
