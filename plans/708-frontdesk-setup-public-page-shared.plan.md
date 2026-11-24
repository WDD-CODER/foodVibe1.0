# Plan 708 — Front desk settings, onboarding and the public booking page on shared states and cards

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The front-desk settings page, the printable onboarding form and the guest booking page each style their own loading
text, cards and card titles (`night/style-audit.md` P5, P6, P8, P9): "loading" is a plain `<p>` in four places, the
public page hand-writes the `c-empty-state` markup, the card title is `1.05rem` in four files and `--fs-lg` in a fifth,
three onboarding buttons use `c-btn-secondary`, **a class that does not exist** (they render as bare browser buttons),
closed dates are a removable chip on one page and a list with × buttons on the other, and icon-only buttons sit on
`c-btn-ghost`. This plan converges them on `app-loader`, `app-empty-state`, `.c-card-head`, `.c-glass-panel`,
`.c-btn-ghost`, `.c-icon-btn` and `.c-chip--removable`, and moves the stylesheets to tokens.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `frontdesk/frontdesk-settings/frontdesk-settings.page.html:6` `p.fs-loading`; `.scss:37,42,87` font sizes
  `1.05/0.95/0.9rem`; `.fs-savebar` (`.scss:90-102`) `#fff` fallback and literal shadow; `:209` closed dates as
  `c-chip--removable`; the QR print sheet `h1.fs-qr-print-name` (`:191`, print only — kept).
- `frontdesk/frontdesk-settings/components/request-kind-card/request-kind-card.component.html:87,96,105` icon-only
  `c-btn-ghost`; `.scss:22,28` font sizes, `.scss:50-57` `.rk-question` with `rgb(0 0 0 / 12%)` and `0.75rem` radius.
- `frontdesk/frontdesk-settings/components/table-service-card/table-service-card.component.html:65` icon-only
  `c-btn-ghost`; `.scss:13` uses `--fs-lg` for the title. `data-export-card.component.scss:17` `1.05rem`.
- `frontdesk/frontdesk-onboarding/frontdesk-onboarding.page.html:5` `p.ob-loading`; `:108,298,304` `c-btn-secondary`
  (`grep -c c-btn-secondary src/styles.scss` → 0); `:113-127` closed dates `ul.ob-dates`; `:22` `label.ob-flag`
  checkbox; `.scss:29,34,40,87` font sizes, `:54` `rgb()`; every icon 14.
- `public-request/public-request.page.html:3,115` `p.pb-loading`; `:11-19` hand `div.c-empty-state`; `:162`
  alternative times as `c-btn-ghost` inside a `c-chip-group`; `.scss:28-35` `.pb-card` surface, `:52-55,76-86` local
  `c-chip--toggle` extensions, font sizes `:25,39,54,69,134`. `public-request-status/public-request-status.page.html:3`
  `p.pb-loading`. `components/public-brand/public-brand.component.scss:20` `font-size: 1.4rem`.
- From 703: `.c-card-head`, `.c-page--narrow`, `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** the three setup and guest screens use the shared loader, empty state, card, card head, buttons and chips;
no button in them is unstyled.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-708.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/frontdesk/frontdesk-settings/`, `src/app/pages/frontdesk/frontdesk-onboarding/` and `src/app/pages/public-request/` returns `[]` (print-only rules sit in `@media print`, which the guard skips; a print rule outside such a block is moved into one); no template contains `c-btn-secondary`, `fs-loading`, `ob-loading`, `pb-loading`, `ob-dates`, `class="c-empty-state`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts` (while loading one `app-loader` renders), `src/app/pages/frontdesk/frontdesk-onboarding/frontdesk-onboarding.page.spec.ts` (two closed dates render two `.c-chip--removable`; removing one leaves one) and `src/app/pages/public-request/public-request.page.spec.ts` (while loading one `app-loader`; an unknown slug renders `app-empty-state`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/frontdesk/onboarding` on a laptop: the three buttons that looked like plain grey browser buttons now look like the app's other light buttons; closed dates look like the chips on `/frontdesk/settings`.
- [human] `/frontdesk/settings`: every card title has the same size and the same icon placement.
- [human] the guest page `/book/<your slug>` on a phone: while it loads a spinner shows (not the word "loading"), and the form card looks like the app's other cards.

- [human] the list's page with no items · open the page · a message says the list is empty (`/book/no-such-place`: the not-found message; default `empty-state-on-list`)
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (`/book/<your slug>` with the server stopped: "לא הצלחנו לטעון את הדף"; default `loading-and-error-states`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/frontdesk-settings/**
src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.spec.ts
src/app/pages/frontdesk/frontdesk-onboarding/**
src/app/pages/frontdesk/frontdesk-onboarding/frontdesk-onboarding.page.spec.ts
src/app/pages/public-request/**
src/app/pages/public-request/public-request.page.spec.ts
scripts/test/style-708.test.mjs
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and styles; the public page still reads and writes only through `server/routes/public.js` with the same service calls (INV-1's public path is not touched).

## Reuse Check

- Loading texts — family: feedback — rung: 1 — why: `app-loader`.
- Hand-written empty markup — family: empty-state — rung: 1 — why: `app-empty-state` with the same key and CTA.
- Card titles — family: engine-classes — rung: 1 — why: `.c-card-head` (703) with `__icon`, `__title`, `__end`.
- `.pb-card`, `.rk-question`, `.fs-savebar` surfaces — family: engine-classes — rung: 1 — why: `.c-glass-panel` (cards), tokens for the save bar (`--bg-glass-strong`, `--shadow-card`).
- `c-btn-secondary` and icon-only ghost buttons — family: engine-classes — rung: 1 — why: `.c-btn-ghost`, `.c-icon-btn`.
- Closed dates, flag checkbox, alternative times, kind and time chips — family: chip — rung: 1 — why: `.c-chip--removable`, `.c-chip--toggle`, `.c-chip--tap`; taken times use the chip's `disabled` look.
- none new.

## Defaults

- loading-and-error-states — applies — how: `app-loader` in the four loading spots; the existing error texts (`fd_profile_load_failed`, `pb_load_failed`) show through `app-empty-state icon="alert-triangle"`
- empty-state-on-list — applies — how: `app-empty-state`
- unsaved-changes-on-leave — exception — why: the settings form keeps its current save bar and guard; only styles change
- confirm-destructive-action — exception — why: no destructive action is added or changed
- hints-in-tooltips — exception — why: no explanation text is added or moved
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the setup screens to look like the rest of the app, so that I trust they are part of it.
- As a guest, I want the booking page to show it is loading, so that I don't think it is broken.

## Functional Requirements

### Must Have (P0)
- [ ] `frontdesk-settings`: `p.fs-loading` → `app-loader`; every card title block → `.c-card-head` (icon 18,
  `__title` with the existing key, trailing actions in `__end`); `.fs-savebar` → tokens (`--bg-glass-strong`,
  `--shadow-card`, `--space-*`), no `#fff`; page root `.c-page.c-page--narrow` (48rem, unchanged width); print sheet
  untouched except tokens where they do not change print size.
- [ ] `request-kind-card`, `table-service-card`, `data-export-card`: card titles → `.c-card-head`; icon-only buttons
  → `.c-icon-btn` (16, same `aria-label`); `.rk-question` → `--border-default`, `--radius-md`, `--space-*`.
- [ ] `frontdesk-onboarding`: `p.ob-loading` → `app-loader`; `c-btn-secondary` ×3 → `c-btn-ghost`; closed dates →
  `c-chip-group` of `c-chip c-chip--removable` with `.c-chip__remove` (same remove handler), as on settings; the flag
  checkbox → `label.c-chip.c-chip--toggle`; card titles → `.c-card-head`; icons 16 (buttons) / 18 (card heads).
  The onboarding baseline section stays (duplicating `settings/baseline-tab` is a content decision, not style).
- [ ] `public-request` and `public-request-status`: `p.pb-loading` → `app-loader`; hand `div.c-empty-state` →
  `app-empty-state` with the same key and CTA; `.pb-card` → `.c-glass-panel` plus spacing tokens; the alternative
  times → `c-chip c-chip--tap` buttons in the same `c-chip-group`; `pb-kind` / `pb-time` local extensions removed in
  favour of plain `c-chip--toggle` (taken time = `disabled` input, the engine's disabled look); `public-brand` title
  `1.4rem` → `--fs-xl`.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Public pages have no app header; they keep their own brand block. No new dictionary key; icons already
  registered (`x`, `alert-triangle`, `calendar-x`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give the front-desk settings page the shared loader, card heads and a token save bar — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html, .scss, .ts, .spec.ts
- [ ] A2: Put the three settings cards on the shared card head and icon buttons — src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/*, table-service-card/*, data-export-card/*
- [ ] A3: Fix the unstyled onboarding buttons and draw closed dates and the flag as shared chips — src/app/pages/frontdesk/frontdesk-onboarding/*
- [ ] A4: Give the guest booking and status pages the shared loader, empty state, card and chips — src/app/pages/public-request/**
- [ ] A5: Lock the three areas on the shared pieces and tokens — scripts/test/style-708.test.mjs

## Technical Considerations
- The style test `scripts/test/style-708.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-708.test.mjs`; `src/app/pages/frontdesk/frontdesk-onboarding/frontdesk-onboarding.page.spec.ts` and `src/app/pages/public-request/public-request.page.spec.ts`
  if they do not exist (beside their components, covered by the folder globs).
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none (the public page's reads
  are unchanged). Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the onboarding page prints — keep its `@media print` rules (the guard skips them); `app-loader` on the public
  page must not need the signed-in app shell (it is a plain shared component — check it renders on the bare route).

## Out of Scope
- `src/app/pages/frontdesk/floor-plan/**`, `src/app/pages/frontdesk/simulator/**`, `src/app/pages/frontdesk/knowledge/**` (plan 707).
- Merging the onboarding baseline section with the settings baseline tab.

## Critical Questions
- none

## Execution Notes
- behaviour: `c-btn-secondary` (undefined) becomes `c-btn-ghost` — the closest existing secondary button.
- behaviour: card titles use `--fs-md` semibold (`.c-card-head__title`), the size four of the five cards were close to.
