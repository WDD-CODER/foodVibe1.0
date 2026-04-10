---
description: Display the latest nightly audit report summary
allowed-tools: Read, Glob, Bash
---

# Command: audit-report

Morning command to review the latest nightly audit results.

## Execution

1. **Find latest report:**
   ```
   Glob: .claude/reports/audit/*-nightly-audit.md
   ```
   Sort by filename (date-based), pick the most recent.

2. **If no report found:**
   ```
   No audit reports found. Run /nightly-audit to generate one.
   ```
   Stop.

3. **Read the report** and display the summary section to the terminal.

4. **Display format:**
   ```
   === Nightly Audit Report — YYYY-MM-DD ===

   | Category              | Found | Fixed | Flagged |
   |-----------------------|-------|-------|---------|
   | A - Hebrew strings    |     N |     0 |       N |
   | B - Shared components |     N |     0 |       N |
   | C - Styling           |     N |     N |       N |
   | D - Security          |     N |     0 |       N |
   | E - Dead code         |     N |     N |       N |
   | F - Angular drift     |     N |     N |       N |
   | TOTAL                 |     N |     N |       N |

   Auto-fixed: N items
   Flagged for review: N items

   Full report: .claude/reports/audit/YYYY-MM-DD-nightly-audit.md
   ```

5. **If flagged items exist**, also display the top 5 highest-severity flagged items:
   ```
   Top flagged items:
   1. [HIGH] src/app/.../file.ts:88 — localStorage stores 'authToken'
   2. [HIGH] src/app/.../file.html:15 — [innerHTML] binding
   3. [MED]  src/app/.../file.ts:22 — @Input() legacy decorator
   ...
   ```

6. **If the report is a FAILED report**, display the failure reason prominently:
   ```
   !!! AUDIT FAILED — YYYY-MM-DD !!!
   Step: [N]
   Reason: [error]
   Action: [what to do]
   ```

7. **Trend display** (if trend data exists in the report):
   ```
   7-day trend:
   04-03: 85 found, 12 fixed, 73 flagged
   04-04: 80 found, 10 fixed, 70 flagged (delta: -5)
   ...
   ```
