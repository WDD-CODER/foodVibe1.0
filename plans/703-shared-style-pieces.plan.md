# Plan 703 — Shared style pieces: page widths, in-panel list, stat tile, card head, form page, table tokens and a style guard

Status: draft
Depends-on: none
Track: code
Snapshot: d06302a3

## Problem Statement
The Human asked for one look across the app: "every list container is a real list container as we use in the app,
and so on". The style audit (`night/style-audit.md`, 2026-11-23) found that pages diverge mostly because a few shared
pieces are missing, so each page invents its own: there is no in-panel list container (≈20 hand-made lists), no page
width rule (eight different widths, 36–90 rem; under 40 rem the page header title shrinks), no KPI tile (drawn four
times), no small-card head (five copies), no entity-form container (four copies), and `.c-table` has no user and
literal values. This plan adds those pieces to `src/styles.scss` **once**, gives `app-empty-state` a compact size for
empties inside cards, adds a style guard that later plans use as their `[auto]` check, and records the rules in the
registry. Plans 704–717 convert the pages; 718 closes the registry. No page is converted here except the catalog.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- Engines live in `src/styles.scss`: `.c-list-row { display: contents }` (`:1085`), `.c-list-body-cell` (`:1089`,
  centred, `border-block-end: 1px solid var(--border-row)`), `.c-list-row.is-selected` (`:1115`), `.c-grid-header-cell`
  (`:1066`), `.c-table` (`:1285`, no template uses it; `th` sticky at `top: 3.875rem`, literal paddings and sizes),
  `.c-col-actions` (`:1351`, `gap: 0.25rem`), `.c-sortable-header` (`:1335`), `.c-glass-panel` (`:484`),
  `.c-glass-card` (`:466`), `.c-empty-state` (`:1361`, `padding-block: 3rem`, message `font-size: 1rem`).
  Engines are unlayered; page stylesheets use `@layer`, so a page rule never beats an engine property — a new look
  must be an engine modifier, not a page override.
- Tokens: `--fs-xs…--fs-3xl`, `--fw-regular…--fw-extrabold`, `--space-0…--space-12` (8-pt scale), `--radius-xs…full`,
  `--shadow-glass|card|modal|glow`, `--bg-glass(-strong|-hover)`, `--bg-muted`, `--border-glass|default|row`,
  `--color-primary-hover`, `--color-on-bar`. Breakpoints `$break-phone-max` 767 / `$break-tablet-min` 768 /
  `$break-desktop-min` 1024 (`src/styles.scss:5-8`).
- `app-page-header` shrinks its title to `--fs-lg` under `@container page-header (max-width: 640px)`
  (`src/app/shared/page-header/page-header.component.scss:128`).
- `app-empty-state` (`src/app/shared/empty-state/empty-state.component.ts`): inputs `messageKey` (required), `icon`,
  `ctaLabelKey`, `ctaDisabled`; output `ctaClick`; icon is always `[size]="48"`. It has no spec.
- The hero KPI look lives in `src/app/pages/dashboard/components/business-performance/business-performance.component.scss:62-85`
  (`.perf-card--hero`: `color: var(--color-on-bar)`, `background: var(--color-primary-hover)`, `padding-block:
  var(--space-5)`, `padding-inline: var(--space-6)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-card)`).
- The entity form container is the same in `equipment-form.component.scss:9-18` and `supplier-form.component.scss:9-20`
  (`--bg-glass-strong`, `--border-glass`, `--radius-xl`, `--shadow-glass`, `--blur-glass`).
- `scripts/styleqa/static-checks.mjs` exports `parseStylesheet(text)` (blocks and declarations with line numbers and
  the prelude stack); `pnpm run test:scripts` runs `node --test scripts/test/*.test.mjs`.
- `/dev/catalog` (`src/app/pages/dev-catalog/`) shows every UI family (dev builds only).

## Goals & Success Criteria
**Primary:** every shared piece the later style plans need exists once, in `src/styles.scss` or in its shared
component, is shown on `/dev/catalog`, is named in the registry, and a script can tell whether a set of files uses
the shared pieces and the tokens.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-guard.test.mjs` (fixtures inline): `styleFindings` reports `colour` for `color: #fff` and `background: rgba(0,0,0,.1)` and `var(--x, #fff)`, but not for `--brand: #fff` or anything inside `@media print`; `font-size` for `font-size: 0.875rem`; `font-weight` for `font-weight: 600`; `radius` for `border-radius: 6px`; `shadow` for `box-shadow: 0 2px 4px var(--x)`; `space-scale` for `padding: 1rem 0.5rem` and `gap: 8px` but not for `padding: 0.625rem` or `gap: var(--space-2)`; `physical` for `margin-left`, `left:`, `width:`, `border-top`, `text-align: right`, but not for `inline-size` or a `max-width` inside an `@media` prelude; `engine-in-component` for a component file whose selector starts with `.c-`; `hand-drawn-dialog` for a template with `class="c-modal-overlay"` or `role="dialog"`; `local-empty` for `class="no-results"` and `class="trash-empty"` but not `class="c-empty-state"`; `local-loading` for `class="fs-loading"`; `bare-input` for `<input type="text">` with no `c-input` class but not for `type="checkbox|radio|hidden|file"`; an `allow` entry `{ rule, file, why }` removes matching findings.
- [auto] `scripts/test/style-703.test.mjs`: `styleFindings` on `src/app/pages/dev-catalog/dev-catalog.page.scss`, `src/app/pages/dev-catalog/dev-catalog.page.html` and the two empty-state files returns `[]`; `src/styles.scss` contains each of `.c-page`, `.c-page--narrow`, `.c-list`, `.c-list-row--link`, `.c-row-link`, `.c-stat-tile`, `.c-stat-tile--hero`, `.c-card-head`, `.c-form-page`, `.c-empty-state--compact`, `--page-max-content`, `--page-max-narrow` exactly once as a definition; the text of `src/styles.scss` above the line `/* ==== Plan 703 — style unification pieces ==== */` equals, after `trimEnd()`, the base file's text above the same marker (or the whole base file when the base has no marker yet); base = `git show $(git merge-base HEAD origin/main):src/styles.scss` through `execFileSync('git', …)`; the test skips this one assertion with a printed reason when `origin/main` is not available — append-only proof that keeps passing after later plans append below the block.
- [auto] `pnpm run test:ci` passes, including the new `src/app/shared/empty-state/empty-state.component.spec.ts`: with `compact` false the host renders `.c-empty-state` without `--compact` and a 48 px icon; with `compact` true it adds `.c-empty-state--compact` and a 24 px icon; `ctaLabelKey` renders one `.c-btn-primary` that emits `ctaClick`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0; `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/dev/catalog` on a laptop: the new section "style pieces" shows a narrow page frame, a three-row in-panel list (one row selected), a normal and a dark KPI tile, a card head with a link, a form frame, a small data table and a compact empty state — and they look like parts of the same app as the list pages (`/inventory`, `/clients`).

- [human] the list's page with no items · open the page · a message says the list is empty (`/dev/catalog` → style pieces: the compact empty sample; default `empty-state-on-list`)
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/dev/catalog` → style pieces: the in-panel list sample next to `/clients`; default `app-list-container`)

## Execution Mode
- Parallel: no — first plan of the style run (703–718); it is the only plan that writes `src/styles.scss`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
src/app/shared/empty-state/empty-state.component.ts
src/app/shared/empty-state/empty-state.component.html
src/app/shared/empty-state/empty-state.component.spec.ts
src/app/pages/dev-catalog/dev-catalog.page.html
src/app/pages/dev-catalog/dev-catalog.page.scss
src/app/pages/dev-catalog/dev-catalog.page.ts
src/app/pages/dev-catalog/dev-catalog.page.spec.ts
scripts/lib/style-guard.mjs
scripts/test/style-guard.test.mjs
scripts/test/style-703.test.mjs
src/app/shared/breadcrumbs.md
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

- INV-none: preserves — CSS engines, one presentational input on a shared component, a dev-only catalog section and a Node test helper; no data, route, server, permission or schema is touched.

## Reuse Check

- `.c-page`, `.c-page--narrow` and the tokens `--page-max-content`, `--page-max-narrow`, `--page-gutter` — family: engine-classes — rung: 3 — why: eight pages set their own width today; one engine replaces them (no family holds a page frame).
- `.c-list`, `.c-list-row--link`, `.c-row-link` — family: list-page — rung: 3 — why: the in-panel sibling of `app-list-shell`; it reuses `.c-list-row` / `.c-list-body-cell` as they are and only adds the grid container, start alignment and the clickable-row look that three list pages copy locally.
- `.c-stat-tile`, `.c-stat-tile--hero` — family: engine-classes — rung: 3 — why: the KPI tile is drawn four times (dashboard, business performance, platform, report); promote, don't repeat (cssLayer rule).
- `.c-card-head` (+ `__icon`, `__title`, `__end`) — family: engine-classes — rung: 3 — why: five dashboard cards and four front-desk cards each write their own head.
- `.c-form-page` — family: entity-form — rung: 3 — why: the same glass form container is copied in four forms.
- `.c-table` token values (appended override) — family: engine-classes — rung: 2 — why: the engine exists but no page uses it because its values are literal and its header sticks at a fixed offset.
- `.c-empty-state--compact` and the `compact` input of `app-empty-state` — family: empty-state — rung: 2 — why: empties inside cards and drawers need a smaller version of the same piece instead of page-local text.
- `scripts/lib/style-guard.mjs` (`styleFindings`) — family: none — rung: 4 — why: a test helper for the style plans; it reuses `parseStylesheet` from `scripts/styleqa/static-checks.mjs` and adds the template and spacing rules styleqa does not have.

## Adopt Check
- scripts/lib/style-guard.mjs (styleFindings) — candidate: stylelint — considered: stylelint-use-logical, stylelint-declaration-strict-value — verdict: build — why: a ~150-line Node helper on top of the existing `parseStylesheet` (styleqa) covers SCSS and the template rules (overlay, local empty, bare input) that stylelint does not see; no new dev dependency or config for a style run

## Defaults

- one-breakpoint-set — applies — how: the new engines use `$break-desktop-min` from `src/styles.scss`; no other width
- app-list-container — applies — how: `.c-list` is registered as the in-panel form of the shared list container next to `app-list-shell`; the registry entry says which one a list uses
- empty-state-on-list — applies — how: `app-empty-state` gains `compact` so in-card lists can use it
- loading-and-error-states — exception — why: this plan adds no data read

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every screen to have the same frame and the same kind of list, so that I always know where to look and what I can tap.
- As a developer of the next style plan, I want one test that says whether my files use the shared pieces, so that I don't need a person to spot a stray colour.

## Functional Requirements

### Must Have (P0)

**Engines, appended at the end of `src/styles.scss` under `/* ==== Plan 703 — style unification pieces ==== */`**
(five-group property order, logical properties, tokens only; nothing above the marker changes)
- [ ] Tokens in a new `:root` block: `--page-max-content: 72rem`, `--page-max-narrow: 48rem`, `--page-gutter:
  var(--space-4)`; from `$break-desktop-min` up `--page-gutter: var(--space-6)`.
- [ ] `.c-page`: `display: flex; flex-direction: column; gap: var(--space-4); inline-size: 100%; max-inline-size:
  var(--page-max-content); margin-inline: auto; padding: var(--page-gutter)`. `.c-page--narrow` sets
  `max-inline-size: var(--page-max-narrow)`. A page inside `app-list-shell` uses neither (full width).
- [ ] `.c-list`: `display: grid; grid-template-columns: var(--list-cols, minmax(0, 1fr) auto); margin: 0; padding: 0;
  list-style: none`. Cells of its rows: `justify-content: flex-start; text-align: start`; a cell with `.c-col-actions`
  or `.c-list-body-cell--end` keeps `justify-content: flex-end`; the cells of the last row have no
  `border-block-end`. `.c-list--plain` drops the cell background (for lists inside a `.c-glass-panel`).
- [ ] `.c-list-row--link > .c-list-body-cell { cursor: pointer }`; `.c-list-row:hover > .c-list-body-cell`
  and `.c-list-row:focus-within > .c-list-body-cell` use `background: var(--bg-glass-hover)` unless the row
  `.is-selected`; `.c-list-row:is(:hover, :focus-within) .c-icon-btn { opacity: 1 }`; `.c-sortable-header {
  user-select: none }`. (These are the four rules equipment, inventory and supplier lists copy today.)
- [ ] `.c-row-link`: the name in a row — `color: var(--color-text-main); font-weight: var(--fw-medium);
  text-decoration: none`; on hover and `:focus-visible` `color: var(--color-primary); text-decoration: underline`.
- [ ] `.c-stat-tile`: grid, `gap: var(--space-1)`, `padding: var(--space-4)`, the `.c-glass-panel` surface values;
  parts `__top` (flex, `gap: var(--space-2)`, `align-items: center`), `__icon` (`color: var(--color-primary)`),
  `__label` (`--fs-sm`, `--color-text-muted`), `__value` (`--fs-2xl`, `--fw-bold`, tabular digits like `.c-num`),
  `__note` (`--fs-xs`, `--color-text-muted`). `.c-stat-tile--hero`: the values of `.perf-card--hero` listed above,
  with `__label`, `__value`, `__note` in `var(--color-on-bar)`.
- [ ] `.c-card-head`: flex, `align-items: center`, `gap: var(--space-2)`, `margin-block-end: var(--space-3)`;
  `__icon` `color: var(--color-primary)`; `__title` `margin: 0; font-size: var(--fs-md); font-weight:
  var(--fw-semibold)`; `__end` `margin-inline-start: auto`.
- [ ] `.c-form-page`: `inline-size: 100%; max-inline-size: var(--page-max-narrow); margin-inline: auto; padding:
  var(--space-6)` with the glass values of the equipment form container; under `$break-phone-max` `padding:
  var(--space-4)` and `border-radius: var(--radius-lg)`.
- [ ] `.c-table` override (same selectors, appended): `th` — `position: static; padding-block: var(--space-3);
  padding-inline: var(--space-4); background: var(--bg-muted); color: var(--color-text-muted); font-family: inherit;
  font-size: var(--fs-xs); font-weight: var(--fw-semibold); letter-spacing: var(--tracking-wide)`; `td` —
  `padding-block: var(--space-3); padding-inline: var(--space-4); font-size: var(--fs-base); border-block-end: 1px
  solid var(--border-row)`; `tbody tr { cursor: default }`, `tbody tr:hover { background: var(--bg-glass-hover) }`.
  `.c-table--compact` uses `--space-2` paddings (print and dense tables).
- [ ] `.c-empty-state--compact`: `gap: var(--space-2); padding-block: var(--space-4)`; its `__msg` uses
  `font-size: var(--fs-base)`.

**Shared component**
- [ ] `app-empty-state` gets `compact = input(false)`; the host element gets `c-empty-state--compact` and the icon
  is 24 instead of 48 when it is true. Nothing else changes.

**Style guard** — `scripts/lib/style-guard.mjs`, Node built-ins plus `parseStylesheet` from
`scripts/styleqa/static-checks.mjs`; single quotes, no semicolons.
- [ ] `export function styleFindings(files, { root = process.cwd(), allow = [] } = {})` → `[{ file, line, rule, text }]`,
  sorted by file and line. `.scss` files get the stylesheet rules, `.html` files the template rules; a missing file
  throws. Declarations whose prop starts with `--` or `$`, and everything inside an `@media print` block, are skipped.
- [ ] Stylesheet rules: `colour` (hex, `rgb()`, `rgba()`, `hsl()`, `hsla()` anywhere in a value, including a `var()`
  fallback; a whole value of `white` or `black`), `font-size` (a px/rem/em/pt literal), `font-weight` (a numeric
  literal or `bold`), `radius` (a px/rem literal other than 0 in `border-radius*`), `shadow` (`box-shadow` whose value
  has no `var(` and is not `none`), `space-scale` (`padding*`, `margin*`, `gap`, `row-gap`, `column-gap`, `inset*`
  holding a literal equal to a `--space-*` value: 0.25/0.5/0.75/1/1.25/1.5/2/2.5/3 rem or 4/8/12/16/20/24/32/40/48 px),
  `physical` (`margin|padding-left|right|top|bottom`, `border-left|right|top|bottom*`, `left`, `right`, `top`,
  `bottom`, `width`, `height`, `min-|max-width|height` as properties, `text-align: left|right`, `float: left|right`),
  `engine-in-component` (a block prelude starting with `.c-` in any `.scss` other than `src/styles.scss`).
- [ ] Template rules: `hand-drawn-dialog` (`c-modal-overlay` class or `role="dialog"`), `local-empty` (a class token
  containing `empty` or equal to `no-results`, other than `c-empty-state*`), `local-loading` (a class token containing
  `loading` or `spinner`, except files whose name contains `loading-list`), `bare-input` (`<input>` with a type other
  than checkbox, radio, hidden, file and no class token starting with `c-input`; `<textarea>` with no `c-input`).
- [ ] `allow` entries `{ rule, file, line?, why }` drop matching findings; `why` must be a non-empty string (throws
  otherwise), so every exception is explained in the plan's test.

**Catalog and registry**
- [ ] `/dev/catalog` gets a section `id="style-pieces"` (heading text is a code label like the other sections) that
  renders every new engine with static sample data held in the page class (signals); its stylesheet's own literals
  (`var(--bg, #fff)` at `:16`, `rgb(0 0 0 / 10%)` at `:22`, the spacing literals) become tokens.
- [ ] `docs/brain/component-families.md`: `list-page` gets "In-panel lists: `.c-list` (plan 703) — a list inside a
  card, drawer, tab or panel with no search; full-page entity lists use `app-list-shell`"; `engine-classes` gets one
  bullet per new engine, the page-width rule (full / `.c-page` / `.c-page--narrow`), the icon-size rule (14 meta, 16
  buttons/chips/row actions, 18 header and primary buttons, 24+ only empty states and heroes) and the **token mapping**
  below; `empty-state` gets the `compact` input.
- [ ] `docs/brain/inventory.md` regenerated with `node scripts/inventory.mjs` (never edited by hand).

### Should Have (P1)
- [ ] The catalog section shows the `.c-list` both plain and inside a `.c-glass-panel`.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical properties only; the selected-row edge already follows the direction (`:dir(rtl)`).
- No new dictionary key: the catalog labels are code strings like its other sections (dev-only page).
- Icons: none new (`lucide-icon` names already registered: `chart-column`, `list`, `inbox`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write the style guard that later plans use as their check — styleFindings with the stylesheet and template rules and the allow list, and its fixture test — scripts/lib/style-guard.mjs, scripts/test/style-guard.test.mjs
- [ ] A2: Add the shared frame, list, tile, card head, form page, table and compact empty engines at the end of the global stylesheet — src/styles.scss
- [ ] A3: Give the empty state a compact size for cards and drawers — src/app/shared/empty-state/empty-state.component.ts, .html, .spec.ts
- [ ] A4: Show every new piece on the catalog page and clear its literal values — src/app/pages/dev-catalog/dev-catalog.page.html, .scss, .ts, .spec.ts
- [ ] A5: Prove the append-only rule and the clean catalog in one test — scripts/test/style-703.test.mjs
- [ ] A6: Record the pieces, the page-width, icon-size and token-mapping rules in the registry and regenerate the inventory — docs/brain/component-families.md, docs/brain/inventory.md, src/app/shared/breadcrumbs.md

## Technical Considerations
- Dependencies: none.
- New files: `scripts/lib/style-guard.mjs`, `scripts/test/style-guard.test.mjs`, `scripts/test/style-703.test.mjs`,
  `src/app/shared/empty-state/empty-state.component.spec.ts`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: the `log-query` Done-when item; `src/styles.scss` is an append-only hotspot — only appended to;
  dictionary not touched; folder map `src/app/shared/breadcrumbs.md` in scope for the new spec. Stylesheets follow
  `.claude/skills/cssLayer/SKILL.md`; the component follows `.claude/skills/angularComponentStructure/SKILL.md`.
- Traps: `.c-list-row` is `display: contents`, so a row's border, background and hover live on its cells — never on
  the row. `li.c-list-row` loses its list role in some browsers: `.c-list` users write `role="list"` on the container
  and `role="listitem"` on the row. A rule written in a component `@layer` cannot change an engine property; that is
  why the shared bits are promoted here.

## Out of Scope
- Converting any page (plans 704–717). Removing the page-local copies the new engines replace.
- New tokens beyond the three page tokens; a dark theme; changing an existing token value.
- `src/app/pages/venues/**` (plan 698), the new-booking dialog, the header sign-out, the inbox/simulator suggestion bar
  and the server AI client (fix plans 701–702); the floor-plan editor (plans 699–700).

## Critical Questions
- none

## Execution Notes
- Token mapping (copied into the registry by A6; later plans follow it): font-size ≤0.75rem→`--fs-xs`, 0.8–0.8125→`--fs-sm`,
  0.84–0.95→`--fs-base`, 1–1.05→`--fs-md`, 1.1–1.3→`--fs-lg`, 1.4–1.6→`--fs-xl`, 1.75→`--fs-2xl`, ≥2→`--fs-3xl`; weight
  400→`--fw-regular`, 500→`--fw-medium`, 600→`--fw-semibold`, 700/bold→`--fw-bold`, 800→`--fw-extrabold`; radius ≤4px→`--radius-xs`,
  5–7px→`--radius-sm`, 8–16px→`--radius-md`, 17–24px→`--radius-lg`, 25–28px→`--radius-xl`, 50%/999px→`--radius-full`; a
  literal shadow→`--shadow-card` (raised) or `--shadow-glass` (flat); a tint with no token →
  `color-mix(in srgb, var(<nearest colour token>) N%, transparent)` keeping the same alpha; spacing on the scale →
  `--space-*`; off-scale spacing (0.375rem, 0.625rem, 0.875rem…) may stay.
- behaviour: page widths are three (full, 72rem, 48rem) — the nearest one to what a page uses today; narrow is 48rem, not 36rem, so the page header title keeps its full size.
- behaviour: `.c-list` rows are 44 px tall (the existing cell padding), not denser — the app is used on kitchen tablets.
- behaviour: `.c-table` is changed by an appended override instead of a rewrite, because `src/styles.scss` is append-only; it has no user today, so nothing on screen changes.
- behaviour: the style guard counts `width`/`height`/`top`/`bottom` as physical properties (the project rule is logical properties only); plans convert them in the files they touch.
