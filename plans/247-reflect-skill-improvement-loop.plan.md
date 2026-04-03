---
name: "Reflect — Self-improving skills system"
overview: "Build an autonomous self-improvement loop for Claude Code skills, inspired by Karpathy's autoresearch 3-file pattern."
todos: []
isProject: false
---

# Reflect — Self-Improving Skills System

## Goal

Create a `/reflect` slash command that evaluates Claude Code skills against test suites,
proposes improvements, and keeps only changes that improve the score — a ratchet that
only moves forward.

This is inspired by **Karpathy's autoresearch** project. In autoresearch, an AI agent
autonomously improves a training script (`train.py`) by running experiments, measuring
a fixed metric (`val_bpb` — bits per byte), and keeping only changes that lower the
metric. The key insight is the 3-file separation:

1. **`prepare.py`** — FIXED. Contains the evaluation function, data pipeline, and
   constraints. The agent CANNOT modify this file. This prevents the agent from
   gaming the metric.
2. **`train.py`** — MUTABLE. The only file the agent edits. Contains the model
   architecture, optimizer, hyperparameters — everything "fair game."
3. **`program.md`** — INSTRUCTIONS. Tells the agent how to run the loop: commit,
   run experiment, check metric, keep or discard, repeat forever.

We adapt this pattern to skill improvement:

| Autoresearch | Our Equivalent | Role | Mutable? |
|---|---|---|---|
| `prepare.py` | `.claude/reflect/evaluator.md` | Scoring rules, metric formula | **NO — IMMUTABLE** |
| `train.py` | `.claude/skills/<name>/SKILL.md` | The skill being improved | **YES — this is what changes** |
| `program.md` | `.claude/commands/reflect.md` | The `/reflect` slash command | **NO — instructions only** |
| `results.tsv` | `.claude/reflect/reflection-log.tsv` | Experiment history log | **APPEND ONLY** |
| validation data | `.claude/reflect/test-suites/<name>.tests.md` | Test prompts + expected behaviors | **NO — fixed per run** |

---

## Key Refinements (from autoresearch cross-reference on 2026-04-03)

We researched the actual autoresearch repo and found 6 divergences from the original
brief. These refinements are folded into the execution plan below:

### 1. Self-Evaluation Bias (Fundamental Limitation)

**Problem**: In autoresearch, `prepare.py` runs real code and produces an objective
number. The agent cannot influence the measurement. In our system, the SAME agent
that proposes improvements also judges whether they worked. This is like a student
grading their own exam.

**Mitigation**: We add an **Evidence Rule** to the evaluator. For every behavior
checkbox the agent marks as "passed", it MUST cite the specific line number and
text from the skill file that produces that behavior. Vague claims like "yes this
would work" are not acceptable. This forces the agent to show its work.

**Future fix**: Have a DIFFERENT agent session evaluate (separation of concerns).
Not in this plan — noted for future Phase 2.

### 2. Simplified Keep/Discard Logic

**Autoresearch**: `if val_bpb < best: keep. else: discard.` Dead simple.
The simplicity criterion is a soft heuristic, not a formula.

**Our original brief**: Had a complex matrix with 2-point thresholds, 10% size
reduction gates, byte counts. Over-engineered.

**Fix**: Match autoresearch's simplicity:
- Score improved → **KEEP**
- Score same + code is simpler (fewer lines, clearer rules) → **KEEP** (soft judgment)
- Score same or worse + same or more complex → **DISCARD**
- No arbitrary thresholds. The agent uses judgment, not formulas.

### 3. Single Branch + Git Reset (Not Experiment Branches)

**Autoresearch**: Uses ONE branch (`autoresearch/<tag>`). Commits before experimenting.
If the experiment fails, does `git reset --hard HEAD~1` to revert. Git history = only
successful experiments in a clean linear chain.

**Fix**: Use single branch `reflect/<skill>`. On discard, reset to previous commit.
No experiment branches — they add unnecessary overhead.

### 4. Crash Handling

**Autoresearch**: If the training run crashes (no output), logs status as `crash`
with `val_bpb = 0.000000`, reads the last 50 lines of the log, attempts a fix or
moves to the next hypothesis.

**Fix**: Add crash status. If evaluation cannot complete (skill is corrupted, has
syntax that breaks parsing, etc.), log as `crash` with `skill_score = 0`, attempt
fix once, then move to next hypothesis if fix fails.

### 5. Skill Path Convention

**Project convention**: Skills live at `.claude/skills/<name>/SKILL.md` (subfolder
with `SKILL.md` inside), NOT `.claude/skills/<name>.md`.

All file references in evaluator.md, reflect.md, and test suites use this convention.

### 6. Reflection Log is Untracked

**Autoresearch**: `results.tsv` is in `.gitignore` — it's a local lab notebook.
Git history already captures successful experiments via commits.

**Fix**: `reflection-log.tsv` is a local log. It does not need to be committed.
The git history on the reflect branch IS the record of successful improvements.

---

## Directory Structure (What We're Building)

```
.claude/
├── reflect/                              # NEW — all reflect infrastructure
│   ├── evaluator.md                      # IMMUTABLE — scoring rules (like prepare.py)
│   ├── test-suite-template.md            # Format definition for test files
│   ├── reflection-log.tsv               # Experiment history (untracked lab notebook)
│   └── test-suites/                      # One test file per skill
│       └── angularComponentStructure.tests.md  # First test suite
├── commands/
│   └── reflect.md                        # NEW — the /reflect slash command
└── skills/
    └── [existing skills]/SKILL.md        # THESE are what /reflect improves
```

---

## Constraints

- `evaluator.md` is IMMUTABLE — never modify during reflection loops
- Test suites are fixed per evaluation run — do not edit during a loop
- Only `.claude/skills/<name>/SKILL.md` files are editable during reflection
- `reflection-log.tsv` is a local lab notebook — not committed to git
- Git history on `reflect/<skill>` branch = only successful experiments
- The agent evaluating MUST cite evidence (line numbers) for every behavior check

---

# Atomic Sub-tasks

Each task below specifies the EXACT file to create, its EXACT content, and WHY
each section exists. A less powerful model should be able to execute these tasks
by reading the content specifications and creating files verbatim.

---

## Task 1: Create directory structure

**What**: Create the directory `.claude/reflect/test-suites/`

**How**: Run `mkdir -p .claude/reflect/test-suites`

**Why**: This is the container for all reflect infrastructure. The `test-suites/`
subdirectory holds one test file per skill (like a test dataset in ML).

---

## Task 2: Create test suite template

**File**: `.claude/reflect/test-suite-template.md`

**Why**: This is a FORMAT DEFINITION — it tells anyone writing new test suites
exactly how to structure them. It's documentation, not executable.

**Content**: Create this file with the following exact content:

````markdown
# Test Suite Template

> This file defines the FORMAT for skill test suites.
> It is documentation — not a test suite itself.
> Actual test suites go in `.claude/reflect/test-suites/<skill-name>.tests.md`

Each skill has a test suite file named `<skill-name>.tests.md` in the
`test-suites/` directory. The skill name matches the folder name under
`.claude/skills/` (e.g., `angularComponentStructure` → `angularComponentStructure.tests.md`).

## Format

Every test suite file MUST follow this structure:

~~~markdown
# <Skill Name> Test Suite

## Metadata
- skill_file: .claude/skills/<folder-name>/SKILL.md
- version: 1.0
- last_updated: YYYY-MM-DD

## Test Cases

### TC-001: <Descriptive Test Name>
**Prompt**: |
  <The exact user prompt to simulate — write it as if a real user typed it>

**Expected Behaviors**:
- [ ] <Behavior 1 — what the skill SHOULD do when this prompt is given>
- [ ] <Behavior 2 — be specific and objectively verifiable>
- [ ] <Behavior 3 — refer to specific rules in the skill file>

**Anti-Patterns** (should NOT happen):
- [ ] <Thing that would indicate the skill failed or misbehaved>
- [ ] <Another failure mode to watch for>

### TC-002: <Next Test Name>
...
~~~

## Scoring Rules

These rules are used by `evaluator.md` to calculate `skill_score`:

1. Each **Expected Behavior** checkbox = **+1 point** if the skill would produce
   that behavior when given the prompt
2. Each **Anti-Pattern** triggered = **-1 point** (penalty for bad behavior)
3. Final score formula:
   ```
   skill_score = ((behaviors_passed - antipatterns_triggered) / total_behaviors) * 100
   ```
4. A test case is considered "fully passed" ONLY if ALL its Expected Behaviors
   are checked AND zero Anti-Patterns are triggered

## Test Case Guidelines

1. **Minimum 3 test cases per skill**, recommended 5
2. **Coverage types**:
   - Typical successful use case (the happy path)
   - Another common use case (different angle)
   - Edge case or complex scenario
   - Trigger boundary: prompt that should NOT activate the skill
   - Trigger boundary: prompt that SHOULD activate (near the boundary)
3. **Prompts must be realistic** — write them as a real user would type them
4. **Behaviors must be objectively verifiable** — "generates good code" is bad;
   "uses `signal()` for state instead of `BehaviorSubject`" is good
5. **Anti-patterns should be specific** — name the exact bad pattern to watch for
6. **Reference skill rules** — each Expected Behavior should trace back to a
   specific rule or section in the skill's SKILL.md file
````

---

## Task 3: Create evaluator (IMMUTABLE scoring rules)

**File**: `.claude/reflect/evaluator.md`

**Why**: This is the equivalent of autoresearch's `prepare.py`. It defines HOW
we score skills. It MUST NOT be modified during reflection loops. If the agent
could change the scoring rules, it could game the metric instead of genuinely
improving the skill.

**CRITICAL**: After creating this file, it is IMMUTABLE. The `/reflect` command
will read it but NEVER edit it. If scoring rules need to change, the human does
it manually between reflection sessions.

**Content**: Create this file with the following exact content:

````markdown
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
````

---

## Task 4: Create reflection log (header only)

**File**: `.claude/reflect/reflection-log.tsv`

**Why**: This is the experiment history — equivalent to autoresearch's `results.tsv`.
It tracks every evaluation and experiment across all reflection sessions.

**Important**: This file is a LOCAL LAB NOTEBOOK. It does not need to be committed
to git. The git history on the `reflect/<skill>` branch already captures successful
experiments as commits.

**Content**: Create this file with EXACTLY this one line (tab-separated columns):

```
date	skill	commit	skill_score	size_bytes	status	hypothesis	notes
```

The columns are:
- `date`: YYYY-MM-DD when the evaluation ran
- `skill`: skill folder name (e.g., `angularComponentStructure`)
- `commit`: 7-character git commit hash at time of evaluation
- `skill_score`: the score from evaluator.md (0–100, one decimal)
- `size_bytes`: byte size of the skill file
- `status`: one of `baseline`, `keep`, `discard`, `crash`
- `hypothesis`: what change was tested (short description)
- `notes`: brief outcome notes

---

## Task 5: Create first test suite (angularComponentStructure)

**File**: `.claude/reflect/test-suites/angularComponentStructure.tests.md`

**Why**: We need at least one test suite to run `/reflect` for the first time.
`angularComponentStructure` is the best candidate because:
- It's one of the most-used skills in this project
- It has clear, specific rules (standalone, OnPush, inject(), signal(), etc.)
- Its rules are objectively verifiable (either the code has `standalone: true` or it doesn't)

**How to create**: Read `.claude/skills/angularComponentStructure/SKILL.md` first,
then write test cases that exercise its rules. Each Expected Behavior should trace
back to a specific line in the skill file.

**Content**: Create this file based on the skill's actual rules. The test cases
below are derived from reading the skill file:

````markdown
# angularComponentStructure Test Suite

## Metadata
- skill_file: .claude/skills/angularComponentStructure/SKILL.md
- version: 1.0
- last_updated: 2026-04-03

## Test Cases

### TC-001: Standard Component Creation
**Prompt**: |
  Create a new component for displaying recipe cards in a grid layout

**Expected Behaviors**:
- [ ] Creates component with `standalone: true` in decorator
- [ ] Sets `changeDetection: ChangeDetectionStrategy.OnPush` in decorator
- [ ] Uses `inject()` for all dependency injection — no constructor injection
- [ ] Generates four-file split: .ts, .html, .scss, .spec.ts (or notes spec is deferred)
- [ ] Class sections follow strict order: INJECTED → INPUTS → OUTPUTS → SIGNALS & CONSTANTS → COMPUTED SIGNALS → CRDUL methods

**Anti-Patterns** (should NOT happen):
- [ ] Uses `@NgModule` or declares component in a module
- [ ] Uses `constructor(private service: Service)` for injection
- [ ] Uses `ChangeDetectionStrategy.Default` or omits change detection
- [ ] Defines `.c-*` CSS classes in component .scss instead of src/styles.scss

### TC-002: Signal-Based Reactivity
**Prompt**: |
  Add a search filter with reactive state to this component — it should
  filter a list of recipes by name as the user types

**Expected Behaviors**:
- [ ] Uses `signal()` for internal state (the search query)
- [ ] Uses `computed()` for derived state (the filtered list)
- [ ] Uses `input()` function for component inputs — not `@Input()` decorator
- [ ] Uses `output()` function for component outputs — not `@Output()` decorator
- [ ] Exposes public state via `.asReadonly()` if needed

**Anti-Patterns** (should NOT happen):
- [ ] Uses `BehaviorSubject` or classic RxJS for simple local state
- [ ] Uses `@Input()` / `@Output()` decorators instead of signal-based API
- [ ] Uses `effect()` where `computed()` would suffice

### TC-003: Component With CRDUL Methods
**Prompt**: |
  Build a recipe management component that can create, read, update,
  delete, and list recipes from a service

**Expected Behaviors**:
- [ ] CRDUL methods grouped in this exact order: Create, Read, Delete, Update, List
- [ ] Each CRDUL method is clearly identifiable in its group
- [ ] Service dependencies use `inject()` — not constructor injection
- [ ] Class section order maintained: INJECTED services come first, then INPUTS, then OUTPUTS, then SIGNALS, then COMPUTED, then CRDUL methods

**Anti-Patterns** (should NOT happen):
- [ ] CRDUL methods scattered throughout the class without grouping
- [ ] Methods ordered alphabetically instead of by CRDUL convention
- [ ] Uses `any` type for method parameters or return values

### TC-004: Trigger Boundary — Should NOT Activate
**Prompt**: |
  Fix the MongoDB connection timeout in the backend server

**Expected Behaviors**:
- [ ] Skill does NOT activate — this is a backend/database task, not Angular component work
- [ ] No Angular component structure guidance given
- [ ] Response addresses the actual MongoDB issue without referencing component patterns

**Anti-Patterns** (should NOT happen):
- [ ] Skill activates and gives Angular component guidance for a non-Angular task
- [ ] Response includes boilerplate component structure when none was asked for

### TC-005: Trigger Boundary — SHOULD Activate
**Prompt**: |
  Refactor the recipe-header component to clean up the class structure

**Expected Behaviors**:
- [ ] Skill activates — "refactoring an Angular component" matches the trigger
- [ ] Checks existing component against the mandatory class section order
- [ ] Identifies sections that are out of order and proposes reordering
- [ ] Verifies Lucide icons used in template are registered in app.config.ts
- [ ] Checks for `.c-*` class definitions in component .scss → flags for move to styles.scss

**Anti-Patterns** (should NOT happen):
- [ ] Skill does not activate for a component refactoring request
- [ ] Rewrites the component from scratch instead of reordering existing code
- [ ] Ignores the Lucide icon registration check
````

---

## Task 6: Create /reflect command (the orchestrator)

**File**: `.claude/commands/reflect.md`

**Why**: This is the slash command users type to run the reflection loop. It's
equivalent to autoresearch's `program.md`. It orchestrates everything: reads the
test suite, reads the evaluator, runs evaluation, proposes improvements, applies
them, re-evaluates, and keeps or discards.

**CRITICAL for weaker models**: This file must be EXTREMELY detailed and
step-by-step. A less powerful model will read this file and follow it literally.
Every decision point, every git command, every output format must be explicit.
Leave nothing to inference.

**Content**: Create this file with the following exact content:

````markdown
---
description: Autonomous self-improvement loop for Claude Code skills
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# /reflect

Autonomous self-improvement loop for Claude Code skills.
Inspired by Karpathy's autoresearch pattern.

## What This Command Does

This command improves a skill file by:
1. Reading the skill and its test suite
2. Evaluating the skill against every test case (scoring it)
3. Proposing a specific improvement (a hypothesis)
4. Applying the improvement to the skill file
5. Re-evaluating to see if the score went up
6. Keeping the change if score improved, discarding if not
7. Logging everything to the reflection log

## Usage

```
/reflect <skill-name> [--mode baseline|analyze|improve]
```

**Arguments**:
- `<skill-name>`: The folder name of the skill under `.claude/skills/`
  (e.g., `angularComponentStructure`, `cssLayer`, `add-recipe`)
- `--mode`: What to do (default: `analyze`)
  - `baseline` — First-time run. Establish initial score. No changes made.
  - `analyze` — Run evaluation, report score and detailed results. No changes made.
  - `improve` — Full loop: evaluate → hypothesize → apply → re-evaluate → keep/discard

## Files You Will Work With

```
THESE FILES ARE READ-ONLY (do not modify during /reflect):
├── .claude/reflect/evaluator.md              # Scoring rules — READ THIS FIRST
├── .claude/reflect/test-suites/<skill>.tests.md  # Test cases — your "dataset"

THIS FILE IS WHAT YOU IMPROVE (the only editable file):
├── .claude/skills/<skill>/SKILL.md           # The skill being optimized

THIS FILE IS APPEND-ONLY (add one row per evaluation):
├── .claude/reflect/reflection-log.tsv        # Experiment history
```

**IMPORTANT**: You may ONLY edit the skill file (`.claude/skills/<skill>/SKILL.md`).
You may NOT edit `evaluator.md` or any `.tests.md` file during a reflection loop.
This constraint is what makes the system trustworthy — if you could change the
scoring rules or tests, you could game the metric instead of genuinely improving.

---

## PHASE 1: Setup

Run this phase for ALL modes (baseline, analyze, improve).

### Step 1.1: Validate inputs

1. Parse the skill name from the user's command.
   Example: `/reflect angularComponentStructure --mode baseline`
   → skill_name = `angularComponentStructure`
   → mode = `baseline`

2. Check the test suite exists:
   ```
   File: .claude/reflect/test-suites/<skill_name>.tests.md
   ```
   If this file does NOT exist → STOP immediately and tell the user:
   ```
   ❌ No test suite found for "<skill_name>".
   Expected: .claude/reflect/test-suites/<skill_name>.tests.md
   Create a test suite first, then run /reflect again.
   ```

3. Check the skill file exists:
   ```
   File: .claude/skills/<skill_name>/SKILL.md
   ```
   If this file does NOT exist → STOP and tell the user.

### Step 1.2: Read the three input files

Read these files IN THIS ORDER:

1. **Read the evaluator**: `.claude/reflect/evaluator.md`
   — This tells you HOW to score. Read it carefully. Pay special attention to
   the Evidence Rule — you must cite specific lines for every behavior check.

2. **Read the test suite**: `.claude/reflect/test-suites/<skill_name>.tests.md`
   — This is your "dataset". Count the total test cases and total Expected
   Behaviors. You'll need these numbers for scoring.

3. **Read the skill file**: `.claude/skills/<skill_name>/SKILL.md`
   — This is what you're evaluating. Note the line count and content.
   — Run: `wc -c .claude/skills/<skill_name>/SKILL.md` to get byte size.

### Step 1.3: Git setup (improve mode only)

If mode is `improve`:

1. Check current branch:
   ```bash
   git branch --show-current
   ```

2. If not already on a `reflect/` branch, create one:
   ```bash
   git checkout -b reflect/<skill_name>
   ```
   If already on `reflect/<skill_name>` → stay on it (continuing previous work).

3. Record the current commit hash (this is your "revert point"):
   ```bash
   git rev-parse --short HEAD
   ```
   Save this — you'll need it if you discard.

---

## PHASE 2: Evaluation

Run this phase for ALL modes. This is the core scoring logic.

### Step 2.1: Evaluate each test case

For EACH test case in the test suite, do the following:

**A. Read the test case prompt.**

**B. Determine trigger accuracy:**
- Would this skill activate for this prompt?
- Look at the skill's "Trigger" line (usually near the top of SKILL.md)
- Compare the trigger condition against the test prompt
- If TC expects activation: does the trigger match? → correct/incorrect
- If TC expects NO activation: does the trigger NOT match? → correct/incorrect

**C. Evaluate each Expected Behavior (with evidence):**

For each Expected Behavior checkbox in the test case:

1. Search the skill file for a rule, instruction, or section that would produce
   this behavior
2. If found: write the evidence in this format:
   ```
   - [x] <behavior description>
     EVIDENCE: SKILL.md line NN: "<quoted text from that line>"
     REASONING: <why this rule produces the expected behavior>
   ```
3. If NOT found (no rule in the skill would produce this behavior):
   ```
   - [ ] <behavior description>
     EVIDENCE: No rule found in SKILL.md that addresses this behavior.
   ```

**D. Evaluate each Anti-Pattern:**

For each Anti-Pattern:
1. Search the skill file for a rule that PREVENTS this anti-pattern
2. If the skill explicitly prevents it → not triggered [ ]
3. If the skill has no rule preventing it → triggered [x] (penalty)

**E. Record test case results:**
```
TC-001: Component Creation
  Behaviors: 4/5 passed
  Anti-patterns: 0/3 triggered
  Trigger: correct
  Fully passed: NO (1 behavior failed)
```

### Step 2.2: Calculate the score

After evaluating ALL test cases:

```
behaviors_passed = <sum of all [x] Expected Behaviors across ALL test cases>
antipatterns_triggered = <sum of all [x] Anti-Patterns across ALL test cases>
total_behaviors = <sum of all Expected Behavior checkboxes across ALL test cases>

skill_score = ((behaviors_passed - antipatterns_triggered) / total_behaviors) * 100
```

Round to one decimal place.

### Step 2.3: Get secondary metrics

```bash
# Get file size in bytes
wc -c .claude/skills/<skill_name>/SKILL.md

# Get current commit hash
git rev-parse --short HEAD
```

### Step 2.4: Output the evaluation results

Output this EXACT block:

```
EVALUATION RESULTS
==================
skill_score:       <XX.X>
skill_size_bytes:  <NNNN>
test_cases_total:  <N>
test_cases_passed: <N>
trigger_accuracy:  <XXX.X>
behaviors_passed:  <N>
behaviors_total:   <N>
antipatterns_hit:  <N>
==================
```

Then output the detailed per-test-case breakdown showing evidence for every
behavior check.

### Step 2.5: Log to reflection-log.tsv

Append one row to `.claude/reflect/reflection-log.tsv`:

```
<date>\t<skill>\t<commit>\t<score>\t<size>\t<status>\t<hypothesis>\t<notes>
```

For baseline/analyze modes:
- status = `baseline` (first time) or `analyze` (subsequent)
- hypothesis = `initial` or `re-analyze`
- notes = brief summary

Example:
```
2026-04-03	angularComponentStructure	a1b2c3d	85.7	2340	baseline	initial	First measurement: 4/5 TCs passed
```

---

## PHASE 3: Hypothesize (improve mode ONLY)

**Skip this phase entirely for baseline and analyze modes.**

After evaluation, generate 1–3 improvement hypotheses. Each hypothesis targets
a specific weakness found during evaluation.

### Step 3.1: Identify weaknesses

Look at the evaluation results:
1. Which test cases failed? Which specific behaviors were unchecked?
2. Were any anti-patterns triggered?
3. Were there trigger accuracy issues?
4. Is the skill file unnecessarily large or complex?

### Step 3.2: Generate hypotheses

For each weakness, write a hypothesis in this format:

```markdown
### Hypothesis: <Short descriptive title>
**Target**: <Which section/line of the skill file to change>
**Change**: <Specific modification — what to add, remove, or reword>
**Fixes**: <Which test case and behavior this is expected to fix>
**Risk**: <What could break — which currently-passing tests might fail>
**Size impact**: +N lines / -N lines (estimate)
```

### Step 3.3: Prioritize and select ONE

Priority order:
1. Fix a failing Expected Behavior (increases score)
2. Fix a triggered Anti-Pattern (removes penalty)
3. Improve trigger accuracy (correctness)
4. Simplify the skill (reduce size while maintaining score)

**Select exactly ONE hypothesis** — the highest priority one. Do not try to
fix everything at once. Small, incremental changes are easier to evaluate.

### Step 3.4: Present hypothesis to the evaluation record

Record which hypothesis you selected and why. This goes into the log later.

---

## PHASE 4: Experiment (improve mode ONLY)

**Skip this phase entirely for baseline and analyze modes.**

### Step 4.1: Commit the current state

Before making changes, commit the current state so you have a clean revert point:

```bash
git add .claude/skills/<skill_name>/SKILL.md
git commit -m "[reflect] pre-experiment: <skill_name> score=<current_score>"
```

Record this commit hash — this is your revert point.

### Step 4.2: Apply the change

Edit the skill file according to the selected hypothesis. Make the MINIMUM
change needed — don't reorganize or reformat unrelated sections.

### Step 4.3: Re-evaluate

Run PHASE 2 again on the modified skill file. This gives you the new score.

### Step 4.4: Compare scores

```
EXPERIMENT RESULTS
==================
before:  <old_score> (<old_size> bytes)
after:   <new_score> (<new_size> bytes)
delta:   <+/-X.X> points, <+/-N> bytes
==================
```

---

## PHASE 5: Keep or Discard (improve mode ONLY)

**Skip this phase entirely for baseline and analyze modes.**

Apply the decision rules from `evaluator.md`:

### If score improved (new > old) → KEEP

```bash
git add .claude/skills/<skill_name>/SKILL.md
git commit -m "[reflect] keep: <hypothesis-title> (score <old> → <new>)"
```

Log to reflection-log.tsv with `status: keep`.

### If score same AND skill is simpler → KEEP

Use judgment: is the skill genuinely simpler? Fewer lines? Clearer rules?
Removed redundancy? If yes:

```bash
git add .claude/skills/<skill_name>/SKILL.md
git commit -m "[reflect] keep: <hypothesis-title> (simplification, score unchanged)"
```

Log with `status: keep`.

### If score same or worse AND not simpler → DISCARD

Revert the change:

```bash
git checkout -- .claude/skills/<skill_name>/SKILL.md
```

Log to reflection-log.tsv with `status: discard`.

### If evaluation crashed → DISCARD + diagnose

```bash
git checkout -- .claude/skills/<skill_name>/SKILL.md
```

Log with `status: crash`, `skill_score: 0`.

If the crash cause is obvious (typo, unclosed markdown block), fix it and
try ONE more time. If it crashes again, STOP and report to user.

---

## PHASE 6: Report

Output a complete summary to the user.

### For baseline/analyze modes:

```markdown
## Reflection Report: <skill_name>

**Mode**: baseline / analyze
**Score**: <skill_score>
**Size**: <skill_size_bytes> bytes

**Test Results**:
- TC-001: ✓/✗ <test name> (<N>/<M> behaviors)
- TC-002: ✓/✗ <test name> (<N>/<M> behaviors)
- ...

**Failing behaviors** (improvement opportunities):
- TC-003, behavior 2: <description of what's missing>
- ...

**Triggered anti-patterns**:
- TC-001, anti-pattern 1: <description>
- ...

**Log entry added to reflection-log.tsv**
```

### For improve mode:

```markdown
## Reflection Complete: <skill_name>

**Score**: <old_score> → <new_score> (<+/-delta>)
**Size**: <old_size> → <new_size> bytes (<+/-delta>)
**Status**: KEEP ✓ / DISCARD ✗

**Hypothesis tested**:
<brief description of what was changed>

**Test Results**:
- TC-001: ✓/✗ <test name> (<N>/<M> behaviors)
- TC-002: ✓/✗ <test name> (<N>/<M> behaviors)
- ...

**What changed**:
<diff summary — what lines were added/removed/modified in the skill>

**Next improvement opportunity**:
<the next-highest-priority hypothesis from Phase 3>

**Log entry added to reflection-log.tsv**
```

---

## Emergency Stop

If at ANY point during /reflect:
- The skill file becomes corrupted or unparseable
- Git state is broken (uncommitted changes you can't resolve)
- Score drops more than 30 points in a single experiment
- Two consecutive crashes occur

**STOP IMMEDIATELY. Do not attempt further fixes.**

Report to user:
```
⚠️ REFLECTION HALTED
Reason: <what happened>
Recovery: git checkout -- .claude/skills/<skill_name>/SKILL.md
Current branch: <branch name>
Last good commit: <hash>
```

---

## Quick Reference: What You Can and Cannot Do

| Action | Allowed? |
|--------|----------|
| Read evaluator.md | ✅ YES — read it every time |
| Edit evaluator.md | ❌ NO — NEVER during /reflect |
| Read test suite files | ✅ YES |
| Edit test suite files | ❌ NO — NEVER during /reflect |
| Read skill file | ✅ YES |
| Edit skill file | ✅ YES — this is what you improve |
| Append to reflection-log.tsv | ✅ YES — one row per evaluation |
| Edit/delete rows in reflection-log.tsv | ❌ NO — append only |
| Create git commits | ✅ YES — one per experiment |
| Create git branches | ✅ YES — `reflect/<skill>` only |
| Git reset on discard | ✅ YES — `git checkout -- <file>` |
| Install packages | ❌ NO |
| Modify other project files | ❌ NO — only the skill file |

---

## Example Full Run

Here's what a complete `/reflect angularComponentStructure --mode improve` looks like:

```
1. Read evaluator.md                          ← learn scoring rules
2. Read angularComponentStructure.tests.md    ← learn test cases
3. Read SKILL.md                              ← learn current skill
4. git checkout -b reflect/angularComponentStructure  ← create branch
5. Evaluate each test case with evidence      ← PHASE 2
6. Score: 80.0 (16/20 behaviors, 0 anti-patterns)
7. Log baseline to reflection-log.tsv
8. Identify weakness: TC-002 behavior 5 fails ← PHASE 3
   (no rule for .asReadonly() exposure)
9. Hypothesis: add ".asReadonly()" rule to Phase 2
10. git commit current state                  ← PHASE 4
11. Edit SKILL.md: add asReadonly rule
12. Re-evaluate: Score 85.0 (17/20 behaviors)
13. Delta: +5.0 points, +1 line
14. Decision: KEEP ✓                          ← PHASE 5
15. git commit with keep message
16. Log keep to reflection-log.tsv
17. Report to user                            ← PHASE 6
```
````

---

## Task 7: Verify all files and cross-reference paths

After creating all files, verify:

1. All files exist at their expected paths:
   - `.claude/reflect/evaluator.md`
   - `.claude/reflect/test-suite-template.md`
   - `.claude/reflect/reflection-log.tsv`
   - `.claude/reflect/test-suites/angularComponentStructure.tests.md`
   - `.claude/commands/reflect.md`

2. All skill path references use `.claude/skills/<name>/SKILL.md` convention
   (NOT `.claude/skills/<name>.md`)

3. The test suite's `skill_file` metadata points to the correct path

4. The evaluator's example paths are correct

5. The reflect command's file paths are correct

---

## Backend Impact — None

No persisted data, no collections, no server changes.
