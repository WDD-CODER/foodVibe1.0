---
name: auto-solve Enforcement Fixes
overview: Harden /auto-solve by closing four gaps — non-skippable approval gate, per-plan build verification, mandatory browser+evidence table for UI plans, and audit/repair of Plan 234 operational tasks in the archive.
todos: []
isProject: false
---

## Goal
Harden `/auto-solve` by closing four enforcement gaps: non-skippable approval gate, per-plan build verification, mandatory browser + evidence table for UI plans, and audit/repair of Plan 234's operational tasks in the archive.

## Atomic Sub-tasks

- [ ] Task 1: `auto-solve.md` Phase 2 — Remove silent-archive shortcut; replace with route-to-Phase-5
- [ ] Task 2: `auto-solve.md` Phase 6 — Add ARCHIVAL PRECONDITION block (3 rules); remove redundant Archive rule footnote
- [ ] Task 3: `auto-solve.md` Phase 4 — Add BUILD SCOPE RULE + skip exemption + logging requirement
- [ ] Task 4: `auto-solve.md` Phase 2 — UI-DETECTION GATE + route rule + budget cap + mandatory evidence table
- [ ] Task 5: Surface yes/no questions to user re Plan 234 operational tasks
- [ ] Task 6: Write `.qa-reports/plan-234-archive-audit.md` with 3 sections
- [ ] Task 7: Move unverified Plan 234 operational tasks back to `todo.md`; update archive
- [ ] Task 8: Run `npx ng build` — verify 0 errors

## Constraints
- Edit `auto-solve.md` only — do not touch other agent/skill files
- Sub-briefs 1–3 (Tasks 1–4) touch the same file — run sequentially
- Sub-brief 4 (Tasks 5–7) is independent
- No commits until user confirms

## Done when
- Phase 6 ARCHIVAL PRECONDITION block present (3 rules)
- Phase 2 silent-archive shortcut replaced with route-to-Phase-5
- Phase 4 BUILD SCOPE RULE + skip exemption + logging present
- Phase 2 UI-DETECTION GATE + evidence table format present
- `.qa-reports/plan-234-archive-audit.md` exists
- Unverified Plan 234 operational tasks in `todo.md` as `[ ]`
- `ng build` passes 0 errors
