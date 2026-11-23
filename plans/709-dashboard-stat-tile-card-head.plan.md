# Plan 709 — Dashboard cards on one stat tile and one card head

Status: draft
Depends-on: 703, 704
Track: code
Snapshot: d06302a3

## Problem Statement
The dashboard draws the same number tile twice with different classes (`.kpi-card` in the overview, `.perf-card` in
business performance — and two more copies live on the platform page and the report, plan 710), each of the five
small cards writes its own head (icon + title + link), the recent-activity feed is a hand-made list with its own scroll
arrows, status labels are four local pill classes, "view" links are a local `.link-btn`, and four empty texts are
page-local (`night/style-audit.md` P5, P8, P9, P11; `shots/dashboard.png`). This plan puts the tiles on
`.c-stat-tile` (hero on `.c-stat-tile--hero`), the card heads on `.c-card-head`, the feed on `.c-list`, the labels on
`.c-chip--tag` tones, the links on `.c-btn-ghost--sm`, the empties on `app-empty-state [compact]`, and the dashboard
stylesheets on tokens. Same numbers, same links.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `dashboard/components/dashboard-overview/dashboard-overview.component.html:22,49,66,83` `article.kpi-card` (with
  `warning` / `info` modifiers), `.kpi-top/.kpi-icon/.kpi-label/.kpi-value`, `button.link-btn` (`:31,37,58,75,92`);
  activity feed `.activity-item` with its own scroll arrows (`.scss:246-296`, physical top/bottom); `.activity-type`
  four tones (`.scss:393-424`), `.entity-type-tag` (`:438`), `.act-chip` (`:480-495`, rgba); `.activity-empty`
  (`html:181`); rgba at `.scss:130,308,493,494`; `.kpi-card` surface `.scss:36-52`, `.activity-section` `:204-209`.
- `dashboard/components/business-performance/business-performance.component.scss:62-85` `.perf-card--hero` (the
  values 703 copied into `.c-stat-tile--hero`); `.perf-card__top/__icon/__label/__value`; `.perf__empty` (`html:71`),
  `.perf-panel__empty` (`html:127`); `.funnel__row`, `.upcoming__row` bare reset buttons (`.scss:247`).
- Small card heads: `.fd-card__head` (front-desk-checklist-card), `.fd-week__head` (frontdesk-week-card),
  `.pr-card__head` (price-rises-card), `.setup-card__head` (setup-checklist-card), `.diag-card__head` (diagnosis-card);
  these cards already use `.c-glass-panel`. `.fd-card__none` (`front-desk-checklist-card.component.html:16`).
- `opening-details-banner.component.scss:16-25` bare reset button `.opening-banner__main`, `:51` weight 700;
  `dashboard.page.scss:13,24` `1.5rem` spacing.
- From 703: `.c-stat-tile` (+ `__top`, `__icon`, `__label`, `__value`, `__note`, `--hero`), `.c-card-head`, `.c-list`,
  `.c-list--plain`, `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** every number tile on the dashboard is one `.c-stat-tile`, every small card has one `.c-card-head`, and the
dashboard stylesheets hold no literal value.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-709.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/dashboard/` returns `[]`; the templates contain no `kpi-card`, `perf-card`, `link-btn`, `activity-type`, `act-chip`, `entity-type-tag`, `activity-empty`, `perf__empty`, `perf-panel__empty`, `fd-card__none`, `__head"` class (a class ending in `__head`); `dashboard-overview.component.html` and `business-performance.component.html` contain `c-stat-tile`.
- [auto] `pnpm run test:ci` passes; existing `data-testid`s (`kpi-total-products`, `btn-view-inventory`, …) still exist and the existing dashboard specs pass unchanged except selectors that named removed classes, which now use the `data-testid`s; new case in `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts`: no activity → one compact `app-empty-state`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/dashboard` on a laptop: all number tiles share one shape and one number size; the dark lead tile is still dark; every small card's title row (icon, title, link at the end) lines up the same way.
- [human] the list's page with no items · open the page · a message says the list is empty (`/dashboard` for a new business: the activity feed; default `empty-state-on-list`).

## Execution Mode
- Parallel: yes — after 703 and 704 (the trash tab's list host). Plan 710 depends on it (it uses `.c-stat-tile` the same way on the platform page and the
  report).
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/dashboard/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts
src/app/pages/dashboard/components/business-performance/business-performance.component.spec.ts
scripts/test/style-709.test.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the scope matches `src/app/**/*ai*` only by file or folder name (e.g. waitlist, platform-ai-shots, ai-model-manager, deposit-paid, dashboard); no AI call is added, moved or changed, and every model call still goes through `server/routes/ai.js`.
- INV-none: preserves — markup and styles of the dashboard; the numbers come from the same signals and services.

## Reuse Check

- KPI and performance tiles — family: engine-classes — rung: 1 — why: `.c-stat-tile` / `.c-stat-tile--hero` (703).
- Small card heads — family: engine-classes — rung: 1 — why: `.c-card-head` (703); `price-rises-card` and `diagnosis-card` keep their registry families, only their head markup changes.
- Activity feed — family: list-page — rung: 1 — why: `.c-list.c-list--plain` inside the existing panel; its scroll arrows stay as they are.
- Status labels — family: chip — rung: 1 — why: `.c-chip--tag` with tones teal / amber / red / green / glass.
- View links and row buttons — family: engine-classes — rung: 1 — why: `.c-btn-ghost--sm`; the funnel / upcoming rows become `.c-list-row--link` rows.
- Empties — family: empty-state — rung: 1 — why: `app-empty-state [compact]="true"`.
- none new.

## Defaults

- empty-state-on-list — applies — how: compact `app-empty-state` in the activity feed, performance panels and front-desk checklist
- app-list-container — exception — why: the dashboard's lists are short feeds inside cards; they use `.c-list` (703's in-panel form)
- loading-and-error-states — exception — why: the dashboard's loads are unchanged
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the dashboard numbers to look the same everywhere, so that I compare them without thinking.

## Functional Requirements

### Must Have (P0)
- [ ] Overview: each `article.kpi-card` → `article.c-stat-tile` with `__top` (icon 18 in `__icon`, label in
  `__label`), `__value`, and the view link as `.c-btn-ghost--sm` (same `data-testid`, same handler). The `warning` /
  `info` modifiers become the icon colour only: a local class `kpi-icon--warning` / `kpi-icon--info` on the
  `.c-stat-tile__icon` element sets `color: var(--color-warning)` / `var(--color-info)` (tokens only; it changes the
  icon, not the engine).
- [ ] Business performance: `.perf-card` → `.c-stat-tile`; `.perf-card--hero` → `.c-stat-tile--hero` (the local hero
  block goes; `grid-column: span 2; order: -1` stay as a local layout class `perf__lead`); funnel and upcoming rows →
  `.c-list` rows with `.c-list-row--link` (same click handlers, `role="button"` + `tabindex="0"` + Enter on the name
  cell, or a real `button.c-btn-ghost--sm` inside it — use the button).
- [ ] The five small cards' heads → `header.c-card-head` with `__icon` (18), `__title` (`h3`, existing key), `__end`
  (the existing link as `.c-btn-ghost--sm`).
- [ ] Activity feed → `ul.c-list.c-list--plain[role=list]` (`--list-cols: auto minmax(0, 1fr) auto`: type chip ·
  text · time); the `.activity-item*` rules go; the feed's existing scroll arrows and their logic stay, with their
  physical `top`/`bottom` turned into `inset-block-start`/`inset-block-end` and tokens.
- [ ] `.activity-type` tones, `.entity-type-tag`, `.act-chip` → `c-chip c-chip--tag c-chip--sm` + tone.
- [ ] Empties: `.activity-empty`, `.perf__empty`, `.perf-panel__empty`, `.fd-card__none` → `app-empty-state
  [compact]="true"` with each text's existing key and icon `inbox`.
- [ ] Opening banner: `.opening-banner__main` → `button.c-btn-ghost` keeping its layout class; weight → `--fw-bold`.
- [ ] Dashboard host: `dashboard.page.html` applies `dashboard-content--list` to the trash tab too
  (`activeTab() === 'venues' || activeTab() === 'trash'`), because plan 704 put the trash on `app-list-shell`, which
  needs the unpadded list host like the venues tab; `dashboard.page.scss` spacing → tokens.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icon sizes: 18 in tile and card heads, 16 in chips and links, 24 only in empty states (compact). No new
  dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Draw the overview's number tiles, view links, status labels and activity feed with the shared tile, button, chip and list — src/app/pages/dashboard/components/dashboard-overview/*
- [ ] A2: Draw the performance tiles, the dark lead tile and the funnel and upcoming rows with the shared tile and list — src/app/pages/dashboard/components/business-performance/*
- [ ] A3: Give the five small cards one shared head and the shared small empty state — src/app/pages/dashboard/components/{front-desk-checklist-card,frontdesk-week-card,price-rises-card,setup-checklist-card,diagnosis-card}/*
- [ ] A4: Put the opening banner button and the dashboard page spacing on shared buttons and tokens, and give the trash tab the list host — src/app/pages/dashboard/components/opening-details-banner/*, src/app/pages/dashboard/dashboard.page.html, src/app/pages/dashboard/dashboard.page.scss
- [ ] A5: Lock the dashboard on the shared pieces and tokens — scripts/test/style-709.test.mjs

## Technical Considerations
- The style test `scripts/test/style-709.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-709.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: engines are unlayered and the dashboard stylesheets are layered — the hero tile must carry
  `.c-stat-tile--hero`, not a local override; keep every `data-testid` because e2e specs read them.

## Out of Scope
- Platform total tiles and the report tiles (plan 710). New dashboard content or order.

## Critical Questions
- none

## Execution Notes
- behaviour: the warning / info KPI tiles differ by icon colour only (the tile surface is the same for all), as one tile shape.
- behaviour: funnel and upcoming rows become list rows with a button in the name cell (keyboard reachable), not bare reset buttons.
