#!/usr/bin/env bash
# pre-compact-reminder.sh — PreCompact hook
# Fires when context is about to be compressed. Reminds the AI to save
# critical state before earlier conversation details are lost.
#
# Hook type: PreCompact (matcher: "")
# Timeout: 5s

SAVE_TARGET=$(cat .claude/.session-state-path 2>/dev/null)
[ -z "$SAVE_TARGET" ] && SAVE_TARGET="docs/session-state.md"

cat <<EOF
{
  "systemMessage": "Context is about to be compressed.\n\nSESSION SAVE TARGET: ${SAVE_TARGET}\n\nBefore compression, save to ${SAVE_TARGET}:\n1. Current plan + active task\n2. Key decisions made this session\n3. Next steps\n\nPost-Compact Resume: After compression, read ${SAVE_TARGET} to restore context, then continue from the last confirmed step. Early conversation details will be gone after \/compact."
}
EOF

exit 0
