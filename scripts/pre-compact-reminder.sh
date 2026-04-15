#!/usr/bin/env bash
# pre-compact-reminder.sh — PreCompact hook
# Fires when context is about to be compressed. Reminds the AI to save
# critical state before earlier conversation details are lost.
# Also records the transcript size at compact time so context-monitor.sh
# can measure delta-since-last-compact instead of total file size, preventing
# false "context full" warnings immediately after /compact.
#
# Hook type: PreCompact (matcher: "")
# Timeout: 5s

INPUT=$(cat)

# Record transcript size at compact time.
# PreCompact hooks may not receive transcript_path in their own input, so we
# first try parsing it from INPUT, then fall back to the path saved by
# context-monitor.sh (which runs on every PostToolUse and always has it).
TRANSCRIPT=$(echo "$INPUT" | sed -n 's/.*"transcript_path" *: *"\([^"]*\)".*/\1/p' | head -1 | tr '\\\\' '/' 2>/dev/null)
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  TRANSCRIPT=$(cat /tmp/claude-transcript-path 2>/dev/null)
fi
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SIZE=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)
  echo "$SIZE" > /tmp/claude-compact-baseline
fi

cat <<'EOF'
{
  "systemMessage": "Context is about to be compressed. Before proceeding, confirm:\n1. Have important decisions and progress been written to session-state.md?\n2. Are there any unpushed commits that need to be recorded?\n3. Are next steps documented?\n\nAfter compression, early conversation details will be lost. session-state.md is the memory bridge across compressions."
}
EOF

exit 0
