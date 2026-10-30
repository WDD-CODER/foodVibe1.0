# Plan 501 — Delete versus undo: entity deletes keep the popup, line removals get an undo toast

Status: done
Track: code
Depends-on: 500
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f

## Problem Statement
Deleting things behaves differently from screen to screen: some ask in a popup, some remove at once, and almost nothing can be undone. Human decision D3 (2026-10-26) sets the rule: deleting an **entity** (product, recipe, supplier, venue, equipment, event, user, taxonomy term) keeps the confirm popup (`ConfirmModalService.open(msg, { variant: 'danger' })`); removing a **line** the user can re-add (a row inside a form, or a list inside an entity) removes at once and shows an undo toast, no popup. Measured against `origin/main` at b6181027 (Human brief 03 part 1; re-check on arrival):
- The undo toast exists: `src/app/core/services/user-msg.service.ts` `onSetSuccessMsgWithUndo(txt, undo)`, with one user today (`preparation-registry.service.ts:159`).
- Handlers to classify (the Worker lists every one and marks it entity or line): `shared/scaling-chip` `onRemove`, `ai-draft-editor` row deletes (3), `ai-product-modal` `removeCategory` / `removeAllergen`, `event-notes-log` `remove(note)`, `event-closing-dialog` `removePhoto`, `menu-intelligence.page` section remove, `cook-view` `removeIngredient`, `product-form` `onDeletePurchaseOption`, `product-import` `removeRow`, `venue-form` `removeHoursRow` / `removeInfraRow`, `recipe-builder` `removeBaselineRow`, `recipe-ingredients-table` / `recipe-workflow` row removes, `prep-sheets`, `team-tab` `removeMember`.
- Open: `team-tab removeMember` changes another person's access, so it is likely entity-level (confirm), not a line. `event-notes-log` delete is saved to the server at once, so its undo must re-create the note.
- A chip × inside a picker (`custom-multi-select`) is neither — no toast.

## Goals & Success Criteria
- Primary: one rule everywhere — entity delete asks, line removal is undoable.
- Success:
  - [ ] [auto] Specs for the undo path of each line remove that is saved to the server (at least `event-notes-log`) pass; `npx ng test --watch=false --browsers=ChromeHeadless` green.
  - [ ] [auto] Every handler in the Problem Statement is listed in Execution Notes with its class (entity / line / neither) and the result.
  - [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Product form: delete a purchase option → it disappears at once, a toast with "undo" shows → pressing undo brings it back in the same place.
  - [ ] [human] Event notes: delete a note → toast with "undo" → undo brings the note back and it is still there after a reload.
  - [ ] [human] Delete a supplier → the confirm popup (unchanged).

## Execution Mode
- Parallel: no — one small helper, then a sweep of handlers.
- Concurrent plans: none (502 depends on this plan)
- Isolated DB: no

## Execution Notes
- Source: Human briefs 00 + 03 part 1 (verified against `origin/main` b6181027). `main` is now 21a2ffe5: re-check every claim before editing. Brief 03 allows splitting into 03a (this plan) and 03b (plan 502).
- Run order of the batch: 498 → 499 → 500 → 501 → 502, one at a time.
- INV-3 (the server owns cross-document consistency): undoing a server-saved line remove must go through the same client data service that saved it, re-creating the line; the client never repairs cross-document consistency itself. State the exact path per handler in Execution Notes.
- If an undo toast outlives the page (the user navigates away), the undo must still work or the toast must be dismissed — the Worker decides and records it.
- `team-tab removeMember`: keep the confirm popup unless the Worker finds a reason to treat it as a line; record the call.
- Each new toast text goes through the dictionary (Hebrew RTL).

- Handler classification (D1) and result. Helper: `UserMsgService.onLineRemoved(txt, restore, owner?)` (toast with undo; dismissed when `owner` DestroyRef is destroyed, so the undo never acts on a dead view).
  - `event-notes-log remove(note)` — line (server-saved). Popup dropped; delete at once, undo re-creates via `EventPipelineService.addNote` (same route that added it; new time and author). Spec added.
  - `event-closing-dialog removePhoto` — line (saved by `commit`). Undo goes through the same `updateRow` / commit path, photo back at its index.
  - `product-form onDeletePurchaseOption` — line; same FormGroup re-inserted at index (clamped).
  - `product-import removeRow` — line; row re-inserted at index, deleted counter restored.
  - `venue-form removeHoursRow` / `removeInfraRow` — line; same control re-inserted.
  - `recipe-builder removeIngredient`, `deleteStep` (recipe-workflow `removeItem` output), `removeBaselineRow` (new insert/take methods in `recipe-logistics-picker.service.ts`) — line; ingredient placeholder row is dropped on undo; step numbers re-ordered for preparations.
  - `ai-draft-editor removeIngredient` + `removeWorkflowItem` (the 3 row-delete buttons; round 2 added the workflow handler), `ai-product-modal removeCategory` / `removeAllergen` — line; restored at index.
  - `cook-view removeIngredient` — line (local recipe copy); restored at index.
  - `menu-intelligence.page removeSection` / `removeItem` — line; restore into the same section (skipped if the section was removed since).
  - `scaling-chip onRemove` — neither: it only emits `remove`; the handler is in `recipe-header` (out of scope, no confirm there, no toast added) — seen.
  - `prep-sheets` — neither: no remove handler exists.
  - `team-tab removeMember` — entity (changes someone's access): confirm popup kept, unchanged.
  - Entity deletes (equipment-list, menu-library-list, supplier-list, venue-list): all already use ConfirmModalService; unchanged.
  - `custom-multi-select` chip x: neither, no toast.
- Toast outlives the page: dismissed on owner destroy (decision recorded). Undo on server failure: existing pipeline error toast, line stays removed.
- Evidence: `pnpm run build` -> 0; `pnpm run lint` -> 0 errors (67 pre-existing warnings); `pnpm run test:ci` -> 1633 SUCCESS; scope-check --arch -> 0, --reuse -> 0.
- `log-query --since=plan-start --level=error` shows only `CORS origin not allowed` on /api/v1/data/DICTIONARY_OVERRIDES/global from the main-folder server (`C:\coding projects\Cursoroodvibe1.0\server`), not from this worktree or plan 501 code.

## Reuse Check
- Remove-with-undo for a line — family: feedback — rung: 2 — why: reuse `onSetSuccessMsgWithUndo` in `user-msg.service.ts`; at most one small shared helper for "remove, toast, restore at the same position"
- Entity delete popup — family: modal-controller — rung: 1 — why: keep `ConfirmModalService.open(msg, { variant: 'danger' })` as is

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/user-msg.service.ts
src/app/core/services/user-msg.service.spec.ts
src/app/core/services/preparation-registry.service.ts
src/app/shared/scaling-chip/**
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-product-modal/**
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/menu-intelligence/components/event-notes-log/**
src/app/pages/menu-intelligence/components/event-closing-dialog/**
src/app/pages/menu-intelligence/components/prep-sheets/**
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.spec.ts
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-import/**
src/app/pages/venues/components/venue-form/**
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/settings/components/team-tab/**
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — undoing a line that was already saved to the server re-creates it through the same client data service and server route that saved it; no client-side cascade is added, moved or repaired. The Worker records the path per handler.
- INV-1: preserves — no permission or write-route file is touched; `team-tab removeMember` keeps its confirm popup.
- INV-2: preserves — no tenancy or master-data change.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — the AI modals only change how a row is removed; no AI call path changes.

## Atomic Sub-tasks

- [x] D1: List every remove / delete handler named in the Problem Statement, mark each as entity, line or neither, and record it — include the two open calls (`team-tab removeMember`, `event-notes-log`) — this plan file
- [x] D2: Give line removals one shared way to remove at once and show an undo toast that puts the line back in the same place — small helper next to the existing toast service, with its spec — src/app/core/services/user-msg.service.ts
- [x] D3: Use it for the form rows in the product form, product import, venue form and recipe builder — purchase options, import rows, hours / infrastructure rows, baseline rows, ingredient and workflow rows — the page folders in scope
- [x] D4: Use it for the rows inside the AI modals, the scaling chip, cook-view ingredients, menu sections and prep sheets — src/app/shared/ai-recipe-modal/**, src/app/shared/ai-product-modal/**, src/app/shared/scaling-chip/**, src/app/pages/cook-view/**, src/app/pages/menu-intelligence/**
- [x] D5: Make deleting an event note and an event photo undoable, re-creating the saved item on undo, with specs — event-notes-log, event-closing-dialog — src/app/pages/menu-intelligence/components/event-notes-log/**, src/app/pages/menu-intelligence/components/event-closing-dialog/**
- [x] D6: Keep the confirm popup for entity deletes and for removing a team member, and fix any entity delete that skips it — src/app/pages/settings/components/team-tab/** and the handlers marked entity in D1
- [x] D7: Run the full checks and paste the output — `ng build`, headless `ng test`, scope-check, log-query — Execution Notes

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The three `[human]` items under Success Criteria pass.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): scope gap → `src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts` added to the Read-Write Scope so baseline-row undo can put the row back at its index (an insert method). Why: a clean insert beats wrapping from the page.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): event-note undo → re-create through `addNote`; accept the new time and author. Holding the server delete until the toast is gone needs out-of-scope pipeline/server files — a possible follow-up.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): undo fails on the server → existing pipeline error toast; the line stays removed.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): undo after other edits → back at the original index, clamped to the list end.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): quick removes in a row → the latest remove wins; toast duration unchanged (2 s). Follow-up candidate: a longer undo toast in UserMsgService.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): cancel/leave with the toast showing → dismiss the toast when the owning component is destroyed.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): [human] checks → after the run; 502 proceeds on 501's merge.
- round 2: removePhoto undo spec added to event-closing-dialog.component.spec.ts; test:ci 1634 SUCCESS, build 0, lint 0 errors, arch+reuse ok. log-query shows 2 CORS 500 errors from /api/v1/data/DICTIONARY_OVERRIDES (server log, not from this change).
