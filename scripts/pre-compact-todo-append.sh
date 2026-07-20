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
  # Strict token anchors: avoid PASS/FAIL review tables and "Verify cmd" prose.
  # Truncate each match — transcript lines are often multi-KB JSONL.
  SIGNALS=$(
    grep -E '\bUPGRADE_AVAILABLE\b|\bROUTING_DECLINED\b|\bBLOCKED\b|(^|[^A-Za-z0-9_/])FAIL([^A-Za-z0-9_]|$)|(^|[^A-Za-z0-9_])Verify:[[:space:]]' "$TRANSCRIPT" \
      | tail -n 20 \
      | cut -c1-300 \
      || true
  )
  if [ -n "$SIGNALS" ]; then
    {
      echo ""
      echo "### Unresolved signals detected at compact time"
      echo ""
      echo "$SIGNALS"
    } >> "$TODO"
  fi
fi
exit 0
