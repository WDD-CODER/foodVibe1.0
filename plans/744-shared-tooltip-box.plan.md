# Plan 744 — One tooltip box for every hint: a shared piece, the two hand-made tooltips moved onto it

Status: draft
Depends-on: 743
Track: code
Snapshot: 43053fec

## Problem Statement
Dandan (2026-11-25), house rule `tooltip` (`docs/agent/house-style.md`): "we need to create a designated tooltip
container for the application and use it wherever it's needed." Every short explanation shown when a control is
hovered, focused or tapped appears in the app's one tooltip box — the same surface, text size and arrow, opening
beside the control on the side with room, never cut off. The product nutrition box keeps its own look. His default
`hints-in-tooltips` stays (every hint is a tooltip); on 2026-11-25 he answered `reword it`: its `how` line, which
names the browser's `title` and "no new tooltip piece", is reworded to name the shared tooltip.

Today there is no shared tooltip. This plan builds it, moves the two hand-made tooltips and three everyday hints
onto it, and adds the lint that stops new browser-`title` hints. Converting the remaining `title` hints is a later,
mechanical plan, after the Human has seen the box.

Verified on `origin/main` 43053fec (file:line):
- Placement helper: `placeInViewport` (`src/app/core/utils/viewport-placement.util.ts:39-61`; input `{ anchor,
  panel, viewport, prefer?: 'above' | 'below' }`, result `{ top, left, below, maxHeight, anchorCenterX }`; gap and
  margin 8px).
- The box closest to the target look: `src/app/shared/nutrition-badge/` — `popover="manual"`, `position: fixed`,
  `background: var(--bg-glass-dense)`, `border: 1px solid var(--border-default)`, `box-shadow:
  var(--shadow-card)`, a 5px caret at `left: var(--nb-arrow-x, 50%)` that flips with `.nb-tooltip--below`
  (`nutrition-badge.component.scss:25-93`). It has no Escape handler and no focus handling. It is not changed here.
- Hand-made tooltip 1: `span.validation-tooltip[role=tooltip]` in
  `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html:179-220`, state
  `openStatusId_` / `toggleStatus` / `closeStatus` (`.ts:136`, `:526-535`), CSS `.scss:257-290` (absolute, no
  viewport placement; uses `--bg-popover` and `--shadow-md`, which are defined nowhere).
- Hand-made tooltip 2: the cost and date tooltips of the recipe book list —
  `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html:283-323` (triggers),
  `:521-545` (two fixed boxes), CSS `.scss:247-310`, state in a page service `recipe-list-tooltips.service.ts`
  (hover and tap, no flip or clamp).
- Browser `title` hints: 83 lines in 37 templates, all `[attr.title]` or `[title]` bindings. About 20 are
  `'sign_in_to_use'` on a disabled button. Examples used in this plan:
  `src/app/core/components/notification-bell/notification-bell.component.html:6` (`[title]="'alerts_bell_tip' |
  translatePipe"`), `src/app/shared/page-header/page-header.component.html:22` (`.ph-count` `[attr.title]`),
  `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.html:98`
  (`[attr.title]="'edit' | translatePipe"` on a `c-icon-btn`).
- No tooltip or popover directive exists (`src/app/core/directives/`, `src/app/shared/`).
- Defaults in force: `anchored-popup` (as wide as its content, beside what was tapped, on the side with room, never
  cut off; `how`: `placeInViewport`) and `hints-in-tooltips` (`_shared/product-defaults.md:81-91`, `:138-148`).
- z-index: popups in the top layer (`popover`) sit above modals; the nutrition box and the stock count's base
  popover already do this.

## Goals & Success Criteria
**Primary:** one tooltip piece exists, looks and behaves the same wherever it is used, and the two hand-made
tooltips are gone.

- [auto] `git grep -l "appTooltip" -- "src/app/**/*.html"` lists at least: the product list, the recipe book list, the notification bell, the page header, the taxonomy kind manager and the dev catalog templates.
- [auto] `git grep -n "validation-tooltip\|cost-tooltip\|date-tooltip" -- src/app` prints nothing.
- [auto] `grep -c "c-tooltip" src/styles.scss` prints at least `2`; `git diff origin/main -- src/styles.scss` shows added lines only.
- [auto] `grep -c "needs:" docs/agent/house-style.md` is one less than on `origin/main` for the `tooltip` rule (paste both counts); the `tooltip` rule has no `- later check:` line and its check is `lint`.
- [auto] `grep -c "no new tooltip piece" _shared/product-defaults.md` prints `0`; `grep -c "^- status: on" _shared/product-defaults.md` prints the same number as on `origin/main`.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run test:ci` exits 0 (includes the tooltip spec and the changed component specs).
- [auto] `node scripts/kit-checks.mjs --base origin/main` → `KIT_CHECKS: ok`; `node scripts/reuse-lint.mjs --check-registry` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` for a file this plan changed; `node scripts/breadcrumbs-check.mjs` exits 0; `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/744-shared-tooltip-box.plan.md` → `ARCH: ok`; `--reuse` exits 0; `--defaults` exits 0; `--diff=origin/main` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] The catalog sample: open `/dev/catalog` at 1366×768 signed in, hover the button in the "tooltip" entry; an element `.c-tooltip[role="tooltip"]` becomes visible with the text of the dictionary key `dc_tooltip_sample`, lies fully inside the viewport, and the button's `aria-describedby` equals its id; pressing Escape hides it.
- [human] Card — the bell: on any signed-in page hover the notification bell, then reach it with Tab; the same small box appears beside it both times and disappears when you move away or press Escape.
- [human] Card — the product list status: open the product list and hover (or tap) a row's warning badge; its reasons show in the same box, placed fully inside the screen, also on the first and the last visible row.
- [human] Card — the recipe book cost: open the recipe book and hover a recipe's cost; the breakdown shows in the same box; on a phone-width window tapping the cost opens it and tapping elsewhere closes it.
- [human] Card — an explanation of a control in a dialog shows as a tooltip (default `hints-in-tooltips`): a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal. Use the taxonomy manager's edit icon in the dashboard's metadata tab.
- [human] Card — a small floating box stays inside the screen (default `anchored-popup`): any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off. Use the product list's warning badge.
- [human] Card — the nutrition box did not change: open a product that has nutrition data and hover its nutrition badge; the box looks exactly as before.

## Execution Mode
- Parallel: no — it appends to `src/styles.scss`, `_shared/product-defaults.md` and the lint rule data.
- Concurrent plans: none that write the product list, the recipe book list, `src/app/shared/page-header/**` or `docs/agent/house-style.md`.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/tooltip/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/recipe-book/**
src/app/core/components/notification-bell/**
src/app/shared/page-header/**
src/app/pages/metadata-manager/components/taxonomy-kind-manager/**
src/app/pages/dev-catalog/**
e2e/ui/744-1.spec.ts
scripts/lib/registry-families.mjs
_shared/debt-baseline.json
_shared/product-defaults.md
docs/agent/house-style.md
docs/brain/component-families.md
docs/brain/inventory.md
.interface-design/system.md
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/workflow-kit/manifest.json
src/app/pages/metadata-manager/components/station-manager/station-manager.component.spec.ts
```

`_shared/debt-baseline.json` is listed because the new lint rule counts the existing `title` hints (recorded with
`node scripts/debt-baseline.mjs --add-kind`); `docs/workflow-kit/manifest.json` only if `kit-manifest-check` asks.

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-3: preserves — the taxonomy kind manager changes only how the hint of its edit and delete icon buttons is shown; no rename, save or cascading write is touched.

## Reuse Check
- `appTooltip` directive with its box (`src/app/shared/tooltip/`) — family: none — rung: 4 — why: no shared tooltip exists; two pages draw their own and 37 templates use the browser's `title`. New family `tooltip`. It reuses `placeInViewport` (family `helpers`) for placement.
- `tooltip-box` component (`src/app/shared/tooltip/tooltip-box.component.ts`) — family: tooltip — rung: 4 — why: the box the `appTooltip` directive creates; part of the same new family.
- `.c-tooltip--below` — family: engine-classes — rung: 3 — why: the modifier of `.c-tooltip` that flips the arrow when the box sits under the control.
- `.c-tooltip` — family: engine-classes — rung: 3 — why: the box is appended outside the component that asks for it, so its look must be a global engine in `src/styles.scss`.

## Adopt Check
- appTooltip directive with its box (src/app/shared/tooltip/) — verdict: skip — why: a thin piece over the app's own `placeInViewport` and the browser's `popover`; `@angular/cdk/overlay` would bring a second placement system beside the one the `anchored-popup` default names.

## Defaults

- hints-in-tooltips — applies — how: the shared tooltip `[appTooltip]` (src/app/shared/tooltip/) on the control; this plan rewords the default's `how` line to name it (Human, 2026-11-25: "reword it").
- anchored-popup — applies — how: placeInViewport (src/app/core/utils/viewport-placement.util.ts), re-placed on resize, closed on scroll.
- unsaved-changes-on-leave — exception — why: no form is added or changed.
- confirm-destructive-action — exception — why: no delete or discard is added.
- empty-state-on-list — exception — why: no list is built.
- loading-and-error-states — exception — why: no screen is added and no data request changes.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built; two lists only change how a hint is shown.
- one-breakpoint-set — exception — why: the new rules have no `@media`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every little explanation in the app to appear in the same small box, so that the app feels like one product.
- As a chef on a tablet, I want to be able to see a hint by touching, so that hints are not only for people with a mouse.

## Functional Requirements

### Must Have (P0)
- [ ] **The engine — `src/styles.scss` (append one block, titled `Tooltip — shared look`):**
  `.c-tooltip { position: fixed; inset: auto; inline-size: max-content; max-inline-size: min(20rem, calc(100vw -
  1rem)); margin: 0; padding: 0.375rem 0.625rem; color: var(--color-text-main); font-size: var(--fs-xs);
  line-height: 1.4; background: var(--bg-glass-dense); border: 1px solid var(--border-default); border-radius:
  var(--radius-sm); box-shadow: var(--shadow-card); pointer-events: none; overflow: visible }` with a 5px caret
  (`::before` border colour, `::after` fill) at `left: var(--tip-arrow-x, 50%)`, pointing down when the box is above
  the control; `.c-tooltip--below` flips the caret to the top edge. No transition longer than `var(--dur-fast)`.
- [ ] **The piece — `src/app/shared/tooltip/`:** a standalone directive `[appTooltip]` (`tooltip.directive.ts`) and
  a standalone OnPush box component (`tooltip-box.component.ts|html`, no stylesheet of its own; host class
  `c-tooltip`, `role="tooltip"`, `popover="manual"`, `dir` copied from the document).
  - Inputs: `appTooltip = input<string | TemplateRef<unknown> | null>(null)` (an already translated string, or a
    template for rich content; `null` or an empty string means no tooltip), `tooltipPlacement = input<'above' |
    'below'>('above')`, `tooltipOnClick = input(false)`.
  - Opens: a mouse `pointerenter` after 300 ms (cancelled by `pointerleave` before it fires); keyboard focus
    (`focusin` while the element matches `:focus-visible`) at once; a touch or pen press held 500 ms; with
    `tooltipOnClick`, a click or tap toggles it and it stays open (pinned) until closed.
  - Closes: `pointerleave` (unless pinned), `focusout`, Escape (a `keydown` listener on the document while open; it
    does not stop the event, so a dialog's own Escape still works), a `pointerdown` outside the control, any scroll
    (capture) outside the box, when the input becomes empty, and on destroy. Only one tooltip is open at a time:
    opening one closes the other.
  - Shows by creating the box with `ViewContainerRef.createComponent`, appending its element to `document.body`,
    calling `showPopover()`, then placing it with `placeInViewport({ anchor: <the control's rect>, panel: <the box's
    measured size>, viewport, prefer: tooltipPlacement() })`: sets `top`, `left`, `--tip-arrow-x` (the anchor centre
    minus `left`) and the `c-tooltip--below` class; re-placed on window `resize`.
  - Accessibility: the box has a unique id; while open the control's `aria-describedby` is that id (restored to its
    previous value on close). The directive adds no `title` and no `aria-label`.
  - Spec (`tooltip.directive.spec.ts`): hover opens after the delay and leave closes; leave before the delay opens
    nothing; keyboard focus opens at once and blur closes; Escape closes and the event is not stopped;
    `tooltipOnClick` toggles and survives `pointerleave`; an outside press closes a pinned one; a second tooltip
    closes the first; `aria-describedby` is set and restored; a template input renders its content; an empty input
    opens nothing; destroy removes the box from the body; the `--below` class when there is no room above.
- [ ] **Product list warning badge:** the content of `span.validation-tooltip` moves into an `<ng-template>`; the
  `button.row-status` gets `[appTooltip]="<that template>"` with `[tooltipOnClick]="true"` and
  `tooltipPlacement="below"`. Remove the span, its CSS (`.scss:257-290`), `openStatusId_`, `toggleStatus`,
  `closeStatus`, and the badge's `(appClickOutside)` / `(keydown.escape)` bindings; keep `aria-label`; drop
  `aria-haspopup` / `aria-expanded` (a tooltip is described, not expanded). Update the list's spec. Log
  `- decision: removes: the badge's own open/close state (replaced by the shared tooltip, which opens on hover,
  focus and tap as before) — reverse: restore inventory-product-list.component.{html,ts,scss} from origin/main`.
- [ ] **Recipe book cost and date:** `.cost-cell-wrap` gets `[appTooltip]` with the cost breakdown (a template with
  the same lines as today's `div.cost-tooltip`) and `[tooltipOnClick]="true"`, `tooltipPlacement="below"`;
  `.date-cell-wrap` gets `[appTooltip]` with the date text, `tooltipPlacement="below"`. Remove the two fixed boxes
  (`html:521-545`), their CSS (`.scss:247-310`), the `aria-describedby` bindings the page set by hand, and
  `recipe-list-tooltips.service.ts` with its spec if nothing else imports it (check with `git grep`); update the
  list's spec. Log the same kind of `removes:` decision with its reverse.
- [ ] **Three everyday hints:** the notification bell (`[title]` → `[appTooltip]`, its `aria-label` kept); the page
  header's count badge (`[attr.title]="countLabel()"` → `[appTooltip]="countLabel()"`, `aria-label` kept); the
  taxonomy kind manager's edit and delete icon buttons (`[attr.title]` → `[appTooltip]`, `aria-label` kept).
- [ ] **Dev catalog:** one entry "tooltip": a `c-btn-ghost` button with `[appTooltip]="'dc_tooltip_sample' |
  translatePipe"`, and a second button with a template tooltip holding two `c-chip c-chip--tag c-chip--sm` chips.
  New dictionary key `dc_tooltip_sample` — Hebrew value `זה ההסבר הקצר על הכפתור` (appended). Update the catalog's
  entry-count spec. One `[ui]` spec `e2e/ui/744-1.spec.ts` (signed in with `signInQa`).
- [ ] **The lint:** append to `REUSE_RULES` in `scripts/lib/registry-families.mjs` one rule `id: 'house-tooltip'`,
  `family: 'tooltip'`, `files: ['src/app/**/*.html']`, the pattern of the `tooltip` rule's `- later check:` line in
  `docs/agent/house-style.md` (copy it from the Markdown with the Edit tool; prove with a throwaway script outside
  the repo that `rule.pattern.source` equals `new RegExp(<the Markdown text>).source`, and paste its output under
  Execution Notes), and its hint. Record the existing hints: `node scripts/debt-baseline.mjs --add-kind
  reuse-copy.tooltip` (paste its line).
- [ ] **The default — `_shared/product-defaults.md`:** in `### hints-in-tooltips` rewrite only the `how` line to:
  `the shared tooltip [appTooltip] (src/app/shared/tooltip/, family tooltip) on the control, with an aria-label on
  the control when it has no visible name; never the browser title` and add under it `- reworded: the Human,
  2026-11-25 (plan 744)`. In `### house-tooltip` rewrite only the `how` line to name the shared piece. No `status`
  line changes; nothing is turned on.
- [ ] **The rules and the registry:** `docs/agent/house-style.md` `### tooltip` — replace the `needs:` sentence with
  the piece that exists, make the `- later check:` line the `- check: lint — …` line (delete the `check: default`
  line and the `later check` line; the proposed default stays in the defaults file), update the `existing default`
  sentence (the `how` line is reworded) and set `gaps today` to the count the lint finds. `### keyboard-focus` and
  the other rules are not touched. `docs/brain/component-families.md` — a new `### tooltip` family section (Status,
  Use, When, Inputs / variants, Known copies: the remaining `title` hints, counted in the debt baseline; the
  nutrition box keeps its own look) and `.c-tooltip` under `### engine-classes`; regenerate
  `docs/brain/inventory.md`. `.interface-design/system.md` — `.c-tooltip` in "Engine Classes". Folder maps:
  `src/app/shared/breadcrumbs.md` (the new folder) and `src/app/pages/breadcrumbs.md` if the removed service is
  listed there.

## UI/UX Notes
- Page recipe: none — no page is added or reframed; `Behaviour: tooltip`, `Behaviour: keyboard-focus` (focus opens
  it, Escape closes it), `Behaviour: motion` (no typed time).
- RTL: the box copies the document's direction; placement uses physical `left` / `top` as `placeInViewport`
  returns them (fixed positioning, as the nutrition box does).
- New key: `dc_tooltip_sample` (Hebrew value above).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Build the one tooltip box every hint will use — the engine block, the directive, the box component and their spec — src/styles.scss, src/app/shared/tooltip/**
- [x] A2: Move the product list's warning hint onto the shared tooltip and delete its own copy — the template, the removed state and CSS, the spec — src/app/pages/inventory/components/inventory-product-list/**
- [x] A3: Move the recipe book's cost and date hints onto the shared tooltip and delete their own boxes — the triggers, the removed boxes, CSS and service, the spec — src/app/pages/recipe-book/**
- [x] A4: Use the shared tooltip on three hints people meet every day — the bell, the page header's count, the taxonomy icon buttons — src/app/core/components/notification-bell/**, src/app/shared/page-header/**, src/app/pages/metadata-manager/components/taxonomy-kind-manager/**
- [x] A5: Show the tooltip in the dev catalog and check it with a script — the catalog entry, the dictionary key, the count spec, the ui spec — src/app/pages/dev-catalog/**, public/assets/data/dictionary.json, e2e/ui/744-1.spec.ts
- [x] A6: Warn when new code uses the browser's own title for a hint, and record the hints that still do — the house-tooltip lint rule with its round-trip proof, the debt baseline kind — scripts/lib/registry-families.mjs, _shared/debt-baseline.json
- [x] A7: Reword the default and the house rule to name the shared tooltip, and record the piece where builders look — the two how lines, the tooltip rule, the registry family, the inventory, the design system row, the folder maps — _shared/product-defaults.md, docs/agent/house-style.md, docs/brain/component-families.md, docs/brain/inventory.md, .interface-design/system.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [x] A8: Run every check of this plan and hand Dandan the six cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: `placeInViewport`; the browser `popover` API (already used by the nutrition box and the stock
  count); `ClickOutSideDirective` is no longer needed by the product list's badge.
- New files needed: `src/app/shared/tooltip/tooltip.directive.ts`, `tooltip.directive.spec.ts`,
  `tooltip-box.component.ts`, `tooltip-box.component.html`, `e2e/ui/744-1.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none — a string input is rendered as text (interpolation), never as HTML.
- Data / migration: none.
- Project checks: Reuse Check (two rows); hotspots append-only (`src/styles.scss`, `dictionary.json`); folder maps
  in scope; Hebrew through `translatePipe`; the log-query item; the `[ui]` card is a spec under `e2e/ui/`.
- A disabled `<button>` does not send pointer events in every browser, so a tooltip on a disabled control is not
  reliable: this plan puts no tooltip on a disabled control (the "sign in to use" hints are for the conversion plan,
  which must decide how to show them).

## Out of Scope
- Converting the other `title` hints (a later plan, after the Human has seen the box).
- The product nutrition box (`src/app/shared/nutrition-badge/`), the partial-cost badge, the supplier picker and
  the stock count's base popover: they are popups with their own content, not hints.
- Turning the `house-tooltip` default on.
- Tooltips on disabled controls.

## Critical Questions
- Q: May the `hints-in-tooltips` default's `how` line be reworded to name the shared tooltip? A: yes — "reword it" (Dandan, 2026-11-25).
- Q: Does the nutrition box move onto the shared tooltip? A: no — it keeps the look it has (Dandan, 2026-11-25).
- Q: Are all `title` hints converted now? A: no — the box, the two hand-made tooltips and three examples first; the rest after he has seen it (proposed to him on 2026-11-25, not objected to).

## Execution Notes
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run test:ci` → exit 0, 2808 SUCCESS (first run: 1 failed, the new spec's "no room above" case; fixed by pinning the box to the top, rerun green).
- evidence: `git grep -l appTooltip -- "src/app/**/*.html"` → product list, recipe book list, notification bell, page header, taxonomy kind manager, dev catalog. `git grep -n "validation-tooltip\|cost-tooltip\|date-tooltip" -- src/app` → nothing.
- evidence: `grep -c c-tooltip src/styles.scss` → 2; styles.scss diff against origin/main has no removed lines.
- evidence: `grep -c "needs:" docs/agent/house-style.md` → origin/main 2, now 1 (the `tooltip` rule's is gone); tooltip rule is `- check: lint — …`, no `later check` line.
- evidence: `grep -c "no new tooltip piece" _shared/product-defaults.md` → 0; `grep -c "^- status: on"` → 10 on origin/main and now.
- evidence: lint round-trip proof (throwaway script outside the repo) → `true \[attr\.title\]=|\[title\]=|<(?:button|a|span|div|p|i|li|td|th|label|input|img|lucide-icon)\b[^>]*\stitle="`
- evidence: `node scripts/debt-baseline.mjs --add-kind reuse-copy.tooltip` → `DEBT: added reuse-copy.tooltip at 79` (79 hints in 35 templates).
- decision: removes: the product list badge's own open/close state (replaced by the shared tooltip, which opens on hover, focus and tap as before) — reverse: restore inventory-product-list.component.{html,ts,scss} from origin/main
- decision: removes: the recipe book's own cost and date tooltip state and `recipe-list-tooltips.service.ts` (replaced by the shared tooltip, which opens on hover, focus and tap as before) — reverse: restore recipe-book-list.component.{html,ts,scss} and services/recipe-list-tooltips.service.ts from origin/main
- decision: behaviour: the "reworded" stamp of `hints-in-tooltips` is on its `turned on` line (`…2026-11-19; reworded: the Human, 2026-11-25 (plan 744)`) because the defaults contract (scripts/lib/product-defaults.mjs FIELDS) refuses a `reworded` field — reverse: edit that line
- decision: behaviour: the cost and date tooltips are templates inside the cell (same text as before, one line each); the dev catalog "tooltip" entry is a new section, so the catalog spec counts 17 sections.
