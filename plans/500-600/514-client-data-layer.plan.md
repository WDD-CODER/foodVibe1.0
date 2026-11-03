# Plan 514 — Give the app a client model, data service and display helpers

Status: done
Track: code
Snapshot: 6cfe7dc004ac51bde0aac3da99294b341d76a975
Depends-on: 512

## Problem Statement
The Angular app has no `Client` model or service, so neither the inquiry dialog nor the stage bar can list, pick or display clients. This plan adds the data layer only (no screens), following the `entity-data-service` family, so Plans D and E can be built in parallel against one stable API.

## Goals & Success Criteria
- Primary: `ClientDataService.allClients_()` holds the business's clients on `/menu-library` and `/menu-intelligence/:id`, and `MenuEvent.clientId` exists in the client model.
- Success:
  - `[auto]` `npx ng test --watch=false --include='**/client-data.service.spec.ts' --include='**/client-display.util.spec.ts'` passes.
  - `[auto]` `npm run build` passes.
  - `[auto]` `node scripts/scope-check.mjs --reuse --plan=plans/514-client-data-layer.plan.md` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` returns no entries.
  - `[human]` Open `/menu-library` as owner with DevTools network: one `GET /api/v1/data/clients` is issued on entry; navigating to an event does not re-fetch.

## Execution Mode
- Parallel: yes — disjoint scope from Plan B (same wave)
- Concurrent plans: 513
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/models/client.model.ts
src/app/core/models/menu-event.model.ts
src/app/core/models/v2/index.ts
src/app/core/services/client-data.service.ts
src/app/core/services/client-data.service.spec.ts
src/app/core/services/user.service.ts
src/app/core/resolvers/clients-ensure-loaded.resolver.ts
src/app/core/utils/client-display.util.ts
src/app/core/utils/client-display.util.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `ClientDataService` reads through the generic storage adapter; the server (Plan A) decides what staff see; the service adds no client-side filtering that pretends to be authorization.
- INV-none for the rest — no server, schema, taxonomy or AI code is touched.

## Reuse Check

- `ClientDataService` — family: entity-data-service — rung: 1 — why: extends `BaseEntityDataService<Client>` exactly like `MenuEventDataService`.
- `clients-ensure-loaded.resolver.ts` — family: page-entry-loading — rung: 1 — why: copy of `menu-events-ensure-loaded.resolver.ts` with the new service.
- `client-display.util.ts` — family: none — rung: 4 — why: pure string helpers (`normalizePhone`, `clientLabel`, `matchesClientQuery`) shared by two pages; no util family covers display formatting.

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
- As a chef, I want the app to know my clients on the menu screens so that picking or showing a client is instant and offline-tolerant like the other entities.

## Functional Requirements

### Must Have (P0)
- [x] `Client`, `ClientType`, `CLIENT_TYPES` in `client.model.ts`, re-exported from `models/v2/index.ts`; `MenuEvent.clientId?: string`.
- [x] `ClientDataService` per the Contract: `super('clients', false, { errorEvent: 'crud.clients.hydrate_error', errorMessage: 'Failed to load clients' })`; `allClients_ = this.all_`; `getClientById(id)` from the loaded list (no network); `addClient(body: Omit<Client,'_id'|'phoneNormalized'>)` → `storage.post` + append; `updateClient(client: Client)` → `storage.put` + map; every method re-throws 401 unchanged and otherwise logs `crud.client.<op>_error` then re-throws, mirroring `menu-event-data.service.ts`.
- [x] `clients-ensure-loaded.resolver.ts`; `clientsLoaded:` appended to the `resolve` maps of the `menu-library` route and both `menu-intelligence` routes in `app.routes.ts` (append only).
- [x] `user.service.ts` `_reloadDataServices()` reloads `ClientDataService` with the same deferred-import pattern used for `MenuEventDataService`.
- [x] `client-display.util.ts`: `normalizePhone(s: string): string` (digits only); `clientLabel(c: Client, eventCount: number, countWord: string): string` → `name · phone` plus ` · ${eventCount} ${countWord}` when `eventCount > 0`; `matchesClientQuery(c: Client, q: string): boolean` → name includes `q` case-insensitively, or `normalizePhone(q)` is a non-empty prefix of `c.phoneNormalized`.

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI. No dictionary keys (Plans D and E add them).

## Atomic Sub-tasks
- [x] C1: Give the app a client type and let events carry a client link — `src/app/core/models/client.model.ts` and the re-export in `models/v2/index.ts`; add `clientId?: string` to `MenuEvent` in `menu-event.model.ts` next to `clientName` — files: the three model files.
- [x] C2: Add the client data service so the app can list, add and update clients — `src/app/core/services/client-data.service.ts` per P0, copying the structure and error handling of `menu-event-data.service.ts` — files: the service.
- [x] C3: Load clients when the menu screens open and reload them when the user changes — `src/app/core/resolvers/clients-ensure-loaded.resolver.ts` (copy of `menu-events-ensure-loaded.resolver.ts`); append `clientsLoaded: clientsEnsureLoadedResolver` to the three route `resolve` maps in `src/app/app.routes.ts` (`menu-library`, `menu-intelligence`, `menu-intelligence/:id`); add the reload entry in `user.service.ts` `_reloadDataServices()` — files: resolver, `app.routes.ts`, `user.service.ts`.
- [x] C4: Add small helpers to search clients by name or phone and show them as a label — `src/app/core/utils/client-display.util.ts` per P0 — files: the util.
- [x] T1: Cover the data service and the helpers with specs — `client-data.service.spec.ts` mirroring `menu-event-data.service.spec.ts` for add/update/401/log; `client-display.util.spec.ts` with cases: name hit, phone prefix hit, formatted-phone (`052-123`) hit against `phoneNormalized`, miss, label with and without count — files: the two specs.
- [x] V1: Run the build, the specs and the gates, then write the evidence in the Execution Notes — Run `npm run build`, the two specs, the reuse gate and the log check; write evidence under `## Execution Notes`.

## Technical Considerations
- Dependencies: `BaseEntityDataService`, `HttpStorageAdapter` (`storage.post/put/get`), `LoggingService`, `UserService._reloadDataServices`, `app.routes.ts` resolve maps.
- New files needed: model, service (+spec), resolver, util (+spec).
- Model changes: `Client` (new), `MenuEvent.clientId?`.
- Backend / API: none (uses `/api/v1/data/clients` from Plan A).
- Auth and validation: none on the client; server-enforced.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query no errors; Reuse Check gate; `app.routes.ts` append-only.

## Out of Scope
- Any screen or dictionary key (Plans D, E). Server search endpoint for clients (client-side filtering is enough at catering scale). Trash integration (`softDelete: false`).

## Critical Questions
- none.

## Execution Notes
- Non-interactive run: no UI. On a failed `addClient`/`updateClient` the service logs and re-throws; callers (Plans D, E) show the toast.
- Orchestrator readiness (2026-11-02): client-data.service.spec.ts is said to mirror menu-event-data.service.spec.ts, which does not exist → copy the structure of src/app/core/services/product-data.service.spec.ts and cover add/update/401/log as T1 lists; log the difference as seen: (answered by the Human, recommended answer accepted).
- Builder (orch test-514-515, 2026-11-02) evidence:
  - `npx ng test --watch=false --browsers=ChromeHeadless --include='**/client-data.service.spec.ts' --include='**/client-display.util.spec.ts'` → exit 0, TOTAL: 17 SUCCESS.
  - `pnpm run build` → exit 0; `npm run build` → exit 0.
  - `pnpm run lint` → exit 0 (0 errors, 67 pre-existing warnings); eslint on the 8 changed files → exit 0, no output.
  - `pnpm run test:ci` → exit 0, TOTAL: 1683 SUCCESS.
  - `node scripts/kit-manifest-check.mjs` → exit 0, 0 unclassified.
  - `node scripts/scope-check.mjs --reuse --plan=plans/514-client-data-layer.plan.md` → exit 0, REUSE: ok (3 entries); `--diff=orch/test-514-515` → SCOPE: ok.
  - `node scripts/log-query.mjs --since=2026-11-02T21:56:58+02:00 --level=error` (run start; the gate swaps plan-start for it) → no entries. The literal `--since=plan-start` reads this slot's stale stamp (2026-10-20) and lists old CORS errors from the main server.
  - `app.routes.ts`: append-only — one import plus `clientsLoaded` in the menu-library, menu-intelligence and menu-intelligence/:id resolve maps.
- seen: the spec copies product-data.service.spec.ts (menu-event-data.service.spec.ts does not exist), as the readiness answer says.
- Client view interface: fields other than name/phone/_id are optional because staff receive only name + phone; `matchesClientQuery` falls back to the digits of `phone` when `phoneNormalized` is absent.
