#!/bin/bash
# Branch Guard — PreToolUse hook
# Fires automatically before Edit / Write / MultiEdit tool calls.
# If Claude is on main or master, creates a feat/session-YYYYMMDD branch
# and prints a message Claude must relay to the user.

REPO="[PROJECT_ROOT]"
CURRENT=$(git -C "$REPO" branch --show-current 2>/dev/null)

if [[ "$CURRENT" == "main" || "$CURRENT" == "master" ]]; then
  BRANCH="feat/session-$(date +%Y%m%d)"

  # If today's branch already exists, add HH:MM to keep it unique
  if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
    BRANCH="feat/session-$(date +%Y%m%d-%H%M)"
  fi

  git -C "$REPO" checkout -b "$BRANCH" 2>/dev/null
  echo "BRANCH_GUARD: Auto-switched from 'main' to new branch '$BRANCH' before writing code. YOU MUST tell the user this right now — say exactly: 'Moved to branch \`$BRANCH\` before making any changes.'"
fi

exit 0
