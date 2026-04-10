---
description: Display the latest nightly audit report — morning review command
allowed-tools: Read, Glob, Bash
---

# /audit-report

Display the latest nightly audit report for morning review.

## Usage

```
/audit-report              Show the latest report
/audit-report YYYY-MM-DD   Show report for a specific date
/audit-report --trend      Show trend summary from the last 7 audits
/audit-report --list       List all available report dates
```

## Step 1 — Find Report

**Default (no args):** Glob `.claude/reports/audit/*-nightly-audit.md`, sort by filename (date-based), pick the most recent.

**With date arg:** Read `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md` directly. If not found, check `archive/`.

**--list:** List all report filenames from both `audit/` and `audit/archive/`, sorted by date.

If no reports found: output `"No audit reports found. Run /nightly-audit first."`

## Step 2 — Display

**Default and date mode:** Read the full report file and output its contents to terminal.

**--trend mode:** Read the last 7 reports, extract only the Summary table from each, and display them side by side with direction arrows showing improvement/regression.

## Step 3 — Suggest Next Actions

After displaying, suggest:
- If flagged items > 0: `"You have N items flagged for manual review. Check the 'Flagged for Manual Review' section above."`
- If security flags > 0: `"⚠ N security flags found — review these first."`
- `"To re-run the audit now: /nightly-audit"`
