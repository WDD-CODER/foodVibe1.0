---
name: add-recipe
description: Extracts, validates, and commits a new recipe or dish from an image, URL, or raw text into the foodVibe 1.0 ledger with canonical Hebrew unit resolution.
---

# Skill: add-recipe

**Trigger:** User adds a recipe or dish from an image, URL, or raw text.
**Standard:** Follows Section 3 (Domain Logic) and Section 7 (Hebrew Canonical Values) of the Master Instructions.

---

## Phase 1: Data Extraction `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**OCR / Parsing:** Extract ingredients, instructions, and metadata (yield, prep time) from the source.

**Normalization:** Convert raw input into a structured draft with ingredients, steps, and mise-en-place candidates.

**Domain Decomposition:**
- Identify mise-en-place items (prep steps → mise) vs. in-service steps (active cooking)
- Apply unit trust hierarchy: product's existing `base_unit` > extracted unit > default

**Unit Mapping:** Map each unit to its canonical Hebrew key per Section 7.1. If no match → flag for Section 7.2 translation modal.

---

## Phase 2: Ledger Alignment `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Ingredient Check:** Cross-reference extracted ingredients against the existing product ledger.

**Unit Conversion:** Apply Triple-Unit conversion logic (Section 3) for database consistency.

**Waste Factor:** Flag ingredients requiring waste factor calculation with suggested values.

---

## Phase 3: Interactive Confirmation `[Procedural — Haiku/Composer (Fast/Flash)]`

**User Review:** Present the full structured draft in the chat.

> ## CRITICAL — Hard Pause
> **STOP immediately. Do NOT write any files.**
> **Wait for the user to say "Yes chef!" or provide explicit corrections.**
> **Writing before confirmation is a critical error.**

---

## Phase 4: Atomic Implementation `[Procedural — Haiku/Composer (Fast/Flash)]`

**File Creation:** Write the recipe model/data file to the appropriate directory.

**Registry Update:** Add the new recipe to all global indices and navigation lists.

**Hebrew Keys:** Confirm all canonical unit/category keys resolved; invoke Section 7.2 modal for any unresolved Hebrew values.

---

## Completion Gate

Output: `"Recipe [Name] added to the ledger. Units resolved to canonical Hebrew keys."`

---

## Cursor Tip
> Use Gemini 1.5 Pro for Phase 1 (OCR extraction from images) and Phase 2 (ledger alignment logic).
> Switch to Composer 2.0 (Fast/Flash) once the user confirms in Phase 3 — file writes are purely procedural.
> Credit-saver: 50% of this skill (Phases 3–4) is Flash-eligible after user confirmation.
