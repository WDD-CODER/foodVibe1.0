# Plan 756 — The assistant page gets two more tabs: "how it works" (the 13 steps in plain words) and "what you can change" (every setting, where it is changed and by whom)

Status: draft
Depends-on: 755
Snapshot: 103352f316e125c9c4b0e0c8806cd66278a42594

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

The Human (the product owner, not an engineer) wants the front-desk assistant "opened up" like an n8n workflow. Plan
752 gives the owner the list of runs. Two things are still missing, and both were in the mock-up the Human approved:

1. **A flow map.** An owner cannot see, in plain Hebrew, which steps every guest message goes through, which step is a
   fixed rule, which one reads the business's own data, and which single step is AI.
2. **One table of everything that shapes the assistant's answers**, each row saying where it is changed and who may
   change it, with a button that goes straight to that place.

Verified on the Snapshot (the staging checkout), file:line:

- The things that shape an answer are spread over four screens and the code, with no single list:
  - Business facts — `server/services/knowledge.js:13-28` `profileLines` (name, phone, address, service area, opening
    hours, closed dates) and `:46-69` `publicFacts` (only knowledge items with `status: 'approved'` and
    `visibility: 'public'`, `:49`), cut at `MAX_CHARS = 6000` (`:8`, exported as `MAX_FACTS_CHARS`, `:71`). Edited on
    `/frontdesk/settings` (`src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.html:86-247`, cards
    "business" and "hours") and `/frontdesk/knowledge` (`src/app/app.routes.ts:221-225`; the public / internal switch
    `src/app/pages/frontdesk/knowledge/knowledge.page.html:195`).
  - Assistant level — the owner switches 0 / 1 himself (plan 734): `PUT /api/v1/business/front-desk/assistant-level`,
    `server/routes/business.js:177-209`, authorized with `assertCan(req, res, 'editFrontDesk', …)` (`:185`); level 2 is
    reserved (`:191`) and level 1 needs status `pilot` / `active` (`:192`). The control is in the "assistant" card
    (`frontdesk-settings.page.html:269-305`).
  - Tone, the handover sentence and the assistant's active hours — same card (`:306-343`). `assistant.handoffText` is
    used for the handover sentence (`server/services/frontdesk-turn.js:118`) AND for the holding message on a technical
    failure (`:163`); `assistant.tone` goes into the rules (`server/services/frontdesk-prompt.js:79`, `:92`);
    `assistant.activeHours` is read by `preCheck` (`server/services/frontdesk-guardrails.js:43-47`).
  - Request kinds and their questions — `app-request-kind-card` (`frontdesk-settings.page.html:249-257`), sent to the
    model by `kindsBlock` (`frontdesk-prompt.js:57-69`).
  - Table booking rules — `app-table-service-card` (`frontdesk-settings.page.html:258-267`, only with the `tables`
    module, `frontdesk-settings.page.ts:132`); the floor plan — `/frontdesk/floor-plan`
    (`src/app/app.routes.ts:208-213`, `moduleGuard(['tables'])`). The turn uses tables only when the business has the
    module AND a floor plan (`server/services/frontdesk-tables.js:52-57` `tablesFor`).
  - AI models and their order — the platform admin's "AI models" card (`app-ai-model-manager`,
    `src/app/pages/metadata-manager/metadata-manager.page.component.html:164-167`, platform admin only), reached at
    `/dashboard?tab=metadata` (`src/app/pages/dashboard/dashboard.page.html:9-12`); the server reads the order with
    `modelChain()` (`server/services/gemini-client.js:132-135`, exported `:685`).
  - Monthly AI cap of a business — `aiMonthlyTokenCap`, set by the platform admin on `/platform`
    (`server/routes/admin.js:309-321`), checked before every model call (`server/services/gemini-client.js:473-482`);
    over the cap the turn fails with reason `quota` (`frontdesk-turn.js:179`).
  - Fixed in code, the same for every business: the wait for a second message `COALESCE_MS`
    (`server/services/inbound.js:15`, exported `:150`), the daily cap `FRONTDESK_DAILY_TURNS = 300`
    (`frontdesk-turn.js:24`, exported `:352`), `TURN_LIMIT = 8` (`frontdesk-guardrails.js:13`, exported `:114`),
    `HISTORY_WINDOW = 12` (`frontdesk-prompt.js:10`, exported `:107`), the guard words
    (`server/constants/frontdesk-guard-words.js:10-16`), the house rules of the prompt
    (`frontdesk-prompt.js:12-31`), the answer's JSON shape (`shared/schemas/front-desk/turn-answer.schema.ts`) and the
    guardrail rules (`frontdesk-guardrails.js:84-110`).
- How the browser knows who is looking: `UserService.isPlatformAdmin_` (`src/app/core/services/user.service.ts:41`),
  `UserService.acting_` (`:51`, `'consultant' | 'platform' | null`); `PermissionService.isOwner_` is true for the
  owner and a consultant (`src/app/core/services/permission.service.ts:51-54`); a platform admin acting in a business
  has `businessRole: 'owner'`. The acting bar is `app-acting-banner` (family `acting-banner`).
- A shared tooltip exists on staging: `[appTip]` (`src/app/shared/tip/tip.directive.ts:16-27`, plan 699, family
  `tooltip`), with the `aria-disabled="true"` pattern for a control that is blocked but must still say why
  (`src/app/pages/frontdesk/floor-plan/components/zone-panel/zone-panel.component.html:147-161`).
- No shared collapsible piece exists (`docs/brain/component-families.md` has no accordion family).

**Facts taken from plan 752 (draft, not in the checkout — it is merged before this plan runs):** the page
`/frontdesk/assistant` is `AssistantPage` (`src/app/pages/frontdesk/assistant/assistant.page.{ts,html,scss,spec.ts}`)
with `tabs = [{ key: 'runs', labelKey: 'asr_tab_runs', icon: 'activity' }]` and `activeTab_ = signal<'runs'>('runs')`,
`allowed_ = computed(() => permission.isOwner_() || user.isPlatformAdmin_())`, the template's `isAdmin_()`, the tab
strip (`button.c-chip.c-chip--tab` inside `app-scroll-rail`, `role="tablist"`), the header button `asr-refresh`;
`RUN_STEP_KEYS` (13 keys) and `RUN_REASONS` in `shared/schemas/entities/assistant-run.schema.ts`, re-exported by
`src/app/core/models/assistant-run.model.ts`; the dictionary keys `asr_step_<key>` and `asr_reason_<reason>`;
`reasonKey(reason)` in `assistant-run-view.util.ts`; the step row `button.asr-step` with the page-local classes
`.asr-step*` in `components/run-detail/run-detail.component.scss`; the router `server/routes/assistant-runs.js`
(`router.use(verifyToken, requireModule('frontdesk'), dataWriteLimiter)`, every handler `scopeFilter(req)` then
`assertCan(req, res, 'editFrontDesk', { type: 'assistantRuns' })`), `AssistantRunDataService`, and the registry family
`assistant-runs`.

**Facts taken from plans 753, 754 and 755 (written, not in the checkout — merged before this plan runs):**
- 753: one run per conversation through a lease (`server/services/frontdesk-lease.js`); a guest message that arrives
  while a run works starts no run and gets one follow-up run; `FOLLOW_UP_MAX = 3` (exported from
  `server/services/frontdesk-guardrails.js`, the stop `follow_up_limit` in `preCheck`); `GLUE_MAX = 5` and
  `unansweredTail` (exported from `server/services/frontdesk-prompt.js`, the `UNANSWERED` data block);
  `TURN_BUDGET_MS` (35000) exported from `server/routes/ai/frontdesk.js`; after the model call the run reads the
  conversation again and, when a person stepped in, sends and writes nothing. `RUN_OUTCOMES` gains `dropped`,
  `superseded`; `RUN_REASONS` gains `taken_over`, `closed`, `lease_lost`, `overtaken`, `follow_up_limit`, each with
  its `asr_reason_*` key; for all of the first four the step marked `stopped` is `send`. Rules R-26, R-27, R-28.
- 754: the wait is quiet-based — `QUIET_MS = 2000` and `MAX_WAIT_MS = 6000`, exported from
  `server/services/inbound.js` (`COALESCE_MS` stays as an alias of `MAX_WAIT_MS`); `FIRST_MODEL_LIMIT_MS = 6000`
  exported from `server/routes/ai/frontdesk.js` (the first model is cut after it and the next one is tried);
  `showTyping` (a "typing…" sign on a channel that has one). No new outcome or reason. Rules R-29, R-30, R-31.
- 755: `publicFacts(db, businessId, { query, context, budget })` in `server/services/knowledge.js` — the six profile
  lines (name, phone, address, service area, opening hours, closed dates) are always sent whole; knowledge items are
  sent whole or not at all inside `MAX_CHARS` = 6,000 (still exported as `MAX_FACTS_CHARS`); when they do not all
  fit, `pickFacts` (`server/services/fact-pick.js`, a script, no model call) picks them by the guest's words and the
  left-out items are written to the run record. No new outcome or reason. One rule row, the next free number after
  R-31.

The approved mock-up says the wait in step 1 is 1.5 s. That is wrong (the Snapshot waits a fixed 6 s; plan 754 makes
it 2 quiet seconds, at most 6). This plan never types a wait length: the page reads both numbers from the server.

## Goals & Success Criteria
**Primary:** on `/frontdesk/assistant` the owner (and a consultant, and the platform admin acting in the business)
sees three tabs — "איך זה עובד", the runs tab of plan 752, and "מה אפשר לשנות". The first shows the 13 steps in order
with a kind tag, what each does, what it reads and what can stop it; the third shows one row per setting with its
value for this business, the steps it affects, who may change it, and a "לשנות" button that opens the real screen or,
when the viewer may not change it, is blocked and says why. The platform admin also sees the code path of each step,
the reason codes and the model order. Nothing on the page can be edited.

- [auto] `pnpm run test:ci` → exit 0, including the new specs
  `src/app/pages/frontdesk/assistant/assistant-flow.data.spec.ts`,
  `src/app/pages/frontdesk/assistant/assistant-settings.data.spec.ts`,
  `src/app/pages/frontdesk/assistant/assistant-settings-value.util.spec.ts`,
  `src/app/pages/frontdesk/assistant/components/flow-map/flow-map.component.spec.ts`,
  `src/app/pages/frontdesk/assistant/components/settings-table/settings-table.component.spec.ts` and the changed
  `src/app/pages/frontdesk/assistant/assistant.page.spec.ts` and
  `src/app/core/services/assistant-run-data.service.spec.ts`.
- [auto] `src/app/pages/frontdesk/assistant/assistant-flow.data.spec.ts`: `FLOW_STEPS.map(s => s.key)` equals `[...RUN_STEP_KEYS]` (same 13 keys, same
  order); every `kind` is `'script'`, `'data'` or `'ai'` and exactly one step has `'ai'` (key `ai`); every entry of
  every `stops` is in `RUN_REASONS`; every entry of `RUN_REASONS` except `'error'` is in the `stops` of at least one
  step; every `code` is a non-empty string; every `facts` entry is a key of `AssistantEngine`.
- [auto] `src/app/pages/frontdesk/assistant/assistant-settings.data.spec.ts`: `SETTING_ROWS.map(r => r.id)` equals the 26 ids of the table under
  "UI/UX Notes", in that order; every `route` of a row equals the `path` of an entry of `routes`
  (`src/app/app.routes.ts`, imported as `src/app/core/guards/pending-changes-routes.spec.ts:3` does) after removing the
  leading `/`; a row has a `route` exactly when its `who` is not `'fixed'`; every entry of every `steps` is in
  `RUN_STEP_KEYS` and no row has an empty `steps`; every row with `value: 'engine'` has an `engineField` that is a key
  of `AssistantEngine`; no row has the id `guard_words_business`.
- [auto] `src/app/pages/frontdesk/assistant/assistant-settings-value.util.spec.ts`: the cases listed under "Tests" (each value kind with a set and a
  not-set input, `business: null`, the model list only for the admin).
- [auto] `src/app/pages/frontdesk/assistant/components/flow-map/flow-map.component.spec.ts`: 13 `flow-step-<key>` buttons in `RUN_STEP_KEYS` order, all with
  `aria-expanded="false"` at first; pressing `flow-step-precheck` opens its panel and shows the four texts of
  `asr_reason_removal`, `asr_reason_keyword`, `asr_reason_outside_hours`, `asr_reason_turn_limit`; pressing
  `flow-step-ai` then closes `precheck` and opens `ai` (one open at a time); with `isAdmin` false there is no
  `flow-code` element and no reason code; with `isAdmin` true the open `guardrails` panel has a `flow-code` element
  containing `applyGuardrails` and the code `unsupported_time`; with `engine` `{ quietMs: 3000, maxWaitMs: 9000, … }` the open
  `inbound` panel has two `flow-engine` lines, the first containing `3` and the second `9`; the open `send` panel
  shows the texts of `asr_reason_send_refused`, `asr_reason_taken_over`, `asr_reason_closed`,
  `asr_reason_lease_lost` and `asr_reason_overtaken`; with `engine` null there is no `flow-engine` line and the step's text
  is still shown; pressing `flow-to-runs` emits `openRuns`; pressing `flow-to-settings` inside an open panel emits
  `openSettings`.
- [auto] `src/app/pages/frontdesk/assistant/components/settings-table/settings-table.component.spec.ts`: 26 `set-row-<id>` rows; an owner sees `set-change-ai_models` with
  `aria-disabled="true"`, pressing it does not call `Router.navigate`, and its hidden reason reads
  `asr_set_why_foodvibe`; a platform admin sees the same button without `aria-disabled`, and pressing it calls
  `navigate(['/dashboard'], { queryParams: { tab: 'metadata' } })`; pressing `set-change-level` calls
  `navigate(['/frontdesk/settings'], { queryParams: undefined })`; with the `tables` module off
  `set-change-floor_plan` has `aria-disabled="true"` and the reason `asr_set_why_tables_off`; the row `guard_words`
  has no `set-change-guard_words` button and shows the tag `asr_set_fixed`; `set-code-guard_words` exists only for the
  admin; while `setupLoaded_()` is false the table is replaced by `app-loader`; with `setupFailed_()` true an
  `app-empty-state` with `asr_set_load_failed` and a retry that calls `loadSetup()` shows; with `business: null` an
  `app-empty-state` with `asr_set_no_profile` shows and its button navigates to `/frontdesk/settings`.
- [auto] `src/app/pages/frontdesk/assistant/assistant.page.spec.ts` (new cases; plan 752's cases stay green): three tab buttons in the order
  `asr-tab-flow`, `asr-tab-runs`, `asr-tab-settings`; with no `tab` query param the runs tab is active and the list
  shows as before; with `?tab=flow` `app-flow-map` shows and `asr-list` does not; with `?tab=settings`
  `app-assistant-settings-table` shows; pressing `asr-tab-settings` calls `Router.navigate` with
  `queryParams: { tab: 'settings' }` and `queryParamsHandling: 'merge'`; pressing `asr-tab-runs` navigates with
  `tab: null`; a route with a run id shows the runs tab whatever `tab` says; `asr-refresh` shows only on the runs tab;
  staff still see `asr_owner_only` and no tab strip.
- [auto] `src/app/core/services/assistant-run-data.service.spec.ts`: `loadSetup()` calls `GET …/assistant-runs/setup` once, fills `setup_`
  and sets `setupLoaded_`; a second call while loaded does not call again unless `loadSetup(true)`; a failed call sets
  `setupFailed_` and keeps `setup_` null.
- [auto] `pnpm run test:server` → exit 0, including the new cases in `server/test/assistant-runs-router.test.js`
  ("plan 756: the setup read") and the new file `server/test/assistant-flow-dictionary.test.js`.
- [auto] `server/test/assistant-runs-router.test.js`, block "plan 756: the setup read": `GET
  /api/v1/assistant-runs/setup` — 401 without a token; 403 for staff; 200 for the owner with `engine.quietMs ===
  require('../services/inbound').QUIET_MS`, `engine.maxWaitMs === MAX_WAIT_MS` (same file), `engine.dailyTurns ===
  FRONTDESK_DAILY_TURNS`, `engine.turnLimit === TURN_LIMIT`, `engine.followUpMax === FOLLOW_UP_MAX`,
  `engine.historyWindow === HISTORY_WINDOW`, `engine.glueMax === GLUE_MAX`, `engine.factsMaxChars ===
  MAX_FACTS_CHARS`, `engine.firstModelMs === require('../routes/ai/frontdesk').FIRST_MODEL_LIMIT_MS`,
  `engine.turnBudgetMs === TURN_BUDGET_MS` (same file), and `Object.keys(engine).length === 10`, each compared with the imported constant and never with a typed number;
  `business` for a seeded profile (level 1, tone `formal`, `handoffText` set, no `activeHours`, two hours rows, phone
  and address set, one enabled kind, two approved public knowledge items, one approved internal, one draft) equals
  `{ level: 1, status: <seeded>, tone: 'formal', handoffTextSet: true, activeHoursSet: false, hoursSet: true,
  profileFieldsFilled: 3, profileFieldsTotal: 4, kindsOn: 1, knowledgeApproved: 3, knowledgePublic: 2, tablesOn:
  false, confirmMode: 'auto' }`; a business without a profile → `business: null`; the answer of the owner has no
  `models` key; the answer of a platform admin has `models` equal to `modelChain()`; another business's knowledge
  items are not counted; the path `setup` is not treated as a run id (the answer is not 404 `Run not found`); the log
  record `assistant_runs.setup_read` carries no value of the profile.
- [auto] `server/test/assistant-flow-dictionary.test.js`: for every key of `RUN_STEP_KEYS` the dictionary
  (`public/assets/data/dictionary.json`, `general`) has `asr_flow_what_<key>` and `asr_flow_reads_<key>`; none of
  those 26 texts contains a digit; for each of the 26 setting ids the key `asr_set_<id>` exists; no `asr_*` text
  contains `1.5`.
- [auto] `pnpm run build` → exit 0.
- [auto] `pnpm --dir server run lint` → exit 0; `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0.
- [auto] `node scripts/inventory.mjs --check` → `INVENTORY: ok`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `http://localhost:4202/frontdesk/assistant?tab=flow` (signed in as the demo restaurant's owner `demo_host`)
  · press the step "בדיקות בטיחות" · the row opens and shows the tag "כלל קבוע", the title "מה יכול לעצור כאן" and
  under it the line "התשובה כללה שעה שלא מופיעה במידע על העסק"; step 8 "שאילת ה-AI" is the only row with the tag
  "AI"; the first step's open row shows a line that starts with "כרגע: העוזר מתחיל לענות אחרי" and no "1.5".
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — here: `http://localhost:4202/frontdesk/assistant?tab=settings` (as `demo_host`); hover the "לשנות" button of the row "מודלי ה-AI והסדר שלהם": the tooltip "רק צוות FoodVibe משנה את ההגדרה הזו. צריך שינוי? דברו איתנו." shows and pressing opens nothing; then press "לשנות" in the row "רמת העוזר": the front desk settings page ("הגדרות") opens, and the browser's Back returns to the assistant page with the tab "מה אפשר לשנות" still open.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: `http://localhost:4202/frontdesk/assistant?tab=settings` while the slot's API server is stopped (the agent stops it for this check and starts it again after); "לא הצלחנו לטעון את ההגדרות" with a "נסה שוב" button appears.

## Execution Mode
- Parallel: no — the plan edits `src/app/pages/frontdesk/assistant/**`, `server/routes/assistant-runs.js` and
  `AssistantRunDataService`, which plan 752 creates and plans 753–755 extend; all four are merged first.
- Concurrent plans: none
- Isolated DB: no — nothing stored changes
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/assistant-setup.js
server/routes/assistant-runs.js
server/test/assistant-runs-router.test.js
server/test/assistant-flow-dictionary.test.js
server/breadcrumbs.md
src/app/core/models/assistant-run.model.ts
src/app/core/models/breadcrumbs.md
src/app/core/services/assistant-run-data.service.ts
src/app/core/services/assistant-run-data.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/pages/frontdesk/assistant/**
src/app/pages/frontdesk/assistant/assistant.page.spec.ts
src/app/pages/frontdesk/assistant/assistant-flow.data.spec.ts
src/app/pages/frontdesk/assistant/assistant-settings.data.spec.ts
src/app/pages/frontdesk/assistant/assistant-settings-value.util.spec.ts
src/app/pages/frontdesk/assistant/components/flow-map/flow-map.component.spec.ts
src/app/pages/frontdesk/assistant/components/settings-table/settings-table.component.spec.ts
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
docs/agent/standards-backend.md
docs/restaurant/restaurant-map.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/workflow-kit/manifest.json
```

Files plans 752–755 also write (all merged before this plan, so there is no parallel edit):
`server/routes/assistant-runs.js`, its test, the model and the service (752); `run-detail.component.scss` (752 only —
753 and 754 edit that component's `.ts` / `.html` / spec, not its stylesheet); `public/assets/data/dictionary.json`,
`server/breadcrumbs.md`, `docs/agent/standards-backend.md`, `docs/restaurant/restaurant-map.md`,
`docs/brain/component-families.md`, `docs/brain/inventory.md` (752–755, append or add a phrase).
`docs/frontdesk/assistant-behaviour-rules.md` is not in scope: this plan changes no behaviour of the assistant, so it
adds no rule row (the last number stays the one plan 755 took after R-31).

New files: `server/services/assistant-setup.js`, `server/test/assistant-flow-dictionary.test.js`, and under
`src/app/pages/frontdesk/assistant/`: `assistant-flow.data.ts` (+ `.spec.ts`), `assistant-settings.data.ts`
(+ `.spec.ts`), `assistant-settings-value.util.ts` (+ `.spec.ts`), `_asr-step.scss`,
`components/flow-map/flow-map.component.{ts,html,scss,spec.ts}`,
`components/settings-table/settings-table.component.{ts,html,scss,spec.ts}`. Every other path exists after plan 752
(the `assistant/` folder, the router, its test, the model and the service are plan 752's) or on the Snapshot.
`src/app/app.routes.ts` and `src/styles.scss` are not edited (no new route, no new `.c-*` class).

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Likely case: a constant this plan reads is no longer exported
after plans 753–755 were built (for example a limit ended up as a local constant) — offer `approved: <that server file>` with the
one-line export. Never offered, the plan needs no change there: `src/app/pages/frontdesk/frontdesk-settings/**`,
`src/app/pages/frontdesk/knowledge/**`, `src/app/pages/frontdesk/floor-plan/**`, `src/app/pages/metadata-manager/**`,
`src/app/pages/platform-dashboard/**` (the target screens are only linked to), `server/utils/permissions.js`,
`src/app/core/services/permission.service.ts`, `src/app/shared/tip/**`, `server/services/frontdesk-turn.js`,
`server/services/inbound.js`.

## Architecture Impact

- INV-1: preserves — the one new read `GET /api/v1/assistant-runs/setup` sits on plan 752's router, takes the business from `scopeFilter(req)` (the signed token) and is authorized with the existing `assertCan(req, res, 'editFrontDesk', …)` (owner; consultant by ADR 0032; the platform admin acting in the business; staff refused); no action or rule is added and `server/utils/permissions.js` and `permission.service.ts` are not edited; `assistant-run-data.service.ts` gains only that read; the admin-only lines of the page (code paths, reason codes) are static text chosen in the browser from `UserService.isPlatformAdmin_`, and the model order is added by the server only when `isPlatformAdmin(req)`.
- INV-2: preserves — `server/services/assistant-setup.js` reads `frontDeskProfiles` and counts `knowledgeItems` only with the caller's `businessId`, and asks `tablesFor(db, businessId)`; it writes nothing and never reads another business or `__master__`.
- INV-6: preserves — no model call is added; the page describes the one AI step and reads the model order from `modelChain()` on the server; no key reaches the browser.

## Reuse Check

- `FlowMapComponent` (`app-flow-map`, `flow-map.component.ts`) — family: assistant-runs — rung: 3 — why: a second view of the same 13 steps on the page plan 752 built; built from existing pieces (`.c-chip--tag`, `c-btn-ghost`, the step row below).
- `SettingsTableComponent` (`app-assistant-settings-table`, `settings-table.component.ts`) — family: assistant-runs — rung: 3 — why: the third tab of the same page; rows are `ul.c-list` + `li.c-list-row` with `.c-grid-header-cell` / `.c-list-body-cell`, as plan 752's runs list.
- `FLOW_STEPS` in `assistant-flow.data.ts` — family: assistant-runs — rung: 3 — why: the fixed description of each step, keyed by plan 752's `RUN_STEP_KEYS`; a test keeps the two lists equal.
- `SETTING_ROWS` in `assistant-settings.data.ts` — family: assistant-runs — rung: 3 — why: the fixed list of settings with their steps, owner and route; nothing in the registry lists them.
- `settingValue`, `changeBlock` in `assistant-settings-value.util.ts` — family: helpers — rung: 3 — why: pure functions that turn the setup read into one labelled value and the reason a button is blocked.
- `assistantSetup(db, businessId, { admin })` in `server/services/assistant-setup.js` — family: assistant-runs — rung: 3 — why: one read-only function beside plan 752's `listRuns` / `loadRun`; kept out of `frontdesk-runs.js` because that file must not require the turn (plan 752, Traps).
- `GET /api/v1/assistant-runs/setup` — family: assistant-runs — rung: 2 — why: one more read on plan 752's router, same middleware and same permission.
- `setup_`, `setupLoaded_`, `setupFailed_`, `loadSetup()` on `AssistantRunDataService` — family: assistant-runs — rung: 2 — why: one more read on the existing service.
- The two new tab buttons — family: chip — rung: 1 — why: two more entries in `AssistantPage.tabs`, drawn by plan 752's `button.c-chip.c-chip--tab` strip.
- The step row that opens and closes in the flow map (`.asr-step`) — family: assistant-runs — rung: 3 — why: the same `button.asr-step` with `aria-expanded` / `aria-controls` as plan 752's run detail; its rules move from `run-detail.component.scss` into the partial `_asr-step.scss` that both stylesheets `@use`, so there is one look and no second copy.
- The moved step-row classes in `_asr-step.scss`: `.asr-steps`, `.asr-step`, `.asr-step-number`, `.asr-step-name`, `.asr-step-time`, `.asr-step-chevron`, `.asr-step-panel`, `.asr-fields`, `.asr-field` — family: assistant-runs — rung: 3 — why: plan 752's classes with their rules unchanged, in a new file.
- The flow map's page-local layout classes `.asr-flow__top`, `.asr-flow__intro`, `.asr-flow__tools`, `.asr-flow__text`, `.asr-flow__engine`, `.asr-flow__stops`, `.asr-flow__settings`, `.asr-flow__code` — family: assistant-runs — rung: 3 — why: spacing and text of this one tab; the controls and tags are engine classes.
- The settings table's page-local layout classes `.asr-set__intro`, `.asr-set__table`, `.asr-set__head`, `.asr-set__list`, `.asr-set__row`, `.asr-set__name`, `.asr-set__line`, `.asr-set__code`, `.asr-set__change`, `.asr-set__steps`, `.asr-set__who`, `.asr-set__who--fixed`, `.asr-set__action` — family: assistant-runs — rung: 3 — why: the columns of this one table over the `.c-list` engine.
- The kind tag (script / data / AI), the "who may change" tag and the "fixed" tag — family: chip — rung: 1 — why: `span.c-chip.c-chip--tag.c-chip--sm` with the tones `--glass`, `--teal`, `--amber`.
- The "לשנות" button, also when blocked — family: tooltip — rung: 1 — why: `button.c-btn-ghost` with `[appTip]` and `aria-disabled="true"` plus a `.visually-hidden` reason, exactly as `zone-panel.component.html:147-161`; no new tooltip piece.
- The links "to the runs" and "to all settings" — family: engine-classes — rung: 1 — why: `button.c-btn-ghost` / `c-btn-ghost--sm`.

## Adopt Check
- none — why: no rung-4 row and no `package.json` change.

## Defaults

- loading-and-error-states — applies — how: `app-loader` (`src/app/shared/loader/`) while the setup read is on its way; `app-empty-state` with `ctaLabelKey="retry"` when it fails (`asr_set_load_failed`); the flow map is static text and shows at once — a failed setup read only hides its "current value" lines
- empty-state-on-list — exception — why: both lists are fixed lists from constants and are never empty; the one "nothing to show" case (the business has no front desk profile yet) shows `app-empty-state` with a button to the settings page
- app-list-container — exception — why: the settings table is one of three tab panels inside a page that already has its `app-page-header` and tab strip, and `app-list-shell` draws a header of its own and brings search, sort and selection that a fixed list of 26 rows does not need; the rows are still `.c-list-row`, each on a single line at every width (phone: name, value, button)
- one-breakpoint-set — applies — how: the two new stylesheets use `$break-tablet-max` and `$break-phone-max` only (`@use '…/core/styles/breakpoints' as *`)
- hints-in-tooltips — applies — how: the reason a "לשנות" button is blocked and the meaning of the "קבוע במערכת" tag show through `[appTip]` (family `tooltip`, plan 699), never as text in the row and never a native `title`
- anchored-popup — exception — why: no new floating box is built; the only one is the bubble of the existing `[appTip]` (plan 699), which `placeInViewport` already places
- leave-and-return — exception — why: the page holds nothing the user typed; "לשנות" opens the target screen at its top and the browser's Back returns to the same tab because the tab is in the address (`?tab=settings`); the target screens take no return address today
- unsaved-changes-on-leave — exception — why: a read-only page with no field
- confirm-destructive-action — exception — why: nothing on the two tabs deletes or discards
- unit-dropdown-add — exception — why: no unit-of-measure dropdown

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Plans 751–755 are expected drift. Check by symbol and adapt without stopping:
- Plan 752: `AssistantPage` (`tabs`, `activeTab_`, `allowed_`, the admin signal its template calls `isAdmin_()` — if the
  class has no `isAdmin_`, add `protected readonly isAdmin_ = this.user.isPlatformAdmin_`), `RUN_STEP_KEYS`,
  `RUN_REASONS`, `reasonKey`, the `asr_step_*` / `asr_reason_*` keys, `button.asr-step` and its classes,
  `server/routes/assistant-runs.js` with `GET /` and `GET /:id`, `AssistantRunDataService`.
- `RUN_REASONS` after plans 752 and 753 has 26 entries; the `stops` column of section 3 places every one except
  `error`. If plan 751 or a later fix added another reason, the coverage test fails: find the step that raises it in
  the recorder calls of `frontdesk-turn.js`, add it to that step's `stops`, and log one `behaviour:` line.
- The ten engine constants by their exported names: `QUIET_MS`, `MAX_WAIT_MS` (`inbound.js`, plan 754),
  `FRONTDESK_DAILY_TURNS` (`frontdesk-turn.js`), `TURN_LIMIT`, `FOLLOW_UP_MAX` (`frontdesk-guardrails.js`, plan 753),
  `HISTORY_WINDOW`, `GLUE_MAX` (`frontdesk-prompt.js`, plan 753), `MAX_FACTS_CHARS` (`knowledge.js`),
  `FIRST_MODEL_LIMIT_MS`, `TURN_BUDGET_MS` (`routes/ai/frontdesk.js`, plans 754 and 753). A renamed one: use the new
  name and keep the engine field's name. One that is no longer exported: offer `approved: <that file>` for the
  one-line export.
- The step sentences against the built code: `asr_flow_what_inbound` (the quiet wait and the follow-up, plans 753 /
  754), `asr_flow_what_facts` (the always-sent profile lines and the pick, plan 755), `asr_flow_what_send` (nothing
  is sent after a person stepped in, plan 753). A sentence that is no longer true is reworded, without a number, and
  logged as a `behaviour:` line.

## User Stories
- As a restaurant owner, I want to see the steps every guest message goes through in plain words, so that I know which part is a fixed rule, which part is my own data and which single part is AI.
- As a restaurant owner, I want one list of everything that shapes my assistant's answers with a button to the place where I change it, so that I fix a weak answer myself instead of asking for help.
- As a restaurant owner, I want a blocked button to tell me why it is blocked, so that I know whom to ask.
- As the platform admin helping a restaurant, I want the code path of each step, the reason codes and the model order on the same screen, so that I find the cause of a wrong answer without opening the code.

## Functional Requirements

### Must Have (P0)

**1. The setup read — `server/services/assistant-setup.js` (new), `server/routes/assistant-runs.js`**
- [ ] `assistant-setup.js` (CommonJS, `'use strict'`, semicolons as the neighbouring services). File comment: "Plan
  756: what the assistant page shows about how the assistant is set up — the engine's fixed numbers, read from the
  constants the turn itself uses, and this business's own values. Read-only; logs carry no profile value." Export
  `assistantSetup`.
- [ ] `async function assistantSetup(db, businessId, { admin = false } = {})` returns
  `{ engine, business, models? }`:
  - `engine = { quietMs: QUIET_MS, maxWaitMs: MAX_WAIT_MS, dailyTurns: FRONTDESK_DAILY_TURNS, turnLimit:
    TURN_LIMIT, followUpMax: FOLLOW_UP_MAX, historyWindow: HISTORY_WINDOW, glueMax: GLUE_MAX, factsMaxChars:
    MAX_FACTS_CHARS, firstModelMs: FIRST_MODEL_LIMIT_MS, turnBudgetMs: TURN_BUDGET_MS }` — required from `./inbound`
    (`QUIET_MS`, `MAX_WAIT_MS`), `./frontdesk-turn`, `./frontdesk-guardrails` (`TURN_LIMIT`, `FOLLOW_UP_MAX`),
    `./frontdesk-prompt` (`HISTORY_WINDOW`, `GLUE_MAX`), `./knowledge`, `../routes/ai/frontdesk`
    (`FIRST_MODEL_LIMIT_MS`, `TURN_BUDGET_MS`). `RUN_LEASE_MS` (plan 753) is not shown: it is a safety timer, not
    something a guest or an owner meets.
  - `business`: `null` when `db.collection('frontDeskProfiles').findOne({ businessId })` finds nothing; else
    `{ level, status, tone, handoffTextSet, activeHoursSet, hoursSet, profileFieldsFilled, profileFieldsTotal: 4,
    kindsOn, knowledgeApproved, knowledgePublic, tablesOn, confirmMode }` where `level` =
    `profile.assistant?.level ?? 0`; `status` = `profile.status ?? 'draft'`; `tone` = `'formal'` when
    `profile.assistant?.tone === 'formal'`, else `'warm'` (the rule of `buildTurnBody`); `handoffTextSet` =
    the trimmed `assistant.handoffText` is not empty; `activeHoursSet` = `assistant.activeHours` is a non-empty array
    (the rule of `preCheck`); `hoursSet` = `profile.hours` is a non-empty array; `profileFieldsFilled` = how many of
    `displayName`, `phone`, `address`, `serviceArea` are non-empty strings; `kindsOn` = the number of entries of
    `profile.requestKinds` with `enabled === true`; `knowledgeApproved` = `countDocuments({ businessId, status:
    'approved', deletedAt: { $exists: false } })` on `knowledgeItems`; `knowledgePublic` = the same with
    `visibility: 'public'` (the filter of `publicFacts`); `tablesOn` = `!!(await tablesFor(db, businessId))`
    (`./frontdesk-tables`); `confirmMode` = `tableServiceOf(profile).confirmMode`
    (`../generated/schemas/front-desk/table-service`).
  - `models` = `[...modelChain()]` (`./gemini-client`) only when `admin` is true; the key is absent otherwise.
- [ ] `server/routes/assistant-runs.js`: `router.get('/setup', …)` declared BEFORE `router.get('/:id', …)`. The
  handler follows the file's pattern: `const { businessId } = scopeFilter(req)`, `if (!assertCan(req, res,
  'editFrontDesk', { type: 'assistantRuns' })) return`, then `res.json(await assistantSetup(db, businessId, { admin:
  isPlatformAdmin(req) }))` and `req.log.info({ event: 'assistant_runs.setup_read', hasProfile: !!out.business })`.
  Failure: `req.log.error({ err, event: 'assistant_runs.setup.failed' })` and 500 `{ error: 'Server error' }`. No
  query input is read.

**2. The browser's model and service — `src/app/core/models/assistant-run.model.ts`,
`src/app/core/services/assistant-run-data.service.ts`**
- [ ] The model file gains:

```ts
export interface AssistantEngine {
  quietMs: number
  maxWaitMs: number
  dailyTurns: number
  turnLimit: number
  followUpMax: number
  historyWindow: number
  glueMax: number
  factsMaxChars: number
  firstModelMs: number
  turnBudgetMs: number
}
export interface AssistantBusinessSetup {
  level: 0 | 1 | 2
  status: string
  tone: 'warm' | 'formal'
  handoffTextSet: boolean
  activeHoursSet: boolean
  hoursSet: boolean
  profileFieldsFilled: number
  profileFieldsTotal: number
  kindsOn: number
  knowledgeApproved: number
  knowledgePublic: number
  tablesOn: boolean
  confirmMode: 'auto' | 'manual'
}
export interface AssistantSetup {
  engine: AssistantEngine
  business: AssistantBusinessSetup | null
  models?: string[]
}
```
- [ ] The service gains the readonly signals `setup_` (`AssistantSetup | null`), `setupLoaded_` (boolean),
  `setupFailed_` (boolean) and `async loadSetup(force = false): Promise<void>`: returns at once when `setupLoaded_()`
  and not `force`; otherwise `GET ${API.assistantRuns}/setup` (the address plan 752 added to `http-storage.adapter.ts`),
  on success sets `setup_`, clears `setupFailed_`, sets `setupLoaded_`; on failure sets `setupFailed_` true, leaves
  `setup_` as it was and `setupLoaded_` false, and logs through `LoggingService` with the event
  `assistant_runs.setup.failed` and the HTTP status only.

**3. The step content — `src/app/pages/frontdesk/assistant/assistant-flow.data.ts` (new)**
- [ ] Exports:

```ts
export type FlowKind = 'script' | 'data' | 'ai'
export interface FlowStep {
  key: RunStepKey
  kind: FlowKind
  /** Reasons (entries of RUN_REASONS) this step can stop a run with. */
  stops: readonly string[]
  /** Engine numbers shown as "current value" lines under the step. */
  facts: readonly (keyof AssistantEngine)[]
  /** Where the step runs; shown to the platform admin only. Code, never translated. */
  code: string
}
export const FLOW_STEPS: readonly FlowStep[]
export const flowWhatKey = (key: RunStepKey): string => 'asr_flow_what_' + key
export const flowReadsKey = (key: RunStepKey): string => 'asr_flow_reads_' + key
```
- [ ] `FLOW_STEPS`, in this order (the order of `RUN_STEP_KEYS`):

| key | kind | stops | facts | code |
| --- | --- | --- | --- | --- |
| `inbound` | script | — | `quietMs`, `maxWaitMs` | `server/services/inbound.js · afterStored, nextStep · server/services/frontdesk-lease.js · takeLease, noteWaiting` |
| `setup` | data | — | — | `server/services/frontdesk-turn.js · runTurnInner (frontDeskProfiles, turnProfile)` |
| `limit` | script | `quota` | `dailyTurns` | `server/services/frontdesk-turn.js · FRONTDESK_DAILY_TURNS (aiUsage)` |
| `history` | data | — | `historyWindow` | `server/services/frontdesk-prompt.js · HISTORY_WINDOW` |
| `precheck` | script | `removal`, `keyword`, `outside_hours`, `turn_limit`, `follow_up_limit` | `turnLimit`, `followUpMax` | `server/services/frontdesk-guardrails.js · preCheck, isRemoval · server/constants/frontdesk-guard-words.js` |
| `facts` | data | — | `factsMaxChars` | `server/services/knowledge.js · publicFacts · server/services/fact-pick.js · pickFacts · server/services/frontdesk-tables.js · tablesFor` |
| `prompt` | script | — | `glueMax` | `server/services/frontdesk-prompt.js · buildTurnBody, unansweredTail` |
| `ai` | ai | `busy`, `timeout`, `quota`, `other` | `firstModelMs`, `turnBudgetMs` | `server/routes/ai/frontdesk.js · askTurnModel · server/services/gemini-client.js · callGemini` |
| `shape` | script | `other` | — | `shared/schemas/front-desk/turn-answer.schema.ts · askTurnModel (one retry)` |
| `guardrails` | script | `model`, `low_content`, `internals`, `invented_link`, `deferred`, `completion_claim`, `unsupported_time`, `table_number`, `unsupported_price` | — | `server/services/frontdesk-guardrails.js · applyGuardrails` |
| `tables` | script | `table_engine` | — | `server/services/frontdesk-tables.js · handleTableIntent · shared/schemas/front-desk/table-engine.ts` |
| `decide` | script | `open_request` | — | `server/services/frontdesk-turn.js · decide` |
| `send` | script | `send_refused`, `taken_over`, `closed`, `lease_lost`, `overtaken` | — | `server/services/frontdesk-turn.js · handOff, holdGuest, removeGuest, finishSuggestion · server/services/frontdesk-lease.js · leaseCheck · server/services/outbound.js · sendOut` |

  `error` (an unexpected failure anywhere) belongs to no step and is left out on purpose. Where plan 753's reasons
  sit: `follow_up_limit` is a stop of `preCheck`, so `precheck`; `taken_over`, `closed` and `lease_lost` (the
  re-check after the model call, run `dropped`) and `overtaken` (run `superseded`) are recorded by plan 753 as the
  `send` step `stopped` with `action: 'none'`, so `send` — the same step plan 752's verdict sentence names for them.
  Plans 754 and 755 add no reason.

**4. The settings content — `assistant-settings.data.ts`, `assistant-settings-value.util.ts` (new)**
- [ ] `assistant-settings.data.ts` exports:

```ts
export type SettingWho = 'owner' | 'foodvibe' | 'fixed'
export type SettingValueKind =
  | 'hours' | 'profile_fields' | 'knowledge_approved' | 'knowledge_public' | 'level' | 'handoff_text' | 'tone'
  | 'active_hours' | 'request_kinds' | 'confirm_mode' | 'tables' | 'models' | 'engine' | 'none'
export interface SettingRow {
  id: string
  steps: readonly RunStepKey[]
  who: SettingWho
  /** The screen where it is changed; absent for a fixed row. Starts with '/'. */
  route?: string
  queryParams?: Record<string, string>
  /** The target screen exists only with this module. */
  needsModule?: 'tables'
  value: SettingValueKind
  engineField?: keyof AssistantEngine
  /** Where a fixed row lives in the code; shown to the platform admin only. */
  code?: string
}
export const SETTING_ROWS: readonly SettingRow[]
export const settingNameKey = (id: string): string => 'asr_set_' + id
```
- [ ] `SETTING_ROWS`: the 26 rows of the table under "UI/UX Notes" ("The settings rows"), in that order, with exactly
  those ids, steps, who, route, query params, module, value kind, engine field and code.
- [ ] `assistant-settings-value.util.ts` exports two pure functions:
  - `settingValue(row, setup, isAdmin)` → `{ key: string; params?: Record<string, string | number> } | { text:
    string } | null`. `setup` null → null. By `row.value`:
    `hours` → `asr_val_set` / `asr_val_not_set` from `business.hoursSet`;
    `profile_fields` → `asr_val_filled` with `{ n: profileFieldsFilled, total: profileFieldsTotal }`;
    `knowledge_approved` → `asr_val_items` `{ n: knowledgeApproved }`;
    `knowledge_public` → `asr_val_public` `{ n: knowledgePublic }`;
    `level` → `fd_assistant_choice_0` / `fd_assistant_choice_1`, and `fd_assistant_level_2` for 2 (existing keys);
    `handoff_text` → `asr_val_custom` when `handoffTextSet`, else `asr_val_default_text`;
    `tone` → `fd_tone_warm` / `fd_tone_formal` (existing keys);
    `active_hours` → `asr_val_hours_set` when `activeHoursSet`, else `asr_val_any_hour`;
    `request_kinds` → `asr_val_kinds` `{ n: kindsOn }`;
    `confirm_mode` → `asr_val_tables_off` when `!tablesOn`, else `fd_ts_mode_auto` / `fd_ts_mode_manual` (existing);
    `tables` → `asr_val_tables_on` / `asr_val_tables_off`;
    `models` → `{ text: setup.models.join(' → ') }` only when `isAdmin` and `setup.models?.length`, else null;
    `engine` → `{ key: 'asr_engine_val_' + row.engineField, params: { n } }` where `n` is the engine number, and for
    a field whose name ends in `Ms` the seconds (the number / 1000, at most one decimal, no trailing `.0`);
    `none` → null. Every kind that reads `business` returns null when `business` is null.
  - `changeBlock(row, { isAdmin, tablesModule })` → `'asr_set_why_foodvibe'` when `row.who === 'foodvibe'` and not
    `isAdmin`; `'asr_set_why_tables_off'` when `row.needsModule === 'tables'` and not `tablesModule`; else `null`.
    (Never called for a fixed row: it has no button.)

**5. The flow map tab — `components/flow-map/` (new)**
- [ ] `FlowMapComponent` (`app-flow-map`, standalone, `OnPush`, signals only, `inject()`): inputs `engine =
  input<AssistantEngine | null>(null)`, `isAdmin = input(false)`; outputs `openRuns = output<void>()`, `openSettings =
  output<void>()`; state `open_ = signal<RunStepKey | null>(null)`; `toggle(key)` sets `open_` to the key, or to null
  when it is already open (one open row at a time); `steps = FLOW_STEPS`; `settingsOf(key)` = the `SETTING_ROWS` whose
  `steps` include the key (a `computed` map built once); `engineLine(step, fact)` = `{ key: 'asr_engine_' + fact,
  n }` with the same seconds rule as `settingValue`, or null when `engine()` is null.
- [ ] Template, top to bottom, inside `section.asr-flow` (`data-testid="asr-flow"`):
  - `p.asr-flow__intro` — `asr_flow_intro` with `{n}` = `steps.length`; beside it the legend: the three kind tags
    (`asr_kind_script`, `asr_kind_data`, `asr_kind_ai`), and a `button.c-btn-ghost` (`data-testid="flow-to-runs"`,
    icon `activity`, label `asr_flow_to_runs`) that emits `openRuns`.
  - `ol.asr-steps` — for each step one `li` with `button.asr-step` (`type="button"`,
    `[attr.aria-expanded]="open_() === step.key"`, `[attr.aria-controls]="'flow-panel-' + step.key"`,
    `[attr.data-testid]="'flow-step-' + step.key"`): the step number (1–13), the name (`asr_step_<key>`, plan 752's
    key), the kind tag (`span.c-chip.c-chip--tag.c-chip--sm`: `script` `--glass`, `data` `--teal`, `ai` `--amber`,
    `data-testid="flow-kind"`), a `chevron-down` icon.
  - The open panel `div[id]="'flow-panel-' + step.key"` (rendered only when open) holds, in this order:
    `p` — the sentence `asr_flow_what_<key>`; for each `step.facts` with a loaded engine one `p.asr-flow__engine`
    (`data-testid="flow-engine"`) — `asr_engine_<fact>` with `{n}`; a `dl.asr-fields` with: `dt` `asr_flow_reads` /
    `dd` `asr_flow_reads_<key>`; `dt` `asr_flow_stops` / `dd` — when `step.stops` is empty the text
    `asr_flow_stops_none`, else a `ul` with one `li` per reason: the text `reasonKey(reason) | translatePipe` and, for
    the admin only, `code dir="ltr"` with the reason itself (`data-testid="flow-reason-code"`); when
    `settingsOf(step.key)` is not empty: `dt` `asr_flow_settings` / `dd` — the names (`asr_set_<id>`) joined by " · "
    and a `button.c-btn-ghost--sm` (`data-testid="flow-to-settings"`, label `asr_flow_to_settings`) that emits
    `openSettings`; for the admin only: `dt` `asr_flow_code` / `dd` `code dir="ltr" data-testid="flow-code"` with
    `step.code`.
  - No example input or output, and no JSON, for anyone.
- [ ] Keyboard: the row is a native button (Enter / Space toggle); the shared focus ring applies.
- [ ] `flow-map.component.scss`: `@use '../../asr-step'` (the partial of section 7) and
  `@use '…/core/styles/breakpoints' as *`; logical properties and tokens only; no typed transition time; no
  `overflow: auto | scroll`. The list is one column at every width (an accordion on the phone and on the desktop);
  the legend wraps under the intro under `$break-phone-max`.

**6. The settings tab — `components/settings-table/` (new)**
- [ ] `SettingsTableComponent` (`app-assistant-settings-table`, standalone, `OnPush`): injects
  `AssistantRunDataService`, `ModuleService`, `Router`, `TranslationService`; input `isAdmin = input(false)`; `rows =
  SETTING_ROWS`; `setup_ = data.setup_`; `tablesModule_ = computed(() => modules.has('tables'))`; `view_ = computed`
  → for each row `{ row, value: settingValue(row, setup_(), isAdmin()), block: row.who === 'fixed' ? null :
  changeBlock(row, { isAdmin: isAdmin(), tablesModule: tablesModule_() }) }`; `stepNames(row)` = the row's steps as
  "`<number>`. `<asr_step_key>`" joined by " · " (the number is the key's place in `RUN_STEP_KEYS` + 1);
  `change(item)`: when `item.block` → nothing (the tip shows); else `void router.navigate([item.row.route],
  { queryParams: item.row.queryParams })`; `retry()` → `data.loadSetup(true)`. The constructor calls
  `void data.loadSetup()`.
- [ ] Template inside `section.asr-set` (`data-testid="asr-set"`):
  - `!data.setupLoaded_() && !data.setupFailed_()` → `app-loader size="medium"`.
  - `data.setupFailed_()` → `app-empty-state messageKey="asr_set_load_failed" icon="settings" ctaLabelKey="retry"
    (ctaClick)="retry()"` (`data-testid="set-failed"`).
  - `setup_()?.business === null` → `app-empty-state messageKey="asr_set_no_profile" icon="settings"
    ctaLabelKey="asr_set_go_settings"` whose click navigates to `/frontdesk/settings` (`data-testid="set-no-profile"`).
  - else: `p.asr-set__intro` — `asr_set_intro`; a header row `div.asr-set__head` (hidden under `$break-phone-max`,
    `aria-hidden="true"`) with five `.c-grid-header-cell`: `asr_set_col_name`, `asr_set_col_value`,
    `asr_set_col_steps`, `asr_set_col_who`, and an empty one; then `ul.c-list role="list"` with one
    `li.c-list-row.asr-set__row` per row (`[attr.data-testid]="'set-row-' + row.id"`), five `.c-list-body-cell`:
    1. the name `asr_set_<id>` (one line, ellipsis) and, for the admin and a row with `code`, under it
       `code dir="ltr"` (`[attr.data-testid]="'set-code-' + row.id"`, small, muted, one line);
    2. the value: `value.key | translatePipe` with its params replaced, or `value.text` in a `span dir="ltr"`, or
       `asr_val_none` ("—") when null (`[attr.data-testid]="'set-value-' + row.id"`);
    3. `stepNames(row)` (hidden under `$break-tablet-max`);
    4. the "who" tag `span.c-chip.c-chip--tag.c-chip--sm`: `owner` `--teal` `asr_who_owner`; `foodvibe` `--amber`
       `asr_who_foodvibe`; `fixed` `--glass` `asr_set_fixed` with `[appTip]="'asr_set_why_fixed' | translatePipe"`
       and `tabindex="0"` (hidden under `$break-phone-max` for `owner` and `foodvibe`; the `fixed` tag stays, in the
       button's place);
    5. for a row with a route: `button type="button" class="c-btn-ghost asr-set__change"`
       (`[attr.data-testid]="'set-change-' + row.id"`, icon `pencil`, label `asr_set_change`,
       `[attr.aria-label]` = `asr_set_change` + ": " + the row's name, `[attr.aria-disabled]="item.block ? 'true' :
       null"`, `[appTip]="item.block ? (item.block | translatePipe) : null"`, `[attr.aria-describedby]="item.block ?
       'set-why-' + row.id : null"`, `(click)="change(item)"`) and, when blocked, `span.visually-hidden
       [id]="'set-why-' + row.id"` with the same reason text; a fixed row has no button.
- [ ] `settings-table.component.scss`: `.asr-set__head` and `.asr-set__row` share one grid
  (`minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 1.6fr) auto auto`; under `$break-tablet-max` the steps column is
  dropped; under `$break-phone-max` `minmax(0, 1fr) auto auto`: name, value, button or fixed tag); every cell is one
  line with an ellipsis; `.asr-set__change[aria-disabled='true']` looks disabled (`opacity: 0.45`, `cursor:
  not-allowed`, no hover change) but keeps hover, focus and tap so its tip shows; logical properties and tokens only;
  no `overflow: auto | scroll`.

**7. One look for the step row — `_asr-step.scss` (new), `components/run-detail/run-detail.component.scss`**
- [ ] The rules of `.asr-steps`, `.asr-step` (and its parts and states) and `.asr-fields` move unchanged from
  `run-detail.component.scss` into `src/app/pages/frontdesk/assistant/_asr-step.scss`; `run-detail.component.scss`
  gets `@use '../../asr-step'` in their place. No rule text changes and `run-detail.component.html` is not edited, so
  plan 752's run detail looks and tests the same. If plan 752 named these classes differently, move the rules that
  style the collapsible step row and its field list, whatever their names, and use those names in the flow map.

**8. The page — `assistant.page.{ts,html,scss,spec.ts}`**
- [ ] `tabs` becomes, in this order: `{ key: 'flow', labelKey: 'asr_tab_flow', icon: 'list-checks' }`, the existing
  `runs` entry, `{ key: 'settings', labelKey: 'asr_tab_settings', icon: 'pencil' }`; export `type AssistantTab =
  'flow' | 'runs' | 'settings'`.
- [ ] `activeTab_` becomes a `computed`: `'runs'` when the route has a run id (`id_()`); else the `tab` query param
  when it is `'flow'` or `'settings'`; else `'runs'`. (The query params come from `ActivatedRoute.queryParamMap`
  through `toSignal`, beside plan 752's read of `scope`.) `setTab(tab: AssistantTab)`: `void
  router.navigate(['/frontdesk/assistant'], { queryParams: { tab: tab === 'runs' ? null : tab }, queryParamsHandling:
  'merge', replaceUrl: true })` — `scope=test` is kept. Each tab button gets `[attr.aria-selected]`,
  `[class.active]`, `(click)="setTab(tab.key)"` and `data-testid="asr-tab-<key>"`.
- [ ] The tab panel: `@switch (activeTab_())` — `'runs'` → plan 752's `div.asr-body` unchanged; `'flow'` →
  `<app-flow-map [engine]="data.setup_()?.engine ?? null" [isAdmin]="isAdmin_()" (openRuns)="setTab('runs')"
  (openSettings)="setTab('settings')" />`; `'settings'` → `<app-assistant-settings-table [isAdmin]="isAdmin_()" />`.
  An `effect` calls `data.loadSetup()` when the active tab is `flow` or `settings` (the flow map shows at once and its
  "current value" lines appear when the read answers; a failed read leaves them out and shows no error there).
- [ ] Plan 752's list `effect` (`data.list(…)`) runs only while the runs tab is active, so opening the page on another
  tab makes no runs request; switching to the runs tab loads the list as before. The header's `asr-refresh` button is
  rendered only on the runs tab.
- [ ] Not allowed (`!allowed_()`) → plan 752's `asr_owner_only` empty state and nothing else, as today: no tab strip.
- [ ] `assistant.page.scss`: nothing but spacing for the two new panels, if needed.

**9. Dictionary — `public/assets/data/dictionary.json`** (append only, in `general`): every key of the tables under
"UI/UX Notes".

**10. Maps and docs**
- [ ] `server/breadcrumbs.md`: a row for `services/assistant-setup.js` ("`assistantSetup` (plan 756): the engine's
  fixed numbers and one business's own values for the assistant page; read-only") and "plan 756: `GET /setup`" on the
  row of `routes/assistant-runs.js`.
- [ ] `src/app/pages/breadcrumbs.md`: the `frontdesk/assistant/` row gains "plan 756: tabs 'how it works'
  (`app-flow-map`, `FLOW_STEPS`) and 'what you can change' (`app-assistant-settings-table`, `SETTING_ROWS`); the tab
  is in the address (`?tab=flow|settings`)". `src/app/core/services/breadcrumbs.md` and
  `src/app/core/models/breadcrumbs.md`: the rows of the service and the model gain "plan 756: the setup read".
- [ ] `docs/agent/standards-backend.md`: the API table gets `GET /api/v1/assistant-runs/setup` (owner, consultant,
  acting platform admin; read-only; `models` only for the platform admin).
- [ ] `docs/restaurant/restaurant-map.md`, at the end of "Contract extensions (run)" (after plan 755's line):
  `756 · C-RUNS · GET /api/v1/assistant-runs/setup (editFrontDesk) returns { engine { quietMs, maxWaitMs, dailyTurns,
  turnLimit, followUpMax, historyWindow, glueMax, factsMaxChars, firstModelMs, turnBudgetMs }, business | null,
  models? (platform admin only) }, every engine number read from the constant the turn uses; the assistant page shows
  them in the tabs "how it works" (FLOW_STEPS, one entry per RUN_STEP_KEYS key) and "what you can change"
  (SETTING_ROWS); no rule of the assistant changes · the Human's approved mock-up of 2026-11-26`.
- [ ] `docs/brain/component-families.md`, family `assistant-runs`: Use gains `app-flow-map`,
  `app-assistant-settings-table`, `FLOW_STEPS`, `SETTING_ROWS`, `settingValue`, `changeBlock`, `assistantSetup`, the
  partial `_asr-step.scss`; When gains "a new step is added to `RUN_STEP_KEYS` AND `FLOW_STEPS` (a test keeps them
  equal); a new setting that shapes the assistant is one more row of `SETTING_ROWS`; a number of the engine is shown
  only through the setup read, never typed into a text". Then `node scripts/inventory.mjs` and commit
  `docs/brain/inventory.md` if it changed.

**11. Tests** (beyond the Done-when items above)
- [ ] `src/app/pages/frontdesk/assistant/assistant-settings-value.util.spec.ts`: `setup` null → null for every row; `business` null → null for every
  row that reads the business and a value for the engine rows; `hours` set / not set; `profile_fields` → params
  `{ n: 3, total: 4 }`; `level` 0, 1, 2 → the three keys; `handoff_text` set / not; `tone` both; `active_hours` set →
  `asr_val_hours_set`, not set → `asr_val_any_hour`; `confirm_mode` with `tablesOn: false` → `asr_val_tables_off`,
  with `tablesOn: true` and `manual` → `fd_ts_mode_manual`; `models` → null for the owner even when `models` is in the
  data, `{ text: 'a → b' }` for the admin; `engine` with `quietMs: 2000` → params `{ n: 2 }`, `firstModelMs: 2500` →
  `{ n: 2.5 }`; `changeBlock` for the four combinations of the two rules.
- [ ] The settings table's spec and the flow map's spec: provide `TipDirective` as it is (no stub);
  the tooltip itself is plan 699's tested piece — these specs check `aria-disabled`, the hidden reason text and that
  navigation is not called.
- [ ] The accordion at phone width is the same markup at every width, so the spec needs no viewport change.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: recipe-list — `/frontdesk/assistant` (the frame of plan 752 is unchanged: `app-page-header`, the tab
  strip in `app-scroll-rail`, one panel under it; this plan adds two panels. "מה אפשר לשנות" is a fixed list of
  `.c-list-row` rows with a header row; "איך זה עובד" is an ordered list of rows that open in place). States:
  loading — `app-loader` in the settings panel; error — `app-empty-state` with retry; no front desk profile —
  `app-empty-state` with a button to the settings page; no permission — plan 752's lock state; phone — the page
  scrolls as a whole, the tab strip scrolls sideways in its rail, every settings row stays on one line.
- Behaviour: sideways-row (the tab strip stays in plan 752's `app-scroll-rail`); tooltip (every hint through
  `[appTip]`); keyboard-focus (the shared ring; rows and buttons are native buttons); motion (no typed time; the
  chevron uses plan 752's rule from the partial).
- Hebrew, RTL; logical CSS properties only. Code paths, reason codes and model names are `dir="ltr"` and are not
  translated (they are identifiers, shown to the platform admin only).
- Plain words for an owner: no JSON, no field name, no file name in the owner's view.
- Icons: `list-checks`, `pencil`, `activity`, `chevron-down`, `settings` — all registered in
  `src/app/app.config.ts` on the Snapshot; no new icon.
- Data flow: `AssistantRunDataService.setup_` (one read) → `SettingsTableComponent.view_` (`computed`: value and block
  per row) → the template; `setup_().engine` → `app-flow-map` input → `engineLine` → the template;
  `ActivatedRoute` query param `tab` → `AssistantPage.activeTab_` (`computed`) → `@switch`.
- Nothing sensitive is shown: no key, no secret, no other business's data. The owner's view has numbers of the engine
  (the ten of `AssistantEngine`) and his own business's values; the admin's view
  adds file and function names, reason codes and model names.

**The settings rows** (`SETTING_ROWS`, in this order; name key `asr_set_<id>`):

| id | Hebrew name | steps | who | route (query) | module | value | engine field / code (admin) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hours` | שעות פתיחה וימים סגורים | `facts`, `guardrails` | owner | `/frontdesk/settings` | — | `hours` | — |
| `profile_facts` | שם העסק, טלפון, כתובת ואזור שירות | `facts`, `guardrails` | owner | `/frontdesk/settings` | — | `profile_fields` | — |
| `knowledge` | מידע על העסק: שאלות ותשובות (חניה, תפריט, כשרות…) | `facts`, `guardrails` | owner | `/frontdesk/knowledge` | — | `knowledge_approved` | — |
| `knowledge_public` | אילו פריטי מידע גלויים לאורחים | `facts` | owner | `/frontdesk/knowledge` | — | `knowledge_public` | — |
| `level` | רמת העוזר: עונה לבד או רק מכין טיוטות | `setup`, `send` | owner | `/frontdesk/settings` | — | `level` | — |
| `handoff_text` | המשפט שנשלח כשהשיחה עוברת לצוות או כשיש תקלה | `send` | owner | `/frontdesk/settings` | — | `handoff_text` | — |
| `tone` | סגנון הדיבור של העוזר | `prompt` | owner | `/frontdesk/settings` | — | `tone` | — |
| `active_hours` | השעות שבהן העוזר עונה | `precheck` | owner | `/frontdesk/settings` | — | `active_hours` | — |
| `request_kinds` | סוגי הבקשות והשאלות של כל סוג | `prompt`, `decide` | owner | `/frontdesk/settings` | — | `request_kinds` | — |
| `table_rules` | כללי הזמנת שולחן: אישור, משך ישיבה, גודל קבוצה | `tables` | owner | `/frontdesk/settings` | `tables` | `confirm_mode` | — |
| `floor_plan` | מפת המקום והשולחנות | `facts`, `tables` | owner | `/frontdesk/floor-plan` | `tables` | `tables` | — |
| `ai_models` | מודלי ה-AI והסדר שלהם | `ai` | foodvibe | `/dashboard` (`tab=metadata`) | — | `models` | — |
| `monthly_cap` | תקרת שימוש חודשית ב-AI לעסק | `ai` | foodvibe | `/platform` | — | `none` | — |
| `daily_turns` | מכסת התשובות היומית של העוזר | `limit` | fixed | — | — | `engine` | `dailyTurns` · `server/services/frontdesk-turn.js · FRONTDESK_DAILY_TURNS` |
| `quiet_wait` | כמה זמן של שקט מהאורח לפני שהעוזר מתחיל לענות | `inbound` | fixed | — | — | `engine` | `quietMs` · `server/services/inbound.js · QUIET_MS` |
| `max_wait` | ההמתנה הארוכה ביותר כשהאורח ממשיך לכתוב | `inbound` | fixed | — | — | `engine` | `maxWaitMs` · `server/services/inbound.js · MAX_WAIT_MS` |
| `history_window` | כמה הודעות אחרונות העוזר קורא | `history` | fixed | — | — | `engine` | `historyWindow` · `server/services/frontdesk-prompt.js · HISTORY_WINDOW` |
| `glue_max` | כמה הודעות ברצף נענות בתשובה אחת | `prompt` | fixed | — | — | `engine` | `glueMax` · `server/services/frontdesk-prompt.js · GLUE_MAX` |
| `turn_limit` | מספר התשובות המרבי של העוזר בשיחה אחת | `precheck` | fixed | — | — | `engine` | `turnLimit` · `server/services/frontdesk-guardrails.js · TURN_LIMIT` |
| `follow_up_max` | כמה תשובות המשך ברצף, לפני שהשיחה עוברת לצוות | `precheck` | fixed | — | — | `engine` | `followUpMax` · `server/services/frontdesk-guardrails.js · FOLLOW_UP_MAX` |
| `first_model_limit` | כמה זמן מחכים למודל ה-AI הראשון לפני שעוברים לבא | `ai` | fixed | — | — | `engine` | `firstModelMs` · `server/routes/ai/frontdesk.js · FIRST_MODEL_LIMIT_MS` |
| `turn_budget` | הזמן המרבי לתשובת ה-AI כולה | `ai` | fixed | — | — | `engine` | `turnBudgetMs` · `server/routes/ai/frontdesk.js · TURN_BUDGET_MS` |
| `guard_words` | מילים שמעבירות את השיחה מיד לצוות | `precheck` | fixed | — | — | `none` | `server/constants/frontdesk-guard-words.js` |
| `facts_budget` | כמה מידע על העסק נשלח ל-AI בכל פעם | `facts` | fixed | — | — | `engine` | `factsMaxChars` · `server/services/knowledge.js · MAX_FACTS_CHARS · server/services/fact-pick.js · pickFacts` |
| `prompt_rules` | כללי הבית של העוזר | `prompt` | fixed | — | — | `none` | `server/services/frontdesk-prompt.js · TURN_SYSTEM_PROMPT, TABLE_SYSTEM_PROMPT` |
| `answer_checks` | מבנה התשובה ובדיקות הבטיחות | `shape`, `guardrails` | fixed | — | — | `none` | `shared/schemas/front-desk/turn-answer.schema.ts · server/services/frontdesk-guardrails.js · applyGuardrails` |

(The `code` of a row is the text after the "·" of the engine field, or the whole cell when the row has no engine
field. If Step 0 found a renamed constant, the `code` text names the new one.)

**Dictionary keys** (all new, appended to `general`; the 26 `asr_set_<id>` keys are the "Hebrew name" column above):

| key | Hebrew |
| --- | --- |
| `asr_tab_flow` | איך זה עובד |
| `asr_tab_settings` | מה אפשר לשנות |
| `asr_flow_intro` | כל הודעה של אורח עוברת את {n} השלבים האלה, לפי הסדר. רק שלב אחד הוא AI. כל השאר הם כללים קבועים ונתונים של העסק שלכם. |
| `asr_flow_to_runs` | לראות הודעות שטופלו |
| `asr_flow_to_settings` | לכל ההגדרות |
| `asr_kind_script` | כלל קבוע |
| `asr_kind_data` | נתוני העסק |
| `asr_kind_ai` | AI |
| `asr_flow_reads` | מאיפה השלב קורא |
| `asr_flow_stops` | מה יכול לעצור כאן |
| `asr_flow_stops_none` | השלב הזה לא עוצר את הטיפול בהודעה |
| `asr_flow_settings` | מה אפשר לשנות בשלב הזה |
| `asr_flow_code` | איפה זה בקוד |
| `asr_flow_what_inbound` | הודעת האורח נשמרת. העוזר מחכה עד שהאורח מפסיק לכתוב לרגע, ולא יותר מזמן קצוב, כדי לענות על כמה הודעות ברצף בתשובה אחת. העוזר מטפל בשיחה פעם אחת בכל רגע: הודעה שמגיעה בזמן שהוא עובד לא פותחת טיפול נוסף, והיא נענית בתשובת המשך מיד אחריו. |
| `asr_flow_what_setup` | העוזר טוען את הגדרות העסק: באיזו רמה הוא עובד, באיזה סגנון הוא מדבר ואילו סוגי בקשות פעילים. |
| `asr_flow_what_limit` | בודקים שהעוזר לא עבר את מכסת התשובות היומית שלו. אם עבר, הוא לא עונה והשיחה עוברת לצוות. |
| `asr_flow_what_history` | העוזר קורא את ההודעות האחרונות בשיחה, כדי להבין על מה מדברים. |
| `asr_flow_what_precheck` | לפני שפונים ל-AI, כללים קבועים בודקים: האם האורח ביקש שלא יפנו אליו, האם כתב מילה שדורשת אדם (תלונה, החזר כספי, אלרגיה), האם זו שעה שבה העוזר עונה, האם השיחה לא ארוכה מדי, והאם האורח לא ממשיך לכתוב שוב ושוב בזמן שהעוזר עונה. |
| `asr_flow_what_facts` | אוספים את המידע על העסק שמותר לשתף עם אורחים. פרטי העסק (שם, טלפון, כתובת, אזור שירות, שעות פתיחה וימים סגורים) נשלחים תמיד. פריטי "מידע על העסק" המאושרים והגלויים נשלחים כולם כשיש מקום. כשאין מקום לכולם, כלל קבוע (לא AI) בוחר את הפריטים שמתאימים למילים של האורח, ומה שנשאר בחוץ נרשם. |
| `asr_flow_what_prompt` | מרכיבים את הבקשה ל-AI: כללי הבית הקבועים, התאריך והשעה, המידע על העסק, סוגי הבקשות והשיחה עצמה. כשהאורח כתב כמה הודעות שעוד לא נענו, ה-AI מתבקש לענות על כולן. |
| `asr_flow_what_ai` | זה השלב היחיד שבו עובד AI: הוא קורא את הבקשה ומציע תשובה. אם המודל הראשון איטי או עמוס, פונים למודל הבא ברשימה. בערוץ שתומך בזה, האורח רואה בינתיים שהעוזר מקליד. |
| `asr_flow_what_shape` | בודקים שהתשובה של ה-AI הגיעה במבנה שהמערכת יודעת לקרוא. אם לא, מבקשים ממנו פעם נוספת. |
| `asr_flow_what_guardrails` | כללים קבועים בודקים את התשובה לפני שהיא יוצאת: בלי שעה, מחיר או קישור שלא מופיעים במידע על העסק, בלי הבטחה לבדוק ולחזור, ובלי לטעון שהזמנה אושרה. |
| `asr_flow_what_tables` | רק כשהאורח רוצה להזמין, לשנות או לבטל שולחן: המערכת עצמה בודקת אם יש מקום ומציעה שולחן. ה-AI אף פעם לא מחליט אם יש מקום. |
| `asr_flow_what_decide` | המערכת מחליטה מה קורה עכשיו: לשלוח את התשובה, לשאול את האורח על פרט שחסר, לפתוח בקשה שמחכה לאישור שלכם, או להעביר לצוות. |
| `asr_flow_what_send` | כשהעוזר עונה לבד, ההודעה נשלחת לאורח. כשהוא רק מכין טיוטות, היא נשמרת כטיוטה בשבילכם. בתקלה טכנית האורח מקבל הודעת המתנה והשיחה עוברת לצוות. אם איש צוות נכנס לשיחה בזמן שהעוזר עבד, שום דבר לא נשלח ולא נשמר. |
| `asr_flow_reads_inbound` | ההודעה של האורח |
| `asr_flow_reads_setup` | הגדרות העמדה: רמת העוזר, סגנון, סוגי בקשות |
| `asr_flow_reads_limit` | מספר התשובות של העוזר היום |
| `asr_flow_reads_history` | ההודעות האחרונות בשיחה |
| `asr_flow_reads_precheck` | ההודעה האחרונה של האורח, השעות שבהן העוזר עונה, מספר התשובות בשיחה |
| `asr_flow_reads_facts` | פרטי העסק ושעות הפתיחה, "מידע על העסק", מפת המקום |
| `asr_flow_reads_prompt` | כל מה שנאסף בשלבים הקודמים |
| `asr_flow_reads_ai` | הבקשה שהוכנה בשלב הקודם |
| `asr_flow_reads_shape` | התשובה של ה-AI |
| `asr_flow_reads_guardrails` | התשובה של ה-AI והמידע על העסק |
| `asr_flow_reads_tables` | מפת המקום, כללי הזמנת השולחן וההזמנות הקיימות |
| `asr_flow_reads_decide` | התשובה שעברה את הבדיקות, סוגי הבקשות וכללי העסק |
| `asr_flow_reads_send` | רמת העוזר והמשפט שהגדרתם להעברה לצוות |
| `asr_engine_quietMs` | כרגע: העוזר מתחיל לענות אחרי {n} שניות בלי הודעה חדשה מהאורח |
| `asr_engine_maxWaitMs` | ולכל המאוחר {n} שניות אחרי ההודעה הראשונה ברצף |
| `asr_engine_followUpMax` | כרגע: עד {n} תשובות המשך ברצף, ואז השיחה עוברת לצוות |
| `asr_engine_glueMax` | כרגע: עד {n} הודעות ברצף נענות בתשובה אחת |
| `asr_engine_firstModelMs` | כרגע: המודל הראשון מקבל {n} שניות, ואז פונים למודל הבא |
| `asr_engine_turnBudgetMs` | כרגע: עד {n} שניות לתשובה כולה, ואז השיחה עוברת לצוות |
| `asr_engine_dailyTurns` | המכסה כרגע: {n} תשובות ביום |
| `asr_engine_historyWindow` | כרגע נקראות {n} ההודעות האחרונות |
| `asr_engine_turnLimit` | כרגע: עד {n} תשובות של העוזר בשיחה אחת |
| `asr_engine_factsMaxChars` | כרגע: עד {n} תווים של מידע |
| `asr_engine_val_quietMs` | {n} שניות |
| `asr_engine_val_maxWaitMs` | {n} שניות |
| `asr_engine_val_followUpMax` | {n} תשובות המשך |
| `asr_engine_val_glueMax` | {n} הודעות |
| `asr_engine_val_firstModelMs` | {n} שניות |
| `asr_engine_val_turnBudgetMs` | {n} שניות |
| `asr_engine_val_dailyTurns` | {n} תשובות ביום |
| `asr_engine_val_historyWindow` | {n} הודעות |
| `asr_engine_val_turnLimit` | {n} תשובות |
| `asr_engine_val_factsMaxChars` | עד {n} תווים |
| `asr_set_intro` | כל מה שמשפיע על התשובות של העוזר, במקום אחד. "לשנות" פותח את המסך שבו משנים את ההגדרה. |
| `asr_set_col_name` | הגדרה |
| `asr_set_col_value` | אצלכם עכשיו |
| `asr_set_col_steps` | משפיע על שלב |
| `asr_set_col_who` | מי משנה |
| `asr_set_change` | לשנות |
| `asr_set_fixed` | קבוע במערכת |
| `asr_who_owner` | בעל העסק |
| `asr_who_foodvibe` | צוות FoodVibe |
| `asr_set_why_foodvibe` | רק צוות FoodVibe משנה את ההגדרה הזו. צריך שינוי? דברו איתנו. |
| `asr_set_why_tables_off` | שירות השולחנות לא פעיל בעסק הזה. |
| `asr_set_why_fixed` | חלק מהמנוע של FoodVibe, זהה בכל העסקים. |
| `asr_set_load_failed` | לא הצלחנו לטעון את ההגדרות |
| `asr_set_no_profile` | עדיין לא הוגדרה עמדת קבלת הפנים של העסק. מתחילים בהגדרות העמדה. |
| `asr_set_go_settings` | להגדרות העמדה |
| `asr_val_none` | — |
| `asr_val_set` | הוגדרו |
| `asr_val_not_set` | לא הוגדרו |
| `asr_val_filled` | {n} מתוך {total} מולאו |
| `asr_val_items` | {n} פריטים מאושרים |
| `asr_val_public` | {n} גלויים לאורחים |
| `asr_val_custom` | ניסוח שלכם |
| `asr_val_default_text` | ניסוח ברירת המחדל |
| `asr_val_hours_set` | רק בשעות שהגדרתם |
| `asr_val_any_hour` | בכל שעה |
| `asr_val_kinds` | {n} סוגים פעילים |
| `asr_val_tables_on` | שירות השולחנות פעיל |
| `asr_val_tables_off` | שירות השולחנות לא פעיל |

Existing keys reused, none copied: `asr_step_<key>`, `asr_reason_<reason>`, `asr_tab_runs`, `asr_owner_only` (plan
752); the five reason keys of plan 753 (`asr_reason_taken_over`, `asr_reason_closed`, `asr_reason_lease_lost`,
`asr_reason_overtaken`, `asr_reason_follow_up_limit`) through the same `reasonKey`. The field keys of plans 753–755
(`asr_f_*`, `asr_try_*`, `asr_via_follow_up`, `asr_factpick_*`) label values of one recorded run and are not used by
these two tabs, which describe the rule, not a run. `retry`,
`fd_assistant_choice_0`, `fd_assistant_choice_1`, `fd_assistant_level_2`, `fd_tone_warm`, `fd_tone_formal`,
`fd_ts_mode_auto`, `fd_ts_mode_manual` (`public/assets/data/dictionary.json:430`, `:2092`, `:2094`, `:2090`,
`:2101-2102`, `:2728-2729` on the Snapshot). `{n}` / `{total}` are replaced in the component with
`TranslationService.translate(key).replace(…)`, as `ai-model-manager.component.ts:84-88` does.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add one read that tells the page the engine's real numbers and this business's own values — assistantSetup with the engine constants, the business values, the model order for the admin only; the setup route before the run route; the router test cases — server/services/assistant-setup.js, server/routes/assistant-runs.js, server/test/assistant-runs-router.test.js
- [x] A2: Let the browser read that setup once and keep it — the three types, the three signals and loadSetup on the service, its spec cases — src/app/core/models/assistant-run.model.ts, src/app/core/services/assistant-run-data.service.ts, src/app/core/services/assistant-run-data.service.spec.ts
- [x] A3: Write down the 13 steps as data, so a step added later cannot be forgotten — FLOW_STEPS with kind, stops, engine facts and code path; the coverage spec against the run step keys and reasons — src/app/pages/frontdesk/assistant/assistant-flow.data.ts, src/app/pages/frontdesk/assistant/assistant-flow.data.spec.ts
- [x] A4: Write down every setting as data with where it is changed and by whom — SETTING_ROWS, settingValue and changeBlock, the spec that every route exists and the value spec — src/app/pages/frontdesk/assistant/assistant-settings.data.ts, src/app/pages/frontdesk/assistant/assistant-settings.data.spec.ts, src/app/pages/frontdesk/assistant/assistant-settings-value.util.ts, src/app/pages/frontdesk/assistant/assistant-settings-value.util.spec.ts
- [x] A5: Add every new word to the dictionary and test that no step text carries a typed number — all keys of the UI/UX tables; the dictionary test — public/assets/data/dictionary.json, server/test/assistant-flow-dictionary.test.js
- [x] A6: Give the step row one shared look for the run detail and the flow map — move the step row rules into a partial that both stylesheets use, no rule text changed — src/app/pages/frontdesk/assistant/_asr-step.scss, src/app/pages/frontdesk/assistant/components/run-detail/run-detail.component.scss
- [x] A7: Build the tab that explains the 13 steps in plain words — the flow map component, one open row at a time, the admin-only code lines, the current-value lines, its spec — src/app/pages/frontdesk/assistant/components/flow-map/**
- [x] A8: Build the tab that lists every setting with its value and a button to the real screen — the settings table component, the blocked button with its reason, loading, error and no-profile states, its spec — src/app/pages/frontdesk/assistant/components/settings-table/**
- [x] A9: Put the two tabs on the assistant page and keep the open tab in the address — three tabs, activeTab from the address, setTab, the runs list loads only on its tab, the refresh button only there, the page spec cases — src/app/pages/frontdesk/assistant/assistant.page.ts, src/app/pages/frontdesk/assistant/assistant.page.html, src/app/pages/frontdesk/assistant/assistant.page.scss, src/app/pages/frontdesk/assistant/assistant.page.spec.ts
- [x] A10: Write down where the new pieces live — folder maps, the API table row, the registry family lines and the inventory — server/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, docs/agent/standards-backend.md, docs/restaurant/restaurant-map.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A11: Run every check of this plan and hand Dandan the three page checks — test:server, test:ci, build, both lints, the icon lint, the inventory check, log-query; evidence into Execution Notes; the slot's servers up before the cards

## Technical Considerations
- Dependencies: plan 752 (the page, the 13 keys, the reasons, the router, the service, the step row), plans 753–755
  (merged first; the lease and the follow-up, the quiet wait and the first-model limit, the fact pick — their
  exported constants are what the setup read returns), plan 734 (the owner's level switch), plan 699
  (`[appTip]`), plan 631 / ADR 0032 (acting sessions), plan 617 (the monthly cap), plan 395 (the model order).
- New files needed: listed under Read-Write Scope.
- Model changes: three read-only types in `assistant-run.model.ts`; nothing stored.
- Backend / API: one new read, `GET /api/v1/assistant-runs/setup`. Why an endpoint at all, when the brief prefers
  none: (1) the engine's numbers live only in server constants that plans 753–755 change — typing them into the
  browser is exactly how the mock-up came to say "1.5 s"; (2) three of the business values are only true on the
  server: "tables on" needs the module AND a floor plan (`tablesFor`), "public items" is `publicFacts`' own filter,
  and the profile data service hides a failed load (`frontdesk-settings.page.ts:199-207` has to read twice to tell
  "no profile" from "failed"); (3) one read gives the page one loading state and one error state instead of four.
  It reads one profile, two counts and the table context; no model call. New log events:
  `assistant_runs.setup_read` (info, `hasProfile` only), `assistant_runs.setup.failed` (error).
- Auth and validation: token + module `frontdesk` + `assertCan(…, 'editFrontDesk')`, exactly plan 752's rule — owner,
  consultant, the platform admin acting in the business; staff 403. No input is read. `models` is added only when
  `isPlatformAdmin(req)`.
- Security surface: none new. The answer holds numbers, booleans, two enums and (admin only) model names; no text the
  owner wrote, no guest data, no key. The admin-only lines of the page are static code paths chosen in the browser;
  they are not secrets, so no server rule guards them.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; the Reuse Check (every control listed); the `Page recipe:` line;
  hotspots append-only (`dictionary.json`; `app.routes.ts` and `styles.scss` not touched); every UI string through
  `translatePipe` with its key and Hebrew listed; breadcrumbs, registry and inventory in scope; no stored shape, so no
  schema; the dedicated endpoint named and justified.
- Traps: `router.get('/setup')` must be declared before `router.get('/:id')` or "setup" is read as a run id;
  `assistant-setup.js` requires the turn and the tables service, so `frontdesk-runs.js` must never require it;
  compare the engine numbers in tests with the imported constants, never with typed numbers; read `QUIET_MS` and
  `MAX_WAIT_MS`, never the alias `COALESCE_MS`; `assistant-setup.js` requires `../routes/ai/frontdesk` for two
  constants — that file requires the turn at its top, so require it at the top of `assistant-setup.js` too and never
  from `frontdesk-turn.js` or `frontdesk-lease.js`; a blocked button uses `aria-disabled`, not `disabled` — a disabled button gets no hover, focus or tap, so
  its tip would never show; plan 752's row links use `queryParamsHandling="preserve"`, so `tab` may ride along into
  a run's address — that is why a route with a run id always shows the runs tab; `activeTab_` changes from a signal to
  a computed, so any place plan 752 calls `activeTab_.set(…)` becomes `setTab(…)`; `UserService.isPlatformAdmin_` is
  true for the platform admin also in his own business — the admin lines show there too, which is intended.
- A finding outside this plan, verified on the Snapshot: the settings screen's checkbox "כמו שעות הפתיחה"
  (`fd_active_same_as_hours`) saves no `assistant.activeHours` (`frontdesk-settings.page.ts:229`, `:373`), and
  `preCheck` then makes no hours check at all (`frontdesk-guardrails.js:43-47`) — the assistant answers at any hour,
  not "as the opening hours". This plan shows the truth ("בכל שעה") and changes nothing there.
- `assistant.greeting` (edited on the settings screen, `frontdesk-settings.page.html:311-320`) is read by no server
  code of the turn (no match under `server/` on the Snapshot), so it has no row.

## Out of Scope
- Editing any setting inside this page: every row only links to the screen that owns it.
- Extra guard words per business: not built (the words are one list in `server/constants/frontdesk-guard-words.js`);
  the mock-up's row is left out and no row promises it.
- Changing the prompt's house rules, the JSON shape or the guardrail rules from the screen.
- "Run again with the same input".
- A console for the platform admin across all businesses: the admin uses the existing "act in a business" flow and
  sees this page there.
- The simulator inside this page (the mock-up's notes asked for it): left for a later plan, because the simulator
  already exists as its own page (`/frontdesk/simulator`) and plan 752 links the two both ways; embedding it means
  moving its chat, its guest list and its reads into a tab, which is a plan of its own.
- Example input and output per step (the mock-up had them): the real thing is one tab away, in the runs of plan 752.
- Opening the target screen at the exact card (a fragment or a query): the settings, knowledge, floor-plan and
  metadata screens support none today; the button opens the screen at its top.
- The used part of the daily cap or of the monthly cap, the monthly cap's number, and how long runs are kept: not
  shown.
- Plan 736 (100 AI calls per user): not on staging (`server/` has no such counter on the Snapshot), so it has no row.
- The "כמו שעות הפתיחה" mismatch described under Technical Considerations (the checkbox saves no active hours, so
  the assistant answers at any hour): a separate plan.
- The lease length (`RUN_LEASE_MS`), the small-bucket rule of the model switch (`SLOW_SWITCH_*`, plan 754) and the
  picker's inner numbers (`QUERY_TOKENS_MAX`, `TITLE_MAX`, plan 755): engine internals, no row.
- A filter of the runs list by step: plan 752's list has four result filters and none by step, so "to the runs" is a
  plain tab switch.

## Critical Questions
- none

## Execution Notes
- behaviour: the tab strip's order is the mock-up's — "איך זה עובד", plan 752's runs tab, "מה אפשר לשנות" — and the page still opens on the runs tab, because the inbox and simulator links of plan 752 lead to the runs.
- behaviour: the open tab is in the address (`?tab=flow` / `?tab=settings`, nothing for the runs), so the browser's Back from a settings screen returns to the same tab; a tab switch replaces the address entry instead of adding one, as the settings page does.
- behaviour: the flow map opens one step at a time, in place, at every screen width (the same accordion on a phone and on a desktop); no step is open at first.
- behaviour: no step text carries a number; the engine's numbers are shown as separate "current value" lines read from the server, and are simply absent when that read fails.
- behaviour: of the constants plans 753–755 added, six get a fixed row and a "current value" line — the quiet wait, the longest wait, the follow-up cap, the messages answered together, the first model's time and the whole answer's time; the lease length, the small-bucket rule of the model switch and the picker's inner numbers get none.
- behaviour: plan 753's stops sit in two steps — `follow_up_limit` in the pre-check, and `taken_over`, `closed`, `lease_lost`, `overtaken` in "שליחה או טיוטה", the step plan 753 marks as stopped for them.
- behaviour: this plan adds no row to the assistant's rules table (no behaviour of the assistant changes); it adds one Contract line to the restaurant map for the new read.
- behaviour: the owner also sees the engine's numbers (the two waits, daily cap, per-conversation cap, follow-up cap, messages read, facts budget, model times) — they explain his assistant and are not secrets; only code paths, reason codes and the model order are for the platform admin.
- behaviour: one small read `GET /api/v1/assistant-runs/setup` instead of no endpoint — reasons under Technical Considerations.
- behaviour: a setting only FoodVibe changes keeps its "לשנות" button for the owner, blocked, with the reason in a tooltip; for the platform admin the same button opens the admin's screen (`/dashboard?tab=metadata`, `/platform`). A setting fixed in code has no button and the tag "קבוע במערכת".
- behaviour: with the `tables` module off, the two table rows keep their button, blocked, with the reason "שירות השולחנות לא פעיל בעסק הזה."
- behaviour: "who may change" says "בעל העסק" for every owner setting; a consultant and the acting platform admin may change them too (the existing `editFrontDesk` rule), which the row does not spell out.
- behaviour: the handover sentence and the holding message are one row, because the code uses the same `assistant.handoffText` for both.
- behaviour: the mock-up's rows "JSON shape" and "guardrail rules" are one fixed row ("מבנה התשובה ובדיקות הבטיחות"); "daily AI allowance" became two rows — the fixed daily cap of the assistant and the monthly cap FoodVibe sets per business.
- behaviour: on a phone a settings row shows the name, the value and the button; "משפיע על שלב" and "מי משנה" are dropped there — the same link is shown the other way round inside each step of the flow map ("מה אפשר לשנות בשלב הזה").
- behaviour: opening the page on the flow or settings tab makes no runs request; the runs list loads when its tab is opened.

Build (2026-11-27):
- Step 0 (`scope-check.mjs --drift` → `REALITY: drift`): 711cd215 ok · a34fc0e3 ok · 9e339e05 ok · 5fb6fb8c ok · 4346fa14 ok · bbf020bf ok · def248b0 ok · 30626b01 ok. All ten engine constants are exported under the plan's names; `RUN_REASONS` has 26 entries.
- The `asr_engine_<field>` and `asr_engine_val_<field>` dictionary keys are stored in lower case (`asr_engine_quietms`), because `TranslationService.translate` looks every key up in lower case; the dictionary test holds every `asr_*` key to it.
- `request_kinds` counts the values of the `requestKinds` record (the stored shape is a record, not a list).
- behaviour: the setup read is kept for the browser session as the plan says (`loadSetup` returns at once when loaded): after a setting is changed, the table shows the earlier value until the page is reloaded, and a sign-in as another user without a reload keeps it too. Reverse: call `loadSetup(true)` from the settings table.
- behaviour: pressing the runs tab while a run is open goes back to the runs list (`setTab` navigates to `/frontdesk/assistant`). Reverse: do nothing in `setTab` when the asked tab is already active.
- behaviour: two calls of `loadSetup` that overlap (the page and the settings table) share one request. Reverse: drop `setupCall`.
- Reuse Check: rows added for the new page-local classes and file names (`kit-checks` asks for them); no piece changed.
- seen: public/assets/data/dictionary.json:2549-2550 — the keys `platform_history_field_aiMonthlyTokenCap` and `platform_history_field_aiPrivate` have capital letters, so `translate` never finds them.

Evidence (on commit 18c2281e):
- `pnpm run build` → exit 0
- `pnpm run lint` → exit 0 (0 errors); `pnpm --dir server run lint` → exit 0 (0 errors)
- `pnpm run test:ci` → exit 0, `TOTAL: 3334 SUCCESS`
- `pnpm run test:server` → exit 0, 186 files, 2824 tests passed
- `kit-manifest-check.mjs --root .` → exit 0, `KIT_MANIFEST: ok`
- `node scripts/scope-check.mjs --diff=origin/orch/rs-console --plan=<this plan>` → exit 0, `SCOPE: ok`
- `kit-checks.mjs --base origin/orch/rs-console --plan <this plan>` → exit 0, `KIT_CHECKS: ok (6 checks)`
- `override-check`, `lint:icons`, `lint:no-native-select`, `plan-ledger-check`, `breadcrumbs-check` → exit 0
- `ci-scope-check.mjs --checkout-branch` → exit 0 (it prints `skipped`)
- `inventory.mjs --check` → exit 0, `INVENTORY: ok`
- `log-query.mjs --since=plan-start --level=error` → exit 0, `SKIP: no database configured`
- A11 stays open: the three `[human]` page checks need the slot's servers and the Human; this builder folder starts none.
