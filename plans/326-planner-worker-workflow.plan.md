# Plan 326 — Planner–Worker Workflow

Status: active
Snapshot: 30f5ed2e

## Problem Statement

The current two-slot parallel-worktree system doesn't scale cleanly: there's no fixed
port map per slot, no enforced Read-Write scope per plan, and mechanical steps (claiming
a slot, syncing todos, checking drift) are still partly manual. Replace it with a
Planner–Worker model: the Planner commits plans and `.claude/todo.md` directly to `main`;
three permanent worktree slots (`wt-1..3`) are reused via "execute plan NNN"; each Worker
may modify only its plan's Read-Write scope, enforced by a hook and a `/ship` gate; and
all mechanical steps live in `.mjs` scripts that print a few lines.

## Goals & Success Criteria

- Primary: Planner writes plans/todo to `main` directly; Workers operate in one of three
  fixed-port worktree slots, scoped to their plan's declared Read-Write globs.
- Success: every item in **Done when** (below) passes, `ng build` and
  `scripts/plan-ledger-check.mjs` are clean, and the branch ships as one PR.

## Read-Write Scope

This is the tooling/methodology plan itself, so its scope is intentionally broad — it is
the one plan expected to touch process files across the repo.

```scope
scripts/**
.claude/**
.husky/**
docs/agent/**
docs/brain/decisions/**
.claude/references/**
angular.json
.gitignore
AGENTS.md
README_WORKFLOW.md
src/environments/environment.slot.ts
```

## Atomic Sub-tasks

### M0 — Reality check (mandatory, no writes) — COMPLETE

Findings (see session record for full detail):
- Snapshot moved `f9bcfcc3` → `30f5ed2e` (4 commits, none blocking).
- **B2 merged**: `.claude/commands/ship.md` is now a 240-line core file. Only Phase 2
  (REGULAR review), REGULAR brain-capture, commit-vs-PR judgment and Phase 4.5 (REGULAR)
  moved to `docs/agent/ship-regular.md` — **Phase 3 (manifest check) and "On approval"
  stayed in core `ship.md`** (confirmed by reading the actual file, not inferred from the
  commit message), so M2's edits land there, not in ship-regular.md.
- **C (techdebt-scan.mjs) not merged** — no impact on this plan.
- No open PRs overlap this work.
- `../foodVibe1.0-wt-parallel` exists but is **not clean**: untracked `.claude/dev-server.log`,
  8 commits behind `origin/main` (ff-able). M3's worktree-setup move step must handle this
  (report and stop, or ignore the log file specifically — decide in M3).
- Real `dictionary.json` source path: `public/assets/data/dictionary.json` (a build copy
  also exists under `dist/`, not the hotspot).
- Only `server/.env` exists — no root `.env`. Worktree-setup copies just that one file.
- dotenv confirmed to default `override: false` — safe to set slot-specific env vars.
- `db-backup.js` / `db-restore.js` args confirmed: backup takes `--target= [--out=]`;
  restore takes `--target= --dir= --db=` (backup's own header comment wrongly says
  `--file=` for restore — cosmetic, not a blocker).
- `todo-query.mjs` confirmed to have no `sync` subcommand yet (`next|open|sweep|mark|append`).
- `branch-guard.sh` confirmed to not read stdin; latest ADR is `0008`, so the new one is
  `0009`; `.cursor/` has no `hooks.json`; husky is `^9.1.7`.

Unrelated open todo backlog (Plans 321, 322, 301, 303, 304, 310, 306, 122, 248) exists but
is out of scope for this plan and was not touched.

- [x] M0 complete — no blockers, findings folded into M1-M4 tasks below

### M1 — Shared libraries and query scripts

Node ESM, single quotes, no semicolons, no new dependencies (use `picomatch`/`minimatch`
only if already in `package-lock.json`).

- [x] A1: New `scripts/lib/slot.mjs` — `isSlot()`, `slotNumber()`, `ports()` (`{fe, be}`),
      `activePlanPath()` (from `.worktree-plan` or null), `listSlots()`
- [x] A2: New `scripts/session-state-path.mjs` — resolves one path via
      `SESSION_STATE_PATH` env → `.claude/.session-state-path` →
      `docs/session-state-<branch>.md`; falls back to `docs/session-state.md` only outside
      a slot; prints `NONE` and exits 0 in a slot with no branch file
- [x] A3: Rewire `scripts/session-startup.sh`, `scripts/handoff-check.sh`,
      `scripts/write-session-state.mjs` to resolve paths through `session-state-path.mjs`
      (no duplicated resolution logic)
- [x] A4: New `scripts/scope-check.mjs` — parses `## Read-Write Scope` fenced ` ```scope `
      block (one glob per line, `#` comments); always-allowed: plan file,
      `docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, hotspots
      (append-only, M4). Modes: `--file=<p>`, `--diff=<base>`, `--overlap --plan=<p>`,
      `--drift` (against `Snapshot:`, excluding the plan file, via `:(glob)` pathspecs).
      Plan defaults to `slot.activePlanPath()`; missing plan/scope block → exit 1
- [x] A5: `scripts/todo-query.mjs` — add `sync --plan NNN` (rebuild that plan's
      `### Plan NNN` section from its `## Atomic Sub-tasks` checkboxes via
      `lib/todo-parse.mjs`, creating the section if missing; print
      `TODO_QUERY: sync plan NNN (x/y done)`) and `sync --merged` (sync every plan whose
      `feat/NNN-*` branch merged into `origin/main` since last sync); update usage header

### M2 — Enforcement

- [x] A6: `scripts/branch-guard.sh` — read stdin with `plan-write-guard.sh`'s timeout
      pattern; on `main`, allow without switching when path matches
      `^plans/[^/]+\.plan\.md$|^\.claude/todo\.md$`; otherwise keep auto-switch (including
      empty stdin)
- [x] A7: New `scripts/scope-guard.sh` (PreToolUse, valid JSON) — silent allow when not a
      slot or no `.worktree-plan`; else run `scope-check.mjs --file=<path>`; deny with the
      `SCOPE_GUARD:` message on exit 1; allow with `SCOPE_GUARD: check failed (<reason>)`
      on internal error. Register in `.claude/settings.json` after `plan-write-guard.sh`,
      `"timeout": 10`
- [x] A8: New `.husky/pre-push` — for stdin lines with remote ref `refs/heads/main`, diff
      `<remote_sha>..<local_sha>` (`origin/main` when remote SHA is all zeros); exit 1 if
      any file falls outside `^plans/[^/]+\.plan\.md$|^\.claude/todo\.md$` with the
      `--no-verify is human-only` message; other branches pass untouched
- [x] A9: `scripts/ship-prep.mjs` — plan-only lane check before `SENSITIVE_PATHS_RE`;
      replace both `worktreeCount() > 1` triggers per M0 findings (in-slot: `scope-check.mjs
      --diff=origin/main` instead of manifest overlaps; outside slots: overlaps only when
      `listSlots()` shows a non-detached slot); `--check-baseline` re-reports the scope
      line in a slot
- [x] A10: Update `.claude/commands/ship.md` core (Phase 3/"On approval" stayed there —
      see corrected M0 finding above): scope-out hard STOP in Phase 3; `git fetch && git
      rebase origin/main` before Phase 4 (add/add conflicts in hotspots keep both sides,
      anything else escalates); "On approval" step 1 marks only the plan file's Atomic
      Sub-tasks in a slot, skipping `todo-query` mark / `todo-archive.mjs`

### M3 — Three permanent slots, per-slot ports, "execute plan"

Port map: `main` 4200/3000 (unchanged), `wt-1` 4201/3001, `wt-2` 4202/3002, `wt-3` 4203/3003.

- [x] A11: `angular.json` — add a `slot` configuration to both `build` and `serve`,
      copying `local` but swapping in `src/environments/environment.slot.ts` (generated,
      gitignored); default `ng build` unaffected
- [x] A12: Rewrite `.claude/skills/worktree-setup/SKILL.md` as one-time slot init: move
      `../foodVibe1.0-wt-parallel` to `-wt-1` only if clean (per M0, it currently has an
      untracked `.claude/dev-server.log` — decide whether to ignore/clean that file or
      report-and-stop); create missing slots detached at `origin/main`; `npm install`
      root + `server/`; write `.worktree-root`/`.worktree-port`; copy `server/.env` only
      (per M0, no root `.env` exists); start no servers
- [x] A13: New `scripts/take-plan.mjs <NNN>` (ports `claim-parallel-slot.sh` logic):
      slot-only guard; refuse on uncommitted/untracked non-ignored files; release a merged
      `feat/*` branch or refuse naming the holding plan; fetch + refuse if
      `plans/NNN-*.plan.md` isn't on `origin/main`; `git switch -c feat/NNN-<slug>
      origin/main`, write `.worktree-plan`, set `Status: active`, commit; conditional
      `npm install` via lockfile hash; generate `environment.slot.ts` with
      `http://localhost:300N`; port/PID bookkeeping via `.claude/.slot-pids` (refuse on a
      foreign PID, keep this slot's own, else spawn backend + `ng serve -c slot --port
      420N` detached with logs in `.claude/`); isolated DB via `MONGO_LOCAL_URI` =
      `foodvibe_wtN` + seed via `db-backup.js`/`db-restore.js` (confirmed CLI args: M0)
      when `Isolated DB: yes`; `claim_lock` via `session-lock.sh` or a ported helper in
      `lib/slot.mjs`; print `OK plan=NNN branch=... fe=420N be=300N db=shared|foodvibe_wtN`
      followed by `scope-check.mjs --drift`
- [x] A14: New `.claude/commands/take-plan.md` — run the script; stop on exit 1; on
      `REALITY: clean` execute milestones with no report; on `REALITY: drift` run the
      plan's Step 0 on the listed commits only, then STOP for a go
- [x] A15: `scripts/session-startup.sh` — replace the two-slot block (no auto-claim) using
      `node scripts/lib/slot.mjs --describe` (new small CLI entry); inject `PLANNER:` /
      `WORKER: plan=<path>` / `IDLE SLOT:` per slot state; keep the 1,500-char trimmed
      injection fed by `session-state-path.mjs`, nothing injected when it prints `NONE`
- [x] A16: Delete `scripts/claim-parallel-slot.sh` after porting. Live references gone;
      remaining hits are intentional history (`plans/323-*`, `plans/324-*`,
      `docs/session-state-feat-session-20260929.md` — pre-existing, not rewritten) and
      explicit "retired"/"the old two-slot system" mentions in the new docs/scripts that
      replaced it. `docs/agent/workflow-map.md`'s own two-slot section is still pending —
      that's M4 A24.
- [x] A17: `.gitignore` — added `.worktree-plan`, `.claude/.slot-pids`,
      `.claude/.last-npm-install-hash-server`, `src/environments/environment.slot.ts`
      (`.worktree-root`/`.worktree-port` were already ignored). Kept
      `.claude/.parallel-slot-a`/`-b` ignored rather than removing them — this very
      session's own SessionStart hook (pre-M3 code) had already written a stray
      `.claude/.parallel-slot-b`, proving old markers can still exist on disk even though
      nothing new writes them; safer to keep the ignore rule than let one become trackable.

### M4 — Methodology docs (compact — these load every session)

- [x] A18: `.claude/references/prd-template.md` — after `## Goals & Success Criteria`, add
      `Status:`/`Snapshot:`, `## Execution Mode`, `## Read-Write Scope` (fenced block +
      always-allowed line), `## Read Scope`, `## Escalation Protocol`, `Step 0 — Reality
      Check`
- [x] A19: `.claude/commands/plan.md` — Planner protocol: main clean + `git pull
      --ff-only`; `todo-query.mjs sync --merged` + `todo-archive.mjs` +
      `lib/slot.mjs --list`; ask about parallel execution → `scope-check.mjs --overlap`
      must report `OVERLAP: none`; save via save-plan with `Snapshot:` filled; `git add`
      only the plan file + `.claude/todo.md`, commit, push to `main`; end with "Plan NNN
      pushed. Open a free slot and say: execute plan NNN."
- [x] A20: `.claude/skills/save-plan/SKILL.md` — Phase 1: only the Planner (main, on
      `main`) assigns `NNN`/runs `todo-query append`; Phase 3: on `main`, commit only the
      plan file + `todo.md`; Phase 4: Workers append/mark `[x]` in their plan file only,
      never `todo.md`
- [x] A21: `docs/agent/job-validation.md` — same Worker-only-marks-plan-file rule
- [x] A22: `AGENTS.md` — Hard rule becomes "Never write on `main` — except the Planner
      committing `plans/*.plan.md` and `.claude/todo.md`"; add one compact
      Planner–Worker bullet (Golden Rule + escalation; append-only hotspots
      `src/styles.scss`, `public/assets/data/dictionary.json` (M0's confirmed real path),
      `src/app/app.routes.ts`; 3-slot port map; Workers never write `.claude/todo.md`;
      `--no-verify` is human-only); trigger rows for "execute/take plan NNN" →
      `take-plan.md`, worktree-setup → one-time slot init only
- [x] A23: `README_WORKFLOW.md` — rewrite Roles + Day-to-day loop (plan → push → "execute
      plan NNN" in a free slot → back to Planner → `/review-it` then `/ship` (PR) →
      Dandan merges → slot releases on next take); keep cost routing
- [x] A24: `docs/agent/workflow-map.md` — replace two-slot section with the slot model +
      port map; update hook rows for `scope-guard.sh` and `.husky/pre-push`; add rows for
      `take-plan.mjs`, `scope-check.mjs`, `lib/slot.mjs`, `session-state-path.mjs`,
      `todo-query sync`
- [x] A25: New ADR `docs/brain/decisions/0009-planner-worker-worktrees.md` (per M0, next
      number is `0009`) from `_TEMPLATE.md` — supersedes the two-slot system; direct
      `main` pushes for plans/todo via the admin bypass restricted by
      `branch-guard.sh`/pre-push; 3 permanent slots, manual take, lazy release; per-slot
      ports, shared DB by default / isolated on opt-in; append-only hotspots; conditional
      reality check; scope gate replaces manifest overlap in slots; `/ship` gate is the
      guarantee since Cursor has no hooks; mechanical steps live in scripts

### M5 — Verify and ship

- [ ] A26: Run every check in **Done when** below
- [ ] A27: Run `node scripts/plan-ledger-check.mjs` and `ng build`
- [ ] A28: Write the `sessions/` handoff
- [ ] A29: `/ship` on `chore/planner-worker-workflow` as one PR

## Rules

- Run M1 → M5 in order in one session, verifying each milestone before starting the next.
  Stop only at M0 (done) and on a real blocker.
- Mechanical logic goes in `.mjs` scripts that print a few lines. Command/doc prose only
  calls them. Never Read `.claude/todo.md` in full; use `todo-query.mjs`.
- Scripts fail loudly: exit 1 + message, never a silent "nothing to do". PreToolUse hooks
  are the exception: fail open, but always print a warning `agent_message` when they do;
  silent only on a real allow.
- Don't change the session-manifest format/location or `session-manifest-ship.py`'s contract.
- `session-startup.sh`, `handoff-check.sh`, `write-session-state.mjs` must all resolve
  paths through `session-state-path.mjs`. No duplicated resolution logic.
- Don't change `enforce_admins` or any GitHub branch protection.
- `server/`: no code changes. Ports, CORS, DB passed as environment variables only.
- `src/`: only the generated, gitignored `environment.slot.ts`. `angular.json` gets only
  the slot configuration.
- No new npm dependencies. `.mjs` files use single quotes, no semicolons.
- Hooks/scripts run on Windows under Git Bash or Node. Normalize `\` to `/`. Use
  `netstat -ano` and `tasklist` for port/PID checks.
- Idle slots are always detached at `origin/main`, never on `main`.
- `take-plan.mjs` never deletes uncommitted work, never force-switches, never kills a
  process it didn't start. Servers start only from `take-plan.mjs`.
- Don't edit existing ADRs. Keep `plan-write-guard.sh` and the similarity gate.
- If B2 merges mid-work — **confirmed already merged (M0)** — apply the ship.md edits to
  `docs/agent/ship-regular.md`/`ship-recovery.md` as needed.
- User-facing verify commands in docs are PowerShell.

## Done when

- Planner folder on `main`: writes to `plans/999-test.plan.md` and `.claude/todo.md` stay
  on `main`. A write to `README.md` auto-switches to `feat/session-*`.
- `pre-push`: a synthetic `refs/heads/main` push touching `src/` exits 1 with the
  `--no-verify` message. One touching only `plans/x.plan.md` and `.claude/todo.md` exits 0.
- Plan-only lane: `ship-prep.mjs` on a diff touching only
  `plans/325-foo-migration-spec.plan.md` and `.claude/todo.md` reports lane `ULTRA-TRIVIAL`.
- Slot init: after worktree-setup, `git worktree list` shows `foodVibe1.0-wt-1..3`, all
  detached at `origin/main`. No servers running.
- Two slots in parallel: "execute plan `<test>`" in `wt-1` and `wt-2` both print `OK ...`.
- `localhost:4201` calls `3001` and `localhost:4202` calls `3002` (DevTools Network), no
  CORS errors. Main's `4200`/`3000` untouched.
- Busy slot: re-taking `wt-1` while its plan is unmerged exits 1, names the holding plan.
- Port ownership: a foreign process on `3001` makes `take-plan` exit 1 naming the port;
  nothing is killed.
- Isolated DB: a plan with `Isolated DB: yes` runs its backend on `foodvibe_wtN`; other
  slots unaffected.
- Reality check: no in-scope commits since `Snapshot` → Worker starts with no report. An
  in-scope commit → stops with `REALITY: drift`.
- Scope enforcement (slot scoped to `docs/test/**`): editing `README.md` denied with
  `SCOPE_GUARD`; editing `docs/test/a.md` succeeds; a Bash edit to `README.md` makes
  `ship-prep` report `scope: out` and `/ship` stops.
- `ship-prep` in slots no longer calls `session-manifest-ship.py`, even with 4 worktrees.
- Ledger: `/ship` approval in a slot marks only the plan file. After merge, `todo-query.mjs
  sync --merged` prints the synced plan and `todo.md` shows it `[x]`.
- Idle slot shows only `IDLE SLOT`. `session-state-path.mjs` prints `NONE` there; nothing
  unrelated is injected.
- Cleanup and build: `grep -rn "claim-parallel-slot" .` returns nothing, `ng build` and
  `plan-ledger-check.mjs` pass, PR open for Dandan to merge.

## Technical Considerations

- Dependencies: `scripts/lib/todo-parse.mjs`, `scripts/session-lock.sh`,
  `scripts/claim-parallel-slot.sh` (ported then deleted), `.claude/settings.json` hooks,
  `.husky/pre-commit` (pattern to copy for `pre-push`), `server/index.js`,
  `server/app.js`, `server/db.js`, `src/environments/environment.local.ts`, `angular.json`.
- New files: `scripts/lib/slot.mjs`, `scripts/session-state-path.mjs`,
  `scripts/scope-check.mjs`, `scripts/scope-guard.sh`, `scripts/take-plan.mjs`,
  `.claude/commands/take-plan.md`, `.husky/pre-push`,
  `docs/brain/decisions/0009-planner-worker-worktrees.md`,
  `src/environments/environment.slot.ts` (generated, gitignored).
- No model/interface changes; this is tooling/process only, no `src/app` runtime code.

## Out of Scope

- `scripts/techdebt-scan.mjs` (Plan C) — not merged, not needed here.
- Any GitHub branch-protection or `enforce_admins` change.
- Rewriting existing ADRs.
- Unrelated open backlog (Plans 321, 322, 301, 303, 304, 310, 306, 122, 248).
