## Goal
Evaluate claude-code-session-kit against foodVibe's existing .claude/ setup, install it if compatible, and fall back to a minimal custom build only for gaps it doesn't cover.

## Scope
- `/tmp/session-kit` — cloned repo (scratch, not in repo)
- `plans/session-kit-eval.md` — compatibility report (new file)
- `plans/session-handoff-setup.md` — user-facing 10-line how-to (new file)
- `.claude/settings.local.json` or `.claude/settings.json` — hook config merge (if verdict allows)
- `.claude/agents/` — 6 persona files: team-leader, software-architect, product-manager, qa-engineer, security-officer, breadcrumb-navigator (additive Context hygiene section)
- `scripts/` — session-kit shell scripts (created if needed by verdict)
- `docs/session-state.md` — session-kit template (if verdict allows)
- `CLAUDE.md` — Session handoff section addition (if verdict allows)

## Out of Scope
- No Angular/TypeScript changes
- No modifications to `/retro` or any other existing command
- No overwriting of existing `.claude/` files — merge only
- No changes outside `.claude/`, `scripts/`, `docs/`, `plans/`, `CLAUDE.md`
- Steps 3+ blocked until user approves the verdict from step 2

## Success Criteria
- [ ] `plans/session-kit-eval.md` exists with verdict (INSTALL_AS_IS / INSTALL_WITH_MERGE / CHERRY_PICK_IDEAS_ONLY / SKIP) and user has approved a path
- [ ] Chosen path fully executed: session-kit installed OR custom fallback in place with skill + commands + persona edits
- [ ] `plans/session-handoff-setup.md` exists explaining the workflow in plain language
- [ ] `/rewind` confirmed working in current Claude Code install
- [ ] License noted in eval report before any session-kit files copied
- [ ] No files outside `.claude/`, `scripts/`, `docs/`, `plans/`, `CLAUDE.md` modified

## Session ID
2026-04-13-session-kit-eval
