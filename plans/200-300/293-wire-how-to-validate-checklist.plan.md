---
name: Wire HOW TO VALIDATE checklist
overview: Make the HOW TO VALIDATE bullet checklist a mandatory part of every job close-out for both agents, by folding the orphaned spec into docs/agent/job-validation.md.
todos: []
isProject: true
---

# Plan 293 — Wire HOW TO VALIDATE checklist

## Goal

Whenever an execution job needs Human validation (brief, milestone, feature, or chat job), the agent must show plain-language **HOW TO VALIDATE** bullets (`action → expected result`) before the JOB DONE / ship Y ask — so the Human does not invent the QA steps.

## Why this placement

Canonical gate both agents already load: `docs/agent/job-validation.md`. The orphaned `.claude/instructions/validation-checklist.md` is retired to a pointer stub.

## Atomic Sub-tasks

- [x] M1 Save plan + mirror ledger in `.claude/todo.md`
- [x] M2 `docs/agent/job-validation.md` — add HOW TO VALIDATE section; wire Path A + Path B close-out
- [x] M3 `AGENTS.md` — update close-out template + hard rule line
- [x] M4 `.cursorrules` — execution protocol + handoff require checklist
- [x] M5 `.claude/commands/done.md` + `ship.md` — checklist in close-out / Phase 4 tree
- [x] M6 `.claude/instructions/validation-checklist.md` — replace with pointer stub

## Done when

- Path B close-out and `/done` show HOW TO VALIDATE above JOB DONE
- `/ship` Phase 4 tree includes HOW TO VALIDATE before Approve Y
- Cursor contractor milestone STOP includes the checklist
- No second live copy of the checklist rules (stub only)

## Out of scope

- Hook/script enforcement automation
- Changing planning-only / architecture agent flows
