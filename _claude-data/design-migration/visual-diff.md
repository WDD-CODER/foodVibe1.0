# Plan 306 — M0 Visual Diff Catalog

Live app (localhost:4200, Guest Admin session) vs `UI refactor/*.dc.html`, captured via gstack browse
at 1280px and 390px. Screenshots: scratchpad `m0-screens/` (not committed — regenerate on demand).

**Headline finding, same pattern as plan 305: most of the app already matches the design.** The
"Liquid Glass" glass-card/teal-accent/backdrop-blur language from plan 273 is already live everywhere.
The real gaps are a handful of concrete, repeatable structural deltas — not a wholesale re-skin.

## Cross-screen patterns (found on 3+ screens — fix once, benefits many)

1. **Filter-panel two generations coexist.** Equipment already matches the design exactly: a "סינון"
   header, filter groups permanently expanded as checkbox lists with live counts, no accordion chrome.
   **Inventory, Recipe Book, and Suppliers still run the older pattern**: collapsed chevron/accordion
   buttons per filter (קטגוריה/ספק/אלרגנים), no "סינון" header. Whatever shared filter-panel component
   Equipment consumes, these 3 screens either aren't wired to it or are on a stale variant. → **M3**,
   scoped tightly: make Inventory/Recipe Book/Suppliers consume the same pattern Equipment already
   proves out. Not a new build.
2. **Missing "N מתוך M [items]" result-count subtitle.** Design shows it under every list/grid title.
   Live has it on Equipment, missing on Inventory, Recipe Book, Suppliers, Venues, Menu Library. → same
   fix, folds into M3.
3. **Shell header: avatar+username sits on the wrong side.** Design puts the avatar/name block at the
   far side opposite the `foodCo` logo (opens the bar). Live puts it adjacent to the logo, same corner.
   Consistent on every screen checked (Dashboard, Inventory, Trash, Suppliers, Equipment, Recipe
   Builder, Cook). → **M2**.
4. Nav-tab / chip label wording differs from the design in places (e.g. live "לוח בקרה" vs design
   "דשבורד"). **Not a CSS issue** — that's a translation/content decision outside this plan's scope.
   Left alone.

## Per-screen findings

| Screen | Delta found | Milestone |
| --- | --- | --- |
| **Shell/Nav** | Avatar placement (pattern 3 above). Nav-pill active-state gradient and avatar `.av` circle otherwise already match. | M2 |
| **Dashboard** | Missing subtitle "סקירה כללית של המטבח" under title (pattern 2). **Activity feed is structurally different**: design renders one full-width chronological list with icon badges + status chips + value-change chips below the 4 KPI cards; live renders a separate narrow "פעילות אחרונה" panel to the left of the KPI cards, different grid position entirely. Confirm real data populates it before judging further — current empty state may be masking the true layout. KPI card order/selection differs slightly from design (cosmetic, not worth matching 1:1). | M5 |
| **Inventory (list)** | Old filter-panel generation + missing subtitle (patterns 1–2). Row zebra-striping present in design (faint alternating tint), absent in live (flat white rows) — minor. | M3 |
| **Recipe Book (list)** | Same as Inventory: old filter panel + missing subtitle. Design additionally exposes a "סטטוס אישור" (approval status) filter facet not present in live's filter panel — check whether that's a real filter live already supports elsewhere before adding new UI for it. | M3 |
| **Menu Library** | List/card structure already close to design. **Filter bar is wrapped in a visible hard border/box in live; design's filter bar is borderless, blended into the page background**, pill-style select fields. Page title/subtitle prominence smaller than design. | M3 |
| **Menu Intelligence** | Could not get a populated menu without a specific ID — captured the empty/new-menu state (ornate bordered card, gold placeholder text). That ornamental treatment is intentional per plan 305 §F ("keep the screen exactly as is"). Revisit with a real menu ID during M10 to check the financial footer bar and toolbar surfaces against the current token scale; expect small, per plan 305's prior audit. | M10 |
| **Cook View** | Hit the screen with no active recipe → generic light "pick a recipe" empty state, not the dark Kitchen-mode cooking screen. Plan 305 already confirmed live's dark Kitchen mode (yield multiplier, timers, progress, celebration) is equal-or-better than the design. Re-verify quickly with a real cook session before M7, but expect near-zero work per that prior finding. | M7 |
| **Trash** | Very close match already — structure, spacing, section grouping all line up. Only the missing result-count subtitle ("N פריטים באשפה") applies. | M3 (subtitle only) |
| **Venues (list)** | **Biggest structural gap found.** Live renders a plain data-table (name / environment-type / capacity / actions columns), same chassis as Inventory/Suppliers. Design renders an image-card grid: photo placeholder, active/inactive status badge, address+capacity icons, "N תפריטים משויכים" chip. This is bigger than "style the new fields" (M4's original scope) — it's a layout pattern swap, table → card grid. Still presentation-only (same data, no functionality lost), but a bigger lift than the rest of M3/M4. Flagged for a scoping check alongside M4, same spirit as M6's Venue Detail question. | M4 (scope check first) |
| **Venue Detail** | No live route exists (confirmed, matches plan's note). Design reference captured for when M6 is resolved: hero image, status badge, address/capacity stats, operating-hours card, contact card, linked-menus list. | M6 |
| **Suppliers (list)** | Old filter panel + missing subtitle — same as Inventory (pattern 1–2). | M3 |
| **Equipment (list)** | **Already matches the design closely** — correct filter-panel generation, has the result-count subtitle, expanded checkbox filters with counts. Use this screen as the reference implementation for M3's fix on the other 3 list screens. | M3 (reference, not a target) |
| **Metadata Manager** | Structure already matches design's tile-grid pattern. Live has 10 tiles vs design's 6 (expected and correct — confirmed in ACTION-LIST §E, all pre-existing functionality). Likely a surface/shadow/spacing polish pass only, no structural change. | M8 |
| **Product form** | No standalone design file exists (design shows it as a modal inside `Inventory.dc.html`; plan 305 decision 1 keeps it a full page live). Live's form (name/category/price/unit + 5 collapsible optional-field buttons) already reads as glass-card/teal-accent styled. M9 should pull field-grouping/spacing conventions from the design's shared form patterns (e.g. the Venue add form) rather than a single dedicated reference. | M9 |
| **Recipe Builder** | Structure already closely matches design: cost/weight box, image slot, rating stars, quantity stepper, ingredient table, prep-steps list. Live's 3 lower sections (אינדקס מרכיבים / תהליך הכנה / לוגיסטיקת מנה) rendered collapsed in this session — may just be a persisted localStorage preference (feature confirmed present in ACTION-LIST §C), not a real default-state mismatch. Verify actual default state before treating as a gap. | M11 |

## Mobile (390px) spot checks

Checked Dashboard and Inventory at 390px against design. Both hold up: bottom tab bar, chip row
wrapping to 2 lines at this width (present in both live and design, not a live-only bug), KPI cards
in a 2-column grid matching design's mobile layout. No new mobile-only deltas found beyond the desktop
findings already listed above (patterns 1–4). Full 390px pass across all 13 screens deferred to **M12**
(cross-screen QA), which already owns the 3-breakpoint sweep — re-litigating it here would duplicate
that milestone's Task 22.

## Milestone-order revision (Task 4)

No milestone gets cut — every one still has real work, unlike plan 305's experience. Two scoping notes:

- **M4** (Venues) needs a scope check before work starts: the table→card-grid swap is bigger than the
  milestone's original one-task budget ("style the new fields"). Recommend treating it as its own
  decision point, same spirit as M6, rather than silently expanding M4's scope.
- **M3** is now precisely scoped: bring Inventory/Recipe Book/Suppliers up to the filter-panel pattern
  Equipment already implements correctly, plus the missing result-count subtitle on Inventory/Recipe
  Book/Suppliers/Trash/Menu Library, plus Menu Library's filter-bar border removal. Equipment itself is
  the reference, not a target.

Milestone order otherwise unchanged: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12.
