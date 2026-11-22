# Local CI fallback — when GitHub Actions has no budget

GitHub counts Actions minutes only on private repositories. When the budget is spent, every job of every workflow fails
**without starting** (the job has no steps, and its check carries an annotation such as "The job was not started because
… your spending limit needs to be increased"). Public repositories are never affected.

## What stops, and what stands in

| Workflow | Its job | With no budget | Stand-in on this PC |
| --- | --- | --- | --- |
| `ci.yml` (projects), `leak-check.yml` (the kit) | the PR checks | every PR shows failed checks | `node scripts/local-ci.mjs --pr <n>` |
| `security.yml` | the PR's secret and dependency scan; a weekly scan | no scan | the secret scan of the PR's changed files (in `--pr`); the weekly scan is not replaced |
| `todo-sync.yml` | closes merged plans, syncs the ledger | merged plans stay open | `/ship`'s "Plan close after the merge", or `node scripts/local-ci.mjs --close-plans` |
| `brain-capture-reminder.yml` | a reminder comment on the PR | no comment | none (it never blocks) |

GitHub itself does not block the merge on a free private repository; the kit's merge guard does, and that is what the
stand-in answers.

## The switch — move CI here, or back

| The Human says | Command | What happens |
| --- | --- | --- |
| `ci local` | `node scripts/local-ci.mjs --use local` | every workflow under `.github/workflows/` is turned off on GitHub (no Actions minute is used); every PR's checks run on this PC |
| `ci github` | `node scripts/local-ci.mjs --use github` (`auto` is the same) | the same workflows are turned on again; GitHub runs CI and this PC steps in only for jobs the budget stopped |
| `ci which` | `node scripts/local-ci.mjs --which` | prints `local`, `github` or `mixed` and each workflow's state |

The state lives on GitHub (which workflows are off), so every clone and worktree sees the same mode. With CI switched
here, `/ship` and `/orchestrate` run `--pr <n>` on every PR without asking, `--close-plans` runs after every merge, and
the merge guard refuses a PR with no checks until that run posted `local-ci`. What is lost while it is local: the
weekly security scan, the steps the local run lists as not run (a third-party action such as Semgrep), and merges
while this PC is off.

## `node scripts/local-ci.mjs --pr <n>`

Run it in a folder that is on the PR's head commit with no uncommitted tracked change (after the push; for an
orchestrator run, the run's merge folder `<repo>-orch-merge-<run>`).

1. It reads the head commit's checks. Only when a job **never started for budget**, or CI is switched here, does it go
   on; a real failure stops it (fix that with `docs/agent/pr-check-fix-loop.md`); nothing failed → nothing to do.
   `--force` runs anyway.
2. It runs, one at a time: the project checks (build, lint, test, the manifest check, `kit-checks` against
   `origin/<main>`, `orchestrator.ciMirror`), every one-line step of the repo's pull-request workflows it can start (a
   step with `working-directory` runs in that folder), and the secret scan of the changed files. A step it cannot run
   (a multi-line shell block, a third-party action such as Semgrep, a step with `${{ … }}`) is printed
   `LOCAL_CI: not run here — <workflow>/<job> · <step> — <why>`; nothing is left out silently. `node --test` runs with
   `--test-concurrency=2` (`LOCAL_CI_TEST_CONCURRENCY`) so a full suite fits in this PC's memory. One step may take
   90 minutes (`--timeout-min`).
   - **Release-only checks.** A command listed in `ci.releaseOnly` (kit config; `[]` by default, so a project's PR runs
     everything) is left out: `LOCAL_CI: release only — <command>`. A release-only `node --test <glob>` gives way to one
     `node --test` of the tests the PR touches: the changed test files, plus each test whose text names a changed
     file's base name (`LOCAL_CI: focused — <n> test file(s)`). A docs-only PR runs no test command. Use it where the
     work goes live by release tag, not from `main` (the kit itself).
   - **Reuse.** A command that already passed on this PC on exactly the PR's tree is not run again
     (`LOCAL_CI: reused — passed on this tree (<source>)`): the ship gate records its passes in
     `<git common dir>/kit-gate-trees.json`, an orchestrator run its plan and final gates in
     `.claude/orchestrator-runs/<run>/gate-trees.json`. Any change to the code is a different tree, so it runs.
3. It writes the receipt `<git common dir>/kit-local-ci/<sha>.json` (each command, exit code, seconds, what was reused
   and what was left to the release; never committed) and posts the `local-ci` commit status on the head commit:
   `success`, or `failure` naming the first failing command. Statuses cost no Actions minutes.

Exit 0 = passed (or nothing to do), 1 = a command failed, 2 = refused (wrong folder, a real CI failure, gh error).

## `node scripts/local-ci.mjs --release`

Before a release (the kit: before the tag), on a folder at `origin/<main>` with no tracked change: every check,
release-only ones included, nothing reused. It posts the `local-ci` status on that commit and writes a receipt with
`tier: "release"`. A HEAD that is not `origin/<main>` is refused (exit 2). `--dry-run` prints the list.

## The merge guard

`gh pr merge` still needs the Human's yes. With failing checks it allows the merge only when **every** failing check is
a job GitHub never started for budget, the `local-ci` status on the head commit passed, and this PC holds that commit's
passing receipt. A passing `local-ci` among green checks also needs that receipt (anyone with write access can post a
status; only a real local run writes the receipt). One real failure, a missing receipt or a receipt for another commit
is refused, with the reason. A PR with no checks at all is refused with the command to run when CI is switched here,
and goes to the permission dialog otherwise.

## `node scripts/local-ci.mjs --close-plans`

After a merge, when the `todo-sync` run of `origin/<main>`'s head never started for budget (`--force`: whatever it did):
the workflow's steps (`todo-query sync --merged`, `todo-archive`, `plan-close`) run in a temporary worktree, and the
result is pushed to `<main>` (a plans-and-ledger change, the Planner's admin write). A refused push opens a PR instead.
`--dry-run` lists what it would close.

## Lasting fixes (the Human's choice)

Make the repository public (unlimited minutes), or set an Actions spending limit in GitHub's billing settings.
