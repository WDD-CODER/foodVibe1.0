# Plan 743 — One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag

Status: draft
Depends-on: 740
Track: code
Snapshot: 43053fec

## Problem Statement
Dandan (2026-11-25), house rule `sideways-row` (`docs/agent/house-style.md`): a row of chips, tabs or buttons that
is wider than the screen sits in **one visible container** that scrolls sideways, looks like the up-and-down scroll
area of the dev catalog turned sideways, and is the same everywhere — "including in the header, and also in the
metadata". His decisions: the arrows can be pressed on a computer; the row can be grabbed and dragged on every
screen; on a phone there are no arrow buttons, the row is moved by swiping. He reported that the arrows of the
metadata row "do not work correctly" and that the top bar and the menu builder's stage row do not have the container.

The app already has a shared sideways scroller, `app-scroll-rail`. This plan gives it the frame, the new arrows and
the drag, and puts every row on it.

Verified on `origin/main` 43053fec (file:line):
- `src/app/shared/scroll-rail/scroll-rail.component.ts`: inputs `snap` (:49), `arrows` (`'auto' | 'always' |
  'never'`, :50), `step` (:52); `showPrev` / `showNext` (:61-66); host class `is-overflowing` (:46, :68);
  `fadeLeft` / `fadeRight` 24px mask on the side that can scroll (:71-74); `update()` from scroll, a ResizeObserver
  and a MutationObserver (:77-101); `scrollByStep` RTL-aware (:103-110); `centerChild` (:117); `onWheel` (:123-129).
  **No pointer-drag code. No frame: the rail draws no surface.** Its arrows are round glass buttons, absolutely
  placed (`scroll-rail.component.scss:71-122`), shown at every width, phone included (no media query).
- Users of the rail (6): `src/app/core/components/tab-chips/tab-chips.component.html:3`;
  `src/app/pages/settings/settings.page.html:8`;
  `src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.html:26`;
  `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html:3`;
  `src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html:95` (class `dish-data`, a
  strip of fields inside a dish row); `src/app/pages/metadata-manager/metadata-manager.page.component.html:6`
  (class `mm-jump-nav`).
- The top bar does not use the rail: `src/app/core/components/header/header.component.html:65` `div.nav-pills`;
  its box is `header.component.scss:57-69` (`background: var(--bg-chrome)`, `border: 1px solid var(--border-chrome)`,
  `border-radius: var(--radius-md)`, `backdrop-filter: var(--blur-glass)`, `box-shadow: inset 0 1px 0
  var(--border-glass-strong)`, `padding: 0.25rem`, `gap: 0.125rem`); at tablet width it scrolls on its own with a
  thin visible scrollbar (`:350-375`, `overflow-x: auto; scrollbar-width: thin`). At phone width the top bar is
  hidden and a bottom bar replaces it (`:401+`).
- The metadata row, two faults: (1) at tablet width `.mm-jump-nav { --rail-arrow-offset: 2.25rem }`
  (`metadata-manager.page.component.scss:37-39`) puts the arrows outside the rail, in the page gutter, with no room
  reserved; (2) `jumpTo` (`metadata-manager.page.component.ts:193-198`) starts two smooth `scrollIntoView` calls back
  to back (the page, then the chip through `centerChild`). The row draws its own pill
  (`.mm-jump-nav-row`, scss `:19-51`: `--bg-glass-strong`, `1px solid var(--border-default)`, `--radius-full`).
- The only chip / tab / button row that scrolls sideways without the rail is the tablet top bar. Data tables that
  scroll sideways (`diag-report`, `product-import`, `platform-dashboard`, `export-preview`) are not rows and are not
  touched. `.m-scroll` (`src/styles.scss:1826-1835`) has no user.
- The look to copy, turned sideways: `.c-scroll-arrow` (`src/styles.scss:2950-2978`): a `--bg-glass-strong` →
  transparent gradient at the edge, a 16px chevron in `--color-text-muted`, `opacity` 0 → 0.8 over
  `var(--dur-base) var(--ease-smooth)`, shown only while there is more.
- Breakpoints: `PHONE_QUERY = '(max-width: 767px)'` (`src/app/core/utils/breakpoints.ts:11`), `$break-phone-max`.

## Goals & Success Criteria
**Primary:** every row of chips, tabs or buttons that can outgrow its width sits in the same framed container, with
the same edge arrows, and can be dragged; the top bar and the metadata row included.

- [auto] `git grep -l "app-scroll-rail" -- "src/app/**/*.html"` lists the six files above, `src/app/core/components/header/header.component.html` and `src/app/pages/dev-catalog/dev-catalog.page.html`.
- [auto] `git grep -n "overflow-x: auto\|scrollbar-width: thin" -- src/app/core/components/header/header.component.scss` prints nothing.
- [auto] `git grep -n "rail-arrow-offset" -- src` prints nothing.
- [auto] `grep -c "needs:" docs/agent/house-style.md` prints one less than on `origin/main` for the `sideways-row` rule (paste both counts; the `tooltip` rule keeps its own); the `sideways-row` rule has no `- later check:` line.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0 (includes the rail's updated spec and the new drag cases).
- [auto] `node scripts/kit-checks.mjs --base origin/main` → `KIT_CHECKS: ok`; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/743-sideways-row-container.plan.md` → `ARCH: ok`; `--reuse` exits 0; `--diff=origin/main` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] Top bar at tablet width: open `/dashboard` at 900×800 signed in; the element `app-scroll-rail.nav-pills` exists, its scroller has no horizontal scrollbar (`scrollbar-width` computed `none`), and when its content overflows the button `.sr-arrow--next` is visible; clicking it changes the scroller's scroll position.
- [ui] No arrow buttons on a phone: open `/settings` at 375×812 signed in; inside the settings tabs rail no `.sr-arrow` can be focused or clicked (`pointer-events: none`), and the row still scrolls (set `scrollLeft` and read it back changed).
- [human] Card — the top bar on a narrow computer window: narrow the browser window until the top navigation no longer fits; the links sit in the same white rounded container as before, an arrow appears at the edge that has more, pressing it moves the row, and you can grab the row with the mouse and drag it.
- [human] Card — the metadata row: open the dashboard's metadata tab on a tablet-width window; the row of section chips sits in the same container as the top bar, its arrows are inside the container at the edges, pressing a chip scrolls the page to that section smoothly and keeps that chip in view.
- [human] Card — the stage row in the menu builder: open an event in the menu builder on a narrow window; the stage row sits in the same container, the arrows and the drag work as in the top bar, and pressing a stage still changes the stage (a drag does not press it).
- [human] Card — a phone: open the settings page and a page with tab chips on a phone (or a 375px window); the rows sit in the container, there are no arrow buttons to press, and swiping moves the row.
- [human] Card — the dev catalog: open `/dev/catalog`; the "sideways row" entry shows the container with twelve chips; it looks like the up-and-down scroll area turned sideways.

## Execution Mode
- Parallel: no — it changes the top bar and the shared rail, which every page uses.
- Concurrent plans: none that write `src/app/shared/scroll-rail/**`, `src/app/core/components/header/**` or `docs/agent/house-style.md`.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/scroll-rail/**
src/app/core/components/header/**
src/app/core/components/tab-chips/**
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/settings/settings.page.html
src/app/pages/settings/settings.page.scss
src/app/pages/diagnosis/components/diagnosis-workspace/**
src/app/pages/dev-catalog/**
e2e/ui/743-1.spec.ts
e2e/ui/743-2.spec.ts
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
_shared/product-defaults.md
_shared/debt-baseline.json
.interface-design/system.md
src/app/shared/breadcrumbs.md
src/app/core/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/workflow-kit/manifest.json
```

`_shared/debt-baseline.json` and `docs/workflow-kit/manifest.json` are listed so a count that only goes down, or a
new file that must be classified, never stops the run; nothing else is written there.

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — the metadata manager page changes only how its section chips are framed and how a chip press scrolls; no rename, save or cascading write is touched.
- INV-6: preserves — the scope matches the invariant's `*ai*` glob only by the folder name `scroll-rail`; no AI call, key or route is touched.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class: the existing `app-scroll-rail` (`src/app/shared/scroll-rail/`) gains a frame, new arrows and drag (rung 3, extend the piece). Its registry entry is written as a new family section `sideways-row` in `docs/brain/component-families.md` (the rail had none).

## Defaults

- unsaved-changes-on-leave — exception — why: no form is added or changed.
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: no list is built.
- loading-and-error-states — exception — why: no screen is added and no data request changes.
- hints-in-tooltips — exception — why: no explanation is added; the arrows keep their `scroll_prev` / `scroll_next` labels.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built.
- one-breakpoint-set — applies — how: the only width rule added uses `$break-phone-max` (767px), the shared phone breakpoint.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every row of tabs or chips that does not fit to sit in the same container and move the same way, so that the app feels like one product.
- As a chef on a computer, I want to press an arrow or grab the row and drag it, so that I can reach what is hidden without a scrollbar.

## Functional Requirements

### Must Have (P0)
- [ ] **The frame — `app-scroll-rail`:** new input `frame = input<'box' | 'none'>('box')`. With `'box'` (the
  default) the host draws the container, with exactly the top bar's box values: `background: var(--bg-chrome)`,
  `border: 1px solid var(--border-chrome)`, `border-radius: var(--radius-md)`, `backdrop-filter: var(--blur-glass)`,
  `box-shadow: inset 0 1px 0 var(--border-glass-strong)`, `padding: 0.25rem`. The frame is drawn whether or not the
  row overflows (the container is always visible). `'none'` draws no surface.
- [ ] **The arrows:** replace the round glass buttons by the look of `.c-scroll-arrow` turned sideways: each arrow
  is a `<button type="button" class="sr-arrow sr-arrow--prev|--next">` laid over the inline-start / inline-end edge
  of the scroller inside the frame (full block size of the row, `inline-size: 1.75rem`), with a gradient from
  `var(--bg-glass-strong)` at the edge to transparent towards the row, a 16px chevron in `var(--color-text-muted)`,
  `opacity: 0` → `0.8` over `var(--dur-base) var(--ease-smooth)`, shown only while that side has more
  (`showPrev()` / `showNext()` as today; hidden arrows keep `tabindex="-1"`, `aria-hidden="true"` and
  `pointer-events: none`). The existing 24px mask fade is removed (the gradient replaces it), together with
  `--sr-arrow-room`, the `is-overflowing` padding and the `--rail-arrow-gap` / `--rail-arrow-offset` variables. The
  host keeps the `is-overflowing` class. Labels stay `scroll_prev` / `scroll_next`. RTL: the previous arrow is on
  the inline-start side (the right in Hebrew), chevrons mirrored as today.
- [ ] **Pressing an arrow** moves the row one step, as `scrollByStep` does today (`step`, default one page).
- [ ] **A phone — `@media (max-width: $break-phone-max)`:** the arrows are signs only: `pointer-events: none`,
  `tabindex="-1"` and `aria-hidden="true"` at that width (bind them from a `phone_` signal on `PHONE_QUERY`, updated
  on change), so nothing can be pressed or focused; the gradient and chevron still show while there is more. The row
  moves by swiping (native touch scrolling, unchanged).
- [ ] **Grab and drag, on every screen:** on the scroller, a `pointerdown` with `pointerType` `mouse` or `pen` and
  the main button starts tracking; once the pointer has moved more than 4px sideways the rail is dragging:
  `scrollLeft` follows the pointer (RTL-aware), the host gets `is-dragging` (`cursor: grabbing`, `user-select:
  none`, `scroll-snap-type: none` while dragging), pointer capture is taken, and the `click` that ends the drag is
  swallowed once (capture phase) so the chip or link under the pointer is **not** activated. A press that moved 4px
  or less is a normal click. While the row overflows and is not being dragged the scroller shows `cursor: grab`.
  Touch pointers are not tracked (the browser scrolls). `pointerup` / `pointercancel` / `lostpointercapture` end the
  drag and restore snapping.
- [ ] **`centerChild(el, opts?)`:** add an optional second argument `{ instant?: boolean }`; with `instant: true`
  it uses `behavior: 'auto'`.
- [ ] **The top bar:** in `header.component.html` the `div.nav-pills` becomes `<app-scroll-rail class="nav-pills"
  snap="none">` with the same `a.nav-pill` children. In `header.component.scss` remove the box declarations of
  `.nav-pills` that the rail's frame now draws (background, border, border-radius, backdrop-filter, box-shadow,
  padding) and the tablet rules `overflow-x`, `overflow-y`, `flex-wrap`, `scrollbar-width`,
  `overscroll-behavior-inline` (`:350-375`); keep `.nav-pills`' flex sizing in the bar (`flex: 0 1 auto;
  min-inline-size: 0` at tablet width) and set `--rail-gap: 0.125rem` on it. The kitchen (dark) theme keeps working
  because the frame uses the same `--bg-chrome` / `--border-chrome` tokens. The active link is brought into view on
  navigation: after `NavigationEnd`, `centerChild(<the active a.nav-pill>, { instant: true })`.
- [ ] **The metadata row:** remove `.mm-jump-nav`'s `--rail-arrow-offset` lines and the row's own pill declarations
  on `.mm-jump-nav-row` (background, border, border-radius, backdrop-filter, padding) — the rail's frame draws the
  container; keep its `position: sticky`, offsets, `z-index`, `display` rules and `--rail-gap`. In `jumpTo`, centre
  the chip first with `centerChild(chip, { instant: true })`, then start the one smooth page scroll. The spec case
  that asserts `.mm-jump-nav-arrow` does not exist stays.
- [ ] **The other users:** tab chips, settings tabs, the diagnosis workspace tabs and the event stage bar take the
  default frame (remove any padding or centring rule that fought the old arrows; the stage bar keeps its single
  `.stage-row` wrapper and its danger pill at the end). The dish row's field strip
  (`menu-dish-row.component.html:95`) takes the default frame too: Dandan, 2026-11-25 — "although it's not chips, I
  do want it to act like our sideways row". It keeps its `snap="mandatory"`, its `--rail-gap` / `--rail-padding-block`
  and its fields' own snap alignment.
- [ ] **Dev catalog:** one entry "sideways row": twelve `c-chip c-chip--tab` chips in `<app-scroll-rail>` inside a
  20rem-wide box, in the page's existing entry shape; update the catalog's entry-count spec.
- [ ] **Tests:** update `scroll-rail.component.spec.ts` (the arrow no longer reserves padding; the frame class;
  arrows not focusable on the phone query) and add: a 30px mouse drag changes `scrollLeft` and swallows the click; a
  2px press does not swallow it; a touch pointer is not tracked; `centerChild(el, { instant: true })` uses
  `behavior: 'auto'`. Two `[ui]` specs: `e2e/ui/743-1.spec.ts` (the top bar at 900×800) and `e2e/ui/743-2.spec.ts`
  (settings at 375×812), signed in with `signInQa` (`e2e/helpers/qa-session.ts`).
- [ ] **The rules and the registry:** `docs/agent/house-style.md` `### sideways-row` — replace both `needs:`
  sentences with what now exists (the framed `app-scroll-rail`, the top bar on it), delete the `- later check:`
  line (a line check cannot tell a row of chips from a data table that scrolls sideways; say so in one sentence in
  `gaps today`), keep `check: default`, set `gaps today` from a fresh `git grep`. `docs/brain/component-families.md`
  — a new `### sideways-row` family section (Status, Use, When, Inputs / variants: `frame`, `snap`, `arrows`,
  `step`; Users: the eight templates) and regenerate `docs/brain/inventory.md` (`node scripts/inventory.mjs`).
  `_shared/product-defaults.md` — in the `house-sideways-row` section only, rewrite the `how` line to name the
  framed rail (the section stays `status: proposed`; no other line of the file changes). `.interface-design/system.md`
  — one row for the sideways row container in "Engine Classes" and correct "Mobile (≤620px)" (`:200`) to the shared
  phone breakpoint (≤767px). Folder maps only if `breadcrumbs-check` asks.

### Should Have (P1)
- [ ] `prefers-reduced-motion`: an arrow press uses `behavior: 'auto'` when the user asked for less motion (the
  global rule in `src/styles.scss` already removes the CSS transition).

## UI/UX Notes
- Page recipe: none — no page is added or reframed; `Behaviour: sideways-row`, `Behaviour: motion` (the new rules
  use `--dur-base` and `--ease-smooth`, never a typed time), `Behaviour: keyboard-focus` (the arrows are buttons and
  take the shared ring).
- RTL: logical properties only; inline-start is the right edge. No new dictionary key.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give the sideways scroller a visible container and edge arrows that look like the scroll area turned sideways — the frame input, the new arrows, the removed mask and offset variables — src/app/shared/scroll-rail/**
- [ ] A2: Let the row be grabbed and dragged with the mouse without pressing what is under it, and make the arrows signs only on a phone — the drag tracking, the swallowed click, the phone signal, the instant centring option, the spec cases — src/app/shared/scroll-rail/**
- [ ] A3: Put the top bar's navigation in the container so it stops scrolling on its own with a scrollbar — the rail in the header, the removed box and overflow rules, the active link kept in view — src/app/core/components/header/**
- [ ] A4: Fix the metadata row so its arrows sit inside the container and a chip press scrolls once — the removed offset and pill rules, the jumpTo order — src/app/pages/metadata-manager/metadata-manager.page.component.html, src/app/pages/metadata-manager/metadata-manager.page.component.scss, src/app/pages/metadata-manager/metadata-manager.page.component.ts, src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
- [ ] A5: Give the tab chips, the settings tabs, the diagnosis tabs, the stage row and the dish row's field strip the same container — the default frame, the removed fighting rules — src/app/core/components/tab-chips/**, src/app/pages/settings/settings.page.html, src/app/pages/settings/settings.page.scss, src/app/pages/diagnosis/components/diagnosis-workspace/**, src/app/pages/menu-intelligence/components/event-stage-bar/**, src/app/pages/menu-intelligence/components/menu-dish-row/**
- [ ] A6: Show the container in the dev catalog and check the two screens a script can check — the catalog entry and its count spec, the two ui specs — src/app/pages/dev-catalog/**, e2e/ui/743-1.spec.ts, e2e/ui/743-2.spec.ts
- [ ] A7: Record the container where builders look and name it in the house rules — the sideways-row rule, the new registry family, the inventory, the proposed default's how line, the design system rows — docs/agent/house-style.md, docs/brain/component-families.md, docs/brain/inventory.md, _shared/product-defaults.md, .interface-design/system.md
- [ ] A8: Run every check of this plan and hand Dandan the five cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: `ScrollRailComponent` and its six users; `HeaderComponent` (shown on every signed-in page at
  tablet and desktop width); `PHONE_QUERY` (`@utils/breakpoints`).
- New files needed: `e2e/ui/743-1.spec.ts`, `e2e/ui/743-2.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`, the piece is extended); hotspots not written; folder maps in scope; no
  Hebrew string; the log-query item; `[ui]` cards are specs under `e2e/ui/` signed in with `signInQa`.
- Growth-frozen files (`menu-intelligence.page.ts`, `recipe-builder.page.ts`, `cook-view.page.ts`,
  `product-form.component.ts`) are not touched.
- A duplicated style block fails `kit-checks`: the box values live once, in the rail's stylesheet, and are removed
  from the header and the metadata page in the same plan.

## Out of Scope
- Data tables that scroll sideways (diagnosis report, product import, platform dashboard, export preview).
- The phone's bottom bar.
- The unused `.m-scroll` utility in `src/styles.scss` (append-only hotspot; left as it is).
- Turning the `house-sideways-row` default on (the Human does that after seeing it).
- The shared tooltip (plan 744) and the column carousel (plans 745, 746).

## Critical Questions
- Q: Can the arrows be pressed? A: yes on a computer; on a phone there are no arrow buttons, the row is swiped (Dandan, 2026-11-25).
- Q: Can the row be dragged? A: yes, grabbed and dragged on every screen (Dandan, 2026-11-25).
- Q: Does every row get the visible container? A: yes — "a container, not just an invisible container", the top bar and the metadata row included (Dandan, 2026-11-25); the dish row's field strip in the menu builder too, although it is not chips (Dandan, 2026-11-25).

## Execution Notes
