---
name: Workflow Superpowers Integration
overview: Integrate high-value patterns from Superpowers plugin and gstack office-hours into our pipeline — new /new-feature command, enhanced /plan-implementation, enhanced /execute-it, and 4 agent updates.
todos: []
isProject: true
---

> RETIRED — MemPalace/claude-mem/reflect automation retired in July 2026 cutover. Do not execute. Prefer docs/brain/.

# Workflow Superpowers Integration — Executive Brief

> **For the Team Leader agent:** This is a multi-file, multi-subsystem project. Read this entire document before assembling your task force. Each sub-brief below is a self-contained work unit that can be assigned to an agent. Dependencies are marked — respect the execution order.

> **Session:** `.claude/sessions/2026-04-13-workflow-superpowers-integration`

---

## Executive Summary

We are enhancing our AI workflow pipeline at 4 injection points by extracting proven patterns from two external sources:

1. **Superpowers plugin** (14 skills) — specifically: `verification-before-completion`, `systematic-debugging`, `writing-plans` (No Placeholders rule), `subagent-driven-development` (two-stage review), `test-driven-development` (RED-GREEN mandate)
2. **gstack office-hours** (28K-token skill) — specifically: forcing questions with push pattern, landscape awareness (WebSearch for existing solutions), premise challenge, forced alternatives, prior work discovery, escape hatch mechanism

**We are NOT copying these skills wholesale.** We are extracting the ~6K tokens of valuable patterns and implementing them natively in our pipeline — using our MemPalace, our session system, our Q&A format, and our brief→plan-implementation→execute-it flow.

---

## Architecture Decision

```
/new-feature     → scoping questions → landscape search → premise challenge → forced alternatives → sharp brief
                         ↓ (outputs brief.md to .claude/sessions/)
/plan-implementation → verification + No Placeholders scan + adversarial subagent review → merged plan
                         ↓ (outputs merged execution plan)
/execute-it      → per-task: auto-verify (build/test) → systematic-debug if broken → smart visual QA offer at end
```

**Key design rule:** `/brief` is UNTOUCHED. `/new-feature` is a NEW command that produces a brief as its output. The brief then feeds into the existing pipeline unchanged.

---

## Sub-Brief Dependencies

```
[SB-1] /new-feature command         → no dependencies (new file)
[SB-2] /plan-implementation enhance → no dependencies (edit existing)
[SB-3] /execute-it enhance          → no dependencies (edit existing)
[SB-4] Agent updates                → depends on SB-1, SB-2, SB-3 (agents reference the enhanced commands)
[SB-5] Registration                 → depends on SB-1 (registers the new command)
```

SB-1, SB-2, SB-3 can run in parallel. SB-4 depends on all three. SB-5 depends on SB-1.

---

# Sub-Brief 1: `/new-feature` Command

**File:** `.claude/commands/new-feature.md` (CREATE)
**Assigned to:** Implementation agent
**Estimated size:** ~200-250 lines

## What This Command Does

When a user says `/new-feature <description>`, this command runs a structured scoping flow that produces a sharp, evidence-based brief — then hands off to `/plan-implementation`.

The command does NOT write code. It produces a `brief.md` file in `.claude/sessions/`.

## Complete Flow (in order)

### Phase 0: MemPalace Orient + Prior Work Discovery
1. `mempalace_search(query="<2-3 keywords from description>", limit=5)` — find past decisions, existing patterns
2. Search `plans/` directory: `grep -li "<keyword1>\|<keyword2>" plans/*.plan.md` — find related prior plans
3. If prior work found → present to user: "Related prior work found: [plan title]. Build on this or start fresh?"
4. If nothing found → proceed silently

### Phase 1: Forcing Questions (Scoping)

**Smart routing based on description complexity:**
- Simple/clear description (specific files, specific behavior, < 3 sentences with concrete details) → ask 1-2 questions max
- Vague/broad description ("improve the cook view", "add a feature for X") → ask 3-4 questions

**The adapted questions (ask ONE AT A TIME via Q&A format):**

**Q1 — User Pain:**
"What specific moment frustrates users today without this? Describe the scenario — what are they trying to do and where do they get stuck?"

*Push pattern:* If answer is vague ("it would be nice to have"), push once: "Can you describe a specific time you or a user hit this frustration? What were they doing, what happened, what did they have to do instead?"

**Q2 — Current Workaround:**
"How do users handle this right now — even badly? What's the cost (time, friction, extra clicks, abandonment)?"

*Smart-skip:* If Q1 answer already described the workaround, skip Q2.

**Q3 — Narrowest MVP:**
"What's the absolute smallest version that delivers value? What ONE thing must work for this to be useful?"

*Push pattern:* If answer describes a full feature with multiple parts, push once: "If you could only ship one part of that today, which part would make the biggest difference?"

**Q4 — Assumption Check:**
"What's the riskiest assumption here? What might users do with this that you don't expect?"

*Smart-skip:* If prior answers were specific and evidence-based, skip Q4.

**Escape hatch (NON-NEGOTIABLE):**
- At ANY question, user can say "skip", "just do it", "go ahead", or similar
- First skip → "Got it. One more critical question, then I'll proceed." → Ask the ONE most important remaining question → proceed
- Second skip → Proceed immediately with what we have. No more questions.
- If user provides a fully-formed description with specific files, behaviors, and clear scope → skip ALL questions, go straight to Phase 2

### Phase 2: Landscape Awareness (WebSearch)

**Purpose:** Check if existing solutions, libraries, or patterns solve this before we build custom.

**Privacy gate:** Only search if the feature involves a pattern/library that might exist externally. Skip for purely app-specific UI changes.

**When to search:**
- Feature involves a NEW capability (timers, charts, drag-drop, auth pattern, data sync)
- Feature involves a library we haven't used before
- User mentioned "like [some app/product]"

**When to skip:**
- Feature is purely internal UI layout/styling changes
- Feature is app-specific business logic (recipe scaling, ingredient mapping)
- Feature is a bug fix

**If searching:**
1. `WebSearch` for "[feature keywords] angular library" and "[feature keywords] existing solution 2026"
2. Read top 2-3 results
3. Synthesize: "Found [library/pattern] that does [X]% of this. Could save [estimate] of development."

**HARD STOP if significant finding:** Present finding to user via Q&A:
```
a. Use [library] — covers [X], we build [Y] on top
b. Build custom — [library] doesn't fit because [reason]
c. Investigate further before deciding
```
Wait for user choice. This changes the entire plan.

If nothing significant found → proceed silently.

### Phase 3: Premise Challenge

Present 3-4 premises the user must agree/disagree with:

```
PREMISES (agree/disagree with each):

1. [Problem statement derived from Q1-Q4] — is this the right framing?
2. [Scope statement] — this is what we're building, nothing more
3. What existing code partially solves this: [list files/patterns found in codebase scan]
4. If we do nothing, the impact is: [assessment]
```

**HARD STOP:** User must respond to premises. If user disagrees with any premise → revise understanding and re-present. Building on wrong premises wastes everything downstream.

### Phase 4: Forced Alternatives

Present 2-3 distinct implementation approaches:

```
APPROACH A: [Minimal Viable] — [1-2 sentences]
  Effort: S/M/L    Risk: Low/Med/High
  Files: [list]     Reuses: [existing code/patterns]

APPROACH B: [Ideal Architecture] — [1-2 sentences]
  Effort: S/M/L    Risk: Low/Med/High
  Files: [list]     Reuses: [existing code/patterns]

APPROACH C: [Creative/Lateral] (optional — only if meaningfully different)
  ...

Recommendation: [X] because [one-line reason]
```

**HARD STOP:** User must pick an approach. Cannot proceed without explicit choice.

### Phase 5: Brief Generation

Generate session brief using the standard `/brief` template:
1. Generate session ID: `YYYY-MM-DD-{2-4-word-slug}`
2. Write to `.claude/sessions/{session-id}/brief.md`
3. The brief incorporates ALL insights from Phases 0-4:
   - Goal sharpened by forcing questions
   - Scope informed by landscape search
   - Premises listed as constraints
   - Chosen approach specified
   - Prior work referenced if found
4. Print brief verbatim
5. **HARD STOP:** "Brief captured. Confirm or adjust, then say `/plan-implementation` to proceed."

### Behavioral Rules for the Entire Command

- **Q&A format only** — use the project's Q&A format (§1.1): one question line ending with `?`, then options as `a.` `b.` `c.`
- **ONE question at a time** — never batch multiple questions
- **Push once, not twice** — we adapted from office-hours' push-3x to push-once (respects user's time for a dev tool, not a startup interview)
- **Smart-skip is mandatory** — if an earlier answer covers a later question, skip it silently
- **No sycophancy** — don't say "great answer!" or "interesting approach!". Move forward.
- **Total flow should take 2-5 minutes** for a typical feature, not 20 minutes

---

# Sub-Brief 2: `/plan-implementation` Enhancement

**File:** `.claude/commands/plan-implementation.md` (MODIFY)
**Assigned to:** Implementation agent
**Estimated size:** ~40-50 lines of additions

## What Changes

Three additions to the existing plan-implementation command. Insert these as new sections AFTER the existing "Neighborhood Scan" section and BEFORE the "Output Format" section.

### Addition 1: No Placeholders Scan (after Neighborhood Scan)

Add this new section:

```markdown
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
```

### Addition 2: Forced Alternatives (after No Placeholders Scan)

Add this new section:

```markdown
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
```

### Addition 3: Adversarial Subagent Review (after Forced Alternatives)

Add this new section:

```markdown
## Adversarial Plan Review

Before presenting the final output to the user, dispatch a fresh subagent to review the Merged Execution Plan on 3 dimensions:

1. **Completeness** — Does every brief requirement have a corresponding task? Missing anything?
2. **Consistency** — Do file paths, function names, and types match across tasks? Is Task 3's output used correctly in Task 5?
3. **Feasibility** — Can each task actually be executed as written? Hidden dependencies?

**If reviewer finds issues:** Fix them in the plan before presenting. Do not show the user an unreviewed plan.

**If subagent unavailable or fails:** Present plan with note: "Adversarial review unavailable — presenting unreviewed plan."

**Max 2 review iterations.** If issues persist after 2 rounds, note them as "## Open Concerns" in the output.
```

### Modification to Output Format

Add to the existing output format, after `## Merged Execution Plan`:

```markdown
## Adversarial Review
- Iterations: [N]
- Issues found: [N]
- Issues fixed: [N]
- Open concerns: [list or "none"]
```

---

# Sub-Brief 3: `/execute-it` Enhancement

**File:** `.claude/commands/execute-it.md` (MODIFY)
**Assigned to:** Implementation agent
**Estimated size:** ~60-70 lines of additions

## What Changes

Three additions to the existing execute-it command. These modify the execution workflow, not the Step 0 plan-saving phase.

### Addition 1: Verification-Before-Completion Gate

Add this new section AFTER the existing "Execution Rules" section:

```markdown
## Verification-Before-Completion Gate

**Iron law: No completion claims without fresh verification evidence.**

After completing each task in the execution list, BEFORE marking it done:

1. **IDENTIFY** — What command proves this task is done? (`ng build`, test command, diagnostic check)
2. **RUN** — Execute the command. Fresh, complete, not cached.
3. **READ** — Full output. Check exit code. Count failures.
4. **VERIFY** — Does output confirm the task is done?
   - YES → Mark task done, state claim WITH evidence: "Build passes (0 errors, 0 warnings)"
   - NO → Fix the issue (using systematic-debugging if needed), re-run, re-verify

**Red flags (STOP if you catch yourself thinking these):**
- "Should work now" → RUN the verification
- "I'm confident" → Confidence is not evidence
- "Linter passed so build passes" → Linter is not compiler. Run the build.
- "Just this once" → No exceptions

**Minimum verification per task:**
- Any `.ts` change → `ng build` must pass (or `getDiagnostics` if available)
- Any `.html` template change → `ng build` must pass
- Any `.scss` change → `ng build` must pass
- Logic change → relevant test must pass (if test exists)
```

### Addition 2: Systematic-Debugging Protocol

Add this new section AFTER the Verification-Before-Completion Gate:

```markdown
## Systematic-Debugging Protocol

When verification fails or a bug is encountered during execution, follow this protocol BEFORE attempting any fix:

### Phase 1: Root Cause Investigation (MANDATORY before any fix attempt)
1. **Read error messages carefully** — full stack traces, line numbers, error codes
2. **Check what changed** — `git diff` against last known-good state
3. **Trace data flow** — where does the bad value originate? Trace backward through call stack

### Phase 2: Hypothesis
1. State clearly: "I think [X] is the root cause because [Y]"
2. Make the SMALLEST possible change to test the hypothesis
3. ONE variable at a time — don't fix multiple things at once

### Phase 3: Verify Fix
1. Run the same verification that failed
2. If PASS → continue execution
3. If FAIL → form NEW hypothesis, don't pile fixes

### Phase 4: Escalation (3-fix rule)
If 3 fix attempts have failed:
- **STOP** — do not attempt fix #4
- Report to user: what was tried, what failed, what the root cause might be
- Ask for guidance before continuing

**Never:** guess-and-check, add multiple fixes at once, skip error messages, say "it should work now" without running verification.
```

### Addition 3: Smart Visual QA Offer

MODIFY the existing validation-checklist behavior. Replace the current "ask before anything else" pattern with this smarter flow:

Add this section AFTER Systematic-Debugging Protocol:

```markdown
## Smart Visual QA Flow

The validation-checklist instruction (`@.claude/instructions/validation-checklist.md`) asks "verify / I'll check?" at task start. This section OVERRIDES that timing for tasks that include UI changes:

**New flow for UI-touching tasks:**
1. Execute the task normally
2. Run verification-before-completion gate (build/test) — this is AUTOMATIC, no user choice
3. If verification PASSES and the task touched `.html`, `.scss`, or template files:
   - Show the validation checklist with evidence: "Build ✓ (0 errors)"
   - Ask: "Code verification passed. Want me to also check the UI visually (/qa), or will you check it?"
   - If user says "verify" or "qa" → run `/qa` on the relevant page
   - If user says "I'll check" → stop, show checklist
4. If verification PASSES and the task is backend/logic only (no UI files):
   - Show validation checklist with evidence
   - Do NOT offer visual QA (no UI to check)
   - Stop and wait

**Key change:** Code verification (build/test) is NEVER optional — it always runs automatically. The user choice is ONLY about visual/browser QA.
```

### Modification to Validation Checklist Reference

Change the first line of execute-it.md from:
```
@.claude/instructions/validation-checklist.md
```
to:
```
@.claude/instructions/validation-checklist.md
```
(Keep the reference, but add a note in the Execution Rules):

Add to Execution Rules:
```markdown
- **Validation override** — the Smart Visual QA Flow section below overrides the validation-checklist's "ask before anything" timing. Code verification is always automatic. User choice applies only to visual QA.
```

---

# Sub-Brief 4: Agent Updates

**Files:** 4 agent `.md` files (MODIFY)
**Assigned to:** Implementation agent
**Estimated size:** ~10-20 lines per agent

### 4A: Team Leader (`team-leader.md`)

Add a new section after "### 3. Quality Oversight":

```markdown
### 3.5 Two-Stage Review Gate (for multi-task execution)

When orchestrating implementation across multiple tasks:

**After each task completion:**
1. **Stage 1 — Spec Compliance Review:** Dispatch a fresh subagent to verify the completed task matches the plan's specification. Does the code do what the task said it should? Nothing missing, nothing extra.
   - If issues found → implementer fixes, re-review
   - If PASS → proceed to Stage 2

2. **Stage 2 — Code Quality Review:** Dispatch a fresh subagent to review code quality. Clean code? Good patterns? No magic numbers? Consistent with codebase style?
   - If critical issues → implementer fixes, re-review
   - If minor issues or PASS → mark task complete, proceed to next

**Skip two-stage review for:**
- Documentation-only changes
- Configuration changes
- Single-line fixes where the change is obviously correct

**Source:** Adapted from Superpowers `subagent-driven-development` skill's review pattern.
```

### 4B: QA Engineer (`qa-engineer.md`)

Add to "### 2. Diagnostic Reasoning" section, after the existing bullets:

```markdown
- **Systematic-Debugging Protocol (MANDATORY for non-trivial bugs):**
  1. Root cause investigation BEFORE any fix — read errors, check recent changes, trace data flow
  2. Form single hypothesis, test minimally (one variable at a time)
  3. Verify fix with the same test that failed
  4. **3-fix escalation rule:** If 3 attempts fail → STOP, report findings, ask for guidance. Do NOT attempt fix #4 without architectural discussion.
  - Source: Adapted from Superpowers `systematic-debugging` skill

- **RED-GREEN Mandate for Regression Tests:**
  When writing a regression test for a bug fix:
  1. Write the failing test (RED) — run it, confirm it fails for the expected reason
  2. Apply the fix (GREEN) — run it, confirm it passes
  3. Revert the fix — run test again, confirm it FAILS (proves the test catches the bug)
  4. Restore the fix — run test, confirm PASS
  Skipping steps 3-4 means the test might pass for the wrong reason.
  - Source: Adapted from Superpowers `test-driven-development` skill
```

### 4C: End-of-Session Agent (`end-of-session-agent.md`)

Modify Phase 10 (Session Evaluation). Add after step 3 ("For EACH criterion, evaluate against evidence"):

```markdown
**Verification-Before-Completion enforcement:**
- For EACH criterion that involves code changes:
  - Do NOT trust prior build results. Run `ng build` NOW (fresh).
  - Do NOT trust "tests passed earlier." Run relevant tests NOW.
  - Only mark as "Done" if you have FRESH evidence from commands you just ran.
  - If build/test fails → status is "Missed" regardless of what the conversation says
- For criteria that don't involve code (docs, plans, config):
  - Verify file exists and contains expected content
  - Mark "Done" with file path as evidence

**Red flags (mark as "Missed" immediately):**
- Criterion claims code works but `ng build` fails
- Criterion claims tests pass but no test command was run in this phase
- Criterion says "should work" without evidence
```

### 4D: Software Architect (`software-architect.md`)

Add to "### 1. HLD Document Creation", after existing bullets:

```markdown
- **No Placeholders Gate:** Before finalizing any HLD, scan for vague language:
  - "TBD", "TODO", "implement later", "add appropriate handling"
  - "Similar to [other section]" without repeating the specifics
  - Steps describing WHAT without specifying WHICH files and HOW
  - Every section must be concrete enough for an implementation agent to execute without asking questions.

- **Forced Alternatives:** Every HLD MUST include at least 2 approaches (Minimal Viable + Ideal Architecture) with effort/risk assessment. The architect recommends one, but the user chooses. Single-approach HLDs are not acceptable for anything touching 3+ files.
```

---

# Sub-Brief 5: Registration

**Files:** `copilot-instructions.md` and `agent.md` (MODIFY)
**Assigned to:** Implementation agent
**Estimated size:** ~5-10 lines total

### 5A: copilot-instructions.md §0 (Skill Triggers)

Add new trigger entry after the "Plan & execute" trigger:

```markdown
- **New feature scoping** `[SHARED]`: User invokes `/new-feature` or `/new-feature <description>` → read `.claude/commands/new-feature.md` and follow it. Produces a scoped brief that feeds into `/plan-implementation`. Does NOT write code.
```

### 5B: agent.md (Commands table)

Add new row to the Commands table:

```markdown
| `new-feature.md` | Structured feature scoping — forcing questions, landscape search, premise challenge, forced alternatives → produces sharp brief for plan-implementation |
```

---

# Atomic Sub-tasks

- [ ] A1: Create `.claude/commands/new-feature.md` — full command implementing Phases 0-5 (SB-1)
- [ ] A2: Edit `.claude/commands/plan-implementation.md` — add No Placeholders Scan section (SB-2)
- [ ] A3: Edit `.claude/commands/plan-implementation.md` — add Forced Alternatives section (SB-2)
- [ ] A4: Edit `.claude/commands/plan-implementation.md` — add Adversarial Subagent Review section (SB-2)
- [ ] A5: Edit `.claude/commands/plan-implementation.md` — update Output Format with review results (SB-2)
- [ ] A6: Edit `.claude/commands/execute-it.md` — add Verification-Before-Completion Gate section (SB-3)
- [ ] A7: Edit `.claude/commands/execute-it.md` — add Systematic-Debugging Protocol section (SB-3)
- [ ] A8: Edit `.claude/commands/execute-it.md` — add Smart Visual QA Flow section (SB-3)
- [ ] A9: Edit `.claude/commands/execute-it.md` — add validation override note to Execution Rules (SB-3)
- [ ] A10: Edit `.claude/agents/team-leader.md` — add Two-Stage Review Gate section (SB-4A)
- [ ] A11: Edit `.claude/agents/qa-engineer.md` — add Systematic-Debugging Protocol + RED-GREEN Mandate (SB-4B)
- [ ] A12: Edit `.claude/agents/end-of-session-agent.md` — add Verification-Before-Completion to Phase 10 (SB-4C)
- [ ] A13: Edit `.claude/agents/software-architect.md` — add No Placeholders Gate + Forced Alternatives (SB-4D)
- [ ] A14: Edit `.claude/copilot-instructions.md` — add `/new-feature` skill trigger (SB-5A)
- [ ] A15: Edit `agent.md` — add `/new-feature` to commands table (SB-5B)
- [ ] A16: Run `ng build` — verify no regressions (these are .md files, so build should pass trivially)

---

# Verification Criteria

| Criterion | How to verify |
|-----------|--------------|
| `/new-feature` command exists | `cat .claude/commands/new-feature.md` returns valid content |
| Command has all 5 phases | Grep for "Phase 0", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5" |
| Escape hatch documented | Grep for "skip", "escape hatch" in new-feature.md |
| 3 hard stops documented | Grep for "HARD STOP" — should find 3 occurrences |
| plan-implementation has 3 new sections | Grep for "No Placeholders Scan", "Forced Alternatives", "Adversarial" |
| execute-it has 3 new sections | Grep for "Verification-Before-Completion", "Systematic-Debugging", "Smart Visual QA" |
| Team Leader has two-stage review | Grep for "Two-Stage Review" in team-leader.md |
| QA Engineer has debugging protocol | Grep for "Systematic-Debugging Protocol" in qa-engineer.md |
| End-of-Session has fresh verification | Grep for "Verification-Before-Completion" in end-of-session-agent.md |
| Software Architect has No Placeholders | Grep for "No Placeholders Gate" in software-architect.md |
| Trigger registered | Grep for "new-feature" in copilot-instructions.md |
| Command in agent.md | Grep for "new-feature" in agent.md |
| Build passes | `ng build` exits 0 |

---

# Constraints

- **Do NOT modify `/brief`** — it stays exactly as it is today
- **Do NOT modify any application code** (`.ts`, `.html`, `.scss` files in `src/`)
- **Do NOT create new agents** — only enhance existing ones
- **Do NOT add gstack infrastructure** (telemetry, builder profile, learnings-log, slug system)
- **Do NOT add YC resources, office-hours closing sequence, or founder signals** (per memory: `feedback_no_yc_resources.md`)
- **Preserve existing behavior** — all additions are NEW sections appended to existing content. Do not rewrite or remove existing sections.
- **Follow existing formatting conventions** — each file has its own style (markdown headers, tables, code blocks). Match it.

---

# Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New sections conflict with existing behavior | Low | Med | Additions are after existing content, not replacements |
| `/new-feature` too slow (too many questions) | Med | Med | Escape hatch + smart-skip ensures 2-5 min max |
| Adversarial subagent review adds latency to plan-implementation | Med | Low | Skip condition for simple plans; max 2 iterations |
| Verification-before-completion slows execute-it | Low | Low | Build was already required post-execution; this just enforces it per-task |

---

# Source Attribution

| Pattern | Source | Adaptation |
|---------|--------|-----------|
| Forcing questions + push + smart-skip + escape hatch | gstack office-hours Phase 2A (lines 758-841) | Reduced from 6→4 questions, push-once not push-3x, adapted for dev tool context |
| Landscape awareness (WebSearch) | gstack office-hours Phase 2.75 (lines 902-935) | Removed privacy gate (unnecessary for dev search), removed eureka logging |
| Premise challenge | gstack office-hours Phase 3 (lines 939-957) | Kept 4 premises, simplified format |
| Forced alternatives | gstack office-hours Phase 4 (lines 1065-1096) | Same structure, added "Reuses" field |
| No Placeholders scan | Superpowers `writing-plans` skill (lines 108-115) | Direct adoption of red flag patterns |
| Verification-before-completion | Superpowers `verification-before-completion` skill (full) | Direct adoption of iron law + red flags |
| Systematic-debugging protocol | Superpowers `systematic-debugging` skill (Phases 1-4) | Condensed from 4 full phases to essential steps |
| Two-stage review (spec→quality) | Superpowers `subagent-driven-development` skill (process) | Extracted review pattern only, not full subagent orchestration |
| RED-GREEN mandate | Superpowers `test-driven-development` skill (regression section) | Extracted regression test verification only, not full TDD cycle |
| Prior work discovery | gstack office-hours Phase 2.5 (lines 882-898) | Adapted to use plans/ + MemPalace instead of ~/.gstack/ |
| Adversarial subagent review | gstack office-hours Spec Review Loop (lines 1445-1506) | Reduced from 5→3 dimensions, max 2 iterations not 3 |
