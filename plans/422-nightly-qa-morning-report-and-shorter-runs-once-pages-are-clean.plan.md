# Plan 422 — Nightly QA morning report and shorter runs once pages are clean

Status: draft
Track: code — here (not design)
Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6

## Problem Statement
The nightly QA (plans 408, 413–415) runs on its own in `C:\dev\foodVibe-qa`. Windows tasks start QA at 00:00
(the `qa-nightly-up.ps1` step already fetches and fast-forwards to `origin/main`), the Cowork Code QA agent reviews
at 01:00, the merge task ingests at 02:45, the Cowork UI agent runs at 03:00, and QA stops at 07:30. Two gaps
keep it from being a hands-off overnight report:

1. **Nobody is told what happened.** Results are spread over `.nightly.log`, `code-qa/latest.md`,
   `code-qa/<date>/review-*.md`, `known.json` and the UI run's `report.md`, all in the QA folder only. In the
   morning the person on the project has to know where to look and piece together: did the night run, is anything
   new, what got fixed, is there something to do. On 2026-10-20 the 19 review files looked "missing" because they
   lived only in the QA folder.
2. **Runs never get shorter.** `rotation.mjs pick` queues every page every night (oldest review first). Once all
   19 pages are reviewed, the agent re-reads unchanged code each night until `STOP_AT`, producing the same
   suspects again. The Human's goal: as bugs get fixed, nights get shorter and the report gets emptier.

User stories:
- As the person on the project, I want one short morning report, shown when I open Claude in the main folder, so
  that I know in ten seconds whether there is anything to deal with.
- As the person on the project, I want the night to review only code that changed so that a clean app means a
  short, quiet night.

## Goals & Success Criteria
**Primary:** each morning `bugs/qa-runs/MORNING.md` in the QA folder says OK / ATTENTION / BLOCKED with one
"Do now" line, and opening Claude Code in the main folder shows that line; the code review only queues pages whose
code changed since their last review (or whose last review is older than 14 days).

- [auto] `npm run test:scripts` passes, including:
  - `scripts/test/code-qa-rotation.test.mjs` new cases: a done page with no changed files and a review younger
    than 14 days goes to `## Skipped`; a change in a file the last review cited (outside the page's globs) makes
    it due; a 15-day-old review makes it due; zero due pages → `queue.md` contains `Nothing to review tonight`;
  - new `scripts/test/qa-morning-report.test.mjs` on fixture folders: a night with a failed step → `Status:
    BLOCKED`; new S2 → `ATTENTION` and the finding listed; nothing new → `OK` and `Do now: nothing`; gone
    findings listed under Fixed; a due queue with zero review files → `BLOCKED` with "Code QA agent did not run".
- [auto] `node scripts/qa/morning-report.mjs --root=C:/dev/foodVibe-qa --date=2026-10-20 --out=-` exits 0 and
  prints a report whose `Status:` line is one of `OK` / `ATTENTION` / `BLOCKED` (read-only on the real QA folder).
- [auto] `node scripts/qa/morning-brief.mjs` in a `wt-N` slot prints nothing and exits 0; in a temp folder with a
  fresh fixture `MORNING.md` it prints one JSON object with `systemMessage` and
  `hookSpecificOutput.additionalContext`.
- [auto] `ng build` passes.
- [human] The first morning after merge: `C:\dev\foodVibe-qa\bugs\qa-runs\MORNING.md` exists with that night's
  date, and opening Claude Code in `C:\coding projects\Cursor\foodVibe1.0` shows its status line.
- [human] The second night after merge: `queue.md` lists only pages whose code changed under "due" and the rest
  under `## Skipped`, and the morning report says how many were skipped.

## Execution Mode
- Parallel: yes — only `scripts/qa/**`, its tests, QA docs and one SessionStart hook entry.
- Concurrent plans: 377, 407, 418 — no shared files.
- Isolated DB: no — no database access.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/qa/code-qa/rotation.mjs
scripts/qa/morning-report.mjs
scripts/qa/morning-brief.mjs
scripts/qa/qa-nightly-down.ps1
scripts/test/code-qa-rotation.test.mjs
scripts/test/qa-morning-report.test.mjs
scripts/test/fixtures/code-qa/**
scripts/test/fixtures/qa-morning/**
.claude/settings.json
docs/qa/README.md
docs/qa/code-qa.md
docs/qa/code-qa-agent.md
docs/workflow-kit/drift-classification.md
```

## Read Scope

Entire repo, plus the QA folder `C:\dev\foodVibe-qa\bugs\qa-runs\**` (read-only, for the real-data check).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — QA tooling and one session hook; no app, server, schema or data path is touched.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `pick`, `pickOrder`,
`changesSince`, `renderQueue`, `applyReview` / `ingest` in `rotation.mjs`; `mergeKnown` (`status`, `firstSeen`,
`goneSince`) in `scripts/qa/code-qa/findings.mjs`; the steps in `qa-nightly-up.ps1`, `qa-code-merge.ps1`,
`qa-nightly-down.ps1`; the `SessionStart` block of `.claude/settings.json`. Print one line per symbol: `ok` or
`conflict: <what>`.

## Design

### 1. Only review what changed (`rotation.mjs`)
- **At ingest:** for each review file, collect the cited code paths — every token matching
  `[\w./-]+\.(ts|html|scss|js|mjs|json):\d+` — resolve each to a repo path with `git ls-files` (exact path, else a
  unique suffix match; ambiguous or unknown → drop it) and store them on the page as `citedFiles` (unique, sorted)
  in `ledger.json`.
- **At pick:** a page is **due** when its status is `partial` or `never`, or
  `changesSince(root, lastCommit, [...page.files, ...citedFiles]).count > 0`, or `lastReviewed` is more than
  `FULL_REVIEW_DAYS = 14` days before `date`. Due pages keep today's order (`pickOrder`). Pages that are not due
  are listed after them under `## Skipped (no code change since last review)`, one line each:
  `- <ID> — last reviewed <date> at <commit>`.
- When no page is due, the queue body is the line `Nothing to review tonight — every page is unchanged since its
  last review.` plus the Skipped list.
- `docs/qa/code-qa-agent.md` §2: work only the numbered `## N.` pages; ignore `## Skipped`; when the queue says
  `Nothing to review tonight`, write nothing and stop.

### 2. Morning report (`scripts/qa/morning-report.mjs`, new)
CLI: `node scripts/qa/morning-report.mjs --root=<QA checkout> [--date=YYYY-MM-DD] [--out=<file>|-]`. Default date:
today (local); default out: `<root>/bugs/qa-runs/MORNING.md`, and then one line appended to
`<root>/bugs/qa-runs/morning-history.md` (`| date | status | new | fixed | open S1/S2/S3/S4 | skipped pages |`).
Read-only on everything else. Inputs and the line each feeds:

| Input | Feeds |
| --- | --- |
| `bugs/qa-runs/.nightly.log`, lines of the last 24 h | `Steps:` — `up`, `code-qa`, `merge`, `down` with their `-> exit N`; any N ≠ 0 → BLOCKED |
| `git -C <root> rev-parse --short HEAD` vs `origin/main` | `Code:` — reviewed commit; behind `origin/main` after the 00:00 pull → ATTENTION "QA ran on old code" |
| `code-qa/<date>/queue.md` + `review-*.md` | `Code review:` — due / reviewed / skipped pages; due > 0 and no review file → BLOCKED "Code QA agent did not run"; `BLOCKED-review.md` → BLOCKED |
| `code-qa/known.json` | `New:` (`firstSeen == date`), `Fixed:` (`goneSince == date`), `Still open:` by severity |
| `bugs/qa-runs/INDEX.md`, row whose run id starts with `date` | `UI run:` its status and note; no row → "UI run did not run" (ATTENTION) |

Layout (shown indented here; the real file starts at column 0 — the top block is what the session hook shows):

  ```
  # QA morning report — 2026-10-21
  Status: ATTENTION
  Do now: plan a fix for 2 new S2 findings (CODE-AI-012, CODE-AI-015)
  Night: steps ok · code 8d7997e5 (up to date) · code review 4 pages, 15 skipped · UI run 2026-10-21-a DONE
  Findings: new 3 (S2 2, S3 1) · fixed 7 · open S1 0 · S2 5 · S3 40 · S4 12
  
  ## New
  - CODE-AI-012 · S2 · INV · <title>
  ## Fixed
  - CODE-API-001 · S1 · SUPF · <title>
  ## Where to look
  - bugs/qa-runs/code-qa/latest.md · bugs/qa-runs/<run>/report.md · bugs/qa-runs/.nightly.log
```

`Do now` rules, first match wins: BLOCKED → "fix the night: <first failed step or reason>"; new S1/S2 → "plan a fix
for <n> new S1/S2 findings (<ids>)"; QA on old code → "check why the 00:00 pull did not fast-forward"; else
"nothing — no new S1/S2 findings". New lists show S1/S2 in full and S3/S4 as counts only; Fixed lists at most 10.

`qa-nightly-down.ps1` runs it after `qa-down.ps1` (both logged the same way), so the report covers the UI run too.

### 3. Show it in the morning (`scripts/qa/morning-brief.mjs`, new)
- A `SessionStart` (`startup`) hook in `.claude/settings.json`, next to `session-startup.sh`, timeout 10 s.
- Exits 0 silently when the cwd has `.worktree-root` (Worker slots), when the report is missing, or when its
  `# QA morning report — <date>` is older than yesterday. QA folder: env `FOODVIBE_QA_ROOT`, default
  `C:/dev/foodVibe-qa`.
- Otherwise prints one JSON object: `systemMessage` = `QA <date>: <Status> — <Do now>` (the Human sees it) and
  `hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: <the whole MORNING.md> }` (so the
  Planner can answer questions about the night). Any error → exit 0 with no output; it never blocks a session.
- `docs/workflow-kit/drift-classification.md`: extend the existing `core/.claude/settings.json` override reason
  with "FoodVibe SessionStart QA morning-brief hook".

### 4. Docs
- `docs/qa/README.md`: a "Every morning" section (where `MORNING.md` is, what the three statuses mean, the session
  line) and a note that `qa-nightly-up.ps1` already pulls `origin/main` at 00:00.
- `docs/qa/code-qa.md`: the due / skipped rule, `citedFiles`, `FULL_REVIEW_DAYS`, `MORNING.md` and
  `morning-history.md` in the file table.

## Functional Requirements

### Must Have (P0)
- [ ] Code review queues only pages whose code changed (globs + cited files) or whose review is over 14 days old.
- [ ] A morning report with status, one "Do now" line, new / fixed / open counts, written after QA stops.
- [ ] The report's status line shown when Claude Code starts in the main folder.

### Won't Have (this plan)
- A phone push notification (possible later from the Cowork UI agent's last step).
- Making the UI agent's run shorter (it already skips `PRE-CHECKED` items through `latest.md`).
- Committing QA results to git.

## Atomic Sub-tasks
- [ ] H1: Review only pages whose code changed so nights get shorter as the app gets cleaner — citedFiles at ingest, due/skipped rule with a 14-day full review, Nothing-to-review queue, tests — scripts/qa/code-qa/rotation.mjs, scripts/test/code-qa-rotation.test.mjs, scripts/test/fixtures/code-qa/**
- [ ] H2: Tell the Code QA agent to skip unchanged pages and stop when nothing is due — work only numbered pages, ignore Skipped, Nothing-to-review rule — docs/qa/code-qa-agent.md
- [ ] H3: Write one morning report that says whether the night needs anything from you — status, Do now, steps, new/fixed/open, history line, tests on fixture folders — scripts/qa/morning-report.mjs, scripts/test/qa-morning-report.test.mjs, scripts/test/fixtures/qa-morning/**
- [ ] H4: Produce the report every morning after QA stops — call morning-report.mjs from the 07:30 down step and log it — scripts/qa/qa-nightly-down.ps1
- [ ] H5: Show the morning report's status line when Claude Code opens in the main folder — morning-brief.mjs SessionStart hook, silent in slots and when stale, drift note — scripts/qa/morning-brief.mjs, .claude/settings.json, docs/workflow-kit/drift-classification.md
- [ ] H6: Explain the morning report and the shorter nights in the QA docs — Every morning section, due/skipped rule, file table — docs/qa/README.md, docs/qa/code-qa.md
- [ ] H7: Test, run the report on the real QA folder and hand you the two morning checks — npm run test:scripts, morning-report --out=- on C:/dev/foodVibe-qa, ng build; Human checks the first and second mornings — this plan file

## Technical Considerations
- Dependencies: none new (Node built-ins, `git`).
- Backend / API: none.
- Auth and validation: none.
- Security surface: the session hook reads one Markdown file from a fixed local folder and prints it; no secrets,
  no network. `.claude/settings.json` is a sensitive path for `/ship` — the change is one hook entry.
- Data / migration: `ledger.json` gains an optional `citedFiles` per page; old ledgers load unchanged (missing →
  `[]`).
- Project checks: no app or server code — the log-query item does not apply.

## Out of Scope
- Changing the Windows task times or the Cowork task prompts.
- Phone push notifications.
- Fixing any QA finding (plans 420, 421, 407).
