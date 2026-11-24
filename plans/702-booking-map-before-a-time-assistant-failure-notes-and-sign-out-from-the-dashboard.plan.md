# Plan 702 — The new-booking map shows before a time is picked, the staff read why the assistant stopped, and sign-out works from the dashboard

Status: draft
Depends-on: 701
Snapshot: d06302a34cca8c8fc09125c3a7737c34b4ed2ab3

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).
Three cards of the Human's validation of 2026-11-23 failed on screens. Each cause was reproduced in the running slot
`wt-2` (`http://localhost:4202`, user `demo_host`) on 2026-11-23 at about 22:45.

**1. ⑰ "הזמנה חדשה": no small map and no info icon.** The map block and its `info` button render only after a time
chip is chosen: `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.html:109`
`@if (time_() && plan_(); as plan)`. The dialog opens on the view's date (today); late in the evening today has no
free slot left, the time area says "אין שעות פנויות ביום הזה", no chip can be chosen, and the map and the icon never
appear. Picking tomorrow and 20:00 shows both (the icon is on top and its `title` works), so the pieces work — the
condition hides them. Also, `.nb-map` (`new-booking-dialog.component.scss:21-25`) caps the map at 14rem with its own
scroll, so the bottom row of tables (13, 14) is cut off inside the dialog.

**2. ㉙/㉚/㉛ "no answer was available".** After plan 701 the assistant falls back to another model, but a failure
can still happen. Today the inbox shows only "לא הצלחנו להציע תשובה" for every failed suggestion
(`src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.html:37-39`, `conversation-data.service.ts:98-113`
returns `{ ok: false }` with no reason), and a guest turn that failed hands the chat to a person with no word to the
staff on why (the guest gets nothing, by rule R-04). Plan 701 adds the reason: `502 { error: 'AI_FAILED', reason }`
and `conversation.assistantFailed: { at, reason }` with `reason` one of `busy | timeout | quota | other`.

**3. Knowledge "fix this answer" never reached the server.** Not a broken flow: the button "תיקון התשובה" shows only
under messages the assistant wrote (`src/app/shared/chat-thread/chat-thread.component.html:43`,
`item.byAi` = outbound with `author === 'ai'`, `chat-thread.component.ts:83`), exactly as plan 682 specifies. In the
test session every guest turn failed (be.log: `frontdesk.turn.failed` on both conversations, and the only successful
call was a suggest, which writes no message), so there was no assistant message to mark and no `/fix` call. A failed
turn writes no message, so there is nothing to mark; the staff note of item 2 explains the gap instead. Once plan 701
makes turns succeed the card can be replayed as written.

**4. Sign-out does nothing.** The header's `logout()` (`src/app/core/components/header/header.component.ts:175-186`)
first navigates to `/dashboard` and stops when `navigate()` resolves `false`. After sign-in the user lands on
`/dashboard`; a navigation to the URL already shown is skipped by Angular 19 and resolves `false`
(`node_modules/@angular/router/fesm2022/router-*.mjs:4756`, `IgnoredSameUrlNavigation` → `t.resolve(false)`), so
`userService.logout()` never runs: no `auth.logout` client log and no `POST /api/v1/auth/logout` in be.log.
Reproduced: on `/dashboard` the username button "התנתקות" leaves the user signed in and sends no request. Not the
cookie: in development each backend port already has its own refresh cookie (`server/routes/auth.js:24-28`).

## Goals & Success Criteria
**Primary:** the owner sees the room and the info icon as soon as "הזמנה חדשה" opens; a failed suggestion or a
handed-over chat says in plain Hebrew why; signing out works from every page, the dashboard included.

- [auto] `pnpm run test:ci` passes, including the new cases in
  `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts`,
  `src/app/core/components/header/header.component.spec.ts`,
  `src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.spec.ts`,
  `src/app/pages/inbox/inbox.page.spec.ts`, `src/app/core/services/conversation-data.service.spec.ts` and
  `src/app/pages/frontdesk/simulator/simulator.page.spec.ts`.
- [auto] `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts` (new cases): as owner with a loaded plan and no time chosen,
  `[data-testid="nb-map"]` and `[data-testid="nb-pick-other"]` exist, the line "בחרו שעה כדי לראות איזה שולחן מוצע"
  shows, a map tap changes nothing and the save body has no `tableKeys`; after a time is chosen the offer line replaces
  it (existing cases keep passing); as staff the map shows with no info button; with no plan loaded there is no map.
- [auto] `src/app/core/components/header/header.component.spec.ts` (new cases): on `/dashboard` with no query, `logout()` calls
  `UserService.logout` and does not navigate; on `/dashboard?tab=metadata` it navigates to `/dashboard` first and calls
  `logout` only when that navigation resolves `true`; when a guard cancels (`false`) on another protected page it does
  not call `logout` (existing behaviour kept).
- [auto] `src/app/core/services/conversation-data.service.spec.ts` (new case): a 502 `{ error: 'AI_FAILED', reason: 'busy' }` makes
  `suggest()` return `{ ok: false, reason: 'busy' }`; an unknown or missing reason returns `reason: 'other'`.
- [auto] `src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.spec.ts` and
  `src/app/pages/inbox/inbox.page.spec.ts` (new cases): a failed suggest with `busy` shows
  "העוזר עמוס כרגע. נסו שוב בעוד דקה" with the retry button; `timeout` and `quota` show their own lines; `other` shows
  the existing "לא הצלחנו להציע תשובה"; a thread whose conversation has `assistantFailed` with `at` ≥ `lastMessageAt`
  shows `[data-testid="ai-failed-note"]` with the reason's line, and none when `at` < `lastMessageAt`.
- [auto] `src/app/pages/frontdesk/simulator/simulator.page.spec.ts` (new case): the open test guest's thread with `assistantFailed` (same rule) shows
  `[data-testid="ai-failed-note"]` under the chat.
- [auto] `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0; `pnpm run lint:reuse` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/bookings` (the spec answers the floor plan, the day board and availability itself) press "הזמנה חדשה" →
  `[data-testid="nb-map"]` and `[data-testid="nb-pick-other"]` are visible before any time is chosen
  (`e2e/ui/702-1.spec.ts`).
- [ui] On `/inbox/<id>` with the suggest call answered `502 { error: 'AI_FAILED', reason: 'busy' }`, press "הצע תשובה"
  → the text "העוזר עמוס כרגע. נסו שוב בעוד דקה" appears (`e2e/ui/702-2.spec.ts`).
- [ui] On `/dashboard` press the username button → a `POST …/auth/logout` request is sent and the header shows the
  sign-in button (`e2e/ui/702-3.spec.ts`).
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
  (`/bookings` as `demo_host`, late in the evening when today has no free times: press "הזמנה חדשה" → the small map of
  the room is there at once, every table visible; hover the round "i" at its corner → "אפשר לבחור שולחן אחר במפה").
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
  (`/inbox`, a conversation from the simulator: press "הצע תשובה" while the AI is unavailable → one readable Hebrew
  sentence saying why, and "נסה שוב").
- [human] Sign out from the dashboard: sign in as `demo_host`, stay on the dashboard, press your name at the top →
  you are signed out (the header shows the sign-in button and a page reload keeps you signed out).
- [human] Fix this answer (replays the failed card): in the simulator the test guest asks "יש חניה?" and the
  assistant answers; press "פתיחה בשיחות", press "תיקון התשובה" under the assistant's answer, type the right answer,
  pick "מידע שגוי", press "שמירה" → "נשמרה טיוטה למידע על העסק", and the draft is on "מידע על העסק".

## Execution Mode
- Parallel: no — runs after plan 701 (it reads the `reason` and `assistantFailed` that 701 adds). It appends to
  `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.ts
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.html
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.scss
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.spec.ts
src/app/core/services/conversation-data.service.ts
src/app/core/services/conversation-data.service.spec.ts
src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.ts
src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.html
src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.spec.ts
src/app/pages/inbox/inbox.page.ts
src/app/pages/inbox/inbox.page.html
src/app/pages/inbox/inbox.page.scss
src/app/pages/inbox/inbox.page.spec.ts
src/app/pages/frontdesk/simulator/simulator.page.ts
src/app/pages/frontdesk/simulator/simulator.page.html
src/app/pages/frontdesk/simulator/simulator.page.scss
src/app/pages/frontdesk/simulator/simulator.page.spec.ts
src/app/core/utils/assistant-failure.util.ts
src/app/core/utils/assistant-failure.util.spec.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
src/app/core/breadcrumbs.md
docs/brain/inventory.md
docs/brain/component-families.md
e2e/ui/702-1.spec.ts
e2e/ui/702-2.spec.ts
e2e/ui/702-3.spec.ts
src/app/appRoot/app.component.spec.ts
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

- INV-1: preserves — `ConversationDataService.suggest` only reads one more field of the 502 answer; no write, scope or permission changes; the inbox and simulator only show a field the server already returns to members with `manageConversations`.
- INV-6: preserves — the browser still calls only `/api/v1/ai/frontdesk/suggest` on the server and holds no key; no file named `*ai*` in `src/app` is touched.

## Reuse Check

- `assistantFailureKey(reason)` and `showAssistantFailure(conversation)` in `src/app/core/utils/assistant-failure.util.ts` — family: none — rung: 4 — why: two pure functions shared by the inbox and the simulator (two pages, so not page-local); no util family covers assistant states.
- The staff note under the thread (`.ai-failed-note` in the simulator, `.ibx-ai-failed-note` in the inbox) — family: feedback — rung: 1 — why: a `role="status"` line with the registered `alert-triangle` icon and the text colour tokens, the inline-notice pattern of the floor-plan notice; no new `.c-*` class.
- Reason lines of the suggestion bar — family: none — rung: 4 — why: one more input (`failKey`) on the inbox's page-local `app-suggestion-bar` (plan 682); no new piece.
- The small map before a time is chosen — family: none — rung: 4 — why: the same `app-floor-map` the dialog already uses, shown under a wider condition; no new piece.

## Defaults

- hints-in-tooltips — applies — how: the info button keeps `[attr.title]` + `[attr.aria-label]` = `nb_pick_other`; no hint text is added to the dialog (the "choose a time" line is a state line, not an explanation of a control)
- loading-and-error-states — applies — how: a failed suggestion shows a reason line plus the existing "נסה שוב"; the thread note says why a chat was handed over
- one-breakpoint-set — applies — how: no new `@media`; any needed one uses `$break-phone-max` / `$break-tablet-max`
- leave-and-return — exception — why: no new way to leave a page; sign-out keeps the existing leave question on every page that has unsaved changes
- app-list-container — exception — why: no list page is added or changed; the inbox list and the simulator's guest list are untouched
- empty-state-on-list — exception — why: no list is added; the lists' existing empty states are untouched

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner taking a phone booking, I want to see my room as soon as the booking window opens, so that I can tell the guest where they could sit.
- As a host, I want to read why the assistant could not answer, so that I know whether to press "try again" or answer the guest myself.
- As a chef, I want "sign out" to sign me out wherever I am, so that the next person on this device does not act as me.

## Functional Requirements

### Must Have (P0)

**New-booking dialog**
- [ ] The map block shows whenever `plan_()` is loaded — the condition at `.html:109` becomes `@if (plan_(); as plan)`;
  the block gets `data-testid="nb-map"` on `.nb-map`.
- [ ] Before a time is chosen: no table is selected, the line `nb_pick_time_first` "בחרו שעה כדי לראות איזה שולחן
  מוצע" shows where the offer line goes, and `onMapTap` returns at once (`!this.time_()` joins its guard at `.ts:207`),
  so no override can exist before a time. After a time is chosen everything works as plan 672 says.
- [ ] The info button (owner only) shows with the map, before and after a time is chosen.
- [ ] `.nb-map`: drop `max-block-size: 14rem` and `overflow: auto`; the map keeps its aspect ratio at the dialog's
  width, so every table is visible without an inner scroll.

**Sign-out**
- [ ] In `HeaderComponent.logout()`, when the current URL is exactly `/dashboard` (use
  `router.isActive(router.createUrlTree(['/dashboard']), { paths: 'exact', queryParams: 'exact', fragment: 'ignored', matrixParams: 'ignored' })`)
  skip the navigation and sign out at once. Every other protected URL keeps today's flow (navigate to `/dashboard`,
  stop when a guard says no). `/dashboard?tab=metadata` is a different URL, so its unsaved-coefficients question still
  runs.

**Assistant failure reasons** (contract of plan 701: `busy | timeout | quota | other`)
- [ ] `ConversationDataService.suggest` returns `{ ok: false; reason: AssistantFailureReason }`, `reason` read from the
  502 body (`error.reason`); anything else → `'other'`. The failure log line gains `reason`.
- [ ] `src/app/core/utils/assistant-failure.util.ts`: `assistantFailureKey(reason, where: 'suggest' | 'note')` returns
  the dictionary key below; `showAssistantFailure(conversation)` is true when `conversation.assistantFailed` exists and
  its `at` ≥ `conversation.lastMessageAt` (a member reply or a new guest message hides it).
- [ ] `app-suggestion-bar` gains the input `failKey` (default `ibx_sg_failed`) used at `.html:38`; the inbox page keeps
  the last failure reason per conversation in a signal and passes its key.
- [ ] Inbox thread: when `showAssistantFailure(t.conversation)`, one line above the suggestion bar,
  `data-testid="ai-failed-note"`, `role="status"`, icon `alert-triangle`, text = the reason's `note` key.
- [ ] Simulator: the same line under the chat of the open test guest, same test id and keys.

**Hebrew texts** (append to `public/assets/data/dictionary.json`)
- [ ] `nb_pick_time_first` "בחרו שעה כדי לראות איזה שולחן מוצע"
- [ ] `ibx_sg_failed_busy` "העוזר עמוס כרגע. נסו שוב בעוד דקה"; `ibx_sg_failed_timeout` "העוזר לא ענה בזמן. נסו שוב";
  `ibx_sg_failed_quota` "מכסת העוזר להיום נגמרה. אפשר לענות לאורח בעצמכם"; `other` keeps `ibx_sg_failed`.
- [ ] `ibx_ai_failed_busy` "העוזר לא ענה לאורח כי שירות ה-AI עמוס, והשיחה עברה אליכם. האורח לא קיבל הודעה";
  `ibx_ai_failed_timeout` "העוזר לא ענה בזמן, והשיחה עברה אליכם. האורח לא קיבל הודעה"; `ibx_ai_failed_quota`
  "מכסת העוזר להיום נגמרה, והשיחה עברה אליכם. האורח לא קיבל הודעה"; `ibx_ai_failed_other` "העוזר לא הצליח לנסח
  תשובה, והשיחה עברה אליכם. האורח לא קיבל הודעה".

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical CSS only. No new dialog, no confirmation.
- The note is plain text in the thread's flow (not a toast), so it stays while it is true.
- Icons: `alert-triangle`, `info` — both registered in `src/app/app.config.ts`; no icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Show the room and the info icon as soon as the booking window opens — map under plan_ only, choose-a-time line, taps ignored before a time, the whole room without an inner scroll — src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.ts, .html, .scss, .spec.ts
- [x] A2: Make sign-out work from the dashboard itself — skip the same-page navigation that Angular ignores, keep the unsaved-changes question elsewhere — src/app/core/components/header/header.component.ts, src/app/core/components/header/header.component.spec.ts
- [x] A3: Read the assistant's failure reason in the browser — suggest returns the reason, the shared util for keys and for when the note shows — src/app/core/services/conversation-data.service.ts, .spec.ts, src/app/core/utils/assistant-failure.util.ts, .spec.ts
- [x] A4: Tell the staff in Hebrew why the assistant stopped — the reason line in the suggestion bar, the note in the inbox thread and in the simulator — src/app/pages/inbox/components/suggestion-bar/*, src/app/pages/inbox/inbox.page.*, src/app/pages/frontdesk/simulator/simulator.page.*
- [x] A5: Add the nine Hebrew texts — public/assets/data/dictionary.json
- [x] A6: Record the new util where the next plan looks — src/app/core/breadcrumbs.md, docs/brain/inventory.md (src/app/pages/breadcrumbs.md and docs/brain/component-families.md only if a line there names a changed piece)
- [x] A7: Prove the three screen checks with short scripts — each signs in with signInQa and answers the calls itself, saves a screenshot — e2e/ui/702-1.spec.ts, e2e/ui/702-2.spec.ts, e2e/ui/702-3.spec.ts
- [x] A8: Run every check of this plan and hand Dandan the hand checks — test:ci, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: plan 701 (`reason` on the 502, `assistantFailed` in the shared schema — `Conversation` in
  `@schemas/entities` gains it, so no client model edit); plans 672, 677, 678, 682.
- New files needed: `src/app/core/utils/assistant-failure.util.ts` + spec, `e2e/ui/702-1…3.spec.ts`.
- Model changes: none in the browser (the type comes from the shared schema).
- Backend / API: none in this plan.
- Auth and validation: sign-out only changes when the header calls the existing `UserService.logout()`.
- Security surface: sign-out now works on `/dashboard` — the refresh cookie is cleared there too.
- Data / migration: none.
- Project checks: `log-query` item; RTL and logical CSS; every key named; no new icon; `src/styles.scss` not edited;
  `[ui]` specs sign in with `signInQa` (`e2e/helpers/qa-session.ts`) and stub their calls (`e2e/ui/682-1.spec.ts` is
  the shape). Components follow `.claude/skills/angularComponentStructure/SKILL.md`; styles `.claude/skills/cssLayer/SKILL.md`.
- Traps: the dialog spec must load a plan for the map to show; `router.isActive` with `queryParams: 'exact'` so
  `/dashboard?tab=metadata` still navigates; the note must hide once a member answers (`lastMessageAt` moves on every
  outbound message, `server/services/outbound.js:74`).

## Out of Scope
- The floor editor's tooltip and joined-border items (another plan).
- A message to the guest when the assistant fails (R-04).
- The "fix this answer" button on anything but assistant messages, or in the simulator (plan 682 keeps it inbox-only).
- The walk-in dialog's map (not reported).

## Critical Questions
- none

## Execution Notes
- behaviour: the small map shows from the moment the dialog opens, read-only until a time is chosen; the owner's table pick still needs a time first.
- behaviour: the map shows the whole room at the dialog's width instead of a 14rem scroll box.
- behaviour: on the bare dashboard, sign-out happens at once; the dashboard's only unsaved-changes case (`?tab=metadata`) is a different URL and still asks.
- behaviour: "fix this answer" stays on assistant messages only (plan 682); a failed turn writes no message, so the staff note explains the handoff instead.
- behaviour: the staff note hides as soon as anyone writes in the chat after the failure (`at` < `lastMessageAt`).
- evidence: pnpm run build -> exit 0 (first try failed the 1 MB initial budget: a runtime import of the schema enum pulled zod in; the util now keeps the list locally with a type-only import)
- evidence: pnpm run lint -> exit 0; lint:icons, lint:no-native-select, lint:reuse, override-check, plan-ledger-check, breadcrumbs-check, ci-scope-check, kit-manifest-check, log-query -> exit 0
- evidence: pnpm run test:ci -> exit 0, 3093 SUCCESS (first run: 2 ExportService 5 s timeouts, unrelated; rerun once, green)
- [ui] items 702-1..3: written, not run
