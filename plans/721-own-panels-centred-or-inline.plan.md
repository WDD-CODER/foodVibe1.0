# Plan 721 — The pieces that draw their own panel: no sheet from the bottom or the top

Status: draft
Depends-on: 720
Track: code
Snapshot: dcf66fec99ebb6efcd85fa8228fb9b2fc42fb0f9

## Problem Statement
The Human (2026-11-24, in meaning): "Don't use modals from the bottom. A modal is always centred on the screen! And
ALL modals must be scrollable." Plan 720 fixes the shared popup frame (`app-modal-shell`). Four pieces draw their own
panel or box and are not on that frame; three of them are still pinned to an edge of the screen and the fourth has a
height limit that ignores the phone's browser bars:

1. **The floor plan editor's phone panel** (`/frontdesk/floor-plan`, plans 666, 684, 700): under 768 px the table /
   zone / room panel is a non-modal sheet fixed to the bottom of the screen (45 vh, top corners rounded), and the page
   pads its bottom by the sheet's measured height.
2. **The missing-prices box** (`app-partial-cost-badge`, plan 460 / 481): on a desktop it opens beside its chip (the
   `anchored-popup` default), but on a phone it is pinned full width to the bottom of the screen above the tab bar.
3. **The menu export sheet** (`app-menu-export-sheet`, plan 344): a dialog that drops down from the top edge.
4. **The export preview** (`app-export-preview`): centred and scrolling, but `max-block-size: 90vh` — on a phone or a
   tablet browser with visible bars `vh` is taller than the visible screen.

This plan makes the floor panel an inline panel, puts the missing-prices box beside its chip at every width, centres
the export sheet, sizes the export preview with the plan 720 height token, and empties plan 720's allow list of the
entries it was holding for this plan, so the guard covers these files too.

Verified on `chore/restaurant-staging` (`dcf66fec`, 2026-11-24):
- Floor plan: `src/app/pages/frontdesk/floor-plan/floor-plan.page.scss:146-182` — `@media (max-width: $break-phone-max)`:
  `.floor-plan.floor-plan--sheet { padding-block-end: calc(var(--fp-sheet-h, 0px) + var(--bottom-bar-h, 0px) +
  var(--space-4)) }`, `.floor-plan__panel { display: none }`, `.floor-plan__panel.floor-plan__panel--open` (`:156-173`:
  `position: fixed`, `inset-block-end: var(--bottom-bar-h, 0px)`, `inset-inline: 0`, `z-index: var(--z-floating)`,
  `max-block-size: 45vh`, `overflow-y: auto`, `background: var(--bg-pure)`, top corners rounded, `box-shadow:
  var(--shadow-modal)`), `.floor-plan__sheet-head { display: flex }`, `.floor-plan__room-open { display: inline-flex }`.
  Template `floor-plan.page.html:1` (`[class.floor-plan--sheet]="sheetOpen_()"`, `[style.--fp-sheet-h.px]="sheetH_()"`),
  `:205-210` (`<aside #panel class="floor-plan__inspector floor-plan__panel c-glass-card"
  [class.floor-plan__panel--open]="sheetOpen_()" data-testid="fp-panel">`), `:222-240` the head with `fp-sheet-close`,
  `:273-277` `fp-room-open`. Class `floor-plan.page.ts:102` `panelEl`, `:129-132` `roomOpen_`, `sheetH_`, `:169-171`
  `sheetOpen_`, `:231-237` the `ResizeObserver` effect that fills `sheetH_`, `:238-247` the effect that scrolls the
  selected table into view, `:383-387` `closeSheet()`. Spec `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts:590-596` (room panel opens / the
  close clears it).
- Missing-prices box: `src/app/shared/partial-cost-badge/partial-cost-badge.component.scss:52-66` — two phone blocks:
  `inset-block: auto var(--space-4); inset-inline: var(--space-4); inline-size: auto; &::before { content: none }` and
  `inset-block-end: calc(var(--tabbar-h) + var(--space-2) + env(safe-area-inset-bottom, 0px))`. Class
  `partial-cost-badge.component.ts:31` imports `PHONE_QUERY`, `:34` `const MOBILE_QUERY = PHONE_QUERY`, `:311-334`
  `place_()` returns early on a phone ("Full-width bottom sheet"), `:336-341` `isMobile_()`. Spec
  `src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts:384-391` "leaves the inline position unset on a phone, where the scss pins a
  full-width bottom sheet"; `forceLayout(mobile)` at `:336-341`.
- Menu export sheet: `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.scss:28-76`
  `.mes-sheet` (`position: fixed; inset-block-start: 0; inset-inline: 0; max-block-size: 80dvh; max-inline-size: 40rem;
  margin-inline: auto`, `padding-block-start` with the top safe area, `overflow-y: auto`, only the bottom corners
  rounded, `border-block-start: none`, `transform: translateY(-100%)` → `translateY(0)` when `.is-open`); header
  `.mes-header` `:78`. Spec `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.spec.ts:30-33` (the `is-open` class).
- Export preview: `src/app/shared/export-preview/export-preview.component.scss:21-41` `.export-preview-paper-wrap`
  (`max-block-size: 90vh`, `overflow: hidden`; `.paper` `:73-84` scrolls).
- From plan 720: the token `--modal-max-block`, `scripts/lib/modal-guard.mjs` (`modalFindings`) and the allow list in
  `scripts/test/style-720.test.mjs`, whose entries for `floor-plan.page.scss`, `partial-cost-badge.component.scss` and
  `menu-export-sheet.component.scss` say "plan 721"; that test fails when an allow entry no longer matches a finding.
- Registry: `docs/brain/component-families.md` `floor-plan-joins-sheet` (":568-569": "the phone sheet:
  `.floor-plan__panel--open` and `.floor-plan--sheet`, … (a non-modal panel under 768 px)") and the floor editor entry
  (":574": "the phone sheet (`.floor-plan__panel.floor-plan__panel--open`, non-modal, under 768 px)"); `modal-shell`
  ":97" lists `menu-export-sheet/` as "(bottom sheet)" kept off the shell. `src/app/pages/breadcrumbs.md:28` says
  "under 768 px the panel is a bottom sheet".

## Goals & Success Criteria
**Primary:** no panel, box or dialog in the app is pinned to the bottom or the top edge of the screen; the floor
editor's phone panel sits in the page under the map, the missing-prices box opens beside its chip, and the export
sheet and the export preview are centred and never taller than the visible screen.

- [auto] `pnpm run test:scripts` passes, including `scripts/test/style-720.test.mjs` after this plan removes its four "plan 721" allow entries (`.floor-plan.floor-plan--sheet`, `.floor-plan__panel.floor-plan__panel--open`, the phone `.partial-popover` block, `.mes-sheet`): `modalFindings` over `src/` returns only the entries left on the list.
- [auto] `pnpm run test:ci` passes, including: `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` — the section never has the class `floor-plan--sheet` nor a `--fp-sheet-h` style; the room panel still opens from `fp-room-open` and `fp-sheet-close` closes it (`:590-596` unchanged); with `window.matchMedia` stubbed to match the phone query, opening the room panel calls `scrollIntoView` on `[data-testid="fp-panel"]` with `{ block: 'nearest' }`, and with it not matching, it does not; `src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts` — the case at `:384-391` is replaced by "places the popover beside the chip on a phone too" (`forceLayout(true)`, chip at `left: 0; top: 300px`: `style.left` and `style.top` are set, the box is inside the viewport as in the desktop cases); `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.spec.ts` — after open, the `.mes-sheet` box's top ≥ 0, bottom ≤ `window.innerHeight`, and its left and right gaps to the window differ by at most 2 px; its computed `max-block-size` is not `none`; `src/app/shared/export-preview/export-preview.component.spec.ts` (if the folder has none, the worker adds it) — the `.export-preview-paper-wrap` box's bottom ≤ `window.innerHeight` when the paper holds 80 lines.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] the floor editor on a phone · window 390×844, `/frontdesk/floor-plan` → tap a table · the table's panel appears in the page right under the room map (the page scrolls to it), not stuck to the bottom of the screen; the X closes it
- [human] the floor editor on a phone, room panel · window 390×844, `/frontdesk/floor-plan` → press the room button under the map · the room panel opens under the map and scrolls with the page
- [human] the missing-prices box on a phone · window 390×844, an event menu with a dish that has no price → tap the "חלקי" chip · the box opens right above or below the chip, as wide as its text, never cut off, not stuck to the bottom of the screen
- [human] the menu export sheet · an event menu → the toolbar's export button · the options open in the middle of the screen with all corners rounded, not dropping from the top; the list scrolls when the window is short (1024×600)
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off (on a phone, 390×844: the "חלקי" chip of an event menu dish near the top and near the bottom; default `anchored-popup`)

## Execution Mode
- Parallel: no — after plan 720 (it edits plan 720's test and reads its token).
- Concurrent plans: none that write `src/app/pages/frontdesk/floor-plan/**`. Plans 665, 666, 684, 699 and 700 list that
  folder; their code is already on `chore/restaurant-staging`, so this plan builds on what they left.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/floor-plan/floor-plan.page.html
src/app/pages/frontdesk/floor-plan/floor-plan.page.scss
src/app/pages/frontdesk/floor-plan/floor-plan.page.ts
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/shared/partial-cost-badge/partial-cost-badge.component.scss
src/app/shared/partial-cost-badge/partial-cost-badge.component.ts
src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts
src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.scss
src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.spec.ts
src/app/shared/export-preview/export-preview.component.scss
src/app/shared/export-preview/export-preview.component.spec.ts
scripts/test/style-720.test.mjs
src/app/pages/breadcrumbs.md
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

- INV-none: preserves — layout of one editor page, one floating box, one export dialog and the export preview, plus a test allow list; the floor plan's draft, save, permissions and the table engine are not touched.

## Reuse Check

- The floor editor's phone panel as an inline `.c-glass-card` (`.floor-plan__panel--open` without fixed position) — family: floor-plan-joins-sheet — rung: 1 — why: the inspector card the desktop already shows; only the phone placement changes, no new class.
- The missing-prices box on a phone — family: cost-badge — rung: 1 — why: `placeInViewport` (`src/app/core/utils/viewport-placement.util.ts`) already places it on a desktop; the phone branch is removed (default `anchored-popup`).
- The menu export sheet, centred — family: modal-shell — rung: 2 — why: it stays off `app-modal-shell` (registry: kept off to keep its look, plan 344) and takes the shell's height token `--modal-max-block` (plan 720); converting it to the shell is not needed for the Human's rule.
- The export preview's height — family: modal-shell — rung: 2 — why: the plan 720 token replaces `90vh`.

## Adopt Check
- none — no new dependency, helper or tool; the plan removes code and reuses `placeInViewport` and the plan 720 guard

## Defaults

- anchored-popup — applies — how: the missing-prices box is placed by `placeInViewport` in `src/app/core/utils/viewport-placement.util.ts` at every width, re-placed on scroll and resize as in `src/app/shared/nutrition-badge/nutrition-badge.component.ts`; the phone branch that pinned it to the bottom is removed
- one-breakpoint-set — applies — how: the floor editor keeps `$break-phone-max` for showing the panel only when open; the scroll-to-panel step uses `PHONE_QUERY` from `@utils/breakpoints`
- unsaved-changes-on-leave — exception — why: no form changes; the floor editor keeps its `pendingChangesGuard`
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
- As an owner drawing my room on a phone, I want the table's settings to appear in the page under the map, so that nothing slides over the map and I can scroll between the two.
- As a chef on a phone, I want the missing-prices box to open next to the chip I tapped, so that I see which dish it belongs to.
- As a chef exporting a menu, I want the export options in the middle of the screen like every other popup, so that the app feels the same everywhere.

## Functional Requirements

### Must Have (P0)

**Floor editor — inline panel on a phone**
- [ ] `floor-plan.page.scss`, phone block `:146-182`: delete the `.floor-plan.floor-plan--sheet` rule; the
  `.floor-plan__panel.floor-plan__panel--open` rule becomes `display: block` only (no `position`, `inset-*`, `z-index`,
  `inline-size`, `max-block-size`, `overflow-y`, `background`, `padding`, radius or shadow — it keeps the
  `.c-glass-card` look and the inspector padding it has on a tablet). `.floor-plan__panel { display: none }`,
  `.floor-plan__sheet-head { display: flex; … }` and `.floor-plan__room-open { display: inline-flex; … }` stay. The
  comment `:146` becomes "Plan 721: under 768 px the panel is shown only when open, in the page under the map".
- [ ] `floor-plan.page.html:1`: remove `[class.floor-plan--sheet]="sheetOpen_()"` and `[style.--fp-sheet-h.px]="sheetH_()"`.
- [ ] `floor-plan.page.ts`: remove `sheetH_` (`:131-132`) and the `ResizeObserver` effect (`:231-237`); keep `sheetOpen_`,
  `roomOpen_`, `closeSheet()` and the selected-table effect. Add one effect: when `sheetOpen_()` turns from false to
  true and `matchMedia(PHONE_QUERY).matches` (`PHONE_QUERY` from `@utils/breakpoints`, wrapped in `try` like
  `partial-cost-badge.component.ts:336-341`), `queueMicrotask(() => this.panelEl()?.nativeElement.scrollIntoView?.({
  block: 'nearest' }))`. The previous value is held in a private plain field (`private wasOpen_ = false`), not a signal.
  Declared after the selected-table effect, so the panel scroll runs last.
- [ ] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts`: the three cases named in Done when.

**Missing-prices box — beside its chip at every width**
- [ ] `partial-cost-badge.component.scss:52-66`: delete both phone blocks (the bottom pin and the tab-bar lift). The
  box keeps `inline-size: min(22rem, calc(100vw - 2rem))` and `max-block-size: min(24rem, 70vh)` →
  `max-block-size: min(24rem, 70dvh)`.
- [ ] `partial-cost-badge.component.ts`: delete the phone branch of `place_()` (`:314-321`), `isMobile_()`
  (`:336-341`), `MOBILE_QUERY` (`:34`) and the `PHONE_QUERY` import when nothing else uses it.
- [ ] `src/app/shared/partial-cost-badge/partial-cost-badge.component.spec.ts`: replace the case at `:384-391` as named in Done when; `forceLayout`
  stays for it.

**Menu export sheet — centred**
- [ ] `menu-export-sheet.component.scss` `.mes-sheet`: `position: fixed; inset: 0; margin: auto; block-size:
  fit-content; inline-size: calc(100% - 2 * var(--space-4)); max-inline-size: 40rem; max-block-size:
  var(--modal-max-block)`; `padding: var(--space-4)` (no top safe-area padding); a full `border: 1px solid
  var(--border-glass)` and `border-radius: var(--radius-xl)` (the `border-block-start: none` and the two end-radius
  lines go); closed state `opacity: 0; transform: scale(0.98); visibility: hidden`, open state `opacity: 1;
  transform: none; visibility: visible`, transitions on `opacity` and `transform` 200 ms (the reduced-motion block
  stays). `overflow-y: auto` stays; `.mes-header` gets `position: sticky; inset-block-start: calc(-1 *
  var(--space-4)); z-index: 1; background: inherit` so the title and the X stay while the options scroll.
- [ ] `src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.spec.ts`: the case named in Done when.

**Export preview**
- [ ] `export-preview.component.scss:33` `.export-preview-paper-wrap`: `max-block-size: 90vh` →
  `max-block-size: var(--modal-max-block)`.
- [ ] `src/app/shared/export-preview/export-preview.component.spec.ts`: the case named in Done when (create the spec if the folder has none,
  with the component's existing inputs).

**Guard, registry and maps**
- [ ] `scripts/test/style-720.test.mjs`: remove the four allow entries that say "plan 721"; nothing else changes.
- [ ] `docs/brain/component-families.md`: `floor-plan-joins-sheet` — "the phone sheet: `.floor-plan__panel--open` and
  `.floor-plan--sheet`, …" becomes "the phone panel (plan 721): `.floor-plan__panel--open` shows the inspector in the
  page under the map; `.floor-plan__sheet-head`, `.floor-plan__room-open`"; its When line "or shows its panel as a
  bottom sheet" becomes "or shows its panel on a phone"; the editor entry's "the phone sheet (…, non-modal, under 768
  px)" becomes "the phone panel (inline under the map, under 768 px, plan 721)"; `modal-shell` ":97" — `menu-export-sheet/`
  "(bottom sheet)" becomes "(centred, its own look, plan 721)". `partial-cost-badge` (":240"): add "placed beside its
  chip at every width (plan 721)".
- [ ] `src/app/pages/breadcrumbs.md:28`: "under 768 px the panel is a bottom sheet" → "under 768 px the panel opens in
  the page under the map (plan 721)". `src/app/shared/breadcrumbs.md:45` `partial-cost-badge/` row: add "beside its
  chip on every screen".
- [ ] `docs/brain/inventory.md` regenerated with `node scripts/inventory.mjs`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical properties only; no width typed in a media query.
- No new dictionary key, no new icon. The floor editor's X keeps its `close` label.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show the floor editor's phone panel in the page under the map and scroll to it when it opens — src/app/pages/frontdesk/floor-plan/floor-plan.page.html, .scss, .ts, .spec.ts
- [x] A2: Place the missing-prices box beside its chip on a phone too — src/app/shared/partial-cost-badge/partial-cost-badge.component.scss, .ts, .spec.ts
- [x] A3: Centre the menu export sheet with a header that stays — src/app/pages/menu-intelligence/components/menu-export-sheet/menu-export-sheet.component.scss, .spec.ts
- [x] A4: Size the export preview by the visible screen — src/app/shared/export-preview/export-preview.component.scss, .spec.ts
- [x] A5: Let the guard cover these files: drop their allow entries — scripts/test/style-720.test.mjs
- [x] A6: Update the registry and the folder maps, regenerate the inventory — docs/brain/component-families.md, src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, docs/brain/inventory.md

## Technical Considerations
- Dependencies: plan 720 (token `--modal-max-block`, `scripts/lib/modal-guard.mjs`, `scripts/test/style-720.test.mjs`).
- New files: `src/app/shared/export-preview/export-preview.component.spec.ts` only if it does not exist.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: the `log-query` Done-when item; no hotspot written; dictionary not touched; folder maps in scope.
  Stylesheets follow `.claude/skills/cssLayer/SKILL.md`; components follow
  `.claude/skills/angularComponentStructure/SKILL.md` (signals, `inject()`, no `any`, single quotes, no semicolons).
- Traps: `scrollIntoView` is absent in some test DOMs — call it with `?.` as the selected-table effect does. The
  missing-prices box lives in the browser top layer (`popover="manual"`), so `placeInViewport` coordinates are viewport
  coordinates on a phone too. The export sheet is `position: fixed` with `inset: 0; margin: auto; block-size:
  fit-content` — that centres it without `transform`, so the open/close animation can use `transform: scale()`.

## Out of Scope
- The shared popup frame and the 19 popups that used `[sheet]` (plan 720).
- Moving the menu export sheet or the export preview onto `app-modal-shell`.
- The floor editor's desktop and tablet layout (plan 700), its tools, draft rules and saving.
- Other small floating boxes (nutrition badge, stock-count unit box, notification bell, row menus) — they already open
  beside their control.

## Critical Questions
- none

## Execution Notes
- behaviour: the floor editor's phone panel becomes an inline panel under the map, not a centred popup — it is a working panel (arrows that move a table, area and size counters) whose effect must stay visible on the map; a centred popup would cover the map. Reverse: a centred `app-modal-shell` with the same content.
- behaviour: on a phone the page scrolls the panel into view (`block: 'nearest'`) when it opens, so a tap on a table visibly opens something; the selected-table scroll still runs first. Reverse: no scroll.
- behaviour: the missing-prices box follows the `anchored-popup` default on a phone too (beside the chip) instead of becoming a centred popup — it is a small box tied to one chip, not a popup.
- behaviour: the menu export sheet stays its own component (not `app-modal-shell`) and is centred with CSS only; its open/close keeps a 200 ms fade and a slight scale instead of the slide from the top.
