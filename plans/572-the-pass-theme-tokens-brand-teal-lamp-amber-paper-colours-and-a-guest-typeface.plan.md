# Plan 572 — The Pass theme tokens: brand teal, lamp amber, paper colours and a guest typeface

Status: draft
Depends-on: 571
Snapshot: 4ba8887cc16eb5c1c3d3ccd4a0bbb9b63cb6c3c9

## Problem Statement
Dandan approved the "The Pass" theme on 2026-11-10 (chat: "The pass feel good"): one brand teal, one amber "lamp"
that marks what is ready to go out, a paper look for what guests see, and exact-looking numbers. This is step 2 of
that board: put the theme into the token layer so every later screen uses it. No screen layout changes here.

Verified on `origin/main` (4ba8887c, 2026-11-10):
- `src/styles.scss` `:root` (the block that starts at line 22): `--color-primary: #14b8a6;`, `--color-primary-light: #2dd4bf;`, `--color-primary-hover: #0d9488;`. The logo (`public/assets/style/img/fc-mark.svg`) is `#115e59`. `.c-btn-primary` (line 469) paints `linear-gradient(180deg, var(--color-primary), var(--color-primary-hover))` under `--color-text-on-primary: #ffffff`; white on `#14b8a6` has a contrast of about 2.5:1, below the 4.5:1 a reader needs. `--color-primary-strong: #0f766e` already exists for that reason (plan 404).
- `var(--color-primary` is used on 241 lines of component `.scss` files under `src/app/` and 50 lines of `src/styles.scss`. The dark kitchen theme (`:root.theme-kitchen`, from line 219) sets its own `--color-primary: #2dd4bf` and `--color-primary-hover: #5eead4`, so Cook View is not touched by a change to `:root`.
- The glow tokens are literal herb teal and stay: `--color-primary-soft`, `--color-primary-glow`, `--color-primary-glow-strong`, `--border-focus`, `--shadow-glow`, `--shadow-focus` (all `rgba(20, 184, 166, …)`).
- There is no lamp token. Amber exists only as warning tokens (`--border-warning: #f59e0b`, `--color-warning-ink: #b45309`, kitchen `#fbbf24`).
- The paper look of the menu screen has its colours typed by hand: `src/app/pages/menu-intelligence/_paper-ui.scss` (28 hex literals) and `_toolbar.scss` (10). Distinct values: `#fdfdfa`, `#1a1a1a`, `#333`, `#8a7450`, `#c8b890`, `#b0a080`, `#d0c8b4`, `#e8e0d0`, `#5a4a2a`, `#7a6a50`, `#fff`. `:root` already has `--paper-bg: #ffffff`, `--paper-ink`, `--paper-mute`, `--paper-line`, `--paper-soft`, `--paper-pri` (plan 404, export paper).
- `src/app/pages/menu-intelligence/_layout.scss:7` sets `--font-serif: 'Heebo', sans-serif;` on `:host`; 21 rules in `_paper-ui.scss`, 1 in `_toolbar.scss`, 1 in `_layout.scss` and 8 in `components/menu-dish-row/menu-dish-row.component.scss` use it, so today nothing on the paper is a serif.
- `.interface-design/divergences.md` entry 1 says "Typeface — Heebo. Single family, app-wide" and calls the entries binding. `.interface-design/system.md` documents the colour tokens in a table.
- `src/index.html:15` loads one font: `family=Heebo:wght@100..900`.
- `font-variant-numeric: tabular-nums` appears 8 times in component files; no shared class exists for it.
- `docs/brain/component-families.md` has the family `engine-classes` (line 213) for `.c-*` classes.

## Goals & Success Criteria
**Primary:** the token layer carries The Pass: buttons and links are the logo's teal with readable white text, a lamp
token and two engine classes exist for later screens, the paper screen reads its colours from tokens, and the menu
title is set in a real Hebrew serif.

- [auto] `node tools/theme/check-tokens.mjs` exits 0 and prints `THEME_TOKENS: ok`.
- [auto] `pnpm run build` passes with no new budget warning for `menu-intelligence.page.scss`.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` passes.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] The main buttons, active tabs and links are the same deep teal as the logo, and nothing became hard to read on the light screens.
- [human] On the event menu screen the menu title and the section titles are in the serif typeface and every other control still reads well; the paper colours look the same as before.
- [human] Cook View in its dark mode looks the same as before.

## Execution Mode
- Parallel: no — it rewrites two values in `src/styles.scss` and edits `src/index.html` (plan 571 edits the same file).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/index.html
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/_toolbar.scss
tools/theme/**
.interface-design/system.md
.interface-design/divergences.md
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — style tokens, one font link and design notes; no data, permission, schema or server change.

## Reuse Check

- `.c-num` — family: engine-classes — rung: 3 — why: eight component files set tabular digits by hand; one engine class replaces the copies as screens are touched.
- `.c-pass-line` — family: engine-classes — rung: 3 — why: the theme's one signature (the amber line under what is ready) must be drawn the same way on every screen.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the buttons to carry the same colour as the logo and be easy to read so that the app feels like one product.
- As an owner, I want the menu my client sees to look like a printed menu so that it represents my business well.

## Functional Requirements

### Must Have (P0)
- [ ] `src/styles.scss`, light `:root` block only — rewrite exactly two existing values (approved hotspot rewrite: Human 2026-11-10, theme board step 2): `--color-primary: #0f766e;` and `--color-primary-hover: #115e59;`. Change the comment `/* ---- Primary (teal) ---- */` to `/* ---- Primary (patina teal — the logo's colour; plan 572) ---- */`. `--color-primary-light`, every `rgba(20, 184, 166, …)` token and the whole `:root.theme-kitchen` block keep their values.
- [ ] `src/styles.scss`, light `:root` block — add after the `--paper-pri` line, under a comment `/* ---- The Pass (plan 572): lamp, guest typeface, paper palette ---- */`:
  `--color-lamp: #f59e0b;`, `--color-lamp-ink: #b45309;`, `--font-guest: 'Frank Ruhl Libre', 'Heebo', serif;`,
  `--paper-sheet: #fdfdfa;`, `--paper-edge: #1a1a1a;`, `--paper-edge-hover: #333333;`, `--paper-gold: #8a7450;`, `--paper-gold-line: #c8b890;`, `--paper-gold-mute: #b0a080;`, `--paper-border: #d0c8b4;`, `--paper-field-line: #e8e0d0;`, `--paper-brown: #5a4a2a;`, `--paper-brown-mute: #7a6a50;`.
- [ ] `src/styles.scss`, `:root.theme-kitchen` block — add one line at its end: `--color-lamp: #fbbf24;` (with `--color-lamp-ink: #fbbf24;`).
- [ ] `src/styles.scss`, at the end of the file — add two engine classes under a comment naming plan 572:
  `.c-num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }` and
  `.c-pass-line { padding-block-end: 0.125rem; border-block-end: 3px solid var(--color-lamp); }`.
- [ ] `src/app/pages/menu-intelligence/_paper-ui.scss` and `_toolbar.scss`: replace every hex literal with its token, value for value, changing nothing else: `#fdfdfa` → `var(--paper-sheet)`, `#1a1a1a` → `var(--paper-edge)`, `#333` → `var(--paper-edge-hover)`, `#8a7450` → `var(--paper-gold)`, `#c8b890` → `var(--paper-gold-line)`, `#b0a080` → `var(--paper-gold-mute)`, `#d0c8b4` → `var(--paper-border)`, `#e8e0d0` → `var(--paper-field-line)`, `#5a4a2a` → `var(--paper-brown)`, `#7a6a50` → `var(--paper-brown-mute)`, `#fff` → `var(--paper-bg)`. `rgba(…)` values in these files stay as they are.
- [ ] `src/app/pages/menu-intelligence/_paper-ui.scss`: in the rules `.menu-title-input` and `.section-title` only, `font-family: var(--font-serif);` becomes `font-family: var(--font-guest);`. Every other `--font-serif` use, and `_layout.scss:7`, stay as they are.
- [ ] `src/index.html`: the Google Fonts link becomes `https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&amp;family=Frank+Ruhl+Libre:wght@400;500;700&amp;display=swap`. Nothing else in the file changes.
- [ ] New `tools/theme/check-tokens.mjs` (Node built-ins only). Exit 1 with one line per failure, else print `THEME_TOKENS: ok`:
  - `src/styles.scss` contains each of these exact strings: `--color-primary: #0f766e;`, `--color-primary-hover: #115e59;`, `--color-lamp: #f59e0b;`, `--color-lamp: #fbbf24;`, `--font-guest: 'Frank Ruhl Libre', 'Heebo', serif;`, `--paper-sheet: #fdfdfa;`, `.c-num {`, `.c-pass-line {`, and still contains `--color-primary: #2dd4bf;` (the kitchen value) and `--color-primary-glow: rgba(20, 184, 166, 0.25);`.
  - `src/styles.scss` does not contain `--color-primary: #14b8a6;`.
  - `_paper-ui.scss` and `_toolbar.scss` contain no match of `#[0-9a-fA-F]{3,8}\b`.
  - `_paper-ui.scss` contains `var(--font-guest)` exactly 2 times.
  - `src/index.html` contains `Frank+Ruhl+Libre`.
- [ ] `.interface-design/system.md`: in the Primitives table set `--color-primary` to `#0f766e` ("Patina teal — the logo's colour") and `--color-primary-hover` to `#115e59`; add rows for `--color-lamp` (`#f59e0b`, "The pass lamp: only on what is ready to go out") and `--font-guest`; add a short section `## The Pass (plan 572)` with the four rules: one lamp, one mark everywhere, three rooms never mixed (glass = office, dark = kitchen, paper = guest), numbers are the hero (`.c-num`).
- [ ] `.interface-design/divergences.md`: append `## 7. Guest typeface — Frank Ruhl Libre on paper titles only (amends 1)`: Heebo stays the app's typeface; `--font-guest` is used only on guest-facing paper titles; decided by the Human 2026-11-10 with the theme board; value and file:line of the two rules. Entries 1–6 are not edited.
- [ ] `docs/brain/component-families.md`, family `engine-classes`: add one line naming `.c-num` and `.c-pass-line` (plan 572) and when to use each.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- RTL is not affected: the new classes use logical properties only.
- No dictionary keys and no icons.
- The serif has no Hebrew italic; `.menu-title-input` keeps `font-style: italic` as it is today (the browser slants it, as it does for Heebo now).

## Atomic Sub-tasks

- [ ] A1: Make buttons, links and active states the logo's teal so white text on them is readable — two token values and the comment in the light root block — src/styles.scss
- [ ] A2: Add the lamp colour, the guest typeface and the paper palette as tokens — thirteen new tokens in the light block, the lamp in the kitchen block — src/styles.scss
- [ ] A3: Add one shared class for exact-looking numbers and one for the amber ready line — two engine classes at the end of the file, registered in the family list — src/styles.scss, docs/brain/component-families.md
- [ ] A4: Make the menu paper read its colours from the tokens instead of typed values — the eleven value swaps, nothing else — src/app/pages/menu-intelligence/_paper-ui.scss, src/app/pages/menu-intelligence/_toolbar.scss
- [ ] A5: Set the menu title and section titles in a real Hebrew serif — two font-family lines and the font link — src/app/pages/menu-intelligence/_paper-ui.scss, src/index.html
- [ ] A6: Add a check that fails if a theme token is lost or a typed colour returns to the paper files — tools/theme/check-tokens.mjs
- [ ] A7: Write the theme into the design notes so the next design port follows it — system.md tokens and The Pass rules, divergence 7 — .interface-design/system.md, .interface-design/divergences.md
- [ ] A8: Run the token check, build, lint, the unit tests, the registry check and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: every component that reads `--color-primary` (241 lines) changes colour through the token; no component file is edited for that.
- New files needed: `tools/theme/check-tokens.mjs`.
- Model changes: none
- Backend / API: none. The font comes from `fonts.googleapis.com`, the host the app already loads Heebo from.
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; logical CSS properties only; `.c-*` classes only in `src/styles.scss`; Reuse Check filled; hotspot `styles.scss` — two approved value rewrites, the rest is additions.

## Out of Scope
- Using `.c-num` and `.c-pass-line` on screens (plan 573).
- The other `--font-serif` uses on the menu screen (inputs, chips, dish rows) and `_layout.scss`.
- Hard-coded colours in other component files (for example `nutrition-badge.component.scss:98`).
- `rgba(…)` literals in the two paper files.
- Any change to the dark kitchen theme beyond the lamp token.

## Critical Questions
- Q: May a second typeface be added although divergence 1 says Heebo only? A: yes, on guest-facing paper titles only — Human 2026-11-10 approved the theme board that shows it; recorded as divergence 7.
- Q: May two existing values in the `styles.scss` hotspot be rewritten? A: yes — Human 2026-11-10 approved the board's step 2 ("Primary becomes patina teal").

## Execution Notes
- Planner 2026-11-10: contrast of white on `#0f766e` is about 5.5:1 and on `#115e59` about 7.6:1; on the old `#14b8a6` about 2.5:1.
