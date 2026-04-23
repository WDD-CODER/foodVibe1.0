#!/usr/bin/env python3
# context-monitor.py — PostToolUse hook
# Measures actual token usage from the transcript and injects context warnings.
# Three-tier alert system: 40% (warn) → 60% (alert) → 73% (hard stop).
#
# Replaces context-monitor.sh (byte-based) with token-based measurement that
# scales correctly to the model's actual context window.
#
# Hook type: PostToolUse (matcher: ".*")
# Timeout: 5s

import json
import os
import sys
import time
import pathlib

CONFIG_PATH = pathlib.Path(__file__).parent.parent / '.claude' / 'config' / 'model-context-windows.json'


def load_window_config():
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except Exception:
        return {'default': 200000, 'models': {}}


def longest_prefix_match(model, config):
    """Return the context window for the given model string using longest-prefix match."""
    models = config.get('models', {})
    best_key = None
    best_len = -1
    for key in models:
        if model.startswith(key) and len(key) > best_len:
            best_key = key
            best_len = len(key)
    if best_key is not None:
        return models[best_key], True
    return config.get('default', 200000), False


def emit(additional_context):
    print(json.dumps({
        'hookSpecificOutput': {
            'hookEventName': 'PostToolUse',
            'additionalContext': additional_context
        }
    }))


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
    except Exception:
        sys.exit(0)

    # Extract transcript path and normalise backslashes (Windows → POSIX)
    transcript_path_raw = data.get('transcript_path', '')
    if not transcript_path_raw:
        sys.exit(0)
    transcript_path = transcript_path_raw.replace('\\', '/')

    if not os.path.isfile(transcript_path):
        sys.exit(0)

    # Derive session_id from transcript filename (UUID = filename without extension)
    session_id = os.path.splitext(os.path.basename(transcript_path))[0]

    # Write current session_id to a well-known path so /context-override can find it
    try:
        with open('/tmp/claude-context-monitor-current-session', 'w') as f:
            f.write(session_id)
    except Exception:
        pass

    # --- Session-scoped counter ---
    counter_file = f'/tmp/claude-context-monitor-counter-{session_id}'
    try:
        count = int(open(counter_file).read().strip())
    except Exception:
        count = 0
    count += 1
    try:
        with open(counter_file, 'w') as f:
            f.write(str(count))
    except Exception:
        pass

    # Run only after 3rd call and then every 10th — keeps overhead near zero
    if count < 3 or count % 10 != 0:
        sys.exit(0)

    # --- Override check (30-minute window) ---
    override_file = f'/tmp/claude-context-override-{session_id}'
    if os.path.isfile(override_file):
        try:
            age = time.time() - os.path.getmtime(override_file)
            if age < 1800:
                sys.exit(0)
        except Exception:
            pass

    # --- Walk transcript backwards to find latest usage entry ---
    model = None
    total_tokens = None
    try:
        with open(transcript_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue
            if entry.get('type') != 'assistant':
                continue
            msg = entry.get('message', {})
            usage = msg.get('usage')
            if not usage:
                continue
            model = msg.get('model', '')
            total_tokens = (
                usage.get('input_tokens', 0) +
                usage.get('cache_creation_input_tokens', 0) +
                usage.get('cache_read_input_tokens', 0)
            )
            break
    except Exception:
        sys.exit(0)

    if model is None or total_tokens is None:
        sys.exit(0)

    # --- 1M-context auto-detect ---
    flag_1m = f'/tmp/claude-1m-flag-{session_id}'
    if total_tokens > 200000:
        try:
            open(flag_1m, 'w').close()
        except Exception:
            pass

    # --- Load config and determine window ---
    config = load_window_config()
    window, matched = longest_prefix_match(model, config)

    # Override with 1M if flag exists
    if os.path.isfile(flag_1m):
        window = 1000000

    # --- Unknown model warning (once per session per model) ---
    if not matched and not os.path.isfile(flag_1m):
        safe_model = model.replace('/', '-').replace(' ', '-')
        unknown_flag = f'/tmp/claude-unknown-model-seen-{session_id}-{safe_model}'
        if not os.path.isfile(unknown_flag):
            print(f"[context-monitor] Unknown model '{model}' — using default window ({window:,} tokens). "
                  f"Add it to .claude/config/model-context-windows.json for accuracy.", file=sys.stderr)
            try:
                open(unknown_flag, 'w').close()
            except Exception:
                pass
            # Append to config file so it's not unknown next time
            try:
                config['models'][model] = config.get('default', 200000)
                with open(CONFIG_PATH, 'w') as f:
                    json.dump(config, f, indent=2)
                    f.write('\n')
            except Exception:
                pass

    # --- Compute percentage ---
    pct = (total_tokens / window) * 100

    # --- Determine tier ---
    if pct >= 73:
        tier = 73
    elif pct >= 60:
        tier = 60
    elif pct >= 40:
        tier = 40
    else:
        tier = 0

    # --- Last-warning-tier gate (only emit if tier increased) ---
    tier_file = f'/tmp/claude-context-last-tier-{session_id}'
    try:
        last_tier = int(open(tier_file).read().strip())
    except Exception:
        last_tier = 0

    if tier <= last_tier or tier == 0:
        sys.exit(0)

    # Update tier file
    try:
        with open(tier_file, 'w') as f:
            f.write(str(tier))
    except Exception:
        pass

    pct_str = f'{pct:.1f}%'

    if tier == 40:
        emit(
            f'Context at {pct_str}. Early signal — no action needed yet. '
            'Start thinking about natural wrap-up points.'
        )
    elif tier == 60:
        emit(
            f'Context at {pct_str}. Update your SESSION SAVE TARGET file with current progress. '
            'Finish your current task cleanly, then hand off. Do not start new tasks.'
        )
    elif tier == 73:
        emit(
            f'HARD STOP — Context at {pct_str}. You MUST:\n'
            '1. Update your SESSION SAVE TARGET file with current progress, decisions, and next steps.\n'
            '2. Stop all development work.\n'
            f'3. Tell the user exactly: \'Context is at {pct_str}. I should hand off to a new session. '
            'My SESSION SAVE TARGET file is updated.\'\n\n'
            'Reply /context-override if you want me to continue despite the risk of context truncation.'
        )

    sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        sys.exit(0)
