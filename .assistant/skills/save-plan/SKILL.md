---
name: save-plan
description: Determines the next plan number from the plans folder and writes the plan file when the user confirms a plan and says to save it. Use when the user says "save the plan", "save plan", or confirms a plan and asks to persist it to the plans folder.
---

# Save Plan

When the user has **confirmed a plan** and says to **save the plan**, follow this skill so the plan is written to the project's `plans/` folder with the correct numbering. No extra confirmation is needed—the user has already approved the plan content.

## Trigger

- User says "save the plan", "save plan", or equivalent after having seen and confirmed a plan. This applies even when combined with other requests (e.g. "save the plan and execute", "execute and save the plan").
- Plan content is already agreed; the agent must only determine the filename and write the file. When the request includes other actions, perform the save step first using this skill, then proceed.

## Location (MANDATORY)

- **All plans** MUST be saved under the project root folder **`plans/`** (e.g. `plans/013-feature-name.plan.md`).
- **NEVER** use Cursor's default plans folder (`~/.cursor/plans/`) or any path outside the project's `plans/` folder.

## Numbering Rules

### 1. List existing plans

- List or glob all `*.plan.md` files in **`plans/`** (project root).
- Parse filenames to determine the next number or refactor suffix.

### 2. New plan (next in sequence)

- Find the **highest 3-digit base number** among files matching: `^(\d{3})-[^-].*\.plan\.md` (e.g. `012-kitchen-demo-data.plan.md` → 012).
- **Next plan number** = that number + 1, zero-padded to 3 digits (e.g. 012 → **013**).
- **Filename**: `plans/NNN-slug.plan.md` (e.g. `plans/013-dashboard-recent-activity.plan.md`).
- **Slug**: Short kebab-case descriptor of the plan (no spaces; optional hash/suffix for uniqueness is allowed, e.g. `013-dashboard_recent_activity_refactor_9c01aaca.plan.md`).

### 3. Refactor plan (derived from an existing plan)

- When the plan is a **refactor or follow-up** of an existing plan (e.g. plan 012), the filename uses the **base number plus a refactor index**.
- **Pattern**: `plans/NNN-R-slug.plan.md` where:
  - `NNN` = the existing plan's 3-digit number (e.g. 012).
  - `R` = refactor index: 1, 2, 3, … (next available for that base).
- **How to get R**: List all files matching `NNN-*.plan.md` (e.g. `012-*.plan.md`). If only `012-something.plan.md` exists (no refactors yet), next refactor is **012-1**. If `012-1-...` and `012-2-...` exist, next is **012-3**.
- **Filename example**: `plans/012-1-dashboard-refactor.plan.md`, `plans/012-2-another-refactor.plan.md`.

### 4. Edge cases

- If **no plans exist** in `plans/`, the first plan is **001** (e.g. `plans/001-initial-feature.plan.md`).
- When in doubt whether it's a **new** plan vs a **refactor**, treat as new (increment global sequence) unless the user or context clearly states it is a refactor of a specific plan number.

## Workflow (checklist)

1. User has confirmed the plan and said to save it.
2. List `plans/*.plan.md` and determine:
   - **New plan** → next NNN (max existing NNN + 1).
   - **Refactor of NNN** → next NNN-R (max existing R for that NNN + 1).
3. Build filename: `plans/NNN-slug.plan.md` or `plans/NNN-R-slug.plan.md`.
4. Write the agreed plan content to that path using the **write** tool (no other plan tool that might save elsewhere).
5. Confirm to the user: *"Plan saved to plans/NNN[-R]-slug.plan.md."*

## Summary

| Type    | Example existing        | Next filename example                    |
|---------|-------------------------|------------------------------------------|
| New     | 012-kitchen-demo-data   | 013-dashboard-recent-activity.plan.md    |
| Refactor| 012-…                   | 012-1-dashboard-refactor.plan.md         |
| Refactor| 012-1-…, 012-2-…        | 012-3-another-refactor.plan.md           |
