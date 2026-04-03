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
