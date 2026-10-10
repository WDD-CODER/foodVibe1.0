# Plan 396 — English Key Input Without Keyboard Switch

Status: draft
Track: code — here (not design)
Snapshot: f739e9a1781505926e53cad32290893670a0b942

## Problem Statement
In the translation-key and label-creation modals the user types the Hebrew value, then moves to
the English key input. Their keyboard is still on Hebrew, so they must switch the OS language,
and they must remember to type `_` instead of spaces. A web page cannot switch the OS keyboard
language, so the input has to behave as if it were English.

## Goals & Success Criteria
- Primary: on a physical keyboard the user types the English key with the Hebrew layout active,
  using spaces, and the input shows `this_and_that` live — no language switch, no `_` typing.
- Success:
  - [auto] `ng build` passes.
  - [auto] `ng test` passes, including the new util + directive specs.
  - [human] PC, Hebrew layout active: in the translation-key modal, typing the keys for
    `olive oil` shows `olive_oil` live; saved key in dictionary is `olive_oil`.
  - [human] Same check in the label-creation modal.
  - [human] Phone: after switching to English once, typing `olive oil` shows `olive_oil` live.
  - [human] Pressing Enter right after typing (no blur) saves the normalized key.

## Execution Mode
- Parallel: yes
- Concurrent plans: 353, 321
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/english-key.util.ts
src/app/core/utils/english-key.util.spec.ts
src/app/core/directives/english-key-input.directive.ts
src/app/core/directives/english-key-input.directive.spec.ts
src/app/shared/translation-key-modal/**
src/app/shared/label-creation-modal/**
src/app/core/services/translation-key-modal.service.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — client-side input behavior only; no write routes, schemas, taxonomy storage or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to type the English key right after the Hebrew value without switching
  keyboard language or typing `_`, so adding a term is fast and the dictionary key stays valid.

## Functional Requirements

### Must Have (P0)
- [ ] Physical-key mapping: on keydown, when `KeyboardEvent.code` is `KeyA`–`KeyZ` / `Digit0`–`Digit9`
      and `event.key` is not already that ASCII char (e.g. Hebrew layout), prevent default and
      insert the English lowercase char at the caret. No Ctrl/Meta/Alt combos are intercepted.
- [ ] Space (`code === 'Space'` or any whitespace arriving via `input`, incl. paste and mobile
      keyboards) becomes `_` live, caret preserved.
- [ ] Uppercase becomes lowercase live.
- [ ] On blur and on save (Enter): collapse `__+` to `_`, trim leading/trailing `_`, `-` → `_`.
      Leftover non-`[a-z0-9_]` chars (e.g. Hebrew from a phone keyboard) are NOT silently
      stripped — the existing `validateKeyForHebrew` error shows instead.
- [ ] Input is `dir="ltr"`, `lang="en"`, autocapitalize/autocorrect/spellcheck off.
- [ ] Applied to the English key input in `translation-key-modal` and `label-creation-modal`.
- [ ] Every change to the value updates the bound `ngModel` (dispatch `input` after mutating).

### Should Have (P1)
- [ ] A1 audit: list any other input in `src/app/**/*.html` that takes an English key; add the
      directive there via `approved: <path>` escalation.

### Nice to Have (P2)
- none

## UI/UX Notes
- No new visible UI and no new dictionary keys.
- Known limit (accepted by Human): phone on-screen keyboards have no physical key codes, so on a
  phone the user still switches to English once; spaces → `_` still works there.

## Atomic Sub-tasks
- [ ] A1: Audit `src/app/**/*.html` for other English-key inputs; report list (escalate any outside scope)
- [ ] A2: `src/app/core/utils/english-key.util.ts` + spec — `codeToEnglishChar(code)`, `liveEnglishKey(value)` (whitespace→`_`, lowercase), `finalizeEnglishKey(value)` (collapse/trim `_`, `-`→`_`). Do not change `sanitize-key.util.ts` (used by `key-resolution.service.ts`)
- [ ] A3: `src/app/core/directives/english-key-input.directive.ts` + spec — keydown code mapping, input-event live normalize with caret keep, blur finalize, host attrs; uses `inject()`, no `@Input`
- [ ] A4: Apply directive to `translation-key-modal.component.html` and `label-creation-modal.component.html`; `save()` in both components (and `translation-key-modal.service.ts` if it re-sanitizes) runs `finalizeEnglishKey`
- [ ] A5: `ng build` + `ng test` green; hand the Human the PC + phone click list from Success

## Technical Considerations
- Dependencies: `TranslationKeyModalComponent`, `LabelCreationModalComponent`, their services; `TranslationService.validateKeyForHebrew` (read only).
- New files needed: util + directive and their specs (see scope).
- Model changes: none.
- Hebrew canonical values: unchanged — only the English key input is affected.
- Insert at caret with `HTMLInputElement.setRangeText(char, start, end, 'end')`, then dispatch `new Event('input', { bubbles: true })` so `ngModel` sees it.
- Mobile keydown arrives with `key === 'Unidentified'` / `keyCode 229` — skip mapping there, rely on the `input` handler.
- IME composition (`isComposing`): don't rewrite mid-composition; normalize on `compositionend`.

## Out of Scope
- Auto-filling the English key from the Hebrew value (AI or transliteration).
- Switching the OS keyboard language (not possible from a web page).
- Hebrew value inputs.
- Migrating existing keys in the database.

## Critical Questions
- Q: Which approach? A: Keyboard physical-key mapping + spaces→`_` (Human chose option 1, 2026-10-10).
