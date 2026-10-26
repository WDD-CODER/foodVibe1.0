# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Tech Debt (from `/nightly-maintenance` 2026-09-27)

> Full plan: `plans/300-400/318-nightly-maintenance-followups-2026-09-27.plan.md`. Full audit: `.claude/techdebt-reports/techdebt-2026-09-27.md`.

- [ ] `auth.interceptor.ts` — `BehaviorSubject` used for refresh-token gate; hard rule says signals only
- [ ] `nutrition-badge.component.ts:46` — legacy `@Input()` decorator, unresolved since `techdebt-2026-04-20.md`
- [ ] 2 stray trailing semicolons (`quick-add-product-modal.component.ts:121`, `menu-library-list.component.ts:197`)
- [ ] 24-file refactor-candidate backlog (>300 lines each) — triage, top 3 are 1200+ lines
  - [x] `cook-view.page.ts` — triaged + split 2026-09-28: timer/stopwatch + export/preview extracted to component-scoped services (`src/app/pages/cook-view/services/`), 1201 → 979 lines; `ng build` clean; branch `chore/cook-view-service-split`; Human-validated. Full detail: `plans/300-400/318-nightly-maintenance-followups-2026-09-27.plan.md`.
  - [ ] `menu-intelligence.page.ts` (1413) / `recipe-builder.page.ts` (1394) / remaining ~21-file backlog — not yet triaged
- [ ] 2 unnecessary `?? []` NG8102 warnings (`venue-detail`/`venue-list` templates)

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

## 6. KEEP DEFERRED — intentional park

> Do not execute against current policy / product decisions.

### Angular 22 Migration (deferred)
- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

---

### Plan 248 — Transloco Migration (`plans/248-transloco-migration.plan.md`)
> Never started. AGENTS.md still mandates `translatePipe` + `dictionary.json` — park until policy change.

- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app

### Plan 372 — Venues B: multiple contacts and an interactive days/hours picker (`plans/design/372-venues-b-multiple-contacts-hours-picker.plan.md`)
- [ ] A1: Let a venue store several contacts and structured opening hours — Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Show opening hours in plain Hebrew and still read old free-text hours — `venue-hours.util` `toDisplay` / `parseLegacy` plus spec (Hebrew range forms, midnight crossing, unparseable).
- [ ] A3: Add an interactive days-and-hours picker to the venue form — `HoursEditorComponent` plus spec; wire into the venue form; hydrate and save both shapes (`shared/hours-editor/**`, `venue-form/**`).
- [ ] A4: Let the venue form add and list several contacts — Contacts FormArray, legacy hydrate, save mirror, detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A5: Build, test and check existing venues still open and save — Build, specs. Open 2 existing venues (one with free-text hours), edit and save, check no 400s. Update session-state.

### Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location" (`plans/design/373-venues-c-tour-videos-current-location.plan.md`)
- [ ] A1: Let a venue store tour video links and a saved location — Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Add tour videos with a visit date to the venue form and detail page — Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Add a "save my current location" button and navigation links — Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, test and try it on a phone over HTTPS — Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine). Update session-state.

### Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form (`plans/design/374-venues-d-infrastructure-vs-equipment-groups.plan.md`)
- [ ] A1: Sort venue equipment into infrastructure and regular groups behind the scenes — Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [ ] A2: Show infrastructure and regular equipment as two groups on the venue pages — Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Hint in the equipment form which items count as infrastructure — Equipment-form infrastructure hint (`equipment-form/**`).
- [ ] A4: Build, test and check an existing venue still saves — Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400. Update session-state.

### Plan 409 — Claude Code mods rollout: fleet, guards, ship-pilot
- [x] S0: Stage 0 — validate + test all three mods on Windows — `claude-mods-deliverable/layers/claude-code-mods/**`
- [x] S1: Stage 1 — fleet from disk in a slot (fleet/ports/health, slot lock, /handoff, no flash) — `claude-mods-deliverable/layers/claude-code-mods/fleet/**`
- [x] S2a: Stage 2 — install fleet from the local marketplace at user scope — `~/.claude/settings.json`
- [ ] S2b: Use fleet for a week and confirm it causes no errors — Stage 2 — one week of fleet use (2026-10-14 → 2026-10-21), no fleet error toasts, ≥1 real lock or recovery — `(no files)`
- [ ] S3a: Install guards and confirm each of its 7 checks blocks and allows correctly — Stage 3 — install guards at user scope and run checks 1–7 in a slot and the Planner folder — `(no files)`
- [ ] S3b: Run guards for a week and confirm it never blocks wrongly — Stage 3 — one week with shell guards + guards mod, no false denials — `(no files)`
- [ ] S4: Install ship-pilot and try every button and command on a real PR — Stage 4 — install ship-pilot; /progress, /check, /pr, toast, merge button on a real PR — `(no files)`
- [ ] K1: Make the guards and ship-pilot tests pass on Windows in the kit — kit fix — test mocks strip the drive letter (guards path helper; ship-pilot P + fs.write) — `ai-workflow-kit/layers/claude-code-mods/{guards,ship-pilot}/tests/*.test.ts`
- [ ] K2: Stop one clashing command name from breaking all of fleet's commands — kit fix — fleet registers each command in its own try/catch; `/fleet-health` alias (gstack `/health` clash) — `ai-workflow-kit/layers/claude-code-mods/fleet/hooks/register.tsx`
- [ ] K3: Keep a failed PR lookup from breaking ship-pilot — kit fix — ship-pilot `/pr` handler gets a `.catch` (validator: gating hook without .catch) — `ai-workflow-kit/layers/claude-code-mods/ship-pilot/hooks/register.tsx`
- [ ] K5: Add daily event logs to all three mods in the kit — kit — daily event logs in all three mods (done in the deliverable copy 2026-10-14) — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`
- [ ] K4: Document the Git Bash workaround for running mod commands headless — kit docs — headless `claude -p "/cmd"` from Git Bash needs `MSYS_NO_PATHCONV=1` — `ai-workflow-kit/layers/claude-code-mods/README.md`
- [ ] K6: Put all three mods in one shared box above the prompt — kit — mods dock: one framed band above the prompt shared by all three mods (collapsed line, expands on alert; guards status line dropped) — done in the deliverable copy 2026-10-16 — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`, `*/tests/*.test.ts`
- [ ] K7: Add a plan panel showing every step, what's next and what waits on you — ship-pilot plan panel — click the plan % chip to open a panel under the dock: bar, steps (done/now/next), waiting-on-you, time, end checks, after-this; zero model tokens (see K7 spec) — built in the deliverable copy 2026-10-17 (ship-pilot 0.2.0, 13/13 tests) — `claude-mods-deliverable/layers/claude-code-mods/ship-pilot/{hooks/register.tsx,types/index.d.ts,tests/*.test.ts}`
- [ ] K8: Make the replies an answer suggests clickable — quick-reply mod — suggested replies in an answer (say "go", `approved: <path>`, `a | b | c`, the (recommended) option) clickable in place; click fills the prompt box unsent, second click removes; zero tokens — built in the deliverable copy 2026-10-17 (11/11 tests) — now part of fleet (K11) — `claude-mods-deliverable/layers/claude-code-mods/fleet/{hooks/quick-reply.tsx,tests/quick-reply.test.ts}`
- [ ] K9: Show whether this checkout is clean or still needs /ship — fleet clean / ship badge — `✓ clean` or `● N files · N unpushed → /ship` in the dock and status line, refreshed at each answer's end — built in the deliverable copy 2026-10-17 (13/13 tests) — `claude-mods-deliverable/layers/claude-code-mods/fleet/{hooks/register.tsx,tests/fleet.test.ts}`
- [ ] K10: Add a Pull main button so any checkout catches up with main in one click — fleet Pull main button — always in the dock (hidden while the agent works); on `main` `git pull --ff-only origin main`, in a slot `git fetch origin main` + `git merge --no-edit origin/main`, a conflicted merge is aborted; hotkey `u`; result as a toast — built in the deliverable copy 2026-10-17 (fleet 0.1.3, 17/17 tests); 2026-10-18 fleet 0.3.1: first press showed nothing (no press in the logs), so a press now logs, toasts "pulling main…", and writes the result to the transcript (new commits + files changed, not sent to the model); git never waits on a credential prompt; `/pull-main` command too — `claude-mods-deliverable/layers/claude-code-mods/fleet/{hooks/register.tsx,types/index.d.ts,tests/fleet.test.ts}`
- [ ] K11: Keep the mods at three by folding quick-reply into fleet — mod count back to the 3-mod limit — quick-reply (K8) is a 4th mod; Human chose: fold into fleet. Done 2026-10-18: code in `fleet/hooks/quick-reply.tsx`, called from fleet's register; quick-reply uninstalled and removed from the marketplace; folder moved to `claude-mods-deliverable/backups/`; fleet 0.2.0, 33/33 tests, validate + tsc clean — `claude-mods-deliverable/layers/claude-code-mods/{fleet/**,.claude-plugin/marketplace.json,README.md}`
- [ ] K12: Show each plan step as a plain one-line title instead of raw commands — save-plan requires a plain title before the first ' — ' (kit PR #13, FoodVibe PR #417); ship-pilot 0.3.0 shows only that title (cleans up older lines) and counts only Atomic Sub-tasks as steps (14/14 tests); open plans retitled 2026-10-18 — `claude-mods-deliverable/layers/claude-code-mods/ship-pilot/{hooks/register.tsx,tests/ship-pilot.test.ts}`
- [ ] K13: Show reply buttons only where the answer marks a reply on purpose, inline in the sentence — fleet 0.3.0: a button only after a code span followed by ⏎; fleet adds a short rule to the system prompt telling the model when to mark; all wording-based guessing removed (27/27 tests) — `claude-mods-deliverable/layers/claude-code-mods/fleet/{hooks/quick-reply.tsx,tests/quick-reply.test.ts}`
- [ ] K14: Reload the plan scope when a slot claims a new plan in the same session — guards freshContext re-reads .worktree-plan and reloads on branch change; the approve path writes to the current plan, not the cached one (kit hand-off 2026-10-18 I-28) — `claude-mods-deliverable/layers/claude-code-mods/guards/hooks/register.tsx`
- [ ] S5: Move the finished mods into the kit as an installable layer — Stage 5 — kit PR: patch + K1–K4 + `--mods` install flag + manifest tier + kit.json bump + README — `ai-workflow-kit/**`
- [ ] S6a: Stop running the old shell guards in Claude Code — Stage 6 — remove Claude Code `hooks` from settings (keep `permissions`) — `.claude/settings.json`
- [ ] S6b: Mark the shell guards as kept only for Cursor — Stage 6 — "superseded for Claude Code; still used by Cursor" header on shell guards — `scripts/*-guard.sh`, `scripts/session-startup.sh`
- [ ] S6c: Switch take-plan and save-plan to the mods' approve flow — Stage 6 — take-plan step 0 dropped; save-plan Phase 0 uses `/approve` — `.claude/commands/take-plan.md`, `.claude/skills/save-plan/SKILL.md`
- [ ] S6d: Describe ship-pilot's band and /check in the ship docs — Stage 6 — ship-pilot band notes + `/check` sentence — `.claude/commands/ship.md`, `docs/agent/ship-regular.md`, `docs/agent/standards-git.md`, `docs/agent/job-validation.md`
- [ ] S6e: Record in an ADR that Claude Code guards now run inside the mods — Stage 6 — ADR "Claude Code guards run in-process (mods); shell guards remain for Cursor" — `docs/brain/decisions/`
- [ ] S6f: Mention /handoff and /fleet-health in the AGENTS.md compaction rule — Stage 6 — AGENTS.md Compaction bullet mentions `/handoff` and `/fleet-health` — `AGENTS.md`

### Plan 410 — Skill Improver: Nightly Evidence-Driven Skill Upgrades
- [ ] S0: Check the plan is still right and test a headless run before building — Step 0 reality check + headless spike, findings written here — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`
- [ ] S1: Count which skills get used and where they fail, from local transcripts — Evidence script over local transcripts (counts only, local output) — `../ai-workflow-kit/tools/skill-improver/evidence.mjs`
- [ ] S2: Pick which skill to improve each night, pausing while a PR is open — Picker + rotation state + open-PR pause — `../ai-workflow-kit/tools/skill-improver/pick.mjs`
- [ ] S3: Run each improvement in a sandbox with a budget cap and safety guards — Runner: isolated worktree, budget meter over stream-json, path guard, leak guard, log — `../ai-workflow-kit/tools/skill-improver/run.mjs`
- [ ] S4: Let one agent improve a skill while a separate blind judge scores it — Editor command + blind judge agent + eval generation for skills without evals — `../ai-workflow-kit/core/.claude/commands/improve-skill.md`, `../ai-workflow-kit/core/.claude/agents/skill-judge.md`
- [ ] S5: Open a PR with each night's skill improvement — PR creation + body template — `../ai-workflow-kit/tools/skill-improver/pr.mjs`
- [ ] S6: Schedule the nightly run and document it — Scheduler script (PS5) + README/CHANGELOG section — `../ai-workflow-kit/kit-skill-improver.ps1`, `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] S7: Try a full run by hand, including the budget stop and the safety stop — Manual end-to-end run on one skill + budget-stop test + out-of-scope test — kit repo
- [ ] S8: Turn on the nightly schedule after your go and receive the first PR — Register the task (Dandan's go), receive one nightly PR — local machine
- [ ] S9: Note the skill improver in FoodVibe's manifest and ship — FoodVibe manifest note; `/ship` — `docs/workflow-kit/manifest.md`
- [ ] S10: Review after one month whether the improvements helped — One-month review (2026-11-17 or later) — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`

### Plan 411 — Workflow Scout: Weekly Claude Code and Community Update Page
- [ ] C0: Check the plan is still right and test a cloud routine before building — Step 0 reality check + routine spike, findings written here — `plans/411-workflow-scout-weekly-claude-code-and-community-update-page.plan.md`
- [ ] C1: List which news sources to scan and remember what was already seen — Sources config + cursor state format — `../ai-workflow-kit/tools/scout/sources.json`
- [ ] C2: Collect updates and judge which fit our workflow, within a budget — Scout command (collect, judge fit, emit JSON, budget caps) — `../ai-workflow-kit/core/.claude/commands/scout.md`
- [ ] C3: Turn the findings into an easy-to-read web page — Advertiser-style page template + JSON→HTML renderer — `../ai-workflow-kit/templates/scout-page.html`, `../ai-workflow-kit/tools/scout/render.mjs`
- [ ] C4: Open a weekly PR with the top 5 findings and the page link — Branch + PR step (top-5 text, page link, useful checkboxes) — `../ai-workflow-kit/tools/scout/pr.mjs`
- [ ] C5: Document the scout and bring it into FoodVibe — README/CHANGELOG section; kit PR merged; kit-sync into FoodVibe — `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] C6: Run it once by hand and get the first page and PR — Manual run in FoodVibe → first page + PR — `docs/scout/**`
- [ ] C7: Schedule it weekly after your go and receive one automatic PR — Create the weekly cloud routine (Dandan's go); receive one scheduled PR — cloud routine
- [ ] C8: You mark which tips were useful; record that and ship — Dandan marks useful recommendations; manifest note; `/ship` — `docs/workflow-kit/manifest.md`

### Plan 412 — Refresh Gemini Model Chain to Google's Oct-2026 Free-Tier Lineup
- [x] A1: Check every candidate model live with our key and record which ones answer and share quota — GET v1beta/models, then one tiny generateContent per candidate (3.8-flash, 3.6-flash, 3.5-flash-lite, 3.1-flash-lite, 3-flash-preview, 2.5-flash, 2.5-flash-lite, 3.5-flash, 3.7-flash, any Gemma listed); record status, response modelVersion (proves auto-routing), 429 quotaId/quotaValue; confirm whether 3.5-flash / 3.7-flash share quota with 3.6-flash / 3.8-flash; table goes into this plan under "Live check results" — server/scripts/ai-eval-recipes.js
- [x] B1: Drop the two deprecated models and add only free models that answer on their own quota — remove gemini-3.5-flash and gemini-3.7-flash from MODEL_DAILY_BUDGETS, DEFAULT_MODELS and the GEMINI_MODELS example; add gemini-3-flash-preview only if A1 shows 200 and its own bucket; never paid-only models — server/services/gemini-client.js, server/.env.example, .env.example
- [ ] C1: Set each model's daily budget from the Human's rate-limit screenshot and real 429 numbers — [human] Human sends the ai.dev/rate-limit screenshot; update MODEL_DAILY_BUDGETS and its source/date comment — server/services/gemini-client.js
- [x] D1: Order the default chain by free daily quota, largest first, so users don't burn the small buckets first — sort DEFAULT_MODELS and the .env.example GEMINI_MODELS line by MODEL_DAILY_BUDGETS descending; recipe eval only breaks ties; unknown RPD after all known; replace the plan 395 rationale comment with this rule — server/services/gemini-client.js, server/.env.example, .env.example
- [x] D2: Add a test that fails if the default chain is ever not sorted by daily quota — DEFAULT_MODELS sorted by MODEL_DAILY_BUDGETS descending, ties allowed, unknown budgets last — server/test/gemini-client.test.js
- [x] E1: Never send a request to a removed model from an old saved chain or env list — entries in the admin's saved chain or GEMINI_MODELS that are not in the catalog are skipped by modelChain/callGemini and the explicit-model path, and reported as removed (e.g. removed: true) by the chain endpoint; usage endpoint lists only kept models — server/services/gemini-client.js, server/routes/ai.js
- [x] E2: Show removed models as removed in the admin chain screen — read-only "removed" state, cannot be enabled; new Hebrew label via translatePipe + appended dictionary key — src/app/pages/metadata-manager/components/ai-model-manager/**
- [x] E3: Add tests for stale saved chains and stale env lists — saved chain with gemini-3.7-flash: skipped, flagged removed, no fetch to it; GEMINI_MODELS with gemini-3.5-flash: same; explicit request for a removed model refused — server/test/gemini-client.test.js
- [x] F1: Confirm every kept model accepts inline images — VISION_MODEL_PATTERN matches all kept models including gemini-3-flash-preview (extend pattern + test if not) — server/services/gemini-client.js, server/test/gemini-client.test.js
- [x] G1: Update the Gemini free-tier gotcha with the new lineup and the quota-first ordering rule — docs/brain/gotchas/backend.md

### Plan 419 — Bring the initial bundle back under its size budget
- [ ] A1: Measure what fills the first download and pick what to cut — stats-json breakdown, top 15 and chosen cuts in Execution Notes — angular.json (read), build output
- [ ] A2: Load the header's click-only parts on first use instead of at startup — @defer / lazy pieces, unused imports removed — src/app/core/components/header/**
- [ ] A3: Trim the other always-on shell parts and unused icons — tab-chips, scroll-rail, hero-fab, Lucide pick — src/app/core/components/tab-chips/**, hero-fab/**, src/app/shared/scroll-rail/**, src/app/app.config.ts
- [ ] A4: Raise the warning budget on purpose only if trimming was not enough — new value + one-line reason — angular.json

### Plan 422 — Nightly QA morning report and shorter runs once pages are clean
- [ ] H1: Review only pages whose code changed so nights get shorter as the app gets cleaner — citedFiles at ingest, due/skipped rule with a 14-day full review, Nothing-to-review queue, tests — scripts/qa/code-qa/rotation.mjs, scripts/test/code-qa-rotation.test.mjs, scripts/test/fixtures/code-qa/**
- [ ] H2: Tell the Code QA agent to skip unchanged pages and stop when nothing is due — work only numbered pages, ignore Skipped, Nothing-to-review rule — docs/qa/code-qa-agent.md
- [ ] H3: Write one morning report that says whether the night needs anything from you — status, Do now, steps, new/fixed/open, history line, tests on fixture folders — scripts/qa/morning-report.mjs, scripts/test/qa-morning-report.test.mjs, scripts/test/fixtures/qa-morning/**
- [ ] H4: Produce the report every morning after QA stops — call morning-report.mjs from the 07:30 down step and log it — scripts/qa/qa-nightly-down.ps1
- [ ] H5: Show the morning report's status line when Claude Code opens in the main folder — morning-brief.mjs SessionStart hook, silent in slots and when stale, drift note — scripts/qa/morning-brief.mjs, .claude/settings.json, docs/workflow-kit/drift-classification.md
- [ ] H6: Explain the morning report and the shorter nights in the QA docs — Every morning section, due/skipped rule, file table — docs/qa/README.md, docs/qa/code-qa.md
- [ ] H7: Test, run the report on the real QA folder and hand you the two morning checks — npm run test:scripts, morning-report --out=- on C:/dev/foodVibe-qa, ng build; Human checks the first and second mornings — this plan file

### Plan 423 — Give each product its own weight for its purchase units
- [x] U1: Read every purchase unit in the product's base unit, honoring the unit after the colon — optionRateInBase util + spec; use it in recipe-cost, product-price, ingredients-table line cost, inventory list unit change — src/app/core/utils/purchase-option-rate.util.ts, src/app/core/services/recipe-cost.service.ts, src/app/core/utils/product-price.util.ts, recipe-ingredients-table.component.ts, inventory-product-list.component.ts
- [x] U2: Let the unit window ask how much one unit of this product weighs, also for an existing unit name — forProduct context, productUnitAdded$, product-mode title and label, two dictionary keys, specs — src/app/core/services/unit-registry.service.ts, src/app/shared/unit-creator/**, public/assets/data/dictionary.json
- [x] U3: Make the product form use this product's own number for every purchase unit — product-mode add, no shared pre-fill for custom units, pickNewUnit_ replaces the close effect (INVF-C06), specs — src/app/pages/inventory/components/product-form/**
- [x] U4: Ask the product's own weight when a unit is added from a recipe line or cook view — product mode, save the typed amount, drop the shared-rate math, specs — recipe-ingredients-table.component.ts, cook-view.page.ts and their specs
- [x] U5: Add a read-only check that lists products and recipe lines the old behavior may have got wrong — three sections, local and Atlas — server/scripts/check-unit-weights.js
- [ ] U6: Build, test, run the local check and hand you the Atlas check and the onion/pickles checks — ng build, the listed specs, log-query, check script on local; Human runs Atlas and the four app checks — this plan file

### Plan 440 — Store event and serving coefficients and compute portions in one place (`plans/440-store-event-and-serving-coefficients-and-compute-portions-in-one-place.plan.md`)

- [ ] Schema: `coefficient` on `eventType` and `menuType` terms; event snapshots; item `portionsPerDiner`,
- [x] C1: Add coefficients to event and serving types, and type snapshots to events, in the schema — coefficientSchema, eventType member, menuType coefficient, typeSnapshotSchema, item portionsPerDiner / coefficientOverride, predictedTakeRate optional; npm run build:schemas; schema tests — shared/schemas/entities/taxonomy-term.schema.ts, shared/schemas/entities/menu-event.schema.ts, server/test/coefficient-schema.test.js
- [x] C2: Mirror the new event fields in the client model so the app keeps compiling — TypeSnapshot, eventTypeSnapshot / servingTypeSnapshot, portionsPerDiner, coefficientOverride, predictedTakeRate optional; `item.predictedTakeRate ?? 0` in hydrateDerivedPortions — src/app/core/models/menu-event.model.ts, src/app/core/services/menu-intelligence.service.ts
- [x] C3: Compute every menu item's portions in one pure function with the agreed rounding — computePortions, defaultCoefficient, isValidCoefficient, formatCoefficient per Design; spec with every acceptance number in Done-when — src/app/core/engine/portions.ts, src/app/core/engine/portions.spec.ts
- [x] C4: Write migration 0007 that seeds coefficients and gives old events snapshots of 1.0 — pure functions + plan / write / verify / main per Design, dry run default, --write=yes + --backup-dir, --db scratch, --confirm-host, --verify=yes; vitest on fixtures incl. second run = 0 changes — server/migrations/0007-coefficients.js, server/test/migration-0007-coefficients.test.js
- [x] C5: Seed a fresh database with the default event and serving types and their coefficients — defaultMasterRegistries + seedMasterTaxonomy; add chef_plated_front to the dictionary; seed test — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js, public/assets/data/dictionary.json
- [x] C6: Rehearse migration 0007 locally and on an Atlas copy, then hand Dandan the Atlas dry run — slot DB: dry → write → dry (0) → verify; db-backup atlas → db-restore into foodvibe_scratch_0007 → same sequence; Atlas dry run with --confirm-host; paste counts, folds and portions-change list into session state; STOP for `go 0007` — this plan file, docs/session-state-<branch>.md
- [ ] C7: After Dandan's go, write Atlas and verify — fresh atlas backup (< 24 h) → --write=yes --backup-dir → --verify=yes exit 0 — this plan file
- [x] C8: Build, run the specs and server tests, check the error log — ng build, ng test (listed specs), npm --prefix server test, log-query — this plan file

### Plan 442 — Give every event a stage, a stage history and a notes log on the server (`plans/442-give-every-event-a-stage-a-stage-history-and-a-notes-log-on-the-server.plan.md`)

- [x] S1: Define the event stages and the server-owned event fields once, for client and server — EVENT_STAGES, NOT_CLOSED_REASONS, NOT_CLOSED_FROM, CLOSED_FROM_INDEX, NOTE_MAX_LENGTH, EVENT_SERVER_FIELDS; re-export from the entities index — shared/schemas/entities/event-stage.ts, shared/schemas/entities/index.ts
- [x] S2: Add stage, history, notes, customer and deposit fields to the event schema and model — per Design; npm run build:schemas; schema tests — shared/schemas/entities/menu-event.schema.ts, src/app/core/models/menu-event.model.ts, server/test/event-stage-schema.test.js
- [x] S3: Encode every stage-move and note rule in pure functions — applyStageChange, newNote per Design; tests for every case in Done-when — server/utils/event-stage.js, server/test/event-stage.test.js
- [x] S4: Serve stage moves and notes from a dedicated events router — routes per Design with scopeFilter, assertCan, author check, rate limit, logging; mount at /api/v1/events; router tests — server/routes/events.js, server/app.js, server/test/events-router.test.js
- [x] S5: Keep stages and notes server-only in the generic data API — POST stamps inquiry + first history + empty notes; POST and PUT drop EVENT_SERVER_FIELDS for menuEvents; tests in events-router.test.js — server/routes/generic.js
- [x] S6: Write migration 0008 that gives every existing event a stage and marks it old — pure functions, plan / write / verify / main, modes per Design; vitest incl. second run = 0 — server/migrations/0008-event-stages.js, server/test/migration-0008-event-stages.test.js
- [x] S7: Document the events endpoints for the next plans — add the /api/v1/events rows and why a dedicated router (server-owned history) to §5 — docs/agent/standards-backend.md
- [ ] S8: Rehearse migration 0008 locally and on an Atlas copy, then hand Dandan the Atlas dry run — slot DB dry → write → dry (0) → verify; restored copy foodvibe_scratch_0008 same; Atlas dry run with --confirm-host; counts into session state; STOP for `go 0008` — this plan file, docs/session-state-<branch>.md
- [ ] S9: After Dandan's go, write Atlas and verify — fresh atlas backup (< 24 h) → --write=yes --backup-dir → --verify=yes exit 0 — this plan file
- [ ] S10: Build, run server tests, check the error log — ng build, npm --prefix server test, log-query — this plan file

### Plan 450 — Add the reuse layer: a component registry, a decision ladder and checks that catch a new copy (`plans/450-add-the-reuse-layer-a-component-registry-a-decision-ladder-and-checks-that-catch.plan.md`)

- [x] S1: Reality check — print ok/conflict per symbol listed in Step 0 and record current copy counts — `docs/mvp/runs/450.md`
- [x] S2: Write the registry from the audit family map plus MVP-added families, with the current copy counts and which plan (451–457) removes each copy — `docs/brain/component-families.md`, `docs/brain/index.md`
- [ ] S3: CHECKPOINT — Human reads the registry and says `approved registry` or lists corrections — `docs/brain/component-families.md`
- [x] S4: Write the decision ladder and sibling rule, add the Standards-index row and the Skill-trigger row, and the ADR — `docs/agent/standards-reuse.md`, `AGENTS.md`, `docs/brain/decisions/0024-reuse-layer.md`
- [x] S5: Add the `## Reuse Check` section to the plan template, plan checks and save-plan checklist; add the `overrides` entries — `.claude/references/prd-template.md`, `docs/agent/plan-checks.md`, `.claude/skills/save-plan/SKILL.md`, `kit.config.json`, `docs/workflow-kit/drift-classification.md`
- [x] S6: Build `--reuse` (parser in `scripts/lib/reuse-check.mjs`, one import + one dispatch line in `scope-check.mjs`) with fixture plans and tests — `scripts/scope-check.mjs`, `scripts/lib/reuse-check.mjs`, `scripts/test/reuse-check.test.mjs`, `scripts/test/fixtures/reuse/**`
- [x] S7: Build `reuse-lint.mjs` with the rules table, `--diff`, `--check-registry` and `npm run lint:reuse`; tests on fixture diffs — `scripts/reuse-lint.mjs`, `scripts/lib/registry-families.mjs`, `scripts/test/reuse-lint.test.mjs`, `scripts/test/fixtures/reuse/**`, `package.json`
- [x] S8: Add `@pipes/*` to `tsconfig.json`, convert the two relative pipe imports, run `ng build`, `ng test`, `npm run test:scripts`, log-query; write the run file with the validation cards — `tsconfig.json`, `src/app/shared/export-preview/export-preview.component.ts`, `src/app/shared/change-popover/change-popover.component.ts`, `docs/mvp/runs/450.md`

### Plan 490 — Pasted ingredient lines match existing products first and Not Ready never saves (`plans/490-pasted-ingredient-lines-match-existing-products-first-and-not-ready-never-saves.plan.md`)

- [x] S1: Let the AI matching answer carry a short list of options when it is unsure — `productNameMatchResponseSchema` entries get optional `options: z.array(z.number().int()).optional()` with **no `.max()` / `.min(0)` on the array or its items** (the same schema parses the model's raw answer, so one over-long or out-of-range options list must not make `safeParse` reject the whole answer; `cleanProductMatches` does the capping and range check); export `PRODUCT_MATCH_MAX_OPTIONS = 5`; run `npm run build:schemas` — shared/schemas/ai-product-match.schema.ts
- [x] S2: Teach the server step to read names in any language and to return options instead of guessing — prompt: names come from a chef in any language (Hebrew, English, …) and may carry an amount, a pack word or a remark («קצת», «לפי הטעם») to ignore; set `product` only when exactly one product is clearly the same food (unchanged rule, still `חלב` ≠ `חלבה`); when two to five products could be that food and you cannot tell which, set `product` null and list them in `options`; otherwise null with no options; `cleanProductMatches` keeps `product` entries as today, keeps `product: null` entries only with cleaned options (in range, unique, max 5; dropped when `product` is set), and the done log line gains an `options` count; server tests as in Done-when — server/routes/ai.js, server/test/ai-match-product-names.test.js
- [x] S3: Give the shared matcher an options result next to the links, without changing the import page — new `matchNamesWithOptions(items, options)` returning `{ linked: Map<key, NameMatchResult>, options: Map<key, Product[]> }`; `NameMatchItem` gets optional `linkable?: boolean` (default true); tier-2 `ambiguous` candidates are kept and become options when the AI does not link that name (also after an AI failure); a non-linkable item never enters `linked` (an AI `product` for it becomes a one-item option, a local exact/variant hit too); options capped at 5, in the model's order then local; `matchNames` delegates and returns `linked`; spec — product-name-matcher.service.ts, product-name-matcher.service.spec.ts
- [x] S4: Send pasted text lines to the matcher for options only and keep each row's options — in `onPasteIngredients` queue text lines as `{ name: line.text, linkable: false }` next to the unlinked parsed lines; `linkPastedByAi_` calls `matchNamesWithOptions`, links as today, and stores options per row in a signal `rowOptions_` (a `Map<FormGroup, readonly Product[]>`, replaced not mutated) only while the row is still in the table, unlinked and its name unchanged; drop a row's options when it gets linked or cleared — recipe-ingredients-table.component.ts
- [x] S5: Make «לא מוכן» open the search with the inventory's options instead of saving a stub product — `onUnlinkedBadgeClick` keeps the plan-485 exact-name branch; otherwise it only sets `editingNameAtRow_` to that row (no `addProduct`, no `saveProduct`); `suggestionsFor(group)` = the row's stored options, then the local `matchProductName` result for its name over `KitchenStateService.products_()` (exact/variant product, or ambiguous candidates), no duplicates, max 5; the template passes `[suggestions]` to the row's `app-ingredient-search` only for the row being edited; remove the stub code and the imports it alone used — recipe-ingredients-table.component.ts, recipe-ingredients-table.component.html
- [x] S6: Keep the pasted amount and unit when the chef picks a product for an unlinked row — in `onItemSelected`, when the row being edited had no `referenceId` and has an amount above 0, keep its `amount_net` and `unit` (the unit dropdown already lists the row's current unit); other rows keep today's behaviour (checks 41-42) — recipe-ingredients-table.component.ts
- [x] S7: List the inventory's options first in the ingredient search, marked as suggestions — new input `suggestions = input<readonly Product[]>([])`; the combobox `options` become suggestions (as `item_type_: 'product'`, filtered by `excludeNames`) followed by `filteredResults_()` without the same `_id`, while the trimmed query equals the trimmed `initialQuery()`; once the user types something else, only the normal search; `knownOptions` includes the suggestions so an exact name still hides the add row (rule X); each suggestion row shows a `c-chip c-chip--tag c-chip--sm` «הצעה מהמלאי» chip; the add option and quick-add flow stay as they are (saves only on the window's «שמור») — ingredient-search.component.ts, ingredient-search.component.html, ingredient-search.component.scss (only if the chip needs spacing; logical properties, cssLayer skill first)
- [x] S8: Add the suggestion label and make the hint say what the badge now does — append `"ingredient_suggestion": "הצעה מהמלאי"` next to `ingredient_not_ready`; keep `unlinked_ingredient_hint` (it already says «לחץ לחיפוש וקישור») — public/assets/data/dictionary.json
- [x] S9: Specs for the table, search and matcher as listed in Done-when; update the plan-463 spec "never sends a text-only line to the AI step" to "sends a text-only line for options only and never links it" — recipe-ingredients-table.component.spec.ts, ingredient-search.component.spec.ts, product-name-matcher.service.spec.ts
- [ ] V1: Build, run every listed test, replay the cards in the browser and write the run file — `npx ng build`, the `ng test` includes, the server tests, the grep, log-query; record evidence, decisions and the five cards — docs/mvp/runs/490.md

### Plan 497 — Run the project rule checks on every pull request and clean up merged branches (`plans/497-run-the-project-rule-checks-on-every-pull-request-and-clean-up-merged-branches.plan.md`)

- [ ] S1: Make the three rule checks that fail today pass on main, so they can safely become PR gates — classify the 56 unclassified files in docs/workflow-kit/manifest.json, fix the stale and missing entries in the core services and core models breadcrumbs, replace the native select in the AI product modal with app-custom-select (follow the add-option rule in docs/agent/standards-domain.md) — docs/workflow-kit/manifest.json, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/shared/ai-product-modal/*
- [ ] S2: Add a rules workflow that runs the project's own rule checks on every pull request and every push to main — lint:icons, lint:no-native-select, plan-ledger-check, kit-manifest-check, breadcrumbs-check, with picomatch installed via npm ci --prefix scripts — .github/workflows/rules.yml
- [ ] S3: Let CI catch a Worker branch that edited files outside its plan's Read-Write Scope — new wrapper that maps a feat/NNN-* head branch to plans/NNN-*.plan.md and runs scope-check --diff against the PR base, skipping other branch names, plus its node tests — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [ ] S4: Wire that scope check into the rules workflow as its own step on pull requests, passing the branch name through an env variable — .github/workflows/rules.yml
- [ ] S5: Add a weekly workflow that opens or updates a single "Stale branches" issue listing unmerged branches with no commit for 30+ days, without deleting anything — .github/workflows/stale-branches.yml, docs/workflow-kit/manifest.json
- [ ] S6: Turn on GitHub's automatic deletion of merged pull-request branches — one repo-setting command run by the Human (gh api -X PATCH repos/WDD-CODER/foodVibe1.0 -f delete_branch_on_merge=true), then record the setting and the new checks in docs/agent/standards-git.md
- [ ] S7: Check the gates fail when they should — open a throwaway PR with a native select in a template and confirm the rules check goes red, then close it — Human check, no files
