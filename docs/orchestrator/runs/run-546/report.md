# Orchestrator run run-546

Run branch: `orch/run-546` (from `origin/main` at 00ce476) · started 2026-11-11T20:12:41.327Z · finished 2026-11-11T23:02:19.997Z
Result: 5 merged, 0 parked, skipped or left out, 5 in the run (counted from git and status.json).
`main` untouched: NO — origin/main is 4cc028d.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 546 One shared client picker instead of two copies inside the menu screens | merged | 1 | build | 4262e1f |  |
| 558 Privacy and go-live: erase a customer by phone, keep data only as long as needed, and the go-live docs | merged | 1 | build | 3647599 |  |
| 567 Optional "before" numbers: kitchen and front desk estimates the owner may skip | merged | 0 | build | f28d0d2 |  |
| 575 Seed one demo catering business into a local database so every demo starts with full screens | merged | 0 | build | 729d141 |  |
| 579 Logistics questions: per-event list, hide on one event, one needed toggle and tighter chips | merged | 0 | build | f681449 |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-11T20:12:41.327Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 546 · none · behaviour: app-client-picker also has a closeOnOutsideClick input and escaped / outsideClick outputs, so the stage bar can keep closing its picker on Escape or an outside click (the plan's contract extension did not cover this) — reverse: drop those three and wrap the picker in the stage bar with its own Escape and click-outside handlers
- D2 · 546 · none · behaviour: the add-client form keeps its Cancel / Save buttons, in a .c-modal-actions row inside the dialog body while the add view shows, so the buttons look as before — reverse: move the buttons into the picker's host
- D3 · 546 · none · removes: the stage bar's phone chip and events-count chip — reverse: re-add the two chips in event-stage-bar.component.html (Human answered Q1 = b)
- D4 · 546 · none · behaviour: an owner now also sees the add-client row in the stage bar picker, and a newly added client is linked to the event at once (as the plan says) — reverse: pass a flag to hide the add row there
- D5 · 546 · none · seen: e2e/ui/545-1.spec.ts:15 — still uses the old selectors #inquiry-name, #inquiry-phone and .inquiry-client-picked__name, which are now #client-form-name, #client-form-phone and .client-picker-picked__name; the file is outside this plan's scope, so I did not edit it and it will fail until updated
- D6 · 546 · none · seen: src/app/shared/client-form/client-form.component.scss:12 — reuse-lint warns about the engine class .c-input-stack:last-child; the same rule was in the old dialog scss, and the warning appears now because the file moved
- D7 · 546 · none · behaviour: named the two spec files in the plan's scope block instead of reverting them, because the plan itself needs their tests — reverse: remove those two scope lines and revert the spec changes
- D8 · 546 · none · behaviour: the stage bar's client picker also takes closeOnOutsideClick and has escaped and outsideClick outputs, so Escape and an outside click still close it — reverse: drop those inputs and outputs and close the picker another way
- D9 · 558 · none · behaviour: the retention sweep reuses the existing expireRequestsOnRead middleware, so it also runs on a by-id read of requests and bookings, not only the list — reverse: remove the purgeRetained line there
- D10 · 558 · none · behaviour: the pilot terms' privacy contact line is a placeholder for Dandan to fill in — reverse: edit docs/frontdesk/pilot-terms-draft.md
- D11 · 567 · none · behaviour: a group that opens because a stored value exists never closes by itself, and the owner can still toggle it — the simplest option — reverse: remove the open.set(true) loop in the constructor effect of baseline-tab.component.ts
- D12 · 567 · none · behaviour: the standards-backend baseline row was added under the table because no baseline row existed — reverse: delete that row
- D13 · 575 · none · behaviour: the seed validates and inserts the business with businessSchema directly instead of calling createBusinessFor, which needs the mongoose connection this script does not open; lastSyncedMasterVersion is 0, so the first login syncs master data — reverse: switch to createBusinessFor and open a mongoose connection in main()
- D14 · 575 · none · behaviour: oils are filed under the master category 'dry' because there is no oils key; only the 4 spices-and-oils products use 'spices' for the spices — reverse: change the category keys in PRODUCTS in demo-data.js
- D15 · 575 · none · behaviour: the demo events carry no eventTypeSnapshot or servingTypeSnapshot (optional, and the coefficients are not known without the master terms) — reverse: add the snapshots in buildDemoData
- D16 · 579 · none · behaviour: LogisticsItemRegistryService resolves BusinessService lazily through Injector, so logistics-item-manager.component.spec.ts (outside scope) keeps passing without an HttpClient provider — reverse: inject BusinessService directly and add an HttpClient provider to that spec
- D17 · 579 · none · behaviour: an answered question whose term exists still shows on the event after the date rule, unless the environment filter hides it (the simplest reading of "answered always show") — reverse: drop the term lookup in buildRows
- D18 · 579 · none · behaviour: changing the provider on an old client_provides row writes status needed plus the chosen payer, so the toggle and radios agree — reverse: write only the payer
- D19 · 579 · none · behaviour: the hidden-row dimming uses opacity 0.5 because the repo has no opacity token — reverse: replace it with a token if one is added
- D20 · 579 · none · removes: the four status radios, the three old payer options and the "ללקוח" checkbox are gone from the panel, as the plan specifies — reverse: restore them in the panel template

## Run notes

- 546: the folder foodVibe1.0-orch-run-546-546 was installed (root, scripts, server)
- 546: builder left undone (round 0): e2e/ui/546-1 and 546-2 were not run by the builder (no dev server or QA login in the worktree); the gate reruns them
- 546: parked: nothing to save (nothing uncommitted)
- 546: ask 546-1 (technical, the Human or the advisor answers): Plan 546 failed twice for the same reason (scope: src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts, src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts). Leave it parked, or retry it?
- 546: ask 546-1 answered by the human: retry: a fresh judgment-tier builder with the hand-off and this answer
- 546: resumed from park/run-546-546: round 1, tier build, after: asking 546-1: same reason twice: scope: src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts, src/app/shared/new-inquiry
- 546: the folder foodVibe1.0-orch-run-546-546 was installed (root, scripts, server)
- 546: the folder foodVibe1.0-orch-merge-run-546 was installed (root, scripts, server)
- 558: the folder foodVibe1.0-orch-run-546-558 was installed (root, scripts, server)
- 567: the folder foodVibe1.0-orch-run-546-567 was installed (root, scripts, server)
- 575: the folder foodVibe1.0-orch-run-546-575 was installed (root, scripts, server)
- 579: the folder foodVibe1.0-orch-run-546-579 was installed (root, scripts, server)
- 579: builder left undone (round 0): The e2e specs 579-1..3, 522-5 and 544-1 were not run, and the 522-1..6, 523-1..3 and 570-1 reruns were not done: slot-serve.mjs answered "not a slot", so no slot app was available. This needs a slot app and QA credentials.

## Models per agent

- 546 builder: sonnet
- 546 reviewer: sonnet
- 558 builder: sonnet
- 558 reviewer: sonnet
- 558 builder fix: sonnet
- 567 builder: sonnet
- 567 reviewer: sonnet
- 575 builder: sonnet
- 575 reviewer: sonnet
- 579 builder: sonnet
- 579 reviewer: sonnet

## What only the Human can do

### Removed behaviour — check before merging the PR

1. 546: D3 removes: the stage bar's phone chip and events-count chip — reverse: re-add the two chips in event-stage-bar.component.html (Human answered Q1 = b) — open the screen; accept: decisions: ok · keep it: D3 ✗ restore
2. 579: D20 removes: the four status radios, the three old payer options and the "ללקוח" checkbox are gone from the panel, as the plan specifies — reverse: restore them in the panel template — open the screen; accept: decisions: ok · keep it: D20 ✗ restore

### The plans' [human] items (no UI check ran)

3. 546 One shared client picker instead of two copies inside the menu screens: The new-inquiry dialog and the event screen feel the same as before: same fields, same order, Escape goes one step back, the picked client sits inside the field with an X.
4. 558 Privacy and go-live: erase a customer by phone, keep data only as long as needed, and the go-live docs: Dandan reads `docs/frontdesk/pilot-terms-draft.md` (Hebrew) and sends it to his lawyer; the five points of the brief are all in it.
5. 558 Privacy and go-live: erase a customer by phone, keep data only as long as needed, and the go-live docs: Render dashboard, live service → Environment: Dandan adds `PUBLIC_BASE_URL` = the service's public `https://…onrender.com` address and saves; then he creates the uptime monitor from the new doc section (`GET <PUBLIC_BASE_URL>/api/v1/health` every 10 minutes) and sees it report "up". The four WhatsApp keys wait until Wave 1b (plan 560).
6. 567 Optional "before" numbers: kitchen and front desk estimates the owner may skip: The tab reads as clearly optional: the two group hints say these are estimates and may be skipped.
7. 575 Seed one demo catering business into a local database so every demo starts with full screens: After `node server/scripts/seed-demo-business.js --target=local --write` on his local database, Dandan signs in as the demo owner and the dashboard, recipe book, inventory, an open event and a finished event all show believable Hebrew data.
8. 579 Logistics questions: per-event list, hide on one event, one needed toggle and tighter chips: On a phone-size window and on a laptop, an event's logistics questions take visibly less height than before, and "נדרש", "עלינו" and "באחריות הלקוח" still read clearly and are easy to tap.
9. 579 Logistics questions: per-event list, hide on one event, one needed toggle and tighter chips: An event created before this plan merged still shows the full shared checklist it showed before (nothing went missing).

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/run-546 --title "Orchestrator run run-546" --body-file .claude\orchestrator-runs\run-546.md
```

Context added by learning: 3.5k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0.33 → 0.4 · parked 0 → 0 → 0
