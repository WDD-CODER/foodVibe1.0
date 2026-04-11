---
description: Receive an architectural brief, verify against live code, flag gaps, and spot nearby issues — pause for approval before proceeding
allowed-tools: Read, Write, Grep, Glob
---

# Skill: plan-implementation

**PHASE 1 ONLY** — Do not write any code. Do not proceed to implementation.

## Step 0: Brief Capture

Before verification, persist the brief as the session's source of truth.

1. **Detect brief format** in the user's message:
   - **Structured** (contains `## Goal`, `## Steps`, or `## Success Criteria`) → parse and use as-is
   - **Unstructured** (plain description/query) → auto-generate from template below

2. **Generate session ID**: `YYYY-MM-DD-{2-4-word-slug}` where slug is derived from the goal (lowercase, hyphens, no special chars)

3. **Collision check**: If `.claude/sessions/{session-id}/` already exists → append `-2`, `-3`, etc.

4. **Write brief** to `.claude/sessions/{session-id}/brief.md` using this template:

```markdown
## Goal
[one sentence extracted from user input]

## Scope
[files/modules the plan touches — or "TBD until verification" for unstructured input]

## Out of Scope
[anything explicitly excluded or implied as off-limits — or "None stated"]

## Success Criteria
- [ ] criterion 1
- [ ] criterion 2

## Session ID
{session-id}
```

5. **Print the brief** to the user verbatim
6. **Ask**: "Brief captured. Confirm or adjust before I proceed with verification."
7. **Wait for user confirmation** before continuing to Step 1. If user adjusts → update brief.md, re-confirm.

---

## Phase 0 — Historical Context (if MemPalace available)

Before decomposing the brief, check if MemPalace MCP tools are active in this session.

**If MemPalace tools are available:**
1. `mempalace_search(query="<2-3 keywords from brief goal>", limit=10)`
2. Review results for:
   - Past attempts at similar work (avoid repeating failed approaches)
   - Architectural decisions that constrain this plan
   - Known pitfalls or recurring build failures related to this area
3. For key entities: `mempalace_kg_query(entity="<component or decision>")` to check temporal facts
4. Include relevant findings in the brief's `## Context` section or in the Merged Execution Plan as constraint notes

**If MemPalace tools are not available:** Skip this phase entirely — do not block on it.

---

## Workflow

1. **Read the architectural brief** carefully
2. **Scan the relevant parts of the codebase** to understand the current state
3. **Verify brief against reality**: for every file, line number, function name, or selector the brief references — confirm it matches live code. Mark ✓ or ✗.
4. **Flag conflicts & gaps** between the brief and what you find
5. **Neighborhood scan** (see below)
6. **STOP** — present findings and wait for explicit user approval

## Neighborhood Scan — Bounded Assessment

While you're already reading the files from the brief, apply **light assessment** within the same file scope. This is NOT a free-roaming audit — it's awareness while you're already there.

### DO assess (you're already looking at the file):
- **Prerequisites the brief missed** — e.g. a method doesn't exist yet, a service isn't injected, an import is missing
- **Same-function issues** — if the brief says "modify function X" and function X has a bug or calls something broken, flag it
- **Same-block dependencies** — if the brief says "add Y to this SCSS block" and the block above it has a conflicting rule, flag it
- **Copy-paste patterns** — if the brief fixes file A and you see file B has the identical code (and the brief forgot B), mention it in one line

### DO NOT (these waste tokens and belong in separate briefs):
- Explore files the brief doesn't mention
- Suggest architectural improvements
- Audit unrelated tech debt
- Re-analyze the entire feature from scratch
- Second-guess the brief's approach — verify it, don't redesign it

### Format for neighborhood findings:
```
## Neighborhood Findings (while verifying)
- [file:line] [one-line description] — severity: blocker | should-fix | nice-to-have
```

Only blockers and should-fix items get folded into the execution plan. Nice-to-have items are noted but not executed.

## Tools Available
- `Read` — examine files
- `Grep` — search content
- `Glob` — find files by pattern

## Output Format

```
Session: .claude/sessions/{session-id}

✓/✗ Brief verified against live code

## Checked
- [file]: [what was verified] ✓/✗
- [file]: [what was verified] ✓/✗

## Conflicts & Gaps (brief vs. reality)
- [description of mismatch + what needs to change]

## Neighborhood Findings (while verifying)
- [file:line] [finding] — blocker | should-fix | nice-to-have

## Merged Execution Plan
- [ ] Task 1: [from brief]
- [ ] Task 2: [from brief, amended by verification]
- [ ] Task 3: [added — prerequisite discovered during verification]
- [ ] Task 4: [added — neighborhood blocker]
...

---
**Ready for approval.** Say "execute-it" when ready to proceed.
```

The "Merged Execution Plan" is what execute-it will use. It combines the original brief steps with all ✗ fixes, prerequisite gaps, and neighborhood blockers into one ordered task list.

---

## Backend Impact (append when plan touches persisted data)

If any task in the plan reads or writes persisted data, append this section after the Merged Execution Plan:

```markdown
## Backend Impact
- Collections affected: [list entityType keys from .claude/standards-backend.md §1]
- New collections: [yes/no — if yes, list with justification]
- Server changes needed: [yes/no — if yes, describe]
```

If none of the tasks touch persisted data, write `## Backend Impact — None` explicitly.