# New Design Functionality Inventory — Claude Design "foodCo Design System"

## How this was pulled

There is **no `/design-sync` skill installed** in this repo (`.claude/skills/` has no `design-sync`), so the sync was done with the **DesignSync tool** directly against claude.ai/design.

- `list_projects` returned two writable projects: **`foodCo Design System`** (`46ffd0d2-8169-4fb5-ab1c-fb90107539ba`, updated 2026-05-24) and `Baby Tracker` (unrelated).
- `list_files` on the foodCo project returned **58 paths**.
- Files read in full: `README.md`, `SKILL.md`, `ui_kits/foodco-app/README.md`, `app.html`, `screens.js`, `cook.js`, `data.js`, `icons.js`, `GlassComponents.jsx`, `designs/Cook View.html`, `designs/cook-variant.html`, `designs/cook-preview.html`.
- Not read in full (binary or styling-only): `assets/*.png`, `screenshots/*.png` (18 screenshots), `preview/*.html` (19 specimen cards), `colors_and_type.css`, `styles.css`, `cook.css`, `preview/_card.css`, `ui_kits/foodco-app/index.html`.

> **This is not a single flat export.** It is three layers that do not fully agree with each other — see §0.

---

## 0. What actually synced — three layers, and they diverge

### Layer A — Design-system documentation (`README.md`, `SKILL.md`, `colors_and_type.css`, `preview/*`)
A written brand/system spec plus 19 HTML specimen cards. Describes: **Liquid Glass**, teal `#14b8a6` primary, **Heebo** typeface, **Lucide** icons, no emoji, no hero imagery, native `<select>` disallowed.

### Layer B — The app UI kit (`ui_kits/foodco-app/`)
A clickable multi-screen HTML/JS prototype (`app.html` + `screens.js` + `data.js` + `styles.css`), plus a React component file (`GlassComponents.jsx`) and the cook-view re-skin (`cook.js` + `cook.css`).

### Layer C — Cook-view design explorations (`designs/`)
`Cook View.html` is a presentation page (annotated feature cards + an iframe); `cook-preview.html` is an auto-scaling wrapper; `cook-variant.html` is a thin harness that just calls `openCook('r1')`. **All three ultimately render `ui_kits/foodco-app/cook.js`** — so there is exactly one cook-view design, not three.

### Divergences between the layers (flagging, not judging)
| Topic | Layer A says | Layer B does |
|---|---|---|
| Typeface | **Heebo**, one family | **Rubik** (sans) + **Space Grotesk** (mono/numeric), two families |
| Icons | **Lucide**, loaded from unpkg | Hand-rolled inline SVG set (`icons.js`, 40 glyphs) and a second hand-rolled set in `GlassComponents.jsx` (17 glyphs) |
| Emoji | **"None" in the UI** | Emoji used in cook view (`🎉`, `⏱`, `⌚`, `💡`) and in the phone-swap bar (`🧪`, `⏱`), plus `🛒 📋 🖨 📦`-style pills in the old menu toolbar concept |
| Native `<select>` | **Disallowed** | Used in the add-product modal and the settings screen |
| Glass opacity | `rgba(255,255,255,0.35–0.82)` | `GlassComponents.jsx` uses `0.88–0.98` — much more opaque |
| Approve stamp | Raster **stamp graphics** | Cook view renders a **text/icon button**, not the stamp image (`GlassComponents.jsx` still has the image `Stamp`) |

The `screenshots/` folder (18 PNGs, including `cook-v1-*`, `cook-v2-deck1..4`, `uikit-modern`, `uikit-final`) shows this was an iterative exploration; the surviving live artefacts are the ones listed above.

---

## 1. Global app shell (`ui_kits/foodco-app/app.html`)

`<html lang="he" dir="rtl">`. Layout: `.shell` → sticky `.topnav` + `.shell-main` → `main.page#app`, plus a detached `#cook-root` and a single global modal.

### 1.1 Top navigation
| Element | Behaviour |
|---|---|
| Brand block (`fC` mark + "foodCo") | Clicks → `#/dashboard` |
| Nav buttons | Rendered from a `NAV` array; active state derived from the hash |
| **Global search** | Input with a magnifier + a **`⌘K` kbd hint**. Purely visual — no handler |
| **Notifications bell** | Icon button with an accent dot. No handler |
| **Help button** | Icon button. No handler |
| **User chip** | Avatar initials + **name + role line** ("אבי כהן" / "המטבח בריינה"). Clicks → `#/settings` |
| Hamburger (`sb-toggle`) | `toggleSidebar()` — toggles `.open` on the topnav plus a `#sb-scrim` backdrop; `nav()` auto-closes it below **900px** |

**Nav destinations (7):** Dashboard, Inventory, Recipe book, Menu library, **Venues**, **Suppliers**, **Trash**.
**Nav badges:** a hard-coded `NAV_BADGES` map puts a warning-toned count on Inventory (`7`, low stock) and Recipe book (`3`, pending approval).

### 1.2 Routing
Hash router (`#/name/id`) with a `try/catch` that prints the raw error into the page on failure. Routes: `dashboard`, `inventory`, `product/:id`, `recipes`, `recipe/:id`, `menus`, `venues`, `suppliers`, `trash`, `settings`; anything unknown falls back to dashboard. `window.scrollTo(0,0)` on each route.

### 1.3 Global modal
One modal shell (title / body / footer) with three hard-coded `kind`s:
- **`add-product`** — 5 fields: name (+ hint), category (**native `<select>`**), base unit, price, cost. Footer: Cancel / Save.
- **`add-recipe`** — 4 fields: name, yield, yield unit, short description textarea. Footer: Cancel / Create.
- **anything else** (`ai`, …) — a placeholder body reading *"תצוגה מוקדמת — תוכן מלא ממתין להטמעה"* ("preview — full content pending implementation").
Backdrop click closes. No form state, no validation, no submission.

### 1.4 Cook-view keyboard shortcuts (app.html level)
When `#cook-root` has content: **Escape** closes, **ArrowLeft** = next step, **ArrowRight** = previous step (RTL-correct). Note `cook.js` registers its **own** Escape handler as well, so Escape is bound twice.

---

## 2. Dashboard (`#/dashboard`)

- **Page header pattern** (shared `S.pageHeader`): an **eyebrow** ("Dashboard · Apr 18"), an `h1` **greeting** ("ברוך הבא, אבי"), and a **lede sentence** summarising the day ("4 מוצרים דורשים תשומת לב היום · 3 מתכונים מחכים לאישור"). Actions: ghost **"AI מתכון"** (opens the placeholder modal) and dark **"מוצר חדש"**.
- **4 KPI cards**, each clickable as a whole (`onclick="nav(link)"`):
  | Card | Value | New vs. old |
  |---|---|---|
  | סה״כ מוצרים | 124 | adds a **delta pill** `+8 השבוע` |
  | סה״כ מתכונים | 38 | adds `+2 השבוע` |
  | מלאי נמוך | 7 | adds `+3 מיום ב׳` (down-toned) |
  | מחכים לאישור | `3` + **`/45` unit suffix** | adds a `hold` delta `93% מאושרים` |
  Each has an icon chip, a **sparkline SVG**, and a single `צפה ←` link in the footer. Card tones: `info` / `warn`.
- **Activity feed**: a section head with an eyebrow ("Live feed"), an `h2`, and a decorative **"All entities" chip** (no dropdown behind it). Four hard-coded rows: entity avatar letter, entity type tag (`Product` / `Dish` / `Prep`), name, change tags rendered as `Label from → to`, and a status pill (`updated` / `created` / `deleted`).

**Not present on this screen:** empty state, loading state, popovers on change tags, horizontal scroll controls for the change strip, vertical scroll indicators, disabled/logged-out states, tab navigation to Core settings / Venues / Trash / Suppliers (those moved into the main nav).

---

## 3. Inventory (`#/inventory`)

- Page header: eyebrow "Inventory", title "מלאי", **lede with a live count and a freshness line** ("N מוצרים פעילים · עדכון אחרון לפני 12 דקות"). Actions: ghost **"ייצוא"** (export) and dark **"מוצר חדש"**.
- **Category tab-pill row** with counts: הכל / ירקות / חלב / שמנים / קמחים / **מלאי נמוך**. Static — no click handlers, counts hard-coded.
- **Toolbar**: search input (`חיפוש מוצר...`), then ghost **"סינון"** (filter) and **"מיון"** (sort) buttons. All three are inert.
- **Table** (`.table-card` → `<table class="table">`) with 8 columns: מוצר / קטגוריה / מלאי / יחידה / עלות / מחיר / ספק / status.
  - Product cell: a **glyph tile** (single Hebrew letter) + name + an uppercase **SKU-style sub-line** (`P1`, `P2`, …).
  - Stock cell: current quantity plus a muted `(min N)`.
  - Status: `תקין` / `נמוך` pill.
  - **Whole row navigates** to `#/product/:id`.

**New data concepts** this screen introduces that the old app does not have: **current stock quantity**, **cost** as a field distinct from price, and a **product SKU/code**.

**Not present:** allergens, nutrition, validation badges, per-row action menu, edit/delete buttons, selection checkboxes, bulk edit, sortable headers, the filter panel (allergen / category / supplier / low-stock / invalid / incomplete / nutrition), inline price editing, column carousel, empty state, no-results state, logged-out disabling, equipment/logistics sub-nav.

---

## 4. Product detail (`#/product/:id`) — **new screen, no old-app equivalent**

The old app routes straight from list → edit form. The new design inserts a **read-only detail page**:

- **Breadcrumb** (`מלאי / <product>`) — a new navigation pattern (`S.breadcrumb`, `/` separators).
- **Hero**: glyph thumb, name, tagline (`category · SKU · supplier`), and **4 hero stats**: current stock, price, cost, and a computed **margin %** (`(1 − cost/price)`).
- **Action stack**: ערוך (edit) / **שכפל (duplicate)** / מחק (delete).
- **Panel: units & alternatives** — base unit, one alternative conversion, **yield %**, **density** (density is a new field, shown as `—`).
- **Panel: used in recipes** — lists recipes that use this product, each row clickable through to the recipe. **New functionality** (the old app can only do the inverse lookup implicitly).
- **Panel: price history** — a 30-day **area chart** (SVG with gradient fill). **New functionality.**
- **Panel: supplier** — contact person, minimum order, lead time.

All values are static; no edit affordance is wired.

---

## 5. Recipe book (`#/recipes`)

**Format change: table → card grid.**

- Page header: eyebrow "Recipe book", title, lede (`N מתכונים · 3 מחכים לאישור`). Actions: ghost **"AI מתכון"** (placeholder modal), dark **"מתכון חדש"** (add-recipe modal).
- **Category tab pills** with counts, including an amber-tinted **"מחכים לאישור"** pill. Static.
- Toolbar: search + inert "סינון".
- **Recipe cards** (`.mcard`): a **banner** that shows either a photo (`r.img`) or an accent-tinted placeholder with an image icon, an overlaid **category tag**, and the recipe name over the banner. Body shows **difficulty**, **time in minutes** (clock icon), **yield + unit** (scale icon), and a **status pill** (`מאושר` / `ממתין` / `טיוטה`). Whole card navigates to `#/recipe/:id`.

**New data concepts:** recipe **photo**, **difficulty**, **total time in minutes**, and a **three-state status** (approved / pending / draft) rather than the old boolean `is_approved_`.

**Not present:** labels chips (and label colours), allergen chips, rating stars, cost column, favourite toggle, **cook button on the row**, delete, sortable columns, ingredient-based search, date-range filter, favourites filter, "do not include allergens" inverted filter, station/type/approved filter groups, selection + bulk edit, empty state, no-results state, dish-vs-preparation distinction.

---

## 6. Recipe detail (`#/recipe/:id`) — **new screen**

- Breadcrumb, then a **hero**: accent-gradient glyph thumb, name, tagline (`category · difficulty`), and 4 hero stats — yield, time, **cost per portion**, and status pill.
- Action stack: **"מצב בישול" (cook mode) as the primary button** → `openCook(id)`, plus ערוך and הדפסה.
- **Panel: preparation steps** — a numbered list; each step has a **title**, a body paragraph, and a **per-step time** on the left. (Step *titles* are new — the old model has `instruction_` only.)
- **Panel: ingredients** — name + optional **note** ("בשלות, חתוכות לקוביות") + quantity + unit. (Per-ingredient prep notes are new.)
- **Panel: nutrition per serving** — calories / protein / fat / carbs. (Recipe-level nutrition is new; the old app only has per-100 g product nutrition.)

There is **no recipe *builder*** anywhere in the new design — see §12.

---

## 7. Menu library (`#/menus`)

- Page header + a single dark **"תפריט חדש"** action. Toolbar: search + inert "סינון".
- **Menu cards**: accent banner with the menu name as large type, then title, **season/context line** ("קיץ 2025", "אירועים"), and a footer with **item count** and an arrow.
- Cards are **not clickable** — there is no `onclick`, and no menu editor screen exists.

**Not present:** food cost %, total revenue, guest count, event type / serving style / date filters, sort control + direction toggle, clone, delete, edit, per-card loaders, empty state.

---

## 8. Venues (`#/venues`)

Simple table: שם (with pin icon) / **עיר** / **כתובת** / **מקומות ישיבה** / **פעילות מ-** (opened year) / status pill (`פעיל` / `בהכנה`). One dark "מקום חדש" action. Rows are not clickable; there are no row actions.

**New fields:** city, street address, seat count, opened year, an active/preparing status.
**Not present:** environment type, the **available-infrastructure / equipment linkage** (the old venue form's whole second half), notes, search, filters, edit, delete, selection/bulk, dashboard-embedded mode.

---

## 9. Suppliers (`#/suppliers`)

Table: ספק (truck icon) / איש קשר / **טלפון** / **מוצרים** (count) / **דירוג** (star + numeric rating) / a `more` glyph in the last cell (**not a button — no handler**). One dark "ספק חדש" action.

**New fields:** phone number, star rating.
**Not present:** delivery days, minimum order, lead time, search, filters (delivery day, has-linked-products), inline edit panel, delete, selection/bulk, empty state, back-to-dashboard button.

---

## 10. Trash (`#/trash`)

- Page header with lede **"פריטים שנמחקו נשמרים 30 ימים לפני מחיקה סופית"** — a new, explicit retention policy — and a danger-toned **"רוקן את הפח" (empty trash)** action.
- An informational **`.trash-note` callout** explaining that trashed items are hidden from inventory/recipes/search but recoverable.
- **One unified table** (not three sections): סוג (type chip: Product / Recipe / **Menu** / **Supplier**) / שם / **נמחק על ידי** / מתי (relative time: "לפני 2 שעות", "אתמול") / a **שחזר (restore)** button.

**New:** deleted-by attribution, relative timestamps, 30-day retention messaging, Menu and Supplier as trashable types, a global empty-trash action.
**Not present:** the three separate Dishes / Recipes / Products sections, per-section restore-all and dispose-all, **per-item permanent dispose**, per-item **version history**, loading state, error state + retry, per-section empty states, confirm dialogs.

---

## 11. Settings (`#/settings`) — **new screen**

Left **settings nav** with 7 entries: **חשבון** (active), צוות ומשתמשים, התראות, מדידה וסטנדרטים, חשבוניות ותשלום, אינטגרציות, `API & פיתוח`. Only the account pane is built; the other six are labels only.

Account pane contains three panels:
1. **פרופיל** — avatar circle with initials + name + email + a **"החלף תמונה"** button; then fields for full name, **role/title**, email, **phone** (`dir="ltr"`).
2. **התראות** — 4 **toggle switches** with title + description: low stock, recipe awaiting approval, supplier price updates (>5%), weekly report. **Entirely new functionality** — the old app has no notification system.
3. **יחידות מידה** — **currency** select (₪ / $) and **weight system** select (metric / imperial), with Cancel / Save actions. **New** (the old app is ₪-only and metric-only).

**Not present anywhere in settings** (the old app's "Core settings" / metadata manager): units & conversions registry, product categories, global allergens, recipe labels + colours + auto-triggers, menu types + dish-field configuration, preparation categories, section categories, **user management (admin-only list + delete)**, backup export / restore / import, demo-data loader.

---

## 12. Cook view (`cook.js` + `cook.css`, launched via `openCook(id)`)

**The only old-app screen that was re-skinned feature-for-feature.** The file header states it "mirrors `cook-view.page.html` structure 1:1", and `designs/Cook View.html` annotates the preserved features explicitly.

### 12.1 Preserved
- **Edit mode** with an `edit-mode-banner`, and Save-changes / Undo-changes replacing the Edit button.
- **Scaled view** with a banner (`קנה־מידה ל־ <amount> <unit> <name>`) and a **"חזרה למתכון מלא"** reset button; the multiplier chips and scale bar hide in this mode.
- **Multiplier chips** with an active state.
- **Quantity counter** (−/value/+) + **unit selector** + a **conversion badge** `×ratio` shown when the ratio ≠ 1.
- **Phone-only pane-swap bar** (🧪 רכיבים / ⏱ תהליך הכנה).
- **Ingredient pane**: header with a progress **badge `done/total`** that flips to **"הכל מוכן!"** when complete, plus a **progress fill bar**; tap-to-check rows with a check dot; per-ingredient **notes** rendered inline.
- **Set-by-ingredient flow**: per-row scale button → inline amount input → **המר (convert)** / **בטל (cancel)** → enters scaled view.
- **Edit-mode ingredient table**: name / −-input-+ / unit select + remove, with a **`field-changed`** row highlight.
- **Step pane** with a `done/total` counter and **three card states** — active (teal head, "פעיל עכשיו", big "סמן שלב כהושלם" button), done (done label + **`↩ בטל` un-do chip**), pending (**tap-to-jump** to make active).
- **Per-step countdown timer**, rendered **only when the step has a configured cooking time**, with a live in-place text update and a **timer-finished alert pill** (`⏱ טיימר הסתיים ✕`) that persists on done/pending cards until dismissed.
- **Per-step stopwatch** with play/pause, which keeps showing as a pill on the card after the step is marked done.
- **`markStepDone` auto-advances** to the next undone step.
- **Completion banner** (`🎉 הבישול הושלם — בתאבון!`).
- **Rating stars** (interactive, with a numeric readout).
- **Cost display** (scaled with yield) and an **approved badge**.
- **Export bar**: main "ייצוא" button expanding a strip of three label + view + download triples (מתכון / קניות / שלבי הכנה — switching the third to צ׳קליסט when `isDish`).
- **Approve stamp** as a floating bottom-right control.
- **Empty state**: chef icon, "בחר מתכון כדי להתחיל לבשל", a recipe-book CTA, and **recent-recipe chips** — and unlike the old app these chips show recipe **names**, not raw ids.
- **Escape** closes.

### 12.2 Changed or thinner than the old cook view
- Multiplier chips are hard-coded **×0.5 / ×1 / ×2 / ×3 / ×4** with `×N` labels, not translation keys.
- The **approve stamp is a text/icon button**, not the raster stamp graphic.
- **No per-row unit-override select** in view mode (the old view mode lets you switch a row's display unit when it has more than one available unit).
- **No dish variant**: `window.cookIsDish` is hard-coded `false`, so the **mise-en-place prep-item card list never renders** — only the preparation/steps variant is designed.
- `markStepDone` only searches **forward** for the next undone step; the old implementation also wraps backwards.
- **No scroll indicators** on either pane.
- **No pendingChanges / unsaved-changes handling**, no save persistence, no approve-with-unsaved confirm.
- The unit selector, the export view/download buttons, and the edit-mode ± steppers are **buttons without handlers**.
- `renderCook()` re-renders the whole subtree on every interaction, so any focus/scroll position is lost (prototype artefact, but it shapes the interaction feel).

---

## 13. Design-system layer — token and component coverage

### 13.1 Documented tokens (`README.md`, `colors_and_type.css`)
Body/glass surfaces, primary + hover + soft tint, accent gold, a 4-step **text ladder**, **6 semantic pairs** (success, warning, danger, info, allergen, accent), a 8-value type scale, an 8-point spacing scale, 6 border radii, **4 shadow tiers + a glow ring + a focus ring**, 2 easing curves with 3 durations, hover/press transforms, 7 named entrance keyframes, `prefers-reduced-motion` clamping, and per-surface blur values (nav 20 / cards 16 / modal 24 / scrim 6, stepping down on mobile).

### 13.2 Preview specimen cards (19)
`brand-icons`, `brand-logo`, `brand-stamps`, `colors-primary`, `colors-semantic`, `colors-surfaces`, `colors-text`, `radii`, `shadows`, `spacing-scale`, `type-heebo`, `type-kpi`, `type-scale`, and **7 component cards**: `components-activity`, `components-buttons`, `components-chips`, `components-inputs`, `components-kpi-card`, `components-nav`, `components-pills`.

**No specimen exists for:** tables, list shell / filter panel, selection bar, dropdowns and multi-selects, counters / steppers, scaling chips, rating stars, nutrition badge, loaders, toasts, empty states, confirm/auth/AI modals, column carousels, row action menus, tab pills, breadcrumbs, toggles, cards with banner images.

### 13.3 React components (`GlassComponents.jsx`, 12 exports)
`Icon`, `Button` (primary / ghost / **dark** / danger, 2 sizes, disabled), `HeaderPill` (active + `trash` variant), `GlassCard` (hover lift + optional radial glow), `KPICard` (tone, delta with trend up/down/hold, sparkline, optional link footer), `Chip` (5 tones), `Input` (label / placeholder / **error** / hint / focus ring), `TopNav`, `ActivityItem`, `Modal`, `Stamp`, `SectionHeader`.

`TopNav` here is a **different nav from `app.html`**: 4 items only (dashboard / inventory / recipes / menus), a centred pill group, search + bell icon buttons, and — notably — a **`user` prop with sign-in ("כניסה") and logout states**. This is the only place in the whole synced design where an authentication affordance exists.

### 13.4 Assets
`food-compos-logo.png`, `stamp-approved.png`, `stamp-not-approved.png`, `add_ingredient.png`, `recipe_placeholder.png`, `favicon.ico`. (Note the design system spells it `add_ingredient.png`; the old app references `add_ingrediant.png`.)

---

## 14. States present in the new design

| State type | Coverage |
|---|---|
| **Empty** | Cook view only (rich: icon + copy + CTA + recent chips). No empty state on any list or on the activity feed. |
| **Loading** | None anywhere — no spinners, skeletons, or overlay loaders. |
| **Error** | None, except the router's raw `try/catch` error dump and the `Input` component's `error` prop. |
| **Disabled** | `Button` has a `disabled` prop; cook view's edit-mode minus buttons. No permission-driven disabling. |
| **Permission / auth** | None in the app prototype. `GlassComponents.TopNav` has sign-in/logout props, unused. No auth modal, no "sign in to use" pattern, no admin-only surfaces. |
| **Validation** | `Input` error + hint props only. No form validation anywhere in the screens. |
| **Read-only / history** | None. |
| **Selection / bulk** | None. |
| **Active / done / pending** | Cook view step cards only. |
| **Hover / press / focus** | Well specified in tokens and implemented in `GlassComponents.jsx`. |
| **Responsive** | `app.html` collapses the nav below **900px** via a hamburger + scrim. Cook view has a phone pane-swap bar. No bottom tab bar, no column carousel, no mobile row-action menu, no swipeable filter panel. (Full breakpoint behaviour lives in `styles.css` / `cook.css`, which were not read.) |
| **RTL** | `dir="rtl"` on `app.html` and the cook view; Hebrew content throughout; RTL-aware arrow choices in `GlassComponents.KPICard` and the app.html arrow-key bindings. Breadcrumbs use `/` separators. |

---

## 15. Screens that exist in the old app but have **no counterpart anywhere in the synced design**

Listed here as observations for Step 3, not as judgements:

- **Recipe builder** (`/recipe-builder`) — the largest screen in the product: yield/scaling dock, ingredient table with drag-and-drop and four row states, the dual workflow editors (numbered steps vs mise-en-place), the logistics/tool picker, the export toolbar, the five-gate save flow, history view mode.
- **Menu intelligence editor** (`/menu-intelligence`) — the "menu paper", section/dish authoring, keyboard-driven field order, per-dish metadata driven by menu types, the financial footnote bar.
- **Equipment / logistics** (`/equipment`, `/inventory/equipment`) — list, inline edit panel, scaling rules.
- **Product form**, **supplier form**, **venue form**, **equipment form** — all four full forms.
- **Metadata manager** (units, categories, allergens, labels, menu types, prep categories, section categories, user management, backup/restore/import, demo data).
- **Auth modal** (sign in / sign up / profile image / the ~18 validation error states).
- **All AI modals** — recipe (text/image/URL), menu, product; the usage meter; the generate → preview → apply flow.
- **Utility modals** — unit creator, translation-key modal, label creation, add-item, quick-add product, quick-edit product panel, add-equipment, supplier modal, confirm modal, restore-choice, global-specific.
- **Version history panel** and the history overlays.
- **Export preview** ("paper" dialog with recipe-sheet and generic-sections layouts).
- **Global toast / user-msg** with undo.
- **Hero FAB** with page-registered quick actions.
