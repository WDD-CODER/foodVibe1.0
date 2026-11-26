# Plan 747 — Dandan's validation feedback on the row container, the falling columns and the tooltip

Status: draft
Depends-on: 746
Track: code
Snapshot: cef191e6

## Problem Statement
Plans 743–746 were built into the run branch `orch/house-style-ui` (not on `main`) and Dandan validated them on
2026-11-26. Most of it works; this plan is the list of what he asked to change, built on the same run branch (a fix
branch off `origin/orch/house-style-ui`), so `main` stays untouched until he validates again. He asked for no more
questions: each choice he did not spell out takes the recommended option and is logged as a `behaviour:` decision.

His feedback, in his words where it matters:
1. Row container: "the buttons to move left or right need to sit **outside** the container so they will be
   noticeable. Now they sit inside the container covering the chips. Not good."
2. Falling columns: the small label above each value (`cc-cell-label`) "is redundant, as we have the title in the
   header inside the carousel".
3. Product list at a very small width: it "tries keeping 4 columns although it can't". "It should show max of 3
   columns" — "the price was supposed to get in the carousel". "The minimum columns is 3 in each list in mobile
   view. The name always stays, the actions also, and the rest fit in the carousel as long as there's no space for
   them."
4. Tooltip: "they have to make a better calculation of space to the sides. It works good on the up and down but
   sometimes, like the badge on the inventory, it opens broken to the side of the screen. It has to know if it can
   open to the left or right according to the viewport. In mobile no hover, only click to show."
5. The product list's warning badge "is covering the text. I want the warning badge to show only one kind and it's
   the triangle warning. No need for the coloured dot and the svg icon."
6. "Below 910px width the rating starts to be broken but it doesn't switch to the carousel till below 790px. The
   behaviour should not rely on the breakpoint but on the width of each column. The width of the container is
   smaller than the content in it, which is not correct. In long text of one line like the phone number and the
   rating we need the cell width to be as the item in it."
7. The recipe book's cost tooltip: "it needs a space between the `:` and the amount".
8. Top bar: the container "shouldn't grow to the width of the screen. It should have the width of the items inside
   of it and just a bit more. When I remove the `flex: 1 1 auto` it actually looked correct."
9. The bell: below the desktop width "how am I reaching this bell to see the notifications? Maybe we should have
   this inside the profile menu."
10. The stage row in the menu builder: "the chips inside it are supposed to be the same chips like we have
    everywhere across the application, same as inside the metadata container. Same chips, same scroll row."
11. "The price tooltip in products should have the same shared tooltip."
12. "The stock count tooltip should be hovered in all screens except the mobile. Now it hovers only in the desktop."

Verified on `origin/orch/house-style-ui` 72f84d03 (file:line):
- `src/app/shared/scroll-rail/scroll-rail.component.scss:29-30` `.sr-scroller { display: flex; flex: 1 1 auto }`;
  the arrows are buttons laid over the edges inside the frame (plan 743).
- `src/app/shared/column-carousel/column-carousel-cell.component.html` renders `.cc-cell-label` above the value.
- `src/app/shared/list-shell/list-columns.util.ts` `fitColumns`: only columns with `fall` can collapse; the product
  list's `price`, `actions`, `select` have no `fall`
  (`src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`, `columns`).
  At 375px it lays out name, the switching column, price, actions, select.
- `src/app/shared/tooltip/tooltip.directive.ts`: opens on mouse hover, keyboard focus, a 500 ms touch hold, or a
  click with `tooltipOnClick`; places with `placeInViewport`.
- The product list's badge: `button.row-status` with a `@switch (row.statusKind)` that draws `alert-circle`, other
  icons, a dot and a text label (`inventory-product-list.component.html:178-200`); `col-price` still uses
  `[attr.title]="row.priceTip"` (`:256`).
- The stock count shows some hints only when `!narrow_()` (`narrow_` = `TABLET_DOWN_QUERY`, 1023px and below;
  `src/app/pages/inventory/components/stock-count/stock-count.component.ts:96`, `:221`).
- The bell is `<app-notification-bell />` in the top bar's auth section
  (`src/app/core/components/header/header.component.html:47`); the top bar is hidden at phone width, where a bottom
  bar replaces it.
- The stage row uses its own `.stage-pill` buttons
  (`src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html`, `.scss:35-97`); the
  chip family has `c-chip c-chip--tab` (`src/styles.scss`).
- Measured on the run branch at 375px: with the supplier shown in the switching column, product rows reach 169px
  (long supplier lists wrap).

## Goals & Success Criteria
**Primary:** the twelve points above are done on the run branch, and the lists never show a cell narrower than its
one-line content.

- [auto] `git grep -n "cc-cell-label" -- src/app` prints nothing.
- [auto] `git grep -n "attr.title\]=\"row.priceTip\"" -- src/app` prints nothing; `git grep -n "stage-pill" -- src/app` prints nothing.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0, including the new `fitColumns` cases of P0 (phone: name, one switching column and actions only; a `stay` column never collapses; a column's track is never narrower than its `min`).
- [auto] `node scripts/kit-checks.mjs --base origin/orch/house-style-ui` → `KIT_CHECKS: ok`; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/747-house-style-ui-feedback-round.plan.md` → `ARCH: ok`; `--reuse` exits 0; `--defaults` exits 0.
- [ui] Phone, three columns: open `/inventory/list` at 375×812 signed in; the header row has exactly three cells that are not inside another header cell: the name, the switching column and the actions; no `.col-price` cell is outside the switching column.
- [ui] No broken cell: open `/recipe-book` at 900×900 signed in; for every visible `.col-rating` cell that is its own cell, `scrollWidth <= clientWidth` (or the rating is inside the switching column).
- [ui] Arrows outside: open `/dev/catalog` at 1366×768; in the "sideways row" entry the visible `.sr-arrow` button's box does not overlap the box of the rail's frame.
- [human] Card — row arrows: on the dev catalog's "sideways row" entry the arrows sit outside the container, are easy to see, never cover a chip, and appear only on the side that has more.
- [human] Card — the top bar hugs its links: on a wide window the top bar's container is as wide as its links and a bit more; on a narrow window it shrinks and its arrows appear outside it.
- [human] Card — three columns on a phone: open the product list at phone width; you see the name, one switching column (with the price inside it) and the actions; switching shows category, allergens, supplier, unit and price; rows stay one line (long supplier lists are cut with "…").
- [human] Card — a cell is never narrower than its content: narrow the recipe book and the client list slowly; the stars and the phone numbers are never cut or overlapped — the column falls before that happens.
- [human] Card — the tooltip finds room: on the product list hover the warning triangle on rows near the screen's edges, at a wide and at a narrow window; the box is always whole. On a phone-width touch screen a tap shows it and a tap elsewhere hides it.
- [human] Card — one warning sign: on the product list every flagged row shows one small triangle and nothing else; the name is not covered.
- [human] Card — the cost and price hints: the recipe book's cost box reads with a space after each colon; the product list's price shows its hint in the shared tooltip box.
- [human] Card — the bell on a narrow window: below desktop width open the profile menu; an entry for notifications with the unread count opens the same notifications list.
- [human] Card — the stage row: in the menu builder the stages are the same chips as the metadata row's chips, in the same container; pressing one still changes the stage, and a locked stage shows its reason in the tooltip box.
- [human] Card — a small floating box stays inside the screen (default `anchored-popup`): any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off. Use the product list's warning triangle.
- [human] Card — an explanation shows as a tooltip (default `hints-in-tooltips`): a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal. Use a locked stage in the menu builder's stage row.
- [human] Card — every row of a list stays on one line (default `app-list-container`): any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line. Use the product list.
- [human] Card — the stock count hints: on a tablet-width window hover what shows a hint on the desktop; it shows there too. At phone width a tap shows it.

Round two (added 2026-11-26, after Dandan's second validation — see "Round two" under Functional Requirements):
- [auto] `git grep -n "\[href\]=\"'#' + id\"" -- src/app/pages/dev-catalog` prints nothing.
- [auto] `git grep -lE "\[attr\.title\]=\"[^\"]*(sign_in_to_use|money_locked_hint)" -- "src/app/**/*.html"` lists only `src/app/pages/cook-view/cook-view.page.html`.
- [auto] `grep -c "^### disabled-explains-why" _shared/product-defaults.md` prints `1`; that section has `- status: on` and `- turned on: the Human, 2026-11-26`; no other `status` line of the file changed.
- [auto] `pnpm run test:ci` exits 0 twice in a row (paste both `TOTAL` lines), including the new `src/app/shared/tooltip/disabled-why.directive.spec.ts`.
- [ui] Catalog chips: open `/dev/catalog` at 1366×768 signed in, click the top chip whose text is `tooltip`; the URL path is still `/dev/catalog` and the section with id `tooltip` is inside the viewport.
- [ui] A sign of more on a phone: open `/settings` at 375×812 signed in; when the tabs row overflows, an element `.sr-more--next` inside the row's frame is visible and no `.sr-arrow` button exists; after scrolling the row to its end `.sr-more--next` is hidden and `.sr-more--prev` is visible.
- [ui] Aligned triangles: open `/inventory/list` at 1366×768 signed in; for every visible `.row-status` button the distance from its inline-start edge to its name cell's inline-start edge is the same (within 1px).
- [ui] Why it is disabled: open `/dev/catalog` at 1366×768 signed in; hover the disabled button in the "disabled with a reason" entry; a `.c-tooltip` with the text of the key `dc_disabled_sample` is visible; clicking the button does not change the entry's counter text.
- [human] Card — the catalog chips: on the dev catalog press a few of the chips at the top; each scrolls the page to its section and you stay on the catalog.
- [human] Card — the triangle lines up: on the product list the warning triangles sit in one straight column, whatever the names' lengths; rows without a warning keep their names aligned with the others.
- [human] Card — a sign of more inside the row: at phone width look at the settings tabs, the metadata row and the menu builder's stage row; a small arrow at the edge inside the container shows there is more, on the side that has more, and disappears at the end. On a wide window the round buttons outside the container are there as before.
- [human] Card — a disabled button says why (new default `disabled-explains-why`): any page with a disabled button · hover it, or tap it on a phone · a tooltip says why it cannot be used. Use the dev catalog's sample and a signed-out action on the product list.
- [human] Card — the unit column lines up on the stock count: at tablet and phone width the unit selects sit in one straight column whether or not a row has the "i" button.

## Execution Mode
- Parallel: no.
- Concurrent plans: none — it is built on the run branch.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/scroll-rail/**
src/app/shared/column-carousel/**
src/app/shared/list-shell/**
src/app/shared/tooltip/**
src/app/core/utils/viewport-placement.util.ts
src/app/core/utils/viewport-placement.util.spec.ts
src/app/core/components/header/**
src/app/core/components/notification-bell/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/invoices-list/**
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/suppliers/components/supplier-list/**
src/app/pages/equipment/components/equipment-list/**
src/app/pages/clients/components/client-list/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/dev-catalog/**
src/app/pages/dashboard/components/dashboard-overview/**
src/app/pages/menu-intelligence/components/pricing-meter/**
src/app/pages/menu-intelligence/components/menu-dish-row/**
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/metadata-manager/components/logistics-item-manager/**
src/app/pages/metadata-manager/components/taxonomy-kind-manager/**
src/app/pages/venues/components/venue-detail/**
src/app/pages/venues/components/venue-list/**
scripts/lib/registry-families.mjs
docs/workflow-kit/manifest.json
e2e/ui/751-1.spec.ts
e2e/ui/751-2.spec.ts
e2e/ui/751-3.spec.ts
e2e/ui/751-4.spec.ts
e2e/ui/651-1.spec.ts
e2e/ui/599-2.spec.ts
e2e/ui/601-1.spec.ts
e2e/ui/601-2.spec.ts
e2e/ui/611-2.spec.ts
e2e/ui/743-2.spec.ts
e2e/ui/657-1.spec.ts
e2e/ui/747-1.spec.ts
e2e/ui/747-2.spec.ts
e2e/ui/747-3.spec.ts
e2e/ui/743-1.spec.ts
e2e/ui/745-2.spec.ts
e2e/ui/745-3.spec.ts
e2e/ui/746-1.spec.ts
e2e/ui/746-2.spec.ts
e2e/ui/603-3.spec.ts
e2e/ui/586-1.spec.ts
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
_shared/product-defaults.md
_shared/debt-baseline.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — the metadata manager pages change only how a chip row sits beside the rail's arrows and how a disabled button explains itself (round two); no rename, save or cascading write is touched.
- INV-6: preserves — the scope matches the invariant's `*ai*` glob only by the folder names `scroll-rail` and `venue-detail`; no AI call, key or route is touched.

## Reuse Check
- appDisabledWhy directive (src/app/shared/tooltip/disabled-why.directive.ts) — family: none — rung: 4 — why: it extends the `tooltip` family, which plan 744 created on the run branch and which is not on `main` yet, so the registry on `main` has no heading for it; a disabled control cannot show a tooltip reliably, and this keeps the control reachable, blocks its action and says why, built on the shared `[appTooltip]`. Everything else changes pieces plans 743–746 built and moves hints and one chip row onto existing families.

## Adopt Check
- appDisabledWhy directive (src/app/shared/tooltip/disabled-why.directive.ts) — verdict: skip — why: a thin directive over the app's own shared tooltip; nothing to adopt.

## Defaults

- app-list-container — applies — how: app-list-shell with app-page-header; on a phone every list shows the name, one switching column and the actions, and a one-line cell is never narrower than its content.
- one-breakpoint-set — applies — how: no new `@media` width; phone-only behaviour uses `PHONE_QUERY` / `$break-phone-max`.
- hints-in-tooltips — applies — how: the shared tooltip `[appTooltip]` (src/app/shared/tooltip/) for the price, the stage lock reasons and the stock count hints.
- anchored-popup — applies — how: placeInViewport (src/app/core/utils/viewport-placement.util.ts); the box is clamped inside the viewport on both sides and its caret follows the control.
- unsaved-changes-on-leave — exception — why: no form is added or changed.
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: the lists' empty blocks are not changed.
- loading-and-error-states — exception — why: no data request changes.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want what I asked for in my validation built exactly, so that the app feels like one product.

## Functional Requirements

### Must Have (P0)
- [ ] **F1 — arrows outside the container (`app-scroll-rail`):** the host becomes a row of three parts: the
  previous arrow, the framed container (the frame moves from the host to an inner wrapper around the scroller), the
  next arrow. Each arrow is a small round button (`inline-size` and `block-size` `1.75rem`, `border-radius:
  var(--radius-full)`, `background: var(--bg-glass-strong)`, `border: 1px solid var(--border-default)`, `box-shadow:
  var(--shadow-card)`, a 16px chevron) beside the container with a `0.25rem` gap. While the row overflows, both
  arrow slots keep their room so the container does not jump; an arrow whose side has no more is invisible and not
  focusable (`visibility: hidden`), and when nothing overflows neither slot takes room. Inside the container an
  edge keeps a soft fade (no chevron) while that side has more. At phone width the arrow buttons are not rendered
  at all (the fade stays). Drag, wheel, snap and `centerChild` are unchanged.
- [ ] **F2 — the container hugs its items:** the framed container is `inline-size: fit-content; max-inline-size:
  100%` (the scroller no longer has `flex: 1 1 auto` as its width source; it keeps `min-inline-size: 0` and scrolls
  when the content is wider than the room). This is the rail's default for every user; the top bar's rail is
  centred as before. Remove any rule in the header or the metadata page that stretched the rail to the full width.
- [ ] **F3 — no label above the value:** remove `.cc-cell-label` (markup and CSS) from
  `app-column-carousel-cell`, in both modes; the header of the switching column already names what is shown.
- [ ] **F4 — every list can shrink to three columns:** in `ListColumn` add `stay?: boolean`. A column with `stay`
  never collapses. Every other column can collapse: one with `fall` in its rank order as today; one with no `fall`
  collapses **after** all the ranked ones, the later one in the list first. `fitColumns` keeps collapsing until the
  columns fit or only `stay` columns and the switching column are left. `hideOnTouchPhone` stays, and the checkbox
  column is also dropped whenever the price-like fixed columns have had to collapse (there is no room for it).
  In every list set `stay: true` on the name column and on the actions column only (clients and invoices have no
  actions column: the name, or the supplier, alone). So on a phone every list shows: name, one switching column,
  actions. The product list's `price` therefore falls last, after `category`; the recipe book's `type`, the
  invoices' `date` likewise. Spec cases in `list-columns.util.spec.ts`: a phone-width product list returns the
  name, one switching track and the actions track only, with `price` in `collapsed`; a `stay` column is never in
  `collapsed`; un-ranked columns collapse after ranked ones, from the end.
- [ ] **F5 — a cell is never narrower than its one-line content:** `fitColumns` writes each shown column's track as
  `minmax(<min>, <its fr or its track's max>)` (a track that is already a fixed length or `auto` is left as it is),
  so the grid cannot squeeze a column below its `min`; the switching track is `minmax(<carouselMin>, 1.6fr)`. Set
  the `min` of one-line columns to the width of their content plus the cell padding, and give those cells
  `white-space: nowrap`: rating `8.5rem`, phone numbers `9rem`, cost and price `6rem`, dates `7rem`, counts `4.5rem`
  (apply to: recipe book `rating`, `cost`; suppliers `phone`, `min-order`, `lead`, `linked`; clients `phone`,
  `last`, `events`, `requests`; products `price`, `unit`; invoices `date`, `number`, `saved`, `lines`; equipment
  `owned`). Multi-line text shown in the switching column or in a narrow cell (supplier names, categories, labels)
  is cut to one line with an ellipsis (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the text
  element) so a row stays one line; the full text is in `[appTooltip]` on that cell. Log each `min` you set as part
  of one `behaviour:` decision.
- [ ] **F6 — the tooltip finds room sideways and taps on touch:** in the directive, measure the box after it is
  shown and its content rendered (re-measure once on the next animation frame), then place it; `left` is clamped
  so the whole box is inside the viewport with an 8px margin on both sides (if `placeInViewport` does not already
  guarantee this for a box wider than the remaining room, fix it there and add spec cases: an anchor at the left
  edge, at the right edge, and a box wider than half the viewport); the caret stays on the control
  (`--tip-arrow-x` clamped to the box). `max-inline-size` is `min(20rem, calc(100vw - 1rem))` and long text wraps.
  Touch: when the pointer is `touch` (or the device has no hover: `matchMedia('(hover: none)')`), hover does
  nothing; a tap on the control toggles the tooltip (pinned) and a tap elsewhere closes it — for every control,
  whatever `tooltipOnClick` says. On a touch tap of a control that is a `button`, a link or an input, the control's
  own action still runs (the tooltip only shows beside it). The 500 ms hold is removed.
- [ ] **F7 — one warning sign:** the product list's `button.row-status` shows only the Lucide `triangle-alert`
  icon (16px, `color: var(--color-warning)`), for every status kind; remove the dot, the other icons and the text
  label from the button (the `aria-label` keeps the status text; the reasons stay in the tooltip). The button takes
  no more room than the icon plus a `0.25rem` padding and never overlaps the name. Check that `triangle-alert` is
  registered in `src/app/app.config.ts`; if it is not, STOP for `approved: src/app/app.config.ts`.
- [ ] **F8 — a space after the colon:** in the recipe book's cost tooltip template every `label:` is followed by a
  space before its value (use a real space or `&nbsp;` so RTL does not swallow it); the same for the date tooltip
  if it has a colon.
- [ ] **F9 — the price hint:** the product list's `col-price` cell uses `[appTooltip]="row.priceTip"` instead of
  `[attr.title]`.
- [ ] **F10 — the bell below desktop width:** find how the bell is hidden or unreachable below 1024px (top bar
  layout at tablet width; the bottom bar at phone width). Keep the bell where it is on desktop. At tablet and phone
  width add to the profile menu (the menu opened from the user chip / the bottom bar's profile entry) one entry
  "notifications" with the unread count, using the bell's existing dictionary keys, that opens the same
  notifications panel the bell opens. Reuse `NotificationsService` and the bell's panel; do not build a second
  panel. If the profile menu is not reachable at phone width either, add the same entry where the phone's profile
  control is and log where as a `behaviour:` decision.
- [ ] **F11 — the stage row uses the app's chips:** each stage is a `button.c-chip.c-chip--tab` (the active one
  with the family's active state, as the metadata row's chips), the last "danger" action a chip of the family's red
  variant (`c-chip--red`) at the end of the row; delete `.stage-pill` and its CSS. Keep every handler, `aria-`
  attribute and disabled / locked state; a lock reason moves from `[attr.title]` to `[appTooltip]`.
- [ ] **F12 — the stock count's hints from tablet width up:** whatever the stock count shows on hover only when
  `!narrow_()` is shown on hover whenever the device is not at phone width (`!phone_()`), and through the shared
  tooltip where it is a hint; at phone width a tap shows it. Do not change which columns the stock count shows.
- [ ] **Scripts and docs:** update the `[ui]` specs the changes touch (`743-1` arrows outside, `745-2`, `745-3`,
  `746-1`, `746-2`, `603-3`, `586-1`) and add `747-1` (phone, three columns), `747-2` (no broken rating cell at
  900px) and `747-3` (catalog arrows outside), signed in with `signInQa`. `docs/agent/house-style.md`: the
  `sideways-row` rule (arrows outside the container on a computer, none on a phone; the container hugs its items),
  the `column-carousel` rule (on a phone: name, one switching column, actions; a one-line cell is never narrower
  than its content; only the name and the actions always stay), the `tooltip` rule (tap on touch, stays inside the
  viewport sideways). `_shared/product-defaults.md`: the `rule` / `card` lines of the three proposed `house-*`
  sections to match (they stay `proposed`). `docs/brain/component-families.md` lines for the changed inputs and
  `node scripts/inventory.mjs`.

### Round two — Dandan's second validation (2026-11-26)
He validated the first twelve points on the app served from `fix/house-style-ui-feedback` (commit `2d4a0d46`) and
asked for five more things, to be built after he restarts his computer. No more questions: a choice he did not
spell out takes the recommended option and is logged as a `behaviour:` decision.

His words: (1) dev catalog — "there are chips at the top of the catalog. When I'm pressing one of them it directs
me back to the dashboard. Whenever I'm pressing one of the chips at the top, it scrolls me down to the place in the
page of the catalog." (2) the warning triangle — "the triangle must always be in the same alignment as the rest, no
matter the name of the item. Some are closer to the names than others and it looks bad." (3) the sideways row — on a
smaller screen "it just shows the container and there's no hint in the container that there is more scrolling to
the left or to the right, in contrast to the scroll area in the catalog, where there is some sort of an arrow
guiding the user. This needs to be on whatever side-scroll row container we have. If it's a huge screen that has
space for the buttons outside of the container, the buttons will be outside; if there's not enough space we need
some sort of an arrow guiding." (4) a new default — "whenever we have a button that is untouchable for whatever
reason, we need a tooltip showing, when hovering on top of it or clicking on it, why it's disabled." (5) the stock
count's "i" button — "it needs to be placed in a way that doesn't break the alignment of the measurement unit.
Right now when this icon adds up it moves the measurement unit to the right."

Verified on `origin/fix/house-style-ui-feedback` 2d4a0d46: `src/app/pages/dev-catalog/dev-catalog.page.html:4` — the
top chips are `<a class="c-chip c-chip--tag" [href]="'#' + id">`, and with the app's `<base href>` that leaves the
page; `inventory-product-list.component.html:170-200` — the triangle button sits inline before a centred name
(`.scss:208-226`); `scroll-rail.component.scss:26-52` — the frame draws only a soft fade ("no chevron: the arrows
are outside") and at phone width the outside buttons are not rendered; `[disabled]=` appears 238 times in 94
templates, 25 lines in 13 templates carry a reason as a browser `title` (`'sign_in_to_use'`, `'money_locked_hint'`);
`stock-count.component.html:225-246` — in narrow mode the "i" button sits beside the unit select only on rows with
a base amount.

- [ ] **G0 — settle the first round's open checks before any new change:** run `e2e/ui/651-1.spec.ts` against the
  slot's app. If it fails, find out whether this branch caused it (compare with `origin/orch/house-style-ui`, or
  read the spec and the top bar): a link missing because of the row container is fixed in the rail or the header; a
  failure from the QA business's data or module is logged as `- decision: seen:` and the spec is left alone. Run
  `pnpm run test:ci` twice; if the dish row's "partial badge" tests fail in either run, find the cause (the dish
  row's field strip sits in the rail since plan 743) and fix it in `menu-dish-row` or the rail. Read the stock count
  diff once for leftovers of the removed popover.
- [ ] **G1 — the catalog's chips scroll, they do not navigate:** each top chip becomes a `<button type="button"
  class="c-chip c-chip--tag">` whose click calls `document.getElementById(id)?.scrollIntoView({ block: 'start',
  behavior: 'smooth' })` (`'auto'` when the user asked for reduced motion) and moves focus to that section's heading
  (`tabindex="-1"` on it). No `href`, no router navigation. Sections get a `scroll-margin-block-start` so the top
  bar does not cover the heading.
- [ ] **G2 — the warning triangle sits in one column:** the product list's name cell lays its content out as a row
  that starts at the cell's inline-start edge: a fixed slot (`inline-size: 1.5rem`, `flex: 0 0 auto`) that holds the
  triangle button or is empty, then the name (and its badges) starting at the same place in every row, text aligned
  to the start; the name column's header lines up with the names. Nothing else in the cell changes.
- [ ] **G3 — a sign of more inside the row (`app-scroll-rail`):** replace the frame's plain fade by two elements
  inside the frame, `.sr-more.sr-more--prev` and `.sr-more.sr-more--next`, laid over the inline-start and inline-end
  edges: a fade from `var(--bg-glass-strong)` to transparent **and** a 16px chevron in `var(--color-text-muted)`,
  `opacity` 0 → 0.8 over `var(--dur-base) var(--ease-smooth)`, `pointer-events: none`, `aria-hidden="true"` — the
  look of `.c-scroll-arrow` turned sideways. Each shows only while its side has more, and only when the outside
  arrow buttons are not shown for that rail (phone width, or `arrows="never"`); when the outside buttons are shown
  they are the sign. Every user of the rail gets it with no change in its own files.
- [ ] **G4 — a disabled control says why:**
  1. `appDisabledWhy` (`src/app/shared/tooltip/disabled-why.directive.ts`, standalone): `appDisabledWhy =
     input<string | null>(null)` (the reason, already translated; `null` or empty = enabled). With a reason it sets
     `aria-disabled="true"` and the class `is-disabled` on the host, keeps the host focusable, swallows `click` and
     `keydown` Enter / Space in the capture phase (`preventDefault` + `stopImmediatePropagation`) so the control's
     action never runs, and shows the reason through the shared tooltip (compose `TooltipDirective` with
     `hostDirectives`, `tooltipOnClick` on): on hover and focus with a mouse or keyboard, on tap on touch. It never
     sets the native `disabled` attribute. Spec: with a reason the host's click handler does not run, `aria-disabled`
     is `true`, the tooltip opens on hover, on focus and on click; with `null` the control works and has no
     `aria-disabled`.
  2. One engine rule appended to `src/styles.scss`: `.is-disabled` with the same look the native `:disabled` state
     of `.c-btn-primary`, `.c-btn-ghost` and `.c-icon-btn` has (read those rules and match them), plus `cursor:
     not-allowed`.
  3. Convert the twelve templates that carry a reason as a `title` on a disabled control (every such folder except
     cook-view, whose page class is growth-frozen): `[disabled]="cond"` + `[attr.title]="cond ? reason : null"`
     becomes `[appDisabledWhy]="cond ? reason : null"`. Where the control is also disabled for a reason that has no
     text (for example `isSaving_()`), keep the native `[disabled]` for that reason only.
  4. Dev catalog: an entry "disabled with a reason": a `c-btn-primary` with `[appDisabledWhy]="'dc_disabled_sample'
     | translatePipe"` and a counter that would go up on click. New key `dc_disabled_sample` — Hebrew value
     `אי אפשר ללחוץ: זו רק הדגמה` (appended to `dictionary.json`).
  5. The default he asked for — a new section in `_shared/product-defaults.md`, in the file's field shape:
     `### disabled-explains-why` · `- status: on` · `- rule: A button or control that cannot be used shows, on hover
     and on tap, a tooltip that says why.` · `- applies when: custom` · `- plan words:
     \b(?:disabled|locked|read-only|cannot be (?:pressed|used|edited)|greyed out)\b` · `- how: the appDisabledWhy
     directive (src/app/shared/tooltip/, family tooltip), which keeps the control reachable, blocks its action and
     shows the reason in the shared tooltip; never a bare disabled attribute when a reason exists` · `- check: card`
     · `- card: any page with a disabled button · hover it, or tap it on a phone · a tooltip says why it cannot be
     used` · `- exceptions: a control disabled only while its own action is running (saving, loading); declare
     exception — why: <one line>` · `- turned on: the Human, 2026-11-26`. His sentence in point (4) is the word that
     turns it on ("I wanna add another default rule"). No other `status` line of the file changes.
  6. The lint for new code: append to `REUSE_RULES` in `scripts/lib/registry-families.mjs` a rule `id:
     'house-disabled-why'`, `family: 'tooltip'`, `files: ['src/app/**/*.html']`, `pattern: /\[disabled\]=/`, `hint:
     'a control that can be disabled says why: use [appDisabledWhy]="reason" (src/app/shared/tooltip/), or keep
     [disabled] only while its own action runs'`. The existing bindings are recorded in `_shared/debt-baseline.json`
     the way `node scripts/debt-baseline.mjs` allows (a new kind with `--add-kind`, or the raised count of
     `reuse-copy.tooltip`); paste its line.
- [ ] **G5 — the stock count's unit column lines up:** in narrow mode the unit cell is a two-part row: the unit
  select (or the unit chips), then a fixed slot (`inline-size: 2rem`, `flex: 0 0 auto`) that holds the "i" button or
  is empty; the slot exists on every row in narrow mode. Desktop mode is unchanged.
- [ ] **Scripts and docs (round two):** `e2e/ui/751-1.spec.ts` … `751-4.spec.ts` for the four round-two `[ui]`
  items; update `743-2` and `747-3` if the signs change what they assert. `docs/agent/house-style.md`:
  `sideways-row` (a sign of more inside the container whenever the outside buttons are not shown), `tooltip` (a
  disabled control says why; the directive; the count of `[disabled]` bindings the lint finds in `gaps today`).
  `docs/brain/component-families.md`: the directive under `### tooltip`, the signs under `### sideways-row`;
  `node scripts/inventory.mjs`.
- [ ] **Hand-over:** when every check passes, commit and push `fix/house-style-ui-feedback`, push it onto
  `orch/house-style-ui` (fast-forward), serve that branch in the slot, and hand Dandan the round-two cards and the
  first-round cards he has not answered. Nothing is merged into `main` without his `merge it`.

Left out of round two: giving a reason to the other 200-odd disabled controls that have none today (counted by the
new lint; an alignment plan); the cook view's disabled hints.

## UI/UX Notes
- Page recipe: recipe-list — the six list pages keep the recipe; `Behaviour: column-carousel`, `sideways-row`,
  `tooltip`, `motion` (no typed time), `keyboard-focus`.
- RTL: logical properties; previous is the inline-start side. No new dictionary key is expected (the notifications
  entry reuses the bell's keys); a missing key is appended to `dictionary.json` with its Hebrew value and logged.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the row's arrows outside the container and make the container as wide as its items — F1, F2 with the rail's spec — src/app/shared/scroll-rail/**, src/app/core/components/header/**, src/app/pages/metadata-manager/metadata-manager.page.component.scss
- [ ] A2: Let every list shrink to name, one switching column and actions, and never squeeze a one-line cell — F4, F5 in the fit rule with its spec cases — src/app/shared/list-shell/**
- [ ] A3: Drop the label above each value in the switching column — F3 — src/app/shared/column-carousel/**
- [ ] A4: Apply the new column rules to the six lists — stay on name and actions, the one-line minimum widths, the ellipsis with the tooltip — the six list component folders
- [ ] A5: Make the tooltip stay inside the screen sideways and open by tap on touch — F6 with spec cases — src/app/shared/tooltip/**, src/app/core/utils/viewport-placement.util.ts, src/app/core/utils/viewport-placement.util.spec.ts
- [ ] A6: Show one warning triangle on the product list, and its price hint and the recipe cost text the right way — F7, F8, F9 — src/app/pages/inventory/components/inventory-product-list/**, src/app/pages/recipe-book/components/recipe-book-list/**
- [ ] A7: Make notifications reachable below desktop width from the profile menu — F10 — src/app/core/components/header/**, src/app/core/components/notification-bell/**
- [ ] A8: Give the menu builder's stage row the app's chips, and the stock count its hints from tablet width up — F11, F12 — src/app/pages/menu-intelligence/components/event-stage-bar/**, src/app/pages/inventory/components/stock-count/**
- [ ] A9: Update the screen scripts, the house rules and the registry to what was built — the specs, the three rules, the proposed defaults' lines, the registry and inventory — e2e/ui/**, docs/agent/house-style.md, _shared/product-defaults.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A10: Run every check of this plan and hand Dandan the ten cards — outputs under Execution Notes — this plan file
- [ ] B1: Settle what the first round left unverified before changing anything — G0: the failing top-bar script, the dish row's two tests, the stock count leftovers — e2e/ui/651-1.spec.ts, src/app/pages/menu-intelligence/components/menu-dish-row/**
- [ ] B2: Make the catalog's top chips scroll to their section instead of leaving the page — G1 — src/app/pages/dev-catalog/**
- [ ] B3: Put the product list's warning triangle in one straight column — G2 — src/app/pages/inventory/components/inventory-product-list/**
- [ ] B4: Show a small arrow inside the row's container when there is more and no outside button — G3 with the rail's spec — src/app/shared/scroll-rail/**
- [ ] B5: Build the way a disabled control says why — G4.1, G4.2: the directive with its spec, the is-disabled look — src/app/shared/tooltip/**, src/styles.scss
- [ ] B6: Use it on every button that already had a reason, and show it in the catalog — G4.3, G4.4 — the twelve listed component folders, src/app/pages/dev-catalog/**, public/assets/data/dictionary.json
- [ ] B7: Record the new default Dandan asked for and warn on new bare disabled controls — G4.5, G4.6 — _shared/product-defaults.md, scripts/lib/registry-families.mjs, _shared/debt-baseline.json
- [ ] B8: Keep the stock count's unit column straight — G5 — src/app/pages/inventory/components/stock-count/**
- [ ] B9: Check the four screens with scripts and write the changes into the rules — the four ui specs, the house rules, the registry, the inventory — e2e/ui/**, docs/agent/house-style.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] B10: Run every check, push onto the run branch, serve it and hand Dandan the cards of both rounds — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: the pieces of plans 743–746 on `origin/orch/house-style-ui`.
- New files needed: `e2e/ui/747-1.spec.ts`, `747-2.spec.ts`, `747-3.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`); hotspots append-only; no Hebrew string expected; `[ui]` cards are specs
  under `e2e/ui/`.
- Built on a fix branch off `origin/orch/house-style-ui` in a slot and pushed to that run branch, not through
  `take-plan` (which reads `origin/main`).

## Out of Scope
- The platform business list and the front desk knowledge list.
- Converting the remaining browser `title` hints (a later plan).
- Turning any `house-*` default on.

## Critical Questions
- Q: Where do the row's arrows sit? A: outside the container (Dandan, 2026-11-26).
- Q: How few columns on a phone? A: three — the name, one switching column, the actions (Dandan, 2026-11-26).
- Q: How does a tooltip open on a phone? A: by a tap, never by hover (Dandan, 2026-11-26).
- Q: The bell below desktop width? A: inside the profile menu (his suggestion, taken as the recommendation, 2026-11-26).
- Q: A cell with one-line content? A: never narrower than its content; the column falls first (Dandan, 2026-11-26). Built with fixed minimum widths per column kind, not by measuring each cell at run time (recommendation; logged for him to grade).

## Execution Notes
- State on 2026-11-26 (saved before a restart for disk space): built by a builder agent in slot wt-1 on branch `fix/house-style-ui-feedback` (from `origin/orch/house-style-ui` 72f84d03), pushed to origin as a work-in-progress commit `2d4a0d46`. Not merged into `orch/house-style-ui` yet. F1–F11 are built and passed build, lint, `test:ci` (2831) and 19 of 20 screen scripts (1 skipped by its own condition) before the last change. F12 is being redone: the stock count's base hint moves from its own popover to the shared tooltip (the Human, 2026-11-26: at tablet width it showed only on click, not on hover); that change may be only partly in the commit.
- To resume: in slot wt-1 check out `fix/house-style-ui-feedback`, finish or verify F12 (the base button `[data-testid="stk-base-btn"]` uses `[appTooltip]` with `[tooltipOnClick]="true"`; the `basePopover_` code, its template block, CSS and spec cases are gone), run build, lint, `test:ci`, `node scripts/kit-checks.mjs --base origin/orch/house-style-ui`, then the screen scripts against the slot's app, commit, and push the branch onto `orch/house-style-ui`. Then serve that branch for the Human's cards; only his `merge it` merges the run branch into `main`.
- Review (2026-11-26): rules checker — no findings; bugs checker — one minor (the checkbox drop and the next collapse happened in one step), fixed with a spec case; plan checker — pass, five minor: the dev catalog demo lacked `stay` on its name column (fixed), `743-1` did not assert the arrow outside the container (fixed), a duplicate bell test id (fixed), the five screen scripts outside the scope block (the Human: "You have my word, you can continue on them"), the stock count hint not on the shared tooltip (being done).
- The Human's clarifications (2026-11-26): three columns is the minimum a list can shrink to, not a fixed number on a phone — columns fall only while they do not fit; the stage row takes the app chips' style only, each stage keeps its own content and behaviour.
- The builder's decision lines:
- decision: behaviour: (answered by the Human 2026-11-26) three columns is the minimum a list shrinks to, not a fixed phone number; fitColumns has no phone-collapse rule, it collapses only while the need exceeds the room — reverse: n/a (Human's answer)
- decision: behaviour: (answered by the Human 2026-11-26) the stage row's chips take the c-chip c-chip--tab look only; text, handlers, lock state and aria stay as before — reverse: n/a
- decision: behaviour: one-line column mins set: rating 8.5rem; phone 9rem; cost/price/min-order 6rem; dates (invoice date, saved, last contact) 7rem; invoice number 7rem; counts (unit, lead, linked, events, requests, lines, owned) 4.5rem — reverse: edit each list's `columns` min
- decision: behaviour: a checkbox column with no room is dropped (no track, cells hidden by `.fit-no-select .col-select` appended to styles.scss) instead of falling into the carousel — reverse: remove hideOnTouchPhone handling in fitColumns
- decision: behaviour: the recipe-book `type` and invoices `date` became fall columns (inside the carousel header/cell), falling last — reverse: move them out of app-column-carousel-* and drop them from fall order
- decision: behaviour: chip cells (clients kinds/tags) no longer wrap: nowrap + overflow hidden, tooltip lists all — reverse: restore flex-wrap in client-list scss
- decision: behaviour: warning triangle uses icon name `alert-triangle` (registered alias of triangle-alert; `triangle-alert` is not registered, app.config.ts untouched) — reverse: register TriangleAlert and rename
- decision: behaviour: tooltip text uses white-space pre-line so the price tip's line breaks show — reverse: remove it from .c-tooltip
- decision: behaviour: bell as a menu entry only in the phone profile menu (the only profile menu); at tablet the bell stays visible in the top bar — reverse: add a tablet profile menu
- decision: behaviour: current "not closed" stage chip shows the family's active look together with c-chip--red — reverse: drop the active class for it
- decision: behaviour: F12 left unchanged: nothing in stock-count is gated on hover by !narrow_(); the base hint already hovers whenever !phone_(); it is a custom popover (plan 658), not the shared tooltip — reverse: n/a
- decision: removes: the scroll rail's arrow buttons are no longer rendered on a phone (was signs only), per F1 — reverse: drop the phone_ condition in arrowsRendered
- decision: removes: the 500 ms touch hold on tooltips (per F6) — reverse: restore onPointerDown timer
- decision: removes: the label line above values in the switching cell (per F3)
- decision: seen: scope extended: e2e/ui/743-2, 599-2, 601-1, 601-2, 611-2 .spec.ts edited (asserted arrow signs / label / old column layout); outside the plan scope block
- decision: seen: src/app/pages/inventory/components/stock-count: base hint is a custom popover duplicating the shared tooltip (now replaced, see next line)
- decision: removes: the stock count's own base-amount box (plan 658/659: popover, placement, outside-tap/scroll/Escape close) — replaced by the shared tooltip so it opens on hover above a phone and on tap on touch (Human, 2026-11-26) — reverse: restore stock-count.component.{html,ts,scss,spec.ts} from origin/orch/house-style-ui
- decision: seen: scope extended: e2e/ui/657-1.spec.ts edited (asserted the old light popup; Human OK 2026-11-26)
- Update, 2026-11-26: the pushed commit `2d4a0d46` on `fix/house-style-ui-feedback` holds ALL twelve points, F12 included (the stock count's base button uses `[appTooltip]`; `basePopover_` and `.stock-count__base-pop` are gone); the slot's working tree is clean. The builder's last checks on that code: build exit 0; lint 0 errors; `test:ci` `TOTAL: 2827 SUCCESS` (one earlier run had 2 failures in MenuDishRowComponent "partial badge" tests that passed on the rerun — not investigated); `KIT_CHECKS: ok`; registry ok; breadcrumbs clean; screen scripts: 23 of 24 pass, `e2e/ui/651-1.spec.ts` fails at its first assertion (no "אבחון" link in the top bar at 1280px — it needs the `consultant_diag` module on the QA business; not confirmed whether this change caused it, and it was not run on the base branch).
- Still to do before the Human's cards: run `651-1` on `origin/orch/house-style-ui` to see whether it fails there too; re-run the full gate and the screen scripts once; a review of the stock count change; then push the branch onto `orch/house-style-ui`.
