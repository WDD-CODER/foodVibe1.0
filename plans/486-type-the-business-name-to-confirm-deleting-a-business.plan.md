# Plan 486 — Type the business name to confirm deleting a business

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), item 10 (check 14), Dandan's words: "in the second
confirmation step of the delete-business popup, the user must type the exact business name before the final delete
button enables."

As a platform admin, I want to type the business's name before the last delete button works, so that one slip of the
mouse never wipes a kitchen's whole business.

Verified in code on `mvp-qa-fixes` (`ea6af7b0`):
- The users card (platform admin only) is `src/app/pages/metadata-manager/components/user-management/`, mounted at
  `metadata-manager.page.component.html:157-159` inside `@if (isPlatformAdmin_())`, on `/dashboard?tab=metadata`.
- `user-management.component.ts:58-85` `onDeleteUser`: for an owner row it asks
  `confirmModal.open('delete_business_confirm' + ' "<name>"')` (line 61-64), then a second plain yes/no
  `confirmModal.open('delete_business_confirm_final', { variant: 'danger', saveLabel: 'remove' })` (line 67-70), then
  `userAdmin.deleteUser` (line 73). The name used is `user.businessName ?? user.name` (line 60).
- **Root cause:** the second step is the shared yes/no popup. `ConfirmModalService` (`src/app/core/services/confirm-modal.service.ts:7-16`
  `ConfirmModalOptions`) has no way to ask for typed text, and `src/app/shared/confirm-modal/confirm-modal.component.html:49-57`
  renders the confirm button always enabled, so one more click deletes the business.
- Server: `server/routes/admin.js:41-64` `DELETE /users/:userId` (`requirePlatformAdmin`) deletes the whole business for
  an owner. It refuses the admin's own business (line 50). It is not changed by this plan.
- **Second gap (reviewer, same flow):** the server deletes the whole business when
  `Boolean(target.businessId) && target.businessRole !== 'staff'` (`admin.js:52`), and `businessRole` defaults to
  `null` (`server/models/User.js:18`, sent as `null` by `GET /users`, `admin.js:30`). The client decides "owner" with
  `user.businessRole === 'owner'` (`user-management.component.ts:59`). A user with a business but no role therefore gets
  the one-question staff popup («המשתמש יימחק. הפריטים שיצר יישארו בעסק») while the server wipes the whole business — the
  typed-name step would be skipped exactly where it matters. T3 makes the client use the server's rule.
- `businessName` is `null` when the business document has no name (`admin.js:32`); `??` falls back to `user.name`, but an
  empty-string name would make the expected text `''` and the check pass with an empty box. T1/T3 close that.
- The confirm popup is rendered once in `src/app/appRoot/app.component.html:37` (`<app-confirm-modal />`) on
  `app-modal-shell` (plan 451). It is used by ~41 files; every one of them must look and act the same after this plan.
- Earlier work: plan 426 built the two questions (`docs/mvp/runs/426.md` check ③); plan 468 moved the trash icon
  (`user-management.component.spec.ts:113-126`). No plan in 459–485 touched this flow.
- Dictionary today: `delete_business_confirm` (`public/assets/data/dictionary.json:739`), `delete_business_confirm_final` (:740),
  `business_deleted` (:742), `remove` (:365).

## Goals & Success Criteria
- Primary: in the second delete-business question, «הסר» stays disabled until the admin types the business name exactly; every other confirm popup is unchanged.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/core/services/confirm-modal.service.spec.ts --include=src/app/shared/confirm-modal/confirm-modal.component.spec.ts --include=src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts` → all SUCCESS, covering: (a) service: with `typedConfirm`, `choose('confirm')` does nothing until the typed text matches; a match after trimming spaces at both ends resolves `true`; text that differs by one letter does not; `open()` and `choose()` clear the typed text; without `typedConfirm`, `canConfirm` is true from the start; an `expected` that is empty after trimming never confirms; (b) component: no text box without `typedConfirm`; with it, a text box and the expected name show, the confirm button is disabled until the match, Enter in the box confirms only on a match; (c) user-management: the second question for an owner passes `typedConfirm.expected` = the business name (and `user.name` when the business name is missing or blank); a user with a `businessId` and no `businessRole` gets both questions and the `typedConfirm` (server rule); staff delete still asks once with no `typedConfirm`.
  - [ ] [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Desktop 1440 px replay of check 14 (cards ①, ②, ④ below): wrong name keeps «הסר» disabled, «ביטול» keeps the business, the exact name deletes it.
  - [ ] [human] Phone 375 px (card ③): the second question with its text box fits the screen.

### Validation cards (builder copies these into `docs/mvp/runs/486.md` `## Human checks`, with the slot's real port)
SAFETY for every card: never press the trash icon on any row except `del486-owner`. Never delete «QA Review Kitchen»
(the shared QA accounts business) or any other business. The dev guest's own row is disabled anyway.

SETUP (once, before card ①): on the slot app, signed out, open «התחברות» → tab «הרשמה»; sign up username
`del486-owner`, any email (e.g. `del486@test.local`), any password + confirmation, «שם העסק» = `מטבח למחיקה 486`.
Sign out, then sign in with «Guest (Dev)» (the platform admin). Open `/dashboard?tab=metadata` and scroll to
«ניהול משתמשים». If a `del486-owner` row is left from an earlier run, use it (or sign up `del486-owner2` with
business `מטבח למחיקה 486ב` and use that name everywhere below).

▸ Metadata page, users card — `/dashboard?tab=metadata` (dev guest, desktop 1440 px)   (checks ①, ②, ④; ③ is at 375 px)
① A wrong name keeps the final delete locked
   DO      on the `del486-owner` row press the trash icon, press «הסר» in the first question; in the second question type `מטבח למחיקה` (without 486) into the text box, press Enter, then press the red «הסר»
   SEE ✓   the second question shows «המחיקה סופית ואי אפשר לשחזר אותה. למחוק את העסק?», the label «כדי למחוק, יש להזין את שם העסק:», the name «מטבח למחיקה 486», a text box; the red «הסר» button looks faded; after Enter and after pressing «הסר» the popup is still open and the row is still in the list
   FAIL ✗  no text box, «הסר» looks normal or closes the popup, or the business is deleted
② Cancel keeps the business, and the box starts empty next time
   DO      from ①, press «ביטול»; then press the trash icon on the same row again and «הסר» in the first question
   SEE ✓   after «ביטול» the popup closes and the `del486-owner` row is still there; the new second question has an empty text box and a faded «הסר»
   FAIL ✗  the row is gone, or the box still holds the old text, or «הסר» looks normal
③ Phone width: the second question fits (375 px)
   DO      at 375 px width, open the second question for `del486-owner` as in ① and type `מטבח למחיקה`; then press «ביטול»
   SEE ✓   the message, label, name, text box and both buttons are all visible inside the popup, nothing is cut off, no sideways scroll
   FAIL ✗  the box or a button sticks out of the popup or the page scrolls sideways
④ The exact name deletes the business (desktop, last)
   DO      open the second question for `del486-owner` again, type `מטבח למחיקה 486` exactly, press the red «הסר»
   SEE ✓   «הסר» stops looking faded as soon as the full name is typed; after the press a toast says «העסק נמחק» and the `del486-owner` row is gone; the «QA Review Kitchen» rows are still there
   FAIL ✗  «הסר» stays disabled with the exact name, the row stays, or any other business disappears

## Execution Mode
- Parallel: yes — owns `confirm-modal` (service + component) for this run; other plans only call `ConfirmModalService.open`/`openTernary` unchanged. Dictionary is an append-only hotspot.
- Isolated DB: no (the card signs up a throwaway business and deletes only that one).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then review-fixes, then review).
- Matching rule (Planner decision): typed text and expected name are compared after trimming spaces at both ends;
  everything else must be identical (case, letters, inner spaces). No Hebrew normalising: "exact" means exact.
- Pasting the name is allowed (it still proves the admin looked at the right business).
- Owner rule (reviewer decision): the client asks the two business questions for every row the server would delete
  as a whole business (`businessId` set and role not `staff`), not only `businessRole === 'owner'`. Without it the new
  typed step is skipped for a business user with no role. A row with no `businessId` stays a one-question user delete.
- CSS trap: `src/styles.scss:413` resets `input` outside any `@layer`. Style the box only through the `.c-input` engine
  class (unlayered, wins by specificity) and `app-form-field`; component SCSS only lays out the wrapper (gap, margins),
  never the raw `input`. Check the rendered popup in the browser.
- The guard is in the UI only. The server route stays platform-admin-only and refuses the admin's own business; it is
  a guard against slips, not a new security control.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspot `public/assets/data/dictionary.json` (new key `delete_business_type_name` only).

```scope
src/app/core/services/confirm-modal.service.ts
src/app/core/services/confirm-modal.service.spec.ts
src/app/shared/confirm-modal/confirm-modal.component.ts
src/app/shared/confirm-modal/confirm-modal.component.html
src/app/shared/confirm-modal/confirm-modal.component.scss
src/app/shared/confirm-modal/confirm-modal.component.spec.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.ts
src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/mvp/runs/486.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/486.md`, add it to
the scope block, continue (run mode: you work alone). Never change `server/**` for this plan.

## Architecture Impact
- INV-3: preserves — the users card in `pages/metadata-manager/**` only adds a typed check before the same single `DELETE /users/:id`; the cascade still runs on the server in one request.
- INV-1: preserves — `requirePlatformAdmin` on the server still decides the delete; no permission change.
- INV-2, INV-4, INV-5, INV-6: preserves — no tenancy, schema, taxonomy or AI change.
- INV-none: preserves — client-only popup change.

## Backend Impact
- None. No API, schema, migration or data change. Security surface: unchanged (server gate as before).

## Reuse Check
- Typed-text confirm option on the shared yes/no popup — family: modal-shell — rung: 3 — why: `app-confirm-modal` / `ConfirmModalService` is the registered "simple yes/no"; add an optional `typedConfirm` to it instead of a new popup, and update the family entry
- Text box with a label inside the popup — family: form-field — rung: 1 — why: `app-form-field` + `.c-input` already do label + input

## Step 0 — Reality Check
Find `onDeleteUser` and `delete_business_confirm_final` in `user-management.component.ts`, `ConfirmModalOptions`,
`open`, `openTernary`, `choose` in `confirm-modal.service.ts`, the confirm button in `confirm-modal.component.html`,
`app-form-field` inputs (`label`, `forId`), the dictionary key `delete_business_confirm_final`. Print `ok` /
`conflict: <what>` in `docs/mvp/runs/486.md`.

## Atomic Sub-tasks
- [ ] T1: Let the shared confirm popup wait for an exact typed text before its confirm button works — add optional `typedConfirm?: { expected: string; labelKey: string }` to `ConfirmModalOptions`; signals `typedConfirm_` (null when absent), `typedText_`, readonly `typedConfirm`, `typedText`, computed `canConfirm` (true when no `typedConfirm`; false when `expected.trim()` is empty; else `typedText.trim() === expected.trim()`); `setTypedText(v)`; `open`/`openTernary` set both, `choose` resets both; `choose('confirm')` (or `true`) is ignored while `canConfirm()` is false — src/app/core/services/confirm-modal.service.ts
- [ ] T2: Show a labelled text box with the expected name in the popup and lock the confirm button until it matches — inside `@if (modalService.typedConfirm(); as typed)` between the message and `.c-modal-actions`: `app-form-field` (`label` = `typed.labelKey`, `forId="confirm-modal-typed"`), the expected name in a `<strong dir="auto">` line, `<input id="confirm-modal-typed" class="c-input" type="text" autocomplete="off" dir="auto">` bound to `typedText()` / `(input)` → `setTypedText`, `(keydown.enter)` → `choose('confirm')` only when `canConfirm()`; the box gets focus when the popup opens (the component lives once in the app root, so a constructor `afterNextRender` is not enough: `#typedInput` + `viewChild<ElementRef<HTMLInputElement>>('typedInput')` and an `effect` that calls `focus({ preventScroll: true })` whenever that signal holds an element — `app-modal-shell` keeps focus that is already inside its card); confirm button `[disabled]="!modalService.canConfirm()"`; wrapper spacing in the component SCSS only (logical properties, no raw `input` rule) — src/app/shared/confirm-modal/confirm-modal.component.html, src/app/shared/confirm-modal/confirm-modal.component.ts, src/app/shared/confirm-modal/confirm-modal.component.scss
- [ ] T3: Ask for the business name in the second delete-business question — `isOwner` uses the server's rule `!!user.businessId && user.businessRole !== 'staff'` (`admin.js:52`); one `const businessLabel = user.businessName?.trim() || user.name` feeds both the first question's quoted name and `typedConfirm: { expected: businessLabel, labelKey: 'delete_business_type_name' }` on the second `open` (keep `variant: 'danger'`, `saveLabel: 'remove'`); first question text and a real staff delete (one question, `user.name`) unchanged — src/app/pages/metadata-manager/components/user-management/user-management.component.ts
- [ ] T4: Add the Hebrew label for the name box — append `"delete_business_type_name": "כדי למחוק, יש להזין את שם העסק:"` next to `delete_business_confirm_final` — public/assets/data/dictionary.json
- [ ] T5: Note the new popup option in the reuse registry so the next typed confirm reuses it — modal-shell entry: "`ConfirmModalService.open(msg, { typedConfirm })` — confirm waits for an exact typed text (plan 486)" — docs/brain/component-families.md
- [ ] T6: Cover the typed confirm and the delete flow with tests — new service spec; component spec mock gains `typedConfirm`, `typedText`, `canConfirm`, `setTypedText`; user-management spec asserts `typedConfirm` on the second call (see Done-when) — src/app/core/services/confirm-modal.service.spec.ts, src/app/shared/confirm-modal/confirm-modal.component.spec.ts, src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts
- [ ] V1: Build, run the specs and the registry check, replay the cards in the browser and write the run file — docs/mvp/runs/486.md

## Out of Scope
- Server-side name check on `DELETE /users/:userId` (the route is platform-admin-only already).
- The first delete question's text, the staff-user delete (one question), and every other confirm popup's look and behaviour.
- Moving the hand-drawn dialogs onto `app-modal-shell`.

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

- Architect: Architecture Impact filled (INV-3 is the only `Touches` hit: `src/app/pages/metadata-manager/**`); every
  named file and symbol exists at `ea6af7b0` except the new `confirm-modal.service.spec.ts` (marked new) and the new
  dictionary key; the design extends the registered yes/no popup (rung 3) with an optional, backward-compatible
  option, so the ~41 callers compile and behave as before; signals only, `inject()`, no `any`; scope covers every
  written file and nothing more.
- PM: problem and success criteria are testable; every Done-when is tagged; Out of Scope written; backend/API, auth,
  security surface and data/migration impact named as none; smallest version (no server change, no new popup); each
  sub-task names its files. Plan checks: log-query item present, Reuse Check present, dictionary append-only, RTL via
  logical properties and `dir="auto"` on the name and the box, new key named.
- Passed list kept: check 14 ("component-families approved") — the registry only gains one line in the modal-shell
  entry. Check 9 (AI model toggle for admins) — `app-ai-model-manager` is not touched.
- Validation safety: the cards create and delete a throwaway business (`del486-owner` / «מטבח למחיקה 486») and never
  touch «QA Review Kitchen».
- Independent review (2026-10-24, plan reviewer): fixed three gaps in place — (1) client "owner" test did not match the
  server's whole-business rule, so a business user with no role skipped the typed step → T3 uses the server rule, spec
  covers it; (2) a blank business name made the expected text empty and the check pass with an empty box → `?.trim() ||`
  fallback in T3 and "empty expected never confirms" in T1; (3) the focus step had no mechanism that works for the
  root-mounted popup → named in T2. Cards now say "looks faded / pressing does nothing" instead of "disabled", and
  card ① presses the faded «הסר» to replay the one-click delete literally. Scope unchanged.
