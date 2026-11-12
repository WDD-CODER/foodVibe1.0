# Plan 588 — A removed logistics question leaves the card after the visit, and sits behind a small "removed (N)" link

Status: draft
Depends-on: 581
Snapshot: 84a63416b39f6ee635f9921904af63d4db131a45

## Problem Statement
The Human validated batch-2 card ⑤ (plan 581, 2026-11-12): removing a shared question shows a dimmed row "הוסרה מהעסק
שלך" with "החזר". "This needs to disappear once the user has removed it … sit only until the first refresh or change and
exit out of the page … when the user signs in again and moves into the questions, he shouldn't see all the questions
that he removed." Verified on `orch/batch-2` at 84a63416: `logistics-item-manager.component.ts:133-153` builds every
section with hidden shared rows included (`hidden: shared && hiddenAt.has(term.key)`), so they show dimmed on every visit.

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts`
  (new cases: a row hidden before the component was created is not in the sections; a row hidden during this visit stays
  dimmed with "החזר" until the component is destroyed; the "removed (N)" link shows N = hidden rows and opens them;
  restoring from there puts the row back).
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] As an owner, remove a shared question: it shows dimmed with "החזר" while you stay; leave the page and come back
  (or refresh): it is gone from its section; the small "הוסרו (1)" link under the card shows it with "החזר".

## Execution Mode
Orchestrator run on a branch made from `orch/batch-2`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
e2e/ui/581-1.spec.ts
e2e/ui/581-2.spec.ts
```

## Read Scope
`src/app/core/services/logistics-item-registry.service.ts`, `e2e/ui/581-*.spec.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — display only: which hidden rows the card lists; no write path changes, the stored hidden keys and the server are
  unchanged.

## Reuse Check
- "removed (N)" toggle — family: none — rung: 4 — why: a `c-chip c-chip--tap` button with `aria-expanded`, the pattern
  plan 515 used for "more fields"; no shared component covers a reveal link.

## Step 0 — Reality Check
Confirm `sections` (or its computed) is the single place the card's rows come from.

## User Stories
- As an owner, I want questions I removed to stay out of my way, and still be able to bring one back if I change my mind.

## Functional Requirements

### Must Have (P0)
1. Keep a component-local `removedThisVisit_ = signal<Set<string>>()` (keys hidden during this visit). The sections show
   a hidden shared row only if its key is in that set (dimmed, "הוסרה מהעסק שלך" + "החזר", as today). The set is empty
   on every new visit, so a refresh, leaving the page or signing in again hides them.
2. Under the card, when any shared row is hidden: a `c-chip c-chip--tap` button "הוסרו (N)" (new dictionary key
   `logistics_removed_count`, Hebrew "הוסרו ({{count}})") with `aria-expanded`; open, it lists the hidden rows with
   "החזר". Restoring works as today and the row returns to its section.
3. The admin's "לכל העסקים" removal (removedAt for everybody) is unchanged: that row leaves at once.
4. Update `e2e/ui/581-1.spec.ts` / `581-2.spec.ts` if they assert the dimmed row after a reload.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- The link sits at the end of the card, small and muted; RTL.

## Atomic Sub-tasks
- [x] A1: Show a removed question only during the visit it was removed in — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] A2: Add the small removed-count link that lists removed questions with restore — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html, .scss, dictionary key
- [x] A3: Test it and keep the screen checks in line — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts, e2e/ui/581-1.spec.ts, e2e/ui/581-2.spec.ts

## What happens when
- No hidden rows → no link.
- The owner restores the last hidden row → the link disappears.

## Technical Considerations
- none.

## Out of Scope
- Events: what an event shows is unchanged (plan 581's rules).

## Critical Questions
- none. The "הוסרו (N)" link is the Planner's default so a removed question can still be restored; the Human can drop it.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12, batch-2 card ⑤ (quoted in the Problem Statement).
- pnpm run build → 0; pnpm run lint → 0; pnpm run test:ci → 0 (2010 SUCCESS; first run disconnected in an unrelated ExportService spec, rerun clean).
- e2e 581-1/581-2 do not assert the dimmed row after reload; left unchanged.
- behaviour: the "הוסרו (N)" list counts the selected phase's hidden rows, including ones still dimmed in their section this visit — reverse: filter them out of removedRows.
