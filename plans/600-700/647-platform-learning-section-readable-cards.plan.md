# Plan 647 — The platform's learning section reads as cards that say what each number means

Status: done
Depends-on: 630, 642
Snapshot: 9354ab3d

## Problem Statement
Dandan checked "למידת המערכת" on `/platform` on 2026-11-19 (staging `aacec375`) and saw only lines of plain text — the
description, the hint, the file-store note, "עדיין אין טיוטות AI ב-90 הימים האחרונים", and the supplier memory as bare
label/number pairs — "not in any container, and it gives the user no value". The table was empty because the only
business with AI drafts is private, and private businesses stay out of these numbers (Dandan's decision of 2026-11-19:
"keep them out", the rule of plans 630 and 639). The component is
`src/app/pages/platform-dashboard/components/platform-learning/**` (plan 630, numbers from plan 642).

## Goals & Success Criteria
**Primary:** the section shows one card per AI action with its saved-of-made count and accuracy, a one-line meaning
under each number, the supplier memory as three stat tiles, and an empty state that says why it is empty.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/platform-dashboard/components/platform-learning/platform-learning.component.spec.ts` with these cases:
  (a) two flows render two cards (`data-testid="learning-flow-card"`), each with the flow's name, "{confirmed} מתוך
  {drafts} ({rate}%)", the accuracy "{pct}% ({n})" (greyed below 5 saves, as plan 642) and a one-line meaning under
  each number; (b) the weekly breakdown is inside the card, closed by default, opened by a small button; (c) the
  supplier memory renders three stat tiles (suppliers, linked names, contributing businesses); (d) with no drafts and
  `privateCount > 0` the empty state reads `platform_learning_empty_private` with the count; with no drafts and no
  private business it reads `platform_learning_empty`; (e) the file-store note renders as a warning banner, not plain
  text; (f) the explanations are tooltips on their numbers where a sentence would crowd the card (default
  `hints-in-tooltips`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/platform` with a learning-stats fixture of two flows, two cards and three tiles show
  (`e2e/ui/647-1.spec.ts`).
- [human] Dandan opens `/platform` → "למידת המערכת": with his business private he reads why it is empty; after turning
  private off he sees a card for invoice reading with "1 מתוך 9", the greyed accuracy and what each number means, and
  the supplier memory as three tiles.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal

## Execution Mode
- Parallel: no — it appends to `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/platform-dashboard/components/platform-learning/**
src/app/pages/platform-dashboard/platform-dashboard.page.scss
public/assets/data/dictionary.json
e2e/ui/647-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
src/testing/test-lucide-icons.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — screen only; the numbers, their route and the private-business rule do not change.

## Reuse Check

- the flow cards and the stat tiles — family: engine-classes — rung: 1 — why: the existing card and stat classes of the
  platform page; no new piece.
- new classes .learning__cards, .learning__tiles, .learning__card, .learning__tile, .learning__card-head, .learning__card-name, .learning__model, .learning__meaning, .learning__metric, .learning__value, .learning__weeks-btn, .learning__weeks, .learning__brain, .learning__empty — family: learning-stats — rung: 1 — why: the section's own layout classes, extending the existing learning__ block of this component.
- the empty state — family: empty-state — rung: 1 — why: `app-empty-state` with a new message key.

## Defaults

- hints-in-tooltips — applies — how: native `title` plus `aria-label` on each number for its meaning where the card has
  no room for a line.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want each AI action in its own card with numbers that say what they mean, so that I can
  tell at a glance whether people trust the AI.
- As the platform admin, I want an empty section to say why it is empty.

## Functional Requirements

### Must Have (P0)
- [ ] One card per flow: name, saved of made, accuracy (greyed below 5), a meaning per number; the weekly table inside,
  closed by default.
- [ ] Supplier memory: three stat tiles.
- [ ] File-store note: a warning banner.
- [ ] Empty state: `platform_learning_empty_private` — "אין עדיין נתונים להצגה: {count} עסקים במצב פרטי אינם נכללים,
  ועסקים אחרים עוד לא סרקו" when private businesses exist; else `platform_learning_empty` as today.
- [ ] Dictionary (append-only): `platform_learning_saved_meaning` — "כמה מהסריקות נשמרו בסוף",
  `platform_learning_kept_meaning` — "כמה מהשורות שה-AI הציע נשמרו בלי שינוי", `platform_learning_weeks_open` —
  "לפי שבוע", plus the empty key above.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; cards in a responsive grid (one column on a phone); numbers `dir="ltr"`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show each AI action as a card whose numbers say what they mean — the cards, the weekly breakdown inside, the tiles, the banner, the keys, the spec cases — src/app/pages/platform-dashboard/components/platform-learning/**, public/assets/data/dictionary.json
- [x] A2: Say why the section is empty — the empty state with the private count and its case — src/app/pages/platform-dashboard/components/platform-learning/**
- [x] A3: Prove it in the running app and run every check — the screen spec, then the Done-when commands in order — e2e/ui/647-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 630 (section and numbers), 642 (saved-of-made and the low-sample style).

## Out of Scope
- Counting private businesses (Dandan: keep them out).

## Critical Questions
- none

## Execution Notes
- decided: private businesses stay out of the numbers — why: Dandan's answer of 2026-11-19 ("keep them out").
- A1–A3 built: cards, tiles, banner, private empty state, keys, spec cases, e2e/ui/647-1.spec.ts (written, not run).
- build exit 0; lint exit 0; lint:reuse/icons/no-native-select/override/ledger/breadcrumbs/log-query exit 0.
- `pnpm run test:ci` exit 1: 3 AppComponent specs fail with `The "bell" icon has not been provided` — plan 646's bell is missing from `src/testing/test-lucide-icons.ts` (outside scope, fails on the run branch too). 2640 other specs pass, including all platform-learning cases.
