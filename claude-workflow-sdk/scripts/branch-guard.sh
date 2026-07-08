#!/bin/bash
# Branch Guard - PreToolUse hook
# stdout MUST be valid JSON for Cursor PreToolUse.

# After init-repo, SCRIPT_DIR resolution is preferred over [PROJECT_ROOT].
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"

CURRENT=$(git -C "$REPO" branch --show-current 2>/dev/null)
MSG=""

if [[ "$CURRENT" == "main" || "$CURRENT" == "master" ]]; then
  BRANCH="feat/session-$(date +%Y%m%d)"
  if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
    BRANCH="feat/session-$(date +%Y%m%d-%H%M)"
  fi
  git -C "$REPO" checkout -b "$BRANCH" 2>/dev/null
  MSG="BRANCH_GUARD: Auto-switched from main to new branch $BRANCH before writing code. Tell the user: Moved to branch `$BRANCH` before making any changes."
  echo "$MSG" >&2
fi

if [[ -n "$MSG" ]]; then
  ESCAPED=$(printf '%s' "$MSG" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null)
  if [[ -z "$ESCAPED" ]]; then
    ESCAPED="\"$MSG\""
  fi
  printf '{"permission":"allow","agent_message":%s}\n' "$ESCAPED"
else
  printf '{"permission":"allow"}\n'
fi

exit 0
