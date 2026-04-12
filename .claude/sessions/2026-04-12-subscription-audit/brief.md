## Goal
Scan all `.subscribe(` calls in `src/app/**/*.component.ts`, classify each using the DETECT filter from `.claude/fix-templates/manual-subscription.md`, and write a false-positive-sweep report to `.claude/reports/audit/subscription-audit.md`.

## Scope
- 16 component files matched by `src/app/**/*.component.ts`
- Output: `.claude/reports/audit/subscription-audit.md`
- Commit: `git add .claude/reports/audit/subscription-audit.md && git commit -m "audit(F3): subscription false-positive sweep"`

## Out of Scope
- Fixing any violations (report only — template forbids auto-fix)
- Files outside `*.component.ts`

## Success Criteria
- [ ] All subscriptions in 16 files classified (SAFE or VIOLATION)
- [ ] Report written to `.claude/reports/audit/subscription-audit.md`
- [ ] Committed with the prescribed message

## Session ID
2026-04-12-subscription-audit
