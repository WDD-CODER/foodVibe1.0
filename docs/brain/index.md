# docs/brain — index

Distilled project knowledge: history and reasoning, not current state. **Current work status lives in `docs/session-state.md` and `.claude/todo.md` — not here.**

> **Visual tour:** [how-it-works.md](./how-it-works.md) — diagrams of layers, folder map, capture loop, and what to save.

## Reading order (session start on unfamiliar work)

1. `projectbrief.md` — what FoodVibe is, goals, hard constraints
2. `decisions/` — architectural choices, append-only (never edit in place — supersede)
3. `patterns/` — proven solutions, one file each
4. `gotchas.md` — what hurt before, and what to do instead
5. `glossary.md` — domain vocabulary

## When to read what

| Situation | Read |
|---|---|
| New session, unfamiliar area of the code | `projectbrief.md`, then the relevant sub-file below |
| About to make an architectural choice | `decisions/` first — check for an existing ADR before deciding again |
| Something behaves surprisingly / a trap cost time | `gotchas.md` first |
| Unfamiliar domain term | `glossary.md` |
| Need rules/conventions (not history) | `AGENTS.md` and `docs/agent/*.md` — not this folder |

## Maintenance

Brain capture is **auto-evoked** on push / PR / Merge Gate (agent proposal + GitHub sticky reminder) — not `/ship`-only. **Confirm-to-write** still applies: never silent-write to this folder; Human replies `brain approve` | `brain skip` / `brain:none` | `brain edit …`. See [[0003-auto-evoke-brain-on-pr]] and `docs/agent/standards-git.md` Post-push Merge Gate.

`scripts/brain-review-check.mjs --scope=dead-refs` runs non-blocking in CI on every PR (catches this-PR breakage only). `--scope=full` runs on `/ship`'s feature-complete/PR path (whole-repo dead refs + past-due `review-by` dates). Both are advisory only — never auto-edit, never auto-delete.
