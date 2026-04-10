## Goal
Build an autonomous nightly code audit system that runs at 02:00 Israel time, scans 6 violation categories, auto-fixes safe issues, flags the rest, and produces a morning report.

## Scope
- `.claude/skills/nightly-audit/SKILL.md` — core audit brain (new)
- `.claude/commands/nightly-audit.md` — slash command entry point (new)
- `.claude/commands/audit-report.md` — morning review command (new)
- `.claude/reports/audit/TEMPLATE.md` — report template (new)
- `RemoteTrigger` cron schedule — `57 22 * * *` UTC (new)

## Out of Scope
- No email notifications, no GitHub Actions, no nodemailer
- No techdebt integration (they stay separate)
- No modification of existing files

## Success Criteria
- [ ] `/nightly-audit` produces a report in `.claude/reports/audit/2026-04-10-nightly-audit.md`
- [ ] Git log shows 3 commits on `audit/2026-04-10` branch (plan, fix, report)
- [ ] Report summary table counts match known baselines
- [ ] `/audit-report` displays the report summary in terminal
- [ ] `RemoteTrigger list` shows scheduled job with correct cron
- [ ] No existing files were modified

## Session ID
2026-04-10-nightly-audit-system
