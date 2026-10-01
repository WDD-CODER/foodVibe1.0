# Plan 327 — Validation Gate Tiers

Status: active

## Problem Statement

Job validation is a single hard Human gate. Split it into two tiers. Done-when criteria a
computer can check (tagged `[auto]`) are self-verified with raw evidence and the agent marks
them done itself. Criteria that need a person (`[human]`, or untagged) keep today's hard
Human gate. `/ship` Y stays as the commit/push consent in every case.

Note: the brief asked for "Plan 325", but 325 (ship-md split) and 326 (planner-worker) are
already taken — saved as 327. B2 (the ship.md split) has landed: Phase 4 / "On approval"
live in core `.claude/commands/ship.md`.

## Goals & Success Criteria

- Primary: a two-tier validation gate documented consistently across AGENTS.md, job-validation.md, ship.md, done.md and the mirrored pointers.
- Success: every Done-when item below passes.

## Read-Write Scope

```scope
plans/327-validation-gate-tiers.plan.md
AGENTS.md
docs/agent/job-validation.md
docs/agent/workflow-map.md
docs/agent/standards-git.md
docs/brain/decisions/0014-validation-gate-tiers.md
.claude/commands/ship.md
.claude/commands/done.md
.claude/commands/review-it.md
.claude/skills/save-plan/SKILL.md
.cursor/rules/contractor-role.mdc
scripts/todo-query.mjs
```

## Rules

- Docs, commands, and the single script flag only. No changes to `src/` or `server/`.
- Do not touch `design-port.md` or `_claude-data/design-migration/**` (port-spec approval is inherently `[human]`).
- Do not touch `auto-solve.md`.
- Do not change /ship lanes, the fast flag, Phase 4.5, or the ULTRA-TRIVIAL auto-approve.
- Backward compatible: untagged plans behave exactly as today.
- `(auto-verified)` must not affect `todo-archive.mjs` skip rules (`(deferred)`, `(skipped)`, `[~]`); confirm with `--dry-run`.
- `.mjs` edits: single quotes, no semicolons.
- ADRs are append-only: create 0014; never edit 0001–0009.

## Atomic Sub-tasks

- [x] S1 Branch `feat/327-validation-gate-tiers` created; plan saved (this file)
- [x] S2 `.claude/skills/save-plan/SKILL.md`: Plan Rules tag syntax (`[auto]`/`[human]`, untagged = human, UI-only-`ng build` plan needs a `[human]` item); line ~126 "On validation per docs/agent/job-validation.md (Human reply, ship Y, or the Tier 1 auto path)". Checkbox regex in `scripts/lib/todo-parse.mjs` only matches `- [ ]` / `- [x]`, so `[auto]` / `[human]` are safe
- [x] S3 `docs/agent/job-validation.md`: rewrite Core rule; scope Counts/Does-not-count table to `[human]`; add "Tier 1 — auto-verified" section with VERIFIED BY AGENT format; Path B three cases (all-auto / mixed / untagged); Path A all-`[auto]` replaces HOW TO VALIDATE; cross-link ADR 0014
- [x] S4 `AGENTS.md`: hard-rule bullet (line 20); two-line tier summary in the "Job validation" section; extend "Never show the JOB DONE ask…" with "…or VERIFIED BY AGENT for an all-[auto] job"
- [x] S5 `.claude/commands/ship.md` Phase 4: alternative VERIFIED BY AGENT block; update "HOW TO VALIDATE: Mandatory" paragraph; "On approval" line (Y = commit/push consent + Human validation of `[human]` items). Lanes / fast flag / Phase 4.5 untouched
- [x] S6 `.claude/commands/done.md`: step 3 all-`[auto]` branch (evidence block, `--auto-verified`, no wait); "Never self-mark `[human]` or untagged items without Human validation"
- [x] S7 Mirror pointers: `.cursor/rules/contractor-role.mdc`, `docs/agent/workflow-map.md`, `docs/agent/standards-git.md`, `.claude/commands/review-it.md` (keep "review ≠ validation")
- [x] S8 `scripts/todo-query.mjs` `cmdMark()`: optional `--auto-verified` flips `[ ]`→`[x]` and appends `(auto-verified)`; keep existing error when the line isn't `[ ]`; update usage header
- [x] S9 `docs/brain/decisions/0014-validation-gate-tiers.md` from `_TEMPLATE.md` (Context / Decision / Consequences); 0014 because Plan 321 P8 pre-claims 0010–0013

## Done when

- [auto] `git grep -nE "Never self-mark todos|never done until the Human validates"` returns no hits outside `plans/`, `sessions/`, `docs/archive/`, and `.claude/todo-archive/`
- [auto] `node scripts/todo-query.mjs mark --line N --auto-verified` on a scratch copy flips `[ ]` → `[x]` and appends `(auto-verified)`; running it again on the same line exits non-zero
- [auto] `node scripts/todo-archive.mjs --dry-run` output is byte-identical before and after the change on the current `.claude/todo.md`
- [auto] `ng build` exits 0
- [human] Reading `job-validation.md` → the three Path B cases (all-auto / mixed / untagged) are unambiguous, and an all-`[auto]` job visibly finishes without a JOB DONE wait
- [human] A `/ship` dry read of Phase 4 → it is clear that Y is still required and now means commit/push consent
