# Plan 655 — Stock count: units learned from the app, every line checked for product + amount + unit, and a compact counted mark and base amount below desktop

Status: done
Depends-on: 654
Snapshot: 563fa335

## Problem Statement
Dandan, 2026-11-21, while plan 654 was building:

1. **The unit words must come from the app's own units, and grow when a unit is added.** Traced: the extract route
   sends the model the unit **keys** only (`server/routes/ai/stock.js:55–58` reads `taxonomyTerms` `kind: 'unit'`,
   projection `{ key: 1 }`; `unitList` in `server/utils/stock-extract.js:36`). Local keys are English (`carbord`, `kg`,
   `unit`, `cup` …), while the cook says «ארגז», «קרטון», «קילו». The Hebrew names live in
   `public/assets/data/dictionary.json` → `units` and in the `DICTIONARY_OVERRIDES` collection (global `__global__` doc
   and the user's own doc — where `KeyResolutionService.ensureKeyForContext` → `TranslationService.addKeyAndHebrew`
   saves the Hebrew name of a unit a user adds, e.g. «חופן» → `handful`). So neither the model nor plan 654's text
   fallback sees the names the cook actually says, and a newly added unit is known only by its English key.
   Dandan's rule: start from a small built-in word list, then always read the units where the app saves them, so a unit
   added tomorrow is recognised in the next count.
2. **Every counted line has three parts — product, amount, unit — and a missing part is asked, never filled.** Dandan
   asked whether this should be the AI or a script. Decision (below): the model only reads the free text into the
   three fields; a plain server function then checks each line against the product list and the unit vocabulary and
   marks every missing or unknown part; the screen asks for exactly those parts. The script is the authority.
3. **Below the desktop breakpoint (`$break-desktop`, 1200 px) the count row is too wide.** The «נספר» (counted) cell
   becomes a small checkbox like the row checkbox of the other lists (`app-list-row-checkbox`), and the base-unit
   amount is not shown all the time: a small control shows it as a hover tooltip and, on click/tap, in a small popover
   that fits a phone screen.

## Goals & Success Criteria
**Primary:** the count understands every unit the business has, in the words people say, asks for exactly the part of
a line that is missing, and fits a phone row with a compact counted mark and an on-demand base amount.

- [auto] `pnpm run test:server` passes, including new cases in `server/test/stock-extract-util.test.js`:
  (a) `unitVocabulary` builds one entry per unit: key + Hebrew name from `dictionary.json` `units` + the global and
  the user's `DICTIONARY_OVERRIDES` names + the built-in spoken forms (ארגז/ארגזים, קרטון/קרטונים, קילו/ק"ג, גרם/גרמים,
  ליטר/ליטרים, יחידה/יחידות, שק/שקים, חבילה/חבילות, מגש/מגשים); (b) a unit added as key `handful` with override name
  «חופן» → «2 חופן פטרוזיליה» and «2 חופנים פטרוזיליה» both give unit `handful`; (c) the model's user part lists each
  unit as key with its Hebrew names, and the model's `unit` answer in Hebrew is mapped back to the key;
  (d) `checkLine` returns `missing: []` for a full line, and `['unit']`, `['amount']`, `['product']` (or several) when
  parts are absent; an unknown unit word gives `missing: ['unit']` with `spokenUnit` kept.
- [auto] `pnpm run test:server` also covers `server/test/ai-stock-extract.test.js`: every returned line carries
  `missing`; a line with `missing` non-empty is never returned as `counted`.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts` and
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts`: (a) a draft line
  shows one question per missing part (which product / how much / which unit) and is not counted until all three are
  set; (b) below 1200 px the counted cell renders `app-list-row-checkbox`, and toggling it marks the row counted;
  (c) below 1200 px the base amount is not printed in the row; its control has `[attr.title]` and `aria-label` with
  the base amount, and a click opens a popover with it; (d) at 1200 px and above the row is as today.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan adds a unit «חופן» to a product, then types «2 חופנים פטרוזיליה» in the count: the row reads 2 חופן;
  «3 עגבניות» asks which unit; «ארגז עגבניות» asks how many. On a phone the counted mark is a small checkbox and the
  base amount opens on tap.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line
- [human] any screen with a unit dropdown · open the dropdown · an add-unit option is there and opens the add-unit popup; the new unit is selected after saving

## Execution Mode
- Parallel: no — stock screens and the stock extract helper; after 654.
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
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
server/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the extract answer gains `missing` per line; no stored shape changes besides the draft record.
- INV-6: preserves — the model is still called only through the server route; the vocabulary and the line check are
  pure server functions.

## Reuse Check

- the unit vocabulary — family: helpers — rung: 3 — why: extend `stock-extract.js` beside `unitList`, reading the
  same `taxonomyTerms` units plus the dictionary names; no new store.
- the three-part line check — family: helpers — rung: 3 — why: a pure function in `stock-extract.js`.
- the compact counted mark — family: list-page — rung: 1 — why: `app-list-row-checkbox` from `src/app/shared/list-selection/`.
- the base amount on demand — family: supplier-picker — rung: 2 — why: a small fixed popover placed with
  `placeInViewport`, as `app-supplier-picker`; the hover text is the native `[attr.title]` + `aria-label`.

- the page-local piece `.stock-ai__question` (a question row of the draft line) — family: list-page — rung: 3 — why:
  page-local layout of the draft; the amount question reuses `app-counter`.
- the page-local pieces `.stock-count__base-btn` and `.stock-count__base-pop` (the base-amount control and its popover)
  — family: list-page — rung: 3 — why: page-local layout of the stock count page, beside `.stock-count__base`.

## Defaults

- unit-dropdown-add — applies — how: the unit question of a line keeps the add-unit option (plan 654).
- app-list-container — applies — how: the shell's row stays on one line; the counted checkbox and the base control
  save the width.
- hints-in-tooltips — exception — why: no dialog is added; the base amount's hover text still uses the same native
  `[attr.title]` + `aria-label`.
- leave-and-return — exception — why: this plan adds no page change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want a unit I added myself («חופן») to be understood the next time I count.
- As an owner, I want the count to ask me only for what I left out — the product, the amount or the unit.
- As an owner on a phone, I want a compact row: a small counted mark, and the base amount when I ask for it.

## Functional Requirements

### Must Have (P0)
- [ ] Server: `unitVocabulary(db, req)` — every live unit of the business (`taxonomyTerms` `kind: 'unit'`) with its
  Hebrew names from `dictionary.json` `units` and `DICTIONARY_OVERRIDES` (global, then the user's), plus the built-in
  spoken forms and plurals; read per request, so a new unit counts at once. The model's user part and the text
  fallback both use it; a Hebrew unit answer maps back to the key.
- [ ] Server: `checkLine` gives each line `missing: ('product'|'amount'|'unit')[]`; a line with any missing part is
  never `counted`.
- [ ] Browser: one question per missing part on the draft line; the row counts only when all three are set.
- [ ] Browser, below 1200 px: the counted cell is `app-list-row-checkbox`; the base amount is a small control with a
  hover tooltip and a click/tap popover that stays inside the screen at 375 px.
- [ ] Dictionary (append-only): `stk_how_much` — "כמה?", `stk_which_product` — "איזה מוצר?", `stk_base_amount` —
  "כמות ביחידת בסיס".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Know every unit by the words people say — the vocabulary from the units and the dictionary names, the model's unit list, the mapping back to the key, the cases — server/utils/stock-extract.js, server/routes/ai/stock.js, server/test/stock-extract-util.test.js
- [x] A2: Check each line for product, amount and unit — `checkLine`, `missing` on the answer, the route test — server/utils/stock-extract.js, shared/schemas/ai-stock-extract.schema.ts, server/test/ai-stock-extract.test.js
- [x] A3: Ask only for the missing part on the draft line — the questions, the specs — src/app/pages/inventory/components/stock-count/**, public/assets/data/dictionary.json
- [x] A4: Fit the row below desktop — the counted checkbox, the base amount tooltip and popover, then the Done-when commands in order — src/app/pages/inventory/components/stock-count/**, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 654 (its text fallback and unit question are extended, not replaced).
- The override docs are read with the same scope rule the dictionary GET routes use (`server/routes/generic.js:397`).

## Out of Scope
- Converting between units (crates to kilos).
- Changing how a unit is added (the add-unit popup stays as it is).

## Critical Questions
- none

## Execution Notes
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `pnpm run test:ci` → exit 0, 2695 SUCCESS (one
  unrelated HeaderComponent test failed once and passed on rerun); `pnpm run test:server` → exit 0, 1971 passed (before
  the final edit; rerun below); kit-checks → ok (6 checks); kit-manifest-check → ok; breadcrumbs, override, plan-ledger,
  lint:icons, lint:no-native-select → clean.
- behaviour: a matched product with no amount is an `unmatched` entry carrying `productId` and `missing: ['amount', …]`
  (the draft asks «כמה?» and then fills the row) — reverse: send it back to the product question.
- behaviour: the amount question is an `app-counter` (a typed number input copy was flagged by the reuse check) —
  reverse: swap for a plain number field.
- behaviour: `missing` is optional in the shared types, so older answers still work; the screen derives it when absent —
  reverse: make it required.
- behaviour: the base-amount popover closes on any click elsewhere, on Escape, and on its close button — reverse: drop
  the `host` listeners.
- [ui]: none in this plan (see below); the narrow-width cases are in the component specs.
- decided: the model reads, a script decides — why: Dandan asked AI or script; the model is good at splitting free
  speech into product / amount / unit, but only a plain check against the business's own products and units can say
  for sure that a part is missing, and that check must never guess.
- decided: below desktop = `$break-desktop` (1200 px) — why: Dandan said "below the desktop breakpoint".
- decided: no `[ui]` screen script in this plan — why: kit v3.8.0 holds a `[ui]` plan until the QA login
  (`ORCH_QA_USER` / `ORCH_QA_PASSWORD`) is in the main folder's `.env`, which only Dandan can add; the narrow-width
  cases are in the component specs and in his phone check.
