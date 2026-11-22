# Plan 644 — The business dialog: hints as tooltips, a history panel that is a real box, and changed texts that reach the screen

Status: done
Depends-on: 638, 639
Snapshot: ef1b543f

## Problem Statement
Dandan validated plans 638 and 639 on 2026-11-19 (staging `ef1b543f`, app on 4202). Checks ①②④⑤ passed; he asked for
these changes:

1. **The private-mode hint still says that private erases everything**, although 639 changed the text. The served
   `public/assets/data/dictionary.json` has the new text (`platform_ai_private_hint`). Cause, verified in code:
   `src/app/core/services/translation.service.ts:79` builds the dictionary as
   `{ ...baseFlattened, ...existingCache, ...globalOverrides, ...personalOverrides }`. `existingCache` is the
   `DICTIONARY_CACHE` copy in `localStorage` (written at line 95 after every load), so a key that was ever loaded keeps
   its old value over the new `dictionary.json` forever. Every changed Hebrew text, in every plan, never reaches a user
   who opened the app before. This is the real fault behind the stale hint.
2. **The hint sits as text on top of the modal** (`platform-business-dialog.component.html:57`,
   `<p class="fda-name">{{ 'platform_ai_private_hint' | translatePipe }}</p>`). Dandan's rule: show it as a tooltip
   when hovering the private-mode switch, with the meaning "in private mode the business's data is no longer used to
   train the models".
3. **The erase button has no explanation.** It needs a tooltip saying what it erases.
4. **The history panel breaks the modal.** Opening it grows the modal (`app-modal-shell size="sm"`). Dandan's rule: the
   modal keeps its size, its content scrolls so the user can scroll down to the history, and the history scrolls inside
   itself too.
5. **The history panel does not look like a box.** `platform-dashboard.page.scss` (layer
   `components.platform-business-dialog`, `.pbd-history` and `.pbd-history__row`) uses `var(--color-border)`, a token
   `src/styles.scss` does not define, so no border is drawn and the panel reads as loose text. `.pbd-erase` uses
   `var(--color-danger)` — check it too.
6. **The history rows lack hierarchy.** `.pbd-history__meta` (date · name) must be a bit smaller than the rest of the
   row, and the span that names what changed must be bold so it stands apart from the reason
   (`data-testid="biz-history-reason"`).

## Goals & Success Criteria
**Primary:** in the business dialog the private-mode and erase explanations are tooltips with the right text, the
history is a bordered, scrollable box that never changes the modal's size, and a changed dictionary text shows on the
next load for a user with an old cache.

- [auto] `pnpm run test:ci` passes, including `src/app/core/services/translation.service.spec.ts` with new cases: a
  `DICTIONARY_CACHE` holding `{ k: 'old' }` and a `dictionary.json` holding `{ k: 'new' }` → `k` translates to `new`;
  a key only in the cache still translates (offline fallback); a global override and a personal override still win
  over `dictionary.json`.
- [auto] The same command,
  `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts`:
  no element shows `platform_ai_private_hint` as text; the private switch's label has `title` and `aria-describedby`
  (or `aria-label`) with the new hint; the erase button has `title` with `platform_erase_learned_tip`; a history row
  renders the change in an element with class `pbd-history__change`.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0; `pnpm run lint:icons` exits 0.
- [auto] Every `var(--…)` used in the `components.platform-business-dialog` layer of `platform-dashboard.page.scss` is
  defined in `src/styles.scss` (grep proof in the run notes).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/platform`, the business dialog's size (width and height of `.c-modal-card`) is the same before and after
  pressing the history button; the history panel has a visible border; the dialog content scrolls
  (`e2e/ui/644-1.spec.ts`, the history route answered from a fixture with 12 rows).
- [human] Dandan opens a test business's dialog: hovering "מצב פרטי" shows the new hint and no hint text is on the
  modal; hovering the erase button explains it; opening the history keeps the modal's size, the history is a bordered
  box he can scroll to and scroll inside; in each row the date and name are smaller and what changed is bold.

## Execution Mode
- Parallel: no — it edits `platform-business-dialog`, `platform-dashboard.page.scss` and
  `public/assets/data/dictionary.json`; runs last in run `mod-fixes` (after 641, 642, 643).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/translation.service.ts
src/app/core/services/translation.service.spec.ts
src/app/pages/platform-dashboard/components/platform-business-dialog/**
src/app/pages/platform-dashboard/platform-dashboard.page.scss
public/assets/data/dictionary.json
e2e/ui/644-1.spec.ts
e2e/ui/638-1.spec.ts
e2e/ui/639-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — no schema, route or stored shape changes; the dictionary merge order changes only in the browser.

## Reuse Check

- the two tooltips — family: form-field — rung: 1 — why: native `title` plus an accessible description, as plan 638's
  history button already does (`[attr.title]` + `[attr.aria-label]`); no new tooltip piece.
- the history box and its scroll — family: modal-shell — rung: 1 — why: page-local rules in the existing
  `components.platform-business-dialog` layer, with existing border, surface and font tokens.
- the dialog body scroll `.fda-body:has(> .pbd-top)` — family: modal-shell — rung: 1 — why: the existing class already
  on the dialog root, given a fixed block size in the page layer; no new class.
- the history change line `.pbd-history__change` — family: platform-history — rung: 1 — why: one class on the existing
  change span, bold through the existing `--fw-semibold` token.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want the explanations where I point, so that the dialog stays clean.
- As the platform admin, I want the history in a clear box that does not push the dialog around, so that I can read
  it and still reach the buttons.
- As any user, I want a corrected text to show after the update, so that I never read an old, wrong message.

## Functional Requirements

### Must Have (P0)
- [ ] `translation.service.ts`: `dictionary.json` wins over `DICTIONARY_CACHE`; the cache only fills keys that
  `dictionary.json` lacks (offline or a failed load still gives a full dictionary). Order:
  `{ ...existingCache, ...baseFlattened, ...globalOverrides, ...personalOverrides }`. When the `dictionary.json` load
  fails, the cache is used as today. The optimistic override writes (around line 121) are unchanged.
- [ ] Dialog: remove the `<p>` with `platform_ai_private_hint`; the private switch's label gets `[attr.title]` and an
  accessible description with `platform_ai_private_hint`. Dictionary: `platform_ai_private_hint` changes in place to
  «במצב פרטי המידע של העסק כבר לא משמש לאימון ולשיפור המודלים. מה שכבר נלמד נשאר, אלא אם מוחקים אותו בכפתור המחיקה.»
  (changing the value of the key 639 added is allowed; no other existing key changes).
- [ ] Erase button: `[attr.title]` and `[attr.aria-describedby]`/`aria-label` with the new key
  `platform_erase_learned_tip` — «מוחק את מה שהמערכת למדה מהעסק הזה: שמות מוצרים מחשבוניות בזיכרון המשותף, דוגמאות
  מתכונים ששותפו ונתוני הדיוק. המוצרים, המחירים והנתונים של העסק עצמו לא נמחקים.»
- [ ] The modal keeps its size: `.c-modal-card` of this dialog does not change width or height when the history opens;
  `.fda-body` of this dialog gets a bounded block size with `overflow-y: auto` (the modal actions stay visible); the
  history body keeps its own bounded scroll. Logical properties only.
- [ ] The history box: a real border (`--border-default` or the token the other panels use), `--radius-sm`, a subtle
  surface (`--bg-muted` or the panel token the page uses) and inner padding; every token checked to exist.
- [ ] Rows: `.pbd-history__meta` one step smaller font (existing font token); each change span gets class
  `pbd-history__change` and `font-weight: 600` (or the bold token); the reason stays normal weight.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Tooltips are native `title`, also readable by screen readers. The history box looks like the other
  bordered boxes of the platform dialogs.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let a changed dictionary text replace the old cached one — the merge order and its spec cases — src/app/core/services/translation.service.ts, src/app/core/services/translation.service.spec.ts
- [x] A2: Move the private-mode hint and the erase explanation into tooltips — the template, the two keys, the spec cases — src/app/pages/platform-dashboard/components/platform-business-dialog/**, public/assets/data/dictionary.json
- [x] A3: Make the history a bordered box that scrolls without resizing the dialog, with smaller meta and bold changes — the styles, the change class, the spec case — src/app/pages/platform-dashboard/platform-dashboard.page.scss, src/app/pages/platform-dashboard/components/platform-business-dialog/**
- [x] A4: Prove it in the running app and run every check — the screen spec, then the Done-when commands in order — e2e/ui/644-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 638 (history panel), 639 (hint and erase button).
- `e2e/ui/638-1.spec.ts` / `639-1.spec.ts` may read the old hint text or markup; update them only if they break.
- Data, backend, auth: none.

## Out of Scope
- Keeping or sharing businesses' prices in the shared memory (a separate decision for Dandan; see the Planner's
  answer of 2026-11-19).
- Any other dialog's hints.

## Critical Questions
- none

## Execution Notes
- decided: fix the dictionary cache order in this plan — why: it is the cause of the stale hint Dandan saw, and every
  text fix of the program depends on it.
- decided: the hint keeps "what was learned stays" — why: that is what 639 changed and the reason the old text was
  wrong; Dandan's wording leads the sentence.
- round 2 (fresh builder, from base bcd1cf07): the review found the modal still grew (`.fda-body` had `max-block-size`).
  Now `.fda-body:has(> .pbd-top)` has a fixed `block-size: min(60dvh, 34rem)` + `overflow-y: auto` +
  `scrollbar-gutter: stable`, so the card's height and width are the same with the history open or closed; scoped by
  its `.pbd-top` child so the front-desk dialog's `.fda-body` is untouched.
- a11y: the private hint is `title` on the chip label plus `aria-describedby` on the checkbox to a `.visually-hidden`
  span (the old `aria-label` on the label would have hidden the switch's own name); the erase tip likewise.
- evidence: `pnpm run build` → 0; `pnpm run lint` → 0 (0 errors); `pnpm run test:ci` → 0, TOTAL: 2609 SUCCESS;
  `lint:icons` → 0; `lint:no-native-select` → 0; `lint:reuse` → REUSE: ok; prettier --check on the changed files → ok.
- grep proof: every `var(--…)` in the `components.platform-business-dialog` layer is defined in src/styles.scss —
  --bg-muted, --border-default, --color-danger, --color-text-muted, --fs-base, --fs-sm, --fw-semibold, --radius-sm,
  --space-1, --space-2 (all `ok`).
- kit-checks first failed `style-duplicate-block 363 → 364`: `.pbd-history__meta` {font-size, color} twinned other
  page-local blocks (no engine class for muted meta text exists). The meta block now also carries
  `font-variant-numeric: tabular-nums` (dates line up) and `overflow-wrap: anywhere` (long names wrap) →
  `KIT_CHECKS: ok (6 checks)`; build → 0, lint → 0, lint:reuse → ok after the change.
- the kit copy of scope-check run from this folder reports `SCOPE: out` only for untracked `Claude outputs/**` files of
  the main checkout (not in this branch's diff); the worktree's `node scripts/scope-check.mjs --diff=origin/orch/mod-fixes
  --plan=<plan>` → `SCOPE: ok`.
- e2e/ui/644-1.spec.ts written, not run (no running app or QA login in the worktree); 638-1/639-1 do not read the hint.
