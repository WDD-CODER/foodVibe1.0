# Plan 484 — Let a product with a duplicate name be edited, and show its twins

Status: active
Track: code
Snapshot: 1758cd885b0b9af9b8a3ba0a6cfc5da0a9ce2db5

## Problem Statement
Human, 2026-10-22 (screenshots of «עריכת מוצר: כרובית» and «עריכת מוצר: מלפפון»): opening an existing product and
changing only its price can't be saved — the name box turns red with «כבר קיים חומר גלם בשם זה». For «מלפפון» the
similar-products box shows no other «מלפפון», so it looks like there is no duplicate at all.

Verified on `origin/mvp-review-fixes` and the local DB (read-only):
- Local business «העסק של Guest Admin» really has 4 products named «מלפפון» and 4 named «כרובית»; «QA Review Kitchen»
  has 6 «כרובית» — left from the 5× master-catalog duplication cleaned on 2026-10-22 (only `__master__` was deduped).
  Atlas suppliers had no duplicates; Atlas products were not checked.
- `duplicateNameValidator` (`src/app/core/validators/item.validators.ts:9-20`, used in
  `product-form.component.ts:340`) and `KitchenStateService.saveProduct` (`kitchen-state.service.ts:52-58`) both
  refuse a name that any OTHER product has — also on an update that did not touch the name. So a product that already
  has a twin can never be saved again, even for a price change.
- `ProductNameSuggestionsComponent.matches_` (`product-name-suggestions.component.ts`) ranks "starts with" first and
  cuts at 5, so longer names («מלפפון במלח קטנים 13» …) push the exact twins out of the list — the user can't see them.

## Goals & Success Criteria
- Primary: saving an existing product is blocked by the name rule only when its name was changed to a taken name;
  the twins are visible in the similar-products box.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] Specs pass: validator — add mode with a taken name → error; edit mode with the unchanged name while a twin exists → no error; edit mode renamed to a taken name → error. `saveProduct` — update with unchanged name and an existing twin → saves; update renamed to a taken name → refused. Suggestions — exact-name matches listed first.
  - [ ] [human] Replay: as Guest Admin open «מלפפון» for editing, change the price, save → «המוצר עודכן» (no red name box). The similar-products box lists the other «מלפפון» entries first.
  - [ ] [human] Rule still works: in that product, change the name to another existing product's name (e.g. «כרובית») → red box «כבר קיים חומר גלם בשם זה», save refused. On «הוסף מוצר», typing «מלפפון» → red box.

## Execution Mode
- Parallel: yes. Isolated DB: no.

## Execution Notes
- Base `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`. Built in this session by the Planner
  (Human chose "build one by one in this session", 2026-10-22).
- Cleaning the duplicate local products (merging twins and re-pointing recipes) is NOT in this plan — data change,
  Human decides separately. An Atlas read-only check for duplicate product names is proposed to the Human.

## Read-Write Scope

Always allowed: this plan file, `.claude/sessions/**`, `.worktree-*`, append-only hotspots.

```scope
src/app/core/validators/item.validators.ts
src/app/core/validators/item.validators.spec.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-name-suggestions/**
docs/mvp/runs/484.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1, INV-2, INV-4, INV-5, INV-6: preserves — client validation only.
- INV-3: preserves — the server write path is unchanged; the client stops refusing an unchanged name.

## Backend Impact
- None.

## Atomic Sub-tasks
- [ ] A1: Name rule only on a changed name — `duplicateNameValidator` takes the saved name of the product being edited and skips the check when the normalized value equals it; `saveProduct` refuses only when the name changed (normalized) and another product has it; both use `normalizeProductName` — `item.validators.ts`, `kitchen-state.service.ts`, `product-form.component.ts`
- [ ] A2: Exact twins first in the similar-products box — exact normalized matches first, then the existing order, still max 5 — `product-name-suggestions.component.ts`
- [ ] A3: Specs (see Done-when).
- [ ] V1: Build, specs, browser replay as Guest Admin, `docs/mvp/runs/484.md`.

## Out of Scope
- Merging or deleting the duplicate products; server-side unique names.
