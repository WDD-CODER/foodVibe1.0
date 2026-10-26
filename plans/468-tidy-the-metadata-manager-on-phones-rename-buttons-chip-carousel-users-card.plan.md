# Plan 468 — Tidy the metadata manager on phones: rename buttons, chip carousel, users card

Status: active
Track: code
Snapshot: b7d21fb021191304a54e3d351bb595e648d73dfa

## Problem Statement
The Human validated the metadata manager (`/dashboard?tab=metadata`) on branch `mvp` and found four problems
(handoff `docs/mvp/review-handoff-2026-10-21.md`, section G; only G1–G4 are in this plan):
1. **G1 — small phones:** fine down to 430 px; at 375 px the cards have no side padding and items look uneven.
2. **G2 — rename has no buttons:** renaming a menu type or a category / station / preparation category saves only on
   Enter or when the field loses focus. On a phone the keyboard closing counts as "click outside", so it saves (or
   asks "are you sure?") by accident. The Human wants explicit «שמור» and «ביטול» buttons on every inline rename.
3. **G3 — section chips:** the jump bar on phone/tablet (`mm-jump-nav`) today re-orders the grid (CSS `order`, no
   scroll). The Human wants: tap a chip → that section scrolls to the top of the screen and the chip slides to the
   middle of the chip carousel, animated. Plan 467 (F3, phone stage bar of the menu editor) needs the same carousel
   behaviour, so this plan adds it once to the shared scroll rail and 467 reuses it.
4. **G4 — «ניהול משתמשים» card (platform admin):** the trash icon floats over the email line.

What was verified in code on `mvp` (file:line), and what was not:
- Inline renames in the metadata screen are exactly two implementations: the generic card
  (`components/taxonomy-kind-manager/taxonomy-kind-manager.component.html:34-47`, `.ts:104-118`, used inline by
  stations, preparation categories and section categories via `[inlineRename]="true"`) and the menu-type row in the page
  (`metadata-manager.page.component.html:~115-127`, `.ts:~853-879`). Units, categories, allergens, labels and courses
  open a dialog / modal instead of an inline field (`onRenameMetadata`, page `.ts:680`), so they have no inline rename.
  `coefficient-manager/` has NO rename (it edits the number only, `coefficient-manager.component.html:19-29`), so it
  needs no Save/Cancel; its number box saves on change. `unit-edit-dialog/` is a modal (G5, out of scope).
- The jump bar is `app-scroll-rail` (`metadata-manager.page.component.html:7-13`) and `bringToFront` only sets a signal
  that drives `[style.order]` (`.ts:170-186`); nothing scrolls. `ScrollRailComponent` (`src/app/shared/scroll-rail/`)
  already has snap-to-centre children (`scroll-rail.component.scss`, `::ng-deep > * { scroll-snap-align: center }`)
  but no method to centre a given child. No other carousel exists for chip rows (`shared/column-carousel/` is a
  column swipe for tables, a different thing).
- G4: `user-management.component.scss` `.list-item.group` is a two-column grid `1fr auto`; the `.c-icon-btn.danger`
  hover is `scale(1.12) rotate(8deg)` (scss `:hover` rule) and the card has no padding for it. Not reproduced in a browser.
- G1 cause NOT verified in a browser. Read from the SCSS: `/dashboard` pads its content `1.5rem` (`dashboard.page.scss`
  `.dashboard-content`) and `.metadata-page` pads another `1.5rem` (`metadata-manager.page.component.scss:2-8`); below 900 px
  the grid is `grid-template-columns: 1fr` (same file, `.admin-grid`), whose track minimum is the widest card content, so any
  card with a wide row (menu-type chips, coefficient add row, user list `minmax(150px, auto)`) can push the card past the
  screen edge and eat the gutter. The Worker finds the element that forces the width at 375 px (browse, resize to 375)
  before fixing.

## Goals & Success Criteria
- Primary: the metadata manager is tidy at 375 px, every inline rename has Save and Cancel, the jump bar scrolls and
  centres, and the users card keeps its trash icon inside the card.
- Success:
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [x] [auto] Unit tests pass (`npx ng test --watch=false --include=src/app/pages/metadata-manager/** --include=src/app/shared/inline-rename-field/** --include=src/app/shared/scroll-rail/**`): the new inline-rename component emits `saved` with the trimmed text on Save and on Enter, emits `cancelled` on Cancel and on Escape, and emits nothing when it loses focus; the scroll rail's new method centres a given child; a station / menu type rename no longer fires on blur.
  - [x] [auto] `npx ng lint` passes for the changed files; no `.c-*` class defined outside `src/styles.scss` (`git diff origin/mvp -- 'src/**/*.scss' | grep -n "^+\.c-"` → empty).
  - [ ] [human] G1 replay: open `/dashboard?tab=metadata` in a 375 px wide window (phone). Every card has an even gap at both sides, nothing is cut off at either edge, there is no sideways scroll, and chips / rows inside the cards line up with equal spacing.
  - [ ] [human] G2 replay: on a phone, in «תחנות» (stations) tap a station chip → the pencil. The field shows two buttons «שמור» and «ביטול». Type a new name and close the keyboard: nothing is saved and the field stays open. Tap «ביטול»: the old name is back. Do it again and tap «שמור»: the existing "are you sure" question appears, then the name changes. Repeat once in «סוגי תפריט» (menu types) and once in «קטגוריות הכנה» (preparation categories).
  - [ ] [human] G3 replay: on a phone, open `/dashboard?tab=metadata`, tap the last chip in the bar («תחנות» or further). The section slides to the top of the screen under the header, and the tapped chip glides to the middle of the chip bar (animated, not a jump). The chip bar is still visible at the top while you read the section. Then tap a chip on the far side: same behaviour.
  - [ ] [human] G4 replay (needs a platform-admin user): open «ניהול משתמשים». In each user card the email is on its own line, with nothing over it; the trash icon sits at the bottom of the card, inside it; hover the trash icon on a desktop: it wiggles inside the card and is not clipped. The icon for your own business is greyed out.

## Execution Mode
- Parallel: no — writes the metadata page and the shared scroll rail that plan 467 reads.
- Concurrent plans: 467 reuses this plan's scroll-rail method (start 467's F3 task after this plan merges). 460 (A5 select-on-focus) may touch the coefficient number boxes in `coefficient-manager/` — whichever merges second rebases.
- Isolated DB: no

## Execution Notes
- Base branch `origin/mvp`; merge back into `mvp` only, never `main`.
- MVP run mode: executed per `docs/mvp/run-mode.md` — `[human]` items become validation cards in `docs/mvp/runs/468.md`, `[auto]` items are marked `[x]` only with evidence in that file.
- Depends on: none. Plan 467 (F3) depends on THIS plan: no shared chip carousel with "centre the tapped chip" exists on `mvp`, so this plan adds `centerChild` to the existing shared `ScrollRailComponent` (G3-1) and 467 reuses it.
- Written by the Planner from the handoff on 2026-10-21; G5 (unit rename, decision D8) is not in this plan.
- No new `.c-*` engine class is needed: the new component uses `.c-btn-primary` and `.c-btn-ghost--sm` (existing in `src/styles.scss`).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/**
src/app/shared/inline-rename-field/**
src/app/shared/scroll-rail/**
src/app/shared/breadcrumbs.md
docs/mvp/runs/468.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. (Likely case: the 375 px gutter turns out to come from
`src/app/pages/dashboard/dashboard.page.scss`; in MVP run mode add it to the scope block, log the decision, continue.)

## Architecture Impact
- INV-1: preserves — no permission rule changes; the platform-admin-only users card keeps its existing gate.
- INV-2: preserves — no tenancy change.
- INV-3: preserves — scope reaches `src/app/pages/metadata-manager/**`, but renames still run through the same parent handlers (`renameStation`, `renameMenuType`, section / preparation renames) and the same server re-key; only the way the client asks for the new text changes.
- INV-4: preserves — no schema change.
- INV-5: preserves — terms stay in `taxonomyTerms`; no new kinds.
- INV-6: preserves — no AI call.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports drift. On `origin/mvp` find: `inlineRename` / `onRenameBlur` /
`editingItem_` in `taxonomy-kind-manager.component.ts`; `renamingMenuTypeKey_` / `onMenuTypeNameBlur` /
`bringToFront` / `orderFor` in `metadata-manager.page.component.ts`; `app-scroll-rail` in the page template;
`.list-item.group` in `user-management.component.scss`. Print `ok` or `conflict: <what>` per symbol.

## User Stories
- As a chef on my phone, I want clear Save and Cancel buttons when I rename something so that closing the keyboard never renames it by accident.
- As a chef on a small phone, I want the metadata cards to fit the screen with even spacing so that I can read and tap everything.
- As a chef, I want a tapped section chip to bring its section to the top and centre the chip in the bar so that I always see where I am.
- As the platform admin, I want the delete icon inside each user card, away from the email, so that I never tap it by mistake.

## Functional Requirements

### Must Have (P0)
- [ ] One shared inline-rename field with a text box, «שמור» and «ביטול»; Enter = save, Escape = cancel, losing focus does nothing.
- [ ] Stations, preparation categories, section categories (all via the generic card) and menu types use it; the existing confirm question and server re-key stay as they are.
- [ ] The scroll rail can centre a given chip (animated); the metadata jump bar scrolls the section to the top and centres its chip.
- [ ] 375 px: even gutters, no sideways scroll, uneven items fixed.
- [ ] Users card: trash icon at the bottom, hover animation fully inside the card.

### Nice to Have (P1)
- [ ] The jump bar stays visible (sticky under the app header) so the chip animation is seen — see Critical Question 2.

## UI/UX Notes
- The field is one row: text box (grows), then «שמור» (`c-btn-primary`, small) and «ביטול» (`c-btn-ghost--sm`). On a phone the buttons go under the box if the row would be tighter than 280 px.
- Respect reduced motion: when `prefers-reduced-motion` is on, the chip jumps to the centre without animation.
- New dictionary keys: none needed — `save` («שמור») and `cancel` («ביטול») already exist in `public/assets/data/dictionary.json`.
- The «שמור» button is disabled when the text is empty or unchanged.

## Atomic Sub-tasks
- [x] G1-1: Find what pushes the metadata cards past the screen edge on a 375 px phone — resize to 375 px with browse, identify the element forcing the width, and write it in `docs/mvp/runs/468.md` before fixing — `docs/mvp/runs/468.md`
- [x] G1-2: Give the metadata screen one even side gutter on small phones — make the single-column grid track shrinkable (`minmax(0, 1fr)`), let cards and rows shrink and wrap, and drop the doubled padding below 430 px — `src/app/pages/metadata-manager/metadata-manager.page.component.scss`, `src/app/pages/metadata-manager/components/coefficient-manager/coefficient-manager.component.scss`, `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.scss`, `src/app/pages/metadata-manager/components/user-management/user-management.component.scss`
- [x] G2-1: Build one shared rename field with Save and Cancel — new standalone OnPush component `app-inline-rename-field` (inputs `value`, `ariaLabel` key; outputs `saved`, `cancelled`; Enter saves, Escape cancels, blur does nothing; auto-selects the text on open; uses existing `.c-btn-primary` / `.c-btn-ghost--sm`; spec) — `src/app/shared/inline-rename-field/inline-rename-field.component.ts`, `src/app/shared/inline-rename-field/inline-rename-field.component.html`, `src/app/shared/inline-rename-field/inline-rename-field.component.scss`, `src/app/shared/inline-rename-field/inline-rename-field.component.spec.ts`
- [x] G2-2: Use the shared rename field in the generic category card — replace the `<input #renameInput … (blur)>` block in `taxonomy-kind-manager.component.html` with the new component; `saved` closes the field and emits `renamed`, `cancelled` closes it; remove `onRenameBlur`'s blur path, `renameInput` viewChild and the now-unused `.inline-edit-input` style; keep the `renamed` output and the parents' handler names (`onRenameBlur` in station / preparation / section managers) so their specs keep working — `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.html`, `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.ts`, `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.scss`
- [x] G2-3: Use the shared rename field for menu types — replace the menu-type `<input #renameInput … (blur)>` in the page template; `saved` calls the existing confirm-and-rename flow (`onMenuTypeNameBlur` renamed to `onMenuTypeRenameSaved`), `cancelled` clears `renamingMenuTypeKey_`; drop the page's `renameInput` viewChild / `afterNextRender` select (the component selects itself) and the `.menu-type-key-input` style — `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.scss`
- [x] G2-4: Prove the rename flows by test — specs for the generic card (Save emits `renamed`, Cancel and blur do not), the station manager (rename still asks before saving) and the page (menu type Save → confirm → rename; Cancel → no call) — `src/app/pages/metadata-manager/components/station-manager/station-manager.component.spec.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`, `src/app/pages/metadata-manager/components/taxonomy-kind-manager/taxonomy-kind-manager.component.spec.ts`
- [x] G3-1: Teach the shared chip carousel to centre a tapped chip — add public `centerChild(el: HTMLElement)` to `ScrollRailComponent` using `el.scrollIntoView({ behavior, inline: 'center', block: 'nearest' })` (behavior `'auto'` when `prefers-reduced-motion`), RTL-safe because the browser does the maths; spec with a 300 px rail and eight children; add a one-line entry for the method to the `scroll-rail/` row of `src/app/shared/breadcrumbs.md` and a row for `inline-rename-field/` — `src/app/shared/scroll-rail/scroll-rail.component.ts`, `src/app/shared/scroll-rail/scroll-rail.component.spec.ts`, `src/app/shared/breadcrumbs.md`
- [x] G3-2: Make a section chip scroll its section to the top and centre itself — replace `bringToFront` / `orderFor` / `[style.order]` with `jumpTo(id, chip)`: find the section by its `mm-sec-*` id, `scrollIntoView({ behavior: 'smooth', block: 'start' })`, call `rail.centerChild(chip)`, and keep the tapped chip highlighted (rename `frontSectionId_` to `activeSectionId_`); give sections `scroll-margin-block-start` equal to the app header (`3.875rem`, `header.component.scss:9`) plus the sticky chip bar plus a small gap; grid order is now always natural page order; update the order tests in the page spec (`style.order` assertions at ~lines 320-347) to assert scroll + highlight — `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.scss`, `src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts`
- [x] G3-3: Keep the chip bar in view while the sections scroll — make `.mm-jump-nav-row` sticky below the app header on phone/tablet (≤1023 px) with a solid-enough background and a z-index under the header, so the centred chip stays visible — `src/app/pages/metadata-manager/metadata-manager.page.component.scss`
- [x] G4-1: Move the trash icon to the bottom of each user card, inside it — change `.list-item.group` to a single column (info, then an actions row aligned to the inline end with padding-block-end), give the card `padding-block-end` and `overflow: visible` room for the `scale(1.12) rotate(8deg)` hover, and keep the disabled state for the own business — `src/app/pages/metadata-manager/components/user-management/user-management.component.html`, `src/app/pages/metadata-manager/components/user-management/user-management.component.scss`
- [x] G4-2: Prove the users card layout by test — spec asserts the email line and the remove button are separate rows and the remove button is last in the card, disabled for the own business — `src/app/pages/metadata-manager/components/user-management/user-management.component.spec.ts`
- [x] V1: Build, lint, run tests, replay the four [human] scenarios in a browser at 375 px, write the run file with the evidence and the validation cards — `docs/mvp/runs/468.md`

## Technical Considerations
- Dependencies: `ScrollRailComponent` (plan 350), `TaxonomyKindManagerComponent` (plan 321/340), `RowActionsMenuComponent`. Reuse first: no new picker, list or modal is built; the one new shared piece (`app-inline-rename-field`) replaces two hand-built `input + blur` shells (run mode "reuse first").
- New code uses signal APIs only (`input()`, `output()`, `viewChild()`), `inject()`, OnPush, `@layer components.inline-rename-field` in the new scss, logical CSS properties, double quotes in html, no semicolons / single quotes in ts.
- Blur no longer saves. A field left open stays open until Save / Cancel / Escape; a second tap on another chip's pencil closes the first (the generic card keeps one `editingItem_`).
- Existing Hebrew literals in `metadata-manager.page.component.ts` (error messages in `onRemoveMenuType`) are not touched by this plan.
- Model changes: none. Backend / API: none. Security surface: none.
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys (`save`, `cancel` exist).

## Out of Scope
- Any export, print or preview of a recipe or a menu (export-preview, export toolbar, export services, Excel) — plan 471, not this run.
- G5 — editing a unit's name (decision D8 is open: rename everywhere or display label only). A later plan once D8 is answered; it will start from `unit-edit-dialog/`.
- Renaming coefficients' event / serving type names (not offered today).
- Highlighting the active chip while scrolling by hand; a new carousel for the stage bar of the menu editor (plan 467 reuses `centerChild`).
- Any server change; any change to the confirm questions' wording.

## Critical Questions
- Answered 2026-10-21 (Human): every recommended answer below is accepted; build to it.
1. Should leaving the rename field (tapping elsewhere / closing the phone keyboard) cancel, save, or do nothing? Recommended: do nothing (field stays open until Save, Cancel or Escape) — safest on a phone. Alternative: cancel on blur.
2. Make the chip bar sticky under the app header so you see the chip glide to the centre while the section sits at the top? Recommended: yes (G3-3). Without it the bar scrolls out of sight as the section moves to the top and the animation can't be seen.
