# MVP review run mode — rules for every builder, checker, UI validator and merge agent

Dandan authorised an unattended run on 2026-10-21: plans 450–458 (reuse refactors), then 459–470, 472, 474–477
(fixes from `docs/mvp/review-handoff-2026-10-21.md`). Plans 471 and 473 are parked — never build them.
This file overrides the parts of `take-plan`, `/ship` and the plan files that assume `main`, `mvp` or a Human in the
loop. Everything else in `AGENTS.md`, the standards docs, `docs/mvp/run-mode.md` ("Reuse first", "Run file") and the
plan itself still applies.

## Branches
- Integration branch: **`mvp-review`** (from `mvp`, with `main` merged in). Base for every feature branch is
  **`origin/mvp-review`**. Branch name: `feat/<NNN>-<slug>`.
- Never commit, push or merge to `main` or `mvp`. Merging into `mvp-review` is done only by the orchestrator's merge step.
- Plans 450–458 were written for "after the MVP merge to main": read every `origin/main` in them (diff commands,
  frozen-file checks, Snapshot drift) as `origin/mvp-review`. Their Step 0 runs against `origin/mvp-review`.
- Plans 459–477 were written before 450–458 existed in code. Step 0 maps each named file/symbol to what the
  refactors left: when a refactor replaced a shared piece (popup shell 451, search box 452, list kit 453,
  data-service base 454, form field + unsaved-changes check 455, messages 456, chip engine 457), build the fix ON
  the new shared piece, never on a removed one, and never re-create the old one. Log the mapping under `## Decisions`.
  A fix that the refactor already delivered is marked done with evidence.
- `ng build` must pass before every commit. Commit messages end with the Co-Authored-By / Claude-Session lines.

## Commands you must not use (the permission system blocks them and they waste the run)
`git reset --hard`, any force push (`--force`, `-f`, `+ref`), `git clean`, `rm -r` / `rm -rf` (to delete a folder use
`node -e "require('fs').rmSync('<path>',{recursive:true,force:true})"`), `git checkout -B` over an existing branch,
rebasing a pushed branch. Cap the output of long commands (`| tail -60`); never start an unbounded background process
except the slot dev servers via `node scripts/slot-serve.mjs`.

## You work alone
You cannot ask anyone. Never use SendMessage, never message the coordinator, never wait for a reply. When something
is unclear, take the plan's recommended option and log it under `## Decisions` (`decision · why`).

## Environment failures are not code failures
Disk full, MongoDB down, a port held, `node_modules` missing or broken, a dev server that does not start, a browser that
cannot launch: fix what you can (free `.angular/cache` when the disk has < 8 GB free; `npm ci`; restart this slot's
servers with `node scripts/slot-serve.mjs --restart`), and if it is still broken return `envFailure` with the exact
symptom instead of failing or parking the plan.

## Human gates → closed by the UI validator where possible
- **Atlas / production data:** never write. Rehearse migrations on a local scratch DB; write the Atlas commands under
  `## Final gate — Atlas` in the run file.
- **`[human]` Done-when items:** the builder writes each as a validation card under `## Human checks` in
  `docs/mvp/runs/<NNN>.md` (page URL path, SETUP, DO, SEE ✓, FAIL ✗). The UI validator then runs every card in a
  real browser (gstack `browse` skill) against the slot's running app and records, per card, `pass` / `fail` /
  `unsure` with screenshot paths under `C:\coding projects\Cursor\mvp-review-evidence\<NNN>\`. Only `unsure` cards
  (and cards the browser cannot reach: phone hardware, camera, real Gemini quality judgement, Atlas) go to the Human.
  A `pass` needs the exact on-screen evidence the card's SEE ✓ names; anything less is `unsure`.
- **`[auto]` items:** mark `[x]` only with the evidence (command + result) in the run file.

## Test accounts (local MongoDB only)
`C:\coding projects\Cursor\mvp-review-evidence\accounts.json` holds a local owner and a local staff account created
for this run (throwaway local passwords, not secrets from `.env`). Never print them into the repo or a commit.
Never read `.env`.

## Run file `docs/mvp/runs/<NNN>.md`
As in `docs/mvp/run-mode.md`, plus `## UI validation` (one line per card: `card · pass|fail|unsure · evidence`).
