# Product defaults

Behaviours this project decided once, so no plan has to repeat them. The project owns this file: the kit seeds it, never
updates it and never writes `status: on` — only the Human turns a default on. A default that is `proposed` or `off` is
ignored by every check; an `on` default is added to every plan that triggers it, built through the piece it names, and
checked by the card or rule it names. Prefer a shared base to a call in every feature: the form base owns the leave
question, the single write path owns the log entry.

Each default is one `### <id>` section with these fields, one `- field: value` line each:

- `status` — `proposed`, `on` or `off`.
- `rule` — one sentence a user would recognise.
- `applies when` — one trigger: `editable-form`, `write-endpoint`, `list`, `destructive-action` or `screen`.
- `plan words` — a RegExp source the plan text is matched against for that trigger (optional: each trigger has a default).
- `how` — a registry family id or a file that already does it.
- `check` — `card` (a person looks at the page once) or the rule data a diff check reads (an `on` default only):
  `files: <globs>; trigger: <regex>; evidence: <regex>; in: <globs>` (`exclude: <globs>` optional) — a changed file that matches
  `files` and `trigger` must show `evidence` itself or in a file matching `in` (`{stem}` = the file's name up to its first dot),
  or `kit-checks` fails naming the default and the piece in `how`. Your stack pack fills the starter lines below; a stack
  without a pattern keeps the card or the note. Existing gaps go in the debt baseline when you turn a default on:
  `node scripts/debt-baseline.mjs --add-kind default.<id>`.
- `card` — page · the one action · the expected result (for `check: card`).
- `exceptions` — where it does not apply, and how a plan declares one: `- <id> — exception — why: <one line>` under
  `## Defaults`.

### unsaved-changes-on-leave

- status: on
- rule: A form with changes asks before the user leaves it, and stays open when the user answers stay.
- applies when: editable-form
- how: src/app/core/guards/pending-changes.guard.ts (canDeactivate in app.routes.ts; the entity-form family)
- check: card
- card: the form's page · change one field, then follow a link out of the page · a question asks whether to leave or stay
- check: files: **/*.component.ts; trigger: \b(?:FormGroup|FormBuilder|FormControl|NgForm|ngModel)\b; evidence: {stem}[\s\S]{0,300}canDeactivate\s*:; in: src/app/app.routes.ts
- exceptions: a read-only form, a search box or a filter bar; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-22

### activity-log-on-write

- status: proposed
- rule: Every change a user makes is recorded in the activity log with who, what and when.
- applies when: write-endpoint
- how: the single write path that owns the log entry (never a log call in each feature)
- check: rule — a changed write endpoint reaches the log call (your stack pack fills the rule data below when it has a pattern)
- check: files: server/routes/**/*.js; trigger: \b(?:router|app)\.(?:post|put|patch|delete)\(; evidence: \b(?:recordActivity|logActivity|activityLog|writeActivity)\b
- exceptions: a system job or a health ping; declare `exception — why: <one line>`

### confirm-destructive-action

- status: on
- rule: An action that deletes or discards data asks the user to confirm first, and does nothing on cancel.
- applies when: destructive-action
- how: src/app/core/services/confirm-modal.service.ts (the shared confirm modal)
- check: card
- card: the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed
- exceptions: an undo that restores the item at once; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-22

### empty-state-on-list

- status: on
- rule: A list with no items shows a short message that says what is missing, never a blank area.
- applies when: list
- how: the shared empty-state piece
- check: card
- card: the list's page with no items · open the page · a message says the list is empty
- exceptions: a list that is never empty; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-22

### loading-and-error-states

- status: on
- rule: A screen that loads data shows that it is loading, and shows a readable error with a retry when loading fails.
- applies when: screen
- how: the shared loading and error pieces
- check: card
- card: the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
- exceptions: a static screen with no data request; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-22

### hints-in-tooltips

- status: on
- rule: An explanation of a control in a dialog shows as a hover tooltip on that control (a title plus an accessible description), not as text on the modal.
- applies when: custom
- plan words: \b(hint|tooltip|explanation|explain)s?\b|רמז|הסבר
- how: native [attr.title] plus [attr.aria-label] or aria-describedby on the control, as the history button of platform-business-dialog does (plan 638); no new tooltip piece
- check: card
- card: a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-19

### unit-dropdown-add

- status: on
- rule: Every unit-of-measure dropdown offers an 'add unit' option that opens the add-unit popup, so a missing unit is created on the spot.
- applies when: custom
- plan words: \b(unit|units|purchase ?unit|baseUnit|measure)\b|יחיד(ה|ות)|מידה
- how: app-custom-select with the add-option row (docs/agent/standards-domain.md Add-option rule) calling UnitRegistryService.openUnitCreator (src/app/core/services/unit-registry.service.ts), as the product form does
- check: card
- card: any screen with a unit dropdown · open the dropdown · an add-unit option is there and opens the add-unit popup; the new unit is selected after saving
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-20

### leave-and-return

- status: on
- rule: When a page sends the user to another page to act (e.g. add a product from the count), the current work is saved without asking, the other page opens prefilled with what the user already typed, and save or back returns the user to where they were with their work restored.
- applies when: custom
- plan words: \b(navigate|redirect|go to|open the .* page|add (a )?new product|returnUrl|come back)\b
- how: a return-to-origin helper (to be added in src/app/core/services/, family page-entry-loading: returnUrl in the query string plus the page's own draft saved before leaving); the auth guard's returnUrl (src/app/core/guards/auth.guard.ts) is the existing pattern
- check: card
- card: the stock count · from a no-match line press add new product · the product form opens with the name filled in, no confirm popup; save or back returns to the count with its numbers kept
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-20

### app-list-container

- status: on
- rule: Every list on a page uses the app's shared list container (app-list-shell with app-page-header), and each row is one c-list-row on a single line at every screen size.
- applies when: list
- how: app-list-shell (src/app/shared/list-shell/) with app-page-header (src/app/shared/page-header/), family list-page in docs/brain/component-families.md
- check: card
- card: any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-20

### one-breakpoint-set

- status: on
- rule: Every screen changes layout at the same three widths: phone up to 767px, tablet up to 1023px, desktop from 1024px; no screen picks its own width.
- applies when: screen
- how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- check: files: src/**/*.scss; trigger: @media[^{]*\(\s*m(?:in|ax)-width:\s*\d+(?:\.\d+)?(?:px|em|rem); evidence: (?!x)x
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-22

### anchored-popup

- status: on
- rule: Every small floating box (popover, tooltip, peek) is as wide as its content and opens beside what was tapped, above or below, on the side with room, never cut off by the screen edge, the way the nutrition box does.
- applies when: custom
- plan words: \b(?:popover|tooltip|peek|popup|pop-up|floating box|floating panel)s?\b
- how: placeInViewport in src/app/core/utils/viewport-placement.util.ts, measured and re-placed on scroll and resize as in src/app/shared/nutrition-badge/nutrition-badge.component.ts; the box takes its content's width (max-content, capped by the screen)
- check: card
- card: any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off
- exceptions: (say where it does not apply)
- turned on: the Human, 2026-11-22
