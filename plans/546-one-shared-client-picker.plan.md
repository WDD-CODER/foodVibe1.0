# Plan 546 — One shared client picker instead of two copies inside the menu screens

Status: draft
Depends-on: 544, 522
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Front Desk map row 4 (FD-02, contract C-PICKER). What a business knows about *who the customer is* is spread over two
menu components today, each with its own client search. The CRM section (plans 547, 551, 552) needs one picker it can
drop anywhere. Brief Part 2 rule 2: customer logic leaves the menu screens, and the menu screens keep only a chip and a
call to the shared piece.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.ts` (291 lines, html 217, scss 68, spec 378) holds the whole client flow. It has the search (`app-search-combobox`, `clientOptions_` filtered with `matchesClientQuery`, `[minChars]="2"`, `addLabelKey` `client_new` for the owner, `emptyKey` `client_ask_owner` for staff). The picked client shows inside the field, name only, with an X (`onClearClient`). The add-client view is `view_ = 'client'`: name, phone, a "עוד פרטים" `c-chip c-chip--tap` toggle (`isMoreOpen_`) revealing client type, company, e-mail, source and notes. `onSaveClient` returns to the inquiry with the new client selected. `onDismissed` goes one step back: the add view first, then the dialog. All of this came from plan 515 and its lessons.
- The dialog is used once: `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts:24` (import) and `.html:193` (`<app-new-inquiry-dialog (saved)… (cancelled)… />`).
- `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts` (320 lines, html 185) has a second, pick-only copy: `isPickerOpen_`, `query_`, `clientOptions_`, `clientLabelOf`, `clientKeyOf`, `togglePicker`, `closePicker`, `onClientPicked` (saves `clientId`, `clientName`, `clientPhone` on the event). The client row (html 54–71) shows a name chip, a phone chip, an events-count chip, and a `client_change` / `client_link` button (`canChangeClient_` = `permission.can('edit', { type: 'clients' })`). There is **no** inline client-details editor in the stage bar: the brief's "remove the inline client details editor" has nothing to remove. `isDetailsOpen_` is the deposit block.
- `menu-intelligence.page.ts` (1007 lines, growth-frozen) only imports `EventStageBarComponent` (line 112); this plan does not touch it.
- `ClientDataService.addClient()` posts to `/api/v1/data/clients` (after plan 545 the server runs `upsertClientByPhone` behind it). `clientLabel`, `matchesClientQuery`, `normalizePhone` live in `src/app/core/utils/client-display.util.ts`.
- `src/app/shared/client-picker/` and `src/app/shared/new-inquiry-dialog/` do not exist. `docs/brain/component-families.md` has no client family.

## Goals & Success Criteria
**Primary:** one `app-client-picker` (search + selected value + add-client view) and one `app-client-form` serve both the
new-inquiry dialog and the event stage bar, both hosts lose their own client code, and a chef sees the same screens as before.

- [auto] `pnpm run test:ci` passes, including the new `src/app/shared/client-picker/client-picker.component.spec.ts`, `src/app/shared/client-form/client-form.component.spec.ts`, and the moved `src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts` and `event-stage-bar.component.spec.ts` (their client cases now go through the picker).
- [auto] `git diff --numstat origin/main -- src/app/shared/new-inquiry-dialog/new-inquiry-dialog.component.ts src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts` shows fewer added than deleted lines for each of the two files (moved-file diff taken with `-M`).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0 and `node scripts/reuse-lint.mjs --diff=origin/main` reports no new copy.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `pnpm run build` and `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/menu-library`, "פנייה חדשה" → type a new name in the client field → choose `הוסף "<name>"` → fill a phone → "שמור" → the client field shows that name with an X → "שמור" → the toast "הפנייה נשמרה" appears (`e2e/ui/546-1.spec.ts`).
- [ui] On `/menu-intelligence/<id>` of a QA event, "החלף לקוח" → type 2 letters of another client → pick it → the stage bar's client chip shows that client's name (`e2e/ui/546-2.spec.ts`).
- [human] The new-inquiry dialog and the event screen feel the same as before: same fields, same order, Escape goes one step back, the picked client sits inside the field with an X.

## Execution Mode
- Parallel: no — must not run with plan 522 (it edits the page that hosts `event-stage-bar`; 522 is in `Depends-on`), nor with any plan touching `event-stage-bar/**` or `new-inquiry-dialog/**`. Serialise with 547 (same lane wt-2).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
event-stage-bar.component.spec.ts
e2e/helpers/qa-session.ts
src/app/shared/client-picker/**
src/app/shared/client-form/**
src/app/shared/new-inquiry-dialog/**
src/app/pages/menu-library/components/new-inquiry-dialog/**
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
src/app/pages/menu-intelligence/components/event-stage-bar/**
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
e2e/ui/546-1.spec.ts
e2e/ui/546-2.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client-side refactor only; writes still go through `ClientDataService` / `MenuEventDataService` to the server, which authorises them as today (INV-1 untouched).

## Reuse Check

- `app-client-picker` (`src/app/shared/client-picker/`) — family: search-combobox — rung: 4 — why: a domain picker built **on** `app-search-combobox` (rung 1 inside), adding the selected-value-with-X display and the add-client view; it replaces two page-local copies. New family `client-picker` in the registry.
- `app-client-form` (`src/app/shared/client-form/`) — family: form-field — rung: 4 — why: the add-client fields (name, phone, the "עוד פרטים" `c-chip c-chip--tap` toggle with type / company / e-mail / source / notes) moved out of the dialog so the picker and plan 547's "add client" share one form; registered under the `client-picker` family.
- "עוד פרטים" control — family: chip — rung: 1 — why: stays `c-chip c-chip--tap` with `aria-expanded` (plan 515 lesson: the Human praised it).
- Picked-client display (name inside the field + X) — family: search-combobox — rung: 1 — why: same `c-input-wrapper` markup and `x` icon the dialog uses today, moved into the picker.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to find or add a client the same way on every screen so that I don't learn two pickers.
- As an owner, I want adding a client from an inquiry to work exactly as today so that the refactor costs me nothing.
- As a host, I want to see that only the owner adds clients (the "ask the owner" line) so that I know why I can't.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen):
  **C-PICKER (546; used by 547, 551, 552)**
  - `src/app/shared/client-picker/` → `app-client-picker`: inputs `selected = input<Client | null>()`, output `picked = output<Client>()`; search by name/phone (`matchesClientQuery`); add-option row (owner only, hidden for staff by `PermissionService`) creates through `ClientDataService.addClient()` (which goes through `upsertClientByPhone` on the server). Registered in `docs/brain/component-families.md`.
  - `NewInquiryDialogComponent` moves to `src/app/shared/new-inquiry-dialog/` (opened from the menu library, the client profile and `/requests`).
- [ ] Contract extension (recorded here and in the map's "Contract extensions (run)" by the Planner): `app-client-picker` also has `inputId = input('client-pick')`, `variant = input<'box' | 'plain'>('box')`, outputs `cleared = output<void>()` (the X on the selected value) and `addingChange = output<boolean>()` (true while the add-client view shows, so a modal host can swap its title and hide its other fields), and a public method `back(): boolean` (leaves the add view and returns true; false when there was nothing to step back from). Reason: the dialog's one-step-back Escape and title swap (plan 515) cannot work without them.
- [ ] Picker behaviour, taken over unchanged from the dialog: options = `ClientDataService.allClients_()` filtered with `matchesClientQuery`, `[clientFilter]="false"`, `[minChars]="2"`, labels `clientLabel(c, <events of c>, translate('client_events_count'))`. Owner: `addLabelKey="client_new"`, choosing add opens the add view with the typed text pre-filled (digits/`+-() ` → phone, else name, as `onAddChosen` does today). Staff: no add row, `emptyKey="client_ask_owner"`. With `selected()` set it shows the name only inside a `c-input-wrapper` with an X button (`aria-label` `remove`); the X emits `cleared` and puts focus back in the search box.
- [ ] `app-client-form`: inputs `initialName`, `initialPhone`; outputs `saved = output<Client>()`, `cancelled = output<void>()`. Fields and validation exactly as the dialog's add view today (`NAME_MAX` 200, `isValidClientPhone`, phone required, Enter on name → phone, Enter on phone → save, "עוד פרטים" toggle). Saving calls `ClientDataService.addClient()`. A 403 shows nothing extra (the interceptor toasts); any other error → `server_error` toast. The form holds no modal shell (the host or the picker frames it).
- [ ] `NewInquiryDialogComponent` moves with its html/scss/spec to `src/app/shared/new-inquiry-dialog/` and uses `<app-client-picker>`. It deletes its own client signals and methods (`query_`, `view_`, `isClientSaving_`, `isMoreOpen_`, `isClientTouched_`, the client field signals, `canCreateClient_`, `clientOptions_`, `labelOf`, `keyOf`, `countFor`, `onPicked`, `onClearClient`, `onAddChosen`, `onBackToInquiry`, `onClientNameEnter`, `onClientPhoneEnter`, `onSaveClient`, `buildClientBody`, `resetClientFields`). It keeps `selectedClient_` (set from `picked`, cleared by `cleared`) and an `adding_` signal from `addingChange`, which drives the title key (`client_new` / `new_inquiry`) and hides the inquiry fields and actions while adding. `onDismissed`: `if (this.picker_()?.back()) return` else `cancelled.emit()`. `menu-library-list.component.ts` changes only its import path. The old folder `src/app/pages/menu-library/components/new-inquiry-dialog/` is deleted.
- [ ] `EventStageBarComponent` uses `<app-client-picker variant="plain" inputId="stage-client-pick" [selected]="null">` inside its existing `@if (isPickerOpen_() && canChangeClient_())` block; `(picked)` runs today's `onClientPicked` body. It deletes `query_`, `clientOptions_`, `clientLabelOf`, `clientKeyOf` and the `SearchComboboxComponent` import. Escape / outside click still close the picker (`closePicker`). The owner now also sees the add row here (same picker); a new client is linked to the event at once.
- [ ] Stage-bar client row (Q1 = b): one name chip plus "החלפה"; the phone chip and the events-count chip are removed (the phone and the count are on the client profile, plan 551). The chip is not a link yet; plan 551 makes it one.
- [ ] Registry: new `### client-picker — find, show or add one client` family in `docs/brain/component-families.md` (Status stable (plan 546), Use: both paths, When: any screen that links a record to a client, Inputs / variants as above, Known copies: none). Add to the `search-combobox` family's Users line. `src/app/shared/breadcrumbs.md` lists `client-picker/`, `client-form/`, `new-inquiry-dialog/`; `src/app/pages/breadcrumbs.md` drops the old dialog path if it lists it.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL as today; no new look. Logical properties only in the moved scss (the dialog's scss moves with it; the client-field rules go to the picker's scss).
- Dictionary: no new key. Keys used: `client`, `client_new`, `client_name`, `client_phone`, `client_phone_invalid`, `client_more_details`, `client_type`, `client_type_*`, `client_company_name`, `client_email`, `client_source`, `client_notes`, `client_pick_placeholder`, `client_ask_owner`, `client_events_count`, `client_required`, `client_change`, `client_link`, `remove`, `save`, `cancel`, `field_required`, `server_error`.
- Icons: `x` only (already registered in `src/app/app.config.ts`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Pin today's client behaviour in both hosts before moving anything — run the dialog and stage-bar specs green and note which cases cover picking, adding, clearing and Escape — src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [x] A2: Build the shared add-client form with today's fields and checks — inputs initialName/initialPhone, outputs saved/cancelled, addClient, error toasts; spec — src/app/shared/client-form/**
- [x] A3: Build the shared client picker on the search box, with the selected name inside the field — selected/picked/cleared/addingChange/back(), owner add row, staff ask-owner line; spec covers pick, clear, add with typed name or phone, staff without add, Escape one step back — src/app/shared/client-picker/**
- [x] A4: Move the new-inquiry dialog to the shared folder and let it use the picker — delete its own client code, title swap and one-step Escape through the picker; fix the menu library import; move and update the spec — src/app/shared/new-inquiry-dialog/**, src/app/pages/menu-library/components/new-inquiry-dialog/**, src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
- [x] A5: Let the event stage bar use the same picker and simplify its client row — picker in the existing block, delete its own search code, client row per Q1; update the spec — src/app/pages/menu-intelligence/components/event-stage-bar/**
- [x] A6: Register the new family and refresh the folder maps — client-picker family, search-combobox users, breadcrumbs — docs/brain/component-families.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [x] A7: Write the two screen checks and run every check — e2e/ui/546-1.spec.ts, e2e/ui/546-2.spec.ts (`signInQa` from e2e/helpers/qa-session.ts, `createQaEvent` for 546-2); test:ci, build, lint, reuse-lint, breadcrumbs-check, line counts, log-query

## Technical Considerations
- Dependencies: `ClientDataService`, `PermissionService.isOwner_`, `MenuEventDataService.allMenuEvents_` (event counts in labels), `app-search-combobox`.
- New files needed: `src/app/shared/client-picker/client-picker.component.{ts,html,scss,spec.ts}`, `src/app/shared/client-form/client-form.component.{ts,html,scss,spec.ts}`, `e2e/ui/546-1.spec.ts`, `e2e/ui/546-2.spec.ts`; moved: `src/app/shared/new-inquiry-dialog/*`.
- Model changes: none (plan 544 widens `Client`; this plan reads only `name`, `phone`, `_id`).
- Backend / API: none.
- Auth and validation: unchanged — owner-only add is hidden in the UI and refused by the server (D2).
- Security surface: none.
- Data / migration: none.
- Project checks: log-query `[auto]`; Reuse Check filled; no new dictionary keys; icon `x` registered; breadcrumbs updated (folders moved); `.claude/skills/angularComponentStructure/SKILL.md` order in the new components; `input()` / `output()` only.

## Out of Scope
- The chip as a link to `/clients/:id` (plan 547) and the client profile (plan 551).
- Editing a client's details anywhere (profile, plan 551).
- Opening the dialog from the client profile or `/requests` (plans 551, 552).
- `menu-intelligence.page.ts` (not touched).

## Critical Questions
- Q1: What does the event stage bar's client row show once it becomes "a chip + change"? (a) one name chip and the phone chip as today, drop the events-count chip (the count moves to the client profile, plan 551) — recommended / (b) the name chip only (the phone is one tap away on the profile after plan 551) / (c) keep all three chips as today. A: (Human, 2026-11-10) b — name chip only

## Execution Notes
- Map row 4, renumbered +2 on 2026-11-10 (old 544 → 546). `Depends-on: 522` added because the map says run this after plan 522 merges (522 was running in `run-522` when this plan was written).
- scope: the dialog's own client cases stayed in its spec (ids renamed to client-form-*); the picker and form specs cover the same cases at their level.
- Evidence: pnpm run test:ci -> exit 0, 1944 SUCCESS; pnpm run build -> 0; pnpm run lint -> 0 (0 errors); reuse-lint --check-registry -> 0; reuse-lint --diff=origin/main -> 0 (2 warns on moved code: number input in the dialog, .c-input-stack:last-child in the form scss); breadcrumbs-check -> 0; lint:icons -> 0; lint:no-native-select -> 0; log-query -> skipped (no database); numstat -M: stage bar 3+/23-, dialog 10+/143-.
- e2e/ui/546-1 and 546-2 written, not run by the builder (no dev server in the worktree).
- Contract extension: app-client-picker also has closeOnOutsideClick input and escaped / outsideClick outputs, so the stage bar keeps Escape / outside click closing the picker.
