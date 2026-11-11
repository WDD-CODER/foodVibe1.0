# Plan 581 — Metadata card: edit and remove logistics questions, own sections, everybody or only-me

Status: draft
Depends-on: 579
Snapshot: 8d4f043ffd5ded749cf5c78836d241b87ada6f86

## Problem Statement
The Human's feedback on run 522 (2026-11-11, card V5; `.claude/todo.md` "Logistics feedback" F1, F2 card part, F3,
F4, F8, F9). Plan 579 adds the data this card needs (`logisticsItem.removedAt`, the business's dated
`hiddenLogisticsKeys`, kind `logisticsSection`, `LogisticsItemRegistryService.items_ / allItems_ / hiddenAt_ /
sections_ / sectionLabel`, `BusinessService.updateHiddenLogisticsKeys`, `.c-chip-group--tight`). Verified at 8d4f043f
in `src/app/pages/metadata-manager/components/logistics-item-manager/`:

- **Remove (F1, F2).** Only an own question can be removed (`.c-chip--removable` → `confirmModal.open` →
  `TaxonomyStore.remove`, a DELETE). A shared question is a locked `.c-chip--tag`; the owner cannot take it off his
  business's list, and the platform admin has no "everybody / only me" choice. A DELETE also loses the question for
  events that already had it, which the Human ruled out (plan 579 Q2).
- **Add form (F3).** Environment chips start empty ("none checked = every environment"); a platform admin gets a
  separate "משותף לכולם" checkbox (`metadata_logistics_shared`).
- **Sections (F4).** The section `app-custom-select` offers only the nine fixed `LOGISTICS_SECTIONS`.
- **Edit (F8, F9).** No edit: renaming is remove + re-add (plan 523 "What happens when"), so there is no unsaved-form
  question either.

## Goals & Success Criteria
**Primary:** on the Metadata Manager card an owner and the platform admin edit questions in the add form, remove them
(own: removed from that date; shared: hidden for the business; admin: for everybody or only for his business) and
bring hidden ones back, add their own sections, and the add form starts with every environment chosen.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:no-native-select` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts` (A5).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/581-metadata-card-edit-remove-logistics-questions-own-sections.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/581-metadata-card-edit-remove-logistics-questions-own-sections.plan.md` exits 0; `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] On `/dashboard?tab=metadata`, tapping the pencil beside the own question "בדיקה 581" puts "בדיקה 581" into the question field; changing the section to "צוות" and tapping "שמור" shows "בדיקה 581" once, under "צוות" (`e2e/ui/581-1.spec.ts`).
- [ui] On `/dashboard?tab=metadata`, the add form's four environment chips are all checked when the card opens, and the text "משותף לכולם" is not on the card (`e2e/ui/581-2.spec.ts`).
- [ui] On `/dashboard?tab=metadata`, with "טיוטה 581" typed in the question field, tapping the pencil of an own question opens the modal with "בטופס יש שאלה שלא נשמרה" (`e2e/ui/581-3.spec.ts`).
- [ui] On `/dashboard?tab=metadata`, choosing "הוסף סעיף חדש" in the section list, typing "סעיף 581" and saving shows a section heading "סעיף 581" on the card (`e2e/ui/581-4.spec.ts`).
- [ui] On `/dashboard?tab=metadata`, tapping the trash button of the own question "בדיקה 581" and confirming takes it off the card (`e2e/ui/523-3.spec.ts`, updated to the trash button and to `removedAt`).
- [ui] The builder re-runs `e2e/ui/523-1.spec.ts` and `e2e/ui/523-2.spec.ts` against the slot app; both pass.
- [human] Signed in as an owner (not platform admin), removing a shared question asks once and then shows it dimmed with "הוסרה מהעסק שלך" and "החזר"; a new event does not list it, an event created before still does; "החזר" brings it back.
- [human] Signed in as the platform admin, removing a shared question asks "לכל העסקים" or "רק לעסק שלי"; "לכל העסקים" takes it off the card for every business while an event created before still shows it; "רק לעסק שלי" hides it only for the admin's business.
- [human] On a phone-size window the card's rows with their pencil and trash buttons, the environment chips and the admin's scope chips read well and are easy to tap.

## Execution Mode
- Parallel: yes, after 579 — shares only the append-only hotspot `public/assets/data/dictionary.json`.
- Concurrent plans: any that do not touch the logistics card.
- Isolated DB: no — writes only fields plan 579 defines.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/components/logistics-item-manager/**
src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
server/breadcrumbs.md
e2e/ui/581-1.spec.ts
e2e/ui/581-2.spec.ts
e2e/ui/581-3.spec.ts
e2e/ui/581-4.spec.ts
e2e/ui/523-1.spec.ts
e2e/ui/523-2.spec.ts
e2e/ui/523-3.spec.ts
screens/581-*.png
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — every card action is one write: `TaxonomyStore.add` / `update` (edit, `removedAt`) or one `BusinessService.updateHiddenLogisticsKeys`; a rename's re-keying of event answers runs on the server in the same PUT (`TERM_REFERENCES`); nothing loops per document on the client.
- INV-2: preserves — the card reads master ∪ own through the registry; hiding a shared question writes only the business's own setting (plan 579), never the master term; only the platform admin's "לכל העסקים" changes a master term (`removedAt`), as today's admin-only master writes.
- INV-5: preserves — own sections are added as `taxonomyTerms` of kind `logisticsSection` (plan 579) through `TaxonomyStore.add`; no other store.

## Reuse Check
- Edit / remove / restore buttons — family: engine-classes — rung: 1 — why: `.c-icon-btn` (+ `.danger`) with `pencil`, `trash-2`, `undo-2`, as the recipe book rows do.
- Remove-scope choice, unsaved-question choice, hide confirm — family: modal-controller — rung: 1 — why: `ConfirmModalService.openTernary` / `open`.
- Environment chips and admin scope radios — family: chip — rung: 1 — why: `.c-chip--toggle` in `.c-chip-group c-chip-group--tight` (plan 579).
- Add a section from the section list — family: search-combobox — rung: 2 — why: `app-custom-select` inputs `addNewValue`, `addNewLabelKey` and output `addNewChosen`, then `AddItemModalService.open` (add-option rule W) and `notifyItemAdded` (rule M).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to fix a question's wording or section in place so that I don't delete and retype it.
- As a chef, I want to take a shared question I never ask off my list so that new events don't show it.
- As a chef, I want my own sections so that my questions are grouped the way my kitchen thinks.
- As a chef, I want a new question to apply to every environment unless I untick one so that I don't forget to choose.

## Functional Requirements

### Must Have (P0)
- [ ] **Rows.** Each row = the question as a `.c-chip--tag` (shared keeps the `lock` icon) + `.c-icon-btn` buttons at the inline end: `pencil` (aria `edit`) when `taxonomy.canEdit(term)`, `trash-2` (aria `delete`, `.danger`) when the user may remove it (below). The list is `registry.items_()` (live terms only, plan 579) plus the shared terms in `registry.hiddenAt_()`, which show dimmed (`.is-hidden`) with "הוסרה מהעסק שלך" (`metadata_logistics_hidden`) and an `undo-2` button "החזר" (`metadata_logistics_restore`) instead of the trash. Groups follow `registry.sections_()` with `registry.sectionLabel()`.
- [ ] **Remove (F1, F2).**
  - own question (any signed-in member, as today) → `confirmModal.open(t('metadata_logistics_remove_confirm'), { variant: 'warning' })` → `taxonomy.update(term, { removedAt: Date.now() })` (no DELETE: events created before keep it);
  - shared question, owner (`permission.can('editSettings', { type: 'businesses' })` and not platform admin) → `confirmModal.open(t('metadata_logistics_hide_confirm'))` → `business.updateHiddenLogisticsKeys([...hiddenKeys, key])`;
  - shared question, platform admin (`taxonomy.isAdmin_()`) → `confirmModal.openTernary(t('metadata_logistics_remove_scope_confirm'), { variant: 'warning', saveButtonLabel: 'metadata_logistics_scope_everyone', saveLabel: 'metadata_logistics_scope_mine' })`: `'save'` → `taxonomy.update(term, { removedAt: Date.now() })`; `'confirm'` → hide for the admin's business as above; `'cancel'` → nothing;
  - staff on a shared question: no trash button.
- [ ] **Restore.** "החזר" → `business.updateHiddenLogisticsKeys(hiddenKeys without key)`.
- [ ] **Re-adding a removed own question.** When the typed text (trimmed) equals an own term with `removedAt > 0` in the same phase, submit calls `taxonomy.update(term, { removedAt: 0, section, answerType, environments })` instead of `add` (the server keeps one own term per key), toast `metadata_logistics_added`.
- [ ] **Edit (F8).** The pencil (after F9) loads the term into the form: text = key, phase, section, answer type, environments (absent or empty → all four checked), scope = everyone when shared; sets `editing_`; selects its phase tab; scrolls the form into view (`formRef().nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })`) and focuses the question field. While editing, the submit button reads "שמור" (`save`), a "ביטול" (`cancel`) button clears the form, and the scope radios are disabled. Save → `taxonomy.update(term, { key, phase, section, answerType, environments })` with `environments: []` when all four are checked; toast `metadata_logistics_updated`; clear the form. The duplicate check skips the edited term. A refusal → `taxonomy.errorMessage(err)` when it names one (e.g. 409 key already shared), else `server_error`.
- [ ] **Unsaved question first (F9).** Before loading a term, when the form is dirty — adding: trimmed text not empty; editing: any field differs from the loaded term — ask `confirmModal.openTernary(t('metadata_logistics_unsaved_confirm'), { variant: 'warning', saveButtonLabel: 'save', saveLabel: 'metadata_logistics_discard' })`: `'save'` → submit, then load only if it succeeded; `'confirm'` → drop the draft and load; `'cancel'` → keep the form.
- [ ] **Add form (F3).** The four environment chips start checked and are re-checked after each add. All four → no `environments` sent (= every environment, also future ones); none → inline error `metadata_logistics_env_required`, no call; otherwise the checked list. The "משותף לכולם" checkbox goes; a platform admin sees two `.c-chip--toggle` radios "רק לעסק שלי" (`metadata_logistics_scope_mine`, default) / "לכל העסקים" (`metadata_logistics_scope_everyone`) setting `{ shared }`; an owner sees no scope choice (always own). Both chip groups use `.c-chip-group c-chip-group--tight`.
- [ ] **Own sections (F4).** The section `app-custom-select` takes its options from `registry.sections_()` (labels via `sectionLabel`), `addNewValue="__add_section__"`, `addNewLabelKey="add_new_logistics_section"`; `(addNewChosen)` → `addItemModal.open({ title: 'add_new_logistics_section', label: 'metadata_logistics_section', saveLabel: 'metadata_add', initialValue })` → name trimmed, cut to `LOGISTICS_LABEL_MAX`; a name equal to an existing section's label selects it; else `taxonomy.add('logisticsSection', name, {}, { shared: isAdmin && scope === 'everyone' })`, select the stored key, `notifyItemAdded`. Cancel selects nothing new. No rename or remove of sections; shared section terms stay locked by the taxonomy rules.
- [ ] The card's description switches to `metadata_logistics_desc_v2`. Every string through `translatePipe`; icons already registered (`pencil`, `trash-2`, `undo-2`, `lock`).

### Should Have (P1)
- [ ] `docs/brain/component-families.md`: chip family users line for the card updated (`--tag`, `--toggle` in `--tight` groups); modal-controller users gain the card's `openTernary` choices. `src/app/pages/breadcrumbs.md`: the `metadata-manager/` line mentions edit, remove/restore and own sections.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- RTL; logical properties only; the add form keeps stacking on a phone; the row buttons sit at the inline end.
- Dictionary keys (`general`, append-only):
  `metadata_logistics_desc_v2` ("השאלות שהשף עובר עליהן בשיחה הראשונה ובפגישת הספקים. אפשר להוסיף, לערוך ולהסיר; שאלה שהוסרה לא תופיע באירועים חדשים."),
  `metadata_logistics_updated` ("השאלה עודכנה"),
  `metadata_logistics_unsaved_confirm` ("בטופס יש שאלה שלא נשמרה. לשמור אותה קודם?"),
  `metadata_logistics_discard` ("לא לשמור"),
  `metadata_logistics_scope_mine` ("רק לעסק שלי"),
  `metadata_logistics_scope_everyone` ("לכל העסקים"),
  `metadata_logistics_remove_scope_confirm` ("להסיר את השאלה לכל העסקים או רק לעסק שלך? אירועים שכבר קיימים ישמרו אותה."),
  `metadata_logistics_hide_confirm` ("להסיר את השאלה המשותפת מהרשימה של העסק שלך? אירועים שכבר קיימים ישמרו אותה."),
  `metadata_logistics_hidden` ("הוסרה מהעסק שלך"),
  `metadata_logistics_restore` ("החזר"),
  `metadata_logistics_env_required` ("בחרו לפחות סביבה אחת"),
  `add_new_logistics_section` ("הוסף סעיף חדש").
  Reused: `edit`, `delete`, `save`, `cancel`, `metadata_add`, `metadata_logistics_section`, `metadata_logistics_remove_confirm`, `metadata_logistics_added`, `logistics_section_*`. `metadata_logistics_shared`, `metadata_logistics_in_use` and `metadata_logistics_desc` stay in the dictionary, unused.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Remove and restore questions by owner or admin choice — class per `.claude/skills/angularComponentStructure/SKILL.md`; inject `BusinessService`, `PermissionService`; `onRemove(row)` (the three cases of P0), `onRestore(term)`, rows carry `hidden`, `canEdit`, `canRemove`; the re-add of a removed own term in `onSubmit` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A2: Edit a question in the add form, asking first about an unsaved one — `editing_` signal, `formRef = viewChild.required<ElementRef<HTMLElement>>('addForm')`, `isDirty()`, `onEdit(term)` (F9 then F8), `onSubmit(): Promise<boolean>` (add, re-add or update), `cancelEdit()` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A3: Start with every environment, give the admin the scope radios and let users add a section — draft `scope: 'mine' | 'everyone'` replaces `shared`, `environments` default all four, `metadata_logistics_env_required`; `sectionOptions` computed from the registry; `onAddSection(typed)` with `AddItemModalService` and `notifyItemAdded` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A4: Show the row buttons, the restore state and the new form controls — template: rows with tag + pencil + trash/restore, hidden rows dimmed with `metadata_logistics_hidden`; `#addForm`; section select with the add option; environment chips and the admin scope radios in `.c-chip-group c-chip-group--tight`; submit label `metadata_add` / `save`, cancel while editing; description `metadata_logistics_desc_v2`; scss: row layout, `.is-hidden` (opacity token) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html, src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [ ] A5: Unit-test the card with stubbed store, registry, business, permission, confirm and add-item modal — envs start all checked; all four → no `environments`; none → `metadata_logistics_env_required` and no `add`; admin "לכל העסקים" → `{ shared: true }`; owner sees no scope radios; pencil loads the term and edit save calls `update` with `environments: []`; dirty form + pencil opens `openTernary` — `'cancel'` keeps the draft, `'confirm'` loads the new term, `'save'` submits first; own remove → `update(term, { removedAt: <number> })`, never `remove`; owner on shared → `updateHiddenLogisticsKeys([key])`; admin `'save'` → `update(master, { removedAt })`, `'confirm'` → hide; restore drops the key; re-add of a removed own text → `update(term, { removedAt: 0, … })`; add-section → `add('logisticsSection', 'סעיף שלי', {}, { shared: false })` and selected; the existing plan-523 cases updated (no lock-less remove chip, no in-use toast) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [ ] A6: Add the Hebrew strings — the keys of UI/UX Notes, appended to `general` — public/assets/data/dictionary.json
- [ ] A7: Write the four screen checks and update 523-3 — 581-1…4 per the `[ui]` lines with `signInQa`, API setup and cleanup in `finally` (own terms "בדיקה 581" and section "סעיף 581" deleted through `DELETE /api/v1/data/taxonomyTerms/:id`), screenshots `screens/581-<n>.png`; 523-3: click the row's trash button (aria "מחיקה") instead of `.c-chip__remove`, and its cleanup also deletes a removed (`removedAt`) "בדיקה E2E"; run each with `pnpm exec playwright test <spec>` with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports — e2e/ui/581-1.spec.ts, e2e/ui/581-2.spec.ts, e2e/ui/581-3.spec.ts, e2e/ui/581-4.spec.ts, e2e/ui/523-3.spec.ts
- [ ] A8: Record the changes in the maps and run every `[auto]` check — paste the outputs under Execution Notes — docs/brain/component-families.md, src/app/pages/breadcrumbs.md

## What happens when
- On edit: the form holds the term until "שמור" or "ביטול"; switching tabs keeps it; a second pencil asks first (F9).
- On leave: the draft is dropped silently (as the other Metadata Manager cards; plan 523).
- On cancel (any confirm): nothing changes.
- On error: add / update / remove / hide / restore / add-section → `taxonomy.errorMessage(err)` when it names one, else toast `server_error`, logged as `crud.logistics_items.<add|update|remove|hide|restore|add_section>_error`; the list follows the store and `business_()`, never optimistically.
- Signed out: the list and the sign-in button; no row buttons.
- Renaming a question: the server re-keys event answers and hidden keys (plan 579 `TERM_REFERENCES`); its `createdAt` stays, so the events it shows on do not change.

## Technical Considerations
- Dependencies: plan 579 (`removedAt`, `hiddenLogisticsKeys`, `logisticsSection`, registry members, `BusinessService.updateHiddenLogisticsKeys`, `.c-chip-group--tight`); `TaxonomyStore.add / update / canEdit / isShared / isAdmin_ / errorMessage`; `PermissionService.can`; `ConfirmModalService.open / openTernary`; `AddItemModalService`; `notifyItemAdded` (`src/app/core/utils/add-option.util.ts`); e2e `signInQa`.
- New files needed: `e2e/ui/581-1.spec.ts` … `581-4.spec.ts`, screenshots.
- Model changes: `LogisticsItemDraft.scope` replaces `shared`; `section` typed `string`.
- Backend / API: none — the generic `taxonomyTerms` POST / PUT and plan 579's business route.
- Auth and validation: client shows controls by `canEdit` / `editSettings` / `isAdmin_`; the server authorizes (own terms for members, master terms admin-only, hide list owner-only).
- Security surface: question and section text ≤ 120 chars, rendered through interpolation only.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; dictionary keys listed (append-only); icons registered; add-option rule followed for the section select (one add option last, `add_new_logistics_section`, modal with `initialValue`, select the stored key, `notifyItemAdded`, keyboard by `app-custom-select`); logical CSS.

## Out of Scope
- Renaming, reordering or removing sections.
- Changing a question's scope (own ↔ shared) while editing — promote stays on `/platform` (plan 532).
- The event screen (plan 579).
- Bringing back a question the admin removed for everybody (no UI; `removedAt: 0` by API only).

## Critical Questions
- Q1: How does the platform admin choose shared or own when adding? A: (Human, 2026-11-11) two radios, "רק לעסק שלי" (default) and "לכל העסקים".
- Q2: May a business rename or remove sections? A: (Human, 2026-11-11) a business only adds its own sections (kind `logisticsSection`); shared sections cannot be renamed or removed by a business.
- Q3: What does the platform admin's "remove for everybody" reach? A: (Human, 2026-11-11) only future events; events that already exist keep it.

## Open questions for the Human
- none

## Execution Notes
- Planner draft 2026-11-11 (feedback F1, F2 card part, F3, F4, F8, F9), split from plan 579, which supplies the data.
