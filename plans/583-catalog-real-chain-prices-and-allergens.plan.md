# Plan 583 — Give every shared product real shelf prices from three or more chains and corrected allergens, checked by a script

Status: draft
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
     is inside the plausibility band of A4;
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

- [ ] A1: Back up, then measure the catalog as it is — run
      `node server/scripts/db-backup.js --target=local --out=<work>/backup-<yyyymmdd-hhmm>`; write `inventory.js`
      (read-only): counts of non-deleted master products, products with no positive source price, products with no
      allergens, exact-name duplicate groups, names ending in a space and a number (twins renamed by plan 379), the
      resolving product-ingredient-line count of criterion 7, the base units in use, the master allergen and category
      keys, and per product the number of recipe and dish lines that use it. Output `<work>/inventory.json` and a
      printed summary. — `server/scripts/catalog-enrichment/inventory.js`, `server/scripts/catalog-enrichment/lib/work-dir.js`
- [ ] A2: Merge exact-name duplicates with the existing tool — dry run
      `node server/scripts/dedupe-master-names.js --target=local --out=<work>/dedupe-dry.json`; when it lists product
      groups, run it again with `--write`; then re-run `inventory.js`. Zero groups → skip. No `--force-delete`.
- [ ] A3: Download and read the chain price files — `fetch-price-files.js` downloads the newest full price file of one
      large store for each of 5 chains (first choice: Shufersal, Rami Levy, Yochananof, Osher Ad, Tiv Taam; any other
      chain publishing under the same rules may replace one that fails), unzips with `node:zlib`, and writes one
      normalized JSON per chain: `{ chain, chainNameHebrew, storeId, fileDate, items[] }` with per item `code`, `name`,
      `manufacturer`, `quantity`, `unit`, `isWeighted`, `price`, `unitPrice`. Element names are read case-insensitively
      and recorded as found. Fewer than 3 chains readable after trying 8 → write the report, write nothing to the
      data, stop. — `server/scripts/catalog-enrichment/fetch-price-files.js`, `server/scripts/catalog-enrichment/lib/price-file.js`
- [ ] A4: Pure price and name helpers with tests — `pricePerBaseUnit(item, baseUnit)` (pack size and unit → price per
      gram / ml / kg / liter / unit; `null` when the pack size cannot be read), `withoutVat(price, vatExempt)`,
      `normalizeHebrewName` (niqqud, punctuation, size and brand tokens removed), `scoreMatch(productName, itemName)`,
      `inBand(pricePerKgOrLiterOrUnit)` (per kg or liter: 0.5 to 2000 ILS; per unit: 0.05 to 500 ILS). Tests cover each
      helper with fixture items, including a weighted item, a 6-pack, a 100 g price and an unreadable size. —
      `server/scripts/catalog-enrichment/lib/pricing.js`, `server/scripts/catalog-enrichment/lib/matching.js`,
      `server/test/catalog-enrichment.test.js`, `server/test/fixtures/catalog-enrichment/**`
- [ ] A5: Build candidates — `build-candidates.js` writes, per master product, the 5 best-scoring items of each chain
      with their computed price per base unit to `<work>/candidates.json`, products ordered by recipe usage (most used
      first). — `server/scripts/catalog-enrichment/build-candidates.js`
- [ ] A6: Pilot on the 50 most used products, then audit — the Worker reads the candidates and writes
      `<work>/decisions.json`: per product and chain the accepted item codes (items that are the same thing a caterer
      would buy for that product) or none, `vatExempt`, the allergen keys with a one-line reason, and a reason when
      fewer than 3 chains match. The price of a chain is the median of its accepted items. Then a fresh-context
      subagent that sees only product name, base unit, accepted item names and prices marks each product `agree` or
      `disagree`; result in `<work>/audit-pilot.json`. Agreement under 90% → fix the helpers or the decision rules and
      repeat, at most 3 rounds; still under 90% → write the report, write nothing to the data, stop.
- [ ] A7: Decide the rest — the same judgment for every remaining product in batches of 40, appended to
      `decisions.json`. A product whose chain prices differ by more than 2.5× gets its outlier chain dropped or is
      re-matched; with fewer than 3 chains left it is `unresolved`. Then the P1 web fallback.
- [ ] A8: Apply — `apply-enrichment.js` builds the supplier documents and the changed product documents from
      `decisions.json`, checks each with `parseV2`, prints `changes: <n>` and a before/after sample, and with `--write`
      writes them and `<work>/ledger.json` (`priced` / `unresolved` + reason per product id, old and new sources, old
      and new allergens). Run dry, read the output, then run
      `node server/scripts/catalog-enrichment/apply-enrichment.js --target=local --write`, then
      `node server/scripts/bump-master-version.js`, then
      `node server/scripts/reset-user-from-master.js --user=dev-guest --target=local --write` so the dev guest gets
      the corrected catalog on its next sign-in. — `server/scripts/catalog-enrichment/apply-enrichment.js`,
      `server/scripts/catalog-enrichment/lib/build-docs.js`
- [ ] A9: Final audit and report — a fresh-context subagent audits 100 random `priced` products the same way as A6
      (`<work>/audit-final.json`); a `disagree` product is re-matched or moved to `unresolved` and A8 is re-run.
      `report.js` writes `<work>/REPORT.md`: totals (products, priced, unresolved by reason, share of recipe
      ingredient lines now priced), chains and file dates used, the 30 biggest price changes, every allergen removed,
      the `unresolved` list ordered by recipe usage, and likely duplicates (products that matched the same item codes,
      and number-suffix twins) for the Human to decide. — `server/scripts/catalog-enrichment/report.js`
- [ ] A10: Prove it — write `verify-enrichment.js` with the nine checks of the first success criterion and run every
      `[auto]` check. A failed check is fixed at its cause and the checks are run again; a check is never weakened.
      Copy the report's totals and the verify output into `## Execution Notes`; add one row for the folder to
      `server/breadcrumbs.md`. — `server/scripts/catalog-enrichment/verify-enrichment.js`, `server/breadcrumbs.md`

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

## Execution Notes

- 2026-11-11 (cloud session, no code written): the cloud container has no MongoDB and no copy of the catalog, so the
  whole plan runs on the Human's PC. Shufersal download checked end to end (list → signed blob link → gunzip → 8,381
  `<Item>` elements, store 45). The `publishedprices` sign-in was not exercised: auto mode refused it before the Human
  allowed it — on the PC, approve the sign-in when asked, or add a Bash allow rule. If Claude Code on the PC runs in a
  cloud-like sandbox, the hosts needed are `prices.shufersal.co.il`, `pricesprodpublic.blob.core.windows.net`,
  `url.publishedprices.co.il`, `url.retail.publishedprices.co.il`, `world.openfoodfacts.org`.
