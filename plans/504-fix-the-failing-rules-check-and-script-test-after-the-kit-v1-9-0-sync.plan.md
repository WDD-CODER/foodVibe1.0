# Plan 504 — Fix the failing rules check and script test after the kit v1.9.0 sync

Status: draft
Track: code
Depends-on: none
Snapshot: 3cfb996aa3ae659bf261d6ae43b56dd60eb31d45

## Problem Statement
After the kit v1.9.0 sync (PR #466, `29c27bb5`) two checks are red on `main`:
1. `node scripts/kit-manifest-check.mjs` → `unclassified: scripts/lib/orch-folders.mjs` (1 problem). The CI `rules` job runs it, so every pull request fails `rules`. The file is new in kit v1.9.0 and is in `ai-workflow-kit/scripts/lib/`; `docs/workflow-kit/manifest.json` has no entry for it.
2. `npm run test:scripts` → 1 failure: `every fixture parses with the shared schemas` in `scripts/test/code-qa-api.test.mjs:40` (`suppliers subject`: `businessId` and `createdBy` expected string, received undefined). Not yet known whether it predates v1.9.0.

## Goals & Success Criteria
- Primary: both checks green on `main`, with the fix in the right repo (kit-owned files change in the kit, ADR 0021).
- Success:
  - [ ] [auto] `node scripts/kit-manifest-check.mjs` exits 0 (`0 unclassified`).
  - [ ] [auto] `npm run test:scripts` exits 0.
  - [ ] [auto] `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `npx ng build` passes.
  - [ ] [human] A pull request opened after this merges shows the `rules` check green on GitHub.

## Execution Mode
- Parallel: no
- Concurrent plans: none
- Isolated DB: no

## Execution Notes
- `docs/workflow-kit/manifest.json` and `kit-owned.json` are generated from the kit (`scripts/kit-owned.mjs --write`; kit-owned.json says "Do not edit"). If the manifest is kit-owned, the real fix is a kit PR in `../ai-workflow-kit` (classify `scripts/lib/orch-folders.mjs`), a new release, then `kit-sync` here (ADR 0021). The Worker checks which it is first; if a kit release is needed, stop and report with `approved:` options rather than hand-editing a generated file. A FoodVibe-only fallback is an `overrides` entry in `kit.config.json`.
- Fixture failure: read `scripts/test/code-qa-api.test.mjs:40` and the `suppliers` fixture. Likely the shared supplier schema gained required `businessId` / `createdBy` and the fixture was not updated. Check `git log` for the schema and the fixture to say whether v1.9.0 or an earlier plan caused it. Fix the fixture to match the schema; do not loosen the schema.
- Orchestrator readiness (2026-10-28): May the builder add a local manifest entry for scripts/lib/orch-folders.mjs (shape of the orch-run.mjs entry) and regenerate kit-owned.json with scripts/kit-owned.mjs --write? → yes (stop and report with approved: options if the generator or kit-manifest-check rejects it)
- Orchestrator readiness (2026-10-28): The [human] rules-check-green-on-a-PR item can only be checked after merge on GitHub. → ok, leave it pending and report it
- Orchestrator readiness (2026-10-28): Fixture fix scope. → yes, edit only the suppliers fixture data (businessId, createdBy), never loosen the schema, and report which commit caused it

## Reuse Check
- Manifest entry and fixture fix — family: none — rung: 4 — why: data-file and test-fixture edits; the registry covers Angular and server code only

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/workflow-kit/manifest.json
docs/workflow-kit/kit-owned.json
kit.config.json
scripts/test/code-qa-api.test.mjs
scripts/test/fixtures/**
scripts/lib/code-qa-*.mjs
```

## Read Scope

Entire repo, and `../ai-workflow-kit`. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — a test fixture is brought in line with the existing schema; the schema is not changed.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call path is touched.

## Backend Impact
- Collections affected: none
- New collections: no
- Auth / validation: none. Server code untouched.

## Out of Scope
Other orchestrator lessons for the kit, and any change to the shared schemas.

## Atomic Sub-tasks

- [ ] A1: Find out whether the unclassified-file failure must be fixed in the kit or can be fixed here — check if the manifest is kit-owned and what the kit's v1.9.0 manifest says — docs/workflow-kit/manifest.json, ../ai-workflow-kit
- [ ] A2: Make the rules check pass again by classifying the new orchestrator folders helper — through the kit release if kit-owned, else a local override — docs/workflow-kit/manifest.json, kit.config.json
- [ ] A3: Find why the supplier test fixture lacks the owner fields and bring it in line with the schema — businessId and createdBy; say whether v1.9.0 or an earlier plan caused it — scripts/test/code-qa-api.test.mjs, scripts/test/fixtures/**
- [ ] A4: Run both checks and the build and paste the results — kit-manifest-check, test:scripts, ng build, arch and reuse gates — this plan file

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The `[human]` item under Success Criteria passes.
