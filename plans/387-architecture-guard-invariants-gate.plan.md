# Plan 387 — Architecture guard: invariants registry, Architecture Impact gate, invariant tests

Status: active
Snapshot: 81c76d6da3cc4b52b14773f237c214ff2a01becf

## Problem Statement
On 2026-10-05 a core architecture rule was broken without the Human noticing. ADR 0008 D1
locks "shared master + per-user overrides". Plan 321 P3.4 then removed per-user copies with
no override in place, and a mid-execution question ("shared terms admin-only?") was answered
and recorded only as a "Human decision" line in `docs/session-state-foundation-refactor.md`,
the commit message and the plan tick line. Nothing said this contradicted D1 or that regular
users lose CRUD on all default metadata. Root cause: architecture lives only in prose ADRs,
and checking them is left to each agent's judgment ("read `decisions/` *if* it's an
architectural choice": `AGENTS.md:57` plus several skills). No template section, script,
question rule or test enforces it.

## Goals & Success Criteria
- Primary: no plan, mid-execution question or diff can change a load-bearing architecture rule without the Human explicitly seeing "INV-n, what changes, who loses what" and approving it.
- Success: a plan whose scope touches an invariant cannot be saved or taken without an `## Architecture Impact` entry for it. A change/deviation needs a Human-approval line. CI fails if INV-1/INV-2/INV-4 behavior breaks.

## Execution Mode
- Parallel: no
- Concurrent plans: —
- Isolated DB: no
- Prerequisite: plan 386 merged (INV-1/INV-2 tests exercise its `canWrite` + remove/rename-for-me). As of save (2026-10-05) plan 386 is saved but not yet implemented — take 387 only after 386 merges.

## Read-Write Scope

```scope
docs/brain/invariants.md
docs/brain/index.md
docs/brain/decisions/0017-architecture-invariants-gate.md
docs/brain/gotchas/agent-workflow.md
docs/agent/workflow-map.md
.claude/references/prd-template.md
.claude/references/hld-template.md
.claude/skills/save-plan/SKILL.md
.claude/commands/plan.md
.claude/commands/take-plan.md
.claude/commands/review-it.md
AGENTS.md
scripts/scope-check.mjs
scripts/lib/invariants.mjs
scripts/test/**
scripts/take-plan.mjs
scripts/ship-prep.mjs
server/test/invariants.test.js
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
package.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## Architecture Impact
- INV-none: preserves — this plan adds the guard itself and changes no runtime behavior.

## User Stories
- As the Human, I want any plan or question that changes my app's architecture to say so in plain words, so that I never approve a core change by accident.
- As the Human, I want CI to fail when a core rule breaks, so that a wrong agent judgment can't merge silently.

## Functional Requirements

### Must Have (P0)
- [ ] **`docs/brain/invariants.md`**, the checklist. ADRs stay the reasoning. One section per invariant in this exact shape (parsed by `scripts/lib/invariants.mjs`):
```
  ## INV-1 — <title>
  - Rule: <one line>
  - Source: <ADR / file>
  - Touches: `glob`, `glob`
  - Users lose if broken: <plain words>
  - Test: <server/test/invariants.test.js "INV-1 …" | none>
```
  Header line: `Enforced from plan: 388` (this plan is 387). Seed list, confirmed by the Human 2026-10-05:
  - **INV-1 Ownership:** every user can create/edit/delete his own items; the admin can also do so for shared `__master__` items. Write routes authorize through `server/utils/can-write.js`. Source: ADR 0016. Touches: `server/routes/generic.js`, `server/utils/can-write.js`, `server/middleware/**`, `src/app/core/services/permission.service.ts`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/*-data.service.ts`.
  - **INV-2 Tenancy:** shared master + per-user overrides, created lazily on "change/remove only for me". A user's ability to customize shared data is never removed without a replacement in the same release. Source: ADR 0008 D1 + 0016. Touches: `server/routes/generic.js`, `server/services/**`, `server/migrations/**`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/master-push.service.ts`.
  - **INV-3 The server owns cross-document consistency** (re-key, cascade). The client never loops one write per document. Source: plan 385. Touches: `src/app/core/services/kitchen-state.service.ts`, `src/app/pages/metadata-manager/**`, `server/routes/generic.js`.
  - **INV-4 One Zod schema package**, and the server validates every write. Source: ADR 0008 D2. Touches: `shared/schemas/**`, `server/middleware/validate.js`, `server/utils/schema-check.js`.
  - **INV-5 Taxonomy:** all terms live in `taxonomyTerms`; course / protein / labels are separate axes. Source: ADR 0008 D3. Touches: `shared/schemas/entities/taxonomy-term.schema.ts`, `src/app/core/services/*registry*.service.ts`, `src/app/core/services/taxonomy-store.service.ts`.
  - **INV-6 AI calls only via `server/routes/ai.js`.** Source: AGENTS.md. Touches: `server/routes/ai.js`, `src/app/**/*ai*`.
- [ ] **`## Architecture Impact` section** in `prd-template.md` (between Escalation Protocol and Step 0) and an equivalent line in `hld-template.md`'s Architecture Decision. One line per affected invariant, in one of three forms:
  - `- INV-n: preserves — <how>`
  - `- INV-n: deviation until <plan/phase> — users lose: <plain words> — Arch-approved: Human YYYY-MM-DD`
  - `- INV-n: changes — ADR docs/brain/decisions/NNNN-<slug>.md — Arch-approved: Human YYYY-MM-DD`

  `- INV-none: preserves — <why>` is allowed when no invariant is touched.
- [ ] **`scripts/lib/invariants.mjs`**: parses `invariants.md`, plus a plan's `## Architecture Impact` entries.
- [ ] **`scope-check.mjs --arch --plan=<p>` (BLOCK, exit 1).** A plan is affected by INV-n when a tracked file (`git ls-files`) matches both a plan scope glob and an INV-n `Touches` glob, or when either glob matches the other's literal path. It fails when:
  - an affected INV-n has no entry;
  - a `deviation`/`changes` entry lacks `Arch-approved: Human`;
  - a `changes` entry points at an ADR path that is neither existing nor inside the plan's own scope.

  Plans numbered below `Enforced from plan:` print `ARCH: skipped (grandfathered)` and exit 0. On success it prints `ARCH: ok INV-…` and exits 0.
- [ ] **`scope-check.mjs --arch --diff=<base>` (WARN, exit 0).** For each INV whose `Touches` match a changed file, it prints `ARCH: warn INV-n <file>` when the active plan has no entry for that INV. It also prints `ARCH: warn decision-without-adr <file>:<line>` for any added line matching `/Human decision/i` in `docs/session-state*.md` or `plans/*.plan.md` that has no `INV-\d` and no `decisions/\d{4}` on the same line.
- [ ] **Wiring:**
  - save-plan Phase 2 "Shape lint" runs `--arch --plan` (block).
  - `scripts/take-plan.mjs` runs it on the `origin/main` plan text before claiming (refuse, nothing claimed, same pattern as the scope check at ~L201).
  - `scripts/ship-prep.mjs` adds the `--arch --diff=origin/main` warn lines to its report next to `scopeDiffReport()`.
  - `/review-it` step 3 shows them.
- [ ] **`AGENTS.md` hard rule (one bullet):** "Architecture invariants (`docs/brain/invariants.md`): every plan fills `## Architecture Impact`. Any question to the Human whose answer could break an invariant is asked as: INV-n · current rule · proposed change · who loses what. A yes becomes an ADR (supersede) plus an `Arch-approved:` line, never only a session-state/commit note. Agents never write `Arch-approved:` without the Human's explicit `approve arch change INV-n` in chat. Blocking is bypassed only by that explicit Human approval." Also update the "Architectural choice" row at `AGENTS.md:57` to point to `invariants.md` first.
- [ ] **`.claude/commands/plan.md`:** an Architect step to read `invariants.md` and fill `## Architecture Impact` before saving.
- [ ] **`server/test/invariants.test.js`**, one `describe` per enforceable invariant, test names prefixed `INV-n`:
  - INV-1: for `products`, `recipes`, `dishes`, `menuEvents` and `taxonomyTerms`, a regular user's POST / PUT / DELETE on his own doc succeeds; on another user's doc → 404; the admin's PUT on a `__master__` doc succeeds and a regular user's → 403/404.
  - INV-2: a regular user removes and renames a master term for himself only; a second user still reads it unchanged.
  - INV-4: an invalid recipe POST → 400 `Validation failed`.
- [ ] **ADR `docs/brain/decisions/0017-architecture-invariants-gate.md`** records the 2026-10-05 incident, why prose ADRs weren't enough, and the four layers (registry, plan section, mechanical gate, invariant tests). Add the brain index line for `invariants.md` (reading order item 2, before `decisions/`). Add a gotcha in `agent-workflow.md`: "A Human answer to a mid-execution question can silently override a locked ADR".
- [ ] **Workflow-kit (ADR 0015):** classify every new or changed workflow file in `docs/workflow-kit/manifest.json` + `manifest.md` (including the "Pending workflow changes" note). `node scripts/kit-manifest-check.mjs` stays clean.

### Should Have (P1)
- [ ] `node --test` coverage for `scripts/lib/invariants.mjs` + the `--arch` modes (fixtures under `scripts/test/fixtures/`). Wire it as `npm run test:scripts` in `package.json`.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- None (workflow + tests only). No dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Write `docs/brain/invariants.md` (format + 6 seed invariants + `Enforced from plan: 388`).
- [ ] A2: Write `scripts/lib/invariants.mjs` (parse the registry + a plan's Architecture Impact).
- [ ] A3: Add `scope-check.mjs --arch --plan` (block) and `--arch --diff` (warn, including decision-without-adr); update the usage header.
- [ ] A4: Wire the gate into save-plan Phase 2, `take-plan.mjs`, `ship-prep.mjs`, `/review-it` step 3.
- [ ] A5: Add the `## Architecture Impact` section to `prd-template.md`, the line to `hld-template.md`, and the Architect step to `plan.md`.
- [ ] A6: Add the AGENTS.md hard-rule bullet and repoint the `AGENTS.md:57` row.
- [ ] A7: Write `server/test/invariants.test.js` (INV-1, INV-2, INV-4).
- [ ] A8: Write ADR 0017, add the brain index line and the gotcha, update `docs/agent/workflow-map.md`.
- [ ] A9: Classify the new files in the workflow-kit manifest.
- [ ] A10 (P1): Add `node --test` script tests + `npm run test:scripts`.

## Technical Considerations
- Dependencies:
  - `scripts/lib/plan-scope.mjs` (`extractScopeGlobs`), `picomatch` (already used by scope-check);
  - server test harness `server/test/helpers/app.js` (`buildTestApp`, `signTestToken`);
  - plan 386's `can-write.js`, `permission.service.ts` and override docs.
- Grandfathering via `Enforced from plan:` keeps plans 385/386 and older drafts takeable. No retro-editing of other plans.
- Lean (ADR 0001): one markdown registry, one lib, new modes on an existing script, one test file. No new agent or command.
- New files: `docs/brain/invariants.md`, `scripts/lib/invariants.mjs`, `scripts/test/**`, `server/test/invariants.test.js`, `docs/brain/decisions/0017-architecture-invariants-gate.md`.
- Model changes: none.
- Hebrew canonical values: n/a.

## Success Criteria
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/387-architecture-guard-invariants-gate.plan.md` → prints `ARCH: ok` and exits 0.
- [auto] Fixture plan scoping `server/routes/generic.js` with no `## Architecture Impact`: `node scripts/scope-check.mjs --arch --plan=scripts/test/fixtures/arch-missing.plan.md` → exits 1 and prints `ARCH: missing INV-1`.
- [auto] Fixture with `- INV-2: changes — ADR … ` but no `Arch-approved:` → exits 1 and prints `ARCH: unapproved INV-2`.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/385-*.plan.md` → prints `ARCH: skipped (grandfathered)` and exits 0.
- [auto] `npm --prefix server test` → exits 0, with `INV-1`, `INV-2`, `INV-4` tests listed as passing.
- [auto] `node scripts/kit-manifest-check.mjs` → prints `KIT_MANIFEST: ok — … 0 unclassified …`.
- [auto] `npx ng build` → exits 0.
- [human] Open `docs/brain/invariants.md`: the 6 rules read correctly and every "Users lose if broken" line is plain language you'd understand at a glance.
- [human] Ask the Planner for any small plan touching `server/routes/generic.js`: the draft contains `## Architecture Impact` with an INV-1 line.

## Out of Scope
- Retro-filling Architecture Impact into existing plans (they're grandfathered).
- Converting every ADR into invariants. Only load-bearing runtime rules go in; workflow ADRs (0001/0009/0014/0015) stay prose.
- Invariant tests for INV-3/5/6. These are covered by the `--arch` gate only for now.

## Critical Questions
- Q1: Gate strength (Human 2026-10-05): **plan check blocks, diff check warns**, and only the Human's explicit `approve arch change INV-n` lets a change/deviation through. Resolved.
- Q2: INV seed list: confirmed by the Human 2026-10-05. Resolved.
