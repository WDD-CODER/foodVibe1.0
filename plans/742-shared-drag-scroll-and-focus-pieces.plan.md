# Plan 742 — Three shared pieces the house rules need: one drag look, one scroll area with arrows, one keyboard focus ring

Status: draft
Depends-on: 739
Track: code
Snapshot: 3f5f24a3

## Problem Statement
Plan 739 wrote the house rules (`docs/agent/house-style.md`). Three behaviour rules name a shared piece that does not
exist, so a new page could be told the rule but would still have to build the behaviour itself:

- `drag` — four lists can be reordered, and each styles the drag on its own.
- `scroll` — the "more to scroll" arrows exist only inside the list container.
- `keyboard-focus` — there is no app-wide focus ring.

Dandan (2026-11-25) decided to build the three pieces **before** plan 740 turns the rules into checks, so that every
rule 740 enforces has a piece behind it.

Verified on `origin/main` 3f5f24a3:
- Drag (Angular CDK), four components, each with its own `.cdk-drag-*` rules:
  - `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss:24-46`,
    `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss:538-561` and
    `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss:395-419` share one look: the
    lifted row has `--shadow-card`, `--bg-glass-strong`, `1px solid var(--border-accent)`, `--radius-md`,
    `opacity: 0.95`; the placeholder is `opacity: 0`; rows settle in `250ms cubic-bezier(0, 0, 0.2, 1)`.
  - `src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.scss:140-174` differs: a
    tilted, enlarged row with a primary border and glow, a dashed primary placeholder (`.model-placeholder`), settle
    `300ms var(--ease-spring)`.
  - All four have a `cdkDragHandle` with the Lucide `grip-vertical` icon and a `*cdkDragPlaceholder`. None can be
    reordered with the keyboard: the order changes only in the drop handlers (`onDrop`, `onDropIngredient`,
    `onDropStep`, `onDropWorkflow`).
- Scroll: `src/app/core/directives/scroll-indicators.directive.ts` (`appScrollIndicators`) toggles `can-scroll-up` /
  `can-scroll-down` on a scrolling element. The arrow look is `.scroll-arrow` in
  `src/app/shared/list-shell/list-shell.component.scss:411-463`: `min-height: 1.5rem`, `padding-block: 0.2rem`,
  `color: var(--color-text-muted)`, a `--bg-glass-strong` → transparent gradient, `opacity` 0 → 0.8 over
  `0.2s var(--ease-smooth)`. `src/app/pages/trash/trash.page.scss:210-213` (`.history-overlay-panel`) scrolls on its
  own with a plain `overflow: auto`.
- Focus: `src/styles.scss` has no global `:focus-visible` rule; the ring `outline: 2px solid var(--border-focus)`
  with `outline-offset: 2px` exists only on `.c-chip--toggle`, `.c-chip--tap`, `.c-chip__remove` and on the venue
  cards (`src/app/pages/venues/components/venue-list/venue-list.component.scss:63-66`).
- Motion tokens exist: `--dur-fast` 0.15s, `--dur-base` 0.2s, `--dur-slow` 0.25s (`src/styles.scss:160-162`) beside
  `--ease-spring` and `--ease-smooth`.

## Goals & Success Criteria
**Primary:** drag, inner scroll and keyboard focus each come from one shared piece; the four drag lists and one
scrolling panel use them; `docs/agent/house-style.md` names the pieces instead of `needs:`.

- [auto] `git grep -lE "\.cdk-drag-(preview|animating)|cdk-drop-list-dragging" -- "src/app/**/*.scss"` prints nothing (the drag look lives only in `src/styles.scss`).
- [auto] `grep -c "c-drag-item" src/styles.scss` prints at least `3`; `grep -c "c-scroll-area" src/styles.scss` prints at least `1`; `grep -c ":focus-visible" src/styles.scss` prints a number larger than on `origin/main` (paste both).
- [auto] `git grep -l "c-drag-item" -- "src/app/**/*.html"` lists the four drag templates (ai-model-manager, recipe-ingredients-table, recipe-workflow, ai-draft-editor).
- [auto] `git grep -l "appReorderKeys" -- "src/app/**/*.html"` lists the same four templates.
- [auto] `git grep -l "app-scroll-area" -- "src/app/pages/**/*.html"` lists `src/app/pages/trash/trash.page.html` and `src/app/pages/dev-catalog/dev-catalog.page.html`.
- [auto] `grep -c "needs:" docs/agent/house-style.md` prints `0`; `grep -c "^- later check:" docs/agent/house-style.md` prints `0`.
- [auto] `git diff origin/main -- src/styles.scss` shows added lines only.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0 (includes the new directive and scroll-area specs and the four changed component specs).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line for a file this plan changed; `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/742-shared-drag-scroll-and-focus-pieces.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/742-shared-drag-scroll-and-focus-pieces.plan.md` exits 0; `node scripts/scope-check.mjs --diff=origin/main --plan=plans/742-shared-drag-scroll-and-focus-pieces.plan.md` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Card — drag in a recipe: open a recipe with three or more ingredients in the recipe builder; drag one ingredient by its grip to another place; it lifts with a shadow, the others slide aside, and it lands where you dropped it. The same in the preparation steps.
- [human] Card — reorder with the keyboard: in the same recipe press Tab until a grip is ringed, press the down arrow twice; the ingredient moves down two places, the ring stays on its grip, and the order is kept after saving.
- [human] Card — the AI model order: open the dashboard's metadata tab, AI models; drag a model by its grip; it now lifts like a recipe row (no tilt, no dashed box), still flashes where it landed, and the new order is saved.
- [human] Card — the AI recipe draft: open the AI recipe window with a draft; drag an ingredient line and a step; both behave like the recipe builder.
- [human] Card — scroll arrows in the trash: open the trash, open the history of an item with a long history; the box scrolls with no scrollbar and a small arrow shows at the bottom while there is more, and at the top after scrolling.
- [human] Card — the focus ring: on the dashboard press Tab several times; every button and link you land on shows the same teal ring; clicking with the mouse shows no ring.
- [human] Card — nothing else moved: open the product list, the recipe book and a product form; they look and scroll exactly as before.

## Execution Mode
- Parallel: no — it appends to `src/styles.scss` and `docs/brain/component-families.md`, and changes recipe-builder components other open plans may touch.
- Concurrent plans: none that write the four drag components, `src/app/pages/trash/**` or `docs/agent/house-style.md`.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/scroll-area/**
src/app/core/directives/reorder-keys.directive.ts
src/app/core/directives/reorder-keys.directive.spec.ts
src/app/pages/metadata-manager/components/ai-model-manager/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/shared/ai-recipe-modal/ai-draft-editor/**
src/app/pages/trash/**
src/app/pages/dev-catalog/**
src/app/shared/breadcrumbs.md
src/app/core/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/agent/house-style.md
.interface-design/system.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — the metadata manager's AI model list keeps its one save call for the whole order; only how a row looks while dragged and a keyboard move that calls the same reorder are added. No rename or cascading write is touched.
- INV-6: preserves — the AI model manager and the AI draft editor change only their drag look and keyboard reorder; no model call, key or route is touched.

## Reuse Check
- `.c-drag-list`, `.c-drag-item`, `.c-drag-handle` — family: engine-classes — rung: 3 — why: four components each write the same `.cdk-drag-*` rules; an engine in `src/styles.scss` is where a style used by more than one component lives.
- `.c-scroll-area`, `.c-scroll-arrow` — family: engine-classes — rung: 3 — why: the arrow look exists only inside the list container's own stylesheet.
- `app-scroll-area` (`src/app/shared/scroll-area/`) — family: none — rung: 4 — why: no shared piece scrolls a block with the arrows; `app-list-shell` owns a whole list page and `app-scroll-rail` scrolls sideways. New family `scroll-area`.
- `appReorderKeys` (`src/app/core/directives/reorder-keys.directive.ts`) — family: none — rung: 4 — why: no piece moves a row with the keyboard; the four drag lists have no keyboard way at all. New family `drag-reorder` (the directive plus the three drag engines).
- the global focus ring — family: engine-classes — rung: 3 — why: the ring exists on three chip classes only; one `:where(…):focus-visible` rule in `src/styles.scss` gives it to every control.

## Adopt Check
- app-scroll-area (src/app/shared/scroll-area/) — verdict: skip — why: a thin wrapper over the app's own `appScrollIndicators` directive and its existing arrow look; nothing to adopt.
- appReorderKeys (src/app/core/directives/reorder-keys.directive.ts) — verdict: skip — why: two key handlers on the handle the app already has, calling the reorder the app already does; `@angular/cdk/drag-drop` (already installed) has no keyboard reorder.

## Defaults

- unsaved-changes-on-leave — exception — why: no form is added; a keyboard move marks the recipe form changed exactly as a drop does.
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: no list is added.
- loading-and-error-states — exception — why: no screen is added and no data request changes.
- hints-in-tooltips — exception — why: no dialog explanation is added; the grip keeps its existing title.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list page is built; the list container itself is not changed.
- one-breakpoint-set — exception — why: the new rules have no `@media`.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want moving an ingredient, a step or a model to feel the same everywhere, so that the app feels like one product.
- As a chef who works with the keyboard, I want to reorder a list without the mouse and always see where I am, so that I can work fast.

## Functional Requirements

### Must Have (P0)
- [ ] **Drag engines — `src/styles.scss` (append one block, titled `Drag & drop — shared look`):**
  - `.c-drag-list` — put on the `cdkDropList` element. `.c-drag-list.cdk-drop-list-dragging .c-drag-item:not(.cdk-drag-placeholder) { transition: transform var(--dur-slow) var(--ease-smooth) }`.
  - `.c-drag-item` — put on the `cdkDrag` element. `.c-drag-item.cdk-drag-preview { box-sizing: border-box; background: var(--bg-glass-strong); border: 1px solid var(--border-accent); border-radius: var(--radius-md); box-shadow: var(--shadow-card); opacity: 0.95; cursor: grabbing }`; `.c-drag-item.cdk-drag-placeholder { opacity: 0 }`; `.c-drag-item.cdk-drag-animating { transition: transform var(--dur-slow) var(--ease-smooth) }`.
  - `.c-drag-handle` — put on the `cdkDragHandle` element: `cursor: grab; color: var(--color-text-muted); touch-action: none`, `&:active { cursor: grabbing }`.
  The lifted row's own layout (its `display`, `gap`, `padding`) stays in each component, on its row class.
- [ ] **The four drag lists use the engines.** In each template add `c-drag-list` to the drop list, `c-drag-item` to
  the dragged row and `c-drag-handle` to the handle; in each stylesheet delete the `.cdk-drag-preview`,
  `.cdk-drag-placeholder`, `.cdk-drag-animating` and `…cdk-drop-list-dragging…` rules, keeping only the lifted row's
  layout as `.<row class>.cdk-drag-preview { display; align-items; gap; padding }` where the component had it.
  The AI model manager takes the shared look: its tilt, scale, primary border, glow, the dashed `.model-placeholder`
  style and the 300ms settle are removed (the `*cdkDragPlaceholder` element stays, empty); its `.is-just-moved`
  flash and the `model-landed` keyframes stay. Log this as `- decision: removes: the AI model row's tilt and dashed
  drop box — reverse: restore ai-model-manager.component.scss:140-174`.
- [ ] **Keyboard reorder — `appReorderKeys` (`src/app/core/directives/reorder-keys.directive.ts`, standalone):** put
  on the handle element beside `cdkDragHandle`. It sets `tabindex="0"` and `role="button"` on its host; on
  `keydown.arrowUp` / `keydown.arrowDown` it calls `preventDefault()` and emits `reorder` (an `output<-1 | 1>()`),
  -1 for up and 1 for down. Inputs: `reorderIndex` (required number) and `reorderCount` (required number); it does
  not emit when the move would leave the list (index 0 going up, the last row going down). After emitting it
  restores focus to the same row's handle on the next animation frame (the row is re-rendered in its new place):
  the host element is found again by the `[data-reorder-key]` value it sets from a third input `reorderKey`
  (string | number, required — the row's track value) inside the nearest `.c-drag-list`.
  Spec: emits -1 / 1; does not emit at the two ends; sets `tabindex` and `role`; prevents the page from scrolling.
- [ ] **Each drag list handles the move.** Each component gets one method that moves a row from one index to
  another, and both its drop handler and `(reorder)` call it (drop: `previousIndex` → `currentIndex`; keys:
  `index` → `index + step`). The observable result is the same as a drop: the same output is emitted or the same
  form array / signal is updated, so the same save and unsaved-changes behaviour follow. One spec case per
  component: `(reorder)` with 1 on the first row moves it to the second place.
- [ ] **Handle label:** the handle's `aria-label` and `title` use a new key `drag_reorder_hint` — Hebrew value
  `גרירה, או חצים למעלה ולמטה, לשינוי הסדר` — in `public/assets/data/dictionary.json` (appended). The AI model
  manager's existing `ai_model_drag` key is left in the dictionary and no longer used by its handle.
- [ ] **Scroll engines — `src/styles.scss` (append one block, titled `Scroll area — shared look`):**
  `.c-scroll-area { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; &::-webkit-scrollbar { display: none } }`;
  `.c-scroll-arrow { display: flex; align-items: center; justify-content: center; min-height: 1.5rem; padding-block: 0.2rem; color: var(--color-text-muted); opacity: 0; pointer-events: none; transition: opacity var(--dur-base) var(--ease-smooth) }`;
  `.c-scroll-arrow--top { align-self: start; background: linear-gradient(to bottom, var(--bg-glass-strong) 0%, transparent 100%) }`;
  `.c-scroll-arrow--bottom { align-self: end; background: linear-gradient(to top, var(--bg-glass-strong) 0%, transparent 100%) }`;
  `.c-scroll-arrow.is-shown { opacity: 0.8 }`. The values are the list container's, unchanged.
- [ ] **`app-scroll-area` (`src/app/shared/scroll-area/`, standalone, OnPush):** host `display: grid` with one cell;
  inside, a `div.c-scroll-area` with `appScrollIndicators` that projects `<ng-content />`, and two
  `div.c-scroll-arrow` (`--top` with Lucide `chevron-up`, `--bottom` with `chevron-down`, `[size]="16"`,
  `aria-hidden="true"`) laid over the same grid cell so they stay put while the content scrolls. Input
  `maxBlockSize = input<string>('')` sets the scrolling div's `max-block-size` (empty = it fills its parent). The
  arrows get `is-shown` from the scrolling div's `can-scroll-up` / `can-scroll-down` classes through the component's
  own stylesheet (`.c-scroll-area.can-scroll-up ~ .c-scroll-arrow--top` and the same for down — so the scrolling div
  comes first in the markup, the arrows after it); no new TS state. Spec: renders the projected content; the bottom
  arrow shows when the content is taller than the area and hides at the end.
- [ ] **First users:** `src/app/pages/trash/trash.page.html` — the content of `.history-overlay-panel` is wrapped in
  `<app-scroll-area maxBlockSize="90dvh">`, and `max-height` / `overflow: auto` are removed from
  `.history-overlay-panel` in `trash.page.scss`. `src/app/pages/dev-catalog/dev-catalog.page.html` — one catalog
  entry "scroll area" with twenty short lines in an `app-scroll-area maxBlockSize="10rem"`, and one entry "drag
  list" with four rows using the three drag engines and `appReorderKeys`, following the page's existing entry shape.
  The list container (`src/app/shared/list-shell/`) is not changed.
- [ ] **Focus ring — `src/styles.scss` (append one block, titled `Keyboard focus ring`):**
  `:where(button, a[href], summary, [role='button'], [role='tab'], [role='menuitem'], [role='option'], [tabindex]:not([tabindex='-1'])):focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px }`.
  `:where()` keeps it at zero specificity, so every component rule that already styles its own focus still wins.
  Fields are not in the list: they keep `--shadow-focus`. Under Execution Notes paste the count of
  `git grep -c "outline: none\|outline: 0" -- src` as `- decision: seen:` (controls that still hide the ring; not
  fixed here).
- [ ] **The rules name the pieces — `docs/agent/house-style.md`:** in `### drag`, `### scroll` and
  `### keyboard-focus` replace each `needs: …` sentence with the piece that now exists; in `drag` and `scroll`
  replace the `- check:` line with the `- later check:` line's content as `- check: lint — …` and delete the
  `- later check:` line; set their `gaps today` from a fresh `git grep` (`drag`: 0 files; `scroll`: the page files
  that still have `overflow(-y): auto|scroll`).
- [ ] **Registry and maps:** `docs/brain/component-families.md` — new `### drag-reorder` and `### scroll-area`
  sections in the file's field shape (Status, Use, When, Inputs / variants, Known copies), the five new engine
  classes under `### engine-classes`, and `- Design changes: <date> plan 742 — AI model row takes the shared drag
  look — base — re-checked: metadata manager`; regenerate `docs/brain/inventory.md` with `node scripts/inventory.mjs`;
  add the new folder and file to `src/app/shared/breadcrumbs.md` and `src/app/core/breadcrumbs.md`; update
  `src/app/pages/breadcrumbs.md` only if `breadcrumbs-check` asks. `.interface-design/system.md` — add
  `.c-drag-*`, `.c-scroll-area` and `.c-scroll-arrow` to the "Engine Classes" table.

## UI/UX Notes
- Page recipe: none — no page is added; `behaviour:` `drag`, `scroll`, `keyboard-focus`, `motion` (the new rules use
  `--dur-slow` / `--dur-base` with `--ease-smooth`, never a typed time).
- RTL: logical properties only (`padding-block`, `max-block-size`); up and down arrows are the same in RTL.
- New key: `drag_reorder_hint` (Hebrew value above).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Give every drag list one shared look for the lifted row, the gap and the settle — the drag block with three engine classes — src/styles.scss
- [ ] A2: Move the four drag lists onto the shared look and delete their own copies — engine classes in the templates, the cdk rules out of the four stylesheets — the four drag component folders
- [ ] A3: Let a row be moved with the arrow keys from its grip, so reordering works without a mouse — the reorder-keys directive with its spec — src/app/core/directives/reorder-keys.directive.ts, src/app/core/directives/reorder-keys.directive.spec.ts
- [ ] A4: Wire the keyboard move into the four lists through the same reorder a drop uses — one move method per component, the handle label key, one spec case each — the four drag component folders, public/assets/data/dictionary.json
- [ ] A5: Make the "more to scroll" arrows available to any block, not only to lists — the scroll block in the styles and the scroll-area component with its spec — src/styles.scss, src/app/shared/scroll-area/**
- [ ] A6: Use the shared scroll area in the trash history and show both new pieces in the catalog — the trash panel, two catalog entries — src/app/pages/trash/**, src/app/pages/dev-catalog/**
- [ ] A7: Show one focus ring on every button and link reached with the keyboard — the focus block; the count of controls that still hide it under Execution Notes — src/styles.scss
- [ ] A8: Record the new pieces where builders look, and name them in the house rules — the two registry families, engine lines, inventory, folder maps, the three rules — docs/brain/component-families.md, docs/brain/inventory.md, src/app/shared/breadcrumbs.md, src/app/core/breadcrumbs.md, docs/agent/house-style.md, .interface-design/system.md
- [ ] A9: Run every check of this plan and hand Dandan the seven cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: `@angular/cdk/drag-drop` (already used), `ScrollIndicatorsDirective`, Lucide `chevron-up` /
  `chevron-down` / `grip-vertical` (already registered).
- New files needed: `src/app/shared/scroll-area/scroll-area.component.ts|html|scss|spec.ts`,
  `src/app/core/directives/reorder-keys.directive.ts|spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (five rows); hotspots append-only (`src/styles.scss`, `dictionary.json`); folder maps
  in scope; Hebrew through `translatePipe`; the log-query item. Growth-frozen files (`recipe-builder.page.ts`,
  `cook-view.page.ts`, `menu-intelligence.page.ts`, `product-form.component.ts`) are not touched.
- The drag preview is moved to `<body>` by the CDK, so its look must be a global rule; that is why the engines sit
  in `src/styles.scss` and are keyed on `.c-drag-item`.

## Out of Scope
- Moving the other page-local scroll areas (platform, menu intelligence, recipe builder) onto `app-scroll-area` —
  an alignment plan from plan 739's audit.
- Changing the list container to use the new arrow engine (its own arrows keep working and look the same).
- Removing `outline: none` from controls that hide the ring.
- The lint rules for drag and scroll (plan 740 adds them from the updated house rules).
- A screen-reader announcement of the new position after a keyboard move.

## Critical Questions
- Q: Build the missing pieces before the checks (plan 740)? A: yes — "go at it" (Dandan, 2026-11-25).
- Q: Does the AI model list keep its own fancier drag look? A: no — one look everywhere is the point; it is listed as a `removes:` decision and has its own card.

## Execution Notes
