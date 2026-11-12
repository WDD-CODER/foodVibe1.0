# Orchestrator run batch-2

Run branch: `orch/batch-2` (from `origin/main` at ea0493b) · started 2026-11-12T05:53:31.987Z · finished 2026-11-12T08:16:13.987Z
Result: 7 merged, 0 parked, skipped or left out, 7 in the run (counted from git and status.json).
`main` untouched: yes (3 plan/todo file(s) changed on main) — origin/main is 6cc2223.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 546  | merged | 0 |  | 9ed16e2 |  |
| 547 Give clients their own section: list, add, search, filters and a navigation group | merged | 1 | build | 5fe2e68 |  |
| 567  | merged | 0 |  | cfeba39 |  |
| 568 Business report: where the business stands and how it moved since it started with FoodVibe | merged | 0 | build | 3aac89d |  |
| 579  | merged | 0 |  | 5890c38 |  |
| 580 AI menu: say why it failed, build it from the recipe book, count rejected calls as failed | merged | 1 | build | 5173ce6 |  |
| 581 Metadata card: edit and remove logistics questions, own sections, everybody or only-me | merged | 0 | build | 6951d49 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-12T05:53:31.987Z --level=error`
Exit code: 0

```text
2026-11-12T05:58:27.184Z error client error.unhandled dev-guest - [object Object]
2026-11-12T05:58:27.180Z error client dashboard.stats_failed dev-guest - Loading the dashboard numbers failed {"err":"[object Object]"}
2026-11-12T05:58:27.176Z error client error.unhandled dev-guest - [object Object]
2026-11-12T05:58:27.161Z error client crud.products.hydrate_error dev-guest - Failed to load products {"err":{"headers":{"headers":{},"normalizedNames":{},"lazyUpdate":null},"status":0,"statusText":"Unknown Error","url":"http://localhost:3001/api/v1/data/products","ok":false,"name":"HttpErrorResponse","message":"Http failure response for http://localhost:3001/api/v1/data/products: 0 Unknown Error","...
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 547 · none · behaviour: sort is a radio pair in the filter panel (last contact by default, or name), kept in the `sort` URL param — reverse: drop the sort category from client-list.component.html
- D2 · 547 · none · behaviour: kind, tag and lifecycle filters are multi-select chips, and a client matches when it has any selected value — reverse: change the filter in filteredClients_ to require all
- D3 · 547 · none · behaviour: the owner-only lifecycle filter is ignored for staff even if `life` is in the URL — reverse: drop the isOwner_() guard in filteredClients_
- D4 · 547 · none · behaviour: on a phone the row shows the name with the phone under it, and the other owner columns are hidden by CSS (display: none) — reverse: remove the max-width: 768px block in client-list.component.scss
- D5 · 547 · none · seen: src/testing/test-lucide-icons does not include user-plus, which is outside this plan's scope; the client-list spec adds UserPlus to its own icon pick
- D6 · 547 · none · behaviour: kept header.component.spec.ts and named it by full path in the plan's scope block, instead of reverting it, because the plan's Done-when requires the header spec update — reverse: remove the line and revert the spec
- D7 · 547 · none · behaviour: the unit specs set UserPlus in their own icon pick, because src/testing/test-lucide-icons is outside the plan's scope — reverse: add UserPlus to the shared test icons and drop the local pick
- D8 · 568 · none · behaviour: the revenue rule (actual -> planned -> pricing) is re-written in JS in business-report.js instead of imported, because business-stats.js is outside the scope and holds it as a Mongo expression — reverse: export it from business-stats.js in a scoped plan and import it
- D9 · 568 · none · behaviour: the report page lists up to 3 findings and shows each one's evidence count as a second line; the plan did not fix the wording — reverse: edit the finding block in report.page.html
- D10 · 568 · none · behaviour: change is returned as { changePct: null } or { changePts: null } when either side is not enough, and the UI hides it — reverse: omit the key on the server
- D11 · 568 · none · behaviour: added the dictionary keys report_evidence, report_estimates_only, report_est_hours_ordering, report_est_hours_quotes and report_est_waste, which the plan did not list — reverse: delete them and the lines that use them
- D12 · 580 · none · behaviour: /generate-menu's per-user limiter 429 carries no code, so the client maps any 429 without a code to ai_limit_reached (as the plan says) — reverse: add a code in rate-limit.js and a key in ERROR_KEYS
- D13 · 580 · none · behaviour: the daily-limit test in ai-menu.test.js uses its own user so the 20-per-15-minutes limiter is not hit by the other tests — reverse: none needed, test-only
- D14 · 580 · none · behaviour: aggregateAiUsage omits failures on the totals row, as the plan says — reverse: sum row.failures in the totals loop
- D15 · 581 · none · behaviour: the cancel button while editing uses c-btn-ghost, because there is no c-btn-secondary class — reverse: swap the class in the template
- D16 · 581 · none · behaviour: a hidden shared row shows no pencil or trash, only 'החזר' (restore) — reverse: change canEdit/canRemove in the sections computed
- D17 · 581 · none · behaviour: e2e/ui/523-2.spec.ts now asserts the trash button instead of `.c-chip--removable`, which no longer exists — reverse: restore the old assertion
- D18 · 581 · none · behaviour: the admin's scope radios stay visible but disabled while editing (the plan says disabled) — reverse: hide them with @if (!editing())

## Run notes

- 547: the folder foodVibe1.0-orch-batch-2-547 was installed (root, scripts, server)
- 547: builder left undone (round 0): e2e/ui/547-1 and 547-2 were not run here: nothing answered on :3000, so the QA sign-in cannot work in this worktree. The gate reruns them.
- 547: parked: nothing to save (nothing uncommitted)
- 547: ask 547-1 (technical, the Human or the advisor answers): Plan 547 failed twice for the same reason (scope: src/app/core/components/header/header.component.spec.ts). Leave it parked, or retry it?
- 547: ask 547-1 answered by the human: retry: the Human approved src/app/core/components/header/header.component.spec.ts. Plan 547's scope now names it (and src/app/core/components/tab-chips/tab-chips.component.spec.ts) by full path, on orch/batch-2 at 806e3e2a. Edit those two spec files as the plan's Done-when asks.
- 547: resumed from park/batch-2-547: round 1, tier build, after: asking 547-1: same reason twice: scope: src/app/core/components/header/header.component.spec.ts
- 547: the folder foodVibe1.0-orch-batch-2-547 was installed (root, scripts, server)
- 547: the folder foodVibe1.0-orch-merge-batch-2 was installed (root, scripts, server)
- 568: the folder foodVibe1.0-orch-batch-2-568 was installed (root, scripts, server)
- 580: the folder foodVibe1.0-orch-batch-2-580 was installed (root, scripts, server)
- 580: builder left undone (round 0): A13: the e2e specs 580-1..3 were not run (no slot app here); the two [human] cards are left for the Human
- 581: the folder foodVibe1.0-orch-batch-2-581 was installed (root, scripts, server)
- 581: builder left undone (round 0): A7: e2e/ui/581-1..4.spec.ts written and 523-2/523-3 updated, but not run, so no screenshots and 523-1/523-2 not re-run. localhost:3000 is down, and no slot ports are set for this worktree.

## Models per agent

- 547 builder: sonnet
- 547 reviewer: sonnet
- 568 builder: sonnet
- 568 reviewer: sonnet
- 580 builder: sonnet
- 580 reviewer: sonnet
- 580 builder fix: sonnet
- 581 builder: sonnet
- 581 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 547 Give clients their own section: list, add, search, filters and a navigation group: The list reads well in Hebrew on a phone and on a desktop: columns, chips for kinds and tags, the filter panel.
2. 568 Business report: where the business stands and how it moved since it started with FoodVibe: Dandan prints `/report` for a seeded business: one A4 page, RTL, readable, measured numbers clearly apart from the owner's estimates.
3. 580 AI menu: say why it failed, build it from the recipe book, count rejected calls as failed: On `/menu-library`, "צור עם AI" with a text that names no dish (for example "חתונה ל-120 אורחים, בופה, ביום חמישי הבא") gives a menu whose dishes all come from your recipe book and are all marked "זוהה"; after "החל", every line of the new menu opens the existing dish.
4. 580 AI menu: say why it failed, build it from the recipe book, count rejected calls as failed: On `/menu-library`, "צור עם AI" with a text that has no guest count (for example "בופה עם חומוס וסלט ירקות") shows "חסר מספר האורחים…"; then on `/platform`, in "שימוש ב-AI החודש", your business's "נכשלו" number went up by one, and resting the mouse on that number shows the reasons, including "חסר מספר אורחים: 1".
5. 581 Metadata card: edit and remove logistics questions, own sections, everybody or only-me: Signed in as an owner (not platform admin), removing a shared question asks once and then shows it dimmed with "הוסרה מהעסק שלך" and "החזר"; a new event does not list it, an event created before still does; "החזר" brings it back.
6. 581 Metadata card: edit and remove logistics questions, own sections, everybody or only-me: Signed in as the platform admin, removing a shared question asks "לכל העסקים" or "רק לעסק שלי"; "לכל העסקים" takes it off the card for every business while an event created before still shows it; "רק לעסק שלי" hides it only for the admin's business.
7. 581 Metadata card: edit and remove logistics questions, own sections, everybody or only-me: On a phone-size window the card's rows with their pencil and trash buttons, the environment chips and the admin's scope chips read well and are easy to tap.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/batch-2 --title "Orchestrator run batch-2" --body-file .claude\orchestrator-runs\batch-2.md
```

Context added by learning: 3.5k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0.33 → 0.4 → 0.29 · parked 0 → 0 → 0
