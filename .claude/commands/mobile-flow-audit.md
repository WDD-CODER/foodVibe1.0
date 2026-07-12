---
description: Walk 16 mobile flows at 375Ã—812 RTL, stress-test inputs, report layout breakage
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, Agent]
---

# /mobile-flow-audit [flags]

Invoke the Mobile flow audit persona to run the full mobile-flow audit.

## Arguments

- `--only <slug>` â€” run only the named flow
- `--skip <slug,slug>` â€” skip listed flows
- `--force-signup` â€” re-run signup flow even if credentials exist
- `$ARGUMENTS` â€” parsed as above

## Step 1 â€” Preflight

Run `/preflight` first. Abort if any check fails.

1. Check dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4200` must return `200`. If not â†’ abort with `"Dev server not running. Start with npm run dev:local."`
2. Check gstack binary: `ls ~/.claude/skills/gstack/browse/dist/browse`. If missing â†’ abort with `"gstack not installed."`
3. Set viewport: `B=~/.claude/skills/gstack/browse/dist/browse; $B viewport 375x812`
4. Ensure reports directory: `mkdir -p .claude/reports/mobile-audit`
5. Ensure `.gitignore` contains `.claude/reports/mobile-audit/.credentials.json` â€” if not, add it.

## Step 2 â€” Session setup

1. Read `.claude/reports/mobile-audit/.credentials.json`
2. If missing OR `--force-signup` â†’ set `RUN_SIGNUP=true`
3. If present â†’ set `RUN_SIGNUP=false`, store `{email, password}` as `CREDS`

## Step 3 â€” Load flow catalog

The flow catalog is the source of truth. Load it below and respect `--only` / `--skip` filters.

### Flow Catalog

| # | Slug | Route | Requires Auth | Key Interactions |
|---|------|-------|---------------|------------------|
| 1 | `signup` | auth-modal | No | Email, password (8+ chars, letter+number), confirm password |
| 2 | `login` | auth-modal | No | Stored creds |
| 3 | `dashboard` | `/dashboard` | No | Browse, scroll, screenshot all sections |
| 4 | `recipe-book-list` | `/recipe-book` | No | Open filters panel, search, click row actions (favorite, cook, edit, duplicate, delete) |
| 5 | `recipe-builder-new-prep` | `/recipe-builder` | Yes | Name (P1+P2), image upload, 15 ingredients (mixed reference + free text, P6), 10 workflow steps with labor+cook times (P6), 3 labels (P4), yield conversions, save |
| 6 | `recipe-builder-new-dish` | `/recipe-builder` | Yes | Name, image, 8 prep items across 3 categories (P6), serving portions, labels (P4), save |
| 7 | `recipe-builder-edit` | `/recipe-builder/edit/:id` | Yes | Open existing prep recipe, add 5 more ingredients, reorder steps, change yield unit (P4), save |
| 8 | `cook-view` | `/cook/:id` | No | Open existing recipe, change quantity, switch yield unit (P4), verify scaling UI |
| 9 | `inventory-add-product` | `/inventory/add` | Yes | Name (P1+P2), base unit (P4), category (add-new flow), allergens (multi-select P4), 2 purchase options, supplier (P4) |
| 10 | `inventory-edit-product` | `/inventory/edit/:id` | Yes | Open existing, add 3rd purchase option, change category |
| 11 | `suppliers-add` | `/suppliers/add` | Yes | Full supplier-form (P1, P3 in name field) |
| 12 | `equipment-add` | `/equipment/add` | Yes | Full equipment-form including scaling rules (P6) |
| 13 | `venues-add` | `/venues/add` | Yes | Full venue-form incl. infra items (P6) |
| 14 | `menu-intelligence-event` | `/menu-intelligence` | Yes | New event, add 2 sections, add 3 dishes, trigger Gemini generation |
| 15 | `metadata-manager-all-tabs` | `/metadata-manager` | No | Add one item in each tab: category, allergen, unit, preparation |
| 16 | `trash-restore` | `/trash` | Yes | View trashed item, restore it |

**Probe legend:**
P1 = 40-char Hebrew | P2 = 80-char Hebrew | P3 = Emoji+LTR in RTL | P4 = Two dropdowns open | P5 = Keyboard-open state | P6 = 20+ row list. P5 applies to any input field unless otherwise noted.

### Skip rules
- If flow #1 `signup` is in the skip set AND no creds exist â†’ abort with `"Cannot skip signup on first run."`
- If flow #2 `login` is in the skip set â†’ force-skip all auth-required flows and warn.

## Step 4 â€” Execute flows

### Dependency gate
Track `LOGIN_OK=true|false`. Initialize from credentials check.
After login flow runs, set `LOGIN_OK` based on result.
For each subsequent flow with `Requires Auth = Yes` in catalog:
- If `LOGIN_OK=false`: skip the flow, write stub `report.md` noting "blocked-by-prerequisite: login flow failed"
- If `LOGIN_OK=true`: proceed normally

For each flow in the filtered catalog:

### 4a â€” Prepare
1. Create folder: `mkdir -p .claude/reports/mobile-audit/<slug>/shots`
2. Clear old screenshots: `rm -f .claude/reports/mobile-audit/<slug>/shots/*.png`
3. Reset report.md scaffold:

```markdown
# <slug> â€” Mobile Flow Audit
Run: <ISO date>
Viewport: 375Ã—812 RTL
Severity counts: Critical <TBD> Â· Major <TBD> Â· Minor <TBD>

## Defects
```

### 4b â€” Spawn auditor subagent

Spawn fresh Agent (general-purpose) with prompt:
```
You are the Mobile flow audit.
Read this command file (agent retired — protocol is inline below / above) for full protocol.
Assigned flow:

  Slug: <slug>
  Route: <route>
  Interactions: <interactions>
  Probes to apply: <probe IDs>
  Credentials: <CREDS or "signup-mode">
  Output report: .claude/reports/mobile-audit/<slug>/report.md
  Output screenshots: .claude/reports/mobile-audit/<slug>/shots/

Use $B=~/.claude/skills/gstack/browse/dist/browse for browser ops.
Never modify src/, server/, or app code.
Return JSON summary on completion.
```

### 4c â€” Collect result
1. Parse the returned JSON summary
2. Append row to `.claude/reports/mobile-audit/INDEX.md` (overwrite matching row if already exists)

## Step 5 â€” Write INDEX.md

Format:

```markdown
# Mobile Audit Index
**Last full run:** <ISO date>
**Viewport:** 375Ã—812 RTL

| Flow | Last run | Critical | Major | Minor | Report |
|------|----------|----------|-------|-------|--------|
| signup | 2026-04-20 | 0 | 2 | 1 | [â†’](./signup/report.md) |
| ... | ... | ... | ... | ... | ... |
```

## Step 6 â€” Final summary

Print the Mobile flow audit's standard output block (from persona file).

## Rules
- Never commit. The user commits reports manually.
- Never fix anything found during the audit.
- If a flow fails mid-run (e.g. 500 error), record it as a **critical** defect in that flow's report and continue to the next flow.
- If the dev server dies mid-run, abort and tell the user.
