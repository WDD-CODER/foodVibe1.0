# Plan 689 — The assistant's guardrails: blocked replies and the rules that hand a conversation to a person

Status: draft
Depends-on: 679
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Plan 679 lets the assistant answer. A model can still say what it must not: "I'll check and get back to you",
"your table is booked", a link it made up, a price that is in no fact, its own instructions. And some
conversations must not stay with a machine at all: a complaint, an allergy emergency, a guest going in circles, a
message at an hour the owner switched the assistant off. This plan adds the server-side second line: every answer
of the model passes one pure function before anything is sent or stored, and a failed check hands the conversation
to a person with the business's handoff sentence. It is the second half of map row R17 (split from plan 679).

Verified on `origin/main` (28359b6d, 2026-11-22):
- `docs/frontdesk/assistant-behaviour-rules.md`: R-05 (no deferred promises), R-06 (no completion claim without the
  write), R-07 (no invented links), R-08 (three sources), R-18 (a greeting is not a request), R-20 (internals stay
  internal); "Do not build: regex checks as the only safety net — the structured output is validated first; R-05 to
  R-07 are a tested second line."
- `docs/frontdesk/frontdesk-program-brief.md` FD-07, Guardrails: hand off on `handoff`, on 2 consecutive
  low-content turns, after 8 AI turns in one conversation, on a complaint / refund / allergy-emergency keyword
  list, and outside `assistant.activeHours` if set; a reply that states a time, a price or "confirmed" not present
  in `usedFacts` is blocked and turned into a handoff.
- `shared/schemas/entities/front-desk-profile.schema.ts:65–71`: `assistant.activeHours?` is an array of
  `operatingHoursRowSchema`, the shape `hoursCheck(hours, date, time)` reads
  (`shared/schemas/front-desk/qualify.ts:61`).
- `server/services/knowledge.js:46`: `publicFacts` returns `{ text, factIds }`; a fact line starts with its id in
  square brackets.
- No keyword list, and none of the checks below, exists in `server/`.

From plan 679 (not on `main` yet; use the merged names if they differ): `server/services/frontdesk-guardrails.js`
with the pure `applyGuardrails(answer, ctx)` → `{ ok: true, answer } | { ok: false, reason }` and `ctx =
{ profile, factIds, factsText, history, aiTurns, now, mode }`; `runTurn` calls it once per turn and hands off on
`ok: false`; `handOff` sends `profile.assistant.handoffText` or the dictionary sentence `fd_ai_handoff_default` at
level 1 and stores it as the suggestion at level 0; `server/test/frontdesk-turn.test.js` fakes the model with a
stubbed `fetch`.

## Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-AI (R17; used by R18, R19, R20)** — FD-07's contract as written in `docs/frontdesk/frontdesk-program-brief.md`
(the answer schema, levels, "the server writes, the model proposes"), with:
- `server/services/frontdesk-turn.js` → `runTurn(db, conversation, { log })` called by `handleInbound` and by the
  inbox's "suggest" button; one `callGemini` per turn with `usage.feature: 'frontdesk_turn'` (or
  `'frontdesk_suggest'`); level 0 stores `suggestion` on the conversation, level 1 sends through `sendOut`.
- The simulator is the test chat of R-15: a `test: true` conversation runs the real handler and is metered like
  any turn, but is left out of the business's daily turn cap.

What this plan fixes inside the Contract (lines for the map's "Contract extensions (run)"):
1. The checks run in this order and the first that fails decides: before the model call — keywords, active hours,
   the eight-turn limit; after it — the model's flag, low content twice, R-18, then the reply checks R-20, R-07,
   R-05, R-06, the unsupported price.
2. The three checks that need no model answer run **before** the call (`preCheck`), so a complaint costs no model
   call.
3. A blocked reply is never rewritten or retried: it becomes a handoff (one model call a turn).
4. In `mode: 'suggest'` (a member asked for a draft) the pre-call checks and the turn counters are skipped; the
   reply checks still run, and a blocked draft answers 200 with the handoff sentence as the suggestion.

## Goals & Success Criteria
**Primary:** no text the rules forbid leaves the server, and a conversation that needs a person reaches one, each
case proven by a test with the model faked.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/frontdesk-guardrails.test.js` and the
  added cases of `server/test/frontdesk-turn.test.js`.
- [auto] `server/test/frontdesk-guardrails.test.js` (`preCheck`): a last guest message containing "תלונה", "החזר
  כספי", "הרעלה" or "אלרגיה חמורה" → `{ ok: false, reason: 'keyword' }`; "יש לכם מנות ללא גלוטן?" passes;
  `activeHours` of 09:00–17:00 with the clock at 20:00 Jerusalem → `outside_hours`, at 10:00 passes, and no
  `activeHours` passes at any hour; `aiTurns: 8` → `turn_limit`, `7` passes.
- [auto] same file (R-05): replies "אבדוק ואחזור אליך", "אני אברר ואעדכן", "נחזור אליך עם תשובה" → `deferred`;
  "אפשר לחזור אלינו בטלפון" passes.
- [auto] same file (R-06): replies containing "הוזמן", "ההזמנה אושרה", "שריינתי לכם", "confirmed" or "booked" →
  `completion_claim`; a reply quoting a fact that contains the word (a fact line in `factsText` with the same
  sentence, its id in `usedFacts`) is still blocked — the assistant never states a completion.
- [auto] same file (R-07): a reply with `https://example.com/menu` when `factsText` has no such string →
  `invented_link`; the same URL present verbatim in `factsText` passes; a bare `www.` address is treated the same.
- [auto] same file (price): a reply with "₪120" or "120 ש״ח" when no fact named in `usedFacts` contains `120` →
  `unsupported_price`; with a used fact that contains `120` it passes.
- [auto] same file (R-20): replies containing `questionKey`, `party_size`, `usedFacts`, `systemInstruction`, or
  "ההנחיות שלי" → `internals`.
- [auto] same file (R-18): `intent: 'request'` when every guest message of the window is a greeting ("היי",
  "שלום", "בוקר טוב", "hello") → the answer comes back `ok: true` with `intent: 'smalltalk'` and an empty
  `collected`; with one substantive guest message it is unchanged.
- [auto] same file (low content): two turns in a row whose answer has `intent: 'other'`, an empty `collected` and
  no `usedFacts` (the previous one read from `ctx.lastTurnLow`) → `low_content`; one such turn passes.
- [auto] same file (order): an answer that breaks R-20 and R-06 at once answers `internals`.
- [auto] `server/test/frontdesk-turn.test.js` (added): a guest message "יש לי תלונה" → no `fetch` call, `status:
  'human'`, one outbound row whose text is the profile's `handoffText`; a model reply "אבדוק ואחזור אליך" at
  level 1 → that text is not in `messages`, the handoff sentence is, `status: 'human'`; the same at level 0 →
  `suggestion` is the handoff sentence and `status` stays `bot`; `POST /api/v1/ai/frontdesk/suggest` with a blocked
  reply → 200 with the handoff sentence.
- [auto] same file (logs): a blocked turn logs `frontdesk.turn.blocked` with `reason` only — no reply text.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan writes a complaint in the simulator (plan 678) and sees the conversation move to "אצל הצוות" with
  his handoff sentence.

## Execution Mode
- Parallel: no — second plan of run `rs-ai`, after 679 and before 680 (all three edit the turn handler's files).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/frontdesk-guardrails.js
server/services/frontdesk-turn.js
server/constants/frontdesk-guard-words.js
server/test/frontdesk-guardrails.test.js
server/test/frontdesk-turn.test.js
server/test/ai-frontdesk-suggest.test.js
shared/schemas/entities/conversation.schema.ts
public/assets/data/dictionary.json
server/breadcrumbs.md
docs/restaurant/restaurant-map.md
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

- INV-2: preserves — `server/services/frontdesk-guardrails.js` is pure (no database); the one new write in `frontdesk-turn.js` sets a flag on the conversation the turn already holds, by its `_id` and `businessId`.
- INV-4: preserves — the one new stored field, `conversation.lowTurns`, is added to the conversation's own Zod schema file (a later plan may edit its own schema file, C-REGISTRY-R); it is optional, so stored conversations stay valid.
- INV-6: preserves — no model call is added; three checks now run before the existing call and can only prevent it.
- INV-7: preserves — the checks only block text; R-06 is enforced here for every reply, and no table is offered or written.

## Reuse Check

- `preCheck`, the reply checks inside `applyGuardrails` (`server/services/frontdesk-guardrails.js`) — family: none — rung: 4 — why: the file is plan 679's seam for exactly these checks; no shared piece judges an assistant reply
- `GUARD_WORDS` (`server/constants/frontdesk-guard-words.js`) — family: none — rung: 4 — why: the word lists are data the checks read; kept apart so a list changes without touching the logic

## Defaults

- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the word lists are data, not a list on a page
- empty-state-on-list — exception — why: server only; the plan builds no list
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS
- unit-dropdown-add — exception — why: server only; the plan builds no dropdown

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner, I want a complaint or an allergy scare to reach a person at once, so that a machine never argues
  with an upset guest.
- As the owner, I want the assistant never to tell a guest something is booked, promise to call back, or invent a
  link or a price, so that I am not held to something nobody decided.
- As a guest, I want to be passed to a person when the assistant does not understand me twice.

## Functional Requirements

### Must Have (P0)
- [ ] **The removal request (R-02's assistant part; added by the Planner, 2026-11-22).** A fourth list in
  `server/constants/frontdesk-guard-words.js`, `REMOVAL_WORDS` (whole-phrase matches such as "הסירו אותי", "תסירו
  אותי", "אל תכתבו לי", "להסיר אותי", "stop"; "לא עכשיו" and "תחזרו אליי" are not in it — R-02 says "not now" is
  not a removal). It is checked first in `preCheck`, before the other keyword lists and with no model call. On a
  match the turn, in this order: sends the fixed sentence `fd_ai_removed` through `sendOut` (author `server`); sets
  the conversation's client `doNotContact: { at: now, reason: 'guest asked in chat', via: 'guest' }` with one
  `updateOne` scoped by `businessId` and `_id` (the shape of `client.schema.ts:82`; `server/routes/clients.js:140`
  is the member's write of the same field); moves the conversation to `human`. The placeholder clients
  `__test__` and `__walk_in__` are never written. In `suggest` mode nothing is sent or written: the answer is
  `{ handoff: 'removal' }`. Dictionary key `fd_ai_removed`: "הסרנו אותך מרשימת ההודעות. לא נכתוב לך שוב." (added
  to `public/assets/data/dictionary.json`, which joins the scope). Tests in
  `server/test/frontdesk-guardrails.test.js`: a removal phrase sets the flag, sends exactly one message and makes no
  model call; a second inbound from the same guest gets no outbound row (675's `sendOut` guard); "לא עכשיו" sets
  nothing; logs carry no text and no phone.
- [ ] **Word lists — `server/constants/frontdesk-guard-words.js`.** Frozen arrays of lower-case fragments, matched
  as substrings of the text after lower-casing and removing Hebrew vowel points:
  `HANDOFF` — complaint: "תלונה", "להתלונן", "מתלונן", "שירות גרוע", "מנהל", "complaint"; refund: "החזר כספי",
  "זיכוי", "refund"; allergy emergency: "הרעלה", "הרעלת מזון", "אלרגיה חמורה", "תגובה אלרגית", "אפיפן",
  "בית חולים", "אמבולנס".
  `DEFERRED` (R-05): "אבדוק ואחזור", "אברר ואחזור", "אברר ואעדכן", "אבדוק ואעדכן", "נחזור אליך עם", "אחזור אליך",
  "i'll check", "get back to you".
  `COMPLETION` (R-06): "הוזמן", "הזמנתי לכם", "ההזמנה אושרה", "השולחן אושר", "שריינתי", "שוריין", "אישרתי",
  "עודכן בהצלחה", "בוטל בהצלחה", "confirmed", "booked", "reserved for you".
  `INTERNALS` (R-20): "questionkey", "party_size", "usedfacts", "systeminstruction", "system prompt",
  "ההנחיות שלי", "הפרומפט".
  `GREETINGS` (R-18): "היי", "הי", "שלום", "בוקר טוב", "ערב טוב", "צהריים טובים", "מה נשמע", "אהלן", "hello",
  "hi", "hey".
- [ ] **`preCheck(ctx)`** (exported, pure) → `{ ok: true } | { ok: false, reason }`, in this order: the last guest
  message of `ctx.history` contains a `HANDOFF` fragment → `keyword`; `profile.assistant.activeHours` has rows and
  `hoursCheck(activeHours, date, time)` of `ctx.now` in Jerusalem is not ok → `outside_hours`; `ctx.aiTurns >= 8`
  → `turn_limit`. Skipped entirely when `ctx.mode === 'suggest'`.
- [ ] **`applyGuardrails(answer, ctx)`** keeps plan 679's two checks and adds, in this order:
  1. the model's `handoff` → `model` (679);
  2. low content: the answer has `intent: 'other'`, no `collected` key and no `usedFacts`, and `ctx.lastTurnLow` is
     true → `low_content`; a first such answer passes and is returned with `low: true`;
  3. R-18: `intent: 'request'` while every guest message in `ctx.history` is, after trimming punctuation, one of
     `GREETINGS` → the answer is returned with `intent: 'smalltalk'`, `kind` removed and `collected: {}`;
  4. R-20: the reply contains an `INTERNALS` fragment → `internals`;
  5. R-07: every `https?://…` or `www.…` run in the reply must appear verbatim in `ctx.factsText` or equal the
     profile's public link, else `invented_link`;
  6. R-05: a `DEFERRED` fragment → `deferred`;
  7. R-06: a `COMPLETION` fragment → `completion_claim`, whatever the facts say;
  8. price: every number that stands beside "₪", "ש״ח", "שח", "שקל" or "NIS" in the reply must appear in a fact
     line whose id is in `usedFacts`, else `unsupported_price`;
  9. unknown `usedFacts` ids are removed (679).
  The reply checks 4–8 look only at `answer.reply`; they are skipped when `decide` will not send the model's reply
  (a complete request answers with a dictionary sentence) — the caller passes `ctx.replyWillBeSent`.
  FD-07's "a time not present in `usedFacts`" is not built here: asking "at what time?" is a legitimate reply
  until plan 680 takes table talk away from the model and blocks every time in a reply.
- [ ] **`runTurn` wiring (`server/services/frontdesk-turn.js`).** Before step 4 of plan 679's order: `preCheck`; a
  failure → `handOff` (not silent: the guest gets the handoff sentence at level 1), log `frontdesk.turn.blocked`
  with `reason`, no model call. After the model call: `applyGuardrails` with `lastTurnLow =
  conversation.lowTurns === 1` and `replyWillBeSent`; a failure → `handOff` and the same log line. After a turn
  that passed: `$set: { lowTurns: 1 }` when the answer came back `low: true`, else `$unset: { lowTurns: '' }`.
  In `mode: 'suggest'` nothing is written to `lowTurns`, `preCheck` is skipped, and a blocked reply returns
  `{ ok: true, suggestion: <the handoff sentence> }` without changing `status`.
- [ ] **`conversation.lowTurns`**: `z.literal(1).optional()` in `shared/schemas/entities/conversation.schema.ts`.
- [ ] Logs: `frontdesk.turn.blocked` (`reason`, `stage: 'pre' | 'post'`, `level`) — never the reply or the guest's
  text.

### Should Have (P1)
- [ ] `server/breadcrumbs.md` lists the constants file; `docs/restaurant/restaurant-map.md` gets the four lines of
  "What this plan fixes" under "Contract extensions (run)".

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built and no dictionary key is added: the only sentence a guest sees from this plan is the handoff
  sentence plan 679 already sends.

## Atomic Sub-tasks

- [x] A1: Keep the word lists as data so a list can change without touching the checks — the five frozen lists with their Hebrew and English fragments — server/constants/frontdesk-guard-words.js
- [x] A2: Stop a conversation that needs a person before any model call is made — preCheck with the keyword, active hours and eight turns rules, and its tests — server/services/frontdesk-guardrails.js, server/test/frontdesk-guardrails.test.js
- [x] A6: Let a guest stop all messages with one sentence — the removal phrase list, the one fixed answer, the do-not-contact flag, the handoff, and their tests — server/constants/frontdesk-guard-words.js, server/services/frontdesk-guardrails.js, server/services/frontdesk-turn.js, public/assets/data/dictionary.json, server/test/frontdesk-guardrails.test.js
- [x] A3: Block every reply the rules forbid — the ordered checks for internals, invented links, deferred promises, completion claims, unsupported prices, the greeting rule and low content, each with its test — server/services/frontdesk-guardrails.js, server/test/frontdesk-guardrails.test.js
- [x] A4: Wire the checks into the turn and remember one empty turn — the two calls, the handoff with its sentence, the low-turn flag on the conversation, the suggest mode rules, the blocked log line — server/services/frontdesk-turn.js, shared/schemas/entities/conversation.schema.ts
- [x] A5: Prove the whole path with the model faked and record the Contract lines — the added turn and suggest cases, the folder map, the map's extension lines; run every check and paste the evidence — server/test/frontdesk-turn.test.js, server/test/ai-frontdesk-suggest.test.js, server/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: plan 679's `applyGuardrails` seam, `runTurn`, `handOff`; `hoursCheck` and the Jerusalem helpers.
- New files needed: `server/constants/frontdesk-guard-words.js`, `server/test/frontdesk-guardrails.test.js`.
- Model changes: optional `lowTurns` on a conversation.
- Backend / API: none new; the suggest route can now answer with the handoff sentence.
- Auth and validation: none new.
- Security surface: smaller — replies are filtered and prompt-leak attempts are blocked (R-20). The word lists are
  a second line, not the only one: the structured answer (`handoff`, `usedFacts`, `collected`) is checked first.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; no dictionary key, no icon; `server/breadcrumbs.md` in scope.

## Out of Scope
- Blocking a time or a table number in a reply, and the `book` intent (plan 680).
- A list the owner can edit, per-business words, sentiment detection by the model.
- A removal request understood by the model from free wording: this plan matches fixed phrases only.
- The eval set that measures false blocks (plan 681).

## Critical Questions
- none

## Execution Notes
- behaviour: a blocked reply is never retried or rewritten; the conversation goes to a person with the handoff sentence.
- behaviour: a completion word is blocked even when a fact contains it.
- behaviour: a member's "suggest a reply" skips the pre-call rules and gets the handoff sentence as the draft when the reply is blocked.
- behaviour: the keyword lists are fixed in code; a removal request is matched by fixed phrases before any model call, answered once, and sets do-not-contact.
- evidence: build → 0; lint → 0; test:ci → 0 (3078 SUCCESS); vitest frontdesk-guardrails + frontdesk-turn + ai-frontdesk-suggest → 72 passed.
- behaviour: a removal request answers through sendOut at every level (also level 0), as the plan words it — reverse: skip the send in removeGuest at level 0.
- behaviour: a blocked turn at level 0 stores the handoff sentence as the suggestion and leaves the status bot (the Done-when line); at level 1 the status becomes human.
