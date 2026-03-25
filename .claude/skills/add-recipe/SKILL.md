---
name: add-recipe
description: Extracts, validates, and commits a new recipe or dish from an image, URL, or raw text into the project ledger with canonical unit resolution.
---

# Skill: add-recipe
**Model Guidance:** Use Sonnet for Phases 1 and 2. Use Haiku/Flash for Phases 3 and 4.

**Trigger:** User adds a recipe or dish from an image, URL, or raw text.

**Domain Rules (inline — no guide read required):**
- Unit trust hierarchy: product's existing `base_unit` > extracted unit > default
- All units must resolve to a canonical key (project dictionary §7.1)
- Unresolved units → trigger translation modal (§7.2) — never guess or skip
- Mise-en-place items (prep steps) are separate from in-service steps (active cooking)
- Triple-Unit conversion must be applied for database consistency
- **Hard stop before any file write — wait for explicit user confirmation**

---

## Phase 1: Data Extraction 

**OCR / Parsing:** Extract ingredients, instructions, and metadata (yield, prep time) from the source.

**Normalization:** Convert raw input into a structured draft with ingredients, steps, and mise-en-place candidates.

**Domain Decomposition:**
- Identify mise-en-place items (prep steps) vs. in-service steps (active cooking) — keep them separate
- Apply unit trust hierarchy: `base_unit` > extracted > default

**Unit Mapping:** Map each unit to its canonical key. If no match → flag for translation modal — do not proceed with unresolved units.

---

## Phase 2: Ledger Alignment 

**Ingredient Check:** Cross-reference extracted ingredients against the existing product ledger.

**Unit Conversion:** Apply Triple-Unit conversion logic for database consistency.

**Waste Factor:** Flag ingredients requiring waste factor calculation with suggested values.

---

## Phase 3: Interactive Confirmation 

**User Review:** Present the full structured draft in the chat — ingredients, steps, units, mise-en-place split.

> ## CRITICAL — Hard Pause
> **STOP immediately. Do NOT write any files.**
> **Wait for the user to say "Yes chef!" or provide explicit corrections.**
> **Writing before confirmation is a critical error.**

---

## Phase 4: Atomic Implementation 

**File Creation:** Write the recipe model/data file to the appropriate directory.

**Registry Update:** Add the new recipe to all global indices and navigation lists.

**Unit Key Verification:** Confirm all canonical unit/category keys resolved before writing. Any still unresolved → trigger translation modal now. Do not write with placeholder values.

---

## Completion Gate

Output: `"Recipe [Name] added to the ledger. All units resolved to canonical keys."`

---

## Cursor Tip
> Use Gemini 1.5 Pro for Phase 1 (OCR/extraction) and Phase 2 (ledger alignment) — these require domain reasoning.
> Switch to Composer 2.0 (Fast/Flash) once the user confirms in Phase 3 — file writes are purely procedural.
> Credit-saver: ~50% of this skill (Phases 3–4) is Flash-eligible after user confirmation.