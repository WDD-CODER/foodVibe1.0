# Design Migration — Action List

**The rule:** the design is a skin. Take the new look. Never lose a function.
Every box below is something the design **left out** that must be **rebuilt in the new style**.

**Not a decision list — these are all decided.** Open questions are at the very bottom (5 of them).

Detail for any line: `gap-analysis.md`. Source of truth for old behaviour: `old-app-inventory.md`.

---

## A. Global — do these first, they block everything

- [ ] **Auth** — route guards, sign in / sign up, logout, admin surface, logged-out states. Design has none.
- [ ] **Unsaved-changes guard** — `pendingChangesGuard` + snapshot diff. Design has none.
- [ ] **3-button confirm** — Cancel / Save / Discard. Design's confirm is 2-button; the 3rd is what makes the guard work.
- [ ] **Toast undo** — design has toasts, no undo.
- [ ] **URL filter state** — `q`, `sort`, `order`, `categories`, `?tab=`, `?lowStock=1`. Dashboard KPI deep-links depend on it.
- [ ] **Re-key all Hebrew** — design hard-codes strings; app needs `translatePipe` + `dictionary.json`.

---

## B. All 4 list screens — Inventory · Recipe Book · Suppliers · Equipment

Do once, apply four times.

- [ ] **Bulk edit** — select many, change a field once. Design has bulk *delete* only.
- [ ] **Dirty-row-switch prompt** — leaving a half-edited row must offer to save first.
- [ ] **Per-row deleting loader**
- [ ] **Empty-database vs no-results** — two different states, design has one.
- [ ] **Keyboard on sort headers** — Enter / Space.
- [ ] **Auth gating** on add / edit / delete.
- [ ] **Inline "add new" creation** — e.g. Equipment category, without leaving the row.

---

## C. Recipe Builder — the biggest job

- [ ] **Unit selector on ingredient rows** ← *your example.* Design shows unit as read-only text. Needs the full select: type-to-filter + create-unit.
- [ ] **Ingredient search over recipes too** — design searches products only, so **sub-recipes are impossible**.
- [ ] **Four row states** — blocking / warning / unlinked / normal, + quick-edit panel tiers.
- [ ] **Logistics / equipment picker** — whole section missing.
- [ ] **Export toolbar** — 5 entries × view/export, + print.
- [ ] **Save validation** — the five gates + the combined Hebrew error message. Design just shows a toast.
- [ ] **History view mode** — read-only past version.
- [ ] **Drag-and-drop reorder** — ingredients and workflow steps.
- [ ] **Collapsible sections** + remember state (localStorage ×3).
- [ ] **Weight/volume toggle** + unconvertible-ingredient notice.
- [ ] **Duplicate-name check** — across dishes *and* preparations.
- [ ] **Create unit / label / category inline** — design's dropdowns are closed lists.
- [ ] **Labels** — searchable multi-select + read-only auto-labels. Design has 4 fixed chips.
- [ ] **Recipe image upload**
- [ ] **Per-step dual timers** — labor + cook, `m:ss` / `hh:mm:ss`, click-to-edit. Design has plain minute boxes.
- [ ] **Nutrition badge** on product rows.
- [ ] **Keyboard** — ↑/↓ steps quantity, Enter adds a row.
- [ ] **Dirty tracking** — `afterNextRender` snapshot.
- [ ] **AI draft mode** + FAB "AI edit" action.

---

## D. Product form

- [ ] **Purchase options** (`FormArray`) — no home in the design's modal. Biggest single data loss.
- [ ] **Five collapsible optional fields**
- [ ] **Decide the container** — full page, or a modal big enough to hold the above. (See open questions.)

---

## E. Metadata Manager

Design covers 6 vocabularies. These 6 are missing:

- [ ] **User management** (permission-gated)
- [ ] **Backup / restore**
- [ ] **Demo data**
- [ ] **Menu types**
- [ ] **Preparation categories**
- [ ] **Section categories**

---

## F. Menu Intelligence — settled

- [ ] **Keep the existing screen exactly as it is.** Do not use the design's version.
- [ ] **Port only the mobile logic onto it** — shell, 3 breakpoints, 44px touch floor.

---

## G. Small ones

- [ ] **Trash** — keep `recoverBeforeRestore` (restoring an old version of a deleted item must un-delete it first).
- [ ] **Venues** — keep the infrastructure `FormArray` (equipment + quantity rows).
- [ ] **Suppliers** — keep the linked-products count.

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

## Still needs your call — 5 items

1. **Product form** — full page, or redesign the modal to fit purchase options?
2. **Row editing** — keep the design's modal, or rebuild the old inline expanding panel?
3. **New data concepts** — build them, or drop the visual? (supplier on product row, secondary yields, per-step labor/cook time, menu sell price, equipment scaling rule, venue address/capacity/contact/hours, trash history, label colours, unit locked flag)
4. **Where do user management + backup/restore live** in the new Metadata Manager?
5. **Inline creation** — restore "create unit/label/category" into dropdowns, or force all creation through Metadata Manager?

---

## Progress

- **A. Global** — 0 / 6
- **B. List screens** — 0 / 7
- **C. Recipe Builder** — 0 / 19
- **D. Product form** — 0 / 3
- **E. Metadata** — 0 / 6
- **F. Menu Intelligence** — 0 / 2
- **G. Small** — 0 / 3

**Total: 0 / 46**
