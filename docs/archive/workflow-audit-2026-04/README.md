# Claude Workflow Audit — Index

Factual inventory of every file under `.claude/` and the two gate-chain roots (`CLAUDE.md`, `agent.md`).
No opinions or evaluation. Every `.claude/` file appears exactly once across the six category files.

## Files in this audit

| File | Contents | Entry count |
|------|----------|-------------|
| [gate-chain.md](gate-chain.md) | CLAUDE.md, agent.md, copilot-instructions.md | 3 |
| [agents.md](agents.md) | `.claude/agents/` persona files | 8 |
| [commands.md](commands.md) | `.claude/commands/` command files | 25 |
| [skills.md](skills.md) | `.claude/skills/` SKILL.md files + workspace/reference sub-dirs | 27 |
| [instructions.md](instructions.md) | `.claude/instructions/` files | 1 |
| [misc.md](misc.md) | All remaining `.claude/` files (settings, hooks, reflect/, reports/, sessions/, fix-templates/, references/, standards, worktrees/, etc.) | ~115 |

## Schema used in all entries

```
### [Name]
- **Path**: [full path from repo root]
- **Stated purpose**: [≤3 sentences from the file's own text]
- **Inputs / triggers**: [what invokes it / parameters / preconditions]
- **Outputs**: [what it produces / writes / returns]
- **Cross-references**: [other .claude/ items named or invoked inside this file]
- **Approx size**: [line count]
```

## Scope

- Root: `C:/foodCo/foodVibe1.0/`
- Audit date: 2026-04-19
- Branch: `feat/session-20260417`
- External skill suite (`~/.claude/skills/gstack/`) referenced in CLAUDE.md but stored outside repo; listed as a single entry in skills.md.
