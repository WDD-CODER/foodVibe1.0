# Plan 623 — Logistics panel: record or paste site-visit notes, review the draft line by line, save

Status: done
Depends-on: 621, 622
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The owner comes back from a site visit with a voice note or a block of text and a checklist he did not tick. Plans 621
and 622 gave the server a transcription route and a route that turns notes into a draft of answers. Nothing in the
browser uses them. This plan adds the screen half inside the event's logistics card: record a note (up to three
minutes) or paste text, see the suggested answers as a list, keep, change or drop each line, save through the route
that already saves logistics answers, and see which questions are still open ("still to check on site").

It also adds the shared recorder `app-voice-note` (plan 637 reuses it for the stock count) and makes the browser's
"which questions does this event show" rule call the shared function plan 622 created, so the server and the browser
have one rule.

Verified on `origin/main` (e916e48e, 2026-11-17):
- The panel is `src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts`
  (417 lines), `.html` (259), `.scss` (172), `.spec.ts` (309). It is hosted once, in
  `src/app/pages/menu-intelligence/menu-intelligence.page.html:243` (`<app-event-logistics-panel [eventId]="editingId_()" />`
  inside `@if (editingId_())`). `menu-intelligence.page.ts` is 1,045 lines and growth-frozen; this plan does not open it.
- The panel saves through `EventPipelineService.saveLogistics(eventId, { answers })`
  (`src/app/core/services/event-pipeline.service.ts:67`), which writes the returned event into the store and shows the
  error toast itself on a failure (`run`, lines 118-146). `DraftAnswer` (`event-logistics-panel.component.ts:28`) is what
  one save carries per answer.
- How the panel writes an answer today: one "נדרש" toggle (`setNeeded`, line 256: `status: 'needed'` + `payer` from
  `providerOf`, else `status: 'not_needed'`) and two provider radios (`setProvider`, line 261: `payer: 'ours' | 'client'`).
  `providerOf` (line 252) reads the old `client_provides` status as provider "client". An ad-hoc item is
  `itemKey: 'adhoc:' + crypto.randomUUID()` with a `label` (`addAdhoc`, line 367).
- `canEdit_` (line 111) is true for a member who may `editLogistics` on an event that is not finished; staff see the
  card read-only.
- `PUT /api/v1/events/:id/logistics` replaces the stored answer of an `itemKey` with the whole object it receives
  (`server/routes/events.js:306-313`), so a field left out of the body is lost for that answer.
- `LogisticsItemRegistryService.forEvent` is `src/app/core/services/logistics-item-registry.service.ts:72-97`;
  `hiddenAt_` (line 29) reads `BusinessService.business_()?.hiddenLogisticsKeys`; `sections_` (line 43) and
  `sectionLabel()` (line 51) give the section list and its dictionary keys.
- `GeminiService` (`src/app/core/services/gemini.service.ts`, 375 lines) is the browser's client of `/api/v1/ai/*`:
  `API.ai(path)` (`src/app/core/services/http-storage.adapter.ts:11`), `modelParam_()` (line 110),
  `incrementGeminiUsage()` after a successful call (e.g. line 186), base64 through `FileReader` (`encodeImage_`, line 360).
- No audio code exists in `src/app` (no `MediaRecorder`, no `getUserMedia`).
- `src/app/app.config.ts` registers `Sparkles`, `Trash2`, `X`, `Check`, `Play`, `Pause`; it does not register `Mic` or
  `Square`.
- `e2e/ui/522-1.spec.ts` opens the card on a throwaway event (`signInQa`, `createQaEvent`, `deleteQaEvent` from
  `e2e/helpers/qa-session.ts`); `e2e/ui/580-1.spec.ts:6` fakes an AI route with `page.route('**/ai/generate-menu', …)`.
- `scripts/breadcrumbs-check.mjs` fails when a direct child of `src/app/shared/` is not named in
  `src/app/shared/breadcrumbs.md`.
- None of the dictionary keys this plan adds exists in `public/assets/data/dictionary.json` (checked one by one);
  `logistics_status_needed` "נדרש", `logistics_payer_ours` "עלינו", `logistics_payer_client_care` "באחריות הלקוח",
  `logistics_note` "הערה", `cancel` "ביטול", `ai_daily_limit_reached_all` exist and are reused.
- Not on `main` yet: `@schemas/ai-voice.schema` (plan 621), `@schemas/logistics/visible-items` and
  `@schemas/logistics/extract.schema` (plan 622), `ModuleService` (plan 620).

## Goals & Success Criteria
**Primary:** from the logistics card of a stored event, the owner turns a spoken or pasted note into saved checklist
answers in one pass, deciding every line himself, and sees what is still open.

- [auto] `pnpm run test:ci` → passes, including `src/app/shared/voice-note/voice-note.component.spec.ts`, `src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.spec.ts`, the updated `src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts`, `src/app/core/services/gemini.service.spec.ts`, the unchanged `src/app/core/services/logistics-item-registry.service.spec.ts` and the parity spec plan 622 added beside it.
- [auto] The recorder stops by itself at 180 seconds (fake timers), sends the base mime type without the codec suffix, refuses a recording over 1,800,000 base64 characters before any request with the text of `voice_note_too_large`, shows only the notice, the text box and the send button when the browser has no `MediaRecorder`, and its `send` output is `{ text, source: 'text', fileId: null }` for typed text and `{ text, source: 'voice', fileId }` after a transcription (`src/app/shared/voice-note/voice-note.component.spec.ts`).
- [auto] In the draft view a conflict is not selected when the draft opens; saving sends only the kept lines; a suggested `client_provides` is saved as `status: 'needed'` with `payer: 'client'`; a dropped line is not sent; the confirm call carries the draft id and the kept lines; with `draftId: null` no confirm call is made (`src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.spec.ts`).
- [auto] `forEvent` returns what it returned before for every existing fixture (`src/app/core/services/logistics-item-registry.service.spec.ts` unchanged and green) and its body no longer holds the date rule (the service calls `visibleLogisticsItems`).
- [auto] `pnpm run lint` → exit 0.
- [auto] `pnpm run lint:icons` → exit 0.
- [auto] `pnpm run lint:reuse` → exit 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` → exit 0 (the new `voice-note` family entry names paths that exist).
- [auto] `node scripts/breadcrumbs-check.mjs` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/menu-intelligence/<a new event>`, in the open logistics card, after "מילוי מהערות", pasting "יש קירור במקום, צריך להביא 2 צ'ילרים, גנרטור לא צריך" and pressing "הצע תשובות" (the extract route answered by the spec) shows the heading "תשובות מוצעות" and the heading "עוד לבדוק במקום" (`e2e/ui/623-1.spec.ts`).
- [ui] On the same page in a browser without `MediaRecorder`, pressing "מילוי מהערות" shows "אי אפשר להקליט בדפדפן הזה – אפשר להדביק או להקליד טקסט" (`e2e/ui/623-2.spec.ts`).
- [ui] On the same page, with a prepared draft of one suggested answer, pressing "שמור תשובות" shows "התשובות נשמרו" (`e2e/ui/623-3.spec.ts`).
- [human] Dandan records a real site-visit note on his phone, reads the transcript, asks for answers, and approves the result line by line.
- [human] On a phone the note block and the draft list read right in Hebrew (right-to-left, nothing cut, buttons reachable with a thumb).

## Execution Mode
- Parallel: no — a screen plan of `mod-events-ui`: one at a time with 624 (both write `src/app/pages/menu-intelligence/components/event-logistics-panel/**`, `public/assets/data/dictionary.json`, `src/app/app.config.ts`) and never beside another screen run of the program (620, 628, 629, 630, 632, 634, 636, 637 append to the same `dictionary.json` and `app.config.ts`). 622 must be merged first (it creates the shared function this plan makes the registry service call).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/components/event-logistics-panel/**
src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.spec.ts
src/app/shared/voice-note/**
src/app/shared/voice-note/voice-note.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/core/services/gemini.service.ts
src/app/core/services/gemini.service.spec.ts
src/app/core/services/logistics-item-registry.service.ts
public/assets/data/dictionary.json
src/app/app.config.ts
docs/brain/component-families.md
e2e/ui/623-1.spec.ts
e2e/ui/623-2.spec.ts
e2e/ui/623-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-5: preserves — the questions stay `logisticsItem` terms read through `TaxonomyStore`; `LogisticsItemRegistryService.forEvent` keeps its signature and result and only moves its date rule to the shared pure function.
- INV-6: preserves — the recording and the notes go to the server routes `/api/v1/ai/voice/transcribe` and `/api/v1/ai/logistics/extract` through `GeminiService`; the browser holds no model key and calls no model.
- INV-1: preserves — answers are written only by the existing `PUT /api/v1/events/:id/logistics`, which the server authorises with `editLogistics`; the new block is shown only when `canEdit_()` is true and the server stays the gate.

## Reuse Check

- `voice-note` (`app-voice-note`, `src/app/shared/voice-note/`) — family: none — rung: 4 — why: no audio piece exists anywhere in the app; record, stop, replay, transcribe and the typed fallback are needed by two screens (this one and the stock count of plan 637), so it is a shared family from the start and gets its `### voice-note` entry in the registry.
- Layout classes `.note-draft` `.note-draft-hint` `.note-draft-group` `.note-draft-title` `.note-draft-row` `.is-dropped` `.note-draft-head` `.note-draft-text` `.note-draft-label` `.note-draft-small` `.note-draft-line` `.note-draft-adhoc-label` `.note-draft-detail` `.note-draft-note` `.note-draft-open` `.logistics-notes-open` — family: chip — rung: 1 — why: wrappers of the draft view and the open button, spacing tokens only.
- Classes `.voice-note-muted` `.voice-note-clock` `.voice-note-audio` `.voice-note-send` `.voice-note-text` `.voice-note-controls` — family: voice-note — rung: 1 — why: parts of the new shared piece, used nowhere else.
- `logistics-note-draft` (`app-logistics-note-draft`, child of the panel) — family: chip — rung: 1 — why: every control is an existing piece: keep / replace / "נדרש" are `c-chip c-chip--toggle`, the two provider radios sit in `c-chip-group c-chip-group--tight` exactly as in the panel row.
- Open button "מילוי מהערות" in the panel — family: chip — rung: 1 — why: `c-chip c-chip--tap` button with `aria-expanded`, the shape the panel header already uses.
- Quantity of a suggested line — family: stepper — rung: 1 — why: `app-counter`, as in the panel row.
- Section of an ad-hoc suggestion — family: search-combobox — rung: 1 — why: `app-custom-select` over a short fixed list (`registry.sections_()`).
- Note inputs, the notes text box and the buttons — family: engine-classes — rung: 1 — why: `.c-input` (the text box grows through `TextareaAutoGrowDirective`), `.c-btn-primary`, `.c-btn-ghost`, `.c-icon-btn`.
- Waiting and messages — family: feedback — rung: 1 — why: `app-loader`, `UserMsgService`, `LoggingService`; the save button uses `isSaving_` with `aria-busy`.
- Nothing found in the notes — family: empty-state — rung: 1 — why: `app-empty-state` with `logistics_draft_nothing`.
- `GeminiService.transcribeVoice`, `extractLogistics`, `confirmLogisticsDraft` — family: http — rung: 3 — why: three more methods on the existing AI client, same `API.ai(...)` and `modelParam_()` pattern.
- `LogisticsItemRegistryService.forEvent` calling `visibleLogisticsItems` — family: taxonomy — rung: 3 — why: the facade keeps its method; the rule now lives in `shared/schemas/logistics/visible-items.ts` (registry entry updated).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef on a site visit, I want to record what I see and get it as text so that I do not type standing in a field.
- As the owner, I want every suggested answer shown as a line I can keep, change or drop so that nothing is saved that I did not see.
- As the owner, I want a suggestion that disagrees with an answer I already gave shown next to my answer and left alone unless I choose it so that my decisions are not overwritten.
- As the owner, I want a list of the questions the notes did not answer so that I know what to check on site before I leave.
- As a chef whose phone cannot record in the browser, I want to paste or type the note instead so that the feature still works for me.
- As a consultant working in a client's business, I want the same flow on the client's own checklist so that I can fill it for them after a visit.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-VOICE (621; used by 623, 637)**
  - `POST /api/v1/ai/voice/transcribe` body `{ audioBase64, mimeType, purpose: 'logistics' | 'stock', durationSec? }`
    → `{ transcript: string (≤ 20,000), fileId: string | null }`. Any signed-in member; `aiLimiter`;
    `feature: 'voice_transcribe'`; `needsMedia: 'audio'`. The prompt asks for the words as spoken, in the spoken
    language, with no summary and no answer to anything said. Silence → 200 with `transcript: ''`.
  - The browser stops a recording at 180 seconds.
  - `audio/mp4` (what a phone browser records) is accepted and sent to the model labelled `audio/m4a`, the name the
    model's audio documentation lists for the same container.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LOGX (622; used by 623)**
  - `shared/schemas/logistics/visible-items.ts` → `visibleLogisticsItems({ terms, hiddenLogisticsKeys, eventCreatedAt,
    phase, environment, eventHiddenKeys? }) → LogisticsItemTerm[]` — the questions this event shows. Pure. It is the rule
    `LogisticsItemRegistryService.forEvent` has today (plan 579), moved: `terms` = master ∪ the business's own
    `logisticsItem` terms; group by `key`; a term with `foldedAt` gives no row but still counts for the start date; the
    row is the live term, else the newest removed one; a key counts from the earliest of its terms (a term whose `createdBy` is `'__master__'` = 0,
    else `createdAt`) until the earliest `removedAt` or the business's hide date (`hiddenLogisticsKeys[].at`); it shows
    when `start ≤ eventCreatedAt < end` (no `eventCreatedAt` = now); `phase` must equal the term's; a term with
    `environments` shows only when the event has no environment or has one of them (`event.logistics.environmentType`).
    `eventHiddenKeys` (`event.siteLogistics.hiddenKeys`), when given, are taken out: the server passes them, the panel
    does not (it shows them behind its "show hidden" switch). The order of `terms` is kept.
    In 623 `forEvent` calls this function, so there is one rule.
  - `POST /api/v1/ai/logistics/extract` body `{ eventId, phase, text (1–20,000), fileId? }` — owner or consultant
    (`editLogistics` on that event), `requireModule('event_logistics')`, `feature: 'logistics_extract'` →
    `{ draftId, answers: [{ itemKey, phase, section, status: 'needed' | 'not_needed' | 'client_provides',
    quantity?, text? }], conflicts: [{ itemKey, current, suggested }], adhoc: [{ label (≤ 120), section, status,
    quantity?, text? }] (≤ 20), unanswered: string[] }`.
  - The model receives the numbered questions (number, text, answer type, hint) and the note, and returns
    `{ answers: [{ i, status, quantity?, text? }], extra: [{ label, section, status, text? }] }`. Server rules:
    an `i` out of range or repeated is dropped; `quantity` is kept only for a `quantity` question; `text` ≤ 500;
    `payer` and `showToClient` are never taken from the model; a question the event already answered (status other
    than `unchecked`) goes to `conflicts`, not to `answers`; `extra.section` must be a section the business has,
    else `other`. `unanswered` = visible questions with no answer other than `unchecked` after the draft.
  - The route never writes the event. The owner saves through `PUT /api/v1/events/:id/logistics`, then
    `POST /api/v1/ai/logistics/extract/:draftId/confirm` body `{ saved }` stores what was kept (C-AIDRAFT).
- [ ] `LogisticsItemRegistryService.forEvent(createdAt, phase, environment)` keeps its signature and its doc comment and becomes one call: `visibleLogisticsItems({ terms: this.allItems_(), hiddenLogisticsKeys: this.injector.get(BusinessService).business_()?.hiddenLogisticsKeys ?? [], eventCreatedAt: createdAt, phase, environment })` (import from `@schemas/logistics/visible-items`). No `eventHiddenKeys` is passed: the panel shows them behind its "show hidden" switch. `hiddenAt_`, `defaultItems_`, `forPhase`, `matches` stay. `logistics-item-registry.service.spec.ts` is not edited and stays green.
- [ ] `GeminiService` gains three methods, each `firstValueFrom(this.http_.post(…))` on `${this.authBase_}${API.ai(path)}`:
  - `transcribeVoice(recording: { blob: Blob; mimeType: string; durationSec: number }, purpose: VoicePurpose): Promise<VoiceTranscribeResponse>` — reads the blob as base64 with a `FileReader` (data-url prefix stripped, as `encodeImage_` does); a base64 string longer than `VOICE_AUDIO_MAX_BASE64` rejects with `new Error('AUDIO_TOO_LARGE')` before any request; posts `{ audioBase64, mimeType, purpose, durationSec, ...this.modelParam_() }` to `voice/transcribe`; calls `incrementGeminiUsage()` on success.
  - `extractLogistics(body: { eventId: string; phase: LogisticsPhase; text: string; fileId?: string }): Promise<LogisticsExtractResponse>` — posts `{ ...body, ...this.modelParam_() }` to `logistics/extract`; `incrementGeminiUsage()` on success.
  - `confirmLogisticsDraft(draftId: string, saved: LogisticsConfirmLine[]): Promise<void>` — posts `{ saved }` to `` `logistics/extract/${draftId}/confirm` ``.
  Types and limits come from `@schemas/ai-voice.schema` and `@schemas/logistics/extract.schema`; none is redefined in the browser.
- [ ] `app-voice-note` (`src/app/shared/voice-note/voice-note.component.ts|html|scss|spec.ts`, new, standalone, OnPush, section order of `.claude/skills/angularComponentStructure/SKILL.md`):
  - Inputs: `purpose = input.required<VoicePurpose>()`, `placeholderKey = input('')`, `sendLabelKey = input.required<string>()`, `busyLabelKey = input('')`, `busy = input(false)` (the host's own call is running), `disabled = input(false)`. Model: `text = model('')`. Output, exactly: `send = output<VoiceNoteSend>()` with `export interface VoiceNoteSend { text: string; source: 'voice' | 'text'; fileId: string | null }`.
  - `send` is emitted by the send button (`c-btn-primary`, text from `sendLabelKey`; disabled while `text().trim()` is empty, while `busy()` or `disabled()` is true and while a recording or a transcription runs; `aria-busy` and the `busyLabelKey` text while `busy()`). `text` is the trimmed content of the box. `source` is `'voice'` when at least one recording was transcribed into the box since it was last empty — also when the person corrected the transcript afterwards — and `fileId` is then the id the transcribe route returned for the last such recording (`null` when the file store kept nothing). `source` is `'text'` with `fileId: null` when the text was only pasted or typed. Emptying the box resets the source to `'text'`. The piece does not clear the box after `send`; the host does, through the model, when its own call succeeded.
  - Always renders the text box: `<textarea class="c-input">` bound to `text`, `maxlength` 20,000, placeholder from `placeholderKey`, `aria-label` from the same key.
  - `canRecord_` = `typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia` (false on a page that is not served over https or localhost). When false: the recorder controls are not rendered and one muted line shows `voice_note_unsupported`. This is the fallback to paste.
  - State `state_ = signal<'idle' | 'recording' | 'recorded' | 'transcribing'>('idle')`:
    - `idle`: a `c-btn-ghost` button, icon `mic`, text `voice_note_record`, with the muted hint `voice_note_limit` and the muted line `voice_note_privacy`.
    - Press → `getUserMedia({ audio: true })`. Refused (`NotAllowedError` / `SecurityError`) → error toast `voice_note_mic_denied`, state stays `idle`. Any other failure → the same toast.
    - `recording`: `new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 })` where `mimeType` is the first of `['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']` for which `MediaRecorder.isTypeSupported` is true (none → no option, the browser's default). A running clock `m:ss / 3:00` (`dir="ltr"`), a `c-btn-primary` button, icon `square`, text `voice_note_stop`. A `setInterval` of one second counts up; at `VOICE_MAX_SECONDS` (180) it calls `stop()` by itself.
    - `recorded` (after `onstop`): the chunks become one `Blob`; a native `<audio controls [src]="objectUrl">` replays it; a `c-btn-primary` button `voice_note_transcribe` and a `c-icon-btn` with icon `trash-2` and `aria-label` `voice_note_discard` (drops the recording, back to `idle`, no question asked).
    - `transcribing` (after the transcribe button): `app-loader` (small, inline) with `voice_note_transcribing`; calls `GeminiService.transcribeVoice({ blob, mimeType: <the recorder's mime type up to the first ';', lower-cased; a type outside VOICE_MIME_TYPES is sent as 'audio/webm'>, durationSec }, purpose())`.
      - Success with text: the transcript is appended to `text` (after a line break when `text` is not empty), the piece remembers the `fileId` and that the text now comes from a recording, the recording is released, state `idle`. Nothing is emitted yet.
      - Success with `transcript: ''`: warning toast `voice_note_empty`, state back to `recorded`.
      - Failure: error toast — `voice_note_too_large` when the error message or `err.error?.error` is `AUDIO_TOO_LARGE`; the text of `ai_monthly_cap_reached` when `err.error?.error` is that code (the key plan 617 / 620 add; never add a second key for it); `ai_daily_limit_reached_all` for any other 429; else `voice_note_failed`. State back to `recorded`, so the same recording can be sent again. One `logging.error({ event: 'voice_note.transcribe_failed', message: 'Voice transcription failed', context: { status } })` — never the text.
  - On destroy and on discard: stop every track of the stream, clear the interval, `URL.revokeObjectURL`.
  - `disabled()` true: the record, transcribe and send buttons and the text box are disabled.
  - Styles in the component's own `.scss` under `@layer components.voice-note`, logical properties and tokens only; no new `.c-*` class.
- [ ] `app-logistics-note-draft` (`src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.ts|html|scss|spec.ts`, new, standalone, OnPush). Inputs `eventId = input.required<string>()`, `phase = input.required<LogisticsPhase>()`; output `done = output<void>()`. Two steps in one block, no popup:
  - Step `input`: the hint line `logistics_notes_hint`; `<app-voice-note purpose="logistics" [(text)]="text_" placeholderKey="logistics_notes_placeholder" sendLabelKey="logistics_notes_extract" busyLabelKey="logistics_notes_extracting" [busy]="isExtracting_()" (send)="extract($event)" />`. The send button is the one inside the recorder piece; this component adds no second button.
  - Extract (`extract(note: VoiceNoteSend)`): `GeminiService.extractLogistics({ eventId, phase, text: note.text, ...(note.fileId && { fileId: note.fileId }) })` for the phase tab that is selected when the button is pressed. Failure → error toast with the same mapping as the recorder (`ai_monthly_cap_reached`, any other 429 → `ai_daily_limit_reached_all`, else `logistics_notes_failed`), the text stays, one `logging.error({ event: 'logistics_notes.extract_failed', … context: { status } })`. Success → step `review`.
  - Step `review` shows four groups; a group with no line is not rendered:
    1. `logistics_draft_answers` — one row per suggested answer: a keep toggle (`c-chip c-chip--toggle`, text `logistics_draft_keep`, on when the draft opens); the question text (`itemKey`) with its hint from the registry term when there is one; the "נדרש" toggle (on for `needed` and `client_provides`, off for `not_needed`); when "נדרש" is on, the two provider radios `logistics_payer_ours` / `logistics_payer_client_care` (`client` preselected for a suggested `client_provides`, else `ours`), `app-counter` (0–100,000) when the question's `answerType` is `quantity`, and the note input (`c-input`, `maxlength` 500, `aria-label` `logistics_note`) holding the suggested `text`. Turning keep off dims the row and disables its controls. The answer type comes from `registry.allItems_()` (the live term of the key, else any term of the key); a key with no term is treated as `text`.
    2. `logistics_draft_conflicts` — one row per conflict: the question text; `logistics_draft_current` followed by the current answer in words (status label, quantity, note); `logistics_draft_suggested` followed by the suggestion in the same words; a toggle `logistics_draft_replace` that is off when the draft opens. Nothing in the row is editable.
    3. `logistics_draft_adhoc` — one row per ad-hoc suggestion: the keep toggle (on); the label in a `c-input` (`maxlength` 120); `app-custom-select` for the section over `registry.sections_()` with `registry.sectionLabel()` labels; the "נדרש" toggle, the provider radios and the note input as in group 1.
    4. `logistics_draft_unanswered` — the open questions as a plain list of their texts with the count beside the heading; read-only.
    When groups 1–3 are all empty: `app-empty-state` with `logistics_draft_nothing`; group 4 still shows.
  - Actions under the list: `c-btn-primary` `logistics_draft_save` (disabled while nothing is kept or a save runs; `aria-busy` and the `saving` text while it runs) and `c-btn-ghost` `cancel` (back to step `input` with the text kept; the draft is dropped; no question asked).
  - Save: `EventPipelineService.saveLogistics(eventId, { answers })` with one `DraftAnswer` per kept line:
    - a suggested answer → `{ itemKey, phase, section, status: needed ? 'needed' : 'not_needed', ...(needed && { payer: provider }), ...(needed && isQuantity && { quantity }), ...(text.trim() && { text: text.trim() }) }` (`phase` and `section` as the route returned them);
    - a conflict whose toggle is on → the stored answer's `label`, `quantity`, `text`, `payer` and `showToClient` first, then the suggestion over them: `not_needed` → `status: 'not_needed'`; `needed` → `status: 'needed'` and the stored `payer` when it is `ours`, `chef` or `quoted`, else `ours`; `client_provides` → `status: 'needed'`, `payer: 'client'`; a suggested `quantity` / `text` replaces the stored one;
    - an ad-hoc suggestion → `{ itemKey: 'adhoc:' + crypto.randomUUID(), label: label.trim(), phase, section, status, payer?, text? }` (a row with an empty label cannot be kept: its keep toggle is disabled).
    The status `client_provides` is never written; the panel's own way (`needed` + `payer: 'client'`) is used.
  - After a successful save: when `draftId` is not null, `GeminiService.confirmLogisticsDraft(draftId, saved)` is called and not awaited (a failure is logged with `logging.warn({ event: 'logistics_notes.confirm_failed', … })` and shows nothing); `saved` holds one line per kept row in the draft's own words — `{ itemKey | label, status: needed ? (provider === 'client' ? 'client_provides' : 'needed') : 'not_needed', quantity?, text? }`; success toast `logistics_draft_saved`; the text (`text_.set('')`) and the draft are cleared; `done` is emitted (the panel closes the block). The saved answers appear in the panel rows through the store, as after any save.
  - A failed save: the pipeline service already showed its error toast; the draft stays on screen with every choice kept, so the owner presses save again. No second toast.
  - Leaving the page, closing the card or closing the block drops an unsaved draft and the typed text without a question (a recording that was transcribed is already kept on the server). Switching the phase tab while a draft is open leaves the draft as it is; its lines keep the phase they were extracted for.
- [ ] The panel (`event-logistics-panel.component.ts|html|scss`): a signal `notesOpen_ = signal(false)`; in the template, after the `.logistics-profile` block and only when `canEdit_()`, a `c-chip c-chip--tap` button (icon `sparkles`, text `logistics_notes_open`, `[attr.aria-expanded]="notesOpen_()"`) that toggles it, and under it `@if (notesOpen_()) { <app-logistics-note-draft [eventId]="eventId()!" [phase]="phase_()" (done)="notesOpen_.set(false)" /> }`. Nothing else in the panel changes: the rows, the debounce save and the footer stay. A member who cannot edit, and a finished event, do not get the button.
- [ ] `src/app/app.config.ts`: register `Mic` and `Square` in `LucideAngularModule.pick({…})` (append; `Sparkles` and `Trash2` are there).
- [ ] `public/assets/data/dictionary.json` → `general`: the keys of UI/UX Notes, appended.
- [ ] `docs/brain/component-families.md`: a new entry `### voice-note — record or type a spoken note` under UI families (Status stable (plan 623); Use `src/app/shared/voice-note/` · `app-voice-note`; When: a screen takes a spoken or typed note and needs it as text; Inputs `purpose`, `placeholderKey`, `sendLabelKey`, `busyLabelKey`, `busy`, `disabled`, `[(text)]`; output `send` = `{ text, source: 'voice' | 'text', fileId: string | null }` (`'voice'` when the text is the transcript of a recording, with the id the transcribe route returned; `'text'` when pasted or typed); stops at 180 seconds, typed fallback when the browser cannot record; Known copies: none; first user `logistics-note-draft`). In the `taxonomy` entry add one line: plan 623 — `forEvent()` calls `visibleLogisticsItems` in `shared/schemas/logistics/visible-items.ts`, the one rule the server uses too. `src/app/shared/breadcrumbs.md`: one row for `voice-note/`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Where: inside the open logistics card of a stored event, between the environment / meeting fields and the first section. One button opens the note block in place; no popup, no new route, no new page. Phone first: every control is a full-width row or a chip that wraps; the text box grows with the text.
- Hebrew RTL; logical CSS properties only; the clock and numbers are `dir="ltr"`. No new `.c-*` class; component styles in their own layers.
- Nothing asks "are you sure": cancel, discard recording, closing the block and leaving the page act at once. The only dialog on the card stays the existing "phase done" question.
- What happens on: **edit** — every kept line is editable before save (status, provider, quantity, note; an ad-hoc label and section); **cancel** — back to the text, draft dropped; **leave** — draft and text dropped silently; **error** — a toast, the text or the recording stays for another try; **empty** — "לא נמצאו תשובות בהערות" plus the open-questions list.
- Dictionary keys to append (key — Hebrew value — meaning):
  - `logistics_notes_open` — "מילוי מהערות" — fill from notes (the button that opens the block)
  - `logistics_notes_hint` — "הקליטו או הדביקו את ההערות מהשטח. נציע תשובות לשאלות, ואתם מאשרים כל שורה." — record or paste your site notes; we suggest answers and you approve each line
  - `logistics_notes_placeholder` — "הערות מהשיחה או מהסיור, בכתב חופשי" — notes from the call or the visit, free text
  - `logistics_notes_extract` — "הצע תשובות" — suggest answers
  - `logistics_notes_extracting` — "קורא את ההערות..." — reading the notes
  - `logistics_notes_failed` — "לא הצלחנו לקרוא את ההערות – הטקסט נשאר כאן, נסו שוב" — could not read the notes; the text is still here, try again
  - `logistics_draft_answers` — "תשובות מוצעות" — suggested answers
  - `logistics_draft_conflicts` — "כבר נענו – ההצעה שונה" — already answered; the suggestion differs
  - `logistics_draft_current` — "עכשיו" — now (the current answer)
  - `logistics_draft_suggested` — "הצעה" — suggestion
  - `logistics_draft_replace` — "להחליף" — replace
  - `logistics_draft_keep` — "לשמור" — keep
  - `logistics_draft_adhoc` — "פריטים נוספים שעלו בהערות" — more items that came up in the notes
  - `logistics_draft_unanswered` — "עוד לבדוק במקום" — still to check on site
  - `logistics_draft_nothing` — "לא נמצאו תשובות בהערות" — no answers were found in the notes
  - `logistics_draft_save` — "שמור תשובות" — save answers
  - `logistics_draft_saved` — "התשובות נשמרו" — the answers were saved
  - `voice_note_record` — "הקלט הודעה" — record a note
  - `voice_note_stop` — "עצור" — stop
  - `voice_note_transcribe` — "תמלל" — transcribe
  - `voice_note_discard` — "מחק הקלטה" — delete the recording
  - `voice_note_transcribing` — "מתמלל..." — transcribing
  - `voice_note_limit` — "עד 3 דקות" — up to 3 minutes
  - `voice_note_privacy` — "ההקלטה נשמרת יחד עם התמלול" — the recording is kept together with the transcript
  - `voice_note_unsupported` — "אי אפשר להקליט בדפדפן הזה – אפשר להדביק או להקליד טקסט" — this browser cannot record; paste or type the text
  - `voice_note_mic_denied` — "אין גישה למיקרופון – אשרו גישה בדפדפן או הדביקו טקסט" — no microphone access; allow it in the browser or paste text
  - `voice_note_too_large` — "ההקלטה גדולה מדי – הקליטו קטע קצר יותר" — the recording is too large; record a shorter one
  - `voice_note_failed` — "התמלול נכשל – ההקלטה נשארה כאן, נסו שוב" — transcription failed; the recording is still here, try again
  - `voice_note_empty` — "לא נשמע דיבור בהקלטה" — no speech was heard in the recording
- Reused keys (no new entry): `logistics_status_needed`, `logistics_status_not_needed`, `logistics_payer_ours`, `logistics_payer_client_care`, `logistics_note`, `logistics_section_*`, `cancel`, `saving`, `ai_daily_limit_reached_all`, and `ai_monthly_cap_reached` from wave 0.
- Lucide icons: `mic` and `square` — new, registered in `src/app/app.config.ts` by this plan; `sparkles`, `trash-2` — already registered. `pnpm run lint:icons` confirms.
- Canonical values: an ad-hoc label is free Hebrew text stored as the answer's `label`, exactly as the panel's own "add item" does; its section is picked from the existing section keys, so no new canonical key is created and the translation-key flow is not involved.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Make the browser use the one shared rule for which questions an event shows — `forEvent` becomes a call to `visibleLogisticsItems`; the existing service spec and the parity spec stay green untouched — src/app/core/services/logistics-item-registry.service.ts
- [x] A2: Give the browser's AI client the three calls this screen needs — `transcribeVoice` (base64, the size guard before the request), `extractLogistics`, `confirmLogisticsDraft`; spec cases for the URLs, the bodies, `AUDIO_TOO_LARGE` thrown with no request, the usage counter — src/app/core/services/gemini.service.ts, src/app/core/services/gemini.service.spec.ts
- [x] A3: Build the shared recorder that turns a spoken note into text and falls back to typing — `app-voice-note` with its four states, the 180-second stop, the mime choice, release on destroy, the error mapping; spec with a fake `MediaRecorder` and fake `navigator.mediaDevices` (no microphone, no network), including the three `send` cases (typed; transcribed; transcribed, box emptied, then typed); register `Mic` and `Square` — src/app/shared/voice-note/voice-note.component.ts, .html, .scss, .spec.ts, src/app/app.config.ts
- [x] A4: Build the draft view where the owner keeps, changes or drops each suggested line — `app-logistics-note-draft`: the input step, the four review groups, conflicts off by default, the save mapping, the confirm call, cancel and failure behaviour; spec for each rule in this plan's Done-when and for the empty draft — src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.ts, .html, .scss, .spec.ts
- [x] A5: Open the note block from the logistics card for a member who may edit — the `notesOpen_` signal, the chip button and the child tag; panel spec cases: the button shows for an owner, not for read-only or a finished event, and `done` closes the block — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts, .html, .scss, .spec.ts
- [x] A6: Add every Hebrew text of the note block and the recorder to the dictionary — the 29 keys of UI/UX Notes appended to `general`, each checked as absent first — public/assets/data/dictionary.json
- [x] A7: Record the new recorder family and the moved rule where the next plan will look — the `### voice-note` entry, the line in the `taxonomy` entry, the row for the new shared folder — docs/brain/component-families.md, src/app/shared/breadcrumbs.md
- [x] A8: Script the three on-screen checks so they can run without a model or a microphone — `623-1` (paste, faked extract answer, the two headings), `623-2` (`addInitScript` removes `MediaRecorder`, the fallback notice), `623-3` (faked draft with one answer for the real question "קירור קיים במקום (מקרר/חדר קירור)", save, the saved toast); each signs in with `signInQa`, creates and deletes its own event, fakes the AI route with `page.route('**/ai/logistics/extract', …)` and saves a screenshot under `screens/` — e2e/ui/623-1.spec.ts, e2e/ui/623-2.spec.ts, e2e/ui/623-3.spec.ts
- [x] A9: Run the full checks and hand Dandan the two hand checks — `pnpm run test:ci`, `pnpm run lint`, `pnpm run lint:icons`, `pnpm run lint:reuse`, the registry and breadcrumbs checks, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines into Execution Notes; then the [human] cards — docs/brain/component-families.md

## Technical Considerations
- Dependencies: plan 621 (`POST /api/v1/ai/voice/transcribe`, `@schemas/ai-voice.schema`), plan 622 (`POST /api/v1/ai/logistics/extract`, its confirm route, `@schemas/logistics/extract.schema`, `@schemas/logistics/visible-items`), plan 620 (the card is hidden when the business has no `event_logistics`; this plan adds no module check of its own — the block lives inside the card), `EventPipelineService.saveLogistics`, `LogisticsItemRegistryService`, `GeminiService`.
- New files needed: `src/app/shared/voice-note/voice-note.component.{ts,html,scss,spec.ts}`, `src/app/pages/menu-intelligence/components/event-logistics-panel/logistics-note-draft/logistics-note-draft.component.{ts,html,scss,spec.ts}`, `e2e/ui/623-1.spec.ts`, `e2e/ui/623-2.spec.ts`, `e2e/ui/623-3.spec.ts` (all new).
- Model changes: none. The draft types are inferred from the shared schemas; `DraftAnswer` (already exported by the panel) is the save shape.
- Backend / API: none added. Calls: `POST /api/v1/ai/voice/transcribe`, `POST /api/v1/ai/logistics/extract`, `POST /api/v1/ai/logistics/extract/:draftId/confirm`, and the existing `PUT /api/v1/events/:id/logistics`.
- Auth and validation: the block is rendered only when `PermissionService.can('editLogistics', …)` is true and the event is not finished (`canEdit_`); the server checks every call again. The browser checks the recording size before sending and caps the text box at 20,000 characters and a note at 500.
- Security surface: the microphone is asked for only when the record button is pressed and released when the recording stops or the block is destroyed; the recording and the text leave the browser only to the app's own server; nothing is written to `localStorage` or `sessionStorage`; log events carry a status code only, never the note or the transcript. The model's output is shown as plain text through Angular bindings (no `innerHTML`).
- Data / migration: none. Answers are saved in the existing `siteLogistics.answers` shape.
- Project checks: `[auto] log-query` present; every new dictionary key named with its Hebrew value; icons named with their registration state; Reuse Check lists every control; Hebrew RTL and logical CSS stated; canonical values addressed (ad-hoc label, section keys); `pnpm run test:ci` in the Done-when; no new persisted data; no new route.
- `menu-intelligence.page.ts` (growth-frozen) and `menu-intelligence.page.html` are not in the Read-Write Scope: net lines 0. The panel component grows by about five lines; the draft view is its own component so the panel does not take the feature's weight.
- Recording facts the build must hold to: `MediaRecorder` exists only in a secure context (https or localhost), so a phone that opens the dev server over plain http gets the typed fallback; 32 kbit/s for 180 seconds is about 0.72 MB, under the 1,800,000-character base64 limit, and the size guard catches a browser that ignores the bitrate hint.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- The two server routes and their rules (plans 621, 622).
- Any change to how the panel's own rows are answered, hidden, counted or saved; the "phase done" flow; the client summary.
- Editing a conflict's suggested values before replacing (a conflict is taken as suggested or left).
- Setting `showToClient` or the payers `chef` / `quoted` from the draft.
- Recording longer than 180 seconds, pausing a recording, uploading an audio file from the phone, or listening to a kept recording later from the event.
- The stock count by voice (plan 637 reuses `app-voice-note`).
- A section for `voice-note` on the `/dev/catalog` page.
- Any change to `menu-intelligence.page.ts` or `.html`.

## Critical Questions
- none

## Execution Notes
- decided: the recorder and the text box are one shared piece, and the piece calls the transcription itself — why: both users of the family (site notes, stock count) need "speak or type, get text"; a host gets one `send` with the text, where it came from and the id of the recording, and the fallback to typing needs no host code. Plan 637 uses the piece without editing it.
- decided: transcription and extraction are two presses — why: the owner reads and can fix the transcript before it becomes answers, and one request stays one model call.
- decided: the note block opens in place inside the card, not in a popup — why: the card is used on a phone on site, the list can be long, and no dialog was asked for.
- decided: a suggested line is edited with the same controls the panel row has ("נדרש", "עלינו" / "באחריות הלקוח", quantity, note) and `client_provides` is saved as `needed` + `payer: 'client'` — why: that is how the panel writes answers since plan 579; a second vocabulary on one card would confuse and the old status is read-only legacy.
- decided: a conflict is replace-or-leave with no editing — why: the card and the Contract ask for "beside the current answer and off by default"; editing an already answered question is one tap away in the row itself.
- decided: a replaced conflict keeps the stored `label`, `payer`, `showToClient` and any field the suggestion does not carry — why: the save route replaces the whole answer object of a key, so a field left out would be lost.
- decided: the confirm call is not awaited and its failure shows nothing — why: it records accuracy for the platform, not something the owner did; his answers are already saved.
- decided: the recorder asks for `audio/webm` (Opus) first, then `audio/ogg`, then `audio/mp4`, at 32 kbit/s — why: the first three are on the provider's list of accepted audio (read 2026-11-17), iPhone browsers offer only `audio/mp4` (the server sends it to the model as `audio/m4a`, plan 621), and 32 kbit/s keeps three minutes under the request limit.
- decided: one muted line tells the user the recording is kept (`voice_note_privacy`) — why: decision D6 keeps recordings for 24 months and a voice identifies a person; the receipt photo flow shows the matching line `import_photo_privacy`.
- decided: error texts are mapped in the two components, not in a new shared helper — why: three lines each; a helper would be a new util family row for one caller pair.
- decided: `voice-note` is not added to the dev catalog page — why: the catalog spec fixes the section list at 13 and the card did not ask for it.
- evidence: `pnpm run build` -> exit 0 (bundle-budget warnings only); `pnpm run lint` -> exit 0 (0 errors); `pnpm run test:ci` -> exit 0, 2343 SUCCESS (first run: 1 unrelated flaky failure in data-export-card.component.spec.ts:105, passed on rerun, no change to it); `lint:icons`, `lint:reuse`, `lint:no-native-select`, `breadcrumbs-check`, `log-query --level=error`, `override-check`, `plan-ledger-check`, `kit-manifest-check` -> exit 0.
- evidence: `node scripts/reuse-lint.mjs --check-registry` -> exit 1 with 5 `missing-path` lines (registry lines 23, 164, 197, 324, 364: origin/mvp-review, @utils/server-refusal.util, .teal/.amber/.red, public-request.service.ts, @schemas/modules-pure); none is the new `voice-note` entry, all were there before this plan.
- evidence: the three `[ui]` e2e specs (`e2e/ui/623-1..3.spec.ts`) are written, not run (no running app, no QA login).

