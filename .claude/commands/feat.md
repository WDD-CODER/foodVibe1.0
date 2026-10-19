# /feat — New Feature Path

Use this path for building new features. Loads Angular + domain standards automatically.

## Loads

- `docs/agent/standards-angular.md` — Angular conventions (state, components, styling)
- `docs/agent/standards-domain.md` (skip if unset) — FoodVibe domain model, data flow, naming conventions
- `_shared/tech-stack.md` — stack overrides

## Invokes

- `/plan` — read-only phase: codebase scan → Plan Contract (the Planner authors it and runs the Architect + PM review, saved to `plans/`)
- `/review-it` — review phase: Reviewer checks plan-match, conventions, and the Verify gate

## Typical flow

1. User describes feature goal.
2. Invoke `/plan` (produces a Plan Contract in `plans/NNN-slug.plan.md` via save-plan).
3. User reviews and approves the plan.
4. Contractor executes **one milestone at a time**, writes `/sessions/[date].md`, stops.
5. After a milestone: `/review-it` for the Reviewer pass.
6. On review APPROVE: Human runs Verify (or proceeds to `/ship`).
7. `/ship` — Human Approve **Y** validates the job; agent **must** mark matching todos/`[x]` in Phase 6 (see `AGENTS.md`).

## Hard rules (inherited from CLAUDE.md / .cursor/rules/contractor-role.mdc)

- Match the file's existing style; never reformat untouched lines.
- No semicolons in `.ts` files. Single quotes in TS, double quotes in HTML.
- `npm run build` / `npm run lint` must pass before declaring a milestone ready.
- Branch guard enforced — never write on `main`.
