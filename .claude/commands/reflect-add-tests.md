---
description: Human-guided test suite builder for /reflect skills
allowed-tools: Read, Write, Edit, Bash
---

# /reflect add-tests

Human-in-the-loop test creation for Claude Code skills.
Produces test suites that are diverse, objectively verifiable, and anchored to real usage.

## Usage

```
/reflect add-tests <skill-name> <budget>
```

- `skill-name`: folder name under `.claude/skills/` (e.g., `cssLayer`)
- `budget`: total tests to add. Minimum: 2. Tests are generated in **batches of 10**.

### Batching Rule

Tests are grouped into batches of up to 10. Each batch starts with **1 human-validated seed** (negotiated with the user) followed by up to 9 agent-derived tests. When a batch completes and budget remains, the agent returns to the user for the next seed.

```
Batch size  = 10
Seeds       = ceil(budget / 10)
Derived     = budget - seeds
```

**Examples:**
- `/reflect add-tests cssLayer 5`  → 1 batch: 1 seed + 4 derived (TC-006–TC-010)
- `/reflect add-tests cssLayer 10` → 1 batch: 1 seed + 9 derived (TC-006–TC-015)
- `/reflect add-tests cssLayer 15` → 2 batches: seed+9 → pause → seed+4
- `/reflect add-tests cssLayer 25` → 3 batches: seed+9 → seed+9 → seed+4

---

## Files

```
READ (understand the skill and existing coverage):
├── .claude/skills/<skill>/SKILL.md
├── .claude/reflect/test-suites/<skill>.tests.md    # may not exist yet — create if absent
├── .claude/reflect/test-quality-log.md             # if exists — skip gracefully if not

WRITE (append tests to suite):
├── .claude/reflect/test-suites/<skill>.tests.md
```

---

## PHASE 0: Seed Negotiation

> **Goal**: Produce one human-validated test case that anchors the batch.
> **The agent proposes the seed — the user iterates and approves.**
> **This phase runs once per batch** — for a budget of 15 it runs twice (once at tests 1–10, once at tests 11–15).

### Step 0.0: Compute and announce the batch plan (first batch only)

On the very first run (batch 1), before proposing anything, announce:

```
Budget: <N> tests → <ceil(N/10)> batch(es)
  Batch 1: 1 seed + <min(9, N-1)> derived  (TC-XXX – TC-YYY)
  Batch 2: 1 seed + <min(9, N-11)> derived (TC-ZZZ – TC-WWW)   ← only if budget > 10
  ...

Starting Batch 1 now — let's build the seed together.
```

On subsequent batches, announce only:
```
Batch <N> of <total> — budget remaining: <R> tests
Let's build the next seed together.
```

### Step 0.1: Read all relevant files

1. Read `.claude/skills/<skill>/SKILL.md` — note: trigger rules, all phases, all rule categories, explicit property/naming lists
2. Read `.claude/reflect/test-suites/<skill>.tests.md` — if it exists, understand what's already covered; note highest TC number for later
3. Read `.claude/reflect/test-quality-log.md` — if it exists, note weak patterns to avoid; if missing, skip gracefully

### Step 0.2: Propose a seed test

Based on what you read, propose ONE test case using the standard format:

```markdown
### TC-XXX: <Name>
**Prompt**: |
  <The exact user prompt to simulate>

**Expected Behaviors**:
- [ ] <Specific, objectively verifiable behavior 1>
- [ ] <Specific, objectively verifiable behavior 2>
- [ ] <Specific, objectively verifiable behavior 3>

**Anti-Patterns** (should NOT happen):
- [ ] <Specific failure mode 1>
- [ ] <Specific failure mode 2>
```

**Seed quality rules:**
- Each behavior must be objectively verifiable: name specific properties, exact values, concrete outputs — NOT "feels correct" or "output is better"
- Anti-patterns must name the WRONG behavior specifically (not restate a behavior in negative form)
- If test-quality-log.md has weak patterns for this skill → steer seed AWAY from those patterns
- Bias toward behaviors that require a SPECIFIC SKILL.md rule to pass — not general coding knowledge

Present with this framing:
```
Here is my proposed seed test for <skill>:

[seed test]

Does this capture a real scenario you care about?
Iterate with me until you're happy — then say "use this seed" to confirm.
```

### Step 0.3: Iterate with user

Respond to feedback, refine the seed. Do NOT lock it in until the user explicitly confirms.
Confirmation: user says "use this seed", "approved", "looks good", or similar.

### Step 0.4: Validate the confirmed seed

Before proceeding, check 3 criteria:

**1. Objectively verifiable?**
Each behavior must have a clear yes/no answer. No subjective judgments.
- FAIL: "skill feels cleaner", "output is better structured"
- PASS: "places `gap` in Group 1 (Layout) not Group 4 (Structure)", "creates `standalone: true`"

**2. In scope?**
Each behavior must map to something the SKILL.md file actually controls.
- FAIL: "writes TypeScript with no bugs" (not a skill rule)
- PASS: "scans `src/styles.scss` before writing new styles" (explicit SKILL.md rule)

**3. Resistant to false passes?**
Could a poorly-performing skill pass this via surface-level pattern matching?
- FAIL: "uses signal()" — skill just says "use signals" without specifics; easy to satisfy
- PASS: "places `gap` in Group 1 with a wrong-group anti-pattern" — requires knowing the rule

If any criterion fails → tell the user what's wrong and return to Step 0.2.
If all pass → confirm:
```
Seed validated ✓ — objectively verifiable, in scope, resistant to gaming.
Moving to orthogonality mapping.
```

---

## PHASE 1: Orthogonality Mapping

> **Goal**: Plan the remaining tests in THIS BATCH so each covers a DIFFERENT dimension.
> Batch size = min(10, remaining_budget). Remaining slots = batch_size − 1 (the seed takes slot 1).
> User approves the map before any tests are written.

### Step 1.1: Map skill dimensions

Read SKILL.md and list all testable dimensions — distinct aspects that can be evaluated independently.

Common dimension types to look for:
- **Trigger accuracy** — does the skill activate for right prompts and NOT for wrong ones?
- **Phase [N] behavior** — does the skill follow a specific phase's rules correctly?
- **Rule category [X]** — does the skill enforce a specific named rule?
- **Ambiguous/edge case** — does the skill handle ambiguous or unusual inputs?
- **Anti-pattern prevention** — does the skill block a specific known-bad pattern?

### Step 1.2: Identify which dimension the seed covers

State explicitly:
```
The seed covers: [dimension name] — specifically [the exact aspect tested]
```

### Step 1.3: Present remaining dimensions as a menu

List all uncovered dimensions with a suggested test allocation for **this batch's remaining slots** (batch_size − 1):

```
Seed covers: Group placement (ambiguous layout properties)
This batch: <batch_size> tests total — <batch_size - 1> slots remaining for derived tests

Dimensions I can cover in this batch:
  A. Trigger accuracy — when skill activates vs. doesn't (suggested: 1 test)
  B. Phase 3 abstraction — .c-* engine class across 3+ components (suggested: 1 test)
  C. Component file violation — detecting and moving .c-* out of components (suggested: 1 test)
  D. Ambiguous property classification — different non-obvious properties (suggested: 2 tests)
  E. Logical properties — enforcement of margin-inline vs. margin-left (suggested: 1 test)

Which dimensions? Accept this allocation, adjust counts, or exclude any.
```

Note: if budget spans multiple batches, dimensions deferred to later batches will get their own seeds then.

### Step 1.4: User confirms the framing

User selects/adjusts dimensions. Once confirmed, echo back:
```
Orthogonality map confirmed:
  Seed: [dimension] (TC-XXX — already validated)
  TC-[N+1]: [dimension] (N tests)
  TC-[N+2]: [dimension] (N tests)
  ...

Writing tests now...
```

Do NOT write tests before user confirms the map.

---

## PHASE 2: Batch Generation

> **Goal**: Write all derived tests and measure the expanded suite's baseline score.

### Step 2.1: Determine TC numbering

If `.claude/reflect/test-suites/<skill>.tests.md` exists:
- Find the highest TC number from Step 0.1 (e.g., TC-005)
- New tests start at TC-006

If the file does NOT exist:
- Seed is TC-001, derived tests start at TC-002
- Create the file with this header:
  ```markdown
  # <Skill Name> Test Suite

  ## Metadata
  - skill_file: .claude/skills/<skill>/SKILL.md
  - version: 1.0
  - last_updated: <YYYY-MM-DD>

  ## Test Cases
  ```

### Step 2.2: Append the confirmed seed

Add the seed to the test suite with a provenance comment directly above it:
```markdown
<!-- source: human-validated seed | dimension: <dimension name> -->
### TC-XXX: <Name>
...
```

### Step 2.3: Write derived tests

For each dimension in the confirmed orthogonality map, write one test per allocated slot.

**Each derived test must:**
- Target its assigned dimension specifically — do not drift into another dimension
- Meet the same quality standards as the seed (objective behaviors, specific anti-patterns)
- Include a provenance comment: `<!-- source: agent-derived | dimension: <dimension> -->`
- Follow the standard test format exactly

**Strong test patterns:**
- Name specific properties, values, or file names — not general descriptions
- Include at least one anti-pattern naming the exact WRONG behavior the test is designed to catch
- For trigger tests: the prompt should unambiguously either trigger or not trigger the skill

**Weak patterns to avoid** (from test-quality-log.md if present):
- Broad group-placement behaviors that don't name the specific property
- Behaviors that pass via keyword matching in the skill description
- Anti-patterns that are just negations of behaviors (not distinct failure modes)

### Step 2.4: Run baseline to measure impact

After appending all tests, run:
```
/reflect <skill> --mode baseline
```

This scores the existing SKILL.md against the expanded test suite. The score will likely drop — that is expected and correct. It means new tests are revealing gaps.

### Step 2.5: Batch report + continue or finish

After writing tests and running baseline, output the batch report:

```markdown
## Batch <N> of <total> complete — <skill>

**Tests added this batch**: <batch_size> (1 seed + <batch_size-1> derived)
**Running total**: <tests_added_so_far> / <budget> tests added

**Dimensions covered this batch**:
| TC | Dimension | Source | Behaviors | Anti-patterns |
|----|-----------|--------|-----------|---------------|
| TC-XXX | <dimension> | Human seed | N | N |
| TC-XXX | <dimension> | Agent-derived | N | N |

**Suite baseline after batch**:
Score: <X> / 100 (was <Y> / 100 before this batch — drop is expected and correct)
```

Then check remaining budget:

**If remaining_budget = 0** (all batches complete) → output the session close:

```markdown
---
## Session Complete: <skill> test suite expanded

**Total tests added**: <N> across <total_batches> batch(es)
**Final suite baseline**: <score> / 100

**Next step**: Run `/reflect <skill>` to improve the skill against the expanded suite.
```

**If remaining_budget > 0** (more batches needed) → output the handoff and wait:

```markdown
---
## Batch <N> done. Ready for Batch <N+1>.

Budget remaining: <R> tests → next batch = 1 seed + <min(9, R-1)> derived

Let's build the next seed together — I'll propose one now.
```

Then immediately start PHASE 0 again for the next batch (do NOT wait for user to re-type the command).
