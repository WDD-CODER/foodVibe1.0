## Goal
Build a three-part context-management system (detect → checkpoint → resume) so agents can save state mid-task before context exhaustion and a fresh session can pick up cleanly.

## Scope

### Modified files:
- `.claude/agents/team-leader.md` — append "Context hygiene" section
- `.claude/agents/software-architect.md` — append "Context hygiene" section
- `.claude/agents/product-manager.md` — append "Context hygiene" section
- `.claude/agents/qa-engineer.md` — append "Context hygiene" section
- `.claude/agents/security-officer.md` — append "Context hygiene" section
- `.claude/agents/breadcrumb-navigator.md` — append "Context hygiene" section

### New files:
- `.claude/skills/context-management/SKILL.md` — detection heuristics (triggers, non-triggers, how-to rule)
- `.claude/commands/checkpoint.md` — save command: writes dated session file with full schema, prints resume prompt
- `.claude/commands/resume.md` — restore command: reads session file, echoes 3-line summary, waits for "go"
- `.claude/sessions/README.md` — 5-line explainer of naming convention and lifecycle

## Out of Scope
- No Angular/TypeScript changes
- No modifications to existing commands (`/retro`, `/auto-solve`, etc.)
- `end-of-session-agent.md` and `git-agent.md` excluded (session-boundary agents, not mid-task workers)
- No automated context counting (triggers are heuristic/manual, not programmatic)

## Constraints
- Command file format: match existing `.claude/commands/` style (plain markdown, no frontmatter on commands)
- SKILL.md format: frontmatter (`name`, `description`) + `# Skill:` heading + sections
- Checkpoint files are **flat files** at `.claude/sessions/YYYY-MM-DD-HHMM-<slug>.md` (not subdirectories — deliberate new convention for ephemeral saves vs. the plan session dirs)
- Session filename slug: kebab-case, no spaces, no special chars
- Persona edits: additive only — append, never rewrite
- "Context hygiene" block: ≤4 lines, references SKILL.md and `/checkpoint`

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
