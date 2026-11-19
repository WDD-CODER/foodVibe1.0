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

- status: proposed
- rule: A form with changes asks before the user leaves it, and stays open when the user answers stay.
- applies when: editable-form
- how: the shared form base (its leave question), or the project's leave guard
- check: card
- card: the form's page · change one field, then follow a link out of the page · a question asks whether to leave or stay
- check: files: **/*.component.ts; trigger: \b(?:FormGroup|FormBuilder|FormControl|NgForm|ngModel)\b; evidence: {stem}[\s\S]{0,300}canDeactivate\s*:; in: src/app/app.routes.ts
- exceptions: a read-only form, a search box or a filter bar; declare `exception — why: <one line>`

### activity-log-on-write

- status: proposed
- rule: Every change a user makes is recorded in the activity log with who, what and when.
- applies when: write-endpoint
- how: the single write path that owns the log entry (never a log call in each feature)
- check: rule — a changed write endpoint reaches the log call (your stack pack fills the rule data below when it has a pattern)
- check: files: server/routes/**/*.js; trigger: \b(?:router|app)\.(?:post|put|patch|delete)\(; evidence: \b(?:recordActivity|logActivity|activityLog|writeActivity)\b
- exceptions: a system job or a health ping; declare `exception — why: <one line>`

### confirm-destructive-action

- status: proposed
- rule: An action that deletes or discards data asks the user to confirm first, and does nothing on cancel.
- applies when: destructive-action
- how: the shared confirm dialog
- check: card
- card: the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed
- exceptions: an undo that restores the item at once; declare `exception — why: <one line>`

### empty-state-on-list

- status: proposed
- rule: A list with no items shows a short message that says what is missing, never a blank area.
- applies when: list
- how: the shared empty-state piece
- check: card
- card: the list's page with no items · open the page · a message says the list is empty
- exceptions: a list that is never empty; declare `exception — why: <one line>`

### loading-and-error-states

- status: proposed
- rule: A screen that loads data shows that it is loading, and shows a readable error with a retry when loading fails.
- applies when: screen
- how: the shared loading and error pieces
- check: card
- card: the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
- exceptions: a static screen with no data request; declare `exception — why: <one line>`

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
