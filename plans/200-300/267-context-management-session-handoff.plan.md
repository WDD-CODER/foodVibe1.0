---
name: Context Management + Session Handoff
overview: Install claude-code-session-kit hooks via merge, then build custom checkpoint/resume commands and agent persona edits for the gaps it doesn't cover.
isProject: false
todos:
  - Task 1: scripts/ — copy 4 session-kit hooks + chmod +x
  - Task 2: docs/session-state.md — create from template
  - Task 3: .claude/settings.json — merge 4 hook entries
  - Task 4: CLAUDE.md — append Session Management section
  - Task 5: .claude/skills/context-management/SKILL.md — create skill
  - Task 6: .claude/commands/checkpoint.md — create command
  - Task 7: .claude/commands/resume.md — create command
  - Task 8: .claude/agents/ — Context hygiene section x6
  - Task 9: .claude/sessions/README.md — create explainer
  - Task 10: plans/session-handoff-setup.md — user-facing doc
  - Task 11: Verify /rewind works
---

## Goal
Install claude-code-session-kit hooks (context-monitor, pre-compact-reminder, session-startup, handoff-check) via careful merge into existing foodVibe setup, then build custom `/checkpoint`, `/resume` commands and agent persona edits for the gaps session-kit doesn't cover.

## Verdict
**INSTALL_WITH_MERGE** — see `plans/session-kit-eval.md` for full analysis.  
License: MIT ✓

## Atomic Sub-tasks

### session-kit install
- [ ] Task 1: `scripts/` — copy context-monitor.sh, pre-compact-reminder.sh, session-startup.sh, handoff-check.sh from /tmp/session-kit; chmod +x
- [ ] Task 2: `docs/session-state.md` — create from `/tmp/session-kit/session-handoff/session-state-template.md`
- [ ] Task 3: `.claude/settings.json` — add SessionStart, PreCompact, Stop hook entries; append new PostToolUse entry alongside existing tool-failure-hook.ps1
- [ ] Task 4: `CLAUDE.md` — append `## Session Management` section (3–4 lines pointing to docs/session-state.md)

### Custom gap items
- [ ] Task 5: `.claude/skills/context-management/SKILL.md` — detection heuristics: Purpose, When to checkpoint (40/60/70% language), When NOT to, How to, Rule of thumb
- [ ] Task 6: `.claude/commands/checkpoint.md` — writes `.claude/sessions/YYYY-MM-DD-HHMM-<slug>.md` with full schema; prints resume prompt
- [ ] Task 7: `.claude/commands/resume.md` — reads session file, echoes 3-line summary (Goal / Current step / Next action), waits for "go"
- [ ] Task 8: `.claude/agents/` — append `## Context hygiene` (4 lines) to team-leader.md, software-architect.md, product-manager.md, qa-engineer.md, security-officer.md, breadcrumb-navigator.md
- [ ] Task 9: `.claude/sessions/README.md` — 5-line explainer: what lives here, YYYY-MM-DD-HHMM-slug.md convention, written by /checkpoint, consumed by /resume, archive note
- [ ] Task 10: `plans/session-handoff-setup.md` — 10-line user-facing doc: how to trigger handoff, where files live, how to resume
- [ ] Task 11: Verify `/rewind` — check Claude Code docs/version for availability

## Constraints
- No Angular/TypeScript changes
- No overwriting existing files — merge only
- Hooks go into `.claude/settings.json` (not settings.local.json — our convention)
- Persona edits are additive only
- scripts/ bash files coexist with existing .mjs files (different extensions)

## Done when
- `scripts/` has 4 new .sh files, all executable
- `docs/session-state.md` exists
- `.claude/settings.json` has all 4 new hook entries, existing PostToolUse entry preserved
- `CLAUDE.md` has `## Session Management` section
- `.claude/skills/context-management/SKILL.md` exists
- `.claude/commands/checkpoint.md` and `resume.md` exist
- All 6 agent persona files contain `## Context hygiene`
- `.claude/sessions/README.md` exists
- `plans/session-handoff-setup.md` exists
- `/rewind` status confirmed
