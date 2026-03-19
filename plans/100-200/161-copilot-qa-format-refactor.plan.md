# Plan 161 — Copilot Q&A format refactor

Refactor [.claude/copilot-instructions.md](.claude/copilot-instructions.md) so the agent always uses American-style Q&A (question? then a. b. c.), never embeds options in prose, and asks at least one question when creating new features.

## Atomic Sub-tasks

- [ ] Replace Section 1.1 with single tight "Q&A format" rule (chat, plans, recommendations).
- [ ] Add minimal Bad vs Good example; require at least one question for new features.
- [ ] Align Section 1 Decision Logic to reference Q&A format only.

## Summary

- One format everywhere: `question?` then `a.` `b.` `c.` (no options in prose).
- New features: agent must ask at least one question in this format.
- Plan Critical Questions use same format (no inline A|B|C).
