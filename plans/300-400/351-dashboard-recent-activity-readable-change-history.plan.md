# Plan 351 — Dashboard "פעילות אחרונה": readable change history

Status: done
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

The dashboard's recent-activity list (`src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html:~120-203`) doesn't clearly show what changed from what to what. Each row has:

- `.act-avatar` (P/R/D)
- `.act-middle` (`.entity-type-tag`, `.activity-name`)
- a horizontally scrolling `.activity-changes` strip of `button.change-tag`, each printing `{{label}}: {{from}} → {{to}}` with raw values:
  - suppliers as joined IDs (`getSupplierIds(...).join(',')` in `KitchenStateService.buildProductChanges`, `kitchen-state.service.ts:~156`)
  - categories, allergens and units as English keys
  - course as `no_course`

Only the popover (`shared/change-popover`, `ChangePopoverComponent.formatChangeValue()`) translates. On top of that:

- The `→` reads backwards in RTL.
- Styling is tiny monospace nowrap (`.change-tag`, scss ~L554), with no visual difference between old and new.
- No time is shown, although `ActivityEntry.timestamp` exists (`activity-log.service.ts`).
- An "updated" entry with no changes shows nothing.

## Goals & Success Criteria

- Primary: each activity entry reads as who/what · action · when, followed by one line per change: field: old (struck through, muted) ← new (highlighted), with all values translated and suppliers shown by name.
- Success: no raw keys or IDs appear anywhere in recent activity, including entries recorded before this change.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching `src/app/pages/dashboard/components/dashboard-overview/**` or `src/app/shared/change-popover/**` (Plan 347, the keyboard plan, edits `dashboard-overview.component.scss` vh values: run after it).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/dashboard/components/dashboard-overview/**
src/app/shared/change-popover/**
src/app/core/pipes/activity-value.pipe.ts
src/app/core/pipes/activity-value.pipe.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef, I want to glance at recent activity and immediately understand what changed in each product or recipe, and when.

## Functional Requirements

### Must Have (P0)
- [x] New pure pipe `activityValue` (`core/pipes/activity-value.pipe.ts`): `value | activityValue: field`.
  - `field === 'supplier'`: split by `,` and map each id through `KitchenStateService.suppliersById_()` to `nameHebrew`. Unknown id → "ספק שנמחק".
  - Otherwise: split by `,`, translate each token via `TranslationService` (the same logic as `formatChangeValue`), join with "، ".
  - Empty → "—".
- [x] `ChangePopoverComponent` uses the pipe; delete `formatChangeValue`.
- [x] New entry layout (replaces the `.activity-changes` strip and `button.change-tag`):
  - Header line: type icon (product / recipe / dish, Lucide), name, action badge (נוסף / עודכן / נמחק), and relative time on the inline-end ("לפני 5 דק'", using `Intl.RelativeTimeFormat('he')`).
  - Change lines (stacked, max 3): `label:` · `<del class="act-old">old</del>` · Lucide `arrow-left` · `<ins class="act-new">new</ins>`. Old is muted with a strikethrough; new uses the primary color at medium weight.
  - If there are more than 3 changes: "+N שינויים נוספים" opens the existing popover.
  - "Updated" with no changes: show "עודכן" only (no empty strip).
- [x] Remove `scrollActivityChanges()` and the arrow buttons and styles of the old strip. Use the normal UI font size (no monospace).

### Should Have (P1)
- [x] Group entries by day headers ("היום", "אתמול", date) when the list spans multiple days.

### Nice to Have (P2)
- None.

## UI/UX Notes

- RTL reading order is old ← new (the arrow points left toward the new value).
- New dictionary keys (add if missing): `activity_more_changes` = "+{n} שינויים נוספים", `activity_deleted_supplier` = "ספק שנמחק", `activity_today` = "היום", `activity_yesterday` = "אתמול". Reuse the existing added/updated/deleted keys.
- Mobile: change lines wrap; no horizontal scroll.

## Atomic Sub-tasks

- [x] A1: `activityValue` pipe plus its spec: supplier ids → names, key translation, unknown id, empty (`core/pipes/activity-value.pipe.ts/.spec.ts`).
- [x] A2: Switch the popover to the pipe (`shared/change-popover/**`).
- [x] A3: New entry template and styles; delete the strip, scroll method and `.change-tag` styles (`dashboard-overview/**`).
- [x] A4: Relative time plus the optional day grouping (`dashboard-overview/**`).
- [x] A5: Build and run specs. Check at 360px and desktop. Update the session-state file.

## Technical Considerations

- Dependencies: `ActivityLogService` (read-only), `KitchenStateService.suppliersById_`, `TranslationService`, `ChangePopoverComponent`.
- New files: `activity-value.pipe.ts` plus its spec.
- Model changes: none. Supplier IDs are resolved at render time, so old stored entries also show names and `kitchen-state.service.ts` stays untouched.

## Out of Scope

- What gets recorded (`buildProductChanges` / `buildRecipeChanges`).
- Moving activity storage off localStorage.

## Critical Questions

1. How many change lines are shown per entry before "+N"?
   - a) 3 (default)
   - b) All

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/pipes/activity-value.pipe.spec.ts --include=src/app/pages/dashboard/**/*.spec.ts --include=src/app/shared/change-popover/**/*.spec.ts` → 0 failures.
- [auto] `rg -n "formatChangeValue|scrollActivityChanges|change-tag" src/app` → no matches.
- [auto] `npm run build` → exit 0.
- [human] Edit a product's supplier, category and price, then go to the dashboard. The entry shows the product name, "עודכן", "לפני רגע", and three lines like "ספק: ירקות כהן ← פירות השרון", all in Hebrew, with no IDs or English keys.
- [human] Phone: entries wrap cleanly, with no sideways scrolling.
