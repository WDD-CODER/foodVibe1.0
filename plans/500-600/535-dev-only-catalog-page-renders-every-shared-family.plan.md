# Plan 535 — A dev-only catalog page renders every shared UI family with the real components (Claude Design → Angular, 2 of 2)

Status: done
Depends-on: none
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Claude Design and the Human need to see FoodVibe's real shared pieces — every family in every state — to design
against them. React projects get this from Storybook or `/design-sync`; neither works for Angular here (ADR 0019).
The 2026-10-22 draft plan (item 5) proposed a dev-only catalog route as the stand-in: one page that renders every
shared UI family of `docs/brain/component-families.md` with the real Angular components, never in a production build.
Human decision H4 (2026-11-07): plan it now.

Verified at aa12012: `src/app/app.routes.ts` is a flat lazy `Routes` array ending with `{ path: '**', redirectTo:
'dashboard' }` (line 242; append-only hotspot). No dev-only route or guard exists. Every environment file has a
`localDev` flag: `true` in `environment.ts`, `.local.ts`, `.test.ts` (and the slot file take-plan generates), `false` in
`.prod.ts`, `.remote.ts`, `.gh-pages.ts`; `angular.json` swaps them with `fileReplacements`.

## Goals & Success Criteria
**Primary:** in a local or slot dev server, `/dev/catalog` shows each shared UI family with its real component in its
existing states; in production, remote and gh-pages builds the route does not exist.

- [auto] `pnpm run test:ci` exits 0, including `dev-catalog.routes.spec.ts` and `dev-catalog.page.spec.ts` (A2, A6).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:no-native-select` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/535-dev-only-catalog-page-renders-every-shared-family.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/535-dev-only-catalog-page-renders-every-shared-family.plan.md` exits 0.
- [ui] On `/dev/catalog` the page shows the section heading "search-combobox" and an `app-search-combobox` inside it (e2e/ui/535-1.spec.ts, screenshot `screens/535-1.png`).
- [human] On `/dev/catalog` at 1280 px and 390 px, every section listed in "Sections" below is present, each component looks the way it does on its real screens, and nothing overflows the page width.

## Execution Mode
- Parallel: yes — it shares the `app.routes.ts` hotspot (one appended spread), `src/app/pages/breadcrumbs.md`, and with 533/534 `docs/brain/component-families.md` and `.claude/commands/design-port.md`; `plan-order` serializes those (lock groups).
- Concurrent plans: 534 (serialized by shared files).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/dev-catalog/**
src/app/pages/breadcrumbs.md
e2e/ui/535-1.spec.ts
screens/535-1.png
docs/brain/component-families.md
.claude/commands/design-port.md
src/app/pages/dev-catalog/dev-catalog.routes.spec.ts
src/app/pages/dev-catalog/dev-catalog.page.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; a dev-only page that renders shared components with static sample inputs, with no data service, no write and no server call.

## Reuse Check
- `DevCatalogPage` (`src/app/pages/dev-catalog/`) — family: none — rung: 4 — why: a dev-only showcase of the families themselves; nothing in the app lists components, and it must not be reused by any product screen.
- `devCatalogRoutes(localDev)` (`src/app/pages/dev-catalog/dev-catalog.routes.ts`) — family: none — rung: 4 — why: the one place that decides whether the route exists, so it can be unit-tested without swapping environment files.
- The 13 sections — family: engine-classes — rung: 1 — why: every section renders an existing family as is, with its existing inputs: `app-search-combobox`, `app-custom-select`, `app-custom-multi-select`, `app-modal-shell`, `app-page-header`, `app-list-shell`, `app-empty-state`, `app-form-field`, `app-date-field`, `app-input-clear`, `appNumberBox`, `app-counter` / `appStepHold`, `app-tab-chips`, `.c-chip` variants, `app-loader`, `UserMsgService`, `app-edit-gate`, `app-partial-cost-badge`, `.c-*` engine classes. No new input, variant or `.c-*` class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who designs new screens with Claude Design, I want one page that shows every real building block so that a new design starts from what the app already has.

## Functional Requirements

### Must Have (P0)
- [ ] `src/app/pages/dev-catalog/dev-catalog.routes.ts`: `export function devCatalogRoutes(localDev: boolean): Routes` → `localDev ? [{ path: 'dev/catalog', loadComponent: () => import('./dev-catalog.page').then(m => m.DevCatalogPage) }] : []`.
- [ ] `src/app/app.routes.ts` (append-only): one import line and `...devCatalogRoutes(environment.localDev),` added directly above `{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }`; no existing entry changes. No guard (local dev only; nothing is read or written).
- [ ] `DevCatalogPage` (standalone, OnPush, signals, `inject()` only): one `<section>` per family in "Sections" below, in that order, each with an `<h2>` holding the family id as plain text (code identifiers, not UI copy) and the family's components in the states their **existing** inputs allow — one instance per state, labelled with a small `<code>` line naming the input values (for example `disabled=true`). Sample labels and options use existing `dictionary.json` keys through `translatePipe` (no new keys); sample values are local signals. No data service, no HTTP call, no store write.
- [ ] A top bar with in-page links to each section (`<a href="#<family-id>">`), wrapping on a phone.
- [ ] Interactive pieces work for real on the page (typing, picking, opening the sample modal, a toast button per `UserMsgService` kind); nothing persists.

### Should Have (P1)
- [ ] `docs/brain/component-families.md` preamble: "See every UI family live at `/dev/catalog` (dev builds only, plan 535)." `src/app/pages/breadcrumbs.md`: one line for `dev-catalog/`. `.claude/commands/design-port.md` §1 (sources): "Show Claude Design the live families: screenshot `/dev/catalog` from a slot (`node scripts/slot-serve.mjs`), or share it with `/remote`."

### Nice to Have (P2)
- [ ] none.

## Sections (the order on the page; the `[human]` check's list)
1. `search-combobox` — `app-search-combobox` (empty, with results, no results) and `app-custom-select` (closed, with a value, disabled).
2. `multi-pick` — `app-custom-multi-select` (none, three picked).
3. `modal-shell` — a button that opens a sample `app-modal-shell` with a title, body text and a close button.
4. `list-page` — `app-page-header` with a title key, and a small `app-list-shell` with three sample rows.
5. `empty-state` — `app-empty-state` with an existing empty-list key.
6. `form-field` — `app-form-field` with a `.c-input` (plain, with hint, with error), `app-date-field` (empty, with a date, invalid, disabled), `app-input-clear`.
7. `number-box` — one `appNumberBox` container with an `input[type=number]`.
8. `stepper` — `app-counter` (default, at its minimum).
9. `chip` — `.c-chip` tones and the variants listed in the registry entry (`--tag`, `--removable`, `--tab`, `--toggle`, `--tap`), and `app-tab-chips` with two tabs.
10. `feedback` — `app-loader`, and one button per `UserMsgService` message kind.
11. `edit-gate` — `app-edit-gate` with the inputs it has.
12. `cost-badge` — `app-partial-cost-badge` with the inputs it has.
13. `engine-classes` — the `.c-*` buttons, inputs and cards that `src/styles.scss` defines (one sample each).

## UI/UX Notes
- RTL page, logical properties only, component-local SCSS for the page layout (section spacing, the link bar); no new `.c-*` class; mobile first (`$break-mobile` 768).
- No new dictionary keys. Icons: only ones already registered in `src/app/app.config.ts` (`lint:icons` checks).

## Atomic Sub-tasks
- [x] A1: Decide in one tested place whether the catalog route exists — `devCatalogRoutes` — src/app/pages/dev-catalog/dev-catalog.routes.ts
- [x] A2: Prove it — `devCatalogRoutes(true)` has one route with path `dev/catalog`; `devCatalogRoutes(false)` is empty — src/app/pages/dev-catalog/dev-catalog.routes.spec.ts
- [x] A3: Register the route for dev builds only — the import and the spread above the redirects — src/app/app.routes.ts
- [x] A4: Build the page class — sample signals per section, toast handlers, the sample-modal open state; read each family component's real inputs first (`input()` / `model()` in its `.ts`) and use only those — src/app/pages/dev-catalog/dev-catalog.page.ts
- [x] A5: Write the template and the layout SCSS — the link bar and the 13 sections in order — src/app/pages/dev-catalog/dev-catalog.page.html, src/app/pages/dev-catalog/dev-catalog.page.scss
- [x] A6: Unit-test the page renders — creates without errors (the providers the real components need: `provideRouter([])`, `provideHttpClient()` + `provideHttpClientTesting()`, the translation stub the other page specs use), and has 13 `section` elements whose `h2` texts are the family ids in order — src/app/pages/dev-catalog/dev-catalog.page.spec.ts
- [x] A7: Write the `[ui]` card test — `page.goto('/dev/catalog')`, expect the `h2` "search-combobox" and an `app-search-combobox` in its section, screenshot `screens/535-1.png`; run with `pnpm exec playwright test e2e/ui/535-1.spec.ts` — e2e/ui/535-1.spec.ts, screens/535-1.png
- [x] A8: Point people at it — docs/brain/component-families.md, src/app/pages/breadcrumbs.md, .claude/commands/design-port.md
- [x] A9: Run every `[auto]` check and paste the outputs under Execution Notes

## What happens when
- `/dev/catalog` in a production, remote or gh-pages build: the route is not registered, so the `**` redirect sends it to the dashboard.
- A family component needs a provider the page lacks (a crash on render): the page's own spec fails; the Worker adds the provider to the page (`providers`), never changes the component.
- A family has a state no existing input can show: it is not shown; the Worker notes it under Execution Notes (no new input in this plan).
- On leave: nothing to save. On error inside a sample (for example an invalid date): the component shows its own error, as on a real screen.

## Technical Considerations
- Dependencies: the family components and directives named in the Reuse Check; `TranslatePipe`; `UserMsgService`; `environment.localDev`.
- New files needed: `src/app/pages/dev-catalog/` (routes + spec, page ts/html/scss/spec), `e2e/ui/535-1.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none (no data).
- Security surface: none in production (the route does not exist); in dev it shows only static sample content.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no new dictionary keys; RTL / logical CSS; icons registered; `app.routes.ts` append-only; no growth-frozen file touched.

## Out of Scope
- Logic-only families (`modal-controller`, `list-logic`, `entity-form`, and the Logic families section) beyond what a section uses. Screenshot automation of the catalog for Claude Design. Making the catalog a kit pattern (kit brief K5).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 8(b), item D2, decision H4).
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
- Builder 2026-11-08: build 0, lint 0 errors, lint:icons 0, lint:no-native-select 0, breadcrumbs-check 0, test:ci 1729 SUCCESS (incl. dev-catalog specs), log-query SKIP no database, scope --arch ARCH: ok, --reuse ok.
- Builder: e2e/ui/535-1.spec.ts written but not run green here: ng serve starts, yet the app shell renders blank without the backend (localhost:3000 refused, no database in this environment); screens/535-1.png not produced.
- app-tab-chips is route-driven, so it shows no tabs on this page; noted in the page.
