# Orchestrator run mod-fixes

Run branch: `orch/mod-fixes` (from `origin/main` at 94a6be6) · started 2026-11-19T08:45:13.712Z · finished 2026-11-19T12:33:38.588Z
Result: 4 merged, 0 parked, skipped or left out, 4 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is 94a6be6.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 641 Invoice import compares with the product's current price and asks which supplier to update; no duplicate suppliers | merged | 2 | build → judgment | 52b6401 |  |
| 642 The platform's learning numbers say how many scans were saved and do not show a sure percent from one save | merged | 1 | build | 23a5573 |  |
| 643 Small debts the Modules runs left: the settings type, the test icon list and the flaky export test | merged | 0 | build | bcd1cf0 |  |
| 644 The business dialog: hints as tooltips, a history panel that is a real box, and changed texts that reach the screen | merged | 2 | build → judgment | 1659b95 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-19T08:45:13.712Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 641 · none · behaviour: the invoice line record cannot carry the changed supplier because its schema (shared/schemas/entities/invoice.schema.ts) is outside the plan's scope, so priceHistory records the target supplier and the invoice keeps its own supplier id — reverse: add a supplierId field to the invoice line schema and buildInvoiceLines
- D2 · 641 · none · behaviour: when no invoice supplier is chosen, the row is compared with the lowest price and shows its percent, but offers no choice (the apply behaves as before) — reverse: show the choice and require a supplier
- D3 · 641 · none · behaviour: when the product's current price comes from another supplier, the row status is 'update' even when the invoice price equals it, since the invoice supplier would still be added — reverse: treat equal prices as 'same'
- D4 · 641 · none · behaviour: the server test is the new file server/test/product-import-apply.test.js because the plan's server/test/product-import.test.js does not exist — reverse: move the cases into product-import-route.test.js
- D5 · 641 · none · seen: scripts/reuse-lint.mjs --check-registry reports `registry missing-path @schemas/units/to-base` (docs/brain/component-families.md line 567). It is not in this plan's changes, and I did not touch it.
- D6 · 641 · none · behaviour: when no invoice supplier is chosen, the row is compared with the lowest price but shows no update/add choice, and the apply behaves as before — reverse: show the choice in view_ when supplierKey is empty too
- D7 · 642 · none · behaviour: buildLearningStats takes an optional `now`, defaulting to Date.now(), and the route passes its own `now`, so the 24-hour abandoned line is testable — reverse: drop the `now` option and use Date.now() inside
- D8 · 643 · none · behaviour: the export flake's cause was the spec's own Blob.text() read, which can finish after the fixed 20 ms wait. It was not the requests load that the CI log's hydrate_error line suggested. I fixed the spec only and left the component alone. Reverse: revert the blobReads lines in the spec.
- D9 · 644 · none · behaviour: the private-mode switch's label carries title and aria-label with the hint, and the hint has no visible text — reverse: switch the label to aria-describedby with a visually-hidden span
- D10 · 644 · none · behaviour: the erase button keeps its own visible name and gets title plus aria-describedby pointing at a visually-hidden span with the tip — reverse: remove the span and the attributes
- D11 · 644 · none · behaviour: .fda-body of the dialog is capped at 60vh with overflow-y: auto, so the content scrolls and the modal size stays fixed — reverse: remove the .fda-body rule in the platform-business-dialog layer
- D12 · 644 · none · seen: the kit copy of scope-check (C:/coding projects/Cursor/foodVibe1.0/scripts/scope-check.mjs), run from this worktree, reports SCOPE: out only for untracked 'Claude outputs/**' files in the main checkout. They are not in this branch's diff; the worktree copy reports SCOPE: ok.
- D13 · 644 · none · behaviour: the business dialog body has a fixed height of min(60dvh, 34rem) even when its content is shorter, so the modal never changes size — reverse: change block-size back to max-block-size in the .fda-body:has(> .pbd-top) rule

## Run notes

- 641: the folder foodVibe1.0-orch-mod-fixes-641 was installed (root, scripts, server)
- 641: builder left undone (round 0): [ui] 641-1: written, not run (no running app in the builder folder)
- 641: GATE: cached pnpm run test:ci — passed on the same files in plan 641
- 641: GATE: cached pnpm run test:server — passed on the same files in plan 641
- 641: escalated to a fresh judgment-tier builder (round 2): review STOP: major server/routes/product-import.js:157 done-when: the invoice line does not record the supplier whose price changed
- 641: builder left undone (round 2): A1-A5: not started; the worktree is clean at base 11c43c62. The Done-when item 'the invoice line records the supplier whose price changed' needs shared/schemas/entities/invoice.schema.ts (invoiceLineSchema: add supplierId: z.string().optional()), which is outside the scope. Once approved, the route
- 641: parked: nothing to save (nothing uncommitted)
- 641: ask 641-1 (scope, the Human or the advisor answers): Plan 641 must record on each saved invoice line the supplier whose price changed, but the strict invoice line schema has no such field and its file is outside the plan's scope. May the builder add an optional supplierId to invoiceLineSchema?
- 641: ask 641-1 answered by the human: approved: shared/schemas/entities/invoice.schema.ts
- 641: scope of plan 641 extended on orch/mod-fixes by the answer to 641-1: shared/schemas/entities/invoice.schema.ts
- 641: resumed from park/mod-fixes-641: round 2, tier judgment, after: asking 641-1: replan needed: ESCALATE: scope shared/schemas/entities/invoice.schema.ts. invoiceLineSchema (z.strictObject, lines 9-19) has no supplierId, so a s
- 641: starts on the judgment tier: resumed on the tier the stopped attempt ran on
- 641: the folder foodVibe1.0-orch-mod-fixes-641 was installed (root, scripts, server)
- 641: builder left undone (round 2): [ui] 641-1 (preview shows the percent and the two choices): written, not run
- 641: the folder foodVibe1.0-orch-merge-mod-fixes was installed (root, scripts, server)
- 642: the folder foodVibe1.0-orch-mod-fixes-642 was installed (root, scripts, server)
- 642: builder left undone (round 0): [human] check on /platform by Dandan
- 642: GATE: cached pnpm run test:ci — passed on the same files in plan 642
- 642: GATE: cached pnpm run test:server — passed on the same files in plan 642
- 643: the folder foodVibe1.0-orch-mod-fixes-643 was installed (root, scripts, server)
- 644: the folder foodVibe1.0-orch-mod-fixes-644 was installed (root, scripts, server)
- 644: builder left undone (round 0): [ui] 644-1: written, not run; [human] check by Dandan: not ticked
- 644: escalated to a fresh judgment-tier builder (round 2): review STOP: major src/app/pages/platform-dashboard/platform-dashboard.page.scss:257 P0: the modal does not keep its size when the history opens
- 644: builder left undone (round 2): [ui] On /platform the dialog size stays the same after opening the history; the history panel has a border; the dialog content scrolls: written, not run
- 644: [ui] On `/platform`, the business dialog's size (width and height of `.c-modal-card`) is the same before and after: written, not run — checked by the run's [ui] step / the Human
- make this a default? the server test is the new file server/test/product-import-apply.test.js because the plan's server/test/product-import.test.js does not exist — reverse: move the cases into product-import-route.test.j (trigger: screen) — reply: default yes run-screen
- make this a default? the erase button keeps its own visible name and gets title plus aria-describedby pointing at a visually-hidden span with the tip — reverse: remove the span and the attributes (trigger: destructive-action) — reply: default yes run-destructive-action

## Models per agent

- 641 builder: opus
- 641 reviewer: sonnet
- 642 builder: sonnet
- 642 builder fix: sonnet
- 642 reviewer: sonnet
- 643 builder: sonnet
- 643 reviewer: sonnet
- 644 builder: sonnet
- 644 builder fix: sonnet
- 644 reviewer: sonnet
- 644 judgment builder: opus

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 644: On `/platform`, the business dialog's size (width and height of `.c-modal-card`) is the same before and after — a [ui] card no script could check and the browser step was off; on a page not named
2. 641 Invoice import compares with the product's current price and asks which supplier to update; no duplicate suppliers: Dandan imports the «ווילד בייקרי» invoice again: the row shows the rise against 100, he keeps «עדכון המחיר»,
3. 642 The platform's learning numbers say how many scans were saved and do not show a sure percent from one save: Dandan opens `/platform` → "למידת המערכת": the invoice row reads "1 מתוך 9" saved and a greyed "100% (1)",
4. 644 The business dialog: hints as tooltips, a history panel that is a real box, and changed texts that reach the screen: Dandan opens a test business's dialog: hovering "מצב פרטי" shows the new hint and no hint text is on the

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/mod-fixes --title "Orchestrator run mod-fixes" --body-file .claude\orchestrator-runs\mod-fixes.md
```

Context added by learning: 3.7k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 1 → 0.5 → 1.25 · parked 0 → 0 → 0
