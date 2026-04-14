# .claude/sessions/

This directory holds two types of files:

**Plan session directories** (e.g. `2026-04-13-cook-timer-labor-separation/`) — created by `/new-feature` and `/plan-implementation`. Contain `brief.md` and plan artifacts.

**Mid-task checkpoint files** (e.g. `2026-04-13-1430-cook-timer-refactor.md`) — flat files written by `/checkpoint`. Naming: `YYYY-MM-DD-HHMM-<kebab-slug>.md`. These are point-in-time snapshots, never overwritten.

Checkpoint files are written by `/checkpoint` and consumed by `/resume <path>`. Once the task they describe is fully merged and done, move them to `.claude/sessions/archive/` to keep the directory clean.
