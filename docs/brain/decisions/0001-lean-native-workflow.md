---
status: accepted
date: 2026-07-12
review-by: 2027-01-12
---

# 0001 — Lean native workflow over heavier orchestration

## Context

FoodVibe is a solo-dev project. Agent work (planning, review, shipping) needs structure without needing a team of reviewers or a heavyweight external orchestration framework to enforce it.

## Decision

Use native, file-based tooling: Markdown commands (`.claude/commands/*.md`), Markdown skills (`.claude/skills/*/SKILL.md`), a plain-text plan/review/ship pipeline (`/plan` → Contractor → `/review-it` → `/ship`), and CI/pre-commit hooks as the actual enforcement layer — rather than a bespoke orchestration service, database-backed task queue, or third-party agent framework.

## Consequences

- Every workflow artifact is a readable file in the repo, diffable and greppable — no separate system to keep in sync.
- The tradeoff is more manual discipline (agents must actually read and follow the command files) versus a framework that would enforce structure programmatically.
- Enforcement of hard rules still routes through CI + pre-commit hooks, not through the workflow files themselves — see `AGENTS.md` § Enforcement.

## Review

Revisit if the number of commands/skills grows large enough that manual cross-referencing (which command invokes which skill) becomes error-prone, or if multi-agent coordination needs state that a flat file can't represent.
