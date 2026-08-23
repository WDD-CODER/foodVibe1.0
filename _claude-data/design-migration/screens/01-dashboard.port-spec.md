# 01 — Dashboard Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **spec written, no code — awaiting Human
validation word before Step 4 (execute).**

- Angular path: `src/app/pages/dashboard/` — `dashboard.page.{ts,html,scss}`,
  `components/dashboard-header/dashboard-header.component.{ts,html,scss}`,
  `components/dashboard-overview/dashboard-overview.component.{ts,html,scss}`
- Design source: `.interface-design/source/Dashboard.dc.html` (336 lines) +
  `colors_and_type.css` + `mobile-pass.css` + `shell.js` (chrome only, not this screen's own markup)

---

## Executive summary — read this first

**Two findings that change the plan, stated plainly per §8's instruction not to smooth them over.**

**1. Colors/type/spacing tokens: 100% exact match, no exceptions found.** Every design value Dashboard
uses — every `--fs-*`, `--fw-*`, `--space-*`, `--radius-*`, `--shadow-glass`, `--shadow-modal`,
`--shadow-glow`, `--blur-glass`, `--ease-spring`, `--color-primary*`, `--color-text-*`, `--bg-success`,
`--text-success`, `--bg-warning`, `--text-warning`, `--color-danger`, `--bg-danger-subtle`,
`--color-info` — exists in `src/styles.scss` under the **identical name with the identical value**,
confirmed by direct diff against both files (not eyeballed). This is even better than §8's stated
expectation ("color and type rows should mostly map cleanly"). Zero color/type token gaps on this
screen.

**2. Layout/structure is NOT a blank slate, and that cuts against the app, not for it.** Someone
already made an unofficial pass at `dashboard-overview.component.scss` — it contains comments reading
*"Matches the design: KPI grid on top, one chronological activity list below it"* (line 78) and
*"Matches the design: one full-width card per row on phone"* (line 98). Structurally that's true: 4 KPI
cards in a grid, one activity list below, similar responsive card-count breakpoints. But **every
precise value under that correct shape has drifted from the design**, and in most cases drifted toward
something the design source never specifies:
- KPI card background is `var(--bg-glass-dense)` (0.85 alpha) — design says `var(--bg-glass)` (0.55).
- KPI card has a decorative `::before` shimmer line and `::after` radial glow blob — **neither exists
  in the design at all.**
- KPI number is `2.375rem`/`-0.045em` tracking/`0.95` line-height — design specifies `--fs-2xl`
  (`1.75rem`)/`--tracking-tight` (`-0.01em`)/`--lh-tight` (`1.2`). The app's number renders ~36%
  larger than spec with different proportions.
- Activity row background is `rgba(255,255,255,0.8)` with a border and an inset+drop shadow — design
  says flat `rgba(255,255,255,0.4)`, no border, no shadow.
- Activity badge (`.activity-type`) carries a `::before` colored dot — design's `.activity-badge` has
  no dot.
- Entity-type tag (`.entity-type-tag`) is rendered as a colored pill (mono font, `--color-primary-soft`
  background, `radius-full`) — design's entity-label is a **plain uppercase text label, no background,
  no pill, no mono font.**

So this is exactly the failure mode §2 warns about, already present once: it *looks* dashboard-shaped
at a glance and would pass a functionality check, but almost no individual CSS value matches the
design source. Inventory 3 below is written as **design value vs. current app value**, not just
"design value → engine," so Step 4 has a concrete diff to close, not just gaps to fill.

**3. The app-shell chrome (top nav tabs, chip row, avatar button, bottom tab bar, Hero FAB) in
`shell.js` is not part of `Dashboard.dc.html` and has no counterpart in this screen's Angular tree.**
It maps to `src/app/appRoot/app.component.*` and `src/app/core/components/hero-fab/*` — shared
components used by all 13 screens, not owned by any single screen session. **None of the 13 screens in
`_registry.md` currently has this chrome in scope.** Flagging this now because it affects the plan for
every remaining session, not just this one — recommend the Human decide whether shell chrome gets its
own tracked item (a "screen 0") or is folded into one of the existing sessions.

---

## Inventory 1 — Old functionality (do-not-touch)

### Signals / computed
| item | file:line | what it holds |
|---|---|---|
| `queryParams_` (`toSignal`) | `dashboard.page.ts:50-52` | `ActivatedRoute.queryParams`, initial `{}` |
| `activeTab` (`computed`) | `dashboard.page.ts:54-59` | `'overview'\|'metadata'\|'venues'\|'add-venue'\|'trash'` from `queryParams_()['tab']`, default `overview` |
| `openChange_` (`signal`) | `dashboard-overview.component.ts:30-35` | `{activityId, field, top, left}\|null` — open change-popover state |
| `totalProducts_` (`computed`) | `dashboard-overview.component.ts:42-44` | `kitchenState.products_().length` |
| `totalRecipes_` (`computed`) | `dashboard-overview.component.ts:46-48` | `kitchenState.recipes_().length` |
| `lowStockCount_` (`computed`) | `dashboard-overview.component.ts:50-52` | `kitchenState.lowStockProducts_().length` |
| `unapprovedCount_` (`computed`) | `dashboard-overview.component.ts:54-58` | count of recipes where `!r.is_approved_` |

No `linkedSignal` anywhere in these three components.

### input() / output()
| item | type | file:line |
|---|---|---|
| `activeTab` (`input.required`) | `DashboardTab` | `dashboard-header.component.ts:18` |
| `tabChange` (`output`) | `DashboardTab` | `dashboard-header.component.ts:19` |
| `activeTab` (`input.required`) | `DashboardTab` | `dashboard-overview.component.ts:23` |
| `tabChange` (`output`) | `DashboardTab` | `dashboard-overview.component.ts:24` |

No `model()`.

### inject() — services
| item | file:line | used for |
|---|---|---|
| `Router` | `dashboard.page.ts:47` | `?tab=` deep-link write via `setTab()` |
| `ActivatedRoute` | `dashboard.page.ts:48` | source of `queryParams_`, `relativeTo` anchor |
| `Router` | `dashboard-header.component.ts:21` | `goToSuppliers()` → `/suppliers` |
| `KitchenStateService` | `dashboard-overview.component.ts:26` | `products_()`, `recipes_()`, `lowStockProducts_()` |
| `Router` | `dashboard-overview.component.ts:27` | all `goTo*` navigation methods |
| `ActivityLogService` | `dashboard-overview.component.ts:28` | `syncFromStorage()` (ctor) + `getRecentEntriesFromStorage(10)` |
| `UserService` (`isLoggedIn`) | `dashboard-overview.component.ts:29` | gates the "Add Product" KPI action |

No modal service or guard injected in these three components.

### Keyboard / drag-drop / focus
None in any of the three components (`HostListener`/`keydown`/`keyup`/drag/`cdkFocus`/tabindex — all
absent, grep-confirmed).

### scrollIntoView
None under `dashboard/` (grep-confirmed, 5 hits elsewhere: menu-intelligence, cook-view,
ingredient-search, recipe-builder ×2 — this is the screen's calibration gap, see Inventory 2).

Adjacent, not `scrollIntoView`: `scrollActivityChanges(event, direction)`
(`dashboard-overview.component.ts:104-112`) calls `changesEl.scrollBy(...)` via on-screen chevron
buttons (`.component.html:181-188,203-210`), plus `ScrollIndicatorsDirective`
(`@directives/scroll-indicators.directive`, imported `ts:10`, applied `html:160`) driving the
`.activity-scroll-zone`/`.activity-scroll-indicator` up/down affordances on the vertical activity list.
**Do not touch** — load-bearing horizontal/vertical scroll affordances for the activity feed.

### Empty / loading / error / disabled / permission / RTL states
| item | file:line | condition | renders |
|---|---|---|---|
| RTL | `dashboard.page.html:1`, `dashboard-overview.component.html:1` | always | `dir="rtl"` on both shells |
| Empty (activity) | `dashboard-overview.component.html:158,228-231` | `getRecentActivity().length === 0` | `<p class="empty-copy" data-testid="activity-empty">` via `no_recent_activity` translation key |
| Disabled/permission | `dashboard-overview.component.html:61-70` | `!isLoggedIn()` | "Add Product" disabled, `[attr.title]` → `sign_in_to_use` tooltip |
| No loading state | — | — | `KitchenStateService` loading is not surfaced by these 3 components |
| No error state | — | — | no error UI exists here today |
| Tab-conditional layout | `dashboard.page.html:2-16` | `activeTab()` | switches `app-dashboard-overview` / metadata layout / `app-venue-list` / `app-venue-form` / `app-trash-page`; `[class.dashboard-content--list]` when `activeTab()==='venues'` |
| Header back-button | `dashboard-header.component.html:5-15` | `activeTab()==='metadata'` | back-to-dashboard button replaces the nav row |

### Deep-link query params
| param | file:line | direction | effect |
|---|---|---|---|
| `tab` | `dashboard.page.ts:19-27,50-59,61-69` | read + write | selects the 5-tab layout; `overview` clears the param |
| `filters` | `dashboard-overview.component.ts:126-131` | write | `goToRecipeBookUnapproved()` → `/recipe-book?filters=Approved:false` |
| `lowStock` | `dashboard-overview.component.ts:133-138` | write | `goToInventoryLowStock()` → `/inventory?lowStock=1` |

No `@defer` blocks.

### KPI tiles (all `dashboard-overview.component.html:47-151`)
| # | tile | value | primary action | secondary |
|---|---|---|---|---|
| 1 | Total Products | `totalProducts_()` | "View Inventory" → `/inventory` (`ts:114-116`) | "Add Product" → `/inventory/add` (`ts:118-120`), disabled when logged out |
| 2 | Total Recipes | `totalRecipes_()` | "View Recipes" → `/recipe-book` (`ts:122-124`) | decorative sparkline `<svg>`, `html:87-96` |
| 3 | Low Stock (`.warning`) | `lowStockCount_()` | "View Inventory" → `/inventory?lowStock=1` (`ts:133-138`) | decorative sparkline, `html:113-122` |
| 4 | Unapproved Recipes (`.info`) | `unapprovedCount_()` | "View Recipes" → `/recipe-book?filters=Approved:false` (`ts:126-131`) | decorative sparkline, `html:139-148` |

Other do-not-touch interactive elements: change-popover toggle
(`toggleChangePopover`, `dashboard-overview.component.ts:69-83`, positioned via
`getBoundingClientRect()`, rendered through `<app-change-popover>`, `html:236-240`); `goToSuppliers()`
duplicated in both `dashboard-header.component.ts:23-25` and `dashboard-overview.component.ts:140-142`
(pre-existing duplication, out of scope to fix here — restyle only).

---

## Inventory 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | Header/chip-row nav item scrolls itself into view within its (horizontally-scrollable on mobile) container when pressed | `shell.js` chip row pattern (mask-fade scroll, `styles.scss:1032-1073` `.c-tab-chips` already implements this pattern for other screens); app's local analog is `dashboard-header.component`'s `.header-btn` nav row (`overview/metadata/venues/trash`) | **`specified`** | This is the handoff's named calibration case (§8). Confirmed absent (`scrollIntoView` grep returns 0 hits under `dashboard/`). Build it: on tab-button press, `scrollIntoView({ block: 'nearest', inline: 'nearest' })` (or `behavior: 'smooth'`) on the pressed `.header-btn` within `.header-actions__nav`. |
| 2 | Loading skeleton (6 pulsing placeholder rows) for the activity feed | `Dashboard.dc.html:186-193` | **`deferred`** | Real UI, but `KitchenStateService` doesn't currently expose a loading signal to these 3 components (Inventory 1 confirms no loading state exists). Wiring it needs a data-layer decision beyond a restyle — out of scope for this session, logged for later. |
| 3 | Error state + "Try again" retry button for the activity feed | `Dashboard.dc.html:197-203` | **`deferred`** | Same reasoning as #2 — no error signal is currently surfaced here. `retryLoad` in the design is a trivial local `setState`, but there's no real failure path feeding it in the app today. |
| 4 | KPI footer sparkline SVGs | `Dashboard.dc.html:125,142,159,176` (design); already present in app on tiles 2–4, `dashboard-overview.component.html:87-96,113-122,139-148` | **`inert`** | Static/decorative in the design too (no data binding found in the design's script). App already has them — visual-only, restyle to match design's stroke/size, no new wiring either side. |
| 5 | KPI footer chevron icon | `Dashboard.dc.html:123,140,157,174` | **`inert`** | Decorative directional cue on an existing real link — port as a Lucide `chevron-left` icon per Divergence #2, no new handler. |
| 6 | KPI card itself as a clickable surface | not present — design's cards are not `cursor: pointer`, only the footer `<a>` is interactive | — | **Not a new interaction; flagging the opposite.** App's current `.kpi-card` has `cursor: pointer` (`dashboard-overview.component.scss:121`) with no visible click handler on the card body — likely leftover/misleading affordance. Recommend dropping `cursor: pointer` from the card body during Step 4 restyle (visual-only fix, no behavior change; the card's real actions remain the footer link/button). Flagging for Human confirmation, not proceeding unilaterally since it's a behavior-adjacent visual call. |
| 7 | Top nav / chip row / avatar / bottom tab bar / Hero FAB (shell chrome) | `shell.js` | **`deferred`** | Not part of this screen's component tree (see Executive Summary #3) — belongs to `app.component`/`hero-fab`, a cross-screen concern. |

No row was promoted from `inert`/`deferred` to `specified` beyond #1, which the Human already named.

---

## Inventory 3 — Visual spec (design value vs. current app value → engine/token)

All quoted design values are verbatim from `.interface-design/source/Dashboard.dc.html` and
`colors_and_type.css`, cited by line. All "current app" values are verbatim from the three `.scss`
files under `src/app/pages/dashboard/`. All target tokens/engines are verbatim from `src/styles.scss`,
confirmed present by direct read (not assumed).

### Page header

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Wrapper | `max-width:1200px; margin:0 auto; padding: var(--space-6) var(--space-6) var(--space-12)` (`Dashboard.dc.html:101`) | `dashboard.page.scss:9-16` `.dashboard-content { padding: 1.5rem }` (=`--space-6`), no `max-width` constraint, no `--space-12` bottom | — (layout, no `.c-*` needed) | App has no `max-width: 1200px` centering wrapper at all — full width today. Needs a call: add the wrapper, or is full-width intentional for this app's shell (which already constrains width elsewhere via `app.component`)? **Flagging, not assuming.** |
| `<h1>` | `font-size: var(--fs-xl); font-weight: var(--fw-bold); letter-spacing: var(--tracking-tight); color: var(--color-text-main)` (`Dashboard.dc.html:105`) | `dashboard-header.component.scss:37-44` `.page-title { font-size:1.5rem; font-weight:700; color:var(--color-text-main); letter-spacing:-0.01em }` | **Exact match already** (`1.5rem`=`--fs-xl`, `700`=`--fw-bold`, `-0.01em`=`--tracking-tight`) — also equals `.c-page-title` (`styles.scss:788-794`) verbatim | Could optionally switch to the shared `.c-page-title` engine class instead of the local rule for consistency, but the local rule is already byte-identical — no visual change either way. |
| `<p>` subtitle | `margin:2px 0 0; font-size: var(--fs-sm); color: var(--color-text-muted)` (`Dashboard.dc.html:106`) | `dashboard-overview.component.scss:54-59` `.page-subtitle { color:var(--color-text-muted); font-size:var(--fs-sm) }` | Exact match | `margin` not explicitly checked but visually minor. |
| Header nav row (`.header-btn`) | *(design has no equivalent — this row doesn't exist in `Dashboard.dc.html` at all; it's the app's analog of the design's shell-level chip row, see Inventory 2 #1)* | `dashboard-header.component.scss:63-122`, near-duplicate of the global `.header-btn` in `styles.scss:1147-1216` | `.header-btn` (global engine, already correct — `var(--bg-glass)`, `var(--radius-full)`, `var(--blur-glass)`, `.active` state with `--shadow-glow`) | The component-local `.header-btn` and the global one are near-identical (minor 620px breakpoint differences). Recommend Step 4 delete the component-local duplicate and use the global engine directly — pure de-dup, zero visual risk. Add the `specified` scroll-into-view behavior (Inventory 2 #1) here. |

### KPI grid & card

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Grid | `display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-4)` → 2 cols ≤1023px → 1 col ≤767px (`Dashboard.dc.html:22-24`) | `dashboard-overview.component.scss:88-102` `repeat(auto-fit, minmax(180px,1fr))` → 2 cols ≤768px → 1 col ≤480px | Rewrite to `repeat(4,1fr)` + design's exact breakpoints (1023px/767px, not auto-fit/768px/480px) | Real breakpoint mismatch: app collapses to 1-col at 480px, design at 767px. At tablet widths (768–1023px) the app may show 3–4 cols via `auto-fit`, design mandates 2. |
| Card surface | `padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg); border:1px solid var(--border-glass); background: var(--bg-glass); backdrop-filter: var(--blur-glass); box-shadow: var(--shadow-glass); animation: fadeIn 0.3s var(--ease-spring)` (`Dashboard.dc.html:112`) | `dashboard-overview.component.scss:104-124` `padding-block:1.125rem; padding-inline:1.25rem; border:1px solid var(--border-glass-strong); background:var(--bg-glass-dense); box-shadow:var(--shadow-soft)`, plus `::before` shimmer line and `::after` radial glow blob (**not in design**), hover `translateY(-2px)` | `.c-glass-card` (`styles.scss:273-288`) — background/border/radius/shadow/blur all match design exactly; hover-lift is idiomatic (design doesn't forbid it, just doesn't show it on a static export) | Recommend switching to `.c-glass-card` wholesale and **deleting the `::before`/`::after` decorative overlay** — neither exists in the design. Border should be `--border-glass` not `--border-glass-strong`; background `--bg-glass` not `--bg-glass-dense`. |
| Icon chip | `width:24px;height:24px;border-radius:var(--radius-sm);background:var(--color-primary-soft);color:var(--color-primary-hover)` (`Dashboard.dc.html:114`); warning: `background:var(--bg-warning);color:var(--text-warning)`; info: `background:rgba(14,165,233,0.12);color:var(--color-info)` | `dashboard-overview.component.scss:193-210` `.kpi-icon { width/height:1.5rem` (=24px, matches) `; background:rgba(20,184,166,0.14)` (design: `--color-primary-soft`=`rgba(20,184,166,0.12)`, close but not equal) `; border-radius:0.5rem` (design: `--radius-sm`=`0.375rem`, app is larger) | `--color-primary-soft`, `--radius-sm`, `--color-primary-hover` (tokens, no dedicated engine class exists) | Two small literal drifts: icon radius 8px vs spec 6px, soft-bg alpha 0.14 vs spec 0.12. `rgba(14,165,233,0.12)` for the info variant is the design's **own** inline literal (not tokenized there either) — reuse as-is, not an unmapped value. |
| Label | `font-size:var(--fs-xs);font-weight:var(--fw-medium);color:var(--color-text-muted)` (`Dashboard.dc.html:117`) | `dashboard-overview.component.scss:212-219` `.kpi-label { font-size:0.75rem` (=`--fs-xs`) `;font-weight:500` (=`--fw-medium`) `;color:var(--color-text-muted) }` | Exact match | — |
| Big number | `.kpi-number`: `font-size:var(--fs-2xl);font-weight:var(--fw-extrabold);color:var(--color-text-main);letter-spacing:var(--tracking-tight);line-height:var(--lh-tight)` (`colors_and_type.css:195-201`) | `dashboard-overview.component.scss:221-228` `.kpi-value { font-size:2.375rem` (design: `1.75rem` — **36% larger than spec**) `;font-weight:800` (matches) `;letter-spacing:-0.045em` (design: `-0.01em`) `;line-height:0.95` (design: `1.2`) `}` | Rebuild from tokens: `font-size:var(--fs-2xl); font-weight:var(--fw-extrabold); letter-spacing:var(--tracking-tight); line-height:var(--lh-tight); color:var(--color-text-main)` | Largest single numeric drift found on this screen. No existing `.c-*` class for this — build inline/local rule from tokens (all tokens exist, nothing to invent). |
| Footer row | `display:flex;justify-content:space-between;padding-top:var(--space-3);border-top:1px dashed var(--border-default)` (`Dashboard.dc.html:120`) | `dashboard-overview.component.scss:230-247` `.kpi-foot { margin-block-start:0.5rem;padding-block-start:0.625rem` (design: `var(--space-3)`=`0.75rem`) `;border-block-start:1px dashed rgba(15,23,42,0.1)` (design: `var(--border-default)`=`rgba(226,232,240,0.6)` — different color entirely, app's is a dark-tinted dash, design's is a light slate dash) `}` | `--space-3`, `--border-default` | Minor spacing drift + a real color drift on the dashed rule. |
| Footer link | `font-size:var(--fs-xs);font-weight:var(--fw-semibold);color:var(--color-primary-hover)` + global `a:hover{color:var(--color-primary-hover)}` (`Dashboard.dc.html:19-20,121`) | link is inside `.kpi-foot`, inherits `color:var(--color-primary-hover)` from `.kpi-card.warning &`/`.info &` overrides only for those variants; base link styling not shown in the read SCSS (likely from a shared `a` rule or the `link-btn`/nav link component) | `--fs-xs`, `--fw-semibold`, `--color-primary-hover` | Needs Step-4-time check against whatever renders the actual `<a>`/button for "View Inventory" etc. — not fully visible in the SCSS files read for this spec. |
| Sparkline SVG | `width:52 height:18`, `stroke="currentColor" stroke-width="1.5"` (`Dashboard.dc.html:125` etc.) | `.kpi-sparkline { opacity:0.6 }` (`dashboard-overview.component.scss:249-252`) — design has no opacity reduction on the sparkline | inert per Inventory 2 #4 | Drop the `opacity:0.6` to match design (`color: currentColor`, full opacity) unless the Human wants the muted look kept as an app-specific choice. |
| Mobile card layout (≤767px) | Restructures each card into 2-col grid (label left / number right on one line), footer spans full width (`Dashboard.dc.html:81-92`) | `dashboard-overview.component.scss:175-182` only resizes padding/number font-size, does **not** restructure to the 2-col horizontal layout | Needs a call | This is a real structural difference at mobile width, not just a value tweak — the design's mobile KPI card is a fundamentally different layout (horizontal) from the app's (vertical, same shape as desktop just smaller). Recommend building it per spec at Step 4; flagging since it's the single biggest structural change on this screen. |

### Activity panel

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Panel surface | `background:var(--bg-glass);backdrop-filter:var(--blur-glass);border:1px solid var(--border-glass);border-radius:var(--radius-lg);box-shadow:var(--shadow-glass);padding:var(--space-5)` (`Dashboard.dc.html:182`) | `dashboard-overview.component.scss:275-288` `.activity-section { padding:1rem 1.125rem` (design: `var(--space-5)`=`1.25rem` all sides) `;border:1px solid var(--border-glass)` (matches) `;background:var(--bg-glass-strong)` (design: `--bg-glass`, app one step denser) `;box-shadow:var(--shadow-glass)` (matches) `}` | `.c-glass-panel` (`styles.scss:290-298`) is the no-hover-lift static-panel engine, but it also defaults to `--bg-glass-strong` not `--bg-glass` | Same background-alpha question as the KPI card. Divergence #5 (glass opacity 0.35–0.82, no change needed) pre-clears reusing existing glass surfaces even at a different alpha within that range — so this is **not** a stop condition, just noting `--bg-glass-strong` (0.72) vs the spec's literal `--bg-glass` (0.55) if exact fidelity is wanted. |
| `<h2>` | `margin:0 0 var(--space-4);font-size:var(--fs-md);font-weight:var(--fw-semibold);color:var(--color-text-main)` (`Dashboard.dc.html:183`) — note: `--fs-md` = `1rem`, overriding the global `h2`/`.h2` rule's `--fs-lg` | `dashboard-overview.component.scss:290-295` `.section-header h2 { font-size:1.125rem` (=`--fs-lg`, i.e. it's using the un-overridden global size, not the design's dashboard-specific override) `;font-weight:600;color:var(--color-text-main) }` | `.c-section-title` (`styles.scss:797-802`) is `1.125rem`/600 — **matches the app's current 1.125rem, not the design's 1rem override** | Needs a call: reuse `.c-section-title` as-is (18px, matches app today, 2px larger than design) vs. hand-roll `font-size:var(--fs-md)` for exact 16px fidelity. Recommend exact fidelity (tokens exist either way, no invention needed) but flagging since it means *not* reusing the otherwise-natural engine class. |

### Activity row

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Grid | `grid-template-columns:auto 1fr auto auto;gap:var(--space-3)` → `auto 1fr` stacked ≤767px (`Dashboard.dc.html:25-26`) | `dashboard-overview.component.scss:371-404` `.activity-item { grid-template-columns:auto 1fr auto auto` (matches) `;gap:0.5rem` (design: `var(--space-3)`=`0.75rem`) `}` → `auto 1fr auto` + 2 rows ≤768px (design: `auto 1fr` + 2 rows ≤767px — app keeps a 3rd column) | `--space-3` | Small gap drift + slightly different mobile column count; low severity. |
| Row surface | `padding:var(--space-3);border-radius:var(--radius-md);margin-bottom:6px;background:rgba(255,255,255,0.4)` — **no border, no box-shadow** (`Dashboard.dc.html:212`) | `dashboard-overview.component.scss:371-390` `padding-block:0.625rem;padding-inline:0.875rem` (close to `var(--space-3)`=`0.75rem`) `;border-radius:var(--radius-md)` (matches) `;background:rgba(255,255,255,0.8)` (design: `0.4` — app is double the opacity) `;border:1px solid var(--border-glass-strong)` (**not in design**) `;box-shadow:inset 0 1px 0 var(--border-glass-strong), 0 4px 10px -6px rgba(15,23,42,0.08)` (**not in design**) `; hover: background:var(--bg-pure)` (**not in design — design has no hover rule on activity rows**) | `--radius-md`, `--space-3`, literal `rgba(255,255,255,0.4)` (design's own literal, no dedicated token) | Real, multi-value drift: app's row is visually heavier (more opaque, bordered, shadowed) than the design's flat, minimal row. Recommend matching design exactly — drop border, drop shadow, drop hover-background-swap, correct opacity to 0.4. |
| Avatar-letter chip | `width:30px;height:30px;border-radius:var(--radius-md);background:var(--color-primary-soft);color:var(--color-primary-hover);font-weight:var(--fw-bold);font-size:var(--fs-xs)` (`Dashboard.dc.html:213`) | `dashboard-overview.component.scss:406-424` `.act-avatar { width/height:1.875rem` (=30px, matches) `;background:linear-gradient(180deg,var(--cv-avatar-gradient-start),var(--cv-avatar-gradient-end))` (**gradient, not in design** — design is flat `--color-primary-soft`) `;border-radius:0.625rem` (=10px; design `--radius-md`=12px, close) `;font-family:var(--font-mono)` (**design doesn't specify mono for this**) `;font-size:0.75rem` (=`--fs-xs`, matches) `;font-weight:700` (=`--fw-bold`, matches) `}` | `--color-primary-soft`, `--color-primary-hover`, `--radius-md`, `--fs-xs`, `--fw-bold` | Gradient background and mono font-family are app-only additions not in the design. Custom `--cv-avatar-gradient-*` tokens (`.component.scss:1-4`) exist nowhere else audited — likely a one-off. |
| Entity label | `font-size:var(--fs-xs);font-weight:var(--fw-semibold);color:var(--color-text-muted-light);text-transform:uppercase;letter-spacing:var(--tracking-wide)` — **no background, no pill, no mono font** (`Dashboard.dc.html:215`) | `dashboard-overview.component.scss:502-533` `.entity-type-tag { font-family:var(--font-mono)` (**not in design**) `;font-size:0.59375rem` (design: `--fs-xs`=`0.75rem`, app smaller) `;letter-spacing:0.14em` (design: `--tracking-wide`=`0.02em`, app 7× wider) `;padding-inline:0.5rem;padding-block:0.25rem;border-radius:var(--radius-full);background:var(--color-primary-soft)` (**pill treatment not in design at all**) `}` | `--fs-xs`, `--fw-semibold`, `--color-text-muted-light`, `--tracking-wide` (all exist; no pill/mono needed) | The single largest structural drift on this row: app renders entity type as a colored monospace pill; design renders it as a plain uppercase label with no background. Needs a call — this is a visible, deliberate-looking app design choice that directly contradicts the design source. |
| Name | `font-size:var(--fs-base);font-weight:var(--fw-medium);color:var(--color-text-main)` (`Dashboard.dc.html:216`) | `dashboard-overview.component.scss:492-500` `.activity-name { font-size:0.84375rem` (design: `--fs-base`=`0.875rem`, close) `;font-weight:600` (design: `--fw-medium`=500) `;letter-spacing:-0.01em` (**not in design**) `}` | `--fs-base`, `--fw-medium`, `--color-text-main` | Weight and tracking drift; low-medium severity. |
| Change chip | `font-size:var(--fs-xs);font-family:var(--font-mono);padding:4px 9px;border-radius:var(--radius-sm);background:var(--color-primary-soft);color:var(--color-primary-hover)` (`Dashboard.dc.html:220`) | `dashboard-overview.component.scss:617-640` `.change-tag { font-family:var(--font-mono)` (matches) `;font-size:0.625rem` (design: `--fs-xs`=`0.75rem`) `;padding-inline:0.5rem;padding-block:0.25rem` (close) `;background:var(--color-primary-soft);color:var(--color-primary-hover)` (matches) `;border:1px solid rgba(20,184,166,0.18)` (**not in design**) `;cursor:pointer` (**real, existing interactivity — Inventory 1, do not remove**) `}` | `--fs-xs`, `--font-mono`, `--radius-sm`, `--color-primary-soft`, `--color-primary-hover` | Mostly close; the extra border is a minor addition. `cursor:pointer` must stay — it's wired to the real change-popover (Inventory 1), the design's static export just doesn't show it. |
| Activity badge | `padding:4px 10px;border-radius:var(--radius-full);background:{{item.badgeBg}};color:{{item.badgeColor}};font-size:var(--fs-xs);font-weight:var(--fw-semibold);letter-spacing:var(--tracking-wide);text-transform:uppercase` — **no dot marker** (`Dashboard.dc.html:224`); state colors: created→`var(--bg-success)`/`var(--text-success)`, updated→`var(--bg-warning)`/`var(--text-warning)`, deleted→`var(--bg-danger-subtle)`/`var(--color-danger)` (script lines 298-302) | `dashboard-overview.component.scss:445-490` `.activity-type` — same `radius-full`/`fs-xs`/`fw-semibold` shape, but has a `::before` 4px dot (**not in design**), and state colors use **different literals**: created→`rgba(16,185,129,0.14)`/`var(--color-success-emphasis)` (design wants `var(--bg-success)`/`var(--text-success)`); updated→`var(--bg-warning)`/`var(--text-warning)` (**matches**); deleted→`var(--bg-danger-subtle)`/`var(--color-danger)` (**matches**) | `.c-status` (`styles.scss:903-949`) is the natural reuse candidate (same `created/updated/deleted` semantics, same dot pattern) but **also** uses the non-design `rgba(16,185,129,0.14)`/`--color-success-emphasis` for the success case and **also** has the dot | Needs a call: reuse `.c-status` as-is (app-idiomatic, has a dot the design doesn't, and a slightly different green for "created") vs. build to the design's exact 3 token pairs with no dot. The `updated`/`deleted` colors already match either way. |

### Loading / error / empty states

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| Loading skeleton | 6 rows, `gap:12px`, `animation:skelPulse 1.4s var(--ease-smooth) infinite`, 3 bars per row at `rgba(15,23,42,0.07)`/`0.05`/`0.05`, `border-radius:var(--radius-full)` (`Dashboard.dc.html:186-193`) | does not exist (Inventory 1/2 #2 — `deferred`) | n/a this session | Documented for whenever #2 is un-deferred. Tokens/literals all already available (`--ease-smooth`, `--radius-full`, and the design's own hardcoded rgba bars). |
| Error block | `padding:var(--space-10) var(--space-4)`, icon `cloud-off` at `28px` `color:var(--color-danger)`, title `--fs-md`/`--fw-semibold`, body `--fs-sm`/`--color-text-muted`/`--lh-relaxed`/`max-width:34ch`, retry button `background:var(--color-primary);border-radius:var(--radius-full);box-shadow:var(--shadow-glow);min-height:44px` (`Dashboard.dc.html:197-203`) | does not exist (`deferred`) | n/a this session | Retry button is **not** a clean `.c-btn-primary` match if built later — `.c-btn-primary` (`styles.scss:301-342`) is a gradient fill with a layered inset+glow shadow and `--radius-md`; design's retry button is flat `--color-primary`, `--radius-full` (pill), single `--shadow-glow`. Note left for whichever session un-defers this. |
| Empty state | `padding:var(--space-10) var(--space-4)`, icon `activity` at `26px` `color:var(--color-text-muted-light)`, text `--fs-sm`/`--color-text-muted` (`Dashboard.dc.html:205-207`) | `dashboard-overview.component.html:228-231` + `.component.scss:642-645` `.empty-copy { font-size:0.85rem` (design: `--fs-sm`=`0.8125rem`, close) `;color:var(--color-text-muted) }` (matches); no icon currently rendered | `.c-empty-state`/`.c-empty-state__icon`/`.c-empty-state__msg` (`styles.scss:1360-1379`) is the natural reuse — icon color matches (`--color-text-muted-light`... wait, engine doesn't set that, check), text color engine uses `--color-text-secondary` (design wants `--color-text-muted`) | The app currently has **no icon** in its empty state at all — design wants a Lucide `activity` icon at 26px. `.c-empty-state__msg`'s `--color-text-secondary` (`#1e293b`) is a different, darker token than the design's `--color-text-muted` (`#64748b`) — use the design's exact token if adopting this engine class, don't inherit the engine's default. |

### Coming-soon placeholder & toast

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| `dash-soon` card | `text-align:center;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-xl);box-shadow:var(--shadow-glass);padding:var(--space-10) var(--space-12);animation:fadeIn 0.25s var(--ease-spring)`; mobile `padding:var(--space-8) var(--space-5)` ≤767px (`Dashboard.dc.html:234`, mobile pass line 78) | Not directly comparable — the app's non-overview tabs (`metadata`/`venues`/`add-venue`/`trash`) render **real functional pages**, not a "coming soon" placeholder; the design's `isOtherView` branch is a placeholder for screens the design itself hasn't built yet | n/a | **Not a gap** — the app is ahead of the design here (real screens vs. mockup placeholder). Nothing to port; do not build a "coming soon" state over working functionality. |
| Toast | `position:fixed;bottom:28px;...background:var(--color-text-main);color:#fff;border-radius:var(--radius-full);box-shadow:var(--shadow-modal);animation:popIn 0.2s var(--ease-spring)`; mobile `bottom:calc(56px+20px+safe-area)` (`Dashboard.dc.html:247`, `mobile-pass.css:37`) | Not found in these 3 components — likely a shared/global toast service elsewhere in the app (out of scope to search for in this spec; Dashboard doesn't own toast styling) | n/a this screen | If the app has a shared toast component, it's a cross-screen concern like the shell chrome — not something to fork per-screen. Flagging, not building. |

### Responsive breakpoints used by this screen
Design breakpoints found: **767px** (primary mobile) and **1023px** (KPI grid tablet step). **No
1280px breakpoint exists anywhere in `Dashboard.dc.html`, `colors_and_type.css`, or
`mobile-pass.css`** — the design-port procedure's standard verification widths (1280px/390px, §6 Step
5) don't correspond to an actual design breakpoint for this screen; 1280px sits in the same "4-column
desktop" bucket as everything above 1023px, and 390px sits inside the ≤767px single-column bucket. Use
1280px and 390px for the live side-by-side render per the procedure regardless — just noting neither is
a breakpoint edge on this particular screen, so nothing especially interesting happens exactly at those
two widths beyond "desktop" and "mobile" buckets already covered above.

---

## Unmapped — needs a Human call

Nothing on this screen fails to resolve to an existing token or engine — there is no row where a
design value has **no** corresponding token/engine in `src/styles.scss` at all. Every "needs a call"
item above is a **choice between two already-existing options** (reuse an engine as-is vs. hand-roll
exact tokens), not a missing value. Listed together here for one-pass review:

1. Content wrapper `max-width:1200px` centering — add it, or is full-bleed intentional for this app shell?
2. KPI card: adopt `.c-glass-card` wholesale (drop the `::before`/`::after` decorative overlay)?
3. KPI number: rebuild from tokens (`--fs-2xl`/`--tracking-tight`/`--lh-tight`) — no engine class exists for this, confirmed safe to hand-roll from tokens only.
4. Mobile KPI card layout: build the design's horizontal 2-col restructure at ≤767px (real structural change, not a value tweak)?
5. Activity `<h2>`: exact `--fs-md` (1rem, design) vs. reuse `.c-section-title` (1.125rem, matches current app)?
6. Activity row surface: strip to design's flat/borderless/shadowless/0.4-alpha treatment?
7. Entity-type tag: drop the pill/mono treatment for the design's plain uppercase label?
8. Activity badge: reuse `.c-status` (dot + slightly different "created" green) vs. exact design tokens (no dot, `--bg-success`/`--text-success`)?
9. Empty-state icon: add the missing `activity` Lucide icon; use `.c-empty-state` as-is or override its text color to `--color-text-muted`?
10. Whether the app-shell chrome (Inventory 2 #7, Executive Summary #3) gets its own screen-order slot.

None of these block writing code in the sense of "value doesn't exist" — they're fidelity/reuse
judgment calls the Human should bless before Step 4, consistent with "never improvise a value."

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no, verified present and committed.
- Visual value with no token/engine match — no, see "Unmapped" section above (zero true unmapped values).
- A design row looks `specified` but wasn't confirmed — no; only Inventory 2 #1 is tagged `specified`, and it's the Human-named calibration case from `design-port.md` §8.
- Design markup requiring deletion/rewrite of existing TS logic — no; every change identified above is CSS/markup-level.
- Screen has no design counterpart — no, `Dashboard.dc.html` exists and was read in full.
- About to touch a second screen — no, Dashboard only.
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no, none were read as authority.

**No stop conditions triggered. Proceeding is blocked only on Human approval per Step 3, not on any
missing information.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word**
(`done`, `verified`, `approved`, `LGTM for this job`, etc. — see `docs/agent/job-validation.md`).
Silence, "thanks," or a green build do not count.

If approved as-is, Step 4 will restyle in place using the resolutions above, defaulting to the
"exact design fidelity" option on every "needs a call" item unless the Human specifies otherwise in
their reply — please flag any item above where the Human wants the opposite choice (keep current app
behavior/look) instead.

---

## Step 4 — Execute (done, 2026-08-23)

Approved by Human reply "done" on this same date; all 10 "needs a call" items resolved to exact design
fidelity per the default stated above. Changes made, all restyle-in-place (no markup replaced with the
design's own markup, no TS logic removed):

- `dashboard-overview.component.scss` — KPI card surface/shadow/border → `--bg-glass`/`--shadow-glass`/
  `--border-glass`; removed the `::before`/`::after` decorative shimmer+glow (not in design); removed
  `cursor: pointer` from the card body (Inventory 2 #6); KPI number → `--fs-2xl`/`--tracking-tight`/
  `--lh-tight`; warning/info number + sparkline colors corrected to `--text-warning`/`--color-info`;
  KPI icon → `--radius-sm`/`--color-primary-soft`, added the missing `.info` icon variant; KPI footer
  border/padding → `--border-default`/`--space-3`; mobile (≤767px) KPI card rebuilt as the design's
  2-column grid (label+icon left, number right, footer full-width below); `.kpi-grid` → `repeat(4,1fr)`
  with the design's exact 1023px/767px breakpoints; content wrapper (`.dashboard-overview`) now
  `max-width:1200px` centered with `--space-6` bottom padding (combines with the parent's existing
  padding to match the design's `--space-12`); activity `<h2>` → `--fs-md`; activity row → flat
  `rgba(255,255,255,0.4)`, no border, no shadow, no hover swap; avatar chip → flat `--color-primary-soft`
  (dropped the gradient + mono font); entity-type tag → plain uppercase label (dropped the pill/mono
  treatment entirely, per design); activity name → `--fs-base`/`--fw-medium`; change-tag → `--fs-xs`,
  dropped the extra border; activity badge → dropped the `::before` dot, "created" state → `--bg-success`/
  `--text-success`; added `.activity-empty`/`.activity-empty-icon` for the new empty-state icon;
  `.link-btn` → `--fs-xs`/`--fw-semibold` + icon gap + a disabled state.
- `dashboard-overview.component.html` — added a Lucide `chevron-left` icon to the 4 KPI footer links
  (Inventory 2 #5, visual-only); wrapped the empty state in `.activity-empty` with a Lucide `activity`
  icon (Inventory 3 empty-state row); wired `scrollNavItemIntoView($event)` into all 4 nav buttons
  (Inventory 2 #1, the specified row).
- `dashboard-overview.component.ts` — added `scrollNavItemIntoView(event)`, calling
  `el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })` on the pressed nav
  button. No signals/inputs/outputs/injected services touched.
- `dashboard-header.component.html`/`.ts` — same `scrollNavItemIntoView` addition, wired into all 4 nav
  buttons in the metadata-tab header (this component's `.header-btn` engine was already correct, so no
  CSS changes were needed here).
- `src/app/app.config.ts` + `src/testing/test-lucide-icons.ts` — registered the `Activity` Lucide icon
  (new, needed for the empty-state icon); `ChevronLeft` was already registered.

**Not built, left as documented (Inventory 2 `deferred`):** loading skeleton, error/retry state, and the
retry-button engine-mismatch note — no backing loading/error signal exists in `KitchenStateService` yet.
**Not touched:** the app-shell chrome gap (Executive Summary #3) and the two duplicate `.header-btn`
CSS blocks (flagged as a de-dup opportunity, not required for visual fidelity) — both out of this
session's scope.

### Step 5 — Verify

- `ng build --configuration production` — **0 errors**, output complete. Pre-existing warnings only
  (unrelated `venue-detail`/`venue-list` nullish-coalescing warnings, initial bundle budget, `exceljs`
  CJS notice) — none introduced by this change.
- `ng test --watch=false --browsers=ChromeHeadless` (full suite) — **310/310 SUCCESS**, 0 failures. The
  `Activity` icon registration was required to get there (14 dashboard tests initially failed on
  "icon has not been provided by any available icon providers" until it was added to both
  `app.config.ts` and `test-lucide-icons.ts`).
- `eslint` on every touched `.ts` file — 0 errors.
- Inventory 1 re-read against the current code: all 7 signals/computed, all 4 inputs/outputs, all 7
  injected services, all 3 deep-link params (`tab`/`filters`/`lowStock`), the disabled/`isLoggedIn` gate,
  RTL `dir="rtl"` on both roots, and the change-popover/scroll-indicator machinery are all still present
  and untouched — confirmed by direct re-read of the final files, not by diff-absence alone.
- **Live side-by-side render at 1280px/390px — done**, via `gstack /browse` against `ng serve` (already
  running on :4200) and a local static server for `.interface-design/source/` (Python `http.server` on
  :8850, stopped after capture). Screenshots confirm:
  - 1280px: KPI card glass surface, spacing, icon chips, number size, footer links+chevrons, and the
    activity panel/empty-state now read as close matches to the design's own render, not just on paper.
  - 390px: the pass-6 mobile 2-column KPI restructure (number leading, label+icon trailing, footer
    spanning below) reproduces the design's mobile card shape correctly, RTL-mirrored the same way.
  - Confirmed-expected divergences, both already documented above: (1) the app's local `.c-tab-pill`
    header nav renders as a **second, extra chip row** beneath the shared shell's chip row — the design
    has only one row because that switching lives in the shared shell, not per-screen (Executive
    Summary #3); at 390px this row visibly overlaps the Hero FAB, a pre-existing layout issue, not
    introduced by this session, left untouched as out of scope. (2) "Add Product" adds a second footer
    line to the Total Products card on mobile — correct, it's real app functionality with no design
    counterpart (Inventory 1).
  - Activity list showed the design's empty state (no seeded activity in this guest session) rather than
    populated rows, so the row-level styling (avatar/entity-tag/badge) could not be visually diffed
    in this pass — the CSS was still changed to the exact tokens documented above; recommend a follow-up
    glance once real activity exists in a session's storage.

