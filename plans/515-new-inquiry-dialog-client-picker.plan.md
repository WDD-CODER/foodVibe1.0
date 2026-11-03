# Plan 515 — Let the new-inquiry dialog pick or create a client instead of retyping name and phone

Status: draft
Track: code
Snapshot: 6cfe7dc004ac51bde0aac3da99294b341d76a975
Depends-on: 514

## Problem Statement
"פנייה חדשה" asks for a free-text name and phone on every inquiry, so returning clients are retyped and misspelled. With the client layer in place, the dialog should recognise a returning client by phone or name, let the owner create a new client inline, and keep staff to existing clients. The dialog is also a known hand-drawn modal copy; this plan moves it onto `app-modal-shell`.

## Goals & Success Criteria
- Primary: an inquiry is always created with a `clientId`; the owner can create a client inline; staff can only pick.
- Success:
  - `[auto]` `npx ng test --watch=false --include='**/new-inquiry-dialog/**'` passes (existing 6 tests updated + 4 new: pick existing → no `addClient`; owner new → `addClient` before `addMenuEvent`; staff → no add option and `valid_` false without a pick; body carries `clientId`, `clientName`, `clientPhone`).
  - `[auto]` `npm run build` and `npm run lint` pass.
  - `[auto]` `node scripts/scope-check.mjs --reuse --plan=plans/515-new-inquiry-dialog-client-picker.plan.md` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` returns no entries.
  - `[human]` Owner, `/menu-library?new=inquiry`, type `052` → combobox lists matching clients as `שם · טלפון · N אירועים`; pick → name/phone shown read-only, save creates the event with that `clientId`.
  - `[human]` Owner, type an unknown phone → "+ לקוח חדש" → name/phone inputs and collapsed "עוד פרטים" (client type select, company, email, source, notes) → save creates client then event.
  - `[human]` Staff, same dialog → no "+ לקוח חדש"; unknown phone shows `client_ask_owner`; save disabled until a pick.
  - `[human]` Escape and the shell's close button both cancel without creating anything.

## Execution Mode
- Parallel: yes — shares only the hotspot `dictionary.json` with Plan E
- Concurrent plans: 516
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
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

- INV-none: preserves — UI only; permissions are read through `PermissionService.can('create', { type: 'clients' })` and enforced by the server (Plan A).

## Reuse Check

- Client picker — family: search-combobox — rung: 1 — why: `app-search-combobox` with `options`, `clientFilter`, `labelOf`, `keyOf`, `minChars`, `emptyKey`, `addLabelKey`, `(picked)`, `(addChosen)` covers pick-or-create as is.
- Dialog shell — family: modal-shell — rung: 1 — why: replaces the hand-drawn `.c-modal-overlay` copy with `app-modal-shell`.
- Client type select — family: search-combobox — rung: 1 — why: `app-custom-select` (the fixed-list pick named in that family) with three options.
- Field layout — family: form-field — rung: 1 — why: existing `.c-input-stack` / `app-form-field` for the new-client fields.

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
- As a chef, I want to type a client's phone in "פנייה חדשה" and have the app recognise a returning client so that I never retype or misspell someone I already work with.
- As an owner, I want to add a brand-new client inside the same dialog so that taking a first call is one flow.
- As a staff member, I want to open an inquiry for an existing client so that I can log a call without touching client records.

## Functional Requirements

### Must Have (P0)
- [ ] `canCreateClient_ = computed(() => this.permission.can('create', { type: 'clients' }))`.
- [ ] The `#inquiry-name` and `#inquiry-phone` inputs are replaced by one `app-search-combobox` (`variant="box"`, `options = clientData.allClients_()`, `clientFilter = matchesClientQuery`, `labelOf = c => clientLabel(c, countFor(c), t('client_events_count'))`, `keyOf = c => c._id`, `minChars = 2`, `emptyKey = canCreateClient_() ? undefined : 'client_ask_owner'`, `addLabelKey = canCreateClient_() ? 'client_new' : undefined`, placeholder `client_pick_placeholder`).
- [ ] `(picked)` sets `selectedClient_` and shows name · phone read-only with a "שינוי" link that clears the pick.
- [ ] `(addChosen)` (owner only) opens the new-client branch: name (`#inquiry-name`, ≤200) and phone (`#inquiry-phone`, `isValidClientPhone`) inputs with the existing validators, plus a collapsed `client_more_details` section: `clientType` (`app-custom-select`, default `private`), `companyName`, `email`, `source`, `notes` (≤2000).
- [ ] `valid_` = `selectedClient_() !== null || (canCreateClient_() && nameValid_() && phoneValid_())`, and the existing date/guests/note validity; `client_required` shown when touched and no client.
- [ ] `onSave()`: if no `selectedClient_`, `await clientData.addClient({...})` first; then `buildBody()` adds `clientId: client._id`, `clientName: client.name`, `clientPhone: client.phone`; then the existing `addMenuEvent` → optional `addNote` → toast `new_inquiry_saved` → `saved.emit(created)`.
- [ ] Dialog rendered inside `app-modal-shell` (`titleKey="new_inquiry"`, `dismissible`, `[sheet]` on narrow screens as other dialogs do); the hand-drawn `.c-modal-overlay` styles are removed from the component scss.
- [ ] Dictionary keys from the Contract appended under `general` (all 18; Plan E uses the same list — the second plan to merge keeps both sides, no duplicates).

### Should Have (P1)
- [ ] `countFor(c)` = number of `MenuEventDataService.allMenuEvents_()` with `clientId === c._id`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL layout; the phone input and the phone part of the label are `dir="ltr"`.
- Combobox first; the rest of the form (date, guests, event type, note) unchanged below it.
- Owner "+ לקוח חדש" branch shows a small "חזרה לחיפוש" link to return to the combobox.
- Dictionary keys needed: all keys listed in the Contract.

## Atomic Sub-tasks
- [ ] U1: Add the Hebrew texts for the client picker and new-client form — all 18 keys from the Contract under `general` in `public/assets/data/dictionary.json`, append only; skip any key already present — files: dictionary.
- [ ] U2: Move the new-inquiry dialog onto the shared modal so it behaves like other dialogs — wrap `new-inquiry-dialog.component.html` in `app-modal-shell`, drop the overlay markup and scss, keep the `(document:keydown.escape)` host binding routed to `cancelled.emit()` — files: the component html/scss/ts.
- [ ] U3: Replace the free-text name and phone with a client search so returning clients are found — inject `ClientDataService`, `MenuEventDataService`, `PermissionService`; add `selectedClient_`, `canCreateClient_`, `isNewClientBranch_`, `countFor`; replace the two inputs with `app-search-combobox` per P0; wire `(picked)` and `(addChosen)` — files: the component html/ts.
- [ ] U4: Let the owner add a new client inside the dialog, saving the client before the event — name/phone inputs with existing validators, collapsed `client_more_details` section with `app-custom-select` for `clientType` and the four optional fields; `valid_` per P0; `onSave()` creates the client first and adds `clientId`/`clientName`/`clientPhone` to the event body — files: the component html/ts.
- [ ] T1: Update and extend the dialog tests for pick, owner-create and staff cases — fix the 6 existing tests to the new flow; add the 4 tests named in Success Criteria using a stubbed `ClientDataService` and `PermissionService` — files: `new-inquiry-dialog.component.spec.ts`.
- [ ] V1: Run the checks, capture the three UI cards and write the evidence in the Execution Notes — Run `npm run build`, `npm run lint`, the spec, the reuse gate and the log check; produce the three `[ui]` cards (e2e + screenshot each); write evidence under `## Execution Notes`.

## Technical Considerations
- Dependencies: `ClientDataService`, `MenuEventDataService.addMenuEvent`, `EventPipelineService.addNote`, `PermissionService.can`, `app-search-combobox`, `app-modal-shell`, `app-custom-select`, `isValidClientPhone`, `clientLabel`, `matchesClientQuery`.
- New files needed: none (existing component files edited).
- Model changes: none (Plan C).
- Backend / API: none.
- Auth and validation: owner/staff branch by `PermissionService`; server enforces.
- Security surface: none new.
- Data / migration: none.
- Project checks: log-query no errors; Reuse Check gate; dictionary append-only; Hebrew RTL + `translatePipe`.

## Out of Scope
- Editing an existing client's fields (P2 client page). Stage bar (Plan E). Server-side client search.

## Critical Questions
- none.

## Execution Notes
- Interactive behaviour (declared for readiness): **on edit** of the combobox after a pick → the pick is cleared and the user searches again; **on leave** (route change while open) → dialog closes with no write, same as today's `closeInquiry()`; **on cancel** (Escape / shell close / ביטול) → `cancelled.emit()`, nothing written; **on error** of `addClient` → toast `error_generic`, dialog stays open, no event created; **on error** of `addMenuEvent` after a successful `addClient` → toast `error_generic`, dialog stays open, the created client remains (harmless; shows in the picker on retry).
- Orchestrator readiness (2026-11-02): PermissionService has no owner-only rule for the clients type (permission.service.ts:47 returns true for staff on any create) → compute canCreateClient_ from permission.isOwner_() (in scope); scope is NOT widened (answered by the Human, recommended answer accepted).
- Orchestrator readiness (2026-11-02): clientFilter on app-search-combobox is a boolean input (search-combobox.component.ts:101), not a function → set [clientFilter]="false", bind query two-way, pass options already filtered with allClients_().filter(c => matchesClientQuery(c, query_())) (answered by the Human, recommended answer accepted).
- Orchestrator readiness (2026-11-02): error toast `error_generic` is not in dictionary.json → keep `server_error` with the existing 403 skip for addClient and addMenuEvent failures; add no new key (answered by the Human, recommended answer accepted).
- Orchestrator readiness (2026-11-02): plan drift — the dialog spec has 7 it() blocks, not 6, and the component scss has no overlay styles (overlay is markup only) → build for what the code has; log both as seen: (answered by the Human, recommended answer accepted).
- Orchestrator readiness (2026-11-02): the three `[ui]` cards need a backend and a database with an owner, a staff account and a client whose phone starts with 052. Local Mongo requires authentication and no backend is started for this plan, so these could not be confirmed available → the three `[ui]` cards are `[human]` follow-ups for this run (decided by the coordinator under the Human's delegated rule).
- seen: src/app/core/services/permission.service.ts has no mirror of the server's OWNER_ONLY_TYPES (server/utils/permissions.js:20,49) for the clients entity, so PermissionService.can('create', { type: 'clients' }) is true for staff — follow-up (Q2).
- Orchestrator (2026-11-03): scope widened with the Human's approval ('approved: both spec paths, resume 515'): new-inquiry-dialog.component.spec.ts and menu-library-list.component.spec.ts (test-file gate names a test location).
