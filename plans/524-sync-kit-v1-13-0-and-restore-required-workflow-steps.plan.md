# Plan 524 — Sync kit v1.13.0 and restore required workflow steps

Status: draft
Track: code
Snapshot: 4c8397b3

## Problem Statement
`node scripts/override-check.mjs` fails on the main folder: `.github/workflows/ci.yml lacks required step "Kit override check"`.
FoodVibe's committed `main` (ba17361c) is behind kit release v1.13.0. The kit-owned files of v1.13.0 were never
synced into a commit, so `scripts/override-check.mjs`, `scripts/lib/override-steps.mjs` and the `required` list in
`.kit/install.json` exist only as uncommitted changes in the Planner folder. Two declared overrides
(`.github/workflows/ci.yml`, `.github/workflows/security.yml`) must keep the steps the kit marks `# KIT:required`:
the kit's `core/.github/workflows/ci.yml` requires `Install workflow script dependencies`, `Kit override check`,
`Workflow script tests`, `Secret scan (gitleaks)`, `Require quality gates`; `security.yml` requires
`npm audit (workflow scripts, report only)` and `Semgrep OWASP Top Ten`.

Per ADR 0021, kit-owned files reach FoodVibe only through a kit release and `kit-sync --ref`; nobody hand-edits them
or writes them around the KIT_OWNED guard.

## Goals & Success Criteria
- Primary: FoodVibe runs kit v1.13.0 from one clean sync commit, and every declared override keeps the steps the
  kit requires.
- Success:
  - [ ] [auto] `node scripts/override-check.mjs` exits 0 and prints `ok`.
  - [ ] [auto] `.kit/install.json` records `ref` v1.13.0 and the sync commit contains only kit-sync output.
  - [ ] [auto] `pnpm exec ng build` passes.
  - [ ] [human] The Human approves the dry-run summary before `-Apply`.
  - [ ] [human] The Human approves the proposed diffs (override steps, `scope-check.mjs`, `save-plan/SKILL.md`,
        `prd-template.md`, `kit.config.json` override declarations) before anything beyond the sync commit is
        committed.
  - [ ] [auto] `node scripts/scope-check.mjs --reuse --plan=plans/524-sync-kit-v1-13-0-and-restore-required-workflow-steps.plan.md` exits 0.

## Execution Mode
- Parallel: no — one slot, strictly in the order of the sub-tasks, with a Human stop after each of M1 and M3.

## Execution Notes
- Base branch `origin/main`; Worker branch `feat/524-sync-kit-v1-13-0`. Do not take this plan in `wt-2` or `wt-3`
  if either is on an old commit or is the Human's; `take-plan` picks a free slot.
- The sync is run from the kit folder against the slot path (PowerShell 5):
  `cd "C:\coding projects\Cursor\ai-workflow-kit"` then `.\kit-sync.ps1 -Target "<slot path>" -Ref v1.13.0`
  (dry-run), then add `-Apply` only after the Human's word.
- The sync commit message is exactly `sync kit v1.13.0` (the Human's choice; ADR 0021 suggests
  `chore(kit): sync ai-workflow-kit vX.Y.Z` — note the difference in the report, do not change it).
- **No bypasses.** If a hook or guard (KIT_OWNED, branch-guard, scope) blocks a write, STOP and tell the Human. Never
  write a kit-owned file with a script to get around a guard.
- Do not commit anything beyond M1 and do not push. After M3 show diffs and stop; the Human decides what is committed.
- The Planner folder carries about 50 uncommitted kit-sync files (modified and untracked). A slot starts from
  `origin/main`, so they are not carried over; the Human decides afterwards whether to discard them.
- A kit-side fix may exist for missing required steps: M2 reports what ADR 0021 step 4–5 and the kit's
  `docs/CHANGE-LOOP.md` say (kit change + release vs a FoodVibe override), without applying any.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
.kit/**
.github/workflows/**
.claude/**
.husky/**
docs/agent/**
docs/workflow-kit/**
docs/brain/gotchas/**
scripts/**
kit.config.json
AGENTS.md
CLAUDE.md
package.json
```

## Read Scope

Entire repo, plus `C:\coding projects\Cursor\ai-workflow-kit` (read-only; run `kit-sync.ps1` from there).

## Escalation Protocol

If a Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and
why; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — workflow tooling, CI and kit files only; no server, schema, permission, taxonomy or AI-route files.

## Backend Impact
- Collections affected: none. Server changes needed: no.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class; kit-managed workflow files only.

## Step 0 — Reality Check
In the slot: `git rev-parse HEAD` equals `origin/main`; `.kit/install.json` has no `required` map (or a stale one);
`node scripts/override-check.mjs` is absent or reports the failure above. Print the three results.

## User Stories
- As a chef's workflow owner, I want FoodVibe on the released kit version so that CI cannot silently lose a step the
  kit relies on.

## Functional Requirements
1. FoodVibe's committed files match kit v1.13.0 except declared overrides.
2. Each declared override keeps every step marked `# KIT:required` in the kit's template for that file.
3. FoodVibe's own jobs and steps in `ci.yml` and `security.yml` stay unchanged.
4. FoodVibe-only behavior in merged files is kept: `--reuse` mode and the Reuse gate in `scope-check.mjs`, the
   `## Reuse Check` section in `save-plan/SKILL.md` and in `.claude/references/prd-template.md`.

## Atomic Sub-tasks
- [ ] M1a: Take the plan, then check the dry-run of the kit sync and show the Human its summary line — run kit-sync with ref v1.13.0 and no apply flag from the kit folder against the slot — kit folder, slot root
- [ ] M1b: Apply the kit sync after the Human's word and commit it alone as "sync kit v1.13.0" — kit-sync with the apply flag, then one commit of its output only — whole sync output incl. .kit/install.json
- [ ] M2a: Run the override check on the real files and report which workflow files fail and why — node scripts/override-check.mjs, full output — no writes
- [ ] M2b: Show for each failing file the exact required step from the kit template and the diff that adds it, keeping FoodVibe jobs unchanged — kit core/.github/workflows/*.yml vs .github/workflows/ci.yml and security.yml — diffs only, nothing committed
- [ ] M2c: Tell the Human what ADR 0021 and the kit change loop say about a kit-side fix instead of a local override — docs/brain/decisions/0021-*.md, kit docs/CHANGE-LOOP.md — report only
- [ ] M3a: Show the proposed merge of the kit version with FoodVibe's Reuse additions in the scope check script — keep the reuse flag and Reuse gate — scripts/scope-check.mjs
- [ ] M3b: Show the proposed merges of the save-plan skill and the PRD template that keep the Reuse Check section — .claude/skills/save-plan/SKILL.md, .claude/references/prd-template.md
- [ ] M3c: Show the override declarations FoodVibe's kit config would need, one path and one reason each — kit.config.json overrides
- [ ] M3d: Stop and wait for the Human's word before any commit beyond the sync commit, and never push — none

## Out of Scope
- Changing kit files in `../ai-workflow-kit` (a separate kit PR and release if the Human picks the kit-side fix).
- Any application, server or schema code.
- Committing or pushing anything other than the M1 sync commit; discarding the Planner folder's uncommitted files.

## Security Surface
CI workflows and the secret scan are touched only by restoring the kit's required steps (gitleaks and Semgrep steps
must not be removed or weakened). `scripts/pre-commit-secret-scan.mjs` stays active on the sync commit.

## Done when
- [ ] [auto] `node scripts/override-check.mjs` exits 0 and prints `ok` once the Human has approved and committed the
      step additions (M2b).
- [ ] [auto] `git log -1 --format=%s` after M1b prints `sync kit v1.13.0`, and `.kit/install.json` `ref` is `v1.13.0`.
- [ ] [auto] `pnpm exec ng build` passes.
- [ ] [human] The Human has seen the dry-run summary and said apply.
- [ ] [human] The Human has seen every diff from M2b–M3c and decided what is committed.
