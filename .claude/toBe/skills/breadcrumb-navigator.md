Skill: breadcrumb-navigator (Lite)

Context: Triggered by "navigate", "show maps", "where am I", or automatically after structural changes.
Standard: Follows Section 4 (Folder Structure) of the Master Instructions.

Workflow Phases

Phase 1: Structural Audit [Procedural — Haiku/Composer (Fast/Flash)]

Map Verification: Scan the current directory and its neighbors for existing breadcrumbs.md files.

Seam Validation: Check if the current location is a Major Seam (e.g., core/, shared/, pages/).

Pruning: Identify and delete any breadcrumb files located in "Leaf" folders or non-seam directories to prevent clutter.

Phase 2: Map Authoring [Procedural — Haiku/Composer (Fast/Flash)]

Directory Indexing: List all sub-directories and primary files (.service.ts, .component.ts, .model.ts).

Context Extraction: Read the README.md or component headers to provide a one-line purpose for each major folder.

File Write: Generate or update the breadcrumbs.md file with a clean, hierarchical list.

Phase 3: High-Level Navigation [High Reasoning — Sonnet/Gemini 1.5 Pro]

Entry Point Discovery: If the user is lost, analyze the project root and provide a high-level "You Are Here" summary across the entire app tree.

Structural Recommendations: Suggest moving files or creating new seams if a folder becomes too deep (>3 levels) or congested (>10 files).

Efficiency Notes

Indexing & Writing: Use procedural models (Haiku/Flash/Composer Fast) for 95% of tasks. This is a standard filesystem operation.

Strategy & Advice: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 3 when providing architectural navigation advice.

Cursor Tip: Updating breadcrumbs is a pure data-transfer task. Always use Composer 2.0 (Fast/Flash). It is extremely fast at scanning directories and writing the markdown maps.

Completion Gate

Output: "Navigation map updated for [Directory]. Breadcrumbs active at [Major Seams]."

If a new directory was created, remind the user to run update-docs (Section 0) for a global refresh.