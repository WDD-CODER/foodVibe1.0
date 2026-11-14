# Plan 598 — The floating create button stays off the form action buttons on phones

Status: draft
Track: design
Depends-on: none
Snapshot: afc44e92a6feab13662761f19e5456c724d13fc3

## Problem Statement

The full Style QA run of 2026-11-14 found (high, V6-90d67c32 / V6-7403a750) that on the product form at 375px
(`/inventory/add`, `/inventory/edit/:id`) the round floating create button (`app-hero-fab`, fixed at the bottom
inline-end corner, `src/app/core/components/hero-fab/`) sits on top of the "חזור לרשימה" button in the form's action
row and clips its label. The same fixed button shares that corner with the action row of every add/edit form
(equipment, supplier, venue), so the overlap depends only on how long the form is.

The FAB offers "create" shortcuts. On an add or edit form the chef is already creating, so the shortcut adds nothing
there and only gets in the way.

## Goals & Success Criteria
**Primary:** at phone width (≤620px) the floating button is not shown on entity add and edit forms, so nothing covers the form's action buttons.

Done when:
- [human] Nothing else moved: the floating button is unchanged on every other page, and on add/edit forms at tablet and desktop widths.
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 375x812 on `/inventory/add` signed in, `.hero-fab-container` is not visible and the "חזור לרשימה" button is
  visible and clickable — `e2e/ui/598-1.spec.ts`, screenshot `screens/598-1.png`
- [ui] At 375x812 on `/inventory/list` signed in, `.fab-main` is visible — `e2e/ui/598-2.spec.ts`, screenshot
  `screens/598-2.png`
- [human] On a phone, open "add product", then "add supplier": no round button over the bottom buttons; back on the
  product list the round button is there again.

## Execution Mode

- Parallel: yes — no other open plan writes the hero FAB.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/hero-fab/hero-fab.component.ts
src/app/core/components/hero-fab/hero-fab.component.html
src/app/core/components/hero-fab/hero-fab.component.scss
src/app/core/components/hero-fab/hero-fab.component.spec.ts
e2e/ui/598-1.spec.ts
e2e/ui/598-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a route check and a phone-width style in the FAB component; no server, schema, ownership or AI
  path is touched.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; the FAB's existing route signals
  (`isOnWelcome_`, `isOnMenuIntelligence_`) get one more sibling.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef adding a product on my phone, I want the "back" and "save" buttons fully visible so that I never tap the
  floating button by mistake.

## Functional Requirements

### Must Have (P0)
- [ ] `hero-fab.component.ts`: a private `isOnEntityForm_` signal set in the existing `setRoute()` from the router URL,
  true when the path (query string removed) matches `^/(inventory|inventory/equipment|suppliers|venues)/(add|edit/[^/]+)$`.
- [ ] `hero-fab.component.html`: the container gets `[class.hide-on-phone]="isOnEntityForm_()"`.
- [ ] `hero-fab.component.scss`: `@media (max-width: 620px) { .hero-fab-container.hide-on-phone { display: none; } }`.
  Above 620px the class does nothing.

### Should Have (P1)
- [ ] The FAB spec covers the route match: true for `/inventory/add`, `/inventory/edit/abc`,
  `/inventory/equipment/add`, `/suppliers/edit/abc`, `/venues/add`; false for `/inventory/list`, `/venues/view/abc`,
  `/recipe-builder`.

## UI/UX Notes

- Hiding, not moving: the action row already carries the page's main action, so a second create button is noise there.

## Atomic Sub-tasks

- [x] 598-A1: Teach the floating button to recognise add and edit form pages — isOnEntityForm_ signal from the router URL — src/app/core/components/hero-fab/hero-fab.component.ts
- [x] 598-A2: Hide the floating button on add and edit forms at phone width only — hide-on-phone class and a 620px media rule — src/app/core/components/hero-fab/hero-fab.component.html, src/app/core/components/hero-fab/hero-fab.component.scss
- [x] 598-A3: Cover which routes count as a form page in the floating button's spec — src/app/core/components/hero-fab/hero-fab.component.spec.ts
- [x] 598-A4: Prove on a phone-sized screen that the form buttons are clear and the list still has the button — e2e/ui/598-1.spec.ts, e2e/ui/598-2.spec.ts

## Technical Considerations

- The route list mirrors `src/app/app.routes.ts` as of the snapshot; a new add/edit route later needs adding here.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The FAB on recipe builder and menu intelligence (they already have their own handling).
- Moving the form action row or making it sticky.

## Critical Questions

- none

## Execution Notes
- pnpm run build, lint, test:ci -> exit 0 (2184 SUCCESS)
- [ui] items: e2e/ui/598-1.spec.ts, 598-2.spec.ts written, not run
