# Orchestrator run mod-invoices-srv

Run branch: `orch/mod-invoices-srv` (from `origin/main` at 65e510e) · started 2026-11-18T08:57:22.121Z · finished 2026-11-18T10:24:58.253Z
Result: 3 merged, 0 parked, skipped or left out, 3 in the run (counted from git and status.json).
`main` untouched: yes (2 plan/todo file(s) changed on main) — origin/main is dede1a1.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 625 Keep every approved invoice and every price change when prices are applied | merged | 1 | build | 81cd2b9 |  |
| 626 Read a supplier invoice with its header, from a photo or a PDF, and keep the file | merged | 0 | build | 23169d4 |  |
| 627 Remember which product each printed invoice name means, for the business and for everyone | merged | 1 | build | e502177 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-18T08:57:22.121Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 625 · none · behaviour: invalid and duplicate rows also get an outcome, so their stored invoice line carries their own positive price or null — reverse: drop the price from those outcomes in product-import.js
- D2 · 625 · none · behaviour: confirmAiDraft's own 2-decimal rounding applies to keptRatio; invoiceKeptRatio itself rounds to 4 decimals — reverse: change the rounding in server/services/ai-drafts.js (out of scope)
- D3 · 625 · none · behaviour: docs/brain/component-families.md and docs/brain/inventory.md are outside the plan's scope block but I edited them, because the finding needs a registry row. I did not add them to the scope block. scope-check does not list them as out. The paths it lists are .claude/todo.md, plans/638-…, and files under Claude outputs/, none of which this fix touched — reverse: drop t
- D4 · 625 · none · behaviour: the second Reuse Check row now names only `invoiceApplyInputSchema`, because the check takes the whole row text as one piece name and could not match the longer text — reverse: restore the original row text
- D5 · 626 · none · behaviour: the apply's supplier taxId step runs only when the invoice record was written (invoiceOk) — reverse: drop `invoiceOk &&` in server/routes/product-import.js
- D6 · 627 · none · behaviour: also filled the second forgetBusiness placeholder in deleteBusinessServerData (private business), which plans 618/619 left naming 627 — reverse: delete that one require line in server/services/business.js
- D7 · 627 · none · seen: scripts/reuse-lint.mjs --check-registry reports old missing-path entries in docs/brain/component-families.md (lines 197, 314, 354). They are not from this plan.

## Run notes

- 625: the folder foodVibe1.0-orch-mod-invoices-srv-625 was installed (root, scripts, server)
- 625: the folder foodVibe1.0-orch-merge-mod-invoices-srv was installed (root, scripts, server)
- 626: the folder foodVibe1.0-orch-mod-invoices-srv-626 was installed (root, scripts, server)
- 627: the folder foodVibe1.0-orch-mod-invoices-srv-627 was installed (root, scripts, server)

## Models per agent

- 625 builder: sonnet
- 625 builder fix: sonnet
- 625 reviewer: sonnet
- 626 builder: sonnet
- 626 reviewer: sonnet
- 627 builder: sonnet
- 627 builder fix: sonnet
- 627 reviewer: sonnet

## What only the Human can do

- nothing to validate

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/mod-invoices-srv --title "Orchestrator run mod-invoices-srv" --body-file .claude\orchestrator-runs\mod-invoices-srv.md
```

Context added by learning: 3.5k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 1 → 1.17 → 0.67 · parked 0 → 1 → 0
