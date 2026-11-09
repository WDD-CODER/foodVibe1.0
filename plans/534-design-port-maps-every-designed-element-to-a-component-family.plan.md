# Plan 534 — Design port maps every designed element to a component family (Claude Design → Angular, 1 of 2)

Status: draft
Depends-on: 533
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
The Human asked on 2026-10-22 to prepare the Claude Design → Angular workflow, and on 2026-11-07 (H4) to plan it now.
The supported path is settled (ADR 0019:17-18, 37): `/design-sync` compiles React and does not work for Angular
(anthropics/claude-code#71523), so FoodVibe ports a Claude Design **Handoff export** through `/design-port`
(`.claude/commands/design-port.md`) and `scripts/design-handoff-ingest.mjs`. The goal: the port acts as architect and
product designer — it reuses an existing family instead of inventing a component, and keeps behaviour the same.

What is missing at aa12012:
- `/design-port`'s visual inventory (Inventory 3, `design-port.md:177-180`, `| Element | Design value | Maps to | Notes |`)
  maps values to tokens and `.c-*` engines, but never asks **which component family** a designed element is. The flow
  has no step that checks a design against `docs/brain/component-families.md` (24 families, ADR 0024 ladder).
- The Human's rule of 2026-10-22 is written nowhere: **when a design changes the look of a family piece on one screen,
  apply it to the family's shared base by default, and flag every screen that uses the family for a check — do not ask
  each time.**
- `component-families.md` has no place to record a family-level design change (which variant, which screens to recheck).
- `scripts/design-handoff-ingest.mjs` assumes "a handoff is per screen" (lines 4-6); `parseTargets` (114-132) maps
  repo paths to `src/app/pages/<folder>` screens and lists everything else as `shell`, so a handoff for one family
  (for example a new date-field look) has no target.
- No checker reviews a port for architecture and design consistency. `/review-it` already runs `orch-check-plan`,
  `orch-check-bugs` and `orch-check-rules` (+ `orch-security`) → `orch-verify` (kit `managed`); together with
  `reuse-lint` (plan 533 adds the "styled from outside" rule) that covers it. No new agent.

## Goals & Success Criteria
**Primary:** every designed element in a port-spec names its family (or a justified new one), a family-level change
is applied to the family once with every user screen listed for re-check, and a handoff that targets a family is
ingested as such.

- [auto] `node --test scripts/test/design-handoff-ingest.test.mjs` → `# fail 0`, including the family cases (A4).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/534-design-port-maps-every-designed-element-to-a-component-family.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/534-design-port-maps-every-designed-element-to-a-component-family.plan.md` exits 0.
- [human] Read `.claude/commands/design-port.md` Step 2 and Step 6: Inventory 3 has a `Family` column, the "Family changes" list applies the 2026-10-22 rule in plain words, and Step 6 runs `reuse-lint` and `/review-it` before the validation cards.

## Execution Mode
- Parallel: yes, after 533.
- Concurrent plans: plan 535 also appends to `docs/brain/component-families.md` and `.claude/commands/design-port.md`, so `plan-order` runs them one after the other (lock group).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
.claude/commands/design-port.md
scripts/design-handoff-ingest.mjs
scripts/test/design-handoff-ingest.test.mjs
docs/brain/component-families.md
docs/brain/decisions/0029-design-ports-go-through-the-family-registry.md
docs/brain/index.md
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; a command doc, a project script, the registry's preamble and an ADR.

## Reuse Check
- `registryFamilies(text)` / family targets in `scripts/design-handoff-ingest.mjs` — family: none — rung: 4 — why: a project script, outside the app and server families the registry covers; it extends the existing ingest script and reuses `parseRegistry` from `scripts/lib/reuse-check.mjs` as is (headings + backticked paths); no new script.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want a redesigned piece (a date field, a dropdown) to look the same on every screen so that the app feels like one product.
- As the person who brings designs into the app, I want the port to reuse what exists so that a new look never adds a second copy of a component.

## Functional Requirements

### Must Have (P0)
- [ ] `design-port.md` Step 2, Inventory 3: the table becomes `| Element | Design value (exact, from source) | Maps to | Family | Notes |`. `Family` is one of: a family id from `docs/brain/component-families.md` (`### <id>`); `page` (screen-only layout with no shared piece); or `new: <id> — <why>` (ladder rung 4, `docs/agent/standards-reuse.md`), which stops for the Human like an unmapped row. Rule text: "An element that does the job of a family piece maps to that family — never a new page-local component. Restyle the family; never style it from the page (reuse-lint `family-styled-from-outside`)."
- [ ] `design-port.md` Step 2, a new "Family changes" list after Inventory 3: one row per family whose look the design changes — `family · what changes (exact values) · variant or base · screens to re-check`. Rule text (Human decision 2026-10-22, ADR 0029): "By default the change goes to the family's shared base, and every screen that uses the family is listed for re-check — do not ask each time. A change that only fits this screen becomes a variant input on the family (ladder rung 3), named in the row." The screens come from the family's `Users:` line in the registry, else from `git grep -l "<selector>" -- "src/app/**/*.html"`. Each re-check screen becomes one `[human]` card.
- [ ] `design-port.md` Step 6: before the cards, run `node scripts/reuse-lint.mjs --diff=origin/main` (no `REUSE: warn` line for a touched file) and `/review-it` on the branch (the checker: plan, bugs, rules finders → verifier); a `blocker` stops the hand-off.
- [ ] `design-port.md` §1 / §4: a handoff can target **one family** instead of a screen: its README mapping table names the family's path (for example `src/app/shared/date-field/`); the port then edits only the family's folder plus the re-check list, and still takes exactly one target per session.
- [ ] `scripts/design-handoff-ingest.mjs`: `registryFamilies(registryText)` → `[{ id, paths }]` from `parseRegistry` (each backticked path belongs to the nearest `###` heading above it). `parseTargets(readme, registryText, familiesText)` additionally maps a repo path under `src/app/shared/` or `src/app/core/components/` that equals or starts with a family path to `{ family: id, path }`; result `{ screens, families, shell, unknown }` with `unknown` only when both `screens` and `families` are empty. `report()` prints a `families:` line. The registry is read from `docs/brain/component-families.md` (`REGISTRY_PATH`). Header comment lines 4-6: "A handoff targets one screen or one component family."
- [ ] `docs/brain/component-families.md` preamble: add the optional field `Design changes` — `- Design changes: <YYYY-MM-DD> <handoff slug> — <what changed> — base | variant <name> — re-checked: <screens>` — written by `/design-port` Step 6 when a family's look changed.
- [ ] `docs/brain/decisions/0029-design-ports-go-through-the-family-registry.md`: context (ADR 0019 handoff path, ADR 0024 ladder, the 2026-10-22 Human decision), decision (family column, family changes go to the base by default with every user screen re-checked, family-targeted handoffs, checker = `/review-it` + reuse-lint, no new agent), rejected (asking per screen; `/design-sync` for Angular; a new design-checker agent), consequences. One line in `docs/brain/index.md`.

### Should Have (P1)
- [ ] `docs/workflow-kit/manifest.json` / `.md`: notes for `design-port.md` and `design-handoff-ingest.mjs` mention plan 534; classify the ADR if `kit-manifest-check` asks.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No app UI. No dictionary keys.

## Atomic Sub-tasks
- [x] A1: Make every designed element name its family, and write the 2026-10-22 rule — Inventory 3 column, Family changes list, Step 6 checks, one-family handoffs — .claude/commands/design-port.md
- [x] A2: Let the registry hold a family's design history — the `Design changes` field in the preamble — docs/brain/component-families.md
- [x] A3: Ingest a handoff that targets a family — `registryFamilies`, the `families` targets, the report line, the header comment — scripts/design-handoff-ingest.mjs
- [x] A4: Test the family targets — a README whose mapping table names `` `src/app/shared/date-field/` `` → `families: [{ family: 'form-field', path: 'src/app/shared/date-field' }]` against a registry fixture that lists that path under `### form-field`; a mixed table → both a screen and a family; a path in neither → `shell`; an existing per-screen case stays green — scripts/test/design-handoff-ingest.test.mjs
- [x] A5: Record the decision — ADR 0029 and the index line — docs/brain/decisions/0029-design-ports-go-through-the-family-registry.md, docs/brain/index.md
- [x] A6: Keep the kit manifest true — docs/workflow-kit/manifest.json, docs/workflow-kit/manifest.md
- [x] A7: Run every `[auto]` check and paste the outputs under Execution Notes

## What happens when
- A designed element fits no family and no token: it goes under "Unmapped — needs a call" and the port stops for the Human, as today.
- The design changes a family piece on one screen and the Human wants it on that screen only: the Family changes row says `variant <name>`; the family gets that input; other screens keep the base.
- A handoff names a family path the registry does not list: the path is listed under `shell` and the ingest reports `unknown` if nothing else matched (no write is blocked; the port stops at Step 1 for the Human).
- `/review-it` returns a blocker: the port fixes it before the validation cards.

## Technical Considerations
- Dependencies: `scripts/lib/reuse-check.mjs` `parseRegistry` (read only), `docs/brain/component-families.md` headings and paths, plan 533's reuse-lint rule, `/review-it` (kit `managed`, used as is).
- New files needed: `docs/brain/decisions/0029-design-ports-go-through-the-family-registry.md`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none (the bundle's text stays data, as today).
- Data / migration: none.
- Project checks: no app or server code (no log-query item); Reuse Check present; no dictionary keys.

## Out of Scope
- The dev catalog route (plan 535). Making the workflow a kit piece (kit brief K5, after FoodVibe's version works). Porting any screen or family now. Changing `/review-it` or the `orch-check-*` agents (kit `managed`).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 8(a), item D2, decision H4). Draft items 1–4 and 6 of the 2026-10-22 chat: 1 (Family column), 2 (registry recording), 3 (family handoffs) here; 4 (lint rule) is plan 533; 6 (checker) reuses `/review-it` — `orch-check-*` and `orch-ui` still exist after the v2.1.0 sync. Item 5 (catalog) is plan 535.
- Builder 2026-11-09: ran every [auto] check. design-handoff-ingest tests -> exit 0, pass 12 fail 0 (3 new family cases); reuse-lint --check-registry -> exit 0 (25 families); kit-manifest-check -> exit 0, 0 unclassified; scope-check --arch -> ARCH: ok INV-none; --reuse -> exit 0. FAMILIES_PATH constant added in the ingest script because REGISTRY_PATH already names the screens registry.
