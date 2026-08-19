# Design Migration — Action List

**The rule:** the design is a skin. Take the new look. Never lose a function.
Every box below is something the design **left out** that must be **rebuilt in the new style**.

**Not a decision list — these are all decided.** Open questions are at the very bottom (5 of them).

Detail for any line: `gap-analysis.md`. Source of truth for old behaviour: `old-app-inventory.md`.

---

## A. Global — do these first, they block everything

**Finding, 2026-08-19:** these 6 items were written as "design left it out, build it" — checked against
the live app instead of just the design, and 5 of the 6 already exist and are wired into every current
route. Nothing to build for those; the real M3 work is not losing the wiring when the shell markup
around them gets replaced.

- [ ] **Auth** — `authGuard`, `AuthModalService`, `UserService` already exist and gate every add/edit/delete route today. Nothing to build. Verify: the new shell's login/logout surface (avatar) still calls the same service.
- [ ] **Unsaved-changes guard** — `pendingChangesGuard` (`canDeactivate`) already wired on every form route (`inventory/add`, `recipe-builder`, `menu-intelligence`, etc). Nothing to build. Verify: route restructuring in Task 14 doesn't drop a `canDeactivate` entry.
- [ ] **3-button confirm** — `ConfirmModalService` already supports a ternary result (`cancel`/`confirm`/`save`) via `TernaryModalOptions` — this *is* the ACTION-LIST governing rule's Cancel/Save/Discard. Nothing to build. Don't replace it with the design's simpler 2-button confirm when restyling.
- [ ] **Toast undo** — `UserMsgService` + `<user-msg>` already implement `onUndo()`. Nothing to build. Needs repositioning under the new bottom tab bar via the M2 `.m-toast`/`.m-above-tabbar` classes once the tab bar exists.
- [ ] **URL filter state** — `list-state.util.ts` (`ParamDescriptor`/serializers) already exists as a generic mechanism; `/command-center` already redirects to `/dashboard?tab=metadata`. Nothing to build. Verify: nav restructuring doesn't change query-param contracts list pages depend on.
- [ ] **Re-key all Hebrew** — a discipline item on every task that adds new-design markup, not a one-time build. Done so far for the chip row (Task 14): 3 new `dictionary.json` keys (`venues`, `metadata_manager`, `menu_intelligence`), all routed through `translatePipe`, none hardcoded. Applies again to every remaining M3-M8 task that introduces new markup.

---

## B. All 4 list screens — Inventory · Recipe Book · Suppliers · Equipment

Do once, apply four times.

- [ ] **Bulk edit** — select many, change a field once. Design has bulk *delete* only.
- [ ] **Row edit panel — desktop only.** Restore the old inline expanding panel (200ms close animation, `clickOutside`, `isSavingEdit_` loader, dirty-row-switch prompt) for desktop widths. Tablet and mobile keep the design's centred modal. *Settled 2026-08-19 — your call.*
- [ ] **Dirty-row-switch prompt** — leaving a half-edited row must offer to save first. (Desktop: part of the row edit panel above. Tablet/mobile: needs its own hook into the modal.)
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
- [ ] **Create unit / label / category inline** — design's dropdowns are closed lists. *Settled 2026-08-19: restore inline creation everywhere it existed before, on top of the design's dropdowns — not routed through Metadata Manager only.*
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
- [ ] **Container: full page, restyled to the new design.** *You said "not sure" — this is my default, not your decision. Flag if wrong.* Reasoning: purchase options is an open-ended `FormArray` plus five collapsible sections; that's more content than any modal in the design carries elsewhere, and the old app already runs it as a page. Redesigning the modal to fit would be new interaction design with no reference — the page keeps the same shape, new skin.

---

## E. Metadata Manager

Design covers 6 vocabularies. These 6 are missing:

- [ ] **User management** (permission-gated) — *placement: your answer was "ok", which doesn't specify where. Default: a 7th vocabulary tile in the same grid, same card pattern, gated so it only renders for permitted users. Flag if you meant somewhere else (e.g. a separate admin route).*
- [ ] **Backup / restore** — same default placement, 8th tile.
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

## H. New data concepts — approved to build 2026-08-19

Not a restoration — none of these existed in the old app either. The design implies or partly
renders them; the app must gain the underlying data. Detail: `gap-analysis.md` §7.

- [ ] **Supplier on the product row + low-stock flag** — Inventory
- [ ] **Secondary yields on a recipe** — Recipe Builder
- [ ] **Per-step labor time and cook time** — Recipe Builder. *Likely satisfied by C's "Per-step dual timers" restoration — that item already carries labor + cook as separate fields. Confirm when C is built; don't duplicate the work.*
- [ ] **Sell price per menu dish → profit per portion** — Menu Intelligence. **New field on the OLD screen** — Menu Intelligence's UI stays exactly as it is (§F), so this is the one item in this section that isn't "copy what the design shows," it's new work landing on old code.
- [ ] **Equipment scaling rule** (per-guests / min / max) — Equipment
- [ ] **Venue address, capacity, contact, operating hours** — Venues. Design's UI already renders a contact block + hours (§6, no-action list) — likely UI is free, only the backend fields are new. Confirm before assuming a UI build is needed.
- [ ] **Per-item trash history + per-section bulk restore** — Trash. Design's UI already has this (§6, no-action list) — same caveat, confirm before assuming a UI build is needed.
- [ ] **Label colours; unit locked flag** — Metadata Manager

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

## Decisions — resolved 2026-08-19

| # | Question | Answer |
|---|---|---|
| 1 | Product form: full page or redesigned modal? | **Full page.** *You said "not sure" — this is my default. See §D.* |
| 2 | Row editing: design's modal or old inline panel? | **Both, split by width.** Desktop → old inline expanding panel restored. Tablet + mobile → design's modal. See §B. |
| 3 | Build the 9 new data concepts, or drop the visual? | **Build them.** See §H. |
| 4 | Where do user management + backup/restore live? | **Two more tiles in the Metadata Manager grid.** *You said "ok" — this is my default, not a specified location. See §E.* |
| 5 | Inline creation: restore, or force through Metadata Manager? | **Restore.** See §C, §D, §E as applicable. |

No open decisions remain. Items flagged *"this is my default"* above (1, 4) are the two calls I made,
not ones you specified — correct them any time before that milestone lands and nothing downstream breaks.

---

## Progress

- **A. Global** — 0 / 6
- **B. List screens** — 0 / 8
- **C. Recipe Builder** — 0 / 19
- **D. Product form** — 0 / 3
- **E. Metadata** — 0 / 6
- **F. Menu Intelligence** — 0 / 2
- **G. Small** — 0 / 3
- **H. New data concepts** — 0 / 8

**Total: 0 / 55**
