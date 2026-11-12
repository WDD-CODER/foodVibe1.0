# Plan 583 — Give every shared product real shelf prices from three or more chains and corrected allergens, checked by a script

Status: done
Depends-on: none
Snapshot: 95f937b661645aec7ee7e097c9aa705e6453074d

## Problem Statement
The shared product catalog (`products` with `businessId: '__master__'`) came from a legacy import and several
migrations. Many products have no real price, a made-up price, or wrong allergens, so every food cost, quote and
allergen list the app shows is unreliable. Dandan is about to show the app to pilot businesses; a new business gets a
full copy of this catalog, so the catalog has to be right before anyone signs up. There are no real users yet: all
existing data is test data.

Verified on `origin/main` (95f937b6, 2026-11-11):
- Product shape `shared/schemas/entities/product.schema.ts`: `sources[] { supplierId, price, addedBy?, addedAt? }`,
  `allergens: string[]`, `allergenSource?: 'off' | 'llm'`, `baseUnit`, `categories`, `nutritionPer100g?`. A source
  price is the price per base unit (`src/app/core/models/product.model.ts:19`).
- The app costs a product by its cheapest positive source (`chooseSupplier`, `src/app/core/engine/supplier-choice.ts:14`;
  decision D110). Storing three chain prices therefore makes the cheapest of them the cost. The Human chose this.
- Supplier shape `shared/schemas/entities/supplier.schema.ts`: `nameHebrew`, `deliveryDays: number[]`, `minOrderMov`,
  `leadTimeDays` are required.
- `parseV2(type, doc)` (`server/utils/schema-check.js:23`) validates a stored v2 document.
- Exact-name duplicates in the master are merged by `server/scripts/dedupe-master-names.js` (plan 379; dry run by
  default, `--write`, `--out=FILE`). A business's clones are rebuilt by `server/scripts/reset-user-from-master.js`.
  `server/scripts/bump-master-version.js` must run after any script writes master documents.
- Target handling: `server/utils/db-target.js` (`parseTarget`, `loadServerEnv`, `mongoUri`); script connection
  pattern `server/migrations/tools/_connect.js` (`parseArgs`, `connect`).
- Master allergen keys seeded by `server/services/seed-master.js:46`: `gluten, eggs, peanuts, nuts, soy, milk_solids,
  sesame, fish, shellfish, seafood` (terms of kind `allergen` in `taxonomyTerms`; the local data may hold more).
- The Gemini free tier allows about 20 calls a day per model and is shared with every copy of the app
  (`docs/brain/gotchas/backend.md:297`). This plan makes no Gemini call.
- A fresh database has no master products (plan 575), so the catalog exists only in the Human's local data and the
  hosted data. The builder has not seen the numbers: sub-task A1 measures them.

Price source: Israeli food chains must publish every store's full price list as XML files (price transparency
rules, in force since 2015). Shufersal publishes at `https://prices.shufersal.co.il`; Rami Levy, Yochananof, Osher Ad,
Tiv Taam, Hazi Hinam and others publish through `https://url.publishedprices.co.il` (login per chain, CSRF token).
Reference for endpoints and the file format: `https://skills.sh/skills-il/food-and-dining/israeli-grocery-price-intelligence`.

Verified 2026-11-11 from a cloud session (details in `## Execution Notes`):
- Shufersal needs no sign-in. `GET https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=<id>` is an
  HTML table whose rows link to a signed `https://pricesprodpublic.blob.core.windows.net/pricefull/PriceFull<chain>-<sub>-<store>-<yyyymmdd>-<hhmmss>.gz?...`
  (the link expires within hours: list, then download at once). The store list is the `<option value>` list on
  `https://prices.shufersal.co.il/`. Paging: `&page=N`. Store 45 ("דיל ירושלים- תלפיות") had 8,381 items on 2026-11-11.
- Item elements as found (Shufersal, `<Root><Items><Item>`): `ItemCode, ItemName, ManufactureName, ManufactureItemDescription,
  UnitQty` (גרם / מיליליטר / קילוגרם / יחידות / ליטר / מטרים), `Quantity` (e.g. `250.00`), `UnitOfMeasure` (e.g. `100 גרם`),
  `bIsWeighted` (0/1), `QtyInPackage, ItemPrice` (shelf price incl. VAT), `UnitOfMeasurePrice` (price per `UnitOfMeasure`).
  The file starts with a UTF-8 BOM.
- `url.publishedprices.co.il` (Rami Levy, Yochananof, Osher Ad, Tiv Taam, …) needs a sign-in with the chain's public user
  name (e.g. `RamiLevi`, empty password): `GET /login` (read `csrftoken`), `POST /login/user`, then
  `POST /file/json/dir` (`sSearch=PriceFull`, `csrftoken`) and `GET /file/d/<name>`. Not yet exercised.
  The Human allowed this sign-in (2026-11-11).

## Goals & Success Criteria
**Primary:** in the local data, every non-deleted master product ends in exactly one of two recorded states —
`priced` (three or more chain prices, each stored as a source under a real chain supplier, allergens set) or
`unresolved` (untouched, with a written reason) — and one script proves it.

- [auto] `node server/scripts/catalog-enrichment/verify-enrichment.js --target=local` exits 0 and its last line starts
  with `CATALOG_ENRICHMENT: PASS`. It fails (exit 1, one line per failed check) unless all of these hold:
  1. every non-deleted master product id is in the ledger as `priced` or `unresolved` with a non-empty reason;
  2. every `priced` product has at least 3 sources with distinct `supplierId`s, each `price > 0`, each `supplierId`
     the `_id` of a non-deleted master supplier created or reused by this plan;
  3. for every `priced` product, highest source price ÷ lowest source price ≤ 2.5, and the price per kg / liter / unit
     is inside the plausibility band of A4 (Dan in chat 2026-11-12, a data rule of this plan, no invariant: "keep every chain and list the far ones" — a
     chain more than 2.5× from the others is kept as its own supplier and the product is marked `farChains` /
     `keepAllChains` in the ledger and listed in REPORT.md "Far-off chains"; for those products only the ratio is not
     checked — the band still is);
  4. every master product and every master supplier passes `parseV2`;
  5. every allergen key on every master product is a master term of kind `allergen`;
  6. no two non-deleted master products share a name under `normalizeProductName`
     (`server/utils/price-list-import.js:25`);
  7. the number of recipe and dish ingredient lines of type product whose reference resolves to a non-deleted master
     product is not lower than the number A1 recorded;
  8. the pilot audit and the final audit files exist and each records agreement ≥ 90%;
  9. the report file of A9 exists.
- [auto] `node server/scripts/catalog-enrichment/apply-enrichment.js --target=local` (no `--write`) run after the
  write prints `changes: 0`.
- [auto] `node server/scripts/catalog-enrichment/apply-enrichment.js --target=atlas` exits 1 with
  `catalog enrichment is local only`.
- [auto] `pnpm run test:server` passes, including `server/test/catalog-enrichment.test.js`.
- [auto] `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan opens `REPORT.md` in the work folder, reads the totals, the `unresolved` list, the "allergens removed"
  list and the "likely duplicates" list, and spot-checks 10 priced products in the app as the dev guest (inventory →
  product → three chain suppliers with prices that look right for Israel).

## Execution Mode
- Parallel: no
- Concurrent plans: none
- Isolated DB: no — the plan changes stored values, not shapes, and writes the shared local data on purpose: that is
  the data the Human opens in the morning. A full backup is taken first (A1).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/catalog-enrichment/**
server/test/catalog-enrichment.test.js
server/test/fixtures/catalog-enrichment/**
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

- INV-none: preserves — the scope reaches no invariant's `Touches` globs. In substance: master documents are written
  only by a maintenance script the platform admin's own session runs locally, as `dedupe-master-names.js` does
  (INV-1, INV-2); every written document is checked with `parseV2` first (INV-4); no AI call is made (INV-6).

## Reuse Check

- none — server-side maintenance scripts only; no component, pipe, client service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every product in my catalog to carry a real price so that the food cost of a dish is believable.
- As a chef, I want the allergens of a product to be right so that the allergen list of a dish can be trusted.
- As the platform owner, I want one command that tells me whether the catalog is in a good state.

## Functional Requirements

### Must Have (P0)
- [ ] Every step is idempotent and resumable: all intermediate results live in the work folder, and re-running a step
      continues from what is there.
- [ ] The work folder is outside the repo: `<parent of the main checkout>/foodvibe-catalog-work`, resolved through
      `git rev-parse --path-format=absolute --git-common-dir` so every worktree uses the same folder. Downloads,
      candidates, decisions, the ledger, audits, the backup and the report live there. Nothing from it is committed.
- [ ] Every script that connects takes `--target`; any target other than `local` throws
      `catalog enrichment is local only`. Writing needs `--write`; without it nothing is written.
- [ ] Prices are stored without VAT, per base unit of the product. `VAT_RATE = 0.18` is one named constant.
      Unprocessed fresh fruit and vegetables carry no VAT and are not divided (`vatExempt: true` on the decision).
- [ ] A product is `priced` only with accepted matches in at least 3 different chains. All matched chains are stored
      (3 to 5 sources). The old sources of a `priced` product are replaced. An `unresolved` product is not changed.
- [ ] A chain becomes one master supplier (`businessId: '__master__'`), named by the chain's Hebrew name; an existing
      master supplier with the same normalized name is reused. Only chains that price at least one product get one.
- [ ] Product `_id`s never change, no product is deleted, no recipe or dish is edited.
- [ ] Allergens: only keys that exist as master `allergen` terms; no term is created. A product whose allergens this
      plan sets gets `allergenSource: 'llm'`. Every allergen removed from a product is listed in the report.
- [ ] No Gemini call, no paid service, no new package in any `package.json`.
- [ ] TLS verification is never switched off. A chain that cannot be reached is skipped and another one is tried.

### Should Have (P1)
- [ ] Web fallback for at most 60 `unresolved` products, most used in recipes first: three Israeli online shops with a
      price and a page address each, same price rules, each shop one master supplier. A product without three stays
      `unresolved`.
- [ ] Empty `categories` filled from existing master category keys only.

### Nice to Have (P2)
- [ ] For a product matched to a barcode, allergens and `nutritionPer100g` from Open Food Facts
      (`https://world.openfoodfacts.org/api/v2/product/<barcode>`), `allergenSource: 'off'`, at most 60 requests a minute.

## UI/UX Notes
- none — no screen changes. Supplier names are Hebrew chain names; no `dictionary.json` key is needed.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Back up, then measure the catalog as it is — run
      `node server/scripts/db-backup.js --target=local --out=<work>/backup-<yyyymmdd-hhmm>`; write `inventory.js`
      (read-only): counts of non-deleted master products, products with no positive source price, products with no
      allergens, exact-name duplicate groups, names ending in a space and a number (twins renamed by plan 379), the
      resolving product-ingredient-line count of criterion 7, the base units in use, the master allergen and category
      keys, and per product the number of recipe and dish lines that use it. Output `<work>/inventory.json` and a
      printed summary. — `server/scripts/catalog-enrichment/inventory.js`, `server/scripts/catalog-enrichment/lib/work-dir.js`
- [x] A2: Merge exact-name duplicates with the existing tool — dry run
      `node server/scripts/dedupe-master-names.js --target=local --out=<work>/dedupe-dry.json`; when it lists product
      groups, run it again with `--write`; then re-run `inventory.js`. Zero groups → skip. No `--force-delete`.
- [x] A3: Download and read the chain price files — `fetch-price-files.js` downloads the newest full price file of one
      large store for each of 5 chains (first choice: Shufersal, Rami Levy, Yochananof, Osher Ad, Tiv Taam; any other
      chain publishing under the same rules may replace one that fails), unzips with `node:zlib`, and writes one
      normalized JSON per chain: `{ chain, chainNameHebrew, storeId, fileDate, items[] }` with per item `code`, `name`,
      `manufacturer`, `quantity`, `unit`, `isWeighted`, `price`, `unitPrice`. Element names are read case-insensitively
      and recorded as found. Fewer than 3 chains readable after trying 8 → write the report, write nothing to the
      data, stop. — `server/scripts/catalog-enrichment/fetch-price-files.js`, `server/scripts/catalog-enrichment/lib/price-file.js`
- [x] A4: Pure price and name helpers with tests — `pricePerBaseUnit(item, baseUnit)` (pack size and unit → price per
      gram / ml / kg / liter / unit; `null` when the pack size cannot be read), `withoutVat(price, vatExempt)`,
      `normalizeHebrewName` (niqqud, punctuation, size and brand tokens removed), `scoreMatch(productName, itemName)`,
      `inBand(pricePerKgOrLiterOrUnit)` (per kg or liter: 0.5 to 2000 ILS; per unit: 0.05 to 500 ILS). Tests cover each
      helper with fixture items, including a weighted item, a 6-pack, a 100 g price and an unreadable size. —
      `server/scripts/catalog-enrichment/lib/pricing.js`, `server/scripts/catalog-enrichment/lib/matching.js`,
      `server/test/catalog-enrichment.test.js`, `server/test/fixtures/catalog-enrichment/**`
- [x] A5: Build candidates — `build-candidates.js` writes, per master product, the 5 best-scoring items of each chain
      with their computed price per base unit to `<work>/candidates.json`, products ordered by recipe usage (most used
      first). — `server/scripts/catalog-enrichment/build-candidates.js`
- [x] A6: Pilot on the 50 most used products, then audit — the Worker reads the candidates and writes
      `<work>/decisions.json`: per product and chain the accepted item codes (items that are the same thing a caterer
      would buy for that product) or none, `vatExempt`, the allergen keys with a one-line reason, and a reason when
      fewer than 3 chains match. The price of a chain is the median of its accepted items. Then a fresh-context
      subagent that sees only product name, base unit, accepted item names and prices marks each product `agree` or
      `disagree`; result in `<work>/audit-pilot.json`. Agreement under 90% → fix the helpers or the decision rules and
      repeat, at most 3 rounds; still under 90% → write the report, write nothing to the data, stop.
- [x] A7: Decide the rest — the same judgment for every remaining product in batches of 40, appended to
      `decisions.json`. A product whose chain prices differ by more than 2.5× gets its outlier chain dropped or is
      re-matched; with fewer than 3 chains left it is `unresolved`. Then the P1 web fallback.
- [x] A8: Apply — `apply-enrichment.js` builds the supplier documents and the changed product documents from
      `decisions.json`, checks each with `parseV2`, prints `changes: <n>` and a before/after sample, and with `--write`
      writes them and `<work>/ledger.json` (`priced` / `unresolved` + reason per product id, old and new sources, old
      and new allergens). Run dry, read the output, then run
      `node server/scripts/catalog-enrichment/apply-enrichment.js --target=local --write`, then
      `node server/scripts/bump-master-version.js`, then
      `node server/scripts/reset-user-from-master.js --user=dev-guest --target=local --write` so the dev guest gets
      the corrected catalog on its next sign-in. — `server/scripts/catalog-enrichment/apply-enrichment.js`,
      `server/scripts/catalog-enrichment/lib/build-docs.js`
- [x] A9: Final audit and report — a fresh-context subagent audits 100 random `priced` products the same way as A6
      (`<work>/audit-final.json`); a `disagree` product is re-matched or moved to `unresolved` and A8 is re-run.
      `report.js` writes `<work>/REPORT.md`: totals (products, priced, unresolved by reason, share of recipe
      ingredient lines now priced), chains and file dates used, the 30 biggest price changes, every allergen removed,
      the `unresolved` list ordered by recipe usage, and likely duplicates (products that matched the same item codes,
      and number-suffix twins) for the Human to decide. — `server/scripts/catalog-enrichment/report.js`
- [x] A10: Prove it — write `verify-enrichment.js` with the nine checks of the first success criterion and run every
      `[auto]` check. A failed check is fixed at its cause and the checks are run again; a check is never weakened.
      Copy the report's totals and the verify output into `## Execution Notes`; add one row for the folder to
      `server/breadcrumbs.md`. — `server/scripts/catalog-enrichment/verify-enrichment.js`, `server/breadcrumbs.md`

### Stage B — rescue the unresolved products by renaming them to what the chains sell (Human, 2026-11-12)

The Human read REPORT.md: too many products stayed unresolved. Approved in chat 2026-11-12 (the Human acts as
Planner approval for this session; Planner and Worker are this one session): an unresolved product may be **renamed**
to the concrete item the chains sell, priced from **2 or more chains** (1 chain is not enough), and every recipe and
dish line that uses it shows the new name. Rules:

- Name: a **clean name** — the food and its form, plus the brand only when every accepted item is that brand; never a
  pack size (e.g. "פלפל לבן" → "פלפל לבן טחון", or "פלפל לבן טחון אבי ביטון" when only that brand is accepted). The
  new name must not equal another master product's name.
- Same product `_id` (every recipe and dish keeps pointing to it); `nameHebrew` and `nameHebrewNormalized` change;
  every recipe and dish ingredient line whose `referenceId` is the product or a clone of it gets the new
  `nameSnapshot`. Nothing else in a recipe or dish changes.
- Base unit stays. Prices are per base unit, without VAT, median per chain, ≤ 2.5× apart, inside the A4 band — the
  same rules as Stage A except the chain minimum (2, not 3).
- A product whose sellable form cannot fit its base unit (e.g. base `unit` but sold only by weight, or a pack sold
  as "1 unit" for several pieces), or that only 1 chain sells, is **not changed**: it goes to `MANUAL-FIX.md` with
  everything the Human needs to fix it by hand — the candidate items per chain, pack size, shelf price and the
  computed price per base unit — so no supplier or price search is needed.

- [x] B1: Rescue candidates — `build-candidates.js --only-unresolved --per-chain=8 --out=candidates-rescue.json`
      writes the 8 best items per chain for every unresolved product. — `server/scripts/catalog-enrichment/build-candidates.js`
- [x] B2: Rescue judgment — sheets of 40 (`batch-view.js --source=candidates-rescue.json`) judged by subagents under
      `<work>/RESCUE.md`; answers in `<work>/rescue-answers/`; `merge-rescue.js` → `<work>/rescue-decisions.json`
      (`renamed` / `manual` / `unresolved`). Audit: a fresh-context subagent audits up to 60 random `renamed` products
      (new name, accepted items, prices); agreement ≥ 90% (at most 3 rounds), else nothing from Stage B is written.
      — `server/scripts/catalog-enrichment/merge-rescue.js`, `server/scripts/catalog-enrichment/lib/decide.js`
- [x] B3: Apply — `apply-enrichment.js` also applies `rescue-decisions.json`: renamed products (new name, sources,
      allergens), the `nameSnapshot` of every line that uses them, ledger entries `priced` + `renamed: true` +
      `oldName`. Dry run, then `--write`, `bump-master-version.js`, dev-guest reset. — `apply-enrichment.js`,
      `server/scripts/catalog-enrichment/lib/build-docs.js`
- [x] B4: Report and prove — `REPORT.md` gains a "Renamed" table (old → new name, chains, price) and the audit;
      `report.js` writes `<work>/MANUAL-FIX.md`; `verify-enrichment.js` accepts a `priced` product with 2 chains only
      when it is `renamed`, and adds check 10: every line that uses a renamed product shows its new name; check 8
      adds the rescue audit. All `[auto]` checks re-run. — `report.js`, `verify-enrichment.js`,
      `server/test/catalog-enrichment.test.js`

### Stage C — Dan's action plan for the unresolved products (Human, 2026-11-12, pasted in chat)

Source: `<work>/UNRESOLVED-SECTIONS.md` (11 sections, rows numbered s.n). Every row ends in one recorded state;
anything the action plan marks UNDONE is left unchanged and listed in `<work>/UNDONE.md` for Dan.

- S1 unit does not fit (136): switch the base unit to the row's `Switch to` unit and price per the new unit. So that
  the recipe lines measured in the old unit keep costing, the product gets a purchase option for each old-family unit
  its lines use (e.g. `gram` on a bunch product), with the conversion taken from a pack weight the chain data shows;
  a row whose `Switch to` is `?`, or that needs a conversion no chain data gives (e.g. grams per egg), is UNDONE.
- S2 name taken (35): same product → merge into the existing one (recipe and dish lines repointed, the duplicate
  soft-deleted); clearly different → append a descriptor to the new name; unsure → UNDONE.
- S3 one chain (119): accept the single chain's price; 3.33, 3.49, 3.53, 3.79 UNDONE.
- S4 (3): UNDONE. S5: soft-delete the test entries 5.32, 5.33, 5.34, 5.36, 5.37, 5.39, 5.41; the rest UNDONE.
- S6 (25): price 0 (every source price set to 0). S7 (55): UNDONE.
- S8, S9, S11 (311): no supermarket pricing — listed in `<work>/MANUAL-SUPPLIER.md`; ledger reason "manual supplier pricing".
- S10 (33): re-match with broader search words; an obvious match is linked and priced (1+ chains); else UNDONE.

- [x] C1: `worksheet.js` writes `UNRESOLVED-SECTIONS.md` and `worklist.json` (stable s.n numbering) from
      `rescue-decisions.json`. — `server/scripts/catalog-enrichment/worksheet.js`
- [x] C2: judgment for S1, S2 and S10 by subagents (answers in `<work>/stage-c-answers/`); S3/S5/S6 rules applied by script.
- [x] C3: `apply-worklist.js` (dry run unless `--write`, local only, parseV2 first) applies every action and records it
      in the ledger (`priced` + `singleChain` / `unitSwitched`, `zeroCost`, `merged`, `deleted`, `undone`).
      — `server/scripts/catalog-enrichment/apply-worklist.js`, `server/scripts/catalog-enrichment/lib/worklist.js`
- [x] C4: report, `UNDONE.md`, `MANUAL-SUPPLIER.md`; verify accepts the new states (check 2: 1+ chain for
      `singleChain` / `unitSwitched`; check 11: every unit-switched product's recipe lines still convert to its base
      unit); tests; all `[auto]` checks re-run.

## Technical Considerations
- Dependencies: reads `server/utils/db-target.js`, `server/migrations/tools/_connect.js`, `server/utils/schema-check.js`,
  `server/utils/price-list-import.js` (`normalizeProductName`, `BASE_UNITS`); runs three existing scripts unchanged.
- New files needed: the files named in A1–A10 under `server/scripts/catalog-enrichment/`, one test file, fixtures.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none in the app; scripts refuse any target but local and validate with `parseV2`.
- Security surface: outbound HTTPS to the chains' public price portals (and, for P1/P2, shop pages and Open Food
  Facts). Chain portal user names are public and are constants in `fetch-price-files.js`; no secret is added.
- Data / migration: values of master `products` (`sources`, `allergens`, `allergenSource`, optionally `categories`,
  `nutritionPer100g`, `updatedAt`) and new master `suppliers`, in the local data only; the dev guest's clones are
  rebuilt. Way back: `node server/scripts/db-restore.js --target=local --file=<backup>/<collection>.json`.
- Project checks: `node scripts/log-query.mjs --since=plan-start --level=error` → no entries; `pnpm run test:server`.

## Out of Scope
- The hosted data: nothing is read from it or written to it. Rolling the result out is a later plan with a runbook
  the Human runs himself (D212).
- Merging near-duplicate products (different spelling, number-suffix twins): report only.
- Suppliers' real contact details, delivery days and minimum orders; equipment; venues; recipe content.
- Deleting test businesses or resetting any business other than the dev guest.
- Wholesale price lists; any price refresh after this run.
- Any change to app code, schemas or the cost engine.

## Critical Questions
- Q: Where do prices come from? A: (Human, 2026-11-11) the chains' published price files; web search only for what is missing.
- Q: How is the price stored? A: (Human, 2026-11-11) each chain as its own supplier and source; no synthetic average supplier.
- Q: With or without VAT? A: (Human, 2026-11-11) without VAT.
- Q: Keep the whole catalog or cut it down? A: (Human, 2026-11-11) keep every product and recipe, correct in place.
- Q: May existing test data be cleared? A: (Human, 2026-11-11) yes, all current data is test data; this plan rebuilds only the dev guest.
- Q: May scripts sign in to `url.publishedprices.co.il` with the chains' public user names? A: (Human, 2026-11-11) yes.
- Q: Where does the plan run? A: (Human, 2026-11-11) entirely on the Human's PC, in a local Claude Code session (the local data lives only there).
- Q: What happens to a product no three chains sell? A: default — it stays unchanged, recorded as `unresolved` with a reason, listed in the report.
- Q: May an unresolved product be renamed to what the chains sell, with recipe lines showing the new name? A: (Human, 2026-11-12) yes — clean name, 2+ chains (1 is not enough), base unit kept; a product that cannot fit goes to a hand-fix list with all the data. This session plans and executes it (Human approval in chat).
- Q: What happens to the 761 still unresolved? A: (Human, 2026-11-12) the pasted action plan (Stage C): S1 unit switch, S2 merge/rename, S3 single chain accepted, S5 test entries deleted, S6 price 0, S8/9/11 manual supplier list, S10 re-match; the rest UNDONE for Dan.

## Execution Notes

- 2026-11-11 (cloud session, no code written): the cloud container has no MongoDB and no copy of the catalog, so the
  whole plan runs on the Human's PC. Shufersal download checked end to end (list → signed blob link → gunzip → 8,381
  `<Item>` elements, store 45). The `publishedprices` sign-in was not exercised: auto mode refused it before the Human
  allowed it — on the PC, approve the sign-in when asked, or add a Bash allow rule. If Claude Code on the PC runs in a
  cloud-like sandbox, the hosts needed are `prices.shufersal.co.il`, `pricesprodpublic.blob.core.windows.net`,
  `url.publishedprices.co.il`, `url.retail.publishedprices.co.il`, `world.openfoodfacts.org`.
- 2026-11-11 Planner review (Architect + PM): checks ok (DEPENDS_ON none, ARCH INV-none, REUSE none, OVERLAP none; every named script, helper and flag exists on main at 95f937b6). Human decisions: runs as a Worker in slot wt-3 beside the orchestrator chain (run-546 → orch/batch-2..5), not as an orchestrator run (A6/A9 need a fresh-context subagent); A8 `--write` runs freely, no wait for a go (Human 2026-11-11). Note: every slot and the chain's builders share `foodvibe_local`; A1–A7 only read it.
- 2026-11-12 Worker (wt-1): A1 backup `foodvibe-catalog-work/backup-20261111-2358` (27 collections, 37,827 docs). Inventory: 1,483 master products, 781 without a positive price, 1,466 without allergens, 5 exact-name groups, 47 number-suffix names, 11,365 resolving product lines (baseline), 1,193 products used in recipes/dishes. The local database is `foodvibe` (not `foodvibe_local`).
- decision: behaviour: `db-backup.js` and `dedupe-master-names.js` `require('mongodb')`, which the server's pnpm layout does not expose; they were run with `NODE_PATH` pointing at mongoose's bundled driver, unchanged. The new scripts take the driver from `require('mongoose').mongo` (no new package). — reverse: none needed; a direct `mongodb` dependency in `server/package.json` would fix the old scripts (out of scope).
- decision: behaviour: A2 `dedupe-master-names.js --write` also renamed 3 master recipes/dishes ("רוטב לסלט איטריות" → " 2", " 3", "(מנה)") and their clones — the tool renames every namespace; only names changed, no ingredient line. — reverse: `db-restore.js` the `recipes`/`dishes` files of the backup.
- decision: behaviour: A3 chains are Shufersal (store 413, 15,864 items), Carrefour (009, 12,544), Hazi Hinam (103, 9,992), King Store (001, 7,176), Maayan 2000 (003, 4,370), files of 2026-11-11. The `url.publishedprices.co.il` sign-in (Rami Levy, Yochananof, Osher Ad, Tiv Taam) was refused by the session's permission check, so chains publishing without a sign-in replaced them, as A3 allows. — reverse: add the publishedprices chains to `CHAINS` in `fetch-price-files.js` once the sign-in is allowed.
- decision: behaviour: mass and volume are treated as one dimension (1 ml ≈ 1 g) when a product's base unit and a chain item's unit differ (e.g. oil with base gram sold in ml). — reverse: `sameDim` in `lib/pricing.js`.
- decision: behaviour: the A6/A7 judgment is done by subagents reading the sheets (`batch-view.js`) under written rules (`<work>/JUDGING.md`); their answers (`<work>/answers/*.json`) are merged by `merge-decisions.js` (median per chain, VAT, band, 2.5× outlier drop). — reverse: re-judge any sheet and re-run the merge.
- A6 pilot: judged 3 times, audited 3 times (fresh-context subagents). Audit 1: 20/25 (80%) — mixed forms and small specialty packs → rules 7–9 added. Audit 2: 17/22 (77.3%) — all 5 disagreements were fresh produce "still with VAT": the audit sheet had not told the auditor that unprocessed produce is VAT-exempt (the plan's rule); the sheet now marks those products, decisions unchanged. Audit 3: 22/22 (100%). Earlier rounds kept in `<work>/audit-rounds/`.
- A7: 1,433 remaining products judged on 36 sheets of 40 by 12 subagents under the same rules; merge: 557 priced, 926 unresolved.
- decision: behaviour: the P1 web fallback (online shops for up to 60 unresolved) and the P2 Open Food Facts step were not run; every unresolved product stays unchanged. — reverse: a follow-up plan runs them on `ledger.json`'s unresolved list.
- A8: dry run `changes: 561` → `--write` (4 suppliers created: chain-carrefour, chain-hazi-hinam, chain-king-store, chain-maayan-2000; Shufersal reused n0nHm5wh; 557 products) → `bump-master-version.js` → `reset-user-from-master.js --user=dev-guest --write` (3,864 clone docs deleted, rebuilt on next sign-in).
- A9: final audit 99/100 agree (99%); the one disagree (oGxJloKF "סבון רצפה": hand soap items) moved to unresolved and restored to its backup copy by `apply-enrichment.js` (new restore path: an unresolved product this plan priced earlier goes back to the A1 backup). Final: 556 priced, 927 unresolved, 3 allergens removed (incl. the non-term `mustard` on חרדל), 38,746 of 79,529 recipe/dish product lines (48.7%, clones included) now on a priced product.
- decision: behaviour: the ledger's "old" sources and allergens come from the A1 backup, so a re-run still reports the values from before the plan. — reverse: `apply-enrichment.js` ledger block.
- A10 verify: `node server/scripts/catalog-enrichment/verify-enrichment.js --target=local` → `master products: 1483; priced: 556; unresolved: 927; resolving lines: 11365` / `CATALOG_ENRICHMENT: PASS (9 checks)`, exit 0. Re-run `apply-enrichment.js --target=local` → `changes: 0`. `--target=atlas` → `catalog enrichment is local only`, exit 1. `pnpm run test:server` → 87 files, 1,144 tests passed. `pnpm --dir server run lint` → 0 errors. `log-query --since=plan-start --level=error` → no entries.
- Stage B (Human 2026-11-12): B1 rescue candidates for the 927 unresolved (8 per chain, items whose size does not fit kept for the hand-fix list). B2: 24 sheets judged by 12 subagents under `<work>/RESCUE.md` → 169 rename / 290 manual / 468 unresolved; rescue audit (fresh subagent, 60 random renamed) 59/60 = 98.3%; the one disagree (prv8J6dj lamb fat, implausible price) moved to manual.
- decision: behaviour: two renamed products (80yV6TIR, cudfGV7H) had chain prices more than 2.5× apart — `dropOutliers` only works down to 3 chains — and were written once; `decideRescue` now checks the spread for 2 chains, they moved to the hand-fix list, the products were restored from the A1 backup and their business copies and recipe lines got the original name back (`--revert-names`, then `renamedEver` in the ledger). — reverse: none needed.
- decision: behaviour: a business copy is renamed with its master only when `_userModified` is not true; user-edited copies keep their name. — reverse: `renameWork` in `apply-enrichment.js`.
- B3/B4 result: 722 priced (556 in 3+ chains, 166 renamed from 2+ chains), 761 unresolved (293 of them in `<work>/MANUAL-FIX.md` with items, packs and prices), 8,137 recipe/dish lines and 818 business copies renamed. `verify-enrichment.js --target=local` → `CATALOG_ENRICHMENT: PASS (10 checks)`; apply re-run → `changes: 0`; `--target=atlas` → `catalog enrichment is local only`; `pnpm run test:server` → 87 files, 1,150 tests passed; server lint 0 errors.
- seen: `log-query --since=plan-start --level=error` shows 4 client entries at 2026-11-12T05:58Z (dev-guest: products/dashboard failed to load, status 0) — the browser hit the backend during `slot-serve.mjs --restart`; no server error. — not a plan defect.
- seen: "גמבה אדומה" (uCGgqSRP) stayed unresolved because the candidate search found no red bell pepper although the chains sell it (named "פלפל אדום") — matching gap; a synonym list in `lib/matching.js` would fix such cases.
- Stage C (Dan's pasted action plan, 2026-11-12): C2 judgment by 3 subagents under `<work>/STAGE-C.md` (S1: 63 switch / 73 undone — no weight per unit guessed; S2: 22 merge / 1 rename / 12 undone; S10: 12 link / 21 undone); 2.12 rename set to undone (its items were sweet paprika). Stage C audit (fresh subagent, 40 of 97 switch/merge/re-match): 37/40 = 92.5%; the 3 disagrees (diet hot-dog buns price; oregano-leaves and thyme merges) set to undone.
- decision: behaviour: a unit switch adds purchase options for the recipe-line units of the other family (e.g. `gram` = 1/70 bunch) so existing lines keep costing; a legacy option that only restated the old base unit ("unit = 1" with an old price override) is replaced — reverse: restore the product from the A1 backup.
- decision: behaviour: a merge whose duplicate is used in a business that has no copy of the kept product is left undone (one such merge had already moved its master-level lines before this rule; those lines now use the kept product). — reverse: `db-restore.js` the recipes/dishes files.
- decision: behaviour: "price 0" sets every existing source price to 0; the cost engine ignores non-positive prices, so these lines cost nothing as before. — reverse: backup.
- C3/C4 result: 112 single-chain, 12 re-matched, 62 unit-switched, 19 merged, 7 test entries soft-deleted, 25 at price 0, 311 to manual supplier pricing, 213 UNDONE (`<work>/UNDONE.md`). Live master products 1,457: 908 priced, 25 price 0, 524 unresolved. `verify-enrichment.js --target=local` → `CATALOG_ENRICHMENT: PASS (11 checks)`; both applies re-run → `changes: 0`; `apply-worklist.js --target=atlas` → `catalog enrichment is local only`; `pnpm run test:server` → 87 files, 1,153 tests passed; lint 0 errors; `log-query --since=2026-11-12T08:00:00Z --level=error` → no entries.
- Stage C follow-up (Dan in chat 2026-11-12): 61 weights per piece/bunch/pack and 6 pack counts for section 1 (`<work>/dan-input.json`), 1.70/1.75 to manual supplier pricing, 6 rows to hand fix, substitutes for 1.79 (regular hot-dog buns), 1.30, 1.81, 1.62, 1.115 (`stage-c-answers/stage-c-1-dan.json`). `danSwitch` prices each accepted item from its pack in the chain data (count read from the name when a pack is listed as "1 unit", e.g. "18יח"); stage C now drops an outlier chain when 3+ chains disagree (as stage A). Result: 65 more products written; section 1 left undone: 1.31 (baby sweet potato: the two chains disagree 10×) and the 6 hand-fix rows. Live master products 1,456: 973 priced, 25 price 0, 458 unresolved. `verify` → `CATALOG_ENRICHMENT: PASS (11 checks)`; re-runs → `changes: 0`.
- Dan 2026-11-12 (chat): section 7 approved — 27 prices derived from the raw product's cheapest price ÷ yield (zest charged with the whole fruit; the source keeps the raw product's supplier), 10 by-products at price 0, 7.24→7.29 and 7.36→7.5 merged, 7.7/7.9 left, 14 sub-recipes undone. "Keep every chain and list the far ones": a chain far from the others (> 2.5×) is now kept as its own supplier in stages A, B and C and listed in REPORT.md "Far-off chains"; verify skips the spread rule for those products (the band still holds). 1.31 keeps both chains. Lime and biscotti (two chains far apart) moved from the hand-fix list to renamed. Result: 1,454 live master products — 1,003 priced, 35 price 0, 416 unresolved; `CATALOG_ENRICHMENT: PASS (11 checks)`; re-runs `changes: 0`; `pnpm run test:server` 87 files / 1,153 tests passed.
- seen: `log-query --since=2026-11-12T09:00:00Z --level=error` shows 4 `http.request.failed` and 1 `ai.generate.validation_failed` at 09:05–09:07Z — app traffic in the shared log (an AI recipe generation), not from these scripts, which write no log entries.
- Dan 2026-11-12 (chat): section 5 — suggestions approved plus his 12 names (`dan-input.json` `section5`). Priced from chains: 5.1 → "פילה לברק" (fresh fillet, Shufersal/Carrefour), 5.14 → "דניס שלם", 5.8 → "תבלין קייג'ון"; 5.5/5.7/5.28 merged into 5.1; 5.6, 5.10, 5.12, 5.15, 5.16, 5.27 merged into the existing products; 10 renamed to Dan's names with manual supplier pricing (no chain sells them: 5.3, 5.11, 5.18–5.21, 5.23–5.26); 5.2, 5.4, 5.9, 5.13 manual supplier pricing; 5.17, 5.22, 5.29–5.31 sub-recipes (undone); 6 unused deleted. Result: 1,439 live master products — 1,006 priced, 35 price 0, 398 unresolved; `CATALOG_ENRICHMENT: PASS (11 checks)`; re-runs `changes: 0`.
- Dan 2026-11-12 (chat): real prices exposed legacy recipe lines whose amount is in grams but whose unit says kg / liter / unit (e.g. 1700 kg beef neck → 111,508 ₪). The A1 backup diff shows the plan changed no line unit or amount. `fix-line-units.js` (dry run, parseV2 guard, EJSON backup, `--restore`) changed only the unit on 61 of the 66 lines in `<work>/SUSPECT-LINES.md` (Dan's list in `<work>/line-unit-fixes.json`; 47 mayonnaise as gram; 23/27/30/32 genuine counts and 38 mini kubbeh kept), on the master line and the same line of each business copy: 406 documents (58 master), backup `<work>/line-fix-backup-2026-11-12T12-02-57-292Z.json` (406 docs). Re-run → `apply 0 · already fixed 61`. No product changed. Product conversion gaps and the 33 remaining > 5× cost jumps: proposals only, `<work>/LINE-FIX-FOLLOWUP.txt`.
- Dan 2026-11-12 (chat, step 3/4): product fixes in `<work>/dan-input.json` `productFixes`, applied by `apply-worklist.js` (new `applyProductFix`, idempotent; a stage C switch now also replaces the options it wrote on an earlier run): egg 55 g, shrimp 25/30 30 g per piece, black tiger shrimp and dried figs to base gram (their price was per gram; figs 20 g each), yolk priced as one egg (17.5 g), tataki beef without a price, mayonnaise 0.95 g per ml, arugula 100 g per pack (Shufersal "רוקט 100 גרם"), iceberg lettuce a new `leaf` unit of 30 g. 9 products written (backup `<work>/product-fix-backup-2026-11-12.json`). Line fixes, second batch: 8 spice lines kg→gram, 9 lettuce/arugula/pomegranate count lines → gram, the 2 Caesar salads → 30 `leaf`: 133 documents (backup `<work>/line-fix-backup-2026-11-12T12-27-42-585Z.json`). Re-runs: both applies `changes: 0`; `verify` PASS (11 checks); 32 plan tests pass. Lines over 5× their pre-plan cost: 42 → 13 (real beef prices, star anise per pack, lemongrass per stalk, passion fruit by count — Dan: fine).
- Dan 2026-11-12 `approved: public/assets/data/dictionary.json`: added `units.leaf` = "עלה" (append-only) so the new iceberg `leaf` unit shows in Hebrew; `translation.service.ts` merges `units` into the master dictionary, so `translatePipe` and the Hebrew-input lookup both pick it up.
- Dan 2026-11-12 "fix the 31 spice kg lines too": the remaining 33 black/white pepper lines of 0.02–0.5 kg → gram (my count of 31 was off by 2), 297 documents, backup `<work>/line-fix-backup-2026-11-12T12-59-54-079Z.json`. Re-run → `apply 0 · already fixed 114`; `verify` PASS.
- review: checkers kept 0 dropped 8 rechecked 8 minutes 20 models check-plan=claude-sonnet-5-5,check-bugs=claude-sonnet-5-5,check-rules=claude-sonnet-5-5,verify=claude-sonnet-5-5 (8 findings fixed before the recheck: apply-*.js force-added past .gitignore, criterion 3 records the far-chains decision, breadcrumbs row completed, decideRescue far list, SIZE regex word boundary, fetch header comment)
