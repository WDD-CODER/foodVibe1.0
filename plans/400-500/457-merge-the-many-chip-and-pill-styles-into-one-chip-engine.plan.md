# Plan 457 — Merge the many chip and pill styles into one chip engine

Status: done
Track: code
Depends-on: 450
Conflicts-with: 451, 452, 453, 455
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Small pill-shaped controls (filter toggles, tag chips, tab pills, removable tags, status pills) are styled
five ways in `src/styles.scss` and about 80 more ways in component SCSS. The audit (`docs/mvp/reuse-audit-2026-10-20.md`,
"Chip / badge") found: `.c-chip` is defined (line ~964) but used by no template; `.c-toggle-chip` (+ `-group`, `__count`, `__dot`),
`.c-tap-chip` (+ `-group`, `__dot`), `.c-tab-pill` (+ `--home`, `.trash`), `.c-filter-chip` each have their own padding, radius and
hover rules; and pages add their own: `cv-chip*` (cook-view), `logistics-chip*` (recipe-builder), `scaling-chip*`, `venue-link-chip`,
`ai-product-chip*`, `custom-multi-select-chip*`, `allergen-pill`, `event-chip*` / `counter-pill*` (menu-intelligence `_paper-ui.scss`),
`venue-env-chip`, `venue-status-pill`, `consumable-chip*`, `act-chip*`, `tooltip-chip`, `label-chip`, `nav-pill`, `user-chip` and more.
A chip look change today means editing 20+ files. This plan builds ONE `.c-chip` engine with variants and moves pages onto it
one family at a time. No visible behaviour change.

## Goals & Success Criteria
- Primary: `src/styles.scss` holds one chip engine (`.c-chip` + variants `--toggle`, `--tap`, `--filter`, `--removable`, `--tab`, tones); the page-local chip classes that are plain pills are deleted; the screens look and behave the same.
- Success:
  - [ ] [auto] `npx ng build` passes and `npx ng test --watch=false` passes after every sub-task (incl. `tab-chips` and `metadata-manager.page.component` specs, updated for the new class names only).
  - [x] [auto] `grep -rnE "c-(toggle-chip|tap-chip|filter-chip|tab-pill)" src/app --include=*.html --include=*.ts` → no output (all call-sites on the new engine), unless S12 records a justified leftover.
  - [x] [auto] `grep -nE "^\s*\.c-[a-z]" <each edited component .scss>` → no output; `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|[0-9]+px.*(radius|blur)"` on each newly written engine block → no output (tokens only, logical properties only).
  - [x] [auto] Frozen files only shrink: `git diff --numstat main -- src/app/pages/recipe-builder/recipe-builder.page.* src/app/pages/menu-intelligence/menu-intelligence.page.* src/app/pages/cook-view/cook-view.page.* src/app/pages/inventory/components/product-form/product-form.component.* src/app/core/services/menu-export.service.ts` shows added <= removed per file.
  - [x] [auto] `src/styles.scss` diff has no removed lines until S12 (append-only).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Smoke each touched page in the Hebrew RTL UI at desktop and phone width (check cards group them by page): chips look the same as before, toggles turn on/off with click and Tab+Space, tab pills switch, tap-chips open their menu, removable chips delete, hover/focus rings still show.

## Execution Mode
- Parallel: no — every sub-task writes `src/styles.scss` or page files shared with plans 451, 452, 453, 455.
- Concurrent plans: 451 (modals: `ai-product-modal`, `label-creation-modal`, `quick-*`), 452 (`custom-select`, `ingredient-search`, `preparation-search`, `recipe-logistics-picker`), 453 (`recipe-book-list`, `venue-list`, `supplier-list`, `equipment-list`), 455 (forms). None are ordered against 457; whoever merges second rebases and Step 0 re-verifies. This plan never edits `custom-select.component.scss`.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`); plan 450 (reuse layer: `docs/brain/component-families.md` registry and `scope-check --reuse`) merged. Not on 451–456.
- Behaviour-neutral refactor: copy each old rule's values into the variant exactly (same tokens, same sizes), then delete the old rule. No restyling, no new tokens unless an old rule used a literal; then reuse the nearest token and list the pixel difference in session state.
- Convert ONE family per sub-task, build + tests after each, one commit per sub-task. Checkpoints (stop, Human smoke-checks, then continue): S2, S6, S9, S11.
- Skills to load: `.claude/skills/cssLayer/SKILL.md` before any `.scss` edit (five-group property order, `$break-*` local mirrors, no hardcoded values); `.claude/skills/angularComponentStructure/SKILL.md` before touching a component class.
- Rename strategy: markup moves from `class="c-toggle-chip"` to `class="c-chip c-chip--toggle"`. Old engine rules stay in `styles.scss` with an appended `/* @deprecated plan 457 — use .c-chip--toggle */` comment until S12.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/styles.scss
src/app/core/components/tab-chips/tab-chips.component.html
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.scss
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/core/components/header/header.component.html
src/app/core/components/header/header.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.scss
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.html
src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.html
src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.scss
src/app/pages/equipment/components/equipment-form/equipment-form.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.html
src/app/pages/equipment/components/equipment-list/equipment-list.component.scss
src/app/pages/suppliers/components/supplier-form/supplier-form.component.html
src/app/pages/suppliers/components/supplier-list/supplier-list.component.html
src/app/pages/venues/components/venue-form/venue-form.component.html
src/app/pages/venues/components/venue-list/venue-list.component.html
src/app/pages/venues/components/venue-list/venue-list.component.scss
src/app/pages/venues/components/venue-detail/venue-detail.component.html
src/app/pages/venues/components/venue-detail/venue-detail.component.scss
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.scss
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html
src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html
src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/_toolbar.scss
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.scss
src/app/shared/ai-product-modal/ai-product-modal.component.html
src/app/shared/ai-product-modal/ai-product-modal.component.scss
src/app/shared/label-creation-modal/label-creation-modal.component.html
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html
src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.html
src/app/shared/custom-multi-select/custom-multi-select.component.html
src/app/shared/custom-multi-select/custom-multi-select.component.scss
src/app/shared/custom-multi-select/custom-multi-select.component.spec.ts
src/app/shared/scaling-chip/scaling-chip.component.html
src/app/shared/scaling-chip/scaling-chip.component.scss
src/app/shared/venue-link-chip/venue-link-chip.component.html
src/app/shared/venue-link-chip/venue-link-chip.component.scss
src/app/shared/page-header/page-header.component.scss
src/app/pages/settings/settings.page.html
src/app/pages/menu-intelligence/components/prep-sheets/prep-sheets.component.html
src/app/pages/dashboard/components/business-performance/business-performance.component.html
src/app/pages/menu-intelligence/components/not-closed-dialog/not-closed-dialog.component.html
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — presentation only; no ownership or permission logic touched.
- INV-2: preserves — no data access change.
- INV-3: preserves — no client-side cascades added.
- INV-4: preserves — no schema or server change.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs first, always (the MVP changed many files). Against current `main` print `ok` or `conflict: <what>` per symbol:
engine rules `.c-chip`, `.c-tab-pill` (+ `--home`, `.trash`), `.c-tab-chips`, `.c-filter-chip`, `.c-toggle-chip` (+ `-group`, `__count`, `__count--zero`, `__dot`),
`.c-tap-chip` (+ `-group`, `__dot`) in `src/styles.scss`; every file in the scope block exists; each call-site class listed in S3–S11 is still present
(`grep -rnE "c-(chip|toggle-chip|tap-chip|tab-pill|filter-chip)" src/app`); plan 450's `docs/brain/component-families.md` exists. Re-grep for chip/pill classes the MVP
added in files outside the scope block (`grep -rnE "(chip|pill)[a-z_-]*" src/app --include=*.scss -l`); any new file → escalate with `approved: <path>`
or list it under Out of Scope. Write the inventory (class → file → variant it maps to, or "stays: reason") into session state; S2 builds only what the inventory needs.

## User Stories
- As a chef, I want every tag, filter toggle and tab pill to look and respond the same on every screen so that the app feels like one product.
- As a developer, I want one chip engine so that a design change to chips is a single edit.

## Functional Requirements

### Must Have (P0)
- [ ] `.c-chip` base + variants `--toggle` (label>input+span, `:has(input:checked)` and `.is-on`), `--tap` (button, `aria-expanded`, `.is-locked`), `--filter` (applied-filter chip), `--removable` (trailing remove button), `--tab` (tab pill, `--home`, `.trash`), and tones `--teal|--amber|--red` plus existing `.teal/.amber/.red`; sub-parts `__count`, `__dot`, `__remove`; group wrapper `.c-chip-group`.
- [ ] Same sizes, tokens, focus ring (`--border-focus`), 2.75rem tap target on phones, input kept focusable (clip-path, never `display:none`).
- [ ] Every migrated page keeps its markup semantics (label/input, button, aria attributes).
- [ ] Local chip classes that only style a pill are deleted; local classes that carry real bespoke behaviour stay and get a one-line reason in session state (e.g. `cv-chip-pulse` animation).

### Nice to Have (P1)
- [ ] Register the chip family in `docs/brain/component-families.md` (variants, markup, "do not add a page-local chip").

## UI/UX Notes
- No visual change intended. RTL: logical properties only (`padding-inline`, `inline-size`, `inset-inline-end`). Remove button on `--removable` sits at `inline-end`.
- Remove-button `aria-label` reuses the existing translated key already used by `custom-multi-select`; a new `dictionary.json` key is appended only if Step 0 finds none.

## Atomic Sub-tasks
- [x] S1: Run Step 0 and write the chip inventory table (class, file, target variant or "stays: reason") into session state — `docs/session-state-<branch>.md`
- [x] S2: **Checkpoint.** Append the chip engine after the existing chip rules: base, variants, tones, `__count/__dot/__remove`, `.c-chip-group`, phone tap target; append `@deprecated plan 457` comments above the old `.c-toggle-chip`, `.c-tap-chip`, `.c-filter-chip`, `.c-tab-pill` blocks (comment lines only); no template uses it yet; build passes — `src/styles.scss`
- [x] S3: Tab pills to `c-chip c-chip--tab` (and `--home`): tab-chips component + spec, metadata-manager tabs + spec, ai-product-modal tabs — `src/app/core/components/tab-chips/tab-chips.component.html`, `src/app/core/components/tab-chips/tab-chips.component.ts`, `src/app/core/components/tab-chips/tab-chips.component.scss`, `src/app/core/components/tab-chips/tab-chips.component.spec.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.scss`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`, `src/app/shared/ai-product-modal/ai-product-modal.component.html`
- [x] S4: Toggle chips in small forms/lists to `c-chip c-chip--toggle` inside `c-chip-group`: equipment, suppliers, venues, ai-model-manager — `src/app/pages/equipment/components/equipment-form/equipment-form.component.html`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.html`, `src/app/pages/suppliers/components/supplier-form/supplier-form.component.html`, `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html`, `src/app/pages/venues/components/venue-form/venue-form.component.html`, `src/app/pages/venues/components/venue-list/venue-list.component.html`, `src/app/pages/metadata-manager/components/ai-model-manager/ai-model-manager.component.html`
- [x] S5: Toggle chips with counts/dots and the applied-filter chip: inventory list, recipe-book list (`c-filter-chip` to `--filter`), product-form (html only, net lines <= 0), the two modals and the quick-edit panel, metadata-manager toggle — `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`, `src/app/pages/inventory/components/product-form/product-form.component.html`, `src/app/shared/label-creation-modal/label-creation-modal.component.html`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html`, `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`
- [x] S6: **Checkpoint.** Tap chips to `c-chip c-chip--tap` (+ `.is-locked`, `__dot`): taxonomy-kind-manager and metadata-manager (html, spec expectations); Human smoke-checks metadata-manager, equipment, suppliers, venues, inventory list, recipe-book list, tab-chips on every page — `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.html`, `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.scss`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`
- [x] S7 (fix round 2: custom-multi-select, ai-product chips + remove buttons, scaling-chip remove on the engine; scaling-chip shell and venue-link-chip stay, reasons in docs/mvp/runs/457.md): Shared components with removable/status chips: `custom-multi-select` chips (`custom-multi-select-chip*` to `--removable` / `--colored` tone), `scaling-chip` (`--primary/--secondary/--has-remove`), `venue-link-chip`, `ai-product-modal` chips (`ai-product-chip*`, `chip-remove`), stale `.c-chip` comment in `page-header`; leave `custom-select-*--chip` alone (plan 452) — `src/app/shared/custom-multi-select/custom-multi-select.component.html`, `src/app/shared/custom-multi-select/custom-multi-select.component.scss`, `src/app/shared/scaling-chip/scaling-chip.component.html`, `src/app/shared/scaling-chip/scaling-chip.component.scss`, `src/app/shared/venue-link-chip/venue-link-chip.component.html`, `src/app/shared/venue-link-chip/venue-link-chip.component.scss`, `src/app/shared/ai-product-modal/ai-product-modal.component.html`, `src/app/shared/ai-product-modal/ai-product-modal.component.scss`, `src/app/shared/page-header/page-header.component.scss`
- [x] S8 (fix round 2: allergen, tooltip, label, consumable, venue-env pills on c-chip--tag; venue-status-pill, select-all-pill, act-chip stay, reasons in the run file): Status/label pills on list and detail pages: `allergen-pill`, `label-chip`, `tooltip-chip` (inventory, recipe-book), `consumable-chip*` (equipment list), `venue-env-chip`, `venue-status-pill`, `select-all-pill` (venues), `act-chip*` (dashboard) — `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.html`, `src/app/pages/equipment/components/equipment-list/equipment-list.component.scss`, `src/app/pages/venues/components/venue-list/venue-list.component.html`, `src/app/pages/venues/components/venue-list/venue-list.component.scss`, `src/app/pages/venues/components/venue-detail/venue-detail.component.html`, `src/app/pages/venues/components/venue-detail/venue-detail.component.scss`, `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html`, `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`
- [x] S9 (fix round 2: type-pill, category-pill on c-chip--tag; logistics-chip, add-custom-chip, primary-chip-wrapper stay, reasons in the run file; frozen page untouched): **Checkpoint.** Recipe-builder chips: `logistics-chip*` (keep `--unresolved` as a tone), `add-custom-chip`, `primary-chip-wrapper`, `type-pill`, `category-pill`; frozen page html/scss net lines <= 0 — `src/app/pages/recipe-builder/recipe-builder.page.html`, `src/app/pages/recipe-builder/recipe-builder.page.scss`, `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html`, `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss`, `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.html`, `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss`, `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.html`, `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss`
- [x] S10 (fix round 2: every class stays: paper/print skin and header nav, reasons in the run file; no file changed): Menu-intelligence and header: `event-chip*`, `event-meta-chip`, `event-type-chip-wrap`, `counter-pill*` (guest counter keeps its input/buttons; only the pill shell moves), toolbar `pill*`, header `nav-pill*` / `user-chip`; frozen page html net lines <= 0 — `src/app/pages/menu-intelligence/menu-intelligence.page.html`, `src/app/pages/menu-intelligence/_paper-ui.scss`, `src/app/pages/menu-intelligence/_toolbar.scss`, `src/app/core/components/header/header.component.html`, `src/app/core/components/header/header.component.scss`
- [x] S11 (fix round 2: every cv-* class stays: cook-view ink token set and 44px kitchen buttons, reasons in the run file; no file changed): **Checkpoint.** Cook-view chips: `cv-chip` (+ `--alert/--warn/--rating`), `cv-mult-chip`, `cv-row-pill*`, `cv-source-pill`, `cv-pill-btn*` move to the engine; `cv-chip-pulse` and `--cv-chip-bg` stay as a tiny local modifier if the engine cannot express them (reason in session state); frozen page net lines <= 0; Human smoke-checks recipe-builder, menu-intelligence, header, cook-view, dashboard — `src/app/pages/cook-view/cook-view.page.html`, `src/app/pages/cook-view/cook-view.page.scss`
- [x] S12: Delete the deprecated engine rules (`.c-toggle-chip*`, `.c-tap-chip*`, `.c-filter-chip`, `.c-tab-pill*`) ONLY if the grep in Goals shows zero uses; else keep them and record each remaining call-site; register the chip family; full build + tests + log-query — `src/styles.scss`, `docs/brain/component-families.md`

## Technical Considerations
- Dependencies: `lucide-icon` registration unchanged; tokens `--bg-chrome`, `--border-chrome`, `--color-active-a/b`, `--bg-glass-strong`, `--color-primary-soft` already exist.
- New files needed: none.
- Model changes: none. Backend / API: none. Auth and validation: none. Data / migration: none.
- Risk: Angular view encapsulation hides a deleted local class's effect on `::ng-deep` or child components — grep each deleted class for `::ng-deep` and host selectors before deleting.
- Risk: `:has(input:checked)` toggle state and the phone 2.75rem tap target are easy to drop — S2 copies them verbatim from the old rules.
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys expected.

## Out of Scope
- Any visual redesign; new chip behaviours; `custom-select-*--chip` and `chip-search-dropdown` (plan 452); badge/status colour semantics; `.c-btn-*` buttons; server code.
- Rule sweep of unrelated `.c-*`-outside-styles violations (plan 458).

## Critical Questions
None.
