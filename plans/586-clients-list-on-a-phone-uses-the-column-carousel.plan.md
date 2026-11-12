# Plan 586 — The clients list on a phone works like the other list pages: name fixed, other columns in the column carousel

Status: draft
Depends-on: 547
Snapshot: 84a63416b39f6ee635f9921904af63d4db131a45

## Problem Statement
The Human validated batch-2 card ① (plan 547, 2026-11-12): "in mobile its really bad! … have this like [the] different
list pages that we have, using the carousel in order to switch between different parameters." Verified on
`orch/batch-2` at 84a63416:

- `src/app/pages/clients/components/client-list/client-list.component.html` passes `[mobileGridTemplate]="'1fr'"` to
  `app-list-shell` and hides `.col-phone`, `.col-last`, `.col-events`, `.col-requests` under `@media (max-width: 768px)`
  in `client-list.component.scss`, showing only the name with the phone under it.
- The other list pages (suppliers, equipment, inventory products, recipe book) keep the name column and put the rest in
  `app-column-carousel-header` / `app-column-carousel-cell` (`src/app/shared/column-carousel/`, family `list-page` in
  `docs/brain/component-families.md`), with `appColumnSlide label="…"` on each column; see
  `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html:58-77` and `:120-139`, and its
  `[mobileGridTemplate]="'2fr 1fr 40px 28px'"`.

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/clients/components/client-list/client-list.component.spec.ts` (new case: the header renders
  `app-column-carousel-header` with one `appColumnSlide` per non-name column — phone, kinds, tags, last contact,
  events, requests — the owner-only columns only for an owner; every existing case still passes).
- [auto] `pnpm run build`, `pnpm run lint`, `node scripts/reuse-lint.mjs --diff=origin/main` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At a 390×844 window, on `/clients` as a QA owner, each row shows the client name and one more column; swiping
  or tapping the carousel arrows in the header changes that column to the next one (phone → kinds → …)
  (`e2e/ui/586-1.spec.ts`).
- [human] On a phone the clients list looks and moves like the suppliers list.

## Execution Mode
Orchestrator run on a branch made from `orch/batch-2`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/pages/clients/components/client-list/client-list.component.ts
src/app/pages/clients/components/client-list/client-list.component.html
src/app/pages/clients/components/client-list/client-list.component.scss
src/app/pages/clients/components/client-list/client-list.component.spec.ts
docs/brain/component-families.md
e2e/ui/586-1.spec.ts
```

## Read Scope
`src/app/shared/column-carousel/**`, `src/app/shared/list-shell/**`, `src/app/pages/suppliers/components/supplier-list/**`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — template and style change of one list component; no data, server or schema path.

## Reuse Check
- `app-column-carousel-header` / `app-column-carousel-cell` in the client list — family: list-page — rung: 1 — why:
  the same carousel the supplier list uses; no new component.

## Step 0 — Reality Check
Open `/suppliers` at 390×844 and note how the carousel header and cells behave; the clients list copies that.

## User Stories
- As a chef on a phone, I want to see each client's name and switch between their phone, kinds, tags and dates, like on
  my other lists.

## Functional Requirements

### Must Have (P0)
1. The name column stays fixed; phone, kinds, tags, last contact, events and requests move into
   `app-column-carousel-header` (header) and `app-column-carousel-cell` (each row), each with `appColumnSlide` and its
   existing translation key as `label`. The owner-only columns stay owner-only.
2. `mobileGridTemplate` follows the supplier list's pattern (name, one carousel column, actions/select as the client
   list has them).
3. Remove the `@media (max-width: 768px)` block that hides the columns, and the `.phone-inline` copy of the phone under
   the name (the carousel shows the phone).
4. Desktop is unchanged: every column visible as today.
5. Add "client list" to the `list-page` family's users in `docs/brain/component-families.md`.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- RTL; the carousel component already handles direction.

## Atomic Sub-tasks
- [ ] A1: Move the clients list's extra columns into the shared column carousel on phones — client-list.component.{html,scss,ts}
- [ ] A2: Test the carousel header and keep every old case passing — client-list.component.spec.ts
- [ ] A3: Phone-size screen check and the family registry line — e2e/ui/586-1.spec.ts, docs/brain/component-families.md

## What happens when
- A staff member (not owner) opens the list on a phone → the carousel offers only the columns staff see.

## Technical Considerations
- none beyond the supplier list's pattern.

## Out of Scope
- New columns, sorting or filter changes.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12, batch-2 card ①: phone layout must match the other list pages (column carousel).
