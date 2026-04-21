# Mobile Audit Triage — 2026-04-21

## Summary
- **Total defects:** 95 (per INDEX.md) — 88 catalogued below, 7 in cook-view (malformed report)
- **Critical:** 11 · **Major:** 43 · **Minor:** 41
- **Clusters:** 12
- **Flows with ≥1 defect:** all 16 (cook-view malformed)

---

## Clusters

---

### Cluster 1 — rtl-fab
**Signature:** FAB `.hero-fab-container` uses hardcoded `left: 8px` instead of `inset-inline-end: 8px` — wrong side in every RTL page  
**Severity mix:** critical 2, major 7, minor 3  
**Affected flows:** recipe-builder-new-prep, recipe-builder-new-dish, dashboard, signup, login, recipe-book-list, inventory-add-product, inventory-edit-product, venues-add, menu-intelligence-event  
**Suspect code:**
- `src/app/core/components/hero-fab/hero-fab.component.scss` — primary `.hero-fab-container` positioning
- `src/styles.scss` — check for any `.hero-fab-container` override

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| recipe-builder-new-prep | critical | `.hero-fab-container` | FAB anchored `left:8px` — wrong RTL side; overlaps step/ingredient area | [→](./recipe-builder-new-prep/shots/10b-save-button-bottom-zone.png) |
| recipe-builder-new-dish | critical | `.hero-fab-container` | Same root cause confirmed in dish mode | [→](./recipe-builder-new-dish/shots/08-save.png) |
| dashboard | major | `.hero-fab-container` | FAB at `left:8px`, should be `right:8px` in RTL | [→](./dashboard/shots/01-baseline.png) |
| signup | major | `.hero-fab-container` | FAB overlaps bottom nav post-signup | [→](./signup/shots/06-post-submit.png) |
| inventory-edit-product | major | `.hero-fab-container` | FAB covers price/checkbox of 1st purchase option row | [→](./inventory-edit-product/shots/01-baseline.png) |
| venues-add | major | `.hero-fab-container` | FAB overlaps infra row delete controls | [→](./venues-add/shots/03-infra-20rows.png) |
| menu-intelligence-event | major | `.hero-fab-container` | FAB `cssLeft:8px, cssRight:311px` — wrong RTL side | [→](./menu-intelligence-event/shots/01-baseline.png) |
| inventory-add-product | minor | `.hero-fab-container` | FAB `left:8px` overlaps purchase/allergen content | [→](./inventory-add-product/shots/08-purchase-options.png) |
| login | minor | `button.fab-action` | FAB renders over bottom-left dashboard card post-login | [→](./login/shots/05-post-login.png) |
| recipe-book-list | minor | `button.fab-main` | FAB at `left:8px` — hardcoded physical (LTR-only) | [→](./recipe-book-list/shots/01-baseline.png) |

---

### Cluster 2 — ingredient-grid-mobile
**Signature:** Recipe-builder ingredient/prep-item grid collapses `col-actions`, `col-drag`, and `col-percent` to `display:none` / `0×0` on 375px viewport — affects all recipe builder flows  
**Severity mix:** critical 4, major 1, minor 1  
**Affected flows:** recipe-builder-new-prep, recipe-builder-new-dish, recipe-builder-edit  
**Suspect code:**
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` — grid template / responsive rules for `.col-actions`, `.col-drag`, `.col-percent`
- `src/styles.scss` — any `.col-*` engine classes used by the ingredient grid

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| recipe-builder-new-prep | critical | `.col-actions .ingredient-grid-row` | Ingredient delete button `display:none` — users cannot delete rows | [→](./recipe-builder-new-prep/shots/06-ingredients-20rows.png) |
| recipe-builder-new-prep | critical | `.cdk-drag-handle.col-drag` | Drag handle 0×0 on all ingredient rows — reordering impossible | [→](./recipe-builder-new-prep/shots/06-ingredients-20rows.png) |
| recipe-builder-new-dish | critical | `.col-prep-actions .prep-grid-row` | Prep-item delete `display:none` in dish mode — cannot delete מיזאנפלאס rows | [→](./recipe-builder-new-dish/shots/04-prepitems-5.png) |
| recipe-builder-new-dish | critical | `.cdk-drag-handle.col-drag` (prep row) | Prep-row drag handle 0×0 in dish mode | [→](./recipe-builder-new-dish/shots/05-prepitems-20.png) |
| recipe-builder-new-prep | major | `.col-percent` | Ingredient waste % collapses to 0px — cost-critical data absent | [→](./recipe-builder-new-prep/shots/06-ingredients-20rows.png) |
| recipe-builder-edit | minor | `.cdk-drag-handle.col-drag` vs `col-drag-id` | Asymmetric sizing: step handles 50×28 (usable), ingredient handles 0×0 (broken) | [→](./recipe-builder-edit/shots/03-reorder-attempt.png) |

---

### Cluster 3 — approve-stamp-overflow
**Signature:** `.approve-stamp` fixed element at `right: 367px`, width 56px → clips viewport at 375px by 48px  
**Severity mix:** critical 1  
**Affected flows:** recipe-builder-new-prep (confirmed; recipe-builder-new-dish shows same measurements)  
**Suspect code:**
- `src/app/shared/approve-stamp/approve-stamp.component.scss` — `right: 367px` hardcoded position
- `src/app/shared/approve-stamp/approve-stamp.component.ts` — check if position is computed

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| recipe-builder-new-prep | critical | `.approve-stamp` | Fixed `right:367px`, width 56px — overflows viewport by 48px; partially invisible | [→](./recipe-builder-new-prep/shots/05-ingredients-5rows.png) |

---

### Cluster 4 — bottom-nav-occlusion
**Signature:** Fixed 56px bottom nav has no corresponding `padding-bottom` on scroll containers — content permanently hidden beneath nav bar  
**Severity mix:** critical 2, major 4, minor 2  
**Affected flows:** menu-intelligence-event, venues-add, inventory-add-product, inventory-edit-product, equipment-add, metadata-manager-all-tabs  
**Suspect code:**
- `src/app/pages/menu-intelligence/menu-intelligence.page.html` + page SCSS — `.financial-bar` covered by nav
- `src/app/core/components/header/header.component.scss` — bottom nav height / z-index definition
- Page-level SCSS for each affected flow — missing `padding-bottom: 56px` on scroll container

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| menu-intelligence-event | critical | `.financial-bar` | Financial bar at y=747–812 fully covered by bottom nav (z-index 200 > 100) — cost summary invisible | [→](./menu-intelligence-event/shots/05-financial-bar.png) |
| menu-intelligence-event | critical | scroll container | Bottom nav bisects scrollable content mid-section during scroll | [→](./menu-intelligence-event/shots/06-gemini.png) |
| venues-add | major | infra rows 1–2 | Bottom nav (56px) sits on top of first infra rows during scroll | [→](./venues-add/shots/03-infra-20rows.png) |
| inventory-add-product | major | allergens panel | Allergens expanded content visible clipped at bottom viewport behind nav | [→](./inventory-add-product/shots/06-allergens.png) |
| inventory-add-product | major | `.ng-dropdown-panel` (allergens) | Allergens search dropdown results clipped behind bottom nav | [→](./inventory-add-product/shots/07-allergens-p4.png) |
| equipment-add | major | scaling fields | "לכל אורחים" bottom at y=817, "כמות מקסימלית" at y=901 — below viewport; no scroll affordance | [→](./equipment-add/shots/02b-scaling-revealed.png) |
| inventory-edit-product | minor | save buttons | "עדכן מוצר" / "חזור לרשימה" flush against bottom nav — clips on gesture-nav devices | [→](./inventory-edit-product/shots/04-save.png) |
| metadata-manager-all-tabs | minor | backup/restore section | `padding-bottom: 56px` is 6px short of 62px nav — last content partially obscured | [→](./metadata-manager-all-tabs/shots/06-add-item.png) |

---

### Cluster 5 — sticky-header-safe-zone
**Signature:** Page content wrappers have no `padding-top` to account for the 62px sticky header — page titles and first rows scroll under the header  
**Severity mix:** major 2  
**Affected flows:** dashboard, recipe-book-list  
**Suspect code:**
- `src/app/pages/dashboard/` SCSS — content wrapper `padding-top`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — `.list-container` `padding-top`
- `src/app/core/components/header/header.component.scss` — sticky header height definition (62px)

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| dashboard | major | `app-header` + `app-dashboard-page h1` | h1 scrolls behind sticky nav at scroll≈24px; fully hidden at scroll≈86px | [→](./dashboard/shots/06-scroll-100-header-check.png) |
| recipe-book-list | major | `.list-container` | After 50px scroll, first recipe row enters header area — 26px overlap confirmed | [→](./recipe-book-list/shots/tmp-scroll-under-header.png) |

---

### Cluster 6 — rtl-layout
**Signature:** Components use physical `left`/`right` CSS instead of logical `inset-inline-*` — icons and controls appear on wrong side in RTL  
**Severity mix:** major 4, minor 3  
**Affected flows:** signup, login, recipe-book-list, suppliers-add, venues-add, trash-restore  
**Suspect code:**
- `src/app/core/components/auth-modal/auth-modal.component.scss` — `button.password-toggle` or `.password-toggle` position
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — filter panel close button, search icon position
- `src/app/pages/suppliers/` SCSS — page title padding/margin
- `src/app/pages/venues/` SCSS — "הוסף שורה" icon order
- `src/app/pages/trash/trash.page.scss` — `.trash-item-actions` margin

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| signup | major | `button "הצג סיסמה"` (eye icon) | Password toggle at physical left edge — wrong side in RTL | [→](./signup/shots/03-password-focused.png) |
| login | major | `button.password-toggle` | Eye icon `left:8px` — RTL start is right edge; confirmed `inset-inline-start: 223px` | [→](./login/shots/03-password-focused.png) |
| recipe-book-list | major | filter panel close (×) button | Close button at physical left; trigger at physical right — 263px travel for thumb | [→](./recipe-book-list/shots/02-filters-open.png) |
| recipe-book-list | major | magnifying-glass icon in search field | Icon at inline-start (right) side — should be at inline-end (left) in RTL | [→](./recipe-book-list/shots/03-search-focused.png) |
| suppliers-add | major | page title "הוסף ספק" | Title rect right=375 — zero right-side safe margin; rightmost char clips at viewport edge | [→](./suppliers-add/shots/01-baseline.png) |
| venues-add | minor | "הוסף שורה" button | Plus (+) icon at physical left of Hebrew label — should trail text in RTL | [→](./venues-add/shots/01-baseline.png) |
| trash-restore | minor | `.trash-item-actions` | Start gap 34px, end gap 12px — asymmetric in RTL (start/end swapped) | — |

---

### Cluster 7 — input-overflow
**Signature:** Input fields clip or collapse content — either `overflow: clip` on recipe name inputs, or inputs rendered at 30px width in RTL context  
**Severity mix:** major 4, minor 3  
**Affected flows:** recipe-builder-new-prep, recipe-builder-new-dish, recipe-builder-edit, inventory-add-product  
**Suspect code:**
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` — ingredient search input width (measured 30px)
- `src/app/pages/recipe-builder/recipe-builder.page.scss` or builder template — recipe name input `overflow`, yield vessel search input
- `src/app/pages/inventory/` SCSS — product name input

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| recipe-builder-new-dish | major | `input[placeholder="חפש מוצר או מתכון"]` | Ingredient search text clipped — leading chars hidden behind left edge (RTL overflow) | [→](./recipe-builder-new-dish/shots/09-ingredient-section.png) |
| recipe-builder-new-dish | major | `input[placeholder="חפש הכנה"]` (prep rows) | All prep-item names truncated — icon eats into display area | [→](./recipe-builder-new-dish/shots/04-prepitems-5.png) |
| recipe-builder-edit | major | `input[placeholder="חפש מוצר או מתכון"]` | Ingredient search inputs rendered at 30px wide — unusable | [→](./recipe-builder-edit/shots/02-added-ingredients.png) |
| recipe-builder-new-prep | major | `input[placeholder="שם המתכון..."]` | Recipe name `overflow:clip` — only tail visible for 40+ char Hebrew text | [→](./recipe-builder-new-prep/shots/02-name-p1.png) |
| recipe-builder-new-dish | minor | `input[placeholder="שם המנה..."]` | Same clip — only trailing portion visible for long dish names | [→](./recipe-builder-new-dish/shots/02-name-filled.png) |
| recipe-builder-new-prep | minor | `input[placeholder="חפש כלי..."]` | Yield vessel search field rendered at 30px — narrower than one Hebrew character | [→](./recipe-builder-new-prep/shots/09-yield.png) |
| inventory-add-product | minor | product name input | 40-char and 80-char Hebrew text shows only tail end — no overflow indicator | [→](./inventory-add-product/shots/02-name-p1.png) |

---

### Cluster 8 — dropdown-z-index
**Signature:** Dropdown panels (ng-select, custom dropdowns): don't dismiss on Escape, don't flip upward at viewport bottom, and allow concurrent open state with no collision guard — one instance causes data integrity risk  
**Severity mix:** critical 1, major 3, minor 4  
**Affected flows:** inventory-edit-product, recipe-builder-new-dish, recipe-builder-new-prep, inventory-add-product, recipe-builder-edit, recipe-book-list  
**Suspect code:**
- `src/styles.scss` — global `.ng-dropdown-panel` / `.c-dropdown` Escape/dismiss logic
- `src/app/pages/inventory/` SCSS + TS — category dropdown close-on-select, flip-up logic
- `src/app/pages/recipe-builder/` SCSS — labels dropdown

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| inventory-edit-product | critical | category dropdown `.ng-dropdown-panel` | Dropdown stays open after selection; second category tag added (implicit multi-select); 3rd purchase-option row inaccessible behind open panel | [→](./inventory-edit-product/shots/03-category-change.png) |
| recipe-builder-new-dish | major | תוויות labels `.ng-dropdown-panel` | Dropdown remains open after Escape; blocks אינדקס מרכיבים section | [→](./recipe-builder-new-dish/shots/07-labels-p4.png) |
| recipe-builder-new-prep | major | תוויות labels dropdown | Dropdown opens over ingredient table — no backdrop or scroll boundary | [→](./recipe-builder-new-prep/shots/08-labels-p4.png) |
| inventory-edit-product | major | category dropdown | List clips at viewport bottom — "הוסף" and last 3 options hidden; no upward-flip | [→](./inventory-edit-product/shots/03-category-change.png) |
| inventory-add-product | minor | category dropdown | Opens downward and covers "יחידה בסיס" input row above | [→](./inventory-add-product/shots/04b-both-dropdowns.png) |
| inventory-add-product | minor | all dropdowns | Escape key unreliable for dismiss (cross-page) | — |
| recipe-builder-edit | minor | yield unit + ingredient unit dropdowns | Two `c-dropdown` elements at Y=702 and Y=767 — ambiguous stacked selection | [→](./recipe-builder-edit/shots/04-yield-unit-p4.png) |
| recipe-book-list | minor | תאריך + סוג filter dropdowns | Both remain expanded simultaneously — combined height pushes remaining filters off-screen | [→](./recipe-book-list/shots/05-two-dropdowns.png) |

---

### Cluster 9 — floating-avatar
**Signature:** User avatar / profile chip detaches from header and floats over form content during scroll — z-index or `position:fixed` mismatch  
**Severity mix:** major 4, minor 1  
**Affected flows:** recipe-builder-new-dish, recipe-builder-new-prep, inventory-edit-product, equipment-add, menu-intelligence-event  
**Suspect code:**
- `src/app/core/components/header/header.component.scss` — avatar z-index / position
- `src/app/core/components/header/header.component.html` — avatar DOM position

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| recipe-builder-new-dish | major | nav avatar badge | "Guest Admin G" detaches from nav bar; floats over recipe header card at y≈300–330 | [→](./recipe-builder-new-dish/shots/04-prepitems-5.png) |
| recipe-builder-new-prep | major | user profile popover | Profile card appears between step 5 and step 6 — overlays step content during scroll | [→](./recipe-builder-new-prep/shots/07-steps-10rows.png) |
| inventory-edit-product | major | fixed header avatar | Header avatar overlaps top edge of 3rd purchase option card at scroll position | [→](./inventory-edit-product/shots/04-save.png) |
| equipment-add | major | "Guest Admin G" chip | Avatar chip renders at y≈290 on top of name field label at mid-scroll | [→](./equipment-add/shots/02b-scaling-revealed.png) |
| menu-intelligence-event | minor | "Guest Admin" chip | Chip overlaps content rows during scroll | [→](./menu-intelligence-event/shots/03-sections.png) |

---

### Cluster 10 — touch-target-size
**Signature:** Action buttons rendered below 44×44px minimum — affects high-stakes actions (delete, restore)  
**Severity mix:** major 3, minor 2  
**Affected flows:** recipe-book-list, trash-restore  
**Suspect code:**
- `src/app/pages/trash/trash.page.scss` — `.btn-item`, `.btn-action` height (measured 30px)
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — row action button width (measured 24px), search wrapper height (measured 39px)

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| trash-restore | major | `.btn-item` ("משחזר", "ממחק לצמיתות", "היסטוריה") | All row action buttons 30px tall — below 44px minimum; "permanent delete" only 30px | — |
| trash-restore | major | `.btn-action.btn-restore`, `.btn-action.btn-dispose` | Section-level action buttons also 30px — same root cause | — |
| recipe-book-list | major | row action buttons (הוסף למועדפים / בישול / מחיקה) | 24×44px — width only 24px; 3 buttons in 80px strip (need 132px for 44px each) | [→](./recipe-book-list/shots/06-row-actions.png) |
| recipe-book-list | minor | `.c-input-wrapper` (search field) | Search wrapper 39px tall — 5px below 44px minimum | [→](./recipe-book-list/shots/03-search-focused.png) |
| suppliers-add | minor | delivery day checkboxes + labels | 7 checkboxes at ~28px tap target — borderline; no overflow but tight | [→](./suppliers-add/shots/01-baseline.png) |

---

### Cluster 11 — modal-viewport-fit
**Signature:** Auth modal backdrop doesn't fully cover viewport and/or lacks focus trap — background content reachable  
**Severity mix:** major 2, minor 1  
**Affected flows:** signup, login  
**Suspect code:**
- `src/app/core/components/auth-modal/auth-modal.component.scss` — backdrop coverage / `min-height`
- `src/styles.scss` — `.c-modal-overlay` (lines 466+), `.c-modal-card` (lines 478+)

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| signup | major | auth modal backdrop | Modal card doesn't fill viewport height — dashboard content visible below; no scroll trap | [→](./signup/shots/01-baseline.png) |
| login | major | `nav[aria-label="main navigation"]` | Background nav not `aria-hidden` when modal open — keyboard/AT users reach background elements | [→](./login/shots/07-modal-overlay-check.png) |
| signup | minor | modal card container | Left (trailing RTL) edge clips at x≈7px — box-shadow and border-radius cropped | [→](./signup/shots/01-baseline.png) |

---

### Cluster 12 — single-flow-bug
**Signature:** Defects unique to one flow with no shared component signature  
**Severity mix:** critical 1, major 9, minor 15  
**Affected flows:** all (various)

**Defects:**

| Flow | Severity | Element | Summary | Screenshot |
|---|---|---|---|---|
| inventory-edit-product | critical | duplicate-name validator | Stale validation "כבר קיים חומר גלם בשם זה" fires on load for existing product (name unchanged) | [→](./inventory-edit-product/shots/03-category-change.png) |
| suppliers-add | major | `<label>min_order</label>` | Raw i18n key `min_order` displayed instead of Hebrew label | [→](./suppliers-add/shots/04-form-filled.png) |
| menu-intelligence-event | major | toolbar / Gemini panel buttons | "פתח סרגל כלים", "בונה מתכונים", "פעולות מהירות" present in ARIA but clicking opens no panel — Gemini generation unreachable on mobile | [→](./menu-intelligence-event/shots/06-gemini.png) |
| metadata-manager-all-tabs | major | `/metadata-manager` route | Route silently redirects to `/dashboard?tab=metadata` with no tab UI shown | [→](./metadata-manager-all-tabs/shots/01-baseline.png) |
| metadata-manager-all-tabs | major | sub-nav buttons | 4 nav buttons (total ~430px) wrap to 2 rows at 375px — no horizontal scroll | [→](./metadata-manager-all-tabs/shots/01-baseline.png) |
| recipe-builder-new-prep | major | `recipe-builder-page` step area | Step textarea too narrow (106px) with 3 action buttons in 100px at ≤4px gaps | [→](./recipe-builder-new-prep/shots/07-steps-10rows.png) |
| recipe-builder-new-dish | major | ingredient search field | Ingredient name search 30px wide — truncates during typing | [→](./recipe-builder-new-dish/shots/09-ingredient-section.png) |
| recipe-builder-edit | major | "הוסף שורה" button | 9 rows added instead of 5 clicks — possible double-trigger (needs manual verification) | [→](./recipe-builder-edit/shots/02-added-ingredients.png) |
| equipment-add | major | scaling fields section | Fields cut off below viewport when scaling enabled — no scroll affordance indicator | [→](./equipment-add/shots/02b-scaling-revealed.png) |
| recipe-builder-new-dish | major | Angular component lifecycle | Form state (21 prep rows, type, name) fully lost on `window.scrollTo(0,0)` — fragile lifecycle | — |
| login | minor | `input[aria-label="שם משתמש"]` | Undisclosed 20-char max revealed only on submit error — no inline hint | [→](./login/shots/05-post-login-attempt.png) |
| dashboard | minor | stat cards grid | "סה"כ מתכונים/מנות" wraps to 2 lines — metric numbers at inconsistent vertical offsets | [→](./dashboard/shots/01-baseline.png) |
| dashboard | minor | FAB bottom clearance | FAB `bottom:68px` — only 12px gap above bottom nav; collapses to 0 below 768px | [→](./dashboard/shots/01-baseline.png) |
| recipe-builder-new-prep | minor | image upload | Camera icon only — no "העלה תמונה" text label on mobile | [→](./recipe-builder-new-prep/shots/04-image-upload.png) |
| recipe-builder-new-prep | minor | save button depth | Save button accessible but at 3292px scroll depth — no sticky CTA | [→](./recipe-builder-new-prep/shots/10-save-button.png) |
| inventory-edit-product | minor | "הוסף יחידת רכש" vs "הוסף אפשרות רכישה" | Button label inconsistency between edit and add-product forms | — |
| equipment-add | minor | max-qty + min-qty labels | Label-to-input pairing appears reversed in RTL column layout | [→](./equipment-add/shots/04-save.png) |
| venues-add | minor | "סוג סביבה" field | Free-text input instead of constrained picker — allows invalid values | [→](./venues-add/shots/01-baseline.png) |
| venues-add | minor | capacity field | No capacity field present despite probe spec — field missing or deferred | — |
| menu-intelligence-event | minor | section category buttons | All three "לחץ לבחור קטגוריה" buttons render identically — indistinguishable for AT | — |
| metadata-manager-all-tabs | minor | add-row input container | Input parent spans 178px of 375px viewport — ~60px dead space on right edge | — |
| metadata-manager-all-tabs | minor | 6321px page | No jump navigation / anchor links — users cannot reach a specific section | — |
| metadata-manager-all-tabs | minor | section headings | Each section heading rendered twice in DOM — screen readers double-announce | — |
| trash-restore | minor | success toast | Toast overlaps "אשפה" heading on restore confirm — heading illegible for toast duration | [→](./trash-restore/shots/04-after-confirm.png) |
| trash-restore | minor | confirm modal CTA | "משחזר הכל" (Restore All) shown for single-item restore — contradicts singular framing | — |
| suppliers-add | minor | supplier form | No phone/email/address fields — if intentionally deferred, note for completeness | — |
| signup | minor | dashboard stat cards | Card label wraps cause inconsistent metric-number vertical offset within grid rows | [→](./signup/shots/06-post-submit.png) |

---

## Malformed entries

| Flow | Issue | INDEX counts |
|---|---|---|
| cook-view | `report.md` is an empty stub — only the header and blank `## Defects` section exist. 7 defects (1 Critical, 3 Major, 3 Minor) shown in INDEX.md are unclassified. Re-run `/mobile-flow-audit --only cook-view` to regenerate before planning. | C:1 · M:3 · Mi:3 |

---

## Deferred / Won't-fix

| Cluster | Defects | Reason |
|---|---|---|
| approve-stamp-overflow | rbnp/C3 | Code shows `right: 0.5rem` (correct). recipe-builder-edit confirms "not clipping (8px margin)". new-prep audit finding likely a bounding-rect vs CSS-property measurement confusion. **Defer — re-run `/mobile-flow-audit --only recipe-builder-new-prep` to verify before planning.** |
| floating-avatar | rbnd/DM1, rbnp/M4, iep/DEF-IE-04, ea/MAJ-2, mie/m1 | Root cause unclear — may be resolved once sticky-header-safe-zone (plan 279) ships. **Defer until plan 279 verified.** |
| modal-viewport-fit | signup/M1, login/DEF-L02, signup/m1 | auth-modal SCSS already uses correct logical properties. Need real-device browser re-verification. **Defer pending re-audit.** |
| single-flow-bug — minors (15 items) | All minor single-flow defects | Spread across >10 files; all minor severity. **Defer — low ROI.** |
| single-flow-bug — mie/M2 (Gemini panel) | mie/M2 | Likely Angular interaction/JS bug beyond CSS scope. Requires larger investigation. **Defer.** |
| single-flow-bug — mm/M1, mm/M2 (metadata redirect) | mm/M1, mm/M2 | Angular routing / nav architecture issue. Requires separate plan. **Defer.** |
| single-flow-bug — rbnd/Dm2 (form state lost) | rbnd/Dm2 | Angular lifecycle bug. Requires investigation of component destroy/scroll event. **Defer.** |
| single-flow-bug — rbe/M-02 (excess rows) | rbe/M-02 | Needs manual interactive verification — may be test automation artifact. **Defer pending manual test.** |
| single-flow-bug — rbnp/M3 (step textarea narrow) | rbnp/M3 | Layout improvement, not a breakage. **Defer.** |
| cook-view | 1C + 3M + 3Mi (unknown) | Report.md is a malformed stub. **Re-run `/mobile-flow-audit --only cook-view` before planning.** |

---

## Plan mapping

| Cluster | Plan |
|---|---|
| rtl-fab | [plans/276-mobile-audit-rtl-fab.plan.md](../../plans/276-mobile-audit-rtl-fab.plan.md) |
| ingredient-grid-mobile | [plans/277-mobile-audit-ingredient-grid-mobile.plan.md](../../plans/277-mobile-audit-ingredient-grid-mobile.plan.md) |
| bottom-nav-occlusion | [plans/278-mobile-audit-bottom-nav-occlusion.plan.md](../../plans/278-mobile-audit-bottom-nav-occlusion.plan.md) |
| sticky-header-safe-zone | [plans/279-mobile-audit-sticky-header-safe-zone.plan.md](../../plans/279-mobile-audit-sticky-header-safe-zone.plan.md) |
| rtl-layout | [plans/280-mobile-audit-rtl-layout.plan.md](../../plans/280-mobile-audit-rtl-layout.plan.md) |
| input-overflow | [plans/281-mobile-audit-input-overflow.plan.md](../../plans/281-mobile-audit-input-overflow.plan.md) |
| dropdown-z-index | [plans/282-mobile-audit-dropdown-z-index.plan.md](../../plans/282-mobile-audit-dropdown-z-index.plan.md) |
| touch-target-size | [plans/283-mobile-audit-touch-target-size.plan.md](../../plans/283-mobile-audit-touch-target-size.plan.md) |
| approve-stamp-overflow | deferred — see above |
| floating-avatar | deferred — pending plan 279 |
| modal-viewport-fit | deferred — pending re-audit |
| single-flow-bug | partial — DEF-IE-02 folded into plan 282; majors/minors deferred above |
