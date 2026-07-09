# /plan — Planning Path

Use this path for product planning, PRDs, HLDs, and technical design decisions.
In the three-agent workflow, planning is the **Architect** role (Claude.ai by default;
Claude Code / Cursor may plan when the Human Director explicitly overrides).

## Loads

- `.claude/references/prd-template.md` — product requirements / Plan Contract template
- `.claude/references/hld-template.md` — high-level design template (when present)
- `/_shared/tech-stack.md` + `/_shared/current-state.md` — stack + capsule
- `.claude/rules/` — path-scoped standards (loaded when the plan touches matching areas)

## Invokes

- Architect (Human-directed) — writes / updates a Plan Contract in
  `/plans/[feature]_v[N].md`
- Does **not** invoke the retired `product-manager` or `software-architect` agents

## Typical flow

1. User describes the problem or feature area.
2. Architect runs structured scoping (forcing questions, landscape, premise challenge).
3. Output: a Plan Contract under `/plans/[feature]_v[N].md` with numbered milestones
   and a Verify command per milestone.
4. User approves the plan → Contractor executes one milestone at a time → `/review-it`.

## Notes

- Planning is read-only against the app. No product-code changes happen in this path.
- Output of `/plan` is always a Plan Contract (or design doc), never application code.
- Use Cursor (Contractor) or an explicit execute override to implement after approval.
- Legacy `plans/NNN-name.plan.md` files coexist; new work uses `[feature]_v[N].md`.
