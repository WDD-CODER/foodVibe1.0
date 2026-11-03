# foodVibe — Interface Design System

## Domain

Professional kitchen management. The vocabulary that shapes every decision:
- **mise en place** — prep before service; the organizing logic behind list views
- **the pass** — hot lamp, food exits; the amber accent belongs here
- **brigade** — hierarchy and role; drives permission-gated UI states
- **station** — each cook's territory; cards are stations (bounded, focused, owned)
- **yield** — waste coefficient; numbers in this app carry cost consequence
- **scaling** — batch adjustments; quantity interactions must feel precise, not decorative
- **recipe index** — the knowledge book; this is the core artifact the app protects

---

## Intent

**Who:** A chef or kitchen manager — mobile, often standing, sometimes with damp hands. Opens the app mid-service or during prep. Needs fast reads, not exploration.

**What:** Build a recipe, check ingredient costs, scale a portion, brief the brigade.

**Feel:** Calm like a well-run kitchen. Organized without being sterile. Warm tools, not cold software. The interface should feel like a well-maintained kitchen notebook — structured, trusted, worn-in.

---

## Signature

**Frosted glass = kitchen steam.** The `backdrop-filter` + `rgba` surfaces aren't borrowed from iOS — they are condensation on the pass window, misted walk-in glass, steam rising off a bain marie. Every glass surface is earned by the domain. This must never drift toward generic glassomorphism. The steam metaphor is load-bearing.

---

## Color System

**Font:** Heebo (Google Fonts, weight 100–900). Hebrew/Latin bilingual. Weight does the hierarchy work — lean into it.

**Canvas:** `#f0f4f8` — cool blue-gray, walk-in refrigerator interior. Never pure white.

**Background radial overlay** (fixed, z-index -1):
```
radial-gradient(ellipse 600px 400px at 15% 20%, rgba(20,184,166,0.12), transparent),
radial-gradient(ellipse 500px 500px at 80% 70%, rgba(251,191,36,0.08), transparent),
radial-gradient(ellipse 400px 300px at 50% 50%, rgba(14,165,233,0.06), transparent)
```
Teal (herb) + amber (pass lamp) + sky (steel reflection). Do not remove or simplify.

### Primitives

| Token | Value | Why |
|---|---|---|
| `--color-primary` | `#14b8a6` | Herb green / patinated copper |
| `--color-primary-hover` | `#0d9488` | Deeper copper when active |
| `--color-primary-soft` | `rgba(20,184,166,0.12)` | Tinted surface tint |
| `--color-primary-glow` | `rgba(20,184,166,0.25)` | Focus glow |
| `--color-accent-gold` | `#a0833f` | Pass lamp amber / saffron |
| `--color-danger` | `#dc2626` | Destructive actions only |
| `--color-danger-hover` | `#b91c1c` | Danger button hover state |
| `--color-warning-hover` | `#b45309` | Warning button hover state |
| `--color-success` | `#10b981` | Approval / saved states |

### Surfaces (elevation, light → high)

| Token | Value | Level |
|---|---|---|
| `--bg-body` | `#f0f4f8` | Canvas |
| `--bg-subtle` | `rgba(255,255,255,0.35)` | Lowest surface |
| `--bg-muted` | `rgba(241,245,249,0.6)` | Muted fill |
| `--bg-glass` | `rgba(255,255,255,0.55)` | Card base |
| `--bg-frosted-nav` | `rgba(255,255,255,0.6)` | Navigation |
| `--bg-glass-strong` | `rgba(255,255,255,0.72)` | Elevated panel |
| `--bg-glass-hover` | `rgba(255,255,255,0.82)` | Hover/active card |
| `--bg-pure` | `#ffffff` | Highest — modal, input interior |

Elevation rule: higher surfaces are more opaque (more white), not a different hue. Never shift the hue between elevation levels.

### Text Hierarchy (four levels)

| Token | Value | Use |
|---|---|---|
| `--color-text-main` | `#0f172a` | Primary — headings, labels, values |
| `--color-text-secondary` | `#1e293b` | Body copy, descriptions |
| `--color-text-muted` | `#64748b` | Metadata, supporting labels |
| `--color-text-muted-light` | `#94a3b8` | Placeholders, disabled |
| `--color-text-on-primary` | `#ffffff` | Text on teal backgrounds |

### Borders (progression, weakest → strongest)

| Token | Value | Use |
|---|---|---|
| `--border-row` | `rgba(241,245,249,0.4)` | Table row separators |
| `--border-glass` | `rgba(255,255,255,0.45)` | Glass card edges |
| `--border-default` | `rgba(226,232,240,0.6)` | Standard separation |
| `--border-strong` | `rgba(203,213,225,0.7)` | Emphasis borders |
| `--border-focus` | `rgba(20,184,166,0.5)` | Focus rings — teal |

All borders use `rgba` — never solid hex. Solid hex borders are harsh. The rule: borders should be findable, not seen.

### Shadows

| Token | Use |
|---|---|
| `--shadow-glass` | Base card rest state |
| `--shadow-card` | Elevated card |
| `--shadow-modal` | Modals and overlays |
| `--shadow-hover` | Card on hover |
| `--shadow-glow` | Teal accent glow (focus, avatar hover) |
| `--shadow-focus` | Focus ring shadow |
| `--shadow-nav` | Top nav bottom shadow |
| `--shadow-nav-footer` | Bottom nav top shadow |

---

## Depth Strategy

**Approach: Layered subtle shadows + surface opacity shifts.**

Do not mix in harsh borders or dramatic elevation jumps. Every depth transition should be whisper-quiet — you feel the hierarchy, you don't see it announcing itself.

- Sidebar: same background as canvas, separated by `--border-glass` only
- Dropdowns: one opacity level above parent surface
- Inputs: `--bg-muted` or slightly darker than surroundings (inset feel)
- Modals: `--bg-pure` at maximum opacity, `--shadow-modal`

---

## Blur (Glass Effect)

| Token | Value | Use |
|---|---|---|
| `--blur-glass` | `blur(16px)` | Cards and panels |
| `--blur-nav` | `blur(20px)` | Navigation (::before) |
| `--blur-modal` | `blur(24px)` | Modals |

Always apply blur on `::before` pseudo-elements on positioned parents (not the element itself) when the element has `position: fixed` children — this preserves the viewport as the containing block for dropdowns.

Reduced on mobile: 10px / 12px / 16px respectively.

---

## Spacing

Base unit: **4px (0.25rem)**. All spacing is multiples of 4.

| Scale | Value | Context |
|---|---|---|
| micro | `0.25rem` | Icon gap, tight inline |
| xs | `0.375rem` | Button internal gap |
| sm | `0.5rem` | Component internal spacing |
| md | `0.75–0.875rem` | Card internal padding |
| lg | `1rem–1.25rem` | Section padding |
| xl | `1.5rem` | Between card groups |
| 2xl | `2rem+` | Page-level padding |

---

## Radius Scale

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `0.25rem` | Tiny chips, micro elements |
| `--radius-sm` | `0.375rem` | Inputs, small buttons |
| `--radius-md` | `0.75rem` | Standard buttons, controls |
| `--radius-lg` | `1rem` | Cards, panels |
| `--radius-xl` | `1.25rem` | Large cards, cook-view sections |
| `--radius-full` | `999px` | Badges, avatars, pill buttons |

Sharper = more technical. Rounder = more approachable. Mix within this scale only — never ad-hoc values.

**`50%` rule:** `border-radius: 50%` is permitted only on elements with an explicit equal `width` and `height` (avatars, FABs, circular badges). For pill shapes with variable width, always use `--radius-full` (999px).

---

## Animation

| Token | Value | Use |
|---|---|---|
| `--ease-spring` | `cubic-bezier(0.22,1,0.36,1)` | Transforms, hover lifts |
| `--ease-smooth` | `cubic-bezier(0.4,0,0.2,1)` | Color, opacity transitions |

- Micro-interactions: 150–200ms
- Component transitions: 250ms
- Never use spring/bounce in professional tool interfaces

---

## Navigation Pattern

**Desktop (≥1024px):** Sticky horizontal top bar, `height: 3rem`. Blur applied via `::before`. Active links: teal text + `--color-primary-soft` background.

**Tablet (768–1023px):** Same top bar, tighter padding, no hamburger.

**Mobile (≤620px):** Minimal top bar (auth only) + fixed bottom tab bar `height: 3.5rem`. Bottom bar: `--bg-glass-strong` + `--blur-glass` + `--border-glass` top edge. Active tab: teal text + `translateY(-1px)` on icon.

RTL-aware: `margin-inline-start: auto` for auth section pushes correctly in RTL.

---

## Engine Classes

Pre-built surface + behavior combos. Use these before writing one-off styles.

| Class | What it is |
|---|---|
| `.c-glass-card` | Glass surface + hover lift (translateY -2px + shadow-hover) |
| `.c-glass-panel` | Glass surface, no hover lift |
| `.c-btn-primary` | Teal fill button + glow shadow + spring hover |
| `.c-btn-ghost` | Glass fill button + default border |
| `.c-input` | Form input (see cssLayer skill) |
| `.c-input-wrapper` | Input container with icon slot |
| `.c-select` | Custom select trigger |
| `.c-modal-*` | Modal surface classes |
| `.c-dropdown` | Dropdown panel |
| `.c-chip` | Pill chip |
| `.c-table-wrap` | Table container |

Full engine source: `src/styles.scss`. New patterns must extend these — no divergent one-off surfaces.

---

## RTL

- All layouts use logical properties: `padding-inline`, `margin-inline`, `border-inline-start`, `inset-inline`
- Root containers carry `dir="rtl"`
- Never use `left`/`right` in new styles — always `inline-start`/`inline-end`
- Exception: fixed-position chrome elements with an intentional physical corner (e.g. the hero FAB is always bottom-left). Use physical `left`/`right` and add a comment explaining the exception.
- Text direction: Hebrew canonical values flow RTL; Latin metadata may appear inline

---

## Semantic Colors

| Purpose | Background | Text | Border |
|---|---|---|---|
| Success / approved | `--bg-success` | `--text-success` (#166534) | `--color-success` |
| Warning / edit mode | `--bg-warning` | `--text-warning` (#92400e) | `--border-warning` (#f59e0b) |
| Danger / destructive | `--bg-danger-subtle` | `--color-danger` (#dc2626) | — |

Semantic colors are desaturated slightly — they communicate state without dominating the visual field.

---

## Dialog patterns

Rules from the validation of plan 515 (run test-514-515). No orchestrator agent reads this file yet (only `/design-port` does).

- R1: A field is one bordered box: the search input and its container are the same element, never a box inside a box.
- R2: A choice that needs more than one field opens its own view inside the dialog and never expands the form that triggered it.
- R3: A picked value shows inside the same field with an X that clears it, with no separate read-only block or "change" link.
- R4: Escape goes one step back: close the open list, then leave the sub-view and discard its unsaved input, then close the dialog.
- R5: In a single-line field Enter moves to the next field; in the last field it submits only that view, and only when valid, otherwise it shows the error on the first invalid field.
- R6: A picker field that holds a selection shows only the name at the start and the X at the end, slightly bold, so it reads as chosen and not as text still being typed.
- R7: A control that reveals more fields is a `c-chip c-chip--tap` button with `aria-expanded`, never a native `details`/`summary`.
- R8: Form fields in a grid use `grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr))`, the same pattern as `.inquiry-row`, so an input never widens its track.

---

## What to Avoid

- Solid hex borders (use rgba always)
- Dramatic surface color jumps (shift opacity, never hue)
- Multiple accent colors (teal is the only action color; gold is accent-only, never interactive)
- Gradients for decoration (only meaningful gradients: cook-view header, body radials)
- Spring/bounce easing on professional tool interactions
- Pure white card on colored background
- Ad-hoc spacing values outside the 4px grid
- Large border-radius on small elements
- Mixing depth strategies (no shadows + solid borders on same surface)
