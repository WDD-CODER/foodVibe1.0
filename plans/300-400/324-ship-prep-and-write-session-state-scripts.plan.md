# Plan 324 — Ship Prep and Write Session State Scripts

## Goal

Move `/ship`'s mechanical steps (lane classification, baseline/manifest check, session-state write) and the review diff noise filter into scripts, with identical behavior.

## Files to check first

- `.claude/commands/ship.md` (Phase 0 lines 30–51, Phase 3 lines 95–113, Phase 5 lines 266–308)
- `scripts/session-manifest-hook.py` (writes `.claude/sessions/<branch>/manifest.txt`, one relative path per line, deduplicated — this is the source of "this-chat files")
- `scripts/session-manifest-ship.py` (JSON output shape: `{no_manifest, files, overlaps: [{branch, files}]}`, overlaps limited to manifests modified <24h ago)
- `scripts/handoff-check.sh` (validates session-state file contains: latest commit short hash, `## Session Summary`, `## Next Steps` headings)
- `.claude/commands/review.md` (lines 13–18)
- `.gitignore` (existing `.claude/.*` local-pointer pattern at lines 52–57 to follow for `.claude/.ship-baseline`)
- `scripts/todo-query.mjs` (from Plan 323, merged to `main`)

Verified against live repo on 2026-09-30 (branch `chore/ship-prep-scripts`, based on `origin/main` post-Plan-323-merge): all line numbers above match current state exactly. `scripts/ship-prep.mjs` and `scripts/write-session-state.mjs` do not exist yet. `.claude/.ship-baseline` is not yet in `.gitignore`.

## Atomic Sub-tasks

- [x] 1. Create `scripts/ship-prep.mjs [--mode auto|regular] [--check-baseline] [--json]`:
  - Reads `git status --short` and `git diff --numstat` (staged + unstaged). The this-chat file list is that set intersected with this branch's session manifest (`.claude/sessions/<branch>/manifest.txt`, same source `session-manifest-ship.py` uses). If there is no manifest, prints `no_manifest` and the full dirty list.
  - Classifies the lane using the exact rules in `ship.md` lines 36–39 (SENSITIVE_PATHS / ULTRA-TRIVIAL / FAST / REGULAR). Copy the SENSITIVE_PATHS regex verbatim into a single constant at the top of the script, with a comment pointing back to this plan. `--mode regular` forces REGULAR.
  - Prints the lane line in the existing announce format, e.g. `Lane: FAST (2 files, 14 lines, no sensitive paths)`.
  - If the worktree count is > 1, runs `python3 scripts/session-manifest-ship.py` and embeds the overlaps.
  - Writes branch + HEAD to `.claude/.ship-baseline` (add that file to `.gitignore`). `--check-baseline` prints `OK`, `HEAD_MOVED`, or `BRANCH_CHANGED`.
  - Flags secret-shaped paths (`.env*`, `*.pem`, `*.key`, `*secret*`).
  - Appends the output of `todo-query open` for any plan number found in the branch name.
- [x] 2. Create `scripts/write-session-state.mjs --summary "<bullets>" --next "<bullets>" [--pr <url>]`:
  - Resolves the target path exactly as Phase 5 step 1 does: `.claude/.session-state-path`, then `docs/session-state-${BRANCH}.md`, then `docs/session-state.md`.
  - Fills Branch, Date, Files Modified (`git diff --stat` for this session's commits) and Commit (short HEAD) itself.
  - With ≤1 changed file it appends one line; otherwise it does a full rewrite using the schema in `ship.md` lines 276–300.
  - Does not run `git add` or amend; those stay as prose steps 4–5 in Phase 5.
- [x] 3. Wire into `ship.md`:
  - Phase 0: replace the rule bullets with "Run `node scripts/ship-prep.mjs` (`--mode regular` for `/ship regular`); the script is the source of truth for thresholds." Keep the "announce the pick" sentence.
  - Phase 3: replace the manual branch/HEAD comparison with `node scripts/ship-prep.mjs --check-baseline`, keeping the STOP rules for `BRANCH_CHANGED`, the overlaps, and `no_manifest`.
  - Phase 5: replace the template-writing steps 2–3 with `write-session-state.mjs`.
- [x] 4. Review diff filter in `review.md` lines 13–18: add the pathspecs `':(exclude)package-lock.json' ':(exclude).claude/reports/**' ':(exclude).claude/todo-archive/**' ':(exclude).claude/techdebt-reports/**'`. Then add `git diff --stat` of the excluded paths, so the reviewer knows they changed. Keep `dictionary.json` included.

**Human-validated 2026-09-30.**

## Rules

- Behavior must be identical to today. No threshold, gate, or lane changes.
- The approval gates stay in prose, untouched: wait for Y, ULTRA-TRIVIAL auto-proceed, never commit to main, never force-push, never amend after push.
- Do not edit `session-manifest-*.py`, `claim-parallel-slot.sh`, or `session-lock.sh` (Planner-Worker rework, out of scope).
- Do not restructure the rest of `ship.md`; Brief B2 (Plan 325, not yet started) does that.
- `ship.md` is itself a SENSITIVE_PATH — ship this plan on the REGULAR lane.

## Verify / Done when

- On a throwaway branch, `node scripts/ship-prep.mjs` gives: a 1-line edit to a `docs/*.md` file → ULTRA-TRIVIAL; 2 src files with ~20 lines → FAST; any edit to `server/routes/ai.js` → REGULAR.
- Switching branches mid-ship makes `--check-baseline` print `BRANCH_CHANGED`.
- A FAST `/ship` produces a session-state file in the correct schema, and `handoff-check.sh` reports no warnings.
- `/review` on a branch that bumps a dependency no longer prints the `package-lock.json` hunks, only its stat line.

## Sequence note

Second of a 3-part sequence: Plan 323 (merged) → this plan (Plan 324) → Brief B2 (`ship.md` file split, not yet started). Each part is a separate plan, executed and Human-validated in order before the next starts.
