# Plan 585 — Terms popup: read to the end on every screen, and cancelling an unaccepted popup signs the user out

Status: draft
Depends-on: 584
Snapshot: 4e1b4b12512f797265d97c9f89a87c54679dab8d

## Problem Statement
The Human validated plan 584 (2026-11-12, cards ①–⑥ ok) and asked for two changes. Verified on `orch/run-584` at 4e1b4b12:

1. **Desktop does not force reading to the end.** On a phone the "אני מסכים/ה" button stays disabled until the text is
   scrolled to its end; on a desktop it can be pressed without scrolling. `TermsModalComponent.onScroll()`
   (`src/app/core/components/terms-modal/terms-modal.component.ts`) measures `#body`, an element that carries both
   `c-modal-body` and `terms-body` (`terms-modal.component.html`); `.terms-body` sets `max-block-size: 50dvh;
   overflow-y: auto` (`terms-modal.component.scss`). Likely cause (to confirm in Step 0): on a wide screen the engine
   class `.c-modal-body` (in `src/styles.scss`) or the modal card makes another element scroll, so `#body` never
   overflows and `onScroll()` marks it read at once (`remaining <= 8`).
2. **The gate popup has no way out.** `TermsGateComponent` (`src/app/core/components/terms-gate/`) shows the popup with
   `dismissible=false`. The Human wants close, Escape and a click outside to work, but while the user has not accepted
   the current terms the app may only show the welcome page.

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes, including `src/app/core/components/terms-modal/terms-modal.component.spec.ts`
  (new case: when the text box does not overflow because the card is tall, the button is enabled only after the box's
  own end is in view, never at load when there is text below the visible part of the card) and
  `src/app/core/components/terms-gate/terms-gate.component.spec.ts` (new cases: `closed` from the popup calls
  `UserService.logout()` and navigates to `/welcome`; the popup is dismissible in the gate).
- [auto] `pnpm run build`, `pnpm run lint`, `node scripts/reuse-lint.mjs --diff=origin/main` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] At a 1440×900 window, on `/welcome` → "פתיחת חשבון" → "תנאי השימוש", "אני מסכים/ה" is disabled; after scrolling
  the terms text to the end it is enabled (`e2e/ui/585-1.spec.ts`, sets the viewport; signs the dev guest out first so
  `/welcome` stays open).
- [human] On a desktop and on a phone, the terms popup cannot be confirmed before scrolling to the end.
- [human] Signed in as an account that never accepted (for example `demo_chef` after resetting it, see Step 0), pressing
  "סגור", Escape or clicking outside the popup signs out and shows the welcome page; signing in again shows the popup.

## Execution Mode
Orchestrator run on a branch made from `orch/run-584`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/core/components/terms-modal/terms-modal.component.ts
src/app/core/components/terms-modal/terms-modal.component.html
src/app/core/components/terms-modal/terms-modal.component.scss
src/app/core/components/terms-modal/terms-modal.component.spec.ts
src/app/core/components/terms-gate/terms-gate.component.ts
src/app/core/components/terms-gate/terms-gate.component.html
src/app/core/components/terms-gate/terms-gate.component.spec.ts
e2e/ui/585-1.spec.ts
```

## Read Scope
`src/app/shared/modal-shell/**`, `src/styles.scss` (the `.c-modal-*` engine classes), `src/app/core/services/user.service.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client-only change to two terms components; no server, data, schema, taxonomy or AI path.

## Reuse Check
- none — changes two existing components; no new component, util, pipe, service or `.c-*` class.

## Step 0 — Reality Check
At a 1440×900 window, open the terms popup and record which element scrolls (the one whose `scrollHeight >
clientHeight`). Write the finding in `## Execution Notes`. To test the gate by hand, an account with
`termsAcceptedVersion: null` is needed; the e2e and specs do not need one.

## User Stories
- As Dandan, I want every user to scroll through the whole terms on any screen before agreeing, so the acceptance means
  they saw it all.
- As a user who does not want to agree right now, I want to close the popup and leave, not be stuck.

## Functional Requirements

### Must Have (P0)
1. **One scrolling box on every screen.** The terms text is the only scrolling element of the popup, at every width:
   `#body` keeps a fixed maximum height (`max-block-size: min(60dvh, 36rem)` or the value Step 0 shows fits), and the
   modal card itself does not scroll the text. If `.c-modal-body` from `src/styles.scss` is what changes the behaviour,
   do not edit the engine class; drop `c-modal-body` from `#body` and keep the spacing in `.terms-body` instead.
2. **Read means seen to the end.** `isAtEnd_` turns true only when `#body`'s end is inside its visible area
   (`scrollHeight - scrollTop - clientHeight <= 8`). Re-check on window `resize` too. When the text truly fits without
   scrolling (a very tall screen), it counts as read at once, as today.
3. **The gate can be closed.** `TermsGateComponent` shows `app-terms-modal` with `dismissible=true`. On `closed`
   (the "סגור" button, Escape, a click outside), it calls `UserService.logout()` and navigates to `/welcome`. Accepting
   works as today. The next sign-in shows the popup again, because the stored version still differs.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- Escape is one step back (plan 515 lesson): in the sign-up form the popup closes back to the form; in the gate,
  closing signs out, because there is no step behind it.

## Atomic Sub-tasks
- [ ] A1: Make the terms text the only scrolling box so desktop also needs a scroll to the end — terms-modal.component.{ts,html,scss}
- [ ] A2: Let the gate popup be closed, and sign the user out to the welcome page when they do — terms-gate.component.{ts,html}
- [ ] A3: Prove both in unit tests and one desktop-size screen check — terms-modal.component.spec.ts, terms-gate.component.spec.ts, e2e/ui/585-1.spec.ts

## What happens when
- The user closes the gate popup while the accept request is in flight → the close is ignored until it finishes.
- The user resizes the window after scrolling to the end → stays read.

## Technical Considerations
- `UserService.logout()` already exists (used by the header's sign-out button); reuse it.

## Out of Scope
- Changing the terms text or its version.
- The sign-up popup's close behaviour (it already returns to the form).

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12 (plan 584 validation): "can the Scrawl behavior be on desktop also … the user has to view the whole
  Terms before he can agree" and "Allow pressing cancel or clicking outside. But then as long as the user have never
  agreed, it will only pass into the welcome page."
