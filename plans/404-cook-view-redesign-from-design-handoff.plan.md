# Plan 404 — Cook View redesign from design handoff

Status: active
Track: design — Cook View handoff (overrides `/design-port` for this screen)
Snapshot: a82263c8fa94cdb0937a064478f3cd13230591c6

## Problem Statement
The Human delivered a dedicated, high-fidelity Cook View handoff (`design_handoff_cook_view`,
2026-10-10), vendored at `.interface-design/handoffs/cook-view/`. Its `README.md` is the spec;
`designs/Cook View A.html` (+ `Cook View A Breakpoints.html`) is the visual reference. Goals:
glanceable at arm's length, fewer controls at once, one responsive model (620/767/768/1023), a
dark kitchen mode that retints the whole viewport, no emoji, no hard-coded colours.

For Cook View this handoff supersedes the `/design-port` screen order and its
`.interface-design/source/` reference (Human, 2026-10-10). Where the README's "Read this first",
"Gap resolutions" and "Step clocks" sections disagree with the earlier sections, they win.

Note: plan number assigned in the wt-3 slot by `scripts/next-plan-number.mjs` (Human chose to
save and run here, 2026-10-10); this plan file rides `feat/404-cook-view-redesign`.

## Decisions (Human, 2026-10-10)
1. Photo hero: slim banner when `recipe.imageUrl` exists (120px phone / 180px desktop, radius 20,
   bottom scrim, title + chips in white); no image → plain header as in the prototype. No 320px hero.
2. Scroll model: normal page scroll at every width; remove fixed shell height, inner pane scroll,
   `scrollIndicators` usage and `.cv-pane-scroll-indicator*`.
3. Scale-to-ingredient: drop the confirm modal; the live preview line + "חזרה למתכון המלא" cover it.
4. Default theme stays as today (`isDarkTheme_` defaults to dark).

## Goals & Success Criteria
- Primary: Cook View matches `Cook View A.html` at all four widths in light and dark, with every
  behaviour listed under README "Behaviour that already exists" preserved.
- Success:
  - [auto] `npm run build` passes.
  - [auto] `npm run lint` exits 0.
  - [auto] `npm run lint:icons` exits 0.
  - [auto] `npm test -- --watch=false` passes, including new `CookTimerService` pause/resume/reset specs.
  - [auto] `rg -n "🧪|⏱|⌚|🎉|✓" src/app/pages/cook-view` prints nothing.
  - [human] After steps 1–2: dashboard, inventory, recipe book, menu library, suppliers and venues
    look unchanged in light mode on phone, tablet, desktop.
  - [human] README "Acceptance checklist" passes on phone / small tablet / tablet / desktop, light and dark.
  - [human] Login gates, save with master scope, cancel, pending-changes guard, exports/print, approve stamp, rating still work.

## Execution Mode
- Parallel: no — ten steps in order; stop after each for the Human to test.
- Concurrent plans: none touching cook-view, header, tab-chips, hero-fab, approve-stamp, export-preview.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`public/assets/data/dictionary.json`, `src/app/app.routes.ts` — add to them, never
rewrite or remove an existing entry without escalating).

`src/styles.scss` is listed explicitly: steps 1–2 add tokens and convert the hard-coded colours
in the existing `.c-tab-pill` and `.c-icon-btn` rules to tokens (in-place edits, approved with
this plan by the Human 2026-10-10). Nothing else in it is rewritten.

```scope
src/app/pages/cook-view/**
src/app/core/components/header/**
src/app/core/components/tab-chips/**
src/app/core/components/hero-fab/**
src/app/shared/approve-stamp/**
src/app/shared/export-preview/**
src/app/shared/counter/counter.component.scss
src/app/app.config.ts
src/styles.scss
public/assets/data/dictionary.json
e2e/cook-view*.spec.ts
.interface-design/handoffs/cook-view/**
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client-side styling, layout and one component-scoped timer service; no
  ownership, tenancy, schema, taxonomy or AI-call change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol and print one line per commit: `ok` or `conflict: <what>`. STOP for a go only on a
`conflict`.

## Process per step
After each step: `npm run lint`, `npm run lint:icons`, unit tests; summarise; STOP for the Human to
test phone, tablet and desktop in light and dark. Continue only on the Human's go.

## Atomic Sub-tasks
- [x] 1 Tokens and theme scope: new tokens (`--pri`, `--soft-ink`, `--hdr*`, `--chrome*`, `--act-*`, `--tab`), `:root.theme-kitchen` overrides, `CookViewPage` toggles `theme-kitchen` on `document.documentElement` (removed in `ngOnDestroy`) — src/styles.scss, src/app/pages/cook-view/cook-view.page.ts
- [x] 2 Header and chips tokenization (nav pills, user chip, guest avatar, bottom nav, profile menu, `.c-tab-pill`, `.c-icon-btn`) — src/app/core/components/header/header.component.scss, src/app/core/components/tab-chips/**, src/styles.scss
- [x] 3 Breakpoints and page frame (1440 max-width frame, page scroll, 620/767/768/1023, hidden page scrollbar, drop fixed shell + scroll indicators) — src/app/pages/cook-view/cook-view.page.html/.scss/.ts
- [x] 4 Page header + meta chips (back with history fallback, title, approval chip, cost, yield, rating, timer chip, theme toggle, edit, export menu / phone ⋮ top bar, slim photo banner) — src/app/pages/cook-view/**
- [x] 5 Panes + ingredient rows + row expander (unit dropdown of the other units + "+ יחידה חדשה" saved on the product — Human 2026-10-10; no current-unit tile, scale-to-ingredient with live preview, no confirm modal, editable scaled banner, long-press, ready badge, unlinked italic) — src/app/pages/cook-view/**, src/app/shared/unit-expander/**
- [x] 6 Steps (done/active/pending rows, step clocks per "Step clocks", editable countdown, row pills, grow animation, clickable done rows) + `CookTimerService` `pauseTimer`/`resumeTimer`/`resetTimer` with unit tests — src/app/pages/cook-view/**
- [x] 7 Single scrolling page below 768 (sticky switch buttons, scroll spy, scroll-margin-top, `scrollToActiveStep` block:'start') — src/app/pages/cook-view/**
- [x] 8 Edit mode (banner, header actions, phone save bar, FAB hide/stamp lift, restyled ingredient edit rows, changed-field highlight, restyled `app-recipe-workflow` container) — src/app/pages/cook-view/**, src/app/core/components/hero-fab/**, src/app/shared/approve-stamp/**
- [ ] 9 Dish mode, empty state, export preview paper skin — src/app/pages/cook-view/**, src/app/shared/export-preview/**
- [ ] 10 Cleanup: delete dead classes from the class map, remove emoji, register icons, translation keys, lint + icons + unit tests + Playwright e2e for `/cook` — src/app/pages/cook-view/**, src/app/app.config.ts, public/assets/data/dictionary.json, e2e/cook-view*.spec.ts
