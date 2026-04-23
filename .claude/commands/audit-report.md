---
description: Display the latest nightly audit report — morning review command with evaluation loop
allowed-tools: Read, Glob, Bash, Agent, Edit, Write, Skill
---

# /audit-report

Morning review command. Displays last night's audit report, then enters an interactive
evaluation loop for working through flagged items with measured template verification.

## Usage

```
/audit-report              Interactive morning loop (default)
/audit-report YYYY-MM-DD   Show report for a specific date (no loop)
/audit-report --trend      Show trend summary from the last 7 audits (no loop)
/audit-report --list       List all available report dates (no loop)
```

`--list`, `--trend`, and date-arg modes are **display-only** — they show data and exit.
The interactive loop only runs in default (no-arg) mode.

---

## Display-Only Modes

### --list
List all report filenames from `.claude/reports/audit/` and `.claude/reports/audit/archive/`, sorted by date.

### --trend
Read the last 7 reports, extract the Summary table from each, display side by side with direction arrows.

### YYYY-MM-DD
Read `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`. If not found, check `archive/`. Display and exit.

If no reports found in any mode: `"No audit reports found. Run /nightly-audit first."`

---

## Interactive Morning Loop (default mode)

### Phase 0 — Discover Pending Branches

1. Get today's date `YYYY-MM-DD` and yesterday's date `YYYY-MM-DD` (both, since jobs may run just after midnight).
2. Run:
   ```bash
   git fetch origin
   git branch -a
   ```
3. Find the most recent `audit/YYYY-MM-DD` or `audit/YYYY-MM-DD-1` branch → store as `AUDIT_BRANCH`.
4. Find the most recent `reflect/YYYY-MM-DD` or `reflect/YYYY-MM-DD-1` branch → store as `REFLECT_BRANCH`.

---

### Phase 1 — Display report

1. Read the audit report:
   - If `AUDIT_BRANCH` is set → `git show $AUDIT_BRANCH:.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`
   - Otherwise → glob `.claude/reports/audit/*-nightly-audit.md` on current branch, pick most recent

2. Read the reflect report (if available):
   - If `REFLECT_BRANCH` is set → `git show $REFLECT_BRANCH:.claude/reports/audit/YYYY-MM-DD-reflect.md`
   - Otherwise → check `.claude/reports/audit/YYYY-MM-DD-reflect.md` on current branch

3. Display the full audit report, then append the reflect section directly below it.

4. End the display with a **Pending Branches** box:
   ```
   ┌─ PENDING BRANCHES ─────────────────────────────────────────────┐
   │ These branches were created by last night's scheduled jobs.    │
   │ Review above, then merge what you want to keep:                │
   │                                                                │
   │  audit/YYYY-MM-DD    →  git merge audit/YYYY-MM-DD            │
   │  reflect/YYYY-MM-DD  →  git merge reflect/YYYY-MM-DD          │
   └────────────────────────────────────────────────────────────────┘
   ```
   Show only lines for branches that actually exist. If neither exists, omit the box.

### Phase 2 — Trust mode

Immediately after displaying the report:

```
Trust mode for this session? [strict / normal / auto] (default: strict)
  strict  — pause before every /test-template AND /adversarial-template
  normal  — /test-template runs freely, pause before /adversarial-template
  auto    — both run freely, pause only at ship/edit/skip gate
```

Wait for user input. Enter with no text → `strict`. Store as `TRUST_MODE`.
User can change mid-session by saying "switch to normal" (or strict/auto) — note the change in the session log.

### Phase 3 — 7-day drift summary

Scan `.claude/fix-templates/tests/history.jsonl` (if it exists) for entries from the last 7 days.
Also scan `.claude/reports/audit-sessions/*.md` for session logs from the last 7 days.

Surface anything that **changed**:
- Templates tested: `"color-token tested 3 times this week, scores: 6/6, 6/6, 5/6"`
- Templates edited but not re-tested: `"manual-subscription bumped to v2 on 04-10, not tested since"`
- Adversarial cases added: `"2 adversarial cases added to color-token corpus"`
- Score regressions: `"color-token dropped from 6/6 to 5/6 on 04-11"`
- Rollbacks: `"1 adversarial rollback on color-token (04-11)"`

If nothing changed: `"No template activity in the last 7 days."`

### Phase 4 — Open findings

Read `.claude/fix-templates/findings.md` (if it exists). Extract entries with `Status: open`.

If any exist:
```
┌─ OPEN FINDINGS ────────────────────────────────────────┐
│ 1. color-token DETECT gap (box-shadow) — 2026-04-12    │
│ 2. ...                                                 │
└────────────────────────────────────────────────────────┘
```

If none or file missing → skip silently.

### Phase 5 — Triage menu

1. Parse the report's "Flagged for Manual Review" section (or equivalent flagged-item section)
2. Each flagged item has a category identifier from the nightly audit
3. Group by category, count items per category
4. For each category, check if a fix template exists: glob `.claude/fix-templates/*.md`, read frontmatter, match `category:` field against the category. If matched, show template version. Also check if `version` != `last-tested-version` (stale marker).

```
┌─ TRIAGE MENU ──────────────────────────────────────────────────┐
│ #  │ Category                        │ Items │ Template        │
│────│─────────────────────────────────│───────│─────────────────│
│ 1  │ C — Theme & Styling Violations  │ 12    │ v1 ✅            │
│ 2  │ F3 — Manual Subscriptions       │ 3     │ v1 ⚠ untested   │
│ 3  │ A — Hebrew String Violations    │ 7     │ none            │
│ 4  │ E1 — Unused Imports             │ 2     │ none            │
│────│─────────────────────────────────│───────│─────────────────│
│ Pick: "1" or "all" or "1,3" or "skip"                          │
└────────────────────────────────────────────────────────────────┘
```

Template column values:
- `v<N> ✅` — template exists, last-tested-version matches current version
- `v<N> ⚠ untested` — template exists but version != last-tested-version
- `none` — no template for this category

Wait for user pick.

### Phase 6 — Initialize session log

**Before processing any items**, create the session log file:

File: `.claude/reports/audit-sessions/YYYY-MM-DD-audit-session.md`

Write the header immediately:

```markdown
# Audit Session — YYYY-MM-DD

Trust mode: <TRUST_MODE>
Started: HH:MM

## Drift summary
<verbatim drift output from Phase 3>

## Findings surfaced
<verbatim findings from Phase 4, or "None">

## Triage menu shown
<verbatim menu from Phase 5>

## User pick
<what the user chose>

## Fixes
<!-- Appended incrementally as each item is processed -->
```

This file is now on disk. Every subsequent FIX SUMMARY gets **appended** to this file as it happens.

### Phase 7 — Process items

For each flagged item the user chose to work on:

#### Path A — Template exists for this category

**Step 1: Template health check**

Per trust mode:
- `strict` → print `"About to run /test-template <slug>. Proceed? [y/n]"` → wait
- `normal` or `auto` → run /test-template directly

Run `/test-template <slug>` (via Skill tool).

**Step 2: Evaluate template health**

If ALL cases pass → proceed to Step 3.

If template has failing cases → print:

```
⚠ Template <slug> v<N> has <X> failing case(s): <list>.
The fix this template would suggest may not be trustworthy.

Options:
  [skip this item]      — recommended, come back after template fix
  [fix template first]  — pause this item, work on the template now
  [override]            — apply the template's fix anyway, you take
                          responsibility (logged in FIX SUMMARY Risk
                          field as "high — template has known gaps")
```

Wait for user decision.
- `skip this item` → append skip note to session log, move to next item
- `fix template first` → pause the item queue, enter template editing subflow (user edits the template, re-runs /test-template until satisfied, then resumes the queue)
- `override` → proceed to Step 3, but auto-set Risk to `"high — template has known gaps (user override)"`

**Step 3: Propose fix**

1. Read the flagged item's source file + surrounding context
2. Apply the template's DECIDE logic to determine the correct path
3. Apply the template's FIX logic for that path
4. Make the edit to the actual codebase file

**Step 4: FIX SUMMARY**

Print the FIX SUMMARY block (see FIX SUMMARY Format section below).
**Append the same block to the session log file** immediately.

Wait for user decision: `[ship] [edit] [skip] [explain more]`
- `ship` → keep the change, note "Decision: ship" in session log, move to next item
- `edit` → user provides modification, re-apply, re-print FIX SUMMARY, re-prompt
- `skip` → revert the file change (`git checkout -- <file>`), note "Decision: skip" in session log, move to next item
- `explain more` → explain reasoning in detail, then re-prompt ship/edit/skip

#### Path B — No template, user picks category

Print:
```
No fix template for category <X>. Options:
  [ad-hoc fix]              — fix this item without a template
  [build template together] — create a template for this category first
  [skip]                    — move on
```

**Ad-hoc fix:**
1. Read the flagged item's file + context
2. Propose fix based on general knowledge
3. Print FIX SUMMARY with `Template: none`
4. Same ship/edit/skip gate
5. Append to session log

**Build template together:**
1. Read all flagged items in this category to understand the pattern
2. Walk through fix template schema interactively:
   - PROBLEM → DETECT → SCOPE → DECIDE → FIX → EXAMPLES → SAFETY
   - Each section: propose draft, user approves/edits, move to next
3. Save to `.claude/fix-templates/<new-slug>.md` with version 1 frontmatter + version bump comment
4. Create fixture cases — **minimum viable corpus**:
   - At least 1 case per defined path in the DECIDE tree
   - At least 1 case NOT derived from the flagged items that inspired the template (pulled from a different file or manually constructed edge case)
   - At least 1 case targeting the path the user is least confident about
5. If minimum corpus achieved → run `/test-template <slug>`
6. If minimum corpus NOT achievable in the moment → save template with `last-tested: null` and append to session log: `"Template <slug> created but corpus is too thin for meaningful first test. Run /adversarial-template before relying on it."`
7. Return to triage — category now has a template

**Skip:** Note in session log, move on.

### Phase 8 — Session end

When the user finishes (says "done", runs out of items, or exits):

1. Append the closing section to the session log:

```markdown
## Templates touched
- color-token: v1 → v2 (added box-shadow handling)
- <or "None">

## Session summary
Items reviewed: N | shipped: X | edited: Y | skipped: Z
Ended: HH:MM

## Commits
<!-- Filled after commit -->
```

2. Show `git status` + `git diff --stat`
3. Propose a single commit message for all session changes
4. **Wait for explicit user approval** before committing
5. After commit, append the commit SHA to the session log's `## Commits` section
6. **Archive the report** — move the active report so it is never shown again.
   Run each sub-step as a **separate tool call** — never chain into one Bash call:
   - **Pre-flight:** Print `"Archiving: <path> — exists? <yes/no>"` before touching anything
   - **Write archive copy:** Prepend `## Status: RESOLVED — YYYY-MM-DD\nSession complete.\n\n` and write to `.claude/reports/audit/archive/YYYY-MM-DD-nightly-audit.md` (create `archive/` if absent)
   - **Verify write:** Confirm archive file exists before proceeding — stop and report if not
   - **Delete original:** Remove `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md` as its own Bash call
   - **Verify delete:** Confirm original is gone — if still present, report to user and stop

---

## FIX SUMMARY Format

Every fix attempt produces this block in chat AND appended to the session log:

```
┌─ FIX SUMMARY ──────────────────────────────────────────┐
│ Item:      <file:line, what>                           │
│ Category:  <letter + name>                             │
│ Template:  <slug v<N>> or "none"                       │
│                                                        │
│ Problem:   <one line>                                  │
│ First try: <what agent attempted>                      │
│ Failed:    <why, or "n/a — first try worked">          │
│ Fix:       <what actually worked>                      │
│ Verified:  <test results, scores>                      │
│                                                        │
│ Risk:      <low/medium/high + one-line why>            │
│ Rollback:  <exact git command>                         │
│ Decision:  [ship] [edit] [skip] [explain more]         │
└────────────────────────────────────────────────────────┘
```

Eleven fields, always in this order, even if some are "n/a".

**Risk field auto-fill rules:**
- Template override used → `"high — template has known gaps (user override)"`
- No template → `"medium — no template guidance, ad-hoc fix"`
- Template passes all cases → `"low — template-guided, all tests passing"`

---

## Rules

- **Never commit without explicit user approval** — one commit at session end
- **Session log is incremental** — header written at Phase 6, FIX SUMMARY blocks appended as they happen, closing section at Phase 8. Crash-safe: everything up to the last completed item is on disk.
- **history.jsonl is append-only** — /test-template handles its own writes
- **Trust mode governs pause points** — strict pauses most, auto pauses least, but adversarial corpus mutations ALWAYS pause regardless of mode
- **Triage menu is dynamic** — generated from the report, not hardcoded categories
- **Template health check before every fix** — failing templates trigger the override gate, not silent application
- **findings.md is surfaced every session** — open items don't get forgotten

### Resilience rules for destructive operations

These rules exist because a swallowed Bash tool result can silently block an entire execution chain. Short atomic steps make failures immediately visible.

- **One action per Bash call** — never chain delete + verify + write into one command. Each is its own call. A failure on step 1 doesn't silently skip steps 2–4.
- **Pre-flight before destructive ops** — before any delete or overwrite, print the file's current on-disk state (`exists / missing`). If the agent can read the state, the user can see exactly where it stopped.
- **Verify after every destructive step** — after `rm` or overwrite, confirm the result in a separate call before proceeding. If verification fails, stop and report — do not continue to the next step.
- **Prefer `python3 -c "os.remove(...)"` over `rm`** — the `rm` command is not available in the bash environment on this project; Python's `os.remove()` is the reliable cross-platform delete.
