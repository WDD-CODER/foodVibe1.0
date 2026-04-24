#!/usr/bin/env bash
# session-startup.sh — SessionStart hook
# Automatically loads the previous session's state into context,
# so the AI picks up exactly where it left off.
#
# Parallel-session safe (Option B):
#   - Each Claude Code process gets a unique state file keyed by branch + PPID.
#   - On start: loads the most recently modified state file for this branch.
#   - On end: Claude writes to the PPID-keyed file (path injected into context).
#   - Cleanup: removes PPID-keyed files older than 7 days automatically.
#   - Falls back to docs/session-state.md if no branch-specific files exist.
#
# Set SESSION_STATE_PATH to override all auto-detection.
#
# Hook type: SessionStart (matcher: "startup")
# Timeout: 10s

# Signal context-monitor.sh to reset its compact baseline.
# Covers the case where /clear triggers SessionStart but reuses the same
# transcript file — without this, SIZE would measure from the old baseline
# and immediately fire false "context full" warnings.
touch /tmp/claude-context-reset

if [ -n "$SESSION_STATE_PATH" ]; then
  SESSION_STATE="$SESSION_STATE_PATH"
  SAVE_PATH="$SESSION_STATE_PATH"
else
  BRANCH=$(git branch --show-current 2>/dev/null | sed 's/[^a-zA-Z0-9]/-/g')
  BRANCH="${BRANCH:-main}"

  # This session's unique save target (branch + parent PID = one file per Claude Code window)
  SAVE_PATH="docs/session-state-${BRANCH}-${PPID}.md"

  # Record save path so Claude can read it when wrapping up
  mkdir -p .claude
  echo "$SAVE_PATH" > .claude/.session-state-path

  # Cleanup: remove PPID-keyed state files older than 7 days
  find docs -maxdepth 1 -name "session-state-${BRANCH}-*.md" -mtime +7 -exec rm -f {} + 2>/dev/null || true

  # Load the most recently modified state file for this branch
  # Priority: PPID-keyed files → branch-canonical → global fallback
  LATEST=$(ls -t docs/session-state-${BRANCH}-*.md 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    SESSION_STATE="$LATEST"
  elif [ -f "docs/session-state-${BRANCH}.md" ]; then
    SESSION_STATE="docs/session-state-${BRANCH}.md"
  else
    SESSION_STATE="docs/session-state.md"
  fi
fi

if [ -f "$SESSION_STATE" ]; then
  CONTENT=$(cat "$SESSION_STATE")
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "Previous session state loaded from: $SESSION_STATE\\n$CONTENT\\n\\n---\\nSESSION SAVE TARGET: $SAVE_PATH\\nWhen ending this session, write session-state to the path above (not docs/session-state.md directly). This prevents parallel sessions on the same branch from overwriting each other.\\n\\nPost-Compact Resume: If this session started after \/compact, early conversation history has been compressed — the state file above is your memory bridge."
    }
  }
}
EOF
else
  # No prior state — still inject save target so Claude knows where to write
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "decision": {
      "additionalContext": "No previous session state found for branch: ${BRANCH}.\\n\\n---\\nSESSION SAVE TARGET: $SAVE_PATH\\nWhen ending this session, write session-state to the path above.\\n\\nPost-Compact Resume: If this session started after \/compact, early conversation history has been compressed — create a session-state file at the path above to serve as your memory bridge."
    }
  }
}
EOF
fi

exit 0
