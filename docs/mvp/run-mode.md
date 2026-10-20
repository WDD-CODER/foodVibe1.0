# MVP run mode — rules for every builder and checker agent

Dandan authorised an unattended run (2026-10-20). These rules override the parts of `take-plan`, `/ship`
and the plan files that assume `main` or a Human in the loop. Everything else in `AGENTS.md`, the
standards docs and the plan itself still applies.

## Branches
- Base branch is **`origin/mvp`**, never `main`. Branch name: `feat/<NNN>-<slug>` from `origin/mvp`.
  If the branch already exists (a resumed run), continue on it: `git fetch`, `git checkout`, rebase onto `origin/mvp`.
- Never commit, push or merge to `main`. Never run `take-plan.mjs`'s "mark active on main" commit.
- Push the feature branch to `origin`. Merging into `mvp` is done only by the orchestrator's merge step.
- `ng build` must pass before every commit (hard rule). Commit messages end with the Co-Authored-By / Claude-Session lines.

## Human gates → deferred, never skipped silently
- **Atlas / production data:** never write. Rehearse every migration with `--db=<scratch>` on a local
  restore (or local seed if no restore is available) and run `--verify=yes`. Write the exact Atlas
  commands, in order, to `docs/mvp/runs/<NNN>.md` under `## Final gate — Atlas`.
- **`[human]` Done-when items:** never mark them `[x]`. Write each as a validation card (format in
  `~/.claude/CLAUDE.md` "Human validation hand-off": page, WHY, WHERE, DO, SEE ✓, FAIL ✗) under
  `## Human checks` in `docs/mvp/runs/<NNN>.md`, with the page path and any SETUP data.
- **`[auto]` items:** mark `[x]` only with the evidence (command + result) in the run file.
- Product decisions the plan leaves open: take the plan's recommended option.

## Decisions and contracts
- Every choice not dictated by the plan: one line in `docs/mvp/runs/<NNN>.md` under `## Decisions`
  (`decision · why`). Keep it short — Dandan reads them in the morning.
- Contracts live in `docs/mvp/mvp-map.md`. You MAY extend them (new field, new export, new taxonomy kind,
  new endpoint a plan needs) — append under `## Contract extensions (run)` with plan number, and log the
  decision. You may NOT rename, remove or change the meaning of an existing contract item to work around
  a problem; stop that plan and report it as a blocker instead.
- Architecture: follow `docs/brain/invariants.md` (INV-1/INV-2 per ADR 0023 once plan 424 lands). An ADR
  needed by the plan may be added; an invariant may not be weakened.

## Scope
- Write only inside the plan's `## Read-Write Scope` (+ always-allowed files, + `docs/mvp/runs/<NNN>.md`,
  + `docs/mvp/mvp-map.md` contract-extension section). Needing a file outside scope: if the change is
  small and clearly required by the plan, add it to the plan's scope block, log the decision, continue.
  Otherwise report a blocker.
- Frozen files (`_shared/tech-stack.md`): net line count ≤ 0 (`git diff --numstat origin/mvp -- <file>`).

## Run file `docs/mvp/runs/<NNN>.md`
Sections: `## Status` (built / parked + reason) · `## Evidence` ([auto] results) · `## Decisions` ·
`## Human checks` · `## Final gate — Atlas` (if any) · `## Checker rounds` (one line per round).
