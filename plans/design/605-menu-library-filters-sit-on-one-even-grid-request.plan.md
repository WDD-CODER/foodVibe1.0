# Plan 605 — Menu library filters sit on one even grid, request cards get tidy buttons and a labelled hour chart

Status: draft
Track: design
Depends-on: none
Snapshot: d8b1f68494302471c8afa1da89e5ea6d3af5e8ef
## Problem Statement

The Style QA run of 2026-11-14 found control mismatches on the event-menus list and the requests list:

- **Menu library, date field without a border** (V1-a65b61ff, 375px). `app-date-field`
  (`src/app/shared/date-field/date-field.component.html`) renders its text input with the `.c-input` engine: a grey
  `--bg-muted` fill and a transparent border. The neighbouring filters are `app-custom-select`, whose trigger
  (`.c-select.custom-select-trigger`) is restyled in its own component to `--bg-glass` with a `--border-default`
  outline, so the date is the only flat grey box in the row.
- **Menu library, uneven filter row** (V3-bf1c4431, 1366px). In `menu-library-list.component.scss`, `.filters-bar` is
  `display: flex; flex-wrap: wrap; place-content: center`. Each `.filter-item` takes its content's width, so "שלב" is
  narrow, the date field drifts to the far left, and the sort item wraps to a second row centred mid-card.
- **Menu library, squeezed sort button** (V6-6460ac8b, 375px). In `.sort-controls` (flex), the `app-custom-select` and
  `.sort-order-btn` share the row, and the button can shrink, so "חדש לישן" wraps onto two lines.
- **Requests, uneven action buttons** (V3-7a8a4d52, 375px). `.rq-actions` in `request-card.component.scss` is
  `display: flex; flex-wrap: wrap`. At 375px "אישור" and "חסר מידע" fit on row one and "דחייה" wraps alone.
- **Requests, unlabelled "0/19"** (V3-d3e213f1, 375px). This is not a fraction. It is the day-load chart
  (`app-day-load-strip`) with one hour column: the covers count ("0") over a thin bar over the hour ("19"). The strip
  has no title, the hour has no ":00", and `.strip-bars` is `dir="ltr"` with default `justify-content`, so the column
  sits at the left edge of an RTL card.

## Goals & Success Criteria
**Primary:** on `/menu-library` the filters sit on one even grid starting at the right edge, the date field has the
same outline as the selects, and the sort button stays on one line. On `/requests`, a card's actions form a tidy
layout on a phone, and the day-load chart has a visible title and reads as hours.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 1366x768 on `/menu-library` signed in (the QA business has events, so `.filters-bar` shows), the five
  `.filters-bar > .filter-item` boxes share one top (±1px), the first four have equal widths (±1px), and the first
  item's right edge equals the bar's right edge minus its computed `padding-inline-end` (±2px) —
  `e2e/ui/605-1.spec.ts`, screenshot `screens/605-1.png`
- [ui] At 375x812 on `/menu-library` signed in, the text of `.sort-order-btn` lies on one line (a DOM Range over its
  text gives client rects with a single distinct top), and `#menu-library-date-from`'s computed `border-top-color`
  equals that of the first `.filters-bar .custom-select-trigger` and is not transparent — `e2e/ui/605-2.spec.ts`,
  screenshot `screens/605-2.png`
- [ui] At 375x812 on `/requests` signed in, in the first `[data-testid="request-card"]` that has a
  `[data-testid="request-ask"]` button: `request-approve` is as wide as `.rq-actions` (±2px), and `request-ask` and
  `request-decline` share one top (±1px) and have equal widths (±2px) — `e2e/ui/605-3.spec.ts`, screenshot
  `screens/605-3.png`
- [ui] At 375x812 on `/requests` signed in, the first `app-day-load-strip [data-testid="day-load"]` shows
  `.strip-title` with the exact text "סועדים לפי שעה", every `.strip-hour` matches `/^\d{2}:00$/`, and the rightmost
  `.strip-col`'s right edge is within 2px of `.strip-bars`' right edge — `e2e/ui/605-4.spec.ts`, screenshot
  `screens/605-4.png`
- [human] On a phone (or a 375px window) and on a desktop window, the event-menus filters look like one tidy row, with
  the date box matching the dropdowns. On the requests page, a waiting card's three buttons look neat, and the small
  hour chart has a title you understand at a glance.
- [human] Nothing else moved: other date fields (event page, deposit dialog, frontdesk settings) keep their grey filled
  look, the event cards on `/menu-library` look the same, and request cards on desktop keep their buttons in one row.

## Execution Mode

- Parallel: yes. It writes no file that plan 605 (product form + recipe builder + frontdesk, draft-D) or the open run
  `orch/run-597` writes.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/date-field/date-field.component.ts
src/app/shared/date-field/date-field.component.html
src/app/shared/date-field/date-field.component.spec.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss
src/app/pages/requests/components/request-card/request-card.component.scss
src/app/pages/requests/components/day-load-strip/day-load-strip.component.html
src/app/pages/requests/components/day-load-strip/day-load-strip.component.scss
src/app/pages/requests/components/day-load-strip/day-load-strip.component.spec.ts
e2e/ui/605-1.spec.ts
e2e/ui/605-2.spec.ts
e2e/ui/605-3.spec.ts
e2e/ui/605-4.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the changes are templates and stylesheets, one new optional `input()` on a shared component,
  one appended `.c-*` modifier and one dictionary key. No server, schema, ownership, tenancy or AI path is touched, and
  no scope path matches an invariant's `Touches` glob (none contains "ai").

## Reuse Check

- Outlined date field — family: form-field — rung: 2 — why: `app-date-field` is the only date input (plan 502) and is
  styled only from inside. A `variant` input is added instead of styling it from the menu library.
- `.c-input--outline` modifier — family: form-field — rung: 2 — why: a modifier of the
  existing `.c-input` engine that matches the custom-select trigger's outline. It goes in `src/styles.scss`, so other
  filter rows can use it.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a caterer browsing event menus, I want the filters lined up evenly so I can scan and set them quickly.
- As a front-desk worker on my phone, I want a waiting request's buttons laid out neatly, and the hour chart to say
  what it shows, so I approve or decline without second-guessing.

## Functional Requirements

### Must Have (P0)
- [ ] **Outline engine modifier** — append to `src/styles.scss`, after the existing `.c-input` / `.c-select` focus
  rules:
  `.c-input.c-input--outline:not(:focus) { background: var(--bg-glass); border-color: var(--border-default); }`
  with a one-line comment: "Matches the custom-select trigger outline (date field in filter rows)". Focus keeps the
  `.c-input:focus` look.
- [ ] **Date field variant** — `date-field.component.ts`: add
  `readonly variant = input<'filled' | 'outline'>('filled')` with a doc comment. `date-field.component.html`: on the
  text input add `[class.c-input--outline]="variant() === 'outline'"`. The default stays `filled`, so every other date
  field is unchanged.
- [ ] **Menu library date** — `menu-library-list.component.html`: `<app-date-field … variant="outline" />`.
- [ ] **Filter grid** — `menu-library-list.component.scss`:
  - `.filters-bar`: replace `display: flex; flex-wrap: wrap; place-content: center; gap: 1rem; padding: 0.5rem 1rem`
    with `display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(0, 1.5fr); align-items: end;
    gap: var(--space-4); padding-block: var(--space-2); padding-inline: var(--space-4);`
  - `.filter-item`: add `min-inline-size: 0`. Add `.filter-item app-custom-select { inline-size: 100%; }`.
  - `.sort-wrap .sort-controls app-custom-select { flex: 1 1 auto; min-inline-size: 0; }`.
  - `.sort-wrap .sort-order-btn`: add `flex-shrink: 0; white-space: nowrap;`.
  - In the `@media (max-width: 768px)` block, replace `.filters-bar { flex-direction: column; … }` with
    `grid-template-columns: minmax(0, 1fr); gap: 0.75rem;`, and drop the now-unneeded `width: 100%` rules for
    `.filter-item` and `.date-range-wrap`. Write that `@media` with a local `$break-mobile` mirror (already declared
    lower in the file; move the declaration to the top).
- [ ] **Request actions** — `request-card.component.scss`: keep `.rq-actions` as the flex row on wider screens. Under
  `@media (max-width: $break-mobile)` (declare `$break-mobile: 768px; // mirrors src/styles.scss` at the top):
  `.rq-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }`, then
  `.rq-actions > :first-child { grid-column: 1 / -1; }` (approve takes a full row),
  `.rq-actions > :last-child:nth-child(2) { grid-column: 1 / -1; }` (with only approve + decline, decline is full
  width too), and `.rq-actions > button { justify-content: center; }`.
- [ ] **Day-load title and hours** — `day-load-strip.component.html`: inside `.strip`, before `.strip-bars`, add
  `<span class="strip-title">{{ 'rq_day_load_title' | translatePipe }}</span>`. Change the hour to
  `{{ bar.hour }}:00`. `public/assets/data/dictionary.json` (append): `"rq_day_load_title": "סועדים לפי שעה"` next to
  `rq_day_load`.
- [ ] **Day-load alignment** — `day-load-strip.component.scss`: `.strip-bars` gets `justify-content: flex-end` (the
  container is `dir="ltr"`, so this is the right edge, where the card's RTL content starts; hours still read left to
  right). `.strip-title { display: block; margin-block-end: var(--space-1); font-size: var(--fs-xs);
  font-weight: var(--fw-semibold); color: var(--color-text-muted); }`. Give `.strip-col` `min-inline-size: 2.25rem` so
  "19:00" fits.

### Should Have (P1)
- [ ] `date-field.component.spec.ts`: with `variant` set to `'outline'` the text input has `c-input--outline`; by
  default it does not.
- [ ] New `day-load-strip.component.spec.ts`: with a load of `{ coversByHour: { '19': 0 }, bookings: [] }` and time
  `19:00`, it renders `.strip-title` with the translated key and one `.strip-hour` reading `19:00`.

## UI/UX Notes

- RTL: the filter grid's first column is the right edge. Use logical properties only.
- On a phone the actions read: a full-width teal "אישור", then "חסר מידע" | "דחייה" side by side. Keep each button's
  44px tap height (the `.c-btn-*` engines already give it).
- The chart title uses the existing muted, extra-small label style, in line with "באותו יום: …" below it.

## Atomic Sub-tasks

- [x] 605-A1: Let the shared date field take the outlined look the dropdowns have — .c-input--outline modifier + variant input — src/styles.scss, src/app/shared/date-field/date-field.component.ts, src/app/shared/date-field/date-field.component.html, src/app/shared/date-field/date-field.component.spec.ts
- [x] 605-A2: Put the event-menus filters on one even grid with the outlined date and a one-line sort button — grid columns, nowrap sort button, variant="outline" — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html, src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss
- [x] 605-A3: Lay out a request card's buttons tidily on phones: approve full width, the other two paired — 2-col grid under 768px — src/app/pages/requests/components/request-card/request-card.component.scss
- [x] 605-A4: Give the request hour chart a title and real hour labels so it no longer reads as a fraction — rq_day_load_title, "HH:00", bars aligned right — public/assets/data/dictionary.json, src/app/pages/requests/components/day-load-strip/day-load-strip.component.html, src/app/pages/requests/components/day-load-strip/day-load-strip.component.scss, src/app/pages/requests/components/day-load-strip/day-load-strip.component.spec.ts
- [x] 605-A5: Prove the filter grid, date outline, sort button, action layout and chart title in the running app — e2e/ui/605-1.spec.ts, e2e/ui/605-2.spec.ts, e2e/ui/605-3.spec.ts, e2e/ui/605-4.spec.ts

## Technical Considerations

- `.c-input` is unlayered in `src/styles.scss`, and `date-field.component.scss` wraps its rules in
  `@layer components.date-field`. A layered rule there would lose to `.c-input`, which is why the outline is a global
  engine modifier, not a date-field-local rule.
- The `.c-input:focus` rule in `styles.scss` has the same specificity as `.c-input.c-input--outline`. The
  `:not(:focus)` keeps the focus ring working.
- `.filters-bar` renders only when the business has events. The Style QA run showed it for the QA user. 605-1/605-2
  skip with a clear message when it is absent, rather than seeding data.
- 605-3/605-4 need a waiting, time-bound request with a date (the Style QA run had one, "E2E אורח …"). They skip with a
  clear message when none is present.
- Playwright's default desktop context is not `(pointer: coarse)`, so `#menu-library-date-from` is the text input.
- Specs sign in with `signInQa` from `e2e/helpers/qa-session.ts` (see `e2e/ui/586-1.spec.ts`).
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- Making every date field in the app outlined. Only the menu-library filter opts in, and a global switch is a separate
  design decision.
- The event cards and the page header on `/menu-library`.
- The requests status tabs and the new-request dialog.
- Product form, recipe builder and frontdesk findings (plan 605, draft-D).

## Critical Questions

none

## Execution Notes
- pnpm run build -> exit 0
- pnpm run lint -> exit 0 (0 errors, 67 pre-existing warnings)
- pnpm run test:ci -> exit 0, 2178 SUCCESS (incl. new date-field variant and day-load-strip specs)
- [ui] 605-1..605-4: written, not run (no running app / QA login)
