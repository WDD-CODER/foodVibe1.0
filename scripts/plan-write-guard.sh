#!/bin/bash
# Plan Write Guard - PreToolUse (Edit|Write|MultiEdit)
# Blocks naive NEW writes to plans/*.plan.md when name-similar plans exist,
# unless .claude/.plan-write-ack names the target path (save-as-new after Human confirm).
# Existing plan edits always allowed. Shared with Cursor via save-plan skill + rules.
# stdout MUST be valid JSON for PreToolUse.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
ACK_FILE="$REPO/.claude/.plan-write-ack"

# Read tool stdin with timeout (Claude Code JSON). Empty/hang -> fail open allow.
INPUT=""
if command -v timeout >/dev/null 2>&1; then
  INPUT=$(timeout 1 cat 2>/dev/null || true)
elif command -v gtimeout >/dev/null 2>&1; then
  INPUT=$(gtimeout 1 cat 2>/dev/null || true)
else
  INPUT=$(node -e 'let s="";const t=setTimeout(()=>{process.stdout.write(s);process.exit(0)},300);process.stdin.on("data",d=>s+=d).on("end",()=>{clearTimeout(t);process.stdout.write(s)})' 2>/dev/null || true)
fi

# JSON-escape stdin with node: the kit needs node everywhere, python is not always there (a service account has none).
json_str() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(s)))' 2>/dev/null
}

json_allow() {
  local msg="$1"
  if [[ -n "$msg" ]]; then
    local escaped
    escaped=$(printf '%s' "$msg" | json_str)
    if [[ -z "$escaped" ]]; then
      escaped="\"plan write guard\""
    fi
    printf '{"permission":"allow","agent_message":%s}\n' "$escaped"
  else
    printf '{"permission":"allow"}\n'
  fi
  exit 0
}

json_deny() {
  local msg="$1"
  local escaped
  escaped=$(printf '%s' "$msg" | json_str)
  if [[ -z "$escaped" ]]; then
    escaped="\"Denied: run save-plan / plan-name-similarity first.\""
  fi
  # Both formats: Cursor reads "permission", Claude Code reads hookSpecificOutput (it ignores the Cursor form).
  printf '{"permission":"deny","agent_message":%s,"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":%s}}\n' "$escaped" "$escaped"
  exit 0
}

if [[ -z "$INPUT" ]]; then
  json_allow ""
fi

FILE_PATH=$(PLAN_GUARD_INPUT="$INPUT" node -e '
const raw = process.env.PLAN_GUARD_INPUT || ""
let path = ""
try {
  const d = JSON.parse(raw)
  const ti = d.tool_input || d.input || d
  if (ti && typeof ti === "object" && !Array.isArray(ti)) {
    path = ti.file_path || ti.path || ti.filePath || ""
    if (!path && Array.isArray(ti.edits) && ti.edits.length) path = ti.edits[0].file_path || ti.edits[0].path || ""
  }
} catch {}
if (!path) {
  const m = raw.match(/plans[\/\\][\w.\/\\-]+\.plan\.md/)
  path = m ? m[0] : ""
}
process.stdout.write(String(path))
')

NORM=$(printf '%s' "$FILE_PATH" | tr '\\' '/')

if [[ ! "$NORM" =~ plans/.+\.plan\.md$ ]]; then
  json_allow ""
fi

if [[ "$FILE_PATH" = /* ]] || [[ "$FILE_PATH" =~ ^[A-Za-z]: ]]; then
  ABS="$FILE_PATH"
else
  ABS="$REPO/$FILE_PATH"
fi
ABS_NORM=$(printf '%s' "$ABS" | tr '\\' '/')

# A new plan's file name stays short: closed, it moves to plans/<range>/, and a long path cannot be cloned on Windows.
PLAN_NAME="${NORM##*/}"
MAX_PLAN_NAME=100
if [[ ! -f "$ABS" ]] && (( ${#PLAN_NAME} > MAX_PLAN_NAME )); then
  json_deny "PLAN_WRITE_GUARD: the plan file name is ${#PLAN_NAME} characters; keep it at $MAX_PLAN_NAME or fewer (NNN-<short-slug>.plan.md). The H1 title can stay long. Long paths break a Windows clone of the repo (260-character limit)."
fi

if [[ -f "$ACK_FILE" ]]; then
  ACK_TARGET=$(tr -d '\r\n' < "$ACK_FILE" | tr '\\' '/')
  if [[ -n "$ACK_TARGET" ]] && { [[ "$ABS_NORM" == *"$ACK_TARGET" ]] || [[ "$ACK_TARGET" == *"$NORM" ]] || [[ "$NORM" == *"$ACK_TARGET" ]]; }; then
    rm -f "$ACK_FILE" 2>/dev/null || true
    json_allow "PLAN_WRITE_GUARD: ack consumed - write allowed for $NORM"
  fi
fi

if [[ -f "$ABS" ]]; then
  json_allow "PLAN_WRITE_GUARD: editing existing plan $NORM - keep Atomic Sub-tasks in sync with .claude/todo.md"
fi

REL=$(printf '%s' "$NORM" | sed -n 's|.*\(plans/.*\.plan\.md\)|\1|p')
[[ -z "$REL" ]] && REL="$NORM"

SIM_OUT=$(node "$REPO/scripts/plan-name-similarity.mjs" --file="$REL" 2>/dev/null || true)

if printf '%s' "$SIM_OUT" | grep -q 'no similar plans'; then
  json_allow "PLAN_WRITE_GUARD: no similar plans - new file OK. Prefer save-plan skill (ledger sync)."
fi

if printf '%s' "$SIM_OUT" | grep -q 'similar plan'; then
  MSG="PLAN_WRITE_GUARD: blocked new plan write - similar plan(s) exist. Run: node scripts/plan-name-similarity.mjs --file=$REL then ask Human: rewrite existing / save as new / cancel. On save-as-new: write the relative path to .claude/.plan-write-ack then retry Write. On rewrite: Edit the existing plan path instead.
$SIM_OUT"
  json_deny "$MSG"
fi

json_allow "PLAN_WRITE_GUARD: could not run similarity check - follow .claude/skills/save-plan/SKILL.md before writing plans/"
