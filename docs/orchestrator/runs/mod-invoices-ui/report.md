# Orchestrator run mod-invoices-ui

Run branch: `orch/mod-invoices-ui` (from `origin/main` at 4aa70d5) · started 2026-11-18T17:29:41.175Z · finished 2026-11-18T19:10:13.398Z
Result: 3 merged, 0 parked, skipped or left out, 3 in the run (counted from git and status.json).
`main` untouched: yes (2 plan/todo file(s) changed on main) — origin/main is b15c698.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 628 Invoice screen: scan a photo or a PDF, confirm the header, match from memory first, see the price change in percent, and an invoices list | merged | 1 | build | e054a94 |  |
| 629 Price-rise alert: the business's own threshold, what a rise does to recipes and dishes, and a dashboard card of recent rises | merged | 0 | build | 7a2fdc1 |  |
| 630 Platform screen: how accurate each AI scan flow is per model, how big the shared supplier brain is, and whether files are kept | merged | 1 | build | 8b543a3 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-18T17:29:41.175Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 628 · none · behaviour: a date the read returns that is not yyyy-mm-dd leaves the strip's date empty, and the invoice number is cut to 40 characters (the simplest option) — reverse: show the raw printed date text and drop the 40-character cut in setInvoiceFrom_
- D2 · 628 · none · behaviour: the percent shows only on rows with status update (not on same-price rows) — reverse: drop the status check on changePct in view_
- D3 · 628 · none · behaviour: the invoices list uses the table layout of app-list-shell, so the shell's filter-toggle button shows although there are no filters — reverse: switch the list to layout=cards or hide the toggle in the shell
- D4 · 628 · none · behaviour: a blocked pop-up or a failed file link closes the tab, logs the status and shows invoice_file_open_failed — reverse: drop the error toast in InvoicesListComponent.openFile
- D5 · 628 · none · behaviour: case (h) asserts the invoice line row index as the position among the rows sent, [0,1], matching what the existing save test already expects. The answer's wording 'keep their row index' could be read differently — reverse: change the expected row values in that test.
- D6 · 630 · none · behaviour: the four ai_feature_* flow labels already existed in dictionary.json, so none were added (the plan said to add them only when absent) — reverse: none needed
- D7 · 630 · none · behaviour: /stats lets `days` through only as digits only (`7` to `365`), so `7.5` or `1e2` get 400 BAD_DAYS (the simplest reading of 'an integer') — reverse: relax the regex in admin-learning.js
- D8 · 630 · none · behaviour: made tiny style tweaks (font-weight, line-height, padding, min-inline-size, letter-spacing, muted heading colour) to the learning section's SCSS so it no longer duplicates other components' blocks — reverse: restore the earlier SCSS from commit before ab6e5fe5 and accept the debt
- D9 · 630 · none · behaviour: declared the learning classes in the Reuse Check under the empty-state family at rung 1 (page-local layout, as .ai-shots is) — reverse: change those rows in the plan
- D10 · 629 · none · behaviour: the settings tab declares a local SettingsNumbers type (BusinessSettings plus priceRiseAlertPct) because shared/schemas/entities/business.schema.ts is outside the scope and its BusinessSettings type still omits the field — reverse: widen BusinessSettings in the schema file and drop the local type
- D11 · 629 · none · seen: shared/schemas/entities/business.schema.ts:20 — the comment says plan 629 widens BusinessSettings, but the file is not in plan 629's scope

## Run notes

- 628: the folder foodVibe1.0-orch-mod-invoices-ui-628 was installed (root, scripts, server)
- 628: builder left undone (round 0): [ui] 628-1: written, not run (e2e/ui/628-1.spec.ts); [ui] 628-2: written, not run (e2e/ui/628-2.spec.ts); [human] both items left for Dandan (real invoice scan; second scan matched from memory and file opens from the list)
- 628: [ui] On `/inventory/import`, choosing an image in the upload input (the read route answered by a prepared fixture whose `supplier.supplierId` is a supplier the : written, not run — checked by the run's [ui] step / the Human
- 628: [ui] On `/inventory/invoices` (the generic read of `invoices` answered by a prepared fixture with one invoice of «ספק בדיקה 628», number «INV-628») the page sho: written, not run — checked by the run's [ui] step / the Human
- 628: builder left undone (round 1): [human] Dandan scans a real invoice on his phone (header strip, percent in Hebrew RTL, save lands in the list): needs his phone and real file-store keys; [human] second scan of the same invoice matched from memory, file opens from the list: same reason; [ui] 628-1 and 628-2: written, not run (e2e/ui
- 628: [ui] On `/inventory/import`, choosing an image in the upload input (the read route answered by a prepared fixture whose `supplier.supplierId` is a supplier the : written, not run — checked by the run's [ui] step / the Human
- 628: [ui] On `/inventory/invoices` (the generic read of `invoices` answered by a prepared fixture with one invoice of «ספק בדיקה 628», number «INV-628») the page sho: written, not run — checked by the run's [ui] step / the Human
- 628: parked: nothing to save (nothing uncommitted)
- 628: ask 628-1 (technical, the Human or the advisor answers): Plan 628 failed twice for the same reason (Done-when item left undone: [auto] `pnpm run test:ci` passes, including the cases this plan adds to `src/app/pages/inventory/components/product-import/product-import.component.spec.ts`: (a) a PDF chos). Leave it parked, or retry it?
- plan 628 asks 628-1 — 629 wait on the answer; the rest go on
- 628: ask 628-1 answered by the human: retry: the reviewer is right that two of the ten named cases are not in product-import.component.spec.ts. Add (h) a test where a preview row is deleted before saving after a file read, and assert the saved invoice has no line for it (the other lines keep their row index). In (i) assert the message key invoice_supplier_required is shown (by key or its translated tex
- 628: resumed from park/mod-invoices-ui-628: round 1, tier build, after: asking 628-1: same reason twice: Done-when item left undone: [auto] `pnpm run test:ci` passes, including the cases this plan adds to `src/app/pages/inventory/co
- 628: the folder foodVibe1.0-orch-mod-invoices-ui-628 was installed (root, scripts, server)
- 628: the folder foodVibe1.0-orch-merge-mod-invoices-ui was installed (root, scripts, server)
- 630: the folder foodVibe1.0-orch-mod-invoices-ui-630 was installed (root, scripts, server)
- 630: builder left undone (round 0): [ui] 630-1: written, not run
- 629: the folder foodVibe1.0-orch-mod-invoices-ui-629 was installed (root, scripts, server)
- 629: builder left undone (round 0): [ui] 629-1: written, not run; [ui] 629-2: written, not run; [ui] 629-3: written, not run; log-query: SKIP, no database configured in this folder

## Models per agent

- 628 builder: sonnet
- 628 reviewer: sonnet
- 629 builder: sonnet
- 629 reviewer: sonnet
- 630 builder: sonnet
- 630 builder fix: sonnet
- 630 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 628 Invoice screen: scan a photo or a PDF, confirm the header, match from memory first, see the price change in percent, and an invoices list: Dandan scans a real invoice on his phone: the header strip is right or easy to fix, the percent next to each price reads well in Hebrew RTL, and the save lands in the invoices list.
2. 628 Invoice screen: scan a photo or a PDF, confirm the header, match from memory first, see the price change in percent, and an invoices list: Dandan scans the same invoice a second time: the preview is matched before he touches it (brief MP-07), and the file opens from the invoices list (only once the file-store keys are set, gate G3; before that the row says «הקובץ לא נשמר»).
3. 629 Price-rise alert: the business's own threshold, what a rise does to recipes and dishes, and a dashboard card of recent rises: Dandan saves a real invoice with a price that rose: the mark, the panel and (after a reload) the dashboard card read clearly on his phone, and the numbers in the panel match the recipe's cost in the recipe book.
4. 630 Platform screen: how accurate each AI scan flow is per model, how big the shared supplier brain is, and whether files are kept: After scanning three invoices in a test business, Dandan opens `/platform`: the invoice-read row counts them, the accuracy reads as he expects from how much he corrected, and the brain numbers moved.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/mod-invoices-ui --title "Orchestrator run mod-invoices-ui" --body-file .claude\orchestrator-runs\mod-invoices-ui.md
```

Context added by learning: 3.7k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 1 → 2 → 0.67 · parked 0 → 0 → 0
