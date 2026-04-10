---
description: Autonomous nightly code audit — scans 6 violation categories, auto-fixes safe issues, flags the rest
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Command: nightly-audit

Run the full nightly code audit pipeline. This command is designed to run autonomously (via RemoteTrigger cron) or manually.

## Execution

1. **Load skill:** Read `.claude/skills/nightly-audit/SKILL.md` and follow all instructions exactly.

2. **Run pre-flight:** Determine today's date, set branch and report path variables.

3. **Execute Git Safety Protocol** (Steps 1–9 from the skill):
   - Verify clean working tree on main
   - Create `audit/YYYY-MM-DD` branch
   - Run all 6 scan categories (A through F)
   - Commit findings plan
   - Execute auto-fixes (Categories C, E, F only — per skill rules)
   - Commit fixes
   - Merge to main (fast-forward preferred)
   - Write final report from template
   - Commit report

4. **Terminal output** after completion:
   ```
   Nightly Audit — YYYY-MM-DD — COMPLETE

   | Category | Found | Fixed | Flagged |
   |----------|-------|-------|---------|
   | A - Hebrew    | N | 0 | N |
   | B - Shared    | N | 0 | N |
   | C - Styling   | N | N | N |
   | D - Security  | N | 0 | N |
   | E - Dead code | N | N | N |
   | F - Angular   | N | N | N |

   Report: .claude/reports/audit/YYYY-MM-DD-nightly-audit.md
   Run /audit-report to review details.
   ```

5. **Run retention cleanup:** Archive reports older than 30 days.

## Autonomous mode

When triggered by RemoteTrigger (cron), this command runs without user confirmation. All auto-fix rules have built-in safety limits — see the skill file for details.

## Manual mode

When run by a developer via `/nightly-audit`, the same pipeline executes. The developer can review the report immediately or wait until morning.
