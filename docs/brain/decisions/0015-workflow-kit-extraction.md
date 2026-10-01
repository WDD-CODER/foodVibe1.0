---
status: accepted
date: 2026-10-01
review-by: 2027-04-01
---

# 0015. Extract the FoodVibe AI workflow into a copy-distributed kit, in five phases, with a stack-swappable core

## Context

The Planner-Worker pipeline, skills, commands, guard hooks, ship/brain system and Cursor rules live inside FoodVibe and carry its names: Angular commands (`ng build`), Express/Mongo/Render, Hebrew and `dictionary.json`, absolute Windows paths, slot ports `420N`/`300N` and `wt-N` folders, gstack `/browse`. Dandan wants the same workflow in new apps, run from Claude Code inside Cursor's terminal. Two alternatives were considered and rejected: a Claude Code plugin (Cursor and the hooks need repo-local files, so a plugin cannot carry them) and a one-time fork of FoodVibe (it would drift immediately and carry all FoodVibe history). Plan 328 (phase 1) audited every workflow file and every brain lesson before any file moved.

## Decision

Extract the workflow as a kit in five phases; all five plans live in FoodVibe `plans/`, and Workers for phases 2-4 open their session in the kit repo folder.

1. **Audit & manifest** (plan 328): classify every workflow file (tier + action), every parameterization point and every lesson; a checker proves coverage.
2. **Kit repo scaffold:** core extraction, `kit.config.json`, a CI check that fails if a core file names a framework.
3. **Stack packs:** `packs/angular` and `packs/node-express`, plus the generalized lessons.
4. **Installer and sync:** `kit-install.ps1` (optional `-Cursor` layer) and `kit-sync.ps1` (dry-run diff, then STOP before overwriting); skeleton `AGENTS.md`, `CLAUDE.md`, `docs/brain/`, `_shared/`, and a `settings.json` with no hardcoded paths; proven on an empty test repo with `/plan` -> `/take-plan` -> `/ship`.
5. **FoodVibe cutover:** a hard `[human]` gate. The Worker posts an `OWNERSHIP SWITCH` notice (the kit-owned file list plus drift since extraction) and waits for the exact reply `switch ownership`. After the switch, `scripts/scope-guard.sh` blocks edits to kit-owned files inside FoodVibe.

Locked decisions:

- **Ownership:** after phase 5 the kit repo is the source of truth and FoodVibe consumes it. Until then FoodVibe stays master and phases 1-4 never modify FoodVibe workflow files.
- **Distribution:** by copying files into each project repo, not a Claude Code plugin.
- **Swappable stack:** Angular now, swappable later. Core speaks only through `kit.config.json`, which references npm script names, not raw commands. Each stack pack implements one contract: standards doc, skills, Cursor rules, gotchas and validation commands.
- **Lessons travel:** every brain entry gets a verdict: transfer, generalize or stay.
- **Tiers:** `core`, `layer:cursor`, `pack:angular`, `pack:node-express`, `template` (generic structure, FoodVibe content, ships as a skeleton), `project` (stays in FoodVibe).

## Consequences

Every later phase starts from `docs/workflow-kit/manifest.json` and re-runs `node scripts/kit-manifest-check.mjs` at its Step 0 to detect drift (new unclassified files, new coupling in `core`). The audit found that most of `core` is coupled only through a small set of keys (build/test/lint scripts, slot naming and ports, hotspot files, hook shell path, browser tool, main branch), so extraction is mostly parameterization rather than rewriting. Costs we accept: FoodVibe workflow files stay frozen for the kit's sake until phase 5 (fixes found during the audit are recorded, not applied), and any workflow change merged to FoodVibe `main` during phases 2-4 must be re-classified (the manifest's Pending workflow changes list is the input). Re-evaluate if the kit repo needs a second consuming project before phase 5 lands, or if more than a handful of files turn out to need `split` rather than `parameterize`.

## Review

Check whether the manifest stayed in sync with FoodVibe during phases 2-4 (drift count at each Step 0), whether the stack-pack contract was enough for a non-Angular test repo, and whether copy-distribution plus `kit-sync.ps1` caused more merge pain than a plugin would have.
