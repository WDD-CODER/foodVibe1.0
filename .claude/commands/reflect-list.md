---
description: Review and fix issues from the tool failure log
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# /reflect-list

Batch reflection processor — reads the tool failure log, groups failures by pattern,
and applies one low-risk skill improvement per group. Sequential, one at a time.

## When to Run

- **On demand**: User types `/reflect-list`
- **Scheduled**: Evening cron triggers this as step 1 of the daily maintenance job

## Steps

### Step 1 — Read the Log

Read `.claude/reflect/failure-log.tsv`. If the file doesn't exist or has no unprocessed rows (empty `processed` column), print:
```
[reflect-list] No unprocessed failures. Nothing to do.
```
Exit.

### Step 2 — Group Failures

Group unprocessed rows by `tool_name + error pattern similarity`. For each group:
- Count occurrences
- Note the most recent timestamp
- Identify the common error snippet

Sort groups by frequency (most common first). Print a summary table:
```
╔══════════════════════════════════════════════════════════╗
║  FAILURE LOG REVIEW                                      ║
║  Unprocessed entries: <N>                                ║
║  Unique groups: <G>                                      ║
╚══════════════════════════════════════════════════════════╝

| # | Tool | Pattern | Count | Last Seen |
|---|------|---------|-------|-----------|
| 1 | Bash | Build failed: NG0... | 4 | 2026-04-10 |
| 2 | Edit | old_string not found | 2 | 2026-04-10 |
```

### Step 3 — Process Each Group

For each group (most frequent first):

**a. Identify the responsible skill or agent:**
- Read the `input_summary` values to determine which skill was active
- Search `.claude/skills/` and `.claude/agents/` for the relevant file
- If no specific skill is identifiable (e.g., generic Bash errors), skip with note

**b. Analyze the skill file:**
- Read it
- Identify what instruction or pattern led to this class of failure
- Determine if a low-risk improvement exists:
  - **Low risk**: Clarifying existing instructions, adding a guard clause, fixing a typo
  - **Medium/High risk**: Changing logic, reordering phases, altering core behavior → SKIP

**c. Apply the fix (low-risk only):**
- Save the current branch: `PREV_BRANCH=$(git branch --show-current)`
- Create branch: `git checkout -b reflect/list-$(date +%Y%m%d-%H%M)`
- Apply the edit to the skill/agent file
- Commit: `git commit -m "reflect(list): <short description>"`

**d. Print the result:**
```
[reflect-list] Group 1/N: <tool> — <pattern>
  Skill: .claude/skills/<name>/SKILL.md
  Fix: <one-line description>
  Risk: low
  ---
  <git diff output>
  ---
  ✓ Applied and committed on reflect/list-<timestamp>
```

**e. Mark rows processed:**
Update the `processed` column for all rows in this group to `yes`

**f. Return to previous branch:**
`git checkout $PREV_BRANCH`

### Step 4 — Summary

```
[reflect-list] Complete.
  Groups: <G> total
  Applied: <K> fixes
  Skipped: <S> (no actionable improvement or medium/high risk)
  Branches: reflect/list-<timestamps> (ready for review/merge)
```

## Rules

- **One fix per group** — don't try to fix everything at once
- **Low-risk only** — skip anything that changes core behavior
- **Never edit reflect.md itself** — that's the evaluator, not the subject
- **Never edit test suites** — those are the ground truth
- **Always create a branch** — never commit to the current working branch
- **Always print diffs** — the user (or scheduled cron log) should see exactly what changed
