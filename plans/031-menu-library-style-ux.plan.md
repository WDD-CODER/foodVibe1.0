# Menu Library style and UX fixes

## Context

- **CSS layer**: All styling must follow `.assistant/skills/cssLayer/SKILL.md`: use tokens from `src/styles.scss` (`:root`), component-scoped tokens in `:host`, five-group vertical rhythm, and existing engines where applicable.
- **Scope**: `src/app/pages/menu-library/` — mainly `menu-library-list.component` (HTML, SCSS, TS).
- **Reference**: Other list pages (e.g. equipment, venues) use `--radius-md` for the main content container; global radii are in `styles.scss`.

---

## a. Container border-radius

- **Current**: `.menu-library-container` uses `border-radius: var(--radius-thin)` (0.125rem).
- **Change**: Use the app's standard content radius: `var(--radius-md)` (0.5rem), consistent with equipment/venues list containers.

---

## b. White space between header and main content

- **Likely cause**: Top margin on `.menu-library-container` (`margin: 1.25rem auto`) creates a gap above the beige box.
- **Plan**: Remove or reduce the top margin (e.g. `margin-block: 0 auto` or `margin-block-start: 0`). If a gap remains, adjust app-content/header.

---

## c. Translation pipe

- **Action**: Audit; ensure any user-facing string uses a dictionary key and `| translatePipe`. Check card subtitle `event.event_type_` — if it is a translation key, wrap with `translatePipe`.

---

## d. Tag "guests" — value to the left of the title (אורחים)

- **Change**: Keep value first in the DOM; use a wrapper with `direction: ltr` or `dir="ltr"` on the number part so "50" stays to the left of "אורחים". (Note: card tag section is removed in item 5, so this applies only if we keep a minimal guests display elsewhere; otherwise N/A.)

---

## e. Date input — click anywhere (except date text) opens the date box

- **Change**: Wrap the date input in a clickable wrapper; on wrapper click call the input's native `showPicker()` if defined. Apply to both from and to inputs (or the single range control in f).

---

## f. Single date-range container (from + to in one box)

- **Current**: Two separate filter items: "מתאריך" and "עד תאריך" with two `<input type="date">`s.
- **Desired**: One container (e.g. `.date-range-wrap`) with both "from" and "to" inputs and sub-labels. If user sets only start date then blurs or Enter: set both `dateFrom_` and `dateTo_` to that date. If both set: filter by range. Remove the second standalone box.
- **Implementation**: Template — one wrapper with two inputs and optional sub-labels. Component — on "from" blur and keydown.enter, if `dateTo_()` is empty set `dateTo_.set(dateFrom_())`. Reuse "click anywhere to open picker" (e) for both inputs.

---

## 5. Tag sections / tag style — remove for now

- **User request**: Tag sections and tag style are unneeded for now.
- **Change**: Remove the `.card-tags` block from the event card template (the four chips: cost, style, guests, sections). Remove or retain the related SCSS (`.card-tags`, `.tag`, `.tag.cost`, `.tag.style`, `.tag.guests`, `.tag.sections`) — retaining is fine for future use; removing keeps the file smaller. Plan: remove the HTML block; optionally remove the unused `.card-tags` / `.tag` styles from the component SCSS.

---

## Implementation order

1. **a** – Container border-radius (`--radius-md` on `.menu-library-container`).
2. **b** – Remove top margin on `.menu-library-container`.
3. **c** – Translation pipe audit (e.g. `event_type_`).
4. **d** – Omit (tag section removed); if a guests display is re-added later, value left of אורחים.
5. **e** – Date inputs: wrapper + `showPicker()` for full-area open.
6. **f** – Single date-range container; "from only → set to = from" on blur/Enter.
7. **5** – Remove `.card-tags` from template (and optionally related SCSS).

Define missing component tokens in `:host` if needed (e.g. `--mll-border-warm` → use `var(--border-warm)` from global; `--mll-break-mobile` define in `:host`).
