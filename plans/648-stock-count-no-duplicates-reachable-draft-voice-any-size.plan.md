# Plan 648 — Stock count: no duplicate products, a reachable "save draft", and voice counting for any number of products

Status: draft
Depends-on: 636, 637, 645
Snapshot: eb41b6c4

## Problem Statement
Dandan checked the stock count on 2026-11-19 (staging, after plan 645) and found three faults. Verified in code and in
the local database (`foodvibe`, business `f0b4ea17-1ddd-443a-9cdf-5e2b07f07dca`):

1. **Every product shows twice.** The sheet is right (`stock-count.component.html:123`, `track row.product._id`); the
   business really owns two copies of each product: 2,879 products, 1,439 names twice, each pair with the same
   `_masterId` and identical fields (e.g. «פטרוזיליה» `d9728522…` and `42273650…`, both `_masterId 76uv6SoJ`).
   Likely cause: `server/services/sync-master.js` reads which master copies exist (~line 211) and inserts the missing
   ones (~line 373) with no lock, and `products` has no unique index on `{ businessId, _masterId }`, so two syncs at
   once (the login sync and the background sync in `server/routes/auth.js` ~377–387) both insert everything. Every
   list in the app (inventory, recipes' product pickers, import matching) shows the doubles.
2. **"שמירת טיוטה" cannot be clicked.** Its disabled rule works; but the date field, "save draft" and "finish count"
   sit in the same grid cell: `src/app/shared/page-header/page-header.component.scss:189–191` (phone `:215–217`) puts
   every action child in `1 / 6`, so "finish count" covers "save draft" (`elementFromPoint` on save returns finish).
   Risk: a tap meant for save closes the count.
3. **Voice or text counting refuses any real business.** `server/routes/ai/stock.js:39–45` loads up to 801 products and
   answers 413 `TOO_MANY_PRODUCTS` (cap `STOCK_EXTRACT_MAX_PRODUCTS = 800`,
   `shared/schemas/ai-stock-extract.schema.ts:4`; message `stk_ai_too_many_products`,
   `stock-ai-draft.component.ts:113`). The master catalog alone has 1,486 products, so every business is refused.

## Goals & Success Criteria
**Primary:** a business has one copy of each master product (and cannot get two), "save draft" is its own tappable
button, and voice/text counting works with 3,000 products.

- [auto] `pnpm run test:server` passes, including `server/test/sync-master.test.js` new case:
  `Promise.all([sync(b), sync(b)])` leaves exactly one product per `_masterId`; and the unique partial index
  `{ businessId: 1, _masterId: 1 }` (only where `_masterId` is a string) exists after startup (`server/db.js`).
- [auto] The same command, `server/test/ai-stock-extract.test.js`: the "801 → 413" case is replaced by one with 3,000
  products: posting "קמח 4 קילו" answers 200 with one line for the קמח product; the request sent to the model has no
  product list (only the spoken text and the units); a spoken name matching two products comes back unmatched with
  both as candidates; an empty or unknown name comes back unmatched.
- [auto] `pnpm run test:ci` passes, including `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: the three
  header controls sit in one `.stock-count__actions` wrapper; and
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts` no longer expects `stk_ai_too_many_products`.
- [auto] The same command, `server/test/dedupe-business-products.test.js` (new): on a seeded business with two copies
  of each of three master products, the script's dry run reports three pairs and the copy it keeps (the one referenced
  by recipes, counts or price history; else the older) and writes nothing; `--write` repoints those references to the
  kept copy and deletes the other; `--target` other than `local` without `--confirm-remote` exits 1. The builder never
  runs the script against a real database (the Human runs it, see the card).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/count`, the element at the centre of "שמירת טיוטה" is that button (`e2e/ui/648-1.spec.ts`).
- [human] Dandan runs the dedupe with `--write` on the local database, reloads: each product shows once in the count
  and the inventory; he counts two products, taps "שמירת טיוטה" and sees "הטיוטה נשמרה"; he says "שלושה ארגזים עגבניות
  ושני קילו בצל" and gets the two rows.

## Execution Mode
- Parallel: no — it edits `server/services/sync-master.js`, `server/db.js`, the stock screens and
  `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/sync-master.js
server/test/sync-master.test.js
server/db.js
server/scripts/dedupe-business-products.js
server/test/dedupe-business-products.test.js
server/routes/ai/stock.js
server/utils/stock-extract.js
server/test/ai-stock-extract.test.js
server/test/stock-extract-util.test.js
shared/schemas/ai-stock-extract.schema.ts
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
public/assets/data/dictionary.json
e2e/ui/648-1.spec.ts
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

- INV-2: preserves — a business still gets its own full copy of the master catalog; the unique index and the
  idempotent insert only stop a second copy; a business's own edits and deletions are untouched.
- INV-4: preserves — the extract request and answer keep their Zod schemas; only the product list leaves the request.
- INV-6: preserves — the model is still called only through the server.

## Reuse Check

- matching spoken names to products — family: helpers — rung: 3 — why: extend the stock extract util with a
  normalized-name match (`normalizeProductName`) on the server instead of sending the list to the model.
- the actions wrapper — family: engine-classes — rung: 1 — why: page-local flex with a gap.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want each product once, so that I count and price it once.
- As an owner, I want to save a half-done count without closing it by mistake.
- As an owner, I want to say what is on the shelf and get the rows, whatever the size of my catalog.

## Functional Requirements

### Must Have (P0)
- [ ] Sync: insert missing master copies with an upsert keyed by `{ businessId, _masterId }` (no read-then-insert
  race); the unique partial index created at startup; a duplicate-key error on insert is ignored as "already there".
- [ ] Dedupe script: dry run lists pairs and the kept copy; `--write` repoints references (recipes, stock counts, price
  history, invoice lines) to the kept copy before deleting the other; it refuses `--target` other than `local` unless
  `--confirm-remote` is given.
- [ ] Voice/text: the model gets the spoken text and the unit list only and returns `{ spoken, quantity, unit }`
  lines; the server matches each spoken name to the business's products (normalized exact, then contains, then token
  overlap); more than one match → unmatched with up to 5 candidates; the 800 cap, the 413 path and the key's use go.
- [ ] Sheet: date, "save draft" and "finish count" in one `.stock-count__actions` flex wrapper with a gap; logical CSS.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the three controls wrap on a phone, "finish count" last.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Stop a business from getting a second copy of a master product — the upsert, the unique index, the race case — server/services/sync-master.js, server/db.js, server/test/sync-master.test.js
- [ ] A2: Clean the copies a business already has — the dedupe script's references and its safety, its dry run on local — server/scripts/dedupe-business-products.js
- [ ] A3: Count by voice or text with any number of products — the model asked for spoken lines only, the server match, the cases — server/routes/ai/stock.js, server/utils/stock-extract.js, shared/schemas/ai-stock-extract.schema.ts, server/test/ai-stock-extract.test.js, src/app/pages/inventory/components/stock-count/**
- [ ] A4: Make "save draft" its own button — the wrapper, the spec, the screen check — src/app/pages/inventory/components/stock-count/**, e2e/ui/648-1.spec.ts
- [ ] A5: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Production: the same race may have doubled products on Atlas. The Human checks it (a read-only count per business of
  `_masterId` groups with more than one product) before running the dedupe there; this plan touches local only.

## Out of Scope
- Running the dedupe on Atlas.

## Critical Questions
- none

## Execution Notes
- decided: match names on the server, not by sending the catalog to the model — why: a catalog of 1,500–3,000 names is
  too big and costly per call, and the server already has the business's products.
