# /plan — Planning Path

Use this path for product planning, PRDs, HLDs, and technical design decisions.

## Loads

- `prd-template.md` (if available in `.claude/`) — product requirements document template
- `hld-template.md` (if available in `.claude/`) — high-level design template

## Invokes

- `product-manager` — feature scoping, user stories, success metrics, forced alternatives
- `software-architect` — technical design, component breakdown, risk analysis

## Typical flow

1. User describes the problem or feature area.
2. `product-manager` runs structured scoping: forcing questions, landscape search, premise challenge.
3. Output: a sharp brief suitable for `plan-implementation`.
4. `software-architect` adds technical design layer if the feature spans multiple subsystems.
5. User approves brief → proceed to `/feat` for implementation.

## Notes

- Planning is read-only. No code changes happen in this path.
- Output of `/plan` is always a brief or design doc, never code.
- Use `/feat` to execute a plan after this path completes.

## Deprecation note

`new-feature.md` contains structured scoping logic that overlaps with this path.
`new-feature.md` remains functional as an alias. **Deadline to review: 2026-04-28.**
