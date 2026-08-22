# New Design Inventory — `UI refactor/` (local)

> **Supersedes the previous version of this file**, which inventoried the claude.ai
> `foodCo Design System` project. That project is **stale (last write 2026-05-24)** and is
> no longer the design of record. It has no recipe builder, no menu intelligence editor and
> no hero FAB — all three exist here. Do not sync from it again.

**Source of truth:** `UI refactor/` at the repo root. Read 2026-08-19.

---

## 0. What this is

A **13-screen click-through prototype** in a custom template DSL, not production markup —
but far closer to production than a mockup: every screen carries real component state,
computed values, and working handlers.

**Format:** `.dc.html` files, one per screen. Runtime is `support.js` (`DCLogic` base class,
`setState`, `renderVals()`). Template tags: `<app-shell>`, `<sc-if value="{{ }}">`,
`<sc-for list="{{ }}" as="x">`, `{{ }}` bindings. Styling is inline `style=""` plus
`colors_and_type.css` (tokens) and `mobile-pass.css`.

**Supporting files**

| File | Role |
|---|---|
| `shell.js` | The one shared shell — nav, chip rows, bottom tab bar, FAB, wash, focus rings, reduced motion, Lucide loader, Kitchen dark theme |
| `colors_and_type.css` | Token layer — **Heebo** `--font-sans` / `--font-display` |
| `mobile-pass.css` | Shared mobile ergonomics rules |
| `support.js` | Template runtime |
| `audit-harness.html` | Loads all 13 screens in resizable frames, reports measured numbers on demand |
| `v1/` | Per-screen `v1` and `v2-pre-mobile` snapshots — the refactor history is preserved |
| `assets/` | `fc-seal.svg`, `fc-mark.svg`, `fc-mark-kitchen.svg`, `fc-seal-ink.svg`, `fc-favicon.svg`, stamps |
| `Refactor Master Plan.dc.html` | The audit that drove the work — defect register, scorecard |
| `Refactor Progress.dc.html` | What shipped, measured after the fact |

**Resolved design decisions** (these settle the contradictions the old cloud project had):

- **Typeface: Heebo.** `colors_and_type.css:11-12`, `shell.js:98`. Rubik / Space Grotesk are gone.
- **Icons: Lucide**, loaded once in the shell from unpkg (`shell.js:38-48`), `<i data-lucide>` in screens.
- **Breakpoints: 3** — 479 / 767 / 1023. Down from 9.
- **Touch floor: 44px**; checkboxes are a 24px glyph inside a 44px hit area; Cook View is 56px.
- **Type floor: 12px.** All 8px and 11px values removed.
- **Themes: 2** — light glass, plus **Kitchen** (dark) as a declared mode owned by Cook View.

---

## 1. Shell (`shell.js`) — mounted by all 13 screens

### 1.1 Primary nav — 4 tabs

| id | Label | Icon | Target |
|---|---|---|---|
| `dashboard` | דשבורד | `layout-dashboard` | `Dashboard.dc.html` |
| `inventory` | מלאי | `package` | `Inventory.dc.html` |
| `recipes` | ספר מתכונים | `book-open` | `RecipeBook.dc.html` |
| `menus` | תפריטים | `library` | `MenuLibrary.dc.html` |

Same 4 items render as the **mobile bottom tab bar**. This replaces the old 10-item flat pill row.

### 1.2 Chip rows — secondary destinations, per tab

| Parent tab | Chips |
|---|---|
| `dashboard` | אתרים · מטא-דאטה · ספקים · אשפה |
| `inventory` | ציוד |
| `recipes` | בניית מתכון · מצב בישול |
| `menus` | ספריית תפריטים · בניית תפריטים |

This is how the 13 screens fit behind 4 tabs. Recipe Builder and Cook View are **reachable from the nav for the first time** — in the old app they were only reachable from Recipe Book.

### 1.3 Also owned by the shell

- **Hero FAB** — flame, 45° rotate on open, page-registered actions via the `fab` attribute, chef-hat shortcut, tray collapses to zero height, Esc / outside-click close, sits above the bottom tab bar on mobile. Rebuilt from the old `HeroFabComponent`.
- Ambient gradient wash, focus-ring token, `prefers-reduced-motion` clamp, Lucide loader, favicon registration, brand mark (kitchen variant under dark theme).

### 1.4 Four view states on every screen

Every screen exposes a `viewState` tweak — `ready` · `loading` · `empty` · `error` — so any
state is reviewable without faking data. The patterns are identical everywhere:

- **loading** — glass skeleton rows (`skeletonRows`, pulse animation)
- **empty** — centred Lucide glyph + one line of copy
- **error** — `cloud-off` glyph, `הטעינה נכשלה`, "אין חיבור לשרת כרגע. אפשר לנסות שוב.", 44px `נסה שוב` retry
- **ready** — the real screen

---

## 2. Screens

### 2.1 Dashboard
4 KPI cards with sparklines and deep links: total products (24) → Inventory, total recipes (14) → Recipe Book, low stock (3, warning tone) → Inventory, recipes pending approval (2, info tone) → Recipe Book. Then a **recent-activity feed**: avatar letter, entity label, name, change text, relative time, action label. `isOtherView` renders a "בקרוב / המסך הזה עדיין בבנייה" placeholder for unbuilt sub-views.

### 2.2 Inventory
Full list shell. **Filter panel**: low-stock-only toggle, category checkboxes with counts, allergen checkboxes with counts, clear-filters. **Table**: checkbox column, product (with low-stock dot), category, allergens (count button → popover with chips), supplier, unit, price, actions. Sortable on name / category / supplier / price with up-down indicators. **Selection + bulk delete** with an "N נבחרו" bar. **Add/edit modal**: name (with inline `nameError`), category chips, unit chips, price, allergen toggle chips, low-stock checkbox. **Confirm dialog** for delete. Toast. Mobile: card mode, carousel arrows replaced by swipe.

### 2.3 Recipe Book
Same list shell. **Filter panel**: favourites-only, type, approval status, labels, and an **inverted allergen filter** ("הסתר מתכונים עם אלרגן") — all with counts. **Table**: name (+ unapproved marker), cost, type, labels (count → popover), allergens (count → popover), star rating, actions. Sortable on name / type / rating / cost. Row actions: favourite toggle, cook, delete, plus an overflow actions menu. **Selection + bulk delete.** Add/edit modal with name, type chips, cost, star rating, label chips, allergen chips, "מאושר לתפריט" checkbox. "הוסף מתכון" links to `RecipeBuilder.dc.html`.

### 2.4 Recipe Builder
The largest screen, and fully interactive.

- **Type toggle** מנה ↔ הכנה (`toggleType`) — reshapes the workflow section
- Name input, **5-star rating**
- **Yield dock**: portions counter (−/+), portion-unit dropdown (מנות · יח׳ · ק"ג · גרם · ליטר), plus **secondary yields** — add/remove rows each with its own qty counter and unit dropdown (יח׳ · ק"ג · גרם · ליטר)
- **Label chips** — 4 hard-coded: מהיר · טבעוני · פופולרי · חדש
- **Metrics**: total cost (₪) and total weight (g)
- **Ingredient table** — רכיב · יחידה · כמות · אחוז · עלות. Per row: product picker (opens a searchable modal listing name · ₪price / unit), unit label, qty −/+ with **unit-aware step** (0.05 for kg/litre, 1 for discrete units), **percent of total weight**, computed cost, remove. "הוסף שורה" adds a row.
- **Workflow, dish variant** (`isDishType`) — "רשימת הכנה": prep steps with name input, category dropdown (חיתוך · בישול · אפייה · רטבים), qty dropdown with counter and unit options (יחידה · גרם · ק"ג · ליטר), remove, add
- **Workflow, preparation variant** (`isPreparationType`) — "שלבי הכנה": numbered steps with auto-index, instruction textarea, **labor time** and **cook time** number inputs in minutes, remove, add
- **Approve stamp** — image toggle, approved / "לחץ לאישור", with toast
- **Save** — label switches שמירת מנה / שמירת מתכון
- All four view states; `notReady()` shows "המסך הזה בבנייה" for anything unimplemented

### 2.5 Cook View — Kitchen mode
Own dark theme toggle driving `theme="kitchen"`. Recipe name, **hero timer**, progress bar with percentage, **yield multiplier buttons** that rescale quantities, ingredient checklist with checked count, step checklist with per-step **timers** (start / reset), and a **celebration overlay** ("המנה מוכנה!") when every step is done. 56px controls for wet hands. Skeleton and error cards use kitchen surfaces, not light glass.

### 2.6 Menu Intelligence
Toolbar: רשימת קניות · צ׳קליסט · הדפסה · הכל (all `notReady`) and **שמירת תפריט**. Header: event-type dropdown · serving-type dropdown, menu name, guest count, event date. **Sections** — each with a name dropdown, remove, and a list of dishes. Per dish: recipe name, expandable meta (food cost per portion, total food cost for N guests, profit per portion), sell-price input, remove. Empty slots show a **dish search** with live results. "הוסף מנה" per section, "+ הוסף מקטע" for a new section. **Financial footer**: total cost · food-cost % · total revenue · cost per guest.

### 2.7 Menu Library
Card grid. Search, "אירוע תפריט חדש", filters (event type, serving style, date-from), sort (date · name · food cost · guest count) with direction toggle. Cards show name, subtitle, food cost, revenue, guest count, and open / clone / delete actions. Confirm dialog + toast.

### 2.8 Suppliers
List shell. Filters: linked-products-only, delivery-day checkboxes. Table: supplier, contact, delivery days (chips, "כל השבוע" when all), min order, lead time, linked product count, actions. Sortable on name / min order / lead. Selection + bulk delete. Modal: name, contact, delivery-day toggle chips, min order, lead days.

### 2.9 Equipment
List shell. Filters: category checkboxes, consumable radio (הכל / כן / לא). Table: name, category, owned qty, consumable, **scaling rule**, actions. Modal: name, category chips, owned qty, "פריט מתכלה" checkbox, notes textarea, and a **scaling rule block** — "כלל שינוי כמות לפי מספר סועדים" checkbox revealing per-guests, min qty, max qty.

### 2.10 Metadata Manager
Six managed vocabularies, each a card with a text input + "הוסף" and a deletable chip list:
**תוויות מתכונים** (with a colour-cycle button per label) · **קטגוריות מוצר** · **אלרגנים גלובליים** ·
**יחידות מידה** (locked units cannot be deleted) · **סוגי אירועים** · **סטיילי הגשה**.
Quick-jump buttons at the top. Confirm dialog + toast.

### 2.11 Trash
Three sections — dishes, recipes, products — each with per-section "שחזר הכל" / "מחק לצמיתות הכל" and an empty state. Per item: name, deleted-at, and **היסטוריה** / **שחזר** / **מחק לצמיתות**. History opens a panel listing action label, summary and timestamp. Confirm dialog supports **danger and warning variants**. Refresh button.

### 2.12 Venues
Card list: status label, name, address, capacity ("N מקומות"), linked menu count. "הוספת אתר" opens a modal with name, address, capacity.

### 2.13 Venue Detail
Hero: name, status, address, capacity, linked menu count. Panels: **contact** (initials avatar, name, role, phone), **operating hours** (day-range → time rows), **linked menus** (name, date, guest count) with an empty state.

---

## 3. Data concepts the design assumes

Present in the design, and each needs a decision about whether the app gains it:

| Concept | Where |
|---|---|
| Product **supplier** on the row, low-stock flag | Inventory |
| **Secondary yields** on a recipe | Recipe Builder |
| Per-step **labor time** and **cook time** | Recipe Builder (preparation variant) |
| **Sell price** per menu dish, profit per portion | Menu Intelligence |
| Equipment **scaling rule** (per-guests / min / max) | Equipment |
| Venue **address, capacity, contact, operating hours** | Venues, Venue Detail |
| Trash **history** per item, per-section bulk restore | Trash |
| Label **colours** | Metadata Manager |
| Unit **locked** flag | Metadata Manager |

---

## 4. Known debt, stated by the design itself

From `Refactor Progress.dc.html`, left open deliberately:

- The four data screens (Inventory, Recipe Book, Suppliers, Equipment) keep their mobile
  card-mode `!important` override blocks. That count only drops when card mode becomes its
  own layout branch.
- Icons inside screen bodies are Lucide **path geometry** inline rather than `<i data-lucide>`
  tags. Cosmetic cleanup, not a visual difference.
