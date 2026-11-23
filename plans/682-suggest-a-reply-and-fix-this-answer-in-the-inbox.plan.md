# Plan 682 — The inbox asks the assistant: "suggest a reply" for a member, and "fix this answer" that drafts a knowledge item

Status: draft
Depends-on: 679, 677
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After plan 677 a member answers guests from the inbox, and after plan 679 the assistant can write a reply. The two
do not meet on the screen yet. A member who holds a conversation types every answer from nothing, although the
server can already draft one (`POST /api/v1/ai/frontdesk/suggest`, plan 679) and — when the assistant level is 0 —
already stores a draft on the conversation after every guest message. And when the assistant answered a guest
wrongly, nobody can tell it: the mistake repeats until someone opens the knowledge page and guesses what was
missing (rule R-14 of `docs/frontdesk/assistant-behaviour-rules.md`).

This plan adds two things to the inbox thread. **Suggest a reply:** the stored draft is shown above the reply box,
and a button asks for a fresh one; the member sends it as it is, edits it first, or dismisses it. **Fix this
answer:** on a message the assistant wrote, a member types the right answer and picks what was wrong; the server
asks the model once to turn that into a knowledge item (question, answer, up to five phrasings, topic) and stores
it as a draft that the owner approves on the knowledge page, as every other draft.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `docs/frontdesk/assistant-behaviour-rules.md:28` (R-14): "A member marks a wrong assistant message, types the
  right answer and an issue type (`wrong_info | missing_info | outdated | misunderstood | other`); the AI drafts a
  knowledge item (question, answer, up to 5 phrasings, topic) that the owner approves."
- `shared/schemas/entities/knowledge-item.schema.ts`: `KNOWLEDGE_TOPICS` (nine, line 5), `KNOWLEDGE_STATUSES =
  ['draft', 'approved']`, `KNOWLEDGE_SOURCES = ['manual', 'ai_import', 'correction']` (line 7), `question` 1–200
  characters (line 12), `answer` 1–1200 (line 13), `variations` at most five of 1–200 (line 14);
  `knowledgeImportItemSchema` (lines 34–39) is exactly "what the model may set": `topic, question, answer,
  variations`. Nothing writes `source: 'correction'` today.
- `knowledgeItems` is in `OWNER_ONLY_TYPES` (`server/utils/permissions.js:25`): staff cannot create one through the
  generic API. `server/routes/knowledge.js` (39 lines) has one route, `PUT /approve` (owner).
- `src/app/pages/frontdesk/knowledge/knowledge.page.html:98–112`: a draft item shows an amber tag and, for the
  owner, its approve action; the page already lists drafts of any source.
- `server/constants/ai-features.js:15`: the key `knowledge_correction` exists and nothing uses it.
- `server/services/knowledge-import-prompt.js` (23 lines) is the pattern of a prompt file with its generation
  config; `server/test/knowledge-import.test.js:24–25` fakes the model with `vi.stubGlobal('fetch', …)`.
- `src/app/app.config.ts:52` registers the Lucide icon `Sparkles`; `flag` is not registered (verify at build time
  and register it in this plan).
- Not on `main` yet, created by earlier plans (read them; use their names if they differ):
  - 662: `conversation.suggestion` (string ≤ 4000), server-only `conversations` and `messages`, the action
    `manageConversations` (any member).
  - 675 / 687: `server/services/outbound.js` `sendOut`, the member routes of `server/routes/conversations.js`
    (`POST /:id/messages` for a member's reply).
  - 677: `src/app/pages/inbox/**` (the thread, the reply box, take over and hand back), `app-chat-thread`
    (`src/app/shared/chat-thread/`, read-only, inputs `messages`, `perspective`, `buttonsEnabled`; output
    `buttonTapped`), `ConversationDataService` (`src/app/core/services/conversation-data.service.ts`).
  - 679: `server/routes/ai/frontdesk.js` with `askTurnModel` and `POST /api/v1/ai/frontdesk/suggest
    { conversationId }` → 200 `{ suggestion }`, 502 `AI_FAILED`, 503 with no key; limiter 30 / 15 minutes per
    business; `runTurn(db, conversation, { mode: 'suggest' })` stores the text on the conversation and sends nothing.

## Goals & Success Criteria
**Primary:** a member in the inbox can get a drafted reply and send or edit it, and can turn a wrong assistant
answer into a draft knowledge item for the owner, with one model call each and nothing sent to the guest by itself.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/ai-frontdesk-fix.test.js`.
- [auto] `server/test/ai-frontdesk-fix.test.js` (the model is a stubbed `fetch`): `POST /api/v1/ai/frontdesk/fix
  { conversationId, messageId, answer, issue: 'wrong_info' }` by a staff member answers 200 `{ item }`; one
  `knowledgeItems` row exists with `status: 'draft'`, `source: 'correction'`, `visibility: 'public'`, the model's
  `topic`, `question`, `answer` and `variations`, `createdBy` the member's id; one ledger row has
  `feature: 'knowledge_correction'`; no `messages` row was added and the conversation is unchanged.
- [auto] same file: when the model call fails or its answer is not valid, the route still answers 200 and stores a
  draft with `topic: 'faq'`, `question` = the guest message before the marked one cut to 200 characters (or the
  first 200 characters of the typed answer when there is none), `answer` = the typed answer, no `variations`; the
  answer has `drafted: false`.
- [auto] same file: a `messageId` whose `author` is not `ai`, a message of another conversation, a conversation of
  another business, `issue: 'x'`, an empty `answer` and an `answer` of 1201 characters answer 400 or 404 and store
  nothing; a business without `frontdesk` gets 403 `MODULE_OFF`; an eleventh call inside 15 minutes by one
  business gets 429.
- [auto] same file ("logs"): the captured log lines of a successful fix hold the `issue`, the ids and lengths only —
  no part of the typed answer, of the guest's text or of a phone.
- [auto] same file: a `test: true` conversation (the simulator) drafts the item the same way (the owner is testing
  his own knowledge), and the item carries no `test` field.
- [auto] `pnpm run test:ci` → exit 0, including the specs of the new `suggestion-bar` and `fix-answer-dialog`
  components and the updated inbox page and conversation service specs named in the scope.
- [ui] `/inbox/<id>` (the API answered by the spec: one conversation in status `human` with `suggestion: 'שלום,
  אנחנו פתוחים עד 23:00'`) · press "עריכה" on the suggestion, add "!" in the reply box, press send · the request the
  spec recorded for `POST …/messages` carries the text "שלום, אנחנו פתוחים עד 23:00!" and the suggestion bar is
  gone — `e2e/ui/682-1.spec.ts`, screenshot `screens/682-1.png`.
- [ui] same stub, no stored suggestion, the suggest call answered with `{ suggestion: 'נשמח לראותכם' }` · press
  "הצע תשובה" · the bar shows "נשמח לראותכם" — `e2e/ui/682-2.spec.ts`, screenshot `screens/682-2.png`.
- [ui] same stub with one message whose author is the assistant · press "תיקון התשובה" under it, type "אין חניה
  במקום", pick "מידע שגוי", press "שמירה" · the message "נשמרה טיוטה למידע על העסק" is shown and the dialog is closed —
  `e2e/ui/682-3.spec.ts`, screenshot `screens/682-3.png`.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm --dir server run lint` → exit 0.
  `pnpm run lint:icons` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan opens a simulator conversation in the inbox on his phone, presses "הצע תשובה", edits the text and
  sends it; then marks an assistant answer as wrong and finds the draft on the knowledge page.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
  (default `loading-and-error-states`; here: the suggest call failing shows "לא הצלחנו להציע תשובה" with "נסה שוב"
  in the bar, and the inbox itself keeps working)
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
  (default `hints-in-tooltips`; here: the issue-type choice of the fix dialog)

## Execution Mode
- Parallel: no — last plan of run `rs-ai` (679, 680, 681, 682). It is a screen plan: it appends to
  `public/assets/data/dictionary.json` and `src/app/app.config.ts`, and edits the inbox of plan 677.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai/frontdesk.js
server/services/knowledge-correction-prompt.js
server/test/ai-frontdesk-fix.test.js
server/breadcrumbs.md
src/app/pages/inbox/**
src/app/pages/inbox/inbox.page.spec.ts
src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.spec.ts
src/app/pages/inbox/components/fix-answer-dialog/fix-answer-dialog.component.spec.ts
src/app/shared/chat-thread/**
src/app/shared/chat-thread/chat-thread.component.spec.ts
src/app/core/services/conversation-data.service.ts
src/app/core/services/conversation-data.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/app.config.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/682-1.spec.ts
e2e/ui/682-2.spec.ts
e2e/ui/682-3.spec.ts
screens/682-*.png
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

- INV-1: preserves — the fix route is a member route (`verifyToken`, `manageConversations`, the business from the token through `scopeFilter`); it writes one `knowledgeItems` draft stamped with the member's id. Staff still cannot create or approve a knowledge item through the generic API (`OWNER_ONLY_TYPES` is untouched): a draft reaches no guest until the owner approves it. `conversation-data.service.ts` stays a plain client of server routes that authorise every call.
- INV-2: preserves — `server/services/knowledge-correction-prompt.js` only builds a prompt body and reads no data; the fix route reads the conversation, the message and writes the draft item through the token's business (`scopeFilter`), and `knowledgeItems` stays non-cloneable.
- INV-6: preserves — both model calls live in the AI sub-router `server/routes/ai/frontdesk.js` and go through `callGemini` with a closed-list feature key (`frontdesk_suggest`, `knowledge_correction`); the browser calls the server and holds no key.
- INV-7: preserves — a suggested reply is text a member chooses to send; it books, moves and confirms nothing. The server's block on a reply that names a time or "confirmed" (R-06, plan 680) applies to what the assistant sends by itself; a member's own message is the member's word.

## Reuse Check

- `SuggestionBarComponent` (`app-suggestion-bar`, `src/app/pages/inbox/components/suggestion-bar/`) — family: none — rung: 4 — why: no piece shows a drafted text with send, edit and dismiss; page-local to the inbox, built from `c-btn-ghost`, `c-btn-primary` and `app-loader`
- `FixAnswerDialogComponent` (`app-fix-answer-dialog`, `src/app/pages/inbox/components/fix-answer-dialog/`) — family: modal-shell — rung: 1 — why: its frame is `app-modal-shell`; page-local content
- the issue-type choice in the dialog — family: form-field — rung: 1 — why: `app-custom-select` inside `app-form-field`, five fixed options, no add row
- the answer text area in the dialog — family: form-field — rung: 1 — why: the app's input engine inside `app-form-field`
- `ConversationDataService.suggest` and `.fixAnswer` — family: http — rung: 2 — why: two methods on the existing client of plan 677
- the "fix this answer" action under a message — family: none — rung: 4 — why: `app-chat-thread` (plan 677) gains one optional input and one output; no new component
- `knowledge-correction-prompt.js` — family: none — rung: 4 — why: a prompt file in the pattern of `server/services/knowledge-import-prompt.js`

## Defaults

- app-list-container — exception — why: the plan adds no list; the inbox list of plan 677 is unchanged
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- anchored-popup — exception — why: the plan adds no floating box; the explanation of the issue choice is the native title tooltip
- empty-state-on-list — exception — why: the plan adds no list
- loading-and-error-states — applies — how: the shared loading and error pieces
- hints-in-tooltips — applies — how: native [attr.title] plus [attr.aria-label] or aria-describedby on the control, as the history button of platform-business-dialog does (plan 638); no new tooltip piece

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host who answers guests between two tables, I want a ready reply I can send with one tap or fix in a few
  words, so that a guest does not wait while I type.
- As the owner, I want my staff to be able to say "the assistant got this wrong, the right answer is …", so that
  the next guest who asks gets the right answer after I approve it.

## Functional Requirements

### Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-AI (R17; used by R18, R19, R20)** — FD-07's contract as written in `docs/frontdesk/frontdesk-program-brief.md`
(the answer schema, levels, "the server writes, the model proposes"), with:
- `server/services/frontdesk-turn.js` → `runTurn(db, conversation, { log })` called by `handleInbound` and by the
  inbox's "suggest" button; one `callGemini` per turn with `usage.feature: 'frontdesk_turn'` (or
  `'frontdesk_suggest'`); level 0 stores `suggestion` on the conversation, level 1 sends through `sendOut`.
- The simulator is the test chat of R-15: a `test: true` conversation runs the real handler and is metered like
  any turn, but is left out of the business's daily turn cap.

### Must Have (P0)

**Server — the fix route, in `server/routes/ai/frontdesk.js`** (the sub-router of plan 679; nothing else in it changes)
- [ ] `POST /fix` `{ conversationId, messageId, answer, issue }` — `verifyToken`, `requireModule('frontdesk')`, a
  limiter of 10 calls / 15 minutes keyed by `businessId` (`createRateLimiter`, the pattern of the suggest route),
  `assertCan(req, res, 'manageConversations')`. Validation (400 `Validation failed`): `answer` a trimmed string of
  1–1200 characters, `issue` one of `wrong_info | missing_info | outdated | misunderstood | other`, both ids
  non-empty strings.
- [ ] The conversation is read with `scopeFilter(req)` (404 `NOT_FOUND`); the message with `{ _id: messageId,
  businessId, conversationId }` (404 `NOT_FOUND`); a message whose `author` is not `ai` answers 400 `NOT_AI_MESSAGE`.
- [ ] One model call through `callGemini` with `usage: { businessId, userId, feature: 'knowledge_correction' }`,
  `timeoutMs: 20000`, `eventPrefix: 'frontdesk.fix'`. The body is built by `buildCorrectionBody` of the new
  `server/services/knowledge-correction-prompt.js`: the system part is English, written from scratch — "turn a
  correction by a staff member into one knowledge item: a short question a guest would ask, the corrected answer
  in the business's words, up to five other phrasings of the question, and one topic of the closed list; answer in
  the language of the correction; never invent a fact that is not in the correction; JSON only" — with the nine
  topic keys listed; the `user` part holds, as data only: the guest's last message before the marked one (when
  there is one), the assistant's wrong message, the typed answer and the issue type. Guest text never enters the
  system part.
- [ ] The model's answer is accepted when it parses and passes `knowledgeImportItemSchema`. Then the item is
  inserted: `{ _id, schemaVersion: 2, businessId, createdBy: <member id>, createdAt, updatedAt, topic, question,
  answer, variations?, status: 'draft', source: 'correction', visibility: 'public' }`, checked with
  `checkStoredDoc('knowledgeItems', doc)`. Answer 200 `{ item, drafted: true }`.
- [ ] When the call fails, no key is configured, or the answer is not valid: the same insert with `topic: 'faq'`,
  `question` = the guest's previous message cut to 200 characters (the first 200 characters of the typed answer
  when there is none), `answer` = the typed answer, no `variations`; 200 `{ item, drafted: false }`. The member's
  correction is never lost because the model was unavailable.
- [ ] Nothing is sent to the guest, no `messages` row is written, and the conversation document is not changed.
- [ ] Log one line `frontdesk.fix` with `issue`, `drafted`, the conversation id, the message id and the lengths of
  the answer and of the stored question — no text and no phone.

**Browser — the data service** (`src/app/core/services/conversation-data.service.ts`, plan 677)
- [ ] `suggest(conversationId): Promise<{ ok: true, suggestion: string } | { ok: false }>` → `POST
  /api/v1/ai/frontdesk/suggest`; on success the conversation held in the service gets the new `suggestion`.
- [ ] `fixAnswer(conversationId, messageId, answer, issue): Promise<{ ok: true, drafted: boolean } | { ok: false,
  code?: string }>` → `POST /api/v1/ai/frontdesk/fix`.
- [ ] Both go through the `API` path map of `src/app/core/services/http-storage.adapter.ts` if plan 679 or 677
  added an `ai` / `frontdesk` entry there; otherwise through the same base the service already uses. Do not edit
  the map file (it is outside this scope).

**Browser — the suggestion bar** (`app-suggestion-bar`, shown by the inbox thread above the reply box)
- [ ] Shown only when the conversation's status is `human` and the 24-hour window is open (the reply box of plan
  677 is in its free-text state). In status `bot` and with a closed window it is not rendered at all.
- [ ] With a stored `suggestion`: the label `ibx_sg_title` with the icon `sparkles`, the text (plain, line breaks
  kept, at most six lines then scrolls), and three buttons: "שליחה" (`c-btn-primary`, `ibx_sg_send`) sends the text
  as it is through the service's existing reply call; "עריכה" (`c-btn-ghost`, `ibx_sg_edit`) puts the text into the
  reply box — replacing what is there only when the box is empty, otherwise appending it after a line break — and
  moves the focus there; "×" (`c-btn-ghost`, icon `x`, accessible label `ibx_sg_dismiss`) hides the bar for this
  conversation until a new suggestion arrives (kept in a signal of the page; nothing is sent to the server).
- [ ] Without a stored suggestion, or after a dismiss: one button "הצע תשובה" (`c-btn-ghost`, icon `sparkles`,
  `ibx_sg_ask`) → `suggest(id)`. While it runs the button is disabled and shows `app-loader` in its place; on
  success the bar shows the text; on failure the bar shows `ibx_sg_failed` with a "נסה שוב" button (`retry`).
- [ ] After a send (from the bar or from the reply box) the bar is hidden until the next suggestion: the page
  treats a suggestion as used when its text equals the one that was shown at send time. A new guest message that
  brings a new stored suggestion (the list poll of plan 677) shows the bar again.
- [ ] A send from the bar that the server refuses (window closed, do-not-contact) shows the reply box's own
  refusal message of plan 677; the bar stays.
- [ ] Leaving the thread or switching conversation needs no question: the bar holds no typed text.

**Browser — "fix this answer"**
- [ ] `app-chat-thread` (plan 677) gains the optional input `fixable: boolean` (default false) and the output
  `fixRequested` (the message's `_id`). When `fixable` is true, every outbound bubble whose `author` is `ai` shows
  under it, after the delivery state, a small text button "תיקון התשובה" (`c-btn-ghost`, icon `flag`,
  `chat_fix_answer`). The simulator of plan 678 does not set the input, so it is unchanged. The inbox sets
  `fixable` for every member.
- [ ] The inbox opens `app-fix-answer-dialog` (`app-modal-shell`, title `ibx_fix_title`): the wrong message quoted
  on top (plain text, at most four lines); the field "התשובה הנכונה" (`app-form-field` with a text area, required,
  1–1200 characters, counter shown from 1000); the choice "מה היה לא נכון" (`app-custom-select`, required, options
  `ibx_fix_wrong_info` "מידע שגוי", `ibx_fix_missing_info` "מידע חסר", `ibx_fix_outdated` "מידע ישן",
  `ibx_fix_misunderstood` "לא הבין את השאלה", `ibx_fix_other` "אחר"; the control's explanation `ibx_fix_issue_hint`
  is its `title` and `aria-describedby`, never text on the dialog); buttons "שמירה" (`c-btn-primary`, disabled until
  both fields are valid and while saving) and "ביטול".
- [ ] Save → `fixAnswer`. Success: the dialog closes and a message is shown through the app's existing message
  service — `ibx_fix_saved` when `drafted` is true, `ibx_fix_saved_plain` when false. Failure: the dialog stays
  open with `ibx_fix_failed` above the buttons and the typed text kept. Escape and "ביטול" close it; with typed text
  the shell's existing leave question (`[hasChanges]`) asks first.
- [ ] The dialog never sends anything to the guest and says so nowhere (no extra confirmation).

**Breakpoints** (the one set: phone ≤ 767, tablet ≤ 1023, desktop ≥ 1024)
- [ ] Phone: the bar's three buttons sit in one row under the text, "×" at the inline end; the dialog is the
  shell's sheet. Tablet and desktop: the buttons sit at the inline end of the bar's first line. No new `@media`
  width; only `$break-phone-max` from `src/styles.scss`.

### Should Have (P1)
- [ ] `docs/brain/component-families.md` and `docs/brain/inventory.md` gain the two components and the two service
  methods; `src/app/pages/breadcrumbs.md`, `src/app/core/services/breadcrumbs.md` and `server/breadcrumbs.md` gain
  their lines.
- [ ] One line under "Contract extensions (run)" in `docs/restaurant/restaurant-map.md`: the fix route and its
  answer.

### Nice to Have (P2)
- none

## UI/UX Notes
- Hebrew RTL, logical CSS only, no `.c-*` class defined in component SCSS.
- New keys in `public/assets/data/dictionary.json`: `ibx_sg_title` "הצעת העוזר", `ibx_sg_ask` "הצע תשובה",
  `ibx_sg_send` "שליחה", `ibx_sg_edit` "עריכה", `ibx_sg_dismiss` "הסתרת ההצעה", `ibx_sg_failed` "לא הצלחנו להציע
  תשובה", `chat_fix_answer` "תיקון התשובה", `ibx_fix_title` "תיקון תשובת העוזר", `ibx_fix_answer_label` "התשובה
  הנכונה", `ibx_fix_issue_label` "מה היה לא נכון", `ibx_fix_issue_hint` "עוזר לנו להבין איזה מידע לתקן",
  `ibx_fix_wrong_info` "מידע שגוי", `ibx_fix_missing_info` "מידע חסר", `ibx_fix_outdated` "מידע ישן",
  `ibx_fix_misunderstood` "לא הבין את השאלה", `ibx_fix_other` "אחר", `ibx_fix_saved` "נשמרה טיוטה למידע על העסק",
  `ibx_fix_saved_plain` "התיקון נשמר כטיוטה, בלי ניסוח אוטומטי", `ibx_fix_failed` "התיקון לא נשמר, נסו שוב".
  Existing keys reused: `save`, `cancel`, `retry`.
- Lucide icons: `sparkles` (registered), `x` (verify), `flag` (register in `src/app/app.config.ts`).
- States are never shown by colour alone: the bar's failure is text with a button.

## Atomic Sub-tasks

- [ ] A1: Let a member turn a wrong assistant answer into a draft fact for the owner — the fix route with its checks, the one model call, the fallback draft when the model is unavailable, the log line; the English prompt file — server/routes/ai/frontdesk.js, server/services/knowledge-correction-prompt.js
- [ ] A2: Prove the fix route with the model faked — the draft item and its fields, the fallback, every refusal, the limiter, the log content, a simulator conversation — server/test/ai-frontdesk-fix.test.js
- [ ] A3: Give the browser the two calls the inbox needs — suggest and fixAnswer on the conversation service, with their spec cases — src/app/core/services/conversation-data.service.ts, src/app/core/services/conversation-data.service.spec.ts
- [ ] A4: Show the assistant's drafted reply above the reply box — the suggestion bar with send, edit, dismiss and ask, its loading and failure states, the phone layout; spec — src/app/pages/inbox/components/suggestion-bar/suggestion-bar.component.ts, .html, .scss, .spec.ts
- [ ] A5: Wire the bar into the thread so a suggestion can be sent or moved into the reply box — when it shows, the used and dismissed rules, the refusal path; all dictionary keys of this plan — src/app/pages/inbox/inbox.page.ts, src/app/pages/inbox/inbox.page.html, src/app/pages/inbox/inbox.page.spec.ts, public/assets/data/dictionary.json
- [ ] A6: Put a fix action under every answer the assistant wrote — the optional input and output on the shared thread, the flag icon; the simulator unchanged; spec — src/app/shared/chat-thread/chat-thread.component.ts, .html, .spec.ts, src/app/app.config.ts
- [ ] A7: Build the dialog where the member types the right answer — the quoted message, the answer field, the issue choice with its tooltip, save, failure and leave rules; spec — src/app/pages/inbox/components/fix-answer-dialog/fix-answer-dialog.component.ts, .html, .scss, .spec.ts
- [ ] A8: Record the new pieces where the next plan looks for them — the folder maps, the registry rows, the map's extension line — src/app/pages/breadcrumbs.md, src/app/core/services/breadcrumbs.md, server/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md, docs/restaurant/restaurant-map.md
- [ ] A9: Write the three screen checks that run in the real app — signInQa, the conversations, messages, suggest, reply and fix calls answered by the spec; screenshots — e2e/ui/682-1.spec.ts, e2e/ui/682-2.spec.ts, e2e/ui/682-3.spec.ts
- [ ] A10: Run every check of this plan and hand Dandan the hand checks — test:server, test:ci, build, lint, lint:icons, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: the inbox, `app-chat-thread` and `ConversationDataService` (677); the suggest route, `askTurnModel`
  and the sub-router (679); `sendOut` and the member reply route (675, 687); `knowledgeImportItemSchema`,
  `checkStoredDoc`, `createRateLimiter`, `scopeFilter`, `assertCan`.
- New files needed: `server/services/knowledge-correction-prompt.js`, `server/test/ai-frontdesk-fix.test.js`, the
  two components with their specs, three e2e specs.
- Model changes: none. `knowledgeItems` already allows `source: 'correction'` and `variations`.
- Backend / API: one new route, `POST /api/v1/ai/frontdesk/fix`. The suggest route of plan 679 is used as it is.
- Auth and validation: any member of a business with `frontdesk` (`manageConversations`); input checked as listed;
  the model's answer checked with `knowledgeImportItemSchema` before it is stored.
- Security surface: a member's free text and a guest's message go to the model in the `user` part only; the stored
  draft is plain text and reaches a guest only after the owner approves it; the limiter is 10 / 15 minutes per
  business; logs hold no text. A staff member can now create a *draft* knowledge item through this route only.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; dictionary keys and icons named above; folder maps in scope; the
  `[ui]` specs sign in with `signInQa` and answer the API themselves.

## Out of Scope
- Sending a suggestion without a member (that is assistant level 1, plan 679).
- Editing or approving a knowledge item from the inbox; the knowledge page does that.
- A "fix" on a message a member or the server wrote, and on template messages.
- Suggestions for a template when the window is closed.
- Learning from corrections beyond the draft item (brief, Part 2 rule 12).

## Critical Questions
- none

## Execution Notes
- behaviour: the suggestion bar shows only while a member holds the conversation and the window is open; in status `bot` the assistant answers by itself and no bar is shown.
- behaviour: "עריכה" appends the suggestion to text already typed in the reply box instead of replacing it.
- behaviour: when the model is unavailable the correction is still saved as a plain draft (topic `faq`), so a member's work is never lost.
- behaviour: any member may mark a wrong answer; only the owner approves the draft (unchanged).
- behaviour: the issue type is used in the prompt and the log; it is not stored on the knowledge item (the schema has no field for it).
