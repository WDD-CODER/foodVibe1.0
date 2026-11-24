# Plan 706 — Requests and inbox on the shared frame, rows and fields

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The requests queue (`/requests`) and the guest inbox (`/inbox`) are the two busiest front-desk screens and each draws
its own frame: requests sit in a 60 rem column, show nothing while loading, and its three dialogs mix the old
`c-input-stack` + `<label>` fields with `app-form-field` in the same popup; the inbox list is a hand-made `ul` of links
with a private highlight (`inset 3px` shadow) instead of the shared selected row, and the thread pane re-declares the
glass panel (`night/style-audit.md` P2, P3, P6, P10; `shots/requests.png`, `shots/inbox.png`). This plan moves both
pages to `.c-page`, the inbox list to `.c-list` with `.is-selected`, the thread to `.c-glass-panel`, adds `app-loader`
to requests, puts every dialog field on `app-form-field`, and converts the stylesheets to tokens. The request card
stays a card (it carries a verdict, the guest's text and three decisions).

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `src/app/pages/requests/requests.page.html`: `app-page-header` + "בקשה חדשה"; tabs `div.rq-tabs[role=tablist]` of
  `c-chip c-chip--tab` (`:11-27`); `@if (!isLoading_())` (`:29`, nothing while loading); `div.rq-list` of
  `app-request-card` (`:32-44`), each `article.rq-card.c-glass-card`. `requests.page.scss:9` `max-inline-size: 60rem`.
- Dialogs with mixed fields: `requests/components/new-request-dialog/new-request-dialog.component.html:22,37,54,66,
  103,123,135,153` (`c-input-stack`) beside `app-form-field` (`:86-100`); `ask-dialog.component.html:3`;
  `decline-dialog.component.html:3,16`. Literal weight 600 in `approve-table-dialog.component.scss:9`.
- `src/app/pages/inbox/inbox.page.html`: filter `c-chip-group` of `c-chip--toggle` radios (`:13-26`); list
  `ul.ibx-rows > li > a.ibx-row` (`:40-63`, styled `inbox.page.scss:42-59` with `box-shadow: inset 3px 0 0`); thread
  header with `a.ibx-back` (`:69-107`); `.ibx-thread` (`.scss:83-93`) and `.ibx-card` (`.scss:140-148`) re-declare
  surfaces; `a.ibx-card-link` plain link (`:122`); `max-inline-size: 72rem` (`.scss:11`).
- `app-form-field` (`src/app/shared/form-field/`): `label`, `forId`, `error`, `hint`, `layout`, `labelStyle`; the
  control is projected and keeps its `.c-input` class.
- From 703: `.c-page`, `.c-list`, `.c-list-row--link`, `.c-row-link`, `styleFindings`.

## Goals & Success Criteria
**Primary:** requests and inbox share the app's frame, row, field and loading pieces, with no change to what they do.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-706.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/requests/` and on `src/app/pages/inbox/inbox.page.{html,scss}` and `src/app/pages/inbox/components/reply-box/reply-box.component.scss` returns `[]`; no requests template contains `c-input-stack`; `inbox.page.html` contains `class="c-list` and no `ibx-row`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/requests/requests.page.spec.ts` (while loading one `app-loader` renders and no card) and `src/app/pages/inbox/inbox.page.spec.ts` (three conversations → three `.c-list-row`; the open one has `.is-selected`; pressing a row navigates to `/inbox/:id` as before).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/inbox` with a few conversations; default `app-list-container`).
- [human] `/requests` → "בקשה חדשה": every field in the popup has the same label style and the same box; type nothing in a required field and press save — the error shows under that field the same way for every field.
- [human] the list's page with no items · open the page · a message says the list is empty (`/requests` → the "נדחו" tab with no declined request; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703. Run it after any open plan that writes `src/app/pages/inbox/inbox.page.*` (the
  assistant plans own only `inbox/components/suggestion-bar/` and `fix-answer-dialog/` today).
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/requests/**
src/app/pages/requests/requests.page.spec.ts
src/app/pages/inbox/inbox.page.html
src/app/pages/inbox/inbox.page.scss
src/app/pages/inbox/inbox.page.ts
src/app/pages/inbox/inbox.page.spec.ts
src/app/pages/inbox/components/reply-box/reply-box.component.scss
scripts/test/style-706.test.mjs
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — templates and styles only; the request decisions, the reply path and the conversation reads go through the same services and routes.

## Reuse Check

- Page frames — family: engine-classes — rung: 1 — why: `.c-page` (72rem) from 703.
- Inbox conversation list — family: list-page — rung: 1 — why: `.c-list` with `.c-list-row.c-list-row--link` and `.is-selected`.
- Thread pane and linked-booking bar — family: engine-classes — rung: 1 — why: `.c-glass-panel`; the bar uses `--bg-muted` through `.c-list--plain`-style tokens, no new class.
- Dialog fields — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`.
- Requests loading — family: feedback — rung: 1 — why: `app-loader`.
- none new.

## Defaults

- app-list-container — exception — why: the inbox list sits beside the open thread (split view) and uses `.c-list`, the in-panel form of the shared list container (703); the requests queue stays a card queue (each card holds a verdict, the guest text and three decisions)
- empty-state-on-list — applies — how: the existing `app-empty-state` of both pages is kept
- loading-and-error-states — exception — why: this plan adds the requests loader only; error paths of both pages are unchanged (toasts)
- unsaved-changes-on-leave — exception — why: no form behaviour changes; the dialogs keep their current close rules
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want the inbox list to look like every other list, so that I see at once which conversation is open and which needs me.
- As a host, I want every request popup to have the same fields, so that I fill a phone request fast without hunting for the box.

## Functional Requirements

### Must Have (P0)
- [ ] Requests page root gets `.c-page`; the `60rem` width and page paddings go. Tabs stay `c-chip--tab` in their
  `role="tablist"` row (`app-tab-chips` is the route sub-nav, not an in-page tab strip).
- [ ] `@if (isLoading_())` renders `app-loader`; the list renders as today otherwise.
- [ ] `request-card` keeps its markup; its stylesheet goes onto tokens; the card stays `.c-glass-card`.
- [ ] Every `c-input-stack` + `<label>` block in `new-request-dialog`, `ask-dialog`, `decline-dialog` becomes
  `app-form-field` with the same label key, `forId` = the control id, `error` = the same error key the template shows
  today; the control keeps its `.c-input` / `app-custom-select` / `app-date-field` / `app-time-field`. Validation,
  submit and close behaviour do not change.
- [ ] Inbox root gets `.c-page`; the list becomes `ul.c-list[role=list]` with `--list-cols: minmax(0, 1fr) auto`; each
  conversation is `li.c-list-row.c-list-row--link[role=listitem]` (`.is-selected` when it is the open one) with cells:
  guest name + last line (`.c-row-link`, last line `--fs-sm` muted, one line with ellipsis) · time + unread / owner
  chip (`c-chip c-chip--tag c-chip--sm`). Navigation stays a real link to `/inbox/:id` in the name cell.
- [ ] `.ibx-thread` is replaced by `.c-glass-panel`; `.ibx-card` uses `--bg-muted`, `--radius-md`, `--space-*`;
  `a.ibx-card-link` and `a.ibx-back` get `.c-btn-ghost--sm`.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping); `line-height: 1.4` → `--lh-snug`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; the selected-row edge follows the direction (`.c-list-row.is-selected`). Icons 16 in rows and chips,
  18 in header buttons. No new dictionary key; no new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Put the requests queue in the shared page frame and show the loader while it loads — src/app/pages/requests/requests.page.html, .scss, .ts, .spec.ts
- [x] A2: Give every field of the three request popups the shared field piece — src/app/pages/requests/components/new-request-dialog/*, src/app/pages/requests/components/ask-dialog/*, src/app/pages/requests/components/decline-dialog/*
- [x] A3: Move the request card and the approve-table popup stylesheets onto tokens — src/app/pages/requests/components/request-card/request-card.component.scss, src/app/pages/requests/components/approve-table-dialog/approve-table-dialog.component.scss, src/app/pages/requests/components/day-load-strip/day-load-strip.component.scss
- [x] A4: Draw the inbox conversations as shared rows with the shared selected look, and the thread as a glass panel — src/app/pages/inbox/inbox.page.html, .scss, .ts, .spec.ts, src/app/pages/inbox/components/reply-box/reply-box.component.scss
- [x] A5: Lock both pages on the shared pieces and tokens — scripts/test/style-706.test.mjs

## Technical Considerations
- The style test `scripts/test/style-706.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-706.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: unchanged (form validators untouched). Security
  surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts`, `src/styles.scss` change.
- Traps: `app-form-field` translates its `label` input — pass the key, not a translated string; the inbox list is also
  the phone's first screen (list then thread) — keep the existing show/hide classes on the two panes.

## Out of Scope
- `src/app/pages/inbox/components/suggestion-bar/**`, `fix-answer-dialog/**` (assistant plans), the simulator.
- A list-shell (search, filter panel) for the inbox or the requests queue.

## Critical Questions
- none

## Execution Notes
- behaviour: the requests queue keeps its cards (decision card with three actions) — the one list in the app allowed to stay cards; recorded as an `app-list-container` exception.
- behaviour: the inbox's private highlight bar is replaced by the shared selected-row outline.
