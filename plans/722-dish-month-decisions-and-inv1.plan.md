# Plan 722 — Record the dish and month research, Dandan's updated decisions and the salary-privacy change to INV-1

Status: draft
Depends-on: none
Track: code
Snapshot: 33a6c572

## Problem Statement
Plans 660 and 661 wrote two feasibility reports (`docs/finance/dish-analysis-feasibility.md`,
`docs/finance/monthly-planning-feasibility.md`), each ending with `## 8. Decisions for the Human`. A research round
(report "Research sharpens FoodVibe's dish and month plans", section "Updated decisions") then checked those
decisions against how restaurant back-office tools work: of 17 decisions, 11 keep, 4 keep with a refinement, 2 change
(dish 4 and monthly 10), and it adds 19 new decisions (N-D1–N-D8, N-M1–N-M8, N-X1–N-X3) plus a revised slice order for
both tracks.

On 2026-11-24 Dandan answered: "decisions: all recommended" — every updated recommended option and every N-* decision
— and "approve arch change INV-1" for N-M3 (per-employee pay lines are owner-only; the server computes labour totals
and the consultant and every other non-owner reader receives totals only). N-M3 narrows the consultant clause that
ADR 0032 added to INV-1 ("a consultant may do what the owner may except manage the team and change the business
settings").

Today none of this is in the repo: the research lives only in the Planner's scratchpad, the two reports still show
the old recommendations (dish 2 "typed first, file later", dish 4 "not in version one", monthly 7 "the month stores
one VAT rate", monthly 10 "slices 1 to 3 first"), and INV-1 still lets a consultant read everything the owner reads.
The build plans 723–729 cite these decisions by id; they need a written source in the repo, and the gate
(`scope-check --arch`) needs the INV-1 change and its ADR before any plan builds per-employee lines.

This plan writes documents only. It changes no app code, no schema and no data.

## Goals & Success Criteria
**Primary:** the research is in `docs/finance/dish-and-month-research.md`; both feasibility reports end with
`## 9. Updated decisions (2026-11-24)` giving every decision's status and chosen option; ADR 0034 records the
salary-lines rule; INV-1's rule text says per-employee pay lines are the owner's alone.

- [auto] `cmp "<research source>" docs/finance/dish-and-month-research.md` exits 0 (an exact copy; the source path is in A1).
- [auto] `grep -c "^## " docs/finance/dish-analysis-feasibility.md` prints `9`; `grep -c "^## " docs/finance/monthly-planning-feasibility.md` prints `9`.
- [auto] `grep -c "^## 9. Updated decisions (2026-11-24)$" docs/finance/dish-analysis-feasibility.md docs/finance/monthly-planning-feasibility.md` prints `1` for each file.
- [auto] `grep -c "^| N-D[1-8] " docs/finance/dish-analysis-feasibility.md` prints `8`; `grep -c "^| N-M[1-8] " docs/finance/monthly-planning-feasibility.md` prints `8`; `grep -c "^| N-X[1-3] "` prints `3` for each of the two reports.
- [auto] `grep -c "dish-and-month-research.md" docs/finance/dish-analysis-feasibility.md docs/finance/monthly-planning-feasibility.md` prints at least `1` for each file.
- [auto] `grep -c "ADR 0034" docs/brain/invariants.md` prints at least `2` (Rule and Source); `grep -c "TBD" docs/brain/decisions/0034-salary-lines-owner-only.md` prints `0`.
- [auto] `node --test scripts/test/invariants.test.mjs` exits 0 (the registry still parses: 6 invariants, each with Touches and a users-lose line).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/722-dish-month-decisions-and-inv1.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/722-dish-month-decisions-and-inv1.plan.md` exits 0.
- [auto] `node scripts/scope-check.mjs --diff=origin/main --plan=plans/722-dish-month-decisions-and-inv1.plan.md` exits 0 (only the listed documents changed).
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [human] Dandan reads section 9 of both reports and says each row's chosen option is what he approved ("all recommended").
- [human] Dandan reads the new INV-1 sentence (UI/UX Notes below, as written into `docs/brain/invariants.md`) and says it is the change he approved: per-employee pay lines are the owner's alone; a consultant, a platform admin acting in the business and every other non-owner see labour totals only.

## Execution Mode
- Parallel: yes — no open plan writes these files. Plans 723–729 depend on the decisions recorded here only as text; they can be built before this merges.
- Concurrent plans: any.
- Isolated DB: no — nothing touches data.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/finance/dish-and-month-research.md
docs/finance/dish-analysis-feasibility.md
docs/finance/monthly-planning-feasibility.md
docs/brain/decisions/0034-salary-lines-owner-only.md
docs/brain/invariants.md
scripts/test/invariants.test.mjs
docs/workflow-kit/manifest.json
```

`scripts/test/invariants.test.mjs` is listed so the check can run against it; this plan does not change it.

## Read Scope

Entire repo, plus the research source file named in A1.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: changes — ADR docs/brain/decisions/0034-salary-lines-owner-only.md — Arch-approved: Human 2026-11-24 (approve arch change INV-1)
- INV-none: preserves — the plan writes Markdown only; no code, schema, route, permission or data changes. The new INV-1 rule binds the later per-employee lines slice (monthly slice 9 of the revised order); until that slice exists no pay line is stored anywhere, so nothing in the running app changes. Money fields and module gating: unchanged here.

## Reuse Check
- none — documents only; no component, util, pipe, service or class is created.

## Defaults

- confirm-destructive-action — exception — why: documents only; nothing in the app is removed.
- empty-state-on-list — exception — why: documents only; no list is built.
- loading-and-error-states — exception — why: documents only; no screen is built.
- unsaved-changes-on-leave — exception — why: documents only; no form is built.
- hints-in-tooltips — exception — why: documents only; no control is built.
- leave-and-return — exception — why: documents only; no page flow is built.
- app-list-container — exception — why: documents only; no list is built.
- one-breakpoint-set — exception — why: documents only; no SCSS is written.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who owns a restaurant, I want the choices I approved for the dish and month screens written down next to the reports, so that every build plan follows the same answers and nobody asks me again.
- As a chef who owns a restaurant, I want what each of my employees earns to be seen by me alone, so that a consultant helping me sees my labour cost without seeing anyone's salary.

## Functional Requirements

### Must Have (P0)
- [ ] **Research copy:** `docs/finance/dish-and-month-research.md` is an exact copy of the research report (A1 names the source). No edits; the reports link to it.
- [ ] **Dish report section 9:** `docs/finance/dish-analysis-feasibility.md` gains, after section 8 and changing nothing above it, `## 9. Updated decisions (2026-11-24)`:
  - One opening paragraph: Dandan approved every recommended option on 2026-11-24 ("decisions: all recommended"); the reasons and sources are in [the research report](dish-and-month-research.md), section "Updated decisions"; section 8 above is kept as the original question.
  - A table `| # | Status | Chosen option |` with one row per decision: `| 1 `…`| 7 ` (dish decisions, status `keep`, `keep, refined` or `change` exactly as the research table says), `| N-D1 `…`| N-D8 ` and `| N-X1 `…`| N-X3 ` (status `new`). "Chosen option" is the research's "Updated recommended option" in one or two plain sentences, keeping every number (0.7 × equal share, ÷ 1.18, factor 1, up to 3 months).
  - A short list "Revised build order" with the research's revised dish slice order (1–9) as chosen, saying that import (slice 5) waits for one real sales export from a target owner.
- [ ] **Monthly report section 9:** `docs/finance/monthly-planning-feasibility.md` gains the same section: rows `| 1 `…`| 10 `, `| N-M1 `…`| N-M8 `, `| N-X1 `…`| N-X3 `, and the revised monthly slice order (1–12). Row N-M3 adds: "INV-1 changed with Dandan's `approve arch change INV-1` (2026-11-24); see ADR 0034."
- [ ] **ADR 0034:** `docs/brain/decisions/0034-salary-lines-owner-only.md` from `docs/brain/decisions/_TEMPLATE.md`, front matter `status: accepted`, `date: 2026-11-24`, `review-by: 2027-05-24`, `supersedes: 0032-one-user-more-than-one-business (the consultant bullet of Decision, only for per-employee pay lines)`. Content in UI/UX Notes below.
- [ ] **INV-1 amended** in `docs/brain/invariants.md`, keeping the exact `## INV-n — <title>` + five `- Field:` shape that `scripts/lib/invariants.mjs` parses: the Rule's consultant clause, Source, Touches and Users-lose lines change as in UI/UX Notes. No other invariant changes.

### Should Have (P1)
- [ ] Section 9 of each report names which build plans carry the first slices (dish: 724, 725, 726; month: 727, 728, 729; both: 723 for N-X1), so a reader can go from a decision to its plan.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
No screen is built and no dictionary key is added. The exact texts:

**INV-1 Rule — the consultant clause** (replace only the part after "never one named by the request;"):
> a consultant may do what the owner may except manage the team, change the business settings and read per-employee pay lines; per-employee pay lines are the owner's alone, and the consultant, the platform admin acting in the business and every other non-owner receive only the labour totals the server computes from them, never a per-person row (ADR 0034); a session acting outside the user's own business is re-checked on every request (ADR 0032).

"The owner" here is the business's own owner in a session at home (a token without `acting`).

**INV-1 Source:** append `, ADR 0034 (plan 722, salary lines)`.

**INV-1 Touches:** append `` `server/routes/month-*.js` `` (the month-plan routes and the future team-lines route, monthly slices 1 and 9).

**INV-1 Users lose if broken:** append "A consultant or anyone but the owner sees what each employee earns."

**ADR 0034 — `# 0034. Per-employee pay lines are the owner's alone; everyone else gets server-computed totals`:**
- Context: ADR 0032 gave a consultant the owner's rights except team and settings, so he would read every money record of the business, including per-employee pay once the monthly screen stores it. Pay is personal data under Israel's privacy law Amendment 13 (whether it is "special sensitivity" data is unresolved, so take the safe side); 7shifts had a report that leaked wages to managers who should have seen totals only. The month's prime cost needs only a labour total. Research report, monthly N-M3; Dandan's `approve arch change INV-1`, 2026-11-24.
- Decision: per-employee pay lines (a person's name or role with a pay amount) are read and written only by the business's own owner in a home session. The server computes the labour totals of a month from them; every other reader (consultant, platform admin acting, staff — staff never see money anyway) receives only those totals, in the same response shape whether lines exist or not, so a client never holds a per-person row. The month's typed labour total (monthly slice 3) stays editable by the consultant, as today's money rule allows. Everything else in ADR 0032 is unchanged.
- Rejected: hiding the lines in the browser only (the data still reaches the client); letting the owner choose per consultant (more settings, and the default would leak); no per-employee lines at all (some owners want them; they stay late in the order and owner-only).
- Consequences: the team-lines route (monthly slice 9) must project totals on the server and gets an `INV-1 …` case in `server/test/invariants.test.js`; a consultant cannot audit pay by person; payslip capture stays deferred (monthly decision 3).
- Review: check that no route or export returns a per-person pay row to a non-owner, and whether consultants ask for per-person access.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Put the research report in the repo so every plan can cite it — exact copy of `C:\Users\danwe\AppData\Local\Temp\claude\4560911dcd58a9c2\717c5d93-0414-4514-b4d8-331e3aad7a3d\scratchpad\reports\Restaurant dish and month analytics.md` (if the file is gone, STOP and ask the Human for it) — docs/finance/dish-and-month-research.md
- [ ] A2: Write down which dish decisions Dandan approved and the new dish build order — section 9 of the dish report as in P0 — docs/finance/dish-analysis-feasibility.md
- [ ] A3: Write down which month decisions Dandan approved and the new month build order — section 9 of the monthly report as in P0, N-M3 row pointing at ADR 0034 — docs/finance/monthly-planning-feasibility.md
- [ ] A4: Record why only the owner may see each employee's pay — ADR 0034 with the text of UI/UX Notes — docs/brain/decisions/0034-salary-lines-owner-only.md
- [ ] A5: Change the ownership rule so pay per person is the owner's alone — INV-1 Rule clause, Source, Touches, Users-lose as in UI/UX Notes; run `node --test scripts/test/invariants.test.mjs` — docs/brain/invariants.md
- [ ] A6: Run every automatic check and paste the outputs under Execution Notes — all `[auto]` items

## What happens when
- The research source file is missing (the scratchpad was cleared): the Worker stops at A1 and asks the Human for the file; nothing else is written first, because sections 9 link to it.
- `scripts/test/invariants.test.mjs` fails after A5: the INV-1 section lost its shape (a field line was split or a backtick dropped); fix the Markdown, do not change the test.
- The restaurant staging branch (`chore/restaurant-staging`) merges first: it adds ADR 0033 (the table engine) and INV-7, and edits INV-1's Touches line. Merging this plan after it needs a union of the two Touches additions; the ADR number 0034 is already clear of it.

## Technical Considerations
- Dependencies: plans 660, 661 (the two reports); ADR 0032; `scripts/lib/invariants.mjs` (the registry parser).
- New files needed: `docs/finance/dish-and-month-research.md`, `docs/brain/decisions/0034-salary-lines-owner-only.md`.
- ADR number: `0033` is taken on `chore/restaurant-staging` (`docs/brain/decisions/0033-the-table-engine-decides.md`, plan 662, not yet on main), so this ADR is `0034`. Plans that cite the salary ADR cite 0034.
- Model changes: none. Backend / API: none. Data / migration: none. Security surface: none (documents only).
- Project checks: the `log-query` and build/test items do not apply (no app or server code is touched), as in plan 660.

## Out of Scope
- Any code, schema, route, permission, test or dictionary change; the per-employee lines themselves (monthly slice 9).
- Rewriting sections 1–8 of either report (section 8 stays as the original question).
- Any decision Dandan did not answer, and the sales-file format (blocked on a real export).

## Critical Questions
- none — Dandan answered "decisions: all recommended" and "approve arch change INV-1" on 2026-11-24; reading "every other non-owner" to include the platform admin acting in the business is the Planner's reading of N-M3, and the second `[human]` item asks him to confirm it.

## Execution Notes
- Planner 2026-11-24: written from the research report and Dandan's decisions
