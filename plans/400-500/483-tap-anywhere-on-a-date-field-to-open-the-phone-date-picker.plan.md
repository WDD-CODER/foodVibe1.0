# Plan 483 — Tap anywhere on a date field to open the phone date picker

Status: done
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22, check 13 (phone): the small calendar button that plan 467 added next to
date fields makes the phone worse. Wanted: remove the button; tapping anywhere on the date field (including the
placeholder text) opens the phone's native date picker at once.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- Shared field `src/app/shared/date-field/` (plan 467, `da4a9c9a`, follow-up `518570d4`): text input
  (`date-field.component.html:2-18`, `type="text"`, placeholder `dd/mm/yyyy`, `inputmode="numeric"`), the button
  (19-27, `.date-field-btn`, `openCalendar()`, `open_calendar`, icon `calendar-days`), hidden native picker (28,
  `<input #picker type="date" class="date-field-picker" tabindex="-1" aria-hidden="true" (change)="onPicked($event)">`,
  1×1 px, opacity 0, `pointer-events: none` in the scss).
- `openCalendar()` copies the value, tries `showPicker()`, falls back to `click()`; `onPicked()` writes ISO, updates
  the text and emits `committed`. Typing path `onType` / `onCommit` / `apply` sets `invalid`.
- Why 467 made it a text field (plan 467 line 15): a native date input shows US order on an English phone; the text
  field keeps dd/mm/yyyy display.
- Used in 3 places: `new-inquiry-dialog.component.html:47`, `event-stage-bar.component.html:124-129`
  (deposit date, `[disabled]="!canEditMoney_()"`), `deposit-paid-dialog.component.html:15`.
- Spec `date-field.component.spec.ts:108-109, 130` targets `.date-field-btn` / `showPicker`.

## Goals & Success Criteria
- Primary: on a phone, one tap anywhere on a date field opens the native date picker; no calendar button; the field
  still shows the date as dd/mm/yyyy.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `npx ng test --watch=false --include=src/app/shared/date-field/date-field.component.spec.ts` passes with updated specs: no `.date-field-btn`; on a coarse pointer a tap on the field reaches the native picker; picking a date sets the value, the dd/mm/yyyy text and emits `committed`; a disabled field opens nothing.
  - [x] [auto] Dictionary key `open_calendar` removed if no longer used (`grep -rn "open_calendar" src` → empty) — or kept with a logged reason.
  - [ ] [human] Phone replay: menu library → new inquiry → tap the date field on its placeholder text: the phone's date picker opens at once (no keyboard, no button next to the field). Pick a date: the field shows it as dd/mm/yyyy. Repeat on an event's deposit date (stage bar) and in the "deposit paid" window.
  - [ ] [human] Desktop sanity: the same date fields still work on a desktop (click opens the browser's picker or typing dd/mm/yyyy works) and there is no calendar button.

## Execution Mode
- Parallel: yes — `src/app/shared/date-field/**` only.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Planner decision: keep `app-date-field` (dd/mm display stays). On a coarse pointer (`(pointer: coarse)`), stretch the
  native `type="date"` input over the whole field (`inset: 0`, full size, `opacity: 0`, `pointer-events: auto`), so
  the tap lands on the native input itself (most reliable on iOS and Android, no `showPicker` needed); the text input
  underneath is display-only there (`readonly`, no `inputmode`) so the keyboard never opens. On a fine pointer
  (desktop) keep typing, and a click on the field calls `showPicker()` when available. Remove the button.
- Accessibility: the native input carries the field's label (`aria-labelledby` / `id` from `inputId`) on touch; on
  desktop the text input keeps it.
- Plan 482 widens select-on-focus to `input[type=number]` only — no overlap with date inputs.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`public/assets/data/dictionary.json` — removing `open_calendar` is allowed for this plan).

```scope
src/app/shared/date-field/**
docs/mvp/runs/483.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1..INV-6: preserves — client input behaviour only.

## Backend Impact
- None.

## Step 0 — Reality Check
Find `openCalendar`, `onPicked`, `.date-field-btn`, `.date-field-picker`, the three usages. Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [x] F1: Remove the calendar button and `openCalendar`'s button wiring — `date-field.component.html/.ts/.scss`
- [x] F2: Touch: native date input covers the field; text input readonly on coarse pointer — `.html/.scss/.ts`
- [x] F3: Desktop: typing kept; click on the field opens `showPicker()` when supported — `.ts`
- [x] F4: Specs updated (see Done-when); `open_calendar` key cleanup.
- [x] V1: Build, tests, browser replay at 375 px with touch emulation and at 1440 px, write `docs/mvp/runs/483.md`.

## Out of Scope
- Other native date inputs that never had the button (menu-intelligence page, menu-library list, recipe-book list).
