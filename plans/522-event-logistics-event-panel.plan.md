# Plan 522 — Event logistics 5 of 6: the phone-intake and site-visit panel on the event screen

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 519, 520, 521

## Problem Statement
Plans 518–521 store the checklist and the answers and give the client the calls; the chef still has nowhere to see the
questions, answer them in two taps on his phone while standing on site, see what he has not checked yet, and copy the
part that belongs in the quote. This plan adds one self-contained panel under the event's notes log, the way
`event-notes-log` was added: its own component, its own data access, one tag on the (growth-frozen) event page.

## Goals & Success Criteria
**Primary:** on a stored event an owner sees a collapsed "לוגיסטיקה" card under the notes log, its header showing how
many items are still open; one tap opens it to two tabs (שיחה ראשונה / פגישת ספקים), the items of the business for
the event's environment, autosave per answer, an open-item counter, "סיימתי את השלב" and "העתק סיכום ללקוח"; staff
see it read-only.
- [auto] `npm run build` exits 0; `npm run lint` exits 0; `npm run lint:icons` exits 0; `npm run lint:no-native-select` exits 0.
- [auto] `npm run test:ci` exits 0, including `src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts` (B7).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/522-event-logistics-event-panel.plan.md` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=plans/522-event-logistics-event-panel.plan.md` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line for `event-logistics-panel`.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] On a new event the "לוגיסטיקה" card is closed (the question "יש מטבח במקום?" is not visible); tapping the "לוגיסטיקה" header shows the tab "שיחה ראשונה" selected and the question "יש מטבח במקום?" (e2e/ui/522-1.spec.ts). Cards 2–6 open the card the same way first.
- [ui] After choosing the environment "חוץ / שטח", the tab "פגישת ספקים" shows "גנרטור נדרש?" (e2e/ui/522-2.spec.ts).
- [ui] After choosing the environment "מטבח מקצועי", the tab "פגישת ספקים" does not show "גנרטור נדרש?" (e2e/ui/522-3.spec.ts).
- [ui] Tapping "נדרש" on "צ'ילרים להבאה", entering 2 and reloading the page shows "צ'ילרים להבאה" still with "נדרש" selected and 2 (e2e/ui/522-4.spec.ts).
- [ui] With "צ'ילרים להבאה" ticked "ללקוח", the button "העתק סיכום ללקוח" shows the toast "הועתק" (e2e/ui/522-5.spec.ts).
- [ui] Tapping "סיימתי את השלב" on "שיחה ראשונה" with open items shows a confirm containing "נשארו פריטים שלא נבדקו" (e2e/ui/522-6.spec.ts).
- [human] On a phone width (≤768 px) the closed card is one header line (icon, "לוגיסטיקה", the open count, the chevron) that reads clearly and opens on one tap.
- [human] On a phone width (≤768 px) each item is one block — question, the four status chips wrapping, then quantity/note — with no horizontal scroll, and the panel's card matches the notes log's look.
- [human] Signed in as staff, the panel reads "צפייה בלבד" and nothing reacts to a tap.

## Execution Mode
- Parallel: yes — wave 4 with 523; both append to `dictionary.json`, so `plan-order` serializes them (lock group); no other shared file.
- Concurrent plans: 523.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/event-logistics-panel/**
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/breadcrumbs.md
src/app/app.config.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
e2e/ui/522-*.spec.ts
screens/522-*.png
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; the panel reads through `MenuEventDataService` and `LogisticsItemRegistryService` (plan 521) and writes only through `EventPipelineService.saveLogistics`, whose server door (plan 519) authorizes `editLogistics`; `PermissionService.can('editLogistics')` only hides what the server would refuse.

## Reuse Check
- `app-event-logistics-panel` (`src/app/pages/menu-intelligence/components/event-logistics-panel/`) — family: none — rung: 4 — why: no shared piece renders a phased, sectioned question list with per-row answers; page-local like `event-notes-log`, built from the shared engines below.
- Open/close header (Q1 = b) — family: chip — rung: 1 — why: one `<button type="button" class="c-chip c-chip--tap">` with `[attr.aria-expanded]`, the same pattern as `pricing-meter`'s `targets-toggle`; the total open count in a `.c-chip__count`; the existing `chevron-down` icon. No native `<details>` for the card.
- Phase tabs — family: chip — rung: 1 — why: `app-tab-chips` (`src/app/core/components/tab-chips/`) with `.c-chip__count`.
- Status and payer choices — family: chip — rung: 1 — why: `.c-chip--toggle` (label > input[type=radio] + span) inside `.c-chip-group`; "ללקוח" is a `.c-chip--toggle` checkbox.
- Environment select — family: search-combobox — rung: 1 — why: `app-custom-select` (`src/app/shared/custom-select/`) with the four `environmentType` keys; native `<select>` is linted out.
- Quantity, note, meeting fields — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`; `app-counter` (`src/app/shared/counter/`) for quantity; `app-date-field` (`src/app/shared/date-field/`) for the meeting date.
- Phase-done confirm — family: modal-controller — rung: 1 — why: `ConfirmModalService.open(message)`.
- Toasts — family: feedback — rung: 1 — why: `UserMsgService`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the phone-call questions in front of me while I talk so that I fill them during the call instead of from memory.
- As a chef, I want the site-visit list filtered to this event's environment so that an indoor event does not show me tent and generator questions.
- As a chef, I want every answer saved the moment I tap it so that nothing is lost when the phone locks.
- As a chef, I want to see how many items I have not checked yet and walk through only those so that I leave the site with nothing open.
- As a chef, I want to mark which answers go to the client and copy that summary so that the quote carries exactly what we agreed.

## Functional Requirements

### Must Have (P0)
- [ ] Mounted once, after the notes log, for a stored event only (`@if (editingId_())`).
- [ ] Collapsed by default (Q1 = b): the card renders closed on every page load (`open_ = signal(false)`, not persisted). The always-visible header is one toggle button (see Reuse Check): `clipboard-list` icon, `logistics_title`, the total open count of both phases in a `.c-chip__count` (hidden when 0), and `chevron-down` (rotated 180° when open); `aria-expanded` = `open_()`, `aria-label` `logistics_toggle`. Tapping it flips `open_`. Everything below (tabs, profile strip, sections, footer) renders only `@if (open_())`. The read-only label `logistics_read_only` shows in the header, so staff see it closed too.
- [ ] Inside the open card: `app-tab-chips` with the two phases, each chip's count = open items of that phase (`openItems` from plan 521, plus ad-hoc answers with `unchecked`).
- [ ] Profile strip (both tabs): `app-custom-select` for the environment (options `professional_kitchen`, `outdoor_field`, `client_home`, `popup_venue`, labels from the existing dictionary keys; value = `event.logistics?.environmentType`, placeholder `logistics_environment`); on the site-visit tab also `app-date-field` (`logistics_meeting_at`, value `siteLogistics.meetingAt`) and a `.c-input` (`logistics_meeting_with`, maxlength 80).
- [ ] Rows = `registry.forPhase(phase, environment)()` items plus the event's ad-hoc answers of that phase (answers whose `itemKey` starts with `adhoc:`) plus answers whose item no longer exists (render with `itemKey` as label); grouped by section in `LOGISTICS_SECTIONS` order inside `<details open>` with the section name (`logistics_section_<section>`) and that section's open count; a section with no rows is not rendered.
- [ ] Row: label (`item.key` / `answer.label` / `itemKey`), `item.hint` in small muted text, a `.c-chip-group` of four `.c-chip--toggle` radios named `status-<itemKey>` (`logistics_status_unchecked`, `_needed`, `_not_needed`, `_client_provides`). When `status === 'needed'`: `answerType === 'quantity'` → `app-counter` (min 0, max 100000); `answerType === 'text'` → `.c-input` note (maxlength 500) always shown; `status`/`quantity` types → a `.c-chip--tap` "הערה" that reveals the same note input; then the payer `.c-chip-group` (`logistics_payer_client`, `_quoted`, `_chef`, radios named `payer-<itemKey>`) and the "ללקוח" checkbox chip (`logistics_show_to_client`). Under the row, when the answer has `at`: `byName · <date, DatePipe 'dd.MM.yy HH:mm'>` in small text.
- [ ] Autosave: every change writes the draft into `pending_` (a signal holding a `Map<string, DraftAnswer>`), restarts a 600 ms timer; on fire → `pipeline.saveLogistics(eventId, { answers: [...pending values] })`; on `ok` clear the sent keys from `pending_` (keys changed again meanwhile stay); on `!ok` toast `logistics_save_failed` and keep `pending_` so the next change resends. The profile fields save immediately on change (`{ environmentType }`, `{ meetingAt }`, `{ meetingWith }` on blur) through the same call.
- [ ] Open counter: a `.c-chip--tap` in the footer showing `<n> <logistics_open_count_suffix>`; tapping toggles `openOnly_`, which hides rows whose answer is not open.
- [ ] "סיימתי את השלב" (`logistics_phase_done`): open count 0 → `saveLogistics({ phaseDone: { [phase]: Date.now() } })`; else `confirmModal.open(t('logistics_phase_done_confirm') + '\n' + open labels joined by ' · ')` → on confirm the same save, on cancel nothing. A done phase shows `logistics_phase_done_at · <date>` and a link `logistics_phase_reopen` → `saveLogistics({ phaseDone: { [phase]: null } })`.
- [ ] Ad-hoc row at the end of each section: `.c-input` (placeholder `logistics_add_item_placeholder`, maxlength 120) + button `logistics_add_item`; Enter or the button adds `{ itemKey: 'adhoc:' + crypto.randomUUID(), label, phase, section, status: 'unchecked' }` to `pending_` (saved by the timer) and clears the input; empty text does nothing.
- [ ] "העתק סיכום ללקוח" (`logistics_copy_summary`): `buildClientSummary(answers, items, t)`; `''` → toast `logistics_nothing_to_copy`; else `navigator.clipboard.writeText(text)` then toast `logistics_copied`; a clipboard error → toast `logistics_save_failed`'s sibling `logistics_copy_failed`.
- [ ] Read-only: when `!permission.can('editLogistics', { type: 'menuEvents', doc: event })` or `event.stage === 'finished'`: header shows `logistics_read_only`, every radio/checkbox/input is `disabled`, the ad-hoc row, "סיימתי את השלב" and "פתח מחדש" are hidden; "העתק סיכום ללקוח" stays.
- [ ] Every string through `translatePipe`; every icon registered.

### Should Have (P1)
- [ ] The last-changed stamp uses the same date format as the notes log (`event-notes-log.component.html`).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; the panel's own card styled like `event-notes-log.component.scss` (same tokens).
- Mobile first: under the `$break-mobile` (768) mirror the row is a vertical stack (label, chips, inputs); above it the label sits at the inline start and the chips at the inline end. Four status chips stay on one line at ≥900 px.
- The card itself is closed by default with a toggle header (Q1 = b, Human 2026-11-07); inside it, `<details open>` per section stays (native disclosure, no new accordion family).
- Icons to register in `src/app/app.config.ts` (`LucideAngularModule.pick`): `ClipboardList`, `ClipboardCheck`, `Copy`, `CircleCheckBig`, `RotateCcw`.
- Dictionary keys (`general`, append-only): `logistics_title` ("לוגיסטיקה"), `logistics_tab_intake` ("שיחה ראשונה"), `logistics_tab_site_visit` ("פגישת ספקים"), `logistics_environment` ("סביבת האירוע"), `logistics_meeting_at` ("תאריך הפגישה"), `logistics_meeting_with` ("עם מי"), `logistics_status_unchecked` ("לא נבדק"), `logistics_status_needed` ("נדרש"), `logistics_status_not_needed` ("לא נדרש"), `logistics_status_client_provides` ("הלקוח מספק"), `logistics_payer` ("מי משלם"), `logistics_payer_client` ("הלקוח"), `logistics_payer_quoted` ("בהצעה"), `logistics_payer_chef` ("על חשבוננו"), `logistics_show_to_client` ("ללקוח"), `logistics_note` ("הערה"), `logistics_quantity` ("כמות"), `logistics_open_only` ("רק פתוחים"), `logistics_open_count_suffix` ("לא נבדקו"), `logistics_phase_done` ("סיימתי את השלב"), `logistics_phase_done_at` ("הושלם"), `logistics_phase_reopen` ("פתח מחדש"), `logistics_phase_done_confirm` ("נשארו פריטים שלא נבדקו. לסמן את השלב כהושלם בכל זאת?"), `logistics_add_item` ("הוסף פריט"), `logistics_add_item_placeholder` ("פריט נוסף לאירוע הזה"), `logistics_copy_summary` ("העתק סיכום ללקוח"), `logistics_copied` ("הועתק"), `logistics_copy_failed` ("ההעתקה נכשלה"), `logistics_nothing_to_copy` ("אין פריטים מסומנים ללקוח"), `logistics_save_failed` ("השמירה נכשלה, ננסה שוב בשינוי הבא"), `logistics_read_only` ("צפייה בלבד"), `logistics_toggle` ("פתח או סגור לוגיסטיקה"), `logistics_section_infrastructure` ("תשתיות"), `logistics_section_space` ("חלל ומיקום"), `logistics_section_service` ("הגשה"), `logistics_section_rentals` ("השכרות וציוד"), `logistics_section_access` ("גישה ופריקה"), `logistics_section_staff` ("צוות"), `logistics_section_weather` ("מזג אוויר"), `logistics_section_food` ("אוכל וכשרות"), `logistics_section_other` ("שונות"). Environment labels already exist (`professional_kitchen`, `outdoor_field`, `client_home`, `popup_venue`).

## Atomic Sub-tasks
- [ ] B1: Build the panel that lists the checklist for one event and answers in two taps — component class per `.claude/skills/angularComponentStructure/SKILL.md`: OnPush, `input eventId: string | null`, signals `open_` (false), `phase_`, `openOnly_`, `pending_`, `totalOpen_` (both phases), `event_ = computed(() => eventData.getMenuEventById(id))`, `environment_`, `rows_`, `sections_`, `openCount_` per phase, `canEdit_`; a private timer handle cleared in `DestroyRef.onDestroy`; `inject()` only — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts
- [ ] B2: Write the template exactly as the P0 list describes — the toggle header, then `@if (open_())` the tabs, profile strip, sections, rows, ad-hoc row, footer, read-only branch; double quotes in HTML; every string via `translatePipe` — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.html
- [ ] B3: Style the panel as a card like the notes log, mobile first — component-local SCSS only, breakpoint mirror with the conventions comment, no new `.c-*` class — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.scss
- [ ] B4: Mount the panel on the event screen with one tag — directly after the `@if (editingId_()) { <app-event-notes-log … /> }` block add `@if (editingId_()) { <app-event-logistics-panel [eventId]="editingId_()" /> }`; in the page class add only the import line and the entry in `imports` (the page is growth-frozen: nothing else) — src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [ ] B5: Add the Hebrew strings and the icons — the keys above appended to `general`; the five icons in `LucideAngularModule.pick` — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] B6: Record the new piece in the maps — the panel under the chip family's Users and in the menu-intelligence line — docs/brain/component-families.md, src/app/pages/breadcrumbs.md
- [ ] B7: Unit-test the panel with stubbed services — `MenuEventDataService.getMenuEventById` returns an event with `logistics.environmentType: 'professional_kitchen'`; `LogisticsItemRegistryService.forPhase` returns 2 intake items and 2 site-visit items (one with `environments: ['outdoor_field']`); `PermissionService.can` true/false per case; `EventPipelineService.saveLogistics` is a spy resolving `{ ok: true, event }`. Cases: starts closed (no rows rendered, header shows the open count, `aria-expanded="false"`); after a header click renders the 2 intake rows; the outdoor-only item is absent on `professional_kitchen` and present after `environment_` is `outdoor_field`; choosing "נדרש" then `tick(600)` calls `saveLogistics` once with `answers.length === 1` and `status: 'needed'`; two changes within 600 ms → one call with both; a rejected save (`{ ok: false, code: 'server_error' }`) keeps `pending_` and the next change resends both; the open count drops when a row leaves `unchecked`; `can` false → every control disabled and `logistics_read_only` shown; "סיימתי את השלב" with open items opens the confirm (spy on `ConfirmModalService.open`) — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
- [ ] B8: Write one e2e spec per UI card with the plan-517 helpers — each: `signInQa(context)`, `createQaEvent(request, session)`, `page.goto('/menu-intelligence/' + id)`, a click on the "לוגיסטיקה" header to open the card, the card's one action, its assertion, `page.screenshot({ path: 'screens/522-<n>.png' })`, `deleteQaEvent` in `finally`; run each with `pnpm exec playwright test e2e/ui/522-<n>.spec.ts` and report them as `uiCards` — e2e/ui/522-1.spec.ts … e2e/ui/522-6.spec.ts
- [ ] B9: Run build, lint, lint:icons, lint:no-native-select, test:ci, breadcrumbs-check, reuse-lint and paste the outputs under Execution Notes

## What happens when
- On load / reload / return to the event: the card starts closed; its header count is already correct (it reads the stored answers, not the open body).
- On close while a save is pending: closing only hides the body; `pending_` and the timer live in the component, so the save still fires.
- On edit: the change is applied to the row at once (optimistic, from `pending_`), saved 600 ms after the last change; no save button.
- On leave (navigating away with a pending draft): the timer is cleared in `onDestroy`; the pending draft is sent immediately in `onDestroy` (fire and forget); no dialog, no `pendingChangesGuard` involvement.
- On cancel (the phase-done confirm): nothing changes; the open-only filter stays as it was.
- On error (save rejected): toast `logistics_save_failed`; the row keeps the typed value; the next change resends the whole pending set. A `STAGE_CHANGED` (409) or 403 is handled the same way; no reload is forced.
- On a finished event: read-only, like a staff member; the summary can still be copied.
- Clipboard API unavailable (http origin, old browser): toast `logistics_copy_failed`.

## Technical Considerations
- Dependencies: `MenuEventDataService.getMenuEventById`, `EventPipelineService.saveLogistics` (521), `LogisticsItemRegistryService` (521), `buildClientSummary` / `openItems` (521), `PermissionService.can('editLogistics')` (519), `TaxonomyStore` (through the registry), `ConfirmModalService`, `UserMsgService`, `TranslationService` (for `t` in the summary), `app-tab-chips`, `app-custom-select`, `app-form-field`, `app-counter`, `app-date-field`, `DatePipe`, e2e helpers from 517.
- New files needed: the component folder (4 files), 6 e2e specs, 6 screenshots.
- Model changes: none.
- Backend / API: none.
- Auth and validation: UI gate via `PermissionService.can('editLogistics')`; inputs bounded (`maxlength` 500 / 120 / 80, counter 0–100000); the server validates again.
- Security surface: user text rendered through interpolation only; clipboard write is user-initiated.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; every dictionary key listed; icons registered; RTL / logical CSS; `custom-select` with a fixed list (add-option rule not triggered); hotspots append-only.

## Out of Scope
- Editing the item list (523); any admin view; quote generation; venue-profile pre-fill; equipment linking; photos; print view.

## Critical Questions
- Q1 (answered b, Human 2026-11-07; the earlier "answered a" was a recording error): panel placement → under the notes log as a collapsed card, opened by tapping its header pill.
- Q2 (answered a, Human 2026-10-27): autosave → 600 ms debounce.

## Execution Notes
- Planner review 2026-11-07: Human 2026-11-07: Q1 = b (recording fix). The card starts collapsed; header toggle with the open count; P0, Reuse Check, B1/B2/B7/B8, "What happens when", `[ui]` card 1 and a new `[human]` header check updated. Mechanical fixes: `maxlength` 519 → 500 (plan-number typo, matches plan 518's `LOGISTICS_TEXT_MAX`); the `TEST-CI:` line and `node scripts/e2e-one.mjs` were dropped when plan 517 was re-scoped (plan 503 already made `test:ci` exit; the v2.1.0 gate does not rerun card tests), so the check is `npm run test:ci` exits 0 and cards run with `pnpm exec playwright test <spec>`.
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
