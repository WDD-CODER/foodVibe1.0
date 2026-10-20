# Brief — write every MVP Plan Contract (FoodVibe 1.0)

You are the Planner (main folder, on `main`). Your job in this session: turn the MVP gap into a complete,
ordered set of saved Plan Contracts, so Dandan only has to run Workers. Plans only — no app code.

Written 2026-10-20 by the claude.ai Planner, verified against origin/main `8d7997e`
(the technical audit was taken at `8a3980b`; plans 413–417 merged in between — mostly dropdowns, QA,
and plan 417's 200-char name limit in `shared/schemas`). This brief is self-contained: the product
specs live in Google Drive, which you cannot read. Everything you need from them is in Part 3.
Do not go looking for "אפיון – NN.N" documents.

---

## Part 1 — How to run this session

### Step 0 — Housekeeping (before planning)

1. The technical audit sits untracked at `docs/brain/2026-10-19-mvp-gap-audit.md`. It is a dated
   snapshot, not distilled brain knowledge, so it does not belong in `docs/brain/`. Move it to
   `docs/mvp/2026-10-19-mvp-gap-audit.md` (new folder; `Move-Item`, it is untracked).
   Land it as a docs-only chore through the normal ship lane (it cannot go to `main` directly —
   `branch-guard.sh` only allows plan files and `.claude/todo.md`). Do not block planning on that merge.
2. Read: `AGENTS.md`, `.claude/commands/plan.md`, `.claude/references/prd-template.md`,
   `.claude/skills/save-plan/SKILL.md`, `docs/brain/invariants.md`, `docs/brain/index.md` →
   `decisions/` + `gotchas.md`, `docs/agent/plan-checks.md`, `docs/agent/standards-backend.md`,
   `docs/agent/standards-angular.md`, `docs/agent/standards-domain.md`, `_shared/tech-stack.md`,
   `plans/407-one-soft-delete-model-and-user-prefs.plan.md`, and the audit file.
3. `git fetch origin` and re-verify every audit fact you rely on against live `origin/main`
   (Reality Check). The audit is a starting map, not truth.

### Step 1 — Plan map (STOP for Dandan's approval)

Produce one table and stop. Columns: spec ID · plan title · track · depends on · touches (folder globs)
· shared hotspots · size (S/M/L) · split into how many plans. Below it, a **Contracts** section (Step 1b).
Wait for "approved" (or edits) before drafting anything.

Proposed map (adjust after Reality Check; you own the final split — each plan = one Worker session):

| # | Spec | Plan | Track | Depends on |
|---|---|---|---|---|
| 1 | 01.1 | Business entity, businessId on every doc, creator stamp, migration (dry-run + apply), ADR + INV-1/INV-2 change | A | — |
| 2 | 01.1 | Scope every read/write by business: central scope helper, clone/sync per business, JWT, signup creates business, platform admin split, cross-business tests | A | 1 |
| 3 | 01.1 | Client: business + role in user state, signup business name, platform-admin-only screens, "no business" login block | A | 2 |
| 4 | — | Business settings entity (one doc per business: profit target, safety margin, overrun threshold, baseline fields) | A | 2 |
| 5 | 01.2 | Central permission checker on the server (owner/staff, created-by, money-field lock, exceptions) + tests | A | 2 |
| 6 | 01.2 | Team management (Settings → Team, add/remove staff) + client gating + price-field lock | A | 5 |
| 7 | 07.1 | Daily usage record on the server | A | 2 |
| 8 | 06.1 | Opening baseline screen, setup checklist card, PWA name "FoodVibe" | A | 4, 7 |
| 9 | 06.2 | Bulk product import from pasted price list | A | 8, 5 |
| 10 | 07.3 | Platform admin dashboard (business table; drill-down after 07.2) | A | 7, 21 (drill-down: 26) |
| 11 | — | Re-plan 407 business-aware (rewrite existing plan 407, not a new number) | A | 2 |
| 12 | 04.1 | One quantity + cost engine with fixture tests (pure, no UI) | B | — |
| 13 | 04.1 | Wire every list, preview, Excel and the menu footer to the engine; delete the 3 copies | B | 12 |
| 14 | 04.2 | Supplier orders screen + copy / WhatsApp | B | 13 |
| 15 | 04.3 | Station taxonomy kind + station picker in recipe builder | B | 13 |
| 16 | 04.3 | Printed prep sheets per group, page per group, group selection | B | 15 |
| 17 | 02.1 | Lean product form + remove course color | B | — (escalation: growth-frozen file) |
| 18 | 02.1 | Paste recipe / paste ingredients (wire `/ai/parse-text`), red "לא מוכן" unlinked rows | B | 17 |
| 19 | 03.1 | Coefficients: schema, migration seed, single portions function | C | 1 (rebase only) |
| 20 | 03.1 | Coefficients UI: settings lists, per-dish coefficient + manual override, remove take-rate / pieces-per-person | C | 19 |
| 21 | 09.1 | Event stage pipeline, stage history, legacy-event migration | C | 20 |
| 22 | 09.1 | New inquiry form, stage bar, notes log, library stage column/filter, customer fields | C | 21 |
| 23 | 03.3 | Incomplete-price flag, "partial" badge, missing-prices popover with inline price edit | C | 13, 22 |
| 24 | 03.2 | Live pricing meter + per-event money fields | C | 23, 4 |
| 25 | 08.1 | Planning snapshot + event closing dialog (paid per supplier, overrun, photos, finish/reopen) | C | 24, 14 |
| 26 | 07.2 | Business performance dashboard (server-computed) | C | 8, 7, 25, 22 |
| 27 | — | Chore: fix plan 321 header (`Status: done` while phases 4–8 were dropped/moved) | any | — |

Notes on the map:
- Plan 1 must merge before any plan that adds fields to entities. B and C plans written now carry
  `businessId` awareness through the contracts below, not through code that exists yet.
- The audit's "repo items" are covered: ADR + invariants (plan 1), 407 (plan 11), demo-*.json
  (plan 8 decides: delete the dead read in `seed-master.js` or ship the files), plan 321 header (plan 27).
- Plans 372–374 (venues) and 409–412, 418–419 are out of this brief. Plan 419 (bundle budget) is
  open: every new screen in these plans is a lazy-loaded route or component.

### Step 1b — Contracts (write them in the plan map, then copy verbatim into every plan that uses them)

Plans are written before their dependencies exist. To keep them coherent, fix every cross-plan name
once, in the map, and reuse it word for word. At minimum:

- **Scope field and helper**: `businessId` field name; the server scope helper's file + exported
  function names (e.g. `server/utils/business-scope.js`); user fields (`businessId`, `businessRole:
  'owner'|'staff'`, platform-admin flag name); JWT access payload shape.
- **Creator stamp**: field names for "who created, when" on every doc (`createdBy`, `createdAt`).
- **Permission checker** (plan 5): file, function signature, the money-field list (Part 3, 01.2), the
  403 message key.
- **Business settings** entity (plan 4): collection/type name, field names, defaults.
- **Engine** (plan 12): service file, input type (event + portions per menu item from 03.1), output
  types (raw-product lines, prep lines, cost per dish/event, `partial` flag + missing-price items,
  cycle/conversion errors), the rounding helpers (quantity and money), supplier-selection function.
- **Portions function** (plan 19): one function that returns portions per menu item; its name and
  signature are what plan 12 consumes. Until 19 merges, plan 12 reads today's `derivedPortions`.
- **Stage keys** (plan 21): enum keys for the 7 stages + `not_closed`, the "closed" rule, history
  entry shape, notes shape.
- **Planning snapshot** (plan 25) shape, consumed by 07.2.
- **Usage record** (plan 7): collection name and fields, consumed by 07.2 and 07.3.

### Step 2 — Draft in parallel with subagents (read-only)

After the map is approved, draft plans with `Plan` subagents in parallel — one subagent per track
(A, B, C), each drafting its track's plans in order, so dependent plans inside a track stay consistent.
Give each subagent: this brief's Part 2 and Part 3 sections for its specs, the approved map and
contracts, and the PRD template. Subagents return plan bodies only; they never write files or touch git.

Do not run several Planner sessions on `main` in parallel. Plan numbers come from
`scripts/next-plan-number.mjs` and the Planner commits to `main`; two Planners collide on both.
Parallel drafting happens inside this one session.

### Step 3 — Review and save, one at a time, in dependency order

For each draft, in map order: run the Architect + PM review (`.claude/commands/plan.md`), fix gaps,
then save-plan (Planner protocol, `Status: draft`, commit + push to `main`, `git ls-tree` check).
Saving in dependency order means every dependency already has its `NNN` — write dependencies as
plan numbers, not spec IDs, in each plan's `## Execution Notes` ("Depends on: plan NNN merged").

- Do **not** use a `## Prerequisites` section for not-yet-merged plans: save-plan Phase 2 demands
  prerequisites be true on `origin/main` now, which these are not. Dependencies go in
  `## Execution Notes` + `## Execution Mode`.
- `Snapshot:` = the `origin/main` SHA you verified that draft against. Later plans will drift as earlier
  ones merge; reference symbols (function, selector, field names), not only line numbers, so Step 0
  Reality Check can resolve drift.
- Ask "will this run in parallel?" per the protocol; for cross-track pairs run
  `node scripts/scope-check.mjs --overlap --plan=<path>` against the other track's open plans.
- Plan 1 changes INV-1 and INV-2 (Part 2). Ask Dandan in this chat in the plan.md format
  (INV-n · current rule · proposed change · who loses what) and wait for his literal
  `approve arch change INV-1` and `approve arch change INV-2` before writing `Arch-approved:`.
  Plan 15 touches INV-5 (new taxonomy kind) — expect `preserves`.
- Batch the Human questions: collect every question that is truly Dandan's (Part 4 already locks the
  product defaults) and ask them together, multiple choice, recommended option first.

### Step 4 — Report

One table: plan NNN · title · lane · depends on (NNN) · parallel-safe with · Human gate. Then the lane
order from Part 5 with real plan numbers, marking what can start now in `wt-1/2/3` and what unlocks
next. End with the open items you could not resolve.

---

## Part 5 — Execution lanes (proposed; adjust and print with real NNN in Step 4)

Three lanes = three slots. Inside a lane, plans run one after another; each plan is merged to `main`
before the next one in that lane starts (take-plan reads `origin/main`). Lanes run in parallel.
Note: lanes regroup the plans for balanced slots; they are not the A/B/C tracks of the map.

- **Lane 1 (wt-1) — business and team:** 1 → 2 → 3 → 5 → 6 → 4 → 8 → 9 → 11 → 10
- **Lane 2 (wt-2) — quantities and lists:** 12 → 13 → 14 → 15 → 16 → 7 → 27
- **Lane 3 (wt-3) — entry, events, money:** 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26

Cross-lane waits (the plan does not start until the other lane's plan is merged):
- 19 waits for 1. 23 waits for 13. 24 waits for 4. 25 waits for 14. 26 waits for 7 and 8.
  10 waits for 7 and 21; its drill-down waits for 26 (otherwise ship the table only).

Must not run at the same time (shared hotspot files), even when dependencies allow:
- 13 or 14 with any of 20–25 (`menu-intelligence.page.ts`).
- 13, 14, 16 with each other (`menu-export.service.ts`) — already serial inside lane 2.
- 6, 17, 23 with each other (`product-form.component.ts`, growth-frozen).
- 1 or 2 with any plan that edits `shared/schemas/**` or `server/routes/generic.js`.

Human gates (the slot stops and waits for Dandan):
- 1: `approve arch change INV-1` / `INV-2` (at planning), then Atlas migration go after the dry-run.
- 19 and 21: Atlas migration go after the dry-run.
- 6, 17, 23: escalation for the growth-frozen product form, unless the plan extracts a child component.
- Every plan: the `[human]` Done-when checks before merge.

---

## Part 2 — Cross-cutting rules every plan must respect

- **Hotspot: `src/app/pages/menu-intelligence/menu-intelligence.page.ts` (1297 lines)** is touched by
  plans 13, 14, 19/20, 21/22, 23, 24, 25. Tracks B and C both hit it. Rules: put new UI in child
  components under `pages/menu-intelligence/components/<feature>/`; keep page edits to wiring
  (inputs/outputs, one computed); never two open plans editing the page in parallel — mark them
  `Parallel: no` against each other and sequence them. Same for `menu-export.service.ts` (plans 13, 14, 16)
  and `shared/schemas/entities/menu-event.schema.ts` (19, 21, 24, 25 — all track C, sequential).
- **Growth-frozen: `product-form.component.ts`** (plans 6 price lock, 17 lean form, 23 inline price
  edit). Check the freeze rule in AGENTS.md / gotchas; each plan either extracts the touched part into
  a new child component first, or carries an explicit escalation line for Dandan.
- **"Owner only" before 01.2 merges**: specs 03.x, 06.2, 08.1 say "owner only". Until plan 5 merges,
  every signed-in user counts as owner; after, every role check calls the plan-5 checker. Plans written
  for track B/C state this explicitly and name the checker from the contract.
- **INV-6**: every AI call through `server/routes/ai.js` (plans 9, 18).
- **INV-4**: every new field is in a Zod schema in `shared/schemas/`; the server validates every write.
  Remember plan 417's 200-char name cap.
- **INV-3**: anything that re-keys or cascades runs on the server in one request (migrations, business
  delete, station rename).
- **Migrations** (plans 1, 19, 21, maybe 11): dry-run first, then apply on Atlas only after Dandan's
  go; `Isolated DB: yes`; idempotent; a rollback note.
- **Numbers and rounding are defined once** (04.1): quantity rounding, money (₪ 2 decimals), profit and
  overrun % (1 decimal), dashboard % (integer). No plan invents its own.
- **plan-checks.md**: every code plan has `[auto] node scripts/log-query.mjs --since=plan-start
  --level=error` → no entries; chef-side user stories; new dictionary keys listed; RTL logical CSS;
  Lucide icons registered.
- Every UI plan has at least one `[human]` Done-when (what to click, what to see), on mobile and desktop.

---

## Part 3 — Feature specs (condensed from Drive; this is the product source of truth)

Numbers in "Acceptance" are exact; turn them into `[auto]` tests where the logic is pure, `[human]`
where it is visual.

### 01.1 — Business entity and isolation between businesses (L, ~3 plans)

Goal: each business works on its own data, fully isolated; owner and staff share one data copy.
Chosen version: minimal — the business is the clone unit. Full version (staff private overrides,
per-business master) is out.

Today (audit): per-user full clone of `__master__` on signup (`cloneMasterDataToUser`), sync on
login/refresh/guest (`syncMasterToUser`, user-modified wins, gated by `master-version.js`); taxonomy read
as master ∪ own (`readOwner()` in `generic.js`); single owner field `userId` on every doc
(`shared/schemas/base.schema.ts`), ~82 occurrences in `generic.js`, no central helper; all indexes in
`server/db.js` lead with `userId`; one global `role` admin/user. `can-write.js` and
`permission.service.ts` do not exist (plan 386 retired). INV-1/INV-2 cite them and "ADR 0019" (wrong ADR).

Users: business owner; staff (01.2); platform admin (Dandan) — a separate role.

Flow: signup = username, email, password, **business name (required)** → business created, signer is
its owner, business gets a copy of master (as today, at business level). Login → user's business;
master sync runs once per business, not per user. Every read/write is inside the business: products,
recipes, dishes, suppliers, equipment, venues, events, taxonomy terms, trash, version history,
business settings.

Rules:
- Every data item belongs to exactly one business. No screen, search, count or API returns another
  business's data, except platform-admin screens (07.3).
- Every item records who created it and when.
- A user belongs to exactly one business; each business has exactly one owner. Business role:
  owner | staff.
- Platform admin is separate. Only they: edit the global master, push to master, manage AI models and
  the global dictionary, see the admin dashboard. Owner ≠ platform admin. One account can be both
  (Dandan's). The global master stays separate from every business and does not move into a business
  in the migration.
- Business settings (03.2) belong to the business; only the owner changes them.
- Existing data: every existing user becomes owner of their own business named "העסק של [username]",
  all their data moves to it unchanged. Migration dry-run first, apply on Atlas only after approval.
- Anonymous reads stay as today (see master).
Edge cases: removed staff → their items stay. Owner can't delete self. Platform admin deletes a whole
business with all data and users after double confirmation. Two users edit the same item → last save
wins. Master sync never overwrites a business-modified item. User with no business → login blocked,
"החשבון לא משויך לעסק – פנה לתמיכה". Duplicate business names allowed.
Out: staff private changes, several businesses per user, ownership transfer, email invites, per-business
AI quota, per-business master.
Repo: new ADR superseding ADR 0008 D1 (never implemented); rewrite INV-1 and INV-2 (rule, source,
touches, test). Needs Dandan's `approve arch change INV-1` / `INV-2`. Sequence before plan 407 or
re-plan 407 (plan 11). Audit sizing: business schema + `businessId` in `baseDocShape`; user business
role; JWT payload; signup creates business; re-key clone/sync; rewrite every `userId` filter in
`generic.js` (leak risk); indexes; split platform admin vs owner (admin-only routes listed in the audit:
push-to-master, delete-from-master, purge-ingredient-everywhere, shared term creation, global
dictionary; client `UserService.isAdmin_` ~18 refs); Atlas backfill (~20 collections incl.
TRASH_*/VERSION_HISTORY/activity_log); rewrite userId-keyed server tests; `server/test/invariants.test.js`
INV-2 is only `it.todo` — make it real.
Acceptance: new signup with business name → owner, sees base catalog. Users in X and Y: a product made
in X never appears in Y in any list, search, count, trash or history. Owner and staff of one business
see the same product; owner's edit shows for staff after refresh. A pre-migration user logs in after
and sees exactly the same counts of products, recipes, dishes, suppliers, events. Owner does not see AI
model management, master, global dictionary; platform admin does. Server tests: for every data type,
cross-business read and write blocked (403 or empty).

### 01.2 — Team and permissions (M)

Flow: owner opens Settings → Team → "הוסף חבר צוות"; enters username + initial password (no email, no
invite, no forced password change). Staff logs in straight into the business. Team list: name, role,
last login (from 07.1), "הסר". Remove → staff can't log in; their items stay.
Rules — owner: everything in their business. Staff:
- views all business data; creates products, recipes, dishes, suppliers, equipment, events;
- edits and deletes only items they created;
- cannot change product prices — price fields locked in the form and on the server; a product a staff
  member creates is saved without price and is "לא סגור סופית" until the owner prices it (03.3);
- cannot change business settings, event types, serving types, or manage the team;
- **money fields: sees, never edits.** Full list (applies to every plan): product prices, price per
  guest to client, extra costs, profit target and safety margin per event, deposit amount and date,
  actual amounts paid, actual revenue, business settings;
- prints all lists and marks steps done in cook view;
- exceptions to "only items they created", on any event: add a note (09.1), mark "arrived" /
  "invoice" and upload delivery-note photo (08.1), mark done in cook view. Stage changes — only on
  events they created (and the owner on all).
- Every permission check goes through one central checker on the server. UI hides/locks by the same
  rules; the server decides. Denied write → 403 + Hebrew message "אין לך הרשאה לפעולה הזו".
Edge cases: staff sends a new price via API → 403, price unchanged. Staff on owner's recipe → no edit
button; forced → 403. Username taken → "שם המשתמש תפוס". Owner can't remove self.
Out: email invite / reset, role change staff→owner, per-person permissions, change proposals.
Acceptance: owner adds staff → staff logs in, sees all products and recipes. Staff opens a product →
price fields locked; API with new price → 403. Staff creates, edits, deletes own recipe → ok. Owner's
recipe for staff → no edit/delete buttons. Owner removes staff → next login fails, staff's recipe still
exists. "הגדרות עסק" not visible to staff.

### 02.1 — Lean entry of products and recipes (M)

Today: recipe already lean (name, yield + unit, ≥1 ingredient with amount; unlinked free-text rows
allowed with confirm). Product form requires name, baseUnit, `buy_price_global_`, categories (min 1),
yieldFactor (`product-form.component.ts` ~L375-388, growth-frozen). AI recipe flow works (FAB sparkles →
modal → editable draft → builder). `POST /api/v1/ai/parse-text` + `GeminiService.parseText()` exist with
no caller. Unmatched ingredient → `.unlinked-row` (dashed primary). Course still requires `color`
(`taxonomy-term.schema.ts` L109; client fakes `COURSE_NEUTRAL_COLOR`; `seed-master.js` seeds colors).
Flow: (1) new product: name + base unit, save; everything else optional. (2) "הדבק מתכון" in the recipe
book FAB next to "מתכון ב-AI": paste free text → same path as AI recipe (draft → builder → save).
(3) "הדבק מצרכים" button in the recipe builder ingredients table: one ingredient per line
("2 ק"ג עגבניות") → rows added to the open recipe, linked to existing products when matched.
Rules: product required = name + base unit only; price, category, supplier, waste factor optional;
default waste factor 1. Product without price = "לא סגור סופית" (03.3). Paste ingredients: per line
amount, unit, name; an unparsed line is added as an unlinked row with its original text, never dropped.
Unlinked rows (AI or paste) shown **red** with label "לא מוכן"; click opens create/edit product (existing
behavior). Recipe with unready rows saves; its cost is "partial" (03.3). AI draft stays editable before
the builder. Course: remove the color field from data and seed. AI only through the server (INV-6).
Edge cases: empty / unrecognized text → "לא זוהה מתכון בטקסט", no empty draft. Quota exhausted →
existing quota message. Unknown unit → saved as text, "לא מוכן". Product without category → listed under
"כללי". If 03.3 is not merged yet → no "לא סגור סופית"/"partial" labels; they arrive with 03.3.
Out: green mobile header, drag-reorder units, global AI quota meter, bulk product import (06.2).
Acceptance: product with name + unit only → saves, marked "לא סגור סופית". Paste "2 ק"ג עגבניות\n200
גרם מלח\nקצת פטרוזיליה" → 3 rows: 2 linked (if products exist), the 3rd red "לא מוכן" with original
text. "הדבק מתכון" with a full recipe → draft with name, ingredients, steps → open in builder → save.
Course-type management neither shows nor requires a color.

### 03.1 — Double coefficient and per-dish coefficient (M)

Today: event types (taxonomy kind `eventType`) and serving types (kind `menuType`) are names only.
`derivePortions` (`menu-intelligence.service.ts` L19-38): non-cocktail = guests × servingPortions;
`cocktail_passed` = round(guests × piecesPerPerson × takeRate), and `buildEventFromForm` never sets
`piecesPerPerson` → 0 portions; UI cost uses `getPiecesPerPerson() ?? 1` → footer and export disagree
(spec at `menu-intelligence.service.spec.ts` ~L55 locks the bug). `predictedTakeRate` (default 0.4)
shown but unused. Prep item: factor = portions / yieldAmount with prep yield in grams → nonsense.
`loadEvent` loads `servingPortions ?? 0`, `buildEventFromForm` coerces `|| 1`.
Flow: settings lists event types and serving types, each with name + coefficient; owner adds, edits,
deletes. Building a menu: pick event type, serving type, guests. Each dish shows "מקדם המנה" (default =
event coef × serving coef) and derived portions. Changing a dish's coefficient marks it "שונה ידנית"
with "חזור לברירת מחדל".
Rules:
- Coefficient: decimal > 0, max 2 decimals (only for a user-typed value; the computed default is not
  rounded).
- Seed serving types: לשולחן (סרוויס רוסי) 1.0 · בופה 1.1 · פלייט שף פרונטלי 2 · קוקטייל – מנות ביס 3.
  Seed event types: עסקי 1.1 · פרטי 1.15 · חתונה 1.2 · מסיבה 1.1 · כנסים 0.9.
- Existing terms without a coefficient → 1.0. Map existing serving keys: plated/table → 1.0,
  `buffet_family` → 1.1, `cocktail_passed` → 3. Add "פלייט שף פרונטלי" as new.
- Only owner creates/edits/deletes types. Each event stores name + coefficient of its event type and
  serving type at selection time; editing/deleting a type later never changes existing events.
- Formula: portions per dish = portions per diner × guests × dish coefficient.
- Changing event/serving type updates only dishes not manually overridden.
- Rounding: portions first rounded to 6 decimals (kill float error), then **up** to an integer — only
  for items counted in portion units. A prep measured in kg/liter is not rounded up; displayed per 04.1.
- Remove "אחוז לקיחה" and "חתיכות לאדם" from UI and math; the dish coefficient replaces them.
- Prep added directly to the menu: per-diner amount is in the prep's yield unit (e.g. kg) and the dish
  coefficient applies to it.
- All lists (cost, shopping, prep, orders) use the same portions number, computed in one place.
Edge cases: guests 0 → all 0 + "הזן מספר אורחים". Portions per diner 0 → 0 + warning, no silent 0→1.
Event created before this change (no stored coefficient) → 1.0 for each type, portions unchanged.
Out: split engine by main-course count, event-attributes engine (time, kids, alcohol).
Interface: 04.1 receives portions per menu item and never computes them.
Acceptance: 100 guests, private (1.15), buffet (1.1), 1 portion/diner → coefficient 1.265 (shown 1.27),
127 portions. Override that dish to 1.1 → 110, "שונה ידנית". Switch event to wedding (1.2) →
non-overridden dishes 1.32 → 132; overridden stays 110. Cocktail (3), private, 50 guests, 1 bite/diner →
173 bites, shopping list not empty. Prep "רוטב" in menu, 0.05 kg/diner, 100 guests, coef 1.0 → 5 kg.
Owner creates event type "בר מצווה" 1.25 → selectable and used. Business (1.1) × buffet (1.1), 100
guests, 1/diner → **121, not 122** (float check).

### 03.2 — Live pricing and profit target (M)

Today: footer shows food cost, food-cost %, revenue, cost/guest, profit/guest (page.ts L192-238, html
L313-338). No target, extra costs, safety margin, "meets target". Hard-coded 33% warning (html L321);
`financialTargets` hard-coded `{30, 0}` on save. Revenue computed two different ways
(`totalRevenue_` vs `computeEventRevenue`), different for cocktail.
Flow: owner sets in business settings: profit target, safety margin, overrun threshold. In the menu the
chef enters "מחיר לאורח ללקוח" and "עלויות נוספות" (one amount + short note). Meter updates instantly on
any change (dish, coefficient, guests, price, costs). Target and margin can be overridden for this event
only, without changing business settings.
Rules:
- Business settings defaults: profit target 25% net, safety margin 10%, overrun threshold 10% (used by
  08.1). Owner only. Stored as the business's settings doc (plan 4).
- Price per guest is an event field. If empty: revenue = Σ(dish sell price × its portions per 03.1) and
  computed price per guest = revenue ÷ guests, labeled "מחושב".
- One calculation place, used by every screen: food cost = Σ dish costs (04.1 engine); total cost = food
  + extra; revenue = price per guest × guests; profit = revenue − total cost; profit % = profit ÷
  revenue; profit per guest = profit ÷ guests; min price per guest for target = total cost ÷ (1 − target)
  ÷ guests; recommended safety margin = revenue × margin %, ₪, whole event.
- Meter shows: price per guest · profit per guest · profit % · green "עומד ביעד" or red "חסר X ₪
  לאורח" · min price per guest · "מומלץ להוסיף X ₪ מרווח ביטחון". Margin shown to the chef only.
- Remove the 33% warning and the hard-coded 30% target. Any partial cost → every meter number marked
  "חלקי" (03.3). Save stores price per guest, extra costs + note, per-event target and margin.
- Editing event money fields — owner only (01.2).
Edge cases: revenue 0 → profit % "—". Target ≥ 100% → field error, can't save. Negative extra costs →
not allowed.
Out: cost breakdown (labor, transport, equipment), client PDF quote, safety factors per event type.
Acceptance: 50 guests, food 4,000, extra 1,000, 200/guest → revenue 10,000, profit 5,000 (50%),
100/guest, "עומד ביעד", min 133.33, margin 1,000. Same at 120/guest → revenue 6,000, profit 1,000
(16.7%), red "חסר 13.33 ₪ לאורח". Event target 15% → "עומד ביעד", business stays 25%. Adding a dish
updates the meter without save or refresh. Same revenue in meter, menu library and dashboard.

### 03.3 — Product without price and partial total (M)

Today: missing price → `getEffectivePrice` (min supplier → `buy_price_global_` → 0) →
`computeIngredientCost` (`recipe-cost.service.ts` L256-288) silently 0; deleted refs 0.
`product-validation.util.ts` `getProductValidationStatus()` lumps price/category/supplier into `incomplete`.
Flow: totals show a "חלקי" badge (menu, dish, recipe, shopping list, supplier order). Hover/tap →
"חסרים מחירים" popover: product name and in which recipe/dish. Click a product → inline quick price edit;
after save the total and badge update immediately, without leaving the screen.
Rules: "לא סגור סופית" = product with no price > 0 in any source (global, supplier, purchase-unit
override). A dedicated label, separate from "חסר פרטים" (missing category/supplier never makes a total
partial); shown in inventory and available as a filter. A total is partial if any of these takes part:
unpriced product; unlinked (free-text) ingredient; reference to a deleted product/prep. Recursive (prep
with unpriced product → dish and event partial). Partial total shows the computed number + badge, not
"—". Price edit from the popover: owner only; staff sees "ממתין לתמחור של הבעלים".
Edge cases: unlinked ingredient listed as "לא מקושר", click opens existing link flow. Deleted ref listed
"נמחק", no edit, offer to open the recipe. Same product in several recipes → once, with recipe list.
Out: stale-price alert.
Acceptance: recipe with tomato (5 ₪/kg) and unpriced oil → cost with "חלקי"; popover shows "שמן" with
the recipe name below. Same recipe in a menu dish → dish and event meter both "חלקי". Enter oil price
from the popover → badge disappears, total updates, no navigation. Inventory filter "לא סגור סופית" shows
only unpriced products; a priced product without category is not in it.

### 04.1 — One quantity engine for every list (L, 2 plans: engine + tests, then wiring)

Broken today (audit, ranked): (1) `ScalingService.getScaledIngredients` (L44-78) is flat; `type:'recipe'`
rows land under 'הכנות' — sub-recipe ingredients never reach the list; (2) aggregation key name + unit,
no unit normalization, `unitPrice = cost/amount` meaningless when mixed; (3) `product.yieldFactor` only
in cost (`recipe-cost.service.ts` L276), not quantity; (4) prep menu item factor = portions / yieldAmount
in grams; (5) cocktail 0 (03.1); (6) take rate unused; (7) yield division `Math.max(1, yieldAmount)` in
cost vs `yieldAmount || 1` in lists; (8) aggregates by display name, unlinked `nameSnapshot` merges with
linked same-name; (9) station grouping broken (04.3); (10) rounding drift Excel vs preview; (11)
servingPortions load/save coercion. Shopping list duplicated 3× in `menu-export.service.ts`:
`exportMenuShoppingList` (L109-181), `getMenuShoppingListPreviewPayload` (L430-495),
`addMenuShoppingListSheetToWorkbook` (L827-896). Tests: `export.service.spec.ts` L107-197 mocks
ScalingService; nothing tests aggregated quantities, units or nested preps. `getSupplierIds` in
`product-source.util.ts` L16 unused.
Engine (no new screen): input = event (menu + portions per item from 03.1). Output: (1) raw products —
per product: net qty, qty to buy, unit, estimated cost, which dishes; (2) preps — qty + unit + which dish
(for 04.3); (3) cost per dish and per event (for 03.2) with "partial" (03.3).
Rules:
- Recursive expansion: prep inside a dish expands by (qty needed from prep ÷ prep yield), no depth limit.
- Cycle (direct or indirect) → stop, list error "הכנה מעגלית: X", no infinite loop.
- Shopping list = raw products only; preps go to prep sheets (04.3).
- Aggregate by product id, not name; convert every qty to the product's base unit before summing.
- Waste: qty to buy = net ÷ product waste factor (0.8 = 80% usable). Factor 0/empty → 1.
- Purchase unit (e.g. 10 kg crate): also show qty in purchase units, rounded up.
- Display rounding, identical everywhere (screen, print, Excel, WhatsApp): kg/liter ≤ 2 decimals;
  g/ml integer; units and purchase units up to integer. Internal math never rounds. Above 1,000 g show
  kg; above 1,000 ml show liter.
- Unlinked ingredient → group "לא מקושר", own name and unit, never merged with a product.
- Same yield division in cost and quantity; yield 0/empty = flagged error, not a silent 1.
- Every list and cost reads only from the engine; the 3 copies are replaced.
- Chosen supplier: cheapest by price per base unit; supplier without price never chosen; tie → first in
  the product's supplier list; no priced supplier → product's global price, group "ללא ספק".
- Line cost = qty to buy (after waste, before purchase-unit rounding) × chosen supplier price per base
  unit. Event food cost (03.2) = Σ all lines incl. "ללא ספק" = Σ supplier orders (04.2) = planned in 08.1.
- Money/percent display everywhere: ₪ 2 decimals; profit % and overrun % 1 decimal; dashboard % integer.
Edge cases: no conversion between units used (e.g. "יחידה" vs "גרם" with no unit weight) → two lines
marked "לא ניתן לאחד – חסרה המרה". Deleted product → line "נמחק" with stored name, no cost. Dish with no
ingredients → contributes nothing, marked "אין מצרכים".
Out: warehouse stock deduction, standing orders.
Dependency: portions from 03.1; until 03.1 merges, use today's portions. 04.2, 04.3, 03.2, 03.3, 08.1 read it.
Acceptance fixture (automated, hand-computed): dish "סלט" yield 10 portions: 500 g tomato + 200 g "רוטב".
Prep "רוטב" yield 1 kg: 800 g olive oil + 0.2 kg lemon. Dish "פסטה" yield 5 portions: 1 kg tomato. Event:
100 portions salad, 50 portions pasta. Tomato 5 + 10 = 15 kg net; waste 0.8 → 18.75 kg to buy, one line.
Olive oil 1.6 kg. Lemon 0.4 kg. "רוטב" not on the shopping list; on prep sheets as 2 kg. Same event cost on
screen, preview, Excel and dashboard. Cyclic prep → error message, screen doesn't hang.

### 04.2 — Supplier orders and copy to WhatsApp (M)

Today: shopping list grouped by category only; output xlsx/preview/print; no text, clipboard, share or
WhatsApp (grep `clipboard|navigator.share|whatsapp|wa.me`: none). Supplier has name, phone, contact.
Flow: menu → "הזמנות לספקים" (FAB and toolbar, mobile and desktop) → a card per supplier: name, phone,
lines (product · qty to buy · unit from 04.1), estimated total ₪ (chef only). Per card "העתק" and "שלח
ב-WhatsApp". WhatsApp: supplier has phone → open WhatsApp chat with the message ready; no phone → native
share sheet; desktop without share → copy. "העתק" → copy + toast "הועתק – הדבק ב-WhatsApp". Top:
"העתק הכל" — all orders in one message, separated by supplier.
Rules: product → supplier = the 04.1 chosen supplier. No supplier → card "ללא ספק", no WhatsApp button.
No per-line supplier change in this screen (change on the product). Message (plain text, no tables, no
emoji):
```
הזמנה – [שם העסק]
לאירוע: [שם האירוע] · [תאריך האירוע]

עגבנייה – 18.75 ק"ג
שמן זית – 1.6 ק"ג
לימון – 0.4 ק"ג

תודה!
```
Line = name – qty unit; Hebrew short units (ק"ג, גרם, ליטר, מ"ל, יח'); 04.1 rounding. Every line starts
with RLM (U+200F). Purchase unit in parentheses: "עגבנייה – 18.75 ק"ג (2 ארגזים)". No prices in the
message. Israeli 05X → 9725X for the wa.me link. Unlinked and "לא ניתן לאחד" lines go to a "לבדיקה" card,
never sent. Missing price → total "חלקי", doesn't block sending.
Edge cases: invalid phone → WhatsApp button copies with "מספר לא תקין – הועתק להדבקה". Event with no
portions → "אין מה להזמין". Clipboard blocked → selected textarea for manual copy.
Out: saved order records, supplier status, auto-send, WhatsApp Business API.
Acceptance: menu → "הזמנות לספקים" (1) → "שלח ב-WhatsApp" on a supplier with phone (2) → WhatsApp opens
with the message — on Android, iPhone, desktop. Pasted message: one product per line, right-aligned, qty
and unit next to the name; "Mozzarella" doesn't flip the line. Numbers equal the shopping list and the
04.1 fixture. A product with two suppliers appears only under the cheaper. "העתק הכל" returns all
suppliers, separated by a blank line and supplier name.

### 04.3 — Printed prep sheets for the team (M)

Today: prep checklist by dish / category / station with preview, print, Excel
(`getMenuChecklistPreviewPayload` L498-608). by_category / by_station flatten into one "accumulated"
block, group names not printed. `recipe-form.service.ts` L284 always saves `defaultStation: ''`;
`recipe.defaultStation ?? 'כללי'` (export L270, 573, 763) doesn't catch ''. No station taxonomy kind.
Print CSS in `src/styles.scss` L2119+ uses a visibility hack.
Flow: menu → "דפי הכנה" → by dish / by category / by station. Preview shows pages as printed. Above it a
checkbox per group to choose what to print (e.g. only "קר"). "הדפס" prints selected only. Same screen
also prints supplier orders (04.2), one page per supplier (if 04.2 merged).
Rules: each group starts on a new page. Page header: group name (large, bold) · event name · date ·
guests · serving type. Row: ☐ empty checkbox · prep name · qty · unit · "למנה" (in category/station
sheets) · recipe note if any. Same prep for several dishes in one group → one row with total qty, all
dishes in "למנה". Print: A4 portrait, RTL, body ≥ 14pt, group title ≥ 20pt, black on white, no
backgrounds, no app chrome or buttons, rows never split across pages, table header repeats per page.
Footer: "עמוד X מתוך Y · [שם הקבוצה]". Stations: new taxonomy kind per business, owner edits in metadata
manager (defaults: חם, קר, מאפה, קינוחים, הגשה); recipe builder picks a station; recipe without station →
"כללי". A prep row belongs to the station of the dish it serves, not the prep's own station. Dish with no
preps appears in "by dish" with "אין הכנות במנה זו". Quantities only from 04.1, same rounding. Same
content in print, preview and Excel.
Edge cases: empty group not printed. Long prep name wraps, not cut. Print from phone: same layout
(browser print / save as PDF).
Out: assign sheet to a named worker, digital checklist tracking. Cook view (Concept D) unchanged.
Acceptance: menu with dishes in "חם" and "קר", print by station → ≥ 2 pages, each starts with station name,
event name, date, guests. Select only "קר" → only that page. "רוטב" from the 04.1 fixture → 2 kg. Chrome
print preview (desktop + Android): no menus/buttons, checkboxes present, no row cut between pages. Pick a
station in the recipe builder and save → recipe appears under that station.

### 06.1 — Guided onboarding and opening baseline (M)

Today: signup clones full master; no baseline form, no setup checklist; no demo mode in production (guest
login dev-only); `seed-master.js` reads `public/assets/data/demo-*.json` but only `demoProducts.json`
exists (stale ref `recipe-data.service.ts` L52); PWA manifest name "foodVibe1.0".
Flow: Dandan sits with the owner who signs up (01.1). Owner's first login → "פרטי פתיחה" screen (skippable,
reachable later from settings). Dashboard shows a "הקמת העסק" card until done, steps auto-checked from data.
Rules: baseline = monthly average of the last 3 months, all optional: inquiries/month; events closed/month;
average revenue per event (₪); estimated profit %. Stored on the business with fill date; owner can
update (date updates). Setup steps: 10 products with price; ≥1 supplier; first recipe; first event menu;
staff member (optional). A step is ✓ only for data created inside the business, not items cloned from
master. Card disappears when all required steps are done, or on "הסתר". PWA: name "FoodVibe", dir rtl,
lang he. New business catalog: full master copy as today.
Edge cases: staff sees neither the baseline screen nor the card. No baseline → dashboard shows "אין
נתוני פתיחה" instead of % change.
Out: self-serve signup with "magic moment" demo data (5 recipes, 2 menus).
Acceptance: new owner logs in → baseline screen; "4 אירועים לחודש, 12,000 ₪ לאירוע" → saved with date,
shown in settings. After creating a first recipe → step ✓ without manual refresh. Install on phone → app
name "FoodVibe".

### 06.2 — Import products from a list (M, in MVP)

Flow: inventory → "ייבוא מוצרים" → paste text (WhatsApp price list or columns copied from Excel), pick a
supplier (optional) → server AI parses into an editable preview table: name · base unit · price ·
purchase unit · category. Rows matching an existing product → "קיים – עדכן מחיר", else "חדש". "שמור הכל" →
create/update; summary "X נוצרו, Y עודכנו, Z דולגו".
Rules: ≤ 200 rows per import. Row without name → removed from preview. Row without unit → "יחידה",
flagged for review. Missing price → saved "לא סגור סופית". Supplier chosen → price saved as that
supplier's price on the product; none → product global price. Duplicate rows → last wins, shown once with
"כפול". "דולגו" = rows deleted in preview, or matched an existing product at the same price. Match by
normalized name; update changes only price and supplier, never name or unit. Owner only. One AI call per
import, counted in quota (INV-6).
Edge cases: AI fails / quota exhausted → message, text stays for retry.
Out: bulk recipe import, Excel file upload, automatic price-list sync.
Acceptance: paste "עגבנייה 5.9 לק"ג\nמלפפון 4.5 לק"ג\nשמנת 32% 1 ליטר 12" with supplier "ירקן" → 3 rows:
עגבנייה · ק"ג · 5.9 ₪; מלפפון · ק"ג · 4.5 ₪; שמנת 32% · ליטר · 12 ₪. "שמור הכל" → 3 products, price
under "ירקן". Re-import "עגבנייה 6.2 לק"ג" → "קיים – עדכן מחיר", after save price 6.2.

### 07.1 — Usage measurement (S–M)

Today: dashboard "recent activity" = localStorage only (`activity-log.service.ts`, key `activity_log`);
`server/services/log-sink.js` → `app_logs`, 90-day TTL, info only with `LOG_PERSIST_INFO=1` (not set in
`render.yaml`). Not usable → dedicated collection.
Rules: server writes one "active day" record per user per day (Israel time) on every authenticated
request; no client code. Fields: user · business · date · first time · last time · write count. Write =
POST/PUT/PATCH/DELETE to business data, excluding login/refresh/logout routes. No TTL, separate from logs.
No content stored. "Usage days per week" = active days Sun–Sat; for a business = days with ≥1 active
user. Cheap: one update per write request, at most one per minute for reads. "Last login" for 01.2 and
07.3 comes from the latest record. The browser activity log stays as is.
Edge cases: anonymous → not recorded. Midnight → new record. Removed user → records stay.
Out: page views, external analytics, session recording.
Acceptance: user logs in, saves a recipe and a product → one record today with 2 writes. Active Sunday and
Tuesday → 2 usage days that week. Owner and staff active the same day → business counts 1 day. Save
latency +< 20 ms.

### 07.2 — Business performance dashboard (L, last)

Today: 4 KPI cards (products, recipes+dishes, low stock, unapproved) in
`src/app/pages/dashboard/components/dashboard-overview/*`; sparklines are hard-coded SVG paths; recent
activity localStorage; no events or money metrics.
Flow: top "ביצועים" area with period picker 30 days (default) / 90 days / from the start. Below: stage
funnel and upcoming events. Existing cards stay below, without the fake sparklines.
Cards (for the period): (1) פניות — events created in period. (2) אירועים שנסגרו — events whose close date
is in period (09.1); close rate = closed ÷ (closed + not closed). (3) הכנסות — Σ planned revenue (03.2), or
actual revenue if finished (08.1), of closed events. (4) דיוק תמחור — average (actual profit % − planned
profit %) of events finished in period, plus average actual profit %. (5) ימי שימוש בשבוע — active days in
period ÷ (period days ÷ 7), from 07.1.
Baseline comparison: cards 1–3 normalized to a month (value ÷ period days × 30) vs baseline (06.1):
green "+X% מול לפני" or red "−X%". Revenue baseline = closed events/month × average revenue/event. Card 4:
average actual profit % vs baseline estimated profit %, as a points difference. No baseline → "אין נתוני
פתיחה". A reopened event counts by planned revenue until finished again. Events marked "ישן" (09.1) never
count. Deleted events never count.
Funnel: count of active events per stage now, "פנייה" to "פוסט-פרודקשן"; click → menu library filtered to
that stage. Upcoming: next 14 days — name, date, guests, stage. Staff sees funnel and upcoming only, no
revenue/profit. All numbers computed on the server; the dashboard never loads all events into the browser.
New area built in the dashboard's existing design language (no design reference).
Edge cases: no events → zeros + "צור פנייה ראשונה". No finished events → accuracy "—" with "יופיע אחרי
סגירת אירוע ראשון". "From the start" = from business creation.
Out: charts over time, report export, cross-business comparison.
Acceptance (fixture: last 30 days; 10 inquiries; 4 closed, 3 not closed; revenue 48,000; 2 finished with
accuracy +2 and −4 points; baseline 6 inquiries/month, 3 events/month, 12,000/event): inquiries 10
"+67% מול לפני"; closed 4, close rate 57%, "+33% מול לפני"; revenue 48,000 "+33% מול לפני" (vs 36,000);
accuracy "−1 נקודה בממוצע"; staff sees funnel and upcoming, no money cards; fake sparklines gone.

### 07.3 — Platform admin dashboard (M)

Today: admin has only user list + delete (`server/routes/admin.js`: `GET /users`, `DELETE /users/:userId`);
no stats; all data routes scoped to one user.
Flow: platform admin only → "דאשבורד מערכת": table, one row per business — name, owner, staff count, join
date; last activity, active days in last 7 days; events total / active / closed / finished; close rate,
last event date. Sort by any column, default last activity. Click a business → the same 07.2 performance
cards, read-only (only if 07.2 merged; otherwise table only).
Rules: admin sees metrics only, no business content (recipes, products, prices) from this screen. Inactive
7 days → yellow, 14 → red. Server-computed. Event columns and close rate all-time; active days last 7.
Edge cases: business with no events → zeros. Dandan's own business marked "פנימי" (admin toggles from the
table) and excluded from totals.
Out: impersonation, billing, cross-business money totals.
Acceptance: two test businesses → two rows with correct numbers from 07.1 and 09.1. Owner opening the
screen or its API → 403. Click a business → its performance cards, no edit buttons.

### 08.1 — Event closing: payments and actual profit (M–L)

Today: no actual cost, supplier payment or actual profit; planned profit only on screen, not stored.
Image upload exists: `cloudinary.service.ts` (unsigned, cloud `dsxi4o2gb`, preset `foodvibe`),
`downscale-image.util.ts`, used in `recipe-header.component.ts` and `venue-form.component.ts`.
Flow:
1. Planning snapshot: on entering "הזמנות" (09.1) store the plan — estimated cost per supplier (04.2), extra
   costs, planned revenue and profit. Updated on every event save until the first entry into "ביצוע", then
   frozen. Going back doesn't unfreeze; owner can click "רענן תכנון". Event that skipped "הזמנות" → snapshot
   on entering "ביצוע" (or "פוסט-פרודקשן" if that was skipped too). A product price change enters the
   snapshot on the next event save (until frozen).
2. Entering "פוסט-פרודקשן" opens "סגירת אירוע" (also from a button on the event screen).
3. Row per supplier: planned ₪ · actual paid ₪ (typed) · ☐ arrived · ☐ has invoice · delivery-note photo
   (camera or file, several).
4. "הוסף ספק" for an unplanned supplier. A "ללא ספק" row holds products without supplier. Σ planned rows =
   03.2 food cost (04.1).
5. "עלויות נוספות בפועל" one amount. "הכנסה בפועל" defaults to planned revenue, editable.
6. Footer: planned vs actual profit, ₪ and %, and the difference.
7. "סיים אירוע" (owner only) → stage "הסתיים", data locked. Owner can "פתח מחדש" → back to "פוסט-פרודקשן".
Rules: supplier overrun: |actual − planned| ÷ planned > threshold (business settings, default 10%) → row red
"חריגה של X% (Y ₪)". A decrease shows grey with the % at any size (info, not alert). Actual profit = actual
revenue − Σ actual payments − actual extra costs; actual profit % = actual profit ÷ actual revenue. Pricing
accuracy per event = actual profit % − planned profit %, in points; feeds 07.2. Supplier with no actual
amount counts as planned, result "חלקית" until all rows filled. Amounts: owner only; photo, arrived,
invoice: staff too. Photo stored as an image link on the event, no OCR. "סיים אירוע" allowed with missing
amounts, warning "חסרים סכומים ל-X ספקים".
Edge cases: planned 0 (added manually) → no %, amount only. Event jumping straight to "פוסט-פרודקשן" →
snapshot at that moment. Reopen after finish → recorded in stage history.
Out: OCR, line-by-line weight check, accounting, tax invoices.
Acceptance: revenue 10,000; planned supplier A 1,000, B 2,000, extra 1,000 → planned profit 6,000 (60%).
Actual A 1,150, B 1,950, extra 1,000 → A red "חריגה של 15% (150 ₪)", B grey (−2.5%), actual profit 5,900
(59%), accuracy −1 point. Delivery-note photo from phone → saved, thumbnail in the supplier row. "סיים
אירוע" → "הסתיים", fields locked, counted in dashboard accuracy. Product price change after "ביצוע" →
planned amount in the closing dialog unchanged.

### 09.1 — Event pipeline and notes (M)

Today: event = name, event type, date, serving type, guests, menu. `menuEventSchema` (strictObject) has no
status, notes, customer or history. Library (`menu-library-list.component.ts`) filters type / serving /
date, sorts name / date / food cost / guests. Event trash exists (`TRASH_MENU_EVENTS`) but the Trash page
lists only dishes/recipes/products.
Flow: (1) "פנייה חדשה": short form, no menu — client/event name, client phone (optional), date, guests,
event type, first note → event created in "פנייה". (2) Stage bar at the top of the event screen in Menu
Intelligence; click a stage to move. (3) Library: stage column, stage filter, default view "פעילים"
(excludes "הסתיים" and "לא נסגר"). (4) Notes log on the event screen side: "הוסף הערה" in any stage; newest
first, with date and author.
Rules: stages in order: פנייה → הצעת מחיר נשלחה → מקדמה שולמה → הזמנות → ביצוע → פוסט-פרודקשן → הסתיים.
Extra end stage "לא נסגר", reachable from פנייה or הצעת מחיר נשלחה only, for an event never closed; reason
required (מחיר / תאריך תפוס / הלקוח לא חזר / אחר) + optional text. "Closed" = ever reached "מקדמה שולמה" or
later, even if moved back; close date = the first such transition, never changes. "Not closed" date = last
transition into it. "מקדמה שולמה" is a marker; deposit amount + date optional, owner only, no payment
processing. Forward, backward and skipping allowed; every transition logged (stage, date-time, who); history
never deleted. Who moves stages: owner, and the event's creator. Triggers: entering "הזמנות" → offer to
open "הזמנות לספקים" (only if 04.2 merged; snapshot belongs to 08.1); entering "פוסט-פרודקשן" → open the
closing dialog (08.1). "הסתיים" only via "סיים אירוע" (08.1), not selectable in the bar; "פתח מחדש" (owner)
→ back to "פוסט-פרודקשן". New event starts in "פנייה". Migration: pre-existing events → "הסתיים" if date
passed, "הצעת מחיר נשלחה" if future; marked "ישן"; never counted in dashboard metrics. Note: free text ≤
2,000 chars, date + author; edit/delete only your own notes. Client name + phone: optional event fields.
Cancellation after deposit: a note only (no "cancelled" status).
Edge cases: back from "לא נסגר" to "הצעת מחיר נשלחה" → allowed; counted "not closed" only while that is the
current stage. Delete event → trash as today, gone from metrics. Event without date → allowed in "פנייה",
required from "מקדמה שולמה".
Out: bot, lead intake from WhatsApp/social, reminders, call recording, separate customer entity.
Acceptance: "פנייה חדשה" with name, date, 80 guests → in library at "פנייה". Move to "הצעת מחיר נשלחה" then
"מקדמה שולמה" with 2,000 → two history entries with date and author; counted "closed" on the dashboard at
that transition date. Move to "לא נסגר" without reason → blocked; with "מחיר" → saved, leaves "פעילים". Three
notes → newest first with name and date; can't edit another user's note. Enter "הזמנות" → offered to open
"הזמנות לספקים" (if 04.2 merged).

---

## Part 4 — Locked product decisions (Dandan, 2026-10-20)

All spec defaults above are approved. In particular:
- 01.1 minimal version (no staff private changes). Business name required at signup.
- New business gets the full master copy, as today. (Recommendation on file: products, units and
  categories only. Not chosen for MVP; keep the clone scope easy to narrow later.)
- 01.2 staff added by username + password, no email, no forced password change. Staff sees money fields,
  never edits them; on the dashboard staff sees no revenue/profit.
- 06.2 import is in the MVP. 02.1 paste recipe / paste ingredients is in the MVP; AI draft stays editable.
- 09.1 client name + phone optional; cancellation after deposit = note only.
- 04.2 product → cheapest supplier.
- 03.1 remove take rate and pieces per person.
- 08.1 snapshot freezes at "ביצוע"; arrival checklist, invoice flag and delivery-note photo are in the MVP.
- Pilot can start before 01.x finishes if the first business runs solo: core = 03.1–03.3, 04.1–04.3, 09.1;
  08.1 needed by the end of the first event.

Out of MVP: sales bot, full CRM, call recording, PDF quotes, billing, OCR, equipment derivation, venue
improvements (372–374), menu engineering, marketplace, green mobile recipe header, unit drag, global AI
quota meter, self-serve demo signup, staff private changes, per-business master.

Anything not decided here that changes product behavior is Dandan's call: ask, don't assume.
