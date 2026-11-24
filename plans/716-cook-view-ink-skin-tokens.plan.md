# Plan 716 — Cook view: keep the ink skin, move it onto tokens, shared empty states and four icon sizes

Status: draft
Depends-on: 703
Track: code
Snapshot: d06302a3

## Problem Statement
The cook view (`/cook/:id`) has its own "ink" skin, which the registry keeps on purpose, but its 1,851-line stylesheet
holds 24 literal font sizes, seven literal radii (`14px`, `11px`, `9px`, `22px`, `7px`), four literal shadows and
≈60 literal spacings, its templates use ten different icon sizes (11 to 48), and its three empty states are
page-local (`night/style-audit.md` P5, P13, P15). This plan keeps every ink class and the layout as they are, and
moves their values onto the shared tokens, the empties onto `app-empty-state`, and the icons onto the four-step scale
— so the cook view reads as the same app without losing its look.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `cook-view/cook-view.page.html` (876 lines): empty page `div.cook-view-empty` with a 48 icon, text
  `pick_recipe_to_cook`, a `cv-pill-btn--primary` link to `/recipe-book` and recent-recipe chips (`:853-868`);
  `p.empty-state-text` for `no_preparations_defined` (`:666`) and `no_steps_defined` (`:822`); two hand headers
  (`.cv-topbar` `:119-140`, `header.cv-ph` `:193-280`, kept); icon `[size]` values 11, 12, 13, 14, 15, 16, 18, 20, 22, 48.
- `cook-view.page.scss`: radii `:95,756,775,998,1257,1319,1849`; shadows `:1310,1322,1336,1341`; `max-width: 1440px`
  (`:31`); `.cv-pane` surface (`:838-852`); `.cook-view-empty` (`:47`), `.empty-state-text` (`:1805`).
- Registry `chip` keeps the ink set (`cv-chip*`, `cv-row-pill`, `cv-source-pill`, `cv-pill-btn`, `cv-mult-chip`).
- From 703: `app-empty-state` (with `ctaLabelKey` / `ctaClick` and `compact`), token mapping in
  `docs/brain/component-families.md`, `styleFindings`.

## Goals & Success Criteria
**Primary:** the cook view keeps its look and layout, holds no literal colour, size, weight, radius or shadow, uses
the shared empty state, and uses only the icon sizes 14, 16, 18 and 24+.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-716.test.mjs`: `styleFindings(['src/app/pages/cook-view/cook-view.page.scss', 'src/app/pages/cook-view/cook-view.page.html'])` returns `[]`; the template contains no `cook-view-empty`, `empty-state-text`; every `[size]="N"` in it has N in {14, 16, 18, 24, 32, 48}.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/cook-view/cook-view.page.spec.ts` (no recipe → `app-empty-state` with `pick_recipe_to_cook` and its CTA navigates to `/recipe-book`; recent recipes still render as chips under it; a recipe with no steps → compact `app-empty-state` with `no_steps_defined`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] a recipe in the cook view on a tablet and on a phone, side by side with yesterday's screenshot (or memory): the screen looks the same — same dark chips, same pill buttons, same layout — only small size and corner differences.
- [human] `/cook` with no recipe chosen: the empty picture matches the one on `/recipe-book` when it is empty, with the recent recipes under it.
- [human] the list's page with no items · open the page · a message says the list is empty (`/cook` with no recipe chosen; default `empty-state-on-list`)

## Execution Mode
- Parallel: yes — after 703.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.scss
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.spec.ts
scripts/test/style-716.test.mjs
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

- INV-none: preserves — one page's template and stylesheet; recipe reads, scaling and approval are unchanged.

## Reuse Check

- Empty states — family: empty-state — rung: 1 — why: `app-empty-state` (page empty with CTA; compact for no preparations / no steps).
- Ink set (`cv-*` chips, pills, buttons) — family: chip — rung: 1 — why: kept on purpose by the registry; only their values move to tokens.
- `.cv-pane` surface — family: engine-classes — rung: 1 — why: values from the `.c-glass-panel` tokens (`--bg-glass-strong`, `--border-glass`, `--radius-lg`, `--shadow-glass`) — the class stays because the ink skin overrides its background in dark sections.
- none new.

## Defaults

- empty-state-on-list — applies — how: `app-empty-state`
- loading-and-error-states — exception — why: the cook view's load path is unchanged
- one-breakpoint-set — applies — how: `$break-*` names only; `max-width: 1440px` → `max-inline-size: 90rem`

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a cook at the pass, I want the cook view to keep its clear dark chips, so that nothing I rely on during service moves.

## Functional Requirements

### Must Have (P0)
- [ ] `div.cook-view-empty` → `app-empty-state icon="utensils" messageKey="pick_recipe_to_cook" ctaLabelKey="recipe_book"
  (ctaClick)` → navigate to `/recipe-book` (`Router` already injected or `inject(Router)`); the recent-recipe chips stay
  under it in their own `div.cv-recent-chips`.
- [ ] `p.empty-state-text` ×2 → `app-empty-state [compact]="true"` with `no_preparations_defined` / `no_steps_defined`.
- [ ] Every literal in `cook-view.page.scss` becomes a token per the 703 mapping (radii 7→`--radius-sm`, 9/11/14→
  `--radius-md`, 22→`--radius-lg`; shadows → `--shadow-card` / `--shadow-glass`; font sizes and spacings by the table);
  physical properties → logical; the ink colours that are already tokens stay.
- [ ] Icon sizes: 11/12/13 → 14, 15 → 16, 20/22 → 18, 48 stays only in an empty state; nothing else changes in the
  template.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. No new dictionary key; icons already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Show the cook view's three empty cases with the shared empty state, keeping the recent recipes — src/app/pages/cook-view/cook-view.page.html, .ts, .spec.ts
- [ ] A2: Move every value of the ink stylesheet onto the shared tokens and logical properties without changing the layout — src/app/pages/cook-view/cook-view.page.scss
- [ ] A3: Bring the icons onto the four shared sizes — src/app/pages/cook-view/cook-view.page.html
- [ ] A4: Lock the page with the style guard — scripts/test/style-716.test.mjs

## Technical Considerations
- The style test `scripts/test/style-716.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703.
- New files: `scripts/test/style-716.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the stylesheet is long — convert by search, then compare a phone and a tablet screenshot before and after
  (save both under the session folder, not the repo).

## Out of Scope
- Replacing the cook view headers with `app-page-header`, the ink chips with `.c-chip`, the hand stepper with
  `app-counter`, or the `.cv-menu` popover (each changes the cook view's look or behaviour; a later design plan may
  decide).

## Critical Questions
- none

## Execution Notes
- behaviour: the ink skin, headers, menu and stepper keep their look and behaviour; only values move to tokens.
- behaviour: radii and sizes snap to the nearest token (e.g. 14px → 0.875rem `--radius-md` is the same; 11px → `--radius-md` is 3px rounder).
