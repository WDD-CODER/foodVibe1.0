# Skill Evaluator (IMMUTABLE)

> **DO NOT MODIFY THIS FILE DURING REFLECTION LOOPS.**
> This is the fixed ground truth — equivalent to `prepare.py` in Karpathy's
> autoresearch. The agent reads this file for scoring rules but NEVER edits it.
> If scoring rules need to change, the human does it manually.

## Purpose

Evaluates a skill's quality by running its test suite and producing a single
number: `skill_score`. This score is the ONLY metric that determines whether
a skill change is kept or discarded.

## The Metric: skill_score

```
skill_score = ((behaviors_passed - antipatterns_triggered) / total_behaviors) * 100
```

- **Range**: 0–100 (can go negative if many anti-patterns triggered)
- **Goal**: Higher is better
- **Comparable**: Score is normalized, so different skills can be compared
- **Single metric**: Like `val_bpb` in autoresearch — one number decides everything

## Known Limitation: Self-Evaluation Bias

In autoresearch, `prepare.py` runs real code and produces an objective number.
The agent CANNOT influence the measurement.

In our system, the SAME agent that proposes skill improvements also evaluates
whether they worked. This is a fundamental limitation. To mitigate it:

### The Evidence Rule (MANDATORY)

For EVERY Expected Behavior checkbox the agent marks as "passed", it MUST:

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

## Evaluation Protocol

### Inputs
- `skill_file`: Path to the skill being tested (e.g., `.claude/skills/angularComponentStructure/SKILL.md`)
- `test_suite`: Path to the test suite (e.g., `.claude/reflect/test-suites/angularComponentStructure.tests.md`)

### Step-by-Step Process

**Step 1: Load both files**
- Read the skill file completely. Note its line count and byte size.
- Read the test suite completely. Count total test cases.

**Step 2: For each test case, evaluate**

For each test case in the test suite:

a. **Read the prompt** — this is what a hypothetical user typed.

b. **Check trigger accuracy** — Based on the skill's trigger rules, would this
   skill activate for this prompt?
   - If the test expects activation and the skill WOULD activate → correct
   - If the test expects NO activation and the skill would NOT activate → correct
   - Any mismatch → incorrect trigger

c. **Check each Expected Behavior** — For each checkbox:
   - Find the specific line(s) in the skill file that would produce this behavior
   - Write the evidence (line number + quote + reasoning)
   - If evidence is found and reasoning is sound → check the box [x]
   - If no evidence or weak reasoning → leave unchecked [ ]

d. **Check each Anti-Pattern** — For each anti-pattern:
   - Would the skill's rules PREVENT this anti-pattern?
   - If the skill has no rule preventing it, or a rule that might cause it → triggered [x]
   - If the skill explicitly prevents it → not triggered [ ]

e. **Record results for this test case**:
   - behaviors_passed: count of [x] in Expected Behaviors
   - behaviors_failed: count of [ ] in Expected Behaviors
   - antipatterns_triggered: count of [x] in Anti-Patterns
   - test_passed: true only if ALL behaviors passed AND zero anti-patterns triggered

**Step 3: Calculate score**

```
total_behaviors = sum of all Expected Behavior checkboxes across all test cases
behaviors_passed = sum of all checked Expected Behaviors
antipatterns_triggered = sum of all triggered Anti-Patterns

skill_score = ((behaviors_passed - antipatterns_triggered) / total_behaviors) * 100
```

Round to one decimal place.

**Step 4: Calculate secondary metrics**

```
skill_size_bytes = file size of the skill file in bytes
test_cases_total = number of test cases in the suite
test_cases_passed = number of test cases where ALL behaviors passed AND 0 anti-patterns
trigger_accuracy = (correct_triggers / test_cases_total) * 100
```

### Output Format

After evaluation, output this EXACT block (the /reflect command parses it):

```
EVALUATION RESULTS
==================
skill_score:       XX.X
skill_size_bytes:  NNNN
test_cases_total:  N
test_cases_passed: N
trigger_accuracy:  XXX.X
behaviors_passed:  N
behaviors_total:   N
antipatterns_hit:  N
==================
```

## Keep vs Discard Decision Rules

These rules determine whether a skill change is kept or discarded.
They are intentionally simple — matching autoresearch's approach.

**In autoresearch**: `if val_bpb < best: keep. else: discard.`

**Our rules**:

| Condition | Decision | Reasoning |
|-----------|----------|-----------|
| `skill_score` increased (any amount) | **KEEP** | Score improved — the change helped |
| `skill_score` unchanged AND skill file is simpler (fewer lines, clearer rules, smaller) | **KEEP** | Simplification win — same quality, less complexity |
| `skill_score` unchanged AND skill file is same size or larger | **DISCARD** | No improvement — revert |
| `skill_score` decreased (any amount) | **DISCARD** | Score got worse — revert immediately |
| Evaluation could not complete (crash) | **DISCARD** | Broken — revert and log as crash |

**"Simpler" is a soft judgment, not a formula.** The agent decides whether the
change genuinely simplified the skill (removed redundant rules, consolidated
overlapping sections, clarified ambiguous instructions). This is like autoresearch's
heuristic: "A 0.001 improvement from deleting code? Definitely keep."

## Crash Handling

If evaluation cannot complete — the skill file is corrupted, has broken markdown
that prevents parsing, or produces nonsensical results — handle it as follows:

1. Log the result as `status: crash` with `skill_score: 0`
2. Revert the skill file immediately: `git checkout -- .claude/skills/<name>/SKILL.md`
3. Attempt to diagnose what went wrong (read the skill file, identify the issue)
4. If the fix is obvious (typo, unclosed block), apply fix and re-run evaluation
5. If the fix is not obvious, move to the next hypothesis
6. After 2 consecutive crashes, STOP and report to user — something is fundamentally wrong

## Constraints (Immutable — These Cannot Change)

1. Test suite content is fixed per evaluation run — the agent cannot edit tests
2. Scoring formula is fixed — `((passed - antipatterns) / total) * 100`
3. A test case "passes" only if ALL Expected Behaviors are checked AND zero Anti-Patterns triggered
4. Anti-patterns always subtract from the score
5. Evidence Rule is mandatory — no evidence, no checkmark
6. Evaluation must complete — no early stopping (unless crash)
7. This file (evaluator.md) is never modified during reflection loops
