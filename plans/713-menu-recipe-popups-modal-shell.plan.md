# Plan 713 — Menu and recipe popups on the shared popup frame

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
Six popups still draw `.c-modal-overlay` by hand, each with its own `role="dialog"` and a document-wide Escape
listener: five in the event-menu editor (deposit paid, not closed, event closing, supplier orders, prep sheets) and
the recipe builder's "paste ingredients" (`night/style-audit.md` P7; registry `modal-shell` "Known copies"). They miss
what the shared frame gives every other popup — focus trap and restore, Escape only for the top-most popup, the
discard question, the phone sheet — and three of them hand-build an empty state. This plan moves all six onto
`app-modal-shell` with the same inputs and outputs, so the parent pages do not change.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `menu-intelligence/components/deposit-paid-dialog/deposit-paid-dialog.component.html:1-6` overlay + `c-modal-card
  c-modal-card--md` + `role="dialog"`; `.ts:37` `host: { '(document:keydown.escape)': 'cancelled.emit()' }`; outputs
  `cancelled` / a save output.
- `not-closed-dialog` same shape (`.ts:24`); `event-closing-dialog` (`.html:1-6`, `.closing-card`, own
  `.closing-header` with an X on `c-btn-ghost` at `:20`; `.ts:52` Escape → `closed`); `supplier-orders` (`.html:1-6`,
  `.so-sheet`, `onOverlayClick`, `.ts:55` Escape → `close`; `.so-card` surface `.scss:43`); `prep-sheets`
  (`.html:1-6`, `.prep-overlay`, `.ts:66`; printable; `.prep-nothing` / `.prep-empty` `html:46,66`; raw
  `<table class="prep-table">` `:68`). Opened from `menu-intelligence.page.html:278,280` and siblings by page signals.
- `recipe-builder/components/paste-ingredients-dialog/paste-ingredients-dialog.component.html:2-6` overlay with
  `popover` + `role="dialog"`.
- `app-modal-shell` (`src/app/shared/modal-shell/modal-shell.component.ts:57-85`): `size` `'sm'|'md'|'fluid'`,
  `titleKey`, `labelledBy`, `labelKey`, `cardClass`, `dismissible`, `zIndex`, `topLayer`, `sheet`, `hasChanges`,
  `saveAndClose`; output `dismissed`. It renders `.c-modal-overlay` / `.c-modal-card`; content goes in
  `.c-modal-body` / `.c-modal-actions`.
- Kept off the shell on purpose by the registry: `menu-export-sheet`, `shared/export-preview` (not touched).
- From 703: `.c-table(--compact)`, `app-empty-state [compact]`, `styleFindings`.

## Goals & Success Criteria
**Primary:** no popup in the menu editor or the recipe builder draws its own overlay; each opens and closes exactly as
before, through `app-modal-shell`.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-713.test.mjs`: `styleFindings` on every `.html`/`.scss` under the six component folders returns `[]` (no `hand-drawn-dialog`, no `local-empty`); none of the six `.ts` files contains `document:keydown.escape`; each template contains `<app-modal-shell`.
- [auto] `pnpm run test:ci` passes; each of the six existing specs gains a case: Escape (dispatched on the shell) emits the same output the old listener emitted; a backdrop click emits it too; `src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.spec.ts`: a menu with nothing to prep renders `app-empty-state`, and the prep table has `.c-table`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0 (rule `hand-drawn-modal-overlay` reports none of these six files).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] an event menu → "סגירת אירוע": the popup opens, Tab stays inside it, Escape closes it and the focus returns to the button you pressed.
- [human] an event menu → prep sheets → print preview (Ctrl+P): the printed sheet looks as before (no dark backdrop, no popup frame on paper).
- [human] a recipe → "הדבקת רכיבים": paste two lines and press Escape — the popup asks before throwing away the text.
- [human] the list's page with no items · open the page · a message says the list is empty (an event menu with no dishes → prep sheets; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703. Plan 717 (menu-intelligence paper skin) runs after this one.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/deposit-paid-dialog/**
src/app/pages/menu-intelligence/components/not-closed-dialog/**
src/app/pages/menu-intelligence/components/event-closing-dialog/**
src/app/pages/menu-intelligence/components/supplier-orders/**
src/app/pages/menu-intelligence/components/prep-sheets/**
src/app/pages/recipe-builder/components/paste-ingredients-dialog/**
scripts/test/style-713.test.mjs
src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the scope matches `src/app/**/*ai*` only by file or folder name (e.g. waitlist, platform-ai-shots, ai-model-manager, deposit-paid, dashboard); no AI call is added, moved or changed, and every model call still goes through `server/routes/ai.js`.
- INV-none: preserves — popup frames only; the event-closing, deposit and order writes and the paste parsing keep their services and outputs.

## Reuse Check

- Six popup frames — family: modal-shell — rung: 1 — why: `app-modal-shell` (sizes `md` for the four small dialogs, `fluid` for supplier orders and prep sheets; `[sheet]="true"` on the two big ones for phones).
- Prep empty texts — family: empty-state — rung: 1 — why: `app-empty-state [compact]`.
- Prep table — family: engine-classes — rung: 1 — why: `.c-table.c-table--compact` (print keeps its own `@media print` rules).
- `.so-card` surface — family: engine-classes — rung: 1 — why: `.c-glass-panel`.
- none new.

## Defaults

- unsaved-changes-on-leave — applies — how: paste-ingredients and deposit-paid pass `[hasChanges]` (text typed / amount typed), so Escape and backdrop ask before discarding (the shell's rule); their own Cancel still closes at once
- confirm-destructive-action — exception — why: no destructive action changes
- empty-state-on-list — applies — how: `app-empty-state` in prep sheets
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef closing an event, I want its popups to behave like every other popup, so that Escape, Tab and the back gesture always do the same thing.

## Functional Requirements

### Must Have (P0)
- [ ] Each of the six templates replaces its overlay + card wrapper with `app-modal-shell` (`size` per Reuse Check,
  `labelledBy` = the existing title element id or `titleKey` = the existing title key, `cardClass` = the old card
  modifier class when it carries layout, `(dismissed)` = the output the old overlay click and Escape emitted); the
  content keeps its markup inside `.c-modal-body` and its buttons inside `.c-modal-actions`.
- [ ] Each `.ts` drops its `host: { '(document:keydown.escape)': … }` and any `onOverlayClick` handler; inputs and
  outputs keep their names, so `menu-intelligence.page.html` and the recipe builder need no change.
- [ ] `event-closing-dialog`: its `.closing-header` X button becomes `.c-icon-btn` (16) with the `close` label.
- [ ] `supplier-orders`: `.so-card` → `.c-glass-panel`; `prep-sheets`: `.prep-nothing` / `.prep-empty` →
  `app-empty-state [compact]="true"` with their existing keys, `.prep-table` → `.c-table.c-table--compact`, the
  `.prep-overlay` rules go, and its `@media print` rules hide `.c-modal-overlay` chrome (backdrop, card shadow and
  border) so only the sheet prints.
- [ ] The registry (`modal-shell` "Known copies") is updated by plan 718, which owns `docs/brain/component-families.md`
  for the whole style run; this plan does not write it.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping), except inside `@media print`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. The shell traps focus and restores it to the opener. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the deposit-paid and not-closed popups onto the shared frame with the same outputs — src/app/pages/menu-intelligence/components/deposit-paid-dialog/**, src/app/pages/menu-intelligence/components/not-closed-dialog/**
- [ ] A2: Move the event-closing popup onto the shared frame with an icon close — src/app/pages/menu-intelligence/components/event-closing-dialog/**
- [ ] A3: Move supplier orders and prep sheets onto the shared frame, keep printing clean, and use the shared table and empty state — src/app/pages/menu-intelligence/components/supplier-orders/**, src/app/pages/menu-intelligence/components/prep-sheets/**
- [ ] A4: Move the paste-ingredients popup onto the shared frame with the discard question — src/app/pages/recipe-builder/components/paste-ingredients-dialog/**
- [ ] A5: Lock the six popups on the shared frame with the style guard — scripts/test/style-713.test.mjs

## Technical Considerations
- The style test `scripts/test/style-713.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-713.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the paste dialog used the `popover` attribute to sit in the top layer — use the shell's `[topLayer]="true"`
  if it opens above another popup (it opens from the recipe builder page, so it does not); the shell's Escape fires
  only for the top-most popup — a dialog opened over prep sheets must still close first.

## Out of Scope
- `menu-export-sheet`, `shared/export-preview` (kept off the shell by the registry), the menu-intelligence paper skin
  (plan 717), `loading-list`.

## Critical Questions
- none

## Execution Notes
- behaviour: Escape and a backdrop tap on the paste and deposit popups now ask before discarding typed text (the shared frame's rule, plan 498); their Cancel button still closes at once.
- behaviour: supplier orders and prep sheets open as bottom sheets on phones (`[sheet]="true"`), centred popups from the tablet width up.
