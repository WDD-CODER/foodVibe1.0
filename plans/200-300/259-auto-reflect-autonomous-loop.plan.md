---
name: Auto-Reflect Autonomous Loop
overview: Wire /reflect to fire automatically after correction cycles and as a Stop hook safety net, closing the self-improvement ratchet loop
todos: []
isProject: false
---

> RETIRED — MemPalace/claude-mem/reflect automation retired in July 2026 cutover. Do not execute. Prefer docs/brain/.

# Auto-Reflect Autonomous Loop

## Goal
Close the `/reflect` ratchet loop — wire it to fire automatically after every correction cycle (agent-driven) and as a Stop hook safety net, so skill improvement becomes continuous and requires zero human trigger.

## Atomic Sub-tasks

- [ ] Task 1: Edit `.claude/commands/reflect.md` — insert AUTO MODE block after frontmatter closing `---`; mark as agent-only; fix `git checkout main` → `git branch -D reflect/auto-...`; add `---` separator before existing content
- [ ] Task 1b: Edit `.claude/copilot-instructions.md` — add correction-cycle behavioral rule to §0 Skill Triggers defining when and how agent triggers AUTO MODE inline
- [ ] Task 2: Create `.claude/reflect/auto-reflect.ps1` — default `$Mode = "failure-only"` (safety net); log to `auto-reflection-log.tsv`; use `powershell` (pwsh not installed); script is idempotent
- [ ] Task 3: Edit root `.claude/settings.json` + worktree `.claude/settings.json` — add `hooks.Stop` array with `powershell -NoProfile -File .claude/reflect/auto-reflect.ps1`
- [ ] Task 4: Verify — file existence, JSON validity, Stop hook entry, AUTO MODE in reflect.md, behavioral rule in copilot-instructions.md, script dry-run

## Constraints
- PowerShell only — all scripts must be `.ps1`, no bash
- `powershell` (Win 5.1) — `pwsh` (PS7) is not installed on this machine
- Merge, never overwrite — settings.json must preserve all existing content
- AUTO MODE is additive — existing manual `/reflect` behavior must remain 100% intact
- Scope — only `.claude/` files; zero app code changes
- Log to `auto-reflection-log.tsv` (separate from `reflection-log.tsv` to avoid schema collision)

## Done When
- [ ] `reflect.md` has working AUTO MODE section after frontmatter
- [ ] `copilot-instructions.md` has correction-cycle behavioral rule
- [ ] `.claude/reflect/auto-reflect.ps1` exists and is valid PowerShell
- [ ] Root `.claude/settings.json` has Stop hook pointing to the script
- [ ] Manual `/reflect` still works exactly as before
