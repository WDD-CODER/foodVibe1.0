# Plan 720 — Every popup centred on every screen, with a body that scrolls

Status: draft
Depends-on: none
Track: code
Snapshot: dcf66fec99ebb6efcd85fa8228fb9b2fc42fb0f9

## Problem Statement
The Human (2026-11-24, in meaning): "Don't use modals from the bottom. A modal is always centred on the screen! And
ALL modals must be scrollable, because on a tablet the modal is too large and the user can't see the content
correctly." Today the shared popup frame does two things wrong:

1. **Bottom sheets.** `app-modal-shell [sheet]="true"` turns a popup into a bottom sheet on phones (plan 487); 19
   popups in 17 templates ask for it (bookings, requests, clients, knowledge, inbox, equipment, menu editor).
2. **No height limit above the phone width.** `.c-modal-card` has `max-height` and `overflow-y: auto` only under
   `$break-phone-max` (767 px). From 768 px up, a tall popup is taller than the window, the overlay is a centred
   flex box that does not scroll, so the **top and the bottom are cut off and cannot be reached**. On a phone the card
   scrolls as one piece, so the save buttons scroll away with the content.

This plan fixes both in the shared frame: every `app-modal-shell` popup is centred at every width, never taller than
the window (safe areas, the on-screen keyboard and `dvh` included), its title and its action row stay in place and
its `.c-modal-body` scrolls. The `sheet` input is removed together with its 19 bindings, and a guard test fails on a
new bottom-sheet rule or a popup card that turns its scrolling off. Plan 721 converts the pieces that draw their own
panel (the floor editor's phone panel, the missing-prices box, the menu export sheet, the export preview).

Verified on `chore/restaurant-staging` (`dcf66fec`, 2026-11-24), measured in the browser at `http://localhost:4202`
(signed in as `demo_host`):
- Engine `.c-modal-overlay` `src/styles.scss:674-683` (fixed, `inset: 0`, flex, `align-items: center`); `.c-modal-card`
  `:698-715` (`width: 90%`, `max-width: 28rem`, `padding: 2rem`, no height limit, no overflow); `--md` `:717`,
  `--fluid` `:721`; `.c-modal-actions` `:727`; `.c-modal-body` `:742` (no height limit, no overflow).
- Phone only: `@media (max-width: $break-phone-max)` `:815-823` gives `.c-modal-card` `max-height: calc(100dvh - 4rem)`
  and `overflow-y: auto`; keyboard: `body.kb-open .c-modal-card` `:2074-2076` (`max-height: calc(100dvh - 4rem -
  var(--kb-inset, 0px))`).
- Bottom sheet helpers inside the phone `@media` that starts at `:1798`: `.m-sheet { align-items: flex-end !important }`
  `:1855-1857` and `.m-sheet-card` `:1859-1869` (full width, `max-height: 86dvh`, only the top corners rounded).
- A second, dead bottom sheet: `.inline-edit-panel.as-modal` phone rule `src/styles.scss:1429-1446` (pinned to the
  bottom, top corners rounded). No template or component sets `as-modal` any more (plan 711 moved the equipment panel
  onto `app-modal-shell`; `grep -rn as-modal src/app` → no match).
- `app-modal-shell` `src/app/shared/modal-shell/modal-shell.component.ts:72-73` (`readonly sheet = input(false)`),
  `.html:4` `[class.m-sheet]="sheet()"`, `.html:15` `[class.m-sheet-card]="sheet()"`; spec
  `modal-shell.component.spec.ts:108-116` tests the helpers; `pricing-meter.component.spec.ts:280-290` finds the card by
  `.m-sheet-card`.
- The 19 `[sheet]="true"` bindings: `pages/bookings/components/new-booking-dialog/new-booking-dialog.component.html:4`,
  `table-sheet/table-sheet.component.html:1`, `waitlist-drawer/waitlist-drawer.component.html:1`,
  `walk-in-dialog/walk-in-dialog.component.html:4`; `pages/clients/components/client-list/client-list.component.html:265`,
  `client-profile/client-profile.component.html:234,248,261`; `pages/equipment/components/equipment-list/equipment-list.component.html:181`;
  `pages/frontdesk/knowledge/knowledge.page.html:157,238`; `pages/inbox/components/fix-answer-dialog/fix-answer-dialog.component.html:4`;
  `pages/menu-intelligence/components/prep-sheets/prep-sheets.component.html:1`, `pricing-meter/pricing-meter.component.html:21`,
  `supplier-orders/supplier-orders.component.html:1`; `pages/requests/components/approve-table-dialog/approve-table-dialog.component.html:1`,
  `ask-dialog/ask-dialog.component.html:1`, `decline-dialog/decline-dialog.component.html:1`,
  `new-request-dialog/new-request-dialog.component.html:4`; `shared/new-inquiry-dialog/new-inquiry-dialog.component.html:5`
  (all paths under `src/app/`).
- Measured, engine card with a tall body (40 lines), `md` size: at 1024×768 the card runs from y = −420 to 1188 and at
  768×1024 from −406 to 1430 (`max-height: none`, `overflow-y: visible`) — title and buttons out of reach. At 390×844
  it scrolls but the action row sits at y = 1708 (scrolls away). With `.m-sheet` at 390×844 the card is pinned to the
  bottom (`align-items: flex-end`, top 118, bottom 844).
- Measured, a real popup: `/bookings` → "הזמנה חדשה" (`app-new-booking-dialog`) at 1024×768: card 1108 px tall, top at
  y = −170, bottom at 938; at 768×1024: top −113, bottom 1137; at 1024×600: top −254. The heading and the save button
  cannot be reached.
- Of the 45 `app-modal-shell` uses, 25 put a `.c-modal-body` straight inside the card (title, body, actions); the rest
  project a component or their own wrapper (`app-client-form`, `.wl`, `.tsh`, `.fx`, `.fda-body`, `.ga-body`,
  `.loading-list`, `.terms-body`, the AI modals' own cards). Cards with their own height rules through `cardClass`
  (`:host ::ng-deep`): `prep-sheets` (`prep-sheets.component.scss:5-22`, 100 dvh on phone), `so-sheet`
  (`supplier-orders.component.scss:5-13`, 90 dvh), `closing-card` (`event-closing-dialog.component.scss:6-23`, 92 dvh,
  `overflow: hidden`, its list scrolls at `:69`), `paste-ingredients-card` (90 dvh), `ai-menu-modal-card` (88 dvh),
  `ai-product-modal-card` (85 dvh), `ai-recipe-modal-card` (90 dvh), `quick-edit-product-modal` (`overflow: hidden`, its
  panel scrolls at `quick-edit-product-panel.component.scss:17-20`).
- Breakpoints: `src/app/core/styles/_breakpoints.scss` (`$break-phone-max` 767, `$break-tablet-min` 768,
  `$break-tablet-max` 1023, `$break-desktop-min` 1024), the same in `src/app/core/utils/breakpoints.ts`
  (`@utils/breakpoints`) and at the top of `src/styles.scss`.
- `src/styles.scss` ends with the plan 703 block (marker `/* ==== Plan 703 — style unification pieces ==== */`, `:2949`)
  and later appends; `scripts/test/style-703.test.mjs` proves the text above that marker never changes.
- `parseStylesheet(text)` in `scripts/styleqa/static-checks.mjs:70` returns blocks and declarations with line numbers
  and the prelude stack; `pnpm run test:scripts` runs `node --test scripts/test/*.test.mjs`; Karma loads
  `src/styles.scss` (`angular.json` test `styles`), so a spec can measure the engine.
- No product default about popups yet; `anchored-popup` covers small boxes beside a control (not popups).

## Goals & Success Criteria
**Primary:** every `app-modal-shell` popup opens in the middle of the window at every width, is never taller than
the window, keeps its title and action row in view, and scrolls its body; nothing in the shared frame can make a
bottom sheet any more.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/modal-guard.test.mjs` (fixtures inline): `modalFindings` reports `bottom-sheet` for a block with `.m-sheet` in its prelude, for `align-items: flex-end` (and `end`) in a block whose selector contains `overlay`, `backdrop`, `sheet` or `modal`, for a block with `border-end-start-radius: 0` + `border-end-end-radius: 0` and a non-zero `border-start-start-radius`, for `position: fixed` + `inset-block-end` (or `bottom`) + a non-zero start radius, and for `inset-block: auto <length>` together with `inset-inline`; `top-sheet` for `position: fixed` + `inset-block-start: 0` + `inset-inline: 0` + end radii with no start radii; `sheet-binding` for `[sheet]="true"` and `class="m-sheet"` in a template; `modal-no-scroll` for `overflow: hidden`, `overflow-y: visible` or `max-block-size: none` in a block whose selector names `.c-modal-card`, `.c-modal-body` or a `cardClass` value found in the scanned templates; nothing inside `@media print`; an `allow` entry `{ rule, file, selector, why }` removes the matching finding and an entry without `why` throws.
- [auto] `scripts/test/style-720.test.mjs`: (1) `modalFindings` over every `.scss` under `src/` and every `.html` under `src/app/` returns only the entries of its allow list, and each allow entry still matches a finding (a fixed one must leave the list); (2) the block below `/* ==== Plan 720 — centred popups that scroll ==== */` in `src/styles.scss` gives `.c-modal-overlay` `align-items: center`, gives `.c-modal-card` `display: flex`, `flex-direction: column`, `overflow-y: auto` and a `max-block-size` whose value contains `dvh`, `safe-area-inset-top`, `safe-area-inset-bottom` and `--kb-inset`, and gives `.c-modal-card > .c-modal-body` `min-block-size: 0` and `overflow-y: auto`; (3) no file under `src/app` contains `m-sheet` or `as-modal`, and `modal-shell.component.ts` has no `sheet` input; (4) the text of `src/styles.scss` above the plan 720 marker equals the base file's text above it (base as in `style-703.test.mjs`: `origin/orch/rs-style`, then `origin/main`; skipped with a printed reason when neither exists).
- [auto] `pnpm run test:ci` passes, including `src/app/shared/modal-shell/modal-shell.component.spec.ts`: the old "sheet=true" case is replaced by "never a bottom sheet" (no `m-sheet` / `m-sheet-card` class; the overlay's computed `align-items` is `center`); a new case renders a heading, a `.c-modal-body` of 60 lines and a `.c-modal-actions` row and checks, in the Karma window, that the card's top ≥ 0 and bottom ≤ `window.innerHeight`, the action row's bottom ≤ `window.innerHeight`, the heading's top ≥ 0, and the body's `scrollHeight > clientHeight` with computed `overflow-y: auto`; a third case puts the same 60 lines in a plain `<div>` (no `.c-modal-body`) and checks the card itself scrolls (`scrollHeight > clientHeight`) and stays inside the window. `pricing-meter.component.spec.ts` "phone sheet" cases find the card by `app-modal-shell .c-modal-card` and still pass.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] the booking popup on a tablet · window 1024×768, `/bookings` → press "הזמנה חדשה" · the popup opens in the middle of the screen, its title is at the top of the popup and the save button is visible without scrolling the page; the form between them scrolls
- [human] the same popup standing up · window 768×1024, `/bookings` → "הזמנה חדשה" · the popup is in the middle, nothing is cut off at the top or the bottom, the form scrolls
- [human] a popup that used to slide up on a phone · window 390×844, `/requests` → open a request → "דחייה" (decline) · the popup opens in the middle with all four corners rounded, not stuck to the bottom of the screen
- [human] a short popup on a laptop · `/clients` → "הוסף לקוח חדש" · it looks as before: centred, no scroll bar
- [human] the waiting list on a phone · window 390×844, `/bookings` → "רשימת המתנה" · it opens in the middle of the screen, not from the bottom, and its rows scroll inside it

## Execution Mode
- Parallel: yes — no open plan writes `src/app/shared/modal-shell/**`; `src/styles.scss` is append-only (own marker).
- Concurrent plans: any plan that does not write the 17 templates listed in the scope. Plan 721 runs after this one.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
src/app/shared/modal-shell/modal-shell.component.ts
src/app/shared/modal-shell/modal-shell.component.html
src/app/shared/modal-shell/modal-shell.component.spec.ts
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.html
src/app/pages/bookings/components/table-sheet/table-sheet.component.html
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.html
src/app/pages/bookings/components/walk-in-dialog/walk-in-dialog.component.html
src/app/pages/clients/components/client-list/client-list.component.html
src/app/pages/clients/components/client-profile/client-profile.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/frontdesk/knowledge/knowledge.page.html
src/app/pages/inbox/components/fix-answer-dialog/fix-answer-dialog.component.html
src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.html
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
src/app/pages/menu-intelligence/components/supplier-orders/supplier-orders.component.html
src/app/pages/requests/components/approve-table-dialog/approve-table-dialog.component.html
src/app/pages/requests/components/ask-dialog/ask-dialog.component.html
src/app/pages/requests/components/decline-dialog/decline-dialog.component.html
src/app/pages/requests/components/new-request-dialog/new-request-dialog.component.html
src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.html
scripts/lib/modal-guard.mjs
scripts/test/modal-guard.test.mjs
scripts/test/style-720.test.mjs
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
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

- INV-6: preserves — the scope's `*ai*` paths (`waitlist-drawer`, `fix-answer-dialog`, `ask-dialog`, …) only lose a `[sheet]` attribute; no AI call, key or route changes.
- INV-none: preserves — the shared popup frame's CSS, one removed presentational input, one attribute removed from 19 templates and a Node test helper; no data, route, server, permission, schema, AI call or table-engine path is touched.

## Reuse Check

- `.c-modal-overlay`, `.c-modal-card`, `.c-modal-body`, `.c-modal-actions` (appended values: centred at every width, height limit, scrolling body, fixed head and actions) — family: modal-shell — rung: 2 — why: the engines exist and every popup already uses them; only their values change, appended under one marker because `src/styles.scss` is append-only.
- `--modal-gap`, `--modal-max-block` (tokens) — family: engine-classes — rung: 3 — why: one height limit for every popup card, read by the engine and by the cards that size themselves (plan 721).
- `app-modal-shell` without `sheet` — family: modal-shell — rung: 1 — why: the shell stays the one popup frame; an input is removed, nothing is added.
- `scripts/lib/modal-guard.mjs` (`modalFindings`) — family: none — rung: 4 — why: a test helper next to `scripts/lib/style-guard.mjs`; it reuses `parseStylesheet` from `scripts/styleqa/static-checks.mjs`. It is a separate file so the plan 704–718 tests that call `styleFindings` get no new findings.

## Adopt Check
- scripts/lib/modal-guard.mjs (modalFindings) — candidate: stylelint — considered: stylelint-declaration-strict-value, a custom stylelint plugin — verdict: build — why: about 120 lines on top of the existing `parseStylesheet`; it must read templates (`[sheet]`, `cardClass`) as well as SCSS, which stylelint does not, and the style run already chose this shape (`style-guard.mjs`, plan 703)

## Defaults

- one-breakpoint-set — applies — how: the appended rules use no width at all (one height limit for every width); the phone rule they supersede already uses `$break-phone-max`
- anchored-popup — exception — why: this plan changes popups (the centred frame), not small boxes beside a control; the one such box that is also a bottom sheet (the missing-prices box) is plan 721
- unsaved-changes-on-leave — exception — why: no form changes; the popups keep their `[hasChanges]` question as is
- confirm-destructive-action — exception — why: no action is added or changed
- empty-state-on-list — exception — why: no list is added or changed
- loading-and-error-states — exception — why: no data request is added or changed
- app-list-container — exception — why: no list is added or changed
- hints-in-tooltips — exception — why: no control or explanation text is added
- unit-dropdown-add — exception — why: no unit dropdown is added or changed
- leave-and-return — exception — why: no page sends the user to another page

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef on a kitchen tablet, I want every popup to open in the middle of the screen and fit inside it, so that I can always see its title and reach its save button.
- As a host taking a booking on a phone, I want the booking popup to look the same as on the tablet, centred, and to scroll its form, so that the buttons stay where I expect them.

## Functional Requirements

### Must Have (P0)

**Engines — appended at the end of `src/styles.scss` under `/* ==== Plan 720 — centred popups that scroll ==== */`**
(logical properties, tokens; nothing above the marker changes; outside any `@layer`, like the engines it overrides)
- [ ] `:root { --modal-gap: var(--space-4); --modal-max-block: calc(100dvh - 2 * var(--modal-gap) -
  env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--kb-inset, 0px)) }`.
- [ ] `.c-modal-overlay { align-items: center; justify-content: center; overscroll-behavior: contain }` — centred at every
  width (states the engine value again after the dead `.m-sheet` rule, so nothing can pull a card down).
- [ ] `.c-modal-card { display: flex; flex-direction: column; max-block-size: var(--modal-max-block); overflow-y: auto;
  overscroll-behavior: contain }` — every width (this supersedes the phone-only `max-height` at `:822`; same
  specificity, later in the file). `.c-modal-card > * { flex-shrink: 0 }` keeps the title, a custom head and the action
  row at their height.
- [ ] `.c-modal-card > .c-modal-body { flex: 1 1 auto; min-block-size: 0; overflow-y: auto; overscroll-behavior:
  contain }` — the body takes the room that is left and scrolls; the title (`h3`) above it and `.c-modal-actions`
  below it stay in view.
- [ ] `body.kb-open .c-modal-card { max-block-size: var(--modal-max-block) }` — the keyboard rule at `:2074` reads the
  same token (it already subtracts `--kb-inset`).
- [ ] No rule for `.m-sheet`, `.m-sheet-card` or `.inline-edit-panel.as-modal` is written: once the shell stops setting
  the first two and nothing sets the third, they have no user. They stay in the file (append-only hotspot) and the
  guard's allow list names them with that reason.

**Shared shell**
- [ ] `modal-shell.component.ts`: remove `readonly sheet = input(false)` and its doc comment (`:72-73`).
- [ ] `modal-shell.component.html`: remove `[class.m-sheet]="sheet()"` (`:4`) and `[class.m-sheet-card]="sheet()"` (`:15`).
- [ ] `modal-shell.component.spec.ts`: drop `sheet_` from the test host; replace the case at `:108-116` and add the two
  measuring cases named in Done when (heading + 60-line body + actions; 60 lines without a body). The host renders the
  shell at `size="md"`; the measure happens after `fixture.detectChanges()` and `await fixture.whenStable()`.

**The 19 bindings** — remove the attribute `[sheet]="true"` (and only it) from each line listed in the Problem
Statement. Nothing else in those templates changes.
- [ ] `pricing-meter.component.spec.ts:281`: `sheetCard` becomes `root().querySelector('app-modal-shell .c-modal-card')`;
  the describe title becomes `'pricing popup on a phone (plan 487, centred since 720)'`; its cases keep their checks.

**Guard** — `scripts/lib/modal-guard.mjs`, Node built-ins plus `parseStylesheet`; single quotes, no semicolons.
- [ ] `export function modalFindings(files, { root = process.cwd(), allow = [], cardClasses = [] } = {})` →
  `[{ file, line, rule, selector, text }]` sorted by file and line; a missing file throws. `.html` files give
  `sheet-binding` findings and add every `cardClass="…"` token of an `<app-modal-shell` to the card class set
  (together with `c-modal-card`, `c-modal-body` and the `cardClasses` option); `.scss` files give `bottom-sheet`,
  `top-sheet` and `modal-no-scroll` findings with the rules named in Done when. A block's declarations are its own
  (not its children's); a block inside `@media print` is skipped; `!important` is ignored when reading a value.
- [ ] `allow` entries `{ rule, file, selector, why }` drop findings whose rule, file and selector match exactly; a
  missing or empty `why` throws.
- [ ] `scripts/test/modal-guard.test.mjs`: one fixture per rule (positive and negative): the pricing bar
  (`position: fixed; inset-inline: 0; inset-block-end: 0` with no radius) and the header's bottom tab bar are **not**
  findings; `.c-modal-overlay[popover] { overflow: visible }` is **not** a `modal-no-scroll` finding (overlay, not card).
- [ ] `scripts/test/style-720.test.mjs` holds the allow list, each entry with its reason:
  - `bottom-sheet` · `src/styles.scss` · `.m-sheet` and `.m-sheet-card` — "retired by plan 720: no template sets the
    class; the hotspot is append-only".
  - `bottom-sheet` · `src/styles.scss` · the `.inline-edit-panel.as-modal` phone block — "dead since plan 711: nothing
    sets `as-modal`; the hotspot is append-only".
  - `bottom-sheet` · `src/app/pages/frontdesk/floor-plan/floor-plan.page.scss` · `.floor-plan.floor-plan--sheet` and
    `.floor-plan__panel.floor-plan__panel--open` — "plan 721 makes the phone panel inline".
  - `bottom-sheet` · `src/app/shared/partial-cost-badge/partial-cost-badge.component.scss` · the phone `.partial-popover`
    block — "plan 721 places it beside the chip".
  - `top-sheet` · `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.scss` ·
    `.mes-sheet` — "plan 721 centres it".
  - `modal-no-scroll` · `event-closing-dialog.component.scss` · `:host ::ng-deep .closing-card` — "the card is a
    column whose list scrolls (`:69`)".
  - `modal-no-scroll` · `quick-edit-product-modal.component.scss` · `:host ::ng-deep .quick-edit-product-modal` —
    "its panel scrolls (`quick-edit-product-panel.component.scss:17-20`)".
  The worker runs the guard once, compares its output with this list and records the exact selectors it printed.

**Registry and maps**
- [ ] `docs/brain/component-families.md` `modal-shell`: replace the "Phone bottom sheet" bullet with "Always centred
  (plan 720): no bottom sheet at any width — the shell has no `sheet` input. Height: never taller than the window
  (`--modal-max-block`: `dvh`, safe areas, keyboard). Put the content as title → `.c-modal-body` → `.c-modal-actions`
  straight inside the shell; the body scrolls and the title and actions stay. Content without a `.c-modal-body` makes the
  whole card scroll. A card that sizes itself through `cardClass` keeps `max-block-size` ≤ `var(--modal-max-block)` and
  a scrolling part. Guard: `scripts/lib/modal-guard.mjs` (`bottom-sheet`, `top-sheet`, `sheet-binding`,
  `modal-no-scroll`), run by `scripts/test/style-720.test.mjs`." `floor-plan-joins-sheet` and the `table-sheet`,
  `waitlist-drawer`, new-booking / walk-in / approve-table entries: "`app-modal-shell [sheet]`" becomes
  "`app-modal-shell`" (centred).
- [ ] `src/app/shared/breadcrumbs.md` `modal-shell/` row: add "centred at every width, body scrolls (plan 720)".
  `src/app/pages/breadcrumbs.md`: only if a row names a "bottom sheet" for a page listed here — reword to "popup".
- [ ] `docs/brain/inventory.md` regenerated with `node scripts/inventory.mjs` (never by hand).
- [ ] `docs/workflow-kit/manifest.json`: entries for `scripts/lib/modal-guard.mjs`, `scripts/test/modal-guard.test.mjs`,
  `scripts/test/style-720.test.mjs` (`tier: project`, `action: stay`, refs and notes like the plan 703 entries).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical properties only; no width in a media query.
- No new dictionary key, no new icon.
- Phone: popups that were bottom sheets now open as the same centred card as on a tablet (`width: calc(100% - 2rem)`
  from the existing phone rule, rounded on all four corners).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write the guard that finds bottom sheets, top sheets, sheet bindings and popup cards that stop scrolling, with its fixture test — scripts/lib/modal-guard.mjs, scripts/test/modal-guard.test.mjs
- [ ] A2: Append the centred, height-limited, scrolling popup rules under their own marker — src/styles.scss
- [ ] A3: Take the bottom-sheet switch out of the shared popup frame and prove a tall popup fits the window — src/app/shared/modal-shell/modal-shell.component.ts, .html, .spec.ts
- [ ] A4: Remove the switch from the 19 popups that asked for it and update the pricing spec — the 17 templates in the scope, src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
- [ ] A5: Lock it with the repo scan, the engine values and the append-only check — scripts/test/style-720.test.mjs
- [ ] A6: Record the rule in the registry and the folder maps, regenerate the inventory, register the new scripts — docs/brain/component-families.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/inventory.md, docs/workflow-kit/manifest.json

## Technical Considerations
- Dependencies: none.
- New files: `scripts/lib/modal-guard.mjs`, `scripts/test/modal-guard.test.mjs`, `scripts/test/style-720.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: the `log-query` Done-when item; `src/styles.scss` is append-only — only appended to; dictionary not
  touched; no file is added under a folder with a `breadcrumbs.md`. Stylesheets follow `.claude/skills/cssLayer/SKILL.md`;
  the shell follows `.claude/skills/angularComponentStructure/SKILL.md`.
- Traps: the engines are unlayered, so the appended rules must be unlayered too (a layered rule loses). The phone
  `.c-modal-card` rule sets `max-height`; `max-block-size` is the same property in horizontal writing, so the later
  appended value wins. `:host ::ng-deep .x` card rules have higher specificity than the engine and keep their own
  height (all of them already ≤ 92 dvh or full screen with a scrolling part). An open `.c-dropdown` inside a scrolling
  `.c-modal-body` scrolls with the body (as on phones today) — the body scrolls to show it.
- Prep sheets and the event-closing popup stay full-screen on a phone (`prep-sheets.component.scss:12-13`,
  `event-closing-dialog.component.scss:18-21`): a full-screen popup is centred and is not a bottom sheet.

## Out of Scope
- Pieces that draw their own panel or box: the floor editor's phone panel, the missing-prices box, the menu export sheet,
  the export preview (plan 721).
- Small boxes beside a control (`anchored-popup`: nutrition badge, stock-count unit box, notification bell, row menus).
- Giving every popup a `.c-modal-body` (the 20 that project their own content keep it; their card scrolls as a whole).
- Removing the dead `.m-sheet`, `.m-sheet-card` and `.inline-edit-panel.as-modal` rules from `src/styles.scss` (needs a
  hotspot cleanup the Human approves).
- A product default for popups (see Execution Notes).

## Critical Questions
- none

## Execution Notes
- behaviour: one height rule for every width — `100dvh` minus 2 × `--space-4`, the top and bottom safe areas and the keyboard — instead of a phone-only rule; the tablet is where the Human saw the cut-off, and the phone already had a limit.
- behaviour: the body scrolls, the title and the action row stay, only when the popup puts a `.c-modal-body` straight inside the shell (25 of 45); the other 20 scroll as one card — nothing is cut off, but their buttons scroll with the content. Converting them is not in this plan.
- behaviour: phones get the same centred card as tablets (no full-width sheet); the existing phone rule's width (`calc(100% - 2rem)`) and padding (`1.25rem`) stay.
- behaviour: the `sheet` input is removed, not kept as a no-op, so a new `[sheet]` binding fails the build as well as the guard.
- behaviour: the guard lives in its own file (`modal-guard.mjs`), not in `style-guard.mjs`, so the 704–718 tests keep their results.
- proposed default (for the Human; this plan does not write `_shared/product-defaults.md`): `centred-scrolling-popup` — "Every popup opens in the middle of the screen at every size, never taller than the screen, and its content scrolls; no popup slides up from the bottom" — how: `app-modal-shell` (family `modal-shell`); check: `scripts/test/style-720.test.mjs`. Turn on with `default yes centred-scrolling-popup`.
