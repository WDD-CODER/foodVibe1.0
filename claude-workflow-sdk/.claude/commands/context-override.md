---
description: Disable context warnings for 30 minutes in this session
allowed-tools: Bash
---

# /context-override

Suppresses the context-monitor hook warnings for 30 minutes. Use this when you've acknowledged the context risk and want to continue working in the current session.

## Steps

Run this bash command to create the override flag:

```bash
SESSION_ID=$(cat /tmp/claude-context-monitor-current-session 2>/dev/null)
if [ -z "$SESSION_ID" ]; then
  # Fallback: derive from transcript path saved by the hook
  TRANSCRIPT=$(cat /tmp/claude-transcript-path 2>/dev/null)
  SESSION_ID=$(basename "$TRANSCRIPT" .jsonl 2>/dev/null)
fi
if [ -n "$SESSION_ID" ]; then
  touch "/tmp/claude-context-override-${SESSION_ID}"
  echo "Context warnings suppressed for 30 minutes (session: ${SESSION_ID})."
else
  echo "Could not determine session ID — override not set."
fi
```

Then confirm to the user:

> Context warnings are disabled for 30 minutes. The hook will re-engage automatically after that. Continue with awareness that work past the context limit risks truncation — update your SESSION SAVE TARGET file before starting any large new task.
