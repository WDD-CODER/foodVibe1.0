---
name: Techdebt and spec coverage agent adherence
overview: Make Phase 0 (techdebt pass and Spec coverage handling) impossible to skip when running commit-to-github by documenting it explicitly in all guiding entry points and adding a mandatory checklist.
---

# Ensure agents run techdebt and spec coverage in commit flow

## Current state (what the docs say)

- **Commit-to-github skill**: Phase 0 clearly requires a tech-debt check before Phase 1 and handling of the report's Spec coverage. The skill itself defines the requirement.
- **agent.md**: Step 5.5 run techdebt before task done; step 7 commit → read commit-to-github. It does not say Phase 0 is mandatory when running that skill.
- **.cursor/commands/commit-github.md**: Says "Read and follow commit-to-github SKILL start-to-finish" and "no git until approval." Does not mention Phase 0, techdebt, or Spec coverage.
- **.assistant/copilot-instructions.md**: Section 0 "Commit/push → read commit-to-github" and separately "End of session, before PR → read techdebt." Commit is not explicitly tied to "run Phase 0 first."
- **.cursor/rules/git-commit-must-use-skill.mdc**: Tells agent to read the skill and not run git until approval. Does not say "complete Phase 0 before Phase 1."

So the requirement lives only inside the commit-to-github skill. Entry points never say "Phase 0 is mandatory." Agents can skip Phase 0.

## Root causes (why agents skip it)

1. No explicit "Phase 0 first" in entry points.
2. Phase 0 is easy to skip when in a hurry (jump to Evaluate).
3. Techdebt is documented as "end of session / before PR," not "when you run commit-to-github."
4. No checklist forcing stop-and-verify.

## Implemented changes

1. **commit-to-github SKILL.md**: Added one-line mandate after safety rule; added Phase 0 checklist under Phase 0 heading.
2. **.cursor/commands/commit-github.md**: Added explicit step to complete Phase 0 (techdebt + spec coverage) before Phase 1.
3. **.assistant/copilot-instructions.md**: In commit trigger, added "Before building the commit plan (Phase 1), complete Phase 0 (tech-debt pass + Spec coverage)."
4. **agent.md**: In step 7, added "Phase 0 (techdebt + spec coverage) is mandatory before Phase 1." In step 5.5, added cross-ref that Phase 0 of commit-to-github will use an existing report.
5. **.cursor/rules/git-commit-must-use-skill.mdc**: Added "Execute Phase 0 before Phase 1; do not run Phase 1 until Phase 0 is complete."

## Outcome

Every entry point that leads to "commit to GitHub" now states that Phase 0 must be completed before Phase 1, so agents consistently run techdebt (or use an existing report) and handle Spec coverage before building the commit tree.
