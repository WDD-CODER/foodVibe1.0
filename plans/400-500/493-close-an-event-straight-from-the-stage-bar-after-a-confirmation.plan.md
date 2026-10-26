# Plan 493 — Close an event straight from the stage bar after a confirmation

Status: done
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
Dandan's QA report 2026-10-22, item 17 (check 60): "clicking «הסתיים» is blocked with a text message. Allow picking
it; open a confirmation popup: «האם אתה בטוח שברצונך לסגור את האירוע ללא פוסט-פרודקשן?». Closing without
post-production must not break any backend event flow or state." This replaces passed check 60 («הסתיים» cannot be
picked), the one planned exception in `docs/mvp/run-mode-qa-fixes.md` "Passed checks".

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- The stage bar is `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.{ts,html}`
  (plans 443, 446, 467, 477, 479). `pick()` refuses the stage first thing:
  `event-stage-bar.component.ts:135` `if (stage === 'finished') return this.showError('stage_finished_hint')` — the
  toast «"הסתיים" נקבע רק דרך "סיים אירוע"» (`public/assets/data/dictionary.json:1184`). The template locks the pill for
  everyone: `event-stage-bar.component.html:11` `[class.is-locked]="stage === 'finished' || …"`, `:13` `aria-disabled`,
  `:14-20` the same hint as the tooltip. The class comment `ts:40-45` says the bar never picks «הסתיים».
- The only door to «הסתיים» is `POST /api/v1/events/:id/finish` (`server/routes/events.js:209-227`): owner only
  (`assertCan(…'editMoney'…)`, `:214`), and only from `CLOSING_STAGES = ['execution', 'post_production']`
  (`server/utils/closing-rules.js:13`, checked at `events.js:216` → `400 FINISH_FROM_STAGE`). `PUT /:id/stage` refuses
  `finished` with `USE_FINISH` (`server/utils/event-stage.js:26`) and must stay that way (one door).
- `finishPatch` (`closing-rules.js:108-113`) builds the closing from `event.planSnapshot` (`initClosing`), stamps
  `finishedAt/finishedBy`, sets `closedAt` when missing and pushes a `finished` history entry; the write is conditional
  on the stage that was read (`events.js:172-185` `writeConditional`).
- The planning snapshot is stored on «הזמנות» and frozen on «ביצוע»/«פוסט-פרודקשן» (`shared/schemas/entities/event-stage.ts:28-33`
  `snapshotActionOnStage`). An event finished from «פנייה» … «הזמנות» would have no frozen snapshot, so:
  the dashboard revenue (`server/services/business-stats.js:37-43` `closedRevenue`: once `closing.finishedAt` is set it
  takes `closing.actualRevenue ?? planSnapshot.plannedRevenue ?? 0`, never `pricing.revenue`) would drop to 0, and the
  closing would have no supplier rows. This is why the server must store + freeze the snapshot in the same finish
  request when the event has none.
- The client already builds the snapshot for stage moves: `event-stage-bar.component.ts:220-237` `move()` uses
  `snapshotOnStageChange` (`src/app/core/engine/plan-snapshot.ts:26-28`) + `PlanSnapshotService.buildFor(event)`.
  `EventPipelineService.finish(eventId)` (`src/app/core/services/event-pipeline.service.ts:53-55`) posts an empty body.
- The closing dialog's own «סיים אירוע» (`event-closing-dialog.component.ts:164-177`, `canFinish_` `:88-91`) and reopen
  (`:179-184`, server `events.js:229-255` → back to «פוסט-פרודקשן») are passed check 99 and stay as they are.
- History in git: 443 (`95d31987`) built the bar, 446 (`f5d9e58e`) the finish/reopen routes, 479 (`6259b1bc`) the pill
  styles (rules moved out of `@layer`, `docs/mvp/runs/479.md`). No plan 459–485 touched the finish rule.
  `plan-name-similarity` → no similar plans.

## Goals & Success Criteria
- Primary: the owner can click «הסתיים» on the stage bar from any live stage; a popup asks
  «האם אתה בטוח שברצונך לסגור את האירוע ללא פוסט-פרודקשן?»; on yes the event is finished through the same server
  door as the closing dialog, with a valid history, closing and frozen plan, and it can be reopened as before.
- As a chef, I want to mark an event finished straight from the stage bar so that I don't have to go through
  post-production for an event I won't close in detail.
- Success:
  - [x] [auto] `npx ng build` passes (exit 0).
  - [x] [auto] `npx ng test --watch=false --include=src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts --include=src/app/core/services/event-pipeline.service.spec.ts --include=src/app/core/utils/event-stage-ui.util.spec.ts --include=src/app/pages/menu-intelligence/components/event-closing-dialog/event-closing-dialog.component.spec.ts` → all pass, including the new specs: owner clicks «הסתיים» → confirm opens with `stage_finish_confirm`; yes → `pipeline.finish('e1', snapshot)` when the event has no frozen snapshot and `pipeline.finish('e1', undefined)` when it has one; no → nothing is called; staff (no `editMoney`) → no confirm, toast `stage_finish_owner_only`; no event date → toast `stage_finish_needs_date`, no confirm; current «לא נסגר» → toast `stage_finish_from_not_closed`; the «הסתיים» pill has no `is-locked` / `aria-disabled` for the owner on a live event; `changeStage` is never called with `finished`; `finish(id, snapshot)` posts `{ planSnapshot }`, `finish(id)` posts `{}`.
  - [x] [auto] `npm test --prefix server -- events-closing business-stats event-stage` → all pass, including: owner finishes from «פנייה» (with date) with a snapshot in the body → 200, stage `finished`, `planSnapshot.frozenAt` set, `closing.suppliers` built from that snapshot, `closedAt` set, history ends `finished`; a frozen snapshot in the body of an `execution` event is ignored (stored one kept); finish from «לא נסגר» → 400 `FINISH_FROM_STAGE`; from «פנייה» with no date → 400 `DATE_REQUIRED`; staff → 403; `PUT /stage {stage:'finished'}` still 400 `USE_FINISH`; reopen of an event finished from «פנייה» → «פוסט-פרודקשן» with finish stamps removed; business-stats: an event finished straight from «פנייה» counts once in `closed` and with its snapshot's planned revenue in `revenue`.
  - [x] [auto] `node scripts/reuse-lint.mjs` → no new warning in the changed files.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Owner replay of check 60 (desktop 1440 px, owner): SETUP open `/menu-library?new=inquiry`, create an event «בדיקה 493 א» with a date next week; it opens at `/menu-intelligence/<id>` in «פנייה». DO click the «הסתיים» pill. SEE ✓ a popup with the text «האם אתה בטוח שברצונך לסגור את האירוע ללא פוסט-פרודקשן?» and the buttons «סיים אירוע» and «ביטול»; no red toast. FAIL ✗ the toast «"הסתיים" נקבע רק דרך "סיים אירוע"» appears, or nothing opens.
  - [ ] [human] Cancel keeps the stage (desktop 1440 px, owner, same event): click «הסתיים», then «ביטול». SEE ✓ the popup closes and «פנייה» is still the filled pill; «היסטוריית שלבים» has no new row. FAIL ✗ the stage changed.
  - [ ] [human] Confirm finishes the event (desktop 1440 px, owner, same event): click «הסתיים», then «סיים אירוע». SEE ✓ the toast «השלב עודכן», «הסתיים» is now the filled pill, «היסטוריית שלבים» shows a «הסתיים» row with your name, and «סגירת אירוע» opens a locked closing with the button «פתח מחדש». FAIL ✗ an error toast, or the stage stays «פנייה».
  - [ ] [human] Reopen still works (check 99, desktop 1440 px, owner, same event): in «סגירת אירוע» click «פתח מחדש». SEE ✓ the event goes to «פוסט-פרודקשן» and the closing can be edited again. FAIL ✗ an error toast or the closing stays locked.
  - [ ] [human] From «ביצוע» on a phone (375 px, owner): SETUP an event «בדיקה 493 ב» with a date, moved on the stage bar to «ביצוע». DO scroll the stage bar and tap «הסתיים», then «סיים אירוע». SEE ✓ the same popup text, then «הסתיים» is the filled pill and the closing dialog does not open by itself. FAIL ✗ the popup is cut off at the screen edge, or the closing dialog pops up.
  - [ ] [human] Dashboard counts each event once (desktop 1440 px, owner): SETUP before the first 493 check above, open `/dashboard` and write down the number on the card «אירועים שנסגרו». DO after the «בדיקה 493 ב» check, open `/dashboard` again (same period). SEE ✓ the metric cards load with no error and «אירועים שנסגרו» is exactly two higher («בדיקה 493 א» counted when it was finished straight from «פנייה», «בדיקה 493 ב» when it entered «ביצוע»; finishing it does not count it again). FAIL ✗ an error, or the number went up by one or by three or more.
  - [ ] [human] Staff stays locked (desktop 1440 px, local staff account): SETUP as the staff account open `/menu-library?new=inquiry` and create «בדיקה 493 ג» with a date next week; it opens in «פנייה». DO hover, then click the «הסתיים» pill. SEE ✓ the pill looks locked, no popup opens, and the red toast «רק הבעלים יכול לסגור אירוע» appears; «פנייה» stays the filled pill. FAIL ✗ a popup opens or the stage changes.

## Execution Mode
- Parallel: no — conflicts with plan 488 (closing dialog), whose scope also writes `server/routes/events.js`,
  `server/utils/closing-rules.js` and `server/test/events-closing.test.js`. Run after 488 merges into `mvp-qa-fixes`
  and branch from that merge; Step 0 re-reads the finish route and `finishPatch` as 488 left them. No other qa-fixes
  plan (486–496) writes the stage bar, `event-pipeline.service.ts` or `event-stage-ui.util.ts`.
- Isolated DB: no (local MongoDB of the slot; Atlas never).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Planner decision · why: «הסתיים» may be picked from every live stage («פנייה» … «פוסט-פרודקשן»), not only from
  «ביצוע» on · Dandan reported the click being blocked, without naming a stage; limiting it to «ביצוע»/«פוסט-פרודקשן»
  would keep the blocked toast on the earlier stages, which is the complaint. The confirmation popup is the warning.
- Planner decision · why: finishing stays in `POST /:id/finish`, never `PUT /:id/stage` · one door writes the finish
  stamps, `closedAt` and the history entry; `USE_FINISH` on the stage route stays (existing tests keep it).
- Planner decision · why: when the event has no frozen snapshot, the finish request carries one (client builds it
  exactly as for a move into «פוסט-פרודקשן») and the server stores it frozen with
  `applySnapshotOnStage(event, 'post_production', body.planSnapshot, now)` before `finishPatch` · without it the dashboard
  revenue of that event becomes 0 (`business-stats.js:37-43`) and the closing has no supplier rows. A frozen snapshot is
  never replaced, so the closing dialog's finish (empty body) behaves exactly as today.
- Planner decision · why: refused from «לא נסגר» (`400 FINISH_FROM_STAGE`) · a lost deal is brought back to a live
  stage first; from «פנייה»/«הצעה נשלחה» an event date is required (`400 DATE_REQUIRED`), the same rule as any move
  that closes the deal (`event-stage.js:32-33`); from «מקדמה שולמה» on the date already exists, and the date check is
  only applied before `CLOSED_FROM_INDEX`, so a legacy dateless event in «ביצוע» can still finish as today.
- Planner decision · why: staff keep «הסתיים» locked (pill `is-locked`, tooltip + toast «רק הבעלים יכול לסגור אירוע»)
  · finishing is owner-only on the server (`editMoney`), and report item 9 / check 100 says staff must not finish.
- Reviewer decision · why: an event finished without post-production has no typed actual amounts, so the dashboard
  reads it as planned (`business-stats.js:40` revenue, `:48` costs, `:62-73` accuracy at 0 points off) — the same
  as today's closing-dialog finish with missing amounts (check 99 warns about that). No stats change: it is not a
  broken state, and changing the metric is not in item 17. Its `closedAt` is set by `finishPatch` when the event never
  passed «מקדמה שולמה», so it counts once in «אירועים שנסגרו»; an event that already closed keeps its `closedAt`.
- Planner decision · why: after the finish the closing dialog does not open by itself · the user chose to skip
  post-production; «סגירת אירוע» stays available on the bar (`canOpenClosing_` includes `finished`) to look or reopen.
- Confirm popup: `ConfirmModalService.open('stage_finish_confirm', { saveLabel: 'closing_finish' })` (button «סיים אירוע»,
  plus the modal's own «ביטול»; `app-confirm-modal` translates both the message and `saveLabel` keys — same call shape
  as `event-closing-dialog.component.ts:169`).
  Success toast: existing `stage_changed`.
- No SCSS change: the pill loses `is-locked` through the template binding; its look comes from the styles plan 479 moved
  out of `@layer` (CSS trap in `run-mode-review-fixes.md` does not apply). Check the rendered pill in the browser.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspot `public/assets/data/dictionary.json` (new keys only).

```scope
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
src/app/core/services/event-pipeline.service.ts
src/app/core/services/event-pipeline.service.spec.ts
src/app/core/utils/event-stage-ui.util.ts
src/app/core/utils/event-stage-ui.util.spec.ts
server/routes/events.js
server/utils/closing-rules.js
server/test/events-closing.test.js
server/test/business-stats.test.js
public/assets/data/dictionary.json
docs/mvp/runs/493.md
```

## Read Scope
Entire repo (notably `event-closing-dialog/**`, `server/utils/event-stage.js`, `shared/schemas/entities/event-stage.ts`,
`server/services/business-stats.js`, `src/app/core/engine/plan-snapshot.ts`, `src/app/core/services/confirm-modal.service.ts`).

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/493.md`, add it to the
scope block, continue. A change to `shared/schemas/**`, `server/utils/permissions.js` or `PUT /:id/stage` is not
expected; if one seems needed, stop that sub-task, log it as a blocker and finish the rest.

## Architecture Impact
- INV-1: preserves — finishing stays owner-only on the server (`assertCan(req, res, 'editMoney', …)` in the finish route,
  unchanged) and `loadEvent` keeps the staff stage visibility of plan 477; the client lock is only a hint.
- INV-3: preserves — the snapshot freeze, closing, stamps and history are written by the server in one conditional
  request; the client sends one call.
- INV-4: preserves — the incoming snapshot is validated through the existing `validMerged` → `checkStoredDoc` before the
  write; no schema change.
- INV-2, INV-5, INV-6: preserves — no tenancy, taxonomy or AI change.

## Backend Impact
- `POST /api/v1/events/:id/finish`: now accepts an optional `{ planSnapshot }` body and any live stage (was only
  `execution`/`post_production`). Refused: `not_closed` → 400 `FINISH_FROM_STAGE`; before «מקדמה שולמה» without a date →
  400 `DATE_REQUIRED`; finished → 409 (unchanged); staff → 403 (unchanged). No new endpoint, no new field, no migration,
  no Atlas step. Security surface: none new (same auth, same permission, Zod check of the body as stored).

## Reuse Check
- Stage-bar finish confirmation — family: modal-controller — rung: 1 — why: `ConfirmModalService.open` is the shared yes/no popup
- Finish with a snapshot — family: event-plan — rung: 2 — why: reuses `snapshotOnStageChange` + `PlanSnapshotService.buildFor` and the server's `applySnapshotOnStage` / `finishPatch`; only an optional argument is added

## Step 0 — Reality Check
On `origin/mvp-qa-fixes`: find `if (stage === 'finished') return this.showError('stage_finished_hint')` in the stage bar,
`CLOSING_STAGES.includes(event.stage)` in the finish route, `finish(eventId: string)` in `event-pipeline.service.ts`,
`applySnapshotOnStage` and `finishPatch` in `closing-rules.js`, `closedRevenue` in `business-stats.js`, and the test
"refuses to finish from a stage before" in `server/test/events-closing.test.js`. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [x] S1: Let the server finish an event from any live stage and freeze its plan in the same request — in `closing-rules.js` add and export the pure helper `finishRefusal(event)` → `'FINISH_FROM_STAGE'` for `not_closed`, `'DATE_REQUIRED'` when `EVENT_STAGES.indexOf(event.stage ?? 'inquiry') < CLOSED_FROM_INDEX` and no `eventDate`, else `null` (import both from `../generated/schemas/entities/event-stage`); keep `CLOSING_STAGES` exported (`refreshedSnapshot` uses it). Finish route: the `finished` 409 stays first, then `finishRefusal` → 400 `{ error }` in place of the `CLOSING_STAGES.includes` line (drop `CLOSING_STAGES` from the route's import if nothing else there uses it); `const snapshot = applySnapshotOnStage(event, 'post_production', req.body?.planSnapshot, now)`; `finishPatch(snapshot ? { ...event, planSnapshot: snapshot } : event, …)` and, when `snapshot`, `set.planSnapshot = snapshot`; `merged` and the `$set` carry it, `validMerged` unchanged — server/routes/events.js, server/utils/closing-rules.js
- [x] S2: Prove the new finish rules and that reopen and the dashboard still count it right — rewrite the "refuses to finish from a stage before ביצוע" test (`events-closing.test.js:203-213`): `quote_sent` without a date → 400 `DATE_REQUIRED`, with a date → 200; keep the `PUT /stage {stage:'finished'}` → 400 `USE_FINISH` half; add the cases listed in Done-when (business-stats: seed the finished-from-«פנייה» event as the route writes it — `closedAt`, `closing.finishedAt`, frozen `planSnapshot.plannedRevenue`) — server/test/events-closing.test.js, server/test/business-stats.test.js
- [x] C1: Let the finish call carry the plan snapshot — `finish(eventId, planSnapshot?)` posts `{ planSnapshot }` or `{}`; map `FINISH_FROM_STAGE` → `stage_finish_from_not_closed` in ERROR_KEYS (`selectableStages` is used only by its spec; leave it as is) — src/app/core/services/event-pipeline.service.ts, src/app/core/utils/event-stage-ui.util.ts
- [x] C2: Open a confirmation when the owner clicks «הסתיים» and finish on yes — new computed `finishRefusal_` (one rule for the click and the pill): current finished → `null`; no `editMoney` → `'stage_finish_owner_only'`; current `not_closed` → `'stage_finish_from_not_closed'`; current index < `EVENT_STAGE_ORDER.indexOf('deposit_paid')` and `needsDateFor('deposit_paid', event.eventDate)` → `'stage_finish_needs_date'`; else `null`. `pick()`: the `stage === 'finished'` line becomes a call to a private `finishFromBar(event)`, placed before the `canChangeStage_` check: current finished → return; `finishRefusal_()` → `showError(key)`; else `await confirmModal.open('stage_finish_confirm', { saveLabel: 'closing_finish' })` → no: return; yes: `isBusy_` on, `pipeline.finish(event._id, snapshotOnStageChange('post_production', event.planSnapshot) === 'none' ? undefined : snapshots.buildFor(event))`, `isBusy_` off, on `ok` the `stage_changed` toast (no closing dialog). Template: for the «הסתיים» pill `is-locked` / `aria-disabled` / `title` come from `finishRefusal_()` (title = its key) instead of the fixed `stage === 'finished'`; other pills unchanged. Class comment `ts:40-45` updated — event-stage-bar.component.ts, event-stage-bar.component.html
- [x] C3: Add the popup and refusal texts in Hebrew — `stage_finish_confirm` «האם אתה בטוח שברצונך לסגור את האירוע ללא פוסט-פרודקשן?», `stage_finish_owner_only` «רק הבעלים יכול לסגור אירוע», `stage_finish_needs_date` «יש להזין תאריך אירוע לפני סגירת האירוע», `stage_finish_from_not_closed` «אירוע שלא נסגר לא יכול לעבור ל"הסתיים" – החזירו אותו קודם לשלב פעיל»; appended next to `stage_finished_hint` (kept) — public/assets/data/dictionary.json
- [x] C4: Replace the "never moves to finished" spec with the new owner, staff, date, lost and cancel cases, and the pipeline body spec — event-stage-bar.component.spec.ts, event-pipeline.service.spec.ts, event-stage-ui.util.spec.ts
- [x] V1: Build, specs, server tests, browser replay of the human cards on the slot app, write the run file — docs/mvp/runs/493.md

## Out of Scope
- The closing dialog itself (wider paid box, camera icon, staff locks, supplier card colour) — plan 488.
- Any change to `PUT /:id/stage`, the snapshot freeze rule in `shared/schemas`, permissions, or the stage pill styles.
- Moving a finished event to another stage from the bar (still refused by the server; reopen is the way back).
- Staff finishing an event.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```
Checked: Architecture Impact filled for INV-1/3/4 (scope reaches `server/routes/events.js`); every named file and symbol
exists on `ea6af7b0` (new: `finishRefusal`, four dictionary keys, run file 493); scope covers every written file and
nothing more (no SCSS, no shared schema); every Done-when item is tagged; Out of Scope written; backend, auth (owner-only
unchanged), security (none new) and data (no migration) named; the log-query item from `docs/agent/plan-checks.md` is
present; new strings go through `translatePipe` + `dictionary.json`; no new Lucide icon; each sub-task names its files.
Frozen checks kept: 59/63 (bar, phone rail), 61 («לא נסגר»), 62 (deposit date), 96–99 (closing, reopen), 105–109
(dashboard — covered by the business-stats test and the dashboard card). Check 60 is replaced by item 17 as planned.

Independent review (2026-10-24, against `ea6af7b0`):
```
ARCHITECT + PM REVIEW
- Dashboard card expected "+1 after «בדיקה 493 ב» was finished", but B's `closedAt` is set when it enters «ביצוע» (`event-stage.js:32-37`), so finishing it adds nothing → card rewritten: note «אירועים שנסגרו» before the run, expect exactly +2 (A at finish, B at «ביצוע»).
- C2 left "only when not allowed" open for the pill lock and the date rule loose → one `finishRefusal_` computed drives the toast and the pill lock/title; date rule reuses `needsDateFor('deposit_paid', …)`; the finish check runs before `canChangeStage_`.
- S1 did not say where `finishRefusal` lives, that `CLOSING_STAGES` must stay for `refreshedSnapshot`, or how the snapshot reaches `finishPatch` → spelled out.
- S2 did not say the existing `quote_sent` test (no date) now answers DATE_REQUIRED → named, plus the with-date 200 case.
- Staff card did not say how the staff-created event comes to exist → SETUP creates «בדיקה 493 ג» as the staff account (new data only; nothing deleted).
- Dashboard reads a finished-without-post-production event as planned (revenue, costs, 0-point accuracy) → recorded as a reviewer decision; no stats change (same as today's dialog finish with missing amounts).
```
Root cause confirmed at `event-stage-bar.component.ts:135` and `.html:11-20`; server door `events.js:209-227`; `finishPatch` `closing-rules.js:108-113`; `closedRevenue` `business-stats.js:37-43`. Scope unchanged: every file the sub-tasks write is listed, none extra.
