# Brief — write and run the Modules program Plan Contracts (FoodVibe 1.0)

You are the Planner (main folder, on `main`). Your job in this session: check this brief against the code as it is
today, turn it into a complete, ordered set of saved Plan Contracts, and hand Dandan the list of `/orchestrate` runs.
Plans only — no app code.

Written 2026-11-16 by the claude.ai Architect, read against `origin/main` `396999008e366bb510f75025413fa52024ca09e2`
(2026-11-16). The plan map with the frozen Contracts is `docs/modules/modules-map.md`. Order of authority when two
texts disagree: **map Contracts > Part 0.5 of this brief > the rest of this brief.**

The code and the workflow kit were both changing while this brief was written. Nothing here is true until Step 0
(Reality Check) says so. Workflow commands are named, never copied: the source of truth for how a run starts and
behaves is `.claude/commands/orchestrate.md` and `docs/agent/orchestrator.md` as they are on `main` when you run.

---

## Part 0 — Product direction (decided with Dandan, 2026-11-16)

**What exists (verified in code, see Reality Check seeds).** The business is the tenant (ADR 0023, INV-1, INV-2).
The app covers products, suppliers, equipment, recipes, cook view, menus and events with pricing, supplier orders, prep
sheets by station, event logistics (phone intake + site visit checklist), event closing, a business report, the Front
Desk section (requests, bookings, clients, knowledge, public page) and a platform screen for the platform admin. Every
AI call goes through the server and is metered (`aiUsage`).

**The direction.** FoodVibe stays one application and one code base, sold in pieces. The platform admin switches
**modules** on and off per business. Different customers get different sets: a caterer gets events and field
logistics, a restaurant that works with a consultant gets the kitchen and invoices, a consultant gets access to the
businesses he advises. On top of that, three AI-assisted flows are added, all with the same shape (free text or a
voice note or a photo → a typed draft → a person approves → the server writes):

1. Site visit notes → answers on the event's logistics checklist.
2. Supplier invoice → prices, with a memory that gets better with every approved invoice, for every business.
3. Stock count by voice or text → a count sheet.

**The rule behind all three (already how the app works).** The model only turns unstructured input into a typed
draft. It never calculates a cost, a quantity, a total or a percentage, never decides, and never writes. All math is
code. Every draft waits for a person.

**Not in this program:** input from the business's end customers (voice or text through the public page — a later
wave through `server/routes/public.js`), WhatsApp intake of invoices (belongs to Front Desk Wave 1b), an AI-written
narrative in the diagnostic report, payments, self-serve sign-up of modules.

---

## Part 0.5 — Decisions (Dandan, 2026-11-16) — these override anything below

| # | Decision | Effect on the plans |
| --- | --- | --- |
| D1 | Five modules: `events`, `event_logistics`, `frontdesk`, `ai_create`, `consultant_diag`. Everything else is always on: products, equipment, suppliers, recipes, cook view, settings, metadata, Trash, team, reports, **invoices and price tracking**, stock count. | C-MODULES. Invoices are not gated: every kitchen needs them. They may get a price later; that is a pricing decision, not a code gate now. |
| D2 | Existing businesses keep everything they have today. | A business with no `modules` field reads as the four defaults (`events`, `event_logistics`, `frontdesk`, `ai_create`). No migration. |
| D3 | Clients are open when `events` or `frontdesk` is on. | `clients` is used by both (ADR 0027, ADR 0031). |
| D4 | Site visit: one feature, two ways to fill it. The business's own checklist is what the AI extracts into. | MP-03, MP-04. The model answers by position in the business's question list. "What is still missing" is the list of unanswered questions, computed by the server, never by the model. |
| D5 | In this program the owner (or a consultant acting in the business) sends the text or the voice note from inside the app. End customers come later. | No public route in this program. |
| D6 | **Voice recordings are kept**, together with the transcript. | C-FILES, 24 months, then deleted. |
| D7 | Every approved invoice teaches the system: the business's own name memory, a scan accuracy score, and a **shared supplier brain** that every business benefits from automatically. | MP-07. What is shared: the name a supplier prints → the product in the shared catalog, and how that supplier's invoice is built. Never shared: prices, quantities, the business's identity. |
| D8 | **Every use of AI benefits the platform, from every business, by default.** The businesses use the AI calls free of charge and know their data is shared with the platform. | C-LEARN. The owner's opt-in switch of plan 600 is replaced. |
| D9 | A **private** switch exists but the owner cannot change it. The owner sees it locked, with a tooltip saying private mode is arranged by contacting FoodVibe. Only the platform admin turns it on. It may be offered for a price. | `business.aiPrivate`, C-LEARN, MP-02. |
| D10 | A whole recipe example still reaches other businesses only when the platform admin promotes it by hand. Candidates are now every business that is not private. | Plan 600's promote flow stays; only the consent test changes. |
| D11 | A consultant is a customer: a business with its own set of modules. What is new is that one user can have access to more than one business and switch between them. **Modules belong to the business, not to the person**: inside a client's business the consultant sees what that business has. | C-ACCESS, MP-10. |
| D12 | A consultant acting in a client's business may do what the owner does, **except the team and the business settings**. | `businessRole: 'consultant'` in `permissions.js`. |
| D13 | The platform admin uses the same mechanism to enter any business. The link consultant ↔ business is created by the platform admin; the owner of that business can remove it. Every stamp carries the real person (`actorOf(req)`). | C-ACCESS. |
| D14 | Dandan chose, in the Architect chat on 2026-11-16, to approve the INV-1 change this needs. | Human gate G1: the invariants gate needs the literal words in the session that writes the line. Ask him once, before saving plan M16: "type `approve arch change INV-1`". Do not write `Arch-approved:` before that. |
| D15 | Stock count by voice is the same pipeline with another output. It is the last wave. | MP-12. |
| D16 | Private file storage must not block anything. Dandan adds the two server keys at the end. | C-FILES: without the keys every feature works and the file is simply not kept. |
| D17 | The pilot terms say all of this. | `docs/frontdesk/pilot-terms-draft.md` was updated in the same change as this brief (sections 4.2, 7.1, 7.5, 7.6, 7.7 and the note to the lawyer). No plan needed. |
| D18 | This repo never names any other project — not in code, comments, docs, plans, commit messages or ADRs. Rules are stated as FoodVibe's own. | Every plan and every builder. |
| D19 | Run as many things side by side as the orchestrator allows. | Part 4: rounds and parallel runs. |

**Assumptions the Architect made (Dandan did not object; each is one line to change):**

| # | Assumption | Where it lives |
| --- | --- | --- |
| A1 | A new sign-up gets the same four default modules as an existing business (today's behaviour does not change). The platform admin trims. | `DEFAULT_MODULES` |
| A2 | No monthly AI cap until the platform admin sets one for a business. The existing daily model quotas still bound the whole platform. | `business.aiMonthlyTokenCap` absent = no cap |
| A3 | The price-rise alert has its own number, `priceRiseAlertPct`, default 5. `overrunThresholdPct` is a different thing (paid vs planned at event closing) and is not reused. | `businessSettingsSchema` |
| A4 | Front Desk conversations with end customers feed learning only after the name and phone are removed (pilot terms 7.2). Nothing in this program touches them. | C-LEARN |
| A5 | The existing `POST /api/v1/ai/parse-receipt-photo` stays as it is until the new invoice screen has replaced its only caller; removing it is a later cleanup. | MP-06 |
| A6 | A price a member types by hand on a product does not write price history in this program. History comes from the import and invoice path. | MP-05 Out of scope |
| A7 | The diagnostic report is numbers and rule-based findings (the pattern of `server/services/business-report.js`). No model writes prose into it. | MP-11 |

---

## Part 1 — How to run this session

### Step 0 — Reality Check (first, before any plan is saved)

Both the app and the kit moved while this was written. Do this first and print the result.

1. `git fetch origin`. Read: `AGENTS.md`, `.claude/commands/plan.md`, `.claude/references/prd-template.md`,
   `.claude/skills/save-plan/SKILL.md`, `.claude/commands/orchestrate.md`, `docs/agent/orchestrator.md`,
   `docs/agent/plan-checks.md`, `docs/brain/invariants.md`, `docs/brain/decisions/0023-*`, `0027-*`, `0030-*`, `0031-*`,
   `docs/brain/gotchas.md` (backend and agent-workflow files), `docs/agent/standards-backend.md`,
   `standards-security.md`, `standards-angular.md`, `standards-domain.md`, `standards-reuse.md`,
   `docs/brain/component-families.md`, `docs/frontdesk/frontdesk-map.md` (the format to repeat, and the Contracts this
   program builds on: C-ACTOR, C-AIUSAGE, C-GUEST).
2. Re-verify **every line** of "Reality Check seeds" (Part 3) against live `origin/main`. Each seed names a path and
   what was seen there at `39699900`. Print one line per seed: `ok` or `changed: <what it is now>`.
3. Check the open plans under `plans/` and `plans/design/` for scope overlap with the map rows, and the highest ADR,
   migration and plan numbers (seen: ADR 0031, migration 0012, next plan 615).
4. Write the result into `docs/modules/modules-map.md` under "Reality Check deltas", and fix every Contract and map
   row a change touches.
5. A change that contradicts a decision in Part 0.5 is a question to Dandan, asked once, with choices and a
   recommendation. Any other change you fix yourself and list. Do not ask about things the code answers.

### Step 1 — Numbers and Contracts

Assign plan numbers to the map rows with `node scripts/next-plan-number.mjs` and write them into the map table (the
rows are `M0`…`M22` until then; after this step reference plans by NNN only). Freeze the Contracts section. The map
is then the plan of record.

### Step 2 — Write the plans

One `/plan` + `save-plan` per map row, in dependency order, from that row's **planning card** in the map (scope
seed, must-cover list, Done-when seeds, traps). A card is a seed: verify every path and symbol before it goes into a
plan. Every plan: PRD template shape, `Depends-on:`, a parsed `## Read-Write Scope` with its test locations,
`## Architecture Impact`, `## Reuse Check`, tagged Done-when (`[auto]` / `[ui]` / `[human]`), the plan-checks
`[auto] log-query` item, dictionary keys named, Lucide icons named, stories from the chef's or the owner's side.
A plan that adds a collection follows `standards-backend.md` §3. A plan whose main work is look and layout is
`Track: design` in `plans/design/`. If a card cannot become a plan without a product decision, put the decision in
`## Critical Questions` with choices and a recommendation, and collect **all** such questions of the whole program
into one message to Dandan — he wants one stop, not twenty.

Because each run must not stop, write every plan so its `[auto]` checks need no secret and no external service:
the file store, the model and the clock are faked in tests (C-FILES, `RUN_PLANS_CLAUDE`-style fakes already used by
the server tests).

### Step 3 — Runs

Dry-run first, as `/orchestrate` does. Print the list of runs from Part 4, corrected by
`node scripts/plan-order.mjs` on the saved plans, and say which may run side by side. Dandan starts them and merges
each run branch himself.

---

## Part 2 — Cross-cutting rules (apply to every plan)

1. **Evolve, do not duplicate.** The receipt scan, the import preview, AI name matching, the 5% line check, the
   logistics checklist, stations, the examples pool and the usage ledger already exist. Each plan extends the
   existing piece and names it. No second copy of a flow.
2. **The model never does math and never writes.** A model call returns a draft that passes a Zod schema or is
   refused. Costs, quantities, unit conversions, totals, percentages and "what is missing" are code. No AI route
   writes to products, events, counts or prices; it returns a draft, and an existing or dedicated write route applies
   what the person approved.
3. **Positions, not ids.** When a model must point at one of the business's items (a checklist question, a product),
   the server sends a numbered list and the model answers with numbers (the pattern of
   `POST /api/v1/ai/match-product-names`). Nothing outside what the server sent can be selected.
4. **Untrusted input.** Text read from an invoice, a transcript or pasted notes goes into the `user` part only,
   never into `system_instruction`. Model prompts are English, written from scratch; Hebrew appears only as data.
5. **Every model call is metered** with a `feature` key from `server/constants/ai-features.js` (C-AIUSAGE), and is
   refused when the business is over its monthly cap (C-AICAP).
6. **Module gates are on the server.** Hiding a link is never the gate. A route of a gated area answers 403
   `MODULE_OFF` (C-MODULES). The public router answers as if the business did not exist.
7. **Tenant and permissions unchanged in spirit.** Every new document carries `baseDocShape`, is scoped through
   `server/utils/business-scope.js`, validated by Zod in `shared/schemas` (INV-4) and authorised through
   `permissions.js`. New collections are never cloneable. Prices are money: owner only (`editMoney`).
8. **Server-owned fields** are written only by dedicated routers and stripped by the generic API (the
   `EVENT_SERVER_FIELDS` pattern).
9. **Record the trail.** Every AI draft and what the person finally saved are stored side by side with a closeness
   score (C-AIDRAFT). That is the learning data and the accuracy evidence.
10. **Learning respects one function.** Any code that keeps something for the platform or for other businesses
    asks `mayLearnFrom(business)` first (C-LEARN). A private business still gets its own memory.
11. **Hebrew RTL, dictionary only.** Strings through `translatePipe` + `dictionary.json` (append-only); canonical
    values are English keys; Lucide icons registered in `app.config.ts`; logical CSS only.
12. **Reuse first** (`docs/agent/standards-reuse.md`, `docs/brain/component-families.md`): `app-list-shell`,
    `app-page-header`, `app-empty-state`, `app-modal-shell`, `ConfirmModalService`, `app-custom-select`,
    `app-counter`, `BaseEntityDataService`, `.c-*` engines. A new family needs rung 4 + `why:`. Every new screen is a
    lazy route. Growth-frozen files keep net lines ≤ 0 (`menu-intelligence.page.ts` is over 1,000 lines).
13. **No unasked UX.** Build only what the plan's UI notes say. No extra confirmation dialogs.
14. **Free-tier reality.** Render sleeps, Atlas M0 has 512 MB, the model chain is the free one. Files never go into
    MongoDB. One request = one model call; a batch is a queue in the browser, never a loop on the server.
15. **Privacy.** A voice recording identifies a person. Recordings and invoice files are reachable only through a
    signed, short-lived link the server hands to a member of that business. No file name, transcript, product name
    or price in logs — counts and sizes only.
16. **Parallel-safe by construction.** After wave 0 a plan never edits a shared registry file (see C-REGISTRY and
    the "must not run at the same time" list). If a plan finds it must, it stops and offers `approved: <path>`.
17. **No other project is named anywhere (D18).**

---

## Part 3 — Product specs

### Reality Check seeds (seen at `39699900`; re-verify every line in Step 0)

Tenancy, users, permissions
- `server/utils/business-scope.js`: `scopeFilter(req)` reads `req.user.businessId`; `MASTER_BUSINESS_ID = '__master__'`.
- `server/routes/auth.js`: `signAccess(user)` (about line 81) builds the token payload
  `{ userId, name, businessId, businessRole, isPlatformAdmin }` from the user document; `POST /refresh` re-reads the
  user and signs again. One user has exactly one `businessId` (`server/models/user.model.js`,
  `businessRole: 'owner' | 'staff'`).
- `server/utils/permissions.js`: `can(user, action, ctx)` answers `OTHER_BUSINESS` when `doc.businessId` differs
  from `user.businessId`; `ACTIONS` has 13 entries; `OWNER_ONLY_ACTIONS` = `editMoney, manageTeam, editSettings,
  editTaxonomy, editLogistics, editFrontDesk`; `OWNER_ONLY_TYPES = { clients, frontDeskProfiles, knowledgeItems }`.
  Client mirror: `src/app/core/services/permission.service.ts`.
- `server/utils/actor.js`: `actorOf(req)` → `{ userId, name }` (C-ACTOR).
- The platform admin does not see inside a business today. `server/routes/admin.js` gives a table of counts
  (`GET /businesses`), AI usage, AI examples, taxonomy of one kind; `GET /api/v1/stats/report?businessId=` gives the
  report of one business. No route gives him another business's recipes, prices or events.

Business document and platform screen
- `shared/schemas/entities/business.schema.ts`: `businessSchema` is a `z.strictObject` with `settings`
  (`profitTargetPct`, `safetyMarginPct`, `overrunThresholdPct`), `baseline`, `staffVisibleStages`,
  `hiddenLogisticsKeys`, `shareAiExamples`, `frontDeskPlan` (`pilot | basic | pro`, written by the platform admin in
  `admin.js` `PUT /businesses/:id/front-desk`). No `modules` field.
- `GET /api/v1/business` returns the whole business document to any member (`server/routes/business.js`); the client
  holds it in `BusinessService.business_`.
- `src/app/pages/platform-dashboard/`: sortable businesses table (12 columns) and `front-desk-admin-dialog`.
- Navigation: `src/app/core/components/header/header.component.ts` has five links (`/dashboard`, `/inventory`,
  `/recipe-book`, `/menu-library`, `/clients`) plus settings and platform;
  `src/app/core/components/tab-chips/tab-chips.component.ts` has the chip groups (inventory: products, equipment;
  recipes; menus: menu-library, menu-intelligence; frontdesk: requests, bookings, clients, knowledge, settings).

AI
- `server/routes/ai.js` (1,876 lines) holds every model route; `aiLimiter` is 20 requests / 15 minutes per user.
  INV-6: every model call goes through this file.
- `server/services/gemini-client.js`: `callGemini({ body, timeoutMs, log, eventPrefix, needsVision, model, usage })`;
  `usage.feature` must be in `server/constants/ai-features.js` (19 keys; `voice_transcribe` is listed and nothing
  calls it). No audio or PDF capability flag; `countImages` in `server/services/ai-usage.js` counts `image/*` parts only.
- `server/services/ai-usage.js`: one `aiUsage` row per call; `aggregateAiUsage(db, { from, to, groupBy, businessId })`.
  No cap of any kind per business.
- AI examples (plan 600): collection `GEMINI_SHOTS`; a shot is `pending` then `approved` on save with `aiDraft`,
  `draft` and `keptRatio` (`POST /api/v1/ai/shots/confirm`). The shared pool is `businessId: '__master__'` copies made
  by `POST /api/v1/admin/ai-shots/:id/promote`, allowed only when `business.shareAiExamples === true`; the owner sets
  it with `PUT /api/v1/business/share-ai-examples` from
  `src/app/pages/metadata-manager/components/ai-examples-share/` (one toggle chip, default off).
  `setShareAiExamples` in `server/services/business.js` deletes the promoted copies when it is turned off.
- `express.json({ limit: '2mb' })` in `server/app.js`: a base64 file in a JSON body must stay under it
  (`RECEIPT_IMAGE_MAX_BASE64 = 1_800_000`).

Events and logistics
- `shared/schemas/entities/event-logistics.ts`: phases `intake | site_visit`, nine built-in sections, answer types
  `status | quantity | text`, statuses `unchecked | needed | not_needed | client_provides`, payers
  `client | quoted | chef | ours`.
- The questions are taxonomy terms of kind `logisticsItem` (`taxonomy-term.schema.ts`: `phase`, `section`,
  `answerType`, `environments?`, `hint?`, `removedAt?`); `key` is the Hebrew question text. A business hides shared
  questions through `business.hiddenLogisticsKeys`; an event hides more through `siteLogistics.hiddenKeys`.
- Answers live on the event: `menuEvents.siteLogistics.answers[]` (`itemKey`, `label?` for `adhoc:<id>`, `phase`,
  `section`, `status`, `quantity?`, `text?`, `payer?`, `showToClient?`, `at`, `by`, `byName`). Written only by
  `PUT /api/v1/events/:id/logistics` (`server/routes/events.js`), owner only (`editLogistics`), merged by `itemKey`.
- UI: `src/app/pages/menu-intelligence/components/event-logistics-panel/` (component 417 lines).
- Stations exist: taxonomy kind `station`, `defaultStation` on recipes and dishes (plan 436);
  `components/prep-sheets/` groups by station. Supplier orders: `components/supplier-orders/`.
- Guest count, per-event `targetsOverride.safetyMarginPct` and `pricing` are on `menuEvents`; changing the guest
  count already recomputes portions and cost in the browser.
- Equipment: `equipment.schema.ts` has `ownedQuantity` and `scalingRule { perGuests, minQuantity, maxQuantity? }`;
  `eventLogisticsSchema.resolvedItems` exists in the schema. **Nothing computes either** (only models reference
  them). There is no loading list.
- No audio code anywhere in `src/app` (no `MediaRecorder`).

Invoices and prices
- `POST /api/v1/ai/parse-receipt-photo` (plan 465): image only (`image/jpeg | png | webp`), owner only, returns
  `{ rows, truncated }`. The prompt tells the model to skip the supplier header, totals and VAT lines. The photo is
  not stored.
- `server/utils/price-list-import.js`: `normalizeReceiptRows` already checks each line — when
  `|unitPrice × quantity − lineTotal| / lineTotal > 0.05` (`RECEIPT_MISMATCH_TOLERANCE`) the price becomes
  `lineTotal / quantity` and the row is marked `needsReview`. It never blocks.
- `src/app/pages/inventory/components/product-import/` (component 416 lines): pasted list or photo → preview rows →
  `matchWithAi_()` (one call to `match-product-names` for the names that did not match exactly) → the preview shows
  create / update / same and the old price beside the new one → `POST /api/v1/product-import/apply`.
- `server/routes/product-import.js` `POST /apply`: matches by exact normalised name, **overwrites** the price in
  `products.sources[]` for that supplier, creates new products. No price history, no invoice record, nothing learned
  from the match the person approved: the same supplier's next invoice is matched by the model again from zero.
- `shared/schemas/entities/supplier.schema.ts`: `nameHebrew`, `contactPerson?`, `phone?`, `phone2?`, delivery
  fields. No tax id. A supplier is a record of one business; nothing links the same supplier across businesses.
- `products.sources[]` = `{ supplierId, price, addedBy?, addedAt? }`; a new product made by the import gets
  `_masterId` = its own id, so `_masterId` alone does not prove a product came from the shared catalog.
- Recipe cost is computed in the browser (`src/app/core/services/recipe-cost.service.ts`). The server has no cost
  engine. Dishes carry no selling price; a selling price exists only on a menu event item (`sellPrice`).
- Files: `src/app/core/services/cloudinary.service.ts` uploads images straight from the browser with an unsigned
  preset; the link is open to anyone who holds it. The server has no Cloudinary key and no file code.
  `server/jobs/retention.js` deletes old requests, bookings and messages lazily, once a day per business.

Stock
- No stored stock quantity anywhere. `products.minStockLevel` exists and has an index; nothing compares it to a count.

Numbers
- Highest ADR 0031, highest migration 0012, next plan number 615. Open plans: 471, 542, 581, design 373.

---

### MP-01 — Modules per business

**Exists:** the tenant, the platform table, one precedent of a platform-written field (`frontDeskPlan`).
**Problem:** every business gets every screen; nothing can be sold or withheld in pieces.

**Build (C-MODULES):** a `modules` list on the business document, written only by the platform admin; one server
gate; one client service that hides navigation and guards routes; toggles with a reason in the platform screen. What
each module covers is fixed in the Contract. `clients` is open when `events` or `frontdesk` is on.

**Done-when seeds:** [auto] a route of each gated area answers 403 `MODULE_OFF` for a business without the module
and 200 with it; [auto] a business with no `modules` field behaves exactly as today (the whole existing server suite
stays green untouched); [auto] the public page of a business without `frontdesk` answers 404; [ui] with `events` off
the header has no menu link and `/menu-library` redirects to the dashboard; [human] Dandan switches
`event_logistics` off for a business and its logistics panel is gone after one refresh.

### MP-02 — AI rules for every business: monthly cap, learning by default, the locked private switch

**Exists:** the usage ledger; the owner opt-in switch (default off) that today decides whether the platform admin
may even see a business's examples.
**Problem:** AI is open to everyone at the platform's cost with no ceiling per business; and the platform learns
only from businesses that found a switch and turned it on — the opposite of D8.

**Build:**
- **Cap (C-AICAP):** an optional monthly token cap per business, read from the ledger (no second counter), enforced
  in one place before the model call; the platform table shows this month's tokens beside the cap.
- **Learning (C-LEARN):** `business.aiPrivate`, platform admin only. `mayLearnFrom(business)` is the one test.
  The owner's `PUT /business/share-ai-examples` and its schema go away; `shareAiExamples` stays readable on stored
  documents and nothing reads it. The promote flow tests `aiPrivate !== true`. Turning private on removes the
  business's promoted copies and its shared-brain contributions.
- **The owner's card** (`ai-examples-share`) becomes a locked chip that shows the state, with a tooltip:
  private mode is arranged by contacting FoodVibe. No request button, no dialog.
- **The draft trail (C-AIDRAFT):** one collection and two functions that generalise the examples lifecycle
  (draft saved when the model answers, confirmed with what the person saved, closeness score). Every new AI flow in
  this program uses it.

**Done-when seeds:** [auto] a call over the cap is refused before any model request and writes a ledger row
`ok: false, errorCode: 'business_cap'`; [auto] the old owner route answers 404 and the promote route accepts a
business that never touched a switch; [auto] a private business's examples are not listed for the platform admin;
[ui] the owner sees the locked chip and its tooltip text; [human] Dandan sets a cap of 1 token for a test business
and sees the Hebrew message on the next AI action.

### MP-03 — Site visit notes become checklist answers

**Exists:** the checklist, the answers on the event, the owner-only write route.
**Problem:** on site the chef talks and looks; he does not tick 40 questions on a phone. What he forgets comes out
of his own pocket.

**Build (C-LOGX, C-VOICE):**
- `POST /api/v1/ai/voice/transcribe`: one voice note → text; the recording is kept (C-FILES).
- `POST /api/v1/ai/logistics/extract`: the server builds the numbered list of the questions this event really shows
  for the phase (master ∪ the business's own, minus `removedAt`, minus the business's hidden keys, minus the event's
  hidden keys, filtered by the event's environment), sends it with the text, and maps the model's numbers back to
  `itemKey`. It returns suggested answers, suggested ad-hoc items for what fits no question, and the list of
  questions that stay unanswered. It writes nothing to the event.
- The panel shows the draft as a diff the owner accepts, edits or drops line by line, then saves through the
  existing `PUT /events/:id/logistics`. The unanswered list is shown as "still to check on site".
- A shared recorder piece `app-voice-note` (record, stop, replay, send; falls back to "paste text" when the browser
  cannot record).

**Done-when seeds:** [auto] with a fake model answer the extract route returns only keys of the list it sent, drops
an out-of-range number and an answer whose type does not fit the question; [auto] `unanswered` equals the shown
questions minus answered ones, for two fixtures; [auto] the extract route never changes the event document;
[ui] pasting a prepared Hebrew note shows suggested answers and a "still to check" list; [human] Dandan records a
real site-visit note on his phone and approves the result.

### MP-04 — Loading list

**Exists:** `equipment.scalingRule` and `ownedQuantity` in the schema, unused; logistics answers with `status` and
`payer`.
**Problem:** the truck leaves without something. There is no list to load from.

**Build (C-LOAD):** a pure function, shared by server and browser, that builds the list for one event from the
equipment records (quantity by the scaling rule and the guest count, shortage against `ownedQuantity`) and from the
logistics answers the business itself brings (`status: 'needed'` with payer `ours` or `chef`). A printable sheet
beside the prep sheets, with a tick per row kept on the event. The "things we always forget" are the business's own
checklist questions, not constants in code.

**Done-when seeds:** [auto] the function gives the same rows for a fixture at 150 and the scaled rows at 220
guests, respects `minQuantity` / `maxQuantity`, and marks a shortage; [ui] the sheet lists an item answered
"needed · ours"; [human] the printed sheet reads right in Hebrew.

### MP-05 — Invoices are records, prices have a history

**Exists:** the import preview and `apply`, which overwrites.
**Problem:** after the save nothing remains: no invoice, no previous price, no way to say "this went up".

**Build (C-INVOICE):** `apply` gains an optional invoice header and, in the same request (INV-3), writes one
`invoices` document and one `priceHistory` row per price it created or changed, and confirms the AI draft with what
was saved. The invoice file is the one stored when it was read (MP-06). Owner only. Read through the generic API
(owner), never written through it.

**Done-when seeds:** [auto] an apply with a header writes exactly one invoice and one history row per changed
price, none for `same_price`; [auto] the existing apply tests pass unchanged when no header is sent; [auto] a staff
token gets 403 on the invoice read.

### MP-06 — A better read: header, PDF, the stored file

**Exists:** the photo route and its line check.
**Problem:** the scan throws away the supplier, the date and the number, takes no PDF, and keeps no file.

**Build (C-INVREAD):** `POST /api/v1/ai/invoices/read` in its own router file: image or PDF in, header + rows out
(the rows through the existing `normalizeReceiptRows`, so the 5% rule and `needsReview` stay one implementation).
The header carries what is printed: supplier name, tax id, phone, invoice number, date, and whether prices include
VAT. The supplier is suggested from the business's suppliers by tax id, then phone, then name. `suppliers` gain
`taxId?`. The file is stored (C-FILES) and a draft is saved (C-AIDRAFT).

**Done-when seeds:** [auto] a fake model answer with a header returns the supplier suggestion by tax id before
name; [auto] a PDF mime type is accepted and an unknown one refused; [auto] with the file store not configured the
route answers 200 with `fileId: null`; [auto] a malformed model answer is refused by the schema and counted as a
rejected call.

### MP-07 — The memory: the business's own names, and the supplier brain everyone shares

**Exists:** a model call that matches names from zero every time.
**Problem:** the tenth invoice from the same supplier is read no better than the first, for anyone.

**Build (C-ALIAS):**
- On every apply, each line the person linked to a product writes or strengthens an **own alias**
  (supplier key + printed name → the business's product, with the unit and pack size it was read with).
- When `mayLearnFrom(business)` and the product really comes from the shared catalog, the same approval strengthens
  a **shared alias** (supplier key + printed name → the shared product) and the **supplier profile** (names seen,
  VAT included or not, how many invoices and businesses). No price, no quantity, no business id readable from it
  beyond a count.
- `POST /api/v1/product-import/resolve`: names → products from memory, own first, then shared. The screen calls it
  first; only the names it could not resolve go to the model.
- The supplier key is the tax id when printed, else the phone, else the normalised name — so two businesses buying
  from one supplier meet on the same key.

**Done-when seeds:** [auto] after one approved invoice the same printed name resolves from memory with no model
call (assert zero `product_match` ledger rows); [auto] business B resolves a name business A approved, and gets B's
own product; [auto] a private business A adds nothing to the shared collections; [auto] no price field exists in
either shared collection (schema test); [human] Dandan scans the same invoice twice and the second preview is
matched before he touches it.

### MP-08 — The invoice screen, the alert, and what it does to the dishes

**Build:** the import screen takes a photo or a PDF, shows the header strip (supplier picked for him, date,
number), resolves from memory then asks the model, shows old and new price with the change in percent, and marks a
rise above the business's `priceRiseAlertPct`. After the save, one panel lists the recipes and dishes that use the
products that rose, with the cost before and after (computed by `RecipeCostService`, in the browser). An invoices
list under the inventory group opens the stored file through a signed link. A dashboard card lists prices that rose
in the last 60 days.

**Done-when seeds:** [auto] a 6% rise is flagged at the default 5 and a 4% rise is not; [ui] the header strip shows
the supplier read from a prepared fixture; [ui] the impact panel names a recipe that uses the product;
[human] Dandan reads the screen on his phone with a real invoice.

### MP-09 — How good the scan is, and what the brain knows (platform admin)

**Build:** a section in the platform screen: per AI flow and per model, the number of drafts and the average
closeness to what people saved, over time; the size of the shared supplier brain (suppliers, names, businesses
contributing); a note when private file storage is not configured.

**Done-when seeds:** [auto] the endpoint averages closeness over two fixtures and leaves private businesses out;
[human] Dandan reads the section after scanning three invoices.

### MP-10 — One user, more than one business (INV-1 change, ADR 0032)

**Exists:** one `businessId` per user, in the token; C-ACTOR prepared for this.
**Problem:** a consultant cannot work inside his clients' businesses, and the platform admin cannot look inside a
business to help it.

**Build (C-ACCESS):** access grants; an active business per user; a switch route that re-signs the token with the
active business, so every existing scoped query keeps working without a change. Role `consultant` (owner's rights
without the team and the business settings). The platform admin may switch into any business and acts with the
owner's rights there. While a session acts in a business that is not the user's home, every request re-checks that
the grant is still live. A header switcher and a banner that says in which business you are acting; the owner sees
who has access and removes it; the platform admin grants it. Usage statistics do not count an acting session as the
business's own activity.

**Done-when seeds:** [auto] a consultant with a grant to A reads A's recipes and gets 403 on A's team and settings
routes; [auto] the same user gets nothing of business C; [auto] a removed grant is refused on the very next request
and the next refresh lands in the home business; [auto] a document the consultant creates in A carries his own
`createdBy` and A's `businessId`; [auto] `server/test/invariants.test.js` "INV-1 …" extended and green; [human] ADR
0032 text approved; [human] Dandan enters a test business from the platform screen and sees the banner.

### MP-11 — The consultant's diagnosis

**Exists after waves 2 and 3:** invoices, price history, access.
**Problem:** the first week of a consulting job is typing a client's invoices and menu into a spreadsheet.

**Build (C-DIAG):** inside a client's business, a consultant whose **home** business has `consultant_diag` opens a
diagnosis: he drops a batch of invoice files (the browser reads them one after another through MP-06 and he
approves each through the normal preview — the same guardrails, no bulk shortcut), and pastes the menu with
selling prices (one model call turns it into a list of names and prices; he links each to a dish). The report is
computed from stored data: food cost percent per dish against the target, dishes under the target margin, products
whose price moved the most in 60 days, and the rule-based findings. Printable.

**Done-when seeds:** [auto] the gate reads the home business's modules, not the client's; [auto] the menu route
returns names and prices only and refuses an answer with extra fields; [auto] the volatility figure for a fixture
of three history rows; [ui] the report page lists a dish under the target; [human] the partner reads a report built
from his own invoices.

### MP-12 — Stock count, typed or spoken

**Exists:** nothing but `minStockLevel`.
**Build (C-STOCK):** a count is a record: date, lines of product and quantity in the unit the person used and in
the base unit (converted by the existing unit rules), draft then final. The latest final count is the stock on hand;
a product under its `minStockLevel` is listed. A count sheet screen under the inventory group. Then the same voice
and text flow as MP-03 fills the sheet as a draft: the server sends the numbered product list, the model answers
positions, quantities and units, and the person corrects and finalises.

**Done-when seeds:** [auto] a final count sets the on-hand figure and a later draft does not; [auto] unit
conversion to the base unit for kg ↔ gram and a pack unit of one product; [auto] the extract route returns only
positions of the list it sent; [ui] a product under its minimum is listed; [human] Dandan counts a shelf by voice.

---

## Part 4 — Rounds and runs

The orchestrator refuses a run whose plans overlap in scope with a live run, and a second run needs 4 GB of free
memory (`docs/agent/orchestrator.md`, "Running beside a Planner session"). So what can run side by side is decided
by files. The map is built for that: wave 0 registers every shared name of the program once (C-REGISTRY), so later
server plans write only their own files. Screen plans all append to the same four files
(`public/assets/data/dictionary.json`, `src/app/app.routes.ts`, `src/app/app.config.ts`,
`src/app/core/components/tab-chips/tab-chips.component.ts`) and therefore go one run at a time.

| Round | Runs (side by side inside a round) | Needs merged first |
| --- | --- | --- |
| 1 | `mod-0` — M0, M1, M3, M4, M5, M2 | — |
| 2 | `mod-events-srv` — M6, M7 ‖ `mod-invoices-srv` — M10, M11, M12 ‖ `mod-access-srv` — M16 | round 1 |
| 3 | `mod-events-ui` — M8, M9, then `mod-invoices-ui` — M13, M14, M15, then `mod-access-ui` — M17 (one at a time) | its own server run |
| 4 | `mod-diag` — M18, M19 | invoices and access, server and screens |
| 5 | `mod-stock` — M20, M21, M22 | `mod-events-ui` (the recorder piece) |

- A screen run of one lane may sit beside a server run of another lane when their scopes do not overlap; say so in
  the printed list only after `plan-order.mjs` and the dry run agree.
- Round 2 is where the time is saved: three runs at once. If memory allows only two, start `mod-invoices-srv`
  (the longest lane) and `mod-access-srv` first.
- Human gates that hold a run are in the map. None of them is inside round 1.

---

## Part 5 — Critical Questions

None open. Every product decision is in Part 0.5. The one gate before saving is G1 (D14). If Step 0 finds a
contradiction, ask then — all questions in one message.

---

## Part 6 — Later (do not plan now)

- Voice or text from the business's end customer through the public page, extracted into the same checklist.
- Invoices forwarded on WhatsApp (after Front Desk plan 560).
- Price history for prices typed by hand.
- An anonymous price benchmark per supplier and product, from at least N businesses.
- Self-serve module purchase and billing.
- A model-written summary on top of the diagnostic numbers.
- Removing `POST /api/v1/ai/parse-receipt-photo` once nothing calls it.
