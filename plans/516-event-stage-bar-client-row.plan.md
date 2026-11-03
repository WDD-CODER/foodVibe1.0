# Plan 516 — Show the event client as a read-only row with owner change and link on the stage bar

Status: draft
Track: code
Snapshot: 6cfe7dc004ac51bde0aac3da99294b341d76a975
Depends-on: 514

## Problem Statement
The stage bar on the menu screen has editable client name and phone inputs, so the same client is edited differently on every event and the menu carries data that belongs to the client. This plan replaces those inputs with a read-only client row (name · phone · N events), lets the owner change or link the client with the same combobox, and leaves the deposit fields where they are.

## Goals & Success Criteria
- Primary: the menu screen shows who the client is without editing client fields; the event's client can be changed or linked by the owner.
- Success:
  - `[auto]` `npx ng test --watch=false --include='**/event-stage-bar/**'` passes (updated spec + 3 new: row renders from `ClientDataService` when `clientId` set; falls back to snapshot strings when not; `(picked)` calls `updateMenuEvent` with `clientId`, `clientName`, `clientPhone`).
  - `[auto]` `npm run build` and `npm run lint` pass.
  - `[auto]` `node scripts/scope-check.mjs --reuse --plan=plans/516-event-stage-bar-client-row.plan.md` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` returns no entries.
  - `[ui]` Owner opens a linked event → row shows `שם` `טלפון` `N אירועים` chips; "החלף לקוח" opens the combobox; picking another client updates the row without reload.
  - `[ui]` Owner opens a legacy unlinked event → row shows the snapshot name/phone and "קשר ללקוח".
  - `[ui]` Staff opens an event → row shows name and phone chips only; no change/link button; deposit toggle visible but inputs disabled as today.
  - `[human]` Print view unchanged (`.stage-bar` is `no-print`).

## Execution Mode
- Parallel: yes — shares only the hotspot `dictionary.json` with Plan D
- Concurrent plans: 515
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
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

- INV-none: preserves — UI only; writes go through `MenuEventDataService.updateMenuEvent` (events) exactly as the removed inputs did; client docs are never written from this screen.

## Reuse Check

- Client row chips — family: chip — rung: 2 — why: `.c-chip--tag` inside the existing `.stage-links` row, phone chip with `dir="ltr"`; no new component.
- Change/link combobox — family: search-combobox — rung: 1 — why: `app-search-combobox` in `variant="plain"`, pick-only (no `addLabelKey`).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## Contract
```
Collection: clients   { name:'clients', userData:true, cloneable:false, backup:true, searchable:false, softDelete:false }
Schema file: shared/schemas/entities/client.schema.ts
  exports: CLIENT_TYPES = ['private','business','production_company'] as const
           clientTypeSchema = z.enum(CLIENT_TYPES)
           clientSchema = z.strictObject({ ...baseDocShape,
             name: nameField,                               // required, <=200
             phone: z.string().min(7).max(30).regex(/^[0-9+\-\s()]{7,20}$/),
             phoneNormalized: z.string().max(30),           // digits only, SERVER-derived on every write
             clientType: clientTypeSchema.default('private'),
             companyName: z.string().max(200).optional(),
             email: z.string().max(200).optional(),
             notes: z.string().max(2000).optional(),
             source: z.string().max(100).optional() })
  registered in shared/schemas/entities/index.ts: SCHEMA_BY_COLLECTION.clients, export type Client
menuEvents: menuEventSchema gains clientId: z.string().optional() (next to clientName). clientName / clientPhone stay as a snapshot.
Permissions (server/utils/permissions.js):
  OWNER_ONLY_TYPES = new Set(['clients'])  → staff get { ok:false, reason:'OWNER_ONLY_TYPE' } on create|edit|delete
  staffProjection(type) → Mongo projection { <field>:0 } for every top-level schema key not in STAFF_READ_FIELDS[type] and not a base field; null when no entry
STAFF_READ_FIELDS (shared/schemas/staff-fields.ts): { clients: ['name','phone'] }
Client side:
  src/app/core/models/client.model.ts            → Client, ClientType, CLIENT_TYPES
  src/app/core/services/client-data.service.ts   → ClientDataService extends BaseEntityDataService<Client>
                                                   { allClients_, getClientById(id), addClient(body), updateClient(client) }
  src/app/core/resolvers/clients-ensure-loaded.resolver.ts → resolve key `clientsLoaded`
  src/app/core/utils/client-display.util.ts      → normalizePhone(s), clientLabel(c, eventCount, countWord), matchesClientQuery(c, q)
  MenuEvent (src/app/core/models/menu-event.model.ts) gains clientId?: string
Dictionary keys (public/assets/data/dictionary.json → "general", append only):
  client "לקוח" · client_pick_placeholder "שם או טלפון" · client_new "לקוח חדש" · client_change "החלף לקוח" · client_link "קשר ללקוח"
  client_events_count "אירועים" · client_type "סוג לקוח" · client_type_private "פרטי" · client_type_business "עסקי"
  client_type_production_company "חברת הפקה" · client_company_name "שם חברה" · client_email "אימייל" · client_notes "הערות לקוח"
  client_source "מקור הגעה" · client_more_details "עוד פרטים" · deposit_details "מקדמה" · client_required "חובה לבחור לקוח"
  client_ask_owner "לקוח חדש? בקשו מבעל העסק להוסיף אותו"
Decisions already taken by the Human (do not reopen):
  stage stays on the event, never on the client · clients are owner-only to write · staff read name+phone only
  migration groups by phoneNormalized, then by trimmed clientName when no phone · softDelete false, no delete UI in P1
```

## User Stories
- As a chef, I want the menu screen to show who the client is without editable client fields so that client data is edited in one place only.
- As an owner, I want to re-link an event to the right client when it was created against the wrong one or before clients existed.

## Functional Requirements

### Must Have (P0)
- [ ] Remove `onClientNameChange`, `onClientPhoneChange`, `isPhoneInvalid_` and the `#stage-client-name` / `#stage-client-phone` inputs; the `.client-details` block keeps only the deposit fields; the toggle label becomes `deposit_details`; `detailsSummary_` summarises the deposit only (amount · date when set).
- [ ] `client_ = computed(() => { const id = this.event_()?.clientId; return id ? this.clientData.getClientById(id) : null })`; `clientEventCount_ = computed(() => count of allMenuEvents_() with the same clientId)`; `canChangeClient_ = computed(() => this.permission.can('edit', { type: 'clients' }))` (true for owner only, since `clients` is owner-only).
- [ ] Client row in `.stage-links` (first item): name chip (`client_()?.name ?? event.clientName`), phone chip `dir="ltr"` (`client_()?.phone ?? event.clientPhone`), count chip `N אירועים` when `client_()` and count > 0; when neither client nor snapshot exists, show the `client` label dimmed.
- [ ] Owner button: `client_change` when `clientId` set, `client_link` otherwise; toggles an inline `app-search-combobox` (`variant="plain"`, `options = clientData.allClients_()`, `clientFilter = matchesClientQuery`, `labelOf = clientLabel`, `keyOf`, `minChars = 2`, no `addLabelKey`); `(picked)` → `saveFields(event, { clientId: c._id, clientName: c.name, clientPhone: c.phone })` then closes the combobox.
- [ ] Dictionary keys from the Contract appended under `general` (same 18 as Plan D; the second plan to merge keeps both sides, no duplicates).

### Should Have (P1)
- [ ] Count chip is a plain `<span>`; it becomes a link to the client page in P2 (not now).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; chips use `.c-chip--tag`; phone chip `dir="ltr"`.
- Row order (RTL, right to left): name · phone · count · [change/link button].
- The stage pills row above is untouched.
- Dictionary keys needed: `client`, `client_change`, `client_link`, `client_events_count`, `client_pick_placeholder`, `deposit_details` (append the full Contract list so D and E stay identical).

## Atomic Sub-tasks
- [x] U1: Add the same Hebrew client texts so the stage bar and the dialog share one list — the 18 Contract keys under `general` in `public/assets/data/dictionary.json`, append only; skip keys already present — files: dictionary.
- [x] U2: Remove the editable client name and phone from the stage bar and keep the deposit fields — delete `onClientNameChange`, `onClientPhoneChange`, `isPhoneInvalid_` and the two inputs from `event-stage-bar.component.ts/html`; keep deposit inputs; relabel the toggle `deposit_details`; `detailsSummary_` → deposit summary — files: the component ts/html/scss.
- [x] U3: Show the event client as a read-only row with name, phone and event count — inject `ClientDataService`; add `client_`, `clientEventCount_`, `canChangeClient_`; render the chips per P0 as the first item in `.stage-links` — files: the component ts/html/scss.
- [x] U4: Let the owner change or link the event client from the stage bar — `isPickerOpen_` signal, owner-only button, inline `app-search-combobox` pick-only, `(picked)` → `saveFields` with the three fields, close on pick and on Escape — files: the component ts/html.
- [x] T1: Update the stage bar tests for the removed inputs and the new client row — remove tests for the deleted handlers; add the 3 tests named in Success Criteria with stubbed `ClientDataService`, `MenuEventDataService`, `PermissionService` — files: `event-stage-bar.component.spec.ts`.
- [x] V1: Run the checks, capture the three UI cards and write the evidence in the Execution Notes — Run `npm run build`, `npm run lint`, the spec, the reuse gate and the log check; produce the three `[ui]` cards; write evidence under `## Execution Notes`.

## Technical Considerations
- Dependencies: `ClientDataService`, `MenuEventDataService.updateMenuEvent` (via existing `saveFields`), `PermissionService.can`, `app-search-combobox`, `clientLabel`, `matchesClientQuery`.
- New files needed: none.
- Model changes: none (Plan C).
- Backend / API: none.
- Auth and validation: owner-only button by `PermissionService`; the event write is authorized by the server as today.
- Security surface: none new.
- Data / migration: none.
- Project checks: log-query no errors; Reuse Check gate; dictionary append-only; Hebrew RTL + `translatePipe`.

## Out of Scope
- Editing client fields from the menu screen. Link to the client page (P2). Inquiry dialog (Plan D).

## Critical Questions
- none.

## Execution Notes
- Interactive behaviour (declared for readiness): **on edit** — there are no editable client fields; deposit edits behave as today; **on leave** while the picker is open → picker closes, nothing written; **on cancel** (Escape / click outside the picker) → picker closes, event unchanged; **on error** of `updateMenuEvent` → existing toast path of `saveFields`, row keeps the previous client.
- Orchestrator readiness (2026-11-03): the plan's combobox wiring (clientFilter = matchesClientQuery, labelOf = clientLabel, (picked) → c._id) does not match the code (clientFilter is a boolean; clientLabel takes 3 arguments; picked emits { option, source }) → default: build for what the code has, as plan 515 does (pre-filter with matchesClientQuery, [clientFilter]="false", wrap clientLabel, read $event.option); log the difference as seen: (delegated)
- Plan error for the Planner (2026-11-03): combobox wiring written from memory, not read from search-combobox.component.ts and client-display.util.ts. Lesson: read the shared component's inputs, outputs and helper signatures before writing wiring into a plan.
- Validation cards (2026-11-03): the linked event and the legacy event must be given as a ready copy-paste command with a real event id from the local dev DB (five events there already have a clientId; the legacy case is one `` of clientId on a named event), never as "create one by hand".

- Builder evidence (2026-11-03): spec `pnpm exec ng test --watch=false --browsers=ChromeHeadless --include='**/event-stage-bar/**/*.spec.ts'` -> 34 pass, 0 fail (the plan's `--include='**/event-stage-bar/**'` also matches the html/scss and fails to load: plan error, use the `*.spec.ts` glob). `pnpm run build` -> exit 0; `pnpm run lint` -> 0 errors (67 existing warnings); `pnpm run test:ci` -> 1704 pass; `node scripts/kit-manifest-check.mjs` -> ok; `scope-check --reuse` -> ok.
- U1: the 18 dictionary keys were already present under `general` (plan 515 merged first); nothing appended.
- Combobox wired as plan 515 does (pre-filter with matchesClientQuery, `[clientFilter]="false"`, wrapped clientLabel, `$event.option`).
- UI items not scripted: no e2e file is in the plan scope and the run hands UI checks to the Human.
- Local dev DB (read-only look): linked events e.g. f8f6ae9c-ded1-4063-857c-5b6ba048160f and 8980c741-a703-4542-a6f6-8eeaa04bbdda (clientId 22ae0ede-7181-4bb9-a990-4202f62ca241). No event with a clientName and no clientId exists there.
- scope extended: src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts — the plan's own Done-when spec lives there; the checker needs an explicit test-file line (finding scope-1).
