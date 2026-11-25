# Plan 739 — House rules for one product feel: page recipes, behaviour rules and an audit of every route

Status: draft
Depends-on: none
Track: code
Snapshot: 72a33e4c7cc77199563b28ba9fa9adde21844ebc

## Problem Statement
Dandan (2026-11-25): someone who walks in off the street must feel one professionally built product on every route —
"like roaming inside Facebook". Not identical containers: the same feel and the same behaviour (how a page scrolls,
how dragging works, how things move, load and answer). Today Bookings, Requests, Clients, the front desk pages,
Diagnosis and Settings feel like another product. He also wants a new route to be built to the rules from the start,
with no style fix-up afterwards. His decisions: keep the current look (the six ported screens are the standard);
write the house rules first, then pull the app to them; pilot in FoodVibe, then move the mechanism to the kit (plan 741).

This plan writes the rules and measures the app against them. It changes no app code. Plan 740 turns the rules into
checks; the alignment plans are drafted from this plan's gap list.

Verified on `origin/main` 72a33e4c:
- The look is documented (`.interface-design/system.md`, `docs/qa/styleqa-theme.md`) and shared pieces are registered
  (`docs/brain/component-families.md`). Nothing says what a whole page of a given kind is built from, and no document
  holds a behaviour rule for scroll, drag or motion.
- Six screens were ported to the design and are the standard (`_claude-data/design-migration/screens/_registry.md`
  rows 1–6): Dashboard, Inventory, Recipe Book, Suppliers, Equipment, Venues.
- `app-list-shell` is used by nine lists (clients, equipment, inventory products, invoices, stock count, recipe book,
  suppliers, venues, front desk knowledge). Menu Library, Trash, Bookings and Requests list things without it.
- Product defaults already `on` that are part of the house rules and must be referenced, not rewritten
  (`_shared/product-defaults.md`): `app-list-container`, `empty-state-on-list`, `loading-and-error-states`,
  `one-breakpoint-set`, `anchored-popup`, `unsaved-changes-on-leave`, `confirm-destructive-action`.
- Motion: `src/styles.scss:156-157` has two easing tokens (`--ease-spring`, `--ease-smooth`) and no duration token;
  `git grep -c "transition:" -- src/app/pages` finds 24 page files with their own transitions.
- Scroll: `git grep -c "overflow-y: auto\|overflow: auto\|overflow-y: scroll" -- src/app/pages` finds 10 page files;
  a shared `src/app/shared/scroll-rail/` exists.
- Drag: `cdkDrag` / `cdkDropList` in four templates (`ai-model-manager`, `recipe-ingredients-table`,
  `recipe-workflow`, `ai-draft-editor`), with no shared drag piece or rule.
- `/styleqa` (`docs/agent/styleqa.md`) measures and reviews the look of 26 mapped pages (`node scripts/styleqa/run.mjs
  --list`); it does not judge structure or behaviour. `/diagnosis`, `/diagnosis/:id`, `/inventory/invoices`,
  `/inventory/count` and `/command-center` have no entry in `docs/qa/styleqa-pages.json` `pages`.

## Goals & Success Criteria
**Primary:** one document holds the house rules, written from the six standard screens, in a shape plan 740 can turn
into checks without interpretation; and one audit says, per route, which rules it breaks, ranked worst first.

- [auto] `grep -c "^### recipe-" docs/agent/house-style.md` prints at least `5`, and each of `recipe-list`, `recipe-detail`, `recipe-form`, `recipe-settings`, `recipe-board` is a `###` heading in it.
- [auto] each of `### scroll`, `### drag`, `### motion`, `### loading`, `### empty`, `### feedback`, `### keyboard-focus` is a heading in `docs/agent/house-style.md`.
- [auto] in `docs/agent/house-style.md` the count of `^### ` headings equals the count of `^- check: ` lines and the count of `^- reference: ` lines (every rule has both fields).
- [auto] `node scripts/styleqa/run.mjs --list` lists a page for `/diagnosis`, `/inventory/invoices` and `/inventory/count` (or `docs/qa/styleqa-pages.json` `excluded` holds the route with a `why`).
- [auto] `docs/qa/house-style-audit.md` has one table row per slug that `node scripts/styleqa/run.mjs --list` prints (paste both counts under Execution Notes).
- [auto] `git diff --name-only origin/main -- src server shared` prints nothing (no app code changed).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/739-house-rules-and-route-audit.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/739-house-rules-and-route-audit.plan.md` exits 0; `node scripts/scope-check.mjs --diff=origin/main --plan=plans/739-house-rules-and-route-audit.plan.md` exits 0.
- [human] Card — the rules: read `docs/agent/house-style.md` top to bottom (about ten minutes); each rule is one you recognise from the app when it looks right; reply with the ids to change, or `done`.
- [human] Card — the ranking: read the "Order of work" table at the top of `docs/qa/house-style-audit.md`; the worst-feeling pages are at the top and the proposed waves are the order you want; reply with changes, or `done`.

## Execution Mode
- Parallel: yes — documents and the Style QA page map only.
- Concurrent plans: any that do not write `docs/qa/styleqa-pages.json`.
- Isolated DB: no — Style QA reads the slot's local data and its request guard refuses writes.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating). This plan writes none of the hotspots.

```scope
docs/agent/house-style.md
docs/qa/house-style-audit.md
docs/qa/styleqa-pages.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — two new documents and added entries in the Style QA page map. No app or server code, route,
  schema, permission, AI call or stored data changes.

## Reuse Check
- none — no component, util, pipe, service or `.c-*` class is created; the plan writes documents that name existing ones.

## Defaults

- unsaved-changes-on-leave — exception — why: no form is built; the rule is only cited in the form recipe.
- confirm-destructive-action — exception — why: no action is built; documents only.
- empty-state-on-list — exception — why: no list is built; the rule is only cited in the list recipe.
- loading-and-error-states — exception — why: no screen is built; the rule is only cited in the loading rule.
- hints-in-tooltips — exception — why: no control is built.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built; the rule is only cited in the list recipe.
- one-breakpoint-set — exception — why: no SCSS is written.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef using the app, I want every page to scroll, move, load and answer the same way, so that it feels like one product a company built.
- As a chef who keeps adding screens with AI, I want the rules of my app written down in one place, so that a new screen is built right the first time.

## Functional Requirements

### Must Have (P0)
- [ ] **`docs/agent/house-style.md`** — the house rules. Opening lines: what it is, that the look itself lives in
  `.interface-design/system.md` (never repeated here), and how a rule is added (only when a real page needs it; a new
  recipe is the Human's call). Then two parts, `## Page recipes` and `## Behaviour rules`. Every rule is one
  `### <id>` section with exactly these `- field: value` lines, in this order:
  - `kind` — `recipe` or `behaviour`.
  - `rule` — one sentence a user would recognise (plain words, no class names).
  - `applies to` — which pages or controls.
  - `built from` — the registry family ids (`docs/brain/component-families.md` `###` headings), `.c-*` engines,
    tokens or files that already do it. A piece that does not exist yet is written `needs: <piece> — <why>`; it is
    never invented here.
  - `states` — recipes only: what loading, empty, error and the phone layout look like, each naming the piece.
  - `reference` — the one page in the app that shows it best (path under `src/app/pages/`), from the six standard screens where one fits.
  - `existing default` — the id in `_shared/product-defaults.md` that already holds part of it, or `none`.
  - `check` — how plan 740 enforces it, one of: `plan` (the plan names it), `default` (a product default to
    propose: add `card: <page> · <one action> · <expected result>`), `lint` (add `files: <globs>; pattern: <regex>;
    hint: <one line>` in the rule shape of `scripts/lib/registry-families.mjs`), `card` (a person looks once).
    A `lint` rule whose `built from` has a `needs:` entry is written `check: lint after <piece> exists`.
  - `gaps today` — the count of pages that break it, filled from the audit.
- [ ] **Page recipes — exactly these five ids:** `recipe-list` (a page that lists things: header, search and filters,
  rows, selection, row actions), `recipe-detail` (one record shown: header with back, sections, actions),
  `recipe-form` (add or edit one record: sections, fields, save and cancel, leaving with changes), `recipe-settings`
  (groups of switches and options saved in place), `recipe-board` (cards, tiles or a calendar: Dashboard, Requests,
  Bookings). A page that fits none of the five is listed in the audit as `no recipe`, never given a sixth recipe.
- [ ] **Behaviour rules — exactly these seven ids:** `scroll` (what scrolls: the page; when an inner area may scroll;
  how the scrollbar and the scroll hints look), `drag` (how an item is picked up, shown while moving and dropped, and
  how the same reorder is done from the keyboard), `motion` (which things move, for how long and with which curve;
  two durations only, taken from `.interface-design/system.md` "Animation"), `loading` (what a waiting page and a
  waiting button show), `empty` (what a list or a search with nothing shows), `feedback` (how success, failure and
  "saved" are told to the user), `keyboard-focus` (focus ring, Escape goes one step back, Enter confirms, focus
  returns to what opened a popup).
- [ ] **Where a rule comes from:** the six standard screens, `.interface-design/system.md`, the `on` product
  defaults and the registry — read, not invented. Where the six disagree, the majority wins and the choice is one
  `behaviour:` decision under Execution Notes (`docs/agent/decision-review.md`). No new look, token, class or
  component is proposed as if it existed.
- [ ] **Style QA covers every route:** add `pages` entries (or `excluded` with a `why`) to
  `docs/qa/styleqa-pages.json` for `/diagnosis`, `/diagnosis/:id`, `/inventory/invoices`, `/inventory/count` and
  `/command-center`, in the file's existing entry shape, so the map check passes.
- [ ] **The audit — `docs/qa/house-style-audit.md`:**
  1. `## Order of work` (top): a table of proposed alignment waves, worst first — `wave | what is fixed once (rule or
     family) | pages it changes | why this order`. Fix a shared piece once before any page that uses it.
  2. `## Pages`: one row per Style QA page slug — `slug | route | recipe it should follow | recipe gaps (pieces
     missing or page-local copies) | behaviour gaps (rule ids) | Style QA measured count | Style QA visual high /
     medium | score`. `score` = recipe gaps + behaviour gaps + visual high.
  3. `## Evidence`: for every gap, the file and line or the Style QA finding id. Behaviour gaps come from the code:
     `git grep` for `cdkDrag`, `overflow`, literal `transition` / `animation` durations, a page with no
     `app-page-header`, a list with no `app-list-shell`, a hand-made empty or loading block.
  4. `## Needs`: every `needs:` piece from the rules (for example a shared drag pattern) with the pages waiting on it.
- [ ] **Style QA run:** in the slot, `/styleqa` on all pages (measured layer on every page; visual review on every
  page at the default two widths). A page that fails to review is listed as `not reviewed` in the audit row, not
  guessed.

### Should Have (P1)
- [ ] A closing `## Kit needs` section in `docs/agent/house-style.md`, empty except for its one-line purpose: plan
  740 and later plans append what the kit must own (read by plan 741).

## UI/UX Notes
- No UI is built and no dictionary key is added. Hebrew RTL is part of every recipe (`states` name the phone layout
  with logical sides: start = right).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Read how the six standard screens are built and note what they share — pieces, frame, states, scroll, motion, drag, feedback, per screen, as working notes under Execution Notes — this plan file
- [ ] A2: Write the five page recipes so a builder knows what each kind of page is made of — the `## Page recipes` part with every field of P0 — docs/agent/house-style.md
- [ ] A3: Write the seven behaviour rules so every page scrolls, moves, loads and answers the same way — the `## Behaviour rules` part with every field of P0, citing the existing defaults — docs/agent/house-style.md
- [ ] A4: Make Style QA cover the routes it does not measure yet — entries for diagnosis, invoices, stock count and command center — docs/qa/styleqa-pages.json
- [ ] A5: Measure the look of every page — slot servers up, `/styleqa` on all pages, the report path and the summary lines under Execution Notes — this plan file
- [ ] A6: Write the audit that says which rules each page breaks and in what order to fix them — the four sections of P0, `gaps today` filled back into each rule — docs/qa/house-style-audit.md, docs/agent/house-style.md
- [ ] A7: Run every automatic check and hand Dandan the two reading cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: none changed. Reads `src/app/pages/**`, `src/app/shared/**`, `src/styles.scss`,
  `.interface-design/system.md`, `docs/brain/component-families.md`, `_shared/product-defaults.md`.
- New files needed: `docs/agent/house-style.md`, `docs/qa/house-style-audit.md`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`); Hebrew RTL named in the recipes; no hotspot written; no app code, so the
  log-query item does not apply.
- Run it with `take-plan` in a slot (Style QA needs the slot's servers and starts reviewer agents); it edits nothing
  under `.claude/`.

## Out of Scope
- Any change to app code, styles, tokens or components (the alignment plans, drafted from the audit).
- Turning rules into checks, proposed defaults or lint rules (plan 740).
- A new look, a redesign, or Claude Design work.
- The kit (plan 741).

## Critical Questions
- Q: Is the look of the six ported screens the standard? A: yes — "keep the current look" (Dandan, 2026-11-25).
- Q: Must all containers be identical? A: no — the same feel and behaviour; each keeps its own properties (Dandan, 2026-11-25).

## Execution Notes
