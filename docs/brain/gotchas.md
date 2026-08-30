# Gotchas

Index into the domain-split gotcha files under `docs/brain/gotchas/`. Each entry: what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom of the matching domain file below; never delete a still-true entry. If a domain file exceeds ~150 lines / ~10 entries, propose splitting it further into a narrower domain file under `docs/brain/gotchas/` as a brain proposal at the next Merge Gate.

This file split on 2026-08-01 once the single flat file crossed ~280 lines / 21 entries. Old inbound links to `docs/brain/gotchas.md` still resolve here — this index says where the entry actually lives now.

## Domain files

| File | Scope | Entries |
| --- | --- | --- |
| [agent-workflow](./gotchas/agent-workflow.md) (`docs/brain/gotchas/agent-workflow.md`) | Session/context management, plan persistence and numbering, `.claude/todo.md` archiving, brain-capture gating | 10 |
| [backend](./gotchas/backend.md) (`docs/brain/gotchas/backend.md`) | `server/` routes, data access, the Gemini AI proxy, logging transport | 9 |
| [angular](./gotchas/angular.md) (`docs/brain/gotchas/angular.md`) | `src/app/` components, signals-based state, routing, change-detection behavior | 9 |
| [ci](./gotchas/ci.md) (`docs/brain/gotchas/ci.md`) | `.github/workflows/*`, `ng build`/`angular.json`, `npm audit` | 2 |
| [git-workflow](./gotchas/git-workflow.md) (`docs/brain/gotchas/git-workflow.md`) | Worktrees, `gh` auth/PR mechanics, repo-tracked files that interact with commit/push/merge | 7 |

## Where to append a new entry

When `/ship` or the Post-push Merge Gate proposes a new gotcha, write it (verbatim, per `docs/agent/brain-capture.md`) to the domain file whose scope matches the trap:

- Touches `.claude/`, `plans/`, `.claude/todo.md`, session state, or Claude Code/Cursor tooling itself → `docs/brain/gotchas/agent-workflow.md`
- Touches `server/` → `docs/brain/gotchas/backend.md`
- Touches `src/app/` → `docs/brain/gotchas/angular.md`
- Touches CI workflows or the build pipeline → `docs/brain/gotchas/ci.md`
- Touches git/worktree/`gh` mechanics → `docs/brain/gotchas/git-workflow.md`
- Doesn't fit any of the above → add a new `docs/brain/gotchas/<domain>.md` file, then add a row to the table above in the same change.

## Gotcha shape (for drafting)

```
## <short title naming the trap>

**What hurt:** <symptom, concretely — file/line where relevant>

**Why the obvious fix is wrong:** <why the tempting fix doesn't actually solve it>

**What to do instead:** <the rule a future agent should follow>
```

See also `docs/brain/how-it-works.md` for the visual tour and `docs/brain/index.md` for the full second-brain reading order.
