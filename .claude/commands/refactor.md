# /refactor â€” Refactor Path

Use this path for code cleanup, dead code removal, pattern consolidation, and technical debt reduction.

## Loads

- `docs/agent/standards-angular.md` â€” component structure, Signals, CSS layer architecture
- `cssLayer` skill â€” CSS layer ordering, BEM naming, token usage
- `techdebt` skill â€” scan for violations, duplications, dead code

## Invokes

  (`CI / ng test` + `pre-commit security grep + CI`). Not an execution dispatcher.

## Typical flow

1. Run `techdebt` scan to identify the highest-priority items.
2. Select scope: single file, component, service, or subsystem.
3. Prefer a Plan Contract with milestones for anything non-trivial.
4. Refactor atomically â€” one concern per milestone / commit.
5. `ng build` / `ng lint` must pass after each milestone.
6. No behavior changes â€” refactor changes structure only. If behavior must change, use `/feat`.

## Hard rules

- No behavior changes in a refactor commit. If you find a bug, open a `/fix` separately.
- `ng build` must pass after every commit.
- No semicolons in any `.ts` file touched.
- Reference `cssLayer` skill before modifying any `.scss` file â€” layer order matters.
- Human commits by default (`git-agent` prep only).

## Scope guidelines

| Scope | Approach |
|-------|----------|
| Single file or component | Solo Contractor |
| 2â€“5 files, single subsystem | Solo + `elegant-fix` review |
