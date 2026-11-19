# Plan 649 — A product's supplier always resolves to a supplier of its own business: no ids on screen, no failed save

Status: draft
Depends-on: 648
Snapshot: eb41b6c4

## Problem Statement
Dandan, 2026-11-19, as a regular user (business «העסק של danwe», `65bc756b…`): a product shows its supplier as a string
of letters and numbers, and changing its price then fails to save. He adds that many real users see some suppliers as
ids instead of names. Traced in the local database (`foodvibe`) and the code:

1. **A business supplier id leaked through the master catalog.** Master product `fcb4a34e-6df6-47b7-afb2-0406f7ad678d`
   (`businessId: '__master__'`, self `_masterId`, written 2026-11-19) has a source with `supplierId
   66d97714-98d7-44d4-80ef-95ed33e2bc9d` — the «ווילד בייקרי» supplier **of the guest admin's business**
   (`f0b4ea17…`), not a master supplier (the master's «ווילד בייקרי» is `iL8iGNRh`). Master sync then copied it to
   other businesses (`65bc756b…` product `0834c36e…`, `demo_business`) with the raw id. A shared write puts the doc in
   master as it is (`server/routes/generic.js:611`, `doc.businessId = MASTER_BUSINESS_ID`), and the push path
   (`generic.js` ~854–952) does not map a source's supplier to its master supplier.
2. **Sync keeps an unknown supplier id as it is.** `server/services/sync-master.js:318` and `:341`:
   `supplierId: supMap.get(s.supplierId) ?? s.supplierId` — a master source whose supplier the business has no copy of
   keeps the master (or foreign) id.
3. **Master holds sources of suppliers that exist nowhere.** Ids `KGKvE`, `yQZJY`, `DsKbY`, `0NH3p` (deleted
   suppliers) sit on master products (`ELHhNQxT`, `306c4ba7…`) and on every business's synced copy (2–3 per business).
4. **Some sources have an empty supplier** (`supplierId: ''`): 150 in «qa-bot», 58 in «danwe».
5. **The screen shows the raw id and the save fails** for a source whose supplier is not in the business's list (the
   product form / list renders the id; the save is refused — the exact check to be found by the builder and named in
   the run notes).

The same is very likely on the live database (Dandan: "a lot of my users see some suppliers as their id").

## Goals & Success Criteria
**Primary:** every source of every product points at a supplier of the same business (or has no supplier); master
writes and sync can no longer create a foreign or unknown reference; existing bad references are repaired by a script
with a dry run; the screen never shows an id and an unresolved source never blocks a save.

- [auto] `pnpm run test:server` passes, including new cases in `server/test/sync-master.test.js`: a master source
  whose supplier has a business copy maps to it; one whose supplier has none → the business gets a copy of that master
  supplier (as sync does for suppliers) and the source maps to it; one whose supplier exists nowhere → the source keeps
  its price with `supplierId: ''` and is logged as `sync.supplier_unknown` (counts only).
- [auto] The same command, `server/test/push-to-master.test.js`: a
  product pushed or written to master with a business supplier source stores the master supplier id (the business
  supplier's `_masterId`, or the supplier pushed to master first when it has none); a foreign or unknown supplier id is
  refused with 400 `BAD_SUPPLIER_REF` and nothing is written.
- [auto] The same command, `server/test/repair-supplier-refs.test.js`: the new script
  `server/scripts/repair-supplier-refs.js` in dry run lists, per business, the sources with a foreign, unknown or empty
  supplier and the fix for each (map by `_masterId`, map by same trimmed name in that business, or clear); `--write`
  applies exactly that; `--target` other than `local` needs `--confirm-remote`; it never touches prices.
- [auto] `pnpm run test:ci` passes: the product form and list show `supplier_unknown` («ספק לא ידוע») for a source whose
  supplier is not in the business's list, never the id; saving a product with such a source succeeds (the source keeps
  its price, its supplier cleared or kept as the server decides) — spec cases on the product form.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan runs `node server/scripts/repair-supplier-refs.js --target=local` (dry run), reads the list, runs it
  with `--write`; as the regular user the product that showed an id now shows «ווילד בייקרי», and changing its price
  saves. Then he runs the dry run against the live database (read-only) and decides on `--write --confirm-remote`.

## Execution Mode
- Parallel: no — after 648 in the same run; both edit `server/services/sync-master.js`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/sync-master.js
server/test/sync-master.test.js
server/routes/generic.js
server/test/push-to-master.test.js
server/scripts/repair-supplier-refs.js
server/test/repair-supplier-refs.test.js
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/core/services/master-push.service.ts
src/app/core/services/master-push.service.spec.ts
public/assets/data/dictionary.json
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — a product's supplier reference is made to belong to the same business; this plan removes a
  reference to another business's supplier, it adds none.
- INV-2: preserves — master holds only master references; each business's copy maps them to its own copies; a
  business's own edits are untouched (the repair changes only references that resolve nowhere in that business).
- INV-3: preserves — the repair and the mapping run on the server, one request or one script run per business.
- INV-4: preserves — no schema change; the server's write check gains one 400 for a foreign reference.

## Reuse Check

- the reference mapping — family: helpers — rung: 3 — why: extend the existing `supplierIdMap` in `sync-master.js`
  (master id → business id) and use the same map in push and repair.
- the repair script — family: none — rung: 4 — why: a one-off data repair beside `dedupe-business-products.js`, with
  the same dry-run and `--confirm-remote` rules.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want every supplier on my products to show its name, so that I know who sells it.
- As an owner, I want to change a product's price without the save failing.
- As the platform admin, I want a product I share to carry the shared suppliers, never my own business's.

## Functional Requirements

### Must Have (P0)
- [ ] Master writes (shared create, push-to-master): map each source's supplier to its master supplier; a business
  supplier with no master copy is pushed to master first (as plan 322 M9 pushes linked docs); a foreign or unknown id →
  400 `BAD_SUPPLIER_REF`.
- [ ] Sync: a master source maps to the business's copy of its supplier; no copy → create it from the master supplier;
  no master supplier → keep the price, clear `supplierId`, log counts.
- [ ] Repair script with dry run, `--write`, `--business`, `--target`, `--confirm-remote`; prints per business counts
  and each change.
- [ ] Screen: an unresolved supplier shows «ספק לא ידוע» (`supplier_unknown`, append-only); a save with such a
  source succeeds.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make a shared product carry only shared suppliers — the mapping in shared writes and push, the 400, the cases — server/routes/generic.js, server/test/push-to-master.test.js
- [ ] A2: Make sync map every supplier reference to the business's own copy — create the missing copy, clear the unknown, the cases — server/services/sync-master.js, server/test/sync-master.test.js
- [ ] A3: Repair the references that are already wrong — the script, its dry run on local, its cases — server/scripts/repair-supplier-refs.js, server/test/repair-supplier-refs.test.js
- [ ] A4: Never show an id or fail a save for an unknown supplier — the label, the save, the specs — src/app/pages/inventory/components/product-form/**, src/app/pages/inventory/components/inventory-product-list/**, public/assets/data/dictionary.json
- [ ] A5: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Production: the live database very likely has the same references. This plan ships the script; running it on the
  live database (dry run first) is the Human's step, never the builder's.
- The guest admin is the platform admin: his business's writes are the likeliest source of foreign ids in master.

## Out of Scope
- Running the repair on the live database.
- Merging duplicate suppliers inside one business.

## Critical Questions
- none

## Execution Notes
- decided: an unknown supplier keeps the source's price and loses the supplier, rather than deleting the source — why:
  the price is the owner's data; the supplier can be picked again.
