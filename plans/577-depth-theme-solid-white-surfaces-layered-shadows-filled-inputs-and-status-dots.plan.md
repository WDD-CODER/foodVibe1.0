# Plan 577 — Depth theme: solid white surfaces, layered shadows, filled inputs and status dots across the app

Status: draft
Depends-on: 572, 576
Snapshot: 5e9247bc3ed5ed2beeb061d926550d87998f5227

## Problem Statement
Dandan compared design directions on a canvas on 2026-11-11 and chose "ליטוש 2 (עומק) עם התגיות והריווח מליטוש 1",
then asked to apply it to every page so he can work in the app and judge it. The choice keeps today's teal, Heebo and
amber line and changes the surfaces: glass only on the navigation chrome, content on clean white cards with soft
layered shadows on a flat tinted page, larger card corners, inputs with a soft fill, and status tags drawn as a small
coloured dot on a white tag. Almost every screen draws its surfaces from the tokens and `.c-*` engines of
`src/styles.scss`, so this plan changes them there once and edits no component file.

Verified on `orch/pass-theme` after merging `origin/main` (2026-11-11):
- `src/styles.scss` light `:root` (from line 22): `--bg-body: #f0f4f8`; `--bg-glass: rgba(255, 255, 255, 0.55)`, `--bg-glass-strong: rgba(255, 255, 255, 0.72)`, `--bg-glass-hover: rgba(255, 255, 255, 0.82)`, `--bg-glass-dense: rgba(255, 255, 255, 0.85)`, `--bg-subtle`, `--bg-muted: rgba(241, 245, 249, 0.6)`; `--border-glass`, `--border-default`, `--border-strong`, `--border-row`; `--color-text-main: #0f172a`, `--color-text-secondary: #1e293b`, `--color-text-muted: #64748b`, `--color-text-muted-light: #94a3b8`; `--radius-md: 0.75rem`, `--radius-lg: 1rem`, `--radius-xl: 1.25rem`; `--shadow-glass`, `--shadow-card`, `--shadow-hover`, `--shadow-glow`; `--bg-header: rgba(255, 255, 255, 0.70)`.
- `body::before` (after `body { … }`) paints three radial colour washes on the light page; `:root.theme-kitchen body::before` replaces them with `var(--bg-page-glow)`.
- Engines that read those tokens: `.c-glass-card` (line 464) and `.c-glass-panel` (482) use `--bg-glass` / `--bg-glass-strong`, `--border-glass`, `--radius-lg`, `--shadow-glass`; `.c-btn-primary` (492) is `linear-gradient(180deg, var(--color-primary), var(--color-primary-hover))` with `border-radius: var(--radius-full)` and `box-shadow: var(--shadow-glow)`; `.c-input` (568), `.c-input-wrapper` (596) and `.c-select` (650) use `background: var(--bg-glass)` and `border: 1px solid var(--border-default)`; `.c-modal-card` (681).
- Chips: `.c-chip` (987) with the colour classes `.teal`, `.amber`, `.red` nested in it, and the modifiers `.c-chip--teal` (2494), `--amber`, `--red`, `--green`, `--allergen` (2526) each set a tinted background, a coloured text and a tinted border. Interactive chips use other modifiers: `--toggle`, `--tap`, `--filter`, `--tab`, `--removable`; `--solid` and `--colored` take their colour from data.
- The dark kitchen theme (`:root.theme-kitchen`, from line 219) sets its own `--bg-body`, `--bg-glass*`, `--border-*`, `--color-text-*` and `--bg-pure`; it does not set `--radius-*`, `--shadow-glass`, `--shadow-card` or `--bg-muted` (it sets `--bg-muted: rgba(255, 255, 255, 0.06)` — verify in Step 0 and keep whatever it has).
- `tools/theme/check-tokens.mjs` (plans 572, 576) is the theme's guard; `.interface-design/system.md` documents the tokens and has the section `## The Pass (plan 572)`.

## Goals & Success Criteria
**Primary:** every light screen shows its content on white cards with soft shadows over a flat tinted page, with
filled inputs, 14 px buttons and dotted status tags, and Cook View's dark theme is unchanged.

- [auto] `node tools/theme/check-tokens.mjs` exits 0 and prints `THEME_TOKENS: ok`, now also requiring in `src/styles.scss` the exact strings `--bg-body: #e6eeee;`, `--bg-glass: #ffffff;`, `--bg-glass-strong: #ffffff;`, `--radius-lg: 1.5rem;`, `--bg-bar: rgba(13, 92, 86, 0.92);` and `/* ---- Depth theme (plan 577): status dot ---- */`, and still requiring `--bg-body: #0a1614;` (the kitchen value).
- [auto] `pnpm run build` passes.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` passes.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] The dashboard, inventory, recipe book, recipe builder, suppliers, settings and the event screen all show white cards on a soft grey-green page, and text is easy to read everywhere.
- [human] Status tags (מאושר, חסר מחיר, אלרגנים) read as a white tag with a small coloured dot; filter and toggle chips still look pressable and show their selected state.
- [human] Cook View in dark mode and the paper menu on the event screen look the same as before.

## Execution Mode
- Parallel: no — it rewrites token values in `src/styles.scss`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
tools/theme/check-tokens.mjs
.interface-design/system.md
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

- INV-none: preserves — global style tokens and engine rules only; no data, permission, schema or server change.

## Reuse Check

- none — no new component, util, pipe, service or `.c-*` class; existing tokens and engines change value.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every screen to look calm and ordered, with the content clearly separated from the background, so that I find things faster.
- As the owner showing foodCo to a customer, I want the app to look like a finished, expensive product.

## Functional Requirements

All changes are in `src/styles.scss`. The value rewrites of existing entries are approved: Human 2026-11-11 (chose the
Depth direction on the design canvas and asked to apply it to all pages). Edit only the light `:root` block unless a
line says otherwise; the `:root.theme-kitchen` block keeps every value it has.

### Must Have (P0)
- [ ] Surfaces: `--bg-body: #e6eeee;` · `--bg-glass: #ffffff;` · `--bg-glass-strong: #ffffff;` · `--bg-glass-hover: #ffffff;` · `--bg-glass-dense: #ffffff;` · `--bg-subtle: rgba(255, 255, 255, 0.6);` · `--bg-muted: #f0f5f5;` · `--bg-header: rgba(255, 255, 255, 0.62);`.
- [ ] Borders: `--border-glass: rgba(11, 31, 29, 0.06);` · `--border-default: #dbe5e4;` · `--border-strong: #c5d3d1;` · `--border-row: #edf2f2;`.
- [ ] Text: `--color-text-main: #0b1f1d;` · `--color-text-secondary: #24403c;` · `--color-text-muted: #4a5f5c;` · `--color-text-muted-light: #7c8f8c;`.
- [ ] Radii: `--radius-md: 0.875rem;` · `--radius-lg: 1.5rem;` · `--radius-xl: 1.75rem;`.
- [ ] Shadows: `--shadow-glass: 0 1px 2px rgba(11, 31, 29, 0.06), 0 16px 32px -22px rgba(11, 31, 29, 0.35);` · `--shadow-card: 0 1px 2px rgba(11, 31, 29, 0.06), 0 20px 40px -22px rgba(11, 31, 29, 0.4);` · `--shadow-hover: 0 2px 4px rgba(11, 31, 29, 0.06), 0 24px 44px -22px rgba(11, 31, 29, 0.45);` · `--shadow-glow: 0 10px 18px -10px rgba(15, 118, 110, 0.55);`.
- [ ] New tokens, added after the `--paper-brown-mute` line under the comment `/* ---- Depth theme (plan 577): the dark bar ---- */`: `--bg-bar: rgba(13, 92, 86, 0.92);` · `--border-bar: rgba(255, 255, 255, 0.28);` · `--color-on-bar: #ffffff;` · `--color-on-bar-muted: #cfe9e5;` · `--color-on-bar-bad: #fecaca;`.
- [ ] Page background: in the light `body::before` rule replace the three-gradient `background:` value and the `background-attachment: fixed;` line with `background: none;` (the flat `--bg-body` shows). The rule `:root.theme-kitchen body::before { background: var(--bg-page-glow); }` stays.
- [ ] `.c-glass-card` hover: replace `box-shadow: var(--shadow-hover), 0 4px 16px rgba(20, 184, 166, 0.08);` with `box-shadow: var(--shadow-hover);`.
- [ ] `.c-btn-primary`: `background: var(--color-primary);` (no gradient) and `border-radius: var(--radius-md);`. Its modifiers (`--danger`, `--warning`) keep their own backgrounds.
- [ ] `.c-input`, `.c-input-wrapper`, `.c-select`: base `background: var(--bg-muted);` and `border-color: transparent;` (keep the 1 px border width so nothing shifts); on focus (`.c-input:focus`, `.c-select:focus`, `.c-input-wrapper:focus-within`) `background: var(--bg-pure); border-color: var(--color-primary); box-shadow: var(--shadow-focus);`. The invalid state (`.c-input--invalid` and its group, line 643) keeps its red border: place the invalid rule after the new base rules or raise nothing else — check that an invalid field still shows a red border.
- [ ] Status dot — add after the `.c-chip--allergen` rule, under the comment `/* ---- Depth theme (plan 577): status dot ---- */`: for `span` elements only, and never for an interactive or data-coloured chip, the colour variants become a white tag with a dot. Selector list (write it once with `:is()`): `span:is(.c-chip--teal, .c-chip--amber, .c-chip--red, .c-chip--green, .c-chip--allergen, .c-chip.teal, .c-chip.amber, .c-chip.red):not(.c-chip--toggle, .c-chip--tap, .c-chip--filter, .c-chip--tab, .c-chip--removable, .c-chip--solid, .c-chip--colored)` → `background: var(--bg-pure); color: var(--color-text-main); border-color: var(--border-default);` and a `::before` with `content: ''; flex: none; inline-size: 0.4375rem; block-size: 0.4375rem; border-radius: var(--radius-full);`. Dot colour per variant: teal → `var(--color-primary)`; amber → `var(--color-warning)`; red → `var(--color-danger)`; green → `var(--color-success-emphasis)`; allergen → `var(--color-allergen-text)` with `border-radius: 1px; transform: rotate(45deg);` (a diamond, so it differs from red in shape, not only in hue).
- [ ] `tools/theme/check-tokens.mjs`: add the strings of the first Done-when item to its required list.
- [ ] `.interface-design/system.md`: update the Surfaces, Text, Borders and Shadows tables to the new values and add the section `## Depth (plan 577)` with five rules: glass only on navigation chrome and the price bar; content on solid white (`--bg-glass` is now white — the name stays for compatibility); one dark hero tile per screen at most; status = white tag with a dot, colour never alone; spacing only from the `--space-*` scale (multiples of 4 and 8).
- [ ] `docs/brain/component-families.md`, family `chip`: one line — status chips on a `span` render as a dot tag (plan 577); interactive chips are `button` or carry `--toggle` / `--tap` / `--filter` / `--tab` / `--removable`.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- RTL is not affected: the dot is the first flex child, so it sits at the start of the tag in both directions.
- No dictionary keys and no icons.
- Left as they are on purpose: `--color-primary*`, the glow tokens, `--blur-*`, the header and bottom navigation rules, the paper tokens, the whole kitchen block.

## Atomic Sub-tasks

- [x] A1: Put the app's content on white surfaces over a flat tinted page — surface, border, text, radius and shadow token values; the page wash removed — src/styles.scss
- [x] A2: Add the colours of the dark bar that the price bar and the dashboard will use — five new tokens — src/styles.scss
- [x] A3: Give buttons and inputs the new shape and fill — primary button solid with 14 px corners; inputs, selects and input wrappers filled, white with a teal border on focus; invalid still red — src/styles.scss
- [x] A4: Draw status tags as a white tag with a coloured dot, leaving pressable chips alone — one rule group after the allergen chip — src/styles.scss
- [x] A5: Guard the new theme and write it down — the token check, the design notes, the chip family line — tools/theme/check-tokens.mjs, .interface-design/system.md, docs/brain/component-families.md
- [x] A6: Run the token check, build, lint, the unit tests, the registry check and the log query, and paste the output lines under Execution Notes

## Technical Considerations
- Dependencies: every component that reads these tokens or engines changes look through them; no component file is edited.
- New files needed: none
- Model changes: none
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none
- Project checks: log-query item present; logical properties only; `.c-*` rules only in `src/styles.scss`; hotspot `styles.scss` — approved value rewrites listed above, the rest are additions.

## Out of Scope
- The price bar's dark look and the dashboard's hero tile (plan 578).
- Component files that hard-code a colour, radius or shadow instead of a token; they keep their look until touched.
- Any change to the kitchen dark theme or the paper menu.
- A dark mode for the office screens.

## Critical Questions
- Q: May existing token and engine values in the `styles.scss` hotspot be rewritten? A: yes — Human 2026-11-11 chose the Depth direction and asked for it on all pages.

## Execution Notes
- Planner 2026-11-11: design source is the canvas boards "ליטוש 2 · עומק" and "ליטוש 1 · חד" (chips and spacing), shown to and chosen by the Human in chat; no Claude Design handoff file exists for it.
- Built by the Planner directly in the cloud session on 2026-11-11, not by an orchestrator builder: after `origin/main` was merged in, the preflight refuses a run from a folder that is not on `main`. Checks run by hand on the result: `THEME_TOKENS: ok`, lint 0 errors, build passes, `TOTAL: 1929 SUCCESS`, `REUSE: registry ok`. No independent reviewer read this diff.
- Deviation: the check looks for the status-dot comment by its opening words, because the comment has two more lines.
