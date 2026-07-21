# Sidebar (Filter Panel) Audit

**Scope note:** the app has no persistent left-nav rail. The only "sidebar" is the
per-list **filter panel** (`<aside class="filter-panel">` in
[list-shell.component.html](../../src/app/shared/list-shell/list-shell.component.html)),
used by 5 pages: Inventory, Recipe Book, Venues, Suppliers, Equipment.
Menu Library has no filter panel at all (inline dropdowns instead).
Styling lives in one shared file
([list-shell.component.scss](../../src/app/shared/list-shell/list-shell.component.scss)),
so visual styling is *already* unified across the 5 pages — the bugs are in
per-page open/close **logic**, not in duplicated CSS. Separately, the top
header's mobile hamburger drawer ([header.component.ts](../../src/app/core/components/header/header.component.ts))
is a different component with its own breakpoints; it behaves correctly
(starts closed, has a close button) but uses different breakpoints than the
filter panel — see §3.

## 1. Logic bugs (open/closed state)

| # | File | Issue |
|---|------|-------|
| 1 | [panel-preference.util.ts:10](../../src/app/core/utils/panel-preference.util.ts#L10) | `getPanelOpen()` returns `false` when nothing is saved, but its own doc comment says it "defaults to true ... so lists start with the filter panel open." Code and comment contradict — first-time desktop users get a **closed** panel, not open. |
| 2 | venue-list, supplier-list, equipment-list (`.ts`, ~L100/L110/L91) | The `matchMedia('(max-width: 768px)')` listener only reacts to the `change` event (a resize crossing the breakpoint). It never checks `q.matches` on initial load. **Inventory and Recipe Book do check it** (`if (q.matches) this.isPanelOpen_.set(false)`); Venues/Suppliers/Equipment don't. Result: if a user last had the panel open on desktop (saved in `localStorage`), then opens Venues/Suppliers/Equipment fresh on a phone, the panel renders **open over the full mobile viewport** with no auto-close — this is almost certainly the "opens by default on mobile" symptom reported. |
| 3 | [venue-list.component.ts:101](../../src/app/pages/venues/components/venue-list/venue-list.component.ts#L101) | Missing the `typeof window === 'undefined'` SSR guard that Suppliers/Equipment/Recipe Book all have before calling `window.matchMedia`. Inconsistent, and a latent SSR crash risk if this app ever prerenders. |
| 4 | All 5 pages | The resize listener only closes the panel when crossing *into* mobile width; there's no symmetric branch to restore it when crossing back to desktop. Once auto-closed by a resize, the in-memory state also silently diverges from whatever is in `localStorage` (the forced close is never persisted via `setPanelOpen`). Minor, but makes the "remembered" state unreliable within a session. |
| 5 | All 5 pages | `isPanelOpen_` is declared `signal(true)` (or `signal(false)` for gettPanelOpen-inited case in Inventory) and then overwritten synchronously in the constructor with the real value. Not a visible bug (constructor runs pre-render), but it's dead/misleading initial state and an inconsistent pattern — Inventory initializes directly from `getPanelOpen()`, the other four init to a literal then immediately overwrite. Worth normalizing to one pattern.

**Net effect:** desktop "start open/closed" and mobile "always start closed" are each handled by 2 different, copy-pasted implementations across 5 near-identical files, with no shared source of truth for "what should the initial state be for this viewport" — that's why behavior differs page to page.

## 2. Close affordance (mobile)

The close button (`panel-toggle-icon`, "Close filters") **does exist** and is forced visible on touch/overlay breakpoints (`@media (hover: none)` / ≤1024px rule sets `opacity: 1`) — it's not literally missing. The real mobile complaint is almost certainly bug #2 above: the panel opens on load with no state for the user to have caused, which reads as "no way to close it" because the confusion is about *why it's open*, not that the X is absent. Recommend re-verifying on a real phone after fixing #2 before assuming a second, separate close-button defect exists.

## 3. Breakpoints — not unified

Three different breakpoint sets are in play for what should be one responsive system:

| Source | Values |
|---|---|
| Global tokens ([styles.scss:4-6](../../src/styles.scss#L4-L6)) | `$break-mobile: 768px`, `$break-tablet: 900px`, `$break-desktop: 1200px` |
| Filter panel ([list-shell.component.scss:3-6](../../src/app/shared/list-shell/list-shell.component.scss#L3-L6)) | local `$panel-overlay-break: 1024px`, `$phone-break: 768px` (own vars, not the global ones) |
| Top header nav ([header.component.scss](../../src/app/core/components/header/header.component.scss)) | hardcoded `620px` (mobile) / `768–1023px` (tablet) / desktop implicit ≥1024 |
| JS media query (all 5 list pages) | hardcoded `'(max-width: 768px)'` |

Consequence: between **621–768px**, the top nav is already in mobile mode
(bottom tab bar + FAB) while the filter panel is still in "tablet drawer"
mode, not phone-drawer mode — two different chrome systems disagree about
what "mobile" means at the same viewport width. None of the three
components consume the shared `$break-mobile/tablet/desktop` tokens that
already exist in `styles.scss`; each hardcodes its own numbers.

## 4. Real-world pattern comparison

How this pattern is conventionally handled (Gmail, Notion, Linear, Slack, admin dashboards):

- **Desktop (≥ tablet-desktop threshold):** persistent panel, user-collapsible, choice remembered per device — but the *default* for a first-time user is typically **open** (discoverability) unless the product deliberately favors a content-first layout. Your team's ask here is the opposite (default closed on desktop) — that's a valid, common alternative for data-dense list screens where the table is the primary content and filters are secondary; just note it's a deliberate reversal of #1's original doc-comment intent, not a bug fix, so decide it explicitly rather than leaving it to whichever behavior the localStorage bug happens to produce.
- **Tablet:** either same as desktop (if width allows) or becomes an overlay drawer — never bridges two different "mobile-ness" definitions like §3 does.
- **Mobile:** always an overlay/drawer, **always starts closed on load regardless of any remembered desktop preference**, opened only by explicit user action (menu/filter button), closed via a visible X, tap-outside backdrop, and (ideally) swipe — this app already has backdrop-click and swipe-to-close wired in `list-shell.component.ts`, so it's aligned here once bug #2 is fixed.
- **State scope:** "open/closed" preference should be viewport-aware at the point of restore, not a single boolean blindly replayed on every breakpoint. i.e. persist per-breakpoint-class (desktop vs. mobile), not one flag for all screen sizes.

## 5. Fix list (priority order)

1. Fix `getPanelOpen()` default vs. its doc comment — pick one behavior and make code match intent (§1).
2. Add the missing initial `if (q.matches) isPanelOpen_.set(false)` check to Venues, Suppliers, Equipment (§1, bug #2) — this is the highest-impact fix for the reported mobile symptom.
3. Add the missing SSR guard to `venue-list.component.ts` (§1, bug #3).
4. Extract the repeated "read saved pref → force-closed on mobile on load → listen for breakpoint crossings" logic out of the 5 copy-pasted constructors into one shared helper/directive (e.g. extend `panel-preference.util.ts` with a `useResponsivePanelState()` that all 5 pages call) — removes the drift that caused bugs #1–#5.
5. Unify breakpoints: make `list-shell.component.scss` and `header.component.scss` consume `$break-mobile / $break-tablet / $break-desktop` from `styles.scss` instead of local/hardcoded numbers (§3).
6. Decide and document the desktop default (open vs. closed) explicitly — currently accidental, not designed (§4).
