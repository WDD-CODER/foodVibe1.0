---
name: Design Migration — UI refactor port with zero functionality loss
overview: Port the `UI refactor/` design (13 screens, .dc.html) onto the live Angular app as a skin, restoring the 46 functions the design left out. Tokens first, then mobile layer, then shell, then screens.
isProject: true
---

# Plan 305 — Design Migration: UI refactor port with zero functionality loss

## Source of truth

| What | Where |
| --- | --- |
| The design | `UI refactor/` (repo root, **untracked**) — 13 `.dc.html` screens + `shell.js` + `colors_and_type.css` + `mobile-pass.css` |
| What the old app does | `_claude-data/design-migration/old-app-inventory.md` (835 lines, read from live source) |
| What the design left out | `_claude-data/design-migration/ACTION-LIST.md` — **46 items, the authoritative sub-task list for M3–M8** |
| Why, per item | `_claude-data/design-migration/gap-analysis.md` |

The claude.ai `foodCo Design System` cloud project (`46ffd0d2…`) is **stale and superseded**. Do not sync it.

## Governing rule

**The design is a skin. Take the new look. Never lose a function.**
A replacement is acceptable only if equal or better. "The design doesn't have it" is never a reason to cut it.
Worked example: the ingredient-row unit selector — the design renders unit as read-only text
(`RecipeBuilder.dc.html`: `unitLabel: i.product ? (UNIT_LABELS[…]) : '—'`). The full select must be rebuilt.

## Decisions — resolved 2026-08-19

| # | Question | Answer |
| --- | --- | --- |
| 1 | Product form container | **Full page**, restyled. *Your answer was "not sure" — this is my default, flag if wrong.* Purchase-options `FormArray` + 5 collapsible sections exceed anything the design puts in a modal |
| 2 | Row editing | **Split by width.** Desktop restores the old inline expanding panel. Tablet + mobile keep the design's modal |
| 3 | New data concepts (9, gap-analysis §7) | **Build all of them** |
| 4 | User management + backup/restore location | **Two more tiles in the Metadata Manager grid.** *Your answer was "ok" — this is my default, not a specified location, flag if wrong* |
| 5 | Inline creation (unit/label/category) | **Restore it**, on top of the design's dropdowns |

Full detail and per-item notes: `ACTION-LIST.md` §B, §D, §E, §H, and its "Decisions — resolved" table.

## Settled decisions

- **Typeface: Heebo.** Plan 273's Rubik + Space Grotesk migration is superseded — the design settled back on Heebo. `--font-mono` drops Space Grotesk for `ui-monospace`.
- **Menu Intelligence: keep the existing screen exactly.** The design's version is discarded by user preference. Port only its mobile logic (M7).
- **Icons: Lucide. Breakpoints: 479 / 767 / 1023. Touch floor 44px. Type floor 12px.** Do not revisit.
- Take the design as-is (no restoration work) for: shell/nav, Cook View, Trash, Menu Library, Venues, Dashboard, all loading/empty/error states.

## Key finding that shapes the plan

`colors_and_type.css:4` declares *"Mirrors src/styles.scss from foodVibe1.0"* — the design's colour and surface
tokens were **derived from the app**, not invented. Verified: surfaces, borders, text, primary, semantic, radii,
shadows, blur, overlay and easing are already identical in `src/styles.scss`.

What the design **added** and the app does **not** have: the numeric scales.
`--fs-*`, `--fw-*`, `--lh-*`, `--tracking-*`, `--space-*`, `--dur-*`, `--tap` resolve to nothing in
`src/styles.scss` today, and the 13 design screens reference them **~2,400 times**. Every ported screen renders
wrong until M1 lands. That makes token parity the gate on everything else, and a pure addition — no existing
declaration changes.

## Milestones

| # | Milestone | Carries | Risk |
| --- | --- | --- | --- |
| M1 | Token parity — `src/styles.scss` scales | — | None (pure addition) |
| M2 | Mobile hardening layer + breakpoint reconciliation | — | Low, one call-out |
| M3 | Shell & navigation — 4 tabs, chip rows, bottom bar, FAB | ACTION-LIST **A** (6) | High |
| M4 | List-screen chassis ×4 — Inventory, Recipe Book, Suppliers, Equipment | ACTION-LIST **B** (7) | High |
| M5 | Recipe Builder | ACTION-LIST **C** (19) | Highest |
| M6 | Product form + Metadata Manager | ACTION-LIST **D** (3) + **E** (6) | Medium |
| M7 | Menu Intelligence — mobile logic only, screen untouched | ACTION-LIST **F** (2) | Low |
| M8 | Trash / Venues / Suppliers small restorations | ACTION-LIST **G** (3) + **H** venue/trash items | Low |

All 5 decisions are resolved (above). No milestone is blocked on a decision anymore.

# Atomic Sub-tasks

## M1 — Token parity (`src/styles.scss` only)

- [x] Task 1: add the type scale to `:root` — `--fs-xs` 0.75rem, `--fs-sm` 0.8125rem, `--fs-base` 0.875rem, `--fs-md` 1rem, `--fs-lg` 1.125rem, `--fs-xl` 1.5rem, `--fs-2xl` 1.75rem, `--fs-3xl` 2.25rem
- [x] Task 2: add weight tokens — `--fw-regular` 400 … `--fw-extrabold` 800
- [x] Task 3: add line-height tokens (`--lh-tight/snug/normal/relaxed`) and tracking tokens (`--tracking-tight/normal/wide`)
- [x] Task 4: add the 8-pt spacing scale — `--space-0` … `--space-12`
- [x] Task 5: add motion durations `--dur-fast/base/slow` and the touch floor `--tap: 44px`
- [x] Task 6: add `--font-display`; change `--font-mono` to drop Space Grotesk in favour of `ui-monospace` per the design
- [x] Task 7: trim the Google Fonts `@import` to Heebo only (Rubik + Space Grotesk unused after Task 6) — closes plan 273's superseded font migration
- [x] Task 8: ~~add the `body.ambient-bg::before` wash~~ — **superseded, no code written.** The design's `.ambient-bg` is declared in `colors_and_type.css:149` but applied by **none** of the 13 screens. The app's `body::before` (`styles.scss:207`) is the same three gradients at higher opacity (0.22/0.14/0.06 vs 0.12/0.08/0.06), applied unconditionally — introduced deliberately by plan 273 Task 2, after the design mirrored the file. Keeping the app's version; writing the design's would be dead CSS *and* a downgrade
- [x] Task 9: `ng build` — must pass 0 errors, and no visual regression (tokens are additive; nothing consumes them yet). Verified in built CSS: all 8 new token groups present, `Rubik`/`Space Grotesk` literal count 0

## M2 — Mobile hardening layer

- [x] Task 10: port `UI refactor/mobile-pass.css` `.m-*` utilities into `src/styles.scss` — `.m-scroll`, `.m-scroll-y`, `.m-above-tabbar`, `.m-fab-lift`, `.m-sheet`, `.m-sheet-card`, `.m-toast`, `.m-toast-abovebar`, `.m-dvh`, `.m-stack`. Deliberately dropped `html, body { overflow-x: hidden }` (would break the app's existing sticky list headers — plan 279) and the `::after` checkmark geometry (app renders the tick as a scaling background SVG, not a pseudo-element)
- [x] Task 11: port the ≤767px iOS focus-zoom guard (16px inputs) and the compact checkbox/radio rules, scoped to `app-root` and using token values (`--radius-xs`, `--radius-full`) instead of the design's hardcoded px
- [x] Task 12: **decision recorded, not resolved** — the 768 vs 767 collision is real (iPad portrait = 768px gets full mobile treatment today) but has no fix yet because there's no tablet tier to fall back to; that tier arrives with the M3 shell. Left `$break-mobile`/`$break-tablet`/`$break-desktop` untouched for existing markup and added `$break-xs-max: 479px` / `$break-phone-max: 767px` / `$break-tablet-max: 1023px` as the design-system tier, with a comment at the declaration site pointing back here. Carried to open decisions below
- [x] Task 13: `ng build` — 0 errors. All 7 `.m-*` classes confirmed present in built CSS. No selector outside the new `@media (max-width: $break-phone-max)` block was touched, so there is nothing existing for a live-viewport check to catch — visual pass at 375/767/768/1023 belongs with M3, once a screen actually consumes these classes

## M3 — Shell & navigation → ACTION-LIST **A**

- [x] Task 14: rebuild the shell per `UI refactor/shell.js` — **rescoped and done**, except 14f which is a flagged decision, not a build item (see notes below)
  - [x] 14a: **4 tabs already exist.** `HeaderComponent` (top nav-pills + bottom tab bar, ≤620px) already reproduces the design's 4-tab structure (dashboard/inventory/recipe-book/menu-library), already glass-pill styled, already fully re-keyed. No rebuild needed
  - [x] 14b: **chip row — new, built.** `TabChipsComponent` (`src/app/core/components/tab-chips/`) — genuinely new UI (no old-app equivalent), composes the existing `.c-tab-pill` engine class rather than inventing one, reads the current URL via Router to pick a chip group, added to `app.component.html` under `<app-header/>`. Verified via `gstack browse`: renders + highlights correctly on `/dashboard`, `/inventory`; navigation confirmed (`/venues` click → `/venues/list`); no console errors attributable to it; visible per `is visible` assertion
  - [x] 14c: mobile collision fixed — `app-header` hides its entire top bar at ≤620px and floats a `position: fixed` avatar button instead; the chip row, now first-in-flow at that width, was landing under it. Added scoped top-clearance padding at the same 620px breakpoint (`src/styles.scss` `.c-tab-chips`)
  - [x] 14d: **hero FAB — tray items now show labels, matching the design's `trayitem` (icon + text pill) instead of bare icon circles.** Logic was already correct (page-specific actions, chef-hat shortcut hidden only on recipe-builder) — only `.html`/`.scss` changed. Verified: expanding the FAB shows `"בונה מתכונים"` as visible text, not just an icon. Labels hidden again ≤620px (icon-only chip, matches the FAB's existing mobile pattern) since there's no room
  - [x] 14e: **brand mark added; wash background was already done (M1 Task 8).** Copied `UI refactor/assets/fc-mark.svg` (18-line self-contained SVG, not the design bundle) to `public/assets/style/img/fc-mark.svg`, added a `routerLink="/dashboard"` logo + "foodCo" wordmark inside `.auth-section` — nesting inside the existing flex:1 auth group rather than as a new top-level flex item, so it doesn't fight the header's documented nav-pill-centering trick. Verified: `img.complete === true`, `naturalWidth: 64` (loaded, not a 404)
  - [ ] 14f: **flagged, not resolved — Dashboard's own embedded sub-nav overlaps the new chip row.** `dashboard-header.component.html` already has its own "ספקים / אשפה / מיקומי אירוע / הגדרות ליבה" row, but it switches an *embedded* view inside `/dashboard` (`tabChange.emit(...)`), while the new chip row navigates to the *standalone* pages (`/suppliers`, `/trash`, `/venues`, `/dashboard?tab=metadata`). Both work, but the dashboard now shows two navigation rows offering overlapping-looking destinations. Old-app behavior, not introduced by this task — needs a decision, not a fix, before M3 is called done: keep both, or have the dashboard's own row link out to the same standalone pages instead of switching an embedded view
- [ ] Task 15: restore ACTION-LIST A1–A6 — **rescoped 2026-08-19: 5 of 6 already exist and are already wired** (auth, `pendingChangesGuard`, the 3-button confirm, toast undo, URL filter state all present in the live app — see `ACTION-LIST.md` §A for the exact services). Only re-keying Hebrew is real, ongoing work, done so far for the chip row. Remaining real work under this task is verification, not construction: confirm Task 14d/14e/14f don't drop any of the 5 existing wire-ups when the visual restyle lands

## M4 — List-screen chassis → ACTION-LIST **B**

- [x] Task 16/17: **rescoped — no shared chassis to build.** Checked all four list components against ACTION-LIST B before writing anything: bulk edit (`editableFields_`/`onBulkEdit`), per-row deleting loader (`deletingId_`), empty-vs-no-results (`isEmptyList_`), auth gating (`requireAuthService`/`[disabled]="!isLoggedIn()"`) already exist on Inventory, Suppliers, Equipment. Nothing to build for those on those three; would need the same check before touching Recipe Book (not yet done — first list screen not audited)
- [x] Task 17a: **row edit panel, desktop only** (decision 2) — done for Equipment + Suppliers, the only 2 of the 4 with an inline panel (Inventory/Recipe Book navigate to a full page instead — decision 2 doesn't apply there). One shared `ng-template #panelBody`, rendered inline on desktop / via a new `[shell-modal]` slot on tablet+mobile. Found + fixed a real bug: the modal was nested inside `.table-area` (`backdrop-filter` ancestor = wrong CSS containing block for `position: fixed`), landing ~31px short of the true viewport edge; fixed with a new projection point in `list-shell.component.html`, outside `.table-area`. Verified via gstack at 1280px and 390px, both screens, all edges flush
- [x] Task 17a-fix: found + fixed a real asymmetry surfaced by the above — Suppliers already split "Cancel button" (no dirty check, deliberate action) from "click outside" (dirty check, accidental dismiss); Equipment had one undifferentiated method with no check at all. Split Equipment's to match Suppliers' established pattern rather than inventing a third behavior
- [ ] Task 17b: **new data — Inventory supplier + low-stock flag.** Not started — Inventory not yet audited against ACTION-LIST H's claim
- [x] Task 17c: **new data — Equipment scaling rule — already built, not missing.** `scaling_enabled_`/`per_guests_`/`min_quantity_`/`max_quantity_` were already live fields in Equipment's edit panel, found while working on 17a. No new code

## M5 — Recipe Builder → ACTION-LIST **C**

- [ ] Task 18: restore C1 first — the ingredient-row unit selector (type-to-filter + create-unit)
- [ ] Task 19: restore C2 — ingredient search must span recipes, not just products (sub-recipes are impossible without it)
- [ ] Task 20: restore C3–C19 — four row states, logistics picker, export toolbar, five-gate save validation, history view mode, drag-and-drop, collapsible sections, weight/volume toggle, duplicate-name check, inline create, labels multi-select, image upload, dual timers, nutrition badge, keyboard, dirty tracking, AI draft mode
- [ ] Task 20a: **new data — Recipe Builder** (ACTION-LIST H) — secondary yields on a recipe
- [ ] Task 20b: confirm Task 20's dual-timer restoration (C item) already carries labor time + cook time as separate persisted fields — if so, close the corresponding ACTION-LIST H item without extra work; do not build it twice

## M6 — Product form + Metadata Manager → ACTION-LIST **D**, **E**, **H**

- [ ] Task 21: purchase-options `FormArray` + five collapsible optional fields, as a **full page** (decision 1) restyled to the new design
- [ ] Task 22: add the 6 missing Metadata vocabularies — demo data, menu types, preparation categories, section categories, plus **user management** and **backup/restore** as two more tiles in the same grid (decision 4), user management permission-gated
- [ ] Task 22a: **new data — Metadata Manager** (ACTION-LIST H) — label colours, unit locked flag

## M7 — Menu Intelligence → ACTION-LIST **F**, **H**

- [ ] Task 23: leave the existing screen's markup and logic untouched; apply only the shell, 3 breakpoints and 44px touch floor
- [ ] Task 23a: **new data — Menu Intelligence** (ACTION-LIST H) — sell price per menu dish → profit per portion. This is new work landing on the **old, unmigrated** screen — not a design copy, since the old screen's UI stays as-is

## M8 — Small restorations → ACTION-LIST **G**, **H**

- [ ] Task 24: Trash `recoverBeforeRestore`; Venues infrastructure `FormArray`; Suppliers linked-products count
- [ ] Task 24a: **new data — Venues** (ACTION-LIST H) — address, capacity, contact, operating hours. Design's UI already renders a contact block + hours (gap-analysis §6) — confirm whether that's UI-complete already and only backend fields are missing before scoping a UI build
- [ ] Task 24b: **new data — Trash** (ACTION-LIST H) — per-item trash history + per-section bulk restore. Same caveat — design's UI already claims this (gap-analysis §6); confirm before assuming new UI work

## Remaining open items

From M2 Task 12: the `$break-mobile` (768px) vs `$break-phone-max` (767px) collision has no owner yet.
It's not blocking — M1/M2 shipped without touching a single existing selector — but M3's shell should either
absorb it into a real tablet tier or explicitly defer it again.

From M3 Task 14c: there is now a **third** breakpoint number in play — `header.component.scss` hides the
entire top bar at 620px, a value that predates both the app's `$break-mobile` (768px) and the design's
`$break-phone-max` (767px). Task 14c worked around it rather than unifying it, on the same reasoning as
Task 12: no tablet tier exists yet to land a real fix in. Three numbers (620 / 767 / 768) is one too many —
worth collapsing once M3's shell restyle gives a real reason to touch `header.component.scss` anyway.

From M3 Task 14f: Dashboard's embedded sub-nav (`dashboard-header.component`) duplicates 3 of the chip
row's 4 destinations via a different mechanism (embedded tab switch vs standalone-page navigation).
Not a defect — both paths work — but worth a decision before M3 is called finished: leave both, or point
the dashboard's own row at the same standalone routes so there's one way to get to Suppliers/Trash/Venues,
not two.

## Backend Impact

None for M1–M5. M6 Task 22 (user management, backup/restore, 3 new vocabularies) touches persisted entity
types — load `docs/agent/standards-backend.md` and `docs/agent/standards-security.md` before starting it.

## Constraints

- `.c-*` engine classes → `src/styles.scss` only; logical properties only; no hardcoded colours/shadows/radii/blur
- Signals only, `inject()`, `input()`/`output()`/`model()`, no `any`, single quotes + no semicolons in `.ts`
- Hebrew always through `translatePipe` + `dictionary.json`
- `ng build` passes before any commit
