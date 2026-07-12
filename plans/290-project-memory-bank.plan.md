# Plan 290 — Project Memory Bank (`docs/brain/`)

Supersedes Brief 8 v2 in full. Depends on: Brief 1 (`docs/agent/` + `AGENTS.md` — present), Brief 2 (`.github/workflows/ci.yml` — present), Brief 4/5 (`/ship`'s commit-approval gate + commit-vs-PR judgment — present).

## Problem Statement

Durable project knowledge (decisions, proven patterns, gotchas) currently has nowhere to live. `docs/agent/` holds rules, `session-state.md`/`todo.md` hold transient state, but nothing captures *why* a past decision was made or *what trap* cost time before — so it gets re-learned or re-argued every few sessions.

## Goals & Success Criteria

- Primary: a lightweight, plain-markdown `docs/brain/` that agents read at session start on unfamiliar work and write to (rarely, deliberately) at ship time.
- Success: capture rides the *existing* `/ship` commit-approval prompt — zero new confirmation gates — and staleness checking is advisory-only, never auto-editing.

## Functional Requirements

### Must Have (P0)
- [x] `docs/brain/` scaffolded: `index.md`, `projectbrief.md`, `decisions/`, `patterns/`, `gotchas.md`, `glossary.md`
- [x] Seeded per Part B (6 gotchas, 3 patterns, 2 ADRs, glossary from `standards-domain.md`, `projectbrief.md` distilled from `AGENTS.md`)
- [x] `AGENTS.md` gains 3 trigger rows (session-start read, decision→check `decisions/`, surprise→`gotchas.md`)
- [x] `.claude/commands/ship.md` Phase 4 (the existing visual-tree approval) shows a proposed brain entry as an extra tree item when the session produced something durable — omitted entirely otherwise. Dropping it is just "edit list" — no new Y/N line.
- [x] `scripts/brain-review-check.mjs --scope=dead-refs` (fast, PR-diff-scoped) wired into `ci.yml` as a new `continue-on-error` step
- [x] `scripts/brain-review-check.mjs --scope=full` (whole-repo dead refs + past `review-by` dates) wired into `/ship`'s **feature-complete/PR path only** (the branch where the commit-vs-PR judgment proposes a PR) — not on milestone/checkpoint commits, not on plain `/ship` in general
- [x] `.cursor/rules/*.mdc` stub pointing at `docs/brain/index.md`

### Should Have (P1)
- [x] Cursor-side ship/wrap-up parity for the brain-entry fold-in, if a Cursor ship command exists — else explicit note in final report that Cursor sees the plain gate only

## Atomic Sub-tasks (source: Brief 8 v3, steps 1–15)
- [x] A1: Scaffold `docs/brain/{index.md,projectbrief.md,gotchas.md,glossary.md,decisions/,patterns/}`
- [x] A2: Write `projectbrief.md` (Angular 19 + Express + MongoDB Atlas + Gemini backend-proxied, Render, solo dev, free-tier, Hebrew RTL, scope areas)
- [x] A3: Write `gotchas.md` — 6 seed entries (worktree-remove-from-inside, `gh pr create` PAT scope, `node --watch` restart handling, prod `logServerUrl` silent-logs gap, compaction signal loss, `npm audit --force` = Angular 22 deferral)
- [x] A4: Write `patterns/` — 3 files (tombstone soft-delete, Gemini backend-proxy, signals-only-state) cross-linking `docs/agent/conventions.md`, not restating it
- [x] A5: Write `decisions/0001-lean-native-workflow.md`, `decisions/0002-file-based-memory-over-tool-memory.md` (frontmatter: `status`, `date`, `review-by` ~6 months out)
- [x] A6: Write `glossary.md` from real terms in `docs/agent/standards-domain.md`
- [x] A7: Write `index.md` last (<40 lines): reading order, one-line "when to read" per area, note that current work status lives in `session-state.md`/`todo.md`, not here
- [x] B1: Add 3 trigger rows to `AGENTS.md`'s existing trigger table
- [x] B2: Modify `ship.md` Phase 4 — when session produced a durable learning, draft the brain entry and add it as an extra line item in the visual tree (same prompt, same `Approve? (Y / edit list / abort)` — no new gate); when nothing durable, omit the block entirely
- [x] C1: `scripts/brain-review-check.mjs --scope=dead-refs` — extract file paths referenced in `docs/brain/**/*.md`, flag only entries whose referenced files are deleted/renamed in the current PR's diff; exit 0 always
- [x] C2: `scripts/brain-review-check.mjs --scope=full` — dead refs across the whole repo + all past-due `review-by` dates; exit 0 always
- [x] C3: Wire `--scope=dead-refs` into `ci.yml` as a new non-blocking step (`continue-on-error: true`), runs on every PR
- [x] C4: Wire `--scope=full` into `ship.md`'s feature-complete/PR path (inside the "Otherwise — brief used this session" / PR-proposed branch of the commit-vs-PR judgment), printed as part of the ship output summary
- [x] D1: Add/confirm `.cursor/rules/*.mdc` stub pointing at `docs/brain/index.md`
- [x] D2: Check for a Cursor-side ship/wrap-up command; if present, mirror the brain-entry fold-in language; if absent, state so explicitly in the final report

## Out of Scope
- Any edit under `src/app/**`
- New standalone confirmation gates
- Auto-editing or auto-deleting brain files from either maintenance-check mode
- Session logs / chronological entries in `docs/brain/` (distilled knowledge only)

## Technical Considerations
- Dependencies: `AGENTS.md` trigger table, `.claude/commands/ship.md` Phase 4 + commit-vs-PR judgment section, `.github/workflows/ci.yml`, existing `.cursor/rules/*.mdc` pattern (check current stub format before adding).
- New files: `docs/brain/**` (7+ files), `scripts/brain-review-check.mjs`, possibly one new `.cursor/rules/*.mdc`.
- No model/interface changes. No `src/app/**` changes. No Hebrew/UI surface — N/A.

## Critical Questions
Resolved during refinement (see brief-detection gate discussion this session):
1. Where does `--scope=full` run given `/ship` has no distinct wrap-up trigger? → **Feature-complete/PR path only**, reusing the existing commit-vs-PR judgment.
2. How does the brain entry fold into the single-shot approval gate? → **Extra tree line item**, reusing the existing "edit list" answer — no new Y/N line.

## Milestones

### M1 — Scaffold + seed (`docs/brain/`)
Sub-tasks: A1–A7.
**Verify:** `ls docs/brain docs/brain/decisions docs/brain/patterns` shows all files; `wc -l docs/brain/index.md` < 40; no file references anything under `src/app/**`.

### M2 — Wire alive: `AGENTS.md` triggers + `ship.md` capture fold-in
Sub-tasks: B1–B2.
**Verify:** `AGENTS.md` diff shows 3 new trigger rows; `ship.md` Phase 4 diff shows the brain-entry tree-item logic with no new gate; manually trace a "durable session" case (entry shown) and a "trivial session" case (block omitted).

### M3 — Maintenance loop (dead-refs in CI, full review in `/ship`)
Sub-tasks: C1–C4.
**Verify:** `node scripts/brain-review-check.mjs --scope=dead-refs` exits 0; `node scripts/brain-review-check.mjs --scope=full` exits 0; `ci.yml` diff shows the new `continue-on-error` step; `ship.md` diff shows `--scope=full` only inside the PR-proposed branch, not the checkpoint branch.

### M4 — Cursor parity
Sub-tasks: D1–D2.
**Verify:** `.cursor/rules/*.mdc` stub present and points at `docs/brain/index.md`; final report states explicit Cursor ship-parity status either way.

Each milestone: `ng build` must still pass (docs/scripts-only changes, but this is the unconditional hard gate per `AGENTS.md`) before marking `[x]`.
