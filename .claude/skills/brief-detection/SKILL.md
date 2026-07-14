---
name: brief-detection
description: Detects structured briefs in user messages and gates execution. Source-agnostic.
---

# Brief Detection Gate

**Skill:** brief-detection
**Source-agnostic** — does not check who sent the brief.

## Trigger

User's first message in a turn contains 3+ of these markdown H2 headers (case-insensitive):

- `## Goal` or `## Objective`
- `## Files to check first` or `## Scope` or `## Files`
- `## Steps` or `## Implementation` or `## Tasks`
- `## Rules` or `## Constraints` or `## Out of Scope`
- `## Done when` or `## Success Criteria` or `## Acceptance`

### Threshold

| Markers found | Action |
|---|---|
| 3+ | Trigger gate |
| 2 | Ambiguous — do NOT auto-gate |
| 0–1 | Not a brief — no action |

## Gate Output (terse, no preamble)

```
Detected structured brief: {one-line goal extracted}.
{N} steps · {M} rules · {K} done-when criteria

How should I handle this?
a. Refine first — discuss before any execution (default)
b. Execute as-is — /feat (or /plan → Contractor one milestone → /review-it)
c. Discussion only — no execution
```

**Stop. Wait for user choice before any tool calls.**

## Routing

| Choice | Action |
|---|---|
| `a` | Discussion mode — do NOT auto-trigger `/plan` or Contractor execution |
| `b` | Invoke `/feat` (or `/plan` with the brief). After Human approves the Plan Contract: Contractor executes **one milestone**, writes `/sessions/[date].md`, stops; then `/review-it`. Do **not** invoke retired `/plan-implementation` or `/execute-it`. |
| `c` | Acknowledge, treat as documentation — no execution |

**Default:** Anything other than a/b/c (e.g., "yes", "go", blank) → option `a` (Refine first).

## Override

`/brief-detect` or `/gate-brief` forces the gate even below threshold.

## What this skill does NOT do

- Does not write or modify code
- Does not consult second-brain (`docs/brain/`) or optional MCP memory tools
- Does not invoke other agents
- Does not pre-load standards files

