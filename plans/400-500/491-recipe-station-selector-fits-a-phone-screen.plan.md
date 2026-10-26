# Plan 491 — Recipe station selector fits a phone screen

Status: done
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report 2026-10-22, item 14 (check 45): "`/recipe-builder/<id>` at ~390 px: the station selector
overflows its container. Fit within bounds."

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- The station picker was added by plan 436 (`58812577`) as a second `app-custom-select` in the recipe header,
  `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html:172-183`. It reuses the class
  `course-select` of the course picker above it (html:164-170) and turns on `[typeToFilter]="true"`.
- No rule anywhere styles `.course-select`: `recipe-header.component.scss` has no selector for it (grep → 0 hits).
- Phone layout, `recipe-header.component.scss:474-559` (`@media (max-width: 40.625rem)`):
  - `.header-dashboard-container` (scss:475-485) becomes a 2-column grid `1fr 1fr` with named areas
    `title / img metrics / rating / scaling / labels` and `place-items: center`.
  - `.center-controls { display: contents }` (scss:488-491) lifts its children into that grid. Every child gets a
    `grid-area` (top-row, header-rating, scaling-dock-grid, labels-container) **except the two `.course-select`
    pickers**, so they are auto-placed into an extra implicit row, course in column 1 and station in column 2.
  - `place-items: center` means they are not stretched: each picker is as wide as its own content.
- Why the station picker is wider than the course picker: with `typeToFilter` the shared trigger is a `div` holding a
  native `<input type="text">` with no `size` (`src/app/shared/custom-select/custom-select.component.html:7-45`). A
  text input's built-in width is about 20 characters; `.custom-select-input { flex: 1; min-width: 0 }`
  (`custom-select.component.scss:84-95`) lets it shrink inside the flex row but does not lower its min-content size.
  So the station picker's minimum is input (~150 px) + clear button + chevron + 1.5rem padding.
- The grid column is `1fr` = `minmax(auto, 1fr)`; its `auto` minimum takes that min-content size, so column 2 grows
  past half of the container. Column 1 holds the 7.5rem image (scss:21-22). Together with the 1.5rem gap and 1.25rem
  container padding (scss:5-7) and the page's 1rem side padding (`recipe-builder.page.scss:57`), the two columns no
  longer fit in a 375–390 px screen: the station picker sticks out past the header card's edge.
- Desktop (> 40.625rem) is a different grid (`.center-controls` `1fr auto`, scss:89-95, 431-454) and is not reported.

## Goals & Success Criteria
- Primary: on a phone (375–430 px wide) the course and station pickers sit inside the recipe header card, each the
  full width of the card's content, and the page has no sideways scroll.
- As a chef on my phone, I want the station picker inside the recipe card so that I can see and change it without the
  page sliding sideways.
- Success:
  - [x] [auto] `npx ng build` passes (exit 0).
  - [x] [auto] `npx ng test --watch=false --include=src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts` → all specs pass (no behaviour change; proves the template still binds).
  - [ ] [auto] Geometry, gstack `browse` on the slot app at viewport 390x844 and again at 375x812, owner logged in, on `/recipe-builder/<id of an existing recipe>`: a JS evaluation returns `true` for `document.documentElement.scrollWidth <= innerWidth` and for each of `#course` and `#station` (their `.custom-select-trigger`): `trigger.left >= card.left && trigger.right <= card.right`, where `card` = `.header-dashboard-container` rect. Numbers + result pasted in the run file.
  - [ ] [auto] Desktop unchanged, same tool at 1440x900 on the same recipe: the two pickers' rects (x, y, width) are equal to the values measured on `origin/mvp-qa-fixes` before the change (± 1 px), measured in Step 0.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Phone replay (your phone, or a 375–390 px window — the report saw it at ~390 px; owner): log in as the owner, open `/recipe-book`, tap any recipe so `/recipe-builder/<id>` opens. Look at the recipe header card. SEE ✓ the «סוג מנה» picker and the «תחנה» picker each sit on their own line inside the card, both the full width of the card, nothing sticks out past the card's edge, and the page does not move sideways when you swipe left or right. FAIL ✗ the «תחנה» box pokes out of the card's edge or the page slides sideways.
  - [ ] [human] Phone picker still works (375 px, owner, same recipe): tap the «תחנה» picker. SEE ✓ its list opens inside the screen width, shows «כללי», the stations and «הוסף תחנה חדשה» on one line each; tap a station and the box shows its name. Then put the recipe back as it was: pick the station it had before (or leave the page and choose not to save) — do not press save and do not use «הוסף תחנה חדשה», so the shared owner account's recipe and stations stay unchanged. FAIL ✗ the list is cut off at the screen edge or the add option breaks onto two lines.
  - [ ] [human] Desktop look unchanged (1440 px, owner, same recipe): the recipe header looks as before — course and station pickers in their usual place under the labels. FAIL ✗ any picker moved or changed size.

## Execution Mode
- Parallel: yes — only one SCSS file of the recipe header; no other qa-fixes plan (486–496) writes it. Plan 490 (AI
  ingredient paste in the recipe builder) works in the ingredients/paste area, not the header.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Planner decision · why: each picker gets its own full-width row on phones (not both side by side in one row) ·
  side by side gives each ~140 px at 375 px, and the open list is as wide as its picker (`.c-dropdown` uses
  `inset-inline: 0`, `src/styles.scss:799-803`), so «הוסף תחנה חדשה» with its icon would wrap. Full width matches
  the labels row above.
- Planner decision · why: fix it in the recipe header's own SCSS, not in the shared `app-custom-select` · the
  shared input sizing is used by every type-to-filter picker in the app (passed checks 1 and 5 are frozen); the bug
  is the header's grid not placing these two pickers. Giving the pickers `min-width: 0` stops them from inflating
  the `1fr` column, and a `grid-area` stops the auto-placement.
- Give the station picker its own class (`station-select`) instead of the copied `course-select`, so each can be
  placed by name; keep `course-select` on the course picker.
- CSS trap (run-mode-review-fixes.md): component SCSS here is not inside `@layer`, and the rule targets the
  `app-custom-select` host by class, not a raw native element, so the unlayered `button, input` reset in
  `src/styles.scss:413-422` does not compete. Still load the cssLayer skill and check the rendered result in the
  browser, not only the source.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
docs/mvp/runs/491.md
```
The `.html` change is only the station picker's class (`course-select` → `station-select`). No `.ts` change.

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/491.md`, add it to
the scope block, continue (run mode: you work alone). Changing `src/app/shared/custom-select/**` is NOT allowed by
this route — if Step 0 shows the header-only fix cannot work, record the evidence and return it instead.

## Architecture Impact
- INV-none: preserves — the scope is one component's phone layout rules and one class name; no ownership, tenancy,
  server write, schema, taxonomy or AI path is touched.

## Backend Impact
- None. No API, auth, validation, data or migration change. Security surface: none.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class; the existing `app-custom-select` (family
  search-combobox, "pick one value of a short fixed list") is used as is and only placed by the header's grid.

## Step 0 — Reality Check
1. Confirm on the slot checkout: html:164-183 still has the two `app-custom-select` with `triggerId` `course` and
   `station`; scss `@media (max-width: 40.625rem)` block still has `display: contents` on `.center-controls` and no
   `.course-select` rule.
2. Replay the bug before changing anything: gstack `browse`, owner, viewport 390x844, `/recipe-builder/<id>`;
   record `scrollWidth`/`innerWidth`, the card rect and the `#station` trigger rect; screenshot to
   `C:\coding projects\Cursor\mvp-review-evidence\qa\491\before-390.png`. Expected: station trigger right edge
   (or left edge in RTL) outside the card, or `scrollWidth > innerWidth`.
3. Measure the 1440x900 rects of `#course` and `#station` for the desktop-unchanged check.
Print `ok` / `conflict: <what>`. If the bug does not reproduce, record the numbers and screenshot under
`## Decisions` and mark the plan done with evidence.

## Atomic Sub-tasks
- [x] S1: Give the station picker its own class so the phone layout can place it by name — course-select → station-select on the station app-custom-select — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
- [x] S2: Put the course and station pickers on their own full-width rows inside the phone header card — in the max-width 40.625rem block add areas 'course course' and 'station station' after 'labels labels'; .course-select grid-area course, .station-select grid-area station; both justify-self stretch, inline-size 100%, min-inline-size 0; logical properties only — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss
- [x] S3: Keep the desktop header exactly as it was — if the new station-select class changes desktop placement, add it to the desktop min-width 40.626rem block so it sits where course-select's sibling sat; otherwise no desktop rule — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss
- [x] V1: Prove it fits on phones and nothing else moved — build, header spec, browse geometry at 390, 375 and 1440, open the station list at 375, screenshots after-390.png / after-375.png / after-1440.png in the evidence folder, human cards and results in docs/mvp/runs/491.md

## Out of Scope
- The shared `app-custom-select` input sizing (any other type-to-filter picker in the app).
- The recipe header at tablet widths (651–1024 px) and on desktop, beyond proving it is unchanged.
- Any other part of the recipe builder on phones (ingredients table, workflow, paste tool — plan 490).
- Station list content, the add-station window, or saving the station (plan 436 behaviour stays).

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```
- Architect: Architecture Impact filled (INV-none, scope reaches no invariant `Touches` glob); every named file and
  selector exists at `ea6af7b0` (`station-select` is new, marked in S1); the design follows the existing phone
  grid-area pattern of the same SCSS block; Read-Write Scope = the two header files + run file, nothing more.
- PM: problem and success criteria are testable (geometry numbers + replay cards at 375 px and 1440 px); every
  Done-when item tagged; Out of Scope written; backend / auth / security / data marked none; smallest fix (CSS
  placement + one class name, no shared-component change); each step names its file.
- Project checks (`docs/agent/plan-checks.md`): log-query `[auto]` item present; `## Reuse Check` present; no
  hotspot edit; RTL + logical properties called out; no new translation key (labels «סוג מנה», «תחנה», «כללי»,
  «הוסף תחנה חדשה» already exist); no new persisted data.
- Independent review 2026-10-23: root cause re-checked at html:164-183 and scss:474-559 (no `.course-select` rule,
  `place-items: center`, unplaced pickers in an implicit row; `:host { display: block }` in custom-select scss so
  `inline-size: 100%` applies). Fixed: the picker card now restores the recipe's station without saving (picking a
  station dirties the form, `useUnsavedChanges`, and the owner account is shared); the replay card names the
  reported ~390 px width. Scope unchanged.
- Similarity: `node scripts/plan-name-similarity.mjs` → no similar plans; plan 436 introduced the picker and is
  built on, not duplicated.
