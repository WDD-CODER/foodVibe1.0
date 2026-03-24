Skill: update-docs (Lite)

Context: Triggered by "update docs", "refresh breadcrumbs", or automatically after feature completion.
Standard: Follows Section 4 of the Master Instructions for breadcrumb placement.

Workflow Phases

Phase 1: Structural Scan [Procedural — Haiku/Composer (Fast/Flash)]

Detect Changes: Identify new directories, moved files, or deleted subtrees since the last session.

Seam Verification: Ensure breadcrumbs.md files exist ONLY at Major Seams as defined in the Master Instructions:

src/app/core/ (and its immediate sub-folders)

src/app/shared/

src/app/pages/

Phase 2: Map Maintenance [Procedural — Haiku/Composer (Fast/Flash)]

Sync Content: Update the internal directory maps within each breadcrumb file.

Prune: Delete breadcrumb files that are no longer at a "Major Seam" or are in empty directories.

API/Interface Update: If a core service or model changed, update the "Key Exports" section of the relevant breadcrumb.

Phase 3: Agent Handoff [High Reasoning — Sonnet/Gemini 1.5 Pro]

Complex Reorg: If the project structure has undergone a major architectural shift, invoke the Breadcrumb Navigator agent to redefine the seams.

Doc Refinement: Improve the "Context/Purpose" descriptions in breadcrumbs if the file content has significantly evolved.

Efficiency Notes

Routine Maintenance: Use procedural models (Haiku/Flash/Composer Fast) for 95% of runs.

Architectural Shifts: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 3 during major refactors.

Cursor Tip: This skill is a "Credit Saver." Always run breadcrumb updates using Composer 2.0 (Fast/Flash). It is a pattern-matching task that does not require "Intelligence" tokens.

Completion Gate

Output: "Documentation refreshed. Breadcrumbs updated at [List of Seams]."

Trigger the Breadcrumb Navigator (Section 0.3) if the user asks for a structural overview after the update.