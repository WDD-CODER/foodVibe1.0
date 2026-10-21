# Plan 467 — Fix the new-inquiry form, the deposit step and the phone stage bar

Status: draft
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
The Human validated the menu library and event screen on branch `mvp` and reported three problems (handoff `docs/mvp/review-handoff-2026-10-21.md`, F1–F3). F4–F6 of the same section are in plan 470.
1. **F1 — new inquiry form.** (a) The flame menu on `/menu-library` shows two actions with the same file-plus icon («תפריט חדש», «פנייה חדשה»). (b) On a phone the date field takes no typing and shows `mm/dd/yyyy` (US order) in a Hebrew app. (c) The desktop backdrop bug is owned by plan 460 (A8) and is NOT fixed here.
2. **F2 — «מקדמה שולמה».** Moving an event to this stage asks for nothing about the payment. The deposit date and amount can only be typed later, in the folded «פרטי לקוח» block.
3. **F3 — stage bar on a phone.** The stage pills sit in a plain sideways-scrolling row; the Human wants a carousel like the metadata section chips.

**Verified in code (mvp, b7d21fb):**
- F1a: `src/app/pages/menu-library/menu-library.page.ts:33-34` registers both flame-menu actions with `icon: 'file-plus'`; the list header inquiry button uses it too (`menu-library-list.component.html:22`). `FilePlus` is registered at `src/app/app.config.ts:42,179`; `BookPlus` and `PhoneIncoming` exist in the installed `lucide-angular` but are not registered.
- F1b: `new-inquiry-dialog.component.html:47` is a native `<input type="date">`. A native date input draws its parts in the browser's own language (US order on an English phone) and the page cannot change that, so the fix is a text field in day/month/year order plus a calendar button, not an attribute. The same native input is used by the stage bar's deposit date (`event-stage-bar.component.html:124`).
- F2: the sentence "asks only for a date" is the EVENT date rule: `pick()` in `event-stage-bar.component.ts:96-97` calls `needsDateFor`, which only refuses when the event has no event date (`event-stage-ui.util.ts:41-44`). Nothing asks about the payment. The model already has the fields: `deposit?: { amount?: number; date?: string }` (`menu-event.model.ts:175`, `shared/schemas/entities/menu-event.schema.ts:140-143`) and `deposit` is already a money field (`shared/schemas/money-fields.ts:12`), so the server already validates it and lets only the owner write it. No schema, route or stage-history change is needed.
- F3: `.stage-row` (`event-stage-bar.component.scss:16-26`) is a bare `overflow-x: auto` flex row. The shared `app-scroll-rail` (`src/app/shared/scroll-rail/`, plan 350) already gives the metadata section chips their edge fade and arrows (`metadata-manager.page.component.html:6`), so it is reused. Its centring behaviour (handoff G3) belongs to plan 468; this plan does not edit the rail.

**Not verified (no browser in this session):** how each phone browser draws the native date field; that is why the field is replaced instead of patched.

## Goals & Success Criteria
- Primary: the flame menu tells the two actions apart, a date can be typed day/month/year on a phone, a deposit move records what was paid, and the stage bar scrolls like the section chips.
- Success:
  - [ ] [auto] `npx ng test --watch=false --include='**/date-input.util.spec.ts' --include='**/date-field*.spec.ts' --include='**/deposit-paid-dialog*.spec.ts' --include='**/event-stage-bar*.spec.ts' --include='**/new-inquiry-dialog*.spec.ts'` passes, including: typing `25122026` shows `25/12/2026` and emits `2026-12-25`; `31/02/2026` is invalid and emits nothing; picking «מקדמה שולמה» as the owner opens the deposit dialog and moves nothing until saved; saving sends the stage move and then `deposit: { amount, date }`; a staff user (no money edit) moves straight through with no dialog.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [auto] `npx ng build` passes.
  - [ ] [human] On a phone width, open `/menu-library`, tap the flame button: «תפריט חדש» and «פנייה חדשה» show two different icons.
  - [ ] [human] On a phone width, open «פנייה חדשה», tap the date field and type `25122026`: it shows `25/12/2026`; the calendar button next to it opens a picker and picking a day fills the same field. Typing `31022026` shows the red message «תאריך לא תקין» and «שמור» does not create the inquiry.
  - [ ] [human] As the owner, open an event in «הצעת מחיר נשלחה» with an event date, tap «מקדמה שולמה»: a window asks for the date the deposit was paid (today pre-filled) and the amount paid. Leave the amount empty: «שמור» is disabled. Fill 500, save: the stage changes, and «פרטי לקוח» shows 500 and the same date.
  - [ ] [human] As a staff user (not owner), tap «מקדמה שולמה» on an event: the stage changes with no payment window and no error.
  - [ ] [human] On a phone width, open any event: the stage pills scroll sideways with the edge fade, an arrow appears on the side with more stages, and the current stage is brought into view when the screen opens.

## Execution Mode
- Parallel: no — writes the shared date field and the stage bar that later menu work reads.
- Concurrent plans: 460 (shared floating panels, inputs, modal, dirty form — may add a date or input helper; see Depends on), 468 (metadata manager; may extend `app-scroll-rail`, which this plan only uses), 470 (same event screen, different files).
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`. Executed per `docs/mvp/run-mode.md` — [human] items become validation cards in `docs/mvp/runs/467.md`.
- Depends on: none. Plan 460 (A8) owns the desktop backdrop bug in the inquiry dialog; if 460 merged first and changed `.c-modal-overlay` handling, rebase onto it and keep its change. If 460 created a shared date input, use it in S3 instead of building `app-date-field` and say so in the run file.
- Overlap: 468 (G3) adds `centerChild(el)` to `app-scroll-rail`; if 468 merged first, S7 calls `centerChild` instead of its own `scrollIntoView` (one centring behaviour app-wide). Otherwise S7 uses a local `scrollIntoView` in the stage bar and does not touch the rail, so the two plans share no file.
- Main has unrelated plans 450–458 (popup shell, search box, form field, chip engine); they are NOT on `mvp`. Do not use them.
- `menu-intelligence.page.ts` is growth-frozen: this plan does not touch it. The event-date chip on the editor page (own typing buffer, `onDateKeydown`) is out of scope.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/app.config.ts
src/testing/test-lucide-icons.ts
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/pages/menu-intelligence/components/deposit-paid-dialog/**
src/app/shared/date-field/**
src/app/shared/breadcrumbs.md
src/app/core/utils/date-input.util.ts
src/app/core/utils/date-input.util.spec.ts
docs/mvp/runs/467.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the scope reaches no invariant `Touches` glob. The deposit is written through the existing `deposit` money field, so INV-1's owner-only money rule (`server/utils/permissions.js`) still decides, and INV-4's schema (`shared/schemas/**`) is unchanged.

## Backend Impact
- Collections affected: menuEvents (existing `deposit` field only).
- New collections: no
- Server changes needed: no — `deposit: { amount, date }` is already in the schema and the money-field list; the stage move already goes through `PUT /api/v1/events/:id/stage`.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `pick` and `needsDateFor` in the stage bar, `deposit` in `menu-event.schema.ts`, `app-scroll-rail` in `src/app/shared/scroll-rail/`, and `setPageActions` in `menu-library.page.ts`. Also check whether plan 460 already added a shared date input. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef, I want the flame menu's two add actions to look different so that I do not open the wrong one.
- As a chef on my phone, I want to type a date as day/month/year so that I can log a call without fighting a calendar.
- As a chef who just got a deposit, I want the move to «מקדמה שולמה» to ask what was paid and when so that the figures are on the event from the first minute.
- As a chef on my phone, I want the stage bar to scroll like the other chip bars so that I can reach every stage.

## Functional Requirements

### Must Have (P0)
- [ ] The flame menu and the library header use distinct icons for «תפריט חדש» and «פנייה חדשה».
- [ ] A shared date field shows and accepts day/month/year, has a calendar button, and emits an ISO date (`yyyy-mm-dd`) or nothing.
- [ ] «מקדמה שולמה» asks the owner for the date paid and the amount paid before moving; staff move without the question.
- [ ] The stage pills sit in the shared scroll rail.

### Nice to Have (P1)
- [ ] The details block's deposit date uses the same date field.

## UI/UX Notes
- RTL page; the date text itself is `dir="ltr"` (`25/12/2026`). Logical CSS only; `@layer` in every new component stylesheet; OnPush; signals; `app-` selector prefix.
- The calendar button is a real `button` with an `aria-label` from the dictionary; the hidden native date input is only the picker (no tab stop, `aria-hidden`).
- Deposit dialog: same `.c-modal-*` shell, Escape and outside click cancel (like `not-closed-dialog`), `role="dialog"`, first field focused.
- New dictionary keys (append to `public/assets/data/dictionary.json`): `date_invalid` «תאריך לא תקין», `open_calendar` «פתח לוח שנה», `deposit_paid_title` «מקדמה שולמה», `deposit_amount_required` «יש להזין סכום מקדמה». Existing keys reused: `deposit_date`, `deposit_amount`, `save`, `cancel`, `stage_changed`.

## Atomic Sub-tasks

### Milestone 1 — F1: new inquiry form
- [ ] S1: Give the two add actions in the flame menu different icons so they can be told apart — register `book-plus` and `phone-incoming` in `app.config.ts` and `test-lucide-icons.ts`; flame menu «תפריט חדש» uses `book-plus`, «פנייה חדשה» uses `phone-incoming` (also on the list header button at `menu-library-list.component.html:22`); keep `file-plus` registered if still used elsewhere — `src/app/app.config.ts`, `src/testing/test-lucide-icons.ts`, `src/app/pages/menu-library/menu-library.page.ts`, `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html`
- [ ] S2: Add the day/month/year date helpers with tests — pure functions in `core/utils`: `formatDateDigits(raw)` keeps digits only and inserts `/` after day and month (`25122026` → `25/12/2026`, partial input stays partial); `parseDmy(text)` returns `yyyy-mm-dd` or `null` for incomplete or impossible dates (`31/02/2026`, month 13, year below 1900); `isoToDmy(iso)` for display. Spec includes the impossible dates and a leap day — `src/app/core/utils/date-input.util.ts`, `src/app/core/utils/date-input.util.spec.ts`
- [ ] S3: Build a date field you can type in and open a calendar from — new standalone `app-date-field` (selector prefix, OnPush, `model()` for the ISO value, `input()` for id/disabled/aria-label): a text input (`inputmode="numeric"`, `dir="ltr"`, placeholder `dd/mm/yyyy`) driven by S2, red `c-field-error` with `date_invalid` once 10 characters are impossible, plus a calendar button that calls `showPicker()` (fallback `click()`) on a hidden native date input and writes the picked day back; no `ControlValueAccessor` needed. Spec: typing, invalid, picker value, disabled. Add a row to `shared/breadcrumbs.md` — `src/app/shared/date-field/**`, `src/app/shared/breadcrumbs.md`
- [ ] S4: Use the date field in the new inquiry form so phones can type the date — replace the native date input at `new-inquiry-dialog.component.html:47` with `app-date-field` bound to `date_`; a typed-but-impossible date blocks «שמור» (`valid_`); the desktop backdrop stays plan 460's — `src/app/pages/menu-library/components/new-inquiry-dialog/**`

### Milestone 2 — F2: «מקדמה שולמה» asks for the payment
- [ ] S5: Add the window that asks the date paid and the amount paid — new `app-deposit-paid-dialog` modelled on `not-closed-dialog` (`.c-modal-*`, `role="dialog"`, Escape and outside click cancel): inputs `deposit` (existing value to pre-fill), output `confirmed` with `{ date, amount }`; date field = `app-date-field` pre-filled with today (local date, not UTC); amount `type="number" min="0"` `dir="ltr"`; «שמור» disabled until the date is valid and the amount is above 0 (`deposit_amount_required` shown when touched and empty). Spec — `src/app/pages/menu-intelligence/components/deposit-paid-dialog/**`
- [ ] S6: Make the move to «מקדמה שולמה» open that window for the owner — in `EventStageBarComponent.pick()`, after the event-date check, `stage === 'deposit_paid' && canEditMoney_()` opens the window instead of moving; on `confirmed` run `move(event, { stage })` first (make `move` return whether it worked) and only then `saveFields(event, { deposit: { ...event.deposit, date, amount } })`; if the stage move fails, nothing is saved; staff (no `editMoney`) skip the window and move as today; cancelling moves nothing. Also swap the details block's deposit date (`event-stage-bar.component.html:124`) to `app-date-field`. Extend the spec: owner flow, staff flow, cancel, stage failure — `src/app/pages/menu-intelligence/components/event-stage-bar/**`

### Milestone 3 — F3: stage bar carousel on a phone
- [ ] S7: Put the stage pills in the shared scroll rail and bring the current stage into view — wrap the pills in `app-scroll-rail` (`snap="proximity"`, `arrows="auto"`) with an inner flex container sized `inline-size: max-content; min-inline-size: 100%` so the «לא נסגר» pill keeps its far-end place on desktop; remove the bare `overflow-x: auto` from `.stage-row`; when the screen opens and when `current_()` changes, `scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })` on the `.is-current` pill (behavior `auto` when `prefers-reduced-motion`). Do not edit `scroll-rail` — `src/app/pages/menu-intelligence/components/event-stage-bar/**`
- [ ] S8: Build, run the checks, write the run file with the validation cards — `npx ng build`, the specs listed in Done-when, `log-query`; one card per [human] item above — `docs/mvp/runs/467.md`

## Technical Considerations
- Dependencies: `app-scroll-rail`, `.c-modal-*` engines, `PermissionService.can('editMoney')` (already used by the stage bar), `MenuEventDataService.updateMenuEvent` (used by `saveFields`).
- New files needed: `date-input.util.ts` (+ spec), `shared/date-field/*`, `deposit-paid-dialog/*`.
- Model changes: none (`deposit` exists).
- Backend / API: none. The deposit is saved by the existing generic update; the server already refuses staff money writes.
- Two requests (stage move, then deposit): if the second fails the event is in the new stage without a deposit; `saveFields` already shows the error toast and the amount can be typed in «פרטי לקוח». Accepted, logged as a decision.
- Auth and validation: owner-only dialog mirrors the server rule; the server stays the authority.
- Data / migration: none.
- Project checks: log-query [auto]; chef-side stories; four dictionary keys; Lucide icons registered in `app.config.ts`.

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- The desktop backdrop bug (plan 460, A8).
- The event-date chip on the menu editor page and the library's date filter (they keep native inputs).
- Recording the amount in stage history, a payments ledger, several deposits, or tightening the `deposit.date` schema to ISO.
- Centring section chips in the metadata manager (plan 468).
- F4–F6 (plan 470).

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. Staff (no money permission) tapping «מקדמה שולמה»: **move straight through, no payment window (recommended)** · block the move until the owner records the payment. The recommendation keeps today's behaviour.
2. In the window, is the amount required and above 0? **Yes, both fields required (recommended)** · allow an empty amount and fill it later in «פרטי לקוח».
3. Which phone date order do you want? **dd/mm/yyyy as in `eventDate` display on the editor page (recommended)** · follow the phone's own setting (not possible with a native field).
