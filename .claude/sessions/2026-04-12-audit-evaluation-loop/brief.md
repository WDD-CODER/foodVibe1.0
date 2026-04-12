## Goal
Build a morning evaluation loop (/audit-report upgrade) with /test-template and /adversarial-template commands, fixture corpus, versioned fix templates, session logging, and append-only history — enabling measured template quality verification before applying fixes.

## Scope
- `.claude/fix-templates/` — version frontmatter
- `.claude/fix-templates/tests/` — fixture corpus (cases + expected)
- `.claude/commands/test-template.md` — new slash command
- `.claude/commands/adversarial-template.md` — new slash command
- `.claude/skills/audit-report/` or `.claude/commands/audit-report.md` — upgrade
- `.claude/reports/audit-sessions/` — session logs
- `.claude/fix-templates/tests/history.jsonl` — append-only test history

## Out of Scope
- Meta-evaluation (agent grading its own templates)
- New templates for categories A, B, D
- Auto-promotion gates
- Wiring fix templates into nightly audit SKILL.md

## Success Criteria
- [ ] Brief 0: Cleanup — stale triggers confirmed deleted, orphan files swept, templates verified
- [ ] Brief 1: Fixture corpus — 6 color-token cases + 5 manual-subscription cases with expected files
- [ ] Brief 2: Templates versioned with frontmatter (version, created, last-tested, last-score)
- [ ] Brief 3: /test-template command scores templates against corpus, outputs scoreboard, appends history.jsonl
- [ ] Brief 4: /adversarial-template command generates attack cases, user approves corpus mutations
- [ ] Brief 5: /audit-report upgraded with trust modes, triage menu, template-aware fix workflow
- [ ] Brief 6: FIX SUMMARY block format baked into audit-report (11 fields)
- [ ] Brief 7: Session log + history.jsonl structure in place
- [ ] Brief 8: Smoke test — /test-template and /adversarial-template run end-to-end
- [ ] Brief 9: Final commit (user-approved)

## Session ID
2026-04-12-audit-evaluation-loop
