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

Brain capture is **auto-evoked** on push / PR / Merge Gate (agent proposal + GitHub sticky reminder) — not `/ship`-only. The full draft is always shown first; it then **auto-writes** on the reply that closes the gate (`Y` / `merge` / `later` / `open-pr-only`) — say `no brain` / `skip brain` to opt out for that ship, or `brain edit …` to revise first. See [[0006-auto-write-brain-capture-by-default]], [[0003-auto-evoke-brain-on-pr]], and `docs/agent/standards-git.md` Post-push Merge Gate.

Drafting quality is governed by `docs/agent/brain-capture.md` (extraction procedure, required shapes, usefulness gate): proposals must carry a full draft body, never just a one-line label. Templates: `docs/brain/patterns/_TEMPLATE.md`, `docs/brain/decisions/_TEMPLATE.md`; gotcha shape at the top of `docs/brain/gotchas.md`.

Reuse signal: when a brain entry changes a session decision, agents log `Informed by: [[entry-name]]` under `### Decisions` in `sessions/YYYY-MM-DD.md` (see `docs/agent/brain-capture.md` — Reuse tracking). Audit with `grep -r "Informed by:" sessions/`.

`scripts/brain-review-check.mjs --scope=dead-refs` runs non-blocking in CI on every PR (catches this-PR breakage only). `--scope=full` runs on `/ship`'s feature-complete/PR path (whole-repo dead refs + past-due `review-by` dates). Both are advisory only — never auto-edit, never auto-delete.
