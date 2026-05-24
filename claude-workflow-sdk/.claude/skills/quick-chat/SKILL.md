---
name: quick-chat
description: Lightweight conversation mode — skips all workflow overhead (no plan, no session state, no commit) for quick questions, explanations, or one-off tasks.
---

# Skill: quick-chat

**Trigger:** User says "quick chat", "just a question", "explain X", or `/quick-chat`.

## Behavior

- **No plan created** — do not invoke save-plan or plan-implementation
- **No session state written** — do not write to docs/session-state
- **No auto-commit** — any edits are noted but not committed
- **Concise answers** — prefer 2-3 sentences over lengthy explanations unless user asks for depth
- **Normal tools available** — Read, Grep, Bash are all fine for lookups

## Exit

When the user's question is answered, return to normal workflow mode. No cleanup needed.
