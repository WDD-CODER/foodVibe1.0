# Plan 575 — Seed one demo catering business into a local database so every demo starts with full screens

Status: draft
Depends-on: none
Snapshot: 4ba8887cc16eb5c1c3d3ccd4a0bbb9b63cb6c3c9

## Problem Statement
A product demo today starts on empty screens: a fresh local database holds only the shared taxonomy, and the old
sample files were removed. This is step 5 of the "The Pass" theme board Dandan approved on 2026-11-10: one business
with good-looking data, so the dashboard, the recipe book, an event with its price bar and a closed event with planned
against actual profit can be shown in five minutes.

Verified on `origin/main` (4ba8887c, 2026-11-10):
- No script seeds a business or a user. `server/index.js:27` runs `seedMasterData()` (`server/services/seed-master.js:147`) at boot: master taxonomy terms (units, categories, allergens, courses, event types `עסקי|פרטי|חתונה|מסיבה|כנסים`, menu types `buffet_family|plated_course|cocktail_passed|chef_plated_front`), 5 stations and 45 logistics items. A fresh database has no master products, recipes or suppliers, so `cloneMasterDataToBusiness` copies nothing.
- Signup (`server/routes/auth.js:145-218`) stores the client-made hash as sent (`<32 hex salt>:<64 hex hash>`, PBKDF2-SHA-256, 100 000 rounds, 32 bytes — `verifyPbkdf2`, `auth.js:125-140`), creates the user (`server/models/user.model.js`), then `createBusinessFor(user, { name, masterVersion })` (`server/services/business.js:14-30`).
- Entity shapes are the strict Zod schemas in `shared/schemas/entities/` (`schemaVersion: 2`, `businessId`, `createdBy`, `createdAt`, `updatedAt` from `base.schema.ts`); `parseV2(type, doc)` (`server/utils/schema-check.js:23`) validates a stored document against them. `server/test/helpers/v2-docs.js` holds minimal valid bodies.
- Product prices: `sources[] { supplierId, price }` (plan 473) and `purchaseOptions[] { unitSymbol, conversionRate, uom? }` (plan 423). Product names are unique per business (plan 485).
- Event money is computed by the client only (`src/app/core/engine/event-pricing.ts:70` `computeEventPricing`, `:108` `toPricingCache`; `src/app/core/engine/plan-snapshot.ts:10`). The server only stores it and has pure stage helpers: `applyStageChange` (`server/utils/event-stage.js`), `initClosing` and `finishPatch` (`server/utils/closing-rules.js`). Stages: `inquiry, quote_sent, deposit_paid, ordering, execution, post_production, finished, not_closed` (`shared/schemas/entities/event-stage.ts:3`).
- The dashboard (`server/services/business-stats.js`) reads `createdAt`, `closedAt`, `notClosedAt`, `stage`, `eventDate` (`YYYY-MM-DD`), `guestCount`, `pricing.revenue`, `planSnapshot.plannedRevenue|plannedProfitPct|extraCosts`, `closing.finishedAt|actualRevenue|actualExtraCosts|suppliers[].actualPaid|planned`, `business.baseline` and `business.createdAt`; active days come from `usageDays` documents (`server/middleware/usage.js:39-51`).
- The write-script pattern: `server/scripts/release-removed-staff-names.js` (dry run by default, `--write`, `--target=local|atlas`, `--db=<scratch>` for local only) on top of `server/migrations/tools/_connect.js` (`parseArgs`, `connect`) and `server/utils/db-target.js`.
- `businesses.internal` (boolean) keeps a business out of the platform totals (`platform-dashboard.page.ts:110-112`).
- Server tests boot an in-memory Mongo with `server/test/helpers/app.js` (`buildTestApp`, `teardownTestApp`, `testDb`); run with `pnpm run test:server`.

## Goals & Success Criteria
**Primary:** one command fills a local database with one catering business whose dashboard, recipe book, product list
and events all look alive, and running it twice does not duplicate anything.

- [auto] `pnpm run test:server` passes, including `server/test/seed-demo-business.test.js`:
  - `buildDemoData({ now, ownerId, businessId })` returns exactly: 4 suppliers, 30 products, 6 recipes, 10 dishes, 2 venues, 6 clients, 7 menu events, 21 `usageDays` rows; every document passes `parseV2` for its collection (`suppliers`, `products`, `recipes`, `dishes`, `venues`, `clients`, `menuEvents`);
  - every product has at least one `sources[]` entry with `price > 0` and a `supplierId` of a seeded supplier; every ingredient `referenceId` and every menu item `recipeId` points at a seeded document; product names are unique;
  - the 7 events have the stages `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `finished`, `finished`, `not_closed`; each `pricing` equals the formula (revenue = `pricePerGuest × guestCount`, profit = revenue − food cost − extra costs, `profitPct` = profit ÷ revenue × 100 rounded to 2 decimals); the two finished events carry `planSnapshot`, `closing.finishedAt` and `closing.actualRevenue`;
  - `seedDemoBusiness(db, { write: true })` on an empty test database inserts the documents, a user and a business with `internal: true`; `GET /api/v1/stats/business?period=all` with that owner's token answers 200 with `inquiries` 7 and a `closed` count of 4; a second run inserts 0 documents and prints `already seeded`;
  - without `write` nothing is inserted;
  - `--target=atlas` makes `parseArgs` throw `demo seed is local only`.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] After `node server/scripts/seed-demo-business.js --target=local --write` on his local database, Dandan signs in as the demo owner and the dashboard, recipe book, inventory, an open event and a finished event all show believable Hebrew data.

## Execution Mode
- Parallel: yes — new files only, plus one row in `server/breadcrumbs.md`.
- Concurrent plans: any
- Isolated DB: no — the script writes only when a person runs it with `--write`, and only to a local database.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/seed-demo-business.js
server/scripts/lib/demo-data.js
server/test/seed-demo-business.test.js
server/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — every seeded document carries the demo business's `businessId` and its owner's id as `createdBy`; no route, permission or scope helper changes.
- INV-2: preserves — the seed writes only into its own business and never writes a `__master__` document.
- INV-4: preserves — every document is checked with `parseV2` against the shared schemas before it is inserted; a failure stops the script before any write.

## Reuse Check

- none — no new client component, util, pipe, service or `.c-*` class; a server script that reuses `_connect.js`, `parseV2`, `createBusinessFor`, `initClosing` and `finishPatch`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the person showing foodCo to a caterer, I want a business that already has recipes, prices and events so that the demo shows the product and not empty tables.

## Functional Requirements

### Must Have (P0)
- [ ] New `server/scripts/lib/demo-data.js`, pure (no database, no clock: `now` is a parameter): `buildDemoData({ now, ownerId, businessId, ownerName })` returns `{ suppliers, products, recipes, dishes, venues, clients, menuEvents, usageDays, baseline }`. Ids are fixed strings with the prefix `demo_` (for example `demo_sup_veg`, `demo_prod_onion`, `demo_evt_wedding`), so a second run finds them.
  - Suppliers (4): "ירקות השדה" (vegetables), "בשר ועוף הגליל" (meat), "מחסן יבש" (dry goods), "תבלינים ושמנים"; each with `deliveryDays`, `minOrderMov`, `leadTimeDays`, a contact person and a phone in the form `050-0000001` … `050-0000004`.
  - Products (30), base unit `kg` or `liter` from the master units, each with one `sources` price in ₪ and `categories` from the master category keys: 12 vegetables and herbs, 6 meat and fish, 8 dry goods, 4 oils and spices. At least 3 products have a second, more expensive source from another supplier, so the "cheaper supplier" hint has something to show. At least 4 have a `purchaseOptions` entry (for example a 10 kg crate).
  - Recipes (6 preparations, for example a marinade, a red-wine sauce, a tahini base) and dishes (10: 3 first courses, 4 mains, 3 desserts), each with 3–7 ingredient lines that reference seeded products (or a seeded recipe, with `type: 'recipe'`), `steps`, `yieldAmount`, `yieldUnit`, `defaultStation` from the master station keys, `isApproved: true` on 12 of the 16.
  - Venues (2): one `professional_kitchen`, one `outdoor_field`. Clients (6): names and phones `052-0000001` … `052-0000006`, with `phoneNormalized` as digits only.
  - Events (7), all `eventType` and `servingType` from the master keys, 40–220 guests, each with 2–3 sections of seeded dishes and `pricePerGuest`:
    - created 5–80 days before `now`, so the 30-day, 90-day and "all" dashboard periods differ;
    - stages and dates as listed in the Done-when item; the events in `deposit_paid` and `ordering` have an `eventDate` 5 and 11 days after `now` (they appear in "upcoming"); `closedAt` is set on the four events at or past `deposit_paid`; the `not_closed` event has `notClosedReason: 'price'` and `notClosedAt`;
    - `pricing` is computed inside this file by one function `demoPricing({ foodCost, pricePerGuest, guestCount, extraCost, now })` that follows `event-pricing.ts:76-92`; food cost is the sum of each item's portions × its dish's cost from the seeded prices;
    - `planSnapshot` on the events at or past `ordering` (suppliers with `plannedCost`, `plannedRevenue`, `plannedProfit`, `plannedProfitPct`); the two finished events get `closing` through `initClosing(planSnapshot)` and then actual numbers: one event 4% under its planned cost, one 9% over, `actualRevenue` equal to the planned revenue, `photos: []`.
  - `usageDays` (21 rows): one per day for 21 of the last 30 days, in the shape of `server/middleware/usage.js:39-51`.
  - `baseline`: `{ inquiriesPerMonth: 5, eventsClosedPerMonth: 2, avgRevenuePerEvent: 28000, estProfitPct: 22 }`.
- [ ] New `server/scripts/seed-demo-business.js`, same shape as `release-removed-staff-names.js`:
  - `parseArgs(argv)`: accepts `--target=local`, `--db=<name>`, `--write`; `--target=atlas` or `--confirm-host` throws `demo seed is local only`; any other argument throws `Unknown argument`.
  - `seedDemoBusiness(db, { write, now = Date.now(), passwordHash })`: finds or plans the user `demo_owner` (`name: 'demo_chef'`, `email: 'demo@foodco.invalid'`) and the business `demo_business` ("קייטרינג הדגמה", `internal: true`, `createdAt` 90 days before `now`, the baseline above); builds the data; runs `parseV2` on every entity document and stops with the first failure's path when one fails; inserts only documents whose `_id` is not in the database yet; returns `{ inserted, skipped }`.
  - The owner's password is never in the repository: `main()` reads `DEMO_OWNER_PASSWORD` from the environment, refuses to run with `--write` when it is unset or shorter than 8 characters, and builds the stored hash with `crypto.randomBytes(16)` and `crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')` in the `<saltHex>:<hashHex>` form. The password is never printed.
  - Output: one line per collection (`would insert 30 products` / `inserted 30 products`), then a summary line that ends `(dry run, nothing written; add --write)` or `done`; `already seeded` when nothing is new.
  - `module.exports = { parseArgs, seedDemoBusiness }`; `main()` runs only under `require.main === module`.
- [ ] New `server/test/seed-demo-business.test.js` with the cases of the first Done-when item, using `buildTestApp`, `teardownTestApp`, `testDb` and `signTestToken({ userId: 'demo_owner', businessId: 'demo_business', businessRole: 'owner' })`; call `seedMasterData()` first so the taxonomy keys exist.
- [ ] `server/breadcrumbs.md`: add the row `` | `scripts/seed-demo-business.js` | Fills a local database with one demo catering business (dry run by default; `--write`; local only) | ``.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No client change. All seeded names are Hebrew; no real person, business or phone number is used (phones are `05x-000000n`).

## Atomic Sub-tasks

- [ ] A1: Write the demo business's data as one pure builder so it can be tested without a database — suppliers, products, recipes, dishes, venues, clients, events with their money, usage days, baseline — server/scripts/lib/demo-data.js
- [ ] A2: Add the command that writes that data into a local database, safely and only once — arguments, local-only refusal, password from the environment, validate then insert what is missing — server/scripts/seed-demo-business.js
- [ ] A3: Test the data's shape and links, the money formula, the dashboard numbers, the second run and the local-only rule — server/test/seed-demo-business.test.js
- [ ] A4: List the new command in the server map — server/breadcrumbs.md
- [ ] A5: Run the server tests, the server lint, the build and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: `server/migrations/tools/_connect.js`, `server/utils/schema-check.js`, `server/services/business.js`, `server/utils/closing-rules.js`, `server/services/seed-master.js`.
- New files needed: the three files above.
- Model changes: none
- Backend / API: none — no route is added or changed.
- Auth and validation: the script creates one owner user directly in the database; the password comes from the environment and is stored only as a PBKDF2 hash.
- Security surface: a new user in a local database. The script refuses Atlas in code, so it cannot create a known account on the live site.
- Data / migration: writes only on `--write`, only to a local database, only documents whose id is absent. No existing document is changed or removed. To remove the demo data, drop the local scratch database (`--db=<name>` is the recommended way to run it).
- Project checks: log-query item present; generic entity contract and shared schemas are used as they are; no new collection.

## Out of Scope
- A demo restaurant and a demo private chef (this plan seeds the catering business only; the other two follow once this one is validated).
- Seeding the live (Atlas) database, a "reset demo" button, or a demo mode in the app.
- Images for dishes and venues.
- Front Desk data (requests, bookings, knowledge base): those collections arrive with plans 548–554.

## Critical Questions
- Q: Local database only, or also the live site? A: local only in this plan — the script refuses Atlas in code; a live demo business is a separate decision for the Human.
- Q: Where does the demo owner's password come from? A: the environment variable `DEMO_OWNER_PASSWORD`, set by the person who runs the script; never committed and never printed.

## Execution Notes
- Planner 2026-11-10: written in a cloud session where the in-memory test database cannot be downloaded (HTTP 403), so `pnpm run test:server` could not be run there; this plan is meant for a run on the Human's machine.
