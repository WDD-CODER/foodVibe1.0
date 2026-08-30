# 05 — Equipment Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **Step 4 executed, Step 5 verified,
Human-validated — done.**

- Angular path: `src/app/pages/equipment/` — `equipment.page.{ts,html,scss}` (page-level "Equipment
  List / Add Equipment" tab nav, wraps a `<router-outlet>`), `components/equipment-list/
  equipment-list.component.{ts,html,scss}` (`/equipment/list`, and reused nested under
  `/inventory/equipment` — same component, two route contexts), `components/equipment-form/
  equipment-form.component.{ts,html,scss}` (`/equipment/add`, `/equipment/edit/:id`)
- Shared engines this screen consumes (same set as Inventory/Recipe Book, per `design-port.md` §7,
  **already restyled during those two sessions**): `src/app/shared/list-shell/`,
  `src/app/shared/carousel-header/` + `cell-carousel/`, `src/app/shared/selection-bar/`,
  `src/app/shared/row-actions-menu/`, `src/app/shared/list-selection/`, plus one engine **not** used
  by Inventory/Recipe Book: the shared `.inline-edit-panel` family in `src/styles.scss` (row-level
  inline editing — also used by Suppliers, see Executive Summary #3).
- Design source: `.interface-design/source/Equipment.dc.html` (782 lines)

---

## Concurrent-session note (read before starting Step 4)

Per `_registry.md`'s note added this session: Suppliers is being worked by a separate session in
its own worktree (`../foodVibe1.0-wt-design-port-suppliers`, branch `feat/design-port-suppliers`)
at the same time as this Equipment session. The two screens share `list-shell`,
`.c-filter-*`/`.c-filter-options`, and — more than Inventory/Recipe Book did —
`.inline-edit-panel` (Equipment's own list component explicitly documents reusing "the same split
already established in `supplier-list.component.ts`" for its click-outside-confirm behavior,
`equipment-list.component.ts:465-468`). A merge conflict on `src/styles.scss` and/or `_registry.md`
when either branch merges after the other is expected, not a sign of a problem.

---

## Executive summary — read this first

**1. Most of the shared-engine work this screen needs is already done.** `list-shell` (single
toggle button, in-flow filter panel, no overlay/drawer), `.c-grid-header-cell` /
`.c-filter-category-header` (uppercase + tracked micro-labels), `.c-filter-section` /
`.c-filter-options` (tablet/mobile wrap-packing), `.c-btn-primary` (pill shape, correct gradient),
`.c-icon-btn`, `.c-input-wrapper` — all fixed at the engine level during the Inventory session and
verified again during Recipe Book's. Equipment consumes every one of these classes identically
(confirmed by direct read of `equipment-list.component.html`) — they need **no further work here**.
The real scope of this session is: (a) the one component-local class Inventory's fix didn't reach
(`.page-title`, still needs the same correction, scoped to this component's own `.scss`), (b) two
Equipment-specific visual gaps the shared-engine pass couldn't have caught (below), and (c) a
structural note on the row-edit UX that parallels Inventory's product-form finding.

**2. A real, substantive display gap: the design shows a "scaling rule" summary column in the list
that the app's list view doesn't surface at all.** Design's list header has 7 columns — name,
category, owned quantity, consumable, **scaling rule**, actions, select (`Equipment.dc.html:293-314`)
— with a per-row scaling summary like "25 אורחים · מינ׳ 1–4" (`dc.html:351,680`). The app's
`gridTemplate` (`equipment-list.component.html:4`) has only 6 slots — name, category, owned,
consumable, actions, select — **no scaling column at all**. The data exists (`ScalingRule` model,
computed and editable in both the inline-edit panel and the routed add/edit form) — it's just never
shown in the list row. This is not a token/spacing drift; it's real information the design puts
"at a glance" that the app currently hides behind opening the edit panel. Building it means adding a
7th grid-template slot, a new `carouselHeaderColumn`/`cellCarouselSlide` pair, and a computed
per-row label — real markup + TS work, not a restyle. **Flagging as a "needs a call" item, not
building it unilaterally** — this is exactly the kind of thing §10 says to stop for.

**3. The row-edit UX has no direct design counterpart, same shape as Inventory's product-form
finding — and it's shared with Suppliers.** The design's "ADD / EDIT MODAL" (`Equipment.dc.html:
375-443`) is a single small centered modal for both add and edit. The app's real behavior (plan 305
decision 2, `equipment-list.component.ts:107`) is: edit expands **inline, in-flow, under the row**
on desktop (`.inline-edit-panel`, `styles.scss:1172-1230`), and only becomes an actual modal overlay
on tablet/mobile (`.inline-edit-panel.as-modal` + a sibling `.c-modal-overlay`) — add is a *separate*
routed page (`equipment-form.component`, reusing the same field set). Both the inline panel and its
`.as-modal` variant deliberately use **opaque** tokens (`--bg-pure`, `--border-default`,
`--shadow-card`) rather than the app's usual glass-modal tokens (`--bg-glass-strong`/`--blur-modal`/
`--shadow-modal`, which the design's modal — and the app's own `.c-modal-card` engine, and
`product-form`'s surface — all use). This looks like a deliberate, already-made design choice (plan
305), not an oversight — recommend leaving it exactly as-is rather than forcing it toward the
design's glass-modal look, but flagging since "match the design" is the stated default and this is a
visible, screen-wide departure from it.

---

## Inventory 1 — Old functionality (do-not-touch)

### `equipment-list.component.ts` — signals / computed
| item | file:line | what it holds |
|---|---|---|
| `searchQuery_` (`signal`) | `:102` | free-text search |
| `isPanelOpen_` (from `useResponsivePanelState(panelContext)`) | `:103,122-125` | filter-panel open state — **persistence key depends on route context** (`'inventory'` vs `'equipment'`, `:118-120`) so the two mount points of this same component don't share one saved panel state |
| `carouselHeaderIndex_` (`signal`) | `:105` | shared index driving `carousel-header`/`cell-carousel` |
| `isDesktop_` (`useIsDesktop()`) | `:108` | switches the edit surface between inline-in-list and modal-overlay |
| `editingItem_` (`computed`) | `:112-116` | resolves the item behind `editingId_`/`closingId_` for the modal-path template (outside the `@for`) |
| `selectedCategories_` (`signal<Set<EquipmentCategory>>`) | `:151` | category filter |
| `consumableFilter_` (`signal<boolean\|null>`) | `:153` | `null`=all, `true`/`false` = filtered |
| `sortBy_` / `sortOrder_` (`signal`) | `:154,156` | `'name'\|'category'\|'owned'` / `'asc'\|'desc'` — **all 3 fields fully wired**, unlike Inventory's missing price-sort gap |
| `deletingId_` / `isSavingEdit_` (`signal`) | `:155,160` | per-row delete/save-in-flight spinners |
| `editingId_` / `closingId_` (`signal<string\|null>`) | `:157-158` | which row is expanded / mid-collapse-animation |
| `selection` (`new ListSelectionState()`) | `:159` | row multi-select |
| `editableFields_` (`computed`) | `:162-178` | bulk-edit defs: `category_`, `is_consumable_` — no design counterpart (design's bulk bar is delete-only) |
| `hasActiveFilters_` / `filteredEquipment_` / `filteredEquipmentIds_` (`computed`) | `:181-223` | filter→search→sort pipeline |
| `customCategories_` / `categoryOptions` (`signal`/`computed`) | `:233-243` | fixed 6 categories + any persisted custom ones + an "add new category" sentinel option |
| `lastCategory_` (`signal`) | `:279` | restores the category field if an "add new category" flow is cancelled |

No `linkedSignal`, no `model()`.

### `equipment-list.component.ts` — inject() services
| service | file:line | used for |
|---|---|---|
| `UserService` (`isLoggedIn`) | `:79` | gates Add/Edit/Delete when logged out |
| `RequireAuthService` | `:80` | `requireAuth()` gate on `onEdit`/`onDelete`/`onBulkDeleteSelected` |
| `EquipmentDataService` | `:81` | `allEquipment_()`, `updateEquipment()`, `deleteEquipment()` |
| `Router` | `:82` | route-context detection (`isUnderInventory`), navigation |
| `HeroFabService` | `:83` | "add_equipment" page action |
| `UserMsgService` | `:84` | save-error toasts |
| `TranslationService` | `:85` | category resolution for the "add new category" flow |
| `LoggingService` | `:86` | structured error logs |
| `ConfirmModalService` | `:87` | unsaved-changes / delete confirms (shared, cross-screen) |
| `FormBuilder` | `:88` | the inline edit reactive form |
| `AddItemModalService` | `:89` | "add new category" name-entry modal |
| `TranslationKeyModalService` | `:90` | English-key prompt when a new category has no dictionary entry |
| `EquipmentCategoryRegistryService` | `:91` | persists custom categories across sessions |

### Keyboard / focus / dirty-state guards
`(keydown.enter)`/`(keydown.space)` with `role="button"` on rows (toggles inline edit) and sortable
headers (`html:50-82,104-111`) — do-not-touch. `onInlinePanelClickOutside()` (`ts:469-478`) confirms
before discarding a dirty inline edit on outside-click, but **not** on an explicit Cancel click — the
code comment (`ts:465-468`) explicitly says this split mirrors `supplier-list.component.ts` — a
cross-screen behavioral contract, not a one-off.

### scrollIntoView
None under `equipment/` (grep-confirmed).

### Deep-link query params (`useListState('equipment', …)`, `ts:128-134`)
| param | signal | serializer |
|---|---|---|
| `q` | `searchQuery_` | `StringParam` |
| `sort` | `sortBy_` | `StringParam` |
| `order` | `sortOrder_` | `StringParam` |
| `categories` | `selectedCategories_` | `StringSetParam` |
| `consumable` | `consumableFilter_` | `NullableBooleanParam` |

### Route-context duality (real, load-bearing — not a bug to "simplify")
This one component renders at **two** routes: `/equipment/list` (standalone) and
`/inventory/equipment` (nested, "logistics" tab from Inventory). `isUnderInventory`
(`ts:94-96`) branches: the base path used by Add/Edit navigation (`:98-100`), whether the
`.control-nav` product-list/logistics tab pair renders at all (`html:272-281`, only under
inventory), and the `useResponsivePanelState` persistence key (`:118-120`, keeps the two contexts'
"panel open" preference independent). None of this may be collapsed into one path.

### Empty / loading / error / disabled / permission states
| item | file:line | condition | renders |
|---|---|---|---|
| Empty | `html:99-103` | `filteredEquipment_().length === 0` | plain `no_equipment_match` text — **no icon, no CTA** (unlike Inventory's `app-empty-state`; `EmptyStateComponent` isn't even imported here) |
| Disabled/permission | `html:32-33,131-132,144-145`, `ts:387-388,480-481,514-516` | `!isLoggedIn()` / `requireAuth()` | Add/Edit/Delete buttons + `requireAuth()` gates on the actual mutating calls |
| No loading state | — | — | no full-list skeleton exists (Inventory 2 #5) |
| No error state | — | — | none exists today (Inventory 2 #6) |
| RTL | `equipment-form.component.html:1` sets `dir="rtl"` explicitly; `equipment-list` relies on `list-shell`'s own `dir` input defaulting to `'rtl'` (`list-shell.component.ts:28`) rather than passing it explicitly | always | — |

### `equipment-form.component.ts` — routed add/edit page (not growth-frozen, but restyle-only per
default procedure resolution unless told otherwise)
Reactive form (`name_hebrew`, `category_`, `owned_quantity_`, `is_consumable_`, `notes_`,
`scaling_enabled_`/`per_guests_`/`min_quantity_`/`max_quantity_`) hydrated from route-resolved data
in edit mode (`ts:70-79,99-111`) or scaling-defaults-only in add mode (`:113-120`); autofocus on the
name field via `ViewChild`+`ngAfterViewInit` (`:49,81-83`); duplicate-name error handling
(`ERR_DUPLICATE_EQUIPMENT_NAME`, `:179-181`); post-save navigation branches on `isUnderInventory`-
equivalent URL check (`:175-176,188-189`) same as the list component. The `/equipment/edit/:id`
route exists and resolves real data (`app.routes.ts:106-110`) but the live UI never navigates to it
— editing always happens inline in the list now (plan 305). Not dead code to remove; a real,
reachable route (direct URL/bookmark) that simply isn't the primary path.

---

## Inventory 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | Filters aside open/close | `dc.html:215-256` | — | Already built, already restyled (list-shell). Not new. |
| 2 | Column sort: name / category / owned | `dc.html:294-308` | — | Already built and fully wired — no gap here (contrast with Inventory's missing price-sort). |
| 3 | Search | `dc.html:269-272` | — | Already built. |
| 4 | Bulk select + delete + clear | `dc.html:280-289` | — | Already built. App's bar additionally offers bulk-edit (category/consumable) — no design counterpart, nothing to restyle against. |
| 5 | Loading skeleton (6 shimmer rows) | `dc.html:317-327` | **`deferred`** | Same reasoning as Inventory/Recipe Book — no loading signal surfaced by `EquipmentDataService` today. |
| 6 | Error block + retry | `dc.html:328-335` | **`deferred`** | Same reasoning — no error state exists today. |
| 7 | Consumable radio filter (all/yes/no) | `dc.html:237-253` | — | Already built (`.c-filter-options--inline`), matches the design's radio-group pattern closely. Not new. |
| 8 | Scaling-rule column in the list | `dc.html:293-314,341-351` | — | **Real gap, not classifiable as specified/inert/deferred without a Human call** — Executive Summary #2. Real markup+TS work (new grid column, new computed label). Not building without explicit approval. |
| 9 | Add/Edit as a centered modal | `dc.html:375-443` | — | Not applicable — real UX is inline-expand (desktop) / modal (tablet+mobile) + a separate routed Add page, already built, deliberately differentiated from the app's glass-modal tokens (Executive Summary #3). Do not rebuild toward the design's modal. |
| 10 | Mobile car-track carousel (category/consumable/scaling) | `dc.html` mobile passes | — | Same shared `carousel-header`/`cell-carousel` engine already decided on during Inventory's session (§10a there: keep the existing swipe pattern, no change) — not re-litigating here. |
| 11 | Delete confirm dialog | `dc.html:445-458` | — | Shared `ConfirmModalService`, cross-screen, not this screen's surface. |
| 12 | Toast | `dc.html:460-465` | — | Shared toast service, cross-screen, not this screen's surface. |
| 13 | "Add new category" inline flow | — (app-only) | — | Real app feature, no design counterpart (design's category chips are a fixed list) — do-not-touch. |
| 14 | Page-level "Equipment List / Add Equipment" tab nav | — (app-only, `equipment.page.html:1-7`) | — | Real, app-only, no design counterpart — same class of finding as Inventory's `.control-nav`. Nothing to restyle against. |

No row promoted to `specified`.

---

## Inventory 3 — Visual spec (design value vs. current app value → engine/token)

Everything already fixed at the engine level during Inventory/Recipe Book (filter panel, filter
section/options wrap, grid header cell, `.c-btn-primary`, `.c-icon-btn`, `.c-input-wrapper`) is
**not re-tabulated here** — confirmed identical by direct read of `equipment-list.component.html`
against those already-corrected engines, no drift found. Only screen-specific rows follow.

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Page title | `font-size:var(--fs-xl); font-weight:var(--fw-bold); letter-spacing:var(--tracking-tight)` (`dc.html:265`) | `.page-title` (`equipment-list.component.scss:6-16`): `font-size:1.25rem; font-weight:700; letter-spacing:0.02em` — **identical drift to Inventory's pre-fix value, not yet corrected here** | `--fs-xl`/`--fw-bold`/`--tracking-tight` | Same fix as Inventory's `.page-title`, just not yet applied to this component's own copy of the rule (component-scoped, not shared). |
| Consumable cell (list row) | Colored status chip: `padding:3px 10px; border-radius:var(--radius-sm); font-size:var(--fs-xs); font-weight:600; background: consumable ? var(--color-primary-soft) : var(--bg-muted); color: consumable ? var(--color-primary-hover) : var(--color-text-muted)` (`dc.html:348-350,676-679`) | `col-consumable c-list-body-cell` (`html:121-123`): plain translated text (`approved_yes`/`approved_no`), **no chip styling at all** | `--color-primary-soft`/`--color-primary-hover`/`--bg-muted`/`--color-text-muted`/`--radius-sm`/`--fs-xs` (all exist) | Real, visible gap — not a token correction, an actual small markup+CSS addition (wrap the cell content in a styled span, conditional background/color). Low risk, no logic touched (`is_consumable_` already computed). Flagging as safe-to-build since it's pure presentation of already-existing data, unlike #8 above which needs new data plumbing. |
| Scaling-rule column | See Executive Summary #2 | Not present in the list at all | n/a | Needs a Human call before any code — real new column, not a restyle. |
| Filter aside "מתכלה" (consumable) group | Same treatment as "קטגוריה" group — `<div>` label + `sc-for` radio rows (`dc.html:237-253`) | `.c-filter-category.consumable-filter` (`html:301-332`) — same `.c-filter-category`/`.c-filter-category-label`/`.c-filter-options--inline` engines Inventory/Suppliers already use | Already correct via shared engines | No screen-specific work — flagged only to confirm it was checked, not skipped. |
| Row-edit surface (inline, desktop) | N/A — design has no inline-edit concept | `.inline-edit-panel` (`styles.scss:1172-1230`) — opaque `--bg-pure`/`--border-default`/`--shadow-card` | n/a, see Executive Summary #3 | Not a gap to close — a deliberate, already-made, cross-screen (Suppliers) design decision. Listed for completeness, not action. |
| Row-edit surface (modal, tablet/mobile) | Design's own modal uses `--bg-glass-strong`/`--blur-modal`/`--border-glass`/`--radius-xl`/`--shadow-modal` (`dc.html:377`) | `.inline-edit-panel.as-modal` keeps the same opaque tokens as the desktop inline panel, does not switch to glass-modal tokens even though it's now visually a modal | `--bg-glass-strong`/`--blur-modal`/`--shadow-modal` exist if this were to change | **Needs a call**: keep the deliberate opaque look (consistent with the desktop inline panel, cross-screen with Suppliers) vs. switch to the app's standard glass-modal treatment to match the design exactly at this one breakpoint. Recommend keeping as-is — changing only the mobile variant would make the same panel look inconsistent between its own two states. |

---

## Unmapped — needs a Human call

Every value here already resolves to an existing token; nothing is a true "doesn't exist" gap.

1. **Scaling-rule list column** (Executive Summary #2 / Inventory 2 #8) — build it (new grid column
   + computed label), or leave scaling info accessible only via the edit panel as today?
2. **Consumable chip styling** — safe to build now (pure presentation, data already computed)?
   Recommend yes, low risk.
3. **Row-edit-as-modal token family** — keep the deliberate opaque `--bg-pure`/`--shadow-card` look
   (consistent with the desktop inline panel and with Suppliers) vs. switch to the app's standard
   glass-modal tokens to match the design exactly at that one breakpoint? Recommend keeping as-is.
4. `.page-title` fix — same correction as Inventory's, no reason to expect a different answer, but
   listed for an explicit yes since it's a real code change.

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no.
- Visual value with no token/engine match — no.
- A design row looks `specified` but wasn't confirmed — no; #8 (scaling column) is exactly this
  category and is explicitly *not* tagged `specified`.
- Design markup requiring deletion/rewrite of existing TS logic — no; `equipment-form.component.ts`
  isn't growth-frozen but nothing proposed here touches it or `equipment-list.component.ts` beyond
  the "needs a call" items, which are markup/CSS-level even where they add a field.
- Screen has no design counterpart — no, `Equipment.dc.html` exists and was read in full.
- About to touch a second screen — no. `.inline-edit-panel` is flagged for awareness (shared with
  Suppliers) but not touched in this spec.
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no.

**No stop conditions triggered. Blocked only on Human approval per Step 3 — plus explicit answers to
the 4 "needs a call" items above before Step 4 touches anything beyond the uncontested `.page-title`
fix.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word.**
If approved, Step 4 will apply the `.page-title` fix and the consumable-chip styling immediately
(both uncontested), and will build the scaling-rule column and/or change the mobile row-edit modal's
token family only if you say so explicitly — the default for both, absent instruction, is **no
change** (leave as today), the mirror image of the usual "exact design fidelity" default, since both
require adding real functionality/behavior rather than correcting an existing value.

---

## Step 4 — Execute (done, 2026-08-30)

Approved by Human reply: 1 → build scaling column; 2 → build consumable chip; 3 → fix `.as-modal`
to the design's glass-modal tokens; 4 → apply `.page-title` fix. All four applied:

- **`public/assets/data/dictionary.json`** — added `scaling_summary` ("{n} אורחים · מינ׳ {range}")
  and `no_scaling` ("—") keys.
- **`equipment-list.component.ts`** — added `scalingSummary(rule)`, formats a per-row scaling label
  matching the design's own logic (`Equipment.dc.html:351,680`: bare min when no max, "min–max" when
  a max is set). No existing signal/method touched.
- **`equipment-list.component.html`** — `gridTemplate` gained a 7th column
  (`'2fr 1fr minmax(48px, 0.8fr) 0.8fr 1.2fr 80px auto'`); added a non-sortable "scaling_rule" header
  cell and row cell (matching the design's own non-sortable treatment of this column); consumable
  cell now wraps its text in a `.consumable-chip` span with a `--yes` modifier.
- **`equipment-list.component.scss`** — `.page-title` → `--fs-xl`/`--fw-bold`/`--tracking-tight`
  (was `1.25rem`/`700`/`0.02em`); added `.consumable-chip`/`.consumable-chip--yes` matching the
  design's exact tokens (`--color-primary-soft`/`--color-primary-hover` when true,
  `--bg-muted`/`--color-text-muted` when false).
- **`src/styles.scss`** — `.inline-edit-panel.as-modal` now overrides `background`/`border-color`/
  `box-shadow`/`backdrop-filter` to the app's standard glass-modal tokens (`--bg-glass-strong`/
  `--border-glass`/`--shadow-modal`/`--blur-modal`), matching the design's own modal exactly at this
  one breakpoint. The desktop in-flow `.inline-edit-panel` base rule (opaque `--bg-pure`) is
  untouched, per the Human's "keep this behavior" on the underlying pattern.

### Real bug found and fixed (Human-reported, item "5")

While verifying item 3 live, reproduced the Human's report exactly: opening the inline-edit panel on
desktop rendered an empty box. Root cause, confirmed via live console: `NG01050: formControlName
must be used with a parent formGroup directive`. `#panelBody` (the `<ng-template>` holding all the
form fields, shared by both the desktop in-flow panel and the tablet/mobile modal via
`ngTemplateOutlet`) was declared **outside** any `[formGroup]`-bearing element — Angular resolves a
template's `ControlContainer` from its own declaration site, not from wherever `ngTemplateOutlet`
later projects it, so the `[formGroup]="editForm_"` on the two outer wrapper divs never reached the
`formControlName` inputs inside, despite looking correctly nested in the rendered DOM. Fixed by
moving `[formGroup]="editForm_"` onto an `<ng-container>` wrapping `panelBody`'s own content (zero
DOM/layout impact) and removing it from the two now-redundant outer wrapper divs. Captured as a
brain gotcha (`docs/brain/gotchas/angular.md`) since the failure mode — a template error that aborts
rendering mid-view, same class as the earlier "unregistered Lucide icon" gotcha — is easy to
mistake for a data or CSS problem instead of what it actually is.

**Live verification (not just build/test):** started a disposable local backend
(`MONGO_URI=mongodb://localhost:27017/foodvibe_equipment_debug`, seeded master data, never touched
the real Atlas cluster in `server/.env`) and drove the running app via gstack `/browse` on this
worktree's own port (4202). Confirmed via screenshot: the desktop inline panel now renders fully
populated (name/category/owned/checkboxes/notes, plus the scaling sub-fields once "הפעל סקלה" is
checked); the tablet width (900px) correctly renders the `.as-modal` variant with the new glass
tokens, also fully populated, confirming the fix holds for both `ngTemplateOutlet` call sites; the
list now shows the scaling-rule column and the consumable chip rendering correctly against real
seeded data.

### Step 5 — Verify

- `ng build` — 0 errors, same pre-existing warnings only (venue nullish-coalescing, bundle budget,
  cook-view.page.scss budget, exceljs CJS notice).
- `ng test --watch=false --browsers=ChromeHeadless` — **311/311 SUCCESS**.
- Inventory 1 re-read against current code: every signal/computed/injected-service/deep-link-param
  listed there is still present and untouched; the only new method (`scalingSummary`) is additive.
- Live browser verification as described above — the Human-reported bug is confirmed fixed, not
  just "no longer throws" — the panel's actual field values were read back from the DOM and match
  the clicked row's real data.
- Local debug servers (dev server on 4202, backend on 3000 pointed at a disposable local Mongo DB)
  stopped after verification; nothing touched the real Atlas cluster.
