# Handoff: Cook View refactor (foodVibe1.0)

## Overview
**Start with `PROMPT.md`** (the prompt to paste into Claude Code).
A redesign of the Cook View page (`/cook`, `/cook/:id`) and the shell around it (header, sub-nav chips, bottom tabs, FAB, approval stamp). Goals: glanceable from arm's length, fewer controls on screen at once, one consistent responsive model, readable dark kitchen mode, no emoji, no hard-coded colours.

Scope of this handoff: the Cook View page plus the shell changes it needs. Other pages (list shell, dashboard, builder) are separate handoffs.

## About the Design Files
The files in this bundle are **design references created in HTML**: prototypes that show intended look and behaviour. They are **not production code to copy**. Recreate them in the existing Angular 19 codebase (standalone components, signals, SCSS, `lucide-angular`, the `.c-*` engine classes and tokens in `src/styles.scss`). Do not ship the HTML. Do not introduce Heebo or Space Grotesk; the app keeps **Heebo**.

## Fidelity
**High fidelity.** Colours, type sizes, spacing, radii, breakpoints, and motion are final. Match them using the app's existing tokens where one exists (table below) and add the few new tokens listed.

## Files in this bundle
- `designs/Cook View A.html` + `designs/cook-a.js`: the interactive prototype (all states). Open the HTML; `cook-a.js` holds the behaviour. Use the "⋮" or Export menu, group **מצבי הדגמה**, to jump to: recipe, dish, edit, scaled, export preview, empty.
- `designs/Cook View A Breakpoints.html`: four live frames (390 / 700 / 900 / 1366).
- `designs/Cook View Refactor.html`: before/after static comparison, plus the rejected direction B (focus mode) for reference only.
- `CURRENT-STATE.md`: how the app works today (shell, routes, class system).
- `colors_and_type.css`, `assets/stamp-*.png`: reference only.

## Mapping to the codebase
| Design piece | Repo file(s) |
|---|---|
| Page layout, panes, step cards, edit mode, banners | `src/app/pages/cook-view/cook-view.page.html` / `.scss` / `.ts` |
| Header (dark-mode contrast, tablet density) | `core/components/header/header.component.scss` |
| Sub-nav chips | `core/components/tab-chips` (no logic change) |
| FAB, stamp position | `core/components/hero-fab`, `shared/approve-stamp` |
| Export preview paper | `shared/export-preview` (restyle only) |
| Unit expander on ingredient rows | new small shared component (suggest `app-unit-expander`) |
| Tokens | `src/styles.scss` `:root` |

## Breakpoints (use these four; they replace the mix of 480/620/767/768/900/1023/1200)
| Name | Range | Shell | Panes |
|---|---|---|---|
| Phone | ≤620 | no top header; own top bar (60px) + bottom tab bar (56px) | one scrolling page, both panes stacked, sticky switch buttons |
| Small tablet | 621–767 | app header 62px (user name hidden), sub-nav chips | same stacked page |
| Tablet | 768–1023 | app header, tighter pills | two panes side by side (5fr / 6fr), no switch buttons |
| Desktop | ≥1024 | full header | two panes, gap 24 |

Page content is centred, `max-width:1440px`, inline padding 16px (621–1023) or 24px (≥1024). The header and chips row span the full screen width. The page scrollbar is hidden at all widths (`scrollbar-width:none` plus `::-webkit-scrollbar{display:none}`); no container scrolls internally.

## Layout, by region
**Header (≥621).** Height 62px, sticky, z 30, flex three zones (`flex:1` each side keeps the pill group centred): user chip (start) · nav pills (centre) · brand mark + "foodCo" 15px/800 (end). Padding-inline 16px (≤1023) / 24px. Pill group: padding 4, radius 999, `background:var(--chrome)`, border `var(--chrome-b)`. Pill: padding 7×10, 12px/600, gap 5 (≤1023); padding 8×14, 13px, gap 6 (≥1024). Active pill: `linear-gradient(180deg,var(--act-a),var(--act-b))`, text `var(--act-fg)`, shadow `0 4px 12px -4px rgba(20,184,166,.5)` + inset top highlight. Background `var(--hdr)` with `backdrop-filter:blur(20px)`, bottom border `var(--hdr-b)`, shadow `var(--hdr-sh)`.

**Sub-nav chips (≥621).** Centred row under header, padding 14px 16/24px 0, gap 8. Chip: padding 7×14, 13px/600, radius 999. Active uses the same gradient as the active pill.

**Phone top bar (≤620).** 60px sticky: back (44px round), title 19px/800 ellipsis, theme toggle (44px), ⋮ menu (44px).

**Page header (`.ph`).** Back button 44px round (≥621), title 30px/800, letter-spacing -0.02em, line-height 1.15 (32px at ≥1024); meta chips row below (gap 8): approval chip, cost `₪`, yield `<qty> <unit>`, rating stars. Actions (≥621): theme toggle, "עריכה", "ייצוא ▾". Phone shows only the meta chips; actions live in ⋮.

**Switch buttons (≤767).** Sticky bar under the top bar/header (`top:60px`, `62px` at ≥621), padding 10×20, background `color-mix(in srgb,var(--bg) 88%,transparent)` + blur 16. Segmented control: padding 4, radius 14, background `var(--line)`. Each button 44px high, 15px/700, radius 11, with a counter badge (12.5px/700, radius 999). Order: **שלבים** (steps) first, **מצרכים** second. Behaviour: click smooth-scrolls the page so that pane's top sits below the sticky bars (`scroll-margin-top`: 140px phone, 146px small tablet); while scrolling by hand the active button follows (ingredients become active when the ingredients pane top ≤ offset+40 or the page is at the bottom).

**Panes.** Radius 20, border 1px `var(--chrome-b)`, background `var(--card)`, shadow `0 4px 24px rgba(0,0,0,.08)`, blur 16, `overflow:hidden`. Header: padding 16×20, 15px/800, colour `--soft-ink`, bottom border, counter badge at the end. Under it a 4px progress bar (gradient `--pri`→`--pri-2`, width transition .5s `cubic-bezier(.22,1,.36,1)`). Body padding 16 (phone/≤767) / 18×20×20. On phone and small tablet steps come first in DOM order via `order:-1`; at ≥768 ingredients come first (visual right column in RTL).

**Ingredient row.** Container radius 16, border 1px `--line`, background `--card`. Main line min-height 60, padding 0 14 (0 12, gap 10 at 768–1100), gap 14: checkbox 30×30 radius 9 border 2px `--mute` (checked: fill `--pri`, rotate -6°, scale 1.06, spring `cubic-bezier(.34,1.56,.64,1)` .25s), name 17/600 (checked: strikethrough, `--mute`; `min-width:96px` at 768–1100), amount 19/800 tabular, unit 14 `--mute`.
- Rows with a secondary unit show a unit chip at ≥768 (34px high, padding 0 10, radius 999, `--soft` fill, chevron). At <768 the unit shows plain with a faint ⇄ icon.
- All rows have a scale button (`scale` icon, 34px round) at ≥768; hidden at 768–1100 when the row already has a unit chip (the same action is in the expanded area).
- **Expander** (replaces any modal or bottom sheet): the row grows in height; content in a wrapper using `display:grid; grid-template-rows:0fr → 1fr`, transition .32s `cubic-bezier(.22,1,.36,1)`. Open row: border `--pri-2`, background `--card-s`. Contents: (1) unit options, a grid `repeat(auto-fit,minmax(92px,1fr))` gap 8, each 48px high radius 14, label + converted amount, current one has a check, fill `--soft`, border `--pri-2`; (2) the "scale to this ingredient" action (see below).
- Open triggers: unit chip or scale button (≥768); **long-press 500ms** on the row (<768). Move tolerance 8px; vibrate 12ms if supported; the following click is suppressed 700ms; `contextmenu` prevented on rows. A hint line under the scale chips (<768): "לחיצה ארוכה על מצרך: יחידת מידה והתאמת המתכון". Keyboard: Enter/Space on the row toggles the check; the chip is a real button.
- One row open at a time. Click outside closes. Choosing a unit closes the row.

**Quantity controls (view mode, not scaled).** Chips ×½ ×1 ×2 ×3 **×4** (keep all five existing `MULTIPLIER_CHIPS`; the prototype shows four) and a counter (− value + , 36px round buttons, value 17/800). **Also keep the yield-unit select** (`app-custom-select`, chip variant, 44px high) right after the counter, and the conversion badge (`×1.25`) when the selected yield unit differs from the recipe's; the prototype omits them. Chips: 44px high, min-width 44, padding 0 8, radius 999, selected `--pri` fill. Wrap allowed. Labels must be wrapped in `<span dir="ltr">` so RTL shows "×2" not "2×".

**Step list.**
- Done row: button, min-height 48, radius 14, 15px `--mute`, check circle 26px `--pri` fill, text ellipsis, undo icon. **The whole row is clickable and reopens the step.**
- Active card: radius 22, padding 18/18/16, background `--card-s`, border 2px `--pri-2`, shadow `0 16px 36px -18px rgba(20,184,166,.55)`. Label "שלב N · פעיל עכשיו" 13/700 `--soft-ink` with a 8px dot. Text **21px/500, line-height 1.5, colour `var(--ink)`** (must not inherit the global `p` colour; it vanished in dark mode otherwise).
  - Countdown (only if the step has a cooking time): block radius 16, background `--soft`, time 44/800 tabular, reset (48px round, outlined) and play/pause (48px round, `--pri`). Finished: background `--warn-bg`, time `--warn`, opacity pulse .8s.
  - **Stopwatch (every active step, recipe mode):** dashed border row radius 16, label with `watch` icon, time 28/800 tabular, reset + play/pause (44px round). Resets when the active step changes.
  - Done button: full width, 56px, radius 16, 17/800, `--pri` fill, check icon, label "סיימתי". Press scale .97.
- Pending row: button, min-height 56, radius 16, number circle 30px, text 16/500 ellipsis, optional "⏱ N ד׳" badge. Press scales to 1.02.
- **Step-change animation** (the only click animation on the page): when "done", "undo", or a pending row is pressed, the card that becomes active plays `grow` .55s `cubic-bezier(.34,1.56,.64,1)`: 0% scale .97, ring 0 → 45% scale 1.04 with a 10px ring `rgba(20,184,166,.25)` → 100% scale 1. It must not replay on timer ticks or other updates.
- Completion: banner `--soft`, radius 20, padding 18, 18/800, "הבישול הושלם" with a `party-popper` icon.

**Floating elements.** Keep the existing `app-approve-stamp` and `app-hero-fab` as they are today (stamp: physical right, bottom-right chrome; FAB at inline-end; both clear the phone tab bar). The only requirement is bottom padding on the page (150px phone / 130px otherwise) so content never ends underneath them. The prototype's sizes (64/84px) are illustrative; keep your current 3.5rem / 3rem sizes. In the prototype the stamp is a button that toggles approval; in the app it already calls `onApproveStamp()` (login required, confirmation, master-scope prompt), unchanged. FAB: opens page actions plus "בונה מתכונים", unchanged.

## Modes and states
1. **View (recipe)** – described above.
2. **Dish** – quantity unit "מנות"; steps pane is "רשימת הכנה (מיז אן פלאס)"; each item shows amount (34/800) and name; no timer, no stopwatch; third export item is "צ׳קליסט הכנה".
3. **Edit** – amber banner "מצב עריכה" (13/800, letter-spacing .12em, `--warn` on `--warn-bg`, blinking dot). Actions: "שמירה" (primary) and "ביטול שינויים". On phone these sit in a fixed bar above the tab bar (`bottom:56px`). Ingredient rows: name, − [input] + stepper (steps: 0.1 for ק״ג/ל׳, 10 for גרם/מ״ל, else 1), unit label, delete. Step cards: number, minutes input (0 = no timer), delete, text area (min 2 rows), "הוסף שלב" dashed button. Save commits the draft; cancel discards. In dish mode only ingredients are editable here (reuse `app-recipe-workflow` for real workflow editing as today).
4. **Scaled to an ingredient** – semantics: "I only have X of this ingredient; recalculate everything." Flow: expand row → "התאם את המתכון למצרך זה" → input (prefilled with current amount) with a live line "המתכון יחושב מחדש: ×F · N <unit>" → Enter or "חשב מחדש". Result: `qty = baseYield × (X / baseAmountInSelectedUnit)`; every amount, cost and yield recalculates; the source row gets a "מצרך מקור" pill and a `--pri-2` border; scale chips and counter hide; a banner appears (radius 16, `--soft`): "המתכון חושב לפי **<name>**:" + editable amount with −/+ + yield + "חזרה למתכון המלא". Editing the banner amount recalculates live. The amount follows the ingredient's currently selected unit.
5. **Export preview** – white paper modal (always light, text `#0f172a`), max-width 640, max-height 90vh, radius 20, header with title + "ייצוא" (primary `#0f766e`) + "הדפסה" + close; body title 26/800, subtitle `<qty> <unit> · ₪<cost>`, content: info (ingredients + steps), shopping list (checkbox boxes + amounts), steps (numbered, with minutes). Body scrolls without a visible scrollbar. Reuse `app-export-preview`; restyle only.
6. **Empty** – centred icon (utensils 48), "בחרו מתכון לבישול", primary "ספר המתכונים", recent-recipe chips under "מתכונים אחרונים".

## Dark kitchen mode
Class on the page root (today `theme-kitchen`). Use the token set below; the header must be visibly lighter than the page.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f0f4f8` | `#0a1614` (page also `radial-gradient(ellipse 1200px 800px at 50% -10%,#0f2e2a,#0a1614 60%)`) |
| `--card` | `rgba(255,255,255,.78)` | `rgba(255,255,255,.06)` |
| `--card-s` | `#fff` | `#14302d` |
| `--ink` | `#0f172a` | `#f1f5f4` |
| `--mute` | `#64748b` | `rgba(226,240,236,.74)` |
| `--line` | `rgba(15,23,42,.10)` | `rgba(255,255,255,.14)` |
| `--pri` | `#0f766e` | `#14b8a6` |
| `--pri-2` | `#14b8a6` | `#2dd4bf` |
| `--on-pri` | `#fff` | `#04211e` |
| `--soft` | `rgba(20,184,166,.12)` | `rgba(20,184,166,.20)` |
| `--soft-ink` | `#0f766e` | `#5eead4` |
| `--warn` / `--warn-bg` | `#b45309` / `rgba(245,158,11,.16)` | `#fbbf24` / `rgba(245,158,11,.20)` |
| `--hdr` | `rgba(255,255,255,.70)` | `rgba(24,58,54,.94)` |
| `--hdr-b` | `rgba(15,23,42,.08)` | `rgba(255,255,255,.18)` |
| `--hdr-sh` | `0 1px 8px rgba(0,0,0,.05)` | `0 10px 30px -12px rgba(0,0,0,.7)` |
| `--chrome` / `--chrome-b` | `rgba(255,255,255,.80)` / `rgba(15,23,42,.10)` | `rgba(255,255,255,.10)` / `rgba(255,255,255,.22)` |
| `--act-a` / `--act-b` / `--act-fg` | `#0d9488` / `#0f766e` / `#fff` | `#2dd4bf` / `#14b8a6` / `#04211e` |
| `--tab` | `rgba(255,255,255,.88)` | `rgba(24,58,54,.95)` |

Mapping to existing tokens: `--ink`→`--color-text-main`, `--mute`→`--color-text-muted`, `--pri-2`→`--color-primary`, `--card`→`--bg-glass`, `--line`→`--border-default`, `--warn`→`--text-warning`. New tokens to add: `--pri` (AA-contrast primary for white text, `#0f766e`), `--soft-ink`, `--hdr*`, `--chrome*`, `--act-*`. **Contrast:** white text on `#14b8a6` is only ~2.5:1; use `--pri`/`--act-b` (`#0f766e`) behind white text. Also set `color:var(--ink)` explicitly on `h1` and the active step `p`; the global `h1`/`p` colour rules otherwise make them dark-on-dark.

## Typography (Heebo)
Page title 30/32px 800; top-bar title 19/800; pane header 15/800; switch buttons 15/700; chips 13/600; ingredient name 17/600, amount 19/800; active step 21/500 lh 1.5; countdown 44/800; stopwatch 28/800; done button 17/800; pending step 16/500; hint 12.5/500. Numbers use `font-variant-numeric:tabular-nums`. No emoji anywhere; icons are Lucide (see Assets).

## Interactions and motion
- Hover: soft fill + border `--pri-2`; chips lift 1px. Press: scale .94–.99 (done button .97, pending row 1.02).
- Only the step-change `grow` animation plays on click. Remove entrance pop animations; no floating stamp animation.
- Row check: spring .25s. Progress bars: .5s. Expander: .32s. Respect `prefers-reduced-motion` (all animation/transition off).
- Timer: counts down per second; at 0 the block turns warning and pulses until reset or pressed.
- Menu (⋮ on phone / "ייצוא" on desktop): width 300, radius 20, items 48px high; edit, export (view + download per kind). Anchored to its trigger (`left:0`), closes on outside click.

## State
`mode` view|edit; `type` recipe|dish; `qty` (number, in recipe yield units); `scaled` {sourceIndex}|null; `chk` set of ingredient indexes; `done` set of step indexes; `active` index; `rem` seconds; `run`, `fin` timer flags; `sw`, `swRun` stopwatch; `unit` map index→chosen unit; `um` open expander index; `setBy` index in scale-to-ingredient input; `draft` {ingredients, steps} while editing; `preview` null|info|shop|steps; `approved`, `rating`; `dark`. Persist `dark`, `qty`, `chk`, `done`, `active`, `unit` per recipe. Derive: displayed amount = base amount × (qty / baseYield) × unitFactor; progress counters.

## Data and behaviour notes
- Secondary units come from the unit registry (`availableUnits` per row today); the design's conversions (1 cup = 240 ml etc.) are placeholders.
- Timer, stopwatch, export, scaling and approval logic already exist (`cookTimer`, `cookExport`, `scaleBy…`, `onApproveStamp`); this redesign restyles and rearranges them. New behaviour: stopwatch on every step (check it exists for steps without a cooking time), clickable done rows, ingredient-row expander, scrolling single-page layout below 768px, editable scaled-banner amount.
- Edit-mode save/undo and pending-changes guard unchanged.
- New translation keys needed (add via the translation-key flow): `unit_of_measure`, `scale_recipe_to_ingredient`, `recalculate`, `source_ingredient`, `recipe_calculated_by`, `long_press_ingredient_hint`, `add_step`, `back_to_full_recipe` (exists), `awaiting_approval`, `stopwatch` (exists), `edit_mode` (exists).

## Assets
Lucide icons used: arrow-right, moon, sun, ellipsis-vertical, pencil, download, eye, printer, x, check, undo-2, timer, timer-reset, watch, play, pause, rotate-ccw, plus, minus, trash-2, save, scale, pin, chevron-down, arrow-left-right, flask-conical, flame, chef-hat, utensils, party-popper, star, clock, layout-dashboard, package, book-open, library, circle-user-round. All must be registered in the app config (existing lint). Images: `assets/stamp-approved.png`, `assets/stamp-not-approved.png` (existing app assets). Brand mark: use the existing `fc-mark.svg` (the prototype draws a placeholder "fC" tile).

## Read this first: reality check against the current code
This section was added after reading `cook-view.page.html/.scss/.ts`, `header.component.scss`, `hero-fab.component.scss`, `approve-stamp.component.scss`. Where it conflicts with the sections above, **this section wins**.

### Behaviour that already exists and must be preserved (the prototype simplifies it)
- **Login gates.** Edit, approve-stamp and rating require sign-in (`isLoggedIn`; disabled with title `sign_in_to_use`, or opens the auth modal). Keep.
- **Save flow.** `saveEdits()` asks master scope (`masterPush.askScope`) for cloned recipes, otherwise a `save_changes` confirm. Keep; the prototype's instant save is illustrative.
- **Scale by ingredient.** Today `confirmScaleByIngredient()` opens a confirm modal (`scale_recipe_confirm`, label `convert`) before `applyScaleByIngredient()`. Product decision needed: keep the confirm, or drop it because the live preview line makes the result visible first. Recommended: drop it (the action is reversible with "חזרה למתכון המלא").
- **Edit mode** keeps `app-recipe-workflow` for steps and prep items (it has labour time, cooking time, categories, sort, focus handling). The prototype's simple step editor is only a visual guide for the container; restyle the existing component, do not replace it. Ingredient edit keeps `app-custom-select` for units (native `select` is lint-banned), `replaceIngredient`, `removeIngredient`, amount stepper using `quantityIncrement/Decrement`.
- **Timers.** `CookTimerService` already has countdown (`cookingTimeSecs`) and a stopwatch (`startStopwatch(si)`) per step. The prototype's stopwatch row is a restyle of the existing stopwatch pill, and it appears for every active recipe step.
- **Timer pills on non-active steps.** When a timer or stopwatch is running on a step that is done or pending, the current UI shows a pill in that card's head (`cv-step-timer-pill`, alert variant when finished, tap to dismiss). The prototype does not draw these. Keep them, restyled as compact pills at the end of the done/pending row (height 28, radius 999, 12/700, `--soft` fill; alert: `--warn-bg`/`--warn`, with ✕). Also keep the finished-timer alert border on the card (`--color-danger`).
- **Hero timer chip.** Today the hero shows the running timer ("שלב N · 08:12"). The prototype has no hero. See the decision below; at minimum keep a compact chip in the page header meta row (`--soft` fill; alert: warning colours and pulse) whenever a timer is active.
- **Export** keeps `CookViewExportService` (`onViewRecipeInfo`, `onExportInfo`, shopping list, cooking steps or dish checklist, preview/print). The old expanding export bar becomes the menu (view + download per item).
- **Unit options per ingredient** come from `row.availableUnits` plus the "+ יחידה חדשה" entry (`unitRegistry.openUnitCreator()`); show that as the last option tile in the expander (dashed border). Overrides stay display-only (`unitOverrides_`, `getDisplayAmount`).
- **Default theme.** `isDarkTheme_` currently defaults to **true** (dark). The prototype opens in light for review. Keep the app's default unless the product owner decides otherwise.
- **Auto-scroll to active step.** `scrollToActiveStep()` uses `scrollIntoView(center)`. With the single scrolling page below 768px, give step cards `scroll-margin-top` equal to the sticky bars (140/146px) and use `block:'start'`.

### Decisions the prototype did not make (ask the product owner, or use the recommendation)
1. **Recipe photo hero.** The current page has a photo hero (image, scrim, approved and cost badges, title, rating, prep progress). The prototype replaced it with a text header and meta chips (progress now lives in pane headers). Recommendation: if `recipe.imageUrl` exists, show a slim banner behind the page header (height 120px phone / 180px desktop, radius 20, bottom scrim) holding the title and chips in white; with no image show the plain header exactly as in the prototype. Do not reinstate the 320px hero.
2. **Desktop scroll model.** The current shell is a fixed-height grid (`.cv-shell` height `calc(100dvh - 11.75rem)`) with each pane scrolling internally plus scroll-indicator chevrons. The prototype uses normal page scroll at every width (no inner scrollbars, panes grow with content, `align-items:start`). Recommendation: follow the prototype; remove the fixed height, `scrollIndicators` directive usage and `.cv-pane-scroll-indicator*`.
3. **Outer card.** Today the page sits in a rounded, max-width 1100 container with margins. The prototype is full-bleed with a 1440px content max-width; panes are the only cards.

### Theme scope (important; affects other pages)
Today dark mode is a class on `.cook-view-container` (`theme-kitchen`) and only retints the page body; the app header, tab-chips row, bottom tab bar, FAB and stamp stay light. The design dark-modes the whole viewport. Implementation: have `CookViewPage` add `theme-kitchen` to `document.documentElement` (and remove it in `ngOnDestroy`), and define the dark values by overriding the global tokens under `:root.theme-kitchen` (`--bg-body`, `--bg-glass`, `--bg-glass-strong`, `--bg-frosted-nav`, `--border-glass`, `--border-default`, `--color-text-main`, `--color-text-muted`, `--color-primary-soft`, plus the new `--hdr*`, `--chrome*`, `--act-*` tokens). Then convert hard-coded colours in `header.component.scss` (`.nav-pills`, `.user-chip`, `.avatar-guest`, bottom nav, profile menu), `.c-tab-pill` and `.c-icon-btn` in `styles.scss` to those tokens, otherwise the header stays light-on-dark-page and is invisible or glaring. Verify every other page still renders correctly in light mode (the class is only present on Cook View).

### Class map: current → new
| Current (`cook-view.page`) | Action |
|---|---|
| `.cook-view-container` (max-width 1100, radius, margin-block) | Remove card styling; keep as a plain wrapper (`max-width:1440px; margin-inline:auto; padding-inline:16/24px`). |
| `.cv-shell` (fixed height, `overflow:hidden`, edit/scaled borders) | Remove fixed height and overflow. Edit/scaled get banners, not bordered shells (drop `.edit-mode` border and `.scaled-view` glow). |
| `.cv-nav`, `.cv-nav-title`, `.cv-theme-toggle` | Replace by the page header (back + title) and the theme toggle button (44px round) in header actions / phone top bar. |
| `.cv-hero*` | Replace per decision 1. Keep `.cv-hero-timer` behaviour as the header timer chip. |
| `.cv-actions-row`, `.edit-btn`, `.export-bar-*`, `.save-btn`, `.undo-btn` | Replace by header actions (`.pill-btn`) and the export menu; save/undo become primary/secondary pills (and the fixed bottom bar on phone). |
| `.edit-mode-banner` | Restyle (amber, 13/800, letter-spacing .12em, blinking dot). |
| `.scaled-view-banner`, `.back-to-full-recipe-btn` | Restyle per "Scaled" state; banner gains the editable amount. |
| `.cv-scale-bar`, `.cv-multiplier-chips`, `.cv-chip-btn`, `.cv-chip--active`, `.quantity-control-wrap`, `.qty-btn` | Restyle (see Quantity controls). Keep `app-counter` and the yield-unit `app-custom-select`. |
| `.cv-phone-swap-bar`, `.cv-phone-swap-btn`, `phoneFirstPane_`, `swapToPane()` | Delete; replace with the sticky switch buttons that scroll the page (`scrollToPane('steps'|'ingredients')` plus a scroll listener setting the active button). |
| `.cv-body` grid 320px / 1fr | `grid-template-columns: minmax(0,5fr) minmax(0,6fr)` at ≥768, single column below. |
| `.cv-pane-divider` | Delete. |
| `.cv-ing-pane`, `.cv-step-pane`, `*-header`, `*-title`, `.cv-ing-badge`, `.cv-step-counter`, `.cv-ing-progress-*` | Restyle as pane cards with header + 4px progress bar. |
| `.cv-ing-body`, `.cv-step-body`, scroll indicators | Remove `overflow-y:auto`, remove `scrollIndicators` directive and indicator elements. |
| `.cv-ing-row`, `.cv-ing-check`, `.cv-ing-name/amt/unit`, `.set-by-ingredient-btn` | Restructure into `.ing` container: main line + collapsible expander (unit options, scale-to-ingredient). Row tap still toggles the check. |
| `.col-scale-action`, `.convert-scale-btn`, `.cancel-set-by-btn`, `.setting-by`, `.row-highlight` | Move into the expander's scale form (input, "חשב מחדש", "ביטול", live preview line). |
| `.cv-step-card`, `--active/--done/--pending`, `.cv-step-card-head/body`, `.cv-step-num`, `.cv-step-active-label`, `.cv-step-done-btn`, `.cv-step-tool-btn`, `.cv-step-tools-row` | Replace with the three row types (done row, active card, pending row); tools row becomes the countdown block plus stopwatch row; add the `grow` animation class on the newly active card. |
| `.cv-step-timer-pill*`, `.cv-step-card--timer-alert`, `.cv-step-status-chip*` | Keep behaviour, restyle as compact row pills; the undo chip becomes the whole done row being clickable. |
| `.cv-complete-banner` | Restyle; replace the 🎉 emoji with the `party-popper` icon. |
| `.ingredients-table*`, `.edit-amount`, `.remove-ingredient-btn` | Edit mode ingredient list: restyle as `.ied` rows (name, − input +, unit select, delete), keep `app-custom-select`. |
| Emoji in template (🧪 ⏱ ⌚ ✓ 🎉) | Remove everywhere; use Lucide icons. |
| `app-approve-stamp`, `app-hero-fab`, `app-export-preview`, `app-rating-stars` | Keep; restyle export-preview paper only. |

### Implementation order (each step ships and is testable on its own)
1. **Tokens and theme scope.** Add the new tokens, `:root.theme-kitchen` overrides, `html.theme-kitchen` toggling from `CookViewPage`. No visual change in light mode. Test: other pages unchanged; Cook View dark now retints the whole viewport.
2. **Header and chips tokenization** (`header.component.scss`, `.c-tab-pill`, bottom nav, `.c-icon-btn`). Test: header visible and readable in dark and light on every route; pills, user chip, brand unchanged in layout.
3. **Breakpoints and page frame.** Replace container/shell with the frame (header zone untouched), unify to 620/767/768/1023. Test: four widths, equal margins, no horizontal overflow.
4. **Page header and meta chips** (title, approval chip, cost, yield, rating, timer chip, actions, theme toggle, export menu). Test: exports, rating, approve, login gates.
5. **Panes and ingredient rows**, then the expander (units, scale-to-ingredient with live preview and editable banner). Test: checks, scaling, unit override, "+ יחידה חדשה", long-press on phone.
6. **Steps** (done/active/pending rows, countdown, stopwatch, row pills, grow animation, clickable done rows). Test: timer finish alert, marking done, undo by tapping the row, auto-scroll offset.
7. **Single scrolling page below 768** (switch buttons, scroll spy, no inner scrollbars, hidden page scrollbar). Test: phone and small tablet, both panes reachable, buttons track scroll.
8. **Edit mode** (banner, header actions, phone save bar, restyled ingredient list, restyled `app-recipe-workflow`). Test: save with master scope, cancel restores, pending-changes guard.
9. **Dish mode, empty state, export preview skin.** Test: dish recipe, `/cook` with no recipe and recent chips, print.
10. **Cleanup.** Delete dead classes from the class map, remove the emoji, run `npm run lint`, `npm run lint:icons`, unit tests, then Playwright e2e for `/cook`.

### Shared components touched (regression list)
`header` (all routes), `tab-chips` (all routes), `.c-tab-pill`, `.c-icon-btn` (all list pages), `hero-fab`, `approve-stamp`, `export-preview` (also used by menu intelligence), `scroll-rail`. After steps 1–2 click through dashboard, inventory, recipe book, menu library, suppliers and venues in light mode on phone, tablet, desktop.

### New translation keys
`unit_of_measure`, `scale_recipe_to_ingredient`, `recalculate`, `source_ingredient`, `recipe_calculated_by`, `long_press_ingredient_hint`, `add_step`, `awaiting_approval`, `timer_chip_step`. Existing and reused: `back_to_full_recipe`, `stopwatch`, `edit_mode`, `mark_step_done`, `step_done_label`, `prep_workflow`, `prep_list_mise_en_place`, `ingredients_index`, `export_*`, `pick_recipe_to_cook`, `recent_recipes`.

### Screenshots
`screenshots/` holds frames of the prototype in light, dark, dish, edit, scaled, export preview and empty states at one width. They are for orientation only; the HTML prototype is the source of truth. The capture tool re-renders the DOM, so small artifacts appear (for example the quantity counter drawn over the first ingredient row and the stamp over content); in the real prototype these elements do not overlap.

### Gap resolutions (these override anything above)
1. **Countdown pause/reset needs service work.** `CookTimerService` only has `startTimer` / `cancelTimer`. Add `pauseTimer(si)`, `resumeTimer(si)` and `resetTimer(si)` (reset = back to `cookingTimeSecs`, paused). Play/pause toggles pause and resume; the first press starts. Pausing keeps the remaining seconds. This is logic work, not only restyle; add unit tests. The stopwatch already has start/stop/reset; reuse it.
2. **Stopwatch does not reset on step change.** Keep today's behaviour: a stopwatch (and a countdown) keeps running when the user moves to another step and shows as a pill on that step's row. Ignore the earlier line "resets when the active step changes".
3. **Edit mode ingredient unit** keeps `app-custom-select` with `setIngredientUnit` and the "+ יחידה חדשה" entry. The prototype's plain unit label is only a placeholder.
4. **Changed-field highlight** (`ingredientChanged`) stays in edit mode, restyled with `--warn-bg` fill and `--warn` border on the changed amount/unit.
5. **Quantity counter in edit mode:** keep it visible while editing, as today; hide only the multiplier chips and the scale-to-ingredient actions. Ignore the prototype hiding everything.
6. **Unlinked ingredients** (no linked product) stay italic with their tooltip.
7. **"All ingredients ready" badge** stays: when every ingredient is ticked, show it in the ingredients pane header next to the counter (`--soft` fill, `check` icon, 12/700).
8. **Phone edit bar vs FAB and stamp.** While `isEditMode`, hide the FAB (`app-hero-fab`) and move the stamp up by the bar height (`bottom: calc(56px + 64px + 12px)`), or hide it too if it still overlaps; page bottom padding becomes 190px in edit mode. At ≥621 the actions live in the page header, so nothing moves.
9. **Back button destination:** use the history-aware back the app already uses elsewhere (`Location.back()` with a fallback to the recipe book `/recipe-book` when there is no history entry, e.g. a deep link). Do not add a new route.

### Step clocks (supersedes the countdown/stopwatch blocks above)
The two opt-in **icon-only** round buttons sit in the active card's label row, at the end beside "שלב N · פעיל עכשיו" (36px; 28px on phone, `.lab`), not below the text. Pressing one removes that button from the row and opens its clock container below the step text; removing a clock (✕) brings the button back. Button spec: ( `timer` and `watch`; the timer starts at the step's cooking time if it has one, else 5:00; `title`/`aria-label` carry the names). All clock buttons (reset, play/pause, remove, add) are the same 44px circle at ≥621px. On phone (≤620) they are 24px circles with 13px icons and an invisible 10px tap-area extension, and the clock time is 30px.
Countdown and stopwatch rows share one layout at every width: time first (start side, 36px/800 tabular; 30px on phone), then the button group (reset, play/pause, remove). The stopwatch row has no label or icon of its own. Pressing one adds that clock to the step and starts it. Maximum two clocks per step (one countdown + one stopwatch); a pressed button disappears. Each clock has reset, play/pause and a remove (✕) button. The countdown time is tappable: it becomes an input (`mm:ss` or plain minutes), Enter/blur commits, Escape cancels; committing sets the new base time and pauses. Clocks keep running when the user moves to another step and show as pills on that row.

### Prototype status vs this spec
The prototype (`designs/Cook View A.html`) implements: per-step clocks with opt-in icon buttons, editable timer, pills on other steps, ready badge, phone edit-bar offsets for FAB/stamp. It does **not** draw (implement from the text): quantity counter, ×4 chip and yield-unit select; edit-mode unit select and changed-field highlight; italic unlinked ingredients; timer pills' alert border on cards; back-button fallback; photo hero. Where the prototype and this README differ, this README wins.

## Acceptance checklist
- Each of the four breakpoints matches the Breakpoints page; header edges flush at 768/900/1366; content equal margins.
- Light and dark mode: header visibly separated from the page; active-step text readable; no dark-on-dark text.
- Phone: one scrolling page, no inner scrollbars, switch buttons scroll and track; long-press opens the expander without ticking the ingredient.
- Done rows reopen steps; only the newly active card animates.
- Scale-to-ingredient: recalculates all amounts, cost and yield; banner amount editable; reset restores base.
- Edit mode: save and cancel work on phone bar and desktop header; no data lost on cancel.
- Stamp sits bottom-right (physical) at all widths and never covers content (page padding).
- Keyboard: rows toggle with Enter/Space; chips and buttons focusable with the app's focus ring.
- No emoji; no hard-coded hex outside the token table.
