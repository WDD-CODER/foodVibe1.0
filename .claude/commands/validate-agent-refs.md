---
description: Validate .claude/agents roster against expected inventory
allowed-tools: Read, Glob, Bash
---

# /validate-agent-refs — Agent roster inventory

Expected files in `.claude/agents/` (after Brief 4):

- `git-agent.md` — procedural git prep only

`.claude/agents/` must contain at most `git-agent.md` as an agent markdown file.
`mobile-probes.json` (if present) is data, not an agent persona file.
Session close logic lives in `/ship` (`.claude/commands/ship.md`) — not an agent.
