# FoodVibe QA — Flow (entry point)

This is the file the QA agent starts from. It defines the **order of work**.
Rules of conduct, breakpoints, evidence capture and report formats live in `docs/qa/qa-agent.md` (read it first, it is
referenced from every phase). The list of checks lives in `docs/qa/qa-plan.md`.

```
 P0 PREFLIGHT ─▶ P1 PLAN vs APP ─▶ P2 EXECUTE ─▶ P3 WRAP-UP
 environment      does everything    run the checks    cleanup, summary,
 ready?           the plan names     that survived     final message
                  really exist?      P1
                  (writes the gap)
```

You run all four phases back to back, autonomously. No approval gate between phases. The only reasons to stop are the
hard blockers in section "Gates" below and in `qa-agent.md` §9.

**The principle:** the plan is a claim about the app. Before a single behaviour is tested, you prove each claim's
*subject* exists. Whatever does not exist is written down explicitly, as plan drift (not as a bug), and the dependent
checks are skipped — not failed, not guessed.

---

## State, files, resume

Everything lives in `bugs/qa-runs/<RUN_ID>/`:

| File | Written in | Purpose |
|---|---|---|
| `progress.md` | P0, updated always | `Phase:` line + page × breakpoint table; the resume point |
| `plan-snapshot.md` | P0 | Verbatim copy of `docs/qa/qa-plan.md` as used in this run (frozen, so reports stay interpretable) |
| `plan-reality.md` | P1 | Every anchor in the plan → EXISTS / DIFFERENT / MISSING / … + evidence |
| `effective-plan.md` | P1 | Per check: RUN / RUN-ADAPTED / SKIP-MISSING / RUN-LATER — **the list P2 executes** |
| `report.md` | P0 header, P2 findings, P3 summary | Bugs per page (format in `qa-agent.md` §6) |
| `shots/` | P1, P2 | Evidence PNGs |

`progress.md` first lines are always:
```
# QA run <RUN_ID> — started <ISO> — plan snapshot: plan-snapshot.md
Phase: P0 | P1 | P2 | P3 | DONE     Step: <free text, e.g. "P2 · RBD · T">
```
**Resume rule:** if `bugs/qa-runs/<RUN_ID>/progress.md` already exists, you are resuming. Read `progress.md`,
`plan-reality.md`, `effective-plan.md`; continue from the recorded phase/step. Never redo a finished phase.
If `Phase: P1` is not finished, redo only the pages whose section in `plan-reality.md` is missing.

### Run registry and unattended (nightly) mode

The nightly scheduled task sends the **same prompt every night, without a `RUN_ID`**. Nobody is watching, and the
session has no memory of earlier nights, so the state lives in one file: `bugs/qa-runs/INDEX.md`.

```
| RUN_ID | Started | Finished | Build SHA | Phase | Bugs | Drift | Status |
|---|---|---|---|---|---|---|---|
| 2026-10-11-a | 2026-10-11 03:01 | | f739e9a1 | P2 · RBD | 7 | 12 | PAUSED |
```
Status ∈ `IN-PROGRESS` (written at start; still this value later = the session died) · `PAUSED` (stopped on
`STOP_AT`) · `BLOCKED` (hard blocker, see `BLOCKED.md`) · `DONE` · `STOPPED` (P1 verdict STOP, or abandoned after 5 nights).

**Run selection (first thing after P0 items 1–2; applies when the kickoff has no `RUN_ID`):**
1. Read `INDEX.md` (create it with the header row if absent).
2. Last row is `IN-PROGRESS`, `PAUSED` or `BLOCKED` → **resume that RUN_ID** (retry from its recorded phase/step).
   Exception: if it started more than 5 days ago, mark it `STOPPED`, do cleanup (P3 step 1) and start a new run.
3. Last row is `DONE`, `STOPPED` or none → **new run**: `RUN_ID = <today YYYY-MM-DD>-a` (next letter if that exists),
   new row `IN-PROGRESS`.
4. Build SHA: read it with plain file reads (`.git/HEAD` → the ref file or `.git/packed-refs`); never run git.
   Record it in the row and `progress.md`. On resume, if the SHA differs from the recorded one, add
   `build changed <old> → <new>` to `progress.md` and section A of the report, keep finished pages as they are
   (they were tested on the older build) and test the remaining pages on the new one.

**Time budget.** The kickoff may carry `STOP_AT` (local clock, default `06:30`). Before starting each page and after
finishing each one, read the clock (`javascript_tool`: `new Date().toString()`). If it is past `STOP_AT`: finish and
write the current page's report section, set `Status: PAUSED` and `Step:` to the next page (in `progress.md` and
`INDEX.md`), and end with the short final message. Do **not** clean up on a pause: records you created stay and are
listed in `progress.md` under `Fixtures:` (name, type) so the next night's session knows what exists. At resume, verify
each fixture still exists (search `QA-<RUN_ID>`); recreate any that is missing before running the pages that need it.

**Nobody to ask.** In unattended mode the "stop and ask" cases in `qa-agent.md` §9 become: write
`bugs/qa-runs/<RUN_ID>/BLOCKED.md` (what failed, the exact step, evidence shot, what Dandan must do), set
`Status: BLOCKED`, send a push notification if a notification tool is available, and end. The next night retries.

---

## P0 — PREFLIGHT (≈ 2 min)

1. Read `docs/qa/qa-agent.md` fully, then `docs/qa/qa-plan.md`.
2. Folder check: the connected folder is the FoodVibe repo (`package.json` contains `foodVibe1.0`, `docs/qa/` exists).
3. Run selection (see "Run registry" above), then: if the run is new, create `bugs/qa-runs/<RUN_ID>/{shots}`, copy
   `docs/qa/qa-plan.md` → `plan-snapshot.md`, write the `progress.md` skeleton (pages × D/T/M) and the `report.md`
   header (`qa-agent.md` §6.2). If resuming, skip creation and continue per the Resume rule (after items 4–5 below).
4. Browser: open `http://localhost:4205` (site approval once), `http://localhost:4206/health` returns `ok`.
   `resize_window` accepts 1366×768, 768×1024, 375×812 (record the smallest accepted width).
5. Log in as `QA_USER`. Confirm the header shows the username and no crown (non-admin).
6. Set `Phase: P1`.

Exit criteria: all six green, else hard blocker (`qa-agent.md` §9).

---

## P1 — PLAN vs APP (the existence pass)

Goal: for **every page and every check in `qa-plan.md`**, establish whether what the plan talks about is really in the
app right now. **You do not test behaviour here.** You do not create, edit, delete or submit anything. You navigate, read,
and open *passive* UI only (tabs, filter panel, FAB, accordions, column-header toggles, jump-nav).

### P1.1 Extract anchors (from the plan, not from the app)

Go page by page through `plan-snapshot.md`. For each check ID collect its **anchors** and classify each:

| Type | What it is | Examples | Verified in |
|---|---|---|---|
| `ROUTE` | a URL path/query the plan navigates to or expects after a click | `/inventory/equipment`, `/dashboard?tab=metadata` | P1 |
| `LABEL` | static visible Hebrew text: page titles, tab/chip/nav names, button labels, column headers, field labels, placeholders, filter names, section titles | «ציוד», «הוסף», «מחיר קנייה (₪)», «בחר קטגוריה» | P1 |
| `ELEMENT` | a non-text thing the plan relies on | sort indicator, FAB, bottom tab bar, filter-panel toggle icon, rating stars, theme toggle, drag handle | P1 |
| `MESSAGE` | text that appears only after an action: toasts, validation errors, confirm/dialog texts, empty states, tooltips | «יש לתקן את השדות המסומנים», `למחוק את הספק "…"?` | **P2** (marked `CONDITIONAL`) |
| `DATA` | needs a record to exist | `/venues/view/:id`, `/cook/:id`, edit pages | P1 if a record exists, else `NO-DATA` → created in P2 |

Rule of thumb: text inside «…» is a `LABEL` unless the check says it is a toast, error, dialog, tooltip or empty
state — then it is a `MESSAGE`. When unsure, classify `LABEL` (the stricter one).

### P1.2 Verify per page (D = 1366×768, logged in)

For each page in the order of `qa-plan.md`:

1. `navigate` to the route; wait until the loader «רגע, מכינים הכל...» is gone and the list/data has rendered.
2. Run the **anchor probe** below once with all the page's `LABEL` anchors (open a passive panel and run it again for
   anchors that live inside it, e.g. the filter panel, the FAB, the metadata cards).
3. For every `ABSENT` result: confirm with the `find` tool or a `get_page_text` read before you call it missing
   (lists may be virtualised, a section may be collapsed). Still absent → `MISSING`.
4. For `ELEMENT` and `ROUTE` anchors use `find` / `read_page` and the resulting URL (`location.href` after the click).
5. Save one evidence shot per page: `shots/<PAGE>-D-p1.png` (viewport render, `qa-agent.md` §5.2). For each `MISSING`
   or `DIFFERENT` anchor additionally save a state shot at the place it should have been
   (`shots/<PAGE>-P1-<NN>-missing-<slug>.png`).
6. **Breakpoint anchors:** the plan's responsive sections name things that exist only at T or M (bottom tab bar,
   metadata jump-nav, column carousel, «⋮» row menu, cook-view pane swap bar, filter-panel overlay, equipment edit as
   a modal). Verify them with a short pass at T and M (resize → reload → probe → shot `…-T-p1.png` / `…-M-p1.png`).
   Things the plan says should be **absent** (hamburger «menu» at T) are verified as absent; if present, `DIFFERENT`.

**Anchor probe** (run through `javascript_tool`; replace the array with the page's anchors):

```js
(() => {
  const ANCHORS = ['ציוד', 'הוסף', 'חיפוש']            // ← the page's LABEL anchors
  const norm = s => (s || '').replace(/[‎‏‪-‮]/g, '').replace(/[״“”]/g, '"')
    .replace(/[׳‘’]/g, "'").replace(/\s+/g, ' ').trim()
  const vis  = norm(document.body.innerText)
  const dom  = norm(document.body.textContent)
  const attr = norm([...document.querySelectorAll('[aria-label],[title],[placeholder]')]
    .map(e => [e.getAttribute('aria-label'), e.title, e.placeholder].filter(Boolean).join(' ')).join(' '))
  return JSON.stringify(ANCHORS.map(a => { const n = norm(a)
    return [a, vis.includes(n) ? 'VISIBLE' : attr.includes(n) ? 'ATTR' : dom.includes(n) ? 'HIDDEN' : 'ABSENT'] }))
})()
```
`VISIBLE`/`ATTR` → `EXISTS`. `HIDDEN` → `EXISTS-HIDDEN` (in the DOM but not shown; fine if it belongs to a collapsed
section, a carousel column or another breakpoint — otherwise `DIFFERENT`, with note). `ABSENT` → confirm, then
`MISSING`, and look for the closest text on the page: if something clearly the same thing is there with other wording,
status `DIFFERENT` and record the found wording.

### P1.3 Reverse sweep (what exists in the app but not in the plan)

On each page, list visible interactive elements and labels that **no anchor covers**: buttons, tabs, chips, filter
groups, columns, menu items, links, toggles. Record each as `UNPLANNED` with one evidence shot per page that shows them.
(This is how new UI you add later gets noticed.)

### P1.4 Write `plan-reality.md`

```
# Plan vs App — run <RUN_ID>
Verdict: PROCEED | STOP — <reason if STOP>
Anchors checked: N · EXISTS n · EXISTS-HIDDEN n · DIFFERENT n · MISSING n · UNREACHABLE n · CONDITIONAL n · NO-DATA n · UNPLANNED n

## <PAGE> — <route>   (page status: OK | PARTIAL | MISSING | UNREACHABLE)
| Check | Type | Plan says | Status | Found in app | Evidence |
|---|---|---|---|---|---|
| INV-01 | LABEL | «רשימת מוצרים» | EXISTS | | |
| EQ-03 | LABEL | «פריט מתכלה» radio «הכל» | MISSING | filter group not on page | shots/EQ-P1-03-missing-consumable-filter.png |
| SHELL-10 | ELEMENT | no hamburger at T | DIFFERENT | hamburger visible at 768 | shots/SHELL-T-p1.png |
UNPLANNED on this page: «ייצוא CSV» button (header) — shots/EQ-P1-unplanned.png
```
Only rows with a status other than plain `EXISTS` need individual lines; plain matches may be collapsed to
"n anchors EXISTS" per check — but the **counts** must add up.

`UNREACHABLE` = the route does not load, redirects somewhere the plan does not expect, or a guard behaves differently
(e.g. a protected route opens without login, or a public page demands login).

### P1.5 Write `effective-plan.md` and decide

For **every** check ID in the plan, one row. Decision rules:

| Situation | Decision | What P2 does |
|---|---|---|
| all anchors `EXISTS` / `EXISTS-HIDDEN` / `CONDITIONAL` | `RUN` | the check as written |
| the **subject** of the check is missing (the page, form, button, field, filter or column it is about) | `SKIP-MISSING` | nothing; stays listed as plan drift |
| a minor anchor is missing/changed but the subject exists | `RUN-ADAPTED` | the check with the found wording; the difference is logged |
| `MESSAGE`-only or needs created data | `RUN-LATER` | executed in its normal turn; the message/data is verified there |
| page `UNREACHABLE` | `SKIP-MISSING` for all the page's checks | |
| `NO-DATA` page | `RUN-LATER` | executed right after the page that creates the data |

Format:
```
| Check | Decision | Note |
| INV-01 | RUN | |
| EQ-03 | SKIP-MISSING | consumable filter not present (plan-reality EQ-03) |
| EQ-04 | RUN-ADAPTED | column header is «כמות» not «כמות בבעלות» |
```
Also add rows for the `UNPLANNED` elements: ID `<PAGE>-U<NN>`, decision `RUN`, check text:
*"Element is reachable and usable, opens what a user expects, no console error, layout intact at D/T/M."*

### P1.6 Gate (automatic, no waiting for a human)

- Verdict `PROCEED` by default. Missing/different items are **not** a reason to stop.
- Verdict `STOP` only if **any** of: ≥ 40 % of all `LABEL`+`ELEMENT` anchors are `MISSING`/`UNREACHABLE`; ≥ 3 routes are
  `UNREACHABLE`; the login page/flow itself is absent. That pattern means wrong branch/build or a broken deploy,
  and testing would produce noise. On `STOP`: finish writing `plan-reality.md`, write the final chat message
  (verdict, counts, top reasons, path), set `Phase: DONE (STOPPED at P1)` and end.
- On `PROCEED`: add to `report.md` a first section **"A. Plan drift"** containing the counts and the table of
  every non-`EXISTS` row (copy from `plan-reality.md`; shots stay in `shots/`), set `Phase: P2`.

Plan drift is reported as type `PLAN-DRIFT` (no severity). It tells Dandan: *either the plan is stale or the app lost
something* — he decides. You never decide that yourself and you never mark drift as a bug.

---

## P2 — EXECUTE

Run the per-page procedure of `qa-agent.md` §7 over `effective-plan.md`, in the dependency order at the end of
`qa-plan.md`. Additional rules for this phase:

1. **Honour the decisions.** `SKIP-MISSING` rows are not run and not reported again (they are already in section A).
   `RUN-ADAPTED` rows use the adapted wording, and a finding's "Expected" quotes the adapted text.
2. **`RUN-LATER` / `MESSAGE` anchors:** when the action that triggers the message happens, compare with the plan:
   - same text → pass;
   - different text → finding `TEXT` S3 ("plan/expected «X», app shows «Y»") **and** a line in section A tagged `P2`;
   - no message at all → finding `FUNC` (severity by impact: S2 if the user gets no feedback on a failed save).
3. **State-dependent surprises.** If, in P2, something P1 marked `EXISTS` is not there when you need it (e.g. a button
   that only appears after a record is created), log it as `PLAN-DRIFT (P2)` in section A with a shot and skip the
   dependent steps. If the element exists but misbehaves, it is a normal bug finding.
4. **`NO-DATA` pages** (venue detail, cook view, edit pages): run them right after the check that creates their record.
5. **`UNPLANNED` rows `<PAGE>-U<NN>`:** run the generic exploratory check at all three breakpoints; findings as usual.
6. Per-page report sections follow `qa-agent.md` §6.3, under heading **"B. Bugs"**. After each page update
   `progress.md` (`Phase: P2`, `Step: P2 · <PAGE> · <bp>`).
7. When every page in `effective-plan.md` is done (`progress.md` has no ⏳), set `Phase: P3`.

---

## P3 — WRAP-UP

1. Cleanup exactly as `qa-agent.md` §8 (delete all `QA-<RUN_ID>-*` records, verify by searching).
2. Append to `report.md` section **"C. Summary"**:
   - Bugs: totals by severity and by type; top 5 to fix first (one line each).
   - Plan drift: counts by status, grouped by page (so Dandan can see which pages the plan needs refreshing for).
   - Skipped: checks `SKIPPED (upload/download/print/AI)` with reasons, and `SKIP-MISSING` count.
   - Cleanup result, run duration, `Run finished <ISO>`.
3. **Compare with the previous finished run.** Find the last `DONE` row in `INDEX.md` before this one. Write
   `bugs/qa-runs/<RUN_ID>/diff-vs-<PREV_RUN_ID>.md` and a short table in section C:
   - `NEW` — a finding here whose plan check ID + title has no match in the previous report;
   - `STILL OPEN` — matches a previous finding and reproduced again (note if the symptom changed);
   - `NOT REPRODUCED` — a previous finding whose plan check ran this time and passed (probably fixed; say "probably");
   - `UNVERIFIED` — a previous finding whose check was skipped or missing this time.
   Match on the plan check ID first, then on title/Actual text. Use the same for plan-drift rows (`NEW DRIFT` /
   `DRIFT GONE`). No previous run → write "first run" and skip.
4. `progress.md`: `Phase: DONE`; `INDEX.md` row: `Finished`, counts, `Status: DONE`.
5. Final chat message (≤ 10 lines): verdict, counts (bugs / drift / skipped), what is NEW vs previous run, path to
   `report.md` and `plan-reality.md`. Send a push notification with the same first line if a notification tool is
   available. Stop.

---

## Gates (the only reasons to stop early)

- P0: any of the six preflight items fails.
- P1: `Verdict: STOP` per P1.6.
- Anytime: the hard blockers of `qa-agent.md` §9 (app down, login impossible, wrong folder, repeated resize failure).
In every other situation: record, skip, continue.
