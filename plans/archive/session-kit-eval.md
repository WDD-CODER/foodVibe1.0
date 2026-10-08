# session-kit Compatibility Evaluation
**Repo:** https://github.com/shihchengwei-lab/claude-code-session-kit  
**License:** MIT — free to copy, modify, distribute. ✓ No restrictions.  
**Evaluated:** 2026-04-13

---

## What session-kit provides

| Component | Hook event | What it does |
|-----------|-----------|--------------|
| `context-monitor.sh` | PostToolUse (every 10th call) | Reads transcript file size; injects 3-tier alerts at ~40% / ~60% / ~70% context |
| `pre-compact-reminder.sh` | PreCompact | Fires before context compression; reminds agent to save state to session-state.md |
| `session-startup.sh` | SessionStart | Auto-loads `docs/session-state.md` into context at session start |
| `handoff-check.sh` | Stop | If session-state.md was modified in last 60s, validates it has commit hash + `## Session Summary` + `## Next Steps` |
| `session-state-template.md` | — | Blank template: Current Status, Session Summary, Next Steps, Blocked, References |
| CLAUDE.md templates | — | 3 ready-made CLAUDE.md variants (beginner / intermediate / multi-agent) |

---

## Conflicts with existing .claude/

| File | Conflict type | Detail |
|------|--------------|--------|
| `.claude/settings.json` | **Hook merge required** | Already has a `PostToolUse` hook (`tool-failure-hook.ps1`). session-kit adds another PostToolUse hook. Claude Code supports multiple hooks per event — must **merge arrays**, not overwrite. |
| `.claude/settings.local.json` | **Layout mismatch** | session-kit's example writes hooks into `settings.local.json`. Our project uses `settings.local.json` for permissions only and `settings.json` for hooks. All hook additions should go to `settings.json` to stay consistent. |
| `CLAUDE.md` | **Additive only** | session-kit CLAUDE.md templates would replace our existing CLAUDE.md. Must **append** the `## Session Management` section, never overwrite. |
| `scripts/` | **No conflict** | Our `scripts/` has `.mjs` files. session-kit adds `.sh` files. Different extensions, no collision. |
| `docs/session-state.md` | **New file** | Doesn't exist yet. Safe to create. |

**Windows note:** session-kit uses `#!/usr/bin/env bash`. Git Bash is required (already present — confirmed by git usage). `handoff-check.sh` explicitly handles Msys/Cygwin for `stat`. Counter file is written to `/tmp/` which maps to Windows temp. All hooks should work under Git Bash.

---

## Gaps vs. our needs

| Need (original brief) | session-kit covers it? | Detail |
|----------------------|----------------------|--------|
| **Detect** — triggers before context blows | ✓ **Yes, better** | PostToolUse hook with real size-based thresholds (40/60/70%) beats our "turn ≥25" heuristic |
| **PreCompact reminder** | ✓ **Yes, included** | `pre-compact-reminder.sh` — our original brief didn't have this at all |
| **Auto-load state at session start** | ✓ **Yes** | `session-startup.sh` auto-injects session-state.md content |
| **Validation on session end** | ✓ **Yes** | `handoff-check.sh` validates commit hash + required sections |
| **`/checkpoint` command** | ✗ **No** | session-kit has no custom commands. Its save model is the agent updating `docs/session-state.md` — a single overwritten file, not timestamped snapshots |
| **`/resume` command** | ✗ **Partial** | Auto-load at startup covers the common case, but there's no explicit "read this file, confirm, wait for go" command for mid-session resume |
| **Timestamped snapshots** | ✗ **No** | session-kit uses one persistent `docs/session-state.md`. Multiple checkpoints with `YYYY-MM-DD-HHMM-slug.md` are not supported |
| **Agent persona integration** | ✗ **No** | No mechanism to embed checkpoint triggers in the six agent persona files |
| **`.claude/sessions/README.md`** | ✗ **No** | Not in scope of session-kit |

---

## Integration verdict

### **INSTALL_WITH_MERGE** — install the 4 hooks + template via careful merge, then build custom additions for the 4 gaps

Rationale:
- The hooks are production-tested, better than our planned heuristics, and MIT-licensed
- No file overwrites required — all changes are additive
- The 4 gaps (command, resume, snapshots, persona edits) are small and well-defined — build them as planned
- Doing CHERRY_PICK_IDEAS_ONLY would mean re-implementing what already works

---

## Recommendation

1. **Merge the 4 hook entries into `.claude/settings.json`** — add alongside the existing `PostToolUse` entry (do not replace it). Keep our PowerShell hook, add session-kit's bash hooks.

2. **Copy the 4 scripts to `scripts/`** — `context-monitor.sh`, `pre-compact-reminder.sh`, `session-startup.sh`, `handoff-check.sh`. Make executable. These don't conflict with any existing file.

3. **Create `docs/session-state.md`** from the template. This is the rolling handoff document that the hooks read and write.

4. **Append `## Session Management` to `CLAUDE.md`** (2–3 lines) pointing to `docs/session-state.md` as continuity source. Never overwrite existing CLAUDE.md content.

5. **Build custom gap items** (our original brief, unchanged):
   - `.claude/skills/context-management/SKILL.md` — update detection triggers to use session-kit's 40/60/70% language instead of "turn ≥25"
   - `.claude/commands/checkpoint.md` — timestamped snapshot command (complements session-state.md; useful for mid-task branching)
   - `.claude/commands/resume.md` — explicit confirmation-gated resume
   - Agent persona edits — 6 files, additive `## Context hygiene` section
   - `.claude/sessions/README.md`

---

## Merge notes

_To be filled in during execution._

| File | Decision |
|------|----------|
| `.claude/settings.json` → `hooks.PostToolUse` | Append session-kit entry; preserve existing `tool-failure-hook.ps1` entry |
| `.claude/settings.json` → `hooks.SessionStart` | New key — add directly |
| `.claude/settings.json` → `hooks.PreCompact` | New key — add directly |
| `.claude/settings.json` → `hooks.Stop` | New key — add directly |
| `CLAUDE.md` | Append `## Session Management` section at bottom |
