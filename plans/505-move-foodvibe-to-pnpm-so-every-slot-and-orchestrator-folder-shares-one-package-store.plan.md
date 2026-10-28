# Plan 505 — Move FoodVibe to pnpm so every slot and orchestrator folder shares one package store

Status: active
Depends-on: none
Snapshot: b71412a2a9ee86c50e47b5dd65001a84f00b5048

## Problem Statement

FoodVibe uses npm: `package-lock.json` at the root and in `server/`, and `npm ci` everywhere (CI, slots, orchestrator
folders). Every new folder (the 3 permanent `wt-N` slots, each orchestrator builder folder, the merge folder) gets its own
full copy of `node_modules`, so each run adds several copies to the Human's disk and each install takes minutes. pnpm keeps one
shared package store and builds each `node_modules` from hard links, so a new folder adds almost nothing and installs in
seconds. Kit v1.9.0 (synced on FoodVibe by plan 504) already supports this through `project.packageManager: pnpm` (the
security workflow, `worktree-setup`, the slot install step, the orchestrator's install step); the project's own move
(lockfiles, scripts, deploy, the FoodVibe-owned CI file) was left out of kit plan 028 and is this plan.

## Goals & Success Criteria

**Primary:** the root and `server/` install with pnpm from a committed `pnpm-lock.yaml` at the same package versions as today,
and every check that passed on npm passes on pnpm.

- [auto] `pnpm install --frozen-lockfile` exits 0 in the repo root and in `server/`.
- [auto] `pnpm run build`, `pnpm run lint`, `pnpm run test:ci`, `pnpm run test:scripts` (root) and `pnpm test` (in `server/`) exit 0, with the same pass counts as on `main` before the change (record both runs in Execution Notes).
- [auto] `package-lock.json` and `server/package-lock.json` no longer exist; `scripts/package-lock.json` stays (kit-managed, npm).
- [auto] `git grep -nE "npm (ci|install|audit)|cache: npm" -- .github render.yaml` prints only lines for the kit-managed `scripts/` folder (`npm ci --prefix scripts` and its report-only audit).
- [auto] The versions in `pnpm-lock.yaml` equal the old `package-lock.json` for `@angular/core`, `zod` and `rxjs`, and in `server/pnpm-lock.yaml` for `express` and `mongoose` (Worker runs `pnpm list` before deleting the npm lockfiles and after; output in Execution Notes).
- [auto] `node <kit>/tools/drift-check.mjs --target .` (or `kit-drift.ps1 -Target .`) reports no `drift` for the files the sync re-rendered.
- [human] All CI checks are green on the PR.
- [human] After the merge, the Human changes the Render build command in the Render dashboard to the one in `render.yaml` (the live service does not read `render.yaml`), and the next deploy builds and starts (the app opens at https://foodvibe1-0-1-frankfurt.onrender.com).
- [human] In a fresh slot or orchestrator folder, the install finishes in well under a minute and the folder's `node_modules` takes little new space (folder size in Explorer before and after).

## Execution Mode
- Parallel: no
- Concurrent plans: none (it rewrites lockfiles and CI; no other plan may run during it, and every slot re-installs after the merge)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`CHANGELOG.md, README.md` — add to them, never rewrite or remove an existing entry without escalating).

```scope
package.json
package-lock.json
pnpm-lock.yaml
.npmrc
server/package.json
server/package-lock.json
server/pnpm-lock.yaml
kit.config.json
.github/workflows/**
render.yaml
README.md
CHANGELOG.md
scripts/qa/qa-nightly-up.ps1
scripts/orch-preflight.mjs
scripts/orch-state.mjs
scripts/lib/slot-procs.mjs
scripts/slot-serve.mjs
scripts/take-plan.mjs
.claude/skills/worktree-setup/SKILL.md
docs/agent/orchestrator.md
docs/workflow-kit/**
.claude/workflows/orchestrate.js
.kit/install.json
```

The `scripts/…`, `.claude/skills/worktree-setup/…` and `docs/agent/orchestrator.md` lines are there only for what the kit
sync re-renders (A5); the Worker never hand-edits them. A sync that changes a file outside this list → Escalation Protocol.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — package manager, lockfiles, CI and deploy commands only; no app, server route or data rule changes.

## Reuse Check
- none — tooling and CI change; no new component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol and print one line per commit: `ok` or `conflict: <what>`. STOP only on a `conflict`.

## Functional Requirements

### Must Have (P0)
- A1: pnpm available — the Human runs `corepack enable` (or `npm install -g pnpm`) once; `package.json` and `server/package.json` get a `packageManager` field pinned to the installed version (`pnpm@<pnpm --version>`), so CI, Render and slots use the same one.
- A2: lockfiles — before anything else, record `npm ls @angular/core zod rxjs` (root) and `npm ls express mongoose` (server). Then `pnpm import` in the root and in `server/` creates `pnpm-lock.yaml` from the existing `package-lock.json` (same versions), then both `package-lock.json` files are deleted. Two independent projects, **no** `pnpm-workspace.yaml` (a workspace would merge them into one lockfile and change how `server/` installs on Render). `scripts/` stays on npm (kit-managed).
- A3: strictness — run the checks on pnpm's default (strict) layout first. A missing-package failure is fixed by adding that package as an explicit dependency (same version as the old lockfile) of the folder that imports it; only if that is not possible, `.npmrc` gets `node-linker=hoisted` (hard links from the store still apply), and the reason goes in Execution Notes. Watch `server/` code that loads the built `shared/schemas` output: it resolves `zod` from the root `node_modules`.
- A4: scripts and deploy — in both `package.json` files, `npm run` / `npm --prefix` / `npx` inside scripts become `pnpm run` / `pnpm --dir` / `pnpm exec` (`build:render`, `serve:prod`, `dev:local`, `deploy:gh-pages`, server `pretest`). `render.yaml` `buildCommand` becomes `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --dir server install --frozen-lockfile && pnpm run build:render` — `--prod=false` is required because the service sets `NODE_ENV=production`, under which pnpm skips devDependencies (the Angular CLI). Start command stays `node server/index.js`. The Worker lists each changed line in Execution Notes and leaves the exact build command for the Human's Render dashboard step.
- A5: CI and kit-rendered files —
  - `kit.config.json` gets `project.packageManager: pnpm`; run the kit sync at the synced version (`kit-sync -Ref v1.9.0 -Apply`, per ADR 0021). It re-renders the kit-owned `security.yml` (pnpm setup, `pnpm audit`) and the slot / orchestrator install steps. Record the list of files it changed in Execution Notes.
  - `.github/workflows/ci.yml` is a FoodVibe **override** (the sync never writes it), so it is edited by hand: `pnpm/action-setup` before `setup-node`, `cache: pnpm`, `cache-dependency-path` → the two `pnpm-lock.yaml` files, `npm ci` → `pnpm install --frozen-lockfile` (root and `--dir server`), `npx ng …` → `pnpm exec ng …`, `npm test --prefix server` → `pnpm --dir server test`. Copy the shape from the kit's `core/.github/workflows/ci.yml` pnpm branch. Update the override's `reason` in `kit.config.json` to mention pnpm.
  - `rules.yml` keeps `npm ci --prefix scripts`; its `npm run lint:*` lines only run `node` scripts and need no change.
  - The root and server production audit becomes `pnpm audit --prod --audit-level critical` (from the sync; `npm audit` needs a `package-lock.json`). The `scripts/` report-only audit stays npm.
- A6: nightly QA — `scripts/qa/qa-nightly-up.ps1` (FoodVibe-owned) runs `npm ci` for the root and `server/` from a lockfile hash; switch it to `pnpm install --frozen-lockfile` and the hash to `pnpm-lock.yaml`.

### Should Have (P1)
- B1: docs — `README.md` setup lines and `CHANGELOG.md` say pnpm; the commands a Human copies use `pnpm`. Note in README that the pnpm store must be on the same drive as the project (`C:`).

## Atomic Sub-tasks

- [x] A1: Install pnpm once and pin its version so the Human, CI, Render and slots all use the same one — packageManager field — package.json, server/package.json (the Human runs the install)
- [x] A2: Create pnpm lockfiles at today's exact package versions and remove the npm ones — npm ls before, pnpm import, no workspace file — pnpm-lock.yaml, server/pnpm-lock.yaml, package-lock.json, server/package-lock.json
- [x] A3: Make the app and server build and test under pnpm's strict layout, adding any undeclared dependency — node-linker=hoisted only as fallback — package.json, server/package.json, .npmrc
- [x] A4: Switch the package scripts and the Render build to pnpm, keeping dev tools installed on Render — --prod=false because NODE_ENV=production — package.json, server/package.json, render.yaml
- [x] A5: Switch CI, the security audit and the slot and orchestrator installs to pnpm — packageManager setting + kit-sync; ci.yml is an override, edited by hand — kit.config.json, .github/workflows/**, kit-rendered files
- [x] A6: Make the nightly QA install use pnpm so it does not break on the missing npm lockfile — scripts/qa/qa-nightly-up.ps1
- [x] B1: Tell people to set up with pnpm in the readme and record the switch in the changelog — README.md, CHANGELOG.md

## Technical Considerations
- Dependencies: kit v1.9.0 synced (plan 504). The Worker checks that `kit.config.json` with `packageManager: pnpm` passes the kit's validation (the sync refuses a bad value).
- Windows: pnpm's store must be on the same drive as the project folders (`C:`) for hard links; the default store is under `%LOCALAPPDATA%\pnpm`. A project on another drive would silently copy.
- Render: the live service `foodvibe1-0-1-frankfurt` was created by hand and does **not** read `render.yaml`; the build command change only takes effect when the Human pastes it into the dashboard. Order: merge → Human updates the dashboard build command → deploy. Until then, the old `npm ci` build fails (no lockfile), so do the dashboard step right after the merge.
- Kit-owned commands that say `npm run <script>` (`/ship`, `take-plan`, orch gate) keep working: `npm run` only runs `package.json` scripts and does not care which tool installed `node_modules`. Husky's `npx lint-staged` also keeps working.
- Kit-owned files may be write-guarded in a slot; the sync runs as a shell command, so the guard does not apply to it. Hand edits go only to `ci.yml` (override) and non-kit files.
- Backend / API: none. Auth and validation: none. Security surface: CI install and audit commands change; `pnpm install --frozen-lockfile` fails on a lockfile that does not match `package.json`, and `pnpm audit` keeps the critical-advisory gate. Data / migration: none.
- Risk: Angular builders, Karma, Playwright, husky (`prepare`) and `knip` / `depcheck` (`audit:deadcode`) are the usual places a strict layout shows a package the code uses without declaring.
- Project checks (`docs/agent/plan-checks.md`): no app or server code changes → no log-query Done-when item; Reuse Check filled (none); no hotspot, translation or data change.
- After the merge, every `wt-N` slot and any orchestrator folder needs one `pnpm install` (the slot install step does it on the next `take-plan` / `slot-serve`, because the lockfile changed). Old npm `node_modules` there are replaced.

## Out of Scope
- Moving `scripts/` (kit-managed) off npm, or changing any kit file in the kit repo.
- Upgrading any dependency version.
- Deleting old leftover folders (a separate cleanup the Human does).

## Critical Questions
- Q: Does Render's build allow `corepack enable`? A: open — the Worker confirms from Render's current docs; fallback `npm install -g pnpm@<pinned> && …` in the build command.

## Architect + PM review (2026-10-28, Planner)
- `ci.yml` is listed as an override in `kit.config.json`, so the kit sync does not re-render it (the draft assumed it did) → hand-edit added to A5. `security.yml` is kit-owned and the sync does re-render it.
- `npm audit` fails without `package-lock.json` → the audit switch is now explicit in A5 and in the grep Done-when item.
- Render sets `NODE_ENV=production`, which makes pnpm skip devDependencies → `--prod=false` in A4.
- The live Render service ignores `render.yaml` → Human dashboard step added to Done-when and Technical Considerations.
- `pnpm-workspace.yaml` removed from scope: two independent lockfiles keep `server/` installing on its own.
- Added A6 (`qa-nightly-up.ps1` runs `npm ci`), server tests and server version checks, and a kit drift check.

## Execution Notes

- pnpm pinned: `pnpm@10.34.6` (`packageManager` in both `package.json` files). Run here through `corepack pnpm@10.34.6` (pnpm not yet on the Human's PATH).
- Versions before (npm ls) → after (pnpm list), identical: root `@angular/core` 19.2.21, `rxjs` 7.8.2, `zod` 4.6.5; server `express` 4.22.3, `mongoose` 8.24.5. All 64 direct dependencies (46 root, 18 server) compared between `package-lock.json` and `pnpm-lock.yaml`: 0 differences.
- Checks, npm baseline → pnpm run 1 → pnpm run 2:
  - `build`, `lint`: exit 0 / 0 / 0
  - `test:ci`: 1598/1598 / 1598/1598 / 1598/1598
  - `test:scripts`: 128/128 / 128/128 / 128/128
  - server `test`: 769/774 (5 fail, admin-businesses) / 761/774 (13 fail, business-stats) / 774/774. Every failure is the same pre-existing flake (`E11000 duplicate key … users index: email_1 dup key: { email: null }`), on a different file each run; not pnpm-related (see seen-decision below).
- A3 strict layout: no missing-package failure; no `.npmrc`, no `node-linker=hoisted`. pnpm 10 skips dependency install scripts by default → `pnpm.onlyBuiltDependencies` lists the ones npm used to run: root `@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`; server `mongodb-memory-server` (npm's `allowScripts` entry).
- A4 changed lines: `build:render`, `serve:prod`, `dev:local`, `deploy:gh-pages` (root), `pretest` (server); `render.yaml` buildCommand → `npm install -g pnpm@10.34.6 && pnpm install --frozen-lockfile --prod=false && pnpm --dir server install --frozen-lockfile && pnpm run build:render`. Start command unchanged (`node server/index.js`).
- Critical question (Render + corepack): Render lists `pnpm install` as a Node build command; Node 25+ no longer ships corepack and `engines` is `>=22`, so the build uses the plan's fallback (`npm install -g pnpm@<pinned>`) instead of `corepack enable`. This is the one `npm install` line the grep Done-when prints outside `scripts/`: it installs pnpm itself, not the app.
- A5 kit sync (`tools/sync.mjs --ref v1.9.0 --apply`): 7 kit-update — `.claude/skills/worktree-setup/SKILL.md`, `.claude/workflows/orchestrate.js` (approved: out of scope), `.github/workflows/security.yml`, `docs/agent/orchestrator.md`, `scripts/lib/slot-procs.mjs`, `scripts/orch-preflight.mjs`, `scripts/orch-state.mjs`; plus `.kit/install.json` (approved). `kit.config.json`: `project.packageManager: pnpm`, `ci.install: pnpm install --frozen-lockfile` (the kit refuses pnpm with an npm `ci.install`).
- A5 gap: kit v1.9.0 `security.yml` renders pnpm installs but still `npm audit` for root and server (fails with no `package-lock.json`). Human chose `override security.yml`: now a FoodVibe override (kit.config.json + drift-classification.md) running `pnpm audit --prod --audit-level critical`; local run exits 0 (root 17 high / 12 moderate, server 2 high / 2 moderate, 0 critical). Kit follow-up: render pnpm audit in `core/.github/workflows/security.yml`, then drop the override.
- Drift check: `KIT_DRIFT` lists only `docs/agent/standards-git.md` (drift before this plan, untouched); no drift on the synced files.
- decision: behaviour: pinned pnpm 10.34.6 (mature 10.x line, a month old) instead of the 12.x `latest` (days old, rewritten CLI) — reverse: set `packageManager` to `pnpm@12.x` in both package.json files, `render.yaml` and README, then reinstall.
- decision: behaviour: Render build installs pnpm with `npm install -g pnpm@10.34.6` instead of `corepack enable` (Node 25+ has no corepack) — reverse: swap that prefix for `corepack enable` and pin Node to 24 on Render.
- decision: seen: server/test/admin-businesses.test.js:36 and server/test/business-stats.test.js — tests insert users without an email while a unique `email_1` index exists; which file fails depends on order, so server tests are flaky on npm and pnpm alike.
- decision: seen: .claude/commands/review.md:15-21 — the review diff excludes `package-lock.json` only; `pnpm-lock.yaml` / `server/pnpm-lock.yaml` hunks will now show in full (kit-owned file).
- decision: seen: scripts/pre-commit-secret-scan.mjs:19 skips `package-lock.json` only; the pnpm lockfiles currently match no secret pattern (checked), so nothing breaks today.
- PR #468 checks round 1: `lint` failed (script tests could not find `picomatch`: npm hoisted it into the root `node_modules`, pnpm does not) → ci.yml lint job now runs `npm ci` inside `scripts/` first (same step as the kit template); `rules` failed on `kit-manifest-check` (manifest still named `server/package-lock.json` for ci.yml) → `docs/workflow-kit/manifest.json` ci.yml entry updated to the pnpm strings.
