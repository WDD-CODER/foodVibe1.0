# Plan 538 — The "save or leave" question always shows in front of every popup, panel and menu

Status: draft
Depends-on: none
Snapshot: 1e6f0f9ca6c8c910809b2653a39d43c45e7ae544

## Problem Statement
The Human saw the unsaved-changes question ("יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?", key
`unsaved_changes_confirm`) open **behind** another layer, so it looks like nothing happened and the screen seems stuck.

Root cause (code at 1e6f0f9c): the question is `app-confirm-modal` (`src/app/shared/confirm-modal/`), rendered once in
`src/app/appRoot/app.component.html:40` inside `app-modal-shell`, whose overlay is the `.c-modal-overlay` engine with
`z-index: 1000` (`src/styles.scss:646-655`). There is no stacking scale: every popup picks its own number, and the
question has no number of its own. So it loses to anything at 1000 that comes later in the page, to anything above
1000, and to anything in the browser top layer:
- **Same 1000, later in the page (DOM order wins a tie):** `app-ai-recipe-modal`, `app-ai-menu-modal`,
  `app-ai-product-modal` (`app.component.html:42-50`, after the confirm). All three pass `[hasChanges]`, so Escape or a
  backdrop tap with typed text asks the question (`modal-shell.component.ts` `requestDismiss_`) — it opens under the popup.
- **Above 1000:** `app-add-item-modal` `[zIndex]="1100"` (`add-item-modal.component.html:4`, also `[hasChanges]`) — the
  add-option popup (e.g. new station on the recipe builder); `app-translation-key-modal` `[zIndex]="1200"`;
  the equipment side panel as a phone/tablet popup `.inline-edit-panel.as-modal` `z-index: 1001`
  (`src/styles.scss:1377-1393`), whose backdrop tap asks the question (`equipment-list.component.ts`
  `onInlinePanelClickOutside` → `mayLeaveRowPanel_`); the event export sheet `z-index: 1190/1200`
  (`menu-export-sheet.component.scss:9,32`) when the page's leave guard fires while it is open.
- **Browser top layer** (beats any z-index): `paste-ingredients-dialog` (`popover="manual"`, recipe builder) when the
  leave guard fires while it is open (browser Back); the row-actions / nutrition / partial-cost popovers.
- The toast sits at 9999 (`user-msg.component.scss:14`, plan 539 owns that file) — above the question today.

## Goals & Success Criteria
**Primary:** the unsaved-changes question (and every other yes/no question from `ConfirmModalService`) is always the
front-most thing on screen, on every screen and width; popup stacking comes from one named scale, not loose numbers.

- [auto] `pnpm run test:ci` exits 0, including the new cases in `src/app/shared/modal-shell/modal-shell.component.spec.ts` and `src/app/shared/confirm-modal/confirm-modal.component.spec.ts` (A3, A4).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `grep -rnE '\[zIndex\]="[0-9]' src/app` prints nothing (every popup layer is a token).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [human] At 390 px (Chrome device mode, iPhone 12 Pro) and at 1280 px: on `/recipe-book`, tap the round "+" button, pick "הוסף מתכון עם AI", type "בדיקה" in the box, then press Escape (phone: tap the dark area outside the popup). The question "יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?" shows **in front of** the AI popup and its buttons react; "ביטול" returns to the popup with "בדיקה" still typed.
- [human] At 390 px and 1280 px: on `/recipe-builder`, type a new name in the "תחנה" field and pick the add line at the bottom of the list; in the "הוסף תחנה חדשה" popup change the text, then press Escape (phone: tap outside). The question shows in front of the popup.
- [human] At 390 px only: on `/inventory/equipment`, open any row for editing, change its name, then tap the dark area outside the panel. The question shows in front of the panel, not under it; "יציאה בלי לשמור" closes the panel.
- [human] At 1280 px: on `/inventory/add`, type a product name, then click "לוח בקרה" in the header. The question shows in front, with "יציאה בלי לשמור" (no change from today — a regression check).

## Execution Mode
- Parallel: yes — no shared file with plan 539 (539 does not touch `src/styles.scss`; 538 does not touch `user-msg`).
- Concurrent plans: 539. `docs/brain/component-families.md` is a shared-file lock with 533/534/535 (append one line).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/modal-shell/**
src/app/shared/confirm-modal/**
src/app/shared/modal-shell/modal-shell.component.spec.ts
src/app/shared/confirm-modal/confirm-modal.component.spec.ts
src/app/shared/add-item-modal/add-item-modal.component.html
src/app/shared/translation-key-modal/translation-key-modal.component.html
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; popup shell, confirm popup, two templates, one appended token block and a registry line.

## Reuse Check
- `--z-*` stacking tokens (appended `:root` block in `src/styles.scss`) — family: engine-classes — rung: 3 — why: tokens beside the existing design tokens; no new `.c-*` class.
- `app-modal-shell` `topLayer` input (opt-in browser top layer, plan 460's popover pattern) — family: modal-shell — rung: 3 — why: one input on the shared shell; only the confirm popup turns it on.
- `app-modal-shell` `zIndex` input takes a token string (`'var(--z-modal-nested)'`) as well as a number — family: modal-shell — rung: 3 — why: same input, wider type; no new input.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the "save or leave" question always in front so that I can answer it and never think the screen froze.
- As a chef, I want a popup opened from another popup to sit above it so that I always see the one I am working in.

## Functional Requirements

### Must Have (P0)
- [ ] Append to the end of `src/styles.scss` one `:root` block "Stacking order (plan 538)", low to high, each with a comment
  naming who uses it today: `--z-header: 100` (header), `--z-floating: 200` (hero FAB, update banner, approve stamp,
  200–250), `--z-modal: 1000` (`.c-modal-overlay`; the equipment panel popup is 1001), `--z-modal-nested: 1100`,
  `--z-modal-nested-2: 1200`, `--z-confirm: 2000` (the yes/no question), `--z-toast: 9999` (the toast). Do not rewrite
  the existing numeric rules (append-only hotspot); the comment maps them to the scale.
- [ ] `modal-shell.component.ts`: widen `zIndex` to `input<number | string | null>(null)` (doc: "a `var(--z-*)` token from
  `src/styles.scss`, or a number for old callers"); add `readonly topLayer = input(false)` — when true, after render
  call `showPopover()` on the overlay if `typeof el.showPopover === 'function'` (plan 460 pattern, as in
  `paste-ingredients-dialog.component.ts:30-34`), and set `popover="manual"` on the overlay only then
  (`[attr.popover]="topLayer() ? 'manual' : null"` in `modal-shell.component.html`). Without popover support the
  `zIndex` still applies. Focus-in, Tab trap, Escape-top-most and focus-restore stay as they are.
- [ ] `confirm-modal.component.html`: `[zIndex]="'var(--z-confirm)'"` and `[topLayer]="true"` on `app-modal-shell`.
  The newest top-layer element is drawn last, so the question beats the paste dialog and any open popover too.
- [ ] `add-item-modal.component.html:4` → `[zIndex]="'var(--z-modal-nested)'"`; `translation-key-modal.component.html:2`
  → `[zIndex]="'var(--z-modal-nested-2)'"` (same numbers as today, now named).

### Should Have (P1)
- [ ] `modal-shell.component.spec.ts`: (a) `zIndex = 'var(--z-modal-nested)'` lands on the overlay's inline style;
  (b) `topLayer = true` → overlay matches `:popover-open`; (c) `topLayer` default → overlay has no `popover` attribute.
- [ ] `confirm-modal.component.spec.ts`: with the service open, the overlay is `:popover-open` and its inline
  `z-index` is `var(--z-confirm)`; a second shell rendered first with `[zIndex]="'var(--z-modal-nested-2)'"` does not
  change that.
- [ ] `docs/brain/component-families.md` modal-shell entry: one line — "Stacking: `[zIndex]` takes a `--z-*` token
  (`src/styles.scss`, plan 538); `[topLayer]` puts a popup in the browser top layer (the confirm popup uses both, so a
  question is always in front)."

### Nice to Have (P2)
- [ ] none.

## What happens when
- The question opens while a toast shows: the question is now in front of the toast (the toast is behind the dimmed backdrop until answered). Intended: the question is modal.
- Answer "שמור וצא" and the save fails: the question has already closed, so the error toast shows as today.
- A browser without popover support (iOS < 17): the question uses `--z-confirm` (2000), above every popup and panel; only a top-layer popover could still cover it.

## UI/UX Notes
- No visual change except order on screen. RTL unchanged (`dir="rtl"` on the card). No dictionary keys, no icons.

## Atomic Sub-tasks
- [ ] A1: One named stacking scale — append the `--z-*` `:root` block with the mapping comment — src/styles.scss
- [ ] A2: The popup shell takes a token and can go to the top layer — `zIndex` type, `topLayer` input, popover attribute and `showPopover()` — src/app/shared/modal-shell/modal-shell.component.ts, src/app/shared/modal-shell/modal-shell.component.html
- [ ] A3: Prove the shell — the three spec cases — src/app/shared/modal-shell/modal-shell.component.spec.ts
- [ ] A4: The question always in front — `[zIndex]` + `[topLayer]` on the confirm popup, and its spec case — src/app/shared/confirm-modal/confirm-modal.component.html, src/app/shared/confirm-modal/confirm-modal.component.spec.ts
- [ ] A5: Name the two nested popup layers — src/app/shared/add-item-modal/add-item-modal.component.html, src/app/shared/translation-key-modal/translation-key-modal.component.html
- [ ] A6: Registry line for the new shell inputs — docs/brain/component-families.md
- [ ] A7: Run every `[auto]` check and paste the outputs under Execution Notes

## Technical Considerations
- Dependencies: `ConfirmModalService` (unchanged), `modal-controller.ts` stack (unchanged — the confirm shell is still pushed last, so Escape goes to it), `.c-modal-overlay[popover]` reset at `src/styles.scss:2570-2583` (read only).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys; logical CSS only; `src/styles.scss` append only.

## Out of Scope
- Moving every other hard-coded z-index (header 100, FAB 101/210, export sheet 1190/1200, side panel 1001, toast 9999) onto the tokens — a later sweep; this plan only names the scale and uses it for popups.
- The toast file (`src/app/core/components/user-msg/`) — plan 539.
- The 7 hand-drawn dialogs in the modal-shell "Known copies" list.

## Critical Questions
- none

## Execution Notes
- Human 2026-11-08: keep the top-layer step (the question beats the paste dialog and popovers), not tokens only.
- Planner 2026-11-08: drafted from the Human's report; repro paths named from the code, not yet seen in the browser.
