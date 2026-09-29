#!/usr/bin/env bash
# claim-parallel-slot.sh <target-dir>
# Lightweight refresh of a persistent parallel-session worktree: fast-forwards it to
# latest main, runs npm install only if package-lock.json actually changed, and claims
# its liveness lock. Never touches a dirty or unpushed working tree.
#
# Exit codes: 0 = claimed and ready. 2 = refused (dirty/unpushed) — caller should ask
# the human rather than proceed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/session-lock.sh"

TARGET="${1:?usage: claim-parallel-slot.sh <target-dir>}"

if [ -n "$(git -C "$TARGET" status --porcelain 2>/dev/null)" ]; then
  echo "REFUSED dirty-working-tree $TARGET"
  exit 2
fi

CURRENT_BRANCH=$(git -C "$TARGET" rev-parse --abbrev-ref HEAD 2>/dev/null)
if git -C "$TARGET" rev-parse --abbrev-ref "$CURRENT_BRANCH@{u}" >/dev/null 2>&1; then
  if [ -n "$(git -C "$TARGET" log '@{u}..' --oneline 2>/dev/null)" ]; then
    echo "REFUSED unpushed-commits $TARGET branch=$CURRENT_BRANCH"
    exit 2
  fi
fi

git -C "$TARGET" checkout main --quiet
git -C "$TARGET" fetch origin main --quiet
git -C "$TARGET" merge --ff-only origin/main --quiet

HASH_FILE="$TARGET/.claude/.last-npm-install-hash"
NEW_HASH=$(sha256sum "$TARGET/package-lock.json" | awk '{print $1}')
OLD_HASH=""
[ -f "$HASH_FILE" ] && OLD_HASH=$(cat "$HASH_FILE")

INSTALLED="no"
if [ "$NEW_HASH" != "$OLD_HASH" ]; then
  (cd "$TARGET" && npm install --quiet) >/dev/null 2>&1
  echo "$NEW_HASH" > "$HASH_FILE"
  INSTALLED="yes"
fi

claim_lock "$TARGET"

PORT="unknown"
[ -f "$TARGET/.worktree-port" ] && PORT=$(cat "$TARGET/.worktree-port")

# Ensure the frontend is reachable with backend auth on — plain `ng serve` uses
# environment.ts (useBackendAuth: false) and silently fakes login. Always `-c local`.
DEV_SERVER="skipped-no-port"
if [ "$PORT" != "unknown" ]; then
  if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT"; then
    DEV_SERVER="already-running"
  else
    ( cd "$TARGET" && nohup npm run dev:local -- --port "$PORT" \
        > "$TARGET/.claude/dev-server.log" 2>&1 < /dev/null & disown )
    DEV_SERVER="starting (background, -c local, ~15-20s to compile — log: $TARGET/.claude/dev-server.log)"
  fi
fi

echo "OK branch=main installed=$INSTALLED port=$PORT path=$TARGET dev_server=$DEV_SERVER"
exit 0
