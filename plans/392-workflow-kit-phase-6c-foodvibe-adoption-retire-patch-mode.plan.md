# Plan 392 — Workflow Kit Phase 6C: FoodVibe Adoption and Retire Patch Mode

Status: draft
Snapshot: c186c9c0

## Problem Statement
Phase 6, part 3 of 3 (**390 → 391 → 392**). This plan must run after plan 391.

After 390 (kit and FoodVibe agree, overrides declared) and 391 (GitHub pull by tag, `v0.5.0` released), FoodVibe still has no `.kit/install.json`, so `kit-sync` can't target it and every kit change still arrives as a hand-applied patch (ADR 0018). This plan adopts FoodVibe onto the tagged kit in **one PR** (Dandan, 2026-10-06), retires patch mode, writes down the change loop, and proves the kit with a second consumer and an upgrade.

## Goals & Success Criteria
**Primary:** `kit-sync -Target ..\foodVibe1.0` works against a GitHub tag, and patch mode is gone from every doc and guard message.

- [auto] Kit `node tools/install.mjs --adopt --target ../foodVibe1.0 --source github:WDD-CODER/ai-workflow-kit --ref v0.5.0` (or the tag 391 cut) writes `.kit/install.json` (hash of every current managed file, overrides recorded, source/ref/commit) and writes no other file (`git status` shows only `.kit/install.json`).
- [auto] Dry-run `kit-sync` against that tag right after adoption prints 0 `conflict`; every non-`unchanged` row is listed in the PR and is either `override` or expected.
- [auto] FoodVibe chore PR with `kit-sync -Apply`: `npx ng build`, `node scripts/kit-owned.mjs --check`, `node scripts/kit-manifest-check.mjs` pass; `git grep -n "{{" -- <changed files>` finds nothing.
- [auto] `git grep -n -i "patch" -- AGENTS.md docs/workflow-kit/manifest.md README_WORKFLOW.md scripts/kit-owned.mjs` finds no instruction to hand-apply kit patches; `node scripts/kit-owned.mjs --file=scripts/take-plan.mjs` prints the new message (edit in the kit, release, then `kit-sync --ref`).
- [auto] Tag + GitHub release `v1.0.0` exists; FoodVibe's `.kit/install.json` records it after the upgrade.
- [auto] Upgrade proof: no-op release `v1.0.1` (CHANGELOG-only) → `kit-sync --ref v1.0.1 -Apply` in FoodVibe and in `kit-proof` updates `install.json` ref and changes no managed file.
- [human] `kit-proof` (re-installed from GitHub, or a fresh empty repo) runs `/plan` → `/take-plan` → `/ship` end to end.
- [human] Dandan reads the new ADR and the change-loop doc and agrees that's how kit changes happen from now on.

## Execution Mode
- **Parallel:** no. Single Worker in a FoodVibe `wt-N` slot; kit edits by path in `../ai-workflow-kit`; `kit-proof` by path in `../kit-proof`.
- **Isolated DB:** no.
- **Kit edits:** kit branch `feat/392-adopt-and-change-loop` + kit PR; Dandan merges; tags cut from merged `main` after Dandan's go.
- ADR 0018 patch mode stays in force for any kit fix until A5 lands.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
.kit/**
kit.config.json
AGENTS.md
docs/workflow-kit/**
docs/brain/**
scripts/kit-owned.mjs
scripts/kit-extract.mjs
# Files kit-sync -Apply writes (kit-owned; written by kit-sync, not by hand)
.claude/**
.cursor/**
.github/workflows/**
.husky/**
docs/agent/**
scripts/**
README_WORKFLOW.md
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` and its GitHub repo (tags, releases); `../kit-proof/**`, or a fresh empty repo under the session scratchpad.

## Read Scope

Entire FoodVibe repo, the kit repo, `kit-proof`. Start from ADRs 0015, 0018, plans 390/391, `docs/workflow-kit/drift-classification.md`.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry. Any `conflict` row in the post-adoption dry-run: STOP and show it — never resolve by `--force`. Tags and releases: show them and wait for Dandan's go.

## Architecture Impact

- INV-none: preserves — workflow tooling and docs only; no app runtime file or invariant `Touches` glob is changed.

## Step 0 — Reality Check

1. Plans 390 and 391 merged; tag from 391 exists on GitHub; `KIT_DRIFT: ok` still holds for FoodVibe (re-run drift check).
2. No open Worker branch holds an unported kit-owned change (`node scripts/lib/slot.mjs --list`, check each claimed slot's diff against `kit-owned.json`).

## Functional Requirements

### Must Have (P0)
- [ ] `--adopt` mode in kit `tools/install.mjs` (+ `kit-install.ps1 -Adopt`): for an existing project, hash the current files, record overrides, write only `.kit/install.json`; refuse when the drift check isn't `ok`.
- [ ] FoodVibe adopted in one chore PR: `.kit/install.json` + `kit-sync -Apply` result.
- [ ] New ADR (next free number) supersedes 0018 and amends 0015's ownership notes: kit changes reach projects only through a kit release + `kit-sync --ref`. 0018 gets `status: superseded`.
- [ ] Patch-mode wording replaced: AGENTS.md "Kit-owned files" hard rule, `scripts/kit-owned.mjs` deny message, `scope-guard.sh` message (kit-side), `docs/workflow-kit/manifest.md`, `README_WORKFLOW.md` (kit-side), the brain gotcha/index line if any.
- [ ] Change loop documented in the kit (`docs/CHANGE-LOOP.md` or a README section): where kit edits happen (kit branch + PR on GitHub, session opened in the kit folder), how a release is cut (391's steps), how a project upgrades (`kit-sync --ref vX.Y.Z` → `/ship`), and how a fix found inside a project goes back to the kit.
- [ ] `v1.0.0` cut after FoodVibe adoption; no-op `v1.0.1` upgrade proof on FoodVibe and `kit-proof`.
- [ ] Second consumer: `kit-proof` re-installed from GitHub (or a fresh repo) and run end to end.

### Won't Have (this plan)
- Automatic upgrade PRs (bots/Actions that bump the ref). Tier-by-tier adoption.

## Atomic Sub-tasks
- [ ] C0: Step 0 reality check.
- [ ] C1: Kit `--adopt` mode + `-Adopt` wrapper; scratch test on a copy of FoodVibe.
- [ ] C2: Adopt FoodVibe; dry-run sync shows 0 conflicts; `kit-sync -Apply`; build + checks; FoodVibe chore PR.
- [ ] C3: New ADR superseding 0018 (amends 0015); mark 0018 superseded; brain index line.
- [ ] C4: Change-loop doc in the kit; link it from the kit README and FoodVibe `manifest.md`.
- [ ] C5: Replace patch-mode wording (AGENTS.md, `kit-owned.mjs`, kit `scope-guard.sh` + `README_WORKFLOW.md` via release + sync, `manifest.md`).
- [ ] C6: Cut `v1.0.0`; FoodVibe `kit-sync --ref v1.0.0`.
- [ ] C7: `kit-proof` from GitHub, `/plan` → `/take-plan` → `/ship` end to end.
- [ ] C8: No-op `v1.0.1`; upgrade FoodVibe and `kit-proof`; run all [auto] criteria; `/ship`.

## Out of Scope
Auto-upgrade bots, npm/plugin distribution, a LICENSE file (Dandan chose all rights reserved).
