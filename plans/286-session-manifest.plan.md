# Plan 286 — Session Manifest System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track which files each Claude session edits so that `/ship` and `/end-session` only commit the current session's files, never accidentally sweeping in work from a parallel session running on the same worktree.

**Architecture:** A PostToolUse hook appends every edited file path to a per-branch manifest file at `.claude/sessions/<branch>/manifest.txt`. At ship time, the agent reads this manifest instead of running `git add -A`. A helper script checks other active session manifests for file overlap and warns the user if found. The manifest is deleted after a successful push.

**Tech Stack:** Python 3 (already installed), Claude Code `settings.json` hooks, Bash, git

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `scripts/session-manifest-hook.py` | CREATE | PostToolUse hook — records each edited file into the manifest |
| `scripts/session-manifest-ship.py` | CREATE | Ship helper — reads manifest, detects overlap, outputs file list as JSON |
| `.claude/settings.json` | MODIFY | Add PostToolUse hook entry for `Edit\|Write` tools |
| `.gitignore` | MODIFY | Add `.claude/sessions/` and `gcm-diagnose.log` (missed from audit branch) |
| `.claude/commands/ship.md` | MODIFY | Update agent prompt to use manifest-aware staging |
| `.claude/skills/end-session/SKILL.md` | MODIFY | Same prompt update (this is the `/end-session` alias) |

---

## Task 1 — Create the hook script

**Files:**
- Create: `scripts/session-manifest-hook.py`

- [ ] **Step 1: Create the hook script**

```python
#!/usr/bin/env python3
"""
PostToolUse hook — records edited file paths to the session manifest.
Reads tool event JSON from stdin. Appends the file_path (relative to repo root)
to .claude/sessions/<branch>/manifest.txt, skipping duplicates.
"""
import sys
import os
import json
import subprocess


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    # Tool input may be nested under 'tool_input' or at the top level
    tool_input = data.get('tool_input', data)
    file_path = tool_input.get('file_path', '')

    if not file_path:
        sys.exit(0)

    # Resolve repo root
    try:
        repo_root = subprocess.check_output(
            ['git', 'rev-parse', '--show-toplevel'],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        sys.exit(0)

    # Make path relative to repo root, using forward slashes
    abs_path = os.path.normpath(file_path)
    root_norm = os.path.normpath(repo_root)
    try:
        rel_path = os.path.relpath(abs_path, root_norm).replace('\\', '/')
    except ValueError:
        # Different drive letters on Windows — store absolute
        rel_path = abs_path.replace('\\', '/')

    # Skip paths that escape the repo
    if rel_path.startswith('..'):
        sys.exit(0)

    # Get current branch
    try:
        branch = subprocess.check_output(
            ['git', 'branch', '--show-current'],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        sys.exit(0)

    if not branch:
        sys.exit(0)

    # Write to manifest (deduplicated)
    manifest_dir = os.path.join(root_norm, '.claude', 'sessions', branch)
    os.makedirs(manifest_dir, exist_ok=True)
    manifest_path = os.path.join(manifest_dir, 'manifest.txt')

    existing = set()
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding='utf-8') as f:
            existing = {line.strip() for line in f if line.strip()}

    if rel_path not in existing:
        with open(manifest_path, 'a', encoding='utf-8') as f:
            f.write(rel_path + '\n')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Verify script is syntactically valid**

```bash
python3 scripts/session-manifest-hook.py < /dev/null
echo "exit code: $?"
```

Expected: `exit code: 0` (empty stdin → graceful exit, no error)

---

## Task 2 — Create the ship helper script

**Files:**
- Create: `scripts/session-manifest-ship.py`

- [ ] **Step 1: Create the ship helper script**

```python
#!/usr/bin/env python3
"""
Ship-time manifest helper.
Usage: python3 scripts/session-manifest-ship.py [branch-name]

Outputs JSON:
{
  "no_manifest": true/false,
  "files": ["rel/path/to/file", ...],
  "overlaps": [
    {"branch": "other-branch", "files": ["shared/file.ts"]}
  ]
}

overlaps only contains entries from manifests modified < 24 hours ago
(stale manifests from abandoned sessions are ignored).
"""
import sys
import os
import json
import time
import subprocess


STALE_HOURS = 24


def get_branch():
    try:
        return subprocess.check_output(
            ['git', 'branch', '--show-current'],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return ''


def get_repo_root():
    try:
        return subprocess.check_output(
            ['git', 'rev-parse', '--show-toplevel'],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return os.getcwd()


def read_manifest(path):
    with open(path, encoding='utf-8') as f:
        return {line.strip() for line in f if line.strip()}


def main():
    branch = sys.argv[1] if len(sys.argv) > 1 else get_branch()
    if not branch:
        print(json.dumps({'no_manifest': True, 'files': [], 'overlaps': []}))
        return

    repo_root = get_repo_root()
    sessions_dir = os.path.join(repo_root, '.claude', 'sessions')
    my_manifest_path = os.path.join(sessions_dir, branch, 'manifest.txt')

    if not os.path.exists(my_manifest_path):
        print(json.dumps({'no_manifest': True, 'files': [], 'overlaps': []}))
        return

    my_files = read_manifest(my_manifest_path)
    now = time.time()
    overlaps = []

    # Walk all other session manifests
    if os.path.isdir(sessions_dir):
        for dirpath, _, filenames in os.walk(sessions_dir):
            for fname in filenames:
                if fname != 'manifest.txt':
                    continue
                other_path = os.path.join(dirpath, fname)
                if os.path.abspath(other_path) == os.path.abspath(my_manifest_path):
                    continue  # skip own manifest

                # Skip stale manifests
                age_hours = (now - os.path.getmtime(other_path)) / 3600
                if age_hours > STALE_HOURS:
                    continue

                # Derive other branch name from path
                other_branch = os.path.relpath(
                    os.path.dirname(other_path), sessions_dir
                ).replace('\\', '/')

                other_files = read_manifest(other_path)
                shared = my_files & other_files
                if shared:
                    overlaps.append({
                        'branch': other_branch,
                        'files': sorted(shared)
                    })

    print(json.dumps({
        'no_manifest': False,
        'files': sorted(my_files),
        'overlaps': overlaps
    }))


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Verify script runs cleanly**

```bash
python3 scripts/session-manifest-ship.py nonexistent-branch
```

Expected output:
```json
{"no_manifest": true, "files": [], "overlaps": []}
```

---

## Task 3 — Wire the hook into settings.json

**Files:**
- Modify: `.claude/settings.json` (lines 109–128 — the `PostToolUse` array)

Current `PostToolUse` block has two entries: `tool-failure-hook.ps1` and `context-monitor.py`. Add a **third** entry specifically for `Edit|Write`:

- [ ] **Step 1: Add the manifest hook entry**

In `.claude/settings.json`, inside the `PostToolUse` array, add after the existing last entry (before the closing `]`):

```json
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 C:/foodCo/foodVibe1.0/scripts/session-manifest-hook.py",
            "timeout": 5
          }
        ]
      }
```

The full `PostToolUse` array after the edit:
```json
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -File C:/foodCo/foodVibe1.0/.claude/reflect/tool-failure-hook.ps1"
          }
        ]
      },
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python C:/foodCo/foodVibe1.0/scripts/context-monitor.py",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 C:/foodCo/foodVibe1.0/scripts/session-manifest-hook.py",
            "timeout": 5
          }
        ]
      }
    ]
```

- [ ] **Step 2: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('.claude/settings.json')); print('valid')"
```

Expected: `valid`

---

## Task 4 — Update .gitignore

**Files:**
- Modify: `.gitignore`

Two entries to add: `.claude/sessions/` (new) and `gcm-diagnose.log` (missed from previous branch).

- [ ] **Step 1: Add entries to .gitignore**

Append to the end of `.gitignore`:

```
# Session manifests — per-session runtime state, never commit
.claude/sessions/

# GCM diagnostic log — dumps all env vars including secrets
gcm-diagnose.log
```

- [ ] **Step 2: Verify gcm-diagnose.log is now ignored**

```bash
git check-ignore -v gcm-diagnose.log
```

Expected: `.gitignore:NNN:gcm-diagnose.log    gcm-diagnose.log`

---

## Task 5 — Update the /ship command prompt

**Files:**
- Modify: `.claude/commands/ship.md`

Replace the existing `prompt:` string inside the Agent call with the manifest-aware version.

- [ ] **Step 1: Update ship.md**

Replace:
```
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync."
```

With:
```
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync.\n\nMANIFEST-AWARE STAGING (Phase 2):\nBefore running git add, run: python3 scripts/session-manifest-ship.py\nParse the JSON output:\n  - If no_manifest=true: warn user ('No session manifest found — falling back to git add -A. If running parallel sessions, stage files manually.') then proceed with git add -A.\n  - If overlaps is non-empty: STOP. Show the user: '⚠ These files were also edited by another active session:\\n<list overlapping files by branch>\\nCommit only non-overlapping files? [y/n] Or abort and resolve manually.' Wait for user decision before proceeding.\n  - If files list is non-empty and no overlaps: run git add for each file in the files list (not git add -A).\nAfter successful push: delete .claude/sessions/<current-branch>/manifest.txt"
```

- [ ] **Step 2: Verify ship.md is readable**

```bash
head -20 .claude/commands/ship.md
```

Expected: file starts with `# /ship — Fast Session End`

---

## Task 6 — Update the /end-session skill prompt

**Files:**
- Modify: `.claude/skills/end-session/SKILL.md`

Same manifest-aware prompt update as Task 5, but for the end-session alias.

- [ ] **Step 1: Update end-session SKILL.md**

In `.claude/skills/end-session/SKILL.md`, replace the `prompt:` string inside the Agent call:

Replace (the long existing prompt string ending in `...included.'"`):
```
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync. IMPORTANT: In Phase 2 (commit proposal), first check .claude/agents/invocation-log.tsv for any Team Leader or multi-agent entries from this session. If found, compare the number of files in `git status` against what was delegated. If git status shows significantly fewer files than the Team Leader reported modifying, warn the user before proposing the commit: 'Note: Team Leader ran this session but only N files are staged — verify all expected plan files are included.'"
```

With:
```
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync. IMPORTANT: In Phase 2 (commit proposal), first check .claude/agents/invocation-log.tsv for any Team Leader or multi-agent entries from this session. If found, compare the number of files in `git status` against what was delegated. If git status shows significantly fewer files than the Team Leader reported modifying, warn the user before proposing the commit: 'Note: Team Leader ran this session but only N files are staged — verify all expected plan files are included.'\n\nMANIFEST-AWARE STAGING (Phase 2):\nBefore running git add, run: python3 scripts/session-manifest-ship.py\nParse the JSON output:\n  - If no_manifest=true: warn user ('No session manifest found — falling back to git add -A. If running parallel sessions, stage files manually.') then proceed with git add -A.\n  - If overlaps is non-empty: STOP. Show the user: '⚠ These files were also edited by another active session:\\n<list overlapping files by branch>\\nCommit only non-overlapping files? [y/n] Or abort and resolve manually.' Wait for user decision before proceeding.\n  - If files list is non-empty and no overlaps: run git add for each file in the files list (not git add -A).\nAfter successful push: delete .claude/sessions/<current-branch>/manifest.txt"
```

---

## Task 7 — Smoke test end to end

- [ ] **Step 1: Verify the hook fires on a test edit**

Make a trivial edit to any file (e.g., add a blank comment to `scripts/session-manifest-hook.py` then revert it). After the edit, check the manifest was created:

```bash
git branch --show-current
# Take note of <branch>
ls .claude/sessions/<branch>/manifest.txt
cat .claude/sessions/<branch>/manifest.txt
```

Expected: file exists, contains the path of the file you just edited.

- [ ] **Step 2: Verify ship helper reads it correctly**

```bash
python3 scripts/session-manifest-ship.py
```

Expected: JSON with `no_manifest: false`, `files` list containing the edited file, `overlaps: []`.

- [ ] **Step 3: Verify no overlap on a fresh tree (no other session manifests)**

Confirm `overlaps` is `[]` in the output above.

- [ ] **Step 4: Simulate an overlap**

Create a fake other-session manifest:

```bash
mkdir -p .claude/sessions/other-session
echo "scripts/session-manifest-hook.py" > .claude/sessions/other-session/manifest.txt
python3 scripts/session-manifest-ship.py
```

Expected: JSON with `overlaps` containing `{"branch": "other-session", "files": ["scripts/session-manifest-hook.py"]}`.

Clean up:

```bash
python3 -c "import shutil; shutil.rmtree('.claude/sessions/other-session')"
```

- [ ] **Step 5: Verify stale manifest is ignored**

```bash
mkdir -p .claude/sessions/old-session
echo "scripts/session-manifest-hook.py" > .claude/sessions/old-session/manifest.txt
# Back-date the file by 25 hours
python3 -c "import os,time; os.utime('.claude/sessions/old-session/manifest.txt', (time.time()-90000, time.time()-90000))"
python3 scripts/session-manifest-ship.py
```

Expected: `overlaps: []` (stale manifest ignored).

Clean up:

```bash
python3 -c "import shutil; shutil.rmtree('.claude/sessions/old-session')"
```

---

## Task 8 — Commit

- [ ] **Step 1: Stage files**

```bash
git add scripts/session-manifest-hook.py scripts/session-manifest-ship.py .claude/settings.json .gitignore .claude/commands/ship.md .claude/skills/end-session/SKILL.md
```

- [ ] **Step 2: Verify staged files are exactly the 6 expected**

```bash
git diff --cached --name-only
```

Expected (in any order):
```
.claude/commands/ship.md
.claude/settings.json
.claude/skills/end-session/SKILL.md
.gitignore
scripts/session-manifest-hook.py
scripts/session-manifest-ship.py
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(tooling): session manifest — ship only stages current session's files"
```

---

## Limitations (documented, not bugs)

- Same file edited by two parallel sessions: manifest detects overlap and warns, but cannot auto-resolve. User must choose which session commits first.
- Manifest only records files touched via Claude's Edit/Write tools. Files modified by Bash commands (e.g., `sed`, scripts) are not tracked. This is acceptable — direct Bash edits are rare and intentional.
- `gcm-diagnose.log` is now in `.gitignore` globally (`~/.gitignore_global`) and project-level. Both added in this session.
