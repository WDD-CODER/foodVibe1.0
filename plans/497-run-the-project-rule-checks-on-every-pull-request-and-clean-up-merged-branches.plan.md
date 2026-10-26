# Plan 497 — Run the project rule checks on every pull request and clean up merged branches

Status: draft
Track: code
Depends-on: none (the MVP merge, PR #453, is already on main)
Snapshot: 73efca9b0d5ba57ad57cc10f845068411d18be9b

## Problem Statement
`ci.yml` runs ESLint, `ng build`, the Angular and server tests and gitleaks, but not the project's own rule checks. Those only run in local hooks, so they are skipped whenever a hook is bypassed or an agent forgets. Measured on `main` at 73efca9b (2026-10-26, after the MVP merge):
1. `npm run lint:icons` and `npm run lint:no-native-select` exist but CI never runs them. `lint:no-native-select` fails today (`src/app/shared/ai-product-modal/ai-product-modal.component.html` still has a native `<select>`).
2. `node scripts/kit-manifest-check.mjs` fails today: 56 unclassified files — test fixtures under `scripts/test/fixtures/`, `scripts/qa/code-qa/`, new tests in `scripts/test/`, `scripts/lib/`, and 5 ADRs in `docs/brain/decisions/`.
3. `node scripts/breadcrumbs-check.mjs` fails today: 2 seams need attention — `src/app/core/services/breadcrumbs.md` has a stale entry (`API.events`) and does not mention 5 new services, and `src/app/core/models/breadcrumbs.md` does not mention `business-stats.model.ts`.
4. `plan-ledger-check.mjs` passes but runs only in the pre-commit hook. `scope-check.mjs` (a Worker stayed inside its plan's Read-Write Scope) runs only in a slot, never on the PR.
5. Merged branches pile up: GitHub's "Automatically delete head branches" is off (`delete_branch_on_merge: false`), so about 60 merged remote branches had to be removed by hand on 2026-10-26.

## Goals & Success Criteria
- Primary: every PR runs the project's rule checks in CI; merged branches delete themselves; stale ones are reported weekly.
- Success:
  - [ ] [auto] On `main` after S1: `npm run lint:icons`, `npm run lint:no-native-select`, `node scripts/plan-ledger-check.mjs`, `node scripts/kit-manifest-check.mjs`, `node scripts/breadcrumbs-check.mjs` all exit 0.
  - [ ] [auto] `node --test scripts/test/ci-scope-check.test.mjs` passes: a diff inside the plan's scope exits 0, a diff with one file outside it exits 1, a branch that is not `feat/NNN-*` exits 0 with "skipped".
  - [ ] [auto] `npx ng build` passes and `node scripts/scope-check.mjs --arch --plan=plans/497-run-the-project-rule-checks-on-every-pull-request-and-clean-up-merged-branches.plan.md` exits 0.
  - [ ] [auto] On the PR for this plan, the new `rules` check run is green (`gh pr checks <PR>` lists `rules` as pass).
  - [ ] [human] A throwaway PR that adds a native `<select>` to any template shows the `rules` check red with the file named in the log; closing that PR leaves main untouched.
  - [ ] [human] After the Human runs the repo-setting command (S6), merging any PR removes its branch on GitHub without a manual delete.
  - [ ] [human] Running the `stale-branches` workflow from the Actions tab (Run workflow) creates or updates one issue titled "Stale branches" that lists branches unmerged for 30+ days; nothing is deleted.

## Execution Mode
- Parallel: no — one small chain of dependent steps.
- Concurrent plans: none
- Isolated DB: no

## Execution Notes
- The MVP is already on `main`, so nothing blocks this plan. On arrival, re-run the five checks first (counts above drift as plans merge); any already at exit 0 mark done with that output as evidence.
- `ci.yml`, `security.yml`, `todo-sync.yml` and `brain-capture-reminder.yml` are kit-owned (`docs/workflow-kit/kit-owned.json`) — do not edit them here. The new gates live in two NEW FoodVibe-only workflow files (`rules.yml`, `stale-branches.yml`). Sharing them with other kit projects, if wanted, is a separate plan in `../ai-workflow-kit/plans/`.
- `rules.yml` is not behind the docs-only skip in `ci.yml`: plan-ledger, kit-manifest and breadcrumbs checks matter exactly for docs/plans/`.claude` PRs, and each check takes seconds.
- Make no check required on `main` in this plan. Making `ci` and `rules` required is a later Human decision after a week of green runs.
- New check wiring uses `npm ci --prefix scripts` for `picomatch` (`scope-check.mjs` imports it); no root `npm ci` is needed for the rules job.
- Security surface: workflow files and CI permissions. `rules.yml` uses `contents: read` only; `stale-branches.yml` uses `contents: read` + `issues: write`. No secrets other than the built-in `GITHUB_TOKEN`. The PR head branch name is untrusted input: pass it to scripts through an `env:` variable, never `${{ github.head_ref }}` inside a `run:` line.

## Reuse Check
- Weekly stale-branch report and rules workflow — family: none — rung: 4 — why: CI workflow files; the registry covers Angular and server code only
- Branch-name to plan mapping in the CI scope check — family: helpers — rung: 2 — why: reuse `scripts/lib/plan-paths.mjs` to find the plan file instead of a new lookup
- Dropdown in the AI product modal — family: search-combobox — rung: 1 — why: swap the native select for the existing `app-custom-select`, no new piece

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
.github/workflows/rules.yml
.github/workflows/stale-branches.yml
scripts/ci-scope-check.mjs
scripts/test/ci-scope-check.test.mjs
docs/workflow-kit/manifest.json
docs/agent/standards-git.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/shared/ai-product-modal/ai-product-modal.component.html
src/app/shared/ai-product-modal/ai-product-modal.component.ts
src/app/shared/ai-product-modal/ai-product-modal.component.scss
src/app/shared/ai-product-modal/ai-product-modal.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — the only AI-named files in scope are the AI product modal's template, styles and spec; the swap changes one dropdown control and leaves every Gemini call going through `server/routes/ai.js`.
- INV-1: preserves — no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.

## Backend Impact
- Collections affected: none
- New collections: no
- Auth / validation: none. Server code untouched.

## Out of Scope
- Editing the four kit-owned workflows or making any check required on `main` (later Human decision).
- Auto-deleting stale or unmerged branches — the weekly job only reports.
- E2E, `qa:code` or any job that needs MongoDB, Atlas or a running app.
- Dependabot and LLM-based PR review.
- Fixing rule violations other than the three that are red today.

## Atomic Sub-tasks

- [ ] S1: Make the three rule checks that fail today pass on main, so they can safely become PR gates — classify the 56 unclassified files in docs/workflow-kit/manifest.json, fix the stale and missing entries in the core services and core models breadcrumbs, replace the native select in the AI product modal with app-custom-select (follow the add-option rule in docs/agent/standards-domain.md) — docs/workflow-kit/manifest.json, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/shared/ai-product-modal/*
- [ ] S2: Add a rules workflow that runs the project's own rule checks on every pull request and every push to main — lint:icons, lint:no-native-select, plan-ledger-check, kit-manifest-check, breadcrumbs-check, with picomatch installed via npm ci --prefix scripts — .github/workflows/rules.yml
- [ ] S3: Let CI catch a Worker branch that edited files outside its plan's Read-Write Scope — new wrapper that maps a feat/NNN-* head branch to plans/NNN-*.plan.md and runs scope-check --diff against the PR base, skipping other branch names, plus its node tests — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [ ] S4: Wire that scope check into the rules workflow as its own step on pull requests, passing the branch name through an env variable — .github/workflows/rules.yml
- [ ] S5: Add a weekly workflow that opens or updates a single "Stale branches" issue listing unmerged branches with no commit for 30+ days, without deleting anything — .github/workflows/stale-branches.yml, docs/workflow-kit/manifest.json
- [ ] S6: Turn on GitHub's automatic deletion of merged pull-request branches — one repo-setting command run by the Human (gh api -X PATCH repos/WDD-CODER/foodVibe1.0 -f delete_branch_on_merge=true), then record the setting and the new checks in docs/agent/standards-git.md
- [ ] S7: Check the gates fail when they should — open a throwaway PR with a native select in a template and confirm the rules check goes red, then close it — Human check, no files

## Done when
- [ ] [auto] The five rule checks exit 0 on the PR branch (output pasted in the Worker's report).
- [ ] [auto] `node --test scripts/test/ci-scope-check.test.mjs` passes.
- [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` exits 0.
- [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ ] [human] The throwaway-PR, merged-branch-deletes and stale-branches-issue checks in Success Criteria pass.
