#!/usr/bin/env bash
# context-monitor.sh — PostToolUse hook
# Periodically checks transcript size and injects context warnings.
# Three-tier alert system: 40% (warn) → 60% (alert) → 70% (hard stop).
#
# The 70% hard gate forces a session handoff — no exceptions.
# Developed across dozens of real sessions — hard stops have saved work multiple times.
#
# Hook type: PostToolUse (matcher: ".*")
# Timeout: 5s

INPUT=$(cat)

# Session-level counter file
COUNTER_FILE="/tmp/claude-context-monitor-counter"
COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNTER_FILE"

# Only check every 10 calls (skip the first 3, then every 10th)
# This keeps overhead near zero — most tool calls exit immediately.
if [ "$COUNT" -lt 3 ] || [ $((COUNT % 10)) -ne 0 ]; then
  exit 0
fi

TRANSCRIPT=$(echo "$INPUT" | sed -n 's/.*"transcript_path" *: *"\([^"]*\)".*/\1/p' | head -1 | tr '\\\\' '/' 2>/dev/null)

if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# Get file size in bytes
SIZE=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)

# Thresholds based on transcript file size (proxy for context usage).
# Claude Sonnet 4.6 has a 200K token context (~800KB at 4 bytes/token).
# JSONL overhead makes byte count a rough proxy — these are generous to avoid
# interrupting work too often.
WARN_THRESHOLD=550000
ALERT_THRESHOLD=750000
STOP_THRESHOLD=900000

if [ "$SIZE" -gt "$STOP_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "HARD STOP — Context exceeds 70%. You MUST do the following immediately. Do NOT continue any other work:\n1. Update session-state.md with current progress, decisions made, and next steps\n2. Stop all generation/development work\n3. Tell the user: 'Context is full. I recommend starting a new session. session-state.md has been updated.'\n\nThis is a hard gate. Continuing past this point risks losing work to context truncation."
}
EOF
elif [ "$SIZE" -gt "$ALERT_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "Context is past 60%. Update session-state.md now to preserve progress. Finish your current task, then hand off. Do not start new tasks."
}
EOF
elif [ "$SIZE" -gt "$WARN_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "Context is past 40%. Start thinking about wrap-up timing. Finish your current task and consider whether to hand off soon."
}
EOF
fi

exit 0
