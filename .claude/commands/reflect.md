---
description: Autonomous self-improvement loop for Claude Code skills
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# /reflect

Autonomous self-improvement system for Claude Code skills.
Inspired by Karpathy's autoresearch pattern.

**Two paths — pick one based on what you type:**

| What you type | What happens |
|---------------|-------------|
| `/reflect` | **Session Retrospective** — scans this session, finds skills used, reports improvement opportunities |
| `/reflect cssLayer` | **Skill Improvement** — runs until convergence (default budget = unlimited) |
| `/reflect cssLayer 3` | **Skill Improvement** — runs exactly 3 improvement iterations |
| `/reflect cssLayer --mode baseline` | **Baseline only** — scores the skill, reports gaps, changes nothing |

---

## Usage

```
/reflect                              # Path 1: Session Retrospective
/reflect <skill-name> [budget]        # Path 2: Skill Improvement
/reflect <skill-name> --mode baseline # Path 2: Score only (no changes)
```

**Path 1 — Session Retrospective** (`/reflect` with no arguments):
- Detects which skills were used during this session by examining git diff
- For each detected skill, evaluates it against its test suite
- Reports gaps and improvement opportunities
- Does NOT make changes — report only (for now)
- You decide whether to run Path 2 afterward

**Path 2 — Skill Improvement** (`/reflect <skill-name> [budget]`):
- `budget` is an optional positive integer after the skill name
- If no budget given → runs until convergence (stops at score=100, 3 consecutive discards, or 10-iteration safety cap)
- If budget given → runs exactly that many improvement iterations, then stops
- `--mode baseline` → measure and report only, no changes

---

## Files You Will Work With

```
THESE FILES ARE READ-ONLY — never edit them during /reflect:
├── .claude/reflect/evaluator.md                    # Scoring rules — READ FIRST
├── .claude/reflect/evaluator-agent-prompt.md       # Blind evaluator agent system prompt — READ-ONLY
├── .claude/reflect/behavior-runner-prompt.md       # Behavior executor agent system prompt — READ-ONLY
├── .claude/reflect/reflect-runner-prompt.md        # Background loop agent system prompt — READ-ONLY
├── .claude/reflect/test-runner.sh                  # Executable machine scorer — IMMUTABLE
├── .claude/reflect/test-suites/<skill>.tests.md    # Test cases — the "dataset"

THIS IS THE ONLY FILE YOU MAY EDIT — like train.py in Karpathy's system:
├── .claude/skills/<skill>/SKILL.md                 # The skill being improved

THIS FILE IS APPEND-ONLY — add one row per evaluation, never edit old rows:
├── .claude/reflect/reflection-log.tsv              # Experiment history (not committed)

THESE FILES ARE WRITTEN each evaluation run (auto mode only):
├── .claude/reflect/evidence/<skill>-<date>.evidence.md   # Per-behavior audit trail
├── .claude/reflect/coverage/<skill>.coverage.md          # Rule → test coverage map
├── .claude/reflect/test-quality-log.md                   # Weak/strong pattern log (PHASE 6 only, append-only)
```

**Why this constraint?** If you could edit the test suite or evaluator during a loop,
you could make the score go up without actually improving the skill — like a student
changing the answer key. The constraint is what makes the metric trustworthy.

---

# PATH 1: Session Retrospective

> **When to use:** `/reflect` with NO arguments.
> **Purpose:** Learn from real usage. Find skills that were active this session and
> evaluate whether they performed well — surfacing real gaps that synthetic test
> cases might miss.
> **Mode:** Report only. Does NOT edit any skill files.

## Step R1: Detect skills used this session

Run `git diff main...HEAD --name-only` to see which files were modified.

Map file changes to skills using these trigger rules:

| Files changed | Skill triggered |
|---------------|-----------------|
| `*.scss`, `*.css` | `cssLayer` |
| `*.component.ts` (created or refactored) | `angularComponentStructure` |
| `*.pipe.ts`, `*.directive.ts` | `angular-pipe-logic` |
| Recipe/dish data files | `add-recipe` |
| Auth/crypto files | `auth-crypto` |

Read `.claude/skills/*/SKILL.md` trigger lines to confirm — the trigger line in
each skill is the ground truth for whether it should have activated.

If NO skills were detected → tell the user:
```
No skill-triggering file changes found in this session.
Try: /reflect <skill-name> to evaluate a specific skill directly.
```

## Step R2: For each detected skill — check test suite exists

For each detected skill, check if `.claude/reflect/test-suites/<skill>.tests.md` exists.

- If it exists → proceed to evaluation
- If it does NOT exist → note it in the report as "no test suite — cannot evaluate"

## Step R3: Evaluate each detected skill

For each skill that has a test suite:

1. Read the evaluator (`.claude/reflect/evaluator.md`) — once, at the start
2. Read the test suite
3. Read the skill file
4. Run the full PHASE 2 evaluation (see Path 2 below) — with the Evidence Rule
5. Record the score

Do NOT make changes. Do NOT enter improvement loop. Just score.

## Step R4: Session Context Analysis

For each detected skill, examine the actual code that was written this session:

1. Run `git diff main...HEAD -- <files-that-triggered-this-skill>` to see what was written
2. Compare the actual code against the skill's rules:
   - Did the code follow the Five-Group Rhythm? (for cssLayer)
   - Did the component use the correct section ordering? (for angularComponentStructure)
   - Were there any patterns in the real code that the skill has no rule for?
3. Note any **session-specific gaps**: things the agent actually did (or failed to do)
   that the test suite doesn't cover

## Step R5: Session Retrospective Report

Output this report — the ONLY output the user sees:

```markdown
## Session Retrospective

**Skills detected**: <N> skills used this session
**Skills evaluated**: <N> (with test suites)
**Skills without test suites**: <list or "none">

### Skill: <skill_name>
**Score**: <skill_score> / 100
**Files touched**: <list of files that triggered this skill>

**Test Results**:
| TC | Name | Behaviors | Anti-patterns | Passed? |
|----|------|-----------|---------------|---------|
| TC-001 | <name> | N/M | 0/M | ✓/✗ |
...

**Session-specific findings** (from real code written this session):
- <observation about how the skill performed on actual code>
- <pattern in real code that the test suite doesn't cover>
- <gap between what the skill says and what was actually done>

**Recommendation**:
- Run `/reflect <skill_name> 3` to fix <N> gaps found
- Consider adding a TC for: <specific real-world scenario found>

### Skill: <next_skill_name>
...

**Log entries added**: reflection-log.tsv
```

---

# PATH 2: Skill Improvement

> **When to use:** `/reflect <skill-name>` or `/reflect <skill-name> <budget>`
> **Purpose:** Evaluate a specific skill and improve it through autonomous iteration.
> **The loop runs itself. You do not need to drive it.**

---

## PHASE 0: Background Dispatch (runs before everything else in Path 2)

When the user types `/reflect <skill-name> [budget]` in the main session:

1. Read `.claude/reflect/reflect-runner-prompt.md`
2. Spawn a background agent via the Agent tool:
   - prompt: "Read .claude/reflect/reflect-runner-prompt.md for your instructions. Then run /reflect for skill=<skill_name>, budget=<budget>, repo_root=<current working directory>"
   - run_in_background: true
   - subagent_type: general-purpose
3. Tell the user: "Reflect loop running in background for <skill_name>. You'll be notified when it completes."
4. STOP — do not execute Phases 1-5 inline. The background agent handles everything.

**Exception -- baseline mode only:**
If `--mode baseline` was passed, run Phase 2 inline (score + report only, no loop, minimal context impact). Do not spawn a background agent for baseline mode.

**Why background dispatch?** The /reflect loop runs multiple iterations, each consuming significant context (read skill, run test-runner, spawn evaluator agent, hypothesize, edit, re-evaluate). After 5 iterations the session context is polluted. A background agent runs its full conversation in its own context — the main session receives ONE summary message.

**Why no worktree?** /reflect only writes to one file (SKILL.md). The background agent commits to the current `reflect/<skill>` branch. No isolated copy of the full repo is needed.

---

## PHASE 1: Setup (always runs first, once)

### Step 1.1: Parse inputs

Read the command the user typed. Extract:
- `skill_name`: the first argument (e.g., `angularComponentStructure`)
- `budget`: the second argument if it's a number (e.g., `3`). If absent → `unlimited`
- `mode`: `baseline` if `--mode baseline` was passed, otherwise `auto`

**Examples:**
```
/reflect cssLayer          → skill=cssLayer, budget=unlimited, mode=auto
/reflect cssLayer 3        → skill=cssLayer, budget=3, mode=auto
/reflect cssLayer --mode baseline → skill=cssLayer, budget=N/A, mode=baseline
```

### Step 1.2: Validate files exist

Check that these two files exist before doing anything else:

```
.claude/reflect/test-suites/<skill_name>.tests.md
.claude/skills/<skill_name>/SKILL.md
```

If the test suite file does NOT exist → STOP immediately. Tell the user:
```
No test suite found for "<skill_name>".
Expected: .claude/reflect/test-suites/<skill_name>.tests.md
Create a test suite first using the template at .claude/reflect/test-suite-template.md
```

If the skill file does NOT exist → STOP. Tell the user.

### Step 1.3: Read all three input files (in this order)

1. **Read `.claude/reflect/evaluator.md`** — this defines HOW you score.
   Read it fully. The Evidence Rule is especially important: you must cite a
   specific line number and quote from SKILL.md for every behavior you mark as passed.

2. **Read `.claude/reflect/test-suites/<skill_name>.tests.md`** — these are your
   test cases. Count: how many TCs? How many Expected Behaviors total? How many
   Anti-Patterns total? Write these numbers down — you need them for scoring.

3. **Read `.claude/skills/<skill_name>/SKILL.md`** — this is what you're scoring.
   Note the trigger line, all rules, all phases.

### Step 1.4: Git setup (auto mode only — skip for baseline)

```bash
git branch --show-current
```

If not already on `reflect/<skill_name>` branch:
```bash
git checkout -b reflect/<skill_name>
```
If already on it, stay on it — you're continuing previous work.

Record the current commit:
```bash
git rev-parse --short HEAD
```
This is your revert point. Save it.

---

## PHASE 2: Evaluate (runs at the start of EVERY loop iteration)

This is the core scoring logic. Run it fully every time — do not skip or carry
over results from a previous iteration. The skill may have changed.

**Two-agent architecture (GAP 1 fix):** The machine score (70%) comes from
running `test-runner.sh`. The agent score (30%) comes from a SEPARATE evaluator
agent spawned via the Agent tool — it has no knowledge of what changed or why.
You (the researcher) only see the final numbers, not the evaluator's reasoning.

### Step 2.1: Run test-runner.sh → exec_score

```bash
bash .claude/reflect/test-runner.sh \
  .claude/skills/<skill_name>/SKILL.md \
  .claude/reflect/test-suites/<skill_name>.tests.md
```

**F. Accumulate evidence in memory (written to file in Step 2.4b):**

For each behavior, record:
```
[TC-XXX B<N>] STATUS: PASS | EVIDENCE: SKILL.md line NN: "<exact quote>" | REASONING: <causal chain>
[TC-XXX B<N>] STATUS: FAIL | EVIDENCE: No rule in SKILL.md addresses this behavior
```
For each anti-pattern, record:
```
[TC-XXX AP<N>] STATUS: TRIGGERED | EVIDENCE: <rule that would prevent this is absent>
[TC-XXX AP<N>] STATUS: CLEAR | EVIDENCE: SKILL.md line NN: "<rule that prevents it>"
```

**Three-tier weight adjustment:**
- If the test suite has `**Behavior Checks**` sections: `exec_score = (raw_score / 70) * 40`
- If the test suite has NO Behavior Checks: `exec_score = raw_score` (stays 0–70)

### Step 2.1B: Run behavior checks → behavior_score (if Behavior Checks exist)

Check if the test suite contains any `**Behavior Checks**` sections. If yes:

1. Read `.claude/reflect/behavior-runner-prompt.md`
2. For each `RUN_AGENT:` line in the test suite:
   a. Spawn a behavior runner agent via the Agent tool:
      - System prompt: behavior-runner-prompt.md contents
      - Input: SKILL.md as instructions + the test prompt from the RUN_AGENT line
   b. Capture the agent's output
   c. Run the OUTPUT-GREP / OUTPUT-GREP-NOT / OUTPUT-GREP-BEFORE checks against the output
3. Calculate: `behavior_score = (behavior_checks_passed / total_behavior_checks) * 30`

If no Behavior Checks exist → `behavior_score = 0` (weight rolled into exec_score).

### Step 2.2: Spawn evaluator agent → agent_score

Spawn a fresh agent using the Agent tool with these inputs:

**Prompt to the evaluator agent:**
```
Read this file for your system prompt and follow it exactly:
.claude/reflect/evaluator-agent-prompt.md

You receive:
- Skill file: .claude/skills/<skill_name>/SKILL.md
- Test suite: .claude/reflect/test-suites/<skill_name>.tests.md
- Evaluator rules: .claude/reflect/evaluator.md
- exec_score: <exec_score from Step 2.1>
- behavior_score: <behavior_score from Step 2.1B> (0.0 if no Behavior Checks)

Output ONLY the EVALUATION RESULTS block.
```

The evaluator agent has access to: Read, Grep.
The evaluator agent does NOT have access to: Bash (no git commands), Write, Edit.

Wait for the agent to return. Parse the `agent_score:` and `final_score:` lines
from its EVALUATION RESULTS block.

### Step 2.3: Combine → final_score

```
final_score = exec_score + behavior_score + agent_score
```

Round to one decimal place. Record all three components — you need them for the log.

### Step 2.4: Collect secondary metrics

```bash
wc -c .claude/skills/<skill_name>/SKILL.md    # file size in bytes
git rev-parse --short HEAD                     # current commit hash
```

### Step 2.5: Log this evaluation to reflection-log.tsv

> **Schema note:** Rows written before 2026-04-04 use the old 8-column schema
> (date, skill, commit, skill_score, size_bytes, status, hypothesis, notes).
> New rows use the 9-column schema below. Do not modify old rows.

Append one tab-separated row:
```
<YYYY-MM-DD>\t<skill_name>\t<commit>\t<final_score>\t<exec_score>\t<behavior_score>\t<agent_score>\t<size_bytes>\t<status>\t<hypothesis>
```

For the first evaluation of a session: `status = baseline`, `hypothesis = initial`
For re-evaluations inside the loop: `status = re-eval`, `hypothesis = <what was just tried>`

### Step 2.4b: Write evidence file (auto mode only — skip for baseline)

Write all accumulated evidence (from Step 2.1F) to:
`.claude/reflect/evidence/<skill_name>-<YYYY-MM-DD>.evidence.md`

```markdown
# Evidence Log: <skill_name> — <YYYY-MM-DD>
Skill commit: <hash> | Score: <skill_score>

## TC-XXX: <Name>
### B<N> — <behavior text>
- STATUS: PASS
- EVIDENCE: SKILL.md line NN: "<exact quoted text>"
- REASONING: <why this line produces the behavior>

### B<N> — <behavior text>
- STATUS: FAIL
- EVIDENCE: No rule in SKILL.md addresses this behavior
- IMPACT: -1 behavior point

### AP<N> — <anti-pattern text>
- STATUS: TRIGGERED (penalty)
- EVIDENCE: <what rule is missing that would prevent this>
- IMPACT: -1 anti-pattern penalty

### AP<N> — <anti-pattern text>
- STATUS: CLEAR
- EVIDENCE: SKILL.md line NN: "<rule that prevents this>"
```

If the file already exists for today → overwrite it (this run is the latest).

### Step 2.5: Check the stop condition

Write the evaluator agent's raw output to:
`.claude/reflect/evidence/<skill_name>-<YYYY-MM-DD>.evidence.md`

```markdown
# Evidence Log: <skill_name> — <YYYY-MM-DD>
Skill commit: <hash> | exec_score: <X> | agent_score: <X> | final_score: <X>

## Evaluator Agent Output
<paste the full EVALUATION RESULTS block returned by the evaluator agent>

## test-runner.sh Output
<paste the full output from Step 2.1>
```

If the file already exists for today → overwrite it (this run is the latest).

### Step 2.7: Check the stop condition

**If final_score = 100.0** → skill passes all machine checks and all agent behaviors.
Jump to PHASE 5: Final Report. Do NOT continue the loop.

**If final_score < 100.0 AND mode = baseline** → skip PHASE 3 and 4. Jump to PHASE 5.

**If final_score < 100.0 AND mode = auto** → show the estimate (first iteration only),
then continue to PHASE 3.

### Step 2.8: Show estimate (first iteration only)

On the FIRST evaluation of a run (not on re-evaluations), display this before
continuing to Phase 3:

```
Starting improvement loop for <skill_name>
exec_score: <X> / 70 | agent_score: <X> / 30 | final_score: <X> / 100
Gaps: <N failing agent behaviors> + <N failing machine checks>
Estimated iterations to convergence: <min>–<max>
Budget: <N iterations / unlimited> (stops at 3 consecutive discards or 10 iterations)

Running...
```

**How to estimate iterations:**
- Count the number of distinct gaps (failing behaviors + triggered anti-patterns that
  aren't already covered by a failing behavior fix)
- Minimum iterations = number of distinct root causes (some fixes resolve multiple gaps)
- Maximum iterations = total number of gaps (worst case: each needs its own fix)
- If many gaps share the same root cause (e.g., 3 anti-patterns all about unmapped
  properties), the minimum is lower

This estimate is informational — it does NOT affect the loop behavior.

---

## PHASE 3: Hypothesize (auto mode only — runs after every failed evaluation)

You now know exactly which behaviors failed and which anti-patterns triggered.
Your job is to identify ONE change to SKILL.md that will fix a weakness.

### Step 3.1: List all weaknesses found

Go through the evaluation results and list every gap:
- Which Expected Behaviors were unchecked? Which TC? Which behavior number?
- Which Anti-Patterns were triggered? Which TC? Which anti-pattern number?
- Any incorrect trigger responses?
- Is the skill longer or more complex than it needs to be?

### Step 3.2: Generate 1–3 hypotheses

For each weakness (up to 3), write a hypothesis:

```
Hypothesis: <short slug title, no spaces, e.g. add-no-any-rule>
Target:      <which section/line of SKILL.md to change>
Change:      <exactly what to add, remove, or reword>
Fixes:       <TC-XXX behavior N / anti-pattern N that this resolves>
Risk:        <which currently-passing tests could break — be honest>
Size impact: <+N or -N lines estimate>
```

### Step 3.3: Select ONE hypothesis to test

Priority order (match autoresearch — simplest wins first):
1. Fixes a triggered Anti-Pattern → removes a score penalty immediately
2. Fixes a failing Expected Behavior → adds a score point
3. Fixes a trigger accuracy error → structural correctness
4. Simplifies the skill without losing score → smaller = better when tied

Pick the SINGLE highest-priority hypothesis. Do not combine multiple changes into one
experiment — the whole point is to know exactly which change caused the result.

### Step 3.4: Check stop conditions before experimenting

Check ALL of these before proceeding to Phase 4:

1. **Budget exhausted?** If `iterations_completed >= budget` → jump to PHASE 5.
2. **Consecutive discards?** If `consecutive_discards >= 3` → jump to PHASE 5.
3. **Safety limit?** If `iterations_completed >= 10` → jump to PHASE 5.

If none triggered → continue to PHASE 4.

---

## PHASE 4: Experiment (auto mode only)

### Step 4.1: Apply the selected hypothesis

Edit `.claude/skills/<skill_name>/SKILL.md` with the minimum change needed.
Do NOT reorganize, reformat, or touch unrelated sections.
Change only what the hypothesis specifies.

### Step 4.2: Re-evaluate the modified skill (both layers)

Run the full PHASE 2 evaluation on the modified skill:

1. `bash test-runner.sh ...` → new `exec_score`
2. Run behavior checks (if Behavior Checks exist in suite) → new `behavior_score`
3. Spawn evaluator agent (blind — no knowledge of what changed) → new `agent_score`
4. `new_final_score = new_exec_score + new_behavior_score + new_agent_score`

You now have:
- `final_score_before`: the score from before this change
- `final_score_after`: the score from this re-evaluation
- `exec_score_before` / `exec_score_after`
- `behavior_score_before` / `behavior_score_after`
- `agent_score_before` / `agent_score_after`
- `size_before` / `size_after`: bytes

### Step 4.3: Apply the Keep or Discard rule

**KEEP if:**
- `final_score_after > final_score_before` (any improvement at all)
- OR `final_score_after == final_score_before` AND the skill is genuinely simpler
  (fewer lines, removed redundancy, clearer phrasing) — soft judgment, not a formula

**DISCARD if:**
- `final_score_after < final_score_before`
- OR `final_score_after == final_score_before` AND the skill is not simpler

**If KEEP:**
```bash
git add .claude/skills/<skill_name>/SKILL.md
git commit -m "[reflect] keep: <hypothesis-slug> (score <before> → <after>)"
```
Log to reflection-log.tsv: `status = keep`
Reset `consecutive_discards = 0`
Increment `iterations_completed += 1`

**If DISCARD:**
```bash
git checkout -- .claude/skills/<skill_name>/SKILL.md
```
Log to reflection-log.tsv: `status = discard`
Increment `consecutive_discards += 1`
Increment `iterations_completed += 1`

**If evaluation crashed (skill file broken):**
```bash
git checkout -- .claude/skills/<skill_name>/SKILL.md
```
Log: `status = crash`, `skill_score = 0`
Increment `consecutive_discards += 1`
Increment `iterations_completed += 1`
If consecutive_discards >= 2 → jump to emergency stop

### Step 4.4: Loop back to PHASE 2

After keep or discard, go back to PHASE 2 immediately.
DO NOT ask the user. DO NOT pause. DO NOT report intermediate results.
The loop continues autonomously until a stop condition is met.

**Stop conditions** (checked at Step 2.5 and Step 3.4):
- Score reached 100.0 → jump to Final Report
- Budget exhausted (`iterations_completed >= budget`) → jump to Final Report
- 3 consecutive discards → no more juice in current hypotheses → Final Report
- Safety limit: 10 loop iterations max → Final Report (prevents infinite loops)

---

## PHASE 6: Mutation Testing (runs after every KEEP decision)

> **When it runs**: Only after a KEEP in Step 4.3. Discard decisions skip this phase.
> **Purpose**: Verify that newly added rules are actually tested. If deleting a rule
> doesn't drop the score, no test catches it — meaning the "improvement" was a placebo.
> **This phase is OBSERVATIONAL only** — it does not affect KEEP/DISCARD decisions.

### Step 6.1: Identify newly added rules

Diff the just-committed skill against the previous commit:
```bash
git diff HEAD~1 HEAD -- .claude/skills/<skill_name>/SKILL.md
```

Extract each `+` line that represents a substantive rule (not blank lines, not headers,
not reformatting). These are your mutation targets.

If no substantive lines were added → skip PHASE 6, loop back to PHASE 2.

### Step 6.2: For each added rule — mutate and re-score

For each mutation target:

1. **Remove the rule** from SKILL.md in memory only (do NOT commit this change)
2. **Re-run PHASE 2 evaluation** on the mutated skill — full scoring pass
3. **Compare scores:**
   - `score_with_rule`: score from the last KEEP evaluation
   - `score_without_rule`: score from this mutation evaluation
   - `delta = score_with_rule - score_without_rule`
4. **Restore the rule** (undo the in-memory removal)
5. **Record:**
   - `delta > 0` → rule is DETECTED by tests ✓
   - `delta <= 0` → rule is NOT DETECTED — tests are too weak to catch this rule ✗

### Step 6.3: Calculate mutation_score

```
mutation_score = (detected_rules / total_mutation_targets) * 100
```

### Step 6.4: Log weak rules to test-quality-log.md

For every NOT DETECTED rule, append a row to `.claude/reflect/test-quality-log.md`
under "Weak Patterns":

```
| <YYYY-MM-DD> | <skill> | <rule text truncated to 60 chars> | <pattern-type> | NOT DETECTED — <which TC dimension is missing> |
```

**Pattern type** (your judgment):
- `broad-group-behavior` — test checks group assignment loosely, doesn't name the specific property
- `missing-dimension` — no TC covers this dimension of the skill at all
- `keyword-match` — test passed via surface wording, not presence of the specific rule

### Step 6.5: Loop back to PHASE 2

After mutation testing completes, loop back to PHASE 2.
The mutation_score is reported in the final output (PHASE 5) — it does not block looping.

---

## PHASE 5: Final Report (always runs last)

This is the ONLY output the user sees. Do not output anything before this
(except the estimate from Step 2.6 on the first iteration).

### For baseline mode:

```markdown
## Reflection Report: <skill_name>

**Mode**: baseline (read-only)
**Score**: <skill_score> / 100
**Size**: <bytes> bytes
**Commit**: <hash>

**Test Results**:
TC-001 ✓/✗ — N/M behaviors, 0/M anti-patterns
  ✓ B1: <behavior> → SKILL.md line NN: "<exact quote>"
  ✗ B2: <behavior> → No rule in SKILL.md covers this
  ⚠ AP1: <anti-pattern> → <why triggered — what rule is absent>
TC-002 ✓/✗ — N/M behaviors, 0/M anti-patterns
  ...

**Gaps found** (what would need to change to reach 100):
- TC-XXX, behavior N: <what's missing in the skill>
- TC-XXX, anti-pattern N: <what rule is absent>

**To improve**: run `/reflect <skill_name>` or `/reflect <skill_name> <budget>`

**Log entry added**: reflection-log.tsv
**Evidence log**: `.claude/reflect/evidence/<skill_name>-<YYYY-MM-DD>.evidence.md`
```

### For auto mode (loop completed):

```markdown
## Reflection Complete: <skill_name>

**Score**: <initial_score> → <final_score> (<+/-delta>)
**Size**: <initial_bytes> → <final_bytes> bytes
**Iterations**: <N> run (<N> kept, <N> discarded) | Budget: <N / unlimited>
**Stop reason**: <"score reached 100" / "budget exhausted" / "3 consecutive discards" / "safety limit">

**Improvements applied**:
| # | Hypothesis | Score Δ | Status |
|---|------------|---------|--------|
| 1 | <slug> | +X.X | KEEP ✓ |
| 2 | <slug> | 0.0 | DISCARD ✗ |
...

**Mutation Score**: <X>% (<N>/<M> added rules detected by tests) — from PHASE 6
**Undetected rules** (tests too weak to catch):
- "<rule text>" — pattern: <type> — TC dimension missing: <what to add>
(or: All added rules detected ✓)

**Final test results**:
TC-001 ✓/✗ — N/M behaviors, 0/M anti-patterns
  ✓ B1: <behavior> → SKILL.md line NN: "<exact quote>"
  ✗ B2: <behavior> → No rule in SKILL.md covers this
  ⚠ AP1: <anti-pattern> → <why triggered — what rule is absent>
TC-002 ✓/✗ — N/M behaviors, 0/M anti-patterns
  ...

**What changed in the skill** (summary of all kept edits):
- <brief description of each kept change>

**Remaining gaps** (if score < 100):
- TC-XXX, behavior N: <still failing — what rule is still missing>
- Run `/reflect <skill_name>` to continue improving

**Branch**: reflect/<skill_name>
**Log entries added**: reflection-log.tsv
**Evidence log**: `.claude/reflect/evidence/<skill_name>-<YYYY-MM-DD>.evidence.md`
**Coverage map**: `.claude/reflect/coverage/<skill_name>.coverage.md`
```

---

### Step 5.1: Generate coverage map (auto mode only)

After outputting the final report, generate or update:
`.claude/reflect/coverage/<skill_name>.coverage.md`

Build this from the evidence accumulated during PHASE 2 (Step 2.1F):

```markdown
# Coverage Map: <skill_name>
Generated: <YYYY-MM-DD> | Score: <skill_score> | Commit: <hash>

## SKILL.md Rules → Test Coverage
| Line | Rule (truncated to 60 chars) | Covered by | Status |
|------|------------------------------|------------|--------|
| 35 | Layout — display, flex, grid, position, gap, z-index | TC-003 B1 | ✓ |
| 36 | Dimensions — width, height, aspect-ratio | TC-003 B2 | ✓ |
| 38 | Structure — margin, padding, border | (none) | ✗ UNTESTED |

## Tests → SKILL.md Coverage
| TC | Behavior | SKILL.md line | Status |
|----|----------|---------------|--------|
| TC-001 B1 | Scans src/styles.scss before writing | line 23 | ✓ |
| TC-003 B4 | border-radius placed in Structure | (none) | ⚠ BROKEN TEST — no supporting rule |
```

**How to build it:**
- For each SKILL.md rule line: check if any PASS evidence from Step 2.1F cites it → ✓ if yes, ✗ UNTESTED if no
- For each TC behavior: check its evidence → ✓ if SKILL.md line found, ⚠ BROKEN TEST if FAIL (no line)
- Overwrite the file on each run — this is always the latest state

---

## Emergency Stop

If at ANY point:
- The skill file is corrupted and cannot be parsed
- Git state is unrecoverable
- Score drops more than 30 points in a single iteration
- 2 consecutive crashes occur

**STOP. Revert. Report.**

```bash
git checkout -- .claude/skills/<skill_name>/SKILL.md
```

Tell the user:
```
REFLECTION HALTED
Reason: <what happened>
Branch: reflect/<skill_name>
Last good commit: <hash>
Recovery: git checkout -- .claude/skills/<skill_name>/SKILL.md
```

---

## Quick Reference

| Action | Allowed? |
|--------|----------|
| Read evaluator.md | YES — read once at start |
| Edit evaluator.md | NO — NEVER |
| Read evaluator-agent-prompt.md | YES — read once at start |
| Edit evaluator-agent-prompt.md | NO — NEVER |
| Read behavior-runner-prompt.md | YES — read once at start |
| Edit behavior-runner-prompt.md | NO — NEVER |
| Spawn behavior runner agent via Agent tool | YES — Step 2.1B (skill executor) |
| Read reflect-runner-prompt.md | YES — Phase 0 |
| Edit reflect-runner-prompt.md | NO — NEVER |
| Spawn reflect runner agent via Agent tool | YES — Phase 0 (background loop) |
| Run test-runner.sh | YES — Step 2.1 and Step 4.2 |
| Edit test-runner.sh | NO — IMMUTABLE |
| Read test suite | YES |
| Edit test suite | NO — NEVER |
| Read skill file | YES |
| Edit skill file | YES — only this (Path 2 only) |
| Spawn evaluator agent via Agent tool | YES — Step 2.2 and Step 4.2 (blind agent) |
| Give evaluator agent git access | NO — NEVER |
| Give evaluator agent hypothesis context | NO — NEVER |
| Append to reflection-log.tsv | YES — one row per evaluation |
| Edit existing log rows | NO — append only |
| Create git commits | YES (Path 2 only) |
| Create/use `reflect/<skill>` branch | YES (Path 2 only) |
| `git checkout -- <skill>` on discard | YES |
| Pause to ask user during loop | NO — only stop on emergency |
| Write .claude/reflect/evidence/ files | YES — one file per evaluation run (auto mode) |
| Write .claude/reflect/coverage/ files | YES — updated in PHASE 5 (auto mode) |
| Append to test-quality-log.md | YES — PHASE 6 only, weak-pattern entries |
| Modify other project files | NO |

---

## Examples

### Example 1: Session Retrospective

```
User types: /reflect

PHASE: Detect skills used
  git diff main...HEAD --name-only
  → sidebar.component.scss (modified)
  → recipe-card.component.ts (created)
  Skills detected: cssLayer, angularComponentStructure

PHASE: Evaluate each skill
  cssLayer: score = 90.9 / 100 (1 gap in TC-003)
  angularComponentStructure: score = 100.0 / 100 (all passing)

PHASE: Session Context Analysis
  sidebar.component.scss: uses gap, z-index, animation — all correctly
  grouped per Five-Group Rhythm ✓
  recipe-card.component.ts: uses inject(), OnPush, signal() — all correct ✓
  No session-specific gaps found beyond existing test suite coverage.

OUTPUT: Session Retrospective Report
  [report to user with scores and recommendations]
```

### Example 2: Skill Improvement with budget

```
User types: /reflect cssLayer 2

PHASE 1: Setup
  skill_name = cssLayer, budget = 2, mode = auto
  Files verified ✓
  Read evaluator.md, test suite (5 TCs, 22 behaviors), SKILL.md
  git checkout -b reflect/cssLayer

LOOP ITERATION 1
  PHASE 2: Evaluate
    Step 2.1: bash test-runner.sh → exec_score = 47.7 (out of 70)
    Step 2.2: Spawn evaluator agent (blind) → agent_score = 20.5 (out of 30)
    Step 2.3: final_score = 68.2
    Estimate: 3 machine gaps + 1 agent gap, ~2-3 iterations
    Budget: 2 iterations

  PHASE 3: Hypothesize → expand-layout-group
  PHASE 4: Experiment
    test-runner.sh → exec_score 47.7 → 57.2
    evaluator agent → agent_score 20.5 → 24.6
    final_score 68.2 → 81.8, KEEP ✓
    iterations_completed = 1, budget = 2 → continue

LOOP ITERATION 2
  PHASE 2: Evaluate → final_score = 81.8 (exec=57.2, agent=24.6)
  PHASE 3: Hypothesize → expand-effects-add-animation
  PHASE 4: Experiment → final_score 81.8 → 90.9, KEEP ✓
    iterations_completed = 2, budget = 2 → STOP (budget exhausted)

PHASE 5: Final Report
  Score: 68.2 → 90.9 (+22.7)
  Iterations: 2 (2 kept, 0 discarded) | Budget: 2
  Stop reason: budget exhausted
```

### Example 3: Unlimited convergence

```
User types: /reflect angularComponentStructure

PHASE 1: Setup
  skill_name = angularComponentStructure, budget = unlimited, mode = auto

LOOP ITERATION 1
  PHASE 2: Evaluate → 95.5
  Estimate: 1 gap, ~1 iteration
  PHASE 3-4: add-no-any-rule → 95.5 → 100.0, KEEP ✓

LOOP ITERATION 2
  PHASE 2: Evaluate → 100.0
  STOP: score reached 100

PHASE 5: Final Report
  Score: 95.5 → 100.0 (+4.5)
  Budget: unlimited
  Stop reason: score reached 100
```
