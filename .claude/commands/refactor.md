# /refactor — Refactor Path

Use this path for code cleanup, dead code removal, pattern consolidation, and technical debt reduction.

## Loads

- `.claude/standards-angular.md` — component structure, Signals, CSS layer architecture
- `cssLayer` skill — CSS layer ordering, BEM naming, token usage
- `techdebt` skill — scan for violations, duplications, dead code

## Invokes

- `team-leader` — for large refactors spanning 3+ files or subsystems

## Typical flow

1. Run `techdebt` scan to identify the highest-priority items.
2. Select scope: single file, component, service, or subsystem.
3. Refactor atomically — one concern per commit.
4. `ng build` must pass after each commit.
5. No behavior changes — refactor changes structure only. If behavior must change, use `/feat`.

## Hard rules

- No behavior changes in a refactor commit. If you find a bug, open a `/fix` separately.
- `ng build` must pass after every commit.
- No semicolons in any `.ts` file touched.
- Reference `cssLayer` skill before modifying any `.scss` file — layer order matters.

## Scope guidelines

| Scope | Agents |
|-------|--------|
| Single file or component | Solo (no agent team needed) |
| 2–5 files, single subsystem | Solo or `elegant-fix` review |
| 6+ files or cross-subsystem | `team-leader` + task force |
