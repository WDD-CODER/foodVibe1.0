# Brief — Context Monitor Rewrite (verbatim from user spec, Option A)

## Goal
Rewrite the context-monitor hook to measure actual token usage from the transcript (not file bytes), scale to any model's context window, and support a /context-override command that lets the user bypass the 73% hard stop when they explicitly choose to keep working.

## Files to Check First
- scripts/context-monitor.sh (current bash implementation — will be replaced)
- scripts/pre-compact-reminder.sh (simplify — remove baseline logic)
- .claude/settings.json (swap PostToolUse command path)
- .claude/commands/ (inspect structure of an existing command file as template)
- A recent Claude Code transcript .jsonl (verify exact JSON structure)

## Step 1 — Verify transcript structure
Each assistant entry must have message.model (string) and message.usage with input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens.
If structure differs — STOP and report.

## Step 2 — Create .claude/config/model-context-windows.json
JSON map of model-name → context window size. Lookup rule: longest-prefix match. Fall back to "default": 200000.

## Step 3 — Create scripts/context-monitor.py (replaces .sh)
Key behaviors:
- Read stdin JSON, extract transcript_path and session_id
- Session-scoped counter: /tmp/claude-context-monitor-counter-<session_id>. Increment every call. Exit silently unless count >= 3 AND count % 10 == 0
- Walk .jsonl backwards. Find most recent assistant entry with message.usage. Wrap json.loads in try/except
- Extract model from message.model; total_tokens = input_tokens + cache_creation + cache_read (with .get fallback)
- 1M-context auto-detect: If total_tokens > 200000 → write /tmp/claude-1m-flag-<session_id>. On subsequent calls, if flag exists, use 1000000
- Load model-context-windows.json, longest-prefix match. Fall back to default
- Unknown-model warning: if no match AND flag file doesn't exist → print to stderr, touch flag, update JSON
- Override check: if /tmp/claude-context-override-<session_id> exists AND mtime within 30 min → exit silently
- Compute pct = total_tokens / window * 100
- Last-warning-tier: /tmp/claude-context-last-tier-<session_id>. Only emit if current tier > last tier
- Tier 40: soft warning; Tier 60: alert; Tier 73: hard stop with /context-override instructions
- Output: hookSpecificOutput JSON (PostToolUse format)
- On ANY parse failure or missing transcript → exit 0 silently

## Step 4 — Create .claude/commands/context-override.md
- Touch /tmp/claude-context-override-<session_id>
- Confirm to user: warnings disabled for 30 minutes

## Step 5 — Simplify scripts/pre-compact-reminder.sh
Remove baseline-writing block. Keep only systemMessage output.

## Step 6 — Update .claude/settings.json
Change context-monitor.sh command to: python C:/foodCo/foodVibe1.0/scripts/context-monitor.py

## Rules
- Do NOT modify tool-failure-hook.ps1 or other PostToolUse entries
- Do NOT remove /tmp/claude-compact-baseline if it exists
- Silent on failure — any parse error must exit 0
- Session-scoped tmp files — every /tmp/ file must include <session_id>
- Python 3 standard library only (json, os, sys, time, pathlib)
- Follow existing hook conventions: read JSON stdin, write JSON stdout, exit 0

## Done When
- 40% context emits soft warning once, then quiet
- 60% emits alert once
- 73% emits hard stop with /context-override instructions
- /context-override silences hook for 30 minutes
- Switching models mid-session reflected immediately
- Unknown model triggers exactly one stderr line
- No spurious warnings after /compact
