---
description: Receive an architectural brief, verify against live code, flag gaps, and spot nearby issues — pause for approval before proceeding
allowed-tools: Read, Write, Grep, Glob
---

# Skill: plan-implementation

**PHASE 1 ONLY** — Do not write any code. Do not proceed to implementation.

## Step 0: Brief Capture

Before verification, persist the brief as the session's source of truth.

1. **Detect brief format** in the user's message — three tiers:

   - **Comprehensive** (contains ordered numbered steps AND explicit rules/constraints AND "Done when" / success criteria AND schema/field definitions) → This is already a complete specification. **STOP. Ask the user:**
     > "Your input looks like a complete specification — it has ordered steps, explicit rules, and done-criteria. Should I:
     > **(A)** Use it directly as the brief (no compression — preserve every detail), or
     > **(B)** Condense it into the standard brief template?
     > (A is recommended when the input is more detailed than the template can hold.)"
     Wait for the user's answer before proceeding. If **(A)**: write the input verbatim to `brief.md`, skip compression, proceed to Step 1. If **(B)**: proceed normally with the template below.

   - **Structured** (contains `## Goal`, `## Steps`, or `## Success Criteria` but lacks the full set above) → parse and use as-is with the template below

   - **Unstructured** (plain description/query) → auto-generate from template below

2. **Generate session ID**: `YYYY-MM-DD-{2-4-word-slug}` where slug is derived from the goal (lowercase, hyphens, no special chars)

3. **Collision check**: If `.claude/sessions/{session-id}/` already exists → append `-2`, `-3`, etc.

4. **Write brief** to `.claude/sessions/{session-id}/brief.md` using this template (skip if Comprehensive + user chose A):

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

## No Placeholders Scan

After verifying the brief against code, scan the Merged Execution Plan for placeholder language. These are **plan failures** — flag them and require concrete content:

**Red flag patterns (flag if found in any task):**
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without specifying what tests)
- "Similar to Task N" (each task must be self-contained)
- Steps that describe what to do without showing which files or what changes
- References to functions, methods, or types not defined in any task

If placeholders found → replace with concrete content before presenting the plan. Every task must specify: which file(s), what changes, what the expected outcome is.

## Forced Alternatives

Before presenting the final Merged Execution Plan, present 2-3 distinct implementation approaches if the plan involves:
- Creating new files or components (not just editing existing ones)
- A design decision with multiple valid paths
- Touching 3+ files in different modules

**Format:**
| Approach | Summary | Effort | Risk | Files | Reuses |
|----------|---------|--------|------|-------|--------|
| A: Minimal | [desc] | S/M/L | Low/Med/High | [list] | [existing patterns] |
| B: Ideal | [desc] | S/M/L | Low/Med/High | [list] | [existing patterns] |

Recommendation: [X] because [reason].

**STOP** and wait for user to pick approach before generating the Merged Execution Plan.

**Skip** this section if the plan is a straightforward edit to 1-2 files with an obvious single approach.

## Adversarial Plan Review

Before presenting the final output to the user, dispatch a fresh subagent to review the Merged Execution Plan on 3 dimensions:

1. **Completeness** — Does every brief requirement have a corresponding task? Missing anything?
2. **Consistency** — Do file paths, function names, and types match across tasks? Is Task 3's output used correctly in Task 5?
3. **Feasibility** — Can each task actually be executed as written? Hidden dependencies?

**If reviewer finds issues:** Fix them in the plan before presenting. Do not show the user an unreviewed plan.

**If subagent unavailable or fails:** Present plan with note: "Adversarial review unavailable — presenting unreviewed plan."

**Max 2 review iterations.** If issues persist after 2 rounds, note them as "## Open Concerns" in the output.

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

## Adversarial Review
- Iterations: [N]
- Issues found: [N]
- Issues fixed: [N]
- Open concerns: [list or "none"]

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