#!/bin/bash
# Branch Guard - PreToolUse hook
# stdout MUST be valid JSON for Cursor PreToolUse.
#
# On main, a write to plans/<name>.plan.md or .claude/todo.md is the
# Planner's admin bypass (see AGENTS.md's Planner-Worker workflow) and is
# allowed without switching. Any other path on main still auto-switches.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read tool stdin with a timeout (same pattern as plan-write-guard.sh) so a
# left-open pipe can't hang the hook. Empty/timeout -> unknown path, which
# falls through to the safe default (auto-switch).
INPUT=""
if command -v timeout >/dev/null 2>&1; then
  INPUT=$(timeout 1 cat 2>/dev/null || true)
elif command -v gtimeout >/dev/null 2>&1; then
  INPUT=$(gtimeout 1 cat 2>/dev/null || true)
else
  INPUT=$(python -c "
import sys, select
r, _, _ = select.select([sys.stdin], [], [], 0.3)
print(sys.stdin.read() if r else '')
" 2>/dev/null || true)
fi

FILE_PATH=""
if [[ -n "$INPUT" ]]; then
  FILE_PATH=$(BRANCH_GUARD_INPUT="$INPUT" python - <<'PY'
import json, os
raw = os.environ.get("BRANCH_GUARD_INPUT", "")
path = ""
try:
    d = json.loads(raw)
    ti = d.get("tool_input") or d.get("input") or d
    if isinstance(ti, dict):
        path = ti.get("file_path") or ti.get("path") or ti.get("filePath") or ""
        edits = ti.get("edits")
        if not path and isinstance(edits, list) and edits:
            path = edits[0].get("file_path") or edits[0].get("path") or ""
except Exception:
    pass
print(path)
PY
  )
fi
NORM=$(printf '%s' "$FILE_PATH" | tr '\\' '/')

# A file outside this REPO (e.g. in a sibling wt-N worktree) is never on
# `main` and has no guard of its own to borrow — skip entirely rather than
# switching THIS repo's branch for an edit that happened somewhere else.
if [[ -n "$FILE_PATH" ]]; then
  INSIDE_REPO=$(REPO_PATH="$REPO" FILE_PATH_INPUT="$FILE_PATH" python - <<'PY'
import os
repo = os.environ.get("REPO_PATH", "")
path = os.environ.get("FILE_PATH_INPUT", "")
try:
    repo_n = os.path.normcase(os.path.normpath(os.path.abspath(repo)))
    path_n = os.path.normcase(os.path.normpath(os.path.abspath(path)))
    inside = path_n == repo_n or path_n.startswith(repo_n + os.sep)
except Exception:
    inside = True
print("1" if inside else "0")
PY
  )
  if [[ "$INSIDE_REPO" == "0" ]]; then
    printf '{"permission":"allow","agent_message":"BRANCH_GUARD: %s is outside this worktree - no branch action taken."}\n' "$NORM"
    exit 0
  fi
fi

CURRENT=$(git -C "$REPO" branch --show-current 2>/dev/null)
MSG=""

if [[ "$CURRENT" == "main" || "$CURRENT" == "master" ]]; then
  if [[ "$NORM" =~ ^plans/[^/]+\.plan\.md$ ]] || [[ "$NORM" == ".claude/todo.md" ]]; then
    printf '{"permission":"allow","agent_message":"BRANCH_GUARD: Planner admin bypass - %s stays on main."}\n' "$NORM"
    exit 0
  fi

  BRANCH="feat/session-$(date +%Y%m%d)"
  if git -C "$REPO" show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
    BRANCH="feat/session-$(date +%Y%m%d-%H%M)"
  fi
  git -C "$REPO" checkout -b "$BRANCH" 2>/dev/null
  MSG="BRANCH_GUARD: Auto-switched from main to new branch $BRANCH before writing code. Tell the user: Moved to branch \`$BRANCH\` before making any changes."
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
