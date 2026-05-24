---
description: Run the nightly codebase audit — scans 6 violation categories, auto-fixes safe items, commits results, writes report
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

# /nightly-audit

> **MANUAL-ONLY as of 2026-04-26. Cron schedule disabled.**
> **Reason:** token-budget management on Pro plan.

Run the full nightly audit pipeline.

## Step 1 — Load Skill

Read `.claude/skills/nightly-audit/SKILL.md` and follow it exactly.

## Step 2 — Execute Pipeline

Follow all 8 phases from the skill in order:
1. Phase 0: Prerequisites (verify clean tree on main)
2. Phase 1: Create audit branch
3. Phase 2: Scan all 6 categories (no file changes)
4. Phase 3: Write and commit findings plan
5. Phase 4: Execute auto-fixes and commit
6. Phase 5: Merge to main
7. Phase 6: Write and commit final report
8. Phase 7: Report retention cleanup

## Step 3 — Terminal Summary

After the report is written, output the Phase 8 terminal summary from the skill.

## Autonomous Mode

When invoked by RemoteTrigger (unattended):
- Do not ask for confirmation at any step
- Do not pause for user input
- If any phase fails, write the abort report and stop
- The report file is the source of truth — no other notification needed

## Manual Mode

When invoked by the developer:
- Same pipeline, same behavior
- The terminal summary serves as immediate feedback
- Run `/audit-report` afterward to review the full report
