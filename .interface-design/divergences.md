# Divergences — resolved

Six answers, settled against `.interface-design/source/` as it exists on disk (not memory, not
screenshots). Each entry: the decision, the exact value the snapshot uses today with its
file:line, and why. These are binding — a port-spec does not re-litigate them.

---

## 1. Typeface — Heebo

Single family, app-wide. `MenuIntelligence.dc.html`'s 6 `font-family: 'Rubik', var(--font-sans)`
overrides (event-type/serving-type dropdown buttons) are a leftover artifact from an earlier
generation, not a design decision — the token layer, the shell, and every other screen agree on
Heebo. Do not port the Rubik overrides. `--font-sans`'s own fallback chain may still list Rubik
as a system fallback; that's fine, it just never wins against the Heebo import.

- **Value:** `--font-sans: 'Heebo', system-ui, -apple-system, 'Segoe UI', sans-serif` /
  `--font-display: 'Heebo', system-ui, sans-serif`
- **file:line:** `colors_and_type.css:11-12`; `shell.js:98`
- **Artifact (not ported):** `MenuIntelligence.dc.html:120,131` (+4 more, 6 total)

---

## 2. Icon set — Lucide, via the app's existing registration

Lucide throughout. Port using the app's existing `lucide-angular` registration
(`app.config.ts`'s `LucideAngularModule.pick({...})`), not raw inlined SVG. The snapshot itself
delivers Lucide two ways — the shell uses live `<i data-lucide>` tags fed by the Lucide script;
screen bodies paste in Lucide's own path geometry as static `<svg>` markup. Both are the same
icon set, just two authoring shortcuts a static prototype needs and Angular doesn't — the app has
one real mechanism (icon registration) and should use only that.

- **Value:** Lucide loaded from `unpkg.com/lucide@latest`, emitted as `<i data-lucide="...">`
- **file:line:** `shell.js:43` (loader), `shell.js:197` (the `ic()` helper)
- **Inline-SVG shortcut (not ported as markup, only as reference for which glyph):**
  `RecipeBook.dc.html:305`

---

## 3. Emoji — none

Zero emoji in any of the 13 screens or in `shell.js`/`support.js`. Nothing to port, nothing to
strip.

- **Value:** no emoji-range characters found in any `.dc.html` screen or shared runtime file
- **file:line:** n/a (absence confirmed by sweep of `*.dc.html`, `shell.js`, `support.js`)

---

## 4. Native `<select>` — custom everywhere

The design is overwhelmingly custom button+popover dropdowns (RecipeBuilder's portion-unit,
MenuIntelligence's event/serving-type). `MenuLibrary.dc.html`'s 3 native `<select>` elements
(event-type filter, serving-style filter, sort-by) are the one holdout, not the pattern. Port them
to the app's existing custom-select / custom-multi-select shared components instead of introducing
a native `<select>` — keeps the interaction pattern (and its focus/keyboard/RTL handling)
consistent with every other filter/sort control already in the app.

- **Value (holdout, to be converted):** `<select value="{{ eventTypeFilter }}" ...>` /
  `servingStyleFilter` / `sortBy`
- **file:line:** `MenuLibrary.dc.html:118,127,142`
- **Value (the actual pattern, already matches app's custom-select):**
  `RecipeBuilder.dc.html:230-235` (custom button + `sc-if` popover),
  `MenuIntelligence.dc.html:120-134` (same pattern)

---

## 5. Glass opacity — 0.35–0.82, no change

`src/styles.scss` already matches this range. No token change needed for this divergence.

- **Value:** `--bg-glass: rgba(255,255,255,.55)`, `--bg-glass-strong: .72`,
  `--bg-glass-hover: .82`, `--bg-subtle: .35`, `--bg-frosted-nav: .6`, `--border-glass: .45`
- **file:line:** `colors_and_type.css:43-51`
- No 0.88–0.98 outlier values exist anywhere in this snapshot (that was a prior generation's
  divergence, not this one's).

---

## 6. Approve stamp — raster, button-toggled

Raster stamp images swapped by a plain button toggle. The app already has
`src/app/shared/approve-stamp/` — port against that existing component, wiring its
approved/not-approved states to the same two image assets rather than building a new mechanism.

- **Value:** `<button onClick="{{ toggleApproved }}" class="rb-stamp">` wrapping
  `<img src="./assets/stamp-approved.png">` / `<img src="./assets/stamp-not-approved.png">`
- **file:line:** `RecipeBuilder.dc.html:510-515`
- **Assets:** `.interface-design/source/assets/stamp-approved.png`,
  `.interface-design/source/assets/stamp-not-approved.png`
