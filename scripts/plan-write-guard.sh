#!/bin/bash
# Plan Write Guard - PreToolUse (Edit|Write|MultiEdit) for Cursor. stdout is valid JSON.
# Blocks naive NEW writes to plans/*.plan.md when name-similar plans exist, unless .claude/.plan-write-ack names the
# target path. Existing plan edits are always allowed. The logic lives in scripts/lib/plan-write-check.mjs; Claude Code
# runs it inside the single `guard.mjs edit` process, this wrapper is for hosts that call the script by name.
s="${BASH_SOURCE[0]//\\//}"
d="${s%/*}"
[[ "$d" == "$s" ]] && d=.
exec node "$d/lib/guard.mjs" planedit
