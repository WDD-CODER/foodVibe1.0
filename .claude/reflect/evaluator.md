# Skill Evaluator (IMMUTABLE)

> **DO NOT MODIFY THIS FILE DURING REFLECTION LOOPS.**
> This is the fixed ground truth — equivalent to `prepare.py` in Karpathy's
> autoresearch. The agent reads this file for scoring rules but NEVER edits it.
> If scoring rules need to change, the human does it manually.

## Purpose

Evaluates a skill's quality by running its test suite and producing a single
number: `final_score`. This score is the ONLY metric that determines whether
a skill change is kept or discarded.

## The Metric: final_score

```
final_score = exec_score + behavior_score + agent_score
```

- **Range**: 0–100
- **Goal**: Higher is better
- **Comparable**: Score is normalized, so different skills can be compared
- **Single metric**: Like `val_bpb` in autoresearch — one number decides everything

### Three-Tier Scoring Architecture

| Tier | Weight | What it checks | Gameable? |
|------|--------|----------------|-----------|
| Machine GREP | 40% | Keywords in SKILL.md | YES (acceptable — cheap to run) |
| Behavioral Execution | 30% | Skill runs on real input → output checked | NO |
| Agent Qualitative | 30% | Blind evaluator reads instructions | Somewhat |

**Fallback when no Behavior Checks exist:** If a test suite has no `**Behavior Checks**`
sections, the 30% behavioral weight rolls up to the machine tier:
machine = 70%, agent = 30%. This preserves backward compatibility with v2.0 test suites.

### Layer 1: Machine GREP Score (40% weight — or 70% if no Behavior Checks)

Produced by running `test-runner.sh`. Machine-verified. Reproducible.
The agent CANNOT influence this measurement.

```bash
bash .claude/reflect/test-runner.sh <skill-file> <test-suite>
# Output: skill_score: XX.X
```

```
exec_score = (machine_checks_passed / total_machine_checks) * 40
# Or if no Behavior Checks: exec_score = (machine_checks_passed / total_machine_checks) * 70
```

Machine check types (defined in test suites):
- `GREP: "string"` — passes if string found in skill file (fixed-string match)
- `GREP-NOT: "string"` — passes if string NOT found in skill file
- `SECTION: "heading" COUNT >= N` — passes if heading appears >= N times
- `LINE-COUNT: <= N` — passes if skill file has <= N lines
- `PATTERN: "regex" NEAR "anchor" DISTANCE N` — passes if regex within N lines of anchor

### Layer 2: Behavioral Execution Score (30% weight — unkammable)

Produced by the behavior runner agent. The agent receives SKILL.md as its
operating instructions and a test prompt, then generates output. The output
is machine-checked with grep — this cannot be gamed by adding keywords.

```
behavior_score = (behavior_checks_passed / total_behavior_checks) * 30
```

Behavior check types (defined in test suites under `**Behavior Checks**`):
- `RUN_AGENT: "prompt" → OUTPUT-GREP: "expected"` — agent output must contain string
- `RUN_AGENT: "prompt" → OUTPUT-GREP-NOT: "forbidden"` — agent output must NOT contain string
- `RUN_AGENT: "prompt" → OUTPUT-GREP-BEFORE: "A" BEFORE "B"` — A must appear before B in output

If a test suite has no Behavior Checks → `behavior_score = 0` and its weight
rolls up to exec_score (see fallback rule above).

### Layer 3: Agent Qualitative Score (30% weight)

Produced by the evaluator agent (blind — no knowledge of what changed or why).
Applies the Evidence Rule: every Agent-Evaluated Behavior must cite a specific
line number from SKILL.md with an exact quote. No citation = not passed.

```
agent_score = (agent_behaviors_passed / total_agent_behaviors) * 30
```

The agent score covers nuanced behaviors that machine checks cannot verify:
- Section ordering ("sections appear in this sequence")
- Emphasis and specificity ("the rule is specific enough that a developer would choose X over Y")
- Pedagogical clarity ("the instructions guide toward the correct solution")

### Combined Score

```
final_score = exec_score + behavior_score + agent_score
```

Round to one decimal place. A skill scoring 40.0 exec + 30.0 behavior + 30.0 agent
= 100.0 has passed all machine checks, all behavioral execution checks, and all
agent-evaluated behaviors.

## Gap Closure: Two-Agent Architecture

The agent score (30%) is produced by a SEPARATE evaluator agent spawned via
the Agent tool. This agent:

- Has NO knowledge of what changed or why (no git diff, no hypothesis, no log)
- Receives ONLY: skill file contents + test suite contents + evaluator.md rules
- Returns ONLY: the EVALUATION RESULTS block (see Output Format below)
- Cannot run git commands or infer change intent from file history

This separation mirrors Karpathy's `prepare.py` constraint: the researcher
proposes changes; the evaluator measures; neither can influence the other's role.

## The Evidence Rule (MANDATORY for Agent Score)

For EVERY Agent-Evaluated Behavior the evaluator marks as "passed", it MUST:

1. **Quote the specific line(s)** from the skill file that produce this behavior
2. **Explain the causal chain**: "Line X says [rule]. This rule would cause [behavior]
   because [reasoning]."
3. **If no specific line can be cited** → the behavior is NOT passed. Period.

Example of GOOD evaluation:
```
- [x] Uses signal() for state
  EVIDENCE: SKILL.md line 38: "Signal Mapping: Define internal state using signal()"
  This rule explicitly requires signal() for internal state, so when prompted to
  add reactive state, the skill would enforce signal() usage.
```

Example of BAD evaluation (would be rejected):
```
- [x] Uses signal() for state
  EVIDENCE: The skill generally promotes reactive patterns.
```

The second example is vague and doesn't cite a specific line. It fails the
Evidence Rule and the checkbox must be unchecked.

## Evaluation Protocol (Agent Score Portion)

The evaluator agent receives these inputs (and ONLY these):
- `skill_file`: Full contents of the skill being tested
- `test_suite`: Full contents of the test suite
- `evaluator_rules`: This file (evaluator.md)

### Step-by-Step Process (Agent-Evaluated Behaviors only)

**Step 1: Load both files**
- Read the skill file completely. Note its line count.
- Read the test suite completely. Count total Agent-Evaluated Behavior checkboxes.

**Step 2: For each TC — evaluate Agent-Evaluated Behaviors only**

For each test case in the test suite:

a. **Read the prompt** — this is what a hypothetical user typed.

b. **Skip Concrete Checks** — these are handled by test-runner.sh, not by you.

c. **Check each Agent-Evaluated Behavior** — For each checkbox:
   - Find the specific line(s) in the skill file that would produce this behavior
   - Write the evidence (line number + quote + reasoning)
   - If evidence is found and reasoning is sound → check the box [x]
   - If no evidence or weak reasoning → leave unchecked [ ]

d. **Record results for this test case**:
   - behaviors_passed: count of [x] in Agent-Evaluated Behaviors
   - behaviors_failed: count of [ ] in Agent-Evaluated Behaviors

**Step 3: Calculate agent score**

```
total_agent_behaviors = sum of all Agent-Evaluated Behavior checkboxes across all TCs
agent_behaviors_passed = sum of all [x] Agent-Evaluated Behaviors
agent_score = (agent_behaviors_passed / total_agent_behaviors) * 30
```

Round to one decimal place.

### Output Format

After evaluation, output this EXACT block (the /reflect command parses it):

```
EVALUATION RESULTS
==================
exec_score:           XX.X   (from test-runner.sh — do not recalculate)
behavior_score:       XX.X   (from behavior-runner — do not recalculate; 0.0 if no Behavior Checks)
agent_score:          XX.X   (your calculation — range 0.0–30.0)
final_score:          XX.X   (exec_score + behavior_score + agent_score)
agent_behaviors_total: N
agent_behaviors_passed: N
==================
```

The `exec_score` and `behavior_score` fields are passed IN by the /reflect
orchestrator — copy them verbatim. You calculate `agent_score` and `final_score` only.

## Keep vs Discard Decision Rules

These rules determine whether a skill change is kept or discarded.
They are intentionally simple — matching autoresearch's approach.

**In autoresearch**: `if val_bpb < best: keep. else: discard.`

**Our rules**:

| Condition | Decision | Reasoning |
|-----------|----------|-----------|
| `final_score` increased (any amount) | **KEEP** | Score improved — the change helped |
| `final_score` unchanged AND skill file is simpler (fewer lines, clearer rules, smaller) | **KEEP** | Simplification win — same quality, less complexity |
| `final_score` unchanged AND skill file is same size or larger | **DISCARD** | No improvement — revert |
| `final_score` decreased (any amount) | **DISCARD** | Score got worse — revert immediately |
| Evaluation could not complete (crash) | **DISCARD** | Broken — revert and log as crash |

**"Simpler" is a soft judgment, not a formula.** The agent decides whether the
change genuinely simplified the skill (removed redundant rules, consolidated
overlapping sections, clarified ambiguous instructions).

## Crash Handling

If evaluation cannot complete — the skill file is corrupted, has broken markdown
that prevents parsing, or produces nonsensical results — handle it as follows:

1. Log the result as `status: crash` with `final_score: 0`
2. Revert the skill file immediately: `git checkout -- .claude/skills/<name>/SKILL.md`
3. Attempt to diagnose what went wrong (read the skill file, identify the issue)
4. If the fix is obvious (typo, unclosed block), apply fix and re-run evaluation
5. If the fix is not obvious, move to the next hypothesis
6. After 2 consecutive crashes, STOP and report to user — something is fundamentally wrong

## Constraints (Immutable — These Cannot Change)

1. Test suite content is fixed per evaluation run — the agent cannot edit tests
2. Executable score formula is fixed: `(checks_passed / total_checks) * 40` (or `* 70` if no Behavior Checks)
3. Behavior score formula is fixed: `(behavior_checks_passed / total_behavior_checks) * 30`
4. Agent score formula is fixed: `(behaviors_passed / total_behaviors) * 30`
5. Final score formula is fixed: `exec_score + behavior_score + agent_score`
6. Evidence Rule is mandatory — no evidence, no checkmark
7. Evaluation must complete — no early stopping (unless crash)
8. This file (evaluator.md) is never modified during reflection loops
9. The evaluator agent receives NO context about what changed or why
