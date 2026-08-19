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
| M8 | Trash / Venues / Suppliers small restorations | ACTION-LIST **G** (3) | Low |

M1 and M2 are unblocked. M3 onward needs the 5 open decisions at the foot of `ACTION-LIST.md`.

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

- [ ] Task 14: rebuild the shell per `UI refactor/shell.js` — 4 tabs (דשבורד / מלאי / ספר מתכונים / תפריטים), per-tab chip rows, bottom tab bar, hero FAB
- [ ] Task 15: restore ACTION-LIST A1–A6 — auth guards & logged-out states, `pendingChangesGuard`, 3-button confirm (Cancel/Save/Discard), toast undo, URL filter state (`q`/`sort`/`order`/`categories`/`?tab=`/`?lowStock=1`), re-key every hard-coded Hebrew string through `translatePipe` + `dictionary.json`

## M4 — List-screen chassis → ACTION-LIST **B**

- [ ] Task 16: build the shared chassis once — bulk edit, dirty-row-switch prompt, per-row deleting loader, empty-database vs no-results, keyboard sort headers, auth gating, inline "add new"
- [ ] Task 17: apply it to Inventory, Recipe Book, Suppliers, Equipment

## M5 — Recipe Builder → ACTION-LIST **C**

- [ ] Task 18: restore C1 first — the ingredient-row unit selector (type-to-filter + create-unit)
- [ ] Task 19: restore C2 — ingredient search must span recipes, not just products (sub-recipes are impossible without it)
- [ ] Task 20: restore C3–C19 — four row states, logistics picker, export toolbar, five-gate save validation, history view mode, drag-and-drop, collapsible sections, weight/volume toggle, duplicate-name check, inline create, labels multi-select, image upload, dual timers, nutrition badge, keyboard, dirty tracking, AI draft mode

## M6 — Product form + Metadata Manager → ACTION-LIST **D**, **E**

- [ ] Task 21: purchase-options `FormArray` + five collapsible optional fields; container decision per open question 1
- [ ] Task 22: add the 6 missing Metadata vocabularies — user management (permission-gated), backup/restore, demo data, menu types, preparation categories, section categories

## M7 — Menu Intelligence → ACTION-LIST **F**

- [ ] Task 23: leave the existing screen's markup and logic untouched; apply only the shell, 3 breakpoints and 44px touch floor

## M8 — Small restorations → ACTION-LIST **G**

- [ ] Task 24: Trash `recoverBeforeRestore`; Venues infrastructure `FormArray`; Suppliers linked-products count

## Open decisions (block M3+)

See the foot of `ACTION-LIST.md` — product form container, row editing (modal vs inline panel), which new data
concepts to build, where user management + backup/restore live, inline creation vs Metadata-Manager-only.

Plus, from M2 Task 12: the `$break-mobile` (768px) vs `$break-phone-max` (767px) collision has no owner yet.
It's not blocking — M1/M2 shipped without touching a single existing selector — but M3's shell should either
absorb it into a real tablet tier or explicitly defer it again.

## Backend Impact

None for M1–M5. M6 Task 22 (user management, backup/restore, 3 new vocabularies) touches persisted entity
types — load `docs/agent/standards-backend.md` and `docs/agent/standards-security.md` before starting it.

## Constraints

- `.c-*` engine classes → `src/styles.scss` only; logical properties only; no hardcoded colours/shadows/radii/blur
- Signals only, `inject()`, `input()`/`output()`/`model()`, no `any`, single quotes + no semicolons in `.ts`
- Hebrew always through `translatePipe` + `dictionary.json`
- `ng build` passes before any commit
