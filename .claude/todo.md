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

### Plan 377 — Units A: edit a custom unit's name and conversion in the metadata manager (`plans/377-units-a-rename-edit-unit-cascade-own-data.plan.md`)
- [ ] A1: Let the unit registry rename a custom unit or change its conversion safely — `renameUnit` / `updateUnitRate` with guards + specs — `src/app/core/services/unit-registry.service.ts`, `unit-registry.service.spec.ts`
- [ ] A2: Add an Edit button and dialog for custom units in the metadata manager — Edit action for custom units only; edit dialog (label, key, conversion) — `src/app/pages/metadata-manager/**`, `src/app/shared/unit-creator/**`
- [ ] A3: Update every product and recipe that uses a unit when it is renamed — `unit` branch in `onRenameMetadata` + `getAffectedCount` + `reloadAfterRename`; confirms; dictionary keys; drop the out-of-scope comment — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `public/assets/data/dictionary.json`
- [ ] A4: Prove a rename keeps costs the same and a conversion change updates them — Build + specs; manual test on the isolated DB (rename a custom unit used in 2 products and 1 recipe, cost unchanged; change its conversion, cost changes); update session-state — `docs/session-state-<branch>.md`

### Plan 400 — Dropdown add option, part 1: shared helper and the shared selects (`plans/400-dropdown-add-option-part-1-shared-helper-shared-selects.plan.md`)

- [ ] A1: List every shared dropdown that offers "add new" and the label each one needs — Audit callers of `custom-select` / `custom-multi-select` / `chip-search-dropdown` that enable add; list each with its "thing" and the `add_new_<thing>` key it needs (session-state) — `src/app/**/*.html`
- [ ] A2: Write one shared helper that decides when and how "add new" shows — `src/app/core/utils/add-option.util.ts` + spec (rules 1–4)
- [ ] A3: Share the menu's keyboard search so every dropdown navigates the same way — `src/app/core/utils/keyed-picker-search.util.ts` + spec — `KeyedPickerSearch` copied from the menu service (rule 5) + scroll helper
- [ ] A4: Build one reusable "add new" row for dropdown lists — `src/app/shared/add-option-row/` component
- [ ] A5: Use the add row and keyboard rules in the single-select dropdown — Apply to `shared/custom-select` (label, filter by label, stored-key select; keyboard via A3)
- [ ] A6: Use them in the multi-select dropdown and drop its duplicate add button — Apply to `shared/custom-multi-select`; remove the second (dynamic) add button; keyboard via A3 (Space toggles)
- [ ] A7: Use them in the chip search dropdown — Apply to `shared/chip-search-dropdown`; keyboard via A3 (focus stays in input, no wrap)
- [ ] A8: Give each dropdown its own Hebrew "add new <thing>" label — Callers: pass the right `add_new_<thing>` key (escalate each path via `approved:`); append missing keys to `dictionary.json`
- [ ] A9: Build, test and hand you a click list for every dropdown — `ng build` + `ng test` green, `rg` checks from Success empty; hand the Human the click list (incl. keyboard check per select)

### Plan 401 — Dropdown add option, part 2: page dropdowns in recipe builder and menu (`plans/401-dropdown-add-option-part-2-page-dropdowns-recipe-builder-menu.plan.md`)

- [ ] A1: Recheck which page dropdowns still need the fix after part 1 merged — Re-check the audit list on current main (after 397/398/400 merged); list the 7 `filterOptionsByStartsWith(` calls with verdicts — session-state
- [ ] A2: Move the menu's picker search onto the shared keyboard helper — Menu: `MenuPickerSearchService` onto `core/utils/keyed-picker-search.util.ts`; delete the local `KeyedPickerSearch`
- [ ] A3: Give the ingredient search the shared add option and keyboard rules — `ingredient-search` component onto the helpers (add option + keyboard rule 5)
- [ ] A4: Give the preparation search the shared add option and arrow-key navigation — `preparation-search` component onto the helpers (add option + keyboard rule 5 — adds arrows)
- [ ] A5: Give the logistics tool picker one add option and keyboard rules — Logistics tool picker (`recipe-builder.page.html` + logistics picker service) — one add option; keyboard rule 5
- [ ] A6: Make the menu event-type dropdown show and filter by translated labels — Menu event type (`menu-intelligence.page.ts/.html`) — label, filter by translated label, stored-key select; keyboard via `KeyedPickerSearch`
- [ ] A7: Fix the remaining dropdowns that filter by raw keys instead of labels — Fix any raw-key `filterOptionsByStartsWith(` callers from A1; move the section-category dropdown onto the helper (P1)
- [ ] A8: Add the missing Hebrew "add new <thing>" labels — Append missing `add_new_<thing>` keys to `dictionary.json`
- [ ] A9: Build, test and hand you a click list, including a menu regression check — `ng build` + `ng test` green, `rg` checks from Success; hand the Human the click list (incl. keyboard check per dropdown + menu regression)

### Plan 402 — Dropdown add option, part 3: convention doc and trigger (`plans/402-dropdown-add-option-part-3-convention-doc-trigger.plan.md`)

- [ ] A1: Write the dropdown "add new" rule into the domain standards — Rule section in `docs/agent/standards-domain.md` incl. keyboard subsection (helper/component names from merged plan 400)
- [ ] A2: Point agents to the rule from AGENTS.md — Trigger row in `AGENTS.md`
- [ ] A3: Save the dropdown pattern in the project brain — `docs/brain/patterns/dropdown-add-option.md` + line in `docs/brain/index.md`
- [ ] A4: Run the doc checks and have you read the rule — `rg`, `kit-owned --check`, `kit-manifest-check` green (classify the new pattern file in `docs/workflow-kit/manifest.json` via `approved:` if the check asks); Human reads the rule

### Plan 407 — One soft-delete model and per-user state (userPrefs) (`plans/407-one-soft-delete-model-and-user-prefs.plan.md`)

- [ ] P6.0: Check who reads and writes deleted items before changing anything, then get your go — Reality Check (readers/writers, Atlas counts, model + purge window) → Human go — `docs/session-state-<branch>.md`
- [ ] P6.1: Use one "deleted at / by" model on the server, with a purge job — `deletedAt`/`deletedBy` model in schemas + `generic.js` + purge job, with server tests — `shared/schemas/**`, `server/routes/generic.js`, `server/jobs/**`, `server/test/**`
- [ ] P6.2: Keep each user's favorites and hidden items in one user-prefs record — `userPrefs` schema + server repo/routes + client `UserPrefsStore`; recipe/dish favorite + hide moved onto it — `shared/schemas/**`, `server/repositories/**`, `src/app/core/services/**`
- [ ] P6.3: Move existing data onto the new delete model, dry run first — `server/migrations/0005-soft-delete-unify.js` (dry run on Atlas copy → Human go → Atlas) + read-only check script — `server/migrations/**`
- [ ] P6.4: Rebuild the trash page on the new delete model — Trash UI on `deletedAt`; `trash.service.ts` rewritten — `src/app/pages/trash/**`, `src/app/core/services/trash.service.ts`
- [ ] P6.5: Record the decision, then build, test and hand you a check list — ADR + brain index (P1); build, tests, Human check list — `docs/brain/**`

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

### Plan 412 — Kit Patch Fixes for Hooks, Session Start and CI from the React-Vite Adoption (`plans/412-kit-patch-fixes-hooks-session-start-ci-react-vite-adoption.plan.md`)

- [ ] P0: Check which hand-off fixes are still needed on the current kit — Step 0 reality check, one line per issue — `plans/412-kit-patch-fixes-hooks-session-start-ci-react-vite-adoption.plan.md`
- [ ] P1: Make git hooks run on Windows without husky installed — shebang, set -e, guarded lint-staged, executable bit in kit and at install, e2e case without husky — `../ai-workflow-kit/core/.husky/*`, `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/tools/e2e-check.mjs`
- [ ] P2: Make session start actually deliver the worker and resume text to the session — JSON built in node, additionalContext under hookSpecificOutput, test with quotes and newlines — `../ai-workflow-kit/core/scripts/session-startup.sh`
- [ ] P3: Give the secret-scan CI job the permissions it needs — gitleaks permissions + comments off + README CI note — `../ai-workflow-kit/core/.github/workflows/ci.yml`, `../ai-workflow-kit/README.md`
- [ ] P4: Stop the session manifest from silently failing when python3 is missing — run-python.sh fallback for the hook; ship-prep tries python3, python, py and warns — `../ai-workflow-kit/core/scripts/run-python.sh`, `../ai-workflow-kit/core/.claude/settings.json`, `../ai-workflow-kit/core/scripts/ship-prep.mjs`
- [ ] P5: Let the Planner push closed plans that moved into range folders — pre-push regex accepts plans/<range>/ — `../ai-workflow-kit/core/.husky/pre-push`
- [ ] P6: Make todo-sync explain the missing repo setting and clean up its branch — delete branch on failure, ::error line, install output + README first-time setup — `../ai-workflow-kit/core/.github/workflows/todo-sync.yml`, `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/README.md`
- [ ] P7: Fix stale paths and leftovers from the retired agent personas — security-grep name, todo-archive folder, generic example plans, docs-refresh subagent type, garbled security step — `../ai-workflow-kit/core/.claude/skills/save-plan/SKILL.md`, `../ai-workflow-kit/core/docs/agent/workflow-map.md`, `../ai-workflow-kit/core/.claude/commands/{auto-solve,docs-refresh,security}.md`
- [ ] P8: Run all kit checks, open the kit PR and release v1.0.5 — leak-check, pack-check, install-check, e2e-check; CHANGELOG; tag after Dandan's go — kit repo
- [ ] P9: Sync FoodVibe to v1.0.5 and ship it — kit-sync dry-run (0 conflicts), Apply, ng build, kit-owned check, /ship — `.kit/install.json` + files kit-sync writes

### Plan 413 — Planner Always Runs the Architect and Product Manager Review (`plans/413-planner-always-runs-architect-and-product-manager-review.plan.md`)

- [ ] R0: Check the plan still matches the kit and list every place that says who plans — Step 0 reality check + grep list — `plans/413-planner-always-runs-architect-and-product-manager-review.plan.md`
- [ ] R1: Make the Planner run an architect and product review on every plan before saving — new review section, role line, Planner protocol first step, Cursor mirror — `../ai-workflow-kit/core/.claude/commands/plan.md`, `../ai-workflow-kit/layers/cursor/.cursor/commands/plan.md`
- [ ] R2: Ship the plan and design templates in the kit so every project has them — generic prd and hld templates, HLD alternatives replaced by why-this-design — `../ai-workflow-kit/core/.claude/references/{prd,hld}-template.md`
- [ ] R3: Let each project add its own planning checks without forking the command — paths.planChecks config key, scaffold, parameters doc — `../ai-workflow-kit/kit.config.json`, `../ai-workflow-kit/templates/**`, `../ai-workflow-kit/docs/**`
- [ ] R4: Describe the current roles instead of the old three-agent setup — workflow-map roles, README_WORKFLOW title and intro, skills.md note — `../ai-workflow-kit/core/docs/agent/workflow-map.md`, `../ai-workflow-kit/core/README_WORKFLOW.md`, `../ai-workflow-kit/core/.claude/commands/skills.md`
- [ ] R5: Run the kit checks, open the kit PR and release v1.1.0 — leak-check, pack-check, install-check; CHANGELOG; tag after Dandan's go — kit repo
- [ ] R6: Move FoodVibe's own planning checks into a project file before syncing — Hebrew values, Entity contract, icons, RTL, Zod; kit.config paths.planChecks — `docs/agent/plan-checks.md`, `kit.config.json`
- [ ] R7: Sync FoodVibe to v1.1.0 and ship it — dry-run, take kit templates, Apply, ng build, kit-owned check, /ship — `.kit/install.json` + files kit-sync writes
- [ ] R8: Try the review on a pasted brief and on a new idea in the Planner — Dandan's two checks from Goals — Planner session

### Plan 414 — Kit Stack-Neutral Core Part 1: Install, Slots and Runtime Files (`plans/414-kit-stack-neutral-core-part-1-install-slots-runtime-files.plan.md`)

- [ ] N0: Check which runtime issues are still open and pick refuse versus auto-strip — Step 0 — `plans/414-kit-stack-neutral-core-part-1-install-slots-runtime-files.plan.md`
- [ ] N1: Leave the slot clean when claiming a plan fails halfway — rollback on claim-commit failure + e2e case — `../ai-workflow-kit/core/scripts/take-plan.mjs`, `../ai-workflow-kit/tools/e2e-check.mjs`
- [ ] N2: Keep runtime files ignored in fresh clones even when the project owns its gitignore — local-excludes script as the single list; install, take-plan and worktree-setup run it — `../ai-workflow-kit/core/scripts/local-excludes.mjs`, `../ai-workflow-kit/templates/.gitignore`, `../ai-workflow-kit/core/.claude/skills/worktree-setup/SKILL.md`
- [ ] N3: Refuse full commands where the config expects npm script names — install and sync validation, scaffold wording, install-check case — `../ai-workflow-kit/tools/{install,sync,install-check}.mjs`, `../ai-workflow-kit/kit.config.json`
- [ ] N4: Load the kit rules even when the project owns its AGENTS file — AGENTS.workflow.md render + CLAUDE.md imports both — `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/templates/{AGENTS,CLAUDE}.md`
- [ ] N5: Start any stack's dev server in slots from config instead of Angular-only code — slot-procs reads config; Angular pack supplies today's values — `../ai-workflow-kit/core/scripts/{slot-serve,take-plan}.mjs`, `../ai-workflow-kit/core/scripts/lib/slot-procs.mjs`, `../ai-workflow-kit/packs/angular/**`
- [ ] N6: Give workflow scripts their own package file so projects needn't edit theirs — kit-managed scripts/package.json, install --prefix scripts, lockfile hash — `../ai-workflow-kit/core/scripts/package.json`, `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/core/scripts/{take-plan,slot-serve}.mjs`
- [ ] N7: Fix the smaller config and drift gaps from the adoption — install.json always in scope, sensitive paths from config, ignored files skipped, i18n glob, browser default — `../ai-workflow-kit/core/scripts/{scope-check,ship-prep}.mjs`, `../ai-workflow-kit/tools/{drift-check,install}.mjs`, `../ai-workflow-kit/kit.config.json`
- [ ] N8: Prove FoodVibe still works with the changed kit before merging — local-source kit-sync dry-run (0 conflicts) and scratch-clone slot-serve test; notes file — `docs/workflow-kit/kit-sync-notes.md`
- [ ] N9: Run all kit checks and open the kit PR — leak-check, pack-check, install-check, e2e-check (Linux + Windows); CHANGELOG Unreleased — kit repo

### Plan 415 — Kit Stack-Neutral Core Part 2: CI, Commands and Tech-Debt Rules by Pack (`plans/415-kit-stack-neutral-core-part-2-ci-commands-tech-debt-rules-by-pack.plan.md`)

- [ ] M0: Check the issues are still open and map every core-to-pack reference — Step 0 + pack contract list — `plans/415-kit-stack-neutral-core-part-2-ci-commands-tech-debt-rules-by-pack.plan.md`
- [ ] M1: Render backend CI jobs only when the project has a backend — serverRoot block markers in ci and security workflows, actionlint on renders — `../ai-workflow-kit/core/.github/workflows/{ci,security}.yml`, `../ai-workflow-kit/tools/install-check.mjs`
- [ ] M2: Let projects choose how CI installs, lints and audits — ci.install, ci.lintScope, ci.appAuditMode keys, changed-files lint, report-only audit, scripts audit — `../ai-workflow-kit/core/.github/workflows/{ci,security}.yml`, `../ai-workflow-kit/kit.config.json`, `../ai-workflow-kit/docs/**`
- [ ] M3: Move Angular style rules out of core commands into the Angular pack — match-existing-style line in core, PACK:style fragments, no-semi hook fragment, prettier seed — `../ai-workflow-kit/core/.claude/commands/{feat,fix,refactor,security}.md`, `../ai-workflow-kit/core/.husky/pre-commit`, `../ai-workflow-kit/packs/angular/**`, `../ai-workflow-kit/templates/**`
- [ ] M4: Make packs declare which core references they provide and fail when one is missing — pack.json contract, core fallbacks, pack-check rule, fix.md section names — `../ai-workflow-kit/packs/*/pack.json`, `../ai-workflow-kit/tools/pack-check.mjs`, `../ai-workflow-kit/core/.claude/commands/**`
- [ ] M5: Add a link check that proves every path the workflow docs mention exists — workflow-link-check tool + kit CI job over renders — `../ai-workflow-kit/tools/workflow-link-check.mjs`, `../ai-workflow-kit/.github/workflows/**`
- [ ] M6: Make the tech-debt scan work for any stack and compare against a baseline — scan subcommand, baseline file, tsx/jsx, pack rule sets, skill PACK:stack — `../ai-workflow-kit/core/scripts/techdebt-report.mjs`, `../ai-workflow-kit/core/.claude/skills/techdebt/SKILL.md`, `../ai-workflow-kit/packs/angular/**`
- [ ] M7: Make git commands work in forks and when PR edit is blocked — gh -R from origin, PATCH fallback documented — `../ai-workflow-kit/core/docs/agent/standards-git.md`, `../ai-workflow-kit/core/.claude/commands/ship.md`
- [ ] M8: Prove FoodVibe still renders the same CI and rules before merging — local-source dry-run, rendered ci.yml and fix.md compared; notes — `docs/workflow-kit/kit-sync-notes.md`
- [ ] M9: Run all kit checks and open the kit PR — leak-check, pack-check, install-check, e2e-check, link check; CHANGELOG Unreleased — kit repo

### Plan 416 — Kit React-Vite Pack, Upstream-Owned Layer and Adoption Checks (`plans/416-kit-react-vite-pack-upstream-owned-layer-adoption-checks.plan.md`)

- [ ] V0: Check 414 and 415 landed and decide where the Supabase backend rules live — Step 0 — `plans/416-kit-react-vite-pack-upstream-owned-layer-adoption-checks.plan.md`
- [ ] V1: Add a React and Vite stack pack built from the files that already work — standards, conventions, skills, gotchas, techdebt rules, config defaults, fragments — `../ai-workflow-kit/packs/react-vite/**`
- [ ] V2: Add the Supabase backend rules where React projects can opt in — backend standards + gotchas as layer or pack part per V0 — `../ai-workflow-kit/layers/supabase/**` or `../ai-workflow-kit/packs/react-vite/**`
- [ ] V3: Support projects that are a copy of someone else's repo without touching their files — upstream-owned layer, ownership.upstreamPaths, scope-guard message, CI defaults, pull-copy command — `../ai-workflow-kit/layers/upstream-owned/**`, `../ai-workflow-kit/core/scripts/scope-check.mjs`, `../ai-workflow-kit/tools/install.mjs`
- [ ] V4: Let the end-to-end check run against a real installed project — e2e --project mode, safe junction cleanup — `../ai-workflow-kit/tools/e2e-check.mjs`
- [ ] V5: Add an adoption report that shows which workflow parts are installed and working — adoption-report tool — `../ai-workflow-kit/tools/adoption-report.mjs`
- [ ] V6: Run the acceptance test on Angular, React-Vite and upstream-owned fixtures in kit CI — fixtures + CI matrix (Linux + Windows) — `../ai-workflow-kit/tools/fixtures/**`, `../ai-workflow-kit/.github/workflows/**`
- [ ] V7: Release v1.2.0 with clear upgrade notes — CHANGELOG what-to-do, kit.json, README packs/layers section; tag after Dandan's go — kit repo
- [ ] V8: Sync FoodVibe to v1.2.0 and ship it — dry-run, Apply, ng build, kit-owned and manifest checks, /ship — `.kit/install.json` + files kit-sync writes
- [ ] V9: Have the React project drop its forked files and delete the hand-off — adopting project syncs v1.2.0 and removes Appendix A overrides; delete the kit handoff folder after Dandan's go — `../ai-workflow-kit/handoff/`
- [ ] V10: Make the installer detect the project stack and install only the matching packs — pack.json detect rules, proposal + confirm, refuse when nothing matches, install-check cases for both stacks — `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/tools/lib/**`, `../ai-workflow-kit/packs/*/pack.json`, `../ai-workflow-kit/kit-install.ps1`, `../ai-workflow-kit/tools/install-check.mjs`

## Where things live

- **Open work** — numbered groups §1–§6 above (this file only).
- **Audit source** — [reports/todo-ledger-relevance-audit-2026-07-21.md](reports/todo-ledger-relevance-audit-2026-07-21.md).
- **Done** — numbered volumes under [todo-archive/](todo-archive/README.md) (+ [INDEX.md](todo-archive/INDEX.md) for old Done catalog rows).
- **All plan files** — [`plans/`](../plans/).

### How to decide (quick)

| You say | Agent does |
| --- | --- |
| `prune discards` / `prune §5` | Remove §5 from this file |
| `mark done` / `done §3` | Mark §3 checkboxes `[x]` (and archive when all-x) |
| `execute 291` | Start Plan 291 (recreate plan file if missing) |
| `verify mobile` | Run mobile re-audits + TRIAGE updates |
| `drop §4 item N` | Remove that Maybe plan after your call |
