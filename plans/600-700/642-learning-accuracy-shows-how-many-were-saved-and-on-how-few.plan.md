# Plan 642 — The platform's learning numbers say how many scans were saved and do not show a sure percent from one save

Status: done
Depends-on: 630
Snapshot: 5d6cd7b8

## Problem Statement
Dandan validated plan 630 on 2026-11-18 (staging `5d6cd7b8`): the platform's "למידת המערכת" section showed the invoice
reading at 100% accuracy although 9 drafts were made and only 1 was saved. In the local database (`foodvibe`,
`aiDrafts`): 9 `invoice_read` drafts, 8 `pending` (scans never saved), 1 `confirmed` with `keptRatio: 1`.
`server/utils/learning-stats.js` averages `keptRatio` over confirmed drafts only, and
`platform-learning.component.html:41` shows that average as a bare percent (`pct(flow.avgKeptRatio)`), so one save
reads as a sure 100%. Nothing shows that 8 of 9 scans were never saved, which is itself the most telling number.

## Goals & Success Criteria
**Primary:** each flow row shows how many drafts were saved out of how many were made, and the accuracy says how many
saves it rests on and is greyed out below five.

- [auto] `pnpm run test:server` passes, including `server/test/learning-stats.test.js` with new cases: 9 drafts with 1
  confirmed give `confirmedRate: 0.11` (two decimals) and `avgKeptRatio: 1`, `confirmedCount: 1`; a `pending` draft
  older than 24 hours counts as `abandoned`; no confirmed draft gives `avgKeptRatio: null`.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.spec.ts`: a flow with 1 of
  9 saved shows "1 מתוך 9 (11%)" in the saved column and the accuracy "100% (1)" with the low-sample style; with 5 or
  more saves the style is normal; `avgKeptRatio: null` shows "—".
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan opens `/platform` → "למידת המערכת": the invoice row reads "1 מתוך 9" saved and a greyed "100% (1)",
  and the hint explains that the accuracy is counted on saved scans only.

## Execution Mode
- Parallel: no — it edits `platform-learning` and `public/assets/data/dictionary.json`; runs in a run of its own or
  with 641 and 643 one after the other.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/learning-stats.js
server/test/learning-stats.test.js
server/test/admin-learning-stats.test.js
server/routes/admin-learning.js
shared/schemas/**/learning*.ts
src/app/core/services/platform-admin.service.ts
src/app/core/services/platform-admin.service.spec.ts
src/app/pages/platform-dashboard/components/platform-learning/**
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the numbers stay behind the platform-admin learning route; no business data is added to them.
- INV-4: preserves — any shared response type for the stats only gains optional fields; no write is validated differently.

## Reuse Check

- the saved-of-made cell and the low-sample style — family: empty-state — rung: 1 — why: page-local cells in the
  existing learning table, as plan 630 declared its classes.
- new class `.learning__low` (muted low-sample accuracy figure) — family: learning-stats — rung: 1 — why: page-local
  modifier on the existing learning table cell; no shared family covers a low-sample state.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to see how many AI scans people actually saved, so that I know whether a flow is
  trusted.
- As the platform admin, I want an accuracy figure that tells me how many saves it rests on, so that one lucky save
  does not read as 100%.

## Functional Requirements

### Must Have (P0)
- [ ] `learning-stats.js`: per flow, model and week add `confirmedCount`, `confirmedRate` (confirmed ÷ drafts, two
  decimals), `abandoned` (pending older than 24 hours); `avgKeptRatio` stays over confirmed drafts and is `null` with
  none.
- [ ] The table: the "אושרו" column shows "{confirmed} מתוך {drafts} ({rate}%)"; the accuracy column shows
  "{pct}% ({n})", greyed with a tooltip (`title`) `platform_learning_low_sample` when n < 5, "—" when null.
- [ ] Hint under the title: `platform_learning_kept_hint` — "הדיוק מחושב רק על סריקות שנשמרו: כמה מהשורות שה-AI הציע
  נשמרו בלי שינוי".
- [ ] Dictionary (append-only): `platform_learning_saved_of` — "{confirmed} מתוך {drafts} ({rate}%)";
  `platform_learning_low_sample` — "מעט מדי שמירות כדי לסמוך על המספר"; `platform_learning_kept_hint` as above.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; numbers `dir="ltr"` as today. The greyed accuracy uses the existing muted text token.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Count how many drafts were saved, abandoned and on how many saves the accuracy rests — the new fields and their server cases — server/utils/learning-stats.js, server/test/learning-stats.test.js
- [x] A2: Show saved out of made and grey out an accuracy from fewer than five saves — the cells, the hint, the dictionary keys, the spec cases — src/app/pages/platform-dashboard/components/platform-learning/**, public/assets/data/dictionary.json
- [x] A3: Run every check — the Done-when commands in order — docs/brain/inventory.md

## Technical Considerations
- Dependencies: 630. Backend: response fields added, none removed. Data, auth: none.

## Out of Scope
- Counting the header fields (supplier, date, number) into the accuracy.
- Deleting abandoned drafts.

## Critical Questions
- none

## Execution Notes
- decided: five saves is the line for a trusted figure — why: below that one or two scans swing it from 0 to 100.
- pnpm run test:server, lint, build, test:ci -> all exit 0 (2604 SUCCESS)
- added optional now to buildLearningStats; route passes its own now (abandoned = pending older than 24h)
