#!/usr/bin/env bash
# PreCompact: append open TODOs / unresolved signals to .claude/todo.md before compaction.
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TODO="$ROOT/.claude/todo.md"
STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%S)
mkdir -p "$ROOT/.claude"
touch "$TODO"
{
  echo ""
  echo "## PreCompact signal dump ($STAMP)"
  echo ""
  if grep -E '^\s*- \[ \]' "$TODO" >/dev/null 2>&1; then
    echo "Open unchecked items at compact time:"
    grep -E '^\s*- \[ \]' "$TODO" | head -n 40 || true
  else
    echo "No open unchecked items found at compact time."
  fi
  echo ""
  echo "Unresolved tool signals: re-add any pending Verify/Fail/blocker notes under this heading after compact if still open."
} >> "$TODO"
INPUT=$(cat || true)
TRANSCRIPT=$(echo "$INPUT" | sed -n 's/.*"transcript_path" *: *"\([^"]*\)".*/\1/p' | head -1 | tr '\\\\' '/' 2>/dev/null)
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  TRANSCRIPT=$(cat /tmp/claude-transcript-path 2>/dev/null || true)
fi
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  SIZE=$(wc -c < "$TRANSCRIPT" 2>/dev/null || echo 0)
  echo "$SIZE" > /tmp/claude-compact-baseline
fi
exit 0
