# Plan 650 — Voice or text count fills the existing product rows: the best match, a choice when several fit, never a silent new item

Status: done
Depends-on: 648
Snapshot: 9169f36e

## Problem Statement
Dandan checked plan 648 on 2026-11-19 (staging `9169f36e`): saying «שלושה ארגזים עגבניות ושני קילו בצל» added **two
new items** to the count instead of filling the existing tomato and onion rows; «5 אבוקדו» worked. Plan 648 matches
the spoken name to the business's products by normalized exact name, then contains, then token overlap, and returns a
name with more than one match as unmatched (`server/utils/stock-extract.js`, `server/routes/ai/stock.js`). «עגבניות»
is the plural of «עגבניה» (no exact or contains match), and «בצל» fits several products («בצל צהוב», «בצל סגול»), so
both came back unmatched — and the sheet turns an unmatched line into a new row.

Dandan's rule: find the best fitting product; when several fit, let the user choose per line; the count lands on the
product rows of the list.

## Goals & Success Criteria
**Primary:** each spoken line fills an existing product row — the single best match automatically, or the user's pick
among the candidates — and nothing is added as a new item unless the user asks for it.

- [auto] `pnpm run test:server` passes, including new cases in `server/test/stock-extract-util.test.js` and
  `server/test/ai-stock-extract.test.js`: (a) «עגבניות» matches «עגבניה» (Hebrew plural/singular endings ־ות/־ים/־ה
  folded) as the single best match; (b) «בצל» with «בצל צהוב» and «בצל סגול» returns `status: 'choose'` with both as
  candidates, best first; (c) «בצל» with only «בצל יבש» returns that one as matched; (d) a name with no reasonable match
  returns `status: 'unmatched'` with up to 5 nearest candidates; (e) a product the business counted before or that has
  a stock minimum ranks above an equal-scoring one; (f) the answer never contains a product of another business.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts`: a matched line
  fills that product's row amount and unit with the "הצעת AI" mark; a `choose` line shows its candidates as chips
  (`c-chip--toggle`) and a search of all products, and picking one fills that row; an `unmatched` line shows the
  nearest candidates, the search, and «הוספת מוצר חדש» which only adds a new item when pressed; no line ever adds a row
  by itself; `stk_ai_applied` counts only filled rows.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan says «שלושה ארגזים עגבניות ושני קילו בצל»: the tomato row gets 3 crates; onions show the onion
  products to choose from, he picks «בצל צהוב» and that row gets 2 kg; no new item appears.

## Execution Mode
- Parallel: no — it edits the stock screens and `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/stock-extract.js
server/routes/ai/stock.js
server/test/stock-extract-util.test.js
server/test/ai-stock-extract.test.js
shared/schemas/ai-stock-extract.schema.ts
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
public/assets/data/dictionary.json
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

- INV-4: preserves — the extract answer keeps one Zod schema; it gains `status` and `candidates` per line.
- INV-6: preserves — the model is still called only through the server.

## Reuse Check

- the per-line product choice — family: chip — rung: 1 — why: `c-chip--toggle` candidates, as the import row choice.
- the product search for a line — family: search-combobox — rung: 1 — why: the app's existing product search picker.
- the Hebrew name folding — family: helpers — rung: 3 — why: extend the stock extract matcher beside
  `normalizeProductName`.

- .stock-ai__choices — family: stock-ai-draft — rung: 1 — why: layout of the candidate chips inside the component's own stylesheet.
- .stock-ai__search — family: stock-ai-draft — rung: 1 — why: layout of the product search inside the component's own stylesheet.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want what I say to land on the products in my count, so that I don't clean up new items afterwards.
- As an owner, I want to pick the right product when my words fit several.

## Functional Requirements

### Must Have (P0)
- [ ] Matcher: score each product by normalized name with Hebrew plural/singular folding, exact > starts-with >
  contains > token overlap; ties broken by "counted before" and "has a stock minimum"; one clear best (score gap) →
  `matched`; several close → `choose` (up to 5, best first); none → `unmatched` with up to 5 nearest.
- [ ] Sheet: matched fills the row; choose shows chips + search; unmatched shows nearest + search + «הוספת מוצר חדש»;
  nothing adds a row by itself.
- [ ] Dictionary (append-only): `stk_ai_choose` — "לאיזה מוצר הכוונה?", `stk_ai_not_found` — "לא נמצא מוצר מתאים",
  `stk_ai_add_new` — "הוספת מוצר חדש", `stk_ai_search` — "חיפוש מוצר".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the choices sit under the spoken line, one line per spoken item; works one-handed on a phone.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Find the best fitting product for each spoken name and say when several fit — the scoring, the folding, the statuses, the cases — server/utils/stock-extract.js, server/routes/ai/stock.js, shared/schemas/ai-stock-extract.schema.ts, server/test/stock-extract-util.test.js, server/test/ai-stock-extract.test.js
- [x] A2: Let the user pick the product per line and never add an item by itself — the chips, the search, the add-new button, the keys, the specs — src/app/pages/inventory/components/stock-count/**, public/assets/data/dictionary.json
- [x] A3: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Dependencies: 648 (the server-side match without the catalog sent to the model).

## Out of Scope
- Learning a user's own words for a product (a later plan could store the picks as aliases).

## Critical Questions
- none

## Execution Notes
- decided: an unmatched line never becomes a new item without a press — why: Dandan's rule, the count is on the list.
- evidence: `pnpm run test:server` → exit 0, 1956 passed; `pnpm run test:ci` → exit 0, 2652 SUCCESS; `pnpm run build` → 0; `pnpm run lint` → 0 errors; `pnpm --dir server run lint` → 0 errors; kit-checks ok, kit-manifest ok, scope-check ok, breadcrumbs clean, log-query no entries.
- behaviour: «הוספת מוצר חדש» opens the existing add-product page (`/inventory/add`), the simplest way to add an item — reverse: change `addNewForSpoken` in stock-count.component.ts.
- behaviour: a spoken line with no amount shows no candidate chips or search (nothing to fill a row with), only the add-new button — reverse: drop `hasAmount` in stock-ai-draft.component.html.
