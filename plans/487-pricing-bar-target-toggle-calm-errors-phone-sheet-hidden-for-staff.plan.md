# Plan 487 — Pricing bar: target toggle, calm error text, phone button with bottom sheet, hidden for staff

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), item 8, checks 92–95, "bottom of the Menu Editor
(`/menu-intelligence/<id>`)":
- 92: "the 'Event Target' button only toggles the visibility of the input fields. Teal/active when the fields hold
  data, grey/inactive when empty."
- 93: "invalid data (e.g. > 100%) — the error text pushes the input upward and breaks the grid. Error text sits below
  the input without moving the layout."
- 94: "mobile — remove the fixed bottom pricing bar (hidden behind the bottom navigation). Replace it with a floating
  action button that opens a bottom sheet with the pricing data."
- 95: "staff (non-owner) users — hide all pricing data, the pricing bar and pricing widgets completely (removed from
  the DOM, not just locked)."

Verified in code on `mvp-qa-fixes` at `ea6af7b0` (the bar is plan 445's `app-pricing-meter`; plans 459–485 did not
change it except 470's partial tags, `git log -- …/pricing-meter`):
- **92 —** `src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.ts:51`
  `targetsOpen_ = isTargetsOpened_() || !!this.event().targetsOverride`: once the event holds a target, the fields can
  never be hidden (the click flips `isTargetsOpened_` at :105-107 but the `||` keeps them open). The chip at
  `pricing-meter.component.html:77-84` is a plain `c-chip` with no state class, so it looks the same with or
  without data. `this.event()` is the page's `liveEvent_` (`menu-intelligence.page.ts:203-206`), whose
  `targetsOverride` is present exactly when a target or margin box holds a number (`menu-money-form.util.ts:62-74`),
  so "the fields hold data" is already a live signal.
- **93 —** `pricing-meter.component.scss:44-51` lays the fields out as a flex row with `align-items: flex-end`, and each
  `.meter-field` (`:53-71`) is a column label → box → error. The error spans (`html:65-67`, `:97-99`, `:111-113`)
  are in the flow, so a field with an error grows taller and, being bottom-aligned, its label and box move UP above
  the neighbours. That is the "pushes the input upward and breaks the grid".
- **94 —** `pricing-meter.component.scss:8-22`: the bar is `position: fixed; inset-block-end: 0; z-index: 90`. At
  ≤620 px the app's bottom tab bar is also `position: fixed; bottom: 0; z-index: 200; height: 3.5rem`
  (`src/app/core/components/header/header.component.scss:376-386`), so it covers the bar. The phone mode today is a
  tap-to-expand summary line inside the same fixed bar (`scss:147-175`, `html:2-17`, `isExpanded_` / `toggleExpanded`
  at `ts:44`, `:109-111`).
- **95 —** the page always mounts the meter (`menu-intelligence.page.html:258-263`, no role check). For staff the meter
  only locks: `canEditMoney_` (`ts:47-49`) shows lock icons (`html:32-34`, `:53-55`) and the effect at `ts:96-102`
  disables the money form — every number still renders. Each dish row also shows money to staff:
  `menu-dish-row.component.html:29` the partial-cost badge, `:30-44` the ₪ sell-price box, `:74-83` the
  `food_cost_money` / `food_cost_pct` detail fields when the serving type lists them (`DEFAULT_DISH_FIELDS` includes
  `food_cost_money`, `src/app/core/models/menu-event.model.ts:42`), `:143-146` «עלות למנה» (`dish_food_cost_per_portion`).
- Constraints found: `menu-intelligence.page.ts` is growth-frozen (`_shared/tech-stack.md:26-28`: no added lines), so
  every staff decision lives in the meter and the dish row, not in the page. `PermissionService.isStaff_`
  (`src/app/core/services/permission.service.ts:37-38`) is true only for a signed-in staff member (signed-out visitors
  and owners keep today's screen). The shared popup frame `app-modal-shell` draws the overlay with a fixed class
  (`src/app/shared/modal-shell/modal-shell.component.html:1`); the phone bottom-sheet helpers `.m-sheet` (overlay) and
  `.m-sheet-card` (card) already exist, phone-only, in `src/styles.scss:1804-1817` (inside `@media (max-width:
  $break-phone-max)` at :1747). The hero FAB sits at the inline-end corner, lifted on this page (`.above-bar`,
  `src/app/core/components/hero-fab/hero-fab.component.scss:11-14`). The `coins` icon is registered
  (`src/app/app.config.ts`, and `src/testing/test-lucide-icons.ts:33`).
- CSS trap (`docs/mvp/run-mode-review-fixes.md`): `src/styles.scss:413-431` resets `button` / `input` (margin, padding,
  font, background, border) outside any `@layer`; `pricing-meter.component.scss` is inside `@layer
  components.pricing-meter`, so a layered margin/padding/background on a raw `button` or `input` loses.

## Goals & Success Criteria
- Primary: the owner's pricing bar is calm and readable on desktop and phone, and a staff member sees no pricing at all
  on the menu editor.
- User stories: As a chef-owner, I want the «יעד לאירוע זה» chip to show me whether this event has its own target and
  to hide the boxes when I don't need them. As a chef-owner on a phone, I want the pricing one tap away instead of
  hidden behind the menu bar. As an owner, I want my cooks not to see prices and profit on the menu screen.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/pages/menu-intelligence/components/pricing-meter/**/*.spec.ts --include=src/app/pages/menu-intelligence/components/menu-dish-row/**/*.spec.ts --include=src/app/shared/modal-shell/**/*.spec.ts` → all SUCCESS, covering: (a) meter, staff: nothing of the meter renders (no `.pricing-meter`, no `.pricing-fab`, no input, no text from `foodCost_`), and the money form is still disabled; owner and signed-out: the bar renders as before; (b) chip: closed by default even when the event has `targetsOverride`; a click shows the two target boxes, a second click hides them while `targetsOverride` is set; the chip has class `teal` exactly when `event().targetsOverride` is present; the boxes cannot hide while a target box holds an invalid value (≥100); (c) a target of 100 and an extra cost of -50 each render their `.field-error` inside their own `.meter-field`, and the chip sits inside a `.meter-field` too (the layout itself is checked by card ②); (d) phone button: clicking `.pricing-fab` opens an `app-modal-shell` whose card has `m-sheet-card`, holding the price box, the numbers and the target chip; the shell's `dismissed` and the sheet's close button close it; (e) dish row, staff: no `.dish-sell-price`, no `app-partial-cost-badge`, no «עלות למנה» (`dish_food_cost_per_portion`) field and no `food_cost_money` / `food_cost_pct` field even when `activeFields` lists them; the coefficient and portions still render; owner: unchanged; (f) modal shell: `sheet=true` adds `m-sheet` on the overlay and `m-sheet-card` on the card, `sheet=false` (default) adds neither.
  - [ ] [auto] `git diff --numstat origin/mvp-qa-fixes -- src/app/pages/menu-intelligence/menu-intelligence.page.ts src/app/pages/menu-intelligence/menu-intelligence.page.html` → no output (the growth-frozen page is not touched).
  - [ ] [auto] `grep -rn "meter-summary\|toggleExpanded\|isExpanded_" src/app/pages/menu-intelligence/components/pricing-meter` → no output (the old phone summary line is gone).
  - [ ] [auto] `npm run lint:icons` → 0 violations.
  - [ ] [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Desktop 1440 px replays of checks 92 and 93, owner (cards ①, ②).
  - [ ] [human] Phone 375 px replay of check 94, owner (cards ③, ④).
  - [ ] [human] Replay of check 95, staff, desktop and phone (cards ⑤, ⑥).
  - [ ] [human] Passed checks 88, 90, 91 still hold for the owner (card ⑦).

### Validation cards (builder copies these into `docs/mvp/runs/487.md` `## Human checks`, with the slot's real port)
Accounts: the local owner and the local staff account of the same business from
`C:\coding projects\Cursor\mvp-review-evidence\accounts.json` (never print them into the repo).
SETUP (once, as the owner): open `/menu-library` and create a NEW event with «פנייה חדשה» named «QA 487» (never clear
the prices of an existing event of the shared accounts) with at least two dishes that have a food cost, 50 guests, the
price box «מחיר לאורח ללקוח» empty and both target boxes empty; press «שמור». Note its id from the URL
`/menu-intelligence/<id>` and use that same event in every card. The cards never press «שמור» again: when leaving the
page asks about unsaved changes, choose to leave without saving. Screenshots go to
`C:\coding projects\Cursor\mvp-review-evidence\qa\487\`.

▸ Menu editor — `/menu-intelligence/<id>` (owner, desktop 1440 px)   (checks ①, ②, ⑦)
① The target chip only shows and hides the boxes, and shows whether they hold data
   WHY     Check 92: the chip used to stay stuck open once the event had a target and always looked the same.
   WHERE   The bar fixed at the bottom of the page, chip «יעד לאירוע זה».
   DO      Click the chip; type 15 in «יעד רווח נקי (%)»; click the chip again; click it a third time; then clear the 15 and click outside the box.
   SEE ✓   Before typing the chip is grey and the first click shows «יעד רווח נקי (%)» and «מרווח ביטחון (%)»; after typing 15 the chip turns teal; the second click hides both boxes while the chip stays teal and the verdict («עומד ביעד» or «חסר … לאורח») does not change; the third click shows the boxes again with 15 still in it; after clearing, the chip is grey again.
   FAIL ✗  The boxes do not hide while 15 is set, the chip colour does not follow the data, or the 15 is lost.
② An error appears under the box without moving anything
   WHY     Check 93: an error used to push its box upward and break the row.
   WHERE   The same bar, «עלויות נוספות» and the target boxes.
   DO      Show the target boxes, type 100 in «יעד רווח נקי (%)» and click outside it; then type -50 in «עלויות נוספות» and click outside it. Take a screenshot before and after each.
   SEE ✓   «היעד חייב להיות קטן מ-100%» shows under the target box and «עלויות נוספות לא יכולות להיות שליליות» under the extra-cost box; every box in the row (price, extra costs, note, target, margin) and the chip stay on the same line at the same height as before the error, and the numbers row below does not move.
   FAIL ✗  A box or its label moves up or down, the row wraps differently, or the text overlaps another box.
⑦ The owner's meter still works (passed checks 88, 90, 91)
   DO      With the price box empty, look at the bar; then type 120 in «מחיר לאורח ללקוח»; then show the target boxes and scroll the page to the very bottom.
   SEE ✓   Empty: the price shows with the tag «מחושב» and a verdict («עומד ביעד» or «חסר … לאורח»); after typing 120 the numbers change at once; when a dish lacks a price the tag «חלקי» shows next to profit per guest, profit % and minimum price; at the bottom of the page the «+ הוסף קורס» button shows fully above the bar.
   FAIL ✗  No «מחושב» tag, no verdict, the numbers only change after «שמור», or the bar covers «+ הוסף קורס».

▸ Menu editor — `/menu-intelligence/<id>` (owner, phone 375 px)   (checks ③, ④)
③ A pricing button replaces the bar hidden behind the bottom menu
   WHY     Check 94: on a phone the bar sat behind the bottom navigation.
   WHERE   Bottom right corner of the screen, above the bottom menu bar.
   DO      Look at the bottom of the screen; tap the round button with the coins icon; type 120 in «מחיר לאורח ללקוח»; tap the X at the top of the sheet; tap the coins button again.
   SEE ✓   No pricing bar at the bottom and nothing behind the bottom menu; the coins button sits fully above the bottom menu, on the opposite side from the flame button; the tap opens a sheet from the bottom titled «תמחור האירוע» with price per guest, profit %, the verdict, the price, extra-cost and note boxes, the chip «יעד לאירוע זה» and the numbers (food cost, revenue, profit per guest, minimum price); the numbers change as 120 is typed; X closes the sheet; reopening still shows 120. Nothing scrolls sideways.
   FAIL ✗  The bar is still there or hidden behind the menu, the button is covered, the sheet is cut off, or the typed price is lost.
④ The chip and the error work inside the sheet
   DO      In the open sheet tap «יעד לאירוע זה», type 100 in «יעד רווח נקי (%)», tap outside the box.
   SEE ✓   The chip turns teal; «היעד חייב להיות קטן מ-100%» shows under the box; the box and the boxes under it do not jump.
   FAIL ✗  The error pushes the box up or covers the next box.

▸ Menu editor — `/menu-intelligence/<id>` (staff, desktop 1440 px, then phone 375 px)   (checks ⑤, ⑥)
⑤ A staff member sees no pricing on the menu (desktop)
   WHY     Check 95: staff used to see every price and profit, only locked.
   SETUP   Sign out, sign in as the staff account, open the same event.
   DO      Look at the bottom of the page and at the dish rows; click the info (i) button of one dish.
   SEE ✓   No pricing bar at the bottom, no ₪ price box on any dish row, no partial-cost warning; the dish's detail row shows «מקדם המנה» and «מנות לאירוע» but no «עלות מזון (₪)», no «עלות מזון (%)» and no «עלות למנה». The dish names, the stage bar and the notes still show.
   FAIL ✗  Any price, cost, profit or the bar is visible (locked or not).
⑥ No pricing button for staff on a phone
   DO      At 375 px, still as staff, look at the bottom of the screen of the same event.
   SEE ✓   No coins button and no pricing bar; only the bottom menu and the flame button.
   FAIL ✗  The coins button or any pricing number shows.

## Execution Mode
- Parallel: no — `pricing-meter.component.html` is also in plan 482's scope (select-on-focus on its four number boxes,
  spin-arrow cleanup) and `menu-dish-row.component.html` is touched by plans 495/496. Run after 482 merges; on a
  conflict with 495/496 keep both changes. Plan 494 owns `_layout.scss` / `menu-intelligence.page.scss`; this plan
  may change only the bottom-room value there (see below) — on a conflict keep 494's change and the larger value.
  `docs/brain/component-families.md` modal-shell entry also gains a line in
  plan 486 — keep both lines.
- Page bottom room (plan review): the reserved error slot (B2) makes the desktop bar about `--meter-error-h` taller
  per input row. The page keeps only `padding-block-end: 6rem` under its content (`_layout.scss:21`,
  `.menu-editor-shell { padding: 1rem 1.25rem 6rem }`), and plan 494 adds width-ranged room at 769–1030 px measured
  from the meter. In V1, with the target boxes shown, measure the bar's `getBoundingClientRect().height` at 800, 1024
  and 1440 px and check that «+ הוסף קורס» and the last note scroll fully above the bar. If they do not: above 494's
  range raise the `6rem` in `src/app/pages/menu-intelligence/_layout.scss` to `calc(<bar height rounded up to a
  whole rem> + var(--space-6))` (same rule, value only — `_toolbar.scss`'s print `padding: 0` still overrides it; never
touch the `:host` background there, plan 494 removes it); inside 494's range, when
  494 is already merged, raise the value in its rule in `menu-intelligence.page.scss` the same way; when it is not
  merged yet, log the new heights under `## Decisions` so 494 measures this bar. Log every measured height.
- Isolated DB: no (local MongoDB, the run's owner and staff accounts; the cards save one event).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Who counts as staff (Planner decision): `PermissionService.isStaff_()` — signed-in staff only. Owners, and the
  signed-out / legacy no-role case, keep today's screen. The meter component stays mounted for staff and renders
  nothing (its whole template inside `@if`), so its existing lock effect (`ts:96-102`) still disables the money form
  and the page's save (`getRawValue`) behaves exactly as today; the host has `display: contents`, so it draws nothing.
- Staff hide in the dish row (Planner decision): the row injects `PermissionService` and hides the ₪ sell-price box,
  the partial-cost badge, «עלות למנה» (`dish_food_cost_per_portion`) and the `food_cost_money` / `food_cost_pct` detail fields (a
  `visibleFields_` computed that filters `activeFields()`). The page's keyboard flow focuses `dish-sell-…` ids with
  `?.focus()` (`menu-intelligence.page.ts:613`, `:720`), so a missing box is a no-op; the page is not edited.
  Accepted limitation (plan review): for staff, Tab out of a dish search while renaming a dish (`:720`, `hasRecipe`)
  finds no sell box and focus does not move on; fixing it needs the growth-frozen page, so it stays as is.
- Target chip (Planner decision): `targetsOpen_ = isTargetsOpened_() || targetsInvalid_()`, starting closed even when
  the event has a stored target (the teal chip tells there is one). `targetsInvalid_` reads `event()` (so it recomputes
  on every form change) and returns `profitTargetPct.invalid || safetyMarginPct.invalid`: boxes holding a refused value
  can't be hidden, so the error is never out of sight when «שמור» refuses. Teal = `!!event().targetsOverride`; markup
  `class="c-chip targets-toggle" [class.teal]="…"` (the chip engine's `.c-chip.teal` tone, unlayered, wins over the
  button reset by specificity); keep `aria-expanded`.
- Error slot (Planner decision): every `.meter-field` (including a new `<div class="meter-field">` that wraps the chip,
  never a margin on the raw button) is `position: relative` with `padding-block-end: var(--meter-error-h)`; the
  `.field-error` is `position: absolute; inset-block-end: 0; inset-inline: 0; line-height: 1.2;
  max-block-size: var(--meter-error-h); overflow: hidden` and wraps inside the field's width. `--meter-error-h` is set on
  `.meter-inputs`: `1.75rem` (two lines of 0.7rem) on desktop, `1.1rem` (one line, full-width boxes) in the phone
  sheet. Same height with or without an error, so nothing moves. Keep `align-items: flex-end`.
- Phone mode (Planner decision, breakpoint corrected by the plan review): phone = the file's existing
  `@media (max-width: $break-mobile)` (768px, unchanged). Plan 494 gives the page its bottom room from 769 px because
  the meter shows its full body above 768 px — moving the meter to 767px would leave exactly 768 px (iPad portrait)
  with a full bar and no room. At exactly 768 px the shell's `.m-sheet` helpers (≤767px) do not apply, so the sheet
  opens as the shell's centred popup there; that is accepted. At phone width the fixed bar is `display: none` and a
  round `.pricing-fab` button (3.5rem, `coins` icon, `aria-label` = new key `pricing_meter_open`,
  `var(--color-primary)` background, `var(--color-text-on-primary)` icon) shows at `position: fixed;
  inset-inline-start: 0.75rem; inset-block-end: 0.75rem`, and at ≤620 px (where the tab bar exists; local mirror
  `$break-tabbar: 620px; // mirrors header.component.scss`) `inset-block-end: calc(var(--tabbar-h) +
  env(safe-area-inset-bottom, 0px) + 1rem)` (= the hero FAB's 4.5rem lift on this page when there is no safe area),
  `z-index: 210` (above the tab bar's 200, below every popup's 1000). Opposite corner from the hero FAB (inline-start
  = right in RTL), so they never overlap. Above 768 px the FAB is `display: none`.
- FAB and the CSS trap (plan review): `.pricing-fab` is a raw `<button>`, so its background, border and padding must
  not sit in `@layer components.pricing-meter` (they would lose to the unlayered reset). Write the whole
  `.pricing-fab` block (base + both media queries) after the `@layer` block, unlayered, like
  `src/app/core/components/hero-fab/hero-fab.component.scss` (which is unlayered); the encapsulated selector beats the
  `button` reset by specificity. Do not put `c-btn-primary` on it: its unlayered `display: inline-flex` would beat the
  desktop `display: none`.
- The sheet: `@if (isSheetOpen_())` `<app-modal-shell [sheet]="true" titleKey="pricing_meter_open"
  (dismissed)="closeSheet()">` with a close button (`c-icon-btn`, `x` icon, `aria-label` key `close`), a summary line
  `<div class="sheet-summary">` (price per guest · profit % · verdict — the markup that was inside the `.meter-summary`
  button, now plain text, not a button; the class `meter-summary` must not remain) and the meter body in a
  `.sheet-body` with `max-block-size: 70dvh; overflow-y: auto`.
- One body, two places: the inputs + numbers move into one `<ng-template #meterBody>` rendered with
  `NgTemplateOutlet` in the desktop bar and in the sheet. Switch the inputs from `formControlName` to
  `[formControl]="moneyForm().controls.<name>"` so the template needs no `[formGroup]` ancestor; two boxes bound to one
  control stay in step (both directives listen to the same control). Remove `.meter-summary`, `isExpanded_`,
  `toggleExpanded` and their phone rules.
- Modal shell sheet input: `readonly sheet = input(false)`; overlay `[class.m-sheet]="sheet()"`, card
  `[class.m-sheet-card]="sheet()"` (both helpers are phone-only, so on a wider screen the shell stays a centred popup).
  Backward compatible: every existing caller keeps `sheet=false`.
- Dictionary (append-only): `"pricing_meter_open": "תמחור האירוע"`.
- Load the cssLayer skill before the SCSS edits; check the rendered result in the browser at 1440 and 375 px, not only
  the source (CSS trap above).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspot `public/assets/data/dictionary.json` (new key `pricing_meter_open` only).

```scope
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.ts
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss
src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.html
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.scss
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.spec.ts
src/app/shared/modal-shell/modal-shell.component.ts
src/app/shared/modal-shell/modal-shell.component.html
src/app/shared/modal-shell/modal-shell.component.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/mvp/runs/487.md
src/app/pages/menu-intelligence/_layout.scss
src/app/pages/menu-intelligence/menu-intelligence.page.scss
```
`menu-dish-row.component.scss` only if hiding the sell-price box leaves a gap in the phone row layout (plan 470's
phone block at `:335+`); no other change there. `component-families.md`: one line in the `### modal-shell` entry
(`sheet` input). `_layout.scss` and `menu-intelligence.page.scss` only for the bottom-room value of
`.menu-editor-shell`, and only when the V1 measurement shows the taller bar covers the end of the page (Execution
Mode → "Page bottom room"); no other change there (plan 494 owns the rest of those files).

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/487.md`, add it to
the scope block, continue (run mode: you work alone). Never edit `menu-intelligence.page.ts` (growth-frozen) — if a
step seems to need it, put the logic in the meter or the dish row instead. Never change `server/**`,
`src/app/core/services/permission.service.ts` or `src/app/core/components/hero-fab/**` for this plan.

## Architecture Impact
- INV-1: preserves — UI only; staff already may not change money (`server/utils/permissions.js` decides every write,
  unchanged); hiding reads `PermissionService.isStaff_` without editing the permission service. Members still read the
  event (the API response is unchanged).
- INV-2, INV-3, INV-4, INV-5, INV-6: preserves — no tenancy, cascade, schema, taxonomy or AI change.
- INV-none: preserves — client-only template, style and one shared-popup input.

## Backend Impact
- None. No API, schema, migration or data change. The server still sends the event's money fields to staff; this plan
  removes them from the menu-editor screen only (a server-side strip for staff reads is out of scope). Security
  surface: unchanged — the server stays the gate for money writes.

## Reuse Check
- Bottom-sheet mode of the shared popup frame — family: modal-shell — rung: 3 — why: `app-modal-shell` already gives role=dialog, Escape, focus trap and backdrop; one `sheet` input applies the existing phone `.m-sheet` / `.m-sheet-card` helpers instead of a page-local sheet; registry entry updated
- Event-target chip active look — family: chip — rung: 2 — why: the `.c-chip` engine's existing `.teal` tone is the active look; no new class
- Error text under a meter box — family: form-field — rung: 2 — why: the meter keeps its existing `.field-error` text and only gains a reserved slot in its own SCSS; no new component

## Step 0 — Reality Check
Find in the current base: `targetsOpen_`, `isTargetsOpened_`, `isExpanded_`, `toggleExpanded`, `canEditMoney_` and the
lock `effect` in `pricing-meter.component.ts`; `.meter-summary`, `.targets-toggle`, the three `.field-error` spans in
its html; `.meter-inputs` `align-items: flex-end` and `$break-mobile` in its scss; `<app-pricing-meter` in
`menu-intelligence.page.html`; `.dish-sell-price`, `app-partial-cost-badge`, `dish_food_cost_per_portion`,
`activeFields` in `menu-dish-row`; `isStaff_` in `permission.service.ts`; `.m-sheet` / `.m-sheet-card` in
`src/styles.scss`; `cardClass` in `modal-shell.component.ts`; whether plan 482 already merged and what it changed in the
meter html. Print `ok` / `conflict: <what>` in `docs/mvp/runs/487.md`.

## Atomic Sub-tasks
- [ ] A1: Show staff no pricing bar at all, while the money boxes stay locked behind the scenes — `isMoneyHidden_ = computed(() => permission_.isStaff_())`, whole template inside `@if (!isMoneyHidden_())`, lock effect kept — pricing-meter.component.ts, pricing-meter.component.html
- [ ] A2: Hide dish prices, food costs and the cost warning from staff on every dish row — inject PermissionService, `visibleFields_` filters `food_cost_money` / `food_cost_pct`, `@if` around the ₪ sell-price box, the badge and «עלות למנה» (`dish_food_cost_per_portion`) — menu-dish-row.component.ts, menu-dish-row.component.html (scss only if the phone row needs it)
- [ ] B1: Make the event-target chip only show or hide its boxes and turn teal when they hold a value — `targetsOpen_ = isTargetsOpened_() || targetsInvalid_()`, `targetsHaveData_`, `[class.teal]` — pricing-meter.component.ts, pricing-meter.component.html
- [ ] B2: Keep every meter box in place when an error appears under it — reserved error slot per field, chip wrapped in a `div.meter-field`, absolute `.field-error` — pricing-meter.component.scss, pricing-meter.component.html
- [ ] C1: Let the shared popup frame open as a bottom sheet on phones — `sheet` input adding `m-sheet` / `m-sheet-card`; spec; one registry line — modal-shell.component.ts, modal-shell.component.html, modal-shell.component.spec.ts, docs/brain/component-families.md
- [ ] C2: Replace the phone pricing bar with a coins button that opens the pricing in a bottom sheet — one `ng-template` body in bar and sheet, `[formControl]` bindings, `.pricing-fab` (unlayered block, phone = existing `$break-mobile` 768px), `isSheetOpen_`, `div.sheet-summary` replaces the old summary button, new key `pricing_meter_open` — pricing-meter.component.ts, pricing-meter.component.html, pricing-meter.component.scss, public/assets/data/dictionary.json
- [ ] D1: Prove the staff hide, the chip, the sheet and the shell input with specs — replace the "phone summary line expands" spec with the sheet spec; staff/owner dish-row specs — pricing-meter.component.spec.ts, menu-dish-row.component.spec.ts, modal-shell.component.spec.ts
- [ ] V1: Build, run the specs and the auto checks, measure the bar height at 800 / 1024 / 1440 px and fix the page bottom room only if the end of the page is covered (Execution Mode → "Page bottom room"), replay cards ①–⑦ in the browser at 1440 and 375 px, write the run file — docs/mvp/runs/487.md (plus src/app/pages/menu-intelligence/_layout.scss or menu-intelligence.page.scss only when the measurement needs it)

## Out of Scope
- Money outside the menu editor's page body: the supplier-orders popup estimate (passed checks 75–80), the stage bar's
  deposit amount (passed check 62, plan 493 owns the stage bar), prints and Excel (82–87), menu-library revenue tags
  (105), inventory prices (48), the dashboard (110, already server-filtered). A follow-up plan can hide those for staff.
- Removing money fields from the API response for staff.
- The hero FAB (its `.above-bar` lift stays as is on desktop, also for staff).
- Select-on-focus and spin arrows on the meter's number boxes (plan 482).
- Any change to the pricing maths (`computeEventPricing`) or to what «שמור» saves.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

Independent plan review (Architect + PM, 2026-10-24) — gaps found and fixed in this file:
- Phone breakpoint moved to 767px would leave 768 px (iPad portrait) with a full bar and no page room from plan 494
  (which starts at 769 px) → keep the meter's existing `$break-mobile` 768px; at exactly 768 px the sheet is the
  shell's centred popup.
- `.pricing-fab` is a raw `<button>` styled with a background: inside `@layer components.pricing-meter` it would lose
  to the unlayered button reset (the trap this plan names) → the FAB block is unlayered, after the `@layer` block;
  no `c-btn-primary` (its `display: inline-flex` would beat the desktop `display: none`).
- FAB lift `+ 0.75rem` sat lower than the hero FAB's 4.5rem on this page and "z-index same as the hero FAB" was wrong
  here (101 with `.above-bar`) → `+ 1rem`, z-index 210 explained against the tab bar (200) and popups (1000).
- The summary line moving into the sheet stayed a `<button>` in spirit → `div.sheet-summary`, plain text.
- The reserved error slot makes the desktop bar taller while the page reserves only 6rem below its content → V1
  measures the bar and raises the `.menu-editor-shell` bottom room only if «+ הוסף קורס» / the last note are covered;
  `_layout.scss` and `menu-intelligence.page.scss` added to the scope for that value only; card ⑦ checks it.
- Card ⑤ named labels that do not exist («עלות מזון», «עלות מזון למנה») → real dictionary values «עלות מזון (₪)»,
  «עלות מזון (%)», «עלות למנה», «מקדם המנה»; verdict text «חסר … לאורח» (`short_per_guest`).
- SETUP told the tester to empty the prices of an existing event of the shared QA accounts → create a new «QA 487»
  event; cards never save again.
- Staff Tab focus after a dish rename (`page.ts:720`) → named as an accepted limitation (growth-frozen page).

- Architect: Architecture Impact filled — no invariant `Touches` glob is in the scope (permission service, server and
  `*ai*` files are read, not written); every named file and symbol exists at `ea6af7b0` except the new `sheet` input,
  `isMoneyHidden_`, `targetsInvalid_`, `targetsHaveData_`, `isSheetOpen_`, `visibleFields_`, `.pricing-fab` and the key
  `pricing_meter_open` (all marked new); the growth-frozen page is untouched and guarded by an `[auto]` diff check;
  signals only, `inject()`, `input()`, no `any`; the shell change is backward compatible (default `false`); the CSS
  trap is designed around (no layered margin/padding on raw buttons/inputs; chip tone and sheet helpers are unlayered
  engine classes). Scope covers every written file and nothing more.
- PM: each of checks 92–95 has its own replay card in Dandan's scenario; every Done-when is tagged; Out of Scope names
  the money screens left for staff and why; backend/API, auth, security surface and data/migration impact named as
  none; smallest version (no new component, one shell input, one dictionary key); each sub-task names its files.
  Plan checks: log-query item present, Reuse Check present, dictionary append-only, logical properties only, `coins`
  already registered, new key named.
- Passed list kept: 88 (partial tags), 90 (verdict), 91 (live empty price) — card ⑦ and the meter's numbers move
  unchanged into the shared body; 89 ("staff cannot price") is strengthened by item 95 (no box at all; the form stays
  disabled); 110 (dashboard) is not touched; 63 (stage bar on phone) is not touched; 67 (dish coefficient) — the
  coefficient box stays for staff and owner; 14 (component-families approved) — the registry gains one line.
- Similarity: `node scripts/plan-name-similarity.mjs` → no similar plans; 445 built the meter and is closed, 470 only
  changed its partial tags — this plan builds on both, no duplicate.
