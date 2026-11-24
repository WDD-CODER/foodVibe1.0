# Plan 707 — Clients, settings and knowledge: shared rows, fields and empty states

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
Three screens that already use most shared pieces still have visible odd bits (`night/style-audit.md` P2, P3, P5,
P10; `shots/clients.png`, `shots/settings.png`): client names in the client list render as blue underlined browser
links, the "no match" text is a page-local box, and the client profile's timeline is a hand-made list; the settings
page is 36 rem wide (its header title shrinks), the Team and Access tabs draw their own rows and local field wrappers,
and the Team tab shows the owner row and "עדיין אין חברי צוות" at the same time; the knowledge page leaves five inputs
without `c-input` (they render bare), passes already-translated labels to `app-form-field` (translated twice), shows
"no match" as text and has modal bodies without `.c-modal-body`. This plan fixes those with the 703 pieces.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `clients/components/client-list/client-list.component.html:79` `div.no-results` (`.scss:11-22`, own background,
  `font-size: 0.875rem`); name cells are `<a [routerLink]>` with no class.
- `clients/components/client-profile/client-profile.component.html:157-204` `ul.timeline-list > li.timeline-row`
  (`.scss:75-95`); `:249` an `<input>` with no `c-input`; `.scss:99` `min-width`.
- `settings/settings.page.scss:14` and `settings/components/team-tab/team-tab.component.scss:15` `max-inline-size:
  36rem`; `team-tab.component.html:50-81` `ul.team-list.c-glass-panel > li.team-row` (`.scss:55-74`) and
  `app-empty-state` at `:83` shown even when the list has the owner; `access-tab.component.html:9-27`
  `ul.access-list > li.access-row`; local field wrappers `label.team-field` (`team-tab.component.html:13,26`),
  `label.baseline-field` (`baseline-tab.component.html:5,44`), `label.business-field`
  (`business-settings-tab.component.html:5`); legacy chip modifiers `c-chip teal`, `c-icon-btn danger` still work.
- `frontdesk/knowledge/knowledge.page.html`: `app-list-shell` with `gridTemplate='1fr'` and free `div.row-*` cells
  (`:97-137`); tab chips and bulk actions inside one `c-grid-header-cell` (`:42-76`); no-match text (`:89`); inputs
  without `c-input` (`:163,177,193,246,255`); translated labels passed to `app-form-field` (`:150,159,173`); modal
  contents without `.c-modal-body` (`:149,225`). `app-selection-bar` exists (`src/app/shared/selection-bar/`).
- From 703: `.c-page--narrow`, `.c-list`, `.c-row-link`, `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** clients, settings and knowledge use the shared rows, fields and empty states everywhere, at the app's
standard widths.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-707.test.mjs`: `styleFindings` on every `.html`/`.scss` under `src/app/pages/clients/components/{client-list,client-profile}/`, `src/app/pages/settings/` and `src/app/pages/frontdesk/knowledge/` returns `[]`; none contains `no-results`, `team-row`, `access-row`, `timeline-row`, `team-field`, `baseline-field`, `business-field`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/clients/components/client-list/client-list.component.spec.ts` (a search with no match renders `app-empty-state`; each name is an `a.c-row-link`), `src/app/pages/clients/components/client-profile/client-profile.component.spec.ts` (two timeline items → two `.c-list-row`), `src/app/pages/settings/components/team-tab/team-tab.component.spec.ts` (owner only → one `.c-list-row` and **no** `app-empty-state`; owner plus one member → two rows), `src/app/pages/settings/components/access-tab/access-tab.component.spec.ts` (two grants → two rows) and `src/app/pages/frontdesk/knowledge/knowledge.page.spec.ts` (every text input and textarea in the two popups has `c-input`; labels render once in Hebrew, not as a key).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line (`/clients` names are dark text, not blue links; `/settings` Team tab; default `app-list-container`).
- [human] `/settings` on a laptop: the title "הגדרות" is the same size as "לקוחות" on `/clients`; the Team tab with only you shows your row and no "no team members" message.
- [human] `/frontdesk/knowledge` → add an item: every box in the popup has the same frame as the other popups.

- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (`/settings` → Team → remove a member, then cancel; default `confirm-destructive-action`)
- [human] the list's page with no items · open the page · a message says the list is empty (`/settings` → Access with no consultant; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/clients/components/client-list/**
src/app/pages/clients/components/client-list/client-list.component.spec.ts
src/app/pages/clients/components/client-profile/**
src/app/pages/clients/components/client-profile/client-profile.component.spec.ts
src/app/pages/settings/**
src/app/pages/settings/components/team-tab/team-tab.component.spec.ts
src/app/pages/settings/components/access-tab/access-tab.component.spec.ts
src/app/pages/frontdesk/knowledge/**
src/app/pages/frontdesk/knowledge/knowledge.page.spec.ts
scripts/test/style-707.test.mjs
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

- INV-none: preserves — markup and styles; team, access, client and knowledge writes keep their services and server permission checks (INV-1 untouched: no permission code changes).

## Reuse Check

- Client timeline, team, access lists — family: list-page — rung: 1 — why: `.c-list` with `.c-list-row` / `.c-list-body-cell` (703).
- Client name cell — family: list-page — rung: 1 — why: `.c-row-link` (703).
- No-match and empty — family: empty-state — rung: 1 — why: `app-empty-state`.
- Team / baseline / business fields, profile reason input, knowledge inputs — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`.
- Knowledge bulk actions — family: list-page — rung: 1 — why: `app-selection-bar` in `shell-selection-bar`.
- Settings width — family: engine-classes — rung: 1 — why: `.c-page--narrow`.
- Cell text classes in the new rows (`.timeline-main`, `.timeline-note`, `.timeline-meta`, `.team-name`, `.team-last`, `.access-name`, `.access-since`, `.baseline-field__suffix`, `.business-field__suffix`, `.knowledge-selection`, `.knowledge-selection__count`, `.knowledge-selection__label`) — family: list-page — rung: 2 — why: one-off text styles inside a `.c-list-body-cell`; no shared class carries them.

## Defaults

- app-list-container — applies — how: the client list and knowledge list stay on `app-list-shell`; the timeline, team and access lists are in-panel lists on `.c-list` (703's registered in-panel form)
- empty-state-on-list — applies — how: `app-empty-state`; the Team tab shows it only when no row exists at all
- loading-and-error-states — exception — why: no load path changes; the existing loaders stay
- unsaved-changes-on-leave — exception — why: settings tab forms keep their current guard (`useUnsavedChanges`, plan 498); only the field wrappers change
- confirm-destructive-action — applies — how: removing a member or an access grant keeps its existing confirmation
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want my team list to look like every other list and never say "no team" while it shows me, so that I trust what it says.
- As a host, I want client names to read as names, not web links, so that the list is calm to scan.

## Functional Requirements

### Must Have (P0)
- [ ] Client list: every name link gets `.c-row-link`; `div.no-results` becomes `app-empty-state icon="search"` with
  its existing key (inside the shell body, full row); the `.no-results` rule goes.
- [ ] Client profile: the timeline becomes `ul.c-list[role=list]` (`--list-cols: auto minmax(0, 1fr) auto`: icon ·
  text · date); the do-not-contact reason field becomes `app-form-field` + `input.c-input`; `min-width` →
  `min-inline-size`; stylesheet on tokens.
- [ ] Settings: `.settings-shell` uses `.c-page.c-page--narrow` (48rem); the `36rem` limits in `settings.page.scss`
  and `team-tab.component.scss` go.
- [ ] Team tab: `ul.c-list` inside the existing `.c-glass-panel` (`--list-cols: minmax(0, 1fr) auto auto auto`: name ·
  role chip `c-chip c-chip--tag c-chip--sm c-chip--teal|--amber` · joined date · remove `.c-icon-btn` danger 16);
  `app-empty-state` renders only when the member list (owner included) is empty; `label.team-field` blocks become
  `app-form-field`.
- [ ] Access tab: the same row shape (consultant · granted date · remove).
- [ ] Baseline and business-settings tabs: `label.baseline-field` / `label.business-field` → `app-form-field`; literal
  weights → `--fw-semibold`.
- [ ] Knowledge: every input and textarea in the two popups gets `.c-input`; `app-form-field [label]` receives the key
  (not a translated string); popup contents are wrapped in `.c-modal-body` with actions in `.c-modal-actions`; the
  no-match text becomes `app-empty-state icon="search"`; the bulk actions move from the header cell into
  `app-selection-bar` in the `shell-selection-bar` slot (same buttons, shown while items are selected); the topic
  header row uses `--bg-muted` and `--fs-sm` `--fw-semibold`; cells get `.c-list-body-cell` with `--list`-style start
  alignment through the existing `gridTemplate`.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 16 in rows, 18 in header buttons. No new dictionary key, no new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show client names as row names and the no-match case as the shared empty state — src/app/pages/clients/components/client-list/*
- [x] A2: Draw the client timeline as shared rows and the reason field as a shared field — src/app/pages/clients/components/client-profile/*
- [x] A3: Put settings at the narrow page width and draw the team and access lists as shared rows, with the empty message only when there is no row — src/app/pages/settings/settings.page.scss, src/app/pages/settings/components/team-tab/*, src/app/pages/settings/components/access-tab/*
- [x] A4: Replace the local field wrappers of the baseline and business tabs with the shared field — src/app/pages/settings/components/baseline-tab/*, src/app/pages/settings/components/business-settings-tab/*
- [x] A5: Give the knowledge popups real input boxes and single-translated labels, the no-match empty state and the bulk actions in the selection bar — src/app/pages/frontdesk/knowledge/*
- [x] A6: Lock the three areas on the shared pieces and tokens — scripts/test/style-707.test.mjs

## Technical Considerations
- The style test `scripts/test/style-707.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-707.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: `app-selection-bar` must get the same selected ids the knowledge page holds today; `app-form-field`
  translates `label` — passing a translated string shows the raw Hebrew through the pipe as a missing key.

## Out of Scope
- Client list columns or filters; settings tab order; knowledge import logic.
- `src/app/pages/frontdesk/frontdesk-settings/**` and onboarding (plan 708).

## Critical Questions
- none

## Execution Notes
- behaviour: the Team tab's empty message counts the owner as a member — with only the owner it shows the owner row and no message.
- behaviour: knowledge bulk actions appear in the selection bar only while rows are selected (Polaris rule: bulk actions replace filters while selecting).
- behaviour: settings width 48rem (narrow page) instead of 36rem.
- behaviour: knowledge bulk actions — `app-selection-bar` has no slot for an "approve" action and would add a bulk delete, so the page keeps its own approve-selected button in the `shell-selection-bar` slot (shown while rows are selected); "approve all drafts" stays in the header row — reverse: swap the slot content for `app-selection-bar`.
- Checks: build 0, lint 0, test:ci 3176 pass, test:scripts 172 pass, lint:reuse ok, lint:icons 0, kit-checks ok, kit-manifest ok.
- team-tab spec "centred in a wide page (plan 469)" now asserts the tab sets no width limit and fills the narrow page (the page frame centres it).
- style-707 ALLOW: inputs inside `c-input-wrapper` are allowed as bare-input (the wrapper draws the box).
