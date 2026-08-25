# 03 — Recipe Book Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **Step 2 — spec written, no code, awaiting
Human approval.**

- Angular path: `src/app/pages/recipe-book/` — `recipe-book.page.{ts,html,scss}` (thin
  `<recipe-book-list />` shell), `components/recipe-book-list/recipe-book-list.component.{ts,html,scss}`
  (the whole screen — one route, no add/edit sub-route; "add" navigates out to `/recipe-builder`)
- Shared engines this screen consumes (same set as Inventory, per `design-port.md` §7):
  `src/app/shared/list-shell/`, `src/app/shared/carousel-header/` + `cell-carousel/`,
  `src/app/shared/selection-bar/`, `src/app/shared/empty-state/`, `src/app/shared/row-actions-menu/`,
  `src/app/shared/list-selection/`, plus `src/app/shared/rating-stars/` (not used by Inventory)
- Design source: `.interface-design/source/RecipeBook.dc.html` (922 lines) + `colors_and_type.css`

---

## Read this first — Inventory's session already did most of this screen's work

Recipe Book shares `list-shell`/`carousel-header`/`.c-btn-primary`/`.c-grid-header-cell`/
`.c-filter-category-header`/`.c-filter-option` with Inventory, and **Inventory's session (spec
`02-inventory.port-spec.md`) already executed and shipped engine-level fixes to every one of
those** (Step 4, committed to the working tree while this session was running). Concretely, Recipe
Book now inherits, for free, with zero new code:

- Single always-visible panel-toggle button, filter panel rebuilt in-flow (no overlay/drawer) at
  every width, panel surface `--bg-glass`/250px/symmetric `--radius-lg` — `list-shell.component.*`,
  confirmed current on disk.
- `.c-btn-primary` (Recipe Book's "הוסף מתכון" button) — pill radius, corrected gradient stops,
  `--shadow-glow` — confirmed current on disk, matches `RecipeBook.dc.html:315` exactly already.
- `.c-grid-header-cell` (Recipe Book's table header row) — `--bg-muted`, `--fs-xs`,
  `padding-inline:var(--space-4)`, `text-transform:uppercase`, `letter-spacing:var(--tracking-wide)`
  — confirmed current on disk, matches `RecipeBook.dc.html:334-356` exactly already.
- `.c-filter-category-header` (Recipe Book's "סוג"/"סטטוס אישור"/"תוויות" filter groups) — same
  uppercase/tracking fix — confirmed current, matches design already.
- Checkbox size (16px, not design's 24px) and mobile carousel interaction model (single-slide +
  visible arrows, not the design's own final inline-grid) — both explicitly **kept as-is** by
  Inventory's Human-approved resolution (items #6, #10a). Same resolution applies here without
  re-asking — same shared components, same design pattern (`RecipeBook.dc.html`'s own mobile passes
  5/6, lines 141-220, show the identical carousel-abandonment progression as `Inventory.dc.html`'s).

So this spec below covers **only what's new or different at the Recipe Book screen level**: its own
component-scoped SCSS (`.page-title`, chip colors, tooltips, rating stars), and the columns/features
Inventory doesn't have (rating, favorite, cost tooltip, ingredient-search filter, date filter).

---

## Recipe Book 1 — Old functionality (do-not-touch)

### Signals / computed (`recipe-book-list.component.ts`)
| item | file:line | what it holds |
|---|---|---|
| `activeFilters_` / `searchQuery_` / `sortBy_` / `sortOrder_` | `:136-139` | filter/search/sort state |
| `isPanelOpen_` (`useResponsivePanelState('recipe-book')`) | `:140,149-151` | filter-panel open, persisted per-page |
| `dateFrom_` / `dateTo_` / `dateIncludeByUpdated_` | `:142-146` | date-range filter — **no design counterpart** |
| `showFavoritesOnly_` | `:144` | favorites-only filter toggle |
| `collapsedFilterCategories_` (default: only `'Date'` collapsed) | `:203` | filter-group collapse state — comment explains 'Date' starts collapsed since design doesn't show it at all |
| `allergenExpand` / `labelsExpand` (`CellExpandState`) | `:204-205` | per-row chip-popover expand state |
| `hoveredCostRecipeId_` / `tappedCostRecipeId_` / `costTooltipAnchor_` | `:206-208` | custom floating cost tooltip (hover + tap) |
| `hoveredDateRecipeId_` / `dateTooltipAnchor_` | `:209,212` | custom floating "last updated" tooltip |
| `hideDateColumn_` (default `true`) | `:211` | date column hidden by default — **matches the design, which has no date column at all** |
| `selection` (`ListSelectionState`) | `:213` | row multi-select |
| `editableFields_` (computed: `labels_`, `recipe_type_`) | `:215-231` | bulk-edit fields — app-only, design's bulk bar is delete-only |
| `ingredientSearchQuery_` / `selectedProductIds_` / `filteredProductsForIngredientSearch_` | `:232-233,348-352` | ingredient-based filter (server-search, plan 301) — **no design counterpart** |
| `historyFor_` | `:234` | version-history panel target |
| `deletingId_` / `removingId_` / `duplicatingId_` | `:235-237` | per-row in-flight spinners |
| `carouselHeaderIndex_` | `:238` | shared carousel-header/cell-carousel sync index |
| `filterOptionCounts_` / `filterCategories_` (computed) | `:284-325` | two-pass count computation, same perf split as Inventory |
| `filteredRecipes_` / `filteredRecipeIds_` / `displayRows_` (computed) | `:354-448` | filter→search→sort pipeline + precomputed per-row display values (plan 303 M2 comment) |
| `isEmptyList_` (computed) | `:450` | drives empty-state vs. no-match text |
| `activeCostTooltipRecipe_` / `activeDateTooltipRecipe_` (computed) | `:458-466` | tooltip target resolution |

**Orphaned, flagging so it isn't mistaken for a gap:** `onToggleApproval()` (`:850-853`) is a fully
implemented method — never called from the template. No row-level UI exposes it. See Recipe Book 2 #1.

No `linkedSignal`, no `model()`.

### inject() services
`KitchenStateService`, `ProductDataService`, `Router`, `RecipeCostService`, `TranslationService`,
`MetadataRegistryService`, `UserService` (`isLoggedIn`), `RequireAuthService`, `ConfirmModalService`,
`UserMsgService`, `HeroFabService` (page action: "add_recipe_ai" → opens `AiRecipeModalService`),
`AiRecipeModalService`.

### Keyboard / focus / a11y
`(keydown.enter)`/`(keydown.space)` + `role="button"` on sortable headers, filter-category toggles,
label/allergen chip togglers, and the row itself (`html:52-133,166,182-188,218,381-390,425-440`).
`ClickOutSideDirective` closes label/allergen popovers (`closeLabelsView`/`closeAllergenView`,
`ts:603-615`). `router.events` subscription resets expanded label/allergen cells on navigating back
to `/recipe-book` (`ts:181-192`) — do-not-touch.

### scrollIntoView
None under `recipe-book/` (grep-confirmed, same as Inventory).

### Deep-link query params (`useListState('recipe-book', …)`, `ts:153-163`)
`q`, `sort`, `order`, `filters`, `ingredients` (StringArrayParam), `dateFrom`, `dateTo`,
`dateByUpdated`, `favorites`.

### Empty / loading / error / disabled / permission / RTL states
| item | file:line | condition | renders |
|---|---|---|---|
| RTL | inherited from `app-list-shell` `[dir]` | always | same as Inventory |
| Empty (no recipes at all) | `html:144-153` | `isEmptyList_()` | `app-empty-state` (icon `book-open`, CTA `add_first_recipe`, disabled when logged out) |
| Empty (filtered to nothing) | `html:154-156` | else | `no_recipes_match` text |
| Disabled/permission | `html:39-44,151,284,313` | `!isLoggedIn()` | Add button, favorite button, rating stars (readonly), delete row action all gate on `isLoggedIn()` |
| No loading state | — | — | same as Inventory — no skeleton wraps the whole list |
| No error state | — | — | same as Inventory — none exists today |

---

## Recipe Book 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | "Pending approval" row indicator (info-circle badge + tooltip next to name) | `dc.html:388-392` | — | **Not built, flagging prominently — closest thing to a `specified` candidate in this spec, but not promoting it myself.** The app already tracks `is_approved_`, already filters by it, and already has a working `onToggleApproval()` method with zero UI hook — the design shows exactly this state as a small badge. This is a real, definable, currently-invisible feature, not a decorative element. Needs the Human's explicit call before it's built. |
| 2 | Column sort: name / type / rating / cost | `dc.html:334-355` | — | Already built and wired — not new. |
| 3 | Search | `dc.html:311-314` | — | Already built — not new. |
| 4 | Bulk select + delete + clear-selection | `dc.html:321-330` | — | Already built via `app-selection-bar`. App additionally offers bulk-edit (labels/type), no design counterpart, same pattern as Inventory. |
| 5 | Loading skeleton (6 shimmer rows) | `dc.html:360-370` | **`deferred`** | Same reasoning as Inventory #6 — no loading signal surfaced to this component today. |
| 6 | Load-failed state (`cloud-off` icon + retry) | `dc.html:371-378` | **`deferred`** | No design counterpart in Inventory's spec (Inventory doesn't show this state either) — real, defined, absent. Logging, not building. |
| 7 | Per-row labels/allergens chip + popover | `dc.html:400-451` | — | Already built (`toggleLabelsPopover`/`toggleAllergenPopover`) — not new. |
| 8 | Rating stars (row + add/edit draft) | `dc.html:452-456,536-542` | — | Already built (`app-rating-stars`, `onRatingChange`) — not new. |
| 9 | Favorite heart toggle | `dc.html:463-465` | — | Already built (`onToggleFavorite`) — not new. |
| 10 | Mobile carousel (type/labels/allergens/rating meta) | `dc.html` mobile passes, lines 141-220 | — | Already built, same shared-engine question Inventory already raised and the Human already resolved (kept as-is, item #10a) — not re-asking. |
| 11 | Add/Edit as a centered modal | `dc.html:504-574` | — | Not applicable — app's real "add" action navigates to the full `/recipe-builder` page (already built, far richer: ingredients, sub-recipes, nutrition, export). Same resolution as Inventory #2 — do not compress or rebuild as a modal. Edit likewise routes to `/recipe-builder/:id`, not a modal. |
| 12 | Delete confirm card (single + bulk) | `dc.html:577-590` | — | Shared `ConfirmModalService`, cross-screen, not this session's surface — same as Inventory #11. |
| 13 | Bottom-center save/delete toast | `dc.html:593-597` | — | Shared toast service, cross-screen — same as Inventory #12. |
| 14 | Ingredient-based filter (search by recipe contents) | — (app-only) | — | Real app feature, no design counterpart anywhere in `RecipeBook.dc.html` — do-not-touch. |
| 15 | Date-range filter | — (app-only) | — | Same as #14 — no design counterpart, do-not-touch. |
| 16 | Cost/date hover+tap tooltips (custom floating panel) | design only has a native `title` attribute (`dc.html:394`, `costTooltip`) | — | App renders a real styled floating tooltip where the design just uses the browser's default title tooltip — an idiomatic enhancement the static export doesn't preclude, same reasoning as Dashboard's card-hover-lift finding. Not a conflict; token-check only (Recipe Book 3). |

No row promoted to `specified`. #1 is flagged prominently for the Human's classification call, same
spirit as the Dashboard `scrollIntoView` calibration case but decided by the Human, not by me.

---

## Recipe Book 3 — Visual spec

Everything already inherited via the shared engines (toolbar button, panel surface, `.c-btn-primary`,
`.c-grid-header-cell`, `.c-filter-category-header`, checkbox size, mobile carousel) is **not**
repeated below — see "Read this first." Only screen-level (component-scoped) findings follow.

| Element | Design (exact, `RecipeBook.dc.html` / `colors_and_type.css`) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Page title | `font-size:var(--fs-xl)(24px); font-weight:var(--fw-bold); letter-spacing:var(--tracking-tight)(-0.01em)` (`dc.html:308`) | `.page-title` (`recipe-book-list.component.scss:14-24`): `font-size:1.25rem(20px); font-weight:700(match); letter-spacing:0.02em`(positive, wrong direction) | rebuild from tokens: `--fs-xl`/`--fw-bold`/`--tracking-tight` | **Identical drift to Inventory's page-title finding, already fixed there — this is Recipe Book's own component-scoped copy of the same class name, not shared, so it needs its own fix.** Same direction and magnitude as Inventory's (was already resolved "correct to design" there). |
| Allergen chip (row pill + popover pill) | `background:var(--bg-danger-subtle); border:1px solid rgba(220,38,38,0.2); color:var(--color-allergen-text)` (`dc.html:429,436`) — a **red/danger** family | `.allergen-btn`/`.allergen-pill` (`recipe-book-list.component.scss:173-212`): `background:var(--bg-warning); border:var(--border-warning); color:var(--text-warning)` — an **amber/warning** family (`--bg-warning:rgba(254,243,199,.7)` vs `--bg-danger-subtle:rgba(254,226,226,.7)`, confirmed different token families in `colors_and_type.css`) | swap warning→danger tokens: `--bg-danger-subtle`/`--color-allergen-text` | Real color-family drift, not a shade tweak — amber "caution" color where the design signals allergens in red. Not present in Inventory's spec (Inventory's allergen chip wasn't itemized there) — new finding. |
| Rating star fill (filled state) | `color:var(--color-accent-gold)` = `#a0833f`, muted gold-brown (`dc.html:452`) | `rating-stars.component.scss:33,37`: `color:var(--color-warning, #f59e0b)` = amber/orange — **different token, different hue family** | swap to `--color-accent-gold` | `--color-warning` (`#d97706` in `styles.scss:120`) is even brighter/more orange than its own fallback. Shared component (also used wherever else `app-rating-stars` appears), not Recipe-Book-only — flag as cross-screen like Inventory's engine-level fixes, but scoped to this one component file. |
| Favorite heart (favorited state) | `color:var(--color-favorite)` (`dc.html:463`, JS: `favoriteColor: r.favorite ? 'var(--color-favorite)' : 'var(--color-text-muted)'`) | `.favorite-btn.is-favorited { color: var(--color-favorite) }` (`recipe-book-list.component.scss:518-520`) | exact match | Already correct, no action. |
| Bulk-selection bar surface | `background:var(--color-primary-soft); border:1px solid var(--border-focus); border-radius:var(--radius-md)` (`dc.html:322`) | `selection-bar.component.scss:14-21,34-40`: `background:var(--bg-glass-strong)` (design: `--color-primary-soft`, a tinted teal, not glass); header strip `color-mix(in srgb, var(--color-primary) 8%, transparent)`; `border:var(--border-glass)` (design: `--border-focus`); `border-radius:var(--radius-lg)` (design: `--radius-md`) | rebuild from tokens | **Resolves Inventory's "not verified this pass" caveat on this same shared component** — now checked. Real, multi-property drift. Shared across all 4 list screens (used by Inventory too) — cross-screen engine fix, same category as Inventory's #3/#5/#7 resolutions. |
| Delete (bulk) button | `border:1px solid rgba(220,38,38,0.3); color:var(--color-danger)` outline pill, always-danger-colored (`dc.html:324`) | `.selection-bar__btn--danger` (`selection-bar.component.scss:74-78`): danger color/border only applied `:hover` — at rest it's the default (undyed) button color | apply danger color/border at rest, not just hover | Same file as above — design shows the delete action as always visibly dangerous; app only reveals it on hover. Real interaction-state drift, bundle with the surface fix above. |
| Cost tooltip (custom floating panel — app-only enhancement, see RB2 #16) | design: native `title` attribute only, no styled panel | `.cost-tooltip`/`.date-tooltip` (`recipe-book-list.component.scss:350-369,384-403`): `background:var(--bg-success); color:var(--text-success)` (green success tokens) | n/a — no design value to match against | Not a conflict (design doesn't specify a styled tooltip at all), but worth a Human sanity-check: green/"success" tokens read oddly for a price/date info tooltip that isn't confirming a successful action. Flagged as a judgment call, not a drift from spec. |
| "Add recipe" button label routing | `<a href="RecipeBuilder.dc.html">הוסף מתכון</a>` (`dc.html:315`) | `onAddRecipe()` → `router.navigate(['/recipe-builder'])` (`ts:708-710`) | n/a | Behavior matches design's intent (link to the builder) exactly — same surface already covered by the inherited `.c-btn-primary` fix. |

---

## Unmapped — needs a Human call

Nothing here fails to resolve to an existing token — same "every value already exists somewhere"
finding as Inventory. Every item is a choice or a build decision:

1. **Row-level "pending approval" indicator + wiring the existing but unused `onToggleApproval()`**
   (Recipe Book 2 #1) — build it as `specified`, or leave `deferred`? This is the one item in this
   spec that looks closest to warranting a `specified` tag; the Human's call, not mine.
2. Allergen chip color family: switch to `--bg-danger-subtle`/`--color-allergen-text` (design), or
   keep the app's amber/warning treatment?
3. Rating star fill color: switch to `--color-accent-gold` (design), or keep `--color-warning`?
4. Selection-bar surface + always-visible danger delete button: correct to design tokens (cross-screen,
   affects Inventory too since it shares this component), or leave as-is?
5. Cost/date tooltip color: keep `--bg-success`/`--text-success`, or pick a more neutral surface
   token (e.g. `--bg-glass-strong`) since there's no design value to anchor to either way?

Items #2-#4 are cross-screen (shared components also used by Inventory, Suppliers, Equipment) —
same "decide once, applies everywhere" situation as Inventory's Unmapped #10.

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no.
- Visual value with no token/engine match — no, see Unmapped above (all resolvable, none missing).
- A design row looks `specified` but wasn't confirmed — no; Recipe Book 2 #1 is flagged, not built,
  not promoted.
- Design markup requiring deletion/rewrite of existing TS logic — no; every change above is CSS-level
  (item #1's build, if approved, is markup + calling the existing method — no new TS logic required
  since `onToggleApproval()` already exists).
- Screen has no design counterpart — no, `RecipeBook.dc.html` exists and was read in full.
- About to touch a second screen — no, Recipe Book only. Inventory's already-shipped engine fixes
  were read as ground truth, not re-executed.
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no.

**No stop conditions triggered. Blocked only on Human approval per Step 3.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word**
(`done`, `verified`, `approved`, `LGTM for this job`, etc.). Silence, "thanks," or a green build do
not count. Please also state a decision on Unmapped #1 (the approval-badge feature) — everything
else defaults to "match the design" unless you say otherwise, consistent with Inventory's approval.

---

## Step 4 — Execute (done, 2026-08-24)

Approved by Human reply. All 5 Unmapped items resolved: **1 → build it (badge + wire the existing
`onToggleApproval()`); 2 → design (danger tokens); 3 → design (`--color-accent-gold`); 4 → fix, don't
leave as-is; 5 → agent's call, resolved as neutral glass surface (no design value exists either
way).** All changes restyle-in-place / add markup only — zero lines added to
`recipe-book-list.component.ts` (the new badge calls the method that already existed):

- **`recipe-book-list.component.html`**: added the pending-approval badge inside `.col-name`
  (`@if (!row.recipe.is_approved_)`) — a `<button>` (not the design's inert `<span>`, since this
  instance is wired) with a `lucide-icon name="clock"` (design's SVG is a clock glyph — mapped per
  divergence #2), calling the existing `onToggleApproval(row.recipe)` on click.
- **`recipe-book-list.component.scss`**: added `.approval-pending-badge` (20×20px circle,
  `color-mix(in srgb, var(--color-info) 14%, transparent)` background + `--color-info` icon color —
  matches `dc.html:389`'s `rgba(14,165,233,0.14)` exactly via the app's existing color-mix idiom).
  `.page-title` → `--fs-xl`/`--fw-bold`/`--tracking-tight` (was `1.25rem`/`700`/`0.02em`, same fix
  Inventory already made on its own copy). `.allergen-btn`/`.allergen-pill` → `--bg-danger-subtle`/
  `--color-allergen-text`/`rgba(220,38,38,0.2)` border (was `--bg-warning`/`--text-warning`/
  `--border-warning`). `.cost-tooltip`/`.date-tooltip` → `--bg-glass-strong`/`--color-text-main` +
  `1px solid var(--border-glass)` (was `--bg-success`/`--text-success`, no border).
- **`public/assets/data/dictionary.json`**: added `recipe_pending_approval` (`ממתין לאישור`) —
  reused existing `approve_recipe` for the button's `aria-label`, no new label key needed there.
- **`src/app/shared/rating-stars/rating-stars.component.scss`** (shared — also used by `cook-view`,
  `recipe-header` in Recipe Builder): `&--full`/`&--half` → `var(--color-accent-gold, #a0833f)` (was
  `var(--color-warning, #f59e0b)`).
- **`src/app/shared/selection-bar/selection-bar.component.scss`** (shared — used by all 4 list
  screens): `.selection-bar` → `background:var(--color-primary-soft); border:1px solid
  var(--border-focus); border-radius:var(--radius-md)` (was `--bg-glass-strong`/`--border-glass`/
  `--radius-lg`, plus dropped the backdrop-filter blur — design has none). `.selection-bar__header`
  radius corners updated to match (`--radius-md`). `.selection-bar__btn--danger` → danger color/border
  now applied at rest, not just `:hover` (design shows it always-visible-dangerous).

**Not changed:** `recipe-book-list.component.ts` — 0 lines added/removed. Ingredient-search filter,
date-range filter, bulk-edit (labels/type) — app-only, no design counterpart, untouched. Mobile
carousel component, checkbox size — same "keep as-is" resolution as Inventory, not re-litigated.

### Step 5 — Verify

- `ng build --configuration production` — **0 errors**. Same pre-existing warnings only
  (`venue-detail`/`venue-list` nullish-coalescing, initial bundle budget, `cook-view.page.scss`
  budget, `exceljs` CJS notice) — none introduced by this change.
- `ng test --watch=false --browsers=ChromeHeadless` — **311/311 SUCCESS**, 0 failures (includes
  `recipe-book-list`/`recipe-book.page` specs and the shared `rating-stars`/`selection-bar` specs).
- `git status` on the touched set: `dictionary.json`, `recipe-book-list.component.{html,scss}`,
  `rating-stars.component.scss`, `selection-bar.component.scss` — zero `.ts` files touched, confirmed.
- Recipe Book 1 re-read against current code: every signal/computed, injected service, deep-link
  param, and keyboard/a11y binding listed there is untouched — confirmed by the empty `.ts` diff
  above, not diff-absence alone.
- **Cross-screen impact, expected**: `rating-stars` is also consumed live by `cook-view` and
  `recipe-header` (Recipe Builder); `selection-bar` by Inventory, Suppliers, Equipment. Both now
  inherit the corrected tokens ahead of their own `/design-port` sessions — same pattern Inventory's
  own spec flagged for `list-shell`. Their future port-specs should note this piece is already done.
- **Unrelated concurrent change observed, not part of this session:** `recipe-book.page.spec.ts`
  picked up a `SlidersVertical` Lucide import from the other in-progress session's work on shared
  files — not touched by this spec, noted only so it isn't mistaken for fallout from Step 4 above.
- Live visual comparison at 1280px/390px is performed by the Human, per §6 Step 5 — reporting
  readiness for review, not attempting browser-based self-validation.
