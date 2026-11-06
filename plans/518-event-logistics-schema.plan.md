# Plan 518 — Event logistics 1 of 6: the checklist-item kind and the event's answers in the shared schemas

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: 517

## Problem Statement
Between the first phone quote (`inquiry`) and the final quote (`quote_sent`) the chef runs a site visit ("ישיבת ספקים")
where every logistic detail is decided — kitchen space, power, water, chillers, tent, buffet stations vs seating,
tables, access, staff — and what he forgets there comes out of his own pocket. FoodVibe has no place for those
questions or answers. This plan defines the data only: a checklist item is a `taxonomyTerms` term of a new kind
`logisticsItem` (shared master ∪ the business's own), and an event holds its answers in `siteLogistics`, a
server-owned field so the menu screen's full-document save never drops it. Plans 519–523 build the endpoint, the
seed, the client services and the screens on top of these shapes.

## Goals & Success Criteria
- Primary: `taxonomyTermSchema` accepts `kind: 'logisticsItem'`; `menuEventSchema` accepts `siteLogistics`; the generic
  data API strips `siteLogistics` from client bodies; the client `MenuEvent` type mirrors it.
- Success:
  - `[auto]` `npm run build:schemas` exits 0; `npm run build` exits 0; `npm run lint` exits 0.
  - `[auto]` `npm run test:server` exits 0, including the new cases in `server/test/taxonomy-term-schema.test.js` and `server/test/event-stage-schema.test.js` (A5).
  - `[auto]` `npm run test:ci` → `TEST-CI: … 0 failed, exit 0` (the client conformance type still compiles and existing specs pass).
  - `[auto]` `node scripts/scope-check.mjs --arch --plan=<this file>` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=<this file>` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).

## Execution Mode
- Parallel: no — it changes `shared/schemas`, which every later plan of the run reads.
- Concurrent plans: none in its wave.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/event-logistics.ts
shared/schemas/entities/event-stage.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/taxonomy-term.schema.ts
shared/schemas/entities/index.ts
server/test/taxonomy-term-schema.test.js
server/test/event-stage-schema.test.js
server/test/helpers/v2-docs.js
src/app/core/models/menu-event.model.ts
src/app/core/models/v2/conformance.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — every new shape is a Zod schema in `shared/schemas`; the server keeps validating every write through `checkStoredDoc` (unchanged); `siteLogistics` joins `EVENT_SERVER_FIELDS` so a client body never writes it through the generic API.
- INV-5: preserves — the checklist items are a new `kind` in the one `taxonomyTerms` collection with its own axis; no side list. `TERM_REFERENCES.logisticsItem` names where its keys are stored so the existing delete-guard and re-key cover it.
- INV-1, INV-2, INV-3, INV-6: not touched.

## Reuse Check
- `shared/schemas/entities/event-logistics.ts` — family: none — rung: 4 — why: a constants file like `event-stage.ts`, shared by client and server; no component, pipe, service or `.c-*` class.
- none else — this plan creates no UI or service.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want one shared list of the logistics questions I must answer before a final quote so that I stop forgetting the ones that cost me money.
- As a chef, I want my answers on the event to survive every save of the menu screen so that site-visit work is never lost.

## Functional Requirements

### Must Have (P0)
- [ ] `shared/schemas/entities/event-logistics.ts` exports the enums and limits below and is re-exported from `shared/schemas/entities/index.ts`.
- [ ] `taxonomyTermSchema` has a `logisticsItem` member with `phase`, `section`, `answerType`, optional `environments[]` (max 4, values of `environmentTypeSchema`), optional `hint` (≤ 200). `'logisticsItem'` is in `TAXONOMY_KINDS` and `TERM_REFERENCES` (`menuEvents: ['siteLogistics.answers.itemKey']`). The kind is **not** added to `LOCKED_TAXONOMY_KINDS` (Human decision Q2 a, 2026-10-27: any member may add an own item).
- [ ] `menuEventSchema.siteLogistics` (optional strict object) as in A3.
- [ ] `'siteLogistics'` is in `EVENT_SERVER_FIELDS`.
- [ ] Client types `LogisticsAnswer`, `SiteLogistics`, `MenuEvent.siteLogistics?` in `menu-event.model.ts`; `v2/conformance.ts` compiles.

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI in this plan. No dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Define the logistics vocabulary once for client and server — phases, sections, answer types, statuses, payers and size limits — shared/schemas/entities/event-logistics.ts, shared/schemas/entities/index.ts
  ```ts
  export const LOGISTICS_PHASES = ['intake', 'site_visit'] as const
  export const LOGISTICS_SECTIONS = ['infrastructure', 'space', 'service', 'rentals', 'access', 'staff', 'weather', 'food', 'other'] as const
  export const LOGISTICS_ANSWER_TYPES = ['status', 'quantity', 'text'] as const
  export const LOGISTICS_ANSWER_STATUSES = ['unchecked', 'needed', 'not_needed', 'client_provides'] as const
  export const LOGISTICS_PAYERS = ['client', 'quoted', 'chef'] as const
  export const LOGISTICS_TEXT_MAX = 500
  export const LOGISTICS_LABEL_MAX = 120
  export const LOGISTICS_ANSWERS_MAX = 300
  export type LogisticsPhase = (typeof LOGISTICS_PHASES)[number]  // and the same for the other four
  ```
- [ ] A2: Let a taxonomy term be a logistics question — new kind in the enum, the union member, the reference path — shared/schemas/entities/taxonomy-term.schema.ts
  ```ts
  z.strictObject({
    ...termShape,
    kind: z.literal('logisticsItem'),
    phase: z.enum(LOGISTICS_PHASES),
    section: z.enum(LOGISTICS_SECTIONS),
    answerType: z.enum(LOGISTICS_ANSWER_TYPES),
    /** Empty or absent = asked in every environment. */
    environments: z.array(environmentTypeSchema).max(4).optional(),
    hint: z.string().max(200).optional()
  })
  ```
  `key` is the Hebrew question text (same convention as user-added terms). Import `environmentTypeSchema` from `./common.schema`.
- [ ] A3: Let an event store its phone-intake and site-visit answers as a server-owned field — the `siteLogistics` sub-document after `closing` — shared/schemas/entities/menu-event.schema.ts
  ```ts
  /** Plan <this>: phone-intake and site-visit answers. Server-owned (events router, PUT /:id/logistics — plan 519). */
  siteLogistics: z.strictObject({
    answers: z.array(z.strictObject({
      itemKey: z.string().min(1).max(LOGISTICS_LABEL_MAX),
      /** Only on an ad-hoc item typed on the event; `itemKey` is then `adhoc:<id>`. */
      label: z.string().min(1).max(LOGISTICS_LABEL_MAX).optional(),
      phase: z.enum(LOGISTICS_PHASES),
      section: z.enum(LOGISTICS_SECTIONS),
      status: z.enum(LOGISTICS_ANSWER_STATUSES),
      quantity: z.number().min(0).max(100000).optional(),
      text: z.string().max(LOGISTICS_TEXT_MAX).optional(),
      payer: z.enum(LOGISTICS_PAYERS).optional(),
      showToClient: z.boolean().optional(),
      at: z.number(),
      by: z.string(),
      byName: z.string()
    })).max(LOGISTICS_ANSWERS_MAX),
    meetingAt: z.string().optional(),
    meetingWith: z.string().max(80).optional(),
    phaseDone: z.strictObject({
      intake: z.number().optional(),
      site_visit: z.number().optional()
    }).optional()
  }).optional(),
  ```
- [ ] A4: Keep the answers out of every client body on the generic data API — append `'siteLogistics'` to the server-owned field list and its JSDoc — shared/schemas/entities/event-stage.ts
- [ ] A5: Prove the shapes with schema tests — `server/test/taxonomy-term-schema.test.js`: a `logisticsItem` with every field valid; `environments: ['moon']` invalid; `phase: 'later'` invalid; `environments` absent valid. `server/test/event-stage-schema.test.js`: an event with a full `siteLogistics` valid; an answer with `status: 'maybe'` invalid; `text` of 501 chars invalid; 301 answers invalid; `EVENT_SERVER_FIELDS` contains `'siteLogistics'`. Add `logisticsAnswer(overrides)` and `logisticsItemBody(overrides)` builders — server/test/helpers/v2-docs.js
- [ ] A6: Mirror the shapes on the client so the next plans can type against them — `LogisticsAnswer`, `SiteLogistics`, `siteLogistics?` on `MenuEvent`, conformance tuple still green — src/app/core/models/menu-event.model.ts, src/app/core/models/v2/conformance.ts
- [ ] A7: Run build:schemas, build, lint, test:server, test:ci and paste the outputs under Execution Notes

## What happens when
- A stored event has no `siteLogistics`: the field is optional, nothing changes for existing events.
- A client sends `siteLogistics` in a generic POST or PUT: stripped by `withoutServerEventFields` (existing code, new entry), the stored value survives a PUT because the merge is `{ ...current, ...updatable }`.

## Technical Considerations
- Dependencies: `shared/schemas/entities/common.schema.ts` (`environmentTypeSchema`), `server/routes/generic.js` (`withoutServerEventFields`, unchanged), `server/test/helpers/v2-docs.js`.
- New files needed: `shared/schemas/entities/event-logistics.ts`.
- Model changes: `taxonomyTermSchema`, `TAXONOMY_KINDS`, `TERM_REFERENCES`, `menuEventSchema.siteLogistics`, `EVENT_SERVER_FIELDS`, client `MenuEvent`.
- Backend / API: none (plan 519).
- Auth and validation: none new; validation is the schema itself.
- Security surface: none (`shared/schemas` is a sensitive path for the finders; no runtime change).
- Data / migration: additive, optional fields; no migration.
- Project checks: log-query `[auto]` present; Reuse Check present; no dictionary keys; entity shapes are Zod in `shared/schemas/`.

## Out of Scope
- The endpoint and the permission action (plan 519), the master seed (plan 520), client services (plan 521), the panel (plan 522), the item manager (plan 523), any admin view, quotes, equipment linking.

## Critical Questions
- Q1 (answered b, Human 2026-10-27): who may answer on an event → owner only; enforced in plan 519, nothing to decide here.
- Q2 (answered a, Human 2026-10-27): master items locked to owner edits like `eventType`? → no.

## Execution Notes
- Planner review (2026-11-05): `LOGISTICS_TEXT_MAX` was 519 (plan-number typo) → 500, matching the A5 test (501 chars invalid). Snapshot is 213 commits old; plan 512 added `clientId` (`menu-event.schema.ts:138`) — line drift only, no conflict. Runs after 517 (its checks need `test:server`, the `TEST-CI:` line and the log-query SKIP fallback).
