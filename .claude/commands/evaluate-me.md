# Agent Session Retrospective

Before compacting, analyze this entire session and generate a retrospective report.

## Step 1: Session Inventory

Identify and document:
- **Agent(s) used**: Which agent personas were active (from agent.md)
- **Goal**: What was the session trying to accomplish
- **Files touched**: List all files created, modified, or read
- **Tools used**: Which tools/commands were invoked
- **Duration signals**: Approximate scope (small fix vs large feature)

## Step 2: Evaluate Against Standards

For each agent that was active, evaluate against its defined responsibilities in `agent.md`:

### Efficiency
- Unnecessary file re-reads? (reading same file multiple times)
- Redundant tool calls?
- Could fewer steps have achieved the same result?
- Token waste patterns?

### Accuracy
- Did changes match the brief/request?
- Were there rollbacks or corrections needed?
- Type errors or build failures introduced?

### Gate Compliance
- Were mandatory gates followed? (post-execution `ng build`, etc.)
- Were verification steps skipped?

### Decision Quality
- When facing ambiguity, were decisions reasonable?
- Was clarification sought when needed, or did agent guess wrong?
- Over-engineering or under-engineering?

### Convention Adherence
- Signals-only reactivity followed?
- `inject()` over constructor DI?
- `.c-*` engines in styles.scss only?
- CRDUL method ordering?
- Other standards from CLAUDE.md/agent.md violated?

## Step 3: Pattern Extraction

Identify:
- **What went well**: Patterns to reinforce
- **What went wrong**: Specific failure points with context
- **Root causes**: Why did failures happen? (unclear instructions, missing context, wrong assumptions, skill gaps)
- **Recurring issues**: Patterns seen before in other sessions

## Step 4: Generate File Change Suggestions

For each issue identified, suggest concrete fixes to agent files:

```
### Suggested Edit: [file path]

**Problem**: [what went wrong]
**Location**: [section/line if known]
**Current**: [current text or "missing"]
**Suggested**: [exact new text]
**Rationale**: [why this fixes the root cause]
```

Target files for suggestions:
- `.claude/agent.md` — agent personas, gates, workflows
- `.claude/CLAUDE.md` — base rules, conventions
- `.claude/skills/*.md` — skill definitions
- `.claude/commands/*.md` — command prompts
- `copilot-instructions.md` — IDE-level guidance

## Step 5: Save Report

Save the full retrospective to:
`.claude/retrospectives/[TIMESTAMP]-[AGENT-NAME].md`

Use format: `YYYY-MM-DD-HH-MM-agent-name.md`
Example: `2026-04-02-14-30-software-architect.md`

If multiple agents were used, use primary agent or `multi-agent`.

## Report Structure

```markdown
# Retrospective: [Session Goal]
**Date**: [timestamp]
**Agent(s)**: [list]
**Verdict**: [SUCCESS | PARTIAL | FAILED]

## Summary
[2-3 sentences: what happened, what was the outcome]

## Session Stats
- Files modified: X
- Tool calls: ~Y
- Build failures: Z
- Rollbacks needed: N

## What Went Well
- [specific pattern with example]

## What Went Wrong
- [specific failure with context]

## Root Cause Analysis
| Issue | Root Cause | Impact |
|-------|------------|--------|

## Suggested File Changes

### 1. [file path]
**Problem**: ...
**Suggested edit**: ...

### 2. [file path]
...

## Action Items
- [ ] [specific actionable improvement]
```

---

Now generate the retrospective for this session.
