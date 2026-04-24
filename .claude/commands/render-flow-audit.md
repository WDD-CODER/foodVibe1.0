---
description: Walk N flows on the live Render deployment at desktop viewport. Report functional breakage, API errors, false validations.
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, Agent]
---

# /render-flow-audit [flags]

Invoke the Render Flow Auditor persona to run the full render-flow audit against the live deployment.

## Arguments

- `--only <slug>` — run only the named flow
- `--skip <slug,slug>` — skip listed flows
- `--force-signup` — re-run signup flow even if credentials exist
- `--include-gemini` — include the `menu-intelligence-event` flow (default: skipped to protect Gemini quota)
- `$ARGUMENTS` — parsed as above

## Step 1 — Preflight

1. Probe Render URL with cold-start tolerance:
   ```bash
   for i in $(seq 1 12); do
     code=$(curl -s -o /dev/null -w "%{http_code}" https://foodvibe.onrender.com)
     if [ "$code" = "200" ]; then break; fi
     sleep 5
   done
   # if $code != 200 after 60s → abort "Render service unreachable (cold start exceeded 60s or service down)"
   ```
2. Check gstack binary: `ls ~/.claude/skills/gstack/browse/dist/browse`. If missing → abort with `"gstack not installed."`
3. Set viewport: `B=~/.claude/skills/gstack/browse/dist/browse; $B viewport 1366x768`
4. Ensure reports directory: `mkdir -p .claude/reports/render-audit`
5. Ensure `.gitignore` contains `.claude/reports/render-audit/.credentials.json` — if not, add it.

## Step 2 — Session setup

1. Read `.claude/reports/render-audit/.credentials.json`
2. If missing OR `--force-signup` → set `RUN_SIGNUP=true`
3. If present → set `RUN_SIGNUP=false`, store `{email, password}` as `CREDS`
4. Signup email pattern if needed: `renderaudit+<YYYYMMDD>@foodvibe.test`

## Step 3 — Load flow catalog

The flow catalog is the source of truth. Load it below and respect `--only` / `--skip` / `--include-gemini` filters.

### Flow Catalog

| # | Slug | Route | Requires Auth | Key Interactions | Probes |
|---|------|-------|---------------|------------------|--------|
| 1 | `signup` | auth-modal | No | Email (renderaudit pattern), password (8+ chars, letter+number), confirm password | F5, F6 |
| 2 | `login` | auth-modal | No | Stored creds | F5, F6 |
| 3 | `dashboard` | `/dashboard` | No | Browse, scroll, screenshot all sections | F5, F6 |
| 4 | `recipe-book-list` | `/recipe-book` | No | Open filters panel, search, click row actions (favorite, cook, edit, duplicate, delete) | F4, F5, F6 |
| 5 | `recipe-builder-new-prep` | `/recipe-builder` | Yes | Name, 15 ingredients (mixed reference + free text), 10 workflow steps with labor+cook times, 3 labels, yield conversions, save | F1, F5, F6 |
| 6 | `recipe-builder-new-dish` | `/recipe-builder` | Yes | Name, 8 prep items across 3 categories, serving portions, labels, save | F1, F5, F6 |
| 7 | `recipe-builder-edit` | `/recipe-builder/edit/:id` | Yes | Open existing prep recipe, add 5 more ingredients, reorder steps, change yield unit, save. **F2 is MANDATORY — must reproduce or confirm fixed the duplicate-name-on-edit bug reported 2026-04-23.** | F1, F2, F5, F6 |
| 8 | `cook-view` | `/cook/:id` | No | Open existing recipe, change quantity, switch yield unit, verify scaling UI | F5, F6 |
| 9 | `inventory-add-product` | `/inventory/add` | Yes | Name, base unit, category (add-new flow), allergens (multi-select), 2 purchase options, supplier, save | F1, F5, F6 |
| 10 | `inventory-edit-product` | `/inventory/edit/:id` | Yes | Open existing, add 3rd purchase option, change category | F1, F2, F5, F6 |
| 11 | `suppliers-add` | `/suppliers/add` | Yes | Full supplier-form, save | F1, F5, F6 |
| 12 | `equipment-add` | `/equipment/add` | Yes | Full equipment-form including scaling rules, save | F1, F5, F6 |
| 13 | `venues-add` | `/venues/add` | Yes | Full venue-form incl. infra items, save | F1, F5, F6 |
| 14 | `menu-intelligence-event` | `/menu-intelligence` | Yes | New event, add 2 sections, add 3 dishes, trigger Gemini generation (**opt-in via --include-gemini**) | F1, F5, F6 |
| 15 | `metadata-manager-all-tabs` | `/metadata-manager` | No | Add one item in each tab: category, allergen, unit, preparation | F1, F5, F6 |
| 16 | `trash-restore` | `/trash` | Yes | View trashed item, restore it, verify restored item appears in source list | F4, F5, F6 |

**Probe legend:**
F1 = Persist round-trip (save → hard-reload → verify) | F2 = Update-without-change (open → save unchanged → no false validator) | F3 = Logout/login continuity | F4 = Soft-delete correctness (delete → trash → restore) | F5 = API error capture (network log after every save/delete) | F6 = Console error capture (console log after every state change)

### Skip rules
- If flow #1 `signup` is in the skip set AND no creds exist → abort with `"Cannot skip signup on first run."`
- If flow #2 `login` is in the skip set → force-skip all auth-required flows and warn.
- Flow #14 `menu-intelligence-event` is skipped by default unless `--include-gemini` is passed.

## Step 4 — Execute flows

For each flow in the filtered catalog:

### 4a — Prepare
1. Create folder: `mkdir -p .claude/reports/render-audit/<slug>/shots`
2. Clear old screenshots: `rm -f .claude/reports/render-audit/<slug>/shots/*.png`
3. Reset report.md scaffold:

```markdown
# <slug> — Render Flow Audit
Run: <ISO date>
Target: https://foodvibe.onrender.com
Viewport: 1366×768
Severity counts: Critical <TBD> · Major <TBD> · Minor <TBD>
API errors: <TBD> · Console errors: <TBD>

## Defects
```

### 4b — Spawn auditor subagent

Spawn a fresh Agent (general-purpose) with this prompt:

```
You are the Render Flow Auditor (.claude/agents/render-flow-auditor.md).

## Assigned Flow
Slug: <slug>
Route: <route>
Key interactions: <interactions>
Probes to apply: <probe list>
Credentials: <CREDS or "signup-mode">

## Your Task
1. Set viewport 1366x768 via $B viewport 1366x768
2. If flow is signup/login: perform auth actions, save creds on success (email: renderaudit+<YYYYMMDD>@foodvibe.test)
3. Navigate to https://foodvibe.onrender.com<route>
4. Execute the interactions with assigned F-probes
5. After every save/delete: run $B network — flag 4xx/5xx (exclude expected recipe→dish resolver 404s)
6. After every state change: run $B console — flag exceptions and unhandled rejections
7. Screenshot every state into .claude/reports/render-audit/<slug>/shots/NN-<state>.png (NN = zero-padded order)
8. Write .claude/reports/render-audit/<slug>/report.md (overwrite) with:
   - Metadata header (run date, target URL, viewport, counts)
   - Defect entries: ### [severity] <element> — <summary>
     - Screenshot: ./shots/NN-<state>.png
     - Selector: <from $B snapshot -i>
     - Description: what breaks, in one sentence
     - Steps to reproduce: numbered list
     - Network log excerpt: (if F5 triggered)
     - Console log excerpt: (if F6 triggered)

Return a JSON summary: {"slug":"...","critical":N,"major":N,"minor":N,"apiErrors":N,"consoleErrors":N,"screenshots":N}

Use $B=~/.claude/skills/gstack/browse/dist/browse for all browser operations.
Target: https://foodvibe.onrender.com — never localhost.
Never modify src/, server/, or any app code.
Never retry on auth-state-mutating failures — a failed save is evidence.
```

### 4c — Collect result
1. Parse the returned JSON summary
2. Append row to `.claude/reports/render-audit/INDEX.md` (overwrite matching row if already exists)

## Step 5 — Write INDEX.md

Format:

```markdown
# Render Audit Index
**Last full run:** <ISO date>
**Target:** https://foodvibe.onrender.com
**Viewport:** 1366×768

| Flow | Last run | Critical | Major | Minor | API errs | Console errs | Report |
|------|----------|----------|-------|-------|----------|--------------|--------|
| signup | 2026-04-24 | 0 | 0 | 1 | 0 | 0 | [→](./signup/report.md) |
| ... | ... | ... | ... | ... | ... | ... | ... |
```

## Step 6 — Final summary

Print the Render Flow Auditor's standard output block (from persona file).

## Rules
- Never commit. The user commits reports manually.
- Never fix anything found during the audit.
- Never touch app code (`src/`, `server/`).
- If a flow fails mid-run (e.g. 500 error), record it as a **critical** defect in that flow's report and continue to the next flow.
- If cold start exceeds 60s, abort — do not mask a dead service as a passed audit.
- Never signup with a real user email. Always use `renderaudit+<YYYYMMDD>@foodvibe.test`.
- Never use localhost or the dev server — always `https://foodvibe.onrender.com`.
