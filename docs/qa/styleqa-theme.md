# Style QA theme facts

The project's own description of its look. The Style QA visual reviewer reads it to judge a screenshot against what the
project means, not against a generic taste. Keep each line short and concrete; name the token, not the value, where a
token exists. The project owns this file: the kit writes it once and never updates it.

The UI is Hebrew and right-to-left: the start side is the right. Mirrored layouts are correct, not a defect.

## Surfaces

- Page background: `--bg-body`, a pale teal-grey.
- Card / panel background: `--bg-glass` (white) with `--shadow-card` or `--shadow-glass`; `.c-glass-card`, `.c-glass-panel`.
- Raised surface (dialog, menu): white `.c-modal-card` on `.c-modal-overlay`, `--shadow-modal`.
- Borders and dividers: `--border-default`; list rows `--border-row`; focus ring `--border-focus` / `--shadow-focus`.
- Cook View alone switches the app to a kitchen dark mode; every other page is light.

## Primary colour

- Primary action colour (token): `--color-primary`, a deep teal; hover `--color-primary-hover`.
- Its text colour on top: `--color-text-on-primary` (white).
- Where it is used, and where it is never used: primary buttons, active tabs and chips, links. Never for body text or
  large backgrounds. Danger actions use `--color-danger`, warnings `--color-warning`.

## Font

- UI font (token): `--font-sans` (Heebo).
- Headings font, if different: `--font-display` (also Heebo).

## Type scale

- `--fs-xs` 12 meta and tags (the floor), `--fs-sm` 13 labels, `--fs-base` 14 body, `--fs-md` 16 emphasised body,
  `--fs-lg` 18 section title, `--fs-xl` 24 page title, `--fs-2xl` 28 KPI value, `--fs-3xl` 36 hero.

## Spacing scale

- `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 20, `--space-6` 24, `--space-8` 32,
  `--space-10` 40, `--space-12` 48.
- Page gutter at the smallest and the largest width: about 16 px on a phone, 24–32 px on a desktop.

## Component families

- Buttons (kinds and when each is used): `.c-btn-primary` (filled teal, one main action per area; `--danger` and
  `--warning` variants), `.c-btn-ghost` (secondary), `.c-icon-btn` (icon-only, Lucide icons). Radius `--radius-md`
  or pill `--radius-full`.
- Form fields: `.c-input`, `.c-select`, `.c-dropdown`; invalid state `.c-input--invalid` with `.c-field-error` text.
- Cards and lists: `.c-glass-card`; lists are `.c-table` / `.c-list-row` with `.c-grid-header-cell` headers and
  `.c-sortable-header`; chips `.c-chip` (filters, tags, allergens).
- Navigation (top bar, side bar, tabs): a white top header with `--shadow-header`; tabs are `.c-tab-chips`; on a phone
  a bottom bar.
- Dialogs and toasts: `.c-modal-card` (sizes `--md`, `--fluid`) with `.c-modal-actions`; toasts come from the user-msg
  component at the top.

## House rules

Source: `docs/agent/house-style.md`.

- List page: `app-page-header` (title, count, search, actions) over `app-list-shell`; rows `.c-list-row`, one line each.
- Detail page: `app-page-header` with back, content in titled `.c-glass-panel` sections.
- Form page: `app-page-header`, `div.form-section` sections, one `.c-form-actions` row: ghost cancel, one primary save.
- Settings page: `app-page-header`, `app-tab-chips` in `app-scroll-rail`, each group a `.c-glass-panel`.
- Board page: `app-page-header` over a grid of `.c-glass-panel` cards with one gap and one title style.
- Scroll: a phone page scrolls whole; inner areas show `.c-scroll-arrow` arrows (`app-scroll-area`), never a scrollbar.
- Motion: only `--dur-fast`, `--dur-base`, `--dur-slow` with `--ease-spring` or `--ease-smooth`; nothing bounces.
- Empty: `app-empty-state` (`.c-empty-state`, icon plus message), never plain text.
