# Plan 533 — The unified date field owns its styles: nothing reaches in from outside, nothing is broken

Status: draft
Depends-on: none
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Plan 502 merged every date input into `app-date-field` (`src/app/shared/date-field/`). On 2026-10-30 the Human saw every
instance look generic but behave the same, and decided: keep it unified, do not revert, design one custom look later
(plan 534/535's design workflow) and swap it in one place. Two checks were left open: (1) is any instance **broken**
(clipped, overlapping, its picker off-screen, RTL flipped), and (2) does anything **style it from outside**, so that a
later design swap would not reach it.

Audit at 5895243:
- 7 usages, none with a class on the tag: `recipe-book-list.component.html:449,457`, `menu-library-list.component.html:68`,
  `new-inquiry-dialog.component.html:169`, `menu-intelligence.page.html:129`, `event-stage-bar.component.html:139`,
  `deposit-paid-dialog.component.html:15`.
- No SCSS names `app-date-field` or `.date-field*` outside the component; no `::ng-deep` reaches it
  (`ai-menu-modal.component.scss:2` and `_paper-ui.scss` 311/573/588/717/722 target other pieces).
- **One real leak:** the component's rules sit in `@layer components.date-field`, and the unlayered global
  `.c-input-stack input` (`src/styles.scss:712-741`) beats any layered rule. In the three usages inside `.c-input-stack`
  (inquiry, deposit-paid, stage-bar) it gives the hidden native picker `width: 100%`, `min-height: 2.75rem`, padding,
  border and background, overriding the picker's 1×1 px reset. The picker is still invisible (opacity 0), but its box,
  and so where the desktop calendar opens, differs per screen.
- **Dead outside rules** left from before plan 502, which would hit the field if it were ever un-encapsulated:
  `menu-library-list.component.scss:54-73, 86-90` (`input[type='date']`), `recipe-book-list.component.scss:342`,
  `new-inquiry-dialog.component.scss:8` (a stale "calendar button" comment), and `_paper-ui.scss:161-193, 226`
  (`.meta-date-wrap`, `.meta-date-display`, `.meta-date-input`, `.meta-input.meta-date` — no template uses them).
- `scripts/reuse-lint.mjs` has no rule for "page SCSS styles a family component from outside". The registry also has a
  broken rule: `hand-drawn-modal-overlay` (`scripts/lib/registry-families.mjs:45`) uses `/class="[^"]*bc-modal-overlay/`
  — the `\b` lost its backslash, so the rule never fires.

## Goals & Success Criteria
**Primary:** every date field's look comes only from its own component (one place to restyle later), the picker opens
in the same spot on every screen, and a new outside style on a shared component is warned about.

- [auto] `pnpm run test:ci` exits 0, including `date-field.component.spec.ts` (A2).
- [auto] `node --test scripts/test/reuse-lint.test.mjs` → `# fail 0`, including the new cases (A5).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/533-date-field-owns-its-styles-nothing-reaches-in-from-outside.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/533-date-field-owns-its-styles-nothing-reaches-in-from-outside.plan.md` exits 0.
- [human] On a phone (or Chrome device mode, 390 px) and on desktop (1280 px), for each of the seven places in "Where the date field is" below: tapping or clicking the date opens a calendar fully on screen, the typed date reads left to right as dd/mm/yyyy inside right-to-left text, and nothing is clipped or overlaps. Report any place that fails by its number.

## Execution Mode
- Parallel: yes — no shared file with 517–532.
- Concurrent plans: plan 534 adds to the reuse-lint docs and waits for this one (it reuses the new rule).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/date-field/**
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss
src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.scss
src/app/pages/menu-intelligence/_paper-ui.scss
scripts/lib/registry-families.mjs
scripts/test/reuse-lint.test.mjs
docs/agent/standards-reuse.md
docs/brain/component-families.md
src/app/shared/date-field/date-field.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; component SCSS, dead page SCSS and a lint rule.

## Reuse Check
- `app-date-field` picker hardening — family: form-field — rung: 3 — why: the fix lives in the family's own component (`src/app/shared/date-field/`), so the picker box no longer depends on the parent; no input or variant is added.
- reuse-lint rule `family-styled-from-outside` — family: engine-classes — rung: 3 — why: one more data entry in `scripts/lib/registry-families.mjs`, the existing rule shape; no new script.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every date picker to open the same way on every screen so that I never hunt for the calendar.
- As a chef, I want the date field's future new look to reach every screen at once so that no screen is left with the old one.

## Functional Requirements

### Must Have (P0)
- [ ] `date-field.component.scss`: move the `.date-field-picker` and `.date-field-picker--touch` declarations out of `@layer components.date-field` into an unlayered block after it, with a comment: "Unlayered on purpose (exception R2, `scripts/rule-sweep-count.mjs:22-25`): the global `.c-input-stack input` rule is unlayered and would otherwise size the hidden picker." Add `min-block-size: 0`, `min-inline-size: 0`, `background: none`, `box-shadow: none`, `margin: 0` to the desktop picker reset so no outside input rule changes its box; the touch variant keeps `inset: 0`, `100%` × `100%`. Emulated encapsulation already makes `.date-field-picker[_ngcontent-…]` (0,2,0) beat `.c-input-stack input` (0,1,1). `:host`, `.date-field` and `.date-field-text` stay in the layer. **No visual redesign**: the visible text input keeps its current look on every screen.
- [ ] Delete the dead outside rules: `menu-library-list.component.scss:54-73` and `:86-90` (the `input[type='date']` rules only — keep any other declaration in those blocks), `recipe-book-list.component.scss:342` (same), the stale "calendar button" comment at `new-inquiry-dialog.component.scss:8`, and `_paper-ui.scss:161-193` and `:226` (`.meta-date-wrap`, `.meta-date-display`, `.meta-date-input`, `.meta-input.meta-date`). Before deleting each, grep its selector in `src/app/**/*.html` and `*.ts`; if any use exists, keep it and note it under Execution Notes.
- [ ] `scripts/lib/registry-families.mjs` new rule `family-styled-from-outside`: `files: ['src/app/**/*.scss']`, pattern `/(?<![\w-])app-(?:add-option-row|chip-search-dropdown|confirm-modal|counter|custom-multi-select|custom-select|date-field|edit-gate|empty-state|form-field|input-clear|list-row-checkbox|list-shell|loader|modal-shell|page-header|partial-cost-badge|row-actions-menu|scrollable-dropdown|search-combobox|selection-bar|tab-chips)(?![\w-])|::ng-deep[^{]*\.(?:date-field|custom-select|search-combobox|counter|form-field)/`, hint "a shared component is styled only through its own inputs or variants (docs/brain/component-families.md); a page rule that reaches into it is lost when the family's look changes". Warn-only, like every rule.
- [ ] Fix `hand-drawn-modal-overlay`: `/class="[^"]*\bc-modal-overlay/`.

### Should Have (P1)
- [ ] `scripts/test/reuse-lint.test.mjs`: cases — `app-date-field { margin: 0 }` in `src/app/pages/x/x.component.scss` warns `family-styled-from-outside`; `:host ::ng-deep .date-field-text { color: red }` warns; `.my-app-date-fieldish {}` does not; `<div class="c-modal-overlay">` in an html file warns `hand-drawn-modal-overlay`.
- [ ] `date-field.component.spec.ts`: one case — the host renders inside a `.c-input-stack` wrapper and the picker's computed `inline-size` / `block-size` stay `1px` on a fine pointer.
- [ ] `docs/agent/standards-reuse.md` (lines 43-46, which describe 4 of the 10 rules): list all 11 rule ids with one line each. `docs/brain/component-families.md:136` (form-field → Dates): add "styled only from inside its component; reuse-lint `family-styled-from-outside` warns on outside rules".

### Nice to Have (P2)
- [ ] none.

## Where the date field is (the `[human]` check's numbered list)
1. Recipe book, filter panel, "from" date — `/recipe-book`, open the filters.
2. Recipe book, filter panel, "to" date — same panel.
3. Menu library, filter "from" date — `/menu-library`, open the filters.
4. New inquiry dialog, event date — `/menu-library`, "פנייה חדשה".
5. Event screen, the date chip in the header — `/menu-intelligence/<an event id>`.
6. Event screen, stage bar, deposit date — the same event, move it to a stage that shows the deposit.
7. Deposit-paid dialog, date — the same event, mark the deposit as paid.

## UI/UX Notes
- No visible change intended except where a place was broken; RTL text with an LTR date (`dir="ltr"` on the text input, as today).
- No dictionary keys. No icons.

## Atomic Sub-tasks
- [ ] A1: Make the hidden picker immune to outside input rules — unlayered picker block, full reset, comment — src/app/shared/date-field/date-field.component.scss
- [ ] A2: Prove the picker box inside an input stack — the new spec case — src/app/shared/date-field/date-field.component.spec.ts
- [ ] A3: Delete the dead outside date rules after a usage grep — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss, src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss, src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.scss, src/app/pages/menu-intelligence/_paper-ui.scss
- [ ] A4: Warn when a page styles a shared component from outside, and repair the modal-overlay rule — scripts/lib/registry-families.mjs
- [ ] A5: Test both rules — scripts/test/reuse-lint.test.mjs
- [ ] A6: Document the rules and the date field's "inside only" rule — docs/agent/standards-reuse.md, docs/brain/component-families.md
- [ ] A7: Run every `[auto]` check plus `node scripts/reuse-lint.mjs --diff=origin/main` (expect no `family-styled-from-outside` line) and paste the outputs under Execution Notes

## What happens when
- A `[human]` check finds a broken place: the Worker fixes it inside `src/app/shared/date-field/` only (an input or a variant if the place needs a different behaviour, per the ladder), never with a page rule; a fix that needs a page file is escalated with `approved: <path>`.
- On edit, leave, cancel, error of the field itself: unchanged — `committed` fires on blur / change / pick with a valid or empty date; an invalid typed date shows `date_invalid`, as today.
- An old `::ng-deep .custom-select-trigger` rule in `_paper-ui.scss` (not a date rule): stays; the new lint rule only warns on added lines.

## Technical Considerations
- Dependencies: `src/styles.scss` `.c-input-stack input` (read only, not changed), `.claude/skills/cssLayer/SKILL.md` (read before any SCSS edit), `scripts/rule-sweep-count.mjs` (the R2 exception).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys; logical CSS only; `src/styles.scss` untouched.

## Out of Scope
- Any redesign of the date field (later, through the design workflow, plans 534–535). Changing `src/styles.scss`. Other shared components' outside rules that already exist (the lint warns only on new lines).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 7, item D1). Brief 8's lint rule (item 4) is built here, generically for every shared selector; plan 534 reuses it.
- Planner 2026-11-08: scope now names the test files this plan writes (run-517 parked 374, 510 and 535 because a folder glob does not list the tests under it).
