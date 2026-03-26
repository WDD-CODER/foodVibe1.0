---
description: Receive an architectural brief, scan the codebase, produce an implementation plan — pause for approval before proceeding
allowed-tools: Read, Grep, Glob
---

# Skill: plan-implementation

**PHASE 1 ONLY** — Do not write any code. Do not proceed to implementation.

## Workflow

1. **Read the architectural brief** carefully
2. **Scan the relevant parts of the codebase** to understand the current state
3. **Produce a concrete implementation plan**: which files to create or modify, in what order, and what each change does
4. **Flag any conflicts, gaps, or ambiguities** between the brief and what you find
5. **STOP** — present the plan and wait for explicit user approval before anything else

## Tools Available
- `Read` — examine files
- `Grep` — search content
- `Glob` — find files by pattern

## Output Format

Present findings as:
```
## Architectural Brief Summary
[summary of objective, scope, constraints]

## Codebase Scan Results
[findings from relevant files/patterns]

## Conflicts & Gaps
[list any mismatches between brief and code]

## Implementation Plan
- [ ] Task 1: [description of what changes]
- [ ] Task 2: [description of what changes]
...

[detailed explanation of each task]

---
**Ready for approval.** Say "execute-it" when ready to proceed.
```
