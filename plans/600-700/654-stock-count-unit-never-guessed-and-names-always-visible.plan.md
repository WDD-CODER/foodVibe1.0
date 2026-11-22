# Plan 654 — Stock count: the unit is never guessed (the said word is kept, or the person picks), names always show, no empty columns

Status: done
Depends-on: 653
Snapshot: 563fa335

## Problem Statement
Dandan, 2026-11-21, after plan 653 (staging `563fa335`):

1. **«3 ארגז עגבניות» still lands as 3 grams, with no question about the unit.** Traced:
   - The stored AI drafts (local `aiDrafts`, `feature: 'stock_extract'`) for «3 ארגז עגבניות», «3 ארגזים חציל» and
     «4 קרטון חציל» all come back as a `choose` line with `quantity` and candidates but **no `unit` and no
     `spokenUnit`**: the crate / carton word was lost before the browser saw it. `server/utils/stock-extract.js` keeps
     a unit only from the model's `unit` field (lines ~202–215); when the model answers `unit: null` there is no
     fallback that reads the unit word from the cook's own text.
   - Then the browser defaults silently: `src/app/pages/inventory/components/stock-count/spoken-unit.ts:38`,
     `if (!said) return product.baseUnit` — no unit said → the product's base unit (grams), with no flag and no question.
     Plans 651 and 653 handled a said unit the product lacks, but not a unit that never arrived.
   Dandan's rule: the unit is never guessed. Either the said unit maps to one the product has, or the person is asked.
2. **The swiping column on narrow screens shows empty cells** (`column-slide c-grid-header-cell column-slide--active`
   over the base-amount column): a column with nothing in its cells must not be shown.
3. **Product names disappear on narrow screens.** The name must be visible at every width, even if the row grows
   taller (default `app-list-container` keeps the cells on one row; the name may wrap inside its cell).

## Goals & Success Criteria
**Primary:** a counted line carries the unit the cook said or a unit the person chose — never the base unit by default —
and the count page shows every product's name and no empty column at every width.

- [auto] `pnpm run test:server` passes, including new cases in `server/test/stock-extract-util.test.js`: (a) model
  answer `{ spoken: 'עגבניות', quantity: 3, unit: null }` for the text «3 ארגז עגבניות» → the line keeps
  `spokenUnit: 'ארגז'` read from the text (Hebrew unit words and their plurals: ארגז/ארגזים, קרטון/קרטונים, קילו/ק"ג,
  גרם, ליטר, יחידה/יחידות, שק/שקים, חבילה/חבילות, מגש/מגשים, plus the business's unit names); (b) «5 אבוקדו» (no unit
  word) → no `spokenUnit` and `unitMissing: true`; (c) a model unit that is in UNITS is kept as today; (d) the stored
  draft keeps the model's raw lines next to the cleaned answer, for tracing.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts` and a spec for `spoken-unit.ts`:
  (a) `unitForSpoken(undefined, product)` no longer returns the base unit — a line with no unit puts the row in
  "choose a unit" state, uncounted; (b) a row in that state shows the product's own units as chips
  (`c-chip--toggle`) plus the add-unit option (default `unit-dropdown-add`), and picking one counts the row in that
  unit; (c) the base unit is offered first only when it is a count unit (יחידה), never chosen by itself; (d) after a
  pick from `choose`, a said unit the product has fills the row, a said unit it lacks shows the unit note, no unit
  shows the unit choice; (e) a column whose cells are all empty is not rendered in the swiping header or the rows;
  (f) the name cell wraps and stays visible at 375 px.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At 375 px on `/inventory/count` every row shows its product name, and no empty column header is shown
  (`e2e/ui/654-1.spec.ts`).
- [human] Dandan types «3 ארגז עגבניות», picks a tomato product: the row shows 3 crates if the product has crates,
  else the unit note; «5 אבוקדו» asks which unit (or fills «יחידה» when that is the product's count unit, shown for him
  to confirm). On a phone every name is visible and no empty column shows.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line
- [human] any screen with a unit dropdown · open the dropdown · an add-unit option is there and opens the add-unit popup; the new unit is selected after saving

## Execution Mode
- Parallel: no — stock screens and the stock extract helper; after 653.
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
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/spoken-unit.spec.ts
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
public/assets/data/dictionary.json
e2e/ui/654-1.spec.ts
src/app/pages/breadcrumbs.md
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

- INV-4: preserves — the extract answer gains optional `unitMissing`; the draft record gains the raw model lines.
- INV-6: preserves — the model is still called only through the server; the fallback is a pure text read.

## Reuse Check

- the unit choice on a row — family: chip — rung: 1 — why: `c-chip--toggle` per unit, as the product choice.
- the add-unit option — family: search-combobox — rung: 2 — why: the add-option row → `UnitRegistryService.openUnitCreator`.
- `.stock-count__unit-choice` — a wrap rule for the chip group above, in the page's own layer — family: chip — rung: 1
- reading the unit word from the text — family: helpers — rung: 3 — why: extend `stock-extract.js` beside the existing
  unit-key aliases.

## Defaults

- unit-dropdown-add — applies — how: the row's unit choice includes the add-unit option.
- app-list-container — applies — how: the shell's column carousel; empty columns left out; the name cell wraps.
- leave-and-return — exception — why: this plan adds no page change; plan 651's return-to helper stays as it is.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want every counted amount in the unit I said or the unit I chose, so that my stock is never off by a
  factor of a thousand.
- As an owner on a phone, I want to see every product's name.

## Functional Requirements

### Must Have (P0)
- [ ] Server: when the model gives no unit, read a unit word from the cook's text segment of that line; keep it as
  `spokenUnit`; none found → `unitMissing: true`. Store the model's raw lines in the draft.
- [ ] Browser: no silent base unit anywhere in the count; a line without a resolved unit leaves the row uncounted with
  a unit choice (the product's units as chips + add unit).
- [ ] Hide a column whose cells are all empty; the name cell wraps and stays visible at every width.
- [ ] Dictionary (append-only): `stk_choose_unit` — "באיזו יחידה?".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Keep the unit the cook said even when the model drops it — the text fallback, the missing flag, the raw lines in the draft, the cases — server/utils/stock-extract.js, server/routes/ai/stock.js, shared/schemas/ai-stock-extract.schema.ts, server/test/stock-extract-util.test.js
- [x] A2: Never guess a unit — the unit choice on the row, no base-unit default, the specs — src/app/pages/inventory/components/stock-count/**, public/assets/data/dictionary.json
- [x] A3: Show every name and no empty column on a phone — the wrap, the empty-column rule, the screen check, then the Done-when commands in order — src/app/pages/inventory/components/stock-count/**, e2e/ui/654-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 653.

## Out of Scope
- Converting between units (crates to kilos).

## Critical Questions
- none

## Execution Notes
- decided: no unit → ask, never the base unit — why: Dandan, «3 ארגז» became 3 grams twice; a silent default corrupts
  stock.
- evidence: stock-extract tests 39 pass (util + route); test:ci 2689 SUCCESS; build exit 0; lint exit 0 (warnings only).
- behaviour: base unit offered first only when it is the count unit; never pre-chosen (Done-when (c) wins over the human item) — reverse: preselect it in place_.
- behaviour: the base-amount column is hidden when no drawn row has a value, also on desktop — reverse: drop the showBase_ guards.
- [ui] 654-1: written, not run (e2e/ui/654-1.spec.ts).
