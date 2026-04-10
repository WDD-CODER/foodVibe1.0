# FoodVibe Mobile Layout Audit Report
Generated: 2026-04-09
Viewport: 375×812 (iPhone SE / standard mobile)
Direction: RTL (Hebrew)
Auditor: Claude automated browse audit
Session: `.claude/sessions/2026-04-09-mobile-layout-audit`

---

## Summary

| Metric | Count |
|--------|-------|
| Pages audited (public) | 8 |
| Pages audited (auth-required) | 8 |
| Pages skipped (no DB data) | 0 — seeded demo menu via API to enable full coverage |
| Interactive elements tested | 62 |
| **Critical issues** | **2** |
| **Major issues** | **8** |
| **Minor issues** | **3** |

---

## Critical Issues

### 1. `/menu-intelligence` — Financial bar hidden behind bottom nav

- **File:** `src/app/pages/menu-intelligence/menu-intelligence.page.html` + SCSS
- **Problem:** The `.financial-bar` footer is `position:fixed` with `z-index:100`. The `.bottom-nav` is also `position:fixed` with `z-index:200`. Both occupy the same vertical space (financial bar top=747, bottom=812; bottom-nav top=756, bottom=812). The bottom nav renders on top and completely hides the financial bar.
- **Impact:** All financial data — total cost (₪), food cost %, total revenue (₪), cost per guest (₪) — is completely inaccessible on mobile. Users cannot see the primary financial output of the menu editor.
- **Screenshot:** `audit/menu-intelligence-baseline.png`, `audit/menu-intelligence-scrolled.png`
- **Suggested fix:** Add `padding-bottom: 56px` (bottom nav height) to `.financial-bar`'s `bottom` offset, or increase `.financial-bar` z-index above 200, or reposition the financial bar above the bottom nav using `bottom: 56px` instead of `bottom: 0`.

---

### 2. `/dashboard?tab=trash` and `/trash` — Translation keys not resolving

- **File:** `src/app/pages/trash/trash.page.ts` (translation keys `general.refresh`, `general.refresh_again`)
- **Problem:** The "Refresh" and "Try again" buttons display raw i18n keys (`general.refresh`, `general.refresh_again`) instead of Hebrew text. These keys use the `general.` namespace prefix which is not matching the translation lookup.
- **Impact:** Users see raw code strings ("general.refresh") instead of actionable button labels when the trash fails to load. Completely breaks the trash error recovery flow.
- **Screenshot:** `audit/dashboard-trash.png`, `audit/trash-baseline.png`
- **Suggested fix:** Check the translation files for the `general` namespace. Either the keys are missing (`general.refresh` not added to `he.json`) or the TransloPipe lookup expects a flat key (e.g., `general_refresh` or `refresh`). Verify against other working keys in the same component.

---

## Major Issues

### 3. All list pages — Filter panel close button below 44px minimum

- **File:** `src/app/shared/list-shell/list-shell.component.html` (`.panel-toggle-icon`)
- **Pages:** `/recipe-book`, `/inventory/list`, `/suppliers/list`, `/venues/list`, `/equipment/list` (all use `app-list-shell`)
- **Problem:** The panel close button (`.panel-toggle-icon`, `lucide-icon circle-x`) is 32×32px. The WCAG and platform minimum touch target is 44×44px. The button is 37.5% below minimum.
- **Screenshot:** `audit/recipe-book-filter-panel-open.png`, `audit/inventory-filter-panel-open.png`, `audit/suppliers-filter-panel-open.png`
- **Suggested fix:** In `list-shell.component.scss`, add `min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center;` to `.panel-toggle-icon`.

---

### 4. All list pages — Filter panel open button below 44px minimum

- **File:** `src/app/shared/list-shell/list-shell.component.html` (`.open-panel-btn`)
- **Pages:** Same as above
- **Problem:** The hamburger filter toggle button (`.open-panel-btn`) is 40×40px — 4px below the 44px minimum.
- **Measurement:** All pages measured as 40×40px.
- **Suggested fix:** Increase to `min-width: 44px; min-height: 44px` in `list-shell.component.scss`.

---

### 5. Empty state i18n keys not resolving

- **Files:** Multiple `app-empty-state` usages
- **Pages/Keys:**
  - `/recipe-book`: `empty_recipe_book`, `add_first_recipe` — raw keys shown
  - `/inventory/list`: `empty_inventory`, `add_first_product` — raw keys shown
  - `/suppliers/list`: `empty_suppliers` — raw key shown
- **Problem:** The `messageKey` and `ctaLabelKey` inputs on `<app-empty-state>` are not being translated. The empty state component receives the key string and renders it directly without passing through the translation pipe.
- **Screenshot:** `audit/recipe-book-baseline.png`, `audit/inventory-baseline.png`, `audit/suppliers-baseline.png`
- **Suggested fix:** In `empty-state.component.html`, ensure `messageKey` is piped through `translatePipe`: `{{ messageKey | translatePipe }}`. Check `src/app/shared/empty-state/empty-state.component.html` — the template likely uses `{{ messageKey }}` without the pipe.

---

### 6. `/menu-library` — Hero FAB overlaps empty-state text

- **File:** `src/app/core/components/hero-fab/hero-fab.component.scss` or shell layout
- **Problem:** The hero FAB button is fixed at left=8, right=64 (56px wide). The empty-state text `<p>` starts at left=56.23px. The FAB's right edge (64px) overlaps the text's left edge (56px) by ~8px. The text starting characters are rendered behind the FAB button.
- **Measurement:** FAB bounds: {top:688, left:8, bottom:744, right:64}. Text bounds: {top:708, left:56, bottom:733}.
- **Screenshot:** `audit/menu-library-baseline.png`
- **Suggested fix:** On pages where the FAB is present and content is centered, add `padding-left: 72px` (FAB width + margin) to center the empty state text visually, or shift the FAB position to not conflict with centered text.

---

### 7. `/recipe-builder` — FAB action button label shows raw i18n key

- **File:** `src/app/core/components/hero-fab/hero-fab.component.html`
- **Problem:** The FAB "recipe_builder" action button displays the raw key `recipe_builder` as its aria-label, rendered as visible text in the accessibility tree and potentially visible in some states. Inconsistent with the rest of the RTL Hebrew UI.
- **Snapshot evidence:** `@e16 [button] "recipe_builder"` in dashboard snapshot (unauthenticated state)
- **Suggested fix:** Verify the `action.labelKey` is being passed through `translatePipe` in the fab-action template, and that `recipe_builder` key exists in the translation file.

---

### 8. `/suppliers/list` — Back button below 44px minimum touch target

- **File:** `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html` (action button in shell-actions)
- **Problem:** The "חזרה ללוח הבקרה" (back to dashboard) button measures 36px height — 18% below the 44px minimum.
- **Measurement:** `{w:132, h:36, top:169}` vs "הוסף ספק" at `{w:127, h:45}`.
- **Screenshot:** `audit/suppliers-baseline.png`
- **Suggested fix:** Apply consistent `min-height: 44px` and `align-items: center` to the back-button style in `supplier-list.component.scss`.

---

### 9. `/venues/list` — Header action buttons inconsistent height

- **File:** `src/app/pages/venues/components/venue-list/venue-list.component.html`
- **Problem:** The two action buttons in the header row have significantly different heights: "הוסף מיקום" is 66px, "חזרה ללוח הבקרה" is 54px. Both buttons are on the same row but are visually misaligned.
- **Measurement:** `{w:123, h:66}` vs `{w:116, h:54}` with tops at 184px vs 190px.
- **Screenshot:** `audit/venues-baseline.png`
- **Suggested fix:** Standardize both buttons in `.header-actions` to the same height using `align-items: center` and `height: 44px` or `min-height: 44px`.

---

### 10. Auth session not persisting across page navigations

- **File:** Auth guard / session management
- **Status: CLOSED — browse-tool artifact, not a real bug**
- **Investigation (2026-04-10):** Code review confirms the auth architecture is correct. `UserService._loadUserFromSession()` reads `sessionStorage['loggedInUser']` synchronously on bootstrap, populating the `_user_` signal before any guard runs. `loginAsGuestBackend()` calls `_saveUserLocal(user)` which sets both the signal and sessionStorage. `authGuard` checks `userService.isLoggedIn()` = `_user_() !== null` — reads from the signal, which is restored from sessionStorage on every page load. The observed re-auth was a headless browse tool artifact: the browser instance restarted between navigations, clearing sessionStorage. No code fix needed.
- **Production auth:** Uses the same `_loadUserFromSession()` path — session persists correctly across Angular router navigations in a real browser.
- **Original observation:** Re-triggering auth modal observed with Guest (Dev) account in headless Chromium — not reproducible in a persistent browser session.

---

## Minor Issues

### 11. `/equipment/list` — Nav tab links 2px below touch target minimum

- **File:** `src/app/pages/equipment/equipment.page.html` (`.nav-link`)
- **Problem:** The "רשימת ציוד" and "הוסף ציוד" nav tab links measure 42px height — 2px below the 44px minimum.
- **Measurement:** `{h:42}` for both links.
- **Screenshot:** `audit/equipment-baseline.png`
- **Suggested fix:** Add `min-height: 44px` to `.nav-link` in `equipment.page.scss`.

---

### 12. All pages — Hero FAB aria-label "Quick actions" in English

- **File:** `src/app/core/components/hero-fab/hero-fab.component.html`
- **Problem:** The FAB main button has a hardcoded English `aria-label="Quick actions"`. In a Hebrew RTL app, screen reader users would hear English in an otherwise Hebrew interface.
- **Suggested fix:** Replace with `[attr.aria-label]="'quick_actions' | translatePipe"` and add the translation key.

---

### 13. `/dashboard/overview` — Activity section scrolls behind bottom nav without bottom padding

- **File:** `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`
- **Problem:** When scrolling the dashboard overview, the "פעילות אחרונה" (Recent Activity) section scrolls correctly, but on some scroll depths the bottom few pixels of the activity list fall below the bottom nav (56px) with no padding buffer.
- **Screenshot:** `audit/dashboard-scrolled.png`
- **Suggested fix:** Add `padding-bottom: 72px` (nav height + buffer) to `.dashboard-main` or `.activity-list-scroll-wrap`.

---

## Pages with No Issues Found

| Page | Notes |
|------|-------|
| `/dashboard` (overview tab) | KPI cards stack correctly, no overflow |
| `/dashboard?tab=metadata` | Metadata manager scrolls correctly |
| `/dashboard?tab=venues` | Venue list embeds cleanly |
| `/cook` (empty state) | CTA button readable, correct contrast |
| Menu intelligence paper layout | Fits within 375px, no overflow |
| Auth modal | Fits within viewport, inputs accessible |
| All pages: horizontal overflow | None detected on any page |
| Bottom nav | Correctly pinned at 756–812px on all pages |

---

## Interactive Elements Tested — Pass/Fail Checklist

| Page | Element | Result | Notes |
|------|---------|--------|-------|
| ALL | Bottom nav (4 links) | PASS | Fixed, visible, links functional |
| ALL | Auth modal | PASS | Fits viewport, inputs usable |
| ALL | Hero FAB main button | PASS | Touch target 56×56, tap expands |
| ALL | Hero FAB action buttons | MINOR | `recipe_builder` key untranslated |
| dashboard | Tab navigation (4 tabs) | PASS | All tabs switch content correctly |
| dashboard | Activity change popover | PASS | Opens, fits viewport |
| dashboard | KPI link buttons | PASS | Functional, adequate size |
| dashboard/trash | Refresh button | FAIL — CRITICAL | Raw i18n key displayed |
| recipe-book | Filter panel toggle | FAIL — MAJOR | 40×40px, below 44px minimum |
| recipe-book | Filter panel close | FAIL — MAJOR | 32×32px, below 44px minimum |
| recipe-book | Filter panel backdrop | PASS | Tap-to-close works |
| recipe-book | Filter category accordion | PASS | Opens/closes correctly |
| recipe-book | Empty state | FAIL — MAJOR | `empty_recipe_book` not translated |
| inventory | Filter panel toggle | FAIL — MAJOR | 40×40px, below 44px minimum |
| inventory | Filter panel close | FAIL — MAJOR | 32×32px, below 44px minimum |
| inventory | Empty state | FAIL — MAJOR | `empty_inventory` not translated |
| inventory | Carousel header | PASS | Column cycling works |
| menu-library | Full page layout | PASS | No overflow |
| menu-library | Empty state text | FAIL — MAJOR | FAB overlaps text (8px) |
| cook | Empty state CTA | PASS | White on teal, readable |
| equipment | Nav tab links | FAIL — MINOR | 42px height, 2px below minimum |
| suppliers | Filter panel | FAIL — MAJOR | Same panel issues as above |
| suppliers | Empty state | FAIL — MAJOR | `empty_suppliers` not translated |
| suppliers | Back button | FAIL — MAJOR | 36px height, below 44px minimum |
| venues | Action buttons | FAIL — MAJOR | Height mismatch (54px vs 66px) |
| recipe-builder | Section collapse/expand | PASS | 56px headers, accessible |
| recipe-builder | Save button | PASS | 351×45px |
| recipe-builder | Approve stamp | MINOR | Fixed at y=688, may obscure mid-page content |
| menu-intelligence | Financial bar | FAIL — CRITICAL | Hidden behind bottom nav (z-index) |
| menu-intelligence | Event type dropdown | PASS | Fits within paper card |
| menu-intelligence | Paper layout | PASS | No overflow |
| trash | Section headers | PASS | Sections display correctly |
| trash | Refresh button | FAIL — CRITICAL | Raw i18n key (same as dashboard/trash) |
| cook/:id | Baseline layout | PASS | Recipe loads correctly, no overflow |
| cook/:id | Export bar expand | PASS | Expands correctly, fits viewport |
| cook/:id | Multiplier chips (×½ ×1 ×2) | PASS | Touch targets adequate, chips respond |
| cook/:id | Step card collapse | PASS | 56px header, accessible |
| cook/:id | Step done button | PASS | 44px+ touch target |
| cook/:id | Timer pill | PASS | Tap starts timer, visible in layout |
| cook/:id | Approve stamp | PASS | Fixed at y=688, consistent with recipe-builder finding |
| inventory/add | Form layout | PASS | All fields visible, no overflow, 44px inputs |
| inventory/add | Auth modal intercept | FAIL — MAJOR | Re-triggers auth on every navigation (Issue #10) |
| inventory/edit/:id | Form layout | PASS | Pre-populated fields visible, no overflow |
| recipe-builder/:id | Edit mode layout | PASS | Same as new recipe, no additional issues |
| suppliers/add | Form layout | PASS | Simple form, fits viewport |
| venues/add | Form layout | PASS | Simple form, fits viewport |
| equipment/add | Form layout | PASS | Fits viewport |
| menu-library | List row layout | PASS | Card fits 375px, financial metrics readable |
| menu-library | Edit/duplicate/delete buttons | PASS | Adequate size, visible |
| menu-intelligence/:id | Edit layout | PASS | Same layout as new menu, no overflow |
| menu-intelligence/:id | Financial bar (edit) | FAIL — CRITICAL | Same z-index overlap as new menu (confirmed on edit route too) |
| All pages | Horizontal overflow | PASS | None detected |

---

## Coverage Notes

All pages fully audited. A demo menu (`demo_menu_001`) was seeded via API to enable coverage of `/menu-library` list rows and `/menu-intelligence/:id`.

---

## Fix Brief Targets (by priority)

1. **Financial bar z-index** — `menu-intelligence.page.scss` → `.financial-bar` z-index or bottom offset
2. **Translation keys (general.* namespace)** — `he.json` or translation namespace config → add `general.refresh`, `general.refresh_again`
3. **Empty state component untranslated** — `src/app/shared/empty-state/empty-state.component.html` → pipe `messageKey` and `ctaLabelKey` through `translatePipe`
4. **Filter panel touch targets** — `src/app/shared/list-shell/list-shell.component.scss` → `.open-panel-btn`, `.panel-toggle-icon` min-height: 44px
5. **FAB overlaps empty text** — `src/app/core/components/hero-fab/hero-fab.component.scss` or shell layout padding
6. **Suppliers back button height** — `supplier-list.component.scss` → back button min-height: 44px
7. **Venues button height mismatch** — `venue-list.component.scss` → align header actions height
8. **Equipment nav link height** — `equipment.page.scss` → `.nav-link` min-height: 44px
9. **Auth session persistence** — `auth.guard.ts` / auth service → verify token storage and read-back
