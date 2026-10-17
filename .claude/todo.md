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
- [ ] A1: Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: `venue-hours.util` `toDisplay` / `parseLegacy` plus spec (Hebrew range forms, midnight crossing, unparseable).
- [ ] A3: `HoursEditorComponent` plus spec; wire into the venue form; hydrate and save both shapes (`shared/hours-editor/**`, `venue-form/**`).
- [ ] A4: Contacts FormArray, legacy hydrate, save mirror, detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A5: Build, specs. Open 2 existing venues (one with free-text hours), edit and save, check no 400s. Update session-state.

### Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location" (`plans/design/373-venues-c-tour-videos-current-location.plan.md`)
- [ ] A1: Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine). Update session-state.

### Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form (`plans/design/374-venues-d-infrastructure-vs-equipment-groups.plan.md`)
- [ ] A1: Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [ ] A2: Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Equipment-form infrastructure hint (`equipment-form/**`).
- [ ] A4: Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400. Update session-state.

### Plan 377 — Units A: edit a custom unit's name and conversion in the metadata manager (`plans/377-units-a-rename-edit-unit-cascade-own-data.plan.md`)
- [ ] A1: `renameUnit` / `updateUnitRate` with guards + specs — `src/app/core/services/unit-registry.service.ts`, `unit-registry.service.spec.ts`
- [ ] A2: Edit action for custom units only; edit dialog (label, key, conversion) — `src/app/pages/metadata-manager/**`, `src/app/shared/unit-creator/**`
- [ ] A3: `unit` branch in `onRenameMetadata` + `getAffectedCount` + `reloadAfterRename`; confirms; dictionary keys; drop the out-of-scope comment — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `public/assets/data/dictionary.json`
- [ ] A4: Build + specs; manual test on the isolated DB (rename a custom unit used in 2 products and 1 recipe, cost unchanged; change its conversion, cost changes); update session-state — `docs/session-state-<branch>.md`

### Plan 384 — Logs in the AI workflow: query script, slot log retention, command wiring (`plans/384-logs-in-ai-workflow-query-script-slot-retention.plan.md`)
- [ ] C1: `scripts/lib/log-format.mjs` normaliser (client-echo JSON, pino JSON, raw passthrough) + unit-ish self-test via `node --test` if cheap.
- [ ] C2: `scripts/log-query.mjs` Mongo mode (URI resolution, filters, `--summary`, `--json`, limits).
- [ ] C3: `--file` mode + `--since=plan-start` (`scripts/log-query.mjs`).
- [ ] C4: `scripts/take-plan.mjs` rotation + `.slot-plan-start`; `.gitignore`; prune (`scripts/prune-old-sessions.sh`).
- [ ] C5: wire `.claude/commands/fix.md`, `auto-solve.md`, `review-it.md`, `.claude/skills/preflight/SKILL.md`, `.claude/references/prd-template.md`, `AGENTS.md`.
- [ ] C6: `package.json` script, `docs/brain/patterns/log-query-usage.md`, `docs/workflow-kit/manifest.md`, CHANGELOG; run all [auto] criteria.

### Plan 386 — One write-ownership rule (canWrite) + "remove for me" / "rename for me" on shared terms (`plans/386-write-ownership-rule-can-write-remove-for-me.plan.md`)
- [ ] A1: `can-write.js` + unit tests. Refactor `generic.js` PUT/DELETE/bulk-DELETE to use it. Existing `generic.test.js` + `taxonomy-terms-api.test.js` stay green (`server/utils/can-write.js`, `server/routes/generic.js`, `server/test/**`).
- [ ] A2: Schema `hidden` + `displayName`. POST override rules (allowed only over a master key; `hidden` blocked when own docs reference it; `displayName` no ref check). PUT own override. GET filtering + `displayName` merge + `includeHidden`. Restore/reset clears the field, deletes the override when empty. Tests for each, including: user B still sees the term user A hid, and still sees the original name of the term user A renamed (`taxonomy-term.schema.ts`, `generic.js`, `server/test/**`).
- [ ] A3: `PermissionService` + spec. `TaxonomyStore.canEdit` delegates. `hideForMe` / `restoreForMe` / `renameForMe` / `resetNameForMe` + spec. Facades show `displayName ?? key` (`permission.service.ts`, `taxonomy-store.service.ts`, registry facades).
- [ ] A4: Metadata Manager main page: non-admin "rename for me" / "remove for me" / "reset name", admin ternary for remove and rename (`src/app/pages/metadata-manager/**`).
- [ ] A5: Same for prep-category, section-category and menu-type UIs.
- [ ] A6: Dictionary keys (append-only) (`public/assets/data/dictionary.json` — hotspot).
- [ ] A7 (P1): Removed-items disclosure + restore.
- [ ] A8: ADR 0016, AGENTS.md hard-rule line, gotcha, brain index.
- [ ] A9: Grep for any place that renders a term key without going through the facades (so a `displayName` override wouldn't show). If it's outside the scope, raise it via the Escalation Protocol.

### Plan 391 — Workflow Kit Phase 6B: GitHub Pull and Versioned Releases (`plans/391-workflow-kit-phase-6b-github-pull-versioned-releases.plan.md`)
- [ ] B0: Step 0 reality check — `docs/workflow-kit/manifest.md`
- [ ] B1: Fetch-to-cache helper (`tools/lib/source.mjs`) + `--source/--ref` in install, sync, drift-check, `.ps1` wrappers — `../ai-workflow-kit/tools/**`, `../ai-workflow-kit/*.ps1`
- [ ] B2: `install.json` source/ref/commit; sync defaults + `--ref` upgrade; scratch tests for all [auto] criteria — `../ai-workflow-kit/tools/**`
- [ ] B3: Public-data sweep; extend leak-check if a pattern is worth keeping; confirm the GitHub Action runs — `../ai-workflow-kit/tools/leak-check.mjs`, `../ai-workflow-kit/.github/**`
- [ ] B4: `kit.json` semver, `CHANGELOG.md`, README rewrite, release steps — `../ai-workflow-kit/kit.json`, `CHANGELOG.md`, `README.md`
- [ ] B5: Kit PR merged; Dandan's go; tag + GitHub release `v0.5.0`; install from GitHub into a scratch dir — kit GitHub repo
- [ ] B6: FoodVibe `docs/workflow-kit/manifest.md` phase 6B paragraph; `/ship` — `docs/workflow-kit/manifest.md`

### Plan 392 — Workflow Kit Phase 6C: FoodVibe Adoption and Retire Patch Mode (`plans/392-workflow-kit-phase-6c-foodvibe-adoption-retire-patch-mode.plan.md`)
- [ ] C0: Step 0 reality check — `docs/workflow-kit/manifest.md`
- [ ] C1: Kit `--adopt` mode + `-Adopt` wrapper; scratch test on a copy of FoodVibe — `../ai-workflow-kit/tools/install.mjs`, `../ai-workflow-kit/kit-install.ps1`
- [ ] C2: Adopt FoodVibe; dry-run sync shows 0 conflicts; `kit-sync -Apply`; build + checks; FoodVibe chore PR — `.kit/install.json` + files kit-sync writes
- [ ] C3: New ADR superseding 0018 (amends 0015); mark 0018 superseded; brain index line — `docs/brain/decisions/**`, `docs/brain/index.md`
- [ ] C4: Change-loop doc in the kit; link it from the kit README and FoodVibe `manifest.md` — `../ai-workflow-kit/docs/CHANGE-LOOP.md`, `docs/workflow-kit/manifest.md`
- [ ] C5: Replace patch-mode wording (AGENTS.md, `kit-owned.mjs`, kit `scope-guard.sh` + `README_WORKFLOW.md` via release + sync, `manifest.md`) — `AGENTS.md`, `scripts/kit-owned.mjs`, `docs/workflow-kit/manifest.md`
- [ ] C6: Cut `v1.0.0`; FoodVibe `kit-sync --ref v1.0.0` — `.kit/install.json`
- [ ] C7: `kit-proof` from GitHub, `/plan` → `/take-plan` → `/ship` end to end — `../kit-proof/**`
- [ ] C8: No-op `v1.0.1`; upgrade FoodVibe and `kit-proof`; run all [auto] criteria; `/ship` — `.kit/install.json`, `../kit-proof/.kit/install.json`

### Plan 393 — Slot Dev Servers On Demand and Closed-Todo Archiving (`plans/393-slot-dev-servers-on-demand-closed-todo-archiving.plan.md`)
- [ ] D0: Step 0: bring both repos up to date, take the process snapshot.
- [ ] D1: Kit: `slot-serve.mjs`, plus take-plan no longer starting servers.
- [ ] D2: Kit: orphan-chain detection in `slot-procs.mjs`, `free-merged-slots` stopping servers, and the `SessionEnd` hook.
- [ ] D2a: Kit: reproduce the orphan leak and fix its root cause (kill the whole tree on stop, refuse a start while the port is held), plus the brain gotcha.
- [ ] D2b: Kit: `orphan-sweep.mjs` and its session-start call (slot and main, orphans only), plus the manifest row and `kit-owned.json` entry.
- [ ] D3: Kit: `todo-parse.mjs` counting `[-]` as closed, plus its test.
- [ ] D4: Kit: docs (`take-plan.md`, `remote.md`, preflight, `standards-git.md`, `ship-regular.md`, `job-validation.md`, `workflow-map.md`, `commands.md`), plus the manifest row and the `kit-owned.json` entry for `slot-serve.mjs`.
- [ ] D5: Kit PR merged by Dandan. Patch into FoodVibe (ADR 0018), then run `todo-archive.mjs` once.
- [ ] D7: FoodVibe only (no kit patch): remove the `playwright` entry from `.cursor/mcp.json` (Playwright MCP was dropped 2026-10-01; each Cursor window was spawning its own copy) — `.cursor/mcp.json`
- [ ] D8: Kit: `orphan-sweep.mjs` + `slot-stop.mjs` also recognise the plan 408 QA harness chains (ports 4205/3005/4206, `.claude/.qa-pids`, cwd in this folder): the sweep kills only orphans (no port held), never a running QA server; Done-when: [auto] a scratch orphan `node --watch` with QA env in the main folder is swept, a live listener on 4206 survives — `scripts/orphan-sweep.mjs`, `scripts/lib/slot-procs.mjs`, `scripts/test/**`
- [ ] D6: Run every [auto] criterion, update `manifest.md`'s validation-round paragraph, then `/ship`.

### Plan 400 — Dropdown add option, part 1: shared helper and the shared selects (`plans/400-dropdown-add-option-part-1-shared-helper-shared-selects.plan.md`)

- [ ] A1: Audit callers of `custom-select` / `custom-multi-select` / `chip-search-dropdown` that enable add; list each with its "thing" and the `add_new_<thing>` key it needs (session-state) — `src/app/**/*.html`
- [ ] A2: `src/app/core/utils/add-option.util.ts` + spec (rules 1–4)
- [ ] A3: `src/app/core/utils/keyed-picker-search.util.ts` + spec — `KeyedPickerSearch` copied from the menu service (rule 5) + scroll helper
- [ ] A4: `src/app/shared/add-option-row/` component
- [ ] A5: Apply to `shared/custom-select` (label, filter by label, stored-key select; keyboard via A3)
- [ ] A6: Apply to `shared/custom-multi-select`; remove the second (dynamic) add button; keyboard via A3 (Space toggles)
- [ ] A7: Apply to `shared/chip-search-dropdown`; keyboard via A3 (focus stays in input, no wrap)
- [ ] A8: Callers: pass the right `add_new_<thing>` key (escalate each path via `approved:`); append missing keys to `dictionary.json`
- [ ] A9: `ng build` + `ng test` green, `rg` checks from Success empty; hand the Human the click list (incl. keyboard check per select)

### Plan 401 — Dropdown add option, part 2: page dropdowns in recipe builder and menu (`plans/401-dropdown-add-option-part-2-page-dropdowns-recipe-builder-menu.plan.md`)

- [ ] A1: Re-check the audit list on current main (after 397/398/400 merged); list the 7 `filterOptionsByStartsWith(` calls with verdicts — session-state
- [ ] A2: Menu: `MenuPickerSearchService` onto `core/utils/keyed-picker-search.util.ts`; delete the local `KeyedPickerSearch`
- [ ] A3: `ingredient-search` component onto the helpers (add option + keyboard rule 5)
- [ ] A4: `preparation-search` component onto the helpers (add option + keyboard rule 5 — adds arrows)
- [ ] A5: Logistics tool picker (`recipe-builder.page.html` + logistics picker service) — one add option; keyboard rule 5
- [ ] A6: Menu event type (`menu-intelligence.page.ts/.html`) — label, filter by translated label, stored-key select; keyboard via `KeyedPickerSearch`
- [ ] A7: Fix any raw-key `filterOptionsByStartsWith(` callers from A1; move the section-category dropdown onto the helper (P1)
- [ ] A8: Append missing `add_new_<thing>` keys to `dictionary.json`
- [ ] A9: `ng build` + `ng test` green, `rg` checks from Success; hand the Human the click list (incl. keyboard check per dropdown + menu regression)

### Plan 402 — Dropdown add option, part 3: convention doc and trigger (`plans/402-dropdown-add-option-part-3-convention-doc-trigger.plan.md`)

- [ ] A1: Rule section in `docs/agent/standards-domain.md` incl. keyboard subsection (helper/component names from merged plan 400)
- [ ] A2: Trigger row in `AGENTS.md`
- [ ] A3: `docs/brain/patterns/dropdown-add-option.md` + line in `docs/brain/index.md`
- [ ] A4: `rg`, `kit-owned --check`, `kit-manifest-check` green (classify the new pattern file in `docs/workflow-kit/manifest.json` via `approved:` if the check asks); Human reads the rule

### Plan 407 — One soft-delete model and per-user state (userPrefs) (`plans/407-one-soft-delete-model-and-user-prefs.plan.md`)

- [ ] P6.0: Reality Check (readers/writers, Atlas counts, model + purge window) → Human go — `docs/session-state-<branch>.md`
- [ ] P6.1: `deletedAt`/`deletedBy` model in schemas + `generic.js` + purge job, with server tests — `shared/schemas/**`, `server/routes/generic.js`, `server/jobs/**`, `server/test/**`
- [ ] P6.2: `userPrefs` schema + server repo/routes + client `UserPrefsStore`; recipe/dish favorite + hide moved onto it — `shared/schemas/**`, `server/repositories/**`, `src/app/core/services/**`
- [ ] P6.3: `server/migrations/0005-soft-delete-unify.js` (dry run on Atlas copy → Human go → Atlas) + read-only check script — `server/migrations/**`
- [ ] P6.4: Trash UI on `deletedAt`; `trash.service.ts` rewritten — `src/app/pages/trash/**`, `src/app/core/services/trash.service.ts`
- [ ] P6.5: ADR + brain index (P1); build, tests, Human check list — `docs/brain/**`

### Plan 409 — Claude Code mods rollout: fleet, guards, ship-pilot
- [x] S0: Stage 0 — validate + test all three mods on Windows — `claude-mods-deliverable/layers/claude-code-mods/**`
- [x] S1: Stage 1 — fleet from disk in a slot (fleet/ports/health, slot lock, /handoff, no flash) — `claude-mods-deliverable/layers/claude-code-mods/fleet/**`
- [x] S2a: Stage 2 — install fleet from the local marketplace at user scope — `~/.claude/settings.json`
- [ ] S2b: Stage 2 — one week of fleet use (2026-10-14 → 2026-10-21), no fleet error toasts, ≥1 real lock or recovery — `(no files)`
- [ ] S3a: Stage 3 — install guards at user scope and run checks 1–7 in a slot and the Planner folder — `(no files)`
- [ ] S3b: Stage 3 — one week with shell guards + guards mod, no false denials — `(no files)`
- [ ] S4: Stage 4 — install ship-pilot; /progress, /check, /pr, toast, merge button on a real PR — `(no files)`
- [ ] K1: kit fix — test mocks strip the drive letter (guards path helper; ship-pilot P + fs.write) — `ai-workflow-kit/layers/claude-code-mods/{guards,ship-pilot}/tests/*.test.ts`
- [ ] K2: kit fix — fleet registers each command in its own try/catch; `/fleet-health` alias (gstack `/health` clash) — `ai-workflow-kit/layers/claude-code-mods/fleet/hooks/register.tsx`
- [ ] K3: kit fix — ship-pilot `/pr` handler gets a `.catch` (validator: gating hook without .catch) — `ai-workflow-kit/layers/claude-code-mods/ship-pilot/hooks/register.tsx`
- [ ] K5: kit — daily event logs in all three mods (done in the deliverable copy 2026-10-14) — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`
- [ ] K4: kit docs — headless `claude -p "/cmd"` from Git Bash needs `MSYS_NO_PATHCONV=1` — `ai-workflow-kit/layers/claude-code-mods/README.md`
- [ ] K6: kit — mods dock: one framed band above the prompt shared by all three mods (collapsed line, expands on alert; guards status line dropped) — done in the deliverable copy 2026-10-16 — `ai-workflow-kit/layers/claude-code-mods/*/hooks/register.tsx`, `*/tests/*.test.ts`
- [ ] K7: ship-pilot plan panel — click the plan % chip to open a panel under the dock: bar, steps (done/now/next), waiting-on-you, time, end checks, after-this; zero model tokens (see K7 spec) — built in the deliverable copy 2026-10-17 (ship-pilot 0.2.0, 13/13 tests) — `claude-mods-deliverable/layers/claude-code-mods/ship-pilot/{hooks/register.tsx,types/index.d.ts,tests/*.test.ts}`
- [ ] S5: Stage 5 — kit PR: patch + K1–K4 + `--mods` install flag + manifest tier + kit.json bump + README — `ai-workflow-kit/**`
- [ ] S6a: Stage 6 — remove Claude Code `hooks` from settings (keep `permissions`) — `.claude/settings.json`
- [ ] S6b: Stage 6 — "superseded for Claude Code; still used by Cursor" header on shell guards — `scripts/*-guard.sh`, `scripts/session-startup.sh`
- [ ] S6c: Stage 6 — take-plan step 0 dropped; save-plan Phase 0 uses `/approve` — `.claude/commands/take-plan.md`, `.claude/skills/save-plan/SKILL.md`
- [ ] S6d: Stage 6 — ship-pilot band notes + `/check` sentence — `.claude/commands/ship.md`, `docs/agent/ship-regular.md`, `docs/agent/standards-git.md`, `docs/agent/job-validation.md`
- [ ] S6e: Stage 6 — ADR "Claude Code guards run in-process (mods); shell guards remain for Cursor" — `docs/brain/decisions/`
- [ ] S6f: Stage 6 — AGENTS.md Compaction bullet mentions `/handoff` and `/fleet-health` — `AGENTS.md`

### Plan 410 — Skill Improver: Nightly Evidence-Driven Skill Upgrades
- [ ] S0: Step 0 reality check + headless spike, findings written here — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`
- [ ] S1: Evidence script over local transcripts (counts only, local output) — `../ai-workflow-kit/tools/skill-improver/evidence.mjs`
- [ ] S2: Picker + rotation state + open-PR pause — `../ai-workflow-kit/tools/skill-improver/pick.mjs`
- [ ] S3: Runner: isolated worktree, budget meter over stream-json, path guard, leak guard, log — `../ai-workflow-kit/tools/skill-improver/run.mjs`
- [ ] S4: Editor command + blind judge agent + eval generation for skills without evals — `../ai-workflow-kit/core/.claude/commands/improve-skill.md`, `../ai-workflow-kit/core/.claude/agents/skill-judge.md`
- [ ] S5: PR creation + body template — `../ai-workflow-kit/tools/skill-improver/pr.mjs`
- [ ] S6: Scheduler script (PS5) + README/CHANGELOG section — `../ai-workflow-kit/kit-skill-improver.ps1`, `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] S7: Manual end-to-end run on one skill + budget-stop test + out-of-scope test — kit repo
- [ ] S8: Register the task (Dandan's go), receive one nightly PR — local machine
- [ ] S9: FoodVibe manifest note; `/ship` — `docs/workflow-kit/manifest.md`
- [ ] S10: One-month review (2026-11-17 or later) — `plans/410-skill-improver-nightly-evidence-driven-skill-upgrades.plan.md`

### Plan 411 — Workflow Scout: Weekly Claude Code and Community Update Page
- [ ] C0: Step 0 reality check + routine spike, findings written here — `plans/411-workflow-scout-weekly-claude-code-and-community-update-page.plan.md`
- [ ] C1: Sources config + cursor state format — `../ai-workflow-kit/tools/scout/sources.json`
- [ ] C2: Scout command (collect, judge fit, emit JSON, budget caps) — `../ai-workflow-kit/core/.claude/commands/scout.md`
- [ ] C3: Advertiser-style page template + JSON→HTML renderer — `../ai-workflow-kit/templates/scout-page.html`, `../ai-workflow-kit/tools/scout/render.mjs`
- [ ] C4: Branch + PR step (top-5 text, page link, useful checkboxes) — `../ai-workflow-kit/tools/scout/pr.mjs`
- [ ] C5: README/CHANGELOG section; kit PR merged; kit-sync into FoodVibe — `../ai-workflow-kit/README.md`, `../ai-workflow-kit/CHANGELOG.md`
- [ ] C6: Manual run in FoodVibe → first page + PR — `docs/scout/**`
- [ ] C7: Create the weekly cloud routine (Dandan's go); receive one scheduled PR — cloud routine
- [ ] C8: Dandan marks useful recommendations; manifest note; `/ship` — `docs/workflow-kit/manifest.md`

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
