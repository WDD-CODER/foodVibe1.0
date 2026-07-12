## Goal
Build a three-part context-management system (detect â†’ checkpoint â†’ resume) so agents can save state mid-task before context exhaustion and a fresh session can pick up cleanly.

## Scope

### Modified files:
- `.claude/agents/team-leader.md` â€” append "Context hygiene" section
- `.claude/agents/software-architect.md` â€” append "Context hygiene" section
- `.claude/agents/product-manager.md` â€” append "Context hygiene" section
- `.claude/agents/qa-engineer.md` â€” append "Context hygiene" section
- `.claude/agents/security-officer.md` â€” append "Context hygiene" section
- `.claude/agents/breadcrumb-navigator.md` â€” append "Context hygiene" section

### New files:
- `.claude/skills/context-management/SKILL.md` â€” detection heuristics (triggers, non-triggers, how-to rule)
- `.claude/commands/checkpoint.md` â€” save command: writes dated session file with full schema, prints resume prompt
- `.claude/commands/resume.md` â€” restore command: reads session file, echoes 3-line summary, waits for "go"
- `.claude/sessions/README.md` â€” 5-line explainer of naming convention and lifecycle

## Out of Scope
- No Angular/TypeScript changes
- No modifications to existing commands (`/retro`, `/auto-solve`, etc.)
- `/ship (formerly /ship)` and `git-agent.md` excluded (session-boundary agents, not mid-task workers)
- No automated context counting (triggers are heuristic/manual, not programmatic)

## Constraints
- Command file format: match existing `.claude/commands/` style (plain markdown, no frontmatter on commands)
- SKILL.md format: frontmatter (`name`, `description`) + `# Skill:` heading + sections
- Checkpoint files are **flat files** at `.claude/sessions/YYYY-MM-DD-HHMM-<slug>.md` (not subdirectories â€” deliberate new convention for ephemeral saves vs. the plan session dirs)
- Session filename slug: kebab-case, no spaces, no special chars
- Persona edits: additive only â€” append, never rewrite
- "Context hygiene" block: â‰¤4 lines, references SKILL.md and `/checkpoint`

## Prior Work
- MemPalace unavailable this session
- No prior plans found matching "context management checkpoint resume"

## Success Criteria
- [ ] `.claude/skills/context-management/SKILL.md` exists with: Purpose, When to checkpoint, When NOT to checkpoint, How to checkpoint, Rule of thumb
- [ ] `/checkpoint` writes `.claude/sessions/<timestamp>-<slug>.md` with all schema sections filled and prints resume prompt
- [ ] `/resume <file>` reads session file, prints Goal / Current step / Next action, waits for "go"
- [ ] All 6 agent persona files (team-leader, software-architect, product-manager, qa-engineer, security-officer, breadcrumb-navigator) contain the "Context hygiene" block
- [ ] `.claude/sessions/README.md` exists with naming convention and lifecycle explanation
- [ ] Zero changes outside `.claude/`

## Session ID
2026-04-13-context-management
