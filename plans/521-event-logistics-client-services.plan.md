# Plan 521 — Event logistics 4 of 6: the client services that read the checklist, save answers and write the client summary

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 518

## Problem Statement
The panel (plan 522) and the item manager (plan 523) need three small pieces of logic that are better tested on their
own: a way to call the new endpoint and put the returned event into the store, a registry of checklist items filtered
by phase and environment, and a pure function that turns the ticked answers into the Hebrew text the chef pastes into
his quote. Keeping them out of the component makes the panel plan a UI plan only (build tier, no invariant).

## Goals & Success Criteria
**Primary:** `EventPipelineService.saveLogistics`, `LogisticsItemRegistryService` and `logistics-summary.util.ts` exist, typed against plan 518, with specs.
- [auto] `npm run build` exits 0; `npm run lint` exits 0.
- [auto] `npm run test:ci` exits 0, including the new specs (A1–A3).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/521-event-logistics-client-services.plan.md` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=plans/521-event-logistics-client-services.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).

## Execution Mode
- Parallel: yes — same wave as 519 and 520; no shared files.
- Concurrent plans: 519, 520.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/event-pipeline.service.ts
src/app/core/services/event-pipeline.service.spec.ts
src/app/core/services/logistics-item-registry.service.ts
src/app/core/services/logistics-item-registry.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/utils/logistics-summary.util.ts
src/app/core/utils/logistics-summary.util.spec.ts
src/app/core/breadcrumbs.md
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-5: preserves — the new registry reads taxonomy terms through `TaxonomyStore` and adds a phase and environment filter only; no term shape, no schema and no write path changes, and terms stay in `taxonomyTerms` (`event-pipeline.service.ts` and the new registry are not `*-data.service.ts`, `taxonomy-store.service.ts` is read, not written); the endpoint call goes to plan 519's server door, which does the authorization.

## Reuse Check
- `EventPipelineService.saveLogistics` — family: http — rung: 2 — why: one more `run(...)` call on the existing pipeline client.
- `LogisticsItemRegistryService` (`src/app/core/services/logistics-item-registry.service.ts`) — family: taxonomy — rung: 3 — why: one more registry facade over `TaxonomyStore`, the same shape as `station-registry.service.ts`, extended with a phase + environment filter; registered in the family's Users list.
- `buildClientSummary`, `openItems` (`src/app/core/utils/logistics-summary.util.ts`) — family: helpers — rung: 1 — why: pure functions, text and arrays out.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the site-visit list filtered to this event's environment so that an indoor event never shows me tent and generator questions.
- As a chef, I want to copy a clean Hebrew summary of what we agreed with the client so that the quote carries exactly that.

## Functional Requirements

### Must Have (P0)
- [ ] `saveLogistics(eventId, patch): Promise<PipelineResult>` → `PUT ${EVENTS_URL}/${eventId}/logistics` through the existing `run('logistics.save', 'server_error', …)`, so the returned event lands in the store like every other pipeline call. `LogisticsPatch = { answers?: Omit<LogisticsAnswer, 'at' | 'by' | 'byName'>[]; environmentType?: EnvironmentType; venueProfileId?: string | null; meetingAt?: string; meetingWith?: string; phaseDone?: Partial<Record<LogisticsPhase, number | null>> }`, exported from the service file.
- [ ] `LogisticsItemRegistryService` (`providedIn: 'root'`): `items_ = taxonomy.terms('logisticsItem')`; `forPhase(phase: LogisticsPhase, environment: EnvironmentType | undefined): Signal<LogisticsItemTerm[]>` memoized per `${phase}|${environment ?? ''}` in a `Map`, filtering `t.phase === phase && (!t.environments?.length || !environment || t.environments.includes(environment))`, order as the store gives (shared first, then own, each by `sortOrder`); `loadSafely(options?)` → `taxonomy.loadSafely({ event: 'logistics_items.load.failed', message: 'Loading logistics items failed' }, options)` (match the exact `TaxonomyLoadLog` shape of `station-registry.service.ts`).
- [ ] `logistics-summary.util.ts`: `buildClientSummary(answers: LogisticsAnswer[], items: LogisticsItemTerm[], t: (key: string) => string): string` — only answers with `showToClient === true` and `status !== 'unchecked'`; grouped by section in `LOGISTICS_SECTIONS` order, each group headed by `t('logistics_section_<section>')` then one line per answer `• <label>: <t('logistics_status_<status>')>[ · <quantity>][ · <text>]` where `label` = `answer.label ?? item.key ?? answer.itemKey`; groups separated by a blank line; returns `''` when nothing qualifies. `openItems(items, answers): LogisticsItemTerm[]` → items with no answer or `status === 'unchecked'`.

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI. The dictionary keys the summary uses (`logistics_section_*`, `logistics_status_*`) are added by plan 522; the util only calls `t(key)`.

## Atomic Sub-tasks
- [x] A1: Give the client one call that saves logistics answers and refreshes the event in the store — `saveLogistics` + `LogisticsPatch` on the pipeline service; spec with `HttpTestingController`: PUT to `/api/v1/events/ev1/logistics` with the patch as body, the returned event applied through the same path the other calls use, a 403 → `{ ok: false }` with the error key the service already maps — src/app/core/services/event-pipeline.service.ts, src/app/core/services/event-pipeline.service.spec.ts
- [x] A2: Read the checklist items of one phase for one environment from the taxonomy store — the registry facade; spec with a stubbed `TaxonomyStore.terms` returning 4 terms (2 phases, one with `environments: ['outdoor_field']`): `forPhase('site_visit', 'professional_kitchen')` hides that one, `forPhase('site_visit', 'outdoor_field')` shows it, `forPhase('site_visit', undefined)` shows it, `forPhase('intake', …)` returns only the intake ones; the same signal instance is returned for the same arguments — src/app/core/services/logistics-item-registry.service.ts, src/app/core/services/logistics-item-registry.service.spec.ts, src/app/core/services/breadcrumbs.md
- [x] A3: Turn the ticked answers into the Hebrew text the chef pastes into a quote — `buildClientSummary`, `openItems`; spec: ticked only (an answer without `showToClient` is left out); sections in canonical order with the translated heading; a quantity answer renders `· 2`, a text answer renders `· <text>`; an answer whose item was deleted falls back to `itemKey`; nothing ticked → `''`; `openItems` counts an item with no answer and one with `unchecked` — src/app/core/utils/logistics-summary.util.ts, src/app/core/utils/logistics-summary.util.spec.ts, src/app/core/breadcrumbs.md (the utils line)
- [x] A4: Register the registry in the taxonomy family's Users line — docs/brain/component-families.md
- [x] A5: Run build, lint, test:ci, breadcrumbs-check and paste the outputs under Execution Notes

## What happens when
- The server answers 409 `STAGE_CHANGED` or 403: `run()` returns `{ ok: false, errorKey }` exactly as for `saveClosing`; the caller (plan 522) shows the toast. No retry inside the service.
- The taxonomy store is not loaded yet: `forPhase` returns an empty signal value until `loadSafely` resolves (the store's signals update).

## Technical Considerations
- Dependencies: `EventPipelineService.run` and `EVENTS_URL`, `TaxonomyStore.terms / loadSafely`, `station-registry.service.ts` (pattern), `@schemas/entities` exports from plan 518 (`LOGISTICS_SECTIONS`, types), `@models/menu-event.model` types.
- New files needed: the registry service + spec, the util + spec.
- Model changes: none.
- Backend / API: none (plan 519 owns the route; this plan only calls it).
- Auth and validation: none on the client; the server decides.
- Security surface: none.
- Data / migration: none.
- Project checks: log-query `[auto]` present; Reuse Check present; breadcrumbs updated for the two new core files; imports through `@services/*`, `@utils/*`, `@models/*`, `@schemas/*` aliases.

## Out of Scope
- Any template or component (522, 523); dictionary keys (522).

## Critical Questions
- none open.

## Execution Notes
- Planner review 2026-11-07: plan 517 was re-scoped (brief 4) — the `TEST-CI:` line and `scripts/e2e-one.mjs` no longer exist; checks now read `npm run test:ci` exits 0, and card specs run with `pnpm exec playwright test <spec>`. Mechanical edit only.
- Step 0: drift commits (534–540, 498–514) touch UI/design only; no plan symbol conflicts → ok.
- npm run build → exit 0; npm run lint → exit 0 (0 errors); npm run test:ci → exit 0, 1847 SUCCESS (new specs included).
- breadcrumbs-check → clean; scope-check --arch → ok INV-5; --reuse → ok; log-query → SKIP: no database configured.
