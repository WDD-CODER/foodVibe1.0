Skill: add-recipe (Lite)

Context: Triggered by adding a recipe/dish from an image, URL, or raw text.
Standard: Follows Section 3 (Domain Logic) and Section 7 (Hebrew Canonical Values) of the Master Instructions.

Workflow Phases

Phase 1: Data Extraction [High Reasoning — Sonnet/Gemini 1.5 Pro]

OCR/Parsing: Extract ingredients, instructions, and metadata (yield, prep time) from the source.

Normalization: Convert raw text into a structured JSON-like draft.

Unit Mapping: Identify units and map them to the canonical Hebrew keys per Section 7.1.

Phase 2: Ledger Alignment [High Reasoning — Sonnet/Gemini 1.5 Pro]

Ingredient Check: Cross-reference extracted ingredients with the existing project ledger.

Unit Conversion: Apply Triple-Unit conversion logic (Section 3) to ensure consistency across the database.

Waste Factor: Identify ingredients requiring a waste factor calculation.

Phase 3: Interactive Confirmation [Procedural — Haiku/Composer (Fast/Flash)]

User Review: Present the structured draft to the user in the chat UI.

Hard Pause: STOP. Wait for the user to say "Yes chef!" or provide corrections. Do NOT write files until confirmed.

Phase 4: Atomic Implementation [Procedural — Haiku/Composer (Fast/Flash)]

File Creation: Write the recipe model/data file to the appropriate directory.

Registry Update: Add the new recipe to any global indices or navigation lists.

Efficiency Notes

Extraction & Logic: Use high-reasoning models (Sonnet/Pro) for Phase 1 & 2. These require deep domain understanding and precise data mapping.

Confirmation & Writing: Use procedural models (Haiku/Flash/Composer Fast) for Phase 3 & 4.

Cursor Tip: Use Gemini 1.5 Pro for the initial data extraction from images. Once the data is confirmed, switch to Composer 2.0 (Fast/Flash) to handle the final file generation and registry updates.

Completion Gate

Output: "Recipe [Name] added to the ledger. Units resolved to canonical Hebrew keys."