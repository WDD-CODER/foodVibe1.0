---
name: Post-Migration System Validation
overview: Verify agent architecture, build pipeline, and GitHub sync are healthy after switching from Cursor to VS Code + Claude Code.
isProject: false
---

# Post-Migration System Validation

## Goal
Confirm the FoodVibe codebase, agent system, and build pipeline are in good health after the Cursor → VS Code + Claude Code migration.

## Rules
- Do NOT run `ng test` — 49 pre-existing failures are not blockers
- Do NOT start any feature work — diagnostic only
- If on `main` branch, create `feat/validation-run` before any writes

## Atomic Sub-tasks

- [ ] Create branch `feat/validation-run` from `main`
- [ ] Run validate-agent-refs — verify 6 agents, 19 skills, 11 cursor rules, 4 cursor commands, broken links
- [ ] Run git status — report dirty files
- [ ] Run ng build — zero errors required
- [ ] Run npm run lint:icons — report result
- [ ] Run npm run lint:no-native-select — report result
- [ ] Run github-sync skill — write notes/github-sync/2026-04-02.md
- [ ] Fix 3 stale counts in validate-agent-refs.md output template (skills: 14→19, cursor rules: 7→11, cursor commands: 3→4)
- [ ] Write project state summary report

## Done When
- validate-agent-refs shows 0 missing files, 0 broken links
- ng build compiles with zero errors
- Both lints pass
- notes/github-sync/2026-04-02.md exists
- Project state summary delivered
