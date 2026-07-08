---
name: brief-detection
description: Detects structured briefs in user messages and gates execution. Source-agnostic.
---

# Brief Detection Gate

**Skill:** brief-detection
**Source-agnostic** â€” does not check who sent the brief.

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
| 2 | Ambiguous â€” do NOT auto-gate |
| 0â€“1 | Not a brief â€” no action |

## Gate Output (terse, no preamble)

```
Detected structured brief: {one-line goal extracted}.
{N} steps Â· {M} rules Â· {K} done-when criteria

How should I handle this?
a. Refine first â€” discuss before any execution (default)
b. Execute as-is â€” /plan-implementation then /execute-it
c. Discussion only â€” no execution
```

**Stop. Wait for user choice before any tool calls.**

## Routing

| Choice | Action |
|---|---|
| `a` | Discussion mode â€” do NOT auto-trigger `/plan-implementation` |
| `b` | Invoke `/plan-implementation` with the brief, then `/execute-it` on approval |
| `c` | Acknowledge, treat as documentation â€” no execution |

**Default:** Anything other than a/b/c (e.g., "yes", "go", blank) â†’ option `a` (Refine first).

## Override

`/brief-detect` or `/gate-brief` forces the gate even below threshold.

## What this skill does NOT do

- Does not write or modify code
- Does not invoke Auto Memory
- Does not invoke other agents
- Does not pre-load standards files

