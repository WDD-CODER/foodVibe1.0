# Plan 657 — Stock count: an asked amount is confirmed before it counts, the counted mark sized per width, the base amount in a light popup on phones

Status: draft
Depends-on: 656
Snapshot: c1e5274f

## Problem Statement
Dandan checked plan 655 on 2026-11-21 (staging `061f1573`):

1. **③ The amount question saves on the first tap.** «ארגז עגבניות» asks «כמה?», but the first tap on the counter
   already counts the line (1). Traced: `stock-ai-draft.component.html:126`,
   `<app-counter [value]="0" [min]="0" (valueChange)="amount.emit(...)" />` — every counter change is emitted at once,
   and the first emit fills the missing amount, so the line resolves before the cook reaches the real number.
2. **⑤ The counted checkbox is the same small size everywhere.** It must be bigger on big screens and smaller on small
   ones, at the app's breakpoints (plan 656's set: phone ≤767, tablet 768–1023, desktop ≥1024).
3. **⑥ On a phone the base amount must open in a light popup.** A tap opens a small popup showing the amount in the
   base unit; the screen behind is **not** blurred or darkened; any tap outside it or any scroll closes it. This look is
   for this case, not a change to every popup.

## Goals & Success Criteria
**Primary:** an asked amount is set and then confirmed, the counted mark fits each screen size, and the base amount
opens and closes lightly on a phone.

- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts`: (a) on a line
  missing its amount, three taps on the counter emit nothing; the line stays unresolved and shows the number 3;
  (b) pressing the line's confirm button (or Enter in the typed number) emits `amount` once with 3; (c) a confirm with 0
  emits nothing.
- [auto] The same command, `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts`: (a) the
  counted checkbox gets the size tokens of the current width — phone, tablet, desktop each a different size, desktop the
  largest; (b) at phone width a tap on the base-amount control opens `app-modal-shell` with `[light]="true"` showing the
  base amount; (c) a click outside the card or a `scroll` event closes it; (d) at tablet and desktop width the hover
  tooltip and the click popover of plan 655 stay as they are.
- [auto] `src/app/shared/modal-shell/modal-shell.component.spec.ts`: `[light]="true"` renders the overlay with no
  backdrop colour and no blur, closes on an outside pointer-down and on scroll, and keeps Escape and focus restore;
  without `light` every existing case passes unchanged.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At 375 px on `/inventory/count`, a tap on a row's base-amount control opens the light popup with the background
  still sharp, and a scroll closes it; at 375, 800 and 1280 px the counted checkbox has three different sizes
  (`e2e/ui/657-1.spec.ts`, one screenshot per width kept for the Human).
- [human] Dandan types «ארגז עגבניות», taps the counter up to 3 and confirms: the row reads 3 crates. On a phone he
  taps a base amount: a small popup shows it, the page behind stays clear, a tap outside or a scroll closes it. The
  counted box is bigger on the laptop than on the phone.
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line

## Execution Mode
- Parallel: no — stock screens and the popup frame; after 656, on its line (served with 656 for one check).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
src/app/shared/modal-shell/modal-shell.component.ts
src/app/shared/modal-shell/modal-shell.component.html
src/app/shared/modal-shell/modal-shell.component.spec.ts
src/app/shared/counter/counter.component.ts
src/app/shared/counter/counter.component.spec.ts
public/assets/data/dictionary.json
e2e/ui/657-1.spec.ts
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the AI draft still calls the model only through the server; this plan changes only how the
  browser applies an amount.

## Reuse Check

- the light popup — family: modal-shell — rung: 2 — why: one new `light` input on `app-modal-shell` (no backdrop, closes
  on outside tap and scroll); no new popup piece.
- the held amount — family: stepper — rung: 1 — why: the existing `app-counter`, its value held on the line until the
  confirm.
- the counted mark sizes — family: list-page — rung: 1 — why: `app-list-row-checkbox` sized by the 656 breakpoint
  names.
- the light variant `.c-modal-overlay--light` — family: modal-shell — rung: 2 — why: the engine overlay's `light` variant, no new popup piece.
- the light card `.stock-count__base-light` — family: modal-shell — rung: 2 — why: only the phone card's padding and size, on the shell's card.
- the counted cell `.stock-count__counted` — family: list-page — rung: 1 — why: the existing counted cell, sized by tokens.
- the chip box `.c-chip--toggle` — family: chip — rung: 1 — why: existing chip, only sized from the count page.
- the row checkbox `.list-row-checkbox` — family: list-page — rung: 1 — why: existing, only its box sized from the count page.

## Defaults

- one-breakpoint-set — applies — how: the checkbox sizes and the phone-only popup use the 656 names; no width typed.
- app-list-container — applies — how: the row stays on one line at every size.
- hints-in-tooltips — exception — why: no dialog explanation is added; the base amount's hover text stays native.
- unit-dropdown-add — exception — why: no unit dropdown change.
- leave-and-return — exception — why: no page change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to tap the counter up to the real number before the line counts.
- As an owner, I want controls sized for the screen I hold.
- As an owner on a phone, I want to peek at the base amount without the page going dark.

## Functional Requirements

### Must Have (P0)
- [ ] The amount question holds the counter value on the line; a confirm button (and Enter in the typed number) applies
  it; 0 never applies.
- [ ] The counted checkbox: phone small, tablet medium, desktop largest (box and tap area), by the 656 names.
- [ ] `app-modal-shell` `light` input: transparent overlay, no blur, closes on outside pointer-down and on scroll;
  used only by the count's phone base amount.
- [ ] Dictionary (append-only): `stk_confirm_amount` — "אישור".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let the cook set the amount before it counts — the held value, the confirm, the cases — src/app/pages/inventory/components/stock-count/**, public/assets/data/dictionary.json
- [x] A2: Size the counted mark for each screen — the three sizes by the breakpoint names, the cases — src/app/pages/inventory/components/stock-count/**
- [x] A3: Peek at the base amount on a phone — the light popup input, its use on the count, the cases — src/app/shared/modal-shell/modal-shell.component.ts, src/app/shared/modal-shell/modal-shell.component.html, src/app/shared/modal-shell/modal-shell.component.spec.ts, src/app/pages/inventory/components/stock-count/**
- [x] A4: Prove it in the running app — the screen spec at three widths, then the Done-when commands in order — e2e/ui/657-1.spec.ts, docs/brain/component-families.md, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 656 (the breakpoint names). Runs on `orch/mod-breakpoints`' line and is checked together with 656.

## Out of Scope
- Changing other popups' backdrop.

## Critical Questions
- none

## Execution Notes
- decided: confirm button for the asked amount — why: Dandan, "the first click I do on the counter saves it".
- decided: the light look is an opt-in input on the shared popup, used only here — why: Dandan, "in this specific
  case".
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run test:ci` → exit 0, TOTAL 2710 SUCCESS.
- behaviour: the light popup ignores a pointer-down on its opener, so the opener's own click toggles it — reverse: drop the opener check in `watchOutside_` (modal-shell.component.ts).
- behaviour: the confirm button is disabled while the held number is 0 — reverse: remove `[disabled]` in stock-ai-draft.component.html.
- [ui] 657-1: written, not run (e2e/ui/657-1.spec.ts).
