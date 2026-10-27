# Plan 498 — Protect unsaved work everywhere

Status: draft
Track: code
Depends-on: none
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f

## Problem Statement
A user who has typed something and not saved it can be sent away silently. Measured against `origin/main` at b6181027 (Human brief 01, 2026-10-26; re-check on arrival, `main` has moved):
1. `inventory/equipment/add|edit/:id` and `suppliers/add|edit/:id` (`src/app/app.routes.ts`) have an edit form and no leave guard. Neither `equipment-form` nor `supplier-form` has `hasRealChanges` / `useUnsavedChanges`.
2. The `settings` route has no guard; tabs switch by `?tab=` (`settings.page.ts` `setTab`). Edited forms live in `baseline-tab`, `business-settings-tab`, `business-name-form` (`team-tab` to be checked).
3. `warnBeforeUnload` (browser "leave site?" dialog on reload / tab close) is used only in `coefficient-manager` and `product-import`. Every page that implements `hasRealChanges` must also call it (recipe-builder, product-form, menu-intelligence, cook-view, venue-form, dashboard host, metadata-manager, plus the newly guarded pages).
4. Popups close on Escape / backdrop without asking while holding edits: `quick-edit-product-modal`, `quick-add-product-modal`, `add-item-modal`, `add-equipment-modal`, `unit-creator`, `label-creation-modal`, `ai-recipe-modal` (+ `ai-draft-editor`), `ai-product-modal`, `ai-menu-modal`, `unit-edit-dialog`, `quick-edit-product-panel`.
5. `src/app/core/services/translation.service.ts:329` `proposeAndSaveTranslation` calls the native `prompt()`; no callers were found.

## Goals & Success Criteria
- Primary: never send a user away from typed, unsaved work without asking. In-app always uses our `ConfirmModalService` popup; reload / tab close uses the browser dialog (decision D1). No native `prompt()` / `confirm()` / `alert()` remains in `src/app`.
- Success:
  - [ ] [auto] Guard specs for the newly guarded routes and tab switches, and a spec for the popup discard question, pass: `npx ng test --watch=false --browsers=ChromeHeadless` green.
  - [ ] [auto] `grep -rnE "\b(prompt|confirm|alert)\(" src/app --include=*.ts` (excluding `*.spec.ts`, `.confirm(` and `confirmModal`) → no native dialog calls.
  - [ ] [auto] `node scripts/reuse-lint.mjs --diff=origin/main` exits 0 and warns on a fixture line using `window.confirm|alert|prompt`; `node scripts/reuse-lint.mjs --check-registry` exits 0.
  - [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Edit an equipment item, click a header link → our popup with stay / leave (save-and-leave where the page supports `saveAndWait`).
  - [ ] [human] Settings: change a value, switch tab → our popup.
  - [ ] [human] Any guarded page: edit, press F5 → the browser's "leave site?" dialog.
  - [ ] [human] Quick-edit product: change the price, press Escape → asked; press Cancel → closes without asking.

## Execution Mode
- Parallel: no — the steps share `modal-shell` and the guard utilities.
- Concurrent plans: none (499–502 depend on this plan)
- Isolated DB: no

## Execution Notes
- Source: Human briefs 00 + 01 (`brief-00-overview.md`, `brief-01-unsaved-work.md`, verified against `origin/main` b6181027, 2026-10-26). `main` is now 21a2ffe5: re-check every claim, count and line number before editing.
- Run order of the batch: 498 → 499 → 500 → 501 → 502, one at a time (they edit the same dialogs and forms). `Depends-on` enforces it.
- Human decisions already made (2026-10-26): D1 — reload / tab close shows the browser's own dialog (`warnBeforeUnload`), in-app navigation keeps our modal. D2 — closing a popup that holds edits (Escape / backdrop) asks before discarding; explicit Cancel / X does not (precedent: `equipment-list.component.ts` ~lines 441–450). D3 — see plan 501.
- Reuse the existing pieces, do not rebuild: `pendingChangesGuard` + `PendingChangesComponent` (`core/guards/pending-changes.guard.ts`), `useUnsavedChanges` (`core/utils/unsaved-changes.ts`), `warnBeforeUnload` (`core/utils/leave-warning.util.ts`), `app-modal-shell` (`dismissed` on Escape / backdrop, `dismissible` input), dashboard tab-switch guard (plan 482).
- Design direction (the Worker decides the exact shape): one way for a popup to say "I have edits", e.g. a `hasChanges` input (or `confirmDiscard` callback) on `app-modal-shell` that turns Escape / backdrop into a `ConfirmModalService` question before emitting `dismissed`; keep the "explicit Cancel does not ask" rule in that one place. No second guard — extend the existing one. Consider making `warnBeforeUnload` automatic for any page that opts into the guard.
- Popups not in scope unless they hold free edits (verify each): confirm, auth, global-specific, restore-choice, translation-key.
- Risks: `isSubmitted` / `markSaved` must be set after save or the user is asked after a successful save. A settings tab switch is a query-param navigation: prove the guard runs on it (dashboard precedent). The discard question is itself a modal-shell: the Escape stack (`isTopModalShell`) must stay correct.
- Plan 453 is closed and the modal-shell follow-up (7 hand-drawn dialogs) is a separate plan: do not move dialogs onto `app-modal-shell` here.
- If `proposeAndSaveTranslation` has a caller, route it to `translation-key-modal` instead of deleting it (check with grep and `knip`).

## Reuse Check
- Popup "ask before discarding edits" on Escape / backdrop — family: modal-shell — rung: 2 — why: one input on the existing `app-modal-shell`, no new popup
- Leave guard for equipment, supplier and settings — family: entity-form — rung: 1 — why: reuse `pendingChangesGuard` and `useUnsavedChanges` as they are
- Reload / tab-close warning on every guarded page — family: entity-form — rung: 2 — why: extend the guard so pages cannot forget `warnBeforeUnload`
- `reuse-lint` rule for `window.confirm|alert|prompt` — family: helpers — rung: 2 — why: one more data entry in `scripts/lib/registry-families.mjs`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/app.routes.ts
src/app/core/guards/**
src/app/core/utils/unsaved-changes.ts
src/app/core/utils/unsaved-changes.spec.ts
src/app/core/utils/leave-warning.util.ts
src/app/core/utils/leave-warning.util.spec.ts
src/app/core/services/translation.service.ts
src/app/core/services/translation.service.spec.ts
src/app/shared/modal-shell/**
src/app/shared/quick-edit-product-modal/**
src/app/shared/quick-edit-product-panel/**
src/app/shared/quick-add-product-modal/**
src/app/shared/add-item-modal/**
src/app/shared/add-equipment-modal/**
src/app/shared/unit-creator/**
src/app/shared/label-creation-modal/**
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-product-modal/**
src/app/shared/ai-menu-modal/**
src/app/pages/metadata-manager/components/unit-edit-dialog/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/equipment/components/equipment-form/**
src/app/pages/suppliers/components/supplier-form/**
src/app/pages/settings/**
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/venues/components/venue-form/venue-form.component.ts
src/app/pages/dashboard/dashboard.page.ts
scripts/lib/registry-families.mjs
scripts/test/reuse-lint.test.mjs
scripts/test/fixtures/reuse/**
docs/brain/component-families.md
src/app/shared/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — client-side screens only, no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call path changes; the AI modals only get the discard question.

## Atomic Sub-tasks

- [ ] A1: Check the brief's list of unprotected screens against today's code and record the real list — reality check of every route, tab, page and popup named in the Problem Statement (counts and line numbers drift) — this plan file
- [ ] A2: Make a popup ask before throwing away typed edits when closed by Escape or a click outside — one input on the shared popup frame; explicit Cancel / X never asks; Escape stack stays correct — src/app/shared/modal-shell/**
- [ ] A3: Use that question in every popup that holds free edits, and skip the ones that hold none — quick-edit/quick-add product, add-item, add-equipment, unit-creator, label-creation, AI recipe/product/menu modals, unit-edit-dialog, quick-edit product panel — the popup folders in scope
- [ ] A4: Stop the equipment and supplier forms from silently dropping edits when the user clicks away — `useUnsavedChanges` + `pendingChangesGuard` + the route guard entries; `markSaved` after load and save — src/app/pages/equipment/components/equipment-form/**, src/app/pages/suppliers/components/supplier-form/**, src/app/app.routes.ts
- [ ] A5: Ask before a settings tab switch drops edits on the baseline, business or business-name form — prove the guard runs on `?tab=` changes like the dashboard — src/app/pages/settings/**
- [ ] A6: Show the browser's leave-site dialog on reload for every page that tracks unsaved changes — automatic from the guard where possible, else call `warnBeforeUnload` in each page — the page `.ts` files and guard utilities in scope
- [ ] A7: Remove the native prompt in the translation service, or route it to the translation-key popup if something still calls it — grep and `knip` first — src/app/core/services/translation.service.ts
- [ ] A8: Warn on any new `window.confirm`, `alert` or `prompt`, and register the changes in the component registry — one `reuse-lint` rule with a fixture test; update the `entity-form` and `modal-shell` families — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, scripts/test/fixtures/reuse/**, docs/brain/component-families.md
- [ ] A9: Cover the new behaviour with specs and run the full checks — guard specs, popup discard spec, `ng build`, headless `ng test`, the grep, reuse-lint, log-query; paste the output in Execution Notes — the spec files in scope

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The four `[human]` items under Success Criteria pass.
