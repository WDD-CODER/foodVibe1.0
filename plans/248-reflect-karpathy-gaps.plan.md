---
name: Reflect — Karpathy gap-closure (two-agent split, executable score, concrete checks)
overview: Close three structural gaps between /reflect and Karpathy's autoresearch pattern — separate editor from evaluator, make scoring executable, add machine-checkable test assertions.
todos: []
isProject: false
---

# Goal

Redesign /reflect to close three structural gaps vs. Karpathy's autoresearch:
1. **GAP 1** — One agent currently proposes AND scores. Split into Researcher (edits skill) + Evaluator (blind agent, scores only).
2. **GAP 2** — Score comes from interpretation, not execution. Add `test-runner.sh` that runs grep/section/pattern checks and outputs a machine scalar (70% of final score).
3. **GAP 3** — Test cases use subjective Expected Behaviors. Add Concrete Checks (GREP/GREP-NOT/SECTION/LINE-COUNT/PATTERN) alongside Agent-Evaluated Behaviors.

# Atomic Sub-tasks

- [ ] Update `.claude/reflect/test-suite-template.md` — add Concrete Checks + Agent-Evaluated Behaviors sections to TC format
- [ ] GATE A: Show migrated angularComponentStructure.tests.md draft for human approval (machine-check split)
- [ ] Migrate `.claude/reflect/test-suites/angularComponentStructure.tests.md` to new format after approval
- [ ] GATE B: Show 2–3 example TCs with grep checks + present 70/30 vs 80/20 vs 60/40 ratio for human approval
- [ ] Create `.claude/reflect/test-runner.sh` — bash script, GREP/GREP-NOT/SECTION/LINE-COUNT/PATTERN checks, outputs `skill_score: XX.X` to stdout
- [ ] Update `.claude/reflect/evaluator.md` — document dual-scoring (70% executable + 30% agent), executable is PRIMARY
- [ ] Validate test-runner.sh: run twice against angularComponentStructure/SKILL.md, verify same score
- [ ] GATE C: Show evaluator-agent-prompt.md draft + updated flow diagram for human approval
- [ ] Create `.claude/reflect/evaluator-agent-prompt.md` — blind evaluator, no hypothesis context, no git access, outputs ONLY EVALUATION RESULTS block
- [ ] Update `.claude/commands/reflect.md` — redesign Phase 2/4 to use Agent tool + test-runner.sh; add TSV schema migration comment

# Constraints

- Everything lives in `.claude/reflect/` or `.claude/commands/`
- `test-runner.sh` and `evaluator-agent-prompt.md` must be project-agnostic (no Angular/FoodVibe references)
- Project-specific files: test suites only
- Stop at each GATE and wait for human approval before continuing
- No changes to `evaluator.md` scoring formula (it is IMMUTABLE per its header)
- Existing 13 rows in `reflection-log.tsv` must NOT be deleted — add schema comment separator

# Done When

1. `test-runner.sh` runs twice against `angularComponentStructure/SKILL.md` and produces the same `skill_score: XX.X` both times
2. `angularComponentStructure.tests.md` has ≥70% of checks as machine-verifiable Concrete Checks (excluding trigger-boundary TCs)
3. `evaluator-agent-prompt.md` exists and explicitly forbids git access + hypothesis context
4. `reflect.md` Phase 2/4 references Agent tool spawn for evaluation and `test-runner.sh` for executable scoring
5. All three 🧑‍🍳 gates approved by human before corresponding file is written

# Verification

```bash
# Run twice — must be identical
bash .claude/reflect/test-runner.sh .claude/skills/angularComponentStructure/SKILL.md .claude/reflect/test-suites/angularComponentStructure.tests.md
bash .claude/reflect/test-runner.sh .claude/skills/angularComponentStructure/SKILL.md .claude/reflect/test-suites/angularComponentStructure.tests.md
```
