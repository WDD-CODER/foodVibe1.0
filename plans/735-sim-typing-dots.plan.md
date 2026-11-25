# Plan 735 — The simulator shows three moving dots while the assistant is still writing its answer

Status: draft
Depends-on: 733
Snapshot: d1fc1531de9fdbd137b6510dd0bca3bb3f967220

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Human's request of 2026-11-25: "Inside the simulator, add a running 'typing' indicator like WhatsApp's three moving
dots, so the user understands the AI is writing an answer — something that shows while the AI is still working on an
answer."

Today, after the test guest sends a message, the chat shows nothing until the answer arrives, which takes about
10–40 s, so the owner cannot tell whether anything is happening. Verified on the Snapshot:
- `server/services/inbound.js:73-94` — `afterStored` waits `COALESCE_MS` (6000 ms, R-03) and then calls the turn
  handler; `server/services/frontdesk-turn.js` `runTurn` then calls the model (`deadlineMs: 35000`, plan 701; plan 731
  retries a malformed answer inside the same budget). A turn ends with one of: an assistant reply, a table offer, the
  handoff sentence (model handoff, guardrail block or keyword, plan 689, `status: 'human'`), the removal sentence, or —
  after plan 733 — a holding message plus `status: 'human'`. So in the simulator every finished turn leaves either an
  outbound message as the newest message or a conversation that is no longer `bot`.
- `src/app/pages/frontdesk/simulator/simulator.page.ts:310-331` — after each action the page re-reads the thread
  (`ConversationDataService.open(id, { peek: true })`) every 2 s for 30 s (`FAST_WINDOW_MS`), then every 10 s. The
  read returns `{ conversation, messages, now }` (`src/app/core/services/conversation-data.service.ts:63-75`), so the
  page already knows the newest message, its time, the conversation's `status` and the server's clock.
- A turn can last longer than the 30 s fast window (6 s wait + up to 35 s model budget), so today an answer at 35 s
  can appear only at the next 10 s read.
- `src/app/shared/chat-thread/` (`app-chat-thread`, family `chat-thread`) draws every bubble of the simulator and the
  inbox; it has no "someone is writing" row.

How plan 733 leaves the page (this plan is written against it): the `draft_` computed and the `sim-draft` block are
gone, the level line shows `sim_level_0_sim` at level 0, and a test conversation is answered as at level 1 whatever
the business's level — so in the simulator a guest text message always gets a turn unless a staff member holds the
conversation (`status: 'human'`).

## Goals & Success Criteria
**Primary:** while the assistant is working on the test guest's message, the simulator chat shows an assistant-side
bubble with three dots that bounce in turn, and screen readers hear "העוזר כותב…"; the bubble disappears as soon as
the answer (or the holding / handoff message) is shown, never shows while a staff member holds the chat, and never
stays longer than 45 s.

- [auto] `pnpm run test:ci` → exit 0, including the new cases in
  `src/app/shared/chat-thread/chat-thread.component.spec.ts` and
  `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`.
- [auto] `src/app/shared/chat-thread/chat-thread.component.spec.ts`: with `typing` false (the default) there is no
  `chat-typing` element; with `typing` true there is exactly one `chat-typing` row after the last message, on the
  opposite side from the guest's bubbles for `perspective: 'guest'` (`data-mine="false"`), holding three
  `.ct-dot` elements with `aria-hidden="true"` and the text `chat_typing` ("העוזר כותב…"); the `chat-typing-live`
  element exists in both states, has `aria-live="polite"`, is empty when `typing` is false and reads "העוזר כותב…" when
  true; the number of `chat-bubble` elements is the same in both states.
- [auto] `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`: a `bot` conversation whose newest message is a
  guest text message at `NOW - 5_000` (`threadNow_` = `NOW`) shows `chat-typing`; the same with the newest message
  outbound (the answer) → no `chat-typing`; newest guest message at `NOW - 46_000` → no `chat-typing`; newest guest
  message at `NOW - 5_000` but `status: 'human'` → no `chat-typing` and `sim-held` shown; newest guest message of
  `kind: 'button'` → no `chat-typing`; no thread loaded → no `chat-typing`.
- [auto] same file: while the dots show, the timer keeps reading the thread every 2 s also after the 30 s fast window
  (jasmine clock: 40 s after a send, `open` was called at least once in the last 2 s); once the newest message is
  outbound the reads fall back to every 10 s.
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm run lint` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`http://localhost:4202/frontdesk/simulator`, as `demo_host`), pick a test guest and write
  "שלום, אתם פתוחים מחר?" · right after sending, a grey bubble on the assistant's side shows three dots moving one
  after the other; when the assistant's answer appears the dots are gone; then take the chat over as a team member and
  write again as the guest · no dots appear.

## Execution Mode
- Parallel: yes with plans that do not touch `src/app/shared/chat-thread/` or the simulator page. Plan 733 changes the
  simulator page files; this plan starts only after 733 is merged into `chore/restaurant-staging` (Depends-on).
- Concurrent plans: 734
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/chat-thread/chat-thread.component.ts
src/app/shared/chat-thread/chat-thread.component.html
src/app/shared/chat-thread/chat-thread.component.scss
src/app/shared/chat-thread/chat-thread.component.spec.ts
src/app/pages/frontdesk/simulator/simulator.page.ts
src/app/pages/frontdesk/simulator/simulator.page.html
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
src/app/shared/breadcrumbs.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. The likely case is `docs/brain/inventory.md` if
`node scripts/inventory.mjs --check` reports `stale` after the family entry changes: offer
`approved: docs/brain/inventory.md` and regenerate it with `node scripts/inventory.mjs`.
`server/services/frontdesk-turn.js`, `server/services/inbound.js`, `server/routes/conversations.js` and
`src/app/pages/frontdesk/simulator/simulator.page.scss` are never offered: the plan needs no server change and the
bubble's style lives in the chat thread.

## Architecture Impact

- INV-7: preserves — no server file changes; the dots are read from the thread the page already loads (newest message, conversation status, server clock) and decide nothing about a table.
- INV-6: preserves — no AI call is added or moved; the browser only reads the stored messages as today.
- INV-2: preserves — no new query or route; the thread read is the existing business-scoped `GET /api/v1/conversations/:id/messages?peek=1`.

## Reuse Check

- The typing row — family: chat-thread — rung: 3 — why: a new `typing` input on `app-chat-thread` draws the row inside the one bubble list (the family says never a second bubble list); default false, so the inbox is unchanged.
- The "assistant is working" rule — family: simulator-page — rung: 3 — why: one `typing_` computed in `SimulatorPage` beside `heldByStaff_`, from data the page already reads; no service and no new piece.
- The moving dots — family: feedback — rung: 4 — why: `app-loader` (family feedback) is a page/section spinner, not a chat bubble; three `.ct-dot` spans with one keyframe in the chat thread's own stylesheet, no `.c-*` class (one user).

## Defaults

- loading-and-error-states — exception — why: no new data request; the thread's existing loader and `sim_load_failed` state stay, and the dots only show the assistant's pending answer (a failure ends as today with the holding message of plan 733 or `ai-failed-note`)
- hints-in-tooltips — exception — why: no new control
- empty-state-on-list — exception — why: no list changes; the empty chat and guest list are untouched
- app-list-container — exception — why: no list changes in this plan
- anchored-popup — exception — why: no floating box; the typing bubble is a row inside the chat list
- one-breakpoint-set — exception — why: no new layout or `@media` width; only a `prefers-reduced-motion` query

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner testing the assistant, I want to see that the assistant is writing, so that I wait for the answer instead of sending the message again.
- As an owner using a screen reader, I want to hear "העוזר כותב…", so that I know an answer is coming.
- As an owner who took the chat over, I want no dots, so that the simulator does not pretend the assistant will answer.

## Functional Requirements

### Must Have (P0)

**The typing row — `src/app/shared/chat-thread/`**
- [ ] `ChatThreadComponent` gains `readonly typing = input(false)` with the doc comment "Plan 735: shows the other
  side's 'writing…' bubble after the last message."
- [ ] `chat-thread.component.html`: after the `@for`, `@if (typing())` one
  `<li class="ct-row" data-testid="chat-typing" [class.ct-row--mine]="perspective() === 'business'" [attr.data-mine]="perspective() === 'business'">`
  — for the guest perspective it sits on the assistant's side like the answers; inside a
  `<div class="ct-bubble ct-typing">` three `<span class="ct-dot" aria-hidden="true"></span>` and
  `<span class="ct-typing-text">{{ 'chat_typing' | translatePipe }}</span>`. The row is `aria-hidden="true"` (the live
  region below speaks for it).
- [ ] After the `</ol>`, always present: `<p class="visually-hidden" aria-live="polite" data-testid="chat-typing-live">`
  holding `{{ 'chat_typing' | translatePipe }}` only while `typing()` is true (an always-present live region is what
  screen readers announce reliably; the `.visually-hidden` class already exists in `src/styles.scss`).
- [ ] `chat-thread.component.scss`: `.ct-typing` (inline-flex, `gap: 0.25rem`, `align-items: center`, the not-mine
  bubble colours it already has); `.ct-dot` (`inline-size` / `block-size: 0.5rem`, round, `currentColor` at reduced
  opacity) animated by one `@keyframes ct-typing-bounce` (translateY up and back, 1.2 s, infinite), the second and third
  dot delayed 0.2 s and 0.4 s; `.ct-typing-text` visually hidden by default. `@media (prefers-reduced-motion: reduce)`:
  the dots are `display: none` and `.ct-typing-text` is shown as plain text ("העוזר כותב…"). Logical properties only.

**When the dots show — `src/app/pages/frontdesk/simulator/`**
- [ ] `simulator.page.ts`: `const TYPING_MAX_MS = 45_000` and
  `protected readonly typing_ = computed(() => { ... })`: true only when `thread_()` is loaded, its
  `conversation.status === 'bot'`, the newest message (last of `messages`) has `direction: 'in'`, `author: 'guest'` and
  `kind: 'text'`, and `threadNow_() - newest.at < TYPING_MAX_MS`. Doc comment: "Plan 735: the assistant is still
  working on the guest's message — the newest message is the guest's and the assistant still holds the chat; hidden
  after 45 s so a crashed turn never leaves the dots."
- [ ] `simulator.page.html`: `<app-chat-thread ... [typing]="typing_()" />`.
- [ ] The timer (`startTimer`) reads fast also while the dots show:
  `const fast = Date.now() < this.fastUntil || untracked(() => this.typing_())`, so the answer appears within 2 s of
  being stored even after the 30 s window, and the 45 s cap is measured on a fresh server clock.

**Dictionary — `public/assets/data/dictionary.json`** (append only, in `general`)
- [ ] `chat_typing`: "העוזר כותב…"

**Registry and map**
- [ ] `docs/brain/component-families.md` `chat-thread`: the Use line adds the `typing` input ("plan 735: the other
  side's 'writing…' bubble with three moving dots, a static text under reduced motion, a polite live region") and the
  classes `.ct-typing`, `.ct-dot`; `simulator-page`: the Use line adds "the typing dots while the assistant works
  (plan 735)".
- [ ] `src/app/shared/breadcrumbs.md` (the `chat-thread/` row): add "a typing bubble (`typing`, plan 735)".

**Tests**
- [ ] `src/app/shared/chat-thread/chat-thread.component.spec.ts`: the typing row and the live region, as in Done when.
- [ ] `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`: the six show / hide cases and the fast-read case, as
  in Done when (the `msg(...)` helper gets an optional `at`, `kind` and `author`).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- The bubble sits on the assistant's side of the phone chat (the same side and colour as the assistant's answers),
  under the guest's newest message, three small round dots rising one after the other like WhatsApp; no time, no author
  tag.
- Reduced motion: the same bubble with the still text "העוזר כותב…".
- Screen readers hear "העוזר כותב…" once when the dots appear; nothing when they go.
- Not shown while a staff member holds the chat (the "השיחה אצל הצוות" line shows instead), after a button tap, or
  more than 45 s after the guest's message.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the chat thread draw a writing bubble with three moving dots on the other side — typing input, the row after the last message, the polite live region, the keyframe and the reduced-motion text, chat_typing key, spec cases — src/app/shared/chat-thread/chat-thread.component.ts, src/app/shared/chat-thread/chat-thread.component.html, src/app/shared/chat-thread/chat-thread.component.scss, src/app/shared/chat-thread/chat-thread.component.spec.ts, public/assets/data/dictionary.json
- [ ] A2: Show the dots in the simulator while the assistant is still working on the guest's message — typing_ computed with the 45 s cap, the input on app-chat-thread, fast reads while typing, spec cases — src/app/pages/frontdesk/simulator/simulator.page.ts, src/app/pages/frontdesk/simulator/simulator.page.html, src/app/pages/frontdesk/simulator/simulator.page.spec.ts
- [ ] A3: Record the new typing bubble where the next builder looks for it — the chat-thread and simulator-page family lines and the shared folder map — docs/brain/component-families.md, src/app/shared/breadcrumbs.md
- [ ] A4: Run every check of this plan and hand Dandan the simulator check — test:ci, build, lint, inventory check, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: plan 733 (a test conversation always gets a turn unless a member holds it; the holding message ends a
  failed turn with an outbound row), plan 719 (`status: 'human'` while a member holds the chat), plan 678 (the
  simulator's reads), plan 677 (`app-chat-thread`).
- New files needed: none.
- Model changes: none; no new persisted field.
- Backend / API: none.
- Auth and validation: unchanged.
- Security surface: none; the page reads only what it already reads.
- Data / migration: none.
- Cost: while the dots show the page reads the thread every 2 s instead of every 10 s, at most for 45 s per guest
  message.
- Project checks: the `log-query` Done-when item.
- Traps: `threadNow_` is the server's clock of the last read, not `Date.now()` — compare message times with it only;
  `typing_` must stay false for a `kind: 'button'` guest message (a tap is answered by the button handler, not the
  assistant, and may send nothing); the live region must be in the DOM before the text appears, so it is never inside
  the `@if`; the inbox passes no `typing`, so its default false keeps the inbox unchanged — do not add it there.

## Out of Scope
- Typing dots in the inbox (`src/app/pages/inbox/`) or for a real guest on WhatsApp.
- A server flag for a running turn (see the first `behaviour:` decision).
- Changing the 6 s wait (R-03), the model budget or the reads' 10 s slow rate when nothing is pending.

## Critical Questions
- none

## Execution Notes
- behaviour: the dots are derived from the thread the page already reads (newest message is the guest's text, conversation `bot`, under 45 s on the server clock), not from a new server `assistantTyping` flag — after plan 733 every finished turn in the simulator leaves an outbound message or a non-`bot` status, so the derivation is exact without touching `frontdesk-turn.js`, and it also covers the 6 s R-03 wait before the turn starts, which a flag set inside `runTurn` would miss.
- behaviour: the dots show for a guest text message only, not after a button tap (a tap is answered by the button handler, not by the assistant).
- behaviour: the dots hide 45 s after the guest's message even when nothing came (the 6 s wait plus the 35 s model budget fit inside it), so a crashed turn never leaves them.
- behaviour: while the dots show the page reads the thread every 2 s, also after its 30 s fast window, so the answer appears within 2 s of being stored.
- behaviour: the typing bubble is a new `typing` input of the shared `app-chat-thread` (default false), so the simulator does not draw a second bubble list; the inbox does not use it in this plan.
- behaviour: under `prefers-reduced-motion` the dots are hidden and the bubble shows the still text "העוזר כותב…"; screen readers hear the same text from one always-present polite live region.
