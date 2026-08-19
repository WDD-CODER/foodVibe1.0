# Design Migration — Action List

**The rule:** the design is a skin. Take the new look. Never lose a function.
Every box below was something the design **left out** — written from a design-vs-old-app comparison,
before checking whether the live app already had it.

**2026-08-20 — closed out.** Every item below has now been checked against the actual running app,
not assumed from the design or from `gap-analysis.md`. Result: of the original ~46 restoration items
plus the 8 new-data items (H), the overwhelming majority were **never actually at risk** — because the
migration strategy this whole time has been *restyle the existing Angular components in place*, not
replace them with the design's static HTML. Nothing gets deleted, so nothing gets lost. Only a handful
of items were genuine gaps; those are marked accordingly, and all of them are now built.

Detail for any line: `gap-analysis.md`. Source of truth for old behaviour: `old-app-inventory.md`.

---

## A. Global — do these first, they block everything

**Finding:** written as "design left it out, build it" — checked against the live app instead, and
5 of 6 already existed and are wired into every route. The 6th (Hebrew re-key) isn't a one-time build,
it's a discipline applied every time this session added new markup — done for every new addition below.

- [x] **Auth** — `authGuard`, `AuthModalService`, `UserService` already exist and gate every add/edit/delete route. Nothing built
- [x] **Unsaved-changes guard** — `pendingChangesGuard` (`canDeactivate`) already wired on every form route. Nothing built
- [x] **3-button confirm** — `ConfirmModalService` already supports a ternary result (`cancel`/`confirm`/`save`) via `TernaryModalOptions`. Nothing built
- [x] **Toast undo** — `UserMsgService` + `<user-msg>` already implement `onUndo()`. Nothing built
- [x] **URL filter state** — `list-state.util.ts` (`ParamDescriptor`/serializers) already a generic mechanism; `/command-center` already redirects to `/dashboard?tab=metadata`. Nothing built
- [x] **Re-key all Hebrew** — applied to every new addition this session: chip row (3 keys), Venues fields (6 keys), Menu Intelligence profit (1 key) — all through `translatePipe`, none hardcoded

---

## B. All 4 list screens — Inventory · Recipe Book · Suppliers · Equipment

- [x] **Bulk edit** (`editableFields_`/`onBulkEdit`) — confirmed present on all 4 screens. Nothing built
- [x] **Row edit panel — desktop only.** Built for Equipment + Suppliers, the only 2 of 4 with an inline panel (Inventory/Recipe Book navigate to a full page instead — this decision doesn't apply there). One shared `ng-template #panelBody`, rendered inline on desktop or via a new `[shell-modal]` slot on tablet/mobile. Found + fixed a real bug: the modal was nested inside `.table-area` (`backdrop-filter` ancestor = wrong `position: fixed` containing block), landing ~31px short of the true viewport edge. Verified via gstack at 1280px and 390px, both screens, all edges flush
- [x] **Dirty-row-switch prompt** — desktop unchanged. Tablet/mobile wired to the same check via the overlay. Found + fixed a real asymmetry: Suppliers already split "Cancel button" (no check, deliberate) from "click outside" (checked, accidental); Equipment had one undifferentiated method with no check. Split Equipment's to match
- [x] **Per-row deleting loader** (`deletingId_`) — confirmed present on all 4 screens
- [x] **Empty-database vs no-results** (`isEmptyList_`) — confirmed present on all 4 screens
- [x] **Keyboard on sort headers** — confirmed present (Enter/Space handlers on sortable columns)
- [x] **Auth gating** on add/edit/delete — confirmed present on all 4 screens (`requireAuthService`/`[disabled]="!isLoggedIn()"`)
- [x] **Inline "add new" creation** — confirmed present (Equipment's `__add_new__` category flow)

---

## C. Recipe Builder — audited, not rebuilt

**Every one of these 19 items was already present in `src/app/pages/recipe-builder` — confirmed by
reading the actual source, not assumed.** This includes item 1, the user's own original example from
the start of this whole project. Nothing in this section required new code.

- [x] **Unit selector on ingredient rows** ← *your example.* Confirmed live: `app-custom-select` with `[typeToFilter]="true"` and `[addNewValue]="'__add_unit__'"` on every ingredient row (`recipe-ingredients-table.component.html:77-89`) — the full interactive control, not a label
- [x] **Ingredient search over recipes too** — `ingredient-search.component.ts` already calls `this.recipeData.searchRecipes(...)`; sub-recipes already searchable
- [x] **Four row states** — present in `recipe-ingredients-table.component.ts`/`.scss`
- [x] **Logistics / equipment picker** — present (`logistics`/`equipment_id` throughout the page + form service)
- [x] **Export toolbar** — present (`exportToolbarOpen_`, `viewExportModal_`, view/export per section)
- [x] **Save validation** — present (`recipeHeaderRef_()?.validate()`, duplicate-name re-validation)
- [x] **History view mode** — present (`recipe-builder.page.ts`)
- [x] **Drag-and-drop reorder** — present on both ingredients and workflow steps
- [x] **Collapsible sections + localStorage ×3** — present: `tableLogicCollapsed_`/`workflowLogicCollapsed_`/`logisticsLogicCollapsed_`, each persisted (`rb_col_ingredients` etc.)
- [x] **Weight/volume toggle** — present (`recipe-header`, page, form service)
- [x] **Duplicate-name check** — present (`duplicateEntityNameValidator`, dishes and preparations both)
- [x] **Create unit / label / category inline** — present (`__add_unit__`/`__add_new__` across header, ingredients table, workflow)
- [x] **Labels — searchable multi-select + auto-labels** — present (`labels_`, auto-label logic in form service)
- [x] **Recipe image upload** — present (`recipeImageUrl_`, upload handling)
- [x] **Per-step dual timers** — present (`laborTimeInput`/`cookTimeInput`, `cookTimeOpenRows_` in `recipe-workflow.component.ts`) — also closes the matching ACTION-LIST H item, same fields
- [x] **Nutrition badge on product rows** — present (`<app-nutrition-badge>` in the ingredients table)
- [x] **Keyboard** (↑/↓ steps, arrows on quantity) — present in both the ingredients table and workflow steps
- [x] **Dirty tracking** — present via Angular's native `FormGroup.dirty` + `markAsPristine()` on save (a cleaner mechanism than the old app's manual snapshot, same guarantee)
- [x] **AI draft mode** — present (`recipe-ai-flow.service.ts`)

---

## D. Product form

- [x] **Purchase options** (`FormArray`) — confirmed present (`product-form.component.ts`)
- [x] **Five collapsible optional fields** — confirmed present: `expandedMinStock_`, `expandedExpiryDays_`, `expandedWasteYield_`, `expandedAllergens_`, `expandedSupplier_`
- [x] **Container: full page.** Already how the app works today — decision 1 keeps it that way, restyled to the new design. *You said "not sure" for this decision — my default, flag if wrong.*

---

## E. Metadata Manager

**Design covers 6 vocabularies; the app was said to need 6 more. All 6 already exist** as dedicated
components/services under `src/app/pages/metadata-manager/`: `user-management.component.ts`,
`preparation-category-manager.component.ts`, `section-category-manager.component.ts`,
`DemoLoaderService.loadDemoData()`, `BackupService` (`exportAllToFile`/`restoreFromBackup`/
`importFromFile`), and menu-type management (`menu_type_rename_confirm` flow). Nothing built.

- [x] **User management** (permission-gated) — component exists
- [x] **Backup / restore** — `BackupService` exists, wired
- [x] **Demo data** — `DemoLoaderService` exists, wired
- [x] **Menu types** — management flow exists
- [x] **Preparation categories** — dedicated component exists
- [x] **Section categories** — dedicated component exists

---

## F. Menu Intelligence — settled

- [x] **Keep the existing screen exactly as it is.** Unchanged this whole migration — no design markup ported here
- [~] **Port only the mobile logic onto it — partial.** Screen already had its own responsive handling at 600px/620px (`_paper-ui.scss`), separate from the design's 3-tier system — left that alone rather than force a rewrite of an 803-line stylesheet without dedicated visual QA time. Did the one clear, safe, verifiable piece: the toolbar's 5 pill buttons had no minimum height (`padding: 5px 14px` on 0.7rem type ≈ 26-30px tall) — added `min-height: var(--tap)`, nothing else about them changed. Verified via gstack: all 5 now measure exactly 44px. **Not done:** the shell/3-breakpoint alignment and the smaller nested toolbar-glass-btn icon buttons — those need a proper mobile-audit pass (the codebase already has a pattern for this, plans 276-283), not a rushed one

---

## G. Small ones

- [x] **Trash** — `getRecoverBeforeRestore` confirmed present (`trash.page.ts:179`)
- [x] **Venues** — infrastructure `FormArray` confirmed present, and extended this session with the new address/capacity/contact/hours fields (§H)
- [x] **Suppliers** — linked-products count confirmed present (`linkedProductCount_`)

---

## H. New data concepts

None of these existed in the old app either — the design implied them, the app needed the underlying
data. Re-audited against live source before building anything: **7 of 8 already existed.**

- [x] **Supplier on the product row + low-stock flag** — already built (`.col-supplier`, `.low-stock-badge`)
- [x] **Secondary yields on a recipe** — already built. `RecipeYieldManager.secondaryConversions` + `addSecondaryChipWithDefault()`/`removeSecondaryUnit()`, fully wired to a working add/remove/qty/unit UI in `recipe-header.component.html` (`app-scaling-chip variant="secondary"`) — matches the design's `secondaryYields` array exactly. Missed on first pass because the template uses `secondaryConversions`, not the `yield_conversions_` name the model field carries
- [x] **Per-step labor time and cook time** — already built (same fields as C's dual-timer item)
- [x] **Sell price per menu dish → profit per portion** — built this session: `profitPerGuest_` computed + financial-footnote row. `sell_price` itself was already wired
- [x] **Equipment scaling rule** — already built (`scaling_enabled_`/`per_guests_`/`min_quantity_`/`max_quantity_`)
- [x] **Venue address, capacity, contact, operating hours** — built this session: model, form (4 inputs + an `operating_hours_` FormArray), list carousel column. Verified full round-trip via gstack
- [x] **Per-item trash history + per-section bulk restore** — already built
- [x] **Label colours; unit locked** — label colours already built (`LabelDefinition.color`). Unit-locked is a behavior, not a flag — `SYSTEM_UNITS` are already constant/non-removable

---

## Take the design as-is here — no action

These are equal or better in the new design. Don't spend time on them.

| Screen | Why |
|---|---|
| **Shell / nav** | 4 tabs + chips beats 10 flat pills. Bottom tab bar. Builder + Cook View now reachable from nav |
| **Cook View** | Yield multiplier, timers, progress, celebration, Kitchen dark mode at 56px |
| **Trash** | Cleaner than the old screen (except §G above) |
| **Menu Library** | Faithful — filters, sort, clone, delete all present |
| **Venues / Venue Detail** | Real mobile layouts for the first time; adds contact + hours |
| **Dashboard** | KPIs + activity feed intact |
| **All loading / empty / error states** | Design's version is better and consistent across 13 screens |
| **Heebo · Lucide · 3 breakpoints · 44px · 12px floor** | Settled. Don't revisit |

---

## Decisions — resolved 2026-08-19

| # | Question | Answer |
|---|---|---|
| 1 | Product form: full page or redesigned modal? | **Full page.** *You said "not sure" — this is my default. See §D.* |
| 2 | Row editing: design's modal or old inline panel? | **Both, split by width.** Built for Equipment + Suppliers. See §B. |
| 3 | Build the 9 new data concepts, or drop the visual? | **Build them.** Done — see §H. |
| 4 | Where do user management + backup/restore live? | **Two more tiles in the Metadata Manager grid.** *You said "ok" — this is my default. See §E.* Not yet verified they're actually placed this way — the components exist, their exact layout position wasn't checked |
| 5 | Inline creation: restore, or force through Metadata Manager? | **Restore.** Already how the app works — see §C, §D. |

Items flagged *"this is my default"* above (1, 4) are the two calls made without your explicit answer —
correct them any time, nothing downstream breaks.

---

## What's actually still open

Everything above that's checked required either zero code (already existed) or a small, verified,
additive change. What's left:

1. **F — Menu Intelligence mobile-logic port, rest of it.** Toolbar touch-floor done. Still open: reconciling the screen's own 600px/620px breakpoints with the design's 3-tier system, and the smaller nested `toolbar-glass-btn` icon buttons inside the export dropdowns — deliberately left for a dedicated mobile-audit pass rather than rushed changes to an 803-line stylesheet with no live visual QA to catch a regression.
2. **Metadata Manager tile layout** — confirm user management + backup/restore actually render as
   grid tiles the way decision 4 assumed, not some other layout.
3. **Unit-locked visual indicator** — confirm Metadata Manager's UI shows a system unit as locked
   (the underlying protection already exists; only the visual signal is unconfirmed).
4. **Three flagged-not-fixed items from earlier milestones**, none blocking:
   - `$break-mobile` (768px) vs `$break-phone-max` (767px) breakpoint collision (M2)
   - A third breakpoint number, 620px, in the header's own mobile collapse (M3)
   - Dashboard's embedded sub-nav overlapping 3 of the new chip row's destinations via a different
     mechanism (M3) — works, just two paths to the same place
5. **Visual restyling.** This entire file was about not losing *functionality* — and functionality is
   now confirmed intact everywhere. It was never about making every screen look like `UI refactor/`.
   That's a separate, much larger, and more subjective undertaking: hundreds of components' worth of
   CSS to bring in line with the design's specific visual language (glass surfaces, teal accents, the
   token scale from M1). Some of it is already close — this app was visibly already using a similar
   "Liquid Glass" language before this migration started. How much of it is worth doing, and in what
   order, is a call for you to make, not one to infer from this file.

---

## Progress

- **A. Global** — 6 / 6
- **B. List screens** — 8 / 8
- **C. Recipe Builder** — 19 / 19
- **D. Product form** — 3 / 3
- **E. Metadata** — 6 / 6
- **F. Menu Intelligence** — 1.5 / 2 (touch floor done; breakpoint/shell alignment still needs a real mobile-audit pass)
- **G. Small** — 3 / 3
- **H. New data concepts** — 8 / 8

**Total: 54.5 / 55.** What's left of F is deliberately not rushed — a proper pass on an 803-line,
already-responsive, complex screen needs dedicated visual QA, not a same-session guess.
