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
- INV-3: preserves — the metadata manager page's stylesheet changes only how its chip row sits beside the rail's arrows; no rename, save or cascading write is touched.
- INV-6: preserves — the scope matches the invariant's `*ai*` glob only by the folder name `scroll-rail`; no AI call, key or route is touched.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class: the plan changes the pieces plans 743–746 built (the rail, `fitColumns`, the fall-column rendering, `appTooltip`) and moves three more hints and one chip row onto existing families (`tooltip`, `chip`).

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
