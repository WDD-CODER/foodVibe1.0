# Session State

## Branch
chore/ship-fast-lane

## Date
2026-07-21

## Session Summary
- Redesigned `/ship` with Phase 0 lane classification (FAST/ULTRA-TRIVIAL/REGULAR) so small, non-sensitive diffs skip full review and brain-mining while risky diffs still get the full pipeline.
- Audited the resulting Cursor-discoverability gap across the whole project (`.claude/reports/cursor-claude-parity-audit.md`), planned and executed the fix as Plan 298: git-approval exception named explicitly in both tools, legacy `.cursorrules` folded into `.cursor/rules/contractor-role.mdc` and deleted, 13 new Cursor command stubs, 12 new Cursor skill-enforcement `.mdc` rules, `docs/agent/workflow-map.md` synced, CI docs-only glob fixed to actually cover `.mdc` files.
- This branch was interrupted mid-session by a concurrent working-directory session (Plan 297, sidebar filter panel) sharing the same repo — split cleanly into two branches/PRs (this one for Plan 298, `fix/sidebar-filter-panel-unification` / PR #169 for Plan 297) rather than mixing them.

## Files Modified
42 files — see commit `c85981c` (`git show --stat c85981c`). Summary: `.claude/agents/git-agent.md`, `docs/agent/standards-git.md`, `.claude/commands/ship.md`, 13 new `.cursor/commands/*.md`, 12 new `.cursor/rules/*-must-use-skill.mdc`, `.cursor/rules/contractor-role.mdc` (new), `.cursorrules` (deleted), `docs/agent/workflow-map.md`, `README_WORKFLOW.md`, `_shared/tech-stack.md`, `.github/workflows/ci.yml`, `AGENTS.md`.

## Commit
c85981c

## PR
pending — opening next

## Next Steps
- Merge gate after PR is opened and checks pass.
- Deliberately deferred (per audit + plan scope): `mobile-flow-audit`, `render-flow-audit`, `auto-solve` Cursor stubs — Agent/Playwright-MCP dependent, needs its own design pass before a stub makes sense.
