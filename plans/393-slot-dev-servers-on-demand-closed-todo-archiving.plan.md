# Plan 393 — Slot Dev Servers On Demand and Closed-Todo Archiving

Status: draft
Track: code — here (not design)
Snapshot: a60b9cbd

## Problem Statement
Two workflow fixes Dandan asked for on 2026-10-06. Run this plan before plan 390, because 390's scope covers the same kit-owned files.

**1. Dev servers run all the time and use too much CPU.** `take-plan.mjs` starts a backend and a frontend in every slot it claims. Since plan 360 (E5b), they keep running from plan to plan, and `free-merged-slots.mjs` leaves them up after a merge, so with three slots plus `main` there are up to 8 servers, most of them idle. A process snapshot taken on 2026-10-06 also showed orphaned `node --watch index.js` chains (`npm run dev:local` → `cross-env` → `node --watch`): three from `foodVibe1.0-wt-1` and one from main, none of them listening on a port. Only ports 4200 and 3001 were listening. `stopSlotServers()` finds servers by recorded PID or by who holds the port, so a watcher that holds no port is never found.

New rule: **servers are off unless a session needs them or the Human asks for them.**
- `take-plan` claims the slot but does not start any server. A claim is finished once the branch is checked out. A server failing to start never blocks the claim, and it never stops the plan from being executed. (On 2026-10-06 a Worker claimed plan 339; the frontend didn't come up, take-plan exited 1, and the Worker stopped, as `/take-plan` currently says to.) The Worker starts executing right away and runs `slot-serve.mjs` only when a step needs the running app. If `slot-serve.mjs` fails at that point, only that step is blocked: the Worker shows the log tail and carries on with the steps that don't need the app.
- A new `scripts/slot-serve.mjs` starts them on demand (it takes over take-plan's npm-install check, the `commands.slotPrepare` step, the wait with timeouts and the log tail on failure). Agents run it only when a step needs the running app: a browser check, a human validation click-list, `/remote`, or the preflight check. They also run it when the Human says "start servers".
- The merge from a slot starts by stopping that slot's servers. `free-merged-slots.mjs` stops the servers of every slot it frees, which undoes plan 360 E5b's "keep them running".
- Stopping finds the orphaned watcher chains too: any `dev:local` / `cross-env` / `node --watch` / `ng serve` process whose command line or working directory is inside this slot's folder, whether or not it holds a port.
- When a Claude Code session ends in a slot, a `SessionEnd` hook stops that slot's servers.
- **Fix the leak at its source, not only the cleanup.** On 2026-10-06 each orphan had the same shape: `npm-cli.js run dev:local` → `cmd.exe` → `cross-env.js` → `node --watch index.js`, and the watcher had **no child**. Its `index.js` had died (most likely because the port was already taken), but the watcher stayed alive. The Planner killed 4 of these by hand (1 in main, 3 in wt-1) with `taskkill /T /F` on the `npm run dev:local` root. The likely cause: on Windows, stopping or restarting a server kills npm or `cmd.exe` but not the `node --watch` grandchild, or a second start on a port that's already in use leaves its watcher behind. Reproduce it, then fix the stop (kill the whole tree from the root) and the start (never spawn a backend while its port is held).
- **Sweep at session start.** `session-startup.sh` kills orphaned dev chains for its own folder: a `node --watch` with no child process, plus its npm/`cmd`/`cross-env` parents, whose command line or cwd is in this folder. This also cleans up after a session that crashed or was closed before its `SessionEnd` hook ran.
- **The main folder too, orphans only.** The same sweep runs in the main folder, but it only kills orphan chains (a watcher with no child that holds no port). It never touches a server that holds a port, so the Human's running main servers stay safe.

**2. Todo archiving ignores `[-]` (closed/dropped) items.** In `scripts/lib/todo-parse.mjs`, `checkboxStats` counts only `[ ]` and `[x]`, and `isFullyDone` needs at least one `[x]`. A section made only of `[-]` lines, or of `[x]` and `[-]` lines, should move to the archive. Today a section that has only `[-]` lines stays in `.claude/todo.md` forever.

All the files involved are kit-owned. Fix them in `../ai-workflow-kit` first, then bring them into FoodVibe as an ADR 0018 patch (patch mode is still in force until plan 392).

## Goals & Success Criteria
**Primary:** an idle machine runs no FoodVibe dev servers, and closed todo sections leave `.claude/todo.md`.

- [auto] In a scratch slot test, `node scripts/take-plan.mjs <NNN>` claims the slot and prints `TAKE_PLAN: servers: off — start them with node scripts/slot-serve.mjs`. Afterwards no process listens on the slot's ports.
- [auto] `.claude/commands/take-plan.md` no longer says to stop when a server fails. It says: claimed → start executing; start the servers only when a step needs them.
- [auto] `node scripts/slot-serve.mjs` in a slot starts both servers and prints `SLOT_SERVE: be=<port> started, fe=<port> started`. A second run prints `kept` for both.
- [auto] `node scripts/slot-stop.mjs` stops a scratch orphan chain (`node --watch` started with its cwd in the slot, holding no port) and prints it as stopped.
- [auto] `node scripts/free-merged-slots.mjs` on a slot whose branch merged prints `wt-N: freed` plus `servers stopped`.
- [auto] Running `.claude/settings.json`'s `SessionEnd` command by hand in a slot stops its servers. In the main folder it does nothing and exits 0.
- [auto] `node --test scripts/test/` includes a `todo-parse` test where a section with only `[-]` lines, or with `[x]` and `[-]` lines, is an archive candidate, and a section with any `[ ]` is not. `npm run test:scripts` passes.
- [auto] `node scripts/todo-archive.mjs --dry-run` on the current `.claude/todo.md` lists every section that has no `[ ]` left.
- [auto] `npx ng build`, `node scripts/kit-owned.mjs --check`, `node scripts/kit-manifest-check.mjs`, and the kit's `leak-check`, `pack-check` and `install-check` all pass.
- [auto] Leak repro: in a scratch slot, run start → stop and start → restart (the after-npm-install path) 3 times each. Afterwards zero `node --watch index.js` processes have their cwd or command line in that folder (count them with `Get-CimInstance Win32_Process`).
- [auto] A second backend start while the port is held refuses with a clear message and leaves no new process behind.
- [auto] Session-start sweep: with a scratch orphan chain (a watcher whose child was killed) in a slot and another in the main folder, running `bash scripts/session-startup.sh` in each one stops that folder's orphan and prints it. In the main folder, a server that holds a port, started next to it, is still running afterwards.
- [human] After the next slot merge, Task Manager shows no node processes left over from that slot.
- [human] A validation click-list in a Worker session starts the servers itself first (or tells you to say "start servers"), and they are off again after the merge.

## Execution Mode
- **Parallel:** no. One Worker in a FoodVibe `wt-N` slot, editing the kit repo by path. Plan 390 starts after this plan merges.
- **Isolated DB:** no.
- **Kit edits:** made on the kit branch `fix/393-servers-on-demand`, with a kit PR that Dandan merges.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/take-plan.mjs
scripts/slot-serve.mjs
scripts/slot-stop.mjs
scripts/lib/slot-procs.mjs
scripts/orphan-sweep.mjs
scripts/free-merged-slots.mjs
scripts/todo-archive.mjs
scripts/lib/todo-parse.mjs
scripts/test/**
scripts/session-startup.sh
.claude/settings.json
.claude/commands/take-plan.md
.claude/commands/remote.md
.claude/commands/commands.md
.claude/commands/ship.md
.claude/skills/preflight/SKILL.md
docs/agent/standards-git.md
docs/agent/ship-regular.md
docs/agent/job-validation.md
docs/agent/workflow-map.md
docs/workflow-kit/**
docs/brain/**
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**`, where these fixes are written first. Scratch test folders go under the session scratchpad.

## Read Scope

The entire FoodVibe repo and the kit repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Never stop a process outside this slot's folder. Never stop a non-dev process (for example MCP servers or Cursor helpers).

## Architecture Impact

- INV-none: preserves — this plan changes only workflow scripts and docs. It touches no app runtime file and no invariant's `Touches` glob.

## Step 0 — Reality Check

1. Both repos are on their latest state: run `git fetch origin --prune` in FoodVibe (the slot branch is based on the current `origin/main`). In the kit, run `git -C ../ai-workflow-kit fetch --prune`, then check it is on a clean `main` that matches `origin/main` (`pull --ff-only` if it is behind), and that `gh pr list -R WDD-CODER/ai-workflow-kit` shows no open kit PR touching these files.
2. Take a process snapshot, `Get-CimInstance Win32_Process -Filter "name='node.exe'"` (CommandLine plus parent PID), and record which chains belong to which slot folder. Later steps check the orphan-stop result against it.

## Functional Requirements

### Must Have (P0)
- [ ] take-plan stops starting servers. Its pre-claim port check still refuses a foreign process on the slot's ports and still stops this slot's own leftover servers.
- [ ] New `scripts/slot-serve.mjs` (`core`/`copy` row in the manifest and `kit-owned.json`), built from the server-start code taken out of take-plan.
- [ ] `stopSlotServers()` also finds orphaned dev chains whose cwd or command line is inside this slot's folder, even with no port. Dev-process patterns only.
- [ ] Merging from a slot (`standards-git.md`, `ship-regular.md`) begins with `node scripts/slot-stop.mjs`. `free-merged-slots.mjs` stops the servers of each slot it frees.
- [ ] A `SessionEnd` hook in `.claude/settings.json` runs `slot-stop.mjs` in a slot and does nothing anywhere else.
- [ ] The docs say servers start on demand: `take-plan.md`, `remote.md` (point it at `slot-serve.mjs` instead of take-plan), the preflight skill (if the server is not reachable in a slot, run `slot-serve.mjs`), `job-validation.md` (start the servers before handing over a click-list), `workflow-map.md` and `commands.md`.
- [ ] Root-cause the orphan leak (repro on Windows), fix it in `slot-procs.mjs` (stop = kill the whole tree from the `npm run dev:local` root; start = refuse while the port is held), and record the cause in `docs/brain/gotchas/`.
- [ ] `scripts/orphan-sweep.mjs` (shared helper in `slot-procs.mjs`): kills orphan dev chains for the current folder, in a slot or in main, and never a process that holds a port. `session-startup.sh` runs it with a short timeout. Add its manifest row and `kit-owned.json` entry.
- [ ] Todo archiving: `checkboxStats` counts `[-]` as closed. `isFullyDone` returns true when there are no `[ ]` lines and at least one `[x]` or `[-]` line. Add a `node --test` test for it.

### Won't Have (this plan)
- An idle-timeout auto-stop. Stopping the main folder's *running* servers (the Human runs those); only main's orphans are swept.

## Atomic Sub-tasks
- [ ] D0: Step 0: bring both repos up to date, take the process snapshot.
- [ ] D1: Kit: `slot-serve.mjs`, plus take-plan no longer starting servers.
- [ ] D2: Kit: orphan-chain detection in `slot-procs.mjs`, `free-merged-slots` stopping servers, and the `SessionEnd` hook.
- [ ] D2a: Kit: reproduce the orphan leak and fix its root cause (kill the whole tree on stop, refuse a start while the port is held), plus the brain gotcha.
- [ ] D2b: Kit: `orphan-sweep.mjs` and its session-start call (slot and main, orphans only), plus the manifest row and `kit-owned.json` entry.
- [ ] D3: Kit: `todo-parse.mjs` counting `[-]` as closed, plus its test.
- [ ] D4: Kit: docs (`take-plan.md`, `remote.md`, preflight, `standards-git.md`, `ship-regular.md`, `job-validation.md`, `workflow-map.md`, `commands.md`), plus the manifest row and the `kit-owned.json` entry for `slot-serve.mjs`.
- [ ] D5: Kit PR merged by Dandan. Patch into FoodVibe (ADR 0018), then run `todo-archive.mjs` once.
- [ ] D6: Run every [auto] criterion, update `manifest.md`'s validation-round paragraph, then `/ship`.

## Out of Scope
Phase 6 kit work (plans 390–392). MCP server processes (Playwright, agentmemory): they come from Claude/Cursor config, not from the slots.
