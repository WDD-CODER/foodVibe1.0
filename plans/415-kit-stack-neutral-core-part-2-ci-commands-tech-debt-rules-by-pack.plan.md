# Plan 415 — Kit Stack-Neutral Core Part 2: CI, Commands and Tech-Debt Rules by Pack

Status: draft
Track: code — here (not design)
Snapshot: 46cc44c7ecbb3f124b0cf4f8e0f59db460d2e6ef

## Problem Statement
Second half of making the kit stack-neutral (first half: plan 414; release in 416). Source: hand-off `../ai-workflow-kit/handoff/2026-10-18-react-vite-adoption.md` (local only, never commit). Core CI assumes a backend and dependencies the project owns; core commands carry Angular style rules and point at files only the Angular/Express packs ship; the tech-debt report ignores `.tsx` and can't show a trend on an old codebase.

Hand-off issues in this plan:
- **I-6** CI/security render `npm ci --prefix ` (empty) and a `server-tests` job without a backend; whole-repo lint and app `npm audit` the project can't fix keep CI red.
- **I-15** core `feat/fix/refactor/security.md` hard-code "no semicolons", quotes, Signals, BEM, CSS layers, `auth-crypto.ts`; pre-commit runs the no-semi check for every stack.
- **I-16** core commands reference pack-only files (`conventions.md`, `standards-backend.md`, `cssLayer`, `auth-and-logging`, `breadcrumbs`) that dangle with `packs: []`.
- **I-18** `techdebt-report.mjs` skips `.tsx/.jsx`; the techdebt skill has an unfilled `PACK:stack` marker; no baseline mode.
- **I-21** `.prettierrc.json` seed forces no-semi + single quotes on every project; **I-23** `gh` targets the fork parent; **I-24** `gh pr edit` fails on Projects (classic); **I-25** `fix.md` "Loads by area" names Angular doc sections.
- Hand-off §5 tool: **workflow-link-check** (every backticked path, `node scripts/…`, `npm run <x>` in commands/skills/agents/docs exists) — needed here to prove I-16.

## Prerequisites
- Plan 414 merged into kit `main`.

## Goals & Success Criteria
- [auto] `install-check` renders with `paths.serverRoot: ""` contain no `--prefix ` followed by end of line and no `server-tests` job; `actionlint` passes on every rendered workflow.
- [auto] New config keys `ci.install` (default `npm ci`), `ci.lintScope` (`all` | `changed`), `ci.appAuditMode` (`enforce` | `report`) render as documented; `report` mode uses `set +e` and writes to `$GITHUB_STEP_SUMMARY`.
- [auto] `git grep -n -i "semicolon\|single quote\|BehaviorSubject\|auth-crypto\|BEM" -- core/.claude/commands` finds nothing; those rules live in `packs/angular` (FoodVibe gets them back through the pack, same wording).
- [auto] `node tools/workflow-link-check.mjs` reports 0 missing on install-check renders for packs `[]` and `[angular, node-express]`; `pack-check` fails when a core reference has no provider.
- [auto] `techdebt-report.mjs scan` counts `.ts/.tsx/.js/.jsx/.html/.css/.scss` with pack rules and compares to `docs/project/techdebt-baseline.json` (`NEW_DEBT: yes|no`); Angular pack rules reproduce today's FoodVibe categories.
- [auto] Kit `leak-check`, `pack-check`, `install-check`, `e2e-check` pass. No release (CHANGELOG `[Unreleased]`).
- [auto] FoodVibe safety: local-source `kit-sync` dry-run into FoodVibe → 0 `conflict`; FoodVibe's rendered `ci.yml` still has the `server-tests` job and full lint; `/fix` still lists the Angular rules (via pack fragment).

## Execution Mode
- **Parallel:** no. Kit session in `../ai-workflow-kit`; FoodVibe read and scratch-cloned only.
- **Concurrent plans:** no other kit plan; 416 starts after this merges.
- **Isolated DB:** no.
- **Kit edits:** kit branch `feat/415-neutral-core-ci-commands` + kit PR; Dandan merges. No tag.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
# FoodVibe side: notes only; FoodVibe is synced in plan 416.
docs/workflow-kit/kit-sync-notes.md
```

**Outside this repo:** kit `../ai-workflow-kit/core/**`, `packs/**`, `templates/**`, `tools/**`, `kit.config.json`, `docs/**`, `CHANGELOG.md`, `README.md`, kit `.github/workflows/**` (kit CI runs the link check); a scratch clone of FoodVibe under the session scratchpad.

## Read Scope
Kit repo, FoodVibe repo (its current `ci.yml`, `security.yml`, techdebt reports for the category baseline), the hand-off (§3 I-6/15/16/18/21/23/24/25, §5).

## Escalation Protocol
Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Anything that would change FoodVibe's rendered CI behaviour or command rules: STOP and show the diff.

## Architecture Impact
- INV-none: preserves — kit CI templates, commands and tooling only.

## Step 0 — Reality Check
- 414 merged; kit `main` clean; re-read each issue against `main`, one line each.
- List every core → pack reference (the pack contract): which file/skill each core command loads, and which pack provides it today.

## Design
- **CI (I-6):** backend job/steps inside block markers rendered only when `paths.serverRoot` is set; `ci.install`, `ci.lintScope` (changed = ESLint on changed `*.ts *.tsx *.js *.jsx *.mjs *.cjs` vs PR base; push uses `github.event.before`, fallback `HEAD~1`, none → pass), `ci.appAuditMode` (report = `set +e`, summary + `::warning`); `scripts/` deps audit enforced at `critical`. Defaults keep today's FoodVibe behaviour.
- **Style rules to packs (I-15):** core says "Match the file's existing style; never reformat untouched lines" and inserts a `PACK:style` fragment; Angular pack fragment holds today's rules; no-semi pre-commit becomes an Angular-pack hook fragment.
- **Pack contract (I-16):** `pack.json` declares which core references it satisfies (conventions doc, backend standards or "no backend", styling skill, auth skill, optional docs-map skill); core falls back to "(no stack pack: skip)"; `pack-check` fails on a missing provider. **I-25:** packs declare the section names `fix.md` "Loads by area" cites.
- **Link check (§5):** `tools/workflow-link-check.mjs` (node built-ins, allowlist for runtime paths/examples), run in kit CI over each install-check render.
- **Tech debt (I-18):** generic `scan` subcommand + baseline file in core; rule sets come from packs (Angular rules = today's categories); `.tsx/.jsx` included; skill `PACK:stack` filled by packs.
- **I-21:** `.prettierrc.json` moves to the Angular pack seed (skipped when the project has a style config). **I-23:** `standards-git.md` and `/ship` use `gh … -R <owner>/<repo>` from `origin`. **I-24:** document the `gh api -X PATCH …/pulls/<n> -F body=@file` fallback.

## Atomic Sub-tasks
- [ ] M0: Check the issues are still open and map every core-to-pack reference — Step 0 + pack contract list — `plans/415-kit-stack-neutral-core-part-2-ci-commands-tech-debt-rules-by-pack.plan.md`
- [ ] M1: Render backend CI jobs only when the project has a backend — serverRoot block markers in ci and security workflows, actionlint on renders — `../ai-workflow-kit/core/.github/workflows/{ci,security}.yml`, `../ai-workflow-kit/tools/install-check.mjs`
- [ ] M2: Let projects choose how CI installs, lints and audits — ci.install, ci.lintScope, ci.appAuditMode keys, changed-files lint, report-only audit, scripts audit — `../ai-workflow-kit/core/.github/workflows/{ci,security}.yml`, `../ai-workflow-kit/kit.config.json`, `../ai-workflow-kit/docs/**`
- [ ] M3: Move Angular style rules out of core commands into the Angular pack — match-existing-style line in core, PACK:style fragments, no-semi hook fragment, prettier seed — `../ai-workflow-kit/core/.claude/commands/{feat,fix,refactor,security}.md`, `../ai-workflow-kit/core/.husky/pre-commit`, `../ai-workflow-kit/packs/angular/**`, `../ai-workflow-kit/templates/**`
- [ ] M4: Make packs declare which core references they provide and fail when one is missing — pack.json contract, core fallbacks, pack-check rule, fix.md section names — `../ai-workflow-kit/packs/*/pack.json`, `../ai-workflow-kit/tools/pack-check.mjs`, `../ai-workflow-kit/core/.claude/commands/**`
- [ ] M5: Add a link check that proves every path the workflow docs mention exists — workflow-link-check tool + kit CI job over renders — `../ai-workflow-kit/tools/workflow-link-check.mjs`, `../ai-workflow-kit/.github/workflows/**`
- [ ] M6: Make the tech-debt scan work for any stack and compare against a baseline — scan subcommand, baseline file, tsx/jsx, pack rule sets, skill PACK:stack — `../ai-workflow-kit/core/scripts/techdebt-report.mjs`, `../ai-workflow-kit/core/.claude/skills/techdebt/SKILL.md`, `../ai-workflow-kit/packs/angular/**`
- [ ] M7: Make git commands work in forks and when PR edit is blocked — gh -R from origin, PATCH fallback documented — `../ai-workflow-kit/core/docs/agent/standards-git.md`, `../ai-workflow-kit/core/.claude/commands/ship.md`
- [ ] M8: Prove FoodVibe still renders the same CI and rules before merging — local-source dry-run, rendered ci.yml and fix.md compared; notes — `docs/workflow-kit/kit-sync-notes.md`
- [ ] M9: Run all kit checks and open the kit PR — leak-check, pack-check, install-check, e2e-check, link check; CHANGELOG Unreleased — kit repo

## Out of Scope
React-Vite pack, upstream-owned layer, adoption tools, release (416); porting Python scripts to node.
