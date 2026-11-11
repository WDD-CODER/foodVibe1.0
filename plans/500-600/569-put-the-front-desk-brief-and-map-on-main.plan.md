# Plan 569 — Put the Front Desk brief and map on main, with the contract additions the plans made

Status: done
Depends-on: none
Snapshot: 5702f6d1fc4a80d78426cb011932d2524eb3466f

## Problem Statement
The Front Desk program's source documents exist only as untracked files in the main folder
(`C:\coding projects\Cursor\foodVibe1.0\docs\frontdesk\`): the brief (revision 2), the approved plan map, the
assistant behaviour rules and the Wave 2 reference. A Worker in a slot cannot read them, and the brief's Step 0 says
they land through the normal ship lane. While plans 543–568 were drafted, the plans added names to the map's frozen
Contracts; each plan carries its own copy, but the map's "Contract extensions (run)" section is still empty, so the
next Planner session (Wave 1b drafting) would plan from an out-of-date map.

## Goals & Success Criteria
**Primary:** the four Front Desk documents are on `origin/main` under `docs/frontdesk/`, the map says it is approved,
and its "Contract extensions (run)" section lists every addition below.

- [auto] `git ls-tree origin/main --name-only -- docs/frontdesk/` (after merge) lists `assistant-behaviour-rules.md`, `frontdesk-map.md`, `frontdesk-program-brief.md`, `reference-bookings-engine.md`.
- [auto] `node scripts/plan-ledger-check.mjs` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] The map's first line no longer contains `DRAFT`, and `## Contract extensions (run)` holds 11 `- plan NNN ·` lines (one per bullet in A3).
- [human] Dandan skims the map's Contract extensions and confirms nothing in them contradicts what he decided.

## Execution Mode
- Parallel: yes — docs only; no plan writes `docs/frontdesk/**`.
- Concurrent plans: any
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/frontdesk/**
docs/brain/index.md
```

## Read Scope

Entire repo, plus the main folder's untracked `C:\coding projects\Cursor\foodVibe1.0\docs\frontdesk\` (the source of the copy).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — documentation only; no code, schema or route changes.

## Reuse Check

- none — documentation only, no new component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the plan of record for the front desk kept with the code so that every later plan and Worker reads the same decisions.

## Functional Requirements

### Must Have (P0)
- [ ] Copy the four files byte for byte from the main folder's `docs/frontdesk/` into the slot's `docs/frontdesk/`: `assistant-behaviour-rules.md`, `frontdesk-map.md`, `frontdesk-program-brief.md`, `reference-bookings-engine.md`. Do not edit the brief or the reference.
- [ ] Map first line → `# Front Desk plan map — approved 2026-11-10 (questions Q1–Q12 answered)`.
- [ ] Map `## Contract extensions (run)`: append these lines under the existing "Workers append here" line, in this order and wording:
  - `- plan 545 · clients gain the server-only field liveKey (= phoneKey while live and not merged; removed on delete and merge) with a unique partial index { businessId, liveKey }; it is in CLIENT_SERVER_FIELDS; 551's merge unsets it on the merged-away client · race-safe "one live client per phone" (Human Q1 = a)`
  - `- plan 546 · C-PICKER gains inputs inputId, variant and outputs cleared, addingChange, plus a back() method · Escape steps back one view and the dialog title follows the add view`
  - `- plan 547 · client lifecycle is computed in the browser by clientLifecycle(client, now): new = firstSeenAt within 30 days, dormant = no contact for 180 days, active = the rest; the stored lifecycle field is not read · no rule existed (Human 2026-11-10)`
  - `- plan 548 · qualify lives at shared/schemas/front-desk/qualify.ts (built by build:schemas), takes a 4th argument ctx { now?, hours?, closedDates?, kind? }, reasons may carry values as "key|a=1;b=2" (parseReason); hoursCheck(hours, date, time?) is exported; operatingHoursRowSchema / OperatingHoursRow (dayIndexes, open, close) move to shared/schemas/entities/common.schema.ts · shared/front-desk/ is not built; lead time and hours need the clock and the profile`
  - `- plan 549 · requests gain the server-owned decline { reason, text?, at, by } (in REQUEST_SERVER_FIELDS); the TS type is FrontDeskRequest; collections gain the flag routerWrites — generic writes on such a type answer 405 USE_ROUTER · 559 reads decline.reason; Request shadows the browser global`
  - `- plan 550 · request answers hold every answered question with its label as displayed · the server-written first note of an approved event is built from answers`
  - `- plan 551 · app-client-form gains client (edit mode); NewInquiryDialogComponent gains initialClient; app-client-picker gains allowAdd and exclude · edit on the profile, open the dialog pre-filled, pick a merge target`
  - `- plan 552 · waLink(phone, text?) helper: leading 0 → 972, fewer than 9 digits → no link; 555 reuses it · raw digits break wa.me links for 05x numbers`
  - `- plan 555 · request reference = first 8 characters of _id, upper case; the done page's WhatsApp text is "בקשה <ref> · <slug>"; the quick-add hero button is hidden in bare mode · 560's routing reads the reference from the text`
  - `- plan 557 · frontDeskProfiles gain adminHistory (platform-admin changes with reason); business.frontDeskPlan and assistant.level are written only by the platform-admin route (generic writes drop them) · D7 gives the level to the platform admin`
  - `- plan 566 · ai-features closed list gains recipe_patch, menu_generate, menu_patch, product_generate, product_patch, recipe_from_image (13 existing routes); eval stays reserved for 562 · C-AIUSAGE listed 7 of the 13 routes`
- [ ] `docs/brain/index.md`: one line pointing to `docs/frontdesk/frontdesk-map.md` as the Front Desk program map.

## UI/UX Notes
- No UI.

## Atomic Sub-tasks

- [x] A1: Copy the four front desk documents from the main folder into the repo unchanged — byte-for-byte copy — docs/frontdesk/assistant-behaviour-rules.md, docs/frontdesk/frontdesk-map.md, docs/frontdesk/frontdesk-program-brief.md, docs/frontdesk/reference-bookings-engine.md
- [x] A2: Mark the map as approved in its title line — docs/frontdesk/frontdesk-map.md
- [x] A3: List the contract additions the plans made, so the next planning round reads them — the 11 lines above — docs/frontdesk/frontdesk-map.md
- [x] A4: Point the brain index at the map and run the ledger and breadcrumbs checks — docs/brain/index.md

## Technical Considerations
- Dependencies: none.
- New files needed: the four `docs/frontdesk/*.md` copies.
- Model changes: none.
- Backend / API: none
- Auth and validation: none
- Security surface: none — the documents hold no secrets (checked by the pre-commit secret scan).
- Data / migration: none
- Project checks: no app or server code changes, so no `log-query` item; no dictionary keys or icons.

## Out of Scope
- Editing the brief or the reference text.
- Wave 1b plans (560–565), drafted after the pilot week.

## Critical Questions
- none

## Execution Notes
- The main folder's copies stay untracked until this merges; after the merge the Human (or the Planner after `git pull`) deletes the untracked copies only if `git status` shows them identical — git refuses the pull otherwise ("untracked working tree files would be overwritten"); move them aside first.
- Evidence: node scripts/plan-ledger-check.mjs → exit 0; node scripts/breadcrumbs-check.mjs → exit 0; map line 1 has no DRAFT, 11 `- plan NNN ·` lines under Contract extensions.
- The main copy of the map's title already read "APPROVED by Dandan…"; replaced with the plan's exact line.
