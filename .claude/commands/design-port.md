# HANDOFF — Design Port, session 1 of ~11

## 0. FIRST: install this file, then use it every session

**If this file is not yet at `.claude/commands/design-port.md`, save it there now**, verbatim,
before doing anything else. Commit it. From then on it is invoked as `/design-port` and is the
standing procedure for every screen — there are 13, roughly 11 sessions, and each one runs this same
file. Do not rewrite or summarize it between sessions; if it needs changing, the Human decides.

If it is already installed, skip this section.

**This file is the complete procedure. It supersedes any earlier `/goal` or `goal-design-port`
prompt text — that was never saved to the project and does not exist. Nothing outside this file and
the repo is needed.**

Read it, verify §1, then do §8.

---

## 1. Verify state first (fast, do not skip)

```
git log --oneline -5
ls .interface-design/                      # expect: system.md, divergences.md, source/
ls .interface-design/source/MANIFEST.md
git ls-tree -r --name-only HEAD | grep -c "interface-design/source"   # expect ~121
git check-ignore -v .interface-design/source/assets/stamp-approved.png  # expect NOT ignored
```

If `.interface-design/source/` is missing or empty, **stop and tell the Human.** The design source was
committed on `chore/vendor-design-snapshot` off `main`. Do not re-vendor it, and never pull the design
from claude.ai / DesignSync / any MCP tool. That cloud project is a **superseded, older generation**
(58 files: `app.html`, `screens.js`, `GlassComponents.jsx`) and a live pull returns a different subset
every session — last attempt read 12 of 58 files in full and inferred the rest. Wrong generation *and*
non-deterministic. `.interface-design/source/` is the original and the only reference.

---

## 2. The goal — read this before anything else

**The objective: the app should look like the design.** The Human built a full visual design for
FoodVibe and wants it adopted — layout, spacing, structure, surfaces, type, colour, responsive
behaviour, the lot. That is the point of this work. Not "inspired by". As close as the design
source allows — the only limit is where the design itself is ambiguous or self-contradictory, never
any loss from vendoring.

**The constraint: don't lose functionality getting there.** The app is production-facing with real
users. So the design is applied as a **skin over the existing Angular components** — restyle in
place, never replace a component with the design's markup, never delete a signal, output, guard,
modal service, keyboard handler, or edge state. HTML structure may change freely; TS logic may not,
except rows explicitly approved as `specified` in Inventory 2.

Both matter, but they are not the same kind of thing. **The design is the goal; functionality is the
floor.** A session that preserves every function and leaves the screen looking like the old app has
**failed**. That is not hypothetical — it is what several prior sessions did, and it is the reason
this procedure exists.

**Why it kept happening:** functionality had a checkable artifact (a 46-item action list) and visual
fidelity had none, so agents optimized for the half that could be scored. Inventory 3 is the fix — it
makes "looks like the design" as checkable as "didn't lose a function". **If you skip Inventory 3, or
thin it out, or fill it with approximations, the session has failed regardless of what else it
produced.**

**One thing that makes this easier than it sounds:** there is no React in the design source. Zero JSX.
It is 13 `.dc.html` files plus `colors_and_type.css`, `mobile-pass.css` and `shell.js` — plain
markup and CSS. This is a styling port, not a framework translation. Design values can be read
exactly, character for character, out of the source files.

---

## 3. Step 0 is COMPLETE — do not redo any of it

| Artifact | Path | Status |
|---|---|---|
| Design source, 121 files (the originals, vendored) | `.interface-design/source/` | vendored, committed |
| Six divergences, resolved + binding | `.interface-design/divergences.md` | written |
| Authority declaration | `.interface-design/source/MANIFEST.md` | written |
| Token/RTL/engine contract | `.interface-design/system.md` | pre-existing |
| `.gitignore` carve-out for `assets/` + `uploads/` PNGs | `.gitignore` | added |

**Do not re-litigate the six divergences.** Settled and binding, full rationale in `divergences.md`:

1. **Typeface — Heebo.** MenuIntelligence's 6 hardcoded `Rubik` overrides are an unreverted
   artifact; do not port them. Rubik stays a fallback inside `--font-sans` only.
2. **Icons — Lucide**, via the app's existing Lucide registration. Do not inline raw SVG even though
   screen bodies in the design source do.
3. **Emoji — none.**
4. **Select — custom everywhere.** MenuLibrary's 3 native `<select>` elements are prototype
   shortcuts; port them to the app's existing `custom-select` / `custom-multi-select`.
5. **Glass opacity — 0.35–0.82.** `src/styles.scss` already matches. No change.
6. **Approve stamp — raster**, `assets/stamp-approved.png` / `stamp-not-approved.png`,
   button-toggled. App already has `src/app/shared/approve-stamp/`.

---

## 4. Facts already established — do not re-derive

- **The token layer already shipped** (Plans 273/274). `src/styles.scss` is ~1845 lines with 71
  `.c-*` engine classes; Heebo/Rubik/Space Grotesk loaded; glass scale, `.c-btn-primary`, `.c-chip`,
  `.c-status`, `.c-eyebrow` in place. Colors and type will mostly already match the design.
  **That is roughly 1% of the port.** Layout, spacing, structure, the page-header pattern,
  breadcrumbs, and responsive behavior have never been ported on any screen.
- **Functionality preservation is largely already solved.**
  `_claude-data/design-migration/ACTION-LIST.md` closed out 2026-08-20: the strategy has always been
  restyle-in-place, so almost nothing was ever at risk. §C confirms all 19 Recipe Builder subsystems
  present. Background reading; do not redo the audit.
- **`_claude-data/design-migration/gap-analysis.md` (485 rows) describes a SUPERSEDED design
  generation** — the old 58-file claude.ai `foodCo Design System` export (`app.html`, `screens.js`,
  `GlassComponents.jsx`, `cook.js`). That export exists nowhere on disk. Its verdicts are
  **background only, never authority.** The current design source (13 `.dc.html` + `shell.js` +
  `support.js` + `mobile-pass.css`) is a different, later architecture.
- **`audit-harness.html`** audits the design against its own rules (horizontal overflow, sub-44px tap
  targets, sub-12px fonts) — it has no knowledge of the Angular app and cannot replace the visual
  diff. Use it only as a *design-side baseline gate*: confirm the mockup itself is clean before
  comparing the app to it.
- **`shell.js:90-92,144` contains a kitchen-theme dark variant.** Out of scope. Do not port, do not
  ask about it.
- **Zero port-specs exist.** `_claude-data/design-migration/screens/` does not exist yet.

---

## 5. Sources of truth, in priority order

1. **`.interface-design/source/`** — **the design source itself.** Not a copy, not a summary: the
   121 original export files, moved from an untracked local folder into version control (byte-for-byte
   verified against the vendor zip). The only acceptable reference for what the design looks like.
   Quote from it by `file:line`.
2. **`.interface-design/divergences.md`** — binding answers to the six conflicts.
3. **`.interface-design/system.md`** — token, surface, RTL and engine-class contract.
4. **`src/styles.scss`** — the 71 existing `.c-*` engines.
5. **`AGENTS.md`** — hard conventions, non-negotiable.
6. `_claude-data/design-migration/*` — background only, stale in places (see §4).

**Authority inside the design source** (per `MANIFEST.md`):

- **Screens of record — the only files that count as "the design":** the 13 screen `.dc.html` files —
  CookView, Dashboard, Equipment, Inventory, MenuIntelligence, MenuLibrary, MetadataManager,
  RecipeBook, RecipeBuilder, Suppliers, Trash, VenueDetail, Venues.
- **Supporting, authoritative:** `colors_and_type.css`, `mobile-pass.css`, `shell.js`, `support.js`,
  `carousel-helpers.js`, `image-slot.js`, `assets/`, `audit-harness.html`.
- **Reference only, not the design:** the 8 other top-level `.dc.html` docs — Brand Assets, Canvas,
  Design Consistency Audit, Design Consistency Checklist, Food Composer Logo, Hero FAB options,
  Refactor Master Plan, Refactor Progress.
- **ARCHIVE — never read as authority:** `v1/` (24 files of superseded version history — reading it
  ports the wrong generation), `screenshots/` (51 iteration/debug PNGs), `uploads/`.

**The screen of record is the `.dc.html` file rendered live in a browser — never a PNG.** There is no
per-screen screenshot of record.

---

## 6. The procedure, per screen

### Step 1 — Registry

Create `_claude-data/design-migration/screens/_registry.md` if absent: one row per screen —
number, screen, Angular path (`src/app/pages/<name>/`), design source file, status `todo`. Use the
order in §7. A screen with no counterpart in the design source is marked `no-design` and skipped — never
invent one.

### Step 2 — Take EXACTLY ONE screen

The first `todo`, or the one the Human names. **One screen per session. Never two.** Write
`_claude-data/design-migration/screens/NN-<screen>.port-spec.md` containing the three inventories
below, **before any code**, then stop.

**Inventory 1 — Old functionality (the master; nothing here may be lost).**
Read every `.ts` and `.html` under the screen's Angular path. List: signals (`signal`, `computed`,
`linkedSignal`), `input()`/`output()`/`model()`, injected services (especially global modal services
and guards), keyboard handlers, drag/drop, focus management, `scrollIntoView` calls, empty / loading
/ error / disabled / permission-gated / RTL-specific states, deep-link query params the screen reads
or writes, anything `@defer`-mounted. Format: `item | file:line | what it does`. This is a
**do-not-touch list** — nothing in it is removed, renamed, or reworded.

**Inventory 2 — New functionality from the design (you classify, Human decides).**
Read the screen's `.dc.html`. List every interaction it shows, tagged exactly one:

- **`specified`** — behavior is defined and the Human asked for it → build it.
- **`inert`** — pixels exist, no handler, no defined scope (e.g. `⌘K` search, notifications bell,
  help button, nav count badges) → port the **visual only**, wire nothing, invent no behavior, log it.
- **`deferred`** — real but out of scope for this screen → written down, not built.

**You never promote a row from `inert` to `specified`.** If you believe a row belongs in `specified`,
say so and stop for the Human's call. Building an inert row is a failure, not initiative.

**Inventory 3 — Visual spec. This is the part that keeps getting skipped and is the point of the
session.**
Walk the screen's `.dc.html` plus `colors_and_type.css`, `mobile-pass.css`, `shell.js`. Map **every**
visual decision to something that already exists:

| Element | Design value (exact, from source) | Maps to | Notes |
|---|---|---|---|
| e.g. KPI card surface | `rgba(255,255,255,0.55)` + blur | `.c-glass-card` | |
| e.g. section gap | `1.5rem` | `--space-6` | |

Rules:
- Every row resolves to an existing `.c-*` engine or a named token in `src/styles.scss`.
- A row that maps to nothing goes under **"Unmapped — needs a call"** and you stop for the Human.
  Never improvise a value.
- Quote design values **exactly from the source file** — never from memory, never eyeballed from an
  image.
- Cover at minimum: surfaces, elevation, spacing, type scale + weight, color, border, radius, shadow,
  hover/active/focus states, and responsive behavior at **1280px** and **390px**.

### Step 3 — Await approval

Post the spec. Stop. Do not write code until the Human replies with an explicit validation word.
Silence, "thanks", or a green build do not count.

### Step 4 — Execute (only after approval)

Restyle in place, per §9 conventions. Build only `specified` rows from Inventory 2; `inert` rows get
visual treatment and no handler.

### Step 5 — Verify

- `ng build` — 0 errors. `ng test` — no new failures.
- Cross-check the built screen against every row in Inventory 3 — confirm each mapped design value
  (surface, spacing, type, color, etc.) was actually applied in the shipped code, not just planned.
  Report any row where the applied value diverges from what Inventory 3 specified.
- Live visual comparison at 1280px/390px is performed by the Human, not by Claude Code. Claude Code
  does not attempt browser-based self-validation of visual fidelity — report readiness for Human
  review instead.
- Re-read Inventory 1 and confirm every row still exists in the code. Report the count.
- Update `_registry.md`: status → `done`, with the spec path.

---

## 7. Screen order (13 screens, ~11 sessions)

1. **Dashboard** ← this session, alone. Calibration screen.
2–5. **Inventory, Recipe Book, Suppliers, Equipment** — share `list-shell` + `carousel-header`, and
`ACTION-LIST.md` §B confirms their functionality is uniform across all four, so Inventory's spec
largely templates the other three.
6–8. **Venues (+ VenueDetail), Menu Library, Metadata Manager, Trash** — smaller surface.
9–11. **Last: Recipe Builder, Cook View, Menu Intelligence** — all three growth-frozen, highest
subsystem count (Recipe Builder alone has 19), Menu Intelligence carries the Rubik override to drop.
Need the pattern proven on the easier screens first.

---

## 8. THIS SESSION — Dashboard port-spec

**Write the spec. Write no code. Stop for approval.**

Create `_registry.md` (13 rows, status `todo`), then
`_claude-data/design-migration/screens/01-dashboard.port-spec.md` per §6.

Screen path: `src/app/pages/dashboard/` — three components: `dashboard.page`, `dashboard-header`,
`dashboard-overview`. Design source: `.interface-design/source/Dashboard.dc.html`.

Screen-specific notes:

- **Known `specified` row:** metadata header where pressing an item scrolls its container into the
  user's view. Confirmed absent from the app — `grep -rn scrollIntoView src/app` returns 5 hits
  (menu-intelligence, cook-view, ingredient-search, recipe-builder ×2), **none under `dashboard/`**.
  This is the worked example of the `specified` tag; treat it as the calibration case.
- Dashboard reads deep-link query params (`?tab=`, `?filters=`, `?lowStock=1`) and KPI tiles
  deep-link into pre-filtered lists. Capture all of it in Inventory 1.
- **Dashboard is the only screen with no `v2-pre-mobile` entry in `v1/`.** Irrelevant — `v1/` is
  archive, do not read it. Noted only so you don't go looking.

**Expected shape of the result**, so you can tell whether it's right: color and type rows should
mostly map cleanly to existing tokens; layout, spacing and structure rows should mostly *not* match
the app. **If Inventory 3 comes back mostly matching, say so plainly and prominently** — that would
mean the design is far closer than assumed and it changes the plan for the other 12 screens. Do not
smooth over that finding either way.

---

## 9. Hard conventions (from `AGENTS.md` — non-negotiable)

- Signals only. `inject()` for DI. `input()`/`output()`/`model()` — never `@Input`/`@Output`. No `any`.
- Single quotes + no semicolons in `.ts`; double quotes in `.html`.
- **`.c-*` engine classes live in `src/styles.scss` ONLY** — never in component SCSS.
- Native CSS nesting, logical properties (`margin-inline`, `padding-block`), five-group rhythm.
- All Hebrew through `translatePipe` + `dictionary.json`. The design hard-codes Hebrew in template
  literals — every string must be **re-keyed**, never pasted.
- Growth-frozen, never add lines: `recipe-builder.page.ts`, `menu-intelligence.page.ts`,
  `cook-view.page.ts`, `product-form.component.ts`, `menu-export.service.ts`. New logic goes in a new
  service or component.
- Scan `src/app/shared/` and the 71 existing engines before creating anything new.
- A job is done only when the Human replies with an explicit validation word.

---

## 10. Stop conditions — stop and ask, do not route around

- design source missing or not committed
- a visual value maps to no existing token or engine
- a design row looks `specified` but the Human hasn't said so
- the design's markup would require deleting or rewriting existing TS logic
- the screen has no design counterpart
- you are about to touch a second screen
- you are about to treat `v1/`, `screenshots/`, or the 8 reference-only docs as authority

---

## 11. Done when

`_registry.md` exists with 13 rows. `01-dashboard.port-spec.md` exists with all three inventories
filled, every Inventory 3 row resolved to a token/engine or listed under "Unmapped — needs a call".
No code written. Stopped for approval.
