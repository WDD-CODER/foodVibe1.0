# 06 — Venues (+ VenueDetail) Port Spec

Procedure: `.claude/commands/design-port.md` §6. Status: **Step 2, spec written — awaiting Human
approval before any code.**

- Angular path: `src/app/pages/venues/` — `venues.page.{ts,html,scss}` (thin shell: back-to-list nav
  strip on non-list child routes + `<router-outlet>`), `components/venue-list/venue-list.component.{ts,html,scss}`
  (`/venues/list`, also embedded in Dashboard's tab system via `[embeddedInDashboard]`),
  `components/venue-form/venue-form.component.{ts,html,scss}` (`/venues/add`, `/venues/edit/:id`,
  same dual embedding), `components/venue-detail/venue-detail.component.{ts,html,scss}` (`/venues/view/:id`,
  standalone-only, not embedded in Dashboard)
- Shared engines this screen already consumes: `.c-glass-card` (venue-list cards — hover-lift variant),
  `.c-glass-panel` (venue-detail hero + all detail cards — no-lift variant), `.c-btn-primary`,
  `.c-btn-ghost` / `.c-btn-ghost--sm`, `.c-icon-btn`, `.c-input` / `.c-input-wrapper`, `.c-form-actions`,
  `.c-field-error`, `app-list-row-checkbox` (global checkbox reskin via `app-root input[type=checkbox]`,
  `styles.scss:1723`), `CustomSelectComponent` (env-type + equipment pickers in the form, per
  divergence #4), `app-selection-bar` (bulk edit/delete), `app-empty-state`. **No `list-shell` /
  `carousel-header` here** — Venues never adopted that chassis; it's its own card-grid layout, unlike
  Inventory/Recipe Book/Suppliers/Equipment (rows 2–5).
- Design source: `.interface-design/source/Venues.dc.html` (278 lines, card-grid list) +
  `.interface-design/source/VenueDetail.dc.html` (243 lines, detail page). Per §7 these count as one
  combined session (row 6).

---

## Executive summary — read this first

**1. Structurally the biggest gap of any screen so far: the design's Venues list has none of the
app's list-management chrome.** No search box, no environment-type filters, no bulk-select/bulk-edit,
no result count. It is a plain card grid of an `<a>`-wrapped card each, full stop. All of that chrome
is real, load-bearing app functionality (Inventory 1) with **zero design counterpart to restyle
against** — same class of finding as Equipment's page-level tab nav, just larger in scope here. Do
not remove any of it; there's simply nothing in Inventory 3 for those rows.

**2. Three real data-model gaps, all classed `deferred` — the design shows content the app's
`VenueProfile` model has no field for at all:** an active/inactive status pill (list card corner +
detail hero), a per-venue photo (`image-slot` on both screens), and a venue↔menu association (list
card's "N תפריטים משויכים" badge + the detail page's entire "תפריטים משויכים" card with real linked-menu
rows). The first two are simple potential schema additions; the third needs an actual new relationship
between `VenueProfile` and the menu entity — the largest of the three, comparable in shape to
Equipment's scaling-column finding but structurally bigger since no computed value exists to surface,
the relationship itself doesn't exist yet. **Flagging, not building** — §10 stop condition.

**3. `environment_type_` — real, core app data — never appears anywhere in the design source.**
Both screens show it today (list card meta chip, detail hero chip) with no design equivalent to
match or diverge from. Not a gap to close in either direction; listed for completeness only.

**4. The Add-venue flow repeats the Equipment/Suppliers precedent exactly, already resolved — not
re-litigating.** Design's modal (`Venues.dc.html:164-188`) has 3 fields (name/address/capacity); the
real form (`venue-form.component`) is a full routed page reused for add and edit, with 7 direct
fields plus two dynamic arrays (`available_infrastructure_`, `operating_hours_`). Same shape, same
answer as the last two sessions: keep the routed form, do not rebuild toward the design's small modal.

**5. Where this screen's visual tokens land is otherwise the closest fit to the design of any
screen yet — surfaces, spacing tokens, radii, and shadows are almost all identical values already,
just not always through the same engine class.** `.venue-card` already extends `.c-glass-card`, whose
hover-lift rule (`styles.scss:273-288`) is a **byte-exact match** to the design's own `.venue-card:hover`
rule (`Venues.dc.html:25-26`). The detail page's cards already use `.c-glass-panel`. The real work here
is layout/structure (container max-width, grid gap/minmax values, card internal order, detail-card
order and header treatment) rather than token substitution — see Inventory 3.

---

## Inventory 1 — Old functionality (do-not-touch)

### `venues.page.ts` — shell/nav wrapper
| item | file:line | what it does |
|---|---|---|
| `isListRoute_` (`toSignal` over router events) | `:23-29` | drives whether the back-nav strip (`venues-nav`) renders at all — hidden on `/venues/list`, shown on add/edit/view |
| `navRoutes_` (`signal`) | `:19-21` | static one-entry nav list ("add_venue") rendered as a pill alongside the back-to-list button |
| `goBackToList()` | `:31-33` | navigates to `/venues/list` |

No design counterpart at all — this nav strip is real app-only chrome layered above whichever child
route renders. Nothing in `Venues.dc.html`/`VenueDetail.dc.html` shows an equivalent secondary nav
bar (each design screen has its own single, independent back-link instead — see Inventory 3).

### `venue-list.component.ts` — signals / computed
| item | file:line | what it holds |
|---|---|---|
| `searchQuery_` (`signal`) | `:58` | free-text search — filters by `name_hebrew` or `environment_type_` |
| `deletingId_` (`signal`) | `:59` | per-card delete-in-flight spinner target |
| `selectedEnvTypes_` (`signal<Set<EnvironmentType>>`) | `:60` | multi-select environment filter |
| `selection` (`new ListSelectionState()`) | `:61` | card multi-select for bulk actions |
| `editableFields_` (`computed`) | `:65-72` | bulk-edit def: `environment_type_` only |
| `resultCountText_` (`computed`) | `:75-80` | "N מתוך M פריטים" — **no design counterpart**, design has no result count anywhere |
| `hasActiveFilters_` (`computed`) | `:109` | drives the "clear filters" button |
| `filteredVenueIds_` / `filteredVenues_` (`computed`) | `:116-137` | search→env-filter→alphabetical-sort (`localeCompare('he')`) pipeline |
| `embeddedInDashboard` (plain `@Input`-style class field via `inputs: ['embeddedInDashboard']`) | `:41,55` | when true: skips `useListState` URL-param wiring, and `onAddPlace` emits `addVenueClick` instead of navigating |

No `computed` signal for loading state exists (see Empty/loading/error states below). No `linkedSignal`,
no `model()`.

### `venue-list.component.ts` — inject() services
| service | file:line | used for |
|---|---|---|
| `VenueDataService` | `:44` | `allVenues_()`, `updateVenue()`, `deleteVenue()` |
| `Router` | `:45` | navigation (edit/view/add/back-to-dashboard) |
| `HeroFabService` | `:46` | "add_venue" page action registered in `ngOnInit`, cleared in `ngOnDestroy` |
| `UserService` (`isLoggedIn`) | `:47` | gates Add/Edit/Delete when logged out |
| `RequireAuthService` | `:48` | `requireAuth()` gate on add/delete/bulk-delete |
| `UserMsgService` | `:49` | injected, no direct call site in this component today (available for future error surfacing) |
| `TranslationService` | `:50` | `resultCountText_` interpolation |
| `LoggingService` | `:51` | structured error logs on delete failure |
| `ConfirmModalService` | `:52` | delete / bulk-delete confirms (shared, cross-screen) |

### Keyboard / focus guards
`(keydown.enter)` / `(keydown.space)` with `role="button"` `tabindex="0"` on each card
(`venue-list.component.html:77-83`) — `onCardActivate()` mirrors `onRowClick()`'s nested-interactive-
element guard (skip navigate/select if the event target is inside a button/link/checkbox) — do-not-touch,
same pattern as Equipment/Inventory row-activation.

### scrollIntoView
None under `venues/` (grep-confirmed against `src/app`).

### Deep-link query params (`useListState('venues', …)`, `venue-list.component.ts:83-88`)
| param | signal | serializer |
|---|---|---|
| `q` | `searchQuery_` | `StringParam` |
| `envTypes` | `selectedEnvTypes_` | `StringSetParam` |

**Only wired when `!embeddedInDashboard`** — the Dashboard-tab instance never touches the URL, so two
mount points of this same component can coexist (standalone route vs. dashboard tab) without fighting
over query params. Same duality shape as Equipment's two-route mount, just via an `@Input` gate
instead of route-context detection.

### `embeddedInDashboard` duality (real, load-bearing)
Both `venue-list.component` and `venue-form.component` render two ways: standalone at `/venues/*`, and
embedded inside `dashboard.page.html:11,13` as tabs (`app-venue-list [embeddedInDashboard]="true"
(addVenueClick)="setTab('add-venue')"`, `app-venue-form [embeddedInDashboard]="true" (saved)=…
(cancel)=…`). The embedded mode changes **behavior only** (no URL persistence, add/cancel/save emit
outputs instead of navigating) — it does **not** hide any of the list's own header chrome (back-to-
dashboard button, title, search, filters all still render identically when embedded). Not a bug to
fix; do not add a conditional to hide chrome in embedded mode unless explicitly asked.

### `venue-detail.component.ts`
| item | file:line | what it does |
|---|---|---|
| `routeData_` (`toSignal(route.data, {initialValue:…})`) | `:23` | reactive, not snapshot — re-resolves on `/venues/view/:id → /venues/view/:otherId` param-only navigation, comment explicitly documents why |
| `venue_` (`computed`) | `:27` | resolved venue or `null` |
| `backToList()` / `onEdit()` | `:29-36` | navigate to list / to `/venues/edit/:id` |

### Empty / loading / error / disabled / permission states
| item | file:line | condition | renders |
|---|---|---|---|
| List empty | `venue-list.component.html:73-75` | `filteredVenues_().length === 0` | plain `no_venues_match` text, no icon/CTA — same minimal shape as Equipment's empty state, unlike Inventory's `app-empty-state` |
| Detail not-found | `venue-detail.component.html:93-95` | `venue_()` falsy | `app-empty-state messageKey="venue_not_found" icon="map-pin"` |
| Disabled/permission | `venue-list.component.html:34-35,122-123,135-136`; `venue-detail.component.html:12-13` | `!isLoggedIn()` | Add/Edit/Delete buttons disabled + `title="sign_in_to_use"` |
| No loading state | — | — | no list-load skeleton exists today (design shows one on both screens — Inventory 2) |
| No error state | — | — | no retry-on-failure block exists today (design shows one on both screens — Inventory 2) |
| RTL | `venue-list.component.html:1`, `venue-detail.component.html:1`, `venue-form.component.html:1` all set `dir="rtl"` explicitly | always | — |

### `venue-form.component.ts` — routed add/edit page, shared by two routes and two embeddings
Reactive form (`name_hebrew`, `environment_type_`, `notes_`, `available_infrastructure_` `FormArray`,
`address_`, `capacity_`, `contact_name_`, `contact_phone_`, `operating_hours_` `FormArray`) hydrated
from route-resolved data in edit mode (`ts:89-95,121-151`); duplicate-name validation
(`duplicateEntityNameValidator`, `:100-108`); dynamic infra rows resolve equipment names via
`EquipmentDataService` (`:76-83`); dynamic hours rows are free-text `days_`/`time_` pairs, not a
structured day-picker. Post-save/-cancel branches on `embeddedInDashboard()` (`:237,246`) — emit vs.
navigate, same duality as the list component.

---

## Inventory 2 — New functionality from the design (classified)

| # | Interaction | Design ref | Tag | Notes |
|---|---|---|---|---|
| 1 | Card grid, click-through to detail | `Venues.dc.html:134-158` | — | Already built (`onRowClick`/`onCardActivate` → `/venues/view/:id`). Not new. |
| 2 | Add-venue modal (3 fields) | `Venues.dc.html:164-188` | — | Not applicable — real add flow is the full routed form, already built, deliberately differentiated (Executive Summary #4, same precedent as Equipment/Suppliers). Do not rebuild toward the design's modal. |
| 3 | List loading skeleton (6 shimmer rows) | `Venues.dc.html:108-118` | **`deferred`** | No loading signal surfaced by `VenueDataService` today — same reasoning as every prior screen's loading-skeleton row. |
| 4 | List error block + retry | `Venues.dc.html:119-126` | **`deferred`** | No error state exists today. |
| 5 | List empty state (icon + text) | `Venues.dc.html:127-132` | — | App already has a minimal empty state (no icon); see Inventory 3 for the icon gap specifically. |
| 6 | Active/inactive status pill (card corner + detail hero) | `Venues.dc.html:138-141`, `VenueDetail.dc.html:87-90` | — | **Real data-model gap, not classifiable without a Human call** — Executive Summary #2. `VenueProfile` has no `active`/boolean field at all. Not building without explicit approval. |
| 7 | Venue photo (`image-slot`, both screens) | `Venues.dc.html:137`, `VenueDetail.dc.html:83` | — | Same class as #6 — no image field on `VenueProfile`. Needs a call. |
| 8 | "N תפריטים משויכים" card badge + full associated-menus card on detail | `Venues.dc.html:154`, `VenueDetail.dc.html:156-174` | — | Same class as #6/#7 but larger — no venue↔menu relationship exists anywhere in the data model, not just a missing field on `VenueProfile`. Needs a call, most likely the one to defer outright given the scope. |
| 9 | Toast on save | `Venues.dc.html:191-195` | — | Shared toast service (`UserMsgService`, already injected but unused for success toasts here), cross-screen — not this screen's surface to design. |
| 10 | Detail loading skeleton / error retry (hours card) | `VenueDetail.dc.html:127-145` | **`deferred`** | Same reasoning as #3/#4, scoped to the hours card specifically in the design's markup. |
| 11 | Search box | — (app-only) | — | Real app feature, no design counterpart on either screen. Do-not-touch. |
| 12 | Environment-type filter pills + select-all + bulk edit/delete | — (app-only) | — | Real app feature, no design counterpart. Do-not-touch. |
| 13 | Contact-card avatar with initials | `VenueDetail.dc.html:112-118` | — | Presentational only — `contact_name_` already exists and is already rendered as plain text; computing initials and a colored circle is pure display of already-available data, same low-risk shape as Equipment's consumable-chip finding. Flagging as safe-to-build, not building unilaterally without Human sign-off since it's still new markup. |
| 14 | Secondary nav strip (`venues.page.html`) | — (app-only) | — | Real, no design counterpart on either screen (each design screen has its own independent single back-link instead). Nothing to restyle against. |

No row promoted to `specified`. Unlike Dashboard's `scrollIntoView` case, this screen has no
metadata-header-style row that was confirmed both real and design-defined — every genuinely new
design row here either has no data to back it (#6–#8) or is purely presentational and still gated on
a Human "go" (#13).

---

## Inventory 3 — Visual spec (design value vs. current app value → engine/token)

| Element | Design (exact) | Current app | Maps to | Notes |
|---|---|---|---|---|
| List page container | `max-width: 1200px; margin: 0 auto; padding: var(--space-6) var(--space-6) var(--space-12)` (`Venues.dc.html:95`) | `.venue-grid-container` (`venue-list.component.scss:10-14`): `padding: 1rem 1.5rem`, no `max-width`, no distinct bottom padding | `--space-6`/`--space-12` exist | Real gap: no centering/max-width constraint today, page stretches full width; bottom padding doesn't clear extra space for scroll like the design's `--space-12`. |
| List page title | `font-size: var(--fs-xl); font-weight: var(--fw-bold); letter-spacing: var(--tracking-tight)` (`Venues.dc.html:98`) | `.page-title` (`venue-list.component.scss:26-35`): `font-size: 1.25rem; font-weight: 700; letter-spacing: 0.02em` | `--fs-xl`/`--fw-bold`/`--tracking-tight` | Identical drift shape to Inventory/Equipment's `.page-title` fix — same correction, not yet applied here. |
| List page subtitle | Static muted subtitle text under the title, `font-size: var(--fs-sm); color: var(--color-text-muted)` (`Venues.dc.html:99`) | `.result-count` (`venue-list.component.scss:37-44`) shows dynamic "N מתוך M פריטים" instead — different **content**, not just style | n/a — content mismatch, not a token gap | App's subtitle is functional (live count), design's is a static description. Not a value to match; keep the app's content, only worth noting since it occupies the design's subtitle slot. |
| Card grid | `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-5)` (`Venues.dc.html:24`) | `.venues-grid` (`venue-list.component.scss:102-107`): `repeat(auto-fill, minmax(15rem, 1fr))` (240px) `gap: 1rem` (16px) | `--space-5` (20px) exists; minmax value has no token, it's a literal `280px` in the design | Real, callable value drift: narrower card minimum (240px vs 280px) and tighter gap (16px vs 20px) than the design. |
| Card surface + hover | `background: var(--bg-glass); ...; border-radius: var(--radius-lg); box-shadow: var(--shadow-glass); ...; :hover { transform: translateY(-2px); box-shadow: var(--shadow-hover) }` (`Venues.dc.html:25-26`) | `.venue-card.c-glass-card` (`venue-list.component.html:78`) → `.c-glass-card` (`styles.scss:273-288`) | Already correct, byte-exact | No action — confirmed identical, flagged only to show it was checked. |
| Card media | `image-slot`, 140px tall, top of card, full-bleed | `.venue-card-media` (`venue-list.component.scss:144-155`): icon-only placeholder, `aspect-ratio: 3/1.4`, `margin-block-end: 0.75rem` (not full-bleed — has body padding around it via being inside `.venue-card` which itself has `padding: 1rem`) | n/a — see Inventory 2 #7, no image field | Structural: design's media is edge-to-edge at the card's top; app's is inset within the card's own padding. Moot until/unless #7 is approved (no image to place regardless). |
| Card name | `font-size: var(--fs-md); font-weight: var(--fw-bold)` (`Venues.dc.html:144`) | `.venue-card-name` (`venue-list.component.scss:161-167`): `font-size: 1rem; font-weight: 700` | `--fs-md` = `1rem` already — **value already matches**, just not through the token | Low-priority token-name-only fix; visually identical today. |
| Card address row | `font-size: var(--fs-sm); color: var(--color-text-muted)`, pin icon 13px (`Venues.dc.html:145-148`) | `.venue-card-address` (`venue-list.component.scss:169-182`): `font-size: var(--fs-sm)`, icon 14px | Already correct (1px icon-size difference, negligible) | No action needed. |
| Card meta row divider | `padding-top: var(--space-3); border-top: 1px dashed var(--border-default)` before the capacity/menu-count row (`Venues.dc.html:149`) | `.venue-card-meta` (`venue-list.component.scss:184-190`) has no divider/border at all before it | `--space-3`/`--border-default` exist | Real gap — app's env-chip/capacity/infra-count row runs directly under the address with no separating rule. |
| Card meta content | Design's bottom row is just capacity (users icon, `--fs-xs`) + menu-count label (`--fs-xs`, `--color-primary-hover`, bold) — **no environment-type chip anywhere on the card** | App's `.venue-card-meta` shows env-chip + capacity + infra-count — three items, different set entirely | n/a — see Executive Summary #3, real app data with no design equivalent | Not a gap to close; env-chip and infra-count have nothing to map to. Capacity icon/sizing already close to design's value (`--fs-xs` used correctly in `.venue-capacity`/`.venue-infra-count`, `styles.scss` confirms `.venue-card-meta` uses `0.75rem` literal = same value as `--fs-xs`). |
| Card action row (edit/delete buttons) | No equivalent — design's whole card is a plain link, all actions live on the detail page | `.venue-card-actions` (`venue-list.component.scss:215-224`): bordered footer row with edit/delete icon buttons | n/a | Real app-only functionality (power-user shortcut), no design counterpart, not to be removed. |
| Detail back-link | Plain text link + arrow icon, `font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text-secondary)`, no button chrome (`VenueDetail.dc.html:77`) | `.c-btn-ghost--sm` (`venue-detail.component.html:4`) — has button chrome (padding, hover background) | `--fs-sm`/`--fw-semibold`/`--color-text-secondary` exist if this were changed to a bare link | Real but low-priority styling difference; app's version is a proper button (larger tap target, consistent with the rest of the app's back-nav pattern elsewhere) — flagging, not necessarily recommending the change. |
| Detail hero wrapper | Plain grid directly on the page background, no card chrome (`VenueDetail.dc.html:82`) | `.detail-hero.c-glass-panel` (`venue-detail.component.html:20`) — wrapped in a glass panel | n/a | Real structural difference: app wraps the hero in a card the design doesn't have. Not necessarily wrong (visually distinguishes the hero); flagging per §6's "cover every element" requirement. |
| Detail hero media | `image-slot`, rounded, 260px × 200px (`VenueDetail.dc.html:82-83`) | `.detail-hero-media` (`venue-detail.component.scss:34-46`): `8rem × 8rem` square, icon-only | n/a — see Inventory 2 #7 | Moot until/unless the photo gap is approved; sizing/shape would also need to change together with it. |
| Detail venue name | `font-size: var(--fs-2xl); font-weight: var(--fw-bold); letter-spacing: var(--tracking-tight)` (`VenueDetail.dc.html:86`) | `.venue-name` (`venue-detail.component.scss:57-63`): `font-size: 1.375rem` (22px), `font-weight: 700`, no letter-spacing | `--fs-2xl` = `1.75rem` (28px), `--tracking-tight` exist | Real value gap — app's heading is noticeably smaller (22px vs 28px) and missing the tight tracking. |
| Detail status badge | Inline pill next to the name, active/inactive (`VenueDetail.dc.html:87-90`) | Not present at all | n/a — see Inventory 2 #6 | Needs a call before any code. |
| Detail stats row | Two stats: capacity + "תפריטים משויכים" (menu count), `--fs-lg`/`--fw-bold` value, `--fs-xs`/muted label (`VenueDetail.dc.html:96-105`) | `.detail-stats` (`venue-detail.component.scss:76-99`): infrastructure-item count + capacity, same type-scale tokens already (`1.125rem`≈`--fs-lg`, `0.75rem`=`--fs-xs`) | Type scale already correct; **content** differs (infra-count vs menu-count) | Second stat can't match the design without #8's data relationship. Capacity stat itself is already positioned/styled equivalently. |
| Detail env-type chip | Not present in the design at all | `.venue-env-chip` (`venue-detail.component.scss:101-113`) | n/a | Same as Executive Summary #3 — real data, no design row to compare against. |
| Detail two-card row order | Contact card first (start side), hours card second, in a `1fr 1fr` grid (`VenueDetail.dc.html:109-154`) | `.detail-cards` (`venue-detail.component.html:46-83`): hours card first in DOM, contact card second — reversed | n/a — pure markup order | Real, low-risk fix: swap the two `<section>` blocks' DOM order to match. |
| Detail card surface | `background: var(--bg-glass)` (not `-strong`), `border: var(--border-glass)`, `box-shadow: var(--shadow-glass)` (`VenueDetail.dc.html:110,125,156` — all three cards identical) | `.detail-card.c-glass-panel` → `.c-glass-panel` (`styles.scss:291-298`): `background: var(--bg-glass-strong)` | Both `--bg-glass` (0.55 alpha) and `--bg-glass-strong` (0.72 alpha) exist as real, different values | **Needs a call**: design's cards use the lighter, more transparent surface everywhere on this screen (list cards use the same lighter feel via `.c-glass-card`'s own `--bg-glass`). Switching `.detail-card` off `.c-glass-panel` onto plain `--bg-glass` would match exactly but breaks from the app's established "detail-page card = `.c-glass-panel`" convention used elsewhere (e.g. Equipment doesn't have a detail page, but the modal/panel family generally reaches for `-strong`). Recommend a decision, not a default. |
| Detail card header | Bare `h2`, no icon, `font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text-muted)` (`VenueDetail.dc.html:111,126,157`) | `.detail-card-header` (`venue-detail.component.scss:126-145`): icon + `h2`, `font-size: 1rem; font-weight: 700; color: var(--color-text-main)` | `--fs-sm`/`--fw-semibold`/`--color-text-muted` exist | Real value gap on type-scale/color, plus the app adds icons (`calendar-clock`/`phone`) the design's headers don't have. The icons are a deliberate app enhancement (readability at a glance) — flagging both the token drift (recommend fixing) and the icon addition (recommend keeping, note only). |
| Hours row divider | `border-bottom: 1px dashed var(--border-default)` on every row, no `:last-child` exclusion (`VenueDetail.dc.html:148`) | `.hours-row` (`venue-detail.component.scss:158-172`): `border-block-end: 1px solid var(--border-default)`, removed on `:last-child` | `--border-default` exists; dash style has no token, it's a literal `dashed` in the design | Real style gap — solid vs. dashed, and the app additionally drops the border on the last row where the design keeps it. |
| Contact card content | Avatar circle (36px, `--color-primary-soft` bg, `--color-primary-hover` text, initials) + name + role label "אחראי אתר" + phone row (`VenueDetail.dc.html:112-122`) | `.contact-name`/`.contact-phone` (`venue-detail.component.scss:183-199`): plain text only, no avatar, no role label | `--color-primary-soft`/`--color-primary-hover` exist | Real, low-risk presentational gap — see Inventory 2 #13. `contact_name_` already exists; initials are a pure display computation. |
| Menus-associated card | Full-width card, header + either a list of linked menus (name/date/guest-count/chevron) or an empty-text fallback (`VenueDetail.dc.html:156-174`) | Not present at all | n/a — see Inventory 2 #8 | Largest of the three data gaps; needs a call, most likely deferred outright given no underlying relationship exists. |

---

## Unmapped — needs a Human call

Every value here already resolves to an existing token; nothing is a true "doesn't exist" gap.

1. **Active/inactive status** (list card + detail hero) — add a real `active_`/boolean field to
   `VenueProfile` and build the pill, or leave unbuilt? Recommend leaving unbuilt for this session;
   it's a schema change, not a restyle, same as Equipment's scaling column was flagged rather than
   built unilaterally.
2. **Venue photo** (`image-slot` on both screens) — add an image field, or leave the current icon
   placeholder? Recommend leaving as-is for the same reason as #1.
3. **Venue↔menu association** (list badge + detail's whole "menus associated" card) — build the
   relationship (real schema/service work, largest item in this spec), or defer entirely? Recommend
   deferring outright — this is the one item in this session closest to "needs its own plan", not a
   same-session yes/no.
4. **Contact-card avatar + initials** — safe to build now (pure presentation of already-computed
   `contact_name_`, low risk, no logic touched)? Recommend yes, same shape as Equipment's consumable-
   chip approval.
5. **Detail-card surface: `--bg-glass` (design-exact) vs. keep `.c-glass-panel`'s `--bg-glass-strong`**
   — match the design's lighter surface on this screen's three detail cards, or keep the app's
   existing detail-card convention? No strong recommendation either way — first time this exact choice
   has come up; flagging cleanly rather than defaulting.
6. `.page-title` fix (list screen) — same correction as Inventory/Equipment's, no reason to expect a
   different answer, but listed for an explicit yes since it's a real code change.
7. Detail venue-name type-scale fix (`--fs-2xl`/`--tracking-tight`) — straightforward token
   correction, listed for an explicit yes.
8. Detail-card header token fix (`--fs-sm`/`--fw-semibold`/`--color-text-muted`) — straightforward
   token correction; recommend **keeping** the app's icons (calendar-clock/phone) alongside the
   corrected type scale rather than removing them to match the design exactly, since they're a
   deliberate readability addition with no functional cost — but this itself is a divergence-from-
   design choice worth an explicit yes.
9. Detail two-card DOM order (contact before hours) — pure markup reorder, low risk, listed for an
   explicit yes since §6 treats any structural change as "ask first" by default.
10. Hours-row divider style (dashed, no `:last-child` exclusion) — straightforward token/value
    correction, listed for an explicit yes.
11. Card-grid minmax/gap value fix (280px/`--space-5` vs. current 240px/1rem) — straightforward value
    correction, listed for an explicit yes.
12. List page container max-width/centering (`1200px` + `--space-12` bottom padding) — real layout
    change (introduces a constrained, centered page for the first time on this screen), listed for an
    explicit yes since it changes how the page reflows at wide viewports.

---

## Stop-condition check (§10)

- Design source missing/uncommitted — no, both `Venues.dc.html` and `VenueDetail.dc.html` read in full.
- Visual value with no token/engine match — no; every Inventory 3 row resolves to an existing token,
  even where the recommendation is "leave as-is" or "needs a call."
- A design row looks `specified` but wasn't confirmed — no; every genuinely new row (#6–#8 in
  Inventory 2) is explicitly gated on a Human call, none silently assumed.
- Design markup requiring deletion/rewrite of existing TS logic — no; every "needs a call" item is
  additive (new field, new markup) or a pure reorder, nothing proposed here deletes a signal, computed,
  injected service, or guard listed in Inventory 1.
- Screen has no design counterpart — no, both `Venues.dc.html` and `VenueDetail.dc.html` exist and
  were read in full.
- About to touch a second screen — no.
- Treating `v1/`/`screenshots/`/reference-only docs as authority — no.

**No stop conditions triggered. Blocked on Human approval per Step 3 — plus explicit answers to the
12 "needs a call" items above before Step 4 touches anything beyond token-only corrections.**

---

## Await approval

Per §6 Step 3: **no code will be written until the Human replies with an explicit validation word.**
The uncontested, token-only fixes (#6, #7, #8's token half, #10, #11, #12) are safe to apply on a bare
"go" — the data-model items (#1–#3) and the two genuine judgment calls (#5, #9, and #8's icon-keeping
half) need their own explicit answers, the default for all of them absent instruction being **no
change** (leave as today), same convention Equipment's spec used for its own "needs a call" section.

---

## Step 4 — Execute (done, 2026-08-30)

Human approved all 12 items, including building #1–#3 in full — for #3 specifically, asked and
confirmed **full round-trip** (a real venue-picker on menu creation, not just the read side).

- **`venue.model.ts`** — added `active_?: boolean` and `photo_url_?: string` to `VenueProfile`. No
  server change needed (generic `VENUE_PROFILES` entity type, schema-less at the Mongo level, same
  pattern as every prior field added under Plan 305).
- **`venue-form.component.ts/.html/.scss`** — added an `active_` checkbox (`form-group--active`,
  defaults `true` for new venues) and a photo-upload square reusing `CloudinaryService` (same pattern
  as `recipe-header.component.ts`'s `onImageSelected`/`imageChange`) with its own `photoUrl_`/
  `uploadingPhoto_` signals; both fields hydrate on edit and serialize on save (add + update paths).
- **`venue-list.component.html/.scss`** — status pill (top-inline-start corner of the card media, to
  land on the physical-right corner the design pins to without colliding with the top-inline-end
  select checkbox), photo (`photo_url_` with icon fallback), `.page-title` → `--fs-xl`/`--fw-bold`/
  `--tracking-tight`, `.venues-grid` → `minmax(17.5rem,1fr)`/`--space-5` gap (280px/20px, design-exact),
  `.venue-grid-container` → `max-width:75rem` centered + `--space-6`/`--space-12` padding, `.venue-card-meta`
  gained the dashed `--space-3`/`--border-default` divider.
- **`venue-detail.component.ts/.html/.scss`** — status badge in the hero title row, hero photo,
  `contactInitials_`/`associatedMenus_` computeds (the latter filters `MenuEventDataService.
  allMenuEvents_()` by `logistics_.venue_profile_id_`, `ngOnInit` calls `menuEventData.ensureLoaded()`),
  `.venue-name` → `--fs-2xl`/`--fw-bold`/`--tracking-tight`, contact/hours `<section>` DOM order
  swapped, `.detail-card` background overridden to `--bg-glass` (component-scoped, `.c-glass-panel`
  engine itself untouched), `.detail-card-header` → `--fs-sm`/`--fw-semibold`/`--color-text-muted`
  (icons kept per the approved recommendation), `.hours-row` divider → dashed, no `:last-child`
  exclusion, contact-card avatar+initials, and a new "associated_menus" card (real linked-menu rows
  when present, `no_associated_menus` empty text otherwise) — kept as an addition alongside the
  existing infrastructure-items stat rather than replacing it (Inventory 1 do-not-touch).
- **New `src/app/shared/venue-link-chip/venue-link-chip.component.{ts,html,scss}`** — the write side
  of #3. Fully self-contained: injects `MenuEventDataService` + `VenueDataService` directly, drives a
  `CustomSelectComponent` (`variant="chip"`) through a local `FormControl`, and calls
  `updateMenuEvent()` itself on selection (defaulting `logistics_.environment_type_` from the chosen
  venue, `resolved_items_: []`). Placed into `menu-intelligence.page.html`'s existing `.event-meta-line`
  (one new line, `[eventId]="editingId_()"` — reads the page's own pre-existing signal) with the
  `class="event-chip-select"` reused from the serving-type chip so the trigger inherits that chip's
  exact `_paper-ui.scss` styling via the same `::ng-deep` rule, no new CSS needed in that file.
  `menu-intelligence.page.ts` (growth-frozen) gained exactly 2 lines — one import, one `imports[]`
  entry — mirroring the existing `RecipeHeaderComponent` precedent in `recipe-builder.page.ts`; no new
  signal, computed, or method was added to the page itself.
- **`dictionary.json`** — added `venue_active`, `venue_inactive`, `venue_photo`, `venue_manager`,
  `associated_menus`, `no_associated_menus`, `select_venue`, `no_venue_selected`.

### Step 5 — Verify

- `ng build` — 0 errors. Only pre-existing warnings remain (the same venue nullish-coalescing ×2,
  bundle budget, cook-view.page.scss budget, exceljs CJS notice already present before this session —
  confirmed unchanged from Equipment's own verification list).
- `ng test --watch=false --browsers=ChromeHeadless` — **311/311 SUCCESS**, no new failures.
- Inventory 1 re-read against current code: every signal/computed/injected-service/deep-link-param/
  guard listed there is still present and untouched; every change this session was additive (new
  fields, new computeds, new markup) except the two approved pure-reorders (detail-card DOM order,
  meta-divider insertion).
- Live browser verification (1280px/390px, actual data round-trip through the new venue-link-chip) is
  the Human's per §6 Step 5 — not attempted here.
