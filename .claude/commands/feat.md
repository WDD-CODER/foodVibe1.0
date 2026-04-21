# /feat — New Feature Path

Use this path for building new features. Loads Angular + domain standards automatically.

## Loads

- `.claude/standards-angular.md` — Signals, Components, CSS (Layers), Angular conventions
- `.claude/standards-domain.md` — FoodVibe domain model, data flow, naming conventions

## Invokes

- `plan-implementation` — read-only phase: codebase scan → implementation plan
- `execute-it` — full write phase: atomic sub-tasks, commit each, update todo.md
- `team-leader` — for medium/large tasks requiring parallel agents

## Typical flow

1. User describes feature goal.
2. Invoke `plan-implementation` (reads standards, searches MemPalace, produces plan).
3. User reviews plan and says "save the plan".
4. `save-plan` skill assigns plan number, appends to todo.md.
5. User says "execute it" or "go".
6. `execute-it` runs atomic sub-tasks in sequence.
7. For tasks spanning 3+ sub-systems, `team-leader` assembles a task force.
8. After all `[x]`: `/ship` for fast session end or `/end-session` for full pipeline.

## Hard rules (inherited from CLAUDE.md)

- No semicolons in `.ts` files. Single quotes in TS, double quotes in HTML.
- `ng build` must pass before any commit.
- MemPalace search before spawning any agent.
- Branch guard enforced — never commit to `main`.

## Deprecation note

`new-feature.md` and `plan-implementation.md` + `execute-it.md` remain fully functional as aliases.
Prefer `/feat` for new work. **Deadline to remove old aliases: 2026-04-28.**
