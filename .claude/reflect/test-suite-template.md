# Test Suite Template

> This file defines the FORMAT for skill test suites (v3.0).
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
- version: 3.0
- last_updated: YYYY-MM-DD

## Test Cases

### TC-001: <Descriptive Test Name>
**Prompt**: |
  <The exact user prompt to simulate — write it as if a real user typed it>

**Concrete Checks** (machine-verified by `test-runner.sh` — 40% of score weight):
- GREP: "<string>" — <what finding this string proves>
- GREP-NOT: "<string>" — <what absence of this string proves>
- SECTION: "## <heading>" COUNT >= N — skill must have at least N sections starting with this heading
- LINE-COUNT: <= N — skill file must be under N lines
- PATTERN: "<regex>" NEAR "<anchor>" DISTANCE N — <string> appears within N lines of <anchor>

**Agent-Evaluated Behaviors** (scored by evaluator agent — 30% of score weight):
- [ ] <Nuanced behavior that requires reading comprehension — specific and objectively verifiable>
- [ ] <Another behavior where grep would be insufficient — e.g. ordering, sequencing, emphasis>

**Behavior Checks** (behavioral execution — 30% of score weight, OPTIONAL):
- RUN_AGENT: "<test prompt>" → OUTPUT-GREP: "<expected in output>"
- RUN_AGENT: "<test prompt>" → OUTPUT-GREP-NOT: "<must NOT appear in output>"
- RUN_AGENT: "<test prompt>" → OUTPUT-GREP-BEFORE: "<A>" BEFORE "<B>"

**Anti-Patterns** (machine-verified by `test-runner.sh`):
- GREP-NOT: "<string>" — must not contain this pattern
- GREP-NOT: "<string>" — must not contain this pattern

### TC-002: <Next Test Name>
...
~~~

## Section Descriptions

### 1. Concrete Checks (REQUIRED — machine-verified)
Machine-checkable assertions about what the SKILL.md file contains. These are
run by `test-runner.sh` and produce reproducible results. Weight: 40% of score
(or 70% if no Behavior Checks exist in the suite).

### 2. Agent-Evaluated Behaviors (REQUIRED — evaluator agent)
Nuanced behaviors that require reading comprehension to assess. The blind
evaluator agent scores these using the Evidence Rule: every pass must cite
a specific line number from SKILL.md. Weight: 30% of score.

### 3. Behavior Checks (OPTIONAL — behavioral execution, unkammable)
The unkammable layer. A behavior runner agent is given SKILL.md as its
instructions and executes the test prompt. The output is machine-checked with
grep. This cannot be gamed by adding keywords to SKILL.md — the skill must
actually produce correct output when followed. Weight: 30% of score.

Not all TCs need Behavior Checks — add them to 3-4 TCs that test the most
important rules. If no Behavior Checks exist in the entire suite, their 30%
weight rolls up to the machine tier.

### 4. Anti-Patterns (REQUIRED — machine-verified)
Negative assertions. These are GREP-NOT checks that penalize bad patterns.
They are processed by `test-runner.sh` alongside Concrete Checks.

## Check Types (for Concrete Checks and Anti-Patterns)

| Type | Syntax | Passes when |
|------|--------|-------------|
| `GREP` | `GREP: "text"` | `text` found anywhere in SKILL.md (case-sensitive) |
| `GREP-NOT` | `GREP-NOT: "text"` | `text` NOT found anywhere in SKILL.md |
| `SECTION` | `SECTION: "## Heading" COUNT >= N` | Skill has >=N lines starting with `## Heading` |
| `LINE-COUNT` | `LINE-COUNT: <= N` | Skill file has <=N lines total |
| `PATTERN` | `PATTERN: "regex" NEAR "anchor" DISTANCE N` | `regex` appears within N lines of `anchor` |

All check strings are treated as literal substrings (not regex) unless the `PATTERN` type is used.

## Behavior Check Types (for Behavior Checks)

| Type | Syntax | Passes when |
|------|--------|-------------|
| `OUTPUT-GREP` | `→ OUTPUT-GREP: "text"` | `text` found in agent output |
| `OUTPUT-GREP-NOT` | `→ OUTPUT-GREP-NOT: "text"` | `text` NOT found in agent output |
| `OUTPUT-GREP-BEFORE` | `→ OUTPUT-GREP-BEFORE: "A" BEFORE "B"` | `A` appears before `B` in agent output |

## Scoring Rules

Three-tier scoring system:

### Layer 1: Machine GREP Score (40% weight)
Produced by running `test-runner.sh`. Machine-verified. Reproducible.

```
total_machine_checks = total GREP + GREP-NOT + SECTION + LINE-COUNT + PATTERN checks
exec_score = (checks_passed / total_machine_checks) * 40
```

If no Behavior Checks exist in the suite: `exec_score = (checks_passed / total_machine_checks) * 70`

### Layer 2: Behavioral Execution Score (30% weight)
Produced by the behavior runner agent executing the skill on real prompts.

```
behavior_score = (behavior_checks_passed / total_behavior_checks) * 30
```

If no Behavior Checks exist: `behavior_score = 0` (weight rolls to Layer 1).

### Layer 3: Agent Qualitative Score (30% weight)
Produced by the evaluator agent (blind — no knowledge of what changed or why).
Applies the Evidence Rule: every Agent-Evaluated Behavior must cite a specific
line number from SKILL.md. No citation = not passed.

```
agent_score = (agent_behaviors_passed / total_agent_behaviors) * 30
```

### Final Score
```
final_score = exec_score + behavior_score + agent_score
```

Range: 0-100. A skill scoring 100 has passed all machine checks, all behavioral
execution checks, AND all agent-evaluated behaviors.

## Legacy Format (v1.0 — DEPRECATED)

v1.0 test suites used `**Expected Behaviors**` sections with only agent-evaluated
checkboxes. These are no longer supported. Migrate to v2.0+ format by converting
grep-able behaviors to Concrete Checks.

## Test Case Guidelines

1. **Minimum 3 test cases per skill**, recommended 5
2. **Coverage types**:
   - Typical successful use case (the happy path)
   - Another common use case (different angle)
   - Edge case or complex scenario
   - Trigger boundary: prompt that should NOT activate the skill
   - Trigger boundary: prompt that SHOULD activate (near the boundary)
3. **Prompts must be realistic** — write them as a real user would type them
4. **Concrete Checks must be literal** — the string must appear (or not) in the skill file exactly
5. **Agent-Evaluated Behaviors** are for nuanced behaviors requiring reading comprehension:
   - Ordering/sequencing ("sections appear in this order")
   - Emphasis ("the rule is specific enough that a developer would choose X over Y")
   - Pedagogical clarity ("the instructions guide toward the right solution")
6. **Behavior Checks** are for unkammable execution validation:
   - Add to 3-4 TCs that test the most critical skill rules
   - Focus on ordering, property placement, and pattern enforcement
   - Keep prompts simple — the agent should produce a clear artifact
7. **Anti-Patterns** should always be GREP-NOT machine checks — if it can be grepped, it should be
8. **60% target**: at least 60% of all checks (Concrete + Anti-Patterns) should be machine-verifiable.
   Trigger-boundary TCs are exempt from this target since trigger activation is inherently interpretive.
9. **Reference skill rules** — each behavior should trace back to a specific rule in SKILL.md
