# Plan 567 — Optional "before" numbers: kitchen and front desk estimates the owner may skip

Status: done
Depends-on: none
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Dandan wants to show an owner, with numbers, how the business moved since it started with FoodVibe (map row 15b,
FD-14, brief D15/D16). The main comparison is measured (plan 568). The owner's own "before" estimate is an optional
extra column — but its fields must exist before the pilot business is onboarded, or the estimate is never asked.
Today the baseline (plan 431) holds only four event numbers. This plan adds eleven optional estimate fields in two
collapsed groups, and nothing becomes required (D15: the baseline is never a gate).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `shared/schemas/entities/business.schema.ts:24` `baselineInputSchema` = `inquiriesPerMonth`, `eventsClosedPerMonth`, `avgRevenuePerEvent`, `estProfitPct` (all optional); `businessBaselineSchema` = input + `filledAt`; an empty baseline (only `filledAt`) means "skipped".
- `server/routes/business.js:100` `PUT /api/v1/business/baseline` — owner only, `baselineInputSchema.safeParse`, whole replace, `filledAt` server-set. No code change is needed there: it validates with the schema.
- `server/services/business-stats.js:105` `BASELINE_FIELDS` = the same four names as a literal, used for `hasBaseline` on the dashboard cards.
- `src/app/pages/settings/components/baseline-tab/baseline-tab.component.ts` (152 lines): a `fields: FieldDef[]` list of four, `filledAt` and `canSave` computed over `fields`; template loops `fields` with `appNumberBox`.
- Dictionary keys `baseline_*` exist (`baseline_intro`, `baseline_saved`, …). Icons `chevron-down`, `chevron-up` are registered in `src/app/app.config.ts`. `.c-chip--tap` exists in `src/styles.scss:2204`.
- Tests: `server/test/business-baseline.test.js`, `server/test/business-stats.test.js`, `baseline-tab.component.spec.ts`.

## Goals & Success Criteria
**Primary:** the owner can store any of eleven new estimate fields (or none) from Settings → פרטי פתיחה, and the
dashboard behaves exactly as before.

- [auto] `pnpm run test:server` passes, including the new cases in `server/test/business-baseline.test.js`: all fifteen fields round-trip; `foodCostPct: 120` → 400 and nothing stored; a body with only kitchen fields is stored and `GET /api/v1/stats/business` still answers `hasBaseline: false` (the dashboard cards compare only the four card fields).
- [auto] `pnpm run test:ci` passes, including `baseline-tab.component.spec.ts`: both groups start closed when nothing is stored; a group opens on its own when the stored baseline has a value in it; saving with only `wastePct` filled sends `{ wastePct }`; "updated on" shows when only a group field is stored.
- [ui] On `/settings?tab=baseline`, clicking "מטבח" opens the group, typing `30` in "עלות מזון מתוך ההכנסה (%)" and saving shows the toast "פרטי הפתיחה נשמרו"; after a reload the field shows `30` (`e2e/ui/567-1.spec.ts`).
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` and `pnpm --dir server run lint` exit 0.
- [auto] `pnpm run lint:icons` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] The tab reads as clearly optional: the two group hints say these are estimates and may be skipped.

## Execution Mode
- Parallel: no — plans 568 and 559 edit `server/services/business-stats.js`; 556 and 559 edit `server/routes/business.js` (map "must not run at the same time"). Runs first in wt-3.
- Concurrent plans: none
- Isolated DB: no — new optional fields only; stored documents stay valid.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
baseline-tab.component.spec.ts
shared/schemas/entities/business.schema.ts
server/services/business-stats.js
server/test/business-baseline.test.js
src/app/pages/settings/components/baseline-tab/**
public/assets/data/dictionary.json
e2e/ui/567-1.spec.ts
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the new fields are added to the one Zod schema in `shared/schemas`; the server keeps validating every baseline write with it.
- INV-2: preserves — `business-stats.js` only imports the card-field list from the schema; no query or scope changes.

## Reuse Check

- Collapsible group toggle on the baseline tab — family: chip — rung: 1 — why: a `c-chip c-chip--tap` button with `aria-expanded` and a `chevron-down` / `chevron-up` icon, as the app already uses for "more fields".
- New number fields — family: number-box — rung: 1 — why: the same `appNumberBox` label + `c-input-wrapper` markup the four existing fields use.
- `BASELINE_CARD_FIELDS`, `BASELINE_KITCHEN_FIELDS`, `BASELINE_FRONTDESK_FIELDS` constants — family: none — rung: 4 — why: schema constants, not a UI piece; they replace the literal in `business-stats.js` so client and server read one list.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to note roughly how my kitchen and my phone line ran before FoodVibe so that the report can show it beside what FoodVibe measured.
- As an owner, I want every one of these numbers to be skippable so that onboarding never stops on a number I do not know.

## Functional Requirements

### Must Have (P0)
- [ ] `baselineInputSchema` gains, all `.optional()`:
  - kitchen: `foodCostPct: z.number().min(0).max(100)`, `hoursPerWeekOrdering: z.number().min(0).max(168)`, `hoursPerWeekQuotes: z.number().min(0).max(168)`, `wastePct: z.number().min(0).max(100)`, `supplierOverrunPct: z.number().gt(-100).lt(100)`;
  - front desk: `phoneInquiriesPerDay: z.number().min(0)`, `messagesPerDay: z.number().min(0)`, `avgResponseMinutes: z.number().min(0)`, `hostHoursPerWeek: z.number().min(0).max(168)`, `noShowsPerWeek: z.number().min(0)`, `missedInquiriesPerWeek: z.number().min(0)`.
- [ ] Same file exports `BASELINE_CARD_FIELDS = ['inquiriesPerMonth','eventsClosedPerMonth','avgRevenuePerEvent','estProfitPct'] as const`, `BASELINE_KITCHEN_FIELDS` (the five kitchen names) and `BASELINE_FRONTDESK_FIELDS` (the six front desk names), each `as const`.
- [ ] `server/services/business-stats.js`: `BASELINE_FIELDS` becomes `BASELINE_CARD_FIELDS` imported from `../generated/schemas/entities` (export name `BASELINE_FIELDS` kept for callers). Behaviour unchanged: `hasBaseline` looks at the four card fields only.
- [ ] `PUT /api/v1/business/baseline` keeps its behaviour (owner only, whole replace, empty = skipped) — no change in `server/routes/business.js`.
- [ ] Baseline tab: the four existing fields stay first and unchanged. Below them two groups, each a `c-chip c-chip--tap` header button (`aria-expanded`, `aria-controls`, icon `chevron-down` closed / `chevron-up` open) and, when open, a one-line hint and its fields with the existing field markup:
  - "מטבח" — `foodCostPct` (%), `hoursPerWeekOrdering`, `hoursPerWeekQuotes`, `wastePct` (%), `supplierOverrunPct` (%);
  - "לקוחות ופניות" — `phoneInquiriesPerDay`, `messagesPerDay`, `avgResponseMinutes`, `hostHoursPerWeek`, `noShowsPerWeek`, `missedInquiriesPerWeek`.
  A group starts closed; it starts open when the stored baseline has a value in one of its fields. Opening or closing a group never changes form values.
- [ ] `filledAt` and `canSave` cover all fifteen fields (today they look at `fields`, the four). Only filled fields are sent (`null` is not sent), as today. The skip button and the first-visit flow (`?first=1`) are unchanged.
- [ ] Form validators match the schema ranges; the existing `baseline_value_invalid` error shows under a bad field. Group fields get `data-testid="baseline-<key>"` like the existing ones.
- [ ] `docs/agent/standards-backend.md` §5: the `PUT /api/v1/business/baseline` row (if present) lists the new optional fields; otherwise add one sentence under the table.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL, logical properties only; group spacing in `baseline-tab.component.scss`.
- New dictionary keys (append-only, Hebrew values):
  - `baseline_group_kitchen`: "מטבח"
  - `baseline_group_frontdesk`: "לקוחות ופניות"
  - `baseline_group_hint`: "הערכה של בעל העסק בלבד – אפשר לדלג על כל שדה. המספרים ש-FoodVibe מודד הם העיקר."
  - `baseline_food_cost_pct`: "עלות מזון מתוך ההכנסה (%)"
  - `baseline_hours_per_week_ordering`: "שעות בשבוע על הזמנות מספקים"
  - `baseline_hours_per_week_quotes`: "שעות בשבוע על הצעות מחיר"
  - `baseline_waste_pct`: "פחת ובזבוז מזון (%)"
  - `baseline_supplier_overrun_pct`: "חריגה מעלות הספקים המתוכננת (%)"
  - `baseline_phone_inquiries_per_day`: "שיחות פנייה ביום"
  - `baseline_messages_per_day`: "הודעות מלקוחות ביום"
  - `baseline_avg_response_minutes`: "זמן מענה ממוצע (דקות)"
  - `baseline_host_hours_per_week`: "שעות מענה ללקוחות בשבוע"
  - `baseline_no_shows_per_week`: "לקוחות שלא הגיעו בשבוע"
  - `baseline_missed_inquiries_per_week`: "פניות שפוספסו בשבוע"
- Icons: `chevron-down`, `chevron-up` (already registered).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let the baseline hold eleven more optional estimates, and name the field groups once — schema fields with ranges, the three field-list constants — shared/schemas/entities/business.schema.ts
- [x] A2: Keep the dashboard cards comparing only their four numbers — import the card list into business-stats instead of the literal — server/services/business-stats.js
- [x] A3: Prove the server stores the new fields, refuses bad ones and leaves the cards alone — round trip, 400 on 120%, kitchen-only keeps hasBaseline false — server/test/business-baseline.test.js
- [x] A4: Show the new estimates in two closed groups on the baseline tab — group buttons, hints, fields, filledAt and canSave over all fields, dictionary keys — src/app/pages/settings/components/baseline-tab/**, public/assets/data/dictionary.json
- [x] A5: Test the tab and the save flow — component spec cases, one e2e card — src/app/pages/settings/components/baseline-tab/baseline-tab.component.spec.ts, e2e/ui/567-1.spec.ts
- [x] A6: Note the new fields in the backend docs and run every check — standards-backend line; test:server, test:ci, build, lint, lint:icons, log-query — docs/agent/standards-backend.md

## Technical Considerations
- Dependencies: `baselineInputSchema` is also the input type `BaselineInput` used by `BusinessService.saveBaseline` (`src/app/core/services/business.service.ts:56`) — it widens automatically.
- New files needed: `e2e/ui/567-1.spec.ts`.
- Model changes: `BaselineInput` / `BusinessBaseline` gain the optional fields (inferred).
- Backend / API: none new; `PUT /business/baseline` accepts more optional fields.
- Auth and validation: unchanged — owner only; Zod ranges above.
- Security surface: none. `baseline` is already a money field for staff reads (`shared/schemas/money-fields.ts`).
- Data / migration: none; old documents stay valid.
- Project checks: log-query item; dictionary keys named; icons named; Reuse Check filled.

## Out of Scope
- Showing these estimates anywhere (plan 568 shows the kitchen ones in the report, plan 559 the front desk ones).
- Any onboarding step that asks for them (plan 556; D15 — never required).
- Changing the four existing fields or the dashboard cards.

## Critical Questions
- none

## Execution Notes
- Map row 15b (renumbered +2: old 565 → 567). Front desk baseline fields moved here from FD-09 per FD-14.
- pnpm run build -> exit 0; pnpm run lint -> exit 0 (0 errors); pnpm run lint:icons -> exit 0
- pnpm run test:server -> exit 0, 1142 passed (new cases in business-baseline.test.js)
- pnpm run test:ci -> exit 0, 1948 SUCCESS (new baseline-tab spec cases)
- breadcrumbs-check -> clean; log-query -> SKIP: no database configured
- e2e/ui/567-1.spec.ts written, not run here (needs QA login and a running app); the gate runs it.
- No server/routes change needed; standards-backend got a `PUT /business/baseline` row.
