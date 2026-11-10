# Orchestrator run fd-1a-data

Run branch: `orch/fd-1a-data` (from `origin/main` at fab1912) · started 2026-11-10T14:47:12.845Z · finished 2026-11-10T18:35:14.914Z
Result: 9 merged, 0 parked, skipped or left out, 9 in the run (counted from git and status.json).
`main` untouched: yes (15 plan/todo file(s) changed on main) — origin/main is f809fcc.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 543 Open one safe door for people who are not members of a business | merged | 0 | judgment | c09a04a |  |
| 544 Clients become CRM records: wider shape, phone match key, Trash instead of hard delete | merged | 2 | build → judgment | b7def9c |  |
| 545 One find-or-create of a client by phone, so one person is one client on every channel | merged | 1 | build | d1b7d95 |  |
| 548 Give every business one front desk profile, with a template per business type and the fit rules | merged | 0 | build | 436e920 |  |
| 549 Store customer requests and bookings on the server: manual request, status moves, lazy expiry | merged | 0 | build | 559b769 |  |
| 550 Approve or decline a request in one tap: the event or booking is created, the day's load is shown, every decision is logged | merged | 0 | build | 18a1364 |  |
| 566 Meter every AI call so pricing can be set from real numbers | merged | 0 | build | 1905168 |  |
| 569 Put the Front Desk brief and map on main, with the contract additions the plans made | merged | 0 | build | 2dd1234 |  |
| 570 Keep the logistics panel's buttons out from under the price bar on wide screens | merged | 0 | build | 012b39b |  |

## App errors since the run started

Command (from the main folder): `node scripts/log-query.mjs --since=2026-11-10T14:47:12.845Z --level=error`
Exit code: 0

```text
no entries
```

## Decisions

triage: shadow · agreement (last 50): 56% · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 543 · none · behaviour: server/middleware/rate-limit.js was saved in Windows-1252 (one em dash in the plan 528 comment), and the edit tools could not change it, so I rewrote it as UTF-8 with the same text plus the new exports. Reverse: git checkout the old file and re-add the plan 543 exports in Windows-1252.
- D2 · 543 · none · behaviour: the honeypot passes through any website value that is not a non-empty string (a number or an object) and does not treat it as a bot. Reverse: in server/middleware/honeypot.js, answer 201 for any truthy website value.
- D3 · 543 · none · behaviour: added the ADR 0030 entry to docs/workflow-kit/manifest.json (this file is always allowed by scope-check) so kit-manifest-check passes. Reverse: remove that entry.
- D4 · 569 · none · behaviour: the main folder's map title already read 'APPROVED by Dandan 2026-11-10 (map + contracts)…'. I replaced it with the plan's exact title line, so the extra 'Arch: approve arch change INV-1 given 2026-11-10' note on that line is gone — reverse: restore the old first line from the main folder's copy.
- D5 · 569 · none · behaviour: the brain index has no list of links, so I added the pointer as a row in its 'When to read what' table — reverse: delete that row.
- D6 · 544 · none · behaviour: the dry run prints the 9-digit phoneKey in each collision line, because the plan specifies that line format. Printing the key rather than the full phone is what keeps phones out of the output. Reverse: print only the ids and names.
- D7 · 544 · none · behaviour: the e2e spec deletes the client again in its cleanup, so the QA client ends in Trash, not purged. Reverse: purge it from Trash in cleanup.
- D8 · 544 · none · behaviour: the local migration ran with NODE_PATH pointing at the main folder's server/node_modules (the worktree has no top-level mongodb) and a copy of the main folder's gitignored server/.env, which I left in the worktree — reverse: delete server/.env
- D9 · 544 · none · behaviour: for the [ui] run I temporarily pointed environment.local.ts at port 3100 and added a throwaway Playwright config; both are removed and nothing of them is committed. The gate's default config uses :4200 and :3000, which are the main folder's servers, so those would run the old backend — reverse: n/a
- D10 · 544 · none · seen: the migration scripts require 'mongodb' through server/migrations/tools/_connect.js:12, which pnpm does not resolve in a worktree — a worktree run needs NODE_PATH
- D11 · 544 · none · behaviour: staff reads of the Trash list now get the same trimmed fields as their other reads (GET /:type/trash in server/routes/generic.js). Without it, staff would have seen the notes, email and consent of trashed clients — reverse: remove the projection option from that find().
- D12 · 544 · none · behaviour: the migration 0011 dry-run summary uses the Functional Requirements format 'clients: <n>, to patch: <m>, phoneKey collisions: <k>'. The Done-when line gives a shorter form without 'to patch' — reverse: drop the to-patch part in printPlan().
- D13 · 544 · none · behaviour: migration 0011 leaves updatedAt unchanged on the clients it fills, and its collision list skips clients that have mergedInto set — reverse: add updatedAt to the $set in write(), and remove the mergedInto skip in collisions().
- D14 · 544 · none · seen: server/routes/generic.js:151 trashOwnerFilter lets staff restore-all or empty Trash for docs whose createdBy is their own id. Once plan 545 stores a staff actor as createdBy on clients, staff could restore or purge those clients even though clients are owner-only.
- D15 · 544 · none · seen: server/scripts/db-backup.js:31 and server/migrations/tools/_connect.js require('mongodb'), which is not a direct dependency in server/package.json. In this worktree the migration tools only ran with NODE_PATH pointing at mongoose's node_modules.
- D16 · 566 · none · behaviour: the CSV export button fetches the file with the session token as a blob and saves it, because a plain link cannot send the Bearer header — reverse: change exportAiCsv and downloadAiUsageCsv in platform-admin.service.ts to open a URL
- D17 · 566 · none · behaviour: the per-business totals use a metered row's businessId as the key, with `__platform__` shown by its raw key when the business has no name — reverse: map `__platform__` to a label in aggregateAiUsage
- D18 · 566 · none · behaviour: I did not re-read the Google pricing page (no network lookup in this run) and used the plan's prices unchanged, including the Human-chosen gemini-3.8-flash 0.375 / 1.875 — reverse: edit server/constants/ai-prices.js
- D19 · 545 · none · behaviour: bulk DELETE of clients is a hard delete in the code today, not soft, so I left it alone (the live key goes with the doc) — reverse: add a $unset of liveKey if bulk delete becomes soft
- D20 · 545 · none · behaviour: a PUT that keeps the phone only fills a missing liveKey when no other live client has that key, so an old twin stays editable — reverse: always set liveKey and answer 409 on E11000
- D21 · 545 · none · behaviour: trash.service.ts reads the 409 messageKey itself, because readServerRefusal only handles 400s — reverse: widen readServerRefusal (outside this plan's scope) and call it instead
- D22 · 545 · none · behaviour: owner POST of a client keeps the sent source and defaults it to 'manual' when none is sent — reverse: force 'manual'
- D23 · 545 · none · seen: server/test/clients.test.js:~213 — the existing server-field and restore tests had to change: liveKey became a server field, POST now sets firstSeenAt and counters, and restore now sets liveKey
- D24 · 545 · none · behaviour: used a throwaway server on port 3101, ng serve on 4201 and an /api proxy through wt.localhost, plus a temp playwright config and a copy of server/.env, because the dev servers on 3000/4200 run the main checkout. I removed the temp files and stopped the servers afterwards — reverse: nothing to undo.
- D25 · 545 · none · seen: e2e/helpers/qa-session.ts:~20 — Node fetch to `localhost:3000` gets ECONNRESET on this machine, because the API listens on IPv4 only and `localhost` resolves to ::1 first. `E2E_API_URL=http://127.0.0.1:3000` works around it.
- D26 · 545 · none · seen: playwright.config.ts — with the default config the spec tests whatever is on :4200/:3000. In this setup that is the main checkout, so the gate's rerun of the spec needs servers started from this branch. Otherwise it fails with the toast missing.
- D27 · 548 · none · behaviour: the unique indexes `frontdesk_slug_unique` and `frontdesk_business_unique` are partial on `slug` being a string, so raw fixture docs without a slug (server/test/admin-business.test.js inserts two docs per business into every collection) cannot break startup or the cleanup tests — reverse: drop `partialFilterExpression` in server/db.js and give that test's fixtures a
- D28 · 548 · none · behaviour: `requestKinds` uses `z.partialRecord` because zod 4 `z.record(enum)` requires all four kinds — reverse: switch to `z.record` and fill all four kinds in every profile
- D29 · 548 · none · behaviour: the PUT response also drops `whatsapp.phoneNumberId`, not only reads — reverse: remove the delete line in the PUT handler of generic.js
- D30 · 548 · none · behaviour: `qualify` skips the opening-hours check only when `ctx.kind` is `'event'`; with no `ctx.kind` it checks the hours — reverse: require `ctx.kind` in the check
- D31 · 548 · none · behaviour: the client mirror `permission.service.ts` does not mirror `OWNER_ONLY_TYPES`, so the UI can still show create for staff on frontDeskProfiles while the server refuses — reverse: add a type check in `can()`
- D32 · 549 · none · behaviour: the publicToken unique indexes on requests and bookings are partial (publicToken is a string), so a raw fixture doc without a token cannot break startup, as with the profile slug index — reverse: drop the partialFilterExpression in server/db.js
- D33 · 549 · none · behaviour: a request with an unfit verdict but no missing answer is stored `qualified`, per the plan's rule that only a missing required answer gives needs_info — reverse: map verdict unfit to another status in runQualify in server/routes/requests.js
- D34 · 549 · none · behaviour: the client data services return error codes and log them, with no toast, per the plan's 'codes only' note — reverse: add UserMsgService calls in the run() helper
- D35 · 549 · none · behaviour: I did not tick the 15 unticked items left in the plan's list around lines 127–166. They read as spec items, not sub-tasks, and the plan file was not changed this round — reverse: tick them in the plan file.
- D36 · 550 · none · behaviour: decisionLog is registered with backup:false although the plan says backup:true, because server/test/collections.test.js (outside scope) requires userData:true for any backup entry — reverse: set backup:true once that rule is relaxed
- D37 · 550 · none · behaviour: approve builds and validates the event or booking before the claim, so a 400 never touches the request; only an insert failure reverts the claim — reverse: move the build after the claim
- D38 · 550 · none · behaviour: a client with more than 3 kinds after approve keeps the last 3 (the schema maximum) — reverse: change the slice in requests.js approve
- D39 · 550 · none · behaviour: RequestDataService.approve reloads the menu events store when it is loaded, because MenuEventDataService has no public add method and is outside scope — reverse: add a method there and call it

## Run notes

- 543: starts on the judgment tier: INV-1 changes
- 543: the folder foodVibe1.0-orch-fd-1a-data-543 was installed (root, scripts, server)
- 543: the folder foodVibe1.0-orch-merge-fd-1a-data was installed (root, scripts, server)
- 569: the folder foodVibe1.0-orch-fd-1a-data-569 was installed (root, scripts, server)
- 570: the folder foodVibe1.0-orch-fd-1a-data-570 was installed (root, scripts, server)
- 570: builder left undone (round 0): A4: specs 522-1…6, 523-1…3 and 570-1 not run against a slot app (no slot app or backend in this worktree). Build and lint were run; log-query and the other gate checks are left to the gate. The sub-task is left unticked.
- 544: the folder foodVibe1.0-orch-fd-1a-data-544 was installed (root, scripts, server)
- 544: builder left undone (round 0): A6: node server/migrations/0011-clients-crm.js --target=local failed with 'Cannot find module mongodb' in this worktree, so the local dry run, write and verify did not run. The in-memory migration test covers the logic.; [ui] e2e/ui/544-1.spec.ts was written but not run: it needs the dev servers and
- 544: [auto] Staff `POST`, `PUT` and `DELETE` on `clients` still answer 403 and change nothing (existing cases in `server/test: the main folder's backend was started
- 544: escalated to a fresh judgment-tier builder (round 2): builder left uncommitted files: test-results/
- 566: the folder foodVibe1.0-orch-fd-1a-data-566 was installed (root, scripts, server)
- 566: builder left undone (round 0): A9: breadcrumbs-check still fails (needs a row in src/app/core/models/breadcrumbs.md), so the full check set is not green; the two [human] cards are not handed over yet
- 566: parked: nothing to save (nothing uncommitted)
- 566: ask 566-1 (scope, the Human or the advisor answers): May the builder add one row for ai-usage.model.ts to src/app/core/models/breadcrumbs.md, which is outside the plan's scope, so breadcrumbs-check passes?
- plan 566 asks 566-1 — 545, 548, 549, 550 wait on the answer; the rest go on
- 566: ask 566-1 answered by the human: approved: src/app/core/models/breadcrumbs.md
- 566: scope of plan 566 extended on orch/fd-1a-data by the answer to 566-1: src/app/core/models/breadcrumbs.md
- 566: resumed from park/fd-1a-data-566: round 0, tier build, after: asking 566-1: ESCALATE scope: ESCALATE: scope src/app/core/models/breadcrumbs.md — node scripts/breadcrumbs-check.mjs exits 1 with 'src/app/core/models/breadcru
- 566: the folder foodVibe1.0-orch-fd-1a-data-566 was installed (root, scripts, server)
- 545: the folder foodVibe1.0-orch-fd-1a-data-545 was installed (root, scripts, server)
- 545: builder left undone (round 0): e2e/ui/545-1.spec.ts was written but not run here (needs the dev servers and the QA login)
- 548: the folder foodVibe1.0-orch-fd-1a-data-548 was installed (root, scripts, server)
- 548: builder left undone (round 0): breadcrumbs-check passes: needs one-line entries in src/app/core/services/breadcrumbs.md and src/app/core/models/breadcrumbs.md (out of scope); [human] item: Dandan reads the Hebrew templates (rendered list is in the plan's Execution Notes)
- 548: parked: nothing to save (nothing uncommitted)
- 548: ask 548-1 (scope, the Human or the advisor answers): Add src/app/core/services/breadcrumbs.md and src/app/core/models/breadcrumbs.md to plan 548's scope so one line each can list the new data service and model, which breadcrumbs-check requires?
- 548: ask 548-1 answered by the human: approved: src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md
- 548: scope of plan 548 extended on orch/fd-1a-data by the answer to 548-1: src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md
- 548: resumed from park/fd-1a-data-548: round 0, tier build, after: asking 548-1: replan needed: ESCALATE: scope node scripts/breadcrumbs-check.mjs -> exit 1 (2 seams: front-desk-profile-data.service.ts and front-desk-profile.mo
- 548: the folder foodVibe1.0-orch-fd-1a-data-548 was installed (root, scripts, server)
- 549: the folder foodVibe1.0-orch-fd-1a-data-549 was installed (root, scripts, server)
- 549: builder left undone (round 0): breadcrumbs rows in src/app/core/services/breadcrumbs.md and src/app/core/models/breadcrumbs.md (outside scope; approve the two paths and the gate goes green)
- 549: parked: nothing to save (nothing uncommitted)
- 549: ask 549-1 (scope, the Human or the advisor answers): Allow one breadcrumbs row each in src/app/core/services/breadcrumbs.md and src/app/core/models/breadcrumbs.md, as plan 548 did, so breadcrumbs-check passes?
- 549: ask 549-1 answered by the human: approved: src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md
- 549: scope of plan 549 extended on orch/fd-1a-data by the answer to 549-1: src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md
- 549: resumed from park/fd-1a-data-549: round 0, tier build, after: asking 549-1: replan needed: ESCALATE: scope — `node scripts/breadcrumbs-check.mjs` exit 1 (2 seams: not mentioned booking-data.service.ts, request-data.service
- 549: the folder foodVibe1.0-orch-fd-1a-data-549 was installed (root, scripts, server)
- 550: the folder foodVibe1.0-orch-fd-1a-data-550 was installed (root, scripts, server)

## Models per agent

- 543 builder: opus
- 543 reviewer: sonnet
- 544 builder: sonnet
- 544 builder fix: sonnet
- 544 judgment builder: opus
- 544 reviewer: sonnet
- 545 builder: sonnet
- 545 builder fix: sonnet
- 545 reviewer: sonnet
- 548 builder: sonnet
- 548 reviewer: sonnet
- 549 builder: sonnet
- 549 reviewer: sonnet
- 550 builder: sonnet
- 550 reviewer: sonnet
- 566 builder: sonnet
- 566 reviewer: sonnet
- 569 builder: sonnet
- 569 reviewer: sonnet
- 570 builder: sonnet
- 570 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 543 Open one safe door for people who are not members of a business: Dandan reads ADR 0030 and the new INV-1 sentence in `docs/brain/invariants.md` and confirms they say what he approved on 2026-11-10 (D1).
2. 544 Clients become CRM records: wider shape, phone match key, Trash instead of hard delete: Dandan approved the ADR 0031 text below before this plan was saved (map Human gate).
3. 544 Clients become CRM records: wider shape, phone match key, Trash instead of hard delete: Atlas: Dandan ran the A6 runbook (backup → dry run → write → verify); the verify run printed `verify: ok`, and every `phoneKey` collision group the dry run listed was read before the write.
4. 548 Give every business one front desk profile, with a template per business type and the fit rules: Dandan reads the three templates' Hebrew questions and starting limits (rendered list in the plan's Execution Notes after A3) and says they fit a catering business, a private chef and a restaurant.
5. 566 Meter every AI call so pricing can be set from real numbers: On `/platform`, signed in as the platform admin, the "שימוש ב-AI החודש" table shows this month's calls, tokens and estimated cost per business, and a row opens the per-feature breakdown.
6. 566 Meter every AI call so pricing can be set from real numbers: Dandan makes one real AI call (e.g. a recipe from text), then compares its row's tokens with the usage shown in Google AI Studio for that minute; the numbers match.
7. 569 Put the Front Desk brief and map on main, with the contract additions the plans made: Dandan skims the map's Contract extensions and confirms nothing in them contradicts what he decided.
8. 570 Keep the logistics panel's buttons out from under the price bar on wide screens: On a laptop screen (about 1280 px wide), the event screen's last card and the notes are fully visible above the price bar, and the page does not look padded too much at the bottom.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/fd-1a-data --title "Orchestrator run fd-1a-data" --body-file .claude\orchestrator-runs\fd-1a-data.md
```

Context added by learning: 3.5k chars across 6 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0.67 → 0.33 · parked 0 → 0 → 0
