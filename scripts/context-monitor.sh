#!/usr/bin/env bash
# context-monitor.sh — PostToolUse hook
# Periodically checks transcript size and injects context warnings.
# Three-tier alert system: 40% (warn) → 60% (alert) → 70% (hard stop).
#
# The 70% hard gate forces a session handoff — no exceptions.
# Developed across dozens of real sessions — hard stops have saved work multiple times.
#
# After /compact the transcript file stays the same size on disk (it's append-only),
# so the hook uses delta-since-last-compact instead of total file size.
# pre-compact-reminder.sh writes a baseline; this script reads it.
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

# Save transcript path so pre-compact-reminder.sh can find it.
# PreCompact hooks are not guaranteed to receive transcript_path in their input,
# so we persist it here where we know PostToolUse always provides it.
echo "$TRANSCRIPT" > /tmp/claude-transcript-path

# Detect a fresh conversation — either a new transcript file or an explicit
# reset flag written by session-startup.sh (handles /clear with same file path).
# In both cases, reset the compact baseline to the current file size so that
# SIZE (delta) starts at 0 for the new conversation.
LAST_TRANSCRIPT=$(cat /tmp/claude-last-transcript-path 2>/dev/null)
SESSION_RESET=0
if [ "$TRANSCRIPT" != "$LAST_TRANSCRIPT" ]; then
  SESSION_RESET=1
fi
if [ -f /tmp/claude-context-reset ]; then
  rm -f /tmp/claude-context-reset
  SESSION_RESET=1
fi
echo "$TRANSCRIPT" > /tmp/claude-last-transcript-path

if [ "$SESSION_RESET" -eq 1 ]; then
  BASELINE_NOW=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)
  echo "$BASELINE_NOW" > /tmp/claude-compact-baseline
  echo 1 > "$COUNTER_FILE"
  COUNT=1
fi

# Get effective size — delta since last compact, or total if no compact yet.
# After /compact the .jsonl file doesn't shrink (it's append-only), so raw size
# would fire false alerts immediately after compaction. Subtracting the baseline
# recorded at compact time gives the actual new context growth since last compact.
TOTAL=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)
BASELINE=$(cat /tmp/claude-compact-baseline 2>/dev/null || echo 0)
if [ "$BASELINE" -gt 0 ] && [ "$TOTAL" -gt "$BASELINE" ]; then
  SIZE=$((TOTAL - BASELINE))
else
  SIZE=$TOTAL
fi

# Thresholds (rough estimates based on observed context usage):
#   400KB ≈ 40% of context window
#   600KB ≈ 60% of context window
#   700KB ≈ 70% of context window
# These are conservative estimates. Adjust based on your model's context size.
WARN_THRESHOLD=400000
ALERT_THRESHOLD=600000
STOP_THRESHOLD=700000

if [ "$SIZE" -gt "$STOP_THRESHOLD" ]; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "HARD STOP — Context exceeds 70%. You MUST do the following immediately. Do NOT continue any other work:\n1. Update session-state.md with current progress, decisions made, and next steps\n2. Stop all generation/development work\n3. Tell the user: 'Context is full. I recommend starting a new session. session-state.md has been updated.'\n\nThis is a hard gate. Continuing past this point risks losing work to context truncation."
  }
}
EOF
elif [ "$SIZE" -gt "$ALERT_THRESHOLD" ]; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Context is past 60%. Update session-state.md now to preserve progress. Finish your current task, then hand off. Do not start new tasks."
  }
}
EOF
elif [ "$SIZE" -gt "$WARN_THRESHOLD" ]; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Context is past 40%. Start thinking about wrap-up timing. Finish your current task and consider whether to hand off soon."
  }
}
EOF
fi

exit 0
