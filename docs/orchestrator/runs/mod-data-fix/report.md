# Orchestrator run mod-data-fix

Run branch: `orch/mod-data-fix` (from `origin/main` at b783f23) · started 2026-11-19T19:42:52.702Z · finished 2026-11-19T21:01:46.306Z
Result: 2 merged, 0 parked, skipped or left out, 2 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is b783f23.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 648 Stock count: no duplicate products, a reachable "save draft", and voice counting for any number of products | merged | 0 | build | d1a3cbb |  |
| 649 A product's supplier always resolves to a supplier of its own business: no ids on screen, no failed save | merged | 1 | build | 2495b21 |  |

## Scorecard

- Wall: 78 min · gate passes: 2 · asks raised mid-run: 0
- Minutes per state (summed over plans): building 43.1 · gate 17 · fixing 11.5 · merging 1.9 · checking 0.7
- Checks left out (cached, skipped, not run, same tree): 0, about 0 min saved

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-19T19:42:52.702Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 648 · none · behaviour: a failure creating the unique index at startup (a business that still has doubles) is logged as a warning, not fatal — reverse: let the error propagate in server/db.js
- D2 · 648 · none · behaviour: the dedupe hard-deletes a loser that has the same _masterId as the kept copy, because the unique index allows one per business; a same-name copy with another origin still goes to the Trash as in plan 485 — reverse: trash both kinds in dedupe-business-products.js
- D3 · 648 · none · behaviour: a spoken line with an empty name is dropped, not listed as unmatched (unchanged from before) — reverse: push it to unmatched in cleanStockLines
- D4 · 648 · none · behaviour: an ambiguous spoken name returns unmatched with a new optional `candidates` field; the screen does not use it yet — reverse: drop `candidates` from the schema and cleanStockLines
- D5 · 648 · none · behaviour: the HTTP 413 branch in stock-ai-draft is removed, so a 413 now shows the general stk_ai_failed message — reverse: restore the branch
- D6 · 648 · none · behaviour: the dictionary key stk_ai_too_many_products stays unused, because dictionary.json is append-only — reverse: delete the key
- D7 · 648 · none · seen: docs/modules/modules-map.md:592 still says the product list is sent to the model and describes the 413 cap (out of scope)
- D8 · 648 · none · seen: server/test/ai-logistics-extract.test.js 'writes one usage row, one pending draft…' failed once in the full test:server run and passed alone and on the rerun (timing under load)
- D9 · 649 · none · behaviour: in sync Rule 2 a master source with no supplier is now added once instead of on every sync (cleared sources have no supplier, so repeats would pile up) — reverse: restore the old `!s.supplierId ||` filter in sync-master.js
- D10 · 649 · none · behaviour: the repair script lists a source with an empty supplier and leaves it unchanged (nothing to map it to) — reverse: add a fix rule for empty sources in planProductRepair
- D11 · 649 · none · behaviour: when a repair target supplier is already on the same product, the source is cleared instead of mapped, so the product gets no duplicate supplier and no price is dropped — reverse: map it and merge the sources
- D12 · 649 · none · behaviour: the form and list keep an unknown supplier id on a source and only change the label; the plan said cleared or kept — reverse: clear unknown ids in buildSources
- D13 · 649 · none · seen: HeaderComponent 'above the route-loading overlay (plan 645)' fails in test:ci at src/app/core/components/header/header.component.spec.ts:457 (ran twice, same result); a headless-environment cause is probable but not verified
- D14 · 649 · none · seen: the exact check that makes a product save fail on an unknown supplier was not found in the browser form or in the server PUT path, so the failure may come from elsewhere (check the live error); the form save with such a source is now covered by a passing spec
- D15 · 649 · none · seen: generic.js has no admin shared-create path for products (`shared` applies to taxonomy only), so the mapping covers push-to-master, the one route that writes products to master
- D16 · 649 · none · seen: src/app/core/components/header/header.component.spec.ts:457 — the plan 645 avatar-click spec failed twice in the earlier round and passed this round. It looks flaky or dependent on the headless window.

## Run notes

- 648: the folder foodVibe1.0-orch-mod-data-fix-648 was installed (root, scripts, server)
- 648: builder left undone (round 0): 648-1 [ui]: written, not run
- 648: the folder foodVibe1.0-orch-merge-mod-data-fix was installed (root, scripts, server)
- 649: the folder foodVibe1.0-orch-mod-data-fix-649 was installed (root, scripts, server)
- 649: builder left undone (round 0): pnpm run test:ci: one failure, HeaderComponent plan 645 avatar-click spec (header.component.spec.ts:457); not caused by this plan and not fixable in scope. It failed again on the rerun, so it is not a one-off flake; whether it also fails on the run branch was not checked.; [human] repair run on loca
- FINAL: same tree as plan 649's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, pnpm run test:ci, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch
- make this a default? the dedupe hard-deletes a loser that has the same _masterId as the kept copy, because the unique index allows one per business; a same-name copy with another origin still goes to the Trash as in plan  (trigger: destructive-action) — reply: default yes run-destructive-action

## Models per agent

- 648 builder: sonnet
- 648 reviewer: sonnet
- 649 builder: sonnet
- 649 builder fix: sonnet
- 649 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 648 Stock count: no duplicate products, a reachable "save draft", and voice counting for any number of products: Dandan runs the dedupe with `--write` on the local database, reloads: each product shows once in the count
2. 649 A product's supplier always resolves to a supplier of its own business: no ids on screen, no failed save: Dandan runs `node server/scripts/repair-supplier-refs.js --target=local` (dry run), reads the list, runs it

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/mod-data-fix --title "Orchestrator run mod-data-fix" --body-file .claude\orchestrator-runs\mod-data-fix.md
```

Context added by learning: 3.7k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 1 → 1 → 0.5 · parked 0 → 0 → 0
