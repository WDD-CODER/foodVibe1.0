# Plan 523 — Event logistics 6 of 6: let a business add and remove its own checklist questions in the Metadata Manager

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 519, 520, 521

## Problem Statement
The shared list (plan 520) will never cover what one specific kitchen gets burned by. Each business must be able to
add its own questions — with the phase, the section, the answer type and the environments they apply to — and remove
them, while the shared ones stay visible and locked. This is the learning loop's first half: own items accumulate per
business; the later admin plan reads them across businesses and promotes the good ones.

## Goals & Success Criteria
**Primary:** a "שאלות לוגיסטיקה" card on the Metadata Manager lists shared and own `logisticsItem` terms by phase and
section, adds an own item with its four attributes, removes an own item, and marks shared items as locked (a platform
admin may add a shared one).
- [auto] `npm run build` exits 0; `npm run lint` exits 0; `npm run lint:icons` exits 0; `npm run lint:no-native-select` exits 0.
- [auto] `npm run test:ci` exits 0, including `src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts` (C5).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/523-event-logistics-item-manager-card.plan.md` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=plans/523-event-logistics-item-manager-card.plan.md` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line for `logistics-item-manager`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] On `/metadata-manager` the card "שאלות לוגיסטיקה" shows the shared question "יש מטבח במקום?" with a lock icon (e2e/ui/523-1.spec.ts).
- [ui] Adding the question "בדיקה E2E" with phase "פגישת ספקים", section "תשתיות", type "כן/לא" shows it in the list under "תשתיות" with a remove control (e2e/ui/523-2.spec.ts).
- [ui] Removing "בדיקה E2E" and confirming makes it disappear from the list (e2e/ui/523-3.spec.ts).
- [human] The card reads well on a phone: the add form stacks, the environment chips wrap, and the shared/own split is obvious at a glance.

## Execution Mode
- Parallel: yes — wave 4 with 522; both append to `dictionary.json` (lock group); no other shared file.
- Concurrent plans: 522.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/components/logistics-item-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/pages/breadcrumbs.md
src/app/app.config.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
e2e/ui/523-*.spec.ts
screens/523-*.png
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — the card adds or removes one term per click through the existing `TaxonomyStore.add / remove`; it never loops writes across documents and renames or re-keys nothing. Terms are added and removed only through `TaxonomyStore.add / remove` (existing methods, existing server rules: an own term for anyone, `shared: true` only for a platform admin, a shared term never editable by a non-admin).

## Reuse Check
- `app-logistics-item-manager` (`src/app/pages/metadata-manager/components/logistics-item-manager/`) — family: none — rung: 4 — why: `app-taxonomy-kind-manager` takes a flat `string[]` and has no room for phase / section / type / environments; a sibling page-local manager like `coefficient-manager` is the pattern this page already uses for kinds with extra fields.
- Phase, section, type selects — family: search-combobox — rung: 1 — why: `app-custom-select` with fixed lists.
- Environment choice — family: chip — rung: 1 — why: four `.c-chip--toggle` checkboxes in a `.c-chip-group`.
- Item rows — family: chip — rung: 1 — why: `.c-chip--tag` for a shared item (with the lock icon), `.c-chip--removable` for an own item.
- Remove confirm — family: modal-controller — rung: 1 — why: `ConfirmModalService.open`.
- Add field — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to add my own questions to the checklist so that the things my kitchen specifically gets burned by are there next time.
- As a chef, I want to see which questions are shared and which are mine so that I know what I can change.

## Functional Requirements

### Must Have (P0)
- [ ] Card `<section id="mm-sec-logistics">` rendered by `app-logistics-item-manager`, mounted in the page after `app-station-manager`; the rail entry `{ id: 'mm-sec-logistics', labelKey: 'metadata_logistics_title' }` added after the station entry in `_allJumpSections` (page class: these two lines only).
- [ ] List: `registry.items_()` (plan 521) grouped by phase (two `.c-chip--tab` chips, `logistics_tab_intake` / `logistics_tab_site_visit`, default intake) then by section in `LOGISTICS_SECTIONS` order; a shared item (`taxonomy.isShared(term)`) is a `.c-chip--tag` with a `lock` icon and a title `taxonomy_shared_admin_only`; an own item is a `.c-chip--removable` whose remove control asks `confirmModal.open(t('metadata_logistics_remove_confirm'))` then `taxonomy.remove(term)`; after each item a small muted suffix with the answer type (`logistics_type_<answerType>`) and, when set, the environment short labels.
- [ ] Add form (hidden for a guest, `requireSignIn()` pattern of `station-manager`): `.c-input` question text (maxlength 120, required, trimmed), `app-custom-select` phase (default = the selected tab), `app-custom-select` section (default `other`), `app-custom-select` answer type (`logistics_type_status` "כן/לא", `_quantity` "כמות", `_text` "טקסט"; default `status`), four `.c-chip--toggle` environment checkboxes (none checked = every environment), a `.c-chip--toggle` "משותף לכולם" (`metadata_logistics_shared`) shown only when `taxonomy.isAdmin_()`, button `metadata_add`. Submit → `taxonomy.add('logisticsItem', key, { phase, section, answerType, ...(envs.length && { environments: envs }) }, { shared })`; on success clear the text and the environment chips (phase/section/type keep their values), toast `metadata_logistics_added`; a duplicate key in the same phase (own or shared, compared trimmed) → inline `.c-field-error` `metadata_logistics_duplicate` and no call.
- [ ] Removing an item that an event already answered: the server refuses (existing delete-guard through `TERM_REFERENCES`); the error is shown as the toast `metadata_logistics_in_use` and the item stays.
- [ ] Every string through `translatePipe`; icons registered.

### Should Have (P1)
- [ ] none (renaming an own item is removal + re-add in this plan; inline rename is a later plan).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- Same card frame as the other Metadata Manager sections (`<section class="mm-section">` markup copied from `station-manager.component.html`'s host, header with icon + title + description).
- RTL; logical properties; under the mobile mirror the add form stacks vertically.
- Icons to register in `src/app/app.config.ts`: `Lock`, `ListChecks`.
- Dictionary keys (`general`, append-only): `metadata_logistics_title` ("שאלות לוגיסטיקה"), `metadata_logistics_desc` ("השאלות שהשף עובר עליהן בשיחה הראשונה ובפגישת הספקים. המשותפות נעולות; אפשר להוסיף משלכם."), `metadata_logistics_placeholder` ("שאלה חדשה, למשל: יש מקום לרכב קירור?"), `metadata_logistics_phase` ("שלב"), `metadata_logistics_section` ("סעיף"), `metadata_logistics_type` ("סוג תשובה"), `metadata_logistics_environments` ("רלוונטי ל…"), `metadata_logistics_shared` ("משותף לכולם"), `metadata_logistics_added` ("השאלה נוספה"), `metadata_logistics_duplicate` ("שאלה כזו כבר קיימת בשלב הזה"), `metadata_logistics_remove_confirm` ("למחוק את השאלה? תשובות שכבר ניתנו לאירועים יישמרו."), `metadata_logistics_in_use` ("אי אפשר למחוק: השאלה כבר נענתה באירוע"), `metadata_no_logistics_items` ("אין שאלות בסעיף הזה"), `logistics_type_status` ("כן/לא"), `logistics_type_quantity` ("כמות"), `logistics_type_text` ("טקסט"). Reused from plan 522: `logistics_tab_intake`, `logistics_tab_site_visit`, `logistics_section_*`; from the dictionary: `metadata_add`, `taxonomy_shared_admin_only`, the four environment labels.

## Atomic Sub-tasks
- [ ] C1: Build the manager that lists shared and own logistics questions and adds or removes own ones — component class per the Angular skill: OnPush, `inject()` (`TaxonomyStore`, `LogisticsItemRegistryService`, `ConfirmModalService`, `UserMsgService`, `TranslationService`, `UserService.isLoggedIn`, `AuthModalService`), signals `phase_`, `draft_` (text, phase, section, answerType, environments, shared), `error_`, computed `sections_` (grouped rows for the selected phase) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] C2: Write the card template — tabs, grouped rows (locked tag vs removable chip), the add form, the empty state per section — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html
- [ ] C3: Style the card like its siblings, mobile first — component-local SCSS, breakpoint mirror, no new `.c-*` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [ ] C4: Mount the card and give it a rail entry — the tag after `app-station-manager`, the import and `imports` entry, the `_allJumpSections` line — src/app/pages/metadata-manager/metadata-manager.page.component.html, src/app/pages/metadata-manager/metadata-manager.page.component.ts
- [ ] C5: Unit-test the card with a stubbed store — `TaxonomyStore.terms('logisticsItem')` returns 1 shared + 1 own item; `isShared`, `isAdmin_` (false), `add` / `remove` spies: the shared row has the lock and no remove control; the own row has the remove control; submitting "חדש" with section `access` calls `add` with `{ phase: 'intake', section: 'access', answerType: 'status' }` and no `environments`; submitting with two environment chips checked passes `environments: ['outdoor_field', 'client_home']`; submitting the shared item's key again sets `error_` and does not call `add`; remove → confirm spy resolves true → `remove` called; `remove` rejecting with the server's in-use error → toast `metadata_logistics_in_use` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [ ] C6: Add the Hebrew strings and the icons — the keys above, `Lock` and `ListChecks` — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] C7: Record the new piece in the maps — docs/brain/component-families.md (chip family Users), src/app/pages/breadcrumbs.md
- [ ] C8: Write one e2e spec per UI card with the plan-517 helpers — `signInQa`, `page.goto('/metadata-manager')`, the card's action, the assertion, screenshot `screens/523-<n>.png`; 523-3 removes what 523-2 added and both clean up in `finally` by deleting any own `logisticsItem` named "בדיקה E2E" through `DELETE /api/v1/data/taxonomyTerms/:id`; run each with `pnpm exec playwright test e2e/ui/523-<n>.spec.ts` — e2e/ui/523-1.spec.ts … e2e/ui/523-3.spec.ts
- [ ] C9: Run build, lint, lint:icons, lint:no-native-select, test:ci, reuse-lint and paste the outputs under Execution Notes

## What happens when
- On edit: there is no edit of an existing item in this plan; the chef removes and re-adds (the confirm text says answered events keep their answers).
- On leave: the add-form draft is dropped silently (no guard, like the other Metadata Manager cards).
- On cancel (remove confirm): nothing changes.
- On error: `add` rejected → toast `server_error` (existing key); `remove` rejected with the delete-guard error → toast `metadata_logistics_in_use`, any other rejection → `server_error`. The list is never changed optimistically; it follows the store.
- Signed out: the add form shows the sign-in prompt pattern of `station-manager` (`requireSignIn()`); the list is still shown (public read of master terms).

## Technical Considerations
- Dependencies: `TaxonomyStore.add / remove / isShared / isAdmin_ / canEdit`, `LogisticsItemRegistryService.items_` (521), `station-manager.component.*` and `coefficient-manager.component.*` (patterns), `ScrollRailComponent` rail list, `ConfirmModalService`, `UserMsgService`, `AuthModalService`, e2e helpers from 517.
- New files needed: the component folder (4 files), 3 e2e specs, 3 screenshots.
- Model changes: none.
- Backend / API: none — the generic `taxonomyTerms` POST / DELETE with the existing rules.
- Auth and validation: client checks `isLoggedIn`; the server authorizes (`create` for any member, `shared` for admin only, delete-guard via `TERM_REFERENCES`).
- Security surface: user text (≤ 120) rendered through interpolation only.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; keys listed; icons registered; `custom-select` with fixed lists (add-option rule not triggered); hotspots append-only.

## Out of Scope
- Renaming or reordering items; editing a shared item (admin edits stay in the later admin plan); the cross-business admin view and "promote to shared"; the event panel (522).

## Critical Questions
- Q1: May staff add own items? A: (a) yes — chosen by the Human (Q2 a, 2026-10-27; the kind is not locked). Not chosen: (b) owner only.

## Execution Notes
- Planner review (2026-11-05): added `metadata-manager.page.component.spec.ts` to scope — it hard-codes 13 jump tabs (lines ~381-412) and the new rail entry breaks it. Added 519 to Depends-on for ordering. Runs after 522 (both append to `dictionary.json`).
- Planner review 2026-11-07: plan 517 was re-scoped (brief 4) — the `TEST-CI:` line and `scripts/e2e-one.mjs` no longer exist; checks now read `npm run test:ci` exits 0, and card specs run with `pnpm exec playwright test <spec>`. Mechanical edit only.
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
