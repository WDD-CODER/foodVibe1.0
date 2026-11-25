# Plan 738 — Make the repository look professional to a recruiter

Status: draft
Depends-on: none
Track: code
Snapshot: 84703cef

## Problem Statement
Dandan (2026-11-25) wants the public GitHub repository to read well to a recruiter. His decisions: the license is
"all rights reserved"; the AI workflow is kept and shown off; the workflow kit itself is private and is described by
its outcomes only (plans with acceptance criteria, an orchestrator that builds, reviews and merges plan by plan, CI and
invariant gates, human validation cards) — not linked and not explained in a way someone could copy. The live demo is
https://foodvibe1-0-1-frankfurt.onrender.com/ (Render free tier: the first load can take about 50 seconds; new users
get 100 AI calls, plan 736).

Verified on `origin/main` 84703cef:
- `README.md` (71 lines) is still the Angular CLI starter text under the title `# FoodVibe10`. There is no `LICENSE`,
  `CONTRIBUTING.md` or `SECURITY.md`. The repository is **public**; its GitHub description is "First Angular project",
  with no homepage, no topics and no license (`gh repo view`).
- The two root screenshots (`Screenshot 2026-08-12 094815.png`, `Screenshot 2026-08-12 094821.png`) and
  `UI refactor and design.zip` are **not tracked**: `git ls-files` does not list them, `.gitignore:95` (`*.png`) and
  `.gitignore:144` (`/UI refactor and design.zip`) already ignore them. They exist only in the Human's main folder;
  there is nothing to delete from git.
- `.gitignore:95-97` ignores every `*.png`/`*.jpg`/`*.jpeg`, with carve-outs only for `.interface-design/source/**`
  and `public/icons/*.png`. Screenshots under `docs/images/` need their own carve-out or they never reach GitHub.
- `README_WORKFLOW.md` is kit-owned (`docs/workflow-kit/kit-owned.json:88`, and `ROOT_FILES` in
  `scripts/kit-manifest-check.mjs`), so it **stays at the root**.
- `ROUTE_INVENTORY.md` (April 2026 mobile audit, last changed 8089bff6) is read by no script, hook or workflow; its
  only mentions are closed plan 262, `.claude/todo-archive/009.md` and `reports/dead-code-audit-2026-11-06.md:114`,
  which already names it as unreferenced. It can move.
- `.clone/worktrees/tingly-nibbling-puffin/src/app/core/services/http-storage.adapter.ts` is a stray tracked copy
  from a deleted worktree (added in a899e371); nothing reads `.clone/`.
- `package.json` `"name"` is `food-vibe1.0` (not `FoodVibe10` — that is only the README title). Nothing reads the
  package name: the build output folder is set explicitly by `angular.json:20` (`"outputPath": "dist/food-vibe1.0"`,
  served by `server/app.js:40`), `pnpm-lock.yaml` does not contain it, and no script uses `npm_package_name`.
- CI on `main`: the latest `ci` run (45575222712, plan 734 save) is green. The last failed one, 45562455838
  (plan 733 save, 2026-11-25 06:41), failed in `server-tests` only:
  `test/ai-logistics-extract.test.js:128` — `expected [] to have a length of 1 but got +0` on the `aiUsage` rows.
  Cause: `recordAiUsage` (`server/services/ai-usage.js:89-116`) writes the usage row fire-and-forget, and this test
  reads `aiUsage` right after the response without `await _waitForUsageWritesForTests()` (the helper at
  `server/services/ai-usage.js:161`, used by `ai-cap`, `ai-usage`, `ai-diag-menu`, `ai-invoice-read`,
  `ai-voice-transcribe` tests). `server/test/ai-stock-extract.test.js:210` has the same race. The same code passed on
  the next push, so it is a timing flake, and the fix is two lines.
- The run before (45353386872, 2026-11-24) failed differently: `MongoMemoryServer` could not unlock
  `/home/runner/.cache/mongodb-binaries/8.2.6.lock` (`UnableToUnlockLockfileError`) and three test files hit
  `Hook timed out in 60000ms`. That is a CI binary-cache race, not this plan's fix (Out of Scope; named for a later plan).

## Goals & Success Criteria
**Primary:** a recruiter opening the repository sees a real README (what FoodVibe is, a live demo, screenshots,
features, stack, architecture, tests, how it is built), a clear all-rights-reserved license, a tidy root, and a green
CI badge.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0; `pnpm run test:server` exits 0, including `server/test/ai-logistics-extract.test.js` and `server/test/ai-stock-extract.test.js` (A1).
- [auto] `pnpm run test:server` run three times in a row exits 0 each time (A1 removes the race; paste the three summary lines).
- [auto] `git ls-files .clone ROUTE_INVENTORY.md .qa-reports` prints nothing; `git ls-files LICENSE CONTRIBUTING.md SECURITY.md docs/archive/route-inventory-2026-04.md` prints all four.
- [auto] `git check-ignore -q docs/images/dashboard.png` exits 1 (the carve-out works) and `git check-ignore -q "Screenshot 2026-08-12 094815.png"` exits 0 (stray root shots stay ignored).
- [auto] `grep -ciE "ai-workflow-kit|README_WORKFLOW|workflow-kit|\.claude/|orchestrator-runs" README.md` prints `0` (the kit is described, never linked or pointed at).
- [auto] `grep -c "All rights reserved" LICENSE` prints at least `1`; `grep -c '"name": "foodvibe"' package.json` prints `1`.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0 (root files the kit inventories are unchanged).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/738-repo-readme-license-and-tidy.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/738-repo-readme-license-and-tidy.plan.md` exits 0.
- [auto] `node scripts/scope-check.mjs --diff=origin/main --plan=plans/738-repo-readme-license-and-tidy.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Card — read the README on GitHub as a recruiter: open the branch's README on github.com; in under two minutes you can say what FoodVibe does, open the live demo from the link, see the screenshots, and nothing reads as unfinished or explains how to copy the workflow.
- [human] Card — the license: on the branch's repository page, the side panel shows «View license» (GitHub's label for a license it does not recognise), and opening it shows "All rights reserved" with your name.
- [human] Card — only when A3 could not take real screenshots: open the app at the slot's page, take the listed screenshots and drop them into `docs/images/` under the names A3 listed (the builder names them under Execution Notes).

## Execution Mode
- Parallel: yes — the only code-side files are two server tests; plan 736 (AI allowance) adds server AI tests but not these two files. If 736 runs in the same batch, it must not edit `server/test/ai-logistics-extract.test.js` or `server/test/ai-stock-extract.test.js`.
- Concurrent plans: any that do not write `README.md`, `.gitignore`, `package.json` or the two tests.
- Isolated DB: no — screenshots read the slot's local database; nothing is written.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
docs/images/**
docs/archive/route-inventory-2026-04.md
docs/archive/qa-reports-2026-04/**
ROUTE_INVENTORY.md
.qa-reports/**
.clone/**
.gitignore
package.json
server/test/ai-logistics-extract.test.js
server/test/ai-stock-extract.test.js
```

`ROUTE_INVENTORY.md`, `.qa-reports/**` and `.clone/**` are listed so they can be moved or removed with `git mv` /
`git rm`; nothing else is written there.

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — documents, root hygiene, `.gitignore`, the `package.json` name field and two server tests
  only. No app or server code, route, schema, permission, AI call or data change. Money fields and module gating:
  untouched. The two tests only wait for the existing usage writes before reading them; the behaviour they check
  (one `aiUsage` row per real model call, INV-6's ledger) is unchanged.

## Reuse Check
- none — no component, util, pipe, service or `.c-*` class is created; the README's diagram is a Mermaid block in Markdown.

## Defaults

- confirm-destructive-action — exception — why: no app screen changes; the only removals are a stray tracked copy (`.clone/`) and git moves, all in the diff for review.
- empty-state-on-list — exception — why: no list is built.
- loading-and-error-states — exception — why: no screen is built; the README states the demo's cold start (about 50 seconds) so a slow first load is expected.
- unsaved-changes-on-leave — exception — why: no form is built.
- hints-in-tooltips — exception — why: no control is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built.
- one-breakpoint-set — exception — why: no SCSS is written.
- unit-dropdown-add — exception — why: no dropdown or unit field is built; "unit" here means unit tests.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who built his own kitchen app, I want a recruiter who opens my repository to understand in two minutes what it does, try it live and see how well it is built, so that it works as my portfolio.
- As a chef who built his own way of working with AI, I want the repository to show what that workflow achieves without giving it away, so that it stays mine.

## Functional Requirements

### Must Have (P0)
- [ ] **CI flake fixed:** in `server/test/ai-logistics-extract.test.js` (the test at line 123) and `server/test/ai-stock-extract.test.js` (before line 210), `await _waitForUsageWritesForTests()` (required from `../services/ai-usage`, as the other AI tests do) right before reading `aiUsage`. No other test change.
- [ ] **README.md** rewritten, in English, in this order:
  1. Title `# FoodVibe`, the CI badge `[![ci](https://github.com/WDD-CODER/foodVibe1.0/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WDD-CODER/foodVibe1.0/actions/workflows/ci.yml)` and stack badges (shields.io static badges: Angular 19, TypeScript 5.7, Node.js / Express 4, MongoDB / Mongoose 8, Zod 4, Playwright), then the one-liner: "FoodVibe — kitchen and food-business management: recipes and costing, events, inventory and suppliers, CRM, a front desk and AI helpers. Hebrew, right-to-left."
  2. **Live demo:** the link https://foodvibe1-0-1-frankfurt.onrender.com/ and the note "Hosted on Render's free tier: the first load can take about 50 seconds while the server wakes up. New accounts get 100 AI calls."
  3. **Screenshots:** 3–5 images from `docs/images/` (A3), each with a one-line caption.
  4. **Features:** one bullet per area — recipes and dishes with live costing; events and menus; inventory, stock counts and suppliers; CRM and quotes; the front desk; AI helpers (menu drafts, invoice and stock reading, voice notes) — each in one sentence, only what exists on main.
  5. **Tech stack:** a short table: client (Angular 19 standalone, signals, OnPush, RTL SCSS), server (Node, Express, Mongoose), shared (one Zod schema package used by both sides), data (MongoDB Atlas), AI (Google Gemini, called only from the server), tests (Karma/Jasmine, Vitest + in-memory MongoDB, Playwright), hosting (Render).
  6. **Architecture:** a Mermaid `flowchart` — Browser (Angular app) → Express API (`/api/v1`) → MongoDB; Express → Gemini; `shared/schemas` (Zod) feeding both the app and the API — plus two sentences: the server validates every write with the shared schemas; the AI key never leaves the server.
  7. **Run it locally:** `pnpm install`, `pnpm --dir server install`, copy `server/.env.example` to `server/.env`, `pnpm --dir server run dev:local` and `pnpm run dev:local`, then `http://localhost:4200/`. One line pointing to `server/.env.example` for the settings; no secrets, no machine paths.
  8. **How it is tested:** the counts from A2 (unit tests, server tests, end-to-end tests) and one line each on what they cover; "every pull request runs lint, build, unit, server and secret-scan checks in CI".
  9. **How I build: an AI-assisted workflow** — the 5–6 lines in UI/UX Notes, outcomes only.
  10. **Project status:** "Active personal project, built and maintained by one developer since February 2026 (first commit 2026-02-01); in use as a working kitchen tool and as a portfolio."
  11. **License:** "All rights reserved — see [LICENSE](LICENSE). Viewing only."
  12. **Author:** Dan Weibren, with a GitHub profile link (`https://github.com/WDD-CODER`).
- [ ] **LICENSE:** "Copyright (c) 2026 Dan Weibren. All rights reserved." followed by: the source is published for viewing only; no permission is granted to copy, modify, distribute, sublicense or use it, in whole or in part, without the author's prior written permission; provided "as is", without warranty.
- [ ] **CONTRIBUTING.md** (short): a private project that does not take outside contributions; questions and reports go to the author; how work is done here, in outcome terms — every change starts as a written plan with acceptance criteria, goes through a branch and a pull request, passes CI (lint, build, unit and server tests, secret scan) and the architecture gates, and a person validates what a test cannot. No file paths into the workflow tooling.
- [ ] **SECURITY.md:** report a vulnerability privately to the author (GitHub private vulnerability report or the author's email, not a public issue); what to include; the secrets policy — secrets live only in environment files that are never committed, the repository is scanned for secrets on every push (gitleaks in CI), the AI key is used only by the server.
- [ ] **Root tidy** — exactly these, each with `git mv` / `git rm` so history is kept:
  - `ROUTE_INVENTORY.md` → `docs/archive/route-inventory-2026-04.md` (no live reference to update; closed plans and `.claude/todo-archive/` are history and keep the old name).
  - `.qa-reports/` (two April 2026 reports) → `docs/archive/qa-reports-2026-04/`.
  - `.clone/` → `git rm -r` (stray worktree copy).
  - `.gitignore`: append `/.clone/`, `/Claude outputs/` and the carve-out `!docs/images/*.png` (next to the existing carve-outs, after `.gitignore:97`).
  - Everything else stays (decisions table in Technical Considerations).
- [ ] **package.json** `"name"`: `food-vibe1.0` → `foodvibe`. `angular.json` and `dist/food-vibe1.0` stay as they are.

### Should Have (P1)
- [ ] none — the workflow section stays text only; no screenshot of the tooling is taken.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
No app screen and no dictionary key. The README's workflow section, to use as written (wording may be tightened, no
new facts added):

> **How I build: an AI-assisted workflow**
> - Every change starts as a written plan with a problem statement, a scope it may touch and acceptance criteria.
> - An orchestrator builds the plans one by one on their own branches, has each one reviewed against its plan, and merges it only when the checks pass.
> - CI and architecture gates run on every pull request: lint, build, unit and server tests, secret scanning, and checks that no change breaks the project's written invariants.
> - What a machine cannot judge — how a screen looks and feels — goes to me as short validation cards, and nothing ships until I sign them off.
> - Lessons from each run become written rules, so the next plan starts from them.

Screenshots (A3): file names `docs/images/<screen>.png`, 1280 px wide desktop shots of the Hebrew UI, PNG.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Stop the server test that sometimes fails on main — wait for the usage writes before reading them, in both tests; run `pnpm run test:server` three times — server/test/ai-logistics-extract.test.js, server/test/ai-stock-extract.test.js
- [ ] A2: Count the tests for the README — unit: the `Executed N of N` line of `pnpm run test:ci`; server: the `Tests N passed` line of `pnpm run test:server`; end-to-end: the `Total: N tests` line of `pnpm exec playwright test --list`; paste the three lines under Execution Notes — (no file)
- [ ] A3: Take the screenshots from the running app — in the slot (`node scripts/slot-serve.mjs`), with gstack `/browse`, signed in as the QA user (the `ORCH_QA_USER` / `QA_USER` login the e2e `signInQa` helper uses; never print it), take the dashboard, the recipe or dish page with costing, an event, inventory, and one AI helper screen; check each image shows no real person's name, phone or email (blur or skip it); if the app cannot be signed into or the data is empty, take none and list the names for the Human's card — docs/images/**
- [ ] A4: Write the new README — the twelve sections of P0 with A2's counts and A3's images — README.md
- [ ] A5: Add the license, the contributing note and the security note — LICENSE, CONTRIBUTING.md, SECURITY.md
- [ ] A6: Tidy the root folder — the moves and removal of P0 with `git mv` / `git rm`, the `.gitignore` additions, the package name — ROUTE_INVENTORY.md, .qa-reports/**, .clone/**, docs/archive/**, .gitignore, package.json
- [ ] A7: Run every automatic check and paste the outputs under Execution Notes — all `[auto]` items

## What happens when
- The slot's database is empty or holds real customer data: A3 takes no screenshot of that screen; the README keeps the section with the images that are clean, and the third `[human]` card lists the missing ones.
- `pnpm run test:server` still fails after A1 on another `aiUsage` read: the same race in another file; add the same wait there only if the file is one of the two listed, else record it under Execution Notes as `seen:` and escalate with `approved: <path>`.
- The CI run on the branch fails with the MongoMemoryServer lockfile error: rerun it once; it is the binary-cache race named in the Problem Statement, not this plan's change.
- GitHub does not show «View license»: that happens only when no `LICENSE` file is at the root of the default branch — the card is read on the branch's own page, where GitHub shows it after the merge; the Human checks it again on main.

## Technical Considerations
- Dependencies: none. Plan 736 sets the "100 AI calls" the README mentions; if 736 is not merged when this one is, the sentence still describes the intended live behaviour — the builder writes it as stated and notes it under Execution Notes.
- New files needed: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/images/*.png`, `docs/archive/route-inventory-2026-04.md`, `docs/archive/qa-reports-2026-04/*`.
- Model changes: none. Backend / API: none. Data / migration: none.
- The repository is public and already contains the workflow's own files (`README_WORKFLOW.md`, `.claude/`, `scripts/`, `docs/workflow-kit/`). This plan only keeps the README from linking or explaining them; making that tooling private is not in scope (Critical Questions).
- Per-folder decisions (grep of `scripts/`, `.claude/`, `.github/`, `.husky/`, `kit.config.json`, `package.json`):

  | Folder / file | Decision | Why |
  | --- | --- | --- |
  | `README_WORKFLOW.md` | keep at root | kit-owned (`kit-owned.json:88`), in `kit-manifest-check.mjs` `ROOT_FILES` |
  | `ROUTE_INVENTORY.md` | move → `docs/archive/route-inventory-2026-04.md` | nothing reads it; stale April audit |
  | `.qa-reports/` | move → `docs/archive/qa-reports-2026-04/` | no script reads it; two April reports. `docs/agent/workflow-map.md:217` (kit-owned) names the folder generically; it stays as is |
  | `.clone/` | `git rm -r` + ignore | stray copy of one source file from a deleted worktree |
  | `notes/` | keep | `scripts/github-sync-gate.mjs:25` writes `notes/github-sync/`; `ci.yml:41` treats it as docs-only |
  | `sessions/` | keep | the Contractor hand-off folder in the kit-owned `docs/agent/workflow-map.md:17,213`; `ci.yml:41` docs-only path |
  | `_claude-data/` | keep | `scripts/design-feature-inventory.mjs:31` reads `_claude-data/design-migration/screens/_registry.md`; `.claude/commands/design-port.md` writes there |
  | `bugs/` | keep | `scripts/qa/code-qa/*.mjs` and `scripts/qa/qa-nightly-*.ps1` write `bugs/qa-runs/` |
  | `reports/` | keep | `tools/dead-code-audit/README.md:3,5` and `docs/brain/patterns/split-catalog-scan-from-filter-decoration.md` link it; `docs/workflow-kit/manifest.json:3084` lists it as a ref |
  | `tools/` | keep | real tooling, called by `scripts/lib/orch-run.mjs:332` (`node tools/…`) and the kit agent eval |
  | `tmp/`, `.tmp-screenshots/` | keep (untracked) | `tmp` is ignored (`.gitignore:5`); neither is in git |
  | `Claude outputs/` | ignore | untracked, the Human's local folder; appended to `.gitignore` |
  | root screenshots, `UI refactor and design.zip` | nothing in git | untracked and ignored already; the Human may delete the local copies in the main folder |
  | `package.json` name | rename → `foodvibe` | nothing reads it; the dist folder comes from `angular.json:20` |

- Planner step after the merge (not the builder) — set the GitHub description, homepage and topics:
  `GITHUB_TOKEN= gh repo edit WDD-CODER/foodVibe1.0 --description "Kitchen and food-business management: recipes and costing, events, inventory, CRM, front desk and AI helpers. Angular 19 + Node/Express + MongoDB, Hebrew RTL." --homepage "https://foodvibe1-0-1-frankfurt.onrender.com/" --add-topic angular,typescript,nodejs,express,mongodb,zod,playwright,signals,rtl,hebrew,restaurant-management,food-costing`
- Follow-up for the Planner (not built here): the CI MongoMemoryServer lockfile race (run 45353386872) — a later plan can pre-download the MongoDB binary once per job or set a per-job download dir.

## Out of Scope
- Making the workflow tooling private or removing it from the public repository.
- GitHub repository settings (the Planner's `gh repo edit` step above).
- Any app behaviour, UI text or dictionary change; the AI allowance itself (plan 736).
- The CI MongoMemoryServer lockfile race (named above for a later plan).
- Moving `notes/`, `sessions/`, `_claude-data/`, `bugs/`, `reports/` or `tools/` (each is read or written by tooling).

## Critical Questions
- none — Dandan's decisions of 2026-11-25 settle the license, the workflow showcase and the demo link. One fact for
  him to know, not a blocker: the repository is public and already holds the workflow's files (`README_WORKFLOW.md`,
  `.claude/`, `scripts/`, `docs/workflow-kit/`), so "not linked" keeps the README from pointing at them but does not
  hide them; anything further is a separate decision.

## Execution Notes
- Planner 2026-11-25: written from Dandan's requests of 2026-11-25
