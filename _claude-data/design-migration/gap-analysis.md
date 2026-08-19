# Gap Analysis — current app → `UI refactor/`

> **Supersedes the previous 485-row version**, which compared the app against the stale
> claude.ai cloud project. That comparison is void: it concluded the design had no recipe
> builder, no menu intelligence editor and no hero FAB. All three exist in `UI refactor/`.

**Comparing:** [`old-app-inventory.md`](./old-app-inventory.md) (live Angular source) →
[`new-design-inventory.md`](./new-design-inventory.md) (`UI refactor/`, 13 screens).
**This design is the implementation target.** Written 2026-08-19.

---

## Governing rule — zero functionality loss

**Human decision 2026-08-19. This overrides every row in this document.**

The design is a **skin**, not a specification. It defines how the app *looks*; it has no
authority to remove behaviour. Therefore:

1. **Anything the current app does, the migrated app must still do.** If the design omits a
   control, the control is **added back into the new visual language** — the design is not
   the reason to drop it.
2. **A replacement is only acceptable if it is equal or better.** Where the design improves
   on the old screen (Trash, Cook View, the shell), take the design.
3. **"The design doesn't have it" is never a reason to cut a feature.** It is a task to
   design that feature in the new style.

**Worked example** — the ingredient row's unit selector. Old app: a full select (chip
variant, type-to-filter, `__add_unit__` inline unit creation). New design: a read-only label
derived from the product (`UNIT_LABELS[i.product.unit]`) — no control at all. **Resolution:
rebuild the selector in the new style.** Not a design decision to honour; a gap to fill.

Consequence for this document: the "Design drops" tables below are **not** decisions about
what to cut. They are the **restoration backlog** — the list of things that must be
re-designed into the new look.

---

## Menu Intelligence — settled, do not migrate

**Human decision 2026-08-19.** The **existing app's** menu intelligence editor is kept
**exactly as it is today**, visually and functionally. `MenuIntelligence.dc.html` in
`UI refactor/` is **not used at all**.

The one thing to take from the refactor is the **mobile behaviour** — the shell, the three
breakpoints, the 44px touch floor and the responsive layout logic — applied to the existing
screen so it works correctly on a phone. Look and interaction stay as they are.

This makes §3 below informational only.

---

## Verdict

The design covers **every screen the app has**, which the old comparison got badly wrong.
The real migration risk is not missing screens — it is **missing depth inside screens that
exist**, concentrated in four places:

| Risk | Where |
|---|---|
| **Auth and route protection are absent entirely** | Global |
| **Unsaved-changes protection is absent** | Global — bites Recipe Builder, Menu Intelligence, forms |
| **Recipe Builder is ~60% of the old one** | Recipe Builder |
| **Full form pages became modals** | Product, Supplier, Venue, Equipment |

Everything else is either covered, an intentional simplification, or a genuine improvement.

---

## 1. Global shell

**Design covers:** RTL, 4-tab nav + chip rows, mobile bottom tab bar, hero FAB with
page-registered actions, one loading / empty / error pattern, focus rings, reduced motion,
Lucide, light + Kitchen themes, toast.

**Design drops — needs a decision:**

| Missing | Why it matters |
|---|---|
| **All auth** — `authGuard` on 12 routes, auth modal, sign in / sign up, logout, admin crown, guest avatar | The design has no logged-out state at all. Nothing gates anything |
| **`pendingChangesGuard`** | No "you have unsaved changes" anywhere. Recipe Builder and Menu Intelligence can silently lose work |
| **Three-button confirm** (Cancel / Save / Discard) | The design's confirm is two-button. The third button is what makes the unsaved-changes flow work |
| **Toast undo** | Design has toasts, but no undo affordance |
| **Route resolvers + global loading overlay** | Design has per-screen skeletons instead — arguably better, but the resolver prefetch behaviour is a separate question |
| **Deep-link query params** (`?tab=`, `?filters=`, `?lowStock=1`, `?view=history`) | Dashboard KPI → pre-filtered list links depend on these. The design's KPI cards link to bare list pages |
| **`translatePipe` + `dictionary.json`** | Hebrew is hard-coded in the design. Every string needs re-keying during migration — expected for a prototype, but it is real work |

**Design adds:** Recipe Builder and Cook View are reachable from the nav for the first time
(chips under ספר מתכונים). Nav goes 10 flat pills → 4 tabs + contextual chips.

---

## 2. Recipe Builder — the big one

The design has a **real, working builder**: type toggle, yield dock with secondary yields,
ingredient table with percent and cost, unit-aware quantity stepping, both workflow variants,
approve stamp, save, and all four view states. That is the core of the screen.

**What the old builder has that the design does not:**

| Missing | Severity |
|---|---|
| **Ingredient search across products *and* recipes** — the design's picker lists products only | **Sub-recipes are not expressible.** Structural |
| **Four ingredient row states** (blocking / warning / unlinked / normal) + quick-edit panel tiers | Data-quality surface disappears |
| **Logistics / equipment picker section** entirely | Whole section absent |
| **Export toolbar** — 5 entries × view/export, plus print | Whole feature absent |
| **Five-gate save flow** + the composed Hebrew error string | Design's save is a toast. No validation at all |
| **History view mode** (`?view=history`) — read-only snapshot | Version history unreachable |
| **Drag-and-drop reordering** (ingredients and workflow) | Order is fixed |
| **Collapsible sections** with `localStorage` persistence (×3) | Minor, but users lose their layout |
| **Weight/volume toggle** + unconvertible-ingredient notice panel | Metrics are weight-only in the design |
| **Async duplicate-name validation** across dishes *and* preparations | Duplicates become possible |
| **Create-unit / create-label / create-category inline flows** (`__add_unit__` etc.) | Design's dropdowns are closed lists |
| **Labels**: searchable multi-select with read-only auto-labels | Design has 4 hard-coded chips |
| **Recipe image upload** | Design has no image on the builder |
| **Per-step dual timers** with `m:ss` / `hh:mm:ss` click-to-edit | Design has plain minute number inputs |
| **Nutrition badge** on product rows | Absent |
| **Keyboard**: ArrowUp/Down steps quantity, Enter adds a row | Absent |
| **Dirty tracking** (`afterNextRender` snapshot) | Ties back to the missing guard |
| **AI draft mode** + hero FAB AI-edit action | AI entry point absent |

**Read this as:** the design nailed the *layout and interaction model*; the *domain depth*
is what has to be carried over.

---

## 3. Menu Intelligence — RESOLVED, informational only

**Settled above: the old screen is kept as-is; the design's version is discarded.** The only
work here is porting the mobile/responsive logic onto the existing screen. The description
below is retained solely to document what is being declined.

`MenuIntelligence.dc.html` exists, was refactored, has `v1` and `v2-pre-mobile` snapshots,
and passed the mobile audit (41 sub-44px targets → 0). It has: event-type and serving-type dropdowns, name / guest count /
date, sections with dish lists, per-dish sell price and expandable cost meta (food cost per
portion, total, profit), dish search, and the financial footer (total cost · food-cost % ·
total revenue · cost per guest). Toolbar buttons (רשימת קניות · צ׳קליסט · הדפסה · הכל) are
drawn but call `notReady`.

**Not adopted.** The old screen's "menu paper" metaphor, section/dish authoring, keyboard
field order and financial footnote bar all stay exactly as they are today.

---

## 3b. The four data screens — two systematic losses

Inventory, Recipe Book, Suppliers and Equipment all run the same list shell in the old app.
Verified by reading `supplier-list`, `equipment-list`, `venue-list` and `menu-library-list`
source on 2026-08-19. **Two capabilities are absent from the design on every one of them.**

### Loss 1 — Bulk edit

Old app: the selection bar offers **bulk delete *and* bulk edit**. Each list declares an
`editableFields_` computed listing which fields can be mass-changed, and `onBulkEdit({field,
value, ids})` applies it. Equipment exposes category and is-consumable; Suppliers and Venues
each expose their own set.

New design: the selection bar has **"מחק נבחרים" and "בטל בחירה" only**. Bulk edit does not
exist on any screen.

**Restore.** This is a daily-driver feature for a kitchen catalogue — retagging 40 products
one modal at a time is not a workflow.

### Loss 2 — Inline row edit panel

Old app: clicking a row (or Enter / Space) expands an **edit panel underneath the row**
instead of navigating or opening a modal. It carries a full field set, a 200 ms `closingId_`
close animation, `clickOutside` handling, an `isSavingEdit_` inline loader, and — critically
— **switching rows while dirty prompts `unsaved_changes_confirm` and saves first**. Equipment's
panel even has an inline `__add_new__` category-creation flow.

New design: every screen uses a **centred modal** (`modalOpen` / `modalMode` / `draft`).

**Decide.** The modal is a legitimate design choice and is simpler. But it costs the
edit-in-place speed the old screens were built around, and the dirty-row-switch protection
has no equivalent. If the modal stays, the unsaved-changes prompt must come with it.

### Also absent on all four

| Feature | Old app | Design |
|---|---|---|
| Per-row deleting loader (`deletingId_`) | Yes | No |
| Empty-database vs no-results distinction | Yes — `app-empty-state` + CTA vs `no_*_match` | One `isEmpty` for both |
| Keyboard on sort headers (Enter / Space) | Yes | Not expressed |
| Auth gating on add / edit / delete (`requireAuth()`) | Yes | No auth at all |
| URL filter state (`q`, `sort`, `order`, `categories`, …) | Yes | No |
| Inline `__add_new__` category creation | Yes (Equipment) | Closed list |

---

## 4. Forms became modals

The old app has **four full form pages**. The design replaces all four with modals:

| Old form page | Design | Gap |
|---|---|---|
| Product form (`/inventory/add`, `/edit/:id`) | Modal in Inventory | **Purchase options `FormArray`** and the **five collapsible optional fields** are gone. This is the biggest single data loss |
| Supplier form | Modal in Suppliers | Fewer fields |
| Venue form | Modal in Venues | Fewer fields |
| Equipment form + **inline edit panel** | Modal in Equipment | The distinctive inline edit panel is gone; scaling rule survives |

Modals are a defensible simplification for three of these. The **product form is not** — purchase
options are a real domain concept with no home in a modal.

---

## 5. Metadata Manager

**Design covers:** labels (with colour cycling), product categories, allergens, units (with
locked flag), event types, serving styles. Six vocabularies, consistent card pattern.

**Design drops:** **user management** (permission-gated), **backup / restore**, **demo data**,
**menu types**, **preparation categories**, **section categories**.

User management and backup/restore are the ones that matter — they have no other home.

---

## 6. Screens that map cleanly

Little to decide here; port the depth, keep the design.

- **Dashboard** — KPIs + activity feed both survive. Only the deep-link params are lost (§1).
- **Inventory / Recipe Book / Suppliers / Equipment** — the list shell is faithfully
  reproduced: filter panel with counts, sortable columns, selection + bulk delete, popovers,
  add/edit modal, confirm, toast. Recipe Book even keeps the **inverted allergen filter**.
- **Menu Library** — card grid, filters, sort + direction, clone/delete, confirm. Faithful.
- **Trash** — three sections, per-section bulk restore/dispose, per-item history, danger and
  warning confirm variants. **Better than the old screen.**
- **Cook View** — yield multiplier, ingredient and step checklists, per-step timers,
  progress, celebration overlay, Kitchen dark mode at 56px. **Better than the old screen.**
- **Venues / Venue Detail** — real mobile layouts for the first time; adds contact block and
  operating hours.

---

## 7. New data the app must gain

| Concept | Screen |
|---|---|
| Supplier on the product row; low-stock flag | Inventory |
| Secondary yields on a recipe | Recipe Builder |
| Per-step labor time and cook time | Recipe Builder |
| Sell price per menu dish → profit per portion | Menu Intelligence |
| Equipment scaling rule (per-guests / min / max) | Equipment |
| Venue address, capacity, contact, operating hours | Venues / Venue Detail |
| Per-item trash history + per-section bulk restore | Trash |
| Label colours; unit locked flag | Metadata Manager |

---

## 8. Decisions needed before a plan can be written

**Blocking:**

1. **Auth** — where do sign-in, logout, guards and the admin surface live in the new shell?
   The design has no answer and the app cannot ship without one.
2. **Unsaved-changes flow** — reinstate `pendingChangesGuard` plus a three-button confirm, or
   accept silent loss? Affects Recipe Builder, Menu Intelligence, all four forms.
3. **Recipe Builder depth** — port the full old feature set into the new layout, or ship the
   design's reduced version first and layer the rest? Sub-recipe support, the export toolbar,
   the logistics section and the five-gate save are the four biggest items.
4. **Product form** — keep a full page (design has only a modal), or redesign the modal to
   carry purchase options?
5. **Menu Intelligence** — port as-is, or migrate? See §3.

**Batch, answerable during implementation:**

6. Metadata Manager — where do user management and backup/restore go?
7. Deep-link query params — reinstate, or accept that KPI cards link to unfiltered lists?
8. Toast undo — keep or drop?
9. The 9 new data concepts in §7 — build the data, or drop the visual, one by one?
10. Inline "create new" flows (unit / label / category) — reinstate into the design's closed
    dropdowns, or move creation entirely into Metadata Manager?
