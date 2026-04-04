#!/usr/bin/env bash
# .claude/reflect/test-runner.sh
#
# Executable skill scorer for /reflect — GAP 2 implementation
# Equivalent to prepare.py in Karpathy's autoresearch.
#
# Usage:
#   bash .claude/reflect/test-runner.sh <skill-file> <test-suite>
#
# Output (to stdout):
#   exec_score: XX.X   — range 0–70 (70% of final score)
#   Combine with agent score (0–30) to get final_score (0–100).
#
# IMMUTABLE — do not edit during reflection loops.
# If scoring rules change, the human edits this file manually.
#
# Check types supported:
#   GREP: "string"                              passes if string found in skill
#   GREP-NOT: "string"                          passes if string NOT found in skill
#   SECTION: "heading" COUNT >= N              passes if heading appears >= N times
#   LINE-COUNT: <= N                            passes if skill has <= N lines
#   PATTERN: "regex" NEAR "anchor" DISTANCE N  passes if regex match within N lines of anchor

set -uo pipefail

# ─── Argument validation ──────────────────────────────────────────────────────
if [[ $# -lt 2 ]]; then
  echo "Usage: bash test-runner.sh <skill-file> <test-suite>" >&2
  echo "Output: exec_score: XX.X  (range 0–70)" >&2
  exit 1
fi

SKILL_FILE="$1"
TEST_SUITE="$2"

if [[ ! -f "$SKILL_FILE" ]]; then
  echo "ERROR: Skill file not found: $SKILL_FILE" >&2
  exit 1
fi

if [[ ! -f "$TEST_SUITE" ]]; then
  echo "ERROR: Test suite not found: $TEST_SUITE" >&2
  exit 1
fi

# ─── Counters ─────────────────────────────────────────────────────────────────
checks_passed=0
checks_failed=0
total_checks=0
current_tc="(preamble)"

# ─── Skill metadata ───────────────────────────────────────────────────────────
skill_line_count=$(wc -l < "$SKILL_FILE" | tr -d '[:space:]')

# ─── String extraction helpers ────────────────────────────────────────────────
# Extract the first double-quoted string from a line.
# Input:  - GREP: "signal()" — explanation
# Output: signal()
extract_first_quoted() {
  printf '%s' "$1" | sed 's/[^"]*"\([^"]*\)".*/\1/'
}

# Extract the second double-quoted string from a line.
# Input:  PATTERN: "inject" NEAR "constructor" DISTANCE 5
# Output: constructor
extract_second_quoted() {
  printf '%s' "$1" | sed 's/[^"]*"[^"]*"[^"]*"\([^"]*\)".*/\1/'
}

# ─── Check runners ────────────────────────────────────────────────────────────

run_grep() {
  local needle="$1"
  total_checks=$((total_checks + 1))
  # Use printf to avoid backtick/special-char expansion issues
  if grep -qF "$needle" "$SKILL_FILE" 2>/dev/null; then
    checks_passed=$((checks_passed + 1))
    printf '  PASS [GREP]      "%s"\n' "$needle"
  else
    checks_failed=$((checks_failed + 1))
    printf '  FAIL [GREP]      "%s"  — not found in skill\n' "$needle"
  fi
}

run_grep_not() {
  local needle="$1"
  total_checks=$((total_checks + 1))
  if ! grep -qF "$needle" "$SKILL_FILE" 2>/dev/null; then
    checks_passed=$((checks_passed + 1))
    printf '  PASS [GREP-NOT]  "%s"\n' "$needle"
  else
    checks_failed=$((checks_failed + 1))
    printf '  FAIL [GREP-NOT]  "%s"  — found (should be absent)\n' "$needle"
  fi
}

run_section() {
  local raw_line="$1"
  local heading
  heading=$(extract_first_quoted "$raw_line")
  # Extract operator and threshold from "COUNT >= N"
  local op threshold
  op=$(printf '%s' "$raw_line" | grep -oE 'COUNT[[:space:]]*([><=]+)' | grep -oE '[><=]+' | head -1 || true)
  threshold=$(printf '%s' "$raw_line" | grep -oE 'COUNT[[:space:]]*[><=]+[[:space:]]*[0-9]+' | grep -oE '[0-9]+$' | head -1 || true)
  local count
  count=$(grep -cF "$heading" "$SKILL_FILE" 2>/dev/null || echo 0)
  total_checks=$((total_checks + 1))
  local pass=0
  case "${op:-}" in
    ">=") [[ "$count" -ge "${threshold:-0}" ]] && pass=1 ;;
    ">")  [[ "$count" -gt "${threshold:-0}" ]] && pass=1 ;;
    "<=") [[ "$count" -le "${threshold:-0}" ]] && pass=1 ;;
    "<")  [[ "$count" -lt "${threshold:-0}" ]] && pass=1 ;;
    "=")  [[ "$count" -eq "${threshold:-0}" ]] && pass=1 ;;
  esac
  if [[ "$pass" -eq 1 ]]; then
    checks_passed=$((checks_passed + 1))
    printf '  PASS [SECTION]   "%s" COUNT=%s %s %s\n' "$heading" "$count" "${op:-?}" "${threshold:-?}"
  else
    checks_failed=$((checks_failed + 1))
    printf '  FAIL [SECTION]   "%s" COUNT=%s NOT %s %s\n' "$heading" "$count" "${op:-?}" "${threshold:-?}"
  fi
}

run_line_count() {
  local raw_line="$1"
  local op
  op=$(printf '%s' "$raw_line" | grep -oE 'LINE-COUNT:[[:space:]]*([><=]+)' | grep -oE '[><=]+' | head -1 || true)
  local threshold
  threshold=$(printf '%s' "$raw_line" | grep -oE 'LINE-COUNT:[[:space:]]*[><=]+[[:space:]]*[0-9]+' | grep -oE '[0-9]+$' | head -1 || true)
  total_checks=$((total_checks + 1))
  local pass=0
  case "${op:-}" in
    "<=") [[ "$skill_line_count" -le "${threshold:-0}" ]] && pass=1 ;;
    "<")  [[ "$skill_line_count" -lt "${threshold:-0}" ]] && pass=1 ;;
    ">=") [[ "$skill_line_count" -ge "${threshold:-0}" ]] && pass=1 ;;
    ">")  [[ "$skill_line_count" -gt "${threshold:-0}" ]] && pass=1 ;;
  esac
  if [[ "$pass" -eq 1 ]]; then
    checks_passed=$((checks_passed + 1))
    printf '  PASS [LINE-CNT]  actual=%s %s %s\n' "$skill_line_count" "${op:-?}" "${threshold:-?}"
  else
    checks_failed=$((checks_failed + 1))
    printf '  FAIL [LINE-CNT]  actual=%s NOT %s %s\n' "$skill_line_count" "${op:-?}" "${threshold:-?}"
  fi
}

run_pattern() {
  local raw_line="$1"
  local pattern anchor distance
  pattern=$(extract_first_quoted "$raw_line")
  anchor=$(extract_second_quoted "$raw_line")
  distance=$(printf '%s' "$raw_line" | grep -oE 'DISTANCE[[:space:]]+[0-9]+' | grep -oE '[0-9]+$' | head -1 || true)
  total_checks=$((total_checks + 1))

  # Find all line numbers matching pattern (extended regex)
  local pattern_lines
  pattern_lines=$(grep -nE "$pattern" "$SKILL_FILE" 2>/dev/null | cut -d: -f1 || true)

  # Find all line numbers matching anchor (fixed string)
  local anchor_lines
  anchor_lines=$(grep -nF "$anchor" "$SKILL_FILE" 2>/dev/null | cut -d: -f1 || true)

  local matched=0
  for pline in $pattern_lines; do
    for aline in $anchor_lines; do
      local diff=$(( pline - aline ))
      [[ "$diff" -lt 0 ]] && diff=$(( -diff ))
      if [[ "$diff" -le "${distance:-0}" ]]; then
        matched=1
        break 2
      fi
    done
  done

  if [[ "$matched" -eq 1 ]]; then
    checks_passed=$((checks_passed + 1))
    printf '  PASS [PATTERN]   "%s" NEAR "%s" DISTANCE %s\n' "$pattern" "$anchor" "${distance:-?}"
  else
    checks_failed=$((checks_failed + 1))
    printf '  FAIL [PATTERN]   "%s" not within %s lines of "%s"\n' "$pattern" "${distance:-?}" "$anchor"
  fi
}

# ─── Parse test suite and dispatch checks ────────────────────────────────────
# in_machine_section=1 when inside a Concrete Checks or Anti-Patterns (machine-verified) block.

in_machine_section=0

printf 'test-runner.sh\n'
printf 'Skill:      %s  (%s lines)\n' "$SKILL_FILE" "$skill_line_count"
printf 'Test suite: %s\n' "$TEST_SUITE"
printf '%s\n' "──────────────────────────────────────────"

while IFS= read -r line; do

  # ── New TC heading ────────────────────────────────────────────────────────
  if [[ "$line" =~ ^###\ TC-[0-9]+ ]]; then
    current_tc="${line###  }"   # strip leading ###
    in_machine_section=0
    printf '\n%s\n' "$line"
    continue
  fi

  # ── Enter a machine-verified section ─────────────────────────────────────
  if [[ "$line" == *"**Concrete Checks**"* ]] || [[ "$line" == *"**Anti-Patterns** (machine-verified)"* ]]; then
    in_machine_section=1
    continue
  fi

  # ── Exit machine section when a different bold section starts ─────────────
  if [[ "$in_machine_section" -eq 1 && "$line" =~ ^\*\*[A-Z] ]]; then
    # Only exit if this is NOT one of the machine section headers (already handled above)
    if [[ "$line" != *"Concrete Checks"* && "$line" != *"Anti-Patterns"* ]]; then
      in_machine_section=0
    fi
  fi

  # ── Dispatch check lines ──────────────────────────────────────────────────
  if [[ "$in_machine_section" -eq 1 ]]; then
    if [[ "$line" =~ ^-\ GREP-NOT:\ \" ]]; then
      needle=$(extract_first_quoted "$line")
      run_grep_not "$needle"
    elif [[ "$line" =~ ^-\ GREP:\ \" ]]; then
      needle=$(extract_first_quoted "$line")
      run_grep "$needle"
    elif [[ "$line" =~ ^-\ SECTION:\ \" ]]; then
      run_section "$line"
    elif [[ "$line" =~ ^-\ LINE-COUNT: ]]; then
      run_line_count "$line"
    elif [[ "$line" =~ ^-\ PATTERN:\ \" ]]; then
      run_pattern "$line"
    fi
  fi

done < "$TEST_SUITE"

# ─── Score calculation ────────────────────────────────────────────────────────
printf '\n%s\n' "──────────────────────────────────────────"
printf 'checks_passed:  %s\n' "$checks_passed"
printf 'checks_failed:  %s\n' "$checks_failed"
printf 'total_checks:   %s\n' "$total_checks"

if [[ "$total_checks" -eq 0 ]]; then
  printf 'WARNING: No machine checks found. Is the test suite v2.0 format?\n' >&2
  printf '\nexec_score: 0.0\n'
  printf 'skill_score: 0.0\n'
  exit 0
fi

# exec_score = (checks_passed / total_checks) * 70   [range: 0.0 – 70.0]
exec_score=$(awk "BEGIN { printf \"%.1f\", ($checks_passed / $total_checks) * 70 }")

printf '\nexec_score:     %s  (out of 70.0 — add agent score 0–30 for final)\n' "$exec_score"
printf '\nskill_score: %s\n' "$exec_score"
