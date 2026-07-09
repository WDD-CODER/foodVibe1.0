# /feat — New Feature Path

Use this path for building new features. Loads Angular + domain standards automatically.

## Loads

- `.claude/rules/angular.md` — Signals, Components, CSS (Layers), Angular conventions
- `.claude/rules/domain.md` — FoodVibe domain model, data flow, naming conventions
- `/_shared/tech-stack.md` — stack overrides

## Invokes

- `/plan` — read-only phase: codebase scan → Plan Contract (Architect authors, saved to `plans/`)
- `/review-it` — review phase: Reviewer checks plan-match, conventions, and the Verify gate
- `team-leader` — review-time coordinator only (`qa-engineer` + `security-officer` on complex / security-sensitive milestones)

## Typical flow

1. User describes feature goal.
2. Invoke `/plan` (produces a Plan Contract in `/plans/[feature]_v[N].md`).
3. User reviews and approves the plan.
4. Contractor executes **one milestone at a time**, writes `/sessions/[date].md`, stops.
5. After a milestone: `/review-it` for the Reviewer pass.
6. On APPROVE: Human runs Verify, commits, marks the milestone `[x]`.
7. `/ship` for session wrap prep (Human still commits / pushes).

## Hard rules (inherited from CLAUDE.md / .cursorrules)

- No semicolons in `.ts` files. Single quotes in TS, double quotes in HTML.
- `ng build` / `ng lint` must pass before declaring a milestone ready.
- Branch guard enforced — never write on `main`.
