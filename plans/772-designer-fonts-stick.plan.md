# Plan 772 — Menu designer: a picked title or dish font stays on the sample menu

Status: draft
Depends-on: 765
Track: code
Snapshot: e17fb6a9f0d728b07dcece8644c7d1d82724409e

## Problem Statement
Dandan, 2026-11-28, on the phone after plan 765 merged: in the menu designer, picking a new font for the section
titles works, but picking a font for the menu title or for the dish names "changes for a second, then turns back
to what it was". The preview (`app-menu-preview`, an iframe drawn from `renderMenuDocument`) must show the picked
font for every slot and keep it.

## Goals & Success Criteria
**Primary:** each of the three font slots (title, section, dish) changes the sample menu to the picked font, and it
stays after the preview settles, on a desktop and on a phone width.

- [auto] `pnpm run test:ci` exits 0, including a new spec that picks a title font and a dish font and asserts the
  designer's `design()` keeps the picked ids after change detection settles (no write-back of the old value).
- [auto] `pnpm run test:server` exits 0; `server/test/menu-design-template.test.js` gains a case: the rendered HTML's
  font stylesheet link names all three picked families, and `.md-title` / body (dish) use `--md-font-title` /
  `--md-font-dish` with those families.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `e2e/ui/772-1.spec.ts`: open `/menu-design/new?base=classic`, pick «Amatic SC» for the dish font and
  «Suez One» for the title font, wait 3 s; inside the preview frame, the computed `font-family` of `.md-dish` starts
  with `"Amatic SC"` and of `.md-title` with `"Suez One"`. Screenshot `screens/772-1.png`.
- [human] On the phone (remote link) and on a desktop: pick a different title font and dish font; the sample menu
  changes to them and stays.

## Execution Mode
- Parallel: no
- Isolated DB: no

## Read-Write Scope

```scope
src/app/shared/menu-designer/**
src/app/shared/menu-preview/**
src/app/pages/menu-design/**
src/app/core/utils/menu-design-form.util.ts
src/app/core/utils/menu-design-form.util.spec.ts
src/app/core/utils/menu-fonts-link.util.ts
src/app/core/utils/menu-fonts-link.util.spec.ts
shared/schemas/menu-design/menu-template.ts
shared/schemas/menu-design/menu-fonts.ts
server/test/menu-design-template.test.js
e2e/ui/772-1.spec.ts
docs/brain/gotchas.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file
outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done
in-scope; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — no schema change; the design shape stays as plan 764 froze it.

## Reuse Check

- none — a bug fix inside existing pieces (`app-menu-designer`, `app-menu-preview`, `renderMenuDocument`); no new piece.

## Adopt Check
- none — why: a bug fix, no new capability or package.

## Defaults

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`.

## User Stories
- As a chef, I want the font I pick for the menu title and the dish names to show on the sample menu so that I can
  judge the look before I save.

## Functional Requirements

### Must Have (P0)
- [ ] Reproduce first (a failing spec or the e2e), then find the root cause before changing code. Candidates to rule
  in or out, in this order: the radio groups of the three slots sharing state (`[checked]` + `(change)` per slot);
  `update_` → `designFromForm(formFromDesign(...))` dropping or reverting `fonts.title`/`fonts.dish`; the preview
  iframe re-rendering from a stale design; the Google Fonts stylesheet failing for a requested weight (one bad
  `wght@` in `css2` fails the whole sheet, so the text falls back) — check every `MENU_FONTS` entry's weights
  against what Google serves.
- [ ] Fix the cause; all three slots behave the same.

## UI/UX Notes
- No layout change.

## Atomic Sub-tasks

- [ ] A1: Reproduce the reverting title and dish font in a spec and the browser test before fixing — failing spec + e2e/ui/772-1.spec.ts — src/app/shared/menu-designer/menu-designer.component.spec.ts, e2e/ui/772-1.spec.ts
- [ ] A2: Fix the root cause so a picked title or dish font stays on the sample menu — per the cause found — src/app/shared/menu-designer/**, src/app/shared/menu-preview/**, shared/schemas/menu-design/**, src/app/core/utils/menu-fonts-link.util.ts
- [ ] A3: Lock it with a template test and note the trap for the next builder — server/test/menu-design-template.test.js, docs/brain/gotchas.md

## Technical Considerations
- Dependencies: plan 765 designer, plan 764 template.
- Backend / API: none
- Auth and validation: none
- Security surface: none
- Data / migration: none

## Out of Scope
- AI variants (plan 766).

## Critical Questions
- none

## Execution Notes

### Builder 2026-11-28: the revert did not reproduce; no product code changed

- Karma, real clicks on title, dish and section chips: `design()`, the checked radio of every slot and the `--md-font-*`
  values of the frame's `srcdoc` all held the picked ids after 1.5 s each (temporary logging spec, 16/16 pass).
- The real app (`ng serve -c local --port 4391`, backend faked in the browser, `menu_design` on): Chromium desktop,
  Chromium Pixel 7 and WebKit iPhone 13 — title, dish, section picked; computed `font-family` in the preview frame
  showed the pick at +150 ms and was unchanged at +3 s and later.
- Stress run: every font in every slot (42 picks, desktop Chromium and iPhone WebKit), 15 picks with font files delayed
  1.2 s (Pixel 7 and iPhone), and six quick picks in a row — 0 mismatches, 0 failed font requests, 0 faces in error.
- Candidates ruled out in this code: radio groups sharing state; `designFromForm` dropping `fonts.title`/`fonts.dish`;
  a stale design in the preview; a bad weight (all 14 `MENU_FONTS` css2 requests answer 200 with a Hebrew subset).
  The designer's font code is the same as at plan 765.
- Not tried: a physical phone, the remote link, a real backend.
- Added guards only (they pass before any fix): the designer spec, the template test, `e2e/ui/772-1.spec.ts`.
