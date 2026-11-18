# Plan 624 — Loading list for an event: what to put on the truck, printable, ticked as it is loaded

Status: draft
Depends-on: 616
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The truck leaves for an event without something, and there is no list to load from. Two things the app already
knows say what must go on the truck: the business's own equipment (how many of each it owns) and the logistics answers
of the event that the business itself brings ("needed", paid by us). Nothing puts them together.

This plan adds a loading list per event: one pure function builds the rows from the equipment records, the guest
count and the logistics answers; a printable sheet inside the event shows them with a tick per row; the ticks are kept
on the event so two people loading see the same state. The "things we always forget" are the business's own checklist
questions, not constants in code.

One gap must be closed for the equipment half to work: a quantity per guest count needs a rule on each equipment item
("one per N guests, at least X, at most Y"), the field exists in the schema, and no screen sets it today — plan 338
took the inputs out of the equipment form. This plan puts three inputs back (see Critical Questions).

Verified on `origin/main` (e916e48e, 2026-11-17):
- `shared/schemas/entities/equipment.schema.ts:8-12` — `ownedQuantity: z.number()`,
  `scalingRule: z.strictObject({ perGuests: z.number(), minQuantity: z.number(), maxQuantity: z.number().optional() }).optional()`.
  Nothing in `src/app` or `server/` reads `scalingRule` (the only hit is the type in
  `src/app/core/models/equipment.model.ts:3-17`, marked `@deprecated Plan 338`).
- The equipment form is `src/app/pages/equipment/components/equipment-form/equipment-form.component.ts` (206 lines),
  `.html` (62), `.spec.ts` (110) — routes `inventory/equipment/add` and `inventory/equipment/edit/:id`
  (`src/app/app.routes.ts:103-114`). It has `nameHebrew`, `category`, `ownedQuantity`, `isConsumable`, `notes`
  (`buildForm`, line 107) and saves with `{ ...equipment, … }` on edit (line 152), so a stored `scalingRule` survives.
  The path `src/app/pages/inventory/components/equipment-form/` named in the plan map does not exist.
- The equipment list is `src/app/pages/equipment/components/equipment-list/equipment-list.component.html` (340 lines)
  and `.ts` (553): `gridTemplate` `'2fr 1fr minmax(48px, 0.8fr) 0.8fr 80px auto'` (line 5), carousel cells
  `col-category`, `col-owned`, `col-consumable` (lines 129-139); its inline edit also saves with `{ ...equipment, … }`
  (line 408), so it keeps a stored rule without showing it.
- The dictionary already has the seven keys, unused: `scaling_rule` "כלל סקלה", `scaling_enabled` "הפעל סקלה",
  `per_guests` "לכל אורחים", `min_quantity` "כמות מינימלית", `max_quantity` "כמות מקסימלית",
  `scaling_summary` "{n} אורחים · מינ׳ {range}", `no_scaling` "—" (`public/assets/data/dictionary.json:647-653` area).
  Placeholders are filled with `.replace('{n}', …)` (pattern: `src/app/core/utils/prep-sheet-groups.util.ts:197`).
- A generic `PUT /api/v1/data/:type/:id` validates and writes `{ ...current, ...body }` with `$set`
  (`docs/brain/gotchas/backend.md` "A PUT merges over the stored doc"), so a field left out of the body is not
  removed: a rule is switched off by saving `perGuests: 0`, which the Contract already reads as "no rule".
- Logistics answers: `shared/schemas/entities/menu-event.schema.ts:154-177` — `status`, `payer` (`client | quoted |
  chef | ours`), `quantity?`, `label?` (ad-hoc), `section`; `siteLogistics.answers` is required inside `siteLogistics`
  and `siteLogistics` is server-owned (`EVENT_SERVER_FIELDS`, `shared/schemas/entities/event-stage.ts:17`).
  Plan 615 adds `siteLogistics.loaded?: [{ key (1–200), at, by, byName }]` (≤ 600).
- `server/routes/events.js` (350 lines): `loadEvent` (line 36, hides an event in a stage this staff member may not
  see), `validMerged` (line 44), `writeConditional` (line 175, conditional on the stage that was read, 409
  `STAGE_CHANGED`), `finishedLocked` (line 172, 409 `EVENT_FINISHED`), `PUT /:id/logistics` (line 287) which writes the
  whole `siteLogistics` object it read plus the new answers. Staff may `markArrival` on any event of their business
  (`server/utils/permissions.js:57`). Plan 616 adds `requireModule` to this file.
- The browser client of these routes is `src/app/core/services/event-pipeline.service.ts` (148 lines; `saveLogistics`
  line 67; `run` writes the returned event into the store and shows the error toast).
  `SiteLogistics` in `src/app/core/models/menu-event.model.ts:158-165` has no `loaded`.
- Prep sheets (`src/app/pages/menu-intelligence/components/prep-sheets/`, component 208 lines): opened by a signal of
  the page (`menu-intelligence.page.ts:165`, `:1032`) from the export sheet, rendered in a `@defer` block
  (`menu-intelligence.page.html:277-278`); printing is `window.print()` (line 164) with a body class
  `prep-sheets-open` set in the constructor and removed on destroy (lines 138-146), and print rules in
  `src/styles.scss:2100-2123` that hide everything except `app-prep-sheets`. The meta line under a title is
  `prepSheetMetaLine(event, t)` from `src/app/core/utils/prep-sheet-groups.util.ts`.
- `menu-intelligence.page.ts` is 1,045 lines and growth-frozen; the export sheet folder
  `menu-export-sheet/**` is in the scope of the open plan 471. The logistics card
  (`event-logistics-panel.component.html`, footer at lines 215-256) is rendered for every stored event and is visible
  to staff read-only.
- `EquipmentDataService` (`src/app/core/services/equipment-data.service.ts`) loads on `ensureLoaded()` only; the
  `menu-intelligence` routes do not resolve it (`src/app/app.routes.ts:209-232`).
- The popup frame is `app-modal-shell` (`src/app/shared/modal-shell/`, inputs `size`, `titleKey`, output `dismissed`);
  `reuse-lint` warns on a new hand-drawn `.c-modal-overlay`.
- Icons `truck`, `printer`, `x` are registered in `src/app/app.config.ts`. None of the new dictionary keys of this plan
  exists (checked one by one); `equipment` "ציוד", `owned_quantity` "כמות בבעלות", `prep_sheets_col_qty` "כמות",
  `prep_sheets_print` "הדפס", `close` "סגור" exist and are reused.

## Goals & Success Criteria
**Primary:** for a stored event, any member opens one sheet that lists what the business must load — its own equipment
in the quantity the guest count asks for, with a shortage where it owns too few, and every logistics item marked
"needed" that the business brings — prints it, and ticks rows as they go on the truck.

- [auto] `pnpm run test:server` passes, including `server/test/loading-list.test.js`: for a fixture (rule `perGuests 50, minQuantity 2, maxQuantity 4`, owned 3) the row is quantity 3 with no shortage at 150 guests and quantity 4 with shortage 1 at 220; `minQuantity` holds at 10 guests (quantity 2); without `maxQuantity` 500 guests give 10; equipment without a rule or with `perGuests: 0` gives no row; a deleted equipment record gives no row.
- [auto] The same test file: answers `needed · ours` and `needed · chef` give a row, `needed · client`, `needed · quoted`, `not_needed` and `unchecked` give none; a row's quantity is the answer's quantity when above 0, else 1; an ad-hoc answer's row is labelled with its `label`.
- [auto] `pnpm run test:server` passes, including `server/test/events-loading.test.js`: a staff member ticks a row (200, one `loaded` entry stamped with his id and name); ticking it again keeps the first stamp; unticking removes it; an event with no `siteLogistics` gets `{ answers: [], loaded: [...] }`; a finished event answers 409 `EVENT_FINISHED`; another business gets 404; a business without `event_logistics` gets 403 `MODULE_OFF`; a body without a boolean `loaded` or with an empty `key` answers 400 `BAD_LOADING`; two ticks sent at the same moment for different keys are both stored.
- [auto] `pnpm run test:ci` → passes, including `src/app/pages/menu-intelligence/components/loading-list/loading-list.component.spec.ts`, the new cases in `src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts` (a rule is saved; switching it off saves `perGuests: 0`; a maximum below the minimum blocks the save), `src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts` (the rule column) and `src/app/core/services/event-pipeline.service.spec.ts` (`saveLoading`).
- [auto] `pnpm run test:server` → passes.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `pnpm run lint` → exit 0.
- [auto] `pnpm run lint:icons` → exit 0.
- [auto] `pnpm run lint:reuse` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/menu-intelligence/<a new event>` whose logistics hold one ad-hoc item "מנגל פחמים" answered needed and paid by us, opening the logistics card and pressing "רשימת העמסה" shows a row "מנגל פחמים" (`e2e/ui/624-1.spec.ts`).
- [ui] On `/inventory/equipment/add`, switching on "הפעל סקלה" shows the field "לכל אורחים" (`e2e/ui/624-2.spec.ts`).
- [human] The printed sheet reads right in Hebrew: only the sheet on the paper, right-to-left, a box to tick on every row, the shortage visible.
- [human] Dandan sets a rule on two of his own equipment items and the quantities on an event's sheet are the ones he expects for its guest count.

## Execution Mode
- Parallel: no — a screen plan of `mod-events-ui`: after 623 in the same run (both write `src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts` / `.html` / `.spec.ts` and append to `public/assets/data/dictionary.json`), and never beside another screen run of the program (620, 628, 629, 630, 632, 634, 636, 637 append to the same `dictionary.json`). It edits `server/routes/events.js`, which 616 also edits (616 is merged in round 1; only a re-run of 616 could collide).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/logistics/loading-list.ts
server/routes/events.js
server/test/loading-list.test.js
server/test/events-loading.test.js
src/app/pages/menu-intelligence/components/loading-list/**
src/app/pages/menu-intelligence/components/loading-list/loading-list.component.spec.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.html
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/services/event-pipeline.service.spec.ts
src/app/core/models/menu-event.model.ts
src/app/core/models/equipment.model.ts
src/app/pages/equipment/components/equipment-form/**
src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.ts
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.spec.ts
public/assets/data/dictionary.json
e2e/ui/624-1.spec.ts
e2e/ui/624-2.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new route loads the event through `scopeFilter` and the staff-visibility rule (`loadEvent`), authorises with `assertCan(…, 'markArrival', { type: 'menuEvents', doc })` (any member of that business, as C-LOAD says) and writes only `siteLogistics.loaded`, a server-owned field the generic API strips; equipment is still written through the generic API with its existing checks.
- INV-4: preserves — the list is built by one pure function in `shared/schemas`; the tick is validated against `menuEventSchema` (`validMerged`) before the write; the equipment rule is saved in the existing `scalingRule` shape.
- INV-none: preserves — no tenancy, taxonomy, cross-document or AI rule is touched: the plan calls no model and reads only the caller's business.

## Reuse Check

- `buildLoadingList` in `shared/schemas/logistics/loading-list.ts` — family: none — rung: 4 — why: no code computes equipment quantities or a loading list today; it sits in `shared/schemas` beside the other pure rules (`front-desk/qualify.ts`) so the browser and server tests use one function.
- `loading-list` (`app-loading-list`, the sheet) — family: modal-shell — rung: 1 — why: rendered inside `app-modal-shell` (`size="fluid"`, `titleKey`, `dismissed`); no hand-drawn overlay.
- Empty sheet — family: empty-state — rung: 1 — why: `app-empty-state` with `loading_list_empty`.
- Waiting and messages on the sheet — family: feedback — rung: 1 — why: `app-loader` while equipment loads; a failed tick is toasted by `EventPipelineService`.
- Shortage mark and section headings — family: chip — rung: 1 — why: `c-chip c-chip--tag c-chip--red` for "חסר N"; no new chip.
- Open button "רשימת העמסה" in the logistics card footer and the sheet's buttons — family: engine-classes — rung: 1 — why: `.c-btn-ghost`, `.c-btn-primary`, `.c-icon-btn`; the tick is a native checkbox inside a table cell, as on the prep sheets.
- `EventPipelineService.saveLoading` — family: http — rung: 3 — why: one more method on the existing client of the events routes.
- Rule inputs in the equipment form — family: form-field — rung: 1 — why: three `app-form-field` rows with `c-input` numbers and one `c-chip c-chip--toggle` switch, the shapes the form already has.
- New local classes (layout only, no new engine class): `.loading-bar`, `.loading-actions`, `.loading-meta`, `.loading-group-title`, `.loading-table`, `.col-tick`, `.is-loaded`, `.loading-label` in the sheet; `.scaling-block`, `.scaling-title` in the equipment form — family: engine-classes — rung: 1 — why: flex/spacing wrappers around the engine buttons, chips and fields named above.
- Rule column in the equipment list — family: list-page — rung: 2 — why: one more `appColumnSlide` cell in the existing `app-column-carousel-cell` and one more track in `gridTemplate`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef the morning of an event, I want one list of everything we bring so that the truck does not leave without the generator.
- As a cook loading the truck, I want to tick each thing as it goes on so that the next person sees what is still missing.
- As the owner, I want the list to tell me when the event needs more of an item than I own so that I rent or borrow before the day.
- As the owner, I want to say once "one chafing dish per 25 guests, at least 2" so that every event's list is right without my counting.
- As a chef, I want to print the list so that it hangs by the door of the store room.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LOAD (624)**
  - `shared/schemas/logistics/loading-list.ts` → `buildLoadingList({ equipment, guestCount, answers }) →
    LoadingRow[]`, `LoadingRow = { key, label, source: 'equipment' | 'logistics', quantity, owned?, shortage?,
    section? }`. Pure; used by the browser and by server tests.
  - Equipment rows: every live equipment record with a `scalingRule` whose `perGuests > 0` —
    `quantity = min(max(ceil(guestCount / perGuests), minQuantity), maxQuantity ?? ∞)`,
    `shortage = max(0, quantity − ownedQuantity)`. Step 0: no screen sets `scalingRule` today; the unused dictionary
    labels agree with "one per `perGuests` guests, between min and max". 624 adds the inputs to the equipment form
    (switch `scaling_enabled`, numbers `per_guests`, `min_quantity`, `max_quantity`; the list row shows
    `scaling_summary` or `no_scaling`), with the keys that already exist.
  - Logistics rows: answers with `status: 'needed'` and `payer` `ours` or `chef`; `quantity` = the answer's
    quantity, else 1; `key` = `itemKey`.
  - Ticks: `menuEvents.siteLogistics.loaded?: [{ key, at, by, byName }]` (≤ 600), server-owned, written by
    `PUT /api/v1/events/:id/loading` body `{ key, loaded: boolean }` — any member of the business,
    `requireModule('event_logistics')`, not on a finished event. There is no permission action of its own: the route
    uses the existing `markArrival` action, so `permissions.js` is not edited.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-MODULES (616, 620; used by 624, 631, 633)**
  - `shared/schemas/modules.ts`: `MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create',
    'consultant_diag'] as const`; `DEFAULT_MODULES = ['events', 'event_logistics', 'frontdesk', 'ai_create']`;
    `modulesOf(business) → ModuleKey[]` — the stored list when the field is present, else `DEFAULT_MODULES`;
    `event_logistics` without `events` is dropped (logistics lives on an event); `hasModule(business, key)`.
  - `business.modules?: ModuleKey[]` (unique, ≤ 5). `business.platformHistory?` — ≤ 50 rows
    `{ at, by, byName, reason, changed: string[] }`. Both written only by the platform admin; a new business is
    created without `modules` (A1).
  - `server/middleware/require-module.js`: `requireModule(key | key[])` — after `verifyToken`; any one of the keys is
    enough; reads the business through `getBusiness`; a per-process cache of at most 30 s is allowed and is cleared
    by the platform write (and resettable in tests); answers 403 `{ error: 'MODULE_OFF', module }`.
    `requireHomeModule(key)` — the same test on `req.user.homeBusinessId ?? req.user.businessId` (C-ACCESS).
  - What each module covers:

    | Module | Server | Browser |
    |---|---|---|
    | `events` | `/api/v1/events/**`; generic types `menuEvents`, `venues` | header link `/menu-library`; chip group `menus`; the `venues` chip of the `dashboard` group; routes `menu-library`, `menu-intelligence`, `venues` |
    | `event_logistics` | `PUT /events/:id/logistics`, `PUT /events/:id/loading`, `/api/v1/ai/logistics/**` | the logistics panel and the loading sheet inside the event |
    | `frontdesk` | `/api/v1/requests/**`, `/bookings/**`, `/knowledge/**`; generic `requests`, `bookings`, `frontDeskProfiles`, `knowledgeItems`; `POST /business/front-desk-intake`; `POST /ai/knowledge-import`; `/stats/frontdesk`; the public router answers 404 for the business | chips `requests`, `bookings`, `knowledge`, `settings` of the `frontdesk` group; routes `requests`, `bookings`, `frontdesk/**` |
    | `events` or `frontdesk` | generic `clients`, `/api/v1/clients/**` | header link `/clients`, chip `clients`, routes `clients/**` |
    | `ai_create` | `POST /api/v1/ai/` `generate`, `parse-text`, `generate-from-url`, `generate-from-image`, `patch-recipe`, `generate-menu`, `patch-menu`, `generate-product`, `patch-product`, `generate-product-from-image`, `shots`, `shots/confirm`, `save-menu-shot` | every "create with AI" entry point (the buttons and the AI modals) |
    | `consultant_diag` | `/api/v1/diag/**`, `/api/v1/ai/diag/**` through `requireHomeModule` | the diagnosis entry in the acting banner / inventory group |

    Never gated: products, suppliers, equipment, recipes, dishes, cook view, taxonomy (all kinds stay readable),
    settings, team, Trash, `/stats/business`, `/stats/report`, `/api/v1/product-import/**`,
    `POST /ai/parse-price-list`, `parse-receipt-photo`, `match-product-names`, `/ai/invoices/**`, `/ai/voice/**`,
    `/ai/stock/**`, `/api/v1/stock/**`, `/api/v1/files/**`, every `/api/v1/admin/**` route.
  - The generic API gates by type in one place (`MODULE_OF_TYPE` in `shared/schemas/modules.ts`), before any read or
    write of that type.
  - Platform write: `PUT /api/v1/admin/businesses/:id/platform` body
    `{ modules?: ModuleKey[], aiMonthlyTokenCap?: number | null, aiPrivate?: boolean, reason: string (3–200) }` →
    writes the given fields, appends one `platformHistory` row, clears the module cache; `aiPrivate` goes through
    `setAiPrivate` (C-LEARN). `GET /api/v1/admin/businesses` rows gain `modules` (resolved), `aiPrivate`,
    `aiMonthlyTokenCap`, `aiTokensThisMonth` (C-AICAP).
  - Browser: `ModuleService` (`src/app/core/services/module.service.ts`) — `has(key)` computed from
    `BusinessService.business_()` with the same `modulesOf`; `moduleGuard(keys)` redirects to `/dashboard`; the header
    and the tab chips filter through it. The server gate is the gate; the browser only hides.
- [ ] `shared/schemas/logistics/loading-list.ts` (new, pure, no import from Angular, Node or the database) exports `type LoadingRow = { key: string; label: string; source: 'equipment' | 'logistics'; quantity: number; owned?: number; shortage?: number; section?: string }` and `buildLoadingList({ equipment, guestCount, answers }): LoadingRow[]`:
  - Inputs are structural: `equipment: { _id: string; nameHebrew: string; ownedQuantity: number; scalingRule?: { perGuests: number; minQuantity: number; maxQuantity?: number }; deletedAt?: number }[]`, `guestCount: number`, `answers: { itemKey: string; label?: string; section: string; status: string; payer?: string; quantity?: number }[]`.
  - Equipment rows, in the order given: skip a record with `deletedAt`, without `scalingRule`, or whose `perGuests` is not above 0. `guests = Number.isFinite(guestCount) && guestCount > 0 ? guestCount : 0`. `quantity = Math.min(Math.max(Math.ceil(guests / perGuests), minQuantity), maxQuantity ?? Infinity)`. Skip the row when `quantity <= 0`. Row: `{ key: 'eq:' + _id, label: nameHebrew, source: 'equipment', quantity, owned: ownedQuantity, shortage: Math.max(0, quantity - ownedQuantity) }`.
  - Logistics rows, after the equipment rows, in the order given: answers with `status === 'needed'` and `payer` `'ours'` or `'chef'`. Row: `{ key: itemKey, label: label ?? itemKey, source: 'logistics', quantity: quantity !== undefined && quantity > 0 ? quantity : 1, section }`. No `owned`, no `shortage`.
  - The function never reads `siteLogistics.hiddenKeys`; the caller leaves out the answers of questions hidden on the event.
  Not added to `shared/schemas/index.ts`; the server test requires `../generated/schemas/logistics/loading-list`, the browser imports `@schemas/logistics/loading-list`.
- [ ] `server/routes/events.js` — one route, placed after `PUT /:id/logistics`: `router.put('/:id/loading', verifyToken, requireModule('event_logistics'), handler)` (the import plan 616 added). Handler:
  1. `event = await loadEvent(req, res)`; none → return (404 already sent).
  2. `event.stage === 'finished'` → `finishedLocked(res)`.
  3. `assertCan(req, res, 'markArrival', { type: TYPE, doc: event })` — any member of the event's business.
  4. `const { key, loaded } = req.body ?? {}`; `typeof key !== 'string' || !key.trim() || typeof loaded !== 'boolean'` → 400 `{ error: 'BAD_LOADING' }`.
  5. `current = event.siteLogistics?.loaded ?? []`; `has = current.some(r => r.key === key)`. `loaded && has`, or `!loaded && !has` → `res.json(event)` with no write (the first stamp is kept).
  6. `row = { key, at: now, by: userId, byName: name }` from `actorOf(req)`; `next = loaded ? [...current, row] : current.filter(r => r.key !== key)`; `validMerged(res, { ...event, siteLogistics: { ...(event.siteLogistics ?? { answers: [] }), loaded: next } })` (a 601st row or a key over the schema's length answers 400 here).
  7. One atomic write through `writeConditional(req, res, event, update, 'events.loading.saved')` with an update pipeline, so two people ticking at the same moment do not overwrite each other and an event without `siteLogistics` gets a valid one:
     `[{ $set: { 'siteLogistics.answers': { $ifNull: ['$siteLogistics.answers', []] }, 'siteLogistics.loaded': { $concatArrays: [{ $filter: { input: { $ifNull: ['$siteLogistics.loaded', []] }, cond: { $ne: ['$$this.key', { $literal: key }] } } }, { $literal: loaded ? [row] : [] }] }, updatedAt: now } }]`.
     `$literal` is required: a key that starts with `$` must never be read as a field path.
  8. The log line is `events.loading.saved` with no key and no label (a key is a question text or an item name).
  The comment block above the route says: any member, `event_logistics`, not on a finished event, body `{ key, loaded }`. The file's header comment gains one line for plan 624. No other route of the file changes.
- [ ] `src/app/core/models/menu-event.model.ts`: `SiteLogistics` gains `loaded?: { key: string; at: number; by: string; byName: string }[]` with a one-line comment (plan 624, server-owned, written by `PUT /events/:id/loading`).
- [ ] `EventPipelineService.saveLoading(eventId: string, key: string, loaded: boolean): Promise<PipelineResult>` → `this.run('loading.save', 'server_error', () => this.http.put<MenuEvent>(`${EVENTS_URL}/${eventId}/loading`, { key, loaded }))`.
- [ ] `app-loading-list` (`src/app/pages/menu-intelligence/components/loading-list/loading-list.component.ts|html|scss|spec.ts`, new, standalone, OnPush). Input `eventId = input.required<string>()`; output `close = output<void>()`.
  - Reads the stored event from `MenuEventDataService.allMenuEvents_()` by id (so a tick or a logistics save updates the sheet), equipment from `EquipmentDataService.allEquipment_()` after `ensureLoaded()` in the constructor (`app-loader` until it resolves), sections from `LogisticsItemRegistryService`.
  - `rows_ = computed(() => buildLoadingList({ equipment, guestCount: event.guestCount, answers: (event.siteLogistics?.answers ?? []).filter(a => !hidden.has(a.itemKey)) }))` where `hidden` is `event.siteLogistics.hiddenKeys`. The guest count is the stored one; a change on the event screen that is not saved yet is not in the list.
  - Frame: `<app-modal-shell size="fluid" titleKey="loading_list" (dismissed)="close.emit()">`. A bar (class `no-print`): the progress text `loading_list_progress` with `{x}` = ticked rows and `{y}` = all rows, a `c-btn-primary` button (icon `printer`, text `prep_sheets_print`) that calls `window.print()`, and a `c-icon-btn` (icon `x`, `aria-label` `close`).
  - Under the bar, printed too: the event line from `prepSheetMetaLine(event, t)` (name · date · guests · serving type).
  - Groups, each a table with the columns tick · `loading_list_col_item` · `prep_sheets_col_qty`, and for the equipment group also `owned_quantity` and `loading_list_col_shortage`: first `equipment` (the `source: 'equipment'` rows), then one group per section that has `source: 'logistics'` rows, in `registry.sections_()` order, headed by `registry.sectionLabel(section) | translatePipe`. A group with no row is not rendered.
  - Tick: a checkbox per row, checked when `event.siteLogistics.loaded` has the row's `key`, `aria-label` `loading_list_mark_loaded` plus the row label. A change calls `saveLoading(eventId, key, checked)`; the row's checkbox is disabled while its call runs (`pendingKeys_` signal); a failure leaves the box as the stored state says (the pipeline service shows the toast). On a finished event every checkbox is disabled. A ticked row's label is struck through on screen and prints with a filled box.
  - Shortage: when `shortage > 0` the cell shows a `c-chip c-chip--tag c-chip--red` with the number; otherwise the cell is empty.
  - No rows at all: `app-empty-state` with `loading_list_empty`; the print button is disabled.
  - Printing: the constructor adds the body class `loading-list-open` and removes it on destroy (the prep-sheets pattern, `Renderer2` not needed for a class). `src/styles.scss` gets, appended and unlayered, a block "Plan 624: while the loading list is open, print only it": `@media print { body.loading-list-open *:not(:has(app-loading-list)):not(app-loading-list):not(app-loading-list *) { display: none !important; } body.loading-list-open *:has(app-loading-list) { margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; box-shadow: none !important; } body.loading-list-open app-loading-list .c-modal-overlay { position: static; display: block; overflow: visible; background: none; backdrop-filter: none; } body.loading-list-open app-loading-list .c-modal-card { inline-size: 100%; max-inline-size: none; max-block-size: none; overflow: visible; border: 0; box-shadow: none; } }`. The sheet's own print styles (black on white, 14pt, table borders, an empty square for an unticked box) live in the component's `.scss` under `@layer components.loading-list`.
  - Escape and a click outside close the sheet (the shell does both). Nothing is asked on close; there is nothing unsaved — every tick is saved when it is made.
- [ ] The logistics card (`event-logistics-panel.component.ts|html`): a signal `loadingOpen_ = signal(false)`; in `.logistics-footer`, before the copy-summary button and outside every `canEdit_()` test, a `c-btn-ghost` button (icon `truck`, text `loading_list`) that sets it; at the end of the template `@if (loadingOpen_()) { @defer { <app-loading-list [eventId]="eventId()!" (close)="loadingOpen_.set(false)" /> } }`. Staff (read-only on the card) see and use the button. `menu-intelligence.page.ts` and `.html` are not opened.
- [ ] Equipment form (`equipment-form.component.ts|html|scss`): a block titled `scaling_rule` after the owned-quantity field:
  - controls added in `buildForm`: `scalingEnabled: [false]`, `perGuests: [null]`, `minQuantity: [1]`, `maxQuantity: [null]`; `hydrateForm` sets `scalingEnabled = (e.scalingRule?.perGuests ?? 0) > 0` and the three numbers from the stored rule (a stored `perGuests: 0` shows as switched off with the default numbers);
  - template: the hint `scaling_rule_hint`; a `c-chip c-chip--toggle` checkbox `scaling_enabled`; when it is on, three `app-form-field` rows with `c-input` numbers — `per_guests` (`min="1"`, `step="1"`), `min_quantity` (`min="0"`, `step="1"`), `max_quantity` (`min="0"`, `step="1"`, may be empty). A mirror signal `scalingEnabled_` follows the control the way `category_` does (line 96), so the OnPush template shows and hides the rows;
  - `validateForm_` adds, only when the switch is on: `perGuests` not a whole number of at least 1 → `validationErrors_['perGuests'] = 'scaling_per_guests_required'`; `minQuantity` empty or below 0 → `'scaling_min_required'`; `maxQuantity` filled and below `minQuantity` → `validationErrors_['maxQuantity'] = 'scaling_max_below_min'`. The errors show through the `[error]` input of the three fields;
  - `save_`: switch on → `scalingRule: { perGuests, minQuantity, ...(maxQuantity filled && { maxQuantity }) }` (numbers through `Number(...)`). Switch off on an item that had a rule → `scalingRule: { perGuests: 0, minQuantity: 0 }` (a field left out of a PUT stays stored). Switch off on a new item or one that never had a rule → no `scalingRule` in the body.
  - The existing leave question (`useUnsavedChanges` on the form group) covers the new controls with no extra code; cancel leaves as today.
- [ ] Equipment list (`equipment-list.component.ts|html`): one more carousel column after `col-owned` — header cell `col-scaling` with `label="scaling_rule"` and the text `'scaling_rule' | translatePipe` (not sortable), body cell showing `scalingSummary(item)`; `gridTemplate` becomes `'2fr 1fr minmax(48px, 0.8fr) 1.2fr 0.8fr 80px auto'` (the mobile template is unchanged: the carousel shows one of the sliding columns at a time). `protected scalingSummary(item: Equipment): string` → when `item.scalingRule` has `perGuests > 0`: `translate('scaling_summary').replace('{n}', String(perGuests)).replace('{range}', maxQuantity !== undefined ? `${minQuantity}–${maxQuantity}` : String(minQuantity))`; else `translate('no_scaling')`. The inline edit panel is not changed (it keeps a stored rule through its spread).
- [ ] `src/app/core/models/equipment.model.ts`: remove the two `@deprecated Plan 338` comments on `ScalingRule` and `scalingRule` and write instead: plan 624 — one item per `perGuests` guests, between `minQuantity` and `maxQuantity`; `perGuests: 0` means no rule.
- [ ] `public/assets/data/dictionary.json` → `general`: the keys of UI/UX Notes, appended.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Where: the sheet opens from a button in the footer of the event's logistics card and covers the screen as a popup (phone: full width). It sits in the folder beside the prep sheets and prints the same way (the browser's print dialog, only the sheet on the paper). The equipment rule is edited on `/inventory/equipment/add` and `/inventory/equipment/edit/:id`; the list at `/inventory/equipment` shows it.
- Hebrew RTL; logical CSS only; numbers in table cells use `.c-num`. No new `.c-*` class.
- What happens on: **edit** — a tick is saved at once, row by row; **leave / close / cancel** — nothing is lost and nothing is asked; **error** — a failed tick shows the pipeline's toast and the box returns to the stored state; equipment that fails to load leaves the logistics rows on the sheet; **empty** — the empty-state text and a disabled print button; **finished event** — the list shows and prints, the boxes are disabled.
- Dictionary keys to append (key — Hebrew value — meaning):
  - `loading_list` — "רשימת העמסה" — loading list (the button and the sheet title)
  - `loading_list_col_item` — "פריט" — item
  - `loading_list_col_shortage` — "חסר" — short by
  - `loading_list_progress` — "נטענו {x} מתוך {y}" — loaded x of y
  - `loading_list_mark_loaded` — "סמן שנטען:" — mark as loaded (read before the row's name by a screen reader)
  - `loading_list_empty` — "אין עדיין מה להעמיס. סמנו פריטים בלוגיסטיקה כ״נדרש״ ו״עלינו״, או הגדירו כלל סקלה לציוד." — nothing to load yet; mark logistics items as needed and ours, or set a scaling rule on equipment
  - `scaling_rule_hint` — "פריט אחד לכל מספר האורחים שתקבעו, בין המינימום למקסימום. לפי זה נבנית רשימת ההעמסה לאירוע." — one item per the number of guests you set, between the minimum and the maximum; the event's loading list is built from this
  - `scaling_per_guests_required` — "יש להזין מספר אורחים שלם, 1 לפחות" — enter a whole number of guests, at least 1
  - `scaling_min_required` — "יש להזין כמות מינימלית, 0 לפחות" — enter a minimum quantity, 0 or more
  - `scaling_max_below_min` — "הכמות המקסימלית קטנה מהמינימלית" — the maximum is below the minimum
- Reused keys (already in the dictionary, values verified): `scaling_rule` "כלל סקלה", `scaling_enabled` "הפעל סקלה", `per_guests` "לכל אורחים", `min_quantity` "כמות מינימלית", `max_quantity` "כמות מקסימלית", `scaling_summary` "{n} אורחים · מינ׳ {range}", `no_scaling` "—", `equipment`, `owned_quantity`, `prep_sheets_col_qty`, `prep_sheets_print`, `close`, `logistics_section_*`.
- Lucide icons: `truck`, `printer`, `x` — all already registered in `src/app/app.config.ts`; no icon is added. `pnpm run lint:icons` confirms.
- Canonical values: none entered; the rule is three numbers and the sheet shows names that already exist.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Build the one function that decides what goes on the truck and how many — `buildLoadingList` and `LoadingRow` as specified; server tests for the 150 and 220 guest fixture, the minimum, the open maximum, no rule, `perGuests: 0`, a deleted record, each status and payer, the quantity fallback, the ad-hoc label, the row order — shared/schemas/logistics/loading-list.ts, server/test/loading-list.test.js
- [x] A2: Keep the ticks on the event so everyone loading sees the same list — `PUT /:id/loading` with the eight handler steps and the atomic update; tests seeded the way the logistics route test of plan 519 seeds its events (`stored(menuEventBody(…))`; owner, staff, outsider, finished, module off through `clearModuleCache`, bad body, repeat tick, untick, no `siteLogistics`, two ticks at once with `Promise.all`) — server/routes/events.js, server/test/events-loading.test.js
- [x] A3: Let the browser read and send a tick — the `loaded` field on the event type and `saveLoading` on the events client, with a spec case for the URL and body — src/app/core/models/menu-event.model.ts, src/app/core/services/event-pipeline.service.ts, src/app/core/services/event-pipeline.service.spec.ts
- [x] A4: Show the list as a sheet that can be ticked and printed — `app-loading-list` in the popup frame: the bar, the event line, the equipment group and the section groups, the tick with its waiting state, the shortage mark, the empty state, the finished-event state, the print class and print styles; spec with stubbed services for each of these — src/app/pages/menu-intelligence/components/loading-list/loading-list.component.ts, .html, .scss, .spec.ts, src/styles.scss
- [x] A5: Open the sheet from the event's logistics card for every member — the `loadingOpen_` signal, the footer button outside the edit test, the deferred sheet tag; panel spec cases: the button shows for staff and opens the sheet — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts, .html, .spec.ts
- [x] A6: Let the owner say how many of an equipment item an event needs — the switch and three numbers in the equipment form, their validation, the save rule including switching off with zero; the model comment; spec cases for save, switch off, a bad maximum and hydrating a stored rule — src/app/pages/equipment/components/equipment-form/equipment-form.component.ts, .html, .scss, .spec.ts, src/app/core/models/equipment.model.ts
- [x] A7: Show each item's rule in the equipment list so a missing one is seen at a glance — the `col-scaling` header and cell, `scalingSummary`, the wider grid template; spec cases for an item with a rule, with an open maximum and with none — src/app/pages/equipment/components/equipment-list/equipment-list.component.ts, .html, .spec.ts
- [x] A8: Add the Hebrew texts of the sheet and the rule to the dictionary — the ten keys of UI/UX Notes appended to `general`, each checked as absent first; the seven existing keys are used as they are — public/assets/data/dictionary.json
- [x] A9: Script the two on-screen checks — `624-1` (create an event, save one ad-hoc answer needed and ours through `PUT /api/v1/events/:id/logistics`, open the card, press the button, expect the row, delete the event) and `624-2` (open the add-equipment form, switch the rule on, expect the field label); both sign in with `signInQa` and save a screenshot under `screens/` — e2e/ui/624-1.spec.ts, e2e/ui/624-2.spec.ts
- [ ] A10: Run the full checks and hand Dandan the two hand checks — `pnpm run test:server`, `pnpm run test:ci`, both lints, `pnpm run lint:icons`, `pnpm run lint:reuse`, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines into Execution Notes; then the [human] cards — server/test/events-loading.test.js

## Technical Considerations
- Dependencies: plan 615 (`siteLogistics.loaded` in `menuEventSchema`), plan 616 (`requireModule` in `server/routes/events.js`, `clearModuleCache` for the test), `EventPipelineService`, `MenuEventDataService`, `EquipmentDataService`, `LogisticsItemRegistryService`, `app-modal-shell`, `prepSheetMetaLine`. After plan 623 in the same run (the logistics card files).
- New files needed: `shared/schemas/logistics/loading-list.ts`, `server/test/loading-list.test.js`, `server/test/events-loading.test.js`, `src/app/pages/menu-intelligence/components/loading-list/loading-list.component.{ts,html,scss,spec.ts}`, `e2e/ui/624-1.spec.ts`, `e2e/ui/624-2.spec.ts` (all new).
- Model changes: `SiteLogistics.loaded?` (browser type); the comments on `ScalingRule`. No schema change (615 made it).
- Backend / API: `PUT /api/v1/events/:id/loading` body `{ key, loaded }` → 200 the event; errors 400 `BAD_LOADING` / `Validation failed`, 403 `MODULE_OFF` / `FORBIDDEN`, 404, 409 `EVENT_FINISHED` / `STAGE_CHANGED`. It shares the events router's write limiter. Why a dedicated route: `siteLogistics` is server-owned and the tick is stamped with the actor from the token, like every other field of that object.
- Auth and validation: any member of the event's business (`markArrival`), `requireModule('event_logistics')`, not on a finished event; body types checked, the merged document checked against the schema. The equipment rule is saved through the generic API with its existing owner / creator rules and the existing schema.
- Security surface: one new write input (a key string and a boolean), bounded by the schema (key ≤ 200, 600 rows) and written with `$literal`; the server does not check that a key is a row of the list — a member could store a tick for a key that shows nowhere, which harms nothing and is capped. No secret, no file, no model.
- Data / migration: none. `siteLogistics.loaded` appears on an event at its first tick. A logistics save that reads the event in the same instant as a tick writes back the `loaded` it read; the window is one request long and the next tick or reload shows the stored state — accepted, noted here so it is not rediscovered.
- Project checks: `[auto] log-query` present; every new dictionary key named with its Hebrew value and the seven existing ones verified; icons named (all registered); Reuse Check lists every control; RTL and logical CSS stated; `pnpm run test:ci` and `pnpm run test:server` in the Done-when; shapes in `shared/schemas`; no new collection.
- Growth-frozen file: `menu-intelligence.page.ts` and `.html` are not in the Read-Write Scope — net lines 0. The sheet is opened from the logistics card because the page may not grow and the export sheet folder belongs to the open plan 471.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Equipment needed by the menu's recipes or by the venue type (`logistics.resolvedItems`, the recipe logistics picker): the list uses the per-guest rule only.
- Renting, ordering or pricing a shortage; the list only shows it.
- Editing a quantity on the sheet, adding a row on the sheet, or a tick for "returned after the event".
- An Excel export of the list.
- The rule inputs in the equipment list's inline edit panel and in the bulk edit bar.
- A button for the list on the event's export sheet (`menu-export-sheet/**`, plan 471) or anywhere in `menu-intelligence.page.*`.
- A row for the route in `docs/agent/standards-backend.md` §5 (one docs change after the program's server rounds).

## Critical Questions
- Q: The loading list needs a scaling rule per equipment item and no screen sets one today (plan 338 removed the inputs as "meaningless"). a) add "one per N guests, min, max" to the equipment form in this plan (recommended) / b) loading list shows owned equipment without scaling A: a — the Human, 2026-11-17: the scaling inputs return to the equipment form in this plan.

## Execution Notes
- decided: the plan is written for answer a) of the Critical Question — why: without a rule the equipment half of the list cannot say a quantity or a shortage, which is the point of MP-04.
- decided: the equipment form lives at `src/app/pages/equipment/components/equipment-form/`, not under `pages/inventory/` as the map's delta 3 says — why: that is where the file is on `origin/main`; the scope uses the real path.
- decided: switching a rule off saves `perGuests: 0, minQuantity: 0` — why: the generic PUT merges over the stored document, so leaving the field out would keep the old rule; C-LOAD already reads `perGuests > 0` as "has a rule".
- decided: the sheet opens from the logistics card's footer, not from the export sheet next to the prep sheets — why: `menu-intelligence.page.ts` is growth-frozen and `menu-export-sheet/**` is in open plan 471's scope; the card is on every stored event, is covered by the `event_logistics` module in the browser (plan 620), and is visible to staff.
- decided: the sheet uses `app-modal-shell` and gets its own print rules, instead of copying the prep sheets' hand-drawn overlay — why: the registry forbids a new hand-drawn overlay; only the print mechanics (body class, `window.print()`) are followed.
- decided: the route authorises with the existing action `markArrival` — why: C-LOAD says any member of the business; `markArrival` is the existing any-member event action and a new action would mean editing `server/utils/permissions.js`, a shared registry file.
- decided: an equipment row's key is `eq:<_id>` — why: it can never collide with a question text or an `adhoc:` key, and it survives a rename of the item.
- decided: a repeated tick keeps the first stamp; the write is one atomic pipeline update per key — why: who loaded it first is the fact worth keeping, and two people tick at the same time on a loading dock.
- decided: rows keep the order of the inputs; a logistics quantity of 0 or none counts as 1; a computed quantity of 0 gives no row — why: the function stays pure and predictable; "needed" with no number still means one thing to load.
- decided: answers of questions hidden on the event are left out by the caller — why: the panel leaves them out of its counts and of the client summary the same way.
- decided: the server accepts a tick for any key — why: checking it would mean loading equipment and rebuilding the list on every tick; the schema caps the damage at 600 short rows.
- decided: the equipment list gets a rule column; its inline edit does not get the inputs — why: C-LOAD asks for the summary in the list row; the inline panel keeps a stored rule untouched and the full form is one tap away.
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → 0 errors; `pnpm run test:ci` → 2362 SUCCESS; `pnpm run test:server` → 131 files, 1753 passed (incl. loading-list.test.js, events-loading.test.js); `pnpm --dir server run lint` → 0 errors; `lint:icons`, `lint:reuse`, `lint:no-native-select` → ok; kit-manifest-check → ok; `log-query --level=error` → SKIP (no database configured).
- evidence: `kit-checks.mjs` still reports 2 `reuse-registry-missing-piece` findings: `docs/brain/component-families.md` needs a family heading naming `buildLoadingList` (rung 4) and a line under "### http" naming `EventPipelineService.saveLoading` (rung 3). That file is outside this plan's scope → ESCALATE with `approved: docs/brain/component-families.md`.
- decided: the equipment-form rule inputs sit in `<div appNumberBox>` (lint:reuse requires it); print colours use `CanvasText`/`Canvas` and `--fs-md` (the kit refuses raw colours and sizes).
- not run: the two `[ui]` e2e specs (`e2e/ui/624-1.spec.ts`, `624-2.spec.ts`) are written, not run.
