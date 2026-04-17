#!/usr/bin/env bash
# context-monitor.sh — PostToolUse hook
# Periodically checks context usage and injects warnings.
# Three-tier alert system: 40% (warn) → 60% (alert) → 70% (hard stop).
#
# Measures word count of content AFTER the last compaction event in the
# transcript JSONL, since compacted messages are no longer in the active
# context window. Uses word count (~1.3 tokens/word) instead of byte count
# to avoid JSONL overhead inflation (JSON keys, escaping, base64 = ~38x).
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

# Find the last compaction boundary line number. Content after this line is
# the active context window. If no compaction has happened, use the whole file.
# Claude Code writes {"subtype":"compact_boundary"} entries when it compresses
# older messages out of the active window.
LAST_COMPACT_LINE=$(grep -n '"subtype":"compact_boundary"' "$TRANSCRIPT" 2>/dev/null | tail -1 | cut -d: -f1)

if [ -n "$LAST_COMPACT_LINE" ]; then
  # Count words only from content after last compaction
  WORDS=$(tail -n +"$LAST_COMPACT_LINE" "$TRANSCRIPT" 2>/dev/null | wc -w | tr -d ' ')
else
  # No compaction yet — count the whole file
  WORDS=$(wc -w < "$TRANSCRIPT" 2>/dev/null | tr -d ' ')
fi

WORDS=${WORDS:-0}

# Detect model from the most recent assistant message in the active window.
# Each model family has a different context window size.
if [ -n "$LAST_COMPACT_LINE" ]; then
  MODEL=$(tail -n +"$LAST_COMPACT_LINE" "$TRANSCRIPT" 2>/dev/null | grep -o '"model":"[^"]*"' | tail -1 | sed 's/"model":"//;s/"//')
else
  MODEL=$(grep -o '"model":"[^"]*"' "$TRANSCRIPT" 2>/dev/null | tail -1 | sed 's/"model":"//;s/"//')
fi

# Context window sizes (tokens) by model family.
# Update this table when new models ship.
#   claude-opus-4-6:   200K
#   claude-sonnet-4-6: 200K
#   claude-haiku-4-5:  200K
#   (fallback):        200K
case "$MODEL" in
  claude-opus-4-6*)   CTX_TOKENS=200000 ;;
  claude-sonnet-4-6*) CTX_TOKENS=200000 ;;
  claude-haiku-4-5*)  CTX_TOKENS=200000 ;;
  *)                  CTX_TOKENS=200000 ;;
esac

# Convert token capacity to word thresholds.
# ~1.3 tokens/word → word capacity = CTX_TOKENS / 1.3
# Subtract system prompt overhead (~15K tokens ≈ 12K words).
WORD_CAPACITY=$(( CTX_TOKENS * 10 / 13 - 12000 ))
WARN_THRESHOLD=$(( WORD_CAPACITY * 40 / 100 ))
ALERT_THRESHOLD=$(( WORD_CAPACITY * 60 / 100 ))
STOP_THRESHOLD=$(( WORD_CAPACITY * 70 / 100 ))

if [ "$WORDS" -gt "$STOP_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "HARD STOP — Context exceeds 70%. You MUST do the following immediately. Do NOT continue any other work:\n1. Update session-state.md with current progress, decisions made, and next steps\n2. Stop all generation/development work\n3. Tell the user: 'Context is full. I recommend starting a new session. session-state.md has been updated.'\n\nThis is a hard gate. Continuing past this point risks losing work to context truncation."
}
EOF
elif [ "$WORDS" -gt "$ALERT_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "Context is past 60%. Update session-state.md now to preserve progress. Finish your current task, then hand off. Do not start new tasks."
}
EOF
elif [ "$WORDS" -gt "$WARN_THRESHOLD" ]; then
  cat <<'EOF'
{
  "systemMessage": "Context is past 40%. Start thinking about wrap-up timing. Finish your current task and consider whether to hand off soon."
}
EOF
fi

exit 0
