# 04 — Suppliers Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **Step 4 executed, Step 5 verified,
Human-validated — done.**

- Angular path: `src/app/pages/suppliers/` — `suppliers.page.{ts,html,scss}` (thin
  `<router-outlet>` shell), `components/supplier-list/supplier-list.component.{ts,html,scss}` (the
  `/suppliers/list` route — the screen the design actually shows), `components/supplier-form/
  supplier-form.component.{ts,html,scss}` (`/suppliers/add`, `/suppliers/edit/:id`, and reused
  embedded in `src/app/shared/supplier-modal/` for the add flow)
- Shared engines this screen consumes (same set as Inventory/Recipe Book per `design-port.md` §7):
  `src/app/shared/list-shell/`, `src/app/shared/carousel-header/` + `cell-carousel/`,
  `src/app/shared/selection-bar/`, `src/app/shared/empty-state/`, `src/app/shared/row-actions-menu/`,
  `src/app/shared/list-selection/`, plus `src/app/shared/supplier-modal/` (not used by Inventory or
  Recipe Book — Suppliers' own add-only modal, separate from the shared `list-shell`)
- Design source: `.interface-design/source/Suppliers.dc.html` (730 lines) + `colors_and_type.css`

---

## Read this first — Inventory's and Recipe Book's sessions already did most of this screen's work

Suppliers shares `list-shell`/`carousel-header`/`cell-carousel`/`.c-btn-primary`/
`.c-grid-header-cell`/`.c-filter-category-header`/`selection-bar` with Inventory and Recipe Book,
and **both of those sessions already executed and shipped engine-level fixes to every one of
those** (spot-checked against the current `main`-based worktree, not assumed from their spec text).
Concretely, Suppliers now inherits, for free, with zero new code:

- Single always-visible panel-toggle button (`list-shell.component.scss:122-153`, 38×38px,
  `--bg-glass`/`--border-default`/`--radius-md`) — confirmed current on disk, matches
  `Suppliers.dc.html:240-242` exactly already.
- Filter panel rebuilt in-flow at every width (`list-shell.component.scss:284-328,352-379`): no
  overlay/drawer, `background:var(--bg-glass)`, `border:1px solid var(--border-glass)`,
  `border-radius:var(--radius-lg)`, `width:250px` (`$panel-width-expanded`) — confirmed current,
  matches `Suppliers.dc.html:209` (`--bg-glass`, `--radius-lg`, clamp(220px,18vw,320px) ≈ 250px at
  common desktop widths) already. ≤1023px (`$panel-overlay-break`, matches the design's own
  breakpoint at `dc.html:56`) stacks full-width in-flow, matching `.suppliers-aside{position:static;
  width:100%}` (`dc.html:60`).
- `.c-btn-primary` (Suppliers' "הוסף ספק" button) — pill radius, `linear-gradient(180deg,
  var(--color-primary), var(--color-primary-hover))`, `box-shadow:var(--shadow-glow)`
  (`styles.scss:301-327`) — confirmed current, matches `Suppliers.dc.html:254` exactly already.
- `.c-grid-header-cell` (Suppliers' table header row) — `--bg-muted`, `--fs-xs`,
  `padding-inline:var(--space-4)`, `text-transform:uppercase`, `letter-spacing:var(--tracking-wide)`
  (`styles.scss:934-951`) — confirmed current, matches `Suppliers.dc.html:273-296` exactly already.
- `.c-filter-category-header` (not actually rendered on Suppliers — see Suppliers 3 below, its
  filter has no collapsible category groups) — fix exists in the engine regardless, no action needed
  here.
- `selection-bar` (Suppliers' bulk-delete bar) — `background:var(--color-primary-soft)`,
  `border:1px solid var(--border-focus)`, `border-radius:var(--radius-md)`, danger button colored at
  rest not just on hover (`selection-bar.component.scss:8-23,64-76`) — confirmed current, matches
  `Suppliers.dc.html:261-268` exactly already.
- Checkbox size (16px, not the design's 24px) and mobile carousel interaction model (single-slide +
  visible arrows, not the design's own final inline-grid) — both explicitly **kept as-is** by
  Inventory's Human-approved resolution (items #6, #10a), confirmed still the current behavior on
  disk (`styles.scss:1582-1587`, `cell-carousel.component.scss`). Same resolution applies here
  without re-asking.
- **One drift Inventory found but never actually fixed, still present today, so it recurs here
  unfixed:** `.c-filter-option` label color is `var(--color-text-muted)` (`styles.scss:1583-1595`
  as read this session); Inventory 3 recorded the design wants the less-muted
  `var(--color-text-secondary)` for this role but that specific sub-fix wasn't in Inventory's
  10-item Unmapped list and wasn't touched in its Step 4 execution — it slipped through. Since
  Suppliers' filter (`Suppliers.dc.html:217-231`) and its delivery-days checkboxes in both places
  (aside panel + modal form) use this exact class, it's listed again below (Suppliers 3) rather than
  silently inherited as "already fixed."

So this spec below covers **only what's new or different at the Suppliers screen level**: its own
component-scoped SCSS (page title, inline-edit panel, row layout), the add/edit interaction-pattern
split (design: one shared modal for both; app: modal for add, inline panel for edit — an existing,
deliberate divergence, not new), and the carousel column-set difference.

---

## Suppliers 1 — Old functionality (do-not-touch)

### `suppliers.page.ts` — thin shell
Just `<router-outlet>` (`suppliers.page.html:1`), no injected state, no logic. Nothing to preserve
beyond the file existing.

### `supplier-list.component.ts` — signals / computed
| item | file:line | what it holds |
|---|---|---|
| `searchQuery_` (`signal<string>`) | `:94` | free-text search (name or contact) |
| `deletingId_` (`signal<string\|null>`) | `:95` | per-row in-flight delete spinner |
| `editingId_` / `closingId_` (`signal<string\|null>`) | `:96-97` | inline-edit-panel open row / closing-animation row |
| `isSavingEdit_` (`signal<boolean>`) | `:98` | inline-edit save-in-flight spinner |
| `isPanelOpen_` (from `useResponsivePanelState('suppliers')`) | `:99-100,134-136` | filter-panel open state, persisted per-page |
| `carouselHeaderIndex_` (`signal<number>`) | `:101` | shared index driving both `carousel-header` and `cell-carousel` |
| `isDesktop_` (from `useIsDesktop()`) | `:104` | routes the edit panel: inline row-expansion on desktop, modal-projected on tablet/phone (plan 305 decision 2 — **an already-settled, deliberate pattern, not this session's call to revisit**) |
| `editingItem_` (computed) | `:108-112` | resolves the item behind `editingId_`/`closingId_` for the modal-mode template projection |
| `selection` (`new ListSelectionState()`) | `:114` | row multi-select state |
| `editForm_` (`FormGroup`, built in `buildEditForm()`) | `:116,138,232-241` | inline-edit reactive form: `name_hebrew` (required), `contact_person_`, `delivery_days_` (7-control `FormArray`), `min_order_mov_` (required, min 0), `lead_time_days_` (required, min 0) |
| `editableFields_` (`BulkEditableField[]`) | `:118-131` | bulk-edit field defs: `delivery_days_` (multi-select day picker), `lead_time_days_` (single-select from a fixed day-count list) — **no design counterpart**, design's bulk bar is delete-only |
| `selectedDays_` (`signal<Set<number>>`) | `:170` | delivery-day filter selection (0=Sun..6=Sat) |
| `hasLinkedOnly_` (`signal<boolean>`) | `:171` | "linked products only" filter toggle |
| `isEmptyList_` (computed) | `:173` | drives empty-state vs. no-match text |
| `hasActiveFilters_` (computed) | `:175-179` | drives the "clear filters" button |
| `filteredSuppliers_` (computed) | `:181-201` | search → day-filter → linked-only-filter → alphabetical (Hebrew locale) sort pipeline |
| `filteredSupplierIds_` (computed) | `:204-208` | visible IDs for header select-all |

No `linkedSignal`, no `model()`.

**Orphaned, flagging so it isn't mistaken for a gap:** `supplier_logo_url_?: string` exists on the
`Supplier` model (`supplier.model.ts:8`) but is never read or written anywhere in
`supplier-list`/`supplier-form`/`supplier-modal` (grep-confirmed project-wide, only the model
declaration itself matches). No logo upload/display UI exists. Left untouched either way.

### `supplier-list.component.ts` — inject() services
| service | file:line | used for |
|---|---|---|
| `UserService` (`isLoggedIn`) | `:77` | gates Add/Edit/Delete actions when logged out |
| `SupplierDataService` | `:78` | `allSuppliers_()`, `updateSupplier()`, `removeSupplier()` |
| `KitchenStateService` | `:79` | `products_()` — for computing linked-product counts |
| `SupplierModalService` | `:80` | opens the shared add-only modal (`openAdd()`) |
| `HeroFabService` | `:81` | page action: "add_supplier" (`ngOnInit`, `:150-162`) — **skipped when `embeddedInDashboard`** |
| `TranslationService` | `:82` | Hebrew label lookups (confirm-dialog text, delivery-day labels) |
| `Router` | `:83` | `backToDashboard()` navigation |
| `UserMsgService` | `:84` | error messages on save failure |
| `RequireAuthService` | `:85` | `requireAuth()` gate before add/edit/delete/bulk-delete/bulk-edit |
| `LoggingService` | `:86` | structured error logging on save/delete failure |
| `ConfirmModalService` | `:87` | unsaved-changes-before-switch, unsaved-changes-before-discard, single-delete, bulk-delete confirms |
| `FormBuilder` | `:88` | builds `editForm_` |

### `supplier-form.component.ts` — inject() services (separate component, not growth-frozen)
`FormBuilder`, `ActivatedRoute`, `Router`, `SupplierDataService`, `DestroyRef`, `LoggingService`,
`UserMsgService`, `TranslationService`, `RequireAuthService`. Not on AGENTS.md's growth-frozen list
(only `recipe-builder.page.ts`/`menu-intelligence.page.ts`/`cook-view.page.ts`/
`product-form.component.ts`/`menu-export.service.ts` are) — ordinary do-not-lose-functionality rules
apply, no hard line-count freeze.

**Dual-mode behavior, do-not-touch:**
- **Page mode** (`/suppliers/add`, `/suppliers/edit/:id`): full page, `dir="rtl"` container
  (`html:60`), route-resolver-hydrated via `supplierResolver` (`suppliers.page.ts` route config,
  `app.routes.ts:194-204`) which redirects to `/suppliers/list` with a Hebrew error toast if the ID
  doesn't resolve (`supplier.resolver.ts:15-22`).
- **Embedded mode** (`embeddedInDashboard=true`, used by `supplier-modal.component` for add, and
  potentially a dashboard card): no route resolver — hydration instead driven by an `effect()`
  reacting to the `supplierToEdit` input (`ts:66-89`) — `null` resets the form to blanks,
  a `Supplier` populates it. Emits `saved`/`cancel` outputs instead of navigating.
- `duplicateEntityNameValidator` on `name_hebrew` (`ts:109-119`), scoped to exclude the currently-
  edited supplier's own ID in both modes.
- `validateForm_()` (`ts:141-147`) — manual required-name check that runs *in addition to* the
  reactive `Validators.required`, producing a translated `field_name_required` error message ---
  do-not-touch, redundant-looking but intentional (differentiates "empty" from "duplicate").

### Keyboard / focus / a11y
`role="button" tabindex="0"` on each row with `(keydown.enter)`/`(keydown.space)` toggling inline
edit (`supplier-list.component.html:101-105`). `ClickOutSideDirective` on the inline-edit panel
(both desktop-inline and tablet/phone-modal variants, `html:156,173`) — confirms discard if the form
is dirty (`onInlinePanelClickOutside`, `ts:370-379`) before closing. Same confirm-if-dirty guard
fires when switching from editing one row directly to another (`onEdit`, `ts:302-316`).

### scrollIntoView
None under `suppliers/` (grep-confirmed, same as Inventory and Recipe Book).

### Deep-link query params (`useListState('suppliers', …)`, `ts:140-145`)
| param | signal | serializer |
|---|---|---|
| `q` | `searchQuery_` | `StringParam` |
| `days` | `selectedDays_` | `NumberSetParam` |
| `linkedOnly` | `hasLinkedOnly_` | `BooleanParam` |

**Skipped entirely when `embeddedInDashboard`** (`ts:139-145` — the `useListState` call is inside an
`if (!this.embeddedInDashboard)` guard) — a dashboard-embedded supplier list doesn't own the URL.

### Empty / loading / error / disabled / permission / RTL states
| item | file:line | condition | renders |
|---|---|---|---|
| RTL | — | always (app-level default) | No explicit `[dir]` binding on this screen's `app-list-shell` call, unlike Inventory's explicit `[dir]="'rtl'"` (`Inventory` html:6) — inherited from the app-wide RTL default instead. Not this screen's own concern, no action. |
| Empty (no suppliers at all) | `html:83-92` | `isEmptyList_()` | `app-empty-state` (icon `truck`, CTA `add_supplier`, disabled when logged out) |
| Empty (filtered to nothing) | `html:93-95` | else | `no_suppliers_match` text |
| Disabled/permission | `html:41-46,127-141` | `!isLoggedIn()` | Add button, per-row Edit/Delete icon buttons disabled + `sign_in_to_use` tooltip |
| No loading state | — | — | `LoaderComponent` imported but only used for the inline-edit save spinner (`html:225-227`) and per-row delete spinner (`html:132-134`) — no skeleton wraps the whole list (same finding as Inventory/Recipe Book) |
| No error state | — | — | none exists today (same as Inventory/Recipe Book) |

---

## Suppliers 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | Filters aside open/close | `Suppliers.dc.html:207-235,240-242` | — | Already built (`isPanelOpen_`/`useResponsivePanelState`) — not new. |
| 2 | Column sort: name / min-order / lead-time | `dc.html:274-290` | **`deferred`** | The design shows sortable header cells with up/down carets on three columns. The app has no `sortBy_`/`sortOrder_` state at all — `filteredSuppliers_` (`ts:181-201`) always sorts alphabetically by `name_hebrew`, full stop. Adding sortable columns is a real TS change (new signal state + a compare function + template wiring), out of scope for a visual-only restyle and not Human-approved as `specified` — logging, not building. Same category as Inventory's price-sort finding (Inventory 2 #3). |
| 3 | Search | `dc.html:249-252` | — | Already built (name or contact) — matches design's stated scope exactly (`sup.name.includes(search) \|\| sup.contact.includes(search)`, `ts:611` in the design's own script). |
| 4 | "Linked products only" filter | `dc.html:217-220` | — | Already built (`hasLinkedOnly_`) — not new, matches design exactly. |
| 5 | Delivery-day filter (multi-select) | `dc.html:222-232` | — | Already built (`selectedDays_`) — not new. Design's per-day option list has a computed `count` field (`dc.html` script, `baseVals()`) but **the template never renders it** (`dc.html:228` shows only `{{ d.label }}`) — not a real visual feature to port, dead data in the design's own mock. |
| 6 | Bulk select + delete + clear-selection | `dc.html:260-268` | — | Already built via `app-selection-bar`. App additionally offers bulk-edit (delivery days / lead time), no design counterpart — same pattern as Inventory/Recipe Book. |
| 7 | Unified add/edit modal | `dc.html:368-414` | — | **Not applicable as a structural change.** The app already deliberately splits this: add opens `supplier-modal` (matches design's modal for the add case); edit opens an inline row-expansion panel on desktop or a modal-projected version of the same panel on tablet/phone (`isDesktop_`, plan 305 decision 2 — an already-settled prior decision, not this session's to revisit). Token-level fidelity of both surfaces against the design's shared modal styling is covered in Suppliers 3; the *split itself* is out of scope. |
| 8 | Delete confirm card (single + bulk, "cannot delete — has linked products" variant) | `dc.html:417-430` | — | Already built via the shared `ConfirmModalService`, including the linked-products-blocks-delete branch (`onDelete`, `ts:381-389`) — matches the design's `askDeleteSupplier` guard exactly (`dc.html` script: "לא ניתן למחוק ספק עם מוצרים מקושרים"). Cross-screen component, not this session's surface to restyle. |
| 9 | Bottom-center save/delete toast | `dc.html:432-438` | **`deferred`** | Not found anywhere in `supplier-list`/`supplier-form` — no toast fires on successful save or delete today (only error messages via `UserMsgService`). Same shared-toast-service gap flagged in the Dashboard/Inventory/Recipe Book specs — cross-screen, not building a one-off here. |
| 10 | Mobile carousel columns: contact / days / lead-time / linked-count (4 slides); min-order shown as a fixed, non-carouseled column | `dc.html:328-347` (`.sup-car-track` contains contact/days/lead/linked; `.sup-minorder-cell` sits outside the track, order:2 not carouseled) | — | **Real content-set difference, not just the swipe-vs-inline mechanism already settled by Inventory #10a.** App's carousel holds contact/days/min-order (3 slides, `carousel-header`/`cell-carousel` in `html:60-70,108-118`); lead-time and linked-count are the app's fixed columns instead (`col-lead`/`col-linked`, `html:71-72,119-120`) — the opposite split from the design (design carousels lead+linked, fixes min-order). See Suppliers 3. |
| 11 | Row hover reveals edit/delete icons | not shown in the static export (design has no `:hover` rule making actions appear/disappear — its action buttons are always visible at `dc.html:348-355`) | — | App's `.supplier-grid-row:hover .c-icon-btn{opacity:1}` (`supplier-list.component.scss:31-33`) implies actions are dimmed at rest — same idiomatic addition already accepted for Inventory/Dashboard hover findings. Token-check only, not a conflict. |

No row promoted to `specified`. #2 and #9 are real, defined, absent behaviors — correctly `deferred`,
same standard as Inventory #3/#6 and Recipe Book #5/#6.

---

## Suppliers 3 — Visual spec

Everything already inherited via the shared engines (panel toggle, filter panel surface,
`.c-btn-primary`, `.c-grid-header-cell`, `selection-bar`, checkbox size, mobile carousel swipe
mechanism) is **not** repeated below — see "Read this first." Only screen-level (component-scoped)
findings, plus the one un-fixed cross-screen drift, follow.

| Element | Design (exact, `Suppliers.dc.html` / `colors_and_type.css`) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Page title | `font-size:var(--fs-xl)(24px); font-weight:var(--fw-bold); letter-spacing:var(--tracking-tight)` (`dc.html:245`) | `.page-title` (`supplier-list.component.scss:6-16`): `font-size:1.25rem(20px); font-weight:700(match); letter-spacing:0.02em`(positive, wrong direction) | rebuild from tokens: `--fs-xl`/`--fw-bold`/`--tracking-tight` | Identical drift to Inventory's and Recipe Book's own page-title findings, each already fixed on their own component-scoped copy — this is Suppliers' own copy of the same class name, not shared, so it needs its own fix too. |
| `.c-filter-option` label color (delivery-day filter + "linked products" toggle + modal-form day checkboxes) | `font-size:var(--fs-sm); color:var(--color-text-secondary)` (`dc.html:228,219`) | `.c-filter-option` (`styles.scss:1582-1595`): `font-size:0.8125rem(=--fs-sm, match); color:var(--color-text-muted)` (one step more muted than the design wants) | swap to `--color-text-secondary` | **Cross-screen engine drift Inventory 3 already documented (its "Filter option row" finding) but never actually fixed in Step 4** — confirmed still present on disk this session. Fixing it here fixes it for Inventory and Recipe Book too, retroactively. |
| Mobile carousel column set | Carousel = contact + days + lead-time + linked-count (4 slides); min-order is a fixed column, not carouseled (`dc.html:328-347`, order comments at `dc.html:49-55`) | Carousel = contact + days + min-order (3 slides, `html:108-118`); lead-time + linked-count are the fixed columns instead (`html:71-72,119-120`), and **both are hidden entirely below 620px** (`.col-lead,.col-linked{display:none}`, `supplier-list.component.scss:99-104`, comment tags it "T18") | n/a — structural content-set choice, not a token value | Real difference in which 4 fields the design treats as "important enough to always show" (name, min-order, lead, linked) vs. which 3 the app always shows (name, contact, min-order) via `carousel-header`'s `CarouselHeaderColumnDirective` labels (`html:61-69`). Needs a call: re-map the carousel/fixed-column split to match the design (carousel: contact/days/lead/linked; fixed: min-order), or keep the app's existing split? This changes which data a mobile user sees without swiping/scrolling the carousel — a real UX difference, not cosmetic. |
| Inline-edit panel surface (desktop-inline + tablet/phone-modal variants) | Design has no separate "edit panel" surface to compare against — its edit case reuses the same modal card as add (`m-sheet-card`: `background:var(--bg-glass-strong); backdrop-filter:var(--blur-modal); border:1px solid var(--border-glass); border-radius:var(--radius-xl); box-shadow:var(--shadow-modal)`, `dc.html:370`) | `.inline-edit-panel` — not read this pass (file not opened: `supplier-list.component.scss` covers layout/grid-column rules for it at `:58-60` but the surface background/border/shadow rules live in a shared cross-screen partial not yet located) | **Not verified — Step-4-time check needed**, same caveat pattern as Inventory's bulk-selection-bar note before Recipe Book resolved it. | Since the design has no separate edit-panel concept to diff against (it's the same modal card), the achievable fidelity here is: does the app's inline-edit panel use the *same* glass-modal tokens (`--bg-glass-strong`/`--blur-modal`/`--border-glass`/`--radius-xl`/`--shadow-modal`) the design uses for its one shared surface? Needs a Step-4-time read of wherever `.inline-edit-panel`'s surface rules actually live before this can be answered — flagging now so it isn't skipped. |
| Add-modal surface (`supplier-modal.component`) | Same modal card tokens as above (`dc.html:370`) | `supplier-modal.component.scss` — not read this pass | Same as above | Same caveat — needs a Step-4-time check against `--bg-glass-strong`/`--blur-modal`/`--border-glass`/`--radius-xl`/`--shadow-modal`, likely already close since it's a shared `.c-modal-*`-family surface, but not independently confirmed in this spec. |
| Row hover reveal | `.c-icon-btn{opacity:1}` on `:hover` (`supplier-list.component.scss:31-33`) vs. design's always-visible actions | n/a | n/a | Token-check only, not a conflict (Suppliers 2 #11) — no design value to diverge from, idiomatic addition. |

---

## Unmapped — needs a Human call

Nothing here fails to resolve to an existing token — same "every value already exists somewhere"
finding as Inventory and Recipe Book. Every item is a build/reuse choice, not a missing value:

1. **Mobile carousel column set** (Suppliers 3, Suppliers 2 #10) — re-map to match the design's
   split (carousel: contact/days/lead/linked; fixed: min-order), or keep the app's existing split
   (carousel: contact/days/min-order; fixed: lead/linked, both hidden ≤620px)? This is the one item
   in this spec that materially changes what a mobile user sees without further interaction, not
   just a color/spacing value.
2. `.c-filter-option` label color: fix the cross-screen drift Inventory already found but never
   applied (`--color-text-muted` → `--color-text-secondary`)? Since this is shared across Inventory,
   Recipe Book, and Suppliers, fixing it now retroactively corrects all three.
3. Inline-edit-panel surface and add-modal surface tokens — both need a Step-4-time read (file
   locations not yet confirmed this pass) before a fix can even be proposed; flagging so Step 4
   doesn't skip verifying them just because they weren't in this table with exact values.

Item #1 is the only one requiring a real judgment call on user-visible behavior; #2 is a
straightforward "yes, apply the already-documented fix"; #3 is a "go verify, then decide" rather
than a decision itself.

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no, verified present and committed.
- Visual value with no token/engine match — no, see Unmapped above (all resolvable once verified,
  none missing).
- A design row looks `specified` but wasn't confirmed — no; Suppliers 2 #2 and #9 are real-but-
  `deferred`, not promoted, same standard as Inventory/Recipe Book.
- Design markup requiring deletion/rewrite of existing TS logic — no; every proposed change above is
  CSS/markup-level. The add-modal/inline-edit-panel structural split (Suppliers 2 #7, plan 305
  decision 2) is explicitly kept, not revisited.
- Screen has no design counterpart — no, `Suppliers.dc.html` exists and was read in full.
- About to touch a second screen — no, Suppliers only. Inventory's and Recipe Book's already-shipped
  engine fixes were read as ground truth (and spot-checked on disk), not re-executed.
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no; `Suppliers v1.dc.html` and
  `Suppliers v2-pre-mobile.dc.html` under `.interface-design/source/v1/` exist but were not read.

**No stop conditions triggered. Blocked only on Human approval per Step 3.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word**
(`done`, `verified`, `approved`, `LGTM for this job`, etc. — see `docs/agent/job-validation.md`).
Silence, "thanks," or a green build do not count.

Please state a decision on Unmapped #1 (the carousel column-set re-mapping) — everything else
defaults to "apply the documented fix" (#2) or "verify then fix if needed at Step 4" (#3) unless you
say otherwise, consistent with Inventory's and Recipe Book's approvals.

---

## Step 4 — Execute (done, 2026-08-30)

Approved by Human reply. All 3 Unmapped items resolved: **1 → rebuild according to design; 2 → fix
it; 3 → act upon it (verify, then fix what's found).** All changes restyle/restructure-in-place
(markup regrouped, no TS logic touched):

- **`supplier-list.component.html`**: re-mapped the mobile carousel to match `Suppliers.dc.html`'s
  own column split — `col-min-order` moved out of `app-cell-carousel`/`app-carousel-header` to become
  a fixed column immediately after `col-name` (matching the design's `.sup-minorder-cell`, always
  visible, never carouseled); `col-lead` and `col-linked` moved into the carousel alongside
  `col-contact`/`col-delivery` (now 4 slides, matching the design's `.sup-car-track` containing
  contact/days/lead/linked). `[gridTemplate]` reordered from `'2fr 1fr minmax(48px, 0.8fr) 0.8fr
  0.8fr 0.8fr 80px auto'` to `'2fr 0.8fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 80px auto'` (same 8
  track-size values, reassigned to the new column order — min-order's `0.8fr` moved to position 2).
  `[mobileGridTemplate]` grew from 4 to 5 tracks (`'2fr 1fr 40px 28px'` →
  `'2fr 0.6fr 1fr 40px 28px'`) since min-order now needs its own always-visible mobile track instead
  of riding inside the carousel's single collapsed track.
- **`supplier-list.component.scss`**: removed the `@media (max-width:620px){.col-lead,.col-linked{
  display:none}}` rule (comment tag "T18") — both are carousel slides now, governed entirely by the
  shared `cell-carousel`/`carousel-header` engine's own responsive display logic (desktop:
  `display:contents`, all slides shown; ≤768px: single active slide only). Left a comment pointing to
  this spec in its place.
- **`src/styles.scss`** (both are shared engines — affects every consumer, not just Suppliers):
  `.c-filter-option` → `color:var(--color-text-secondary)` (was `--color-text-muted`) — the drift
  Inventory 3 documented but never applied; also used by Inventory and Recipe Book's filter panels
  and Suppliers' add/edit-modal delivery-day checkboxes, so this retroactively fixes all of them.
  `.inline-edit-panel` → `background:var(--bg-glass-strong)` (was `--bg-pure`),
  `border:1px solid var(--border-glass)` (was `--border-default`), `border-radius:var(--radius-xl)`
  (was `--radius-lg`), `box-shadow:var(--shadow-modal)` (was `--shadow-card`), added
  `backdrop-filter:var(--blur-modal)` (none before) — now matches `.c-modal-card` exactly, which
  itself already matched the design's shared modal-card tokens (`dc.html:370`) with zero drift. Also
  used by `equipment-list` and `quick-edit-product-panel` — both inherit this fix for free, same
  pattern as the cross-screen engine fixes in Inventory's and Recipe Book's sessions.
- **Verified, no fix needed:** `.c-modal-card` (Suppliers' add-modal surface, via
  `supplier-modal.component.scss`'s bare `@layer` block deferring entirely to this engine) — already
  `background:var(--bg-glass-strong); border:1px solid var(--border-glass);
  border-radius:var(--radius-xl); box-shadow:var(--shadow-modal); backdrop-filter:var(--blur-modal)`,
  an exact match to `Suppliers.dc.html:370`'s modal card tokens. Confirmed rather than assumed
  (Unmapped #3's "act upon it" — this half needed no change).

**Not changed:** `supplier-list.component.ts` / `supplier-form.component.ts` — 0 lines added or
removed. Column sorting, save/delete toast — real, `deferred` per Suppliers 2, not built. Add/edit
structural split (modal for add, inline-panel for edit) — plan 305 decision 2, not revisited.
Checkbox size, carousel swipe mechanism — same "keep as-is" resolution as Inventory/Recipe Book, not
re-litigated.

### Step 5 — Verify

- `ng build --configuration production` — **0 errors**. Same pre-existing warnings only
  (`venue-detail`/`venue-list` nullish-coalescing, initial bundle budget, `cook-view.page.scss`
  budget, `exceljs` CJS notice) — none introduced by this change.
- `ng test --watch=false --browsers=ChromeHeadless` — **311/311 SUCCESS**, 0 failures.
- `git status` on the touched set: `supplier-list.component.{html,scss}`, `styles.scss` — zero `.ts`
  files touched, confirmed.
- Suppliers 1 re-read against current code: every signal/computed, injected service, deep-link param,
  and keyboard/a11y binding listed there is untouched — confirmed by the empty `.ts` diff, not
  diff-absence alone.
- **Cross-screen impact, expected and desired**: `.c-filter-option` (Inventory, Recipe Book, and
  Suppliers' filter panels + Suppliers' add/edit-modal day checkboxes) and `.inline-edit-panel`
  (`equipment-list`, `quick-edit-product-panel`) now inherit the corrected tokens ahead of their own
  `/design-port` sessions — same pattern Inventory's and Recipe Book's sessions each left for the
  screens after them. Equipment's future port-spec should note `.inline-edit-panel` is already done.
- Live visual comparison at 1280px/390px is performed by the Human, per §6 Step 5 — reporting
  readiness for review, not attempting browser-based self-validation.
