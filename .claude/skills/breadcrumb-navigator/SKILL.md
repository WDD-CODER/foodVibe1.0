---
name: breadcrumb-navigator
description: Creates and maintains breadcrumbs.md navigation files at major directory seams in foodVibe 1.0 so agents and developers instantly understand any directory.
---

# Skill: breadcrumb-navigator

**Trigger:** New `pages/<x>/` or top-level subtree added; structural changes; after `update-docs`; user is navigating an unfamiliar directory.
**Standard:** Follows Section 4 (Folder Structure) of the Master Instructions for seam definitions and breadcrumb placement rules.

---

## Phase 1: Structural Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Map Verification:** Scan the current directory and neighbors for existing `breadcrumbs.md` files.

**Seam Validation:** Check if the current location is a Major Seam (Section 4): `core/`, `shared/`, `pages/`, `core/services/`, `core/models/`, `core/components/`.

**Pruning:** Identify and delete breadcrumb files in "leaf" folders or non-seam directories to prevent clutter.

---

## Phase 2: Map Authoring `[Procedural — Haiku/Composer (Fast/Flash)]`

**Directory Indexing:** List all sub-directories and primary files (`.service.ts`, `.component.ts`, `.model.ts`).

**Context Extraction:** Read component headers or service class names to provide a one-line purpose for each major folder.

**File Write:** Generate or update `breadcrumbs.md` with a clean, hierarchical navigation table.

---

## Phase 3: High-Level Navigation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Entry Point Discovery:** If the user is lost, analyze the project root and provide a "You Are Here" summary across the entire app tree.

**Structural Recommendations:** Suggest moving files or creating new seams if a folder exceeds 3 levels deep or 10+ files.

---

## Completion Gate

Output: `"Navigation map updated for [Directory]. Breadcrumbs active at [Major Seams]."`

If a new directory was created, remind the user to run `update-docs` (Section 0) for a global refresh.

---

## Cursor Tip
> Updating breadcrumbs is a pure data-transfer task. Always use Composer 2.0 (Fast/Flash) — it is extremely fast at scanning directories and writing the markdown maps.
> Reserve Gemini 1.5 Pro for Phase 3 only when providing high-level architectural navigation advice.
> Credit-saver: ~95% of this skill is procedural (Phases 1 + 2).
