# Session state — main

Updated: 2026-10-28T12:48:44.024Z
HEAD: 42ba9a38

## Session Summary

- Saved the pasted pnpm migration plan as **plan 505**: `plans/505-move-foodvibe-to-pnpm-so-every-slot-and-orchestrator-folder-shares-one-package-store.plan.md` (Status: draft, Snapshot `b71412a2`).
- The Architect + PM review fixed these gaps in the draft:
  - `ci.yml` is a FoodVibe override, so the kit sync never rewrites it; step A5 now edits it by hand.
  - `security.yml` is rewritten by the kit sync to use `pnpm audit`, because `npm audit` fails without `package-lock.json`.
  - Render sets `NODE_ENV=production`, so its build command needs `--prod=false` to keep the dev tools.
  - The live Render service ignores `render.yaml`; a step for the Human to update the dashboard was added.
  - `pnpm-workspace.yaml` was dropped from the scope.
  - Step A6 was added for `scripts/qa/qa-nightly-up.ps1`.
  - Checks were added for the server tests, server package versions and kit drift.
- Gates: `ARCH: ok INV-none`, `REUSE: ok none`, no similar plans.
- The plan's tasks (A1–A6, B1) were added to `.claude/todo.md` under `### Plan 505`.
- Commit `42ba9a38` (plan 505 + todo) was pushed to `origin/main`, and `git ls-tree origin/main` lists the plan file.
- Branch: `main`, HEAD `42ba9a38`.

## Open Signals

- **Open question in plan 505:** does Render's build allow `corepack enable`? If not, the build uses `npm install -g pnpm@<pinned>`. The Worker confirms this.
- **Deploy risk after the merge:** until the Human pastes the new build command into the Render dashboard, deploys fail, because the old build runs `npm ci` and `package-lock.json` is gone.
- **Exclusive run:** plan 505 cannot run alongside any other plan.
- **Possible slot write guard:** kit-owned files may be blocked from editing in a slot. The kit sync runs as a shell command, so it should not be affected.
- **Still open from the last session:**
  - Open plans: 409, 410, 411, 412, 419, 422, 450, 471, 473, 490, 497, and 372–374 in `plans/design/`.
  - 473 needs a rewrite.
  - The MVP gate (Atlas migrations, then `mvp` → `main`) stays with Dandan.

## Next Steps

1. The Human runs `corepack enable` once in PowerShell.
2. In a free `wt-N` slot: `execute plan 505`.
3. When plan 505 is built: hand over the validation cards (CI green, fresh-slot install speed and disk size), then ship and merge.
4. Right after the merge: the Human puts the `render.yaml` build command into the Render dashboard for `foodvibe1-0-1-frankfurt` and confirms the deploy starts.
5. Each slot re-installs with pnpm on its next `take-plan` or `slot-serve`.
6. Then: run readiness for group 4 (497, 419, 412), close 450 and 490, and hold a rewrite session for 473.
