# Plan 347 — Mobile keyboard: push content up, keep the focused field visible

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

On a phone, opening the keyboard hides what you're typing into:

- `src/index.html:7` is `width=device-width, initial-scale=1`, with no `interactive-widget=resizes-content`. Android Chrome therefore overlays the keyboard on the page, so `dvh` doesn't shrink and the layout doesn't adapt.
- Nothing tracks `visualViewport` (no keyboard handling exists).
- Fixed bottom elements stay on screen and cover inputs: `.bottom-nav` (z 200), `.hero-fab-container`, `.approve-stamp` (z 210), and user-msg toasts.
- Modals size with plain `vh`, which doesn't shrink with the keyboard:
  - ai-product-modal `85vh`
  - ai-recipe-modal `90vh`
  - ai-draft-editor `72vh`
  - ai-menu-modal `88vh`
  - chip-search-dropdown `40vh`
  - `recipe-book-list.component.scss:469` `90vh`
  - `trash.page.scss:220` `90vh`
  - `dashboard-overview.component.scss:267/288` `80vh` / `70vh`
- The `.as-modal` bottom sheet (`styles.scss:~1252`, pinned `inset-block: auto 0`) sits under the keyboard on iOS.

## Goals & Success Criteria

- Primary: on Android and iOS, the focused input and its modal or sheet stay visible above the keyboard.
- Primary: the bottom nav, FAB and approve stamp hide while the keyboard is open.
- Success: typing in the recipe name, an ingredient search, an AI prompt, or a bottom-sheet field always shows the field and the text being typed.

## Execution Mode

- Parallel: no. It edits `src/styles.scss` and modal styles shared with the list and filter plans. Run after Plan 346 (sticky table).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/index.html
src/app/core/services/keyboard-inset.service.ts
src/app/core/services/keyboard-inset.service.spec.ts
src/app/appRoot/app.component.ts
src/app/shared/ai-product-modal/ai-product-modal.component.scss
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.scss
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.scss
src/app/shared/ai-menu-modal/ai-menu-modal.component.scss
src/app/shared/chip-search-dropdown/chip-search-dropdown.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
src/app/pages/trash/trash.page.scss
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss
```

`src/styles.scss`: this plan adds a `body.kb-open` block and edits the `.as-modal` bottom-sheet rule (~L1252) to respect `--kb-inset`. That's an approved exception for that rule.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef typing on my phone, I want to see what I'm typing and the form around it, not the keyboard covering it.

## Functional Requirements

### Must Have (P0)
- [ ] `index.html`: viewport meta `width=device-width, initial-scale=1, interactive-widget=resizes-content`.
- [ ] `KeyboardInsetService` (`providedIn` root, started from `AppComponent`):
  - Listens to `window.visualViewport` resize / scroll.
  - Computes `inset = max(0, innerHeight - (vv.height + vv.offsetTop))`.
  - Sets `--kb-inset: <px>` on `document.documentElement`, and toggles `body.kb-open` when the inset is over 120px.
  - Exposes `isOpen_` (signal) and `inset_` (signal).
  - No-op when `visualViewport` is missing.
- [ ] On `focusin` of an `input`, `textarea` or `[contenteditable]` while `kb-open`, call `scrollIntoView({ block:'center', behavior:'smooth' })` after the inset settles (one `requestAnimationFrame` after the resize).
- [ ] `styles.scss`:
  - `body.kb-open` hides `.bottom-nav`, `.hero-fab-container`, `.approve-stamp` and toasts (`visibility:hidden`, keeping layout).
  - Remove the reserved bottom-nav padding while open (`.app-content` `padding-block-end`).
  - `.as-modal` bottom sheet: `inset-block-end: var(--kb-inset, 0px)` and `max-height: calc(86dvh - var(--kb-inset, 0px))`.
- [ ] Replace every `vh` listed in the Problem Statement with `dvh`, keeping the same numbers.

### Should Have (P1)
- [ ] `.c-modal-card` (`styles.scss:~612`) gets `max-height: calc(… - var(--kb-inset,0px))` so centered modals shrink too.

### Nice to Have (P2)
- None.

## UI/UX Notes

- No visual change when the keyboard is closed.
- No dictionary keys.

## Atomic Sub-tasks

- [x] A1: Viewport meta (`src/index.html`).
- [x] A2: `KeyboardInsetService` plus a spec (mock `visualViewport`: inset computed, class toggled, no-op without the API). Inject it in `AppComponent` (`keyboard-inset.service.ts/.spec.ts`, `app.component.ts`).
- [x] A3: The `body.kb-open` rules and `.as-modal` / `.c-modal-card` inset handling (`src/styles.scss`).
- [x] A4: `vh` → `dvh` in the listed files.
- [ ] A5: Build and run specs. Update the session-state file.

## Technical Considerations

- Dependencies: `AppComponent`, global engines in `styles.scss`, `HeaderComponent` (`.bottom-nav`), `HeroFabComponent`, `ApproveStampComponent`, `UserMsgComponent`. Hide them by class from the global stylesheet; don't edit those components.
- New files: `keyboard-inset.service.ts` plus its spec.
- Model changes: none.
- Listeners are passive and must be removed on destroy (root service, so effectively never).

## Out of Scope

- Recipe-builder mobile layout (Plan 348).
- Page-level `min-height: 100vh` (`recipe-builder.page.scss:55`, `menu-library.page.scss:5`, `metadata-manager…:3`, `menu-intelligence/_layout.scss:14`, `cook-view…:119`): these are layout minimums and don't block the keyboard.

## Critical Questions

1. While the keyboard is open:
   - a) Hide the bottom bar, FAB and approve stamp (default)
   - b) Keep them, moved above the keyboard

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/services/keyboard-inset.service.spec.ts` → 0 failures.
- [auto] `rg -n "[0-9]vh" src/app/shared src/app/pages/trash src/app/pages/dashboard --glob '*.scss'` → no matches except `dvh`.
- [auto] `npm run build` → exit 0.
- [human] Android phone: recipe builder → tap an ingredient search → the keyboard opens, the field is centered above it, and the bottom bar and FAB disappear. Close the keyboard → they return.
- [human] iPhone: AI product modal → tap the prompt → the modal shrinks and the textarea stays visible above the keyboard.
