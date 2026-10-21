# Plan 446 — Freeze the event plan and close each event with what was really paid

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 08.1. After an event the chef has no place to record what each supplier was really paid, whether the goods
arrived, whether there is an invoice, or the delivery-note photo — and no way to compare the real profit with the
planned one. The planned profit is only on screen (plan 445's meter): it changes whenever a product price changes,
so after the event nobody knows what was actually planned.

This plan:
1. **Planning snapshot** (C-SNAPSHOT `planSnapshot`): stored when the event enters "הזמנות"; refreshed on every
   event save until the first entry into "ביצוע", then frozen. Going back does not unfreeze; the owner can click
   «רענן תכנון». An event that skipped "הזמנות" gets its snapshot on entering "ביצוע" (or "פוסט-פרודקשן" when that
   was skipped too) and is frozen at once.
2. **Closing dialog** (`event-closing-dialog`, child component): opens on entering "פוסט-פרודקשן" and from a
   «סגירת אירוע» button; a row per supplier (planned ₪ · actual paid ₪ · ☐ arrived · ☐ invoice · delivery-note
   photos), «הוסף ספק», a "ללא ספק" row, actual extra costs, actual revenue, and a footer with planned vs actual
   profit (₪, %) and the difference. Overrun over the business threshold (plan 429 `overrunThresholdPct`) shows red.
3. **Finish / reopen** through plan 442's `/api/v1/events` router: «סיים אירוע» (owner) → "הסתיים", data
   locked; «פתח מחדש» (owner) → back to "פוסט-פרודקשן"; both recorded in stage history.
4. **Who may do what**: amounts — owner only (`editMoney`); arrived, invoice, photo — staff too (`markArrival`).
   The server decides.

Photos use the existing `CloudinaryService.upload` after `downscaleImage`. The math (variance, actual profit,
accuracy) is pure and tested with the spec's acceptance numbers. `menu-intelligence.page.ts` is not edited: the
dialog lives inside plan 443's stage bar, and the save path goes through plan 445's `MenuEventSaveService`.

## Goals & Success Criteria
**Primary:** after every event the chef records actual payments in one dialog and sees, against a plan that no
longer moves, how far the real profit landed from the planned one.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/engine/plan-snapshot.spec.ts' --include='src/app/core/engine/event-closing.spec.ts' --include='src/app/core/services/plan-snapshot.service.spec.ts' --include='src/app/core/services/event-pipeline.service.spec.ts' --include='src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts' --include='src/app/pages/menu-intelligence/components/event-closing-dialog/**/*.spec.ts' --include='src/app/pages/menu-intelligence/components/event-stage-bar/**/*.spec.ts'`
  passes, including spec 08.1 acceptance numbers in `event-closing.spec.ts` (snapshot: revenue 10,000; suppliers
  A planned 1,000, B planned 2,000; extra 1,000):
  - planned profit 6,000, planned profit % 60;
  - actual A 1,150, B 1,950, extra 1,000 → `supplierVariance(1000, 1150, 10)` = `{ kind: 'over', pct: 15, diff: 150 }`
    (red "חריגה של 15% (150 ₪)"); `supplierVariance(2000, 1950, 10)` = `{ kind: 'under', pct: -2.5, diff: -50 }`
    (grey); actual profit 5,900, actual profit % 59, accuracy −1 point;
  - B left empty → B counts as planned (2,000), result `partial: true`, `missingAmounts: 1`;
  - a manually added supplier with planned 0 and actual 300 → `{ kind: 'none', pct: null, diff: 300 }`;
  - `supplierVariance(1000, 1080, 10)` → `kind: 'within'` (no red).
  - `plan-snapshot.spec.ts`: `buildPlanSnapshot` on plan 435's `buildSupplierOrders(plan, productsById,
    suppliersById).cards` for the plan-433 fixture (`buildFixtureInput()`, `FIXTURE_SUPPLIERS`) → one row "ירקן"
    with `plannedCost` 157.75 and one "ללא ספק" row `supplierId: null` (לימון, 0); Σ `suppliers[].plannedCost`
    equals `plan.eventFoodCost`;
    `snapshotOnStageChange` → entering `ordering` with no snapshot = `store`; entering `execution` = `store_and_freeze`
    (no snapshot yet) or `freeze` (snapshot exists, not frozen); entering `post_production` with no snapshot =
    `store_and_freeze`; any move while frozen = `none`; moving back from `execution` to `ordering` = `none`.
  - `MenuEventSaveService.prepareForSave`: stored stage `ordering`, not frozen → result has a fresh `planSnapshot`;
    stored `planSnapshot.frozenAt` set → result has no `planSnapshot` key; stored stage `quote_sent` → no
    `planSnapshot`.
- [x] [auto] `npm --prefix server test -- events-closing` passes (in-memory DB, owner and staff tokens of one
  business, per plan 425/427 test helpers):
  - `PUT /api/v1/events/:id/stage` to `ordering` with a `planSnapshot` → stored, no `frozenAt`; to `execution` →
    `frozenAt` set; back to `ordering` with a different snapshot → stored snapshot unchanged;
  - generic `PUT /api/v1/data/menuEvents/:id` carrying a changed `planSnapshot` after freeze → stored snapshot
    unchanged (the "price change after ביצוע" acceptance); carrying a `closing` object → ignored (`closing` is in
    `EVENT_SERVER_FIELDS`); generic `POST` with `closing` → stored without it;
  - `PUT /:id/closing` by staff changing only `arrived`, `hasInvoice`, `photos` → 200; by staff changing
    `actualPaid` → 403 `FORBIDDEN`, stored amount unchanged; by owner changing amounts → 200;
  - `POST /:id/finish` by staff → 403; by owner from `post_production` → `stage: 'finished'`, a `stageHistory` entry
    `finished` with `by`/`byName`, `closing.finishedAt` set, `closedAt` set when it was missing (kept when set);
    from `quote_sent` → 400 `FINISH_FROM_STAGE`; `PUT /:id/stage` to `finished` still → 400 `USE_FINISH` (442);
    `PUT /:id/closing` afterwards → 409 `EVENT_FINISHED`;
  - `POST /:id/reopen` by owner → `stage: 'post_production'`, new history entry, `closing.finishedAt` removed;
  - `POST /:id/refresh-plan` by staff → 403; by owner on a frozen event → snapshot replaced, `frozenAt` kept;
  - a closing photo URL that is not `https://res.cloudinary.com/...` → 400.
- [x] [auto] `git diff --name-only origin/mvp -- src/app/pages/menu-intelligence/menu-intelligence.page.ts` prints
  nothing (the frozen page is untouched).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, an event with dishes from suppliers at `/menu-intelligence/<id>`: move it to "הזמנות", then
  "ביצוע". Change one product's price in `/inventory`, come back and save the event. Move to "פוסט-פרודקשן" → the
  "סגירת אירוע" dialog opens by itself and the planned amounts are the ones from before the price change.
- [human] In the dialog type an actual amount 15 % above one supplier's planned amount → that row turns red with
  "חריגה של 15% (… ₪)"; type a lower amount on another → grey with the minus %. The footer shows planned and
  actual profit, ₪ and %, and the difference.
- [human] Phone: in the dialog tap the camera button on a supplier row, take a delivery-note photo → a thumbnail
  appears in that row; reopen the dialog → it is still there.
- [human] Leave one supplier's amount empty → «סיים אירוע» warns "חסרים סכומים ל-1 ספקים"; confirm → the stage bar
  shows "הסתיים" and every field in the dialog is locked. «פתח מחדש» → back to "פוסט-פרודקשן", fields editable.
- [human] Sign in as staff of the same business: in the dialog tick "הגיע" and "יש חשבונית" and add a photo → saved;
  the amount fields are locked and «סיים אירוע» is not shown.
- [human] Phone width: the dialog is a full-height sheet; rows stack (supplier name, then amounts, then checkboxes
  and photos); nothing scrolls sideways.

## Execution Mode
- Parallel: no against 434 and 435 (approved map: Menu Intelligence hotspot); no against 440, 442, 445
  (`shared/schemas/entities/menu-event.schema.ts`); no against 424 and 425 (`shared/schemas/**`,
  `server/routes/generic.js`); no against 441, 443, 444 (same screens, sequential in lane wt-3).
- Concurrent plans: none required; check `node scripts/scope-check.mjs --overlap --plan=<this file>` at take time
  (lane wt-1 plans 431/432/448 must not be editing `generic.js` at the same time).
- Isolated DB: no — new optional fields only, no migration. Server tests use the in-memory DB.

## Execution Notes
- Depends on: plan 445 merged (`computeEventPricing`, `pricing`, `MenuEventSaveService`).
- Depends on: plan 435 merged (supplier orders = the per-supplier planned amounts' source of truth, 04.1/04.2).
- Transitively merged by then: 442 (events router, stage history), 443 (stage bar, `EventPipelineService`), 429
  (`overrunThresholdPct`), 427/428 (permission checker, client `PermissionService`), 433/434 (engine).
- Must not run at the same time as: 434, 435, 437 (Menu Intelligence page / approved map hotspot); 440, 442, 445
  (`menu-event.schema.ts`, sequential in lane wt-3); 441, 443, 444; 424, 425 (`shared/schemas/**`, `generic.js`).
- Decision (Planner review): finish, reopen and refresh-plan reuse the `editMoney` permission (no new C-PERM action)
  — they lock or replace money figures, so "owner only" and "may change money" are the same rule; the approved map
  already records this. Closing writes check `editMoney` for amount/row changes and `markArrival` for
  arrived/invoice/photos.
- Planned per-supplier amounts come from plan 435's `buildSupplierOrders` (its contract: Σ card totals =
  `eventFoodCost`), so the snapshot, the supplier-order cards and the closing rows name and total suppliers the same
  way.
- Server-owned fields: `closing` is appended to plan 442's `EVENT_SERVER_FIELDS` (`shared/schemas/entities/event-stage.ts`)
  so the existing generic POST/PUT strip drops it — no second strip mechanism; only the "frozen `planSnapshot`"
  rule is a new condition in `generic.js`.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/engine/plan-snapshot.ts
src/app/core/engine/plan-snapshot.spec.ts
src/app/core/engine/event-closing.ts
src/app/core/engine/event-closing.spec.ts
src/app/core/services/plan-snapshot.service.ts
src/app/core/services/plan-snapshot.service.spec.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/services/event-pipeline.service.spec.ts
src/app/core/models/menu-event.model.ts
src/app/pages/menu-intelligence/services/menu-event-save.service.ts
src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts
src/app/pages/menu-intelligence/components/event-closing-dialog/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
shared/schemas/entities/event-stage.ts
shared/schemas/entities/menu-event.schema.ts
server/routes/events.js
server/routes/generic.js
server/utils/closing-rules.js
server/test/events-closing.test.js
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — every closing, finish, reopen and refresh write runs on plan 442's business-scoped events
  router and is authorized by `assertCan` from `server/utils/permissions.js` (ADR 0023 rule as rewritten by plan
  424); the `generic.js` edit only adds `closing` (always) and a frozen `planSnapshot` to the menuEvents fields the
  generic PUT/POST already strips for plan 442 — it narrows what the generic route can write, never widens it.
- INV-2: preserves — no change to business scoping, master data or clone/sync; events stay business items.
- INV-3: preserves — finish/reopen (stage + history + closing stamps) and the freeze happen on the server in one
  request; the client never loops writes.
- INV-4: preserves — `planSnapshot` and `closing` are defined once in `shared/schemas/entities/menu-event.schema.ts`
  (strict objects, photo URL and count limits) and every write through the events router and the generic route is
  validated against it.

## Step 0 — Reality Check

Runs when `scope-check.mjs --drift` reports drift (it will). Check by symbol, print `ok` or `conflict: <what>`:
- Plan 442: `server/routes/events.js` handlers for `PUT /:id/stage` (scoped load, `applyStageChange` from
  `server/utils/event-stage.js`, `$push` of `stageHistory`, `USE_FINISH` / `EVENT_FINISHED`); `EVENT_STAGES`,
  `CLOSED_FROM_INDEX`, `EVENT_SERVER_FIELDS` in `shared/schemas/entities/event-stage.ts` and the generic POST/PUT
  strip that reads it.
- Plan 443: `EventStageBarComponent` (stage click handler, `openSupplierOrders` output), `EventPipelineService`
  (`changeStage`, `applyServerEvent` via `MenuEventDataService`), `stageErrorKey`, the "הסתיים" pill,
  `stage_finished_hint`, `event_finished_locked`.
- Plan 435: `buildSupplierOrders`, `SupplierOrderCard` in `src/app/core/utils/supplier-orders.util.ts`.
- Plan 445: `computeEventPricing`, `toPricingEvent`, `MenuEventSaveService.prepareForSave(event, plan, editingId)`.
- Plan 433/434/440: `EventPlanService.planFor(event)`, `RawLine.supplierId` / `lineCost`, `computePortions`.
- Plan 429: `BusinessService.business_().settings.overrunThresholdPct`.
- Plan 427/425: `assertCan`, the test helpers that create owner/staff users and sign tokens with `businessId` and
  `businessRole`; `MONEY_FIELDS.menuEvents` lists `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`,
  `closing.actualRevenue`.
- Repo: `CloudinaryService.upload(file)`, `downscaleImage(file, maxEdge, quality)`,
  `KitchenStateService.suppliersById_`, `ConfirmModalService.open`.

## User Stories
- As a chef, I want the plan to stop moving once the event is in execution so that I compare the real costs with
  what I actually planned.
- As a chef, I want to type what I paid each supplier and see at once where I went over so that I know which
  supplier or estimate to fix.
- As a chef, I want my team to tick "arrived", "has invoice" and photograph the delivery note so that the paperwork
  is done on the spot.
- As a chef, I want to finish the event and lock it so that its numbers count in my results and nobody changes them
  by mistake.

## Functional Requirements

### Must Have (P0)
- [x] Snapshot rules exactly as in Problem Statement §1, enforced on the server (freeze, no unfreeze, frozen
  snapshot never replaced except by «רענן תכנון»).
- [x] Snapshot content: per supplier Σ `lineCost` of the engine's raw lines (null supplier → "ללא ספק" row),
  extra costs, planned revenue, profit and profit % from `computeEventPricing`. Σ planned rows = food cost.
- [x] Closing dialog opens on entering "פוסט-פרודקשן" and from «סגירת אירוע» (shown from "ביצוע" onward).
- [x] Row per supplier: planned ₪ · actual paid ₪ · ☐ הגיע · ☐ יש חשבונית · photos (camera or file, several,
  max 10 per row). «הוסף ספק» (planned 0). "ללא ספק" row.
- [x] Actual extra costs (one amount, default = planned) and actual revenue (default = planned, editable).
- [x] Overrun: |actual − planned| ÷ planned > threshold → red "חריגה של X% (Y ₪)"; a decrease → grey with its %;
  planned 0 → amount only.
- [x] Footer: planned vs actual profit (₪ and %) and the difference; "חלקית" while any supplier amount is empty
  (empty counts as planned).
- [x] «סיים אירוע» (owner) → "הסתיים", data locked, warning "חסרים סכומים ל-X ספקים" when amounts are missing.
  «פתח מחדש» (owner) → "פוסט-פרודקשן". Both in stage history.
- [x] Amounts owner only; arrived, invoice, photo also staff. Server decides.
- [x] Accuracy per finished event = actual profit % − planned profit % (points) — computed by
  `computeClosingResult`, shown in the footer; plan 447 recomputes it on the server with the same formula.

### Should Have (P1)
- [x] «רענן תכנון» (owner) in the dialog header, with a confirm "התכנון יחושב מחדש לפי המחירים של היום".

### Nice to Have (P2)
- [ ] none.

## Design

Pure code (`src/app/core/engine/`):
- `plan-snapshot.ts`: `buildPlanSnapshot(cards: SupplierOrderCard[], pricing: <computeEventPricing result>, at:
  number): PlanSnapshot` (one row per card: `{ supplierId, name, plannedCost: card.total }`; 435's review lines carry
  no cost and are left out); `snapshotOnStageChange(nextStage, stored?: PlanSnapshot):
  'none' | 'store' | 'freeze' | 'store_and_freeze'` (ordering → store when absent or not frozen; execution /
  post_production → store_and_freeze when absent, freeze when present and not frozen; frozen → none; any other
  stage → none); `shouldRefreshOnSave(stage, stored?)` (stage ≥ ordering in `EVENT_STAGES` order, not
  `not_closed`/`finished`, and not frozen).
- `event-closing.ts`: `initClosing(snapshot): Closing` (one row per snapshot supplier, `planned = plannedCost`,
  flags false, photos []); `supplierVariance(planned, actual | undefined, thresholdPct)` → `{ kind: 'over' | 'under'
  | 'within' | 'none', pct: number | null, diff: number }`; `computeClosingResult(snapshot, closing)` → `{
  actualRevenue, actualCosts, actualProfit, actualProfitPct | null, plannedProfit, plannedProfitPct, profitDiff,
  accuracyPts | null, missingAmounts, partial }` with actualRevenue = `closing.actualRevenue ?? snapshot.plannedRevenue`,
  actualCosts = Σ (`actualPaid ?? planned`) + (`closing.actualExtraCosts ?? snapshot.extraCosts`). No rounding inside;
  display via `formatMoney` / `formatPct1`.

Client wiring:
- `PlanSnapshotService.buildFor(event)` (core service): `EventPlanService.planFor(event)`, `computePortions`,
  `toPricingEvent` + `computeEventPricing` with `BusinessService` settings, cards from
  `buildSupplierOrders(plan, KitchenStateService.productsById_(), KitchenStateService.suppliersById_())`.
- `MenuEventSaveService.prepareForSave(event, plan, editingId)`: when the stored event (by `editingId`) passes
  `shouldRefreshOnSave`, add `planSnapshot` from `buildPlanSnapshot` with the live `plan`.
- `EventPipelineService`: `changeStage(id, { stage, reason?, reasonText?, planSnapshot? })`, `saveClosing(id,
  closing)`, `finish(id)`, `reopen(id)`, `refreshPlan(id, planSnapshot)` — each writes the returned event into the
  store (443's `applyServerEvent`).
- `EventStageBarComponent`: before `changeStage`, if `snapshotOnStageChange(next, event.planSnapshot)` is not
  `none`, attach `PlanSnapshotService.buildFor(event)`; after entering `post_production`, open the dialog; shows
  «סגירת אירוע» from `execution` on and hosts `<event-closing-dialog>` in its own template (no page edit).

Server (`server/routes/events.js`, `server/utils/closing-rules.js`):
- `PUT /:id/stage` accepts optional `planSnapshot` (validated against the schema fragment); applies
  `applySnapshotOnStage(stored, nextStage, incoming, now)` (same rules as `snapshotOnStageChange`; sets
  `planSnapshot.frozenAt = now` on freeze).
- `PUT /:id/closing` `{ closing }`: 409 `{ error: 'EVENT_FINISHED', messageKey: 'event_finished_locked' }` when
  stage is `finished`; `diffClosing(stored.closing ?? initClosing(stored.planSnapshot), incoming)` → `{ money,
  arrival }`; `money` (any `actualPaid`, `actualExtraCosts`, `actualRevenue`, row added/removed or its `planned`)
  → `assertCan(req, res, 'editMoney', …)`; `arrival` (`arrived`, `hasInvoice`, `photos`) → `assertCan(…,
  'markArrival', …)`; validated `$set` of `closing`.
- `POST /:id/finish` (`editMoney`; only from `execution` or `post_production`, where the dialog is shown, else 400
  `FINISH_FROM_STAGE`; 409 `EVENT_FINISHED` when already finished): stage `finished`, push history `{ stage:
  'finished', at, by, byName }`, `closing.finishedAt = now`, `closing.finishedBy = userId`, `closedAt = now` when
  missing (`finishPatch` in `closing-rules.js`, same "closed" rule as 442). `POST /:id/reopen` (`editMoney`, only from
  `finished`): stage `post_production`, push history, `$unset` `closing.finishedAt` / `closing.finishedBy`.
  `POST /:id/refresh-plan` `{ planSnapshot }` (`editMoney`; 409 when finished): replace, keep `frozenAt`.
- `generic.js`: `closing` is dropped by plan 442's existing strip once it is in `EVENT_SERVER_FIELDS`; the only new
  code drops `planSnapshot` from a menuEvents PUT when the stored doc's `planSnapshot.frozenAt` is set.
- Schema: `planSnapshot` and `closing` strict objects per C-SNAPSHOT; amounts `min(0)`; `name` uses `nameField`;
  `photos: z.array(z.string().url().max(500).startsWith('https://res.cloudinary.com/')).max(10)`.

## UI/UX Notes
- `event-closing-dialog`: modal sheet (full height on phones), header (event name · «רענן תכנון» for the owner ·
  close), table-like rows on desktop, stacked cards on phones; footer sticky with the profit comparison and «סיים
  אירוע» / «פתח מחדש» (owner only). Locked state: all inputs disabled, `lock` icon, `event_finished_locked`.
  Reuse the shared modal shell (`src/app/shared/confirm-modal/` pattern), `c-*` engines; `cssLayer` skill first;
  logical properties only.
- Photo control: `<input type="file" accept="image/*" multiple>` (no `capture`, so phones offer camera or gallery),
  thumbnails 48 px, tap to open full size in a new tab; upload spinner per row.
- Variance colours from existing danger/muted tokens in `src/styles.scss`.
- Icons (all registered): `camera`, `image`, `lock`, `rotate-ccw`, `refresh-cw`, `plus`, `check`, `x`,
  `clipboard-list`.
- New `dictionary.json` keys (append to `general`):

| key | Hebrew |
|---|---|
| `event_closing_title` | סגירת אירוע |
| `event_closing_open` | סגירת אירוע |
| `closing_planned` | מתוכנן |
| `closing_actual_paid` | שולם בפועל |
| `closing_arrived` | הגיע |
| `closing_has_invoice` | יש חשבונית |
| `closing_photos` | תעודת משלוח |
| `closing_add_photo` | צלם / העלה |
| `closing_add_supplier` | הוסף ספק |
| `closing_actual_extra` | עלויות נוספות בפועל |
| `closing_actual_revenue` | הכנסה בפועל |
| `closing_planned_profit` | רווח מתוכנן |
| `closing_actual_profit` | רווח בפועל |
| `closing_difference` | הפרש |
| `closing_partial` | חלקית |
| `closing_overrun` | חריגה של {{pct}}% ({{amount}}) |
| `closing_missing_amounts` | חסרים סכומים ל-{{count}} ספקים |
| `closing_finish` | סיים אירוע |
| `closing_reopen` | פתח מחדש |
| `closing_refresh_plan` | רענן תכנון |
| `closing_refresh_confirm` | התכנון יחושב מחדש לפי המחירים של היום |
| `closing_no_plan` | אין תכנון שמור לאירוע הזה |
| `closing_photo_failed` | העלאת התמונה נכשלה – נסו שוב |
| `closing_saved` | נשמר |

Reused, not added: `no_supplier` "ללא ספק" (plan 434), `event_finished_locked` (plan 443).

## Atomic Sub-tasks
- [x] S1: Build the planning snapshot and its freeze rules as tested pure code — buildPlanSnapshot(cards from 435's buildSupplierOrders), snapshotOnStageChange, shouldRefreshOnSave + spec on the plan-433 fixture — src/app/core/engine/plan-snapshot.ts, src/app/core/engine/plan-snapshot.spec.ts
- [x] S2: Compute overruns, actual profit and pricing accuracy in one tested place — initClosing, supplierVariance, computeClosingResult + spec with the spec 08.1 acceptance numbers — src/app/core/engine/event-closing.ts, src/app/core/engine/event-closing.spec.ts
- [x] S3: Let an event store its frozen plan and its closing data — planSnapshot and closing strict objects in menuEventSchema (C-SNAPSHOT shapes, amount and photo limits); client MenuEvent model — shared/schemas/entities/menu-event.schema.ts, src/app/core/models/menu-event.model.ts
- [x] S4: Freeze the plan and save closings on the server, with owner-only amounts — events.js: planSnapshot on PUT /:id/stage, PUT /:id/closing, POST /:id/finish, POST /:id/reopen, POST /:id/refresh-plan per Design; closing-rules.js: applySnapshotOnStage, diffClosing, finishPatch; append 'closing' to EVENT_SERVER_FIELDS; generic.js: drop a frozen planSnapshot on menuEvents PUT; server test — server/routes/events.js, server/utils/closing-rules.js, shared/schemas/entities/event-stage.ts, server/routes/generic.js, server/test/events-closing.test.js
- [x] S5: Build the snapshot in the app and keep it fresh on save until execution — PlanSnapshotService.buildFor; MenuEventSaveService.prepareForSave adds planSnapshot when shouldRefreshOnSave; EventPipelineService gains planSnapshot on changeStage plus saveClosing/finish/reopen/refreshPlan + specs — src/app/core/services/plan-snapshot.service.ts, src/app/core/services/plan-snapshot.service.spec.ts, src/app/pages/menu-intelligence/services/menu-event-save.service.ts, src/app/pages/menu-intelligence/services/menu-event-save.service.spec.ts, src/app/core/services/event-pipeline.service.ts, src/app/core/services/event-pipeline.service.spec.ts
- [x] S6: Add the closing dialog with per-supplier payments, photos and the profit comparison — EventClosingDialogComponent (input eventId; rows from closing ?? initClosing(planSnapshot); variance per row with BusinessService overrunThresholdPct (default 10); photo = downscaleImage → CloudinaryService.upload → append URL → saveClosing; amounts disabled unless PermissionService.can('editMoney', …); arrived/invoice/photo need can('markArrival', …); finish with missing-amount confirm; reopen; refresh plan; locked when finished; "אין תכנון שמור" + refresh for events without a snapshot) + spec — src/app/pages/menu-intelligence/components/event-closing-dialog/**
- [x] S7: Take the snapshot on stage moves and open the closing dialog from the stage bar — attach planSnapshot per snapshotOnStageChange; open the dialog on entering post_production; «סגירת אירוע» button from execution on; host <event-closing-dialog> in the stage bar template; "הסתיים" pill reflects finish + spec — src/app/pages/menu-intelligence/components/event-stage-bar/**
- [x] S8: Add the Hebrew labels — keys from UI/UX Notes, appended — public/assets/data/dictionary.json
- [ ] S9: Build, test client and server, confirm the page is untouched, then hand over the checks — ng build, the Done-when ng test and server test commands, git diff --name-only on the page, log-query; slot servers up; [human] cards — this plan file

## Technical Considerations
- Dependencies: plans 442/443 (router, stage bar, `EventPipelineService`), 445 (`computeEventPricing`,
  `MenuEventSaveService`), 433/434/440 (engine, portions), 429 (`overrunThresholdPct`), 427/428 (permissions),
  `CloudinaryService`, `downscaleImage`, `ConfirmModalService`.
- New files needed: `plan-snapshot.ts`, `event-closing.ts` (+specs), `plan-snapshot.service.ts` (+spec),
  `components/event-closing-dialog/`, `server/utils/closing-rules.js`, `server/test/events-closing.test.js`.
- Model changes: `MenuEvent` gains `planSnapshot?`, `closing?` (C-SNAPSHOT).
- Backend / API: four new routes on the existing `/api/v1/events` router and an optional `planSnapshot` on `PUT
  /:id/stage` (contract extension below). Dedicated routes are justified: closing mixes owner-only and staff-allowed
  fields, and finish/reopen write stage + history + stamps atomically (INV-3).
- Auth and validation: `verifyToken`, business scope from plan 425, `assertCan` per field group; Zod validation of
  `planSnapshot` and `closing`; finished events locked (409).
- Security surface: new image URLs from the client — restricted to the Cloudinary host, ≤ 500 chars, ≤ 10 per row;
  uploads stay unsigned through the existing preset (no new secret); no OCR.
- Data / migration: none. Events already past "הזמנות" before this plan merges have no snapshot until the owner
  clicks «רענן תכנון» (the dialog offers it).
- Lazy loading: the dialog is imported by the stage bar inside the lazy menu-intelligence route.
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; no new icons;
  `[human]` checks on phone and desktop.

## Backend Impact
- Collections affected: `menuEvents` (`planSnapshot`, `closing`, `stage`, `stageHistory` written by the events
  router).
- New collections: no.
- Server changes needed: yes — routes in `server/routes/events.js`, helper `server/utils/closing-rules.js`, the
  menuEvents strip in `server/routes/generic.js`, schema in `shared/schemas`.

## Contracts (verbatim from the approved map)

**C-SNAPSHOT (446; consumed by 447)**
- `planSnapshot?: { at, frozenAt?, suppliers: { supplierId: string | null, name, plannedCost }[], extraCosts, plannedRevenue, plannedProfit, plannedProfitPct }`
- `closing?: { suppliers: { supplierId: string | null, name, planned, actualPaid?, arrived: boolean, hasInvoice: boolean, photos: string[] }[], actualExtraCosts?, actualRevenue?, finishedAt?, finishedBy? }`
- Pricing accuracy per finished event = actual profit % − planned profit % (points).

Contract extension (this plan): `PUT /api/v1/events/:id/stage` also accepts an optional `planSnapshot` in its
body (`{ stage, reason?, reasonText?, planSnapshot? }`); the server stores/freezes it by the rules above.
`POST /:id/reopen` removes `closing.finishedAt` / `closing.finishedBy`, so "finished" for plan 447 = `stage ===
'finished'` with `closing.finishedAt` set.

**C-STAGES (442; consumed by 443, 446, 447, 448)**
- Stage keys: `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `execution`, `post_production`, `finished`, `not_closed`. Order array `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`.
- Event fields: `stage`, `stageHistory: { stage, at, by, byName, reason?, reasonText? }[]`, `closedAt?` (first transition to deposit_paid or later; never changes), `notClosedAt?`, `notClosedReason?: 'price' | 'date_taken' | 'no_reply' | 'other'`, `notClosedText?`, `legacy?: boolean` ("ישן"), `notes: { _id, text /* ≤ 2000 */, at, by, byName, editedAt? }[]`, `clientName?`, `clientPhone?`, `deposit?: { amount?, date? }`.
- "Closed" = `closedAt` set. Active = stage not in {finished, not_closed}.
- Dedicated router `server/routes/events.js` at `/api/v1/events`: `PUT /:id/stage` `{ stage, reason?, reasonText? }`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId`, (446) `PUT /:id/closing`, `POST /:id/finish`, `POST /:id/reopen`, `POST /:id/refresh-plan`. Stage history/notes are written only by the server (generic PUT strips them).

**C-PRICING (445; consumed by 446, 447)**
- Event fields: `pricePerGuest?: number`, `extraCosts?: { amount: number, note?: string }`, `targetsOverride?: { profitTargetPct?: number, safetyMarginPct?: number }`.
- `src/app/core/engine/event-pricing.ts` `computeEventPricing(plan: EventPlan, event, settings) → { foodCost, extraCost, totalCost, revenue, revenueIsComputed, profit, profitPct | null, profitPerGuest, minPricePerGuest, safetyMarginAmount, meetsTarget, shortfallPerGuest, partial }`.
- On every save the client stores `pricing: { foodCost, revenue, profit, profitPct, partial, computedAt }` on the event (server dashboards read this, never run the engine).

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

## Out of Scope
- OCR of delivery notes, line-by-line weight checks, accounting or tax invoices.
- The dashboard accuracy card (plan 447 reads `closing` + `planSnapshot`).
- Locking the menu itself after finish (only the closing data locks).
- Back-filling snapshots for events already past "הזמנות" (the owner uses «רענן תכנון»).

## Critical Questions
None — spec 08.1 and the Part 4 decisions fix the rules. Choice made in this plan (no product impact): finish,
reopen and refresh-plan reuse the `editMoney` permission rather than adding a new action to C-PERM.
