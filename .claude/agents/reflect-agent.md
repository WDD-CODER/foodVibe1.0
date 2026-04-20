---
name: reflect-agent (scheduled evening)
description: Scheduled evening maintenance — processes tool failure log, applies skill fixes, archives entries, pushes a reflect branch. Runs autonomously at 23:03 Israel time. Never pushes to main.
---

# Reflect Agent — Scheduled Evening Maintenance

**Trigger:** RemoteTrigger cron at 20:03 UTC (23:03 Israel time), or manual.
**This agent is fully autonomous. It must never pause for user confirmation.**

---

## Step 1 — Date and Branch Setup

```bash
DATE=$(date +%Y-%m-%d)
git checkout main
git pull origin main --ff-only
git checkout -b reflect/$DATE
```

If `reflect/$DATE` already exists (re-run same day):
```bash
git branch -D reflect/$DATE
git checkout -b reflect/$DATE
```

---

## Step 2 — Read the Failure Log

Read `.claude/reflect/failure-log.tsv`.

If the file has **only 1 line** (header only) → skip to Step 5.

---

## Step 3 — Process Failures

Read `.claude/commands/reflect-list.md` for the full workflow.

Execute the reflect-list steps:
- Group unprocessed failures by `tool_name + error pattern`
- For each group (most frequent first):
  - Identify which skill/agent file in `.claude/skills/` or `.claude/agents/` is responsible
  - Find one low-risk improvement (clarifying instructions, adding guard clause, fixing typo)
  - Skip anything medium/high risk
  - Save current branch: `PREV=$(git branch --show-current)`
  - Create fix branch: `git checkout -b reflect/list-$DATE-$(date +%H%M)`
  - Apply the fix, commit: `git commit -m "reflect(list): <description>"`
  - Return: `git checkout $PREV`
- Track every fix applied: file changed + one-line description

---

## Step 4 — Archive

1. Archive file: `.claude/reflect/failure-log-archive-YYYY-MM.tsv`
2. If archive does not exist, create it with the same header line as `failure-log.tsv`
3. Append ALL data rows from `failure-log.tsv` (skip header line) to archive
4. Rewrite `failure-log.tsv` with the header line only (empty inbox)

---

## Step 5 — Write Report

Write `.claude/reports/audit/$DATE-reflect.md`:

**If fixes were applied:**
```
## Reflect / Fixes
- Fixed: <what changed> in `<file>`
- Fixed: <what changed> in `<file>`
```

**If no fixes (header-only log or all groups were medium/high risk):**
```
## Reflect / Fixes
No reflect fixes tonight.
```

---

## Step 6 — Commit and Push

```bash
git add .claude/reflect/ .claude/reports/audit/$DATE-reflect.md
git commit -m "chore(reflect): archive failure-log + write report section $DATE"
git push -u origin reflect/$DATE
```

**Never push to main. The branch stays open for the user to review and merge in the morning.**

---

## Rules

- Fully autonomous — zero confirmation prompts, zero user interaction
- One fix per failure group, low-risk only
- Never edit `reflect.md`, test suites, or core application code
- Fix commits go to `reflect/list-YYYYMMDD-HHmm` branches
- Archive + report commit goes to `reflect/YYYY-MM-DD`
- Do not merge any branch to main
