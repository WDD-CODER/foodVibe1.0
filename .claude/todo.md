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
- [ ] A5: Build, test and check existing venues still open and save — Build, specs. Open 2 existing venues (one with free-text hours), edit and save, check no 400s.

### Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location" (`plans/design/373-venues-c-tour-videos-current-location.plan.md`)
- [ ] A1: Let a venue store tour video links and a saved location — Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Add tour videos with a visit date to the venue form and detail page — Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Add a "save my current location" button and navigation links — Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, test and try it on a phone over HTTPS — Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine).

### Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form (`plans/design/374-venues-d-infrastructure-vs-equipment-groups.plan.md`)
- [ ] A1: Sort venue equipment into infrastructure and regular groups behind the scenes — Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [ ] A2: Show infrastructure and regular equipment as two groups on the venue pages — Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Hint in the equipment form which items count as infrastructure — Equipment-form infrastructure hint (`equipment-form/**`).
- [ ] A4: Build, test and check an existing venue still saves — Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400.

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
- [x] S8: Turn on the nightly schedule after your go and receive the first PR — Register the task (Dandan's go), receive one nightly PR — local machine
- [x] S9: Note the skill improver in FoodVibe's manifest and ship — FoodVibe manifest note; `/ship` — `docs/workflow-kit/manifest.md`
- [x] S10: Review after one month whether the improvements helped — One-month review (2026-11-17 or later) — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`

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

### Plan 422 — Nightly QA morning report and shorter runs once pages are clean
- [ ] H1: Review only pages whose code changed so nights get shorter as the app gets cleaner — citedFiles at ingest, due/skipped rule with a 14-day full review, Nothing-to-review queue, tests — scripts/qa/code-qa/rotation.mjs, scripts/test/code-qa-rotation.test.mjs, scripts/test/fixtures/code-qa/**
- [ ] H2: Tell the Code QA agent to skip unchanged pages and stop when nothing is due — work only numbered pages, ignore Skipped, Nothing-to-review rule — docs/qa/code-qa-agent.md
- [ ] H3: Write one morning report that says whether the night needs anything from you — status, Do now, steps, new/fixed/open, history line, tests on fixture folders — scripts/qa/morning-report.mjs, scripts/test/qa-morning-report.test.mjs, scripts/test/fixtures/qa-morning/**
- [ ] H4: Produce the report every morning after QA stops — call morning-report.mjs from the 07:30 down step and log it — scripts/qa/qa-nightly-down.ps1
- [ ] H5: Show the morning report's status line when Claude Code opens in the main folder — morning-brief.mjs SessionStart hook, silent in slots and when stale, drift note — scripts/qa/morning-brief.mjs, .claude/settings.json, docs/workflow-kit/drift-classification.md
- [ ] H6: Explain the morning report and the shorter nights in the QA docs — Every morning section, due/skipped rule, file table — docs/qa/README.md, docs/qa/code-qa.md
- [ ] H7: Test, run the report on the real QA folder and hand you the two morning checks — npm run test:scripts, morning-report --out=- on C:/dev/foodVibe-qa, ng build; Human checks the first and second mornings — this plan file

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

### Plan 498 — Protect unsaved work everywhere (`plans/498-protect-unsaved-work-everywhere.plan.md`)

- [ ] A1: Check the brief's list of unprotected screens against today's code and record the real list — reality check of every route, tab, page and popup named in the Problem Statement (counts and line numbers drift) — this plan file
- [ ] A2: Make a popup ask before throwing away typed edits when closed by Escape or a click outside — one input on the shared popup frame; explicit Cancel / X never asks; Escape stack stays correct — src/app/shared/modal-shell/**
- [ ] A3: Use that question in every popup that holds free edits, and skip the ones that hold none — quick-edit/quick-add product, add-item, add-equipment, unit-creator, label-creation, AI recipe/product/menu modals, unit-edit-dialog, quick-edit product panel — the popup folders in scope
- [ ] A4: Stop the equipment and supplier forms from silently dropping edits when the user clicks away — `useUnsavedChanges` + `pendingChangesGuard` + the route guard entries; `markSaved` after load and save — src/app/pages/equipment/components/equipment-form/**, src/app/pages/suppliers/components/supplier-form/**, src/app/app.routes.ts
- [ ] A5: Ask before a settings tab switch drops edits on the baseline, business or business-name form — prove the guard runs on `?tab=` changes like the dashboard — src/app/pages/settings/**
- [ ] A6: Show the browser's leave-site dialog on reload for every page that tracks unsaved changes — automatic from the guard where possible, else call `warnBeforeUnload` in each page — the page `.ts` files and guard utilities in scope
- [ ] A7: Remove the native prompt in the translation service, or route it to the translation-key popup if something still calls it — grep and `knip` first — src/app/core/services/translation.service.ts
- [ ] A8: Warn on any new `window.confirm`, `alert` or `prompt`, and register the changes in the component registry — one `reuse-lint` rule with a fixture test; update the `entity-form` and `modal-shell` families — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, scripts/test/fixtures/reuse/**, docs/brain/component-families.md
- [ ] A9: Cover the new behaviour with specs and run the full checks — guard specs, popup discard spec, `ng build`, headless `ng test`, the grep, reuse-lint, log-query; paste the output in Execution Notes — the spec files in scope

### Plan 499 — Number box: tap anywhere on it to edit the whole number (`plans/499-number-box-tap-anywhere-to-edit-the-whole-number.plan.md`)

- [ ] N1: List every number box where a tap misses the number today and record the list — reality check of the containers named in the Problem Statement, plus any the brief missed — this plan file
- [ ] N2: Build one shared "tap the box, edit the whole number" behaviour that ignores buttons inside the box and disabled boxes — container directive (or label wrapper) next to the select-all directive, with its spec — src/app/core/directives/number-box.directive.ts, src/app/core/directives/number-box.directive.spec.ts
- [ ] N3: Make the pricing meter and the counter value cell use it, including the lock-icon and suffix cases — pricing-meter, shared/counter — src/app/pages/menu-intelligence/components/pricing-meter/**, src/app/shared/counter/**
- [ ] N4: Make the product form and the purchase-option row use it — buy price, waste %, yield, purchase options — src/app/pages/inventory/components/product-form/**, src/app/pages/inventory/components/product-import/**
- [ ] N5: Make the recipe builder quantity and time cells use it without breaking Enter-to-next-row — recipe-ingredients-table, recipe-workflow — src/app/pages/recipe-builder/components/**
- [ ] N6: Make the cook-view amount and clock boxes and the menu guest chip use it — src/app/pages/cook-view/cook-view.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.html
- [ ] N7: Make the settings, metadata, event dialogs and AI / quick-add / unit modals' number boxes use it — the remaining containers from N1 — the folders in scope
- [ ] N8: Warn when a number input is added outside a number box, and register the family — `reuse-lint` rule with fixtures; new `number-box` family with its remaining copies — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] N9: Run the full checks and paste the output — `ng build`, headless `ng test`, reuse-lint, scope-check, log-query — Execution Notes

### Plan 500 — One stepper (+/−) for every number: same hold-to-repeat, steps and minimum (`plans/500-one-stepper-for-every-number-same-hold-to-repeat-steps-and-minimum.plan.md`)

- [ ] T1: List every +/− control around a number and what each one does today, and record the list — hold or click only, step size, minimum, disabled look — this plan file
- [ ] T2: Make the shared counter hold-to-repeat with pointer events so it works on touch and mouse, and add specs — release stops the repeat, the minimum stops it and disables the minus — src/app/shared/counter/**
- [ ] T3: Decide extend-or-sibling for the counter and add the page skins as variants — cook-view ink set and menu-intelligence paper skin — src/app/shared/counter/**
- [ ] T4: Move the menu guest count onto the shared stepper and delete its own hold code — src/app/pages/menu-intelligence/**
- [ ] T5: Move the cook-view amount steppers onto it — src/app/pages/cook-view/**
- [ ] T6: Move the recipe ingredient quantity and the labor / cook time steppers onto it — src/app/pages/recipe-builder/components/recipe-ingredients-table/**, src/app/pages/recipe-builder/components/recipe-workflow/**
- [ ] T7: Warn when a minus/plus pair is added next to a number input outside the stepper, and register the family — `reuse-lint` rule with fixtures; new `stepper` family with its remaining copies — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] T8: Run the full checks and paste the output — `ng build`, headless `ng test`, reuse-lint, scope-check, log-query — Execution Notes

### Plan 501 — Delete versus undo: entity deletes keep the popup, line removals get an undo toast (`plans/501-delete-versus-undo-entity-deletes-keep-the-popup-line-removals-get-an-undo-toast.plan.md`)

- [ ] D1: List every remove / delete handler named in the Problem Statement, mark each as entity, line or neither, and record it — include the two open calls (`team-tab removeMember`, `event-notes-log`) — this plan file
- [ ] D2: Give line removals one shared way to remove at once and show an undo toast that puts the line back in the same place — small helper next to the existing toast service, with its spec — src/app/core/services/user-msg.service.ts
- [ ] D3: Use it for the form rows in the product form, product import, venue form and recipe builder — purchase options, import rows, hours / infrastructure rows, baseline rows, ingredient and workflow rows — the page folders in scope
- [ ] D4: Use it for the rows inside the AI modals, the scaling chip, cook-view ingredients, menu sections and prep sheets — src/app/shared/ai-recipe-modal/**, src/app/shared/ai-product-modal/**, src/app/shared/scaling-chip/**, src/app/pages/cook-view/**, src/app/pages/menu-intelligence/**
- [ ] D5: Make deleting an event note and an event photo undoable, re-creating the saved item on undo, with specs — event-notes-log, event-closing-dialog — src/app/pages/menu-intelligence/components/event-notes-log/**, src/app/pages/menu-intelligence/components/event-closing-dialog/**
- [ ] D6: Keep the confirm popup for entity deletes and for removing a team member, and fix any entity delete that skips it — src/app/pages/settings/components/team-tab/** and the handlers marked entity in D1
- [ ] D7: Run the full checks and paste the output — `ng build`, headless `ng test`, scope-check, log-query — Execution Notes

### Plan 502 — Consistency sweep: one date field, one number format, growing textareas and one save-busy state (`plans/502-consistency-sweep-one-date-field-one-number-format-growing-textareas-and-one-save-busy-state.plan.md`)

- [ ] C1: Check the four lists in the Problem Statement against today's code and record the real ones — native dates, `| number` and `toFixed` uses, textareas, save buttons without a busy flag — this plan file
- [ ] C2: Replace the native date inputs with the shared date field and add a from / to variant only if the list filters need it — recipe-book-list, menu-library-list, menu-intelligence page — src/app/shared/date-field/**, the page folders in scope
- [ ] C3: Show numbers through one rule: pick the pipe for quantity, money and percent, move the other uses onto it and remove `toFixed` in templates — record the rule and any value that changes — src/app/shared/ai-menu-modal/**, src/app/shared/ai-product-modal/**, src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [ ] C4: Make every multi-line free-text box grow as the user types, and list the ones that stay fixed — extend the directive's selector so it cannot be forgotten — src/app/core/directives/textarea-auto-grow.directive.ts, the templates in scope
- [ ] C5: Give every save button one saving state: disabled with a busy label while it runs, enabled again on error — one signal name and one button state; fix the ten screens without a flag — src/styles.scss, the dialogs and tabs in scope
- [ ] C6: Warn when a native date input, a template `toFixed` or a bare textarea is added, and register the families — `reuse-lint` rules with fixtures; update the `form-field` and `engine-classes` families — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] C7: Add specs for the double-click save guard and run the full checks — `ng build`, headless `ng test`, the two greps, reuse-lint, scope-check, log-query; paste the output in Execution Notes — the spec files in scope

- [ ] A1: Delete the 140 old per-branch state files from git and the local pointer file so no agent reads stale status again — git rm the 140 tracked state files under docs/; delete the untracked pointer file under .claude/ — docs/ (the old per-branch state files)
- [ ] A2: Rebuild the two kit-override files from kit v1.9.0 and put only the reuse layer back, so they stop allowing a state file and gain the kit's newer checks — render placeholders by hand; keep import + --reuse dispatch; keep ## Reuse Check block; update override reasons — scripts/scope-check.mjs, .claude/references/prd-template.md, kit.config.json
- [ ] A3: Rewrite the rules and brain docs so they say where work status lives now instead of naming the old file — AGENTS.md compaction rule with the kit's wording; brain points to plans, todo, git and PR; gitignore lines 62 and 73–78 removed; workflow map rows for dead scripts removed — AGENTS.md, .gitignore, docs/brain/index.md, docs/brain/glossary.md, docs/brain/projectbrief.md, docs/brain/how-it-works.md, docs/brain/gotchas.md, docs/brain/gotchas/agent-workflow.md, docs/brain/gotchas/git-workflow.md, docs/agent/workflow-map.md, docs/workflow-kit/parameters.md
- [ ] A4: Make the CI scope-check test prove the branch naming without relying on a state file being allowed — header comment reworded; test at line 145 commits an in-scope fixture file — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [ ] A5: Clean the two plans from the live run only if they are still open after the run merges — Always-allowed line only; closed plans in plans/<range>/ stay untouched — plans/419-*.plan.md, plans/497-*.plan.md
- [ ] A6: Prove nothing FoodVibe owns still names the old file and the build and script tests pass — run the Done-when grep, pnpm run build, pnpm run test:scripts, the --deps/--reuse checks and the two kit diffs; paste outputs — this plan file (Execution Notes)

### Plan 507 — Unit tests stop sending log calls to the real backend, and unknown origins get a quiet 403 (`plans/507-unit-tests-stop-sending-log-calls-to-the-real-backend-and-unknown-origins-get-a-quiet-403.plan.md`)

- [ ] A1: Add a test-only settings file that turns off sending logs to a server — sendLogsToServer key in every environment file, false in the new environment.test.ts — src/environments/**
- [ ] A2: Make the unit tests use that test-only settings file — fileReplacements on the Karma test target — angular.json
- [ ] A3: Stop the logger from sending anything when the switch is off — early return before fetch; specs that test shipping turn it on — src/app/core/services/logging.service.ts, src/app/core/services/logging.service.spec.ts
- [ ] A4: Answer an unknown origin with a plain 403 logged once, never a 500 with a stack trace — middleware before cors(), Set of seen origins, warn cors.origin_rejected — server/app.js
- [ ] A5: Prove both fixes with tests and a clean log after a full test run — new server test, pnpm run build, pnpm run test:ci with the backend up, server tests, log-query; paste outputs — server/test/cors-origin.test.js, this plan file
