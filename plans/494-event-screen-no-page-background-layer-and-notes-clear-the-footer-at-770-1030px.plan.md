# Plan 494 — Event screen: no page background layer and notes clear the footer at 770-1030px

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report of 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), two items on the event screen
(`/menu-intelligence/<id>`, the Menu Editor):
- **Item 16 — "Menu Intelligence page background":** "`app-menu-intelligence-page` has a background layer that masks
  the app background. Remove it."
- **Item 18 — "Notes container bottom padding (Check 65)":** "event screen, widths 770–1030 px: notes are hidden behind
  the event details footer. Add bottom padding/spacing in that range."

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- **Item 16 root cause:** `src/app/pages/menu-intelligence/_layout.scss:5-18` — the page `:host` sets
  `min-height: 100dvh` and `background: var(--bg-body)` (line 17). The app background is `body` (`src/styles.scss:295-305`,
  `background: var(--bg-body)`) **plus** `body::before` (`src/styles.scss:308-319`): a `position: fixed; z-index: -1` layer of
  teal / amber / blue radial glows (dark theme: `--bg-page-glow`, `src/styles.scss:368-370`). The page host paints an
  opaque `--bg-body` (`#f0f4f8`, `src/styles.scss:71`; dark `#0a1614`, :219) over the full viewport height, so the
  glows never show on this page. No other page host sets a background (`grep` of `:host` blocks in
  `src/app/pages/**` — this is the only one). The print rule `_toolbar.scss:67-69` (`:host { background: var(--bg-pure) !important }`
  inside `@media print`) is separate and stays.
- **Item 18 root cause:** the "event details footer" is `app-pricing-meter`
  (`components/pricing-meter/pricing-meter.component.scss:8-22`): `position: fixed; inset-block-end: 0; z-index: 90`,
  full width. Above 768 px (`$break-mobile`, pricing-meter.scss:1, :147) it shows its full body — the input row
  («מחיר לאורח ללקוח», targets) and the numbers row, which wrap onto more lines on narrower screens
  (`.meter-inputs, .meter-numbers { flex-wrap: wrap }`, :44-51) — so it is several rows tall. At ≤ 768 px it collapses
  to a one-line summary (:152-163), so phones are fine. The page reserves only `padding-block-end: 6rem` (96 px) under
  its content (`_layout.scss:21`, `.menu-editor-shell { padding: 1rem 1.25rem 6rem }`). Below 1024 px the notes log
  `app-event-notes-log` is the last block in the shell's column (`menu-intelligence.page.html:254-256`,
  `menu-intelligence.page.scss:22-24`), so its bottom (the last notes) ends up under the taller fixed meter and can never be
  scrolled clear. From 1024 px (`$break-notes`, `menu-intelligence.page.scss:11, 26-55`) the notes move to a sticky side
  column; the report says the hiding still happens up to ~1030 px, where the meter is still wrapped.
- History: no plan in 459-485 touched these lines (`git log` on `_layout.scss` / `menu-intelligence.page.scss`: last
  changes are 443 notes log, 441, and the SCSS split `6b3b53e0`). The background rule dates from the partial split.
- Plan 487 (pricing bar, items 92-95, being planned in parallel) changes the meter itself: phone FAB + bottom sheet,
  target fields shown only on toggle. This plan does **not** touch the meter's files; it only gives the page enough
  room under its content in the range where the meter is a multi-row bar.

As a chef, I want the event screen to look like the rest of the app and to read the last notes on a tablet-sized window,
so that nothing I wrote is hidden behind the price bar.

## Goals & Success Criteria
- Primary: the event screen shows the app's own background (glows) like every other page, and between 769 px and the
  width where the meter stops wrapping (at least 1030 px) the last note and the «הוסף הערה» area scroll fully above the
  pricing footer with a visible gap.
- Success:
  - [x] [auto] `npx ng build` passes (exit 0).
  - [x] [auto] `grep -n "background" src/app/pages/menu-intelligence/_layout.scss` → no line inside the screen `:host`
    block (prints nothing at all); `grep -n "bg-pure" src/app/pages/menu-intelligence/_toolbar.scss` → still prints the
    print-only line; `grep -n "@media screen and (min-width: \$break-meter-full)" src/app/pages/menu-intelligence/menu-intelligence.page.scss`
    → prints exactly one line (the new padding is screen-only, so the print rule `.menu-editor-shell { padding: 0 }`
    in `_toolbar.scss` still wins on paper).
  - [x] [auto] Browser measurement written to the run file (gstack `browse`, owner account, an event with ≥ 3 notes,
    scrolled to the very bottom): at widths 769, 800, 900, 1000, 1024, 1030 px —
    `document.querySelector('.pricing-meter').getBoundingClientRect().top` −
    `document.querySelector('app-event-notes-log').getBoundingClientRect().bottom` ≥ `16` for every width (both
    numbers and the gap listed per width); at 1440 px and 375 px the shell's computed `padding-block-end` is
    unchanged (`96px`).
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] **Background replay (desktop 1440 px, owner).** SETUP: any saved event. Open `/menu-library`, note the
    soft teal glow at the top-left corner of the page background. Then open the event (`/menu-intelligence/<id>`).
    SEE ✓ the same soft teal glow shows around the white menu paper on the event screen. FAIL ✗ the area around the
    paper is one flat grey-blue colour with no glow.
  - [ ] [human] **Notes replay (narrow desktop window, owner).** SETUP: one of your own saved events with at least 3
    notes (type a short test note in «כתבו הערה…» and press «הוסף הערה» until there are three). Snap the browser
    window to half the screen (Windows key + Left arrow) — on a normal 1920-px monitor that is about 960 px wide,
    inside the reported 770–1030 px range. DO: scroll the event screen all the way down.
    SEE ✓ the last note at the bottom of «הערות» (its text and its date line) is fully visible above the price bar
    at the bottom (the bar with «מחיר לאורח ללקוח»), with a small gap between them. (UI validator: also replay at
    exactly 770 px and 1030 px — same result.)
    FAIL ✗ the last note (or its date line) is cut off or sits under the price bar at any width checked.
  - [ ] [human] **No change elsewhere.** At 1440 px the notes still sit in the side column next to the menu paper and the
    bottom spacing looks as before; on a phone (375 px) the event screen looks as before (check 63 stage bar on phone,
    check 55 existing menus look the same).

## Execution Mode
- Parallel: yes — no file overlap with 486-493, 495, 496 (scopes checked: 488 and 493 touch only their own
  `components/*` folders). Plan 487 changes `pricing-meter.*`; if 487 is already merged into `origin/mvp-qa-fixes`
  when this plan starts, measure on that base (its meter height wins); if not, measure the current meter with the
  targets fields shown (its tallest state).
- Isolated DB: no.

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, review).
- Planner decision (item 18): fix it on the page shell, not on the meter — a width-ranged `padding-block-end` on
  `.menu-editor-shell` in `menu-intelligence.page.scss`. This also covers a new (unsaved) menu without notes, whose
  «+ הוסף קורס» button is the last block. Rejected: (a) making the meter sticky/in-flow — changes the pricing bar
  (passed checks 90/91, plan 487's ground); (b) a ResizeObserver publishing the meter height — TS change in 487's
  files for a two-item cosmetic fix.
- Padding value: measure the meter's tallest `getBoundingClientRect().height` across 769-1030 px (targets fields
  shown; if the meter on the base reserves or shows a line for a field error — plan 487 item 93 — measure with one
  error showing too, e.g. type `150` in a % target, measure, then clear it back to its old value), then `padding-block-end` = that height + `var(--space-6)`, written as `calc(<N>rem + var(--space-6))` with
  `<N>` rounded up to a whole rem and never below the current 6rem. Log the measured heights under `## Decisions`.
- Range: lower bound `769px` (`min-width: $break-meter-full` with a local `$break-meter-full: 769px; // pricing meter
  shows its full body above 768px (pricing-meter.component.scss:1)`, like the existing local `$break-notes`). Upper
  bound: the widest width where the overlap is measured (step 0), never below 1030 px; local variable with a comment.
  Write the query as `@media screen and (min-width: $break-meter-full) and (max-width: <upper>)`: the rule is
  appended after the `@use 'toolbar'` print rules, so a plain width query would beat `_toolbar.scss`'s print
  `.menu-editor-shell { padding: 0 }` whenever the printed page width falls in the range (A4 ≈ 794 px) and add a
  blank band at the end of the printed menu. `screen` keeps print untouched.
- The styles here are plain (unlayered) page styles on a `div` and custom elements — the run-mode CSS trap (unlayered
  native-element reset) does not apply, but check the rendered result in the browser, not only the source.
- Logical properties only (`padding-block-end`), load the cssLayer skill before the SCSS edit.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/pages/menu-intelligence/_layout.scss
src/app/pages/menu-intelligence/menu-intelligence.page.scss
docs/mvp/runs/494.md
```

## Read Scope
Entire repo (especially `src/styles.scss`, `components/pricing-meter/**`, `components/event-notes-log/**`,
`menu-intelligence.page.html`, `_toolbar.scss`).

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/494.md`, add it to the
scope block, continue. Never edit `pricing-meter.*` (plan 487) — if the fix seems to need it, take the page-side fix
above and log why.

## Architecture Impact
- INV-none: preserves — two SCSS rules on one page (a removed host background, a width-ranged bottom padding); no data,
  permission, tenancy, schema, taxonomy or AI path is touched.

## Backend Impact
- None. No API, auth, validation, security surface, data or migration change.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class; edits existing page styles only (spacing uses the
  existing `--space-6` token).

## Step 0 — Reality Check
On `origin/mvp-qa-fixes`: confirm `_layout.scss` `:host` still has `background: var(--bg-body)`, `.menu-editor-shell`
still pads `6rem` at the bottom, `menu-intelligence.page.scss` still has `$break-notes: 1024px`, and
`pricing-meter.component.scss` is still `position: fixed` with the 768 px collapse (or what 487 left). In the browser
(slot wt-1/wt-2, owner, event with ≥ 3 notes) record at 769 / 800 / 900 / 1000 / 1024 / 1030 / 1100 / 1200 / 1440 px:
meter height, notes bottom vs meter top after scrolling to the end. Print `ok` / `conflict: <what>`, and the measured
overlap range.

## Atomic Sub-tasks
- [x] A1: Let the app's own background glow show through on the event screen — remove the opaque background line from the page host, keep the print rule — src/app/pages/menu-intelligence/_layout.scss
- [x] A2: Give the event screen enough room under the notes so the last note scrolls above the price bar at 769-1030 px — screen-only, width-ranged padding-block-end on .menu-editor-shell, value from the step 0 measurement — src/app/pages/menu-intelligence/menu-intelligence.page.scss
- [x] V1: Prove both fixes in a real browser and record the numbers and screenshots — build, measurement at every listed width, 375 and 1440 regression look, human cards — docs/mvp/runs/494.md

## Out of Scope
- Any change to the pricing meter itself (height, phone FAB, target toggle, staff hiding) — plan 487.
- Phone layout (≤ 768 px) of the event screen and the bottom navigation spacing.
- Backgrounds of other pages, the menu paper, the notes card or the toolbar.
- Print and export layouts (the print-only `:host` background in `_toolbar.scss` stays).

## Architect + PM review (always)
```
ARCHITECT + PM REVIEW
no gaps
```
- Architect: Architecture Impact filled (INV-none); every named file and line exists on `ea6af7b0`; the fix follows the
  page's existing pattern (local `$break-*` variable + media query, logical properties, tokens); scope = the two SCSS
  files written plus the run file.
- PM: both items have replayable `[human]` cards with page, setup, role, action and on-screen result; `[auto]` items
  have exact commands; Out of Scope written; backend/auth/security/data marked none; smallest fix (two rules); no new
  translation keys, icons or reuse pieces; plan-checks log-query item present.

Independent review (2026-10-24, plan reviewer):
```
ARCHITECT + PM REVIEW
- A plain width media query appended after `@use 'toolbar'` would override the print rule `.menu-editor-shell { padding: 0 }` when the printed page is 769–1030 px wide (A4 ≈ 794 px) → query is `@media screen and …`, plus an [auto] grep for it (keeps print, passed checks 82-84).
- [auto] measurement only asserted "≤" while the goal promises a visible gap → asserts gap ≥ 16 px per width.
- [human] notes card asked a non-engineer for exact 900/770/1030 px windows → half-screen snap (~960 px) for the Human; exact widths stay for the UI validator.
- Meter tallest state could include plan 487's reserved error line → measure with one error showing when the base has it, then restore the value.
- Background card's "top corner" was vague → "top-left corner" (light-theme glow sits at 8% / -5%).
```
Root causes re-checked on `ea6af7b0`: `_layout.scss:17` is the only page `:host` background; meter `position: fixed`,
full body above 768 px; shell bottom padding `6rem` at `_layout.scss:21`; notes log last in the shell column below
1024 px; no bottom nav in 621–1023 px (`header.component.scss:342-363`). No roles, data or strings involved.
