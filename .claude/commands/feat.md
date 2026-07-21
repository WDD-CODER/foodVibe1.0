# /feat â€” New Feature Path

Use this path for building new features. Loads Angular + domain standards automatically.

## Loads

- `docs/agent/standards-angular.md` â€” Signals, Components, CSS (Layers), Angular conventions
- `docs/agent/standards-domain.md` â€” FoodVibe domain model, data flow, naming conventions
- `/_shared/tech-stack.md` â€” stack overrides

## Invokes

- `/plan` â€” read-only phase: codebase scan â†’ Plan Contract (Architect authors, saved to `plans/`)
- `/review-it` â€” review phase: Reviewer checks plan-match, conventions, and the Verify gate

## Typical flow

1. User describes feature goal.
2. Invoke `/plan` (produces a Plan Contract in `plans/NNN-slug.plan.md` via save-plan).
3. User reviews and approves the plan.
4. Contractor executes **one milestone at a time**, writes `/sessions/[date].md`, stops.
5. After a milestone: `/review-it` for the Reviewer pass.
6. On review APPROVE: Human runs Verify (or proceeds to `/ship`).
7. `/ship` — Human Approve **Y** validates the job; agent **must** mark matching todos/`[x]` in Phase 6 (see `AGENTS.md`).

## Hard rules (inherited from CLAUDE.md / .cursor/rules/contractor-role.mdc)

- No semicolons in `.ts` files. Single quotes in TS, double quotes in HTML.
- `ng build` / `ng lint` must pass before declaring a milestone ready.
- Branch guard enforced â€” never write on `main`.
