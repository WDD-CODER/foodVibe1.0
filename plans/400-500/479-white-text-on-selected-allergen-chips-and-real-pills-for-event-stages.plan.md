# Plan 479 — White text on selected allergen chips and real pills for event stages

Status: done
Track: code
Snapshot: ae9dc090a109e3439974ea782b428f252911e29c

## Problem Statement
Human validation of `mvp-review` on 2026-10-22:
1. **Check 4 — allergen chip:** recipe builder → quick-add product window → «פרטים נוספים» → tap an allergen (e.g.
   «ביצים»). The chip turns teal but its text stays grey; it should be white.
2. **Check 6 — event stage row:** the stages row at the top of the event screen is plain dark text with no border or
   background. It should be rounded pills, the current stage highlighted, «לא נסגר» in red.

Verified in code on `origin/mvp-review` (`ae9dc090`):
- (1) `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html:163-172` renders
  `<label class="c-chip c-chip--toggle">` inside `.quick-add-product-modal__field--span`.
  `quick-add-product-modal.component.scss:60-66` styles every bare `label` inside `.quick-add-product-modal__field`
  (`color: var(--color-text-muted)`, font-size 0.6875rem, weight, line-height). Emulated encapsulation makes it (0,3,1),
  which beats the engine's selected rule `.c-chip--toggle:has(> input:checked)` (0,2,1) at `src/styles.scss:2180-2185`.
  The background is not overridden, so it turns teal, but the text stays grey (and the chip's font size is wrong too).
- (2) `src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html:4-37` uses
  `<button class="stage-pill">` + `is-current` / `is-past` / `is-locked` / `stage-pill--danger`. The full pill styling
  exists in `event-stage-bar.component.scss:32-94`, but it sits inside `@layer components.event-stage-bar` (added by
  plan 443, `71faa04f`). The global button reset in `src/styles.scss:413-431` is unlayered, and unlayered styles beat
  layered ones whatever the specificity, so border, background, padding and colour are all reset. `styles.scss:1167`
  documents the same trap for `.header-btn`.

## Goals & Success Criteria
- Primary: selected allergen chips read white on teal; the event stages are visible pills with a clear current stage and a red «לא נסגר».
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --include=src/app/shared/quick-add-product-modal/quick-add-product-modal.component.spec.ts --include=src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts` passes.
  - [ ] [auto] No new `.c-*` class outside `src/styles.scss`; no page-local chip colour rule added (`git diff origin/mvp-review-fixes -- 'src/**/*.scss' | grep -n "^+\.c-"` → empty).
  - [ ] [auto] Audit list written in `docs/mvp/runs/479.md`: every component SCSS that styles a raw `<button>` / `input` / `select` / `textarea` inside an `@layer` block (so the same unlayered reset wins), with file and selector — list only, plus a note of which were fixed here.
  - [ ] [human] Allergen replay: recipe builder → add an ingredient that doesn't exist → quick-add window → «פרטים נוספים» → tap «ביצים». The chip turns teal with WHITE text, same size as the other chips; tap again → back to normal.
  - [ ] [human] Stage pills replay: open an event (menu intelligence, an event in stage «פנייה»). The stage row shows rounded pills with borders; the current stage is filled/highlighted; past stages look done; «לא נסגר» is red. Check on desktop and on a phone.

## Execution Mode
- Parallel: yes — touches the quick-add modal SCSS and the event-stage-bar SCSS only.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp-review-fixes`; run mode `docs/mvp/run-mode-review-fixes.md`.
- Load `.claude/skills/cssLayer/SKILL.md` before any SCSS edit and follow its rule for components that style native
  elements the unlayered reset touches (that skill decides between "move the rules outside the layer" and "raise the
  reset into a low layer"). Do NOT move the global reset into a layer in this plan — it would change every page; if the
  skill says that is the right long-term fix, log it as a follow-up in the run file.
- Depends on: none.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`).

```scope
src/app/shared/quick-add-product-modal/**
src/app/pages/menu-intelligence/components/event-stage-bar/**
docs/mvp/runs/479.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in the run file, add it to the scope block, continue.

## Architecture Impact
- INV-1..INV-6: preserves — styling only.

## Backend Impact
- None.

## Step 0 — Reality Check
Find `quick-add-product-modal__field` label rule and the allergen `c-chip--toggle` labels; find `.stage-pill`,
`stage-pill--danger` and `@layer components.event-stage-bar`; find the unlayered `button` reset in `src/styles.scss`.
Print `ok` / `conflict: <what>`.

## Atomic Sub-tasks
- [x] B1: Stop the modal's label rule from reaching chips — narrow the selector to real field labels (`label:not(.c-chip)` or a class on the field labels), so the engine's selected colour, font size and hover apply — `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.scss` (and `.html` if a class is added)
- [x] C1: Make the stage pills win over the button reset — per the cssLayer skill, take the `.stage-pill` rules (and modifiers `is-current`, `is-past`, `is-locked`, `--danger`) out of the layer, or rebuild them on the `.c-chip` engine (`c-chip--tab` + `c-chip--red`) with only current/past touches local; current stage highlighted, «לא נסגר» red; works inside `app-scroll-rail` on a phone — `event-stage-bar.component.scss` / `.html`
- [x] C2: Audit list of other layered components styling raw native elements (see Done-when) — `docs/mvp/runs/479.md`
- [x] V1: Build, tests, browser replay of both cards (desktop + 375 px for the stage row), write `docs/mvp/runs/479.md`.

## Out of Scope
- Moving the global reset into a layer; fixing the other components the audit finds (follow-up plan).
