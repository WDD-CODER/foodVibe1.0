## Goal
Harden `/auto-solve` by closing four enforcement gaps: non-skippable approval gate, per-plan build verification, mandatory browser + evidence table for UI plans, and audit/repair of Plan 234's operational tasks in the archive.

## Scope
- `.claude/commands/auto-solve.md` — Phase 2, Phase 4, Phase 6 (sub-briefs 1–3)
- `.claude/todo-archive.md` — Plan 234 Per-User Collections section (sub-brief 4)
- `.claude/todo.md` — re-open any unverified Plan 234 operational tasks (sub-brief 4)
- `.qa-reports/plan-234-archive-audit.md` — new audit report (sub-brief 4)

## Out of Scope
- Other command files (`.claude/agents/*`, `.claude/skills/*`)
- Angular source code
- Any Plan 234 code verification (code is confirmed on main)

## Success Criteria
- [ ] Phase 6 contains ARCHIVAL PRECONDITION block (3 rules: approve-required, pre-validated-done still needs approve, operational tasks require session evidence)
- [ ] Phase 2 all-DONE shortcut modified: surfaces Phase 5 instead of silently archiving
- [ ] Phase 4 contains BUILD SCOPE RULE (per-plan, not session-wide), skip exemption (pre-validated-done only), and logging requirement
- [ ] Phase 2 contains UI-DETECTION GATE, mandatory table output format with Evidence column, route identification rule, browser budget cap (5 actions), evidence-required rule
- [ ] `.qa-reports/plan-234-archive-audit.md` exists with 3 sections: CODE EVIDENCE CONFIRMED, OPERATIONAL VERIFIED THIS SESSION, OPERATIONAL STILL UNVERIFIED
- [ ] Unverified Plan 234 operational tasks moved back to `todo.md` as `[ ]`
- [ ] `ng build` passes after all edits

## Session ID
2026-04-13-auto-solve-enforcement-fixes
