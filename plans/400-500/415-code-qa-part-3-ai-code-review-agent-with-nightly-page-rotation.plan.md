# Plan 415 — Code QA Part 3: AI Code-Review Agent with a Nightly Page Rotation

Status: done
Track: code — here (not design)
Snapshot: a426f19aebb86fd103f1edee3df469880fb0b1af

## Problem Statement
Scripts (plans 413, 414) catch mechanical and data bugs. They do not catch logic bugs in the page code: a button whose
handler does nothing, a save with no error handling so the chef gets no message, a list that does not refresh after
a save, a message text that differs from the QA plan, a missing guard. Those need someone reading the code, page by
page, against `docs/qa/qa-plan.md`.

An AI agent can do that, but a full pass over ~19 pages does not fit in one night's budget (last night's UI run ran
out). And the code changes every day, so "only review what changed" would keep re-reviewing the busy pages and never
reach the quiet ones. This plan adds a Cowork code-review agent that works down a **rotation queue**: every night it
continues where the last night stopped, the page reviewed longest ago comes first, and a half-finished page resumes at
the next unchecked item. Over a few nights every page is covered, then the cycle starts again.

Part 3 of 3 of Code QA (part 1: plan 413, part 2: plan 414).

Decision (Human, 2026-10-19): the agent runs as a Cowork scheduled task, not headless CLI.

## Prerequisites
- Plan 413 merged (`run.mjs`, `findings.mjs`, `docs/qa/code-qa-pages.json` with `files` globs).
- Plan 414 merged (the orchestrator and docs it also edits).

## Goals & Success Criteria
**Primary:** each night the agent reviews the pages at the top of the queue until its stop time, every page is
reviewed at least once every `ceil(19 / pages-per-night)` nights, and no page is reviewed two nights in a row while
another page waits.

- [auto] `npm run test:scripts` passes, including `scripts/test/code-qa-rotation.test.mjs`:
  - a `partial` page is first in the queue the next night and its done checks are listed as done;
  - never-reviewed pages come before reviewed ones;
  - among reviewed pages, the oldest review comes first; changes since the last review only break ties
    (simulated 30 nights with the same page changed every day: every page is reviewed, max gap ≤ cycle length + 1);
  - ingesting the same review file twice changes nothing.
- [auto] `node scripts/qa/code-qa/rotation.mjs pick --date=<DATE>` writes `bugs/qa-runs/code-qa/<DATE>/queue.md`
  listing every page in order, with per page: files, plan checks, already-done checks, and the commit range changed
  since its last review.
- [auto] `node scripts/qa/code-qa/rotation.mjs ingest --date=<DATE>` on the fixture review files updates
  `bugs/qa-runs/code-qa/ledger.json` and `latest.md` (findings with `CODE-AI-` IDs and per-check marks
  `code-verified | suspect | unknown`).
- [human] After the first night with the Cowork task on: at least one `review-<PAGE>.md` exists, `latest.md` shows
  its marks, and the UI agent's report follows `suspect` / `unknown` checks first for that page.
- [human] The Human sets up both Cowork tasks and the Windows tasks from the C11 guide without needing to ask a follow-up question.
- [human] After 7 nights: `ledger.json` shows no page reviewed twice before every page was reviewed once, and the
  Human reads 5 `CODE-AI-` findings at random and at most 1 is wrong.

## Execution Mode
- Parallel: no (after 414).
- Concurrent plans: none.
- Isolated DB: no (this layer reads code only).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/qa/code-qa/**
scripts/qa/qa-schedule.ps1
scripts/qa/qa-code-merge.ps1
scripts/test/code-qa-rotation.test.mjs
scripts/test/fixtures/code-qa/**
docs/qa/**
bugs/qa-runs/code-qa/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry. Creating the Cowork scheduled task
and re-registering Windows tasks is the Human's step: give the exact prompt and command.

## Architecture Impact

- INV-none: preserves — QA tooling and docs only; the agent reads code and writes reports under `bugs/qa-runs/`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `docs/qa/code-qa-pages.json`
shape, `findings.mjs` exports, `run.mjs` layer registry, `qa-plan.md` page sections.

## Design

**Who owns what.** Cowork's agent cannot start Windows processes, so scripts own all state and the agent only reads
`queue.md` and writes markdown:
- 00:00 Windows (plan 413's `run.mjs --nightly`) also runs `rotation.mjs ingest` (yesterday's reviews) then
  `rotation.mjs pick` → `queue.md`.
- 01:00 Cowork "FoodVibe Code QA" task: works down `queue.md` until `STOP_AT: 02:40`, writing one
  `review-<PAGE>.md` per page.
- 02:45 Windows "FoodVibe Code QA merge" (`qa-code-merge.ps1`): `rotation.mjs ingest --date=<today>` → updates
  `ledger.json` and `latest.md` so the 03:00 UI agent sees tonight's results.

**Ledger** `bugs/qa-runs/code-qa/ledger.json`: per page `{ id, lastReviewed, lastCommit, status: done|partial|never,
checksDone: [checkIds], openFindings, reviews: n }`. Check ids come from `qa-plan.md` (the numbered/bulleted check
lines under each page section, `<PAGE>-C<NN>` in order; `rotation.mjs` derives them, the agent copies them).

**Queue order** (`rotation.mjs pick`):
1. pages with `status: partial` (resume; done checks listed so the agent skips them);
2. pages with `status: never`, in `qa-plan.md` order;
3. the rest by `lastReviewed` oldest first; ties → more files changed since `lastCommit` (git diff over the page's
   `files` globs) first.
A page whose `files` changed since review is not moved ahead of an older page — age always wins, so busy pages cannot
starve quiet ones. `queue.md` lists all pages; the agent stops at `STOP_AT` wherever it is.

**Review file** `bugs/qa-runs/code-qa/<DATE>/review-<PAGE>.md`, written by the agent, fixed header first:

```
Page: RB
Commit: <sha from queue.md>
Status: partial          # the agent writes partial first, done only after the last check
Checks-done: RB-C01, RB-C02
```

then per check: `### RB-C01 · code-verified|suspect|unknown · <one line>` with the trace (button → handler →
service → endpoint → response → message) as `file:line` hops, and for `suspect` a finding block in the
`qa-agent.md` §6.3 shape (severity, type, expected vs code, `file:line`). `ingest` parses only the header and the
`###` lines; anything malformed is skipped and logged as `CODE-QA: ingest skipped <file> <reason>`.

**Agent protocol** `docs/qa/code-qa-agent.md`:
- Read `queue.md`, then for each page: its `files` and its checks in `qa-plan.md`; skip done checks.
- Per check: trace in the code; `code-verified` only with every hop cited; `suspect` needs a cited reason;
  otherwise `unknown` (runtime-only, dynamic data, needs eyes).
- Bug classes to look for on every page: dead handlers, unhandled errors or missing user feedback on failed saves,
  state not refreshed after a write, message text ≠ plan text, missing guard on an `[auth]` route, translation keys
  built at runtime with no dictionary entry, forms that can submit invalid data, signals read but never updated.
- **Verifier pass** before the page is marked `done`: re-open every `suspect` citation and try to prove it wrong;
  if proved wrong, change it to `code-verified` or `unknown` and say why in one line.
- Update the header after every check (budget may end any minute); never edit `ledger.json`, `latest.md` or code.
- Hard rules: read-only on everything outside `bugs/qa-runs/code-qa/<DATE>/`; no browser; no questions.

**UI agent handoff:** `latest.md` gets per page a `Code review:` block (date, marks per check, open `CODE-AI-`
findings). `qa-agent.md` §7: run `suspect` and `unknown` checks first and confirm or reject each `CODE-AI-` finding
in the browser (`confirmed` / `not reproduced`) instead of re-discovering it.

## Functional Requirements

### Must Have (P0)
- [x] Rotation ledger, pick and ingest as above, with the starvation-free order.
- [x] Cowork agent protocol and the kickoff prompt.
- [x] 02:45 merge task so the UI agent sees tonight's review.

### Won't Have (this plan)
- Headless CLI runner; auto-fixing; reviewing server-only code with no page (covered by plan 414's API layer).

## Atomic Sub-tasks
- [x] C1: Number the checks of every QA page so reviews can be resumed check by check — derive <PAGE>-C<NN> ids from qa-plan.md — scripts/qa/code-qa/plan-checks.mjs
- [x] C2: Keep a ledger of which page was reviewed when, so each night continues where the last stopped — ledger.json read/write, ingest of review files (header + ### lines), idempotent — scripts/qa/code-qa/rotation.mjs
- [x] C3: Order tomorrow's pages fairly so every page gets reviewed and none is stuck in a loop — pick: partial → never → oldest, changes only break ties; write queue.md — scripts/qa/code-qa/rotation.mjs
- [x] C4: Show the code review results to the UI agent — render Code review blocks and CODE-AI- findings into latest.md via findings.mjs — scripts/qa/code-qa/findings.mjs, scripts/qa/code-qa/run.mjs
- [x] C5: Write the code-review agent's instructions — protocol per Design, review file format, verifier pass, Cowork kickoff prompt with STOP_AT — docs/qa/code-qa-agent.md
- [x] C6: Merge tonight's reviews before the UI agent starts — new 02:45 Windows task registered by qa-schedule.ps1 (-Merge param, default 02:45) running qa-code-merge.ps1 — scripts/qa/qa-code-merge.ps1, scripts/qa/qa-schedule.ps1
- [x] C7: Make the UI agent follow up on suspect checks and confirm code-review findings — qa-agent.md §7 and qa-flow.md P0 — docs/qa/qa-agent.md, docs/qa/qa-flow.md
- [x] C8: Prove the rotation is fair with a 30-night simulation and fixture reviews — scripts/test/code-qa-rotation.test.mjs, scripts/test/fixtures/code-qa/**
- [x] C9: Document the full night and the Human's one-time setup — timeline (00:00 scripts, 01:00 Code QA agent, 02:45 merge, 03:00 UI agent, 07:30 down), Cowork task settings, re-register command — docs/qa/README.md, docs/qa/code-qa.md
- [x] C10: Dry-run one page by hand and record it — run pick, run the agent prompt in Cowork on the first page, run ingest; paste the queue head, the review header and the latest.md block into Execution Notes — this plan file
- [x] C11: Hand the Human the ready-to-paste Cowork prompts and a click-by-click setup guide — final chat message: both Cowork tasks (Code QA 01:00, UI QA 03:00) with name, time, folder C:\dev\foodVibe-qa, prompt text, approval settings; the PowerShell lines to re-register the Windows tasks; how to do one manual "Run now" first — docs/qa/README.md

## Technical Considerations
- Dependencies: plans 413/414 files; Cowork scheduled tasks (Human sets them up); git in the QA checkout for the
  changed-files tie-break.
- New files: see Atomic Sub-tasks.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none (code reading only).
- Security surface: the agent prompt holds no credentials; the agent must not copy `.env` content into reports
  (stated in the protocol hard rules).
- Data / migration: none.
- Budget: two Cowork agents share the night's usage. If the UI agent keeps running out, lower the Code QA agent's
  window (`STOP_AT`) first; the rotation makes a shorter window safe — it only means more nights per cycle.
- Project checks: none apply.

## Out of Scope
- Fixing findings; reviewing kit or workflow scripts; PR-time code review (that is `/code-review`).

## Execution Notes

**2026-10-20 — C1–C11 done** (wt-1, after 413 and 414 merged).

- `npm run test:scripts` 93 pass, including `code-qa-rotation.test.mjs` (partial resumes first, never before
  reviewed, oldest first with changes only as tie-break, 30-night simulation with one page changed daily — every page
  reviewed, max gap ≤ cycle + 1 — and ingest twice = no change). `npm run build` passes.
- Real repo: `rotation.mjs pick --date=2026-10-20` → queue of all 19 pages, head `SHELL DASH META INV EQ RB`
  (never-reviewed, plan order); check counts SHELL 16 · DASH 8 · META 12 · INV 12 · EQ 9 · RB 12 · ML 8 · COOK 13 · SUP 7
  · VEN 7 · VEND 5 · INVF 14 · EQF 7 · SUPF 7 · VENF 7 · RBD 18 · MI 11 · TRASH 7 · REDIR 4 (194 checks).
- `run.mjs --nightly` now logs `ingest <yesterday>` first and `queue <today>` last; `qa-code-merge.ps1` ran by hand
  (`merge start … CODE-QA: ingest 2026-10-20: 0 review(s) … merge done (exit 0)` in `.nightly.log`).

C10 dry run — the Worker followed `code-qa-agent.md` itself on the queue's first page (SHELL), in a copy of
`docs/qa` + the real `known.json` under the scratchpad: the write guard refuses `bugs/qa-runs/code-qa/**` from a
slot even after `approved:` through the question tool. Results:

```
Queue head: SHELL DASH META INV EQ RB
Review header: Page: SHELL · Commit: 489f6c7f · Status: partial · Checks-done: SHELL-C01, SHELL-C12, SHELL-C15
ingest 1: {"reviews":1,"findings":1} · ingest 2: same · ledger and latest.md unchanged by the 2nd ingest
latest.md → ### SHELL
- `CODE-AI-001` · S2 · any bp · unknown route `/does-not-exist` throws instead of redirecting — code review of SHELL (SHELL-C15)
Code review: 2026-10-20 (partial) · commit 489f6c7f · suspect 1 · unknown 0 · verified 2
  SHELL-C01 code-verified · SHELL-C12 code-verified · SHELL-C15 suspect
Next night: SHELL first again — Status: partial · Already done: SHELL-C01, SHELL-C12, SHELL-C15
```

The SHELL-C15 suspect is real: `app.routes.ts` has no `**` route (the sweep's G8 finding on SHELL is the same bug).
The first real Cowork run is the Human's (`[human]` items; guide in `docs/qa/README.md` "Set it up").

Decisions:
- Check ids are positional per page (`<PAGE>-C<NN>`); adding a plan check renumbers later ones on that page, which
  only makes them look unreviewed — never skipped.
- A `suspect` `###` line may carry its severity (`### RB-C02 · suspect · S2 · …`, default S3); the finding's
  fingerprint is the check id, so rewording the line on a later night does not create a duplicate.
- A page's marks are kept for its whole cycle; `Checks-done` resets when the page is `done`.
- `bugs/qa-runs/code-qa/**` added to scope (Human: `approved: bugs/qa-runs/code-qa/**`) for the dry run; the guard
  still refused it, so the dry run used the scratchpad copy above.
