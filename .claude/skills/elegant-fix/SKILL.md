# Elegant Fix — Solution Refinement

After implementing a fix that feels mediocre, refine it into an elegant solution.

## When to Use

- After any fix that makes you uncomfortable
- When you notice duplicated logic or too many special cases
- Before submitting a PR with "I know this isn't ideal" comments
- When a workaround could be a proper abstraction

## The Pattern

When you've made a fix that works but feels hacky, trigger a fresh perspective:

> "Knowing everything you know now, scrap this and implement the elegant solution"

The first pass taught you the codebase constraints; the second pass leverages that.

## Workflow

1. **Complete the initial fix** — get something working first.
2. **Identify the smell** — workaround vs solution, too complex, inconsistent with Signals, change-detection concerns.
3. **Request refinement** — paste context, current implementation, and concerns; ask for the elegant solution per project standards (copilot-instructions: Signals, input/output/model, translatePipe, Adapter Pattern).
4. **Compare and decide** — is the refined solution better, lower risk, lower maintenance, aligned with existing patterns?

## Integration

After refinement, if you discovered a new pattern: update `.claude/copilot-instructions.md`, relevant `breadcrumbs.md`, and consider adding a utility in `core/utils/`.

## Related

- techdebt — find other code that needs refinement
- update-docs — document new patterns
