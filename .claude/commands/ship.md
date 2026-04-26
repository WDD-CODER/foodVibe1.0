# /ship — Fast Session End

Closes the current session in under 2 minutes. 4 phases only.

**Alias for**: `end-of-session-agent` (4-phase mode)

## Execution

Invoke the `end-of-session-agent` via the Agent tool:

```
Agent(
  subagent_type: "end-of-session-agent",
  description: "Run 4-phase ship pipeline",
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync.\n\nMANIFEST-AWARE STAGING (Phase 2 — before git add):\n1. Run: python3 scripts/session-manifest-ship.py\n2. Parse JSON output:\n   - no_manifest=true → warn: 'No session manifest found — falling back to git add -A. If running parallel sessions, stage files manually.' Then proceed with git add -A.\n   - overlaps non-empty → STOP. Show user: '⚠ These files were also edited by another active session:\\n<list each overlap by branch + filenames>\\nCommit only non-overlapping files? [y/n] Or abort and resolve manually.' Wait for user before proceeding.\n   - files non-empty, no overlaps → run: git add <each file in the files list> (NOT git add -A)\n3. After successful push: python3 -c \"import os; os.remove('.claude/sessions/<current-branch>/manifest.txt')\""
)
```

## What /ship does

| Phase | Action | Blocks on failure? |
|-------|--------|--------------------|
| 1 | Build verification (`ng build`) | Yes |
| 2 | git-agent commit + push (with user approval) | No |
| 3 | Write session-state.md | No |
| 4 | Sync todo.md | No |

## What /ship does NOT do (use on-demand commands)

| Skipped | On-demand alternative |
|---------|-----------------------|
| Techdebt scan | `/techdebt` |
| Breadcrumb / doc refresh | `/docs-refresh` |
| Session evaluation vs brief | Read `.claude/sessions/{id}/brief.md` |
| MemPalace diary write | `mempalace_diary_write()` manually |
| Plan archive | Rename `.plan.md` → `.done.plan.md` |

