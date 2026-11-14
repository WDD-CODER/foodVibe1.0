# Plan 587 — The AI menu picks dishes only (no portions or prices), and asks for the guest count instead of guessing one

Status: done
Depends-on: 580
Snapshot: 84a63416b39f6ee635f9921904af63d4db131a45

## Problem Statement
The Human validated batch-2 cards ③ and ④ (plan 580, 2026-11-12). Verified on `orch/batch-2` at 84a63416:

1. **The AI writes portions into each dish line.** For "חתונה ל-120 אורחים, בופה, ביום חמישי הבא" the dishes came from
   the recipe book (good), but the AI also set portions per dish (beef 80, salmon 60, chicken 100; desserts 100 and
   120). Those numbers became each dish line's portions, and the event multiplied them by the 120 guests, so one
   dessert asked for about 12,000 portions. The Human: "allow it to set only the dishes and not change something
   inside the dishes info."
   - The menu prompt in `server/routes/ai.js` (~line 880–905) asks for `serving_portions` and `sell_price` per item, and
     the patch prompt (~line 1055) does too.
   - `src/app/shared/ai-menu-modal/ai-menu-modal.component.ts:176-177` copies them into the draft
     (`servingPortions: dish.serving_portions`, `sellPrice: dish.sell_price`), and from there into the event's dish
     lines.
2. **No guest count is not reported.** For "בופה עם חומוס וסלט ירקות" the AI answered `guestCount: 1`, so the
   `no_guest_count` check (`server/routes/ai.js:952`, `guestCount <= 0`) never fired and no failed call was counted.
   The prompt says "guestCount must be a positive integer", which pushes the model to invent one. (The Human also saw
   a different failure correctly show "tried again" and count as failed; that path is fine.)

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/ai-menu.test.js` (new cases with a stubbed model
  answer: items that carry `serving_portions` / `sell_price` reach the client with both removed; `guestCount: null` →
  the `no_guest_count` code and the call counted as failed; the prompt text sent to the model contains no
  `serving_portions` and no `sell_price` and tells the model to return `guestCount: null` when the text has no guest
  number).
- [auto] `pnpm run test:ci` passes, including the new `src/app/shared/ai-menu-modal/ai-menu-modal.component.spec.ts`
  (a draft dish with `serving_portions: 100` and `sell_price: 50` produces a menu line with neither value
  set, so the dish's own defaults apply).
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On `/menu-library`, "צור עם AI" with "חתונה ל-120 אורחים, בופה, ביום חמישי הבא" gives dishes from the recipe
  book, and each dish line keeps the dish's own portions (the event's quantities follow 120 guests, not thousands).
- [human] "בופה עם חומוס וסלט ירקות" shows "חסר מספר האורחים…", and `/platform`'s AI-usage table counts that call as a
  failure.

## Execution Mode
Orchestrator run on a branch made from `orch/batch-2`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/routes/ai.js
server/test/ai-menu.test.js
src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
src/app/shared/ai-menu-modal/ai-menu-modal.component.spec.ts
src/app/core/models/ai-menu-draft.model.ts
```

## Read Scope
`server/services/ai-usage.js`, `server/test/helpers/log-capture.js`, `server/test/ai-match-product-names.test.js`
(patterns only — do not edit them).

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-6: preserves — the menu call still goes only through `server/routes/ai.js` → `callGemini`; the change is the
  prompt text and the server-side clean-up of the answer.

## Reuse Check
- none — edits existing prompt text and two existing functions; no new piece.

## Step 0 — Reality Check
Confirm the two prompt blocks and lines 176-177 of the modal still read as above.

## User Stories
- As a chef, I want the AI to choose dishes for my event and leave each dish's portions and price as I set them, so the
  shopping quantities stay right.
- As a chef, I want to be told when I forgot the guest count instead of getting a menu for one person.

## Functional Requirements

### Must Have (P0)
1. **Prompt:** remove `serving_portions` and `sell_price` from both the generate and the patch prompts' output formats
   and rules. Change the guest rule to: "guestCount is the number of guests the user wrote; if the text has no guest
   number, return null. Never guess."
2. **Server clean-up:** before the answer is returned, delete `serving_portions` and `sell_price` from every item
   (older or misbehaving answers), and treat a `guestCount` of `null`, missing, not a number, or ≤ 0 as `no_guest_count`
   (the existing code path that answers with the reason code and counts the call as failed).
3. **Client:** `ai-menu-modal.component.ts` no longer copies `serving_portions` / `sell_price` into the draft; the menu
   line takes the dish's own defaults. Mark both fields `@deprecated` in `AiMenuDishDraft`
   (`src/app/core/models/ai-menu-draft.model.ts`), as `predictedTakeRate` already is.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- No visible change apart from the correct quantities and the existing "חסר מספר האורחים…" message.

## Atomic Sub-tasks
- [x] A1: Stop the AI from setting portions or prices, and stop it guessing a guest count — server/routes/ai.js (both prompts + answer clean-up)
- [x] A2: Stop the menu popup from copying portions and prices into the dish lines — src/app/shared/ai-menu-modal/ai-menu-modal.component.ts, src/app/core/models/ai-menu-draft.model.ts
- [x] A3: Prove both on the server and in the popup — server/test/ai-menu.test.js, src/app/shared/ai-menu-modal/ai-menu-modal.component.spec.ts

## What happens when
- The user writes "120 אורחים" → guestCount 120 as today.
- The user writes "כמה עשרות אורחים" (no exact number) → `no_guest_count`.

## Technical Considerations
- Existing events already saved with wrong portions are not changed by this plan.

## Out of Scope
- Repairing events created during the test (the Human deletes them).
- Take-rate prediction.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12, batch-2 cards ③ and ④ (quoted in the Problem Statement).
- pnpm run test:server → exit 0, 1184 passed (incl. 3 new ai-menu cases); pnpm run test:ci → 2008 SUCCESS; pnpm run build → exit 0; pnpm run lint → 0 errors.
- seen: src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts:37-38 still copies dish.serving_portions/sell_price (out of scope; harmless now, the server strips them).
