# Plan 381 — Validation Card Format

Status: active
Snapshot: c84efd1f

## Problem Statement
HOW TO VALIDATE reaches the Human as one jargon line per check (`action → result`), often copied straight from the plan's Done-when text. The Human can't tell where to go, what to type, or what failure looks like, and the "no commands" rule leaves workflow jobs with no way to say what to paste. Chosen fix: a card per check — WHERE / DO / SEE ✓ / FAIL ✗, plain words, exact paste text when a terminal is needed, terms of art glossed. Authored in the kit first, then mirrored into FoodVibe.

## Goals & Success Criteria
**Primary:** every Human validation ask is a set of cards a non-engineer can follow without asking.

- [auto] `kit-manifest-check`, `kit-owned --check`, `plan-ledger-check`, `ng build`, and the kit's leak/pack/install checks pass.
- [human] The next Worker close-out arrives as cards, and the Human can do every step without asking.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots.

```scope
docs/agent/job-validation.md
.claude/commands/ship.md
.claude/commands/done.md
docs/workflow-kit/**
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (authored there first).

## Read Scope

Entire FoodVibe repo.

## Escalation Protocol

If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry.

## Atomic Sub-tasks
- [x] A1: Card format + rules (paste text allowed with the window named; rewrite Done-when in plain words; gloss terms) — `docs/agent/job-validation.md`
- [x] A2: `ship.md` Phase 4 and `done.md` show the card shape and point at the doc — `.claude/commands/ship.md`, `.claude/commands/done.md`
- [ ] A3: Checks + `/ship`; Dandan commits the kit repo.
