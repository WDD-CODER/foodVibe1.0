---
name: update-docs
description: Refreshes breadcrumb navigation maps and project documentation after feature completion in foodVibe 1.0.
---

# Skill: update-docs

**Trigger:** After completing a significant development task, adding new features/components/services, or before a PR.
**Standard:** Breadcrumb placement and Major Seam definitions are in '.claude/standards-angular.md'.

---

## Phase 1: Structural Scan `[Procedural — Haiku/Composer (Fast/Flash)]`

**Detect Changes:** Identify new directories, moved files, or deleted subtrees since the last session.

**Seam Verification:** Ensure `breadcrumbs.md` files exist **only** at Major Seams as defined in **Section 4 of the Master Instructions**:
- `src/app/core/` (and immediate sub-folders: `services/`, `models/`, `components/`)
- `src/app/shared/`
- `src/app/pages/`

> **Rule:** No `breadcrumbs.md` in leaf folders. Delete any found outside these seam locations.

---

## Phase 2: Map Maintenance `[Procedural — Haiku/Composer (Fast/Flash)]`

**Sync Content:** Update the internal directory maps within each breadcrumb file.

**Prune:** Delete breadcrumb files no longer at a Major Seam or in empty directories.

**API / Interface Update:** If a core service or model changed, update the "Key Exports" section of the relevant breadcrumb.

---

## Phase 3: Agent Handoff 

> **Only invoke Phase 3 if the project has undergone a major architectural shift. Otherwise stay in Flash.**

**Complex Reorg:** Invoke the Breadcrumb Navigator agent (Section 0.3) to redefine the seams.

**Doc Refinement:** Improve "Context/Purpose" descriptions in breadcrumbs if the file content has significantly evolved.

---

## Completion Gate

Output: `"Documentation refreshed. Breadcrumbs updated at [List of Seams]."`

Trigger the Breadcrumb Navigator (Section 0.3) if the user asks for a structural overview after the update.

---

## Cursor Tip
> This skill is a "Credit Saver." Always run breadcrumb updates using Composer 2.0 (Fast/Flash) — it is a pattern-matching task that requires no Intelligence tokens.
> Only escalate to Gemini 1.5 Pro for Phase 3 during a major architectural reorganization.
> Credit-saver: ~95% of routine runs are fully Flash-eligible.
