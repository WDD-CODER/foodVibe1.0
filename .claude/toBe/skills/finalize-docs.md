Skill: finalize-docs (Lite)

Context: Triggered by "finalize docs", "global audit", or after a major architectural refactor.
Standard: Follows Section 4 (Folder Structure) and Section 0 (Documentation Standards) of the Master Instructions.

Workflow Phases

Phase 1: Consistency Audit [Procedural — Haiku/Composer (Fast/Flash)]

Seam Check: Run a global scan to ensure breadcrumbs.md exist at every Major Seam and have been removed from all "Leaf" directories.

Link Verification: Check for dead file references in breadcrumbs and the Master Entry Point (agent.md).

Registry Sync: Verify that the Lucide Icon Registry (Section 8) and Hebrew Dictionary (Section 7) are up to date with the latest code changes.

Phase 2: Knowledge Pruning [High Reasoning — Sonnet/Gemini 1.5 Pro]

Obsolescence: Identify and suggest the deletion of stale .plan.md files or old session handoffs that no longer reflect the current "State of the Art."

Documentation Debt: Identify missing context in breadcrumbs where the underlying logic has become significantly more complex.

Phase 3: Final Indexing [Procedural — Haiku/Composer (Fast/Flash)]

Update Docs: Execute the update-docs (Section 0) skill to regenerate all maps.

Log Entry: Create a final "Architecture State" report in notes/architecture-audits/ summarizing the current seams and key exports.

Efficiency Notes

Scanning & Syncing: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Knowledge Evaluation: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 when determining what information is redundant.

Cursor Tip: This is a global maintenance task. Always use Composer 2.0 (Fast/Flash). It is perfectly suited for scanning the entire repository and verifying that the structure matches the Master Instructions.

Completion Gate

Output: "Global documentation finalized. [X] seams verified, [Y] stale files pruned. Project is 100% indexed for multi-agent navigation."