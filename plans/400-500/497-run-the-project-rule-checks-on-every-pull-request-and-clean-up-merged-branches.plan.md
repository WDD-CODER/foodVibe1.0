# Plan 497 — Run the project rule checks on every pull request and clean up merged branches

Status: done
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
  - [x] [auto] On `main` after S1: `npm run lint:icons`, `npm run lint:no-native-select`, `node scripts/plan-ledger-check.mjs`, `node scripts/kit-manifest-check.mjs`, `node scripts/breadcrumbs-check.mjs` all exit 0.
  - [x] [auto] `node --test scripts/test/ci-scope-check.test.mjs` passes: a diff inside the plan's scope exits 0, a diff with one file outside it exits 1, a branch that is not `feat/NNN-*` exits 0 with "skipped".
  - [x] [auto] `npx ng build` passes and `node scripts/scope-check.mjs --arch --plan=plans/497-run-the-project-rule-checks-on-every-pull-request-and-clean-up-merged-branches.plan.md` exits 0.
  - [x] [auto] On the PR for this plan, the new `rules` check run is green (`gh pr checks <PR>` lists `rules` as pass).
  - [x] [human] A throwaway PR that adds a native `<select>` to any template shows the `rules` check red with the file named in the log; closing that PR leaves main untouched.
  - [ ] [human] After the Human runs the repo-setting command (S6), merging any PR removes its branch on GitHub without a manual delete.
  - [x] [human] Running the `stale-branches` workflow from the Actions tab (Run workflow) creates or updates one issue titled "Stale branches" that lists branches unmerged for 30+ days; nothing is deleted.

## Execution Mode
- Parallel: no — one small chain of dependent steps.
- Concurrent plans: none
- Isolated DB: no

## Execution Notes
- Orchestrator readiness (2026-10-27): S6 repo setting delete_branch_on_merge → approved by the Human: run `gh api -X PATCH repos/WDD-CODER/foodVibe1.0 -f delete_branch_on_merge=true` during the run (prefix `GITHUB_TOKEN=` per the gh token memory), record the output as evidence, and record the setting in `docs/agent/standards-git.md`.
- Orchestrator readiness (2026-10-27): S7 and the three GitHub-only [human] checks (throwaway PR goes red, merged-branch auto-delete, Run workflow on stale-branches) → leave unticked for the Human.
- Orchestrator readiness (2026-10-27): S1 AI product modal base-unit select → same behaviour as the native select today: choosing a unit updates the draft baseUnit via setDraftField, closing or cancelling discards the draft, no new error state, no add-option row (fixed CANONICAL_UNITS).
- Orchestrator readiness (2026-10-27): stale snapshot 73efca9b (kit sync 495ff0c4, v1.7.0) → re-run the five checks first and classify only what is actually unclassified; a file outside the Read-Write Scope → escalate, do not widen.
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

- [x] S1: Make the three rule checks that fail today pass on main, so they can safely become PR gates — classify the 56 unclassified files in docs/workflow-kit/manifest.json, fix the stale and missing entries in the core services and core models breadcrumbs, replace the native select in the AI product modal with app-custom-select (follow the add-option rule in docs/agent/standards-domain.md) — docs/workflow-kit/manifest.json, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/shared/ai-product-modal/*
- [x] S2: Add a rules workflow that runs the project's own rule checks on every pull request and every push to main — lint:icons, lint:no-native-select, plan-ledger-check, kit-manifest-check, breadcrumbs-check, with picomatch installed via npm ci --prefix scripts — .github/workflows/rules.yml
- [x] S3: Let CI catch a Worker branch that edited files outside its plan's Read-Write Scope — new wrapper that maps a feat/NNN-* head branch to plans/NNN-*.plan.md and runs scope-check --diff against the PR base, skipping other branch names, plus its node tests — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [x] S4: Wire that scope check into the rules workflow as its own step on pull requests, passing the branch name through an env variable — .github/workflows/rules.yml
- [x] S5: Add a weekly workflow that opens or updates a single "Stale branches" issue listing unmerged branches with no commit for 30+ days, without deleting anything — .github/workflows/stale-branches.yml, docs/workflow-kit/manifest.json
- [x] S6: Turn on GitHub's automatic deletion of merged pull-request branches — one repo-setting command run by the Human (gh api -X PATCH repos/WDD-CODER/foodVibe1.0 -f delete_branch_on_merge=true), then record the setting and the new checks in docs/agent/standards-git.md
- [x] S7: Check the gates fail when they should — open a throwaway PR with a native select in a template and confirm the rules check goes red, then close it — Human check, no files

## Done when
- [x] [auto] The five rule checks exit 0 on the PR branch (output pasted in the Worker's report).
- [x] [auto] `node --test scripts/test/ci-scope-check.test.mjs` passes.
- [x] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` exits 0.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ ] [human] The throwaway-PR, merged-branch-deletes and stale-branches-issue checks in Success Criteria pass.

### Builder evidence (orch-builder, 2026-10-27)
- Re-ran the five checks first on the branch (base 30475411): `lint:icons` exit 0; `lint:no-native-select` exit 1 (ai-product-modal html); `plan-ledger-check` exit 0; `kit-manifest-check` exit 1 (89 unclassified + 2 coupling problems, not 56: the kit v1.7.0/v1.7.1 syncs and plans 4xx added files); `breadcrumbs-check` exit 1 (2 seams).
- S1: manifest.json now 343 classified; 89 files added as `project`/`stay` (kit-synced files are noted as such, see decisions), `job-validation.md` gets param string `4200` (key `slots.fePorts`), `plan-name-similarity.mjs` becomes `parameterize` with its two doc-comment example paths recorded. Breadcrumbs: five services added, `business-stats.model.ts` added, stale `API.events` reworded. AI product modal: native select replaced by `app-custom-select` (`[options]`, `[translateLabels]=false`, `[compact]`, `[ngModel]` + `setDraftField('baseUnit', $event)`), unused `.editor-select` removed, spec added (3 tests).
- After S1: `npm run lint:icons` -> exit 0; `npm run lint:no-native-select` -> exit 0 (no output); `node scripts/plan-ledger-check.mjs` -> exit 0 ("PLAN_LEDGER: OK"); `node scripts/kit-manifest-check.mjs` -> exit 0 ("KIT_MANIFEST: ok — 343 classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling"); `node scripts/breadcrumbs-check.mjs` -> exit 0 ("BREADCRUMBS: clean"); `node scripts/kit-owned.mjs --check` -> exit 0 (147, in sync).
- S2/S4: `.github/workflows/rules.yml` (job `rules`; contents: read; `npm ci --prefix scripts`; five checks as separate steps; PR-only scope step with `HEAD_REF`/`BASE_SHA` via env). S3: `scripts/ci-scope-check.mjs` + `scripts/test/ci-scope-check.test.mjs` -> `node --test scripts/test/ci-scope-check.test.mjs` exit 0, `# pass 7`, `# fail 0`.
- S5: `.github/workflows/stale-branches.yml` (cron Mon 06:00 UTC + workflow_dispatch; contents: read, issues: write). The list-building awk was dry-run against this repo's remote branches (26 unmerged refs, rows printed). YAML of both workflows parses (js-yaml). Not run on GitHub.
- S6: the doc part is written in `docs/agent/standards-git.md` ("Pull-request checks and branch clean-up"). The repo-setting command `GITHUB_TOKEN= gh api -X PATCH repos/WDD-CODER/foodVibe1.0 -f delete_branch_on_merge=true` was NOT run: the permission classifier denied it ("Modify Shared Resources"). S6 stays unticked; the Human runs the command. S7 is left for the Human.
- `npm run build` -> exit 0. `npm run lint` -> exit 0 (0 errors, 67 pre-existing warnings, none in changed files). `npx ng test --watch=false --browsers=ChromeHeadless` -> "TOTAL: 1597 SUCCESS" (the process was then killed by `timeout 590`, exit 124, because ChromeHeadless was not closed; the ai-product-modal spec alone exited 0 with 3 of 3). `node scripts/scope-check.mjs --arch --plan=<this plan>` -> exit 0 ("ARCH: ok"); `node scripts/scope-check.mjs --diff=orch/run-412-497 --plan=<this plan>` -> "SCOPE: ok".
- `node scripts/log-query.mjs --since=plan-start --level=error` -> exit 1 in this worktree: `.claude/.slot-plan-start not found`; with `--since=2h`: "no MongoDB URI in .env" (the worktree has no .env). Environment failure, not a code error.
- Resume (2026-10-27): reran after the stopped build, tree unchanged. Five rule checks exit 0, `node --test scripts/test/ci-scope-check.test.mjs` exit 0 (pass 7), `scope-check --arch` exit 0, `npm run build` exit 0, `npm run lint` exit 0 (0 errors). The S6 repo-setting command was denied again by the permission classifier; the Human runs it.
- Gate fix round 1 (2026-10-27): the gate ran `npm run test` (= `ng test`, watch mode) and it never exited, so checks 2-9 had no result. Reran every check outside watch mode: `npx ng test --watch=false --browsers=ChromeHeadless` -> exit 0, "TOTAL: 1597 SUCCESS" (one earlier run had 3 flaky failures in header and product-form specs, files this plan does not touch; both specs pass alone, 29 of 29, and the full suite passed on rerun). `lint:icons`, `lint:no-native-select`, `plan-ledger-check`, `kit-manifest-check` (343 classified, 0 unclassified), `breadcrumbs-check` all exit 0; `node --test scripts/test/ci-scope-check.test.mjs` exit 0; `scope-check --arch` exit 0 ("ARCH: ok"). `log-query --since=plan-start` -> ".claude/.slot-plan-start not found" (worktree is not a slot; environment failure). Seen: `package.json` `test` script is watch-mode `ng test`, so a plain `npm run test` cannot finish unattended; the gate should run `npx ng test --watch=false --browsers=ChromeHeadless` as CI does (package.json is outside this plan's scope).
- Gate fix round 2 (2026-10-27): the gate reported `npm run test` as 7 FAILED of 1597 (non-headless Chrome, watch-mode script). Fresh builder reran `npx ng test --watch=false --browsers=ChromeHeadless` twice on the unchanged tree -> exit 0, "TOTAL: 1597 SUCCESS" both times, so the 7 failures are flaky and not from this plan (no file in their areas changed). Also rerun, all exit 0: the five rule checks, `node --test scripts/test/ci-scope-check.test.mjs`, `scope-check --arch`, `npm run build`, `npm run lint` (0 errors). `log-query --since=plan-start` -> exit 1 ".claude/.slot-plan-start not found" (worktree is not a slot; environment failure).
- Run run-497-419 (2026-10-29, orch-builder, mode first): the S1–S5 code already reached `main` through PR #464 (`orch/run-412-497`, merged 2026-10-27), so this run re-verified on `feat/497-run-the-project-rule` (= `c5e69166`) and changed no code. `npm run lint:icons` -> exit 0 ("94 icons in pick, 0 violations"); `npm run lint:no-native-select` -> exit 0; `node scripts/plan-ledger-check.mjs` -> exit 0 ("PLAN_LEDGER: OK"); `node scripts/kit-manifest-check.mjs` -> exit 0 ("342 classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling"); `node scripts/breadcrumbs-check.mjs` -> exit 0 ("BREADCRUMBS: clean"); `node --test scripts/test/ci-scope-check.test.mjs` -> exit 0 (tests 7, pass 7, fail 0); `scope-check --arch` -> exit 0 ("ARCH: ok"); `scope-check --diff=origin/orch/run-497-419` -> "SCOPE: ok"; `pnpm run build` -> exit 0; `pnpm run lint` -> exit 0 (0 errors, 67 pre-existing warnings); `pnpm run test:ci` -> exit 0 ("TOTAL: 1598 SUCCESS"); `node scripts/log-query.mjs --since=plan-start --level=error` -> exit 0 ("no entries").
- `rules` on the plan's PR: `gh pr checks 464` -> "rules pass 8s" (run 40591303787), all other checks pass.
- S6: `GITHUB_TOKEN= gh api repos/WDD-CODER/foodVibe1.0 --jq '{delete_branch_on_merge}'` -> `{"delete_branch_on_merge":true}` — the setting is already on (set outside this run), and `docs/agent/standards-git.md:56` records it, so S6 is ticked without running the PATCH again. S7 and the three [human] GitHub checks stay open for the Human.
- Human validation (2026-10-29): throwaway PR #471 → `rules` red ("Native <select> is not allowed", dashboard.page.html), closed unmerged; stale-branches run 40838648425 success → issue #470 updated (7 branches). Merge-deletes-branch check stays open until the run-branch PR merges.
