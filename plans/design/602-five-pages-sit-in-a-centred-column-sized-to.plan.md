# Plan 602 — Five pages sit in a centred column sized to their content instead of leaving empty space

Status: draft
Track: design
Depends-on: none
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The Style QA run of 2026-11-14 (`Claude outputs/styleqa-2026-11-14/report.md`) found five pages that leave large empty
areas or put their parts on different edges. There is no shared page wrapper in the app (each page sets its own width),
so each page has its own cause:

- **Equipment form** (`/inventory/equipment/add`, V8-dbd9905f, V8-ee2de18f): `.equipment-form-container` has
  `max-width: 35rem` but no auto margins, and its `:host` has no padding. In RTL the card sticks to the right viewport
  edge and the left two thirds stay empty. The sister product form (`product-form.component.scss`) already does
  `:host { padding }` + `margin: 0 auto`.
- **Requests** (`/requests`, V8-fb849161): `.rq-page` has no width limit and `.rq-list` uses
  `repeat(auto-fill, minmax(min(100%, 22rem), 1fr))`. At 1366px that makes four columns, so two cards fill the right half
  and the left half stays empty.
- **Menu library** (`/menu-library`, V8-8e89b1b5): `.menu-library-container` is capped at `56.25rem`. At 1366px the card
  takes about half the width, and the filter row wraps to a second line.
- **Settings** (`/settings`, V3-23b80343): `.settings-shell` is `60rem` wide, but the team tab is a `36rem` column centred
  inside it (the business and baseline forms are `28rem`). The page title sits at the edge of the 60rem shell, about
  120px outside the content.
- **Venues list** (`/venues/list`, V8-dd5ddbb6; the same list appears on `venue-view`, V8-3370891f): `app-list-shell`
  in `layout="cards"` (venues is its only user) gives the white `.table-area` the full remaining screen height: the
  `1fr` row on desktop/tablet and `block-size: calc(100dvh - …)` on phones. With one venue, a tall empty white panel
  stays under the card.

Not covered here: the venue-view "blank placeholders" and red "venue not found" toast findings (a separate bug
investigation). The venue-view screenshot shows the venues list, so the list fix covers its tall-panel finding.

## Goals & Success Criteria
**Primary:** on these five pages the content sits in one centred column with a gutter, the page title lines up with the
content under it, and the venues list panel is no taller than its cards. Nothing is pinned to one edge with empty
space beside it.

Done when:
- [human] Nothing else moved: the inventory, recipe book, suppliers, clients and equipment lists (the table-layout
  `app-list-shell` pages) keep their full-height table card, and the product form looks unchanged.
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 1366x768 on `/inventory/equipment/add` signed in, `.equipment-form-container`'s left and right gaps to the
  viewport differ by at most 2px and each is at least 16px — `e2e/ui/602-1.spec.ts`, screenshot `screens/602-1.png`
- [ui] At 1366x768 on `/requests` signed in, `.rq-page` is at most 960px wide, its left and right gaps differ by at
  most 2px, and the `app-page-header` right edge equals the `.rq-list` right edge within 2px; when at least two
  `app-request-card`s show, the first two share one row and together reach both list edges within 2px (the spec skips
  that part with a clear message when there are fewer than two) — `e2e/ui/602-2.spec.ts`, screenshot `screens/602-2.png`
- [ui] At 1366x768 on `/menu-library` signed in, `.menu-library-container` is at least 1150px wide and its left and
  right gaps differ by at most 2px — `e2e/ui/602-3.spec.ts`, screenshot `screens/602-3.png`
- [ui] At 1366x768 on `/settings?tab=team` signed in, the `.ph-title` right edge equals the `.team-tab` right edge
  within 2px — `e2e/ui/602-4.spec.ts`, screenshot `screens/602-4.png`
- [ui] At 375x812 on `/venues/list` signed in, with at least one venue card, the `.table-area--cards` bottom edge is at
  most 48px below the last card's bottom edge when all cards fit on one screen (the spec skips with a clear message
  when there is no card) — `e2e/ui/602-5.spec.ts`, screenshot `screens/602-5.png`
- [ui] At 1366x768 on `/venues/list` signed in, the same assertion as 602-5 — `e2e/ui/602-6.spec.ts`, screenshot
  `screens/602-6.png`
- [human] At desktop width and on a phone, the equipment form, requests, menu library, settings (all three tabs) and
  venues look balanced: centred content, title in line with the content, and no tall blank white panel under the
  venue cards.

## Execution Mode

- Parallel: yes. No open plan or unmerged run branch (`orch/run-589`, `-591`, `-592`, `-597`) writes these files.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/equipment/components/equipment-form/equipment-form.component.scss
src/app/pages/requests/requests.page.scss
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss
src/app/pages/settings/settings.page.scss
src/app/shared/list-shell/list-shell.component.scss
e2e/ui/602-1.spec.ts
e2e/ui/602-2.spec.ts
e2e/ui/602-3.spec.ts
e2e/ui/602-4.spec.ts
e2e/ui/602-5.spec.ts
e2e/ui/602-6.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves. Only five component stylesheets and new e2e specs change. No server route, schema, service,
  ownership or AI path in any invariant's `Touches` list is involved.

## Reuse Check

- none. No new component, util, pipe, service or `.c-*` class. Each fix changes the page's own existing width or margin
  rule, and the venues fix is a cards-only modifier inside the existing `app-list-shell` stylesheet.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef on a laptop, I want forms and lists in the middle of the screen, so I don't look to one edge of a mostly
  empty page.
- As a chef on my phone, I want the venues list to end where my venues end, so I don't scroll through an empty white box.

## Functional Requirements

### Must Have (P0)
- [ ] **Equipment form** (`equipment-form.component.scss`):
  - `:host` gets `padding-block: var(--space-6)` and `padding-inline: var(--space-4)`.
  - `.equipment-form-container`: replace `max-width: 35rem` with `max-inline-size: 35rem` and add
    `margin-inline: auto`.
  - The bottom-bar padding stays on `inventory.page.scss`, which is not touched.
- [ ] **Requests** (`requests.page.scss`): `.rq-page` gets `max-inline-size: 60rem` and `margin-inline: auto`. Keep
  `padding: 1rem` and the existing `.rq-list` grid unchanged. In 60rem (928px inner) the `22rem` minimum gives two
  equal columns, so two cards fill the row and further cards wrap in pairs. The page header and the list then share
  the column's edges.
- [ ] **Menu library** (`menu-library-list.component.scss`): `.menu-library-container`: `max-inline-size: 56.25rem` →
  `max-inline-size: 75rem`. Nothing else changes: it is still centred by `margin-inline: auto` and the `:host` padding
  still gives the phone gutter.
- [ ] **Settings** (`settings.page.scss`): `.settings-shell`: `max-inline-size: 60rem` → `max-inline-size: 36rem`, the
  team tab's own width, so the `app-page-header` title, the tab rail and the team column share one right edge. The
  shell is `border-box` (global rule), so the team tab fills the shell's inner width.
- [ ] **Venues list panel** (`list-shell.component.scss`): cards layout only. The table layout must not change.
  - Inside the existing `@layer components.list-shell`, after the `.table-body.table-body--cards` rule, add:
    `.table-area.table-area--cards { align-self: start; max-block-size: 100%; }`. The panel takes its content's height
    and is still capped at its grid area, so many cards still scroll inside it. The two-class selector beats the
    single-class `.table-area` rules.
  - Inside the existing `@media (max-width: #{$phone-break})` block, add
    `.table-area.table-area--cards { block-size: auto; max-block-size: calc(100dvh - 2 * var(--space-3)); }`.
  - Inside the existing `@media (max-width: 620px)` block, add `.table-area.table-area--cards { block-size: auto;
    max-block-size: calc(100dvh - 2 * var(--space-3) - 3.5rem - env(safe-area-inset-bottom, 0px)); }`.
  - The inner `.table-body--cards` keeps `overflow-y: auto` and its `minmax(0, 1fr)` row, so when the cap is reached
    the cards scroll inside the panel as they do today.

### Should Have (P1)
- [ ] Each e2e spec follows `e2e/ui/586-1.spec.ts`: `test.use({ viewport })`, `signInQa(context)` from
  `e2e/helpers/qa-session.ts`, `page.goto`, measure with `locator.boundingBox()`, then
  `page.screenshot({ path: 'screens/602-n.png' })`. Specs only read data and never seed it. They use `test.skip` with a
  message when the needed data (two requests, one venue) is missing.

## UI/UX Notes

- RTL: the inline-start edge is the right side. Use logical properties only (`max-inline-size`, `margin-inline`,
  `padding-inline`, `block-size`).
- Only widths, margins and panel height change. No colours, fonts, spacing tokens or component markup change.

## Atomic Sub-tasks

- [x] 602-A1: Centre the equipment form with a page gutter instead of pinning it to the right edge — :host padding, margin-inline auto, max-inline-size — src/app/pages/equipment/components/equipment-form/equipment-form.component.scss
- [x] 602-A2: Put the requests page in a centred column so two request cards fill the row — .rq-page max-inline-size 60rem + margin-inline auto — src/app/pages/requests/requests.page.scss
- [x] 602-A3: Widen the menu library card so it uses the desktop width and its filters fit one row — .menu-library-container max-inline-size 75rem — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss
- [x] 602-A4: Narrow the settings page to the team column so the title lines up with the content — .settings-shell max-inline-size 36rem — src/app/pages/settings/settings.page.scss
- [x] 602-A5: Make the venues card panel only as tall as its cards, capped at one screen — .table-area--cards align-self start + max-block-size at desktop, phone and ≤620px — src/app/shared/list-shell/list-shell.component.scss
- [x] 602-A6: Prove each page is centred, aligned and free of the empty panel at its width — e2e/ui/602-1.spec.ts, e2e/ui/602-2.spec.ts, e2e/ui/602-3.spec.ts, e2e/ui/602-4.spec.ts, e2e/ui/602-5.spec.ts, e2e/ui/602-6.spec.ts

## Technical Considerations

- No shared page-column class exists (`src/styles.scss` has no `.c-page*`), and the five causes differ, so each page is
  fixed in its own stylesheet. A shared `.c-page-column` would be a new engine class. It is left for a later plan that
  moves every page onto it.
- `max-block-size` on a grid container whose height is set by its content: the fr rows are sized again against the
  max (CSS Grid §12.7.1), so the capped panel still gives `.table-body--cards` a definite height to scroll in.
- When there are no venues, the cards-mode empty state (`app-empty-state` spanning all columns) now takes its own
  height instead of the full screen. That is intended.
- Settings business and baseline tabs keep their `28rem` forms centred inside the 36rem shell. Their content starts
  about 4rem in from the title, much closer than today's ~120px. Making them full width is out of scope.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The venue-view blank placeholders and the red "venue not found" toast (separate bug investigation).
- The table-layout `app-list-shell` pages (inventory, recipe book, suppliers, clients, equipment list), whose
  full-height table card is intended.
- Widening the settings business and baseline forms, and the settings "no team members yet" empty state shown next to
  a member row.
- Files changed by the unmerged `orch/run-597` branch (header, hero-fab, product-form, inventory list).

## Critical Questions

none

## Execution Notes

- decision (Planner, 2026-11-14, Human asked for unattended runs): widths requests 60rem (two cards per row), menu library 75rem, settings 36rem; the Human can change them at validation.
