# Plan 478 — Show the final match status on imported rows without a jump

Status: active
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 2 ("smart import"): the AI links a pasted / imported line to the
right inventory product, but each row first shows «חדש» (new) and then snaps to the "existing" status.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- `src/app/pages/inventory/components/product-import/product-import.component.ts:182-213` `readAndFill_`: line 193
  `rows_.set(result.rows.map(toPreviewRow_))` renders every row with `matchedId: null` (`toPreviewRow_`, ~317), then
  line 199 `await this.matchWithAi_()` (332-352) fills `matchedId` after the AI call returns.
- `view_` (131-147) defaults `status` to `'new'` (137) whenever `matchOf_()` (322-329) finds nothing yet, so every row
  the exact matcher can't settle claims «חדש» while the AI is still working. The chip (`.html:236-243`) and the
  editable/read-only cells (`.html:155-233`) all follow `item.match` / `item.status`, so the whole row changes shape.
- During the wait only a hint line shows (`.html:115-117`, `isMatching_`), and save is blocked (`canSave_`, 149-151).

## Goals & Success Criteria
- Primary: a row shows its final status the first time the status is shown; while the AI is still deciding it shows a
  neutral "checking" state, never «חדש».
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] Unit tests pass (`npx ng test --watch=false --include=src/app/pages/inventory/components/product-import/product-import.component.spec.ts`): with an AI matcher that resolves later, every row the exact matcher did not settle has status `matching` before the AI resolves and `same`/`update` after; no row ever has `new` and then `same`/`update`; rows the AI does not match go from `matching` to `new`; a failed AI call leaves them `new` and the hint shows the existing failure text.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down`).
  - [ ] [human] Replay: in the inventory import page paste three lines, two that exist in your inventory (e.g. a product you already have, spelled a little differently) and one that does not. While the AI works, the two existing ones show a neutral «בודק…»-style chip, not «חדש»; when it finishes they show the existing status and the new one shows «חדש». No row changes from «חדש» to existing.

## Execution Mode
- Parallel: yes — touches only the product-import component and the dictionary (append).
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Depends on: none.
- Written by the Planner from the Human's validation report of 2026-10-22.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`).

```scope
src/app/pages/inventory/components/product-import/**
docs/mvp/runs/478.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log the path, the change and why under `## Decisions` in the run file, add it to the
scope block, continue (run mode — no Human in the loop).

## Architecture Impact
- INV-1..INV-5: preserves — client display state only; no permission, tenancy, schema or taxonomy change.
- INV-6: preserves — the AI call stays the existing `matcher_.matchNames` through `server/routes/ai.js`.

## Backend Impact
- Collections affected: none. Server changes needed: no.

## Step 0 — Reality Check
On `origin/mvp-review-fixes` find `readAndFill_`, `matchWithAi_`, `view_`, `matchOf_`, `isMatching_`, `statusKey`,
`ImportRowStatus` in `product-import.component.ts`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef importing my supplier list, I want each line's status to appear once and stay put so I trust what the app found.

## Atomic Sub-tasks
- [ ] A1: Add a `matching` row status — extend `ImportRowStatus` with `'matching'`; keep a `pendingIds_` signal (row ids sent to the AI) set before the AI call and cleared in `finally`; in `view_`, a row with no match that is in `pendingIds_` gets `matching` — `src/app/pages/inventory/components/product-import/product-import.component.ts`
- [ ] A2: Render the neutral state — a `matching` row shows a neutral chip (existing `.c-chip` engine, no colour modifier, a small spinner or `loader` Lucide icon) with new key `import_status_matching` («בודק…»), and its unit / purchase-unit / category cells render read-only (not editable) until the status is final, so the row does not change shape twice — `product-import.component.html`, `product-import.component.ts` (`statusKey`), `public/assets/data/dictionary.json`
- [ ] A3: Specs for A1/A2 (deferred AI matcher) — `product-import.component.spec.ts`
- [ ] V1: Build, tests, browser replay of the [human] card, write `docs/mvp/runs/478.md`.

## Technical Considerations
- Keep the instant preview (rows appear at once); only the status waits. Do not move `rows_.set` after the AI call.
- Status chip: the template uses the legacy `.c-chip.teal` / `.amber`; switch to the plan-457 modifiers (`c-chip--teal` / `c-chip--amber`) if they exist in `src/styles.scss`, else leave as is.
- Signals only, `inject()`, OnPush, translatePipe for the new string.

## Out of Scope
- Matching quality, the AI prompt, receipt photo import (465) behaviour beyond the status display.
