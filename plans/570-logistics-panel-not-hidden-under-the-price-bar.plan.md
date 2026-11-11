# Plan 570 — Keep the logistics panel's buttons out from under the price bar on wide screens

Status: draft
Depends-on: 522, 523
Snapshot: 2ecb0006be23a265123a05ef1b05259d24894d18

## Problem Statement
Found by the Planner on 2026-11-10 while running run-522's screen checks against `orch/run-522` (slot wt-2, 4202/3002):

- Plan 522 put the logistics panel last on the event screen (`menu-intelligence.page.html:242`, after the notes log).
- The price bar (`app-pricing-meter`, `pricing-meter.component.scss:9` `position: fixed; inset-block-end: 0; z-index: 90`) covers the bottom of the page. The page only leaves room for it between 769 px and 1030 px wide (`menu-intelligence.page.scss`, plan 494: `@media screen and (min-width: $break-meter-full) and (max-width: $break-meter-clear) { .menu-editor-shell { padding-block-end: calc(17rem + var(--space-6)) } }`).
- Measured with the page scrolled to the bottom: at 1280×720 the panel's open/close button (top 567, bottom 599) sits under the bar (bar top 552), and the click lands on the bar. At 1440×900 the closed panel is reachable, but once it is open the "העתק סיכום ללקוח" and "סיימתי את השלב" buttons are under the bar. Playwright: `<span class="partial-tag">לא הוגדר מחיר ללקוח</span> from <app-pricing-meter> subtree intercepts pointer events`.
- Specs 522-5 and 522-6 time out for this reason. 522-1 to 522-4 pass at 1440×900.
- Separately, specs 523-1/2/3 open `/metadata-manager`, which redirects to `/dashboard` without the `tab=metadata` query (`app.routes.ts:117` `redirectTo: 'dashboard?tab=metadata'`), so they never see the card. With `page.goto('/dashboard?tab=metadata')` all three pass.

## Goals & Success Criteria
**Primary:** every control of the logistics panel can be tapped at any screen width with the price bar showing, and run-522's 9 screen checks pass.

- [ui] At 1280×720, on `/menu-intelligence/<id>` of a QA event, scrolled to the bottom, the logistics open/close button is clickable and the card opens (`e2e/ui/570-1.spec.ts`).
- [ui] The builder also re-runs specs 522-1…6 and 523-1…3 against the slot app; all pass. At 1440×900, after opening the card on "פגישת ספקים" and marking one item "נדרש" / "ללקוח", "העתק סיכום ללקוח" is clickable and "הועתק" shows (`e2e/ui/522-5.spec.ts`, unchanged).
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On a laptop screen (about 1280 px wide), the event screen's last card and the notes are fully visible above the price bar, and the page does not look padded too much at the bottom.

## Execution Mode
- Parallel: yes — only this page's style file and these specs.
- Concurrent plans: any that do not touch `menu-intelligence.page.scss` or `e2e/ui/522-*`, `523-*`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
e2e/ui/522-5.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.scss
e2e/ui/523-1.spec.ts
e2e/ui/523-2.spec.ts
e2e/ui/523-3.spec.ts
e2e/ui/570-1.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — one page style rule and test files; no data, permission or server change.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; one existing page rule is widened.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to reach every button of the logistics card on my laptop so that I can finish a phone intake without resizing the window.

## Functional Requirements

### Must Have (P0)
- [ ] `menu-intelligence.page.scss`: the plan-494 clearance applies at every width where the price bar shows its full body — change the media query to `@media screen and (min-width: $break-meter-full)` (drop `and (max-width: $break-meter-clear)` and the now-unused `$break-meter-clear` variable with its comment line). Keep `padding-block-end: calc(17rem + var(--space-6))` and the comment's plan 494 reference; add "plan 570: all wide screens, the logistics panel is last".
- [ ] Specs 523-1, 523-2, 523-3: `page.goto('/metadata-manager')` → `page.goto('/dashboard?tab=metadata')`. Nothing else changes in them.
- [ ] New `e2e/ui/570-1.spec.ts`: `test.use({ viewport: { width: 1280, height: 720 } })`; signs in with `signInQa`, creates an event with `createQaEvent`, opens `/menu-intelligence/<id>`, scrolls to the bottom, clicks `app-event-logistics-panel .logistics-toggle` with `{ timeout: 5000 }`, asserts the tab "שיחה ראשונה" is selected, saves `screens/570-1.png`, deletes the event in `finally`.

## UI/UX Notes
- No new strings or icons.

## Atomic Sub-tasks

- [x] A1: Leave room for the price bar on every wide screen, not only up to 1030 px — widen the plan 494 media query — src/app/pages/menu-intelligence/menu-intelligence.page.scss
- [x] A2: Point the three logistics-card checks at the page that really shows the card — goto /dashboard?tab=metadata — e2e/ui/523-1.spec.ts, e2e/ui/523-2.spec.ts, e2e/ui/523-3.spec.ts
- [x] A3: Add a laptop-size check that the logistics card opens with the price bar showing — e2e/ui/570-1.spec.ts
- [ ] A4: Run the ten screen checks against the slot's app, then build, lint and log-query

## Technical Considerations
- Dependencies: plan 494's clearance rule; plan 522's panel position.
- New files needed: `e2e/ui/570-1.spec.ts`.
- Model changes: none
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; no dictionary keys; no icons. Run the specs with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports (the helpers default to 4200/3000), and restart the slot's backend between full runs — login is rate-limited (429 after about 10 sign-ins).

## Out of Scope
- Changing the price bar's height or making it collapsible.
- The phone layout (below 769 px the bar is a small button; 390×844 measured clickable).

## Critical Questions
- none

## Execution Notes
- Evidence 2026-11-10 (Planner, wt-2 on orch/run-522 @ 0bb23f01): at 1440×900, 522-1…4 and the three 523 specs with the corrected URL passed; 522-5 and 522-6 failed on "app-pricing-meter subtree intercepts pointer events".
- 2026-11-10 builder: pnpm run build -> exit 0; pnpm run lint -> exit 0 (0 errors). Screen specs 522-1…6, 523-1…3, 570-1 NOT run (no slot app/backend in this worktree); A4 left unticked for the gate/Human.
