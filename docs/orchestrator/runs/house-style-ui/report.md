# Orchestrator run house-style-ui

Run branch: `orch/house-style-ui` (from `origin/main` at cef191e) · started 2026-11-25T21:00:54.474Z · finished 2026-11-25T22:13:13.403Z
Result: 4 merged, 0 parked, skipped or left out, 4 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is cef191e.

Final gate: ok (attempt 1)

## Decided without you

4 decision(s) the run made itself. Read them before `merge it`; each says how to undo it.

### Questions up front (3)

- plan 743 · advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/appRoot/app.component.spec.ts, src/app/pages/dashboard/dashboard.page.spec.ts
  - why: scope: 2 named file(s), none sensitive — the same rule as a scope ask
  - undo: before merge it: on the run branch, drop those lines from the plan's scope block and git checkout origin/main -- src/app/appRoot/app.component.spec.ts src/app/pages/dashboard/dashboard.page.spec.ts
- plan 744 · advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/pages/metadata-manager/components/station-manager/station-manager.component.spec.ts
  - why: scope: 1 named file(s), none sensitive — the same rule as a scope ask
  - undo: before merge it: on the run branch, drop those lines from the plan's scope block and git checkout origin/main -- src/app/pages/metadata-manager/components/station-manager/station-manager.component.spec.ts
- plan 746 · advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/pages/recipe-book/recipe-book.page.spec.ts
  - why: scope: 1 named file(s), none sensitive — the same rule as a scope ask
  - undo: before merge it: on the run branch, drop those lines from the plan's scope block and git checkout origin/main -- src/app/pages/recipe-book/recipe-book.page.spec.ts

### Tests that check less (1)

- plan 746 · test changed — fewer checks?: src/app/pages/clients/components/client-list/client-list.component.spec.ts: 32 → 31 checks
  - why: an existing test the plan changed now checks less; it may be right (an old check removed on purpose) or a test bent to pass
  - undo: read the diff: git diff 3df5b2ba^1 3df5b2ba -- src/app/pages/clients/components/client-list/client-list.component.spec.ts

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag | merged | 0 | build | 1b4923a |  |
| 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it | merged | 0 | build | fc2e536 |  |
| 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list) | merged | 0 | build | b795b9a |  |
| 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices | merged | 0 | build | 3df5b2b |  |

## Scorecard

- Wall: 71.6 min · gate passes: 4 · asks raised mid-run: 0
- Minutes per state (summed over plans): building 50.2 · gate 9.4 · merging 2.6 · checking 1.3
- Checks left out (cached, skipped, not run, same tree): 0, about 0 min saved

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-25T21:00:54.474Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 743 · none · behaviour: the header brings the active link into view with a setTimeout(0) after NavigationEnd, so routerLinkActive has set `.active` first (the simplest option) — reverse: delete the router.events subscription in header.component.ts
- D2 · 743 · none · behaviour: while dragging, scroll-snap-type is set to none directly on the scroller as well as through the is-dragging class, because the class only updates on the next render and snapping pulled the first moves back — reverse: remove the el.style.scrollSnapType lines in the drag handlers
- D3 · 743 · none · behaviour: the swallowed click is cleared by a setTimeout(0) after a drag, so a drag released off the chip does not swallow a later real click — reverse: drop that setTimeout in onPointerEnd
- D4 · 743 · none · behaviour: the top bar's .nav-pills sets --rail-padding-block: 0 so its height stays as before the rail — reverse: remove that line in header.component.scss
- D5 · 744 · none · removes: the product list badge's own open/close state (replaced by the shared tooltip, which opens on hover, focus and tap as before) — reverse: restore inventory-product-list.component.{html,ts,scss} from origin/main
- D6 · 744 · none · removes: the recipe book's own cost and date tooltip state and recipe-list-tooltips.service.ts (replaced by the shared tooltip) — reverse: restore recipe-book-list.component.{html,ts,scss} and services/recipe-list-tooltips.service.ts from origin/main
- D7 · 744 · none · behaviour: the 'reworded' stamp of hints-in-tooltips is on its 'turned on' line, because the defaults contract (scripts/lib/product-defaults.mjs FIELDS) refuses a 'reworded' field — reverse: edit that line
- D8 · 744 · none · behaviour: the cost and date tooltips are templates inside their cells, with the same text as before — reverse: restore recipe-book-list.component.html from origin/main
- D9 · 744 · none · behaviour: a touch or pen press held 500 ms opens the tooltip unpinned; it closes on an outside press, scroll, blur or Escape — reverse: drop onPointerDown in tooltip.directive.ts
- D10 · 745 · none · behaviour: the measured mode keeps the carousel's swipe and left/right keys active only on the switching cell, not on the columns that still fit — reverse: drop the .cc-box check in onPointerDown/onArrowKey
- D11 · 745 · none · behaviour: I did not tune any column's min width from the plan's starting values, because the [ui] checks could not be run here — reverse: change the min values in the columns list in inventory-product-list.component.ts
- D12 · 745 · none · behaviour: the swipe and arrow-key helper isCarouselActive() takes an optional group argument, so the other carousel lists keep today's phone-only behaviour — reverse: remove the argument
- D13 · 745 · none · seen: node scripts/kit-checks.mjs --base origin/main fails with 12 findings, such as reuse-undeclared src/styles.scss:3052 .c-tooltip--below. These come from plan 744, which is on the run branch but not on main. Against origin/orch/house-style-ui the check passes.
- D14 · 745 · none · seen: node scripts/ci-scope-check.mjs --checkout-branch printed 'skipped (branch "" is not feat/NNN-*)' because it read an empty branch name here. I could not confirm it.
- D15 · 746 · none · behaviour: kept every `min` at the plan's starting values, no tuning — reverse: edit the `columns` arrays in each list's .ts
- D16 · 746 · none · behaviour: the hidden recipe-book date column is converted to `*appFallColumn='date'` but not declared in `columns` (it stays hidden as today) — reverse: declare a `date` column before un-hiding it
- D17 · 746 · none · behaviour: the clients spec now checks the declared fall order through `columns()` instead of the old slide markup, because the measured mode renders no slides in a zero-width test — reverse: restore the markup assertions once a width is set in the test

## Run notes

- 743: decided without the Human: advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/appRoot/app.component.spec.ts, src/app/pages/dashboard/dashboard.page.spec.ts
- 744: decided without the Human: advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/pages/metadata-manager/components/station-manager/station-manager.component.spec.ts
- 746: decided without the Human: advisor · readiness: the question up front (tests and manifest the plan needs) answered: approved: src/app/pages/recipe-book/recipe-book.page.spec.ts
- 743: the folder foodVibe1.0-orch-house-style-ui-743 was installed (root, scripts, server)
- 743: builder left undone (round 0): [ui] item 1 (top bar at 900×800, /dashboard): written, not run; [ui] item 2 (settings at 375×812): written, not run; [human] cards for the top bar, metadata row, stage row, phone and dev catalog are left for Dandan
- 743: [ui] Top bar at tablet width: open `/dashboard` at 900×800 signed in; the element `app-scroll-rail.nav-pills` exists, its scroller has no horizontal scrollbar (: written, not run — checked by the run's [ui] step / the Human
- 743: the folder foodVibe1.0-orch-merge-house-style-ui was installed (root, scripts, server)
- 744: the folder foodVibe1.0-orch-house-style-ui-744 was installed (root, scripts, server)
- 744: builder left undone (round 0): [ui] The catalog sample (744-1): written, not run; [human] Cards: bell, product list status, recipe book cost, dialog hint, anchored popup, nutrition box unchanged — for the Human
- 745: the folder foodVibe1.0-orch-house-style-ui-745 was installed (root, scripts, server)
- 745: builder left undone (round 0): [ui] Wide (1600×900): written, not run (e2e/ui/745-1.spec.ts); [ui] Narrower (1000×800): written, not run (e2e/ui/745-2.spec.ts); [ui] Phone (375×812): written, not run (e2e/ui/745-3.spec.ts); The five existing product-list e2e specs at 375px (598-2, 599-2, 603-1, 603-2, 609-2) were not run: no app
- 746: the folder foodVibe1.0-orch-house-style-ui-746 was installed (root, scripts, server)
- 746: builder left undone (round 0): Card 746-1 (suppliers at 1000x800): written, not run; Card 746-2 (recipe book at 1000x800): written, not run; e2e 586-1, 603-3, 609-1 not run (no running app in the worktree)
- 746: decided without the Human: test changed — fewer checks?: src/app/pages/clients/components/client-list/client-list.component.spec.ts: 32 → 31 checks
- FINAL: same tree as plan 746's gate — node scripts/orch-state.mjs prepare --missing server/generated/schemas --script build:schemas --pm pnpm, pnpm run build, pnpm run lint, pnpm run test:ci, node scripts/override-check.mjs, pnpm run lint:icons, pnpm run lint:no-native-select, node scripts/plan-ledger-check.mjs, node scripts/breadcrumbs-check.mjs, node scripts/ci-scope-check.mjs --checkout-branch
- make this a default? the header brings the active link into view with a setTimeout(0) after NavigationEnd, so routerLinkActive has set `.active` first (the simplest option) — reverse: delete the router.events subscription (trigger: destructive-action) — reply: default yes run-destructive-action
- make this a default? the cost and date tooltips are templates inside their cells, with the same text as before — reverse: restore recipe-book-list.component.html from origin/main (trigger: list) — reply: default yes run-list

## Models per agent

- 743 builder: sonnet
- 743 reviewer: sonnet
- 744 builder: sonnet
- 744 reviewer: sonnet
- 745 builder: sonnet
- 745 reviewer: sonnet
- 746 builder: sonnet
- 746 reviewer: sonnet

## What only the Human can do

### Removed behaviour — check before merging the PR

1. 744: D5 removes: the product list badge's own open/close state (replaced by the shared tooltip, which opens on hover, focus and tap as before) — reverse: restore inventory-product-list.component.{html,ts,scss} from origin/main — open the screen; accept: decisions: ok · keep it: D5 ✗ restore
2. 744: D6 removes: the recipe book's own cost and date tooltip state and recipe-list-tooltips.service.ts (replaced by the shared tooltip) — reverse: restore recipe-book-list.component.{html,ts,scss} and services/recipe-list-tooltips.service.ts from origin/main — open the screen; accept: decisions: ok · keep it: D6 ✗ restore

### The plans' [human] items (no UI check ran)

3. 743: Top bar at tablet width: open `/dashboard` at 900×800 signed in; the element `app-scroll-rail.nav-pills` exists, its scroller has no horizontal scrollbar (`scro — a [ui] card no script could check and the browser step was off; on a page not named
4. 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag: Card — the top bar on a narrow computer window: narrow the browser window until the top navigation no longer fits; the links sit in the same white rounded container as before, an arrow appears at the edge that has more, pressing it moves the row, and you can grab the row with the mouse and drag it.
5. 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag: Card — the metadata row: open the dashboard's metadata tab on a tablet-width window; the row of section chips sits in the same container as the top bar, its arrows are inside the container at the edges, pressing a chip scrolls the page to that section smoothly and keeps that chip in view.
6. 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag: Card — the stage row in the menu builder: open an event in the menu builder on a narrow window; the stage row sits in the same container, the arrows and the drag work as in the top bar, and pressing a stage still changes the stage (a drag does not press it).
7. 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag: Card — a phone: open the settings page and a page with tab chips on a phone (or a 375px window); the rows sit in the container, there are no arrow buttons to press, and swiping moves the row.
8. 743 One sideways row container everywhere: a visible frame, edge arrows, grab-and-drag: Card — the dev catalog: open `/dev/catalog`; the "sideways row" entry shows the container with twelve chips; it looks like the up-and-down scroll area turned sideways.
9. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — the bell: on any signed-in page hover the notification bell, then reach it with Tab; the same small box appears beside it both times and disappears when you move away or press Escape.
10. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — the product list status: open the product list and hover (or tap) a row's warning badge; its reasons show in the same box, placed fully inside the screen, also on the first and the last visible row.
11. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — the recipe book cost: open the recipe book and hover a recipe's cost; the breakdown shows in the same box; on a phone-width window tapping the cost opens it and tapping elsewhere closes it.
12. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — an explanation of a control in a dialog shows as a tooltip (default `hints-in-tooltips`): a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal. Use the taxonomy manager's edit icon in the dashboard's metadata tab.
13. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — a small floating box stays inside the screen (default `anchored-popup`): any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off. Use the product list's warning badge.
14. 744 One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it: Card — the nutrition box did not change: open a product that has nutrition data and hover its nutrition badge; the box looks exactly as before.
15. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — columns fall one by one: open the product list on a wide window with the filters closed, then narrow the window slowly; first the unit and the supplier go into one switching column together, then the allergens, then the category; the name stays readable the whole time and nothing wraps or scrolls sideways.
16. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — they come back: widen the window again; the columns return in the opposite order.
17. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — the filter panel counts: on a medium window open the filter panel; more columns fall because the list got narrower; close it and they return.
18. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — switching works: when some columns are inside the switching column, press its arrow; every row shows the next piece of information, and the small label above the value says which one it is.
19. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — the other lists did not change: open the recipe book, suppliers, equipment, clients and the stock count on a wide window and on a phone-width window; they look and behave as before this change.
20. 745 List columns fall into the carousel one by one as the list gets narrower (mechanism + the product list): Card — every row of a list stays on one line (default `app-list-container`): any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line. Use the product list.
21. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — the recipe book: narrow the window slowly; the rating and the labels fall first (together), then the allergens, then the cost; the recipe name stays readable.
22. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — suppliers: narrow the window slowly; linked products and lead time fall first, the phone falls last.
23. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — equipment: narrow the window slowly; consumable and scaling rule fall first, the owned quantity falls last.
24. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — clients: narrow the window slowly; the two counts fall first, the phone falls last.
25. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — invoices: narrow the window slowly; the file and "saved at" fall first into a switching column, the supplier and the date always stay.
26. 746 The other five lists get falling columns: recipe book, suppliers, equipment, clients, invoices: Card — every row of a list stays on one line (default `app-list-container`): any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line. Use the recipe book.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/house-style-ui --title "Orchestrator run house-style-ui" --body-file .claude\orchestrator-runs\house-style-ui.md
```

Context added by learning: 3.7k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 0 · parked 0 → 0 → 0
